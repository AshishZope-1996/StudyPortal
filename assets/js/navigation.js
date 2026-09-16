export function setupNavigation() {
  const toggle = document.querySelector('.menu-toggle'); const nav = document.querySelector('.nav-links');
  toggle?.addEventListener('click', () => { const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); });
  document.querySelector('.theme-select')?.addEventListener('change', event => window.setTheme?.(event.target.value));
}
