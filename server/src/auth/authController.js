import { randomUUID } from 'node:crypto';
import {
  createUser,
  findUserByEmail,
  findUserById,
  isEmailTaken,
  isRefreshTokenRevoked,
  publicUser,
  revokeRefreshToken
} from './authStore.js';
import { createAuthTokens, createGuestToken, verifyToken } from '../security/tokenService.js';
import { verifyPassword } from '../security/passwordService.js';
import { HttpError } from '../shared/httpError.js';

export function register(request, response) {
  const { name, email, password, role } = request.body;

  if (!name || !email || !password) {
    throw new HttpError(400, 'Name, email, and password are required.');
  }

  if (isEmailTaken(email)) {
    throw new HttpError(409, 'Email is already registered.');
  }

  const user = createUser({ name, email, password, role });
  response.status(201).json({
    user: publicUser(user),
    tokens: createAuthTokens(user)
  });
}

export function login(request, response) {
  const { email, password } = request.body;
  const user = findUserByEmail(email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new HttpError(401, 'Invalid email or password.');
  }

  response.json({
    user: publicUser(user),
    tokens: createAuthTokens(user)
  });
}

export function refresh(request, response) {
  const { refreshToken } = request.body;
  const payload = verifyToken(refreshToken, 'refresh');

  if (isRefreshTokenRevoked(payload.jti)) {
    throw new HttpError(401, 'Refresh token has been revoked.');
  }

  const user = findUserById(payload.sub);
  if (!user) {
    throw new HttpError(401, 'User no longer exists.');
  }

  response.json({
    user: publicUser(user),
    tokens: createAuthTokens(user)
  });
}

export function logout(request, response) {
  const { refreshToken } = request.body;

  if (refreshToken) {
    const payload = verifyToken(refreshToken, 'refresh');
    revokeRefreshToken(payload.jti);
  }

  response.status(204).send();
}

export function guestAccess(request, response) {
  const guest = {
    id: `guest-${randomUUID()}`,
    name: request.body.name || 'Guest',
    role: 'viewer',
    guest: true
  };

  response.status(201).json({
    user: guest,
    tokens: {
      accessToken: createGuestToken(guest),
      refreshToken: null
    }
  });
}

