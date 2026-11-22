/* HMS demo — Admin: people management.
 * Registers pages (Employees, Doctors, Roles & Permissions), the dashboard setup
 * checklist, the Add-employee wizard, employee profile and credential dialogs.
 * Uses the window.HMS API exposed by app.js (available at call time).
 */
(() => {
  'use strict';
  const H = () => window.HMS;
  const $ = s => document.querySelector(s);
  const esc = s => H().esc(s);
  const T = () => H().T();
  const can = p => H().hasPerm(p);
  const me = () => ROLES[H().state.role];
  const tone = k => H().TONES[k] || H().TONES.slate;

  const BADGE = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    amber:   'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300',
    rose:    'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300',
    violet:  'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300',
    teal:    'bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-500/10 dark:text-teal-300',
    sky:     'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300',
    slate:   'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300',
  };
  const badge = (t, text, icon) => `<span class="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${BADGE[t] || BADGE.slate}">${icon ? `<i data-lucide="${icon}" class="h-3 w-3"></i>` : ''}${text}</span>`;
  const LOGIN = {
    active:    { label: 'Can sign in',     tone: 'emerald', icon: 'circle-check' },
    invited:   { label: 'Invited',         tone: 'amber',   icon: 'mail' },
    requested: { label: 'Login requested', tone: 'violet',  icon: 'key-round' },
    none:      { label: 'No login',        tone: 'slate',   icon: 'minus' },
    disabled:  { label: 'Disabled',        tone: 'rose',    icon: 'ban' },
  };
  const CLINICAL = ['Cardiology', 'Pediatrics', 'Orthopedics', 'Dermatology', 'General Medicine', 'Gynecology', 'ENT'];
  const DEFAULT_DEPT = { Nurse: 'Nursing', HR: 'Human Resources', Receptionist: 'Front Office', Accountant: 'Accounts', Pharmacist: 'Pharmacy',
                         'Lab Technician': 'Laboratory', Administration: 'Administration', 'Support Staff': 'Facilities' };
  const WSTEPS = [['Job type', 'What does this person do?'], ['Details', 'Personal & job details'], ['Role', 'What can they do in HMS?'],
                  ['Login', 'Sign-in access'], ['Review', 'Review & create']];

  const ui = { view: 'staff', q: '', type: 'all', login: 'all', explainer: true, checklist: true,
               roleSel: 'hr_manager', draft: null, draftFor: null, wiz: null, menuFor: null, profileId: null, lastCred: null };

  /* ---------------- helpers ---------------- */
  const typeOf = k => STAFF_TYPES.find(t => t.key === k) || STAFF_TYPES[STAFF_TYPES.length - 1];
  const roleOf = k => T().roles[k] || { label: k, perms: [] };
  const permsOf = r => (r.perms === '*' ? ALL_PERMS : r.perms);
  const findEmp = id => T().employees.find(e => e.id === id);
  const branchName = i => (T().branches[i] || T().branches[0]).split(' · ')[0];
  const maskPhone = p => '•••• ' + String(p || '').slice(-4);
  const maskMail = m => (m ? m.replace(/^(.).*(@.*)$/, '$1•••$2') : '');
  const fmtDate = d => { const x = new Date(d); return isNaN(x) ? '—' : x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const avatar = (name, t = 'teal', size = 'h-9 w-9 text-xs') => `<span class="grid ${size} shrink-0 place-items-center rounded-full font-bold ${tone(t)}">${H().initials(name)}</span>`;
  const chip = p => `<span class="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">${p}</span>`;
  const audit = (icon, t, html) => H().logActivity(icon, t, html);
  const who = () => esc(me().person);
  const card = 'rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900';

  function rand(n) { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; }
  function genPassword() {
    const words = ['Pulse', 'Care', 'Heal', 'Ward', 'Vital', 'Cure', 'Lotus', 'River', 'Cedar', 'Amber'];
    return words[rand(words.length)] + '@#$%&*'[rand(6)] + (1000 + rand(9000)) + 'abcdefghjkmnpqrstuvwxyz'[rand(23)] + 'ABCDEFGHJKLMNPQRSTUVWXYZ'[rand(24)];
  }
  function makeUsername(name, exceptId) {
    const base = String(name).replace(/^Dr\.?\s*/i, '').toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.') || 'user';
    let u = base, i = 2;
    while (T().employees.some(e => e.username === u && e.id !== exceptId)) u = base + i++;
    return u;
  }
  const nextId = () => 'EMP-' + String(Math.max(...T().employees.map(e => parseInt(e.id.replace(/\D/g, ''), 10))) + 1).padStart(4, '0');

  async function copy(text, label) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (_) {} ta.remove(); }
    H().toast('Copied', label || '', 'teal', 'copy');
  }

  /* ================= Dashboard top: checklist (admin) or role notice ================= */
  function renderDashTop() {
    const box = $('#dashTop'); if (!box) return;
    if (H().state.role === 'patient') { box.innerHTML = ''; return; }
    box.innerHTML = can('role:manage') ? checklistHTML() : roleNoticeHTML();
    H().icons();
  }

  function checklistSteps() {
    const t = T(), e = t.employees.filter(x => x.active);
    const rolePending = e.filter(x => x.rolePending).length;
    const pendingLogin = e.filter(x => x.login === 'requested' || x.login === 'invited').length;
    const noLogin = e.filter(x => x.login === 'none').length;
    return [
      { icon: 'building-2',   title: 'Hospital profile',  sub: 'Logo, address, registration no.', done: true, nav: 'settings' },
      { icon: 'layout-grid',  title: 'Departments',       sub: `${DEPARTMENTS.length} departments set up`, done: true, nav: 'departments' },
      { icon: 'user-plus',    title: 'Add employees',     sub: `${e.length} added — doctors & nurses too`, done: e.length >= 5, nav: 'staff:list', login: 'all' },
      { icon: 'shield-check', title: 'Assign roles',      sub: rolePending ? `${rolePending} waiting for a role` : `${Object.keys(t.roles).length} roles ready`, done: !rolePending, nav: rolePending ? 'staff:list' : 'staff:roles', login: rolePending ? 'rolepending' : null },
      { icon: 'key-round',    title: 'Issue logins',      sub: pendingLogin ? `${pendingLogin} invited / requested` : `Done · ${noLogin} work without login`, done: !pendingLogin, nav: 'staff:list', login: 'pending' },
      { icon: 'wallet',       title: 'Payroll setup',     sub: 'Salary structures & pay day', done: false, nav: 'payroll', module: 'hr' },
    ].filter(s => !s.module || H().modOn(s.module));
  }

  function checklistHTML() {
    const steps = checklistSteps(), done = steps.filter(s => s.done).length, next = steps.findIndex(s => !s.done);
    const pct = Math.round(done / steps.length * 100);
    return `<div id="adminChecklist" class="mb-5 overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-white shadow-card dark:border-teal-500/20 dark:from-teal-500/10 dark:via-slate-900 dark:to-slate-900">
      <div class="flex flex-wrap items-center gap-4 px-5 py-4">
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-600 text-white shadow-sm"><i data-lucide="list-checks" class="h-5 w-5"></i></span>
        <div class="min-w-0 flex-1">
          <p class="font-semibold text-slate-900 dark:text-white">Set up ${esc(T().name)}</p>
          <p class="text-[13px] text-slate-500 dark:text-slate-400">People first: add employees, give each a role, then issue their logins.</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-36">
            <div class="mb-1 flex justify-between text-xs"><span class="font-semibold text-slate-700 dark:text-slate-200">${done} of ${steps.length} done</span><span class="text-slate-400">${pct}%</span></div>
            <div class="h-2 overflow-hidden rounded-full bg-teal-100 dark:bg-slate-800"><div class="h-full rounded-full bg-teal-600 transition-all duration-700" style="width:${pct}%"></div></div>
          </div>
          ${can('staff:create') ? `<button class="hidden h-9 items-center gap-1.5 rounded-xl bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-700 sm:inline-flex" data-adm-act="add"><i data-lucide="user-plus" class="h-4 w-4"></i>Add employee</button>` : ''}
          <button class="rounded-lg p-2 text-slate-500 hover:bg-white/70 dark:hover:bg-slate-800" data-adm-act="toggle-checklist" aria-expanded="${ui.checklist}" aria-label="Show or hide checklist">
            <i data-lucide="chevron-down" class="chk-chev h-4 w-4 transition-transform duration-300 ${ui.checklist ? 'rotate-180' : ''}"></i></button>
        </div>
      </div>
      <div class="collapse-y ${ui.checklist ? 'open' : ''}" id="chkBody"><div>
        <ol class="grid gap-3 border-t border-teal-100 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 dark:border-slate-800">
        ${steps.map((s, i) => `<li><button class="flex h-full w-full items-start gap-3 rounded-xl border bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${i === next ? 'border-amber-300 ring-4 ring-amber-400/15 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-700'}" data-nav="${s.nav}" ${s.login ? `data-adm-login="${s.login}"` : ''}>
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg ${s.done ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : i === next ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}"><i data-lucide="${s.done ? 'check' : s.icon}" class="h-4 w-4"></i></span>
          <span class="min-w-0"><span class="block text-[11px] font-semibold uppercase tracking-wider ${i === next ? 'text-amber-600' : 'text-slate-400'}">${i === next ? 'Next up' : s.done ? 'Done' : 'Step ' + (i + 1)}</span>
          <span class="block text-sm font-semibold text-slate-900 dark:text-white">${s.title}</span><span class="block text-xs text-slate-500 dark:text-slate-400">${esc(s.sub)}</span></span></button></li>`).join('')}
        </ol></div></div></div>`;
  }

  function roleNoticeHTML() {
    const p = me(), r = roleOf(p.tenantRole), perms = permsOf(r);
    const first = p.person.startsWith('Dr.') ? 'Dr. ' + p.person.split(' ').pop() : p.person.split(' ')[0];
    const hour = new Date().getHours(), greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return `<div class="mb-5 flex flex-wrap items-start gap-4 ${card} p-5">
      <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone(p.tone)}"><i data-lucide="${p.icon}" class="h-5 w-5"></i></span>
      <div class="min-w-0 flex-1">
        <p class="font-semibold text-slate-900 dark:text-white">${greet}, ${esc(first)}</p>
        <p class="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">You’re signed in with the <b class="text-slate-700 dark:text-slate-200">${esc(r.label)}</b> role
          (${perms.length ? perms.length + ' permissions' : 'self-service only'}). Anything this role can’t use is hidden.
          ${perms.length ? `A dedicated ${esc(p.label)} dashboard is designed next.` : 'Your attendance, leave and payslips are under <b>My Work</b>.'}</p>
        ${perms.length ? `<div class="mt-3 flex flex-wrap gap-1.5">${perms.slice(0, 10).map(chip).join('')}${perms.length > 10 ? `<span class="text-[11px] text-slate-400">+${perms.length - 10} more</span>` : ''}</div>` : ''}
      </div></div>`;
  }

  /* ================= Employees / Doctors list ================= */
  const tile = (icon, t, label, value) => `<div class="${card} p-4"><div class="flex items-center gap-3">
    <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone(t)}"><i data-lucide="${icon}" class="h-4 w-4"></i></span>
    <div class="min-w-0"><p class="text-xl font-bold text-slate-900 dark:text-white">${value}</p><p class="truncate text-xs text-slate-500 dark:text-slate-400">${label}</p></div></div></div>`;

  function explainerHTML() {
    const col = (icon, t, title, text, ex) => `<div class="flex gap-3"><span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone(t)}"><i data-lucide="${icon}" class="h-4 w-4"></i></span>
      <div><p class="text-sm font-semibold text-slate-900 dark:text-white">${title}</p><p class="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">${text}</p>
      <p class="mt-1.5 text-[11px] text-slate-400">${ex}</p></div></div>`;
    return `<div class="relative ${card} p-5">
      <button class="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" data-adm-act="hide-explainer" aria-label="Hide explanation"><i data-lucide="x" class="h-4 w-4"></i></button>
      <p class="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">How people work in HMS</p>
      <div class="grid gap-5 md:grid-cols-3">
        ${col('id-card', 'violet', '1 · Employee', 'Everyone on the payroll — doctors and nurses included. The job type adds the right fields.', 'Dr. Arjun Rao → job type Doctor')}
        ${col('shield-check', 'teal', '2 · Role', 'A bundle of permissions: what they can do in the software. Any job type can get any role.', 'Neha Gupta → HR Manager: payroll, attendance, leave')}
        ${col('key-round', 'amber', '3 · Login', 'Optional. Admin creates a username and temporary password and sends it. Staff who never use HMS don’t need one.', 'Ramesh Das → no login, still paid via payroll')}
      </div></div>`;
  }

  function renderEmployees(c, opts = {}) {
    const doctors = !!opts.doctors;
    if (ui.view !== (doctors ? 'doctors' : 'staff')) { ui.view = doctors ? 'doctors' : 'staff'; ui.type = 'all'; }
    const all = T().employees.filter(e => !doctors || e.type === 'Doctor');
    const n = f => all.filter(f).length;
    const th = l => `<th class="px-3 py-3 font-semibold">${l}</th>`;
    c.innerHTML = `<div class="fade-in space-y-5">
      ${!doctors && ui.explainer ? explainerHTML() : ''}
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        ${tile(doctors ? 'stethoscope' : 'users', 'teal', doctors ? 'Doctors (employees)' : 'Active employees', n(e => e.active))}
        ${tile('circle-check', 'emerald', 'Can sign in', n(e => e.active && e.login === 'active'))}
        ${tile('hourglass', 'amber', 'Pending access', n(e => e.active && (['invited', 'requested'].includes(e.login) || e.rolePending)))}
        ${tile('user-x', 'slate', 'No login / disabled', n(e => ['none', 'disabled'].includes(e.login)))}
      </div>
      <div class="${card}">
        <div class="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div class="relative min-w-[200px] flex-1 sm:max-w-xs">
            <i data-lucide="search" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"></i>
            <input type="search" value="${esc(ui.q)}" placeholder="Search name, ID or username" class="adm-select w-full !pl-9" data-adm-input="q" aria-label="Search employees" />
          </div>
          ${doctors ? '' : `<select class="adm-select" data-adm-change="type" aria-label="Job type"><option value="all">All job types</option>${STAFF_TYPES.map(s => `<option ${ui.type === s.key ? 'selected' : ''}>${s.key}</option>`).join('')}</select>`}
          <select class="adm-select" data-adm-change="login" aria-label="Access status">${[['all', 'Any access'], ['active', 'Can sign in'], ['pending', 'Invited / requested'], ['rolepending', 'Role pending'], ['none', 'No login'], ['disabled', 'Disabled']]
            .map(([v, l]) => `<option value="${v}" ${ui.login === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <span class="flex-1"></span>
          ${can('staff:create') ? `<button class="inline-flex h-9 items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700" data-adm-act="add" ${doctors ? 'data-adm-type="Doctor"' : ''}><i data-lucide="user-plus" class="h-4 w-4"></i>${doctors ? 'Add doctor' : 'Add employee'}</button>` : ''}
        </div>
        <div class="relative overflow-x-auto thin-scroll">
          <table class="w-full min-w-[860px] text-left text-sm">
            <thead class="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400"><tr class="border-b border-slate-100 dark:border-slate-800">
              <th class="px-5 py-3 font-semibold">${doctors ? 'Doctor' : 'Employee'}</th>
              ${doctors ? th('Specialty · Reg. no.') + th('Fee') + th('Duty') : th('Job type · Department') + th('Role in HMS')}
              ${th('Login')}${th('Last sign-in')}<th class="px-5 py-3"><span class="sr-only">Actions</span></th></tr></thead>
            <tbody id="admEmpBody" class="divide-y divide-slate-100 dark:divide-slate-800"></tbody>
          </table>
        </div>
        <div id="admEmpEmpty" class="hidden px-5 py-12 text-center text-sm text-slate-500">No employees match these filters.</div>
        <div id="admEmpFoot" class="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400"></div>
      </div></div>`;
    renderEmpRows();
  }

  function filteredEmps() {
    const q = ui.q.trim().toLowerCase();
    return T().employees
      .filter(e => ui.view !== 'doctors' || e.type === 'Doctor')
      .filter(e => ui.view === 'doctors' || ui.type === 'all' || e.type === ui.type)
      .filter(e => ui.login === 'all' || (ui.login === 'pending' ? ['invited', 'requested'].includes(e.login) : ui.login === 'rolepending' ? e.rolePending : e.login === ui.login))
      .filter(e => !q || [e.name, e.id, e.username, e.dept, e.type, roleOf(e.role).label].join(' ').toLowerCase().includes(q))
      .sort((a, b) => (b.active - a.active) || a.id.localeCompare(b.id));
  }

  const dutyDot = d => ({ 'In OPD': 'bg-emerald-500', 'In surgery': 'bg-sky-500', 'On break': 'bg-amber-500' }[d] || 'bg-slate-300');

  function renderEmpRows(flashId) {
    const body = $('#admEmpBody'); if (!body) return;
    const rows = filteredEmps(), doctors = ui.view === 'doctors';
    body.innerHTML = rows.map(e => {
      const ty = typeOf(e.type), lg = LOGIN[e.login] || LOGIN.none, r = roleOf(e.role);
      const roleCell = e.rolePending ? badge('violet', 'Role pending', 'hourglass')
        : `<span class="font-medium text-slate-700 dark:text-slate-200">${esc(r.label)}</span><p class="text-xs text-slate-500 dark:text-slate-400">${r.perms === '*' ? 'All permissions' : r.perms.length ? r.perms.length + ' permissions' : 'Self-service only'}</p>`;
      return `<tr class="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40 ${e.active ? '' : 'opacity-50'} ${e.id === flashId ? 'row-flash' : ''}" data-adm-emp="${e.id}">
        <td class="px-5 py-3"><div class="flex items-center gap-3">${avatar(e.name, ty.tone)}
          <div class="min-w-0"><p class="truncate font-medium text-slate-900 dark:text-white">${esc(e.name)}</p><p class="text-xs text-slate-500 dark:text-slate-400">${e.id}${e.active ? '' : ' · Inactive'}</p></div></div></td>
        ${doctors
          ? `<td class="px-3 py-3"><p class="text-slate-700 dark:text-slate-200">${esc(e.spec || e.dept)}</p><p class="font-mono text-[11px] text-slate-500">${esc(e.reg || '—')}</p></td>
             <td class="px-3 py-3 tabular-nums text-slate-700 dark:text-slate-200">${e.fee ? H().inr(e.fee) : '—'}</td>
             <td class="px-3 py-3"><span class="inline-flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-300"><span class="h-2 w-2 rounded-full ${dutyDot(e.duty)}"></span>${esc(e.duty || 'Off duty')}</span></td>`
          : `<td class="px-3 py-3"><span class="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200"><i data-lucide="${ty.icon}" class="h-3.5 w-3.5 text-slate-400"></i>${esc(e.type)}</span><p class="text-xs text-slate-500 dark:text-slate-400">${esc(e.dept)}</p></td>
             <td class="px-3 py-3">${roleCell}</td>`}
        <td class="px-3 py-3">${badge(lg.tone, lg.label, lg.icon)}${e.username ? `<p class="mt-1 font-mono text-[11px] text-slate-500">${esc(e.username)}</p>` : ''}</td>
        <td class="px-3 py-3 text-[13px] text-slate-500 dark:text-slate-400">${esc(e.lastLogin || '—')}</td>
        <td class="px-5 py-3 text-right"><button class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white" data-adm-menu="${e.id}" aria-label="Actions for ${esc(e.name)}"><i data-lucide="ellipsis-vertical" class="h-4 w-4"></i></button></td>
      </tr>`;
    }).join('');
    $('#admEmpEmpty').classList.toggle('hidden', rows.length > 0);
    const total = T().employees.filter(e => ui.view !== 'doctors' || e.type === 'Doctor').length;
    $('#admEmpFoot').textContent = `Showing ${rows.length} of ${total} sample records · ${ui.view === 'doctors' ? T().stats.doctors + ' doctors' : T().stats.staff + ' employees'} in the full hospital`;
    H().icons();
  }

  /* row action menu */
  function openMenu(btn) {
    const e = findEmp(btn.dataset.admMenu), m = $('#admMenu');
    const it = (act, icon, label, danger) => `<button class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm ${danger ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}" data-adm-do="${act}" data-id="${e.id}"><i data-lucide="${icon}" class="h-4 w-4 ${danger ? '' : 'text-slate-400'}"></i>${label}</button>`;
    const sep = '<div class="my-1 h-px bg-slate-100 dark:bg-slate-700"></div>';
    let h = it('profile', 'user-round', 'View profile');
    if (e.active) {
      if (can('role:assign')) h += it('profile', 'shield-check', e.rolePending ? 'Assign role' : 'Change role');
      h += loginActions(e).map(([a, i, l]) => it(a, i, l)).join('');
      if (can('staff:deactivate')) h += sep + it('deactivate', 'user-x', 'Deactivate employee', true);
    } else if (can('staff:deactivate')) h += it('reactivate', 'user-check', 'Reactivate employee');
    m.innerHTML = h; H().icons();
    const r = btn.getBoundingClientRect();
    m.style.left = Math.max(8, r.right - 224) + 'px';
    const hgt = m.offsetHeight, below = r.bottom + 6;
    m.style.top = (below + hgt > window.innerHeight ? r.top - hgt - 6 : below) + 'px';
    m.classList.add('open'); ui.menuFor = e.id;
  }

  function loginActions(e) {
    const a = [];
    if (can('credential:issue')) {
      if (e.login === 'none' || e.login === 'requested') a.push(['create-login', 'key-round', 'Create login']);
      if (e.login === 'invited') a.push(['reset', 'send', 'Resend invite']);
      if (e.login === 'active') a.push(['reset', 'rotate-ccw', 'Reset password']);
      if (e.login === 'active' || e.login === 'invited') a.push(['disable', 'lock', 'Disable login']);
      if (e.login === 'disabled') a.push(['enable', 'lock-open', 'Enable login']);
    } else if (e.login === 'none' && can('staff:update')) a.push(['request-login', 'key-round', 'Request login from admin']);
    return a;
  }

  function refresh(flashId) {
    H().refresh();
    if (flashId) { const r = document.querySelector(`[data-adm-emp="${flashId}"]`); if (r) r.classList.add('row-flash'); }
    if (ui.profileId && $('#empProfileModal').classList.contains('open')) renderProfile();
  }

  function doAction(act, id) {
    const e = findEmp(id); if (!e) return;
    $('#admMenu').classList.remove('open'); ui.menuFor = null;
    switch (act) {
      case 'profile': return openProfile(id);
      case 'create-login': return issueCredentials(e, 'create');
      case 'reset': return issueCredentials(e, e.login === 'invited' ? 'resend' : 'reset');
      case 'disable':
        return H().confirmDialog({ title: `Disable ${e.name}’s login?`, text: 'They are signed out of every device now and can’t sign in until you enable it again. The employee record, attendance and payroll stay.', ok: 'Disable login', icon: 'lock',
          onOk: () => { e.login = 'disabled'; audit('lock', 'rose', `<b>${who()}</b> disabled the login of ${esc(e.name)}`); H().toast('Login disabled', `${e.name} was signed out everywhere`, 'rose', 'lock'); refresh(id); } });
      case 'enable':
        e.login = e.lastLogin && e.lastLogin !== '—' ? 'active' : 'invited';
        audit('lock-open', 'emerald', `<b>${who()}</b> enabled the login of ${esc(e.name)}`);
        H().toast('Login enabled', `${e.name} can sign in again`, 'emerald', 'lock-open'); return refresh(id);
      case 'request-login':
        e.login = 'requested';
        H().notify({ tone: 'violet', icon: 'key-round', title: 'Login requested', text: `${me().person} asked for a login for ${e.name}` });
        audit('key-round', 'violet', `<b>${who()}</b> requested a login for ${esc(e.name)}`);
        H().toast('Request sent to admin', 'The admin creates the username and password.', 'violet', 'send'); return refresh(id);
      case 'deactivate':
        return H().confirmDialog({ title: `Deactivate ${e.name}?`, text: 'Use this when someone leaves. Their login is disabled and they drop out of rosters. History, attendance and payslips are kept for records.', ok: 'Deactivate', icon: 'user-x',
          onOk: () => { e.active = false; if (e.login !== 'none') e.login = 'disabled'; H().bumpStat('staff', -1);
            audit('user-x', 'rose', `<b>${who()}</b> deactivated ${esc(e.name)} (${esc(e.type)})`); H().toast('Employee deactivated', e.name, 'rose', 'user-x'); refresh(id); } });
      case 'reactivate':
        e.active = true; H().bumpStat('staff', 1);
        audit('user-check', 'emerald', `<b>${who()}</b> reactivated ${esc(e.name)}`);
        H().toast('Employee reactivated', 'Enable their login separately if they need it.', 'emerald', 'user-check'); return refresh(id);
      case 'signout':
        audit('log-out', 'slate', `<b>${who()}</b> signed ${esc(e.name)} out of all devices`);
        return H().toast('Signed out everywhere', `${e.name}’s sessions were ended`, 'slate', 'log-out');
    }
  }

  /* ================= Credentials ================= */
  function credCardHTML(e, pw) {
    const row = (label, value, secret) => `<div class="flex items-center gap-3 px-4 py-3">
      <div class="min-w-0 flex-1"><p class="text-[11px] uppercase tracking-wider text-slate-400">${label}</p>
      <p class="truncate font-mono text-sm font-semibold ${secret ? 'text-teal-700 dark:text-teal-300' : 'text-slate-900 dark:text-white'}">${esc(value)}</p></div>
      <button type="button" class="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-teal-700 dark:hover:bg-slate-700" data-adm-copy="${esc(value)}" data-label="${label}" aria-label="Copy ${label}"><i data-lucide="copy" class="h-4 w-4"></i></button></div>`;
    const all = `Sign in: https://${T().slug}.hms.com\nUsername: ${e.username}\nTemporary password: ${pw}`;
    return `<div class="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800/50">
      ${row('Sign-in page', `${T().slug}.hms.com`)}${row('Username', e.username)}${row('Temporary password', pw, true)}</div>
      <button type="button" class="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400" data-adm-copy="${esc(all)}" data-label="All login details"><i data-lucide="clipboard-copy" class="h-3.5 w-3.5"></i>Copy all details</button>`;
  }
  const sentLines = (e, ch) => [ch.whatsapp && e.phone && ['message-circle', `WhatsApp to ${maskPhone(e.phone)}`], ch.sms && e.phone && ['smartphone', `SMS to ${maskPhone(e.phone)}`], ch.email && e.email && ['mail', `Email to ${maskMail(e.email)}`]]
    .filter(Boolean).map(([i, t]) => `<p class="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300"><i data-lucide="${i}" class="h-4 w-4 text-emerald-600"></i>${esc(t)} <span class="text-emerald-600">· sent</span></p>`).join('');
  const onceNote = `<p class="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"><i data-lucide="triangle-alert" class="mt-0.5 h-4 w-4 shrink-0"></i>
    Shown only once. HMS stores just a hash of this password. They must set their own password at first sign-in. If it’s lost, reset it again.</p>`;

  function issueCredentials(e, mode) {
    if (!e.username) e.username = makeUsername(e.name, e.id);
    const pw = genPassword();
    if (mode !== 'reset') { e.login = 'invited'; e.lastLogin = '—'; }
    audit('key-round', 'teal', `<b>${who()}</b> ${mode === 'reset' ? 'reset the password of' : mode === 'resend' ? 're-sent the login invite to' : 'created a login for'} ${esc(e.name)}`);
    showCredentials(e, pw, mode, { whatsapp: true, email: !!e.email });
    refresh(e.id);
  }

  function showCredentials(e, pw, mode, channels) {
    const title = { create: 'Login created', resend: 'Invite re-sent', reset: 'Password reset' }[mode];
    ui.lastCred = { e, pw };
    $('#credPanel').innerHTML = `<div class="flex items-start gap-4 p-6 pb-4">
        <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-500/10"><i data-lucide="key-round" class="h-6 w-6"></i></span>
        <div class="min-w-0 flex-1"><h3 class="text-lg font-semibold text-slate-900 dark:text-white">${title}</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400">${esc(e.name)} · ${esc(e.rolePending ? 'role pending' : roleOf(e.role).label)}</p></div>
        <button class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" data-close-modal aria-label="Close"><i data-lucide="x" class="h-5 w-5"></i></button></div>
      <div class="space-y-4 px-6">${credCardHTML(e, pw)}<div class="space-y-1.5">${sentLines(e, channels)}</div>${onceNote}</div>
      <div class="mt-6 flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
        <button class="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" data-adm-act="print-slip"><i data-lucide="printer" class="h-4 w-4"></i>Print slip</button>
        <button class="h-10 rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-700" data-close-modal>Done</button></div>`;
    H().icons(); H().openModal('credModal');
  }

  function printSlip() {
    if (!ui.lastCred) return;
    const { e, pw } = ui.lastCred;
    const w = window.open('', '_blank', 'width=520,height=640');
    if (!w) return H().toast('Pop-up blocked', 'Allow pop-ups to print the slip.', 'amber', 'printer');
    w.document.write(`<!doctype html><meta charset="utf-8"><title>Login slip</title>
      <body style="font-family:system-ui,sans-serif;padding:36px;color:#0f172a">
      <h2 style="margin:0">${esc(T().name)}</h2><p style="color:#64748b;margin-top:4px">HMS login details — confidential</p>
      <p>For <b>${esc(e.name)}</b> (${e.id}, ${esc(e.type)})</p>
      <table cellpadding="8" style="border:1px solid #cbd5e1;border-collapse:collapse;font-size:15px">
      <tr><td style="color:#64748b">Sign-in page</td><td><b>https://${T().slug}.hms.com</b></td></tr>
      <tr><td style="color:#64748b">Username</td><td><b>${esc(e.username)}</b></td></tr>
      <tr><td style="color:#64748b">Temporary password</td><td><b style="font-family:monospace">${esc(pw)}</b></td></tr></table>
      <p style="font-size:13px;color:#475569;margin-top:20px">You must change this password the first time you sign in. Never share it. Only one device can be signed in at a time.</p></body>`);
    w.document.close(); w.focus(); w.print();
  }

  /* ================= Employee profile ================= */
  function openProfile(id) { ui.profileId = id; renderProfile(); H().openModal('empProfileModal'); }

  function renderProfile() {
    const e = findEmp(ui.profileId); if (!e) return;
    const ty = typeOf(e.type), r = roleOf(e.role), lg = LOGIN[e.login] || LOGIN.none, perms = e.rolePending ? [] : permsOf(r);
    const dl = (k, v) => `<div><dt class="text-xs text-slate-500 dark:text-slate-400">${k}</dt><dd class="mt-0.5 break-words text-sm font-medium text-slate-900 dark:text-white">${v}</dd></div>`;
    const h4 = (icon, t) => `<h4 class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><i data-lucide="${icon}" class="h-4 w-4 text-slate-400"></i>${t}</h4>`;
    const kv = (k, v) => `<div class="flex items-center justify-between gap-3"><span class="text-slate-500 dark:text-slate-400">${k}</span><span class="text-right">${v}</span></div>`;
    const btn = (act, icon, label) => `<button class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-[13px] font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" data-adm-do="${act}" data-id="${e.id}"><i data-lucide="${icon}" class="h-4 w-4 text-slate-400"></i>${label}</button>`;
    const acts = e.active ? loginActions(e).map(([a, i, l]) => btn(a, i, l)).join('') + (e.login === 'active' && can('credential:issue') ? btn('signout', 'log-out', 'Sign out everywhere') : '') : '';

    $('#profPanel').innerHTML = `<div class="flex items-start gap-4 border-b border-slate-100 p-6 dark:border-slate-800">
        ${avatar(e.name, ty.tone, 'h-14 w-14 text-base')}
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2"><h3 class="text-lg font-semibold text-slate-900 dark:text-white">${esc(e.name)}</h3>${badge(ty.tone, esc(e.type), ty.icon)}${e.active ? '' : badge('rose', 'Inactive')}</div>
          <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">${e.id} · ${esc(e.dept)} · ${esc(branchName(e.branch))}</p>
        </div>
        <button class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" data-close-modal aria-label="Close"><i data-lucide="x" class="h-5 w-5"></i></button>
      </div>
      <div class="grid gap-6 p-6 md:grid-cols-2">
        <section>
          ${h4('briefcase', 'Employment')}
          <dl class="grid grid-cols-2 gap-4">
            ${dl('Job type', esc(e.type))}${dl('Department', esc(e.dept))}${dl('Joined', fmtDate(e.joined))}${dl('Branch', esc(branchName(e.branch)))}
            ${dl('Mobile', esc(e.phone))}${dl('Email', esc(e.email || '—'))}
            ${e.type === 'Doctor' ? dl('Specialty', esc(e.spec || '—')) + dl('Registration no.', `<span class="font-mono">${esc(e.reg || '—')}</span>`) + dl('Consultation fee', e.fee ? H().inr(e.fee) : '—') + dl('Duty now', esc(e.duty || 'Off duty')) : ''}
          </dl>
          <p class="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">${e.type === 'Doctor'
            ? 'A doctor is an employee: one record for HR, attendance and payroll, plus clinical details used for appointments and prescriptions.'
            : 'Attendance, leave and payroll all use this employee record — with or without a login.'}</p>
        </section>
        <section class="space-y-6">
          <div>${h4('shield-check', 'Role in HMS')}
            ${can('role:assign') && e.active
              ? `<select class="adm-select w-full" data-adm-change="emp-role" data-id="${e.id}" aria-label="Role">${e.rolePending ? '<option value="" selected disabled>Choose a role…</option>' : ''}${Object.entries(T().roles).map(([k, x]) => `<option value="${k}" ${!e.rolePending && k === e.role ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select>`
              : `<p>${e.rolePending ? badge('violet', 'Role pending — admin assigns', 'hourglass') : `<span class="text-sm font-semibold">${esc(r.label)}</span>`}</p>`}
            <div class="mt-3 flex flex-wrap gap-1.5">${perms.slice(0, 9).map(chip).join('')}${perms.length > 9 ? `<span class="text-[11px] text-slate-400">+${perms.length - 9} more</span>` : ''}
              ${!e.rolePending && !perms.length ? '<span class="text-xs text-slate-500">Self-service only — My Work menu</span>' : ''}</div>
          </div>
          <div>${h4('key-round', 'Login')}
            <div class="space-y-2.5 rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700">
              ${kv('Status', badge(lg.tone, lg.label, lg.icon))}
              ${e.username ? kv('Username', `<span class="font-mono text-[13px]">${esc(e.username)}</span>`) + kv('Sign-in page', `<span class="font-mono text-[13px]">${T().slug}.hms.com</span>`) : ''}
              ${kv('Last sign-in', esc(e.lastLogin || '—'))}
            </div>
            <div class="mt-3 flex flex-wrap gap-2">${acts || (e.active && !can('credential:issue') ? '<p class="text-xs text-slate-500">Only an admin can create logins or reset passwords.</p>' : '')}</div>
          </div>
        </section>
      </div>
      <div class="flex items-center justify-between gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
        ${can('staff:deactivate') ? (e.active ? `<button class="text-sm font-semibold text-rose-600 hover:underline dark:text-rose-400" data-adm-do="deactivate" data-id="${e.id}">Deactivate employee</button>`
          : `<button class="text-sm font-semibold text-emerald-600 hover:underline" data-adm-do="reactivate" data-id="${e.id}">Reactivate employee</button>`) : '<span></span>'}
        <div class="flex gap-2"><button class="h-9 rounded-xl border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" data-close-modal>Close</button>
          <button class="inline-flex h-9 items-center gap-1.5 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700" data-pg="pf-open" data-id="${e.id}" data-close-modal><i data-lucide="user-round" class="h-4 w-4"></i>Full profile</button></div>
      </div>`;
    H().icons();
  }

  function changeEmpRole(id, key) {
    const e = findEmp(id); if (!e || !key) return;
    const from = e.rolePending ? 'no role' : roleOf(e.role).label;
    e.role = key; e.rolePending = false;
    audit('shield-check', 'teal', `<b>${who()}</b> changed ${esc(e.name)}’s role: ${esc(from)} → <b>${esc(roleOf(key).label)}</b>`);
    H().toast('Role updated', `${e.name} is now ${roleOf(key).label}. Applies on their next click.`, 'teal', 'shield-check');
    refresh(id);
  }

  /* ================= Add-employee wizard ================= */
  function openWizard(preType) {
    ui.wiz = { step: 0, type: null, id: nextId(), role: null, login: true, request: true, username: '', userEdited: false,
               password: genPassword(), showPw: false, channels: { whatsapp: true, sms: false, email: true }, errors: {}, created: null,
               data: { name: '', phone: '', email: '', gender: '', joined: todayISO(), dept: '', branch: 0, salary: '', spec: '', reg: '', fee: '', council: '' } };
    if (preType) { applyType(preType); ui.wiz.step = 1; }
    renderWizard(); H().openModal('empWizard');
  }
  function applyType(k) {
    const w = ui.wiz, t = typeOf(k);
    w.type = k; w.role = t.role; w.login = k !== 'Support Staff';
    w.data.dept = DEFAULT_DEPT[k] || w.data.dept || DEPARTMENTS[0];
  }
  function setField(key, val) {
    const w = ui.wiz;
    if (key === 'username') { w.username = val.trim().toLowerCase(); w.userEdited = true; }
    else if (key === 'role') w.role = val;
    else w.data[key] = val;
    delete w.errors[key];
  }

  function fld(key, label, o = {}) {
    const w = ui.wiz, v = key === 'username' ? w.username : (w.data[key] ?? ''), err = w.errors[key];
    const ctl = o.opts
      ? `<select class="field ${err ? 'invalid' : ''}" data-adm-field="${key}">${o.opts.map(x => { const [val, lab] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`
      : `<input class="field ${err ? 'invalid' : ''} ${o.mono ? 'font-mono' : ''}" type="${o.type || 'text'}" data-adm-field="${key}" value="${esc(v)}" placeholder="${esc(o.ph || '')}" ${o.type === 'tel' ? 'inputmode="tel"' : ''} autocomplete="off" />`;
    return `<label class="block ${o.full ? 'sm:col-span-2' : ''}"><span class="mb-1.5 block text-sm font-medium">${label}${o.req ? ' <span class="text-rose-500">*</span>' : ''}</span>${ctl}
      ${err ? `<span class="mt-1 block text-xs text-rose-600">${err}</span>` : o.help ? `<span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">${o.help}</span>` : ''}</label>`;
  }

  function wizBody() {
    const w = ui.wiz, d = w.data, ty = w.type && typeOf(w.type);
    const canAssign = can('role:assign'), canIssue = can('credential:issue');
    if (w.step === 0) return `<p class="mb-4 text-sm text-slate-500 dark:text-slate-400">Pick a job type. It decides the extra fields and suggests a role — you can change the role in step 3.</p>
      <div class="grid gap-3 sm:grid-cols-3">${STAFF_TYPES.map(t => `<button type="button" class="rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-teal-300 ${w.type === t.key ? 'border-teal-500 bg-teal-50/60 ring-4 ring-teal-500/10 dark:bg-teal-500/10' : 'border-slate-200 dark:border-slate-700'}" data-adm-pick-type="${t.key}">
        <span class="grid h-10 w-10 place-items-center rounded-xl ${tone(t.tone)}"><i data-lucide="${t.icon}" class="h-5 w-5"></i></span>
        <span class="mt-3 block text-sm font-semibold text-slate-900 dark:text-white">${t.key}</span>
        <span class="block text-xs text-slate-500 dark:text-slate-400">${t.desc}</span>
        <span class="mt-2 block text-[11px] text-slate-400">Suggested role: ${esc(roleOf(t.role).label)}</span></button>`).join('')}</div>`;

    if (w.step === 1) {
      const doc = w.type === 'Doctor';
      return `<div class="mb-5 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
          <i data-lucide="${ty.icon}" class="h-4 w-4 text-slate-500"></i><span class="font-medium">${esc(w.type)}</span><span class="text-slate-400">·</span>
          <span class="text-slate-500">Employee ID <b class="font-mono text-slate-700 dark:text-slate-200">${w.id}</b></span>
          <button type="button" class="ml-auto text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400" data-adm-step="0">Change type</button></div>
        <div class="grid gap-4 sm:grid-cols-2">
          ${fld('name', 'Full name', { req: true, full: true, ph: doc ? 'Dr. Riya Kapoor' : 'Riya Kapoor' })}
          ${fld('phone', 'Mobile number', { req: true, type: 'tel', ph: '98300 12345', help: 'Credentials and OTPs are sent here' })}
          ${fld('email', 'Email', { type: 'email', ph: 'name@example.com' })}
          ${fld('gender', 'Gender', { opts: [['', 'Select…'], 'Female', 'Male', 'Other'] })}
          ${fld('joined', 'Date of joining', { type: 'date' })}
          ${doc ? fld('spec', 'Specialty', { req: true, opts: [['', 'Select…'], ...CLINICAL] }) : fld('dept', 'Department', { opts: DEPARTMENTS })}
          ${fld('branch', 'Branch', { opts: T().branches.map((b, i) => [i, b]) })}
          ${doc ? fld('reg', 'Medical registration no.', { req: true, mono: true, ph: 'WBMC-12345' }) + fld('fee', 'Consultation fee (₹)', { type: 'number', ph: '800' }) : ''}
          ${w.type === 'Nurse' ? fld('council', 'Nursing council reg. no.', { mono: true, ph: 'WBNC-…' }) : ''}
          ${fld('salary', 'Monthly salary (₹)', { type: 'number', ph: '45000', help: H().modOn('hr') ? 'Used by payroll' : 'Payroll module is off on this plan' })}
        </div>`;
    }

    if (w.step === 2) {
      const r = roleOf(canAssign ? w.role : 'employee'), perms = permsOf(r);
      return `${canAssign
          ? `<div class="grid gap-4 sm:grid-cols-2">${fld('role', 'Role', { opts: Object.entries(T().roles).map(([k, x]) => [k, x.label]), help: `Suggested for ${esc(w.type)}. Edit roles under Roles & Permissions.` })}
             <div class="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400"><b class="text-slate-700 dark:text-slate-200">Applies at ${esc(branchName(d.branch))}.</b> Everyone also gets <b>My Work</b> — their own attendance, leave and payslips.</div></div>`
          : `<p class="flex gap-2 rounded-xl bg-violet-50 p-3 text-sm text-violet-800 dark:bg-violet-500/10 dark:text-violet-200"><i data-lucide="info" class="mt-0.5 h-4 w-4 shrink-0"></i>
             Your role can add employees but not assign roles. ${esc(d.name || 'This employee')} will be created with <b>Role pending</b>, and the admin is notified to assign one.</p>`}
        <p class="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">${canAssign ? `What “${esc(r.label)}” can do` : 'Until then they get'} · ${perms.length} permissions</p>
        <div class="grid gap-3 sm:grid-cols-2">${PERMISSIONS.map(g => {
          const on = g.items.filter(([c]) => perms.includes(c)).length;
          return `<div class="rounded-xl border border-slate-200 p-3 dark:border-slate-700 ${on ? '' : 'opacity-60'}">
            <p class="flex items-center gap-2 text-[13px] font-semibold"><i data-lucide="${g.icon}" class="h-4 w-4 text-slate-400"></i>${g.group}<span class="ml-auto text-xs font-normal text-slate-400">${on}/${g.items.length}</span></p>
            <ul class="mt-2 space-y-1">${g.items.map(([c, l]) => { const has = perms.includes(c); return `<li class="flex items-center gap-2 text-xs ${has ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'}"><i data-lucide="${has ? 'check' : 'minus'}" class="h-3 w-3 ${has ? 'text-emerald-600' : ''}"></i>${l}</li>`; }).join('')}</ul></div>`;
        }).join('')}</div>`;
    }

    if (w.step === 3) {
      if (!canIssue) return `<p class="flex gap-2 rounded-xl bg-violet-50 p-3 text-sm text-violet-800 dark:bg-violet-500/10 dark:text-violet-200"><i data-lucide="info" class="mt-0.5 h-4 w-4 shrink-0"></i>
          Only an admin can create logins and passwords. You can ask for one now — it shows up in the admin’s checklist.</p>
        <label class="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><input type="checkbox" class="h-4 w-4 accent-teal-600" data-adm-wizreq ${w.request ? 'checked' : ''} />
          <span><span class="block text-sm font-semibold">Request a login from the admin</span><span class="block text-xs text-slate-500">Leave unticked for staff who never use HMS.</span></span></label>`;
      if (!w.userEdited) w.username = makeUsername(d.name);
      const ch = (k, icon, label, sub, dis) => `<button type="button" class="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${w.channels[k] && !dis ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-500/10' : 'border-slate-200 dark:border-slate-700'}" data-adm-chan="${k}" aria-pressed="${w.channels[k] && !dis}" ${dis ? 'disabled' : ''}>
          <i data-lucide="${icon}" class="h-4 w-4 ${w.channels[k] && !dis ? 'text-teal-600' : 'text-slate-400'}"></i><span><span class="block text-[13px] font-semibold">${label}</span><span class="block text-[11px] text-slate-500">${sub}</span></span></button>`;
      return `<div class="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10"><i data-lucide="key-round" class="h-5 w-5"></i></span>
          <div class="min-w-0 flex-1"><p class="text-sm font-semibold">Allow sign-in to HMS</p><p class="text-xs text-slate-500 dark:text-slate-400">Turn off for staff who never use the software (housekeeping, security). They still get attendance and payroll.</p></div>
          <button type="button" class="switch" role="switch" aria-checked="${w.login}" data-adm-wiz="toggle-login" aria-label="Allow sign-in"></button></div>
        ${w.login ? `<div class="mt-5 grid gap-4 sm:grid-cols-2">
          ${fld('username', 'Username', { req: true, mono: true, help: `Signs in at <b>${T().slug}.hms.com</b>` })}
          <label class="block"><span class="mb-1.5 block text-sm font-medium">Temporary password</span>
            <div class="relative"><input class="field pr-20 font-mono" readonly value="${w.showPw ? esc(w.password) : '•'.repeat(w.password.length)}" aria-label="Temporary password" />
              <div class="absolute right-1 top-1 flex">
                <button type="button" class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700" data-adm-wiz="show-pw" aria-label="${w.showPw ? 'Hide' : 'Show'} password"><i data-lucide="${w.showPw ? 'eye-off' : 'eye'}" class="h-4 w-4"></i></button>
                <button type="button" class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700" data-adm-wiz="regen" aria-label="Generate a new password"><i data-lucide="refresh-cw" class="h-4 w-4"></i></button>
              </div></div>
            <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">Generated by HMS. Never stored in plain text.</span></label>
        </div>
        <ul class="mt-5 grid gap-2 text-[13px] text-slate-600 sm:grid-cols-3 dark:text-slate-300">
          ${['Must change password at first sign-in', 'One active session per account', 'Password resets only by admin'].map(t => `<li class="flex items-start gap-2"><i data-lucide="shield-check" class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"></i>${t}</li>`).join('')}</ul>
        <p class="mb-2 mt-6 text-sm font-medium">Send the login details by</p>
        <div class="grid gap-2 sm:grid-cols-3">
          ${ch('whatsapp', 'message-circle', 'WhatsApp', d.phone ? maskPhone(d.phone) : 'needs mobile', !d.phone)}
          ${ch('sms', 'smartphone', 'SMS', d.phone ? maskPhone(d.phone) : 'needs mobile', !d.phone)}
          ${ch('email', 'mail', 'Email', d.email ? maskMail(d.email) : 'no email given', !d.email)}
        </div>` : ''}`;
    }

    // step 4 — review
    const row = (k, v) => `<div class="flex justify-between gap-4 py-1.5 text-sm"><span class="text-slate-500 dark:text-slate-400">${k}</span><span class="text-right font-medium text-slate-900 dark:text-white">${v}</span></div>`;
    const sec = (title, icon, step, body) => `<div class="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
      <div class="mb-2 flex items-center gap-2"><i data-lucide="${icon}" class="h-4 w-4 text-slate-400"></i><p class="text-sm font-semibold">${title}</p>
      <button type="button" class="ml-auto text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400" data-adm-step="${step}">Edit</button></div>${body}</div>`;
    const chans = Object.entries(w.channels).filter(([k, v]) => v && (k === 'email' ? d.email : d.phone)).map(([k]) => ({ whatsapp: 'WhatsApp', sms: 'SMS', email: 'Email' }[k])).join(', ') || 'Not sent — print the slip';
    return `<div class="grid gap-3 sm:grid-cols-2">
      ${sec('Job', 'briefcase', 0, row('Type', esc(w.type)) + row('Employee ID', `<span class="font-mono">${w.id}</span>`))}
      ${sec('Role', 'shield-check', 2, row('Role', canAssign ? esc(roleOf(w.role).label) : badge('violet', 'Pending — admin assigns')) + row('Permissions', canAssign ? permsOf(roleOf(w.role)).length : 0))}
      ${sec('Details', 'id-card', 1, row('Name', esc(d.name)) + row('Mobile', esc(d.phone)) + row('Email', esc(d.email || '—')) + row(w.type === 'Doctor' ? 'Specialty' : 'Department', esc(w.type === 'Doctor' ? d.spec : d.dept)) + row('Branch', esc(branchName(d.branch))) + row('Joined', fmtDate(d.joined))
        + (w.type === 'Doctor' ? row('Reg. no.', `<span class="font-mono">${esc(d.reg)}</span>`) + row('Fee', d.fee ? H().inr(d.fee) : '—') : ''))}
      ${sec('Login', 'key-round', 3, !canIssue ? row('Access', w.request ? badge('violet', 'Requested from admin') : 'No login')
        : w.login ? row('Username', `<span class="font-mono">${esc(w.username)}</span>`) + row('Password', 'Temporary, generated') + row('Send by', esc(chans)) : row('Access', 'No login — works offline'))}
    </div>`;
  }

  function validateStep() {
    const w = ui.wiz, d = w.data, err = {};
    if (w.step === 1) {
      if (d.name.trim().length < 2) err.name = 'Enter the full name.';
      if (!/^\d{10}$/.test(d.phone.replace(/\D/g, ''))) err.phone = 'Enter a 10-digit mobile number.';
      if (d.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) err.email = 'That email doesn’t look right.';
      if (w.type === 'Doctor') { if (!d.spec) err.spec = 'Choose a specialty.'; if (d.reg.trim().length < 4) err.reg = 'Registration number is required for doctors.'; }
    }
    if (w.step === 3 && can('credential:issue') && w.login) {
      if (!/^[a-z][a-z0-9.]{2,}$/.test(w.username)) err.username = 'Use 3+ lowercase letters, numbers or dots.';
      else if (T().employees.some(e => e.username === w.username)) err.username = 'This username is taken.';
    }
    w.errors = err;
    return !Object.keys(err).length;
  }

  function renderWizard() {
    const w = ui.wiz, panel = $('#wizPanel');
    if (w.created) return renderWizardDone();
    const last = w.step === WSTEPS.length - 1;
    panel.innerHTML = `<aside class="hidden w-56 shrink-0 border-r border-slate-100 bg-slate-50/70 p-5 md:block dark:border-slate-800 dark:bg-slate-800/30">
        <p class="text-sm font-semibold text-slate-900 dark:text-white">Add employee</p><p class="mt-0.5 text-xs text-slate-500">${esc(T().name)}</p>
        <ol class="mt-6 space-y-1">${WSTEPS.map(([l], i) => `<li><button type="button" class="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition ${i === w.step ? 'bg-white font-semibold text-teal-700 shadow-sm dark:bg-slate-800 dark:text-teal-300' : i < w.step ? 'text-slate-700 hover:bg-white/70 dark:text-slate-200 dark:hover:bg-slate-800/60' : 'cursor-default text-slate-400'}" ${i < w.step ? `data-adm-step="${i}"` : 'disabled'}>
          <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${i < w.step ? 'bg-emerald-500 text-white' : i === w.step ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700'}">${i < w.step ? '<i data-lucide="check" class="h-3.5 w-3.5"></i>' : i + 1}</span>${l}</button></li>`).join('')}</ol>
        <p class="mt-8 rounded-xl border border-dashed border-slate-300 p-3 text-[11px] leading-relaxed text-slate-500 dark:border-slate-700">Doctors and nurses are employees too. The job type adds their fields; the role decides what they can do in HMS.</p>
      </aside>
      <div class="flex min-w-0 flex-1 flex-col">
        <div class="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div><p class="text-[11px] font-semibold uppercase tracking-wider text-teal-600">Step ${w.step + 1} of ${WSTEPS.length}</p>
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white">${WSTEPS[w.step][1]}</h3></div>
          <button type="button" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" data-close-modal aria-label="Close"><i data-lucide="x" class="h-5 w-5"></i></button>
        </div>
        <div class="h-1 bg-slate-100 dark:bg-slate-800"><div class="h-full bg-teal-600 transition-all duration-500" style="width:${(w.step + 1) / WSTEPS.length * 100}%"></div></div>
        <div class="thin-scroll max-h-[60vh] flex-1 overflow-y-auto px-6 py-5 fade-in" id="wizBody">${wizBody()}</div>
        <div class="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/30">
          <button type="button" class="h-10 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 ${w.step === 0 ? 'invisible' : ''}" data-adm-wiz="back">Back</button>
          <button type="button" class="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50" data-adm-wiz="${last ? 'create' : 'next'}" ${w.step === 0 && !w.type ? 'disabled' : ''}>
            ${last ? '<i data-lucide="user-plus" class="h-4 w-4"></i>Create employee' : 'Continue<i data-lucide="arrow-right" class="h-4 w-4"></i>'}</button>
        </div>
      </div>`;
    H().icons();
    const firstErr = panel.querySelector('.field.invalid'); if (firstErr) firstErr.focus();
  }

  function createEmployee() {
    const w = ui.wiz, d = w.data, t = T();
    const canAssign = can('role:assign'), canIssue = can('credential:issue');
    const e = { id: w.id, name: d.name.trim(), type: w.type, dept: w.type === 'Doctor' ? d.spec : d.dept, branch: +d.branch || 0, joined: d.joined,
      phone: d.phone.replace(/\D/g, ''), email: d.email.trim(), active: true, salary: +d.salary || 0, lastLogin: '—',
      role: canAssign ? w.role : 'employee', rolePending: !canAssign,
      login: canIssue ? (w.login ? 'invited' : 'none') : (w.request ? 'requested' : 'none'),
      username: canIssue && w.login ? w.username : '' };
    if (w.type === 'Doctor') Object.assign(e, { spec: d.spec, reg: d.reg.trim(), fee: +d.fee || 0, duty: 'Off duty', seen: 0 });
    t.employees.push(e);
    H().bumpStat('staff', 1); if (w.type === 'Doctor') H().bumpStat('doctors', 1);
    audit('user-plus', 'violet', `<b>${who()}</b> added ${esc(e.name)} (${esc(e.type)})${e.login === 'invited' ? ' and sent login details' : ''}`);
    if (!canAssign || e.login === 'requested')
      H().notify({ tone: 'violet', icon: 'user-plus', title: 'New employee needs access', text: `${me().person} added ${e.name} — ${[e.rolePending && 'assign a role', e.login === 'requested' && 'create a login'].filter(Boolean).join(' and ')}` });
    w.created = e;
    if (e.login === 'invited') ui.lastCred = { e, pw: w.password };
    renderWizard();
    H().refresh();
    const r = document.querySelector(`[data-adm-emp="${e.id}"]`); if (r) r.classList.add('row-flash');
  }

  function renderWizardDone() {
    const w = ui.wiz, e = w.created;
    $('#wizPanel').innerHTML = `<div class="relative w-full p-6 text-center sm:p-10 fade-in">
      <button type="button" class="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" data-close-modal aria-label="Close"><i data-lucide="x" class="h-5 w-5"></i></button>
      <span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"><i data-lucide="circle-check" class="h-7 w-7"></i></span>
      <h3 class="mt-4 text-xl font-semibold text-slate-900 dark:text-white">${esc(e.name)} added</h3>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">${esc(e.type)} · ${esc(e.dept)} · ${e.rolePending ? 'role pending' : esc(roleOf(e.role).label) + ' role'} · ${e.id}</p>
      ${e.login === 'invited'
        ? `<div class="mx-auto mt-6 max-w-md space-y-4 text-left">${credCardHTML(e, w.password)}<div class="space-y-1.5">${sentLines(e, w.channels)}</div>${onceNote}</div>`
        : `<p class="mx-auto mt-5 max-w-md rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">${e.login === 'requested'
            ? 'Login requested — the admin has been notified to create it' + (e.rolePending ? ' and assign a role.' : '.')
            : 'No login created. They still appear in attendance, rosters and payroll.'}</p>`}
      <div class="mt-7 flex flex-wrap justify-center gap-2">
        <button type="button" class="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" data-adm-wiz="another"><i data-lucide="user-plus" class="h-4 w-4"></i>Add another</button>
        ${e.login === 'invited' ? '<button type="button" class="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" data-adm-act="print-slip"><i data-lucide="printer" class="h-4 w-4"></i>Print slip</button>' : ''}
        <button type="button" class="h-10 rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-700" data-adm-wiz="view">View profile</button>
      </div></div>`;
    H().icons();
  }

  function wizAction(a) {
    const w = ui.wiz; if (!w) return;
    if (a === 'next') { if (!validateStep()) return renderWizard(); w.step++; return renderWizard(); }
    if (a === 'back') { w.step = Math.max(0, w.step - 1); return renderWizard(); }
    if (a === 'create') return createEmployee();
    if (a === 'toggle-login') { w.login = !w.login; return renderWizard(); }
    if (a === 'show-pw') { w.showPw = !w.showPw; return renderWizard(); }
    if (a === 'regen') { w.password = genPassword(); w.showPw = true; return renderWizard(); }
    if (a === 'another') return openWizard();
    if (a === 'view') { const id = w.created.id; H().closeModal('empWizard'); return setTimeout(() => openProfile(id), 180); }
  }

  /* ================= Roles & permissions ================= */
  const members = k => T().employees.filter(e => e.active && !e.rolePending && e.role === k);
  function loadDraft() { ui.draft = new Set(permsOf(T().roles[ui.roleSel])); ui.draftFor = T().slug + ':' + ui.roleSel; }
  function isDirty() {
    const cur = new Set(permsOf(T().roles[ui.roleSel]));
    return cur.size !== ui.draft.size || [...cur].some(p => !ui.draft.has(p));
  }

  function renderRoles(c) {
    if (!T().roles[ui.roleSel]) ui.roleSel = 'hr_manager';
    if (ui.draftFor !== T().slug + ':' + ui.roleSel) loadDraft();
    c.innerHTML = `<div class="fade-in grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div class="${card} self-start">
        <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div><h2 class="font-semibold text-slate-900 dark:text-white">Roles</h2><p class="text-xs text-slate-500 dark:text-slate-400">${Object.keys(T().roles).length} in ${esc(T().name)}</p></div>
          <button class="inline-flex h-8 items-center gap-1.5 rounded-lg bg-teal-600 px-2.5 text-xs font-semibold text-white hover:bg-teal-700" data-adm-act="new-role"><i data-lucide="plus" class="h-3.5 w-3.5"></i>New role</button>
        </div>
        <div id="admRoleList" class="space-y-1 p-2"></div>
        <p class="border-t border-slate-100 px-5 py-3 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">Job type ≠ role. A nurse and a ward attendant can share a role; two doctors can have different ones.</p>
      </div>
      <div id="admRoleEditor" class="min-w-0"></div></div>`;
    renderRoleList(); renderRoleEditor();
  }

  function renderRoleList() {
    const box = $('#admRoleList'); if (!box) return;
    box.innerHTML = Object.entries(T().roles).map(([k, r]) => {
      const sel = k === ui.roleSel, m = members(k).length;
      return `<button class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${sel ? 'bg-teal-50 ring-1 ring-teal-200 dark:bg-teal-500/10 dark:ring-teal-500/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}" data-adm-role-sel="${k}">
        <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg ${r.locked ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : sel ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}"><i data-lucide="${r.locked ? 'crown' : 'shield'}" class="h-4 w-4"></i></span>
        <span class="min-w-0 flex-1"><span class="flex items-center gap-1.5"><span class="truncate text-sm font-semibold text-slate-900 dark:text-white">${esc(r.label)}</span>${r.system ? '' : badge('amber', 'Custom')}</span>
        <span class="block text-[11px] text-slate-500 dark:text-slate-400">${m} ${m === 1 ? 'person' : 'people'} · ${r.perms === '*' ? 'all' : r.perms.length} permissions</span></span></button>`;
    }).join('');
    H().icons();
  }

  function renderRoleEditor() {
    const box = $('#admRoleEditor'); if (!box) return;
    const k = ui.roleSel, r = T().roles[k], locked = !!r.locked, mem = members(k), dirty = !locked && isDirty();
    const persona = Object.values(ROLES).find(p => p.tenantRole === k);
    box.innerHTML = `<div class="${card}">
      <div class="flex flex-wrap items-start gap-4 border-b border-slate-100 p-5 dark:border-slate-800">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2"><h2 class="text-lg font-semibold text-slate-900 dark:text-white">${esc(r.label)}</h2>
            ${locked ? badge('slate', 'Locked', 'lock') : r.system ? badge('teal', 'System role') : badge('amber', 'Custom role')}</div>
          <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">${esc(r.desc || 'Custom permission bundle')}</p>
          <div class="mt-3 flex items-center gap-2">
            <div class="flex -space-x-2">${mem.slice(0, 5).map(e => `<span class="grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold ring-2 ring-white dark:ring-slate-900 ${tone(typeOf(e.type).tone)}" title="${esc(e.name)}">${H().initials(e.name)}</span>`).join('')}</div>
            <span class="text-xs text-slate-500 dark:text-slate-400">${mem.length ? `${mem.length} ${mem.length === 1 ? 'employee has' : 'employees have'} this role` : 'No one has this role yet'}</span>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-[13px] font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" data-adm-act="clone-role"><i data-lucide="copy" class="h-4 w-4 text-slate-400"></i>Clone</button>
          ${!r.system ? `<button class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 px-3 text-[13px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40 dark:border-rose-500/30 dark:hover:bg-rose-500/10" data-adm-act="delete-role" ${mem.length ? 'disabled title="Move its employees to another role first"' : ''}><i data-lucide="trash-2" class="h-4 w-4"></i>Delete</button>` : ''}
        </div>
      </div>
      ${locked ? `<p class="mx-5 mt-5 flex gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"><i data-lucide="info" class="mt-0.5 h-4 w-4 shrink-0"></i>Admin always has every permission, so the hospital can never lock itself out. To give someone limited admin powers, clone this into a custom role.</p>`
        : persona ? `<p class="mx-5 mt-5 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"><i data-lucide="lightbulb" class="mt-0.5 h-4 w-4 shrink-0"></i>Demo tip: change permissions here, save, then use <b>View as → ${esc(persona.label)}</b> to see ${esc(persona.person)}’s menu change.</p>` : ''}
      <div class="grid gap-4 p-5 md:grid-cols-2">${PERMISSIONS.map((g, gi) => {
        const modOff = g.module && !H().modOn(g.module);
        const on = g.items.filter(([c]) => ui.draft.has(c)).length;
        return `<div class="rounded-2xl border border-slate-200 dark:border-slate-700 ${modOff ? 'opacity-60' : ''}">
          <label class="flex cursor-pointer items-center gap-2.5 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <input type="checkbox" class="h-4 w-4 accent-teal-600" data-adm-group="${gi}" ${on === g.items.length ? 'checked' : ''} ${locked || modOff ? 'disabled' : ''} data-indet="${on > 0 && on < g.items.length}" aria-label="Select all in ${g.group}" />
            <i data-lucide="${g.icon}" class="h-4 w-4 text-slate-400"></i><span class="text-sm font-semibold text-slate-900 dark:text-white">${g.group}</span>
            <span class="ml-auto text-xs ${on ? 'font-semibold text-teal-700 dark:text-teal-300' : 'text-slate-400'}">${on}/${g.items.length}</span></label>
          ${modOff ? '<p class="px-4 pt-2 text-[11px] text-amber-600">Module is off on this plan — these permissions do nothing yet.</p>' : ''}
          <div class="p-2">${g.items.map(([c, l]) => `<label class="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60">
            <input type="checkbox" class="mt-0.5 h-4 w-4 accent-teal-600" data-adm-perm="${c}" ${ui.draft.has(c) ? 'checked' : ''} ${locked || modOff ? 'disabled' : ''} />
            <span><span class="block text-[13px] text-slate-800 dark:text-slate-200">${l}</span><span class="font-mono text-[11px] text-slate-400">${c}</span></span></label>`).join('')}</div></div>`;
      }).join('')}</div>
      ${locked ? '' : `<div class="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-slate-100 bg-white/95 px-5 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <span class="text-sm text-slate-600 dark:text-slate-300"><b>${ui.draft.size}</b> of ${ALL_PERMS.length} permissions${dirty ? ' <span class="ml-1 font-medium text-amber-600">· unsaved changes</span>' : ''}</span>
        <div class="flex gap-2">
          <button class="h-9 rounded-xl border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800" data-adm-act="discard-role" ${dirty ? '' : 'disabled'}>Discard</button>
          <button class="h-9 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-40" data-adm-act="save-role" ${dirty ? '' : 'disabled'}>Save changes</button>
        </div></div>`}
    </div>`;
    box.querySelectorAll('[data-indet="true"]').forEach(cb => { cb.indeterminate = true; });
    H().icons();
  }

  function selectRole(k) {
    const go = () => { ui.roleSel = k; loadDraft(); renderRoleList(); renderRoleEditor(); };
    if (k === ui.roleSel) return;
    if (!T().roles[ui.roleSel].locked && isDirty()) return H().confirmDialog({ title: 'Discard unsaved changes?', text: `Your edits to ${T().roles[ui.roleSel].label} haven’t been saved.`, ok: 'Discard', icon: 'triangle-alert', onOk: go });
    go();
  }

  function saveRole() {
    const r = T().roles[ui.roleSel], before = new Set(permsOf(r));
    const added = [...ui.draft].filter(p => !before.has(p)), removed = [...before].filter(p => !ui.draft.has(p));
    r.perms = ALL_PERMS.filter(p => ui.draft.has(p));
    const n = members(ui.roleSel).length;
    audit('shield-check', 'teal', `<b>${who()}</b> updated role <b>${esc(r.label)}</b>: ${[added.length && '+' + added.join(', +'), removed.length && '−' + removed.join(', −')].filter(Boolean).join('; ')}`);
    H().toast(`${r.label} saved`, `+${added.length} / −${removed.length} permissions · applies to ${n} ${n === 1 ? 'person' : 'people'} now`, 'teal', 'shield-check');
    H().refresh();
  }

  function cloneRole() {
    const src = T().roles[ui.roleSel], key = 'custom_' + Date.now().toString(36);
    T().roles[key] = { label: src.label + ' (copy)', system: false, desc: src.desc, perms: [...permsOf(src)] };
    ui.roleSel = key; loadDraft();
    audit('copy', 'teal', `<b>${who()}</b> created role <b>${esc(T().roles[key].label)}</b> from ${esc(src.label)}`);
    H().toast('Role cloned', 'Rename it from New role, or adjust its permissions.', 'teal', 'copy');
    H().refresh();
  }

  function openNewRole() {
    const f = $('#roleNewForm'); f.reset();
    f.from.innerHTML = `<option value="">Start empty</option>` + Object.entries(T().roles).map(([k, r]) => `<option value="${k}" ${k === ui.roleSel ? 'selected' : ''}>${esc(r.label)}</option>`).join('');
    f.querySelector('.err').classList.add('hidden'); f.name.classList.remove('invalid');
    H().openModal('roleNewModal');
  }
  function submitNewRole(ev) {
    ev.preventDefault();
    const f = ev.target, name = f.name.value.trim();
    if (name.length < 3 || Object.values(T().roles).some(r => r.label.toLowerCase() === name.toLowerCase())) {
      f.name.classList.add('invalid'); const er = f.querySelector('.err'); er.textContent = name.length < 3 ? 'Give the role a name (3+ characters).' : 'A role with this name exists.'; er.classList.remove('hidden'); return;
    }
    const key = 'custom_' + Date.now().toString(36), src = f.from.value && T().roles[f.from.value];
    T().roles[key] = { label: name, system: false, desc: f.desc.value.trim() || 'Custom permission bundle', perms: src ? [...permsOf(src)] : [] };
    ui.roleSel = key; loadDraft();
    H().closeModal('roleNewModal');
    audit('shield-plus', 'teal', `<b>${who()}</b> created role <b>${esc(name)}</b>`);
    H().toast('Role created', `${name} — now tick its permissions and save.`, 'teal', 'shield-plus');
    if (H().state.active !== 'staff:roles') H().navigate('staff:roles'); else H().refresh();
  }

  /* ================= events ================= */
  function onClick(ev) {
    const t = ev.target;
    const was = ui.menuFor; ui.menuFor = null;
    const mb = t.closest('[data-adm-menu]');
    if (mb) { ev.stopPropagation(); if (was === mb.dataset.admMenu) { $('#admMenu').classList.remove('open'); return; } return openMenu(mb); }
    if (!t.closest('#admMenu')) $('#admMenu').classList.remove('open');

    const d = t.closest('[data-adm-do]'); if (d) return doAction(d.dataset.admDo, d.dataset.id);
    const lf = t.closest('[data-adm-login]'); if (lf) { ui.login = lf.dataset.admLogin; ui.q = ''; ui.type = 'all'; return H().rerenderPage(); }
    const pk = t.closest('[data-adm-pick-type]'); if (pk) { applyType(pk.dataset.admPickType); return renderWizard(); }
    const st = t.closest('[data-adm-step]'); if (st && ui.wiz) { ui.wiz.step = +st.dataset.admStep; return renderWizard(); }
    const wz = t.closest('[data-adm-wiz]'); if (wz) return wizAction(wz.dataset.admWiz);
    const ch = t.closest('[data-adm-chan]'); if (ch && !ch.disabled) { const k = ch.dataset.admChan; ui.wiz.channels[k] = !ui.wiz.channels[k]; return renderWizard(); }
    const rs = t.closest('[data-adm-role-sel]'); if (rs) return selectRole(rs.dataset.admRoleSel);
    const cp = t.closest('[data-adm-copy]'); if (cp) return copy(cp.dataset.admCopy, cp.dataset.label);
    const row = t.closest('[data-adm-emp]'); if (row) return openProfile(row.dataset.admEmp);

    const a = t.closest('[data-adm-act]'); if (!a) return;
    switch (a.dataset.admAct) {
      case 'add': return openWizard(a.dataset.admType);
      case 'toggle-checklist': {
        ui.checklist = !ui.checklist;
        $('#chkBody')?.classList.toggle('open', ui.checklist);
        a.querySelector('svg')?.classList.toggle('rotate-180', ui.checklist);
        return a.setAttribute('aria-expanded', ui.checklist);
      }
      case 'hide-explainer': ui.explainer = false; return H().rerenderPage();
      case 'new-role': return openNewRole();
      case 'clone-role': return cloneRole();
      case 'delete-role': {
        const r = T().roles[ui.roleSel];
        return H().confirmDialog({ title: `Delete ${r.label}?`, text: 'Nobody has this role, so nothing else changes.', ok: 'Delete role', icon: 'trash-2',
          onOk: () => { delete T().roles[ui.roleSel]; audit('trash-2', 'rose', `<b>${who()}</b> deleted role ${esc(r.label)}`); ui.roleSel = 'hr_manager'; loadDraft(); H().toast('Role deleted', r.label, 'rose', 'trash-2'); H().refresh(); } });
      }
      case 'save-role': return saveRole();
      case 'discard-role': loadDraft(); return renderRoleEditor();
      case 'print-slip': return printSlip();
    }
  }

  function onChange(ev) {
    const t = ev.target, ds = t.dataset;
    if (ds.admChange === 'type') { ui.type = t.value; return renderEmpRows(); }
    if (ds.admChange === 'login') { ui.login = t.value; return renderEmpRows(); }
    if (ds.admChange === 'emp-role') return changeEmpRole(ds.id, t.value);
    if (ds.admPerm) { t.checked ? ui.draft.add(ds.admPerm) : ui.draft.delete(ds.admPerm); return renderRoleEditor(); }
    if (ds.admGroup !== undefined) {
      const items = PERMISSIONS[+ds.admGroup].items.map(i => i[0]), all = items.every(p => ui.draft.has(p));
      items.forEach(p => (all ? ui.draft.delete(p) : ui.draft.add(p)));
      return renderRoleEditor();
    }
    if (ds.admWizreq !== undefined && ui.wiz) { ui.wiz.request = t.checked; return; }
    if (ds.admField && ui.wiz) { setField(ds.admField, t.value); if (ds.admField === 'role') renderWizard(); }
  }

  function onInput(ev) {
    const t = ev.target, ds = t.dataset;
    if (ds.admInput === 'q') { ui.q = t.value; return renderEmpRows(); }
    if (ds.admField && ui.wiz && t.tagName !== 'SELECT') {
      setField(ds.admField, t.value);
      if (t.classList.contains('invalid')) { t.classList.remove('invalid'); const er = t.parentElement.querySelector('.text-rose-600'); if (er) er.remove(); }
    }
  }

  const MODALS = `
  <div id="empWizard" class="modal fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-slate-900/50 p-4 overlay-blur" data-static role="dialog" aria-modal="true" aria-label="Add employee">
    <div id="wizPanel" class="modal-panel flex w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"></div>
  </div>
  <div id="empProfileModal" class="modal fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-slate-900/50 p-4 overlay-blur" role="dialog" aria-modal="true" aria-label="Employee profile">
    <div id="profPanel" class="modal-panel w-full max-w-3xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900"></div>
  </div>
  <div id="roleNewModal" class="modal fixed inset-0 z-[65] grid place-items-center bg-slate-900/50 p-4 overlay-blur" role="dialog" aria-modal="true" aria-label="Create role">
    <form id="roleNewForm" class="modal-panel w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-900" novalidate>
      <div class="border-b border-slate-100 px-6 py-5 dark:border-slate-800"><h3 class="text-lg font-semibold">Create a role</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400">Start from an existing role, then adjust its permissions.</p></div>
      <div class="space-y-4 px-6 py-5">
        <label class="block"><span class="mb-1.5 block text-sm font-medium">Role name <span class="text-rose-500">*</span></span><input name="name" class="field" placeholder="e.g. Night Shift Supervisor" autocomplete="off" /><span class="err mt-1 hidden text-xs text-rose-600"></span></label>
        <label class="block"><span class="mb-1.5 block text-sm font-medium">Description</span><input name="desc" class="field" placeholder="What this role is for" autocomplete="off" /></label>
        <label class="block"><span class="mb-1.5 block text-sm font-medium">Start from</span><select name="from" class="field"></select></label>
      </div>
      <div class="flex justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/30">
        <button type="button" class="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800" data-close-modal>Cancel</button>
        <button type="submit" class="h-10 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700">Create role</button>
      </div>
    </form>
  </div>
  <div id="credModal" class="modal fixed inset-0 z-[66] grid place-items-center overflow-y-auto bg-slate-900/50 p-4 overlay-blur" role="dialog" aria-modal="true" aria-label="Login details">
    <div id="credPanel" class="modal-panel w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-900"></div>
  </div>`;

  function init() {
    document.getElementById('confirmModal').insertAdjacentHTML('beforebegin', MODALS);
    document.body.insertAdjacentHTML('beforeend', '<div id="admMenu" class="dropdown fixed z-[55] w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-800" role="menu"></div>');
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    $('#roleNewForm').addEventListener('submit', submitNewRole);
    window.addEventListener('scroll', () => { $('#admMenu').classList.remove('open'); ui.menuFor = null; }, { passive: true });
  }

  /* ---------------- register with app.js ---------------- */
  window.HMSPages = Object.assign(window.HMSPages || {}, {
    'staff:list':   { title: 'Staff & Users', render: c => renderEmployees(c) },
    // menu shortcut: show the list and open the wizard once, then behave like the list page
    'staff:new':    { title: 'Staff & Users', render: c => { H().state.active = 'staff:list'; renderEmployees(c); openWizard(); } },
    'staff:roles':  { title: 'Roles & Permissions', render: renderRoles },
    'doctors:list': { title: 'Doctors', sub: 'Doctors are employees with job type “Doctor” plus clinical details.', render: c => renderEmployees(c, { doctors: true }) },
  });
  window.HMSHooks = (window.HMSHooks || []).concat(renderDashTop);
  window.HMSAdmin = { init, openWizard };
})();
