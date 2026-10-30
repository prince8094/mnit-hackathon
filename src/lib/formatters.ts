/**
 * Formats a number into Indian Rupee notation (e.g. ₹1,00,000.00)
 */
export function formatINR(amount: number | string, includeDecimals = true): string {
  const numericVal = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericVal)) return '₹0.00';

  const parts = numericVal.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  const isNegative = integerPart.startsWith('-');
  if (isNegative) {
    integerPart = integerPart.slice(1);
  }

  // Indian comma separation: last 3 digits, then every 2 digits
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  const result = includeDecimals 
    ? `₹${formattedInteger}.${decimalPart}`
    : `₹${formattedInteger}`;

  return isNegative ? `-${result}` : result;
}

/**
 * Format date string into human-friendly format (e.g., "12 Oct 2026")
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Format datetime string into human-friendly format (e.g., "12 Oct 2026, 03:45 PM")
 */
export function formatDateTime(dateString: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

/**
 * Truncate long hash or Ethereum address (e.g., "0xa71b...7e8f")
 */
export function truncateHash(hash: string, startChars = 6, endChars = 4): string {
  if (!hash) return '';
  if (hash.length <= startChars + endChars) return hash;
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

/**
 * Format file size in bytes to human-readable string (KB / MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

