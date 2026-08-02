(() => {
  'use strict';

  const SUPABASE_URL = 'https://rsarqljktqecndsfklyf.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzYXJxbGprdHFlY25kc2ZrbHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjMxNDUsImV4cCI6MjA4NjEzOTE0NX0.kzfex4cqxVjrOAMHtxAPVNFmPXtDeaCKqjzOQpTbZco';
  const REVIEW_FIELDS = 'id,name,business_name,rating,review,created_at';

  const header = document.querySelector('[data-header]');
  const progress = document.querySelector('.scroll-progress span');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');
  const themeColor = document.querySelector('meta[name="theme-color"]');

  if (themeColor) themeColor.setAttribute('content', '#4b2b74');

  document.querySelectorAll('[data-year]').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
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
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1080) closeMenu();
  });

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

  const humanize = (name) => name
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const buildMessage = (form) => {
    const lines = [];
    for (const [key, raw] of new FormData(form).entries()) {
      if (['consent', 'permission', 'website'].includes(key)) continue;
      const value = String(raw).trim();
      if (value) lines.push(`${humanize(key)}: ${value}`);
    }
    return lines.join('\n\n');
  };

  const getSubject = (form) => {
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const business = String(data.get('business') || '').trim();
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
    const message = buildMessage(form);
    if (!message) {
      setStatus(form, 'Complete the form first, then copy it.', 'error');
      return;
    }

    const text = `${getSubject(form)}\n\n${message}\n\nSend to: contact@ederito.com`;
    try {
      await navigator.clipboard.writeText(text);
      setStatus(form, 'Copied. Paste it into an email to contact@ederito.com.', 'success');
    } catch {
      setStatus(form, 'Your browser blocked copying. Please select the information manually.', 'error');
    }
  };

  const escapeHTML = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const initialsFor = (name) => {
    const initials = String(name || 'Client')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
    return initials || 'C';
  };

  const formatReviewDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recent review';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const reviewCardHTML = (review) => {
    const rating = Math.min(5, Math.max(1, Number(review.rating) || 5));
    const stars = `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;
    const business = String(review.business_name || '').trim();
    const details = business
      ? `${escapeHTML(business)} · ${escapeHTML(formatReviewDate(review.created_at))}`
      : `Client review · ${escapeHTML(formatReviewDate(review.created_at))}`;

    return `
      <article class="review-card-public">
        <div class="review-stars" aria-label="${rating} out of 5 stars">${stars}</div>
        <p class="review-copy">${escapeHTML(review.review)}</p>
        <div class="review-person">
          <div class="review-avatar" aria-hidden="true">${escapeHTML(initialsFor(review.name))}</div>
          <div><strong>${escapeHTML(review.name)}</strong><span>${details}</span></div>
        </div>
      </article>`;
  };

  const reviewLists = Array.from(document.querySelectorAll('[data-review-list]'));

  const renderReviews = (reviews, total) => {
    reviewLists.forEach((list) => {
      const limit = Math.max(1, Number(list.dataset.limit) || reviews.length || 3);
      const visible = reviews.slice(0, limit);
      if (!visible.length) {
        list.innerHTML = '<div class="review-empty">No reviews have been published yet. Be the first client to share your experience.</div>';
        return;
      }
      list.innerHTML = visible.map(reviewCardHTML).join('');
    });

    document.querySelectorAll('[data-review-count]').forEach((element) => {
      const count = Number.isFinite(total) ? total : reviews.length;
      element.textContent = `${count} public review${count === 1 ? '' : 's'}`;
    });
  };

  const renderReviewError = () => {
    reviewLists.forEach((list) => {
      list.innerHTML = '<div class="review-error">Reviews could not load right now. Please refresh the page in a moment.</div>';
    });
  };

  const loadReviews = async () => {
    if (!reviewLists.length) return;
    const maxLimit = Math.max(...reviewLists.map((list) => Number(list.dataset.limit) || 3));
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ederito_reviews?select=${encodeURIComponent(REVIEW_FIELDS)}&order=created_at.desc&limit=${maxLimit}`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            Prefer: 'count=exact'
          }
        }
      );

      if (!response.ok) throw new Error('Review request failed');
      const reviews = await response.json();
      const range = response.headers.get('content-range') || '';
      const totalMatch = range.match(/\/(\d+)$/);
      const total = totalMatch ? Number(totalMatch[1]) : reviews.length;
      renderReviews(Array.isArray(reviews) ? reviews : [], total);
    } catch (error) {
      console.error('Unable to load Ederito reviews:', error);
      renderReviewError();
    }
  };

  const submitReview = async (form) => {
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    if (String(data.get('website') || '').trim()) return;

    const submitButton = form.querySelector('button[type="submit"]');
    const originalLabel = submitButton?.textContent || 'Publish review';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Publishing…';
    }
    setStatus(form, 'Publishing your review securely…');

    const payload = {
      p_name: String(data.get('name') || '').trim(),
      p_business_name: String(data.get('business') || '').trim() || null,
      p_email: String(data.get('email') || '').trim(),
      p_rating: Number.parseInt(String(data.get('rating') || ''), 10),
      p_review: String(data.get('review') || '').trim()
    };

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_ederito_review`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = String(result.message || 'Your review could not be published. Please try again.');
        throw new Error(message);
      }

      form.reset();
      setStatus(form, 'Thank you. Your review is now live on the website.', 'success');
      await loadReviews();
      document.querySelector('#reviews-live')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      const raw = String(error?.message || '');
      const friendly = raw.includes('already submitted today')
        ? 'A review from this email was already published today.'
        : raw.includes('valid') || raw.includes('between')
          ? raw
          : 'Your review could not be published right now. Please try again.';
      setStatus(form, friendly, 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
    }
  };

  document.querySelectorAll('[data-email-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (form.dataset.formType === 'review') {
        await submitReview(form);
        return;
      }

      if (!form.reportValidity()) return;
      const intro = 'Hello Ederito,\n\nI would like to request a project. Here are my details:\n\n';
      const mailto = `mailto:contact@ederito.com?subject=${encodeURIComponent(getSubject(form))}&body=${encodeURIComponent(`${intro}${buildMessage(form)}\n\nThank you.`)}`;
      setStatus(form, 'Opening your email application with the message prepared.', 'success');
      window.location.href = mailto;
    });

    form.querySelector('[data-copy-form]')?.addEventListener('click', () => copyForm(form));
  });

  loadReviews();
})();
