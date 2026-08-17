import { connectMongo, isMongoConfigured } from '../mongoConnection.js';
import { UserModel } from '../models/UserModel.js';

function toDomainUser(user) {
  if (!user) return null;

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    passwordHash: user.passwordHash,
    role: user.role,
    createdAt: user.createdAt?.toISOString?.() || user.createdAt
  };
}

export async function createMongoUser(user) {
  if (!isMongoConfigured()) return null;
  try {
    const conn = await connectMongo();
    if (!conn) return null;
    const created = await UserModel.create(user);
    return toDomainUser(created);
  } catch (err) {
    console.warn('[MongoDB Repository Warning] createMongoUser failed:', err.message);
    return null;
  }
}

export async function findMongoUserByEmail(email) {
  if (!isMongoConfigured()) return null;
  try {
    const conn = await connectMongo();
    if (!conn) return null;
    const user = await UserModel.findOne({ email: String(email || '').trim().toLowerCase() }).lean();
    return toDomainUser(user);
  } catch (err) {
    console.warn('[MongoDB Repository Warning] findMongoUserByEmail failed:', err.message);
    return null;
  }
}

export async function findMongoUserById(id) {
  if (!isMongoConfigured()) return null;
  try {
    const conn = await connectMongo();
    if (!conn) return null;
    const user = await UserModel.findById(id).lean();
    return toDomainUser(user);
  } catch (err) {
    console.warn('[MongoDB Repository Warning] findMongoUserById failed:', err.message);
    return null;
  }
}

export async function isMongoEmailTaken(email) {
  if (!isMongoConfigured()) return false;
  try {
    const conn = await connectMongo();
    if (!conn) return false;
    return Boolean(await UserModel.exists({ email: String(email || '').trim().toLowerCase() }));
  } catch (err) {
    console.warn('[MongoDB Repository Warning] isMongoEmailTaken failed:', err.message);
    return false;
  }
}

