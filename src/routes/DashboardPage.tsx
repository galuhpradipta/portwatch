import { useLoaderData, useNavigate, useRevalidator } from "react-router";
import { useState } from "react";
import { ArrowsClockwise, ArrowUp, ArrowDown, Buildings, Warning } from "@phosphor-icons/react";
import { useApi } from "../shared/hooks/useApi.ts";
import type { PortfolioCompany } from "../shared/types.ts";

type SortKey = "name" | "headcount" | "change" | "sentiment";
type SortDir = "asc" | "desc";

function formatNumber(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString();
}

function formatChange(pct: number | null): string {
  if (pct === null) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
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

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Portfolio</h1>
          <p className="text-sm text-white/50 mt-0.5">{portfolio.length} / 10 companies</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || portfolio.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-app-accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <ArrowsClockwise size={16} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh All"}
        </button>
      </div>

      {portfolio.length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center">
          <Buildings size={48} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/60 mb-4">Your portfolio is empty</p>
          <button
            onClick={() => navigate("/companies")}
            className="px-4 py-2 rounded-lg bg-[var(--color-app-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Browse Companies
          </button>
        </div>
      ) : (
        <div className="glass-panel rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/50">
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
                    className="px-4 py-3 text-left font-medium cursor-pointer hover:text-white/80 select-none"
                    onClick={() => handleSort(key)}
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      {sortKey === key && (
                        sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      )}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((company) => {
                const changeColor =
                  company.headcountChangePercent === null
                    ? "text-white/50"
                    : company.headcountChangePercent < 0
                    ? "text-red-400"
                    : "text-green-400";

                return (
                  <tr
                    key={company.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => navigate(`/companies/${company.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{company.name}</div>
                      <div className="text-xs text-white/40 mt-0.5">{company.industry}</div>
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      {formatNumber(company.latestHeadcount)}
                    </td>
                    <td className={`px-4 py-3 font-medium ${changeColor}`}>
                      {formatChange(company.headcountChangePercent)}
                    </td>
                    <td className="px-4 py-3">
                      <SentimentDot score={company.avgSentimentScore} />
                    </td>
                    <td className="px-4 py-3">
                      <AlertBadges
                        hasHeadcountAlert={company.hasHeadcountAlert}
                        hasSentimentAlert={company.hasSentimentAlert}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SentimentDot({ score }: { score: number | null }) {
  if (score === null) return <span className="text-white/30">—</span>;
  const color =
    score <= 30
      ? "bg-green-500"
      : score <= 60
      ? "bg-yellow-500"
      : score <= 80
      ? "bg-orange-500"
      : "bg-red-500";
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      <span className="text-white/60">{score.toFixed(0)}</span>
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
  if (!hasHeadcountAlert && !hasSentimentAlert) return <span className="text-white/20">—</span>;
  return (
    <div className="flex gap-1">
      {hasHeadcountAlert && (
        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium flex items-center gap-1">
          <Warning size={10} />
          Headcount
        </span>
      )}
      {hasSentimentAlert && (
        <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-medium flex items-center gap-1">
          <Warning size={10} />
          Sentiment
        </span>
      )}
    </div>
  );
}
