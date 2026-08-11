# Day 17 Progress - MongoDB Repository Wiring

Date: 2026-08-11

## Completed

- Connected authentication storage to MongoDB repositories when `MONGODB_URI` is configured.
- Added MongoDB persistence for users, refresh tokens, and rooms.
- Connected room creation, listing, joining, and lock/unlock operations to MongoDB.
- Preserved the in-memory fallback so the project runs without a database during local development.
- Kept the existing REST controllers and Socket.io room flow compatible with both storage modes.

## Verification

- Run `npm.cmd install` from the project root after pulling this commit.
- Leave `MONGODB_URI` empty to use the local in-memory mode.
- Add a valid MongoDB connection string to `server/.env` to enable persistence.
- Start the server and client, then verify register/login and room create/join flows.

## Next Step

Add automated API tests for authentication and room permissions, then add snapshot persistence to the active Socket.io session lifecycle.
