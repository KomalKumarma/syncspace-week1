# SyncSpace - Week 1 and week 2 (Mid Review)

Week 1 implementation for Project 1 from the PDF: **SyncSpace**, a real-time collaborative whiteboard and code editor.

This version includes:

- Express + Socket.io backend
- Isolated collaboration rooms
- Join/leave presence updates
- React split-screen UI
- Whiteboard panel scaffold
- Code editor panel scaffold
- Day-wise progress tracking for review submissions
- Week 1 completion summary
- Week 2 starter whiteboard synchronization over Socket.io
- Week 2 Konva canvas tools and cursor awareness
- Week 3 persistence foundation
- Polished login screen and live collaboration charts

Later-week items like full Yjs CRDT sync, Monaco Editor binding, MongoDB persistence, JWT access control, and replay history are intentionally not included yet.

## Requirements

- Node.js 18 or newer
- npm

## How to Run

Open a terminal in this folder:

```bash
cd syncspace-week1
```

Install dependencies:

```bash
npm install
```

Run the backend and frontend together:

```bash
npm run dev
```

Then open:

```text
http://localhost:5173
```

To test rooms, open the app in two browser tabs. Use the same room name in both tabs and join. You should see the connected user count and activity messages update in real time.

## Week 1 Room Test

Use this quick test before every review push:

1. Start the app with `npm.cmd run dev`.
2. Open `http://localhost:5173` in two browser tabs.
3. Enter the same room name in both tabs.
4. Click **Join** in both tabs.
5. Confirm the collaborator count and room activity update.
6. Send a room chat message and confirm it appears in the other tab.
7. Leave the room and confirm the UI returns to the no-room state.

## Project Structure

```text
syncspace-week1/
  client/   React frontend
  server/   Express + Socket.io backend
```
