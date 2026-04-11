"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CopyButton } from "@/components/tools/copy-button";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";
const AMBIGUOUS = "O0Il1";

function scorePassword(password: string): number {
  if (!password) return 0;
  let score = Math.min(50, password.length * 4);
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;
  if (password.length >= 16) score += 5;
  return Math.min(100, score);
}

export default function PasswordGeneratorPage() {
  const [length, setLength] = useState("20");
  const [count, setCount] = useState("5");
  const [includeUpper, setIncludeUpper] = useState(true);
  const [includeLower, setIncludeLower] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [passwords, setPasswords] = useState<string[]>([]);

  const generate = () => {
    const requestedLength = Math.max(8, Math.min(128, Number(length) || 12));
    const requestedCount = Math.max(1, Math.min(30, Number(count) || 1));

    let charset = "";
    if (includeLower) charset += LOWER;
    if (includeUpper) charset += UPPER;
    if (includeNumbers) charset += NUMBERS;
    if (includeSymbols) charset += SYMBOLS;

    if (!charset) return;

    if (excludeAmbiguous) {
      charset = charset
        .split("")
        .filter((char) => !AMBIGUOUS.includes(char))
        .join("");
    }

    const generated = Array.from({ length: requestedCount }, () => {
      let pass = "";
      for (let i = 0; i < requestedLength; i += 1) {
        const index = crypto.getRandomValues(new Uint32Array(1))[0] % charset.length;
        pass += charset[index] ?? "";
      }
      return pass;
    });

    setPasswords(generated);
  };

  const topStrength = useMemo(() => scorePassword(passwords[0] ?? ""), [passwords]);

  return (
    <ToolPageShell
      title="Password Generator"
      description="Generate one or many secure passwords with configurable character sets and live strength scoring."
    >
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <Input value={length} onChange={(event) => setLength(event.target.value)} placeholder="Length (8-128)" />
          <Input value={count} onChange={(event) => setCount(event.target.value)} placeholder="Count" />
          <Button onClick={generate}>Generate</Button>
          <CopyButton value={passwords.join("\n")} label="Copy all" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={includeUpper} onChange={(event) => setIncludeUpper(event.target.checked)} />Uppercase</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={includeLower} onChange={(event) => setIncludeLower(event.target.checked)} />Lowercase</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={includeNumbers} onChange={(event) => setIncludeNumbers(event.target.checked)} />Numbers</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={includeSymbols} onChange={(event) => setIncludeSymbols(event.target.checked)} />Symbols</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={excludeAmbiguous} onChange={(event) => setExcludeAmbiguous(event.target.checked)} />Exclude ambiguous</label>
        </div>

        <div className="rounded-xl border p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Password strength</span>
            <span>{topStrength}%</span>
          </div>
          <Progress value={topStrength} />
        </div>

        <div className="space-y-2">
          {passwords.length === 0 ? (
            <p className="text-sm text-muted-foreground">Generate passwords to see output.</p>
          ) : (
            passwords.map((password, index) => (
              <div key={`${password}-${index}`} className="rounded-md border p-2 flex items-center justify-between gap-2">
                <code className="text-xs break-all">{password}</code>
                <CopyButton value={password} label="Copy" />
              </div>
            ))
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
