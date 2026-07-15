"use client";
import { useEffect, useState } from "react";
import {
  getProducts,
  createProduct,
  deleteProduct,
  getCategories,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type Product = {
  id: number | string;
  name: string;
  sku: string;
  price: string;
  cost_price: string;
  product_type: string;
  category: number | string;
  category_name: string;
  kitchen_station_name: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [showAdd, setShowAdd] = useState(false);
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
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      console.error(err);
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
        product_type: "retail",
        category: "",
      });
      setActionMsg({ type: "success", text: "Product created successfully!" });
      loadData();
    } catch (err: any) {
      console.error("Product creation error:", err);
      if (err && typeof err === "object") {
        const messages = Object.values(err).flat().join(" ");
        setActionMsg({
          type: "error",
          text: messages || "Failed to create product.",
        });
      } else {
        setActionMsg({ type: "error", text: "Failed to create product." });
      }
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProduct(id);
      setActionMsg({ type: "success", text: "Product deleted successfully." });
      loadData();
    } catch (err: any) {
      setActionMsg({
        type: "error",
        text: err?.detail || "Failed to delete product.",
      });
    }
  };

  return (
    <div className="space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Products
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage end-products sold to customers.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className={cn(
            "px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg",
            showAdd 
              ? "bg-muted hover:bg-muted/80 text-foreground shadow-none" 
              : "bg-[var(--primary)] hover:bg-[color:var(--primary)]/80 text-[var(--primary-foreground)] shadow-[var(--primary)]/25"
          )}
        >
          {showAdd ? "Cancel" : "+ Add Product"}
        </button>
      </div>

      {actionMsg && (
        <div
          className={`px-4 py-3 rounded-xl border text-sm flex justify-between items-center ${
            actionMsg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400"
          }`}
        >
          <span>
            {actionMsg.type === "success" ? "✅ " : "⚠️ "} {actionMsg.text}
          </span>
          <button
            onClick={() => setActionMsg(null)}
            className="text-xl leading-none opacity-60 hover:opacity-100"
          >
            &times;
          </button>
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={handleCreate}
          className="p-6 rounded-2xl bg-muted/30 border border-border backdrop-blur-md"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            New Product Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/30 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                SKU <span className="text-red-400">*</span>
              </label>
              <input
                required
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/30 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/30 transition-all"
              >
                <option value="">Select...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Description
              </label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/30 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Selling Price <span className="text-red-400">*</span>
              </label>
              <input
                required
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/30 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Cost Price <span className="text-red-400">*</span>
              </label>
              <input
                required
                type="number"
                step="0.01"
                value={form.cost_price}
                onChange={(e) =>
                  setForm({ ...form, cost_price: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/30 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Product Type
              </label>
              <select
                value={form.product_type}
                onChange={(e) =>
                  setForm({ ...form, product_type: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/30 transition-all"
              >
                <option value="menu_item">Menu Item</option>
                <option value="raw_ingredient">Raw Ingredient</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl font-semibold text-sm text-[var(--primary-foreground)] bg-[var(--primary)] hover:bg-[color:var(--primary)]/80 shadow-lg shadow-[var(--primary)]/25 transition-all"
          >
            Save Product
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex py-10 justify-center">
          <span className="w-8 h-8 rounded-full border-4 border-[var(--primary)]/30 border-t-[var(--primary)] animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              className="p-5 rounded-2xl border border-border bg-muted/30 backdrop-blur-md flex flex-col justify-between hover:border-[var(--primary)]/30 transition-colors group"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 rounded-lg">
                    {p.product_type}
                  </span>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-muted/50"
                  >
                    🗑️
                  </button>
                </div>
                <h3 className="text-xl font-bold text-foreground">{p.name}</h3>
                <p className="text-muted-foreground text-xs mt-1 font-mono">SKU: {p.sku}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-border flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                    Category
                  </p>
                  <p className="text-sm font-medium text-muted-foreground">
                    {p.category_name || "Uncategorized"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                    Price
                  </p>
                  <p className="text-lg font-bold text-[var(--primary)]">
                    ${parseFloat(p.price).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}