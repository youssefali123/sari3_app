/**
 * A discriminated union representing the result of an operation
 * that can either succeed or fail.
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * A paginated response from the server.
 */
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * A function that unsubscribes from a subscription.
 */
export type Unsubscribe = () => void;

/**
 * A universally unique identifier (UUID v4).
 */
export type UUID = string;

/**
 * Represents a monetary amount in the smallest currency unit (e.g., cents).
 */
export type MoneyAmount = number;
