// hooks/usePermissions.ts
import { useAuth } from "@/context/AuthContext";

export function useCanModifyOrders() {
  const { user } = useAuth();
  if (!user) return false;
  const role = user.role && typeof user.role === "object" ? user.role.name : null;
  return ["admin", "branch_manager", "waiter", "cashier", "kitchen_staff"].includes(role);
}

export function useIsKitchenStaff() {
  const { user } = useAuth();
  if (!user) return false;
  const role = user.role && typeof user.role === "object" ? user.role.name : null;
  return role === "kitchen_staff";
}

export function useIsCashier() {
  const { user } = useAuth();
  if (!user) return false;
  const role = user.role && typeof user.role === "object" ? user.role.name : null;
  return role === "cashier";
}