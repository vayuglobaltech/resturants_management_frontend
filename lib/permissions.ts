// lib/permissions.ts
import { UserProfile } from "@/context/AuthContext";

type UserRole = {
  id: number;
  name: string;
  permissions?: { id: number; name: string; codename: string }[];
};

const MANAGER_ROLES = new Set([
  "admin",
  "super_admin",
  "superadmin",
  "manager",
  "branch_manager",
]);

export function getRoleName(user: UserProfile): string {
  if (user.role && typeof user.role === "object" && "name" in user.role) {
    return (user.role as UserRole).name.toLowerCase();
  }
  if (typeof user.role === "string" && user.role.trim()) {
    return user.role.trim().toLowerCase();
  }
  if (user.is_superuser) return "super_admin";
  if (user.is_staff) return "admin";
  return "staff";
}

export function getRolePermissions(
  user: UserProfile
): { id: number; name: string; codename: string }[] {
  if (user.role && typeof user.role === "object" && "permissions" in user.role) {
    return (user.role as UserRole).permissions ?? [];
  }
  return [];
}

/** Can the user view menu items? (all authenticated staff) */
export function canViewMenu(_user: UserProfile): boolean {
  return true;
}

/** Can the user CREATE / EDIT / DELETE menu items? (Admin / Manager only) */
export function canManageMenu(user: UserProfile): boolean {
  return isAdminOrManager(user);
}

/** Check if user is Admin or Branch Manager (can perform write operations) */
export function isAdminOrManager(user: UserProfile): boolean {
  const role = getRoleName(user);
  return (
    role === "admin" ||
    role === "branch_manager" ||
    user.is_staff ||
    user.is_superuser
  );
}

/** Check a specific codename permission (if you use granular permissions later) */
export function hasPermission(user: UserProfile, codename: string): boolean {
  return getRolePermissions(user).some((p) => p.codename === codename);
}