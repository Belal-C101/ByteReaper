"use client";

import { AiToolWorkbench } from "@/components/tools/ai-tool-workbench";

export default function SqlGeneratorToolPage() {
  return (
    <AiToolWorkbench
      tool="sql-generator"
      title="SQL Generator"
      description="Generate SQL from natural-language requirements with dialect-aware output."
      inputLabel="Query requirement"
      inputPlaceholder="Example: Show users who signed up in last 30 days and placed more than 5 orders."
      fields={[
        { key: "dialect", label: "SQL dialect", type: "select", options: ["PostgreSQL", "MySQL", "SQLite", "MSSQL"], defaultValue: "PostgreSQL" },
      ]}
      composePrompt={(input, fields) => `Dialect: ${fields.dialect}\n\nGenerate SQL for:\n${input}`}
    />
  );
}
