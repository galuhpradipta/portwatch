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

// Companies known for real-world layoffs — always show declining headcount
const HARDCODED_LAYOFF_IDS = new Set([
  "a1b2c3d4-0105-4000-8000-000000000105", // Meta
  "a1b2c3d4-0101-4000-8000-000000000101", // Google
  "a1b2c3d4-0104-4000-8000-000000000104", // Amazon
  "a1b2c3d4-0102-4000-8000-000000000102", // Microsoft
  "a1b2c3d4-0112-4000-8000-000000000112", // Salesforce
  "a1b2c3d4-0108-4000-8000-000000000108", // Intel
  "a1b2c3d4-0118-4000-8000-000000000118", // Snap
  "a1b2c3d4-0116-4000-8000-000000000116", // Spotify
  "a1b2c3d4-0003-4000-8000-000000000003", // Shopify
  "a1b2c3d4-0001-4000-8000-000000000001", // Stripe
  "a1b2c3d4-0004-4000-8000-000000000004", // Twilio
  "a1b2c3d4-0128-4000-8000-000000000128", // Dropbox
  "a1b2c3d4-0127-4000-8000-000000000127", // Zoom
  "a1b2c3d4-0042-4000-8000-000000000042", // Klarna
  "a1b2c3d4-0130-4000-8000-000000000130", // Alibaba
]);

// Company-specific layoff context for realistic news generation
const LAYOFF_CONTEXT: Record<string, { reason: string; detail: string }> = {
  "a1b2c3d4-0105-4000-8000-000000000105": {
    reason: "efficiency restructuring",
    detail: "Year of Efficiency initiative targeting middle management layers",
  },
  "a1b2c3d4-0101-4000-8000-000000000101": {
    reason: "AI-driven reorganization",
    detail: "pivot toward AI products requiring different engineering skill sets",
  },
  "a1b2c3d4-0104-4000-8000-000000000104": {
    reason: "post-pandemic correction",
    detail: "over-hiring during COVID-era e-commerce boom now being unwound",
  },
  "a1b2c3d4-0102-4000-8000-000000000102": {
    reason: "cloud division realignment",
    detail: "Azure growth slowdown prompting organizational consolidation",
  },
  "a1b2c3d4-0112-4000-8000-000000000112": {
    reason: "sales force rightsizing",
    detail: "enterprise deal cycles lengthening amid tighter IT budgets",
  },
  "a1b2c3d4-0108-4000-8000-000000000108": {
    reason: "foundry strategy pivot",
    detail: "TSMC competition and declining PC chip margins forcing deep cuts",
  },
  "a1b2c3d4-0118-4000-8000-000000000118": {
    reason: "ad revenue decline",
    detail: "advertiser pullback and competition from TikTok eroding core business",
  },
  "a1b2c3d4-0116-4000-8000-000000000116": {
    reason: "cost optimization push",
    detail: "subscriber growth plateau prompting shift to profitability focus",
  },
  "a1b2c3d4-0003-4000-8000-000000000003": {
    reason: "e-commerce normalization",
    detail: "post-pandemic order volumes declining from pandemic peak hiring levels",
  },
  "a1b2c3d4-0001-4000-8000-000000000001": {
    reason: "revenue growth slowdown",
    detail: "payments volume growth deceleration prompting headcount rebalancing",
  },
  "a1b2c3d4-0004-4000-8000-000000000004": {
    reason: "product portfolio consolidation",
    detail: "sunset of legacy APIs driving workforce reduction across engineering",
  },
  "a1b2c3d4-0128-4000-8000-000000000128": {
    reason: "focus on core products",
    detail: "discontinuing non-core initiatives and streamlining R&D investment",
  },
  "a1b2c3d4-0127-4000-8000-000000000127": {
    reason: "post-pandemic normalization",
    detail: "return-to-office trends reducing demand from pandemic-era highs",
  },
  "a1b2c3d4-0042-4000-8000-000000000042": {
    reason: "IPO preparation",
    detail: "operational efficiency push ahead of public market debut",
  },
  "a1b2c3d4-0130-4000-8000-000000000130": {
    reason: "regulatory pressure",
    detail: "Chinese regulatory crackdown and weak consumer spending driving cuts",
  },
};

// Generate 18-24 months of headcount snapshots for a company
// Hardcoded layoff companies show a 6-month graduated decline
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
  baseHeadcount = Math.floor(baseHeadcount * (0.7 + seededRandom(company.id + "base") * 0.6));

  const growthRate = 0.005 + seededRandom(company.id + "growth") * 0.02;
  const dropPct = 0.10 + seededRandom(company.id + "drop") * 0.20;

  // Graduated decline factors over 6 months (month 5 ago = barely dips, month 0 = full drop)
  const gradFactors = [1.0, 0.80, 0.55, 0.30, 0.15, 0.05];

  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const recordedAt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    let headcount = Math.floor(baseHeadcount * Math.pow(1 + growthRate, monthCount - 1 - i));
    headcount += Math.floor((seededRandom(company.id + recordedAt) - 0.5) * headcount * 0.02);

    if (hasDropped && i < 6) {
      const gradFactor = gradFactors[i] ?? 1.0;
      headcount = Math.floor(headcount * (1 - dropPct * gradFactor));
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

const NEWS_TITLES_LAYOFF = [
  "{company} to cut {n}% of global workforce in latest round of layoffs",
  "{company} confirms {n}% staff reduction amid {reason}",
  "Inside {company}'s latest round of layoffs: {n}% of roles eliminated",
  "{company} slashes {n}% of jobs in sweeping cost-cutting push",
  "{company} layoffs: {n}% of employees receive pink slips in restructuring",
  "Exclusive: {company} plans to eliminate {n}% of headcount, sources say",
  "{company} axes {n}% of workforce as {reason} forces difficult decisions",
  "{company} joins wave of tech layoffs, cutting {n}% globally",
  "Sources: {company} quietly began notifying {n}% of staff this week",
  "{company} restructuring eliminates {n}% of roles across multiple divisions",
  "{company} workforce reduction: what we know about the {n}% job cuts",
  "Report: {company} to shed {n}% of employees citing {reason}",
];

const NEWS_DESCRIPTIONS_LAYOFF = [
  "{company} notified affected employees via email at {day} AM, directing them to return company equipment within 48 hours. Severance packages include {n} weeks of pay plus extended health benefits. An internal memo from the CEO cited {detail} as the primary driver. Multiple employees described the all-hands meeting held the prior week as unusually tense, according to {source}.",
  "The cuts at {company}, reported exclusively by {source}, represent the largest single-day headcount reduction in the company's history. Sources familiar with the matter said leadership had been debating the scope for months before settling on {n}% as a figure that would satisfy investors while preserving core product teams. Affected employees received calendar invites from HR with no subject line — a signal that spread through internal Slack channels within minutes.",
  "{source} reviewed an internal memo at {company} in which the CEO acknowledged the layoffs were a result of {detail}. 'We over-hired in a period of optimism and must now match our cost structure to reality,' the memo reads. Workers in the affected teams had no advance notice; {n}% of roles were eliminated before markets opened. The company has offered 60 days of WARN Act notice pay where legally required.",
  "Employees at {company} described a chaotic {day} morning as access badges stopped working across multiple floors. {source} confirmed the company eliminated {n}% of its workforce as part of what executives internally called a '{reason}' initiative. The move follows similar announcements from peers in the sector. Remaining staff received a message from leadership asking them to 'stay focused and trust the process.'",
  "In a filing with the SEC, {company} disclosed a workforce reduction of approximately {n}%, consistent with the {detail}. The announcement, which came after markets closed, sent shares higher in after-hours trading as investors welcomed the cost discipline. Former employees quickly organized a peer support channel on LinkedIn, with hundreds of profiles updating to 'Open to Work' within hours of the announcement, per {source}.",
];

const NEWS_DESCRIPTIONS_NEGATIVE_GENERIC = [
  "{company} executives acknowledged in a town hall that the company faces headwinds from a challenging macro environment. Analysts at {source} have lowered their 12-month price target following the announcement.",
  "A series of executive departures and missed growth targets has rattled confidence in {company}. {source} reports that board members are pushing for an accelerated strategic review.",
  "After months of speculation, {company} confirmed the disappointing results to investors. The company's stock fell sharply as {source} and other outlets reported the news, with no recovery timeline offered.",
];

const SOURCES = ["TechCrunch", "Bloomberg", "Reuters", "Forbes", "Wall Street Journal", "The Verge", "Business Insider", "CNBC", "Financial Times", "CrunchBase News"];

function fillTemplate(template: string, seed: string): string {
  return template
    .replace("{n}", String(Math.floor(5 + seededRandom(seed + "n") * 20)))
    .replace("{q}", String(Math.floor(1 + seededRandom(seed + "q") * 4)))
    .replace("${amt}", String(Math.floor(50 + seededRandom(seed + "amt") * 450)))
    .replace("{round}", ["A", "B", "C", "D"][Math.floor(seededRandom(seed + "round") * 4)]);
}

function fillLayoffTemplate(template: string, company: SeedCompany, seed: string, source: string): string {
  const ctx = LAYOFF_CONTEXT[company.id] ?? { reason: "restructuring", detail: "ongoing cost reduction efforts" };
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  return template
    .replace(/{company}/g, company.name)
    .replace(/{n}/g, String(Math.floor(5 + seededRandom(seed + "ln") * 20)))
    .replace(/{reason}/g, ctx.reason)
    .replace(/{detail}/g, ctx.detail)
    .replace(/{source}/g, source)
    .replace(/{day}/g, days[Math.floor(seededRandom(seed + "day") * days.length)]);
}

export function generateNewsArticles(company: SeedCompany, hasDropped: boolean): NewsArticle[] {
  const articles: NewsArticle[] = [];
  const isHardcodedLayoff = HARDCODED_LAYOFF_IDS.has(company.id);

  // Hardcoded layoff companies get 8-12 articles; others get 5-10
  const count = isHardcodedLayoff
    ? 8 + Math.floor(seededRandom(company.id + "newscount") * 5)
    : 5 + Math.floor(seededRandom(company.id + "newscount") * 6);

  const now = new Date(2026, 2, 20);

  for (let i = 0; i < count; i++) {
    let isNegative: boolean;
    if (isHardcodedLayoff) {
      isNegative = seededRandom(company.id + "neg" + i) < 0.80;
    } else if (hasDropped) {
      isNegative = seededRandom(company.id + "neg" + i) < 0.70;
    } else {
      isNegative = seededRandom(company.id + "neg" + i) < 0.20;
    }

    const daysAgo = Math.floor(seededRandom(company.id + "days" + i) * 90);
    const pubDate = new Date(now);
    pubDate.setDate(pubDate.getDate() - daysAgo);

    const sourceIdx = Math.floor(seededRandom(company.id + "src" + i) * SOURCES.length);
    const source = SOURCES[sourceIdx];

    let title: string;
    let description: string;

    if (isNegative && isHardcodedLayoff) {
      const titleTemplate = NEWS_TITLES_LAYOFF[Math.floor(seededRandom(company.id + "ltitle" + i) * NEWS_TITLES_LAYOFF.length)];
      title = fillLayoffTemplate(titleTemplate, company, company.id + i, source);

      const descTemplate = NEWS_DESCRIPTIONS_LAYOFF[Math.floor(seededRandom(company.id + "ldesc" + i) * NEWS_DESCRIPTIONS_LAYOFF.length)];
      description = fillLayoffTemplate(descTemplate, company, company.id + i, source);
    } else if (isNegative) {
      const titleTemplate = NEWS_TITLES_NEGATIVE[Math.floor(seededRandom(company.id + "title" + i) * NEWS_TITLES_NEGATIVE.length)];
      title = `${company.name} ${fillTemplate(titleTemplate, company.id + i)}`;

      const descTemplate = NEWS_DESCRIPTIONS_NEGATIVE_GENERIC[Math.floor(seededRandom(company.id + "desc" + i) * NEWS_DESCRIPTIONS_NEGATIVE_GENERIC.length)];
      description = descTemplate
        .replace(/{company}/g, company.name)
        .replace(/{source}/g, source);
    } else {
      const titleTemplate = NEWS_TITLES_POSITIVE[Math.floor(seededRandom(company.id + "title" + i) * NEWS_TITLES_POSITIVE.length)];
      title = `${company.name} ${fillTemplate(titleTemplate, company.id + i)}`;
      description = `${title}. Industry observers are closely watching the developments at ${company.name} as the company navigates current market conditions.`;
    }

    // Hardcoded layoff companies get higher sentiment scores (70-95) to guarantee alert trigger
    const sentimentScore = isNegative
      ? isHardcodedLayoff
        ? Math.floor(70 + seededRandom(company.id + "sent" + i) * 25)  // 70-95
        : Math.floor(60 + seededRandom(company.id + "sent" + i) * 35)  // 60-95
      : Math.floor(5 + seededRandom(company.id + "sent" + i) * 35);    // 5-40

    articles.push({
      id: crypto.randomUUID(),
      companyId: company.id,
      title,
      description,
      url: `https://example.com/news/${company.id.slice(0, 8)}-${i}`,
      sourceName: source,
      publishedAt: pubDate.toISOString(),
      sentimentScore,
    });
  }

  return articles;
}

// Determine which companies have dropped (deterministic)
// Tier 1: always include hardcoded layoff companies
// Tier 2: seeded random at lower 6% threshold for remaining companies
export function getDroppedCompanyIds(companyIds: string[]): Set<string> {
  const dropped = new Set<string>();
  for (const id of companyIds) {
    if (HARDCODED_LAYOFF_IDS.has(id) || seededRandom(id + "dropped") < 0.06) {
      dropped.add(id);
    }
  }
  return dropped;
}
