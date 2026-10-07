
# Sari3 Screen Implementation Prompt

Implement the provided Sari3 screen design as a production-quality React Native screen based on the provided reference image.

## 1. Reference Material

A reference image/screenshot of the target screen is provided with this prompt.

The **reference image is the primary visual source of truth**.

Analyze the image carefully before implementing anything.

The goal is to reproduce the visual design, layout, hierarchy, interactions, and overall UX of the reference as a **native React Native implementation**.

Do NOT try to reproduce the image using a WebView, HTML, CSS, or any web-rendering technique.

---

# 2. Project Context

This is the Sari3 delivery application.

Technology:

- React Native
- Expo
- TypeScript
- Supabase
- TanStack Query
- Redux Toolkit for client-local cart state
- Existing navigation system
- Reanimated
- Gesture Handler
- Gorhom Bottom Sheet
- Expo Haptics
- FlashList where appropriate

Architecture:

**Presentation → Application → Domain ← Infrastructure**

The project follows:

- Feature-first architecture
- Screaming Architecture
- Lightweight Clean Architecture
- Separation between business logic and infrastructure
- Server as the final authority
- Immutable order/address snapshots
- TanStack Query for server state
- Redux Toolkit only for client-local cart state

Do NOT restructure the project.

Do NOT introduce a new architecture.

Do NOT move business logic into UI components.

Do NOT bypass existing application/domain/repository layers.

---

# 3. Sari3 Design System

The screen MUST use the existing Sari3 Design System.

Core colors:

```text
Primary:   #FFB800
Secondary: #1A1A1A
Tertiary:  #27AE60
Background: #F8F9FA
```

Typography:

- Tajawal
- Arabic/RTL first
- Existing typography tokens

Use the existing:

- color tokens
- typography tokens
- spacing tokens
- radius tokens
- shadow tokens
- motion tokens
- theme tokens
- reusable UI components

Do NOT hardcode values when an existing Sari3 token represents the same design concept.

For example, prefer:

```tsx
spacing.md
```

over:

```tsx
16
```

and:

```tsx
colors.primary
```

over:

```tsx
'#FFB800'
```

The reference image determines the visual appearance, but the Sari3 Design System determines how that appearance should be implemented consistently.

---

# 4. Inspect the Existing Codebase First

Before creating or modifying files, inspect the relevant existing implementation.

At minimum inspect:

1. `src/shared/ui/`
2. Sari3 theme/token files
3. Existing screen implementations
4. Related feature components
5. Navigation
6. Existing hooks
7. Existing application/use-case logic
8. Existing repositories/services
9. Existing motion system
10. Existing loading/error/empty state components

Identify reusable components before creating new ones.

Do not duplicate functionality that already exists.

---

# 5. Analyze the Reference Image Before Coding

Before implementation, carefully analyze the reference image.

Identify:

### Screen Structure

- header
- navigation/back button
- title
- sections
- cards
- lists
- grids
- images
- buttons
- bottom actions
- floating elements
- tabs
- filters
- search
- forms
- separators
- badges
- empty areas

### Visual Hierarchy

Determine:

- primary content
- secondary content
- CTA
- supporting information
- important status information
- visual grouping

### Visual Properties

Estimate from the reference:

- spacing
- padding
- margins
- component proportions
- typography hierarchy
- font weights
- colors
- border radius
- shadows
- borders
- icon sizes
- image aspect ratios
- card dimensions

Do not blindly copy pixel dimensions from the screenshot.

Infer the underlying responsive design.

### Interaction Intent

Infer likely interactions from visible UI elements:

- buttons
- cards
- selectors
- tabs
- favorite buttons
- quantity controls
- navigation controls
- bottom sheets
- modals
- input fields
- add-to-cart actions

If an interaction cannot be reliably inferred from the image, follow existing Sari3 patterns and architecture instead of inventing unnecessary behavior.

---

# 6. Reference Image vs Design System

Use this priority:

### Visual appearance

Reference image.

### Components and implementation

Existing Sari3 Design System.

### Architecture

Existing Sari3 architecture.

### Business behavior

Existing application/domain logic.

### Missing behavior

Implement it in the appropriate architectural layer.

The objective is:

**Reference visual design + Sari3 architecture + Sari3 Design System + native mobile UX**

---

# 7. Existing Components First

Before creating a new component, search for an existing equivalent.

Possible shared components include:

- Button
- Text
- Card
- Input
- Badge
- Chip
- IconButton
- SearchBar
- QuantitySelector
- Screen
- LoadingState
- EmptyState
- ErrorState
- RetryButton
- Bottom Sheet
- Modal
- reusable list components

The existing `Button` must remain the single shared button system.

Do NOT create unnecessary variants such as:

```text
PrimaryButton
SecondaryButton
MainButton
CustomButton
ScreenButton
```

If the existing Button needs a genuinely reusable capability to match the design, extend the existing Button appropriately.

---

# 8. Phase 1 + Phase 2 Integration

This screen is part of the Sari3 Phase 3 screen rollout.

Use the existing Phase 1 Design System:

- design tokens
- theme
- typography
- reusable UI primitives
- responsive foundations
- RTL support

Use the existing Phase 2 Motion System:

- screen transitions
- button press
- card press
- list entrance
- favorite
- add-to-cart
- quantity
- modal
- bottom sheet
- skeleton
- loading transitions
- success/error feedback
- reduced-motion handling

Do not recreate low-level animations unnecessarily.

If an existing motion recipe fits the reference, use it.

If a new motion pattern is genuinely needed and likely reusable, add it to the shared motion system.

---

# 9. Native React Native Implementation

The screen must be implemented using native React Native components and the existing Sari3 UI system.

Use appropriate equivalents such as:

```text
View
Text
Pressable
ScrollView
FlatList / FlashList
Image / existing image solution
TextInput / Sari3 Input
Modal / Bottom Sheet
```

Do NOT use:

- WebView
- HTML rendering
- CSS runtime
- React Native Web as a workaround
- screenshot-as-background implementation

The image is a design reference, not something to place behind the UI.

---

# 10. Responsive Layout

Do not design for only the exact dimensions of the reference image.

The screen must work on:

- small phones
- medium phones
- large phones
- different aspect ratios

Avoid unnecessary fixed dimensions such as:

```tsx
width: 390
height: 844
```

Prefer:

- Flexbox
- content-driven sizing
- responsive spacing
- percentage-based sizing where appropriate
- safe-area insets
- adaptive image sizing
- ScrollView / FlashList where appropriate

The final result should preserve the visual hierarchy of the reference across different devices.

---

# 11. Safe Areas

Respect device safe areas.

Account for:

- status bar
- notches
- Dynamic Island
- rounded corners
- home indicator
- bottom navigation

Use the project's existing safe-area solution.

Do not add arbitrary fixed padding simply to make the reference screenshot look correct on one device.

---

# 12. Keyboard Safety

If the screen contains inputs/forms:

The keyboard must not hide:

- focused inputs
- validation messages
- important content
- primary CTA

Implement appropriate keyboard-aware behavior.

Test the screen with:

- keyboard closed
- keyboard open
- first input focused
- last input focused
- validation errors

Do not use arbitrary fixed positioning to solve keyboard issues.

---

# 13. RTL

Sari3 is Arabic/RTL-first.

Ensure:

- correct RTL layout
- correct text alignment
- correct spacing
- correct directional icons
- correct back button direction
- correct chevrons/arrows
- correct horizontal ordering
- Tajawal typography

Do not blindly mirror every icon.

Icons with semantic direction should point in the correct direction for RTL.

---

# 14. Loading State

Every data-dependent section must have an appropriate loading state.

Use the existing Sari3 loading/skeleton system.

Avoid blank screens during loading.

Prefer skeletons that roughly preserve the final layout.

Use existing Phase 2 loading/skeleton animations.

---

# 15. Empty State

Handle relevant empty states.

Examples:

- no products
- no favorites
- no addresses
- no orders
- no search results
- no available orders

Use the existing EmptyState component/system.

The user should understand:

1. What is empty
2. Why
3. What they can do next

---

# 16. Error State

Handle network/server failures gracefully.

Use the existing ErrorState / RetryButton system where appropriate.

The UI should:

- communicate the problem clearly
- avoid technical implementation details
- provide retry when appropriate
- preserve safe cached data where possible

Never show a successful state when a server mutation failed.

---

# 17. Offline / Poor Network

The screen does not need to become fully offline-first.

However, it must behave gracefully when connectivity is poor or unavailable.

Where appropriate:

- show cached data
- communicate offline state
- provide retry
- handle failed mutations
- never claim success without server confirmation

---

# 18. Accessibility

Support:

- meaningful accessibility labels
- appropriate accessibility roles
- adequate contrast
- usable touch targets
- readable typography
- dynamic text scaling where practical
- screen-reader-friendly controls
- reduced motion

Accessibility must not be sacrificed for visual similarity.

---

# 19. Motion

The final screen should feel:

- smooth
- friendly
- responsive
- modern
- lightweight

Use animation only where it improves UX or matches the reference.

Prefer:

- subtle entrance
- press feedback
- state transitions
- quantity changes
- favorite feedback
- add-to-cart feedback
- bottom-sheet transitions

Avoid:

- excessive animation
- long animations
- constant movement
- distracting effects

Respect reduced-motion preferences.

---

# 20. Haptics

Use Expo Haptics selectively for meaningful interactions.

Good examples:

- successful add-to-cart
- favorite toggle
- important confirmation
- meaningful selection

Do not add haptics to every interaction.

---

# 21. @expo/ui

`@expo/ui` is optional.

Do NOT use it as the primary Sari3 UI framework.

Use it only when a native/platform-specific control provides a clear benefit.

Core UI should remain based on:

- React Native
- Sari3 shared components
- Sari3 theme
- Reanimated
- existing project libraries

---

# 22. Explicitly Prohibited

Do NOT introduce:

- Liquid Glass
- `expo-blur`
- unnecessary blur effects
- generic large UI frameworks
- another design system
- another font
- duplicated shared components
- WebView
- HTML/CSS rendering
- hardcoded device-specific dimensions
- business logic inside UI components
- direct database access from UI
- Supabase service-role credentials
- secret API keys in the mobile application

Preserve the existing Sari3 architecture.

---

# 23. Business Logic

Reuse existing:

- hooks
- use cases
- repositories
- services
- query functions
- cart logic
- navigation
- domain models

Do not duplicate business rules inside the screen.

If functionality required by the reference does not currently exist:

1. Identify what is missing.
2. Implement it in the correct architectural layer.
3. Keep presentation independent from infrastructure.
4. Follow existing project conventions.

Do not use fake/mock business logic simply to make the UI appear functional.

---

# 24. Data and API Security

Never put server secrets in the mobile application.

Client-safe Supabase configuration may remain client-side as intended.

Never expose:

- Supabase service-role key
- FCM service-account private key
- payment secret keys
- administrative credentials
- backend-only secrets

If a secret is required, it belongs on the server.

---

# 25. Implementation Process

Follow this exact sequence.

## Step 1 — Inspect

Inspect:

- reference image
- existing Sari3 theme
- shared UI
- related screens
- navigation
- application/domain logic
- existing motion recipes

## Step 2 — Analyze

Create a concise internal implementation map:

```text
Reference element
→ React Native element
→ Existing Sari3 component/token
→ New component only if genuinely necessary
```

Do not modify code yet.

## Step 3 — Reuse

Reuse existing:

- components
- hooks
- tokens
- motion recipes
- business logic
- navigation

## Step 4 — Implement

Implement the screen natively in React Native.

Match the reference image as closely as practical while preserving:

- responsive behavior
- RTL
- accessibility
- architecture
- native UX

## Step 5 — Integrate

Connect the screen to the existing navigation and application logic.

## Step 6 — Add States

Implement applicable:

- loading
- success
- empty
- error
- offline
- retry

states.

## Step 7 — Add Interactions

Implement applicable:

- buttons
- gestures
- inputs
- navigation
- animations
- haptics

## Step 8 — Validate

Check:

- TypeScript
- lint
- imports
- architecture
- RTL
- accessibility
- safe areas
- keyboard behavior
- responsive layout

## Step 9 — Visual QA

Compare the implemented screen against the provided reference image.

Check carefully:

- overall layout
- spacing
- proportions
- typography
- colors
- images
- iconography
- alignment
- border radius
- shadows
- button sizes
- visual hierarchy

Fix visual discrepancies before considering the task complete.

---

# 26. Visual Fidelity

The implementation should closely match the reference image.

Prioritize:

1. Correct UX
2. Native React Native behavior
3. Sari3 architecture
4. Sari3 Design System
5. Responsive behavior
6. Accessibility
7. Visual fidelity

Do not sacrifice architecture or usability merely to reproduce a visual trick from the reference.

If an exact visual technique is not appropriate for React Native, reproduce the same **visual result and UX**, not the original implementation technique.

---

# 27. Do Not Over-Engineer

Only introduce new abstractions when justified.

Do not create unnecessary:

- wrappers
- hooks
- state
- services
- components
- dependencies

If an existing Sari3 component solves the problem, use it.

If a new component is only useful to this screen, keep it local unless there is a clear reason to promote it.

If a component is likely to be reused across multiple screens, place it in the appropriate shared UI location.

---

# 28. Final Acceptance Criteria

The implementation is complete only when:

### Visual

- [ ] Closely matches the reference image
- [ ] Correct visual hierarchy
- [ ] Sari3 colors are respected
- [ ] Tajawal is used
- [ ] Sari3 spacing/radius/typography tokens are used
- [ ] Images have appropriate sizing/cropping
- [ ] Icons are visually appropriate
- [ ] RTL layout is correct

### Architecture

- [ ] Existing Sari3 architecture is preserved
- [ ] No business logic moved into presentation
- [ ] Existing application/domain/infrastructure layers are respected
- [ ] Existing shared components were reused
- [ ] No unnecessary UI framework introduced

### UX

- [ ] Safe areas work correctly
- [ ] Small screens work
- [ ] Large screens work
- [ ] Keyboard does not hide important content
- [ ] Loading state exists where required
- [ ] Empty state exists where required
- [ ] Error state exists where required
- [ ] Offline/network failure is handled appropriately
- [ ] Retry works where appropriate

### Motion

- [ ] Existing Phase 2 motion recipes are used
- [ ] Animations are subtle and purposeful
- [ ] Haptics are used selectively
- [ ] Reduced-motion behavior is respected

### Quality

- [ ] TypeScript passes
- [ ] No obvious runtime errors
- [ ] No unnecessary duplicated components
- [ ] No hardcoded device dimensions
- [ ] No server secrets in the client
- [ ] No Liquid Glass
- [ ] No expo-blur
- [ ] No WebView/HTML rendering workaround

---

# 29. Final Report

After implementation, report:

1. Files created
2. Files modified
3. Existing components reused
4. New reusable components added, if any
5. Motion recipes reused
6. Business/application logic reused
7. New logic added, if any
8. Loading/empty/error/offline states implemented
9. Accessibility considerations
10. Responsive/safe-area/keyboard considerations
11. Remaining visual differences, if any
12. Assumptions made
13. Issues requiring human review

Do NOT claim pixel-perfect or visual-perfect matching unless the implementation has actually been visually checked against the provided reference image.
