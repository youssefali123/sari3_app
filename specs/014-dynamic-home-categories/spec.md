# Feature Specification: Dynamic Customizable Home Categories Grid

**Feature Branch**: `014-dynamic-home-categories`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "Replace the static hardcoded two-tile section (Restaurants and Market) on the customer home screen with a fully dynamic, database-driven 3-column categories grid (Order Now / اطلب دلوقتي) that is customizable from Supabase and ready for a future web admin dashboard. Users can browse top departments on the home screen, view all departments via an interactive View All modal/screen, and filter stores by category within their selected operational area."

## Clarifications

### Session 2026-10-23
- Q: How should the database distinguish between top-level business verticals shown on the home grid (e.g., Supermarket, Restaurants, Pharmacies) and existing store cuisine sub-categories (e.g., Grills, Burgers)? (FR-001) → A: Option B: Create a dedicated `departments` table exclusively for top-level home verticals, keeping the existing `categories` table solely for store cuisine tags.
- Q: When the customer taps "عرض الكل" (View All) on the home categories grid, how should the full list of departments be presented? (FR-007) → A: Option A: Dedicated Full-Screen Page — Navigate to a dedicated screen (e.g., `/(customer)/(home)/departments`) with a search bar, full scrollable 3-column grid, and header back button.
- Q: How should stores be linked to departments in the database schema? → A: Option A: Direct foreign key `department_id` on `restaurants` table (Each store belongs to one primary department).
- Q: Should the sub-categories carousel on the browse screen be displayed only when viewing the "مطاعم" (Restaurants) department? (FR-006) → A: Option C: Keep showing the sub-categories carousel on all department screens, enabling categories/sub-categories to be added for every department (e.g., Supermarkets, Pharmacies, Bakeries) in the same manner as restaurants, filtered by the active department.
- Q: How should existing stores in the database be assigned to the new departments schema during migration? (FR-013) → A: Option A: Automatically backfill in the database migration (link existing restaurants with `type = 'restaurant'` to the "مطاعم" department, and `type = 'market'` to the "سوبرماركت" department).
- Q: How should the Favorites screen tabs be structured given the new multi-vertical departments model? → A: Consolidate store tabs into two clean tabs: "متاجر" (Stores - displaying all favorite stores in the selected area across all departments with department badges) and "منتجات" (Products), eliminating the legacy "مطاعم" and "متاجر" split.
- Q: What is the role and fate of the legacy 'type' column (store_type enum: 'restaurant' | 'market') on restaurants and categories? → A: The 'type' column is retained in the database for backward compatibility and internal store-level UI rendering (e.g., displaying "قائمة الطعام" vs "المنتجات" in store/[id].tsx), but is completely decoupled from home screen discovery, category navigation, store browsing, and favorites tabs—all of which now rely exclusively on 'department_id'. Full deprecation of 'type' is deferred to a future phase when catalog mode settings are added to the departments table in the web admin dashboard.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Home Categories Grid (Priority: P1)

A customer opens the app home screen and immediately sees a visually compelling 3-column grid of category tiles (e.g., Supermarket, Restaurants, Pharmacies) beneath the greeting banner, each with a high-quality image and Arabic title. The customer taps "سوبرماركت" and is navigated to the browse screen showing only supermarket stores in their selected area.

**Why this priority**: This is the core user-facing change — the entire feature revolves around replacing the static two-tile layout with a dynamic, database-driven categories grid. Without this, no other user story delivers value.

**Independent Test**: Can be fully tested by opening the home screen, verifying 6 category tiles render from the database with correct images and names, tapping any tile, and confirming navigation to the browse screen filtered by that category within the active area.

**Acceptance Scenarios**:

1. **Given** the customer is on the home screen with an area selected, **When** the home screen loads, **Then** a 3-column grid displays the top 6 active categories (sorted by `display_order`) with their respective images and Arabic names, under a section titled "اطلب دلوقتي" with a "عرض الكل" action link.
2. **Given** the customer sees the categories grid, **When** they tap a category tile (e.g., "صيدليات"), **Then** they are navigated to the browse screen with the title set to "صيدليات" and only stores associated with that category in the customer's selected area are displayed.
3. **Given** the customer sees the categories grid, **When** they press and hold a tile, **Then** the tile shows a smooth scale-down (0.95) and subtle opacity feedback, reverting on release.
4. **Given** categories are loading from the server, **When** the home screen renders, **Then** a polished skeleton placeholder grid (6 tiles, 3 columns) is shown until data arrives.
5. **Given** no categories exist or the fetch fails, **When** the home screen renders, **Then** a graceful fallback is displayed (e.g., an empty state or a retry prompt) without crashing.

---

### User Story 2 - View All Categories (Priority: P2)

A customer taps "عرض الكل" on the home screen categories section header and navigates to a dedicated full-screen page (`/(customer)/(home)/departments`) displaying all active departments in a 3-column scrollable grid with a search bar and header back button. The customer can scroll through all available departments, filter by typing in the search bar, and tap any department to navigate to its filtered browse screen.

**Why this priority**: As the catalog grows beyond 6 verticals (e.g., 10–15 departments), customers need a way to discover and access all categories. This is essential for scalability but secondary to the core grid appearing on the home screen.

**Independent Test**: Can be fully tested by tapping "عرض الكل", verifying navigation to the departments screen, verifying all active departments appear in a scrollable grid, searching for a specific department, and tapping one to confirm navigation.

**Acceptance Scenarios**:

1. **Given** the customer is on the home screen, **When** they tap "عرض الكل", **Then** the app navigates to the dedicated full-screen departments page displaying all active departments in a 3-column grid layout with header back button and search bar.
2. **Given** the departments screen is open with more than 6 categories, **When** the customer scrolls, **Then** all departments are accessible and displayed correctly without clipping.
3. **Given** the departments screen is open, **When** the customer taps a department, **Then** they are navigated to the browse screen filtered by that department.
4. **Given** the departments screen includes a search input, **When** the customer types a partial name (e.g., "صيد"), **Then** the grid filters in real-time to show only matching departments.

---

### User Story 3 - Category-Filtered Browse Screen (Priority: P1)

A customer navigates to the browse screen from a category tile and sees only the stores assigned to that category within their active area. The screen title dynamically reflects the selected category name. If no stores exist for that category in the area, a user-friendly empty state is shown.

**Why this priority**: This is co-equal with Story 1 — the grid tile tap must land the user on a correctly filtered browse experience. Without proper filtering, the grid is non-functional.

**Independent Test**: Can be tested by navigating to browse with a known category ID, verifying only matching stores appear, changing the area, and confirming the store list updates accordingly.

**Acceptance Scenarios**:

1. **Given** the customer taps a category from the home grid, **When** the browse screen loads, **Then** the screen title is set to the selected category's name (e.g., "لحوم ودواجن") and only stores with matching `department_id` within the active `selectedAreaId` are shown.
2. **Given** the customer navigates to a category with no stores in their area, **When** the browse screen loads, **Then** a user-friendly empty state is displayed with appropriate messaging (e.g., "لا توجد متاجر في هذا القسم بمنطقتك حالياً").
3. **Given** the customer has browsed a category, **When** they press back, **Then** they return to the home screen with the categories grid intact and no data is lost.

---

### User Story 4 - Admin Manages Categories from Database (Priority: P3)

An administrator adds a new category (e.g., "خضار وفواكه") with a name, image URL, display order, and active flag directly in Supabase. The next time any customer opens or refreshes the home screen, the new category appears in its correct position — without any app update.

**Why this priority**: This is the administrative foundation for the dynamic system. While critical for long-term value, it requires no mobile UI work (admin uses Supabase Dashboard now, web dashboard later) and is inherently satisfied by the database-driven architecture.

**Independent Test**: Can be tested by inserting a new row into the `categories` table via Supabase SQL editor, refreshing the mobile app, and verifying the new category appears in the grid.

**Acceptance Scenarios**:

1. **Given** an admin inserts a new active category with `display_order = 2`, **When** a customer opens the home screen, **Then** the new category appears in the 2nd grid position and existing categories shift accordingly.
2. **Given** an admin sets a category's `is_active` to `false`, **When** a customer opens the home screen, **Then** that category does not appear in the grid or in "View All".
3. **Given** an admin updates a category's `image_url` or `name`, **When** a customer refreshes the home screen, **Then** the updated image and name are reflected immediately.

---

### Edge Cases

- What happens when there are fewer than 6 active categories? The grid should display only the available categories without empty placeholder tiles, adjusting layout gracefully (e.g., 1 row of 3 + 1 partial row of 2).
- What happens when all categories are deactivated? The categories section should be hidden entirely from the home screen, and the remaining home content should fill the space naturally.
- What happens when the category image URL is broken or null? A tasteful fallback placeholder (e.g., category icon on a themed background) should be shown instead of a broken image.
- What happens when the user has no area selected? Categories should still load (they are area-independent), but tapping a tile should prompt area selection before showing stores.
- What happens on slow network connections? Skeleton loading states should persist until data arrives; stale cached data from TanStack Query should be shown if available.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST fetch home screen categories (departments) dynamically from the dedicated `departments` table, filtering by `is_active = true` and ordering by `display_order` ascending.
- **FR-002**: Home screen MUST display the top 6 active categories in a responsive 3-column grid layout beneath the greeting hero banner, replacing the static two-tile "مطاعم" / "ماركت" section.
- **FR-003**: Each category grid tile MUST display the category image (from `image_url`) and the category name, with smooth press interaction feedback (scale and opacity).
- **FR-004**: The categories grid section MUST include a header with the title "اطلب دلوقتي" (RTL start) and a "عرض الكل" action link (RTL end) styled in brand primary color.
- **FR-005**: Tapping a category tile MUST navigate to the browse screen, passing the selected department's `id` and `name`, and filtering stores by `department_id` within the user's `selectedAreaId`.
- **FR-006**: The browse screen MUST dynamically set its title to match the selected department's name, and display the sub-categories filter carousel scoped to that department, allowing users to filter stores within the department by specific sub-category tags.
- **FR-007**: Tapping "عرض الكل" MUST navigate to a dedicated full-screen departments page (e.g., `/(customer)/(home)/departments`) displaying all active departments in a 3-column grid with a real-time search/filter input and header back button.
- **FR-008**: The "View All" search input MUST filter categories in real-time by name as the user types.
- **FR-009**: System MUST display a polished skeleton loading state (3-column grid placeholders) while categories are being fetched.
- **FR-010**: System MUST display a graceful fallback if no active categories exist or if the fetch fails, without crashing or showing a blank section.
- **FR-011**: System MUST display a themed fallback placeholder for any category with a null or broken `image_url`.
- **FR-012**: Categories data MUST be cached via TanStack Query and refreshed according to standard stale-while-revalidate behavior, consistent with Principle IV of the project constitution.
- **FR-013**: The initial database MUST be seeded with 6 core verticals (Supermarket, Restaurants, Pharmacies, Meat & Poultry, Bakeries & Sweets, Pet Shops) in the `departments` table with curated images and appropriate `display_order` values. The migration MUST automatically backfill existing `restaurants` rows so that `type = 'restaurant'` stores link to the "مطاعم" department and `type = 'market'` stores link to the "سوبرماركت" department.
- **FR-014**: The Favorites screen MUST display exactly two segmented tabs: "متاجر" (Stores - listing all favorited stores in the user's active area across all departments with department badge) and "منتجات" (Products), eliminating the legacy hardcoded "مطاعم" / "متاجر" split.

### Key Entities

- **Department (Home Vertical)**: Represents a top-level business department displayed on the home screen. Stored in dedicated `departments` table (`id`, `name`, `slug`, `image_url`, `icon_name`, `display_order`, `is_active`, `created_at`). Area-independent and globally visible.
- **Store–Department Association**: Direct 1-to-many relationship where each store in `restaurants` has a foreign key column `department_id REFERENCES departments(id)` ON DELETE SET NULL, indexed alongside `area_id` for fast single-query filtering.
- **Sub-Category (Cuisine / Department Tag)**: Existing `categories` entity extended to include `department_id REFERENCES departments(id)` (or nullable for shared tags), enabling each department (e.g., Supermarkets, Pharmacies) to have its own specialized sub-categories on the browse screen.
- **Store**: Existing entity representing a merchant. Filtered by department (`department_id`) and area when browsing a specific vertical. Retains legacy `type` internally for store-level view UI labels ("قائمة الطعام" vs "المنتجات") while all top-level categorization and browsing use `department_id`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Customers see a dynamic categories grid on the home screen within 1 second of the screen rendering (using cached or fresh data).
- **SC-002**: 100% of active categories added via the database are reflected in the mobile app on the next home screen load — no app update required.
- **SC-003**: Tapping any category tile navigates to a filtered browse screen showing only relevant stores in under 500ms perceived transition time.
- **SC-004**: The "View All" experience successfully displays and allows search-filtering across all active categories, supporting catalogs of 20+ verticals without degraded usability.
- **SC-005**: The home screen skeleton loading state renders immediately and is replaced by real data within the standard network response time, with no layout shift or flicker.
- **SC-006**: The browse screen correctly shows zero stores (with a friendly empty state) when a category has no stores in the user's selected area — never showing stores from other areas.

## Assumptions

- A dedicated `departments` table will be created in Supabase via migration for top-level home verticals, keeping the existing `categories` table strictly for food cuisines and sub-categories.
- Existing stores in the database will be automatically backfilled to their corresponding default departments ("مطاعم" or "سوبرماركت") during the Supabase migration, ensuring zero downtime or empty listings.
- The sub-categories carousel (`CuisineCarousel`) is universal across all departments on the browse screen; sub-categories in the `categories` table are scoped by `department_id` so that each vertical displays only its relevant sub-category filter tags.
- Categories are displayed globally (not area-scoped); area filtering is only applied when listing stores within a category on the browse screen.
- Category images will initially use high-quality external URLs (e.g., Unsplash). A future web admin dashboard will allow uploading images to Supabase Storage.
- The existing `CuisineCarousel` component on the home screen (showing restaurant sub-categories like "مشويات", "برجر") is a separate concern from the top-level verticals grid and will remain as-is beneath the popular stores section.
- RTL layout is the default and all UI elements follow right-to-left alignment, consistent with the app's Arabic-first design.
- The browse screen already supports filtering by cuisine category; this feature extends it to support filtering by top-level vertical categories using the same navigation pattern.
- The legacy `type` column on `restaurants` (`'restaurant'` | `'market'`) is preserved in the database schema to avoid breaking existing store details presentation (`store/[id].tsx`) and backend functions, but is no longer used for customer-facing category navigation, store filtering, or favorites partitioning (which now rely solely on `department_id`).
