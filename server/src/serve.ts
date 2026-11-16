import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { Actions } from "./actions";
import { createServerContext } from "./db";

const PORT = parseInt(process.env.PORT || "3000", 10);
const DIST_DIR = path.resolve(process.cwd(), "dist");

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

// Seed database on startup if empty
const ctx = createServerContext();
Actions.seedCatalog.handler(ctx, {}).then((res) => {
  if (res.products_added > 0) {
    console.log(`[Storefront] Initialized database: loaded ${res.products_added} Coach products and ${res.agents_added} starter agents.`);
  } else {
    console.log(`[Storefront] Connected to database: catalog already seeded.`);
  }
}).catch((err) => {
  console.error("[Storefront] Error during startup seed:", err);
});

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const rawUrl = req.url || "/";
  const url = rawUrl.split("?")[0];

  // 1. Agent Manifest: /.well-known/agent-manifest
  if (req.method === "GET" && url === "/.well-known/agent-manifest") {
    try {
      const surface = await Actions.getSurface.handler(ctx, {});
      res.setHeader("Content-Type", "application/json");
      res.end(surface.manifest_json);
      return;
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // 2. llms.txt
  if (req.method === "GET" && url === "/llms.txt") {
    try {
      const surface = await Actions.getSurface.handler(ctx, {});
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(surface.llms_txt);
      return;
    } catch (err: any) {
      res.statusCode = 500;
      res.end(String(err.message));
      return;
    }
  }

  // 3. Catalog JSON: /catalog.json
  if (req.method === "GET" && url === "/catalog.json") {
    try {
      const state = await Actions.getState.handler(ctx, {});
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(state.products, null, 2));
      return;
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // 4. Server Actions RPC: /actions and /api/actions
  if (req.method === "POST" && (url === "/actions" || url === "/api/actions")) {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      try {
        const { action, args } = JSON.parse(body || "{}");
        const actionDef = Actions[action as keyof typeof Actions];
        if (!actionDef) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: `Action '${action}' not found` }));
          return;
        }

        const parsedArgs = actionDef.request.parse(args ?? {});
        const result = await actionDef.handler(ctx, parsedArgs);

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
      } catch (err: any) {
        console.error("Action error:", err);
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: err.message || "Action failed" }));
      }
    });
    return;
  }

  // 5. Static file serving from dist/
  if (req.method === "GET" || req.method === "HEAD") {
    let filePath = path.join(DIST_DIR, url === "/" ? "index.html" : url);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, "index.html");
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] || "application/octet-stream";
      res.setHeader("Content-Type", mime);
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  res.statusCode = 404;
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  Agent-First Storefront running at:`);
  console.log(`  ▶ http://localhost:${PORT}`);
  console.log(`  Agent endpoints:`);
  console.log(`  ▶ Manifest: http://localhost:${PORT}/.well-known/agent-manifest`);
  console.log(`  ▶ LLMs:     http://localhost:${PORT}/llms.txt`);
  console.log(`  ▶ Catalog:  http://localhost:${PORT}/catalog.json`);
  console.log(`======================================================\n`);
});
