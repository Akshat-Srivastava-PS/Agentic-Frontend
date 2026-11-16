import { defineAction, z, type ActionsModule, type Ctx } from "@hatch/space-sdk";
import { asc, desc, eq } from "drizzle-orm";
import * as schema from "./schema";

/* ------------------------------------------------------------------ */
/* Catalog: real Coach products (US prices as listed on coach.com,    */
/* checked Nov 2026). Seeded via seedCatalog, or swapped in wholesale */
/* via loadCoachCatalog — then fully user-managed.                    */
/* ------------------------------------------------------------------ */

const CATALOG = [
  { sku: "coach-tabby-26", name: "Tabby Shoulder Bag 26", category: "Shoulder Bags", description: "Coach's modern icon, reimagined from a 1970s design. Polished pebble leather, Signature C hardware, detachable short strap plus a long crossbody strap. About 10 in. wide — fits phone, wallet and daily essentials.", priceCents: 47500, unit: "bag", latencyMs: 220, slaPct: 99.9, rating: 4.8, stock: 24, seller: "Coach" },
  { sku: "coach-tabby-pillow-26", name: "Tabby Shoulder Bag 26 With Pillow Quilting", category: "Shoulder Bags", description: "The Tabby 26 in plush pillow-quilted nappa leather, with the Signature C wrapped in matching leather. Detachable straps for shoulder or crossbody wear.", priceCents: 57500, unit: "bag", latencyMs: 240, slaPct: 99.9, rating: 4.6, stock: 12, seller: "Coach" },
  { sku: "coach-brooklyn-28", name: "Brooklyn Shoulder Bag 28", category: "Shoulder Bags", description: "Slouchy hobo in natural grain leather with a roomy interior and magnetic closure. About 11 in. wide — the everyday carry that topped Lyst's hottest-bags list in 2024.", priceCents: 29500, unit: "bag", latencyMs: 210, slaPct: 99.9, rating: 4.7, stock: 38, seller: "Coach" },
  { sku: "coach-empire-34", name: "Empire Carryall Bag 34", category: "Totes & Carryalls", description: "Structured carryall in burnished Loved Leather with rolled top handles, a detachable strap and room for a laptop — Coach's work-ready Empire silhouette.", priceCents: 47500, unit: "bag", latencyMs: 260, slaPct: 99.5, rating: 4.7, stock: 15, seller: "Coach" },
  { sku: "coach-chelsea-26", name: "Chelsea Shoulder Bag 26", category: "Shoulder Bags", description: "Soft flap shoulder bag in smooth leather with a turnlock closure and the Coach hangtag. Wears on the shoulder with a single long strap.", priceCents: 29500, unit: "bag", latencyMs: 230, slaPct: 99.5, rating: 4.6, stock: 20, seller: "Coach" },
  { sku: "coach-kisslock-frame", name: "Kisslock Frame Bag", category: "Crossbody Bags", description: "Vintage-inspired frame bag with Coach's signature kisslock closure, a top handle and a leather hangtag — a reissue of an archival silhouette.", priceCents: 35000, unit: "bag", latencyMs: 250, slaPct: 99.5, rating: 4.8, stock: 9, seller: "Coach" },
  { sku: "coach-plaza-18", name: "Plaza Bag 18", category: "Crossbody Bags", description: "Compact zip-top shoulder bag in natural grain leather with gold-tone hardware and an adjustable strap. Essentials only: phone, cards, keys.", priceCents: 9500, unit: "bag", latencyMs: 190, slaPct: 99.9, rating: 4.5, stock: 45, seller: "Coach" },
  { sku: "coach-bowling-small", name: "Bowling Small Shoulder Bag", category: "Shoulder Bags", description: "Small bowling silhouette in recycled polyester with leather trim and the Signature logo, on an adjustable shoulder strap.", priceCents: 12500, unit: "bag", latencyMs: 200, slaPct: 99.5, rating: 4.4, stock: 30, seller: "Coach" },
  { sku: "coach-essential-wristlet", name: "Essential Small Wristlet", category: "Wallets & Wristlets", description: "Zip wristlet in perforated Signature leather with a wrist strap and the Coach plaque. Cards, cash and phone — nothing more.", priceCents: 7500, unit: "wristlet", latencyMs: 170, slaPct: 99.9, rating: 4.6, stock: 60, seller: "Coach" },
];

const STARTER_AGENTS = [
  { name: "Gift Concierge", purpose: "Buys gifts for clients and family, any Coach category", budgetCents: 150000, maxOrderCents: 60000, allowedCategories: "all" },
  { name: "Personal Shopper", purpose: "Builds a wardrobe of Coach bags and carryalls", budgetCents: 300000, maxOrderCents: 100000, allowedCategories: "Shoulder Bags, Totes & Carryalls" },
  { name: "Accessories Scout", purpose: "Small leather goods only — wristlets and compact bags", budgetCents: 50000, maxOrderCents: 20000, allowedCategories: "Wallets & Wristlets, Crossbody Bags" },
];

/* ------------------------------ shapes ------------------------------ */

const productShape = z.object({
  id: z.number(),
  sku: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string(),
  price_cents: z.number(),
  unit: z.string(),
  latency_ms: z.number(),
  sla_pct: z.number(),
  rating: z.number(),
  stock: z.number(),
  seller: z.string(),
});

const agentShape = z.object({
  id: z.number(),
  name: z.string(),
  purpose: z.string(),
  budget_cents: z.number(),
  spent_cents: z.number(),
  max_order_cents: z.number(),
  allowed_categories: z.string(),
});

const traceStep = z.object({
  step: z.string(),
  label: z.string(),
  detail: z.string(),
  ok: z.boolean(),
});

const orderShape = z.object({
  id: z.number(),
  ref: z.string(),
  agent_name: z.string(),
  product_name: z.string(),
  qty: z.number(),
  unit_price_cents: z.number(),
  total_cents: z.number(),
  status: z.string(),
  reason: z.string(),
  idempotency_key: z.string(),
  trace: z.array(traceStep),
  created_at: z.string(),
});

type TraceStep = z.infer<typeof traceStep>;

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function parseTrace(raw: string): TraceStep[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is TraceStep =>
        typeof s === "object" && s !== null &&
        typeof (s as TraceStep).step === "string" &&
        typeof (s as TraceStep).label === "string" &&
        typeof (s as TraceStep).detail === "string" &&
        typeof (s as TraceStep).ok === "boolean",
    );
  } catch {
    return [];
  }
}

function orderOut(row: typeof schema.orders.$inferSelect): z.infer<typeof orderShape> {
  return {
    id: row.id,
    ref: row.ref,
    agent_name: row.agentName,
    product_name: row.productName,
    qty: row.qty,
    unit_price_cents: row.unitPriceCents,
    total_cents: row.totalCents,
    status: row.status,
    reason: row.reason,
    idempotency_key: row.idempotencyKey,
    trace: parseTrace(row.trace),
    created_at: row.createdAt.toISOString(),
  };
}

function productOut(row: typeof schema.products.$inferSelect): z.infer<typeof productShape> {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    description: row.description,
    price_cents: row.priceCents,
    unit: row.unit,
    latency_ms: row.latencyMs,
    sla_pct: row.slaPct,
    rating: row.rating,
    stock: row.stock,
    seller: row.seller,
  };
}

function agentOut(row: typeof schema.agents.$inferSelect): z.infer<typeof agentShape> {
  return {
    id: row.id,
    name: row.name,
    purpose: row.purpose,
    budget_cents: row.budgetCents,
    spent_cents: row.spentCents,
    max_order_cents: row.maxOrderCents,
    allowed_categories: row.allowedCategories,
  };
}

/* ------------------------- transaction engine ------------------------ */

async function executePurchase(
  ctx: Ctx,
  args: {
    agentId: number;
    mode: "mission" | "direct";
    category?: string;
    productId?: number;
    maxPriceCents?: number;
    minRating: number;
    qty: number;
  },
): Promise<{ trace: TraceStep[]; order: z.infer<typeof orderShape> | null; message: string }> {
  const db = ctx.db<typeof schema>();
  const trace: TraceStep[] = [];
  const stamp = Date.now().toString(36);
  const rand = Math.floor(Math.random() * 1e6).toString(36);
  const ref = `ord_${stamp}${rand}`;
  const idem = `idem_${stamp}_${rand}`;

  const agentRows = await db.select().from(schema.agents).where(eq(schema.agents.id, args.agentId)).limit(1);
  const agent = agentRows[0];
  if (!agent) {
    return { trace, order: null, message: "Agent buyer not found." };
  }

  const allProducts = await db.select().from(schema.products).orderBy(asc(schema.products.id));

  trace.push({
    step: "discover",
    label: "Discover storefront",
    detail: `GET /.well-known/agent-manifest → 200 · ${allProducts.length} products · protocols: https-json, mcp-tools, llms.txt`,
    ok: true,
  });
  trace.push({
    step: "manifest",
    label: "Read manifest & tools",
    detail: "Tools available: search_products, get_product, check_policy, checkout, get_receipt. No HTML parsed, no clicks simulated.",
    ok: true,
  });

  /* ---- choose a product ---- */
  let chosen: typeof schema.products.$inferSelect | undefined;

  if (args.mode === "direct" && args.productId != null) {
    chosen = allProducts.find((p) => p.id === args.productId);
    trace.push({
      step: "fetch",
      label: "Fetch product record",
      detail: chosen
        ? `get_product(sku="${chosen.sku}") → ${chosen.name} · ${money(chosen.priceCents)} / ${chosen.unit} · rating ${chosen.rating} · ${chosen.stock} in stock`
        : `get_product(id=${args.productId}) → not found`,
      ok: !!chosen,
    });
    if (!chosen) {
      const inserted = await db.insert(schema.orders).values({
        ref, agentId: agent.id, agentName: agent.name, productId: null,
        productName: "(unknown product)", qty: args.qty, unitPriceCents: 0, totalCents: 0,
        status: "rejected", reason: "Product not found.", idempotencyKey: idem,
        trace: JSON.stringify(trace),
      }).returning();
      const row = inserted[0];
      return { trace, order: row ? orderOut(row) : null, message: "Product not found — order rejected and logged." };
    }
  } else {
    const category = args.category ?? "all";
    const candidates = allProducts.filter((p) =>
      (category === "all" || p.category === category) &&
      (args.maxPriceCents == null || p.priceCents <= args.maxPriceCents) &&
      p.rating >= args.minRating &&
      p.stock >= args.qty,
    );
    trace.push({
      step: "search",
      label: "Search catalog",
      detail: `search_products(category="${category}"${args.maxPriceCents != null ? `, max_price=${money(args.maxPriceCents)}` : ""}, min_rating=${args.minRating}) → ${candidates.length} candidate${candidates.length === 1 ? "" : "s"}`,
      ok: candidates.length > 0,
    });
    if (candidates.length === 0) {
      trace.push({
        step: "compare",
        label: "Compare candidates",
        detail: "No product satisfies the mission constraints. The agent stops here — no human-style browsing fallback.",
        ok: false,
      });
      const inserted = await db.insert(schema.orders).values({
        ref, agentId: agent.id, agentName: agent.name, productId: null,
        productName: "(no match)", qty: args.qty, unitPriceCents: 0, totalCents: 0,
        status: "rejected", reason: "No catalog product matched the mission constraints.", idempotencyKey: idem,
        trace: JSON.stringify(trace),
      }).returning();
      const row = inserted[0];
      return { trace, order: row ? orderOut(row) : null, message: "No match — the agent stopped instead of guessing. Loosen the constraints and run again." };
    }
    const ranked = [...candidates].sort((a, b) => b.rating - a.rating || a.priceCents - b.priceCents || a.latencyMs - b.latencyMs);
    chosen = ranked[0];
    const considered = ranked.slice(0, 3).map((p) => `${p.name} (${p.rating}★, ${money(p.priceCents)})`).join(" · ");
    trace.push({
      step: "compare",
      label: "Compare & rank",
      detail: `Ranked by rating, then price, then latency. Considered: ${considered}. Winner: ${chosen?.name ?? ""}.`,
      ok: true,
    });
  }

  if (!chosen) {
    return { trace, order: null, message: "Could not select a product." };
  }

  /* ---- policy checks ---- */
  const total = chosen.priceCents * args.qty;
  const remaining = agent.budgetCents - agent.spentCents;
  const allowed = agent.allowedCategories.trim().toLowerCase();
  const categoryAllowed = allowed === "all" || allowed.split(",").map((s) => s.trim().toLowerCase()).includes(chosen.category.toLowerCase());

  const failures: string[] = [];
  if (!categoryAllowed) failures.push(`category "${chosen.category}" is outside this agent's mandate (${agent.allowedCategories})`);
  if (total > agent.maxOrderCents) failures.push(`total ${money(total)} exceeds the per-order cap of ${money(agent.maxOrderCents)}`);
  if (total > remaining) failures.push(`total ${money(total)} exceeds remaining budget ${money(remaining)}`);
  if (chosen.stock < args.qty) failures.push(`only ${chosen.stock} in stock, ${args.qty} requested`);

  trace.push({
    step: "policy",
    label: "Policy & budget check",
    detail: failures.length === 0
      ? `check_policy(agent="${agent.name}", total=${money(total)}) → within mandate, under the ${money(agent.maxOrderCents)} per-order cap, ${money(remaining)} budget remaining.`
      : `check_policy → BLOCKED: ${failures.join("; ")}.`,
    ok: failures.length === 0,
  });

  if (failures.length > 0) {
    const inserted = await db.insert(schema.orders).values({
      ref, agentId: agent.id, agentName: agent.name, productId: chosen.id,
      productName: chosen.name, qty: args.qty, unitPriceCents: chosen.priceCents, totalCents: total,
      status: "rejected", reason: failures.join("; "), idempotencyKey: idem,
      trace: JSON.stringify(trace),
    }).returning();
    const row = inserted[0];
    return { trace, order: row ? orderOut(row) : null, message: `Policy blocked the purchase: ${failures.join("; ")}.` };
  }

  /* ---- pay & fulfil ---- */
  trace.push({
    step: "pay",
    label: "Checkout & pay",
    detail: `checkout(sku="${chosen.sku}", qty=${args.qty}, idempotency_key="${idem}") → payment authorised against the agent's wallet mandate.`,
    ok: true,
  });

  await db.update(schema.products).set({ stock: chosen.stock - args.qty }).where(eq(schema.products.id, chosen.id));
  await db.update(schema.agents).set({ spentCents: agent.spentCents + total }).where(eq(schema.agents.id, agent.id));

  trace.push({
    step: "receipt",
    label: "Receipt issued",
    detail: `get_receipt(ref="${ref}") → ${args.qty} × ${chosen.name} @ ${money(chosen.priceCents)} = ${money(total)}. Delivery: item reserved from store stock and dispatched to the agent's principal. Stock now ${chosen.stock - args.qty}.`,
    ok: true,
  });

  const inserted = await db.insert(schema.orders).values({
    ref, agentId: agent.id, agentName: agent.name, productId: chosen.id,
    productName: chosen.name, qty: args.qty, unitPriceCents: chosen.priceCents, totalCents: total,
    status: "completed", reason: "", idempotencyKey: idem,
    trace: JSON.stringify(trace),
  }).returning();
  const row = inserted[0];
  ctx.invalidateQueries();
  return { trace, order: row ? orderOut(row) : null, message: `Purchase complete — ${money(total)} for ${args.qty} × ${chosen.name}, bought by ${agent.name} with zero human UI involved.` };
}

/* ------------------------------ actions ------------------------------ */

export const Actions = {
  getState: defineAction({
    description: "Returns the full prototype state: catalog products, agent buyers, order ledger, and principle checks.",
    request: z.object({}),
    response: z.object({
      products: z.array(productShape),
      agents: z.array(agentShape),
      orders: z.array(orderShape),
      checks: z.record(z.string(), z.boolean()),
    }),
    async handler(ctx) {
      const db = ctx.db<typeof schema>();
      const [products, agents, orders, checkRows] = await Promise.all([
        db.select().from(schema.products).orderBy(asc(schema.products.category), asc(schema.products.priceCents)),
        db.select().from(schema.agents).orderBy(asc(schema.agents.id)),
        db.select().from(schema.orders).orderBy(desc(schema.orders.id)).limit(50),
        db.select().from(schema.checks),
      ]);
      const checks: Record<string, boolean> = {};
      for (const row of checkRows) checks[row.key] = row.checked === 1;
      return {
        products: products.map(productOut),
        agents: agents.map(agentOut),
        orders: orders.map(orderOut),
        checks,
      };
    },
  }),

  loadCoachCatalog: defineAction({
    description: "Replaces the current catalog with the Coach product range: clears products, agent buyers and the order ledger, then loads the Coach products and three shopper agents with budgets and mandates.",
    request: z.object({}),
    response: z.object({ products_added: z.number(), agents_added: z.number() }),
    async handler(ctx) {
      const db = ctx.db<typeof schema>();
      await db.delete(schema.orders);
      await db.delete(schema.products);
      await db.delete(schema.agents);
      let productsAdded = 0;
      let agentsAdded = 0;
      for (const p of CATALOG) {
        await db.insert(schema.products).values(p);
        productsAdded++;
      }
      for (const a of STARTER_AGENTS) {
        await db.insert(schema.agents).values({ ...a, spentCents: 0 });
        agentsAdded++;
      }
      ctx.invalidateQueries();
      return { products_added: productsAdded, agents_added: agentsAdded };
    },
  }),

  seedCatalog: defineAction({
    description: "Loads the Coach product catalog and three starter agent buyers, only if those tables are empty.",
    request: z.object({}),
    response: z.object({ products_added: z.number(), agents_added: z.number() }),
    async handler(ctx) {
      const db = ctx.db<typeof schema>();
      const existingProducts = await db.select().from(schema.products).limit(1);
      const existingAgents = await db.select().from(schema.agents).limit(1);
      let productsAdded = 0;
      let agentsAdded = 0;
      if (existingProducts.length === 0) {
        for (const p of CATALOG) {
          await db.insert(schema.products).values(p);
          productsAdded++;
        }
      }
      if (existingAgents.length === 0) {
        for (const a of STARTER_AGENTS) {
          await db.insert(schema.agents).values({ ...a, spentCents: 0 });
          agentsAdded++;
        }
      }
      ctx.invalidateQueries();
      return { products_added: productsAdded, agents_added: agentsAdded };
    },
  }),

  addProduct: defineAction({
    description: "Adds a product to the agent-facing catalog.",
    request: z.object({
      name: z.string().min(1).max(120),
      category: z.string().min(1).max(60),
      description: z.string().min(1).max(400),
      price_cents: z.number().int().min(1).max(100_000_000),
      unit: z.string().min(1).max(40),
      latency_ms: z.number().int().min(1).max(600_000),
      sla_pct: z.number().min(90).max(100),
      rating: z.number().min(1).max(5),
      stock: z.number().int().min(0).max(1_000_000),
      seller: z.string().min(1).max(80),
    }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const sku = args.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) + "-" + Date.now().toString(36);
      const result = await db.insert(schema.products).values({
        sku, name: args.name, category: args.category, description: args.description,
        priceCents: args.price_cents, unit: args.unit, latencyMs: args.latency_ms,
        slaPct: args.sla_pct, rating: args.rating, stock: args.stock, seller: args.seller,
      }).returning({ id: schema.products.id });
      const row = result[0];
      if (!row) throw new Error("addProduct: insert returned no rows");
      ctx.invalidateQueries();
      return { id: row.id };
    },
  }),

  deleteProduct: defineAction({
    description: "Removes a product from the catalog.",
    request: z.object({ id: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      await db.delete(schema.products).where(eq(schema.products.id, args.id));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  addAgent: defineAction({
    description: "Creates an agent buyer with a budget, a per-order cap, and a category mandate.",
    request: z.object({
      name: z.string().min(1).max(80),
      purpose: z.string().min(1).max(200),
      budget_cents: z.number().int().min(100).max(100_000_000),
      max_order_cents: z.number().int().min(1).max(100_000_000),
      allowed_categories: z.string().min(1).max(200),
    }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const result = await db.insert(schema.agents).values({
        name: args.name, purpose: args.purpose, budgetCents: args.budget_cents,
        spentCents: 0, maxOrderCents: args.max_order_cents, allowedCategories: args.allowed_categories,
      }).returning({ id: schema.agents.id });
      const row = result[0];
      if (!row) throw new Error("addAgent: insert returned no rows");
      ctx.invalidateQueries();
      return { id: row.id };
    },
  }),

  deleteAgent: defineAction({
    description: "Removes an agent buyer. Past orders keep the agent's name as recorded at purchase time.",
    request: z.object({ id: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      await db.delete(schema.agents).where(eq(schema.agents.id, args.id));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  runTransaction: defineAction({
    description: "Runs a full agent purchase mission: discover, search, compare, policy-check, pay, and receipt — persisting the resulting order.",
    request: z.object({
      agent_id: z.number().int().positive(),
      category: z.string().min(1).max(60),
      max_price_cents: z.number().int().positive().max(100_000_000).nullable(),
      min_rating: z.number().min(1).max(5),
      qty: z.number().int().min(1).max(1000),
    }),
    response: z.object({
      trace: z.array(traceStep),
      order: orderShape.nullable(),
      message: z.string(),
    }),
    async handler(ctx, args) {
      return executePurchase(ctx, {
        agentId: args.agent_id,
        mode: "mission",
        category: args.category,
        maxPriceCents: args.max_price_cents ?? undefined,
        minRating: args.min_rating,
        qty: args.qty,
      });
    },
  }),

  buyProduct: defineAction({
    description: "Buys one specific catalog product for an agent buyer, with the same policy checks and a persisted order.",
    request: z.object({
      agent_id: z.number().int().positive(),
      product_id: z.number().int().positive(),
      qty: z.number().int().min(1).max(1000),
    }),
    response: z.object({
      trace: z.array(traceStep),
      order: orderShape.nullable(),
      message: z.string(),
    }),
    async handler(ctx, args) {
      return executePurchase(ctx, {
        agentId: args.agent_id,
        mode: "direct",
        productId: args.product_id,
        minRating: 1,
        qty: args.qty,
      });
    },
  }),

  getSurface: defineAction({
    description: "Generates the machine-readable surface — agent manifest JSON, llms.txt, and the tool list — live from the current catalog.",
    request: z.object({}),
    response: z.object({
      manifest_json: z.string(),
      llms_txt: z.string(),
      tools: z.array(z.object({ name: z.string(), description: z.string(), input: z.string() })),
    }),
    async handler(ctx) {
      const db = ctx.db<typeof schema>();
      const products = await db.select().from(schema.products).orderBy(asc(schema.products.category), asc(schema.products.priceCents));
      const categories = [...new Set(products.map((p) => p.category))];
      const manifest = {
        name: "Coach — Agent-First Storefront (prototype)",
        version: "0.2.0",
        buyer: "ai-agent",
        brand: "Coach",
        protocols: ["https-json", "mcp-tools", "llms.txt"],
        discovery: "/.well-known/agent-manifest",
        tools: ["search_products", "get_product", "check_policy", "checkout", "get_receipt"],
        payment: { rails: ["agent-wallet-mandate"], idempotency: "required", currency: "USD" },
        catalog: { products: products.length, categories },
        policy: "Every checkout is checked against the buying agent's mandate: allowed categories, per-order cap, remaining budget.",
      };
      const lines = [
        "# Coach — Agent-First Storefront (prototype)",
        "",
        "> The Coach catalog, published for AI agents. Everything below is the whole interface: no pages to render, no buttons to find.",
        "",
        "## How to buy",
        "1. GET /.well-known/agent-manifest — capabilities, tools, payment rails.",
        "2. search_products(category, max_price, min_rating) — ranked, structured results.",
        "3. check_policy(agent, total) — mandate, per-order cap, budget.",
        "4. checkout(sku, qty, idempotency_key) — payment + provisioning in one call.",
        "5. get_receipt(ref) — the durable record of the transaction.",
        "",
        "## Catalog",
        ...products.map((p) => `- ${p.name} [${p.category}] — ${money(p.priceCents)} / ${p.unit} · rating ${p.rating} · SLA ${p.slaPct}% · sku:${p.sku} · seller:${p.seller}`),
      ];
      return {
        manifest_json: JSON.stringify(manifest, null, 2),
        llms_txt: lines.join("\n"),
        tools: [
          { name: "search_products", description: "Search the catalog by category, max price, and minimum rating. Returns ranked structured records — never HTML.", input: "{ category?: string, max_price_cents?: number, min_rating?: number }" },
          { name: "get_product", description: "Fetch one product's full machine-readable record by SKU: price, unit, latency, SLA, live stock.", input: "{ sku: string }" },
          { name: "check_policy", description: "Dry-run a purchase against the buying agent's mandate before any money moves.", input: "{ agent_id: number, sku: string, qty: number }" },
          { name: "checkout", description: "Pay and provision in a single call. Idempotency key required; safe to retry.", input: "{ agent_id: number, sku: string, qty: number, idempotency_key: string }" },
          { name: "get_receipt", description: "Retrieve the durable receipt for a completed or rejected order.", input: "{ ref: string }" },
        ],
      };
    },
  }),

  toggleCheck: defineAction({
    description: "Sets one design-principle checklist item on or off.",
    request: z.object({ key: z.string().min(1).max(80), checked: z.boolean() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      const existing = await db.select().from(schema.checks).where(eq(schema.checks.key, args.key)).limit(1);
      if (existing.length === 0) {
        await db.insert(schema.checks).values({ key: args.key, checked: args.checked ? 1 : 0 });
      } else {
        await db.update(schema.checks).set({ checked: args.checked ? 1 : 0 }).where(eq(schema.checks.key, args.key));
      }
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),
} satisfies ActionsModule;
