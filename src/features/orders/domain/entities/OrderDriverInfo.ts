/**
 * Order-scoped driver contact projection, visible strictly during active
 * fulfillment (BR-008, FR-021, FR-022). No other driver data is exposed.
 */
export interface OrderDriverInfo {
  orderId: string;
  driverName: string;
  driverPhotoUrl: string | null;
  driverPhone: string | null;
}
