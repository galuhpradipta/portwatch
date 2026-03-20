import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/cloudflare-pages";
import { authRoutes } from "../../server/routes/auth.ts";
import { companiesRoutes } from "../../server/routes/companies.ts";
import { portfolioRoutes } from "../../server/routes/portfolio.ts";
import { adminRoutes } from "../../server/routes/admin.ts";
import type { Env } from "../../server/lib/env.ts";

const app = new Hono<{ Bindings: Env }>().basePath("/api");

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.route("/auth", authRoutes);
app.route("/companies", companiesRoutes);
app.route("/portfolio", portfolioRoutes);
app.route("/admin", adminRoutes);

app.get("/health", (c) => c.json({ ok: true }));

export const onRequest = handle(app);
