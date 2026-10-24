# Feature Specification: Restaurant Cuisines & Visual Categories

**Feature Branch**: `013-restaurant-categories`  
**Created**: 2026-10-23  
**Status**: Draft  
**Input**: Dedicated categories model with image support (`image_url`), many-to-many restaurant associations, and category filtering in the mobile customer home and browse experiences.

---

## 1. Executive Summary

Transition restaurant categorization from an unindexed single-text column (`restaurants.category`) to a first-class, normalized schema with image support (`image_url`). Provide an interactive, visually stunning horizontal category carousel on the mobile customer home screen and browse screens, enabling customers to filter restaurants by cuisine/category with real-time feedback.

---

## 2. User Scenarios & Acceptance Criteria *(mandatory)*

### User Story 1 - Visual Categories Carousel & Filtering on Home Screen (Priority: P1) 🎯 MVP

As a customer browsing the app home screen, I want to see a horizontal carousel of food categories with appetizing images (e.g., Grills, Pizza, Burgers, Traditional Food, Desserts), and tap any category to immediately filter the restaurant list to matching restaurants.

**Why this priority**: Delivers the immediate customer-facing value and transforms the home screen into a modern, visual food discovery experience matching top delivery platforms.

**Independent Test**: Open the customer home screen, verify the categories carousel renders with images and titles. Tap "مشويات"; verify the restaurant list filters to show only restaurants tagged with "مشويات". Tap "الكل" or tap the selected category again; verify all restaurants are restored.

**Acceptance Scenarios**:
1. **Given** the customer is on the home screen, **When** categories are loaded, **Then** a horizontal scrollable list displays active categories sorted by `display_order`, each showing an image, title, and press feedback.
2. **Given** a customer taps a category item, **When** the item is selected, **Then** it receives an active visual state (border/glow/background) and the restaurants query refilters to only show restaurants linked to that category.
3. **Given** a category is already selected, **When** the customer taps it again or taps "الكل", **Then** the filter is cleared and all area restaurants are shown.
4. **Given** a selected category has no open restaurants in the current area, **When** filtered, **Then** a friendly empty state is displayed with a quick action to reset the filter.

---

### User Story 2 - Dedicated Categories Schema with Image Support (Priority: P1) 🎯 MVP

As a platform owner and developer, I want a dedicated `categories` table with an `image_url` column and a many-to-many relationship `restaurant_categories` in PostgreSQL, so that restaurants can have multiple cuisines, categories can be visually customized with images, and queries are fast and indexed.

**Why this priority**: Foundation required for clean relational data modeling, fast indexed joins, and flexible category management without full table scans or string parsing.

**Independent Test**: Run database migration; verify `categories` table exists with `image_url`, `restaurant_categories` table links restaurants to categories, existing restaurant data is migrated into proper categories, and RLS policies allow public read access.

**Acceptance Scenarios**:
1. **Given** the new migration is applied, **When** querying `public.categories`, **Then** records contain `id`, `name`, `slug`, `image_url`, `icon_name`, `display_order`, `is_active`, and `type`.
2. **Given** a restaurant offers both "مشويات" and "أكل شعبي", **When** querying its categories via `restaurant_categories`, **Then** both category records are associated.
3. **Given** existing restaurants in the database, **When** the migration runs, **Then** their existing free-text categories are parsed and populated into `categories` and `restaurant_categories` without data loss.
4. **Given** unauthenticated/anonymous or authenticated customer clients, **When** selecting active categories, **Then** Supabase RLS permits `SELECT` access.

---

### User Story 3 - Category Filtering on Dedicated Browse Screen (Priority: P2)

As a customer browsing the dedicated restaurants list (`/browse?type=restaurant`), I want to see the same visual category chips at the top of the list so I can filter cuisines without returning to the home screen.

**Why this priority**: Enhances navigation convenience and deep discovery on the dedicated browse screen.

**Independent Test**: Navigate to `/browse?type=restaurant`, select a category chip at the top, verify the single-column restaurant feed updates to only display matching restaurants.

**Acceptance Scenarios**:
1. **Given** the customer is on `/browse?type=restaurant`, **When** the screen mounts, **Then** a category chips bar is visible under the header.
2. **Given** a category is selected on the browse screen, **When** the list refreshes, **Then** the restaurant count reflects the filtered count (e.g., "3 مطاعم").

---

### User Story 4 - Multi-Category Display on Restaurant Cards & Details (Priority: P3)

As a customer looking at a restaurant card or restaurant detail screen, I want to see all the categories/cuisines that the restaurant specializes in (e.g., "مشويات • أكل شعبي"), rather than a single truncated string.

**Why this priority**: Gives customers clearer context on what each restaurant offers before entering the menu.

**Independent Test**: View a restaurant associated with multiple categories; verify the subtitle/chips render all assigned category names separated by a bullet.

**Acceptance Scenarios**:
1. **Given** a restaurant has multiple categories assigned, **When** rendered in `StoreCard` or `store/[id]`, **Then** all category names are shown cleanly formatted.

---

## 3. Requirements

### 3.1 Functional Requirements (FR)

- **FR-001**: System MUST provide a `categories` table with `id`, `name` (Arabic), `slug` (English), `image_url` (optional image URL), `icon_name` (optional icon fallback), `display_order` (integer), `is_active` (boolean), and `type` (`restaurant` | `market`).
- **FR-002**: System MUST provide a `restaurant_categories` junction table linking `restaurant_id` and `category_id` with foreign key constraints and cascading deletes.
- **FR-003**: System MUST provide public read RLS policies on `categories` (where `is_active = true`) and `restaurant_categories`.
- **FR-004**: System MUST migrate existing legacy text values in `restaurants.category` into the normalized tables automatically.
- **FR-005**: System MUST provide a horizontal scrollable category component displaying circular/card visual items with `image_url` (or fallback icon/gradient if image is empty).
- **FR-006**: System MUST support filtering restaurants by category in TanStack Query without full page reloads, falling back gracefully to all restaurants when unselected.
- **FR-007**: System MUST support image caching/progressive loading via `expo-image` for category images.

### 3.2 Non-Functional & Architecture Requirements (NFR)

- **NFR-001**: Clean Architecture layers MUST be preserved: Pure domain entities in `features/restaurants/domain`, repositories in `infrastructure`, hooks in `application`, and UI components in `presentation`.
- **NFR-002**: Category queries MUST be indexed (index on `restaurant_categories(category_id)` and `categories(display_order)`).
- **NFR-003**: Empty state handling MUST provide Arabic copy and a clear action to reset filters.

---

## 4. Success Criteria

- **SC-001**: All active categories render in < 300ms from cached server state.
- **SC-002**: Filtering restaurants by category executes instantaneously (< 100ms) with animated transition.
- **SC-003**: 100% backward compatibility: existing stores remain accessible and legacy text column remains safe until transition is complete.
- **SC-004**: Zero TypeScript errors (`tsc --noEmit`) and all unit tests pass.
