// hooks/usePermissions.ts
import { useAuth } from "@/context/AuthContext";

export function useCanModifyOrders() {
  const { user } = useAuth();
  if (!user) return false;
  const role = user.role && typeof user.role === "object" ? user.role.name : null;
  return role === "admin" || role === "branch_manager" || role === "waiter";
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