import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { isMongoConfigured } from '../db/mongoConnection.js';
import { createMongoRoom, findMongoRoomById, listMongoRooms, saveMongoRoom } from '../db/repositories/roomRepository.js';

const rooms = new Map();

function hashRoomPassword(password) {
  if (!password) return null;
  const salt = randomUUID();
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

function verifyRoomPassword(password, storedHash) {
  if (!storedHash) return true;
  const [salt, hash] = storedHash.split(':');
  const attempted = scryptSync(password || '', salt, 32);
  const original = Buffer.from(hash, 'hex');
  return original.length === attempted.length && timingSafeEqual(original, attempted);
}

export async function createRoom({ name, hostUser, password }) {
  const room = {
    id: randomUUID(),
    name,
    locked: false,
    passwordHash: hashRoomPassword(password),
    inviteCode: randomUUID().slice(0, 8),
    createdAt: new Date().toISOString(),
    members: new Map([[hostUser.sub, {
      userId: hostUser.sub,
      name: hostUser.name,
      role: 'host'
    }]])
  };

  rooms.set(room.id, room);

  if (isMongoConfigured()) {
    const mongoRoom = await createMongoRoom({ ...room, hostUserId: hostUser.sub });
    if (mongoRoom) return mongoRoom;
  }

  return room;
}

export async function getRoom(roomId) {
  if (isMongoConfigured()) {
    const mongoRoom = await findMongoRoomById(roomId);
    if (mongoRoom) return mongoRoom;
  }
  return rooms.get(roomId) || null;
}

export async function listRooms() {
  if (isMongoConfigured()) {
    const mongoRooms = await listMongoRooms();
    if (mongoRooms) return mongoRooms;
  }
  return Array.from(rooms.values());
}

export async function joinRoom({ roomId, user, password }) {
  const room = await getRoom(roomId);
  if (!room) return null;
  if (room.locked && room.members.get(user.sub)?.role !== 'host') {
    return { error: 'locked' };
  }
  if (!verifyRoomPassword(password, room.passwordHash)) {
    return { error: 'password' };
  }

  if (!room.members.has(user.sub)) {
    room.members.set(user.sub, {
      userId: user.sub,
      name: user.name,
      role: user.role === 'viewer' ? 'viewer' : 'editor'
    });
  }

  rooms.set(room.id, room);

  if (isMongoConfigured()) {
    const mongoRoom = await saveMongoRoom(room);
    if (mongoRoom) return mongoRoom;
  }
  return room;
}

export async function setRoomLocked(roomId, locked) {
  const room = await getRoom(roomId);
  if (!room) return null;
  room.locked = Boolean(locked);

  rooms.set(room.id, room);

  if (isMongoConfigured()) {
    const mongoRoom = await saveMongoRoom(room);
    if (mongoRoom) return mongoRoom;
  }
  return room;
}

export function serializeRoom(room) {
  return {
    id: room.id,
    name: room.name,
    locked: room.locked,
    passwordProtected: Boolean(room.passwordHash),
    inviteCode: room.inviteCode,
    createdAt: room.createdAt,
    members: Array.from(room.members.values())
  };
}
