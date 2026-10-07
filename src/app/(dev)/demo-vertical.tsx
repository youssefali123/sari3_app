import React from 'react';
import { TransitionDemoScreen } from '@/shared/ui/dev/TransitionDemoScreen';

/** Dev demo: `screenTransitions.vertical` preset. */
export default function DemoVertical() {
  return (
    <TransitionDemoScreen
      preset="vertical"
      description="This screen was pushed with the vertical slide preset (slide_from_bottom)."
    />
  );
}
