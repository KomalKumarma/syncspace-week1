import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { io } from 'socket.io-client';
import {
  Braces,
  Code2,
  Eraser,
  LogOut,
  LogIn,
  MessageSquare,
  Users,
  Wifi,
  WifiOff
} from 'lucide-react';
import './styles.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

function App() {
  const socket = useMemo(() => io(SERVER_URL, { autoConnect: true }), []);
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState('interview-room');
  const [joinedRoom, setJoinedRoom] = useState('');
  const [userName, setUserName] = useState(`User-${Math.floor(Math.random() * 900 + 100)}`);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    function addActivity(message) {
      setActivity((current) => [
        { id: crypto.randomUUID(), message, at: new Date().toISOString() },
        ...current
      ].slice(0, 6));
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
      socket.off('room-error');
      socket.disconnect();
    };
  }, [socket]);

  function joinRoom(event) {
    event.preventDefault();
    socket.emit('join-room', { roomId, userName });
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Braces size={24} />
          </div>
          <div>
            <h1>SyncSpace</h1>
            <p>Week 1 collaboration scaffold</p>
          </div>
        </div>

        <div className={isConnected ? 'status connected' : 'status'}>
          {isConnected ? <Wifi size={18} /> : <WifiOff size={18} />}
          <span>{isConnected ? 'Connected' : 'Offline'}</span>
        </div>
      </header>

      <section className="session-bar">
        <form onSubmit={joinRoom} className="join-form">
          <label>
            Name
            <input value={userName} onChange={(event) => setUserName(event.target.value)} />
          </label>
          <label>
            Room
            <input value={roomId} onChange={(event) => setRoomId(event.target.value)} />
          </label>
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

      <section className="workspace">
        <WhiteboardPanel />
        <CodePanel />
      </section>

      <aside className="collaboration-panel">
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
          <form className="message-form" onSubmit={sendMessage}>
            <input
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              placeholder="Send a room note"
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
              <p key={item.id}>{item.message}</p>
            ))}
          </div>
        </section>
      </aside>
    </main>
  );
}

function WhiteboardPanel() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const isDrawingRef = useRef(false);
  const dimensionsRef = useRef({ width: 0, height: 0 });

  const [color, setColor] = useState('#176b87');
  const [brushSize, setBrushSize] = useState(4);

  const resizeCanvas = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const { width, height } = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    dimensionsRef.current = { width, height };

    const context = canvas.getContext('2d');
    context.scale(dpr, dpr);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;
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

  function getPointerPosition(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function handlePointerDown(event) {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    canvas.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;

    const { x, y } = getPointerPosition(event);
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    context.beginPath();
    context.moveTo(x, y);
    // Draw a dot for single clicks/taps.
    context.lineTo(x, y);
    context.stroke();
  }

  function handlePointerMove(event) {
    if (!isDrawingRef.current) return;
    const context = contextRef.current;
    if (!context) return;

    const { x, y } = getPointerPosition(event);
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    context.lineTo(x, y);
    context.stroke();
    context.beginPath();
    context.moveTo(x, y);
  }

  function handlePointerUp(event) {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }

  function clearCanvas() {
    const context = contextRef.current;
    if (!context) return;
    const { width, height } = dimensionsRef.current;
    context.clearRect(0, 0, width, height);
  }

  return (
    <section className="pane">
      <div className="pane-header">
        <div>
          <h2>Whiteboard</h2>
          <p>Freehand canvas for Week 1</p>
        </div>
        <div className="whiteboard-controls" aria-label="Whiteboard tools">
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
          <button type="button" className="clear-button" onClick={clearCanvas}>
            <Eraser size={16} />
            Clear
          </button>
        </div>
      </div>

      <div className="whiteboard-stage" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="whiteboard-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
    </section>
  );
}

function CodePanel() {
  const starterCode = `function handleCandidateSignal(event) {
  const payload = JSON.parse(event.data);

  return {
    roomId: payload.roomId,
    syncedAt: new Date().toISOString()
  };
}`;

  return (
    <section className="pane">
      <div className="pane-header">
        <div>
          <h2>Code Editor</h2>
          <p>Editor scaffold for Week 1</p>
        </div>
        <div className="code-pill">
          <Code2 size={17} />
          JavaScript
        </div>
      </div>

      <textarea
        className="code-editor"
        defaultValue={starterCode}
        spellCheck="false"
        aria-label="Code editor scaffold"
      />
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);