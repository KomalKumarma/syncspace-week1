# SyncSpace - Week 1

Week 1 implementation for Project 1 from the PDF: **SyncSpace**, a real-time collaborative whiteboard and code editor.

This version includes:

- Express + Socket.io backend
- Isolated collaboration rooms
- Join/leave presence updates
- React split-screen UI
- Whiteboard panel scaffold
- Code editor panel scaffold
- Day-wise progress tracking for review submissions

Later-week items like Yjs CRDT sync, Konva drawing tools, Monaco Editor, MongoDB persistence, JWT access control, and replay history are intentionally not included yet.

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

## Project Structure

```text
syncspace-week1/
  client/   React frontend
  server/   Express + Socket.io backend
```
