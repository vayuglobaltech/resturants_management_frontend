"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmPasswordReset } from "@/lib/api";

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tokenFromQuery = params.get("token") || "";

  const [token, setToken] = useState(tokenFromQuery);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset({ token, new_password: newPassword });
      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 2000);
    } catch (err: unknown) {
      const e = err as Record<string, string[]>;
      setError(Object.values(e).flat().join(" ") || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full px-4 py-3 rounded-xl bg-background/70 border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none transition-all focus:border-[var(--primary)]/70 focus:bg-muted/30 focus:ring-2 focus:ring-[var(--primary)]/20";
  const labelCls = "text-xs font-medium text-muted-foreground tracking-wide";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background text-foreground relative overflow-hidden transition-colors duration-300">
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[100px] animate-pulse" style={{ backgroundColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-[90px] animate-pulse [animation-delay:1.5s]" style={{ backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] px-8 py-10 animate-[fadeUp_0.4s_cubic-bezier(0.22,1,0.36,1)_both]">

          <div className="text-5xl text-center mb-4" style={{ filter: "drop-shadow(0 0 14px color-mix(in srgb, var(--primary) 30%, transparent))" }}>🔒</div>

          <h1 className="text-2xl font-bold text-center text-foreground tracking-tight mb-1">
            Reset Password
          </h1>
          <p className="text-sm text-center text-muted-foreground mb-7">
            Enter your new password below
          </p>

          {success && (
            <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm mb-6 animate-[fadeDown_0.25s_ease_both]">
              ✅ Password reset successful! Redirecting to login…
            </div>
          )}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm mb-6 animate-[fadeDown_0.25s_ease_both]">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* show token field only if not pre-filled from URL */}
            {!tokenFromQuery && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reset-token" className={labelCls}>Reset Token</label>
                <input
                  id="reset-token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  placeholder="Paste reset token from email"
                  className={inputCls}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-password" className={labelCls}>New Password</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-password" className={labelCls}>Confirm Password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="••••••••"
                className={inputCls}
              />
            </div>

            <button
              id="reset-submit"
              type="submit"
              disabled={loading}
              className="mt-1 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-[var(--primary-foreground)] bg-[var(--primary)] shadow-[0_8px_24px_rgba(184,142,76,0.25)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
            >
              {loading ? (
                <span className="w-5 h-5 rounded-full border-2 border-border border-t-white animate-spin" />
              ) : (
                "Set New Password"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-7">
            <Link href="/auth/login" className="text-[var(--primary)] hover:opacity-80 font-medium transition-colors">
              ← Back to Login
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordInner />
    </Suspense>
  );
}
