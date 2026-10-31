import QRCode from 'qrcode';
import { DistributionBatch, DeliveryToken, Project } from '../types';

/**
 * Computes SHA-256 digest of an acknowledgement token
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface GeneratedTokenCard {
  token: string;
  tokenHash: string;
  recipientIndex: number;
  acknowledgementUrl: string;
  qrDataUrl: string;
}

/**
 * Generates secure, unguessable one-time tokens and corresponding QR codes for a distribution batch.
 * Raw tokens are generated client-side for QR printing, but ONLY token hashes are stored in the database.
 * No beneficiary PII is collected or embedded.
 */
export async function generateTokensForBatch(
  batch: DistributionBatch,
  baseUrl: string = window.location.origin
): Promise<{
  cards: GeneratedTokenCard[];
  tokensToStore: DeliveryToken[];
}> {
  const cards: GeneratedTokenCard[] = [];
  const tokensToStore: DeliveryToken[] = [];
  const now = new Date();
  // Tokens expire in 60 days
  const expiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

  for (let i = 1; i <= batch.expected_quantity; i++) {
    // Generate secure cryptographically random 32-byte hex token
    const randomBytes = new Uint8Array(24);
    crypto.getRandomValues(randomBytes);
    const rawToken = 'ft_ack_' + Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    const tokenHash = await hashToken(rawToken);

    const acknowledgementUrl = `${baseUrl}/ack/${rawToken}`;
    
    // Generate QR code data URL (lightweight PNG)
    const qrDataUrl = await QRCode.toDataURL(acknowledgementUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });

    cards.push({
      token: rawToken,
      tokenHash,
      recipientIndex: i,
      acknowledgementUrl,
      qrDataUrl
    });

    tokensToStore.push({
      id: `tok-${batch.id}-${i}`,
      organization_id: batch.organization_id,
      project_id: batch.project_id,
      batch_id: batch.id,
      token_hash: tokenHash,
      recipient_index: i,
      status: 'ISSUED',
      expires_at: expiresAt,
      created_at: now.toISOString()
    });
  }

  return { cards, tokensToStore };
}

export interface DeliveryAggregateStats {
  totalExpected: number;
  totalAcknowledged: number;
  totalPending: number;
  acknowledgementRatePercent: number;
  batchesCount: number;
}

/**
 * Calculates aggregate delivery statistics across all batches of a project.
 */
export function calculateDeliveryAggregates(batches: DistributionBatch[]): DeliveryAggregateStats {
  let totalExpected = 0;
  let totalAcknowledged = 0;

  for (const b of batches) {
    totalExpected += b.expected_quantity || 0;
    totalAcknowledged += b.acknowledged_count || 0;
  }

  const totalPending = Math.max(0, totalExpected - totalAcknowledged);
  const acknowledgementRatePercent = totalExpected > 0 ? Math.round((totalAcknowledged / totalExpected) * 100) : 0;

  return {
    totalExpected,
    totalAcknowledged,
    totalPending,
    acknowledgementRatePercent,
    batchesCount: batches.length
  };
}

