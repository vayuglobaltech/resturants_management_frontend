"use client";

import {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket } from "@/hooks/useWebSocket";
import { listOrders, updateOrder } from "@/lib/ordersApi";
import toast from "react-hot-toast";
import {
  Bell,
  CheckCircle2,
  Clock,
  ChefHat,
  Utensils,
  RefreshCw,
} from "lucide-react";

// ─── Status config ────────────────────────────────────────────────────────────
type RoleType = "kitchen_staff" | "waiter";

const ROLE_CONFIG = {
  kitchen_staff: {
    fetchStatuses: ["CONFIRMED", "QUEUED", "PREPARING"] as string[],
    nextStatus:    { CONFIRMED: "QUEUED", QUEUED: "PREPARING", PREPARING: "READY" } as Record<string, string>,
    label:         "Kitchen Staff",
    icon:          ChefHat,
    swipeLabel:    { CONFIRMED: "Queue it", QUEUED: "Start Preparing", PREPARING: "Mark Ready" } as Record<string, string>,
  },
  waiter: {
    fetchStatuses: ["PENDING", "READY"] as string[],
    nextStatus:    { PENDING: "CONFIRMED", READY: "DELIVERED" } as Record<string, string>,
    label:         "Waiter",
    icon:          Utensils,
    swipeLabel:    { PENDING: "Confirm Order", READY: "Mark Delivered" } as Record<string, string>,
  },
} satisfies Record<RoleType, object>;

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDING:   { label: "Pending",   bg: "bg-amber-500/15",   text: "text-amber-500",   dot: "bg-amber-400" },
  CONFIRMED: { label: "Confirmed", bg: "bg-blue-500/15",    text: "text-blue-500",    dot: "bg-blue-400" },
  QUEUED:    { label: "Queued",    bg: "bg-indigo-500/15",  text: "text-indigo-400",  dot: "bg-indigo-400" },
  PREPARING: { label: "Preparing", bg: "bg-orange-500/15",  text: "text-orange-500",  dot: "bg-orange-400" },
  READY:     { label: "Ready",     bg: "bg-emerald-500/15", text: "text-emerald-500", dot: "bg-emerald-400" },
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface NotificationMsg {
  order_id: number;
  order_number: string | number;
  status: string;
  table_number: string | number;
  message: string;
  action_required: boolean;
  next_status: string;
  arrived_at?: number;
}

// ─── Swipe card ───────────────────────────────────────────────────────────────
function SwipeCard({
  msg,
  swipeLabel,
  onSwipe,
}: {
  msg: NotificationMsg;
  swipeLabel: string;
  onSwipe: () => void;
}) {
  const [slideX, setSlideX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const startXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const THRESHOLD = 130;

  const badge = STATUS_BADGE[msg.status] || {
    label: msg.status, bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground",
  };
  const progress = Math.min(slideX / THRESHOLD, 1);

  // Touch
  const onTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startXRef.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setSlideX(Math.max(0, Math.min(e.touches[0].clientX - startXRef.current, 230)));
  };
  const onTouchEnd = () => {
    setIsDragging(false);
    if (slideX > THRESHOLD) triggerSwipe();
    else setSlideX(0);
  };

  // Mouse (desktop)
  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
    e.preventDefault();
  };
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) =>
      setSlideX(Math.max(0, Math.min(e.clientX - startXRef.current, 230)));
    const onUp = (e: MouseEvent) => {
      setIsDragging(false);
      const diff = e.clientX - startXRef.current;
      if (diff > THRESHOLD) triggerSwipe();
      else setSlideX(0);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  const triggerSwipe = () => {
    setDismissed(true);
    setTimeout(onSwipe, 280);
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: 300, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          ref={cardRef}
          className="relative select-none touch-pan-y"
        >
          {/* Background track */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none" aria-hidden>
            <div
              className="h-full flex items-center justify-end pr-5 rounded-2xl"
              style={{
                background: `linear-gradient(90deg, transparent ${40 - progress * 40}%, ${
                  progress > 0.85 ? "rgba(34,197,94,0.22)" : "rgba(99,102,241,0.10)"
                } 100%)`,
              }}
            >
              <motion.span className="text-2xl" animate={{ scale: 0.7 + progress * 0.55, opacity: progress }}>
                {progress > 0.85 ? "✅" : "👉"}
              </motion.span>
            </div>
          </div>

          {/* Card */}
          <div
            className="relative bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
            style={{
              transform: `translateX(${slideX}px)`,
              transition: isDragging ? "none" : "transform 0.25s cubic-bezier(.22,.68,0,1.2)",
              cursor: isDragging ? "grabbing" : "grab",
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
          >
            {/* Progress fill */}
            <div
              className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-primary/50 to-emerald-500 rounded-full"
              style={{ width: `${progress * 100}%`, transition: isDragging ? "none" : "width 0.1s" }}
            />

            <div className="flex items-center gap-4 px-4 py-4">
              {/* Order number */}
              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center">
                <span className="text-[9px] text-primary/60 font-bold uppercase tracking-wider leading-none">Order</span>
                <span className="text-base font-black text-primary leading-tight">
                  #{String(msg.order_number).replace("ORD-", "").slice(-4)}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-row-reverse gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} animate-pulse`} />
                    {badge.label}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    Table {msg.table_number ?? "—"}
                  </span>
                </div>
                <div className="mb-0 md:mb-5 ">
                <p className="mb-1.5 text-sm font-semibold text-foreground truncate">
                  {msg.message}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>Swipe right to</span>
                  <span className="font-semibold text-primary">{swipeLabel}</span>
                  <span>→</span>
                </p>
                </div>
              </div>

              {/* Drag handle */}
              <div className="flex-shrink-0 flex flex-col gap-1 opacity-25 pr-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1 h-1 rounded-full bg-foreground" />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const { user } = useAuth();
  const { messages, removeMessage } = useWebSocket();
  const [initialOrders, setInitialOrders] = useState<NotificationMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const prevMsgCount = useRef(0);

  // Role detection — derived from user, so recomputes when user loads
  const role: RoleType | null = useMemo(() => {
    if (!user) return null;
    const rn =
      typeof user.role === "object" && user.role !== null && "name" in user.role
        ? String(user.role.name).toLowerCase()
        : typeof user.role === "string"
        ? user.role.toLowerCase()
        : (user.designation?.toLowerCase().replace(/\s+/g, "_")) ?? "";
    if (rn === "kitchen_staff" || rn.includes("kitchen")) return "kitchen_staff";
    if (rn === "waiter" || rn.includes("waiter")) return "waiter";
    return null;
  }, [user]);

  const config = role ? ROLE_CONFIG[role] : null;

  // Fetch orders — re-runs whenever role becomes non-null
  const fetchOrders = useCallback(
    async (silent = false) => {
      if (!config) return;
      silent ? setRefreshing(true) : setLoading(true);

      try {
        const allFetched: NotificationMsg[] = [];

        for (const status of config.fetchStatuses) {
          console.log(`[Notifications] Fetching status=${status}`);
          const orders = await listOrders(undefined, { status, page_size: 100 });
          console.log(`[Notifications] Got ${orders.length} orders for status=${status}`, orders);

          for (const o of orders) {
            // Normalize status to uppercase in case backend returns mixed case
            const st = String(o.status ?? "").toUpperCase();
            const nextSt = config.nextStatus[st];
            if (!nextSt) {
              console.warn(`[Notifications] No nextStatus for status="${st}"`, o);
              continue;
            }
            allFetched.push({
              order_id: o.id,
              order_number: o.order_number,
              status: st,
              table_number: o.table_number_display ?? o.table_number ?? o.table ?? "—",
              message: o.special_instructions
                ? `Order #${o.order_number} — ${o.special_instructions.slice(0, 40)}`
                : `Order #${o.order_number}`,
              action_required: true,
              next_status: nextSt,
              arrived_at: new Date(o.created_at ?? Date.now()).getTime(),
            });
          }
        }

        // Deduplicate
        const map = new Map<number, NotificationMsg>();
        allFetched.forEach((m) => map.set(m.order_id, m));
        console.log(`[Notifications] Total actionable orders: ${map.size}`);
        setInitialOrders(Array.from(map.values()));
      } catch (err) {
        console.error("[Notifications] Fetch error:", err);
        toast.error("Failed to fetch notifications");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, role]
  );

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Toast on new WS messages
  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      const latest = messages[messages.length - 1];
      if (latest?.action_required) {
        toast(
          (t) => (
            <div className="flex items-start gap-3" onClick={() => toast.dismiss(t.id)}>
              <Bell className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-foreground">New Order Alert</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {latest.message ?? `Order #${latest.order_number} needs attention`}
                </p>
              </div>
            </div>
          ),
          {
            duration: 5000,
            icon: "🔔",
            style: {
              background: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              borderRadius: "14px",
              padding: "12px 14px",
            },
          }
        );
      }
    }
    prevMsgCount.current = messages.length;
  }, [messages]);

  // Merge initial + WS messages
  const displayMessages = useMemo(() => {
    if (!config) return [];
    const map = new Map<number, NotificationMsg>();
    initialOrders.forEach((m) => map.set(m.order_id, m));
    messages.forEach((m: any) => {
      const st = String(m.status ?? "").toUpperCase();
      const nextSt = config.nextStatus[st];
      if (m.action_required && nextSt) {
        map.set(m.order_id, { ...m, status: st, next_status: nextSt, arrived_at: Date.now() });
      } else {
        map.delete(m.order_id);
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.arrived_at ?? 0) - (b.arrived_at ?? 0));
  }, [initialOrders, messages, config]);

  const handleSwipe = useCallback(
    async (msg: NotificationMsg) => {
      setInitialOrders((prev) => prev.filter((m) => m.order_id !== msg.order_id));
      removeMessage(msg.order_id);
      try {
        await updateOrder(msg.order_id, { status: msg.next_status });
        toast.success(`✅ Order #${msg.order_number} → ${msg.next_status}`, {
          style: {
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
            borderRadius: "14px",
          },
        });
      } catch {
        toast.error("Failed to update. Refreshing...");
        fetchOrders(true);
      }
    },
    [removeMessage, fetchOrders]
  );

  // Access guard
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="rounded-full bg-muted p-5 mb-4">
          <Bell className="h-10 w-10 text-muted-foreground opacity-30" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          This page is only available for kitchen staff and waiters.
        </p>
      </div>
    );
  }

  const RoleIcon = config!.icon;

  return (
    <div className="w-full min-h-[calc(100vh-104px)] bg-background">
      <div className="max-w-[640px] mx-auto px-4 pt-6 pb-24 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <RoleIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground leading-none">
                Order Alerts
              </h1>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {config!.label} · Swipe right to action
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {displayMessages.length > 0 && (
              <motion.span
                key={displayMessages.length}
                initial={{ scale: 0.7 }}
                animate={{ scale: 1 }}
                className="flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-primary text-primary-foreground text-xs font-black shadow-md shadow-primary/30"
              >
                {displayMessages.length}
              </motion.span>
            )}
            <button
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
              className="w-9 h-9 rounded-xl border border-border hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {!loading && displayMessages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-2"
          >
            {config!.fetchStatuses.map((status) => {
              const count = displayMessages.filter((m) => m.status === status).length;
              const b = STATUS_BADGE[status];
              return (
                <div key={status} className={`rounded-xl border border-border px-3 py-2.5 flex flex-col gap-0.5 ${b.bg}`}>
                  <span className={`text-xl font-black leading-none ${b.text}`}>{count}</span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider opacity-70 ${b.text}`}>
                    {b.label}
                  </span>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground font-medium animate-pulse">Loading orders…</p>
          </div>
        ) : displayMessages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-3xl"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-lg font-bold text-foreground">All caught up!</p>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-[240px]">
              No actionable orders right now. New alerts appear automatically.
            </p>
            <button
              onClick={() => fetchOrders(true)}
              className="mt-5 flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Check again
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium px-1">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {displayMessages.length} order{displayMessages.length !== 1 ? "s" : ""} need your attention
              </span>
            </div>
            <AnimatePresence initial={false}>
              {displayMessages.map((msg) => (
                <SwipeCard
                  key={msg.order_id}
                  msg={msg}
                  swipeLabel={config!.swipeLabel[msg.status] ?? "Action"}
                  onSwipe={() => handleSwipe(msg)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
