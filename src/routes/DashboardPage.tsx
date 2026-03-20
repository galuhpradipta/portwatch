import { useLoaderData, useNavigate, useRevalidator } from "react-router";
import { useState } from "react";
import {
  ArrowsClockwise,
  ArrowUp,
  ArrowDown,
  Buildings,
  Warning,
  Users,
  Pulse,
} from "@phosphor-icons/react";
import { useApi } from "../shared/hooks/useApi.ts";
import { PORTFOLIO_LIMIT } from "../shared/config.ts";
import type { PortfolioCompany } from "../shared/types.ts";
import CompanyLogo from "../components/CompanyLogo.tsx";

type SortKey = "name" | "headcount" | "change" | "sentiment";
type SortDir = "asc" | "desc";

function formatNumber(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString();
}

function getSentimentState(score: number | null) {
  if (score === null) {
    return {
      label: "No reading",
      tone: "text-app-text-muted",
      bar: "bg-app-text-dim",
      fill: "bg-app-border",
    };
  }

  if (score <= 40) {
    return {
      label: "Calm",
      tone: "text-app-green",
      bar: "bg-app-green",
      fill: "bg-app-green",
    };
  }

  if (score <= 70) {
    return {
      label: "Mixed",
      tone: "text-app-yellow",
      bar: "bg-app-yellow",
      fill: "bg-app-yellow",
    };
  }

  return {
    label: "Stressed",
    tone: "text-app-red",
    bar: "bg-app-red",
    fill: "bg-app-red",
  };
}

export default function DashboardPage() {
  const portfolio = useLoaderData() as PortfolioCompany[];
  const { revalidate } = useRevalidator();
  const api = useApi();
  const navigate = useNavigate();

  const [refreshing, setRefreshing] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await api.post("/portfolio/check", {});
      revalidate();
    } finally {
      setRefreshing(false);
    }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = [...portfolio].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") cmp = a.name.localeCompare(b.name);
    else if (sortKey === "headcount") cmp = (a.latestHeadcount ?? 0) - (b.latestHeadcount ?? 0);
    else if (sortKey === "change") cmp = (a.headcountChangePercent ?? 0) - (b.headcountChangePercent ?? 0);
    else if (sortKey === "sentiment") cmp = (a.avgSentimentScore ?? 0) - (b.avgSentimentScore ?? 0);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalHeadcount = portfolio.reduce((sum, c) => sum + (c.latestHeadcount ?? 0), 0);
  const sentimentScores = portfolio
    .filter((c) => c.avgSentimentScore !== null)
    .map((c) => c.avgSentimentScore as number);
  const avgSentiment =
    sentimentScores.length > 0
      ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
      : null;
  const activeAlerts = portfolio.filter((c) => c.hasHeadcountAlert || c.hasSentimentAlert);
  const headcountAlertCount = portfolio.filter((c) => c.hasHeadcountAlert).length;
  const sentimentAlertCount = portfolio.filter((c) => c.hasSentimentAlert).length;

  return (
    <div>
      {/* Header row */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="dashboard-kicker">Portfolio control room</p>
          <h1 className="dashboard-title text-2xl">Portfolio</h1>
          <p className="dashboard-copy text-sm">
            {portfolio.length} / {PORTFOLIO_LIMIT} companies tracked
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || portfolio.length === 0}
          className="dashboard-action flex items-center gap-2 rounded-full px-4 py-2 text-sm"
        >
          <ArrowsClockwise size={16} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh All"}
        </button>
      </div>

      {portfolio.length === 0 ? (
        <div className="dashboard-shell dashboard-panel dashboard-empty-state rounded-[1.75rem] p-10 md:p-12">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] dashboard-empty-icon">
            <Buildings size={36} />
          </div>
          <p className="dashboard-kicker">Portfolio status</p>
          <h2 className="dashboard-title mt-3 text-2xl">Your portfolio is empty</h2>
          <p className="dashboard-copy mx-auto mt-3 max-w-[34ch] text-sm">
            Add a few tracked companies so the metrics and signal table can start reading as a live portfolio.
          </p>
          <button
            onClick={() => navigate("/companies")}
            className="dashboard-action mt-6 rounded-full px-4 py-2 text-sm"
          >
            Browse Companies
          </button>
        </div>
      ) : (
        <>
          {/* Zone 1: Summary Stats */}
          <SummaryStats
            count={portfolio.length}
            totalHeadcount={totalHeadcount}
            avgSentiment={avgSentiment}
            activeAlerts={activeAlerts.length}
            headcountAlertCount={headcountAlertCount}
            sentimentAlertCount={sentimentAlertCount}
          />

          {/* Zone 2: Enhanced Portfolio Table */}
          <div className="dashboard-table-shell overflow-hidden">
            <div className="dashboard-table-topbar flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="dashboard-kicker">Portfolio table</p>
                <p className="dashboard-copy mt-1 text-sm">
                  {sorted.length} rows, sorted by{" "}
                  {sortKey === "name"
                    ? "company"
                    : sortKey === "headcount"
                    ? "headcount"
                    : sortKey === "change"
                    ? "change"
                    : "sentiment"}
                </p>
              </div>
              <p className="dashboard-data-muted hidden text-xs md:block">Click a header to sort</p>
            </div>
            <div className="overflow-x-auto">
              <table className="dashboard-table w-full min-w-[760px] table-fixed text-sm">
                <colgroup>
                  <col style={{ width: "40%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>
                <thead>
                  <tr className="dashboard-table-head border-b dashboard-divider">
                    {(
                      [
                        { key: "name" as SortKey, label: "Company" },
                        { key: "headcount" as SortKey, label: "Headcount" },
                        { key: "change" as SortKey, label: "Change %" },
                        { key: "sentiment" as SortKey, label: "Sentiment" },
                      ] as const
                    ).map(({ key, label }) => (
                      <th
                        key={key}
                        className={`dashboard-kicker px-5 py-3 select-none transition-colors hover:text-app-text ${
                          key === "name" ? "text-left" : "text-right"
                        }`}
                        onClick={() => handleSort(key)}
                      >
                        <span
                          className={`inline-flex items-center gap-1 ${
                            key === "name" ? "" : "justify-end"
                          }`}
                        >
                          {label}
                          {sortKey === key &&
                            (sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                        </span>
                      </th>
                    ))}
                    <th className="dashboard-kicker px-5 py-3 text-right">Signals</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((company) => (
                    <tr
                      key={company.id}
                      className="dashboard-table-row group cursor-pointer"
                      onClick={() => navigate(`/companies/${company.id}`)}
                    >
                      <td className="px-5 py-4 align-top">
                        <div className="flex min-w-0 items-center gap-3">
                          <CompanyLogo name={company.name} website={company.website} size={32} />
                          <div className="min-w-0">
                            <div className="truncate dashboard-title text-base">
                              {company.name}
                            </div>
                            <div className="dashboard-company-meta mt-1">
                              {company.industry} · {company.country}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top text-right">
                        <span className="dashboard-data text-lg font-semibold">
                          {formatNumber(company.latestHeadcount)}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-top text-right">
                        <ChangePill pct={company.headcountChangePercent} />
                      </td>
                      <td className="px-5 py-4 align-top text-right">
                        <SentimentBar score={company.avgSentimentScore} />
                      </td>
                      <td className="px-5 py-4 align-top text-right">
                        <AlertBadges
                          hasHeadcountAlert={company.hasHeadcountAlert}
                          hasSentimentAlert={company.hasSentimentAlert}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryStats({
  count,
  totalHeadcount,
  avgSentiment,
  activeAlerts,
  headcountAlertCount,
  sentimentAlertCount,
}: {
  count: number;
  totalHeadcount: number;
  avgSentiment: number | null;
  activeAlerts: number;
  headcountAlertCount: number;
  sentimentAlertCount: number;
}) {
  const sentimentState = getSentimentState(avgSentiment);
  const circumference = 2 * Math.PI * 20;
  const progress = (count / PORTFOLIO_LIMIT) * circumference;
  const utilization = Math.round((count / PORTFOLIO_LIMIT) * 100);
  const avgPerCompany = count > 0 ? Math.round(totalHeadcount / count) : null;
  const alertsActive = activeAlerts > 0;

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:auto-rows-[minmax(9.5rem,auto)] md:grid-cols-12">
      <div className="dashboard-metric dashboard-metric-primary md:col-span-5 md:row-span-2 animate-fade-in-up animate-stagger-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="dashboard-kicker">Live risk</p>
            <h2 className="dashboard-copy mt-2 text-sm font-medium">Threat level</h2>
          </div>
          <Warning
            size={18}
            weight={alertsActive ? "fill" : "regular"}
            className={alertsActive ? "text-app-red" : "text-app-text-dim"}
          />
        </div>

        <div className="mt-6 flex items-end gap-4">
          <div
            className={`dashboard-data text-5xl font-semibold ${
              alertsActive ? "text-app-red" : "text-app-text"
            }`}
          >
            {activeAlerts}
          </div>
          <div className="pb-1">
            <div
              className={`dashboard-kicker ${alertsActive ? "text-app-red/80" : "text-app-text-dim"}`}
            >
              {alertsActive ? "Alerts open" : "Clear"}
            </div>
            <div className="dashboard-copy mt-1 text-sm">
              {alertsActive
                ? "Active monitoring is required"
                : "No active issues across the portfolio"}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className={headcountAlertCount > 0 ? "dashboard-chip dashboard-chip-negative" : "dashboard-chip dashboard-chip-neutral"}>
            {headcountAlertCount} headcount
          </span>
          <span className={sentimentAlertCount > 0 ? "dashboard-chip dashboard-chip-caution" : "dashboard-chip dashboard-chip-neutral"}>
            {sentimentAlertCount} sentiment
          </span>
          <span className="dashboard-chip dashboard-chip-neutral">
            {count > 0 ? `${Math.round((activeAlerts / count) * 100)}% of portfolio` : "No portfolio"}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="dashboard-subtle-surface rounded-2xl p-3">
            <div className="dashboard-kicker">Scan mode</div>
            <div className={`mt-2 text-sm font-semibold ${alertsActive ? "text-app-text" : "text-app-text-muted"}`}>
              {alertsActive ? "Monitoring" : "Idle"}
            </div>
          </div>
          <div className="dashboard-subtle-surface rounded-2xl p-3">
            <div className="dashboard-kicker">Active share</div>
            <div className="mt-2 text-sm font-semibold text-app-text">
              {utilization}% of capacity
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-metric md:col-span-3 animate-fade-in-up animate-stagger-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="dashboard-kicker">Portfolio</p>
            <h2 className="dashboard-copy mt-2 text-sm font-medium">Tracked companies</h2>
          </div>
          <Buildings size={16} className="text-app-text-dim" />
        </div>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <div className="dashboard-data text-4xl font-semibold">{count}</div>
            <div className="dashboard-copy mt-1 text-xs">of {PORTFOLIO_LIMIT} slots filled</div>
          </div>
          <div className="relative h-16 w-16 flex-shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 48 48">
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="4"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="var(--color-app-accent)"
                strokeWidth="4"
                strokeDasharray={`${progress} ${circumference}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-app-text">
              {count}
            </span>
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-app-border">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-app-accent-dim),var(--color-app-accent))]"
              style={{ width: `${utilization}%` }}
            />
          </div>
          <div className="dashboard-kicker flex items-center justify-between">
            <span>Utilization</span>
            <span>{utilization}%</span>
          </div>
        </div>
      </div>

      <div className="dashboard-metric md:col-span-4 animate-fade-in-up animate-stagger-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="dashboard-kicker">Total headcount</p>
            <h2 className="dashboard-copy mt-2 text-sm font-medium">Across all companies</h2>
          </div>
          <Users size={16} className="text-app-accent/50" />
        </div>
        <div className="dashboard-data mt-6 text-4xl font-semibold">
          {totalHeadcount > 0 ? totalHeadcount.toLocaleString() : "—"}
        </div>
        <div className="dashboard-copy mt-2 text-sm">
          {avgPerCompany !== null
            ? `${avgPerCompany.toLocaleString()} average per company`
            : "No headcount data yet"}
        </div>
      </div>

      <div className="dashboard-metric md:col-span-7 animate-fade-in-up animate-stagger-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="dashboard-kicker">Avg sentiment</p>
            <h2 className="dashboard-copy mt-2 text-sm font-medium">Signal health</h2>
          </div>
          <Pulse
            size={16}
            className={avgSentiment !== null ? sentimentState.tone : "text-app-text-dim"}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <div className={`dashboard-data text-4xl font-semibold ${sentimentState.tone}`}>
            {avgSentiment !== null ? avgSentiment.toFixed(0) : "—"}
          </div>
          <span
            className={
              avgSentiment === null
                ? "dashboard-chip dashboard-chip-neutral"
                : avgSentiment <= 40
                ? "dashboard-chip dashboard-chip-positive"
                : avgSentiment <= 70
                ? "dashboard-chip dashboard-chip-warning"
                : "dashboard-chip dashboard-chip-negative"
            }
          >
            {sentimentState.label}
          </span>
        </div>

        <div className="mt-5 space-y-2">
          {avgSentiment !== null && (
            <div className="h-2 overflow-hidden rounded-full bg-app-border">
              <div
                className={`h-full rounded-full transition-all ${sentimentState.fill}`}
                style={{ width: `${avgSentiment}%` }}
              />
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <div className="dashboard-subtle-surface dashboard-kicker rounded-2xl px-3 py-2 text-center">
              Calm
            </div>
            <div className="dashboard-subtle-surface dashboard-kicker rounded-2xl px-3 py-2 text-center">
              Mixed
            </div>
            <div className="dashboard-subtle-surface dashboard-kicker rounded-2xl px-3 py-2 text-center">
              Stressed
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChangePill({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="dashboard-data-muted text-xs">—</span>;
  const isPositive = pct >= 0;
  return (
    <span
      className={
        isPositive
          ? "dashboard-chip dashboard-chip-positive ml-auto"
          : "dashboard-chip dashboard-chip-negative ml-auto"
      }
    >
      {isPositive ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
      {isPositive ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}

function SentimentBar({ score }: { score: number | null }) {
  if (score === null) return <span className="dashboard-data-muted text-xs">—</span>;
  const sentimentState = getSentimentState(score);
  return (
    <span className="ml-auto flex items-center justify-end gap-2">
      <span className="h-2 w-16 flex-shrink-0 overflow-hidden rounded-full bg-app-border">
        <span className={`block h-full rounded-full ${sentimentState.bar}`} style={{ width: `${score}%` }} />
      </span>
      <span className={`text-xs font-medium tabular-nums ${sentimentState.tone}`}>
        {score.toFixed(0)}
      </span>
    </span>
  );
}

function AlertBadges({
  hasHeadcountAlert,
  hasSentimentAlert,
}: {
  hasHeadcountAlert: boolean;
  hasSentimentAlert: boolean;
}) {
  if (!hasHeadcountAlert && !hasSentimentAlert)
    return (
      <span className="dashboard-chip dashboard-chip-neutral ml-auto">
        Clear
      </span>
    );
  return (
    <div className="ml-auto flex flex-wrap justify-end gap-1">
      {hasHeadcountAlert && (
        <span className="dashboard-chip dashboard-chip-negative">
          <ArrowDown size={9} />
          HC
        </span>
      )}
      {hasSentimentAlert && (
        <span className="dashboard-chip dashboard-chip-caution">
          <Pulse size={9} />
          NEG
        </span>
      )}
    </div>
  );
}
