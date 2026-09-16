const attemptsKey = 'studyNotesQuizAttempts';
const themeKey = 'studyNotesTheme';
export function getScores() { return JSON.parse(localStorage.getItem(attemptsKey) || '{}'); }
export function saveScore(id, score, total) {
  const scores = getScores(); const previous = scores[id] || { attempts: 0, bestScore: 0, lastScore: 0, bestTotal: total };
  scores[id] = { attempts: previous.attempts + 1, bestScore: Math.max(previous.bestScore, score), lastScore: score, bestTotal: total };
  localStorage.setItem(attemptsKey, JSON.stringify(scores)); return scores[id];
}
export const getTheme = () => localStorage.getItem(themeKey) || 'system';
export function setTheme(theme) { localStorage.setItem(themeKey, theme); applyTheme(theme); }
export function applyTheme(theme = getTheme()) { document.documentElement.dataset.theme = theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : theme === 'system' ? 'light' : theme; }
