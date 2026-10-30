import Papa from 'papaparse';
import { CSVImportResult, DonationChannel, RowValidationError } from '../types';

const VALID_CHANNELS: DonationChannel[] = [
  'UPI',
  'Bank transfer',
  'Crowdfunding',
  'Cash',
  'Cheque',
  'Other'
];

/**
 * Parses and validates CSV donation file.
 * Checks for:
 * - valid numeric amount > 0
 * - valid date
 * - valid donation channel
 * - duplicate source references (within CSV and against existing references)
 */
export function parseAndValidateDonationsCsv(
  csvContent: string,
  existingReferences: Set<string>
): CSVImportResult {
  const result: CSVImportResult = {
    validRows: [],
    errors: [],
    duplicateCount: 0,
    duplicatesSkipped: []
  };

  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/[\s_-]+/g, '')
  });

  if (parsed.errors && parsed.errors.length > 0) {
    parsed.errors.forEach(err => {
      result.errors.push({
        rowNumber: err.row ? err.row + 1 : 0,
        raw: null,
        reason: err.message
      });
    });
  }

  const seenInCsv = new Set<string>();

  parsed.data.forEach((row: any, index: number) => {
    const rowNumber = index + 2; // +1 for 0-index, +1 for header row
    
    // Header keys variations
    const rawDate = row['date'] || row['receivedat'] || row['donationdate'] || '';
    const rawAmount = row['amount'] || row['amountreceived'] || row['inr'] || '';
    const rawChannel = row['channel'] || row['paymentmethod'] || row['source'] || '';
    const rawRef = row['reference'] || row['sourcereference'] || row['ref'] || row['txnid'] || '';
    const rawDonor = row['donor'] || row['privatedonorlabel'] || row['donorname'] || '';

    // Validate Date
    if (!rawDate || !rawDate.trim()) {
      result.errors.push({
        rowNumber,
        raw: row,
        reason: 'Missing date'
      });
      return;
    }
    const parsedDate = new Date(rawDate.trim());
    if (isNaN(parsedDate.getTime())) {
      result.errors.push({
        rowNumber,
        raw: row,
        reason: `Invalid date format: "${rawDate}"`
      });
      return;
    }
    const formattedDate = parsedDate.toISOString().split('T')[0];

    // Validate Amount
    const cleanAmountStr = String(rawAmount).replace(/[₹,\s]/g, '').trim();
    const amountNum = parseFloat(cleanAmountStr);
    if (isNaN(amountNum) || amountNum <= 0) {
      result.errors.push({
        rowNumber,
        raw: row,
        reason: `Donation amount must be a positive number (found "${rawAmount}")`
      });
      return;
    }

    // Validate Channel
    const normalizedChannel = VALID_CHANNELS.find(
      c => c.toLowerCase() === rawChannel.trim().toLowerCase()
    );
    if (!normalizedChannel) {
      result.errors.push({
        rowNumber,
        raw: row,
        reason: `Invalid channel "${rawChannel}". Allowed: ${VALID_CHANNELS.join(', ')}`
      });
      return;
    }

    // Check duplicate reference
    const ref = rawRef ? rawRef.trim() : null;
    if (ref) {
      if (existingReferences.has(ref) || seenInCsv.has(ref)) {
        result.duplicateCount++;
        result.duplicatesSkipped.push(ref);
        result.errors.push({
          rowNumber,
          raw: row,
          reason: `Duplicate source reference "${ref}" (already recorded in project or duplicate in file)`
        });
        return;
      }
      seenInCsv.add(ref);
    }

    result.validRows.push({
      amount_received: amountNum,
      received_at: formattedDate,
      channel: normalizedChannel,
      source_reference: ref,
      private_donor_label: rawDonor ? rawDonor.trim() : null
    });
  });

  return result;
}

/**
 * Returns a ready-to-download CSV sample template
 */
export function getSampleDonationsCsv(): string {
  return `date,amount,channel,reference,donor
2026-10-01,40000,UPI,DEMO-UPI-001,Donor Batch Alpha (Private)
2026-10-03,35000,Bank transfer,DEMO-BANK-002,Corporate Match Supporter
2026-10-05,25000,Crowdfunding,DEMO-CF-003,Online Supporters Pool
`;
}

