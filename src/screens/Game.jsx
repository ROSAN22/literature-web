// src/screens/Game.jsx
import React, { useState, useEffect } from 'react';
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

      </div>
    );
  }

  // ── MAIN GAME SCREEN ───────────────────────────────────────────────────────
  return (
    <div style={{ padding: '12px 14px', paddingBottom: 32 }}>

      {/* Scoreboard — glass gradient */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30,136,229,0.12), rgba(249,168,37,0.12))',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, padding: '14px 16px', marginBottom: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 0, position: 'relative',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#1E88E5', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Team A</div>
          <div style={{ fontSize: 42, fontWeight: 900, color: '#1E88E5', lineHeight: 1 }}>{game.scores.A}</div>
        </div>
        <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.1)', margin: '0 16px' }} />
        <div style={{ fontSize: 11, color: '#444', fontWeight: 700 }}>VS</div>
        <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.1)', margin: '0 16px' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#F9A825', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Team B</div>
          <div style={{ fontSize: 42, fontWeight: 900, color: '#F9A825', lineHeight: 1 }}>{game.scores.B}</div>
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
      <div style={{
        background: `linear-gradient(135deg, ${teamColor}22, ${teamColor}08)`,
        border: `1px solid ${teamColor}55`,
        borderRadius: 16, padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
      }}>
        <Avatar name={playerNames[game.turn]} index={game.turn} size={36} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: teamColor }}>
            {bots[game.turn] ? `⏳ ${playerNames[game.turn]} is thinking...` : `${playerNames[game.turn]}'s turn`}
          </div>
          <div style={{ fontSize: 11, color: '#9e9e9e', marginTop: 1 }}>Team {teamOf(game, game.turn)}</div>
        </div>
        {bots[game.turn] && (
          <div style={{ display: 'flex', gap: 3 }}>
            {[0,1,2].map(d => (
              <div key={d} style={{
                width: 6, height: 6, borderRadius: '50%', background: teamColor,
                animation: `pulse 1.2s ${d * 0.2}s infinite`,
                opacity: 0.7,
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Players row */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
        {playerNames.map((name, i) => {
          const tc = teamOf(game, i) === 'A' ? '#1E88E5' : '#F9A825';
          const active = i === game.turn;
          return (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0,
              background: active ? tc + '22' : 'rgba(255,255,255,0.03)',
              borderRadius: 12, padding: '8px 10px',
              border: `1.5px solid ${active ? tc + '88' : 'rgba(255,255,255,0.06)'}`,
              transition: 'all 0.2s',
              minWidth: 54,
            }}>
              <Avatar name={name} index={i} size={30} />
              <div style={{ fontSize: 10, color: active ? '#fff' : '#9e9e9e', marginTop: 4, maxWidth: 50, textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontWeight: active ? 700 : 400 }}>{name}</div>
              <div style={{ fontSize: 10, color: active ? tc : '#444', marginTop: 1 }}>{game.hands[i].length} 🃏</div>
            </div>
          );
        })}
      </div>

      {/* ── HAND + 3-TAP ASK UX ── */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, padding: 16, marginBottom: 12,
        backdropFilter: 'blur(6px)',
      }}>
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

      {/* Half-suits grid */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20, padding: 16, marginBottom: 12,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Half-suits</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {allHS.map(id => {
            const [col, half] = id.split('-');
            const claimed = game.claimed[id];
            const myCount = myHand.filter(c => cardHS(c.c, c.n) === id).length;
            return (
              <div key={id} style={{
                borderRadius: 12, padding: '8px 6px', textAlign: 'center',
                border: `1.5px solid ${claimed === 'A' ? '#1E88E588' : claimed === 'B' ? '#F9A82588' : 'rgba(255,255,255,0.07)'}`,
                background: claimed === 'A' ? '#1E88E518' : claimed === 'B' ? '#F9A82518' : 'rgba(255,255,255,0.03)',
                transition: 'all 0.2s',
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLOR_HEX[col], margin: '0 auto 4px' }} />
                <div style={{ fontSize: 9, fontWeight: 700, color: claimed ? '#fff' : '#888', lineHeight: 1.3, textTransform: 'capitalize' }}>{col.slice(0,3)} {half}</div>
                {claimed
                  ? <div style={{ fontSize: 9, fontWeight: 800, color: claimed === 'A' ? '#1E88E5' : '#F9A825', marginTop: 2 }}>✓ T{claimed}</div>
                  : <div style={{ fontSize: 9, color: myCount > 0 ? '#a89df5' : '#444', marginTop: 2 }}>{myCount > 0 ? `You: ${myCount}` : '—'}</div>
                }
              </div>
            );
          })}
        </div>
      </div>

      {/* Declare button */}
      {isHumanTurn && (
        <button
          onClick={() => { resetDecl(); setDeclHS(validHS[0] || null); setModal('declare'); }}
          style={{
            width: '100%', padding: '15px', marginBottom: 8,
            background: 'linear-gradient(135deg, #E53935, #b71c1c)',
            border: 'none', borderRadius: 16, color: '#fff',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(229,57,53,0.35)',
            transition: 'all 0.15s',
          }}
        >
          📣 Declare a half-suit
        </button>
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
