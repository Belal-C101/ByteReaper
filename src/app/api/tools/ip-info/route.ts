import { NextRequest, NextResponse } from "next/server";

function getForwardedClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) return null;

  const first = forwardedFor.split(",")[0]?.trim();
  return first || null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryIp = searchParams.get("ip")?.trim();
    const forwardedIp = getForwardedClientIp(request);
    const targetIp = queryIp || forwardedIp;

    const endpoint = targetIp
      ? `https://ipapi.co/${encodeURIComponent(targetIp)}/json/`
      : "https://ipapi.co/json/";

    const upstream = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await upstream.json();
    return NextResponse.json(data, {
      status: upstream.ok ? 200 : upstream.status,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[IP Info API] Failed to lookup IP:", error);
    return NextResponse.json(
      { error: true, reason: "Unable to lookup IP right now." },
      { status: 500 }
    );
  }
}
