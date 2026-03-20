import { useLoaderData } from "react-router";
import { useState } from "react";
import { Plus, Minus, Globe, MapPin } from "@phosphor-icons/react";
import { useApi } from "../../shared/hooks/useApi.ts";
import HeadcountChart from "./HeadcountChart.tsx";
import SentimentBadge from "../../components/SentimentBadge.tsx";
import CompanyLogo from "../../components/CompanyLogo.tsx";
import Breadcrumbs from "../../components/Breadcrumbs.tsx";
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

  const latestHeadcount =
    company.snapshots.length > 0
      ? company.snapshots[company.snapshots.length - 1].headcount
      : null;

  const prevHeadcount =
    company.snapshots.length >= 2
      ? company.snapshots[company.snapshots.length - 2].headcount
      : null;

  const changePercent =
    latestHeadcount !== null && prevHeadcount !== null
      ? ((latestHeadcount - prevHeadcount) / prevHeadcount) * 100
      : null;

  const firstDate =
    company.snapshots.length > 0
      ? new Date(company.snapshots[0].recordedAt).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        })
      : null;

  const lastDate =
    company.snapshots.length > 0
      ? new Date(
          company.snapshots[company.snapshots.length - 1].recordedAt,
        ).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      : null;

  return (
    <div>
      {/* Breadcrumbs (LC-4) */}
      <Breadcrumbs
        crumbs={[
          { label: "Companies", to: "/companies" },
          { label: company.name },
        ]}
      />

      {/* Company header */}
      <div className="card-panel rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <CompanyLogo name={company.name} website={company.website} size={48} />
            <div>
              <h1 className="text-2xl font-semibold text-app-text">{company.name}</h1>
              <p className="text-app-text-muted text-sm mt-1">{company.industry}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-app-text-muted flex-wrap">
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
          </div>
          <button
            onClick={togglePortfolio}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${
              inPortfolio ? "btn-ghost" : "btn-primary"
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

      {/* Full-width chart (LC-2) */}
      <div className="card-panel rounded-xl p-6 mb-4">
        <h2 className="text-sm font-medium text-app-text-muted mb-4">Headcount History</h2>
        <HeadcountChart snapshots={company.snapshots} />
      </div>

      {/* Stats row below chart — 3 cols (LC-2) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card-panel-subtle rounded-xl p-5">
          <p className="text-xs text-app-text-muted mb-1">Latest Headcount</p>
          <p className="text-2xl font-bold text-app-text tabular-nums">
            {latestHeadcount !== null ? latestHeadcount.toLocaleString() : "—"}
          </p>
        </div>
        <div className="card-panel-subtle rounded-xl p-5">
          <p className="text-xs text-app-text-muted mb-1">vs Previous Month</p>
          {changePercent !== null ? (
            <p
              className={`text-2xl font-bold tabular-nums ${
                changePercent < 0 ? "text-app-red" : "text-app-green"
              }`}
            >
              {changePercent >= 0 ? "+" : ""}
              {changePercent.toFixed(1)}%
            </p>
          ) : (
            <p className="text-2xl font-bold text-app-text-dim">—</p>
          )}
        </div>
        <div className="card-panel-subtle rounded-xl p-5">
          <p className="text-xs text-app-text-muted mb-1">Data Range</p>
          <p className="text-sm font-semibold text-app-text">
            {company.snapshots.length > 0
              ? `${firstDate} – ${lastDate}`
              : "No data"}
          </p>
          <p className="text-xs text-app-text-muted mt-1 tabular-nums">
            {company.snapshots.length} snapshot{company.snapshots.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* News feed (LC-2: hide example.com links) */}
      <div className="card-panel rounded-xl p-6">
        <h2 className="text-sm font-medium text-app-text-muted mb-4">News & Sentiment</h2>
        {company.news.length === 0 ? (
          <p className="text-app-text-dim text-sm">No news available.</p>
        ) : (
          <div className="space-y-3">
            {company.news.map((article) => {
              const isExampleUrl = article.url?.includes("example.com");
              return (
                <div
                  key={article.id}
                  className="flex items-start justify-between gap-4 py-3 border-b border-app-border-subtle last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    {isExampleUrl ? (
                      <p className="text-sm text-app-text line-clamp-2">{article.title}</p>
                    ) : (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-app-text hover:text-app-accent line-clamp-2 transition-colors"
                      >
                        {article.title}
                      </a>
                    )}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
