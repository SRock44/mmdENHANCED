import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function RegisterPage(): React.ReactElement {
  const { register, user, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    if (!user.onboardingCompleted) nav("/onboarding", { replace: true });
    else nav("/", { replace: true });
  }, [user, loading, nav]);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await register(email.trim(), password, displayName.trim() || undefined);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center text-[var(--color-loewi-muted)]">Loading…</div>
    );
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c5cfc] to-[#06b6d4] text-lg font-bold text-white">
          ⬡
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">loewiMMD</h1>
          <p className="text-xs text-[var(--color-loewi-muted)]">Create your workspace</p>
        </div>
      </div>

      <div className="w-full max-w-[400px] rounded-2xl border border-[var(--color-loewi-border)] bg-[var(--color-loewi-surface)] p-8 shadow-2xl">
        <h2 className="mb-1 text-lg font-semibold">Create account</h2>
        <p className="mb-6 text-sm text-[var(--color-loewi-muted)]">8+ character password. Email must be unique.</p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="block text-xs font-medium text-[var(--color-loewi-muted)]">
            Display name
            <input
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Alex"
              className="mt-1.5 w-full rounded-lg border border-[var(--color-loewi-border)] bg-[#0d1117] px-3 py-2.5 text-sm text-[#e6edf3] outline-none focus:border-[var(--color-loewi-accent)]"
            />
          </label>
          <label className="block text-xs font-medium text-[var(--color-loewi-muted)]">
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-loewi-border)] bg-[#0d1117] px-3 py-2.5 text-sm text-[#e6edf3] outline-none focus:border-[var(--color-loewi-accent)]"
              required
            />
          </label>
          <label className="block text-xs font-medium text-[var(--color-loewi-muted)]">
            Password
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-loewi-border)] bg-[#0d1117] px-3 py-2.5 text-sm text-[#e6edf3] outline-none focus:border-[var(--color-loewi-accent)]"
              required
            />
          </label>
          {err ? <p className="text-sm text-red-400">{err}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="mt-2 rounded-lg bg-[var(--color-loewi-accent)] py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--color-loewi-muted)]">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-[var(--color-loewi-accent2)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
