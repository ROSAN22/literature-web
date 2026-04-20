// src/App.jsx
import React, { useState } from 'react';
import './styles/global.css';
import Home from './screens/Home';
import Setup from './screens/Setup';
import Game from './screens/Game';
import GameOver from './screens/GameOver';
import Online from './screens/Online';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [gameConfig, setGameConfig] = useState(null);
  const [finishedGame, setFinishedGame] = useState(null);

  function navigate(s) { setScreen(s); }

  function startGame(config) {
    setGameConfig(config);
    setScreen('game');
  }

  function handleGameOver(game) {
    setFinishedGame(game);
    setScreen('gameover');
  }

  return (
    <div className="app">
      {screen === 'home' && <Home onNavigate={navigate} />}
      {screen === 'setup' && <Setup onNavigate={navigate} onStartGame={startGame} />}
      {screen === 'game' && gameConfig && (
        <Game config={gameConfig} onNavigate={navigate} onGameOver={handleGameOver} />
      )}
      {screen === 'gameover' && finishedGame && (
        <GameOver game={finishedGame} onNavigate={navigate} />
      )}
      {screen === 'online' && (
        <Online onNavigate={navigate} onStartOnlineGame={startGame} />
      )}
      {screen === 'profile' && (
        <div style={{ padding: 24 }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('home')}>← Back</button>
          <h2 style={{ marginTop: 16 }}>Profile</h2>
          <div className="card" style={{ marginTop: 12, textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
            <p style={{ color: '#9e9e9e', fontSize: 14 }}>Profile & stats coming soon in the next update!</p>
          </div>
        </div>
      )}
      {screen === 'history' && (
        <div style={{ padding: 24 }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('home')}>← Back</button>
          <h2 style={{ marginTop: 16 }}>Game History</h2>
          <div className="card" style={{ marginTop: 12, textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <p style={{ color: '#9e9e9e', fontSize: 14 }}>No games yet. Play a game to see your history!</p>
          </div>
        </div>
      )}
    </div>
  );
}
