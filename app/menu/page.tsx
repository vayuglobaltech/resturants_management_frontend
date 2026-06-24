"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { canManageMenu } from "@/lib/permissions";
import {
  listMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  MenuItem,
  MenuItemPayload,
} from "@/lib/menuApi";

// ─── Empty form ───────────────────────────────────────────────────────────────
const EMPTY: MenuItemPayload = {
  name: "",
  description: "",
  price: "",
  cost_price: "",
  category: 0,
  prep_time_minutes: 0,
  is_available: true,
};

// ─── Input class ─────────────────────────────────────────────────────────────
const INP =
  "w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-slate-100 placeholder-slate-600 text-sm outline-none transition-all focus:border-indigo-500/70 focus:bg-white/[0.08] focus:ring-2 focus:ring-indigo-500/15";
const LBL = "text-xs font-medium text-slate-400 tracking-wide";

export default function MenuPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  const canManage = user ? canManageMenu(user) : false;

  // ── state ──────────────────────────────────────────────────────────────────
  const [items, setItems]         = useState<MenuItem[]>([]);
  const [count, setCount]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [apiError, setApiError]   = useState<string | null>(null);

  // modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<MenuItem | null>(null);
  const [form, setForm]           = useState<MenuItemPayload>(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [formErr, setFormErr]     = useState<string | null>(null);

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // ── auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/auth/login");
  }, [isLoading, isAuthenticated, router]);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchMenu = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const data = await listMenuItems({ search, page });
      setItems(data.results);
      setCount(data.count);
    } catch {
      setApiError("Failed to load menu items.");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) fetchMenu();
  }, [isLoading, isAuthenticated, fetchMenu]);

  // ── helpers ────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormErr(null);
    setShowModal(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description,
      price: item.price,
      cost_price: item.cost_price,
      category: item.category,
      prep_time_minutes: item.prep_time_minutes,
      is_available: item.is_available,
    });
    setFormErr(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormErr(null);
    try {
      if (editing) {
        await updateMenuItem(editing.id, form);
      } else {
        await createMenuItem(form);
      }
      setShowModal(false);
      fetchMenu();
    } catch (err: unknown) {
      const e = err as Record<string, string[]>;
      setFormErr(Object.values(e).flat().join(" ") || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMenuItem(deleteTarget.id);
      setDeleteTarget(null);
      fetchMenu();
    } catch {
      setApiError("Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(count / 10));

  const handleLogout = () => { logout(); router.push("/auth/login"); };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <span className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const initials = ([user.first_name, user.last_name].filter(Boolean).join(" ") || user.username)
    .split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-[#0a0e1a] relative">
      {/* bg orbs */}
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
              🍽️ Menu Management
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

      <main className="max-w-6xl mx-auto px-6 py-10 relative z-10">

        {/* ── Header row ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Menu Items</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {count} item{count !== 1 ? "s" : ""} total
              {!canManage && (
                <span className="ml-2 text-amber-400/80">• You have read-only access</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* search */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Search menu…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-slate-100 placeholder-slate-600 text-sm outline-none transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 w-56"
              />
            </div>

            {/* create button — only for managers */}
            {canManage && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-600 shadow-[0_4px_16px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_24px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-200"
              >
                + Add Item
              </button>
            )}
          </div>
        </div>

        {/* api error */}
        {apiError && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
            ⚠️ {apiError}
          </div>
        )}

        {/* ── Permission notice ── */}
        {!canManage && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-amber-400/90 text-sm flex items-center gap-2">
            🔒 Your role has <strong>read-only</strong> access to menu items. Contact an Admin or Manager to make changes.
          </div>
        )}

        {/* ── Table ── */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <span className="w-10 h-10 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
              <div className="text-5xl mb-4">🍽️</div>
              <p className="text-lg font-semibold text-slate-400">No menu items found</p>
              <p className="text-sm mt-1">
                {search ? "Try a different search term." : canManage ? "Click \"+ Add Item\" to get started." : "No items have been added yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.07]">
                    {["ID", "Name", "Category", "Price", "Cost Price", "Prep Time", "Available", ...(canManage ? ["Actions"] : [])].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr
                      key={item.id}
                      className={`border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}
                    >
                      <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">#{item.id}</td>
                      <td className="px-5 py-3.5">
                        <p className="text-slate-200 font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-slate-600 text-xs mt-0.5 truncate max-w-[200px]">{item.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {item.category_name || `#${item.category}`}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-emerald-400 font-semibold">
                        Rs. {item.price}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">
                        Rs. {item.cost_price}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">
                        {item.prep_time_minutes} min
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.is_available
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                          {item.is_available ? "Available" : "Unavailable"}
                        </span>
                      </td>

                      {/* Actions — only for managers */}
                      {canManage && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(item)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 transition-all"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => setDeleteTarget(item)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-5">
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 rounded-xl text-sm font-medium text-slate-300 bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3.5 py-1.5 rounded-xl text-sm font-medium text-slate-300 bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ══════════════ CREATE / EDIT MODAL ══════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f1525] shadow-[0_20px_60px_rgba(0,0,0,0.6)] animate-[fadeUp_0.3s_ease_both]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
              <h2 className="text-lg font-semibold text-slate-100">
                {editing ? "✏️ Edit Menu Item" : "➕ New Menu Item"}
              </h2>
              <button onClick={() => setShowModal(false)}
                className="text-slate-500 hover:text-slate-200 transition-colors text-xl leading-none">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
              {formErr && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
                  ⚠️ {formErr}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className={LBL}>Name *</label>
                <input className={INP} required value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Margherita Pizza" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LBL}>Description</label>
                <input className={INP} value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short description…" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Price (Rs.) *</label>
                  <input className={INP} required type="number" step="0.01" min="0"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="350.00" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Cost Price (Rs.) *</label>
                  <input className={INP} required type="number" step="0.01" min="0"
                    value={form.cost_price}
                    onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))}
                    placeholder="180.00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Category ID *</label>
                  <input className={INP} required type="number" min="1"
                    value={form.category || ""}
                    onChange={(e) => setForm((f) => ({ ...f, category: parseInt(e.target.value) || 0 }))}
                    placeholder="1" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Prep Time (min)</label>
                  <input className={INP} type="number" min="0"
                    value={form.prep_time_minutes || ""}
                    onChange={(e) => setForm((f) => ({ ...f, prep_time_minutes: parseInt(e.target.value) || 0 }))}
                    placeholder="15" />
                </div>
              </div>

              <div className="flex items-center gap-3 py-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={form.is_available}
                    onChange={(e) => setForm(f => ({ ...f, is_available: e.target.checked }))}
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className="ml-3 text-sm font-medium text-slate-300">Available for Order</span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-600 shadow-[0_4px_16px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_24px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all">
                  {saving
                    ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    : editing ? "💾 Save Changes" : "✅ Create Item"}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl text-sm text-slate-400 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ DELETE CONFIRM ════════════════════════════════════════ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-red-500/25 bg-[#0f1525] shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_40px_rgba(248,113,113,0.08)] p-6 animate-[fadeUp_0.3s_ease_both]">
            <div className="text-4xl text-center mb-3">🗑️</div>
            <h2 className="text-lg font-semibold text-slate-100 text-center mb-1">Delete Menu Item</h2>
            <p className="text-slate-400 text-sm text-center mb-6">
              Are you sure you want to delete <span className="text-slate-200 font-semibold">{deleteTarget.name}</span>?
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
      `}</style>
    </div>
  );
}
