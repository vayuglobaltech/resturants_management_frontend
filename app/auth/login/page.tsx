"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(form.username, form.password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const e = err as Record<string, string | string[]>;
      const detail = typeof e?.detail === "string" ? e.detail : null;
      if (detail?.toLowerCase().includes("verified")) {
        setError("__unverified__");
      } else {
        setError(
          detail ||
            Object.values(e).flat().join(" ") ||
            "Invalid email or password."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a0e1a] relative overflow-hidden">
      {/* background orbs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-600/20 blur-[100px] animate-pulse" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-violet-600/15 blur-[90px] animate-pulse [animation-delay:1.5s]" />

      <div className="relative z-10 w-full max-w-md">
        {/* card */}
        <div className="rounded-2xl border border-border bg-muted/30 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_80px_rgba(99,102,241,0.15)] px-8 py-10 animate-[fadeUp_0.4s_cubic-bezier(0.22,1,0.36,1)_both]">

          {/* logo */}
          <div className="text-5xl text-center mb-4 drop-shadow-[0_0_16px_rgba(99,102,241,0.5)]">🍽️</div>

          <h1 className="text-2xl font-bold text-center text-foreground tracking-tight mb-1">
            Welcome Back
          </h1>
          <p className="text-sm text-center text-muted-foreground mb-7">
            Sign in to Restaurant Management
          </p>

          {/* error alert */}
          {error === "__unverified__" ? (
            <div className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm mb-6 animate-[fadeDown_0.25s_ease_both]">
              <span>⚠️ Your email is not verified.</span>
              <Link
                href="/auth/verify-email"
                className="text-indigo-400 hover:text-indigo-300 underline text-xs font-medium transition-colors"
              >
                Verify now →
              </Link>
            </div>
          ) : error ? (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm mb-6 animate-[fadeDown_0.25s_ease_both]">
              ⚠️ {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* username */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-username" className="text-xs font-medium text-muted-foreground tracking-wide">
                Username
              </label>
              <input
                id="login-username"
                name="username"
                type="text"
                value={form.username}
                onChange={handleChange}
                required
                placeholder="johndoe"
                autoComplete="username"
                className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none transition-all focus:border-indigo-500/70 focus:bg-muted/30 focus:ring-2 focus:ring-indigo-500/15"
              />
            </div>

            {/* password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-xs font-medium text-muted-foreground tracking-wide">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="login-password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none transition-all focus:border-indigo-500/70 focus:bg-muted/30 focus:ring-2 focus:ring-indigo-500/15"
              />
            </div>

            {/* submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="mt-1 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-foreground bg-gradient-to-r from-indigo-500 to-violet-600 shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:shadow-[0_6px_28px_rgba(99,102,241,0.55)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
            >
              {loading ? (
                <span className="w-5 h-5 rounded-full border-2 border-border border-t-white animate-spin" />
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-7">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Create one
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