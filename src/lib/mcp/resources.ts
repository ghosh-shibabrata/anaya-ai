import { prisma } from "@/lib/prisma";
import { ensureSeeded } from "@/lib/seed-data";

export interface McpResourceSpec {
  uri: string;
  name: string;
  title: string;
  description: string;
  mimeType: string;
}

export const MCP_RESOURCE_SPECS: McpResourceSpec[] = [
  {
    uri: "anaya://store/health",
    name: "store_health",
    title: "Store Health Snapshot",
    description:
      "Live store operational health, runtime flags (HPOS, Redis, autoscaling), and active chaos fault.",
    mimeType: "application/json",
  },
  {
    uri: "anaya://incidents/open",
    name: "open_incidents",
    title: "Open Revenue Incidents",
    description:
      "Active checkout and APM incidents with dollar-at-risk calculations and waterfall spans.",
    mimeType: "application/json",
  },
  {
    uri: "anaya://catalog/audit",
    name: "catalog_audit",
    title: "Catalog Taxonomy & SEO Audit",
    description:
      "Audit findings across WooCommerce SKUs: uncategorized items, missing alt text, thin descriptions.",
    mimeType: "application/json",
  },
  {
    uri: "anaya://environments/pipeline",
    name: "environments_pipeline",
    title: "Isolated Pipeline State",
    description:
      "Status, release tags, and latency benchmarks across DEV, QA staging, and PROD.",
    mimeType: "application/json",
  },
];

export async function readMcpResource(
  uri: string
): Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }>; isError?: boolean }> {
  await ensureSeeded();

  switch (uri) {
    case "anaya://store/health": {
      const [config, envs] = await Promise.all([
        prisma.storeConfig.findUnique({ where: { id: "default" } }),
        prisma.environmentNode.findMany({ orderBy: { id: "asc" } }),
      ]);
      const data = {
        storeName: config?.storeName || "Anaya Botanics",
        mode: config?.mode || "SANDBOX",
        wooConnected: config?.wooConnected || false,
        activeFault: config?.activeFault || "NONE",
        infrastructure: {
          hposEnabled: config?.hposEnabled ?? true,
          redisObjectCache: config?.redisObjectCache ?? true,
          autoScalingActive: config?.autoScalingActive ?? true,
        },
        environments: envs.map((e) => ({
          name: e.name,
          status: e.status,
          p95LatencyMs: e.p95LatencyMs,
          versionTag: e.versionTag,
          commitSha: e.commitSha,
        })),
        timestamp: new Date().toISOString(),
      };

      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    case "anaya://incidents/open": {
      const incidents = await prisma.revenueIncident.findMany({
        where: { status: { in: ["open", "staged_qa"] } },
        orderBy: { createdAt: "desc" },
      });
      const data = {
        openIncidentsCount: incidents.length,
        incidents: incidents.map((i) => ({
          id: i.id,
          title: i.title,
          severity: i.severity,
          faultType: i.faultType,
          status: i.status,
          revenueAtRiskPerHr: i.revenueAtRiskPerHr,
          affectedEndpoint: i.affectedEndpoint,
          p99LatencyMs: i.p99LatencyMs,
          createdAt: i.createdAt,
        })),
        timestamp: new Date().toISOString(),
      };

      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    case "anaya://catalog/audit": {
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
            category: p.category,
            seoScore: p.seoScore,
            issues,
          };
        })
        .filter((f) => f.issues.length > 0);

      const data = {
        totalSkus: products.length,
        flaggedCount: findings.length,
        averageSeoScore:
          products.length > 0
            ? Math.round(products.reduce((acc, p) => acc + p.seoScore, 0) / products.length)
            : 0,
        findings,
        timestamp: new Date().toISOString(),
      };

      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    case "anaya://environments/pipeline": {
      const envs = await prisma.environmentNode.findMany({ orderBy: { id: "asc" } });
      const [patches, config] = await Promise.all([
        prisma.builderPatch.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.storeConfig.findUnique({ where: { id: "default" } }),
      ]);

      const data = {
        storeMode: config?.mode || "SANDBOX",
        pipeline: envs.map((e) => ({
          environment: e.name,
          status: e.status,
          p95LatencyMs: e.p95LatencyMs,
          versionTag: e.versionTag,
          commitSha: e.commitSha,
          lastDeployedAt: e.lastDeployedAt,
        })),
        stagedPatches: patches.map((p) => ({
          id: p.id,
          status: p.status,
          targetEnv: p.targetEnv,
          summary: p.summary,
        })),
        timestamp: new Date().toISOString(),
      };

      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    default:
      return {
        isError: true,
        contents: [
          {
            uri,
            mimeType: "text/plain",
            text: `Resource not found: ${uri}. Supported URIs: ${MCP_RESOURCE_SPECS.map((r) => r.uri).join(", ")}`,
          },
        ],
      };
  }
}
