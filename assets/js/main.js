(() => {
  const header = document.querySelector('[data-header]');
  const progress = document.querySelector('.scroll-progress span');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');

  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  const updateScrollUI = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    header?.classList.toggle('is-scrolled', y > 18);

    const max = document.documentElement.scrollHeight - window.innerHeight;
    const value = max > 0 ? Math.min(100, Math.max(0, (y / max) * 100)) : 0;
    if (progress) progress.style.width = `${value}%`;
  };

  updateScrollUI();
  window.addEventListener('scroll', updateScrollUI, { passive: true });

  const closeMenu = () => {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    mobileMenu.hidden = true;
    document.body.classList.remove('menu-open');
  };

  menuToggle?.addEventListener('click', () => {
    if (!mobileMenu) return;
    const willOpen = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(willOpen));
    mobileMenu.hidden = !willOpen;
    document.body.classList.toggle('menu-open', willOpen);
  });

  mobileMenu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeMenu();
  });

  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px' });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const humanize = (name) => name
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const buildMessage = (form) => {
    const data = new FormData(form);
    const lines = [];
    for (const [key, rawValue] of data.entries()) {
      if (['consent', 'permission'].includes(key)) continue;
      const value = String(rawValue).trim();
      if (!value) continue;
      lines.push(`${humanize(key)}: ${value}`);
    }
    return lines.join('\n\n');
  };

  const getSubject = (form) => {
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const business = String(data.get('business') || '').trim();
    if (form.dataset.formType === 'review') {
      return `Ederito Client Review — ${business || name || 'New submission'}`;
    }
    return `New Ederito Project Request — ${business || name || 'New client'}`;
  };

  const setStatus = (form, message, type = '') => {
    const status = form.querySelector('[data-form-status]');
    if (!status) return;
    status.textContent = message;
    status.classList.remove('is-success', 'is-error');
    if (type) status.classList.add(`is-${type}`);
  };

  const copyForm = async (form) => {
    const subject = getSubject(form);
    const message = buildMessage(form);
    if (!message) {
      setStatus(form, 'Complete the form first, then copy it.', 'error');
      return;
    }
    const text = `${subject}\n\n${message}\n\nSend to: contact@ederito.com`;
    try {
      await navigator.clipboard.writeText(text);
      setStatus(form, 'Copied. Paste it into an email to contact@ederito.com.', 'success');
    } catch {
      setStatus(form, 'Copy was blocked by the browser. Select the information manually.', 'error');
    }
  };

  document.querySelectorAll('[data-email-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const subject = getSubject(form);
      const message = buildMessage(form);
      const intro = form.dataset.formType === 'review'
        ? 'Hello Ederito,\n\nI would like to submit the following client review:\n\n'
        : 'Hello Ederito,\n\nI would like to request a project. Here are my details:\n\n';
      const body = `${intro}${message}\n\nThank you.`;
      const mailto = `mailto:contact@ederito.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      setStatus(form, 'Your email application is opening with the request prepared.', 'success');
      window.location.href = mailto;
    });

    form.querySelector('[data-copy-form]')?.addEventListener('click', () => copyForm(form));
  });
})();
