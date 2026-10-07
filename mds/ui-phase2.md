Update the Sari3 application UI/UX specification for **Phase 2 — Reusable Motion & Interaction System**.

This phase builds a centralized, reusable animation and interaction system on top of the UI foundation established in Phase 1.

IMPORTANT:
This is ONLY Phase 2.

Phase 1 has already established:

* Sari3 theme/design tokens
* Tajawal typography
* light/dark theme foundation
* spacing
* radii
* shadows/elevation
* motion tokens
* reusable UI primitives
* RTL foundation
* accessibility foundation
* React Native UI architecture
* React Native Reanimated
* Gesture Handler
* Expo Haptics
* Bottom Sheet infrastructure
* FlashList
* icon system

Phase 2 MUST NOT:

* redesign the application
* migrate every existing screen
* rewrite business logic
* rewrite feature architecture
* modify Supabase business logic
* introduce Liquid Glass
* introduce expo-blur
* replace the React Native UI system
* create screen-specific animation implementations unnecessarily

Phase 3 will apply these motion recipes incrementally, screen by screen.

==================================================

1. PHASE 2 GOAL
   ==================================================

Create a centralized, reusable motion system that makes Sari3 feel:

* smooth
* responsive
* friendly
* modern
* polished
* consistent
* fast

Animations must communicate interaction and state changes rather than exist purely as decoration.

The same interaction should behave consistently throughout the application.

For example:

A button press should use the same motion recipe everywhere.

A list item entrance should use the same motion system everywhere.

A favorite toggle should use the same interaction pattern everywhere.

Do not allow every feature screen to invent its own animation values and timing.

==================================================
2. MOTION ARCHITECTURE
======================

Create a dedicated motion layer under:

src/shared/ui/motion/

Recommended structure:

motion/
├── components/
├── hooks/
├── recipes/
├── transitions/
├── presets.ts
└── index.ts

The exact structure may be adjusted to fit the existing project architecture.

The important requirement is that motion logic is centralized and reusable.

Feature screens should consume motion recipes rather than defining raw animation configuration repeatedly.

==================================================
3. TECHNOLOGY
=============

Use:

react-native-reanimated

as the primary animation engine.

Use:

react-native-gesture-handler

for gesture-driven interactions where appropriate.

Use:

expo-haptics

for selected tactile feedback.

Do not introduce another animation library unless there is a clearly documented technical reason.

Do not duplicate Reanimated functionality with competing animation libraries.

==================================================
4. MOTION TOKENS
================

Use the motion tokens established in Phase 1.

Centralize:

* durations
* easing curves
* spring configurations
* delays
* scale values
* opacity values
* translation distances

Do not hardcode animation constants repeatedly inside feature screens.

Motion should use semantic presets such as:

* fastInteraction
* normalInteraction
* emphasizedInteraction
* gentleEntrance
* springInteractive
* springSnappy

The exact numerical values should be selected during implementation based on mobile UX best practices.

==================================================
5. BUTTON PRESS RECIPE
======================

Create a reusable button interaction recipe.

Expected behavior:

* subtle scale/compression on press
* smooth return on release
* disabled buttons do not animate as active
* loading buttons use an appropriate state transition
* animation remains responsive and short

The recipe must work with the existing shared Button component.

Do NOT create a separate animated button component.

The existing Button component should consume the shared motion recipe.

Support:

* primary
* secondary
* outlined
* inverted
* ghost
* destructive

without duplicating animation logic.

==================================================
6. CARD PRESS RECIPE
====================

Create a reusable card interaction recipe.

Use it for interactive cards such as:

* StoreCard
* ProductCard
* OrderCard
* Driver order cards

Expected interaction:

* subtle press feedback
* smooth release
* no exaggerated scaling
* no layout jumping

Non-interactive cards should not automatically animate.

The recipe should be opt-in.

==================================================
7. LIST ITEM ENTRANCE
=====================

Create a reusable list-item entrance animation.

It should support:

* opacity
* subtle translation
* optional scale where appropriate

The animation should be lightweight.

Avoid excessive stagger effects on long lists.

Provide configuration for:

* delay
* duration
* direction
* intensity

Example use cases:

* product lists
* restaurant lists
* market lists
* order lists
* notification lists
* driver available-order lists

The animation must be reusable with FlatList/FlashList-compatible item rendering.

Do not force every list in the application to animate.

Phase 3 will decide where it improves the experience.

==================================================
8. SCREEN TRANSITION RECIPE
===========================

Create reusable screen transition presets.

Possible transition styles:

* fade
* subtle horizontal slide
* subtle vertical slide
* scale/fade for modal-like screens

Transitions must remain consistent with the application's navigation architecture.

Do not replace Expo Router/navigation behavior unnecessarily.

Do not create custom navigation infrastructure solely for animations.

The motion layer should integrate with the existing navigation system.

RTL MUST be respected.

For example:

In RTL:

forward/back navigation animations should not blindly use LTR assumptions.

==================================================
9. FAVORITE TOGGLE RECIPE
=========================

Create a reusable favorite interaction.

Expected behavior:

* immediate visual feedback
* subtle scale
* optional icon emphasis
* optional haptic feedback
* smooth state transition

Use it for:

* favorite stores
* favorite products

Do not duplicate favorite animations in different feature implementations.

The animation must remain independent from the actual favorite business logic.

==================================================
10. ADD-TO-CART RECIPE
======================

Create a reusable interaction for adding an item to the cart.

The recipe may include:

* button feedback
* subtle scale
* icon transition
* quantity feedback
* optional haptic feedback

The animation MUST NOT contain cart business logic.

It only reacts to the successful UI state/action provided by the feature.

Do not make animation code responsible for updating Redux or server state.

==================================================
11. QUANTITY CHANGE RECIPE
==========================

Create a reusable quantity-control interaction.

For:

* increment
* decrement
* quantity selector

Provide subtle visual feedback.

Avoid excessive movement.

The animation should make the value change feel immediate and responsive.

It must work with the shared QuantitySelector component from Phase 1.

==================================================
12. BOTTOM SHEET MOTION
=======================

Integrate motion behavior with the Bottom Sheet infrastructure established in Phase 1.

Use:

@gorhom/bottom-sheet

Do not create a separate custom bottom-sheet animation engine.

Provide consistent motion configuration for:

* opening
* closing
* snapping
* interaction

Bottom-sheet motion must remain responsive to gestures.

Do not introduce:

* blur
* Liquid Glass
* glassmorphism

The visual style remains based on Sari3 theme tokens.

==================================================
13. MODAL / DIALOG MOTION
=========================

Create reusable motion presets for modal-like UI.

Possible behavior:

* fade backdrop
* subtle scale
* subtle translation
* smooth dismissal

The motion should communicate that the modal is layered above the current content.

Do not use excessive bounce or dramatic transitions.

==================================================
14. SKELETON LOADING
====================

Create a reusable skeleton-loading motion system.

Skeletons should use subtle animated shimmer/pulse behavior.

The skeleton system should support reusable shapes for:

* text
* image
* card
* list item
* product card
* store card

Create reusable skeleton primitives rather than implementing shimmer separately for every screen.

Skeleton animations must be lightweight.

Respect reduced-motion preferences where practical.

If reduced motion is enabled, use a simpler non-animated loading state.

==================================================
15. LOADING STATE TRANSITIONS
=============================

Create reusable transitions between:

* idle
* loading
* success
* error

These transitions should be subtle.

Do not make every loading state animated by default.

The reusable system should allow feature screens to opt into the appropriate transition.

==================================================
16. ORDER STATUS TRANSITIONS
============================

Create reusable motion patterns for order status changes.

Supported statuses include:

* pending
* accepted
* preparing
* out_for_delivery
* delivered
* cancelled

Examples of appropriate motion:

* status indicator transition
* progress transition
* checkmark appearance
* subtle icon transition

Animations must not imply a status change before the actual server state changes.

The server remains the source of truth.

Animation must only represent an already-confirmed state.

==================================================
17. SUCCESS / ERROR FEEDBACK
============================

Create reusable feedback motion patterns.

Success examples:

* order placed
* item added
* favorite added
* address saved

Error examples:

* validation error
* failed action
* unavailable operation

Animations should support the message, not replace it.

Important information must always be communicated with:

* text
* icon
* semantic color

not animation alone.

==================================================
18. GESTURE-BASED INTERACTIONS
==============================

Use Gesture Handler + Reanimated where gestures provide real UX value.

Potential future use cases:

* swipe actions
* interactive bottom sheets
* dismissible elements
* horizontal interactions

Do not add gestures merely because they are technically possible.

Gestures must:

* feel predictable
* respect RTL
* avoid accidental destructive actions
* have clear visual feedback

==================================================
19. HAPTIC MOTION PAIRING
=========================

Use Expo Haptics selectively with meaningful interactions.

Good candidates:

* successful add to cart
* favorite toggle
* successful order placement
* important confirmation
* significant status transition

Avoid haptics for:

* every button press
* scrolling
* every list animation
* decorative animations

Haptic feedback must never be required to understand the UI.

==================================================
20. REDUCED MOTION
==================

The motion system should support reduced-motion preferences where practical.

When reduced motion is enabled:

* reduce movement
* reduce scale
* reduce transition distance
* prefer opacity/state changes
* disable decorative animations
* simplify skeleton animation

Essential state feedback must remain available without motion.

==================================================
21. PERFORMANCE REQUIREMENTS
============================

Animations must run on the UI thread where appropriate through Reanimated.

Avoid animations that cause unnecessary React renders.

Do not use JavaScript-driven animation for interactions that can be handled by Reanimated.

Avoid expensive animated properties when simpler transforms/opacity can achieve the same result.

Prefer:

* transform
* opacity

for highly interactive animations.

Do not animate large layout trees unnecessarily.

Long lists must remain performant.

==================================================
22. ACCESSIBILITY
=================

Animations must not reduce accessibility.

Ensure:

* reduced motion support
* no critical information depends on animation
* sufficient contrast
* touch targets remain stable
* animations do not make controls difficult to use
* focus/interaction behavior remains understandable

Avoid rapid flashing or visually aggressive effects.

==================================================
23. REUSABILITY RULE
====================

Before creating a new animation:

1. Check whether an existing motion recipe can be reused.
2. If similar, extend/configure the existing recipe.
3. Only create a new recipe when the interaction is meaningfully different.

Do NOT create:

* HomeButtonAnimation
* CartButtonAnimation
* ProductButtonAnimation

if they represent the same interaction.

Instead use:

ButtonPressRecipe

with configuration where appropriate.

==================================================
24. MOTION API
==============

Expose a simple reusable API.

For example, the exact implementation may provide abstractions such as:

* usePressAnimation()
* useEntranceAnimation()
* useFavoriteAnimation()
* useScalePress()
* useFadeTransition()
* useSkeletonAnimation()

or reusable animated components/primitives.

The exact API can be determined during implementation.

The important requirement is:

Feature code should not repeatedly define low-level:

withTiming(...)
withSpring(...)
withDelay(...)

for common interactions.

Common animation behavior belongs to the shared motion system.

==================================================
25. ANIMATION INTENSITY
=======================

Animations should feel:

* smooth
* subtle
* responsive
* premium
* friendly

Avoid:

* exaggerated bouncing
* excessive scaling
* long delays
* unnecessary parallax
* constant movement
* animations on everything

The application should feel fast, not slow because of animation.

==================================================
26. PHASE 2 FILE ORGANIZATION
=============================

Keep motion code isolated under:

src/shared/ui/motion/

Recommended conceptual organization:

src/shared/ui/motion/
├── recipes/
│   ├── buttonPress.ts
│   ├── cardPress.ts
│   ├── listEntrance.ts
│   ├── favorite.ts
│   ├── addToCart.ts
│   ├── quantity.ts
│   ├── modal.ts
│   ├── skeleton.ts
│   └── orderStatus.ts
│
├── transitions/
│   └── screen.ts
│
├── hooks/
│   └── ...
│
├── presets.ts
└── index.ts

The exact filenames may be adjusted if the existing project architecture suggests a better organization.

==================================================
27. THIRD-PARTY LIBRARY BOUNDARIES
==================================

The motion system may depend on:

* react-native-reanimated
* react-native-gesture-handler
* expo-haptics
* @gorhom/bottom-sheet

It must NOT depend on:

* Supabase
* Redux business logic
* TanStack Query
* feature repositories
* domain entities

Motion is a presentation concern.

==================================================
28. @expo/ui
============

@expo/ui remains optional.

Do NOT require @expo/ui for the motion system.

If a native UI component from @expo/ui is used later, its animation behavior must still respect the overall Sari3 motion principles.

Do not create platform-specific animation systems unless there is a clear native requirement.

==================================================
29. NO LIQUID GLASS / NO BLUR
=============================

Do NOT introduce:

* expo-blur
* Liquid Glass
* glassmorphism
* blur animations
* translucent glass effects

Motion should enhance the Sari3 visual system without changing its visual language.

==================================================
30. PHASE 2 NON-GOALS
=====================

Do NOT:

* migrate every screen
* redesign screens
* rewrite business logic
* rewrite navigation architecture
* rewrite Supabase logic
* change order state logic
* change cart state logic
* introduce new business rules
* add animations to every existing component
* create duplicated animation systems
* introduce unnecessary animation libraries

Phase 3 will perform the actual screen-by-screen rollout.

==================================================
31. PHASE 2 DELIVERABLE
=======================

At the end of Phase 2, the project should have a reusable motion system containing at minimum:

1. Motion presets/tokens
2. Button press recipe
3. Card press recipe
4. List item entrance recipe
5. Screen transition presets
6. Favorite toggle recipe
7. Add-to-cart feedback recipe
8. Quantity change recipe
9. Bottom-sheet motion integration
10. Modal/dialog motion
11. Skeleton loading animation
12. Loading state transitions
13. Order status transitions
14. Success/error feedback
15. Haptic feedback helpers
16. Reduced-motion handling
17. RTL-aware directional transitions
18. Performance-conscious Reanimated implementation

These recipes must be ready for Phase 3 to consume.

==================================================
32. ACCEPTANCE CRITERIA
=======================

Phase 2 is complete only when:

* Common animations are centralized.
* Feature screens do not need to reinvent common animation logic.
* Button press behavior is reusable.
* Card press behavior is reusable.
* List entrance behavior is reusable.
* Screen transitions have reusable presets.
* Favorite interaction is reusable.
* Add-to-cart feedback is reusable.
* Quantity changes have reusable motion.
* Bottom-sheet motion is integrated with the existing Bottom Sheet infrastructure.
* Skeleton loading has a reusable implementation.
* Order status transitions are reusable.
* Haptic feedback is centralized where appropriate.
* Reduced-motion behavior is supported where practical.
* RTL behavior is respected.
* Animations use Reanimated appropriately.
* Animations do not introduce unnecessary React renders.
* Motion code contains no business logic.
* No Liquid Glass or blur has been introduced.
* @expo/ui remains optional.
* Existing feature architecture remains intact.
* Existing business logic remains intact.
* No complete screen migration has been performed.

The final output of Phase 2 should be a stable, reusable Motion System that Phase 3 can apply incrementally across the Sari3 application.
