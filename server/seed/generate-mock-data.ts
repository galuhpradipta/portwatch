import type { SeedCompany } from "./companies.ts";

export type HeadcountSnapshot = {
  id: string;
  companyId: string;
  headcount: number;
  recordedAt: string;
};

export type NewsArticle = {
  id: string;
  companyId: string;
  title: string;
  description: string;
  url: string;
  sourceName: string;
  publishedAt: string;
  sentimentScore: number;
};

// seededRandom returns a deterministic float 0-1 based on a seed string
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash) / 2147483647;
}

// Generate 18-24 months of headcount snapshots for a company
// About 15-20 companies will have recent 10-30% drops (last 3 months)
export function generateHeadcountSnapshots(company: SeedCompany, hasDropped: boolean): HeadcountSnapshot[] {
  const snapshots: HeadcountSnapshot[] = [];
  const now = new Date(2026, 2, 1); // March 2026
  const monthCount = 18 + Math.floor(seededRandom(company.id + "months") * 7); // 18-24

  // Base headcount from employee range
  const rangeMap: Record<string, number> = {
    "1-10": 7,
    "11-50": 30,
    "51-200": 120,
    "201-500": 350,
    "501-1,000": 750,
    "1,001-5,000": 3000,
    "5,001-10,000": 7500,
    "10,001-50,000": 25000,
    "50,001+": 80000,
  };

  let baseHeadcount = rangeMap[company.employeeRange] ?? 500;
  // Add some variation
  baseHeadcount = Math.floor(baseHeadcount * (0.7 + seededRandom(company.id + "base") * 0.6));

  // Growth rate per month (slightly positive for most)
  const growthRate = 0.005 + seededRandom(company.id + "growth") * 0.02;

  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const recordedAt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    let headcount = Math.floor(baseHeadcount * Math.pow(1 + growthRate, monthCount - 1 - i));
    // Add noise
    headcount += Math.floor((seededRandom(company.id + recordedAt) - 0.5) * headcount * 0.02);

    // Apply drop for last 3 months
    if (hasDropped && i < 3) {
      const dropPct = 0.10 + seededRandom(company.id + "drop") * 0.20;
      headcount = Math.floor(headcount * (1 - dropPct));
    }

    snapshots.push({
      id: crypto.randomUUID(),
      companyId: company.id,
      headcount: Math.max(headcount, 1),
      recordedAt,
    });
  }

  return snapshots;
}

const NEWS_TITLES_NEGATIVE = [
  "lays off {n}% of workforce amid restructuring",
  "announces significant headcount reduction",
  "struggles with declining revenue, cuts staff",
  "faces investor pressure amid growth concerns",
  "reports Q{q} losses, initiates cost-cutting measures",
  "CEO departure fuels uncertainty",
  "misses quarterly targets, shares tumble",
  "customers flee amid product quality issues",
];

const NEWS_TITLES_POSITIVE = [
  "reports record Q{q} earnings, stock rises",
  "expands to new markets with strong growth",
  "secures ${amt}M Series {round} funding",
  "announces strategic partnership with major enterprise",
  "launches innovative product to strong reception",
  "achieves profitability milestone",
  "recognized as top employer of the year",
  "beats analyst expectations for third straight quarter",
];

const SOURCES = ["TechCrunch", "Bloomberg", "Reuters", "Forbes", "Wall Street Journal", "The Verge", "Business Insider", "CNBC", "Financial Times", "CrunchBase News"];

function fillTemplate(template: string, seed: string): string {
  return template
    .replace("{n}", String(Math.floor(5 + seededRandom(seed + "n") * 20)))
    .replace("{q}", String(Math.floor(1 + seededRandom(seed + "q") * 4)))
    .replace("${amt}", String(Math.floor(50 + seededRandom(seed + "amt") * 450)))
    .replace("{round}", ["A", "B", "C", "D"][Math.floor(seededRandom(seed + "round") * 4)]);
}

export function generateNewsArticles(company: SeedCompany, hasDropped: boolean): NewsArticle[] {
  const articles: NewsArticle[] = [];
  const count = 5 + Math.floor(seededRandom(company.id + "newscount") * 6); // 5-10
  const now = new Date(2026, 2, 20);

  for (let i = 0; i < count; i++) {
    const isNegative = hasDropped
      ? seededRandom(company.id + "neg" + i) < 0.7
      : seededRandom(company.id + "neg" + i) < 0.2;

    const titlePool = isNegative ? NEWS_TITLES_NEGATIVE : NEWS_TITLES_POSITIVE;
    const titleTemplate = titlePool[Math.floor(seededRandom(company.id + "title" + i) * titlePool.length)];
    const title = `${company.name} ${fillTemplate(titleTemplate, company.id + i)}`;

    const daysAgo = Math.floor(seededRandom(company.id + "days" + i) * 90);
    const pubDate = new Date(now);
    pubDate.setDate(pubDate.getDate() - daysAgo);

    const sentimentScore = isNegative
      ? Math.floor(60 + seededRandom(company.id + "sent" + i) * 35) // 60-95
      : Math.floor(5 + seededRandom(company.id + "sent" + i) * 35); // 5-40

    const sourceIdx = Math.floor(seededRandom(company.id + "src" + i) * SOURCES.length);

    articles.push({
      id: crypto.randomUUID(),
      companyId: company.id,
      title,
      description: `${title}. Industry observers are closely watching the developments at ${company.name} as the company navigates current market conditions.`,
      url: `https://example.com/news/${company.id.slice(0, 8)}-${i}`,
      sourceName: SOURCES[sourceIdx],
      publishedAt: pubDate.toISOString(),
      sentimentScore,
    });
  }

  return articles;
}

// Determine which companies have dropped (deterministic, 15-20 out of 100)
export function getDroppedCompanyIds(companyIds: string[]): Set<string> {
  const dropped = new Set<string>();
  for (const id of companyIds) {
    if (seededRandom(id + "dropped") < 0.17) {
      dropped.add(id);
    }
  }
  return dropped;
}
