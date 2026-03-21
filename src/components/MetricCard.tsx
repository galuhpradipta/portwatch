import type { ReactNode } from "react";
import { joinClassNames } from "./uiShared.ts";

type Props = {
  children: ReactNode;
  className?: string;
  primary?: boolean;
};

export default function MetricCard({ children, className, primary = false }: Props) {
  return (
    <div
      className={joinClassNames(
        "dashboard-metric dashboard-metric-compact",
        primary && "dashboard-metric-primary",
        className,
      )}
    >
      {children}
    </div>
  );
}
