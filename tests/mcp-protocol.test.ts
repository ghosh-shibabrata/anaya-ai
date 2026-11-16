import test from "node:test";
import assert from "node:assert/strict";
import { handleMcpJsonRpc } from "@/lib/mcp/jsonrpc";
import type { McpToolSpec } from "@/lib/mcp/tools";
import type { McpResourceSpec } from "@/lib/mcp/resources";
import type { McpPromptSpec } from "@/lib/mcp/prompts";

test("MCP JSON-RPC 2.0 initialize returns complete server info and capabilities", async () => {
  const res = (await handleMcpJsonRpc({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
  })) as {
    jsonrpc: string;
    id: number;
    result?: {
      serverInfo?: { name: string; version: string };
      capabilities?: { tools?: object; resources?: object; prompts?: object };
    };
  };

  assert.equal(res.jsonrpc, "2.0");
  assert.equal(res.id, 1);
  assert.ok(res.result);
  assert.equal(res.result?.serverInfo?.name, "anaya-commerceops");
  assert.equal(res.result?.serverInfo?.version, "1.0.0");
  assert.ok(res.result?.capabilities?.tools);
  assert.ok(res.result?.capabilities?.resources);
  assert.ok(res.result?.capabilities?.prompts);
});

test("MCP tools/list returns all 5 tools with spec-compliant annotations", async () => {
  const res = (await handleMcpJsonRpc({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
  })) as {
    result?: {
      tools?: McpToolSpec[];
    };
  };

  assert.ok(res.result);
  assert.equal(res.result?.tools?.length, 5);

  const tools = res.result?.tools || [];
  for (const tool of tools) {
    assert.ok(tool.name, "Tool must have a name");
    assert.ok(tool.description, "Tool must have a description");
    assert.equal(typeof tool.readOnlyHint, "boolean", `${tool.name} must have boolean readOnlyHint`);
    assert.equal(typeof tool.destructiveHint, "boolean", `${tool.name} must have boolean destructiveHint`);
    assert.equal(typeof tool.idempotentHint, "boolean", `${tool.name} must have boolean idempotentHint`);
    assert.equal(typeof tool.openWorldHint, "boolean", `${tool.name} must have boolean openWorldHint`);
    assert.equal(tool.inputSchema.type, "object", `${tool.name} inputSchema must be type object`);
    assert.ok(tool.annotations, `${tool.name} must have annotations object`);
    assert.equal(typeof tool.annotations.readOnlyHint, "boolean");
  }

  // Ensure propose_builder_change is correctly marked mutating (readOnlyHint: false)
  const proposeTool = tools.find((t: McpToolSpec) => t.name === "propose_builder_change");
  assert.ok(proposeTool);
  assert.equal(proposeTool.readOnlyHint, false);
  assert.equal(proposeTool.destructiveHint, false);

  // Ensure get_store_health is read-only and idempotent
  const healthTool = tools.find((t: McpToolSpec) => t.name === "get_store_health");
  assert.ok(healthTool);
  assert.equal(healthTool.readOnlyHint, true);
  assert.equal(healthTool.idempotentHint, true);
});

test("MCP tools/call executes get_store_health and returns valid store telemetry", async () => {
  const res = (await handleMcpJsonRpc({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "get_store_health",
      arguments: {},
    },
  })) as {
    result?: {
      content: Array<{ type: string; text: string }>;
    };
  };

  assert.ok(res.result);
  assert.ok(Array.isArray(res.result?.content));
  assert.equal(res.result?.content[0]?.type, "text");

  const parsed = JSON.parse(res.result?.content[0]?.text || "{}");
  assert.ok(parsed.storeName);
  assert.ok(parsed.mode);
  assert.ok(parsed.infrastructure);
});

test("MCP resources/list returns 4 store resources with valid MIME types", async () => {
  const res = (await handleMcpJsonRpc({
    jsonrpc: "2.0",
    id: 4,
    method: "resources/list",
  })) as {
    result?: {
      resources?: McpResourceSpec[];
    };
  };

  assert.ok(res.result);
  assert.equal(res.result?.resources?.length, 4);

  const uris = res.result?.resources?.map((r) => r.uri) || [];
  assert.ok(uris.includes("anaya://store/health"));
  assert.ok(uris.includes("anaya://incidents/open"));
  assert.ok(uris.includes("anaya://catalog/audit"));
  assert.ok(uris.includes("anaya://environments/pipeline"));
});

test("MCP resources/read returns valid JSON contents for anaya://store/health", async () => {
  const res = (await handleMcpJsonRpc({
    jsonrpc: "2.0",
    id: 5,
    method: "resources/read",
    params: {
      uri: "anaya://store/health",
    },
  })) as {
    result?: {
      contents: Array<{ uri: string; mimeType: string; text: string }>;
    };
  };

  assert.ok(res.result);
  assert.ok(Array.isArray(res.result?.contents));
  assert.equal(res.result?.contents[0]?.uri, "anaya://store/health");
  assert.equal(res.result?.contents[0]?.mimeType, "application/json");

  const parsed = JSON.parse(res.result?.contents[0]?.text || "{}");
  assert.ok(parsed.storeName);
  assert.ok(parsed.environments);
});

test("MCP prompts/list returns 3 high-converting CommerceOps prompt recipes", async () => {
  const res = (await handleMcpJsonRpc({
    jsonrpc: "2.0",
    id: 6,
    method: "prompts/list",
  })) as {
    result?: {
      prompts?: McpPromptSpec[];
    };
  };

  assert.ok(res.result);
  assert.equal(res.result?.prompts?.length, 3);

  const names = res.result?.prompts?.map((p) => p.name) || [];
  assert.ok(names.includes("diagnose_checkout_fault"));
  assert.ok(names.includes("propose_growth_campaign"));
  assert.ok(names.includes("catalog_seo_remediation"));
});

test("MCP prompts/get expands diagnose_checkout_fault with live store context", async () => {
  const res = (await handleMcpJsonRpc({
    jsonrpc: "2.0",
    id: 7,
    method: "prompts/get",
    params: {
      name: "diagnose_checkout_fault",
      arguments: { incidentFilter: "all" },
    },
  })) as {
    result?: {
      messages: Array<{ role: string; content: { type: string; text: string } }>;
    };
  };

  assert.ok(res.result);
  assert.ok(Array.isArray(res.result?.messages));
  assert.equal(res.result?.messages[0]?.role, "user");
  assert.ok(res.result?.messages[0]?.content?.text?.includes("Lead StoreOps Reliability Engineer"));
});

test("MCP JSON-RPC handles unknown method and invalid request gracefully", async () => {
  const unknownMethodRes = (await handleMcpJsonRpc({
    jsonrpc: "2.0",
    id: 99,
    method: "non_existent_method",
  })) as {
    error?: { code: number; message: string };
  };

  assert.ok(unknownMethodRes.error);
  assert.equal(unknownMethodRes.error?.code, -32601);

  const invalidReqRes = (await handleMcpJsonRpc({
    jsonrpc: "1.0",
    id: 100,
  })) as {
    error?: { code: number; message: string };
  };

  assert.ok(invalidReqRes.error);
  assert.equal(invalidReqRes.error?.code, -32600);
});
