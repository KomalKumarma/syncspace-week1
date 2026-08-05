const snapshots = new Map();

export function saveSessionSnapshot(roomId, snapshot) {
  const cleanRoomId = String(roomId || '').trim();
  if (!cleanRoomId) {
    throw new Error('Room id is required.');
  }

  const savedSnapshot = {
    roomId: cleanRoomId,
    data: snapshot?.data || {},
    savedAt: new Date().toISOString()
  };

  snapshots.set(cleanRoomId, savedSnapshot);
  return savedSnapshot;
}

export function getSessionSnapshot(roomId) {
  const cleanRoomId = String(roomId || '').trim();
  if (!cleanRoomId) {
    return null;
  }

  return snapshots.get(cleanRoomId) || null;
}

