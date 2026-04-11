import { AI_TOOL_PROMPTS, AiToolPromptKey } from "@/lib/ai/tool-prompts";

interface StreamToolResponseArgs {
  tool: AiToolPromptKey;
  userInput: string;
  onChunk: (chunk: string) => void;
  onModel?: (model: string) => void;
}

export async function streamToolResponse(args: StreamToolResponseArgs): Promise<string> {
  const { tool, userInput, onChunk, onModel } = args;

  const systemPrompt = AI_TOOL_PROMPTS[tool];
  const message = `SYSTEM INSTRUCTIONS:\n${systemPrompt}\n\nUSER REQUEST:\n${userInput}`;

  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      history: [],
      attachments: [],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Tool request failed");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response stream available");
  }

  const decoder = new TextDecoder();
  let fullText = "";
  let pending = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    pending += decoder.decode(value, { stream: true });
    const lines = pending.split("\n");
    pending = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6);
      if (payload === "[DONE]") continue;

      try {
        const parsed = JSON.parse(payload) as { text?: string; model?: string; error?: string };
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        if (parsed.model && onModel) {
          onModel(parsed.model);
        }
        if (parsed.text) {
          fullText += parsed.text;
          onChunk(parsed.text);
        }
      } catch {
        // Ignore partial JSON fragments from chunk boundaries.
      }
    }
  }

  return fullText;
}
