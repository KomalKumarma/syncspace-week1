# SyncSpace - Final Review Build

Implementation for Project 1 from the PDF: **SyncSpace**, a MERN-style real-time collaborative whiteboard and code editor.

This version includes:

- Express + Socket.io backend
- Isolated collaboration rooms
- Join/leave presence updates
- React split-screen collaboration UI
- Guest authentication with JWT access tokens
- Secure room creation with optional password protection
- Konva whiteboard with pen, rectangle, text, cursor presence, and clear controls
- Snapshot save API and replay timeline API
- Collaborative code editor demo with language selector
- Shared code run output over Socket.io
- Day-wise progress tracking for review submissions
- Week 1 completion summary
- Week 2 starter whiteboard synchronization over Socket.io
- Week 2 Konva canvas tools and cursor awareness
- Week 3 persistence foundation
- Polished login screen and live collaboration charts
- Production auth and secure room API foundation
- MongoDB repository layer for users, refresh tokens, rooms, and session snapshots

## Production API Foundation

The backend now includes starter production endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/guest`
- `GET /api/rooms`
- `POST /api/rooms`
- `POST /api/rooms/:roomId/join`
- `PATCH /api/rooms/:roomId/lock`
- `POST /api/sessions/:roomId/snapshot`
- `GET /api/sessions/:roomId/snapshot`
- `GET /api/sessions/:roomId/replay`

## Real-Time Socket Features

- `join-room`
- `room-message`
- `whiteboard-draw`
- `whiteboard-shape`
- `whiteboard-cursor`
- `whiteboard-clear`
- `code-update`
- `code-run-output`

## Requirements

- Node.js 18 or newer
- npm

## How to Run

Open a terminal in this folder:

```bash
cd syncspace-week1
```

Install dependencies:

```powershell
npm.cmd install
```

Run the backend and frontend together:

```powershell
npm.cmd run dev
```

Then open:

```text
http://localhost:5173
```

To test rooms, open the app in two browser tabs. Use the same room name in both tabs and join. You should see the connected user count and activity messages update in real time.

If PowerShell says `npm.cmd` is not recognized, run this first:

```powershell
$env:Path = "C:\Users\Komalkumar M A\Downloads\node-v24.18.0-win-x64\node-v24.18.0-win-x64;" + $env:Path
```

## Week 1 Room Test

Use this quick test before every review push:

1. Start the app with `npm.cmd run dev`.
2. Open `http://localhost:5173` in two browser tabs.
3. Enter the same room name in both tabs.
4. Click **Join** in both tabs.
5. Confirm the collaborator count and room activity update.
6. Send a room chat message and confirm it appears in the other tab.
7. Draw on the whiteboard and confirm the other tab receives the drawing.
8. Change code in one tab and confirm the other tab receives the update.
9. Click **Run** and confirm output appears in the room.
10. Click **Save** on the whiteboard and refresh the replay timeline.

## Project Structure

```text
syncspace-week1/
  client/   React frontend
  server/   Express + Socket.io backend
```
