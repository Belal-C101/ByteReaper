"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

export default function CssUnitsPage() {
  const [value, setValue] = useState("16");
  const [baseFontSize, setBaseFontSize] = useState("16");
  const [viewportWidth, setViewportWidth] = useState("1440");
  const [viewportHeight, setViewportHeight] = useState("900");

  const converted = useMemo(() => {
    const px = Number(value) || 0;
    const base = Number(baseFontSize) || 16;
    const vwBase = Number(viewportWidth) || 1440;
    const vhBase = Number(viewportHeight) || 900;

    return {
      px,
      rem: px / base,
      em: px / base,
      vw: (px / vwBase) * 100,
      vh: (px / vhBase) * 100,
      percent: (px / base) * 100,
      pt: px * 0.75,
    };
  }, [baseFontSize, value, viewportHeight, viewportWidth]);

  return (
    <ToolPageShell
      title="CSS Unit Converter"
      description="Convert values across common CSS units with adjustable font-size and viewport assumptions."
    >
      <div className="grid md:grid-cols-2 gap-4">
        <section className="rounded-xl border p-3 space-y-2">
          <h2 className="font-medium">Input</h2>
          <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder="px value" />
          <Input value={baseFontSize} onChange={(event) => setBaseFontSize(event.target.value)} placeholder="base font size" />
          <Input value={viewportWidth} onChange={(event) => setViewportWidth(event.target.value)} placeholder="viewport width" />
          <Input value={viewportHeight} onChange={(event) => setViewportHeight(event.target.value)} placeholder="viewport height" />
        </section>

        <section className="rounded-xl border p-3 space-y-2 text-sm">
          <h2 className="font-medium">Converted</h2>
          <p>px: {converted.px.toFixed(4)}</p>
          <p>rem: {converted.rem.toFixed(4)}</p>
          <p>em: {converted.em.toFixed(4)}</p>
          <p>vw: {converted.vw.toFixed(4)}</p>
          <p>vh: {converted.vh.toFixed(4)}</p>
          <p>%: {converted.percent.toFixed(4)}</p>
          <p>pt: {converted.pt.toFixed(4)}</p>
        </section>
      </div>
    </ToolPageShell>
  );
}
