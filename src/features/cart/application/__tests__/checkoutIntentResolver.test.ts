import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeIntentFingerprint,
  resolveCheckoutIntent,
} from '../checkoutIntentResolver';
import type { FingerprintInput } from '../checkoutIntentResolver';

describe('checkoutIntentResolver', () => {
  const baseInput: FingerprintInput = {
    storeId: '00000000-0000-0000-0000-000000000101',
    deliveryAddressId: 'ce93b128-e398-4599-b540-3621b55a8e76',
    couponCode: 'SAVE10',
    items: [
      {
        productId: 'prod-1',
        variantId: 'var-1',
        quantity: 2,
        addonIds: ['addon-b', 'addon-a'],
      },
      {
        productId: 'prod-2',
        variantId: null,
        quantity: 1,
        addonIds: [],
      },
    ],
  };

  describe('computeIntentFingerprint', () => {
    it('produces deterministic output regardless of item order', () => {
      const reversedInput: FingerprintInput = {
        ...baseInput,
        items: [baseInput.items[1], baseInput.items[0]],
      };

      const fp1 = computeIntentFingerprint(baseInput);
      const fp2 = computeIntentFingerprint(reversedInput);

      assert.equal(fp1, fp2);
    });

    it('produces deterministic output regardless of addon order', () => {
      const shuffledAddonsInput: FingerprintInput = {
        ...baseInput,
        items: [
          {
            ...baseInput.items[0],
            addonIds: ['addon-a', 'addon-b'],
          },
          baseInput.items[1],
        ],
      };

      const fp1 = computeIntentFingerprint(baseInput);
      const fp2 = computeIntentFingerprint(shuffledAddonsInput);

      assert.equal(fp1, fp2);
    });

    it('changes fingerprint when store changes', () => {
      const changed = { ...baseInput, storeId: 'other-store' };
      assert.notEqual(
        computeIntentFingerprint(changed),
        computeIntentFingerprint(baseInput),
      );
    });

    it('changes fingerprint when delivery address changes', () => {
      const changed = { ...baseInput, deliveryAddressId: 'other-addr' };
      assert.notEqual(
        computeIntentFingerprint(changed),
        computeIntentFingerprint(baseInput),
      );
    });

    it('changes fingerprint when coupon code changes', () => {
      const changed = { ...baseInput, couponCode: 'SAVE20' };
      assert.notEqual(
        computeIntentFingerprint(changed),
        computeIntentFingerprint(baseInput),
      );
    });

    it('handles null or empty coupon code uniformly', () => {
      const withNull = { ...baseInput, couponCode: null };
      const withUndefined = { ...baseInput, couponCode: undefined };
      assert.equal(
        computeIntentFingerprint(withNull),
        computeIntentFingerprint(withUndefined),
      );
    });

    it('changes fingerprint when item quantity changes', () => {
      const changed = {
        ...baseInput,
        items: [{ ...baseInput.items[0], quantity: 3 }, baseInput.items[1]],
      };
      assert.notEqual(
        computeIntentFingerprint(changed),
        computeIntentFingerprint(baseInput),
      );
    });

    it('changes fingerprint when variant changes', () => {
      const changed = {
        ...baseInput,
        items: [{ ...baseInput.items[0], variantId: 'var-2' }, baseInput.items[1]],
      };
      assert.notEqual(
        computeIntentFingerprint(changed),
        computeIntentFingerprint(baseInput),
      );
    });
  });

  describe('resolveCheckoutIntent', () => {
    const mockKeyGenerator = () => '11111111-2222-3333-4444-555555555555';

    it('generates a new key when no stored intent exists', () => {
      const fp = computeIntentFingerprint(baseInput);
      const result = resolveCheckoutIntent({
        currentFingerprint: fp,
        storedIntent: null,
        generateKey: mockKeyGenerator,
      });

      assert.equal(result.idempotencyKey, '11111111-2222-3333-4444-555555555555');
      assert.equal(result.intentFingerprint, fp);
      assert.equal(result.isReused, false);
    });

    it('reuses existing key when stored fingerprint matches current fingerprint', () => {
      const fp = computeIntentFingerprint(baseInput);
      let generatorCalled = false;
      const generator = () => {
        generatorCalled = true;
        return mockKeyGenerator();
      };

      const result = resolveCheckoutIntent({
        currentFingerprint: fp,
        storedIntent: {
          idempotencyKey: 'stored-existing-uuid',
          intentFingerprint: fp,
        },
        generateKey: generator,
      });

      assert.equal(result.idempotencyKey, 'stored-existing-uuid');
      assert.equal(result.intentFingerprint, fp);
      assert.equal(result.isReused, true);
      assert.equal(generatorCalled, false);
    });

    it('rotates to a new key when cart details produce a different fingerprint', () => {
      const oldFp = computeIntentFingerprint(baseInput);
      const newFp = computeIntentFingerprint({
        ...baseInput,
        couponCode: 'NEWCOUPON',
      });
      let callCount = 0;
      const generator = () => {
        callCount++;
        return mockKeyGenerator();
      };

      const result = resolveCheckoutIntent({
        currentFingerprint: newFp,
        storedIntent: {
          idempotencyKey: 'stale-uuid',
          intentFingerprint: oldFp,
        },
        generateKey: generator,
      });

      assert.equal(result.idempotencyKey, '11111111-2222-3333-4444-555555555555');
      assert.equal(result.intentFingerprint, newFp);
      assert.equal(result.isReused, false);
      assert.equal(callCount, 1);
    });
  });
});
