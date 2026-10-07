Update the Sari3 application UI/UX specification for **Phase 1 — Design System & UI Foundation**.

This phase establishes the complete visual foundation and reusable UI infrastructure for the Sari3 app.

IMPORTANT:
This is ONLY Phase 1.

Do NOT redesign or migrate all existing screens in this phase.
Do NOT implement the complete animation system yet.
Do NOT apply the new design system across every screen yet.

Phase 2 will create reusable animation recipes.
Phase 3 will apply the design system and animations incrementally, screen by screen.

The existing business logic, feature architecture, Supabase integration, authentication, cart logic, order logic, and domain/application layers MUST remain intact.

==================================================

1. PHASE 1 GOAL
   ==================================================

Establish a production-quality, reusable Sari3 UI foundation inspired by modern global food/grocery delivery applications while preserving Sari3's own visual identity.

The foundation must provide:

* centralized design tokens
* typography system
* color system
* spacing system
* border-radius system
* elevation/shadow system
* motion tokens
* reusable UI primitives
* reusable component variants
* RTL-first support
* accessibility foundations
* required UI libraries
* dark-mode-ready architecture

The result should allow Phase 2 and Phase 3 to build on top of this foundation without introducing duplicated UI logic or inconsistent styling.

==================================================
2. VISUAL IDENTITY
==================

Use the following Sari3 design tokens as the initial source of truth.

Primary:
#FFB800

Secondary:
#1A1A1A

Tertiary / Success / Market:
#27AE60

Neutral / Background:
#F8F9FA

The colors MUST be centralized.

Do not hardcode these values throughout feature screens or components.

Create semantic tokens in addition to raw palette tokens.

For example:

* primary
* primaryPressed
* primaryDisabled
* primarySubtle
* secondary
* success
* warning
* error
* info
* background
* surface
* surfaceElevated
* textPrimary
* textSecondary
* textMuted
* textInverse
* border
* divider
* disabled

The exact tint/shade values should be generated consistently from the base palette during implementation.

IMPORTANT:

Do not use #FFB800 directly as a background with white text unless contrast is verified.

If necessary, use a darker shade from the primary scale for filled buttons.

==================================================
3. TYPOGRAPHY
=============

Use **Tajawal** as the application's primary font.

Tajawal must support both Arabic and Latin text.

Install and load Tajawal using the appropriate Expo font mechanism.

The application must load the required fonts before rendering the main UI.

Create centralized typography tokens.

At minimum:

* display
* headingLarge
* headingMedium
* headingSmall
* bodyLarge
* bodyMedium
* bodySmall
* caption
* label
* button
* price
* numeric

Typography tokens should define appropriate:

* fontFamily
* fontSize
* fontWeight
* lineHeight
* letterSpacing where appropriate

Typography must work correctly for:

* Arabic
* English
* mixed Arabic/English content
* prices
* numbers
* product names
* buttons
* navigation labels

Do not define arbitrary font sizes repeatedly inside feature screens.

==================================================
4. SPACING SYSTEM
=================

Create a centralized spacing scale.

Use it consistently for:

* screen padding
* cards
* lists
* sections
* forms
* buttons
* inputs
* product layouts
* order layouts
* navigation

The exact numerical values can be selected during implementation, but the scale MUST be centralized.

Location:

src/shared/ui/theme/spacing.ts

Components should consume spacing tokens instead of arbitrary numbers wherever practical.

==================================================
5. BORDER RADIUS SYSTEM
=======================

Create centralized radius tokens.

At minimum:

* none
* small
* medium
* large
* extraLarge
* pill

Use these consistently for:

* cards
* buttons
* inputs
* badges
* chips
* images
* bottom sheets
* modals

The visual style should be modern and friendly without making every component excessively rounded.

==================================================
6. SHADOW / ELEVATION SYSTEM
============================

Create centralized elevation/shadow tokens.

Use subtle elevation.

Avoid large dark shadows.

Prefer:

* surface contrast
* subtle borders
* light elevation

over aggressive shadows.

The system must work across supported platforms.

==================================================
7. DARK MODE FOUNDATION
=======================

Prepare the theme system for light and dark modes.

Phase 1 MUST establish:

* light theme
* dark theme structure
* semantic color tokens for both themes
* theme selection/context mechanism

Do not redesign every existing screen for dark mode in Phase 1.

The important requirement is that the architecture supports dark mode without requiring a future rewrite.

Dark mode colors should be semantic rather than simple inversion of the light palette.

The Sari3 primary identity should remain recognizable in dark mode.

==================================================
8. THEME ARCHITECTURE
=====================

Create the centralized theme system under:

src/shared/ui/theme/

Expected structure:

theme/
├── colors.ts
├── typography.ts
├── spacing.ts
├── radii.ts
├── shadows.ts
├── motion.ts
└── index.ts

If a ThemeProvider/context is required, place it in an appropriate shared UI location.

The theme must expose tokens through a consistent API.

Components should not import raw color values from random files.

Avoid duplicated theme definitions.

The theme is the single source of truth for the Sari3 visual system.

==================================================
9. MOTION TOKENS
================

Phase 1 does NOT implement the complete animation recipe system.

However, establish the foundation required by Phase 2.

Create:

src/shared/ui/theme/motion.ts

Define reusable motion tokens such as:

* durationFast
* durationNormal
* durationSlow
* easingStandard
* easingEmphasized
* easingDecelerated
* easingAccelerated

The exact values should be chosen to create a responsive modern mobile experience.

Do not create screen-specific animations in Phase 1.

Phase 2 will build the actual reusable animation recipes.

==================================================
10. REANIMATED
==============

Install and configure:

react-native-reanimated

Use the version compatible with the current Expo SDK/project configuration.

Reanimated will be the foundation for Phase 2's animation system.

Verify that the project can successfully use Reanimated with the current React Native architecture.

Do NOT migrate every existing animation in Phase 1.

==================================================
11. GESTURE HANDLER
===================

Install/configure:

react-native-gesture-handler

Use it as the gesture foundation for interactions that will be introduced in later phases.

Ensure the project setup is compatible with Expo and the existing application architecture.

Do not introduce unnecessary gesture interactions in Phase 1.

==================================================
12. HAPTIC FEEDBACK
===================

Install:

expo-haptics

Prepare it for use by reusable UI components.

Phase 1 only establishes the dependency and integration foundation.

Do not add haptics everywhere.

Phase 3 will decide where haptic feedback should actually be used during screen-by-screen implementation.

==================================================
13. BOTTOM SHEET
================

Install/use:

@gorhom/bottom-sheet

This will be the foundation for reusable bottom-sheet interactions.

Do NOT create multiple independent bottom-sheet implementations.

If an application-level wrapper is useful, create a reusable Sari3 component around the library.

For example:

Sari3BottomSheet

The wrapper should allow the application to control:

* theme
* radius
* background
* handle
* spacing
* accessibility
* animation configuration

Do not use Liquid Glass or blur effects.

==================================================
14. LIST PERFORMANCE
====================

Add Shopify FlashList if compatible with the current project version.

Use it as the preferred option for potentially large lists where it provides a meaningful performance benefit.

Potential future use cases:

* products
* orders
* available driver orders
* notifications

Do NOT blindly replace every FlatList in Phase 1.

Phase 3 will decide screen by screen where migration is useful.

==================================================
15. ICON SYSTEM
===============

Choose ONE primary icon system:

Preferred:
lucide-react-native

Alternative:
@expo/vector-icons

Do not unnecessarily mix multiple icon libraries.

Create a lightweight shared Icon abstraction if useful.

The abstraction should support:

* size
* color
* accessibility
* RTL-aware directional icons

Directional icons such as:

* back
* forward
* chevron
* arrow

must behave correctly in RTL.

==================================================
16. REUSABLE UI PRIMITIVES
==========================

Establish the foundational shared UI component layer.

Location:

src/shared/ui/components/

At minimum ensure reusable components exist or can be extended for:

* Button
* IconButton
* Card
* Text
* Input
* Badge
* Chip
* Divider
* Avatar
* SearchBar
* QuantitySelector
* SectionHeader
* LoadingState
* EmptyState
* ErrorState

Only create components that are actually needed by the current architecture.

Do not create a huge speculative component library.

==================================================
17. BUTTON COMPONENT
====================

The existing:

src/shared/ui/components/Button.tsx

MUST remain the single shared Button component.

Do NOT create:

* PrimaryButton
* SecondaryButton
* CheckoutButton
* ProductButton
* CustomButton

as separate duplicated components.

Extend Button using variants.

At minimum support:

* primary
* secondary
* outlined
* inverted
* ghost
* destructive

Support:

* small
* medium
* large

and states:

* default
* pressed
* loading
* disabled

Also support:

* optional icon
* RTL-aware icon positioning
* full width

Phase 2 may add reusable button press animations.

==================================================
18. CARD SYSTEM
===============

Establish a reusable Card primitive.

It should support variants such as:

* default
* elevated
* outlined
* flat

The Card component must consume theme tokens.

Do not create multiple generic card components with duplicated styling.

Feature-specific cards such as StoreCard/ProductCard can later compose the shared Card primitive.

==================================================
19. TEXT COMPONENT
==================

Create or standardize a shared Text component if one does not already exist.

It should consume typography tokens.

It should support:

* typography variant
* color token
* alignment
* number of lines
* RTL text
* accessibility

Avoid direct font configuration inside every screen.

==================================================
20. INPUT FOUNDATION
====================

Create/standardize a reusable Input component.

Support:

* label
* placeholder
* error
* disabled
* focused
* optional leading icon
* optional trailing action
* RTL layout

It must use:

* theme colors
* typography
* spacing
* radii

Do not create feature-specific copies of the same input styling.

==================================================
21. RTL FOUNDATION
==================

Arabic is a first-class language.

The UI system MUST be RTL-aware.

Phase 1 must establish the foundations for:

* text alignment
* layout direction
* icon direction
* horizontal spacing
* input alignment
* navigation controls

Do not rely on every third-party component to automatically handle RTL.

Create shared abstractions where necessary.

==================================================
22. ACCESSIBILITY FOUNDATION
============================

Reusable UI components must consider:

* adequate contrast
* practical touch target sizes
* readable typography
* disabled states
* loading states
* error states
* accessibility labels
* screen-reader semantics where appropriate
* reduced-motion support where practical

Important information must never depend on color alone.

==================================================
23. NO LIQUID GLASS / NO BLUR
=============================

Explicitly DO NOT install or introduce:

* expo-blur
* Liquid Glass
* glassmorphism
* blur-based cards
* blur-based navigation
* translucent glass UI

The Sari3 visual language should instead rely on:

* clean surfaces
* typography
* spacing
* controlled colors
* borders
* subtle elevation
* rounded corners

==================================================
24. @expo/ui
============

Do NOT make @expo/ui a core dependency of the Sari3 design system.

The main UI remains React Native-based.

Do not rebuild the application's cards, forms, product UI, or screens using native SwiftUI/Jetpack Compose components.

If @expo/ui is considered later, it must be evaluated separately and introduced only for a clearly justified native interaction.

==================================================
25. THIRD-PARTY LIBRARY POLICY
==============================

Approved UI-support libraries for the Sari3 foundation:

* react-native-reanimated
* react-native-gesture-handler
* @gorhom/bottom-sheet
* expo-haptics
* FlashList
* lucide-react-native OR @expo/vector-icons

These libraries provide capabilities.

They do NOT define the Sari3 visual identity.

The Sari3 theme and reusable components remain the source of truth.

Do not introduce a large generic UI component framework such as a Material/Ant-style UI kit unless explicitly approved later.

==================================================
26. ARCHITECTURAL BOUNDARY
==========================

The UI foundation MUST remain independent from business logic.

Shared UI components MUST NOT:

* query Supabase
* contain authentication business rules
* contain order business rules
* contain cart business rules
* contain feature-specific server-state logic

The existing architecture remains:

Presentation → Application → Domain ← Infrastructure

The shared UI layer belongs to Presentation.

==================================================
27. FILE ORGANIZATION
=====================

Follow the existing feature-first architecture.

Shared UI infrastructure belongs under:

src/shared/ui/

Do not create a new global architecture such as:

src/components/
src/models/
src/controllers/

if that conflicts with the project's established constitution.

The existing architecture MUST remain intact.

==================================================
28. PHASE 1 NON-GOALS
=====================

Do NOT perform the following in Phase 1:

* redesign every screen
* rewrite existing business logic
* rewrite Supabase integration
* change domain models
* change repository contracts
* migrate all FlatLists
* implement all animations
* create animation recipes
* add screen transitions everywhere
* add skeleton animations everywhere
* redesign Driver screens
* redesign Customer screens completely
* introduce Liquid Glass
* introduce expo-blur
* introduce a generic UI framework
* introduce @expo/ui as the main UI system

Those belong to later phases or separate decisions.

==================================================
29. PHASE 1 DELIVERABLE
=======================

At the end of Phase 1, the project should have a stable Sari3 UI foundation containing:

1. Centralized color tokens
2. Light/dark theme structure
3. Tajawal typography system
4. Centralized spacing tokens
5. Centralized radius tokens
6. Centralized elevation/shadow tokens
7. Motion tokens
8. Reanimated configured
9. Gesture Handler configured
10. Expo Haptics installed
11. Gorhom Bottom Sheet integrated/foundation ready
12. FlashList available where appropriate
13. Consistent icon system
14. Reusable base UI primitives
15. RTL-aware UI foundation
16. Accessibility foundation
17. No blur/Liquid Glass
18. No unnecessary UI framework
19. Existing business architecture preserved

==================================================
30. ACCEPTANCE CRITERIA
=======================

Phase 1 is complete only when:

* The theme is centralized and reusable.
* Colors are not duplicated throughout the UI foundation.
* Tajawal is loaded and available globally.
* Typography is tokenized.
* Spacing and radii are tokenized.
* Light and dark themes have a stable architecture.
* Reanimated is correctly configured.
* Gesture Handler is correctly configured.
* Expo Haptics is available.
* Bottom Sheet infrastructure is reusable.
* The icon system is consistent.
* Core UI primitives are reusable.
* The existing Button component remains the single Button implementation.
* RTL behavior is considered in the shared UI layer.
* Accessibility is considered in reusable components.
* No Liquid Glass or blur implementation exists.
* No unnecessary generic UI framework has been introduced.
* No business logic has been moved into shared UI components.
* Existing feature architecture remains intact.
* Phase 2 can build reusable animation recipes on top of this foundation.
* Phase 3 can migrate screens incrementally without redesigning the foundation again.

Do not proceed into Phase 2 or Phase 3 implementation as part of this specification.
