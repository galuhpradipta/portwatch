import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { companies } from "../schema.ts";
import type { Env } from "../lib/env.ts";
import {
  LOGO_STATUS_MISSING,
  LOGO_STATUS_PENDING,
  buildLogoStorageKey,
  createLogoUnavailableResponse,
  createReadyLogoResponse,
} from "../lib/logos.ts";

export const logosRoutes = new Hono<{ Bindings: Env }>()
  .get("/:companyId", async (c) => {
    const companyId = c.req.param("companyId");
    const db = drizzle(c.env.DB);
    const company = await db
      .select({
        id: companies.id,
        logoStatus: companies.logoStatus,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .get();
    if (!company) return c.json({ error: "Not found" }, 404);

    if (company.logoStatus === LOGO_STATUS_PENDING) {
      return createLogoUnavailableResponse(LOGO_STATUS_PENDING);
    }

    if (company.logoStatus === LOGO_STATUS_MISSING) {
      return createLogoUnavailableResponse(LOGO_STATUS_MISSING);
    }

    const cached = await c.env.STORAGE.get(buildLogoStorageKey(companyId));
    if (!cached) {
      await db
        .update(companies)
        .set({
          logoStatus: LOGO_STATUS_MISSING,
          logoCheckedAt: new Date(),
        })
        .where(eq(companies.id, companyId))
        .execute();
      return createLogoUnavailableResponse(LOGO_STATUS_MISSING);
    }

    const contentType = cached.httpMetadata?.contentType ?? "image/png";
    return createReadyLogoResponse(cached.body as BodyInit, contentType);
  });
