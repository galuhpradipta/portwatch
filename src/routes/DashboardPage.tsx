import { useLoaderData, useNavigate, useRevalidator } from "react-router";
import { useState, type ReactNode } from "react";
import {
  CloudArrowDown,
  Check,
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
import PageSectionShell from "../components/PageSectionShell.tsx";
import MetricCard from "../components/MetricCard.tsx";
import DataTableShell from "../components/DataTableShell.tsx";

type SortKey = "name" | "headcount" | "change" | "sentiment";
type SortDir = "asc" | "desc";

type SimStep = { label: string; type: "scan" | "headcount" | "sentiment" | "done" };
type SimState = { steps: SimStep[]; currentIndex: number; exiting: boolean };

function buildSimSteps(companies: PortfolioCompany[]): SimStep[] {
  const steps: SimStep[] = [{ label: "Scanning portfolio...", type: "scan" }];
  for (const c of companies) {
    steps.push({ label: `Fetching ${c.name} headcount...`, type: "headcount" });
    steps.push({ label: `Analyzing ${c.name} sentiment...`, type: "sentiment" });
  }
  steps.push({ label: "Portfolio refresh complete!", type: "done" });
  return steps;
}

function formatNumber(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString();
}

function getSentimentState(score: number | null) {
  if (score === null) {
    return {
      label: "No signal",
      tone: "text-app-text-muted",
      bar: "bg-app-text-dim",
    };
  }

  if (score <= 40) {
    return {
      label: "Calm",
      tone: "text-app-green",
      bar: "bg-app-green",
    };
  }

  if (score <= 70) {
    return {
      label: "Watch",
      tone: "text-app-yellow",
      bar: "bg-app-yellow",
    };
  }

  return {
    label: "Stressed",
    tone: "text-app-red",
    bar: "bg-app-red",
  };
}

function formatCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

export default function DashboardPage() {
  const portfolio = useLoaderData() as PortfolioCompany[];
  const { revalidate } = useRevalidator();
  const api = useApi();
  const navigate = useNavigate();

  const [sim, setSim] = useState<SimState | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  async function handlePullData() {
    if (sim || portfolio.length === 0) return;
    const steps = buildSimSteps(portfolio);
    const stepDuration = Math.min(300, Math.max(80, 2500 / steps.length));

    setSim({ steps, currentIndex: 0, exiting: false });

    const apiPromise = api.post("/portfolio/check", {}).catch(() => {});

    const stepsPromise = new Promise<void>((resolve) => {
      let idx = 0;
      const timer = setInterval(() => {
        idx++;
        if (idx >= steps.length - 1) {
          clearInterval(timer);
          setSim((prev) => (prev ? { ...prev, currentIndex: steps.length - 1 } : null));
          resolve();
        } else {
          setSim((prev) => (prev ? { ...prev, currentIndex: idx } : null));
        }
      }, stepDuration);
    });

    await Promise.all([apiPromise, stepsPromise]);
    await new Promise<void>((resolve) => setTimeout(resolve, 400));

    setSim((prev) => (prev ? { ...prev, exiting: true } : null));
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    revalidate();
    setSim(null);
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
  const companiesWithHeadcount = portfolio.filter((c) => c.latestHeadcount !== null).length;
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
            Staffing and recent press signals across your tracked companies.
          </p>
        </div>
        <button
          onClick={handlePullData}
          disabled={!!sim || portfolio.length === 0}
          aria-busy={!!sim}
          className="dashboard-action flex items-center gap-2 px-4 py-2 text-sm"
        >
          <CloudArrowDown size={16} aria-hidden="true" className={sim ? "animate-pulse" : ""} />
          {sim ? "Pulling data..." : "Pull Latest Data"}
        </button>
      </div>

      {portfolio.length === 0 ? (
        <PageSectionShell className="dashboard-empty-state p-10 md:p-12">
          <div className="dashboard-empty-icon mx-auto mb-5 flex h-20 w-20 items-center justify-center" style={{ borderRadius: 'var(--radius-icon)' }}>
            <Buildings size={36} />
          </div>
          <p className="dashboard-kicker">Portfolio status</p>
          <h2 className="dashboard-title mt-3 text-2xl">Your portfolio is empty</h2>
          <p className="dashboard-copy mx-auto mt-3 max-w-[34ch] text-sm">
            Add a few tracked companies so the metrics and signal table can start reading as a live portfolio.
          </p>
          <button
            onClick={() => navigate("/companies")}
            className="dashboard-action mt-6 px-4 py-2 text-sm"
          >
            Browse Companies
          </button>
        </PageSectionShell>
      ) : (
        <>
          {/* Zone 1: Summary Stats */}
          <div
            className={sim ? "simulation-dimmed" : "sim-stats-wrapper"}
            style={{ transition: "opacity 300ms ease, filter 300ms ease" }}
          >
            <SummaryStats
              count={portfolio.length}
              totalHeadcount={totalHeadcount}
              headcountCoverageCount={companiesWithHeadcount}
              avgSentiment={avgSentiment}
              activeAlerts={activeAlerts.length}
              headcountAlertCount={headcountAlertCount}
              sentimentAlertCount={sentimentAlertCount}
            />
          </div>

          {/* Zone 2: Enhanced Portfolio Table */}
          <DataTableShell
            kicker="Portfolio table"
            description={
              <>
                {sorted.length} rows, sorted by{" "}
                {sortKey === "name"
                  ? "company"
                  : sortKey === "headcount"
                  ? "headcount"
                  : sortKey === "change"
                  ? "change"
                  : "sentiment"}
              </>
            }
            helper={<span className="hidden md:inline">Click a header to sort</span>}
          >
            <div className="relative">
            {sim && <SimulationOverlay sim={sim} />}
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-app-border-subtle">
              {sorted.map((company, index) => (
                <div
                  key={company.id}
                  className="dashboard-table-row group cursor-pointer px-4 py-4"
                  onClick={() => navigate(`/companies/${company.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/companies/${company.id}`); } }}
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <CompanyLogo
                        name={company.name}
                        logoStatus={company.logoStatus}
                        logoSrc={company.logoSrc}
                        size={32}
                        priority={index < 6}
                      />
                      <div className="min-w-0">
                        <div className="truncate dashboard-title text-base">{company.name}</div>
                        <div className="dashboard-company-meta mt-0.5">{company.industry} · {company.country}</div>
                      </div>
                    </div>
                    <AlertBadges hasHeadcountAlert={company.hasHeadcountAlert} hasSentimentAlert={company.hasSentimentAlert} />
                  </div>
                  <div className="mt-3 flex items-center gap-5 text-sm">
                    <div>
                      <div className="dashboard-company-meta text-[11px] mb-1">Headcount</div>
                      <span className="dashboard-data font-semibold tabular-nums text-sm">{formatNumber(company.latestHeadcount)}</span>
                    </div>
                    <div>
                      <div className="dashboard-company-meta text-[11px] mb-1">Change</div>
                      <ChangePill pct={company.headcountChangePercent} />
                    </div>
                    <div>
                      <div className="dashboard-company-meta text-[11px] mb-1">Sentiment</div>
                      <SentimentBar score={company.avgSentimentScore} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
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
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSort(key); } }}
                        tabIndex={0}
                        aria-sort={sortKey === key ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                      >
                        <span
                          className={`inline-flex items-center gap-1 ${
                            key === "name" ? "" : "justify-end"
                          }`}
                        >
                          {label}
                          {sortKey === key &&
                            (sortDir === "asc" ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />)}
                        </span>
                      </th>
                    ))}
                    <th className="dashboard-kicker px-5 py-3 text-right">Signals</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((company, index) => (
                    <tr
                      key={company.id}
                      className="dashboard-table-row group cursor-pointer"
                      onClick={() => navigate(`/companies/${company.id}`)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/companies/${company.id}`); } }}
                      tabIndex={0}
                    >
                      <td className="px-5 py-4 align-top">
                        <div className="flex min-w-0 items-center gap-3">
                          <CompanyLogo
                            name={company.name}
                            logoStatus={company.logoStatus}
                            logoSrc={company.logoSrc}
                            size={32}
                            priority={index < 6}
                          />
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
          </DataTableShell>
        </>
      )}
    </div>
  );
}

function SimulationOverlay({ sim }: { sim: SimState }) {
  const { steps, currentIndex, exiting } = sim;
  const progress = steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 100;
  const currentStep = steps[currentIndex];
  const completedSteps = steps.slice(0, currentIndex).reverse().slice(0, 4);

  return (
    <div
      className={`simulation-overlay${exiting ? " simulation-overlay-exit" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Pulling latest portfolio data"
    >
      <div className="simulation-progress">
        <div className="simulation-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="simulation-content">
        {currentStep && (
          <div key={currentStep.label} className="simulation-active-step">
            <span
              className={`simulation-dot${currentStep.type === "done" ? " simulation-dot-done" : ""}`}
              aria-hidden="true"
            />
            <span className="simulation-step-text">{currentStep.label}</span>
          </div>
        )}

        {completedSteps.length > 0 && (
          <div className="simulation-completed-list" aria-hidden="true">
            {completedSteps.map((step, i) => (
              <div
                key={step.label}
                className="simulation-completed-item"
                style={{ opacity: Math.max(0.25, 1 - i * 0.2) }}
              >
                <Check size={12} className="simulation-check" aria-hidden="true" />
                <span>{step.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryStats({
  count,
  totalHeadcount,
  headcountCoverageCount,
  avgSentiment,
  activeAlerts,
  headcountAlertCount,
  sentimentAlertCount,
}: {
  count: number;
  totalHeadcount: number;
  headcountCoverageCount: number;
  avgSentiment: number | null;
  activeAlerts: number;
  headcountAlertCount: number;
  sentimentAlertCount: number;
}) {
  const sentimentState = getSentimentState(avgSentiment);
  const avgPerCompany =
    headcountCoverageCount > 0 ? Math.round(totalHeadcount / headcountCoverageCount) : null;
  const alertsActive = activeAlerts > 0;
  const slotsOpen = Math.max(PORTFOLIO_LIMIT - count, 0);
  const watchlistSummary =
    slotsOpen === 0 ? "Watchlist is full." : slotsOpen === 1 ? "1 slot open." : `${slotsOpen} slots open.`;
  const headcountSummary =
    avgPerCompany !== null
      ? `Average ${formatNumber(avgPerCompany)} per company.`
      : "Headcount data is still coming in.";
  const sentimentSummary =
    avgSentiment !== null
      ? `${sentimentState.label} range. Higher scores indicate more risk.`
      : "No recent press signal yet.";

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
      <SummaryMetric
        title="Alerts"
        icon={
          <Warning
            size={16}
            weight={alertsActive ? "fill" : "regular"}
            className={alertsActive ? "text-app-red" : "text-app-text-dim"}
          />
        }
        value={
          <div className="dashboard-summary-value-group">
            <span className={`dashboard-summary-value ${alertsActive ? "text-app-red" : ""}`}>
              {activeAlerts}
            </span>
            <span className="dashboard-summary-value-note">
              {activeAlerts === 1 ? "company needs review" : "companies need review"}
            </span>
          </div>
        }
        description={
          alertsActive
            ? "Review headcount drops and negative press coverage."
            : "All tracked companies are clear right now."
        }
        footer={
          <>
            <span>{formatCount(headcountAlertCount, "headcount drop")}</span>
            <span>{formatCount(sentimentAlertCount, "negative press signal")}</span>
          </>
        }
        emphasized
        className="animate-fade-in-up animate-stagger-1"
      />

      <SummaryMetric
        title="Watchlist capacity"
        icon={<Buildings size={16} className="text-app-text-dim" />}
        value={
          <div className="dashboard-summary-value-group">
            <span className="dashboard-summary-value">
              {count} / {PORTFOLIO_LIMIT}
            </span>
          </div>
        }
        description={watchlistSummary}
        footer={
          <>
            <span>{formatCount(count, "company tracked", "companies tracked")}</span>
            <span>{formatCount(slotsOpen, "slot open", "slots open")}</span>
          </>
        }
        className="animate-fade-in-up animate-stagger-2"
      />

      <SummaryMetric
        title="Portfolio headcount"
        icon={<Users size={16} className="text-app-text-dim" />}
        value={
          <div className="dashboard-summary-value-group">
            <span className="dashboard-summary-value">
              {totalHeadcount > 0 ? totalHeadcount.toLocaleString() : "—"}
            </span>
          </div>
        }
        description={headcountSummary}
        footer={
          <span>
            {headcountCoverageCount === count
              ? `Across ${formatCount(count, "tracked company", "tracked companies")}`
              : `Data from ${headcountCoverageCount.toLocaleString()} of ${count.toLocaleString()} companies`}
          </span>
        }
        className="animate-fade-in-up animate-stagger-3"
      />

      <SummaryMetric
        title="Negative press score"
        icon={
          <Pulse
            size={16}
            className={avgSentiment !== null ? sentimentState.tone : "text-app-text-dim"}
          />
        }
        value={
          <div className="dashboard-summary-value-group">
            <span className={`dashboard-summary-value ${sentimentState.tone}`}>
              {avgSentiment !== null ? avgSentiment.toFixed(0) : "—"}
            </span>
            {avgSentiment !== null ? <span className="dashboard-summary-value-note">/ 100</span> : null}
          </div>
        }
        description={sentimentSummary}
        footer={
          <SentimentScale
            activeLabel={sentimentState.label}
            ariaLabel={
              avgSentiment !== null
                ? `Negative press score ${Math.round(avgSentiment)} in the ${sentimentState.label} range. Higher scores indicate more risk.`
                : "Negative press score unavailable. Thresholds are 0 to 40 calm, 41 to 70 watch, and 71 to 100 stressed."
            }
          />
        }
        className="animate-fade-in-up animate-stagger-4"
      />
    </div>
  );
}

function SummaryMetric({
  title,
  icon,
  value,
  description,
  footer,
  emphasized = false,
  className,
}: {
  title: string;
  icon: ReactNode;
  value: ReactNode;
  description: string;
  footer: ReactNode;
  emphasized?: boolean;
  className?: string;
}) {
  return (
    <MetricCard primary={emphasized} className={className}>
      <div className="dashboard-summary-card">
        <div className="dashboard-summary-head">
          <h2 className="dashboard-summary-title">{title}</h2>
          <span className="dashboard-summary-icon" aria-hidden="true">
            {icon}
          </span>
        </div>
        {value}
        <p className="dashboard-summary-copy">{description}</p>
        <div className="dashboard-summary-foot">{footer}</div>
      </div>
    </MetricCard>
  );
}

function SentimentScale({
  activeLabel,
  ariaLabel,
}: {
  activeLabel: string;
  ariaLabel: string;
}) {
  return (
    <div className="dashboard-sentiment-scale" role="img" aria-label={ariaLabel}>
      {[
        { label: "Calm", range: "0-40" },
        { label: "Watch", range: "41-70" },
        { label: "Stressed", range: "71-100" },
      ].map((item) => (
        <span
          key={item.label}
          className={`dashboard-sentiment-scale-item ${
            activeLabel === item.label
              ? `dashboard-sentiment-scale-item-active dashboard-sentiment-scale-item-${item.label.toLowerCase()}`
              : ""
          }`}
        >
          <span>{item.range}</span>
          <span>{item.label}</span>
        </span>
      ))}
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
      {isPositive ? <ArrowUp size={10} aria-hidden="true" /> : <ArrowDown size={10} aria-hidden="true" />}
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
      <span className="dashboard-progress-track h-2 w-16 flex-shrink-0 overflow-hidden bg-app-border">
        <span className={`dashboard-progress-fill block h-full ${sentimentState.bar}`} style={{ width: `${score}%` }} />
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
          <ArrowDown size={9} aria-hidden="true" />
          HC
        </span>
      )}
      {hasSentimentAlert && (
        <span className="dashboard-chip dashboard-chip-caution">
          <Pulse size={9} aria-hidden="true" />
          NEG
        </span>
      )}
    </div>
  );
}
