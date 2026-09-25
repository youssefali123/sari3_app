import { supabase } from '@/shared/lib/supabase';
import { SavedDeliveryAddress } from '../domain/entities/SavedDeliveryAddress';
import {
  AddressRepository,
  CreateAddressInput,
  UpdateAddressInput,
} from '../domain/repositories/AddressRepository';

interface AddressRow {
  id: string;
  customer_id: string;
  label: string;
  address_text: string;
  is_default: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

function mapAddress(row: AddressRow): SavedDeliveryAddress {
  return {
    id: row.id,
    customerId: row.customer_id,
    label: row.label,
    addressText: row.address_text,
    isDefault: row.is_default ?? false,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}

/**
 * Saved addresses CRUD. All queries are customer-scoped by RLS
 * (auth.uid() = customer_id).
 */
export class SupabaseAddressRepository implements AddressRepository {
  async getAddresses(customerId: string): Promise<SavedDeliveryAddress[]> {
    const { data, error } = await supabase
      .from('saved_addresses')
      .select('*')
      .eq('customer_id', customerId)
      .order('is_default', { ascending: false })
      .order('created_at');
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapAddress);
  }

  async createAddress(
    customerId: string,
    input: CreateAddressInput,
  ): Promise<SavedDeliveryAddress> {
    if (input.isDefault) {
      await this.clearDefaultFor(customerId);
    }
    const { data, error } = await supabase
      .from('saved_addresses')
      .insert({
        customer_id: customerId,
        label: input.label,
        address_text: input.addressText,
        is_default: input.isDefault ?? false,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapAddress(data as AddressRow);
  }

  async updateAddress(id: string, input: UpdateAddressInput): Promise<SavedDeliveryAddress> {
    if (input.isDefault) {
      const { data: existing } = await supabase
        .from('saved_addresses')
        .select('customer_id')
        .eq('id', id)
        .single();
      if (existing) {
        await this.clearDefaultFor(existing.customer_id, id);
      }
    }

    const { data, error } = await supabase
      .from('saved_addresses')
      .update({
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.addressText !== undefined ? { address_text: input.addressText } : {}),
        ...(input.isDefault !== undefined ? { is_default: input.isDefault } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapAddress(data as AddressRow);
  }

  async deleteAddress(id: string): Promise<void> {
    const { error } = await supabase.from('saved_addresses').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  private async clearDefaultFor(customerId: string, exceptId?: string): Promise<void> {
    let query = supabase
      .from('saved_addresses')
      .update({ is_default: false })
      .eq('customer_id', customerId);
    if (exceptId) {
      query = query.neq('id', exceptId);
    }
    const { error } = await query;
    if (error) throw new Error(error.message);
  }
}
