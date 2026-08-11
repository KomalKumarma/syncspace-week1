import { connectMongo, isMongoConfigured } from '../mongoConnection.js';
import { RefreshTokenModel } from '../models/RefreshTokenModel.js';

export async function revokeMongoRefreshToken(tokenId) {
  if (!isMongoConfigured()) return false;
  await connectMongo();

  await RefreshTokenModel.updateOne(
    { tokenId },
    {
      $set: {
        tokenId,
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    },
    { upsert: true }
  );

  return true;
}

export async function isMongoRefreshTokenRevoked(tokenId) {
  if (!isMongoConfigured()) return false;
  await connectMongo();
  return Boolean(await RefreshTokenModel.exists({ tokenId, revokedAt: { $ne: null } }));
}

