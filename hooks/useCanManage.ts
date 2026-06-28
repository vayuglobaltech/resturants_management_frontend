// hooks/useCanManage.ts
import { useAuth } from "@/context/AuthContext";
import { isAdminOrManager } from "@/lib/permissions";

export function useCanManage() {
  const { user } = useAuth();
  return user ? isAdminOrManager(user) : false;
}