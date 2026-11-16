# Agent-First Frontend

> **The storefront is an API. The human view is just the console.**

Most websites today are designed for human eyes and mouse clicks. When AI agents visit them, they are forced to brute-force fragile HTML, navigate bloated client-side SPAs, crack infinite scrolls, and guess button intents.

This project is a working prototype of an **Agent-First Frontend**:
- The **machine-readable surface** (Manifest, JSON feeds, and typed tools) is the primary product interface.
- The **human interface** is an observer console where developers and observers can watch agents shop in real-time.
- The demo shelves currently stock **real Coach products** (Tabby, Brooklyn, Empire, Chelsea, Kisslock, Plaza) at verified US prices, bought autonomously by software agents holding budget mandates.

---

## The 7-Rung Ladder: From Blocked to Generative

From our research into agent web interaction, the web exists on a 7-rung capability ladder:

| Rung | Stage | Description |
|:---:|:---|:---|
| **1** | **Blocked** | Bot walls, CAPTCHAs, and auth gates turn agents away at the door. |
| **2** | **Scrapeable** | Agents brute-force raw human HTML. Layout changes break automation constantly. |
| **3** | **Readable** | Clean semantic markup, `llms.txt`, and structured metadata allow agents to comprehend the page. |
| **4** | **Addressable** | Every item and action has a stable ID and a URL an agent can call directly. |
| **5** | **Actionable** | Machine-to-machine tools and APIs (MCP, WebMCP) let agents perform actions, not just read. |
| **6** | **Transactable** | **(This Prototype)** Agents hold wallet mandates, enforce budgets, pass policy checks, execute payments, and receive durable receipts. |
| **7** | **Generative** | The interface assembles itself dynamically per agent, per task, at request time. |

---

## 12 Design Principles of Agent-First Systems

1. **Manifest before markup**: Publish `/.well-known/agent-manifest` so discovery never begins by scraping HTML.
2. **Stable IDs for everything**: Every product, action, and order has a deterministic ID that survives redesigns.
3. **Structured in, structured out**: Strict JSON records with typed fields (price, unit, SLA, live stock) — never prose an agent must parse.
4. **Nothing visual-only**: If a human learns it from visual styling or photography (dimensions, materials, compatibility), an agent field must state it too.
5. **Idempotent checkout**: Retries are normal for agents; idempotency keys make them safe.
6. **Policy before payment**: Mandates, caps, and remaining budgets are validated in dry-run checks before money moves.
7. **Fail explicitly, never vaguely**: A rejected order details the exact constraint that failed — no silent dead ends.
8. **Receipts as data**: Every transaction returns a durable, queryable receipt an agent can audit later.
9. **Paginated, not infinite**: Deterministic pages with cursors; infinite scroll is where agent tasks fail.
10. **Auth built for agents**: Scoped tokens and delegated mandates instead of human login forms and OTPs.
11. **A latency budget**: Endpoints publish and respect p50 latency targets so agent chains don't timeout.
12. **Human UI optional**: The human view is an observer console. The product functions with it turned off.

---

## Features & Capabilities

- **Live Autonomous Mission Runner**: Assign a mission (e.g., "Find a bag with rating >= 4.5 under $500") to an agent. Watch the live step-by-step trace as it executes discovery, catalog search, candidate ranking, policy check, payment, and receipt generation.
- **Dual-Mode Catalog**: Toggle between:
  - **Human View**: Full visual showcase with product photos, descriptions, ratings, SLA percentages, and live inventory.
  - **Agent View**: The exact raw structured JSON feed consumed by software agents.
- **Agent Buyer Mandates**: Agent profiles (`Gift Concierge`, `Personal Shopper`, `Accessories Scout`) with custom spending caps, category restrictions, and live budget tracking.
- **Immutable Transaction Ledger**: Complete history of completed and rejected orders, each with a replayable audit trace.
- **Interactive Readiness Checklist**: Dynamic 12-principle scorecard calculating system compliance in real time.

---

## Machine-Readable Endpoints

The server exposes dedicated machine-readable endpoints:

| Endpoint | Method | Format | Description |
|:---|:---:|:---:|:---|
| `/.well-known/agent-manifest` | `GET` | JSON | Discovery manifest: tools, protocols, payment rails, and catalog metadata. |
| `/llms.txt` | `GET` | Text | Markdown/text representation designed for language model context windows. |
| `/catalog.json` | `GET` | JSON | Real-time structured catalog feed with stock, latency p50, and SLAs. |
| `/actions` | `POST` | JSON | Typed RPC endpoint powering all buyer interactions and policy dry-runs. |

---

## Tech Stack

- **Frontend**: [React 19](https://react.dev/), [Vite 6](https://vitejs.dev/), [TanStack Query 5](https://tanstack.com/query)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/), IBM Plex Mono typography
- **Backend & RPC**: Node.js HTTP server + Vite API middleware
- **Database & ORM**: SQLite ([better-sqlite3](https://github.com/WiseLibs/better-sqlite3) with WAL mode) + [Drizzle ORM](https://orm.drizzle.team/)
- **Validation**: [Zod](https://zod.dev/)

---

## Getting Started

### Prerequisites
- Node.js 20+ installed
- npm or pnpm

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/Akshat-Srivastava-PS/Agentic-Frontend.git
cd Agentic-Frontend
npm install
```

### 2. Development Mode
Start the Vite development server with hot-module replacement and live API endpoints:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 3. Production Build & Run
Build the optimized static assets and server bundle:
```bash
npm run build
npm start
```
The server will bind to port `3000` (or `process.env.PORT`).

---

## Project Structure

```text
├── client/                     # React 19 Frontend
│   ├── src/
│   │   ├── assets/             # Product photography & media
│   │   ├── App.tsx             # Main observer console & UI sections
│   │   ├── api.ts              # Typed RPC proxy client
│   │   ├── main.tsx            # Root DOM rendering & React Query provider
│   │   └── theme.css           # Tailwind v4 theme & typography
│   └── index.html              # HTML entrypoint
├── server/                     # Backend & Data Engine
│   └── src/
│       ├── actions.ts          # Business logic: missions, policy checks, orders
│       ├── schema.ts           # Drizzle ORM SQLite database schema
│       ├── db.ts               # Database connection & table bootstrapping
│       ├── serve.ts            # Production HTTP server & endpoint routing
│       └── test-actions.ts     # Action engine validation test
├── packages/
│   └── space-sdk/              # Reusable agent RPC & client utilities
├── drizzle/                    # SQL schema definitions & migrations
├── vite.config.ts              # Vite configuration & dev API middleware
└── README.md                   # Documentation
```

---

## License

MIT © 2026 Akshat Srivastava
