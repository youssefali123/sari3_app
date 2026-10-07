import React from 'react';
import { TransitionDemoScreen } from '@/shared/ui/dev/TransitionDemoScreen';

/** Dev demo: `screenTransitions.horizontal` (RTL-mirrored via _layout). */
export default function DemoHorizontal() {
  return (
    <TransitionDemoScreen
      preset="horizontal"
      description="This screen was pushed with the horizontal slide preset — it mirrors automatically when the app runs in Arabic (RTL)."
    />
  );
}
