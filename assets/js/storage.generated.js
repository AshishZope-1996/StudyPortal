const attemptsKey = 'studyNotesQuizAttempts';
const themeKey = 'studyNotesTheme';

export function getScores() {
  try {
    return JSON.parse(localStorage.getItem(attemptsKey) || '{}');
  } catch (error) {
    return {};
  }
}

export function saveScore(id, score, total) {
  const scores = getScores();
  const previous = scores[id] || { attempts: 0, bestScore: 0, bestPercentage: 0, lastScore: 0, lastPercentage: 0, bestTotal: total, lastAttempt: null };
  const percentage = Math.round((score / total) * 100);

  scores[id] = {
    attempts: previous.attempts + 1,
    bestScore: Math.max(previous.bestScore, score),
    bestPercentage: Math.max(previous.bestPercentage, percentage),
    lastScore: score,
    lastPercentage: percentage,
    bestTotal: total,
    lastAttempt: new Date().toISOString(),
  };

  localStorage.setItem(attemptsKey, JSON.stringify(scores));
  return scores[id];
}

export const getTheme = () => localStorage.getItem(themeKey) || 'system';

export function setTheme(theme) {
  localStorage.setItem(themeKey, theme);
  applyTheme(theme);
}

export function applyTheme(theme = getTheme()) {
  const resolved = theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : theme === 'system' ? 'light' : theme;
  document.documentElement.dataset.theme = resolved;
}
