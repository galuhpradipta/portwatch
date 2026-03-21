import { useLoaderData } from "react-router";
import { useState } from "react";
import { Plus, Minus, Globe, MapPin, Users } from "@phosphor-icons/react";
import { useApi } from "../../shared/hooks/useApi.ts";
import HeadcountChart from "./HeadcountChart.tsx";
import SentimentBadge from "../../components/SentimentBadge.tsx";
import CompanyLogo from "../../components/CompanyLogo.tsx";
import Breadcrumbs from "../../components/Breadcrumbs.tsx";
import CompanyNoteSection from "../notes/CompanyNoteSection.tsx";
import type { Company, HeadcountSnapshot, NewsArticle, CompanyNote } from "../../shared/types.ts";

type CompanyDetail = Company & {
  snapshots: HeadcountSnapshot[];
  news: NewsArticle[];
};

type LoaderData = {
  company: CompanyDetail;
  portfolio: { id: string }[];
  note: CompanyNote | null;
};

export default function CompanyDetailPage() {
  const { company, portfolio, note } = useLoaderData() as LoaderData;
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
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        crumbs={[
          { label: "Companies", to: "/companies" },
          { label: company.name },
        ]}
      />

      {/* Company Header */}
      <div className="companies-detail-shell radius-shell p-4 sm:p-5 animate-fade-in-up animate-stagger-1">
        <div className="flex items-center gap-3">
          <CompanyLogo
            name={company.name}
            logoStatus={company.logoStatus}
            logoSrc={company.logoSrc}
            size={40}
            priority
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h1 className="dashboard-title text-xl leading-none">{company.name}</h1>
              {company.industry && (
                <span className="companies-info-pill">{company.industry}</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {company.country && (
                <span className="flex items-center gap-1 text-xs companies-meta">
                  <MapPin size={11} weight="fill" />
                  {company.country}
                </span>
              )}
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="companies-link flex items-center gap-1 text-xs"
                >
                  <Globe size={11} />
                  {company.website.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              )}
              {company.employeeRange && (
                <span className="flex items-center gap-1 text-xs companies-meta">
                  <Users size={11} />
                  {company.employeeRange}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={togglePortfolio}
            disabled={loading}
            className={`flex-shrink-0 detail-portfolio-btn ${
              inPortfolio ? "detail-portfolio-btn-remove" : "detail-portfolio-btn-add"
            }`}
          >
            {inPortfolio ? (
              <>
                <Minus size={14} weight="bold" />
                <span>Remove</span>
              </>
            ) : (
              <>
                <Plus size={14} weight="bold" />
                <span>Track</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Headcount Chart + Inline Stats */}
      <div className="companies-detail-shell radius-shell overflow-hidden animate-fade-in-up animate-stagger-2">
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div>
            <p className="dashboard-kicker">Signal track</p>
            <h2 className="dashboard-title mt-0.5 text-base">Headcount History</h2>
          </div>
          <span className="companies-info-pill flex-shrink-0">
            {company.snapshots.length} snapshot{company.snapshots.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="detail-stat-strip mx-5 mb-4">
          <div className="detail-stat-item">
            <span className="detail-stat-label">Latest</span>
            <span className="detail-stat-value">
              {latestHeadcount !== null ? latestHeadcount.toLocaleString() : "—"}
            </span>
          </div>
          <div className="detail-stat-divider" />
          <div className="detail-stat-item">
            <span className="detail-stat-label">MoM Change</span>
            <span
              className={`detail-stat-value ${
                changePercent === null
                  ? ""
                  : changePercent < 0
                    ? "text-app-red"
                    : "text-app-green"
              }`}
            >
              {changePercent !== null
                ? `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%`
                : "—"}
            </span>
          </div>
          <div className="detail-stat-divider" />
          <div className="detail-stat-item">
            <span className="detail-stat-label">Range</span>
            <span className="detail-stat-value detail-stat-value-sm">
              {company.snapshots.length > 0 ? `${firstDate} – ${lastDate}` : "No data"}
            </span>
          </div>
        </div>

        <div className="px-2 pb-4">
          <HeadcountChart snapshots={company.snapshots} />
        </div>
      </div>

      {inPortfolio && (
        <div className="animate-fade-in-up animate-stagger-3">
          <CompanyNoteSection companyId={company.id} initialNote={note} />
        </div>
      )}

      {/* News & Sentiment */}
      <div className="companies-detail-shell radius-shell p-5 animate-fade-in-up animate-stagger-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="dashboard-kicker">Market pulse</p>
            <h2 className="dashboard-title mt-0.5 text-base">News & Sentiment</h2>
          </div>
          <span className="companies-info-pill flex-shrink-0">
            {company.news.length} article{company.news.length !== 1 ? "s" : ""}
          </span>
        </div>
        {company.news.length === 0 ? (
          <p className="companies-muted text-sm">No news available.</p>
        ) : (
          <div>
            {company.news.map((article) => {
              const isExampleUrl = article.url?.includes("example.com");
              return (
                <div
                  key={article.id}
                  className="companies-news-row flex items-center justify-between gap-4 px-3 py-3 rounded-lg last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    {isExampleUrl ? (
                      <p className="companies-link text-sm line-clamp-1">{article.title}</p>
                    ) : (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="companies-link text-sm line-clamp-1"
                      >
                        {article.title}
                      </a>
                    )}
                    <p className="text-xs companies-muted mt-0.5">
                      {article.sourceName}
                      {" · "}
                      {new Date(article.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
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
