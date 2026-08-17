import { connectMongo, isMongoConfigured } from '../mongoConnection.js';
import { RefreshTokenModel } from '../models/RefreshTokenModel.js';

export async function revokeMongoRefreshToken(tokenId) {
  if (!isMongoConfigured()) return false;
  try {
    const conn = await connectMongo();
    if (!conn) return false;

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
  } catch (err) {
    console.warn('[MongoDB Repository Warning] revokeMongoRefreshToken failed:', err.message);
    return false;
  }
}

export async function isMongoRefreshTokenRevoked(tokenId) {
  if (!isMongoConfigured()) return false;
  try {
    const conn = await connectMongo();
    if (!conn) return false;
    return Boolean(await RefreshTokenModel.exists({ tokenId, revokedAt: { $ne: null } }));
  } catch (err) {
    console.warn('[MongoDB Repository Warning] isMongoRefreshTokenRevoked failed:', err.message);
    return false;
  }
}

