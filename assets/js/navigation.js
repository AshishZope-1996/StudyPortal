export function setupNavigation() {
  const toggle = document.querySelector('.menu-toggle'); const nav = document.querySelector('.nav-links');
  const close = () => { nav?.classList.remove('open'); toggle?.setAttribute('aria-expanded', 'false'); document.body.classList.remove('drawer-open'); };
  toggle?.addEventListener('click', () => { const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); document.body.classList.toggle('drawer-open', open); });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
  document.addEventListener('click', event => { if (nav?.classList.contains('open') && !nav.contains(event.target) && event.target !== toggle) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  document.querySelector('.theme-select')?.addEventListener('change', event => window.setTheme?.(event.target.value));
}
