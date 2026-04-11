"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

const DEFAULT_MD = "# ByteReaper Markdown\n\n- Build docs fast\n- Preview instantly\n\n```ts\nconsole.log('hello')\n```\n";

export default function MarkdownToolPage() {
  const [markdown, setMarkdown] = useState(DEFAULT_MD);
  const previewRef = useRef<HTMLDivElement>(null);

  const insert = (snippet: string) => setMarkdown((current) => `${current}\n${snippet}`.trim());

  const exportHtml = () => {
    const html = previewRef.current?.innerHTML;
    if (!html) return;

    const blob = new Blob([
      `<!doctype html><html><head><meta charset=\"utf-8\"><title>Markdown Export</title></head><body>${html}</body></html>`,
    ], { type: "text/html" });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "markdown-export.html";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ToolPageShell
      title="Markdown Editor & Preview"
      description="Write markdown with a split editor/preview view, quick toolbar actions, and HTML export."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => insert("**bold text**")}>Bold</Button>
          <Button size="sm" variant="outline" onClick={() => insert("*italic text*")}>Italic</Button>
          <Button size="sm" variant="outline" onClick={() => insert("## Heading")}>Heading</Button>
          <Button size="sm" variant="outline" onClick={() => insert("[Link text](https://example.com)")}>Link</Button>
          <Button size="sm" variant="outline" onClick={() => insert("![alt text](https://picsum.photos/400/220)")}>Image</Button>
          <Button size="sm" variant="outline" onClick={() => insert("```js\nconsole.log('code')\n```")}>Code block</Button>
          <Button size="sm" variant="outline" onClick={() => insert("| Col A | Col B |\n| --- | --- |\n| A1 | B1 |")}>Table</Button>
          <Button size="sm" onClick={exportHtml}>Export HTML</Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Editor</h2>
            <Textarea value={markdown} onChange={(event) => setMarkdown(event.target.value)} className="min-h-[360px] font-mono text-sm" />
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium">Preview</h2>
            <div ref={previewRef} className="min-h-[360px] rounded-xl border p-4 prose prose-invert max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
            </div>
          </section>
        </div>
      </div>
    </ToolPageShell>
  );
}
