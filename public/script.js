(() => {
  const header = document.querySelector('[data-header]');
  const toggle = header?.querySelector('.menu-toggle');
  const nav = document.getElementById('primary-nav');
  const label = toggle?.querySelector('[data-menu-label]');
  const desktop = window.matchMedia('(min-width: 921px)');

  // Mobile menu
  const setOpen = (open, { returnFocus = false } = {}) => {
    if (!toggle || !nav) return;
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (label) label.textContent = open ? 'Close menu' : 'Open menu';
    if (open) {
      nav.querySelector('a')?.focus({ preventScroll: true });
    } else if (returnFocus) {
      toggle.focus({ preventScroll: true });
    }
  };
  const isOpen = () => toggle?.getAttribute('aria-expanded') === 'true';

  toggle?.addEventListener('click', () => setOpen(!isOpen()));

  nav?.addEventListener('click', (event) => {
    if (event.target.closest('a') && isOpen()) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) setOpen(false, { returnFocus: true });
  });

  document.addEventListener('click', (event) => {
    if (isOpen() && !header.contains(event.target)) setOpen(false);
  });

  // Close the menu when keyboard focus moves past it into the page.
  header?.addEventListener('focusout', (event) => {
    if (isOpen() && event.relatedTarget && !header.contains(event.relatedTarget)) setOpen(false);
  });

  desktop.addEventListener('change', (event) => {
    if (event.matches && isOpen()) setOpen(false);
  });

  // Solid header once the page scrolls past the top of the hero.
  if (header) {
    const update = () => header.classList.toggle('is-solid', window.scrollY > 24);
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  // Footer year
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
