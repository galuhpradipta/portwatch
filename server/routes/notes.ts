import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { companyNotes, userPortfolioCompanies } from "../schema.ts";
import { authMiddleware } from "../middleware/auth.ts";
import type { Env } from "../lib/env.ts";
import type { AuthVariables } from "../middleware/auth.ts";

export const notesRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>()
  .use("*", authMiddleware)

  .get("/:companyId", async (c) => {
    const db = drizzle(c.env.DB);
    const userId = c.get("userId");
    const companyId = c.req.param("companyId");

    const note = await db
      .select()
      .from(companyNotes)
      .where(and(eq(companyNotes.userId, userId), eq(companyNotes.companyId, companyId)))
      .get();

    return c.json(note ?? null);
  })

  .put(
    "/:companyId",
    zValidator("json", z.object({ content: z.string().max(5000) })),
    async (c) => {
      const db = drizzle(c.env.DB);
      const userId = c.get("userId");
      const companyId = c.req.param("companyId");
      const { content } = c.req.valid("json");

      // Verify company is in user's portfolio
      const portfolioEntry = await db
        .select()
        .from(userPortfolioCompanies)
        .where(
          and(
            eq(userPortfolioCompanies.userId, userId),
            eq(userPortfolioCompanies.companyId, companyId),
          ),
        )
        .get();

      if (!portfolioEntry) {
        return c.json({ error: "Company not in portfolio" }, 403);
      }

      // Empty content => delete
      if (content.trim() === "") {
        await db
          .delete(companyNotes)
          .where(and(eq(companyNotes.userId, userId), eq(companyNotes.companyId, companyId)))
          .execute();
        return c.json({ ok: true });
      }

      const existing = await db
        .select()
        .from(companyNotes)
        .where(and(eq(companyNotes.userId, userId), eq(companyNotes.companyId, companyId)))
        .get();

      if (existing) {
        await db
          .update(companyNotes)
          .set({ content, updatedAt: new Date() })
          .where(and(eq(companyNotes.userId, userId), eq(companyNotes.companyId, companyId)))
          .execute();
      } else {
        await db
          .insert(companyNotes)
          .values({ id: crypto.randomUUID(), userId, companyId, content })
          .execute();
      }

      const note = await db
        .select()
        .from(companyNotes)
        .where(and(eq(companyNotes.userId, userId), eq(companyNotes.companyId, companyId)))
        .get();

      return c.json(note);
    },
  )

  .delete("/:companyId", async (c) => {
    const db = drizzle(c.env.DB);
    const userId = c.get("userId");
    const companyId = c.req.param("companyId");

    await db
      .delete(companyNotes)
      .where(and(eq(companyNotes.userId, userId), eq(companyNotes.companyId, companyId)))
      .execute();

    return c.json({ ok: true });
  });
