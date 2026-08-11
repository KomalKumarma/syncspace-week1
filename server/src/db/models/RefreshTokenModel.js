import mongoose from 'mongoose';

const RefreshTokenSchema = new mongoose.Schema(
  {
    tokenId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: String
    },
    expiresAt: {
      type: Date,
      required: true
    },
    revokedAt: Date,
    userAgent: String,
    ipAddress: String
  },
  { timestamps: true }
);

export const RefreshTokenModel =
  mongoose.models.RefreshToken || mongoose.model('RefreshToken', RefreshTokenSchema);
