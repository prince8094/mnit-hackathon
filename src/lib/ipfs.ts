/**
 * IPFS Evidence Upload Helper
 * Communicates with server-side /api/ipfs/upload endpoint.
 * Keeps PINATA_JWT secure on the server side (never exposed to client).
 */

export interface IPFSUploadResult {
  success: boolean;
  cid?: string;
  gatewayUrl?: string;
  fileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  error?: string;
  isPendingConfig?: boolean;
}

export async function uploadEvidenceToIPFS(file: File): Promise<IPFSUploadResult> {
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
  const lowerName = file.name.toLowerCase();
  const isAllowed = allowedExtensions.some(ext => lowerName.endsWith(ext));

  if (!isAllowed) {
    return {
      success: false,
      error: `Unsupported format "${file.name}". Only PDF invoices and image receipts (JPG, PNG) are permitted.`
    };
  }

  // 10 MB limit
  if (file.size > 10 * 1024 * 1024) {
    return {
      success: false,
      error: `File size exceeds the 10 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`
    };
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/ipfs/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errData.error || `Upload failed with status ${response.status}`,
        isPendingConfig: errData.isPendingConfig
      };
    }

    const data = await response.json();
    return {
      success: true,
      cid: data.cid,
      gatewayUrl: data.gatewayUrl || `https://gateway.pinata.cloud/ipfs/${data.cid}`,
      fileName: file.name,
      fileSizeBytes: file.size,
      mimeType: file.type
    };
  } catch (err: any) {
    console.warn('IPFS upload network notice:', err);
    return {
      success: false,
      error: err.message || 'Network error while uploading evidence to IPFS.'
    };
  }
}

/**
 * Helper to build accessible gateway link for an IPFS CID
 */
export function getIPFSGatewayUrl(cid: string): string {
  if (!cid) return '#';
  if (cid.startsWith('http://') || cid.startsWith('https://')) return cid;
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

