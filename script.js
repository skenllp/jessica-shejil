// ---- Royal Muscat door-opening cover ----
// Runs first and is fully self-contained: any failure releases the page instead of trapping the guest behind the cover.
(() => {
  const root = document.documentElement, $ = id => document.getElementById(id);
  const cover = $('opening'), main = $('main');
  const release = () => {
    root.classList.remove('is-locked', 'is-opening');
    if (main) { main.inert = false; main.removeAttribute('aria-hidden'); }
  };
  if (!cover) return release();
  try {
    const stage = $('openStage'), video = $('openVideo'), btn = $('openBtn'), status = $('openStatus');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let started = false, finished = false, watchdog = 0;

    // Lock the page: start at the top, nothing underneath is reachable or scrollable
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    scrollTo(0, 0);
    main.inert = true; main.setAttribute('aria-hidden', 'true');
    cover.tabIndex = -1;
    const stop = e => e.preventDefault();
    cover.addEventListener('touchmove', stop, { passive: false });
    cover.addEventListener('wheel', stop, { passive: false });
    if (!('inert' in main)) document.addEventListener('focusin', e => {   // older browsers without `inert`
      if (!finished && !cover.contains(e.target)) (btn.disabled ? cover : btn).focus();
    });

    // Pixel-snap the 9:16 stage to even device-pixel sizes/offsets so poster and video are rasterised on exactly the same grid
    // (CSS alone leaves fractional edges, e.g. 693.33px, which images and video snap differently). CSS sizing is the fallback.
    const fit = () => {
      const d = window.devicePixelRatio || 1, snap = v => Math.round(v * d / 2) * 2 / d;   // even device-pixel multiples
      const W = cover.clientWidth, H = cover.clientHeight;
      const w = snap(Math.min(W, H * 9 / 16, 720)), h = snap(w * 16 / 9);
      Object.assign(stage.style, { width: w + 'px', height: h + 'px', left: snap((W - w) / 2) + 'px', top: snap((H - h) / 2) + 'px', margin: '0' });
    };
    fit(); addEventListener('resize', fit);

    // Warm the 4 MB video once the page has settled (not on data-saver / 2G), so it starts instantly on tap
    const conn = navigator.connection || {};
    const lean = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
    const idle = cb => 'requestIdleCallback' in window ? requestIdleCallback(cb, { timeout: 2500 }) : setTimeout(cb, 400);
    const warm = () => { if (!finished && !started && !lean) { video.preload = 'auto'; video.load(); } };
    if (document.readyState === 'complete') idle(warm); else addEventListener('load', () => idle(warm), { once: true });

    // Open the invitation: crossfade the cover into the hero, then remove it from the DOM
    const finish = () => {
      if (finished) return; finished = true; clearTimeout(watchdog);
      status.textContent = 'Invitation opened';
      cover.classList.add('is-leaving');      // 500 ms opacity crossfade (see --fade in styles.css)
      release();                              // unlock scroll, un-inert, start the short hero text fade
      scrollTo(0, 0);
      main.focus({ preventScroll: true });
      let gone = false;
      const remove = () => {
        if (gone) return; gone = true;
        video.pause(); video.removeAttribute('src'); video.load();   // free the decoder and connection
        removeEventListener('resize', fit); cover.remove();
      };
      cover.addEventListener('transitionend', e => { if (e.target === cover && e.propertyName === 'opacity') remove(); });
      setTimeout(remove, 1000);               // failsafe only; the real trigger is transitionend
    };

    // Playback failure guard (never used to end a healthy video): no progress for 9 s means open the invitation anyway
    const arm = () => { clearTimeout(watchdog); watchdog = setTimeout(finish, 9000); };

    const open = () => {
      if (started) return; started = true;
      btn.disabled = true;                    // no repeat activation
      status.textContent = 'Opening the invitation';
      if (reduce) return finish();            // reduced motion: skip straight to the invitation
      arm();
      video.addEventListener('ended', finish, { once: true });   // the real end of the animation, whatever its length
      video.addEventListener('error', finish, { once: true });
      video.addEventListener('timeupdate', () => { if (!finished) arm(); });
      // Hide the poster only once the video is actually presenting frames (it shows the identical first frame underneath)
      let shown = false;
      const reveal = () => { if (!shown) { shown = true; stage.classList.add('is-playing'); } };
      if ('requestVideoFrameCallback' in video) video.requestVideoFrameCallback(reveal);
      video.addEventListener('timeupdate', () => { if (video.currentTime > 0.04) reveal(); });
      const p = video.play();
      if (p && p.catch) p.catch(finish);
    };
    btn.addEventListener('click', open);      // native <button>: mouse, touch, Enter and Space all land here

    // Mobile browsers can pause video in a hidden tab; resume when the guest comes back
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && started && !finished && video.paused && !video.ended) video.play().catch(finish);
    });
  } catch (err) {
    console.warn('Opening cover failed, showing the invitation instead.', err);
    release(); cover.remove();
  }
})();

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Footer video: starts only when near the viewport (keeps first load light)
  const fv = $('#footVid');
  if (fv && !reduce) new IntersectionObserver((e, o) => {
    if (e[0].isIntersecting) { fv.preload = 'auto'; fv.play().catch(() => {}); o.disconnect(); }
  }, { rootMargin: '400px' }).observe(fv);

  // Countdown (Asia/Muscat = UTC+4, no DST)
  const target = Date.parse('2026-12-18T17:00:00+04:00');
  const cells = Object.fromEntries([...document.querySelectorAll('#countdown [data-u]')].map(n => [n.dataset.u, n]));
  const tick = () => {
    const s = Math.max(0, Math.floor((target - Date.now()) / 1000)), p = n => String(n).padStart(2, '0');
    cells.d.textContent = p(Math.floor(s / 86400)); cells.h.textContent = p(Math.floor(s % 86400 / 3600));
    cells.m.textContent = p(Math.floor(s % 3600 / 60)); cells.s.textContent = p(s % 60);
  };
  tick(); setInterval(tick, 1000);

  // RSVP: posts straight to the Google Apps Script web app that writes to the sheet.
  // BRIDE-SIDE SITE: RSVP_URL is deliberately NOT the groom-side URL. Paste the bride-side web app URL here (see README).
  // Every submission is tagged invitationSide = 'bride' so it can never be mistaken for a groom-side response.
  const INVITATION_SIDE = 'bride';
  const RSVP_URL = 'https://script.google.com/macros/s/AKfycbw9ECjT9uHZfAOKpsQXfWjskYqtktYRQC4WVVJbMdb5B8jPi-S092DKJ8UcMnCvTA/exec';
  const rsvpConfigured = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(RSVP_URL);
  const form = $('#rsvpForm'), done = $('#rsvpDone'), btn = $('#sendBtn'), gw = $('#guestsWrap');
  let sending = false;
  form.addEventListener('change', e => { if (e.target.name === 'att') gw.hidden = e.target.value !== 'yes'; });
  const fail = (id, msg) => { $(id).textContent = msg; };
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (sending) return;
    const f = new FormData(form), name = String(f.get('name') || '').trim().replace(/\s+/g, ' '), att = f.get('att');
    fail('#eName', name.length < 2 ? 'Please enter your full name.' : ''); fail('#eAtt', att ? '' : 'Please choose one option.'); fail('#eForm', '');
    if (name.length < 2 || !att) return;
    if (!rsvpConfigured) { fail('#eForm', 'RSVP is not available right now. Please contact the family directly.'); console.warn('RSVP_URL is not configured in script.js'); return; }
    sending = true; btn.disabled = true; btn.textContent = 'SENDING…';
    try {
      const r = await fetch(RSVP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ invitationSide: INVITATION_SIDE, name, attending: att === 'yes', guests: att === 'yes' ? Number(f.get('guests') || 1) : 0, message: String(f.get('message') || '').trim(), website: String(f.get('website') || '') }) });
      const j = await r.json().catch(() => ({ error: 'no-json' }));
      if (r.ok && j.ok && String(j.side || '').toLowerCase() === INVITATION_SIDE) show('<p class="cinzel hd">Thank you</p><p>Your response has been received.</p>');
      else throw new Error('Could not save your response. Please try again. (' + (j.ok ? 'service out of date' : (j.error || 'http ' + r.status)) + ')');
    } catch (err) {
      fail('#eForm', err instanceof TypeError ? 'Network error. Please check your connection and try again.' : err.message);
      sending = false; btn.disabled = false; btn.textContent = 'SEND RSVP';
    }
  });
  function show(html) { form.hidden = true; done.innerHTML = html; done.hidden = false; }
})();

// ---- Background music controller ----
// Audio is started synchronously inside the openBtn click (same user-gesture call stack)
// so browsers allow autoplay. The MutationObserver only reveals the UI button afterward.
(() => {
  const musicBtn = document.getElementById('musicBtn');
  if (!musicBtn) return;

  const audio = new Audio('assets/music.mp3');
  audio.loop = true;
  audio.volume = 0.35;
  audio.preload = 'none';

  const setPlaying = playing => {
    musicBtn.setAttribute('aria-pressed', String(playing));
    musicBtn.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
  };

  const tryPlay = () => audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));

  // Hook into the open button's click — same gesture, autoplay always works here.
  const openBtn = document.getElementById('openBtn');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) tryPlay();
    }, { once: true });
  }

  // Reveal the music UI button once the cover leaves the DOM.
  const cover = document.getElementById('opening');
  if (cover) {
    new MutationObserver((_, obs) => {
      if (!document.getElementById('opening')) {
        obs.disconnect();
        musicBtn.hidden = false;
        // Sync the button state in case audio already started above.
        setPlaying(!audio.paused);
      }
    }).observe(document.body, { childList: true });
  } else {
    musicBtn.hidden = false;
    setPlaying(!audio.paused);
  }

  // Play / pause toggle.
  musicBtn.addEventListener('click', () => {
    if (audio.paused) tryPlay(); else { audio.pause(); setPlaying(false); }
  });

  // Auto-pause when tab is hidden; resume when it comes back.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !audio.paused) {
      audio.pause(); audio.dataset.auto = '1'; setPlaying(false);
    } else if (!document.hidden && audio.dataset.auto) {
      delete audio.dataset.auto; tryPlay();
    }
  });
})();
