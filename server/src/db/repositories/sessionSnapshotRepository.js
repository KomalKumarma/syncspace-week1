import { connectMongo, isMongoConfigured } from '../mongoConnection.js';
import { SessionSnapshotModel } from '../models/SessionSnapshotModel.js';

export async function saveMongoSessionSnapshot({
  roomId,
  version,
  yjsStateVector,
  yjsUpdateBlob,
  canvasObjects,
  codeDocuments,
  createdBy
}) {
  if (!isMongoConfigured()) {
    return null;
  }

  await connectMongo();

  return SessionSnapshotModel.create({
    roomId,
    version,
    yjsStateVector,
    yjsUpdateBlob,
    canvasObjects,
    codeDocuments,
    createdBy
  });
}

export async function findLatestMongoSessionSnapshot(roomId) {
  if (!isMongoConfigured()) {
    return null;
  }

  await connectMongo();

  return SessionSnapshotModel.findOne({ roomId }).sort({ version: -1 }).lean();
}

