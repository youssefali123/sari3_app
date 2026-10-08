/**
 * Public motion layer barrel (feature 010, contracts/motion-api.md §1).
 * The named exports here are the API contract for feature screens and
 * Phase 3 rollout. Feature code MUST consume motion through this barrel;
 * the motion layer itself imports nothing from business or data layers
 * (FR-024 — enforced by the ESLint boundary in eslint.config.js).
 */

// Presets
export { presets } from './presets';
export type { MotionPresets, TimingPreset } from './presets';

// Hooks (shared drivers)
export { useReducedMotion } from './hooks/useReducedMotion';
export {
  usePressAnimation,
  type PressAnimation,
  type PressAnimationOptions,
} from './hooks/usePressAnimation';
export {
  useEntranceAnimation,
  defaultEntranceConfig,
  type EntranceConfig,
  type EntranceDirection,
  type EntranceOptions,
} from './hooks/useEntranceAnimation';
export { useSmoothKeyboardElevation } from './hooks/useSmoothKeyboardElevation';

// Recipes
export { buttonPress } from './recipes/buttonPress';
export { cardPress } from './recipes/cardPress';
export { listEntrance } from './recipes/listEntrance';
export { favoriteToggle, useFavoriteToggleAnimation } from './recipes/favorite';
export {
  addToCartFeedback,
  useAddToCartFeedback,
} from './recipes/addToCart';
export { quantityTick, useQuantityTick } from './recipes/quantity';
export { modalMotion, useModalMotion, type ModalMotion } from './recipes/modal';
export {
  useSkeletonAnimation,
  SkeletonShapes,
  SkeletonShapesConfig,
  SkeletonShape,
  SkeletonText,
  SkeletonImage,
  SkeletonCard,
  SkeletonItem,
  SkeletonProductCard,
  SkeletonStoreCard,
  SkeletonOrderCard,
  SkeletonOrderDetail,
  SkeletonStoreDetail,
  SkeletonProductDetail,
} from './recipes/skeleton';
export {
  loadingTransition,
  useLoadingStateTransition,
  type LoadingPhase,
} from './recipes/loadingStates';
export {
  orderStatusTransition,
  useOrderStatusTransition,
  orderStatusMotion,
  type ConfirmedOrderStatus,
  type StatusPattern,
  type StatusTransitionDescriptor,
} from './recipes/orderStatus';
export {
  outcomeFeedback,
  useOutcomeFeedback,
  type OutcomeKind,
} from './recipes/feedback';

// Screen transitions (Expo Router screenOptions presets)
export {
  screenTransitions,
  type ScreenTransitionOptions,
  type ScreenTransitionPreset,
} from './transitions/screen';

// Config
export { bottomSheetAnimationConfigs } from './config/bottomSheet';
export {
  hapticPairings,
  fireHaptic,
  type HapticMoment,
} from './config/hapticsMap';
