import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { appDisplayName, siteId } from "../config/app";

export function LoginPage(): React.ReactElement {
  const { signInWithGoogle, user, loading } = useAuth();
  const nav = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    nav("/", { replace: true });
  }, [user, loading, nav]);

  async function onGoogle(): Promise<void> {
    setErr(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Google sign-in failed";
      setErr(`${msg}. If you use an ad-blocker/privacy extension, allow accounts.google.com and try again.`);
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
          ?
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{appDisplayName}</h1>
          <p className="text-xs text-[var(--color-loewi-muted)]">{siteId} · Sign in with Google</p>
        </div>
      </div>

      <div className="w-full max-w-[420px] rounded-2xl border border-[var(--color-loewi-border)] bg-[var(--color-loewi-surface)] p-8 shadow-2xl">
        <h2 className="mb-1 text-lg font-semibold">Sign in</h2>
        <p className="mb-6 text-sm text-[var(--color-loewi-muted)]">
          Google auth only. Popup blockers may force redirect flow automatically.
        </p>

        {err ? <p className="mb-4 text-sm text-red-400">{err}</p> : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => void onGoogle()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-loewi-border)] bg-white py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          <span className="text-lg">G</span>
          {busy ? "Opening Google…" : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}
