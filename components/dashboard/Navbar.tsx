"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Menu, LogOut, ChevronDown, User, Settings, Sparkles, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { NotificationBell } from "../NotificationBell";

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
    { id: "discounts", label: "Discounts" }
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
    { id: "discounts", label: "Discounts" }
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
  onToggleSidebar: () => void;
}

export function DashboardNavbar({
  user,
  selectedFeature,
  onSelectFeature,
  onToggleSidebar,
}: NavbarProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <nav className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl px-2 sm:px-4 h-16 flex items-center justify-between transition-colors duration-200">
        {/* Left section */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 sm:p-2"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-lg sm:text-xl font-bold text-foreground whitespace-nowrap">
            🍽️ Vayu<span className="text-indigo-600 dark:text-indigo-400">Tech</span>
          </span>
          <div className="hidden md:flex items-center gap-1 lg:gap-2 overflow-x-auto ml-14">
            {features.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  onSelectFeature(f.id);
                  router.push(f.id === "dashboard" ? "/dashboard" : `/dashboard/${f.id}`);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 whitespace-nowrap",
                  selectedFeature === f.id
                    ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 sm:p-2 rounded-xl transition-all duration-200"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-amber-400 animate-pulse" />
            ) : (
              <Moon className="h-5 w-5 text-indigo-600" />
            )}
          </Button>

          {/* Notification Bell */}
          <NotificationBell/>

          {/* Mobile feature dropdown toggle */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Toggle feature menu"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>

          {/* Avatar with dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-650 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold shadow-[0_0_12px_rgba(99,102,241,0.3)] hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all focus:outline-none"
              aria-label="Profile menu"
            >
              {initials}
            </button>

            {/* Dropdown menu */}
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">{fullName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-500/20 dark:border-indigo-500/30">
                      {roleName.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                  <div className="p-1">
                    <Link
                      href="/dashboard/profile"
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-foreground/80 hover:bg-muted transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      Profile
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-white/80 hover:bg-muted transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        setShowLogoutModal(true);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-500 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Role badge (hidden on small) */}
          <span className="hidden xs:inline-block text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-650 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-500/20 dark:border-indigo-500/30 whitespace-nowrap">
            {roleName.replace("_", " ").toUpperCase()}
          </span>
        </div>

        {/* Mobile feature menu dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-16 left-0 right-0 bg-card border-b border-border p-2 md:hidden z-40 shadow-lg"
            >
              <div className="flex flex-wrap gap-1 max-h-60 overflow-y-auto">
                {features.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      onSelectFeature(f.id);
                      setMobileMenuOpen(false);
                      router.push(f.id === "dashboard" ? "/dashboard" : `/dashboard/${f.id}`);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 w-full text-left",
                      selectedFeature === f.id
                        ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ─── Logout Confirmation Modal ─── */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Confirm Logout"
        icon={<LogOut className="h-8 w-8 text-red-500 dark:text-red-400" />}
        description="Are you sure you want to sign out of your account? You will need to log in again to access your dashboard."
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={handleLogout}
        variant="danger"
      />
    </>
  );
}