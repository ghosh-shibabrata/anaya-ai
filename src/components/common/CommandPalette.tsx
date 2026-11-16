"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Bot,
  Check,
  Command,
  Database,
  Flame,
  LayoutDashboard,
  Radio,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react";
import { McpConfigModal } from "@/components/docs/McpConfigModal";

interface PaletteItem {
  id: string;
  category: "Navigation" | "Quick Actions" | "MCP Protocol";
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action: () => void | Promise<void>;
  badge?: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  // Listen for Cmd+K / Ctrl+K and custom event
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }

    function handleCustomOpen() {
      setOpen(true);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleCustomOpen);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleCustomOpen);
    };
  }, [open]);

  const items: PaletteItem[] = [
    // Navigation
    {
      id: "nav-demo",
      category: "Navigation",
      title: "Storefront & Cart Sandbox",
      subtitle: "Launch Anaya Botanics live storefront, bag & checkout",
      icon: <ShoppingBag className="h-4 w-4 text-emerald-400" />,
      action: () => {
        setOpen(false);
        startTransition(() => router.push("/demo"));
      },
    },
    {
      id: "nav-revenue",
      category: "Navigation",
      title: "Revenue AI APM Waterfall",
      subtitle: "Inspect checkout latency, N+1 queries, and PHP PR diffs",
      icon: <Activity className="h-4 w-4 text-amber-400" />,
      action: () => {
        setOpen(false);
        startTransition(() => router.push("/demo"));
      },
    },
    {
      id: "nav-builder",
      category: "Navigation",
      title: "Builder AI Storefront Patches",
      subtitle: "Plain-English promo rules, staging in QA & 1-click rollback",
      icon: <Bot className="h-4 w-4 text-purple-400" />,
      action: () => {
        setOpen(false);
        startTransition(() => router.push("/demo"));
      },
    },
    {
      id: "nav-pipeline",
      category: "Navigation",
      title: "Isolated Release Pipeline",
      subtitle: "Status and latency telemetry across DEV, QA staging, and PROD",
      icon: <LayoutDashboard className="h-4 w-4 text-blue-400" />,
      action: () => {
        setOpen(false);
        startTransition(() => router.push("/demo"));
      },
    },
    {
      id: "nav-docs",
      category: "Navigation",
      title: "MCP Docs & Live Playground",
      subtitle: "Model Context Protocol JSON-RPC 2.0 & SSE reference suite",
      icon: <Terminal className="h-4 w-4 text-[#30d158]" />,
      action: () => {
        setOpen(false);
        startTransition(() => router.push("/docs"));
      },
    },
    {
      id: "nav-contact",
      category: "Navigation",
      title: "Architecture & Migration Intake",
      subtitle: "Submit store architecture evaluation for custom agent setups",
      icon: <ShieldCheck className="h-4 w-4 text-blue-300" />,
      action: () => {
        setOpen(false);
        startTransition(() => router.push("/contact"));
      },
    },

    // Quick Actions
    {
      id: "action-config",
      category: "Quick Actions",
      title: "1-Click MCP Client Config",
      subtitle: "Copy ready-to-paste JSON config for Cursor, Claude Desktop, or Windsurf",
      icon: <Sparkles className="h-4 w-4 text-[#30d158]" />,
      badge: "Config",
      action: () => {
        setOpen(false);
        setConfigModalOpen(true);
      },
    },
    {
      id: "action-fault-n1",
      category: "Quick Actions",
      title: "Inject Chaos Fault: N+1 SQL Query",
      subtitle: "Simulate +2.4s cart item hydration latency bottleneck in sandbox",
      icon: <Flame className="h-4 w-4 text-red-400" />,
      badge: "Chaos",
      action: async () => {
        try {
          await fetch("/api/demo/fault", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fault: "N_PLUS_1" }),
          });
          setActionSuccess("N+1 SQL Fault injected! Refreshing sandbox...");
          setTimeout(() => {
            setOpen(false);
            router.push("/demo");
          }, 800);
        } catch {
          // ignore
        }
      },
    },
    {
      id: "action-fault-clear",
      category: "Quick Actions",
      title: "Clear All Active Chaos Faults",
      subtitle: "Reset sandbox to healthy baseline (0 faults active)",
      icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />,
      badge: "Reset",
      action: async () => {
        try {
          await fetch("/api/demo/fault", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fault: "NONE" }),
          });
          setActionSuccess("All faults cleared! Sandbox is healthy.");
          setTimeout(() => {
            setOpen(false);
            router.push("/demo");
          }, 800);
        } catch {
          // ignore
        }
      },
    },

    // MCP Protocol
    {
      id: "mcp-sse-copy",
      category: "MCP Protocol",
      title: "Copy MCP SSE Endpoint",
      subtitle: "Copies the remote Server-Sent Events URL for Cursor / Windsurf",
      icon: <Radio className="h-4 w-4 text-emerald-400" />,
      action: () => {
        if (typeof window !== "undefined" && navigator.clipboard) {
          const url = `${window.location.origin}/api/mcp/sse`;
          void navigator.clipboard.writeText(url);
          setActionSuccess("Copied SSE URL: " + url);
          setTimeout(() => setOpen(false), 900);
        }
      },
    },
    {
      id: "mcp-resource-health",
      category: "MCP Protocol",
      title: "Inspect 'anaya://store/health' Resource",
      subtitle: "Open live store health snapshot in documentation playground",
      icon: <Database className="h-4 w-4 text-blue-400" />,
      action: () => {
        setOpen(false);
        router.push("/docs");
      },
    },
    {
      id: "mcp-tool-audit",
      category: "MCP Protocol",
      title: "Run 'run_catalog_seo_audit' Tool",
      subtitle: "Scan products for uncategorized SKUs and missing alt tags",
      icon: <Wrench className="h-4 w-4 text-emerald-400" />,
      action: () => {
        setOpen(false);
        router.push("/docs");
      },
    },
  ];

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  const activeIndex = selectedIndex < filtered.length ? selectedIndex : 0;

  function handleSelect(item: PaletteItem) {
    void item.action();
  }

  function handleKeyDownInPalette(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === "Enter" && filtered[activeIndex]) {
      e.preventDefault();
      handleSelect(filtered[activeIndex]);
    }
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
            onClick={() => setOpen(false)}
          />

          {/* Dialog Container */}
          <div
            onKeyDown={handleKeyDownInPalette}
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[26px] border border-white/10 bg-[#16161a] text-white shadow-2xl animate-fade-in"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 border-b border-white/[0.08] px-5 py-4">
              <Search className="h-4 w-4 text-[#86868b]" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Type a command or search (e.g. 'sandbox', 'fault', 'config', 'mcp')..."
                className="w-full bg-transparent text-sm text-white placeholder-[#86868b] outline-none"
              />
              {actionSuccess ? (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#30d158]">
                  <Check className="h-3 w-3" />
                  {actionSuccess}
                </span>
              ) : (
                <kbd className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-[#86868b]">
                  ESC
                </kbd>
              )}
            </div>

            {/* Results List */}
            <div className="code-scroll max-h-96 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#86868b]">
                  No matching commands found for &ldquo;{query}&rdquo;
                </div>
              ) : (
                filtered.map((item, index) => {
                  const isSelected = index === activeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                        isSelected
                          ? "bg-white/[0.08] border border-white/15"
                          : "border border-transparent hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                            isSelected ? "bg-white/15 text-white" : "bg-white/5 text-[#a1a1a6]"
                          }`}
                        >
                          {item.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">
                              {item.title}
                            </span>
                            {item.badge && (
                              <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[9px] text-[#d1d1d6]">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#86868b]">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[#86868b]">
                        <span className="font-mono text-[10px] text-[#86868b]/70">
                          {item.category}
                        </span>
                        {isSelected && <ArrowRight className="h-3.5 w-3.5 text-white" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Bar */}
            <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#121215] px-5 py-3 text-[11px] text-[#86868b]">
              <div className="flex items-center gap-4">
                <span>
                  <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px]">
                    ↑
                  </kbd>{" "}
                  <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px]">
                    ↓
                  </kbd>{" "}
                  Navigate
                </span>
                <span>
                  <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px]">
                    ↵
                  </kbd>{" "}
                  Select
                </span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[10px] text-[#a1a1a6]">
                <Command className="h-3 w-3" />
                <span>K for Spotlight</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <McpConfigModal
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
      />
    </>
  );
}
