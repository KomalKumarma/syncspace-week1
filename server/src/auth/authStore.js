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

  usersById.set(user.id, user);
  usersByEmail.set(normalizedEmail, user);

  if (isMongoConfigured()) {
    const mongoUser = await createMongoUser(user);
    if (mongoUser) return mongoUser;
  }

  return user;
}

export async function findUserByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (isMongoConfigured()) {
    const mongoUser = await findMongoUserByEmail(normalizedEmail);
    if (mongoUser) return mongoUser;
  }

  return usersByEmail.get(normalizedEmail) || null;
}

export async function findUserById(id) {
  if (isMongoConfigured()) {
    const mongoUser = await findMongoUserById(id);
    if (mongoUser) return mongoUser;
  }

  return usersById.get(id) || null;
}

export async function isEmailTaken(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (isMongoConfigured()) {
    const taken = await isMongoEmailTaken(normalizedEmail);
    if (taken) return true;
  }

  return usersByEmail.has(normalizedEmail);
}

export async function revokeRefreshToken(tokenId) {
  revokedRefreshTokens.add(tokenId);
  if (isMongoConfigured()) {
    await revokeMongoRefreshToken(tokenId);
  }
  return true;
}

export async function isRefreshTokenRevoked(tokenId) {
  if (isMongoConfigured()) {
    const isRevoked = await isMongoRefreshTokenRevoked(tokenId);
    if (isRevoked) return true;
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
