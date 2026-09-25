import { MoneyAmount } from '@/shared/types/common';

/**
 * Formats a monetary amount in integer piasters to Egyptian Pounds.
 * Example: 1500 → "EGP 15.00"
 * Negative amounts are clamped to zero (money values are non-negative).
 */
export function formatCurrency(amount: MoneyAmount): string {
  const piasters = Math.max(0, Math.round(amount));
  return `EGP ${(piasters / 100).toFixed(2)}`;
}

/**
 * Formats an ISO date string to a readable date.
 */
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats an ISO date string to a readable date + time.
 */
export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
