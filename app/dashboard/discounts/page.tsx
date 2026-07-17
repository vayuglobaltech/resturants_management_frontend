"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCanManage } from "@/hooks/useCanManage";
import {
  getDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
} from "@/lib/ordersApi";
import { apiFetch, getBranches } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/Modal";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Tag,
  Percent,
  DollarSign,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type Discount = {
  id: number;
  name: string;
  description: string;
  type: "percentage" | "fixed";
  value: string;
  branch: number | null;
  branch_name?: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  requires_code: boolean;
  code: string | null;
  created_at: string;
};

type Branch = {
  id: number;
  name: string;
};

type UserBranch = {
  id: number;
  name: string;
} | number | string | null;

type UserRole = {
  name: string;
} | string | null;

// ✅ Type guard to check if value is a Branch object
function isBranchObject(value: unknown): value is { id: number; name: string } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'id' in value &&
    'name' in value &&
    typeof (value as any).id === 'number' &&
    typeof (value as any).name === 'string'
  );
}

// ✅ Type guard to check if value is a Role object
function isRoleObject(value: unknown): value is { name: string } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'name' in value &&
    typeof (value as any).name === 'string'
  );
}

// ✅ Helper to safely extract data
const safeExtract = (data: any, defaultValue: any = []) => {
  if (!data) return defaultValue;
  if (Array.isArray(data)) return data;
  if (data.results && Array.isArray(data.results)) return data.results;
  return defaultValue;
};

export default function DiscountsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = useCanManage();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [filtered, setFiltered] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchMap, setBranchMap] = useState<Record<number, string>>({});
  
  // ─── Branch validation state ──────────────────────────────────────────
  const [validBranchId, setValidBranchId] = useState<number | null>(null);
  const [branchName, setBranchName] = useState("");
  const [isBranchValidated, setIsBranchValidated] = useState(false);

  // ─── Modal state ──────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "percentage",
    value: "",
    branch: "",
    is_active: true,
    start_date: "",
    end_date: "",
    requires_code: false,
    code: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // ─── Delete modal ─────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Discount | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // ─── User role ──────────────────────────────────────────────────
  const getUserRole = (): string => {
    if (!user) return '';
    
    if (user.role && isRoleObject(user.role)) {
      return user.role.name.toUpperCase();
    }
    
    if (typeof user.role === 'string') {
      return user.role.toUpperCase();
    }
    
    return '';
  };

  const userRole = getUserRole();
  const isAdmin = userRole === "ADMIN";
  
  // ─── Fetch and validate branch (similar to dashboard) ──────────────
  useEffect(() => {
    const fetchAndValidateBranch = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // First, fetch the user profile to get the branch
        console.log("📡 Fetching user profile for branch...");
        const res = await apiFetch('/api/users/profile/', {}, true);
        
        let profileBranchName = "";
        let profileBranchId = null;
        
        if (res.ok) {
          const profile = await res.json();
          console.log("📋 User profile from API:", profile);
          
          // Try different possible field names for branch
          if (profile.branch?.name) {
            profileBranchName = profile.branch.name;
            profileBranchId = profile.branch.id;
          } else if (profile.branch_name) {
            profileBranchName = profile.branch_name;
          } else if (profile.branch?.branch_name) {
            profileBranchName = profile.branch.branch_name;
          }
          
          console.log("✅ Found branch name in profile:", profileBranchName);
        } else {
          console.error("Failed to fetch profile:", res.status);
        }
        
        // Now fetch available branches
        console.log("🔍 Fetching available branches...");
        const branchData = await getBranches();
        const branchList = safeExtract(branchData);
        console.log("📋 Available branches:", branchList);
        
        setBranches(branchList);
        
        // Build branch map for quick lookups
        const map: Record<number, string> = {};
        branchList.forEach((b: Branch) => {
          map[b.id] = b.name;
        });
        setBranchMap(map);
        
        if (branchList.length === 0) {
          toast.error("No branches available in the system");
          setLoading(false);
          return;
        }
        
        let selectedBranch = null;
        let selectedBranchName = "";
        
        // FIRST: Try to use branch from profile
        if (profileBranchName) {
          const matchedBranch = branchList.find((b: any) => 
            b.name?.toLowerCase() === profileBranchName.toLowerCase()
          );
          if (matchedBranch) {
            selectedBranch = matchedBranch;
            selectedBranchName = matchedBranch.name;
            console.log("✅ Using branch from profile:", selectedBranchName);
          } else {
            // If branch not in list, use the profile branch name
            selectedBranchName = profileBranchName;
            selectedBranch = branchList[0];
            console.log("📌 Using profile branch name (not in list):", selectedBranchName);
          }
        }
        
        // SECOND: Try by user's branch ID from auth
        if (!selectedBranch) {
          const userBranchId = (user as any)?.branch?.id;
          if (userBranchId) {
            const branchById = branchList.find((b: any) => b.id === userBranchId);
            if (branchById) {
              selectedBranch = branchById;
              selectedBranchName = branchById.name;
              console.log("✅ Using branch from user ID:", selectedBranchName);
            }
          }
        }
        
        // THIRD: Try by user's branch name from auth
        if (!selectedBranch) {
          const userBranchName = (user as any)?.branch?.name;
          if (userBranchName) {
            const branchByName = branchList.find((b: any) => 
              b.name?.toLowerCase() === userBranchName.toLowerCase()
            );
            if (branchByName) {
              selectedBranch = branchByName;
              selectedBranchName = branchByName.name;
              console.log("✅ Using branch from user name:", selectedBranchName);
            }
          }
        }
        
        // FINAL: Fallback to first branch
        if (!selectedBranch && branchList.length > 0) {
          selectedBranch = branchList[0];
          selectedBranchName = selectedBranch.name || "Default Branch";
          console.log("📌 Using first available branch as fallback:", selectedBranchName);
        }
        
        if (selectedBranch) {
          setValidBranchId(selectedBranch.id);
          setBranchName(selectedBranchName);
          setIsBranchValidated(true);
          console.log("✅ Final branch:", selectedBranchName);
        } else {
          toast.error("No valid branch found");
          setLoading(false);
        }
      } catch (error) {
        console.error("❌ Failed to validate branch:", error);
        toast.error("Failed to load branch data");
        setLoading(false);
      }
    };

    fetchAndValidateBranch();
  }, [user]);

  // ─── Fetch discounts when branch is validated ──────────────────────
  useEffect(() => {
    if (isBranchValidated) {
      fetchDiscounts();
    }
  }, [isBranchValidated]);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const data = await getDiscounts();
      setDiscounts(data);
      setFiltered(data);
    } catch (error) {
      toast.error("Failed to load discounts.");
      console.error("Failed to fetch discounts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      setFiltered(
        discounts.filter(
          (d) =>
            d.name.toLowerCase().includes(term) ||
            d.description?.toLowerCase().includes(term) ||
            d.code?.toLowerCase().includes(term),
        ),
      );
    } else {
      setFiltered(discounts);
    }
  }, [searchTerm, discounts]);

  // ✅ Helper to get branch name from ID
  const getBranchName = (branchId: number | null): string => {
    if (!branchId) return "All Branches";
    
    // First check the branch map
    if (branchMap[branchId]) return branchMap[branchId];
    
    // Then check if the discount has a branch_name
    const discount = discounts.find(d => d.branch === branchId);
    if (discount?.branch_name) return discount.branch_name;
    
    return `Branch ${branchId}`;
  };

  const handleOpenModal = (discount?: Discount) => {
    if (discount) {
      setEditingDiscount(discount);
      setFormData({
        name: discount.name,
        description: discount.description || "",
        type: discount.type,
        value: discount.value,
        branch: discount.branch ? String(discount.branch) : "",
        is_active: discount.is_active,
        start_date: discount.start_date
          ? discount.start_date.split("T")[0]
          : "",
        end_date: discount.end_date ? discount.end_date.split("T")[0] : "",
        requires_code: discount.requires_code,
        code: discount.code || "",
      });
    } else {
      setEditingDiscount(null);
      // Use the validated branch ID
      const defaultBranch = isAdmin ? "" : (validBranchId ? String(validBranchId) : "");
      setFormData({
        name: "",
        description: "",
        type: "percentage",
        value: "",
        branch: defaultBranch,
        is_active: true,
        start_date: "",
        end_date: "",
        requires_code: false,
        code: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        value: parseFloat(formData.value),
        branch: formData.branch ? parseInt(formData.branch) : null,
      };
      if (editingDiscount) {
        await updateDiscount(editingDiscount.id, payload);
        toast.success("Discount updated!");
      } else {
        await createDiscount(payload);
        toast.success("Discount created!");
      }
      setIsModalOpen(false);
      fetchDiscounts();
    } catch (error: any) {
      const msg = Object.values(error).flat().join(" ");
      toast.error(msg || "Failed to save discount.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDiscount(deleteTarget.id);
      toast.success("Discount deleted.");
      fetchDiscounts();
    } catch (error: any) {
      toast.error(error?.detail || "Failed to delete.");
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  if (!canManage) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">
          You don't have permission to manage discounts.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Tag className="h-6 w-6 text-indigo-400" /> Discounts
         
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDiscounts}
            className="gap-1"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-1" /> Add Discount
          </Button>
        </div>
        {branchName && (
            <span className="text-xs font-normal text-muted-foreground ml-2">
              ({branchName})
            </span>
          )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search discounts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Discount Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No discounts found.
          </div>
        ) : (
          filtered.map((d) => (
            <Card
              key={d.id}
              className="bg-muted/30 border-border hover:bg-muted/30 transition-colors"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground flex justify-between items-start">
                  <span>{d.name}</span>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      d.is_active
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400",
                    )}
                  >
                    {d.is_active ? "Active" : "Inactive"}
                  </span>
                </CardTitle>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {d.description || "No description"}
                </p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="text-foreground capitalize">{d.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Value</span>
                  <span className="text-foreground font-medium">
                    {d.type === "percentage" ? `${d.value}%` : `$${d.value}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Branch</span>
                  <span className="text-foreground">
                    {getBranchName(d.branch)}
                  </span>
                </div>
                {d.requires_code && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Code</span>
                    <span className="text-indigo-400 font-mono">{d.code}</span>
                  </div>
                )}
                {(d.start_date || d.end_date) && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {d.start_date
                        ? new Date(d.start_date).toLocaleDateString()
                        : "Any"}
                    </span>
                    <span>→</span>
                    <span>
                      {d.end_date
                        ? new Date(d.end_date).toLocaleDateString()
                        : "Any"}
                    </span>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => handleOpenModal(d)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTarget(d);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ─── Add/Edit Modal ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#121826] border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-foreground mb-4">
              {editingDiscount ? "Edit Discount" : "Add New Discount"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Type & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Value <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) =>
                      setFormData({ ...formData, value: e.target.value })
                    }
                    required
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* ─── Branch ────────────────────────────────────────────── */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Branch {isAdmin ? "(optional)" : ""}
                </label>
                {isAdmin ? (
                  <select
                    value={formData.branch}
                    onChange={(e) =>
                      setFormData({ ...formData, branch: e.target.value })
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Branches (Global)</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={String(branch.id)}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full rounded-md border border-border bg-background/50 px-3 py-2 text-foreground/80">
                    {branchName || "Your branch"} (auto‑assigned)
                    <input type="hidden" name="branch" value={formData.branch} />
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {isAdmin
                    ? "Leave empty to apply globally, or select a specific branch."
                    : "Discounts are automatically assigned to your branch."}
                </p>
              </div>

              {/* Start & End Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Requires code */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_code"
                  checked={formData.requires_code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      requires_code: e.target.checked,
                    })
                  }
                  className="rounded border-border bg-background text-indigo-500 focus:ring-indigo-500"
                />
                <label
                  htmlFor="requires_code"
                  className="text-sm text-muted-foreground"
                >
                  Requires promo code
                </label>
              </div>

              {/* Promo Code */}
              {formData.requires_code && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Promo Code
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    required
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* Active */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="rounded border-border bg-background text-indigo-500 focus:ring-indigo-500"
                />
                <label htmlFor="is_active" className="text-sm text-muted-foreground">
                  Active
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 gap-2"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingDiscount ? (
                    "Update"
                  ) : (
                    "Create"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation ─── */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Discount"
        icon={<Trash2 className="h-8 w-8 text-red-400" />}
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        variant="danger"
      />
    </div>
  );
}