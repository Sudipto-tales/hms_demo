/* HMS demo — Care pages: patients, appointments, doctor schedules, departments,
 * consultations (EMR), prescriptions, laboratory, radiology, pharmacy, clinical overview. */
(() => {
  'use strict';
  const K = window.PG;
  const { esc, inr, T, D, can, me, card, badge, avatar, ico, tile, tiles, btn, iconBtn, seg, search, select, toolbar, cardHead,
    table, td, td0, person, empty, bar, dl, note, field, readForm, modal, closeModal, on, onChange, rerender, chart, ui,
    iso, todayISO, addDays, fmtDate, fmtShort, nowTime, audit, who } = K;
  const H = () => window.HMS;
  const toast = (...a) => H().toast(...a);
  const branchName = i => (T().branches[i] || T().branches[0]).split(' · ')[0];
  const isDoctor = () => H().state.role === 'doctor';
  const myName = () => me().person;
  const AST = { confirmed: ['teal', 'Confirmed'], 'checked-in': ['sky', 'Checked in'], pending: ['amber', 'Pending'], completed: ['emerald', 'Completed'], cancelled: ['rose', 'Cancelled'], 'no-show': ['slate', 'No-show'], 'with-doctor': ['violet', 'With doctor'] };
  const apptBadge = s => badge(...(AST[s] || ['slate', s]));
  const DEPT_TONE = { Cardiology: 'rose', Pediatrics: 'sky', Orthopedics: 'amber', Dermatology: 'violet', 'General Medicine': 'teal', ENT: 'sky', Gynecology: 'rose' };
  const docTone = name => DEPT_TONE[(T().employees.find(e => e.name === name) || {}).dept] || 'teal';

  /* ======================= Clinical overview ======================= */
  function renderClinical(c) {
    const d = D(), enc = d.encounters, open = enc.filter(e => e.state !== 'signed');
    const pendLab = d.labOrders.filter(l => l.status !== 'released'), crit = d.labOrders.filter(l => l.critical && l.status !== 'released').length + d.radiology.filter(r => r.critical).length;
    const depts = [...new Set(enc.map(e => e.dept))];
    const dx = [['I10', 'Essential hypertension', 42], ['E11', 'Type 2 diabetes', 35], ['J06.9', 'Upper respiratory infection', 31], ['A09', 'Gastroenteritis', 22], ['M54.5', 'Low back pain', 18], ['L23.9', 'Allergic dermatitis', 12]];
    c.innerHTML = `<div class="fade-in space-y-5">
      ${tiles([tile('clipboard-list', 'teal', 'Open encounters', open.length), tile('flask-round', 'sky', 'Pending lab orders', pendLab.length),
        tile('scan-line', 'violet', 'Imaging awaiting report', d.radiology.filter(r => r.status !== 'reported').length), tile('triangle-alert', 'rose', 'Critical results to review', crit)])}
      <div class="grid gap-5 lg:grid-cols-3">
        <div class="${card} lg:col-span-2">${cardHead('Encounters by department', 'Today · open vs signed')}
          <div class="h-72 p-4"><canvas id="pgClinChart"></canvas></div></div>
        <div class="${card}">${cardHead('Top diagnoses', 'ICD-10 · this month')}
          <ul class="space-y-3 p-5">${dx.map(([code, l, n]) => `<li><div class="mb-1 flex items-center justify-between gap-2 text-sm"><span class="truncate"><span class="font-mono text-xs text-slate-400">${code}</span> ${esc(l)}</span><span class="font-semibold tabular-nums">${n}</span></div>${bar(n / dx[0][2] * 100, 'teal')}</li>`).join('')}</ul></div>
      </div>
      <div class="grid gap-5 lg:grid-cols-2">
        <div class="${card}">${cardHead('Critical results', 'Need a doctor to acknowledge', btn('ghost', 'Open lab', 'arrow-right', 'data-nav="laboratory"', 'h-8 px-3'))}
          <ul class="divide-y divide-slate-100 dark:divide-slate-800">${d.labOrders.filter(l => l.critical).map(l => `<li class="flex items-center gap-3 px-5 py-3">
            <span class="grid h-9 w-9 place-items-center rounded-xl ${K.tone('rose')}">${ico('flask-round')}</span>
            <div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">${esc(l.patient)} · ${esc(l.test)}</p><p class="text-xs text-slate-500">${esc(l.doctor)} · ${l.status === 'released' ? 'released' : 'in ' + l.status}</p></div>
            ${l.ack ? badge('emerald', 'Acknowledged', 'check') : btn('soft', 'Acknowledge', '', `data-pg="clin-ack" data-id="${l.id}"`, 'h-8 px-3')}</li>`).join('')}
            ${d.radiology.filter(r => r.critical).map(r => `<li class="flex items-center gap-3 px-5 py-3"><span class="grid h-9 w-9 place-items-center rounded-xl ${K.tone('rose')}">${ico('scan-line')}</span>
            <div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">${esc(r.patient)} · ${esc(r.modality)} ${esc(r.part)}</p><p class="truncate text-xs text-slate-500">${esc(r.finding)}</p></div></li>`).join('')}</ul></div>
        <div class="${card}">${cardHead('Waiting for the doctor', 'Checked-in or booked, not yet seen')}
          <ul class="divide-y divide-slate-100 dark:divide-slate-800">${open.map(e => `<li class="flex items-center gap-3 px-5 py-3">${avatar(e.patient, docTone(e.doctor))}
            <div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">${esc(e.patient)} <span class="text-xs font-normal text-slate-400">${esc(e.time)}</span></p><p class="truncate text-xs text-slate-500">${esc(e.doctor)} · ${esc(e.complaint || 'No complaint recorded')}</p></div>
            ${e.state === 'in-progress' ? badge('sky', 'In progress') : badge('amber', 'Waiting')}</li>`).join('') || '<li class="px-5 py-8 text-center text-sm text-slate-500">Everyone has been seen.</li>'}</ul></div>
      </div></div>`;
    chart(document.getElementById('pgClinChart'), { type: 'bar', data: { labels: depts, datasets: [
      { label: 'Open', data: depts.map(x => enc.filter(e => e.dept === x && e.state !== 'signed').length), backgroundColor: '#0d9488', borderRadius: 6, maxBarThickness: 34 },
      { label: 'Signed', data: depts.map(x => enc.filter(e => e.dept === x && e.state === 'signed').length), backgroundColor: '#94a3b8', borderRadius: 6, maxBarThickness: 34 }] },
      options: { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } } }, scales: { y: { ticks: { precision: 0 } } } } });
  }
  on('clin-ack', el => { const l = D().labOrders.find(x => x.id === el.dataset.id); l.ack = true; audit('check', 'emerald', `<b>${who()}</b> acknowledged critical result ${l.id}`); toast('Critical result acknowledged', `${l.patient} · ${l.test}`, 'emerald', 'check'); rerender(); });

  /* ======================= Patients ======================= */
  function renderPatients(c) {
    const d = D(), q = (ui.pq || '').toLowerCase(), f = ui.pf || 'all';
    const list = d.patients.filter(p => !q || (p.name + p.mrn + p.phone).toLowerCase().includes(q))
      .filter(p => f === 'all' || (f === 'insured' ? p.insurance : f === 'noconsent' ? !p.consent : f === 'b1' ? p.branch === 1 : true))
      .sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
    c.innerHTML = `<div class="fade-in space-y-5">
      ${tiles([tile('users', 'teal', 'Registered patients', T().stats.patients.toLocaleString('en-IN')), tile('user-plus', 'sky', 'New this month', Math.round(T().stats.patients * .034)),
        tile('shield-check', 'emerald', 'Insured (in list)', d.patients.filter(p => p.insurance).length), tile('file-warning', 'amber', 'Consent missing', d.patients.filter(p => !p.consent).length)])}
      <div class="${card}">${toolbar(`${search('pq', ui.pq || '', 'Search name, MRN or phone')}
        ${select('pf', [['all', 'All patients'], ['insured', 'Has insurance'], ['noconsent', 'Consent missing'], ...(T().branches[1] ? [['b1', 'Visited ' + branchName(1)]] : [])], f, 'Filter')}
        <span class="flex-1"></span>${can('patient:create') ? btn('primary', 'Register patient', 'user-plus', 'data-nav="patients:new"') : ''}`)}
        ${table(['Patient', 'Age · Sex', 'Phone', 'Last visit', 'Doctor', 'Insurance', ''], list.map(p => `<tr class="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40 ${ui.flash === p.mrn ? 'row-flash' : ''}" data-pg="patient" data-id="${p.mrn}">
          ${td0(person(p.name, `<span class="font-mono">${p.mrn}</span>`, p.gender === 'F' ? 'rose' : 'sky'))}${td(`${p.age} · ${p.gender}`)}${td(`<span class="font-mono text-xs">•••• ${p.phone.slice(-4)}</span>`)}
          ${td(fmtShort(p.lastVisit) + `<span class="block text-xs text-slate-400">${p.visits} visit${p.visits > 1 ? 's' : ''} · ${branchName(p.branch)}</span>`)}${td(esc(p.doctor || '—'))}
          ${td(p.insurance ? badge('emerald', p.insurance, 'shield-check') : '<span class="text-xs text-slate-400">Self-pay</span>')}
          ${td(`${!p.consent ? badge('amber', 'No consent', 'file-warning') : ''}`, 'text-right pr-5')}</tr>`).join(''), { empty: 'No patients match.' })}
        <div class="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800">Showing ${list.length} recent patients. Phone numbers are masked; opening a record is written to the audit log.</div>
      </div></div>`;
    ui.flash = null;
  }
  on('patient', el => openPatient(el.dataset.id));
  function openPatient(mrn, tab) {
    const d = D(), p = d.patients.find(x => x.mrn === mrn); if (!p) return;
    ui.ptab = tab || ui.ptab || 'overview';
    const visits = T().appointments.filter(a => a.mrn === mrn), rx = d.prescriptions.filter(r => r.mrn === mrn), labs = d.labOrders.filter(l => l.mrn === mrn), inv = d.invoices.filter(i => i.mrn === mrn);
    const tabs = [['overview', 'Overview'], ['visits', 'Visits', visits.length + rx.length], ['labs', 'Lab', labs.length], ['bills', 'Bills', inv.length]];
    const bodies = {
      overview: `${!p.consent ? note('amber', 'file-warning', '<b>DPDP consent not captured.</b> Ask the patient to accept the data-processing notice before sharing reports.') + '<div class="h-4"></div>' : ''}
        ${dl([['MRN', `<span class="font-mono">${p.mrn}</span>`], ['Age / Sex', `${p.age} / ${p.gender === 'F' ? 'Female' : 'Male'}`], ['Blood group', p.blood], ['Phone', '•••• ' + p.phone.slice(-4)],
          ['Registered', fmtDate(p.registered)], ['Home branch', branchName(p.branch)], ['Insurance', p.insurance || 'Self-pay'], ['Allergies', p.allergies ? `<span class="text-rose-600">${esc(p.allergies)}</span>` : 'None known']])}`,
      visits: (visits.map(a => `<li class="flex items-center gap-3 py-2.5"><span class="grid h-8 w-8 place-items-center rounded-lg ${K.tone('teal')}">${ico('calendar-check')}</span><div class="flex-1 text-sm"><p class="font-medium">${esc(a.dept)} · ${esc(a.type)}</p><p class="text-xs text-slate-500">Today ${a.time} · ${esc(a.doctor)}</p></div>${apptBadge(a.status)}</li>`).join('') +
        rx.map(r => `<li class="flex items-center gap-3 py-2.5"><span class="grid h-8 w-8 place-items-center rounded-lg ${K.tone('sky')}">${ico('file-text')}</span><div class="flex-1 text-sm"><p class="font-medium">${esc(r.dx)}</p><p class="text-xs text-slate-500">${fmtShort(r.date)} · ${esc(r.doctor)} · ${r.items.length} medicines</p></div><span class="font-mono text-xs text-slate-400">${r.id}</span></li>`).join('')) || '<li class="py-6 text-center text-sm text-slate-500">No visits in this branch yet.</li>',
      labs: labs.map(l => `<li class="flex items-center gap-3 py-2.5"><span class="grid h-8 w-8 place-items-center rounded-lg ${K.tone('violet')}">${ico('flask-round')}</span><div class="flex-1 text-sm"><p class="font-medium">${esc(l.test)}</p><p class="text-xs text-slate-500">${l.id} · ${esc(l.doctor)}</p></div>${labBadge(l.status)}</li>`).join('') || '<li class="py-6 text-center text-sm text-slate-500">No lab orders.</li>',
      bills: inv.map(i => `<li class="flex items-center gap-3 py-2.5"><span class="grid h-8 w-8 place-items-center rounded-lg ${K.tone('amber')}">${ico('receipt')}</span><div class="flex-1 text-sm"><p class="font-medium">${i.id}</p><p class="text-xs text-slate-500">${fmtShort(i.date)} · ${i.items.map(x => x.desc).join(', ')}</p></div><span class="text-sm font-semibold tabular-nums">${inr(i.total)}</span></li>`).join('') || '<li class="py-6 text-center text-sm text-slate-500">No bills.</li>',
    };
    modal({ title: p.name, sub: `${p.mrn} · ${p.age} yrs · ${p.gender === 'F' ? 'Female' : 'Male'}`, icon: 'user', tone: p.gender === 'F' ? 'rose' : 'sky', size: 'max-w-2xl',
      body: `<div class="mb-4">${seg('ptab', tabs, ui.ptab).replace(/data-pg="seg"/g, 'data-pg="ptab"')}</div>${ui.ptab === 'overview' ? bodies.overview : `<ul class="divide-y divide-slate-100 dark:divide-slate-800">${bodies[ui.ptab]}</ul>`}`,
      foot: `${can('appointment:create') ? btn('ghost', 'Book appointment', 'calendar-plus', 'data-action="new-appointment" data-close-modal') : ''}
        ${can('invoice:create') ? btn('ghost', 'New invoice', 'receipt', `data-pg="inv-new" data-mrn="${p.mrn}"`) : ''}
        ${can('encounter:write') ? btn('primary', 'Open EMR', 'clipboard-list', 'data-nav="consultations" data-close-modal') : ''}` });
    ui.ptabFor = mrn;
    audit('eye', 'slate', `<b>${who()}</b> opened patient record ${esc(p.name)} (${p.mrn})`);
  }
  on('ptab', el => { ui.ptab = el.dataset.val; openPatient(ui.ptabFor, ui.ptab); });

  function renderRegister(c) {
    const r = ui.reg || (ui.reg = {});
    c.innerHTML = `<form id="pgRegForm" class="fade-in grid gap-5 lg:grid-cols-3" novalidate>
      <div class="space-y-5 lg:col-span-2">
        <section class="${card} p-5"><h3 class="mb-1 font-semibold">Identity</h3><p class="mb-4 text-xs text-slate-500">One record per patient across all ${esc(T().name)} branches. MRN is issued on save.</p>
          <div class="grid gap-4 sm:grid-cols-2">${field('name', 'Full name', { req: true, ph: 'As on ID proof', value: r.name })}${field('phone', 'Mobile number', { req: true, type: 'tel', ph: '10-digit mobile', value: r.phone, help: 'Used for OTP login to the patient portal' })}
            ${field('dob', 'Date of birth', { type: 'date', value: r.dob })}${field('gender', 'Sex', { opts: [['', 'Select'], ['F', 'Female'], ['M', 'Male'], ['O', 'Other']], value: r.gender, req: true })}
            ${field('blood', 'Blood group', { opts: ['Unknown', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'], value: r.blood })}${field('idtype', 'ID proof', { opts: ['Aadhaar', 'ABHA (Health ID)', 'Voter ID', 'Passport', 'None'], value: r.idtype })}
            ${field('address', 'Address', { full: true, ph: 'House, street, area, city, PIN', value: r.address })}</div></section>
        <section class="${card} p-5"><h3 class="mb-4 font-semibold">Emergency contact & medical</h3>
          <div class="grid gap-4 sm:grid-cols-2">${field('kin', 'Next of kin', { ph: 'Name', value: r.kin })}${field('kinphone', 'Their phone', { type: 'tel', value: r.kinphone })}
            ${field('allergies', 'Known allergies', { ph: 'e.g. Penicillin', value: r.allergies })}${field('chronic', 'Chronic conditions', { ph: 'e.g. Diabetes, Hypertension', value: r.chronic })}</div></section>
        <section class="${card} p-5"><h3 class="mb-4 font-semibold">Insurance <span class="text-xs font-normal text-slate-400">optional</span></h3>
          <div class="grid gap-4 sm:grid-cols-2">${field('payer', 'Payer', { opts: ['Self-pay', 'Star Health', 'HDFC Ergo', 'Niva Bupa', 'PM-JAY', 'CGHS'], value: r.payer })}${field('policy', 'Policy / card number', { mono: true, value: r.policy })}</div></section>
      </div>
      <div class="space-y-5">
        <section class="${card} p-5"><h3 class="mb-3 font-semibold">Consent (DPDP Act)</h3>
          <p class="mb-3 text-[13px] text-slate-500 dark:text-slate-400">${esc(T().name)} is the data fiduciary. The patient must agree to the notice before records are created or shared.</p>
          <label class="mb-2 flex items-start gap-2 text-sm"><input type="checkbox" name="consent" class="mt-0.5 h-4 w-4 accent-teal-600" ${r.consent ? 'checked' : ''}/> Patient has read and accepted the privacy notice</label>
          <label class="mb-2 flex items-start gap-2 text-sm"><input type="checkbox" name="share" class="mt-0.5 h-4 w-4 accent-teal-600" checked/> Send reports & bills on WhatsApp</label>
          <label class="flex items-start gap-2 text-sm"><input type="checkbox" name="mkt" class="mt-0.5 h-4 w-4 accent-teal-600"/> Health camp & offer messages</label>
          <span id="pgConsentErr" class="mt-2 hidden text-xs text-rose-600">Consent is needed to register.</span></section>
        <section class="${card} p-5"><h3 class="mb-3 font-semibold">After saving</h3>
          <label class="mb-2 flex items-center gap-2 text-sm"><input type="radio" name="next" value="book" class="h-4 w-4 accent-teal-600" checked/> Book an appointment</label>
          <label class="mb-2 flex items-center gap-2 text-sm"><input type="radio" name="next" value="list" class="h-4 w-4 accent-teal-600"/> Back to patient list</label>
          <label class="flex items-center gap-2 text-sm"><input type="radio" name="next" value="another" class="h-4 w-4 accent-teal-600"/> Register another</label></section>
        <div id="pgDup"></div>
        <div class="flex gap-2">${btn('ghost', 'Cancel', '', 'data-nav="patients:list"', 'h-10 px-4 flex-1')}<button type="submit" class="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700">${ico('check')}Register</button></div>
      </div></form>`;
    const form = document.getElementById('pgRegForm');
    form.addEventListener('input', e => { r[e.target.name] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; if (e.target.name === 'phone') dupCheck(e.target.value); });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = readForm(form, ['name', 'phone', 'gender']); if (!v) return;
      if (!/^\d{10}$/.test(v.phone.replace(/\D/g, ''))) { form.elements.phone.classList.add('invalid'); const er = form.elements.phone.parentElement.querySelector('.err'); er.textContent = 'Enter a 10-digit mobile number'; er.classList.remove('hidden'); return; }
      if (!form.elements.consent.checked) { document.getElementById('pgConsentErr').classList.remove('hidden'); return; }
      const d = D(), pre = T().slug === 'sun' ? 'SUN-00' : 'MOON-0', mrn = pre + (2300 + d.patients.length);
      const age = v.dob ? Math.max(0, new Date().getFullYear() - new Date(v.dob).getFullYear()) : 30;
      d.patients.unshift({ mrn, name: v.name.trim(), gender: v.gender === 'F' ? 'F' : 'M', age, phone: v.phone.replace(/\D/g, ''), blood: v.blood === 'Unknown' ? '—' : v.blood, branch: H().state.branch,
        lastVisit: todayISO(), visits: 1, insurance: v.payer === 'Self-pay' ? '' : v.payer, doctor: '', consent: true, allergies: v.allergies, registered: todayISO() });
      T().stats.patients++; audit('user-plus', 'teal', `<b>${who()}</b> registered patient ${esc(v.name)} (${mrn})`);
      toast('Patient registered', `${v.name} · MRN ${mrn}`, 'teal', 'user-check');
      ui.reg = {}; ui.flash = mrn;
      if (v.next === 'book') { H().navigate('patients:list'); setTimeout(() => document.querySelector('[data-action="new-appointment"]')?.click(), 250); }
      else if (v.next === 'list') H().navigate('patients:list'); else rerender();
    });
  }
  function dupCheck(phone) {
    const box = document.getElementById('pgDup'); if (!box) return;
    const m = D().patients.find(p => p.phone.slice(-6) === phone.replace(/\D/g, '').slice(-6) && phone.replace(/\D/g, '').length >= 6);
    box.innerHTML = m ? note('amber', 'users', `Possible duplicate: <b>${esc(m.name)}</b> (${m.mrn}) has a similar number. <button type="button" class="font-semibold underline" data-pg="patient" data-id="${m.mrn}">Open record</button>`) : '';
    H().icons();
  }

  /* ======================= Appointments: calendar ======================= */
  function weekAppts(dayIdx) {
    // today = real data; other days = deterministic sample derived from today's list
    const base = T().appointments;
    if (dayIdx === 0) return base;
    const n = (Math.abs(dayIdx) * 3 + 2) % base.length + 2;
    return base.slice(0, n).map((a, i) => ({ ...a, id: a.id + '-' + dayIdx, time: ['09:00', '09:30', '10:30', '11:00', '12:00', '14:30', '15:30', '16:00', '17:00'][(i + Math.abs(dayIdx)) % 9],
      status: dayIdx < 0 ? (i % 6 === 5 ? 'cancelled' : 'completed') : (i % 3 ? 'confirmed' : 'pending'), sample: true }));
  }
  function renderCalendar(c) {
    const view = ui.cview || 'week', doc = ui.cdoc || 'all', off = ui.coff || 0;
    const today = new Date(), monday = addDays(today, -((today.getDay() + 6) % 7) + off * 7);
    const days = view === 'week' ? Array.from({ length: 6 }, (_, i) => addDays(monday, i)) : [addDays(today, off)];
    const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    const docs = T().doctors;
    const col = d => { const di = Math.round((new Date(iso(d)) - new Date(todayISO())) / 864e5);
      return weekAppts(di).filter(a => doc === 'all' || a.doctor === doc); };
    const range = view === 'week' ? `${fmtShort(days[0])} – ${fmtDate(days[5])}` : fmtDate(days[0], { weekday: 'long', day: 'numeric', month: 'long' });
    c.innerHTML = `<div class="fade-in ${card}">
      ${toolbar(`<div class="flex items-center gap-1">${iconBtn('chevron-left', 'Previous', 'data-pg="cal-nav" data-d="-1"')}${btn('ghost', 'Today', '', 'data-pg="cal-nav" data-d="0"', 'h-8 px-3')}${iconBtn('chevron-right', 'Next', 'data-pg="cal-nav" data-d="1"')}</div>
        <p class="font-semibold">${range}</p><span class="flex-1"></span>
        ${select('cdoc', [['all', 'All doctors'], ...docs.map(d => [d.name, d.name])], doc, 'Doctor')}${seg('cview', [['day', 'Day'], ['week', 'Week']], view)}
        ${can('appointment:create') ? btn('primary', 'New', 'plus', 'data-action="new-appointment"') : ''}`)}
      <div class="overflow-x-auto thin-scroll"><div class="grid" style="min-width:${view === 'week' ? 860 : 420}px;grid-template-columns:56px repeat(${days.length},minmax(0,1fr))">
        <div></div>${days.map(d => { const isT = iso(d) === todayISO(); return `<div class="border-b border-l border-slate-100 px-2 py-2.5 text-center dark:border-slate-800">
          <p class="text-[11px] font-semibold uppercase tracking-wider ${isT ? 'text-teal-600' : 'text-slate-400'}">${d.toLocaleDateString('en-IN', { weekday: 'short' })}</p>
          <p class="mx-auto mt-0.5 grid h-7 w-7 place-items-center rounded-full text-sm font-bold ${isT ? 'bg-teal-600 text-white' : ''}">${d.getDate()}</p>
          <p class="text-[11px] text-slate-400">${col(d).filter(a => a.status !== 'cancelled').length} booked</p></div>`; }).join('')}
        ${hours.map(h => `<div class="border-b border-slate-100 pr-2 pt-1 text-right text-[11px] text-slate-400 dark:border-slate-800">${h}:00</div>
          ${days.map(d => { const items = col(d).filter(a => +a.time.slice(0, 2) === h);
            return `<div class="min-h-[64px] space-y-1 border-b border-l border-slate-100 p-1 dark:border-slate-800 ${h === 13 ? 'bg-slate-50/70 dark:bg-slate-800/30' : ''}">${h === 13 && !items.length ? '<p class="pt-4 text-center text-[11px] text-slate-400">Lunch</p>' : ''}
              ${items.map(a => { const t = docTone(a.doctor); return `<button type="button" class="block w-full rounded-lg border-l-4 px-2 py-1 text-left text-xs transition hover:brightness-95 ${a.status === 'cancelled' ? 'border-rose-400 bg-rose-50 text-rose-700 line-through opacity-70 dark:bg-rose-500/10 dark:text-rose-300' : `border-${t}-500 ${K.tone(t)}`}" ${a.sample ? 'data-pg="cal-sample"' : `data-appt="${a.id}"`}>
                <span class="font-semibold">${a.time}</span> ${esc(a.patient)}<span class="block truncate opacity-75">${esc(a.doctor.replace('Dr. ', 'Dr '))} · ${esc(a.type)}</span></button>`; }).join('')}</div>`; }).join('')}`).join('')}
      </div></div>
      <div class="flex flex-wrap gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800">${[...new Set(docs.map(d => d.dept))].map(dp => `<span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-${DEPT_TONE[dp] || 'teal'}-500"></span>${esc(dp)}</span>`).join('')}<span class="flex-1"></span><span>Click an appointment for details</span></div>
    </div>`;
  }
  on('cal-nav', el => { const d = +el.dataset.d; ui.coff = d === 0 ? 0 : (ui.coff || 0) + d; rerender(); });
  on('cal-sample', () => toast('Sample appointment', 'Only today’s appointments are live in the demo.', 'slate', 'info'));

  /* ======================= Appointments: OPD queue ======================= */
  function renderQueue(c) {
    const A = T().appointments, docSel = ui.qdoc || (isDoctor() ? myName() : 'all');
    const list = A.filter(a => docSel === 'all' || a.doctor === docSel).sort((a, b) => a.time.localeCompare(b.time));
    list.forEach((a, i) => { a.token = a.token || i + 1; });
    const cols = [
      ['Booked', 'calendar-clock', 'amber', list.filter(a => a.status === 'pending' || a.status === 'confirmed')],
      ['Waiting (checked in)', 'armchair', 'sky', list.filter(a => a.status === 'checked-in')],
      ['With doctor', 'stethoscope', 'violet', list.filter(a => a.status === 'with-doctor')],
      ['Done', 'circle-check', 'emerald', list.filter(a => a.status === 'completed' || a.status === 'cancelled' || a.status === 'no-show')],
    ];
    const nowServing = list.find(a => a.status === 'with-doctor');
    const qcard = a => {
      const acts = a.status === 'pending' || a.status === 'confirmed' ? `${btn('soft', 'Check in', 'log-in', `data-pg="q" data-do="checkin" data-id="${a.id}"`, 'h-8 px-2.5')}${iconBtn('user-x', 'Mark no-show', `data-pg="q" data-do="noshow" data-id="${a.id}"`)}`
        : a.status === 'checked-in' ? btn('primary', 'Call in', 'megaphone', `data-pg="q" data-do="call" data-id="${a.id}"`, 'h-8 px-2.5')
        : a.status === 'with-doctor' ? btn('primary', 'Complete', 'check', `data-pg="q" data-do="done" data-id="${a.id}"`, 'h-8 px-2.5') : apptBadge(a.status);
      return `<li class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 ${ui.qflash === a.id ? 'row-flash' : ''}">
        <div class="flex items-start gap-3"><span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-900 text-sm font-bold text-white dark:bg-slate-700">${String(a.token).padStart(2, '0')}</span>
          <div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold">${esc(a.patient)}</p><p class="truncate text-xs text-slate-500">${a.time} · ${esc(a.type)} · <span class="font-mono">${a.mrn}</span></p>
          <p class="truncate text-xs text-slate-400">${esc(a.doctor)}</p></div>${iconBtn('info', 'Details', `data-appt="${a.id}"`)}</div>
        <div class="mt-2.5 flex items-center justify-end gap-1.5">${acts}</div></li>`;
    };
    c.innerHTML = `<div class="fade-in space-y-5">
      <div class="flex flex-wrap items-center gap-3 ${card} p-4">
        <span class="grid h-12 w-12 place-items-center rounded-2xl bg-violet-600 text-lg font-bold text-white">${nowServing ? String(nowServing.token).padStart(2, '0') : '—'}</span>
        <div class="min-w-0 flex-1"><p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Now serving</p><p class="font-semibold">${nowServing ? `${esc(nowServing.patient)} → ${esc(nowServing.doctor)}` : 'Nobody is with a doctor'}</p></div>
        ${select('qdoc', [['all', 'All doctors'], ...T().doctors.map(d => [d.name, `${d.name} · ${d.spec}`])], docSel, 'Doctor')}
        ${btn('ghost', 'TV display', 'monitor', 'data-pg="q-tv"')}${btn('primary', 'Call next', 'megaphone', 'data-pg="q" data-do="next"')}</div>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">${cols.map(([t, i, tn, items]) => `<section class="rounded-2xl bg-slate-100/70 p-3 dark:bg-slate-800/40">
        <h3 class="mb-3 flex items-center gap-2 px-1 text-sm font-semibold"><span class="grid h-7 w-7 place-items-center rounded-lg ${K.tone(tn)}">${ico(i, 'h-3.5 w-3.5')}</span>${t}<span class="ml-auto rounded-full bg-white px-2 text-xs dark:bg-slate-900">${items.length}</span></h3>
        <ul class="space-y-2.5">${items.map(qcard).join('') || '<li class="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400 dark:border-slate-700">Empty</li>'}</ul></section>`).join('')}</div>
    </div>`;
    ui.qflash = null;
  }
  on('q', el => {
    const A = T().appointments, docSel = ui.qdoc || (isDoctor() ? myName() : 'all');
    let a = A.find(x => x.id === el.dataset.id);
    const act = el.dataset.do;
    if (act === 'next') {
      a = A.filter(x => x.status === 'checked-in' && (docSel === 'all' || x.doctor === docSel)).sort((x, y) => x.time.localeCompare(y.time))[0];
      if (!a) return toast('Queue empty', 'No checked-in patients waiting.', 'slate', 'armchair');
    }
    const prev = a.status;
    if (act === 'checkin') { a.status = 'checked-in'; toast('Checked in', `${a.patient} · token ${String(a.token).padStart(2, '0')}`, 'sky', 'log-in'); }
    if (act === 'noshow') { a.status = 'no-show'; toast('Marked no-show', a.patient, 'slate', 'user-x'); }
    if (act === 'call' || act === 'next') {
      A.filter(x => x.status === 'with-doctor' && x.doctor === a.doctor).forEach(x => (x.status = 'completed'));
      a.status = 'with-doctor'; toast(`Token ${String(a.token).padStart(2, '0')} called`, `${a.patient} → ${a.doctor} · announced on TV & SMS`, 'violet', 'megaphone');
    }
    if (act === 'done') { a.status = 'completed'; toast('Visit completed', `${a.patient} · invoice draft created`, 'emerald', 'circle-check'); }
    audit('list-ordered', 'sky', `<b>${who()}</b> moved ${esc(a.patient)} from ${prev} to ${a.status}`);
    ui.qflash = a.id; H().refresh(false);
  });
  on('q-tv', () => {
    const A = T().appointments, serving = A.filter(a => a.status === 'with-doctor'), waiting = A.filter(a => a.status === 'checked-in');
    modal({ title: 'Waiting-room display', sub: 'Shown on the lobby TV; patient names are hidden', icon: 'monitor', tone: 'violet', size: 'max-w-2xl', foot: false,
      body: `<div class="rounded-2xl bg-slate-950 p-6 text-white"><div class="mb-5 flex items-center justify-between"><p class="text-lg font-bold">${esc(T().name)} · OPD</p><p class="font-mono text-slate-400">${nowTime()}</p></div>
        <div class="grid gap-3 sm:grid-cols-2">${(serving.length ? serving : [null]).map(a => `<div class="rounded-xl bg-violet-600 p-4"><p class="text-xs uppercase tracking-wider text-violet-200">Now serving</p><p class="text-4xl font-black">${a ? String(a.token).padStart(2, '0') : '—'}</p><p class="text-sm text-violet-100">${a ? esc(a.doctor) + ' · ' + esc(a.dept) : ''}</p></div>`).join('')}
        <div class="rounded-xl bg-slate-800 p-4"><p class="mb-2 text-xs uppercase tracking-wider text-slate-400">Next</p><p class="text-2xl font-bold tracking-wide">${waiting.map(a => String(a.token).padStart(2, '0')).join('  ·  ') || '—'}</p></div></div></div>` });
  });

  /* ======================= Doctor schedules ======================= */
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  function renderSchedules(c) {
    const d = D(), docs = T().employees.filter(e => e.type === 'Doctor');
    const hrs = s => s ? (+s[1].slice(0, 2) - +s[0].slice(0, 2)) : 0;
    c.innerHTML = `<div class="fade-in space-y-5">
      ${note('sky', 'info', 'Slots are generated from each doctor’s weekly hours and slot length. Leave blocks booking automatically and flags existing appointments for reassignment.')}
      <div class="${card}">${cardHead('Weekly availability', `${docs.length} doctors · ${branchName(H().state.branch)}`)}
      <div class="overflow-x-auto thin-scroll"><table class="w-full min-w-[900px] text-sm"><thead class="text-[11px] uppercase tracking-wider text-slate-500"><tr class="border-b border-slate-100 dark:border-slate-800">
        <th class="px-5 py-3 text-left font-semibold">Doctor</th>${DAYS.map(x => `<th class="px-2 py-3 font-semibold">${x}</th>`).join('')}<th class="px-3 py-3 text-left font-semibold">Slot · Max/day</th><th class="px-5"></th></tr></thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">${docs.map(doc => { const s = d.schedules[doc.id] || { days: [] };
          return `<tr>${td0(person(doc.name, `${esc(doc.spec || doc.dept)} · ${s.room || ''}`, DEPT_TONE[doc.dept] || 'teal'))}
          ${DAYS.map((_, k) => { const x = s.days[k]; return `<td class="px-1.5 py-2 text-center">${x ? `<span class="block rounded-lg ${K.tone(DEPT_TONE[doc.dept] || 'teal')} px-1 py-1.5 text-[11px] font-semibold">${x[0]}–${x[1]}<span class="block font-normal opacity-70">${hrs(x)}h</span></span>` : '<span class="block rounded-lg border border-dashed border-slate-200 py-2.5 text-[11px] text-slate-400 dark:border-slate-700">Off</span>'}</td>`; }).join('')}
          ${td(`${s.slot} min · ${s.maxPerDay}${s.tele ? `<span class="mt-1 block">${badge('sky', 'Teleconsult', 'video')}</span>` : ''}${s.leave ? `<span class="mt-1 block">${badge('amber', `Leave ${fmtShort(s.leave[0])}–${fmtShort(s.leave[1])}`, 'plane')}</span>` : ''}`)}
          <td class="px-5 text-right">${can('settings:manage') || can('staff:update') ? btn('ghost', 'Edit', 'pencil', `data-pg="sch-edit" data-id="${doc.id}"`, 'h-8 px-3') : ''}</td></tr>`; }).join('')}</tbody></table></div></div></div>`;
  }
  on('sch-edit', el => {
    const doc = T().employees.find(e => e.id === el.dataset.id), s = D().schedules[doc.id];
    modal({ title: `Schedule · ${doc.name}`, sub: doc.spec, icon: 'calendar-clock', size: 'max-w-xl', ok: 'Save schedule',
      body: `<div class="space-y-2">${DAYS.map((x, k) => { const v = s.days[k]; return `<div class="flex items-center gap-3"><label class="flex w-20 items-center gap-2 text-sm font-medium"><input type="checkbox" name="on${k}" class="h-4 w-4 accent-teal-600" ${v ? 'checked' : ''}/>${x}</label>
        <input type="time" name="a${k}" value="${v ? v[0] : '09:00'}" class="field !h-9 flex-1"/><span class="text-slate-400">to</span><input type="time" name="b${k}" value="${v ? v[1] : '17:00'}" class="field !h-9 flex-1"/></div>`; }).join('')}</div>
        <div class="mt-5 grid gap-4 sm:grid-cols-3">${field('slot', 'Slot length (min)', { opts: ['10', '15', '20', '30'], value: String(s.slot) })}${field('max', 'Max per day', { type: 'number', value: s.maxPerDay, min: 1 })}${field('room', 'Room', { value: s.room })}</div>
        <label class="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" name="tele" class="h-4 w-4 accent-teal-600" ${s.tele ? 'checked' : ''}/> Offer teleconsult slots</label>`,
      onSubmit: f => { s.days = DAYS.map((_, k) => f.elements['on' + k].checked ? [f.elements['a' + k].value, f.elements['b' + k].value] : null);
        s.slot = +f.elements.slot.value; s.maxPerDay = +f.elements.max.value; s.room = f.elements.room.value; s.tele = f.elements.tele.checked;
        audit('calendar-clock', 'teal', `<b>${who()}</b> updated the schedule of ${esc(doc.name)}`); toast('Schedule saved', `${doc.name} · new slots open for booking`, 'teal', 'calendar-check'); rerender(); } });
  });

  /* ======================= Departments ======================= */
  function renderDepartments(c) {
    const d = D(), f = ui.dtype || 'all', list = d.departments.filter(x => f === 'all' || (f === 'clinical' ? x.clinical : !x.clinical));
    c.innerHTML = `<div class="fade-in space-y-5">
      <div class="flex flex-wrap items-center gap-3">${seg('dtype', [['all', 'All', d.departments.length], ['clinical', 'Clinical', d.departments.filter(x => x.clinical).length], ['support', 'Support', d.departments.filter(x => !x.clinical).length]], f)}
        <span class="flex-1"></span>${btn('primary', 'Add department', 'plus', 'data-pg="dept-new"')}</div>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">${list.map(x => `<article class="${card} p-5 ${x.active ? '' : 'opacity-70'}">
        <div class="flex items-start gap-3"><span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl ${K.tone(x.tone)}">${ico(x.icon, 'h-5 w-5')}</span>
          <div class="min-w-0 flex-1"><h3 class="font-semibold">${esc(x.name)}</h3><p class="text-xs text-slate-500">${esc(x.location)} · ${x.clinical ? 'Clinical' : 'Support'}</p></div>
          <button type="button" class="switch" role="switch" aria-checked="${x.active}" aria-label="Active" data-pg="dept-toggle" data-id="${esc(x.name)}"></button></div>
        <div class="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p class="text-xs text-slate-500">Head</p><p class="truncate font-medium">${esc(x.head || 'Not assigned')}</p></div><div><p class="text-xs text-slate-500">Staff</p><p class="font-medium">${x.staff}</p></div></div>
        ${x.services.length ? `<div class="mt-3 flex flex-wrap gap-1.5">${x.services.map(s => `<span class="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">${esc(s)}</span>`).join('')}</div>` : ''}
        <div class="mt-4 flex gap-2">${btn('ghost', 'Edit', 'pencil', `data-pg="dept-edit" data-id="${esc(x.name)}"`, 'h-8 px-3')}${x.staff ? btn('ghost', 'Staff', 'users', 'data-nav="staff:list"', 'h-8 px-3') : ''}</div></article>`).join('')}</div></div>`;
  }
  const deptForm = x => `<div class="grid gap-4 sm:grid-cols-2">${field('name', 'Name', { req: true, value: x.name })}${field('location', 'Location', { value: x.location, ph: 'e.g. OPD 2 · 1st floor' })}
    ${field('kind', 'Type', { opts: [['clinical', 'Clinical (has OPD / doctors)'], ['support', 'Support / admin']], value: x.clinical === false ? 'support' : 'clinical' })}
    ${field('head', 'Head of department', { opts: [['', 'Not assigned'], ...T().employees.filter(e => e.active).map(e => [e.name, e.name])], value: x.head })}
    ${field('services', 'Services offered', { full: true, value: (x.services || []).join(', '), help: 'Comma separated — these appear in the billing service catalog' })}</div>`;
  on('dept-new', () => modal({ title: 'Add department', icon: 'building-2', body: deptForm({}), ok: 'Add department', onSubmit: f => {
    const v = readForm(f, ['name']); if (!v) return false;
    D().departments.push({ name: v.name, icon: v.kind === 'clinical' ? 'stethoscope' : 'layout-grid', tone: v.kind === 'clinical' ? 'teal' : 'slate', location: v.location || '—', clinical: v.kind === 'clinical', head: v.head, staff: 0, active: true, services: v.services.split(',').map(s => s.trim()).filter(Boolean), branches: [H().state.branch] });
    audit('building-2', 'teal', `<b>${who()}</b> added department ${esc(v.name)}`); toast('Department added', v.name, 'teal', 'building-2'); rerender(); } }));
  on('dept-edit', el => { const x = D().departments.find(d => d.name === el.dataset.id);
    modal({ title: `Edit ${x.name}`, icon: x.icon, tone: x.tone, body: deptForm(x), onSubmit: f => { const v = readForm(f, ['name']); if (!v) return false;
      Object.assign(x, { name: v.name, location: v.location, clinical: v.kind === 'clinical', head: v.head, services: v.services.split(',').map(s => s.trim()).filter(Boolean) }); toast('Department saved', x.name, 'teal', 'check'); rerender(); } }); });
  on('dept-toggle', el => { const x = D().departments.find(d => d.name === el.dataset.id); x.active = !x.active; toast(x.active ? 'Department active' : 'Department paused', x.active ? `${x.name} is bookable again` : `${x.name} hidden from booking and billing`, x.active ? 'teal' : 'slate', 'building-2'); rerender(); });

  /* ======================= Consultations (EMR) ======================= */
  const ICD = [['I10', 'Essential hypertension'], ['E11.9', 'Type 2 diabetes without complications'], ['J06.9', 'Acute upper respiratory infection'], ['A09', 'Infectious gastroenteritis'], ['M54.5', 'Low back pain'],
    ['L23.9', 'Allergic contact dermatitis'], ['J02.9', 'Acute pharyngitis'], ['R50.9', 'Fever, unspecified'], ['I20.9', 'Angina pectoris'], ['M17.9', 'Osteoarthritis of knee'], ['K21.9', 'GERD'], ['L70.0', 'Acne vulgaris'], ['E78.5', 'Hyperlipidaemia']];
  function renderConsult(c) {
    const d = D(), mine = isDoctor(), list = d.encounters.filter(e => !mine || e.doctor === myName());
    if (!ui.enc || !list.find(e => e.appt === ui.enc)) ui.enc = (list.find(e => e.state === 'in-progress') || list.find(e => e.state === 'waiting') || list[0] || {}).appt;
    const e = list.find(x => x.appt === ui.enc);
    const p = e && d.pt(e.patient);
    const ST = { signed: ['emerald', 'Signed'], 'in-progress': ['sky', 'In progress'], waiting: ['amber', 'Waiting'] };
    c.innerHTML = `<div class="fade-in grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside class="${card} self-start">${cardHead(mine ? 'My patients today' : 'Today’s encounters', `${list.filter(x => x.state !== 'signed').length} open`)}
        <ul class="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto thin-scroll dark:divide-slate-800">${list.map(x => `<li><button type="button" class="flex w-full items-center gap-3 px-4 py-3 text-left transition ${x.appt === ui.enc ? 'bg-teal-50 dark:bg-teal-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}" data-pg="enc" data-id="${x.appt}">
          ${avatar(x.patient, docTone(x.doctor), 'h-8 w-8 text-[11px]')}<span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium">${esc(x.patient)}</span><span class="block truncate text-xs text-slate-500">${x.time} · ${esc(mine ? x.complaint || x.dept : x.doctor)}</span></span>${badge(...ST[x.state])}</button></li>`).join('')}</ul></aside>
      ${e ? encounterHTML(e, p) : `<div class="${card}">${empty('clipboard-list', 'No encounters', 'Patients appear here when they’re checked in.')}</div>`}</div>`;
  }
  function encounterHTML(e, p) {
    const signed = e.state === 'signed', v = e.vitals, dis = signed ? 'disabled' : '';
    const vit = (k, l, u, ph) => `<label class="block"><span class="mb-1 block text-xs text-slate-500">${l}</span><div class="relative"><input data-pg-vital="${k}" value="${esc(v[k] || '')}" placeholder="${ph}" class="field !h-9 pr-12 tabular-nums" ${dis}/><span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">${u}</span></div></label>`;
    const sec = (k, l, ph) => `<label class="block"><span class="mb-1 block text-sm font-medium">${l}</span><textarea rows="2" class="field" data-pg-note="${k}" placeholder="${ph}" ${dis}>${esc((e.soap || {})[k] || (k === 'cc' ? e.complaint : ''))}</textarea></label>`;
    return `<div class="space-y-5">
      <div class="${card} flex flex-wrap items-center gap-4 p-5">${avatar(e.patient, p.gender === 'F' ? 'rose' : 'sky', 'h-12 w-12 text-sm')}
        <div class="min-w-0 flex-1"><h3 class="text-lg font-semibold">${esc(e.patient)}</h3><p class="text-sm text-slate-500">${p.mrn} · ${p.age} yrs · ${p.gender === 'F' ? 'Female' : 'Male'} · ${p.blood} · ${esc(e.dept)}</p>
          <div class="mt-1.5 flex flex-wrap gap-1.5">${p.allergies ? badge('rose', 'Allergy: ' + p.allergies, 'triangle-alert') : badge('slate', 'No known allergies')}${p.insurance ? badge('emerald', p.insurance, 'shield-check') : ''}${badge('slate', p.visits + ' previous visits', 'history')}</div></div>
        <div class="flex flex-wrap gap-2">${btn('ghost', 'History', 'history', `data-pg="patient" data-id="${p.mrn}"`)}${signed ? badge('emerald', 'Signed · v' + (e.version || 1), 'lock') : ''}</div></div>
      <div class="${card} p-5"><h3 class="mb-3 font-semibold">Vitals</h3><div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
        ${vit('bp', 'Blood pressure', 'mmHg', '120/80')}${vit('pulse', 'Pulse', 'bpm', '72')}${vit('temp', 'Temperature', '°F', '98.6')}${vit('spo2', 'SpO₂', '%', '98')}${vit('weight', 'Weight', 'kg', '70')}</div>
        ${/^1[4-9]\d|^2\d\d/.test(v.bp || '') ? `<div class="mt-3">${note('amber', 'triangle-alert', `BP ${esc(v.bp)} is above target. Consider repeat reading after 5 min rest.`)}</div>` : ''}</div>
      <div class="${card} p-5"><h3 class="mb-3 font-semibold">Clinical notes</h3><div class="grid gap-4 md:grid-cols-2">
        ${sec('cc', 'Chief complaint', 'Why the patient came')}${sec('hpi', 'History', 'Onset, duration, associated symptoms')}${sec('exam', 'Examination', 'Findings')}${sec('plan', 'Plan & advice', 'Investigations, follow-up, advice')}</div></div>
      <div class="${card} p-5"><h3 class="mb-3 font-semibold">Diagnosis <span class="text-xs font-normal text-slate-400">ICD-10</span></h3>
        <div class="flex flex-wrap gap-2">${e.dx.map((x, i) => `<span class="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1 text-sm text-teal-800 dark:bg-teal-500/10 dark:text-teal-200"><span class="font-mono text-xs">${x.code}</span>${esc(x.label)}${signed ? '' : `<button type="button" class="opacity-60 hover:opacity-100" data-pg="dx-del" data-i="${i}" aria-label="Remove">${ico('x', 'h-3.5 w-3.5')}</button>`}</span>`).join('') || '<span class="text-sm text-slate-400">None added</span>'}</div>
        ${signed ? '' : `<div class="relative mt-3 max-w-md">${ico('search', 'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400')}<input class="field !pl-9" placeholder="Search ICD-10 code or name" data-pg-input="dxq" value="${esc(ui.dxq || '')}"/>
          ${ui.dxq ? `<ul class="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">${ICD.filter(([c, l]) => (c + l).toLowerCase().includes(ui.dxq.toLowerCase())).slice(0, 6).map(([c, l]) => `<li><button type="button" class="flex w-full gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700" data-pg="dx-add" data-c="${c}" data-l="${esc(l)}"><span class="w-14 font-mono text-xs text-slate-400">${c}</span>${esc(l)}</button></li>`).join('') || '<li class="px-3 py-2 text-sm text-slate-500">No match</li>'}</ul>` : ''}</div>`}</div>
      ${(e.history || []).length ? `<div class="${card} p-5"><h3 class="mb-3 font-semibold">Version history</h3><ol class="space-y-2 text-sm">${e.history.map(h => `<li class="flex items-center gap-2">${ico('git-commit-horizontal', 'h-4 w-4 text-slate-400')}<b>v${h.v}</b> ${esc(h.what)} · <span class="text-slate-500">${esc(h.by)}, ${h.at}</span></li>`).join('')}</ol>
        <p class="mt-2 text-xs text-slate-500">Signed notes are never overwritten — an addendum creates a new version.</p></div>` : ''}
      <div class="sticky bottom-3 z-10 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        ${can('lab:order') && H().modOn('lab') ? btn('ghost', 'Order lab test', 'flask-round', `data-pg="enc-lab" data-id="${e.appt}"`) : ''}
        ${can('prescription:write') && H().modOn('prescriptions') ? btn('ghost', 'Write prescription', 'file-text', `data-pg="rx-new" data-mrn="${p.mrn}"`) : ''}
        ${signed ? btn('ghost', 'Add addendum', 'file-plus', `data-pg="enc-addendum" data-id="${e.appt}"`) : `${btn('ghost', 'Save draft', 'save', `data-pg="enc-save" data-id="${e.appt}"`)}${btn('primary', 'Sign & complete', 'pen-line', `data-pg="enc-sign" data-id="${e.appt}"`)}`}</div></div>`;
  }
  const curEnc = () => D().encounters.find(x => x.appt === ui.enc);
  on('enc', el => { ui.enc = el.dataset.id; ui.dxq = ''; rerender(); });
  K.onInput('dxq', el => { ui.dxq = el.value; const pos = el.selectionStart; rerender(); const n = document.querySelector('[data-pg-input="dxq"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } });
  on('dx-add', el => { const e = curEnc(); if (!e.dx.some(x => x.code === el.dataset.c)) e.dx.push({ code: el.dataset.c, label: el.dataset.l }); ui.dxq = ''; rerender(); });
  on('dx-del', el => { curEnc().dx.splice(+el.dataset.i, 1); rerender(); });
  document.addEventListener('input', ev => {
    const e = ev.target.dataset.pgVital ? curEnc() : ev.target.dataset.pgNote ? curEnc() : null; if (!e) return;
    if (ev.target.dataset.pgVital) e.vitals[ev.target.dataset.pgVital] = ev.target.value;
    else { e.soap = e.soap || {}; e.soap[ev.target.dataset.pgNote] = ev.target.value; }
    if (e.state === 'waiting') e.state = 'in-progress';
  });
  on('enc-save', () => { toast('Draft saved', 'Auto-saves every 30 s while you type', 'sky', 'save'); });
  on('enc-sign', () => { const e = curEnc();
    if (!e.dx.length) return toast('Add a diagnosis first', 'A signed encounter needs at least one ICD-10 code.', 'amber', 'triangle-alert');
    H().confirmDialog({ title: 'Sign this encounter?', text: 'Signed notes become read-only. Changes after this are added as a new version.', ok: 'Sign & complete', tone: 'teal', icon: 'pen-line', onOk: () => {
      e.state = 'signed'; e.version = 1; e.history = [{ v: 1, what: 'Signed', by: me().person, at: nowTime() }];
      const a = T().appointments.find(x => x.id === e.appt); if (a) a.status = 'completed';
      audit('pen-line', 'teal', `<b>${who()}</b> signed the encounter of ${esc(e.patient)}`); toast('Encounter signed', `${e.patient} · v1 locked`, 'emerald', 'lock'); H().refresh(false); } }); });
  on('enc-addendum', () => { const e = curEnc();
    modal({ title: 'Add addendum', sub: `${e.patient} · creates v${(e.version || 1) + 1}`, icon: 'file-plus', ok: 'Add addendum', body: field('text', 'Addendum', { area: true, rows: 4, req: true, ph: 'e.g. Lab results reviewed, dose adjusted' }),
      onSubmit: f => { const v = readForm(f, ['text']); if (!v) return false; e.version = (e.version || 1) + 1; e.history.push({ v: e.version, what: 'Addendum: ' + v.text.slice(0, 60), by: me().person, at: nowTime() }); toast('Addendum saved', `v${e.version}`, 'teal', 'file-plus'); rerender(); } }); });
  on('enc-lab', () => { const e = curEnc(), d = D();
    modal({ title: 'Order lab tests', sub: e.patient, icon: 'flask-round', tone: 'sky', ok: 'Place order',
      body: `<div class="grid gap-2 sm:grid-cols-2">${d.TESTS.map(([t, s, pr], i) => `<label class="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5 text-sm dark:border-slate-700"><input type="checkbox" name="t${i}" class="h-4 w-4 accent-teal-600"/><span class="flex-1">${esc(t)}<span class="block text-xs text-slate-500">${s}</span></span><span class="text-xs tabular-nums text-slate-500">${inr(pr)}</span></label>`).join('')}</div>
        <div class="mt-4">${field('priority', 'Priority', { opts: [['routine', 'Routine'], ['urgent', 'Urgent']] })}</div>`,
      onSubmit: f => { const picked = d.TESTS.filter((_, i) => f.elements['t' + i].checked); if (!picked.length) { toast('Pick at least one test', '', 'amber', 'flask-round'); return false; }
        picked.forEach(([t, s, pr]) => d.labOrders.unshift({ id: 'LAB-' + (5500 + d.labOrders.length), patient: e.patient, mrn: e.mrn, test: t, section: s, price: pr, doctor: e.doctor, priority: f.elements.priority.value, status: 'ordered', at: nowTime() }));
        toast(`${picked.length} test${picked.length > 1 ? 's' : ''} ordered`, 'Sent to the lab worklist and added to the bill', 'sky', 'flask-round'); } }); });

  /* ======================= Prescriptions ======================= */
  const RXS = { issued: ['slate', 'Issued'], sent: ['sky', 'Sent to pharmacy'], dispensed: ['emerald', 'Dispensed'] };
  function renderRx(c) {
    const d = D(), q = (ui.rxq || '').toLowerCase(), mine = isDoctor();
    const list = d.prescriptions.filter(r => (!mine || r.doctor === myName()) && (!q || (r.patient + r.id + r.dx).toLowerCase().includes(q)));
    c.innerHTML = `<div class="fade-in space-y-5">
      ${tiles([tile('file-text', 'teal', mine ? 'My prescriptions' : 'Prescriptions (7 days)', list.length), tile('send', 'sky', 'Waiting at pharmacy', list.filter(r => r.status === 'sent').length),
        tile('pill', 'emerald', 'Dispensed', list.filter(r => r.status === 'dispensed').length), tile('message-circle', 'violet', 'Shared on WhatsApp', list.filter(r => r.shared).length)])}
      <div class="${card}">${toolbar(`${search('rxq', ui.rxq || '', 'Search patient, diagnosis or RX no.')}<span class="flex-1"></span>${btn('primary', 'New prescription', 'plus', 'data-pg="rx-new"')}`)}
        ${table(['Prescription', 'Patient', 'Diagnosis', 'Medicines', 'Status', ''], list.map(r => `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 ${ui.flash === r.id ? 'row-flash' : ''}">
          ${td0(`<span class="font-mono text-xs font-semibold">${r.id}</span><span class="block text-xs text-slate-500">${fmtShort(r.date)} · ${esc(r.doctor)}</span>`)}${td(person(r.patient, r.mrn, 'sky'))}
          ${td(esc(r.dx), 'max-w-[220px] truncate')}${td(r.items.map(i => esc(i.drug.split(' ')[0])).join(', ') + `<span class="block text-xs text-slate-400">${r.items.length} item${r.items.length > 1 ? 's' : ''}</span>`)}${td(badge(...RXS[r.status]))}
          ${td(`<div class="flex justify-end gap-1">${iconBtn('eye', 'Preview', `data-pg="rx-view" data-id="${r.id}"`)}${iconBtn('message-circle', 'Send on WhatsApp', `data-pg="rx-wa" data-id="${r.id}"`)}${r.status === 'issued' ? iconBtn('send', 'Send to pharmacy', `data-pg="rx-send" data-id="${r.id}"`) : ''}</div>`, 'pr-5')}</tr>`).join(''), { empty: 'No prescriptions yet.' })}</div></div>`;
    ui.flash = null;
  }
  function rxSheet(r) {
    return `<div class="rounded-xl border border-slate-200 p-5 text-sm dark:border-slate-700">
      <div class="flex items-start justify-between border-b border-slate-200 pb-3 dark:border-slate-700"><div><p class="text-base font-bold text-teal-700 dark:text-teal-300">${esc(T().name)}</p><p class="text-xs text-slate-500">${esc(T().branches[0])}</p></div>
        <div class="text-right"><p class="font-semibold">${esc(r.doctor)}</p><p class="text-xs text-slate-500">${esc((T().employees.find(e => e.name === r.doctor) || {}).reg || '')}</p></div></div>
      <div class="flex justify-between py-3 text-xs"><span><b>${esc(r.patient)}</b> · ${r.mrn}</span><span>${fmtDate(r.date)} · ${r.id}</span></div>
      <p class="mb-2 text-xs"><b>Diagnosis:</b> ${esc(r.dx)}</p>
      <p class="text-2xl font-serif italic text-slate-400">℞</p>
      <ol class="mt-1 space-y-2">${r.items.map((i, n) => `<li class="flex gap-3"><span class="text-slate-400">${n + 1}.</span><span class="flex-1"><b>${esc(i.drug)}</b><span class="block text-xs text-slate-500">${esc(i.freq)} · ${esc(i.dur)} · ${esc(i.note || '')}</span></span></li>`).join('')}</ol>
      ${r.advice ? `<p class="mt-3 text-xs"><b>Advice:</b> ${esc(r.advice)}</p>` : ''}
      <p class="mt-6 text-right text-xs text-slate-400">Digitally signed · verify at ${T().slug}.hms.com/rx/${r.id}</p></div>`;
  }
  on('rx-view', el => { const r = D().prescriptions.find(x => x.id === el.dataset.id);
    modal({ title: r.id, sub: `${r.patient} · ${fmtDate(r.date)}`, icon: 'file-text', size: 'max-w-xl', body: rxSheet(r),
      foot: `${btn('ghost', 'Print', 'printer', 'data-pg="print"')}${btn('ghost', 'WhatsApp', 'message-circle', `data-pg="rx-wa" data-id="${r.id}"`)}${r.status === 'issued' ? btn('primary', 'Send to pharmacy', 'send', `data-pg="rx-send" data-id="${r.id}" data-close-modal`) : ''}` }); });
  on('print', () => toast('Print', 'Opens the browser print dialog with an A5 layout in the full build.', 'slate', 'printer'));
  on('rx-wa', el => { const r = D().prescriptions.find(x => x.id === el.dataset.id); r.shared = true; toast('Prescription sent', `${r.patient} · WhatsApp (Meta Cloud API) · PDF link valid 7 days`, 'emerald', 'message-circle'); if (!document.getElementById('pgModal').classList.contains('open')) rerender(); });
  on('rx-send', el => { const r = D().prescriptions.find(x => x.id === el.dataset.id); r.status = 'sent'; ui.flash = r.id; toast('Sent to pharmacy', `${r.id} is in the dispensing queue`, 'sky', 'send'); rerender(); });
  on('rx-new', el => openRxComposer(el.dataset.mrn));
  function openRxComposer(mrn) {
    const d = D(); ui.rxItems = [{ drug: d.drugs[0].name, freq: '1-0-1', dur: '5 days', note: 'After food' }];
    const draw = () => {
      const box = document.getElementById('pgRxLines'); if (!box) return;
      box.innerHTML = ui.rxItems.map((it, i) => `<div class="grid grid-cols-12 items-center gap-2"><select class="field col-span-12 !h-9 sm:col-span-5" data-rx="${i}" data-k="drug">${d.drugs.map(x => `<option ${x.name === it.drug ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
        <select class="field col-span-4 !h-9 sm:col-span-2" data-rx="${i}" data-k="freq">${['1-0-0', '0-0-1', '1-0-1', '1-1-1', 'SOS'].map(x => `<option ${x === it.freq ? 'selected' : ''}>${x}</option>`).join('')}</select>
        <select class="field col-span-4 !h-9 sm:col-span-2" data-rx="${i}" data-k="dur">${['3 days', '5 days', '7 days', '10 days', '30 days'].map(x => `<option ${x === it.dur ? 'selected' : ''}>${x}</option>`).join('')}</select>
        <input class="field col-span-3 !h-9 sm:col-span-2" data-rx="${i}" data-k="note" value="${esc(it.note)}" placeholder="Note"/>
        <button type="button" class="col-span-1 rounded-lg p-1.5 text-slate-400 hover:text-rose-600" data-pg="rx-del" data-i="${i}" aria-label="Remove">${ico('trash-2')}</button></div>`).join('');
      const p = d.patients.find(x => x.mrn === document.querySelector('#pgForm [name=patient]')?.value);
      const allergy = p && p.allergies && ui.rxItems.some(i => /amoxi/i.test(i.drug) && /penicillin/i.test(p.allergies));
      document.getElementById('pgRxWarn').innerHTML = allergy ? note('rose', 'triangle-alert', `<b>Allergy alert:</b> ${esc(p.name)} is allergic to ${esc(p.allergies)}. Amoxicillin is a penicillin.`) : '';
      H().icons();
    };
    ui.rxDraw = draw;
    modal({ title: 'New prescription', icon: 'file-text', size: 'max-w-3xl', ok: 'Issue prescription',
      body: `<div class="grid gap-4 sm:grid-cols-2">${field('patient', 'Patient', { opts: d.patients.map(p => [p.mrn, `${p.name} · ${p.mrn}`]), value: mrn || '' })}${field('dx', 'Diagnosis', { req: true, ph: 'e.g. Viral fever (A99)' })}</div>
        <div class="mt-5 mb-2 flex items-center justify-between"><p class="text-sm font-medium">Medicines</p>${btn('soft', 'Add medicine', 'plus', 'data-pg="rx-add"', 'h-8 px-3')}</div>
        <div id="pgRxLines" class="space-y-2"></div><div id="pgRxWarn" class="mt-3"></div>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">${field('advice', 'Advice', { ph: 'Diet, rest, follow-up in 7 days' })}${field('send', 'After issuing', { opts: [['sent', 'Send to in-house pharmacy'], ['issued', 'Print only'], ['wa', 'Pharmacy + WhatsApp to patient']] })}</div>`,
      onSubmit: f => { const v = readForm(f, ['dx']); if (!v) return false; if (!ui.rxItems.length) { toast('Add a medicine', '', 'amber', 'pill'); return false; }
        const p = d.patients.find(x => x.mrn === v.patient), doc = isDoctor() ? myName() : (p.doctor || T().doctors[0].name);
        const r = { id: 'RX-' + (7900 + d.prescriptions.length), patient: p.name, mrn: p.mrn, doctor: doc, dept: (T().employees.find(e => e.name === doc) || {}).dept, date: todayISO(), dx: v.dx, items: ui.rxItems.slice(), advice: v.advice, status: v.send === 'issued' ? 'issued' : 'sent', shared: v.send === 'wa' };
        d.prescriptions.unshift(r); ui.flash = r.id;
        audit('file-text', 'sky', `<b>${who()}</b> issued ${r.id} for ${esc(p.name)}`); toast('Prescription issued', `${r.id} · ${r.status === 'sent' ? 'in pharmacy queue' : 'ready to print'}${r.shared ? ' · WhatsApp sent' : ''}`, 'teal', 'file-check');
        if (H().state.active === 'prescriptions') rerender(); } });
    document.querySelector('#pgForm [name=patient]').addEventListener('change', draw);
    document.getElementById('pgRxLines').addEventListener('change', ev => { const t = ev.target; if (t.dataset.rx == null) return; ui.rxItems[+t.dataset.rx][t.dataset.k] = t.value; draw(); });
    document.getElementById('pgRxLines').addEventListener('input', ev => { const t = ev.target; if (t.dataset.rx != null && t.dataset.k === 'note') ui.rxItems[+t.dataset.rx].note = t.value; });
    draw();
  }
  on('rx-add', () => { ui.rxItems.push({ drug: D().drugs[1].name, freq: '1-0-1', dur: '5 days', note: 'After food' }); ui.rxDraw(); });
  on('rx-del', el => { ui.rxItems.splice(+el.dataset.i, 1); ui.rxDraw(); });

  /* ======================= Laboratory ======================= */
  const LAB = { ordered: ['amber', 'Ordered', 'Collect sample'], collected: ['sky', 'Sample collected', 'Start processing'], processing: ['violet', 'Processing', 'Enter results'], review: ['teal', 'Awaiting verification', 'Verify & release'], released: ['emerald', 'Released', ''] };
  const labBadge = s => badge(LAB[s][0], LAB[s][1]);
  function renderLab(c) {
    const d = D(), st = ui.lst || 'all', q = (ui.lq || '').toLowerCase();
    const list = d.labOrders.filter(l => (st === 'all' || l.status === st) && (!q || (l.patient + l.test + l.id).toLowerCase().includes(q)))
      .sort((a, b) => (b.priority === 'urgent') - (a.priority === 'urgent') || a.at.localeCompare(b.at));
    const n = s => d.labOrders.filter(l => l.status === s).length;
    c.innerHTML = `<div class="fade-in space-y-5">
      <div class="grid grid-cols-2 gap-3 md:grid-cols-5">${Object.entries(LAB).map(([k, [t, l]], i) => `<button type="button" class="${card} p-4 text-left transition hover:-translate-y-0.5 ${st === k ? 'ring-2 ring-teal-500' : ''}" data-pg="seg" data-key="lst" data-val="${st === k ? 'all' : k}">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">${i + 1} · ${l}</p><p class="mt-1 text-2xl font-bold tabular-nums">${n(k)}</p><div class="mt-2 h-1 rounded-full bg-${t}-500"></div></button>`).join('')}</div>
      <div class="${card}">${toolbar(`${search('lq', ui.lq || '', 'Search patient, test or order')}${st !== 'all' ? btn('ghost', 'Clear filter', 'x', 'data-pg="seg" data-key="lst" data-val="all"', 'h-9 px-3') : ''}<span class="flex-1"></span>
        ${btn('ghost', 'Print barcode labels', 'barcode', 'data-pg="lab-labels"')}`)}
        ${table(['Order', 'Patient', 'Test', 'Ordered by', 'Status', ''], list.map(l => `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 ${ui.flash === l.id ? 'row-flash' : ''}">
          ${td0(`<span class="font-mono text-xs font-semibold">${l.id}</span><span class="block text-xs text-slate-500">${l.at}</span>`)}${td(person(l.patient, l.mrn, 'sky'))}
          ${td(`<span class="font-medium">${esc(l.test)}</span><span class="block text-xs text-slate-500">${esc(l.section)}</span>`)}${td(esc(l.doctor || '—'))}
          ${td(`<div class="flex flex-wrap gap-1">${labBadge(l.status)}${l.priority === 'urgent' ? badge('rose', 'Urgent', 'zap') : ''}${l.critical && ['review', 'released'].includes(l.status) ? badge('rose', 'Critical', 'triangle-alert') : ''}</div>`)}
          ${td(`<div class="flex justify-end gap-1">${l.status === 'released' ? `${iconBtn('file-text', 'View report', `data-pg="lab-report" data-id="${l.id}"`)}${iconBtn('mail', 'Email report', `data-pg="lab-mail" data-id="${l.id}"`)}` : btn('soft', LAB[l.status][2], '', `data-pg="lab-next" data-id="${l.id}"`, 'h-8 px-3')}</div>`, 'pr-5')}</tr>`).join(''), { empty: 'No orders in this stage.' })}</div></div>`;
    ui.flash = null;
  }
  on('lab-next', el => { const l = D().labOrders.find(x => x.id === el.dataset.id);
    if (l.status === 'ordered') { l.status = 'collected'; ui.flash = l.id; toast('Sample collected', `${l.id} · barcode printed`, 'sky', 'test-tube'); return rerender(); }
    if (l.status === 'collected') { l.status = 'processing'; ui.flash = l.id; toast('Processing', `${l.test} on analyser`, 'violet', 'cog'); return rerender(); }
    if (l.status === 'processing' || l.status === 'review') return openResults(l);
  });
  function resultRows(l) { return D().LAB_RESULTS[l.test] || [['Result', '', '', '']]; }
  const flagOf = (v, ref) => { const n = parseFloat(v); if (isNaN(n)) return /positive/i.test(v) ? 'H' : ''; const m = ref.match(/([\d.]+)\s*–\s*([\d.]+)/), lt = ref.match(/<\s*([\d.]+)/), gt = ref.match(/>\s*([\d.]+)/);
    if (m) return n < +m[1] ? 'L' : n > +m[2] ? 'H' : ''; if (lt) return n >= +lt[1] ? 'H' : ''; if (gt) return n <= +gt[1] ? 'L' : ''; return ''; };
  function openResults(l) {
    const verify = l.status === 'review', rows = l.results || resultRows(l);
    modal({ title: verify ? 'Verify & release' : 'Enter results', sub: `${l.id} · ${l.test} · ${l.patient}`, icon: verify ? 'badge-check' : 'flask-round', tone: 'sky', size: 'max-w-2xl', ok: verify ? 'Verify & release' : 'Submit for verification',
      body: `<table class="w-full text-sm"><thead class="text-[11px] uppercase tracking-wider text-slate-500"><tr><th class="py-2 text-left">Parameter</th><th class="py-2 text-left">Value</th><th class="py-2 text-left">Unit</th><th class="py-2 text-left">Reference</th><th class="py-2">Flag</th></tr></thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">${rows.map(([p, v, u, ref], i) => { const fl = flagOf(String(v), ref); return `<tr><td class="py-2 font-medium">${esc(p)}</td><td class="py-2"><input name="v${i}" value="${esc(v)}" class="field !h-8 w-28 tabular-nums" ${verify ? 'readonly' : ''}/></td><td class="py-2 text-slate-500">${esc(u)}</td><td class="py-2 text-slate-500">${esc(ref)}</td>
          <td class="py-2 text-center">${fl ? badge(fl === 'H' ? 'rose' : 'amber', fl === 'H' ? 'High' : 'Low') : '<span class="text-xs text-slate-400">—</span>'}</td></tr>`; }).join('')}</tbody></table>
        ${verify ? `<div class="mt-4">${note('sky', 'badge-check', `Verification is a separate permission. Releasing sends the report to the patient by <b>${D().channels.routes.find(r => r.purpose === 'report').primary}</b> and to ${esc(l.doctor)}.`)}</div>` : `<div class="mt-4">${field('remark', 'Technician remark', { ph: 'Optional' })}</div>`}`,
      onSubmit: f => {
        l.results = rows.map(([p, v, u, ref], i) => [p, f.elements['v' + i].value, u, ref]);
        if (verify) { l.status = 'released'; l.releasedAt = nowTime(); H().notify({ tone: 'sky', icon: 'flask-round', title: 'Lab report ready', text: `${l.patient} · ${l.test}` });
          audit('badge-check', 'emerald', `<b>${who()}</b> verified and released ${l.id} (${esc(l.test)})`); toast('Report released', `${l.patient} · sent to patient & doctor`, 'emerald', 'send');
          if (l.results.some(([, v, , ref]) => flagOf(String(v), ref))) setTimeout(() => toast('Abnormal values flagged', `${l.doctor} alerted on SMS`, 'rose', 'triangle-alert'), 600); }
        else { l.status = 'review'; toast('Results submitted', 'Waiting for pathologist verification', 'teal', 'clipboard-check'); }
        ui.flash = l.id; rerender(); } });
  }
  on('lab-report', el => { const l = D().labOrders.find(x => x.id === el.dataset.id); const rows = l.results || resultRows(l);
    modal({ title: `${l.test}`, sub: `${l.id} · ${l.patient} · released ${l.releasedAt || 'today'}`, icon: 'file-text', tone: 'emerald', size: 'max-w-xl', foot: `${btn('ghost', 'Print', 'printer', 'data-pg="print"')}${btn('primary', 'Email to patient', 'mail', `data-pg="lab-mail" data-id="${l.id}"`)}`,
      body: `<table class="w-full text-sm"><tbody class="divide-y divide-slate-100 dark:divide-slate-800">${rows.map(([p, v, u, ref]) => { const fl = flagOf(String(v), ref); return `<tr><td class="py-2">${esc(p)}</td><td class="py-2 font-semibold tabular-nums ${fl ? 'text-rose-600' : ''}">${esc(v)} ${esc(u)} ${fl ? `(${fl})` : ''}</td><td class="py-2 text-right text-slate-500">${esc(ref)}</td></tr>`; }).join('')}</tbody></table>
        <p class="mt-4 text-xs text-slate-500">Verified by pathologist · e-signed · ${esc(T().name)} Laboratory</p>` }); });
  on('lab-mail', el => toast('Report emailed', `${D().labOrders.find(x => x.id === el.dataset.id).patient} · secure link (Amazon SES)`, 'sky', 'mail'));
  on('lab-labels', () => toast('Labels sent to printer', `${D().labOrders.filter(l => l.status === 'ordered').length} barcode labels for pending samples`, 'slate', 'barcode'));

  /* ======================= Radiology ======================= */
  const RAD = { scheduled: ['amber', 'Scheduled'], 'in-progress': ['violet', 'Scanning'], 'awaiting-report': ['sky', 'Awaiting report'], reported: ['emerald', 'Reported'] };
  function renderRad(c) {
    const d = D(), m = ui.rmod || 'all', list = d.radiology.filter(r => m === 'all' || r.modality === m);
    const mods = ['X-Ray', 'CT', 'MRI', 'USG'];
    c.innerHTML = `<div class="fade-in space-y-5">
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">${mods.map(x => { const rs = d.radiology.filter(r => r.modality === x); return `<div class="${card} p-4"><div class="flex items-center justify-between"><p class="font-semibold">${x}</p>${badge(rs.some(r => r.status === 'in-progress') ? 'violet' : 'emerald', rs.some(r => r.status === 'in-progress') ? 'In use' : 'Free')}</div>
        <p class="mt-2 text-2xl font-bold tabular-nums">${rs.length}</p><p class="text-xs text-slate-500">${rs.filter(r => r.status !== 'reported').length} pending today</p></div>`; }).join('')}</div>
      <div class="${card}">${toolbar(`${seg('rmod', [['all', 'All'], ...mods.map(x => [x, x])], m)}<span class="flex-1"></span>${btn('primary', 'New imaging order', 'plus', 'data-pg="rad-new"')}`)}
        ${table(['Order', 'Patient', 'Study', 'Slot · Room', 'Status', ''], list.map(r => `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 ${ui.flash === r.id ? 'row-flash' : ''}">
          ${td0(`<span class="font-mono text-xs font-semibold">${r.id}</span><span class="block text-xs text-slate-500">${esc(r.doctor)}</span>`)}${td(person(r.patient, r.mrn, 'violet'))}
          ${td(`<span class="font-medium">${r.modality}</span> · ${esc(r.part)}`)}${td(`${r.slot} · ${r.room}`)}${td(`<div class="flex flex-wrap gap-1">${badge(...RAD[r.status])}${r.critical ? badge('rose', 'Critical', 'siren') : ''}</div>`)}
          ${td(`<div class="flex justify-end">${r.status === 'scheduled' ? btn('soft', 'Start scan', '', `data-pg="rad-next" data-id="${r.id}"`, 'h-8 px-3') : r.status === 'in-progress' ? btn('soft', 'Scan done', '', `data-pg="rad-next" data-id="${r.id}"`, 'h-8 px-3') : r.status === 'awaiting-report' ? btn('primary', 'Write report', 'pen-line', `data-pg="rad-report" data-id="${r.id}"`, 'h-8 px-3') : btn('ghost', 'View', 'eye', `data-pg="rad-report" data-id="${r.id}"`, 'h-8 px-3')}</div>`, 'pr-5')}</tr>`).join(''), { empty: 'No studies.' })}</div></div>`;
    ui.flash = null;
  }
  on('rad-next', el => { const r = D().radiology.find(x => x.id === el.dataset.id); r.status = r.status === 'scheduled' ? 'in-progress' : 'awaiting-report'; ui.flash = r.id; toast(r.status === 'in-progress' ? 'Scan started' : 'Images sent to PACS', `${r.modality} ${r.part} · ${r.patient}`, 'violet', 'scan-line'); rerender(); });
  on('rad-report', el => { const r = D().radiology.find(x => x.id === el.dataset.id), done = r.status === 'reported';
    modal({ title: `${r.modality} · ${r.part}`, sub: `${r.id} · ${r.patient}`, icon: 'scan-line', tone: 'violet', size: 'max-w-2xl', ok: 'Sign report',
      body: `<div class="mb-4 grid grid-cols-4 gap-2">${[1, 2, 3, 4].map(i => `<div class="grid aspect-square place-items-center rounded-xl bg-slate-900 text-[11px] text-slate-500">${ico('image', 'h-5 w-5')}<span class="sr-only">Image ${i}</span></div>`).join('')}</div>
        <div class="space-y-4">${field('findings', 'Findings', { area: true, rows: 4, value: r.finding || '', ph: 'Describe the findings' })}${field('impression', 'Impression', { area: true, rows: 2, value: r.impression || '' })}</div>
        <label class="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" name="critical" class="h-4 w-4 accent-rose-600" ${r.critical ? 'checked' : ''}/> Critical finding — alert the referring doctor now</label>`,
      foot: done ? `${btn('ghost', 'Close', '', 'data-close-modal')}${btn('primary', 'Share with patient', 'send', `data-pg="rad-share" data-id="${r.id}"`)}` : undefined,
      onSubmit: done ? null : f => { r.finding = f.elements.findings.value; r.impression = f.elements.impression.value; r.critical = f.elements.critical.checked; r.status = 'reported'; ui.flash = r.id;
        if (r.critical) { H().notify({ tone: 'rose', icon: 'siren', title: 'Critical imaging finding', text: `${r.patient} · ${r.modality} ${r.part}` }); toast('Critical alert sent', `${r.doctor} notified by SMS + call`, 'rose', 'siren'); }
        else toast('Report signed', `${r.id} · shared with ${r.doctor}`, 'emerald', 'badge-check'); rerender(); } }); });
  on('rad-share', el => toast('Shared with patient', 'Report PDF + image viewer link', 'sky', 'send'));
  on('rad-new', () => { const d = D();
    modal({ title: 'New imaging order', icon: 'scan-line', tone: 'violet', ok: 'Schedule', body: `<div class="grid gap-4 sm:grid-cols-2">${field('patient', 'Patient', { opts: d.patients.map(p => [p.mrn, p.name + ' · ' + p.mrn]), full: true })}
      ${field('modality', 'Modality', { opts: ['X-Ray', 'CT', 'MRI', 'USG'] })}${field('part', 'Body part / study', { req: true, ph: 'e.g. Chest PA' })}${field('slot', 'Slot', { type: 'time', value: '16:00' })}${field('contrast', 'Contrast', { opts: ['No', 'Yes — check creatinine'] })}</div>`,
      onSubmit: f => { const v = readForm(f, ['part']); if (!v) return false; const p = d.patients.find(x => x.mrn === v.patient);
        const r = { id: 'RAD-' + (3400 + d.radiology.length), patient: p.name, mrn: p.mrn, modality: v.modality, part: v.part, doctor: isDoctor() ? myName() : p.doctor, status: 'scheduled', slot: v.slot, room: { 'X-Ray': 'Room 1', CT: 'CT Suite', USG: 'USG 2', MRI: 'MRI Bay' }[v.modality] };
        d.radiology.unshift(r); ui.flash = r.id; toast('Imaging scheduled', `${r.modality} ${r.part} at ${r.slot}`, 'violet', 'calendar-check'); rerender(); } }); });

  /* ======================= Pharmacy ======================= */
  const daysTo = d => Math.round((new Date(d) - new Date(todayISO())) / 864e5);
  function renderPharmacy(c) {
    const d = D(), tab = ui.phtab || 'dispense';
    const queue = d.prescriptions.filter(r => r.status === 'sent'), low = d.drugs.filter(x => x.stock <= x.reorder), exp = d.drugs.filter(x => daysTo(x.expiry) <= 60);
    const value = d.drugs.reduce((s, x) => s + x.stock * x.price, 0);
    c.innerHTML = `<div class="fade-in space-y-5">
      ${tiles([tile('inbox', 'sky', 'Prescriptions to dispense', queue.length), tile('package-x', 'rose', 'Low / out of stock', low.length), tile('calendar-x', 'amber', 'Expiring in 60 days', exp.length), tile('indian-rupee', 'emerald', 'Stock value', inr(value))])}
      <div class="${card}">${toolbar(`${seg('phtab', [['dispense', 'Dispense', queue.length], ['stock', 'Inventory', d.drugs.length], ['ledger', 'Stock ledger']], tab)}<span class="flex-1"></span>
        ${btn('ghost', 'Counter sale', 'shopping-cart', 'data-pg="ph-otc"')}${btn('primary', 'Receive stock', 'package-plus', 'data-pg="ph-receive"')}`)}
        ${tab === 'dispense' ? (queue.length ? `<ul class="divide-y divide-slate-100 dark:divide-slate-800">${queue.map(r => `<li class="flex flex-wrap items-center gap-4 px-5 py-4">${person(r.patient, `${r.id} · ${esc(r.doctor)}`, 'sky')}
            <div class="min-w-[200px] flex-1 text-sm">${r.items.map(i => { const s = d.drugs.find(x => x.name === i.drug); return `<span class="mr-2 inline-flex items-center gap-1">${esc(i.drug)} ${s && s.stock === 0 ? badge('rose', 'Out') : ''}</span>`; }).join('')}</div>
            <span class="text-sm font-semibold tabular-nums">${inr(rxTotal(r))}</span>${btn('primary', 'Dispense', 'pill', `data-pg="ph-disp" data-id="${r.id}"`)}</li>`).join('')}</ul>`
          : empty('inbox', 'Queue is clear', 'Prescriptions sent by doctors appear here.'))
        : tab === 'stock' ? table(['Item', 'Batch · Expiry', 'Price', 'Stock', 'Status', ''], d.drugs.map(x => { const de = daysTo(x.expiry);
            return `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 ${ui.flash === x.id ? 'row-flash' : ''}">${td0(`<span class="font-medium">${esc(x.name)}</span><span class="block text-xs text-slate-500">${x.id} · ${x.form}</span>`)}
            ${td(`<span class="font-mono text-xs">${x.batch}</span><span class="block text-xs ${de <= 60 ? 'font-semibold text-amber-600' : 'text-slate-500'}">${fmtDate(x.expiry)}${de <= 60 ? ` · ${de} days` : ''}</span>`)}${td(inr(x.price), 'text-right tabular-nums')}
            ${td(`<span class="font-semibold tabular-nums">${x.stock.toLocaleString('en-IN')}</span><span class="block text-xs text-slate-400">reorder at ${x.reorder}</span>`, 'text-right')}
            ${td(x.stock === 0 ? badge('rose', 'Out of stock') : x.stock <= x.reorder ? badge('amber', 'Low') : badge('emerald', 'OK'))}${td(btn('ghost', 'Reorder', '', `data-pg="ph-po" data-id="${x.id}"`, 'h-8 px-3'), 'pr-5 text-right')}</tr>`; }).join(''), { min: '820px' })
        : table(['When', 'Movement', 'Item', 'Qty', 'By'], (d.ledger || (d.ledger = [
            { at: 'Today 09:40', kind: 'Dispense', item: 'Atorvastatin 20 mg', qty: -30, by: 'Sanjay Kumar', ref: 'RX-7802' }, { at: 'Today 08:10', kind: 'Receipt', item: 'Paracetamol 650 mg', qty: 1000, by: 'Sanjay Kumar', ref: 'GRN-412' },
            { at: 'Yesterday', kind: 'Return to vendor', item: 'Cough syrup 100 ml', qty: -24, by: 'Sanjay Kumar', ref: 'Expired' }, { at: 'Yesterday', kind: 'Adjustment', item: 'ORS sachet', qty: -3, by: 'Dr. Anita Sen', ref: 'Damaged' }])).map(l => `<tr>
            ${td0(esc(l.at))}${td(badge(l.qty > 0 ? 'emerald' : l.kind === 'Dispense' ? 'sky' : 'amber', l.kind) + `<span class="ml-1 font-mono text-xs text-slate-400">${esc(l.ref)}</span>`)}${td(esc(l.item))}${td(`<span class="font-semibold tabular-nums ${l.qty > 0 ? 'text-emerald-600' : 'text-rose-600'}">${l.qty > 0 ? '+' : ''}${l.qty}</span>`, 'text-right')}${td(esc(l.by))}</tr>`).join(''))}
        ${tab === 'ledger' ? '<p class="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800">Stock is an append-only ledger: every receipt, dispense, return and adjustment is a row. Balances are computed, never edited.</p>' : ''}</div></div>`;
    ui.flash = null;
  }
  const rxTotal = r => r.items.reduce((s, i) => { const x = D().drugs.find(d => d.name === i.drug); const qty = (i.freq === 'SOS' ? 1 : i.freq.split('-').reduce((a, b) => a + +b, 0)) * parseInt(i.dur, 10); return s + (x ? x.price / 10 * qty : 0); }, 0);
  on('ph-disp', el => { const d = D(), r = d.prescriptions.find(x => x.id === el.dataset.id);
    const out = r.items.filter(i => (d.drugs.find(x => x.name === i.drug) || {}).stock === 0);
    const go = () => { r.items.forEach(i => { const x = d.drugs.find(y => y.name === i.drug); if (x && x.stock) { const q = Math.min(x.stock, 10); x.stock -= q; (d.ledger || []).unshift({ at: 'Now', kind: 'Dispense', item: x.name, qty: -q, by: me().person, ref: r.id }); } });
      r.status = 'dispensed'; audit('pill', 'emerald', `<b>${who()}</b> dispensed ${r.id} for ${esc(r.patient)}`); toast('Dispensed', `${r.patient} · ${inr(rxTotal(r))} added to bill`, 'emerald', 'pill'); rerender(); };
    if (out.length) H().confirmDialog({ title: 'Some items are out of stock', text: `${out.map(i => i.drug).join(', ')} will be skipped. Dispense the rest?`, ok: 'Dispense available', tone: 'teal', icon: 'package-x', onOk: go }); else go(); });
  on('ph-po', el => { const x = D().drugs.find(y => y.id === el.dataset.id); toast('Purchase order drafted', `${x.name} · ${x.reorder * 3} units · awaiting approval`, 'sky', 'clipboard-list'); });
  on('ph-receive', () => { const d = D();
    modal({ title: 'Receive stock (GRN)', icon: 'package-plus', tone: 'emerald', ok: 'Add to stock', body: `<div class="grid gap-4 sm:grid-cols-2">${field('item', 'Item', { opts: d.drugs.map(x => [x.id, x.name]), full: true })}
      ${field('qty', 'Quantity', { type: 'number', req: true, min: 1, value: 100 })}${field('batch', 'Batch no.', { req: true, mono: true, ph: 'B24xxx' })}${field('expiry', 'Expiry', { type: 'date', req: true, value: iso(addDays(new Date(), 540)) })}${field('vendor', 'Vendor', { opts: ['MedPlus Distributors', 'Apollo Wholesale', 'Sun Pharma Direct'] })}</div>`,
      onSubmit: f => { const v = readForm(f, ['qty', 'batch', 'expiry']); if (!v) return false; const x = d.drugs.find(y => y.id === v.item);
        x.stock += +v.qty; x.batch = v.batch; x.expiry = v.expiry; (d.ledger || (d.ledger = [])).unshift({ at: 'Now', kind: 'Receipt', item: x.name, qty: +v.qty, by: me().person, ref: 'GRN-' + (413 + d.ledger.length) });
        ui.flash = x.id; ui.phtab = 'stock'; toast('Stock received', `${x.name} +${v.qty}`, 'emerald', 'package-check'); rerender(); } }); });
  on('ph-otc', () => toast('Counter sale', 'Walk-in sale of OTC items with a quick bill — designed in the billing flow.', 'slate', 'shopping-cart'));

  K.register({
    'dashboard:clinical':    { title: 'Clinical Overview', render: renderClinical },
    'patients:list':         { title: 'Patients', render: renderPatients },
    'patients:new':          { title: 'Register Patient', sub: 'Create one record per patient, shared across branches.', render: renderRegister },
    'appointments:calendar': { title: 'Appointment Calendar', render: renderCalendar },
    'appointments:queue':    { title: 'OPD Queue', sub: 'Booked → checked in → with doctor → done. Tokens are announced on the lobby TV.', render: renderQueue },
    'doctors:schedules':     { title: 'Doctor Schedules', render: renderSchedules },
    departments:             { title: 'Departments', render: renderDepartments },
    consultations:           { title: 'Consultations (EMR)', render: renderConsult },
    prescriptions:           { title: 'Prescriptions', render: renderRx },
    laboratory:              { title: 'Laboratory (LIS)', render: renderLab },
    radiology:               { title: 'Radiology (RIS)', render: renderRad },
    pharmacy:                { title: 'Pharmacy & Inventory', render: renderPharmacy },
  });
  window.PGCare = { openPatient, openRxComposer, labBadge, flagOf, rxSheet, RXS, LAB };
})();
