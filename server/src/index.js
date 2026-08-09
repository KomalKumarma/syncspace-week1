import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Server } from 'socket.io';
import { getSessionSnapshot, saveSessionSnapshot } from './persistence/sessionStore.js';
import { authRouter } from './auth/authRoutes.js';
import { roomRouter } from './rooms/roomRoutes.js';

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/rooms', roomRouter);

app.get('/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'syncspace-week1-server',
    persistence: process.env.MONGODB_URI ? 'mongodb-ready' : 'memory-foundation'
  });
});

app.get('/api/sessions/:roomId/snapshot', (request, response) => {
  const snapshot = getSessionSnapshot(request.params.roomId);

  if (!snapshot) {
    response.status(404).json({
      message: 'No snapshot saved for this room yet.'
    });
    return;
  }

  response.json(snapshot);
});

app.post('/api/sessions/:roomId/snapshot', (request, response) => {
  const snapshot = saveSessionSnapshot(request.params.roomId, request.body);
  response.status(201).json(snapshot);
});

app.use((error, _request, response, _next) => {
  const statusCode = error.statusCode || 500;

  response.status(statusCode).json({
    message: error.message || 'Unexpected server error.',
    details: error.details
  });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST']
  }
});

const roomUsers = new Map();

function getRoomUsers(roomId) {
  return Array.from(roomUsers.get(roomId)?.values() || []);
}

function publishRoomPresence(roomId) {
  io.to(roomId).emit('room-presence', {
    roomId,
    users: getRoomUsers(roomId),
    count: getRoomUsers(roomId).length
  });
}

function removeUserFromRooms(socket) {
  for (const [roomId, users] of roomUsers.entries()) {
    if (users.delete(socket.id)) {
      if (users.size === 0) {
        roomUsers.delete(roomId);
      }

      socket.to(roomId).emit('room-activity', {
        type: 'user-left',
        message: `${socket.data.userName || 'A collaborator'} left ${roomId}.`,
        at: new Date().toISOString()
      });

      socket.to(roomId).emit('whiteboard-cursor-left', {
        userId: socket.id
      });

      publishRoomPresence(roomId);
    }
  }
}

io.on('connection', (socket) => {
  socket.emit('connected', {
    socketId: socket.id,
    message: 'Connected to SyncSpace room server.'
  });

  socket.on('join-room', ({ roomId, userName }) => {
    const cleanRoomId = String(roomId || '').trim();
    const cleanUserName = String(userName || 'Guest').trim();

    if (!cleanRoomId) {
      socket.emit('room-error', { message: 'Room name is required.' });
      return;
    }

    removeUserFromRooms(socket);

    socket.data.roomId = cleanRoomId;
    socket.data.userName = cleanUserName;
    socket.join(cleanRoomId);

    if (!roomUsers.has(cleanRoomId)) {
      roomUsers.set(cleanRoomId, new Map());
    }

    roomUsers.get(cleanRoomId).set(socket.id, {
      id: socket.id,
      name: cleanUserName,
      joinedAt: new Date().toISOString()
    });

    socket.emit('room-joined', {
      roomId: cleanRoomId,
      userName: cleanUserName
    });

    io.to(cleanRoomId).emit('room-activity', {
      type: 'user-joined',
      message: `${cleanUserName} joined ${cleanRoomId}.`,
      at: new Date().toISOString()
    });

    publishRoomPresence(cleanRoomId);
  });

  socket.on('room-message', ({ text }) => {
    const roomId = socket.data.roomId;
    if (!roomId || !String(text || '').trim()) return;

    io.to(roomId).emit('room-message', {
      id: randomUUID(),
      userName: socket.data.userName || 'Guest',
      text: String(text).trim(),
      at: new Date().toISOString()
    });
  });

  socket.on('whiteboard-draw', (stroke) => {
    const roomId = socket.data.roomId;
    if (!roomId || !stroke) return;

    socket.to(roomId).emit('whiteboard-draw', {
      ...stroke,
      userId: socket.id,
      userName: socket.data.userName || 'Guest'
    });
  });

  socket.on('whiteboard-clear', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    socket.to(roomId).emit('whiteboard-clear', {
      userId: socket.id,
      userName: socket.data.userName || 'Guest',
      at: new Date().toISOString()
    });
  });

  socket.on('whiteboard-shape', (shape) => {
    const roomId = socket.data.roomId;
    if (!roomId || !shape) return;

    socket.to(roomId).emit('whiteboard-shape', {
      ...shape,
      userId: socket.id,
      userName: socket.data.userName || 'Guest'
    });
  });

  socket.on('whiteboard-cursor', (cursor) => {
    const roomId = socket.data.roomId;
    if (!roomId || !cursor) return;

    socket.to(roomId).emit('whiteboard-cursor', {
      ...cursor,
      userId: socket.id,
      userName: socket.data.userName || 'Guest'
    });
  });

  socket.on('leave-room', () => {
    removeUserFromRooms(socket);
    socket.data.roomId = undefined;
  });

  socket.on('disconnect', () => {
    removeUserFromRooms(socket);
  });
});

httpServer.listen(PORT, () => {
  console.log(`SyncSpace Week 1 server running on http://localhost:${PORT}`);
});
