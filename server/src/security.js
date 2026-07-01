import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

const secret = process.env.JWT_SECRET || 'dev-only-change-me';
const issuer = process.env.JWT_ISSUER || 'wheels-deals-api';

const base64Url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

export const hashPassword = (password) => {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

export const verifyPassword = (password, stored) => {
  if (!password || !stored) return false;
  const [salt, hash] = stored.split(':');
  const incoming = Buffer.from(scryptSync(password, salt, 64).toString('hex'));
  const current = Buffer.from(hash);
  return incoming.length === current.length && timingSafeEqual(incoming, current);
};

export const signToken = (payload, expiresInSeconds = 60 * 60 * 12) => {
  if (process.env.NODE_ENV === 'production' && secret === 'dev-only-change-me') {
    throw new Error('JWT_SECRET must be configured in production.');
  }
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { ...payload, iss: issuer, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expiresInSeconds };
  const unsigned = `${base64Url(header)}.${base64Url(body)}`;
  const signature = createHmac('sha256', secret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
};

export const verifyToken = (token) => {
  if (!token) return null;
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) return null;

  const expected = Buffer.from(createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url'));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (payload.iss && payload.iss !== issuer) return null;
  return payload;
};

export const createId = (prefix) => `${prefix}-${randomUUID()}`;

export const createOpaqueToken = (prefix = 'token') => `${prefix}-${randomBytes(32).toString('base64url')}`;

export const hashOpaqueToken = (token) => createHmac('sha256', secret).update(String(token || '')).digest('hex');

export const validatePasswordPolicy = (password = '') => {
  const failures = [];
  if (password.length < 10) failures.push('at least 10 characters');
  if (!/[A-Z]/.test(password)) failures.push('one uppercase letter');
  if (!/[a-z]/.test(password)) failures.push('one lowercase letter');
  if (!/[0-9]/.test(password)) failures.push('one number');
  if (!/[^A-Za-z0-9]/.test(password)) failures.push('one symbol');
  return {
    ok: failures.length === 0,
    failures,
    message: failures.length ? `Password must include ${failures.join(', ')}.` : 'Password meets policy.',
  };
};
