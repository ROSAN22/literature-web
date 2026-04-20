// src/screens/Game.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import {
  createGame, teamOf, opponentsOf,
  doAsk, doDeclare, getBotMove, getAllHS, hsId, hsLabel,
  cardHS, validDeclHS, LOW, HIGH, COLORS, COLOR_HEX,
} from '../game/engine';
import {
  speak, announceAsk, announceAskResult, announceDeclare,
  announceTurn, announceGameOver, setVoiceEnabled,
} from '../game/voice';

export default function Game({ config, onNavigate, onGameOver }) {
  const { playerNames, playerCount, mode, bots } = config;
  const [game, setGame] = useState(() => createGame(playerNames, playerCount, mode));
  const [modal, setModal] = useState(null); // 'ask' | 'declare' | 'pass'
  const [passPlayer, setPassPlayer] = useState('');
  const [voiceOn, setVoiceOn] = useState(true);

  // Ask state
  const [askOpp, setAskOpp] = useState(null);
  const [askColor, setAskColor] = useState(null);
  const [askHalf, setAskHalf] = useState(null);
  const [askNum, setAskNum] = useState(null);
  const [askErr, setAskErr] = useState('');

  // Declare state
  const [declHS, setDeclHS] = useState(null);
  const [declAssign, setDeclAssign] = useState({});
  const [declErr, setDeclErr] = useState('');

  const logRef = useRef(null);

  const viewIdx = mode === 'pass' ? game.turn : 0;
  const myHand = game.hands[viewIdx];
  const isHumanTurn = !bots[game.turn];

  useEffect(() => {
    if (game.gameOver) {
      announceGameOver(
        game.scores.A > game.scores.B ? 'A' : 'B',
        game.scores.A, game.scores.B
      );
      onGameOver(game);
      return;
    }
    if (bots[game.turn]) {
      const t = setTimeout(() => runBot(), 1100);
      return () => clearTimeout(t);
    }
    if (mode === 'pass' && !bots[game.turn]) {
      setPassPlayer(playerNames[game.turn]);
      setModal('pass');
    } else if (!bots[game.turn]) {
      announceTurn(playerNames[game.turn], teamOf(game, game.turn));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.turn, game.gameOver]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [game.log]);

  function runBot() {
    const move = getBotMove(game, game.turn);
    if (move.type === 'ask') {
      announceAsk(playerNames[game.turn], playerNames[move.to], move.color, move.num);
      const { game: g, gotCard } = doAsk(game, game.turn, move.to, move.color, move.num);
      setTimeout(() => announceAskResult(playerNames[game.turn], move.color, move.num, gotCard), 1200);
      setGame(g);
    } else if (move.type === 'declare') {
      const g = doDeclare(game, game.turn, move.hsid, move.assignments);
      const team = teamOf(game, game.turn);
      const correct = g.scores[team] > game.scores[team];
      announceDeclare(playerNames[game.turn], hsLabel(move.hsid), team, correct);
      setGame(g);
    } else {
      setGame(g => ({ ...g, turn: (g.turn + 1) % g.n }));
    }
  }

  function submitAsk() {
    setAskErr('');
    if (askOpp === null) { setAskErr('Pick an opponent'); return; }
    if (!askColor) { setAskErr('Pick a color'); return; }
    if (!askHalf) { setAskErr('Pick low or high'); return; }
    if (askNum === null) { setAskErr('Pick a number'); return; }
    const id = hsId(askColor, askHalf);
    if (!myHand.some(c => cardHS(c.c, c.n) === id)) { setAskErr('You need at least one card from that half-suit!'); return; }
    if (myHand.some(c => c.c === askColor && c.n === askNum)) { setAskErr('You already have that card!'); return; }
    announceAsk(playerNames[game.turn], playerNames[askOpp], askColor, askNum);
    const { game: g, gotCard } = doAsk(game, game.turn, askOpp, askColor, askNum);
    setTimeout(() => announceAskResult(playerNames[game.turn], askColor, askNum, gotCard), 1300);
    setGame(g); setModal(null); resetAsk();
  }

  function submitDeclare() {
    setDeclErr('');
    if (!declHS) { setDeclErr('Pick a half-suit'); return; }
    const [, half] = declHS.split('-');
    const nums = half === 'low' ? LOW : HIGH;
    if (nums.some(n => declAssign[n] === undefined)) { setDeclErr('Assign all 5 cards'); return; }
    const g = doDeclare(game, game.turn, declHS, declAssign);
    const team = teamOf(game, game.turn);
    const correct = g.scores[team] > game.scores[team];
    announceDeclare(playerNames[game.turn], hsLabel(declHS), team, correct);
    setGame(g); setModal(null); resetDecl();
  }

  function resetAsk() { setAskOpp(null); setAskColor(null); setAskHalf(null); setAskNum(null); setAskErr(''); }
  function resetDecl() { setDeclHS(null); setDeclAssign({}); setDeclErr(''); }

  const allHS = getAllHS();
  const validHS = validDeclHS(game, game.turn);
  const oppPlayers = opponentsOf(game, game.turn);
  const myTeamPlayers = teamOf(game, game.turn) === 'A' ? game.teamA : game.teamB;
  const teamColor = teamOf(game, game.turn) === 'A' ? '#1E88E5' : '#F9A825';
  const sortedHand = [...myHand].sort((a, b) => COLORS.indexOf(a.c) - COLORS.indexOf(b.c) || a.n - b.n);
  const nums = askHalf === 'low' ? LOW : HIGH;

  function toggleVoice() {
    const next = !voiceOn;
    setVoiceOn(next);
    setVoiceEnabled(next);
    if (next) speak('Voice on', { priority: true });
  }

  return (
    <div style={{ padding: '12px 14px' }}>
      {/* Scoreboard */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 12, position: 'relative' }}>
        <div style={{ textAlign: 'center', border: '2px solid #1E88E5', borderRadius: 14, padding: '10px 20px' }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#1E88E5' }}>{game.scores.A}</div>
          <div style={{ fontSize: 12, color: '#9e9e9e' }}>Team A</div>
        </div>
        <div style={{ fontSize: 13, color: '#555' }}>vs</div>
        <div style={{ textAlign: 'center', border: '2px solid #F9A825', borderRadius: 14, padding: '10px 20px' }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#F9A825' }}>{game.scores.B}</div>
          <div style={{ fontSize: 12, color: '#9e9e9e' }}>Team B</div>
        </div>
        {/* Voice toggle */}
        <button
          onClick={toggleVoice}
          title={voiceOn ? 'Mute voice' : 'Enable voice'}
          style={{
            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
            background: voiceOn ? '#1a1a3e' : '#2d2d4e',
            border: `1px solid ${voiceOn ? '#6c63ff' : '#555'}`,
            borderRadius: 10, padding: '6px 10px', cursor: 'pointer',
            fontSize: 18, lineHeight: 1, color: voiceOn ? '#a89df5' : '#555',
            transition: 'all 0.2s',
          }}
        >
          {voiceOn ? '🔊' : '🔇'}
        </button>
      </div>

      {/* Turn banner */}
      <div style={{ background: teamColor + '18', border: `1px solid ${teamColor}44`, borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Avatar name={playerNames[game.turn]} index={game.turn} size={30} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: teamColor }}>
            {bots[game.turn] ? `${playerNames[game.turn]} is thinking...` : `${playerNames[game.turn]}'s turn`}
          </div>
          <div style={{ fontSize: 11, color: '#9e9e9e' }}>Team {teamOf(game, game.turn)}</div>
        </div>
      </div>

      {/* Players row */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 8 }}>
        {playerNames.map((name, i) => {
          const tc = teamOf(game, i) === 'A' ? '#1E88E5' : '#F9A825';
          const active = i === game.turn;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, background: active ? '#22223b' : 'transparent', borderRadius: 10, padding: '6px 8px', border: `1px solid ${active ? tc : '#2d2d4e'}` }}>
              <Avatar name={name} index={i} size={28} />
              <div style={{ fontSize: 10, color: '#9e9e9e', marginTop: 3, maxWidth: 48, textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{name}</div>
              <div style={{ fontSize: 10, color: '#555' }}>{game.hands[i].length}🃏</div>
            </div>
          );
        })}
      </div>

      {/* Hand */}
      <div className="card" style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>{mode === 'pass' ? `${playerNames[viewIdx]}'s hand` : 'Your hand'}</h3>
          <span className="badge badge-gray">{myHand.length} cards</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {sortedHand.map((c, i) => <Card key={i} color={c.c} num={c.n} size="sm" />)}
          {myHand.length === 0 && <div style={{ fontSize: 13, color: '#555', padding: '8px 0' }}>No cards left</div>}
        </div>
      </div>

      {/* Half-suits */}
      <div className="card" style={{ marginBottom: 10 }}>
        <h3>Half-suits</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {allHS.map(id => {
            const [col, half] = id.split('-');
            const claimed = game.claimed[id];
            const myCount = myHand.filter(c => cardHS(c.c, c.n) === id).length;
            return (
              <div key={id} style={{
                borderRadius: 10, padding: '8px 6px',
                border: `1px solid ${claimed === 'A' ? '#1E88E5' : claimed === 'B' ? '#F9A825' : '#2d2d4e'}`,
                background: claimed === 'A' ? '#1E88E522' : claimed === 'B' ? '#F9A82522' : '#22223b',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR_HEX[col], flexShrink: 0 }} />
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>{col[0].toUpperCase()+col.slice(1)} {half}</div>
                </div>
                {claimed
                  ? <span className={`badge badge-${claimed.toLowerCase()}`} style={{ fontSize: 10 }}>Team {claimed}</span>
                  : <div style={{ fontSize: 10, color: '#555' }}>You: {myCount}</div>
                }
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      {isHumanTurn && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { resetAsk(); setModal('ask'); }}>🙋 Ask for a card</button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => { resetDecl(); setDeclHS(validHS[0] || null); setModal('declare'); }}>📣 Declare</button>
        </div>
      )}

      {/* Log */}
      <div className="card">
        <h3>Game log</h3>
        <div ref={logRef} style={{ maxHeight: 120, overflowY: 'auto' }}>
          {game.log.length === 0 && <div style={{ fontSize: 13, color: '#555', textAlign: 'center', padding: 8 }}>Game just started!</div>}
          {game.log.slice(-12).reverse().map((e, i) => (
            <div key={i} className={`log-entry ${e.type}`}>{e.text}</div>
          ))}
        </div>
      </div>

      {/* Ask Modal */}
      {modal === 'ask' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box">
            <h3>Ask for a card</h3>

            <div className="label" style={{ marginTop: 12 }}>Ask opponent</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {oppPlayers.map(i => (
                <div key={i} onClick={() => setAskOpp(i)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, border: `1px solid ${askOpp === i ? '#6c63ff' : '#2d2d4e'}`, background: askOpp === i ? '#6c63ff22' : '#22223b', cursor: 'pointer' }}>
                  <Avatar name={playerNames[i]} index={i} size={26} />
                  <span style={{ fontSize: 13, color: askOpp === i ? '#a89df5' : '#9e9e9e' }}>{playerNames[i]}</span>
                </div>
              ))}
            </div>

            <div className="label">Color</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => { setAskColor(c); setAskNum(null); }} style={{ width: 48, height: 48, borderRadius: '50%', background: COLOR_HEX[c], cursor: 'pointer', border: askColor === c ? '3px solid #fff' : '3px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 13 }}>
                  {c[0].toUpperCase()}
                </div>
              ))}
            </div>

            <div className="label">Half-suit</div>
            <div className="seg-group" style={{ marginBottom: 14 }}>
              {['low', 'high'].map(h => (
                <button key={h} className={`seg-btn ${askHalf === h ? 'active' : ''}`} onClick={() => { setAskHalf(h); setAskNum(null); }}>
                  {h === 'low' ? 'Low (0–4)' : 'High (5–9)'}
                </button>
              ))}
            </div>

            {askColor && askHalf && (
              <>
                <div className="label">Number</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  {nums.map(n => (
                    <div key={n} onClick={() => setAskNum(n)} style={{ width: 48, height: 48, borderRadius: 10, border: `2px solid ${askNum === n ? '#6c63ff' : COLOR_HEX[askColor] + '66'}`, background: askNum === n ? '#6c63ff' : '#22223b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>
                      {n}
                    </div>
                  ))}
                </div>
              </>
            )}

            {askErr && <div style={{ fontSize: 13, color: '#e57373', marginBottom: 10 }}>{askErr}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={submitAsk}>Ask</button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Declare Modal */}
      {modal === 'declare' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box">
            <h3>Declare half-suit</h3>

            <div className="label" style={{ marginTop: 12 }}>Which half-suit?</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {validHS.length === 0 && <div style={{ fontSize: 13, color: '#555' }}>No valid half-suits to declare</div>}
              {validHS.map(id => (
                <div key={id} onClick={() => setDeclHS(id)} style={{ padding: '7px 12px', borderRadius: 10, border: `1px solid ${declHS === id ? '#6c63ff' : '#2d2d4e'}`, background: declHS === id ? '#6c63ff22' : '#22223b', cursor: 'pointer', fontSize: 13, color: declHS === id ? '#a89df5' : '#9e9e9e' }}>
                  {hsLabel(id)}
                </div>
              ))}
            </div>

            {declHS && (() => {
              const [col, half] = declHS.split('-');
              const nums = half === 'low' ? LOW : HIGH;
              return (
                <>
                  <div className="label">Who holds each card? (Your team only)</div>
                  {nums.map(n => (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <Card color={col} num={n} size="xs" />
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {myTeamPlayers.map(pi => (
                          <div key={pi} onClick={() => setDeclAssign(a => ({ ...a, [n]: pi }))} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: `1px solid ${declAssign[n] === pi ? '#6c63ff' : '#2d2d4e'}`, background: declAssign[n] === pi ? '#6c63ff' : '#22223b', cursor: 'pointer' }}>
                            <Avatar name={playerNames[pi]} index={pi} size={20} />
                            <span style={{ fontSize: 12, color: '#fff' }}>{playerNames[pi]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              );
            })()}

            {declErr && <div style={{ fontSize: 13, color: '#e57373', marginBottom: 10 }}>{declErr}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={submitDeclare}>📣 Declare!</button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Pass device modal */}
      {modal === 'pass' && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📱</div>
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Pass to {passPlayer}</h3>
            <p style={{ fontSize: 14, color: '#9e9e9e', marginBottom: 24 }}>Hand the device to {passPlayer}. Everyone else look away!</p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setModal(null)}>I'm ready 👍</button>
          </div>
        </div>
      )}
    </div>
  );
}
