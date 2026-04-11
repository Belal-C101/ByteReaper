"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

const DECIMAL_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"];
const BINARY_UNITS = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];

function toBytes(value: number, unit: string, binary: boolean): number {
  const units: string[] = binary ? BINARY_UNITS : DECIMAL_UNITS;
  const power = units.indexOf(unit);
  const base = binary ? 1024 : 1000;
  return value * base ** Math.max(0, power);
}

function fromBytes(bytes: number, unit: string, binary: boolean): number {
  const units: string[] = binary ? BINARY_UNITS : DECIMAL_UNITS;
  const power = units.indexOf(unit);
  const base = binary ? 1024 : 1000;
  return bytes / base ** Math.max(0, power);
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

export default function BytesConverterPage() {
  const [value, setValue] = useState("1");
  const [inputUnit, setInputUnit] = useState("GB");
  const [binary, setBinary] = useState(false);

  const [speed, setSpeed] = useState("100");
  const [speedUnit, setSpeedUnit] = useState("MB");

  const units = binary ? BINARY_UNITS : DECIMAL_UNITS;

  const bytes = useMemo(() => toBytes(Number(value) || 0, inputUnit, binary), [binary, inputUnit, value]);
  const transferSeconds = useMemo(() => {
    const bytesPerSecond = toBytes(Number(speed) || 0, speedUnit, binary);
    if (bytesPerSecond <= 0) return 0;
    return bytes / bytesPerSecond;
  }, [binary, bytes, speed, speedUnit]);

  return (
    <ToolPageShell
      title="Byte/Unit Converter"
      description="Convert storage units using binary or decimal scales and estimate transfer time from link speed."
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={binary} onChange={(event) => setBinary(event.target.checked)} />
            Use binary units (KiB, MiB, GiB)
          </label>
        </div>

        <section className="rounded-xl border p-3 grid md:grid-cols-[1fr_220px] gap-3">
          <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder="value" />
          <select value={inputUnit} onChange={(event) => setInputUnit(event.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
            {units.map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>

          <div className="md:col-span-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
            {units.map((unit) => (
              <div key={unit} className="rounded-md border p-2">
                <p className="text-muted-foreground">{unit}</p>
                <p className="font-mono">{fromBytes(bytes, unit, binary).toFixed(6)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border p-3 space-y-3">
          <h2 className="font-medium">Bandwidth calculator</h2>
          <div className="grid sm:grid-cols-[1fr_220px] gap-2">
            <Input value={speed} onChange={(event) => setSpeed(event.target.value)} placeholder="Transfer speed" />
            <select value={speedUnit} onChange={(event) => setSpeedUnit(event.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
              {units.map((unit) => (
                <option key={unit} value={unit}>{unit}/s</option>
              ))}
            </select>
          </div>
          <p className="text-sm">Estimated transfer time: <strong>{formatDuration(transferSeconds)}</strong></p>
        </section>
      </div>
    </ToolPageShell>
  );
}
