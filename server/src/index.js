import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({
  path: [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'server/.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env')
  ]
});

import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Server } from 'socket.io';
import { authRouter } from './auth/authRoutes.js';
import { aiRouter } from './ai/aiRoutes.js';
import { codeRouter } from './code/codeRoutes.js';
import { roomRouter } from './rooms/roomRoutes.js';
import { sessionRouter } from './persistence/sessionRoutes.js';
import { connectMongo, isMongoConnected, isMongoConfigured } from './db/mongoConnection.js';

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Initiate async MongoDB connection check without blocking server startup
if (isMongoConfigured()) {
  connectMongo().catch(() => {});
}

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/ai', aiRouter);
app.use('/api/code', codeRouter);
app.use('/api/rooms', roomRouter);
app.use('/api/sessions', sessionRouter);

app.get('/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'syncspace-week1-server',
    persistence: isMongoConnected()
      ? 'mongodb-connected'
      : (isMongoConfigured() ? 'memory-fallback-mongo-offline' : 'memory-foundation')
  });
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

  socket.on('code-update', (payload) => {
    const roomId = socket.data.roomId;
    if (!roomId || !payload) return;

    socket.to(roomId).emit('code-update', {
      ...payload,
      userId: socket.id,
      userName: socket.data.userName || 'Guest',
      syncedAt: new Date().toISOString()
    });
  });

  socket.on('code-run-output', (payload) => {
    const roomId = socket.data.roomId;
    if (!roomId || !payload) return;

    io.to(roomId).emit('code-run-output', {
      ...payload,
      userId: socket.id,
      userName: socket.data.userName || 'Guest',
      ranAt: new Date().toISOString()
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
