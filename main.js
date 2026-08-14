document.getElementById('year').textContent = new Date().getFullYear();

// Day/night theme — strictly follows real Eastern Time (PA). No manual override.
const rootEl = document.documentElement;

function applyTheme(theme) {
  if (theme === 'light') {
    rootEl.setAttribute('data-theme', 'light');
  } else {
    rootEl.removeAttribute('data-theme');
  }
}

function getEasternHour() {
  try {
    return parseInt(
      new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(new Date()),
      10
    );
  } catch (e) {
    return new Date().getHours();
  }
}
function isDaytimeET() {
  const h = getEasternHour();
  return h >= 6 && h < 19;
}
function syncThemeToClock() {
  applyTheme(isDaytimeET() ? 'light' : 'dark');
}

syncThemeToClock();
// Re-check periodically so a page left open transitions at sunrise/sunset.
setInterval(syncThemeToClock, 5 * 60 * 1000);

// Occasional rain passing through the hero scene — a small nod to the
// ups and downs of recovery. Purely ambient, not tied to real weather.
const heroEl = document.querySelector('.hero');
if (heroEl) {
  (function scheduleRain() {
    const delay = 25000 + Math.random() * 35000;
    setTimeout(() => {
      heroEl.classList.add('raining');
      setTimeout(() => {
        heroEl.classList.remove('raining');
        scheduleRain();
      }, 14000 + Math.random() * 8000);
    }, delay);
  })();
}

// Mobile nav toggle
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');
navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// Nav shrinks + solidifies on scroll
const siteHeader = document.querySelector('.site-header');
const updateHeaderScroll = () => {
  siteHeader.classList.toggle('scrolled', window.scrollY > 12);
};
updateHeaderScroll();
window.addEventListener('scroll', updateHeaderScroll, { passive: true });

// Parallax mountain layers in hero
const parallaxLayers = document.querySelectorAll('.mountain-layer');
let ticking = false;
const updateParallax = () => {
  const y = window.scrollY;
  parallaxLayers.forEach(layer => {
    const speed = parseFloat(layer.dataset.speed) || 0.2;
    layer.style.transform = 'translateY(' + (y * speed) + 'px)';
  });
  ticking = false;
};
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(updateParallax);
    ticking = true;
  }
}, { passive: true });

// Scroll-triggered reveal animations
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => revealObserver.observe(el));
} else {
  document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => el.classList.add('in'));
}

// FAQ accordion (CSS grid-rows handles the height animation)
document.querySelectorAll('.faq-item').forEach(item => {
  const q = item.querySelector('.faq-q');

  q.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');

    document.querySelectorAll('.faq-item.open').forEach(openItem => {
      if (openItem !== item) {
        openItem.classList.remove('open');
        openItem.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      }
    });

    item.classList.toggle('open', !isOpen);
    q.setAttribute('aria-expanded', String(!isOpen));
  });
});

// Collapsed intake application panel
const intakeToggle = document.getElementById('intake-toggle');
const intakeCollapse = document.getElementById('intake-collapse-body');

function openIntake() {
  intakeCollapse.classList.add('open');
  intakeToggle.setAttribute('aria-expanded', 'true');
}
function closeIntake() {
  intakeCollapse.classList.remove('open');
  intakeToggle.setAttribute('aria-expanded', 'false');
}
intakeToggle.addEventListener('click', () => {
  const isOpen = intakeCollapse.classList.contains('open');
  if (isOpen) { closeIntake(); } else { openIntake(); }
});

// Any "Apply Now" style link should open the panel and scroll to it
document.querySelectorAll('a[href="#apply"]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    openIntake();
    document.getElementById('apply').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
if (window.location.hash === '#apply') {
  openIntake();
}

// Intake form handling
// NOTE: Set FORM_ENDPOINT to a real submission handler before going live.
// Easiest no-backend option: FormSubmit (https://formsubmit.co) — set this to
// 'https://formsubmit.co/ajax/YOUR-HASHED-ID' once you have a real admissions
// inbox. Use FormSubmit's hashed endpoint (from https://formsubmit.co/ID-hash)
// rather than a plain '.../ajax/you@email.com' URL — this repo is public, and
// a hashed ID keeps the real inbox address out of the page source. FormSubmit
// will email a one-time confirmation link the first time a submission comes
// through; click it to activate the endpoint. Until this is set, submissions
// are validated and shown as a local confirmation only — nothing is sent
// anywhere. If using FormSubmit, this domain (github.io) must also be added
// to Content-Security-Policy's connect-src in index.html if it ever changes.
const FORM_ENDPOINT = ''; // e.g. 'https://formsubmit.co/ajax/abc123yourhashedid'

const form = document.getElementById('intake-form');
const statusBox = document.getElementById('form-status');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Honeypot: real users never fill this hidden field, bots often do.
  if (form.elements['_honey'] && form.elements['_honey'].value) {
    statusBox.className = 'show success';
    statusBox.textContent = "Thank you — your application has been received. Our admissions team will call or email you within one business day.";
    form.reset();
    return;
  }

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';

  const data = new FormData(form);

  try {
    if (FORM_ENDPOINT) {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error('Submission failed');
    } else {
      // No backend wired up yet — simulate success locally.
      await new Promise(r => setTimeout(r, 500));
    }

    statusBox.className = 'show success';
    statusBox.textContent = "Thank you — your application has been received. Our admissions team will call or email you within one business day.";
    form.reset();
  } catch (err) {
    statusBox.className = 'show error';
    statusBox.textContent = "Something went wrong submitting your application. Please call our admissions line directly at (555) 555-0123.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Application';
    statusBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
});
