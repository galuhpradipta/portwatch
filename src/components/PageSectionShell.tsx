import type { ReactNode } from "react";
import { joinClassNames } from "./uiShared.ts";

type Props = {
  children: ReactNode;
  className?: string;
};

export default function PageSectionShell({ children, className }: Props) {
  return (
    <section className={joinClassNames("dashboard-shell dashboard-panel surface-square", className)}>
      {children}
    </section>
  );
}
