import mongoose from 'mongoose';

const RoomMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: String
    },
    guestId: String,
    name: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['host', 'admin', 'editor', 'viewer'],
      default: 'viewer'
    },
    cursorColor: {
      type: String,
      default: '#176b87'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const RoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    hostUserId: {
      type: String
    },
    locked: {
      type: Boolean,
      default: false
    },
    passwordHash: String,
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    members: {
      type: [RoomMemberSchema],
      default: []
    },
    lastSnapshotAt: Date
  },
  { timestamps: true }
);

export const RoomModel = mongoose.models.Room || mongoose.model('Room', RoomSchema);
