"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Database,
  MessageSquareCode,
  Play,
  Radio,
  RefreshCw,
  Terminal,
  Wrench,
} from "lucide-react";
import type { McpToolSpec } from "@/lib/mcp/tools";
import type { McpResourceSpec } from "@/lib/mcp/resources";
import type { McpPromptSpec } from "@/lib/mcp/prompts";

type TabMode = "tools" | "resources" | "prompts";

export function McpPlayground() {
  const [activeTab, setActiveTab] = useState<TabMode>("tools");

  // Manifest states
  const [tools, setTools] = useState<McpToolSpec[]>([]);
  const [resources, setResources] = useState<McpResourceSpec[]>([]);
  const [prompts, setPrompts] = useState<McpPromptSpec[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection states
  const [selectedTool, setSelectedTool] = useState<string>("get_store_health");
  const [selectedResource, setSelectedResource] = useState<string>("anaya://store/health");
  const [selectedPrompt, setSelectedPrompt] = useState<string>("diagnose_checkout_fault");

  // Args & execution states
  const [argsText, setArgsText] = useState<string>("{}");
  const [promptArgs, setPromptArgs] = useState<Record<string, string>>({
    incidentFilter: "all",
  });
  const [output, setOutput] = useState<string>("");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/mcp");
        if (!res.ok) return;
        const json = (await res.json()) as {
          tools?: McpToolSpec[];
          resources?: McpResourceSpec[];
          prompts?: McpPromptSpec[];
        };

        if (json.tools) {
          setTools(json.tools);
          if (json.tools[0]) {
            setSelectedTool(json.tools[0].name);
            setArgsText(JSON.stringify(json.tools[0].sampleArgs || {}, null, 2));
          }
        }
        if (json.resources) {
          setResources(json.resources);
          if (json.resources[0]) {
            setSelectedResource(json.resources[0].uri);
          }
        }
        if (json.prompts) {
          setPrompts(json.prompts);
          if (json.prompts[0]) {
            setSelectedPrompt(json.prompts[0].name);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function handleSelectTool(name: string) {
    setSelectedTool(name);
    const spec = tools.find((t) => t.name === name);
    setArgsText(JSON.stringify(spec?.sampleArgs || {}, null, 2));
    setOutput("");
    setLatencyMs(null);
  }

  function handleSelectResource(uri: string) {
    setSelectedResource(uri);
    setOutput("");
    setLatencyMs(null);
  }

  function handleSelectPrompt(name: string) {
    setSelectedPrompt(name);
    setOutput("");
    setLatencyMs(null);
    if (name === "diagnose_checkout_fault") {
      setPromptArgs({ incidentFilter: "all" });
    } else if (name === "propose_growth_campaign") {
      setPromptArgs({ objective: "Increase AOV past $80 without hurting margin" });
    } else if (name === "catalog_seo_remediation") {
      setPromptArgs({ categoryFilter: "all" });
    } else {
      setPromptArgs({});
    }
  }

  function handleCopyPayload() {
    let payload = "";
    if (activeTab === "tools") {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(argsText || "{}") as Record<string, unknown>;
      } catch {
        parsed = {};
      }
      payload = JSON.stringify(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: selectedTool, arguments: parsed },
        },
        null,
        2
      );
    } else if (activeTab === "resources") {
      payload = JSON.stringify(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "resources/read",
          params: { uri: selectedResource },
        },
        null,
        2
      );
    } else {
      payload = JSON.stringify(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "prompts/get",
          params: { name: selectedPrompt, arguments: promptArgs },
        },
        null,
        2
      );
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(payload);
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 1800);
    }
  }

  async function handleExecute() {
    setRunning(true);
    const started = performance.now();
    try {
      let bodyPayload: Record<string, unknown> = {};

      if (activeTab === "tools") {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(argsText || "{}") as Record<string, unknown>;
        } catch {
          setOutput(JSON.stringify({ error: "Invalid JSON arguments" }, null, 2));
          return;
        }
        bodyPayload = {
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: { name: selectedTool, arguments: parsed },
        };
      } else if (activeTab === "resources") {
        bodyPayload = {
          jsonrpc: "2.0",
          id: Date.now(),
          method: "resources/read",
          params: { uri: selectedResource },
        };
      } else {
        bodyPayload = {
          jsonrpc: "2.0",
          id: Date.now(),
          method: "prompts/get",
          params: { name: selectedPrompt, arguments: promptArgs },
        };
      }

      const res = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      const json = await res.json();
      setLatencyMs(Math.max(1, Math.round(performance.now() - started)));
      setOutput(JSON.stringify(json, null, 2));
    } finally {
      setRunning(false);
    }
  }

  const activeToolSpec = tools.find((t) => t.name === selectedTool);
  const activeResourceSpec = resources.find((r) => r.uri === selectedResource);
  const activePromptSpec = prompts.find((p) => p.name === selectedPrompt);

  return (
    <div className="overflow-hidden rounded-[28px] bg-[#111113] text-white hardware-frame-shadow">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-[#16161a] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <Terminal className="h-4 w-4 text-[#30d158]" />
          <h2 className="text-sm font-semibold text-white">
            Model Context Protocol (MCP) Suite
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] text-emerald-400">
            <Radio className="h-2.5 w-2.5 animate-pulse" />
            SSE: /api/mcp/sse
          </span>
          <span className="font-mono text-[11px] text-[#86868b]">
            JSON-RPC 2.0 · /api/mcp
          </span>
        </div>
      </div>

      {/* Protocol Tabs */}
      <div className="flex border-b border-white/[0.08] bg-[#131316] px-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab("tools");
            setOutput("");
            setLatencyMs(null);
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition ${
            activeTab === "tools"
              ? "border-emerald-400 text-white"
              : "border-transparent text-[#86868b] hover:text-[#d1d1d6]"
          }`}
        >
          <Wrench className="h-3.5 w-3.5" />
          Tools ({tools.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("resources");
            setOutput("");
            setLatencyMs(null);
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition ${
            activeTab === "resources"
              ? "border-blue-400 text-white"
              : "border-transparent text-[#86868b] hover:text-[#d1d1d6]"
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          Resources ({resources.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("prompts");
            setOutput("");
            setLatencyMs(null);
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition ${
            activeTab === "prompts"
              ? "border-purple-400 text-white"
              : "border-transparent text-[#86868b] hover:text-[#d1d1d6]"
          }`}
        >
          <MessageSquareCode className="h-3.5 w-3.5" />
          Prompts ({prompts.length})
        </button>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-12 sm:p-8">
        {/* Left List Pane */}
        <div className="space-y-2 lg:col-span-5">
          {loading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-[#09090b] p-4 text-xs text-[#86868b]">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Loading live MCP protocol manifest...
            </div>
          ) : activeTab === "tools" ? (
            tools.map((tool) => (
              <button
                key={tool.name}
                type="button"
                onClick={() => handleSelectTool(tool.name)}
                className={`w-full rounded-2xl border p-3.5 text-left transition ${
                  selectedTool === tool.name
                    ? "border-white/30 bg-white/[0.08]"
                    : "border-white/[0.06] bg-[#09090b] hover:border-white/15"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-white">
                    {tool.name}
                  </span>
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <span
                      className={`rounded-full px-1.5 py-0.5 ${
                        tool.readOnlyHint
                          ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                      }`}
                    >
                      {tool.readOnlyHint ? "read-only" : "mutating"}
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[#d1d1d6]">
                      {tool.permissionRole}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[#86868b]">
                  {tool.description}
                </p>
              </button>
            ))
          ) : activeTab === "resources" ? (
            resources.map((res) => (
              <button
                key={res.uri}
                type="button"
                onClick={() => handleSelectResource(res.uri)}
                className={`w-full rounded-2xl border p-3.5 text-left transition ${
                  selectedResource === res.uri
                    ? "border-white/30 bg-white/[0.08]"
                    : "border-white/[0.06] bg-[#09090b] hover:border-white/15"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-blue-400">
                    {res.name}
                  </span>
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] text-blue-300">
                    {res.mimeType}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-[#a1a1a6]">
                  {res.uri}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[#86868b]">
                  {res.description}
                </p>
              </button>
            ))
          ) : (
            prompts.map((prompt) => (
              <button
                key={prompt.name}
                type="button"
                onClick={() => handleSelectPrompt(prompt.name)}
                className={`w-full rounded-2xl border p-3.5 text-left transition ${
                  selectedPrompt === prompt.name
                    ? "border-white/30 bg-white/[0.08]"
                    : "border-white/[0.06] bg-[#09090b] hover:border-white/15"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-purple-400">
                    {prompt.name}
                  </span>
                  <span className="rounded-full bg-purple-500/10 px-2 py-0.5 font-mono text-[10px] text-purple-300">
                    {prompt.arguments.length} args
                  </span>
                </div>
                <div className="mt-1 text-xs font-medium text-white/90">
                  {prompt.title}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[#86868b]">
                  {prompt.description}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Right Detail & Execution Pane */}
        <div className="space-y-4 lg:col-span-7">
          {activeTab === "tools" && activeToolSpec && (
            <div className="space-y-2 rounded-2xl border border-white/[0.08] bg-[#09090b] p-4 text-xs text-[#d1d1d6]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-[#30d158]">
                    {activeToolSpec.name}
                  </span>
                  {activeToolSpec.title && (
                    <span className="text-[11px] text-[#86868b]">
                      ({activeToolSpec.title})
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[#d1d1d6]">
                    Role: {activeToolSpec.permissionRole}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      activeToolSpec.readOnlyHint
                        ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {activeToolSpec.readOnlyHint ? "read-only" : "mutating"}
                  </span>
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-blue-300">
                    {activeToolSpec.idempotentHint ? "idempotent" : "non-idempotent"}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[#86868b]">
                    {activeToolSpec.destructiveHint ? "destructive" : "non-destructive"}
                  </span>
                </div>
              </div>
              <p className="text-[12px] leading-relaxed text-[#a1a1a6]">
                {activeToolSpec.description}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.06] pt-2 font-mono text-[10px] text-[#86868b]">
                <span className="text-white/60">MCP Hints:</span>
                <span>
                  readOnlyHint=
                  <code className="text-emerald-400">
                    {String(activeToolSpec.readOnlyHint)}
                  </code>
                </span>
                <span>
                  destructiveHint=
                  <code className="text-[#d1d1d6]">
                    {String(activeToolSpec.destructiveHint)}
                  </code>
                </span>
                <span>
                  idempotentHint=
                  <code className="text-blue-300">
                    {String(activeToolSpec.idempotentHint)}
                  </code>
                </span>
                <span>
                  openWorldHint=
                  <code className="text-[#d1d1d6]">
                    {String(activeToolSpec.openWorldHint)}
                  </code>
                </span>
              </div>
            </div>
          )}

          {activeTab === "resources" && activeResourceSpec && (
            <div className="space-y-2 rounded-2xl border border-blue-500/20 bg-[#09090b] p-4 text-xs text-[#d1d1d6]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-blue-400">
                    {activeResourceSpec.name}
                  </span>
                  <span className="text-[11px] text-[#86868b]">
                    ({activeResourceSpec.title})
                  </span>
                </div>
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] text-blue-300">
                  {activeResourceSpec.mimeType}
                </span>
              </div>
              <div className="rounded-lg bg-black/40 px-3 py-1.5 font-mono text-[11px] text-emerald-400">
                {activeResourceSpec.uri}
              </div>
              <p className="text-[12px] leading-relaxed text-[#a1a1a6]">
                {activeResourceSpec.description}
              </p>
            </div>
          )}

          {activeTab === "prompts" && activePromptSpec && (
            <div className="space-y-2 rounded-2xl border border-purple-500/20 bg-[#09090b] p-4 text-xs text-[#d1d1d6]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono font-semibold text-purple-400">
                  {activePromptSpec.name}
                </span>
                <span className="rounded-full bg-purple-500/10 px-2 py-0.5 font-mono text-[10px] text-purple-300">
                  Prompt Recipe
                </span>
              </div>
              <div className="text-xs font-semibold text-white">
                {activePromptSpec.title}
              </div>
              <p className="text-[12px] leading-relaxed text-[#a1a1a6]">
                {activePromptSpec.description}
              </p>
            </div>
          )}

          {/* Input / Arguments Controls */}
          {activeTab === "tools" ? (
            <div>
              <label className="block font-mono text-[11px] text-[#86868b]">
                JSON-RPC Arguments
              </label>
              <textarea
                rows={4}
                value={argsText}
                onChange={(e) => setArgsText(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-white/10 bg-[#09090b] p-3.5 font-mono text-xs text-white outline-none focus:border-[#2997ff]"
              />
            </div>
          ) : activeTab === "prompts" ? (
            <div className="space-y-3">
              <label className="block font-mono text-[11px] text-[#86868b]">
                Prompt Arguments
              </label>
              {activePromptSpec?.arguments.map((arg) => (
                <div key={arg.name} className="space-y-1">
                  <span className="font-mono text-[11px] text-[#a1a1a6]">
                    {arg.name} {arg.required && <span className="text-amber-400">*</span>}
                    <span className="text-[#86868b]"> — {arg.description}</span>
                  </span>
                  <input
                    type="text"
                    value={promptArgs[arg.name] || ""}
                    onChange={(e) =>
                      setPromptArgs((prev) => ({ ...prev, [arg.name]: e.target.value }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#09090b] px-3.5 py-2 font-mono text-xs text-white outline-none focus:border-purple-400"
                  />
                </div>
              ))}
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={running}
                onClick={handleExecute}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                {running
                  ? "Invoking /api/mcp..."
                  : activeTab === "tools"
                  ? "Invoke MCP Tool"
                  : activeTab === "resources"
                  ? "Read MCP Resource"
                  : "Expand MCP Prompt"}
              </button>

              <button
                type="button"
                onClick={handleCopyPayload}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#2c2c30] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#3a3a3c]"
              >
                {copiedPayload ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#30d158]" />
                    Copied JSON-RPC
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-[#a1a1a6]" />
                    Copy JSON-RPC
                  </>
                )}
              </button>
            </div>

            {latencyMs !== null && (
              <span className="font-mono text-[11px] text-[#30d158]">
                200 OK · {latencyMs} ms
              </span>
            )}
          </div>

          {/* Output Display */}
          {output && (
            <pre className="code-scroll animate-step-in max-h-80 overflow-auto rounded-2xl border border-white/[0.08] bg-[#09090b] p-4 font-mono text-[11px] leading-relaxed text-[#d1d1d6]">
              {output}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
