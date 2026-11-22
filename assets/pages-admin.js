/* HMS demo — Admin: Subscription, Account details, Payment gateways, Payment sheet.
 * Everything here is fictional sample data; keys/IDs are random look-alikes, never real.
 * Long-running actions (connect a gateway, change plan, verify bank…) go through runSteps(),
 * a step-by-step processing dialog, so the flow reads like the real build.
 */
(() => {
  'use strict';
  const K = window.PG;
  const { esc, inr, T, D, can, card, badge, ico, tile, tiles, btn, iconBtn, seg, search, select, toolbar, cardHead,
    table, td, td0, person, empty, bar, note, field, readForm, modal, on, onChange, rerender, ui, iso, addDays, fmtDate, audit, who } = K;
  const H = () => window.HMS;
  const $ = s => document.querySelector(s);
  const toast = (...a) => H().toast(...a);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---------------- seeded random (stable sample data per hospital) ---------------- */
  function rng(seed) { let s = 0; for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const ALNUM = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const rstr = (n, r = Math.random) => Array.from({ length: n }, () => ALNUM[Math.floor(r() * ALNUM.length)]).join('');
  const rdig = (n, r = Math.random) => Array.from({ length: n }, () => Math.floor(r() * 10)).join('');
  const mask = v => (v ? '••••••••' + String(v).slice(-4) : '—');

  /* ---------------- plans (prices are per hospital, + 18% GST) ---------------- */
  const PRICE = { starter: { monthly: 2999, yearly: 29990 }, pro: { monthly: 9999, yearly: 99990 } };
  const LIMITS = { starter: { users: 15, branches: 1, patients: 5000, storage: 20, wa: 1000 }, pro: { users: 150, branches: 5, patients: Infinity, storage: 200, wa: 10000 } };
  const PLAN_CARDS = [
    { key: 'starter', tone: 'sky', icon: 'stethoscope', tag: 'Clinics & polyclinics', feats: ['Patients, appointments, EMR, prescriptions', 'Billing & online payments', '1 branch · 15 staff logins', '20 GB records storage', 'Email support'] },
    { key: 'pro', tone: 'teal', icon: 'hospital', tag: 'Multi-speciality hospitals', popular: true, feats: ['Every module: lab, pharmacy, IPD, HR & payroll', 'Up to 5 branches · 150 staff logins', 'Unlimited patients · 200 GB storage', 'WhatsApp + SMS channels', 'Priority support · 99.9% SLA'] },
    { key: 'enterprise', tone: 'violet', icon: 'building', tag: 'Hospital chains', feats: ['Unlimited branches & users', 'Dedicated database (isolation tier)', 'Custom domain & SSO', 'Named account manager', 'On-site training'] },
  ];

  /* ---------------- payment providers ---------------- */
  const METHODS = [['upi', 'UPI', 'qr-code'], ['card', 'Cards', 'credit-card'], ['netbanking', 'Netbanking', 'landmark'], ['wallet', 'Wallets', 'wallet'], ['emi', 'EMI', 'calendar-range'], ['intl', 'International cards', 'globe']];
  // fields: [name, label, examplePrefix(mode) → value, secret?]
  const PROVIDERS = {
    razorpay: { name: 'Razorpay', tone: 'sky', mono: 'Rz', desc: 'UPI, cards, netbanking & wallets. Best for Indian patients.', fee: 0.02, methods: ['upi', 'card', 'netbanking', 'wallet', 'emi'],
      docs: 'Dashboard → Account & Settings → API keys', fields: [
        ['keyId', 'Key ID', m => `rzp_${m}_${rstr(14)}`, false], ['keySecret', 'Key secret', () => rstr(24), true],
        ['webhookSecret', 'Webhook secret', () => 'whk_' + rstr(20), true], ['merchantId', 'Merchant ID', () => rstr(14).toUpperCase(), false]],
      check: (v, m) => (v.keyId && !v.keyId.startsWith(`rzp_${m}_`) ? ['keyId', `A ${m} key starts with rzp_${m}_`] : null) },
    stripe: { name: 'Stripe', tone: 'violet', mono: 'S', desc: 'International cards, Apple Pay & Google Pay for medical tourists.', fee: 0.034, methods: ['card', 'intl'],
      docs: 'Developers → API keys, and Developers → Webhooks', fields: [
        ['publishableKey', 'Publishable key', m => `pk_${m}_51${rstr(30)}`, false], ['secretKey', 'Secret key', m => `sk_${m}_51${rstr(30)}`, true],
        ['webhookSecret', 'Webhook signing secret', () => 'whsec_' + rstr(28), true], ['accountId', 'Account ID', () => 'acct_1' + rstr(15), false]],
      check: (v, m) => (v.publishableKey && !v.publishableKey.startsWith(`pk_${m}_`) ? ['publishableKey', `A ${m} key starts with pk_${m}_`]
        : v.secretKey && !v.secretKey.startsWith(`sk_${m}_`) ? ['secretKey', `A ${m} secret starts with sk_${m}_`] : null) },
    cashfree: { name: 'Cashfree', tone: 'emerald', mono: 'Cf', desc: 'Low-fee UPI and instant settlements.', fee: 0.0175, methods: ['upi', 'card', 'netbanking', 'wallet'],
      docs: 'Developers → API keys', fields: [['appId', 'App ID', () => rdig(6) + rstr(20).toLowerCase(), false], ['secretKey', 'Secret key', m => `cfsk_ma_${m === 'live' ? 'prod' : 'test'}_${rstr(28).toLowerCase()}`, true]] },
    payu: { name: 'PayU', tone: 'lime', mono: 'Pu', desc: 'Cards, EMI and netbanking with wide bank coverage.', fee: 0.02, methods: ['card', 'netbanking', 'emi', 'upi'],
      docs: 'Dashboard → Developer → Key & Salt', fields: [['merchantKey', 'Merchant key', () => rstr(6), false], ['merchantSalt', 'Merchant salt (v2)', () => rstr(32), true]] },
    phonepe: { name: 'PhonePe PG', tone: 'violet', mono: 'Pe', desc: 'UPI intent & QR with high success rates.', fee: 0.015, methods: ['upi', 'card'],
      docs: 'Business dashboard → Developer settings', fields: [['merchantId', 'Merchant ID', () => 'M' + rstr(12).toUpperCase(), false], ['saltKey', 'Salt key', () => rstr(8).toLowerCase() + '-' + rstr(4).toLowerCase() + '-' + rstr(12).toLowerCase(), true], ['saltIndex', 'Salt index', () => '1', false]] },
    paytm: { name: 'Paytm', tone: 'sky', mono: 'Pt', desc: 'Paytm wallet, UPI and postpaid.', fee: 0.0199, methods: ['upi', 'wallet', 'card'],
      docs: 'Developer settings → API keys', fields: [['mid', 'Merchant ID (MID)', () => rstr(8) + rdig(12), false], ['merchantKey', 'Merchant key', () => rstr(16), true]] },
  };
  const TONE_FALLBACK = t => (H().TONES[t] ? t : 'emerald');
  const COUNTER = { name: 'Cash counter', tone: 'slate', mono: '₹' };
  const gwMeta = k => PROVIDERS[k] || COUNTER;

  const STATUS = {
    captured: ['Captured', 'teal', 'circle-check'], settled: ['Settled', 'emerald', 'landmark'], pending: ['Pending', 'amber', 'hourglass'],
    failed: ['Failed', 'rose', 'circle-x'], refunded: ['Refunded', 'violet', 'undo-2'],
  };
  const PURPOSES = [['OPD consultation', 600, 1200], ['Lab tests', 450, 4200], ['Pharmacy', 180, 2600], ['Radiology', 900, 6500], ['IPD advance', 10000, 50000], ['Day-care procedure', 3500, 18000]];

  /* ---------------- per-hospital state ---------------- */
  const cache = new WeakMap();
  const A = () => { const t = T(); if (!cache.has(t)) cache.set(t, make(t)); return cache.get(t); };

  function make(t) {
    const sun = t.slug === 'sun', r = rng(t.slug + '-pay'), now = new Date();
    const renews = sun ? '2027-04-01' : iso(addDays(now, 12));
    const sub = {
      cycle: sun ? 'yearly' : 'monthly', status: 'active', since: sun ? '2024-04-01' : '2026-02-14', renews, autoRenew: true,
      card: sun ? { brand: 'Visa', last4: '4242', exp: '08/28', name: 'Sun Hospital Pvt Ltd' } : { brand: 'RuPay', last4: '6071', exp: '03/27', name: 'Moon Clinic' },
      usage: sun ? { users: 112, patients: 18420, storage: 86.4, wa: 6120 } : { users: 11, patients: 3870, storage: 12.4, wa: 940 },
      credits: { wa: sun ? 10000 : 1000, sms: sun ? 25000 : 2000 }, invoices: [],
    };
    const amt = PRICE[t.plan][sub.cycle];
    for (let i = 0; i < (sun ? 3 : 6); i++) {
      const d = sun ? new Date(2026 - i, 3, 1) : new Date(now.getFullYear(), now.getMonth() - i, 14);
      sub.invoices.push({ id: `HMS-${d.getFullYear()}-${String(1180 - i * 37).padStart(5, '0')}`, date: iso(d), period: sun ? `FY ${d.getFullYear()}–${String(d.getFullYear() + 1).slice(2)}` : d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        plan: PLANS[t.plan].label, amount: amt, gst: Math.round(amt * 0.18), status: 'paid', method: `${sub.card.brand} •••• ${sub.card.last4}` });
    }

    const p = D().settings.profile;
    const account = sun ? {
      org: { legal: 'Sun Hospital Private Limited', brand: 'Sun Hospital', type: 'Private Limited', pan: 'AABCS1429B', gstin: p.gstin, cin: 'U85110WB2014PTC203381', reg: p.reg, website: 'https://sunhospital.in' },
      contact: { name: 'Dr. Anita Sen', designation: 'Hospital Administrator', email: 'accounts@sunhospital.in', phone: '9830012345', alt: '03340123400', line1: '14, Lake View Road', line2: 'Near Rabindra Sarobar', city: 'Kolkata', state: 'West Bengal', pin: '700029' },
      bank: { holder: 'Sun Hospital Private Limited', number: '50200012345678', ifsc: 'HDFC0000052', bank: 'HDFC Bank', branch: 'Gariahat, Kolkata', type: 'Current', verified: true, verifiedAt: '2024-04-03' },
      owner: { name: 'Dr. Anita Sen', email: 'anita.sen@sunhospital.in', phone: '9830098300', twofa: true, lastLogin: 'Today, 09:12 · Chrome on Windows' },
    } : {
      org: { legal: 'Moon Clinic', brand: 'Moon Clinic', type: 'Proprietorship', pan: '', gstin: p.gstin, cin: '', reg: p.reg, website: '' },
      contact: { name: '', designation: '', email: '', phone: '', alt: '', line1: '', line2: '', city: 'Kolkata', state: 'West Bengal', pin: '' },
      bank: { holder: '', number: '', ifsc: '', bank: '', branch: '', type: 'Current', verified: false },
      owner: { name: 'Dr. Kabir Das', email: 'kabir@moonclinic.in', phone: '9831055500', twofa: false, lastLogin: 'Yesterday, 18:40 · Safari on iPhone' },
    };

    account.docs = Object.fromEntries(['pan', 'gst', 'cheque', 'cert', 'nabh'].map(k => [k, sun || k === 'gst'
      ? { status: 'verified', file: { pan: 'PAN_SunHospital.pdf', gst: 'GST_REG-06.pdf', cheque: 'Cancelled_cheque_HDFC.jpg', cert: 'WB_CE_Certificate_2024.pdf', nabh: 'NABH_Certificate.pdf' }[k], at: sun ? '2024-04-02' : '2026-02-15' }
      : { status: 'missing', file: '', at: null }]));
    account.history = sun ? [
      { icon: 'credit-card', text: 'Subscription card updated to Visa •••• 4242', at: '2026-09-12', by: 'Dr. Anita Sen' },
      { icon: 'landmark', text: 'Bank account verified · •••• 5678', at: '2024-04-03', by: 'Dr. Anita Sen' },
      { icon: 'badge-check', text: 'KYC documents verified', at: '2024-04-02', by: 'HMS compliance' },
      { icon: 'building-2', text: 'Account created', at: '2024-04-01', by: 'HMS onboarding' }]
      : [{ icon: 'badge-check', text: 'GST certificate verified', at: '2026-02-15', by: 'HMS compliance' }, { icon: 'building-2', text: 'Account created', at: '2026-02-14', by: 'HMS onboarding' }];
    const gw = {};
    Object.keys(PROVIDERS).forEach(k => { gw[k] = { status: 'off', mode: 'test', creds: {}, methods: [...PROVIDERS[k].methods], autoCapture: true, connectedAt: null, lastEvent: null }; });
    const fill = (k, mode) => Object.fromEntries(PROVIDERS[k].fields.map(([n, , ex]) => [n, ex(mode)]));
    if (sun) {
      Object.assign(gw.razorpay, { status: 'on', mode: 'live', creds: fill('razorpay', 'live'), connectedAt: '2024-04-05', lastEvent: '2 min ago · payment.captured' });
      Object.assign(gw.stripe, { status: 'on', mode: 'live', creds: fill('stripe', 'live'), connectedAt: '2025-01-18', lastEvent: '3 h ago · charge.succeeded' });
      Object.assign(gw.cashfree, { status: 'on', mode: 'test', creds: fill('cashfree', 'test'), connectedAt: iso(addDays(now, -2)), lastEvent: 'Yesterday · test payment' });
    }
    const routing = sun ? { default: 'razorpay', intl: 'stripe', upi: 'razorpay', fallback: 'cashfree' } : { default: null, intl: null, upi: null, fallback: null };

    /* transactions — last 30 days */
    const pts = D().patients, live = Object.keys(gw).filter(k => gw[k].status === 'on' && gw[k].mode === 'live');
    const txns = [];
    const n = sun ? 64 : 22;
    for (let i = 0; i < n; i++) {
      const at = new Date(now - Math.floor(r() * 30 * 86400000)); at.setHours(8 + Math.floor(r() * 12), Math.floor(r() * 60));
      const pt = pts[Math.floor(r() * pts.length)], pu = PURPOSES[Math.floor(r() * (sun ? PURPOSES.length : 3))];
      const gross = Math.round((pu[1] + r() * (pu[2] - pu[1])) / 10) * 10;
      let g = live.length && r() > 0.22 ? (r() > 0.86 && live.includes('stripe') ? 'stripe' : 'razorpay') : 'counter';
      const method = g === 'counter' ? 'Cash' : g === 'stripe' ? 'International card' : ['UPI', 'UPI', 'UPI', 'Card', 'Netbanking', 'Wallet'][Math.floor(r() * 6)];
      txns.push(mkTxn({ at, pt, purpose: pu[0], gross, gw: g, method, r, age: (now - at) / 86400000 }));
    }
    txns.sort((a, b) => b.at - a.at);
    const settlements = buildSettlements(txns, account, r);
    return { sub, account, gw, routing, txns, settlements };
  }

  function mkTxn({ at, pt, purpose, gross, gw, method, r = Math.random, age = 0, status }) {
    const fee = gw === 'counter' ? 0 : Math.round(gross * (gw === 'stripe' ? 0.034 : PROVIDERS[gw].fee) + (gw === 'stripe' ? 3 : 0));
    const gst = Math.round(fee * 0.18);
    if (!status) {
      const x = r();
      status = gw === 'counter' ? (x > 0.95 ? 'refunded' : 'settled')
        : x > 0.95 ? 'failed' : x > 0.91 ? 'refunded' : age < 2 ? (x > 0.8 ? 'pending' : 'captured') : 'settled';
    }
    const ref = gw === 'razorpay' ? 'pay_' + rstr(14, r) : gw === 'stripe' ? 'pi_3' + rstr(20, r) : gw === 'counter' ? 'RCPT-' + rdig(6, r) : gw.slice(0, 2) + '_' + rstr(16, r);
    return { id: 'TXN-' + rdig(8, r), at, patient: pt.name, mrn: pt.mrn, purpose, invoice: 'INV-' + (24000 + Math.floor(r() * 900)), gross, fee: status === 'failed' ? 0 : fee, gst: status === 'failed' ? 0 : gst,
      net: status === 'failed' ? 0 : gross - fee - gst, gw, method, ref, order: gw === 'counter' ? '—' : 'order_' + rstr(14, r), status, settlement: null, refund: status === 'refunded' ? gross : 0,
      vpa: method === 'UPI' ? pt.name.split(' ')[0].toLowerCase() + '@' + ['okhdfcbank', 'ybl', 'paytm', 'okicici'][Math.floor(r() * 4)] : '',
      cardLast4: /card/i.test(method) ? rdig(4, r) : '', by: gw === 'counter' ? 'Front desk' : 'Patient portal' };
  }

  function buildSettlements(txns, account, r = Math.random) {
    const byDay = {};
    txns.filter(x => x.status === 'settled' && x.gw !== 'counter').forEach(x => { const d = iso(addDays(x.at, 2)); (byDay[d + '|' + x.gw] ||= []).push(x); });
    return Object.entries(byDay).map(([k, list]) => {
      const [date, gw] = k.split('|'), id = (gw === 'stripe' ? 'po_' : 'setl_') + rstr(14, r);
      list.forEach(x => { x.settlement = id; });
      return { id, date, gw, count: list.length, gross: list.reduce((s, x) => s + x.gross, 0), fees: list.reduce((s, x) => s + x.fee + x.gst, 0),
        net: list.reduce((s, x) => s + x.net, 0), utr: (gw === 'stripe' ? 'STRP' : 'HDFCN') + rdig(12, r), bank: account.bank.number ? `${account.bank.bank} •••• ${account.bank.number.slice(-4)}` : '—' };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }

  /* =========================================================================
   * Processing dialog: runSteps({ title, icon, tone, steps:[label…], done:{title,text}, onDone })
   * ========================================================================= */
  let runToken = 0;
  async function runSteps(o) {
    const my = ++runToken;
    modal({ title: o.title, sub: o.sub, icon: o.icon || 'loader', tone: o.tone || 'teal', foot: false, size: 'max-w-md',
      body: `<div id="procBox">
        <div class="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div id="procBar" class="h-full w-0 rounded-full bg-teal-500 transition-all duration-500"></div></div>
        <ol class="space-y-2.5">${o.steps.map((s, i) => `<li id="procS${i}" class="flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm text-slate-400 transition dark:text-slate-500">
          <span class="proc-ic grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 dark:bg-slate-800">${ico('circle', 'h-3 w-3')}</span>
          <span class="flex-1">${esc(s)}</span><span class="proc-t text-[11px] tabular-nums"></span></li>`).join('')}</ol>
        <div id="procEnd" class="hidden"></div></div>` });
    const m = $('#pgModal'); m.setAttribute('data-static', '');
    const live = () => my === runToken && $('#procBox');
    for (let i = 0; i < o.steps.length; i++) {
      if (!live()) break;
      const li = $('#procS' + i), t0 = performance.now();
      li.className = 'flex items-center gap-3 rounded-xl bg-teal-50 px-2 py-1.5 text-sm font-medium text-teal-800 transition dark:bg-teal-500/10 dark:text-teal-200';
      li.querySelector('.proc-ic').innerHTML = ico('loader-circle', 'h-4 w-4 animate-spin'); H().icons();
      await sleep(520 + Math.random() * 520);
      if (!live()) break;
      if (o.failAt === i) {
        li.className = 'flex items-center gap-3 rounded-xl bg-rose-50 px-2 py-1.5 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300';
        li.querySelector('.proc-ic').innerHTML = ico('x', 'h-4 w-4'); $('#procBar').classList.replace('bg-teal-500', 'bg-rose-500'); H().icons();
        m.removeAttribute('data-static');
        $('#procEnd').className = 'mt-5'; $('#procEnd').innerHTML = `${note('rose', 'circle-x', `<b>${esc(o.fail.title)}</b><br>${o.fail.text}`)}
          <div class="mt-4 flex justify-end gap-2">${btn('ghost', 'Close', '', 'data-close-modal')}${o.fail.retry ? btn('primary', 'Edit & retry', 'pencil', 'data-pg="proc-retry"') : ''}</div>`;
        retryCb = o.fail.retry || null; H().icons(); return false;
      }
      li.className = 'flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm text-slate-700 transition dark:text-slate-200';
      li.querySelector('.proc-ic').className = 'proc-ic grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10';
      li.querySelector('.proc-ic').innerHTML = ico('check', 'h-4 w-4');
      li.querySelector('.proc-t').textContent = ((performance.now() - t0) / 1000).toFixed(1) + 's';
      $('#procBar').style.width = ((i + 1) / o.steps.length * 100) + '%'; H().icons();
    }
    if (my !== runToken) return false;
    m.removeAttribute('data-static');
    const res = o.onDone ? o.onDone() : null;
    if (live()) {
      $('#procEnd').className = 'mt-5 text-center step-in';
      $('#procEnd').innerHTML = `<span class="check-draw mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
          <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
        <p class="mt-3 font-semibold text-slate-900 dark:text-white">${esc(o.done.title)}</p><p class="mt-1 text-sm text-slate-500 dark:text-slate-400">${o.done.text}</p>
        ${res && res.extra ? res.extra : ''}
        <div class="mt-5 flex justify-center gap-2">${(o.done.actions || '')}${btn('primary', 'Done', '', 'data-close-modal', 'h-10 px-6')}</div>`;
      H().icons();
    }
    if (!o.noRerender) rerender();
    return true;
  }
  let retryCb = null;
  on('proc-retry', () => { const f = retryCb; retryCb = null; if (f) f(); });

  /* small form helpers */
  const setErr = (form, name, msg) => { const f = form.elements[name]; if (!f) return; f.classList.add('invalid'); const e = f.closest('label')?.querySelector('.err'); if (e) { e.textContent = msg; e.classList.remove('hidden'); } f.focus(); };
  const fillForm = (form, obj) => Object.entries(obj).forEach(([k, v]) => { const f = form.elements[k]; if (!f) return; if (f.type === 'checkbox') f.checked = !!v; else f.value = v; f.classList.remove('invalid'); f.dispatchEvent(new Event('input', { bubbles: true })); });
  const RX = { gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, pan: /^[A-Z]{5}\d{4}[A-Z]$/, ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/, pin: /^\d{6}$/, phone: /^[6-9]\d{9}$/, email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ };
  const sw = (on_, attrs) => `<button type="button" role="switch" class="switch" aria-checked="${!!on_}" ${attrs}></button>`;
  const autofillBtn = attrs => `<button type="button" class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-2.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200" ${attrs}>${ico('wand-sparkles', 'h-3.5 w-3.5')}Autofill example data</button>`;
  const providerLogo = (k, size = 'h-11 w-11 text-sm') => { const p = gwMeta(k); return `<span class="grid ${size} shrink-0 place-items-center rounded-xl font-extrabold ${K.tone(TONE_FALLBACK(p.tone))}">${esc(p.mono)}</span>`; };

  /* =========================================================================
   * 1) Subscription
   * ========================================================================= */
  function renderSubscription(c) {
    const t = T(), a = A(), s = a.sub, plan = t.plan, cyc = ui.subCycle || s.cycle, lim = LIMITS[plan];
    const price = PRICE[plan][s.cycle], daysLeft = Math.max(0, Math.round((new Date(s.renews) - new Date()) / 86400000));
    const meter = (icon, label, used, max, unit = '') => {
      const pct = max === Infinity ? 12 : used / max * 100, t_ = pct > 90 ? 'rose' : pct > 75 ? 'amber' : 'teal';
      return `<div><div class="mb-1.5 flex items-center gap-2 text-sm">${ico(icon, 'h-4 w-4 text-slate-400')}<span class="flex-1 text-slate-600 dark:text-slate-300">${label}</span>
        <span class="font-semibold tabular-nums text-slate-900 dark:text-white">${used.toLocaleString('en-IN')}${unit}</span><span class="text-xs text-slate-400">/ ${max === Infinity ? 'Unlimited' : max.toLocaleString('en-IN') + unit}</span></div>${bar(pct, t_)}</div>`;
    };
    const cancelling = s.status === 'cancelling';
    c.innerHTML = `<div class="fade-in space-y-5">
      ${cancelling ? note('amber', 'calendar-x', `Your subscription is set to end on <b>${fmtDate(s.renews)}</b>. Everything keeps working until then, and your data stays exportable for 90 days after. <button class="font-semibold underline" data-pg="sub-resume">Resume subscription</button>`) : ''}
      <div class="grid gap-5 xl:grid-cols-3">
        <section class="relative overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-600 to-teal-800 p-6 text-white shadow-card xl:col-span-2 dark:border-teal-500/30">
          <div class="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10"></div><div class="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/5"></div>
          <div class="relative flex flex-wrap items-start gap-4">
            <span class="grid h-12 w-12 place-items-center rounded-xl bg-white/15">${ico('gem', 'h-6 w-6')}</span>
            <div class="min-w-0 flex-1"><p class="text-xs font-semibold uppercase tracking-wider text-teal-100">Current plan</p>
              <p class="text-2xl font-bold">${esc(PLANS[plan].label)}</p>
              <p class="mt-0.5 text-sm text-teal-100">${inr(price)} / ${s.cycle === 'yearly' ? 'year' : 'month'} + GST · customer since ${fmtDate(s.since)}</p></div>
            <span class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">${ico(cancelling ? 'calendar-x' : 'circle-check', 'h-3.5 w-3.5')}${cancelling ? 'Ends ' + fmtDate(s.renews) : 'Active'}</span>
          </div>
          <div class="relative mt-6 grid gap-4 sm:grid-cols-3">
            ${[['calendar-clock', cancelling ? 'Access until' : 'Renews on', fmtDate(s.renews), `${daysLeft} days left`], ['credit-card', 'Pays with', `${esc(s.card.brand)} •••• ${esc(s.card.last4)}`, 'Expires ' + esc(s.card.exp)],
              ['receipt', 'Next invoice', cancelling ? '—' : inr(price * 1.18), cancelling ? 'No further charges' : 'incl. 18% GST']].map(([i, l, v, x]) =>
              `<div class="rounded-xl bg-white/10 p-3"><p class="flex items-center gap-1.5 text-xs text-teal-100">${ico(i, 'h-3.5 w-3.5')}${l}</p><p class="mt-1 font-semibold">${v}</p><p class="text-[11px] text-teal-100/80">${x}</p></div>`).join('')}
          </div>
          <div class="relative mt-5 flex flex-wrap items-center gap-2">
            <button class="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3.5 text-sm font-semibold text-teal-800 hover:bg-teal-50" data-pg="sub-card">${ico('credit-card')}Update payment method</button>
            <button class="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-3.5 text-sm font-semibold hover:bg-white/25" data-pg="sub-cycle-switch">${ico('repeat')}Switch to ${s.cycle === 'yearly' ? 'monthly' : 'yearly'} billing</button>
            <span class="flex-1"></span>
            <label class="inline-flex items-center gap-2 text-sm text-teal-50">Auto-renew ${sw(s.autoRenew && !cancelling, `data-pg="sub-autorenew" ${cancelling ? 'disabled' : ''}`)}</label>
          </div>
        </section>
        <section class="${card} p-6">
          <h3 class="font-semibold text-slate-900 dark:text-white">Usage this cycle</h3><p class="mb-5 text-xs text-slate-500 dark:text-slate-400">Limits of ${esc(PLANS[plan].label)}</p>
          <div class="space-y-4">
            ${meter('key-round', 'Staff logins', s.usage.users, lim.users)}
            ${meter('git-branch', 'Branches', t.branches.length, lim.branches)}
            ${meter('users', 'Patients', s.usage.patients, lim.patients)}
            ${meter('hard-drive', 'Records storage', s.usage.storage, lim.storage, ' GB')}
            ${meter('message-circle', 'WhatsApp messages', s.usage.wa, s.credits.wa)}
          </div>
          <div class="mt-5">${btn('soft', 'Buy message credits', 'plus', 'data-pg="sub-addon"', 'h-9 px-3.5 w-full')}</div>
        </section>
      </div>

      <section class="${card}">
        ${cardHead('Plans', 'Upgrade any time — you only pay the prorated difference. Downgrades apply at renewal.', seg('subCycle', [['monthly', 'Monthly'], ['yearly', 'Yearly · save 17%']], cyc))}
        <div class="grid gap-4 p-5 md:grid-cols-3">${PLAN_CARDS.map(pc => {
          const cur = pc.key === plan, ent = pc.key === 'enterprise', pr = ent ? null : PRICE[pc.key][cyc];
          return `<article class="relative flex flex-col rounded-2xl border p-5 transition ${cur ? 'border-teal-500 ring-4 ring-teal-500/10' : 'border-slate-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700'}">
            ${pc.popular ? `<span class="absolute -top-2.5 right-4 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-950">Most popular</span>` : ''}
            <div class="flex items-center gap-3"><span class="grid h-10 w-10 place-items-center rounded-xl ${K.tone(pc.tone)}">${ico(pc.icon)}</span>
              <div><p class="font-semibold text-slate-900 dark:text-white">${ent ? 'Enterprise' : esc(PLANS[pc.key].label)}</p><p class="text-xs text-slate-500 dark:text-slate-400">${pc.tag}</p></div></div>
            <p class="mt-4"><span class="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">${ent ? 'Custom' : inr(pr)}</span>${ent ? '' : `<span class="text-sm text-slate-500"> / ${cyc === 'yearly' ? 'year' : 'month'}</span>`}</p>
            <p class="text-[11px] text-slate-400">${ent ? 'Volume pricing per bed' : `+ GST${cyc === 'yearly' ? ` · ${inr(pr / 12)}/mo effective` : ''}`}</p>
            <ul class="mt-4 flex-1 space-y-2">${pc.feats.map(f => `<li class="flex gap-2 text-[13px] text-slate-600 dark:text-slate-300">${ico('check', 'mt-0.5 h-4 w-4 shrink-0 text-emerald-600')}${f}</li>`).join('')}</ul>
            <div class="mt-5">${cur && cyc === s.cycle ? btn('ghost', 'Current plan', 'circle-check', 'disabled', 'h-10 px-4 w-full opacity-70')
              : ent ? btn('ghost', 'Talk to sales', 'phone', 'data-pg="sub-sales"', 'h-10 px-4 w-full')
              : btn(pc.key === 'pro' && plan !== 'pro' ? 'primary' : 'ghost', cur ? `Switch to ${cyc}` : pc.key === 'pro' ? 'Upgrade' : 'Downgrade', cur ? 'repeat' : pc.key === 'pro' ? 'arrow-up-right' : 'arrow-down-right', `data-pg="sub-change" data-plan="${pc.key}" data-cycle="${cyc}"`, 'h-10 px-4 w-full')}</div>
          </article>`; }).join('')}</div>
      </section>

      <section class="${card}">
        ${cardHead('Subscription invoices', `GST invoices from the HMS platform to ${esc(a.account.org.legal || t.name)}. GSTIN on invoice: <span class="font-mono">${esc(a.account.org.gstin || '—')}</span>`, btn('ghost', 'Billing address', 'map-pin', 'data-nav="account"'))}
        ${table(['Invoice', 'Date', 'Period', 'Plan', 'Paid with', 'Amount', ''], s.invoices.map(iv => `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
          ${td0(`<span class="font-mono text-[13px] font-semibold">${iv.id}</span>`)}${td(fmtDate(iv.date))}${td(esc(iv.period))}${td(esc(iv.plan))}${td(`<span class="text-xs">${esc(iv.method)}</span>`)}
          ${td(`<span class="font-semibold tabular-nums">${inr(iv.amount + iv.gst)}</span><span class="block text-[11px] text-slate-400">incl. GST ${inr(iv.gst)}</span>`, 'text-right')}
          ${td(`<div class="flex items-center justify-end gap-2">${badge('emerald', 'Paid', 'check')}${iconBtn('download', 'Download invoice', `data-pg="sub-inv" data-id="${iv.id}"`)}</div>`, 'pr-5')}</tr>`).join(''), { min: '760px' })}
      </section>

      <div class="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-slate-300 p-5 dark:border-slate-700">
        <div class="min-w-0 flex-1"><p class="font-semibold text-slate-900 dark:text-white">Cancel subscription</p><p class="text-sm text-slate-500 dark:text-slate-400">You keep access until the end of the paid period. Patient records stay exportable for 90 days (DPDP).</p></div>
        ${cancelling ? btn('primary', 'Resume subscription', 'rotate-ccw', 'data-pg="sub-resume"') : `<button class="h-9 rounded-xl border border-rose-200 px-3.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10" data-pg="sub-cancel">Cancel subscription</button>`}
      </div>
    </div>`;
  }

  on('sub-autorenew', el => { const s = A().sub; s.autoRenew = !s.autoRenew; el.setAttribute('aria-checked', s.autoRenew);
    audit('repeat', 'teal', `<b>${who()}</b> turned auto-renew ${s.autoRenew ? 'on' : 'off'}`);
    toast(s.autoRenew ? 'Auto-renew on' : 'Auto-renew off', s.autoRenew ? `We’ll charge ${s.card.brand} •••• ${s.card.last4} on ${fmtDate(s.renews)}` : 'You’ll get reminders 15, 7 and 1 day before renewal', 'teal', 'repeat'); });
  on('sub-sales', () => toast('Request sent', 'An account manager will call the admin within one working day.', 'violet', 'phone'));
  on('sub-cycle-switch', el => { const s = A().sub; changePlan(T().plan, s.cycle === 'yearly' ? 'monthly' : 'yearly'); });
  on('sub-change', el => changePlan(el.dataset.plan, el.dataset.cycle));

  function changePlan(to, cycle) {
    const t = T(), s = A().sub, from = t.plan, up = to === 'pro' && from !== 'pro';
    const newPrice = PRICE[to][cycle], oldPrice = PRICE[from][s.cycle];
    const daysLeft = Math.max(1, Math.round((new Date(s.renews) - new Date()) / 86400000)), span = s.cycle === 'yearly' ? 365 : 30;
    const credit = Math.round(oldPrice * Math.min(1, daysLeft / span));
    const due = up || cycle !== s.cycle ? Math.max(0, newPrice - credit) : 0, gst = Math.round(due * 0.18);
    const row = (k, v, b) => `<div class="flex justify-between py-1.5 text-sm ${b ? 'border-t border-slate-200 pt-3 font-semibold dark:border-slate-700' : ''}"><span class="${b ? '' : 'text-slate-500 dark:text-slate-400'}">${k}</span><span class="tabular-nums">${v}</span></div>`;
    const warn = !up && to === 'starter' && t.branches.length > 1 ? note('amber', 'triangle-alert', `Clinic Starter allows 1 branch — you have ${t.branches.length}. Extra branches become read-only, and modules outside the plan (lab, pharmacy, IPD, HR…) are hidden. No data is deleted.`) : '';
    modal({ title: up ? 'Upgrade plan' : to === from ? 'Change billing cycle' : 'Downgrade plan', icon: up ? 'arrow-up-right' : 'repeat', sub: `${PLANS[from].label} (${s.cycle}) → <b>${PLANS[to].label} (${cycle})</b>`, size: 'max-w-md',
      body: `<div class="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
          ${row(`${PLANS[to].label} · ${cycle}`, inr(newPrice))}${row(`Unused ${PLANS[from].label} (${daysLeft} days)`, '− ' + inr(credit))}${row('GST 18%', inr(gst))}${row(due ? 'Charged today' : 'Due today', inr(due + gst), true)}</div>
        <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">${due ? `Charged to ${esc(s.card.brand)} •••• ${esc(s.card.last4)}. A GST invoice is emailed to the billing contact.` : 'Takes effect now; the new price applies from your next renewal.'}</p>${warn ? `<div class="mt-3">${warn}</div>` : ''}`,
      ok: due ? `Pay ${inr(due + gst)} & ${up ? 'upgrade' : 'switch'}` : 'Confirm change',
      onSubmit: () => {
        runSteps({ title: up ? 'Upgrading your plan' : 'Updating subscription', icon: 'gem',
          steps: [ 'Calculating prorated amount', ...(due ? [`Charging ${s.card.brand} •••• ${s.card.last4}`, 'Waiting for bank confirmation (3-D Secure)'] : []), 'Generating GST invoice', `Applying ${PLANS[to].label} modules & limits`, 'Refreshing menus for all signed-in staff' ],
          done: { title: `You’re on ${PLANS[to].label}`, text: `${cycle === 'yearly' ? 'Yearly' : 'Monthly'} billing · ${LIMITS[to].branches} branch${LIMITS[to].branches > 1 ? 'es' : ''}, ${LIMITS[to].users} staff logins. New modules appear in the menu now.` },
          onDone: () => {
            t.plan = to; s.cycle = cycle; H().state.plan = to; H().state.modules = new Set(PLANS[to].modules);
            const next = new Date(); cycle === 'yearly' ? next.setFullYear(next.getFullYear() + 1) : next.setMonth(next.getMonth() + 1); s.renews = iso(next); s.status = 'active';
            if (due) s.invoices.unshift({ id: `HMS-${next.getFullYear()}-${String(2000 + s.invoices.length).padStart(5, '0')}`, date: iso(new Date()), period: 'Prorated change', plan: PLANS[to].label, amount: due, gst, status: 'paid', method: `${s.card.brand} •••• ${s.card.last4}` });
            ui.subCycle = cycle;
            audit('gem', 'teal', `<b>${who()}</b> changed the plan: ${esc(PLANS[from].label)} → <b>${esc(PLANS[to].label)}</b> (${cycle})`);
            H().refresh(false);
          } });
        return false;
      } });
  }

  on('sub-card', () => {
    const ex = { cname: 'Sun Hospital Pvt Ltd', cnum: '4111 1111 1111 1111', cexp: '12/29', ccvc: '123' };
    modal({ title: 'Update payment method', icon: 'credit-card', sub: 'Used for the HMS subscription only — not for patient payments.', size: 'max-w-md', ok: 'Save card',
      body: `<div class="mb-4 flex items-center justify-between gap-2"><span class="text-xs text-slate-500">Test card shown when autofilled</span>${autofillBtn('data-pg="card-fill"')}</div>
        <div class="grid gap-4 sm:grid-cols-2">${field('cname', 'Name on card', { req: true, full: true, ph: 'As printed on the card' })}
        ${field('cnum', 'Card number', { req: true, full: true, mono: true, ph: '1234 5678 9012 3456' })}${field('cexp', 'Expiry (MM/YY)', { req: true, mono: true, ph: 'MM/YY' })}${field('ccvc', 'CVC', { req: true, mono: true, ph: '•••', type: 'password' })}</div>
        <div class="mt-4">${note('sky', 'lock', 'Card details go straight to the payment processor and are tokenised (RBI card-on-file rules). HMS never stores the full number or CVC.')}</div>
        <label class="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" name="mandate" checked class="h-4 w-4 rounded border-slate-300 text-teal-600"> Set up an e-mandate for auto-renewal</label>`,
      onSubmit: f => {
        const v = readForm(f, ['cname', 'cnum', 'cexp', 'ccvc']); if (!v) return false;
        const num = v.cnum.replace(/\s/g, '');
        if (!/^\d{15,16}$/.test(num)) { setErr(f, 'cnum', 'Enter a 15–16 digit card number'); return false; }
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(v.cexp)) { setErr(f, 'cexp', 'Use MM/YY'); return false; }
        if (!/^\d{3,4}$/.test(v.ccvc)) { setErr(f, 'ccvc', '3 or 4 digits'); return false; }
        const brand = num[0] === '4' ? 'Visa' : num[0] === '5' ? 'Mastercard' : num[0] === '3' ? 'Amex' : num[0] === '6' ? 'RuPay' : 'Card';
        runSteps({ title: 'Saving card', icon: 'credit-card', steps: ['Tokenising card with the network', 'Running 3-D Secure check', ...(v.mandate ? ['Registering e-mandate (up to ₹1,50,000)'] : []), 'Updating subscription billing'],
          done: { title: 'Card saved', text: `${brand} •••• ${num.slice(-4)} will be charged on ${fmtDate(A().sub.renews)}.` },
          onDone: () => { A().sub.card = { brand, last4: num.slice(-4), exp: v.cexp, name: v.cname }; audit('credit-card', 'teal', `<b>${who()}</b> updated the subscription card to ${brand} •••• ${num.slice(-4)}`); } });
        return false;
      } });
  });
  on('card-fill', () => { const f = $('#pgForm'); fillForm(f, { cname: A().account.org.legal || T().name, cnum: '4111 1111 1111 1111', cexp: '12/29', ccvc: '123' }); toast('Example card filled', 'A standard test card — nothing is charged in the demo.', 'amber', 'wand-sparkles'); });

  on('sub-addon', () => {
    const packs = [['wa', 5000, 'WhatsApp messages', 2500, 'message-circle'], ['wa', 25000, 'WhatsApp messages', 10000, 'message-circle'], ['sms', 10000, 'SMS', 1800, 'smartphone'], ['sms', 50000, 'SMS', 7500, 'smartphone']];
    modal({ title: 'Buy message credits', icon: 'message-circle', size: 'max-w-md', ok: 'Buy pack',
      body: `<div class="space-y-2">${packs.map(([k, n, l, p, i], idx) => `<label class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50/60 dark:border-slate-700 dark:has-[:checked]:bg-teal-500/10">
        <input type="radio" name="pack" value="${idx}" ${idx === 0 ? 'checked' : ''} class="h-4 w-4 text-teal-600">${ico(i, 'h-4 w-4 text-slate-400')}<span class="flex-1 text-sm font-medium">${n.toLocaleString('en-IN')} ${l}</span><span class="text-sm font-semibold tabular-nums">${inr(p)}</span></label>`).join('')}</div>
        <p class="mt-3 text-xs text-slate-500">+ 18% GST · credits never expire · charged to ${esc(A().sub.card.brand)} •••• ${esc(A().sub.card.last4)}</p>`,
      onSubmit: f => {
        const [k, n, l, p] = packs[+new FormData(f).get('pack')];
        runSteps({ title: 'Buying credits', icon: 'message-circle', steps: [`Charging ${inr(p * 1.18)}`, 'Generating GST invoice', `Adding ${n.toLocaleString('en-IN')} ${l} credits`],
          done: { title: 'Credits added', text: `${n.toLocaleString('en-IN')} ${l} are ready to use in Communication.` },
          onDone: () => { A().sub.credits[k] += n; audit('message-circle', 'teal', `<b>${who()}</b> bought ${n.toLocaleString('en-IN')} ${esc(l)} credits`); } });
        return false;
      } });
  });

  on('sub-cancel', () => H().confirmDialog({ title: 'Cancel your HMS subscription?', icon: 'calendar-x', ok: 'Cancel at period end',
    text: `Nothing stops today. Access continues until ${fmtDate(A().sub.renews)}, then sign-ins are paused. You can export all patient records for 90 days.`,
    onOk: () => { const s = A().sub; s.status = 'cancelling'; s.autoRenew = false; audit('calendar-x', 'rose', `<b>${who()}</b> scheduled the subscription to end on ${fmtDate(s.renews)}`); toast('Cancellation scheduled', 'You can resume any time before ' + fmtDate(s.renews), 'amber', 'calendar-x'); rerender(); } }));
  on('sub-resume', () => { const s = A().sub; s.status = 'active'; s.autoRenew = true; audit('rotate-ccw', 'emerald', `<b>${who()}</b> resumed the subscription`); toast('Subscription resumed', 'Auto-renew is back on', 'emerald', 'rotate-ccw'); rerender(); });

  on('sub-inv', el => {
    const iv = A().sub.invoices.find(x => x.id === el.dataset.id), a = A().account, w = window.open('', '_blank', 'width=720,height=860');
    if (!w) return toast('Pop-up blocked', 'Allow pop-ups to open the invoice.', 'amber', 'download');
    const addr = [a.contact.line1, a.contact.line2, a.contact.city, a.contact.state, a.contact.pin].filter(Boolean).map(esc).join(', ');
    w.document.write(`<!doctype html><meta charset="utf-8"><title>${iv.id}</title><body style="font-family:system-ui,sans-serif;padding:40px;color:#0f172a;max-width:640px;margin:auto">
      <div style="display:flex;justify-content:space-between;align-items:start"><div><h2 style="margin:0;color:#0f766e">HMS Cloud</h2><p style="color:#64748b;margin:4px 0">Tax invoice · SAC 998314</p></div>
      <div style="text-align:right"><b>${iv.id}</b><br><span style="color:#64748b">${fmtDate(iv.date)}</span></div></div><hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0">
      <p style="margin:0;color:#64748b;font-size:13px">Billed to</p><p style="margin:4px 0"><b>${esc(a.org.legal || T().name)}</b><br>${addr || '—'}<br>GSTIN ${esc(a.org.gstin || '—')}</p>
      <table cellpadding="10" style="width:100%;border-collapse:collapse;margin-top:24px;font-size:14px"><tr style="background:#f1f5f9;text-align:left"><th>Description</th><th style="text-align:right">Amount</th></tr>
      <tr><td>${esc(iv.plan)} — ${esc(iv.period)}</td><td style="text-align:right">${inr(iv.amount)}</td></tr><tr><td>IGST 18%</td><td style="text-align:right">${inr(iv.gst)}</td></tr>
      <tr style="border-top:2px solid #0f172a"><td><b>Total</b></td><td style="text-align:right"><b>${inr(iv.amount + iv.gst)}</b></td></tr></table>
      <p style="color:#64748b;font-size:13px;margin-top:24px">Paid with ${esc(iv.method)}. Sample invoice from the HMS demo.</p></body>`);
    w.document.close(); w.focus(); w.print();
  });

  /* =========================================================================
   * 2) Account details
   * ========================================================================= */
  const STATES = ['West Bengal', 'Maharashtra', 'Karnataka', 'Delhi', 'Tamil Nadu', 'Telangana', 'Gujarat', 'Uttar Pradesh', 'Kerala', 'Odisha', 'Bihar', 'Assam'];
  const ACC_TABS = [['org', 'Organisation', 'building-2'], ['contact', 'Billing contact & address', 'map-pin'], ['bank', 'Bank & settlements', 'landmark'], ['owner', 'Owner account', 'user-cog']];
  const EXAMPLE = {
    org: { legal: 'Sun Hospital Private Limited', brand: 'Sun Hospital', type: 'Private Limited', pan: 'AABCS1429B', gstin: '19AABCS1429B1Z5', cin: 'U85110WB2014PTC203381', reg: 'WB/CE/2014/00382', website: 'https://sunhospital.in' },
    contact: { name: 'Priya Banerjee', designation: 'Finance Manager', email: 'accounts@sunhospital.in', phone: '9830012345', alt: '03340123400', line1: '14, Lake View Road', line2: 'Near Rabindra Sarobar', city: 'Kolkata', state: 'West Bengal', pin: '700029' },
    bank: { holder: 'Sun Hospital Private Limited', number: '50200012345678', confirm: '50200012345678', ifsc: 'HDFC0000052', type: 'Current' },
    owner: { name: 'Dr. Anita Sen', email: 'anita.sen@sunhospital.in', phone: '9830098300' },
  };
  const IFSC_BANK = { HDFC: 'HDFC Bank', ICIC: 'ICICI Bank', SBIN: 'State Bank of India', UTIB: 'Axis Bank', KKBK: 'Kotak Mahindra Bank', PUNB: 'Punjab National Bank', BARB: 'Bank of Baroda', YESB: 'Yes Bank', IDIB: 'Indian Bank' };

  const DOCS = [['pan', 'PAN card', 'id-card', true], ['gst', 'GST registration certificate', 'file-badge', true], ['cheque', 'Cancelled cheque', 'landmark', true],
    ['cert', 'Clinical establishment certificate', 'file-check', true], ['nabh', 'NABH accreditation', 'award', false]];
  const DOC_ST = { verified: ['Verified', 'emerald', 'badge-check'], review: ['In review', 'amber', 'hourglass'], missing: ['Missing', 'slate', 'circle-dashed'] };

  function accChecks(a) {
    return [
      ['org', 'PAN & GSTIN', 'id-card', !!(a.org.pan && a.org.gstin)],
      ['contact', 'Billing address', 'map-pin', !!(a.contact.line1 && a.contact.email && a.contact.pin)],
      ['bank', 'Bank verified', 'landmark', !!a.bank.verified],
      ['docs', 'KYC documents', 'files', DOCS.filter(d => d[3]).every(d => a.docs[d[0]].status === 'verified')],
      ['owner', 'Owner 2FA', 'shield-check', !!a.owner.twofa],
    ];
  }
  function accCompleteness(a) {
    const need = [a.org.legal, a.org.pan, a.org.gstin, a.contact.name, a.contact.email, a.contact.phone, a.contact.line1, a.contact.pin, a.bank.number, a.bank.ifsc, a.bank.verified, a.owner.twofa,
      ...DOCS.filter(d => d[3]).map(d => a.docs[d[0]].status === 'verified')];
    return Math.round(need.filter(Boolean).length / need.length * 100);
  }
  const when = d => { const x = new Date(d), m = Math.round((Date.now() - x) / 60000); return m < 1 ? 'Just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : fmtDate(x); };

  function renderAccount(c) {
    const t = T(), a = A().account, pct = accCompleteness(a), checks = accChecks(a), ed = ui.accEdit;
    const kv = (label, val, o = {}) => `<div class="${o.full ? 'sm:col-span-2' : ''}"><dt class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">${label}</dt>
      <dd class="mt-1 flex min-w-0 items-center gap-1 text-sm font-medium text-slate-900 dark:text-white ${o.mono ? 'font-mono' : ''}">${val ? `<span class="min-w-0 break-words">${val}</span>` : '<span class="font-normal italic text-slate-400">Not added</span>'}
      ${val && o.copy ? iconBtn('copy', 'Copy ' + label, `data-pg="gw-copy" data-v="${esc(o.copy)}"`) : ''}${val && o.badge ? o.badge : ''}</dd></div>`;
    const grid = inner => `<dl class="grid gap-x-8 gap-y-5 sm:grid-cols-2">${inner}</dl>`;
    const saveBtn = (icon, label) => `<button type="submit" class="inline-flex h-10 items-center gap-1.5 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">${ico(icon)}${label}</button>`;
    const section = (sec, icon, tn, title, sub, status, view, form, submit) => {
      const editing = ed === sec;
      return `<section id="acc-${sec}" class="${card} scroll-mt-24 overflow-hidden transition ${editing ? 'ring-2 ring-teal-500/40' : ''}">
        <header class="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6 dark:border-slate-800">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl ${K.tone(tn)}">${ico(icon)}</span>
          <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><h3 class="font-semibold text-slate-900 dark:text-white">${title}</h3>${status}</div>
            <p class="text-xs text-slate-500 dark:text-slate-400">${sub}</p></div>
          ${editing ? autofillBtn('data-pg="acc-fill"') : btn('ghost', 'Edit', 'pencil', `data-pg="acc-edit" data-sec="${sec}"`, 'h-8 px-3')}
        </header>
        ${editing ? `<form id="accForm" data-tab="${sec}" novalidate><div class="step-in p-5 sm:p-6">${form}</div>
            <div class="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6 dark:border-slate-800 dark:bg-slate-800/30">
              ${btn('ghost', 'Cancel', '', 'data-pg="acc-discard"', 'h-10 px-4')}${submit}</div></form>`
          : `<div class="p-5 sm:p-6">${view}</div>`}
      </section>`;
    };
    const ok = (txt = 'Complete') => badge('emerald', txt, 'check'), todo = txt => badge('amber', txt, 'circle-alert');

    /* hero */
    const R = 26, C = 2 * Math.PI * R;
    const pill = (on_, icon, txt) => `<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${on_ ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}">${ico(on_ ? icon : 'circle-dashed', 'h-3 w-3')}${txt}</span>`;
    const hero = `<section class="${card} overflow-hidden">
      <div class="relative h-28 bg-gradient-to-r from-teal-700 via-teal-600 to-sky-600 sm:h-32">
        <div class="absolute inset-0 opacity-25" style="background-image:radial-gradient(rgba(255,255,255,.55) 1px,transparent 1px);background-size:18px 18px"></div>
        <div class="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10"></div>
        <span class="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-mono text-xs text-white backdrop-blur">${ico('globe', 'h-3.5 w-3.5')}${esc(t.slug)}.hms.com</span>
      </div>
      <div class="flex flex-wrap items-end gap-x-5 gap-y-4 px-5 pb-5 sm:px-6">
        <div class="relative -mt-10 shrink-0">
          <div class="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl bg-white text-2xl font-extrabold text-teal-700 shadow-lg ring-4 ring-white dark:bg-slate-800 dark:text-teal-300 dark:ring-slate-900">
            ${a.org.logo ? `<img src="${esc(a.org.logo)}" alt="Hospital logo" class="h-full w-full object-cover">` : esc(K.initials(a.org.brand || t.name))}</div>
          <label class="absolute -bottom-1.5 -right-1.5 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-teal-600 text-white shadow ring-4 ring-white transition hover:bg-teal-700 dark:ring-slate-900" title="Change logo">
            ${ico('camera', 'h-4 w-4')}<input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" class="sr-only" data-pg-change="acc-logo" aria-label="Upload logo"></label>
        </div>
        <div class="min-w-[220px] flex-1 pt-1">
          <h2 class=" text-xl font-bold tracking-tight text-slate-900 dark:text-white">${esc(a.org.legal || t.name)}</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400">${esc(a.org.brand || t.name)} · ${esc(a.org.type)} · customer since ${fmtDate(A().sub.since)}</p>
          <div class="mt-2.5 flex flex-wrap gap-1.5">${pill(!!a.org.pan, 'badge-check', 'PAN')}${pill(!!a.org.gstin, 'badge-check', 'GST registered')}${pill(a.bank.verified, 'landmark', 'Bank verified')}${pill(a.owner.twofa, 'shield-check', '2FA on')}</div>
        </div>
        <div class="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
          <svg viewBox="0 0 64 64" class="h-14 w-14 -rotate-90"><circle cx="32" cy="32" r="${R}" fill="none" stroke="currentColor" stroke-width="6" class="text-slate-200 dark:text-slate-700"/>
            <circle cx="32" cy="32" r="${R}" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" class="${pct === 100 ? 'text-emerald-500' : 'text-teal-500'} transition-all duration-700" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}"/></svg>
          <div><p class="text-lg font-bold tabular-nums text-slate-900 dark:text-white">${pct}%</p><p class="text-xs text-slate-500 dark:text-slate-400">${pct === 100 ? 'All verified' : 'Profile complete'}</p></div>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-5 dark:border-slate-800 dark:bg-slate-800">
        ${checks.map(([k, l, i, done]) => `<button type="button" class="group flex items-center gap-2.5 bg-white px-4 py-3 text-left transition hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60" data-pg="acc-edit" data-sec="${k}">
          <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full ${done ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'}">${ico(done ? 'check' : i, 'h-3.5 w-3.5')}</span>
          <span class="min-w-0"><span class="block truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">${l}</span><span class="block text-[11px] ${done ? 'text-emerald-600' : 'text-amber-600'}">${done ? 'Done' : 'Action needed →'}</span></span></button>`).join('')}
      </div></section>`;

    /* sections */
    const org = section('org', 'building-2', 'teal', 'Organisation', 'Legal identity printed on every bill, receipt and invoice', a.org.pan && a.org.gstin ? ok('Verified') : todo('PAN / GST missing'),
      grid(kv('Legal entity name', esc(a.org.legal), { full: true }) + kv('Display name', esc(a.org.brand)) + kv('Business type', esc(a.org.type))
        + kv('PAN', esc(a.org.pan), { mono: true, copy: a.org.pan }) + kv('GSTIN', esc(a.org.gstin), { mono: true, copy: a.org.gstin, badge: a.org.gstin ? badge('emerald', 'Active') : '' })
        + kv('CIN / LLPIN', esc(a.org.cin), { mono: true }) + kv('Clinical establishment reg.', esc(a.org.reg), { mono: true })
        + kv('Website', a.org.website ? `<a href="${esc(a.org.website)}" target="_blank" rel="noopener" class="text-teal-700 hover:underline dark:text-teal-400">${esc(a.org.website.replace(/^https?:\/\//, ''))}</a>` : '', { full: true })),
      `<div class="grid gap-4 sm:grid-cols-2">
        ${field('legal', 'Legal entity name', { req: true, full: true, value: a.org.legal, help: 'Exactly as on the PAN / GST certificate.' })}
        ${field('brand', 'Display name', { req: true, value: a.org.brand, help: 'Shown to patients' })}
        ${field('type', 'Business type', { opts: ['Private Limited', 'LLP', 'Partnership', 'Proprietorship', 'Trust / Society', 'Government'], value: a.org.type })}
        ${field('pan', 'PAN', { req: true, mono: true, value: a.org.pan, ph: 'AAAAA9999A' })}${field('gstin', 'GSTIN', { req: true, mono: true, value: a.org.gstin, ph: '19AAAAA9999A1Z5' })}
        ${field('cin', 'CIN / LLPIN', { mono: true, value: a.org.cin, ph: 'Optional for proprietorships' })}${field('reg', 'Clinical establishment reg. no.', { mono: true, value: a.org.reg })}
        ${field('website', 'Website', { full: true, value: a.org.website, ph: 'https://' })}</div>`, saveBtn('save', 'Save & verify'));

    const addr = [a.contact.line1, a.contact.line2, a.contact.city, a.contact.state, a.contact.pin].filter(Boolean).map(esc).join(', ');
    const contact = section('contact', 'map-pin', 'sky', 'Billing contact & address', 'Where HMS sends subscription invoices and payment alerts', a.contact.line1 && a.contact.email ? ok() : todo('Incomplete'),
      `<div class="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">${grid(
        kv('Contact person', a.contact.name ? `${esc(a.contact.name)}${a.contact.designation ? `<span class="font-normal text-slate-500"> · ${esc(a.contact.designation)}</span>` : ''}` : '')
        + kv('Billing email', esc(a.contact.email), { copy: a.contact.email, full: true }) + kv('Mobile', a.contact.phone ? '+91 ' + esc(a.contact.phone) : '') + kv('Landline', esc(a.contact.alt))
        + kv('Address', addr, { full: true }))}
        <div class="relative hidden overflow-hidden rounded-xl border border-slate-200 bg-slate-50 md:block dark:border-slate-700 dark:bg-slate-800/60">
          <div class="absolute inset-0 opacity-60" style="background-image:linear-gradient(rgba(148,163,184,.25) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.25) 1px,transparent 1px);background-size:22px 22px"></div>
          <div class="absolute left-[-10%] top-[45%] h-3 w-[120%] -rotate-12 bg-white/90 dark:bg-slate-700"></div><div class="absolute left-[55%] top-[-10%] h-[120%] w-3 rotate-6 bg-white/90 dark:bg-slate-700"></div>
          <div class="relative grid h-full min-h-[140px] place-items-center"><span class="grid h-10 w-10 place-items-center rounded-full bg-teal-600 text-white shadow-lg ring-8 ring-teal-500/20">${ico('map-pin', 'h-5 w-5')}</span></div>
          <p class="absolute inset-x-0 bottom-0 bg-white/90 px-3 py-1.5 text-center text-[11px] font-medium text-slate-600 dark:bg-slate-900/90 dark:text-slate-300">${esc(a.contact.city || '—')}${a.contact.pin ? ' · ' + esc(a.contact.pin) : ''}</p></div></div>`,
      `<div class="grid gap-4 sm:grid-cols-2">
        ${field('name', 'Contact person', { req: true, value: a.contact.name })}${field('designation', 'Designation', { value: a.contact.designation, ph: 'e.g. Finance Manager' })}
        ${field('email', 'Billing email', { req: true, type: 'email', value: a.contact.email })}${field('phone', 'Mobile', { req: true, type: 'tel', value: a.contact.phone, ph: '10-digit mobile' })}
        ${field('alt', 'Landline / alternate', { type: 'tel', value: a.contact.alt })}<span class="hidden sm:block"></span>
        ${field('line1', 'Address line 1', { req: true, full: true, value: a.contact.line1 })}${field('line2', 'Address line 2', { full: true, value: a.contact.line2 })}
        ${field('city', 'City', { req: true, value: a.contact.city })}${field('state', 'State', { opts: STATES, value: a.contact.state, help: 'Decides CGST+SGST vs IGST' })}
        ${field('pin', 'PIN code', { req: true, mono: true, value: a.contact.pin, ph: '700029' })}</div>`, saveBtn('save', 'Save address'));

    const gwOn = Object.values(A().gw).filter(g => g.status === 'on').length;
    const bankView = a.bank.number ? `<div class="grid gap-6 md:grid-cols-[300px_minmax(0,1fr)]">
        <div class="relative aspect-[1.7] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-5 text-white shadow-xl">
          <div class="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal-500/20"></div><div class="absolute -bottom-12 left-10 h-32 w-32 rounded-full bg-sky-500/10"></div>
          <div class="relative flex h-full flex-col">
            <div class="flex items-start justify-between gap-2"><div><p class="text-[10px] uppercase tracking-[.2em] text-slate-400">Settlement account</p><p class="mt-1 font-semibold">${esc(a.bank.bank)}</p></div>
              ${a.bank.verified ? `<span class="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">${ico('badge-check', 'h-3 w-3')}Verified</span>` : ''}</div>
            <p class="mt-auto font-mono text-lg tracking-[.18em]">•••• •••• ${esc(a.bank.number.slice(-4))}</p>
            <div class="mt-3 flex items-end justify-between gap-3 text-xs"><div class="min-w-0"><p class="text-slate-400">Account holder</p><p class="truncate font-medium">${esc(a.bank.holder)}</p></div>
              <div class="text-right"><p class="text-slate-400">IFSC</p><p class="font-mono">${esc(a.bank.ifsc)}</p></div></div></div></div>
        ${grid(kv('Account type', esc(a.bank.type)) + kv('Branch', esc(a.bank.branch)) + kv('Verified on', a.bank.verified ? fmtDate(a.bank.verifiedAt) + ' · ₹1 penny drop' : '')
          + kv('Payout schedule', 'T+2 working days · daily') + kv('Gateways settling here', gwOn ? `${gwOn} connected` : '') + kv('Name match', a.bank.verified ? '<span class="text-emerald-600">100% — matches legal name</span>' : ''))}</div>`
      : `<div class="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center dark:border-slate-700">${ico('landmark', 'mx-auto h-8 w-8 text-slate-300')}
          <p class="mt-3 font-semibold text-slate-900 dark:text-white">No bank account yet</p><p class="mx-auto mt-1 max-w-sm text-sm text-slate-500">Gateways hold your money until a current account in the hospital’s legal name is verified.</p>
          <div class="mt-4">${btn('primary', 'Add bank account', 'plus', 'data-pg="acc-edit" data-sec="bank"')}</div></div>`;
    const bank = section('bank', 'landmark', 'emerald', 'Bank & settlements', 'Where gateways pay out patient collections', a.bank.verified ? ok('Verified') : todo('Not verified'), bankView,
      `<div class="grid gap-4 sm:grid-cols-2">
        ${field('holder', 'Account holder name', { req: true, full: true, value: a.bank.holder, help: 'Must match the legal entity name' })}
        ${field('number', 'Account number', { req: true, mono: true, value: a.bank.number, type: 'password' })}${field('confirm', 'Confirm account number', { req: true, mono: true, value: a.bank.number })}
        ${field('ifsc', 'IFSC', { req: true, mono: true, value: a.bank.ifsc, ph: 'HDFC0000052', help: 'Bank and branch are looked up from the IFSC' })}
        ${field('type', 'Account type', { opts: ['Current', 'Savings'], value: a.bank.type })}</div>
        <div class="mt-4">${note('sky', 'shield-check', 'We send ₹1 to this account and match the name the bank returns. Stored encrypted; only the last 4 digits are ever shown.')}</div>`, saveBtn('badge-check', 'Save & verify account'));

    const row = (icon, title, sub, right) => `<div class="flex items-center gap-3 py-3.5"><span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800">${ico(icon)}</span>
      <div class="min-w-0 flex-1"><p class="text-sm font-semibold text-slate-900 dark:text-white">${title}</p><p class="text-xs text-slate-500 dark:text-slate-400">${sub}</p></div>${right}</div>`;
    const owner = section('owner', 'user-cog', 'violet', 'Owner & security', 'The account that can never be locked out', a.owner.twofa ? ok('Secured') : todo('Turn on 2FA'),
      `<div class="flex items-center gap-3 rounded-xl bg-gradient-to-r from-violet-50 to-transparent p-3 dark:from-violet-500/10">${K.avatar(a.owner.name, 'violet', 'h-11 w-11 text-sm')}
          <div class="min-w-0"><p class="truncate font-semibold text-slate-900 dark:text-white">${esc(a.owner.name)}</p><p class="truncate text-xs text-slate-500 dark:text-slate-400">${esc(a.owner.email)} · +91 ${esc(a.owner.phone)}</p></div></div>
        <div class="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
          ${row('smartphone', 'Two-step verification', a.owner.twofa ? 'OTP on every new device' : 'Off — owner can sign in with password only', sw(a.owner.twofa, 'data-pg="acc-2fa"'))}
          ${row('lock-keyhole', 'Security PIN', 'Unlocks payment & account pages', btn('ghost', 'Change', '', 'data-pg="acc-pin"', 'h-8 px-3'))}
          ${row('key-round', 'Password', 'Changed 41 days ago', btn('ghost', 'Change', '', 'data-pg="acc-pw"', 'h-8 px-3'))}
          ${row('monitor-smartphone', 'Active sessions', esc(a.owner.lastLogin), btn('ghost', 'Sign out others', '', 'data-pg="acc-sessions"', 'h-8 px-3'))}
          ${row('arrow-right-left', 'Transfer ownership', 'Needs OTP from both people', btn('ghost', 'Transfer', '', 'data-pg="acc-transfer"', 'h-8 px-3'))}</div>`,
      `<div class="grid gap-4">${field('name', 'Full name', { req: true, value: a.owner.name })}${field('email', 'Email', { req: true, type: 'email', value: a.owner.email })}
        ${field('phone', 'Mobile (for OTP)', { req: true, type: 'tel', value: a.owner.phone })}</div>`, saveBtn('save', 'Save'));

    const docsDone = DOCS.filter(d => a.docs[d[0]].status === 'verified').length;
    const docs = `<section id="acc-docs" class="${card} scroll-mt-24 overflow-hidden">
      <header class="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800"><span class="grid h-10 w-10 place-items-center rounded-xl ${K.tone('amber')}">${ico('files')}</span>
        <div class="min-w-0 flex-1"><h3 class="font-semibold text-slate-900 dark:text-white">KYC documents</h3><p class="text-xs text-slate-500 dark:text-slate-400">${docsDone} of ${DOCS.length} verified · PDF or image, max 5 MB</p></div></header>
      <ul class="divide-y divide-slate-100 dark:divide-slate-800">${DOCS.map(([k, l, i, req]) => { const d = a.docs[k], s = DOC_ST[d.status];
        return `<li class="flex items-center gap-3 px-5 py-3"><span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg ${d.status === 'verified' ? K.tone('emerald') : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}">${ico(i)}</span>
          <div class="min-w-0 flex-1"><p class="truncate text-sm font-medium text-slate-900 dark:text-white">${l}${req ? '' : ' <span class="text-xs font-normal text-slate-400">(optional)</span>'}</p>
            <p class="truncate text-[11px] text-slate-500">${d.file ? esc(d.file) + ' · ' + when(d.at) : 'Not uploaded'}</p></div>
          ${badge(s[1], s[0], s[2])}
          <label class="cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-teal-700 dark:hover:bg-slate-800" title="${d.file ? 'Replace' : 'Upload'}">${ico(d.file ? 'refresh-cw' : 'upload')}
            <input type="file" class="sr-only" accept=".pdf,image/*" data-pg-change="acc-doc" data-doc="${k}" aria-label="Upload ${l}"></label></li>`; }).join('')}</ul></section>`;

    const hist = `<section class="${card} overflow-hidden"><header class="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800"><span class="grid h-10 w-10 place-items-center rounded-xl ${K.tone('slate')}">${ico('history')}</span>
        <div class="flex-1"><h3 class="font-semibold text-slate-900 dark:text-white">Recent changes</h3><p class="text-xs text-slate-500 dark:text-slate-400">Also in the audit log</p></div>${btn('ghost', '', 'arrow-up-right', 'data-nav="audit" aria-label="Open audit log"', 'h-8 w-8')}</header>
      <ol class="relative mx-5 my-4 space-y-4 border-l border-slate-200 pl-5 dark:border-slate-700">${a.history.slice(0, 6).map(h => `<li class="relative"><span class="absolute -left-[31px] grid h-5 w-5 place-items-center rounded-full bg-white text-teal-600 ring-2 ring-teal-100 dark:bg-slate-900 dark:ring-teal-500/20">${ico(h.icon, 'h-3 w-3')}</span>
        <p class="text-[13px] text-slate-700 dark:text-slate-200">${h.text}</p><p class="text-[11px] text-slate-400">${when(h.at)}${h.by ? ' · ' + esc(h.by) : ''}</p></li>`).join('')}</ol></section>`;

    c.innerHTML = `<div class="fade-in space-y-5">${hero}
      <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div class="space-y-5">${org}${contact}${bank}</div>
        <div class="space-y-5">${owner}${docs}${hist}</div>
      </div></div>`;
    const f = $('#accForm');
    if (f) {
      f.addEventListener('submit', e => { e.preventDefault(); saveAccount(e.target); });
      f.addEventListener('input', e => { if (['ifsc', 'pan', 'gstin'].includes(e.target.name)) e.target.value = e.target.value.toUpperCase(); });
      f.querySelector('.field')?.focus({ preventScroll: true });
    }
  }

  on('acc-edit', el => {
    const sec = el.dataset.sec;
    if (sec !== 'docs') { ui.accEdit = sec; rerender(); }
    setTimeout(() => document.getElementById('acc-' + sec)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  });
  onChange('acc-logo', el => {
    const file = el.files && el.files[0]; if (!file) return;
    if (!/^image\//.test(file.type)) return toast('Not an image', 'Use PNG, JPG, SVG or WebP.', 'rose', 'image-off');
    if (file.size > 2 * 1024 * 1024) return toast('Logo too large', 'Keep it under 2 MB.', 'rose', 'image-off');
    const rd = new FileReader();
    rd.onload = () => { const a = A().account; a.org.logo = rd.result; a.history.unshift({ icon: 'image', text: 'Hospital logo updated', at: new Date(), by: H().state && ROLES[H().state.role].person });
      audit('image', 'teal', `<b>${who()}</b> changed the hospital logo`); toast('Logo updated', 'Used on bills, prescriptions and the patient portal', 'teal', 'image'); rerender(); };
    rd.readAsDataURL(file);
  });
  onChange('acc-doc', el => {
    const file = el.files && el.files[0], k = el.dataset.doc; if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast('File too large', 'Max 5 MB per document.', 'rose', 'file-x');
    const label = DOCS.find(d => d[0] === k)[1];
    runSteps({ title: 'Uploading document', icon: 'upload', steps: [`Uploading ${file.name}`, 'Scanning for viruses', 'Reading document (OCR)', 'Sending for verification'],
      done: { title: 'Sent for review', text: `${esc(label)} is usually verified within a few minutes.` },
      onDone: () => {
        const a = A().account; Object.assign(a.docs[k], { status: 'review', file: file.name, at: new Date() });
        a.history.unshift({ icon: 'upload', text: `${esc(label)} uploaded`, at: new Date(), by: ROLES[H().state.role].person });
        audit('upload', 'teal', `<b>${who()}</b> uploaded ${esc(label)}`);
        setTimeout(() => { if (a.docs[k].status !== 'review') return; a.docs[k].status = 'verified'; a.docs[k].at = new Date();
          a.history.unshift({ icon: 'badge-check', text: `${esc(label)} verified`, at: new Date(), by: 'HMS compliance' });
          toast('Document verified', label, 'emerald', 'badge-check'); if (H().state.active === 'account' && !$('#pgModal.open')) rerender(); }, 6000);
      } });
  });
  on('acc-sessions', () => { audit('log-out', 'slate', `<b>${who()}</b> signed out the owner’s other sessions`); toast('Other sessions ended', 'Only this browser stays signed in', 'teal', 'log-out'); });
  on('acc-pin', () => { gate.until = 0; gate.step = 'pin'; gate.newPin = true; rerender(); });

  on('acc-fill', () => {
    const f = $('#accForm'), tab = f.dataset.tab; fillForm(f, EXAMPLE[tab]);
    toast('Example data filled', 'Review it, then save. Nothing is sent in the demo.', 'amber', 'wand-sparkles');
  });
  on('acc-discard', () => { ui.accEdit = null; rerender(); });
  on('acc-2fa', el => { const o = A().account.owner; o.twofa = !o.twofa; el.setAttribute('aria-checked', o.twofa); audit('shield', o.twofa ? 'teal' : 'rose', `<b>${who()}</b> turned ${o.twofa ? 'on' : 'off'} two-step verification for the owner`); toast(`Two-step verification ${o.twofa ? 'on' : 'off'}`, o.twofa ? 'OTP will be asked on new devices' : 'Turning this off weakens the owner account', o.twofa ? 'teal' : 'amber', 'shield'); rerender(); });
  on('acc-pw', () => toast('Reset link sent', `Check ${A().account.owner.email}. The link expires in 15 minutes.`, 'teal', 'mail'));
  on('acc-transfer', () => toast('Owner transfer', 'Pick an admin, then both confirm with OTP — available in the full build.', 'slate', 'arrow-right-left'));

  function saveAccount(f) {
    const a = A().account, tab = f.dataset.tab;
    const req = { org: ['legal', 'brand', 'pan', 'gstin'], contact: ['name', 'email', 'phone', 'line1', 'city', 'pin'], bank: ['holder', 'number', 'confirm', 'ifsc'], owner: ['name', 'email', 'phone'] }[tab];
    const v = readForm(f, req); if (!v) return;
    const bad = (k, rx, msg) => (v[k] && !rx.test(v[k].trim()) ? (setErr(f, k, msg), true) : false);
    if (tab === 'org' && (bad('pan', RX.pan, 'PAN looks like AAAAA9999A') || bad('gstin', RX.gstin, 'GSTIN is 15 characters, e.g. 19AABCS1429B1Z5'))) return;
    if (tab === 'org' && v.gstin.slice(2, 12) !== v.pan) return setErr(f, 'gstin', 'Characters 3–12 of the GSTIN must equal the PAN');
    if ((tab === 'contact' || tab === 'owner') && (bad('email', RX.email, 'Enter a valid email') || bad('phone', RX.phone, '10-digit Indian mobile'))) return;
    if (tab === 'contact' && bad('pin', RX.pin, '6-digit PIN code')) return;
    if (tab === 'bank') {
      if (!/^\d{9,18}$/.test(v.number)) return setErr(f, 'number', '9–18 digits');
      if (v.number !== v.confirm) return setErr(f, 'confirm', 'Account numbers don’t match');
      if (bad('ifsc', RX.ifsc, 'IFSC is 11 characters, e.g. HDFC0000052')) return;
    }
    const steps = {
      org: ['Validating PAN format', 'Checking GSTIN with the GST portal', 'Updating invoice & bill headers', 'Saving to audit log'],
      contact: ['Validating contact details', 'Looking up PIN code', 'Updating billing address', 'Saving to audit log'],
      bank: ['Looking up IFSC', 'Sending ₹1 to the account (penny drop)', 'Matching account holder name', 'Updating settlement account on gateways', 'Saving encrypted bank details'],
      owner: ['Validating details', 'Sending OTP to confirm new contact', 'Updating owner account'],
    }[tab];
    const bankName = IFSC_BANK[(v.ifsc || '').slice(0, 4)] || 'Bank';
    runSteps({ title: tab === 'bank' ? 'Verifying bank account' : 'Saving account details', icon: tab === 'bank' ? 'landmark' : 'save', steps,
      done: tab === 'bank' ? { title: 'Bank account verified', text: `${bankName} •••• ${v.number.slice(-4)} — name matched “${esc(v.holder)}”. Settlements go here from the next cycle.` }
        : { title: 'Saved', text: `${ACC_TABS.find(x => x[0] === tab)[1]} updated.` },
      onDone: () => {
        if (tab === 'org') { Object.assign(a.org, v); a.org.pan = v.pan.toUpperCase(); a.org.gstin = v.gstin.toUpperCase(); Object.assign(D().settings.profile, { legal: v.legal, gstin: a.org.gstin, reg: v.reg }); }
        if (tab === 'contact') Object.assign(a.contact, v);
        if (tab === 'owner') Object.assign(a.owner, { name: v.name, email: v.email, phone: v.phone });
        if (tab === 'bank') {
          Object.assign(a.bank, { holder: v.holder, number: v.number, ifsc: v.ifsc.toUpperCase(), type: v.type, bank: bankName, branch: 'Kolkata', verified: true, verifiedAt: iso(new Date()) });
          A().settlements.forEach(s => { s.bank = `${bankName} •••• ${v.number.slice(-4)}`; });
        }
        ui.accEdit = null;
        a.history.unshift({ icon: tab === 'bank' ? 'landmark' : tab === 'owner' ? 'user-cog' : tab === 'contact' ? 'map-pin' : 'building-2', text: tab === 'bank' ? `Bank account verified · •••• ${esc(v.number.slice(-4))}` : `${esc(ACC_TABS.find(x => x[0] === tab)[1])} updated`, at: new Date(), by: ROLES[H().state.role].person });
        audit(tab === 'bank' ? 'landmark' : 'building-2', 'teal', `<b>${who()}</b> updated account details: ${esc(ACC_TABS.find(x => x[0] === tab)[1])}`);
      } });
  }

  /* =========================================================================
   * 3) Payment gateways
   * ========================================================================= */
  function renderGateways(c) {
    const t = T(), a = A(), gw = a.gw, on_ = Object.keys(gw).filter(k => gw[k].status === 'on');
    const r = a.routing, live = on_.filter(k => gw[k].mode === 'live');
    const last30 = a.txns.filter(x => x.gw !== 'counter' && x.status !== 'failed');
    const success = a.txns.filter(x => x.gw !== 'counter').length ? Math.round(last30.length / a.txns.filter(x => x.gw !== 'counter').length * 1000) / 10 : 0;
    const provCard = k => {
      const p = PROVIDERS[k], g = gw[k], isDef = r.default === k, conn = g.status === 'on';
      return `<article class="${card} flex flex-col p-5 ${isDef ? 'ring-2 ring-teal-500/40' : ''}">
        <div class="flex items-start gap-3">${providerLogo(k)}
          <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-1.5"><p class="font-semibold text-slate-900 dark:text-white">${p.name}</p>${isDef ? badge('teal', 'Default', 'star') : ''}</div>
          <p class="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">${p.desc}</p></div></div>
        <div class="mt-4 flex flex-wrap items-center gap-1.5">${conn ? badge(g.mode === 'live' ? 'emerald' : 'amber', g.mode === 'live' ? 'Connected · Live' : 'Connected · Test mode', g.mode === 'live' ? 'circle-check' : 'flask-conical') : badge('slate', 'Not connected', 'plug')}
          <span class="text-[11px] text-slate-400">~${(p.fee * 100).toFixed(p.fee * 100 % 1 ? 2 : 0)}% per txn</span></div>
        ${conn ? `<dl class="mt-4 space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
            <div class="flex justify-between gap-2"><dt class="text-slate-500">${esc(p.fields[0][1])}</dt><dd class="truncate font-mono">${esc(g.creds[p.fields[0][0]].slice(0, 12))}…</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-slate-500">Methods</dt><dd>${g.methods.length} enabled</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-slate-500">Last webhook</dt><dd class="truncate">${esc(g.lastEvent || '—')}</dd></div></dl>` : `<div class="mt-4 flex flex-wrap gap-1">${p.methods.map(m => { const mm = METHODS.find(x => x[0] === m); return `<span class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">${ico(mm[2], 'h-3 w-3')}${mm[1]}</span>`; }).join('')}</div>`}
        <div class="mt-auto flex gap-2 pt-4">${conn
          ? `${btn('ghost', 'Configure', 'settings-2', `data-pg="gw-conf" data-id="${k}"`, 'h-9 px-3 flex-1')}${!isDef && g.mode === 'live' ? btn('soft', 'Make default', 'star', `data-pg="gw-default" data-id="${k}"`, 'h-9 px-3') : ''}`
          : btn('primary', `Connect ${p.name}`, 'plug', `data-pg="gw-conf" data-id="${k}"`, 'h-9 px-3 flex-1')}</div>
      </article>`;
    };
    const route = (key, label, help, opts) => `<div class="flex flex-wrap items-center gap-3 px-5 py-3.5"><div class="min-w-0 flex-1"><p class="text-sm font-medium text-slate-900 dark:text-white">${label}</p><p class="text-xs text-slate-500 dark:text-slate-400">${help}</p></div>
      <select class="adm-select min-w-[180px]" data-pg-change="gw-route" data-k="${key}" ${opts.length ? '' : 'disabled'}><option value="">${opts.length ? 'Use default' : 'Connect a gateway first'}</option>${opts.map(k => `<option value="${k}" ${r[key] === k ? 'selected' : ''}>${PROVIDERS[k].name}${gw[k].mode === 'test' ? ' (test)' : ''}</option>`).join('')}</select></div>`;
    c.innerHTML = `<div class="fade-in space-y-5">
      ${tiles([tile('plug-zap', 'teal', 'Gateways connected', `${on_.length}<span class="text-sm font-medium text-slate-400"> / ${Object.keys(PROVIDERS).length}</span>`),
        tile('radio', 'emerald', 'Live gateways', live.length), tile('percent', 'sky', 'Online success rate (30 d)', success ? success + '%' : '—'),
        tile('landmark', a.account.bank.verified ? 'emerald' : 'amber', 'Settlement account', a.account.bank.verified ? '•••• ' + esc(a.account.bank.number.slice(-4)) : 'Not set')])}
      ${!on_.length ? note('amber', 'plug', `<b>No payment gateway connected yet.</b> Patients can only pay at the counter. Connect Razorpay (UPI, cards) in about 2 minutes — use <b>Autofill example data</b> in the dialog to try the flow.`) : ''}
      ${!a.account.bank.verified ? note('sky', 'landmark', `Add a verified bank account in <button class="font-semibold underline" data-nav="account" data-pg="seg" data-key="accEdit" data-val="bank">Account details</button> so gateways can settle money to the hospital.`) : ''}
      <div class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">${Object.keys(PROVIDERS).map(provCard).join('')}</div>
      <section class="${card}">
        ${cardHead('Payment routing', 'Which gateway handles which payment. Applies to the patient portal, payment links and the billing counter’s “Send link”.')}
        <div class="divide-y divide-slate-100 dark:divide-slate-800">
          ${route('default', 'Default gateway', 'Used whenever no rule below matches', on_.filter(k => gw[k].mode === 'live'))}
          ${route('upi', 'UPI payments', 'QR at the counter and UPI intent on phones', on_.filter(k => PROVIDERS[k].methods.includes('upi')))}
          ${route('intl', 'International cards', 'Medical tourists paying in USD / EUR', on_.filter(k => gw[k].methods.includes('intl') || PROVIDERS[k].methods.includes('intl')))}
          ${route('fallback', 'Fallback if default is down', 'Retries automatically after 2 failed attempts in 5 minutes', on_.filter(k => k !== r.default))}
        </div>
      </section>
      <section class="${card}">
        ${cardHead('Webhook endpoints', 'Gateways call these to confirm payments, refunds and settlements. Signed with each gateway’s webhook secret.')}
        ${on_.length ? table(['Gateway', 'Endpoint', 'Events', 'Status'], on_.map(k => `<tr>${td0(`<div class="flex items-center gap-2">${providerLogo(k, 'h-7 w-7 text-[10px]')}<span class="font-medium">${PROVIDERS[k].name}</span></div>`)}
          ${td(`<div class="flex items-center gap-1"><span class="font-mono text-xs">https://${t.slug}.hms.com/api/webhooks/${k}</span>${iconBtn('copy', 'Copy URL', `data-pg="gw-copy" data-v="https://${t.slug}.hms.com/api/webhooks/${k}"`)}</div>`)}
          ${td('<span class="text-xs text-slate-500">payment.captured, payment.failed, refund.processed, settlement.processed</span>', 'max-w-[280px]')}${td(badge('emerald', 'Healthy', 'activity'), 'pr-5')}</tr>`).join(''), { min: '760px' })
          : empty('webhook', 'No endpoints yet', 'An endpoint is registered automatically when you connect a gateway.')}
      </section></div>`;
  }

  on('gw-copy', el => K.copy(el.dataset.v, 'Webhook URL'));
  on('gw-default', el => { const a = A(), k = el.dataset.id; a.routing.default = k; audit('star', 'teal', `<b>${who()}</b> made ${PROVIDERS[k].name} the default payment gateway`); toast('Default gateway', `${PROVIDERS[k].name} now handles payments unless a rule says otherwise`, 'teal', 'star'); rerender(); });
  onChange('gw-route', el => { const a = A(); a.routing[el.dataset.k] = el.value || null; toast('Routing updated', el.value ? `${PROVIDERS[el.value].name} → ${el.closest('div.flex').querySelector('p').textContent}` : 'Uses the default gateway', 'teal', 'route'); audit('route', 'teal', `<b>${who()}</b> changed payment routing`); });

  function openGatewayConfig(k, draft) {
    const t = T(), p = PROVIDERS[k], g = A().gw[k], conn = g.status === 'on';
    const st = draft || { mode: conn ? g.mode : 'test', creds: {}, methods: [...g.methods], autoCapture: g.autoCapture };
    const hook = `https://${t.slug}.hms.com/api/webhooks/${k}`;
    const modeBtn = m => `<label class="flex flex-1 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50/60 dark:border-slate-700 dark:has-[:checked]:bg-teal-500/10">
      <input type="radio" name="mode" value="${m}" ${st.mode === m ? 'checked' : ''} class="h-4 w-4 text-teal-600" data-pg-change="gw-mode">
      <span><span class="block text-sm font-semibold">${m === 'test' ? 'Test mode' : 'Live mode'}</span><span class="block text-xs text-slate-500 dark:text-slate-400">${m === 'test' ? 'Sandbox keys · no real money' : 'Real payments from patients'}</span></span></label>`;
    const credField = ([n, l, , secret]) => {
      const has = conn && g.creds[n], val = st.creds[n] ?? (has && !secret ? g.creds[n] : '');
      return `<label class="block sm:col-span-2"><span class="mb-1.5 flex items-center text-sm font-medium text-slate-700 dark:text-slate-200">${esc(l)}${has && secret ? '' : ' <span class="ml-1 text-rose-500">*</span>'}
        ${secret ? '<span class="ml-auto inline-flex items-center gap-1 text-[11px] font-normal text-slate-400">' + ico('lock', 'h-3 w-3') + 'Encrypted</span>' : ''}</span>
        <div class="relative"><input name="${n}" type="${secret ? 'password' : 'text'}" class="field pr-10 font-mono text-[13px]" value="${esc(val)}" placeholder="${has && secret ? 'Saved ' + mask(g.creds[n]) + ' — leave blank to keep' : esc(p.fields.find(f => f[0] === n)[2](st.mode).slice(0, 10) + '…')}" autocomplete="off" spellcheck="false">
        ${secret ? `<button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" data-pg="gw-eye" aria-label="Show or hide">${ico('eye', 'h-4 w-4')}</button>` : ''}</div>
        <span class="err mt-1 hidden text-xs text-rose-600"></span></label>`;
    };
    modal({ title: conn ? `${p.name} configuration` : `Connect ${p.name}`, icon: 'plug-zap', size: 'max-w-2xl', sub: conn ? `Connected since ${fmtDate(g.connectedAt)} · changes are re-verified before saving` : `Find these in your ${p.name} ${esc(p.docs)}`,
      body: `<div class="mb-5 flex flex-wrap items-center gap-3">${providerLogo(k, 'h-9 w-9 text-xs')}<p class="min-w-0 flex-1 text-xs text-slate-500 dark:text-slate-400">${p.desc}</p>${autofillBtn(`data-pg="gw-fill" data-id="${k}"`)}</div>
        <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">1 · Environment</p>
        <div class="flex flex-col gap-2 sm:flex-row">${modeBtn('test')}${modeBtn('live')}</div>
        <p class="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">2 · API credentials</p>
        <div class="grid gap-4 sm:grid-cols-2">${p.fields.map(credField).join('')}</div>
        <p class="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">3 · Webhook</p>
        <div class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">${ico('webhook', 'h-4 w-4 shrink-0 text-slate-400')}<span class="min-w-0 flex-1 truncate font-mono text-xs">${hook}</span>${iconBtn('copy', 'Copy webhook URL', `data-pg="gw-copy" data-v="${hook}"`)}</div>
        <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">HMS registers this automatically when it can; otherwise paste it into ${p.name} and subscribe to payment, refund and settlement events.</p>
        <p class="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">4 · Payment methods</p>
        <div class="grid gap-2 sm:grid-cols-3">${METHODS.filter(([m]) => p.methods.includes(m)).map(([m, l, i]) => `<label class="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50/60 dark:border-slate-700 dark:has-[:checked]:bg-teal-500/10">
          <input type="checkbox" name="m_${m}" ${st.methods.includes(m) ? 'checked' : ''} class="h-4 w-4 rounded border-slate-300 text-teal-600">${ico(i, 'h-4 w-4 text-slate-400')}${l}</label>`).join('')}</div>
        <label class="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" name="autoCapture" ${st.autoCapture ? 'checked' : ''} class="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600"><span><b>Auto-capture</b> payments <span class="block text-xs text-slate-500 dark:text-slate-400">Turn off to hold IPD advances and capture on admission.</span></span></label>
        <div class="mt-5">${note('sky', 'shield-check', 'Secrets are encrypted (AES-256, per-hospital key) and never shown again after saving. Only the Admin role can change gateways; every change is in the audit log.')}</div>`,
      foot: `${conn ? `<button type="button" class="mr-auto h-10 rounded-xl px-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10" data-pg="gw-disconnect" data-id="${k}">Disconnect</button>` : ''}
        <button type="button" class="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800" data-close-modal>Cancel</button>
        ${btn('ghost', 'Test connection', 'activity', `data-pg="gw-test" data-id="${k}"`, 'h-10 px-4')}
        <button type="submit" class="inline-flex h-10 items-center gap-1.5 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700">${ico(conn ? 'save' : 'plug-zap')}${conn ? 'Save & update' : 'Save & connect'}</button>`,
      onSubmit: f => { const v = readGateway(f, k); if (!v) return false; connectGateway(k, v); return false; } });
    $('#pgPanel').dataset.gw = k;
  }

  function readGateway(f, k) {
    const p = PROVIDERS[k], g = A().gw[k], conn = g.status === 'on', fd = new FormData(f), mode = fd.get('mode');
    const creds = {}, req = [];
    p.fields.forEach(([n, , , secret]) => { const val = String(fd.get(n) || '').trim(); creds[n] = val; if (!val && !(conn && secret && g.creds[n])) req.push(n); });
    f.querySelectorAll('.field').forEach(x => x.classList.remove('invalid')); f.querySelectorAll('.err').forEach(x => x.classList.add('hidden'));
    if (req.length) { req.forEach(n => setErr(f, n, 'Required')); f.elements[req[0]].focus(); return null; }
    const merged = Object.fromEntries(p.fields.map(([n]) => [n, creds[n] || g.creds[n]]));
    const chk = p.check && p.check(merged, mode); if (chk) { setErr(f, chk[0], chk[1]); return null; }
    const methods = METHODS.map(m => m[0]).filter(m => fd.get('m_' + m));
    if (!methods.length) { toast('Pick at least one payment method', '', 'amber', 'triangle-alert'); return null; }
    return { mode, creds: merged, changed: p.fields.filter(([n]) => creds[n] && creds[n] !== g.creds[n]).map(x => x[1]), methods, autoCapture: !!fd.get('autoCapture') };
  }

  function connectGateway(k, v) {
    const p = PROVIDERS[k], a = A(), g = a.gw[k], wasOn = g.status === 'on';
    const steps = wasOn
      ? ['Validating changes', ...(v.changed.length ? [`Re-authenticating with ${p.name} (${v.changed.length} credential${v.changed.length > 1 ? 's' : ''} changed)`] : []), 'Updating webhook subscription', 'Syncing payment methods', 'Encrypting & saving configuration']
      : ['Validating key format', `Authenticating with ${p.name} API`, 'Checking account & KYC status', 'Registering webhook endpoint', `Creating a ₹1 ${v.mode} order and voiding it`, 'Encrypting & saving credentials'];
    // demo: a "wrong" key fails at authentication so the error path can be seen
    const bad = Object.values(v.creds).some(x => /^(wrong|invalid|bad)/i.test(x));
    runSteps({ title: wasOn ? `Updating ${p.name}` : `Connecting ${p.name}`, icon: 'plug-zap', steps, failAt: bad ? (wasOn ? 1 : 1) : undefined,
      fail: { title: `${p.name} rejected the credentials`, text: `HTTP 401 — “The api key provided is invalid”. Check you copied the <b>${v.mode}</b> keys, not the ${v.mode === 'live' ? 'test' : 'live'} ones.`, retry: () => openGatewayConfig(k, { mode: v.mode, creds: v.creds, methods: v.methods, autoCapture: v.autoCapture }) },
      done: { title: wasOn ? 'Configuration updated' : `${p.name} connected`, text: wasOn ? `${p.name} is running in ${v.mode} mode with ${v.methods.length} payment methods.` : `${v.mode === 'live' ? 'Patients can now pay online.' : 'Test mode: try a payment from the Payment Sheet with “Simulate payment”.'}`,
        actions: btn('ghost', 'Open payment sheet', 'sheet', 'data-close-modal data-nav="payments:sheet"', 'h-10 px-4') },
      onDone: () => {
        Object.assign(g, { status: 'on', mode: v.mode, creds: v.creds, methods: v.methods, autoCapture: v.autoCapture, connectedAt: g.connectedAt || iso(new Date()), lastEvent: 'Just now · webhook verified' });
        if (!a.routing.default && v.mode === 'live') a.routing.default = k;
        if (!a.routing.upi && p.methods.includes('upi') && v.mode === 'live') a.routing.upi = k;
        if (!a.routing.intl && v.methods.includes('intl')) a.routing.intl = k;
        audit('plug-zap', 'teal', `<b>${who()}</b> ${wasOn ? 'updated' : 'connected'} ${p.name} (${v.mode} mode)${v.changed.length ? ' — changed ' + esc(v.changed.join(', ')) : ''}`);
      } });
  }

  on('gw-conf', el => openGatewayConfig(el.dataset.id));
  on('gw-eye', el => { const i = el.parentElement.querySelector('input'); i.type = i.type === 'password' ? 'text' : 'password'; el.innerHTML = ico(i.type === 'password' ? 'eye' : 'eye-off', 'h-4 w-4'); H().icons(); });
  on('gw-fill', el => {
    const k = el.dataset.id, f = $('#pgForm'), mode = new FormData(f).get('mode') || 'test', p = PROVIDERS[k];
    fillForm(f, Object.fromEntries(p.fields.map(([n, , ex]) => [n, ex(mode)])));
    f.querySelectorAll('input[name^="m_"]').forEach(x => { x.checked = true; });
    toast('Example keys filled', `Fake ${mode} keys for ${p.name}. Tip: start a key with “wrong” to see a failed connection.`, 'amber', 'wand-sparkles');
  });
  onChange('gw-mode', el => {
    // keep example prefixes in step with the selected mode
    const f = $('#pgForm'); if (!f) return; const m = el.value, o = m === 'live' ? 'test' : 'live';
    f.querySelectorAll('input.font-mono').forEach(i => { if (i.value.includes(`_${o}_`)) i.value = i.value.replace(`_${o}_`, `_${m}_`); if (i.value.includes(o === 'live' ? '_prod_' : '_test_') && i.value.startsWith('cfsk')) i.value = i.value.replace(o === 'live' ? '_prod_' : '_test_', m === 'live' ? '_prod_' : '_test_'); });
  });
  on('gw-test', el => {
    const k = el.dataset.id, f = $('#pgForm'), v = readGateway(f, k); if (!v) return;
    const box = el; box.disabled = true; box.innerHTML = ico('loader-circle', 'h-4 w-4 animate-spin') + 'Testing…'; H().icons();
    const bad = Object.values(v.creds).some(x => /^(wrong|invalid|bad)/i.test(x));
    setTimeout(() => {
      if (!document.body.contains(box)) return;
      box.disabled = false; box.innerHTML = ico(bad ? 'circle-x' : 'circle-check', `h-4 w-4 ${bad ? 'text-rose-600' : 'text-emerald-600'}`) + (bad ? 'Failed — retry' : 'Connection OK'); H().icons();
      toast(bad ? 'Connection failed' : 'Connection OK', bad ? `${PROVIDERS[k].name} returned 401 Unauthorized` : `${PROVIDERS[k].name} ${v.mode} API responded in ${180 + Math.floor(Math.random() * 220)} ms`, bad ? 'rose' : 'emerald', bad ? 'circle-x' : 'activity');
    }, 1400);
  });
  on('gw-disconnect', el => {
    const k = el.dataset.id, p = PROVIDERS[k];
    H().confirmDialog({ title: `Disconnect ${p.name}?`, icon: 'unplug', ok: 'Disconnect', text: 'New payments stop going through it. Payments already captured still settle, and refunds on them stay possible from the Payment Sheet.',
      onOk: () => setTimeout(() => runSteps({ title: `Disconnecting ${p.name}`, icon: 'unplug', tone: 'rose', steps: ['Removing webhook endpoint', 'Revoking stored credentials', 'Updating payment routing'],
        done: { title: `${p.name} disconnected`, text: 'Credentials were deleted from the vault.' },
        onDone: () => { const a = A(), g = a.gw[k]; Object.assign(g, { status: 'off', creds: {}, lastEvent: null, connectedAt: null });
          Object.keys(a.routing).forEach(x => { if (a.routing[x] === k) a.routing[x] = Object.keys(a.gw).find(y => a.gw[y].status === 'on' && a.gw[y].mode === 'live') || null; });
          audit('unplug', 'rose', `<b>${who()}</b> disconnected ${p.name}`); } }), 250) });
  });

  /* =========================================================================
   * 4) Payment sheet
   * ========================================================================= */
  const PERIODS = [['7', 'Last 7 days'], ['30', 'Last 30 days'], ['today', 'Today'], ['all', 'All time']];
  function sheetRows() {
    const a = A(), q = (ui.psq || '').trim().toLowerCase(), g = ui.psg || 'all', st = ui.pss || 'all', m = ui.psm || 'all', per = ui.psp || '30';
    const from = per === 'all' ? 0 : per === 'today' ? new Date(new Date().setHours(0, 0, 0, 0)) : Date.now() - (+per) * 86400000;
    const key = ui.psSort || 'at', dir = ui.psDir || 'desc';
    return a.txns.filter(x => (g === 'all' || x.gw === g) && (st === 'all' || x.status === st) && (m === 'all' || x.method === m) && x.at >= from
      && (!q || [x.id, x.patient, x.mrn, x.invoice, x.ref, x.purpose, x.vpa, x.settlement].join(' ').toLowerCase().includes(q)))
      .sort((p, n) => { const A_ = p[key], B = n[key], r = A_ > B ? 1 : A_ < B ? -1 : 0; return dir === 'asc' ? r : -r; });
  }

  function renderSheet(c) {
    const a = A(), view = ui.psv || 'txns', rows = sheetRows(), on_ = Object.keys(a.gw).filter(k => a.gw[k].status === 'on');
    const ok = rows.filter(x => !['failed'].includes(x.status));
    const sum = k => ok.reduce((s, x) => s + x[k], 0);
    const refunds = rows.reduce((s, x) => s + x.refund, 0), pend = rows.filter(x => x.status === 'captured' || x.status === 'pending').reduce((s, x) => s + x.net, 0);
    const methods = [...new Set(a.txns.map(x => x.method))];
    const fmtAt = d => `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}<span class="block text-[11px] text-slate-400">${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>`;
    const sortTh = (k, l, right) => `<th class="px-3 py-3 font-semibold ${right ? 'text-right' : ''}"><button type="button" class="inline-flex items-center gap-1 uppercase tracking-wider hover:text-slate-900 dark:hover:text-white" data-pg="ps-sort" data-k="${k}">${l}${ico((ui.psSort || 'at') === k ? ((ui.psDir || 'desc') === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-up-down', `h-3 w-3 ${(ui.psSort || 'at') === k ? 'text-teal-600' : 'opacity-40'}`)}</button></th>`;
    const num = (v, cls = '') => `<td class="px-3 py-2.5 text-right tabular-nums ${cls}">${v}</td>`;
    const txTable = `<div class="overflow-x-auto thin-scroll"><table class="w-full text-left text-[13px]" style="min-width:1320px">
      <thead class="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800/80 dark:text-slate-400"><tr class="border-b border-slate-200 dark:border-slate-700">
        <th class="py-3 pl-5 pr-3"><input type="checkbox" class="h-4 w-4 rounded border-slate-300 text-teal-600" data-pg="ps-all" aria-label="Select all" ${ui.psSel && ui.psSel.size && ui.psSel.size === rows.length ? 'checked' : ''}></th>
        ${sortTh('at', 'Date')}<th class="px-3 py-3 font-semibold">Transaction</th>${sortTh('patient', 'Patient')}<th class="px-3 py-3 font-semibold">Purpose · Invoice</th>
        <th class="px-3 py-3 font-semibold">Method</th><th class="px-3 py-3 font-semibold">Gateway · Ref</th>
        ${sortTh('gross', 'Gross', true)}${sortTh('fee', 'Fee', true)}<th class="px-3 py-3 text-right font-semibold">GST</th>${sortTh('net', 'Net', true)}
        <th class="px-3 py-3 font-semibold">Status</th><th class="px-3 py-3 pr-5 font-semibold">Settlement</th></tr></thead>
      <tbody class="divide-y divide-slate-100 dark:divide-slate-800">${rows.map(x => { const S = STATUS[x.status], gm = gwMeta(x.gw), sel = ui.psSel && ui.psSel.has(x.id);
        return `<tr class="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40 ${sel ? 'bg-teal-50/60 dark:bg-teal-500/5' : ''} ${x.id === ui.psFlash ? 'row-flash' : ''}" data-pg="ps-open" data-id="${x.id}">
          <td class="py-2.5 pl-5 pr-3"><input type="checkbox" class="h-4 w-4 rounded border-slate-300 text-teal-600" data-pg="ps-sel" data-id="${x.id}" ${sel ? 'checked' : ''} aria-label="Select ${x.id}"></td>
          <td class="whitespace-nowrap px-3 py-2.5">${fmtAt(x.at)}</td>
          <td class="px-3 py-2.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">${x.id}</td>
          <td class="px-3 py-2.5"><p class="font-medium text-slate-900 dark:text-white">${esc(x.patient)}</p><p class="font-mono text-[11px] text-slate-400">${esc(x.mrn)}</p></td>
          <td class="px-3 py-2.5"><p>${esc(x.purpose)}</p><p class="font-mono text-[11px] text-slate-400">${x.invoice}</p></td>
          <td class="px-3 py-2.5"><p>${esc(x.method)}</p><p class="text-[11px] text-slate-400">${x.vpa ? esc(x.vpa) : x.cardLast4 ? '•••• ' + x.cardLast4 : esc(x.by)}</p></td>
          <td class="px-3 py-2.5"><div class="flex items-center gap-2">${providerLogo(x.gw, 'h-6 w-6 text-[9px]')}<div class="min-w-0"><p class="text-xs font-medium">${esc(gm.name)}</p><p class="max-w-[150px] truncate font-mono text-[11px] text-slate-400">${esc(x.ref)}</p></div></div></td>
          ${num(inr(x.gross), 'font-semibold text-slate-900 dark:text-white')}${num(x.fee ? inr(x.fee) : '—', 'text-slate-500')}${num(x.gst ? inr(x.gst) : '—', 'text-slate-500')}
          ${num(x.status === 'refunded' ? `<span class="text-violet-600 dark:text-violet-400">− ${inr(x.refund)}</span>` : x.net ? inr(x.net) : '—', 'font-semibold')}
          <td class="px-3 py-2.5">${badge(S[1], S[0], S[2])}</td>
          <td class="px-3 py-2.5 pr-5 font-mono text-[11px] text-slate-500">${x.settlement ? esc(x.settlement) : x.gw === 'counter' ? 'Cash book' : '—'}</td></tr>`; }).join('')}</tbody>
      ${rows.length ? `<tfoot class="border-t-2 border-slate-200 bg-slate-50 text-[13px] font-semibold dark:border-slate-700 dark:bg-slate-800/60"><tr>
        <td class="py-3 pl-5" colspan="7">Totals · ${rows.length} transactions${ok.length !== rows.length ? ` <span class="font-normal text-slate-400">(${rows.length - ok.length} failed excluded)</span>` : ''}</td>
        ${num(inr(sum('gross')))}${num(inr(sum('fee')))}${num(inr(sum('gst')))}${num(inr(sum('net') - refunds))}<td colspan="2"></td></tr></tfoot>` : ''}</table>
      ${rows.length ? '' : `<div class="px-5 py-12 text-center text-sm text-slate-500">No transactions match these filters.</div>`}</div>`;

    const setTable = table(['Settlement ID', 'Date', 'Gateway', 'Payments', 'Gross', 'Fees + GST', 'Net', 'UTR · Bank'], a.settlements.map(s => `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
      ${td0(`<span class="font-mono text-xs font-semibold">${s.id}</span>`)}${td(fmtDate(s.date))}${td(`<div class="flex items-center gap-2">${providerLogo(s.gw, 'h-6 w-6 text-[9px]')}${PROVIDERS[s.gw].name}</div>`)}${td(s.count)}
      ${td(inr(s.gross), 'text-right tabular-nums')}${td('− ' + inr(s.fees), 'text-right tabular-nums text-slate-500')}${td(inr(s.net), 'text-right font-semibold tabular-nums')}
      ${td(`<span class="font-mono text-xs">${s.utr}</span><span class="block text-[11px] text-slate-400">${esc(s.bank)}</span>`, 'pr-5')}</tr>`).join(''), { min: '900px', empty: 'No settlements yet — they appear T+2 after online payments are captured.' });

    // daily summary by method
    const days = {}; ok.forEach(x => { const d = iso(x.at); (days[d] ||= { d, n: 0, gross: 0, upi: 0, card: 0, cash: 0, other: 0, net: 0 }); const o = days[d]; o.n++; o.gross += x.gross; o.net += x.net;
      if (x.method === 'UPI') o.upi += x.gross; else if (/card/i.test(x.method)) o.card += x.gross; else if (x.method === 'Cash') o.cash += x.gross; else o.other += x.gross; });
    const dayRows = Object.values(days).sort((p, n) => n.d.localeCompare(p.d));
    const dayTable = table(['Date', 'Payments', 'UPI', 'Cards', 'Cash', 'Netbanking / wallet', 'Gross', 'Net'], dayRows.map(o => `<tr>${td0(fmtDate(o.d, { weekday: 'short', day: 'numeric', month: 'short' }))}${td(o.n)}
      ${['upi', 'card', 'cash', 'other'].map(k => td(o[k] ? inr(o[k]) : '—', 'tabular-nums')).join('')}${td(inr(o.gross), 'text-right tabular-nums font-semibold')}${td(inr(o.net), 'text-right tabular-nums font-semibold pr-5')}</tr>`).join(''), { min: '860px', empty: 'No payments in this period.' });

    c.innerHTML = `<div class="fade-in space-y-5">
      ${tiles([tile('indian-rupee', 'emerald', 'Collected (gross)', inr(sum('gross')), `${ok.length} payments`), tile('percent', 'amber', 'Gateway fees + GST', inr(sum('fee') + sum('gst'))),
        tile('hourglass', 'sky', 'Awaiting settlement', inr(pend)), tile('undo-2', 'violet', 'Refunded', inr(refunds))])}
      ${!on_.length ? note('amber', 'plug', `Only counter payments are shown — no gateway is connected. <button class="font-semibold underline" data-nav="payments:gateways">Connect a gateway</button> to take UPI and card payments online.`) : ''}
      <div class="${card}">
        <div class="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          ${seg('psv', [['txns', 'Transactions', a.txns.length], ['days', 'Daily summary'], ['settle', 'Settlements', a.settlements.length]], view)}
          <span class="flex-1"></span>
          ${ui.psSel && ui.psSel.size ? `<span class="text-xs font-semibold text-teal-700 dark:text-teal-300">${ui.psSel.size} selected</span>${btn('ghost', 'Export selected', 'download', 'data-pg="ps-export" data-sel="1"')}${btn('ghost', 'Clear', 'x', 'data-pg="ps-clear"')}` : ''}
          ${btn('ghost', 'Export CSV', 'file-spreadsheet', 'data-pg="ps-export"')}${btn('ghost', 'Print', 'printer', 'data-pg="ps-print"')}
          ${on_.length ? btn('ghost', 'Payment link', 'link', 'data-pg="pl-new"') + btn('primary', 'Simulate payment', 'zap', 'data-pg="ps-sim"') : ''}
        </div>
        ${view === 'txns' || view === 'days' ? toolbar(`${search('psq', ui.psq || '', 'Search patient, MRN, invoice, txn or gateway ref')}
          ${select('psp', PERIODS, ui.psp || '30', 'Period')}
          ${select('psg', [['all', 'All gateways'], ...Object.keys(PROVIDERS).filter(k => a.txns.some(x => x.gw === k)).map(k => [k, PROVIDERS[k].name]), ['counter', 'Cash counter']], ui.psg || 'all', 'Gateway')}
          ${select('psm', [['all', 'All methods'], ...methods.map(m => [m, m])], ui.psm || 'all', 'Method')}
          ${view === 'txns' ? select('pss', [['all', 'Any status'], ...Object.entries(STATUS).map(([k, v]) => [k, v[0]])], ui.pss || 'all', 'Status') : ''}
          ${(ui.psq || (ui.psg && ui.psg !== 'all') || (ui.pss && ui.pss !== 'all') || (ui.psm && ui.psm !== 'all') || (ui.psp && ui.psp !== '30')) ? `<button class="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400" data-pg="ps-reset">Reset filters</button>` : ''}`) : ''}
        ${view === 'txns' ? txTable : view === 'days' ? dayTable : setTable}
        <div class="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">Fees are the gateway’s MDR; GST is 18% on the fee. Net = gross − fee − GST. Cash is recorded at the counter and has no fee. All amounts in INR.</div>
      </div></div>`;
    ui.psFlash = null;
  }

  on('ps-sort', (el, ev) => { ev.stopPropagation(); const k = el.dataset.k; if ((ui.psSort || 'at') === k) ui.psDir = (ui.psDir || 'desc') === 'desc' ? 'asc' : 'desc'; else { ui.psSort = k; ui.psDir = 'desc'; } rerender(); });
  on('ps-reset', () => { Object.assign(ui, { psq: '', psg: 'all', pss: 'all', psm: 'all', psp: '30' }); rerender(); });
  on('ps-sel', (el, ev) => { ev.stopPropagation(); ui.psSel ||= new Set(); el.checked ? ui.psSel.add(el.dataset.id) : ui.psSel.delete(el.dataset.id); rerender(); });
  on('ps-all', (el, ev) => { ev.stopPropagation(); ui.psSel = el.checked ? new Set(sheetRows().map(x => x.id)) : new Set(); rerender(); });
  on('ps-clear', () => { ui.psSel = new Set(); rerender(); });

  function csv(rows) {
    const head = ['Transaction ID', 'Date', 'Time', 'Patient', 'MRN', 'Purpose', 'Invoice', 'Method', 'Payer (VPA/card)', 'Gateway', 'Gateway ref', 'Order ID', 'Gross', 'Fee', 'GST on fee', 'Net', 'Refunded', 'Status', 'Settlement'];
    const q = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return [head, ...rows.map(x => [x.id, iso(x.at), x.at.toTimeString().slice(0, 5), x.patient, x.mrn, x.purpose, x.invoice, x.method, x.vpa || (x.cardLast4 ? '****' + x.cardLast4 : ''), gwMeta(x.gw).name, x.ref, x.order, x.gross, x.fee, x.gst, x.net, x.refund, STATUS[x.status][0], x.settlement || ''])].map(r => r.map(q).join(',')).join('\n');
  }
  on('ps-export', el => {
    const rows = el.dataset.sel ? A().txns.filter(x => ui.psSel?.has(x.id)) : sheetRows();
    const blob = new Blob(['﻿' + csv(rows)], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `${T().slug}-payments-${iso(new Date())}.csv`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    audit('download', 'slate', `<b>${who()}</b> exported ${rows.length} payment records`); toast('CSV downloaded', `${rows.length} transactions · opens in Excel or Google Sheets`, 'teal', 'file-spreadsheet');
  });
  on('ps-print', () => {
    const rows = sheetRows(), w = window.open('', '_blank', 'width=1100,height=800'); if (!w) return toast('Pop-up blocked', 'Allow pop-ups to print.', 'amber', 'printer');
    const ok = rows.filter(x => x.status !== 'failed'), s = k => ok.reduce((a, x) => a + x[k], 0);
    w.document.write(`<!doctype html><meta charset="utf-8"><title>Payment sheet</title><body style="font-family:system-ui,sans-serif;padding:24px;color:#0f172a;font-size:11px">
      <h2 style="margin:0">${esc(T().name)} — Payment sheet</h2><p style="color:#64748b">${PERIODS.find(p => p[0] === (ui.psp || '30'))[1]} · printed ${new Date().toLocaleString('en-IN')}</p>
      <table cellpadding="5" style="width:100%;border-collapse:collapse"><tr style="background:#f1f5f9;text-align:left">${['Date', 'Txn', 'Patient', 'Purpose', 'Method', 'Gateway', 'Gross', 'Fee', 'GST', 'Net', 'Status'].map(h => `<th>${h}</th>`).join('')}</tr>
      ${rows.map(x => `<tr style="border-top:1px solid #e2e8f0"><td>${iso(x.at)}</td><td>${x.id}</td><td>${esc(x.patient)}</td><td>${esc(x.purpose)}</td><td>${esc(x.method)}</td><td>${esc(gwMeta(x.gw).name)}</td><td align="right">${inr(x.gross)}</td><td align="right">${inr(x.fee)}</td><td align="right">${inr(x.gst)}</td><td align="right">${inr(x.net)}</td><td>${STATUS[x.status][0]}</td></tr>`).join('')}
      <tr style="border-top:2px solid #0f172a;font-weight:700"><td colspan="6">Totals (${ok.length} successful)</td><td align="right">${inr(s('gross'))}</td><td align="right">${inr(s('fee'))}</td><td align="right">${inr(s('gst'))}</td><td align="right">${inr(s('net'))}</td><td></td></tr></table></body>`);
    w.document.close(); w.focus(); w.print();
  });

  on('ps-open', (el, ev) => { if (ev.target.closest('input')) return; openTxn(el.dataset.id); });
  function openTxn(id) {
    const x = A().txns.find(t => t.id === id); if (!x) return;
    const S = STATUS[x.status], gm = gwMeta(x.gw), at = x.at;
    const tl = [['Order created', 'file-plus', at, true], ['Payment authorised', 'shield-check', new Date(+at + 8000), x.status !== 'failed'],
      ['Captured', 'circle-check', new Date(+at + 12000), ['captured', 'settled', 'refunded'].includes(x.status)],
      ...(x.status === 'failed' ? [['Failed — bank declined', 'circle-x', new Date(+at + 9000), true]] : []),
      ...(x.status === 'refunded' ? [['Refunded to source', 'undo-2', new Date(+at + 86400000), true]] : []),
      ['Settled to bank', 'landmark', addDays(at, 2), x.status === 'settled']];
    const row = (k, v) => `<div class="flex justify-between gap-3 py-1.5 text-sm"><span class="text-slate-500 dark:text-slate-400">${k}</span><span class="text-right font-medium">${v}</span></div>`;
    const canRefund = can('payment:refund') && ['captured', 'settled'].includes(x.status);
    modal({ title: inr(x.gross) + ' · ' + x.purpose, icon: S[2], tone: S[1], size: 'max-w-2xl', sub: `${esc(x.patient)} · ${esc(x.mrn)} · ${fmtDate(at)} ${at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
      body: `<div class="grid gap-6 md:grid-cols-2">
        <div><p class="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Payment</p><div class="divide-y divide-slate-100 dark:divide-slate-800">
          ${row('Status', badge(S[1], S[0], S[2]))}${row('Transaction', `<span class="font-mono text-xs">${x.id}</span>`)}${row('Invoice', `<span class="font-mono text-xs">${x.invoice}</span>`)}
          ${row('Method', esc(x.method) + (x.vpa ? ` · ${esc(x.vpa)}` : x.cardLast4 ? ` · •••• ${x.cardLast4}` : ''))}${row('Gateway', esc(gm.name))}
          ${row('Gateway ref', `<span class="inline-flex items-center gap-1 font-mono text-xs">${esc(x.ref)}${iconBtn('copy', 'Copy', `data-pg="gw-copy" data-v="${esc(x.ref)}"`)}</span>`)}${row('Order ID', `<span class="font-mono text-xs">${esc(x.order)}</span>`)}</div>
          <p class="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Money</p>
          <div class="rounded-xl bg-slate-50 px-3 py-1 dark:bg-slate-800/60">${row('Gross', inr(x.gross))}${row('Gateway fee', '− ' + inr(x.fee))}${row('GST on fee (18%)', '− ' + inr(x.gst))}${x.refund ? row('Refunded', `<span class="text-violet-600">− ${inr(x.refund)}</span>`) : ''}
          <div class="flex justify-between border-t border-slate-200 py-2 text-sm font-semibold dark:border-slate-700"><span>Net to hospital</span><span>${inr(x.net - x.refund > 0 ? x.net - x.refund : 0)}</span></div></div></div>
        <div><p class="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Timeline</p>
          <ol class="relative space-y-4 border-l border-slate-200 pl-5 dark:border-slate-700">${tl.map(([l, i, d, done]) => `<li class="relative"><span class="absolute -left-[31px] grid h-5 w-5 place-items-center rounded-full ${done ? (i === 'circle-x' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white') : 'bg-slate-200 text-slate-400 dark:bg-slate-700'}">${ico(done ? (i === 'circle-x' ? 'x' : 'check') : 'minus', 'h-3 w-3')}</span>
            <p class="text-sm font-medium ${done ? '' : 'text-slate-400'}">${l}</p><p class="text-xs text-slate-400">${done ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Pending'}</p></li>`).join('')}</ol>
          ${x.settlement ? `<div class="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">Settled in <b class="font-mono">${esc(x.settlement)}</b></div>` : ''}</div></div>`,
      foot: `<button type="button" class="mr-auto h-10 rounded-xl px-3 text-sm font-semibold text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-500/10" data-pg="ps-receipt" data-id="${x.id}">${ico('send', 'inline h-4 w-4')} Send receipt</button>
        ${canRefund ? `<button type="button" class="h-10 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10" data-pg="ps-refund" data-id="${x.id}">Refund</button>` : ''}
        <button type="button" class="h-10 rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-700" data-close-modal>Close</button>` });
  }
  on('ps-receipt', el => { const x = A().txns.find(t => t.id === el.dataset.id); toast('Receipt sent', `WhatsApp to ${x.patient} · ${inr(x.gross)} for ${x.invoice}`, 'emerald', 'send'); });
  on('ps-refund', el => {
    const x = A().txns.find(t => t.id === el.dataset.id);
    modal({ title: 'Refund payment', icon: 'undo-2', tone: 'rose', size: 'max-w-md', sub: `${esc(x.patient)} · ${x.id} · paid ${inr(x.gross)} by ${esc(x.method)}`, ok: 'Issue refund',
      body: `<div class="grid gap-4">${field('amount', 'Refund amount (₹)', { req: true, type: 'number', value: x.gross, min: 1, help: `Up to ${inr(x.gross)}. Goes back to the original ${esc(x.method)}.` })}
        ${field('reason', 'Reason', { req: true, opts: [['', 'Choose…'], 'Appointment cancelled', 'Duplicate payment', 'Test not performed', 'Billing error', 'Other'] })}
        ${x.gw !== 'counter' ? note('sky', 'info', `${esc(gwMeta(x.gw).name)} keeps its fee of ${inr(x.fee + x.gst)} on refunds. Patients usually see the money in 5–7 working days.`) : note('amber', 'banknote', 'Hand the cash back at the counter and collect a signature.')}</div>`,
      onSubmit: f => {
        const v = readForm(f, ['amount', 'reason']); if (!v) return false; const amt = Math.round(+v.amount);
        if (!(amt > 0 && amt <= x.gross)) { setErr(f, 'amount', `Between ₹1 and ${inr(x.gross)}`); return false; }
        runSteps({ title: 'Processing refund', icon: 'undo-2', tone: 'rose', steps: x.gw === 'counter' ? ['Recording cash refund', 'Updating invoice', 'Writing audit entry'] : ['Checking refund balance', `Creating refund on ${gwMeta(x.gw).name}`, 'Waiting for refund.processed webhook', 'Updating invoice & ledger'],
          done: { title: 'Refund issued', text: `${inr(amt)} back to ${esc(x.patient)} · ${esc(v.reason)}` },
          onDone: () => { x.status = 'refunded'; x.refund = amt; ui.psFlash = x.id; audit('undo-2', 'rose', `<b>${who()}</b> refunded ${inr(amt)} on ${x.id} — ${esc(v.reason)}`); } });
        return false;
      } });
  });

  on('ps-sim', () => {
    const a = A(), conn = Object.keys(a.gw).filter(k => a.gw[k].status === 'on'), pts = D().patients;
    const pick = Math.floor(Math.random() * pts.length);
    modal({ title: 'Simulate a patient payment', icon: 'zap', size: 'max-w-md', sub: 'Runs the full online flow against a connected gateway', ok: 'Run payment',
      body: `<div class="mb-4 flex justify-end">${autofillBtn('data-pg="sim-fill"')}</div><div class="grid gap-4 sm:grid-cols-2">
        ${field('pt', 'Patient', { full: true, opts: pts.slice(0, 20).map((p, i) => [i, `${p.name} · ${p.mrn}`]), value: pick })}
        ${field('purpose', 'Purpose', { opts: PURPOSES.map(p => p[0]) })}${field('amount', 'Amount (₹)', { req: true, type: 'number', min: 1, ph: '800' })}
        ${field('gw', 'Gateway', { opts: conn.map(k => [k, PROVIDERS[k].name + (a.gw[k].mode === 'test' ? ' (test)' : '')]), value: a.routing.default || conn[0] })}
        ${field('method', 'Method', { opts: ['UPI', 'Card', 'Netbanking', 'Wallet', 'International card'] })}
        ${field('outcome', 'Outcome', { full: true, opts: [['ok', 'Success'], ['fail', 'Bank declines']] })}</div>`,
      onSubmit: f => {
        const v = readForm(f, ['amount']); if (!v) return false; const gross = Math.round(+v.amount); if (!(gross > 0)) { setErr(f, 'amount', 'Enter an amount'); return false; }
        const pm = PROVIDERS[v.gw], fail = v.outcome === 'fail';
        runSteps({ title: `Paying ${inr(gross)} via ${pm.name}`, icon: 'zap', steps: ['Creating order', `Opening ${pm.name} checkout`, v.method === 'UPI' ? 'Waiting for UPI approval on phone' : 'Bank OTP / 3-D Secure', 'Receiving payment webhook', 'Marking invoice paid'],
          failAt: fail ? 2 : undefined, fail: { title: 'Payment failed', text: 'The bank declined the payment (insufficient funds). It’s recorded as Failed in the sheet; the patient can retry from the same link.' },
          done: { title: 'Payment captured', text: `${inr(gross)} from ${esc(pts[+v.pt].name)} — it’s at the top of the sheet.` },
          onDone: () => { const x = mkTxn({ at: new Date(), pt: pts[+v.pt], purpose: v.purpose, gross, gw: v.gw, method: v.method, status: 'captured' }); a.txns.unshift(x); ui.psFlash = x.id; ui.psv = 'txns'; a.gw[v.gw].lastEvent = 'Just now · payment.captured'; } })
          .then(r => { if (r === false && fail) { const x = mkTxn({ at: new Date(), pt: pts[+v.pt], purpose: v.purpose, gross, gw: v.gw, method: v.method, status: 'failed' }); a.txns.unshift(x); ui.psFlash = x.id; rerender(); } });
        return false;
      } });
  });
  on('sim-fill', () => { const f = $('#pgForm'); fillForm(f, { purpose: 'Lab tests', amount: 1450, method: 'UPI', outcome: 'ok' }); toast('Example filled', 'Lab tests · ₹1,450 via UPI', 'amber', 'wand-sparkles'); });

  /* =========================================================================
   * 5) Payment links & UPI QR — sent on WhatsApp (SMS / email as backup)
   * ========================================================================= */
  const LINK_ST = {
    pending: ['Awaiting payment', 'amber', 'hourglass'], paid: ['Paid', 'emerald', 'circle-check'], partial: ['Part paid', 'sky', 'circle-dot'],
    expired: ['Expired', 'slate', 'clock'], cancelled: ['Cancelled', 'rose', 'ban'],
  };
  const EXPIRY = [['1', '24 hours'], ['3', '3 days'], ['7', '7 days'], ['15', '15 days']];
  const vpa = () => `${T().slug}hospital@${A().routing.default === 'stripe' ? 'icici' : 'hdfcbank'}`;
  const upiURI = (amt, note) => `upi://pay?pa=${encodeURIComponent(vpa())}&pn=${encodeURIComponent(A().account.org.brand || T().name)}${amt ? '&am=' + Number(amt).toFixed(2) : ''}&cu=INR${note ? '&tn=' + encodeURIComponent(note) : ''}`;
  const shortURL = code => `https://${T().slug}.hms.com/pay/${code}`;
  const maskPh = p => '+91 ••••• ' + String(p || '').slice(-5);

  // QR as crisp inline SVG (qrcode-generator), with a graceful fallback
  function qrSVG(text, cls = 'h-full w-full') {
    if (!window.qrcode) return `<div class="grid h-full w-full place-items-center bg-slate-100 text-slate-400">${ico('qr-code', 'h-1/2 w-1/2')}</div>`;
    const q = window.qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount(), m = 2; let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
    return `<svg viewBox="0 0 ${n + 2 * m} ${n + 2 * m}" class="${cls}" shape-rendering="crispEdges" role="img" aria-label="UPI QR code"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#0f172a"/></svg>`;
  }

  function linksData() {
    const a = A();
    if (a.links) return a.links;
    const r = rng(T().slug + '-links'), pts = D().patients, now = Date.now(), gw = a.routing.default;
    a.links = [];
    if (!gw) return a.links;
    const dues = D().invoices.filter(i => i.status !== 'paid');
    const seeds = [...dues.map(i => ({ inv: i, amount: i.total - i.paid, purpose: i.items.map(x => x.desc).join(', ') })),
      { amount: 25000, purpose: 'IPD advance' }, { amount: 1450, purpose: 'Lab tests' }, { amount: 3200, purpose: 'Radiology — MRI booking' }, { amount: 800, purpose: 'Teleconsultation' }, { amount: 12500, purpose: 'Day-care procedure' }];
    const sts = ['pending', 'paid', 'paid', 'pending', 'expired', 'paid', 'partial', 'cancelled', 'paid', 'pending'];
    seeds.forEach((s, i) => {
      const p = s.inv ? pts.find(x => x.name === s.inv.patient) || pts[i] : pts[(i * 3 + 2) % pts.length];
      const created = new Date(now - (i * 7 + 1) * 3600000 - r() * 3600000), st = sts[i % sts.length];
      a.links.push({ id: 'plink_' + rstr(10, r), code: rstr(6, r), patient: p.name, mrn: p.mrn, phone: p.phone, invoice: s.inv ? s.inv.id : '', purpose: s.purpose, amount: s.amount,
        paidAmt: st === 'paid' ? s.amount : st === 'partial' ? Math.round(s.amount / 2) : 0, created, expires: addDays(created, st === 'expired' ? -1 : 3), gw, channels: i % 4 === 3 ? ['whatsapp', 'sms'] : ['whatsapp'],
        delivery: st === 'pending' && i % 2 ? 'delivered' : 'read', reminders: st === 'pending' ? i % 3 : 0, status: st, partial: i % 3 === 0, qr: true, by: i % 2 ? 'Front desk' : 'Amit Roy',
        paidAt: st === 'paid' || st === 'partial' ? new Date(+created + (20 + r() * 300) * 60000) : null });
    });
    return a.links;
  }

  /* WhatsApp chat preview — the exact message the patient receives */
  function waPreview(o) {
    const org = A().account.org, name = org.brand || T().name, first = String(o.patient || 'Patient').replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/, '').split(' ')[0];
    const tick = { sent: ['check', 'text-slate-400'], delivered: ['check-check', 'text-slate-400'], read: ['check-check', 'text-sky-500'] }[o.delivery || 'read'];
    return `<div class="mx-auto w-full max-w-[300px] overflow-hidden rounded-[2rem] border-[7px] border-slate-900 bg-slate-900 shadow-2xl shadow-slate-900/30">
      <div class="flex items-center justify-between bg-[#075e54] px-4 pb-1 pt-1.5 text-[10px] font-semibold text-white/90"><span>${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}</span><span class="flex items-center gap-1">${ico('signal', 'h-3 w-3')}${ico('wifi', 'h-3 w-3')}${ico('battery-full', 'h-3.5 w-3.5')}</span></div>
      <div class="flex items-center gap-2.5 bg-[#075e54] px-3 pb-2.5 pt-1 text-white">${ico('arrow-left', 'h-4 w-4 shrink-0')}
        <span class="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-[11px] font-bold text-teal-700">${org.logo ? `<img src="${esc(org.logo)}" alt="" class="h-full w-full object-cover">` : esc(K.initials(name))}</span>
        <div class="min-w-0 flex-1 leading-tight"><p class="flex items-center gap-1 truncate text-[13px] font-semibold">${esc(name)}<span class="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-[#25d366] text-[#075e54]">${ico('check', 'h-2.5 w-2.5')}</span></p><p class="text-[10px] text-white/70">Business account</p></div>
        ${ico('phone', 'h-4 w-4 opacity-80')}${ico('ellipsis-vertical', 'h-4 w-4 opacity-80')}</div>
      <div class="min-h-[400px] space-y-2 p-2.5" style="background-color:#efeae2;background-image:radial-gradient(rgba(0,0,0,.05) 1px,transparent 1px);background-size:12px 12px">
        <p class="mx-auto w-fit rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-500 shadow-sm">Today</p>
        <p class="mx-auto w-fit max-w-[90%] rounded-md bg-[#fff5c4] px-2 py-1 text-center text-[9.5px] leading-snug text-slate-600 shadow-sm">${ico('lock', 'mr-0.5 inline h-2.5 w-2.5')}Messages are end-to-end encrypted. This business uses a secure service from Meta.</p>
        <div class="relative ml-0.5 max-w-[92%] rounded-lg rounded-tl-none bg-white p-1 text-[12.5px] leading-snug text-slate-800 shadow-sm">
          ${o.qr ? `<div class="overflow-hidden rounded-md bg-white p-2"><div class="mx-auto aspect-square w-full max-w-[200px]">${qrSVG(upiURI(o.amount, o.invoice || o.purpose))}</div>
            <p class="mt-1 text-center text-[10px] font-medium text-slate-500">Scan with any UPI app · ${esc(vpa())}</p></div>` : ''}
          <div class="px-1.5 pb-1 pt-1.5"><p>Hello <b>${esc(first)}</b> 👋</p>
            <p class="mt-1">Your bill at <b>${esc(name)}</b> is ready.</p>
            <p class="mt-1.5">🧾 ${o.invoice ? `Invoice <b>${esc(o.invoice)}</b>` : 'Advance payment'}<br>🩺 ${esc(o.purpose || '—')}<br>💰 Amount: <b>${inr(o.amount || 0)}</b>${o.partial ? '<br>✂️ You can pay in parts' : ''}<br>⏳ Pay by <b>${fmtDate(o.expires, { day: 'numeric', month: 'short' })}</b></p>
            <p class="mt-1.5">Pay securely by UPI, card or netbanking 👇</p>
            <p class="mt-1 break-all text-[11px] text-[#027eb5]">${esc(shortURL(o.code || 'xxxxxx'))}</p>
            <p class="-mb-0.5 mt-0.5 flex items-center justify-end gap-0.5 text-[10px] text-slate-400">${new Date(o.created || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}${ico(tick[0], 'h-3.5 w-3.5 ' + tick[1])}</p></div>
          <div class="mt-1 divide-y divide-slate-100 border-t border-slate-100 text-center text-[12.5px] font-medium text-[#027eb5]">
            <p class="flex items-center justify-center gap-1.5 py-2">${ico('external-link', 'h-3.5 w-3.5')}Pay ${inr(o.amount || 0)}</p><p class="flex items-center justify-center gap-1.5 py-2">${ico('file-text', 'h-3.5 w-3.5')}View bill</p></div>
        </div>
        ${o.status === 'paid' || o.status === 'partial' ? `<div class="ml-0.5 max-w-[85%] rounded-lg rounded-tl-none bg-white px-2.5 py-1.5 text-[12.5px] text-slate-800 shadow-sm">✅ Payment of <b>${inr(o.paidAmt)}</b> received. Thank you! Your receipt: <span class="text-[#027eb5]">${esc(shortURL('r-' + (o.code || '')))}</span>
          <p class="text-right text-[10px] text-slate-400">${o.paidAt ? new Date(o.paidAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}</p></div>` : ''}
      </div>
      <div class="flex items-center gap-1.5 bg-[#f0f2f5] px-2 py-2">${ico('smile', 'h-5 w-5 text-slate-500')}<span class="flex-1 rounded-full bg-white px-3 py-1.5 text-[11px] text-slate-400">Message</span><span class="grid h-8 w-8 place-items-center rounded-full bg-[#00a884] text-white">${ico('mic', 'h-4 w-4')}</span></div>
    </div>`;
  }

  function renderLinks(c) {
    const a = A(), links = linksData(), on_ = Object.keys(a.gw).filter(k => a.gw[k].status === 'on');
    const now = Date.now(); links.forEach(l => { if (l.status === 'pending' && +new Date(l.expires) < now) l.status = 'expired'; });
    const f = ui.plf || 'all', q = (ui.plq || '').toLowerCase();
    const rows = links.filter(l => (f === 'all' || l.status === f) && (!q || [l.patient, l.mrn, l.invoice, l.purpose, l.code, l.id, l.phone].join(' ').toLowerCase().includes(q)))
      .sort((x, y) => +new Date(y.created) - +new Date(x.created));
    const paid = links.filter(l => l.paidAmt > 0), pend = links.filter(l => l.status === 'pending' || l.status === 'partial');
    const conv = links.length ? Math.round(links.filter(l => l.status === 'paid').length / links.filter(l => l.status !== 'cancelled').length * 100) : 0;
    const avgMin = paid.length ? Math.round(paid.reduce((s, l) => s + (new Date(l.paidAt) - new Date(l.created)) / 60000, 0) / paid.length) : 0;
    const chIcon = { whatsapp: ['message-circle', 'text-emerald-600'], sms: ['smartphone', 'text-sky-600'], email: ['mail', 'text-violet-600'] };
    const tick = { sent: ['check', 'text-slate-400', 'Sent'], delivered: ['check-check', 'text-slate-400', 'Delivered'], read: ['check-check', 'text-sky-500', 'Read'] };
    const n = s => links.filter(l => l.status === s).length;

    if (!on_.length) {
      c.innerHTML = `<div class="fade-in ${card}">${empty('link', 'Connect a gateway to send payment links', 'Payment links and UPI QR codes are created through your payment gateway, so money is tracked and settled automatically.', btn('primary', 'Connect a gateway', 'plug-zap', 'data-nav="payments:gateways"'))}</div>`;
      return;
    }
    c.innerHTML = `<div class="fade-in space-y-5">
      ${tiles([tile('send', 'teal', 'Links sent (30 days)', links.length), tile('circle-check', 'emerald', 'Collected via links', inr(paid.reduce((s, l) => s + l.paidAmt, 0)), conv + '% paid'),
        tile('hourglass', 'amber', 'Awaiting payment', inr(pend.reduce((s, l) => s + l.amount - l.paidAmt, 0)), pend.length + ' links'), tile('timer', 'sky', 'Avg. time to pay', avgMin ? (avgMin >= 60 ? Math.floor(avgMin / 60) + ' h ' + (avgMin % 60) + ' m' : avgMin + ' min') : '—')])}
      <div class="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div class="${card} min-w-0">
          <div class="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            ${seg('plf', [['all', 'All', links.length], ['pending', 'Pending', n('pending') + n('partial')], ['paid', 'Paid', n('paid')], ['expired', 'Expired', n('expired')]], f === 'partial' ? 'pending' : f)}
            <span class="flex-1"></span>${btn('ghost', 'Counter QR', 'qr-code', 'data-pg="pl-counter"')}${btn('primary', 'Create payment link', 'link', 'data-pg="pl-new"')}</div>
          ${toolbar(search('plq', ui.plq || '', 'Search patient, invoice, phone or link code'))}
          ${table(['Patient', 'For', 'Amount', 'Sent via', 'Status', ''], rows.map(l => { const S = LINK_ST[l.status], tk = tick[l.delivery];
            return `<tr class="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40 ${l.id === ui.plFlash ? 'row-flash' : ''}" data-pg="pl-open" data-id="${l.id}">
              ${td0(`<p class="whitespace-nowrap font-medium text-slate-900 dark:text-white">${esc(l.patient)}</p><p class="whitespace-nowrap font-mono text-[11px] text-slate-400">${esc(maskPh(l.phone))}</p>`)}
              ${td(`<p class="max-w-[200px] truncate">${esc(l.purpose)}</p><p class="font-mono text-[11px] text-slate-400">${l.invoice || 'Advance'} · ${when(l.created)}</p>`)}
              ${td(`<span class="font-semibold tabular-nums">${inr(l.amount)}</span>${l.status === 'partial' ? `<span class="block text-[11px] text-sky-600">${inr(l.paidAmt)} paid</span>` : ''}`, 'text-right')}
              ${td(`<div class="flex items-center gap-1.5">${l.channels.map(ch => ico(chIcon[ch][0], 'h-4 w-4 ' + chIcon[ch][1])).join('')}<span class="inline-flex items-center gap-0.5 text-[11px] text-slate-500">${ico(tk[0], 'h-3.5 w-3.5 ' + tk[1])}${tk[2]}</span></div>${l.reminders ? `<p class="text-[11px] text-slate-400">${l.reminders} reminder${l.reminders > 1 ? 's' : ''}</p>` : ''}`)}
              ${td(badge(S[1], S[0], S[2]))}
              ${td(`<div class="flex justify-end gap-0.5">${iconBtn('qr-code', 'Show QR', `data-pg="pl-qr" data-id="${l.id}"`)}${iconBtn('copy', 'Copy link', `data-pg="gw-copy" data-v="${shortURL(l.code)}"`)}${['pending', 'partial'].includes(l.status) ? iconBtn('bell-ring', 'Send reminder', `data-pg="pl-remind" data-id="${l.id}"`) : ''}</div>`, 'pr-5')}</tr>`; }).join(''), { min: '820px', empty: 'No payment links match.' })}
        </div>
        <aside class="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-1">
          <div class="${card} p-5"><p class="text-sm font-semibold text-slate-900 dark:text-white">How patients see it</p><p class="mb-4 text-xs text-slate-500 dark:text-slate-400">Approved WhatsApp template <span class="font-mono">payment_request</span></p>
            ${waPreview({ patient: 'Ananya Bose', amount: 1450, invoice: 'INV-20934', purpose: 'Lab tests — Lipid profile', code: 'aB3xQ9', expires: addDays(new Date(), 3), qr: true, delivery: 'read' })}</div>
          <div class="${card} p-5 text-[13px] text-slate-600 dark:text-slate-300"><p class="mb-2 font-semibold text-slate-900 dark:text-white">Automatic follow-up</p>
            <ul class="space-y-1.5">${[['bell-ring', 'Reminder after 24 h and 72 h if unpaid'], ['smartphone', 'Falls back to SMS if WhatsApp isn’t delivered in 10 min'], ['receipt', 'Receipt sent on WhatsApp the moment it’s paid'], ['file-check', 'Invoice marked paid & posted to the Payment Sheet']].map(([i, t]) => `<li class="flex gap-2">${ico(i, 'mt-0.5 h-4 w-4 shrink-0 text-teal-600')}${t}</li>`).join('')}</ul></div>
        </aside>
      </div></div>`;
    ui.plFlash = null;
  }

  /* create a link */
  function openCreateLink(pre = {}) {
    const a = A(), pts = D().patients.slice(0, 20), dues = D().invoices.filter(i => i.status !== 'paid'), on_ = Object.keys(a.gw).filter(k => a.gw[k].status === 'on');
    const gw = a.routing.default || on_[0], code = rstr(6);
    const draft = () => { const f = $('#pgForm'); if (!f) return null; const v = Object.fromEntries(new FormData(f).entries()); const p = pts[+v.pt] || pts[0];
      return { patient: p.name, amount: +v.amount || 0, invoice: v.invoice, purpose: v.purpose, code, expires: addDays(new Date(), +v.expiry || 3), qr: !!v.qr, partial: !!v.partial, delivery: 'read' }; };
    modal({ title: 'Create payment link', icon: 'link', size: 'max-w-4xl', sub: 'Sends a secure link and a UPI QR on WhatsApp. Paid links update the bill automatically.', ok: 'Send link',
      body: `<div class="grid gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
        <div><div class="mb-4 flex justify-end">${autofillBtn('data-pg="pl-fill"')}</div>
          <div class="grid gap-4 sm:grid-cols-2">
          ${field('invoice', 'Invoice', { full: true, opts: [['', 'No invoice — advance / deposit'], ...dues.map(i => [i.id, `${i.id} · ${i.patient} · ${inr(i.total - i.paid)} due`])], value: pre.invoice || '' })}
          ${field('pt', 'Patient', { opts: pts.map((p, i) => [i, `${p.name} · ${p.mrn}`]), value: pre.pt ?? 0 })}${field('phone', 'WhatsApp number', { req: true, type: 'tel', value: pts[pre.pt ?? 0].phone, ph: '10-digit mobile' })}
          ${field('purpose', 'Purpose', { req: true, full: true, value: pre.purpose || '', ph: 'e.g. Lab tests — Lipid profile' })}
          ${field('amount', 'Amount (₹)', { req: true, type: 'number', min: 1, value: pre.amount || '', ph: '1450' })}${field('expiry', 'Link valid for', { opts: EXPIRY, value: '3' })}
          ${field('gw', 'Collect through', { opts: on_.map(k => [k, PROVIDERS[k].name + (a.gw[k].mode === 'test' ? ' (test)' : '')]), value: gw })}
          <div><span class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Send on</span><div class="flex gap-1.5">${[['whatsapp', 'WhatsApp', 'message-circle'], ['sms', 'SMS', 'smartphone'], ['email', 'Email', 'mail']].map(([k, l, i]) =>
            `<label class="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-xl border border-slate-200 px-2 py-2 text-xs font-semibold has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50 has-[:checked]:text-teal-800 dark:border-slate-700 dark:has-[:checked]:bg-teal-500/10 dark:has-[:checked]:text-teal-200"><input type="checkbox" name="ch_${k}" class="sr-only" ${k === 'whatsapp' ? 'checked' : ''}>${ico(i, 'h-3.5 w-3.5')}${l}</label>`).join('')}</div></div>
          </div>
          <div class="mt-4 space-y-2.5 rounded-xl bg-slate-50 p-3.5 text-sm dark:bg-slate-800/60">
            <label class="flex items-start gap-2"><input type="checkbox" name="qr" checked class="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600"><span><b>Attach UPI QR</b> <span class="block text-xs text-slate-500">Patients can scan it from another phone or at home</span></span></label>
            <label class="flex items-start gap-2"><input type="checkbox" name="partial" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600"><span><b>Allow part payments</b> <span class="block text-xs text-slate-500">Useful for IPD advances and big procedures</span></span></label>
            <label class="flex items-start gap-2"><input type="checkbox" name="remind" checked class="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600"><span><b>Auto-remind</b> after 24 h and 72 h if unpaid</span></label></div>
        </div>
        <div><p class="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Live preview</p><div id="plPreview"></div></div></div>`,
      onSubmit: f => {
        const v = readForm(f, ['phone', 'purpose', 'amount']); if (!v) return false;
        if (!RX.phone.test(v.phone.trim())) { setErr(f, 'phone', '10-digit Indian mobile'); return false; }
        const amount = Math.round(+v.amount); if (!(amount > 0)) { setErr(f, 'amount', 'Enter an amount'); return false; }
        const inv = dues.find(i => i.id === v.invoice); if (inv && amount > inv.total - inv.paid) { setErr(f, 'amount', `Only ${inr(inv.total - inv.paid)} is due on ${inv.id}`); return false; }
        const channels = ['whatsapp', 'sms', 'email'].filter(k => v['ch_' + k]); if (!channels.length) { toast('Pick at least one channel', '', 'amber', 'triangle-alert'); return false; }
        const p = pts[+v.pt], pm = PROVIDERS[v.gw];
        const link = { id: 'plink_' + rstr(10), code, patient: p.name, mrn: p.mrn, phone: v.phone.trim(), invoice: v.invoice, purpose: v.purpose, amount, paidAmt: 0, created: new Date(), expires: addDays(new Date(), +v.expiry),
          gw: v.gw, channels, delivery: 'sent', reminders: 0, status: 'pending', partial: !!v.partial, qr: !!v.qr, remind: !!v.remind, by: ROLES[H().state.role].person, paidAt: null };
        runSteps({ title: 'Sending payment link', icon: 'send', steps: [`Creating ${inr(amount)} order on ${pm.name}`, 'Generating short link' + (link.qr ? ' & UPI QR' : ''),
            ...(channels.includes('whatsapp') ? ['Sending WhatsApp template “payment_request”'] : []), ...(channels.includes('sms') ? ['Sending SMS (DLT-approved template)'] : []), ...(channels.includes('email') ? ['Sending email'] : []), `Delivered to ${maskPh(link.phone)}`],
          done: { title: 'Payment link sent', text: `${esc(p.name)} got ${inr(amount)} on ${channels.map(c_ => ({ whatsapp: 'WhatsApp', sms: 'SMS', email: 'email' }[c_])).join(' + ')}. You’ll see it turn green here when paid.`,
            actions: btn('ghost', 'Copy link', 'copy', `data-pg="gw-copy" data-v="${shortURL(code)}"`, 'h-10 px-4') },
          onDone: () => { link.delivery = 'delivered'; linksData().unshift(link); ui.plFlash = link.id; ui.plf = 'all';
            audit('send', 'teal', `<b>${who()}</b> sent a ${inr(amount)} payment link to ${esc(p.name)} on ${channels.join(' + ')}`);
            setTimeout(() => { if (link.delivery === 'delivered') { link.delivery = 'read'; if (H().state.active === 'payments:links' && !$('#pgModal.open')) rerender(); } }, 8000); } });
        return false;
      } });
    const f = $('#pgForm'), upd = () => { const d = draft(); if (d) $('#plPreview').innerHTML = waPreview(d); H().icons(); };
    f.addEventListener('input', upd);
    f.addEventListener('change', e => {
      const n = e.target.name;
      if (n === 'pt') f.elements.phone.value = pts[+e.target.value].phone;
      if (n === 'invoice' && e.target.value) { const inv = dues.find(i => i.id === e.target.value), pi = pts.findIndex(p => p.name === inv.patient);
        if (pi >= 0) { f.elements.pt.value = pi; f.elements.phone.value = pts[pi].phone; } f.elements.amount.value = inv.total - inv.paid; f.elements.purpose.value = inv.items.map(x => x.desc).join(', '); }
      upd();
    });
    upd();
  }
  on('pl-new', () => { if (H().state.active !== 'payments:links') { H().navigate('payments:links'); if (!unlocked()) return; } openCreateLink(); });
  on('pl-fill', () => { const f = $('#pgForm'), inv = D().invoices.find(i => i.status !== 'paid');
    if (inv) { f.elements.invoice.value = inv.id; f.elements.invoice.dispatchEvent(new Event('change', { bubbles: true })); }
    else fillForm(f, { purpose: 'Lab tests — Lipid profile', amount: 1450 });
    toast('Example filled', 'An unpaid invoice was picked — check the preview on the right.', 'amber', 'wand-sparkles'); });

  /* link detail */
  on('pl-open', (el, ev) => { if (ev.target.closest('button')) return; openLink(el.dataset.id); });
  function openLink(id) {
    const l = linksData().find(x => x.id === id); if (!l) return;
    const S = LINK_ST[l.status], open_ = ['pending', 'partial'].includes(l.status);
    const tl = [['Link created', 'link', l.created, true, l.by], ['Sent on ' + l.channels.map(c_ => ({ whatsapp: 'WhatsApp', sms: 'SMS', email: 'email' }[c_])).join(' + '), 'send', new Date(+new Date(l.created) + 4000), true],
      ['Delivered', 'check-check', new Date(+new Date(l.created) + 9000), l.delivery !== 'sent'], ['Opened by patient', 'eye', new Date(+new Date(l.created) + 600000), l.delivery === 'read'],
      ...(l.paidAt ? [[l.status === 'partial' ? `Part payment ${inr(l.paidAmt)}` : `Paid ${inr(l.paidAmt)}`, 'circle-check', l.paidAt, true]] : []),
      ...(l.status === 'expired' ? [['Expired unpaid', 'clock', l.expires, true]] : []), ...(l.status === 'cancelled' ? [['Cancelled', 'ban', l.expires, true]] : [])];
    const row = (k, v) => `<div class="flex justify-between gap-3 py-1.5 text-sm"><span class="text-slate-500 dark:text-slate-400">${k}</span><span class="text-right font-medium">${v}</span></div>`;
    modal({ title: `${inr(l.amount)} · ${esc(l.patient)}`, icon: S[2], tone: S[1], size: 'max-w-3xl', sub: `${esc(l.purpose)}${l.invoice ? ' · ' + l.invoice : ''}`,
      body: `<div class="grid gap-6 md:grid-cols-[minmax(0,1fr)_300px]"><div>
          <div class="divide-y divide-slate-100 dark:divide-slate-800">${row('Status', badge(S[1], S[0], S[2]))}${row('Link', `<span class="inline-flex items-center gap-1 font-mono text-xs">${shortURL(l.code)}${iconBtn('copy', 'Copy', `data-pg="gw-copy" data-v="${shortURL(l.code)}"`)}</span>`)}
            ${row('WhatsApp', esc(maskPh(l.phone)))}${row('Gateway', esc(PROVIDERS[l.gw]?.name || '—'))}${row('Paid', `${inr(l.paidAmt)} of ${inr(l.amount)}`)}${row(l.status === 'pending' ? 'Expires' : 'Valid till', fmtDate(l.expires, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}${row('Reminders sent', l.reminders)}</div>
          <p class="mb-3 mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Timeline</p>
          <ol class="relative space-y-3.5 border-l border-slate-200 pl-5 dark:border-slate-700">${tl.map(([t_, i, d, done, by]) => `<li class="relative"><span class="absolute -left-[31px] grid h-5 w-5 place-items-center rounded-full ${done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400 dark:bg-slate-700'}">${ico(done ? 'check' : 'minus', 'h-3 w-3')}</span>
            <p class="text-sm font-medium ${done ? '' : 'text-slate-400'}">${t_}</p><p class="text-xs text-slate-400">${done ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + (by ? ' · ' + esc(by) : '') : 'Not yet'}</p></li>`).join('')}</ol></div>
        <div>${waPreview(l)}</div></div>`,
      foot: `${open_ ? `<button type="button" class="mr-auto h-10 rounded-xl px-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10" data-pg="pl-cancel" data-id="${l.id}">Cancel link</button>` : '<span class="mr-auto"></span>'}
        ${btn('ghost', 'QR code', 'qr-code', `data-pg="pl-qr" data-id="${l.id}"`, 'h-10 px-4')}
        ${open_ ? btn('ghost', 'Send reminder', 'bell-ring', `data-pg="pl-remind" data-id="${l.id}"`, 'h-10 px-4') + btn('primary', 'Simulate patient pays', 'zap', `data-pg="pl-pay" data-id="${l.id}"`, 'h-10 px-4')
          : l.status === 'expired' ? btn('primary', 'Resend new link', 'rotate-ccw', `data-pg="pl-renew" data-id="${l.id}"`, 'h-10 px-4') : btn('primary', 'Close', '', 'data-close-modal', 'h-10 px-5')}` });
  }

  on('pl-remind', (el, ev) => { ev.stopPropagation(); const l = linksData().find(x => x.id === el.dataset.id); l.reminders++; l.delivery = 'delivered';
    audit('bell-ring', 'teal', `<b>${who()}</b> sent a payment reminder to ${esc(l.patient)}`); toast('Reminder sent on WhatsApp', `${l.patient} · ${inr(l.amount - l.paidAmt)} due`, 'emerald', 'bell-ring');
    if ($('#pgModal.open')) openLink(l.id); else rerender(); });
  on('pl-cancel', el => { const l = linksData().find(x => x.id === el.dataset.id);
    H().confirmDialog({ title: 'Cancel this payment link?', icon: 'ban', ok: 'Cancel link', text: `The link stops working right away. ${esc(l.patient)} sees “This link has been cancelled” if they open it.`,
      onOk: () => { l.status = 'cancelled'; l.expires = new Date(); audit('ban', 'rose', `<b>${who()}</b> cancelled a ${inr(l.amount)} payment link for ${esc(l.patient)}`); H().closeModal('pgModal'); toast('Link cancelled', l.patient, 'rose', 'ban'); rerender(); } }); });
  on('pl-renew', el => { const l = linksData().find(x => x.id === el.dataset.id), pts = D().patients.slice(0, 20), pi = Math.max(0, pts.findIndex(p => p.name === l.patient));
    openCreateLink({ pt: pi, purpose: l.purpose, amount: l.amount - l.paidAmt, invoice: D().invoices.some(i => i.id === l.invoice && i.status !== 'paid') ? l.invoice : '' }); });
  on('pl-pay', el => {
    const l = linksData().find(x => x.id === el.dataset.id), due = l.amount - l.paidAmt, pm = PROVIDERS[l.gw];
    runSteps({ title: `${l.patient.split(' ')[0]} is paying ${inr(due)}`, icon: 'zap', steps: ['Patient opened the link on WhatsApp', `${pm.name} checkout loaded`, 'UPI payment approved in PhonePe', 'payment.captured webhook received', l.invoice ? `${l.invoice} marked paid` : 'Advance added to patient account', 'Receipt sent on WhatsApp'],
      done: { title: 'Paid via link', text: `${inr(due)} from ${esc(l.patient)} — added to the Payment Sheet.` }, noRerender: false,
      onDone: () => {
        l.paidAmt = l.amount; l.status = 'paid'; l.paidAt = new Date(); l.delivery = 'read'; ui.plFlash = l.id;
        const pt = D().patients.find(p => p.name === l.patient) || { name: l.patient, mrn: l.mrn };
        const x = mkTxn({ at: new Date(), pt, purpose: l.purpose.split(' — ')[0], gross: due, gw: l.gw, method: 'UPI', status: 'captured' });
        x.invoice = l.invoice || '—'; x.by = 'WhatsApp payment link'; x.vpa = pt.name.split(' ')[0].toLowerCase() + '@ybl'; A().txns.unshift(x);
        const inv = D().invoices.find(i => i.id === l.invoice); if (inv) { inv.paid = Math.min(inv.total, inv.paid + due); inv.status = inv.paid >= inv.total ? 'paid' : 'partial'; inv.mode = 'UPI'; }
        audit('circle-check', 'emerald', `${esc(l.patient)} paid ${inr(due)} via WhatsApp payment link${l.invoice ? ' for ' + l.invoice : ''}`);
        H().notify && H().notify({ tone: 'emerald', icon: 'indian-rupee', title: 'Payment received', text: `${l.patient} paid ${inr(due)} via payment link` });
      } });
  });

  /* QR modal (per link) and counter QR (any amount) */
  function qrModal(o) {
    modal({ title: o.title, icon: 'qr-code', size: 'max-w-sm', sub: o.sub, foot: false,
      body: `<div class="text-center"><div id="qrBox" class="mx-auto w-full max-w-[240px] rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">${qrSVG(o.uri)}</div>
        ${o.amountInput ? `<label class="mx-auto mt-4 block max-w-[240px] text-left"><span class="mb-1.5 block text-sm font-medium">Amount (optional)</span><input type="number" min="1" class="field text-center text-lg font-semibold" placeholder="Patient enters amount" data-pg-input="qr-amt"></label>` : `<p class="mt-4 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">${inr(o.amount)}</p>`}
        <p class="mt-2 font-mono text-xs text-slate-500">${esc(vpa())}</p>
        <div class="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-400">${['GPay', 'PhonePe', 'Paytm', 'BHIM', 'Any UPI app'].map(x => `<span class="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">${x}</span>`).join('')}</div>
        <div class="mt-5 grid grid-cols-2 gap-2">${btn('ghost', 'Download', 'download', 'data-pg="qr-dl"', 'h-10 px-3')}${btn('ghost', 'Print', 'printer', 'data-pg="qr-print"', 'h-10 px-3')}</div>
        ${o.link ? `<div class="mt-2">${btn('soft', 'Send on WhatsApp again', 'message-circle', `data-pg="pl-remind" data-id="${o.link}"`, 'h-10 px-3 w-full')}</div>` : ''}</div>` });
    qrState = { uri: o.uri, label: o.label };
  }
  let qrState = null;
  on('pl-qr', (el, ev) => { ev.stopPropagation(); const l = linksData().find(x => x.id === el.dataset.id);
    qrModal({ title: 'UPI QR code', sub: `${esc(l.patient)} · ${esc(l.purpose)}`, uri: upiURI(l.amount - l.paidAmt || l.amount, l.invoice || l.purpose), amount: l.amount - l.paidAmt || l.amount, label: l.invoice || l.code, link: ['pending', 'partial'].includes(l.status) ? l.id : '' }); });
  on('pl-counter', () => qrModal({ title: 'Counter QR', sub: 'Show this at the billing desk. Payments show up in the Payment Sheet.', uri: upiURI(0, 'Counter'), amountInput: true, label: 'counter' }));
  K.onInput('qr-amt', el => { const amt = +el.value > 0 ? +el.value : 0; qrState.uri = upiURI(amt, 'Counter'); $('#qrBox').innerHTML = qrSVG(qrState.uri); });
  on('qr-dl', () => { const svg = $('#qrBox svg'); if (!svg) return; const blob = new Blob([svg.outerHTML.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"')], { type: 'image/svg+xml' }),
    u = URL.createObjectURL(blob), a_ = document.createElement('a'); a_.href = u; a_.download = `upi-qr-${qrState.label}.svg`; document.body.appendChild(a_); a_.click(); a_.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000); toast('QR downloaded', 'SVG — prints sharp at any size', 'teal', 'download'); });
  on('qr-print', () => { const svg = $('#qrBox svg'), w = window.open('', '_blank', 'width=520,height=700'); if (!w || !svg) return toast('Pop-up blocked', 'Allow pop-ups to print.', 'amber', 'printer');
    w.document.write(`<!doctype html><meta charset="utf-8"><title>UPI QR</title><body style="font-family:system-ui,sans-serif;text-align:center;padding:40px;color:#0f172a"><h2 style="margin:0">${esc(A().account.org.brand || T().name)}</h2><p style="color:#64748b">Scan to pay with any UPI app</p><div style="width:320px;margin:24px auto">${svg.outerHTML}</div><p style="font-family:monospace">${esc(vpa())}</p></body>`);
    w.document.close(); w.focus(); w.print(); });

  /* =========================================================================
   * Security gate — 6-digit PIN, or a one-time code by SMS / WhatsApp / email.
   * Guards Account details, Payment gateways and the Payment sheet.
   * Demo: any 6-digit PIN works; the OTP is shown in a notification.
   * ========================================================================= */
  const GATE_MIN = 15;
  const gate = { until: 0, step: 'pin', method: 'whatsapp', code: '', sentAt: 0, tries: 0, err: '', busy: false, newPin: false };
  const unlocked = () => Date.now() < gate.until;
  const GATED = { account: 'Account details', 'payments:gateways': 'Payment gateways', 'payments:sheet': 'Payment sheet', 'payments:links': 'Payment links' };
  const CHANNELS = {
    sms:      { label: 'SMS', icon: 'smartphone', tone: 'sky', eta: 'Usually arrives in 10 seconds' },
    whatsapp: { label: 'WhatsApp', icon: 'message-circle', tone: 'emerald', eta: 'Instant · works on Wi-Fi' },
    email:    { label: 'Email', icon: 'mail', tone: 'violet', eta: 'Check spam if it’s not there in a minute' },
  };
  const dest = m => { const o = A().account.owner, ph = String(o.phone || '').slice(-4), em = String(o.email || '');
    return m === 'email' ? em.replace(/^(.)[^@]*(@.*)$/, '$1•••$2') : `+91 ••••• •${ph}`; };

  const secure = fn => c => { if (unlocked()) { fn(c); lockBar(c); } else renderGate(c); };
  function lockBar(c) {
    const m = Math.max(1, Math.ceil((gate.until - Date.now()) / 60000));
    c.insertAdjacentHTML('afterbegin', `<div class="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
      ${ico('lock-open', 'h-3.5 w-3.5')}<span><b>Secure area unlocked</b> · auto-locks in ${m} min</span><span class="flex-1"></span>
      <button type="button" class="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-500/20" data-pg="gate-lock">${ico('lock', 'h-3.5 w-3.5')}Lock now</button></div>`);
  }
  setInterval(() => { const s = H() && H().state; if (s && GATED[s.active] && gate.until && !unlocked() && !document.querySelector('#gateCard') && !document.querySelector('.modal.open')) { gate.until = 0; rerender(); toast('Locked', 'Payment & account pages locked after 15 minutes', 'slate', 'lock'); } }, 20000);

  const boxes = kind => `<div class="otp-row flex justify-center gap-2 sm:gap-2.5" data-kind="${kind}">${Array.from({ length: 6 }, (_, i) =>
    `${i === 3 ? '<span class="w-1 sm:w-2"></span>' : ''}<input class="otp-box h-12 w-10 rounded-xl border-2 border-slate-200 bg-white text-center text-xl font-bold tabular-nums text-slate-900 caret-teal-600 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 sm:h-14 sm:w-12 sm:text-2xl dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      type="${kind === 'pin' ? 'password' : 'text'}" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="${i === 0 && kind === 'otp' ? 'one-time-code' : 'off'}" aria-label="Digit ${i + 1} of 6">`).join('')}</div>`;
  const primary = (label, icon, attrs = '') => `<button type="button" id="gateGo" class="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 text-[15px] font-semibold text-white shadow-sm shadow-teal-600/20 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40" ${attrs}>${ico(icon)}${label}</button>`;
  const back = (label, step) => `<button type="button" class="mb-5 inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200" data-pg="gate-step" data-step="${step}">${ico('arrow-left')}${label}</button>`;
  const head = (icon, tn, title, sub) => `<span class="mx-auto grid h-16 w-16 place-items-center rounded-2xl ${tn === 'teal' ? 'bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-lg shadow-teal-600/25' : K.tone(tn)}">${ico(icon, 'h-7 w-7')}</span>
    <h2 class="mt-5 text-center text-xl font-bold tracking-tight text-slate-900 dark:text-white">${title}</h2><p class="mx-auto mt-1.5 max-w-xs text-center text-sm text-slate-500 dark:text-slate-400">${sub}</p>`;
  const errLine = () => `<p id="gateErr" class="mt-3 min-h-[20px] text-center text-sm font-medium text-rose-600" role="alert">${esc(gate.err)}</p>`;
  const demo = txt => `<p class="mt-5 flex items-center justify-center gap-1.5 text-xs text-amber-700 dark:text-amber-300"><span class="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider dark:bg-amber-500/20">Demo</span>${txt}</p>`;

  function renderGate(c) {
    const page = GATED[H().state.active] || 'This page', s = gate.step;
    let body = '';
    if (s === 'pin') body = `${head('lock-keyhole', 'teal', gate.newPin ? 'Set a new security PIN' : 'Enter your security PIN', gate.newPin ? 'Choose 6 digits you’ll remember. Avoid birthdays and 123456.' : `<b class="text-slate-700 dark:text-slate-200">${esc(page)}</b> holds bank details and payment keys. Confirm it’s you.`)}
      <div class="mt-7">${boxes('pin')}</div>${errLine()}
      ${primary(gate.newPin ? 'Save PIN' : 'Unlock', gate.newPin ? 'save' : 'lock-open', 'data-pg="gate-go" disabled')}
      <div class="mt-4 flex items-center justify-center gap-2 text-sm"><span class="text-slate-500 dark:text-slate-400">Forgot your PIN?</span><button type="button" class="font-semibold text-teal-700 hover:underline dark:text-teal-400" data-pg="gate-step" data-step="method">Try another way</button></div>
      ${demo('Any 6 digits unlock for now')}`;
    if (s === 'method') body = `${back('Use PIN instead', 'pin')}${head('key-round', 'violet', 'Get a one-time code', 'We’ll send a 6-digit code to the owner’s saved contact. Pick where.')}
      <div class="mt-6 space-y-2.5" role="radiogroup">${Object.entries(CHANNELS).map(([k, ch]) => `<label class="group flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-slate-200 p-3.5 transition hover:border-slate-300 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50/60 dark:border-slate-700 dark:hover:border-slate-600 dark:has-[:checked]:bg-teal-500/10">
        <input type="radio" name="gateMethod" value="${k}" class="peer sr-only" data-pg-change="gate-method" ${gate.method === k ? 'checked' : ''}>
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl ${K.tone(ch.tone)}">${ico(ch.icon, 'h-5 w-5')}</span>
        <span class="min-w-0 flex-1"><span class="block text-sm font-semibold text-slate-900 dark:text-white">${ch.label}</span><span class="block truncate font-mono text-xs text-slate-600 dark:text-slate-300">${esc(dest(k))}</span><span class="block text-[11px] text-slate-400">${ch.eta}</span></span>
        <span class="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-slate-300 text-white transition peer-checked:border-teal-600 peer-checked:bg-teal-600 dark:border-slate-600">${ico('check', 'h-3 w-3')}</span></label>`).join('')}</div>
      ${errLine()}${primary('Send code', 'send', 'data-pg="gate-send"')}
      <p class="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">No access to any of these? <button type="button" class="font-semibold text-teal-700 hover:underline dark:text-teal-400" data-pg="gate-support">Contact platform support</button></p>`;
    if (s === 'otp') { const ch = CHANNELS[gate.method];
      body = `${back('Choose another method', 'method')}${head(ch.icon, ch.tone, 'Enter the 6-digit code', `Sent by <b class="text-slate-700 dark:text-slate-200">${ch.label}</b> to <span class="font-mono">${esc(dest(gate.method))}</span>`)}
      <div class="mt-7">${boxes('otp')}</div>${errLine()}
      ${primary('Verify & unlock', 'shield-check', 'data-pg="gate-go" disabled')}
      <div class="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm"><span class="text-slate-500 dark:text-slate-400">Didn’t get it?</span><span id="gateTimer"></span></div>
      ${demo('The code is in the notification, top-right')}`; }
    c.innerHTML = `<div class="fade-in grid min-h-[calc(100vh-260px)] place-items-center py-4">
      <div id="gateCard" class="relative w-full max-w-[440px] overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 pb-7 pt-8 shadow-xl shadow-slate-900/5 sm:px-9 dark:border-slate-800 dark:bg-slate-900">
        <div class="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-teal-50 to-transparent dark:from-teal-500/10"></div>
        <div class="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" style="background-image:radial-gradient(rgba(13,148,136,.35) 1px,transparent 1px);background-size:16px 16px"></div>
        <div class="relative step-in" id="gateBody">${body}</div>
        <p class="relative mt-7 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-4 text-[11px] text-slate-400 dark:border-slate-800">${ico('shield-check', 'h-3.5 w-3.5')}Stays unlocked ${GATE_MIN} min on this device · every unlock is audited</p>
      </div></div>`;
    H().icons();
    if (s === 'pin' || s === 'otp') bindBoxes(c.querySelector('.otp-row'), v => submitGate(v));
    if (s === 'otp') tickTimer();
  }

  function bindBoxes(row, onFull) {
    const bx = [...row.querySelectorAll('.otp-box')], val = () => bx.map(b => b.value).join('');
    const sync = () => { bx.forEach(b => { b.classList.toggle('border-teal-500', !!b.value); b.classList.toggle('bg-teal-50', !!b.value); b.classList.toggle('dark:bg-teal-500/10', !!b.value); });
      const go = $('#gateGo'); if (go && !gate.busy) go.disabled = val().length < 6; };
    const clearErr = () => { if (gate.err) { gate.err = ''; const e = $('#gateErr'); if (e) e.textContent = ''; bx.forEach(b => b.classList.remove('!border-rose-400')); } };
    const fillFrom = (i, d) => { for (let k = 0; k < d.length && i + k < 6; k++) bx[i + k].value = d[k]; bx[Math.min(5, i + d.length)].focus(); clearErr(); sync(); if (val().length === 6) onFull(val()); };
    bx.forEach((b, i) => {
      b.addEventListener('input', () => { const d = b.value.replace(/\D/g, ''); if (d.length > 1) return fillFrom(i, d); b.value = d; clearErr(); if (d && i < 5) bx[i + 1].focus(); sync(); if (val().length === 6) onFull(val()); });
      b.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !b.value && i > 0) { e.preventDefault(); bx[i - 1].value = ''; bx[i - 1].focus(); sync(); }
        else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); bx[i - 1].focus(); }
        else if (e.key === 'ArrowRight' && i < 5) { e.preventDefault(); bx[i + 1].focus(); }
        else if (e.key === 'Enter' && val().length === 6) onFull(val());
        e.stopPropagation();   // keep app keyboard shortcuts out of the code boxes
      });
      b.addEventListener('paste', e => { e.preventDefault(); fillFrom(i, (e.clipboardData.getData('text') || '').replace(/\D/g, '')); });
      b.addEventListener('focus', () => b.select());
    });
    row._val = val; row._reset = () => { bx.forEach(b => { b.value = ''; }); sync(); bx[0].focus(); };
    setTimeout(() => bx[0].focus({ preventScroll: true }), 80); sync();
  }

  function setBusy(on_, label) {
    gate.busy = on_; const go = $('#gateGo'); if (!go) return;
    go.disabled = on_; if (on_) { go.dataset.html = go.innerHTML; go.innerHTML = ico('loader-circle', 'h-4 w-4 animate-spin') + label; H().icons(); } else if (go.dataset.html) go.innerHTML = go.dataset.html;
  }
  function failGate(msg) {
    gate.err = msg; const row = document.querySelector('.otp-row'); const e = $('#gateErr'); if (e) e.textContent = msg;
    if (row) { row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake'); row.querySelectorAll('.otp-box').forEach(b => b.classList.add('!border-rose-400')); setTimeout(() => row._reset && row._reset(), 450); }
  }

  async function submitGate(v) {
    if (gate.busy || !/^\d{6}$/.test(v)) return;
    setBusy(true, gate.step === 'pin' ? 'Checking…' : 'Verifying…');
    await sleep(650 + Math.random() * 400); setBusy(false);
    if (!document.querySelector('#gateCard')) return;
    if (gate.step === 'pin') {
      if (gate.newPin && /^(\d)\1{5}$|^123456$|^654321$/.test(v)) return failGate('Too easy to guess — try a less obvious PIN.');
      return unlockGate(gate.newPin ? 'PIN changed' : 'PIN');
    }
    if (Date.now() - gate.sentAt > 10 * 60000) return failGate('This code has expired. Send a new one.');
    if (v !== gate.code) {
      gate.tries++;
      if (gate.tries >= 5) { gate.step = 'method'; gate.err = 'Too many wrong codes. Choose a method to get a new one.'; gate.code = ''; return rerender(); }
      return failGate(`That code isn’t right · ${5 - gate.tries} ${5 - gate.tries === 1 ? 'try' : 'tries'} left`);
    }
    unlockGate(CHANNELS[gate.method].label + ' code');
  }

  function unlockGate(how) {
    const wasNew = gate.newPin;
    gate.until = Date.now() + GATE_MIN * 60000; Object.assign(gate, { step: 'pin', tries: 0, err: '', code: '', newPin: false });
    audit(wasNew ? 'lock-keyhole' : 'lock-open', 'teal', `<b>${who()}</b> ${wasNew ? 'changed the security PIN' : `unlocked payment & account pages (${esc(how)})`}`);
    const b = $('#gateBody');
    if (b) b.innerHTML = `<div class="step-in py-6 text-center"><span class="check-draw mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-500/10 dark:bg-emerald-500/10">
      <svg viewBox="0 0 24 24" class="h-8 w-8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
      <p class="mt-4 text-lg font-bold text-slate-900 dark:text-white">${wasNew ? 'New PIN saved' : 'Verified'}</p><p class="mt-1 text-sm text-slate-500 dark:text-slate-400">${wasNew ? 'Use it next time you open these pages.' : 'Opening ' + esc(GATED[H().state.active] || 'page') + '…'}</p></div>`;
    setTimeout(() => { if (GATED[H().state.active]) rerender(); }, 900);
  }

  let timerId = null;
  function tickTimer() {
    clearInterval(timerId);
    const draw = () => {
      const el = $('#gateTimer'); if (!el) return clearInterval(timerId);
      const left = Math.max(0, 30 - Math.floor((Date.now() - gate.sentAt) / 1000));
      el.innerHTML = left ? `<span class="tabular-nums text-slate-400">Resend in 0:${String(left).padStart(2, '0')}</span>`
        : `<button type="button" class="font-semibold text-teal-700 hover:underline dark:text-teal-400" data-pg="gate-resend">Resend code</button>`;
      if (!left) clearInterval(timerId);
    };
    draw(); timerId = setInterval(draw, 1000);
  }

  async function sendCode(resend) {
    if (gate.busy) return;
    if (!resend) setBusy(true, 'Sending…');
    await sleep(900); setBusy(false);
    const ch = CHANNELS[gate.method];
    gate.code = String(Math.floor(100000 + Math.random() * 900000)); gate.sentAt = Date.now(); gate.tries = 0; gate.err = ''; gate.step = 'otp';
    toast(`${ch.label} · HMS verification`, `Demo code: ${gate.code} — valid for 10 minutes. Never share it.`, ch.tone, ch.icon);
    audit(ch.icon, 'slate', `Verification code sent by ${ch.label} to ${esc(dest(gate.method))}`);
    rerender();
  }

  on('gate-step', el => { gate.step = el.dataset.step; gate.err = ''; if (gate.step === 'pin') gate.tries = 0; rerender(); });
  onChange('gate-method', el => { gate.method = el.value; });
  on('gate-send', () => sendCode(false));
  on('gate-resend', () => sendCode(true));
  on('gate-go', () => { const row = document.querySelector('.otp-row'); if (row && row._val) submitGate(row._val()); });
  on('gate-lock', () => { gate.until = 0; gate.step = 'pin'; toast('Locked', 'Enter your PIN to open these pages again', 'slate', 'lock'); rerender(); });
  on('gate-support', () => toast('Support request sent', 'Platform support verifies the owner by video call, then resets access.', 'sky', 'life-buoy'));

  /* ---------------- register ---------------- */
  K.register({
    subscription:        { title: 'Subscription', sub: 'Your HMS plan, usage, billing cycle and GST invoices.', render: renderSubscription },
    account:             { title: 'Account Details', sub: 'Legal entity, billing contact, settlement bank account and the owner login.', render: secure(renderAccount) },
    'payments:gateways': { title: 'Payment Gateways', sub: 'Connect Razorpay, Stripe and others so patients can pay online.', render: secure(renderGateways) },
    'payments:sheet':    { title: 'Payment Sheet', sub: 'Every payment across gateways and the cash counter, with fees, net and settlements.', render: secure(renderSheet) },
    'payments:links':    { title: 'Payment Links', sub: 'Send a secure payment link and UPI QR on WhatsApp. Paid links update the bill and the sheet.', render: secure(renderLinks) },
  });
})();
