# Data Plan

## Context provenance
- `Since now most of the users are AI agents which visits sites, so I am working on developing new frontend keeping in mind the AI agents` (prior user statement; defines the whole artifact — a frontend designed for agents as primary visitors)
- `Everything` (prior user statement, repeated; scope is the full stack: page structure, design approach, and the product itself)
- `Full transaction and buyers are agent themselves` (prior user statement answering the wedge question; the wedge is full end-to-end transactions and the buyers are the agents themselves — this is the artifact's core workflow)
- Parent-conversation research summary: bots passed humans in web traffic; agents succeed at ~58% of multi-step tasks vs ~78% for humans, failing mainly on JS-heavy SPAs, bot walls, unlabeled controls, infinite scroll, auth walls; the gap is addressability, not readability; standards layer (llms.txt, NLWeb, MCP, WebMCP, commerce protocols) is fragmented with no dominant agent-first framework; a 7-rung ladder from 'blocked' to 'generative' and 12 design principles were identified (assistant research summary in parent conversation; used as labeled reference content in the Ladder and Principles sections, attributed as the project's research brief, not as the user's own records)

## Tested sources
- `i want the catalog Coach Products` (user request, 2026-11-15; the catalog was switched from agent-consumable digital goods to real Coach products)
- Coach US prices checked Nov 2026 via web search/open: Plaza Bag 18 $95, Bowling Small Shoulder Bag $125 and Essential Small Wristlet $75 from https://www.coach.com/shop/women/handbags/view-all?pmin=70&pmax=125 ; Tabby Shoulder Bag 26 $475, Tabby Shoulder Bag 20 $375, Tabby 26 With Pillow Quilting $575, Brooklyn Shoulder Bag 28 $295 and Brooklyn Shoulder Bag 39 $495 from https://rkfashionzone.com/coach-shoulder-bag/ (a guide citing Coach.com's US shoulder-bag pages); Brooklyn Shoulder Bag 34 US $395 and Tabby 26 US $475 cross-checked at https://www.buyandship.com.sg/blog/coach-black-friday-deals-singapore-shopping-2487669/ ; Chelsea Shoulder Bag 26 $295 and Kisslock Frame Bag 30 $350 from a Coach store walkthrough listing retail prices; Tabby rating 4.8 and Brooklyn 28 rating 4.7 / Brooklyn 39 rating 4.8 from https://nz.coach.com/shop/women/bags/view-all?gender=Women&filterCategory=Bags
- Product photos sourced with the image-search skill and copied into `client/src/assets/` (owned bytes, imported by SKU): Tabby 26 (source page https://www.wconcept.co.kr/Product/306134269?rccode=pc_detail_b), Pillow Tabby (https://balilene.com/collections/tas-coach/products/coach-c0772-pillow-tabby-shoulder-bag-26-amazon-green), Brooklyn 28 (Dillard's product image), Empire Carryall and Kisslock and Plaza 18 and Bowling (Coach scene7 CDN images), Chelsea (Pinterest-hosted Coach product shot), Essential Wristlet (eBay product photo). One Empire candidate from Bloomingdale's UAE returned HTML instead of an image and was rejected; the Coach scene7 image was used instead.
- Remaining content is either (a) the user's own project material entered in the UI, (b) the Coach prototype catalog above that the user can add to, edit, and delete — the demo storefront's inventory, not the user's personal records, or (c) reference content from the parent-conversation research summary above. No runtime web fetch, no connector, no live pricing — prices are a Nov 2026 snapshot and the catalog is user-editable.

Imagery not needed: this is a technical console/lab for developers and agents — its visual language is type, code, and live transaction traces; it has no photographic subjects, and adding stock photos of 'robots shopping' would contradict the artifact's own thesis.

## Long-term data behavior
- **Refresh policy**: none; no external data, no schedules.
- **Growth**: products, agent buyers, and orders are user-managed rows in ctx.db; orders append-only via transactions.
- **Ordering**: products by category then price; orders newest first; agents by creation.
- **Time semantics**: order timestamps are creation instants rendered viewer-local.

## Rejected approaches
- **Tried**: treating this as a static explainer/essay page about agent-first design.
  **Why rejected**: the user said 'Everything' and chose full transactions with agents as buyers — the artifact must let an agent actually complete a purchase end-to-end (discover → compare → policy check → checkout → receipt), persisted as real orders, not just describe it.
- **Tried**: a human-style e-commerce storefront with agent features bolted on.
  **Why rejected**: inverts the thesis; here the machine-readable surface (manifest, JSON view, tool list) is primary and the human view is the observer console.
