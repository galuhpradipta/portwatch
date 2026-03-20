import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, like, desc, asc } from "drizzle-orm";
import { companies, companyHeadcountSnapshots, companyNews } from "../schema.ts";
import { authMiddleware } from "../middleware/auth.ts";
import type { Env } from "../lib/env.ts";
import type { AuthVariables } from "../middleware/auth.ts";

export const companiesRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

  .get("/", authMiddleware, async (c) => {
    const db = drizzle(c.env.DB);
    const search = c.req.query("search") ?? "";

    let rows;
    if (search) {
      rows = await db
        .select()
        .from(companies)
        .where(like(companies.name, `%${search}%`))
        .orderBy(asc(companies.name))
        .all();
    } else {
      rows = await db.select().from(companies).orderBy(asc(companies.name)).all();
    }

    // Attach latest headcount per company
    const result = await Promise.all(
      rows.map(async (company) => {
        const latest = await db
          .select()
          .from(companyHeadcountSnapshots)
          .where(eq(companyHeadcountSnapshots.companyId, company.id))
          .orderBy(desc(companyHeadcountSnapshots.recordedAt))
          .limit(1)
          .get();
        return { ...company, latestHeadcount: latest?.headcount ?? null };
      }),
    );

    return c.json(result);
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
