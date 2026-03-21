import { drizzle } from "drizzle-orm/d1";
import { asc, eq } from "drizzle-orm";
import { companies } from "../schema.ts";
import type { Env } from "./env.ts";

export type LogoStatus = "pending" | "ready" | "missing";

export const LOGO_STATUS_PENDING: LogoStatus = "pending";
export const LOGO_STATUS_READY: LogoStatus = "ready";
export const LOGO_STATUS_MISSING: LogoStatus = "missing";

const STORAGE_PREFIX = "pw";
const READY_CACHE_CONTROL = "public, max-age=2592000";
const MISSING_CACHE_CONTROL = "public, max-age=86400";
const PENDING_CACHE_CONTROL = "public, max-age=60";
const FETCH_TIMEOUT_MS = 5000;

// Ordered by preference (highest quality first).
const COMMON_ICON_PATHS = [
  "/apple-touch-icon.png",
  "/apple-touch-icon-precomposed.png",
  "/favicon.png",
  "/favicon.svg",
  "/favicon.ico",
];

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
};

type LogoAsset = {
  buffer: ArrayBuffer;
  contentType: string;
};

type LogoCompany = {
  id: string;
  logoUrl: string;
  website: string;
};

function getLogoCacheControl(status: LogoStatus) {
  return status === LOGO_STATUS_PENDING ? PENDING_CACHE_CONTROL : MISSING_CACHE_CONTROL;
}

function getTagAttribute(tag: string, name: string) {
  const match = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

function scoreIconCandidate(c: { rel: string; sizes: string }) {
  if (c.rel.includes("apple-touch-icon")) return 100;
  const dim = parseInt(c.sizes.split("x")[0] ?? "0", 10);
  if (dim >= 192) return 90;
  if (dim >= 64) return 80;
  if (dim > 0) return 70;
  return 50;
}

async function fetchImage(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LogoAsset | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetchImpl(url, {
      headers: FETCH_HEADERS,
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const contentType = res.headers.get("Content-Type") ?? "";
    if (!contentType.startsWith("image/")) return null;

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 100) return null;
    return { buffer, contentType };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function scrapeIconFromHTML(
  website: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  type Candidate = { href: string; rel: string; sizes: string };
  const candidates: Candidate[] = [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetchImpl(website, {
      headers: FETCH_HEADERS,
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) return [];

    const html = await res.text();
    const finalOrigin = new URL(res.url || website).origin;
    const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];

    for (const tag of linkTags) {
      const rel = getTagAttribute(tag, "rel").toLowerCase();
      if (!rel.includes("icon")) continue;

      const href = getTagAttribute(tag, "href");
      if (!href) continue;

      candidates.push({
        href,
        rel,
        sizes: getTagAttribute(tag, "sizes"),
      });
    }

    candidates.sort((a, b) => scoreIconCandidate(b) - scoreIconCandidate(a));
    return candidates.flatMap((candidate) => {
      try {
        return [new URL(candidate.href, finalOrigin).toString()];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function findIcon(
  website: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LogoAsset | null> {
  const origin = new URL(website).origin;

  for (const path of COMMON_ICON_PATHS) {
    const result = await fetchImage(`${origin}${path}`, fetchImpl);
    if (result) return result;
  }

  const scraped = await scrapeIconFromHTML(website, fetchImpl);
  for (const url of scraped) {
    const result = await fetchImage(url, fetchImpl);
    if (result) return result;
  }

  return null;
}

async function resolveCompanyLogoAsset(
  company: LogoCompany,
  fetchImpl: typeof fetch = fetch,
): Promise<LogoAsset | null> {
  if (company.logoUrl) {
    const direct = await fetchImage(company.logoUrl, fetchImpl);
    if (direct) return direct;
  }

  if (!company.website) return null;

  try {
    new URL(company.website);
  } catch {
    return null;
  }

  return findIcon(company.website, fetchImpl);
}

export function buildLogoStorageKey(companyId: string) {
  return `${STORAGE_PREFIX}/logos/${companyId}`;
}

export function buildLogoSrc(companyId: string, logoStatus: LogoStatus) {
  return logoStatus === LOGO_STATUS_READY ? `/api/logos/${companyId}` : "";
}

export function createLogoUnavailableResponse(status: LogoStatus) {
  if (status === LOGO_STATUS_READY) {
    throw new Error("Ready logos must use createReadyLogoResponse");
  }

  return new Response(JSON.stringify({ error: "No logo found" }), {
    status: 404,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": getLogoCacheControl(status),
      "X-Logo-Status": status,
    },
  });
}

export function createReadyLogoResponse(body: BodyInit, contentType: string) {
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": READY_CACHE_CONTROL,
      "X-Logo-Status": LOGO_STATUS_READY,
    },
  });
}

export async function warmCompanyLogos(
  env: Env,
  options: { force?: boolean; limit?: number } = {},
) {
  const db = drizzle(env.DB);
  const force = options.force === true;
  const limit = typeof options.limit === "number" ? options.limit : undefined;

  const baseQuery = db
    .select({
      id: companies.id,
      logoUrl: companies.logoUrl,
      website: companies.website,
      logoStatus: companies.logoStatus,
    })
    .from(companies);

  const companyRows = force
    ? limit !== undefined
      ? await baseQuery.orderBy(asc(companies.name)).limit(limit).all()
      : await baseQuery.orderBy(asc(companies.name)).all()
    : limit !== undefined
      ? await baseQuery.where(eq(companies.logoStatus, LOGO_STATUS_PENDING)).orderBy(asc(companies.name)).limit(limit).all()
      : await baseQuery.where(eq(companies.logoStatus, LOGO_STATUS_PENDING)).orderBy(asc(companies.name)).all();

  let ready = 0;
  let missing = 0;

  for (const company of companyRows) {
    const r2Key = buildLogoStorageKey(company.id);
    const existing = await env.STORAGE.get(r2Key);

    if (existing) {
      await db
        .update(companies)
        .set({
          logoStatus: LOGO_STATUS_READY,
          logoCheckedAt: new Date(),
        })
        .where(eq(companies.id, company.id))
        .execute();
      ready += 1;
      continue;
    }

    const asset = await resolveCompanyLogoAsset(company);

    if (asset) {
      await env.STORAGE.put(r2Key, asset.buffer, {
        httpMetadata: { contentType: asset.contentType },
      });
      await db
        .update(companies)
        .set({
          logoStatus: LOGO_STATUS_READY,
          logoCheckedAt: new Date(),
        })
        .where(eq(companies.id, company.id))
        .execute();
      ready += 1;
      continue;
    }

    await env.STORAGE.delete(r2Key);
    await db
      .update(companies)
      .set({
        logoStatus: LOGO_STATUS_MISSING,
        logoCheckedAt: new Date(),
      })
      .where(eq(companies.id, company.id))
      .execute();
    missing += 1;
  }

  return {
    processed: companyRows.length,
    ready,
    missing,
    force,
    limit: limit ?? null,
  };
}
