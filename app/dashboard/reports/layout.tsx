import type { ReactNode } from "react";
import { ReportsMobileNav } from "@/components/reports/ReportsMobileNav";

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return (
    <section className="report-app-shell min-w-0" aria-label="Reports">
      <ReportsMobileNav />
      {children}
    </section>
  );
}
