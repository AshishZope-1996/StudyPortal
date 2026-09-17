const attemptsKey = 'studyNotesQuizAttempts';
const historyKey = 'studyNotesQuizHistory';
const themeKey = 'studyNotesTheme';
const readJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
export function getScores() { return readJson(attemptsKey, {}); }
export function saveScore(id, score, total) {
  const scores = getScores(); const previous = scores[id] || { attempts: 0, bestScore: 0, lastScore: 0, bestTotal: total };
  scores[id] = { attempts: previous.attempts + 1, bestScore: Math.max(previous.bestScore, score), lastScore: score, bestTotal: total };
  try { localStorage.setItem(attemptsKey, JSON.stringify(scores)); } catch { /* Continue without persistence when storage is unavailable. */ } return scores[id];
}
export function getQuizHistory() { return readJson(historyKey, []); }
export function saveQuizHistory(attempt) {
  const history = [attempt, ...getQuizHistory()].slice(0, 100);
  try { localStorage.setItem(historyKey, JSON.stringify(history)); } catch { /* Continue without persistence when storage is unavailable. */ }
  return history;
}
export const getTheme = () => localStorage.getItem(themeKey) || 'system';
export function setTheme(theme) { try { localStorage.setItem(themeKey, theme); } catch {} applyTheme(theme); }
export function applyTheme(theme = getTheme()) { document.documentElement.dataset.theme = theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : theme === 'system' ? 'light' : theme; }
