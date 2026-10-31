import { describe, it, expect } from 'vitest';
import {
  generateTokensForBatch,
  hashToken,
  calculateDeliveryAggregates
} from '../src/lib/proof-of-delivery';
import { DistributionBatch, DeliveryToken } from '../src/types';
import { store } from '../src/lib/store';

describe('Feature 2: QR-Based Proof of Delivery', () => {
  const mockBatch: DistributionBatch = {
    id: 'batch-test-01',
    organization_id: 'org-test-01',
    project_id: 'proj-test-01',
    batch_number: 'BATCH-01',
    batch_name: 'Jaipur Rural School Distribution',
    distribution_date: '2026-10-25',
    location_or_institution: 'Govt School Sanganer',
    item_description: 'School Kit (Bag + Stationery)',
    expected_quantity: 5,
    acknowledged_count: 0,
    status: 'IN_PROGRESS',
    created_at: '2026-10-20T00:00:00Z',
    updated_at: '2026-10-20T00:00:00Z'
  };

  it('generates secure random single-use tokens and QR data URLs', async () => {
    const { cards, tokensToStore } = await generateTokensForBatch(mockBatch, 'https://fundtrail.org');

    expect(cards.length).toBe(5);
    expect(tokensToStore.length).toBe(5);

    // Tokens must be unique and unguessable
    const tokenSet = new Set(cards.map((c) => c.token));
    expect(tokenSet.size).toBe(5);

    cards.forEach((c, idx) => {
      expect(c.token.startsWith('ft_ack_')).toBe(true);
      expect(c.token.length).toBeGreaterThanOrEqual(30);
      expect(c.recipientIndex).toBe(idx + 1);
      expect(c.acknowledgementUrl).toBe(`https://fundtrail.org/ack/${c.token}`);
      expect(c.qrDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });

    // Check tokens to store have valid SHA-256 hashes and expiry dates
    tokensToStore.forEach((t) => {
      expect(t.status).toBe('ISSUED');
      expect(t.token_hash.startsWith('0x')).toBe(true);
      expect(t.token_hash.length).toBe(66);
      expect(new Date(t.expires_at).getTime()).toBeGreaterThan(Date.now());
    });
  });

  it('stores token hashes in the store and executes atomic redemption', async () => {
    const { cards, tokensToStore } = await generateTokensForBatch(mockBatch, 'http://localhost:5173');
    
    // Store batch and tokens in store
    await store.createDistributionBatch(mockBatch);
    await store.storeDeliveryTokens(tokensToStore);

    const testCard = cards[0];

    // First redemption attempt must succeed
    const firstRedeem = await store.redeemDeliveryToken(testCard.token);
    expect(firstRedeem.success).toBe(true);
    expect(firstRedeem.redeemed_at).toBeDefined();

    // Recheck batch in store: acknowledged_count should be 1
    const updatedBatches = store.getDistributionBatches(mockBatch.project_id);
    const updatedBatch = updatedBatches.find((b) => b.id === mockBatch.id);
    expect(updatedBatch?.acknowledged_count).toBe(1);

    // Second redemption attempt with the same token MUST fail (Anti-Replay / Single-Use Guarantee)
    const secondRedeem = await store.redeemDeliveryToken(testCard.token);
    expect(secondRedeem.success).toBe(false);
    expect(secondRedeem.error).toBe('ALREADY_REDEEMED');
    expect(secondRedeem.message).toContain('already been acknowledged');
  });

  it('rejects invalid or unknown tokens', async () => {
    const fakeToken = 'ft_ack_fake_token_not_in_database_99999';
    const res = await store.redeemDeliveryToken(fakeToken);

    expect(res.success).toBe(false);
    expect(res.error).toBe('INVALID_TOKEN');
  });

  it('calculates aggregate delivery statistics correctly without PII', () => {
    const testBatches: DistributionBatch[] = [
      {
        ...mockBatch,
        id: 'b-1',
        expected_quantity: 100,
        acknowledged_count: 85
      },
      {
        ...mockBatch,
        id: 'b-2',
        expected_quantity: 50,
        acknowledged_count: 35
      }
    ];

    const aggregates = calculateDeliveryAggregates(testBatches);

    expect(aggregates.totalExpected).toBe(150);
    expect(aggregates.totalAcknowledged).toBe(120);
    expect(aggregates.totalPending).toBe(30);
    expect(aggregates.acknowledgementRatePercent).toBe(80); // 120 / 150 = 80%
    expect(aggregates.batchesCount).toBe(2);
  });
});

