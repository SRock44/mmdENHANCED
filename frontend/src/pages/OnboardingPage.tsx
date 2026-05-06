import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { appDisplayName } from "../config/app";

const steps = [
  {
    title: `Welcome to ${appDisplayName}`,
    body: "A focused studio for Mermaid diagrams—live preview, deep theming, and diagrams that sync to your account.",
    icon: "⬡",
  },
  {
    title: "Your profile",
    body: "We’ll use your display name in the app header. You can change it anytime in settings later.",
    icon: "👤",
  },
  {
    title: "Optional: AI keys",
    body: "Bring your own Claude or OpenAI key in the studio—it stays in your browser unless you choose a server integration.",
    icon: "✨",
  },
  {
    title: "You’re ready",
    body: "Open the command palette with ⌘K, browse templates, and export SVG or PNG when you’re done.",
    icon: "🚀",
  },
];

export function OnboardingPage(): React.ReactElement {
  const { setUser, user } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.displayName ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function finish(): Promise<void> {
    setBusy(true);
    setErr(null);
    try {
      const patch: { displayName?: string; onboardingCompleted: boolean } = {
        onboardingCompleted: true,
      };
      if (name.trim()) patch.displayName = name.trim();
      const me = await api.patchMe(patch);
      setUser(me);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not finish onboarding");
    } finally {
      setBusy(false);
    }
  }

  function next(): void {
    setErr(null);
    if (step < steps.length - 1) setStep(step + 1);
  }

  function skipProfile(): void {
    setErr(null);
    setStep(2);
  }

  const s = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--color-loewi-border)] bg-[var(--color-loewi-surface)] shadow-2xl">
        <div className="flex gap-1 px-5 pt-5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= step ? "bg-[var(--color-loewi-accent)]" : "bg-[var(--color-loewi-border)]"}`}
            />
          ))}
        </div>

        <div className="flex flex-col items-center px-8 pb-8 pt-10 text-center">
          <div className="mb-4 text-5xl">{s.icon}</div>
          <h2 className="mb-2 text-xl font-bold tracking-tight">{s.title}</h2>
          <p className="mb-8 max-w-md text-sm leading-relaxed text-[var(--color-loewi-muted)]">{s.body}</p>

          {step === 1 ? (
            <div className="mb-6 w-full text-left">
              <label className="text-xs font-medium text-[var(--color-loewi-muted)]">
                Display name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex"
                  className="mt-1.5 w-full rounded-lg border border-[var(--color-loewi-border)] bg-[#0d1117] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-loewi-accent)]"
                />
              </label>
            </div>
          ) : null}

          {err ? <p className="mb-4 w-full text-left text-sm text-red-400">{err}</p> : null}

          <div className="flex w-full flex-wrap items-center justify-center gap-3">
            {step === 1 ? (
              <button
                type="button"
                onClick={skipProfile}
                className="rounded-lg border border-[var(--color-loewi-border)] px-4 py-2 text-sm text-[var(--color-loewi-muted)] hover:bg-[var(--color-loewi-surface2)]"
              >
                Skip
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (step === steps.length - 1) void finish();
                else next();
              }}
              className="min-w-[140px] rounded-lg bg-[var(--color-loewi-accent)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {step === steps.length - 1 ? (busy ? "Saving…" : "Enter studio") : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
