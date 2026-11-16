"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Sparkles, X } from "lucide-react";

type ClientType = "cursor" | "claude" | "chatgpt" | "windsurf" | "curl";

interface McpConfigModalProps {
  open: boolean;
  onClose: () => void;
}

export function McpConfigModal({ open, onClose }: McpConfigModalProps) {
  const [client, setClient] = useState<ClientType>("cursor");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("http://localhost:3000");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      setOrigin(window.location.origin);
    }
  }, []);

  if (!open) return null;

  const sseUrl = `${origin}/api/mcp/sse`;
  const httpUrl = `${origin}/api/mcp`;

  let configContent = "";
  let filePath = "";
  let setupTip = "";

  switch (client) {
    case "cursor":
      filePath = ".cursor/mcp.json";
      setupTip =
        "Place this in your workspace root as .cursor/mcp.json or add under Cursor Settings > Features > MCP.";
      configContent = JSON.stringify(
        {
          mcpServers: {
            "anaya-commerceops": {
              url: sseUrl,
            },
          },
        },
        null,
        2
      );
      break;

    case "claude":
      filePath =
        "macOS: ~/Library/Application Support/Claude/claude_desktop_config.json\nWindows: %APPDATA%\\Claude\\claude_desktop_config.json";
      setupTip =
        "Add this to your Claude Desktop configuration file and restart Claude to enable slash commands (/) and live store tools.";
      configContent = JSON.stringify(
        {
          mcpServers: {
            "anaya-commerceops": {
              url: sseUrl,
            },
          },
        },
        null,
        2
      );
      break;

    case "windsurf":
      filePath = "~/.codeium/windsurf/mcp_config.json";
      setupTip =
        "Paste into your Windsurf global MCP configuration file to enable Cascade store operations.";
      configContent = JSON.stringify(
        {
          mcpServers: {
            "anaya-commerceops": {
              serverUrl: sseUrl,
            },
          },
        },
        null,
        2
      );
      break;

    case "chatgpt":
      filePath = "Custom GPT > Configure > Actions > Create new action";
      setupTip =
        "Paste this OpenAPI 3.1.0 schema into Custom GPT Actions to give ChatGPT direct access to Anaya.ai.";
      configContent = JSON.stringify(
        {
          openapi: "3.1.0",
          info: {
            title: "Anaya CommerceOps MCP API",
            description: "Autonomous StoreOps and WooCommerce Incident Automation Engine",
            version: "1.0.0",
          },
          servers: [{ url: origin }],
          paths: {
            "/api/mcp": {
              post: {
                operationId: "executeMcpCall",
                summary: "Execute JSON-RPC 2.0 MCP tools, resources, or prompts",
                requestBody: {
                  required: true,
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          jsonrpc: { type: "string", example: "2.0" },
                          method: {
                            type: "string",
                            example: "tools/call",
                            enum: [
                              "tools/list",
                              "tools/call",
                              "resources/list",
                              "resources/read",
                              "prompts/list",
                              "prompts/get",
                            ],
                          },
                          params: { type: "object" },
                        },
                        required: ["jsonrpc", "method"],
                      },
                    },
                  },
                },
                responses: {
                  "200": {
                    description: "Successful MCP JSON-RPC 2.0 result",
                    content: {
                      "application/json": {
                        schema: { type: "object" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        null,
        2
      );
      break;

    case "curl":
      filePath = "Terminal / CLI";
      setupTip =
        "Execute raw JSON-RPC 2.0 requests from any bash or PowerShell terminal.";
      configContent = `curl -X POST "${httpUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_store_health",
      "arguments": {}
    }
  }'`;
      break;
  }

  function handleCopy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(configContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/10 bg-[#16161a] p-6 text-white shadow-2xl sm:p-8">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#2997ff] to-[#30d158] text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                1-Click MCP Client Configuration
              </h3>
              <p className="text-xs text-[#86868b]">
                Connect Cursor, Claude Desktop, Windsurf, or ChatGPT to Anaya.ai
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#86868b] transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Client Selector Segmented Controls */}
        <div className="mt-5 flex flex-wrap gap-1.5 rounded-2xl bg-[#09090b] p-1.5 border border-white/[0.06]">
          {(
            [
              { id: "cursor", label: "Cursor" },
              { id: "claude", label: "Claude Desktop" },
              { id: "windsurf", label: "Windsurf" },
              { id: "chatgpt", label: "ChatGPT Actions" },
              { id: "curl", label: "cURL" },
            ] as const
          ).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setClient(c.id)}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition ${
                client === c.id
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-[#86868b] hover:text-[#d1d1d6]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Target File Info */}
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#0d0d10] p-3 text-xs">
          <div className="font-mono text-[11px] text-[#86868b]">Configuration Location:</div>
          <div className="mt-1 font-mono text-[11px] text-[#2997ff] whitespace-pre-line">
            {filePath}
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-[#a1a1a6]">
            {setupTip}
          </p>
        </div>

        {/* Config Code Preview */}
        <div className="mt-3 relative">
          <pre className="code-scroll max-h-56 overflow-auto rounded-xl border border-white/10 bg-[#09090b] p-4 font-mono text-xs leading-relaxed text-[#d1d1d6]">
            {configContent}
          </pre>
          <button
            type="button"
            onClick={handleCopy}
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-white/20"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#30d158]" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-[#a1a1a6]" />
                Copy Config
              </>
            )}
          </button>
        </div>

        {/* SSE & HTTP Endpoints Info */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] pt-4 text-xs">
          <div className="font-mono text-[11px] text-[#86868b]">
            SSE: <span className="text-emerald-400">{sseUrl}</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-xs font-semibold text-black transition hover:bg-white/90"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Copied to Clipboard
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy {client.toUpperCase()} Config
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
