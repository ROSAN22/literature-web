// src/screens/Game.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import {
  createGame, teamOf, opponentsOf,
  doAsk, doDeclare, getBotMove, getAllHS, hsLabel,
  cardHS, validDeclHS, LOW, HIGH, COLOR_HEX,
} from '../game/engine';
import {
  speak, announceAsk, announceAskResult, announceDeclare,
  announceTurn, announceGameOver, setVoiceEnabled,
} from '../game/voice';

// ─── BOT DELAY (slow enough for voice to finish) ─────────────────────────────
const BOT_DELAY = 4500;

export default function Game({ config, onNavigate, onGameOver }) {
  const { playerNames, playerCount, mode, bots } = config;

  // game state
  const [game, setGame] = useState(() => createGame(playerNames, playerCount, mode));
  const [modal, setModal] = useState(null); // 'declare' | 'pass'
  const [passPlayer, setPassPlayer] = useState('');
  const [voiceOn, setVoiceOn] = useState(true);

  // Raise-hand phase: null = playing, 'A'/'B' = that team picks next asker
  const [raiseTeam, setRaiseTeam] = useState(() => teamOf(createGame(playerNames, playerCount, mode), 0) ? 'A' : null);
  const [handRaised, setHandRaised] = useState(false); // animation flag

  // New 3-tap ask UX
  const [selectedCard, setSelectedCard] = useState(null);   // { c, n } from hand
  const [askTargetCard, setAskTargetCard] = useState(null); // { c, n } missing card to ask for
  const [askOpp, setAskOpp] = useState(null);               // opponent index

  // Declare state
  const [declHS, setDeclHS] = useState(null);
  const [declAssign, setDeclAssign] = useState({});
  const [declErr, setDeclErr] = useState('');

  const logRef = useRef(null);

  const viewIdx = mode === 'pass' ? game.turn : 0;
  const myHand = game.hands[viewIdx];
  const isHumanTurn = !bots[game.turn];
  const myTeam = teamOf(game, game.turn);
  const myTeamPlayers = myTeam === 'A' ? game.teamA : game.teamB;
  const oppPlayers = opponentsOf(game, game.turn);
  const teamColor = myTeam === 'A' ? '#1E88E5' : '#F9A825';
  const validHS = validDeclHS(game, game.turn);

  // ── After declare: enter raise-hand phase ──────────────────────────────────
  function afterDeclare(g) {
    if (g.gameOver) { setGame(g); return; }
    // whichever team should act next, they raise hand
    const nextTeam = teamOf(g, g.turn);
    setRaiseTeam(nextTeam);
    // Auto-raise for bot-only teams
    const teamPlayers = nextTeam === 'A' ? g.teamA : g.teamB;
    const allBots = teamPlayers.every(i => bots[i]);
    if (allBots) {
      const picked = teamPlayers.find(i => bots[i] && g.hands[i].length > 0) || teamPlayers[0];
      setGame({ ...g, turn: picked });
      setRaiseTeam(null);
    } else {
      setGame(g);
    }
  }

  // ── Game turn effect ───────────────────────────────────────────────────────
  useEffect(() => {
    if (game.gameOver) {
      announceGameOver(
        game.scores.A > game.scores.B ? 'A' : 'B',
        game.scores.A, game.scores.B
      );
      onGameOver(game);
      return;
    }
    if (raiseTeam) return; // waiting for raise-hand, don't advance

    if (bots[game.turn]) {
      const t = setTimeout(() => runBot(), BOT_DELAY);
      return () => clearTimeout(t);
    }
    if (mode === 'pass' && !bots[game.turn]) {
      setPassPlayer(playerNames[game.turn]);
      setModal('pass');
    } else if (!bots[game.turn]) {
      announceTurn(playerNames[game.turn], teamOf(game, game.turn));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.turn, game.gameOver, raiseTeam]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [game.log]);

  // ── Bot logic ──────────────────────────────────────────────────────────────
  function runBot() {
    const move = getBotMove(game, game.turn);
    if (move.type === 'ask') {
      announceAsk(playerNames[game.turn], playerNames[move.to], move.color, move.num);
      const { game: g, gotCard } = doAsk(game, game.turn, move.to, move.color, move.num);
      setTimeout(() => announceAskResult(playerNames[game.turn], move.color, move.num, gotCard), BOT_DELAY * 0.6);
      setGame(g);
    } else if (move.type === 'declare') {
      const g = doDeclare(game, game.turn, move.hsid, move.assignments);
      const team = teamOf(game, game.turn);
      const correct = g.scores[team] > game.scores[team];
      announceDeclare(playerNames[game.turn], hsLabel(move.hsid), team, correct);
      afterDeclare(g);
    } else {
      setGame(g => ({ ...g, turn: (g.turn + 1) % g.n }));
    }
  }

  // ── Raise hand ─────────────────────────────────────────────────────────────
  function raiseHand(playerIdx) {
    setHandRaised(true);
    setTimeout(() => setHandRaised(false), 600);
    speak(`${playerNames[playerIdx]} will ask next`, { priority: true });
    setGame(g => ({ ...g, turn: playerIdx }));
    setRaiseTeam(null);
    resetAsk();
  }

  // ── 3-tap ask flow ─────────────────────────────────────────────────────────
  function handleCardTap(card) {
    if (!isHumanTurn || raiseTeam) return;
    if (selectedCard && selectedCard.c === card.c && selectedCard.n === card.n) {
      // deselect
      setSelectedCard(null);
      setAskTargetCard(null);
      setAskOpp(null);
    } else {
      setSelectedCard(card);
      setAskTargetCard(null);
      setAskOpp(null);
    }
  }

  function handleMissingCardTap(card) {
    setAskTargetCard(card);
    setAskOpp(null);
  }

  function handleOppTap(oppIdx) {
    if (!askTargetCard) return;
    // fire the ask
    announceAsk(playerNames[game.turn], playerNames[oppIdx], askTargetCard.c, askTargetCard.n);
    const { game: g, gotCard } = doAsk(game, game.turn, oppIdx, askTargetCard.c, askTargetCard.n);
    setTimeout(() => announceAskResult(playerNames[game.turn], askTargetCard.c, askTargetCard.n, gotCard), 1400);
    setGame(g);
    setSelectedCard(null);
    setAskTargetCard(null);
    setAskOpp(null);
  }

  // Missing cards for selected card's half-suit
  const selectedHS = selectedCard ? cardHS(selectedCard.c, selectedCard.n) : null;
  const selectedHSNums = selectedHS
    ? (selectedHS.endsWith('low') ? LOW : HIGH)
    : [];
  const selectedColor = selectedCard ? selectedCard.c : null;
  const missingCards = selectedHS
    ? selectedHSNums
        .filter(n => !myHand.some(c => c.c === selectedColor && c.n === n))
        .map(n => ({ c: selectedColor, n }))
    : [];

  // ── Declare ─────────────────────────────────────────────────────────────────
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
    setModal(null);
    resetDecl();
    afterDeclare(g);
  }

  function resetAsk() { setSelectedCard(null); setAskTargetCard(null); setAskOpp(null); }
  function resetDecl() { setDeclHS(null); setDeclAssign({}); setDeclErr(''); }

  const allHS = getAllHS();
  const sortedHand = [...myHand].sort((a, b) => {
    const colors = ['red', 'yellow', 'blue', 'green'];
    return colors.indexOf(a.c) - colors.indexOf(b.c) || a.n - b.n;
  });

  function toggleVoice() {
    const next = !voiceOn;
    setVoiceOn(next);
    setVoiceEnabled(next);
    if (next) speak('Voice on', { priority: true });
  }

  // ── RAISE HAND SCREEN ──────────────────────────────────────────────────────
  if (raiseTeam) {
    const raisePlayers = raiseTeam === 'A' ? game.teamA : game.teamB;
    const raiseColor = raiseTeam === 'A' ? '#1E88E5' : '#F9A825';
    return (
      <div style={{ padding: '16px 14px' }}>
        {/* Scoreboard */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 20 }}>
          <div style={{ textAlign: 'center', border: '2px solid #1E88E5', borderRadius: 14, padding: '10px 20px' }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#1E88E5' }}>{game.scores.A}</div>
            <div style={{ fontSize: 12, color: '#9e9e9e' }}>Team A</div>
          </div>
          <div style={{ fontSize: 13, color: '#555' }}>vs</div>
          <div style={{ textAlign: 'center', border: '2px solid #F9A825', borderRadius: 14, padding: '10px 20px' }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#F9A825' }}>{game.scores.B}</div>
            <div style={{ fontSize: 12, color: '#9e9e9e' }}>Team B</div>
          </div>
        </div>

        <div style={{
          background: raiseColor + '15',
          border: `1px solid ${raiseColor}44`,
          borderRadius: 16, padding: 20, textAlign: 'center', marginBottom: 20,
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✋</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: raiseColor, marginBottom: 4 }}>
            Team {raiseTeam} — Who's asking next?
          </div>
          <div style={{ fontSize: 13, color: '#9e9e9e' }}>
            Tap your name to take the next turn
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {raisePlayers.map(i => {
            const isBot = bots[i];
            const hasCards = game.hands[i].length > 0;
            return (
              <button
                key={i}
                disabled={isBot || !hasCards}
                onClick={() => raiseHand(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 14,
                  border: `2px solid ${hasCards && !isBot ? raiseColor + '66' : '#2d2d4e'}`,
                  background: hasCards && !isBot ? raiseColor + '12' : '#1a1a2e',
                  cursor: hasCards && !isBot ? 'pointer' : 'not-allowed',
                  opacity: hasCards ? 1 : 0.4,
                  transition: 'all 0.15s',
                }}
              >
                <Avatar name={playerNames[i]} index={i} size={40} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{playerNames[i]}</div>
                  <div style={{ fontSize: 12, color: '#9e9e9e' }}>
                    {isBot ? '🤖 Bot' : `${game.hands[i].length} cards`}
                  </div>
                </div>
                {!isBot && hasCards && (
                  <div style={{ fontSize: 24 }}>✋</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Log */}
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Game log</h3>
          <div ref={logRef} style={{ maxHeight: 100, overflowY: 'auto' }}>
            {game.log.slice(-6).reverse().map((e, i) => (
              <div key={i} className={`log-entry ${e.type}`}>{e.text}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN GAME SCREEN ───────────────────────────────────────────────────────
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
        <button onClick={toggleVoice} title={voiceOn ? 'Mute' : 'Unmute'} style={{
          position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
          background: voiceOn ? '#1a1a3e' : '#2d2d4e',
          border: `1px solid ${voiceOn ? '#6c63ff' : '#555'}`,
          borderRadius: 10, padding: '6px 10px', cursor: 'pointer',
          fontSize: 18, lineHeight: 1, color: voiceOn ? '#a89df5' : '#555', transition: 'all 0.2s',
        }}>
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

      {/* ── HAND + 3-TAP ASK UX ── */}
      <div className="card" style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>{mode === 'pass' ? `${playerNames[viewIdx]}'s hand` : 'Your hand'}</h3>
          <span className="badge badge-gray">{myHand.length} cards</span>
        </div>

        {/* Cards in hand */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: selectedCard ? 12 : 0 }}>
          {sortedHand.map((c, i) => {
            const isSelected = selectedCard && selectedCard.c === c.c && selectedCard.n === c.n;
            const sameHS = selectedCard && cardHS(c.c, c.n) === selectedHS;
            return (
              <div
                key={i}
                onClick={() => handleCardTap(c)}
                style={{
                  cursor: isHumanTurn ? 'pointer' : 'default',
                  opacity: selectedCard && !sameHS ? 0.45 : 1,
                  transition: 'opacity 0.2s, transform 0.2s',
                  transform: sameHS && !isSelected ? 'translateY(-2px)' : 'none',
                }}
              >
                <Card color={c.c} num={c.n} size="sm" selected={isSelected} />
              </div>
            );
          })}
          {myHand.length === 0 && <div style={{ fontSize: 13, color: '#555', padding: '8px 0' }}>No cards left</div>}
        </div>

        {/* Step 2: Missing cards from selected half-suit */}
        {selectedCard && isHumanTurn && (
          <div style={{ borderTop: '1px solid #2d2d4e', paddingTop: 12 }}>
            <div style={{ fontSize: 12, color: '#9e9e9e', marginBottom: 8 }}>
              Missing from <b style={{ color: COLOR_HEX[selectedColor] }}>{selectedColor} {selectedHS?.split('-')[1]}</b> — tap to ask for:
            </div>
            {missingCards.length === 0 ? (
              <div style={{ fontSize: 13, color: '#555' }}>You have all cards in this half-suit! Declare instead.</div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {missingCards.map((mc, i) => {
                  const isTgt = askTargetCard && askTargetCard.c === mc.c && askTargetCard.n === mc.n;
                  return (
                    <div key={i} onClick={() => handleMissingCardTap(mc)} style={{ opacity: isTgt ? 1 : 0.65, transform: isTgt ? 'scale(1.1)' : 'none', transition: 'all 0.15s', cursor: 'pointer' }}>
                      <Card color={mc.c} num={mc.n} size="sm" selected={isTgt} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Opponent picker */}
        {askTargetCard && isHumanTurn && (
          <div style={{ borderTop: '1px solid #2d2d4e', paddingTop: 12, marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#9e9e9e', marginBottom: 8 }}>
              Ask who for <b style={{ color: COLOR_HEX[askTargetCard.c] }}>{askTargetCard.c} {askTargetCard.n}</b>?
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {oppPlayers.map(i => (
                <div key={i} onClick={() => handleOppTap(i)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 12,
                  border: `2px solid ${askOpp === i ? '#6c63ff' : '#2d2d4e'}`,
                  background: askOpp === i ? '#6c63ff22' : '#22223b',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <Avatar name={playerNames[i]} index={i} size={28} />
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{playerNames[i]}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 8 }}>Tap a player to ask them →</div>
          </div>
        )}

        {/* Cancel selection */}
        {selectedCard && isHumanTurn && (
          <button onClick={resetAsk} style={{
            marginTop: 12, fontSize: 12, color: '#555', background: 'transparent',
            border: 'none', cursor: 'pointer', padding: 0,
          }}>✕ Cancel selection</button>
        )}
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

      {/* Declare button (only shown separately now) */}
      {isHumanTurn && (
        <button className="btn btn-danger" style={{ width: '100%', padding: 14, marginBottom: 10 }}
          onClick={() => { resetDecl(); setDeclHS(validHS[0] || null); setModal('declare'); }}>
          📣 Declare a half-suit
        </button>
      )}

      {/* Game Log */}
      <div className="card">
        <h3>Game log</h3>
        <div ref={logRef} style={{ maxHeight: 120, overflowY: 'auto' }}>
          {game.log.length === 0 && <div style={{ fontSize: 13, color: '#555', textAlign: 'center', padding: 8 }}>Game just started!</div>}
          {game.log.slice(-12).reverse().map((e, i) => (
            <div key={i} className={`log-entry ${e.type}`}>{e.text}</div>
          ))}
        </div>
      </div>

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
