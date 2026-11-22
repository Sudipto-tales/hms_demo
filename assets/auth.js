/* HMS demo — shared helpers for the sign-in pages (login.html + verify.html).
 * Everything here is front-end only: users, OTPs and device trust are faked
 * in localStorage so the flow can be clicked through without a backend. */
const Auth = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const icons = () => window.lucide && lucide.createIcons();
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- demo accounts ---------- */
  const USERS = [
    { id: 'admin', login: ['admin', 'admin@sunhospital.in'], password: 'Admin@123', role: 'admin', name: 'Neha Gupta', title: 'Hospital Admin',
      email: 'neha.gupta@sunhospital.in', phone: '+91 98301 46210', whatsapp: '+91 98301 46210',
      question: 'In which city were you born?', answer: 'pune' },
    { id: 'doctor', login: ['doctor', 'doctor@sunhospital.in'], password: 'Doctor@123', role: 'doctor', name: 'Dr. Arjun Mehta', title: 'Cardiologist' },
    { id: 'reception', login: ['reception', 'reception@sunhospital.in'], password: 'Front@123', role: 'reception', name: 'Riya Das', title: 'Front Desk' },
  ];
  const findUser = (login) => USERS.find((u) => u.login.includes(String(login).trim().toLowerCase()));
  const userById = (id) => USERS.find((u) => u.id === id);

  const maskEmail = (e) => { const [n, d] = e.split('@'); return `${n[0]}${'•'.repeat(Math.max(3, n.length - 2))}${n.slice(-1)}@${d}`; };
  const maskPhone = (p) => { const d = p.replace(/\s/g, ''); return `${d.slice(0, 3)} ${d.slice(3, 5)}•••••${d.slice(-3)}`; };
  const initials = (n) => n.replace(/^Dr\.\s*/, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  /* ---------- device trust (30 days) ---------- */
  const TRUST_DAYS = 30;
  const DAY = 864e5;
  const readTrust = () => { try { return JSON.parse(localStorage.getItem('hms-trusted') || '{}'); } catch (e) { return {}; } };
  const writeTrust = (t) => { try { localStorage.setItem('hms-trusted', JSON.stringify(t)); } catch (e) {} };
  const trustedUntil = (uid) => { const t = readTrust()[uid]; return t && t > Date.now() ? t : 0; };
  const trustDevice = (uid) => { const t = readTrust(); t[uid] = Date.now() + TRUST_DAYS * DAY; writeTrust(t); return t[uid]; };
  const forgetDevice = (uid) => { const t = readTrust(); delete t[uid]; writeTrust(t); };
  const expireDevice = (uid) => { const t = readTrust(); if (t[uid]) { t[uid] = Date.now() - DAY; writeTrust(t); } };
  const fmtDate = (ts) => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  /* ---------- QR session bus (desktop <-> phone) ----------
   * Same-browser demo transport: BroadcastChannel + storage event + polling.
   * A real build would use a server session + websocket / long-poll. */
  const key = (s) => `hms-qr:${s}`;
  let bc = null; try { bc = new BroadcastChannel('hms-auth'); } catch (e) {}
  function post(session, status, extra = {}) {
    const msg = { session, status, t: Date.now(), ...extra };
    try { localStorage.setItem(key(session), JSON.stringify(msg)); } catch (e) {}
    try { bc && bc.postMessage(msg); } catch (e) {}
  }
  function listen(session, cb) {
    let last = 0;
    const handle = (m) => { if (m && m.session === session && m.t > last) { last = m.t; cb(m); } };
    const onBc = (e) => handle(e.data);
    const onStorage = (e) => { if (e.key === key(session) && e.newValue) { try { handle(JSON.parse(e.newValue)); } catch (_) {} } };
    const poll = setInterval(() => { try { const v = localStorage.getItem(key(session)); v && handle(JSON.parse(v)); } catch (_) {} }, 1000);
    bc && bc.addEventListener('message', onBc);
    addEventListener('storage', onStorage);
    return () => { clearInterval(poll); bc && bc.removeEventListener('message', onBc); removeEventListener('storage', onStorage); };
  }
  const token = (n = 10) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
  const genOtp = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1e6).padStart(6, '0');

  /* ---------- toasts ---------- */
  const TONES = {
    teal: 'bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400',
  };
  function toast(title, text = '', tone = 'teal', icon = 'circle-check', ms = 5000) {
    const host = $('#toasts'); if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast pointer-events-auto flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl dark:border-slate-700 dark:bg-slate-800';
    el.innerHTML = `<span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg ${TONES[tone]}"><i data-lucide="${icon}" class="h-4 w-4"></i></span>
      <div class="min-w-0 flex-1"><p class="text-sm font-semibold text-slate-900 dark:text-white">${title}</p>${text ? `<p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">${text}</p>` : ''}</div>
      <button class="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Dismiss"><i data-lucide="x" class="h-3.5 w-3.5"></i></button>`;
    const close = () => { el.classList.add('leaving'); setTimeout(() => el.remove(), 250); };
    el.querySelector('button').onclick = close;
    host.appendChild(el); icons();
    setTimeout(close, ms);
  }
  const demoOtpToast = (otp, via) => toast(`Demo: code sent via ${via}`, `Your code is <b class="font-mono tracking-widest text-slate-800 dark:text-slate-100">${otp}</b> — in production this goes to the device, not the screen.`, 'sky', 'message-square-text', 12000);

  /* ---------- 6-box OTP input ---------- */
  function otpBoxes(host, onFull) {
    host.innerHTML = Array.from({ length: 6 }, (_, i) =>
      `<input inputmode="numeric" autocomplete="${i ? 'off' : 'one-time-code'}" maxlength="1" aria-label="Digit ${i + 1}"
        class="otp-box h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white text-center font-mono text-lg font-semibold text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />`).join('');
    host.classList.add('grid', 'grid-cols-6', 'gap-2');
    const boxes = [...host.querySelectorAll('input')];
    const value = () => boxes.map((b) => b.value).join('');
    const fill = (str, from = 0) => {
      str.replace(/\D/g, '').split('').forEach((d, j) => { if (boxes[from + j]) boxes[from + j].value = d; });
      const next = boxes.find((b) => !b.value); (next || boxes[5]).focus();
      if (value().length === 6) onFull && onFull(value());
    };
    boxes.forEach((b, i) => {
      b.addEventListener('input', () => { const v = b.value.replace(/\D/g, ''); b.value = ''; if (v) fill(v, i); });
      b.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !b.value && i) { boxes[i - 1].value = ''; boxes[i - 1].focus(); e.preventDefault(); }
        if (e.key === 'ArrowLeft' && i) boxes[i - 1].focus();
        if (e.key === 'ArrowRight' && i < 5) boxes[i + 1].focus();
      });
      b.addEventListener('paste', (e) => { e.preventDefault(); fill((e.clipboardData || window.clipboardData).getData('text'), i); });
      b.addEventListener('focus', () => b.select());
    });
    return {
      value, focus: () => boxes[0].focus(),
      clear: () => { boxes.forEach((b) => (b.value = '')); boxes[0].focus(); },
      error: () => { host.classList.remove('shake'); void host.offsetWidth; host.classList.add('shake'); boxes.forEach((b) => b.classList.add('!border-rose-400')); setTimeout(() => boxes.forEach((b) => b.classList.remove('!border-rose-400')), 1200); },
      disable: (on) => boxes.forEach((b) => (b.disabled = on)),
    };
  }

  /* Countdown button: "Resend in 0:30" -> "Resend code" */
  function cooldown(btn, secs, label = 'Resend code') {
    clearInterval(btn._t);
    let left = secs; btn.disabled = true;
    const tick = () => {
      if (left <= 0) { clearInterval(btn._t); btn.disabled = false; btn.textContent = label; return; }
      btn.textContent = `Resend in 0:${String(left).padStart(2, '0')}`; left--;
    };
    tick(); btn._t = setInterval(tick, 1000);
  }

  /* ---------- theme ---------- */
  function initTheme() {
    const btn = $('[data-action="theme"]'); if (!btn) return;
    const sync = () => { const d = document.documentElement.classList.contains('dark'); btn.innerHTML = `<i data-lucide="${d ? 'sun' : 'moon'}" class="h-4 w-4"></i>`; btn.setAttribute('aria-label', d ? 'Switch to light mode' : 'Switch to dark mode'); icons(); };
    btn.onclick = () => { const d = document.documentElement.classList.toggle('dark'); try { localStorage.setItem('hms-theme', d ? 'dark' : 'light'); } catch (e) {} sync(); document.dispatchEvent(new Event('themechange')); };
    sync();
  }

  const device = () => {
    const ua = navigator.userAgent;
    const b = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    const o = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS';
    return `${b} on ${o}`;
  };

  return { $, icons, esc, USERS, findUser, userById, maskEmail, maskPhone, initials, TRUST_DAYS, trustedUntil, trustDevice, forgetDevice, expireDevice, fmtDate,
    post, listen, token, genOtp, toast, demoOtpToast, otpBoxes, cooldown, initTheme, device };
})();
