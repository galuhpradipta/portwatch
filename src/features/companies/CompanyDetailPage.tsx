import { useLoaderData, useNavigate } from "react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Minus, Globe, MapPin } from "@phosphor-icons/react";
import { useApi } from "../../shared/hooks/useApi.ts";
import HeadcountChart from "./HeadcountChart.tsx";
import SentimentBadge from "../../components/SentimentBadge.tsx";
import type { Company, HeadcountSnapshot, NewsArticle } from "../../shared/types.ts";

type CompanyDetail = Company & {
  snapshots: HeadcountSnapshot[];
  news: NewsArticle[];
};

type LoaderData = {
  company: CompanyDetail;
  portfolio: { id: string }[];
};

export default function CompanyDetailPage() {
  const { company, portfolio } = useLoaderData() as LoaderData;
  const api = useApi();
  const navigate = useNavigate();

  const [inPortfolio, setInPortfolio] = useState(
    portfolio.some((p) => p.id === company.id),
  );
  const [loading, setLoading] = useState(false);

  async function togglePortfolio() {
    setLoading(true);
    try {
      if (inPortfolio) {
        await api.del(`/portfolio/${company.id}`);
        setInPortfolio(false);
      } else {
        await api.post("/portfolio", { companyId: company.id });
        setInPortfolio(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-app-text-muted hover:text-app-text mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Company header */}
      <div className="card-panel rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-app-text">{company.name}</h1>
            <p className="text-[var(--color-app-accent)] text-sm mt-1">{company.industry}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-app-text-muted">
              {company.country && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {company.country}
                </span>
              )}
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-app-text transition-colors"
                >
                  <Globe size={14} />
                  Website
                </a>
              )}
              {company.employeeRange && (
                <span>{company.employeeRange} employees</span>
              )}
            </div>
          </div>
          <button
            onClick={togglePortfolio}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              inPortfolio
                ? "bg-gray-100 text-app-text-muted hover:bg-gray-200"
                : "bg-[var(--color-app-accent)] text-white hover:opacity-90"
            }`}
          >
            {inPortfolio ? (
              <>
                <Minus size={16} /> Remove from Portfolio
              </>
            ) : (
              <>
                <Plus size={16} /> Add to Portfolio
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Chart — takes 2 columns */}
        <div className="col-span-2 card-panel rounded-xl p-6">
          <h2 className="text-sm font-medium text-app-text-muted mb-4">Headcount History</h2>
          <HeadcountChart snapshots={company.snapshots} />
        </div>

        {/* Latest headcount stat */}
        <div className="card-panel rounded-xl p-6 flex flex-col gap-4">
          <div>
            <p className="text-xs text-app-text-muted mb-1">Latest Headcount</p>
            <p className="text-3xl font-bold text-app-text">
              {company.snapshots.length > 0
                ? company.snapshots[company.snapshots.length - 1].headcount.toLocaleString()
                : "—"}
            </p>
          </div>
          {company.snapshots.length >= 2 && (() => {
            const latest = company.snapshots[company.snapshots.length - 1].headcount;
            const prev = company.snapshots[company.snapshots.length - 2].headcount;
            const pct = ((latest - prev) / prev) * 100;
            const color = pct < 0 ? "text-app-red" : "text-app-green";
            return (
              <div>
                <p className="text-xs text-app-text-muted mb-1">vs Previous Month</p>
                <p className={`text-lg font-semibold ${color}`}>
                  {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
                </p>
              </div>
            );
          })()}
          <div>
            <p className="text-xs text-app-text-muted mb-1">Snapshots</p>
            <p className="text-lg font-semibold text-app-text-muted">{company.snapshots.length} months</p>
          </div>
        </div>
      </div>

      {/* News feed */}
      <div className="card-panel rounded-xl p-6 mt-6">
        <h2 className="text-sm font-medium text-app-text-muted mb-4">News & Sentiment</h2>
        {company.news.length === 0 ? (
          <p className="text-app-text-dim text-sm">No news available.</p>
        ) : (
          <div className="space-y-3">
            {company.news.map((article) => (
              <div
                key={article.id}
                className="flex items-start justify-between gap-4 py-3 border-b border-app-border-subtle last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-app-text hover:text-app-accent line-clamp-2 transition-colors"
                  >
                    {article.title}
                  </a>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-app-text-dim">
                    <span>{article.sourceName}</span>
                    <span>·</span>
                    <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <SentimentBadge score={article.sentimentScore} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
