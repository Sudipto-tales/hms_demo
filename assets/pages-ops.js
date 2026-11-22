/* HMS demo — Operations & administration pages: analytics, billing, beds, emergency,
 * communication channels, settings, audit log. */
(() => {
  'use strict';
  const K = window.PG;
  const { esc, inr, T, D, can, me, card, badge, avatar, ico, tile, tiles, btn, iconBtn, seg, search, select, toolbar, cardHead,
    table, td, td0, person, empty, bar, dl, note, field, readForm, modal, on, rerender, chart, ui,
    iso, todayISO, addDays, fmtDate, fmtShort, nowTime, monthName, audit, who } = K;
  const H = () => window.HMS;
  const toast = (...a) => H().toast(...a);
  const branchName = i => (T().branches[i] || T().branches[0]).split(' · ')[0];

  /* ======================= Analytics ======================= */
  function renderAnalytics(c) {
    const t = T(), d = D(), period = ui.aper || 'month';
    const rev = t.stats.revenue, k = period === 'month' ? 1 : period === 'quarter' ? 2.9 : 11.4;
    const byDept = [['Cardiology', .27], ['Orthopedics', .19], ['Pharmacy', .17], ['Laboratory', .13], ['Pediatrics', .1], ['IPD / Beds', .09], ['Dermatology', .05]];
    const docs = t.doctors.map((x, i) => ({ name: x.name, spec: x.spec, seen: Math.round((x.seen || 8) * 22 * k), rev: Math.round((x.seen || 8) * 22 * k * (x.fee || 600)), rating: [4.8, 4.6, 4.7, 4.4, 4.5][i % 5] }));
    const dues = d.invoices.filter(i => i.status !== 'paid');
    c.innerHTML = `<div class="fade-in space-y-5">
      <div class="flex flex-wrap items-center gap-3">${seg('aper', [['month', monthName()], ['quarter', 'This quarter'], ['year', 'FY 2026–27']], period)}<span class="flex-1"></span>
        ${btn('ghost', 'Export CSV', 'file-spreadsheet', 'data-pg="an-export" data-f="CSV"')}${btn('ghost', 'Export PDF', 'file-down', 'data-pg="an-export" data-f="PDF"')}</div>
      ${tiles([tile('indian-rupee', 'emerald', 'Gross revenue', inr(rev * k), '+9.4%'), tile('users', 'teal', 'Patient footfall', Math.round(t.stats.appts * 24 * k).toLocaleString('en-IN'), '+6.1%'),
        tile('receipt', 'amber', 'Outstanding dues', inr(dues.reduce((s, i) => s + i.total - i.paid, 0) * 14 * k)), tile('trending-up', 'sky', 'Avg. bill value', inr(d.invoices.reduce((s, i) => s + i.total, 0) / Math.max(1, d.invoices.length)))])}
      <div class="grid gap-5 lg:grid-cols-3">
        <div class="${card} lg:col-span-2">${cardHead('Revenue vs collections', 'Last 14 days · ₹')}<div class="h-72 p-4"><canvas id="pgRevChart"></canvas></div></div>
        <div class="${card}">${cardHead('Revenue by department')}<div class="h-56 p-4"><canvas id="pgDeptChart"></canvas></div>
          <ul class="space-y-1.5 px-5 pb-5 text-sm">${byDept.slice(0, 4).map(([n, p], i) => `<li class="flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-full" style="background:${PAL[i]}"></span><span class="flex-1">${n}</span><span class="tabular-nums text-slate-500">${Math.round(p * 100)}%</span></li>`).join('')}</ul></div>
      </div>
      <div class="grid gap-5 lg:grid-cols-2">
        <div class="${card}">${cardHead('Doctor productivity', period === 'month' ? 'This month' : period)}
          ${table(['Doctor', 'Patients', 'Revenue', 'Rating'], docs.sort((a, b) => b.rev - a.rev).map(x => `<tr>${td0(person(x.name, x.spec, 'teal'))}${td(x.seen.toLocaleString('en-IN'), 'tabular-nums')}${td(inr(x.rev), 'text-right tabular-nums')}${td(`<span class="inline-flex items-center gap-1">${ico('star', 'h-3.5 w-3.5 text-amber-500')}${x.rating}</span>`)}</tr>`).join(''), { min: '480px' })}</div>
        <div class="${card}">${cardHead('Collections by payment mode')}<div class="space-y-4 p-5">${[['UPI', 46, 'teal'], ['Cash', 24, 'amber'], ['Card', 17, 'sky'], ['Insurance / TPA', 13, 'violet']].map(([m, p, tn]) => `<div><div class="mb-1 flex justify-between text-sm"><span>${m}</span><span class="tabular-nums text-slate-500">${inr(rev * k * p / 100)} · ${p}%</span></div>${bar(p * 2, tn)}</div>`).join('')}
          ${note('sky', 'info', 'Every figure here is scoped to <b>' + esc(t.name) + '</b>. Other tenants on the platform are never mixed in.')}</div></div>
      </div></div>`;
    const days = Array.from({ length: 14 }, (_, i) => fmtShort(addDays(new Date(), i - 13)));
    chart(document.getElementById('pgRevChart'), { type: 'line', data: { labels: days, datasets: [
      { label: 'Billed', data: t.revenue.map(v => v * k), borderColor: '#0d9488', backgroundColor: 'rgba(13,148,136,.12)', fill: true, tension: .35, pointRadius: 0, borderWidth: 2 },
      { label: 'Collected', data: t.revenue.map((v, i) => v * k * (.78 + (i % 4) * .05)), borderColor: '#d97706', borderDash: [5, 4], tension: .35, pointRadius: 0, borderWidth: 2 }] },
      options: { interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: true, position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: x => `${x.dataset.label}: ${inr(x.raw)}` } } },
        scales: { y: { ticks: { callback: v => '₹' + (v / 1000) + 'k' } } } } });
    chart(document.getElementById('pgDeptChart'), { type: 'doughnut', data: { labels: byDept.map(x => x[0]), datasets: [{ data: byDept.map(x => x[1]), backgroundColor: PAL, borderWidth: 0 }] }, options: { cutout: '68%' } });
  }
  const PAL = ['#0d9488', '#0284c7', '#d97706', '#7c3aed', '#e11d48', '#059669', '#64748b'];
  on('an-export', el => toast(`Exporting ${el.dataset.f}`, `${T().name} analytics · ${ui.aper || 'month'} · download starts shortly`, 'teal', 'download'));

  /* ======================= Billing ======================= */
  const IST = { paid: ['emerald', 'Paid'], partial: ['amber', 'Part paid'], due: ['rose', 'Due'], refunded: ['slate', 'Refunded'] };
  function renderBilling(c) {
    const d = D(), st = ui.bst || 'all', q = (ui.bq || '').toLowerCase();
    const list = d.invoices.filter(i => (st === 'all' || i.status === st) && (!q || (i.patient + i.id + i.mrn).toLowerCase().includes(q)));
    const today = d.invoices.filter(i => i.date === todayISO()), collected = today.reduce((s, i) => s + i.paid, 0);
    const n = s => d.invoices.filter(i => i.status === s).length;
    c.innerHTML = `<div class="fade-in space-y-5">
      ${tiles([tile('indian-rupee', 'emerald', 'Collected today', inr(collected)), tile('receipt', 'teal', 'Invoices today', today.length), tile('clock', 'rose', 'Pending dues', inr(d.invoices.reduce((s, i) => s + i.total - i.paid, 0))), tile('shield-check', 'violet', 'Insurance claims', d.invoices.filter(i => i.payer !== 'Self').length)])}
      <div class="${card}">${toolbar(`${seg('bst', [['all', 'All', d.invoices.length], ['due', 'Due', n('due')], ['partial', 'Part paid', n('partial')], ['paid', 'Paid', n('paid')]], st)}
        ${search('bq', ui.bq || '', 'Search invoice or patient')}<span class="flex-1"></span>
        ${can('report:finance') ? btn('ghost', 'Day-end report', 'file-bar-chart', 'data-pg="bill-dayend"') : ''}${btn('primary', 'New invoice', 'plus', 'data-pg="inv-new"')}`)}
        ${table(['Invoice', 'Patient', 'Items', 'Payer', 'Total', 'Due', 'Status', ''], list.map(i => `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 ${ui.flash === i.id ? 'row-flash' : ''}">
          ${td0(`<button type="button" class="font-mono text-xs font-semibold text-teal-700 hover:underline dark:text-teal-300" data-pg="inv-view" data-id="${i.id}">${i.id}</button><span class="block text-xs text-slate-500">${fmtShort(i.date)}</span>`)}
          ${td(person(i.patient, i.mrn, 'amber'))}${td(`<span class="block max-w-[200px] truncate">${i.items.map(x => esc(x.desc)).join(', ')}</span>`)}${td(i.payer === 'Self' ? '<span class="text-xs text-slate-500">Self</span>' : badge('violet', i.payer))}
          ${td(inr(i.total), 'text-right font-semibold tabular-nums')}${td(i.total - i.paid ? `<span class="font-semibold text-rose-600">${inr(i.total - i.paid)}</span>` : '—', 'text-right tabular-nums')}${td(badge(...IST[i.status]))}
          ${td(`<div class="flex justify-end gap-1">${i.status !== 'paid' && i.status !== 'refunded' && can('payment:collect') ? btn('soft', 'Collect', '', `data-pg="inv-pay" data-id="${i.id}"`, 'h-8 px-3') : ''}${iconBtn('eye', 'View', `data-pg="inv-view" data-id="${i.id}"`)}</div>`, 'pr-5')}</tr>`).join(''), { min: '960px', empty: 'No invoices.' })}</div></div>`;
    ui.flash = null;
  }
  function invSheet(i) {
    return `<div class="rounded-xl border border-slate-200 text-sm dark:border-slate-700"><div class="flex justify-between border-b border-slate-200 p-4 dark:border-slate-700"><div><p class="font-bold text-teal-700 dark:text-teal-300">${esc(T().name)}</p><p class="text-xs text-slate-500">GSTIN ${esc(D().settings.profile.gstin)}</p></div><div class="text-right"><p class="font-mono font-semibold">${i.id}</p><p class="text-xs text-slate-500">${fmtDate(i.date)}</p></div></div>
      <div class="px-4 py-3 text-xs"><b>${esc(i.patient)}</b> · ${i.mrn} · Payer: ${esc(i.payer)}</div>
      <table class="w-full"><tbody class="divide-y divide-slate-100 dark:divide-slate-800">${i.items.map(x => `<tr><td class="px-4 py-2">${esc(x.desc)}</td><td class="px-4 py-2 text-right text-slate-500">${x.qty} × ${inr(x.rate)}</td><td class="px-4 py-2 text-right tabular-nums">${inr(x.qty * x.rate)}</td></tr>`).join('')}</tbody></table>
      <div class="space-y-1 border-t border-slate-200 p-4 text-right dark:border-slate-700"><p>Total <b class="ml-4 tabular-nums">${inr(i.total)}</b></p><p class="text-emerald-600">Paid <b class="ml-4 tabular-nums">${inr(i.paid)}</b>${i.mode ? ` <span class="text-xs">(${i.mode})</span>` : ''}</p>${i.total - i.paid ? `<p class="text-rose-600">Balance <b class="ml-4 tabular-nums">${inr(i.total - i.paid)}</b></p>` : ''}</div></div>`;
  }
  on('inv-view', el => { const i = D().invoices.find(x => x.id === el.dataset.id);
    modal({ title: i.id, sub: `${i.patient} · ${IST[i.status][1]}`, icon: 'receipt', tone: 'amber', size: 'max-w-xl', body: invSheet(i),
      foot: `${btn('ghost', 'Print', 'printer', 'data-pg="print"')}${btn('ghost', 'WhatsApp receipt', 'message-circle', `data-pg="inv-wa" data-id="${i.id}"`)}
        ${i.paid && can('payment:refund') && i.status !== 'refunded' ? btn('ghost', 'Refund', 'undo-2', `data-pg="inv-refund" data-id="${i.id}"`) : ''}
        ${i.status !== 'paid' && i.status !== 'refunded' && can('payment:collect') ? btn('primary', 'Collect payment', 'indian-rupee', `data-pg="inv-pay" data-id="${i.id}"`) : ''}` }); });
  on('inv-wa', el => toast('Receipt sent', `${D().invoices.find(x => x.id === el.dataset.id).patient} · WhatsApp`, 'emerald', 'message-circle'));
  on('inv-pay', el => { const i = D().invoices.find(x => x.id === el.dataset.id), due = i.total - i.paid;
    modal({ title: 'Collect payment', sub: `${i.id} · ${i.patient} · due ${inr(due)}`, icon: 'indian-rupee', tone: 'emerald', ok: 'Record payment',
      body: `<div class="mb-4 grid grid-cols-4 gap-2">${['UPI', 'Cash', 'Card', 'Insurance'].map((m, n) => `<label class="cursor-pointer"><input type="radio" name="mode" value="${m}" class="peer sr-only" ${n === 0 ? 'checked' : ''}/><span class="block rounded-xl border border-slate-200 py-2.5 text-center text-sm font-medium peer-checked:border-teal-600 peer-checked:bg-teal-50 peer-checked:text-teal-700 dark:border-slate-700 dark:peer-checked:bg-teal-500/10 dark:peer-checked:text-teal-300">${m}</span></label>`).join('')}</div>
        <div class="grid gap-4 sm:grid-cols-2">${field('amount', 'Amount (₹)', { type: 'number', value: due, min: 1, req: true })}${field('ref', 'Reference', { ph: 'UPI txn / card last 4', mono: true })}</div>
        <div class="mt-4 rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/50"><div class="mx-auto mb-2 grid h-28 w-28 place-items-center rounded-lg bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">${ico('qr-code', 'h-16 w-16 text-slate-700 dark:text-slate-300')}</div><p class="text-xs text-slate-500">Patient scans to pay ${inr(due)} via UPI</p></div>`,
      onSubmit: f => { const v = readForm(f, ['amount']); if (!v) return false; const amt = Math.min(+v.amount, due);
        i.paid += amt; i.mode = v.mode; i.status = i.paid >= i.total ? 'paid' : 'partial'; ui.flash = i.id; H().bumpStat('revenue', amt);
        audit('indian-rupee', 'emerald', `<b>${who()}</b> collected ${inr(amt)} on ${i.id} (${v.mode})`); toast('Payment recorded', `${inr(amt)} · ${v.mode} · receipt sent on WhatsApp`, 'emerald', 'circle-check'); rerender(); } }); });
  on('inv-refund', el => { const i = D().invoices.find(x => x.id === el.dataset.id);
    modal({ title: 'Issue refund', sub: `${i.id} · paid ${inr(i.paid)}`, icon: 'undo-2', tone: 'rose', ok: 'Refund', body: `${note('amber', 'shield-alert', 'Refunds need the <b>payment:refund</b> permission and are always audited.')}<div class="mt-4 grid gap-4">${field('amount', 'Amount (₹)', { type: 'number', value: i.paid, req: true })}${field('reason', 'Reason', { req: true, ph: 'e.g. Test cancelled' })}</div>`,
      onSubmit: f => { const v = readForm(f, ['amount', 'reason']); if (!v) return false; const amt = Math.min(+v.amount, i.paid); i.paid -= amt; i.status = i.paid ? 'partial' : 'refunded'; ui.flash = i.id;
        audit('undo-2', 'rose', `<b>${who()}</b> refunded ${inr(amt)} on ${i.id} — ${esc(v.reason)}`); toast('Refund issued', `${inr(amt)} back to ${i.mode || 'original mode'}`, 'rose', 'undo-2'); if (H().state.active === 'billing') rerender(); } }); });
  on('inv-new', el => { const d = D(); const SVC = [['Consultation', 900], ['Follow-up consultation', 500], ['CBC', 350], ['Lipid Profile', 650], ['X-Ray Chest', 600], ['ECG', 400], ['Dressing', 250], ['Bed charges / day', 1500], ['Pharmacy', 0]];
    ui.invLines = [{ desc: 'Consultation', qty: 1, rate: 900 }];
    const draw = () => { const box = document.getElementById('pgInvLines'); if (!box) return;
      box.innerHTML = ui.invLines.map((l, n) => `<div class="grid grid-cols-12 items-center gap-2"><select class="field col-span-6 !h-9" data-il="${n}" data-k="desc">${SVC.map(([s, r]) => `<option data-rate="${r}" ${s === l.desc ? 'selected' : ''}>${s}</option>`).join('')}</select>
        <input type="number" min="1" class="field col-span-2 !h-9" data-il="${n}" data-k="qty" value="${l.qty}"/><input type="number" class="field col-span-3 !h-9 tabular-nums" data-il="${n}" data-k="rate" value="${l.rate}"/>
        <button type="button" class="col-span-1 p-1.5 text-slate-400 hover:text-rose-600" data-pg="il-del" data-i="${n}" aria-label="Remove">${ico('trash-2')}</button></div>`).join('');
      document.getElementById('pgInvTotal').textContent = inr(ui.invLines.reduce((s, l) => s + l.qty * l.rate, 0)); H().icons(); };
    ui.invDraw = draw;
    modal({ title: 'New invoice', icon: 'receipt', tone: 'amber', size: 'max-w-2xl', ok: 'Create invoice',
      body: `<div class="grid gap-4 sm:grid-cols-2">${field('patient', 'Patient', { opts: d.patients.map(p => [p.mrn, p.name + ' · ' + p.mrn]), value: el.dataset.mrn || '' })}${field('payer', 'Payer', { opts: ['Self', 'Star Health', 'HDFC Ergo', 'PM-JAY', 'CGHS'] })}</div>
        <div class="mb-2 mt-5 flex items-center justify-between"><p class="text-sm font-medium">Services</p>${btn('soft', 'Add line', 'plus', 'data-pg="il-add"', 'h-8 px-3')}</div><div id="pgInvLines" class="space-y-2"></div>
        <div class="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50"><span class="text-sm text-slate-500">Total (GST as per service rules)</span><span id="pgInvTotal" class="text-lg font-bold tabular-nums"></span></div>`,
      onSubmit: f => { const p = d.patients.find(x => x.mrn === f.elements.patient.value), total = ui.invLines.reduce((s, l) => s + l.qty * l.rate, 0);
        if (!total) { toast('Add at least one charge', '', 'amber', 'receipt'); return false; }
        const inv = { id: 'INV-' + (21000 + d.invoices.length), patient: p.name, mrn: p.mrn, date: todayISO(), items: ui.invLines.slice(), total, paid: 0, mode: '', status: 'due', payer: f.elements.payer.value };
        d.invoices.unshift(inv); ui.flash = inv.id; audit('receipt', 'amber', `<b>${who()}</b> created ${inv.id} for ${esc(p.name)} (${inr(total)})`); toast('Invoice created', `${inv.id} · ${inr(total)}`, 'amber', 'receipt');
        if (H().state.active === 'billing') rerender(); else H().navigate('billing'); } });
    const box = document.getElementById('pgInvLines');
    box.addEventListener('change', ev => { const t = ev.target, n = +t.dataset.il; if (isNaN(n)) return; const l = ui.invLines[n];
      if (t.dataset.k === 'desc') { l.desc = t.value; const r = +t.selectedOptions[0].dataset.rate; if (r) l.rate = r; } else l[t.dataset.k] = Math.max(t.dataset.k === 'qty' ? 1 : 0, +t.value || 0); draw(); });
    draw(); });
  on('il-add', () => { ui.invLines.push({ desc: 'CBC', qty: 1, rate: 350 }); ui.invDraw(); });
  on('il-del', el => { ui.invLines.splice(+el.dataset.i, 1); ui.invDraw(); });
  on('bill-dayend', () => { const d = D(), inv = d.invoices.filter(i => i.date === todayISO()), by = m => inv.filter(i => i.mode === m).reduce((s, i) => s + i.paid, 0);
    modal({ title: 'Day-end collection report', sub: `${fmtDate(new Date())} · ${branchName(H().state.branch)}`, icon: 'file-bar-chart', tone: 'teal', foot: `${btn('ghost', 'Print', 'printer', 'data-pg="print"')}${btn('primary', 'Close the day', 'lock', 'data-pg="bill-close" data-close-modal')}`,
      body: `${dl([['Invoices raised', inv.length], ['Billed', inr(inv.reduce((s, i) => s + i.total, 0))], ['UPI', inr(by('UPI'))], ['Cash', inr(by('Cash'))], ['Card', inr(by('Card'))], ['Outstanding', inr(inv.reduce((s, i) => s + i.total - i.paid, 0))]])}
        <div class="mt-4">${note('sky', 'info', 'Cash in drawer should match the cash total before closing. Closing locks today’s invoices from edits.')}</div>` }); });
  on('bill-close', () => toast('Day closed', 'Report emailed to the accounts team', 'teal', 'lock'));

  /* ======================= Beds ======================= */
  const BST = { free: ['emerald', 'Free', 'bed'], occupied: ['sky', 'Occupied', 'bed-double'], discharge: ['amber', 'Discharge due', 'log-out'], cleaning: ['slate', 'Cleaning', 'sparkles'], reserved: ['violet', 'Reserved', 'bookmark'] };
  function renderBeds(c) {
    const d = D(), w = ui.bward || 'all', wards = [...new Set(d.beds.map(b => b.ward))];
    if (!d.beds.length) { c.innerHTML = `<div class="${card}">${empty('bed-double', 'No wards configured', 'Add wards and beds in Settings to start admitting patients.', btn('primary', 'Open settings', 'settings', 'data-nav="settings"'))}</div>`; return; }
    const list = d.beds.filter(b => w === 'all' || b.ward === w), cnt = s => d.beds.filter(b => b.status === s).length;
    c.innerHTML = `<div class="fade-in space-y-5">
      <div class="grid grid-cols-2 gap-3 md:grid-cols-5">${Object.entries(BST).map(([k, [t, l, i]]) => `<div class="${card} p-4"><div class="flex items-center gap-2"><span class="grid h-8 w-8 place-items-center rounded-lg ${K.tone(t)}">${ico(i)}</span><p class="text-xl font-bold tabular-nums">${cnt(k)}</p></div><p class="mt-1 text-xs text-slate-500">${l}</p></div>`).join('')}</div>
      <div class="${card}">${toolbar(`${seg('bward', [['all', 'All wards'], ...wards.map(x => [x, x])], w)}<span class="flex-1"></span>${btn('primary', 'Admit patient', 'log-in', 'data-pg="bed-admit"')}`)}
        <div class="space-y-6 p-5">${(w === 'all' ? wards : [w]).map(wn => { const bs = list.filter(b => b.ward === wn), occ = bs.filter(b => b.status === 'occupied' || b.status === 'discharge').length;
          return `<section><div class="mb-3 flex items-center gap-3"><h3 class="font-semibold">${esc(wn)}</h3><span class="text-xs text-slate-500">${occ}/${bs.length} occupied · ${inr(bs[0].tariff)}/day</span><div class="max-w-[160px] flex-1">${bar(occ / bs.length * 100, occ / bs.length > .85 ? 'rose' : 'teal')}</div></div>
          <div class="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">${bs.map(b => { const [t, l] = BST[b.status]; return `<button type="button" class="rounded-xl border p-2 text-left text-xs transition hover:-translate-y-0.5 hover:shadow-md border-${t === 'slate' ? 'slate' : t}-200 ${K.tone(t)} dark:border-slate-700 ${ui.flash === b.id ? 'row-flash' : ''}" data-pg="bed" data-id="${b.id}" title="${esc(l)}">
            <span class="flex items-center justify-between font-bold">${b.id.split('-')[1]}${ico(BST[b.status][2], 'h-3.5 w-3.5')}</span><span class="mt-1 block truncate">${b.patient ? esc(b.patient.split(' ')[0]) : l}</span></button>`; }).join('')}</div></section>`; }).join('')}</div></div></div>`;
    ui.flash = null;
  }
  const losDays = b => Math.max(1, Math.round((new Date(todayISO()) - new Date(b.since)) / 864e5));
  on('bed', el => { const d = D(), b = d.beds.find(x => x.id === el.dataset.id);
    if (b.status === 'free' || b.status === 'reserved') return admitTo(b.id);
    if (b.status === 'cleaning') return H().confirmDialog({ title: `Mark ${b.id} ready?`, text: 'Housekeeping has finished cleaning this bed.', ok: 'Mark ready', tone: 'teal', icon: 'sparkles', onOk: () => { b.status = 'free'; ui.flash = b.id; toast('Bed ready', b.id, 'emerald', 'bed'); rerender(); } });
    modal({ title: `${b.id} · ${b.ward}`, sub: `${b.patient} · ${b.mrn}`, icon: 'bed-double', tone: 'sky',
      body: `${dl([['Admitted', fmtDate(b.since)], ['Length of stay', losDays(b) + ' days'], ['Doctor', esc(b.doctor || '—')], ['Bed charges so far', inr(losDays(b) * b.tariff)]])}
        ${b.status === 'discharge' ? `<div class="mt-4">${note('amber', 'log-out', 'Discharge advised by the doctor. Settle the bill and print the discharge summary.')}</div>` : ''}`,
      foot: `${btn('ghost', 'Transfer', 'arrow-left-right', `data-pg="bed-transfer" data-id="${b.id}"`)}${b.status === 'occupied' ? btn('ghost', 'Advise discharge', 'clipboard-check', `data-pg="bed-advise" data-id="${b.id}"`) : ''}${btn('primary', 'Discharge', 'log-out', `data-pg="bed-discharge" data-id="${b.id}"`)}` }); });
  function admitTo(bedId) { const d = D(), free = d.beds.filter(b => b.status === 'free' || b.id === bedId);
    modal({ title: 'Admit patient', icon: 'log-in', tone: 'teal', ok: 'Admit', body: `<div class="grid gap-4 sm:grid-cols-2">${field('patient', 'Patient', { opts: d.patients.map(p => [p.mrn, p.name + ' · ' + p.mrn]), full: true })}
      ${field('bed', 'Bed', { opts: free.map(b => [b.id, `${b.id} · ${b.ward}`]), value: bedId || '' })}${field('doctor', 'Admitting doctor', { opts: T().doctors.map(x => x.name) })}
      ${field('reason', 'Reason for admission', { full: true, req: true, ph: 'e.g. Post-op observation' })}${field('deposit', 'Advance deposit (₹)', { type: 'number', value: 10000 })}</div>`,
      onSubmit: f => { const v = readForm(f, ['reason']); if (!v) return false; const b = d.beds.find(x => x.id === v.bed), p = d.patients.find(x => x.mrn === v.patient);
        Object.assign(b, { status: 'occupied', patient: p.name, mrn: p.mrn, since: todayISO(), doctor: v.doctor }); T().stats.beds = Math.max(0, T().stats.beds - 1); ui.flash = b.id;
        audit('log-in', 'teal', `<b>${who()}</b> admitted ${esc(p.name)} to ${b.id}`); toast('Patient admitted', `${p.name} → ${b.id} · bed tariff added to IPD bill`, 'teal', 'bed-double'); H().refresh(false); } }); }
  on('bed-admit', () => admitTo());
  on('bed-advise', el => { const b = D().beds.find(x => x.id === el.dataset.id); b.status = 'discharge'; ui.flash = b.id; H().closeModal('pgModal'); toast('Discharge advised', `${b.patient} · billing notified`, 'amber', 'clipboard-check'); rerender(); });
  on('bed-discharge', el => { const b = D().beds.find(x => x.id === el.dataset.id);
    H().confirmDialog({ title: `Discharge ${b.patient}?`, text: `Final bill ${inr(losDays(b) * b.tariff)} in bed charges. The bed goes to cleaning.`, ok: 'Discharge', tone: 'teal', icon: 'log-out', onOk: () => {
      audit('log-out', 'emerald', `<b>${who()}</b> discharged ${esc(b.patient)} from ${b.id}`); toast('Discharged', `${b.patient} · summary sent on WhatsApp`, 'emerald', 'log-out');
      Object.assign(b, { status: 'cleaning', patient: '', mrn: '', since: '', doctor: '' }); ui.flash = b.id; H().closeModal('pgModal'); H().refresh(false); } }); });
  on('bed-transfer', el => { const d = D(), b = d.beds.find(x => x.id === el.dataset.id);
    modal({ title: `Transfer ${b.patient}`, sub: `from ${b.id}`, icon: 'arrow-left-right', ok: 'Transfer', body: field('to', 'Move to', { opts: d.beds.filter(x => x.status === 'free').map(x => [x.id, `${x.id} · ${x.ward} · ${inr(x.tariff)}/day`]) }),
      onSubmit: f => { const to = d.beds.find(x => x.id === f.elements.to.value); Object.assign(to, { status: 'occupied', patient: b.patient, mrn: b.mrn, since: b.since, doctor: b.doctor }); Object.assign(b, { status: 'cleaning', patient: '', mrn: '', since: '', doctor: '' });
        ui.flash = to.id; toast('Transferred', `${to.patient} → ${to.id}`, 'sky', 'arrow-left-right'); rerender(); } }); });

  /* ======================= Emergency ======================= */
  const TRI = { 1: ['rose', 'P1 · Resuscitation'], 2: ['amber', 'P2 · Emergent'], 3: ['amber', 'P3 · Urgent'], 4: ['emerald', 'P4 · Less urgent'], 5: ['sky', 'P5 · Non-urgent'] };
  const EST = { waiting: ['amber', 'Waiting'], resus: ['rose', 'Resus'], treating: ['sky', 'Treating'], admitted: ['violet', 'Admitted'], discharged: ['emerald', 'Discharged'] };
  function renderEmergency(c) {
    const d = D(), active = d.emergency.filter(e => !['admitted', 'discharged'].includes(e.status)).sort((a, b) => a.triage - b.triage);
    const bays = ['Bay 1', 'Bay 2', 'Bay 3', 'Bay 4', 'Bay 5', 'Bay 6'];
    c.innerHTML = `<div class="fade-in space-y-5">
      <div class="flex flex-wrap items-center gap-3 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 p-5 text-white shadow-card">
        <span class="grid h-12 w-12 place-items-center rounded-xl bg-white/20">${ico('siren', 'h-6 w-6')}</span>
        <div class="min-w-0 flex-1"><p class="text-lg font-bold">${active.length} active case${active.length === 1 ? '' : 's'}</p><p class="text-sm text-rose-100">${active.filter(e => e.triage <= 2).length} critical · ${active.filter(e => e.status === 'waiting').length} waiting for a bay · on-call: ${esc((T().doctors[2] || T().doctors[0] || {}).name || '—')}</p></div>
        <button type="button" class="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-rose-700 shadow hover:bg-rose-50" data-pg="er-new">${ico('plus')}Quick registration</button></div>
      <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div class="${card}">${cardHead('Triage board', 'Sorted by priority, then arrival')}
          <ul class="divide-y divide-slate-100 dark:divide-slate-800">${active.map(e => `<li class="flex flex-wrap items-center gap-4 px-5 py-4 ${ui.flash === e.id ? 'row-flash' : ''}">
            <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-black text-white ${e.triage === 1 ? 'bg-rose-600' : e.triage <= 3 ? 'bg-amber-500' : e.triage === 4 ? 'bg-emerald-600' : 'bg-sky-600'}">P${e.triage}</span>
            <div class="min-w-[180px] flex-1"><p class="font-semibold">${esc(e.name)} <span class="text-xs font-normal text-slate-500">${e.age}${e.gender} · ${e.id}</span></p><p class="text-sm text-slate-600 dark:text-slate-300">${esc(e.complaint)}</p>
              <p class="mt-0.5 text-xs text-slate-500">${ico('activity', 'inline h-3 w-3')} ${esc(e.vitals)} · arrived ${e.arrived}</p></div>
            <div class="text-right text-xs"><p>${badge(...EST[e.status])}</p><p class="mt-1 text-slate-500">${esc(e.bay)}${e.doctor ? ' · ' + esc(e.doctor) : ''}</p></div>
            <div class="flex gap-1.5">${e.status === 'waiting' ? btn('primary', 'Assign bay', 'bed', `data-pg="er-assign" data-id="${e.id}"`, 'h-8 px-3') : `${btn('ghost', 'Admit', 'log-in', `data-pg="er-out" data-do="admitted" data-id="${e.id}"`, 'h-8 px-3')}${btn('ghost', 'Discharge', 'log-out', `data-pg="er-out" data-do="discharged" data-id="${e.id}"`, 'h-8 px-3')}`}</div></li>`).join('') || `<li>${empty('heart-pulse', 'No active cases', 'The emergency department is clear.')}</li>`}</ul></div>
        <div class="space-y-5"><div class="${card}">${cardHead('Bays')}<div class="grid grid-cols-2 gap-2 p-4">${bays.map(b => { const e = d.emergency.find(x => x.bay === b && !['admitted', 'discharged'].includes(x.status));
            return `<div class="rounded-xl border p-3 text-xs ${e ? (e.triage <= 2 ? 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10' : 'border-sky-200 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10') : 'border-dashed border-slate-200 dark:border-slate-700'}"><p class="font-semibold">${b}</p><p class="truncate text-slate-500">${e ? esc(e.name) : 'Free'}</p></div>`; }).join('')}</div></div>
          <div class="${card}">${cardHead('Today', 'Outcomes')}<div class="p-5">${dl([['Admitted', d.emergency.filter(e => e.status === 'admitted').length], ['Discharged', d.emergency.filter(e => e.status === 'discharged').length], ['Avg. door-to-doctor', '7 min'], ['Ambulances out', '1']])}</div></div></div>
      </div></div>`;
    ui.flash = null;
  }
  on('er-new', () => modal({ title: 'Quick emergency registration', sub: 'Minimum fields — complete the record later', icon: 'siren', tone: 'rose', ok: 'Register & triage',
    body: `<div class="grid gap-4 sm:grid-cols-2">${field('name', 'Name', { ph: 'Leave blank if unknown' })}${field('age', 'Approx. age', { type: 'number', value: 30 })}${field('gender', 'Sex', { opts: [['M', 'Male'], ['F', 'Female']] })}
      ${field('triage', 'Triage level', { opts: Object.entries(TRI).map(([k, [, l]]) => [k, l]), value: '3' })}${field('complaint', 'Chief complaint', { req: true, full: true, ph: 'e.g. Chest pain' })}${field('vitals', 'Vitals', { full: true, ph: 'BP · HR · SpO₂' })}</div>`,
    onSubmit: f => { const v = readForm(f, ['complaint']); if (!v) return false; const d = D();
      const e = { id: 'ER-' + (910 + d.emergency.length), name: v.name || `Unknown ${v.gender === 'F' ? 'female' : 'male'} (~${v.age})`, age: +v.age, gender: v.gender, complaint: v.complaint, triage: +v.triage, bay: '—', doctor: '', arrived: nowTime(), status: 'waiting', vitals: v.vitals || 'Pending' };
      d.emergency.unshift(e); ui.flash = e.id; H().bumpStat('emergency', 1);
      if (e.triage <= 2) { H().notify({ tone: 'rose', icon: 'siren', title: 'Emergency — ' + TRI[e.triage][1], text: e.complaint }); toast('On-call team alerted', 'SMS + app push to on-call doctors', 'rose', 'siren'); }
      else toast('Registered', `${e.id} · ${TRI[e.triage][1]}`, 'rose', 'siren'); rerender(); } }));
  on('er-assign', el => { const d = D(), e = d.emergency.find(x => x.id === el.dataset.id), used = d.emergency.filter(x => !['admitted', 'discharged'].includes(x.status)).map(x => x.bay);
    const free = ['Bay 1', 'Bay 2', 'Bay 3', 'Bay 4', 'Bay 5', 'Bay 6'].filter(b => !used.includes(b));
    if (!free.length) return toast('All bays occupied', 'Move a patient out first.', 'amber', 'bed');
    modal({ title: `Assign ${e.name}`, icon: 'bed', tone: 'rose', ok: 'Assign', body: `<div class="grid gap-4 sm:grid-cols-2">${field('bay', 'Bay', { opts: free })}${field('doctor', 'Doctor', { opts: T().doctors.map(x => x.name) })}</div>`,
      onSubmit: f => { e.bay = f.elements.bay.value; e.doctor = f.elements.doctor.value; e.status = e.triage === 1 ? 'resus' : 'treating'; ui.flash = e.id; toast('Bay assigned', `${e.name} → ${e.bay} · ${e.doctor}`, 'sky', 'bed'); rerender(); } }); });
  on('er-out', el => { const e = D().emergency.find(x => x.id === el.dataset.id); e.status = el.dataset.do; H().bumpStat('emergency', -1);
    toast(e.status === 'admitted' ? 'Admitted to IPD' : 'Discharged from ER', e.name, e.status === 'admitted' ? 'violet' : 'emerald', e.status === 'admitted' ? 'log-in' : 'log-out'); rerender(); });

  /* ======================= Communication channels ======================= */
  const CH = { whatsapp: ['emerald', 'WhatsApp', 'message-circle'], sms: ['sky', 'SMS', 'smartphone'], email: ['violet', 'Email', 'mail'], off: ['slate', 'Off', 'minus'] };
  function renderChannels(c) {
    const ch = D().channels;
    c.innerHTML = `<div class="fade-in space-y-5">
      <div class="grid gap-4 md:grid-cols-3">${ch.providers.map(p => `<article class="${card} p-5">
        <div class="flex items-start gap-3"><span class="grid h-11 w-11 place-items-center rounded-xl ${K.tone(CH[p.key][0])}">${ico(p.icon, 'h-5 w-5')}</span>
          <div class="min-w-0 flex-1"><h3 class="font-semibold">${p.label}</h3><p class="truncate text-xs text-slate-500">${esc(p.provider)}</p></div>${badge(p.status === 'live' ? 'emerald' : 'slate', p.status === 'live' ? 'Live' : 'Off', p.status === 'live' ? 'circle-check' : '')}</div>
        <div class="mt-4 space-y-2 text-sm"><div class="flex justify-between gap-2"><span class="text-slate-500">Sender</span><span class="truncate font-medium">${esc(p.sender)}</span></div>
          <div class="flex justify-between gap-2"><span class="text-slate-500">API key</span><span class="font-mono text-xs">${esc(p.key_)}</span></div>
          <div class="flex justify-between gap-2"><span class="text-slate-500">Sent this month</span><span class="font-medium tabular-nums">${p.sent.toLocaleString('en-IN')}</span></div></div>
        <div class="mt-4 flex gap-2">${btn('ghost', 'Configure', 'settings-2', `data-pg="ch-conf" data-id="${p.key}"`, 'h-8 px-3 flex-1')}${btn('soft', 'Send test', 'send', `data-pg="ch-test" data-id="${p.key}"`, 'h-8 px-3 flex-1')}</div></article>`).join('')}</div>
      <div class="${card}">${cardHead('Purpose routing', 'Each message type goes to a primary channel, with a fallback if delivery fails')}
        ${table(['Purpose', 'Primary', 'Fallback', ''], ch.routes.map((r, i) => `<tr>${td0(`<div class="flex items-center gap-3"><span class="grid h-8 w-8 place-items-center rounded-lg ${K.tone('slate')}">${ico(r.icon)}</span><div><p class="font-medium">${r.label}</p><p class="font-mono text-[11px] text-slate-400">${r.purpose}</p></div></div>`)}
          ${['primary', 'fallback'].map(k => td(`<select class="adm-select" data-pg-change="route" data-i="${i}" data-k="${k}" ${r.locked && k === 'primary' ? 'disabled' : ''}>${Object.entries(CH).map(([v, [, l]]) => `<option value="${v}" ${r[k] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`)).join('')}
          ${td(r.locked ? badge('slate', 'Required', 'lock') : r.consent ? badge('amber', 'Needs opt-in', 'shield') : '', 'pr-5 text-right')}</tr>`).join(''), { min: '640px' })}</div>
      <div class="${card}">${cardHead('Message templates', 'WhatsApp templates need Meta approval; SMS templates need DLT registration', btn('ghost', 'New template', 'plus', 'data-pg="ch-tpl"', 'h-8 px-3'))}
        <ul class="divide-y divide-slate-100 dark:divide-slate-800">${ch.templates.map(t => `<li class="flex flex-wrap items-center gap-3 px-5 py-3"><span class="grid h-8 w-8 place-items-center rounded-lg ${K.tone(CH[t.ch][0])}">${ico(CH[t.ch][2])}</span>
          <div class="min-w-[220px] flex-1"><p class="font-mono text-sm font-medium">${t.name}</p><p class="truncate text-xs text-slate-500">${esc(t.text)}</p></div>${badge(t.status === 'approved' ? 'emerald' : 'amber', t.status === 'approved' ? 'Approved' : 'Pending approval')}</li>`).join('')}</ul></div></div>`;
  }
  K.onChange('route', el => { const r = D().channels.routes[+el.dataset.i]; r[el.dataset.k] = el.value; audit('send', 'sky', `<b>${who()}</b> routed ${r.purpose} ${el.dataset.k} → ${el.value}`); toast('Routing saved', `${r.label}: ${CH[r.primary][1]} → fallback ${CH[r.fallback][1]}`, 'sky', 'send'); });
  on('ch-test', el => { const p = D().channels.providers.find(x => x.key === el.dataset.id);
    modal({ title: `Send a test ${p.label}`, icon: p.icon, tone: CH[p.key][0], ok: 'Send test', body: field('to', p.key === 'email' ? 'Email address' : 'Mobile number', { req: true, value: p.key === 'email' ? '' : '', ph: p.key === 'email' ? 'you@example.com' : '10-digit mobile' }),
      onSubmit: f => { const v = readForm(f, ['to']); if (!v) return false; toast('Test sent', `${p.provider} accepted the message · delivered in 1.2 s`, 'emerald', 'send'); } }); });
  on('ch-conf', el => { const p = D().channels.providers.find(x => x.key === el.dataset.id);
    modal({ title: `Configure ${p.label}`, icon: p.icon, tone: CH[p.key][0], ok: 'Save', body: `<div class="grid gap-4">${field('provider', 'Provider', { opts: { whatsapp: ['Meta Cloud API', 'Gupshup', 'Twilio'], sms: ['MSG91 (DLT)', 'Kaleyra', 'Twilio'], email: ['Amazon SES', 'SendGrid', 'SMTP'] }[p.key], value: p.provider })}
      ${field('sender', 'Sender ID / number', { value: p.sender })}${field('key', 'API key', { type: 'password', ph: 'Leave blank to keep the current key', help: 'Encrypted at rest; only the last characters are ever shown.' })}</div>`,
      onSubmit: f => { p.provider = f.elements.provider.value; p.sender = f.elements.sender.value; if (f.elements.key.value) p.key_ = f.elements.key.value.slice(0, 4) + '••••••••••' + f.elements.key.value.slice(-3);
        audit('key-round', 'amber', `<b>${who()}</b> updated ${p.label} credentials`); toast(`${p.label} saved`, 'Send a test before going live', 'teal', 'check'); rerender(); } }); });
  on('ch-tpl', () => modal({ title: 'New template', icon: 'file-text', ok: 'Submit for approval', body: `<div class="grid gap-4">${field('name', 'Template name', { req: true, mono: true, ph: 'discharge_summary' })}${field('ch', 'Channel', { opts: [['whatsapp', 'WhatsApp'], ['sms', 'SMS'], ['email', 'Email']] })}${field('text', 'Message', { area: true, req: true, ph: 'Hi {{name}}, …', help: 'Use {{variables}} for personal details.' })}</div>`,
    onSubmit: f => { const v = readForm(f, ['name', 'text']); if (!v) return false; D().channels.templates.push({ name: v.name, ch: v.ch, status: 'pending', text: v.text }); toast('Template submitted', 'Approval usually takes a few hours', 'amber', 'hourglass'); rerender(); } }));

  /* ======================= Settings ======================= */
  function renderSettings(c) {
    const s = D().settings, tab = ui.stab || 'profile', t = T();
    const sw = (k, on, label, sub) => `<div class="flex items-center gap-4 py-3"><div class="flex-1"><p class="text-sm font-medium">${label}</p><p class="text-xs text-slate-500">${sub}</p></div><button type="button" class="switch" role="switch" aria-checked="${on}" aria-label="${esc(label)}" data-pg="set-sw" data-k="${k}"></button></div>`;
    const body = {
      profile: `<form id="pgSetForm" class="grid gap-4 sm:grid-cols-2">${field('legal', 'Legal name', { value: s.profile.legal })}${field('reg', 'Clinical establishment reg. no.', { value: s.profile.reg, mono: true })}
        ${field('gstin', 'GSTIN', { value: s.profile.gstin, mono: true })}${field('phone', 'Phone', { value: s.profile.phone })}${field('email', 'Email', { value: s.profile.email })}
        <label class="block"><span class="mb-1.5 block text-sm font-medium">Subdomain</span><div class="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"><span class="font-mono">${t.slug}</span><span class="text-slate-400">.hms.com</span></div><span class="mt-1 block text-xs text-slate-500">Changed by platform support only</span></label>
        ${field('address', 'Address', { value: s.profile.address, full: true })}
        <div class="flex items-center gap-4 sm:col-span-2"><span class="grid h-16 w-16 place-items-center rounded-2xl bg-teal-600 text-xl font-black text-white">${t.name[0]}</span><div><p class="text-sm font-medium">Logo</p><p class="text-xs text-slate-500">Shown on prescriptions, bills and the portal</p></div>${btn('ghost', 'Upload', 'upload', 'data-action="demo-only"', 'h-8 px-3')}</div>
        <div class="sm:col-span-2">${btn('primary', 'Save profile', 'check', 'data-pg="set-save"')}</div></form>`,
      branches: `<ul class="divide-y divide-slate-100 dark:divide-slate-800">${t.branches.map((b, i) => `<li class="flex items-center gap-3 py-3"><span class="grid h-9 w-9 place-items-center rounded-xl ${K.tone(i ? 'sky' : 'teal')}">${ico('building-2')}</span><div class="flex-1"><p class="font-medium">${esc(b.split(' · ')[0])}</p><p class="text-xs text-slate-500">${esc(b.split(' · ')[1] || '')}</p></div>${i === 0 ? badge('teal', 'Main') : ''}${btn('ghost', 'Edit', 'pencil', 'data-action="demo-only"', 'h-8 px-3')}</li>`).join('')}</ul>
        <div class="mt-3">${note('sky', 'info', 'Patients are shared across branches. Visits, stock, beds and cash stay branch-scoped. Your plan allows ' + (t.plan === 'pro' ? '5' : '1') + ' branch' + (t.plan === 'pro' ? 'es' : '') + '.')}</div>
        <div class="mt-3">${btn('primary', 'Add branch', 'plus', `data-pg="set-branch"`)}</div>`,
      billing: `${table(['Service type', 'Tax', 'Rate'], s.tax.map(([a, b, r]) => `<tr>${td0(esc(a))}${td(esc(b))}${td(`<span class="font-semibold">${r}</span>`)}</tr>`).join(''), { min: '480px' })}
        <div class="mt-4 grid gap-4 sm:grid-cols-3">${field('prefix', 'Invoice prefix', { value: 'INV-', mono: true })}${field('round', 'Rounding', { opts: ['Nearest rupee', 'No rounding'] })}${field('fy', 'Financial year starts', { opts: ['April', 'January'] })}</div>`,
      hours: `<div class="grid gap-4 sm:grid-cols-3">${Object.entries(s.hours).map(([k, [a, b]]) => `<div class="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><p class="mb-2 text-sm font-semibold capitalize">${k === 'opd' ? 'OPD' : k}</p><div class="flex items-center gap-2"><input type="time" value="${a}" class="field !h-9"/><span class="text-slate-400">–</span><input type="time" value="${b}" class="field !h-9"/></div></div>`).join('')}</div>
        <h4 class="mb-2 mt-6 text-sm font-semibold">Holidays</h4><ul class="divide-y divide-slate-100 text-sm dark:divide-slate-800">${s.holidays.map(([n, d]) => `<li class="flex justify-between py-2"><span>${n}</span><span class="text-slate-500">${fmtDate(d)}</span></li>`).join('')}</ul>
        <div class="mt-3">${btn('ghost', 'Add holiday', 'plus', 'data-action="demo-only"', 'h-8 px-3')}</div>`,
      security: `<div class="divide-y divide-slate-100 dark:divide-slate-800">${sw('singleSession', s.security.singleSession, 'Single active session', 'Signing in on a new device signs out the old one')}
        ${sw('otp', s.security.otp, 'OTP on every sign-in', 'Password + one-time code sent by the OTP channel')}${sw('ipAllow', s.security.ipAllow, 'Restrict to hospital network', 'Only allow sign-in from listed IP ranges')}</div>
        <div class="mt-4 grid gap-4 sm:grid-cols-3">${field('idle', 'Auto sign-out after (min)', { type: 'number', value: s.security.idle })}${field('pw', 'Password expiry (days)', { type: 'number', value: s.security.pwExpiry })}
          ${field('imp', 'Platform support access', { opts: [['approval', 'Only with my approval'], ['never', 'Never']], value: s.security.impersonation })}</div>
        <div class="mt-4">${note('sky', 'shield-check', 'Support can only open your hospital after an admin approves a time-limited session. Every support action is in the audit log.')}</div>`,
      plan: `<div class="flex flex-wrap items-center gap-4 rounded-2xl border border-teal-200 bg-teal-50 p-5 dark:border-teal-500/20 dark:bg-teal-500/10"><span class="grid h-12 w-12 place-items-center rounded-xl bg-teal-600 text-white">${ico('gem', 'h-5 w-5')}</span><div class="flex-1"><p class="font-semibold">${esc(PLANS[t.plan].label)}</p><p class="text-sm text-slate-600 dark:text-slate-300">${H().state.modules.size} of ${MODULES.length} modules enabled</p></div>${t.plan !== 'pro' ? btn('primary', 'Upgrade', 'arrow-up-right', 'data-action="demo-only"') : badge('emerald', 'Top plan')}</div>
        <ul class="mt-4 grid gap-2 sm:grid-cols-2">${MODULES.map(m => `<li class="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">${ico(H().state.modules.has(m.key) ? 'circle-check' : 'circle-dashed', `h-4 w-4 ${H().state.modules.has(m.key) ? 'text-emerald-600' : 'text-slate-400'}`)}<span class="flex-1">${m.label}</span><span class="text-[11px] text-slate-400">${m.phase}</span></li>`).join('')}</ul>`,
    };
    const tabs = [['profile', 'Hospital profile', 'building-2'], ['branches', 'Branches', 'git-branch'], ['billing', 'Tax & billing', 'receipt'], ['hours', 'Hours & holidays', 'clock'], ['security', 'Security', 'shield'], ['plan', 'Plan & modules', 'gem']];
    c.innerHTML = `<div class="fade-in grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav class="${card} self-start p-2">${tabs.map(([k, l, i]) => `<button type="button" class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${tab === k ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}" data-pg="seg" data-key="stab" data-val="${k}">${ico(i)}${l}</button>`).join('')}</nav>
      <section class="${card} p-6"><h3 class="mb-5 text-lg font-semibold">${tabs.find(x => x[0] === tab)[1]}</h3>${body[tab]}</section></div>`;
  }
  on('set-sw', el => { const s = D().settings.security, k = el.dataset.k; s[k] = !s[k]; el.setAttribute('aria-checked', s[k]); audit('shield', 'amber', `<b>${who()}</b> turned ${s[k] ? 'on' : 'off'} ${k}`); toast('Security setting saved', `${k} ${s[k] ? 'on' : 'off'}`, 'teal', 'shield-check'); });
  on('set-save', () => { const f = document.getElementById('pgSetForm'); Object.assign(D().settings.profile, Object.fromEntries(new FormData(f).entries())); toast('Profile saved', 'Shown on new prescriptions and bills', 'teal', 'check'); });
  on('set-branch', () => { if (T().plan !== 'pro') return toast('Plan limit', 'Clinic Starter allows one branch. Upgrade to add more.', 'amber', 'gem');
    modal({ title: 'Add branch', icon: 'building-2', ok: 'Add branch', body: `<div class="grid gap-4">${field('name', 'Branch name', { req: true, ph: 'e.g. South Clinic' })}${field('area', 'Area', { req: true, ph: 'e.g. Behala' })}</div>`,
      onSubmit: f => { const v = readForm(f, ['name', 'area']); if (!v) return false; T().branches.push(`${v.name} · ${v.area}`); toast('Branch added', v.name + ' — appears in the branch switcher', 'teal', 'building-2'); H().refresh(false); } }); });

  /* ======================= Audit log ======================= */
  function renderAudit(c) {
    const d = D(), q = (ui.auq || '').toLowerCase(), kind = ui.auk || 'all';
    const KINDS = { all: 'All events', auth: 'Sign-ins', patient: 'Patient data', role: 'Roles & access', payment: 'Money', impersonation: 'Support access' };
    const list = d.audit.filter(e => (kind === 'all' || e.action.startsWith(kind) || (kind === 'role' && /^(role|credential)/.test(e.action)) || (kind === 'auth' && e.action.startsWith('auth')))
      && (!q || (e.user + e.action + e.text).toLowerCase().includes(q)));
    const ago = d => { const m = Math.round((Date.now() - d) / 60000); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
    const tn = a => /failed|refund/.test(a) ? 'rose' : /impersonation|credential|role/.test(a) ? 'amber' : /read/.test(a) ? 'slate' : 'teal';
    c.innerHTML = `<div class="fade-in space-y-5">
      ${note('sky', 'lock', 'The audit log is append-only. Nobody — not even the admin or platform staff — can edit or delete an entry. Retained for 7 years.')}
      <div class="${card}">${toolbar(`${search('auq', ui.auq || '', 'Search user, action or record')}${select('auk', Object.entries(KINDS), kind, 'Event type')}<span class="flex-1"></span>${btn('ghost', 'Export (DPDP)', 'download', 'data-pg="au-export"')}`)}
        ${table(['When', 'User', 'Action', 'Details', 'Branch · IP'], list.map(e => `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
          ${td0(`<span class="whitespace-nowrap text-xs">${ago(e.at)}</span><span class="block font-mono text-[11px] text-slate-400">${e.id}</span>`)}${td(person(e.user, '', e.user === 'Unknown' ? 'rose' : 'slate'))}
          ${td(`<span class="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[11px] ${K.tone(tn(e.action))}">${ico(e.icon, 'h-3 w-3')}${e.action}</span>`)}${td(esc(e.text), 'max-w-[340px]')}
          ${td(`<span class="text-xs">${esc(e.branch)}</span><span class="block font-mono text-[11px] text-slate-400">${e.ip}</span>`)}</tr>`).join(''), { min: '900px', empty: 'No events match.' })}
        <div class="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800">${list.length} events · actions you take in this demo also appear in Recent activity on the dashboard.</div></div></div>`;
  }
  on('au-export', () => { audit('download', 'slate', `<b>${who()}</b> exported the audit log`); toast('Export started', 'Signed CSV of the last 30 days · this export is itself audited', 'teal', 'download'); });

  K.register({
    'dashboard:analytics': { title: 'Analytics', render: renderAnalytics },
    billing:   { title: 'Billing & Payments', render: renderBilling },
    beds:      { title: 'Bed Management', render: renderBeds },
    emergency: { title: 'Emergency', render: renderEmergency },
    channels:  { title: 'Communication Channels', render: renderChannels },
    settings:  { title: 'Settings', render: renderSettings },
    audit:     { title: 'Audit Log', render: renderAudit },
  });
  window.PGOps = { invSheet, IST };
})();
