// src/screens/Online.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Avatar } from '../components/Avatar';
import io from 'socket.io-client';

const SERVER_URL = 'https://literature-server-xy4r.onrender.com';

export default function Online({ onNavigate, onStartOnlineGame }) {
  const [tab, setTab] = useState('create');
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [phase, setPhase] = useState('idle'); // idle | waiting
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, []);

  function connect(onConnected) {
    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', onConnected);
    socket.on('connect_error', () => setError('Cannot connect to server. Is the server running?'));
    socket.on('room:update', ({ players: ps }) => setPlayers(ps));
    socket.on('chat:message', (msg) => setChatMessages(m => [...m, msg]));
    socket.on('game:start', (config) => onStartOnlineGame({ ...config, socket }));
    socket.on('error', ({ message }) => setError(message));
  }

  function createRoom() {
    if (!playerName.trim()) { setError('Enter your name'); return; }
    setError('');
    connect(() => {
      socketRef.current.emit('room:create', { playerName: playerName.trim() }, ({ code, error: err }) => {
        if (err) { setError(err); return; }
        setRoomCode(code);
        setIsHost(true);
        setPhase('waiting');
      });
    });
  }

  function joinRoom() {
    if (!playerName.trim()) { setError('Enter your name'); return; }
    if (!joinCode.trim()) { setError('Enter room code'); return; }
    setError('');
    connect(() => {
      socketRef.current.emit('room:join', { playerName: playerName.trim(), code: joinCode.trim().toUpperCase() }, ({ error: err }) => {
        if (err) { setError(err); return; }
        setPhase('waiting');
      });
    });
  }

  function copyLink() {
    const link = `${window.location.origin}?room=${roomCode}`;
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function startGame() {
    if (players.length < 6) { setError('Need at least 6 players!'); return; }
    socketRef.current.emit('room:start');
  }

  function sendChat() {
    if (!chatInput.trim()) return;
    socketRef.current.emit('chat:message', { message: chatInput.trim() });
    setChatInput('');
  }

  // Auto-join from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) { setJoinCode(roomParam); setTab('join'); }
  }, []);

  if (phase === 'waiting') {
    return (
      <div style={{ padding: 16 }}>
        <h2>Online game</h2>

        {isHost && (
          <div className="card" style={{ background: 'linear-gradient(135deg, #1a1a3e, #22223b)', border: '1px solid #6c63ff44', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: '#a89df5', fontWeight: 600, marginBottom: 8 }}>Share this with your friends</div>
            <div style={{ fontSize: 40, fontWeight: 800, color: '#fff', letterSpacing: 8, textAlign: 'center', padding: '10px 0', fontFamily: 'monospace' }}>{roomCode}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={copyLink}>
                {copied ? '✅ Copied!' : '🔗 Copy invite link'}
              </button>
              <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => {
                const link = `${window.location.origin}?room=${roomCode}`;
                if (navigator.share) navigator.share({ title: 'Join my Literature game!', text: `Join with code: ${roomCode}`, url: link });
              }}>📤 Share</button>
            </div>
          </div>
        )}

        <div className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Players ({players.length}/8)</h3>
            <span className="badge badge-gray">Need 6–8</span>
          </div>
          {players.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #2d2d4e' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#43A047' }} />
              <Avatar name={p.name} index={i} size={30} />
              <span style={{ flex: 1, fontSize: 14, color: '#fff', fontWeight: 500 }}>{p.name}</span>
              <span className={`badge badge-${p.team === 'A' ? 'a' : 'b'}`}>Team {p.team}</span>
              {p.isHost && <span className="badge" style={{ background: '#6c63ff22', color: '#a89df5' }}>Host</span>}
            </div>
          ))}
          {players.length < 6 && (
            <div style={{ fontSize: 13, color: '#555', textAlign: 'center', padding: '10px 0' }}>
              Waiting for {6 - players.length} more player{6 - players.length !== 1 ? 's' : ''}...
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="card" style={{ marginBottom: 12 }}>
          <h3>Chat</h3>
          <div style={{ maxHeight: 120, overflowY: 'auto', marginBottom: 8 }}>
            {chatMessages.length === 0 && <div style={{ fontSize: 13, color: '#555', textAlign: 'center' }}>No messages yet</div>}
            {chatMessages.map((m, i) => (
              <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: '#a89df5', fontWeight: 600 }}>{m.player}: </span>
                <span style={{ color: '#ccc' }}>{m.message}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Say something..." />
            <button className="btn btn-primary btn-sm" onClick={sendChat}>Send</button>
          </div>
        </div>

        {error && <div style={{ fontSize: 13, color: '#e57373', marginBottom: 10 }}>{error}</div>}

        {isHost ? (
          <button className="btn btn-success" style={{ width: '100%', padding: 16, fontSize: 16 }} onClick={startGame} disabled={players.length < 6}>
            🎮 Start Game ({players.length} players)
          </button>
        ) : (
          <div style={{ textAlign: 'center', padding: 20, color: '#9e9e9e', fontSize: 14 }}>
            ⏳ Waiting for host to start the game...
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-outline btn-sm" onClick={() => onNavigate('home')}>← Back</button>
        <h2 style={{ margin: 0 }}>Online Game</h2>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #1a1a3e, #22223b)', borderRadius: 16, padding: 16, marginBottom: 16, border: '1px solid #6c63ff33' }}>
        <div style={{ fontSize: 14, color: '#a89df5', fontWeight: 600, marginBottom: 6 }}>🌐 Play from anywhere!</div>
        <div style={{ fontSize: 13, color: '#9e9e9e', lineHeight: 1.6 }}>
          Create a room → share the code or link → friends open it on their phone or computer → everyone plays together in real time!
        </div>
      </div>

      <div className="card">
        <div className="label">Your name</div>
        <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Enter your name" style={{ marginBottom: 16 }} />

        <div className="seg-group" style={{ marginBottom: 14 }}>
          {[['create', '🏠 Create room'], ['join', '🔗 Join room']].map(([val, lbl]) => (
            <button key={val} className={`seg-btn ${tab === val ? 'active' : ''}`} onClick={() => setTab(val)}>{lbl}</button>
          ))}
        </div>

        {tab === 'join' && (
          <>
            <div className="label">Room code</div>
            <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="e.g. AB12CD" maxLength={6} style={{ textAlign: 'center', fontSize: 24, fontWeight: 700, letterSpacing: 6, marginBottom: 14 }} />
          </>
        )}

        {error && <div style={{ fontSize: 13, color: '#e57373', marginBottom: 10 }}>{error}</div>}

        <button className="btn btn-primary" style={{ width: '100%', padding: 14 }} onClick={tab === 'create' ? createRoom : joinRoom}>
          {tab === 'create' ? '🏠 Create Room' : '🔗 Join Room'}
        </button>
      </div>

      <div className="card">
        <h3>How it works</h3>
        {[
          '1. Create a room → get a 6-digit code',
          '2. Share the code or invite link with friends',
          '3. Friends open the link on any device',
          '4. Once 6–8 players join, host starts the game',
          '5. Everyone plays on their own screen!',
        ].map((s, i) => <div key={i} style={{ fontSize: 13, color: '#9e9e9e', marginBottom: 6 }}>{s}</div>)}
      </div>
    </div>
  );
}
