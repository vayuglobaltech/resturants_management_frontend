"use client";
import { useEffect, useState } from "react";
import { getProducts, createProduct, deleteProduct, getCategories } from "@/lib/api";

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
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
  
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "", sku: "", price: "", cost_price: "", product_type: "retail", category: ""
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        getProducts(), getCategories()
      ]);
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
      setForm({ name: "", sku: "", price: "", cost_price: "", product_type: "retail", category: "" });
      setActionMsg({ type: 'success', text: 'Product created successfully!' });
      loadData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.detail || 'Failed to create product.' });
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProduct(id);
      setActionMsg({ type: 'success', text: 'Product deleted successfully.' });
      loadData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.detail || 'Failed to delete product.' });
    }
  };

  return (
    <div className="animate-fadeUp">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Products</h1>
          <p className="text-slate-400 mt-1 text-sm">Manage end-products sold to customers.</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm text-white shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all ${showAdd ? 'bg-slate-700 hover:bg-slate-600' : 'bg-orange-600 hover:bg-orange-700'}`}
        >
          {showAdd ? "Cancel" : "+ Add Product"}
        </button>
      </div>

      {actionMsg && (
        <div className={`mb-6 px-4 py-3 rounded-xl border text-sm animate-fadeDown flex justify-between items-center ${
          actionMsg.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/25 text-red-400'
        }`}>
          <span>{actionMsg.type === 'success' ? '✅ ' : '⚠️ '} {actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="text-xl leading-none opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}

      {showAdd && (
        <form onSubmit={handleCreate} className="mb-8 p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md animate-fadeDown">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">New Product Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Name</label>
              <input required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-orange-500/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">SKU</label>
              <input required value={form.sku} onChange={(e) => setForm({...form, sku: e.target.value})} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-orange-500/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Category</label>
              <select required value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-orange-500/50 appearance-none">
                <option value="" className="text-black">Select...</option>
                {categories.map(c => <option key={c.id} value={c.id} className="text-black">{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Selling Price</label>
              <input required type="number" step="0.01" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-orange-500/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Cost Price</label>
              <input required type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({...form, cost_price: e.target.value})} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-orange-500/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Product Type</label>
              <select value={form.product_type} onChange={(e) => setForm({...form, product_type: e.target.value})} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-orange-500/50 appearance-none">
                <option value="retail" className="text-black">Retail</option>
                <option value="manufactured" className="text-black">Manufactured</option>
                <option value="raw" className="text-black">Raw</option>
              </select>
            </div>
          </div>
          <button type="submit" className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-all">Save Product</button>
        </form>
      )}

      {loading ? (
        <div className="flex py-10 justify-center">
          <span className="w-8 h-8 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map(p => (
            <div key={p.id} className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md flex flex-col justify-between hover:border-orange-500/30 transition-colors group">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg">
                    {p.product_type}
                  </span>
                  <button onClick={() => handleDelete(p.id)} className="text-slate-500 hover:text-red-400 transition-colors">🗑️</button>
                </div>
                <h3 className="text-xl font-bold text-slate-100">{p.name}</h3>
                <p className="text-slate-400 text-xs mt-1">SKU: {p.sku}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.05] flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Category</p>
                  <p className="text-sm font-medium text-slate-300">{p.category_name || "Uncategorized"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Price</p>
                  <p className="text-lg font-bold text-emerald-400">${parseFloat(p.price).toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
