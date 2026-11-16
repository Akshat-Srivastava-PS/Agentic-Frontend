import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  priceCents: integer("price_cents").notNull(),
  unit: text("unit").notNull(),
  latencyMs: integer("latency_ms").notNull(),
  slaPct: real("sla_pct").notNull(),
  rating: real("rating").notNull(),
  stock: integer("stock").notNull(),
  seller: text("seller").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  purpose: text("purpose").notNull(),
  budgetCents: integer("budget_cents").notNull(),
  spentCents: integer("spent_cents").notNull().default(0),
  maxOrderCents: integer("max_order_cents").notNull(),
  allowedCategories: text("allowed_categories").notNull().default("all"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ref: text("ref").notNull(),
  agentId: integer("agent_id").notNull(),
  agentName: text("agent_name").notNull(),
  productId: integer("product_id"),
  productName: text("product_name").notNull(),
  qty: integer("qty").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  status: text("status", { enum: ["completed", "rejected"] }).notNull(),
  reason: text("reason").notNull().default(""),
  idempotencyKey: text("idempotency_key").notNull(),
  trace: text("trace").notNull().default("[]"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const checks = sqliteTable("checks", {
  key: text("key").primaryKey(),
  checked: integer("checked").notNull().default(0),
});
