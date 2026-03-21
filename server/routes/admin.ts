import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { companies, companyHeadcountSnapshots, companyNews } from "../schema.ts";
import { SEED_COMPANIES } from "../seed/companies.ts";
import { generateHeadcountSnapshots, generateNewsArticles, getDroppedCompanyIds } from "../seed/generate-mock-data.ts";
import type { Env } from "../lib/env.ts";
import { warmCompanyLogos } from "../lib/logos.ts";

function parsePositiveInt(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export const adminRoutes = new Hono<{ Bindings: Env }>()
  .post("/logos/warm", async (c) => {
    const summary = await warmCompanyLogos(c.env, {
      force: c.req.query("force") === "true",
      limit: parsePositiveInt(c.req.query("limit")),
    });

    return c.json({ ok: true, ...summary });
  })

  .post("/seed", async (c) => {
    const db = drizzle(c.env.DB);
    const batchSize = 5;
    const shouldWarmLogos = c.req.query("warmLogos") !== "false";

    // Insert companies (idempotent)
    for (let i = 0; i < SEED_COMPANIES.length; i += batchSize) {
      await db
        .insert(companies)
        .values(SEED_COMPANIES.slice(i, i + batchSize))
        .onConflictDoNothing()
        .execute();
    }

    // Generate mock data
    const companyIds = SEED_COMPANIES.map((co) => co.id);
    const droppedIds = getDroppedCompanyIds(companyIds);

    // Clear and reseed headcount + news
    for (const company of SEED_COMPANIES) {
      await db.delete(companyHeadcountSnapshots).where(eq(companyHeadcountSnapshots.companyId, company.id)).execute();
      await db.delete(companyNews).where(eq(companyNews.companyId, company.id)).execute();
    }

    // Insert headcount snapshots
    for (const company of SEED_COMPANIES) {
      const snapshots = generateHeadcountSnapshots(company, droppedIds.has(company.id));
      for (let i = 0; i < snapshots.length; i += batchSize) {
        await db.insert(companyHeadcountSnapshots).values(snapshots.slice(i, i + batchSize)).execute();
      }
    }

    // Insert news articles
    for (const company of SEED_COMPANIES) {
      const articles = generateNewsArticles(company, droppedIds.has(company.id));
      for (let i = 0; i < articles.length; i += batchSize) {
        await db.insert(companyNews).values(articles.slice(i, i + batchSize)).execute();
      }
    }

    const logos = shouldWarmLogos
      ? await warmCompanyLogos(c.env)
      : null;

    return c.json({
      ok: true,
      companies: SEED_COMPANIES.length,
      droppedCount: droppedIds.size,
      logos,
    });
  });
