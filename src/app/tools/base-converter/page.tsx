"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

type BitwiseOp = "AND" | "OR" | "XOR" | "NOT" | "LEFT_SHIFT" | "RIGHT_SHIFT";

function parseInBase(value: string, base: number): number {
  return Number.parseInt(value || "0", base);
}

export default function BaseConverterPage() {
  const [value, setValue] = useState("42");
  const [base, setBase] = useState("10");

  const [opA, setOpA] = useState("12");
  const [opB, setOpB] = useState("10");
  const [op, setOp] = useState<BitwiseOp>("AND");

  const converted = useMemo(() => {
    const parsed = parseInBase(value, Number(base) || 10);
    if (Number.isNaN(parsed)) {
      return null;
    }

    return {
      decimal: parsed.toString(10),
      binary: parsed.toString(2),
      octal: parsed.toString(8),
      hex: parsed.toString(16).toUpperCase(),
      base36: parsed.toString(36).toUpperCase(),
    };
  }, [base, value]);

  const bitwiseResult = useMemo(() => {
    const a = Number(opA) || 0;
    const b = Number(opB) || 0;

    switch (op) {
      case "AND":
        return a & b;
      case "OR":
        return a | b;
      case "XOR":
        return a ^ b;
      case "NOT":
        return ~a;
      case "LEFT_SHIFT":
        return a << b;
      case "RIGHT_SHIFT":
        return a >> b;
      default:
        return 0;
    }
  }, [op, opA, opB]);

  return (
    <ToolPageShell
      title="Number Base Converter"
      description="Convert numbers across bases 2-36 and evaluate common bitwise operations."
    >
      <div className="grid lg:grid-cols-2 gap-4">
        <section className="rounded-xl border p-3 space-y-2">
          <h2 className="font-medium">Base Conversion</h2>
          <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Value" className="font-mono" />
          <Input value={base} onChange={(event) => setBase(event.target.value)} placeholder="Input base (2-36)" />

          {converted ? (
            <div className="text-sm space-y-1 font-mono">
              <p>Decimal: {converted.decimal}</p>
              <p>Binary: {converted.binary}</p>
              <p>Octal: {converted.octal}</p>
              <p>Hex: {converted.hex}</p>
              <p>Base36: {converted.base36}</p>
            </div>
          ) : (
            <p className="text-sm text-destructive">Invalid input for selected base.</p>
          )}
        </section>

        <section className="rounded-xl border p-3 space-y-2">
          <h2 className="font-medium">Bitwise Calculator</h2>
          <Input value={opA} onChange={(event) => setOpA(event.target.value)} placeholder="A" />
          <Input value={opB} onChange={(event) => setOpB(event.target.value)} placeholder="B / shift count" />
          <select value={op} onChange={(event) => setOp(event.target.value as BitwiseOp)} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="AND">AND</option>
            <option value="OR">OR</option>
            <option value="XOR">XOR</option>
            <option value="NOT">NOT (A only)</option>
            <option value="LEFT_SHIFT">LEFT SHIFT</option>
            <option value="RIGHT_SHIFT">RIGHT SHIFT</option>
          </select>

          <p className="font-mono text-sm">Result: {bitwiseResult} (bin {bitwiseResult.toString(2)})</p>
        </section>
      </div>
    </ToolPageShell>
  );
}
