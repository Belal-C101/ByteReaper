"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

interface PermSet {
  r: boolean;
  w: boolean;
  x: boolean;
}

function valueFromPerm(perm: PermSet): number {
  return (perm.r ? 4 : 0) + (perm.w ? 2 : 0) + (perm.x ? 1 : 0);
}

function symbolicFromPerm(perm: PermSet): string {
  return `${perm.r ? "r" : "-"}${perm.w ? "w" : "-"}${perm.x ? "x" : "-"}`;
}

export default function ChmodPage() {
  const [owner, setOwner] = useState<PermSet>({ r: true, w: true, x: true });
  const [group, setGroup] = useState<PermSet>({ r: true, w: false, x: true });
  const [others, setOthers] = useState<PermSet>({ r: true, w: false, x: true });
  const [numericInput, setNumericInput] = useState("755");

  const numeric = useMemo(() => `${valueFromPerm(owner)}${valueFromPerm(group)}${valueFromPerm(others)}`, [owner, group, others]);
  const symbolic = useMemo(() => `${symbolicFromPerm(owner)}${symbolicFromPerm(group)}${symbolicFromPerm(others)}`, [owner, group, others]);

  const applyNumeric = () => {
    if (!/^[0-7]{3}$/.test(numericInput)) return;
    const [o, g, ot] = numericInput.split("").map(Number);
    const toSet = (value: number): PermSet => ({ r: Boolean(value & 4), w: Boolean(value & 2), x: Boolean(value & 1) });
    setOwner(toSet(o));
    setGroup(toSet(g));
    setOthers(toSet(ot));
  };

  const row = (label: string, state: PermSet, setter: (next: PermSet) => void) => (
    <div className="grid grid-cols-[90px_repeat(3,1fr)] items-center gap-2">
      <p className="text-sm">{label}</p>
      {(["r", "w", "x"] as const).map((key) => (
        <label key={key} className="inline-flex items-center gap-2 text-sm rounded border px-2 py-1.5">
          <input type="checkbox" checked={state[key]} onChange={(event) => setter({ ...state, [key]: event.target.checked })} />
          {key}
        </label>
      ))}
    </div>
  );

  return (
    <ToolPageShell
      title="Chmod Calculator"
      description="Toggle Unix file permissions visually and convert between numeric and symbolic notations."
    >
      <div className="space-y-4">
        <section className="rounded-xl border p-3 space-y-3">
          {row("Owner", owner, setOwner)}
          {row("Group", group, setGroup)}
          {row("Others", others, setOthers)}
        </section>

        <section className="rounded-xl border p-3 grid md:grid-cols-2 gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Numeric</p>
            <p className="text-2xl font-mono">{numeric}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Symbolic</p>
            <p className="text-2xl font-mono">{symbolic}</p>
          </div>
        </section>

        <section className="rounded-xl border p-3 space-y-2">
          <p className="text-sm font-medium">Reverse lookup</p>
          <div className="flex items-center gap-2">
            <Input value={numericInput} onChange={(event) => setNumericInput(event.target.value)} className="w-28 font-mono" placeholder="755" />
            <button className="rounded-md border px-3 py-2 text-sm hover:bg-accent" type="button" onClick={applyNumeric}>
              Apply
            </button>
          </div>
        </section>
      </div>
    </ToolPageShell>
  );
}
