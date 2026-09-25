/**
 * Privacy-safe projection of an unclaimed order shown to Available drivers
 * before acceptance (FR-004). Contains only public store information —
 * never the customer's street address, apartment details, or phone number.
 */
export interface AvailableOrderPreview {
  id: string;
  storeName: string;
  /** Store neighbourhood/street (public.restaurants.address), not the customer address. */
  storeNeighbourhood: string;
  itemCount: number;
  createdAt: string;
}
