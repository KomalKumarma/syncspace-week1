import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { io } from 'socket.io-client';
import { Arrow, Layer, Line, Rect, Stage, Text } from 'react-konva';
import {
  Activity,
  BarChart3,
  Bot,
  Braces,
  Bug,
  Eraser,
  History,
  Minus,
  LogIn,
  LogOut,
  MessageSquare,
  Move,
  PenLine,
  Plus,
  Play,
  SearchCode,
  RectangleHorizontal,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Type,
  Undo2,
  Redo2,
  Users,
  Wifi,
  WifiOff
} from 'lucide-react';
import './styles.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';
const WHITEBOARD_HEIGHT = 460;

const LANGUAGE_TEMPLATES = {
  javascript: `function handleCandidateSignal(event) {
  const payload = JSON.parse(event.data);

  return {
    roomId: payload.roomId,
    syncedAt: new Date().toISOString()
  };
}`,
  python: `import json
from datetime import datetime

def handle_candidate_signal(event_data):
    payload = json.loads(event_data)
    return {
        "roomId": payload["roomId"],
        "syncedAt": datetime.utcnow().isoformat()
    }`,
  java: `public class Main {
    public static void main(String[] args) {
        String roomId = "interview-room";
        System.out.println("Synced room: " + roomId);
    }
}`,
  cpp: `#include <iostream>
#include <string>

int main() {
  std::string roomId = "interview-room";
  std::cout << "Synced room: " << roomId << std::endl;
  return 0;
}`,
  go: `package main

import "fmt"

func main() {
  roomID := "interview-room"
  fmt.Println("Synced room:", roomID)
}`
};


async function apiRequest(path, options = {}) {
  const response = await fetch(`${SERVER_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed.' }));
    throw new Error(error.message || 'Request failed.');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function formatActivityTime(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function App() {
  const socket = useMemo(() => io(SERVER_URL, { autoConnect: true }), []);
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState('interview-room');
  const [joinedRoom, setJoinedRoom] = useState('');
  const [userName, setUserName] = useState(`User-${Math.floor(Math.random() * 900 + 100)}`);
  const [role, setRole] = useState('Candidate');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [statusMessage, setStatusMessage] = useState('Demo mode ready.');
  const [snapshotReplay, setSnapshotReplay] = useState([]);
  const [restoredSnapshot, setRestoredSnapshot] = useState(null);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState([]);
  const [activeCodeContext, setActiveCodeContext] = useState('');
  const [stats, setStats] = useState({
    strokes: 0,
    shapes: 0,
    messages: 0,
    cursorMoves: 0
  });

  useEffect(() => {
    function addActivity(message) {
      setActivity((current) => [
        { id: crypto.randomUUID(), message, at: new Date().toISOString() },
        ...current
      ].slice(0, 8));
    }

    socket.on('connect', () => {
      setIsConnected(true);
      addActivity('Socket connected.');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setUsers([]);
      addActivity('Socket disconnected.');
    });

    socket.on('room-joined', ({ roomId: nextRoomId }) => {
      setJoinedRoom(nextRoomId);
      addActivity(`Joined ${nextRoomId}.`);
    });

    socket.on('room-presence', ({ users: nextUsers }) => {
      setUsers(nextUsers);
    });

    socket.on('room-activity', ({ message }) => {
      addActivity(message);
    });

    socket.on('room-message', (message) => {
      setMessages((current) => [message, ...current].slice(0, 8));
      setStats((current) => ({ ...current, messages: current.messages + 1 }));
    });

    socket.on('whiteboard-draw', () => {
      setStats((current) => ({ ...current, strokes: current.strokes + 1 }));
    });

    socket.on('whiteboard-shape', () => {
      setStats((current) => ({ ...current, shapes: current.shapes + 1 }));
    });

    socket.on('whiteboard-cursor', () => {
      setStats((current) => ({ ...current, cursorMoves: current.cursorMoves + 1 }));
    });

    socket.on('room-error', ({ message }) => {
      addActivity(message);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room-joined');
      socket.off('room-presence');
      socket.off('room-activity');
      socket.off('room-message');
      socket.off('whiteboard-draw');
      socket.off('whiteboard-shape');
      socket.off('whiteboard-cursor');
      socket.off('room-error');
      socket.disconnect();
    };
  }, [socket]);

  async function login(event) {
    event.preventDefault();
    try {
      const result = await apiRequest('/api/auth/guest', {
        method: 'POST',
        body: JSON.stringify({ name: userName })
      });

      setAuthToken(result.tokens.accessToken);
      setStatusMessage('Guest token issued by backend.');
    } catch (error) {
      setStatusMessage(`Demo login active: ${error.message}`);
    } finally {
      setIsLoggedIn(true);
    }
  }

  async function createSecureRoom() {
    if (!authToken) {
      setStatusMessage('Use demo room join, or enter again to request a guest token.');
      return;
    }

    try {
      const result = await apiRequest('/api/rooms', {
        method: 'POST',
        token: authToken,
        body: JSON.stringify({
          name: roomId,
          password: roomPassword
        })
      });

      setCreatedRoomId(result.room.id);
      setRoomId(result.room.id);
      setStatusMessage(`Secure room created: ${result.room.name}`);
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  async function joinRoom(event) {
    event.preventDefault();

    if (authToken && createdRoomId && roomId === createdRoomId) {
      try {
        await apiRequest(`/api/rooms/${createdRoomId}/join`, {
          method: 'POST',
          token: authToken,
          body: JSON.stringify({ password: roomPassword })
        });
      } catch (error) {
        setStatusMessage(error.message);
        return;
      }
    }

    socket.emit('join-room', { roomId, userName: `${userName} (${role})` });
  }

  function sendMessage(event) {
    event.preventDefault();
    socket.emit('room-message', { text: messageText });
    setMessageText('');
  }

  function leaveRoom() {
    socket.emit('leave-room');
    setJoinedRoom('');
    setUsers([]);
    setMessages([]);
  }

  const latestCanvasRef = useRef([]);
  const latestCodeRef = useRef({});
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);

  const handleCanvasContext = useCallback((objects) => {
    latestCanvasRef.current = objects;
  }, []);

  const handleCodeContext = useCallback((codeDocs) => {
    latestCodeRef.current = codeDocs;
  }, []);

  const loadReplay = useCallback(async (overrideRoom) => {
    const targetRoom = overrideRoom || joinedRoom || roomId || 'interview-room';
    try {
      const result = await apiRequest(`/api/sessions/${targetRoom}/replay?limit=15`, {
        token: authToken
      });
      setSnapshotReplay(result.snapshots || []);
      setStatusMessage(`Loaded ${result.count || 0} replay checkpoint(s) for ${targetRoom}.`);
    } catch (error) {
      setStatusMessage(`Replay fetch: ${error.message}`);
    }
  }, [authToken, joinedRoom, roomId]);

  useEffect(() => {
    if (isLoggedIn) {
      loadReplay();
    }
  }, [isLoggedIn, loadReplay]);

  async function saveSnapshot(snapshotOverride = {}) {
    const targetRoom = joinedRoom || roomId || 'interview-room';

    const canvasObjects = snapshotOverride?.data?.canvasObjects?.length
      ? snapshotOverride.data.canvasObjects
      : latestCanvasRef.current || [];

    const codeDocuments = (snapshotOverride?.data?.codeDocuments && Object.keys(snapshotOverride.data.codeDocuments).length > 0)
      ? snapshotOverride.data.codeDocuments
      : latestCodeRef.current || {};

    const payload = {
      data: {
        canvasObjects,
        codeDocuments
      }
    };

    try {
      const result = await apiRequest(`/api/sessions/${targetRoom}/snapshot`, {
        method: 'POST',
        token: authToken,
        body: JSON.stringify(payload)
      });
      setStatusMessage(`Checkpoint saved as Version v${result.version}!`);
      await loadReplay(targetRoom);
      return result;
    } catch (error) {
      setStatusMessage(`Save error: ${error.message}`);
    }
  }

  function restoreSnapshot(snapshot) {
    if (!snapshot) return;
    setRestoredSnapshot({
      ...snapshot,
      restoredAt: Date.now()
    });
    setStatusMessage(`Restored checkpoint version v${snapshot.version}!`);
  }

  async function playReplayTimeline() {
    if (snapshotReplay.length === 0) return;
    setIsPlayingReplay(true);

    const chronologicalSnapshots = [...snapshotReplay].reverse();

    for (let i = 0; i < chronologicalSnapshots.length; i++) {
      const snap = chronologicalSnapshots[i];
      restoreSnapshot(snap);
      setStatusMessage(`Replaying version v${snap.version} (${i + 1}/${chronologicalSnapshots.length})...`);
      await new Promise((res) => setTimeout(res, 1400));
    }

    setIsPlayingReplay(false);
    setStatusMessage('Replay playback finished.');
  }


  if (!isLoggedIn) {
    return (
      <main className="login-screen">
        <section className="login-hero">
          <div className="brand-mark large">
            <Braces size={34} />
          </div>
          <h1>SyncSpace</h1>
          <p>Real-time whiteboard, room chat, activity tracking, and developer collaboration workspace.</p>
          <form className="login-card" onSubmit={login}>
            <label>
              Display name
              <input value={userName} onChange={(event) => setUserName(event.target.value)} />
            </label>
            <label>
              Role
              <select value={role} onChange={(event) => setRole(event.target.value)}>
                <option>Candidate</option>
                <option>Interviewer</option>
                <option>Developer</option>
                <option>Mentor</option>
              </select>
            </label>
            <button type="submit">
              <Sparkles size={18} />
              Enter Workspace
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Braces size={24} />
          </div>
          <div>
            <h1>SyncSpace</h1>
            <p>Real-time collaboration command center</p>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="profile-pill">
            <span>{userName.slice(0, 1).toUpperCase()}</span>
            <strong>{role}</strong>
          </div>
          <div className={isConnected ? 'status connected' : 'status'}>
            {isConnected ? <Wifi size={18} /> : <WifiOff size={18} />}
            <span>{isConnected ? 'Connected' : 'Offline'}</span>
          </div>
        </div>
      </header>

      <section className="hero-band">
        <div>
          <p>Live Session</p>
          <h2>{joinedRoom || 'Ready to start a collaborative room'}</h2>
        </div>
        <div className="hero-metrics">
          <Metric icon={<Users size={18} />} label="Users" value={users.length} />
          <Metric icon={<PenLine size={18} />} label="Strokes" value={stats.strokes} />
          <Metric icon={<MessageSquare size={18} />} label="Messages" value={stats.messages} />
        </div>
      </section>

      <section className="session-bar">
        <form onSubmit={joinRoom} className="join-form">
          <label>
            Room
            <input value={roomId} onChange={(event) => setRoomId(event.target.value)} />
          </label>
          <label>
            Password
            <input
              value={roomPassword}
              onChange={(event) => setRoomPassword(event.target.value)}
              placeholder="Optional"
              type="password"
            />
          </label>
          <button type="button" className="secure-button" onClick={createSecureRoom}>
            <ShieldCheck size={18} />
            Create Secure Room
          </button>
          <button type="submit">
            <LogIn size={18} />
            Join
          </button>
        </form>

        <div className="room-summary">
          <Users size={18} />
          <strong>{users.length}</strong>
          <span>{joinedRoom || 'No room joined'}</span>
        </div>

        {joinedRoom && (
          <button className="leave-button" type="button" onClick={leaveRoom}>
            <LogOut size={18} />
            Leave
          </button>
        )}
      </section>

      <section className="status-strip">
        <ShieldCheck size={17} />
        <span>{statusMessage}</span>
        {createdRoomId && <strong>API room id: {createdRoomId}</strong>}
      </section>

      <section className="workspace">
        <WhiteboardPanel
          socket={socket}
          joinedRoom={joinedRoom}
          userName={userName}
          onStats={setStats}
          onSaveSnapshot={saveSnapshot}
          onLoadReplay={loadReplay}
          onCanvasContext={handleCanvasContext}
          restoredSnapshot={restoredSnapshot}
        />
        <CodePanel
          socket={socket}
          joinedRoom={joinedRoom}
          authToken={authToken}
          onStatus={setStatusMessage}
          onSaveSnapshot={saveSnapshot}
          onCodeContext={handleCodeContext}
          restoredSnapshot={restoredSnapshot}
        />
      </section>

      <aside className="collaboration-panel">
        <LiveCharts stats={stats} users={users.length} />

        <section className="replay-timeline-card">
          <h2><History size={17} /> Replay Timeline</h2>
          <div className="replay-header-actions">
            <button className="secondary-action" type="button" onClick={() => loadReplay()}>
              <RotateCcw size={15} />
              Refresh Replay
            </button>
            <button
              className="secondary-action play-btn"
              type="button"
              onClick={playReplayTimeline}
              disabled={isPlayingReplay || snapshotReplay.length === 0}
            >
              <Play size={15} />
              {isPlayingReplay ? 'Playing...' : 'Play All'}
            </button>
          </div>
          <div className="replay-list">
            {snapshotReplay.length === 0 ? (
              <p className="muted">Click Save (💾) on the whiteboard or code editor to record checkpoints.</p>
            ) : (
              snapshotReplay.map((snapshot) => {
                const shapesCount = snapshot.data?.canvasObjects?.length || 0;
                const codeFilesCount = Object.keys(snapshot.data?.codeDocuments || {}).length;
                const isActive = restoredSnapshot?.version === snapshot.version;

                return (
                  <button
                    className={isActive ? 'replay-row active' : 'replay-row'}
                    key={snapshot.id || snapshot.version}
                    type="button"
                    onClick={() => restoreSnapshot(snapshot)}
                  >
                    <div>
                      <strong>v{snapshot.version}</strong>
                      <span className="replay-meta">
                        {shapesCount} shape(s) • {codeFilesCount} file(s)
                      </span>
                    </div>
                    <span className="replay-time">
                      {snapshot.savedAt ? new Date(snapshot.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>


        <section>
          <h2>Collaborators</h2>
          <div className="user-list">
            {users.length === 0 ? (
              <p className="muted">Join a room to see active users.</p>
            ) : (
              users.map((user) => (
                <div className="user-row" key={user.id}>
                  <span>{user.name.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <strong>{user.name}</strong>
                    <p>{new Date(user.joinedAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2>Room Chat</h2>
          <p className={joinedRoom ? 'room-chat-status active' : 'room-chat-status'}>
            {joinedRoom ? `Messages are scoped to ${joinedRoom}.` : 'Join a room to unlock chat.'}
          </p>
          <form className="message-form" onSubmit={sendMessage}>
            <input
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              placeholder={joinedRoom ? `Send a note to ${joinedRoom}` : 'Join a room to send notes'}
              disabled={!joinedRoom}
            />
            <button type="submit" disabled={!joinedRoom || !messageText.trim()}>
              <MessageSquare size={17} />
            </button>
          </form>
          <div className="message-list">
            {messages.map((message) => (
              <div className="message" key={message.id}>
                <strong>{message.userName}</strong>
                <p>{message.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>Activity</h2>
          <div className="activity-list">
            {activity.map((item) => (
              <p key={item.id}>
                <span>{formatActivityTime(item.at)}</span>
                {item.message}
              </p>
            ))}
          </div>
        </section>

        <AIAssistantPanel
          roomId={joinedRoom}
          authToken={authToken}
          code={activeCodeContext}
          onStatus={setStatusMessage}
        />
      </aside>
    </main>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="metric">
      {icon}
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function LiveCharts({ stats, users }) {
  const data = [
    { label: 'Users', value: users, color: '#176b87' },
    { label: 'Strokes', value: stats.strokes, color: '#d94f30' },
    { label: 'Shapes', value: stats.shapes, color: '#5b7c2a' },
    { label: 'Chat', value: stats.messages, color: '#7c4dff' },
    { label: 'Cursors', value: stats.cursorMoves, color: '#c08a1d' }
  ];
  const max = Math.max(1, ...data.map((item) => item.value));

  return (
    <section>
      <h2><BarChart3 size={17} /> Live Charts</h2>
      <div className="chart-list">
        {data.map((item) => (
          <div className="chart-row" key={item.label}>
            <span>{item.label}</span>
            <div>
              <i style={{ width: `${Math.max(8, (item.value / max) * 100)}%`, background: item.color }} />
            </div>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhiteboardPanel({
  socket,
  joinedRoom,
  userName,
  onStats,
  onSaveSnapshot,
  onLoadReplay,
  onCanvasContext,
  restoredSnapshot
}) {
  const containerRef = useRef(null);
  const isDrawingRef = useRef(false);

  const [color, setColor] = useState('#176b87');
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState('pen');
  const [stageSize, setStageSize] = useState({ width: 1, height: WHITEBOARD_HEIGHT });
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [lines, setLines] = useState([]);
  const [rectangles, setRectangles] = useState([]);
  const [arrows, setArrows] = useState([]);
  const [textItems, setTextItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState([]);

  useEffect(() => {
    const allObjects = [
      ...lines.map((line) => ({ ...line, type: 'line' })),
      ...rectangles,
      ...arrows,
      ...textItems
    ];
    onCanvasContext?.(allObjects);
  }, [lines, rectangles, arrows, textItems, onCanvasContext]);


  function captureHistory() {
    setHistory((current) => [
      ...current,
      {
        lines,
        rectangles,
        arrows,
        textItems
      }
    ].slice(-20));
    setRedoStack([]);
  }

  function restoreCanvasState(snapshot) {
    setLines(snapshot.lines || []);
    setRectangles(snapshot.rectangles || []);
    setArrows(snapshot.arrows || []);
    setTextItems(snapshot.textItems || []);
  }

  const resizeCanvas = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { width } = container.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(width));

    setStageSize((current) => {
      if (current.width === nextWidth && current.height === WHITEBOARD_HEIGHT) {
        return current;
      }

      return {
        width: nextWidth,
        height: WHITEBOARD_HEIGHT
      };
    });
  }, []);

  useEffect(() => {
    resizeCanvas();

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return undefined;

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [resizeCanvas]);

  useEffect(() => {
    function addRemoteLine(line) {
      setLines((current) => [...current, line]);
    }

    function addRemoteShape(shape) {
      if (shape.type === 'rectangle') {
        setRectangles((current) => [...current, shape]);
      }

      if (shape.type === 'arrow') {
        setArrows((current) => [...current, shape]);
      }

      if (shape.type === 'text') {
        setTextItems((current) => [...current, shape]);
      }
    }

    function updateRemoteCursor(cursor) {
      setRemoteCursors((current) => {
        const withoutCurrentUser = current.filter((item) => item.userId !== cursor.userId);
        return [...withoutCurrentUser, cursor];
      });
    }

    function removeRemoteCursor({ userId }) {
      setRemoteCursors((current) => current.filter((item) => item.userId !== userId));
    }

    socket.on('whiteboard-draw', addRemoteLine);
    socket.on('whiteboard-shape', addRemoteShape);
    socket.on('whiteboard-cursor', updateRemoteCursor);
    socket.on('whiteboard-cursor-left', removeRemoteCursor);
    socket.on('whiteboard-clear', clearCanvas);

    return () => {
      socket.off('whiteboard-draw', addRemoteLine);
      socket.off('whiteboard-shape', addRemoteShape);
      socket.off('whiteboard-cursor', updateRemoteCursor);
      socket.off('whiteboard-cursor-left', removeRemoteCursor);
      socket.off('whiteboard-clear', clearCanvas);
    };
  }, [socket]);

  useEffect(() => {
    const objects = restoredSnapshot?.data?.canvasObjects;
    if (!objects) return;

    setLines(objects.filter((item) => item.type === 'line'));
    setRectangles(objects.filter((item) => item.type === 'rectangle'));
    setArrows(objects.filter((item) => item.type === 'arrow'));
    setTextItems(objects.filter((item) => item.type === 'text'));
  }, [restoredSnapshot]);

  function updateStat(key) {
    onStats((current) => ({ ...current, [key]: current[key] + 1 }));
  }

  function broadcastCursor(point) {
    if (!joinedRoom || !point) return;

    socket.emit('whiteboard-cursor', {
      x: point.x,
      y: point.y,
      color,
      userName
    });
  }

  function getCanvasPoint(stage) {
    const point = stage.getPointerPosition();
    if (!point) return null;

    return {
      x: (point.x - stagePosition.x) / stageScale,
      y: (point.y - stagePosition.y) / stageScale
    };
  }

  function handlePointerDown(event) {
    if (tool === 'pan') return;

    isDrawingRef.current = true;

    const stage = event.target.getStage();
    const point = getCanvasPoint(stage);
    if (!point) return;
    broadcastCursor(point);
    captureHistory();

    if (tool === 'rectangle') {
      const nextRectangle = {
        id: crypto.randomUUID(),
        type: 'rectangle',
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
        color,
        brushSize
      };

      setRectangles((current) => [...current, nextRectangle]);
      return;
    }

    if (tool === 'arrow') {
      const nextArrow = {
        id: crypto.randomUUID(),
        type: 'arrow',
        points: [point.x, point.y, point.x, point.y],
        color,
        brushSize
      };

      setArrows((current) => [...current, nextArrow]);
      return;
    }

    if (tool === 'text') {
      const nextText = {
        id: crypto.randomUUID(),
        type: 'text',
        x: point.x,
        y: point.y,
        text: 'Text note',
        color
      };

      setTextItems((current) => [...current, nextText]);
      updateStat('shapes');
      if (joinedRoom) {
        socket.emit('whiteboard-shape', nextText);
      }
      isDrawingRef.current = false;
      return;
    }

    const nextLine = {
      id: crypto.randomUUID(),
      points: [point.x, point.y],
      color,
      brushSize
    };

    setLines((current) => [...current, nextLine]);
  }

  function handlePointerMove(event) {
    if (!isDrawingRef.current) return;

    const stage = event.target.getStage();
    const point = getCanvasPoint(stage);
    if (!point) return;
    broadcastCursor(point);

    if (tool === 'rectangle') {
      setRectangles((current) => {
        const nextRectangles = [...current];
        const lastRectangle = { ...nextRectangles[nextRectangles.length - 1] };
        lastRectangle.width = point.x - lastRectangle.x;
        lastRectangle.height = point.y - lastRectangle.y;
        nextRectangles[nextRectangles.length - 1] = lastRectangle;
        return nextRectangles;
      });
      return;
    }

    if (tool === 'arrow') {
      setArrows((current) => {
        const nextArrows = [...current];
        const lastArrow = { ...nextArrows[nextArrows.length - 1] };
        lastArrow.points = [lastArrow.points[0], lastArrow.points[1], point.x, point.y];
        nextArrows[nextArrows.length - 1] = lastArrow;
        return nextArrows;
      });
      return;
    }

    setLines((current) => {
      const nextLines = [...current];
      const lastLine = { ...nextLines[nextLines.length - 1] };
      lastLine.points = lastLine.points.concat([point.x, point.y]);
      nextLines[nextLines.length - 1] = lastLine;
      return nextLines;
    });
  }

  function handlePointerUp() {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (tool === 'rectangle') {
      updateStat('shapes');
      if (joinedRoom) {
        setRectangles((current) => {
          const lastRectangle = current[current.length - 1];
          if (lastRectangle) {
            socket.emit('whiteboard-shape', lastRectangle);
          }
          return current;
        });
      }
      return;
    }

    if (tool === 'arrow') {
      updateStat('shapes');
      if (joinedRoom) {
        setArrows((current) => {
          const lastArrow = current[current.length - 1];
          if (lastArrow) {
            socket.emit('whiteboard-shape', lastArrow);
          }
          return current;
        });
      }
      return;
    }

    updateStat('strokes');
    if (joinedRoom) {
      setLines((current) => {
        const lastLine = current[current.length - 1];
        if (lastLine) {
          socket.emit('whiteboard-draw', lastLine);
        }
        return current;
      });
    }
  }

  function clearCanvas() {
    setLines([]);
    setRectangles([]);
    setArrows([]);
    setTextItems([]);
  }

  function clearLocalAndRemoteCanvas() {
    captureHistory();
    clearCanvas();

    if (joinedRoom) {
      socket.emit('whiteboard-clear');
    }
  }

  function undoCanvas() {
    const previous = history[history.length - 1];
    if (!previous) return;

    setRedoStack((current) => [
      ...current,
      { lines, rectangles, arrows, textItems }
    ].slice(-20));
    setHistory((current) => current.slice(0, -1));
    restoreCanvasState(previous);
  }

  function redoCanvas() {
    const next = redoStack[redoStack.length - 1];
    if (!next) return;

    setHistory((current) => [
      ...current,
      { lines, rectangles, arrows, textItems }
    ].slice(-20));
    setRedoStack((current) => current.slice(0, -1));
    restoreCanvasState(next);
  }

  function zoomCanvas(delta) {
    setStageScale((current) => Math.min(2, Math.max(0.6, Number((current + delta).toFixed(2)))));
  }

  function saveCanvasSnapshot() {
    onSaveSnapshot({
      data: {
        canvasObjects: [
          ...lines.map((line) => ({ ...line, type: 'line' })),
          ...rectangles,
          ...arrows,
          ...textItems
        ],
        codeDocuments: {}
      }
    });
  }

  return (
    <section className="pane whiteboard-pane">
      <div className="pane-header">
        <div>
          <h2>Whiteboard</h2>
          <p>Konva canvas with synced tools</p>
        </div>
        <div className="whiteboard-controls" aria-label="Whiteboard tools">
          <div className="tool-toggle" aria-label="Drawing mode">
            <button className={tool === 'pen' ? 'active' : ''} type="button" onClick={() => setTool('pen')} title="Pen">
              <PenLine size={16} />
            </button>
            <button className={tool === 'rectangle' ? 'active' : ''} type="button" onClick={() => setTool('rectangle')} title="Rectangle">
              <RectangleHorizontal size={16} />
            </button>
            <button className={tool === 'arrow' ? 'active' : ''} type="button" onClick={() => setTool('arrow')} title="Arrow">
              <Move size={16} />
            </button>
            <button className={tool === 'text' ? 'active' : ''} type="button" onClick={() => setTool('text')} title="Text">
              <Type size={16} />
            </button>
            <button className={tool === 'pan' ? 'active' : ''} type="button" onClick={() => setTool('pan')} title="Pan">
              <Move size={16} />
            </button>
          </div>
          <label className="control-color" title="Brush color">
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              aria-label="Brush color"
            />
          </label>
          <label className="control-range" title="Brush size">
            <span>Size</span>
            <input
              type="range"
              min="1"
              max="40"
              value={brushSize}
              onChange={(event) => setBrushSize(Number(event.target.value))}
              aria-label="Brush size"
            />
            <span className="control-range-value">{brushSize}px</span>
          </label>
          <button type="button" className="clear-button" onClick={clearLocalAndRemoteCanvas}>
            <Eraser size={16} />
            Clear
          </button>
          <button type="button" className="clear-button icon-only" onClick={undoCanvas} disabled={!history.length} title="Undo">
            <Undo2 size={16} />
          </button>
          <button type="button" className="clear-button icon-only" onClick={redoCanvas} disabled={!redoStack.length} title="Redo">
            <Redo2 size={16} />
          </button>
          <button type="button" className="clear-button icon-only" onClick={() => zoomCanvas(-0.1)} title="Zoom out">
            <Minus size={16} />
          </button>
          <span className="zoom-label">{Math.round(stageScale * 100)}%</span>
          <button type="button" className="clear-button icon-only" onClick={() => zoomCanvas(0.1)} title="Zoom in">
            <Plus size={16} />
          </button>
          <button type="button" className="clear-button" onClick={saveCanvasSnapshot} disabled={!joinedRoom}>
            <Save size={16} />
            Save
          </button>
          <button type="button" className="clear-button" onClick={onLoadReplay} disabled={!joinedRoom}>
            <History size={16} />
            Replay
          </button>
        </div>
      </div>

      <div className="whiteboard-stage" ref={containerRef}>
        {joinedRoom && (
          <div className="sync-badge">
            Live in {joinedRoom}
          </div>
        )}
        <Stage
          className="whiteboard-canvas"
          width={stageSize.width}
          height={stageSize.height}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        >
          <Layer
            scaleX={stageScale}
            scaleY={stageScale}
            x={stagePosition.x}
            y={stagePosition.y}
            draggable={tool === 'pan'}
            onDragEnd={(event) => setStagePosition({ x: event.target.x(), y: event.target.y() })}
          >
            {lines.map((line) => (
              <Line
                key={line.id}
                points={line.points}
                stroke={line.color}
                strokeWidth={line.brushSize}
                tension={0.45}
                lineCap="round"
                lineJoin="round"
              />
            ))}
            {rectangles.map((rectangle) => (
              <Rect
                key={rectangle.id}
                x={rectangle.x}
                y={rectangle.y}
                width={rectangle.width}
                height={rectangle.height}
                stroke={rectangle.color}
                strokeWidth={rectangle.brushSize}
              />
            ))}
            {arrows.map((arrow) => (
              <Arrow
                key={arrow.id}
                points={arrow.points}
                stroke={arrow.color}
                fill={arrow.color}
                strokeWidth={arrow.brushSize}
                pointerLength={12}
                pointerWidth={12}
              />
            ))}
            {textItems.map((item) => (
              <Text
                key={item.id}
                x={item.x}
                y={item.y}
                text={item.text}
                fill={item.color}
                fontSize={18}
                fontStyle="bold"
              />
            ))}
            {remoteCursors.map((cursor) => (
              <React.Fragment key={cursor.userId}>
                <Line
                  points={[cursor.x, cursor.y, cursor.x + 14, cursor.y + 28, cursor.x + 6, cursor.y + 24]}
                  closed
                  fill={cursor.color}
                  stroke="#ffffff"
                  strokeWidth={1}
                />
                <Text
                  x={cursor.x + 16}
                  y={cursor.y + 14}
                  text={cursor.userName}
                  fill="#102235"
                  fontSize={13}
                  fontStyle="bold"
                />
              </React.Fragment>
            ))}
          </Layer>
        </Stage>
      </div>
    </section>
  );
}

function CodePanel({ socket, joinedRoom, authToken, onStatus, onSaveSnapshot, onCodeContext, restoredSnapshot }) {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(LANGUAGE_TEMPLATES.javascript);
  const [activeTab, setActiveTab] = useState('output');
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [isRunning, setIsRunning] = useState(false);
  const [runnerSource, setRunnerSource] = useState('Ready');
  const [output, setOutput] = useState([
    {
      id: 'initial-output',
      userName: 'VS Code Runner',
      text: 'Press Run (▶) or Ctrl+Enter to execute code in Python, Java, JavaScript, C++, or Go.'
    }
  ]);

  const textareaRef = useRef(null);
  const gutterRef = useRef(null);

  const fileNames = {
    javascript: 'index.js',
    python: 'main.py',
    java: 'Main.java',
    cpp: 'main.cpp',
    go: 'main.go'
  };


  useEffect(() => {
    onCodeContext(code);
  }, [code, onCodeContext]);

  useEffect(() => {
    const documents = restoredSnapshot?.data?.codeDocuments;
    if (!documents) return;

    const [nextLanguage, nextCode] = Object.entries(documents)[0] || [];
    if (nextLanguage && nextCode) {
      setLanguage(nextLanguage);
      setCode(nextCode);
      onStatus(`Restored ${nextLanguage} code from checkpoint.`);
    }
  }, [onStatus, restoredSnapshot]);

  useEffect(() => {
    function receiveCodeUpdate(payload) {
      if (payload.code !== code) {
        setCode(payload.code);
        setLanguage(payload.language || 'javascript');
        onStatus(`${payload.userName} synced code changes.`);
      }
    }

    function receiveOutput(payload) {
      setOutput((current) => [
        {
          id: crypto.randomUUID(),
          userName: payload.userName,
          text: payload.output
        },
        ...current
      ].slice(0, 8));
    }

    socket.on('code-update', receiveCodeUpdate);
    socket.on('code-run-output', receiveOutput);

    return () => {
      socket.off('code-update', receiveCodeUpdate);
      socket.off('code-run-output', receiveOutput);
    };
  }, [code, onStatus, socket]);

  function syncScroll() {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }

  function updateCursorPos() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart);
    const lines = textBeforeCursor.split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1
    });
  }

  function handleKeyDown(event) {
    if (event.key === 'Tab') {
      event.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const nextCode = code.substring(0, start) + '  ' + code.substring(end);
      updateCode(nextCode);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        updateCursorPos();
      }, 0);
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      runCode();
    }
  }

  function updateCode(nextCode) {
    setCode(nextCode);

    if (joinedRoom) {
      socket.emit('code-update', {
        code: nextCode,
        language
      });
    }
  }

  function changeLanguage(nextLanguage) {
    const nextCode = LANGUAGE_TEMPLATES[nextLanguage] || '';
    setLanguage(nextLanguage);
    setCode(nextCode);
    onStatus(`Switched editor to ${nextLanguage}.`);

    if (joinedRoom) {
      socket.emit('code-update', {
        code: nextCode,
        language: nextLanguage
      });
    }
  }

  async function runCode() {
    setIsRunning(true);
    let executionText = '';
    let sourceTag = 'Hosted Service';

    try {
      const result = await apiRequest('/api/code/run', {
        method: 'POST',
        token: authToken,
        body: JSON.stringify({ language, code })
      });

      executionText = result.run?.output || result.run?.stderr || result.message || 'Execution completed.';
      if (result.source?.startsWith('local-')) {
        sourceTag = `Local ${result.source.replace('local-', '').toUpperCase()}`;
        onStatus(`Code executed via ${sourceTag}.`);
      } else {
        onStatus(`Code executed on hosted service.`);
      }
      setRunnerSource(sourceTag);
    } catch (error) {
      executionText = error.message;
      onStatus(error.message);
      setRunnerSource('Error');
    } finally {
      setIsRunning(false);
    }

    if (joinedRoom) {
      socket.emit('code-run-output', {
        language,
        output: executionText
      });
    } else {
      setOutput((current) => [
        {
          id: crypto.randomUUID(),
          userName: sourceTag,
          text: executionText
        },
        ...current
      ].slice(0, 8));
    }
  }

  function saveCodeSnapshot() {
    onSaveSnapshot({
      data: {
        canvasObjects: [],
        codeDocuments: {
          [language]: code
        }
      }
    });
  }

  const lines = code.split('\n');

  return (
    <section className="pane vscode-editor-pane">
      <div className="vscode-top-bar">
        <div className="vscode-tabs">
          {Object.keys(LANGUAGE_TEMPLATES).map((langKey) => (
            <button
              key={langKey}
              type="button"
              className={language === langKey ? 'vscode-tab active' : 'vscode-tab'}
              onClick={() => changeLanguage(langKey)}
            >
              <span className={`file-icon ${langKey}`} />
              <span>{fileNames[langKey]}</span>
            </button>
          ))}
        </div>

        <div className="vscode-actions">
          <button type="button" className="vscode-run-btn" onClick={runCode} disabled={isRunning}>
            <Play size={14} fill="currentColor" />
            <span>{isRunning ? 'Running...' : 'Run'}</span>
          </button>
          <button type="button" className="vscode-icon-btn" onClick={saveCodeSnapshot} disabled={!joinedRoom} title="Save Checkpoint">
            <Save size={14} />
          </button>
        </div>
      </div>

      <div className="vscode-workbench">
        <div className="vscode-editor-container">
          <div className="vscode-gutter" ref={gutterRef}>
            {lines.map((_, i) => (
              <div
                key={i}
                className={cursorPos.line === i + 1 ? 'vscode-line-num active' : 'vscode-line-num'}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            className="vscode-textarea"
            value={code}
            onChange={(e) => updateCode(e.target.value)}
            onScroll={syncScroll}
            onClick={updateCursorPos}
            onKeyUp={updateCursorPos}
            onKeyDown={handleKeyDown}
            spellCheck="false"
            aria-label="VS Code Editor"
          />
        </div>

        <div className="vscode-panel">
          <div className="vscode-panel-header">
            <div className="vscode-panel-tabs">
              <button
                type="button"
                className={activeTab === 'output' ? 'vscode-panel-tab active' : 'vscode-panel-tab'}
                onClick={() => setActiveTab('output')}
              >
                OUTPUT
              </button>
              <button
                type="button"
                className={activeTab === 'terminal' ? 'vscode-panel-tab active' : 'vscode-panel-tab'}
                onClick={() => setActiveTab('terminal')}
              >
                TERMINAL
              </button>
            </div>
            <div className="vscode-panel-controls">
              <span className="vscode-source-badge">{runnerSource}</span>
              <button type="button" className="vscode-panel-clear" onClick={() => setOutput([])} title="Clear Output">
                <Eraser size={13} />
              </button>
            </div>
          </div>

          <div className="vscode-panel-body">
            {output.length === 0 ? (
              <p className="vscode-output-empty">No output generated yet.</p>
            ) : (
              output.map((item) => (
                <div key={item.id} className="vscode-output-line">
                  <span className="vscode-output-user">[{item.userName}]</span>
                  <pre className="vscode-output-text">{item.text}</pre>
                </div>
              ))
            )}
          </div>
        </div>

        <footer className="vscode-status-bar">
          <div className="status-left">
            <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
            <span>Spaces: 2</span>
            <span>UTF-8</span>
          </div>
          <div className="status-right">
            <span>{language.toUpperCase()}</span>
            <span className="status-dot green" />
          </div>
        </footer>
      </div>
    </section>
  );
}

function AIAssistantPanel({ roomId, authToken, code, onStatus }) {
  const [mode, setMode] = useState('explain');
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hi, I am SyncSpace AI. Ask me to explain code, find bugs, optimize, generate tests, or analyze your whiteboard architecture.'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  async function askAssistant(event) {
    event.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt && !code.trim()) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: cleanPrompt || 'Analyze the current code context.'
    };

    setMessages((current) => [...current, userMessage]);
    setPrompt('');
    setIsLoading(true);

    try {
      const result = await apiRequest('/api/ai/assistant', {
        method: 'POST',
        token: authToken,
        body: JSON.stringify({
          mode,
          prompt: userMessage.text,
          code,
          roomId
        })
      });

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: result.source === 'local-fallback'
            ? `${result.answer}\n\nSyncSpace used local fallback because the hosted AI provider is unavailable.`
            : result.answer
        }
      ]);
      onStatus(result.source === 'local-fallback'
        ? 'SyncSpace AI used local fallback.'
        : 'SyncSpace AI returned an answer.');
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: error.message
        }
      ]);
      onStatus(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="ai-panel">
      <h2><Bot size={17} /> SyncSpace AI</h2>
      <div className="ai-chat-log">
        {messages.map((message) => (
          <div className={`ai-message ${message.role}`} key={message.id}>
            <strong>{message.role === 'user' ? 'You' : 'SyncSpace AI'}</strong>
            <p>{message.text}</p>
          </div>
        ))}
      </div>
      <form className="ai-form" onSubmit={askAssistant}>
        <label>
          Mode
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="explain">Explain code</option>
            <option value="bugs">Find bugs</option>
            <option value="optimize">Optimize</option>
            <option value="tests">Generate tests</option>
            <option value="error">Explain error</option>
            <option value="architecture">Analyze architecture</option>
            <option value="debug">Debug fix</option>
          </select>
        </label>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask about code, bugs, errors, tests, or architecture..."
          rows="3"
        />
        <button type="submit" disabled={isLoading || (!prompt.trim() && !code.trim())}>
          {mode === 'bugs' ? <Bug size={16} /> : <SearchCode size={16} />}
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
