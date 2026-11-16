import { connection } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { executeMcpTool, MCP_TOOL_SPECS } from "@/lib/mcp/tools";
import { MCP_RESOURCE_SPECS, readMcpResource } from "@/lib/mcp/resources";

export async function GET() {
  await connection();
  return NextResponse.json({
    server: {
      name: "anaya-commerceops",
      version: "1.0.0",
      protocol: "Model Context Protocol (JSON-RPC 2.0 / HTTP)",
      byomSupported: ["Claude", "ChatGPT", "Gemini", "Cursor", "Antigravity"],
    },
    tools: MCP_TOOL_SPECS,
    resources: MCP_RESOURCE_SPECS,
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
  };

  // Support standard JSON-RPC 2.0 MCP calls
  if (body.jsonrpc === "2.0" && body.method) {
    if (body.method === "initialize") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id ?? null,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "anaya-commerceops", version: "1.0.0" },
          capabilities: {
            tools: {},
            resources: { subscribe: false, listChanged: false },
          },
        },
      });
    }

    if (body.method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id ?? null,
        result: { tools: MCP_TOOL_SPECS },
      });
    }

    if (body.method === "tools/call") {
      const toolName = body.params?.name || "";
      const result = await executeMcpTool(toolName, body.params?.arguments || {});
      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id ?? null,
        result,
      });
    }

    if (body.method === "resources/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id ?? null,
        result: { resources: MCP_RESOURCE_SPECS },
      });
    }

    if (body.method === "resources/read") {
      const uri = body.params?.uri || "";
      const result = await readMcpResource(uri);
      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id ?? null,
        result,
      });
    }

    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: body.id ?? null,
        error: { code: -32601, message: `Method not found: ${body.method}` },
      },
      { status: 400 }
    );
  }

  // Direct playground call for resources
  if (body.resourceUri) {
    const result = await readMcpResource(body.resourceUri);
    return NextResponse.json({ ok: !result.isError, resourceUri: body.resourceUri, result });
  }

  // Direct playground call for tools
  if (body.tool) {
    const result = await executeMcpTool(body.tool, body.args || {});
    return NextResponse.json({ ok: !result.isError, tool: body.tool, result });
  }

  return NextResponse.json(
    {
      error:
        "Provide either JSON-RPC { jsonrpc: '2.0', method } or direct { tool, args } / { resourceUri }.",
    },
    { status: 400 }
  );
}
