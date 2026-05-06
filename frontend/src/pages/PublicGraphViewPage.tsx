import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import mermaid from "mermaid";
import { fetchPublicGraph } from "../api/client";
import { settingsFromJson } from "../studio/types";
import { getMermaidConfig } from "../studio/mermaidCfg";
import { appDisplayName } from "../config/app";

let renderIdx = 0;

export function PublicGraphViewPage(): React.ReactElement {
  const { graphId } = useParams<{ graphId: string }>();
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!graphId) return;
    let cancelled = false;
    void (async () => {
      try {
        const g = await fetchPublicGraph(graphId);
        if (cancelled) return;
        setTitle(g.title);
        const S = settingsFromJson(g.settings ?? {});
        const el = hostRef.current;
        if (!el) return;
        try {
          mermaid.initialize(getMermaidConfig(S) as Parameters<typeof mermaid.initialize>[0]);
          const id = `pub${++renderIdx}`;
          const { svg } = await mermaid.render(id, g.code.trim() || "flowchart LR\n  A[Empty]");
          el.innerHTML = svg;
        } catch (e) {
          el.innerHTML = "";
          setErr(e instanceof Error ? e.message : String(e));
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Could not load graph");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [graphId]);

  return (
    <div className="flex min-h-full flex-col bg-[var(--color-loewi-bg)]">
      <header className="flex items-center justify-between border-b border-[var(--color-loewi-border)] bg-[var(--color-loewi-surface)] px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg">⬡</span>
          <div>
            <h1 className="text-sm font-semibold">{title ?? "Shared diagram"}</h1>
            <p className="text-[10px] text-[var(--color-loewi-muted)]">{appDisplayName} · public view</p>
          </div>
        </div>
        <Link to="/login" className="text-xs font-medium text-[var(--color-loewi-accent2)] hover:underline">
          Sign in
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center overflow-auto bg-white p-8">
        {err ? (
          <pre className="max-w-lg whitespace-pre-wrap rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
            {err}
          </pre>
        ) : (
          <div ref={hostRef} className="max-w-full" />
        )}
      </div>
    </div>
  );
}
