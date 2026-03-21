import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { companies } from "../schema.ts";
import type { Env } from "../lib/env.ts";

const STORAGE_PREFIX = "pw";

function formatLogoId(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getDomain(website: string): string | null {
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}


export const logosRoutes = new Hono<{ Bindings: Env }>()
  .get("/:companyId", async (c) => {
    const companyId = c.req.param("companyId");
    const r2Key = `${STORAGE_PREFIX}/logos/${companyId}`;

    // 1. Check R2 cache
    const cached = await c.env.STORAGE.get(r2Key);
    if (cached) {
      const contentType = cached.httpMetadata?.contentType ?? "image/png";
      return new Response(cached.body as ReadableStream, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=2592000",
        },
      });
    }

    // 2. Look up company
    const db = drizzle(c.env.DB);
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .get();
    if (!company) return c.json({ error: "Not found" }, 404);

    const domain = company.website ? getDomain(company.website) : null;

    const sources: string[] = [];
    if (company.logoUrl) sources.push(company.logoUrl);
    if (domain) sources.push(`https://logo.clearbit.com/${domain}`);
    sources.push(`https://logohub.dev/api/v1/logos/${formatLogoId(company.name)}`);

    // 3. Try each source, cache first success
    for (const url of sources) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;

        const contentType = res.headers.get("Content-Type") ?? "image/png";
        if (!contentType.startsWith("image/")) continue;

        const buffer = await res.arrayBuffer();
        if (buffer.byteLength < 100) continue; // skip blank/placeholder images

        await c.env.STORAGE.put(r2Key, buffer, {
          httpMetadata: { contentType },
        });

        return new Response(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=2592000",
          },
        });
      } catch {
        continue;
      }
    }

    return c.json({ error: "No logo found" }, 404);
  });
