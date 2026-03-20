import { useLoaderData, useNavigate } from "react-router";
import { useState } from "react";
import { MagnifyingGlass, Plus, Check } from "@phosphor-icons/react";
import { useApi } from "../../shared/hooks/useApi.ts";
import type { Company, PortfolioCompany } from "../../shared/types.ts";

type LoaderData = {
  companies: Array<Company & { latestHeadcount: number | null }>;
  portfolio: PortfolioCompany[];
};

export default function CompaniesPage() {
  const { companies, portfolio } = useLoaderData() as LoaderData;
  const api = useApi();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [portfolioIds, setPortfolioIds] = useState<Set<string>>(
    new Set(portfolio.map((p) => p.id)),
  );
  const [loading, setLoading] = useState<string | null>(null);

  const filtered = search
    ? companies.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.industry.toLowerCase().includes(search.toLowerCase()),
      )
    : companies;

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
        if (portfolioIds.size >= 10) {
          alert("Portfolio limit reached (max 10)");
          return;
        }
        await api.post("/portfolio", { companyId });
        setPortfolioIds((prev) => new Set(prev).add(companyId));
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Companies</h1>
          <p className="text-sm text-white/50 mt-0.5">
            Browse and add companies to your portfolio
          </p>
        </div>
        <span className="text-sm text-white/50 glass-panel px-3 py-1.5 rounded-lg">
          {portfolioIds.size} / 10 in portfolio
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <MagnifyingGlass
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
        />
        <input
          type="text"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[var(--color-app-accent)]/50"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map((company) => {
          const inPortfolio = portfolioIds.has(company.id);
          const isLoading = loading === company.id;

          return (
            <div
              key={company.id}
              className="glass-panel rounded-xl p-4 hover:bg-white/5 transition-colors"
            >
              <div
                className="cursor-pointer"
                onClick={() => navigate(`/companies/${company.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-white text-sm leading-tight">{company.name}</h3>
                    <p className="text-xs text-[var(--color-app-accent)] mt-0.5">{company.industry}</p>
                  </div>
                </div>
                <div className="text-xs text-white/40 space-y-1 mt-3">
                  <div>{company.country}</div>
                  <div>{company.employeeRange} employees</div>
                  {company.latestHeadcount !== null && (
                    <div className="text-white/60">{company.latestHeadcount.toLocaleString()} headcount</div>
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
                    ? "bg-white/10 text-white/70 hover:bg-white/15"
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
        <div className="text-center py-12 text-white/40">No companies match your search.</div>
      )}
    </div>
  );
}
