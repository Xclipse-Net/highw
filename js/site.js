/* site.js
   Wiring for Under-Construction page:
   - buttons, subscribe, contact modal, countdown, toasts, accessibility
*/
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    injectToastStyles();
    setupReturnHome();
    setupModal();
    setupSubscribeForm();
    setupCountdown();
    enableSmoothAnchors();
  }

  /* -------------------------
     Small toast utility
     ------------------------- */
  function injectToastStyles() {
    if (document.getElementById('site-toasts-style')) return;
    const s = document.createElement('style');
    s.id = 'site-toasts-style';
    s.textContent = `
      #site-toast-container{position:fixed;right:18px;bottom:18px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none}
      .site-toast{pointer-events:auto;background:rgba(20,24,36,0.98);color:#fff;padding:10px 14px;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,0.4);min-width:180px;font-weight:600}
      .site-toast.success{background:linear-gradient(90deg,#6dd3ff,#7b5cff);color:#05101a}
      .site-toast.error{background:linear-gradient(90deg,#ff6b6b,#ff9a6b);color:#1b0b0b}
    `;
    document.head.appendChild(s);

    const container = document.createElement('div');
    container.id = 'site-toast-container';
    document.body.appendChild(container);
  }

  function showToast(message, type = 'info', timeout = 3500) {
    const container = document.getElementById('site-toast-container');
    if (!container) return alert(message);
    const el = document.createElement('div');
    el.className = 'site-toast ' + (type === 'success' ? 'success' : (type === 'error' ? 'error' : ''));
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      setTimeout(() => el.remove(), 350);
    }, timeout);
  }

  /* -------------------------
     Return Home button
     ------------------------- */
  function setupReturnHome() {
    // Try to find a dedicated element; fallbacks included
    const el =
      document.querySelector('[data-action="return-home"]') ||
      document.querySelector('a.btn--stroke') ||
      document.querySelector('a[href*="index"]') ||
      document.querySelector('.btn--stroke');

    if (!el) return;

    el.addEventListener('click', (e) => {
      // If anchor with href, use it; otherwise default to index.html
      e.preventDefault();
      const href = el.getAttribute ? (el.getAttribute('href') || el.dataset.href) : null;
      const destination = href && href.trim().length ? href.trim() : 'index.html';
      // Small UX: show a quick toast and then navigate
      showToast('Going home…', 'success', 800);
      // Slight delay for toast to show
      setTimeout(() => { window.location.href = destination; }, 300);
    }, {passive: false});
  }

  /* -------------------------
     Modal (Contact Us)
     ------------------------- */
  function setupModal() {
    const openBtn = document.getElementById('contactBtn') || document.querySelector('[data-action="open-contact"]');
    const modal = document.getElementById('contactModal');
    const closeBtn = document.getElementById('closeModal') || (modal && modal.querySelector('.close-btn'));

    if (!openBtn || !modal) {
      // no modal on page
      return;
    }

    // Cleanup possible inline on* handlers added in markup
    try { openBtn.onclick = null; } catch (e) {}
    try { closeBtn && (closeBtn.onclick = null); } catch (e) {}

    let previouslyFocused = null;
    let focusable = [];
    let focusIndex = 0;
    let keyHandler = null;

    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });

    function openModal() {
      previouslyFocused = document.activeElement;
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden'; // prevent background scroll

      // prepare focusable nodes inside modal
      focusable = Array.from(modal.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'))
        .filter(n => n.offsetParent !== null); // visible
      if (focusable.length) {
        focusIndex = 0;
        focusable[0].focus();
      }

      // add keyboard handling (Tab trap + ESC)
      keyHandler = function (ev) {
        if (ev.key === 'Escape') {
          ev.preventDefault();
          closeModal();
        } else if (ev.key === 'Tab') {
          // trap tab
          if (focusable.length === 0) return;
          ev.preventDefault();
          if (ev.shiftKey) {
            focusIndex = (focusIndex - 1 + focusable.length) % focusable.length;
          } else {
            focusIndex = (focusIndex + 1) % focusable.length;
          }
          focusable[focusIndex].focus();
        }
      };
      document.addEventListener('keydown', keyHandler);
    }

    function closeModal() {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', keyHandler);
      keyHandler = null;
      // restore focus
      try { previouslyFocused && previouslyFocused.focus(); } catch (e) {}
    }

    // close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    closeBtn && closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal();
    });

    // Hook the modal send button
    // choose button inside .modal-content that is not the close button
    const sendBtn = modal.querySelector('.modal-content button:not(.close-btn)');
    if (sendBtn) {
      // remove inline onclick if present
      try { sendBtn.removeAttribute && sendBtn.removeAttribute('onclick'); } catch (e) {}
      try { sendBtn.onclick = null; } catch (e) {}
      sendBtn.type = 'button';
      sendBtn.addEventListener('click', handleSend);
    }

    function handleSend(e) {
      e.preventDefault();
      const nameInput = modal.querySelector('.modal-content input[type="text"]');
      const emailInput = modal.querySelector('.modal-content input[type="email"]');
      const messageInput = modal.querySelector('.modal-content textarea');

      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const message = messageInput ? messageInput.value.trim() : '';

      if (!name) return showToast('Please enter your name', 'error');
      if (!validateEmail(email)) return showToast('Enter a valid email', 'error');
      if (!message) return showToast('Please add a message', 'error');

      // disable UI while sending
      setElementDisabled(sendBtn, true);
      showToast('Sending message…', 'info', 2000);

      // Try sending to server endpoint if available; otherwise fallback to localStorage
      const payload = { name, email, message, ts: Date.now() };

      // Try POST to common endpoints: /api/contact or /contact
      const endpoints = ['/api/contact', '/contact', '/api/send-message'];
      tryPostSequential(endpoints, payload, 8000)
        .then((res) => {
          if (res && res.ok) {
            showToast('Message sent! We will be in touch.', 'success');
          } else {
            // assume unreachable or not found — fallback
            queueLocalMessage(payload);
            showToast('Saved locally (no server).', 'success');
          }
        })
        .catch(() => {
          queueLocalMessage(payload);
          showToast('Saved locally (offline).', 'success');
        })
        .finally(() => {
          setElementDisabled(sendBtn, false);
          // clear fields & close modal
          nameInput && (nameInput.value = '');
          emailInput && (emailInput.value = '');
          messageInput && (messageInput.value = '');
          setTimeout(closeModal, 600);
        });
    }
  }

  /* -------------------------
     Subscribe form
     ------------------------- */
  function setupSubscribeForm() {
    const form = document.getElementById('subscribeForm') || document.querySelector('form.subscribe');
    if (!form) return;
    // remove inline onsubmit if present
    try { form.removeAttribute && form.removeAttribute('onsubmit'); } catch (e) {}
    try { form.onsubmit = null; } catch (e) {}

    const emailInput = form.querySelector('input[type="email"]');
    const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('button');

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!emailInput) return showToast('Email input not found', 'error');
      const email = (emailInput.value || '').trim();
      if (!validateEmail(email)) return showToast('Please enter a valid email', 'error');

      setElementDisabled(submitBtn, true);
      showToast('Subscribing…', 'info', 1800);

      // attempt POST then fallback to localStorage
      const payload = { email, ts: Date.now() };
      fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((res) => {
        if (res.ok) {
          showToast('Subscribed — thanks!', 'success');
          emailInput.value = '';
        } else {
          // fallback
          persistSubscriber(email);
          showToast('Saved locally — no server available', 'success');
          emailInput.value = '';
        }
      }).catch(() => {
        persistSubscriber(email);
        showToast('Saved locally — offline', 'success');
        emailInput.value = '';
      }).finally(() => {
        setElementDisabled(submitBtn, false);
      });
    });
  }

  /* -------------------------
     Countdown & progress bar
     ------------------------- */
  function setupCountdown() {
    // If previous timer exists, clear it to avoid double-running
    if (window.__siteCountdownInterval) {
      clearInterval(window.__siteCountdownInterval);
      window.__siteCountdownInterval = null;
    }

    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    const progressBar = document.getElementById('progressBar');
    const launchNote = document.getElementById('launchNote');

    // compute target: 2 months from first load; store in localStorage so it doesn't move each reload
    const stored = localStorage.getItem('site_launch_target');
    let target;
    if (stored) {
      const d = new Date(stored);
      if (!isNaN(d.getTime())) target = d;
    }
    if (!target) {
      const now = new Date();
      target = new Date(now);
      target.setMonth(target.getMonth() + 2);
      // fallback to +60 days if month overflow caused issues
      const sixty = new Date(now);
      sixty.setDate(now.getDate() + 60);
      if ((target - now) < (48 * 60 * 60 * 1000)) target = sixty;
      localStorage.setItem('site_launch_target', target.toString());
    }

    launchNote && (launchNote.textContent = 'Estimated launch: ' + target.toLocaleString());

    const start = new Date();
    const totalSpan = target - start;

    function tick() {
      const now = new Date();
      let diff = target - now;
      if (diff < 0) diff = 0;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      daysEl && (daysEl.textContent = String(days).padStart(2, '0'));
      hoursEl && (hoursEl.textContent = String(hours).padStart(2, '0'));
      minutesEl && (minutesEl.textContent = String(minutes).padStart(2, '0'));
      secondsEl && (secondsEl.textContent = String(seconds).padStart(2, '0'));

      if (progressBar) {
        const elapsed = Math.max(0, (now - start));
        const pct = Math.min(100, Math.round((elapsed / Math.max(1, totalSpan)) * 100));
        progressBar.style.width = pct + '%';
      }

      if (diff <= 0) {
        clearInterval(window.__siteCountdownInterval);
        window.__siteCountdownInterval = null;
        if (launchNote) launchNote.textContent = '🎉 We are live — welcome!';
        const title = document.querySelector('.uc-title');
        const sub = document.querySelector('.uc-sub');
        if (title) title.textContent = 'We are Live!';
        if (sub) sub.textContent = 'Thanks for waiting. Enjoy the new experience.';
      }
    }

    // initial tick + interval
    tick();
    window.__siteCountdownInterval = setInterval(tick, 1000);
  }

  /* -------------------------
     Helpers / utilities
     ------------------------- */
  function validateEmail(email) {
    if (!email) return false;
    // simple email regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function setElementDisabled(el, val) {
    try { if (!el) return; el.disabled = !!val; if (val) el.setAttribute('aria-disabled', 'true'); else el.removeAttribute('aria-disabled'); } catch (e) {}
  }

  function persistSubscriber(email) {
    try {
      const arr = JSON.parse(localStorage.getItem('site_subscribers') || '[]');
      arr.push({ email: email, ts: Date.now() });
      localStorage.setItem('site_subscribers', JSON.stringify(arr));
    } catch (e) {
      console.warn('Persist subscriber failed', e);
    }
  }

  function queueLocalMessage(payload) {
    try {
      const arr = JSON.parse(localStorage.getItem('site_messages') || '[]');
      arr.push(payload);
      localStorage.setItem('site_messages', JSON.stringify(arr));
    } catch (e) {
      console.warn('Queue message failed', e);
    }
  }

  // Try a series of endpoints (useful when backend path unknown)
  function tryPostSequential(endpoints, payload, timeout = 5000) {
    // returns a Promise that resolves to the first successful fetch Response or rejects
    if (!endpoints || endpoints.length === 0) return Promise.reject('no endpoints');

    const tryOne = (url) => {
      return new Promise((resolve, reject) => {
        let didTimeOut = false;
        const timer = setTimeout(() => {
          didTimeOut = true;
          reject(new Error('timeout'));
        }, timeout);

        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).then((res) => {
          clearTimeout(timer);
          if (didTimeOut) return;
          resolve(res);
        }).catch((err) => {
          clearTimeout(timer);
          if (didTimeOut) return;
          reject(err);
        });
      });
    };

    // try sequentially until one resolves ok
    let chain = Promise.reject();
    endpoints.forEach((url) => {
      chain = chain.catch(() => tryOne(url));
    });
    return chain;
  }

  /* -------------------------
     Smooth anchor / small UX
     ------------------------- */
  function enableSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const targetId = a.getAttribute('href').slice(1);
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetEl.focus({ preventScroll: true });
        }
      });
    });
  }
})();
