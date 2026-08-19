// BetterBots7 — interaction layer

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Ambient background: live circuit-node network ---------- */
function initAmbientCanvas() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const LINE_COLOR = '125, 211, 252';
  const NODE_COLOR = '125, 211, 252';
  const PULSE_COLOR = '226, 232, 240';
  const CURSOR_COLOR = '226, 232, 240';
  const MAX_DIST = 150;
  const MOUSE_RADIUS = 170;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let nodes = [];
  let pulses = [];
  let rafId = null;
  const mouse = { x: 0, y: 0, active: false };

  function initNodes() {
    const count = Math.min(85, Math.max(28, Math.floor((width * height) / 20000)));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: 1.3 + Math.random() * 1.3,
    }));
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initNodes();
  }

  function drawFrame() {
    ctx.clearRect(0, 0, width, height);

    nodes.forEach((n) => {
      n.x += n.vx;
      n.y += n.vy;

      if (mouse.active) {
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < MOUSE_RADIUS && dist > 0.01) {
          const force = (1 - dist / MOUSE_RADIUS) * 0.6;
          n.x += (dx / dist) * force;
          n.y += (dy / dist) * force;
        }
      }

      if (n.x < -10) n.x = width + 10;
      if (n.x > width + 10) n.x = -10;
      if (n.y < -10) n.y = height + 10;
      if (n.y > height + 10) n.y = -10;
    });

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < MAX_DIST) {
          ctx.strokeStyle = `rgba(${LINE_COLOR}, ${(1 - dist / MAX_DIST) * 0.35})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    if (mouse.active) {
      nodes.forEach((n) => {
        const dist = Math.hypot(n.x - mouse.x, n.y - mouse.y);
        if (dist < MOUSE_RADIUS) {
          ctx.strokeStyle = `rgba(${CURSOR_COLOR}, ${(1 - dist / MOUSE_RADIUS) * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      });
    }

    nodes.forEach((n) => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${NODE_COLOR}, 0.55)`;
      ctx.fill();
    });

    if (Math.random() < 0.025 && nodes.length > 2) {
      const a = nodes[Math.floor(Math.random() * nodes.length)];
      const candidates = nodes.filter((n) => n !== a && Math.hypot(n.x - a.x, n.y - a.y) < MAX_DIST);
      if (candidates.length) {
        const b = candidates[Math.floor(Math.random() * candidates.length)];
        pulses.push({ a, b, t: 0 });
      }
    }

    pulses.forEach((p) => {
      p.t += 0.02;
      const x = p.a.x + (p.b.x - p.a.x) * p.t;
      const y = p.a.y + (p.b.y - p.a.y) * p.t;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, 6);
      grad.addColorStop(0, `rgba(${PULSE_COLOR}, 0.9)`);
      grad.addColorStop(1, `rgba(${PULSE_COLOR}, 0)`);
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    });
    pulses = pulses.filter((p) => p.t < 1);
  }

  function loop() {
    drawFrame();
    rafId = requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', resize);

  if (prefersReducedMotion) {
    drawFrame();
    return;
  }

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });
  window.addEventListener('mouseleave', () => {
    mouse.active = false;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      loop();
    }
  });

  loop();
}

/* ---------- Scroll reveal ---------- */
function initReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  targets.forEach((el) => observer.observe(el));
}

/* ---------- Animated stat counters ---------- */
// Usage: <span class="stat-count" data-target="10" data-suffix="">0</span>
function animateCount(el) {
  const target = parseFloat(el.dataset.target);
  const suffix = el.dataset.suffix || '';
  const decimals = el.dataset.target.includes('.') ? el.dataset.target.split('.')[1].length : 0;

  if (prefersReducedMotion) {
    el.textContent = target.toFixed(decimals) + suffix;
    return;
  }

  const duration = 900;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const value = target * eased;
    el.textContent = value.toFixed(decimals) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function initStatCounters() {
  const stats = document.querySelectorAll('.stat-count');
  if (!stats.length) return;

  if (!('IntersectionObserver' in window)) {
    stats.forEach(animateCount);
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  stats.forEach((el) => observer.observe(el));
}

/* ---------- Lightbox gallery ---------- */
function initLightbox() {
  const items = Array.from(document.querySelectorAll('.gallery-item'));
  const lightbox = document.getElementById('lightbox');
  if (!items.length || !lightbox) return;

  const img = document.getElementById('lightboxImg');
  const caption = document.getElementById('lightboxCaption');
  const closeBtn = lightbox.querySelector('.lightbox-close');
  const prevBtn = lightbox.querySelector('.lightbox-prev');
  const nextBtn = lightbox.querySelector('.lightbox-next');

  let currentIndex = 0;
  let triggerEl = null;

  function show(index) {
    currentIndex = (index + items.length) % items.length;
    const item = items[currentIndex];
    const fullSrc = item.dataset.full || item.querySelector('img').src;
    const alt = item.querySelector('img').alt;
    img.src = fullSrc;
    img.alt = alt;
    caption.textContent = item.dataset.caption || alt;
  }

  function open(index, trigger) {
    triggerEl = trigger;
    show(index);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    closeBtn.focus();
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (triggerEl) triggerEl.focus();
  }

  items.forEach((item, index) => {
    item.addEventListener('click', () => open(index, item));
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => show(currentIndex - 1));
  nextBtn.addEventListener('click', () => show(currentIndex + 1));

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(currentIndex - 1);
    if (e.key === 'ArrowRight') show(currentIndex + 1);
    if (e.key === 'Tab') {
      // simple focus trap between the three controls
      const focusables = [prevBtn, nextBtn, closeBtn];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

/* ---------- Spec sheet accordion ---------- */
function initSpecAccordion() {
  const triggers = document.querySelectorAll('.spec-trigger');
  triggers.forEach((trigger) => {
    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    if (!panel) return;
    panel.style.maxHeight = '0px';

    trigger.addEventListener('click', () => {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        panel.style.maxHeight = '0px';
        trigger.setAttribute('aria-expanded', 'false');
      } else {
        panel.style.maxHeight = panel.scrollHeight + 'px';
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* ---------- Join form (Formspree AJAX submit) ---------- */
function initJoinForm() {
  const form = document.getElementById('joinForm');
  if (!form) return;

  const submitBtn = document.getElementById('joinSubmit');
  const errorEl = document.getElementById('joinError');
  const confirmation = document.getElementById('joinConfirmation');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        form.hidden = true;
        confirmation.hidden = false;
        confirmation.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      } else {
        throw new Error('submission failed');
      }
    } catch (err) {
      errorEl.textContent = "Something went wrong sending your message — please try again, or email sahojpatkar@gmail.com directly.";
      errorEl.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send';
      errorEl.focus?.();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAmbientCanvas();
  initReveal();
  initStatCounters();
  initLightbox();
  initSpecAccordion();
  initJoinForm();
});
