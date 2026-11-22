/* HMS demo — shared kit for feature pages (pages-*.js).
 * UI helpers, a generic modal, event delegation (data-pg / data-pg-change / data-pg-input),
 * Chart.js lifecycle, and per-tenant sample data generated on first use.
 * Pages register through PG.register({...}) which merges into window.HMSPages
 * (app.js reads that object when it loads, so these files must load before app.js).
 */
(() => {
  'use strict';
  const H = () => window.HMS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const T = () => H().T();
  const can = p => H().hasPerm(p);
  const me = () => ROLES[H().state.role];
  const tone = k => H().TONES[k] || H().TONES.slate;
  const initials = n => String(n).replace(/^Dr\.?\s+/, '').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  /* ---------------- building blocks ---------------- */
  const card = 'rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900';
  const BADGE = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    amber:   'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300',
    rose:    'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300',
    violet:  'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300',
    teal:    'bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-500/10 dark:text-teal-300',
    sky:     'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300',
    slate:   'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300',
  };
  const badge = (t, text, icon) => `<span class="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${BADGE[t] || BADGE.slate}">${icon ? `<i data-lucide="${icon}" class="h-3 w-3"></i>` : ''}${esc(text)}</span>`;
  const avatar = (name, t = 'teal', size = 'h-9 w-9 text-xs') => `<span class="grid ${size} shrink-0 place-items-center rounded-full font-bold ${tone(t)}">${esc(initials(name))}</span>`;
  const ico = (name, cls = 'h-4 w-4') => `<i data-lucide="${name}" class="${cls}"></i>`;
  const tile = (icon, t, label, value, sub) => `<div class="${card} p-4"><div class="flex items-center gap-3">
    <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone(t)}">${ico(icon)}</span>
    <div class="min-w-0"><p class="text-xl font-bold tabular-nums text-slate-900 dark:text-white">${value}</p><p class="truncate text-xs text-slate-500 dark:text-slate-400">${esc(label)}</p></div>
    ${sub ? `<span class="ml-auto self-start text-[11px] font-semibold text-slate-400">${sub}</span>` : ''}</div></div>`;
  const tiles = arr => `<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">${arr.join('')}</div>`;
  const BTN = {
    primary: 'bg-teal-600 text-white shadow-sm hover:bg-teal-700',
    ghost:   'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
    danger:  'bg-rose-600 text-white hover:bg-rose-700',
    soft:    'bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:hover:bg-teal-500/20',
  };
  // btn('primary', 'Add', 'plus', 'data-pg="x"')
  const btn = (kind, label, icon, attrs = '', size = 'h-9 px-3.5') =>
    `<button type="button" class="inline-flex ${size} items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-sm font-semibold transition ${BTN[kind] || BTN.ghost}" ${attrs}>${icon ? ico(icon) : ''}${label ? esc(label) : ''}</button>`;
  const iconBtn = (icon, label, attrs = '') => `<button type="button" class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="${esc(label)}" title="${esc(label)}" ${attrs}>${ico(icon)}</button>`;
  // segmented control: seg('key', [['a','A'],...], current)
  const seg = (key, opts, cur) => `<div class="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist">${opts.map(([v, l, n]) =>
    `<button type="button" role="tab" aria-selected="${v === cur}" class="vt ${v === cur ? 'active' : ''} rounded-lg px-3 py-1.5 text-xs font-semibold transition" data-pg="seg" data-key="${key}" data-val="${esc(v)}">${esc(l)}${n != null ? ` <span class="ml-0.5 text-slate-400">${n}</span>` : ''}</button>`).join('')}</div>`;
  const search = (key, val, ph) => `<div class="relative min-w-[200px] flex-1 sm:max-w-xs">
    ${ico('search', 'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400')}
    <input type="search" value="${esc(val)}" placeholder="${esc(ph)}" class="adm-select w-full !pl-9" data-pg-input="${key}" aria-label="${esc(ph)}" /></div>`;
  const select = (key, opts, cur, label) => `<select class="adm-select" data-pg-change="${key}" aria-label="${esc(label || key)}">${opts.map(o => {
    const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
  const toolbar = inner => `<div class="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">${inner}</div>`;
  const cardHead = (title, sub, right = '') => `<div class="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
    <div class="min-w-0 flex-1"><h3 class="font-semibold text-slate-900 dark:text-white">${esc(title)}</h3>${sub ? `<p class="text-xs text-slate-500 dark:text-slate-400">${sub}</p>` : ''}</div>${right}</div>`;
  // table(['Col', ...], rowsHTML, {min:'760px', empty:'…'})
  const table = (cols, rows, o = {}) => `<div class="overflow-x-auto thin-scroll"><table class="w-full text-left text-sm" style="min-width:${o.min || '720px'}">
    <thead class="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400"><tr class="border-b border-slate-100 dark:border-slate-800">${cols.map((c, i) =>
      `<th class="${i === 0 ? 'pl-5' : ''} px-3 py-3 font-semibold ${/^(Amount|Total|Net|Stock|Qty|Fee|Paid|Due|Gross|Price)/.test(c) ? 'text-right' : ''}">${c}</th>`).join('')}</tr></thead>
    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">${rows || ''}</tbody></table>
    ${rows ? '' : `<div class="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400">${o.empty || 'Nothing to show.'}</div>`}</div>`;
  const td = (html, cls = '') => `<td class="px-3 py-3 align-middle ${cls}">${html}</td>`;
  const td0 = (html, cls = '') => `<td class="py-3 pl-5 pr-3 align-middle ${cls}">${html}</td>`;
  const person = (name, sub, t = 'teal') => `<div class="flex items-center gap-3">${avatar(name, t)}<div class="min-w-0"><p class="truncate font-medium text-slate-900 dark:text-white">${esc(name)}</p>${sub ? `<p class="truncate text-xs text-slate-500 dark:text-slate-400">${sub}</p>` : ''}</div></div>`;
  const empty = (icon, title, text, action = '') => `<div class="px-6 py-14 text-center"><span class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl ${tone('slate')}">${ico(icon, 'h-5 w-5')}</span>
    <p class="font-semibold text-slate-900 dark:text-white">${esc(title)}</p><p class="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">${text}</p>${action ? `<div class="mt-4">${action}</div>` : ''}</div>`;
  const bar = (pct, t = 'teal') => `<div class="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full rounded-full bg-${t}-500 transition-all duration-700" style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>`;
  const dl = pairs => `<dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">${pairs.map(([k, v]) => `<div><dt class="text-xs text-slate-500 dark:text-slate-400">${esc(k)}</dt><dd class="mt-0.5 font-medium text-slate-900 dark:text-white">${v}</dd></div>`).join('')}</dl>`;
  const note = (t, icon, html) => `<div class="flex gap-3 rounded-xl border p-3 text-[13px] ${t === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200' : t === 'rose' ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200' : 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200'}">${ico(icon, 'mt-0.5 h-4 w-4 shrink-0')}<div>${html}</div></div>`;

  /* form fields */
  const field = (name, label, o = {}) => {
    const v = o.value ?? '';
    const ctl = o.opts
      ? `<select name="${name}" class="field">${o.opts.map(x => { const [val, lab] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`
      : o.area ? `<textarea name="${name}" rows="${o.rows || 3}" class="field" placeholder="${esc(o.ph || '')}">${esc(v)}</textarea>`
      : `<input name="${name}" type="${o.type || 'text'}" class="field ${o.mono ? 'font-mono' : ''}" value="${esc(v)}" placeholder="${esc(o.ph || '')}" ${o.step ? `step="${o.step}"` : ''} ${o.min != null ? `min="${o.min}"` : ''} autocomplete="off" />`;
    return `<label class="block ${o.full ? 'sm:col-span-2' : ''}"><span class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">${esc(label)}${o.req ? ' <span class="text-rose-500">*</span>' : ''}</span>${ctl}
      <span class="err mt-1 hidden text-xs text-rose-600"></span>${o.help ? `<span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">${o.help}</span>` : ''}</label>`;
  };
  // validate required fields: returns object of values or null
  function readForm(form, required = []) {
    const vals = Object.fromEntries(new FormData(form).entries());
    let ok = true;
    $$('.field', form).forEach(f => f.classList.remove('invalid'));
    $$('.err', form).forEach(e => e.classList.add('hidden'));
    required.forEach(k => {
      if (!String(vals[k] || '').trim()) {
        ok = false; const f = form.elements[k]; if (!f) return;
        f.classList.add('invalid'); const e = f.parentElement.querySelector('.err'); if (e) { e.textContent = 'Required'; e.classList.remove('hidden'); }
      }
    });
    if (!ok) form.querySelector('.invalid')?.focus();
    return ok ? vals : null;
  }

  /* ---------------- generic modal ---------------- */
  // modal({ title, sub, icon, tone, body, foot, size, onSubmit })
  let submitCb = null;
  function modal(o) {
    submitCb = o.onSubmit || null;
    const p = $('#pgPanel');
    p.className = `modal-panel w-full ${o.size || 'max-w-lg'} rounded-2xl bg-white shadow-2xl dark:bg-slate-900`;
    const tag = o.onSubmit ? 'form' : 'div';
    p.innerHTML = `<${tag} id="pgForm" ${o.onSubmit ? 'novalidate' : ''}>
      <div class="flex items-start gap-3 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
        ${o.icon ? `<span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone(o.tone || 'teal')}">${ico(o.icon, 'h-5 w-5')}</span>` : ''}
        <div class="min-w-0 flex-1"><h3 class="text-lg font-semibold text-slate-900 dark:text-white">${esc(o.title)}</h3>${o.sub ? `<p class="text-sm text-slate-500 dark:text-slate-400">${o.sub}</p>` : ''}</div>
        ${iconBtn('x', 'Close', 'data-close-modal')}</div>
      <div class="max-h-[70vh] overflow-y-auto px-6 py-5 thin-scroll">${o.body}</div>
      ${o.foot !== false ? `<div class="flex flex-wrap justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/30">
        ${o.foot || `<button type="button" class="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800" data-close-modal>Cancel</button>
        ${o.onSubmit ? `<button type="submit" class="h-10 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700">${esc(o.ok || 'Save')}</button>` : ''}`}</div>` : ''}
    </${tag}>`;
    H().icons();
    if (o.onSubmit) $('#pgForm').addEventListener('submit', e => { e.preventDefault(); const r = submitCb && submitCb(e.target); if (r !== false) H().closeModal('pgModal'); });
    H().openModal('pgModal');
  }
  const closeModal = () => H().closeModal('pgModal');

  /* ---------------- events ---------------- */
  const handlers = { click: {}, change: {}, input: {} };
  const on = (name, fn) => { handlers.click[name] = fn; };
  const onChange = (name, fn) => { handlers.change[name] = fn; };
  const onInput = (name, fn) => { handlers.input[name] = fn; };
  // seg control default: ui[key] = val, re-render
  on('seg', el => { ui[el.dataset.key] = el.dataset.val; rerender(); });

  function bind() {
    document.addEventListener('click', ev => {
      const el = ev.target.closest('[data-pg]'); if (!el) return;
      const fn = handlers.click[el.dataset.pg]; if (fn) fn(el, ev);
    });
    document.addEventListener('change', ev => {
      const el = ev.target.closest('[data-pg-change]'); if (!el) return;
      const k = el.dataset.pgChange, fn = handlers.change[k];
      if (fn) fn(el, ev); else { ui[k] = el.type === 'checkbox' ? el.checked : el.value; rerender(); }
    });
    let t = null;
    document.addEventListener('input', ev => {
      const el = ev.target.closest('[data-pg-input]'); if (!el) return;
      const k = el.dataset.pgInput, fn = handlers.input[k];
      if (fn) return fn(el, ev);
      ui[k] = el.value; clearTimeout(t);
      t = setTimeout(() => { const pos = el.selectionStart; rerender(); const n = $(`[data-pg-input="${k}"]`); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) {} } }, 160);
    });
  }
  const rerender = () => H().rerenderPage();

  /* ---------------- charts ---------------- */
  const charts = [];
  function chart(canvas, cfg) {
    if (!window.Chart || !canvas) return null;
    const dark = document.documentElement.classList.contains('dark');
    const grid = dark ? 'rgba(148,163,184,.12)' : 'rgba(148,163,184,.2)', tick = dark ? '#94a3b8' : '#64748b';
    const o = cfg.options || {}, pl = o.plugins || {};
    cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false, animation: { duration: 600 } }, o, {
      plugins: { ...pl, legend: { display: false, ...(pl.legend || {}) }, tooltip: { padding: 10, cornerRadius: 10, boxPadding: 4, ...(pl.tooltip || {}) } } });
    if (cfg.type !== 'doughnut' && cfg.type !== 'pie') {
      cfg.options.scales = cfg.options.scales || {};
      ['x', 'y'].forEach(a => { cfg.options.scales[a] = Object.assign({ grid: { color: a === 'x' ? 'transparent' : grid, drawBorder: false }, border: { display: false }, ticks: { color: tick, font: { size: 11 } } }, cfg.options.scales[a] || {}); });
    }
    const c = new Chart(canvas, cfg); charts.push(c); return c;
  }
  const destroyCharts = () => { while (charts.length) { try { charts.pop().destroy(); } catch (e) {} } };

  /* ---------------- dates ---------------- */
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayISO = () => iso(new Date());
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const fmtDate = (d, o = { day: 'numeric', month: 'short', year: 'numeric' }) => { const x = new Date(d); return isNaN(x) ? '—' : x.toLocaleDateString('en-IN', o); };
  const fmtShort = d => fmtDate(d, { day: 'numeric', month: 'short' });
  const nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const monthName = (off = 0) => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth() + off, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }); };

  /* ---------------- shared page state ---------------- */
  const ui = {};   // pages keep their filters here, keyed by page-specific names

  /* ---------------- per-tenant sample data ---------------- */
  const cache = new WeakMap();
  const D = () => { const t = T(); if (!cache.has(t)) cache.set(t, makeData(t)); return cache.get(t); };

  function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  function makeData(t) {
    const r = seeded(t.slug === 'sun' ? 7 : 31);
    const pick = a => a[Math.floor(r() * a.length)];
    const P = t.slug === 'sun' ? 'SUN' : 'MOON', today = new Date();
    const docs = t.employees.filter(e => e.type === 'Doctor');
    const names = t.slug === 'sun'
      ? ['Rahul Sharma', 'Meera Iyer', 'Sourav Ghosh', 'Fatima Khan', 'Ananya Bose', 'Joseph Mathew', 'Debashis Paul', 'Lakshmi Nair', 'Arnab Chakraborty', 'Pooja Verma', 'Imtiaz Ahmed', 'Riya Sen', 'Subhash Mitra', 'Nandini Roy', 'Kiran Patel', 'Tapas Dutta']
      : ['Kunal Dey', 'Sneha Mondal', 'Arif Hossain', 'Tania Biswas', 'Gopal Chatterjee', 'Moumita Saha', 'Rakesh Pal', 'Shreya Ghoshal'];
    const female = /Meera|Fatima|Ananya|Lakshmi|Pooja|Riya|Nandini|Sneha|Tania|Moumita|Shreya/;
    const apptBy = Object.fromEntries(t.appointments.map(a => [a.patient, a]));
    const patients = names.map((n, i) => {
      const a = apptBy[n];
      return { mrn: a ? a.mrn : `${P}-${String(1700 + i * 37).padStart(t.slug === 'sun' ? 6 : 5, '0')}`, name: n,
        gender: female.test(n) ? 'F' : 'M', age: 6 + Math.floor(r() * 70), phone: '9' + String(800000000 + Math.floor(r() * 199999999)),
        blood: pick(['A+', 'B+', 'O+', 'AB+', 'O-', 'B-']), branch: i % 5 === 4 && t.branches[1] ? 1 : 0,
        lastVisit: iso(addDays(today, -Math.floor(r() * 60))), visits: 1 + Math.floor(r() * 9),
        insurance: r() > .55 ? pick(['Star Health', 'HDFC Ergo', 'Niva Bupa', 'PM-JAY', 'CGHS']) : '',
        doctor: a ? a.doctor : (docs[i % docs.length] || {}).name, consent: r() > .12, allergies: r() > .75 ? pick(['Penicillin', 'Sulfa drugs', 'Peanuts']) : '',
        registered: iso(addDays(today, -Math.floor(r() * 900))) };
    });
    const pt = n => patients.find(p => p.name === n) || patients[0];

    const drugs = [
      ['Paracetamol 650 mg', 'Tablet', 18, 2400, 400], ['Amoxicillin 500 mg', 'Capsule', 62, 42, 120], ['Azithromycin 500 mg', 'Tablet', 95, 260, 80],
      ['Pantoprazole 40 mg', 'Tablet', 48, 980, 200], ['Metformin 500 mg', 'Tablet', 22, 1450, 300], ['Atorvastatin 20 mg', 'Tablet', 88, 610, 150],
      ['Amlodipine 5 mg', 'Tablet', 30, 75, 150], ['Cetirizine 10 mg', 'Tablet', 12, 1320, 200], ['ORS sachet', 'Sachet', 21, 340, 100],
      ['Insulin Glargine', 'Injection', 720, 18, 20], ['Ceftriaxone 1 g', 'Injection', 64, 140, 60], ['Salbutamol inhaler', 'Inhaler', 165, 36, 25],
      ['Ibuprofen 400 mg', 'Tablet', 15, 0, 200], ['Clopidogrel 75 mg', 'Tablet', 54, 420, 100],
    ].map(([name, form, price, stock, reorder], i) => ({ id: 'SKU-' + (2001 + i), name, form, price, stock, reorder,
      batch: 'B' + (24000 + Math.floor(r() * 900)), expiry: iso(addDays(today, i === 2 ? 24 : i === 8 ? 41 : 90 + Math.floor(r() * 600))) }));

    const rxLines = { Cardiology: [['Atorvastatin 20 mg', '1-0-0', '30 days'], ['Clopidogrel 75 mg', '0-0-1', '30 days']], Pediatrics: [['Paracetamol 650 mg', 'SOS', '3 days'], ['ORS sachet', '1-1-1', '3 days']],
      Orthopedics: [['Ibuprofen 400 mg', '1-0-1', '5 days'], ['Pantoprazole 40 mg', '1-0-0', '5 days']], Dermatology: [['Cetirizine 10 mg', '0-0-1', '10 days']],
      'General Medicine': [['Paracetamol 650 mg', '1-1-1', '3 days'], ['Azithromycin 500 mg', '1-0-0', '3 days']], ENT: [['Azithromycin 500 mg', '1-0-0', '5 days'], ['Cetirizine 10 mg', '0-0-1', '5 days']],
      Gynecology: [['Paracetamol 650 mg', 'SOS', '3 days']] };
    const prescriptions = t.appointments.filter(a => a.status === 'completed' || a.status === 'checked-in').concat(t.appointments.slice(3, 5)).map((a, i) => ({
      id: 'RX-' + (7801 + i), patient: a.patient, mrn: a.mrn, doctor: a.doctor, dept: a.dept, date: iso(addDays(today, -i)),
      dx: { Cardiology: 'Essential hypertension (I10)', Pediatrics: 'Acute gastroenteritis (A09)', Orthopedics: 'Low back pain (M54.5)', Dermatology: 'Allergic dermatitis (L23.9)',
            'General Medicine': 'Viral fever (A99)', ENT: 'Acute pharyngitis (J02.9)', Gynecology: 'Routine antenatal check (Z34)' }[a.dept] || 'Follow-up',
      items: (rxLines[a.dept] || rxLines['General Medicine']).map(([d, f, dur]) => ({ drug: d, freq: f, dur, note: f === 'SOS' ? 'If fever > 100°F' : 'After food' })),
      status: i === 0 ? 'sent' : i < 3 ? 'dispensed' : 'issued' }));
    // A handwritten prescription the front desk photographed this morning (see pages-rxscan.js).
    const sa = t.appointments.find(a => a.status === 'completed' && a !== t.appointments[0]) || t.appointments[1];
    if (sa && window.PGRxScan) prescriptions.unshift({ id: 'RX-7799', kind: 'scan', patient: sa.patient, mrn: sa.mrn, doctor: sa.doctor, dept: sa.dept, date: iso(today), dx: 'Paper prescription',
      items: [], status: 'sent', shared: true, uploadedBy: ROLES.receptionist.person, uploadedAt: 'Today 09:52',
      pages: [{ type: 'image', name: 'camera-1.jpg', src: window.PGRxScan.sampleScan(sa.doctor, sa.patient, [['Tab. Paracetamol 650', '1 — 1 — 1 × 3 days, after food'], ['Tab. Cetirizine 10', '0 — 0 — 1 × 5 days'], ['ORS sachet', '1 in 1 L water, sip through the day']]) }] });

    const TESTS = [['Complete Blood Count', 'Haematology', 350], ['Lipid Profile', 'Biochemistry', 650], ['HbA1c', 'Biochemistry', 520], ['Thyroid Profile (T3/T4/TSH)', 'Immunology', 780],
      ['Liver Function Test', 'Biochemistry', 720], ['Urine Routine', 'Pathology', 180], ['Dengue NS1', 'Serology', 900], ['Serum Creatinine', 'Biochemistry', 240]];
    const LSTAT = ['ordered', 'collected', 'processing', 'review', 'released'];
    const labOrders = patients.slice(0, 11).map((p, i) => { const [test, sec, price] = TESTS[i % TESTS.length];
      return { id: 'LAB-' + (5401 + i), patient: p.name, mrn: p.mrn, test, section: sec, price, doctor: p.doctor, priority: i % 4 === 1 ? 'urgent' : 'routine',
        status: LSTAT[[4, 3, 2, 0, 1, 3, 4, 0, 2, 1, 4][i]], at: `${pad(8 + i % 9)}:${pad((i * 17) % 60)}`, critical: i === 1 || i === 5 }; });
    const LAB_RESULTS = {
      'Lipid Profile': [['Total cholesterol', 248, 'mg/dL', '< 200'], ['LDL', 168, 'mg/dL', '< 100'], ['HDL', 38, 'mg/dL', '> 40'], ['Triglycerides', 210, 'mg/dL', '< 150']],
      'Complete Blood Count': [['Haemoglobin', 11.2, 'g/dL', '13 – 17'], ['WBC', 7800, '/µL', '4000 – 11000'], ['Platelets', 2.4, 'lakh/µL', '1.5 – 4.5']],
      HbA1c: [['HbA1c', 7.8, '%', '< 5.7']], 'Thyroid Profile (T3/T4/TSH)': [['TSH', 6.9, 'µIU/mL', '0.4 – 4.0'], ['T4', 7.1, 'µg/dL', '5 – 12']],
      'Liver Function Test': [['SGPT', 64, 'U/L', '< 40'], ['SGOT', 51, 'U/L', '< 40'], ['Bilirubin', 0.9, 'mg/dL', '0.2 – 1.2']],
      'Urine Routine': [['pH', 6, '', '4.5 – 8'], ['Protein', 'Nil', '', 'Nil']], 'Dengue NS1': [['NS1 antigen', 'Positive', '', 'Negative']], 'Serum Creatinine': [['Creatinine', 1.1, 'mg/dL', '0.7 – 1.3']] };

    const radiology = patients.slice(2, 9).map((p, i) => { const [mod, part] = [['X-Ray', 'Chest PA'], ['CT', 'Head (plain)'], ['USG', 'Whole abdomen'], ['MRI', 'Lumbar spine'], ['X-Ray', 'Knee AP/Lat'], ['USG', 'Obstetric'], ['CT', 'Chest HRCT']][i];
      return { id: 'RAD-' + (3301 + i), patient: p.name, mrn: p.mrn, modality: mod, part, doctor: p.doctor, status: ['scheduled', 'reported', 'in-progress', 'scheduled', 'reported', 'awaiting-report', 'awaiting-report'][i],
        slot: `${pad(9 + i)}:${i % 2 ? '30' : '00'}`, room: { 'X-Ray': 'Room 1', CT: 'CT Suite', USG: 'USG 2', MRI: 'MRI Bay' }[mod], critical: i === 1,
        finding: i === 1 ? 'Small acute subdural haematoma, left fronto-parietal. Urgent neurosurgery opinion advised.' : i === 4 ? 'Mild degenerative changes. No fracture.' : '' }; });

    // beds from wards
    const beds = []; let bn = 1, ipn = 0;
    const FN = ['Asha', 'Bimal', 'Chandan', 'Dipika', 'Gita', 'Hari', 'Indrani', 'Jayanta', 'Kalyani', 'Manas', 'Nirmal', 'Parul', 'Rajib', 'Shampa', 'Tarun', 'Uma', 'Bikash', 'Rupa', 'Sujata', 'Amal', 'Mohan', 'Swati', 'Partha'];
    const LN = ['Saha', 'Dey', 'Pal', 'Banerjee', 'Mukherjee', 'Ghosh', 'Bose', 'Das', 'Roy', 'Sarkar', 'Mitra', 'Kundu', 'Halder'];
    const inpatient = () => { const k = ipn++; return { name: `${FN[k % FN.length]} ${LN[(k * 5 + Math.floor(k / FN.length)) % LN.length]}`, mrn: `${P}-${String(900 + k * 13).padStart(6, '0')}`, doctor: (docs[k % Math.max(1, docs.length)] || {}).name }; };
    (t.wards || []).forEach((w, wi) => { for (let i = 0; i < w.total; i++) {
      const occ = i < w.occ, p = occ ? inpatient() : null;
      beds.push({ id: `${w.name.split(' ')[0].slice(0, 3).toUpperCase()}-${pad(i + 1)}`, ward: w.name, status: occ ? (i % 11 === 3 ? 'discharge' : 'occupied') : (i === w.total - 1 ? 'cleaning' : i === w.total - 2 && wi === 1 ? 'reserved' : 'free'),
        patient: p ? p.name : '', mrn: p ? p.mrn : '', since: occ ? iso(addDays(today, -1 - ((i * 3) % 9))) : '', doctor: p ? p.doctor : '',
        tariff: { 'General Ward': 1500, ICU: 9500, 'Private Rooms': 4500, Maternity: 2500, Pediatric: 2000 }[w.name] || 1500 }); bn++; } });

    const emergency = [
      { id: 'ER-901', name: 'Unknown male (~35)', age: 35, gender: 'M', complaint: 'Road traffic accident — head injury', triage: 1, bay: 'Bay 3', doctor: 'Dr. Vikram Singh', arrived: '10:42', status: 'resus', vitals: 'BP 90/60 · HR 128 · SpO₂ 91%' },
      { id: 'ER-902', name: 'Kamala Devi', age: 67, gender: 'F', complaint: 'Chest pain, sweating', triage: 2, bay: 'Bay 1', doctor: 'Dr. Arjun Rao', arrived: '11:05', status: 'treating', vitals: 'BP 150/95 · HR 104 · SpO₂ 95%' },
      { id: 'ER-903', name: 'Rohan Gupta', age: 9, gender: 'M', complaint: 'High fever, vomiting', triage: 3, bay: 'Bay 5', doctor: 'Dr. Kavita Menon', arrived: '11:20', status: 'treating', vitals: 'Temp 103°F · HR 118' },
      { id: 'ER-904', name: 'Sabina Yasmin', age: 28, gender: 'F', complaint: 'Cut on forearm, needs sutures', triage: 4, bay: '—', doctor: '', arrived: '11:31', status: 'waiting', vitals: 'Stable' },
      { id: 'ER-905', name: 'Prabir Saha', age: 52, gender: 'M', complaint: 'Breathlessness', triage: 2, bay: 'Bay 2', doctor: 'Dr. Arjun Rao', arrived: '09:58', status: 'admitted', vitals: 'SpO₂ 89% → 96% on O₂' },
      { id: 'ER-906', name: 'Tina Thomas', age: 19, gender: 'F', complaint: 'Ankle sprain', triage: 5, bay: '—', doctor: '', arrived: '11:40', status: 'waiting', vitals: 'Stable' },
      { id: 'ER-907', name: 'Asit Baran', age: 71, gender: 'M', complaint: 'Fall at home, hip pain', triage: 3, bay: 'Bay 4', doctor: 'Dr. Vikram Singh', arrived: '08:15', status: 'discharged', vitals: 'Stable' },
    ].slice(0, t.slug === 'sun' ? 7 : 0);

    // HR
    const salaryOf = e => ({ Doctor: 145000, Nurse: 32000, HR: 58000, Receptionist: 22000, Accountant: 46000, Pharmacist: 30000, 'Lab Technician': 28000, Administration: 180000, 'Support Staff': 14500 }[e.type] || 20000);
    const attendance = t.employees.filter(e => e.active).map((e, i) => {
      const st = e.name === 'Bablu Mondal' ? 'present' : ['present', 'present', 'present', 'late', 'present', 'absent', 'present', 'leave', 'present', 'half-day'][i % 10];
      return { id: e.id, name: e.name, type: e.type, dept: e.dept, shift: e.type === 'Nurse' || e.type === 'Support Staff' ? (i % 2 ? 'Night' : 'Morning') : 'General',
        status: st, in: st === 'absent' || st === 'leave' ? '' : st === 'late' ? '09:42' : `0${7 + (i % 2)}:${pad(40 + (i * 7) % 19)}`, out: i % 3 === 0 && st !== 'absent' && st !== 'leave' && e.name !== 'Bablu Mondal' ? '17:05' : '', source: i % 3 ? 'Biometric' : 'Mobile app' };
    });
    const leaves = [
      { id: 'LV-311', name: 'Mary Joseph', type: 'Casual', from: iso(addDays(today, 3)), to: iso(addDays(today, 4)), days: 2, reason: 'Family function', status: 'pending', clash: 'ICU night roster short by 1 nurse on day 2' },
      { id: 'LV-312', name: 'Dr. Sana Qureshi', type: 'Earned', from: iso(addDays(today, 10)), to: iso(addDays(today, 16)), days: 7, reason: 'Conference & travel', status: 'pending', clash: '18 OPD appointments booked — need reassignment' },
      { id: 'LV-313', name: 'Sanjay Kumar', type: 'Sick', from: iso(addDays(today, -1)), to: iso(today), days: 2, reason: 'Viral fever', status: 'pending', clash: '' },
      { id: 'LV-308', name: 'Farida Begum', type: 'Casual', from: iso(addDays(today, -9)), to: iso(addDays(today, -9)), days: 1, reason: 'Personal work', status: 'approved', clash: '' },
      { id: 'LV-305', name: 'Priya Das', type: 'Earned', from: iso(addDays(today, -20)), to: iso(addDays(today, -18)), days: 3, reason: 'Vacation', status: 'approved', clash: '' },
      { id: 'LV-302', name: 'Ramesh Das', type: 'Casual', from: iso(addDays(today, -25)), to: iso(addDays(today, -25)), days: 1, reason: 'Not specified', status: 'rejected', clash: 'Peak day — housekeeping short' },
    ].filter(l => t.employees.some(e => e.name === l.name));
    const payroll = t.employees.filter(e => e.active).map((e, i) => {
      const gross = salaryOf(e), lop = i % 7 === 5 ? Math.round(gross / 30) : 0, pf = Math.round(Math.min(gross * .5, 15000) * .12), esi = gross <= 21000 ? Math.round(gross * .0075) : 0, tds = gross > 100000 ? Math.round(gross * .1) : gross > 50000 ? Math.round(gross * .03) : 0;
      return { id: e.id, name: e.name, type: e.type, dept: e.dept, gross, lop, pf, esi, tds, net: gross - lop - pf - esi - tds, days: lop ? 29 : 30, bank: 'XXXX' + (4000 + i * 137) % 9999 };
    });
    const SHIFTS = { M: { label: 'Morning', time: '07:00–15:00', tone: 'amber' }, E: { label: 'Evening', time: '15:00–23:00', tone: 'sky' }, N: { label: 'Night', time: '23:00–07:00', tone: 'violet' }, G: { label: 'General', time: '09:00–17:00', tone: 'teal' }, O: { label: 'Off', time: '', tone: 'slate' } };
    const rostered = t.employees.filter(e => e.active && ['Nurse', 'Doctor', 'Support Staff', 'Receptionist', 'Pharmacist', 'Lab Technician'].includes(e.type));
    const roster = Object.fromEntries(rostered.map((e, i) => [e.id, Array.from({ length: 7 }, (_, d) =>
      e.type === 'Doctor' ? (d === 6 ? 'O' : 'G') : e.type === 'Nurse' || e.type === 'Support Staff' ? 'MENMEOO'[(d + i * 2) % 7] : d === (i % 7) ? 'O' : (i % 2 ? 'E' : 'M'))]));
    const swaps = t.slug === 'sun' ? [{ id: 'SW-21', from: 'Mary Joseph', to: 'Ritika Pal', day: 3, shift: 'N', status: 'pending' }] : [];

    // billing
    const SERV = [['Consultation', 900], ['Lipid Profile', 650], ['Pharmacy', 1240], ['X-Ray Chest', 600], ['Bed charges (2 days)', 3000], ['Dressing', 250], ['ECG', 400], ['CBC', 350]];
    const invoices = patients.slice(0, 12).map((p, i) => {
      const items = [SERV[0], SERV[(i % 7) + 1]].concat(i % 3 === 0 ? [SERV[2]] : []).map(([d, a]) => ({ desc: d, qty: 1, rate: a }));
      const total = items.reduce((s, x) => s + x.qty * x.rate, 0), paid = i % 5 === 2 ? 0 : i % 4 === 1 ? Math.round(total / 2) : total;
      return { id: 'INV-' + (20931 + i), patient: p.name, mrn: p.mrn, date: iso(addDays(today, -Math.floor(i / 3))), items, total, paid,
        mode: paid ? pick(['UPI', 'Cash', 'Card']) : '', status: paid === total ? 'paid' : paid ? 'partial' : 'due', payer: p.insurance && i % 2 ? p.insurance : 'Self' };
    });
    // The portal persona has one unpaid lab bill, so the floating "Pay" button has something to show.
    const me_ = patients.find(p => p.name === ROLES.patient.person);
    if (me_) invoices.push({ id: 'INV-' + (20931 + invoices.length), patient: me_.name, mrn: me_.mrn, date: iso(today), items: [{ desc: 'Lipid Profile', qty: 1, rate: 650 }, { desc: 'ECG', qty: 1, rate: 400 }], total: 1050, paid: 0, mode: '', status: 'due', payer: 'Self' });

    const audit = [
      ['Dr. Anita Sen', 'role.update', 'Gave HR Manager the payroll:process permission', 'Main Branch', '10.0.4.21', 6 * 1440, 'shield-check'],
      ['Priya Das', 'patient.create', 'Registered patient Lakshmi Nair (SUN-002262)', 'Main Branch', '10.0.4.33', 190, 'user-plus'],
      ['Dr. Arjun Rao', 'patient.read', 'Opened EMR of Rahul Sharma (SUN-002184)', 'Main Branch', '10.0.4.51', 45, 'eye'],
      ['Dr. Arjun Rao', 'prescription.issue', 'Issued RX-7801 for Rahul Sharma', 'Main Branch', '10.0.4.51', 40, 'file-text'],
      ['Amit Roy', 'payment.collect', 'Collected ₹4,200 on INV-20931 (UPI)', 'Main Branch', '10.0.4.40', 120, 'indian-rupee'],
      ['Amit Roy', 'payment.refund', 'Refunded ₹650 on INV-20925 — duplicate test', 'Main Branch', '10.0.4.40', 300, 'undo-2'],
      ['Neha Gupta', 'auth.login', 'Signed in (password + OTP)', 'Main Branch', '10.0.4.18', 160, 'log-in'],
      ['Unknown', 'auth.failed', '3 failed sign-in attempts for user “admin”', '—', '103.21.58.9', 260, 'shield-alert'],
      ['Platform Support', 'impersonation.start', 'Support session approved by Dr. Anita Sen (30 min, read-only)', 'Main Branch', '—', 2 * 1440, 'user-cog'],
      ['Dr. Anita Sen', 'credential.reset', 'Reset password for Mary Joseph — sent on WhatsApp', 'Main Branch', '10.0.4.21', 3 * 1440, 'key-round'],
      ['Farida Begum', 'lab.release', 'Released LAB-5401 Lipid Profile', 'Main Branch', '10.0.4.62', 70, 'flask-round'],
      ['Sanjay Kumar', 'stock.dispense', 'Dispensed RX-7802 (2 items)', 'Main Branch', '10.0.4.70', 95, 'pill'],
      ['Dr. Anita Sen', 'export.data', 'Exported audit log (CSV, 30 days)', 'Main Branch', '10.0.4.21', 5 * 1440, 'download'],
      ['Priya Das', 'appointment.cancel', 'Cancelled A-1047 at patient’s request', 'Main Branch', '10.0.4.33', 110, 'calendar-x'],
    ].map(([user, action, text, branch, ip, minsAgo, icon], i) => ({ id: 'EV-' + (88120 - i), user, action, text, branch, ip, at: new Date(Date.now() - minsAgo * 60000), icon }));

    const channels = {
      providers: [
        { key: 'whatsapp', label: 'WhatsApp', icon: 'message-circle', provider: 'Meta Cloud API', sender: '+91 98300 •••21', status: 'live', key_: 'EAAG••••••••••••Zx9', sent: 1842 },
        { key: 'sms', label: 'SMS', icon: 'smartphone', provider: 'MSG91 (DLT)', sender: 'SUNHSP', status: 'live', key_: '3821••••••••••a7f', sent: 3120 },
        { key: 'email', label: 'Email', icon: 'mail', provider: 'Amazon SES', sender: `noreply@${t.slug}.hms.com`, status: 'live', key_: 'AKIA••••••••••QF2', sent: 954 },
      ],
      routes: [
        { purpose: 'otp', label: 'Login OTP', icon: 'key-round', primary: 'sms', fallback: 'whatsapp', locked: true },
        { purpose: 'appointment', label: 'Appointment reminders', icon: 'calendar-check', primary: 'whatsapp', fallback: 'sms' },
        { purpose: 'report', label: 'Lab reports & documents', icon: 'file-text', primary: 'email', fallback: 'whatsapp' },
        { purpose: 'billing', label: 'Bills & receipts', icon: 'receipt', primary: 'whatsapp', fallback: 'email' },
        { purpose: 'staff', label: 'Staff logins & payslips', icon: 'id-card', primary: 'whatsapp', fallback: 'email' },
        { purpose: 'alert', label: 'Clinical alerts (on-call)', icon: 'siren', primary: 'sms', fallback: 'whatsapp' },
        { purpose: 'marketing', label: 'Health camps & offers', icon: 'megaphone', primary: 'off', fallback: 'off', consent: true },
      ],
      templates: [
        { name: 'appt_reminder_v2', ch: 'whatsapp', status: 'approved', text: 'Hi {{name}}, reminder: appointment with {{doctor}} on {{date}} at {{time}}. Reply 1 to confirm.' },
        { name: 'otp_login', ch: 'sms', status: 'approved', text: '{{otp}} is your {{hospital}} login code. Valid 5 min. Do not share.' },
        { name: 'report_ready', ch: 'email', status: 'approved', text: 'Your {{test}} report is ready. Download securely: {{link}}' },
        { name: 'bill_receipt', ch: 'whatsapp', status: 'pending', text: 'Payment of {{amount}} received for {{invoice}}. Thank you.' },
      ],
    };

    const deptMeta = { Cardiology: ['heart-pulse', 'rose', 'OPD 2 · 1st floor'], Pediatrics: ['baby', 'sky', 'OPD 4 · Ground'], Orthopedics: ['bone', 'amber', 'OPD 3 · 1st floor'],
      Dermatology: ['sparkles', 'violet', 'OPD 5 · 2nd floor'], 'General Medicine': ['stethoscope', 'teal', 'OPD 1 · Ground'], Gynecology: ['heart', 'rose', 'OPD 6 · 2nd floor'], ENT: ['ear', 'sky', 'OPD 7 · 2nd floor'],
      Nursing: ['heart-pulse', 'rose', 'All wards'], 'Front Office': ['concierge-bell', 'sky', 'Lobby'], 'Human Resources': ['briefcase', 'violet', 'Admin block'], Accounts: ['calculator', 'amber', 'Admin block'],
      Pharmacy: ['pill', 'emerald', 'Ground floor'], Laboratory: ['flask-round', 'sky', 'Basement'], Administration: ['building-2', 'slate', 'Admin block'], Facilities: ['wrench', 'slate', 'Service block'] };
    const departments = DEPARTMENTS.map((d, i) => { const staff = t.employees.filter(e => e.dept === d); const m = deptMeta[d] || ['layout-grid', 'slate', '—'];
      return { name: d, icon: m[0], tone: m[1], location: m[2], clinical: ['Cardiology', 'Pediatrics', 'Orthopedics', 'Dermatology', 'General Medicine', 'Gynecology', 'ENT'].includes(d),
        head: (staff.find(e => e.type === 'Doctor') || staff[0] || {}).name || '', staff: staff.length, active: t.slug === 'sun' ? !['Gynecology', 'ENT', 'General Medicine'].includes(d) || d === 'General Medicine' : ['General Medicine', 'ENT', 'Gynecology', 'Front Office', 'Nursing', 'Administration'].includes(d),
        branches: [0], services: { Cardiology: ['ECG', 'Echo', 'TMT'], Orthopedics: ['Plaster', 'Physiotherapy'], Laboratory: ['Blood tests', 'Home collection'], Pediatrics: ['Vaccination'], Pharmacy: ['24×7 counter'] }[d] || [] }; });

    const schedules = Object.fromEntries(docs.map((d, i) => [d.id, {
      days: [0, 1, 2, 3, 4, 5, 6].map(k => k === 6 ? null : k === 5 ? (i % 2 ? null : ['10:00', '13:00']) : i === 2 && k === 2 ? ['14:00', '18:00'] : ['09:00', i % 2 ? '13:00' : '17:00']),
      slot: [15, 10, 20, 15][i % 4], maxPerDay: [24, 30, 16, 24][i % 4], tele: i % 2 === 1, room: ['OPD 2', 'OPD 4', 'OPD 3', 'OPD 5', 'OPD 1', 'OPD 7', 'OPD 6'][i % 7],
      leave: i === 3 ? [iso(addDays(today, 10)), iso(addDays(today, 16))] : null }]));

    const encounters = t.appointments.filter(a => a.status !== 'cancelled').map((a, i) => ({ appt: a.id, patient: a.patient, mrn: a.mrn, doctor: a.doctor, dept: a.dept, time: a.time,
      state: a.status === 'completed' ? 'signed' : a.status === 'checked-in' ? 'in-progress' : 'waiting',
      vitals: { bp: ['128/82', '110/70', '146/92', '120/80', '—', '118/76', '—', '—'][i] || '—', pulse: [78, 96, 88, 72, 0, 80, 0, 0][i] || '', temp: ['98.4', '99.1', '98.6', '98.2', '', '98.6', '', ''][i] || '', spo2: [98, 99, 96, 98, 0, 99, 0, 0][i] || '', weight: [72, 18, 81, 64, 0, 70, 0, 0][i] || '' },
      complaint: ['Follow-up for BP', 'Loose stools × 2 days', 'Chest heaviness on exertion', 'Knee pain', 'Cough & cold', 'Itchy rash', '', 'Acne'][i] || '',
      notes: [], dx: a.status === 'completed' ? [{ code: 'I10', label: 'Essential hypertension' }] : [] }));

    return { patients, pt, drugs, prescriptions, labOrders, LAB_RESULTS, radiology, beds, emergency, attendance, leaves, payroll, SHIFTS, roster, swaps, invoices, audit, channels,
      departments, schedules, encounters, salaryOf, TESTS,
      settings: { profile: { legal: t.name + ' Pvt. Ltd.', reg: t.slug === 'sun' ? 'WB/CE/2014/00382' : 'WB/CE/2019/01277', gstin: t.slug === 'sun' ? '19AABCS1429B1Z5' : '19AAGCM8812K1Z2', nabh: t.slug === 'sun', phone: '033 4012 3' + (t.slug === 'sun' ? '400' : '900'), email: `care@${t.slug}.hms.com`, address: t.branches[0].split(' · ')[1] + ', Kolkata, West Bengal' },
        hours: { opd: ['09:00', '19:00'], lab: ['07:00', '21:00'], pharmacy: ['00:00', '23:59'] }, holidays: [['Diwali', '2026-11-08'], ['Christmas', '2026-12-25'], ['Republic Day', '2027-01-26']],
        tax: [['Consultation', 'Exempt (healthcare)', '0%'], ['Pharmacy — medicines', 'GST', '12%'], ['Room rent > ₹5,000/day (non-ICU)', 'GST', '5%'], ['Cosmetic procedures', 'GST', '18%']],
        security: { singleSession: true, otp: true, idle: 15, pwExpiry: 90, ipAllow: false, impersonation: 'approval' } },
    };
  }

  /* ---------------- register ---------------- */
  function register(map) {
    const wrapped = {};
    Object.entries(map).forEach(([id, p]) => { wrapped[id] = { ...p, render: (c, pid) => { destroyCharts(); p.render(c, pid); H().icons(); } }; });
    window.HMSPages = Object.assign(window.HMSPages || {}, wrapped);
  }

  function init() {
    document.getElementById('confirmModal').insertAdjacentHTML('beforebegin',
      `<div id="pgModal" class="modal fixed inset-0 z-[62] grid place-items-center overflow-y-auto bg-slate-900/50 p-4 overlay-blur" role="dialog" aria-modal="true"><div id="pgPanel" class="modal-panel w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-900"></div></div>`);
    bind();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.PG = { H, $, $$, esc, inr, T, D, can, me, tone, initials, card, BADGE, badge, avatar, ico, tile, tiles, btn, iconBtn, seg, search, select, toolbar, cardHead,
    table, td, td0, person, empty, bar, dl, note, field, readForm, modal, closeModal, on, onChange, onInput, rerender, chart, destroyCharts,
    pad, iso, todayISO, addDays, fmtDate, fmtShort, nowTime, monthName, ui, register,
    audit: (icon, t, html) => H().logActivity(icon, t, html), who: () => esc(me().person),
    copy: async (text, label) => { try { await navigator.clipboard.writeText(text); } catch (e) {} H().toast('Copied', label || '', 'teal', 'copy'); } };
})();
