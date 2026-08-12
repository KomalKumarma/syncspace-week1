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
    version: version || (await getNextSnapshotVersion(roomId)),
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

export async function listMongoSessionSnapshots(roomId, limit = 20) {
  if (!isMongoConfigured()) {
    return [];
  }

  await connectMongo();

  return SessionSnapshotModel.find({ roomId })
    .sort({ version: -1 })
    .limit(Math.min(Number(limit) || 20, 50))
    .lean();
}

async function getNextSnapshotVersion(roomId) {
  const latestSnapshot = await SessionSnapshotModel.findOne({ roomId }).sort({ version: -1 }).lean();
  return (latestSnapshot?.version || 0) + 1;
}
