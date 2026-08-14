import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { listOrders, getOrderStatusLogs } from "@/lib/ordersApi";
import { useWebSocket } from "@/hooks/useWebSocket";

const KITCHEN_STATUSES = ["CONFIRMED", "QUEUED", "PREPARING"];
const WAITER_STATUSES  = ["PENDING", "READY"];

export function useNotifCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const { messages } = useWebSocket();
  const prevMsgCount = useRef(0);

  // Derive role from the user object
  const role = useMemo(() => {
    const rawRole =
      typeof user?.role === "object" && user.role !== null && "name" in user.role
        ? String(user.role.name).toLowerCase()
        : typeof user?.role === "string"
        ? user.role.toLowerCase()
        : (user?.designation?.toLowerCase().replace(/\s+/g, "_")) || "";

    if (rawRole === "kitchen_staff" || rawRole.includes("kitchen")) return "kitchen_staff";
    if (rawRole === "waiter" || rawRole.includes("waiter")) return "waiter";
    if (rawRole === "branch_manager" || rawRole.includes("manager") || rawRole.includes("branch")) return "branch_manager";
    return null;
  }, [user]);

  const actionableStatuses = role === "kitchen_staff" ? KITCHEN_STATUSES : WAITER_STATUSES;

  const fetchCount = useCallback(async () => {
    if (!role) { setCount(0); return; }
    try {
      let total = 0;
      if (role === "branch_manager") {
        const logsData: any = await getOrderStatusLogs();
        const logs = Array.isArray(logsData) ? logsData : (logsData.results || []);
        total = logs.length;
      } else {
        for (const status of actionableStatuses) {
          const orders = await listOrders(undefined, { status, page_size: 100 });
          total += orders.length;
        }
      }
      setCount(total);
    } catch {
      /* silent */
    }
  }, [role, actionableStatuses]);

  // Initial fetch
  useEffect(() => { 
    fetchCount(); 
  }, [fetchCount]);

  // Re-fetch when new WebSocket messages arrive
  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      fetchCount();
    }
    prevMsgCount.current = messages.length;
  }, [messages, fetchCount]);

  // Fallback polling (every 30 seconds) to ensure it stays completely in sync
  useEffect(() => {
    if (!role) return;
    const interval = setInterval(() => {
      fetchCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [role, fetchCount]);

  return { count, role };
}
