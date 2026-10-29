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

  // Mouse and trackpad devices usually can't place a call, so on those the
  // service links go to the contact section and the contact card offers to
  // copy the number. Touch devices keep the direct phone links.
  const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const serviceLinks = document.querySelectorAll('.service-link');
  const callButton = document.querySelector('[data-call-button]');
  const copyButton = document.querySelector('[data-copy-phone]');
  const copyStatus = document.querySelector('[data-copy-status]');
  const canCopy = Boolean(navigator.clipboard?.writeText);

  const applyPointer = () => {
    const desk = pointer.matches;
    serviceLinks.forEach((link) => link.setAttribute('href', desk ? '#contact' : 'tel:+19728482022'));
    if (callButton && copyButton && canCopy) {
      callButton.hidden = desk;
      copyButton.hidden = !desk;
    }
  };
  applyPointer();
  pointer.addEventListener('change', applyPointer);

  let copyReset;
  copyButton?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('(972) 848-2022');
      copyButton.textContent = 'Number copied';
      if (copyStatus) copyStatus.textContent = 'Phone number copied to your clipboard.';
      track('copy_number');
    } catch {
      copyButton.textContent = 'Copy failed';
    }
    clearTimeout(copyReset);
    copyReset = setTimeout(() => {
      copyButton.textContent = 'Copy number';
      if (copyStatus) copyStatus.textContent = '';
    }, 2500);
  });

  // Service lists fold away on phones to keep the page short; elsewhere
  // they are always open and the toggle is hidden.
  const phone = window.matchMedia('(max-width: 680px)');
  const details = document.querySelectorAll('.service-more');
  const applyPhone = () => details.forEach((el) => { el.open = !phone.matches; });
  applyPhone();
  phone.addEventListener('change', applyPhone);

  // Count the actions that matter (HaveAnApp Pulse, cookieless). Listing
  // clicks are recorded by Pulse itself via data-outbound.
  function track(name, props) {
    if (typeof window.pulse === 'function') window.pulse(name, props);
  }
  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    const from = link.closest('section[id]')?.id || link.closest('header, footer')?.tagName.toLowerCase() || 'page';
    const href = link.getAttribute('href');
    if (href.startsWith('tel:')) track('call_click', { from });
    else if (link.classList.contains('service-link')) track('service_click', { from: link.closest('.service')?.querySelector('.service-index')?.textContent.replace(/^\d+\s*/, '').trim() });
    else if (href.endsWith('.vcf')) track('save_contact');
  });

  // Footer year
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
