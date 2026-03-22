# Portwatch

**Portwatch** is a portfolio monitoring app for tracking workforce signals at companies you care about. Build a watchlist of up to 10 companies, and Portwatch surfaces headcount trends and news sentiment so you can spot distress signals early — layoffs, shrinking teams, negative press — before they become obvious.

> **MVP status:** Headcount and news data are currently **simulated**. The app seeds a realistic-looking dataset and lets you trigger a mock "data pull" at any time. Real API integrations (Coresignal, NewsAPI, OpenAI) are designed and documented but not yet wired up.

---

## What it does

- **Company watchlist** — add up to 10 companies to your personal portfolio
- **Headcount tracking** — monthly employee count snapshots with trend charts; alerts when a company drops beyond your configured threshold (default: 10%)
- **News sentiment** — news articles scored 0–100 for negativity; alerts when average sentiment crosses 70
- **Alert dashboard** — a single view showing which portfolio companies have active headcount or sentiment alerts
- **Company notes** — per-company private notes, visible only when the company is in your portfolio

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router v7 (data router + lazy routes) |
| Styling | Tailwind CSS v4, Base UI |
| State | Zustand v5 (persisted auth store) |
| Icons | Phosphor Icons |
| Build | Vite (vite-plus), TypeScript 5.9 |
| Backend | Hono on Cloudflare Pages Functions |
| Database | Cloudflare D1 (SQLite) via Drizzle ORM |
| Storage | Cloudflare R2 (company logos) |
| Auth | JWT (jose) + PBKDF2 password hashing |
| Validation | Zod |
| Testing | Vitest (unit), Playwright (E2E) |
| Package manager | pnpm 10 |

---

## Prerequisites

Before you start, make sure you have:

- **Node.js** >= 18
- **pnpm** >= 10 — `npm install -g pnpm`
- **Cloudflare account** — [cloudflare.com](https://cloudflare.com) (free tier works)
- **Wrangler CLI** — `pnpm dlx wrangler login` (or `npm install -g wrangler`)

---

## Infrastructure setup

Portwatch uses two Cloudflare managed services. You need to create one of each under your own account.

### Cloudflare D1 — database

D1 is Cloudflare's serverless SQLite. It stores users, companies, headcount snapshots, news articles, and notes.

```bash
# Create the database — copy the database_id from the output
wrangler d1 create portwatch-db
```

Open `wrangler.json` and replace the placeholder with your ID:

```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "portwatch-db",
      "database_id": "<paste your database_id here>"
    }
  ]
}
```

### Cloudflare R2 — object storage

R2 stores cached company logo images. It's optional for a working app but logos will show as missing without it.

```bash
# Create the bucket (name must match wrangler.json)
wrangler r2 bucket create portwatch-assets
```

The `wrangler.json` already references this bucket name — no further changes needed.

### Environment variables

Copy the example env file and fill in your values:

```bash
cp .dev.vars.example .dev.vars
```

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | **Yes** | Random secret used to sign JWT tokens. Use any long random string. |
| `OPENAI_API_KEY` | No | Used for real sentiment analysis. Not active in current MVP. |

Generate a good secret: `openssl rand -base64 32`

---

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/your-username/portwatch.git
cd portwatch
pnpm install

# 2. Set up env (edit .dev.vars and set JWT_SECRET)
cp .dev.vars.example .dev.vars

# 3. Create D1 database, paste the database_id into wrangler.json
wrangler d1 create portwatch-db

# 4. Create R2 bucket
wrangler r2 bucket create portwatch-assets

# 5. Apply migrations locally
pnpm db:migrate:local

# 6. Build and start the local Cloudflare dev server
pnpm build && pnpm cf:dev

# 7. Seed the database with demo companies and simulated data
curl -X POST http://localhost:8789/api/admin/seed

# App is running at http://localhost:8789
```

Register an account at `/register`, then start adding companies to your portfolio.

---

## Available scripts

| Script | Description |
|---|---|
| `pnpm dev` | Vite dev server only (no Workers runtime, no D1/R2) |
| `pnpm dev:api` | Wrangler Pages dev API server on port 8786 |
| `pnpm build` | TypeScript check + Vite build |
| `pnpm cf:dev` | Full Cloudflare Pages local dev (port 8789) |
| `pnpm cf:deploy` | Build and deploy to Cloudflare Pages |
| `pnpm test` | Run Vitest unit tests |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm lint` | ESLint |
| `pnpm db:create` | Create a new D1 database |
| `pnpm db:generate` | Generate Drizzle migrations from schema changes |
| `pnpm db:migrate` | Apply migrations to remote D1 |
| `pnpm db:migrate:local` | Apply migrations to local D1 |

---

## Simulated data

Portwatch ships with a data simulation engine for demo and development purposes.

**`POST /api/admin/seed`** — Seeds the database with ~130 real companies (Meta, Google, Stripe, etc.), 18–24 months of headcount history, and recent news articles. Hardcoded "layoff companies" (e.g. Meta, Amazon, Google) show a gradual 6-month decline pattern.

**`POST /api/portfolio/check`** — Triggered by the "Pull Latest Data" button on the dashboard. Generates a simulated headcount snapshot for the current month (±10% fluctuation) and 1–2 fake news articles for each company in your portfolio.

**Logo warming** — `POST /api/admin/logos/warm` fetches and caches company logos from their websites into R2. This runs automatically after seed unless you pass `?warmLogos=false`.

---

## Database schema

```
users
  id, email, passwordHash, displayName
  headcountDropThreshold   -- alert threshold, default 10%, range 1–50%
  createdAt, updatedAt
       │
       ├──── user_portfolio_companies   -- max 10 per user
       │       userId (FK), companyId (FK)
       │       UNIQUE(userId, companyId)
       │
       └──── company_notes             -- one note per user per company
               userId (FK), companyId (FK), content
               UNIQUE(userId, companyId)

companies
  id, name, industry, website, country, employeeRange
  logoUrl, logoStatus (pending → ready | missing), logoCheckedAt
  coresignalCompanyId, coresignalShorthand  -- reserved for future integration
  createdAt
       │
       ├──▶ company_headcount_snapshots
       │      companyId (FK), headcount (int)
       │      recordedAt ("YYYY-MM" format)
       │      UNIQUE(companyId, recordedAt)
       │
       └──▶ company_news
              companyId (FK), title, description, url
              sourceName, publishedAt
              sentimentScore (0 = positive → 100 = negative)
```

Alert logic:
- **Headcount alert**: `(latestHeadcount - previousHeadcount) / previousHeadcount * 100 ≤ -threshold`
- **Sentiment alert**: average `sentimentScore` across last 5 articles ≥ 70

---

## Project structure

```
├── functions/api/[[route]].ts        # Hono app entry — Cloudflare Pages Functions catch-all
├── server/
│   ├── schema.ts                     # Drizzle table definitions + inferred types
│   ├── lib/
│   │   ├── auth.ts                   # PBKDF2 + JWT (portable Web Crypto, no Node deps)
│   │   ├── env.ts                    # Cloudflare bindings type (DB, STORAGE, secrets)
│   │   ├── logos.ts                  # Logo fetch + R2 cache warming pipeline
│   │   └── sentiment.ts              # OpenAI sentiment scorer (built, not active in MVP)
│   ├── middleware/auth.ts            # Bearer JWT middleware for Hono
│   ├── routes/
│   │   ├── auth.ts                   # POST /register, /login, GET/PUT /me
│   │   ├── companies.ts              # Company search + detail
│   │   ├── portfolio.ts              # GET portfolio with computed signals, simulated check
│   │   ├── notes.ts                  # Per-user company notes CRUD
│   │   ├── logos.ts                  # Serve logos from R2
│   │   └── admin.ts                  # Seed data + logo warming (no auth)
│   └── seed/
│       ├── companies.ts              # Hardcoded company list (~130 companies)
│       └── generate-mock-data.ts     # Headcount + news simulation engine
├── src/
│   ├── router.ts                     # React Router config with loaders
│   ├── main.tsx                      # App entry — ErrorBoundary + Suspense
│   ├── components/                   # Layout, Sidebar, MetricCard, Toast, etc.
│   ├── features/
│   │   ├── auth/                     # LoginPage, RegisterPage
│   │   ├── companies/                # Company search + detail pages
│   │   ├── dashboard/                # Alert dashboard
│   │   └── settings/                 # User preferences
│   └── shared/
│       ├── config.ts                 # APP_NAME, PORTFOLIO_LIMIT
│       ├── hooks/                    # useApi, useAuth, useOnline, usePageTitle
│       ├── store/                    # authStore (persisted), toastStore
│       ├── types.ts                  # Shared frontend types
│       └── utils/apiFetch.ts         # Loader-friendly fetch (redirects on 401)
├── drizzle/migrations/               # SQL migration files
├── e2e/                              # Playwright tests
└── public/                           # Static assets, PWA manifest
```

---

## Deployment

```bash
# 1. Create production D1 database
wrangler d1 create portwatch-db
# Paste the database_id into wrangler.json

# 2. Create production R2 bucket
wrangler r2 bucket create portwatch-assets

# 3. Apply migrations to production
pnpm db:migrate

# 4. Set secrets in Cloudflare Pages dashboard:
#    Pages project → Settings → Environment variables
#      JWT_SECRET   (required)
#      OPENAI_API_KEY (optional)

# 5. Deploy
pnpm cf:deploy

# 6. Seed production data
curl -X POST https://your-project.pages.dev/api/admin/seed
```

---

## Future data sources

These integrations are designed and documented but not yet active. The schema already includes the necessary fields (`coresignalCompanyId`, `coresignalShorthand` on companies).

### Coresignal — Historical Headcount API

Docs: https://docs.coresignal.com/company-api/historical-headcount-api

**Endpoint:**
```
GET /v2/historical_headcount/collect/{company_id}
GET /v2/historical_headcount/collect/{shorthand_name}
```

**Response shape (array of monthly records):**
```json
[
  {
    "company_id": 12345,
    "shorthand_name": "acme-corp",
    "name": "Acme Corp",
    "website": "https://acme.com",
    "industry": "Software",
    "country": "United States",
    "headcount": 2340,
    "size": "1001-5000",
    "created": "2024-11-01T00:00:00Z"
  }
]
```

**Field mapping:**

| Coresignal field | Stored in |
|---|---|
| `company_id` | `companies.coresignalCompanyId` |
| `shorthand_name` | `companies.coresignalShorthand` |
| `headcount` | `company_headcount_snapshots.headcount` |
| `created` (month part) | `company_headcount_snapshots.recordedAt` (`"YYYY-MM"`) |

---

### NewsAPI — Everything search

Docs: https://newsapi.org/docs/get-started#search

**Endpoint:** `GET https://newsapi.org/v2/everything`

**Field mapping:**

| NewsAPI field | Stored in |
|---|---|
| `articles[].title` | `company_news.title` |
| `articles[].description` | `company_news.description` |
| `articles[].url` | `company_news.url` |
| `articles[].source.name` | `company_news.sourceName` |
| `articles[].publishedAt` | `company_news.publishedAt` |
| computed via OpenAI | `company_news.sentimentScore` (0–100) |
