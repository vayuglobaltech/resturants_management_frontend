"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserCheck, AlertCircle, RefreshCcw } from "lucide-react";
import { listTables, listOrders } from "@/lib/ordersApi";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/Button";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { apiFetch } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";

type Period = "today" | "week" | "month";

interface TableStats {
  id: number;
  table_number: number;
  capacity: number;
  area: string;
  customers_served: number;
  currently_sitting: number;
}

export default function CustomerTrackingPage() {
  const [period, setPeriod] = useState<Period>("today");
  const [tables, setTables] = useState<TableStats[]>([]);
  const [totalCustomersServed, setTotalCustomersServed] = useState(0);
  const [totalCurrentlySitting, setTotalCurrentlySitting] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();
  const { messages } = useWebSocket();

  const getDateRange = (period: Period) => {
    const now = new Date();
    const today = startOfDay(now);
    switch (period) {
      case "today":
        return { start: today, end: endOfDay(now) };
      case "week":
        return {
          start: subDays(today, 7),
          end: endOfDay(now),
        };
      case "month":
        return {
          start: subDays(today, 30),
          end: endOfDay(now),
        };
      default:
        return { start: today, end: endOfDay(now) };
    }
  };

  const fetchData = async () => {
    try {
      const { start, end } = getDateRange(period);
      const startStr = format(start, "yyyy-MM-dd");
      const endStr = format(end, "yyyy-MM-dd");

      const trackingRes = await apiFetch(
        `/api/orders/tracking/?start_date=${startStr}&end_date=${endStr}`,
        {},
        true,
      );
      const trackingData = await trackingRes.json();

      setTables(trackingData.tables || []);
      setTotalCustomersServed(trackingData.total_customers || 0);
      setTotalCurrentlySitting(trackingData.total_currently_sitting || 0);
    } catch (error) {
      console.error("Failed to fetch tracking data", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [period]);

  // Auto-refresh when websocket receives an order update
  useEffect(() => {
    const hasStatusUpdate = messages.some(
      (msg) => msg.type === "order_status_update",
    );
    if (hasStatusUpdate) {
      const timer = setTimeout(() => {
        fetchData();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // ─── Calculate Metrics ──────────────────────────────────────────────────
  const totalCapacity = tables.reduce((acc, t) => acc + (t.capacity || 0), 0);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-[var(--primary)]" />
            Customer Tracking Report
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Historical insights into table usage and customer flow.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant={period === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod("today")}
            >
              Today
            </Button>
            <Button
              variant={period === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod("week")}
            >
              Week
            </Button>
            <Button
              variant={period === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod("month")}
            >
              Month
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-1"
          >
            <RefreshCcw
              className={cn("h-4 w-4", refreshing && "animate-spin")}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total Seating Capacity"
          value={totalCapacity}
          subtitle="Total available seats across all tables"
          icon={<Users className="h-5 w-5" />}
          gradient="from-blue-500/10 to-blue-500/5 text-blue-600 dark:text-blue-400"
        />
        <MetricCard
          title="Total Customers Served"
          value={totalCustomersServed}
          subtitle={`Completed visits`}
          icon={<UserCheck className="h-5 w-5" />}
          gradient="from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400"
        />
        <MetricCard
          title="Currently Sitting"
          value={totalCurrentlySitting}
          subtitle={`Active customers`}
          icon={<Users className="h-5 w-5" />}
          gradient="from-purple-500/10 to-purple-500/5 text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* Grid of Tables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence>
          {[...tables]
            .sort(
              (a, b) => (a.customers_served || 0) - (b.customers_served || 0),
            )
            .map((table) => {
              const customers = table.customers_served || 0;
              const sitting = table.currently_sitting || 0;
              const capacity = table.capacity || 4;

              const occupancyPercentage = Math.min(
                (sitting / capacity) * 100,
                100,
              );

              const statusColor =
                "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20";

              return (
                <motion.div
                  key={table.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="group relative overflow-hidden bg-card border border-border rounded-2xl p-5 hover:shadow-lg transition-all duration-300 flex flex-col"
                >
                  {/* Background Glass Element */}
                  <div className="absolute -right-8 -top-8 w-24 h-24 bg-[var(--primary)]/5 rounded-full blur-2xl group-hover:bg-[var(--primary)]/10 transition-colors duration-500" />

                  <div className="flex justify-between items-start mb-4 z-10 relative">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">
                        Table {table.table_number}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {table.area || "Main Hall"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] uppercase font-bold px-2 py-1 rounded-full border",
                        statusColor,
                      )}
                    >
                      Capacity: {capacity}
                    </span>
                  </div>

                  <div className="flex items-end justify-between mt-auto mb-2 z-10 relative">
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Served
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span
                          className={cn(
                            "text-2xl font-black",
                            customers === 0
                              ? "text-muted-foreground/50"
                              : "text-emerald-500",
                          )}
                        >
                          {customers}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Sitting
                      </p>
                      <div className="flex items-baseline gap-1 justify-end">
                        <span
                          className={cn(
                            "text-2xl font-black",
                            table.currently_sitting === 0
                              ? "text-muted-foreground/50"
                              : "text-purple-500",
                          )}
                        >
                          {table.currently_sitting}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar (Visual representation of utilization) */}
                  <div className="w-full bg-secondary rounded-full h-2 z-10 relative overflow-hidden mt-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${occupancyPercentage}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={cn(
                        "h-full rounded-full",
                        sitting === 0
                          ? "bg-transparent"
                          : sitting >= capacity
                            ? "bg-red-500"
                            : "bg-[var(--primary)]",
                      )}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {sitting}/{capacity} seats occupied
                    </p>
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>

      {tables.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card border border-border border-dashed rounded-3xl">
          <AlertCircle className="h-10 w-10 mb-3 opacity-50" />
          <p className="font-medium text-lg">No tables found</p>
          <p className="text-sm opacity-70">
            Add tables to start tracking occupancy.
          </p>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  gradient,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow relative overflow-hidden flex items-center justify-between">
      <div
        className={cn(
          "absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl rounded-bl-full opacity-50 -mr-10 -mt-10",
          gradient.split(" ")[0],
          gradient.split(" ")[1],
        )}
      />
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <h3 className="text-3xl font-black text-foreground mt-1">{value}</h3>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </div>
      <div className={cn("p-4 rounded-2xl bg-gradient-to-br", gradient)}>
        {icon}
      </div>
    </div>
  );
}
