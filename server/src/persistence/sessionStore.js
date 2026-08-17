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

  const memoryVersion = getNextMemoryVersion(cleanRoomId);
  const memorySnapshot = {
    id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    roomId: cleanRoomId,
    version: memoryVersion,
    data: snapshot?.data || {
      canvasObjects: snapshot?.canvasObjects || [],
      codeDocuments: snapshot?.codeDocuments || {}
    },
    savedAt: new Date().toISOString(),
    createdBy
  };

  snapshots.set(cleanRoomId, memorySnapshot);
  if (!snapshotHistory.has(cleanRoomId)) {
    snapshotHistory.set(cleanRoomId, []);
  }
  snapshotHistory.get(cleanRoomId).push(memorySnapshot);

  if (isMongoConfigured()) {
    const mongoSnapshot = await saveMongoSessionSnapshot({
      roomId: cleanRoomId,
      version: memoryVersion,
      canvasObjects: snapshot?.data?.canvasObjects || snapshot?.canvasObjects || [],
      codeDocuments: snapshot?.data?.codeDocuments || snapshot?.codeDocuments || {},
      yjsStateVector: snapshot?.yjsStateVector,
      yjsUpdateBlob: snapshot?.yjsUpdateBlob,
      createdBy
    });

    if (mongoSnapshot) {
      return formatMongoSnapshot(mongoSnapshot);
    }
  }

  return memorySnapshot;
}

export async function getSessionSnapshot(roomId) {
  const cleanRoomId = String(roomId || '').trim();
  if (!cleanRoomId) {
    return null;
  }

  if (isMongoConfigured()) {
    const snapshot = await findLatestMongoSessionSnapshot(cleanRoomId);
    if (snapshot) {
      return formatMongoSnapshot(snapshot);
    }
  }

  return snapshots.get(cleanRoomId) || null;
}

export async function listSessionSnapshots(roomId, limit) {
  const cleanRoomId = String(roomId || '').trim();
  if (!cleanRoomId) {
    return [];
  }

  if (isMongoConfigured()) {
    const mongoSnapshots = await listMongoSessionSnapshots(cleanRoomId, limit);
    if (mongoSnapshots && mongoSnapshots.length > 0) {
      return mongoSnapshots.map(formatMongoSnapshot);
    }
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
