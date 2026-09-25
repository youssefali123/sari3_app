import { SavedDeliveryAddress } from '../entities/SavedDeliveryAddress';

export interface CreateAddressInput {
  label: string;
  addressText: string;
  isDefault?: boolean;
}

export interface UpdateAddressInput {
  label?: string;
  addressText?: string;
  isDefault?: boolean;
}

/**
 * Abstraction for saved delivery address CRUD.
 */
export interface AddressRepository {
  /**
   * Retrieve all saved addresses for a customer.
   */
  getAddresses(customerId: string): Promise<SavedDeliveryAddress[]>;

  /**
   * Create a new saved delivery address.
   */
  createAddress(customerId: string, input: CreateAddressInput): Promise<SavedDeliveryAddress>;

  /**
   * Update an existing delivery address.
   */
  updateAddress(id: string, input: UpdateAddressInput): Promise<SavedDeliveryAddress>;

  /**
   * Delete a saved delivery address.
   */
  deleteAddress(id: string): Promise<void>;
}
