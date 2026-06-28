"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProducts, createProduct, deleteProduct, getCategories } from "@/lib/api";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type Product = {
  id: number | string;
  name: string;
  sku: string;
  description: string;
  price: string;
  cost_price: string;
  product_type: string;
  category: number | string;
  category_name: string;
  kitchen_station_name: string;
  is_active?: boolean;
};

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: string; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number | string; name: string } | null>(null);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    price: "",
    cost_price: "",
    product_type: "menu_item",
    category: "",
  });

  const loadData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        getProducts(),
        getCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProduct(form);
      setShowAdd(false);
      setForm({
        name: "",
        sku: "",
        description: "",
        price: "",
        cost_price: "",
        product_type: "menu_item",
        category: "",
      });
      setActionMsg({ type: "success", text: "Product created successfully!" });
      loadData();
    } catch (err: any) {
      console.error("Product creation error:", err);
      if (err && typeof err === "object") {
        const messages = Object.values(err).flat().join(" ");
        setActionMsg({ type: "error", text: messages || "Failed to create product." });
      } else {
        setActionMsg({ type: "error", text: "Failed to create product." });
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProduct(deleteTarget.id);
      setActionMsg({ type: "success", text: "Product deleted successfully." });
      loadData();
    } catch (err: any) {
      setActionMsg({
        type: "error",
        text: err?.detail || "Failed to delete product.",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleEdit = (id: number | string) => {
    router.push(`/dashboard/inventory/products/${id}/edit`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Products</h1>
        <Button onClick={() => setShowAdd(!showAdd)} className="gap-1.5">
          <Plus className="h-4 w-4" /> {showAdd ? "Cancel" : "Add Product"}
        </Button>
      </div>

      {/* Action Messages */}
      {actionMsg && (
        <div
          className={`p-3 rounded-xl ${
            actionMsg.type === "success"
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {actionMsg.text}
          <button onClick={() => setActionMsg(null)} className="ml-2 opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Add Form */}
      {showAdd && (
        <form onSubmit={handleCreate} className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">New Product</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-xs font-medium text-slate-400">Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">SKU *</label>
              <input
                required
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">Category *</label>
              <select
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-indigo-500/50"
              >
                <option value="">Select...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">Selling Price *</label>
              <input
                required
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">Cost Price</label>
              <input
                type="number"
                step="0.01"
                value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">Product Type *</label>
              <select
                required
                value={form.product_type}
                onChange={(e) => setForm({ ...form, product_type: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-indigo-500/50"
              >
                <option value="menu_item">Menu Item</option>
                <option value="raw_ingredient">Raw Ingredient</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>
          <Button type="submit" className="w-full md:w-auto">Save Product</Button>
        </form>
      )}

      {/* Product Grid */}
      {products.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
          <p className="text-slate-400">No products found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <Card key={p.id} className="relative group bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] transition-all">
              <CardContent className="p-4 pr-12">
                <div className="flex justify-between items-start mb-3 mt-2">
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg">
                    {p.product_type}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-100">{p.name}</h3>
                <p className="text-slate-400 text-xs mt-1">SKU: {p.sku}</p>
                {p.description && (
                  <p className="text-slate-400 text-sm line-clamp-2 mt-1">{p.description}</p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-white/5">
                  <span className="text-indigo-400 font-bold text-lg">
                    ${parseFloat(p.price).toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500">{p.category_name || "No category"}</span>
                </div>
              </CardContent>

              {/* Actions */}
              <div
                className={cn(
                  "absolute top-3 right-3 flex items-center gap-1",
                  "opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200"
                )}
              >
                <button
                  onClick={() => handleEdit(p.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors"
                  aria-label="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget({ id: p.id, name: p.name })}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Product"
        icon={<Trash2 className="h-8 w-8 text-red-400" />}
        description={`Are you sure you want to delete "${deleteTarget?.name || 'this product'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        variant="danger"
      />
    </div>
  );
}