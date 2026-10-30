import { keccak256, toUtf8Bytes } from 'ethers';

/**
 * Deterministically sorts all object keys recursively so JSON serialization is canonical.
 */
export function canonicalizeJson(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(item => canonicalizeJson(item)).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj).sort();
  const entries: string[] = [];

  for (const key of sortedKeys) {
    const val = obj[key];
    if (val !== undefined) {
      entries.push(`${JSON.stringify(key)}:${canonicalizeJson(val)}`);
    }
  }

  return '{' + entries.join(',') + '}';
}

/**
 * Computes SHA-256 hash using the Web Crypto API, returning a 0x-prefixed 64-char hex string (bytes32).
 */
export async function sha256Hex(data: string | Uint8Array | ArrayBuffer): Promise<string> {
  let buffer: BufferSource;

  if (typeof data === 'string') {
    const encoder = new TextEncoder();
    buffer = encoder.encode(data) as unknown as BufferSource;
  } else if (data instanceof Uint8Array) {
    buffer = data as unknown as BufferSource;
  } else {
    buffer = data as unknown as BufferSource;
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexString = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `0x${hexString}`;
}

/**
 * Compute SHA-256 hash directly from a browser File object.
 */
export async function hashFileSHA256(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  return sha256Hex(arrayBuffer);
}

/**
 * Computes deterministic bytes32 projectKey using keccak256 on the project UUID string.
 */
export function computeProjectKey(projectUuid: string): string {
  return keccak256(toUtf8Bytes(projectUuid));
}
