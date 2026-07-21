const sensitiveKeys = new Set([
  'cnic',
  'cnicNumber',
  'passport',
  'passportNumber',
  'drivingLicense',
  'licenseNumber',
  'bankAccount',
  'bankAccountNumber',
  'easypaisaNumber',
  'jazzcashNumber',
  'paymentProof',
  'adminNotes',
  'riskScore',
  'refreshToken',
  'accessToken',
  'password',
  'token',
  'secret',
]);

const MAX_ARRAY_ITEMS = 8;
const MAX_STRING_LENGTH = 600;
const MAX_DEPTH = 5;

const isSensitiveKey = (key: string) => {
  const normalized = key.toLowerCase();
  return sensitiveKeys.has(key) || normalized.includes('secret') || normalized.includes('token') || normalized.includes('password');
};

export const sanitizeForModel = (value: unknown, depth = 0): unknown => {
  if (depth > MAX_DEPTH) return '[truncated]';

  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    const redacted = value
      .replace(/\b\d{5}-?\d{7}-?\d\b/g, '[redacted-id-number]')
      .replace(/\b03\d{2}-?\d{7}\b/g, '[redacted-phone]');
    return redacted.length > MAX_STRING_LENGTH ? `${redacted.slice(0, MAX_STRING_LENGTH)}...` : redacted;
  }

  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeForModel(item, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
      key,
      isSensitiveKey(key) ? '[redacted]' : sanitizeForModel(nestedValue, depth + 1),
    ])
  );
};
