// src/game/engine.js
export const COLORS = ['red', 'yellow', 'blue', 'green'];
export const LOW = [0, 1, 2, 3, 4];
export const HIGH = [5, 6, 7, 8, 9];

export const COLOR_HEX = {
  red: '#E53935', yellow: '#F9A825', blue: '#1E88E5', green: '#43A047',
};
export const COLOR_LIGHT = {
  red: '#FFEBEE', yellow: '#FFFDE7', blue: '#E3F2FD', green: '#E8F5E9',
};
export const COLOR_DARK = {
  red: '#B71C1C', yellow: '#E65100', blue: '#0D47A1', green: '#1B5E20',
};

export function hsId(c, h) { return `${c}-${h}`; }
export function hsLabel(id) {
  const [c, h] = id.split('-');
  return `${c[0].toUpperCase() + c.slice(1)} ${h} (${h === 'low' ? '0–4' : '5–9'})`;
}
export function cardHS(c, n) { return hsId(c, n <= 4 ? 'low' : 'high'); }
export function getAllHS() {
  return COLORS.flatMap(c => ['low', 'high'].map(h => hsId(c, h)));
}

export function buildDeck() {
  return COLORS.flatMap(c => [...LOW, ...HIGH].map(n => ({ c, n, id: `${c}-${n}` })));
}
export function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
export function createGame(names, n, mode) {
  const half = n / 2;
  const deck = shuffle(buildDeck());
  const hands = Array.from({ length: n }, () => []);
  deck.forEach((card, i) => hands[i % n].push(card));
  return {
    n, names, mode,
    hands,
    teamA: Array.from({ length: half }, (_, i) => i),
    teamB: Array.from({ length: half }, (_, i) => i + half),
    claimed: {}, scores: { A: 0, B: 0 },
    turn: 0, log: [], gameOver: false,
  };
}
export function teamOf(game, i) { return game.teamA.includes(i) ? 'A' : 'B'; }
export function opponentsOf(game, i) { return teamOf(game, i) === 'A' ? game.teamB : game.teamA; }
export function teammatesOf(game, i) {
  return (teamOf(game, i) === 'A' ? game.teamA : game.teamB).filter(x => x !== i);
}
export function validDeclHS(game, i) {
  return getAllHS().filter(id => !game.claimed[id] && game.hands[i].some(c => cardHS(c.c, c.n) === id));
}
export function doAsk(game, from, to, color, num) {
  const g = JSON.parse(JSON.stringify(game));
  const idx = g.hands[to].findIndex(c => c.c === color && c.n === num);
  const lbl = `${color[0].toUpperCase() + color.slice(1)} ${num}`;
  if (idx !== -1) {
    g.hands[from].push(g.hands[to].splice(idx, 1)[0]);
    g.log.push({ type: 'success', text: `${g.names[from]} got ${lbl} from ${g.names[to]}` });
    return { game: g, gotCard: true };
  } else {
    g.log.push({ type: 'fail', text: `${g.names[from]} asked for ${lbl} — not there! Turn → ${g.names[to]}` });
    g.turn = to;
    return { game: g, gotCard: false };
  }
}
export function doDeclare(game, declarer, hsid, assignments) {
  const g = JSON.parse(JSON.stringify(game));
  const [color, half] = hsid.split('-');
  const nums = half === 'low' ? LOW : HIGH;
  const team = teamOf(g, declarer);
  const correct = nums.every(n => {
    const owner = assignments[n];
    return g.hands[owner]?.some(c => c.c === color && c.n === n);
  });
  if (correct) {
    g.claimed[hsid] = team; g.scores[team]++;
    nums.forEach(n => {
      const o = assignments[n];
      g.hands[o] = g.hands[o].filter(c => !(c.c === color && c.n === n));
    });
    g.log.push({ type: 'win', text: `🎉 Team ${team} correctly declared ${hsLabel(hsid)}!` });
  } else {
    const opp = team === 'A' ? 'B' : 'A';
    g.claimed[hsid] = opp; g.scores[opp]++;
    nums.forEach(n => {
      for (let pi = 0; pi < g.n; pi++) g.hands[pi] = g.hands[pi].filter(c => !(c.c === color && c.n === n));
    });
    g.log.push({ type: 'fail', text: `❌ Wrong declare by Team ${team}! Team ${opp} gets ${hsLabel(hsid)}.` });
  }
  if (Object.keys(g.claimed).length >= 8) g.gameOver = true;
  else {
    if (g.hands[g.turn].length === 0) {
      const myTeam = teamOf(g, declarer) === 'A' ? g.teamA : g.teamB;
      const withCards = myTeam.filter(i => g.hands[i].length > 0);
      g.turn = withCards.length ? withCards[0] : (opponentsOf(g, declarer).find(i => g.hands[i].length > 0) ?? g.turn);
    }
  }
  return g;
}
export function getBotMove(game, bot) {
  const hand = game.hands[bot];
  if (!hand.length) return { type: 'pass' };
  const myTeam = teamOf(game, bot) === 'A' ? game.teamA : game.teamB;
  for (const id of getAllHS()) {
    if (game.claimed[id]) continue;
    const [color, half] = id.split('-');
    const nums = half === 'low' ? LOW : HIGH;
    if (!hand.some(c => cardHS(c.c, c.n) === id)) continue;
    const assignments = {};
    let ok = true;
    for (const n of nums) {
      const owner = myTeam.find(pi => game.hands[pi].some(c => c.c === color && c.n === n));
      if (!owner && owner !== 0) { ok = false; break; }
      assignments[n] = owner;
    }
    if (ok) return { type: 'declare', hsid: id, assignments };
  }
  const validHS = getAllHS().filter(id => !game.claimed[id] && hand.some(c => cardHS(c.c, c.n) === id));
  if (!validHS.length) return { type: 'pass' };
  const picked = validHS[Math.floor(Math.random() * validHS.length)];
  const [color, half] = picked.split('-');
  const nums = half === 'low' ? LOW : HIGH;
  const missing = nums.filter(n => !hand.some(c => c.c === color && c.n === n));
  if (!missing.length) return { type: 'pass' };
  const askNum = missing[Math.floor(Math.random() * missing.length)];
  const opps = opponentsOf(game, bot).filter(i => game.hands[i].length > 0);
  if (!opps.length) return { type: 'pass' };
  return { type: 'ask', to: opps[Math.floor(Math.random() * opps.length)], color, num: askNum };
}
export function getWinner(game) {
  if (game.scores.A > game.scores.B) return 'A';
  if (game.scores.B > game.scores.A) return 'B';
  return 'tie';
}
