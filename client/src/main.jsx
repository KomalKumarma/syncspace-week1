import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { io } from 'socket.io-client';
import { Layer, Line, Rect, Stage, Text } from 'react-konva';
import {
  Braces,
  Code2,
  Eraser,
  LogOut,
  LogIn,
  MessageSquare,
  PenLine,
  RectangleHorizontal,
  Type,
  Users,
  Wifi,
  WifiOff
} from 'lucide-react';
import './styles.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

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
        <WhiteboardPanel socket={socket} joinedRoom={joinedRoom} />
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
      </aside>
    </main>
  );
}

function WhiteboardPanel({ socket, joinedRoom }) {
  const containerRef = useRef(null);
  const isDrawingRef = useRef(false);

  const [color, setColor] = useState('#176b87');
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState('pen');
  const [stageSize, setStageSize] = useState({ width: 1, height: 420 });
  const [lines, setLines] = useState([]);
  const [rectangles, setRectangles] = useState([]);
  const [textItems, setTextItems] = useState([]);

  const resizeCanvas = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { width, height } = container.getBoundingClientRect();
    setStageSize({
      width: Math.max(1, Math.round(width)),
      height: Math.max(420, Math.round(height))
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

      if (shape.type === 'text') {
        setTextItems((current) => [...current, shape]);
      }
    }

    socket.on('whiteboard-draw', addRemoteLine);
    socket.on('whiteboard-shape', addRemoteShape);
    socket.on('whiteboard-clear', clearCanvas);

    return () => {
      socket.off('whiteboard-draw', addRemoteLine);
      socket.off('whiteboard-shape', addRemoteShape);
      socket.off('whiteboard-clear', clearCanvas);
    };
  }, [socket]);

  function handlePointerDown(event) {
    isDrawingRef.current = true;

    const stage = event.target.getStage();
    const point = stage.getPointerPosition();

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
    const point = stage.getPointerPosition();

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

    if (joinedRoom) {
      if (tool === 'rectangle') {
        setRectangles((current) => {
          const lastRectangle = current[current.length - 1];
          if (lastRectangle) {
            socket.emit('whiteboard-shape', lastRectangle);
          }
          return current;
        });
        return;
      }

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
    setTextItems([]);
  }

  function clearLocalAndRemoteCanvas() {
    clearCanvas();

    if (joinedRoom) {
      socket.emit('whiteboard-clear');
    }
  }

  return (
    <section className="pane">
      <div className="pane-header">
        <div>
          <h2>Whiteboard</h2>
          <p>Freehand canvas for Week 1</p>
        </div>
        <div className="whiteboard-controls" aria-label="Whiteboard tools">
          <div className="tool-toggle" aria-label="Drawing mode">
            <button className={tool === 'pen' ? 'active' : ''} type="button" onClick={() => setTool('pen')} title="Pen">
              <PenLine size={16} />
            </button>
            <button className={tool === 'rectangle' ? 'active' : ''} type="button" onClick={() => setTool('rectangle')} title="Rectangle">
              <RectangleHorizontal size={16} />
            </button>
            <button className={tool === 'text' ? 'active' : ''} type="button" onClick={() => setTool('text')} title="Text">
              <Type size={16} />
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
          <Layer>
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
          </Layer>
        </Stage>
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
