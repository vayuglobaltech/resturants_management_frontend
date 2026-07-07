"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { LogOut, User, Settings, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";

// ─── Navbar height constant (top-row h-16=64px + tab-row h-10=40px = 104px)
// We export this so Sidebar and Layout can use it for consistent positioning.
export const NAVBAR_HEIGHT = 104; // px
export const NAVBAR_HEIGHT_CLASS = "top-[104px]"; // Tailwind JIT-safe string

// ─── Role-based feature tabs ──────────────────────────────────────────────────
const FEATURES_BY_ROLE: Record<string, { id: string; label: string }[]> = {
  admin: [
    { id: "dashboard", label: "Dashboard" },
    { id: "menu", label: "Menu" },
    { id: "orders", label: "Orders" },
    { id: "inventory", label: "Inventory" },
    { id: "kitchen", label: "Kitchen" },
    { id: "tables", label: "Tables" },
    { id: "payments", label: "Payments" },
    { id: "users", label: "Users" },
    { id: "reports", label: "Reports" },
    { id: "discounts", label: "Discounts" },
  ],
  branch_manager: [
    { id: "dashboard", label: "Dashboard" },
    { id: "users", label: "Employee" },
    { id: "menu", label: "Menu" },
    { id: "orders", label: "Orders" },
    { id: "inventory", label: "Inventory" },
    { id: "kitchen", label: "Kitchen" },
    { id: "tables", label: "Tables" },
    { id: "payments", label: "Payments" },
    { id: "reports", label: "Reports" },
    { id: "discounts", label: "Discounts" },
  ],
  waiter: [
    { id: "dashboard", label: "Dashboard" },
    { id: "menu", label: "Menu" },
    { id: "orders", label: "Orders" },
    { id: "tables", label: "Tables" },
  ],
  cashier: [
    { id: "dashboard", label: "Dashboard" },
    { id: "orders", label: "Orders" },
    { id: "menu", label: "Menu" },
    { id: "payments", label: "Payments" },
  ],
  kitchen_staff: [
    { id: "dashboard", label: "Dashboard" },
    { id: "orders", label: "Orders" },
    { id: "menu", label: "Menu" },
    { id: "kitchen", label: "Kitchen" },
  ],
};

interface NavbarProps {
  user: any;
  selectedFeature: string;
  onSelectFeature: (id: string) => void;
}

export function DashboardNavbar({ user, selectedFeature, onSelectFeature }: NavbarProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const roleName =
    typeof user.role === "object" && "name" in user.role
      ? user.role.name
      : "waiter";

  const features = FEATURES_BY_ROLE[roleName] || FEATURES_BY_ROLE.waiter;

  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
  const initials = fullName
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
    router.push("/auth/login");
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Scroll the active tab into view whenever it changes
  useEffect(() => {
    if (!tabsRef.current) return;
    const activeBtn = tabsRef.current.querySelector("[data-active='true']") as HTMLElement | null;
    activeBtn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selectedFeature]);

  return (
    <>
      {/*
       * ── Sticky Navbar ────────────────────────────────────────────────────────
       *  Total height = h-16 (top row) + h-10 (tab row) = 64 + 40 = 104 px.
       *  This value is exported as NAVBAR_HEIGHT so Sidebar / Layout can align.
       */}
      <nav
        className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border transition-colors duration-200"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* ── Top row (64px) ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between h-16 px-3 sm:px-5">
          {/* Logo */}
          <span className="text-lg sm:text-xl font-bold text-foreground whitespace-nowrap select-none">
            🍽️ Vayu<span className="text-indigo-600 dark:text-indigo-400">Tech</span>
          </span>

          {/* Right-side actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Theme toggle – animated icon swap */}
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ rotate: -60, scale: 0.6, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 60, scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="flex"
                >
                  {theme === "dark" ? (
                    <Sun className="h-5 w-5 text-amber-400" />
                  ) : (
                    <Moon className="h-5 w-5 text-indigo-500" />
                  )}
                </motion.span>
              </AnimatePresence>
            </button>

            {/* Notification bell */}
            <NotificationBell />

            {/* Role badge – hidden on very small screens */}
            <span className="hidden sm:inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/20 dark:text-indigo-300 border border-indigo-500/20 whitespace-nowrap font-semibold tracking-wide">
              {roleName.replace(/_/g, " ").toUpperCase()}
            </span>

            {/* Avatar + dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen((p) => !p)}
                aria-label="Open profile menu"
                aria-expanded={isProfileOpen}
                aria-haspopup="true"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-bold shadow-md hover:shadow-[0_0_18px_rgba(99,102,241,0.5)] hover:scale-105 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {initials}
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.94 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50"
                    role="menu"
                  >
                    {/* Arrow pip */}
                    <div className="absolute -top-[6px] right-3.5 w-3 h-3 rotate-45 bg-card border-l border-t border-border" />

                    {/* User info */}
                    <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{fullName}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>

                    {/* Links */}
                    <div className="p-1.5">
                      <Link
                        href="/dashboard/profile"
                        role="menuitem"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <User className="h-4 w-4 text-muted-foreground" /> Profile
                      </Link>
                      <Link
                        href="/dashboard/settings"
                        role="menuitem"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Settings className="h-4 w-4 text-muted-foreground" /> Settings
                      </Link>
                      <button
                        role="menuitem"
                        onClick={() => { setIsProfileOpen(false); setShowLogoutModal(true); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-red-500 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="h-4 w-4" /> Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/*
         * ── Feature tabs row (40px = h-10) ───────────────────────────────────
         *  Fixed height ensures navbar always totals exactly 104px.
         */}
        <div
          ref={tabsRef}
          role="tablist"
          aria-label="Feature navigation"
          className="flex items-center h-10 overflow-x-auto gap-0.5 px-2 sm:px-4 border-t border-border/30 scrollbar-hide"
        >
          {features.map((f) => {
            const isActive = selectedFeature === f.id;
            return (
              <button
                key={f.id}
                role="tab"
                aria-selected={isActive}
                data-active={isActive}
                onClick={() => {
                  onSelectFeature(f.id);
                  router.push(f.id === "dashboard" ? "/dashboard" : `/dashboard/${f.id}`);
                }}
                className={cn(
                  "relative h-full px-3 sm:px-3.5 text-xs sm:text-[13px] font-medium whitespace-nowrap",
                  "transition-colors duration-150 flex-shrink-0",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500",
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md"
                )}
              >
                {f.label}
                {/* Sliding bottom underline for active tab */}
                {isActive && (
                  <motion.span
                    layoutId="nav-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500 dark:bg-indigo-400"
                    transition={{ type: "spring", stiffness: 450, damping: 38 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Logout confirmation */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Confirm Logout"
        icon={<LogOut className="h-8 w-8 text-red-500 dark:text-red-400" />}
        description="Are you sure you want to sign out? You'll need to log in again to access your dashboard."
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={handleLogout}
        variant="danger"
      />
    </>
  );
}