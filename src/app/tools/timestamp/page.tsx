"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

const COMMON_TIMEZONES = ["UTC", "America/New_York", "Europe/London", "Europe/Berlin", "Asia/Dubai", "Asia/Tokyo"];

function formatRelative(date: Date): string {
  const deltaSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];

  for (const [unit, secondsInUnit] of units) {
    if (Math.abs(deltaSeconds) >= secondsInUnit || unit === "second") {
      return formatter.format(Math.round(deltaSeconds / secondsInUnit), unit);
    }
  }

  return "now";
}

export default function TimestampConverterPage() {
  const [now, setNow] = useState(Date.now());
  const [timestampInput, setTimestampInput] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [useMilliseconds, setUseMilliseconds] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const parsedTimestampDate = useMemo(() => {
    if (!timestampInput.trim()) return null;
    const raw = Number(timestampInput.trim());
    if (Number.isNaN(raw)) return null;
    const millis = useMilliseconds ? raw : raw * 1000;
    const date = new Date(millis);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }, [timestampInput, useMilliseconds]);

  const formattedTimestampDate = useMemo(() => {
    if (!parsedTimestampDate) return "";
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      dateStyle: "full",
      timeStyle: "long",
    }).format(parsedTimestampDate);
  }, [parsedTimestampDate, timezone]);

  const timestampFromDate = useMemo(() => {
    if (!dateInput.trim()) return "";
    const parsed = new Date(dateInput);
    if (Number.isNaN(parsed.getTime())) return "Invalid date";
    return String(useMilliseconds ? parsed.getTime() : Math.floor(parsed.getTime() / 1000));
  }, [dateInput, useMilliseconds]);

  return (
    <ToolPageShell
      title="Unix Timestamp Converter"
      description="Convert timestamps and dates in both directions with timezone and seconds/milliseconds support."
    >
      <div className="space-y-4">
        <div className="rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Current timestamp</p>
            <p className="font-mono text-xl">{useMilliseconds ? now : Math.floor(now / 1000)}</p>
          </div>
          <Button variant="outline" onClick={() => setTimestampInput(String(useMilliseconds ? now : Math.floor(now / 1000)))}>
            Use now
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useMilliseconds} onChange={(event) => setUseMilliseconds(event.target.checked)} />
            Use milliseconds
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            Timezone
            <select value={timezone} onChange={(event) => setTimezone(event.target.value)} className="rounded-md border bg-background h-9 px-2">
              {COMMON_TIMEZONES.map((zone) => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <section className="rounded-xl border p-3 space-y-2">
            <h2 className="font-medium">Timestamp to Date</h2>
            <Input value={timestampInput} onChange={(event) => setTimestampInput(event.target.value)} placeholder="1710200000" className="font-mono" />
            <p className="text-sm text-muted-foreground break-words">{formattedTimestampDate || "Enter a timestamp"}</p>
            {parsedTimestampDate && <p className="text-xs text-muted-foreground">{formatRelative(parsedTimestampDate)}</p>}
          </section>

          <section className="rounded-xl border p-3 space-y-2">
            <h2 className="font-medium">Date to Timestamp</h2>
            <Input value={dateInput} onChange={(event) => setDateInput(event.target.value)} placeholder="2026-04-11T12:00:00Z" className="font-mono" />
            <p className="text-sm font-mono break-all">{timestampFromDate || "Enter a date"}</p>
          </section>
        </div>
      </div>
    </ToolPageShell>
  );
}
