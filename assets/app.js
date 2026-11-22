/* HMS demo — interactions. Plain JS, no build step. */
(() => {
  'use strict';

  /* ---------------- helpers ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const initials = n => n.replace(/^Dr\.?\s+/, '').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const icons = () => window.lucide && lucide.createIcons();
  const isDark = () => document.documentElement.classList.contains('dark');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  const TODAY = new Date();
  const todayISO = () => {
    const d = TODAY; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const nowTime = () => {
    const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const TONES = {
    teal:    'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400',
    sky:     'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    amber:   'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    violet:  'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
    rose:    'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
    slate:   'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };
  const STATUS = {
    confirmed:    { label: 'Confirmed',  cls: 'bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-500/10 dark:text-teal-300', bucket: 'confirmed' },
    'checked-in': { label: 'Checked in', cls: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300',     bucket: 'confirmed' },
    pending:      { label: 'Pending',    cls: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300', bucket: 'pending' },
    completed:    { label: 'Completed',  cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300', bucket: 'completed' },
    cancelled:    { label: 'Cancelled',  cls: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300', bucket: 'cancelled' },
    'with-doctor': { label: 'With doctor', cls: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300', bucket: 'confirmed' },
    'no-show':    { label: 'No-show',    cls: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300', bucket: 'cancelled' },
  };
  const DONUT = [
    { key: 'confirmed', label: 'Confirmed', color: '#0d9488' },
    { key: 'pending',   label: 'Pending',   color: '#d97706' },
    { key: 'completed', label: 'Completed', color: '#059669' },
    { key: 'cancelled', label: 'Cancelled', color: '#e11d48' },
  ];
  // Ordered by priority; a role sees the first 6 it has permission for.
  const CARDS = [
    { key: 'patients',  label: 'Total Patients',       icon: 'users',          tone: 'teal',    perm: 'patient:read' },
    { key: 'doctors',   label: 'Total Doctors',        icon: 'stethoscope',    tone: 'sky',     perm: 'doctor:read' },
    { key: 'appts',     label: 'Today’s Appointments', icon: 'calendar-check', tone: 'emerald', perm: 'appointment:read', module: 'appointments' },
    { key: 'revenue',   label: 'Revenue (Nov)',        icon: 'indian-rupee',   tone: 'amber',   perm: 'report:finance', money: true },
    { key: 'beds',      label: 'Available Beds',       icon: 'bed-double',     tone: 'violet',  perm: 'bed:manage', module: 'ipd' },
    { key: 'emergency', label: 'Emergency Cases',      icon: 'siren',          tone: 'rose',    perm: 'emergency:manage', module: 'emergency' },
    { key: 'staff',     label: 'Total Employees',      icon: 'id-card',        tone: 'violet',  perm: 'staff:read' },
    { key: 'present',   label: 'Present Today',        icon: 'user-check',     tone: 'emerald', perm: 'attendance:read', module: 'hr' },
    { key: 'onleave',   label: 'On Leave Today',       icon: 'calendar-off',   tone: 'amber',   perm: 'leave:approve', module: 'hr' },
    { key: 'payroll',   label: 'Payroll (Nov)',        icon: 'wallet',         tone: 'sky',     perm: 'payroll:read', module: 'hr', money: true },
  ];
  const SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];
  const SHORTCUTS = [['Ctrl / ⌘ + K', 'Search & commands'], ['[', 'Collapse sidebar'], ['N', 'New appointment'], ['D', 'Toggle dark mode'], ['T', 'Test panel (test mode on)'], ['Esc', 'Close dialog / menu']];

  /* ---------------- state ---------------- */
  let TENANTS = makeTenants();
  const state = {
    tenant: 'sun', branch: 0, role: ({ admin: 'admin', doctor: 'doctor', reception: 'receptionist', pharmacy: 'pharmacy' })[window.HMS_SESSION?.role] || 'admin',
    modules: new Set(PLANS.pro.modules), plan: 'pro',
    active: 'dashboard:overview', open: new Set(['dashboard']),
    range: 'monthly', filter: 'all', query: '',
    test: store.get('hms-test') === '1', hints: false, drawerTab: 'guide',
    notifications: makeNotifications(), activity: makeActivity(),
  };
  const T = () => TENANTS[state.tenant];
  const modOn = m => !m || state.modules.has(m);
  const pageKey = id => (PAGE_INFO[id] ? id : id.split(':')[0]);
  const isPatient = () => state.role === 'patient';
  // Permissions come from the tenant role the persona holds — edit the role, the view changes.
  const rolePerms = () => { const tr = ROLES[state.role].tenantRole; return tr ? T().roles[tr]?.perms || [] : []; };
  // 'a|b' means either permission is enough.
  const hasPerm = p => { if (!p) return true; const ps = rolePerms(); return ps === '*' || String(p).split('|').some(x => ps.includes(x)); };
  const navSource = () => (isPatient() ? PATIENT_NAV : NAV);
  const allNavItems = () => [...NAV, ...PATIENT_NAV].flatMap(g => g.items.flatMap(i => [
    { ...i, _self: g.self, _patient: g.patient },
    ...(i.children || []).map(c => ({ ...c, module: c.module || i.module, perm: c.perm || i.perm, _child: true, _self: g.self, _patient: g.patient })),
  ]));
  const itemVisible = it => {
    if (isPatient()) return !!it._patient;
    if (it._patient) return false;
    if (it._self) return !ROLES[state.role].system;   // system accounts (a pharmacy) have no HR self-service
    return modOn(it.module) && hasPerm(it.perm);
  };
  const canOpen = id => {
    if (id === 'dashboard:overview' || id === 'dashboard') return true;
    const items = allNavItems();
    const it = items.find(i => i.id === id) || items.find(i => i.id === id.split(':')[0]);
    return !it || itemVisible(it);
  };
  const can = canOpen;

  /* ---------------- toasts ---------------- */
  function toast(title, text = '', tone = 'teal', icon = 'circle-check') {
    const el = document.createElement('div');
    el.className = 'toast pointer-events-auto flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl dark:border-slate-700 dark:bg-slate-800';
    el.innerHTML = `<span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg ${TONES[tone]}"><i data-lucide="${icon}" class="h-4 w-4"></i></span>
      <div class="min-w-0 flex-1"><p class="text-sm font-semibold text-slate-900 dark:text-white">${esc(title)}</p>${text ? `<p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">${esc(text)}</p>` : ''}</div>
      <button class="rounded p-0.5 text-slate-400 hover:text-slate-700" aria-label="Dismiss"><i data-lucide="x" class="h-4 w-4"></i></button>`;
    $('#toasts').appendChild(el); icons();
    const kill = () => { el.classList.add('leaving'); setTimeout(() => el.remove(), 250); };
    el.querySelector('button').onclick = kill;
    setTimeout(kill, 4200);
  }

  /* ---------------- sidebar ---------------- */
  function renderNav() {
    const emergencyCount = T().stats.emergency;
    $('#nav').innerHTML = navSource().map(g => {
      const tag = it => ({ ...it, _self: g.self, _patient: g.patient });
      const items = g.items.filter(it => itemVisible(tag(it)) && (!it.children || it.children.some(c => itemVisible(tag({ ...c, module: c.module || it.module, perm: c.perm || it.perm })))));
      if (!items.length) return '';
      return `<div class="mb-5">
        <p class="sb-group-title mb-2 px-3 text-[11px] font-semibold uppercase tracking-[.12em] text-slate-400 dark:text-slate-500">${g.group}</p>
        <ul class="space-y-0.5">${items.map(it => {
          const kids = (it.children || []).filter(c => itemVisible(tag({ ...c, module: c.module || it.module, perm: c.perm || it.perm })));
          const parentActive = state.active === it.id || state.active.startsWith(it.id + ':');
          const badge = it.badge === 'emergency' && emergencyCount
            ? `<span class="sb-badge-text sb-label ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-rose-100 px-1.5 text-[11px] font-bold text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">${emergencyCount}</span>
               <span class="sb-dot absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500"></span>` : '';
          if (kids.length) {
            const open = state.open.has(it.id);
            return `<li class="${open ? 'open-parent' : ''}">
              <button class="nav-link relative ${parentActive ? 'active' : ''}" data-toggle="${it.id}" data-tip="${esc(it.label)}" aria-expanded="${open}">
                <i data-lucide="${it.icon}" class="h-[18px] w-[18px] shrink-0"></i><span class="sb-label flex-1 text-left">${it.label}</span>
                <i data-lucide="chevron-down" class="sb-chevron h-4 w-4 text-slate-400"></i>
              </button>
              <div class="sb-sub ${open ? 'open' : ''}"><div><ul class="space-y-0.5 py-1">${kids.map(c =>
                `<li><button class="sub-link ${state.active === c.id ? 'active' : ''}" data-nav="${c.id}">${c.label}</button></li>`).join('')}</ul></div></div>
            </li>`;
          }
          return `<li><button class="nav-link relative ${parentActive ? 'active' : ''}" data-nav="${it.id}" data-tip="${esc(it.label)}">
              <i data-lucide="${it.icon}" class="h-[18px] w-[18px] shrink-0"></i><span class="sb-label flex-1 text-left">${it.label}</span>${badge}
            </button></li>`;
        }).join('')}</ul></div>`;
    }).join('');
    icons();
  }

  function renderBranchMenu() {
    const t = T();
    $('#tenantName').textContent = t.name;
    $('#tenantMark').textContent = t.name[0];
    $('#branchName').textContent = t.branches[state.branch];
    $('#tenantDomain span').textContent = `${t.slug}.hms.com`;
    $('#branchMenu').innerHTML = `<p class="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Branches of ${esc(t.name)}</p>` +
      t.branches.map((b, i) => `<button class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-slate-100 dark:hover:bg-slate-700" data-branch="${i}">
        <i data-lucide="building-2" class="h-4 w-4 text-slate-400"></i><span class="flex-1">${esc(b)}</span>${i === state.branch ? '<i data-lucide="check" class="h-4 w-4 text-teal-600"></i>' : ''}</button>`).join('') +
      `<div class="my-1 h-px bg-slate-100 dark:bg-slate-700"></div>
       <button class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-teal-700 hover:bg-slate-100 dark:text-teal-400 dark:hover:bg-slate-700" data-action="demo-only"><i data-lucide="plus" class="h-4 w-4"></i>Add branch</button>`;
    icons();
  }

  function setCollapsed(v) {
    document.body.classList.toggle('sb-collapsed', v);
    store.set('hms-sb', v ? '1' : '0');
    setTimeout(resizeCharts, 320);
  }
  function toggleSidebar() {
    if (window.innerWidth < 1024) document.body.classList.toggle('sb-mobile-open', !document.body.classList.contains('sb-mobile-open'));
    else setCollapsed(!document.body.classList.contains('sb-collapsed'));
    $('#sidebarBackdrop').classList.toggle('hidden', !document.body.classList.contains('sb-mobile-open'));
  }
  function closeMobileSidebar() {
    document.body.classList.remove('sb-mobile-open'); $('#sidebarBackdrop').classList.add('hidden');
  }

  // Tooltips for collapsed sidebar
  function bindTooltips() {
    const tip = $('#tip');
    $('#nav').addEventListener('mouseover', e => {
      const el = e.target.closest('[data-tip]');
      if (!el || !document.body.classList.contains('sb-collapsed') || window.innerWidth < 1024) return;
      const r = el.getBoundingClientRect();
      tip.textContent = el.dataset.tip; tip.classList.remove('hidden');
      tip.style.left = r.right + 12 + 'px'; tip.style.top = r.top + r.height / 2 - tip.offsetHeight / 2 + 'px';
    });
    $('#nav').addEventListener('mouseout', () => tip.classList.add('hidden'));
  }

  /* ---------------- navigation / pages ---------------- */
  const PAGES = window.HMSPages || {};   // custom screens registered by admin.js etc.
  function pageTitle(id) {
    if (PAGES[id]?.title) return PAGES[id].title;
    if (PAGE_INFO[id]) return PAGE_INFO[id].title;
    const it = allNavItems().find(i => i.id === id);
    if (it && (it._self || it._patient)) return it.label;
    return (PAGE_INFO[pageKey(id)] || {}).title || id;
  }
  function navigate(id, opts = {}) {
    const key = pageKey(id);
    const top = id.split(':')[0];
    if (!canOpen(id)) { if (!opts.silent) toast('No access', `${ROLES[state.role].label} can’t open ${pageTitle(id)}.`, 'rose', 'lock'); return; }
    state.active = id;
    state.open.add(top);
    renderNav();
    const isHome = id === 'dashboard:overview' || id === 'dashboard';
    const roleHome = isHome && !isPatient() ? PAGES['home:' + state.role] : null;   // doctor / HR / receptionist dashboards
    const isDash = isHome && !isPatient() && !roleHome;
    const page = roleHome || PAGES[id] || (isHome && isPatient() ? null : PAGES[top]);
    $('#page-dashboard').classList.toggle('hidden', !isDash);
    $('#page-placeholder').classList.toggle('hidden', isDash);
    const info = isHome && isPatient() ? PAGE_INFO.portal : (PAGE_INFO[id] || PAGE_INFO[key] || PAGE_INFO.dashboard);
    const title = isDash ? 'Dashboard' : roleHome ? roleHome.title : isHome ? `Welcome, ${ROLES.patient.person.split(' ')[0]}` : pageTitle(id);
    $('#crumb').textContent = isDash ? 'Dashboard' : title;
    $('#pageTitle').textContent = title;
    $('#pageSub').textContent = isDash ? 'Hospital overview and today’s activity' : (page?.sub || info.desc);
    $('#pageActions').classList.toggle('hidden', !isDash);
    if (!isDash) {
      if (page) { $('#page-placeholder').innerHTML = ''; page.render($('#page-placeholder'), id); icons(); }
      else renderPlaceholder(isHome ? 'portal' : id);
    } else requestAnimationFrame(resizeCharts);
    renderFeatureInfo();
    applyHints();
    closeMobileSidebar();
    if (!opts.noScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  const rerenderPage = () => navigate(state.active, { silent: true, noScroll: true });

  function renderPlaceholder(id) {
    const info = PAGE_INFO[id] || PAGE_INFO[pageKey(id)] || PAGE_INFO.dashboard;
    $('#page-placeholder').innerHTML = `<div class="fade-in grid gap-5 lg:grid-cols-3">
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-card lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
        <span class="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">${esc(info.phase)}</span>
        <h2 class="mt-3 text-lg font-semibold text-slate-900 dark:text-white">What this screen will do</h2>
        <ul class="mt-4 space-y-3">${info.features.map(f => `<li class="flex gap-3 text-sm"><span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"><i data-lucide="check" class="h-3 w-3"></i></span>${esc(f)}</li>`).join('')}</ul>
        <div class="mt-6 grid gap-3 sm:grid-cols-3">${[1, 2, 3].map(() => `<div class="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"></div>`).join('')}</div>
        <div class="mt-3 h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"></div>
      </div>
      <div class="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/50">
        <span class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10"><i data-lucide="hammer" class="h-6 w-6"></i></span>
        <p class="mt-4 font-semibold text-slate-900 dark:text-white">Screen design coming next</p>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">This page is planned. The dashboard is the first fully interactive screen in the demo.</p>
        <button class="mt-5 inline-flex h-9 items-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700" data-nav="dashboard:overview"><i data-lucide="arrow-left" class="h-4 w-4"></i>Back to dashboard</button>
      </div>
    </div>`;
    icons();
  }

  /* ---------------- stats ---------------- */
  function countUp(el, to, money) {
    const from = Number(el.dataset.v || 0); el.dataset.v = to;
    const start = performance.now(), dur = 900;
    const step = now => {
      const p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
      const v = from + (to - from) * e;
      el.textContent = money ? inr(v) : Math.round(v).toLocaleString('en-IN');
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function renderStats(animate = true) {
    const t = T();
    const cards = CARDS.filter(c => modOn(c.module) && hasPerm(c.perm)).slice(0, 6);
    const grid = $('#statsGrid');
    grid.classList.toggle('hidden', !cards.length);
    grid.className = grid.className.replace(/2xl:grid-cols-\d/, `2xl:grid-cols-${Math.max(3, cards.length)}`);
    grid.innerHTML = cards.map(c => {
      const [tr, up] = t.trends[c.key];
      return `<div class="group relative rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900" data-card="${c.key}">
        <div class="flex items-start justify-between">
          <span class="grid h-11 w-11 place-items-center rounded-xl ${TONES[c.tone]}"><i data-lucide="${c.icon}" class="h-5 w-5"></i></span>
          <span class="inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
            <i data-lucide="${up ? 'trending-up' : 'trending-down'}" class="h-3.5 w-3.5"></i>${tr}</span>
        </div>
        <p class="stat-num mt-4 truncate text-[21px] sm:text-[26px] font-bold tracking-tight text-slate-900 dark:text-white" data-key="${c.key}" data-v="${animate ? 0 : t.stats[c.key]}">${c.money ? inr(t.stats[c.key]) : t.stats[c.key].toLocaleString('en-IN')}</p>
        <p class="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">${c.label}</p>
      </div>`;
    }).join('');
    icons();
    if (animate) $$('.stat-num', grid).forEach(el => countUp(el, t.stats[el.dataset.key], el.dataset.key === 'revenue'));
    applyHints();
  }
  function bumpStat(key, delta) {
    T().stats[key] = Math.max(0, T().stats[key] + delta);
    const el = $(`.stat-num[data-key="${key}"]`);
    if (el) {
      countUp(el, T().stats[key], key === 'revenue');
      const card = el.closest('[data-card]'); card.classList.remove('row-flash'); void card.offsetWidth; card.classList.add('row-flash');
    }
  }

  /* ---------------- charts ---------------- */
  let patientChart, apptChart, revenueChart;
  const chartTheme = () => ({
    grid: isDark() ? 'rgba(148,163,184,.12)' : 'rgba(148,163,184,.22)',
    tick: isDark() ? '#94a3b8' : '#64748b',
    tipBg: isDark() ? '#1e293b' : '#0f172a',
  });

  function buildCharts() {
    if (!window.Chart) { $$('canvas').forEach(c => c.insertAdjacentHTML('afterend', '<p class="text-sm text-slate-500">Charts need an internet connection (Chart.js CDN).</p>')); return; }
    Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
    Chart.defaults.font.size = 12;
    const th = chartTheme();
    const tooltip = { backgroundColor: th.tipBg, padding: 10, cornerRadius: 10, titleFont: { weight: '600' }, boxPadding: 4, usePointStyle: true };

    patientChart = new Chart($('#patientChart'), {
      type: 'line',
      data: { labels: [], datasets: [
        { label: 'Admitted', data: [], borderColor: '#0d9488', borderWidth: 2.5, tension: .4, pointRadius: 0, pointHoverRadius: 5, pointBackgroundColor: '#0d9488', fill: true,
          backgroundColor: ctx => { const { chart } = ctx; const { ctx: c, chartArea } = chart; if (!chartArea) return 'transparent';
            const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom); g.addColorStop(0, 'rgba(13,148,136,.22)'); g.addColorStop(1, 'rgba(13,148,136,0)'); return g; } },
        { label: 'Discharged', data: [], borderColor: '#64748b', borderWidth: 2, borderDash: [6, 5], tension: .4, pointRadius: 0, pointHoverRadius: 4, fill: false },
      ] },
      options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, tooltip },
        scales: { x: { grid: { display: false }, ticks: { color: th.tick }, border: { display: false } },
                  y: { beginAtZero: true, grid: { color: th.grid }, ticks: { color: th.tick, maxTicksLimit: 6 }, border: { display: false } } } },
    });

    apptChart = new Chart($('#apptChart'), {
      type: 'doughnut',
      data: { labels: DONUT.map(d => d.label), datasets: [{ data: [], backgroundColor: DONUT.map(d => d.color), borderWidth: 3, borderColor: isDark() ? '#0f172a' : '#fff', hoverOffset: 6 }] },
      options: { maintainAspectRatio: false, cutout: '74%', plugins: { legend: { display: false }, tooltip } },
    });

    revenueChart = new Chart($('#revenueChart'), {
      type: 'bar',
      data: { labels: [], datasets: [{ label: 'Collections', data: [], borderRadius: 6, maxBarThickness: 28,
        backgroundColor: ctx => ctx.dataIndex === ctx.dataset.data.length - 1 ? '#0d9488' : (isDark() ? 'rgba(45,212,191,.28)' : 'rgba(13,148,136,.22)'),
        hoverBackgroundColor: '#0f766e' }] },
      options: { maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { ...tooltip, callbacks: { label: c => ' ' + inr(c.parsed.y) } } },
        scales: { x: { grid: { display: false }, ticks: { color: th.tick }, border: { display: false } },
                  y: { beginAtZero: true, grid: { color: th.grid }, border: { display: false }, ticks: { color: th.tick, maxTicksLimit: 6, callback: v => '₹' + v / 1000 + 'k' } } } },
    });
    updateCharts();
  }

  function revenueLabels(n) {
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(TODAY); d.setDate(d.getDate() - (n - 1 - i));
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    });
  }

  function updateCharts() {
    const t = T();
    $$('.range-tab').forEach(b => b.classList.toggle('active', b.dataset.range === state.range));
    // donut legend + total even without Chart.js
    const total = DONUT.reduce((s, d) => s + t.breakdown[d.key], 0);
    $('#donutTotal').textContent = total.toLocaleString('en-IN');
    $('#donutLegend').innerHTML = DONUT.map(d => {
      const v = t.breakdown[d.key];
      return `<div class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60"><span class="h-2.5 w-2.5 rounded-full" style="background:${d.color}"></span>
        <span class="flex-1 text-slate-600 dark:text-slate-400">${d.label}</span><span class="font-semibold text-slate-900 dark:text-white">${total ? Math.round(v / total * 100) : 0}%</span></div>`;
    }).join('');
    const last7 = t.revenue.slice(-7).reduce((a, b) => a + b, 0), prev7 = t.revenue.slice(-14, -7).reduce((a, b) => a + b, 0);
    const pct = prev7 ? ((last7 - prev7) / prev7 * 100) : 0;
    const chip = $('#revChip');
    chip.className = `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${pct >= 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}`;
    chip.innerHTML = `<span class="h-1.5 w-1.5 rounded-full bg-current"></span>${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs last week`;

    if (!patientChart) return;
    const s = t.series[state.range];
    patientChart.data.labels = s.labels;
    patientChart.data.datasets[0].data = s.admitted;
    patientChart.data.datasets[1].data = s.discharged;
    patientChart.update();
    apptChart.data.datasets[0].data = DONUT.map(d => t.breakdown[d.key]);
    apptChart.update();
    revenueChart.data.labels = revenueLabels(t.revenue.length);
    revenueChart.data.datasets[0].data = t.revenue;
    revenueChart.update();
  }

  function themeCharts() {
    if (!patientChart) return;
    const th = chartTheme();
    [patientChart, revenueChart].forEach(c => {
      c.options.scales.x.ticks.color = th.tick; c.options.scales.y.ticks.color = th.tick; c.options.scales.y.grid.color = th.grid;
      c.options.plugins.tooltip.backgroundColor = th.tipBg; c.update('none');
    });
    apptChart.data.datasets[0].borderColor = isDark() ? '#0f172a' : '#fff';
    apptChart.options.plugins.tooltip.backgroundColor = th.tipBg; apptChart.update('none');
  }
  const resizeCharts = () => [patientChart, apptChart, revenueChart].forEach(c => c && c.resize());

  /* ---------------- wards, doctors, activity ---------------- */
  function renderWards() {
    const w = T().wards;
    const occ = w.reduce((s, x) => s + x.occ, 0), tot = w.reduce((s, x) => s + x.total, 0);
    $('#bedSummary').textContent = tot ? `${occ} of ${tot} beds occupied · ${Math.round(occ / tot * 100)}%` : 'No wards configured';
    $('#wardList').innerHTML = w.map(x => {
      const p = Math.round(x.occ / x.total * 100);
      const color = p >= 85 ? 'bg-rose-500' : p >= 65 ? 'bg-amber-500' : 'bg-teal-500';
      return `<div><div class="mb-1.5 flex items-center justify-between text-[13px]"><span class="font-medium text-slate-700 dark:text-slate-200">${esc(x.name)}</span>
        <span class="text-slate-500 dark:text-slate-400"><b class="text-slate-900 dark:text-white">${x.occ}</b>/${x.total} · ${x.total - x.occ} free</span></div>
        <div class="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full rounded-full ${color} transition-all duration-700" style="width:${p}%"></div></div></div>`;
    }).join('');
  }

  function renderDoctors() {
    const docs = T().doctors;
    $('#dutyCount').textContent = `${docs.length} on duty`;
    const st = { 'In OPD': 'bg-emerald-500', 'In surgery': 'bg-sky-500', 'On break': 'bg-amber-500' };
    $('#doctorList').innerHTML = docs.map(d => `<li class="flex items-center gap-3 px-5 py-3">
      <span class="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">${initials(d.name)}
        <span class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ${st[d.duty] || 'bg-slate-400'} ring-2 ring-white dark:ring-slate-900"></span></span>
      <div class="min-w-0 flex-1"><p class="truncate text-sm font-medium text-slate-900 dark:text-white">${esc(d.name)}</p><p class="text-xs text-slate-500 dark:text-slate-400">${esc(d.spec)} · ${esc(d.duty || 'Off duty')}</p></div>
      <span class="text-right text-xs text-slate-500 dark:text-slate-400"><b class="block text-sm text-slate-900 dark:text-white">${d.seen}</b>seen</span></li>`).join('');
  }

  function renderActivity() {
    $('#activityList').innerHTML = state.activity.slice(0, 5).map(a => `<li class="fade-in flex gap-3">
      <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg ${TONES[a.tone]}"><i data-lucide="${a.icon}" class="h-4 w-4"></i></span>
      <div class="min-w-0 text-[13px]"><p class="text-slate-600 dark:text-slate-300 [&_b]:font-semibold [&_b]:text-slate-900 dark:[&_b]:text-white">${a.text}</p><p class="mt-0.5 text-xs text-slate-400">${a.time}</p></div></li>`).join('');
    icons();
  }
  function logActivity(icon, tone, html) { state.activity.unshift({ icon, tone, text: html, time: 'just now' }); renderActivity(); }

  /* ---------------- appointments table ---------------- */
  function renderStatusTabs() {
    const list = T().appointments;
    const tabs = [['all', 'All', list.length], ...Object.entries(STATUS).map(([k, v]) => [k, v.label, list.filter(a => a.status === k).length])
      .filter(([k, , n]) => n || !['with-doctor', 'no-show'].includes(k))];   // queue-only statuses show once used
    $('#statusTabs').innerHTML = tabs.map(([k, l, n]) => `<button class="-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-medium transition ${state.filter === k ? 'border-teal-600 text-teal-700 dark:text-teal-300' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}" data-filter="${k}">
      ${l}<span class="rounded-full px-1.5 text-[11px] ${state.filter === k ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}">${n}</span></button>`).join('');
  }

  function renderAppointments(flashId) {
    renderStatusTabs();
    const q = state.query.toLowerCase();
    const rows = T().appointments
      .filter(a => state.filter === 'all' || a.status === state.filter)
      .filter(a => !q || (a.patient + a.doctor + a.mrn + a.dept).toLowerCase().includes(q))
      .sort((a, b) => a.time.localeCompare(b.time));
    $('#apptBody').innerHTML = rows.map(a => `<tr class="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40 ${a.id === flashId ? 'row-flash' : ''}" data-appt="${a.id}">
      <td class="px-5 py-3.5 font-semibold tabular-nums text-slate-900 dark:text-white">${a.time}</td>
      <td class="px-3 py-3.5"><div class="flex items-center gap-3">
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-50 to-sky-50 text-xs font-bold text-teal-700 dark:from-teal-500/10 dark:to-sky-500/10 dark:text-teal-300">${initials(a.patient)}</span>
        <div class="min-w-0"><p class="truncate font-medium text-slate-900 dark:text-white">${esc(a.patient)}</p><p class="text-xs text-slate-500 dark:text-slate-400">${esc(a.mrn)}</p></div></div></td>
      <td class="px-3 py-3.5"><p class="text-slate-700 dark:text-slate-200">${esc(a.doctor)}</p><p class="text-xs text-slate-500 dark:text-slate-400">${esc(a.dept)}</p></td>
      <td class="px-3 py-3.5 text-slate-600 dark:text-slate-300">${esc(a.type)}</td>
      <td class="px-3 py-3.5"><span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS[a.status].cls}"><span class="h-1.5 w-1.5 rounded-full bg-current"></span>${STATUS[a.status].label}</span></td>
      <td class="px-5 py-3.5 text-right"><button class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white" data-rowmenu="${a.id}" aria-label="Actions for ${esc(a.patient)}"><i data-lucide="ellipsis-vertical" class="h-4 w-4"></i></button></td>
    </tr>`).join('');
    $('#apptEmpty').classList.toggle('hidden', rows.length > 0);
    icons();
  }

  const findAppt = id => T().appointments.find(a => a.id === id);
  function setStatus(id, status) {
    const a = findAppt(id); if (!a) return;
    const from = STATUS[a.status].bucket, to = STATUS[status].bucket;
    if (from !== to) { T().breakdown[from]--; T().breakdown[to]++; }
    a.status = status;
    renderAppointments(id); updateCharts();
  }

  function openRowMenu(btn) {
    const id = btn.dataset.rowmenu, a = findAppt(id), menu = $('#rowMenu');
    const item = (act, icon, label, danger) => `<button class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm ${danger ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}" data-row-act="${act}" data-id="${id}"><i data-lucide="${icon}" class="h-4 w-4 ${danger ? '' : 'text-slate-400'}"></i>${label}</button>`;
    const closed = a.status === 'completed' || a.status === 'cancelled';
    menu.innerHTML = item('view', 'eye', 'View details') +
      (a.status === 'pending' ? item('confirm', 'circle-check', 'Confirm') : '') +
      (['confirmed', 'pending'].includes(a.status) ? item('checkin', 'log-in', 'Check in') : '') +
      (a.status === 'checked-in' ? item('complete', 'check-check', 'Mark completed') : '') +
      (!closed ? item('remind', 'send', 'Send reminder') + '<div class="my-1 h-px bg-slate-100 dark:bg-slate-700"></div>' + item('cancel', 'calendar-x', 'Cancel appointment', true) : '');
    icons();
    const r = btn.getBoundingClientRect();
    menu.style.left = Math.max(8, r.right - 192) + 'px';
    const below = r.bottom + 6, h = menu.offsetHeight;
    menu.style.top = (below + h > window.innerHeight ? r.top - h - 6 : below) + 'px';
    closeDropdowns(); menu.classList.add('open'); menu.dataset.for = id;
  }

  function rowAction(act, id) {
    const a = findAppt(id); $('#rowMenu').classList.remove('open');
    if (act === 'view') return openDetail(id);
    if (act === 'confirm') { setStatus(id, 'confirmed'); toast('Appointment confirmed', `${a.patient} · ${a.time}`); }
    if (act === 'checkin') { setStatus(id, 'checked-in'); toast('Checked in', `${a.patient} added to ${a.doctor}’s queue`, 'sky', 'log-in'); logActivity('log-in', 'sky', `<b>${esc(ROLES[state.role].person)}</b> checked in ${esc(a.patient)}`); }
    if (act === 'complete') { setStatus(id, 'completed'); toast('Visit completed', a.patient, 'emerald'); }
    if (act === 'remind') toast('Reminder sent', `WhatsApp → ${a.patient} (purpose: appointment)`, 'emerald', 'send');
    if (act === 'cancel') confirmDialog({ title: 'Cancel this appointment?', text: `${a.patient} at ${a.time} with ${a.doctor}. The patient will be notified.`, ok: 'Cancel appointment',
      onOk: () => { setStatus(id, 'cancelled'); toast('Appointment cancelled', a.patient, 'rose', 'calendar-x'); logActivity('calendar-x', 'rose', `Appointment for <b>${esc(a.patient)}</b> cancelled`); } });
  }

  function openDetail(id) {
    const a = findAppt(id);
    $('#detailBody').innerHTML = `<div class="flex items-start gap-4 border-b border-slate-100 p-6 dark:border-slate-800">
        <span class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-teal-50 text-sm font-bold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">${initials(a.patient)}</span>
        <div class="flex-1"><h3 class="text-lg font-semibold text-slate-900 dark:text-white">${esc(a.patient)}</h3><p class="text-sm text-slate-500 dark:text-slate-400">${esc(a.mrn)} · ${esc(a.id)}</p></div>
        <button class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" data-close-modal aria-label="Close"><i data-lucide="x" class="h-5 w-5"></i></button></div>
      <dl class="grid grid-cols-2 gap-4 p-6 text-sm">
        ${[['Time', a.time + ', today'], ['Status', STATUS[a.status].label], ['Doctor', a.doctor], ['Department', a.dept], ['Visit type', a.type], ['Branch', T().branches[state.branch].split(' · ')[0]]]
          .map(([k, v]) => `<div><dt class="text-xs text-slate-500 dark:text-slate-400">${k}</dt><dd class="mt-0.5 font-medium text-slate-900 dark:text-white">${esc(v)}</dd></div>`).join('')}
      </dl>
      <div class="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
        <button class="h-9 rounded-xl border border-slate-200 px-3.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" data-close-modal>Close</button>
        <button class="h-9 rounded-xl bg-teal-600 px-3.5 text-sm font-semibold text-white hover:bg-teal-700" data-nav="consultations" data-close-modal>Open consultation</button></div>`;
    icons(); openModal('detailModal');
  }

  /* ---------------- dropdowns ---------------- */
  function closeDropdowns(except) {
    $$('.dropdown.open').forEach(d => { if (d !== except) d.classList.remove('open'); });
    $$('[data-dropdown][aria-expanded="true"]').forEach(b => { if (!except || b.dataset.dropdown !== except.id) b.setAttribute('aria-expanded', 'false'); });
  }
  function toggleDropdown(btn) {
    const menu = document.getElementById(btn.dataset.dropdown);
    const willOpen = !menu.classList.contains('open');
    closeDropdowns(menu);
    menu.classList.toggle('open', willOpen); btn.setAttribute('aria-expanded', willOpen);
  }

  /* ---------------- modals ---------------- */
  let lastFocus = null;
  function openModal(id) {
    lastFocus = document.activeElement;
    closeDropdowns();
    const m = document.getElementById(id); m.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => { const f = m.querySelector('input:not([type=hidden]),select,textarea,button:not([data-close-modal])'); f && f.focus(); }, 60);
  }
  function closeModal(m) {
    if (typeof m === 'string') m = document.getElementById(m);
    if (!m) return;
    m.classList.remove('open');
    if (!$$('.modal.open').length) document.body.style.overflow = '';
    lastFocus && lastFocus.focus && lastFocus.focus();
  }
  function topModal() { const open = $$('.modal.open'); return open[open.length - 1]; }

  let confirmCb = null;
  function confirmDialog({ title, text, ok = 'Confirm', tone = 'rose', icon = 'triangle-alert', onOk }) {
    $('#confirmTitle').textContent = title; $('#confirmText').textContent = text;
    $('#confirmOk').textContent = ok;
    $('#confirmOk').className = `h-10 rounded-xl px-4 text-sm font-semibold text-white ${tone === 'rose' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-teal-600 hover:bg-teal-700'}`;
    $('#confirmIcon').className = `mb-4 grid h-11 w-11 place-items-center rounded-xl ${TONES[tone]}`;
    $('#confirmIcon').innerHTML = `<i data-lucide="${icon}" class="h-5 w-5"></i>`; icons();
    confirmCb = onOk; openModal('confirmModal');
  }

  /* ---------------- new appointment form ---------------- */
  let selSlot = null, visitType = 'OPD';
  function openApptForm(prefill = {}) {
    const form = $('#apptForm'); form.reset();
    $$('.field', form).forEach(f => f.classList.remove('invalid')); $$('.err', form).forEach(e => e.classList.add('hidden'));
    const t = T();
    form.doctor.innerHTML = '<option value="">Select doctor…</option>' + t.doctors.map(d => `<option value="${esc(d.name)}">${esc(d.name)} — ${esc(d.spec)}</option>`).join('');
    $('#patientOptions').innerHTML = t.appointments.map(a => `<option value="${esc(a.patient)}">`).join('');
    form.date.value = todayISO(); form.date.min = todayISO();
    if (prefill.patient) form.patient.value = prefill.patient;
    selSlot = null; visitType = 'OPD'; renderSlots(); renderVisitType();
    openModal('apptModal');
  }
  function renderSlots() {
    const taken = new Set(T().appointments.filter(a => a.status !== 'cancelled').map(a => a.time));
    $('#slotGrid').innerHTML = SLOTS.map(s => `<button type="button" class="slot ${s === selSlot ? 'active' : ''}" data-slot="${s}" ${taken.has(s) ? 'disabled title="Booked"' : ''}>${s}</button>`).join('');
  }
  const renderVisitType = () => $$('.vt').forEach(b => b.classList.toggle('active', b.dataset.vt === visitType));

  function submitAppt(e) {
    e.preventDefault();
    const f = e.target; let ok = true;
    const flag = (el, bad) => { el.classList.toggle('invalid', bad); el.parentElement.querySelector('.err').classList.toggle('hidden', !bad); if (bad) ok = false; };
    flag(f.patient, f.patient.value.trim().length < 2);
    flag(f.phone, !/^\d{10}$/.test(f.phone.value.replace(/\D/g, '')));
    flag(f.doctor, !f.doctor.value);
    $('#slotErr').classList.toggle('hidden', !!selSlot); if (!selSlot) ok = false;
    if (!ok) { const first = f.querySelector('.invalid'); first && first.focus(); return; }

    const btn = $('#apptSubmit'); btn.disabled = true; btn.querySelector('span').textContent = 'Booking…';
    setTimeout(() => {
      const t = T(), doc = t.doctors.find(d => d.name === f.doctor.value);
      const existing = t.appointments.find(a => a.patient.toLowerCase() === f.patient.value.trim().toLowerCase());
      const appt = { id: 'A-' + (1100 + Math.floor(Math.random() * 899)), time: selSlot, patient: f.patient.value.trim(),
        mrn: existing ? existing.mrn : `${t.slug.toUpperCase()}-00${Math.floor(2300 + Math.random() * 600)}`,
        doctor: doc.name, dept: doc.spec, type: visitType, status: 'confirmed' };
      t.appointments.push(appt); t.breakdown.confirmed++;
      bumpStat('appts', 1); if (!existing) bumpStat('patients', 1);
      state.filter = 'all'; renderAppointments(appt.id); updateCharts();
      logActivity('calendar-plus', 'teal', `<b>${esc(ROLES[state.role].person)}</b> booked ${esc(appt.patient)} with ${esc(appt.doctor)} at ${appt.time}`);
      closeModal('apptModal');
      btn.disabled = false; btn.querySelector('span').textContent = 'Book appointment';
      toast('Appointment booked', `${appt.patient} · ${appt.time} · ${appt.doctor}`);
      if (f.notify.checked) setTimeout(() => toast('WhatsApp confirmation sent', `Route: appointment → WhatsApp (Meta Cloud API)`, 'emerald', 'send'), 700);
    }, 650);
  }

  /* ---------------- notifications & messages ---------------- */
  function renderNotifications() {
    const n = state.notifications, unread = n.filter(x => !x.read).length;
    const badge = $('#notifBadge'); badge.textContent = unread; badge.classList.toggle('hidden', !unread);
    $('#notifList').innerHTML = n.length ? n.map(x => `<button class="flex w-full gap-3 rounded-xl p-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/50" data-notif="${x.id}">
      <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg ${TONES[x.tone]}"><i data-lucide="${x.icon}" class="h-4 w-4"></i></span>
      <span class="min-w-0 flex-1"><span class="flex items-center gap-2"><span class="truncate text-[13px] font-semibold text-slate-900 dark:text-white">${esc(x.title)}</span>${x.read ? '' : '<span class="h-2 w-2 shrink-0 rounded-full bg-teal-500"></span>'}</span>
        <span class="block truncate text-xs text-slate-500 dark:text-slate-400">${esc(x.text)}</span><span class="mt-0.5 block text-[11px] text-slate-400">${esc(x.time)}</span></span></button>`).join('')
      : '<p class="py-8 text-center text-sm text-slate-500">You’re all caught up.</p>';
    icons();
  }
  function notify(n) { state.notifications.unshift({ id: Date.now(), read: false, time: 'just now', ...n }); renderNotifications(); }

  function renderMessages() {
    $('#msgList').innerHTML = MESSAGES.map(m => `<button class="flex w-full gap-3 rounded-xl p-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50" data-action="demo-only">
      <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">${initials(m.from)}</span>
      <span class="min-w-0 flex-1"><span class="flex justify-between gap-2"><span class="truncate text-[13px] font-semibold text-slate-900 dark:text-white">${esc(m.from)}</span><span class="shrink-0 text-[11px] text-slate-400">${m.time}</span></span>
      <span class="block truncate text-xs text-slate-500 dark:text-slate-400">${esc(m.text)}</span></span></button>`).join('');
  }

  /* ---------------- profile / role ---------------- */
  function renderProfile() {
    const r = ROLES[state.role];
    $('#profileName').textContent = r.person; $('#profileRole').textContent = r.title;
    $('#pmName').textContent = r.person;
    $('#pmEmail').textContent = r.person.toLowerCase().replace(/^dr\.\s*/, '').replace(/\s+/g, '.') + `@${T().slug}.hms.com`;
    $('#avatar').textContent = initials(r.person);
    $('#bannerRole').textContent = r.label; $('#bannerTenant').textContent = `${T().slug}.hms.com`;
    $('#newApptBtn').classList.toggle('hidden', !(modOn('appointments') && hasPerm('appointment:create')));
    // header "View as" switcher
    $('#roleIcon').className = `grid h-6 w-6 place-items-center rounded-lg ${TONES[r.tone]}`;
    $('#roleIcon').innerHTML = `<i data-lucide="${r.icon}" class="h-3.5 w-3.5"></i>`;
    $('#roleLabel').textContent = r.label;
    $('#roleMenu').innerHTML = `<p class="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">View the demo as</p>` +
      Object.entries(ROLES).map(([k, p]) => `${k === 'patient' ? '<div class="my-1 h-px bg-slate-100 dark:bg-slate-700"></div>' : ''}
      <button class="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${state.role === k ? 'bg-teal-50 dark:bg-teal-500/10' : 'hover:bg-slate-100 dark:hover:bg-slate-700/60'}" data-role="${k}">
        <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg ${TONES[p.tone]}"><i data-lucide="${p.icon}" class="h-4 w-4"></i></span>
        <span class="min-w-0 flex-1"><span class="block text-[13px] font-semibold text-slate-900 dark:text-white">${p.label} <span class="font-normal text-slate-400">· ${esc(p.person)}</span></span>
        <span class="block truncate text-[11px] text-slate-500 dark:text-slate-400">${esc(p.desc)}</span></span>
        ${state.role === k ? '<i data-lucide="check" class="h-4 w-4 text-teal-600"></i>' : ''}</button>`).join('');
    icons();
  }

  /* Show/hide dashboard widgets by module and permission */
  function applyVisibility() {
    $$('#page-dashboard [data-module], #page-dashboard [data-perm]').forEach(el =>
      el.classList.toggle('hidden', !modOn(el.dataset.module) || !hasPerm(el.dataset.perm)));
    const bedShown = !$('#bedCard').classList.contains('hidden');
    $('#revenueCard').classList.toggle('xl:col-span-2', bedShown);
    $('#revenueCard').classList.toggle('xl:col-span-3', !bedShown);
    // collapse rows whose cards are all hidden
    const allHidden = el => [...el.children].every(c => c.classList.contains('hidden'));
    $$('#page-dashboard .side-stack').forEach(s => s.classList.toggle('hidden', allHidden(s)));
    $$('#page-dashboard > .dash-row').forEach(row => row.classList.toggle('hidden', allHidden(row)));
    requestAnimationFrame(resizeCharts);
  }

  function renderAll(animate = true) {
    renderBranchMenu(); renderNav(); renderProfile(); renderStats(animate);
    renderWards(); renderDoctors(); renderActivity(); renderAppointments(); renderNotifications();
    applyVisibility(); updateCharts(); renderDrawer();
    (window.HMSHooks || []).forEach(fn => fn());
    applyHints();
    $('#apptDate').textContent = TODAY.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' · ' + T().branches[state.branch].split(' · ')[0];
    // stay on the current page if still allowed (re-render it with the new role/data), else go home
    if (!canOpen(state.active)) navigate('dashboard:overview', { silent: true });
    else if (state.active !== 'dashboard:overview' || isPatient() || PAGES['home:' + state.role] || !$('#page-placeholder').classList.contains('hidden')) rerenderPage();
  }

  /* ---------------- theme ---------------- */
  function toggleTheme() {
    const dark = !isDark();
    document.documentElement.classList.toggle('dark', dark);
    store.set('hms-theme', dark ? 'dark' : 'light');
    $('#themeBtn').innerHTML = `<i data-lucide="${dark ? 'sun' : 'moon'}" class="h-5 w-5"></i>`; icons();
    themeCharts();
  }

  /* ---------------- test mode ---------------- */
  function setTest(on, silent) {
    state.test = on; store.set('hms-test', on ? '1' : '0');
    document.body.classList.toggle('test-on', on);
    $('#testModeSwitch').setAttribute('aria-checked', on);
    $('#testBanner').classList.toggle('hidden', !on);
    if (!on) { closeDrawer(); state.hints = false; applyHints(); endTour(); }
    if (!silent) toast(on ? 'Test mode on' : 'Test mode off', on ? 'Use the floating panel on the right to demo features.' : 'Back to the normal view.', 'amber', 'flask-conical');
    renderDrawer();
  }
  function openDrawer(tab) {
    if (!state.test) setTest(true, true);
    if (tab) state.drawerTab = tab;
    renderDrawer();
    $('#testDrawer').classList.add('open'); $('#drawerBackdrop').classList.add('open'); document.body.classList.add('drawer-open');
  }
  function closeDrawer() { $('#testDrawer').classList.remove('open'); $('#drawerBackdrop').classList.remove('open'); document.body.classList.remove('drawer-open'); }

  function renderFeatureInfo() {
    const home = state.active === 'dashboard:overview' ? PAGES['home:' + state.role] : null;
    const info = isPatient() && state.active === 'dashboard:overview' ? PAGE_INFO.portal
      : home?.info ? home.info : (PAGES[state.active]?.info || PAGE_INFO[state.active] || PAGE_INFO[pageKey(state.active)] || PAGE_INFO.dashboard);
    $('#featureInfo').innerHTML = `<p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">You’re viewing</p>
      <div class="mt-1 flex items-center justify-between gap-2"><p class="font-semibold text-slate-900 dark:text-white">${esc(info.title)}</p>
      <span class="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">${esc(info.phase)}</span></div>
      <p class="mt-1 text-[13px] text-slate-500 dark:text-slate-400">${esc(info.desc)}</p>
      <ul class="mt-3 space-y-1.5">${info.features.map(f => `<li class="flex gap-2 text-[13px] text-slate-600 dark:text-slate-300"><i data-lucide="check" class="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600"></i>${esc(f)}</li>`).join('')}</ul>`;
    icons();
  }

  const SIMS = [
    { id: 'walkin',    icon: 'user-plus',          tone: 'teal',    title: 'Walk-in appointment',      text: 'Adds a patient to today’s queue' },
    { id: 'emergency', icon: 'siren',              tone: 'rose',    title: 'Emergency case arrives',   text: 'Alert, badge and KPI update', module: 'emergency' },
    { id: 'payment',   icon: 'indian-rupee',       tone: 'emerald', title: 'Payment received',         text: 'Revenue chart and KPI go up', module: 'billing' },
    { id: 'lab',       icon: 'flask-round',        tone: 'sky',     title: 'Lab result ready',         text: 'Notification routed by purpose', module: 'lab' },
    { id: 'discharge', icon: 'bed-double',         tone: 'violet',  title: 'Discharge a patient',      text: 'Frees a bed on the ward board', module: 'ipd' },
    { id: 'session',   icon: 'monitor-smartphone', tone: 'amber',   title: 'Login on another device',  text: 'Single active session — this one is signed out' },
    { id: 'suspend',   icon: 'ban',                tone: 'slate',   title: 'SaaS admin suspends tenant', text: 'Realtime cut-off of all sessions' },
  ];
  const WALKINS = ['Rohit Verma', 'Ishita Chakraborty', 'Manoj Pillai', 'Sunita Yadav', 'Abhishek Kar', 'Nisha Thomas', 'Farhan Sheikh', 'Pallavi Joshi'];

  function runSim(id) {
    const t = T();
    if (id === 'walkin') {
      if (!modOn('appointments')) return toast('Appointments module is off', 'Turn it on under Configure.', 'amber', 'lock');
      const taken = new Set(t.appointments.map(a => a.time));
      const time = SLOTS.find(s => !taken.has(s)) || nowTime();
      const doc = t.doctors[Math.floor(Math.random() * t.doctors.length)];
      const name = WALKINS[Math.floor(Math.random() * WALKINS.length)];
      const appt = { id: 'A-' + (1200 + Math.floor(Math.random() * 700)), time, patient: name, mrn: `${t.slug.toUpperCase()}-00${2400 + Math.floor(Math.random() * 500)}`, doctor: doc.name, dept: doc.spec, type: 'OPD', status: 'pending' };
      t.appointments.push(appt); t.breakdown.pending++;
      bumpStat('appts', 1); bumpStat('patients', 1);
      state.filter = 'all'; renderAppointments(appt.id); updateCharts();
      logActivity('user-plus', 'teal', `Walk-in <b>${esc(name)}</b> registered at reception`);
      toast('Walk-in added', `${name} · ${time} · ${doc.name}`, 'teal', 'user-plus');
    }
    if (id === 'emergency') {
      bumpStat('emergency', 1); renderNav();
      notify({ tone: 'rose', icon: 'siren', title: 'Emergency case admitted', text: 'Chest pain, Bay 2 — on-call cardiologist alerted' });
      logActivity('siren', 'rose', 'Emergency case triaged as <b>Level 2</b>, Bay 2');
      toast('Emergency alert', 'SMS sent to on-call staff (purpose: critical alert)', 'rose', 'siren');
    }
    if (id === 'payment') {
      const amt = 1500 + Math.round(Math.random() * 60) * 100;
      t.revenue[t.revenue.length - 1] += amt; bumpStat('revenue', amt); updateCharts();
      notify({ tone: 'emerald', icon: 'indian-rupee', title: 'Payment received', text: `${inr(amt)} · UPI · INV-${21000 + Math.floor(Math.random() * 900)}` });
      logActivity('indian-rupee', 'emerald', `<b>Amit Roy</b> collected ${inr(amt)} via UPI`);
      toast('Payment received', `${inr(amt)} added to today’s collection`, 'emerald', 'indian-rupee');
    }
    if (id === 'lab') {
      const a = t.appointments[Math.floor(Math.random() * t.appointments.length)];
      notify({ tone: 'sky', icon: 'flask-round', title: 'Lab report ready', text: `${a.patient} · CBC` });
      toast('Lab report ready', `Email sent to ${a.patient} (purpose: reports → Email / SES)`, 'sky', 'mail');
    }
    if (id === 'discharge') {
      const w = t.wards.filter(x => x.occ > 0); if (!w.length) return toast('No occupied beds', '', 'amber', 'info');
      const ward = w[Math.floor(Math.random() * w.length)]; ward.occ--;
      bumpStat('beds', 1); renderWards();
      logActivity('bed-double', 'violet', `Patient discharged from <b>${esc(ward.name)}</b>; bed sent for cleaning`);
      toast('Patient discharged', `${ward.name}: ${ward.total - ward.occ} beds free`, 'violet', 'bed-double');
    }
    if (id === 'session') {
      closeDrawer();
      systemScreen({ icon: 'monitor-smartphone', tone: 'amber', title: 'You were signed out',
        text: `This account just signed in on another device (Chrome · Android, Kolkata). Only one active session is allowed per account.`,
        foot: 'Single-session rule · Doc 06 §3', btn: 'Sign in again', onBtn: signOut });
    }
    if (id === 'suspend') {
      closeDrawer();
      systemScreen({ icon: 'ban', tone: 'rose', title: `${t.name}’s access is suspended`,
        text: 'All sessions for this hospital were ended in real time by the platform administrator. Contact support to restore access. No data has been deleted.',
        foot: `${t.slug}.hms.com · tenant.suspended · Doc 06 §4`, btn: 'Reactivate (as SaaS admin)', onBtn: () => toast('Tenant reactivated', `${t.slug}.hms.com is back online`, 'emerald', 'circle-check') });
    }
  }

  /* End the session (see Auth.startSession in assets/auth.js) and return to the login page. */
  function signOut() {
    try { localStorage.removeItem('hms-session'); } catch (e) {}
    location.replace(window.ROUTE ? ROUTE('index') : 'index.html');
  }

  let systemCb = null;
  function systemScreen({ icon, tone, title, text, foot, btn, onBtn }) {
    $('#systemBody').innerHTML = `<span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl ${TONES[tone]}"><i data-lucide="${icon}" class="h-7 w-7"></i></span>
      <h3 class="mt-5 text-xl font-semibold text-slate-900 dark:text-white">${esc(title)}</h3>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">${esc(text)}</p>
      <button class="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-700" data-system-ok>${esc(btn)}</button>
      <p class="mt-5 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"><i data-lucide="flask-conical" class="h-3 w-3"></i>Simulated · ${esc(foot)}</p>`;
    icons(); systemCb = onBtn; openModal('systemOverlay');
  }

  function renderDrawer() {
    $$('.drawer-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === state.drawerTab));
    $$('.drawer-pane').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== state.drawerTab));
    $('#hintSwitch').setAttribute('aria-checked', state.hints);
    renderFeatureInfo();
    const sc = SHORTCUTS.map(([k, v]) => `<div class="flex items-center justify-between gap-3"><dt class="text-slate-600 dark:text-slate-300">${v}</dt><dd><kbd class="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[11px] text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">${k}</kbd></dd></div>`).join('');
    $('#shortcutList').innerHTML = sc; $('#shortcutList2').innerHTML = sc;

    $('#simList').innerHTML = SIMS.map(s => {
      const off = s.module && !modOn(s.module);
      return `<button class="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-3.5 text-left transition hover:border-amber-300 hover:bg-amber-50/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:border-amber-500/40 dark:hover:bg-amber-500/5" data-sim="${s.id}" ${off ? 'disabled' : ''}>
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl ${TONES[s.tone]}"><i data-lucide="${s.icon}" class="h-5 w-5"></i></span>
        <span class="flex-1"><span class="block text-sm font-semibold text-slate-900 dark:text-white">${s.title}</span><span class="block text-xs text-slate-500 dark:text-slate-400">${off ? 'Module is off for this tenant' : s.text}</span></span>
        <i data-lucide="${off ? 'lock' : 'play'}" class="h-4 w-4 text-slate-300 transition group-hover:text-amber-600"></i></button>`;
    }).join('');

    $('#tenantOptions').innerHTML = Object.entries(TENANTS).map(([k, t]) => `<button class="rounded-2xl border p-3 text-left transition ${state.tenant === k ? 'border-teal-500 bg-teal-50/60 ring-4 ring-teal-500/10 dark:bg-teal-500/10' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'}" data-tenant="${k}">
      <span class="block text-sm font-semibold text-slate-900 dark:text-white">${esc(t.name)}</span>
      <span class="block text-xs text-slate-500 dark:text-slate-400">${t.slug}.hms.com</span>
      <span class="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">${PLANS[t.plan].label}</span></button>`).join('');

    $('#roleOptions').innerHTML = Object.entries(ROLES).map(([k, r]) => {
      const tr = r.tenantRole && T().roles[r.tenantRole];
      const permText = !tr ? 'Patient portal — own records only' : tr.perms === '*' ? 'All permissions' : tr.perms.length ? `${tr.label} · ${tr.perms.length} permissions` : `${tr.label} · self-service only`;
      return `<button class="flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${state.role === k ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-500/10' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'}" data-role="${k}">
      <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg ${TONES[r.tone]}"><i data-lucide="${r.icon}" class="h-4 w-4"></i></span>
      <span class="min-w-0 flex-1"><span class="block text-[13px] font-semibold text-slate-900 dark:text-white">${r.label} <span class="font-normal text-slate-500">· ${esc(r.person)}</span></span>
      <span class="block truncate text-[11px] text-slate-500 dark:text-slate-400">${esc(permText)}</span></span>
      ${state.role === k ? '<i data-lucide="circle-check" class="h-4 w-4 text-teal-600"></i>' : ''}</button>`;
    }).join('');

    $('#planTabs').innerHTML = Object.entries(PLANS).map(([k, p]) => `<button class="rounded-md px-2 py-1 ${state.plan === k ? 'bg-white text-teal-700 shadow-sm dark:bg-slate-700 dark:text-teal-300' : 'text-slate-500'}" data-plan="${k}">${p.label}</button>`).join('');
    const inPlan = new Set(PLANS[state.plan].modules);
    $('#moduleList').innerHTML = MODULES.map(m => {
      const core = CORE_MODULES.includes(m.key), allowed = inPlan.has(m.key);
      return `<div class="flex items-center gap-3 px-3.5 py-2.5">
        <div class="min-w-0 flex-1"><p class="text-[13px] font-medium ${allowed ? 'text-slate-900 dark:text-white' : 'text-slate-400'}">${m.label}</p>
        <p class="text-[11px] text-slate-400">${core ? 'Core · always on' : allowed ? m.phase : `<i data-lucide="lock" class="inline h-3 w-3"></i> Not in ${PLANS[state.plan].label} plan`}</p></div>
        <button class="switch" role="switch" aria-checked="${state.modules.has(m.key)}" data-module-toggle="${m.key}" ${core || !allowed ? 'disabled' : ''} aria-label="${m.label}"></button></div>`;
    }).join('');
    icons();
  }

  function setTenant(k) {
    if (state.tenant === k) return;
    state.tenant = k; state.branch = 0; state.plan = TENANTS[k].plan;
    state.modules = new Set(PLANS[state.plan].modules);
    state.filter = 'all'; state.query = ''; $('#apptSearch').value = '';
    renderAll();
    toast(`Switched to ${TENANTS[k].name}`, `${k}.hms.com — completely separate data`, 'teal', 'building-2');
  }
  function setRole(k) {
    state.role = k; closeDropdowns(); renderAll(false);
    const visible = $$('#nav [data-nav], #nav [data-toggle]').length;
    toast(`Viewing as ${ROLES[k].label}`, `${ROLES[k].person} sees ${visible} menu items`, ROLES[k].tone, ROLES[k].icon);
  }
  function setPlan(k) {
    state.plan = k; state.modules = new Set(PLANS[k].modules); renderAll(false);
    toast(`${PLANS[k].label} plan applied`, `${state.modules.size} of ${MODULES.length} modules enabled`, 'teal', 'layers');
  }
  function toggleModule(k) {
    state.modules.has(k) ? state.modules.delete(k) : state.modules.add(k);
    renderAll(false);
    const m = MODULES.find(x => x.key === k);
    toast(`${m.label} ${state.modules.has(k) ? 'enabled' : 'disabled'}`, state.modules.has(k) ? 'Menu items and widgets are back.' : 'Its menu items, widgets and permissions are hidden.', 'slate', 'toggle-right');
  }
  function resetDemo() {
    TENANTS = makeTenants();
    Object.assign(state, { tenant: 'sun', branch: 0, role: 'admin', plan: 'pro', modules: new Set(PLANS.pro.modules), range: 'monthly', filter: 'all', query: '',
      notifications: makeNotifications(), activity: makeActivity() });
    $('#apptSearch').value = '';
    navigate('dashboard:overview'); renderAll();
    toast('Demo reset', 'All sample data restored.', 'teal', 'rotate-ccw');
  }

  /* ---------------- hints ---------------- */
  function applyHints() {
    $$('.hint-dot').forEach(d => d.remove());
    $('#hintPop').classList.add('hidden');
    if (!state.hints || !state.test) return;
    const extra = [
      ['#nav .sb-group-title', 'Dynamic menu', 'Built from ModuleConfig (what the plan + hospital turned on) and RBAC (what this role may do). Nothing is hard-coded per customer.'],
      ['#branchSwitcher', 'Tenant & branch', 'Patients belong to the hospital; visits, stock and invoices belong to a branch. Switching branch re-scopes every query.'],
      ['#searchTrigger', 'Global search', 'Searches only inside this tenant. Press Ctrl/⌘ + K anywhere.'],
      ['#notifWrap', 'Purpose routing', 'Each alert has a purpose (OTP, appointment, report, alert) routed to SMS, WhatsApp or email per hospital.'],
      ['#newApptBtn', 'Booking', 'Creates an Appointment, blocks the slot, and sends a confirmation through the appointment channel.'],
    ];
    extra.forEach(([sel, t, h]) => { const el = $(sel); if (el) { el.dataset.hintTitle = t; el.dataset.hint = h; } });
    $$('[data-hint]').forEach(el => {
      if (el.offsetParent === null && el.id !== 'sidebar') return;
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      const d = document.createElement('button'); d.className = 'hint-dot'; d.textContent = 'i'; d.type = 'button';
      d.setAttribute('aria-label', 'Explain: ' + el.dataset.hintTitle);
      d.addEventListener('click', e => { e.stopPropagation(); showHint(el, d); });
      el.appendChild(d);
    });
  }
  function showHint(el, dot) {
    const pop = $('#hintPop');
    pop.innerHTML = `<p class="flex items-center gap-2 text-sm font-semibold"><i data-lucide="lightbulb" class="h-4 w-4 text-amber-400"></i>${esc(el.dataset.hintTitle)}</p><p class="mt-1.5 text-[13px] leading-relaxed text-slate-300">${esc(el.dataset.hint)}</p>`;
    icons(); pop.classList.remove('hidden');
    const r = dot.getBoundingClientRect();
    let left = r.left - pop.offsetWidth + 20; if (left < 8) left = r.right + 8;
    left = Math.min(left, window.innerWidth - pop.offsetWidth - 8);
    let top = r.bottom + 8; if (top + pop.offsetHeight > window.innerHeight) top = r.top - pop.offsetHeight - 8;
    pop.style.left = left + 'px'; pop.style.top = Math.max(8, top) + 'px';
  }

  /* ---------------- guided tour ---------------- */
  let tourIdx = -1;
  function startTour() {
    closeDrawer(); navigate('dashboard:overview');
    if (window.innerWidth >= 1024 && document.body.classList.contains('sb-collapsed')) setCollapsed(false);
    tourIdx = 0; setTimeout(showTourStep, 350);
  }
  function endTour() { tourIdx = -1; $('#tourSpot').classList.add('hidden'); $('#tourPop').classList.add('hidden'); }
  function showTourStep() {
    const steps = TOUR_STEPS.filter(s => { const el = $(s.sel); if (!el) return false; if (el.closest('#sidebar')) return window.innerWidth >= 1024; return el.offsetParent !== null; });
    if (tourIdx < 0 || tourIdx >= steps.length) return endTour();
    const step = steps[tourIdx], el = $(step.sel);
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(() => {
      const r = el.getBoundingClientRect(), pad = 6, spot = $('#tourSpot');
      Object.assign(spot.style, { left: r.left - pad + 'px', top: Math.max(4, r.top - pad) + 'px', width: r.width + pad * 2 + 'px', height: Math.min(r.height + pad * 2, window.innerHeight - 8) + 'px' });
      spot.classList.remove('hidden');
      const pop = $('#tourPop');
      pop.innerHTML = `<div class="flex items-center justify-between"><span class="text-[11px] font-semibold uppercase tracking-wider text-teal-600">Step ${tourIdx + 1} of ${steps.length}</span>
          <button class="rounded p-1 text-slate-400 hover:text-slate-700" data-tour="end" aria-label="End tour"><i data-lucide="x" class="h-4 w-4"></i></button></div>
        <p class="mt-2 font-semibold text-slate-900 dark:text-white">${esc(step.title)}</p>
        <p class="mt-1 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">${esc(step.text)}</p>
        <div class="mt-4 flex items-center justify-between"><div class="flex gap-1">${steps.map((_, i) => `<span class="h-1.5 rounded-full transition-all ${i === tourIdx ? 'w-5 bg-teal-600' : 'w-1.5 bg-slate-200 dark:bg-slate-700'}"></span>`).join('')}</div>
        <div class="flex gap-2">${tourIdx > 0 ? '<button class="h-8 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" data-tour="prev">Back</button>' : ''}
        <button class="h-8 rounded-lg bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-700" data-tour="next">${tourIdx === steps.length - 1 ? 'Finish' : 'Next'}</button></div></div>`;
      icons(); pop.classList.remove('hidden');
      const pw = pop.offsetWidth, ph = pop.offsetHeight;
      let top = r.bottom + 14, left = r.left;
      if (r.width > window.innerWidth * .6 || r.height > window.innerHeight * .6) { top = Math.min(r.top + 20, window.innerHeight - ph - 16); left = r.left + r.width / 2 - pw / 2; }
      if (step.sel === '#sidebar') { left = r.right + 14; top = 120; }
      if (top + ph > window.innerHeight - 8) top = r.top - ph - 14;
      pop.style.left = Math.min(Math.max(8, left), window.innerWidth - pw - 8) + 'px';
      pop.style.top = Math.max(8, top) + 'px';
    }, 380);
  }

  /* ---------------- command palette ---------------- */
  let palItems = [], palIdx = 0;
  function paletteData() {
    const pages = NAV.flatMap(g => g.items).filter(i => modOn(i.module) && can(i.id))
      .map(i => ({ group: 'Pages', icon: i.icon, label: i.label, sub: PAGE_INFO[i.id]?.desc || '', run: () => navigate(i.children ? i.children[0].id : i.id) }));
    const patients = T().appointments.map(a => ({ group: 'Patients', icon: 'user', label: a.patient, sub: `${a.mrn} · ${a.time} with ${a.doctor}`, run: () => openDetail(a.id) }));
    const docs = T().doctors.map(d => ({ group: 'Doctors', icon: 'stethoscope', label: d.name, sub: `${d.spec} · ${d.duty || ''}`, run: () => navigate('doctors:list') }));
    const actions = [
      { group: 'Actions', icon: 'calendar-plus', label: 'New appointment', sub: 'Book a slot', run: () => openApptForm() },
      { group: 'Actions', icon: 'moon', label: 'Toggle dark mode', sub: 'Switch theme', run: toggleTheme },
      { group: 'Actions', icon: 'flask-conical', label: state.test ? 'Open test panel' : 'Turn on test mode', sub: 'Demo tools', run: () => openDrawer() },
      { group: 'Actions', icon: 'panel-left', label: 'Collapse / expand sidebar', sub: 'Shortcut [', run: toggleSidebar },
    ];
    return [...actions, ...pages, ...patients, ...docs];
  }
  function openPalette() { $('#paletteInput').value = ''; renderPalette(); openModal('paletteModal'); setTimeout(() => $('#paletteInput').focus(), 60); }
  function renderPalette() {
    const q = $('#paletteInput').value.trim().toLowerCase();
    palItems = paletteData().filter(i => !q || (i.label + ' ' + i.sub).toLowerCase().includes(q)).slice(0, 30);
    palIdx = 0; drawPalette();
  }
  function drawPalette() {
    let lastGroup = '';
    $('#paletteList').innerHTML = palItems.length ? palItems.map((it, i) => {
      const head = it.group !== lastGroup ? `<p class="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">${it.group}</p>` : '';
      lastGroup = it.group;
      return head + `<button class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${i === palIdx ? 'bg-teal-50 dark:bg-teal-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}" data-pal="${i}">
        <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg ${i === palIdx ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}"><i data-lucide="${it.icon}" class="h-4 w-4"></i></span>
        <span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium text-slate-900 dark:text-white">${esc(it.label)}</span><span class="block truncate text-xs text-slate-500 dark:text-slate-400">${esc(it.sub)}</span></span>
        ${i === palIdx ? '<i data-lucide="corner-down-left" class="h-4 w-4 text-teal-600"></i>' : ''}</button>`;
    }).join('') : '<p class="py-10 text-center text-sm text-slate-500">No results. Try a patient name or “billing”.</p>';
    icons();
    const act = $(`[data-pal="${palIdx}"]`); act && act.scrollIntoView({ block: 'nearest' });
  }
  function runPalette(i) { const it = palItems[i]; if (!it) return; closeModal('paletteModal'); setTimeout(it.run, 120); }

  /* ---------------- export ---------------- */
  function doExport(kind) {
    closeDropdowns();
    if (kind === 'print') return window.print();
    if (kind === 'csv') {
      const rows = [['Time', 'Patient', 'MRN', 'Doctor', 'Department', 'Type', 'Status'], ...T().appointments.map(a => [a.time, a.patient, a.mrn, a.doctor, a.dept, a.type, STATUS[a.status].label])];
      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `${T().slug}-appointments-${todayISO()}.csv` });
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      return toast('CSV downloaded', `${T().appointments.length} appointments`, 'emerald', 'file-spreadsheet');
    }
    toast('Generating PDF…', 'In the real app this runs as a background job and emails the report.', 'sky', 'loader');
    setTimeout(() => toast('Report ready', 'Sent to your email (purpose: reports)', 'emerald', 'mail'), 1600);
  }

  /* ---------------- global events ---------------- */
  function bind() {
    document.addEventListener('click', e => {
      const t = e.target;
      // close hint popover when clicking elsewhere
      if (!t.closest('#hintPop') && !t.closest('.hint-dot')) $('#hintPop').classList.add('hidden');

      const dd = t.closest('[data-dropdown]');
      if (dd) { e.stopPropagation(); return toggleDropdown(dd); }
      if (!t.closest('.dropdown')) closeDropdowns();

      const rm = t.closest('[data-rowmenu]');
      if (rm) { e.stopPropagation(); const menu = $('#rowMenu'); if (menu.classList.contains('open') && menu.dataset.for === rm.dataset.rowmenu) { menu.classList.remove('open'); return; } return openRowMenu(rm); }
      if (!t.closest('#rowMenu')) $('#rowMenu').classList.remove('open');
      const ra = t.closest('[data-row-act]'); if (ra) return rowAction(ra.dataset.rowAct, ra.dataset.id);

      const closer = t.closest('[data-close-modal]');
      if (closer) closeModal(closer.closest('.modal'));
      if (t.classList.contains('modal') && t.id !== 'systemOverlay' && !t.hasAttribute('data-static')) return closeModal(t);

      const tog = t.closest('[data-toggle]');
      if (tog) {
        const id = tog.dataset.toggle;
        if (document.body.classList.contains('sb-collapsed') && window.innerWidth >= 1024) { setCollapsed(false); state.open.add(id); renderNav(); return; }
        state.open.has(id) ? state.open.delete(id) : state.open.add(id);
        const li = tog.parentElement; li.classList.toggle('open-parent'); li.querySelector('.sb-sub').classList.toggle('open'); tog.setAttribute('aria-expanded', state.open.has(id));
        return;
      }
      const nav = t.closest('[data-nav]'); if (nav) { closeDropdowns(); return navigate(nav.dataset.nav); }

      const row = t.closest('[data-appt]'); if (row) return openDetail(row.dataset.appt);
      const f = t.closest('[data-filter]'); if (f) { state.filter = f.dataset.filter; return renderAppointments(); }
      const rg = t.closest('[data-range]'); if (rg) { state.range = rg.dataset.range; return updateCharts(); }
      const br = t.closest('[data-branch]'); if (br) { state.branch = +br.dataset.branch; closeDropdowns(); renderAll(false); return toast('Branch switched', T().branches[state.branch], 'teal', 'building-2'); }
      const lg = t.closest('[data-lang]'); if (lg) {
        $('#langLabel').textContent = lg.dataset.lang;
        $$('.lang-opt').forEach(b => { b.querySelector('svg')?.remove(); });
        lg.insertAdjacentHTML('beforeend', '<i data-lucide="check" class="h-4 w-4 text-teal-600"></i>'); icons(); closeDropdowns();
        return toast('Language', 'Interface translations are planned; the demo stays in English.', 'sky', 'globe');
      }
      const ex = t.closest('[data-export]'); if (ex) return doExport(ex.dataset.export);
      const sl = t.closest('[data-slot]'); if (sl && !sl.disabled) { selSlot = sl.dataset.slot; $('#slotErr').classList.add('hidden'); return renderSlots(); }
      const vt = t.closest('[data-vt]'); if (vt) { visitType = vt.dataset.vt; return renderVisitType(); }
      const nt = t.closest('[data-notif]'); if (nt) { const n = state.notifications.find(x => x.id == nt.dataset.notif); if (n) n.read = true; return renderNotifications(); }
      const pl = t.closest('[data-pal]'); if (pl) return runPalette(+pl.dataset.pal);

      // drawer
      const dt = t.closest('[data-tab]'); if (dt) { state.drawerTab = dt.dataset.tab; return renderDrawer(); }
      const sim = t.closest('[data-sim]'); if (sim && !sim.disabled) return runSim(sim.dataset.sim);
      const tn = t.closest('[data-tenant]'); if (tn) return setTenant(tn.dataset.tenant);
      const ro = t.closest('[data-role]'); if (ro) return setRole(ro.dataset.role);
      const pn = t.closest('[data-plan]'); if (pn) return setPlan(pn.dataset.plan);
      const mt = t.closest('[data-module-toggle]'); if (mt && !mt.disabled) return toggleModule(mt.dataset.moduleToggle);
      const tr = t.closest('[data-tour]'); if (tr) { const a = tr.dataset.tour; if (a === 'end') return endTour(); tourIdx += a === 'next' ? 1 : -1; return showTourStep(); }
      if (t.closest('[data-system-ok]')) { closeModal('systemOverlay'); systemCb && systemCb(); return; }

      const act = t.closest('[data-action]'); if (!act) return;
      switch (act.dataset.action) {
        case 'toggle-sidebar': return toggleSidebar();
        case 'close-mobile-sidebar': return closeMobileSidebar();
        case 'toggle-theme': return toggleTheme();
        case 'open-palette': return openPalette();
        case 'new-appointment': return openApptForm();
        case 'mark-all-read': state.notifications.forEach(n => (n.read = true)); return renderNotifications();
        case 'open-drawer': return openDrawer();
        case 'close-drawer': return closeDrawer();
        case 'test-off': return setTest(false);
        case 'start-tour': return startTour();
        case 'reset-demo': return confirmDialog({ title: 'Reset demo data?', text: 'Restores tenants, roles, modules and sample data to their starting values.', ok: 'Reset', tone: 'teal', icon: 'rotate-ccw', onOk: resetDemo });
        case 'open-shortcuts': return openModal('shortcutModal');
        case 'sign-out': return confirmDialog({ title: 'Sign out?', text: `You’ll be signed out of ${T().slug}.hms.com on this device.`, ok: 'Sign out', icon: 'log-out',
          onOk: signOut });
        case 'demo-only': closeDropdowns(); return toast('Coming in the full build', 'This control is a placeholder in the demo.', 'slate', 'info');
      }
    });

    $('#confirmOk').addEventListener('click', () => { closeModal('confirmModal'); const cb = confirmCb; confirmCb = null; cb && setTimeout(cb, 150); });
    $('#testModeSwitch').addEventListener('click', e => { e.stopPropagation(); setTest(!state.test); });
    $('#testModeCard').addEventListener('click', e => { if (document.body.classList.contains('sb-collapsed') && !e.target.closest('#testModeSwitch')) setTest(!state.test); });
    $('#hintSwitch').addEventListener('click', () => { state.hints = !state.hints; $('#hintSwitch').setAttribute('aria-checked', state.hints); applyHints(); if (state.hints) { closeDrawer(); toast('Feature hints on', 'Click any pulsing dot to see how that part works.', 'amber', 'lightbulb'); } });
    $('#apptForm').addEventListener('submit', submitAppt);
    $('#apptForm').addEventListener('input', e => { if (e.target.classList.contains('invalid')) { e.target.classList.remove('invalid'); e.target.parentElement.querySelector('.err')?.classList.add('hidden'); } });
    $('#apptSearch').addEventListener('input', e => { state.query = e.target.value; renderAppointments(); });
    $('#paletteInput').addEventListener('input', renderPalette);
    $('#paletteInput').addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); palIdx = Math.min(palItems.length - 1, palIdx + 1); drawPalette(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); palIdx = Math.max(0, palIdx - 1); drawPalette(); }
      if (e.key === 'Enter') { e.preventDefault(); runPalette(palIdx); }
    });

    document.addEventListener('keydown', e => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); return $('#paletteModal').classList.contains('open') ? closeModal('paletteModal') : openPalette(); }
      if (e.key === 'Escape') {
        if (tourIdx >= 0) return endTour();
        const m = topModal(); if (m && m.id !== 'systemOverlay') return closeModal(m);
        if ($('#testDrawer').classList.contains('open')) return closeDrawer();
        closeDropdowns(); $('#rowMenu').classList.remove('open'); $('#hintPop').classList.add('hidden'); return closeMobileSidebar();
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey || topModal()) return;
      if (e.key === '[') toggleSidebar();
      if (e.key.toLowerCase() === 'n' && !$('#newApptBtn').classList.contains('hidden')) openApptForm();
      if (e.key.toLowerCase() === 'd') toggleTheme();
      if (e.key.toLowerCase() === 't' && state.test) $('#testDrawer').classList.contains('open') ? closeDrawer() : openDrawer();
    });

    window.addEventListener('resize', () => { if (window.innerWidth >= 1024) closeMobileSidebar(); if (tourIdx >= 0) showTourStep(); $('#rowMenu').classList.remove('open'); });
    window.addEventListener('scroll', () => $('#rowMenu').classList.remove('open'), { passive: true });
    bindTooltips();
  }

  /* ---------------- public API for feature scripts (admin.js …) ---------------- */
  window.HMS = {
    $, $$, esc, inr, initials, icons, toast, openModal, closeModal, confirmDialog, closeDropdowns,
    navigate, rerenderPage, logActivity, notify, hasPerm, modOn, TONES,
    get state() { return state; }, T: () => T(),
    refresh: (animate = false) => renderAll(animate), bumpStat,
  };

  /* ---------------- boot ---------------- */
  function boot() {
    if (document.documentElement.dataset.sb === '1') document.body.classList.add('sb-collapsed');
    $('#themeBtn').innerHTML = `<i data-lucide="${isDark() ? 'sun' : 'moon'}" class="h-5 w-5"></i>`;
    renderMessages();
    bind();
    window.HMSAdmin && window.HMSAdmin.init();   // its click handler must run after ours
    renderAll();
    buildCharts();
    setTest(state.test, true);
    icons();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
