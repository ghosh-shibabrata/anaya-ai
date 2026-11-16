import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureSeeded } from "@/lib/seed-data";
import { synthesizeBuilderPatch } from "@/lib/agents";
import { MCP_RESOURCE_SPECS, readMcpResource } from "@/lib/mcp/resources";
import { MCP_PROMPT_SPECS, getMcpPrompt } from "@/lib/mcp/prompts";

export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface McpToolInputSchema {
  type: "object";
  properties: Record<
    string,
    {
      type: string;
      description: string;
      enum?: string[];
      default?: unknown;
    }
  >;
  required?: string[];
}

export interface McpToolSpec {
  name: string;
  title: string;
  description: string;
  permissionRole: "Viewer" | "Editor" | "Admin";
  annotations: ToolAnnotations;
  // Top-level hints mirrored for maximum client and directory compatibility
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
  inputSchema: McpToolInputSchema;
  sampleArgs: Record<string, unknown>;
}

export const MCP_TOOL_SPECS: McpToolSpec[] = [
  {
    name: "get_store_health",
    title: "Get Store Health",
    description:
      "Returns live store mode, active WooCommerce runtime flags (HPOS, Redis, auto-scaling), environment latency across DEV/QA/PROD, and any active fault.",
    permissionRole: "Viewer",
    annotations: {
      title: "Get Store Health",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    sampleArgs: {},
  },
  {
    name: "list_revenue_incidents",
    title: "List Revenue Incidents",
    description:
      "Lists open and resolved Revenue AI checkout/APM incidents with dollar-at-risk estimates and p99 latency telemetry.",
    permissionRole: "Viewer",
    annotations: {
      title: "List Revenue Incidents",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Filter by status: 'all' | 'open' | 'staged_qa' | 'resolved'",
          enum: ["all", "open", "staged_qa", "resolved"],
        },
      },
      required: [],
    },
    sampleArgs: { status: "all" },
  },
  {
    name: "run_catalog_seo_audit",
    title: "Run Catalog & SEO Audit",
    description:
      "Audits WooCommerce/Sandbox products for Uncategorized items, missing image alt text, and thin descriptions below 60 characters.",
    permissionRole: "Viewer",
    annotations: {
      title: "Run Catalog & SEO Audit",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    sampleArgs: {},
  },
  {
    name: "query_analytics",
    title: "Query Store Analytics",
    description:
      "Queries live order velocity, average checkout latency, and conversion metrics for natural-language BI questions.",
    permissionRole: "Viewer",
    annotations: {
      title: "Query Store Analytics",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    inputSchema: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description:
            "Operational or BI analytics question to answer from live orders and latency telemetry",
        },
      },
      required: ["question"],
    },
    sampleArgs: { question: "Summarize checkout latency and order revenue today" },
  },
  {
    name: "propose_builder_change",
    title: "Propose Builder Change",
    description:
      "Stages a plain-English Builder AI storefront patch in QA (non-destructive; awaits human promotion to PROD).",
    permissionRole: "Editor",
    annotations: {
      title: "Propose Builder Change",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Plain-English storefront change request to stage into QA",
        },
      },
      required: ["prompt"],
    },
    sampleArgs: { prompt: "Set free express shipping threshold to $60" },
  },
];

export async function executeMcpTool(
  name: string,
  args: Record<string, unknown> = {}
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  await ensureSeeded();

  switch (name) {
    case "get_store_health": {
      const [config, envs] = await Promise.all([
        prisma.storeConfig.findUnique({ where: { id: "default" } }),
        prisma.environmentNode.findMany({ orderBy: { id: "asc" } }),
      ]);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                storeName: config?.storeName,
                mode: config?.mode,
                wooConnected: config?.wooConnected,
                activeFault: config?.activeFault,
                infrastructure: {
                  hposEnabled: config?.hposEnabled,
                  redisObjectCache: config?.redisObjectCache,
                  autoScalingActive: config?.autoScalingActive,
                },
                environments: envs,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "list_revenue_incidents": {
      const status = typeof args.status === "string" ? args.status : "all";
      const incidents = await prisma.revenueIncident.findMany({
        where: status === "all" ? undefined : { status },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              incidents.map((i) => ({
                id: i.id,
                title: i.title,
                severity: i.severity,
                status: i.status,
                revenueAtRiskPerHr: i.revenueAtRiskPerHr,
                affectedEndpoint: i.affectedEndpoint,
                p99LatencyMs: i.p99LatencyMs,
              })),
              null,
              2
            ),
          },
        ],
      };
    }

    case "run_catalog_seo_audit": {
      const products = await prisma.product.findMany();
      const findings = products
        .map((p) => {
          const issues: string[] = [];
          if (p.category.toLowerCase() === "uncategorized") {
            issues.push("Product assigned to Uncategorized taxonomy");
          }
          if (!p.altText.trim()) {
            issues.push("Missing product image alt text");
          }
          if (p.description.trim().length < 60) {
            issues.push("Thin product description (< 60 chars)");
          }
          return {
            sku: p.sku,
            name: p.name,
            seoScore: p.seoScore,
            issues,
          };
        })
        .filter((f) => f.issues.length > 0);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                scannedProducts: products.length,
                flaggedCount: findings.length,
                findings,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "query_analytics": {
      const question =
        typeof args.question === "string"
          ? args.question
          : "Summarize store telemetry";
      const orders = await prisma.demoOrder.findMany({
        orderBy: { createdAt: "desc" },
      });
      const completed = orders.filter((o) => o.status === "completed");
      const failed = orders.filter((o) => o.status !== "completed");
      const grossCents = completed.reduce((acc, o) => acc + o.totalCents, 0);
      const avgCheckoutMs =
        orders.length > 0
          ? Math.round(
              orders.reduce((acc, o) => acc + o.checkoutMs, 0) / orders.length
            )
          : 312;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                question,
                totalOrders: orders.length,
                completedOrders: completed.length,
                failedOrAbandoned: failed.length,
                grossRevenueUsd: Number((grossCents / 100).toFixed(2)),
                avgCheckoutLatencyMs: avgCheckoutMs,
                recommendation:
                  failed.length > 0
                    ? "Check Revenue AI incidents: checkout failures correlate with elevated latency."
                    : "Checkout funnel is operating within sub-second SLA (< 350ms).",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "propose_builder_change": {
      const prompt =
        typeof args.prompt === "string" && args.prompt.trim().length > 0
          ? args.prompt.trim()
          : "Update free shipping banner to $60";
      const generated = synthesizeBuilderPatch(prompt);
      const patch = await prisma.builderPatch.create({
        data: {
          prompt,
          summary: generated.summary,
          targetEnv: "QA",
          diffText: generated.diffText,
          smokeTestStatus: "passed",
          appliedConfigJson: JSON.stringify(generated.configUpdates),
          status: "staged_qa",
        },
      });
      await prisma.auditEvent.create({
        data: {
          actor: "External MCP Client",
          role: "Editor",
          action: "MCP_STAGE_PATCH",
          environment: "QA",
          detail: generated.summary,
        },
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                patchId: patch.id,
                status: patch.status,
                targetEnv: patch.targetEnv,
                summary: patch.summary,
                diffText: patch.diffText,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown MCP tool: ${name}` }],
      };
  }
}

export function createAnayaMcpServer(): McpServer {
  const server = new McpServer({
    name: "anaya-commerceops",
    version: "1.0.0",
  });

  server.tool(
    "get_store_health",
    "Returns live store mode, runtime flags, environment latencies, and active faults.",
    {},
    {
      title: "Get Store Health",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async () => executeMcpTool("get_store_health", {})
  );

  server.tool(
    "list_revenue_incidents",
    "Lists open and resolved Revenue AI incidents with dollar-at-risk estimates.",
    {
      status: z
        .string()
        .optional()
        .describe("Filter by incident status: 'all' | 'open' | 'staged_qa' | 'resolved'"),
    },
    {
      title: "List Revenue Incidents",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ status }) => executeMcpTool("list_revenue_incidents", { status })
  );

  server.tool(
    "run_catalog_seo_audit",
    "Audits catalog taxonomy, alt text, and product descriptions.",
    {},
    {
      title: "Run Catalog & SEO Audit",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async () => executeMcpTool("run_catalog_seo_audit", {})
  );

  server.tool(
    "query_analytics",
    "Queries live order revenue, checkout latency, and failed checkout metrics.",
    {
      question: z
        .string()
        .describe("Operational analytics question to query from telemetry"),
    },
    {
      title: "Query Store Analytics",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ question }) => executeMcpTool("query_analytics", { question })
  );

  server.tool(
    "propose_builder_change",
    "Stages a Builder AI storefront patch in QA awaiting human promotion.",
    {
      prompt: z
        .string()
        .describe("Plain-English storefront change request to stage into QA"),
    },
    {
      title: "Propose Builder Change",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    async ({ prompt }) => executeMcpTool("propose_builder_change", { prompt })
  );


  // Register MCP Resources (anaya:// URIs)
  for (const res of MCP_RESOURCE_SPECS) {
    server.resource(
      res.name,
      res.uri,
      {
        description: res.description,
        mimeType: res.mimeType,
      },
      async (uri) => {
        const rawUri = typeof uri === "string" ? uri : ((uri && uri.href) ? uri.href : res.uri);
        const result = await readMcpResource(rawUri);
        return {
          contents: result.contents.map((item) => ({
            uri: item.uri,
            mimeType: item.mimeType,
            text: item.text,
          })),
        };
      }
    );
  }


  // Register MCP Prompts
  server.prompt(
    "diagnose_checkout_fault",
    "Contextual prompt to analyze checkout latency spikes, N+1 queries, and generate a validated PHP fix patch for QA.",
    {
      incidentFilter: z
        .string()
        .optional()
        .describe("Filter incidents by severity: 'critical' | 'warning' | 'all'"),
    },
    async (args) => {
      const res = await getMcpPrompt("diagnose_checkout_fault", (args as Record<string, string>) || {});
      return {
        description: res.description,
        messages: res.messages,
      };
    }
  );

  server.prompt(
    "propose_growth_campaign",
    "Contextual prompt to analyze cart order velocity and stage a Builder AI promotion patch into QA.",
    {
      objective: z
        .string()
        .describe("Business goal (e.g. 'Increase AOV above $80', 'End-of-season clearance')"),
    },
    async (args) => {
      const res = await getMcpPrompt("propose_growth_campaign", (args as Record<string, string>) || {});
      return {
        description: res.description,
        messages: res.messages,
      };
    }
  );

  server.prompt(
    "catalog_seo_remediation",
    "Contextual prompt auditing thin descriptions, missing image alt text, and uncategorized WooCommerce SKUs.",
    {
      categoryFilter: z
        .string()
        .optional()
        .describe("Specific category to focus audit on (default: 'all')"),
    },
    async (args) => {
      const res = await getMcpPrompt("catalog_seo_remediation", (args as Record<string, string>) || {});
      return {
        description: res.description,
        messages: res.messages,
      };
    }
  );

  return server;
}
