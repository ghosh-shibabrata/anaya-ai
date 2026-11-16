import { executeMcpTool, MCP_TOOL_SPECS } from "@/lib/mcp/tools";
import { MCP_RESOURCE_SPECS, readMcpResource } from "@/lib/mcp/resources";
import { MCP_PROMPT_SPECS, getMcpPrompt } from "@/lib/mcp/prompts";

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
    uri?: string;
  };
}

export async function handleMcpJsonRpc(body: JsonRpcRequest) {
  if (body.jsonrpc !== "2.0" || !body.method) {
    return {
      jsonrpc: "2.0",
      id: body.id ?? null,
      error: { code: -32600, message: "Invalid Request: expected JSON-RPC 2.0 with a method" },
    };
  }

  if (body.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: body.id ?? null,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "anaya-commerceops", version: "1.0.0" },
        capabilities: {
          tools: {},
          resources: { subscribe: false, listChanged: false },
          prompts: { listChanged: false },
        },
      },
    };
  }

  if (body.method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id: body.id ?? null,
      result: { tools: MCP_TOOL_SPECS },
    };
  }

  if (body.method === "tools/call") {
    const toolName = body.params?.name || "";
    const result = await executeMcpTool(toolName, body.params?.arguments || {});
    return {
      jsonrpc: "2.0",
      id: body.id ?? null,
      result,
    };
  }

  if (body.method === "resources/list") {
    return {
      jsonrpc: "2.0",
      id: body.id ?? null,
      result: { resources: MCP_RESOURCE_SPECS },
    };
  }

  if (body.method === "resources/read") {
    const uri = body.params?.uri || "";
    const result = await readMcpResource(uri);
    return {
      jsonrpc: "2.0",
      id: body.id ?? null,
      result,
    };
  }

  if (body.method === "prompts/list") {
    return {
      jsonrpc: "2.0",
      id: body.id ?? null,
      result: { prompts: MCP_PROMPT_SPECS },
    };
  }

  if (body.method === "prompts/get") {
    const promptName = body.params?.name || "";
    const args = (body.params?.arguments as Record<string, string>) || {};
    const result = await getMcpPrompt(promptName, args);
    return {
      jsonrpc: "2.0",
      id: body.id ?? null,
      result,
    };
  }

  return {
    jsonrpc: "2.0",
    id: body.id ?? null,
    error: { code: -32601, message: `Method not found: ${body.method}` },
  };
}
