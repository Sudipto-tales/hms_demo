/* HMS demo — role-specific home dashboards (Doctor, HR, Receptionist).
 * Registered as 'home:<persona>'; app.js shows them instead of the admin dashboard
 * when that persona opens Dashboard → Overview. Actions reuse handlers from the
 * other page files (q, lv, sw, clin-ack, lab-report, inv-view, patient, rx-new …). */
(() => {
  'use strict';
  const K = window.PG;
  const { esc, inr, T, D, can, me, card, badge, avatar, ico, tile, tiles, btn, iconBtn, cardHead, empty, bar, note, on, rerender, chart, ui,
    iso, todayISO, addDays, fmtDate, fmtShort, nowTime, monthName } = K;
  const H = () => window.HMS;
  const toast = (...a) => H().toast(...a);
  const mod = m => H().modOn(m);
  const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
  const todayLong = () => fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' });
  const tok = a => String(a.token || '—').padStart(2, '0');
  const AST = { confirmed: ['teal', 'Confirmed'], 'checked-in': ['sky', 'Waiting'], pending: ['amber', 'Unconfirmed'], completed: ['emerald', 'Done'], cancelled: ['rose', 'Cancelled'], 'no-show': ['slate', 'No-show'], 'with-doctor': ['violet', 'With doctor'] };
  const hero = (t, icon, title, sub, right = '') => `<div class="flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br ${t} p-5 text-white shadow-card sm:p-6">
    <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20">${ico(icon, 'h-6 w-6')}</span>
    <div class="min-w-0 flex-1"><p class="text-sm text-white/80">${todayLong()}</p><h2 class="text-xl font-bold sm:text-2xl">${title}</h2><p class="mt-0.5 text-sm text-white/85">${sub}</p></div>${right}</div>`;
  const heroBtn = (label, icon, attrs) => `<button type="button" class="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-800 shadow hover:bg-slate-50" ${attrs}>${ico(icon)}${esc(label)}</button>`;
  const heroGhost = (label, icon, attrs) => `<button type="button" class="inline-flex h-10 items-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-semibold text-white hover:bg-white/25" ${attrs}>${ico(icon)}${esc(label)}</button>`;
  const ensureTokens = () => T().appointments.slice().sort((a, b) => a.time.localeCompare(b.time)).forEach((a, i) => { a.token = a.token || i + 1; });
  const mins = t => +t.slice(0, 2) * 60 + +t.slice(3, 5);

  /* ============================== Doctor ============================== */
  function doctorName() { const n = me().person; return T().employees.some(e => e.name === n) ? n : (T().doctors[0] || {}).name; }

  function renderDoctor(c) {
    ensureTokens();
    const d = D(), name = doctorName(), doc = T().employees.find(e => e.name === name) || {};
    const appts = T().appointments.filter(a => a.doctor === name).sort((a, b) => a.time.localeCompare(b.time));
    const live = appts.filter(a => !['cancelled', 'no-show'].includes(a.status));
    const seen = appts.filter(a => a.status === 'completed'), waiting = appts.filter(a => a.status === 'checked-in'), withMe = appts.find(a => a.status === 'with-doctor');
    const next = withMe || waiting[0] || live.find(a => ['confirmed', 'pending'].includes(a.status));
    const enc = a => d.encounters.find(e => e.appt === a.id) || {};
    const results = mod('lab') ? d.labOrders.filter(l => l.doctor === name && ['review', 'released'].includes(l.status) && !l.ack) : [];
    const imaging = mod('radiology') ? d.radiology.filter(r => r.doctor === name && r.status === 'reported') : [];
    const inpts = mod('ipd') ? d.beds.filter(b => b.doctor === name && (b.status === 'occupied' || b.status === 'discharge')) : [];
    const sch = (d.schedules[doc.id] || {}), dayIdx = (new Date().getDay() + 6) % 7, hrs = (sch.days || [])[dayIdx];
    const notMe = name !== me().person ? `<div class="mb-1">${note('sky', 'info', `${esc(me().person)} doesn’t work at ${esc(T().name)} — showing ${esc(name)}’s day for the demo.`)}</div>` : '';

    c.innerHTML = `<div class="fade-in space-y-5">${notMe}
      ${hero('from-emerald-600 to-teal-500', 'stethoscope', `${greet()}, Dr. ${esc(name.split(' ').pop())}`,
        `${live.length} patients today · ${waiting.length} waiting · ${hrs ? `OPD ${hrs[0]}–${hrs[1]} in ${esc(sch.room || '')}` : 'No OPD today'}`,
        `<div class="flex flex-wrap gap-2">${can('prescription:write') && mod('prescriptions') ? heroGhost('Write prescription', 'file-text', 'data-pg="rx-new"') : ''}${can('prescription:upload') && mod('prescriptions') ? heroGhost('Upload paper Rx', 'camera', 'data-pg="rxu-new"') : ''}${heroGhost('My schedule', 'calendar-clock', 'data-nav="doctors:schedules"')}</div>`)}

      ${tiles([tile('users', 'teal', 'Patients today', live.length), tile('circle-check', 'emerald', 'Seen', seen.length, live.length ? Math.round(seen.length / live.length * 100) + '%' : ''),
        tile('armchair', 'sky', 'Waiting now', waiting.length), tile('flask-round', results.some(l => l.critical) ? 'rose' : 'violet', 'Results to review', results.length + imaging.length)])}

      <div class="grid gap-5 xl:grid-cols-3">
        <div class="space-y-5 xl:col-span-2">
          ${next ? `<div class="${card} flex flex-wrap items-center gap-4 border-l-4 !border-l-emerald-500 p-5">
            <div class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-900 text-lg font-black text-white dark:bg-slate-700">${tok(next)}</div>
            <div class="min-w-[200px] flex-1"><p class="text-[11px] font-semibold uppercase tracking-wider ${withMe ? 'text-violet-600' : 'text-emerald-600'}">${withMe ? 'With you now' : 'Next patient'}</p>
              <p class="text-lg font-semibold">${esc(next.patient)} <span class="text-sm font-normal text-slate-500">${next.time} · ${esc(next.type)}</span></p>
              <p class="text-sm text-slate-500">${esc(enc(next).complaint || 'No complaint recorded yet')}${(d.pt(next.patient) || {}).allergies && d.pt(next.patient).mrn === next.mrn ? ` · <span class="font-medium text-rose-600">Allergy: ${esc(d.pt(next.patient).allergies)}</span>` : ''}</p></div>
            <div class="flex gap-2">${next.status === 'checked-in' ? btn('ghost', 'Call in', 'megaphone', `data-pg="q" data-do="call" data-id="${next.id}"`) : ''}${btn('primary', withMe ? 'Continue consultation' : 'Start consultation', 'clipboard-list', `data-pg="dd-start" data-id="${next.id}"`)}</div></div>` : ''}

          <div class="${card}">${cardHead('My OPD today', `${seen.length} of ${live.length} done`, btn('ghost', 'Full queue', 'arrow-right', 'data-nav="appointments:queue"', 'h-8 px-3'))}
            <div class="px-5 pt-4">${bar(live.length ? seen.length / live.length * 100 : 0, 'emerald')}</div>
            <ol class="relative mt-2 px-5 pb-4">${appts.map(a => { const [t, l] = AST[a.status] || ['slate', a.status], past = ['completed', 'cancelled', 'no-show'].includes(a.status);
              return `<li class="flex items-center gap-4 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800 ${past ? 'opacity-60' : ''}">
                <span class="w-12 font-mono text-sm font-semibold ${a.status === 'with-doctor' ? 'text-violet-600' : ''}">${a.time}</span>
                ${avatar(a.patient, a.status === 'with-doctor' ? 'violet' : 'teal', 'h-9 w-9 text-xs')}
                <div class="min-w-0 flex-1"><p class="truncate text-sm font-medium ${a.status === 'cancelled' ? 'line-through' : ''}">${esc(a.patient)}</p><p class="truncate text-xs text-slate-500">${esc(a.type)} · ${esc(enc(a).complaint || a.mrn)}</p></div>
                ${badge(t, l)}
                <div class="hidden w-28 justify-end sm:flex">${a.status === 'checked-in' ? btn('soft', 'Call in', '', `data-pg="q" data-do="call" data-id="${a.id}"`, 'h-8 px-3') : a.status === 'with-doctor' ? btn('primary', 'Open', '', `data-pg="dd-start" data-id="${a.id}"`, 'h-8 px-3') : a.status === 'completed' ? iconBtn('file-text', 'Open notes', `data-pg="dd-start" data-id="${a.id}"`) : ''}</div></li>`; }).join('') || `<li>${empty('calendar', 'No patients booked', 'Your OPD list for today is empty.')}</li>`}</ol></div>

          <div class="${card}">${cardHead('Patients seen this week', 'OPD consultations per day')}<div class="h-56 p-4"><canvas id="pgDocWeek"></canvas></div></div>
        </div>

        <div class="space-y-5">
          ${mod('lab') || mod('radiology') ? `<div class="${card}">${cardHead('Results to review', 'Released or awaiting your sign-off')}
            <ul class="divide-y divide-slate-100 dark:divide-slate-800">${results.map(l => `<li class="flex items-center gap-3 px-5 py-3">
              <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl ${K.tone(l.critical ? 'rose' : 'sky')}">${ico(l.critical ? 'triangle-alert' : 'flask-round')}</span>
              <div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">${esc(l.patient)}</p><p class="truncate text-xs text-slate-500">${esc(l.test)} · ${l.status === 'released' ? 'released' : 'awaiting verification'}</p></div>
              ${l.status === 'released' ? iconBtn('eye', 'View report', `data-pg="lab-report" data-id="${l.id}"`) : ''}${btn('soft', 'Ack', '', `data-pg="clin-ack" data-id="${l.id}"`, 'h-8 px-2.5')}</li>`).join('')}
              ${imaging.map(r => `<li class="flex items-center gap-3 px-5 py-3"><span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl ${K.tone(r.critical ? 'rose' : 'violet')}">${ico('scan-line')}</span>
              <div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">${esc(r.patient)}</p><p class="truncate text-xs text-slate-500">${r.modality} ${esc(r.part)} · ${esc(r.finding || 'Reported')}</p></div>${iconBtn('eye', 'View report', `data-pg="rad-report" data-id="${r.id}"`)}</li>`).join('')}
              ${results.length + imaging.length ? '' : `<li>${empty('circle-check', 'All caught up', 'New results for your patients appear here.')}</li>`}</ul></div>` : ''}

          ${mod('ipd') ? `<div class="${card}">${cardHead('My inpatients', `${inpts.length} under your care`, btn('ghost', 'Bed board', 'arrow-right', 'data-nav="beds"', 'h-8 px-3'))}
            <ul class="divide-y divide-slate-100 dark:divide-slate-800">${inpts.slice(0, 6).map(b => { const los = Math.max(1, Math.round((new Date(todayISO()) - new Date(b.since)) / 864e5));
              return `<li class="flex items-center gap-3 px-5 py-3"><span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl ${K.tone(b.status === 'discharge' ? 'amber' : 'sky')} text-[11px] font-bold">${b.id.split('-')[1]}</span>
              <div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">${esc(b.patient)}</p><p class="truncate text-xs text-slate-500">${esc(b.ward)} · day ${los}</p></div>
              ${b.status === 'discharge' ? badge('amber', 'Discharge due') : btn('ghost', 'Discharge', '', `data-pg="bed-advise" data-id="${b.id}"`, 'h-8 px-2.5')}</li>`; }).join('') || `<li>${empty('bed', 'No inpatients', 'Patients you admit show up here.')}</li>`}
              ${inpts.length > 6 ? `<li class="px-5 py-2.5 text-xs text-slate-500">+${inpts.length - 6} more on the bed board</li>` : ''}</ul></div>` : ''}

          <div class="${card} p-5"><p class="mb-3 text-sm font-semibold">Quick actions</p><div class="grid grid-cols-2 gap-2">
            ${[['clipboard-list', 'Consultations', 'data-nav="consultations"', 'encounter:write', 'emr'], ['file-text', 'Prescription', 'data-pg="rx-new"', 'prescription:write', 'prescriptions'], ['flask-round', 'Lab worklist', 'data-nav="laboratory"', 'lab:order', 'lab'], ['scan-line', 'Order imaging', 'data-pg="rad-new"', 'lab:order', 'radiology']]
              .filter(([, , , p, m]) => can(p) && mod(m)).map(([i, l, a]) => `<button type="button" class="flex flex-col items-start gap-2 rounded-xl border border-slate-200 p-3 text-left text-sm font-medium transition hover:border-teal-300 hover:bg-teal-50/50 dark:border-slate-700 dark:hover:bg-teal-500/5" ${a}><span class="grid h-8 w-8 place-items-center rounded-lg ${K.tone('teal')}">${ico(i)}</span>${l}</button>`).join('')}</div></div>
        </div>
      </div></div>`;

    const days = Array.from({ length: 6 }, (_, i) => addDays(new Date(), -((new Date().getDay() + 6) % 7) + i));
    const base = (doc.seen || 10);
    chart(document.getElementById('pgDocWeek'), { type: 'bar', data: { labels: days.map(x => x.toLocaleDateString('en-IN', { weekday: 'short' })),
      datasets: [{ label: 'Patients', data: days.map((x, i) => x > new Date() ? 0 : iso(x) === todayISO() ? seen.length : base + ((i * 7) % 5) - 2), backgroundColor: days.map(x => iso(x) === todayISO() ? '#0d9488' : 'rgba(13,148,136,.35)'), borderRadius: 8, maxBarThickness: 38 }] },
      options: { scales: { y: { ticks: { precision: 0 } } } } });
  }
  on('dd-start', el => {
    const a = T().appointments.find(x => x.id === el.dataset.id);
    if (a && a.status === 'checked-in') { T().appointments.filter(x => x.status === 'with-doctor' && x.doctor === a.doctor).forEach(x => (x.status = 'completed')); a.status = 'with-doctor'; }
    const e = D().encounters.find(x => x.appt === el.dataset.id); if (e && e.state === 'waiting') e.state = 'in-progress';
    ui.enc = el.dataset.id; ui.dxq = '';
    if (!e) return toast('No encounter yet', 'Check the patient in first.', 'amber', 'info');
    H().navigate('consultations');
  });

  /* ============================== HR ============================== */
  function renderHR(c) {
    if (!mod('hr')) { c.innerHTML = `<div class="${card}">${empty('briefcase', 'HR module is off', `${esc(T().name)}’s plan doesn’t include HR, attendance and payroll. Employees are still managed under Staff & Users.`, btn('primary', 'Open employees', 'users', 'data-nav="staff:list"'))}</div>`; return; }
    const d = D(), t = T(), emps = t.employees.filter(e => e.active), att = d.attendance;
    const n = s => att.filter(a => a.status === s).length, inNow = n('present') + n('late') + n('half-day'), pct = Math.round(inNow / Math.max(1, att.length) * 100);
    const leaves = d.leaves.filter(l => l.status === 'pending'), swaps = d.swaps.filter(s => s.status === 'pending');
    const access = emps.filter(e => ['invited', 'requested'].includes(e.login) || e.rolePending);
    const run = ui.prun || (ui.prun = { status: 'draft' }), steps = ['draft', 'processed', 'approved', 'published'], si = steps.indexOf(run.status);
    const net = d.payroll.reduce((s, p) => s + p.net, 0);
    const todo = leaves.length + swaps.length + access.length + (run.status === 'draft' ? 1 : 0);

    // roster gaps this week (nurse cover with nobody on a shift)
    const nurses = t.employees.filter(e => e.type === 'Nurse' && d.roster[e.id]);
    const monday = addDays(new Date(), -((new Date().getDay() + 6) % 7));
    const gaps = []; for (let i = 0; i < 7; i++) ['M', 'E', 'N'].forEach(s => { if (nurses.length && !nurses.some(e => d.roster[e.id][i] === s)) gaps.push([i, s]); });
    // people moments
    const now = new Date(), within = (dt, days) => { const x = new Date(dt); x.setFullYear(now.getFullYear()); const diff = (x - now) / 864e5; return diff >= -1 && diff <= days; };
    const joiners = emps.filter(e => (now - new Date(e.joined)) / 864e5 <= 30);
    const anniv = emps.filter(e => new Date(e.joined).getFullYear() < now.getFullYear() && within(e.joined, 45));
    const byDept = [...new Set(att.map(a => a.dept))].map(dp => { const r = att.filter(a => a.dept === dp); return [dp, ...['present', 'late', 'half-day', 'leave', 'absent'].map(s => r.filter(a => a.status === s).length), r.length]; }).sort((a, b) => b[6] - a[6]);
    const SEG = [['present', 'bg-emerald-500'], ['late', 'bg-amber-400'], ['half-day', 'bg-sky-400'], ['leave', 'bg-violet-400'], ['absent', 'bg-rose-500']];

    c.innerHTML = `<div class="fade-in space-y-5">
      ${hero('from-violet-600 to-fuchsia-500', 'briefcase', `${greet()}, ${esc(me().person.split(' ')[0])}`,
        todo ? `${todo} thing${todo > 1 ? 's' : ''} need${todo > 1 ? '' : 's'} you today · ${monthName()} payroll is <b>${run.status}</b>` : 'Inbox zero — nothing waiting on you',
        `<div class="flex flex-wrap gap-2">${can('staff:create') ? heroBtn('Add employee', 'user-plus', 'data-adm-act="add"') : ''}${heroGhost('Attendance', 'user-check', 'data-nav="attendance"')}</div>`)}

      ${tiles([tile('users', 'violet', 'Active employees', emps.length, `${t.stats.staff} total`), tile('user-check', 'emerald', 'In today', `${inNow}<span class="text-sm font-medium text-slate-400"> / ${att.length}</span>`, pct + '%'),
        tile('calendar-off', 'amber', 'On leave today', n('leave')), tile('user-x', 'rose', 'Absent, not informed', n('absent'))])}

      <div class="grid gap-5 xl:grid-cols-3">
        <div class="space-y-5 xl:col-span-2">
          <div class="${card}">${cardHead('Approvals', todo ? `${leaves.length + swaps.length} requests · ${access.length} logins pending` : 'All clear', btn('ghost', 'All leave', 'arrow-right', 'data-nav="leave"', 'h-8 px-3'))}
            <ul class="divide-y divide-slate-100 dark:divide-slate-800">
              ${leaves.map(l => `<li class="flex flex-wrap items-center gap-3 px-5 py-3.5">${avatar(l.name, 'violet')}
                <div class="min-w-[180px] flex-1"><p class="text-sm font-medium">${esc(l.name)} <span class="font-normal text-slate-500">· ${l.type} leave, ${l.days} day${l.days > 1 ? 's' : ''}</span></p>
                  <p class="text-xs text-slate-500">${fmtShort(l.from)}${l.days > 1 ? ' – ' + fmtShort(l.to) : ''} · ${esc(l.reason)}</p>
                  ${l.clash ? `<p class="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">${ico('triangle-alert', 'h-3.5 w-3.5')}${esc(l.clash)}</p>` : ''}</div>
                <div class="flex gap-1.5">${btn('ghost', 'Reject', '', `data-pg="lv" data-do="rejected" data-id="${l.id}"`, 'h-8 px-3')}${btn('primary', 'Approve', 'check', `data-pg="lv" data-do="approved" data-id="${l.id}"`, 'h-8 px-3')}</div></li>`).join('')}
              ${swaps.map(s => `<li class="flex flex-wrap items-center gap-3 px-5 py-3.5"><span class="grid h-9 w-9 place-items-center rounded-full ${K.tone('sky')}">${ico('arrow-left-right')}</span>
                <div class="min-w-[180px] flex-1"><p class="text-sm font-medium">Shift swap · ${esc(s.from)} ↔ ${esc(s.to)}</p><p class="text-xs text-slate-500">${d.SHIFTS[s.shift].label} shift on ${addDays(monday, s.day).toLocaleDateString('en-IN', { weekday: 'long' })}</p></div>
                <div class="flex gap-1.5">${btn('ghost', 'Reject', '', `data-pg="sw" data-do="rejected" data-id="${s.id}"`, 'h-8 px-3')}${btn('primary', 'Approve', 'check', `data-pg="sw" data-do="approved" data-id="${s.id}"`, 'h-8 px-3')}</div></li>`).join('')}
              ${access.map(e => `<li class="flex flex-wrap items-center gap-3 px-5 py-3.5">${avatar(e.name, 'amber')}
                <div class="min-w-[180px] flex-1"><p class="text-sm font-medium">${esc(e.name)} <span class="font-normal text-slate-500">· ${esc(e.type)}</span></p><p class="text-xs text-slate-500">${e.rolePending ? 'Waiting for a role' : e.login === 'requested' ? 'Login requested — admin must issue it' : 'Invited, hasn’t signed in yet'}</p></div>
                ${btn('ghost', 'Open', 'arrow-right', 'data-nav="staff:list" data-adm-login="pending"', 'h-8 px-3')}</li>`).join('')}
              ${leaves.length + swaps.length + access.length ? '' : `<li>${empty('inbox', 'Nothing to approve', 'Leave, swap and login requests land here.')}</li>`}</ul></div>

          <div class="${card}">${cardHead('Attendance today by department', `${pct}% turnout`, `<div class="hidden flex-wrap gap-3 text-[11px] text-slate-500 sm:flex">${SEG.map(([s, cls]) => `<span class="inline-flex items-center gap-1"><span class="h-2 w-2 rounded-full ${cls}"></span>${s === 'half-day' ? 'Half day' : s[0].toUpperCase() + s.slice(1)}</span>`).join('')}</div>`)}
            <ul class="space-y-3 p-5">${byDept.map(([dp, ...v]) => { const tot = v[5]; return `<li class="grid grid-cols-[130px_minmax(0,1fr)_44px] items-center gap-3 text-sm"><span class="truncate">${esc(dp)}</span>
              <span class="flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">${SEG.map(([, cls], i) => v[i] ? `<span class="${cls}" style="width:${v[i] / tot * 100}%" title="${v[i]}"></span>` : '').join('')}</span>
              <span class="text-right text-xs tabular-nums text-slate-500">${v[0] + v[1] + v[2]}/${tot}</span></li>`; }).join('')}</ul></div>

          <div class="${card}">${cardHead('Turnout trend', 'Last 14 days · % of staff present')}<div class="h-56 p-4"><canvas id="pgHrTrend"></canvas></div></div>
        </div>

        <div class="space-y-5">
          <div class="${card} p-5"><div class="flex items-center justify-between"><p class="font-semibold">${monthName()} payroll</p>${badge(run.status === 'published' ? 'emerald' : run.status === 'draft' ? 'amber' : 'sky', run.status[0].toUpperCase() + run.status.slice(1))}</div>
            <p class="mt-3 text-3xl font-bold tabular-nums">${inr(net)}</p><p class="text-xs text-slate-500">net pay · ${d.payroll.length} employees · ${d.payroll.filter(p => p.lop).length} with loss of pay</p>
            <ol class="mt-4 grid grid-cols-4 gap-1.5">${['Review', 'Processed', 'Approved', 'Published'].map((l, i) => `<li><div class="h-1.5 rounded-full ${i <= si ? 'bg-violet-600' : 'bg-slate-200 dark:bg-slate-700'}"></div><p class="mt-1 text-[10px] ${i <= si ? 'font-semibold text-violet-700 dark:text-violet-300' : 'text-slate-400'}">${l}</p></li>`).join('')}</ol>
            <div class="mt-4">${btn(run.status === 'published' ? 'ghost' : 'primary', run.status === 'draft' ? 'Review & process' : run.status === 'approved' ? 'Publish payslips' : 'Open payroll', 'wallet', 'data-nav="payroll"', 'h-9 w-full')}</div></div>

          <div class="${card}">${cardHead('Roster gaps this week', gaps.length ? 'Nurse shifts with nobody assigned' : 'Every shift is covered')}
            <ul class="divide-y divide-slate-100 dark:divide-slate-800">${gaps.slice(0, 5).map(([i, s]) => `<li class="flex items-center gap-3 px-5 py-2.5 text-sm"><span class="grid h-8 w-8 place-items-center rounded-lg ${K.tone('rose')} text-xs font-bold">${s}</span>
              <span class="flex-1">${addDays(monday, i).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })} · ${d.SHIFTS[s].label}</span><span class="text-xs text-slate-400">${d.SHIFTS[s].time}</span></li>`).join('') || `<li class="px-5 py-6 text-center text-sm text-slate-500">${ico('circle-check', 'mx-auto mb-1 h-5 w-5 text-emerald-500')}No gaps</li>`}
              ${gaps.length > 5 ? `<li class="px-5 py-2 text-xs text-slate-500">+${gaps.length - 5} more</li>` : ''}</ul>
            ${can('shift:manage') ? `<div class="border-t border-slate-100 p-3 dark:border-slate-800">${btn('ghost', 'Fix roster', 'clock', 'data-nav="shifts"', 'h-9 w-full')}</div>` : ''}</div>

          <div class="${card}">${cardHead('People', 'Joiners & work anniversaries')}
            <ul class="divide-y divide-slate-100 dark:divide-slate-800">${joiners.map(e => `<li class="flex items-center gap-3 px-5 py-3">${avatar(e.name, 'emerald')}<div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">${esc(e.name)}</p><p class="text-xs text-slate-500">Joined ${fmtShort(e.joined)} · ${esc(e.type)}</p></div>${badge('emerald', 'New')}</li>`).join('')}
              ${anniv.map(e => { const y = now.getFullYear() - new Date(e.joined).getFullYear(); return `<li class="flex items-center gap-3 px-5 py-3">${avatar(e.name, 'amber')}<div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">${esc(e.name)}</p><p class="text-xs text-slate-500">${y} year${y > 1 ? 's' : ''} on ${fmtShort(new Date(new Date(e.joined).setFullYear(now.getFullYear())))}</p></div>
                <button type="button" class="rounded-lg p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10" data-pg="hr-wish" data-name="${esc(e.name)}" aria-label="Send wishes">${ico('party-popper')}</button></li>`; }).join('')}
              ${joiners.length + anniv.length ? '' : '<li class="px-5 py-6 text-center text-sm text-slate-500">Nothing this month.</li>'}</ul></div>
        </div>
      </div></div>`;

    const days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i - 13));
    chart(document.getElementById('pgHrTrend'), { type: 'line', data: { labels: days.map(fmtShort),
      datasets: [{ label: 'Turnout', data: days.map((x, i) => x.getDay() === 0 ? null : i === 13 ? pct : 84 + ((i * 7) % 9) - (x.getDay() === 6 ? 6 : 0)), borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,.12)', fill: true, tension: .35, spanGaps: true, pointRadius: 3, pointBackgroundColor: '#7c3aed' }] },
      options: { scales: { y: { min: 60, max: 100, ticks: { callback: v => v + '%' } } }, plugins: { tooltip: { callbacks: { label: x => ` ${x.raw}% present` } } } } });
  }
  on('hr-wish', el => toast('Wishes sent', `${el.dataset.name} · WhatsApp from HR`, 'amber', 'party-popper'));

  /* ============================== Receptionist ============================== */
  const SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];
  function renderReception(c) {
    ensureTokens();
    const d = D(), A = T().appointments.slice().sort((a, b) => a.time.localeCompare(b.time)), q = (ui.rsq || '').trim().toLowerCase();
    const arrived = A.filter(a => ['checked-in', 'with-doctor', 'completed'].includes(a.status)), toCome = A.filter(a => ['pending', 'confirmed'].includes(a.status));
    const unconf = A.filter(a => a.status === 'pending'), waiting = A.filter(a => a.status === 'checked-in');
    const billedToday = d.invoices.filter(i => i.date === todayISO()), dues = d.invoices.filter(i => i.status === 'due' || i.status === 'partial');
    const nowM = mins(nowTime()), taken = new Set(A.filter(a => a.status !== 'cancelled').map(a => a.time));
    let free = SLOTS.filter(s => mins(s) >= nowM && !taken.has(s)).slice(0, 6), slotDay = 'Remaining today, any doctor';
    if (!free.length) { free = SLOTS.slice(0, 6); slotDay = 'Day is full — first slots tomorrow'; }
    const hits = q ? d.patients.filter(p => (p.name + p.mrn + p.phone).toLowerCase().includes(q)).slice(0, 5) : [];
    const late = toCome.filter(a => mins(a.time) < nowM - 15);

    c.innerHTML = `<div class="fade-in space-y-5">
      ${hero('from-sky-600 to-cyan-500', 'concierge-bell', `${greet()}, ${esc(me().person.split(' ')[0])}`,
        `Front desk · ${esc(T().branches[H().state.branch].split(' · ')[0])} · ${toCome.length} still to arrive · ${waiting.length} in the waiting area`,
        `<div class="flex flex-wrap gap-2">${can('appointment:create') ? heroBtn('Book appointment', 'calendar-plus', 'data-action="new-appointment"') : ''}${can('patient:create') ? heroGhost('Register patient', 'user-plus', 'data-nav="patients:new"') : ''}${can('prescription:upload') && mod('prescriptions') ? heroGhost('Upload prescription', 'camera', 'data-pg="rxu-new"') : ''}${can('invoice:create') ? heroGhost('New bill', 'receipt', 'data-pg="inv-new"') : ''}</div>`)}

      ${tiles([tile('calendar-check', 'sky', 'Appointments today', A.filter(a => a.status !== 'cancelled').length), tile('log-in', 'emerald', 'Arrived', arrived.length),
        tile('hourglass', late.length ? 'rose' : 'amber', 'Still to arrive', toCome.length, late.length ? `${late.length} late` : ''), tile('receipt', 'teal', 'Billed today', inr(billedToday.reduce((s, i) => s + i.total, 0)))])}

      <div class="grid gap-5 xl:grid-cols-3">
        <div class="space-y-5 xl:col-span-2">
          <div class="${card} p-4"><div class="relative">${ico('search', 'pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400')}
            <input type="search" class="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-base outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-800" placeholder="Find a patient — name, MRN or phone" value="${esc(ui.rsq || '')}" data-pg-input="rsq" aria-label="Find a patient"/></div>
            ${q ? `<ul class="mt-2 divide-y divide-slate-100 dark:divide-slate-800">${hits.map(p => { const a = A.find(x => x.mrn === p.mrn);
              return `<li class="flex flex-wrap items-center gap-3 py-2.5">${avatar(p.name, p.gender === 'F' ? 'rose' : 'sky')}<div class="min-w-[160px] flex-1"><p class="text-sm font-medium">${esc(p.name)}</p><p class="text-xs text-slate-500"><span class="font-mono">${p.mrn}</span> · ${p.age}${p.gender} · •••• ${p.phone.slice(-4)}${a ? ` · <b class="text-sky-600">today ${a.time}</b>` : ''}</p></div>
                ${a && ['pending', 'confirmed'].includes(a.status) ? btn('primary', 'Check in', 'log-in', `data-pg="q" data-do="checkin" data-id="${a.id}"`, 'h-8 px-3') : ''}
                ${can('prescription:upload') && mod('prescriptions') ? btn('soft', 'Upload Rx', 'camera', `data-pg="rxu-new" data-mrn="${p.mrn}"`, 'h-8 px-3') : ''}${btn('ghost', 'Open', '', `data-pg="patient" data-id="${p.mrn}"`, 'h-8 px-3')}${can('appointment:create') && !a ? btn('soft', 'Book', 'calendar-plus', 'data-action="new-appointment"', 'h-8 px-3') : ''}</li>`; }).join('')
              || `<li class="flex flex-wrap items-center justify-between gap-3 py-3 text-sm text-slate-500">No patient found for “${esc(ui.rsq)}”.${can('patient:create') ? btn('primary', 'Register new', 'user-plus', 'data-nav="patients:new"', 'h-8 px-3') : ''}</li>`}</ul>` : ''}</div>

          <div class="${card}">${cardHead('Arrivals', `${arrived.length} of ${A.filter(a => a.status !== 'cancelled').length} arrived`, btn('ghost', 'OPD queue', 'arrow-right', 'data-nav="appointments:queue"', 'h-8 px-3'))}
            <ul class="divide-y divide-slate-100 dark:divide-slate-800">${A.map(a => { const [t, l] = AST[a.status] || ['slate', a.status], isLate = ['pending', 'confirmed'].includes(a.status) && mins(a.time) < nowM - 15;
              return `<li class="flex flex-wrap items-center gap-3 px-5 py-3 ${ui.qflash === a.id ? 'row-flash' : ''} ${['completed', 'cancelled', 'no-show'].includes(a.status) ? 'opacity-60' : ''}">
                <span class="w-12 font-mono text-sm font-semibold">${a.time}</span>
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg ${a.status === 'checked-in' || a.status === 'with-doctor' ? 'bg-slate-900 text-white dark:bg-slate-700' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'} text-xs font-bold">${tok(a)}</span>
                <div class="min-w-[150px] flex-1"><p class="truncate text-sm font-medium">${esc(a.patient)}</p><p class="truncate text-xs text-slate-500">${esc(a.doctor)} · ${esc(a.type)}</p></div>
                ${isLate ? badge('rose', 'Late', 'clock') : ''}${badge(t, l)}
                <div class="flex gap-1">${a.status === 'pending' ? btn('ghost', 'Confirm', 'message-circle', `data-pg="rc-confirm" data-id="${a.id}"`, 'h-8 px-2.5') : ''}
                  ${['pending', 'confirmed'].includes(a.status) ? btn('primary', 'Check in', 'log-in', `data-pg="q" data-do="checkin" data-id="${a.id}"`, 'h-8 px-2.5') : ''}
                  ${['with-doctor', 'completed'].includes(a.status) && can('prescription:upload') && mod('prescriptions') ? (d.prescriptions.some(r => r.mrn === a.mrn && r.date === todayISO()) ? badge('violet', 'Rx saved', 'file-check') : btn('soft', 'Upload Rx', 'camera', `data-pg="rxu-new" data-mrn="${a.mrn}"`, 'h-8 px-2.5')) : ''}
                  ${iconBtn('info', 'Details', `data-appt="${a.id}"`)}</div></li>`; }).join('')}</ul></div>
        </div>

        <div class="space-y-5">
          <div class="${card}">${cardHead('Doctors right now', 'Who’s in and how long the wait is')}
            <ul class="divide-y divide-slate-100 dark:divide-slate-800">${T().doctors.map(doc => { const w = A.filter(a => a.doctor === doc.name && a.status === 'checked-in').length, sch = (d.schedules[doc.id] || {});
              const dt = doc.duty === 'In OPD' ? 'emerald' : doc.duty === 'In surgery' ? 'rose' : 'amber';
              return `<li class="flex items-center gap-3 px-5 py-3">${avatar(doc.name, 'teal')}<div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">${esc(doc.name)}</p><p class="truncate text-xs text-slate-500">${esc(doc.spec)} · ${esc(sch.room || '')} · ₹${doc.fee}</p></div>
                <div class="text-right">${badge(dt, doc.duty || 'Off')}<p class="mt-1 text-[11px] text-slate-500">${w ? `${w} waiting · ~${w * (sch.slot || 15)} min` : 'No wait'}</p></div></li>`; }).join('')}</ul></div>

          <div class="${card}">${cardHead('Open slots', slotDay)}
            <div class="flex flex-wrap gap-2 p-5">${free.map(s => `<button type="button" class="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 font-mono text-sm font-semibold text-sky-700 transition hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300" data-action="new-appointment">${s}</button>`).join('') || '<p class="text-sm text-slate-500">No more slots today — offer tomorrow.</p>'}</div></div>

          ${unconf.length ? `<div class="${card} p-5"><div class="flex items-start gap-3"><span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl ${K.tone('amber')}">${ico('phone-call')}</span>
            <div class="flex-1"><p class="text-sm font-semibold">${unconf.length} booking${unconf.length > 1 ? 's' : ''} not confirmed</p><p class="text-xs text-slate-500">Send a WhatsApp reminder asking them to reply 1.</p></div></div>
            <div class="mt-3">${btn('soft', 'Remind all', 'send', 'data-pg="rc-remind"', 'h-9 w-full')}</div></div>` : ''}

          <div class="${card}">${cardHead('Unpaid bills', `${inr(dues.reduce((s, i) => s + i.total - i.paid, 0))} outstanding`, can('invoice:create') ? btn('ghost', 'Billing', 'arrow-right', 'data-nav="billing"', 'h-8 px-3') : '')}
            <ul class="divide-y divide-slate-100 dark:divide-slate-800">${dues.slice(0, 5).map(i => `<li class="flex items-center gap-3 px-5 py-2.5"><div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">${esc(i.patient)}</p><p class="font-mono text-[11px] text-slate-400">${i.id}</p></div>
              <span class="text-sm font-semibold tabular-nums text-rose-600">${inr(i.total - i.paid)}</span>${iconBtn('eye', 'View bill', `data-pg="inv-view" data-id="${i.id}"`)}</li>`).join('') || '<li class="px-5 py-6 text-center text-sm text-slate-500">Nothing outstanding.</li>'}</ul></div>
        </div>
      </div></div>`;
    ui.qflash = null;
  }
  on('rc-confirm', el => { const a = T().appointments.find(x => x.id === el.dataset.id); a.status = 'confirmed'; ui.qflash = a.id;
    H().logActivity('message-circle', 'teal', `<b>${esc(me().person)}</b> confirmed ${esc(a.patient)}’s ${a.time} appointment`);
    toast('Appointment confirmed', `${a.patient} · WhatsApp confirmation sent`, 'teal', 'message-circle'); H().refresh(false); });
  on('rc-remind', () => { const list = T().appointments.filter(a => a.status === 'pending'); toast('Reminders sent', `${list.length} patients · WhatsApp (falls back to SMS)`, 'emerald', 'send'); });

  /* ============================== Accountant ============================== */
  function renderAccountant(c) {
    const d = D(), t = T(), inv = d.invoices, today = inv.filter(i => i.date === todayISO());
    const collected = today.reduce((s, i) => s + i.paid, 0), billed = today.reduce((s, i) => s + i.total, 0);
    const dues = inv.filter(i => i.status === 'due' || i.status === 'partial').sort((a, b) => (b.total - b.paid) - (a.total - a.paid));
    const outstanding = dues.reduce((s, i) => s + i.total - i.paid, 0);
    const refunds = inv.filter(i => i.status === 'refunded').length + d.audit.filter(e => e.action === 'payment.refund').length;
    const modes = ['UPI', 'Cash', 'Card', 'Insurance'].map(m => [m, inv.filter(i => i.mode === m).reduce((s, i) => s + i.paid, 0)]);
    const modeTot = Math.max(1, modes.reduce((s, m) => s + m[1], 0));
    const tpa = Object.entries(inv.filter(i => i.payer !== 'Self').reduce((o, i) => ((o[i.payer] = (o[i.payer] || 0) + i.total), o), {}));
    const close = ui.close || (ui.close = { cash: false, upi: false, card: false, done: false });
    const run = ui.prun || { status: 'draft' }, net = d.payroll.reduce((s, p) => s + p.net, 0);
    const MT = { UPI: 'teal', Cash: 'amber', Card: 'sky', Insurance: 'violet' };
    const chk = (k, l, sub) => `<li><button type="button" class="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40" data-pg="ac-chk" data-k="${k}" ${close.done ? 'disabled' : ''}>
      <span class="grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${close[k] ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 dark:border-slate-600'}">${close[k] ? ico('check', 'h-3.5 w-3.5') : ''}</span>
      <span class="flex-1"><span class="block text-sm font-medium ${close[k] ? 'text-slate-400 line-through' : ''}">${l}</span><span class="block text-xs text-slate-500">${sub}</span></span></button></li>`;

    c.innerHTML = `<div class="fade-in space-y-5">
      ${hero('from-amber-500 to-orange-500', 'calculator', `${greet()}, ${esc(me().person.split(' ')[0])}`,
        `${inr(collected)} collected today · ${dues.length} bills with dues · ${close.done ? 'day closed' : 'day still open'}`,
        `<div class="flex flex-wrap gap-2">${can('invoice:create') ? heroBtn('New invoice', 'receipt', 'data-pg="inv-new"') : ''}${can('report:finance') ? heroGhost('Day-end report', 'file-bar-chart', 'data-pg="bill-dayend"') : ''}</div>`)}

      ${tiles([tile('indian-rupee', 'emerald', 'Collected today', inr(collected), billed ? Math.round(collected / billed * 100) + '%' : ''), tile('receipt', 'amber', 'Billed today', inr(billed)),
        tile('clock', 'rose', 'Outstanding dues', inr(outstanding)), tile('undo-2', 'slate', 'Refunds this month', refunds)])}

      <div class="grid gap-5 xl:grid-cols-3">
        <div class="space-y-5 xl:col-span-2">
          <div class="${card}">${cardHead('Billed vs collected', 'Last 14 days', can('report:finance') && mod('reports') ? btn('ghost', 'Analytics', 'arrow-right', 'data-nav="dashboard:analytics"', 'h-8 px-3') : '')}<div class="h-64 p-4"><canvas id="pgAcChart"></canvas></div></div>

          <div class="${card}">${cardHead('Dues to collect', `${inr(outstanding)} across ${dues.length} bills · largest first`, btn('ghost', 'Billing', 'arrow-right', 'data-nav="billing"', 'h-8 px-3'))}
            <ul class="divide-y divide-slate-100 dark:divide-slate-800">${dues.map(i => `<li class="flex flex-wrap items-center gap-3 px-5 py-3 ${ui.flash === i.id ? 'row-flash' : ''}">
              ${avatar(i.patient, 'amber')}<div class="min-w-[160px] flex-1"><p class="text-sm font-medium">${esc(i.patient)}</p><p class="text-xs text-slate-500"><span class="font-mono">${i.id}</span> · ${fmtShort(i.date)} · ${i.payer === 'Self' ? 'Self-pay' : esc(i.payer)}</p></div>
              ${i.status === 'partial' ? badge('amber', 'Part paid') : badge('rose', 'Due')}<span class="w-20 text-right text-sm font-semibold tabular-nums text-rose-600">${inr(i.total - i.paid)}</span>
              <div class="flex gap-1">${iconBtn('message-circle', 'Send payment link', `data-pg="ac-link" data-id="${i.id}"`)}${can('payment:collect') ? btn('primary', 'Collect', '', `data-pg="inv-pay" data-id="${i.id}"`, 'h-8 px-3') : iconBtn('eye', 'View', `data-pg="inv-view" data-id="${i.id}"`)}</div></li>`).join('') || `<li>${empty('circle-check', 'No dues', 'Every bill is settled.')}</li>`}</ul></div>
        </div>

        <div class="space-y-5">
          <div class="${card}">${cardHead('Close the day', close.done ? 'Closed · invoices locked' : 'Reconcile before locking today’s bills')}
            <ul class="divide-y divide-slate-100 dark:divide-slate-800">${chk('cash', 'Count cash in drawer', `Expected ${inr(today.filter(i => i.mode === 'Cash').reduce((s, i) => s + i.paid, 0))}`)}${chk('upi', 'Match UPI settlements', `${today.filter(i => i.mode === 'UPI').length} transactions`)}${chk('card', 'Match card terminal batch', `${today.filter(i => i.mode === 'Card').length} swipes`)}</ul>
            <div class="border-t border-slate-100 p-3 dark:border-slate-800">${close.done ? `<p class="py-1.5 text-center text-sm font-medium text-emerald-600">${ico('lock', 'inline h-4 w-4')} Day closed at ${close.at}</p>`
              : btn(close.cash && close.upi && close.card ? 'primary' : 'ghost', 'Close the day', 'lock', 'data-pg="ac-close"', 'h-9 w-full')}</div></div>

          <div class="${card}">${cardHead('Collections by mode', 'All recorded payments')}
            <div class="space-y-3.5 p-5">${modes.map(([m, v]) => `<div><div class="mb-1 flex justify-between text-sm"><span>${m}</span><span class="tabular-nums text-slate-500">${inr(v)} · ${Math.round(v / modeTot * 100)}%</span></div>${bar(v / modeTot * 100, MT[m])}</div>`).join('')}</div></div>

          <div class="${card}">${cardHead('Insurance / TPA receivables', 'Billed to payers, awaiting settlement')}
            <ul class="divide-y divide-slate-100 dark:divide-slate-800">${tpa.map(([p, v], k) => `<li class="flex items-center gap-3 px-5 py-3"><span class="grid h-9 w-9 place-items-center rounded-xl ${K.tone('violet')}">${ico('shield-check')}</span>
              <div class="flex-1"><p class="text-sm font-medium">${esc(p)}</p><p class="text-xs text-slate-500">${['Claim submitted', 'Query raised', 'Pre-auth approved'][k % 3]}</p></div><span class="text-sm font-semibold tabular-nums">${inr(v)}</span></li>`).join('') || '<li class="px-5 py-6 text-center text-sm text-slate-500">No insurance bills.</li>'}</ul></div>

          ${mod('hr') && can('payroll:read') ? `<div class="${card} p-5"><div class="flex items-center justify-between"><p class="font-semibold">${monthName()} payroll</p>${badge(run.status === 'published' ? 'emerald' : run.status === 'draft' ? 'amber' : 'sky', run.status[0].toUpperCase() + run.status.slice(1))}</div>
            <p class="mt-2 text-2xl font-bold tabular-nums">${inr(net)}</p><p class="text-xs text-slate-500">net payout · fund the salary account before pay day</p>
            <div class="mt-3 flex gap-2">${btn('ghost', 'View payroll', 'wallet', 'data-nav="payroll"', 'h-9 flex-1')}${btn('ghost', 'Bank file', 'file-down', 'data-pg="pr-bank"', 'h-9 flex-1')}</div></div>` : ''}
        </div>
      </div></div>`;
    ui.flash = null;
    const days = Array.from({ length: 14 }, (_, i) => fmtShort(addDays(new Date(), i - 13)));
    chart(document.getElementById('pgAcChart'), { type: 'bar', data: { labels: days, datasets: [
      { label: 'Billed', data: t.revenue, backgroundColor: 'rgba(217,119,6,.3)', borderRadius: 6, maxBarThickness: 22 },
      { label: 'Collected', data: t.revenue.map((v, i) => Math.round(v * (.78 + (i % 4) * .05))), backgroundColor: '#059669', borderRadius: 6, maxBarThickness: 22 }] },
      options: { plugins: { legend: { display: true, position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: x => ` ${x.dataset.label}: ${inr(x.raw)}` } } },
        scales: { y: { ticks: { callback: v => '₹' + v / 1000 + 'k' } } } } });
  }
  on('ac-chk', el => { ui.close[el.dataset.k] = !ui.close[el.dataset.k]; rerender(); });
  on('ac-close', () => { const c = ui.close;
    if (!(c.cash && c.upi && c.card)) return toast('Reconcile first', 'Tick cash, UPI and card before closing.', 'amber', 'list-checks');
    H().confirmDialog({ title: 'Close today’s books?', text: 'Today’s invoices become read-only. Corrections after this need a credit note.', ok: 'Close the day', tone: 'teal', icon: 'lock', onOk: () => {
      c.done = true; c.at = nowTime(); H().logActivity('lock', 'amber', `<b>${esc(me().person)}</b> closed the day’s books`); toast('Day closed', 'Day-end report emailed to the admin', 'emerald', 'lock'); rerender(); } }); });
  on('ac-link', el => { const i = D().invoices.find(x => x.id === el.dataset.id); toast('Payment link sent', `${i.patient} · ${inr(i.total - i.paid)} · UPI link on WhatsApp`, 'teal', 'message-circle'); });

  /* ============================== Employee (self-service) ============================== */
  function renderEmployee(c) {
    const d = D(), e = T().employees.find(x => x.name === me().person) || T().employees[0];
    const a = d.attendance.find(x => x.id === e.id) || {}, st = ui.me || (ui.me = { in: a.in || '', out: a.out || '' });
    const roster = d.roster[e.id], dayIdx = (new Date().getDay() + 6) % 7, S = d.SHIFTS, sh = roster ? S[roster[dayIdx]] : S.G;
    const monday = addDays(new Date(), -dayIdx), pay = d.payroll.find(p => p.id === e.id);
    const leaves = ui.myLeaves || (ui.myLeaves = d.leaves.filter(l => l.name === e.name).concat([{ id: 'LV-290', type: 'Sick', from: iso(addDays(new Date(), -40)), to: iso(addDays(new Date(), -39)), days: 2, reason: 'Fever', status: 'approved' }]));
    const used = t => leaves.filter(l => l.type === t && l.status === 'approved').reduce((s, l) => s + l.days, 0);
    const now = new Date(), lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0), payDay = lastDay.getDay() === 0 ? addDays(lastDay, -2) : lastDay.getDay() === 6 ? addDays(lastDay, -1) : lastDay;
    const daysToPay = Math.max(0, Math.round((payDay - new Date(todayISO())) / 864e5));
    const worked = Array.from({ length: now.getDate() }, (_, i) => new Date(now.getFullYear(), now.getMonth(), i + 1)).filter(x => x.getDay() !== 0 && iso(x) !== todayISO()).length - 1 + (st.in ? 1 : 0);
    const notices = [['megaphone', 'sky', 'Fire drill on Thursday, 11:00', 'All floors. Follow the floor marshal; lifts will be switched off.'], ['syringe', 'emerald', 'Free flu shots for staff', 'Nursing station, ground floor · this week 2–4 pm.'], ['badge-indian-rupee', 'amber', 'Submit tax proofs', `Investment proofs for TDS are due by 15 ${new Date(now.getFullYear(), now.getMonth() + 2, 1).toLocaleDateString('en-IN', { month: 'short' })}.`]];

    c.innerHTML = `<div class="fade-in space-y-5">
      ${hero('from-slate-700 to-slate-600', 'user', `${greet()}, ${esc(e.name.split(' ')[0])}`,
        `${esc(e.type === 'Support Staff' ? me().title : e.type)} · ${esc(e.dept)} · today: ${sh.label}${sh.time ? ' shift ' + sh.time : ''}`,
        `<button type="button" class="inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold shadow ${st.out ? 'bg-white/20 text-white/70' : st.in ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-white text-slate-800 hover:bg-slate-50'}" data-pg="me-punch" ${st.out ? 'disabled' : ''}>
          ${ico('fingerprint', 'h-5 w-5')}${st.out ? `Shift done · out ${st.out}` : st.in ? `Check out · in since ${st.in}` : 'Check in'}</button>`)}

      ${tiles([tile('clock', sh.tone, 'Today’s shift', sh.label, sh.time), tile('calendar-check', 'emerald', `Days worked in ${now.toLocaleDateString('en-IN', { month: 'long' })}`, worked),
        tile('plane', 'violet', 'Leave days left', 42 - used('Casual') - used('Sick') - used('Earned')), tile('wallet', 'sky', 'Next pay day', fmtShort(payDay), daysToPay ? `in ${daysToPay} d` : 'today')])}

      <div class="grid gap-5 xl:grid-cols-3">
        <div class="space-y-5 xl:col-span-2">
          ${roster ? `<div class="${card}">${cardHead('My week', `${fmtShort(monday)} – ${fmtShort(addDays(monday, 6))} · published by HR`)}
            <div class="grid grid-cols-7 gap-2 p-5">${roster.map((s, i) => { const x = addDays(monday, i), isT = i === dayIdx;
              return `<div class="rounded-xl p-2 text-center ${K.tone(S[s].tone)} ${isT ? 'ring-2 ring-slate-900 dark:ring-white' : ''} ${i < dayIdx ? 'opacity-50' : ''}">
                <p class="text-[11px] font-semibold uppercase">${x.toLocaleDateString('en-IN', { weekday: 'short' })}</p><p class="text-lg font-bold">${x.getDate()}</p>
                <p class="text-xs font-semibold">${S[s].label}</p><p class="hidden text-[10px] opacity-75 sm:block">${S[s].time || '—'}</p></div>`; }).join('')}</div>
            <div class="flex justify-end border-t border-slate-100 px-5 py-3 dark:border-slate-800">${btn('ghost', 'Request a swap', 'arrow-left-right', 'data-pg="emp-swap"', 'h-8 px-3')}</div></div>` : ''}

          <div class="${card}">${cardHead('Notices', 'From the hospital')}
            <ul class="divide-y divide-slate-100 dark:divide-slate-800">${notices.map(([i, tn, h, s]) => `<li class="flex gap-3 px-5 py-3.5"><span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl ${K.tone(tn)}">${ico(i)}</span><div><p class="text-sm font-medium">${h}</p><p class="text-xs text-slate-500">${esc(s)}</p></div></li>`).join('')}</ul></div>
        </div>

        <div class="space-y-5">
          <div class="${card}">${cardHead('Leave', 'Balance this year', btn('primary', 'Apply', 'plus', 'data-pg="me-apply"', 'h-8 px-3'))}
            <div class="space-y-3.5 p-5">${[['Casual', 12, 'amber'], ['Sick', 12, 'rose'], ['Earned', 18, 'teal']].map(([t, q, tn]) => `<div><div class="mb-1 flex justify-between text-sm"><span>${t}</span><span class="tabular-nums text-slate-500">${q - used(t)} of ${q} left</span></div>${bar((q - used(t)) / q * 100, tn)}</div>`).join('')}</div>
            <ul class="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">${leaves.slice(0, 3).map(l => `<li class="flex items-center gap-2 px-5 py-2.5 text-sm ${ui.flash === l.id ? 'row-flash' : ''}"><span class="flex-1">${l.type} · ${fmtShort(l.from)}${l.days > 1 ? '–' + fmtShort(l.to) : ''}</span>${badge(...({ pending: ['amber', 'Pending'], approved: ['emerald', 'Approved'], rejected: ['rose', 'Rejected'], cancelled: ['slate', 'Cancelled'] }[l.status]))}</li>`).join('')}</ul></div>

          ${pay ? `<div class="${card} p-5"><div class="flex items-center justify-between"><p class="font-semibold">Latest payslip</p><span class="text-xs text-slate-500">${monthName(-1)}</span></div>
            <p class="mt-2 text-3xl font-bold tabular-nums">${inr(pay.net)}</p><p class="text-xs text-slate-500">credited to ${pay.bank} · gross ${inr(pay.gross)}</p>
            <div class="mt-4 flex gap-2">${btn('ghost', 'View', 'eye', `data-pg="slip" data-id="${pay.id}" data-m="${monthName(-1)}"`, 'h-9 flex-1')}${btn('ghost', 'All payslips', 'file-badge', 'data-nav="me:payslips"', 'h-9 flex-1')}</div></div>` : ''}

          <div class="${card} p-5"><p class="mb-3 text-sm font-semibold">Need help?</p><div class="space-y-2">
            ${[['phone', 'Call HR', 'emp-help', 'HR'], ['hard-hat', 'Report a safety issue', 'emp-help', 'Safety'], ['user-round-pen', 'Update my phone / bank', 'emp-help', 'Profile']].map(([i, l, a, k]) => `<button type="button" class="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm font-medium transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" data-pg="${a}" data-k="${k}">${ico(i, 'h-4 w-4 text-slate-500')}${l}</button>`).join('')}</div></div>
        </div>
      </div></div>`;
    ui.flash = null;
  }
  on('emp-swap', () => { const d = D(), e = T().employees.find(x => x.name === me().person) || T().employees[0], mates = T().employees.filter(x => x.id !== e.id && x.type === e.type && d.roster[x.id]);
    K.modal({ title: 'Request a shift swap', icon: 'arrow-left-right', ok: 'Send request', body: `<div class="grid gap-4 sm:grid-cols-2">${K.field('day', 'Day', { opts: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((x, i) => [i, x]) })}${K.field('with', 'Swap with', { opts: mates.length ? mates.map(x => x.name) : ['Anyone available'] })}${K.field('why', 'Reason', { full: true, ph: 'Optional' })}</div>`,
      onSubmit: f => { d.swaps.push({ id: 'SW-' + (30 + d.swaps.length), from: e.name, to: f.elements.with.value, day: +f.elements.day.value, shift: d.roster[e.id][+f.elements.day.value], status: 'pending' }); toast('Swap requested', 'HR will approve or reject it', 'sky', 'send'); } }); });
  on('emp-help', el => toast({ HR: 'Calling HR desk', Safety: 'Safety report started', Profile: 'Change request sent' }[el.dataset.k], { HR: 'Ext. 204 · Neha Gupta', Safety: 'Facilities manager notified', Profile: 'HR verifies bank changes before payroll' }[el.dataset.k], 'slate', 'info'));

  K.register({
    'home:doctor':       { title: 'My Day', sub: 'Your OPD list, results and inpatients for today.', render: renderDoctor,
      info: { title: 'Doctor dashboard', desc: 'What a doctor sees on sign-in.', phase: 'Phase 1', features: ['Next patient with one-click consultation', 'Own OPD list with call-in', 'Lab & imaging results to acknowledge', 'Inpatients under their care'] } },
    'home:hr':           { title: 'HR Dashboard', sub: 'People, attendance, approvals and payroll at a glance.', render: renderHR,
      info: { title: 'HR dashboard', desc: 'What the HR manager sees on sign-in.', phase: 'Phase 3', features: ['Approvals inbox: leave, shift swaps, pending logins', 'Attendance by department and 14-day trend', 'Payroll run status', 'Roster gaps, joiners and anniversaries'] } },
    'home:receptionist': { title: 'Front Desk', sub: 'Find patients, check them in and keep the queue moving.', render: renderReception,
      info: { title: 'Receptionist dashboard', desc: 'What the front desk sees on sign-in.', phase: 'Phase 1', features: ['Patient search with one-click check-in', 'Arrivals list with late flags and confirmations', 'Doctor availability and wait times', 'Open slots and unpaid bills'] } },
    'home:accountant':   { title: 'Finance Desk', sub: 'Collections, dues, reconciliation and payroll funding.', render: renderAccountant,
      info: { title: 'Accountant dashboard', desc: 'What the accountant sees on sign-in.', phase: 'Core', features: ['Collected vs billed today and over 14 days', 'Dues to collect with payment links', 'Day-close reconciliation checklist', 'TPA receivables and payroll payout'] } },
    'home:employee':     { title: 'My Work', sub: 'Your shift, leave, pay and hospital notices.', render: renderEmployee,
      info: { title: 'Employee home', desc: 'What any employee without a work role sees.', phase: 'Phase 3', features: ['One-tap check-in / check-out', 'This week’s roster and swap requests', 'Leave balance and requests', 'Latest payslip and notices'] } },
  });
})();
