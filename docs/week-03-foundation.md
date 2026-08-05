# Week 03 Persistence Foundation

## Week 3 Goal

Week 3 introduces a persistence layer so collaborative sessions can survive server restarts.

The final target is MongoDB-backed storage for room/session state.

## Started Foundation

- Added a session snapshot store module.
- Added API endpoints for saving and loading room snapshots.
- Added `MONGODB_URI` to the server environment example.
- Added a health response field showing whether MongoDB is configured.

## Current State

The persistence foundation currently uses an in-memory store. This is useful for wiring the backend contract before connecting MongoDB.

## Next Step

Replace the in-memory store with a MongoDB model once a MongoDB Atlas connection string or local MongoDB setup is available.

