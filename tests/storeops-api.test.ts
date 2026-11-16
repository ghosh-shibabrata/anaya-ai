import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { ensureSeeded } from "@/lib/seed-data";
import { synthesizeBuilderPatch } from "@/lib/agents";

test("Database auto-seeding initializes store config, environments, and catalog", async () => {
  await ensureSeeded();

  const [config, envs, products] = await Promise.all([
    prisma.storeConfig.findUnique({ where: { id: "default" } }),
    prisma.environmentNode.findMany({ orderBy: { id: "asc" } }),
    prisma.product.findMany(),
  ]);

  assert.ok(config);
  assert.equal(config.storeName, "Anaya Botanics (WooCommerce Sandbox)");
  assert.equal(envs.length, 3);
  assert.ok(products.length >= 4);
});

test("Chaos fault injection updates StoreConfig activeFault state", async () => {
  await ensureSeeded();

  // Inject N+1 SQL fault
  await prisma.storeConfig.update({
    where: { id: "default" },
    data: { activeFault: "N_PLUS_1" },
  });

  let config = await prisma.storeConfig.findUnique({ where: { id: "default" } });
  assert.equal(config?.activeFault, "N_PLUS_1");

  // Reset to NONE
  await prisma.storeConfig.update({
    where: { id: "default" },
    data: { activeFault: "NONE" },
  });

  config = await prisma.storeConfig.findUnique({ where: { id: "default" } });
  assert.equal(config?.activeFault, "NONE");
});

test("Builder AI synthesizer generates non-destructive QA staging patches", async () => {
  await ensureSeeded();

  const prompt = "Offer 15% discount on all orders over $50";
  const patchData = synthesizeBuilderPatch(prompt);

  assert.ok(patchData.summary);
  assert.ok(patchData.diffText.includes("--- a/wp-content/themes/anaya-store"));
  assert.ok(patchData.diffText.includes("+++ b/wp-content/themes/anaya-store"));

  const patch = await prisma.builderPatch.create({
    data: {
      prompt,
      summary: patchData.summary,
      targetEnv: "QA",
      diffText: patchData.diffText,
      status: "staged_qa",
      appliedConfigJson: JSON.stringify(patchData.configUpdates),
    },
  });

  assert.ok(patch.id);
  assert.equal(patch.targetEnv, "QA");
  assert.equal(patch.status, "staged_qa");
});

test("Isolated environments reflect correct node health and release tags", async () => {
  await ensureSeeded();

  const envs = await prisma.environmentNode.findMany({ orderBy: { id: "asc" } });
  const names = envs.map((e) => e.name);

  assert.ok(names.includes("DEV"));
  assert.ok(names.includes("QA"));
  assert.ok(names.includes("PROD"));

  for (const env of envs) {
    assert.ok(env.versionTag);
    assert.ok(env.commitSha);
    assert.ok(env.p95LatencyMs > 0);
  }
});
