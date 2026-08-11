import { connectMongo, isMongoConfigured } from '../mongoConnection.js';
import { RoomModel } from '../models/RoomModel.js';

function toDomainRoom(room) {
  if (!room) return null;

  return {
    id: String(room._id),
    name: room.name,
    locked: room.locked,
    passwordHash: room.passwordHash,
    inviteCode: room.inviteCode,
    createdAt: room.createdAt?.toISOString?.() || room.createdAt,
    members: new Map((room.members || []).map((member) => [
      member.userId || member.guestId,
      {
        userId: member.userId || member.guestId,
        name: member.name,
        role: member.role,
        cursorColor: member.cursorColor,
        joinedAt: member.joinedAt
      }
    ]))
  };
}

export async function createMongoRoom(room) {
  if (!isMongoConfigured()) return null;
  await connectMongo();

  const created = await RoomModel.create({
    name: room.name,
    hostUserId: room.hostUserId,
    locked: room.locked,
    passwordHash: room.passwordHash,
    inviteCode: room.inviteCode,
    members: Array.from(room.members.values())
  });

  return toDomainRoom(created);
}

export async function findMongoRoomById(roomId) {
  if (!isMongoConfigured()) return null;
  await connectMongo();
  const room = await RoomModel.findById(roomId).lean();
  return toDomainRoom(room);
}

export async function listMongoRooms() {
  if (!isMongoConfigured()) return null;
  await connectMongo();
  const rooms = await RoomModel.find().sort({ createdAt: -1 }).lean();
  return rooms.map(toDomainRoom);
}

export async function saveMongoRoom(room) {
  if (!isMongoConfigured()) return null;
  await connectMongo();

  const updated = await RoomModel.findByIdAndUpdate(
    room.id,
    {
      $set: {
        locked: room.locked,
        members: Array.from(room.members.values())
      }
    },
    { new: true }
  ).lean();

  return toDomainRoom(updated);
}

