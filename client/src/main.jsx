import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { io } from 'socket.io-client';
import {
  Braces,
  Circle,
  Code2,
  LogOut,
  LogIn,
  MessageSquare,
  MousePointer2,
  PenLine,
  RectangleHorizontal,
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
  return (
    <section className="pane">
      <div className="pane-header">
        <div>
          <h2>Whiteboard</h2>
          <p>Canvas scaffold for Week 1</p>
        </div>
        <div className="tool-group" aria-label="Whiteboard tools">
          <button title="Select" type="button"><MousePointer2 size={18} /></button>
          <button title="Pen" type="button"><PenLine size={18} /></button>
          <button title="Rectangle" type="button"><RectangleHorizontal size={18} /></button>
          <button title="Circle" type="button"><Circle size={18} /></button>
        </div>
      </div>

      <div className="whiteboard-stage">
        <div className="canvas-grid">
          <div className="shape rectangle" />
          <div className="shape line" />
          <div className="shape circle" />
          <div className="label-chip">Architecture sketch area</div>
        </div>
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
