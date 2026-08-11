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
  await connectMongo();
  const created = await UserModel.create(user);
  return toDomainUser(created);
}

export async function findMongoUserByEmail(email) {
  if (!isMongoConfigured()) return null;
  await connectMongo();
  const user = await UserModel.findOne({ email: String(email || '').trim().toLowerCase() }).lean();
  return toDomainUser(user);
}

export async function findMongoUserById(id) {
  if (!isMongoConfigured()) return null;
  await connectMongo();
  const user = await UserModel.findById(id).lean();
  return toDomainUser(user);
}

export async function isMongoEmailTaken(email) {
  if (!isMongoConfigured()) return false;
  await connectMongo();
  return Boolean(await UserModel.exists({ email: String(email || '').trim().toLowerCase() }));
}

