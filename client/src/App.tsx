import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaTopScrim } from "@hatch/space-sdk/client";
import { api, type ApiResponse } from "./api";
import imgTabby26 from "./assets/coach-tabby-26.jpg";
import imgTabbyPillow from "./assets/coach-tabby-pillow.jpg";
import imgBrooklyn28 from "./assets/coach-brooklyn-28.jpg";
import imgEmpire from "./assets/coach-empire.jpg";
import imgChelsea from "./assets/coach-chelsea.jpg";
import imgKisslock from "./assets/coach-kisslock.jpg";
import imgPlaza18 from "./assets/coach-plaza-18.jpg";
import imgBowling from "./assets/coach-bowling.jpg";
import imgWristlet from "./assets/coach-wristlet.jpg";

/* Product photos for the Coach catalog, keyed by SKU. Products added
   later through the form simply render without a photo. */
const PRODUCT_IMAGES: Record<string, string> = {
  "coach-tabby-26": imgTabby26,
  "coach-tabby-pillow-26": imgTabbyPillow,
  "coach-brooklyn-28": imgBrooklyn28,
  "coach-empire-34": imgEmpire,
  "coach-chelsea-26": imgChelsea,
  "coach-kisslock-frame": imgKisslock,
  "coach-plaza-18": imgPlaza18,
  "coach-bowling-small": imgBowling,
  "coach-essential-wristlet": imgWristlet,
};

type State = ApiResponse<typeof api, "getState">;
type Product = State["products"][number];
type Agent = State["agents"][number];
type Order = State["orders"][number];
type Surface = ApiResponse<typeof api, "getSurface">;
type TxResult = ApiResponse<typeof api, "runTransaction">;

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const RUNGS = [
  { n: 1, name: "Blocked", desc: "Bot walls, CAPTCHAs and auth gates stop agents at the door." },
  { n: 2, name: "Scrapeable", desc: "Agents brute-force the human HTML and fail often — layout changes break everything." },
  { n: 3, name: "Readable", desc: "Clean semantic markup, llms.txt, structured data. Agents can understand the page." },
  { n: 4, name: "Addressable", desc: "Every item and action has a stable ID and a URL an agent can call directly." },
  { n: 5, name: "Actionable", desc: "Tools and APIs (MCP, WebMCP) let agents act, not just read." },
  { n: 6, name: "Transactable", desc: "Agents hold a mandate and a wallet, pass policy checks, pay, and get receipts. ← this prototype", here: true },
  { n: 7, name: "Generative", desc: "The interface assembles itself per agent, per task, at request time." },
];

const PRINCIPLES: { key: string; title: string; desc: string }[] = [
  { key: "manifest-first", title: "Manifest before markup", desc: "Publish /.well-known/agent-manifest so discovery never starts with rendering a page." },
  { key: "stable-ids", title: "Stable IDs for everything", desc: "Every product, action and order has an ID that survives redesigns." },
  { key: "structured-only", title: "Structured in, structured out", desc: "JSON records with typed fields — price, unit, SLA, stock — never prose an agent must parse." },
  { key: "no-visual-only", title: "Nothing visual-only", desc: "If a human learns it from layout, colour or an image, an agent field must say it too." },
  { key: "idempotent-checkout", title: "Idempotent checkout", desc: "Retries are normal for agents; an idempotency key makes them safe." },
  { key: "policy-before-pay", title: "Policy before payment", desc: "Mandate, caps and budget are checked in a dry-run call before money moves." },
  { key: "explicit-failure", title: "Fail explicitly, never vaguely", desc: "A rejected order states the exact constraint that failed — no silent dead ends." },
  { key: "receipts", title: "Receipts as data", desc: "Every transaction returns a durable, queryable receipt an agent can audit later." },
  { key: "no-infinite-scroll", title: "Paginated, not infinite", desc: "Deterministic pages with cursors; infinite scroll is where agent tasks go to die." },
  { key: "auth-for-agents", title: "Auth built for agents", desc: "Scoped tokens and delegated mandates instead of human login forms and OTPs." },
  { key: "latency-budget", title: "A latency budget", desc: "Agents chain dozens of calls; every endpoint publishes and respects a p50 target." },
  { key: "human-optional", title: "Human UI optional", desc: "The human view is an observer console. The product works with it switched off." },
];

export function App() {
  const queryClient = useQueryClient();
  const state = useQuery({ queryKey: ["state"], queryFn: () => api.getState({}) });
  const surface = useQuery({ queryKey: ["surface"], queryFn: () => api.getSurface({}) });

  const products = state.data?.products ?? [];
  const agents = state.data?.agents ?? [];
  const orders = state.data?.orders ?? [];
  const checks = state.data?.checks ?? {};

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);
  const completed = orders.filter((o) => o.status === "completed");
  const volume = completed.reduce((s, o) => s + o.total_cents, 0);
  const checkedCount = PRINCIPLES.filter((p) => checks[p.key]).length;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["state"] });
    void queryClient.invalidateQueries({ queryKey: ["surface"] });
  };

  const seed = useMutation({ mutationFn: () => api.seedCatalog({}), onSuccess: invalidate });
  const [externalTx, setExternalTx] = useState<TxResult | null>(null);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <SafeAreaTopScrim backgroundColor="var(--bg)" />
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        {/* ---------- Thesis ---------- */}
        <section className="border-b-2 border-[var(--text)] pb-8 pt-8">
          <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--accent-ink)]">
            A working prototype · the buyer is an agent
          </p>
          <h1 className="mono mt-3 text-3xl font-semibold leading-tight sm:text-5xl">
            The storefront is an API.<br />The human view is just the console.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--dim)]">
            Most sites are built for eyes and mice, and agents brute-force their way through them.
            This prototype inverts that: an agent discovers the store from a manifest, searches a
            structured catalog, passes a policy check against its own mandate and budget, pays, and
            gets a receipt — end to end, below, with real orders saved to the ledger. You watch. The
            agent shops. The shelves currently stock Coach: nine real bags and small leather goods
            at their US coach.com prices.
          </p>
          <div className="mono mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--border)] text-center sm:grid-cols-4">
            <Stat label="Products in catalog" value={String(products.length)} />
            <Stat label="Agent buyers" value={String(agents.length)} />
            <Stat label="Orders completed" value={String(completed.length)} />
            <Stat label="Agent spend" value={money(volume)} />
          </div>
          <p className="mt-3 text-xs text-[var(--dim)]">
            From the project research brief: bots now account for more web traffic than humans, and
            agents succeed at roughly 58% of multi-step web tasks versus 78% for humans — failing
            mostly on JS-heavy pages, bot walls, unlabeled controls, infinite scroll and auth walls.
            The gap isn't readability. It's addressability.
          </p>
        </section>

        {state.isPending ? (
          <p className="py-12 text-center text-sm text-[var(--dim)]">Loading the storefront…</p>
        ) : state.error ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[var(--danger)]">The storefront failed to load.</p>
            <button type="button" onClick={() => void state.refetch()} className="mono mt-3 rounded-[var(--radius)] border border-[var(--border)] px-4 py-2 text-sm">
              Retry
            </button>
          </div>
        ) : products.length === 0 && agents.length === 0 ? (
          <section className="py-12 text-center">
            <h2 className="mono text-xl font-semibold">The shelves are empty</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--dim)]">
              Load the Coach catalog — nine real Coach bags and small leather goods at their US
              coach.com prices (Tabby, Brooklyn, Empire, Kisslock and more) plus three starter
              shopper agents with budgets and mandates. Everything stays editable and deletable
              afterwards.
            </p>
            <button
              type="button"
              disabled={seed.isPending}
              onClick={() => seed.mutate()}
              className="mono mt-5 rounded-[var(--radius)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:text-[#0e120f]"
            >
              {seed.isPending ? "Loading…" : "Load prototype catalog"}
            </button>
            {seed.error ? <p className="mt-3 text-sm text-[var(--danger)]">Loading failed — try again.</p> : null}
          </section>
        ) : (
          <>
            <Console agents={agents} categories={categories} onDone={invalidate} external={externalTx} />
            <Catalog products={products} agents={agents} onDone={invalidate} onBuy={(r) => { setExternalTx(r); invalidate(); }} />
            <Agents agents={agents} categories={categories} onDone={invalidate} />
            <Ledger orders={orders} />
          </>
        )}

        <SurfaceSection surface={surface.data} loading={surface.isPending} />
        <Ladder />
        <Principles checks={checks} checkedCount={checkedCount} />
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--surface)] px-3 py-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-[var(--dim)]">{label}</div>
    </div>
  );
}

function SectionHead({ index, title, sub }: { index: string; title: string; sub: string }) {
  return (
    <div className="mb-5">
      <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--accent-ink)]">{index}</p>
      <h2 className="mono mt-1 text-2xl font-semibold">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-[var(--dim)]">{sub}</p>
    </div>
  );
}

/* ------------------------------ Console ------------------------------ */

function Console({ agents, categories, onDone, external }: { agents: Agent[]; categories: string[]; onDone: () => void; external: TxResult | null }) {
  const [agentId, setAgentId] = useState<number | null>(null);
  const [category, setCategory] = useState("all");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("4.0");
  const [qty, setQty] = useState("1");
  const [result, setResult] = useState<TxResult | null>(null);
  const [visible, setVisible] = useState(0);
  const consoleRef = useRef<HTMLElement | null>(null);

  const selectedAgent = agents.find((a) => a.id === agentId) ?? agents[0];

  const run = useMutation({
    mutationFn: async () => {
      if (!selectedAgent) throw new Error("no agent");
      return api.runTransaction({
        agent_id: selectedAgent.id,
        category,
        max_price_cents: maxPrice.trim() === "" ? null : Math.round(parseFloat(maxPrice) * 100),
        min_rating: parseFloat(minRating),
        qty: Math.max(1, parseInt(qty, 10) || 1),
      });
    },
    onSuccess: (data) => {
      setResult(data);
      setVisible(0);
      onDone();
    },
  });

  useEffect(() => {
    if (!external) return;
    setResult(external);
    setVisible(0);
    consoleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [external]);

  useEffect(() => {
    if (!result) return;
    if (visible >= result.trace.length) return;
    const t = setTimeout(() => setVisible((v) => v + 1), 420);
    return () => clearTimeout(t);
  }, [result, visible]);

  const done = result != null && visible >= result.trace.length;

  return (
    <section ref={consoleRef} className="scroll-mt-4 py-10">
      <SectionHead
        index="01 · Live transaction"
        title="Run an agent purchase"
        sub="Give an agent buyer a mission. It discovers the store, searches, compares, checks its own mandate and budget, pays, and files the receipt — every step executed by the server and saved to the ledger."
      />
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form
          className="h-fit rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5"
          onSubmit={(e: FormEvent) => { e.preventDefault(); run.mutate(); }}
        >
          <label htmlFor="mission-agent" className="mono text-xs uppercase tracking-wider text-[var(--dim)]">Agent buyer</label>
          <select
            id="mission-agent"
            value={selectedAgent?.id ?? ""}
            onChange={(e) => setAgentId(parseInt(e.target.value, 10))}
            className="mono mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name} — {money(a.budget_cents - a.spent_cents)} left</option>
            ))}
          </select>

          <label htmlFor="mission-category" className="mono mt-4 block text-xs uppercase tracking-wider text-[var(--dim)]">Mission: buy</label>
          <select
            id="mission-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mono mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          >
            <option value="all">Any category</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="mission-maxprice" className="mono block text-xs uppercase tracking-wider text-[var(--dim)]">Max $ / unit</label>
              <input
                id="mission-maxprice" inputMode="decimal" placeholder="Any"
                value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
                className="mono mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="mission-rating" className="mono block text-xs uppercase tracking-wider text-[var(--dim)]">Min rating</label>
              <select
                id="mission-rating" value={minRating} onChange={(e) => setMinRating(e.target.value)}
                className="mono mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              >
                {["1.0", "3.0", "4.0", "4.5", "4.7"].map((r) => <option key={r} value={r}>{r}★</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="mission-qty" className="mono block text-xs uppercase tracking-wider text-[var(--dim)]">Qty</label>
              <input
                id="mission-qty" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)}
                className="mono mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            type="submit" disabled={run.isPending || agents.length === 0}
            className="mono mt-5 w-full rounded-[var(--radius)] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:text-[#0e120f]"
          >
            {run.isPending ? "Agent is shopping…" : "▶ Run transaction"}
          </button>
          {run.error ? <p className="mt-3 text-sm text-[var(--danger)]">The run failed — try again.</p> : null}
          <p className="mt-3 text-xs leading-relaxed text-[var(--dim)]">
            Try a mission the policy should block: Accessories Scout buying a shoulder bag (outside
            its mandate), or a max price below everything in a category. Blocked purchases are
            logged too — with the exact reason.
          </p>
        </form>

        <div className="min-h-[320px] rounded-[var(--radius)] border border-[var(--border)] bg-[#101511] p-5 text-[#d7e0d2]">
          <div className="mono flex items-center gap-2 text-xs uppercase tracking-wider text-[#8fa58c]">
            <span className={`live-dot inline-block h-2 w-2 rounded-full ${result && !done ? "bg-[#2fbf71]" : "bg-[#5c665c]"}`} />
            Agent trace {selectedAgent ? `· ${selectedAgent.name}` : ""}
          </div>
          {!result && !run.isPending ? (
            <p className="mono mt-6 text-sm leading-relaxed text-[#8fa58c]">
              No run yet. The trace will appear here step by step — the same calls an external agent
              would make against the manifest, with no screen involved.
            </p>
          ) : null}
          {run.isPending ? <p className="mono mt-6 text-sm text-[#8fa58c]">Contacting storefront…</p> : null}
          {result ? (
            <ol className="mt-4 space-y-3">
              {result.trace.slice(0, visible).map((s, i) => (
                <li key={`${s.step}-${i}`} className="trace-step mono text-sm leading-relaxed">
                  <span className={s.ok ? "text-[#2fbf71]" : "text-[#e0685a]"}>
                    {s.ok ? "✓" : "✗"} [{s.step}]
                  </span>{" "}
                  <span className="font-semibold text-[#eef3e8]">{s.label}</span>
                  <br />
                  <span className="text-[#a9bba4]">{s.detail}</span>
                </li>
              ))}
            </ol>
          ) : null}
          {result && done ? (
            <div className="mono mt-5 border-t border-dashed border-[#3a473a] pt-4 text-sm">
              <p className={result.order?.status === "completed" ? "text-[#2fbf71]" : "text-[#d9a441]"}>
                {result.message}
              </p>
              {result.order ? (
                <p className="mt-2 text-[#a9bba4]">
                  receipt ref: <span className="text-[#eef3e8]">{result.order.ref}</span> · idempotency:{" "}
                  <span className="text-[#eef3e8]">{result.order.idempotency_key}</span> · total:{" "}
                  <span className="text-[#eef3e8]">{money(result.order.total_cents)}</span> · status:{" "}
                  <span className="text-[#eef3e8]">{result.order.status}</span>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Catalog ------------------------------ */

function Catalog({ products, agents, onDone, onBuy }: { products: Product[]; agents: Agent[]; onDone: () => void; onBuy: (r: TxResult) => void }) {
  const [view, setView] = useState<"human" | "agent">("human");
  const [showForm, setShowForm] = useState(false);
  const [buyerId, setBuyerId] = useState<number | null>(null);
  const buyer = agents.find((a) => a.id === buyerId) ?? agents[0];

  const del = useMutation({ mutationFn: (id: number) => api.deleteProduct({ id }), onSuccess: onDone });
  const buyMut = useMutation({
    mutationFn: async (p: Product) => {
      if (!buyer) throw new Error("no buyer");
      return api.buyProduct({ agent_id: buyer.id, product_id: p.id, qty: 1 });
    },
    onSuccess: (r) => onBuy(r),
  });

  const agentJson = JSON.stringify(
    products.map((p) => ({
      sku: p.sku, name: p.name, category: p.category, price: { amount_cents: p.price_cents, currency: "USD", per: p.unit },
      latency_p50_ms: p.latency_ms, sla_pct: p.sla_pct, rating: p.rating, stock: p.stock, seller: p.seller,
    })),
    null, 2,
  );

  return (
    <section className="border-t border-[var(--border)] py-10">
      <SectionHead
        index="02 · Catalog"
        title="The Coach catalog, two ways"
        sub="Nine real Coach products — Tabby, Brooklyn, Empire, Chelsea, Kisslock, Plaza and more, at US coach.com prices — rendered for a human and as the JSON feed an agent actually consumes. Flip the view: nothing about the data changes, only who it's for. Agents never see the photos; every fact in them (material, size, fit) is in the text fields too."
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="mono inline-flex overflow-hidden rounded-[var(--radius)] border border-[var(--border)] text-sm" role="group" aria-label="Catalog view">
          <button type="button" aria-pressed={view === "human"} onClick={() => setView("human")} className={`px-4 py-2 ${view === "human" ? "bg-[var(--text)] text-[var(--bg)]" : "bg-[var(--surface)]"}`}>Human view</button>
          <button type="button" aria-pressed={view === "agent"} onClick={() => setView("agent")} className={`px-4 py-2 ${view === "agent" ? "bg-[var(--text)] text-[var(--bg)]" : "bg-[var(--surface)]"}`}>Agent view · JSON</button>
        </div>
        <label htmlFor="card-buyer" className="mono text-xs uppercase tracking-wider text-[var(--dim)]">Buy as</label>
        <select
          id="card-buyer" value={buyer?.id ?? ""} onChange={(e) => setBuyerId(parseInt(e.target.value, 10))}
          className="mono rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        >
          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button type="button" onClick={() => setShowForm((s) => !s)} className="mono rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm">
          {showForm ? "Close form" : "+ Add product"}
        </button>
      </div>

      {showForm ? <ProductForm onDone={() => { setShowForm(false); onDone(); }} /> : null}

      {view === "agent" ? (
        <pre className="mono max-h-[520px] overflow-auto rounded-[var(--radius)] border border-[var(--border)] bg-[#101511] p-5 text-xs leading-relaxed text-[#c8d6c2]">
          {`GET /catalog.json → 200 OK\n\n${agentJson}`}
        </pre>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <article key={p.id} className="flex flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
              {PRODUCT_IMAGES[p.sku] ? (
                <img
                  src={PRODUCT_IMAGES[p.sku] ?? ""}
                  alt={p.name}
                  className="aspect-[4/3] w-full border-b border-[var(--border)] bg-white object-cover"
                  loading="lazy"
                />
              ) : null}
              <div className="flex flex-1 flex-col p-5">
              <div className="mono flex items-start justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wider text-[var(--accent-ink)]">{p.category}</span>
                <span className="text-[11px] text-[var(--dim)]">{p.sku}</span>
              </div>
              <h3 className="mono mt-2 text-base font-semibold leading-snug">{p.name}</h3>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-[var(--dim)]">{p.description}</p>
              <p className="mono mt-3 text-xl font-semibold">{money(p.price_cents)} <span className="text-xs font-normal text-[var(--dim)]">/ {p.unit}</span></p>
              <dl className="mono mt-3 grid grid-cols-4 gap-2 border-t border-[var(--border)] pt-3 text-center text-xs">
                <div><dt className="text-[var(--dim)]">Rating</dt><dd className="mt-0.5 font-semibold">{p.rating}★</dd></div>
                <div><dt className="text-[var(--dim)]">p50</dt><dd className="mt-0.5 font-semibold">{p.latency_ms}ms</dd></div>
                <div><dt className="text-[var(--dim)]">SLA</dt><dd className="mt-0.5 font-semibold">{p.sla_pct}%</dd></div>
                <div><dt className="text-[var(--dim)]">Stock</dt><dd className="mt-0.5 font-semibold">{p.stock}</dd></div>
              </dl>
              <p className="mt-2 text-xs text-[var(--dim)]">Seller: {p.seller}</p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button" disabled={buyMut.isPending || !buyer || p.stock === 0}
                  onClick={() => buyMut.mutate(p)}
                  aria-label={`Buy ${p.name} as ${buyer?.name ?? "agent"}`}
                  className="mono flex-1 rounded-[var(--radius)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:text-[#0e120f]"
                >
                  {p.stock === 0 ? "Out of stock" : `Buy as ${buyer?.name ?? "agent"}`}
                </button>
                <button
                  type="button" disabled={del.isPending} onClick={() => del.mutate(p.id)}
                  aria-label={`Remove ${p.name} from catalog`}
                  className="mono rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--danger)]"
                >
                  Remove
                </button>
              </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {buyMut.error ? <p className="mt-3 text-sm text-[var(--danger)]">That purchase failed — see the ledger for details.</p> : null}
    </section>
  );
}

function ProductForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [seller, setSeller] = useState("");
  const [stock, setStock] = useState("100");
  const [rating, setRating] = useState("4.5");
  const [latency, setLatency] = useState("250");
  const [sla, setSla] = useState("99.9");

  const add = useMutation({
    mutationFn: () => api.addProduct({
      name, category, description,
      price_cents: Math.round(parseFloat(price) * 100),
      unit, latency_ms: parseInt(latency, 10), sla_pct: parseFloat(sla),
      rating: parseFloat(rating), stock: parseInt(stock, 10), seller,
    }),
    onSuccess: onDone,
  });

  const field = "mono mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm";
  const label = "mono block text-xs uppercase tracking-wider text-[var(--dim)]";

  return (
    <form
      className="mb-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5"
      onSubmit={(e: FormEvent) => { e.preventDefault(); add.mutate(); }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="pf-name" className={label}>Product name</label><input id="pf-name" required value={name} onChange={(e) => setName(e.target.value)} className={field} /></div>
        <div><label htmlFor="pf-category" className={label}>Category</label><input id="pf-category" required value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Shoulder Bags, Totes & Carryalls…" className={field} /></div>
        <div className="sm:col-span-2"><label htmlFor="pf-desc" className={label}>Description (agents read this too)</label><input id="pf-desc" required value={description} onChange={(e) => setDescription(e.target.value)} className={field} /></div>
        <div><label htmlFor="pf-price" className={label}>Price in $</label><input id="pf-price" required inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={field} /></div>
        <div><label htmlFor="pf-unit" className={label}>Unit</label><input id="pf-unit" required value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="bag" className={field} /></div>
        <div><label htmlFor="pf-seller" className={label}>Seller</label><input id="pf-seller" required value={seller} onChange={(e) => setSeller(e.target.value)} className={field} /></div>
        <div><label htmlFor="pf-stock" className={label}>Stock</label><input id="pf-stock" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} className={field} /></div>
        <div><label htmlFor="pf-rating" className={label}>Rating (1–5)</label><input id="pf-rating" inputMode="decimal" value={rating} onChange={(e) => setRating(e.target.value)} className={field} /></div>
        <div><label htmlFor="pf-latency" className={label}>Latency p50 (ms)</label><input id="pf-latency" inputMode="numeric" value={latency} onChange={(e) => setLatency(e.target.value)} className={field} /></div>
        <div><label htmlFor="pf-sla" className={label}>SLA %</label><input id="pf-sla" inputMode="decimal" value={sla} onChange={(e) => setSla(e.target.value)} className={field} /></div>
      </div>
      <button type="submit" disabled={add.isPending} className="mono mt-5 rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:text-[#0e120f]">
        {add.isPending ? "Adding…" : "Add to catalog"}
      </button>
      {add.error ? <p className="mt-3 text-sm text-[var(--danger)]">Could not add — check the values and try again.</p> : null}
    </form>
  );
}

/* ------------------------------ Agents ------------------------------ */

function Agents({ agents, categories, onDone }: { agents: Agent[]; categories: string[]; onDone: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const del = useMutation({ mutationFn: (id: number) => api.deleteAgent({ id }), onSuccess: onDone });

  return (
    <section className="border-t border-[var(--border)] py-10">
      <SectionHead
        index="03 · The buyers"
        title="Agent buyers & their mandates"
        sub="In this market the customer is software. Each buyer carries a wallet mandate — a budget, a per-order cap, and the categories it is allowed to buy — and the storefront enforces all three on every checkout."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a) => {
          const left = a.budget_cents - a.spent_cents;
          const pct = a.budget_cents > 0 ? Math.min(100, Math.round((a.spent_cents / a.budget_cents) * 100)) : 0;
          return (
            <article key={a.id} className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="mono text-base font-semibold">{a.name}</h3>
                <span className="mono rounded-full border border-[var(--accent)] px-2 py-0.5 text-[11px] text-[var(--accent-ink)]">agent</span>
              </div>
              <p className="mt-1 text-sm text-[var(--dim)]">{a.purpose}</p>
              <div className="mono mt-4 text-sm">
                <div className="flex justify-between"><span className="text-[var(--dim)]">Spent</span><span>{money(a.spent_cents)} / {money(a.budget_cents)}</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface2)]" role="img" aria-label={`${pct}% of budget spent`}>
                  <div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-3 flex justify-between"><span className="text-[var(--dim)]">Remaining</span><span className="font-semibold">{money(left)}</span></div>
                <div className="mt-1 flex justify-between"><span className="text-[var(--dim)]">Per-order cap</span><span>{money(a.max_order_cents)}</span></div>
                <div className="mt-1 flex justify-between gap-3"><span className="text-[var(--dim)]">Mandate</span><span className="text-right">{a.allowed_categories}</span></div>
              </div>
              <button
                type="button" disabled={del.isPending} onClick={() => del.mutate(a.id)}
                aria-label={`Remove agent buyer ${a.name}`}
                className="mono mt-4 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--danger)]"
              >
                Remove buyer
              </button>
            </article>
          );
        })}
      </div>
      <button type="button" onClick={() => setShowForm((s) => !s)} className="mono mt-5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm">
        {showForm ? "Close form" : "+ New agent buyer"}
      </button>
      {showForm ? <AgentForm categories={categories} onDone={() => { setShowForm(false); onDone(); }} /> : null}
    </section>
  );
}

function AgentForm({ categories, onDone }: { categories: string[]; onDone: () => void }) {
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [budget, setBudget] = useState("100");
  const [cap, setCap] = useState("25");
  const [mandate, setMandate] = useState("all");

  const add = useMutation({
    mutationFn: () => api.addAgent({
      name, purpose,
      budget_cents: Math.round(parseFloat(budget) * 100),
      max_order_cents: Math.round(parseFloat(cap) * 100),
      allowed_categories: mandate,
    }),
    onSuccess: onDone,
  });

  const field = "mono mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm";
  const label = "mono block text-xs uppercase tracking-wider text-[var(--dim)]";

  return (
    <form
      className="mt-5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5"
      onSubmit={(e: FormEvent) => { e.preventDefault(); add.mutate(); }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="af-name" className={label}>Agent name</label><input id="af-name" required value={name} onChange={(e) => setName(e.target.value)} className={field} /></div>
        <div><label htmlFor="af-purpose" className={label}>Purpose</label><input id="af-purpose" required value={purpose} onChange={(e) => setPurpose(e.target.value)} className={field} /></div>
        <div><label htmlFor="af-budget" className={label}>Budget in $</label><input id="af-budget" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} className={field} /></div>
        <div><label htmlFor="af-cap" className={label}>Per-order cap in $</label><input id="af-cap" inputMode="decimal" value={cap} onChange={(e) => setCap(e.target.value)} className={field} /></div>
        <div>
          <label htmlFor="af-mandate" className={label}>Allowed categories</label>
          <select id="af-mandate" value={mandate} onChange={(e) => setMandate(e.target.value)} className={field}>
            <option value="all">all</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <button type="submit" disabled={add.isPending} className="mono mt-5 rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:text-[#0e120f]">
        {add.isPending ? "Creating…" : "Create agent buyer"}
      </button>
      {add.error ? <p className="mt-3 text-sm text-[var(--danger)]">Could not create — check the values and try again.</p> : null}
    </form>
  );
}

/* ------------------------------ Ledger ------------------------------ */

function Ledger({ orders }: { orders: Order[] }) {
  const [openId, setOpenId] = useState<number | null>(null);
  return (
    <section className="border-t border-[var(--border)] py-10">
      <SectionHead
        index="04 · Ledger"
        title="Every transaction, on the record"
        sub="Completed and rejected orders alike — a rejection is data too. Open any order to replay the exact trace the agent executed."
      />
      {orders.length === 0 ? (
        <p className="rounded-[var(--radius)] border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--dim)]">
          No orders yet. Run a transaction above and it will be recorded here.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
          {orders.map((o) => (
            <li key={o.id} className="p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={`mono rounded-full px-2 py-0.5 text-[11px] font-semibold ${o.status === "completed" ? "bg-[var(--accent)] text-white dark:text-[#0e120f]" : "bg-[var(--amber)] text-white dark:text-[#0e120f]"}`}>
                  {o.status}
                </span>
                <span className="mono text-sm font-semibold">{o.product_name}</span>
                <span className="mono text-sm text-[var(--dim)]">× {o.qty}</span>
                <span className="mono ml-auto text-sm font-semibold">{money(o.total_cents)}</span>
              </div>
              <p className="mono mt-1 text-xs text-[var(--dim)]">
                {o.ref} · bought by {o.agent_name} · {new Date(o.created_at).toLocaleString()}
              </p>
              {o.status === "rejected" && o.reason ? <p className="mt-1 text-xs text-[var(--amber)]">Reason: {o.reason}</p> : null}
              <button
                type="button" onClick={() => setOpenId(openId === o.id ? null : o.id)}
                aria-expanded={openId === o.id}
                aria-label={`${openId === o.id ? "Hide" : "Replay"} trace for order ${o.ref}`}
                className="mono mt-2 text-xs text-[var(--accent-ink)] underline underline-offset-2"
              >
                {openId === o.id ? "Hide trace" : "Replay trace"}
              </button>
              {openId === o.id ? (
                <ol className="mono mt-3 space-y-2 rounded-[var(--radius)] bg-[#101511] p-4 text-xs leading-relaxed text-[#c8d6c2]">
                  {o.trace.map((s, i) => (
                    <li key={i}>
                      <span className={s.ok ? "text-[#2fbf71]" : "text-[#e0685a]"}>{s.ok ? "✓" : "✗"} [{s.step}]</span>{" "}
                      <span className="font-semibold text-[#eef3e8]">{s.label}</span> — {s.detail}
                    </li>
                  ))}
                </ol>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------ Surface ------------------------------ */

function SurfaceSection({ surface, loading }: { surface: Surface | undefined; loading: boolean }) {
  const [tab, setTab] = useState<"manifest" | "llms" | "tools">("manifest");
  return (
    <section className="border-t border-[var(--border)] py-10">
      <SectionHead
        index="05 · Machine-readable surface"
        title="What the agent actually sees"
        sub="Generated live from the current catalog — add a product above and it appears here. This, not the page you're reading, is the real frontend."
      />
      <div className="mono mb-4 inline-flex overflow-hidden rounded-[var(--radius)] border border-[var(--border)] text-sm" role="group" aria-label="Surface format">
        <button type="button" aria-pressed={tab === "manifest"} onClick={() => setTab("manifest")} className={`px-4 py-2 ${tab === "manifest" ? "bg-[var(--text)] text-[var(--bg)]" : "bg-[var(--surface)]"}`}>agent-manifest</button>
        <button type="button" aria-pressed={tab === "llms"} onClick={() => setTab("llms")} className={`px-4 py-2 ${tab === "llms" ? "bg-[var(--text)] text-[var(--bg)]" : "bg-[var(--surface)]"}`}>llms.txt</button>
        <button type="button" aria-pressed={tab === "tools"} onClick={() => setTab("tools")} className={`px-4 py-2 ${tab === "tools" ? "bg-[var(--text)] text-[var(--bg)]" : "bg-[var(--surface)]"}`}>Tools</button>
      </div>
      {loading || !surface ? (
        <p className="text-sm text-[var(--dim)]">Generating the surface…</p>
      ) : tab === "tools" ? (
        <ul className="space-y-3">
          {surface.tools.map((t) => (
            <li key={t.name} className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="mono text-sm font-semibold text-[var(--accent-ink)]">{t.name}</p>
              <p className="mt-1 text-sm text-[var(--dim)]">{t.description}</p>
              <p className="mono mt-2 text-xs text-[var(--dim)]">input: {t.input}</p>
            </li>
          ))}
        </ul>
      ) : (
        <pre className="mono max-h-[520px] overflow-auto whitespace-pre-wrap rounded-[var(--radius)] border border-[var(--border)] bg-[#101511] p-5 text-xs leading-relaxed text-[#c8d6c2]">
          {tab === "manifest" ? surface.manifest_json : surface.llms_txt}
        </pre>
      )}
    </section>
  );
}

/* ------------------------------ Ladder ------------------------------ */

function Ladder() {
  return (
    <section className="border-t border-[var(--border)] py-10">
      <SectionHead
        index="06 · The ladder"
        title="Seven rungs from blocked to generative"
        sub="From the project research brief: most of the web sits on rungs 1–3. This prototype is a working rung 6 — transactable — and rung 7 is the research direction."
      />
      <ol className="space-y-2">
        {RUNGS.map((r) => (
          <li
            key={r.n}
            className={`flex gap-4 rounded-[var(--radius)] border p-4 ${r.here ? "border-[var(--accent)] bg-[var(--surface)]" : "border-[var(--border)] bg-[var(--surface)] opacity-80"}`}
            style={{ marginLeft: `${(r.n - 1) * 10}px` }}
          >
            <span className={`mono text-lg font-bold ${r.here ? "text-[var(--accent-ink)]" : "text-[var(--dim)]"}`}>{r.n}</span>
            <div>
              <p className="mono text-sm font-semibold">
                {r.name}
                {r.here ? <span className="ml-2 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11px] text-white dark:text-[#0e120f]">this prototype</span> : null}
              </p>
              <p className="mt-0.5 text-sm text-[var(--dim)]">{r.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------ Principles ------------------------------ */

function Principles({ checks, checkedCount }: { checks: Record<string, boolean>; checkedCount: number }) {
  const queryClient = useQueryClient();
  const toggle = useMutation({
    mutationFn: (args: { key: string; checked: boolean }) => api.toggleCheck(args),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["state"] }),
  });
  const pct = Math.round((checkedCount / PRINCIPLES.length) * 100);
  return (
    <section className="border-t border-[var(--border)] py-10">
      <SectionHead
        index="07 · Design principles"
        title="The agent-first checklist"
        sub="Twelve principles from the research brief, as a working readiness score for any site — including this one. Tick what a frontend genuinely ships, not what it aspires to."
      />
      <div className="mono mb-5 flex items-center gap-4">
        <span className="text-3xl font-bold">{pct}%</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface2)]" role="img" aria-label={`Readiness ${pct}%`}>
          <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm text-[var(--dim)]">{checkedCount} / {PRINCIPLES.length}</span>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {PRINCIPLES.map((p) => {
          const on = !!checks[p.key];
          return (
            <li key={p.key} className={`rounded-[var(--radius)] border p-4 ${on ? "border-[var(--accent)] bg-[var(--surface)]" : "border-[var(--border)] bg-[var(--surface)]"}`}>
              <label htmlFor={`check-${p.key}`} className="flex cursor-pointer items-start gap-3">
                <input
                  id={`check-${p.key}`} type="checkbox" checked={on}
                  onChange={(e) => toggle.mutate({ key: p.key, checked: e.target.checked })}
                  className="mt-1 h-5 w-5 shrink-0 accent-[#177a43]"
                />
                <span>
                  <span className="mono block text-sm font-semibold">{p.title}</span>
                  <span className="mt-0.5 block text-sm text-[var(--dim)]">{p.desc}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="mt-8 text-center text-xs text-[var(--dim)]">
        Built as a prototype for the agent-first frontend project — the catalog and buyers are a
        demonstration storefront you control, and every order in the ledger really happened here.
      </p>
    </section>
  );
}
