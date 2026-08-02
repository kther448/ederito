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
    header?.classList.toggle('is-scrolled', y > 14);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = `${max > 0 ? Math.min(100, (y / max) * 100) : 0}%`;
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
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open));
    mobileMenu.hidden = !open;
    document.body.classList.toggle('menu-open', open);
  });
  mobileMenu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => { if (window.innerWidth > 1080) closeMenu(); });

  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -45px' });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const humanize = (name) => name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const buildMessage = (form) => {
    const lines = [];
    for (const [key, raw] of new FormData(form).entries()) {
      if (['consent', 'permission'].includes(key)) continue;
      const value = String(raw).trim();
      if (value) lines.push(`${humanize(key)}: ${value}`);
    }
    return lines.join('\n\n');
  };
  const getSubject = (form) => {
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const business = String(data.get('business') || '').trim();
    return form.dataset.formType === 'review'
      ? `Ederito Client Review — ${business || name || 'New submission'}`
      : `New Ederito Project Request — ${business || name || 'New client'}`;
  };
  const setStatus = (form, message, type = '') => {
    const status = form.querySelector('[data-form-status]');
    if (!status) return;
    status.textContent = message;
    status.classList.remove('is-success', 'is-error');
    if (type) status.classList.add(`is-${type}`);
  };
  const copyForm = async (form) => {
    const message = buildMessage(form);
    if (!message) return setStatus(form, 'Complete the form first, then copy it.', 'error');
    const text = `${getSubject(form)}\n\n${message}\n\nSend to: contact@ederito.com`;
    try {
      await navigator.clipboard.writeText(text);
      setStatus(form, 'Copied. Paste it into an email to contact@ederito.com.', 'success');
    } catch {
      setStatus(form, 'Your browser blocked copying. Please select the information manually.', 'error');
    }
  };
  document.querySelectorAll('[data-email-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const intro = form.dataset.formType === 'review'
        ? 'Hello Ederito,\n\nI would like to submit this client review:\n\n'
        : 'Hello Ederito,\n\nI would like to request a project. Here are my details:\n\n';
      const mailto = `mailto:contact@ederito.com?subject=${encodeURIComponent(getSubject(form))}&body=${encodeURIComponent(`${intro}${buildMessage(form)}\n\nThank you.`)}`;
      setStatus(form, 'Opening your email application with the message prepared.', 'success');
      window.location.href = mailto;
    });
    form.querySelector('[data-copy-form]')?.addEventListener('click', () => copyForm(form));
  });
})();
