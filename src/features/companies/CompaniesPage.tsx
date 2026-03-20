import { useLoaderData, useNavigate } from "react-router";
import { useMemo, useState } from "react";
import {
  MagnifyingGlass,
  Plus,
  Check,
  FunnelSimple,
  ArrowUp,
  ArrowDown,
  Buildings,
} from "@phosphor-icons/react";
import { useApi } from "../../shared/hooks/useApi.ts";
import { PORTFOLIO_LIMIT } from "../../shared/config.ts";
import { useToastStore } from "../../shared/store/toastStore.ts";
import type { Company, PortfolioCompany } from "../../shared/types.ts";
import CompanyLogo from "../../components/CompanyLogo.tsx";
import MetricCard from "../../components/MetricCard.tsx";
import DataTableShell from "../../components/DataTableShell.tsx";

type LoaderData = {
  companies: Array<Company & { latestHeadcount: number | null }>;
  portfolio: PortfolioCompany[];
};

type SortKey = "name" | "headcount" | "status";
type SortDir = "asc" | "desc";

function formatNumber(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString();
}

export default function CompaniesPage() {
  const { companies, portfolio } = useLoaderData() as LoaderData;
  const api = useApi();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [portfolioIds, setPortfolioIds] = useState<Set<string>>(
    new Set(portfolio.map((p) => p.id)),
  );
  const [loading, setLoading] = useState<string | null>(null);

  const industries = useMemo(
    () => [...new Set(companies.map((c) => c.industry).filter(Boolean))].sort(),
    [companies],
  );
  const countries = useMemo(
    () => [...new Set(companies.map((c) => c.country).filter(Boolean))].sort(),
    [companies],
  );

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDir(key === "headcount" ? "desc" : "asc");
  }

  const filtered = useMemo(() => {
    let result = companies;

    if (search) {
      const query = search.toLowerCase();
      result = result.filter(
        (company) =>
          company.name.toLowerCase().includes(query) ||
          company.industry.toLowerCase().includes(query),
      );
    }

    if (industryFilter) {
      result = result.filter((company) => company.industry === industryFilter);
    }

    if (countryFilter) {
      result = result.filter((company) => company.country === countryFilter);
    }

    return [...result].sort((a, b) => {
      let comparison = 0;

      if (sortKey === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortKey === "headcount") {
        comparison = (a.latestHeadcount ?? -1) - (b.latestHeadcount ?? -1);
      } else {
        comparison = Number(portfolioIds.has(a.id)) - Number(portfolioIds.has(b.id));
        if (comparison === 0) {
          comparison = a.name.localeCompare(b.name);
        }
      }

      return sortDir === "asc" ? comparison : -comparison;
    });
  }, [companies, search, industryFilter, countryFilter, sortKey, sortDir, portfolioIds]);

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
        return;
      }

      if (portfolioIds.size >= PORTFOLIO_LIMIT) {
        useToastStore.getState().addToast(
          `Portfolio limit reached (max ${PORTFOLIO_LIMIT})`,
          "error",
        );
        return;
      }

      await api.post("/portfolio", { companyId });
      setPortfolioIds((prev) => new Set(prev).add(companyId));
    } finally {
      setLoading(null);
    }
  }

  const portfolioCount = portfolioIds.size;
  const portfolioShare =
    companies.length > 0 ? Math.round((portfolioCount / companies.length) * 100) : 0;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="dashboard-kicker">Watchlist directory</p>
          <h1 className="dashboard-title text-2xl">Companies</h1>
          <p className="dashboard-copy text-sm">
            Browse the full company universe and add only what belongs in the portfolio.
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetricCard className="companies-summary-card companies-summary-primary">
          <div className="dashboard-metric-meta">
            <span className="dashboard-kicker">Portfolio</span>
            <span className="dashboard-data-muted text-xs">{portfolioShare}% tracked</span>
          </div>
          <div className="dashboard-data mt-3 text-2xl">
            {portfolioCount} / {PORTFOLIO_LIMIT}
          </div>
          <p className="dashboard-copy mt-2 text-sm">Current companies in the active watchlist.</p>
        </MetricCard>

        <MetricCard className="companies-summary-card">
          <div className="dashboard-metric-meta">
            <span className="dashboard-kicker">Visible</span>
            <span className="dashboard-data-muted text-xs">Filtered list</span>
          </div>
          <div className="dashboard-data mt-3 text-2xl">{filtered.length}</div>
          <p className="dashboard-copy mt-2 text-sm">Rows that match the current search and filters.</p>
        </MetricCard>

        <MetricCard className="companies-summary-card">
          <div className="dashboard-metric-meta">
            <span className="dashboard-kicker">Coverage</span>
            <span className="dashboard-data-muted text-xs">Universe size</span>
          </div>
          <div className="dashboard-data mt-3 text-2xl">{companies.length}</div>
          <p className="dashboard-copy mt-2 text-sm">Total companies available to review and track.</p>
        </MetricCard>
      </div>

      <DataTableShell
        kicker="Filter desk"
        description="Search by company or industry, then refine by sector and country."
        helper="Use column headers to sort the list."
        className="companies-compact-shell"
        toolbar={
          <div className="companies-filter-grid">
            <label className="relative block">
              <MagnifyingGlass
                size={15}
                className="companies-toolbar-icon absolute left-3 top-1/2 -translate-y-1/2"
              />
              <input
                type="text"
                placeholder="Search company or industry"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="companies-compact-control companies-compact-search surface-square"
              />
            </label>

            <label className="relative block">
              <FunnelSimple
                size={14}
                className="companies-select-icon absolute right-3 top-1/2 -translate-y-1/2"
              />
              <select
                value={industryFilter}
                onChange={(event) => setIndustryFilter(event.target.value)}
                className="companies-compact-control companies-compact-select surface-square"
              >
                <option value="">All industries</option>
                {industries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </label>

            <label className="relative block">
              <FunnelSimple
                size={14}
                className="companies-select-icon absolute right-3 top-1/2 -translate-y-1/2"
              />
              <select
                value={countryFilter}
                onChange={(event) => setCountryFilter(event.target.value)}
                className="companies-compact-control companies-compact-select surface-square"
              >
                <option value="">All countries</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
      >

        {filtered.length === 0 ? (
          <div className="dashboard-panel dashboard-empty-state companies-empty-panel px-6 py-10 md:px-10 md:py-12">
            <div className="dashboard-empty-icon companies-empty-icon-compact surface-square mx-auto mb-5 flex items-center justify-center">
              <Buildings size={34} />
            </div>
            <p className="dashboard-kicker">No match</p>
            <h2 className="dashboard-title mt-3 text-2xl">No companies match your search</h2>
            <p className="dashboard-copy mx-auto mt-3 max-w-[34ch] text-sm">
              Reset the filters or widen the search terms to bring the list back.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="dashboard-table companies-table w-full min-w-[720px] table-fixed text-sm">
                <colgroup>
                  <col style={{ width: "48%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "18%" }} />
                </colgroup>
                <thead>
                  <tr className="dashboard-table-head border-b dashboard-divider">
                    {(
                      [
                        { key: "name" as SortKey, label: "Company", align: "text-left" },
                        { key: "headcount" as SortKey, label: "Headcount", align: "text-right" },
                        { key: "status" as SortKey, label: "Status", align: "text-right" },
                      ] as const
                    ).map(({ key, label, align }) => (
                      <th
                        key={key}
                        onClick={() => handleSort(key)}
                        className={`companies-table-sort dashboard-kicker px-4 py-3 select-none transition-colors hover:text-app-text md:px-5 ${align}`}
                      >
                        <span
                          className={`inline-flex items-center gap-1 ${
                            align === "text-left" ? "" : "justify-end"
                          }`}
                        >
                          {label}
                          {sortKey === key &&
                            (sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                        </span>
                      </th>
                    ))}
                    <th className="dashboard-kicker px-4 py-3 text-right md:px-5">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((company) => {
                    const inPortfolio = portfolioIds.has(company.id);
                    const isLoading = loading === company.id;

                    return (
                      <tr
                        key={company.id}
                        className="dashboard-table-row companies-table-row group"
                      >
                        <td
                          className="cursor-pointer px-4 py-3 align-middle md:px-5"
                          onClick={() => navigate(`/companies/${company.id}`)}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <CompanyLogo name={company.name} website={company.website} size={30} />
                            <div className="min-w-0">
                              <div className="truncate dashboard-title text-[15px]">
                                {company.name}
                              </div>
                              <div className="dashboard-company-meta mt-1 truncate">
                                {company.industry} · {company.country}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right align-middle md:px-5">
                          <span className="dashboard-data text-base">
                            {formatNumber(company.latestHeadcount)}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right align-middle md:px-5">
                          <span
                            className={`dashboard-chip dashboard-chip-compact surface-square ${
                              inPortfolio
                                ? "dashboard-chip-positive"
                                : "dashboard-chip-neutral"
                            }`}
                          >
                            {inPortfolio ? "Tracked" : "Available"}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right align-middle md:px-5">
                          <button
                            onClick={() => togglePortfolio(company.id)}
                            disabled={isLoading}
                            className={`companies-inline-action surface-square ${
                              inPortfolio
                                ? "companies-inline-action-secondary"
                                : "companies-inline-action-primary"
                            }`}
                          >
                            {inPortfolio ? (
                              <>
                                <Check size={12} /> Added
                              </>
                            ) : (
                              <>
                                <Plus size={12} /> Add
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
            </table>
          </div>
        )}
      </DataTableShell>
    </div>
  );
}
