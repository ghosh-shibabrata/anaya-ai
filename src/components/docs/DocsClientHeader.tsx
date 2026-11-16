"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Radio, Sparkles } from "lucide-react";
import { McpConfigModal } from "@/components/docs/McpConfigModal";

export function DocsClientHeader() {
  const [configOpen, setConfigOpen] = useState(false);

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setConfigOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-[#1d1d1f] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-black"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#30d158]" />
          1-Click Client Config (Cursor / Claude)
        </button>

        <Link
          href="/api/mcp/sse"
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2.5 text-xs font-semibold text-[#1d1d1f] shadow-sm transition hover:bg-[#f5f5f7]"
        >
          <Radio className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
          Test SSE Stream
          <ArrowUpRight className="h-3.5 w-3.5 text-[#86868b]" />
        </Link>

        <Link
          href="/demo"
          className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2.5 text-xs font-semibold text-[#1d1d1f] shadow-sm transition hover:bg-[#f5f5f7]"
        >
          Launch Interactive Sandbox
          <ArrowUpRight className="h-3.5 w-3.5 text-[#86868b]" />
        </Link>
      </div>

      <McpConfigModal open={configOpen} onClose={() => setConfigOpen(false)} />
    </>
  );
}
