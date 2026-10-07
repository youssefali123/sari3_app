/**
 * Motion tokens (feature 009) — durations for Reanimated `withTiming` and
 * standard cubic-bezier easing curves.
 */
export interface SpringConfig {
  damping: number;
  stiffness: number;
  mass: number;
}

export interface MotionTokens {
  // Durations (ms)
  durationFast:   number;
  durationNormal: number;
  durationSlow:   number;

  // Easing curves — standard cubic bezier string representations
  easingStandard:    string;   // Default transitions
  easingEmphasized:  string;   // Expand / hero transitions
  easingDecelerated: string;   // Enter-screen motion
  easingAccelerated: string;   // Exit-screen motion

  // Springs (Reanimated `withSpring` damping/stiffness/mass — 010 additive
  // extension; Phase 1 duration/easing values are never edited)
  springInteractive: SpringConfig; // finger-following motion (stiff, under-damped)
  springSnappy:      SpringConfig; // quick settles (high-stiffness, near-critical)
}

export const motion: MotionTokens = {
  durationFast:   150,
  durationNormal: 250,
  durationSlow:   400,

  easingStandard:    'cubic-bezier(0.4, 0.0, 0.2, 1.0)',
  easingEmphasized:  'cubic-bezier(0.2, 0.0, 0.0, 1.0)',
  easingDecelerated: 'cubic-bezier(0.0, 0.0, 0.2, 1.0)',
  easingAccelerated: 'cubic-bezier(0.4, 0.0, 1.0, 1.0)',

  // critical damping ≈ 2·√(stiffness·mass); 28 < 40 → under-damped
  springInteractive: { damping: 28, stiffness: 400, mass: 1 },
  // 50 ≈ 2·√700 ≈ 52.9 → near-critically damped
  springSnappy:      { damping: 50, stiffness: 700, mass: 1 },
};
