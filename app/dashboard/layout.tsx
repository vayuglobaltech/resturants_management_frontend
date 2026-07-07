"use client";

import { useState, ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DashboardNavbar } from "@/components/dashboard/Navbar";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { WebSocketProvider } from "@/context/WebSocketContext";
import { ToastProvider } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const getFeatureFromPath = (path: string): string => {
  if (path === "/dashboard") return "dashboard";
  const segments = path.split("/").filter(Boolean);
  if (segments.length >= 2) {
    return segments[1];
  }
  return "dashboard";
};

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [selectedFeature, setSelectedFeature] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const feature = getFeatureFromPath(pathname);
    setSelectedFeature(feature);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <WebSocketProvider>
      <ToastProvider>
        <div className="min-h-screen bg-background text-foreground flex flex-col print:bg-white print:block transition-colors duration-200">
          <div className="print:hidden">
            <DashboardNavbar
              user={user}
            selectedFeature={selectedFeature}
            onSelectFeature={(id) => {
              setSelectedFeature(id);
              if (id === "dashboard") {
                router.push("/dashboard");
              } else {
                router.push(`/dashboard/${id}`);
              }
            }}
            onToggleSidebar={() => {
              if (window.innerWidth < 768) {
                setMobileSidebarOpen(!mobileSidebarOpen);
              } else {
                setSidebarCollapsed(!sidebarCollapsed);
              }
            }}
          />
          </div>

          <div className="flex flex-1 overflow-hidden print:overflow-visible print:block">
            <div className="print:hidden">
              <DashboardSidebar
                selectedFeature={selectedFeature}
                collapsed={sidebarCollapsed}
                mobileOpen={mobileSidebarOpen}
                onMobileClose={() => setMobileSidebarOpen(false)}
              />
            </div>

            <main
              className={cn(
                "flex-1 overflow-y-auto p-4 sm:p-6 transition-all duration-300 print:ml-0 print:p-0 print:overflow-visible print:block",
                sidebarCollapsed ? "md:ml-16" : "md:ml-64"
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