"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser, getBranches, getRoles } from "@/lib/api";

interface Branch {
  id: number;
  name: string;
}

interface Role {
  id: number;
  name: string;
  display_name: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    username: "",
    first_name: "",
    last_name: "",
    password: "",
    password2: "",
    phone_number: "",
    preferred_branch: "",
    preferred_role: "",
  });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [branchesRes, rolesRes] = await Promise.all([
          getBranches(),
          getRoles(),
        ]);
        setBranches(branchesRes.results || []);
        setRoles(rolesRes.results || []);
        
        // Set default values if results exist
        if (branchesRes.results?.length > 0) {
          setForm(prev => ({ ...prev, preferred_branch: branchesRes.results[0].name }));
        }
        if (rolesRes.results?.length > 0) {
          setForm(prev => ({ ...prev, preferred_role: rolesRes.results[0].name }));
        }
      } catch (err) {
        console.error("Failed to fetch branches or roles:", err);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.password2) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await registerUser(form);
      setSuccess(true);
      setTimeout(
        () =>
          router.push(
            `/auth/verify-email?email=${encodeURIComponent(form.email)}`
          ),
        1500
      );
    } catch (err: unknown) {
      const e = err as Record<string, string[]>;
      setError(
        Object.values(e).flat().join(" ") ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-slate-100 placeholder-slate-600 text-sm outline-none transition-all focus:border-indigo-500/70 focus:bg-white/[0.08] focus:ring-2 focus:ring-indigo-500/15";
  const labelCls = "text-xs font-medium text-slate-400 tracking-wide";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a0e1a] relative overflow-hidden">
      {/* bg orbs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-600/20 blur-[100px] animate-pulse" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-violet-600/15 blur-[90px] animate-pulse [animation-delay:1.5s]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_80px_rgba(99,102,241,0.15)] px-8 py-10 animate-[fadeUp_0.4s_cubic-bezier(0.22,1,0.36,1)_both]">

          <div className="text-5xl text-center mb-4 drop-shadow-[0_0_16px_rgba(99,102,241,0.5)]">🍽️</div>

          <h1 className="text-2xl font-bold text-center text-slate-100 tracking-tight mb-1">
            Create Account
          </h1>
          <p className="text-sm text-center text-slate-400 mb-7">
            Join the Restaurant Management System
          </p>

          {success && (
            <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm mb-6 animate-[fadeDown_0.25s_ease_both]">
              ✅ Account created! Redirecting to email verification…
            </div>
          )}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm mb-6 animate-[fadeDown_0.25s_ease_both]">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* first / last name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="first_name" className={labelCls}>First Name</label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={form.first_name}
                  onChange={handleChange}
                  placeholder="John"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="last_name" className={labelCls}>Last Name</label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={form.last_name}
                  onChange={handleChange}
                  placeholder="Doe"
                  className={inputCls}
                />
              </div>
            </div>

            {/* username */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className={labelCls}>Username</label>
              <input
                id="username"
                name="username"
                type="text"
                value={form.username}
                onChange={handleChange}
                required
                placeholder="johndoe"
                className={inputCls}
              />
            </div>

            {/* email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className={labelCls}>Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="john@example.com"
                className={inputCls}
              />
            </div>

            {/* phone number */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone_number" className={labelCls}>Phone Number</label>
              <input
                id="phone_number"
                name="phone_number"
                type="tel"
                value={form.phone_number}
                onChange={handleChange}
                required
                placeholder="+977 98XXXXXXX"
                className={inputCls}
              />
            </div>

            {/* branch / role row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="preferred_branch" className={labelCls}>Preferred Branch</label>
                <select
                  id="preferred_branch"
                  name="preferred_branch"
                  value={form.preferred_branch}
                  onChange={handleChange}
                  required
                  className={inputCls}
                >
                  <option value="" disabled>Select Branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.name} className="bg-[#1e293b] text-slate-100">
                      {branch.name.charAt(0).toUpperCase() + branch.name.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="preferred_role" className={labelCls}>Preferred Role</label>
                <select
                  id="preferred_role"
                  name="preferred_role"
                  value={form.preferred_role}
                  onChange={handleChange}
                  required
                  className={inputCls}
                >
                  <option value="" disabled>Select Role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.name} className="bg-[#1e293b] text-slate-100">
                      {role.display_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className={labelCls}>Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className={inputCls}
              />
            </div>

            {/* confirm password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password2" className={labelCls}>Confirm Password</label>
              <input
                id="password2"
                name="password2"
                type="password"
                value={form.password2}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className={inputCls}
              />
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="mt-1 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-600 shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:shadow-[0_6px_28px_rgba(99,102,241,0.55)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
            >
              {loading ? (
                <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-7">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
