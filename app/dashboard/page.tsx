"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { updateProfile } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout, refreshProfile } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
  });

  // Guard – redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Populate form when user loads
  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
        email: user.email ?? "",
      });
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    setSaveErr(null);
    try {
      await updateProfile(form);
      await refreshProfile();
      setSaveMsg("Profile updated successfully!");
      setEditing(false);
    } catch (err: unknown) {
      const e = err as Record<string, string[]>;
      setSaveErr(Object.values(e).flat().join(" ") || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm">Loading your profile…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.username;

  const initials = fullName
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Format snake_case → Title Case  ("branch_manager" → "Branch Manager")
  const toTitle = (s: string) =>
    s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Resolve role from the nested object returned by the API
  const getRoleInfo = () => {
    // role is an object: { id, name, description, permissions }
    const raw =
      user.role && typeof user.role === "object" && "name" in user.role
        ? String((user.role as { name: string }).name).trim().toLowerCase()
        : typeof user.role === "string" && user.role.trim()
        ? user.role.trim().toLowerCase()
        : undefined;

    if (raw) {
      const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
        admin:          { label: "Admin",          color: "text-amber-400",  bg: "bg-amber-500/15",  border: "border-amber-500/25" },
        superadmin:     { label: "Super Admin",    color: "text-rose-400",   bg: "bg-rose-500/15",   border: "border-rose-500/25" },
        super_admin:    { label: "Super Admin",    color: "text-rose-400",   bg: "bg-rose-500/15",   border: "border-rose-500/25" },
        manager:        { label: "Manager",        color: "text-sky-400",    bg: "bg-sky-500/15",    border: "border-sky-500/25" },
        branch_manager: { label: "Branch Manager", color: "text-sky-400",    bg: "bg-sky-500/15",    border: "border-sky-500/25" },
        waiter:         { label: "Waiter",         color: "text-indigo-400", bg: "bg-indigo-500/15", border: "border-indigo-500/25" },
        chef:           { label: "Chef",           color: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-500/25" },
        cashier:        { label: "Cashier",        color: "text-teal-400",   bg: "bg-teal-500/15",   border: "border-teal-500/25" },
        staff:          { label: "Staff",          color: "text-slate-300",  bg: "bg-slate-500/15",  border: "border-slate-500/25" },
      };
      return map[raw] ?? {
        label: toTitle(raw),
        color: "text-indigo-300",
        bg: "bg-indigo-500/15",
        border: "border-indigo-500/25",
      };
    }
    if (user.is_superuser) return { label: "Super Admin",   color: "text-rose-400",   bg: "bg-rose-500/15",   border: "border-rose-500/25" };
    if (user.is_staff)     return { label: "Admin",         color: "text-amber-400",  bg: "bg-amber-500/15",  border: "border-amber-500/25" };
    return                        { label: "User",          color: "text-slate-300",  bg: "bg-slate-500/15",  border: "border-slate-500/25" };
  };

  const roleInfo = getRoleInfo();

  // Permissions from role object
  const permissions =
    user.role && typeof user.role === "object" && "permissions" in user.role
      ? (user.role as { permissions?: { id: number; name: string; codename: string }[] }).permissions ?? []
      : [];

  return (
    <div className="min-h-screen bg-[#0a0e1a] relative overflow-hidden">
      {/* bg orbs */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" />

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#0a0e1a]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🍽️</span>
            <span className="font-bold text-slate-100 text-lg tracking-tight">
              Restaurant<span className="text-indigo-400">MS</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Role badge in navbar */}
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${roleInfo.bg} ${roleInfo.color} ${roleInfo.border}`}>
              {roleInfo.label}
            </span>
            {/* avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-[0_0_12px_rgba(99,102,241,0.4)]">
              {initials}
            </div>
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-lg text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:shadow-[0_0_14px_rgba(248,113,113,0.2)] transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main ── */}
      <main className="max-w-5xl mx-auto px-6 py-10 relative z-10">

        {/* Welcome banner */}
        <div className="mb-8 animate-[fadeUp_0.4s_ease_both]">
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">
            Welcome back, <span className="text-indigo-400">{user.first_name || user.username}</span> 👋
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Here&apos;s an overview of your account and profile details.
          </p>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: "👤", label: "Username",    value: user.username },
            { icon: "✉️", label: "Email",       value: user.email },
            { icon: "💼", label: "Designation", value: (user.designation as string) || "—" },
            { icon: "🛡️", label: "Role",        value: roleInfo.label },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 hover:bg-white/[0.05] transition-colors duration-200"
            >
              <div className="text-xl mb-2">{stat.icon}</div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5">
                {stat.label}
              </p>
              <p className="text-sm text-slate-200 font-semibold truncate">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Profile Card ── */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.4)] overflow-hidden animate-[fadeUp_0.5s_ease_both]">

          {/* card header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
            <div className="flex items-center gap-3">
              {/* big avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-lg font-bold shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                {initials}
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100">{fullName}</h2>
                <p className="text-xs text-slate-500">@{user.username}</p>
              </div>
            </div>

            {!editing ? (
              <button
                onClick={() => { setEditing(true); setSaveMsg(null); setSaveErr(null); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-200 bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] transition-all duration-200"
              >
                ✏️ Edit Profile
              </button>
            ) : (
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          {/* alerts */}
          <div className="px-6">
            {saveMsg && (
              <div className="mt-5 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm animate-[fadeDown_0.25s_ease_both]">
                ✅ {saveMsg}
              </div>
            )}
            {saveErr && (
              <div className="mt-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm animate-[fadeDown_0.25s_ease_both]">
                ⚠️ {saveErr}
              </div>
            )}
          </div>

          {/* read-only view */}
          {!editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.05] m-6 rounded-xl overflow-hidden border border-white/[0.06]">
              {[
                { label: "Username",    value: user.username },
                { label: "Email",      value: user.email },
                { label: "Phone",      value: (user.phone_number as string) || "—" },
                { label: "Designation",value: (user.designation as string) || "—" },
                { label: "Branch",     value: (user.branch as string) || "—" },
                { label: "User ID",    value: `#${user.id}` },
                {
                  label: "Email Verified",
                  value: user.is_email_verified ? "✅ Verified" : "❌ Not Verified",
                },
              ].map((row) => (
                <div key={row.label} className="bg-[#0d1323] px-5 py-4">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">
                    {row.label}
                  </p>
                  <p className="text-sm text-slate-200 font-medium">{row.value}</p>
                </div>
              ))}
              {/* Role – full-width with coloured badge */}
              <div className="bg-[#0d1323] px-5 py-4 md:col-span-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Role</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${roleInfo.bg} ${roleInfo.color} ${roleInfo.border}`}>
                  {roleInfo.label}
                </span>
              </div>
              {/* Permissions */}
              {permissions.length > 0 && (
                <div className="bg-[#0d1323] px-5 py-4 md:col-span-2">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-3">Permissions</p>
                  <div className="flex flex-wrap gap-2">
                    {permissions.map((p) => (
                      <span
                        key={p.id}
                        title={p.codename}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                      >
                        🔐 {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* edit form */
            <form onSubmit={handleSave} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {(
                  [
                    { id: "edit-first",  name: "first_name", label: "First Name",      placeholder: "John",             type: "text" },
                    { id: "edit-last",   name: "last_name",  label: "Last Name",       placeholder: "Doe",              type: "text" },
                    { id: "edit-email",  name: "email",      label: "Email Address",   placeholder: "john@example.com", type: "email" },
                  ] as const
                ).map((field) => (
                  <div key={field.id} className="flex flex-col gap-1.5">
                    <label htmlFor={field.id} className="text-xs font-medium text-slate-400 tracking-wide">
                      {field.label}
                    </label>
                    <input
                      id={field.id}
                      name={field.name}
                      type={field.type}
                      value={form[field.name]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [field.name]: e.target.value }))
                      }
                      placeholder={field.placeholder}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-slate-100 placeholder-slate-600 text-sm outline-none transition-all focus:border-indigo-500/70 focus:bg-white/[0.08] focus:ring-2 focus:ring-indigo-500/15"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  id="save-profile"
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-600 shadow-[0_4px_16px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_24px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
                >
                  {saving ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    "💾 Save Changes"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── Applications & Modules ── */}
        <h2 className="text-xl font-bold text-slate-200 mt-10 mb-4 animate-[fadeUp_0.5s_ease_both]">Applications & Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 animate-[fadeUp_0.5s_ease_both]">
          <a
            href="/dashboard/inventory"
            className="group flex flex-col p-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 hover:shadow-[0_8px_30px_rgba(99,102,241,0.15)] hover:-translate-y-1 transition-all duration-300 backdrop-blur-md cursor-pointer"
          >
            <div className="flex items-center gap-4 mb-3">
              <span className="text-4xl group-hover:scale-110 transition-transform duration-300">📦</span>
              <h3 className="text-xl font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">Inventory System</h3>
            </div>
            <p className="text-sm text-slate-400">
              Manage product categories, track ingredients, monitor physical stock levels, and control restaurant-wide availability.
            </p>
          </a>
          
          <div className="group flex flex-col p-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md opacity-60 cursor-not-allowed">
             <div className="flex items-center gap-4 mb-3">
              <span className="text-4xl grayscale">🍽️</span>
              <h3 className="text-xl font-bold text-slate-400">Point of Sale (Coming Soon)</h3>
            </div>
            <p className="text-sm text-slate-500">
              Accept orders, process payments, and send tickets directly to the kitchen display system.
            </p>
          </div>
       
          {/* Kitchen Stations - NEW */}
        
        <a
          href="/dashboard/kitchen"
          className="group flex flex-col p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)] hover:-translate-y-1 transition-all duration-300 backdrop-blur-md cursor-pointer"
        >
          <div className="flex items-center gap-4 mb-3">
            <span className="text-4xl group-hover:scale-110 transition-transform duration-300">🍳</span>
            <h3 className="text-xl font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
              Kitchen Stations
            </h3>
          </div>
          <p className="text-sm text-slate-400">
            Manage kitchen stations, track capacity, and monitor station availability across branches.
          </p>
        </a>
        </div>
  

        {/* ── Quick Links ── */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-[fadeUp_0.6s_ease_both]">
          {[
            { emoji: "🔑", title: "Change Password", desc: "Update your account password", href: "/auth/forgot-password" },
            { emoji: "📧", title: "Verify Email",    desc: "Re-send email verification code", href: "/auth/verify-email" },
            { emoji: "🚪", title: "Sign Out",        desc: "Log out of your account", onClick: handleLogout },
          ].map((card) => (
            card.href ? (
              <a
                key={card.title}
                href={card.href}
                className="group flex items-start gap-4 p-5 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all duration-200 cursor-pointer"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform duration-200">{card.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{card.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{card.desc}</p>
                </div>
              </a>
            ) : (
              <button
                key={card.title}
                onClick={card.onClick}
                className="group flex items-start gap-4 p-5 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-red-500/10 hover:border-red-500/25 transition-all duration-200 text-left w-full"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform duration-200">{card.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{card.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{card.desc}</p>
                </div>
              </button>
            )
          ))}
        </div>
      </main>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
