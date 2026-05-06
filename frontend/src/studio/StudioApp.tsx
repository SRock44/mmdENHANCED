import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mermaid from "mermaid";
import LZString from "lz-string";
import { useAuth } from "../auth/AuthContext";
import { api, type DiagramDto } from "../api/client";
import { DEFAULT_CODE, TEMPLATES } from "./templates";
import { defaultSettings, settingsFromJson, type StudioSettings } from "./types";
import { getMermaidConfig } from "./mermaidCfg";
import { appDisplayName } from "../config/app";

let renderIdx = 0;

export function StudioApp(): React.ReactElement {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<"style" | "projects">("style");
  const [diagrams, setDiagrams] = useState<DiagramDto[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [name, setName] = useState("Untitled Diagram");
  const [code, setCode] = useState(DEFAULT_CODE);
  const [S, setS] = useState<StudioSettings>(() => defaultSettings());
  const [status, setStatus] = useState<"ok" | "err" | "load">("ok");
  const [statusMsg, setStatusMsg] = useState("Ready");
  const [diagType, setDiagType] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);
  const [tplOpen, setTplOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);

  const loadList = useCallback(async () => {
    const list = await api.listDiagrams();
    setDiagrams(list);
    return list;
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const list = await loadList();
        const h = location.hash.slice(1);
        let fromHash: string | null = null;
        if (h) {
          try {
            fromHash = LZString.decompressFromEncodedURIComponent(h);
          } catch {
            fromHash = null;
          }
        }
        if (list[0]) {
          setCurrentId(list[0].id);
          setName(list[0].name);
          setCode(fromHash && fromHash.length ? fromHash : list[0].code || DEFAULT_CODE);
          setS(settingsFromJson(list[0].settings));
        } else {
          const created = await api.createDiagram({
            name: "Untitled Diagram",
            code: fromHash && fromHash.length ? fromHash : DEFAULT_CODE,
            settings: defaultSettings(),
          });
          setDiagrams([created]);
          setCurrentId(created.id);
          setName(created.name);
          setCode(created.code);
          setS(settingsFromJson(created.settings));
        }
      } catch (e) {
        console.error(e);
        setStatus("err");
        setStatusMsg("Could not load diagrams");
      }
    })();
  }, [loadList]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!currentId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void (async () => {
        try {
          await api.updateDiagram(currentId, {
            name,
            code,
            settings: S as unknown as Record<string, unknown>,
          });
          setDiagrams((prev) =>
            prev.map((d) =>
              d.id === currentId ? { ...d, name, code, settings: S as unknown as Record<string, unknown>, updatedAt: new Date().toISOString() } : d,
            ),
          );
        } catch (e) {
          console.error(e);
        }
      })();
    }, 900);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [name, code, S, currentId]);

  const renderDiagram = useCallback(async () => {
    const el = previewRef.current;
    if (!el) return;
    const trimmed = code.trim();
    if (!trimmed) {
      el.innerHTML = `<div class="text-center text-[#484f58] select-none"><div class="mb-2 text-5xl opacity-25">⬡</div><p>Start typing Mermaid code…</p></div>`;
      setStatus("ok");
      setStatusMsg("Ready");
      setDiagType("");
      return;
    }
    const typeMatch = trimmed.match(
      /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap|timeline)/m,
    );
    setDiagType(typeMatch ? typeMatch[1] : "");
    setStatus("load");
    try {
      mermaid.initialize(getMermaidConfig(S) as Parameters<typeof mermaid.initialize>[0]);
      const id = `mg${++renderIdx}`;
      const { svg } = await mermaid.render(id, trimmed);
      el.innerHTML = svg;
      const svgEl = el.querySelector("svg");
      if (svgEl) {
        svgEl.querySelectorAll(".node rect").forEach((r) => {
          r.setAttribute("rx", String(S.radius));
          r.setAttribute("ry", String(S.radius));
        });
        svgEl.querySelectorAll(".flowchart-link,.edge path,path.transition").forEach((p) => {
          (p as SVGElement).style.strokeWidth = `${S.stroke}px`;
          (p as SVGElement).style.opacity = String(S.edgeOp / 100);
        });
      }
      setStatus("ok");
      setStatusMsg("Rendered");
    } catch (e) {
      el.innerHTML = "";
      const msg = e instanceof Error ? e.message : String(e);
      el.innerHTML = `<pre class="max-w-md whitespace-pre-wrap rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300 font-mono">${msg.replace(/^Error:\s*/, "")}</pre>`;
      setStatus("err");
      setStatusMsg("Parse error");
    }
  }, [code, S]);

  useEffect(() => {
    const t = setTimeout(() => void renderDiagram(), 280);
    return () => clearTimeout(t);
  }, [renderDiagram]);

  const hashSave = useCallback(() => {
    try {
      const h = LZString.compressToEncodedURIComponent(code);
      history.replaceState(null, "", `#${h}`);
    } catch {
      /* ignore */
    }
  }, [code]);

  useEffect(() => {
    hashSave();
  }, [code, hashSave]);

  const stageStyle = useMemo(
    () => ({
      transform: `translate(${S.panX}px, ${S.panY}px) scale(${S.zoom})`,
    }),
    [S.panX, S.panY, S.zoom],
  );

  const bgMap: Record<string, { bg: string; img: string }> = {
    white: { bg: "#fff", img: "none" },
    light: { bg: "#f1f5f9", img: "none" },
    dark: { bg: "#0f172a", img: "none" },
    checker: { bg: "transparent", img: "repeating-conic-gradient(#bbb 0% 25%,#fff 0% 50%)" },
  };
  const vp = bgMap[S.bg] ?? bgMap.white;

  async function newDiagram(): Promise<void> {
    const d = await api.createDiagram({ name: "Untitled Diagram", code: DEFAULT_CODE, settings: defaultSettings() });
    setDiagrams((p) => [d, ...p]);
    setCurrentId(d.id);
    setName(d.name);
    setCode(d.code);
    setS(settingsFromJson(d.settings));
    setTab("projects");
  }

  async function selectDiagram(id: string): Promise<void> {
    const d = diagrams.find((x) => x.id === id);
    if (!d) return;
    setCurrentId(id);
    setName(d.name);
    setCode(d.code);
    setS(settingsFromJson(d.settings));
  }

  async function deleteDiagram(id: string, e: React.MouseEvent): Promise<void> {
    e.stopPropagation();
    if (!confirm("Delete this diagram?")) return;
    await api.deleteDiagram(id);
    const next = diagrams.filter((d) => d.id !== id);
    setDiagrams(next);
    if (currentId === id) {
      if (next[0]) await selectDiagram(next[0].id);
      else {
        const created = await api.createDiagram({ name: "Untitled Diagram", code: DEFAULT_CODE, settings: defaultSettings() });
        setDiagrams([created]);
        setCurrentId(created.id);
        setName(created.name);
        setCode(created.code);
        setS(settingsFromJson(created.settings));
      }
    }
  }

  function exportSvg(): void {
    const svg = previewRef.current?.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
    const u = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: u, download: "diagram.svg" }).click();
    URL.revokeObjectURL(u);
  }

  function exportPng(): void {
    const svg = previewRef.current?.querySelector("svg");
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
    const img = new Image();
    img.onload = () => {
      const sc = 2;
      const c = document.createElement("canvas");
      c.width = (img.naturalWidth || img.width) * sc;
      c.height = (img.naturalHeight || img.height) * sc;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const bg = bgMap[S.bg] ?? bgMap.white;
      if (bg.bg !== "transparent") {
        ctx.fillStyle = bg.bg;
        ctx.fillRect(0, 0, c.width, c.height);
      }
      ctx.scale(sc, sc);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      c.toBlob((b) => {
        if (!b) return;
        const u2 = URL.createObjectURL(b);
        Object.assign(document.createElement("a"), { href: u2, download: "diagram.png" }).click();
        URL.revokeObjectURL(u2);
      }, "image/png");
    };
    img.src = url;
  }

  const initial = (user?.displayName ?? user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="z-40 flex h-[52px] shrink-0 items-center gap-2 border-b border-[var(--color-loewi-border)] bg-[var(--color-loewi-surface)] px-3">
        <div className="flex items-center gap-2 pr-2 font-bold">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-gradient-to-br from-[#7c5cfc] to-[#06b6d4] text-sm text-white">
            ⬡
          </span>
          <span className="text-[15px]">{appDisplayName}</span>
        </div>
        <span className="rounded-full bg-[rgba(124,92,252,.12)] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#9d7dfd]">
          Pro
        </span>
        <div className="mx-1 h-[22px] w-px bg-[var(--color-loewi-border)]" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-[200px] min-w-[80px] cursor-text rounded border-0 bg-transparent px-1.5 py-0.5 text-[13px] text-[var(--color-loewi-muted)] outline-none hover:bg-[var(--color-loewi-surface2)] focus:bg-[var(--color-loewi-surface2)] focus:text-[#e6edf3]"
        />
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTplOpen(true)}
            className="rounded-md border border-[var(--color-loewi-border)] bg-[var(--color-loewi-surface2)] px-3 py-1.5 text-xs font-medium hover:bg-[#30363d]"
          >
            Examples
          </button>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(location.href);
            }}
            className="rounded-md border border-[var(--color-loewi-border)] bg-[var(--color-loewi-surface2)] px-3 py-1.5 text-xs font-medium hover:bg-[#30363d]"
          >
            Share link
          </button>
          <button
            type="button"
            onClick={exportSvg}
            className="rounded-md border border-[var(--color-loewi-border)] bg-[var(--color-loewi-surface2)] px-3 py-1.5 text-xs font-medium hover:bg-[#30363d]"
          >
            SVG
          </button>
          <button
            type="button"
            onClick={exportPng}
            className="rounded-md bg-[var(--color-loewi-accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            PNG
          </button>
          <div className="mx-1 h-[22px] w-px bg-[var(--color-loewi-border)]" />
          <button
            type="button"
            onClick={() => void logout()}
            className="flex items-center gap-2 rounded-md border border-[var(--color-loewi-border)] bg-[var(--color-loewi-surface2)] px-2 py-1 text-xs hover:bg-[#21262d]"
          >
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gradient-to-br from-[#7c5cfc] to-[#06b6d4] text-[11px] font-bold text-white">
              {initial}
            </span>
            <span className="max-w-[100px] truncate text-[var(--color-loewi-muted)]">{user?.displayName ?? "Account"}</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={`flex w-[290px] min-w-[290px] flex-col overflow-hidden border-r border-[var(--color-loewi-border)] bg-[var(--color-loewi-surface)] transition-[width,min-width] ${sidebarHidden ? "w-0 min-w-0 overflow-hidden border-0" : ""}`}
        >
          <div className="flex shrink-0 border-b border-[var(--color-loewi-border)]">
            {(
              [
                ["style", "Style"],
                ["projects", "Projects"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`flex-1 border-b-2 py-2.5 text-[11px] font-semibold ${tab === k ? "border-[var(--color-loewi-accent)] text-[var(--color-loewi-accent)]" : "border-transparent text-[#484f58] hover:text-[var(--color-loewi-muted)]"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "style" ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-3 text-xs">
              <section className="mb-4 border-b border-[#21262d] pb-3">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#484f58]">Theme</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {["default", "dark", "forest", "base", "neutral", "custom"].map((th) => (
                    <button
                      key={th}
                      type="button"
                      onClick={() => setS((s) => ({ ...s, theme: th }))}
                      className={`rounded-lg border-2 px-1 py-2 text-[10px] font-semibold capitalize ${S.theme === th ? "border-[var(--color-loewi-accent)] bg-[rgba(124,92,252,.12)] text-[#9d7dfd]" : "border-[var(--color-loewi-border)] bg-[#0d1117] hover:border-[#7c5cfc]"}`}
                    >
                      {th}
                    </button>
                  ))}
                </div>
              </section>
              <section className="mb-4 border-b border-[#21262d] pb-3">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#484f58]">Typography</div>
                <label className="mb-2 block text-[var(--color-loewi-muted)]">
                  Font
                  <select
                    value={S.font}
                    onChange={(e) => setS((s) => ({ ...s, font: e.target.value }))}
                    className="mt-1 w-full rounded border border-[var(--color-loewi-border)] bg-[#0d1117] px-2 py-1.5 text-[11px] outline-none focus:border-[var(--color-loewi-accent)]"
                  >
                    <option value="'trebuchet ms',verdana,arial">Trebuchet MS</option>
                    <option value="'Inter',sans-serif">Inter</option>
                    <option value="'Fira Code',monospace">Fira Code</option>
                  </select>
                </label>
                <div className="flex items-center justify-between text-[var(--color-loewi-muted)]">
                  Size <span className="font-mono text-[10px] text-[#484f58]">{S.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={28}
                  value={S.fontSize}
                  onChange={(e) => setS((s) => ({ ...s, fontSize: Number(e.target.value) }))}
                  className="w-full accent-[var(--color-loewi-accent)]"
                />
              </section>
              <section className="mb-4">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#484f58]">Layout</div>
                <label className="mb-2 block text-[var(--color-loewi-muted)]">
                  Curve
                  <select
                    value={S.curve}
                    onChange={(e) => setS((s) => ({ ...s, curve: e.target.value }))}
                    className="mt-1 w-full rounded border border-[var(--color-loewi-border)] bg-[#0d1117] px-2 py-1.5 text-[11px] outline-none"
                  >
                    <option value="basis">Basis</option>
                    <option value="linear">Linear</option>
                    <option value="step">Step</option>
                  </select>
                </label>
                <label className="flex items-center justify-between py-1 text-[var(--color-loewi-muted)]">
                  HTML labels
                  <input
                    type="checkbox"
                    checked={S.htmlLabels}
                    onChange={(e) => setS((s) => ({ ...s, htmlLabels: e.target.checked }))}
                  />
                </label>
              </section>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-[#21262d] p-2">
                <button
                  type="button"
                  onClick={() => void newDiagram()}
                  className="w-full rounded-md bg-[var(--color-loewi-accent)] py-2 text-xs font-medium text-white hover:opacity-90"
                >
                  + New diagram
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {diagrams.length === 0 ? (
                  <p className="p-6 text-center text-[#484f58]">No diagrams yet.</p>
                ) : (
                  diagrams.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => void selectDiagram(d.id)}
                      className={`relative mb-1.5 w-full rounded-md border px-3 py-2.5 text-left transition ${d.id === currentId ? "border-[var(--color-loewi-accent)] bg-[rgba(124,92,252,.12)]" : "border-[#21262d] hover:border-[var(--color-loewi-border)] hover:bg-[var(--color-loewi-surface2)]"}`}
                    >
                      <div className="truncate text-xs font-semibold">{d.name}</div>
                      <div className="text-[10px] text-[#484f58]">{new Date(d.updatedAt).toLocaleString()}</div>
                      <button
                        type="button"
                        onClick={(e) => void deleteDiagram(d.id, e)}
                        className="absolute right-2 top-2 leading-none text-[#484f58] hover:text-red-400"
                        aria-label="Delete diagram"
                      >
                        ×
                      </button>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col border-r border-[var(--color-loewi-border)]">
            <div className="flex h-[38px] shrink-0 items-center gap-2 border-b border-[var(--color-loewi-border)] bg-[var(--color-loewi-surface)] px-2">
              <button
                type="button"
                onClick={() => setSidebarHidden((v) => !v)}
                className="rounded px-2 py-1 text-sm text-[var(--color-loewi-muted)] hover:bg-[var(--color-loewi-surface2)]"
              >
                ☰
              </button>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#484f58]">Editor</span>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="min-h-0 flex-1 resize-none bg-[#0d1117] p-4 font-mono text-[12.5px] leading-relaxed text-[#c9d1d9] outline-none"
            />
            <div className="flex shrink-0 items-center gap-2 border-t border-[var(--color-loewi-border)] bg-[var(--color-loewi-surface)] px-3 py-1 text-[10px] text-[#484f58]">
              <span
                className={`h-1.5 w-1.5 rounded-full ${status === "err" ? "bg-red-400" : status === "load" ? "animate-pulse bg-amber-400" : "bg-emerald-400"}`}
              />
              {statusMsg}
              <span className="ml-auto font-mono text-[var(--color-loewi-accent2)]">{diagType}</span>
            </div>
          </div>

          <div className="flex min-w-0 flex-[1.2] flex-col">
            <div className="flex h-[38px] shrink-0 items-center justify-end gap-2 border-b border-[var(--color-loewi-border)] bg-[var(--color-loewi-surface)] px-2">
              {(["white", "light", "dark", "checker"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setS((s) => ({ ...s, bg: b }))}
                  className={`h-[18px] w-[18px] rounded border-2 ${S.bg === b ? "border-[var(--color-loewi-accent)]" : "border-transparent"} ${b === "white" ? "bg-white" : b === "light" ? "bg-slate-100" : b === "dark" ? "bg-slate-900" : "bg-[repeating-conic-gradient(#bbb_0%_25%,#fff_0%_50%)_0/8px_8px]"}`}
                  title={b}
                />
              ))}
              <div className="mx-1 h-4 w-px bg-[var(--color-loewi-border)]" />
              <button
                type="button"
                onClick={() => setS((s) => ({ ...s, zoom: Math.min(s.zoom * 1.25, 8) }))}
                className="rounded px-2 text-xs"
              >
                +
              </button>
              <span className="w-10 text-center font-mono text-[10px]">{Math.round(S.zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setS((s) => ({ ...s, zoom: Math.max(s.zoom / 1.25, 0.08) }))}
                className="rounded px-2 text-xs"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => setS((s) => ({ ...s, zoom: 1, panX: 0, panY: 0 }))}
                className="rounded px-2 text-xs"
              >
                Fit
              </button>
            </div>
            <div
              className="relative min-h-0 flex-1 cursor-grab overflow-hidden active:cursor-grabbing"
              style={{
                background: vp.bg,
                backgroundImage: vp.img,
                backgroundSize: S.bg === "checker" ? "16px 16px" : undefined,
              }}
              onWheel={(e) => {
                e.preventDefault();
                const z = e.deltaY > 0 ? 0.9 : 1.1;
                setS((s) => ({ ...s, zoom: Math.min(Math.max(s.zoom * z, 0.08), 8) }));
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center" style={stageStyle}>
                <div ref={previewRef} className="preview-content" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {tplOpen ? (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => e.target === e.currentTarget && setTplOpen(false)}
        >
          <div className="max-h-[82vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--color-loewi-border)] bg-[var(--color-loewi-surface)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">Templates</h3>
              <button type="button" onClick={() => setTplOpen(false)} className="rounded px-2 text-[var(--color-loewi-muted)] hover:text-white">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => {
                    setCode(t.code);
                    setTplOpen(false);
                  }}
                  className="rounded-lg border border-[var(--color-loewi-border)] bg-[#0d1117] p-4 text-center transition hover:border-[var(--color-loewi-accent)] hover:bg-[rgba(124,92,252,.12)]"
                >
                  <div className="mb-1 text-2xl">{t.icon}</div>
                  <div className="text-xs font-semibold">{t.name}</div>
                  <div className="mt-0.5 text-[10px] text-[#484f58]">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
