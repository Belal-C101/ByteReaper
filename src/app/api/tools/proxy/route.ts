import { NextRequest, NextResponse } from "next/server";

interface ProxyRequestBody {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

function isValidHttpUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as ProxyRequestBody;
    const method = payload.method?.toUpperCase() || "GET";

    if (!payload.url || !isValidHttpUrl(payload.url)) {
      return NextResponse.json({ error: "Invalid URL. Use http:// or https://." }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    const start = Date.now();

    const upstream = await fetch(payload.url, {
      method,
      headers: payload.headers,
      body: method === "GET" || method === "HEAD" ? undefined : payload.body,
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    const text = await upstream.text();
    const responseHeaders: Record<string, string> = {};
    upstream.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return NextResponse.json({
      status: upstream.status,
      statusText: upstream.statusText,
      responseTimeMs: Date.now() - start,
      headers: responseHeaders,
      body: text,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Proxy request failed",
      },
      { status: 500 },
    );
  }
}
