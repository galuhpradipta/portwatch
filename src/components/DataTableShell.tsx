import type { ReactNode } from "react";
import { joinClassNames } from "./uiShared.ts";

type Props = {
  kicker: string;
  description: ReactNode;
  helper?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export default function DataTableShell({
  kicker,
  description,
  helper,
  toolbar,
  children,
  className,
  bodyClassName,
}: Props) {
  return (
    <div className={joinClassNames("dashboard-shell surface-square overflow-hidden", className)}>
      <div className="dashboard-table-topbar dashboard-table-topbar-compact px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="dashboard-kicker">{kicker}</p>
            <p className="dashboard-copy mt-1 text-sm">{description}</p>
          </div>
          {helper ? <div className="dashboard-data-muted text-xs">{helper}</div> : null}
        </div>
        {toolbar ? <div className="mt-4">{toolbar}</div> : null}
      </div>
      <div className={joinClassNames("dashboard-table-shell dashboard-table-shell-embedded", bodyClassName)}>
        {children}
      </div>
    </div>
  );
}
