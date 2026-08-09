import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const ITERATIONS = 120000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `${ITERATIONS}:${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [iterations, salt, originalHash] = String(storedHash || '').split(':');
  if (!iterations || !salt || !originalHash) return false;

  const attemptedHash = pbkdf2Sync(password, salt, Number(iterations), KEY_LENGTH, DIGEST);
  const originalBuffer = Buffer.from(originalHash, 'hex');

  return originalBuffer.length === attemptedHash.length && timingSafeEqual(originalBuffer, attemptedHash);
}

