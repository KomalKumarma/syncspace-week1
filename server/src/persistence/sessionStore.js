import {
  findLatestMongoSessionSnapshot,
  listMongoSessionSnapshots,
  saveMongoSessionSnapshot
} from '../db/repositories/sessionSnapshotRepository.js';
import { isMongoConfigured } from '../db/mongoConnection.js';

const snapshots = new Map();
const snapshotHistory = new Map();

export async function saveSessionSnapshot(roomId, snapshot, createdBy) {
  const cleanRoomId = String(roomId || '').trim();
  if (!cleanRoomId) {
    throw new Error('Room id is required.');
  }

  if (isMongoConfigured()) {
    const savedSnapshot = await saveMongoSessionSnapshot({
      roomId: cleanRoomId,
      canvasObjects: snapshot?.data?.canvasObjects || snapshot?.canvasObjects || [],
      codeDocuments: snapshot?.data?.codeDocuments || snapshot?.codeDocuments || {},
      yjsStateVector: snapshot?.yjsStateVector,
      yjsUpdateBlob: snapshot?.yjsUpdateBlob,
      createdBy
    });

    return formatMongoSnapshot(savedSnapshot);
  }

  const savedSnapshot = {
    roomId: cleanRoomId,
    version: getNextMemoryVersion(cleanRoomId),
    data: snapshot?.data || {},
    savedAt: new Date().toISOString()
  };

  snapshots.set(cleanRoomId, savedSnapshot);
  if (!snapshotHistory.has(cleanRoomId)) {
    snapshotHistory.set(cleanRoomId, []);
  }
  snapshotHistory.get(cleanRoomId).push(savedSnapshot);

  return savedSnapshot;
}

export async function getSessionSnapshot(roomId) {
  const cleanRoomId = String(roomId || '').trim();
  if (!cleanRoomId) {
    return null;
  }

  if (isMongoConfigured()) {
    const snapshot = await findLatestMongoSessionSnapshot(cleanRoomId);
    return snapshot ? formatMongoSnapshot(snapshot) : null;
  }

  return snapshots.get(cleanRoomId) || null;
}

export async function listSessionSnapshots(roomId, limit) {
  const cleanRoomId = String(roomId || '').trim();
  if (!cleanRoomId) {
    return [];
  }

  if (isMongoConfigured()) {
    const snapshots = await listMongoSessionSnapshots(cleanRoomId, limit);
    return snapshots.map(formatMongoSnapshot);
  }

  return [...(snapshotHistory.get(cleanRoomId) || [])].reverse().slice(0, Math.min(Number(limit) || 20, 50));
}

function getNextMemoryVersion(roomId) {
  return (snapshotHistory.get(roomId)?.length || 0) + 1;
}

function formatMongoSnapshot(snapshot) {
  if (!snapshot) {
    return null;
  }

  return {
    id: String(snapshot._id),
    roomId: snapshot.roomId,
    version: snapshot.version,
    data: {
      canvasObjects: snapshot.canvasObjects || [],
      codeDocuments: normalizeCodeDocuments(snapshot.codeDocuments)
    },
    savedAt: snapshot.createdAt?.toISOString?.() || snapshot.createdAt,
    createdBy: snapshot.createdBy
  };
}

function normalizeCodeDocuments(codeDocuments) {
  if (!codeDocuments) {
    return {};
  }

  if (codeDocuments instanceof Map) {
    return Object.fromEntries(codeDocuments);
  }

  return codeDocuments;
}
