# Motion API Contract: Reusable Motion & Interaction System (UI Phase 2)

**Feature**: `010-reusable-motion-system`
**Date**: 2026-09-29
**Status**: Completed
**Spec Reference**: [spec.md](../spec.md) | **Data Model**: [data-model.md](../data-model.md)

---

## 1. Public Surface (`src/shared/ui/motion/index.ts` barrel)

```typescript
// Presets
export { presets } from './presets';
// Hooks
export { useReducedMotion } from './hooks/useReducedMotion';
export { usePressAnimation } from './hooks/usePressAnimation';
export { useEntranceAnimation } from './hooks/useEntranceAnimation';
// Recipes (each: pure configuration + worklet-safe helpers, no JSX dependencies beyond RN primitives)
export { buttonPress, cardPress } from './recipes/press';
export { listEntrance } from './recipes/listEntrance';
export { screenTransitions } from './transitions/screen';
export { favoriteToggle } from './recipes/favorite';
export { addToCartFeedback } from './recipes/addToCart';
export { quantityTick } from './recipes/quantity';
export { modalMotion } from './recipes/modal';
export { useSkeletonAnimation, SkeletonShapes } from './recipes/skeleton';
export { loadingTransition } from './recipes/loadingStates';
export { orderStatusTransition } from './recipes/orderStatus';
export { outcomeFeedback } from './recipes/feedback';
// Config
export { bottomSheetAnimationConfigs } from './config/bottomSheet';
export { hapticPairings } from './config/hapticsMap';
```

Exact file splits may adjust at implementation; the barrel's named exports are the contract.

## 2. Consumer Obligations (binding on all call sites)

1. **Confirmed states only**: recipes receive post-confirmation values (e.g., order status after server ack). Motion code never triggers fetches, writes, or navigation.
2. **Reduced motion**: consumers use durations/tokens supplied by recipes (already `safeMotionDuration`-wrapped); they MUST NOT substitute raw millisecond literals for covered interactions.
3. **RTL**: directional arguments (`enterFrom`, slide axes) default to locale-mirrored values; call sites MUST NOT hardcode physical directions.
4. **Disabled/loading/opt-out**: consumers pass through existing `disabled`/`loading` props and honor opt-in-only lists — recipes short-circuit internally.
5. **Haptics**: call sites invoke only `hapticPairings[moment]`; direct `expo-haptics` (or wrapper) calls for routine interactions are forbidden.
6. **No new recipes for old interactions**: a screen needing "a slightly different button press" configures `buttonPress`; it does not fork it (reusability rule, FR-023).

## 3. In-Place Integrations (the only production edits)

| Component | Change | Non-goals |
|---|---|---|
| `shared/ui/components/Button.tsx` | Consume `usePressAnimation` + disabled/loading branches; props/API unchanged | No new component; no visual redesign |
| `shared/ui/components/QuantitySelector.tsx` | Consume `quantityTick`; props/API unchanged | No behavior change |
| `shared/ui/components/Sari3BottomSheet.tsx` | Consume `bottomSheetAnimationConfigs`; props/API unchanged | No backdrop/style change; no blur |
| `shared/ui/theme/motion.ts` | Additive spring configs only | No edits to existing token values |
| App root | Wire Reanimated live `useReducedMotion()` via provider (no startup cache) | No settings UI; no persistence |

## 4. Import Boundary (mechanically enforced)

ESLint `no-restricted-imports` scoped to `src/shared/ui/motion/**` denies: `@/features/*`, data-layer paths, `react-redux`, `@tanstack/*`, `expo-router`. Allowed: `react`, `react-native`, `react-native-reanimated`, `react-native-gesture-handler`, `expo-haptics` (via wrapper only), `@gorhom/bottom-sheet` types/config, `@/shared/ui/theme`, `@/shared/ui/utils`.

## 5. Gallery Contract (`app/(dev)/motion-gallery.tsx`, dev-only)

Renders every recipe × state (all button variants incl. disabled/loading; entrances short + long lists; transitions; favorite/cart/quantity/success/error; skeletons ×6 shapes; order statuses ×6) in LTR and RTL, with a reduced-motion readout reflecting the OS setting. Excluded from production navigation. Serves as Phase 3 consumer documentation.
