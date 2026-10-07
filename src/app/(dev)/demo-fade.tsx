import React from 'react';
import { TransitionDemoScreen } from '@/shared/ui/dev/TransitionDemoScreen';

/** Dev demo: `screenTransitions.fade` preset (route options set in _layout). */
export default function DemoFade() {
  return (
    <TransitionDemoScreen
      preset="fade"
      description="This screen was pushed with the fade preset — direction-neutral cross-fade."
    />
  );
}
