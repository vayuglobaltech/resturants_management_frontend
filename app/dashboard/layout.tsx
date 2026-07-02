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
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <WebSocketProvider>
      <ToastProvider>
        <div className="min-h-screen bg-[#0a0e1a] flex flex-col">
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

          <div className="flex flex-1 overflow-hidden">
            <DashboardSidebar
              selectedFeature={selectedFeature}
              collapsed={sidebarCollapsed}
              mobileOpen={mobileSidebarOpen}
              onMobileClose={() => setMobileSidebarOpen(false)}
            />

            <main
              className={cn(
                "flex-1 overflow-y-auto p-4 sm:p-6 transition-all duration-300",
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