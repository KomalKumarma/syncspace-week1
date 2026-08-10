import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['host', 'admin', 'editor', 'viewer'],
      default: 'editor'
    },
    avatarColor: {
      type: String,
      default: '#176b87'
    },
    lastSeenAt: Date
  },
  { timestamps: true }
);

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);

