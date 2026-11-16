"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type SnippetLang = "curl" | "typescript" | "python";

interface McpCodeSnippetsProps {
  tab: "tools" | "resources" | "prompts";
  targetName: string;
  args: Record<string, unknown>;
}

export function McpCodeSnippets({ tab, targetName, args }: McpCodeSnippetsProps) {
  const [lang, setLang] = useState<SnippetLang>("curl");
  const [copied, setCopied] = useState(false);
  const [origin] = useState(() =>
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "http://localhost:3000"
  );

  const httpUrl = `${origin}/api/mcp`;
  const sseUrl = `${origin}/api/mcp/sse`;

  let code = "";

  if (lang === "curl") {
    let method = "tools/call";
    let paramsObj: Record<string, unknown> = { name: targetName, arguments: args };

    if (tab === "resources") {
      method = "resources/read";
      paramsObj = { uri: targetName };
    } else if (tab === "prompts") {
      method = "prompts/get";
      paramsObj = { name: targetName, arguments: args };
    }

    const payload = JSON.stringify(
      {
        jsonrpc: "2.0",
        id: 1,
        method,
        params: paramsObj,
      },
      null,
      2
    );

    code = `curl -X POST "${httpUrl}" \\
  -H "Content-Type: application/json" \\
  -d '${payload}'`;
  } else if (lang === "typescript") {
    if (tab === "tools") {
      code = `import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function main() {
  const transport = new SSEClientTransport(new URL("${sseUrl}"));
  const client = new Client({ name: "commerce-ops-client", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport);

  // Invoke tool
  const result = await client.callTool({
    name: "${targetName}",
    arguments: ${JSON.stringify(args, null, 2)},
  });

  console.log(result);
}

main().catch(console.error);`;
    } else if (tab === "resources") {
      code = `import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function main() {
  const transport = new SSEClientTransport(new URL("${sseUrl}"));
  const client = new Client({ name: "commerce-ops-client", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport);

  // Read resource
  const result = await client.readResource({
    uri: "${targetName}",
  });

  console.log(result.contents);
}

main().catch(console.error);`;
    } else {
      code = `import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function main() {
  const transport = new SSEClientTransport(new URL("${sseUrl}"));
  const client = new Client({ name: "commerce-ops-client", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport);

  // Expand prompt
  const result = await client.getPrompt({
    name: "${targetName}",
    arguments: ${JSON.stringify(args, null, 2)},
  });

  console.log(result.messages);
}

main().catch(console.error);`;
    }
  } else {
    // Python
    if (tab === "tools") {
      code = `import asyncio
from mcp import ClientSession
from mcp.client.sse import sse_client

async def main():
    async with sse_client("${sseUrl}") as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.call_tool(
                "${targetName}",
                arguments=${JSON.stringify(args)}
            )
            print(result)

asyncio.run(main())`;
    } else if (tab === "resources") {
      code = `import asyncio
from mcp import ClientSession
from mcp.client.sse import sse_client

async def main():
    async with sse_client("${sseUrl}") as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.read_resource("${targetName}")
            print(result)

asyncio.run(main())`;
    } else {
      code = `import asyncio
from mcp import ClientSession
from mcp.client.sse import sse_client

async def main():
    async with sse_client("${sseUrl}") as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.get_prompt(
                "${targetName}",
                arguments=${JSON.stringify(args)}
            )
            print(result)

asyncio.run(main())`;
    }
  }

  function handleCopy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/[0.08] bg-[#0c0c0e] p-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#86868b]">
          <span>Code Integration:</span>
          <div className="flex rounded-lg bg-[#16161a] p-0.5 border border-white/10">
            {(["curl", "typescript", "python"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition ${
                  lang === l
                    ? "bg-white text-black font-semibold shadow-xs"
                    : "text-[#86868b] hover:text-[#d1d1d6]"
                }`}
              >
                {l === "curl" ? "cURL" : l === "typescript" ? "TypeScript SDK" : "Python SDK"}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-white/20"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-[#30d158]" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 text-[#a1a1a6]" />
              Copy Snippet
            </>
          )}
        </button>
      </div>

      <pre className="code-scroll mt-3 max-h-48 overflow-auto font-mono text-[11px] leading-relaxed text-[#a1a1a6]">
        {code}
      </pre>
    </div>
  );
}
