import React from 'react';
import { TransitionDemoScreen } from '@/shared/ui/dev/TransitionDemoScreen';

/**
 * Dev demo: `screenTransitions.sheet` preset — modal-like layered content
 * (iOS formSheet presentation; modal fallback elsewhere).
 */
export default function DemoModal() {
  return (
    <TransitionDemoScreen
      preset="sheet"
      description="This screen was pushed with the sheet preset — modal-like presentation for layered content."
    />
  );
}
