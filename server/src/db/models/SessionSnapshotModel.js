import mongoose from 'mongoose';

const SessionSnapshotSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true
    },
    version: {
      type: Number,
      required: true
    },
    yjsStateVector: Buffer,
    yjsUpdateBlob: Buffer,
    canvasObjects: {
      type: Array,
      default: []
    },
    codeDocuments: {
      type: Map,
      of: String,
      default: {}
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

SessionSnapshotSchema.index({ roomId: 1, version: -1 });

export const SessionSnapshotModel =
  mongoose.models.SessionSnapshot || mongoose.model('SessionSnapshot', SessionSnapshotSchema);

