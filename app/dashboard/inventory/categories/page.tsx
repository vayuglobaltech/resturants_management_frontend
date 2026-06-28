"use client";

import { useEffect, useState } from "react";
import { getCategories, createCategory, deleteCategory } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Trash2 } from "lucide-react";

type Category = { id: number | string; name: string; description: string; created_at: string };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New category form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Delete modal
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err: any) {
      setError(err?.detail || "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    try {
      await createCategory({ name: newName, description: newDesc });
      setNewName("");
      setNewDesc("");
      setShowAdd(false);
      setActionMsg({ type: 'success', text: 'Category created successfully!' });
      loadData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.detail || 'Failed to create category.' });
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory(categoryToDelete.id);
      setActionMsg({ type: 'success', text: 'Category deleted successfully.' });
      loadData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.detail || 'Failed to delete category.' });
    } finally {
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
    }
  };

  return (
    <div className="animate-fadeUp">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Categories</h1>
          <p className="text-slate-400 mt-1 text-sm">Manage product and ingredient categories.</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-[0_4px_16px_rgba(99,102,241,0.35)] transition-all"
        >
          {showAdd ? "Cancel" : "+ Add Category"}
        </button>
      </div>

      {actionMsg && (
        <div className={`mb-6 px-4 py-3 rounded-xl border text-sm animate-fadeDown flex justify-between items-center ${actionMsg.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
            : 'bg-red-500/10 border-red-500/25 text-red-400'
          }`}>
          <span>{actionMsg.type === 'success' ? '✅ ' : '⚠️ '} {actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="text-xl leading-none opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}

      {showAdd && (
        <form onSubmit={handleCreate} className="mb-8 p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">New Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Name <span className="text-red-400">*</span></label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-slate-100 placeholder-slate-500 text-sm focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/70 outline-none transition-all"
                placeholder="e.g. Beverages"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Description</label>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-slate-100 placeholder-slate-500 text-sm focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/70 outline-none transition-all"
                placeholder="Optional description"
              />
            </div>
          </div>
          <button type="submit" className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-all">
            Save Category
          </button>
        </form>
      )}

      {error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400">{error}</div>
      ) : loading ? (
        <div className="flex py-10 justify-center">
          <span className="w-8 h-8 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0a0e1a]/80 backdrop-blur-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-white/[0.04] text-xs uppercase text-slate-400 font-semibold border-b border-white/[0.08]">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Added On</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {categories.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No categories found.</td></tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-200">{cat.name}</td>
                      <td className="px-6 py-4 text-slate-400">{cat.description || "—"}</td>
                      <td className="px-6 py-4 text-slate-500">{new Date(cat.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setCategoryToDelete(cat);
                            setIsDeleteModalOpen(true);
                          }}
                          className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/25 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ml-auto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCategoryToDelete(null);
        }}
        title="Delete Category"
        icon={<Trash2 className="h-8 w-8 text-red-400" />}
        description={`Are you sure you want to delete "${categoryToDelete?.name || 'this category'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        variant="danger"
      />
    </div>
  );
}