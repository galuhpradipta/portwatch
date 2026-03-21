import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import Database from "better-sqlite3";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { adminRoutes } from "./admin.ts";
import { logosRoutes } from "./logos.ts";
import type { Env } from "../lib/env.ts";
import { buildLogoStorageKey } from "../lib/logos.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = readdirSync(resolve(__dirname, "../../drizzle/migrations"))
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(resolve(__dirname, `../../drizzle/migrations/${file}`), "utf-8"))
  .join("\n");

function createD1Mock(db: Database.Database) {
  const makeStmt = (query: string, params: unknown[] = []) => ({
    bind(...p: unknown[]) {
      return makeStmt(query, p);
    },
    async all() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = (db.prepare(query) as any).all(...params);
      return { results, success: true, meta: {} };
    },
    async raw() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = (db.prepare(query) as any).all(...params) as Record<string, unknown>[];
      return results.map((row) => Object.values(row));
    },
    async first() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (db.prepare(query) as any).get(...params);
      return result ?? null;
    },
    async run() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (db.prepare(query) as any).run(...params);
      return {
        success: true,
        meta: { last_row_id: Number(result.lastInsertRowid), changes: result.changes },
      };
    },
  });

  return {
    prepare: (query: string) => makeStmt(query),
    exec: async (query: string) => {
      db.exec(query);
      return { count: 0, duration: 0 };
    },
    batch: async (stmts: ReturnType<typeof makeStmt>[]) =>
      Promise.all(stmts.map((stmt) => stmt.run())),
    dump: async () => new ArrayBuffer(0),
  };
}

function toUint8Array(value: string | ArrayBuffer | ArrayBufferView) {
  if (typeof value === "string") return new TextEncoder().encode(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
}

function createR2Mock() {
  const store = new Map<string, { body: Uint8Array; httpMetadata?: { contentType?: string } }>();

  const bucket = {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(
      key: string,
      value: string | ArrayBuffer | ArrayBufferView,
      options?: { httpMetadata?: { contentType?: string } },
    ) {
      store.set(key, {
        body: toUint8Array(value),
        httpMetadata: options?.httpMetadata,
      });
    },
    async delete(key: string) {
      store.delete(key);
    },
  };

  return { bucket, store };
}

function createTestApp() {
  const sqlite = new Database(":memory:");
  sqlite.exec(MIGRATION_SQL);

  const { bucket, store } = createR2Mock();
  const env = {
    DB: createD1Mock(sqlite),
    STORAGE: bucket,
    JWT_SECRET: "test-secret",
    OPENAI_API_KEY: "test-openai-key",
  } as unknown as Env;

  const app = new Hono<{ Bindings: Env }>();
  app.route("/api/admin", adminRoutes);
  app.route("/api/logos", logosRoutes);

  return { app, env, sqlite, store };
}

function insertCompany(
  sqlite: Database.Database,
  values: {
    id: string;
    name?: string;
    website?: string;
    logoUrl?: string;
    logoStatus?: "pending" | "ready" | "missing";
  },
) {
  sqlite
    .prepare(`
      INSERT INTO companies (
        id,
        name,
        industry,
        website,
        logo_url,
        logo_status,
        country,
        employee_range
      ) VALUES (?, ?, '', ?, ?, ?, '', '')
    `)
    .run(
      values.id,
      values.name ?? values.id,
      values.website ?? "",
      values.logoUrl ?? "",
      values.logoStatus ?? "pending",
    );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/admin/logos/warm", () => {
  it("persists ready status when direct logoUrl resolves", async () => {
    const { app, env, sqlite, store } = createTestApp();
    insertCompany(sqlite, {
      id: "company-direct",
      logoUrl: "https://cdn.example.com/logo.png",
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input) === "https://cdn.example.com/logo.png") {
        return new Response(new Uint8Array(256).fill(1), {
          status: 200,
          headers: { "Content-Type": "image/png" },
        });
      }

      throw new Error(`Unexpected fetch: ${String(input)}`);
    });

    const res = await app.request("/api/admin/logos/warm", { method: "POST" }, env);
    expect(res.status).toBe(200);

    const row = sqlite
      .prepare("SELECT logo_status AS logoStatus, logo_checked_at AS logoCheckedAt FROM companies WHERE id = ?")
      .get("company-direct") as { logoStatus: string; logoCheckedAt: number | null };

    expect(row.logoStatus).toBe("ready");
    expect(row.logoCheckedAt).not.toBeNull();
    expect(store.get(buildLogoStorageKey("company-direct"))?.httpMetadata?.contentType).toBe("image/png");
  });

  it("persists ready status when website scraping finds an icon", async () => {
    const { app, env, sqlite, store } = createTestApp();
    insertCompany(sqlite, {
      id: "company-scraped",
      website: "https://scrape.example.com",
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.startsWith("https://scrape.example.com/apple-touch-icon")) {
        return new Response("nope", { status: 404 });
      }
      if (url === "https://scrape.example.com/favicon.png") {
        return new Response("nope", { status: 404 });
      }
      if (url === "https://scrape.example.com/favicon.svg") {
        return new Response("nope", { status: 404 });
      }
      if (url === "https://scrape.example.com/favicon.ico") {
        return new Response("nope", { status: 404 });
      }
      if (url === "https://scrape.example.com") {
        return new Response(
          '<html><head><link rel="icon" href="/brand.svg" sizes="64x64"></head></html>',
          { status: 200, headers: { "Content-Type": "text/html" } },
        );
      }
      if (url === "https://scrape.example.com/brand.svg") {
        return new Response(new Uint8Array(256).fill(2), {
          status: 200,
          headers: { "Content-Type": "image/svg+xml" },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const res = await app.request("/api/admin/logos/warm", { method: "POST" }, env);
    expect(res.status).toBe(200);

    const row = sqlite
      .prepare("SELECT logo_status AS logoStatus FROM companies WHERE id = ?")
      .get("company-scraped") as { logoStatus: string };

    expect(row.logoStatus).toBe("ready");
    expect(store.get(buildLogoStorageKey("company-scraped"))?.httpMetadata?.contentType).toBe("image/svg+xml");
  });

  it("marks invalid websites as missing without remote fetches", async () => {
    const { app, env, sqlite } = createTestApp();
    insertCompany(sqlite, {
      id: "company-invalid",
      website: "not-a-valid-url",
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await app.request("/api/admin/logos/warm", { method: "POST" }, env);
    expect(res.status).toBe(200);

    const row = sqlite
      .prepare("SELECT logo_status AS logoStatus FROM companies WHERE id = ?")
      .get("company-invalid") as { logoStatus: string };

    expect(row.logoStatus).toBe("missing");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("marks unresolved logos as missing", async () => {
    const { app, env, sqlite, store } = createTestApp();
    insertCompany(sqlite, {
      id: "company-missing",
      website: "https://missing.example.com",
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url === "https://missing.example.com") {
        return new Response("<html><head></head><body>No icon</body></html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      }

      return new Response("nope", { status: 404 });
    });

    const res = await app.request("/api/admin/logos/warm", { method: "POST" }, env);
    expect(res.status).toBe(200);

    const row = sqlite
      .prepare("SELECT logo_status AS logoStatus, logo_checked_at AS logoCheckedAt FROM companies WHERE id = ?")
      .get("company-missing") as { logoStatus: string; logoCheckedAt: number | null };

    expect(row.logoStatus).toBe("missing");
    expect(row.logoCheckedAt).not.toBeNull();
    expect(store.has(buildLogoStorageKey("company-missing"))).toBe(false);
  });
});

describe("GET /api/logos/:companyId", () => {
  it("serves ready logos from R2 with long-lived cache headers", async () => {
    const { app, env, sqlite, store } = createTestApp();
    insertCompany(sqlite, {
      id: "company-ready",
      logoStatus: "ready",
    });

    store.set(buildLogoStorageKey("company-ready"), {
      body: new Uint8Array(256).fill(3),
      httpMetadata: { contentType: "image/png" },
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await app.request("/api/logos/company-ready", {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=2592000");
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect((await res.arrayBuffer()).byteLength).toBe(256);
  });

  it("returns immediate 404s for pending and missing logos without remote fetches", async () => {
    const { app, env, sqlite } = createTestApp();
    insertCompany(sqlite, {
      id: "company-pending",
      logoStatus: "pending",
    });
    insertCompany(sqlite, {
      id: "company-missing",
      logoStatus: "missing",
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const pendingRes = await app.request("/api/logos/company-pending", {}, env);
    const missingRes = await app.request("/api/logos/company-missing", {}, env);

    expect(pendingRes.status).toBe(404);
    expect(pendingRes.headers.get("Cache-Control")).toBe("public, max-age=60");
    expect(missingRes.status).toBe(404);
    expect(missingRes.headers.get("Cache-Control")).toBe("public, max-age=86400");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
