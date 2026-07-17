// components/kitchen/KitchenStationForm.tsx
"use client";
import React, { useState, useEffect } from "react";
import { CookingPot, X } from "lucide-react";
import { createKitchenStation, updateKitchenStation, KitchenStation } from "@/lib/kitchenApi";
import { getBranches } from "@/lib/api";

const INP =
  "w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none transition-all focus:border-primary/70 focus:bg-muted/30 focus:ring-2 focus:ring-primary/20";
const LBL = "text-xs font-medium text-muted-foreground tracking-wide";

interface KitchenStationFormProps {
  branchId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: KitchenStation;
}

export function KitchenStationForm({
  branchId,
  onSuccess,
  onCancel,
  initialData,
}: KitchenStationFormProps) {
  const isEditing = !!initialData?.id;
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  
  const [form, setForm] = useState({
    name: initialData?.name || "",
    branch: initialData?.branch || branchId || 0,
    max_capacity: initialData?.max_capacity || 0,
    is_active: initialData?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch branches on mount
  useEffect(() => {
    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const data = await getBranches();
        // Handle both array and paginated response
        const branchList = Array.isArray(data) ? data : data.results || [];
        setBranches(branchList);
        
        // If no branch is selected and we have branches, select the first one
        if (!form.branch && branchList.length > 0) {
          setForm(prev => ({ ...prev, branch: branchList[0].id }));
        }
      } catch (err) {
        console.error("Failed to fetch branches:", err);
        setError("Failed to load branches. Please refresh and try again.");
      } finally {
        setLoadingBranches(false);
      }
    };
    fetchBranches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Validation
    if (!form.name.trim()) {
      setError("Station name is required");
      setSaving(false);
      return;
    }
    if (form.max_capacity <= 0) {
      setError("Max capacity must be greater than 0");
      setSaving(false);
      return;
    }
    if (!form.branch || form.branch === 0) {
      setError("Please select a valid branch");
      setSaving(false);
      return;
    }

    try {
      if (isEditing && initialData?.id) {
        await updateKitchenStation(initialData.id, form);
      } else {
        await createKitchenStation(form);
      }
      onSuccess?.();
    } catch (err: unknown) {
      const e = err as Record<string, string[]>;
      // Handle specific error messages
      if (e.detail) {
        setError(Array.isArray(e.detail) ? e.detail.join(" ") : e.detail);
      } else if (e.branch) {
        setError(`Branch error: ${Array.isArray(e.branch) ? e.branch.join(" ") : e.branch}`);
      } else {
        setError(Object.values(e).flat().join(" ") || "Save failed.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-6 rounded-2xl border border-border bg-muted/30 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <CookingPot size={20} />
          {isEditing ? "✏️ Edit Kitchen Station" : "➕ Create Kitchen Station"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm animate-[fadeDown_0.25s_ease_both]">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Name */}
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className={LBL}>
            Station Name <span className="text-red-400">*</span>
          </label>
          <input
            className={INP}
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g., Grill Station, Prep Station"
          />
        </div>

        {/* Branch - Dropdown instead of manual input */}
        <div className="flex flex-col gap-1.5">
          <label className={LBL}>
            Branch <span className="text-red-400">*</span>
          </label>
          <select
            required
            value={form.branch || ""}
            onChange={(e) => setForm((f) => ({ ...f, branch: parseInt(e.target.value) || 0 }))}
            className={`${INP} appearance-none`}
            disabled={loadingBranches}
          >
            <option value="" className="bg-background">
              {loadingBranches ? "Loading branches..." : "Select a branch"}
            </option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id} className="bg-background">
                {branch.name} {branch.city ? `- ${branch.city}` : ""}
              </option>
            ))}
          </select>
          {branches.length === 0 && !loadingBranches && (
            <p className="text-xs text-amber-400 mt-1">
              ⚠️ No branches available. Please create a branch first.
            </p>
          )}
        </div>

        {/* Max Capacity */}
        <div className="flex flex-col gap-1.5">
          <label className={LBL}>
            Max Capacity <span className="text-red-400">*</span>
          </label>
          <input
            className={INP}
            required
            type="number"
            min="1"
            value={form.max_capacity || ""}
            onChange={(e) => setForm((f) => ({ ...f, max_capacity: parseInt(e.target.value) || 0 }))}
            placeholder="10"
          />
        </div>
      </div>

      {/* Status Toggle */}
      <div className="flex items-center gap-3 py-2">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={form.is_active}
            onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))}
          />
          <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          <span className="ml-3 text-sm font-medium text-muted-foreground">
            {form.is_active ? "🟢 Active" : "🔴 Inactive"}
            <span className="text-muted-foreground text-xs ml-2">
              (station will be {form.is_active ? "available" : "unavailable"})
            </span>
          </span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || loadingBranches || branches.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-primary-foreground bg-primary shadow-[0_4px_16px_rgba(184,142,76,0.24)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
        >
          {saving ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-border border-t-white animate-spin" />
              {isEditing ? "Updating..." : "Creating..."}
            </>
          ) : (
            isEditing ? "💾 Save Changes" : "✅ Create Station"
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 rounded-xl text-sm font-medium text-muted-foreground bg-muted/30 border border-border hover:bg-muted/30 transition-all"
        >
          Cancel
        </button>
      </div>

      <style>{`
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </form>
  );
}