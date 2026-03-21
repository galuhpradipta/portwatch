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

  const serverInPortfolio = portfolio.some((p) => p.id === company.id);
  const [prevServerInPortfolio, setPrevServerInPortfolio] = useState(serverInPortfolio);
  const [inPortfolio, setInPortfolio] = useState(serverInPortfolio);

  if (serverInPortfolio !== prevServerInPortfolio) {
    setPrevServerInPortfolio(serverInPortfolio);
    setInPortfolio(serverInPortfolio);
  }
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
      <Breadcrumbs
        crumbs={[
          { label: "Companies", to: "/companies" },
          { label: company.name },
        ]}
      />

      <div className="companies-detail-shell radius-shell p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <CompanyLogo name={company.name} website={company.website} logoUrl={company.logoUrl} size={48} />
            <div>
              <p className="dashboard-kicker">Company brief</p>
              <h1 className="dashboard-title mt-1 text-2xl">{company.name}</h1>
              <p className="companies-meta text-sm mt-1">{company.industry}</p>
              <div className="flex items-center gap-4 mt-3 text-sm companies-meta flex-wrap">
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
                    className="companies-link flex items-center gap-1"
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
            className={`min-w-[14rem] ${
              inPortfolio ? "companies-action-secondary" : "companies-action-primary"
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

      <div className="companies-detail-shell radius-shell p-6 mb-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="dashboard-kicker">Signal track</p>
            <h2 className="dashboard-title mt-1 text-lg">Headcount History</h2>
          </div>
          <span className="companies-info-pill">
            {company.snapshots.length} snapshot{company.snapshots.length !== 1 ? "s" : ""}
          </span>
        </div>
        <HeadcountChart snapshots={company.snapshots} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="companies-detail-shell radius-panel p-5">
          <p className="dashboard-kicker mb-2">Latest headcount</p>
          <p className="dashboard-data text-2xl font-bold tabular-nums">
            {latestHeadcount !== null ? latestHeadcount.toLocaleString() : "—"}
          </p>
          <p className="companies-meta mt-2 text-xs">Most recent workforce reading.</p>
        </div>
        <div className="companies-detail-shell radius-panel p-5">
          <p className="dashboard-kicker mb-2">Vs previous month</p>
          {changePercent !== null ? (
            <p
              className={`dashboard-data text-2xl font-bold tabular-nums ${
                changePercent < 0 ? "text-app-red" : "text-app-green"
              }`}
            >
              {changePercent >= 0 ? "+" : ""}
              {changePercent.toFixed(1)}%
            </p>
          ) : (
            <p className="text-2xl font-bold text-app-text-dim">—</p>
          )}
          <p className="companies-meta mt-2 text-xs">Short-term movement against the prior snapshot.</p>
        </div>
        <div className="companies-detail-shell radius-panel p-5">
          <p className="dashboard-kicker mb-2">Data range</p>
          <p className="dashboard-title text-sm font-semibold">
            {company.snapshots.length > 0
              ? `${firstDate} – ${lastDate}`
              : "No data"}
          </p>
          <p className="companies-meta mt-2 text-xs tabular-nums">
            {company.snapshots.length} snapshot{company.snapshots.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="companies-detail-shell radius-shell p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="dashboard-kicker">Market pulse</p>
            <h2 className="dashboard-title mt-1 text-lg">News & Sentiment</h2>
          </div>
          <span className="companies-info-pill">
            {company.news.length} article{company.news.length !== 1 ? "s" : ""}
          </span>
        </div>
        {company.news.length === 0 ? (
          <p className="companies-muted text-sm">No news available.</p>
        ) : (
          <div className="space-y-3">
            {company.news.map((article) => {
              const isExampleUrl = article.url?.includes("example.com");
              return (
                <div
                  key={article.id}
                  className="companies-news-row radius-panel flex items-start justify-between gap-4 px-4 py-4 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    {isExampleUrl ? (
                      <p className="companies-link text-sm line-clamp-2">{article.title}</p>
                    ) : (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="companies-link text-sm line-clamp-2"
                      >
                        {article.title}
                      </a>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-xs companies-muted">
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
