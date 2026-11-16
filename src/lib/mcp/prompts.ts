import { prisma } from "@/lib/prisma";
import { ensureSeeded } from "@/lib/seed-data";

export interface McpPromptArgument {
  name: string;
  description: string;
  required?: boolean;
}

export interface McpPromptSpec {
  name: string;
  title: string;
  description: string;
  arguments: McpPromptArgument[];
}

export const MCP_PROMPT_SPECS: McpPromptSpec[] = [
  {
    name: "diagnose_checkout_fault",
    title: "Diagnose Checkout APM Fault",
    description:
      "Contextual prompt to analyze checkout latency spikes, N+1 queries, and generate a validated PHP fix patch for QA.",
    arguments: [
      {
        name: "incidentFilter",
        description: "Filter incidents by severity: 'critical' | 'warning' | 'all'",
        required: false,
      },
    ],
  },
  {
    name: "propose_growth_campaign",
    title: "Propose High-Converting Promo Campaign",
    description:
      "Contextual prompt to analyze cart order velocity and stage a Builder AI promotion patch into QA.",
    arguments: [
      {
        name: "objective",
        description: "Business goal (e.g. 'Increase AOV above $80', 'End-of-season clearance')",
        required: true,
      },
    ],
  },
  {
    name: "catalog_seo_remediation",
    title: "Catalog Taxonomy & SEO Remediation",
    description:
      "Contextual prompt auditing thin descriptions, missing image alt text, and uncategorized WooCommerce SKUs.",
    arguments: [
      {
        name: "categoryFilter",
        description: "Specific category to focus audit on (default: 'all')",
        required: false,
      },
    ],
  },
];

export async function getMcpPrompt(
  name: string,
  args: Record<string, string> = {}
): Promise<{
  description: string;
  messages: Array<{
    role: "user" | "assistant";
    content: { type: "text"; text: string };
  }>;
  isError?: boolean;
}> {
  await ensureSeeded();

  switch (name) {
    case "diagnose_checkout_fault": {
      const filter = args.incidentFilter || "all";
      const incidents = await prisma.revenueIncident.findMany({
        where: filter === "all" ? { status: { in: ["open", "staged_qa"] } } : { severity: filter, status: "open" },
        orderBy: { createdAt: "desc" },
        take: 3,
      });
      const config = await prisma.storeConfig.findUnique({ where: { id: "default" } });

      const incidentDetails = incidents.length
        ? incidents
            .map(
              (i) =>
                `• [${i.severity.toUpperCase()}] ${i.title} (${i.affectedEndpoint}) - p99: ${i.p99LatencyMs}ms, Risk: $${i.revenueAtRiskPerHr}/hr`
            )
            .join("\n")
        : "No open critical faults detected. Store is running within normal SLOs.";

      return {
        description: "Diagnose checkout latency and synthesize automated resolution",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `You are the Lead StoreOps Reliability Engineer for "${config?.storeName || "Anaya Botanics"}".
Active fault state: ${config?.activeFault || "NONE"}.

Current Open Incidents:
${incidentDetails}

Instructions:
1. Examine the open incidents and identify root cause (e.g., N+1 SQL queries during cart item hydration, payment gateway webhook signature timeout, or carrier rate quoting delay).
2. Synthesize an optimal PHP / WooCommerce hook patch or Redis object caching configuration to eliminate the latency bottleneck.
3. Recommend whether to stage this fix in QA or run synthetic smoke probes before promoting live to PROD.`,
            },
          },
        ],
      };
    }

    case "propose_growth_campaign": {
      const objective = args.objective || "Increase AOV and conversions";
      const [config, orders] = await Promise.all([
        prisma.storeConfig.findUnique({ where: { id: "default" } }),
        prisma.demoOrder.findMany({ take: 10, orderBy: { createdAt: "desc" } }),
      ]);

      const avgOrderVal = orders.length
        ? (orders.reduce((acc, o) => acc + o.totalCents, 0) / orders.length / 100).toFixed(2)
        : "72.50";

      return {
        description: "Draft high-converting Builder AI promotional campaign",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `You are the Head of Growth for "${config?.storeName || "Anaya Botanics"}".
Current Free Shipping Threshold: $${config?.freeShippingThreshold || 75}
Current Banner Text: "${config?.checkoutBannerText || "Free express shipping on orders over $75"}"
Recent 10 Orders Average Basket: $${avgOrderVal}
Campaign Objective: "${objective}"

Instructions:
1. Analyze if adjusting the free shipping threshold (e.g. from $75 to $60 or $85) or offering a targeted cart discount (%) will maximize checkout completion without compromising margin.
2. Formulate a precise, plain-English prompt for the 'propose_builder_change' tool to stage this banner and threshold patch into QA.
3. Outline the synthetic metrics to monitor in QA prior to one-click human promotion to PROD.`,
            },
          },
        ],
      };
    }

    case "catalog_seo_remediation": {
      const products = await prisma.product.findMany();
      const flagged = products
        .map((p) => {
          const issues: string[] = [];
          if (p.category.toLowerCase() === "uncategorized") issues.push("Uncategorized category");
          if (!p.altText.trim()) issues.push("Missing image alt text");
          if (p.description.trim().length < 60) issues.push("Thin description (< 60 chars)");
          return { sku: p.sku, name: p.name, category: p.category, issues };
        })
        .filter((f) => f.issues.length > 0);

      return {
        description: "Audit and auto-generate SEO copy and metadata for WooCommerce SKUs",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `You are the Senior Catalog Merchandiser and Technical SEO Specialist.
Scanned SKUs: ${products.length} total.
Flagged Products Needing Remediation: ${flagged.length} items.

Sample Flagged SKUs:
${flagged
  .slice(0, 5)
  .map((p) => `• SKU ${p.sku} ("${p.name}"): ${p.issues.join(", ")}`)
  .join("\n")}

Instructions:
1. Generate descriptive, high-converting product categories, accessible alt tags with sensory detail, and compelling 100+ character meta descriptions for each flagged SKU.
2. Format the response with actionable SKU-level JSON repairs compatible with the WooCommerce REST v3 /wp-json/wc/v3/products endpoint.`,
            },
          },
        ],
      };
    }

    default:
      return {
        isError: true,
        description: `Unknown prompt: ${name}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Error: Prompt '${name}' is not registered. Available prompts: ${MCP_PROMPT_SPECS.map((p) => p.name).join(", ")}`,
            },
          },
        ],
      };
  }
}
