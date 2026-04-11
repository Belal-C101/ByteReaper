"use client";

import { useState } from "react";
import yaml from "js-yaml";
import Papa from "papaparse";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import TOML from "@iarna/toml";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { CopyButton } from "@/components/tools/copy-button";

type ConversionType = "json-yaml" | "yaml-json" | "json-csv" | "csv-json" | "json-xml" | "xml-json" | "yaml-toml" | "toml-yaml";

const DEFAULT_INPUT: Record<ConversionType, string> = {
  "json-yaml": '{\n  "name": "ByteReaper",\n  "free": true\n}',
  "yaml-json": "name: ByteReaper\nfree: true",
  "json-csv": '[{"name":"ByteReaper","stars":10}]',
  "csv-json": "name,stars\nByteReaper,10",
  "json-xml": '{\n  "project": {\n    "name": "ByteReaper"\n  }\n}',
  "xml-json": "<project><name>ByteReaper</name></project>",
  "yaml-toml": "name: ByteReaper\nfree: true",
  "toml-yaml": "name = \"ByteReaper\"\nfree = true",
};

export default function DataConverterPage() {
  const [conversion, setConversion] = useState<ConversionType>("json-yaml");
  const [input, setInput] = useState(DEFAULT_INPUT["json-yaml"]);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const runConvert = () => {
    try {
      let result = "";

      switch (conversion) {
        case "json-yaml": {
          result = yaml.dump(JSON.parse(input));
          break;
        }
        case "yaml-json": {
          result = JSON.stringify(yaml.load(input), null, 2);
          break;
        }
        case "json-csv": {
          const parsed = JSON.parse(input);
          const rows = Array.isArray(parsed) ? parsed : [parsed];
          result = Papa.unparse(rows as Array<Record<string, unknown>>);
          break;
        }
        case "csv-json": {
          const parsed = Papa.parse(input, { header: true, skipEmptyLines: true });
          if (parsed.errors.length > 0) {
            throw new Error(parsed.errors[0]?.message || "Unable to parse CSV");
          }
          result = JSON.stringify(parsed.data, null, 2);
          break;
        }
        case "json-xml": {
          const builder = new XMLBuilder({ format: true });
          result = builder.build(JSON.parse(input));
          break;
        }
        case "xml-json": {
          const parser = new XMLParser({ ignoreAttributes: false });
          result = JSON.stringify(parser.parse(input), null, 2);
          break;
        }
        case "yaml-toml": {
          result = TOML.stringify(yaml.load(input) as TOML.JsonMap);
          break;
        }
        case "toml-yaml": {
          result = yaml.dump(TOML.parse(input));
          break;
        }
        default:
          result = "";
      }

      setOutput(result);
      setError("");
    } catch (convertError) {
      setError(convertError instanceof Error ? convertError.message : "Conversion failed");
      setOutput("");
    }
  };

  return (
    <ToolPageShell
      title="Data Converter Hub"
      description="Convert between JSON, YAML, CSV, XML, and TOML formats with instant validation feedback."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={conversion}
            onChange={(event) => {
              const next = event.target.value as ConversionType;
              setConversion(next);
              setInput(DEFAULT_INPUT[next]);
              setOutput("");
              setError("");
            }}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="json-yaml">JSON to YAML</option>
            <option value="yaml-json">YAML to JSON</option>
            <option value="json-csv">JSON to CSV</option>
            <option value="csv-json">CSV to JSON</option>
            <option value="json-xml">JSON to XML</option>
            <option value="xml-json">XML to JSON</option>
            <option value="yaml-toml">YAML to TOML</option>
            <option value="toml-yaml">TOML to YAML</option>
          </select>
          <Button size="sm" onClick={runConvert}>Convert</Button>
          <CopyButton value={output} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Input</h2>
            <Textarea value={input} onChange={(event) => setInput(event.target.value)} className="min-h-[280px] font-mono text-sm" />
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Output</h2>
            <Textarea value={output} onChange={(event) => setOutput(event.target.value)} className="min-h-[280px] font-mono text-sm" />
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
