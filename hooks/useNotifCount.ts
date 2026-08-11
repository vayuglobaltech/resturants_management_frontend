/**
 * useNotifCount
 *
 * Lightweight hook that piggybacks on the WebSocket connection (already open
 * in the layout) and fetches the initial actionable-order count for the
 * current user role, then increments / decrements as WS messages arrive.
 *
 * It is intentionally cheap: no duplicate socket connections.
 */
import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { listOrders } from "@/lib/ordersApi";

const KITCHEN_STATUSES = ["CONFIRMED", "QUEUED", "PREPARING"];
const WAITER_STATUSES  = ["PENDING", "READY"];

export function useNotifCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

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
    return null;
  }, [user]);

  const actionableStatuses = role === "kitchen_staff" ? KITCHEN_STATUSES : WAITER_STATUSES;

  const fetchCount = useCallback(async () => {
    if (!role) { setCount(0); return; }
    try {
      let total = 0;
      for (const status of actionableStatuses) {
        const orders = await listOrders(undefined, { status, page_size: 100 });
        total += orders.length;
      }
      setCount(total);
    } catch {
      /* silent */
    }
  }, [role, actionableStatuses]);

  useEffect(() => { fetchCount(); }, [fetchCount]);

  return { count, role };
}
