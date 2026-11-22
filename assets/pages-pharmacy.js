/* HMS demo — Pharmacies.
 * A pharmacy is one system with exactly ONE login (persona "pharmacy"). It sees the
 * prescriptions routed to it (typed or photographed), dispenses them and issues a payment
 * slip. A hospital can run several pharmacies; the admin adds them, manages each login and
 * compares their sales and revenue on the Pharmacies page.
 * Payment slips are ordinary invoices with { kind: 'pharmacy', pharmacy: <id>, rx: <rx id> },
 * so they also show on the patient profile, the portal and the billing list.
 * Not designed yet (later phases): medicine master bulk upload (CSV/Excel), purchase orders, stock.
 */
(() => {
  'use strict';
  const K = window.PG;
  const { esc, inr, T, D, can, me, card, badge, avatar, ico, tile, tiles, btn, iconBtn, seg, select, toolbar, cardHead, table, td, td0,
    person, empty, note, field, readForm, modal, on, rerender, chart, ui, iso, todayISO, addDays, fmtDate, fmtShort, nowTime, audit, who } = K;
  const H = () => window.HMS;
  const toast = (...a) => H().toast(...a);
  const S = () => window.PGRxScan;
  const isPharmacyUser = () => H().state.role === 'pharmacy';

  /* ---------------- data ---------------- */
  function seed(d) {
    const t = T(), br = t.branches.map(b => b.split(' · ')[0]);
    const list = t.slug === 'sun'
      ? [['Main Pharmacy', 0, 'Ground floor, OPD block', '24×7', 'pharmacy'], ['Emergency Pharmacy', 0, 'Next to Emergency', '24×7', 'pharmacy.er'], [`${br[1] || 'City'} Pharmacy`, 1, 'Lobby', '08:00–22:00', 'pharmacy.city']]
      : [['Main Pharmacy', 0, 'Reception', '09:00–21:00', 'pharmacy']];
    let r = 7;
    const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    d.pharmacies = list.map(([name, b, counter, hours, user], i) => ({
      id: 'PH-0' + (i + 1), name, branch: Math.min(b, t.branches.length - 1), counter, hours, status: 'active',
      license: `WB/DL/20B-${41200 + i * 37}`, phone: `033 4012 3${410 + i}`, created: iso(addDays(new Date(), -400 + i * 90)),
      login: { user, email: `${user}@${t.slug}hospital.in`, last: i === 0 ? 'Today, 08:02' : i === 1 ? 'Today, 07:55' : 'Yesterday, 21:40' },
      // 30 days of history for analytics (today is added live from slips).
      days: Array.from({ length: 30 }, (_, k) => { const base = [62, 34, 41][i] || 30, bills = Math.round(base * (0.75 + rnd() * 0.5) * (k % 7 === 0 ? 0.7 : 1));
        const avg = [420, 610, 380][i] || 400, sales = Math.round(bills * avg * (0.85 + rnd() * 0.3)); return { date: iso(addDays(new Date(), -(30 - k))), bills, rx: Math.round(bills * 0.72), sales, collected: Math.round(sales * (0.9 + rnd() * 0.08)) }; }),
      top: [['Paracetamol 650 mg', 0.22], ['Pantoprazole 40 mg', 0.14], ['Atorvastatin 20 mg', 0.12], ['Azithromycin 500 mg', 0.1], ['Cetirizine 10 mg', 0.08]],
    }));
  }
  const PH = () => { const d = D(); if (!d.pharmacies) seed(d); return d.pharmacies; };
  const phById = id => PH().find(p => p.id === id);
  const active = () => PH().filter(p => p.status === 'active');
  // Default pharmacy for a branch: first active one there, else any active one.
  const defaultFor = (b = H().state.branch) => active().find(p => p.branch === b) || active()[0] || null;
  const phOf = r => r.pharmacy || (r.pharmacy = (defaultFor() || {}).id);
  const myPh = () => isPharmacyUser() ? phById(ROLES.pharmacy.pharmacy) || PH()[0] : null;
  const branchName = i => (T().branches[i] || T().branches[0]).split(' · ')[0];
  const slips = id => D().invoices.filter(i => i.kind === 'pharmacy' && (!id || i.pharmacy === id));
  const today = id => { const s = slips(id).filter(i => i.date === todayISO()); return { bills: s.length, sales: s.reduce((a, i) => a + i.total, 0), collected: s.reduce((a, i) => a + i.paid, 0),
    rx: D().prescriptions.filter(r => r.status === 'dispensed' && r.date === todayISO() && phOf(r) === id).length }; };
  // Last n days incl. today for one pharmacy.
  const series = (p, n) => [...p.days.slice(-(n - 1)), { date: todayISO(), ...today(p.id) }];
  const sum = (arr, k) => arr.reduce((a, x) => a + (x[k] || 0), 0);

  /* ---------------- pharmacy home ---------------- */
  function renderHome(c) {
    const p = myPh() || PH()[0], d = D(), q = queueOf(p.id), t = today(p.id), due = slips(p.id).filter(i => i.status === 'due' || i.status === 'partial');
    c.innerHTML = `<div class="fade-in space-y-5">
      <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 p-6 text-white shadow-lg">
        <div class="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10"></div><div class="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/10"></div>
        <div class="relative flex flex-wrap items-center gap-4"><span class="grid h-12 w-12 place-items-center rounded-2xl bg-white/20">${ico('pill', 'h-6 w-6')}</span>
          <div class="min-w-[200px] flex-1"><h2 class="text-xl font-bold">${esc(p.name)}</h2><p class="text-sm text-emerald-50">${esc(branchName(p.branch))} · ${esc(p.counter)} · ${esc(p.hours)} · Licence ${esc(p.license)}</p></div>
          <button type="button" class="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-emerald-700 shadow hover:bg-emerald-50" data-nav="pharmacy:queue">${ico('inbox')}Open queue${q.length ? ` · ${q.length}` : ''}</button></div></div>
      ${tiles([tile('inbox', 'sky', 'Prescriptions waiting', q.length), tile('pill', 'emerald', 'Dispensed today', t.rx), tile('indian-rupee', 'teal', 'Sales today', inr(t.sales)), tile('clock', due.length ? 'rose' : 'slate', 'Unpaid slips', due.length, due.length ? inr(due.reduce((a, i) => a + i.total - i.paid, 0)) : '')])}
      <div class="grid gap-5 xl:grid-cols-3">
        <div class="${card} xl:col-span-2">${cardHead('Waiting to dispense', 'Newest first — sent by doctors or uploaded at the front desk', btn('ghost', 'All', 'arrow-right', 'data-nav="pharmacy:queue"', 'h-8 px-3'))}${queueList(q.slice(0, 5))}</div>
        <div class="${card}">${cardHead('Last 14 days', 'Sales from this pharmacy')}<div class="h-56 p-4"><canvas id="phHomeChart"></canvas></div></div></div>
      <div class="${card}">${cardHead('Payment slips today', `${t.bills} slips · ${inr(t.collected)} collected`, btn('ghost', 'Sales & slips', 'arrow-right', 'data-nav="pharmacy:sales"', 'h-8 px-3'))}${slipTable(slips(p.id).filter(i => i.date === todayISO()))}</div>
      ${note('sky', 'info', 'This is a <b>pharmacy account</b>: one login for the whole counter. Medicine bulk upload (CSV / Excel), purchase orders and stock come in a later phase.')}
    </div>`;
    const s = series(p, 14);
    chart(document.getElementById('phHomeChart'), { type: 'bar', data: { labels: s.map(x => fmtShort(x.date)), datasets: [{ data: s.map(x => x.sales), backgroundColor: s.map((x, i) => i === s.length - 1 ? '#059669' : 'rgba(5,150,105,.35)'), borderRadius: 6, maxBarThickness: 22 }] },
      options: { plugins: { tooltip: { callbacks: { label: x => inr(x.raw) } } }, scales: { y: { ticks: { callback: v => '₹' + Math.round(v / 1000) + 'k' } } } } });
  }

  /* ---------------- queue ---------------- */
  const queueOf = id => D().prescriptions.filter(r => r.status === 'sent' && (!id || phOf(r) === id));
  const rxLine = r => S().isScan(r)
    ? `<div class="flex items-center gap-3">${S().stack(r)}<span>${badge('violet', 'Paper prescription', 'scan-line')}<span class="mt-0.5 block text-xs text-slate-500">${r.pages.length} page${r.pages.length > 1 ? 's' : ''} · by ${esc(r.uploadedBy || '—')}</span></span></div>`
    : `<div><span class="text-sm">${r.items.map(i => esc(i.drug)).join(' · ')}</span><span class="mt-0.5 block text-xs text-slate-500">${badge('sky', 'Typed', 'file-text')} ${r.items.length} item${r.items.length > 1 ? 's' : ''}</span></div>`;
  const queueList = q => q.length ? `<ul class="divide-y divide-slate-100 dark:divide-slate-800">${q.map(r => `<li class="flex flex-wrap items-center gap-4 px-5 py-4 ${ui.flash === r.id ? 'row-flash' : ''}">
      <div class="w-48">${person(r.patient, `${r.id} · ${esc(r.doctor)}`, S().isScan(r) ? 'violet' : 'sky')}</div>
      <div class="min-w-[200px] flex-1">${rxLine(r)}</div>
      ${!isPharmacyUser() && PH().length > 1 ? `<span class="text-xs text-slate-500">${ico('store', 'mr-1 inline h-3.5 w-3.5')}${esc((phById(phOf(r)) || {}).name || '—')}</span>` : ''}
      <div class="flex gap-2">${btn('ghost', 'View', 'eye', `data-pg="rx-view" data-id="${r.id}"`)}${btn('primary', 'Dispense', 'pill', `data-pg="ph-dispense" data-id="${r.id}"`)}</div></li>`).join('')}</ul>`
    : empty('inbox', 'Queue is clear', 'Prescriptions sent to this pharmacy — typed by a doctor or photographed at the front desk — appear here.');

  function renderQueue(c) {
    const d = D(), mine = myPh(), f = mine ? mine.id : (ui.phf || 'all'), tab = ui.phq || 'waiting';
    const id = f === 'all' ? null : f, q = queueOf(id);
    const done = d.prescriptions.filter(r => r.status === 'dispensed' && (!id || phOf(r) === id));
    c.innerHTML = `<div class="fade-in space-y-5">
      ${tiles([tile('inbox', 'sky', 'Waiting', q.length), tile('scan-line', 'violet', 'Paper prescriptions', q.filter(S().isScan).length), tile('pill', 'emerald', 'Dispensed', done.length), tile('indian-rupee', 'teal', 'Sales today', inr(id ? today(id).sales : PH().reduce((a, p) => a + today(p.id).sales, 0)))])}
      <div class="${card}">${toolbar(`${seg('phq', [['waiting', 'To dispense', q.length], ['done', 'Dispensed', done.length]], tab)}<span class="flex-1"></span>
        ${mine ? `<span class="text-xs text-slate-500">${ico('store', 'mr-1 inline h-3.5 w-3.5')}${esc(mine.name)}</span>` : select('phf', [['all', 'All pharmacies'], ...PH().map(p => [p.id, p.name])], f, 'Pharmacy')}`)}
        ${tab === 'waiting' ? queueList(q) : table(['Prescription', 'Patient', 'Medicines', 'Slip', ''], done.map(r => { const sl = slips().find(i => i.rx === r.id);
          return `<tr>${td0(`<span class="font-mono text-xs font-semibold">${r.id}</span><span class="block text-xs text-slate-500">${fmtShort(r.date)} · ${esc(r.doctor)}</span>`)}${td(person(r.patient, r.mrn, 'sky'))}
          ${td(S().isScan(r) ? `<div class="flex items-center gap-2">${S().stack(r, 'h-10 w-8')}<span class="text-xs text-slate-500">${r.items.length} dispensed</span></div>` : r.items.map(i => esc(i.drug.split(' ')[0])).join(', '))}
          ${td(sl ? `<button type="button" class="font-mono text-xs font-semibold text-teal-700 hover:underline dark:text-teal-300" data-pg="inv-view" data-id="${sl.id}">${sl.id}</button> ${badge(...IST(sl.status))}` : '<span class="text-xs text-slate-400">Before slips</span>')}
          ${td(iconBtn('eye', 'View prescription', `data-pg="rx-view" data-id="${r.id}"`), 'pr-5 text-right')}</tr>`; }).join(''), { empty: 'Nothing dispensed yet.' })}</div></div>`;
    ui.flash = null;
  }
  const IST = s => ({ paid: ['emerald', 'Paid'], partial: ['amber', 'Part paid'], due: ['rose', 'Due'], refunded: ['slate', 'Refunded'] })[s] || ['slate', s];

  /* ---------------- dispense → payment slip ---------------- */
  const qtyOf = i => i.qty || (i.freq === 'SOS' ? 6 : (i.freq || '1-0-1').split('-').reduce((a, b) => a + +b, 0) * (parseInt(i.dur, 10) || 5));
  const unit = name => { const x = D().drugs.find(y => y.name === name); return x ? Math.round(x.price / 10 * 100) / 100 : 0; };
  on('ph-dispense', el => {
    const d = D(), r = d.prescriptions.find(x => x.id === el.dataset.id); if (!r) return;
    const pt = d.patients.find(x => x.mrn === r.mrn) || {};
    ui.phLines = (r.items.length ? r.items : [{ drug: d.drugs[0].name, freq: '1-0-1', dur: '5 days' }]).map(i => ({ drug: i.drug, freq: i.freq, dur: i.dur, note: i.note, qty: qtyOf(i) }));
    modal({ title: `Dispense ${r.id}`, sub: `${esc(r.patient)} · ${esc(r.doctor)}${S().isScan(r) ? ' · read the photo and pick the medicines' : ''}`, icon: 'pill', tone: 'emerald', size: 'max-w-5xl', ok: 'Dispense & create slip',
      body: `<div class="grid gap-5 lg:grid-cols-2"><div class="lg:sticky lg:top-0 lg:self-start">${S().isScan(r) ? S().sheet(r, 0) : window.PGCare.rxSheet(r)}</div>
        <div>${pt.allergies ? note('rose', 'triangle-alert', `<b>Allergy:</b> ${esc(pt.allergies)}`) + '<div class="h-3"></div>' : ''}
          <div class="mb-2 flex items-center justify-between"><p class="text-sm font-medium">Medicines to hand over</p>${btn('soft', 'Add line', 'plus', 'data-pg="phl-add"', 'h-8 px-3')}</div>
          <div id="phLines" class="space-y-2"></div>
          <div id="phTotal" class="mt-4 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60"></div>
          <div class="mt-4">${field('pay', 'Payment', { opts: [['now', 'Collect now at the counter'], ['later', 'Patient pays later (online / at billing)']] })}</div></div></div>`,
      onSubmit: f => {
        const lines = ui.phLines.filter(l => l.drug && l.qty > 0); if (!lines.length) { toast('Add at least one medicine', '', 'amber', 'pill'); return false; }
        const ph = phById(phOf(r)) || defaultFor();
        lines.forEach(l => { const x = d.drugs.find(y => y.name === l.drug); if (x && x.stock) x.stock -= Math.min(x.stock, l.qty); });
        r.items = lines.map(({ drug, freq, dur, note }) => ({ drug, freq, dur, note: note || '' })); r.status = 'dispensed'; r.dispensedBy = ph ? ph.name : me().person;
        const total = Math.round(lines.reduce((a, l) => a + l.qty * unit(l.drug), 0));
        const slip = { id: 'PHB-' + (5100 + slips().length), kind: 'pharmacy', pharmacy: ph && ph.id, rx: r.id, patient: r.patient, mrn: r.mrn, date: todayISO(), time: nowTime(),
          items: lines.map(l => ({ desc: l.drug, qty: l.qty, rate: unit(l.drug) })), total, paid: 0, mode: '', status: 'due', payer: 'Self' };
        d.invoices.unshift(slip); ui.flash = slip.id;
        audit('pill', 'emerald', `<b>${who()}</b> dispensed ${r.id} for ${esc(r.patient)} · slip ${slip.id} (${inr(total)})`);
        if (f.elements.pay.value === 'now') setTimeout(() => window.PGInvoice.collect(slip.id), 30);
        else { toast('Dispensed', `${r.patient} · slip ${slip.id} · ${inr(total)} due — patient can pay online`, 'emerald', 'receipt'); setTimeout(() => window.PGInvoice.view(slip.id), 30); }
        rerender();
      } });
    drawLines();
    document.getElementById('phLines').addEventListener('change', ev => { const t = ev.target, n = t.dataset.l; if (n == null) return; const l = ui.phLines[+n];
      if (t.dataset.k === 'qty') l.qty = Math.max(0, +t.value || 0); else { l[t.dataset.k] = t.value; if (t.dataset.k !== 'drug') l.qty = qtyOf({ freq: l.freq, dur: l.dur }); } drawLines(); });
  });
  function drawLines() {
    const d = D(), box = document.getElementById('phLines'); if (!box) return;
    box.innerHTML = ui.phLines.map((l, i) => { const s = d.drugs.find(x => x.name === l.drug);
      return `<div class="rounded-xl border border-slate-200 p-2.5 dark:border-slate-700"><div class="grid grid-cols-12 items-center gap-2">
        <select class="field col-span-11 !h-9" data-l="${i}" data-k="drug" aria-label="Medicine">${d.drugs.map(x => `<option ${x.name === l.drug ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
        <button type="button" class="col-span-1 rounded-lg p-1.5 text-slate-400 hover:text-rose-600" data-pg="phl-del" data-i="${i}" aria-label="Remove">${ico('trash-2')}</button>
        <select class="field col-span-3 !h-9" data-l="${i}" data-k="freq" aria-label="Frequency">${['1-0-0', '0-0-1', '1-0-1', '1-1-1', 'SOS'].map(x => `<option ${x === l.freq ? 'selected' : ''}>${x}</option>`).join('')}</select>
        <select class="field col-span-3 !h-9" data-l="${i}" data-k="dur" aria-label="Duration">${['3 days', '5 days', '7 days', '10 days', '30 days'].map(x => `<option ${x === l.dur ? 'selected' : ''}>${x}</option>`).join('')}</select>
        <label class="col-span-2"><span class="sr-only">Quantity</span><input type="number" min="0" class="field !h-9 tabular-nums" data-l="${i}" data-k="qty" value="${l.qty}"/></label>
        <span class="col-span-4 text-right text-xs"><span class="block font-semibold tabular-nums">${inr(l.qty * unit(l.drug))}</span>${s ? (s.stock === 0 ? badge('rose', 'Out of stock') : s.stock < l.qty ? badge('amber', `Only ${s.stock}`) : `<span class="text-slate-400">${inr(unit(l.drug))} each</span>`) : ''}</span></div></div>`; }).join('');
    const tot = ui.phLines.reduce((a, l) => a + l.qty * unit(l.drug), 0);
    document.getElementById('phTotal').innerHTML = `<div class="flex justify-between text-slate-500"><span>${ui.phLines.length} item${ui.phLines.length === 1 ? '' : 's'} · prices incl. 12% GST</span><span class="tabular-nums">GST ${inr(tot - tot / 1.12)}</span></div>
      <div class="mt-1 flex items-center justify-between"><span class="font-semibold">Slip total</span><span class="text-xl font-bold tabular-nums">${inr(tot)}</span></div>`;
    H().icons();
  }
  on('phl-add', () => { ui.phLines.push({ drug: D().drugs[1].name, freq: '1-0-1', dur: '5 days', qty: 10 }); drawLines(); });
  on('phl-del', el => { ui.phLines.splice(+el.dataset.i, 1); drawLines(); });

  /* ---------------- sales & slips ---------------- */
  const slipTable = list => table(['Slip', 'Patient', 'Medicines', 'Total', 'Due', 'Status', ''], list.map(i => `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 ${ui.flash === i.id ? 'row-flash' : ''}">
      ${td0(`<button type="button" class="font-mono text-xs font-semibold text-teal-700 hover:underline dark:text-teal-300" data-pg="inv-view" data-id="${i.id}">${i.id}</button><span class="block text-xs text-slate-500">${fmtShort(i.date)}${i.time ? ' · ' + i.time : ''} · ${esc(i.rx || 'Counter')}</span>`)}
      ${td(person(i.patient, i.mrn, 'emerald'))}${td(`<span class="block max-w-[220px] truncate">${i.items.map(x => esc(x.desc)).join(', ')}</span>`)}
      ${td(inr(i.total), 'text-right font-semibold tabular-nums')}${td(i.total - i.paid ? `<span class="font-semibold text-rose-600">${inr(i.total - i.paid)}</span>` : '—', 'text-right tabular-nums')}${td(badge(...IST(i.status)) + (i.mode ? `<span class="ml-1 text-xs text-slate-400">${esc(i.mode)}</span>` : ''))}
      ${td(`<div class="flex justify-end gap-1">${i.status === 'due' || i.status === 'partial' ? btn('soft', 'Collect', '', `data-pg="inv-pay" data-id="${i.id}"`, 'h-8 px-3') : ''}${iconBtn('receipt', 'Payment slip', `data-pg="inv-view" data-id="${i.id}"`)}</div>`, 'pr-5')}</tr>`).join(''), { min: '880px', empty: 'No slips yet — they’re created when you dispense.' });

  function renderSales(c) {
    const mine = myPh(), f = mine ? mine.id : (ui.phf || 'all'), id = f === 'all' ? null : f, st = ui.phst || 'all';
    const all = slips(id), list = all.filter(i => st === 'all' || (st === 'due' ? i.status === 'due' || i.status === 'partial' : i.status === st));
    const ps = id ? [phById(id)] : PH(), s30 = ps.flatMap(p => series(p, 30));
    c.innerHTML = `<div class="fade-in space-y-5">
      ${tiles([tile('indian-rupee', 'emerald', 'Sales · last 30 days', inr(sum(s30, 'sales'))), tile('wallet', 'teal', 'Collected · last 30 days', inr(sum(s30, 'collected'))),
        tile('receipt', 'sky', 'Slips today', all.filter(i => i.date === todayISO()).length), tile('clock', 'rose', 'Unpaid', inr(all.reduce((a, i) => a + i.total - i.paid, 0)))])}
      <div class="${card}">${cardHead('Daily sales', id ? esc(phById(id).name) : 'All pharmacies', mine ? '' : select('phf', [['all', 'All pharmacies'], ...PH().map(p => [p.id, p.name])], f, 'Pharmacy'))}<div class="h-64 p-4"><canvas id="phSalesChart"></canvas></div></div>
      <div class="${card}">${toolbar(`${seg('phst', [['all', 'All', all.length], ['due', 'Unpaid', all.filter(i => i.status === 'due' || i.status === 'partial').length], ['paid', 'Paid', all.filter(i => i.status === 'paid').length]], st)}<span class="flex-1"></span>
        <span class="text-xs text-slate-500">Payment slips use the invoice design chosen by the admin.</span>`)}${slipTable(list)}</div></div>`;
    const days = series(ps[0], 30).map(x => x.date);
    chart(document.getElementById('phSalesChart'), { type: 'line', data: { labels: days.map(fmtShort), datasets: [
      { label: 'Sales', data: days.map((_, k) => ps.reduce((a, p) => a + series(p, 30)[k].sales, 0)), borderColor: '#059669', backgroundColor: 'rgba(5,150,105,.12)', fill: true, tension: .35, pointRadius: 0 },
      { label: 'Collected', data: days.map((_, k) => ps.reduce((a, p) => a + series(p, 30)[k].collected, 0)), borderColor: '#0284c7', borderDash: [5, 4], tension: .35, pointRadius: 0 }] },
      options: { interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: true, position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: x => `${x.dataset.label}: ${inr(x.raw)}` } } }, scales: { y: { ticks: { callback: v => '₹' + Math.round(v / 1000) + 'k' } } } } });
    ui.flash = null;
  }

  /* ---------------- admin: pharmacies + analytics ---------------- */
  const PAL = ['#059669', '#0284c7', '#d97706', '#7c3aed', '#e11d48', '#0d9488'];
  function renderAdmin(c) {
    const n = +(ui.phper || 30), ps = PH(), stat = p => { const s = series(p, n); return { s, sales: sum(s, 'sales'), coll: sum(s, 'collected'), bills: sum(s, 'bills'), rx: sum(s, 'rx') }; };
    const st = ps.map(p => ({ p, ...stat(p) })), tot = sum(st, 'sales') || 1;
    // Compare with the previous period only when the full earlier window exists.
    const prev = 2 * n - 1 <= 30 ? ps.reduce((a, p) => a + sum(p.days.slice(-(2 * n - 1), -(n - 1)), 'sales'), 0) : 0, growth = prev ? Math.round((sum(st, 'sales') / prev - 1) * 1000) / 10 : 0;
    c.innerHTML = `<div class="fade-in space-y-5">
      ${tiles([tile('store', 'emerald', 'Pharmacies', `${active().length}<span class="text-sm font-medium text-slate-400"> / ${ps.length}</span>`, 'active'), tile('indian-rupee', 'teal', `Sales · ${n} days`, inr(sum(st, 'sales')), prev ? `${growth >= 0 ? '+' : ''}${growth}%` : ''),
        tile('wallet', 'sky', `Collected · ${n} days`, inr(sum(st, 'coll')), Math.round(sum(st, 'coll') / tot * 100) + '%'), tile('file-text', 'violet', `Prescriptions filled · ${n} days`, sum(st, 'rx').toLocaleString('en-IN'))])}
      <div class="grid gap-5 xl:grid-cols-3">
        <div class="${card} xl:col-span-2">${cardHead('Revenue by pharmacy', 'Daily sales', seg('phper', [['7', '7 days'], ['14', '14 days'], ['30', '30 days']], String(n)))}<div class="h-72 p-4"><canvas id="phAdmChart"></canvas></div></div>
        <div class="${card}">${cardHead('Share of sales', `Last ${n} days`)}<div class="h-44 p-4"><canvas id="phAdmShare"></canvas></div>
          <ul class="space-y-2 px-5 pb-5">${st.map((x, i) => `<li class="flex items-center gap-2 text-sm"><span class="h-2.5 w-2.5 rounded-full" style="background:${PAL[i % PAL.length]}"></span><span class="flex-1 truncate">${esc(x.p.name)}</span><span class="font-semibold tabular-nums">${Math.round(x.sales / tot * 100)}%</span></li>`).join('')}</ul></div></div>
      <div class="flex flex-wrap items-center gap-3"><h3 class="font-semibold">Pharmacies</h3><span class="text-xs text-slate-500">Each pharmacy has exactly one login.</span><span class="flex-1"></span>${btn('primary', 'Add pharmacy', 'plus', 'data-pg="ph-add"')}</div>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">${st.map((x, i) => { const p = x.p, off = p.status !== 'active', q = queueOf(p.id).length;
        return `<article class="${card} overflow-hidden ${off ? 'opacity-70' : ''} ${ui.flash === p.id ? 'row-flash' : ''}"><div class="h-1.5" style="background:${PAL[i % PAL.length]}"></div><div class="p-5">
          <div class="flex items-start gap-3"><span class="grid h-11 w-11 place-items-center rounded-xl ${K.tone('emerald')}">${ico('store', 'h-5 w-5')}</span>
            <div class="min-w-0 flex-1"><p class="truncate font-semibold">${esc(p.name)}</p><p class="truncate text-xs text-slate-500">${esc(branchName(p.branch))} · ${esc(p.counter)} · ${esc(p.hours)}</p></div>${off ? badge('slate', 'Paused') : badge('emerald', 'Active')}</div>
          <div class="mt-4 grid grid-cols-3 gap-2 text-center">${[['Sales', inr(x.sales)], ['Bills', x.bills.toLocaleString('en-IN')], ['Avg bill', inr(x.bills ? x.sales / x.bills : 0)]].map(([l, v]) => `<div class="rounded-xl bg-slate-50 px-2 py-2 dark:bg-slate-800/60"><p class="text-sm font-bold tabular-nums">${v}</p><p class="text-[11px] text-slate-500">${l}</p></div>`).join('')}</div>
          <div class="mt-3 h-10"><canvas id="phSpark${i}"></canvas></div>
          <div class="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">${ico('key-round', 'h-3.5 w-3.5 text-slate-400')}<span class="flex-1 truncate"><b class="font-mono">${esc(p.login.user)}</b> · last sign-in ${esc(p.login.last)}</span>${q ? badge('sky', q + ' waiting') : ''}</div>
          <div class="mt-4 flex flex-wrap gap-2">${btn('soft', 'Analytics', 'chart-line', `data-pg="ph-stats" data-id="${p.id}"`, 'h-8 px-3')}${btn('ghost', 'Login', 'key-round', `data-pg="ph-login" data-id="${p.id}"`, 'h-8 px-3')}${btn('ghost', off ? 'Activate' : 'Pause', off ? 'play' : 'pause', `data-pg="ph-toggle" data-id="${p.id}"`, 'h-8 px-3')}</div></div></article>`; }).join('')}</div>
      <div class="${card}">${cardHead('Compare', `Last ${n} days`)}${table(['Pharmacy', 'Bills', 'Prescriptions', 'Sales', 'Collected', 'Dues', 'Share'], st.map((x, i) => `<tr>${td0(`<span class="inline-flex items-center gap-2 font-medium"><span class="h-2.5 w-2.5 rounded-full" style="background:${PAL[i % PAL.length]}"></span>${esc(x.p.name)}</span>`)}
        ${td(x.bills.toLocaleString('en-IN'), 'tabular-nums')}${td(x.rx.toLocaleString('en-IN'), 'tabular-nums')}${td(inr(x.sales), 'text-right font-semibold tabular-nums')}${td(inr(x.coll), 'text-right tabular-nums')}${td(inr(x.sales - x.coll), 'text-right tabular-nums text-rose-600')}
        ${td(`<div class="flex items-center gap-2"><div class="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full rounded-full" style="width:${x.sales / tot * 100}%;background:${PAL[i % PAL.length]}"></div></div><span class="text-xs tabular-nums">${Math.round(x.sales / tot * 100)}%</span></div>`)}</tr>`).join(''), { min: '760px' })}</div>
      ${note('sky', 'info', 'Coming later for each pharmacy: medicine master <b>bulk upload (CSV / Excel)</b>, purchase orders and goods receipt, and stock. Not designed in this demo yet.')}
    </div>`;
    const labels = st[0].s.map(x => fmtShort(x.date));
    chart(document.getElementById('phAdmChart'), { type: 'line', data: { labels, datasets: st.map((x, i) => ({ label: x.p.name, data: x.s.map(y => y.sales), borderColor: PAL[i % PAL.length], backgroundColor: PAL[i % PAL.length], tension: .35, pointRadius: 0, borderWidth: 2 })) },
      options: { interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: true, position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: x => `${x.dataset.label}: ${inr(x.raw)}` } } }, scales: { y: { ticks: { callback: v => '₹' + Math.round(v / 1000) + 'k' } } } } });
    chart(document.getElementById('phAdmShare'), { type: 'doughnut', data: { labels: st.map(x => x.p.name), datasets: [{ data: st.map(x => x.sales), backgroundColor: st.map((_, i) => PAL[i % PAL.length]), borderWidth: 0 }] }, options: { cutout: '70%', plugins: { tooltip: { callbacks: { label: x => `${x.label}: ${inr(x.raw)}` } } } } });
    st.forEach((x, i) => chart(document.getElementById('phSpark' + i), { type: 'line', data: { labels, datasets: [{ data: x.s.map(y => y.sales), borderColor: PAL[i % PAL.length], backgroundColor: PAL[i % PAL.length] + '22', fill: true, tension: .4, pointRadius: 0, borderWidth: 1.5 }] },
      options: { plugins: { tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, animation: false } }));
    ui.flash = null;
  }

  on('ph-stats', el => { const p = phById(el.dataset.id), s = series(p, 30), t = today(p.id), sl = slips(p.id).slice(0, 6);
    modal({ title: p.name, sub: `${esc(branchName(p.branch))} · ${esc(p.counter)} · licence ${esc(p.license)}`, icon: 'chart-line', tone: 'emerald', size: 'max-w-3xl', foot: false,
      body: `<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">${[['Sales · 30d', inr(sum(s, 'sales'))], ['Collected · 30d', inr(sum(s, 'collected'))], ['Bills · 30d', sum(s, 'bills').toLocaleString('en-IN')], ['Today', inr(t.sales)]].map(([l, v]) => `<div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><p class="text-lg font-bold tabular-nums">${v}</p><p class="text-xs text-slate-500">${l}</p></div>`).join('')}</div>
        <div class="mt-4 h-56"><canvas id="phStatChart"></canvas></div>
        <div class="mt-5 grid gap-5 sm:grid-cols-2"><div><p class="mb-2 text-sm font-semibold">Top medicines</p><ul class="space-y-2">${p.top.map(([m, f]) => `<li class="text-sm"><div class="flex justify-between"><span>${esc(m)}</span><span class="tabular-nums text-slate-500">${inr(sum(s, 'sales') * f)}</span></div><div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full rounded-full bg-emerald-500" style="width:${f * 400}%"></div></div></li>`).join('')}</ul></div>
          <div><p class="mb-2 text-sm font-semibold">Latest slips</p><ul class="divide-y divide-slate-100 text-sm dark:divide-slate-800">${sl.map(i => `<li class="flex items-center gap-2 py-2"><button type="button" class="font-mono text-xs font-semibold text-teal-700 hover:underline dark:text-teal-300" data-pg="inv-view" data-id="${i.id}">${i.id}</button><span class="flex-1 truncate text-slate-500">${esc(i.patient)}</span><span class="tabular-nums">${inr(i.total)}</span>${badge(...IST(i.status))}</li>`).join('') || '<li class="py-4 text-center text-slate-500">No slips today yet.</li>'}</ul></div></div>` });
    chart(document.getElementById('phStatChart'), { type: 'bar', data: { labels: s.map(x => fmtShort(x.date)), datasets: [{ label: 'Sales', data: s.map(x => x.sales), backgroundColor: 'rgba(5,150,105,.55)', borderRadius: 4 }, { label: 'Collected', data: s.map(x => x.collected), backgroundColor: 'rgba(2,132,199,.45)', borderRadius: 4 }] },
      options: { plugins: { legend: { display: true, position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: x => `${x.dataset.label}: ${inr(x.raw)}` } } }, scales: { y: { ticks: { callback: v => '₹' + Math.round(v / 1000) + 'k' } } } } });
  });
  on('ph-toggle', el => { const p = phById(el.dataset.id);
    if (p.status === 'active' && active().length === 1) return toast('Keep one pharmacy active', 'Prescriptions need somewhere to go.', 'amber', 'store');
    H().confirmDialog({ title: p.status === 'active' ? `Pause ${p.name}?` : `Activate ${p.name}?`, text: p.status === 'active' ? 'Its login is blocked and new prescriptions go to another pharmacy. History stays.' : 'Its login works again and it can receive prescriptions.',
      ok: p.status === 'active' ? 'Pause' : 'Activate', tone: p.status === 'active' ? 'rose' : 'teal', icon: 'store', onOk: () => {
        p.status = p.status === 'active' ? 'paused' : 'active'; ui.flash = p.id;
        if (p.status !== 'active') D().prescriptions.filter(r => r.status === 'sent' && r.pharmacy === p.id).forEach(r => { r.pharmacy = (defaultFor(p.branch) || {}).id; });
        audit('store', 'slate', `<b>${who()}</b> ${p.status === 'active' ? 'activated' : 'paused'} ${esc(p.name)}`); toast(p.status === 'active' ? 'Pharmacy active' : 'Pharmacy paused', p.name, 'teal', 'store'); rerender(); } }); });
  on('ph-login', el => { const p = phById(el.dataset.id);
    modal({ title: 'Pharmacy login', sub: esc(p.name), icon: 'key-round', tone: 'emerald', foot: `${btn('ghost', 'Close', '', 'data-close-modal')}${btn('primary', 'Reset password', 'rotate-ccw-key', `data-pg="ph-reset" data-id="${p.id}"`)}`,
      body: `${note('sky', 'info', 'A pharmacy is one system, so it has <b>exactly one login</b>. Staff at the counter share it; every action is logged against the pharmacy.')}
        <div class="mt-4">${K.dl([['Username', `<span class="font-mono">${esc(p.login.user)}</span>`], ['Email', esc(p.login.email)], ['Last sign-in', esc(p.login.last)], ['Status', p.status === 'active' ? badge('emerald', 'Active') : badge('slate', 'Paused')]])}</div>` }); });
  on('ph-reset', el => { const p = phById(el.dataset.id), pw = 'Ph' + Math.random().toString(36).slice(2, 7) + '@' + (10 + Math.floor(Math.random() * 89));
    K.$('#pgPanel .max-h-\\[70vh\\]').insertAdjacentHTML('beforeend', `<div class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10"><p class="text-xs text-emerald-700 dark:text-emerald-300">Temporary password — shown once, must be changed at first sign-in</p><p class="mt-1 font-mono text-lg font-bold">${pw}</p></div>`);
    audit('key-round', 'amber', `<b>${who()}</b> reset the login of ${esc(p.name)}`); toast('Password reset', `${p.login.user} · old sessions signed out`, 'emerald', 'key-round'); });
  on('ph-add', () => { const t = T();
    modal({ title: 'Add pharmacy', sub: 'It gets one login of its own', icon: 'store', tone: 'emerald', ok: 'Create pharmacy',
      body: `<div class="grid gap-4 sm:grid-cols-2">${field('name', 'Pharmacy name', { req: true, ph: 'e.g. OPD Pharmacy', full: true })}${field('branch', 'Branch', { opts: t.branches.map((b, i) => [i, b.split(' · ')[0]]) })}${field('hours', 'Hours', { opts: ['24×7', '08:00–22:00', '09:00–21:00'] })}
        ${field('counter', 'Location', { ph: 'e.g. 1st floor, near lifts' })}${field('license', 'Drug licence no.', { req: true, mono: true, ph: 'WB/DL/20B-xxxxx' })}${field('user', 'Login username', { req: true, mono: true, ph: 'pharmacy.opd', help: 'One username per pharmacy' })}${field('email', 'Login email', { type: 'email', req: true, ph: 'opd.pharmacy@hospital.in' })}</div>`,
      onSubmit: f => { const v = readForm(f, ['name', 'license', 'user', 'email']); if (!v) return false;
        if (PH().some(p => p.login.user === v.user.trim().toLowerCase())) { toast('Username taken', 'Each pharmacy needs its own username.', 'rose', 'key-round'); return false; }
        const p = { id: 'PH-0' + (PH().length + 1), name: v.name.trim(), branch: +v.branch, counter: v.counter || '—', hours: v.hours, status: 'active', license: v.license, phone: '—', created: todayISO(),
          login: { user: v.user.trim().toLowerCase(), email: v.email, last: 'Never' }, days: Array.from({ length: 30 }, (_, k) => ({ date: iso(addDays(new Date(), -(30 - k))), bills: 0, rx: 0, sales: 0, collected: 0 })), top: PH()[0].top.map(([m]) => [m, 0]) };
        PH().push(p); ui.flash = p.id; audit('store', 'emerald', `<b>${who()}</b> added pharmacy ${esc(p.name)}`); toast('Pharmacy created', `${p.name} · invite sent to ${v.email}`, 'emerald', 'store'); rerender(); } }); });

  K.register({
    'home:pharmacy':  { title: 'Pharmacy', sub: 'Prescriptions sent to this pharmacy, dispensing and today’s sales.', render: renderHome },
    'pharmacy:queue': { title: 'Prescriptions', sub: 'Dispense what doctors sent — typed or photographed — and issue a payment slip.', render: renderQueue },
    'pharmacy:sales': { title: 'Sales & Payment Slips', sub: 'Every slip from this pharmacy, paid or due.', render: renderSales },
    pharmacies:       { title: 'Pharmacies', sub: 'Every pharmacy in the hospital: its single login, status, sales and revenue.', render: renderAdmin },
  });
  window.PGPharmacy = { PH, active, defaultFor, phById, phOf, myPh };
})();
