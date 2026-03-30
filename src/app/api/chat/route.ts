import { NextRequest, NextResponse } from 'next/server';
import { processAgentMessage } from '@/lib/ai/agent';
import { ChatMessage, FileAttachment } from '@/types/chat';
import { ModelKey, DEFAULT_MODEL } from '@/lib/ai/gemini';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, attachments = [], history = [], model = DEFAULT_MODEL } = body as {
      message: string;
      attachments?: FileAttachment[];
      history?: ChatMessage[];
      model?: ModelKey;
    };

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const response = await processAgentMessage(message, attachments, history, model);

    return NextResponse.json({
      success: true,
      content: response.content,
      searchResults: response.searchResults,
      toolUsed: response.toolUsed,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    const message = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}