"use client";

import { useMemo, useState } from "react";
import cronstrue from "cronstrue";
import cronParser from "cron-parser";
import { Input } from "@/components/ui/input";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

const PRESETS = [
  { label: "Every minute", expr: "* * * * *" },
  { label: "Hourly", expr: "0 * * * *" },
  { label: "Daily at midnight", expr: "0 0 * * *" },
  { label: "Weekly (Mon 09:00)", expr: "0 9 * * 1" },
  { label: "Monthly (1st 00:00)", expr: "0 0 1 * *" },
];

export default function CronPage() {
  const [expression, setExpression] = useState("*/15 * * * *");

  const human = useMemo(() => {
    try {
      return cronstrue.toString(expression);
    } catch {
      return "Invalid cron expression";
    }
  }, [expression]);

  const nextRuns = useMemo(() => {
    try {
      const interval = cronParser.parse(expression);
      return Array.from({ length: 5 }, () => interval.next().toString());
    } catch {
      return [] as string[];
    }
  }, [expression]);

  const [minute, setMinute] = useState("*");
  const [hour, setHour] = useState("*");
  const [dayOfMonth, setDayOfMonth] = useState("*");
  const [month, setMonth] = useState("*");
  const [dayOfWeek, setDayOfWeek] = useState("*");

  const applyBuilder = () => {
    setExpression(`${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`);
  };

  return (
    <ToolPageShell
      title="Crontab Translator"
      description="Translate cron syntax to plain language, preview upcoming runs, and build expressions interactively."
    >
      <div className="space-y-4">
        <Input value={expression} onChange={(event) => setExpression(event.target.value)} className="font-mono" placeholder="*/5 * * * *" />
        <p className="text-sm">{human}</p>

        <section className="rounded-xl border p-3 space-y-2">
          <h2 className="font-medium">Next 5 runs</h2>
          {nextRuns.length === 0 ? (
            <p className="text-sm text-destructive">Unable to compute run times.</p>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {nextRuns.map((run) => (
                <li key={run} className="font-mono text-xs">{run}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border p-3 space-y-3">
          <h2 className="font-medium">Interactive builder</h2>
          <div className="grid md:grid-cols-5 gap-2">
            <Input value={minute} onChange={(event) => setMinute(event.target.value)} placeholder="minute" className="font-mono" />
            <Input value={hour} onChange={(event) => setHour(event.target.value)} placeholder="hour" className="font-mono" />
            <Input value={dayOfMonth} onChange={(event) => setDayOfMonth(event.target.value)} placeholder="day" className="font-mono" />
            <Input value={month} onChange={(event) => setMonth(event.target.value)} placeholder="month" className="font-mono" />
            <Input value={dayOfWeek} onChange={(event) => setDayOfWeek(event.target.value)} placeholder="weekday" className="font-mono" />
          </div>
          <button type="button" onClick={applyBuilder} className="rounded-md border px-3 py-2 text-sm hover:bg-accent">
            Apply builder expression
          </button>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.expr}
                type="button"
                onClick={() => setExpression(preset.expr)}
                className="rounded-full border px-3 py-1 text-xs hover:bg-accent"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </ToolPageShell>
  );
}
