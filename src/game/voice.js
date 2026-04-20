// src/game/voice.js
// Voice announcements using Web Speech API

let voiceEnabled = true;
let currentUtterance = null;

export function setVoiceEnabled(enabled) {
  voiceEnabled = enabled;
  if (!enabled && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function isVoiceEnabled() {
  return voiceEnabled;
}

export function speak(text, { priority = false, rate = 1.0, pitch = 1.0 } = {}) {
  if (!voiceEnabled) return;
  if (!('speechSynthesis' in window)) return;

  if (priority) {
    window.speechSynthesis.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = 1.0;

  // Try to pick a natural English voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v =>
    v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha'))
  ) || voices.find(v => v.lang.startsWith('en'));
  if (preferred) utterance.voice = preferred;

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

// ─── Game announcements ────────────────────────────────────────────────────

export function announceAsk(askerName, targetName, color, num) {
  speak(`${askerName} asks ${targetName} for ${color} ${num}`, { priority: true, rate: 0.95 });
}

export function announceAskResult(askerName, color, num, success) {
  if (success) {
    speak(`Yes! ${askerName} gets ${color} ${num}`, { rate: 1.05, pitch: 1.1 });
  } else {
    speak(`Nope! ${color} ${num} not there. Turn changes`, { rate: 0.95, pitch: 0.95 });
  }
}

export function announceDeclare(playerName, halfSuit, teamLetter, correct) {
  if (correct) {
    speak(`${playerName} declares ${halfSuit}. Correct! Team ${teamLetter} scores!`, { priority: true, pitch: 1.1 });
  } else {
    speak(`${playerName} declares ${halfSuit}. Wrong! Opponents score!`, { priority: true, pitch: 0.9 });
  }
}

export function announceTurn(playerName, teamLetter) {
  speak(`${playerName}'s turn. Team ${teamLetter}`, { rate: 1.0 });
}

export function announceGameOver(winnerTeam, scoreA, scoreB) {
  speak(`Game over! Team ${winnerTeam} wins! Final score: Team A ${scoreA}, Team B ${scoreB}`, {
    priority: true, rate: 0.9, pitch: 1.1,
  });
}

export function announceWaitingForPlayers(needed) {
  speak(`Waiting for ${needed} more player${needed !== 1 ? 's' : ''} to join`, { rate: 1.0 });
}
