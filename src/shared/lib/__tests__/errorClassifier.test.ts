import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isNetworkError,
  getPostgresErrorCode,
  getErrorMessageString,
} from '../errorClassifier';
import { classifyOrderError } from '@/features/orders/infrastructure/orderErrorClassifier';
import { getOrderErrorMessage, ordersArabicErrorMessages } from '@/features/orders/presentation/messages/ordersErrorMessages.ar';
import { classifyDriverError } from '@/features/drivers/infrastructure/driverErrorClassifier';
import { getDriverErrorMessage, driversArabicErrorMessages } from '@/features/drivers/presentation/messages/driversErrorMessages.ar';
import { classifyAddressError } from '@/features/addresses/infrastructure/addressErrorClassifier';
import { getAddressErrorMessage, addressesArabicErrorMessages } from '@/features/addresses/presentation/messages/addressesErrorMessages.ar';
import { sharedArabicErrorMessages } from '@/shared/ui/messages/sharedErrorMessages.ar';

describe('Error Classifier & Localized Dictionary Tests', () => {
  describe('isNetworkError', () => {
    it('detects network fetch failures', () => {
      assert.equal(isNetworkError(new Error('Network request failed')), true);
      assert.equal(isNetworkError(new Error('Failed to fetch')), true);
      assert.equal(isNetworkError(new Error('TypeError: Failed to fetch')), true);
      assert.equal(isNetworkError({ message: 'The Internet connection appears to be offline.' }), true);
      assert.equal(isNetworkError(new Error('AbortError: The operation was aborted')), true);
    });

    it('returns false for backend/application errors', () => {
      assert.equal(isNetworkError(new Error('STORE_CLOSED')), false);
      assert.equal(isNetworkError({ code: '23505' }), false);
      assert.equal(isNetworkError(new Error('Invalid credentials')), false);
    });
  });

  describe('getPostgresErrorCode', () => {
    it('extracts top-level error codes', () => {
      assert.equal(getPostgresErrorCode({ code: '23505' }), '23505');
      assert.equal(getPostgresErrorCode({ code: '42501' }), '42501');
    });

    it('extracts nested error codes', () => {
      assert.equal(
        getPostgresErrorCode({ error: { code: 'P0002' } }),
        'P0002',
      );
    });

    it('extracts error codes embedded in messages', () => {
      assert.equal(
        getPostgresErrorCode(new Error('duplicate key value violates unique constraint "orders_pkey" (SQLSTATE 23505)')),
        '23505',
      );
    });
  });

  describe('classifyOrderError', () => {
    it('classifies store closed error', () => {
      const err = classifyOrderError(new Error('STORE_CLOSED: store is not accepting orders'));
      assert.equal(err.kind, 'store_closed');
      assert.equal(getOrderErrorMessage(err.kind), ordersArabicErrorMessages.store_closed);
    });

    it('classifies duplicate order / idempotency race (23505)', () => {
      const err = classifyOrderError({ code: '23505', message: 'duplicate key' });
      assert.equal(err.kind, 'duplicate_idempotency');
      assert.equal(getOrderErrorMessage(err.kind), ordersArabicErrorMessages.duplicate_idempotency);
    });

    it('classifies network error', () => {
      const err = classifyOrderError(new Error('Network request failed'));
      assert.equal(err.kind, 'network_error');
      assert.equal(getOrderErrorMessage(err.kind), ordersArabicErrorMessages.network_error);
    });

    it('classifies PGRST116 / 0 rows as order_not_found', () => {
      const err = classifyOrderError({
        code: 'PGRST116',
        details: 'The result contains 0 rows',
        message: 'Cannot coerce the result to a single JSON object',
      });
      assert.equal(err.kind, 'order_not_found');
      assert.equal(getOrderErrorMessage(err.kind), ordersArabicErrorMessages.order_not_found);
    });

    it('returns existing OrderException instance idempotently without re-wrapping', () => {
      const initial = classifyOrderError(new Error('STORE_CLOSED'));
      const second = classifyOrderError(initial);
      assert.strictEqual(initial, second);
    });
  });

  describe('classifyDriverError', () => {
    it('classifies active order conflict race (23505)', () => {
      const err = classifyDriverError({ code: '23505', message: 'driver has active order' });
      assert.equal(err.kind, 'driver_already_has_active_order');
      assert.equal(getDriverErrorMessage(err.kind), driversArabicErrorMessages.driver_already_has_active_order);
    });

    it('classifies order status change conflicts', () => {
      const err = classifyDriverError(new Error('ORDER_STATUS_CHANGED'));
      assert.equal(err.kind, 'invalid_status_transition');
      assert.equal(getDriverErrorMessage(err.kind), driversArabicErrorMessages.invalid_status_transition);
    });

    it('classifies PGRST116 as order_not_found_or_not_assigned', () => {
      const err = classifyDriverError({
        code: 'PGRST116',
        details: 'The result contains 0 rows',
        message: 'Cannot coerce the result to a single JSON object',
      });
      assert.equal(err.kind, 'order_not_found_or_not_assigned');
      assert.equal(getDriverErrorMessage(err.kind), driversArabicErrorMessages.order_not_found_or_not_assigned);
    });
  });

  describe('classifyAddressError', () => {
    it('classifies unauthorized error (42501)', () => {
      const err = classifyAddressError({ code: '42501', message: 'permission denied' });
      assert.equal(err.kind, 'unauthorized');
      assert.equal(getAddressErrorMessage(err.kind), addressesArabicErrorMessages.unauthorized);
    });

    it('classifies validation errors', () => {
      const err = classifyAddressError(new Error('VALIDATION_FAILED: missing street'));
      assert.equal(err.kind, 'validation_failed');
      assert.equal(getAddressErrorMessage(err.kind), addressesArabicErrorMessages.validation_failed);
    });
  });

  describe('Localized Arabic Dictionaries Integrity', () => {
    it('ensures all orders error messages are non-empty Arabic strings', () => {
      for (const [key, msg] of Object.entries(ordersArabicErrorMessages)) {
        assert.ok(msg && msg.length > 0, `Missing message for orders key: ${key}`);
        assert.ok(!msg.includes('undefined'), `Undefined in message: ${key}`);
      }
    });

    it('ensures all drivers error messages are non-empty Arabic strings', () => {
      for (const [key, msg] of Object.entries(driversArabicErrorMessages)) {
        assert.ok(msg && msg.length > 0, `Missing message for drivers key: ${key}`);
      }
    });

    it('ensures all shared error messages are non-empty Arabic strings', () => {
      for (const [key, msg] of Object.entries(sharedArabicErrorMessages)) {
        assert.ok(msg && msg.length > 0, `Missing message for shared key: ${key}`);
      }
    });
  });
});
