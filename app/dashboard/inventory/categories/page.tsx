"use client";

import { useEffect, useState } from "react";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Trash2, Pencil } from "lucide-react";

type Category = {
  id: number | string;
  name: string;
  description: string;
  created_at: string;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // New category form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Edit modal
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Delete modal
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );
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
      setActionMsg({ type: "success", text: "Category created successfully!" });
      loadData();
    } catch (err: any) {
      setActionMsg({
        type: "error",
        text: err?.detail || "Failed to create category.",
      });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      await updateCategory(editingCategory.id, {
        name: editingCategory.name,
        description: editingCategory.description,
      });
      setActionMsg({ type: "success", text: "Category updated successfully!" });
      setIsEditModalOpen(false);
      setEditingCategory(null);
      loadData();
    } catch (err: any) {
      setActionMsg({
        type: "error",
        text: err?.detail || "Failed to update category.",
      });
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory(categoryToDelete.id);
      setActionMsg({ type: "success", text: "Category deleted successfully." });
      loadData();
    } catch (err: any) {
      setActionMsg({
        type: "error",
        text: err?.detail || "Failed to delete category.",
      });
    } finally {
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
    }
  };

  return (
    <div className="animate-fadeUp">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Categories
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage product and ingredient categories.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm text-primary-foreground bg-primary hover:bg-primary/90 shadow-[0_4px_16px_rgba(184,142,76,0.24)] transition-all"
        >
          {showAdd ? "Cancel" : "+ Add Category"}
        </button>
      </div>

      {actionMsg && (
        <div
          className={`mb-6 px-4 py-3 rounded-xl border text-sm animate-fadeDown flex justify-between items-center ${
            actionMsg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
              : "bg-red-500/10 border-red-500/25 text-red-400"
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
          className="mb-8 rounded-2xl border border-border/80 bg-card/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur"
        >
          <h2 className="mb-4 text-lg font-semibold text-foreground">New Category</h2>
          <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-border/70 bg-background/80 px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition-all placeholder:text-muted-foreground focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/15"
                placeholder="e.g. Beverages"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Description
              </label>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="h-10 w-full rounded-xl border border-border/70 bg-background/80 px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition-all placeholder:text-muted-foreground focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/15"
                placeholder="Optional description"
              />
            </div>
          </div>
          <button
            type="submit"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_4px_16px_rgba(184,142,76,0.24)] transition-all hover:bg-primary/90"
          >
            Save Category
          </button>
        </form>
      )}

      {error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400">
          {error}
        </div>
      ) : loading ? (
        <div className="flex py-10 justify-center">
          <span className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-muted-foreground">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Added On</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {categories.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-muted-foreground"
                    >
                      No categories found.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr
                      key={cat.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-foreground">
                        {cat.name}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {cat.description || "—"}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(cat.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setIsEditModalOpen(true);
                          }}
                          className="text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/25 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setCategoryToDelete(cat);
                            setIsDeleteModalOpen(true);
                          }}
                          className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/25 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
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

      {/* ─── Edit Category Modal ─── */}
      {isEditModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] animate-scaleUp">
            <h2 className="mb-1 text-xl font-bold text-foreground">Edit Category</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Update the name or description of this category.
            </p>

            <form onSubmit={handleUpdate}>
              <div className="mb-4 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      name: e.target.value,
                    })
                  }
                  required
                  className="h-10 w-full rounded-xl border border-border/70 bg-background/80 px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition-all placeholder:text-muted-foreground focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/15"
                />
              </div>

              <div className="mb-6 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Description
                </label>
                <textarea
                  value={editingCategory.description || ""}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full resize-none rounded-xl border border-border/70 bg-background/80 px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition-all placeholder:text-muted-foreground focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/15"
                  placeholder="Optional description"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingCategory(null);
                  }}
                  className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-background"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_4px_16px_rgba(184,142,76,0.24)] transition-all hover:bg-primary/90"
                >
                  Save Changes
                </button>
              </div>
            </form>
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
        description={`Are you sure you want to delete "${categoryToDelete?.name || "this category"}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        variant="danger"
      />
    </div>
  );
}