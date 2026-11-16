import { connection } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { executeMcpTool, MCP_TOOL_SPECS } from "@/lib/mcp/tools";
import { MCP_RESOURCE_SPECS, readMcpResource } from "@/lib/mcp/resources";
import { MCP_PROMPT_SPECS, getMcpPrompt } from "@/lib/mcp/prompts";
import { handleMcpJsonRpc } from "@/lib/mcp/jsonrpc";

export async function GET() {
  await connection();
  return NextResponse.json({
    server: {
      name: "anaya-commerceops",
      version: "1.0.0",
      protocol: "Model Context Protocol (JSON-RPC 2.0 / HTTP & SSE)",
      sseEndpoint: "/api/mcp/sse",
      byomSupported: ["Claude", "ChatGPT", "Gemini", "Cursor", "Antigravity"],
    },
    tools: MCP_TOOL_SPECS,
    resources: MCP_RESOURCE_SPECS,
    prompts: MCP_PROMPT_SPECS,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    jsonrpc?: string;
    id?: string | number | null;
    method?: string;
    params?: {
      name?: string;
      arguments?: Record<string, unknown>;
      uri?: string;
    };
    tool?: string;
    args?: Record<string, unknown>;
    resourceUri?: string;
    prompt?: string;
  };

  // Standard JSON-RPC 2.0 MCP calls
  if (body.jsonrpc === "2.0" && body.method) {
    const result = await handleMcpJsonRpc(body);
    const status = "error" in result && result.error ? 400 : 200;
    return NextResponse.json(result, { status });
  }

  // Direct playground calls
  if (body.prompt) {
    const result = await getMcpPrompt(body.prompt, (body.args as Record<string, string>) || {});
    return NextResponse.json({ ok: !result.isError, prompt: body.prompt, result });
  }

  if (body.resourceUri) {
    const result = await readMcpResource(body.resourceUri);
    return NextResponse.json({ ok: !result.isError, resourceUri: body.resourceUri, result });
  }

  if (body.tool) {
    const result = await executeMcpTool(body.tool, body.args || {});
    return NextResponse.json({ ok: !result.isError, tool: body.tool, result });
  }

  return NextResponse.json(
    {
      error:
        "Provide either JSON-RPC { jsonrpc: '2.0', method } or direct { tool, args } / { resourceUri } / { prompt, args }.",
    },
    { status: 400 }
  );
}
