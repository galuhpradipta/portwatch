import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc, asc } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  users,
  companies,
  userPortfolioCompanies,
  companyHeadcountSnapshots,
  companyNews,
} from "../schema.ts";
import { authMiddleware } from "../middleware/auth.ts";
import type { Env } from "../lib/env.ts";
import type { AuthVariables } from "../middleware/auth.ts";

type PortfolioCompanyResult = {
  id: string;
  name: string;
  industry: string;
  employeeRange: string;
  logoUrl: string;
  country: string;
  latestHeadcount: number | null;
  previousHeadcount: number | null;
  headcountChangePercent: number | null;
  avgSentimentScore: number | null;
  hasHeadcountAlert: boolean;
  hasSentimentAlert: boolean;
  addedAt: Date | null;
};

async function getEnrichedPortfolio(
  db: ReturnType<typeof drizzle>,
  userId: string,
  threshold: number,
): Promise<PortfolioCompanyResult[]> {
  const portfolioRows = await db
    .select({
      company: companies,
      addedAt: userPortfolioCompanies.createdAt,
    })
    .from(userPortfolioCompanies)
    .innerJoin(companies, eq(userPortfolioCompanies.companyId, companies.id))
    .where(eq(userPortfolioCompanies.userId, userId))
    .orderBy(asc(userPortfolioCompanies.createdAt))
    .all();

  return Promise.all(
    portfolioRows.map(async ({ company, addedAt }) => {
      // Get last 2 headcount snapshots
      const snapshots = await db
        .select()
        .from(companyHeadcountSnapshots)
        .where(eq(companyHeadcountSnapshots.companyId, company.id))
        .orderBy(desc(companyHeadcountSnapshots.recordedAt))
        .limit(2)
        .all();

      const latestHeadcount = snapshots[0]?.headcount ?? null;
      const previousHeadcount = snapshots[1]?.headcount ?? null;
      let headcountChangePercent: number | null = null;
      if (latestHeadcount !== null && previousHeadcount !== null && previousHeadcount > 0) {
        headcountChangePercent = ((latestHeadcount - previousHeadcount) / previousHeadcount) * 100;
      }

      // Avg sentiment from last 5 news items
      const recentNews = await db
        .select()
        .from(companyNews)
        .where(eq(companyNews.companyId, company.id))
        .orderBy(desc(companyNews.publishedAt))
        .limit(5)
        .all();

      const avgSentimentScore =
        recentNews.length > 0
          ? recentNews.reduce((s, n) => s + n.sentimentScore, 0) / recentNews.length
          : null;

      const hasHeadcountAlert =
        headcountChangePercent !== null && headcountChangePercent <= -threshold;
      const hasSentimentAlert = avgSentimentScore !== null && avgSentimentScore >= 70;

      return {
        id: company.id,
        name: company.name,
        industry: company.industry,
        employeeRange: company.employeeRange,
        logoUrl: company.logoUrl,
        country: company.country,
        latestHeadcount,
        previousHeadcount,
        headcountChangePercent,
        avgSentimentScore,
        hasHeadcountAlert,
        hasSentimentAlert,
        addedAt,
      };
    }),
  );
}

export const portfolioRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>()
  .use("*", authMiddleware)

  .get("/", async (c) => {
    const db = drizzle(c.env.DB);
    const userId = c.get("userId");

    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    const threshold = user?.headcountDropThreshold ?? 10;

    const portfolio = await getEnrichedPortfolio(db, userId, threshold);
    return c.json(portfolio);
  })

  .post(
    "/",
    zValidator("json", z.object({ companyId: z.string().uuid() })),
    async (c) => {
      const db = drizzle(c.env.DB);
      const userId = c.get("userId");
      const { companyId } = c.req.valid("json");

      // Check max 10
      const existing = await db
        .select()
        .from(userPortfolioCompanies)
        .where(eq(userPortfolioCompanies.userId, userId))
        .all();

      if (existing.length >= 10) {
        return c.json({ error: "Portfolio limit reached (max 10)" }, 400);
      }

      // Check duplicate
      const dupe = existing.find((e) => e.companyId === companyId);
      if (dupe) {
        return c.json({ error: "Company already in portfolio" }, 409);
      }

      // Verify company exists
      const company = await db.select().from(companies).where(eq(companies.id, companyId)).get();
      if (!company) {
        return c.json({ error: "Company not found" }, 404);
      }

      await db
        .insert(userPortfolioCompanies)
        .values({ id: crypto.randomUUID(), userId, companyId })
        .execute();

      return c.json({ ok: true }, 201);
    },
  )

  .delete("/:companyId", async (c) => {
    const db = drizzle(c.env.DB);
    const userId = c.get("userId");
    const companyId = c.req.param("companyId");

    await db
      .delete(userPortfolioCompanies)
      .where(
        and(
          eq(userPortfolioCompanies.userId, userId),
          eq(userPortfolioCompanies.companyId, companyId),
        ),
      )
      .execute();

    return c.json({ ok: true });
  })

  .post("/check", async (c) => {
    const db = drizzle(c.env.DB);
    const userId = c.get("userId");

    const portfolioRows = await db
      .select({ companyId: userPortfolioCompanies.companyId })
      .from(userPortfolioCompanies)
      .where(eq(userPortfolioCompanies.userId, userId))
      .all();

    const companyIds = portfolioRows.map((r) => r.companyId);

    for (const companyId of companyIds) {
      // Get existing snapshots to determine trend
      const existing = await db
        .select()
        .from(companyHeadcountSnapshots)
        .where(eq(companyHeadcountSnapshots.companyId, companyId))
        .orderBy(desc(companyHeadcountSnapshots.recordedAt))
        .limit(1)
        .get();

      // Generate a new snapshot (current month)
      const now = new Date();
      const recordedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      // Random ±5% fluctuation from latest
      const baseHeadcount = existing?.headcount ?? 1000;
      const fluctuation = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
      const newHeadcount = Math.floor(baseHeadcount * fluctuation);

      // Upsert snapshot for current month
      await db
        .delete(companyHeadcountSnapshots)
        .where(
          and(
            eq(companyHeadcountSnapshots.companyId, companyId),
            eq(companyHeadcountSnapshots.recordedAt, recordedAt),
          ),
        )
        .execute();

      await db
        .insert(companyHeadcountSnapshots)
        .values({ id: crypto.randomUUID(), companyId, headcount: newHeadcount, recordedAt })
        .execute();

      // Add 1-2 news articles
      const articleCount = 1 + Math.floor(Math.random() * 2);
      const sources = ["TechCrunch", "Bloomberg", "Reuters", "Forbes"];
      const titles = [
        "reports updated headcount figures",
        "sees workforce changes amid restructuring",
        "announces new hiring initiative",
        "responds to market headwinds",
      ];

      for (let i = 0; i < articleCount; i++) {
        const companyRow = await db.select().from(companies).where(eq(companies.id, companyId)).get();
        const companyName = companyRow?.name ?? "Company";
        const sentimentScore = Math.floor(Math.random() * 100);

        await db
          .insert(companyNews)
          .values({
            id: crypto.randomUUID(),
            companyId,
            title: `${companyName} ${titles[Math.floor(Math.random() * titles.length)]}`,
            description: `Latest developments at ${companyName}.`,
            url: `https://example.com/news/${companyId.slice(0, 8)}-${Date.now()}`,
            sourceName: sources[Math.floor(Math.random() * sources.length)],
            publishedAt: new Date().toISOString(),
            sentimentScore,
          })
          .execute();
      }
    }

    // Return updated portfolio
    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    const threshold = user?.headcountDropThreshold ?? 10;
    const portfolio = await getEnrichedPortfolio(db, userId, threshold);
    return c.json(portfolio);
  });
