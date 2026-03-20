import { useLoaderData, useNavigate, useRevalidator } from "react-router";
import { useState } from "react";
import { ArrowsClockwise, ArrowUp, ArrowDown, Buildings, Warning, Users, Pulse } from "@phosphor-icons/react";
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

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-app-text">Portfolio</h1>
          <p className="text-sm text-app-text-muted mt-0.5">
            {portfolio.length} / {PORTFOLIO_LIMIT} companies
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || portfolio.length === 0}
          className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
        >
          <ArrowsClockwise size={16} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh All"}
        </button>
      </div>

      {portfolio.length === 0 ? (
        <div className="card-panel rounded-xl p-12 text-center">
          <Buildings size={48} className="text-app-text-dim mx-auto mb-4" />
          <p className="text-app-text-muted mb-4">Your portfolio is empty</p>
          <button
            onClick={() => navigate("/companies")}
            className="btn-primary px-4 py-2 rounded-lg text-sm"
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
          />

          {/* Zone 2: Alerts Panel (conditional) */}
          {activeAlerts.length > 0 && (
            <AlertsPanel
              alerts={activeAlerts}
              onNavigate={(id) => navigate(`/companies/${id}`)}
            />
          )}

          {/* Zone 3: Enhanced Portfolio Table */}
          <div className="card-panel rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b border-app-border">
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
                      className="px-5 py-3 text-left text-xs font-semibold text-app-text-muted cursor-pointer hover:text-app-text select-none transition-colors"
                      onClick={() => handleSort(key)}
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        {sortKey === key &&
                          (sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                      </span>
                    </th>
                  ))}
                  <th className="px-5 py-3 text-left text-xs font-semibold text-app-text-muted">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((company) => (
                  <tr
                    key={company.id}
                    className="border-b border-app-border-subtle last:border-0 hover:bg-app-surface-hover cursor-pointer transition-colors"
                    onClick={() => navigate(`/companies/${company.id}`)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <CompanyLogo name={company.name} website={company.website} size={28} />
                        <div>
                          <div className="font-semibold text-app-text">{company.name}</div>
                          <div className="text-xs font-medium text-app-text-muted mt-0.5">
                            {company.industry}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-bold tabular-nums text-app-text">
                      {formatNumber(company.latestHeadcount)}
                    </td>
                    <td className="px-5 py-4">
                      <ChangePill pct={company.headcountChangePercent} />
                    </td>
                    <td className="px-5 py-4">
                      <SentimentBar score={company.avgSentimentScore} />
                    </td>
                    <td className="px-5 py-4">
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
}: {
  count: number;
  totalHeadcount: number;
  avgSentiment: number | null;
  activeAlerts: number;
}) {
  const sentimentColor =
    avgSentiment === null
      ? "text-app-text-muted"
      : avgSentiment <= 40
      ? "text-app-green"
      : avgSentiment <= 70
      ? "text-app-yellow"
      : "text-app-red";

  // Progress ring geometry (r=20, circumference ≈ 125.7)
  const circumference = 2 * Math.PI * 20;
  const progress = (count / PORTFOLIO_LIMIT) * circumference;

  const alertsActive = activeAlerts > 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* Portfolio Count — progress ring */}
      <div className="stat-card card-panel-subtle rounded-xl p-4 animate-fade-in-up animate-stagger-1">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs text-app-text-muted font-medium">Portfolio</span>
          <Buildings size={16} className="text-app-text-dim" />
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
              <circle
                cx="24" cy="24" r="20"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="4"
              />
              <circle
                cx="24" cy="24" r="20"
                fill="none"
                stroke="var(--color-app-accent)"
                strokeWidth="4"
                strokeDasharray={`${progress} ${circumference}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-app-text">
              {count}
            </span>
          </div>
          <div>
            <div className="text-xl font-extrabold text-app-text tabular-nums">
              / {PORTFOLIO_LIMIT}
            </div>
            <div className="text-xs text-app-text-muted">companies</div>
          </div>
        </div>
      </div>

      {/* Total Headcount */}
      <div className="stat-card card-panel-subtle rounded-xl p-4 animate-fade-in-up animate-stagger-2">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs text-app-text-muted font-medium">Total Headcount</span>
          <Users size={16} className="text-app-accent/50" />
        </div>
        <div className="text-2xl font-extrabold text-app-text tabular-nums">
          {totalHeadcount > 0 ? totalHeadcount.toLocaleString() : "—"}
        </div>
        <div className="text-xs text-app-text-muted mt-1">across all companies</div>
      </div>

      {/* Avg Sentiment */}
      <div className="stat-card card-panel-subtle rounded-xl p-4 animate-fade-in-up animate-stagger-3">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs text-app-text-muted font-medium">Avg Sentiment</span>
          <Pulse size={16} className={avgSentiment !== null ? sentimentColor : "text-app-text-dim"} />
        </div>
        <div className={`text-2xl font-extrabold tabular-nums ${sentimentColor}`}>
          {avgSentiment !== null ? avgSentiment.toFixed(0) : "—"}
        </div>
        <div className="mt-2">
          {avgSentiment !== null && (
            <div className="w-full h-1.5 rounded-full bg-app-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  avgSentiment <= 40 ? "bg-green-500" : avgSentiment <= 70 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${avgSentiment}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Active Alerts — red-tinted when active */}
      <div
        className={`stat-card rounded-xl p-4 animate-fade-in-up animate-stagger-4 transition-colors ${
          alertsActive
            ? "card-panel-elevated bg-red-500/5 border border-red-500/20"
            : "card-panel-subtle"
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs text-app-text-muted font-medium">Active Alerts</span>
          <Warning
            size={16}
            weight={alertsActive ? "fill" : "regular"}
            className={alertsActive ? "text-app-red" : "text-app-text-dim"}
          />
        </div>
        <div
          className={`text-2xl font-extrabold tabular-nums ${
            alertsActive ? "text-app-red" : "text-app-text"
          }`}
        >
          {activeAlerts}
        </div>
        <div className="text-xs text-app-text-muted mt-1">
          {alertsActive ? `${activeAlerts} compan${activeAlerts === 1 ? "y needs" : "ies need"} attention` : "All clear"}
        </div>
      </div>
    </div>
  );
}

function AlertsPanel({
  alerts,
  onNavigate,
}: {
  alerts: PortfolioCompany[];
  onNavigate: (id: string) => void;
}) {
  return (
    <div className="card-panel-elevated rounded-xl p-5 mb-6">
      <h2 className="text-sm font-semibold text-app-text-muted mb-3">
        Active alerts
      </h2>
      <div className="space-y-1">
        {alerts.map((company) => (
          <div
            key={company.id}
            className="alert-row flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-app-surface-raised cursor-pointer transition-colors"
            onClick={() => onNavigate(company.id)}
          >
            <span className="font-semibold text-app-text text-sm">{company.name}</span>
            <div className="flex items-center gap-2">
              {company.hasHeadcountAlert && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-app-red text-xs font-medium flex items-center gap-1">
                  <Warning size={10} />
                  Headcount
                  {company.headcountChangePercent !== null &&
                    ` ${company.headcountChangePercent >= 0 ? "+" : ""}${company.headcountChangePercent.toFixed(1)}%`}
                </span>
              )}
              {company.hasSentimentAlert && (
                <span className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-app-orange text-xs font-medium flex items-center gap-1">
                  <Warning size={10} />
                  Sentiment
                  {company.avgSentimentScore !== null &&
                    ` ${company.avgSentimentScore.toFixed(0)}`}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChangePill({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-app-text-dim">—</span>;
  const isPositive = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
        isPositive ? "bg-green-500/10 text-app-green" : "bg-red-500/10 text-app-red"
      }`}
    >
      {isPositive ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
      {isPositive ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}

function SentimentBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-app-text-dim">—</span>;
  const gradientStyle =
    score <= 30
      ? "bg-green-500"
      : score <= 60
      ? "bg-yellow-500"
      : score <= 80
      ? "bg-orange-500"
      : "bg-red-500";
  return (
    <span className="flex items-center gap-2">
      <span className="w-16 h-2 rounded-full bg-app-border overflow-hidden flex-shrink-0">
        <span
          className={`h-full rounded-full block ${gradientStyle}`}
          style={{ width: `${score}%` }}
        />
      </span>
      <span className="text-app-text-muted text-xs tabular-nums font-medium">
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
    return <span className="text-app-text-dim">—</span>;
  return (
    <div className="flex gap-1 flex-wrap">
      {hasHeadcountAlert && (
        <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-app-red text-xs font-medium flex items-center gap-1">
          <Warning size={10} />
          Headcount
        </span>
      )}
      {hasSentimentAlert && (
        <span className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-app-orange text-xs font-medium flex items-center gap-1">
          <Warning size={10} />
          Sentiment
        </span>
      )}
    </div>
  );
}
