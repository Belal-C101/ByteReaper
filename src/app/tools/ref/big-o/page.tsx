"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { BIG_O_TABLE, SORTING_COMPLEXITY } from "@/lib/tools/reference-data";

const LEGEND = [
  { key: 1, label: "O(1)" },
  { key: 1.2, label: "O(n log n)" },
  { key: 2, label: "O(n^2)" },
];

export default function BigOReferencePage() {
  return (
    <ToolPageShell
      title="Big-O Cheatsheet"
      description="Compare time and space complexity for common data structures and sorting algorithms."
    >
      <div className="space-y-5">
        <section className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2">Data Structure</th>
                <th className="text-left px-3 py-2">Access</th>
                <th className="text-left px-3 py-2">Search</th>
                <th className="text-left px-3 py-2">Insert</th>
                <th className="text-left px-3 py-2">Delete</th>
                <th className="text-left px-3 py-2">Space</th>
              </tr>
            </thead>
            <tbody>
              {BIG_O_TABLE.map((row) => (
                <tr key={row.structure} className="border-t border-border/50">
                  <td className="px-3 py-2">{row.structure}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.access}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.search}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.insert}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.delete}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.space}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border p-3">
          <h2 className="font-medium mb-2">Sorting complexity comparison</h2>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={SORTING_COMPLEXITY}>
                <XAxis dataKey="name" />
                <YAxis domain={[0.8, 2.1]} />
                <Tooltip />
                <Line type="monotone" dataKey="best" stroke="hsl(var(--success))" strokeWidth={2} />
                <Line type="monotone" dataKey="average" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="worst" stroke="hsl(var(--destructive))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
            {LEGEND.map((item) => (
              <span key={item.label} className="rounded border px-2 py-1">{item.label} = {item.key}</span>
            ))}
          </div>
        </section>
      </div>
    </ToolPageShell>
  );
}
