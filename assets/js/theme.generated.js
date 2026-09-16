import { applyTheme, getTheme, setTheme } from './storage.js';

export function initTheme() {
  applyTheme();
  const select = document.querySelector('.theme-select');
  if (select) {
    select.value = getTheme();
    select.addEventListener('change', event => setTheme(event.target.value));
  }

  const button = document.querySelector('.theme-toggle');
  button?.addEventListener('click', () => {
    const current = getTheme();
    setTheme(current === 'dark' ? 'light' : 'dark');
    button.textContent = current === 'dark' ? '☀' : '☾';
  });

  const syncButton = () => {
    if (!button) return;
    const theme = getTheme();
    button.textContent = theme === 'dark' ? '☾' : '☀';
    button.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  };

  syncButton();
  const observer = new MutationObserver(() => syncButton());
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
