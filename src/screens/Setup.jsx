// src/screens/Setup.jsx
import React, { useState } from 'react';
import { Avatar } from '../components/Avatar';

export default function Setup({ onNavigate, onStartGame }) {
  const [playerCount, setPlayerCount] = useState(6);
  const [mode, setMode] = useState('ai');
  const [names, setNames] = useState(Array.from({ length: 8 }, (_, i) => i === 0 ? 'You' : `Player ${i + 1}`));

  const half = playerCount / 2;

  function start() {
    const playerNames = names.slice(0, playerCount);
    const bots = mode === 'ai' ? playerNames.map((_, i) => i > 0) : Array(playerCount).fill(false);
    onStartGame({ playerNames, playerCount, mode, bots });
  }

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-outline btn-sm" onClick={() => onNavigate('home')}>← Back</button>
        <h2 style={{ margin: 0 }}>Game Setup</h2>
      </div>

      <div className="card">
        <div className="label">Number of players</div>
        <div className="seg-group">
          {[6, 8].map(n => (
            <button key={n} className={`seg-btn ${playerCount === n ? 'active' : ''}`} onClick={() => setPlayerCount(n)}>
              {n} players ({n/2} vs {n/2})
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="label">Game mode</div>
        <div className="seg-group">
          {[['ai', '🤖 vs AI bots'], ['pass', '📱 Pass device']].map(([val, lbl]) => (
            <button key={val} className={`seg-btn ${mode === val ? 'active' : ''}`} onClick={() => setMode(val)}>
              {lbl}
            </button>
          ))}
        </div>
        {mode === 'pass' && (
          <div style={{ marginTop: 10, fontSize: 13, color: '#9e9e9e', background: '#22223b', borderRadius: 8, padding: 10 }}>
            Players take turns on the same device. Each sees only their own cards.
          </div>
        )}
      </div>

      <div className="card">
        <div className="label">Player names</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {Array.from({ length: playerCount }, (_, i) => {
            const team = i < half ? 'A' : 'B';
            const isBot = mode === 'ai' && i > 0;
            return (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Avatar name={names[i]} index={i} size={26} />
                  <span className={`badge badge-${team.toLowerCase()}`}>Team {team}</span>
                  {isBot && <span className="badge badge-gray">AI</span>}
                </div>
                <input
                  type="text"
                  value={names[i]}
                  onChange={e => { const n = [...names]; n[i] = e.target.value; setNames(n); }}
                  disabled={isBot}
                  placeholder={`Player ${i + 1}`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <button className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: 16 }} onClick={start}>
        🎮 Start Game
      </button>
    </div>
  );
}
