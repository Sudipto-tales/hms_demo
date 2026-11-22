/* HMS demo — Profile page for every user (any staff role, and the patient).
 * Cover + identity header, then tabs: Account (about + activity timeline), Attendance
 * (Visits for patients), Media (photos & documents) and Connections (Care team for patients).
 * Open your own from the header menu (My profile); open a colleague's with data-pg="pf-open" data-id="EMP-…".
 */
(() => {
  'use strict';
  const K = window.PG;
  const { esc, T, D, can, me, card, badge, avatar, ico, btn, seg, search, cardHead, table, td, td0, empty, note, field, readForm, modal, on, rerender, ui,
    iso, addDays, fmtDate, fmtShort, monthName, audit, who } = K;
  const H = () => window.HMS;
  const toast = (...a) => H().toast(...a);

  const TYPE_TONE = { Doctor: 'emerald', Nurse: 'rose', HR: 'violet', Receptionist: 'sky', Accountant: 'amber', Administration: 'teal', Pharmacist: 'emerald', 'Lab Technician': 'sky', 'Support Staff': 'slate' };
  const ATT = { present: ['emerald', 'Present'], late: ['amber', 'Late'], absent: ['rose', 'Absent'], leave: ['violet', 'On leave'], 'half-day': ['sky', 'Half day'], off: ['slate', 'Week off'] };
  const hash = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const isPatientView = () => H().state.role === 'patient';
  const branchOf = i => (T().branches[i || 0] || '').split(' · ')[0];

  /* ---------------- who are we looking at ---------------- */
  function subject() {
    const t = T();
    if (!ui.pfId && isPatientView()) {
      const p = D().pt(ROLES.patient.person);
      return { kind: 'patient', key: p.mrn, self: true, name: p.name, title: 'Patient', tone: 'rose', p,
        branch: branchOf(p.branch), joined: p.registered, phone: p.phone, email: p.name.toLowerCase().replace(/\s+/g, '.') + '@gmail.com' };
    }
    const mine = t.employees.find(x => x.name === me().person);
    const e = (ui.pfId && t.employees.find(x => x.id === ui.pfId)) || mine || t.employees[0];
    const role = t.roles[e.role];
    return { kind: 'emp', key: e.id, self: e === mine, e, name: e.name, tone: TYPE_TONE[e.type] || 'teal',
      title: e.type === 'Doctor' ? `${e.spec || e.dept} · Doctor` : e === mine ? me().title : e.type,
      role: e.rolePending ? 'Role pending' : role ? role.label : '—', branch: branchOf(e.branch), joined: e.joined, phone: e.phone, email: e.email };
  }
  const extra = s => (ui.pfExtra ||= {})[s.key] ||= { bio: '', langs: s.kind === 'patient' ? 'Bengali, Hindi' : 'English, Bengali, Hindi' };
  const myConn = () => ui.pfConn ||= new Set(T().employees.filter(x => x.dept === (T().employees.find(e => e.name === me().person) || {}).dept && x.name !== me().person).map(x => x.id).concat(['EMP-1001', 'EMP-1002', 'EMP-1004', 'EMP-1010']).filter(id => (T().employees.find(x => x.id === id) || {}).name !== me().person));

  /* ---------------- time helpers ---------------- */
  const ago = m => m < 1 ? 'just now' : m < 60 ? `${Math.round(m)} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : m < 2880 ? 'Yesterday' : m < 43200 ? `${Math.round(m / 1440)} days ago` : fmtDate(addDays(new Date(), -Math.round(m / 1440)));
  const parseAgo = s => { const n = parseFloat(s) || 0; return /just/.test(s) ? 0 : /min/.test(s) ? n : /\bh\b/.test(s) ? n * 60 : /\bd\b|day/.test(s) ? n * 1440 : 9e5; };
  // minutes since HH:MM today; if that time hasn't come yet on this clock, it was yesterday's
  const minsSince = hhmm => { const [h, m] = hhmm.split(':').map(Number), n = new Date(), d = n.getHours() * 60 + n.getMinutes() - (h * 60 + m); return d >= 0 ? Math.max(1, d) : d + 1440; };
  const daysSince = d => Math.max(0, Math.round((Date.now() - new Date(d)) / 864e5));

  /* ======================= Page shell ======================= */
  const TABS = s => s.kind === 'patient'
    ? [['account', 'Account', 'user-round'], ['visits', 'Visits', 'calendar-check'], ['media', 'Media', 'images'], ['connections', 'Care team', 'link']]
    : [['account', 'Account', 'user-round'], ['attendance', 'Attendance', 'calendar-days'], ['media', 'Media', 'images'], ['connections', 'Connections', 'link']];

  function renderProfile(c) {
    const s = subject(), tabs = TABS(s), tab = tabs.some(x => x[0] === ui.pfTab) ? ui.pfTab : 'account';
    const tl = document.getElementById('pageTitle'), cr = document.getElementById('crumb');
    if (tl) tl.textContent = s.self ? 'My Profile' : s.name;
    if (cr) cr.textContent = s.self ? 'My Profile' : 'Profile';
    const ps = document.getElementById('pageSub'); if (ps) ps.textContent = s.self ? (s.kind === 'patient' ? 'Your details, visits, files and care team.' : 'Your details, attendance, files and colleagues.') : `${s.title} · ${s.branch}`;

    const connected = s.kind === 'emp' && myConn().has(s.key);
    const action = s.self ? btn('primary', 'Edit profile', 'user-pen', 'data-pg="pf-edit"')
      : `${btn('ghost', 'Message', 'message-square', `data-pg="pf-msg" data-name="${esc(s.name)}"`)}${connected
        ? `<button type="button" class="inline-flex h-9 items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700" data-pg="pf-conn" data-id="${s.key}">${ico('user-check')}Connected</button>`
        : btn('soft', 'Connect', 'user-plus', `data-pg="pf-conn" data-id="${s.key}"`)}`;
    const meta = [[s.kind === 'patient' ? 'heart-pulse' : s.e.type === 'Doctor' ? 'stethoscope' : 'briefcase', s.title], ['map-pin', s.branch], ['calendar', `${s.kind === 'patient' ? 'Registered' : 'Joined'} ${fmtDate(s.joined, { month: 'long', year: 'numeric' })}`]];

    c.innerHTML = `<div class="fade-in space-y-5">
      ${!s.self ? `<button type="button" class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-300" data-pg="pf-open">${ico('arrow-left')}Back to my profile</button>` : ''}
      <section class="${card} overflow-hidden">
        <div class="pf-cover relative h-32 sm:h-44" aria-hidden="true">
          ${s.self ? `<button type="button" class="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-2.5 py-1.5 text-xs font-semibold text-slate-700 backdrop-blur hover:bg-white dark:bg-slate-900/70 dark:text-slate-200" data-pg="pf-cover">${ico('image', 'h-3.5 w-3.5')}Change cover</button>` : ''}
        </div>
        <div class="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:px-6">
          <div class="relative -mt-12 w-fit shrink-0 sm:-mt-14">
            <span class="grid h-24 w-24 place-items-center rounded-2xl border-4 border-white text-3xl font-bold shadow-md dark:border-slate-900 sm:h-28 sm:w-28 ${K.tone(s.tone)}">${esc(K.initials(s.name))}</span>
            ${s.kind === 'emp' && s.e.login === 'active' && /Today/.test(s.e.lastLogin || '') ? '<span class="absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" title="Online today"></span>' : ''}
          </div>
          <div class="min-w-0 flex-1 sm:pb-1">
            <div class="flex flex-wrap items-center gap-2"><h2 class="truncate text-xl font-semibold text-slate-900 dark:text-white sm:text-2xl">${esc(s.name)}</h2>
              ${s.kind === 'emp' ? (s.e.active ? '' : badge('rose', 'Inactive')) + (s.self ? badge('teal', 'You') : '') : badge('rose', s.p.mrn, 'id-card')}</div>
            <ul class="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-500 dark:text-slate-400">${meta.map(([i, l]) => `<li class="inline-flex items-center gap-1.5">${ico(i, 'h-4 w-4')}${esc(l)}</li>`).join('')}</ul>
          </div>
          <div class="flex flex-wrap gap-2 sm:pb-1">${action}</div>
        </div>
      </section>
      <nav class="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 thin-scroll" role="tablist" aria-label="Profile sections">${tabs.map(([k, l, i]) => `<button type="button" role="tab" aria-selected="${k === tab}"
        class="inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${k === tab ? 'bg-teal-600 text-white shadow-md shadow-teal-600/25' : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'}"
        data-pg="seg" data-key="pfTab" data-val="${k}">${ico(i)}${l}</button>`).join('')}</nav>
      <div>${({ account: tabAccount, attendance: tabAttendance, visits: tabVisits, media: tabMedia, connections: tabConnections })[tab](s)}</div>
    </div>`;
  }

  /* ======================= Account ======================= */
  function tabAccount(s) {
    const x = extra(s);
    const row = (i, k, v) => `<li class="flex items-start gap-3 py-1.5">${ico(i, 'mt-0.5 h-4 w-4 shrink-0 text-slate-400')}<span class="shrink-0 font-medium text-slate-700 dark:text-slate-200">${k}:</span><span class="min-w-0 break-words text-slate-500 dark:text-slate-400">${v}</span></li>`;
    const head = t => `<p class="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 first:mt-0">${t}</p>`;
    let about;
    if (s.kind === 'patient') {
      const p = s.p;
      about = head('About') + `<ul class="text-sm">${row('user', 'Full name', esc(p.name))}${row('id-card', 'MRN', `<span class="font-mono">${esc(p.mrn)}</span>`)}${row('cake', 'Age / sex', `${p.age} · ${p.gender === 'F' ? 'Female' : 'Male'}`)}
        ${row('droplet', 'Blood group', esc(p.blood))}${row('shield-plus', 'Insurance', esc(p.insurance || 'Self-pay'))}${row('triangle-alert', 'Allergies', p.allergies ? `<span class="font-semibold text-rose-600 dark:text-rose-400">${esc(p.allergies)}</span>` : 'None recorded')}${row('languages', 'Languages', esc(x.langs))}</ul>`
        + head('Contacts') + `<ul class="text-sm">${row('phone', 'Mobile', esc(s.phone))}${row('mail', 'Email', esc(s.email))}</ul>`
        + head('Care') + `<ul class="text-sm">${row('stethoscope', 'Primary doctor', esc(p.doctor || '—'))}${row('repeat', 'Visits', p.visits)}${row('calendar-clock', 'Last visit', fmtDate(p.lastVisit))}</ul>`;
    } else {
      const e = s.e, lg = { active: ['emerald', 'Active'], invited: ['amber', 'Invite sent'], none: ['slate', 'No login'], disabled: ['rose', 'Login disabled'], requested: ['violet', 'Login requested'] }[e.login] || ['slate', e.login];
      const showContact = s.self || can('staff:read');
      about = head('About') + `<ul class="text-sm">${row('user', 'Full name', esc(e.name))}${row('check', 'Status', e.active ? badge(...lg) : badge('rose', 'Inactive'))}${row('crown', 'Role', esc(s.role))}
        ${row('briefcase', 'Job type', esc(e.type))}${row('building-2', 'Department', esc(e.dept))}${row('hash', 'Employee ID', `<span class="font-mono">${esc(e.id)}</span>`)}${row('languages', 'Languages', esc(x.langs))}</ul>`
        + (e.type === 'Doctor' ? head('Clinical') + `<ul class="text-sm">${row('heart-pulse', 'Specialty', esc(e.spec || e.dept))}${row('badge-check', 'Reg. no.', `<span class="font-mono">${esc(e.reg || '—')}</span>`)}${row('indian-rupee', 'Fee', e.fee ? H().inr(e.fee) : '—')}${row('activity', 'Now', esc(e.duty || 'Off duty'))}</ul>` : '')
        + head('Contacts') + (showContact ? `<ul class="text-sm">${row('phone', 'Mobile', esc(e.phone))}${row('mail', 'Email', esc(e.email))}${e.username ? row('at-sign', 'Username', `<span class="font-mono">${esc(e.username)}</span>`) : ''}</ul>`
          : `<p class="flex items-center gap-2 text-sm text-slate-500">${ico('lock', 'h-4 w-4')}Visible to HR and admins</p>`);
    }
    // Overview tiles
    const ov = s.kind === 'patient'
      ? [['calendar-check', 'teal', s.p.visits, 'Visits'], ['flask-round', 'sky', D().labOrders.filter(l => l.mrn === s.p.mrn).length + 1, 'Reports'], ['images', 'violet', media(s).length, 'Files']]
      : [['calendar-check', 'emerald', attSummary(s).pct + '%', 'Attendance'], ['link', 'teal', connList(s).filter(x => x.conn).length, 'Connections'], ['images', 'violet', media(s).length, 'Files']];
    const overview = `<div class="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-5 dark:border-slate-800">${ov.map(([i, t, v, l]) => `<div class="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/50">
      <span class="mx-auto grid h-8 w-8 place-items-center rounded-lg ${K.tone(t)}">${ico(i)}</span><p class="mt-1.5 text-lg font-bold tabular-nums text-slate-900 dark:text-white">${v}</p><p class="text-[11px] text-slate-500">${l}</p></div>`).join('')}</div>`;
    const bio = x.bio ? `<p class="mb-1 rounded-xl bg-teal-50/60 p-3 text-sm italic text-slate-600 dark:bg-teal-500/5 dark:text-slate-300">“${esc(x.bio)}”</p>` : s.self ? `<button type="button" class="mb-1 flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-300 p-3 text-left text-sm text-slate-500 hover:border-teal-500 hover:text-teal-700 dark:border-slate-700" data-pg="pf-edit">${ico('pen-line')}Add a short bio ${s.kind === 'patient' ? 'your care team' : 'colleagues'} will see</button>` : '';

    return `<div class="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <div class="space-y-5"><div class="${card} p-5">${bio}${about}${overview}</div>
        ${s.kind === 'emp' && s.self ? `<div class="${card} p-5"><p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Quick links</p><div class="mt-3 grid gap-2">
          ${[['me:attendance', 'fingerprint', 'Check in / out'], ['me:leave', 'calendar-off', 'Apply for leave'], ['me:payslips', 'wallet', 'Payslips']].map(([n, i, l]) => `<button type="button" class="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" data-nav="${n}">${ico(i, 'h-4 w-4 text-slate-400')}${l}${ico('chevron-right', 'ml-auto h-4 w-4 text-slate-300')}</button>`).join('')}</div></div>` : ''}
      </div>
      <div class="${card}">
        <div class="flex items-center gap-3 px-5 pt-5">${ico('chart-no-axes-column', 'h-5 w-5 text-slate-500')}<h3 class="flex-1 text-lg font-semibold text-slate-900 dark:text-white">Activity Timeline</h3>
          ${seg('pfAct', [['all', 'All'], ['work', s.kind === 'patient' ? 'Care' : 'Work'], ['account', 'Account']], ui.pfAct || 'all')}</div>
        <div class="p-5">${timelineHTML(s)}</div>
      </div></div>`;
  }

  function timeline(s) {
    const t = T(), d = D(), out = [];
    const add = (m, o) => out.push({ m, ...o });
    if (s.kind === 'patient') {
      const p = s.p;
      t.appointments.filter(a => a.patient === p.name).forEach(a => add(a.status === 'completed' ? 90 : 10, { cat: 'work', tone: 'teal', title: `Appointment ${a.status === 'completed' ? 'completed' : 'booked'} with ${a.doctor}`, text: `${a.dept} · ${a.type} · ${a.time}`, people: [a.doctor] }));
      d.prescriptions.filter(r => r.mrn === p.mrn).forEach((r, i) => add(120 + i * 1440, { cat: 'work', tone: 'violet', title: 'Prescription issued', text: `${r.dx} · by ${r.doctor}`, file: [`${r.id}.pdf`, '84 KB'] }));
      d.labOrders.filter(l => l.mrn === p.mrn).forEach(l => add(l.status === 'released' ? 70 : 30, { cat: 'work', tone: 'sky', title: `${l.test} ${l.status === 'released' ? 'report ready' : 'sample collected'}`, text: l.status === 'released' ? 'Verified by the lab — download anytime' : 'Results expected today', file: l.status === 'released' ? [`${l.id}-report.pdf`, '212 KB'] : null }));
      d.invoices.filter(i => i.mrn === p.mrn).forEach(i => add(daysSince(i.date) * 1440 + 200, { cat: 'work', tone: i.status === 'paid' ? 'emerald' : 'amber', title: `${i.id} ${i.status === 'paid' ? 'paid' : 'raised'} · ${H().inr(i.total)}`, text: i.items.map(x => x.desc).join(', '), file: i.status === 'paid' ? [`Receipt-${i.id}.pdf`, '46 KB'] : null }));
      add(daysSince(p.registered) * 1440, { cat: 'account', tone: 'rose', title: `Registered at ${t.name}`, text: `MRN ${p.mrn} · ${s.branch}` });
      add(2 * 1440 + 30, { cat: 'account', tone: 'slate', title: 'Signed in to the patient portal', text: 'OTP on mobile · Chrome on Android' });
    } else {
      const e = s.e, a = d.attendance.find(x => x.id === e.id);
      // things this person actually did in the demo (audit + live activity feed)
      d.audit.filter(x => x.user === e.name).forEach(x => add((Date.now() - x.at) / 6e4, { cat: /auth|credential/.test(x.action) ? 'account' : 'work', tone: x.action.startsWith('auth') ? 'slate' : 'teal', title: x.text, text: `${x.action} · ${x.branch}` }));
      H().state.activity.filter(x => x.text.startsWith(`<b>${e.name}</b>`) && !d.audit.some(a => a.user === e.name && Math.abs((Date.now() - a.at) / 6e4 - parseAgo(x.time)) < 15)).forEach(x => add(parseAgo(x.time), { cat: 'work', tone: x.tone, html: x.text, text: '' }));
      if (a && a.in) add(minsSince(a.in), { cat: 'work', tone: a.status === 'late' ? 'amber' : 'emerald', title: `Checked in at ${a.in}${a.status === 'late' ? ' (late)' : ''}`, text: `${a.shift} shift · ${a.source}` });
      if (a && a.out) add(minsSince(a.out), { cat: 'work', tone: 'slate', title: `Checked out at ${a.out}`, text: `${a.shift} shift` });
      if (e.type === 'Doctor') {
        const pts = t.appointments.filter(x => x.doctor === e.name);
        if (pts.length || e.seen) add(25, { cat: 'work', tone: 'violet', title: `${e.seen || pts.length} consultations today`, text: `${e.dept} OPD · ${pts.filter(x => x.status !== 'completed' && x.status !== 'cancelled').length} still in queue`, people: pts.map(x => x.patient) });
        d.prescriptions.filter(r => r.doctor === e.name).slice(0, 2).forEach((r, i) => add(240 + i * 1440, { cat: 'work', tone: 'sky', title: `Prescription sent to ${r.patient}`, text: r.dx, file: [`${r.id}.pdf`, '84 KB'] }));
      }
      const team = t.employees.filter(x => x.dept === e.dept && x.id !== e.id && x.active).map(x => x.name);
      if (team.length) add(3 * 1440 + 90, { cat: 'work', tone: 'teal', title: `${e.dept} team huddle`, text: 'Weekly review — rosters, pending work and safety', people: [e.name, ...team] });
      if (e.active && e.login !== 'none') add(19 * 1440, { cat: 'account', tone: 'emerald', title: `Payslip for ${monthName(-1)} released`, text: 'Shared on WhatsApp and email', file: [`Payslip-${monthName(-1).replace(' ', '-')}.pdf`, '58 KB'] });
      add(32 * 1440, { cat: 'work', tone: 'amber', title: 'Completed fire & patient-safety training', text: 'Annual mandatory module · 45 min', file: ['Certificate-Safety-2026.pdf', '120 KB'] });
      if (e.lastLogin && e.lastLogin !== '—') add(/Today/.test(e.lastLogin) ? minsSince(e.lastLogin.split(', ')[1] || '09:00') + 1 : 1440 + 60, { cat: 'account', tone: 'slate', title: 'Signed in', text: `${e.lastLogin} · password + OTP` });
      add(daysSince(e.joined) * 1440, { cat: 'account', tone: 'rose', title: `Joined ${t.name}`, text: `${e.type} · ${e.dept} · ${s.branch}` });
    }
    const f = ui.pfAct || 'all';
    return out.filter(x => f === 'all' || x.cat === f).sort((a, b) => a.m - b.m);
  }

  function timelineHTML(s) {
    const items = timeline(s), show = ui.pfMore ? items : items.slice(0, 6);
    if (!items.length) return empty('history', 'No activity yet', 'Actions will show up here as they happen.');
    const people = names => `<div class="mt-2.5 flex items-center"><div class="flex -space-x-2">${names.slice(0, 4).map((n, i) => `<span class="grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[10px] font-bold dark:border-slate-900 ${K.tone(['teal', 'violet', 'amber', 'sky'][i % 4])}" title="${esc(n)}">${esc(K.initials(n))}</span>`).join('')}
      ${names.length > 4 ? `<span class="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-semibold text-slate-500 dark:border-slate-900 dark:bg-slate-800">+${names.length - 4}</span>` : ''}</div><span class="ml-3 text-xs text-slate-500">${names.length} ${names.length === 1 ? 'person' : 'people'}</span></div>`;
    const file = ([n, sz]) => `<button type="button" class="mt-2.5 inline-flex max-w-full items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" data-pg="pf-dl" data-what="${esc(n)}">
      <span class="grid h-5 w-5 place-items-center rounded bg-rose-500 text-[8px] font-bold text-white">PDF</span><span class="truncate">${esc(n)}</span><span class="text-slate-400">${sz}</span></button>`;
    return `<ol class="relative">${show.map((x, i) => `<li class="relative pb-6 pl-8 last:pb-0">
        ${i < show.length - 1 ? '<span class="absolute left-[7px] top-5 h-full w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true"></span>' : ''}
        <span class="absolute left-0 top-1 grid h-4 w-4 place-items-center rounded-full bg-${x.tone}-100 dark:bg-${x.tone}-500/20"><span class="h-2 w-2 rounded-full bg-${x.tone}-500"></span></span>
        <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"><p class="text-sm font-semibold text-slate-800 dark:text-slate-100">${x.html || esc(x.title)}</p><span class="shrink-0 text-xs text-slate-400">${ago(x.m)}</span></div>
        ${x.text ? `<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">${esc(x.text)}</p>` : ''}
        ${x.file ? file(x.file) : ''}${x.people && x.people.length ? people(x.people) : ''}</li>`).join('')}</ol>
      ${items.length > 6 ? `<button type="button" class="mt-5 w-full rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" data-pg="pf-more">${ui.pfMore ? 'Show less' : `Show all ${items.length}`}</button>` : ''}`;
  }

  /* ======================= Attendance (staff) ======================= */
  function attDays(s) {
    const today = new Date(), y = today.getFullYear(), mo = today.getMonth(), dim = new Date(y, mo + 1, 0).getDate(), h = hash(s.key);
    const todayRec = D().attendance.find(x => x.id === s.key);
    return Array.from({ length: dim }, (_, i) => {
      const dd = i + 1, dt = new Date(y, mo, dd);
      if (dd > today.getDate()) return { dd, dt, st: '' };
      if (dt.getDay() === 0) return { dd, dt, st: 'off' };
      if (dd === today.getDate()) { const toM = t => t ? +t.slice(0, 2) * 60 + +t.slice(3) : 0; return { dd, dt, st: todayRec ? todayRec.status : 'absent', in: todayRec?.in, out: todayRec?.out, hrs: todayRec?.in && todayRec?.out ? (toM(todayRec.out) - toM(todayRec.in)) / 60 : 0, today: true }; }
      const r = hash(s.key + ':' + dd) % 23, st = r === 3 || r === 17 ? 'late' : r === 7 ? 'leave' : r === 11 ? 'absent' : r === 13 ? 'half-day' : 'present';
      const inM = st === 'late' ? 9 * 60 + 20 + (h + dd) % 30 : 8 * 60 + 30 + (h * dd) % 40, hrs = st === 'half-day' ? 4.2 : 8 + ((h + dd) % 9) / 10;
      const fmt = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;
      return { dd, dt, st, in: ['leave', 'absent'].includes(st) ? '' : fmt(inM), out: ['leave', 'absent'].includes(st) ? '' : fmt(inM + hrs * 60), hrs: ['leave', 'absent'].includes(st) ? 0 : hrs };
    });
  }
  function attSummary(s) {
    const days = attDays(s).filter(x => x.st && x.st !== 'off'), n = k => days.filter(x => x.st === k).length;
    const worked = days.filter(x => x.hrs), avg = worked.length ? worked.reduce((a, x) => a + x.hrs, 0) / worked.length : 0;
    return { days, n, pct: days.length ? Math.round((n('present') + n('late') + n('half-day') * .5) / days.length * 100) : 0, avg };
  }
  function tabAttendance(s) {
    if (!s.self && !can('attendance:read')) return `<div class="${card}">${empty('lock', 'Attendance is private', 'Only the employee, their HR team and admins can see attendance.')}</div>`;
    if (!s.e.active) return `<div class="${card}">${empty('user-x', 'No attendance', 'This employee is inactive.')}</div>`;
    const all = attDays(s), sum = attSummary(s), first = new Date(all[0].dt), lead = (first.getDay() + 6) % 7;
    const cell = x => { const tn = x.st ? (ATT[x.st] || ATT.absent)[0] : ''; return `<span class="flex h-11 flex-col items-center justify-center rounded-xl sm:h-14 text-sm font-semibold ${!x.st ? 'text-slate-300 dark:text-slate-600' : x.st === 'off' ? 'text-slate-400' : K.tone(tn)} ${x.today ? 'ring-2 ring-teal-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : ''}" title="${x.st ? (ATT[x.st] || ATT.absent)[1] + (x.in ? ' · ' + x.in + '–' + (x.out || '…') : '') : ''}">${x.dd}</span>`; };
    const recent = all.filter(x => x.st && x.st !== 'off').slice(-7).reverse();
    const ring = `<div class="relative h-24 w-24 shrink-0"><svg viewBox="0 0 36 36" class="h-24 w-24 -rotate-90"><circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" class="text-slate-100 dark:text-slate-800" stroke-width="3.5"/><circle cx="18" cy="18" r="15.9" fill="none" stroke="#0d9488" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${sum.pct} 100"/></svg>
      <span class="absolute inset-0 grid place-items-center text-center"><span><span class="block text-xl font-bold tabular-nums">${sum.pct}%</span><span class="block text-[10px] text-slate-500">this month</span></span></span></div>`;
    return `<div class="space-y-5">
      <div class="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div class="${card} p-5"><div class="flex items-center gap-4">${ring}<div><p class="font-semibold">${monthName()}</p><p class="text-xs text-slate-500">${sum.days.length} working days so far</p>
          <p class="mt-2 text-sm"><span class="font-semibold tabular-nums">${sum.avg.toFixed(1)} h</span> <span class="text-slate-500">avg / day</span></p></div></div>
          <div class="mt-5 grid grid-cols-2 gap-2">${['present', 'late', 'half-day', 'leave', 'absent'].map(k => `<div class="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/50"><span class="h-2.5 w-2.5 rounded-full bg-${ATT[k][0]}-500"></span><span class="flex-1 text-xs text-slate-500">${ATT[k][1]}</span><span class="text-sm font-bold tabular-nums">${sum.n(k)}</span></div>`).join('')}</div>
          ${s.self ? `<div class="mt-4 flex gap-2">${btn('primary', 'Check in / out', 'fingerprint', 'data-nav="me:attendance"', 'h-9 flex-1 px-3')}${btn('ghost', '', 'download', 'data-pg="pf-dl" data-what="Attendance ' + monthName() + ' (PDF)" aria-label="Download"', 'h-9 px-3')}</div>`
            : can('attendance:read') ? `<div class="mt-4">${btn('ghost', 'Open in Attendance', 'arrow-up-right', 'data-nav="attendance"', 'h-9 w-full px-3')}</div>` : ''}</div>
        <div class="${card}">${cardHead(monthName(), 'Hover a day for check-in times', `<div class="flex flex-wrap gap-3 text-xs text-slate-500">${['present', 'late', 'leave', 'absent'].map(k => `<span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-${ATT[k][0]}-500"></span>${ATT[k][1]}</span>`).join('')}</div>`)}
          <div class="p-5"><div class="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase text-slate-400">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => `<span>${x}</span>`).join('')}</div>
            <div class="mt-2 grid grid-cols-7 gap-1.5">${Array(lead).fill('<span></span>').join('')}${all.map(cell).join('')}</div></div></div>
      </div>
      <div class="${card}">${cardHead('Recent days', 'Last 7 working days')}
        ${table(['Date', 'Check-in', 'Check-out', 'Hours', 'Status'], recent.map(x => `<tr>${td0(`<span class="font-medium">${fmtDate(x.dt, { weekday: 'short', day: 'numeric', month: 'short' })}</span>`)}
          ${td(x.in ? `<span class="font-mono ${x.st === 'late' ? 'text-amber-600' : ''}">${x.in}</span>` : '—')}${td(x.out ? `<span class="font-mono">${x.out}</span>` : x.in ? '<span class="text-xs text-slate-400">On duty</span>' : '—')}
          ${td(x.hrs ? x.hrs.toFixed(1) + ' h' : '—', 'tabular-nums')}${td(badge(...(ATT[x.st] || ATT.absent)))}</tr>`).join(''), { min: '560px' })}</div></div>`;
  }

  /* ======================= Visits (patient) ======================= */
  function tabVisits(s) {
    const p = s.p, t = T(), d = D();
    const ap = t.appointments.filter(a => a.patient === p.name).map(a => ({ date: new Date(), doctor: a.doctor, dept: a.dept, type: a.type, status: a.status, time: a.time }));
    const past = Array.from({ length: Math.max(0, p.visits - ap.length) }, (_, i) => ({ date: addDays(new Date(p.lastVisit), -i * 37), doctor: p.doctor, dept: (t.employees.find(e => e.name === p.doctor) || {}).dept || 'General Medicine', type: 'OPD', status: 'completed', time: ['10:30', '11:15', '17:40'][i % 3] }));
    const list = ap.concat(past);
    return `<div class="${card}">${cardHead('Visit history', `${list.length} visits · ${d.prescriptions.filter(r => r.mrn === p.mrn).length} prescriptions`, btn('primary', 'Book a visit', 'calendar-plus', 'data-nav="my:appointments"', 'h-8 px-3'))}
      ${table(['Date', 'Doctor', 'Department', 'Type', 'Status'], list.map(v => `<tr>${td0(`<span class="font-medium">${fmtDate(v.date)}</span> <span class="text-xs text-slate-400">${v.time}</span>`)}${td(esc(v.doctor))}${td(esc(v.dept))}${td(esc(v.type))}
        ${td(badge(v.status === 'completed' ? 'emerald' : v.status === 'cancelled' ? 'rose' : 'teal', v.status[0].toUpperCase() + v.status.slice(1).replace('-', ' ')))}</tr>`).join(''), { min: '600px', empty: 'No visits yet.' })}</div>`;
  }

  /* ======================= Media ======================= */
  function media(s) {
    const store = ui.pfMedia ||= {};
    if (store[s.key]) return store[s.key];
    const now = new Date(), M = (kind, name, size, daysAgo, tone, icon, o = {}) => ({ id: 'MD-' + hash(s.key + name), kind, name, size, date: addDays(now, -daysAgo), tone, icon, ...o });
    let list;
    if (s.kind === 'patient') {
      list = [M('doc', 'Lipid profile report.pdf', '212 KB', 2, 'sky', 'flask-round'), M('doc', `Prescription RX-7801.pdf`, '84 KB', 3, 'violet', 'file-text'), M('photo', 'X-ray chest (PA view).jpg', '1.8 MB', 40, 'slate', 'scan'),
        M('photo', 'Insurance card.jpg', '620 KB', 120, 'amber', 'shield-plus'), M('doc', 'Discharge summary.pdf', '310 KB', 210, 'teal', 'clipboard-list'), M('doc', 'Aadhaar (masked).pdf', '140 KB', 400, 'rose', 'id-card', { verified: true })];
    } else {
      const e = s.e, doc = e.type === 'Doctor', nurse = e.type === 'Nurse';
      list = [M('photo', 'Profile photo.jpg', '480 KB', 30, s.tone, 'user-round'), M('photo', 'ID card photo.jpg', '360 KB', daysSince(e.joined), 'slate', 'id-card'),
        ...(doc ? [M('photo', 'CME conference 2026.jpg', '2.4 MB', 64, 'violet', 'presentation'), M('doc', 'MBBS degree certificate.pdf', '1.1 MB', daysSince(e.joined), 'emerald', 'graduation-cap', { verified: true }), M('doc', `Medical registration ${e.reg || ''}.pdf`.replace(' .', '.'), '520 KB', daysSince(e.joined), 'teal', 'badge-check', { verified: true })] : []),
        ...(nurse ? [M('doc', 'B.Sc Nursing certificate.pdf', '900 KB', daysSince(e.joined), 'emerald', 'graduation-cap', { verified: true }), M('photo', 'BLS training.jpg', '1.3 MB', 90, 'rose', 'heart-pulse')] : []),
        M('doc', 'Aadhaar (masked).pdf', '140 KB', daysSince(e.joined), 'rose', 'id-card', { verified: true, private: true }), M('doc', 'PAN card.pdf', '96 KB', daysSince(e.joined), 'amber', 'credit-card', { verified: true, private: true }),
        M('doc', 'Offer letter.pdf', '210 KB', daysSince(e.joined) + 12, 'sky', 'file-signature', { private: true }), M('doc', `Payslip ${monthName(-1)}.pdf`, '58 KB', 19, 'emerald', 'wallet', { private: true })];
    }
    return (store[s.key] = list);
  }
  const canSeePrivate = s => s.self || can('staff:update');
  const canEditMedia = s => s.self || (s.kind === 'emp' && can('staff:update'));

  function tabMedia(s) {
    const all = media(s), f = ui.pfMf || 'all', priv = canSeePrivate(s);
    const visible = all.filter(m => priv || !m.private), hidden = all.length - visible.length;
    const list = visible.filter(m => f === 'all' || m.kind === f);
    const n = k => visible.filter(m => m.kind === k).length;
    const thumb = m => m.url ? `<img src="${m.url}" alt="${esc(m.name)}" class="h-full w-full object-cover" />`
      : m.kind === 'photo' ? `<div class="pf-photo grid h-full w-full place-items-center bg-${m.tone}-100 dark:bg-${m.tone}-500/15">${ico(m.icon, `h-10 w-10 text-${m.tone}-500/70`)}</div>`
      : `<div class="grid h-full w-full place-items-center bg-slate-50 dark:bg-slate-800/60"><span class="relative grid h-16 w-12 place-items-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">${ico(m.icon, `h-6 w-6 text-${m.tone}-500`)}<span class="absolute -bottom-1.5 -right-2 rounded bg-rose-500 px-1 text-[8px] font-bold text-white">${esc(m.ext || 'PDF')}</span></span></div>`;
    return `<div class="${card}">${K.toolbar(`${seg('pfMf', [['all', 'All', visible.length], ['photo', 'Photos', n('photo')], ['doc', 'Documents', n('doc')]], f)}<span class="flex-1"></span>
        ${canEditMedia(s) ? btn('primary', 'Upload', 'upload', 'data-pg="pf-up"') : ''}`)}
      ${hidden ? `<div class="px-5 pt-4">${note('sky', 'lock', `${hidden} personal document${hidden > 1 ? 's' : ''} (ID, offer letter, payslips) ${hidden > 1 ? 'are' : 'is'} only visible to ${esc(s.name)} and HR.`)}</div>` : ''}
      ${list.length ? `<ul class="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 xl:grid-cols-4">${list.map(m => `<li class="group overflow-hidden rounded-xl border border-slate-200 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700">
          <button type="button" class="block aspect-[4/3] w-full overflow-hidden" data-pg="pf-view" data-id="${m.id}" aria-label="Open ${esc(m.name)}">${thumb(m)}</button>
          <div class="flex items-start gap-2 p-3"><div class="min-w-0 flex-1"><p class="truncate text-sm font-medium text-slate-900 dark:text-white" title="${esc(m.name)}">${esc(m.name)}</p>
            <p class="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">${m.size} · ${fmtShort(m.date)}${m.verified ? `<span class="text-emerald-600" title="Verified by HR">${ico('badge-check', 'h-3.5 w-3.5')}</span>` : ''}${m.private ? `<span title="Private">${ico('lock', 'h-3 w-3')}</span>` : ''}</p></div>
            ${canEditMedia(s) ? `<button type="button" class="rounded-lg p-1 text-slate-400 opacity-100 transition hover:bg-rose-50 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-rose-500/10" data-pg="pf-del" data-id="${m.id}" aria-label="Delete ${esc(m.name)}">${ico('trash-2')}</button>` : ''}</div></li>`).join('')}</ul>`
        : empty('images', 'Nothing here yet', f === 'photo' ? 'No photos uploaded.' : 'No documents uploaded.', canEditMedia(s) ? btn('primary', 'Upload', 'upload', 'data-pg="pf-up"') : '')}</div>`;
  }

  /* ======================= Connections ======================= */
  function connList(s) {
    const t = T(), mine = myConn();
    if (s.kind === 'patient') return [];
    const others = t.employees.filter(x => x.id !== s.key && x.active);
    if (s.self) return others.map(x => ({ e: x, conn: mine.has(x.id), same: x.dept === s.e.dept }));
    // someone else: their team + people they work with (deterministic), with my connection state
    const h = hash(s.key);
    return others.filter((x, i) => x.dept === s.e.dept || x.role === 'admin' || (h >> i) % 3 === 0).map(x => ({ e: x, conn: true, mine: mine.has(x.id), same: x.dept === s.e.dept }));
  }
  function tabConnections(s) {
    if (s.kind === 'patient') {
      const p = s.p, t = T(), docs = [...new Set([p.doctor, ...t.appointments.filter(a => a.patient === p.name).map(a => a.doctor)])].filter(Boolean);
      const team = docs.map(n => t.employees.find(e => e.name === n)).filter(Boolean).concat(t.employees.filter(e => ['Receptionist', 'Nurse'].includes(e.type) && e.active).slice(0, 2));
      return `<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">${team.map(e => `<div class="${card} p-5 text-center">${avatar(e.name, TYPE_TONE[e.type], 'mx-auto h-16 w-16 text-lg')}
        <p class="mt-3 font-semibold">${esc(e.name)}</p><p class="text-xs text-slate-500">${esc(e.type === 'Doctor' ? 'Doctor' : e.type)} · ${esc(e.dept)}</p>
        <div class="mt-4 flex justify-center gap-2">${btn('ghost', 'Message', 'message-square', `data-pg="pf-msg" data-name="${esc(e.name)}"`, 'h-8 px-3')}${e.type === 'Doctor' ? btn('primary', 'Book', 'calendar-plus', 'data-nav="my:appointments"', 'h-8 px-3') : ''}</div></div>`).join('')}</div>`;
    }
    const f = ui.pfCf || 'all', q = (ui.pfCq || '').toLowerCase(), all = connList(s);
    const list = all.filter(x => (f === 'all' || (f === 'conn' ? x.conn : f === 'team' ? x.same : !x.conn)) && (!q || (x.e.name + x.e.type + x.e.dept).toLowerCase().includes(q)))
      .sort((a, b) => (b.same - a.same) || a.e.name.localeCompare(b.e.name));
    const opts = s.self ? [['all', 'Everyone', all.length], ['conn', 'Connected', all.filter(x => x.conn).length], ['team', 'My team', all.filter(x => x.same).length], ['suggest', 'Suggested', all.filter(x => !x.conn).length]]
      : [['all', 'All', all.length], ['team', 'Same team', all.filter(x => x.same).length]];
    return `<div class="space-y-4"><div class="${card}">${K.toolbar(`${seg('pfCf', opts, opts.some(o => o[0] === f) ? f : 'all')}<span class="flex-1"></span>${search('pfCq', ui.pfCq || '', 'Search people')}`)}</div>
      ${list.length ? `<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">${list.map(({ e, conn, mine, same }) => {
        const on = s.self ? conn : mine, tn = TYPE_TONE[e.type] || 'teal';
        return `<div class="${card} flex flex-col p-5">
          <div class="flex items-start gap-3"><button type="button" class="shrink-0" data-pg="pf-open" data-id="${e.id}" aria-label="View ${esc(e.name)}">${avatar(e.name, tn, 'h-12 w-12 text-sm')}</button>
            <div class="min-w-0 flex-1"><button type="button" class="block max-w-full truncate text-left font-semibold text-slate-900 hover:text-teal-700 dark:text-white dark:hover:text-teal-300" data-pg="pf-open" data-id="${e.id}">${esc(e.name)}</button>
              <p class="truncate text-xs text-slate-500">${esc(e.type === 'Doctor' ? 'Doctor' : e.type)} · ${esc(e.dept)}</p>
              <div class="mt-1.5 flex flex-wrap gap-1">${same ? badge('teal', 'Same team') : ''}${e.login === 'active' && /Today/.test(e.lastLogin) ? badge('emerald', 'Active today') : ''}</div></div></div>
          <div class="mt-auto flex gap-2 pt-4">${e.name === me().person ? `<span class="inline-flex h-8 flex-1 items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-800">That’s you</span>`
            : on ? `<button type="button" class="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700" data-pg="pf-conn" data-id="${e.id}">${ico('user-check')}Connected</button>`
            : `<button type="button" class="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-xl border border-teal-600/40 text-sm font-semibold text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-500/10" data-pg="pf-conn" data-id="${e.id}">${ico('user-plus')}Connect</button>`}
            ${btn('ghost', '', 'message-square', `data-pg="pf-msg" data-name="${esc(e.name)}" aria-label="Message ${esc(e.name)}"`, 'h-8 px-2.5')}</div></div>`; }).join('')}</div>`
        : `<div class="${card}">${empty('users', 'No one here', 'Try another filter or search.')}</div>`}</div>`;
  }

  /* ======================= Events ======================= */
  on('pf-open', el => { H().closeDropdowns(); ui.pfId = el.dataset.id || null; const s = el.dataset.id && T().employees.find(e => e.id === el.dataset.id);
    if (s && s.name === me().person) ui.pfId = null;
    ui.pfTab = 'account'; ui.pfMore = false; ui.pfAct = 'all';
    if (H().state.active === 'profile') { rerender(); window.scrollTo({ top: 0, behavior: 'smooth' }); } else H().navigate('profile'); });
  on('pf-more', () => { ui.pfMore = !ui.pfMore; rerender(); });
  on('pf-conn', el => { const set = myConn(), id = el.dataset.id, e = T().employees.find(x => x.id === id);
    if (set.has(id)) { set.delete(id); toast('Connection removed', e.name, 'slate', 'user-minus'); }
    else { set.add(id); toast('Connected', `You and ${e.name} can now message and share shifts`, 'teal', 'user-check'); }
    rerender(); });
  on('pf-msg', el => toast('Message window opened', `To ${el.dataset.name} · secure staff chat`, 'sky', 'message-square'));
  on('pf-dl', el => toast('Download started', el.dataset.what, 'teal', 'download'));
  on('pf-cover', () => toast('Cover updated', 'Covers use your hospital’s colours in the demo.', 'teal', 'image'));

  on('pf-edit', () => { const s = subject(), x = extra(s);
    modal({ title: 'Edit profile', sub: 'Changes to phone and email are verified with an OTP.', icon: 'user-pen', ok: 'Save changes', body: `<div class="grid gap-4 sm:grid-cols-2">
      ${field('phone', 'Mobile', { value: s.phone, req: true })}${field('email', 'Email', { type: 'email', value: s.email, req: true })}
      ${field('langs', 'Languages', { value: x.langs, full: true, ph: 'e.g. English, Bengali' })}
      ${field('bio', 'Short bio', { area: true, value: x.bio, full: true, ph: s.kind === 'patient' ? 'Anything your care team should know' : 'e.g. Cardiologist with 12 years in interventional care' })}</div>
      ${s.kind === 'emp' ? `<div class="mt-4">${note('sky', 'info', 'Name, department and bank details are changed by HR — ask from <b>My Work → Help</b>.')}</div>` : ''}`,
      onSubmit: f => { const v = readForm(f, ['phone', 'email']); if (!v) return false;
        if (s.kind === 'emp') Object.assign(s.e, { phone: v.phone, email: v.email }); else s.p.phone = v.phone;
        Object.assign(x, { bio: v.bio.trim(), langs: v.langs.trim() || x.langs });
        if (s.kind === 'emp') audit('user-pen', 'teal', `<b>${who()}</b> updated their profile`);
        toast('Profile saved', 'OTP sent to confirm the new contact details', 'teal', 'check'); rerender(); } }); });

  on('pf-up', () => { const s = subject();
    modal({ title: 'Upload to profile', sub: esc(s.name), icon: 'upload', ok: 'Upload', body: `<div class="grid gap-4">
      <label class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-teal-500 dark:border-slate-700">
        ${ico('cloud-upload', 'h-8 w-8 text-slate-400')}<span class="text-sm font-medium">Choose a photo or document</span><span class="text-xs text-slate-500">JPG, PNG or PDF · up to 10 MB</span>
        <input type="file" name="file" accept="image/*,.pdf" class="sr-only" id="pfFile" /></label><p id="pfFileName" class="-mt-2 text-center text-xs text-teal-700 dark:text-teal-300"></p>
      ${field('cat', 'Type', { opts: s.kind === 'patient' ? ['Lab report', 'Prescription', 'Scan / X-ray', 'Insurance', 'Other'] : ['Photo', 'ID proof', 'Certificate', 'Training', 'Other'] })}
      <label class="flex items-center gap-2 text-sm"><input type="checkbox" name="priv" class="h-4 w-4 accent-teal-600" ${s.kind === 'emp' ? 'checked' : ''}/>Only me and HR can see this</label></div>`,
      onSubmit: f => { const file = f.elements.file.files[0];
        if (!file) { toast('Choose a file first', '', 'amber', 'triangle-alert'); return false; }
        if (file.size > 10 * 1024 * 1024) { toast('File too large', 'Keep it under 10 MB', 'rose', 'triangle-alert'); return false; }
        const img = /^image\//.test(file.type), kb = file.size / 1024;
        media(s).unshift({ id: 'MD-' + Date.now(), kind: img ? 'photo' : 'doc', name: file.name, size: kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(kb)) + ' KB',
          date: new Date(), tone: 'teal', icon: img ? 'image' : 'file-text', url: img ? URL.createObjectURL(file) : '', ext: (file.name.split('.').pop() || 'FILE').toUpperCase().slice(0, 4), private: f.elements.priv.checked });
        ui.pfMf = 'all'; toast('Uploaded', `${file.name} · ${f.elements.cat.value}`, 'teal', 'cloud-upload'); rerender(); } });
    document.getElementById('pfFile').addEventListener('change', ev => { document.getElementById('pfFileName').textContent = ev.target.files[0]?.name || ''; }); });

  on('pf-view', el => { const s = subject(), m = media(s).find(x => x.id === el.dataset.id); if (!m) return;
    modal({ title: m.name, sub: `${m.size} · uploaded ${fmtDate(m.date)}${m.verified ? ' · verified by HR' : ''}`, icon: m.kind === 'photo' ? 'image' : 'file-text', size: 'max-w-2xl',
      foot: `<button type="button" class="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800" data-close-modal>Close</button>${btn('primary', 'Download', 'download', `data-pg="pf-dl" data-what="${esc(m.name)}"`, 'h-10 px-4')}`,
      body: m.url ? `<img src="${m.url}" alt="${esc(m.name)}" class="mx-auto max-h-[60vh] rounded-xl" />`
        : `<div class="grid aspect-video place-items-center rounded-xl ${m.kind === 'photo' ? `bg-${m.tone}-100 dark:bg-${m.tone}-500/15` : 'bg-slate-50 dark:bg-slate-800/60'}"><div class="text-center">${ico(m.icon, `mx-auto h-14 w-14 text-${m.tone}-500`)}<p class="mt-3 text-sm text-slate-500">Preview of sample file — the demo has no real uploads.</p></div></div>` }); });

  on('pf-del', el => { const s = subject(), list = media(s), i = list.findIndex(x => x.id === el.dataset.id); if (i < 0) return;
    H().confirmDialog({ title: `Delete ${list[i].name}?`, text: 'It is removed from this profile. HR keeps verified copies of ID documents for compliance.', ok: 'Delete', icon: 'trash-2',
      onOk: () => { const [m] = list.splice(i, 1); toast('Deleted', m.name, 'slate', 'trash-2'); rerender(); } }); });

  K.register({ profile: { title: 'My Profile', sub: 'Your details, attendance, files and colleagues.', render: renderProfile,
    info: { title: 'Profile', phase: 'Core', desc: 'One profile page for every user — staff and patients — with role-aware privacy.',
      features: ['Account: about, contacts and an activity timeline', 'Attendance calendar for staff, visit history for patients', 'Photos and documents with private / verified flags', 'Connections with colleagues, care team for patients'] } } });
})();
