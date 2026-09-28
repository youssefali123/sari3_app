We need to add a unified search feature to the Sari3 app: a single search box that returns both matching stores and matching products together in one ranked result list, scoped to the customer's currently selected area.

IMPORTANT:
Do NOT immediately implement code.
First inspect the existing Sari3 specifications, constitution, the restaurants and products tables/migrations, the regional-order-dispatch feature's area_id columns and exact-match semantics, the existing store-detail screen and AddOnSelectorModal flow, the closed-store handling from catalog-checkout-foundation (FR-024), and confirm whether pg_trgm is already installed/enabled on this Supabase project (alongside pg_cron and pg_net).

Then update the relevant SpecKit specification/tasks/contracts/data-model documentation consistently.

Follow the existing Sari3 constitution and architecture:
- Feature-first / Screaming Architecture
- Lightweight Clean Architecture per feature
- Dependency direction: Presentation → Application → Domain ← Infrastructure
- TanStack Query for server state
- Supabase/Postgres is the server authority
- Guest browsing is supported — this feature must work without authentication
- Do not introduce external search infrastructure (Algolia/Meilisearch/Typesense) or any new service — use what Postgres/Supabase already provides
- Do not over-engineer; keep MVP scope

==================================================
1. SEARCH SCOPE — RESOLVED, DO NOT REOPEN
==================================================

A single search query returns BOTH matching stores (restaurants and
markets) AND matching products, merged into one ranked result list —
not two separate tabs or two separate screens. Each result item is
discriminated by type ('store' | 'product') so the client can render
and route them differently (section 4).

==================================================
2. AREA-SCOPED — MUST REUSE regional-order-dispatch'S EXACT-MATCH SEMANTICS
==================================================

Search results MUST be filtered to the customer's currently selected
area_id, using the exact same exact-match semantics established in
regional-order-dispatch (no parent/child roll-up, no recursive
expansion). A search for a term must never surface a store or product
belonging to a different area than the one currently selected —
otherwise the customer could find something they cannot actually order
from, contradicting the area feature's entire purpose.

If the customer/guest has not yet selected an area, search must behave
consistently with however the Home screen already handles that missing
-selection state (do not invent new behavior here — inspect and reuse
it).

==================================================
3. MATCHING TECHNIQUE — RESOLVED, DO NOT REOPEN
==================================================

Do NOT use PostgreSQL's native tsvector/to_tsquery full-text search —
stock Postgres ships no built-in stemming dictionary for Arabic (only
Latin-alphabet languages like english/spanish/french have first-party
dictionaries), so it would silently fail to match related Arabic word
forms.

Use the pg_trgm extension instead (language-agnostic trigram matching,
already the same category of built-in extension as pg_cron/pg_net
already active on this project — confirm live, this is not new
infrastructure):

- Add GIN trigram indexes: 
  CREATE INDEX ... ON restaurants USING gin (name gin_trgm_ops);
  CREATE INDEX ... ON products USING gin (name gin_trgm_ops);
- Use similarity()/word_similarity() for ranking and a reasonable
  minimum similarity threshold (tune during planning) so irrelevant
  results are excluded, not just alphabetically nearest matches.

==================================================
4. PRODUCT RESULT NAVIGATION — RESOLVED, DO NOT REOPEN
==================================================

This app has no standalone product-detail route (product add-on
selection happens exclusively through AddOnSelectorModal inside the
store-detail screen — confirmed, do not invent a new product/[id]
route). Therefore, tapping a PRODUCT search result must navigate to
that product's parent store's existing store-detail screen and
automatically open that same product's AddOnSelectorModal on arrival —
it must NOT create a new screen. Tapping a STORE search result
navigates to the existing store-detail screen normally.

==================================================
5. RESULT COMPOSITION AND ONE ATOMIC RPC
==================================================

Implement as a single server-side RPC (e.g. search_catalog(p_area_id,
p_query)) that internally unions ranked store matches and ranked
product matches, sorts the combined set by similarity score, and
returns a capped number of results (decide a sensible limit during
planning, e.g. 20). Do this server-side in one call — do not have the
client issue two separate queries and merge/interleave them itself;
ranking logic must be authoritative in one place.

Each result row must carry enough data to render either a store-style
or product-style row (name, image, and for products: parent store id +
name, so the client can navigate per section 4) plus the type
discriminator.

Respect existing closed-store handling: a store result for a currently
closed store must appear (not be hidden), consistent with how normal
browsing already shows closed stores with ordering disabled (FR-024
from catalog-checkout-foundation) — do not introduce different
behavior for search results.

==================================================
6. CLIENT UX (NOT SERVER-AUTHORITATIVE, JUST UX POLISH)
==================================================

Debounce user input before querying (decide exact timing during
planning) and require a minimum query length (e.g. 2 characters)
before calling the RPC, to avoid excessive calls while typing. These
are client-side conveniences, not correctness requirements — the RPC
itself remains correct regardless of how often it's called.

An empty/no-results state must be designed for zero matches, following
the same empty-state pattern already used elsewhere in the app.

==================================================
7. ACCESS — GUEST-ACCESSIBLE, NO AUTH REQUIRED
==================================================

Search must work for unauthenticated guests exactly as normal
store/product browsing already does. No new RLS restrictions beyond
what already exists on restaurants/products (public read for
active/available records) are needed — the trigram indexes themselves
carry no RLS semantics of their own.

==================================================
8. DOMAIN / APPLICATION / INFRASTRUCTURE
==================================================

Domain: a SearchResult type (discriminated union: store | product)
independent of Supabase/React Native — decide the cleanest feature
home for it during planning (a new lightweight `search` feature vs.
placing it alongside restaurants/products — justify the choice, same
as prior placement decisions like RestaurantCategory).

Application: a search use case/hook (debounced query → RPC call →
TanStack Query, since this is server state, not client state — do not
put search results in Redux).

Infrastructure: the search_catalog() RPC, the two new pg_trgm GIN
indexes.

Presentation: a search input (already stubbed on the Home screen per
existing UI), a unified results list rendering both result types, the
empty-results state, and product-result navigation per section 4.

==================================================
9. OUT OF SCOPE
==================================================

Search history / recent searches, typo-tolerant correction beyond what
trigram similarity naturally provides, voice search, category-name
matching (only store and product names are matched, per section 1),
search analytics/trending terms, any external search service.

==================================================
10. ACCEPTANCE CRITERIA
==================================================

Scenario 1: Customer searches a term matching both a store name and a
product name → both appear in one combined, ranked list.

Scenario 2: Customer's selected area is Fayoum; a product/store with
the same or similar name exists in Senours → the Senours result does
NOT appear, consistent with regional-order-dispatch's exact-match rule.

Scenario 3: Guest (unauthenticated) performs a search → results return
normally, no login required.

Scenario 4: Customer taps a product result → lands on that product's
parent store screen with its AddOnSelectorModal already open — not a
blank/new screen.

Scenario 5: Customer taps a store result → lands on the normal
store-detail screen.

Scenario 6: Search term matches a currently closed store → the store
still appears in results, consistent with FR-024's existing closed-
store display behavior.

Scenario 7: Search term matches nothing → a clear empty-results state
is shown, not a blank screen or an error.

Scenario 8: Customer has not yet selected an area → search behaves
consistently with however Home already handles the no-area-selected
state.

==================================================
11. IMPLEMENTATION CONSTRAINTS
==================================================

Do NOT:
- use native tsvector/to_tsquery full-text search (resolved, section 3)
- introduce any external search service/infrastructure
- create a new product-detail route instead of reusing AddOnSelectorModal (resolved, section 4)
- ignore the area filter or reimplement area matching differently than regional-order-dispatch (resolved, section 2)
- put search results in Redux instead of TanStack Query
- hide closed stores from search results (resolved, section 5)
- issue two separate client-side queries instead of one server-side ranked RPC (resolved, section 5)

At the end, provide:
1. Files/specifications inspected.
2. Confirmation of whether pg_trgm was already enabled on this project or needs a migration to enable it.
3. Database/schema changes required (the two GIN trigram indexes).
4. RPC changes required (search_catalog()).
5. Client state/architecture changes required (the search feature's domain/application placement).
6. tasks.md changes.
7. Any migrations needed, in correct sequence.
8. Any unresolved design decision that requires my approval (there should be very few — this document already resolved scope, matching technique, area-scoping, and product-result navigation).

Do not claim the feature is implemented or verified until the relevant code/database behavior have actually been checked live.



//make this updated in the above text

Update the previously-drafted search feature specification
(unified store+product search) with one correction: the product-detail
navigation target has changed since that document was written.

CONTEXT: product-detail-page (a separate, now-completed feature) removed
AddOnSelectorModal entirely and replaced it with a dedicated route,
src/app/product/[id].tsx, reachable from anywhere a product can be
tapped. The search spec's section 4 was written before this existed
and incorrectly instructs reusing the modal — that instruction is now
obsolete and must be corrected as follows.

==================================================
CORRECTED SECTION 4 — PRODUCT RESULT NAVIGATION
==================================================

Replace the previous instruction entirely. The corrected behavior is:

Tapping a PRODUCT search result navigates directly to
src/app/product/[id].tsx (the dedicated product detail screen from the
product-detail-page feature) using the product's id — the same route
and screen used by every other product entry point in the app (store
browsing, favorites). Do NOT navigate to the parent store screen and do
NOT reference AddOnSelectorModal anywhere in this spec — that pattern
no longer exists in the codebase.

Tapping a STORE search result continues to navigate to the existing
store-detail screen, unchanged.

Since product/[id].tsx already handles a missing/unavailable product
as its own defined edge case (per product-detail-page's section 5),
search does not need to duplicate that handling — simply navigate with
the id and let the destination screen's existing behavior take over.

==================================================
CORRECTED SCENARIO 4 (in the acceptance criteria section)
==================================================

Replace the previous Scenario 4 with:

Scenario 4: Customer taps a product result → navigates directly to
that product's dedicated detail screen (src/app/product/[id].tsx) —
the same screen reachable from store browsing or favorites, not a
different or duplicated experience.

==================================================
CORRECTED IMPLEMENTATION CONSTRAINT (in section 11)
==================================================

Remove the constraint "create a new product-detail route instead of
reusing AddOnSelectorModal (resolved, section 4)" — this is now
backwards. Replace it with:

- do NOT route product results to the parent store screen instead of
  the dedicated product/[id].tsx screen (corrected, section 4)
- do NOT reference or depend on AddOnSelectorModal anywhere — it no
  longer exists in this codebase (corrected, section 4)

==================================================
EVERYTHING ELSE IN THE ORIGINAL SEARCH SPECIFICATION IS UNCHANGED
==================================================

Section 1 (unified store+product results), section 2 (area-scoping via
regional-order-dispatch's exact-match semantics), section 3 (pg_trgm,
not native full-text search), section 5 (single atomic search_catalog()
RPC), section 6 (client-side debounce/minimum-length UX), section 7
(guest-accessible), section 8 (domain/application/infrastructure
placement), section 9 (out of scope: search history, voice search,
category-name matching, external search services), and all other
acceptance scenarios (1, 2, 3, 5, 6, 7, 8) remain exactly as originally
specified. Do not regenerate or reinterpret them — apply only the
correction above.

Do not claim the feature is implemented or verified until the relevant
code/database behavior have actually been checked live.