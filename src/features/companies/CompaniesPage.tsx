import { useLoaderData, useNavigate } from "react-router";
import { useState, useMemo } from "react";
import { MagnifyingGlass, Plus, Check, FunnelSimple, ArrowsDownUp } from "@phosphor-icons/react";
import { useApi } from "../../shared/hooks/useApi.ts";
import { PORTFOLIO_LIMIT } from "../../shared/config.ts";
import { useToastStore } from "../../shared/store/toastStore.ts";
import type { Company, PortfolioCompany } from "../../shared/types.ts";
import CompanyLogo from "../../components/CompanyLogo.tsx";

type LoaderData = {
  companies: Array<Company & { latestHeadcount: number | null }>;
  portfolio: PortfolioCompany[];
};

type SortOption = "name-asc" | "name-desc" | "headcount-desc" | "headcount-asc";

const SORT_LABELS: Record<SortOption, string> = {
  "name-asc": "Name A–Z",
  "name-desc": "Name Z–A",
  "headcount-desc": "Headcount ↓",
  "headcount-asc": "Headcount ↑",
};

export default function CompaniesPage() {
  const { companies, portfolio } = useLoaderData() as LoaderData;
  const api = useApi();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");
  const [portfolioIds, setPortfolioIds] = useState<Set<string>>(
    new Set(portfolio.map((p) => p.id)),
  );
  const [loading, setLoading] = useState<string | null>(null);

  // Unique filter options derived from data
  const industries = useMemo(
    () => [...new Set(companies.map((c) => c.industry).filter(Boolean))].sort(),
    [companies],
  );
  const countries = useMemo(
    () => [...new Set(companies.map((c) => c.country).filter(Boolean))].sort(),
    [companies],
  );

  const filtered = useMemo(() => {
    let result = companies;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q),
      );
    }
    if (industryFilter) result = result.filter((c) => c.industry === industryFilter);
    if (countryFilter) result = result.filter((c) => c.country === countryFilter);

    result = [...result].sort((a, b) => {
      if (sortOption === "name-asc") return a.name.localeCompare(b.name);
      if (sortOption === "name-desc") return b.name.localeCompare(a.name);
      if (sortOption === "headcount-desc")
        return (b.latestHeadcount ?? -1) - (a.latestHeadcount ?? -1);
      if (sortOption === "headcount-asc")
        return (a.latestHeadcount ?? -1) - (b.latestHeadcount ?? -1);
      return 0;
    });

    return result;
  }, [companies, search, industryFilter, countryFilter, sortOption]);

  async function togglePortfolio(companyId: string) {
    setLoading(companyId);
    try {
      if (portfolioIds.has(companyId)) {
        await api.del(`/portfolio/${companyId}`);
        setPortfolioIds((prev) => {
          const next = new Set(prev);
          next.delete(companyId);
          return next;
        });
      } else {
        if (portfolioIds.size >= PORTFOLIO_LIMIT) {
          useToastStore.getState().addToast(
            `Portfolio limit reached (max ${PORTFOLIO_LIMIT})`,
            "error",
          );
          return;
        }
        await api.post("/portfolio", { companyId });
        setPortfolioIds((prev) => new Set(prev).add(companyId));
      }
    } finally {
      setLoading(null);
    }
  }

  const portfolioData = useMemo(
    () => new Map(portfolio.map((p) => [p.id, p])),
    [portfolio],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-app-text">Companies</h1>
          <p className="text-sm text-app-text-muted mt-0.5">
            Browse and add companies to your portfolio
          </p>
        </div>
        <span className="text-sm text-app-text-muted card-panel px-3 py-1.5 rounded-lg tabular-nums">
          {portfolioIds.size} / {PORTFOLIO_LIMIT} in portfolio
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <MagnifyingGlass
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-dim"
        />
        <input
          type="text"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-app-surface border border-app-border rounded-lg pl-9 pr-4 py-2 text-sm text-app-text placeholder:text-app-text-dim focus:outline-none focus:border-[var(--color-app-accent)]/50 transition-colors"
        />
      </div>

      {/* Filter/Sort row */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <FunnelSimple size={14} className="text-app-text-dim flex-shrink-0" />
        <select
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          className="bg-app-surface border border-app-border rounded-lg px-3 py-1.5 text-xs text-app-text focus:outline-none focus:border-[var(--color-app-accent)]/50 transition-colors"
        >
          <option value="">All industries</option>
          {industries.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>
        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="bg-app-surface border border-app-border rounded-lg px-3 py-1.5 text-xs text-app-text focus:outline-none focus:border-[var(--color-app-accent)]/50 transition-colors"
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1 ml-auto">
          <ArrowsDownUp size={14} className="text-app-text-dim" />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="bg-app-surface border border-app-border rounded-lg px-3 py-1.5 text-xs text-app-text focus:outline-none focus:border-[var(--color-app-accent)]/50 transition-colors"
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
              <option key={opt} value={opt}>
                {SORT_LABELS[opt]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid — 6-col on lg; portfolio cards span 3, non-portfolio span 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 grid-flow-dense">
        {filtered.map((company, index) => {
          const inPortfolio = portfolioIds.has(company.id);
          const isLoading = loading === company.id;
          const pData = portfolioData.get(company.id);
          const staggerClass =
            index < 10 ? `card-stagger-${index + 1}` : "card-stagger-n";

          return (
            <div
              key={company.id}
              className={`card-panel rounded-xl p-4 hover:bg-app-surface-hover transition-colors animate-fade-in-up ${staggerClass} ${
                inPortfolio
                  ? "lg:col-span-3 card-portfolio"
                  : "lg:col-span-2"
              }`}
            >
              <div
                className="cursor-pointer"
                onClick={() => navigate(`/companies/${company.id}`)}
              >
                <div className="flex items-start gap-3 mb-2">
                  <CompanyLogo
                    name={company.name}
                    website={company.website}
                    size={inPortfolio ? 40 : 32}
                  />
                  <div className="min-w-0 flex-1">
                    <h3
                      className={`font-semibold text-app-text leading-tight ${
                        inPortfolio ? "text-base" : "text-sm"
                      }`}
                    >
                      {company.name}
                    </h3>
                    <p className="text-xs text-app-text-muted mt-0.5">{company.industry}</p>
                  </div>
                </div>
                <div className="text-xs text-app-text-dim space-y-1 mt-3">
                  <div>{company.country}</div>
                  <div>{company.employeeRange} employees</div>
                  {company.latestHeadcount !== null && (
                    <div className="text-app-text-muted tabular-nums">
                      {company.latestHeadcount.toLocaleString()} headcount
                    </div>
                  )}
                  {/* Extra data for portfolio companies */}
                  {inPortfolio && pData && (
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-app-border-subtle">
                      {pData.headcountChangePercent !== null && (
                        <span
                          className={`text-xs font-semibold tabular-nums ${
                            pData.headcountChangePercent >= 0
                              ? "text-app-green"
                              : "text-app-red"
                          }`}
                        >
                          {pData.headcountChangePercent >= 0 ? "+" : ""}
                          {pData.headcountChangePercent.toFixed(1)}%
                        </span>
                      )}
                      {pData.avgSentimentScore !== null && (
                        <span className="text-xs text-app-text-muted tabular-nums">
                          Sentiment:{" "}
                          <span
                            className={
                              pData.avgSentimentScore <= 30
                                ? "text-app-green"
                                : pData.avgSentimentScore <= 60
                                ? "text-app-yellow"
                                : "text-app-red"
                            }
                          >
                            {pData.avgSentimentScore.toFixed(0)}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePortfolio(company.id);
                }}
                disabled={isLoading}
                className={`mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  inPortfolio
                    ? "btn-ghost"
                    : "bg-[var(--color-app-accent)]/20 text-[var(--color-app-accent)] hover:bg-[var(--color-app-accent)]/30"
                } disabled:opacity-50`}
              >
                {inPortfolio ? (
                  <>
                    <Check size={12} /> Added
                  </>
                ) : (
                  <>
                    <Plus size={12} /> Add to Portfolio
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-app-text-dim">
          No companies match your search.
        </div>
      )}
    </div>
  );
}
