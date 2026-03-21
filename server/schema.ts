import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, index, unique } from "drizzle-orm/sqlite-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  headcountDropThreshold: integer("headcount_drop_threshold").notNull().default(10),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Companies ────────────────────────────────────────────────────────────────

export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  coresignalCompanyId: integer("coresignal_company_id"),
  coresignalShorthand: text("coresignal_shorthand"),
  industry: text("industry").notNull().default(""),
  website: text("website").notNull().default(""),
  logoUrl: text("logo_url").notNull().default(""),
  logoStatus: text("logo_status").$type<"pending" | "ready" | "missing">().notNull().default("pending"),
  logoCheckedAt: integer("logo_checked_at", { mode: "timestamp" }),
  country: text("country").notNull().default(""),
  employeeRange: text("employee_range").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (t) => [
  index("companies_logo_status_idx").on(t.logoStatus),
]);

// ─── User Portfolio Companies ─────────────────────────────────────────────────

export const userPortfolioCompanies = sqliteTable(
  "user_portfolio_companies",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("upc_user_idx").on(t.userId),
    index("upc_company_idx").on(t.companyId),
    unique("upc_user_company_uniq").on(t.userId, t.companyId),
  ],
);

// ─── Company Headcount Snapshots ──────────────────────────────────────────────

export const companyHeadcountSnapshots = sqliteTable(
  "company_headcount_snapshots",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    headcount: integer("headcount").notNull(),
    recordedAt: text("recorded_at").notNull(), // "2025-01" format
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("chs_company_idx").on(t.companyId),
    index("chs_company_recorded_idx").on(t.companyId, t.recordedAt),
  ],
);

// ─── Company News ─────────────────────────────────────────────────────────────

export const companyNews = sqliteTable(
  "company_news",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    url: text("url").notNull().default(""),
    sourceName: text("source_name").notNull().default(""),
    publishedAt: text("published_at").notNull().default(""),
    sentimentScore: integer("sentiment_score").notNull().default(50),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("cn_company_idx").on(t.companyId),
    index("cn_company_published_idx").on(t.companyId, t.publishedAt),
  ],
);

// ─── Company Notes ────────────────────────────────────────────────────────────

export const companyNotes = sqliteTable(
  "company_notes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("cno_user_company_idx").on(t.userId, t.companyId),
    unique("cno_user_company_uniq").on(t.userId, t.companyId),
  ],
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type UserPortfolioCompany = typeof userPortfolioCompanies.$inferSelect;
export type NewUserPortfolioCompany = typeof userPortfolioCompanies.$inferInsert;
export type CompanyHeadcountSnapshot = typeof companyHeadcountSnapshots.$inferSelect;
export type NewCompanyHeadcountSnapshot = typeof companyHeadcountSnapshots.$inferInsert;
export type CompanyNewsItem = typeof companyNews.$inferSelect;
export type NewCompanyNewsItem = typeof companyNews.$inferInsert;
export type CompanyNote = typeof companyNotes.$inferSelect;
export type NewCompanyNote = typeof companyNotes.$inferInsert;
