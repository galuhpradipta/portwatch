import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, like, desc, asc, sql } from "drizzle-orm";
import { companies, companyHeadcountSnapshots, companyNews } from "../schema.ts";
import { authMiddleware } from "../middleware/auth.ts";
import type { Env } from "../lib/env.ts";
import type { AuthVariables } from "../middleware/auth.ts";

export const companiesRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

  .get("/", authMiddleware, async (c) => {
    const db = drizzle(c.env.DB);
    const search = c.req.query("search") ?? "";

    const rows = await db
      .select({
        id: companies.id,
        name: companies.name,
        coresignalCompanyId: companies.coresignalCompanyId,
        coresignalShorthand: companies.coresignalShorthand,
        industry: companies.industry,
        website: companies.website,
        logoUrl: companies.logoUrl,
        country: companies.country,
        employeeRange: companies.employeeRange,
        createdAt: companies.createdAt,
        latestHeadcount: sql<number | null>`(
          SELECT headcount FROM company_headcount_snapshots
          WHERE company_id = ${companies.id}
          ORDER BY recorded_at DESC
          LIMIT 1
        )`,
      })
      .from(companies)
      .where(search ? like(companies.name, `%${search}%`) : undefined)
      .orderBy(asc(companies.name))
      .all();

    return c.json(rows);
  })

  .get("/:id", authMiddleware, async (c) => {
    const db = drizzle(c.env.DB);
    const id = c.req.param("id");

    const company = await db.select().from(companies).where(eq(companies.id, id)).get();
    if (!company) return c.json({ error: "Not found" }, 404);

    const snapshots = await db
      .select()
      .from(companyHeadcountSnapshots)
      .where(eq(companyHeadcountSnapshots.companyId, id))
      .orderBy(asc(companyHeadcountSnapshots.recordedAt))
      .all();

    const news = await db
      .select()
      .from(companyNews)
      .where(eq(companyNews.companyId, id))
      .orderBy(desc(companyNews.publishedAt))
      .limit(20)
      .all();

    return c.json({ ...company, snapshots, news });
  });
