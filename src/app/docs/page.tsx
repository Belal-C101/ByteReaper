"use client";

import Link from "next/link";
import { BookOpen, Bot, Database, LockKeyhole, ShieldCheck, Wrench } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FLOW_DOCS, MODEL_DOCS, SECURITY_DOCUMENTATION_NOTES, SOURCE_DOC_SECTIONS } from "@/lib/docs/project-docs";
import { TOOL_CATEGORIES, TOOL_COUNT, TOOLS, ToolCategory } from "@/lib/tools/catalog";

function groupToolsByCategory() {
  const categories = TOOL_CATEGORIES.filter((category): category is ToolCategory => category !== "All");
  return categories.map((category) => ({
    category,
    tools: TOOLS.filter((tool) => tool.category === category),
  }));
}

export default function ProjectDocsPage() {
  const toolGroups = groupToolsByCategory();

  return (
    <ProtectedRoute>
      <section className="min-h-[calc(100vh-8rem)] py-8 md:py-10">
        <div className="container px-4 mx-auto space-y-8">
          <header className="rounded-2xl border bg-card/50 p-5 md:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-4xl">
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                  Project documentation
                </p>
                <h1 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight">
                  ByteReaper Source and Product Map
                </h1>
                <p className="mt-3 text-muted-foreground md:text-lg">
                  A protected guide to the website features, AI model routing, developer tools, data flow, source files, and privacy boundaries.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{TOOL_COUNT} tools</Badge>
                <Badge variant="secondary">{MODEL_DOCS.length} models</Badge>
                <Badge variant="secondary">Protected route</Badge>
              </div>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="p-4">
              <Bot className="h-5 w-5 text-primary" />
              <h2 className="mt-3 font-semibold">AI assistant</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Streaming OpenRouter chat with model selection, image fallback, file context, web search, and persistent history.
              </p>
            </Card>
            <Card className="p-4">
              <Wrench className="h-5 w-5 text-primary" />
              <h2 className="mt-3 font-semibold">Developer tools</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Utilities, converters, generators, API tools, AI workbenches, and reference pages driven by one catalog.
              </p>
            </Card>
            <Card className="p-4">
              <Database className="h-5 w-5 text-primary" />
              <h2 className="mt-3 font-semibold">Persistence</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Firebase Auth, Firestore chat sessions, Cloudinary hosted media links, local reports, and tool favorites.
              </p>
            </Card>
            <Card className="p-4">
              <LockKeyhole className="h-5 w-5 text-primary" />
              <h2 className="mt-3 font-semibold">Private messaging</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Client-side key unlock, encrypted messages, participant-checked APIs, Cloudinary attachments, and Agora voice calls.
              </p>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Product Flow</h2>
                <p className="text-sm text-muted-foreground">How the major website surfaces work end to end.</p>
              </div>
              <Link href="/tools" className="text-sm text-primary hover:underline">
                Open tools
              </Link>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {FLOW_DOCS.map((flow) => (
                <Card key={flow.title} className="p-4">
                  <h3 className="font-semibold">{flow.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{flow.summary}</p>
                  <ol className="mt-4 space-y-2 text-sm">
                    {flow.steps.map((step, index) => (
                      <li key={step} className="flex gap-2">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-medium text-primary">
                          {index + 1}
                        </span>
                        <span className="text-muted-foreground">{step}</span>
                      </li>
                    ))}
                  </ol>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">AI Model Classification</h2>
              <p className="text-sm text-muted-foreground">
                The model source of truth lives in <code className="rounded bg-muted px-1.5 py-0.5">src/lib/ai/gemini.ts</code>.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border">
              <div className="grid grid-cols-1 divide-y text-sm md:grid-cols-[1.1fr_0.9fr_1fr_1.6fr_0.7fr] md:divide-x md:divide-y-0 bg-muted/40 font-medium">
                <div className="p-3">Model</div>
                <div className="p-3">Provider</div>
                <div className="p-3">Class</div>
                <div className="p-3">Best use</div>
                <div className="p-3">Vision</div>
              </div>
              {MODEL_DOCS.map((model) => (
                <div key={model.key} className="grid grid-cols-1 divide-y border-t text-sm md:grid-cols-[1.1fr_0.9fr_1fr_1.6fr_0.7fr] md:divide-x md:divide-y-0">
                  <div className="p-3">
                    <div className="font-medium">{model.name}</div>
                    <div className="mt-1 break-all text-xs text-muted-foreground">{model.modelId}</div>
                  </div>
                  <div className="p-3 text-muted-foreground">{model.provider}</div>
                  <div className="p-3 text-muted-foreground">{model.classification}</div>
                  <div className="p-3 text-muted-foreground">
                    {model.bestFor}
                    <div className="mt-2 text-xs">{model.notes}</div>
                  </div>
                  <div className="p-3">
                    <Badge variant={model.vision ? "default" : "outline"}>{model.vision ? "Yes" : "No"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Tool Catalog</h2>
              <p className="text-sm text-muted-foreground">
                All tools are rendered from the catalog and grouped by the categories users see in the tools hub.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {toolGroups.map((group) => (
                <Card key={group.category} className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-semibold">{group.category}</h3>
                    <Badge variant="outline">{group.tools.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {group.tools.map((tool) => (
                      <div key={tool.slug} className="border-t pt-3 first:border-t-0 first:pt-0">
                        <Link href={`/tools/${tool.slug}`} className="font-medium hover:text-primary">
                          {tool.title}
                        </Link>
                        <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Source Code Documentation</h2>
              <p className="text-sm text-muted-foreground">
                Curated file-by-file coverage of meaningful runtime, API, persistence, component, script, and configuration files.
              </p>
            </div>
            <div className="space-y-4">
              {SOURCE_DOC_SECTIONS.map((section) => (
                <details key={section.title} className="rounded-xl border bg-card/40 p-4" open>
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="font-semibold">{section.title}</h3>
                        <p className="text-sm text-muted-foreground">{section.summary}</p>
                      </div>
                      <Badge variant="secondary">{section.entries.length} entries</Badge>
                    </div>
                  </summary>
                  <div className="mt-4 space-y-4">
                    {section.entries.map((entry) => (
                      <article key={entry.path} className="rounded-lg border bg-background/50 p-4">
                        <code className="break-all text-sm font-medium text-primary">{entry.path}</code>
                        <p className="mt-2 text-sm text-muted-foreground">{entry.purpose}</p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div>
                            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Key exports and functions</h4>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {entry.keyParts.map((part) => (
                                <span key={part} className="rounded-md bg-muted px-2 py-1 text-xs">
                                  {part}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Flow</h4>
                            <p className="mt-2 text-sm text-muted-foreground">{entry.flow}</p>
                          </div>
                        </div>
                        {entry.dataAndPrivacy && (
                          <p className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                            {entry.dataAndPrivacy}
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-card/40 p-4 md:p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Privacy Boundaries</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  These docs intentionally describe architecture and behavior without exposing private values or user records.
                </p>
                <ul className="mt-4 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                  {SECURITY_DOCUMENTATION_NOTES.map((note) => (
                    <li key={note} className="rounded-lg bg-muted/50 p-3">
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>
      </section>
    </ProtectedRoute>
  );
}
