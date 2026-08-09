import { randomUUID } from 'node:crypto';
import { hashPassword } from '../security/passwordService.js';

const usersById = new Map();
const usersByEmail = new Map();
const revokedRefreshTokens = new Set();

export function createUser({ name, email, password, role = 'editor' }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = {
    id: randomUUID(),
    name: String(name || '').trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    role,
    createdAt: new Date().toISOString()
  };

  usersById.set(user.id, user);
  usersByEmail.set(normalizedEmail, user);
  return user;
}

export function findUserByEmail(email) {
  return usersByEmail.get(String(email || '').trim().toLowerCase()) || null;
}

export function findUserById(id) {
  return usersById.get(id) || null;
}

export function isEmailTaken(email) {
  return usersByEmail.has(String(email || '').trim().toLowerCase());
}

export function revokeRefreshToken(tokenId) {
  revokedRefreshTokens.add(tokenId);
}

export function isRefreshTokenRevoked(tokenId) {
  return revokedRefreshTokens.has(tokenId);
}

export function publicUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    guest: Boolean(user.guest),
    createdAt: user.createdAt
  };
}

