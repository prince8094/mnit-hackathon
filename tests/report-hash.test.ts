import { describe, it, expect } from 'vitest';
import { canonicalizeJson, sha256Hex, computeProjectKey } from '../src/lib/hashing';
import { parseAndValidateDonationsCsv } from '../src/lib/csv';

describe('Report Hashing & Deterministic Canonicalization', () => {
  it('canonicalizes JSON object keys consistently regardless of insertion order', () => {
    const objA = {
      b: 2,
      a: 1,
      nested: { y: 'world', x: 'hello' }
    };

    const objB = {
      nested: { x: 'hello', y: 'world' },
      a: 1,
      b: 2
    };

    const canonicalA = canonicalizeJson(objA);
    const canonicalB = canonicalizeJson(objB);

    expect(canonicalA).toBe(canonicalB);
    expect(canonicalA).toBe('{"a":1,"b":2,"nested":{"x":"hello","y":"world"}}');
  });

  it('produces identical SHA-256 for identically structured objects', async () => {
    const data1 = { title: 'School Kits', amount: '100000.00', version: 1 };
    const data2 = { version: 1, title: 'School Kits', amount: '100000.00' };

    const hash1 = await sha256Hex(canonicalizeJson(data1));
    const hash2 = await sha256Hex(canonicalizeJson(data2));

    expect(hash1).toBe(hash2);
    expect(hash1.startsWith('0x')).toBe(true);
    expect(hash1.length).toBe(66); // '0x' + 64 hex chars
  });

  it('detects even a single character change in report snapshot', async () => {
    const original = { title: 'School Kits', amount: '100000.00' };
    const tampered = { title: 'School Kits', amount: '100000.01' };

    const originalHash = await sha256Hex(canonicalizeJson(original));
    const tamperedHash = await sha256Hex(canonicalizeJson(tampered));

    expect(originalHash).not.toBe(tamperedHash);
  });

  it('computes stable bytes32 projectKey via keccak256', () => {
    const projectUuid = '11111111-1111-1111-1111-111111111111';
    const key1 = computeProjectKey(projectUuid);
    const key2 = computeProjectKey(projectUuid);

    expect(key1).toBe(key2);
    expect(key1.startsWith('0x')).toBe(true);
    expect(key1.length).toBe(66);
  });
});

describe('CSV Parser and Validation (T04, T05)', () => {
  const validCsv = `date,amount,channel,reference,donor
2026-10-01,40000,UPI,DEMO-UPI-001,Donor A
2026-10-03,35000,Bank transfer,DEMO-BANK-002,Donor B
2026-10-05,25000,Crowdfunding,DEMO-CF-003,Donor C
`;

  it('successfully parses valid CSV rows', () => {
    const existing = new Set<string>();
    const res = parseAndValidateDonationsCsv(validCsv, existing);

    expect(res.errors.length).toBe(0);
    expect(res.validRows.length).toBe(3);
    expect(res.validRows[0].amount_received).toBe(40000);
    expect(res.validRows[0].channel).toBe('UPI');
  });

  it('catches invalid dates, negative amounts, and bad channels without crashing', () => {
    const invalidCsv = `date,amount,channel,reference
not-a-date,40000,UPI,REF-1
2026-10-02,-500,UPI,REF-2
2026-10-03,15000,Bitcoin,REF-3
2026-10-04,10000,Bank transfer,REF-4
`;
    const res = parseAndValidateDonationsCsv(invalidCsv, new Set());

    expect(res.validRows.length).toBe(1); // Row 4 is valid
    expect(res.errors.length).toBe(3);
    expect(res.errors.some(e => e.reason.includes('Invalid date'))).toBe(true);
    expect(res.errors.some(e => e.reason.includes('positive number'))).toBe(true);
    expect(res.errors.some(e => e.reason.includes('Invalid channel'))).toBe(true);
  });

  it('detects duplicate source references against existing and within file', () => {
    const existing = new Set<string>(['DEMO-UPI-001']);
    const duplicateCsv = `date,amount,channel,reference
2026-10-01,1000,UPI,DEMO-UPI-001
2026-10-02,2000,UPI,NEW-REF-99
2026-10-03,3000,UPI,NEW-REF-99
`;
    const res = parseAndValidateDonationsCsv(duplicateCsv, existing);

    expect(res.duplicateCount).toBe(2);
    expect(res.validRows.length).toBe(1); // Only the first NEW-REF-99
    expect(res.validRows[0].amount_received).toBe(2000);
  });
});

