import React from 'react';
import { LoadingState } from './LoadingState';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
}

/**
 * @deprecated legacy alias — superseded by `LoadingState` (feature 009).
 * Kept so existing feature screens keep compiling unchanged.
 */
export function LoadingSpinner({ size, color }: LoadingSpinnerProps) {
  return <LoadingState size={size} color={color} />;
}
