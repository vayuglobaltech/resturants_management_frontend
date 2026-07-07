"use client";

import { useState, ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DashboardNavbar } from "@/components/dashboard/Navbar";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { WebSocketProvider } from "@/context/WebSocketContext";
import { ToastProvider } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Menu } from "lucide-react";

/*
 * ── Layout constants ──────────────────────────────────────────────────────────
 *  Navbar = h-16 top row (64px) + h-10 tab row (40px) = 104px total.
 *  Sidebar expanded  = w-64 = 256px
 *  Sidebar collapsed = w-16 = 64px
 *
 *  The FAB button sits at top-[112px] (104 + 8px gap) to clear the navbar.
 */
const NAVBAR_H = 104; // px – must match Navbar.tsx rows
const FAB_TOP  = NAVBAR_H + 8; // px – small gap below navbar

// ─── Path → feature helper ────────────────────────────────────────────────────
const featureFromPath = (path: string) => {
  if (path === "/dashboard") return "dashboard";
  const seg = path.split("/").filter(Boolean);
  return seg.length >= 2 ? seg[1] : "dashboard";
};

// ─── Lightweight media-query hook ────────────────────────────────────────────
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [selectedFeature, setSelectedFeature] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // desktop: expanded by default
  const [drawerOpen, setDrawerOpen]             = useState(false); // mobile drawer: closed by default

  const isMobile = useMediaQuery("(max-width: 767px)");

  // Sync selected feature with the current URL
  useEffect(() => {
    setSelectedFeature(featureFromPath(pathname));
  }, [pathname]);

  // On breakpoint change: keep desktop sidebar always present; close mobile drawer
  useEffect(() => {
    if (!isMobile) {
      setDrawerOpen(false); // desktop doesn't use the drawer
    }
  }, [isMobile]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <div className="w-8 h-8 rounded-full border-[3px] border-indigo-500 border-t-transparent animate-spin" />
        <span className="text-xs text-muted-foreground animate-pulse">Loading…</span>
      </div>
    );
  }
  if (!user) return null;

  return (
    <WebSocketProvider>
      <ToastProvider>
        <div className="min-h-screen bg-background text-foreground flex flex-col print:bg-white print:block transition-colors duration-200">

          {/* ── Sticky navbar ─────────────────────────────────────────────────── */}
          <div className="print:hidden">
            <DashboardNavbar
              user={user}
              selectedFeature={selectedFeature}
              onSelectFeature={(id) => {
                setSelectedFeature(id);
                router.push(id === "dashboard" ? "/dashboard" : `/dashboard/${id}`);
              }}
            />
          </div>

          {/* ── Page body ─────────────────────────────────────────────────────── */}
          <div className="flex flex-1 overflow-hidden print:overflow-visible print:block">

            {/* ── Desktop sidebar (static, never overlays content) ─────────────── */}
            <div className="hidden md:block print:hidden flex-shrink-0">
              <DashboardSidebar
                selectedFeature={selectedFeature}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
                isMobile={false}
              />
            </div>

            {/* ── Mobile sidebar drawer ─────────────────────────────────────────── */}
            <AnimatePresence>
              {isMobile && drawerOpen && (
                <>
                  {/* Blurred backdrop – tap to close */}
                  <motion.div
                    key="backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
                    style={{ top: NAVBAR_H }}   // ← start backdrop BELOW navbar
                    onClick={() => setDrawerOpen(false)}
                    aria-hidden="true"
                  />

                  {/* Drawer panel */}
                  <motion.div
                    key="drawer"
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "-100%" }}
                    transition={{ type: "spring", damping: 28, stiffness: 320 }}
                    className="fixed left-0 z-40 md:hidden"
                    style={{ top: NAVBAR_H, bottom: 0 }}  // ← aligned below navbar
                  >
                    <DashboardSidebar
                      selectedFeature={selectedFeature}
                      collapsed={false}
                      onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
                      onClose={() => setDrawerOpen(false)}
                      isMobile={true}
                    />
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/*
             * ── Floating action button (mobile, drawer closed) ─────────────────
             *  Positioned at FAB_TOP (104+8 = 112px) to sit just below the navbar.
             */}
            <AnimatePresence>
              {isMobile && !drawerOpen && (
                <motion.button
                  key="fab"
                  initial={{ opacity: 0, scale: 0.65 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.65 }}
                  transition={{ type: "spring", damping: 18, stiffness: 280 }}
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open navigation menu"
                  style={{ top: FAB_TOP }}
                  className="fixed left-4 z-30 md:hidden w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <Menu className="h-5 w-5" />
                </motion.button>
              )}
            </AnimatePresence>

            {/*
             * ── Main scrollable content ────────────────────────────────────────
             *  On desktop: left margin = sidebar width (w-64 or w-16).
             *  On mobile:  no left margin – drawer overlays content.
             */}
            <main
              className={cn(
                "flex-1 overflow-y-auto p-4 sm:p-6",
                "transition-all duration-300 ease-in-out",
                "print:ml-0 print:p-0 print:overflow-visible print:block",
                // Desktop margin shifts with collapse state
                !isMobile && (sidebarCollapsed ? "md:ml-16" : "md:ml-64")
              )}
            >
              {children}
            </main>
          </div>

        </div>
      </ToastProvider>
    </WebSocketProvider>
  );
}