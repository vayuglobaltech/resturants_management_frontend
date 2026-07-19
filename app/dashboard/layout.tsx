"use client";

import { useState, ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DashboardNavbar } from "@/components/dashboard/Navbar";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { WebSocketProvider } from "@/context/WebSocketContext";
import { ToastProvider } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { getRoleName } from "@/lib/permissions";

const featureFromPath = (path: string) => {
  if (path === "/dashboard") return "dashboard";
  const seg = path.split("/").filter(Boolean);
  return seg.length >= 2 ? seg[1] : "dashboard";
};

// ─── Media query hook ──────────────────────────────────────────────────
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);
  return matches;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [selectedFeature, setSelectedFeature] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // expanded by default
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const hideSidebarPages = ['/dashboard/menu', '/dashboard/users','/dashboard','/dashboard/discounts'];
  const shouldHideSidebar = hideSidebarPages.includes(pathname);
  const roleName = user ? getRoleName(user) : null;
  const dashboardRedirect =
    pathname === "/dashboard"
      ? roleName === "waiter"
        ? "/dashboard/orders"
        : roleName === "cashier"
          ? "/dashboard/payments"
          : null
      : null;

  // ── Open mobile drawer by default ────────────────────────────────
  useEffect(() => {
    if (isMobile) {
      setMobileOpen(true);
    } else {
      setMobileOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    setSelectedFeature(featureFromPath(pathname));
  }, [pathname]);

  useEffect(() => {
    if (!isLoading && user && dashboardRedirect) {
      router.replace(dashboardRedirect);
    }
  }, [dashboardRedirect, isLoading, router, user]);

  const toggleSidebar = () => setSidebarCollapsed((p) => !p);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <div className="w-8 h-8 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
        <span className="text-xs text-muted-foreground animate-pulse">Loading…</span>
      </div>
    );
  }
  if (!user) return null;
  if (dashboardRedirect) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <div className="w-8 h-8 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
        <span className="text-xs text-muted-foreground animate-pulse">
          Redirecting…
        </span>
      </div>
    );
  }

  return (
    // <WebSocketProvider>
      <ToastProvider>
        <div className="min-h-screen bg-background text-foreground flex flex-col print:bg-white print:block transition-colors duration-200">
          {/* Navbar */}
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

          <div className="flex flex-1 overflow-hidden mt-8 print:overflow-visible print:block">
            {/* Sidebar */}
            {/* Sidebar with conditional rendering */}
      {!shouldHideSidebar && (
        <div className="print:hidden mt-20">
          <DashboardSidebar
            selectedFeature={selectedFeature}
            collapsed={sidebarCollapsed}
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
            onToggleCollapse={toggleSidebar}
          />
        </div>
      )}

            {/* Main content – responsive margins */}
            <main
              className={cn(
                "flex-1 overflow-y-auto p-4 sm:p-6 mt-20",
                "transition-all duration-300 ease-in-out",
                "print:ml-0 print:p-0 print:overflow-visible print:block",
                !shouldHideSidebar && sidebarCollapsed
                  ? "ml-10 md:ml-11"
                  : !shouldHideSidebar && "ml-36 md:ml-40",
                // When sidebar is hidden, no left margin
                shouldHideSidebar && "ml-0"
              )}
            >
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
  );
    {/* </WebSocketProvider> */}
}
