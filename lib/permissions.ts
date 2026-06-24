import { UserProfile } from "@/context/AuthContext";

type UserRole = {
  id: number;
  name: string;
  permissions?: { id: number; name: string; codename: string }[];
};

// Roles that can manage (create / edit / delete) menu items
const MANAGER_ROLES = new Set([
  "admin",
  "super_admin",
  "superadmin",
  "manager",
  "branch_manager",
]);

/** Returns the raw role name string from the profile (lowercased). */
export function getRoleName(user: UserProfile): string {
  if (user.role && typeof user.role === "object" && "name" in user.role) {
    return (user.role as UserRole).name.toLowerCase();
  }
  if (typeof user.role === "string" && user.role.trim()) {
    return user.role.trim().toLowerCase();
  }
  if (user.is_superuser) return "super_admin";
  if (user.is_staff)     return "admin";
  return "staff";
}

/** Returns the full list of permissions from the role object. */
export function getRolePermissions(
  user: UserProfile
): { id: number; name: string; codename: string }[] {
  if (user.role && typeof user.role === "object" && "permissions" in user.role) {
    return (user.role as UserRole).permissions ?? [];
  }
  return [];
}

/** Can the user VIEW menu items? (all authenticated staff) */
export function canViewMenu(_user: UserProfile): boolean {
  return true;
}

/** Can the user CREATE / EDIT / DELETE menu items? (Admin / Manager only) */
export function canManageMenu(user: UserProfile): boolean {
  return MANAGER_ROLES.has(getRoleName(user)) || !!user.is_staff;
}

/** Check a specific codename permission. */
export function hasPermission(user: UserProfile, codename: string): boolean {
  return getRolePermissions(user).some((p) => p.codename === codename);
}
