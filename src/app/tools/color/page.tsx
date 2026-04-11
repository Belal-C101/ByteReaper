"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { CopyButton } from "@/components/tools/copy-button";
import { Button } from "@/components/ui/button";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3 ? normalized.split("").map((x) => x + x).join("") : normalized;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsl({ r, g, b }: Rgb): string {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === nr) h = ((ng - nb) / delta) % 6;
    else if (max === ng) h = (nb - nr) / delta + 2;
    else h = (nr - ng) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return `hsl(${h}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function luminance({ r, g, b }: Rgb): number {
  const map = (value: number) => {
    const srgb = value / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * map(r) + 0.7152 * map(g) + 0.0722 * map(b);
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return Number(((light + 0.05) / (dark + 0.05)).toFixed(2));
}

const TAILWIND_LOOKUP: Array<{ className: string; hex: string }> = [
  { className: "bg-blue-500", hex: "#3b82f6" },
  { className: "bg-emerald-500", hex: "#10b981" },
  { className: "bg-red-500", hex: "#ef4444" },
  { className: "bg-amber-500", hex: "#f59e0b" },
  { className: "bg-violet-500", hex: "#8b5cf6" },
];

export default function ColorToolsPage() {
  const [baseHex, setBaseHex] = useState("#3b82f6");
  const [bgHex, setBgHex] = useState("#0f172a");
  const [gradientFrom, setGradientFrom] = useState("#3b82f6");
  const [gradientTo, setGradientTo] = useState("#14b8a6");

  const baseRgb = useMemo(() => hexToRgb(baseHex), [baseHex]);
  const bgRgb = useMemo(() => hexToRgb(bgHex), [bgHex]);
  const ratio = useMemo(() => contrastRatio(baseRgb, bgRgb), [baseRgb, bgRgb]);

  const palette = useMemo(() => {
    const { r, g, b } = baseRgb;
    return {
      complementary: rgbToHex({ r: 255 - r, g: 255 - g, b: 255 - b }),
      analogousA: rgbToHex({ r, g: Math.min(255, g + 40), b: Math.max(0, b - 20) }),
      analogousB: rgbToHex({ r: Math.max(0, r - 30), g, b: Math.min(255, b + 40) }),
      triadicA: rgbToHex({ r: g, g: b, b: r }),
      triadicB: rgbToHex({ r: b, g: r, b: g }),
      splitA: rgbToHex({ r: 255 - r, g: Math.min(255, b + 20), b: Math.max(0, g - 20) }),
      splitB: rgbToHex({ r: 255 - r, g: Math.max(0, b - 20), b: Math.min(255, g + 20) }),
    };
  }, [baseRgb]);

  const gradientCss = `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`;

  const nearestTailwind = useMemo(() => {
    const base = hexToRgb(baseHex);
    const score = (candidate: { hex: string }) => {
      const c = hexToRgb(candidate.hex);
      return Math.abs(base.r - c.r) + Math.abs(base.g - c.g) + Math.abs(base.b - c.b);
    };
    return [...TAILWIND_LOOKUP].sort((a, b) => score(a) - score(b))[0];
  }, [baseHex]);

  return (
    <ToolPageShell
      title="Color Tools"
      description="Convert HEX/RGB/HSL, check WCAG contrast, generate palettes, and build gradients."
    >
      <div className="space-y-4">
        <section className="rounded-xl border p-4 grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h2 className="font-medium">Base color</h2>
            <Input type="color" value={baseHex} onChange={(event) => setBaseHex(event.target.value)} className="h-10 p-1" />
            <Input value={baseHex} onChange={(event) => setBaseHex(event.target.value)} />
            <p className="text-sm">RGB: {baseRgb.r}, {baseRgb.g}, {baseRgb.b}</p>
            <p className="text-sm">HSL: {rgbToHsl(baseRgb)}</p>
            <p className="text-sm">Nearest Tailwind class: <span className="font-mono">{nearestTailwind?.className}</span></p>
          </div>
          <div className="rounded-lg border" style={{ backgroundColor: baseHex }} />
        </section>

        <section className="rounded-xl border p-4 space-y-3">
          <h2 className="font-medium">Contrast checker</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            <Input type="color" value={baseHex} onChange={(event) => setBaseHex(event.target.value)} className="h-10 p-1" />
            <Input type="color" value={bgHex} onChange={(event) => setBgHex(event.target.value)} className="h-10 p-1" />
          </div>
          <div className="rounded-lg border p-4" style={{ color: baseHex, backgroundColor: bgHex }}>
            The quick brown fox jumps over the lazy dog.
          </div>
          <p className="text-sm">Contrast ratio: <strong>{ratio}:1</strong> ({ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : "Fail"})</p>
        </section>

        <section className="rounded-xl border p-4 space-y-3">
          <h2 className="font-medium">Palette generator</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(palette).map(([key, value]) => (
              <div key={key} className="rounded-lg border overflow-hidden">
                <div className="h-16" style={{ backgroundColor: value }} />
                <div className="p-2 text-xs">
                  <p className="font-medium capitalize">{key}</p>
                  <p className="font-mono">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border p-4 space-y-3">
          <h2 className="font-medium">CSS gradient builder</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            <Input type="color" value={gradientFrom} onChange={(event) => setGradientFrom(event.target.value)} className="h-10 p-1" />
            <Input type="color" value={gradientTo} onChange={(event) => setGradientTo(event.target.value)} className="h-10 p-1" />
          </div>
          <div className="rounded-lg border h-24" style={{ backgroundImage: gradientCss }} />
          <div className="flex items-center gap-2">
            <code className="text-xs rounded bg-muted px-2 py-1">background: {gradientCss};</code>
            <CopyButton value={`background: ${gradientCss};`} />
          </div>
          <Button size="sm" variant="outline" onClick={() => { setGradientFrom(baseHex); setGradientTo(palette.complementary); }}>
            Use base + complementary
          </Button>
        </section>
      </div>
    </ToolPageShell>
  );
}
