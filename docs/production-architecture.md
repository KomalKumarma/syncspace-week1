# SyncSpace Production Architecture

## 1. Complete Project Directory Layout

```text
syncspace-week1/
  server/
    src/
      auth/                 register, login, logout, refresh, guest access
      middleware/           JWT auth and role guards
      db/                   MongoDB connection, schemas, and repositories
      persistence/          session snapshot storage
      rooms/                room create, join, lock, invite management
      security/             password hashing and token signing
      shared/               errors and async route helpers
      index.js              Express + Socket.io entrypoint
  client/
    src/
      types/                TypeScript interfaces for users, rooms, canvas, snapshots
      main.jsx              current React collaboration workspace
      styles.css            polished dashboard styles
  docs/
    day-wise progress notes
    week completion summaries
```

## 2. Backend Modules Added Today

- Authentication routes: `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/guest`.
- JWT-style access and refresh token service using HMAC signing.
- Secure password hashing using PBKDF2.
- Role-aware request middleware.
- Room routes: create, list, join, and lock.
- Password-protected rooms and invite-code foundation.
- Shared error handler and async route wrapper.
- MongoDB model foundation for users, rooms, refresh tokens, and session snapshots.

## 3. Frontend Types Added Today

- `AuthUser`
- `CollaborativeRoom`
- `RoomMember`
- `WhiteboardLine`
- `WhiteboardShape`
- `SessionSnapshot`

## Day-By-Day Production Commit Plan

1. Auth and secure room foundation.
2. MongoDB models for users, rooms, snapshots, and refresh tokens.
3. Frontend auth pages connected to backend APIs.
4. Room dashboard with invite links, lock status, and role controls.
5. Yjs document provider for canvas and code documents.
6. Monaco Editor integration with language selector.
7. Code execution backend adapter and shared execution logs.
8. Redis adapter for Socket.io horizontal scaling.
9. Auto-save Yjs binary snapshots to MongoDB.
10. Session replay timeline and time-scrubber UI.

