/**
 * Audit trail of driver actions that either do not change the order's
 * lifecycle status (declining an unclaimed order) or revert it to the
 * shared pool (releasing an active order with a mandatory reason).
 */
export type InteractionType = 'declined' | 'released';

export interface DriverOrderInteraction {
  id: string;
  driverId: string;
  orderId: string;
  interactionType: InteractionType;
  /** Mandatory for 'released', null for 'declined'. */
  reason: string | null;
  createdAt: string;
}
