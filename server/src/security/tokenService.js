import { createHmac, randomUUID } from 'node:crypto';
import { HttpError } from '../shared/httpError.js';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const GUEST_TOKEN_TTL_SECONDS = 2 * 60 * 60;

function getSecret() {
  return process.env.JWT_SECRET || 'syncspace-dev-secret-change-before-production';
}

function base64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(input) {
  return createHmac('sha256', getSecret()).update(input).digest('base64url');
}

function createToken(payload, ttlSeconds, type) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = {
    ...payload,
    type,
    iat: now,
    exp: now + ttlSeconds,
    jti: randomUUID()
  };
  const unsignedToken = `${base64Url(header)}.${base64Url(body)}`;
  return `${unsignedToken}.${sign(unsignedToken)}`;
}

export function createAuthTokens(user) {
  const tokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    guest: Boolean(user.guest)
  };

  return {
    accessToken: createToken(tokenPayload, ACCESS_TOKEN_TTL_SECONDS, 'access'),
    refreshToken: createToken(tokenPayload, REFRESH_TOKEN_TTL_SECONDS, 'refresh')
  };
}

export function createGuestToken(guest) {
  return createToken({
    sub: guest.id,
    name: guest.name,
    role: 'viewer',
    guest: true
  }, GUEST_TOKEN_TTL_SECONDS, 'access');
}

export function verifyToken(token, expectedType = 'access') {
  const [encodedHeader, encodedBody, signature] = String(token || '').split('.');
  if (!encodedHeader || !encodedBody || !signature) {
    throw new HttpError(401, 'Invalid token.');
  }

  const unsignedToken = `${encodedHeader}.${encodedBody}`;
  if (sign(unsignedToken) !== signature) {
    throw new HttpError(401, 'Invalid token signature.');
  }

  const payload = JSON.parse(Buffer.from(encodedBody, 'base64url').toString('utf8'));
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp <= now) {
    throw new HttpError(401, 'Token has expired.');
  }

  if (payload.type !== expectedType) {
    throw new HttpError(401, 'Invalid token type.');
  }

  return payload;
}

