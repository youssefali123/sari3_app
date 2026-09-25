/**
 * Represents a driver's profile information.
 */
export interface DriverProfile {
  id: string;
  userId: string;
  vehicleType: string | null;
  licensePlate: string | null;
  isAvailable: boolean;
  currentOrderId: string | null;
  createdAt: string;
  updatedAt: string;
}
