import { NextRequest, NextResponse } from 'next/server';
import { processAgentMessage } from '@/lib/ai/agent';
import { ChatMessage, FileAttachment } from '@/types/chat';
import { DEFAULT_MODEL_ID } from '@/lib/ai/models';

// Free reasoning models can think for minutes; 300s is the Hobby + Fluid compute ceiling
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, attachments = [], history = [], model = DEFAULT_MODEL_ID } = body as {
      message: string;
      attachments?: FileAttachment[];
      history?: ChatMessage[];
      model?: string;
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