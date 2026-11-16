import { Actions } from "./actions";
import { createServerContext } from "./db";

async function main() {
  const ctx = createServerContext();
  console.log("Testing Actions.seedCatalog...");
  const seedRes = await Actions.seedCatalog.handler(ctx, {});
  console.log("Seed result:", seedRes);

  console.log("Testing Actions.getState...");
  const state = await Actions.getState.handler(ctx, {});
  console.log(`Loaded ${state.products.length} products, ${state.agents.length} agents, ${state.orders.length} orders`);

  console.log("Testing Actions.runTransaction (agent purchase mission)...");
  const agent = state.agents[0];
  if (agent) {
    const tx = await Actions.runTransaction.handler(ctx, {
      agent_id: agent.id,
      category: "all",
      max_price_cents: 60000,
      min_rating: 4.0,
      qty: 1,
    });
    console.log("Transaction message:", tx.message);
    console.log(`Transaction trace steps (${tx.trace.length}):`);
    for (const step of tx.trace) {
      console.log(`  [${step.step}] ${step.label} (${step.ok ? "OK" : "FAIL"}): ${step.detail}`);
    }
  }

  console.log("Testing Actions.getSurface...");
  const surface = await Actions.getSurface.handler(ctx, {});
  console.log(`Tools available: ${surface.tools.length}`);

  console.log("All action tests passed!");
}

main().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
