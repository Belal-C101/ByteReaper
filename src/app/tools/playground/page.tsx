"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

interface PlaygroundState {
  html: string;
  css: string;
  js: string;
}

const PRESETS: Array<{ name: string; state: PlaygroundState }> = [
  {
    name: "Starter HTML",
    state: {
      html: "<main>\n  <h1>Hello ByteReaper</h1>\n  <p>Edit HTML, CSS, and JS.</p>\n</main>",
      css: "body { font-family: sans-serif; padding: 24px; }\nmain { max-width: 680px; margin: 0 auto; }",
      js: "console.log('Playground ready');",
    },
  },
  {
    name: "Tailwind-like card",
    state: {
      html: "<div class='card'>\n  <h2>Gradient Card</h2>\n  <p>Build quick prototypes here.</p>\n</div>",
      css: "body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: radial-gradient(circle at 10% 10%, #1d4ed8, #0f172a); color: #e2e8f0; }\n.card { width: min(420px, 90vw); border-radius: 16px; border: 1px solid rgba(226,232,240,0.2); padding: 20px; backdrop-filter: blur(4px); background: rgba(15, 23, 42, 0.65); }",
      js: "console.log('Card preset loaded');",
    },
  },
  {
    name: "Animation demo",
    state: {
      html: "<div class='dot'></div>",
      css: "body { min-height: 100vh; display: grid; place-items: center; background: #020617; }\n.dot { width: 72px; height: 72px; border-radius: 999px; background: linear-gradient(135deg, #38bdf8, #818cf8); animation: pulse 1.6s infinite ease-in-out; }\n@keyframes pulse { 0%,100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.35); opacity: 1; } }",
      js: "console.log('Animation loop running');",
    },
  },
];

function encodeState(state: PlaygroundState): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

function decodeState(encoded: string): PlaygroundState | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded)))) as PlaygroundState;
  } catch {
    return null;
  }
}

export default function PlaygroundPage() {
  const [html, setHtml] = useState(PRESETS[0]?.state.html ?? "");
  const [css, setCss] = useState(PRESETS[0]?.state.css ?? "");
  const [js, setJs] = useState(PRESETS[0]?.state.js ?? "");
  const [srcDoc, setSrcDoc] = useState("");
  const [consoleLines, setConsoleLines] = useState<string[]>([]);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const parsed = decodeState(hash);
    if (!parsed) return;
    setHtml(parsed.html);
    setCss(parsed.css);
    setJs(parsed.js);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const doc = `<!doctype html><html><head><style>${css}</style></head><body>${html}<script>\nconst send = (type,args) => parent.postMessage({type,args}, '*');\nconsole.log = (...args) => send('log', args);\nconsole.error = (...args) => send('error', args);\nwindow.onerror = (msg, src, line, col) => send('error', [String(msg), src + ':' + line + ':' + col]);\ntry {\n${js}\n} catch (e) {\n  send('error', [e?.message || 'runtime error']);\n}\n<\/script></body></html>`;
      setSrcDoc(doc);
    }, 280);

    return () => window.clearTimeout(id);
  }, [css, html, js]);

  useEffect(() => {
    const handler = (event: MessageEvent<{ type?: string; args?: unknown[] }>) => {
      if (!event.data?.type || !Array.isArray(event.data.args)) return;
      const prefix = event.data.type === "error" ? "ERROR" : "LOG";
      const line = `${prefix}: ${event.data.args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ")}`;
      setConsoleLines((current) => [line, ...current].slice(0, 40));
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const shareHash = useMemo(() => encodeState({ html, css, js }), [css, html, js]);

  return (
    <ToolPageShell
      title="HTML/CSS/JS Playground"
      description="Experiment in three live code panes, inspect console output, and share runnable snippets through URL hash state."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.name}
              size="sm"
              variant="outline"
              onClick={() => {
                setHtml(preset.state.html);
                setCss(preset.state.css);
                setJs(preset.state.js);
                setConsoleLines([]);
              }}
            >
              {preset.name}
            </Button>
          ))}

          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              window.location.hash = shareHash;
              navigator.clipboard.writeText(window.location.href).catch(() => undefined);
            }}
          >
            Share (copy URL)
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const starter = PRESETS[0]?.state;
              if (!starter) return;
              setHtml(starter.html);
              setCss(starter.css);
              setJs(starter.js);
              setConsoleLines([]);
              window.location.hash = "";
            }}
          >
            Reset
          </Button>
        </div>

        <div className="grid xl:grid-cols-3 gap-3">
          <section className="space-y-2">
            <h2 className="text-sm font-medium">HTML</h2>
            <Textarea value={html} onChange={(event) => setHtml(event.target.value)} className="min-h-[220px] font-mono text-xs" />
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-medium">CSS</h2>
            <Textarea value={css} onChange={(event) => setCss(event.target.value)} className="min-h-[220px] font-mono text-xs" />
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-medium">JS</h2>
            <Textarea value={js} onChange={(event) => setJs(event.target.value)} className="min-h-[220px] font-mono text-xs" />
          </section>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-4">
          <section className="rounded-xl border overflow-hidden min-h-[280px]">
            <div className="px-3 py-2 border-b text-sm font-medium">Live Preview</div>
            <iframe srcDoc={srcDoc} title="Playground preview" className="w-full h-[360px] bg-white" sandbox="allow-scripts" />
          </section>

          <section className="rounded-xl border overflow-hidden">
            <div className="px-3 py-2 border-b text-sm font-medium">Console</div>
            <div className="h-[360px] overflow-auto p-3 font-mono text-xs space-y-1">
              {consoleLines.length === 0 ? (
                <p className="text-muted-foreground">Console output appears here.</p>
              ) : (
                consoleLines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)
              )}
            </div>
          </section>
        </div>
      </div>
    </ToolPageShell>
  );
}
