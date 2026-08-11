import { createRoom, getRoom, joinRoom, listRooms, serializeRoom, setRoomLocked } from './roomStore.js';
import { HttpError } from '../shared/httpError.js';

export async function createRoomController(request, response) {
  const { name, password } = request.body;
  if (!name) {
    throw new HttpError(400, 'Room name is required.');
  }

  const room = await createRoom({ name, password, hostUser: request.user });
  response.status(201).json({
    room: serializeRoom(room),
    inviteLink: `/rooms/join/${room.inviteCode}`
  });
}

export async function listRoomsController(_request, response) {
  const rooms = await listRooms();
  response.json({
    rooms: rooms.map(serializeRoom)
  });
}

export async function joinRoomController(request, response) {
  const result = await joinRoom({
    roomId: request.params.roomId,
    user: request.user,
    password: request.body.password
  });

  if (!result) {
    throw new HttpError(404, 'Room not found.');
  }

  if (result.error === 'locked') {
    throw new HttpError(423, 'Room is locked.');
  }

  if (result.error === 'password') {
    throw new HttpError(401, 'Invalid room password.');
  }

  response.json({ room: serializeRoom(result) });
}

export async function lockRoomController(request, response) {
  const room = await getRoom(request.params.roomId);
  if (!room) {
    throw new HttpError(404, 'Room not found.');
  }

  const member = room.members.get(request.user.sub);
  if (member?.role !== 'host') {
    throw new HttpError(403, 'Only the room host can lock or unlock this room.');
  }

  response.json({
    room: serializeRoom(await setRoomLocked(room.id, request.body.locked))
  });
}

