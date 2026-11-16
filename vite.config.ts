import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { Actions } from "./server/src/actions";
import { createServerContext } from "./server/src/db";

function agentFirstApiPlugin(): Plugin {
  return {
    name: "agent-first-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];

        // 1. Agent Manifest: /.well-known/agent-manifest
        if (req.method === "GET" && url === "/.well-known/agent-manifest") {
          try {
            const ctx = createServerContext();
            const surface = await Actions.getSurface.handler(ctx, {});
            res.setHeader("Content-Type", "application/json");
            res.end(surface.manifest_json);
            return;
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
        }

        // 2. llms.txt
        if (req.method === "GET" && url === "/llms.txt") {
          try {
            const ctx = createServerContext();
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
            const ctx = createServerContext();
            const state = await Actions.getState.handler(ctx, {});
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(state.products, null, 2));
            return;
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
        }

        // 4. Server Actions RPC: /actions
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

              const ctx = createServerContext();
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

        next();
      });
    },
  };
}

export default defineConfig({
  root: "client",
  plugins: [
    tailwindcss(),
    react(),
    agentFirstApiPlugin(),
  ],
  resolve: {
    alias: {
      "@hatch/space-sdk/client": path.resolve(__dirname, "packages/space-sdk/src/client.tsx"),
      "@hatch/space-sdk": path.resolve(__dirname, "packages/space-sdk/src/index.ts"),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
