// hooks/usePermissions.ts
import { useAuth } from "@/context/AuthContext";

// ✅ Helper function to safely get user role as string
const getUserRoleString = (user: any): string => {
  if (!user) return '';
  if (!user.role) return '';
  if (typeof user.role === 'object' && 'name' in user.role) {
    return String(user.role.name);
  }
  if (typeof user.role === 'string') {
    return user.role;
  }
  return '';
};

export function useCanModifyOrders() {
  const { user } = useAuth();
  if (!user) return false;
  const role = getUserRoleString(user);
  return ["admin", "branch_manager", "waiter", "cashier", "kitchen_staff"].includes(role);
}

export function useIsKitchenStaff() {
  const { user } = useAuth();
  if (!user) return false;
  const role = getUserRoleString(user);
  return role === "kitchen_staff";
}

export function useIsCashier() {
  const { user } = useAuth();
  if (!user) return false;
  const role = getUserRoleString(user);
  return role === "cashier";
}