// app/dashboard/kitchen-stations/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { KitchenStationList } from "@/components/kitchen/KitchenStationList";
import { KitchenStationForm } from "@/components/kitchen/KitchenStationForm";
import { CookingPot, Plus, X } from "lucide-react";
import { canManageKitchen } from "@/lib/permissions";

export default function KitchenStationsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const canManage = user ? canManageKitchen(user) : false;
  
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingStation, setEditingStation] = useState<any>(null);

  // Guard - redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm">Loading kitchen stations…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials = ([user.first_name, user.last_name].filter(Boolean).join(" ") || user.username)
    .split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  const handleSuccess = () => {
    setShowForm(false);
    setEditingStation(null);
    setRefreshKey(prev => prev + 1);
  };

  const handleEdit = (station: any) => {
    setEditingStation(station);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingStation(null);
  };

  const handleLogout = () => { 
    logout(); 
    router.push("/auth/login"); 
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" />

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#0a0e1a]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-sm">
              ← Dashboard
            </Link>
            <span className="text-white/20">|</span>
            <span className="font-bold text-slate-100 flex items-center gap-2">
              <CookingPot size={20} /> Kitchen Stations
            </span>
          </div>
          <div className="flex items-center gap-3">
            {!canManage && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/25 uppercase tracking-wide">
                View Only
              </span>
            )}
            {canManage && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/25 uppercase tracking-wide">
                Manager
              </span>
            )}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
            <button onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-lg text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 tracking-tight flex items-center gap-3">
              <CookingPot size={28} />
              Kitchen Stations
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Manage your kitchen stations and their capacities
            </p>
          </div>
          
          {canManage && (
            <button
              onClick={() => {
                if (showForm) {
                  handleCancel();
                } else {
                  setShowForm(true);
                  setEditingStation(null);
                }
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-600 shadow-[0_4px_16px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_24px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-200"
            >
              {showForm ? (
                <X size={18} />
              ) : (
                <Plus size={18} />
              )}
              {showForm ? "Cancel" : "Add Station"}
            </button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-8 animate-[fadeUp_0.3s_ease_both]">
            <KitchenStationForm
              branchId={user?.branch?.id || 1}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
              initialData={editingStation}
            />
          </div>
        )}

        {/* Station List */}
        <KitchenStationList 
          onEdit={handleEdit}
          refreshTrigger={refreshKey}
        />
      </main>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}