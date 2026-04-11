"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

interface QuestionItem {
  question_id: number;
  title: string;
  score: number;
  answer_count: number;
  is_answered: boolean;
  link: string;
  tags: string[];
  accepted_answer_id?: number;
}

export default function StackOverflowPage() {
  const [query, setQuery] = useState("nextjs app router cache");
  const [results, setResults] = useState<QuestionItem[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(query)}&site=stackoverflow`;
      const response = await fetch(endpoint);
      const data = (await response.json()) as { items: QuestionItem[] };
      setResults(data.items || []);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTopAnswer = async (questionId: number) => {
    try {
      const endpoint = `https://api.stackexchange.com/2.3/questions/${questionId}/answers?order=desc&sort=votes&site=stackoverflow&filter=withbody`;
      const response = await fetch(endpoint);
      const data = (await response.json()) as { items: Array<{ body: string }> };
      setAnswers((current) => ({
        ...current,
        [questionId]: data.items?.[0]?.body || "No answer body available.",
      }));
    } catch {
      setAnswers((current) => ({
        ...current,
        [questionId]: "Unable to load answer.",
      }));
    }
  };

  return (
    <ToolPageShell
      title="StackOverflow Search"
      description="Search Stack Overflow by relevance, inspect question metadata, and expand top-voted answers."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Stack Overflow" className="max-w-md" />
          <Button onClick={() => void search()} disabled={loading}>{loading ? "Searching..." : "Search"}</Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-3">
          {results.map((item) => (
            <article key={item.question_id} className="rounded-xl border p-3 space-y-2">
              <a href={item.link} target="_blank" rel="noreferrer" className="font-medium hover:underline">{item.title}</a>
              <p className="text-xs text-muted-foreground">Score: {item.score} · Answers: {item.answer_count} · Accepted: {item.accepted_answer_id ? "yes" : "no"}</p>
              <p className="text-xs text-muted-foreground">Tags: {item.tags.join(", ")}</p>
              <Button size="sm" variant="outline" onClick={() => void loadTopAnswer(item.question_id)}>Show top answer</Button>
              {answers[item.question_id] && (
                <div className="rounded-md border p-2 text-sm" dangerouslySetInnerHTML={{ __html: answers[item.question_id] }} />
              )}
            </article>
          ))}
        </div>
      </div>
    </ToolPageShell>
  );
}
