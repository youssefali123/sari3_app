import React from 'react';
import { ErrorState } from './ErrorState';

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * @deprecated legacy alias — superseded by `ErrorState` (feature 009).
 * Kept so existing feature screens keep compiling unchanged.
 */
export function ErrorView({ message, onRetry }: ErrorViewProps) {
  return <ErrorState title="Something went wrong" message={message} onRetry={onRetry} />;
}
