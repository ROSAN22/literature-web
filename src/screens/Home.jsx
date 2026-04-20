// src/screens/Home.jsx
import React from 'react';

export default function Home({ onNavigate }) {
  return (
    <div style={{ padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '32px 0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
          {['red','yellow','blue','green'].map((c, i) => (
            <div key={c} className={`uno-card sm ${c}`} style={{ margin: 0 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{i}</span>
            </div>
          ))}
        </div>
        <h1 style={{ fontSize: 42, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>Literature</h1>
        <p style={{ color: '#9e9e9e', marginTop: 6, fontSize: 15 }}>UNO Card Edition</p>
      </div>

      {/* Main buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-primary" style={{ width: '100%', padding: '18px', fontSize: 17, borderRadius: 16 }} onClick={() => onNavigate('setup')}>
          🎮 Local / AI Game
          <span style={{ display: 'block', fontSize: 12, fontWeight: 400, opacity: 0.75, marginTop: 2 }}>Play on one device</span>
        </button>
        <button className="btn btn-success" style={{ width: '100%', padding: '18px', fontSize: 17, borderRadius: 16 }} onClick={() => onNavigate('online')}>
          🌐 Online Multiplayer
          <span style={{ display: 'block', fontSize: 12, fontWeight: 400, opacity: 0.75, marginTop: 2 }}>Share a link — play from anywhere!</span>
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => onNavigate('profile')}>👤 Profile</button>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => onNavigate('history')}>📋 History</button>
        </div>
      </div>

      {/* How to play */}
      <div className="card">
        <h3>How to play</h3>
        {[
          ['🃏', 'Half-suits', 'Red/Yellow/Blue/Green × Low(0–4) / High(5–9) = 8 sets of 5 cards'],
          ['🙋', 'Ask', 'Ask any opponent for a card — only from a half-suit you already hold'],
          ['✅', 'Got it?', 'Ask again. Wrong? Turn passes to them.'],
          ['📣', 'Declare', 'Name who on your team holds each card in a set. Correct = your team scores!'],
          ['🏆', 'Win', 'Team with most half-suits wins!'],
        ].map(([icon, title, desc]) => (
          <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{title}</div>
              <div style={{ fontSize: 13, color: '#9e9e9e', lineHeight: 1.5, marginTop: 2 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Install banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #1a1a3e, #2d1b69)', border: '1px solid #6c63ff44' }}>
        <div style={{ fontSize: 13, color: '#a89df5', fontWeight: 600, marginBottom: 6 }}>📱 Install as App</div>
        <div style={{ fontSize: 12, color: '#9e9e9e', lineHeight: 1.6 }}>
          <b style={{ color: '#c4beff' }}>iPhone:</b> Tap Share → "Add to Home Screen"<br />
          <b style={{ color: '#c4beff' }}>Android:</b> Tap menu → "Add to Home Screen" or "Install App"<br />
          Works offline too!
        </div>
      </div>
    </div>
  );
}
