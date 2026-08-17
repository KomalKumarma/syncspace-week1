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

  try {
    const conn = await connectMongo();
    if (!conn) return null;

    return await SessionSnapshotModel.create({
      roomId,
      version: version || (await getNextSnapshotVersion(roomId)),
      yjsStateVector,
      yjsUpdateBlob,
      canvasObjects,
      codeDocuments,
      createdBy
    });
  } catch (err) {
    console.warn('[MongoDB Repository Warning] saveMongoSessionSnapshot failed:', err.message);
    return null;
  }
}

export async function findLatestMongoSessionSnapshot(roomId) {
  if (!isMongoConfigured()) {
    return null;
  }

  try {
    const conn = await connectMongo();
    if (!conn) return null;

    return await SessionSnapshotModel.findOne({ roomId }).sort({ version: -1 }).lean();
  } catch (err) {
    console.warn('[MongoDB Repository Warning] findLatestMongoSessionSnapshot failed:', err.message);
    return null;
  }
}

export async function listMongoSessionSnapshots(roomId, limit = 20) {
  if (!isMongoConfigured()) {
    return [];
  }

  try {
    const conn = await connectMongo();
    if (!conn) return [];

    return await SessionSnapshotModel.find({ roomId })
      .sort({ version: -1 })
      .limit(Math.min(Number(limit) || 20, 50))
      .lean();
  } catch (err) {
    console.warn('[MongoDB Repository Warning] listMongoSessionSnapshots failed:', err.message);
    return [];
  }
}

async function getNextSnapshotVersion(roomId) {
  try {
    const latestSnapshot = await SessionSnapshotModel.findOne({ roomId }).sort({ version: -1 }).lean();
    return (latestSnapshot?.version || 0) + 1;
  } catch (err) {
    return 1;
  }
}

