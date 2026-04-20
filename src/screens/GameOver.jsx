// src/screens/GameOver.jsx
import React from 'react';
import { getAllHS, hsLabel, getWinner } from '../game/engine';

export default function GameOver({ game, onNavigate }) {
  const winner = getWinner(game);
  const winLabel = winner === 'tie' ? "🤝 It's a Tie!" : `🏆 Team ${winner} Wins!`;
  const winColor = winner === 'A' ? '#1E88E5' : winner === 'B' ? '#F9A825' : '#9e9e9e';

  return (
    <div style={{ padding: '24px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: winColor, marginBottom: 8 }}>{winLabel}</div>
      </div>

      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 24 }}>
        {['A', 'B'].map(team => (
          <div key={team} style={{ textAlign: 'center', border: `2px solid ${team === 'A' ? '#1E88E5' : '#F9A825'}`, borderRadius: 16, padding: '16px 24px', minWidth: 140 }}>
            <div style={{ fontSize: 52, fontWeight: 800, color: team === 'A' ? '#1E88E5' : '#F9A825' }}>{game.scores[team]}</div>
            <div style={{ fontSize: 13, color: '#9e9e9e', marginBottom: 8 }}>Team {team}</div>
            {(team === 'A' ? game.teamA : game.teamB).map(i => (
              <div key={i} style={{ fontSize: 12, color: '#ccc', marginBottom: 2 }}>{game.names[i]}</div>
            ))}
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Half-suits claimed</h3>
        {getAllHS().map(id => {
          const claimed = game.claimed[id];
          if (!claimed) return null;
          return (
            <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #2d2d4e' }}>
              <span style={{ fontSize: 13, color: '#ccc' }}>{hsLabel(id)}</span>
              <span className={`badge badge-${claimed.toLowerCase()}`}>Team {claimed}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" style={{ flex: 1, padding: 14 }} onClick={() => onNavigate('setup')}>🎮 Play Again</button>
        <button className="btn btn-outline" style={{ flex: 1, padding: 14 }} onClick={() => onNavigate('home')}>🏠 Home</button>
      </div>
    </div>
  );
}
