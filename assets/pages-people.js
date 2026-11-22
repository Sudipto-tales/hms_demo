/* HMS demo — HR & payroll (attendance, leave, payroll, shifts), employee self-service
 * (My Attendance / Leave / Payslips) and the patient portal (home + My … pages). */
(() => {
  'use strict';
  const K = window.PG;
  const { esc, inr, T, D, can, me, card, badge, avatar, ico, tile, tiles, btn, iconBtn, seg, search, select, toolbar, cardHead,
    table, td, td0, person, empty, bar, dl, note, field, readForm, modal, on, rerender, ui,
    iso, todayISO, addDays, fmtDate, fmtShort, nowTime, monthName, audit, who } = K;
  const H = () => window.HMS;
  const toast = (...a) => H().toast(...a);
  const ATT = { present: ['emerald', 'Present'], late: ['amber', 'Late'], absent: ['rose', 'Absent'], leave: ['violet', 'On leave'], 'half-day': ['sky', 'Half day'] };
  const myEmp = () => T().employees.find(e => e.name === me().person) || T().employees[0];

  /* ======================= Attendance ======================= */
  function renderAttendance(c) {
    const d = D(), st = ui.atst || 'all', q = (ui.atq || '').toLowerCase();
    const list = d.attendance.filter(a => (st === 'all' || a.status === st) && (!q || (a.name + a.dept).toLowerCase().includes(q)));
    const n = s => d.attendance.filter(a => a.status === s).length, total = d.attendance.length;
    c.innerHTML = `<div class="fade-in space-y-5">
      <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">${Object.entries(ATT).map(([k, [t, l]]) => `<button type="button" class="${card} p-4 text-left transition hover:-translate-y-0.5 ${st === k ? 'ring-2 ring-teal-500' : ''}" data-pg="seg" data-key="atst" data-val="${st === k ? 'all' : k}">
          <p class="text-2xl font-bold tabular-nums">${n(k)}</p><p class="text-xs text-slate-500">${l}</p><div class="mt-2 h-1 rounded-full bg-${t}-500" style="width:${Math.max(8, n(k) / total * 100)}%"></div></button>`).join('')}</div>
        <div class="${card} flex items-center gap-4 p-4"><div class="relative h-16 w-16"><svg viewBox="0 0 36 36" class="h-16 w-16 -rotate-90"><circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" class="text-slate-100 dark:text-slate-800" stroke-width="4"/><circle cx="18" cy="18" r="15.9" fill="none" stroke="#0d9488" stroke-width="4" stroke-linecap="round" stroke-dasharray="${Math.round((n('present') + n('late') + n('half-day')) / total * 100)} 100"/></svg>
          <span class="absolute inset-0 grid place-items-center text-sm font-bold">${Math.round((n('present') + n('late') + n('half-day')) / total * 100)}%</span></div>
          <div><p class="font-semibold">Turnout today</p><p class="text-xs text-slate-500">${fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'short' })}</p><p class="mt-1 text-xs text-slate-500">${T().stats.present} of ${T().stats.staff} across all branches</p></div></div>
      </div>
      <div class="${card}">${toolbar(`${search('atq', ui.atq || '', 'Search employee or department')}<span class="flex-1"></span>${can('attendance:record') ? btn('ghost', 'Mark attendance', 'user-check', 'data-pg="at-mark"') : ''}${btn('ghost', 'Export', 'download', 'data-pg="at-export"')}`)}
        ${table(['Employee', 'Shift', 'Check-in', 'Check-out', 'Source', 'Status', ''], list.map(a => `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 ${ui.flash === a.id ? 'row-flash' : ''}">
          ${td0(person(a.name, `${esc(a.type)} · ${esc(a.dept)}`, ATT[a.status][0]))}${td(esc(a.shift))}${td(a.in ? `<span class="font-mono ${a.status === 'late' ? 'text-amber-600' : ''}">${a.in}</span>` : '—')}${td(a.out ? `<span class="font-mono">${a.out}</span>` : a.in ? '<span class="text-xs text-slate-400">On duty</span>' : '—')}
          ${td(a.in ? `<span class="inline-flex items-center gap-1 text-xs text-slate-500">${ico(a.source === 'Biometric' ? 'fingerprint' : 'smartphone', 'h-3.5 w-3.5')}${a.source}</span>` : '')}${td(badge(...ATT[a.status]) + (a.corrected ? ' ' + badge('slate', 'Corrected') : ''))}
          ${td(can('attendance:approve') ? btn('ghost', 'Correct', '', `data-pg="at-fix" data-id="${a.id}"`, 'h-8 px-3') : '', 'pr-5 text-right')}</tr>`).join(''), { min: '860px', empty: 'Nobody matches.' })}
        <div class="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800">Late after 09:15 · half day under 4.5 h · approved corrections and leave feed payroll automatically.</div></div></div>`;
    ui.flash = null;
  }
  on('at-fix', el => { const a = D().attendance.find(x => x.id === el.dataset.id);
    modal({ title: `Correct attendance · ${a.name}`, sub: fmtDate(new Date()), icon: 'user-check', ok: 'Save correction', body: `<div class="grid gap-4 sm:grid-cols-2">${field('status', 'Status', { opts: Object.entries(ATT).map(([k, [, l]]) => [k, l]), value: a.status })}${field('in', 'Check-in', { type: 'time', value: a.in })}${field('out', 'Check-out', { type: 'time', value: a.out })}${field('reason', 'Reason', { req: true, ph: 'e.g. Biometric not working' })}</div>`,
      onSubmit: f => { const v = readForm(f, ['reason']); if (!v) return false; Object.assign(a, { status: v.status, in: v.in, out: v.out, corrected: true }); ui.flash = a.id;
        audit('user-check', 'violet', `<b>${who()}</b> corrected attendance of ${esc(a.name)} — ${esc(v.reason)}`); toast('Attendance corrected', `${a.name} · ${ATT[a.status][1]}`, 'violet', 'check'); rerender(); } }); });
  on('at-mark', () => { const d = D(), absent = d.attendance.filter(a => a.status === 'absent');
    if (!absent.length) return toast('Everyone is marked', '', 'emerald', 'check');
    modal({ title: 'Mark attendance', sub: 'For staff without biometric', icon: 'user-check', ok: 'Mark present', body: `<ul class="space-y-2">${absent.map(a => `<li><label class="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"><input type="checkbox" name="${a.id}" class="h-4 w-4 accent-teal-600" checked/>${person(a.name, a.dept, 'rose')}</label></li>`).join('')}</ul>`,
      onSubmit: f => { let n = 0; absent.forEach(a => { if (f.elements[a.id].checked) { a.status = 'present'; a.in = nowTime(); a.source = 'Manual'; n++; } }); H().bumpStat('present', n); toast('Attendance marked', `${n} marked present`, 'emerald', 'user-check'); rerender(); } }); });
  on('at-export', () => toast('Export started', `Attendance · ${monthName()} · CSV`, 'teal', 'download'));

  /* ======================= Leave ======================= */
  const LST = { pending: ['amber', 'Pending'], approved: ['emerald', 'Approved'], rejected: ['rose', 'Rejected'], cancelled: ['slate', 'Cancelled'] };
  function renderLeave(c) {
    const d = D(), st = ui.lvst || 'pending', list = d.leaves.filter(l => st === 'all' || l.status === st);
    const n = s => d.leaves.filter(l => l.status === s).length;
    c.innerHTML = `<div class="fade-in space-y-5">
      ${tiles([tile('inbox', 'amber', 'Waiting for approval', n('pending')), tile('calendar-off', 'violet', 'On leave today', T().stats.onleave), tile('circle-check', 'emerald', 'Approved this month', n('approved') + 9), tile('calendar-range', 'sky', 'Avg. days / request', '2.4')])}
      <div class="${card}">${toolbar(`${seg('lvst', [['pending', 'Pending', n('pending')], ['approved', 'Approved', n('approved')], ['rejected', 'Rejected', n('rejected')], ['all', 'All']], st)}<span class="flex-1"></span>${btn('ghost', 'Leave policy', 'book-open', 'data-pg="lv-policy"')}`)}
        ${list.length ? `<ul class="divide-y divide-slate-100 dark:divide-slate-800">${list.map(l => `<li class="flex flex-wrap items-center gap-4 px-5 py-4 ${ui.flash === l.id ? 'row-flash' : ''}">
          ${person(l.name, `${l.type} leave · ${l.id}`, 'violet')}
          <div class="min-w-[180px] flex-1 text-sm"><p class="font-medium">${fmtShort(l.from)}${l.days > 1 ? ' – ' + fmtShort(l.to) : ''} <span class="text-slate-500">· ${l.days} day${l.days > 1 ? 's' : ''}</span></p><p class="text-xs text-slate-500">${esc(l.reason)}</p>
            ${l.clash && l.status === 'pending' ? `<p class="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">${ico('triangle-alert', 'h-3.5 w-3.5')}${esc(l.clash)}</p>` : ''}</div>
          ${l.status === 'pending' ? `<div class="flex gap-2">${btn('ghost', 'Reject', 'x', `data-pg="lv" data-do="rejected" data-id="${l.id}"`, 'h-8 px-3')}${btn('primary', 'Approve', 'check', `data-pg="lv" data-do="approved" data-id="${l.id}"`, 'h-8 px-3')}</div>` : badge(...LST[l.status])}</li>`).join('')}</ul>`
          : empty('inbox', 'Nothing here', st === 'pending' ? 'All leave requests are handled.' : 'No requests in this list.')}</div></div>`;
    ui.flash = null;
  }
  on('lv', el => { const l = D().leaves.find(x => x.id === el.dataset.id), ok = el.dataset.do === 'approved';
    const go = () => { l.status = el.dataset.do; ui.flash = l.id; if (ok && l.from <= todayISO()) H().bumpStat('onleave', 1);
      audit(ok ? 'calendar-check' : 'calendar-x', ok ? 'emerald' : 'rose', `<b>${who()}</b> ${ok ? 'approved' : 'rejected'} ${l.days}-day leave for ${esc(l.name)}`);
      toast(ok ? 'Leave approved' : 'Leave rejected', `${l.name} notified on WhatsApp`, ok ? 'emerald' : 'rose', ok ? 'calendar-check' : 'calendar-x'); rerender(); };
    if (ok && l.clash) H().confirmDialog({ title: 'Approve despite clash?', text: l.clash + '. You can fix the roster in Shift Management afterwards.', ok: 'Approve', tone: 'teal', icon: 'triangle-alert', onOk: go }); else go(); });
  on('lv-policy', () => modal({ title: 'Leave policy', sub: 'Yearly quota per employee', icon: 'book-open', tone: 'violet', foot: false,
    body: table(['Type', 'Days / year', 'Carry forward', 'Notes'], [['Casual', 12, 'No', 'Max 3 in a row'], ['Sick', 12, 'Up to 30', 'Certificate after 2 days'], ['Earned', 18, 'Up to 45', 'Apply 7 days ahead'], ['Maternity', 182, '—', 'As per law']].map(r => `<tr>${td0(r[0])}${td(r[1])}${td(r[2])}${td(r[3], 'text-xs text-slate-500')}</tr>`).join(''), { min: '420px' }) }));

  /* ======================= Payroll ======================= */
  function renderPayroll(c) {
    const d = D(), run = ui.prun || (ui.prun = { status: 'draft' }), q = (ui.prq || '').toLowerCase();
    const list = d.payroll.filter(p => !q || (p.name + p.dept).toLowerCase().includes(q));
    const sum = k => d.payroll.reduce((s, p) => s + p[k], 0);
    const steps = [['draft', 'Review'], ['processed', 'Processed'], ['approved', 'Approved'], ['published', 'Payslips published']];
    const si = steps.findIndex(s => s[0] === run.status);
    const canRun = can('payroll:process'), canPub = can('payslip:publish');
    c.innerHTML = `<div class="fade-in space-y-5">
      <div class="${card} p-5"><div class="flex flex-wrap items-center gap-4"><div class="min-w-0 flex-1"><p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Pay run</p><h3 class="text-lg font-semibold">${monthName()} · ${d.payroll.length} employees</h3><p class="text-sm text-slate-500">Pay day: last working day · from attendance, approved leave and salary structures</p></div>
        ${run.status === 'draft' && canRun ? btn('primary', 'Process payroll', 'play', 'data-pg="pr" data-do="processed"') : run.status === 'processed' && can('role:manage') ? btn('primary', 'Approve', 'badge-check', 'data-pg="pr" data-do="approved"') : run.status === 'processed' ? badge('amber', 'Waiting for admin approval', 'hourglass') : run.status === 'approved' && canPub ? btn('primary', 'Publish payslips', 'send', 'data-pg="pr" data-do="published"') : run.status === 'published' ? badge('emerald', 'Published to My Payslips', 'circle-check') : ''}
        ${btn('ghost', 'Bank file', 'file-down', 'data-pg="pr-bank"')}</div>
        <ol class="mt-5 grid grid-cols-4 gap-2">${steps.map(([k, l], i) => `<li><div class="h-1.5 rounded-full ${i <= si ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-700'}"></div><p class="mt-1.5 text-xs ${i <= si ? 'font-semibold text-teal-700 dark:text-teal-300' : 'text-slate-400'}">${l}</p></li>`).join('')}</ol></div>
      ${tiles([tile('wallet', 'sky', 'Gross pay', inr(sum('gross'))), tile('minus-circle', 'rose', 'Deductions', inr(sum('pf') + sum('esi') + sum('tds') + sum('lop'))), tile('banknote', 'emerald', 'Net pay', inr(sum('net'))), tile('calendar-x', 'amber', 'Loss of pay', d.payroll.filter(p => p.lop).length + ' employees')])}
      <div class="${card}">${toolbar(`${search('prq', ui.prq || '', 'Search employee')}<span class="flex-1"></span><span class="text-xs text-slate-500">PF 12% of basic · ESI 0.75% under ₹21k · TDS per declaration</span>`)}
        ${table(['Employee', 'Days', 'Gross', 'LOP', 'PF', 'ESI', 'TDS', 'Net pay', ''], list.map(p => `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
          ${td0(person(p.name, `${esc(p.type)} · ${esc(p.dept)}`, 'sky'))}${td(p.days + '/30')}${td(inr(p.gross), 'text-right tabular-nums')}${td(p.lop ? `<span class="text-rose-600">−${inr(p.lop)}</span>` : '—', 'text-right tabular-nums')}
          ${td(inr(p.pf), 'text-right tabular-nums text-slate-500')}${td(p.esi ? inr(p.esi) : '—', 'text-right tabular-nums text-slate-500')}${td(p.tds ? inr(p.tds) : '—', 'text-right tabular-nums text-slate-500')}${td(inr(p.net), 'text-right font-semibold tabular-nums')}
          ${td(iconBtn('file-text', 'Payslip', `data-pg="slip" data-id="${p.id}"`), 'pr-5 text-right')}</tr>`).join(''), { min: '980px' })}</div></div>`;
  }
  on('pr', el => { const run = ui.prun, to = el.dataset.do;
    const msg = { processed: ['Payroll processed', 'Sent to admin for approval', 'sky', 'cog'], approved: ['Payroll approved', 'HR can publish payslips now', 'emerald', 'badge-check'], published: ['Payslips published', `${D().payroll.length} employees notified on WhatsApp`, 'emerald', 'send'] }[to];
    const go = () => { run.status = to; audit('wallet', 'sky', `<b>${who()}</b> marked ${monthName()} payroll as ${to}`); toast(...msg); rerender(); };
    to === 'published' ? H().confirmDialog({ title: 'Publish payslips?', text: 'Every employee will see their payslip under My Payslips and get a WhatsApp message.', ok: 'Publish', tone: 'teal', icon: 'send', onOk: go }) : go(); });
  on('pr-bank', () => toast('Bank file ready', 'NEFT bulk-payment CSV for the salary account', 'teal', 'file-down'));
  function slipHTML(p, month = monthName()) {
    return `<div class="rounded-xl border border-slate-200 text-sm dark:border-slate-700"><div class="flex justify-between border-b border-slate-200 p-4 dark:border-slate-700"><div><p class="font-bold text-teal-700 dark:text-teal-300">${esc(T().name)}</p><p class="text-xs text-slate-500">Payslip · ${month}</p></div><div class="text-right"><p class="font-semibold">${esc(p.name)}</p><p class="text-xs text-slate-500">${p.id} · ${esc(p.type)}</p></div></div>
      <div class="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700"><div class="p-4"><p class="mb-2 text-xs font-semibold uppercase text-slate-400">Earnings</p>
        ${[['Basic', p.gross * .5], ['HRA', p.gross * .2], ['Special allowance', p.gross * .3]].map(([k, v]) => `<p class="flex justify-between py-0.5"><span>${k}</span><span class="tabular-nums">${inr(v)}</span></p>`).join('')}</div>
        <div class="p-4"><p class="mb-2 text-xs font-semibold uppercase text-slate-400">Deductions</p>${[['PF', p.pf], ['ESI', p.esi], ['TDS', p.tds], ['Loss of pay', p.lop]].filter(x => x[1]).map(([k, v]) => `<p class="flex justify-between py-0.5"><span>${k}</span><span class="tabular-nums">${inr(v)}</span></p>`).join('')}</div></div>
      <div class="flex justify-between border-t border-slate-200 bg-slate-50 p-4 font-semibold dark:border-slate-700 dark:bg-slate-800/50"><span>Net pay (${p.days} days) → ${p.bank}</span><span class="tabular-nums">${inr(p.net)}</span></div></div>`;
  }
  on('slip', el => { const p = D().payroll.find(x => x.id === el.dataset.id); modal({ title: 'Payslip', sub: `${p.name} · ${el.dataset.m || monthName()}`, icon: 'file-badge', tone: 'sky', size: 'max-w-xl', body: slipHTML(p, el.dataset.m), foot: `${btn('ghost', 'Download PDF', 'download', 'data-pg="dl" data-what="Payslip PDF"')}` }); });
  on('dl', el => toast('Downloading', el.dataset.what || 'PDF', 'teal', 'download'));

  /* ======================= Shifts ======================= */
  function renderShifts(c) {
    const d = D(), S = d.SHIFTS, wk = ui.swk || 0, monday = addDays(new Date(), -((new Date().getDay() + 6) % 7) + wk * 7), days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
    const emps = T().employees.filter(e => d.roster[e.id]), f = ui.sty || 'all', rows = emps.filter(e => f === 'all' || e.type === f);
    const cover = (di, s) => emps.filter(e => e.type === 'Nurse' && d.roster[e.id][di] === s).length;
    c.innerHTML = `<div class="fade-in space-y-5">
      <div class="flex flex-wrap gap-2">${Object.entries(S).filter(([k]) => k !== 'O').map(([k, s]) => `<span class="inline-flex items-center gap-2 rounded-xl ${K.tone(s.tone)} px-3 py-1.5 text-xs font-semibold"><b>${k}</b>${s.label} · ${s.time}</span>`).join('')}<span class="inline-flex items-center gap-2 rounded-xl ${K.tone('slate')} px-3 py-1.5 text-xs font-semibold"><b>O</b>Off</span></div>
      ${d.swaps.filter(s => s.status === 'pending').map(s => note('amber', 'arrow-left-right', `<b>Swap request:</b> ${esc(s.from)} wants to swap the ${S[s.shift].label.toLowerCase()} shift on ${days[s.day].toLocaleDateString('en-IN', { weekday: 'long' })} with ${esc(s.to)}.
        <span class="ml-2 inline-flex gap-2"><button type="button" class="font-semibold underline" data-pg="sw" data-do="approved" data-id="${s.id}">Approve</button><button type="button" class="font-semibold underline" data-pg="sw" data-do="rejected" data-id="${s.id}">Reject</button></span>`)).join('')}
      <div class="${card}">${toolbar(`<div class="flex items-center gap-1">${iconBtn('chevron-left', 'Previous week', 'data-pg="sh-wk" data-d="-1"')}<p class="px-2 text-sm font-semibold">${fmtShort(days[0])} – ${fmtDate(days[6])}</p>${iconBtn('chevron-right', 'Next week', 'data-pg="sh-wk" data-d="1"')}</div>
        ${select('sty', [['all', 'All staff'], ...[...new Set(emps.map(e => e.type))].map(x => [x, x])], f, 'Job type')}<span class="flex-1"></span><span class="text-xs text-slate-500">Click a cell to change the shift</span>${btn('primary', 'Publish roster', 'send', 'data-pg="sh-pub"')}`)}
        <div class="overflow-x-auto thin-scroll"><table class="w-full min-w-[860px] text-sm"><thead class="text-[11px] uppercase tracking-wider text-slate-500"><tr class="border-b border-slate-100 dark:border-slate-800"><th class="px-5 py-3 text-left font-semibold">Employee</th>
          ${days.map(x => `<th class="px-1 py-3 font-semibold ${iso(x) === todayISO() ? 'text-teal-600' : ''}">${x.toLocaleDateString('en-IN', { weekday: 'short' })} ${x.getDate()}</th>`).join('')}<th class="px-3 py-3 font-semibold">Hours</th></tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">${rows.map(e => `<tr>${td0(person(e.name, e.type, 'slate'))}${d.roster[e.id].map((s, i) => `<td class="px-1 py-2 text-center"><button type="button" class="h-9 w-full min-w-[56px] rounded-lg text-xs font-bold transition hover:ring-2 hover:ring-teal-400 ${K.tone(S[s].tone)} ${ui.shFlash === e.id + i ? 'row-flash' : ''}" data-pg="sh-cell" data-id="${e.id}" data-i="${i}" title="${S[s].label} ${S[s].time}">${s}</button></td>`).join('')}
            ${td(`<span class="tabular-nums">${d.roster[e.id].filter(s => s !== 'O').length * 8}h</span>`, 'text-center')}</tr>`).join('')}
            <tr class="bg-slate-50/70 dark:bg-slate-800/30"><td class="px-5 py-2.5 text-xs font-semibold text-slate-500">Nurse cover (M / E / N)</td>${days.map((_, i) => { const c3 = ['M', 'E', 'N'].map(s => cover(i, s)); return `<td class="px-1 text-center text-[11px] font-semibold ${c3.some(x => x === 0) ? 'text-rose-600' : 'text-slate-500'}">${c3.join(' / ')}</td>`; }).join('')}<td></td></tr></tbody></table></div></div></div>`;
    ui.shFlash = null;
  }
  on('sh-wk', el => { ui.swk = (ui.swk || 0) + +el.dataset.d; rerender(); });
  on('sh-cell', el => { const r = D().roster[el.dataset.id], i = +el.dataset.i, order = ['M', 'E', 'N', 'G', 'O']; r[i] = order[(order.indexOf(r[i]) + 1) % order.length]; ui.shFlash = el.dataset.id + i; rerender(); });
  on('sh-pub', () => { audit('clock', 'sky', `<b>${who()}</b> published the duty roster`); toast('Roster published', 'Staff notified · visible in their app', 'teal', 'send'); });
  on('sw', el => { const s = D().swaps.find(x => x.id === el.dataset.id), r = D().roster; s.status = el.dataset.do;
    if (s.status === 'approved') { const a = T().employees.find(e => e.name === s.from), b = T().employees.find(e => e.name === s.to); if (a && b && r[a.id] && r[b.id]) { const t = r[a.id][s.day]; r[a.id][s.day] = r[b.id][s.day]; r[b.id][s.day] = t; } }
    toast(s.status === 'approved' ? 'Swap approved' : 'Swap rejected', `${s.from} ↔ ${s.to}`, s.status === 'approved' ? 'emerald' : 'rose', 'arrow-left-right'); rerender(); });

  /* ======================= My Work (self-service) ======================= */
  function renderMyAttendance(c) {
    const e = myEmp(), a = D().attendance.find(x => x.id === e.id) || {}, st = ui.me || (ui.me = { in: a.in || '', out: a.out || '' });
    const today = new Date(), first = new Date(today.getFullYear(), today.getMonth(), 1), lead = (first.getDay() + 6) % 7, dim = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const mark = dd => { const dt = new Date(today.getFullYear(), today.getMonth(), dd), dow = dt.getDay(); if (dd > today.getDate()) return ''; if (dow === 0) return 'off'; return dd === today.getDate() ? (st.in ? 'present' : '') : [7, 15].includes(dd) ? 'late' : dd === 11 ? 'leave' : 'present'; };
    const marks = Array.from({ length: dim }, (_, i) => mark(i + 1)), cnt = k => marks.filter(m => m === k).length;
    c.innerHTML = `<div class="fade-in grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div class="space-y-5"><div class="${card} p-6 text-center">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">${fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <p class="mt-2 font-mono text-4xl font-bold tabular-nums" id="pgClock">${nowTime()}</p><p class="text-sm text-slate-500">${esc(a.shift || 'General')} shift</p>
        <button type="button" class="mx-auto mt-5 grid h-32 w-32 place-items-center rounded-full text-white shadow-lg transition hover:scale-105 ${st.out ? 'bg-slate-400' : st.in ? 'bg-rose-600 hover:bg-rose-700' : 'bg-teal-600 hover:bg-teal-700'}" data-pg="me-punch" ${st.out ? 'disabled' : ''}>
          <span>${ico('fingerprint', 'mx-auto h-10 w-10')}<span class="mt-1 block text-sm font-bold">${st.out ? 'Done' : st.in ? 'Check out' : 'Check in'}</span></span></button>
        <div class="mt-5 grid grid-cols-2 gap-3 text-sm"><div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><p class="text-xs text-slate-500">In</p><p class="font-mono font-semibold">${st.in || '—'}</p></div><div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><p class="text-xs text-slate-500">Out</p><p class="font-mono font-semibold">${st.out || '—'}</p></div></div>
        <p class="mt-3 text-xs text-slate-500">${ico('map-pin', 'inline h-3 w-3')} Location checked against ${esc((T().branches[H().state.branch] || '').split(' · ')[0])}</p></div>
        ${tiles([tile('circle-check', 'emerald', 'Present', cnt('present')), tile('clock', 'amber', 'Late', cnt('late'))]).replace('lg:grid-cols-4', '')}</div>
      <div class="${card}">${cardHead(monthName(), `${cnt('present') + cnt('late')} days worked · ${cnt('leave')} leave`, btn('ghost', 'Request correction', 'pencil', 'data-pg="me-corr"', 'h-8 px-3'))}
        <div class="p-5"><div class="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase text-slate-400">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => `<span>${x}</span>`).join('')}</div>
          <div class="mt-2 grid grid-cols-7 gap-1.5">${Array(lead).fill('<span></span>').join('')}${marks.map((m, i) => `<span class="grid aspect-square place-items-center rounded-xl text-sm font-semibold ${m === 'present' ? K.tone('emerald') : m === 'late' ? K.tone('amber') : m === 'leave' ? K.tone('violet') : m === 'off' ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400'} ${i + 1 === today.getDate() ? 'ring-2 ring-teal-500' : ''}">${i + 1}</span>`).join('')}</div>
          <div class="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">${[['emerald', 'Present'], ['amber', 'Late'], ['violet', 'Leave']].map(([t, l]) => `<span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-${t}-500"></span>${l}</span>`).join('')}</div></div></div></div>`;
  }
  on('me-punch', () => { const st = ui.me, e = myEmp(), a = D().attendance.find(x => x.id === e.id);
    if (!st.in) { st.in = nowTime(); if (a) { a.status = 'present'; a.in = st.in; a.source = 'Mobile app'; } toast('Checked in', `${st.in} · have a good shift`, 'teal', 'fingerprint'); }
    else { st.out = nowTime(); if (a) a.out = st.out; toast('Checked out', `${st.out} · see you tomorrow`, 'slate', 'log-out'); }
    rerender(); });
  on('me-corr', () => modal({ title: 'Request a correction', icon: 'pencil', ok: 'Send to HR', body: `<div class="grid gap-4 sm:grid-cols-2">${field('date', 'Date', { type: 'date', value: iso(addDays(new Date(), -1)) })}${field('in', 'Actual check-in', { type: 'time', value: '09:00' })}${field('reason', 'Reason', { req: true, full: true, ph: 'e.g. Forgot to check in' })}</div>`,
    onSubmit: f => { if (!readForm(f, ['reason'])) return false; toast('Correction requested', 'HR will review it', 'violet', 'send'); } }));

  function renderMyLeave(c) {
    const e = myEmp(), mine = ui.myLeaves || (ui.myLeaves = D().leaves.filter(l => l.name === e.name).concat([{ id: 'LV-290', type: 'Sick', from: iso(addDays(new Date(), -40)), to: iso(addDays(new Date(), -39)), days: 2, reason: 'Fever', status: 'approved' }]));
    const used = t => mine.filter(l => l.type === t && l.status === 'approved').reduce((s, l) => s + l.days, 0);
    const bal = [['Casual', 12, 'amber'], ['Sick', 12, 'rose'], ['Earned', 18, 'teal']];
    c.innerHTML = `<div class="fade-in space-y-5">
      <div class="grid gap-3 sm:grid-cols-3">${bal.map(([t, q, tn]) => `<div class="${card} p-5"><div class="flex items-center justify-between"><p class="font-semibold">${t} leave</p><span class="grid h-9 w-9 place-items-center rounded-xl ${K.tone(tn)}">${ico('calendar-days')}</span></div>
        <p class="mt-3 text-3xl font-bold tabular-nums">${q - used(t)}<span class="text-base font-medium text-slate-400"> / ${q}</span></p><p class="mb-2 text-xs text-slate-500">days left this year</p>${bar((q - used(t)) / q * 100, tn)}</div>`).join('')}</div>
      <div class="${card}">${cardHead('My requests', '', btn('primary', 'Apply for leave', 'plus', 'data-pg="me-apply"'))}
        ${mine.length ? `<ul class="divide-y divide-slate-100 dark:divide-slate-800">${mine.map(l => `<li class="flex flex-wrap items-center gap-4 px-5 py-3.5 ${ui.flash === l.id ? 'row-flash' : ''}"><span class="grid h-10 w-10 place-items-center rounded-xl ${K.tone('violet')}">${ico('plane')}</span>
          <div class="flex-1 text-sm"><p class="font-medium">${l.type} · ${fmtShort(l.from)}${l.days > 1 ? ' – ' + fmtShort(l.to) : ''} (${l.days} day${l.days > 1 ? 's' : ''})</p><p class="text-xs text-slate-500">${esc(l.reason)}</p></div>
          ${badge(...LST[l.status])}${l.status === 'pending' ? btn('ghost', 'Cancel', '', `data-pg="me-lv-cancel" data-id="${l.id}"`, 'h-8 px-3') : ''}</li>`).join('')}</ul>` : empty('plane', 'No leave yet', 'Your requests and their status show here.')}</div></div>`;
    ui.flash = null;
  }
  on('me-apply', () => modal({ title: 'Apply for leave', icon: 'plane', tone: 'violet', ok: 'Submit request',
    body: `<div class="grid gap-4 sm:grid-cols-2">${field('type', 'Leave type', { opts: ['Casual', 'Sick', 'Earned'] })}<span></span>${field('from', 'From', { type: 'date', req: true, value: iso(addDays(new Date(), 2)) })}${field('to', 'To', { type: 'date', req: true, value: iso(addDays(new Date(), 2)) })}${field('reason', 'Reason', { req: true, full: true })}</div>
      <div class="mt-4">${note('sky', 'info', 'Your manager sees a roster clash check before approving.')}</div>`,
    onSubmit: f => { const v = readForm(f, ['from', 'to', 'reason']); if (!v) return false; const days = Math.max(1, Math.round((new Date(v.to) - new Date(v.from)) / 864e5) + 1);
      const l = { id: 'LV-' + (320 + ui.myLeaves.length), name: myEmp().name, type: v.type, from: v.from, to: v.to, days, reason: v.reason, status: 'pending', clash: '' };
      ui.myLeaves.unshift(l); D().leaves.unshift(l); ui.flash = l.id; toast('Leave requested', `${days} day${days > 1 ? 's' : ''} · HR notified`, 'violet', 'send'); rerender(); } }));
  on('me-lv-cancel', el => { const l = ui.myLeaves.find(x => x.id === el.dataset.id); l.status = 'cancelled'; toast('Request cancelled', '', 'slate', 'x'); rerender(); });

  function renderMyPayslips(c) {
    const e = myEmp(), p = D().payroll.find(x => x.id === e.id);
    if (!p) { c.innerHTML = `<div class="${card}">${empty('file-badge', 'No payslips', 'You aren’t on this hospital’s payroll.')}</div>`; return; }
    const months = Array.from({ length: 6 }, (_, i) => monthName(-i - (ui.prun && ui.prun.status === 'published' ? 0 : 1)));
    c.innerHTML = `<div class="fade-in grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div class="${card} self-start">${cardHead('Payslips', `${esc(e.id)} · ${esc(e.type)}`)}<ul class="divide-y divide-slate-100 dark:divide-slate-800">${months.map((m, i) => `<li><button type="button" class="flex w-full items-center gap-3 px-5 py-3 text-left transition ${(ui.mslip || 0) === i ? 'bg-teal-50 dark:bg-teal-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}" data-pg="seg" data-key="mslip" data-val="${i}">
        <span class="grid h-9 w-9 place-items-center rounded-xl ${K.tone('sky')}">${ico('file-badge')}</span><span class="flex-1 text-sm font-medium">${m}</span><span class="text-sm tabular-nums text-slate-500">${inr(p.net)}</span></button></li>`).join('')}</ul></div>
      <div class="space-y-4">${slipHTML(p, months[+(ui.mslip || 0)])}<div class="flex flex-wrap gap-2">${btn('primary', 'Download PDF', 'download', 'data-pg="dl" data-what="Payslip PDF"')}${btn('ghost', 'Form 16', 'file-text', 'data-pg="dl" data-what="Form 16 (FY 2025–26)"')}${btn('ghost', 'Tax declaration', 'calculator', 'data-action="demo-only"')}</div></div></div>`;
  }

  /* ======================= Patient portal ======================= */
  const PT = () => D().pt(ROLES.patient.person);
  function renderPortalHome(c) {
    const p = PT(), d = D(), next = T().appointments.find(a => a.mrn === p.mrn && a.status !== 'completed' && a.status !== 'cancelled');
    const rx = d.prescriptions.filter(r => r.mrn === p.mrn && r.items.length), labs = d.labOrders.filter(l => l.mrn === p.mrn), due = d.invoices.filter(i => i.mrn === p.mrn && i.status !== 'paid');
    c.innerHTML = `<div class="fade-in space-y-5">
      <div class="overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 to-teal-500 p-6 text-white shadow-card">
        <p class="text-sm text-teal-100">${esc(T().name)} · Patient portal</p><h2 class="mt-1 text-2xl font-bold">Hello, ${esc(p.name.split(' ')[0])}</h2>
        <p class="mt-1 text-sm text-teal-50">MRN ${p.mrn} · ${p.blood} · ${p.insurance || 'Self-pay'}</p>
        <div class="mt-5 flex flex-wrap gap-2"><button type="button" class="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-teal-700 hover:bg-teal-50" data-pg="pt-book">${ico('calendar-plus')}Book appointment</button>
          <button type="button" class="inline-flex h-10 items-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-semibold hover:bg-white/25" data-nav="my:reports">${ico('flask-round')}My reports</button></div></div>
      <div class="grid gap-4 md:grid-cols-3">
        <button type="button" class="${card} p-5 text-left transition hover:-translate-y-0.5" data-nav="my:appointments"><span class="grid h-10 w-10 place-items-center rounded-xl ${K.tone('teal')}">${ico('calendar-check')}</span><p class="mt-3 text-xs text-slate-500">Next appointment</p><p class="font-semibold">${next ? `Today ${next.time} · ${esc(next.doctor)}` : 'Nothing booked'}</p></button>
        <button type="button" class="${card} p-5 text-left transition hover:-translate-y-0.5" data-nav="my:reports"><span class="grid h-10 w-10 place-items-center rounded-xl ${K.tone('sky')}">${ico('flask-round')}</span><p class="mt-3 text-xs text-slate-500">Lab reports</p><p class="font-semibold">${labs.filter(l => l.status === 'released').length} ready · ${labs.filter(l => l.status !== 'released').length} in progress</p></button>
        <button type="button" class="${card} p-5 text-left transition hover:-translate-y-0.5" data-nav="my:bills"><span class="grid h-10 w-10 place-items-center rounded-xl ${K.tone(due.length ? 'rose' : 'emerald')}">${ico('receipt')}</span><p class="mt-3 text-xs text-slate-500">Bills</p><p class="font-semibold">${due.length ? inr(due.reduce((s, i) => s + i.total - i.paid, 0)) + ' to pay' : 'All paid'}</p></button></div>
      <div class="grid gap-5 lg:grid-cols-2">
        <div class="${card}">${cardHead('Current medicines', rx[0] ? `From ${rx[0].id} · ${esc(rx[0].doctor)}` : '')}<ul class="divide-y divide-slate-100 dark:divide-slate-800">${(rx[0] ? rx[0].items : []).map(i => `<li class="flex items-center gap-3 px-5 py-3"><span class="grid h-9 w-9 place-items-center rounded-xl ${K.tone('violet')}">${ico('pill')}</span><div class="flex-1 text-sm"><p class="font-medium">${esc(i.drug)}</p><p class="text-xs text-slate-500">${esc(i.freq)} · ${esc(i.dur)} · ${esc(i.note)}</p></div></li>`).join('') || '<li class="px-5 py-8 text-center text-sm text-slate-500">No active prescriptions.</li>'}</ul></div>
        <div class="${card}">${cardHead('Family on this account')}<ul class="divide-y divide-slate-100 dark:divide-slate-800">${[[p.name, 'You', p.mrn], ['Sunita Sharma', 'Mother', 'SUN-001402'], ['Aarav Sharma', 'Son', 'SUN-002010']].map(([n, r, m], i) => `<li class="flex items-center gap-3 px-5 py-3">${avatar(n, i ? 'amber' : 'teal')}<div class="flex-1 text-sm"><p class="font-medium">${esc(n)}</p><p class="text-xs text-slate-500">${r} · ${m}</p></div>${i ? btn('ghost', 'Switch', '', 'data-action="demo-only"', 'h-8 px-3') : badge('teal', 'Active')}</li>`).join('')}</ul></div></div></div>`;
  }
  on('pt-book', () => { const docs = T().doctors;
    modal({ title: 'Book an appointment', icon: 'calendar-plus', ok: 'Confirm booking', body: `<div class="grid gap-4 sm:grid-cols-2">${field('doc', 'Doctor', { opts: docs.map(x => [x.name, `${x.name} · ${x.spec} · ₹${x.fee}`]), full: true })}
      ${field('date', 'Date', { type: 'date', value: iso(addDays(new Date(), 1)) })}${field('time', 'Time', { opts: ['09:30', '10:00', '11:30', '15:00', '16:30'] })}${field('mode', 'Visit', { opts: ['In person', 'Video consult'] })}${field('why', 'Reason', { ph: 'Optional' })}</div>`,
      onSubmit: f => { const v = Object.fromEntries(new FormData(f).entries()); ui.myAppts = ui.myAppts || []; ui.myAppts.unshift({ id: 'A-W' + (100 + ui.myAppts.length), doctor: v.doc, date: v.date, time: v.time, mode: v.mode, status: 'confirmed' });
        toast('Appointment booked', `${v.doc} · ${fmtShort(v.date)} ${v.time} · WhatsApp confirmation sent`, 'teal', 'calendar-check'); if (H().state.active === 'my:appointments') rerender(); } }); });

  function renderMyAppts(c) {
    const p = PT(), today = T().appointments.filter(a => a.mrn === p.mrn).map(a => ({ id: a.id, doctor: a.doctor, date: todayISO(), time: a.time, mode: a.type === 'Teleconsult' ? 'Video consult' : 'In person', status: a.status, dept: a.dept }));
    const up = (ui.myAppts || []).concat(today.filter(a => a.status !== 'completed' && a.status !== 'cancelled'));
    const past = today.filter(a => a.status === 'completed').concat([{ id: 'A-0977', doctor: 'Dr. Arjun Rao', date: iso(addDays(new Date(), -30)), time: '10:00', mode: 'In person', status: 'completed', dept: 'Cardiology' }, { id: 'A-0712', doctor: 'Dr. Arjun Rao', date: iso(addDays(new Date(), -92)), time: '11:30', mode: 'In person', status: 'completed', dept: 'Cardiology' }]);
    const row = (a, upcoming) => `<li class="flex flex-wrap items-center gap-4 px-5 py-4"><div class="w-14 rounded-xl bg-slate-50 py-1.5 text-center dark:bg-slate-800"><p class="text-[11px] font-semibold uppercase text-slate-400">${new Date(a.date).toLocaleDateString('en-IN', { month: 'short' })}</p><p class="text-lg font-bold">${new Date(a.date).getDate()}</p></div>
      <div class="min-w-[160px] flex-1"><p class="font-semibold">${esc(a.doctor)}</p><p class="text-xs text-slate-500">${a.time} · ${esc(a.mode)}${a.dept ? ' · ' + esc(a.dept) : ''}</p></div>
      ${upcoming ? `${a.mode === 'Video consult' ? btn('primary', 'Join call', 'video', 'data-action="demo-only"', 'h-8 px-3') : ''}${btn('ghost', 'Reschedule', '', 'data-pg="pt-book"', 'h-8 px-3')}${btn('ghost', 'Cancel', '', `data-pg="pt-cancel" data-id="${a.id}"`, 'h-8 px-3')}` : btn('ghost', 'Prescription', 'file-text', 'data-nav="my:prescriptions"', 'h-8 px-3')}</li>`;
    c.innerHTML = `<div class="fade-in space-y-5"><div class="flex justify-end">${btn('primary', 'Book appointment', 'calendar-plus', 'data-pg="pt-book"')}</div>
      <div class="${card}">${cardHead('Upcoming')}${up.length ? `<ul class="divide-y divide-slate-100 dark:divide-slate-800">${up.map(a => row(a, true)).join('')}</ul>` : empty('calendar', 'No upcoming visits', 'Book a slot with any doctor.')}</div>
      <div class="${card}">${cardHead('Past visits')}<ul class="divide-y divide-slate-100 dark:divide-slate-800">${past.map(a => row(a, false)).join('')}</ul></div></div>`;
  }
  on('pt-cancel', el => H().confirmDialog({ title: 'Cancel this appointment?', text: 'The slot is released and the doctor is informed.', ok: 'Cancel appointment', icon: 'calendar-x', onOk: () => {
    const id = el.dataset.id; ui.myAppts = (ui.myAppts || []).filter(a => a.id !== id); const a = T().appointments.find(x => x.id === id); if (a) a.status = 'cancelled';
    toast('Appointment cancelled', '', 'rose', 'calendar-x'); H().refresh(false); } }));

  function renderMyRx(c) {
    const p = PT(), rx = D().prescriptions.filter(r => r.mrn === p.mrn).concat(ui.oldRx || (ui.oldRx = [{ id: 'RX-7311', patient: p.name, mrn: p.mrn, doctor: 'Dr. Arjun Rao', date: iso(addDays(new Date(), -30)), dx: 'Essential hypertension (I10)', status: 'dispensed', items: [{ drug: 'Amlodipine 5 mg', freq: '1-0-0', dur: '30 days', note: 'Morning' }] }]));
    c.innerHTML = `<div class="fade-in grid gap-4 md:grid-cols-2">${rx.map(r => `<article class="${card} p-5"><div class="flex items-start gap-3"><span class="grid h-10 w-10 place-items-center rounded-xl ${K.tone('sky')}">${ico('file-text')}</span>
      <div class="min-w-0 flex-1"><p class="font-semibold">${esc(r.dx)}</p><p class="text-xs text-slate-500">${fmtDate(r.date)} · ${esc(r.doctor)} · ${r.id}</p></div></div>
      ${window.PGRxScan.isScan(r) ? `<div class="mt-4 flex items-center gap-3 rounded-xl bg-violet-50/70 p-3 dark:bg-violet-500/10">${window.PGRxScan.stack(r, 'h-16 w-12')}<p class="text-sm text-slate-600 dark:text-slate-300">Photo of the doctor’s handwritten prescription · ${r.pages.length} page${r.pages.length > 1 ? 's' : ''}</p></div>` : ''}
      <ul class="mt-4 space-y-2">${r.items.map(i => `<li class="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">${ico('pill', 'h-4 w-4 text-violet-500')}<span class="flex-1 font-medium">${esc(i.drug)}</span><span class="text-xs text-slate-500">${esc(i.freq)} · ${esc(i.dur)}</span></li>`).join('')}</ul>
      <div class="mt-4 flex gap-2">${btn('ghost', 'View', 'eye', `data-pg="pt-rx" data-id="${r.id}"`, 'h-8 px-3')}${btn('ghost', 'Download', 'download', 'data-pg="dl" data-what="Prescription PDF"', 'h-8 px-3')}${btn('soft', 'Order refill', 'repeat', 'data-pg="pt-refill"', 'h-8 px-3')}</div></article>`).join('')}</div>`;
  }
  on('pt-rx', el => { const r = D().prescriptions.find(x => x.id === el.dataset.id) || ui.oldRx.find(x => x.id === el.dataset.id); if (window.PGRxScan.isScan(r)) return window.PGRxScan.openViewer(r.id); modal({ title: r.id, sub: r.dx, icon: 'file-text', size: 'max-w-xl', foot: false, body: window.PGCare.rxSheet(r) }); });
  on('pt-refill', () => toast('Refill requested', 'The pharmacy will message you when it’s ready for pickup', 'violet', 'repeat'));

  function renderMyReports(c) {
    const p = PT(), labs = D().labOrders.filter(l => l.mrn === p.mrn).concat(ui.oldLab || (ui.oldLab = [{ id: 'LAB-4980', test: 'HbA1c', section: 'Biochemistry', status: 'released', doctor: 'Dr. Arjun Rao', releasedAt: fmtShort(addDays(new Date(), -30)), patient: p.name, mrn: p.mrn }]));
    c.innerHTML = `<div class="fade-in ${card}">${!p.consent ? `<div class="p-5">${note('amber', 'file-warning', 'Accept the privacy notice to download reports.')}</div>` : ''}
      <ul class="divide-y divide-slate-100 dark:divide-slate-800">${labs.map(l => `<li class="flex flex-wrap items-center gap-4 px-5 py-4"><span class="grid h-10 w-10 place-items-center rounded-xl ${K.tone(l.status === 'released' ? 'emerald' : 'amber')}">${ico(l.status === 'released' ? 'file-check' : 'hourglass')}</span>
        <div class="min-w-[160px] flex-1"><p class="font-semibold">${esc(l.test)}</p><p class="text-xs text-slate-500">${l.id} · ${esc(l.doctor)}${l.releasedAt ? ' · ready ' + l.releasedAt : ''}</p></div>
        ${l.status === 'released' ? `${btn('ghost', 'View', 'eye', `data-pg="pt-lab" data-id="${l.id}"`, 'h-8 px-3')}${btn('primary', 'Download', 'download', 'data-pg="dl" data-what="Lab report PDF"', 'h-8 px-3')}` : badge('amber', 'In progress — we’ll message you', 'clock')}</li>`).join('')}</ul></div>`;
  }
  on('pt-lab', el => { const l = D().labOrders.find(x => x.id === el.dataset.id) || ui.oldLab.find(x => x.id === el.dataset.id), rows = l.results || D().LAB_RESULTS[l.test] || [];
    modal({ title: l.test, sub: `${l.id} · ${esc(l.doctor)}`, icon: 'flask-round', tone: 'emerald', foot: false, body: `<table class="w-full text-sm"><tbody class="divide-y divide-slate-100 dark:divide-slate-800">${rows.map(([n, v, u, ref]) => { const fl = window.PGCare.flagOf(String(v), ref); return `<tr><td class="py-2">${esc(n)}</td><td class="py-2 font-semibold ${fl ? 'text-rose-600' : ''}">${esc(v)} ${esc(u)}</td><td class="py-2 text-right text-xs text-slate-500">Normal: ${esc(ref)}</td></tr>`; }).join('')}</tbody></table>
      <div class="mt-4">${note('sky', 'stethoscope', 'Values in red are outside the normal range. Your doctor has been sent this report.')}</div>` }); });

  function renderMyBills(c) {
    const p = PT(), inv = D().invoices.filter(i => i.mrn === p.mrn).concat(ui.oldInv || (ui.oldInv = [{ id: 'INV-19877', patient: p.name, mrn: p.mrn, date: iso(addDays(new Date(), -30)), items: [{ desc: 'Consultation', qty: 1, rate: 900 }, { desc: 'ECG', qty: 1, rate: 400 }], total: 1300, paid: 1300, mode: 'UPI', status: 'paid', payer: 'Self' }]));
    const due = inv.filter(i => i.status !== 'paid' && i.status !== 'refunded');
    c.innerHTML = `<div class="fade-in space-y-5">
      ${due.length ? `<div class="flex flex-wrap items-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-500/20 dark:bg-rose-500/10"><span class="grid h-11 w-11 place-items-center rounded-xl bg-rose-600 text-white">${ico('receipt')}</span><div class="flex-1"><p class="font-semibold">${inr(due.reduce((s, i) => s + i.total - i.paid, 0))} due</p><p class="text-sm text-slate-600 dark:text-slate-300">${due.length} unpaid bill${due.length > 1 ? 's' : ''}</p></div>${btn('primary', 'Pay all', 'indian-rupee', `data-pg="dues-pay" data-mrn="${p.mrn}"`)}</div>` : note('sky', 'circle-check', 'You have no unpaid bills.')}
      <div class="${card}"><ul class="divide-y divide-slate-100 dark:divide-slate-800">${inv.map(i => `<li class="flex flex-wrap items-center gap-4 px-5 py-4"><span class="grid h-10 w-10 place-items-center rounded-xl ${K.tone(i.status === 'paid' ? 'emerald' : 'rose')}">${ico(i.kind === 'pharmacy' ? 'pill' : 'receipt')}</span>
        <div class="min-w-[160px] flex-1"><p class="font-semibold">${i.id} ${i.kind === 'pharmacy' ? badge('emerald', 'Pharmacy') : ''}</p><p class="text-xs text-slate-500">${fmtDate(i.date)} · ${i.items.map(x => esc(x.desc)).join(', ')}</p></div><p class="font-semibold tabular-nums">${inr(i.total)}</p>
        ${i.status === 'paid' ? badge('emerald', 'Paid · ' + i.mode) : badge('rose', 'Unpaid')}${btn('ghost', i.status === 'paid' ? 'Receipt' : 'View', i.status === 'paid' ? 'receipt' : 'eye', `data-pg="inv-view" data-id="${i.id}"`, 'h-8 px-3')}${i.status === 'paid' ? '' : btn('primary', 'Pay ' + inr(i.total - i.paid), '', `data-pg="dues-pay" data-mrn="${p.mrn}" data-only="${i.id}"`, 'h-8 px-3')}</li>`).join('')}</ul></div></div>`;
  }
  on('pt-pay', el => { const i = D().invoices.find(x => x.id === el.dataset.id), due = i.total - i.paid;
    modal({ title: `Pay ${inr(due)}`, sub: i.id, icon: 'indian-rupee', tone: 'emerald', ok: 'Pay securely', body: `<div class="grid grid-cols-3 gap-2">${['UPI', 'Card', 'Net banking'].map((m, n) => `<label class="cursor-pointer"><input type="radio" name="mode" value="${m}" class="peer sr-only" ${n ? '' : 'checked'}/><span class="block rounded-xl border border-slate-200 py-3 text-center text-sm font-medium peer-checked:border-teal-600 peer-checked:bg-teal-50 peer-checked:text-teal-700 dark:border-slate-700 dark:peer-checked:bg-teal-500/10 dark:peer-checked:text-teal-300">${m}</span></label>`).join('')}</div>
      <p class="mt-4 text-xs text-slate-500">${ico('lock', 'inline h-3 w-3')} Payments go through the hospital’s payment gateway. Card details never touch HMS.</p>`,
      onSubmit: f => { i.paid = i.total; i.status = 'paid'; i.mode = f.elements.mode.value; H().bumpStat('revenue', due); toast('Payment successful', `${inr(due)} · receipt sent on WhatsApp`, 'emerald', 'circle-check'); rerender(); } }); });

  K.register({
    attendance: { title: 'Attendance', render: renderAttendance },
    leave:      { title: 'Leave Requests', render: renderLeave },
    payroll:    { title: 'Payroll', render: renderPayroll },
    shifts:     { title: 'Shift Management', render: renderShifts },
    'me:attendance': { title: 'My Attendance', sub: 'Check in and out, and see your month at a glance.', render: renderMyAttendance },
    'me:leave':      { title: 'My Leave', sub: 'Balances and requests.', render: renderMyLeave },
    'me:payslips':   { title: 'My Payslips', sub: 'Monthly payslips and tax documents.', render: renderMyPayslips },
    'dashboard:overview': { title: 'Home', render: renderPortalHome },   // only reached by patients; staff get the built-in dashboard
    'my:appointments':  { title: 'My Appointments', sub: 'Upcoming and past visits.', render: renderMyAppts },
    'my:prescriptions': { title: 'Prescriptions', sub: 'Every prescription from your visits.', render: renderMyRx },
    'my:reports':       { title: 'Lab Reports', sub: 'Download verified reports.', render: renderMyReports },
    'my:bills':         { title: 'Bills & Payments', sub: 'Pay online and download receipts.', render: renderMyBills },
  });
})();
