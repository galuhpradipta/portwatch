import { Link } from "react-router";
import { CaretRight } from "@phosphor-icons/react";

type Crumb = { label: string; to?: string };

export default function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-app-text-muted mb-4">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <CaretRight size={12} className="text-app-text-dim flex-shrink-0" />}
          {crumb.to ? (
            <Link to={crumb.to} className="hover:text-app-text transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-app-text">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
