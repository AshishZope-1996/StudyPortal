export function setupNavigation() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav-links');

  toggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  document.querySelectorAll('.nav-links a').forEach(link => 
    link.addEventListener('click', () => {
      nav?.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
    })
  );

  const themeSelect = document.querySelector('.theme-select');
  const themeButton = document.querySelector('.theme-toggle');

  themeSelect?.addEventListener('change', event => {
    const value = event.target.value;
    if (window.setTheme) window.setTheme(value);
  });

  themeButton?.addEventListener('click', () => {
    const current = localStorage.getItem('studyNotesTheme') || 'system';
    const next = current === 'dark' ? 'light' : 'dark';
    if (window.setTheme) window.setTheme(next);
  });
}
