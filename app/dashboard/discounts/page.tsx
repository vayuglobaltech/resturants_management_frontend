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

export default function DiscountsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = useCanManage();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [filtered, setFiltered] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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

  const fetchDiscounts = async () => {
    try {
      const data = await getDiscounts();
      setDiscounts(data);
      setFiltered(data);
    } catch (error) {
      toast.error("Failed to load discounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

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
      setFormData({
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
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
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
                {d.branch_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Branch</span>
                    <span className="text-foreground">{d.branch_name}</span>
                  </div>
                )}
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

              {/* Branch */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Branch (optional)
                </label>
                <select
                  value={formData.branch}
                  onChange={(e) =>
                    setFormData({ ...formData, branch: e.target.value })
                  }
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Branches (Global)</option>
                  <option value="1">Downtown Branch</option>
                  <option value="2">Lalitpur Branch</option>
                  <option value="3">Bhaktapur Branch</option>
                  <option value="6">Ramro Branch</option>
                </select>
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
