import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { companies } from "../schema.ts";
import type { Env } from "../lib/env.ts";

const STORAGE_PREFIX = "pw";

type IconCandidate = { href: string; rel: string; sizes: string };

function scoreCandidate(c: IconCandidate): number {
  if (c.rel.includes("apple-touch-icon")) return 100;
  const dim = parseInt(c.sizes.split("x")[0] ?? "0", 10);
  if (dim >= 192) return 90;
  if (dim >= 64) return 80;
  if (dim > 0) return 70;
  return 50;
}

async function scrapeIcon(
  website: string,
): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  const candidates: IconCandidate[] = [];

  // Fetch homepage and collect <link> icon candidates via HTMLRewriter
  let homeRes: Response;
  try {
    homeRes = await fetch(website, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Portwatch/1.0; +https://portwatch.app)" },
      redirect: "follow",
    });
    if (!homeRes.ok) return null;
  } catch {
    return null;
  }

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
    .transform(homeRes)
    .arrayBuffer(); // consume stream

  // Sort best candidate first
  candidates.sort((a, b) => scoreCandidate(b) - scoreCandidate(a));

  // Try each candidate, then /favicon.ico as final fallback
  const base = new URL(website).origin;
  const urls = [
    ...candidates.map((c) => new URL(c.href, base).toString()),
    `${base}/favicon.ico`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const contentType = res.headers.get("Content-Type") ?? "image/png";
      if (!contentType.startsWith("image/")) continue;
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength < 100) continue;
      return { buffer, contentType };
    } catch {
      continue;
    }
  }

  return null;
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

    // 3. Try direct logoUrl from DB first
    if (company.logoUrl) {
      try {
        const res = await fetch(company.logoUrl);
        if (res.ok) {
          const contentType = res.headers.get("Content-Type") ?? "image/png";
          if (contentType.startsWith("image/")) {
            const buffer = await res.arrayBuffer();
            if (buffer.byteLength >= 100) {
              await c.env.STORAGE.put(r2Key, buffer, { httpMetadata: { contentType } });
              return new Response(buffer, {
                headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=2592000" },
              });
            }
          }
        }
      } catch { /* fall through */ }
    }

    // 4. Scrape from the company's own website
    if (company.website) {
      const result = await scrapeIcon(company.website);
      if (result) {
        await c.env.STORAGE.put(r2Key, result.buffer, {
          httpMetadata: { contentType: result.contentType },
        });
        return new Response(result.buffer, {
          headers: {
            "Content-Type": result.contentType,
            "Cache-Control": "public, max-age=2592000",
          },
        });
      }
    }

    return c.json({ error: "No logo found" }, 404);
  });
