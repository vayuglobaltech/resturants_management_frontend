"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ChartNoAxesCombined,
  ClipboardList,
  Lightbulb,
  ListChecks,
  ReceiptText,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";

const REPORT_LINKS = [
  { label: "Overview", href: "/dashboard/reports", icon: BarChart3 },
  { label: "Sales", href: "/dashboard/reports/sales", icon: TrendingUp },
  { label: "Daily", href: "/dashboard/reports/daily-sales", icon: ReceiptText },
  { label: "Products", href: "/dashboard/reports/products", icon: Boxes },
  { label: "Gross profit", href: "/dashboard/reports/gross-profit", icon: ChartNoAxesCombined },
  { label: "P&L", href: "/dashboard/reports/profit-loss", icon: WalletCards },
  { label: "Orders", href: "/dashboard/reports/orders", icon: ClipboardList },
  { label: "Employees", href: "/dashboard/reports/employees", icon: Users },
  { label: "Insights", href: "/dashboard/reports/insights", icon: Lightbulb },
  { label: "Transactions", href: "/dashboard/reports/transactions", icon: ListChecks },
];

export function ReportsMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="report-mobile-nav md:hidden" aria-label="Report pages">
      {REPORT_LINKS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn("report-mobile-nav-item", active && "is-active")}
          >
            <item.icon aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
