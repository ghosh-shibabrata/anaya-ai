import { NextRequest, NextResponse } from "next/server";
import { handleMcpJsonRpc, JsonRpcRequest } from "@/lib/mcp/jsonrpc";
import {
  registerSseSession,
  removeSseSession,
  sendSseEvent,
  mcpSseSessions,
} from "@/lib/mcp/sse-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sessionId = crypto.randomUUID();
  const encoder = new TextEncoder();
  let keepAliveTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      registerSseSession(sessionId, controller);

      // Emit MCP SSE endpoint event as required by protocol
      const endpointPayload = `event: endpoint\ndata: /api/mcp/sse?sessionId=${sessionId}\n\n`;
      controller.enqueue(encoder.encode(endpointPayload));

      // Periodic keep-alive ping
      keepAliveTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          if (keepAliveTimer) clearInterval(keepAliveTimer);
          removeSseSession(sessionId);
        }
      }, 20000);
    },
    cancel() {
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      removeSseSession(sessionId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function POST(req: NextRequest) {
  const sessionId =
    req.nextUrl.searchParams.get("sessionId") ||
    req.headers.get("x-session-id") ||
    "";

  const body = (await req.json().catch(() => ({}))) as JsonRpcRequest;
  const result = await handleMcpJsonRpc(body);

  if (sessionId && mcpSseSessions.has(sessionId)) {
    const sent = sendSseEvent(sessionId, "message", JSON.stringify(result));
    if (sent) {
      return NextResponse.json(
        { ok: true, sessionId, status: "dispatched_to_sse" },
        { status: 202 }
      );
    }
  }

  // Fallback to direct JSON response if session is absent or closed
  return NextResponse.json(result, {
    status: "error" in result && result.error ? 400 : 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
}
