"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Menu, LogOut, ChevronDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Role-based feature tabs (top-level)
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
  ],
  branch_manager: [
    { id: "dashboard", label: "Dashboard" },
    { id: "menu", label: "Menu" },
    { id: "orders", label: "Orders" },
    { id: "inventory", label: "Inventory" },
    { id: "kitchen", label: "Kitchen" },
    { id: "tables", label: "Tables" },
    { id: "reports", label: "Reports" },
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
    { id: "payments", label: "Payments" },
  ],
  kitchen_staff: [
    { id: "dashboard", label: "Dashboard" },
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
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const roleName =
    typeof user.role === "object" && "name" in user.role
      ? user.role.name
      : "waiter";

  const features = FEATURES_BY_ROLE[roleName] || FEATURES_BY_ROLE.waiter;

  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.username;
  const initials = fullName
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  return (
    <>
      <nav className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#0a0e1a]/80 backdrop-blur-xl px-2 sm:px-4 h-16 flex items-center justify-between">
        {/* Left section: hamburger + logo + desktop tabs */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="text-slate-400 hover:text-white hover:bg-white/5 p-1.5 sm:p-2"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-lg sm:text-xl font-bold text-white whitespace-nowrap">
            🍽️ Vayu<span className="text-indigo-400">Tech</span>
          </span>

          {/* Desktop feature tabs */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2 overflow-x-auto ml-14">
            {features.map((f) => (
              <button
                key={f.id}
                onClick={() => onSelectFeature(f.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 whitespace-nowrap",
                  selectedFeature === f.id
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "text-slate-400 hover:text-white hover:bg-white/5",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right section: avatar + role badge + logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile feature dropdown toggle */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1 text-slate-400 hover:text-white"
              aria-label="Toggle feature menu"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>

          {/* Circular avatar */}
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold shadow-[0_0_12px_rgba(99,102,241,0.4)]"
            title={fullName}
          >
            {initials}
          </div>

          {/* Role badge */}
          <span className="hidden xs:inline-block text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 whitespace-nowrap">
            {roleName.replace("_", " ").toUpperCase()}
          </span>

          {/* Logout button – opens modal */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLogoutModal(true)}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 sm:p-2 transition-all duration-200"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>

        {/* Mobile feature menu dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-16 left-0 right-0 bg-[#0d1323] border-b border-white/[0.06] p-2 md:hidden z-40 shadow-lg"
            >
              <div className="flex flex-wrap gap-1 max-h-60 overflow-y-auto">
                {features.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      onSelectFeature(f.id);
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 w-full text-left",
                      selectedFeature === f.id
                        ? "bg-indigo-500/20 text-indigo-400"
                        : "text-slate-400 hover:text-white hover:bg-white/5",
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

      {/* ─── Logout Confirmation Modal using reusable Modal component ─── */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Confirm Logout"
        icon={<AlertTriangle className="h-8 w-8 text-red-400" />}
        description="Are you sure you want to sign out of your account? You will need to log in again to access your dashboard."
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={handleLogout}
        variant="danger"
      />
    </>
  );
}
