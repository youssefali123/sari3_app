import {
  EntranceConfig,
  EntranceOptions,
  defaultEntranceConfig,
} from '../hooks/useEntranceAnimation';

/**
 * List entrance recipe (feature 010 FR-006/FR-007) — the single entrance
 * language for every opted-in browse list. Returns configuration for
 * `useEntranceAnimation(index, config)`; call sites pass their item index
 * and a stable item key. Strictly opt-in per list (FR-007) — nothing is
 * forced, and rollout decisions belong to Phase 3 (FR-028).
 */
export function listEntrance(
  overrides: Partial<EntranceConfig> = {},
): EntranceOptions {
  const config: EntranceConfig = { ...defaultEntranceConfig, ...overrides };
  return config;
}
