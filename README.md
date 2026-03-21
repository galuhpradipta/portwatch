# Portwatch

**Portwatch** is a portfolio monitoring app for tracking workforce signals at companies you care about. You build a watchlist of up to 10 companies, and Portwatch surfaces headcount trends and news sentiment so you can spot distress signals early — layoffs, shrinking teams, negative press — before they become obvious.

---

## What it does

- **Company watchlist** — add up to 10 companies to your personal portfolio
- **Headcount tracking** — monthly employee count snapshots pulled from Coresignal; alerts when a company drops by more than your configured threshold (default: 10%)
- **News sentiment** — news articles pulled from NewsAPI, scored 0–100 for negativity; alerts when average sentiment crosses 70
- **Alert dashboard** — a single view showing which portfolio companies have active headcount or sentiment alerts

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
| Auth | JWT (jose) + PBKDF2 password hashing |
| Validation | Zod |
| Testing | Vitest (unit), Playwright (E2E) |
| Package manager | pnpm 10 |

---

## Data sources

### Coresignal — Historical Headcount API

Docs: https://docs.coresignal.com/company-api/historical-headcount-api

Portwatch calls the Coresignal headcount endpoint to pull monthly employee count snapshots per company. Each snapshot is stored in `companyHeadcountSnapshots`.

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
    "canonical_shorthand_name": "acme-corp",
    "name": "Acme Corp",
    "website": "https://acme.com",
    "industry": "Software",
    "type": "Private",
    "location": "San Francisco, CA",
    "country": "United States",
    "headcount": 2340,
    "follower_count": 18500,
    "size": "1001-5000",
    "created": "2024-11-01T00:00:00Z",
    "professional_network_url": "https://linkedin.com/company/acme-corp"
  }
]
```

**How Portwatch uses it:**

| Coresignal field | Stored in |
|---|---|
| `company_id` | `companies.coresignalCompanyId` |
| `shorthand_name` | `companies.coresignalShorthand` |
| `name` | `companies.name` |
| `website` | `companies.website` |
| `industry` | `companies.industry` |
| `country` | `companies.country` |
| `size` | `companies.employeeRange` |
| `headcount` | `companyHeadcountSnapshots.headcount` |
| `created` (month part) | `companyHeadcountSnapshots.recordedAt` (`"YYYY-MM"`) |

Alert logic: if `(latestHeadcount - previousHeadcount) / previousHeadcount * 100` is ≤ `-headcountDropThreshold`, `hasHeadcountAlert` is set to `true`.

---

### NewsAPI — Everything search

Docs: https://newsapi.org/docs/get-started#search

Portwatch queries NewsAPI for articles mentioning each portfolio company. Articles are stored in `companyNews` with a sentiment score.

**Endpoint:**
```
GET https://newsapi.org/v2/everything
```

**Request parameters:**
```
q          company name or keywords
from       lookback date
sortBy     publishedAt | popularity | relevancy
apiKey     your NewsAPI key
```

**Response shape:**
```json
{
  "status": "ok",
  "totalResults": 120,
  "articles": [
    {
      "source": { "id": "techcrunch", "name": "TechCrunch" },
      "title": "Acme Corp announces second round of layoffs",
      "description": "Acme Corp said it will cut 400 jobs...",
      "url": "https://techcrunch.com/...",
      "publishedAt": "2024-11-15T10:30:00Z",
      "content": "..."
    }
  ]
}
```

**How Portwatch uses it:**

| NewsAPI field | Stored in |
|---|---|
| `articles[].title` | `companyNews.title` |
| `articles[].description` | `companyNews.description` |
| `articles[].url` | `companyNews.url` |
| `articles[].source.name` | `companyNews.sourceName` |
| `articles[].publishedAt` | `companyNews.publishedAt` |
| computed sentiment | `companyNews.sentimentScore` (0–100) |

Alert logic: if the average `sentimentScore` across recent articles is ≥ 70, `hasSentimentAlert` is set to `true`.

---

## Database schema

```
users
  id, email, passwordHash, displayName
  headcountDropThreshold (default 10%)
       │
       │ (via userPortfolioCompanies, max 10)
       ▼
companies
  id, name, industry, website, logoUrl, country, employeeRange
  coresignalCompanyId, coresignalShorthand
       │
       ├──▶ companyHeadcountSnapshots
       │      headcount (int), recordedAt (YYYY-MM)
       │
       └──▶ companyNews
               title, description, url, sourceName,
               publishedAt, sentimentScore (0–100)
```

---

## Quick start

```bash
# 1. Clone and install
git clone <your-repo> portwatch
cd portwatch
pnpm install

# 2. Copy env file and fill in secrets
cp .dev.vars.example .dev.vars
# Edit .dev.vars:
#   JWT_SECRET=<random string>
#   CORESIGNAL_API_KEY=<your key>
#   NEWS_API_KEY=<your key>

# 3. Create a D1 database
pnpm db:create
# Copy the database_id into wrangler.json

# 4. Run migrations locally
pnpm db:migrate:local

# 5. Build and start the local Cloudflare dev server
pnpm build && pnpm cf:dev

# App is running at http://localhost:8788
```

---

## Available scripts

| Script | Description |
|---|---|
| `pnpm dev` | Vite dev server (no Workers runtime) |
| `pnpm build` | TypeScript check + Vite build |
| `pnpm cf:dev` | Local Cloudflare Pages dev (full stack) |
| `pnpm cf:deploy` | Deploy to Cloudflare Pages |
| `pnpm test` | Run Vitest unit tests |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm lint` | ESLint |
| `pnpm db:create` | Create a new D1 database |
| `pnpm db:generate` | Generate Drizzle migrations from schema |
| `pnpm db:migrate` | Apply migrations to remote D1 |
| `pnpm db:migrate:local` | Apply migrations to local D1 |

---

## Project structure

```
├── functions/api/[[route]].ts        # Hono app entry — Cloudflare Pages Functions
├── server/
│   ├── schema.ts                     # Drizzle table definitions + inferred types
│   ├── lib/
│   │   ├── auth.ts                   # PBKDF2 + JWT (portable, no Node deps)
│   │   └── env.ts                    # Cloudflare bindings type
│   ├── middleware/auth.ts            # Bearer JWT middleware for Hono
│   └── routes/
│       ├── auth.ts                   # POST /register, /login, GET/PUT /me
│       ├── companies.ts              # Company search + portfolio management
│       ├── portfolio.ts              # GET portfolio with computed signals
│       └── snapshots.ts             # Headcount + news ingestion
├── src/
│   ├── router.ts                     # React Router config with loaders
│   ├── main.tsx                      # App entry — ErrorBoundary + Suspense
│   ├── components/                   # Layout, Header, BottomNav, Toast, ConfirmDialog
│   ├── features/
│   │   ├── auth/                     # LoginPage, RegisterPage
│   │   ├── companies/                # Company search + detail
│   │   ├── dashboard/                # Alert summary view
│   │   └── portfolio/               # Watchlist management
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
pnpm db:create

# 2. Apply migrations to production
pnpm db:migrate

# 3. Set environment variables in Cloudflare Pages dashboard:
#    Settings → Environment variables
#      JWT_SECRET
#      CORESIGNAL_API_KEY
#      NEWS_API_KEY

# 4. Deploy
pnpm cf:deploy
```
