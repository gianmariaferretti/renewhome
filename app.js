/* ============================================================
   RENEW HOME — interactivity
   page toggle · live calculators · success modals · validation tracker
   ============================================================ */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = (n) => Math.round(n).toLocaleString('en-US');

  // enable reveal animations only when JS runs (no-JS / capture shows everything)
  document.documentElement.classList.add('js');

  /* ---------- animated number engine (count-up + flash) ---------- */
  const numReg = new Map();
  let ticking = false;
  function tick() {
    let active = false;
    numReg.forEach((s, el) => {
      const d = s.target - s.cur;
      if (Math.abs(d) > s.eps) { s.cur += d * 0.24; active = true; } else { s.cur = s.target; }
      el.textContent = s.render(s.cur);
    });
    if (active) requestAnimationFrame(tick); else ticking = false;
  }
  function startTick() { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }
  function flash(el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  function setNum(el, target, render, eps) {
    if (!el) return;
    render = render || fmt;
    let s = numReg.get(el);
    if (!s) { s = { cur: target, target, render, eps: eps || 0.5 }; numReg.set(el, s); el.textContent = render(target); return; }
    if (Math.abs(s.target - target) > 1e-6) { s.target = target; s.render = render; flash(el); startTick(); }
  }
  const dec1 = (v) => v.toFixed(1);

  /* ---------- VPP live node grid ---------- */
  function buildVpp() {
    const box = $('#vppGrid'); if (!box) return null;
    const svg = $('#vppLinks');
    const N = 30, nodes = [];
    // central hub
    const hub = { x: 50, y: 52, hub: true };
    // three elliptical rings, deterministic placement
    const rings = [{ r: 16, n: 7, sz: 7 }, { r: 27, n: 10, sz: 6 }, { r: 38, n: 13, sz: 5 }];
    let idx = 0;
    rings.forEach((ring, ri) => {
      for (let i = 0; i < ring.n && idx < N; i++, idx++) {
        const a = (i / ring.n) * Math.PI * 2 + ri * 0.6;
        const x = Math.max(8, Math.min(92, 50 + Math.cos(a) * ring.r * 1.2));
        const y = Math.max(12, Math.min(90, 52 + Math.sin(a) * ring.r));
        nodes.push({ x, y, sz: ring.sz, order: ri * 100 + i });
      }
    });
    nodes.sort((a, b) => a.order - b.order);
    // links: hub -> each node (faint)
    let lines = '';
    nodes.forEach((n) => { lines += `<line x1="50" y1="52" x2="${n.x.toFixed(1)}" y2="${n.y.toFixed(1)}" stroke="rgba(0,217,98,0.10)" stroke-width="0.4"/>`; });
    if (svg) { svg.setAttribute('viewBox', '0 0 100 100'); svg.innerHTML = lines; }
    // hub node
    const hubEl = document.createElement('div');
    hubEl.className = 'node hub on';
    hubEl.style.left = '50%'; hubEl.style.top = '52%';
    box.appendChild(hubEl);
    // outer nodes
    const els = nodes.map((n, i) => {
      const el = document.createElement('div');
      el.className = 'node';
      el.style.cssText = `left:${n.x}%;top:${n.y}%;width:${n.sz}px;height:${n.sz}px;animation-delay:${(i * 0.12).toFixed(2)}s`;
      box.appendChild(el);
      return el;
    });
    return { els, total: els.length };
  }
  let vpp = null;
  function setVpp(ratio) {
    if (!vpp) return;
    const on = Math.round(Math.max(0, Math.min(1, ratio)) * vpp.total);
    vpp.els.forEach((el, i) => el.classList.toggle('on', i < on));
  }

  /* ---------- B2C node strip ---------- */
  function buildNodeStrip() {
    const box = $('#nodeStripC'); if (!box) return null;
    const total = 36, els = [];
    for (let i = 0; i < total; i++) { const d = document.createElement('span'); d.className = 'nd'; box.appendChild(d); els.push(d); }
    return { els, total };
  }
  let nodeStrip = null;
  function setNodeStrip(ratio) {
    if (!nodeStrip) return;
    const on = Math.round(Math.max(0, Math.min(1, ratio)) * nodeStrip.total);
    nodeStrip.els.forEach((el, i) => el.classList.toggle('on', i < on));
  }

  /* ---------- validation tracker (simulated metrics) ---------- */
  const STORE = 'rh_validation_v1';
  const loadVal = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } };
  const valState = Object.assign({ connect: 0, claim: 0, signup: 0, pilot: 0, whitepaper: 0, allocate: 0, nav: 0, total: 0 }, loadVal());
  const saveVal = () => { try { localStorage.setItem(STORE, JSON.stringify(valState)); } catch (e) {} };
  const trackEvent = (k) => { valState[k] = (valState[k] || 0) + 1; valState.total += 1; saveVal(); };

  /* =========================================================
     PAGE TOGGLE
     ========================================================= */
  const toggle = $('#pageToggle');
  const nav = $('#nav');
  const pages = { b2c: $('#b2c'), b2b: $('#b2b') };
  const navCtaLabel = $('[data-navlabel="b2c"]');

  function setPage(target, scroll = false) {
    if (!pages[target]) target = 'b2c';
    toggle.dataset.page = target;
    $$('#pageToggle button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.target === target)));
    Object.entries(pages).forEach(([k, el]) => el.classList.toggle('active', k === target));
    nav.classList.toggle('dark', target === 'b2b');
    if (navCtaLabel) navCtaLabel.textContent = target === 'b2b' ? 'Request Pilot' : 'Connect Thermostat';
    nav.querySelector('.nav-cta').dataset.cta = target === 'b2b' ? 'pilot' : 'connect';
    history.replaceState(null, '', '#' + target);
    try { localStorage.setItem('rh_page', target); } catch (e) {}
    // re-run reveal for the now-visible page
    requestAnimationFrame(() => revealScan());
    if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $$('#pageToggle button').forEach((b) => b.addEventListener('click', () => setPage(b.dataset.target, true)));

  // deep links that also switch page
  $$('[data-nav]').forEach((a) => a.addEventListener('click', (e) => {
    const tgt = a.dataset.nav;
    if (toggle.dataset.page !== tgt) { setPage(tgt); }
  }));

  // initial page from hash or storage
  let initial = (location.hash || '').replace('#', '');
  if (!pages[initial]) { try { initial = localStorage.getItem('rh_page'); } catch (e) {} }
  setPage(pages[initial] ? initial : 'b2c');

  /* =========================================================
     B2C CALCULATOR — household savings
     ========================================================= */
  const bill = $('#bill'), brand = $('#brand');
  const billVal = $('#billVal'), outSavings = $('#outSavings'), outCo2 = $('#outCo2'),
        outTrees = $('#outTrees'), savingsBar = $('#savingsBar'), heroAmount = $('#heroAmount');

  function rngFill(el) {
    const p = ((el.value - el.min) / (el.max - el.min)) * 100;
    el.style.setProperty('--p', p.toFixed(1) + '%');
  }

  function calcB2C() {
    const monthly = +bill.value;
    const f = +brand.selectedOptions[0].dataset.f;
    // ~7% of annual spend shifted, brand-weighted, softly capped near $220
    const annual = monthly * 12;
    let savings = annual * 0.072 * f;
    savings = Math.min(savings, 60 + 170 * (1 - Math.exp(-savings / 150))); // soft cap
    savings = Math.max(40, savings);
    const co2 = savings * 3.45;              // kg CO2 / yr
    const trees = co2 / 21;                  // ~21kg absorbed per tree/yr

    billVal.textContent = monthly;
    setNum(outSavings, savings);
    setNum(heroAmount, savings);
    setNum(outCo2, co2);
    setNum(outTrees, trees);
    savingsBar.style.width = Math.min(100, (savings / 220) * 100).toFixed(0) + '%';
    setNodeStrip(savings / 220);
    rngFill(bill);
    // store latest for modal recap
    calcB2C.last = { monthly, savings: fmt(savings), co2: fmt(co2), brand: brand.selectedOptions[0].textContent };
  }
  if (bill) { nodeStrip = buildNodeStrip(); bill.addEventListener('input', calcB2C); brand.addEventListener('change', calcB2C); calcB2C(); }

  /* =========================================================
     B2B CALCULATOR — grid CAPEX & impact
     ========================================================= */
  const mw = $('#mw'), market = $('#market');
  const mwVal = $('#mwVal'), outCapex = $('#outCapex'), outHomes = $('#outHomes'),
        outCarbon = $('#outCarbon'), capexBar = $('#capexBar');

  function calcB2B() {
    const cap = +mw.value;
    const f = +market.selectedOptions[0].dataset.f;
    const capex = cap * 1.0 * f;             // $M  (≈ $1M+/MW)
    const homes = cap * 1000;                // ~1,000 homes / MW
    const carbon = cap * 330;                // MT CO2 / yr  (≈ 16Mt @ 50GW)

    mwVal.textContent = cap;
    setNum(outCapex, capex, dec1);
    setNum(outHomes, homes);
    setNum(outCarbon, carbon);
    capexBar.style.width = Math.min(100, cap).toFixed(0) + '%';
    setVpp(cap / 100);
    const vh = $('#vppHomes'), vm = $('#vppMw');
    if (vh) vh.textContent = fmt(homes);
    if (vm) vm.textContent = cap + ' MW';
    rngFill(mw);
    calcB2B.last = { mw: cap, capex: '$' + capex.toFixed(1) + 'M', homes: fmt(homes), carbon: fmt(carbon) + ' MT', market: market.selectedOptions[0].textContent };
  }
  if (mw) { vpp = buildVpp(); mw.addEventListener('input', calcB2B); market.addEventListener('change', calcB2B); calcB2B(); }

  /* =========================================================
     SUCCESS MODAL
     ========================================================= */
  const scrim = $('#successScrim');
  const mTitle = $('#mTitle'), mSub = $('#mSub'), mRecap = $('#mRecap'), mTrack = $('#mTrack');

  const RECAP = {
    connect: () => ({
      title: 'Thermostat connection requested', emoji: '⚡',
      sub: "We'll guide you through authorizing Renew Home inside your smart-home app.",
      rows: [['Device', (calcB2C.last && calcB2C.last.brand) || 'Smart thermostat'],
             ['Cost to you', '$0 — free forever', true],
             ['Est. annual savings', '$' + ((calcB2C.last && calcB2C.last.savings) || '~100') + '/yr', true]]
    }),
    claim: () => ({
      title: 'Savings claimed! 🎉', emoji: '🎉',
      sub: 'Your personalized savings plan is reserved. Connect your device to activate.',
      rows: [['Monthly bill', '$' + ((calcB2C.last && calcB2C.last.monthly) || 150) + '/mo'],
             ['Est. annual savings', '$' + ((calcB2C.last && calcB2C.last.savings) || '104') + '/yr', true],
             ['CO₂ avoided', ((calcB2C.last && calcB2C.last.co2) || '360') + ' kg/yr', true]]
    }),
    signup: () => ({
      title: "You're on the list! 🎉",
      sub: "Check your inbox — we'll connect your thermostat in minutes.",
      rows: [['Email', signupEmailVal || 'you@email.com'],
             ['Plan', 'Free · Set & forget', true],
             ['Next step', 'Authorize in your app']]
    }),
    pilot: () => ({
      title: 'Pilot request received',
      sub: 'Our grid team will reach out to scope your 6-month paid pilot and LOI.',
      rows: [['Capacity modeled', ((calcB2B.last && calcB2B.last.mw) || 25) + ' MW'],
             ['CAPEX avoided', (calcB2B.last && calcB2B.last.capex) || '$25.0M', true],
             ['Market', (calcB2B.last && calcB2B.last.market) || 'ERCOT / CAISO']]
    }),
    allocate: () => ({
      title: 'Capacity allocation reserved',
      sub: 'We\'ve provisionally held your requested capacity. A specialist will confirm terms.',
      rows: [['Capacity', ((calcB2B.last && calcB2B.last.mw) || 25) + ' MW'],
             ['Homes activated', (calcB2B.last && calcB2B.last.homes) || '25,000'],
             ['CO₂ avoided', (calcB2B.last && calcB2B.last.carbon) || '8,250 MT/yr', true]]
    }),
    whitepaper: () => ({
      title: 'Whitepaper on its way',
      sub: 'The VPP Architecture whitepaper is downloading to your inbox.',
      rows: [['Document', 'VPP Architecture · 24 pp'],
             ['Format', 'PDF'],
             ['Includes', 'Dispatch stack + M&V model']]
    }),
    nav: () => RECAP.connect()
  };

  let signupEmailVal = '';

  function openModal(kind) {
    const data = (RECAP[kind] || RECAP.connect)();
    mTitle.textContent = data.title;
    mSub.textContent = data.sub;
    mRecap.innerHTML = data.rows.map((r) =>
      `<div class="rrow"><span>${r[0]}</span><b class="${r[2] ? 'g' : ''}">${r[1]}</b></div>`).join('');
    trackEvent(kind);
    const labelMap = { total: 'validation events' };
    mTrack.textContent = `Simulated validation event #${valState.total} recorded`;
    scrim.classList.add('open');
    scrim.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(el) {
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /* =========================================================
     VIDEO LIGHTBOX
     ========================================================= */
  const videoScrim = $('#videoScrim');
  const lbCap = $('#lbCap');
  function openVideo(kind) {
    lbCap.textContent = kind === 'video-b2b'
      ? '1-Minute VPP architecture explainer · drop your poster frame to preview'
      : '1-Minute homeowner explainer · drop your poster frame to preview';
    videoScrim.classList.add('open');
    videoScrim.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    trackEvent('video');
  }

  /* =========================================================
     GLOBAL CTA DELEGATION
     ========================================================= */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cta]');
    if (btn) {
      const kind = btn.dataset.cta;
      e.preventDefault();
      if (kind.startsWith('video')) { openVideo(kind); return; }
      openModal(kind);
      return;
    }
    if (e.target.closest('[data-close]')) {
      closeModal(e.target.closest('.modal-scrim'));
    }
    if (e.target.classList.contains('modal-scrim')) {
      closeModal(e.target);
    }
  });

  // signup form
  const signupForm = $('#signupForm');
  if (signupForm) signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    signupEmailVal = $('#signupEmail').value || 'you@email.com';
    openModal('signup');
    signupForm.reset();
  });

  // esc to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.modal-scrim.open').forEach(closeModal);
  });

  /* =========================================================
     SCROLL REVEAL
     ========================================================= */
  let io;
  function revealScan() {
    if (!('IntersectionObserver' in window)) { $$('.reveal').forEach((el) => el.classList.add('in')); return; }
    if (!io) io = new IntersectionObserver((entries) => {
      entries.forEach((ent) => { if (ent.isIntersecting) { ent.target.classList.add('in'); io.unobserve(ent.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    $$('.page.active .reveal:not(.in)').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.95) el.classList.add('in'); else io.observe(el);
    });
  }
  requestAnimationFrame(revealScan);
  window.addEventListener('load', () => requestAnimationFrame(revealScan));
  // safety net: never leave content hidden
  setTimeout(() => $$('.page.active .reveal:not(.in)').forEach((el) => {
    if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in');
  }), 1400);

  /* =========================================================
     COMFORT TOGGLE (B2C bento delight)
     ========================================================= */
  const comfort = $('#comfortToggle');
  if (comfort) comfort.addEventListener('click', () => {
    const turningOff = !comfort.classList.contains('off');
    comfort.classList.toggle('off', turningOff);
    comfort.setAttribute('aria-checked', String(!turningOff));
    const lbl = $('#comfortLabel');
    if (lbl) lbl.textContent = turningOff ? 'Paused — you have full control' : 'Auto-optimize ON · override anytime';
  });

  /* =========================================================
     FAQ ACCORDIONS
     ========================================================= */
  $$('[data-faq] .faq-item').forEach((item) => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    q.addEventListener('click', () => {
      const open = item.classList.toggle('open');
      a.style.maxHeight = open ? a.scrollHeight + 'px' : '0px';
    });
  });
  window.addEventListener('resize', () => {
    $$('[data-faq] .faq-item.open .faq-a').forEach((a) => { a.style.maxHeight = a.scrollHeight + 'px'; });
  });

  /* =========================================================
     AMBIENT LIVE TOASTS (simulated network activity)
     ========================================================= */
  const toastWrap = $('#toastWrap');
  const TOAST_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>';
  const TOASTS = {
    b2c: [
      { t: 'Household in Austin saved $12 today', s: 'Rush-hour event · comfort held within 1°F' },
      { t: 'Nest thermostat just connected', s: 'Sacramento, CA · onboarding in 3 min' },
      { t: '1,204 homes shifted load this hour', s: 'Collective impact · 0 comfort overrides' },
      { t: 'Reward credited: $4.50', s: 'Thanks for helping balance the grid' },
      { t: 'Ecobee home avoided 0.9 kg CO₂', s: 'Quiet optimization · no effort required' }
    ],
    b2b: [
      { t: 'Grid stress event resolved in CAISO', s: '41.6 MW dispatched · 99.0% accuracy' },
      { t: 'New CCA pilot signed — 8 MW', s: 'Bundled capacity + acquisition' },
      { t: 'Dispatch latency: 182 ms', s: 'Real-time orchestration nominal' },
      { t: 'ERCOT capacity bid cleared', s: '12 MW · contractually guaranteed' },
      { t: '+3,400 homes enrolled this week', s: 'Aggregated flexible load growing' }
    ]
  };
  function showToast() {
    if (!toastWrap || document.hidden) return;
    const list = TOASTS[toggle.dataset.page] || TOASTS.b2c;
    const m = list[Math.floor(Math.random() * list.length)];
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<div class="t-ico">${TOAST_ICON}</div><div class="t-body"><div class="t-title">${m.t}</div><div class="t-sub">${m.s}</div></div>`;
    toastWrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 520); }, 5000);
    while (toastWrap.children.length > 3) toastWrap.firstChild.remove();
  }
  function scheduleToast() {
    setTimeout(() => { showToast(); scheduleToast(); }, 7000 + Math.random() * 7000);
  }
  setTimeout(scheduleToast, 4500);

  // expose for tweaks layout changes
  window.__rh = { revealScan, calcB2C, calcB2B };
})();
