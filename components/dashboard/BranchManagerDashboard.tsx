"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  CreditCard,
  Package,
  ReceiptText,
  ShoppingBag,
  Store,
  Table2,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, subDays } from "date-fns";
import { getDailySalesTrend } from "@/lib/accountingApi";
import { apiFetch, getInventories, listAllUsers } from "@/lib/api";
import { listMenuItems } from "@/lib/menuApi";
import { listTables } from "@/lib/tableApi";

type ManagerStats = {
  todayRevenue: number;
  monthlyRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  grossProfitMargin: number;
  pendingExpenses: number;
  pendingAdjustments: number;
  missingCostCount?: number;
};

type SalesPoint = {
  date: string;
  label: string;
  revenue: number;
  orders: number;
};

type BranchReference = number | string | { id?: number | string } | null;

type ApiRecord = {
  [key: string]: unknown;
  id?: number | string;
  created_at?: string;
  status?: unknown;
  payment_status?: unknown;
  total_amount?: number | string;
  total?: number | string;
  grand_total?: number | string;
  items?: unknown;
  price_at_order?: number | string;
  price?: number | string;
  quantity?: number | string;
  current_stock?: number | string;
  reorder_threshold?: number | string;
  minimum_stock?: number | string;
  is_available?: boolean;
  is_active?: boolean;
  branch?: BranchReference;
  primary_branch?: BranchReference;
  date?: string;
  revenue?: number | string;
  sales?: number | string;
  total_sales?: number | string;
  orders?: number | string;
  order_count?: number | string;
  number_of_orders?: number | string;
};

type OperationalData = {
  orders: ApiRecord[];
  tables: ApiRecord[];
  menu: ApiRecord[];
  inventory: ApiRecord[];
  employees: ApiRecord[];
  trend: SalesPoint[];
};

type Props = {
  branchId: number;
  branchName: string;
  managerName: string;
  stats: ManagerStats;
};

const EMPTY_DATA: OperationalData = {
  orders: [],
  tables: [],
  menu: [],
  inventory: [],
  employees: [],
  trend: [],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const arrayFrom = (value: unknown): ApiRecord[] => {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (isRecord(value) && Array.isArray(value.results)) return value.results.filter(isRecord);
  if (isRecord(value) && Array.isArray(value.data)) return value.data.filter(isRecord);
  return [];
};

const branchReferenceId = (value: BranchReference | undefined) =>
  isRecord(value) ? value.id : value;

const normalizedStatus = (value: unknown) =>
  String(value ?? "").trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");

const currency = (value: number) =>
  `Rs. ${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;

const shortCurrency = (value: number) => {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1_000_000) return `Rs. ${(amount / 1_000_000).toFixed(1)}m`;
  if (Math.abs(amount) >= 1_000) return `Rs. ${(amount / 1_000).toFixed(1)}k`;
  return `Rs. ${Math.round(amount)}`;
};

const orderTotal = (order: ApiRecord) => {
  const direct = Number(order.total_amount ?? order.total ?? order.grand_total);
  if (Number.isFinite(direct)) return direct;
  return arrayFrom(order.items).reduce(
    (sum, item) => sum + Number(item.price_at_order ?? item.price ?? 0) * Number(item.quantity ?? 0),
    0,
  );
};

function SectionHeading({ title, description, href }: { title: string; description: string; href?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {href && (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          View details <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[250px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-center">
      <BarChart3 className="h-6 w-6 text-muted-foreground/50" />
      <p className="mt-2 text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

export function BranchManagerDashboard({ branchId, branchName, managerName, stats }: Props) {
  const [data, setData] = useState<OperationalData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;

    const loadOverview = async () => {
      setLoading(true);
      const endDate = format(new Date(), "yyyy-MM-dd");
      const startDate = format(subDays(new Date(), 6), "yyyy-MM-dd");
      const branchOrders = async () => {
        const response = await apiFetch(`/api/orders/?branch=${branchId}&page_size=1000`, {}, true);
        if (!response.ok) throw new Error(`Orders request failed (${response.status})`);
        return response.json();
      };

      const results = await Promise.allSettled([
        branchOrders(),
        listTables({ branch: String(branchId) }),
        listMenuItems(),
        getInventories({ branch: String(branchId) }),
        listAllUsers(),
        getDailySalesTrend(startDate, endDate, branchId),
      ]);

      if (!active) return;

      const valueAt = (index: number) =>
        results[index].status === "fulfilled" ? results[index].value : [];

      const rawTrend = arrayFrom(valueAt(5));
      const trendByDate = new Map(
        rawTrend.map((point) => [
          String(point.date).slice(0, 10),
          {
            revenue: Number(point.revenue ?? point.sales ?? point.total_sales ?? 0),
            orders: Number(point.orders ?? point.order_count ?? point.number_of_orders ?? 0),
          },
        ]),
      );

      const trend = Array.from({ length: 7 }, (_, index) => {
        const date = subDays(new Date(), 6 - index);
        const key = format(date, "yyyy-MM-dd");
        const point = trendByDate.get(key) ?? { revenue: 0, orders: 0 };
        return { date: key, label: format(date, "EEE"), ...point };
      });

      const employees = arrayFrom(valueAt(4)).filter((employee) => {
        const employeeBranch = branchReferenceId(employee.branch) ?? branchReferenceId(employee.primary_branch);
        return employeeBranch != null && Number(employeeBranch) === Number(branchId);
      });

      setData({
        orders: arrayFrom(valueAt(0)),
        tables: arrayFrom(valueAt(1)),
        menu: arrayFrom(valueAt(2)),
        inventory: arrayFrom(valueAt(3)),
        employees,
        trend,
      });
      setUpdatedAt(new Date());
      setLoading(false);
    };

    loadOverview();
    return () => {
      active = false;
    };
  }, [branchId]);

  const overview = useMemo(() => {
    const todayKey = new Date().toDateString();
    const todayOrders = data.orders.filter((order) => {
      if (!order.created_at) return true;
      const created = new Date(order.created_at);
      return !Number.isNaN(created.getTime()) && created.toDateString() === todayKey;
    });
    const relevantOrders = todayOrders;

    const activeStatuses = new Set(["pending", "new", "confirmed", "preparing", "in_progress", "ready"]);
    const completedStatuses = new Set(["completed", "served", "delivered", "paid"]);
    const occupiedStatuses = new Set(["occupied", "busy", "reserved"]);

    const activeOrders = relevantOrders.filter((order) => activeStatuses.has(normalizedStatus(order.status)));
    const completedOrders = relevantOrders.filter((order) => completedStatuses.has(normalizedStatus(order.status)));
    const pendingOrders = relevantOrders.filter((order) => ["pending", "new", "confirmed"].includes(normalizedStatus(order.status)));
    const preparingOrders = relevantOrders.filter((order) => ["preparing", "in_progress"].includes(normalizedStatus(order.status)));
    const readyOrders = relevantOrders.filter((order) => normalizedStatus(order.status) === "ready");
    const paidOrders = relevantOrders.filter((order) => {
      const orderStatus = normalizedStatus(order.status);
      const paymentStatus = normalizedStatus(order.payment_status);
      return orderStatus === "paid" || ["paid", "completed", "settled"].includes(paymentStatus);
    });
    const occupiedTables = data.tables.filter((table) => occupiedStatuses.has(normalizedStatus(table.status)));
    const availableTables = Math.max(data.tables.length - occupiedTables.length, 0);
    const lowStock = data.inventory.filter((item) => {
      const threshold = item.reorder_threshold ?? item.minimum_stock;
      return threshold != null && Number(item.quantity ?? item.current_stock ?? 0) <= Number(threshold);
    });
    const unavailableMenu = data.menu.filter((item) => item.is_available === false);
    const activeEmployees = data.employees.filter((employee) => employee.is_active !== false);
    const averageOrder = relevantOrders.length
      ? relevantOrders.reduce((sum, order) => sum + orderTotal(order), 0) / relevantOrders.length
      : 0;

    return {
      relevantOrders,
      activeOrders,
      completedOrders,
      pendingOrders,
      preparingOrders,
      readyOrders,
      paidOrders,
      occupiedTables,
      availableTables,
      lowStock,
      unavailableMenu,
      activeEmployees,
      averageOrder,
    };
  }, [data]);

  const orderFlow = [
    { name: "Pending", value: overview.pendingOrders.length, color: "#d97706" },
    { name: "Preparing", value: overview.preparingOrders.length, color: "#2563eb" },
    { name: "Ready", value: overview.readyOrders.length, color: "#059669" },
    { name: "Paid", value: overview.paidOrders.length, color: "#7c3aed" },
  ];

  const tableUsage = [
    { name: "Occupied", value: overview.occupiedTables.length, color: "#b88e4c" },
    { name: "Available", value: overview.availableTables, color: "#e7e1d8" },
  ];

  const kpis: { label: string; value: string; note: string; icon: ElementType; href: string }[] = [
    {
      label: "Today’s sales",
      value: currency(stats.todayRevenue),
      note: `${overview.relevantOrders.length} orders recorded`,
      icon: Banknote,
      href: "/dashboard/reports/sales",
    },
    {
      label: "Active orders",
      value: String(overview.activeOrders.length),
      note: `${overview.readyOrders.length} ready for service`,
      icon: ClipboardList,
      href: "/dashboard/orders",
    },
    {
      label: "Table occupancy",
      value: data.tables.length ? `${Math.round((overview.occupiedTables.length / data.tables.length) * 100)}%` : "0%",
      note: `${overview.occupiedTables.length} of ${data.tables.length} tables in use`,
      icon: Table2,
      href: "/dashboard/tables",
    },
    {
      label: "Gross margin",
      value: `${Number(stats.grossProfitMargin || 0).toFixed(1)}%`,
      note: `${currency(stats.grossProfit)} gross profit this month`,
      icon: TrendingUp,
      href: "/dashboard/reports/gross-profit",
    },
  ];

  const modules: { label: string; value: string; note: string; icon: ElementType; href: string }[] = [
    { label: "Orders", value: String(overview.relevantOrders.length), note: `${overview.activeOrders.length} currently active`, icon: ShoppingBag, href: "/dashboard/orders" },
    { label: "Kitchen", value: String(overview.preparingOrders.length), note: `${overview.readyOrders.length} waiting to serve`, icon: ChefHat, href: "/dashboard/kitchen" },
    { label: "Inventory", value: String(data.inventory.length), note: `${overview.lowStock.length} low-stock items`, icon: Package, href: "/dashboard/inventory" },
    { label: "Menu", value: String(data.menu.length), note: `${overview.unavailableMenu.length} unavailable items`, icon: UtensilsCrossed, href: "/dashboard/menu" },
    { label: "Employees", value: String(overview.activeEmployees.length), note: "Active team members", icon: Users, href: "/dashboard/users" },
    { label: "Payments", value: currency(stats.todayRevenue), note: `${currency(overview.averageOrder)} avg. order`, icon: CreditCard, href: "/dashboard/payments" },
  ];

  const attentionItems = [
    {
      label: "Low stock items",
      value: overview.lowStock.length,
      href: "/dashboard/inventory/stock",
      tone: overview.lowStock.length > 0 ? "text-amber-600" : "text-emerald-600",
    },
    {
      label: "Pending expenses",
      value: stats.pendingExpenses,
      href: "/dashboard/reports/profit-loss",
      tone: stats.pendingExpenses > 0 ? "text-amber-600" : "text-emerald-600",
    },
    {
      label: "Stock adjustments",
      value: stats.pendingAdjustments,
      href: "/dashboard/inventory/transactions",
      tone: stats.pendingAdjustments > 0 ? "text-amber-600" : "text-emerald-600",
    },
    {
      label: "Products missing cost",
      value: stats.missingCostCount ?? 0,
      href: "/dashboard/inventory/products",
      tone: (stats.missingCostCount ?? 0) > 0 ? "text-amber-600" : "text-emerald-600",
    },
    {
      label: "Unavailable menu items",
      value: overview.unavailableMenu.length,
      href: "/dashboard/menu",
      tone: overview.unavailableMenu.length > 0 ? "text-amber-600" : "text-emerald-600",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Store className="h-3.5 w-3.5" />
            <span>{branchName || "Current branch"}</span>
            <span className="text-border">/</span>
            <span>{format(new Date(), "EEEE, d MMMM")}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">Branch overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {managerName}. Here’s how the branch is running today.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {loading ? "Refreshing overview…" : updatedAt ? `Updated ${format(updatedAt, "h:mm a")}` : "Live overview"}
        </div>
      </header>

      <section className="grid grid-cols-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, index) => (
          <Link
            href={kpi.href}
            key={kpi.label}
            className={`group p-5 transition-colors hover:bg-muted/30 ${index > 0 ? "border-t border-border sm:border-l sm:border-t-0" : ""} ${index === 2 ? "sm:border-t xl:border-t-0" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
              <kpi.icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{loading ? "—" : kpi.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{loading ? "Loading branch data" : kpi.note}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <SectionHeading title="Sales trend" description="Daily revenue over the last seven days" href="/dashboard/reports/sales" />
          <div className="mt-5">
            {loading ? (
              <div className="h-[250px] animate-pulse rounded-xl bg-muted/40" />
            ) : data.trend.every((point) => point.revenue === 0 && point.orders === 0) ? (
              <EmptyChart message="No sales activity was returned for this period." />
            ) : (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#b88e4c" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#b88e4c" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickFormatter={shortCurrency} width={62} />
                    <Tooltip
                      formatter={(value, name) => [name === "revenue" ? currency(Number(value)) : value, name === "revenue" ? "Revenue" : "Orders"]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.date ? format(new Date(`${payload[0].payload.date}T00:00:00`), "d MMMM") : ""}
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#b88e4c" strokeWidth={2.25} fill="url(#salesFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <SectionHeading title="Dining room" description="Current table availability" href="/dashboard/tables" />
          <div className="mt-4 grid grid-cols-[150px_1fr] items-center gap-2">
            <div className="relative h-[150px]">
              {data.tables.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={tableUsage} dataKey="value" innerRadius={51} outerRadius={65} startAngle={90} endAngle={-270} strokeWidth={0}>
                        {tableUsage.map((item) => <Cell key={item.name} fill={item.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-semibold text-foreground">{data.tables.length}</span>
                    <span className="text-[10px] text-muted-foreground">tables</span>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center rounded-full border border-dashed border-border text-xs text-muted-foreground">No data</div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary" />Occupied</div>
                <p className="mt-1 text-lg font-semibold text-foreground">{overview.occupiedTables.length}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-[#e7e1d8]" />Available</div>
                <p className="mt-1 text-lg font-semibold text-foreground">{overview.availableTables}</p>
              </div>
            </div>
          </div>
          <div className="mt-3 border-t border-border pt-4">
            <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Average order value</span><span className="font-semibold text-foreground">{currency(overview.averageOrder)}</span></div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <SectionHeading title="Operations" description="A quick status check across the branch" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <Link key={module.label} href={module.href} className="group rounded-lg border border-border p-4 transition-colors hover:border-primary/40 hover:bg-muted/25">
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-primary"><module.icon className="h-4 w-4" /></div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                </div>
                <p className="mt-4 text-xl font-semibold text-foreground">{loading ? "—" : module.value}</p>
                <p className="mt-1 text-xs font-medium text-foreground">{module.label}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{module.note}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <SectionHeading title="Needs attention" description="Items that may need a manager decision" />
          <div className="mt-4 divide-y divide-border">
            {attentionItems.map((item) => (
              <Link key={item.label} href={item.href} className="group flex items-center justify-between py-3.5 first:pt-1 last:pb-1">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-muted ${item.tone}`}>
                    {item.value > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  </div>
                  <span className="text-xs font-medium text-foreground">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${item.tone}`}>{loading ? "—" : item.value}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <SectionHeading title="Live order flow" description="Orders currently moving through service" href="/dashboard/kitchen" />
          <div className="mt-5 space-y-4">
            {orderFlow.map((stage) => {
              const total = Math.max(overview.relevantOrders.length, 1);
              return (
                <div key={stage.name}>
                  <div className="mb-1.5 flex items-center justify-between text-xs"><span className="text-muted-foreground">{stage.name}</span><span className="font-semibold text-foreground">{stage.value}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min((stage.value / total) * 100, 100)}%`, backgroundColor: stage.color }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <SectionHeading title="Financial snapshot" description="Month-to-date performance from paid sales and product cost prices" href="/dashboard/reports" />
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5">
            <div><p className="text-xs text-muted-foreground">Revenue</p><p className="mt-1 text-lg font-semibold text-foreground">{currency(stats.monthlyRevenue)}</p></div>
            <div><p className="text-xs text-muted-foreground">Cost of goods</p><p className="mt-1 text-lg font-semibold text-foreground">{currency(stats.totalCOGS)}</p></div>
            <div><p className="text-xs text-muted-foreground">Gross profit</p><p className="mt-1 text-lg font-semibold text-foreground">{currency(stats.grossProfit)}</p></div>
            <div><p className="text-xs text-muted-foreground">Gross margin</p><p className="mt-1 text-lg font-semibold text-foreground">{Number(stats.grossProfitMargin || 0).toFixed(1)}%</p></div>
          </div>
          <Link href="/dashboard/reports/profit-loss" className="mt-5 flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-xs font-medium text-foreground transition-colors hover:bg-muted">
            Open profit and loss report <ReceiptText className="h-4 w-4 text-primary" />
          </Link>
        </div>
      </section>
    </div>
  );
}
