import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import * as schema from "./schema";

let dbInstance: any = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), "app.db");
  const sqlite = new Database(dbPath);

  // Enable WAL mode for high performance
  sqlite.pragma("journal_mode = WAL");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      unit TEXT NOT NULL,
      latency_ms INTEGER NOT NULL,
      sla_pct REAL NOT NULL,
      rating REAL NOT NULL,
      stock INTEGER NOT NULL,
      seller TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      purpose TEXT NOT NULL,
      budget_cents INTEGER NOT NULL,
      spent_cents INTEGER NOT NULL DEFAULT 0,
      max_order_cents INTEGER NOT NULL,
      allowed_categories TEXT NOT NULL DEFAULT 'all',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref TEXT NOT NULL,
      agent_id INTEGER NOT NULL,
      agent_name TEXT NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      total_cents INTEGER NOT NULL,
      status TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      idempotency_key TEXT NOT NULL,
      trace TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS checks (
      key TEXT PRIMARY KEY,
      checked INTEGER NOT NULL DEFAULT 0
    );
  `);

  dbInstance = drizzle(sqlite, { schema });
  return dbInstance;
}

export function createServerContext() {
  const db = getDb();
  return {
    db: () => db,
    invalidateQueries: () => {},
  };
}
