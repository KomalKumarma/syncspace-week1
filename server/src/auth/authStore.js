import { randomUUID } from 'node:crypto';
import { hashPassword } from '../security/passwordService.js';
import {
  createMongoUser,
  findMongoUserByEmail,
  findMongoUserById,
  isMongoEmailTaken
} from '../db/repositories/userRepository.js';
import {
  isMongoRefreshTokenRevoked,
  revokeMongoRefreshToken
} from '../db/repositories/refreshTokenRepository.js';
import { isMongoConfigured } from '../db/mongoConnection.js';

const usersById = new Map();
const usersByEmail = new Map();
const revokedRefreshTokens = new Set();

export async function createUser({ name, email, password, role = 'editor' }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = {
    id: randomUUID(),
    name: String(name || '').trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    role,
    createdAt: new Date().toISOString()
  };

  if (isMongoConfigured()) {
    return createMongoUser(user);
  }

  usersById.set(user.id, user);
  usersByEmail.set(normalizedEmail, user);
  return user;
}

export async function findUserByEmail(email) {
  if (isMongoConfigured()) {
    return findMongoUserByEmail(email);
  }

  return usersByEmail.get(String(email || '').trim().toLowerCase()) || null;
}

export async function findUserById(id) {
  if (isMongoConfigured()) {
    return findMongoUserById(id);
  }

  return usersById.get(id) || null;
}

export async function isEmailTaken(email) {
  if (isMongoConfigured()) {
    return isMongoEmailTaken(email);
  }

  return usersByEmail.has(String(email || '').trim().toLowerCase());
}

export async function revokeRefreshToken(tokenId) {
  if (isMongoConfigured()) {
    return revokeMongoRefreshToken(tokenId);
  }

  revokedRefreshTokens.add(tokenId);
  return true;
}

export async function isRefreshTokenRevoked(tokenId) {
  if (isMongoConfigured()) {
    return isMongoRefreshTokenRevoked(tokenId);
  }

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

