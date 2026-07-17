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
    user.is_staff === true || // ✅ Explicitly check for true
    user.is_superuser === true // ✅ Explicitly check for true
  );
}

/** Check a specific codename permission (if you use granular permissions later) */
export function hasPermission(user: UserProfile, codename: string): boolean {
  return getRolePermissions(user).some((p) => p.codename === codename);
}

// lib/permissions.ts
export function canManageKitchen(user: any): boolean {
  if (!user) return false;
  
  // Check if user is superuser or staff
  if (user.is_superuser === true || user.is_staff === true) return true; // ✅ Explicitly check for true
  
  // Check role-based permissions
  const role = user.role?.name?.toLowerCase() || '';
  const adminRoles = ['admin', 'superadmin', 'super_admin'];
  const managerRoles = ['manager', 'branch_manager'];
  
  return adminRoles.includes(role) || managerRoles.includes(role);
}

/** Can the user VIEW ingredients? (all authenticated staff) */
export function canViewIngredients(_user: UserProfile): boolean {
  return true;
}

/** Can the user CREATE / EDIT / DELETE ingredients? (Admin / Manager only) */
export function canManageIngredients(user: UserProfile): boolean {
  return MANAGER_ROLES.has(getRoleName(user)) || user.is_staff === true || user.is_superuser === true; // ✅ Explicitly check for true
}

// Add these after your existing functions

/**
 * Transaction Permissions
 * Only Admin and Managers can view, create, update, and delete transactions
 */

/** Can the user VIEW transactions? (Admin & Managers only) */
export function canViewTransactions(user: UserProfile): boolean {
  if (!user) return false;
  if (user.is_superuser === true) return true; // ✅ Explicitly check for true
  
  const role = getRoleName(user);
  const allowedRoles = ['admin', 'super_admin', 'superadmin', 'manager', 'branch_manager'];
  return allowedRoles.includes(role);
}

/** Can the user CREATE transactions? (Admin & Managers only) */
export function canCreateTransaction(user: UserProfile): boolean {
  if (!user) return false;
  if (user.is_superuser === true) return true; // ✅ Explicitly check for true
  
  const role = getRoleName(user);
  const allowedRoles = ['admin', 'super_admin', 'superadmin', 'manager', 'branch_manager'];
  return allowedRoles.includes(role);
}

/** Can the user UPDATE/EDIT transactions? (Admin & Managers only) */
export function canEditTransaction(user: UserProfile): boolean {
  if (!user) return false;
  if (user.is_superuser === true) return true; // ✅ Explicitly check for true
  
  const role = getRoleName(user);
  const allowedRoles = ['admin', 'super_admin', 'superadmin', 'manager', 'branch_manager'];
  return allowedRoles.includes(role);
}

/** Can the user DELETE transactions? (Admin & Managers only) */
export function canDeleteTransaction(user: UserProfile): boolean {
  if (!user) return false;
  if (user.is_superuser === true) return true; // ✅ Explicitly check for true
  
  const role = getRoleName(user);
  const allowedRoles = ['admin', 'super_admin', 'superadmin', 'manager', 'branch_manager'];
  return allowedRoles.includes(role);
}

/** Combined permission check for all transaction operations */
export function canManageTransactions(user: UserProfile): boolean {
  if (!user) return false;
  if (user.is_superuser === true) return true; // ✅ Explicitly check for true
  
  const role = getRoleName(user);
  const allowedRoles = ['admin', 'super_admin', 'superadmin', 'manager', 'branch_manager'];
  return allowedRoles.includes(role);
}