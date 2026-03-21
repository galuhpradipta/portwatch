import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { companies } from "../schema.ts";
import type { Env } from "../lib/env.ts";

const STORAGE_PREFIX = "pw";

// Ordered by preference (highest quality first)
const COMMON_ICON_PATHS = [
  "/apple-touch-icon.png",
  "/apple-touch-icon-precomposed.png",
  "/favicon.png",
  "/favicon.svg",
  "/favicon.ico",
];

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
};

async function fetchImage(url: string): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, redirect: "follow" });
    if (!res.ok) return null;
    const contentType = res.headers.get("Content-Type") ?? "";
    if (!contentType.startsWith("image/")) return null;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 100) return null;
    return { buffer, contentType };
  } catch {
    return null;
  }
}

async function scrapeIconFromHTML(website: string): Promise<string[]> {
  type Candidate = { href: string; rel: string; sizes: string };
  const candidates: Candidate[] = [];

  try {
    const res = await fetch(website, { headers: FETCH_HEADERS, redirect: "follow" });
    if (!res.ok) return [];

    // Use the final URL after redirects so relative hrefs resolve correctly
    const finalOrigin = new URL(res.url).origin;

    await new HTMLRewriter()
      .on("link", {
        element(el) {
          const rel = el.getAttribute("rel") ?? "";
          if (!rel.includes("icon")) return;
          const href = el.getAttribute("href") ?? "";
          if (!href) return;
          candidates.push({ href, rel, sizes: el.getAttribute("sizes") ?? "" });
        },
      })
      .transform(res)
      .arrayBuffer();

    candidates.sort((a, b) => score(b) - score(a));
    return candidates.map((c) => new URL(c.href, finalOrigin).toString());
  } catch {
    return [];
  }
}

function score(c: { rel: string; sizes: string }): number {
  if (c.rel.includes("apple-touch-icon")) return 100;
  const dim = parseInt(c.sizes.split("x")[0] ?? "0", 10);
  if (dim >= 192) return 90;
  if (dim >= 64) return 80;
  if (dim > 0) return 70;
  return 50;
}

async function findIcon(website: string): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  const origin = new URL(website).origin;

  // 1. Try well-known paths directly — fast, no bot detection risk
  for (const path of COMMON_ICON_PATHS) {
    const result = await fetchImage(`${origin}${path}`);
    if (result) return result;
  }

  // 2. Scrape HTML for <link rel="icon"> tags
  const scraped = await scrapeIconFromHTML(website);
  for (const url of scraped) {
    const result = await fetchImage(url);
    if (result) return result;
  }

  return null;
}

export const logosRoutes = new Hono<{ Bindings: Env }>()
  .get("/:companyId", async (c) => {
    const companyId = c.req.param("companyId");
    const r2Key = `${STORAGE_PREFIX}/logos/${companyId}`;

    // 1. R2 cache hit
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

    // 3. Try directUrl from DB
    if (company.logoUrl) {
      const result = await fetchImage(company.logoUrl);
      if (result) {
        await c.env.STORAGE.put(r2Key, result.buffer, { httpMetadata: { contentType: result.contentType } });
        return new Response(result.buffer, {
          headers: { "Content-Type": result.contentType, "Cache-Control": "public, max-age=2592000" },
        });
      }
    }

    // 4. Scrape from company website
    if (company.website) {
      try {
        new URL(company.website); // validate URL
        const result = await findIcon(company.website);
        if (result) {
          await c.env.STORAGE.put(r2Key, result.buffer, { httpMetadata: { contentType: result.contentType } });
          return new Response(result.buffer, {
            headers: { "Content-Type": result.contentType, "Cache-Control": "public, max-age=2592000" },
          });
        }
      } catch { /* invalid URL or fetch failed */ }
    }

    return c.json({ error: "No logo found" }, 404);
  });
