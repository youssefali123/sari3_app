/**
 * Customer profile address for selection at checkout (FR-015, FR-016).
 * Editing or deleting a saved address never affects previously placed
 * order snapshots (Principle VII).
 */
export interface SavedDeliveryAddress {
  id: string;
  customerId: string;
  label: string; // e.g., "Home", "Work"
  addressText: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
