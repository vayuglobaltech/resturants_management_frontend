// components/kitchen/KitchenStationList.tsx
"use client";
import React, { useState, useEffect } from "react";
import { CookingPot, Edit, Trash2, EyeOff, Eye, RefreshCw, Undo2, Archive, Filter } from "lucide-react";
import { KitchenStation } from "@/hooks/useKitchenStations";
import { useKitchenStations } from "@/hooks/useKitchenStations";
import { canManageKitchen } from "@/lib/permissions";
import { useAuth } from "@/context/AuthContext";

interface KitchenStationListProps {
  onEdit?: (station: KitchenStation) => void;
  refreshTrigger?: number;
}

export function KitchenStationList({ onEdit, refreshTrigger = 0 }: KitchenStationListProps) {
  const { user } = useAuth();
  const canManage = user ? canManageKitchen(user) : false;

  // Use the hook - Show active stations by default
  const {
    stations,
    loading,
    error,
    filters,
    setFilters,
    toggleStatus,
    deactivateStation,
    fetchStations,
  } = useKitchenStations({ is_active: true });

  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KitchenStation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  
  // Filter states
  const [showActive, setShowActive] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ ...filters, search: search || undefined });
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Refresh when trigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchStations();
    }
  }, [refreshTrigger, fetchStations]);

  // ─── Toggle Status ───
  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    if (!canManage) {
      console.warn("User cannot manage stations");
      return;
    }
    
    setActionLoading(id);
    setLocalError(null);
    setSuccessMessage(null);
    try {
      const newStatus = !currentStatus;
      console.log(`🔄 TOGGLE ONLY: Station ${id} from ${currentStatus} to ${newStatus}`);
      
      const result = await toggleStatus(id, currentStatus);
      console.log("Toggle result:", result);
      
      setSuccessMessage(`Station ${newStatus ? 'activated' : 'deactivated'} successfully!`);
    } catch (err: any) {
      console.error("Toggle error:", err);
      if (err.detail) {
        setLocalError(err.detail);
      } else if (err.message) {
        setLocalError(err.message);
      } else {
        setLocalError("Failed to toggle status. Please try again.");
      }
      await fetchStations();
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Delete Station ───
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setLocalError(null);
    setSuccessMessage(null);
    try {
      console.log(`🗑️ DELETING Station ${deleteTarget.id} - ${deleteTarget.name}`);
      
      await deactivateStation(deleteTarget.id);
      
      setSuccessMessage(`Station "${deleteTarget.name}" deleted successfully!`);
      setDeleteTarget(null);
    } catch (err: any) {
      console.error("Delete error:", err);
      setLocalError(err.message || "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  // ─── Clear Filters ───
  const handleClearFilters = () => {
    setSearch("");
    setShowActive(true);
    setShowDeleted(false);
    setShowAll(false);
    setFilters({ is_active: true });
  };

  // ─── Filter Handlers ───
  const handleShowActive = () => {
    setShowActive(true);
    setShowDeleted(false);
    setShowAll(false);
    setFilters({ is_active: true });
  };

  const handleShowDeleted = () => {
    setShowActive(false);
    setShowDeleted(true);
    setShowAll(false);
    setFilters({ is_active: false });
  };

  const handleShowAll = () => {
    setShowActive(false);
    setShowDeleted(false);
    setShowAll(true);
    setFilters({ is_active: undefined });
  };

  // ─── Get Filter Label ───
  const getFilterLabel = () => {
    if (showActive) return "Active Stations";
    if (showDeleted) return "Deleted Stations";
    if (showAll) return "All Stations";
    return "Stations";
  };

  // ─── Loading State ───
  if (loading && stations.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm">Loading stations...</p>
        </div>
      </div>
    );
  }

  // ─── Render ───
  return (
    <div className="space-y-6">
      {/* ─── Success Message ─── */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm flex justify-between items-center animate-fadeDown">
          <span>✅ {successMessage}</span>
          <button 
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400/60 hover:text-emerald-400"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── Error Message ─── */}
      {(error || localError) && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm flex justify-between items-center">
          <span>⚠️ {error || localError}</span>
          <button 
            onClick={() => {
              setLocalError(null);
            }}
            className="text-red-400/60 hover:text-red-400"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── Search and Filters ─── */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="🔍 Search stations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-100 placeholder-slate-500 text-sm outline-none transition-all focus:border-indigo-500/70 focus:bg-white/[0.08] focus:ring-2 focus:ring-indigo-500/15"
          />
        </div>
        <button
          onClick={handleClearFilters}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all flex items-center gap-2"
        >
          <RefreshCw size={16} /> Clear
        </button>
      </div>

      {/* ─── Filter Tabs ─── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2 mr-2">
          <Filter size={14} className="text-slate-500" />
          <span className="text-xs text-slate-500 font-medium">Filter:</span>
        </div>
        
        <button
          onClick={handleShowActive}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
            showActive
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-white/[0.05] text-slate-400 border border-white/[0.08] hover:bg-white/[0.08]"
          }`}
        >
          <Eye size={14} /> Active
        </button>
        
        <button
          onClick={handleShowDeleted}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
            showDeleted
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "bg-white/[0.05] text-slate-400 border border-white/[0.08] hover:bg-white/[0.08]"
          }`}
        >
          <Archive size={14} /> Deleted
        </button>
        
        <button
          onClick={handleShowAll}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
            showAll
              ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
              : "bg-white/[0.05] text-slate-400 border border-white/[0.08] hover:bg-white/[0.08]"
          }`}
        >
          📋 All
        </button>
        
        {/* ─── Count Display ─── */}
        <span className="text-xs text-slate-500 ml-2">
          {stations.length} station{stations.length !== 1 ? 's' : ''}
          {showActive && (
            <span className="ml-1 text-emerald-400/70">(Active)</span>
          )}
          {showDeleted && (
            <span className="ml-1 text-red-400/70">(Deleted)</span>
          )}
          {showAll && (
            <span className="ml-1 text-indigo-400/70">
              (Active: {stations.filter(s => s.is_active).length} | Deleted: {stations.filter(s => !s.is_active).length})
            </span>
          )}
        </span>
      </div>

      {/* ─── Info Box ─── */}
      {canManage && (
        <div className="px-4 py-3 rounded-xl bg-blue-500/5 border border-blue-500/15 text-blue-400/80 text-sm flex items-center gap-2">
          💡 <span>
            Use <strong>Deactivate</strong> to hide from active list or <strong>Activate</strong> to make it available.<br />
            Use the filter tabs above to switch between Active, Deleted, or All stations.
          </span>
        </div>
      )}

      {/* ─── Permission Notice ─── */}
      {!canManage && (
        <div className="px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-amber-400/90 text-sm flex items-center gap-2">
          🔒 You have <strong>read-only</strong> access. Contact an Admin or Manager to make changes.
        </div>
      )}

      {/* ─── Station Cards Grid ─── */}
      {stations.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl block mb-4">🍳</span>
          <p className="text-slate-400 text-lg">
            No {getFilterLabel().toLowerCase()} found
          </p>
          <p className="text-slate-500 text-sm mt-1">
            {search ? "Try a different search term." : 
             showDeleted ? "No deleted stations found." : 
             "Create your first station to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {stations.map((station) => {
            const isLoading = actionLoading === station.id;
            const isDeleted = !station.is_active;
            
            return (
              <div
                key={station.id}
                className={`group relative p-6 rounded-2xl border transition-all duration-300 ${
                  station.is_active
                    ? "border-indigo-500/20 bg-indigo-500/10 hover:shadow-[0_8px_30px_rgba(99,102,241,0.15)] hover:-translate-y-1"
                    : "border-red-500/20 bg-red-500/5 opacity-70 hover:opacity-90"
                }`}
              >
                {/* ─── Status Badge ─── */}
                <div
                  className={`absolute top-4 right-4 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    station.is_active
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                  }`}
                >
                  {station.is_active ? "🟢 Active" : "🔴 Deleted"}
                </div>

                {/* ─── Deleted Badge ─── */}
                {isDeleted && (
                  <div className="absolute top-14 right-4 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400 border border-red-500/20">
                    🗑️ Deleted
                  </div>
                )}

                {/* ─── Content ─── */}
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">{isDeleted ? "🗑️" : "🍳"}</span>
                  <div className="flex-1">
                    <h3 className={`text-lg font-bold transition-colors ${
                      station.is_active 
                        ? "text-slate-100 group-hover:text-indigo-300" 
                        : "text-slate-400 line-through"
                    }`}>
                      {station.name}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {station.branch_name || `Branch #${station.branch}`}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">👥 Capacity:</span>
                    <span className={`font-medium ${station.is_active ? 'text-slate-200' : 'text-slate-500'}`}>
                      {station.max_capacity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">📅 Created:</span>
                    <span className={station.is_active ? 'text-slate-300' : 'text-slate-500'}>
                      {new Date(station.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* ─── Actions - Only for managers ─── */}
                {canManage && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06] flex gap-2 flex-wrap">
                    {/* Edit Button */}
                    <button
                      onClick={() => onEdit?.(station)}
                      className="flex-1 min-w-[60px] px-3 py-2 rounded-xl text-sm font-medium text-sky-400 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 transition-all flex items-center justify-center gap-1"
                    >
                      <Edit size={14} /> Edit
                    </button>
                    
                    {station.is_active ? (
                      /* ─── Deactivate Button ─── */
                      <button
                        onClick={() => {
                          if (confirm(`Deactivate "${station.name}"? It will be moved to deleted.`)) {
                            handleToggleStatus(station.id, station.is_active);
                          }
                        }}
                        disabled={isLoading}
                        className="flex-1 min-w-[60px] px-3 py-2 rounded-xl text-sm font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <EyeOff size={14} /> Deactivate
                      </button>
                    ) : (
                      <>
                        {/* ─── Restore Button ─── */}
                        <button
                          onClick={() => {
                            if (confirm(`Restore "${station.name}"? It will be visible in the active list.`)) {
                              handleToggleStatus(station.id, station.is_active);
                            }
                          }}
                          disabled={isLoading}
                          className="flex-1 min-w-[60px] px-3 py-2 rounded-xl text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <Undo2 size={14} /> Restore
                        </button>
                        {/* ─── Delete Permanently Button ─── */}
                        <button
                          onClick={() => setDeleteTarget(station)}
                          className="flex-1 min-w-[60px] px-3 py-2 rounded-xl text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center gap-1"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-red-500/25 bg-[#0f1525] shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_40px_rgba(248,113,113,0.08)] p-6 animate-[fadeUp_0.3s_ease_both]">
            <div className="text-4xl text-center mb-3">🗑️</div>
            <h2 className="text-lg font-semibold text-slate-100 text-center mb-1">Permanently Delete Station</h2>
            <p className="text-slate-400 text-sm text-center mb-6">
              Are you sure you want to permanently delete <span className="text-slate-200 font-semibold">{deleteTarget.name}</span>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white bg-red-500 hover:bg-red-600 shadow-[0_4px_16px_rgba(239,68,68,0.35)] disabled:opacity-50 transition-all">
                {deleting
                  ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : "Yes, Delete"}
              </button>
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeDown {
          animation: fadeDown 0.3s ease both;
        }
        .animate-fadeUp {
          animation: fadeUp 0.3s ease both;
        }
      `}</style>
    </div>
  );
}