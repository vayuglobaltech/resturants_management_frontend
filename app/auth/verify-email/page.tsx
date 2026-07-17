"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyEmail, resendVerification } from "@/lib/api";

function VerifyEmailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const emailFromQuery = params.get("email") || "";

  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyEmail({ email, code });
      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 1800);
    } catch (err: unknown) {
      const e = err as Record<string, string[]>;
      setError(Object.values(e).flat().join(" ") || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) { setError("Please enter your email first."); return; }
    setResending(true);
    setResendMsg(null);
    setError(null);
    try {
      await resendVerification({ email });
      setResendMsg("A new 6-digit code has been sent to your email.");
      setCountdown(60);
    } catch (err: unknown) {
      const e = err as Record<string, string[]>;
      setError(Object.values(e).flat().join(" ") || "Could not resend code.");
    } finally {
      setResending(false);
    }
  };

  const inputCls =
    "w-full px-4 py-3 rounded-xl bg-background/70 border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none transition-all focus:border-[var(--primary)]/70 focus:bg-muted/30 focus:ring-2 focus:ring-[var(--primary)]/20";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background text-foreground relative overflow-hidden transition-colors duration-300">
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[100px] animate-pulse" style={{ backgroundColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-[90px] animate-pulse [animation-delay:1.5s]" style={{ backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] px-8 py-10 animate-[fadeUp_0.4s_cubic-bezier(0.22,1,0.36,1)_both]">

          <div className="text-5xl text-center mb-4" style={{ filter: "drop-shadow(0 0 14px color-mix(in srgb, var(--primary) 30%, transparent))" }}>📧</div>

          <h1 className="text-2xl font-bold text-center text-foreground tracking-tight mb-1">
            Verify Your Email
          </h1>
          <p className="text-sm text-center text-muted-foreground mb-7">
            Enter the 6-digit code sent to your inbox
          </p>

          {success && (
            <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm mb-6 animate-[fadeDown_0.25s_ease_both]">
              ✅ Email verified! Redirecting to login…
            </div>
          )}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm mb-6 animate-[fadeDown_0.25s_ease_both]">
              ⚠️ {error}
            </div>
          )}
          {resendMsg && (
            <div className="px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 text-sm mb-6 animate-[fadeDown_0.25s_ease_both]">
              📬 {resendMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="verify-email" className="text-xs font-medium text-muted-foreground tracking-wide">
                Email Address
              </label>
              <input
                id="verify-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="john@example.com"
                className={inputCls}
              />
            </div>

            {/* code input */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="verify-code" className="text-xs font-medium text-muted-foreground tracking-wide">
                6-Digit Code
              </label>
              <input
                id="verify-code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                required
                placeholder="123456"
                maxLength={6}
                className="w-full px-4 py-4 rounded-xl bg-background/70 border border-border text-foreground text-2xl font-bold tracking-[0.4em] text-center outline-none transition-all focus:border-[var(--primary)]/70 focus:bg-muted/30 focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>

            <button
              id="verify-submit"
              type="submit"
              disabled={loading}
              className="mt-1 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-[var(--primary-foreground)] bg-[var(--primary)] shadow-[0_8px_24px_rgba(184,142,76,0.25)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
            >
              {loading ? (
                <span className="w-5 h-5 rounded-full border-2 border-border border-t-white animate-spin" />
              ) : (
                "Verify Email"
              )}
            </button>
          </form>

          {/* resend row */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-5 text-sm text-muted-foreground">
            <span>Didn&apos;t receive the code?</span>
            <button
              id="resend-code"
              onClick={handleResend}
              disabled={resending || countdown > 0}
              className="text-[var(--primary)] hover:opacity-80 font-medium underline underline-offset-2 decoration-transparent hover:decoration-[var(--primary)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {resending
                ? "Sending…"
                : countdown > 0
                ? `Resend in ${countdown}s`
                : "Resend Code"}
            </button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-5">
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

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}
