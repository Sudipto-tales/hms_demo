/* HMS demo — Invoice designs, payment of dues, floating "Pay" button.
 * The admin picks one of three invoice designs (Payments › Invoice Template). Every invoice,
 * receipt and pharmacy payment slip renders with it. Invoices are always printed on white,
 * whatever the app theme. Unpaid bills show a floating pay button: for the patient in the
 * portal, and for staff inside the patient profile.
 */
(() => {
  'use strict';
  const K = window.PG;
  const { esc, inr, T, D, can, me, card, badge, ico, btn, field, modal, on, onChange, rerender, ui, fmtDate, todayISO, audit, who, note } = K;
  const H = () => window.HMS;
  const toast = (...a) => H().toast(...a);

  const ACCENTS = { teal: '#0f766e', indigo: '#4338ca', rose: '#be123c', slate: '#1e293b', amber: '#b45309' };
  const TPLS = [
    { key: 'classic', name: 'Classic', tag: 'With logo', desc: 'Letterhead with your logo, GST details, a paid/due stamp and a UPI QR.' },
    { key: 'minimal', name: 'Minimal', tag: 'Without logo', desc: 'Type only — no logo, lots of white space. Prints cleanly in black and white.' },
    { key: 'modern',  name: 'Modern',  tag: 'Colour band', desc: 'A bold colour header with the amount due up front. Great on phones and WhatsApp.' },
  ];
  const cfg = () => { const s = D().settings; return s.invoice || (s.invoice = { tpl: 'classic', accent: 'teal', qr: true, sign: true, footer: 'Thank you for choosing us. Get well soon!' }); };
  const logo = () => { try { return window.PGAdmin.A().account.org.logo || ''; } catch (e) { return ''; } };
  const brand = () => { const p = D().settings.profile; return { name: T().name, addr: p.address, phone: p.phone, email: p.email, gstin: p.gstin, reg: p.reg }; };
  const IST = { paid: ['emerald', 'Paid'], partial: ['amber', 'Part paid'], due: ['rose', 'Due'], refunded: ['slate', 'Refunded'] };
  const due = i => Math.max(0, i.total - i.paid);
  const isOpen = i => i.status === 'due' || i.status === 'partial';
  const money = n => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const initials = n => K.initials(n);

  // Indian numbering, e.g. 1,23,450 → "One Lakh Twenty Three Thousand Four Hundred Fifty"
  function words(n) {
    n = Math.round(n); if (!n) return 'Zero';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const two = x => x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : '');
    const three = x => (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : '');
    const parts = [[1e7, 'Crore'], [1e5, 'Lakh'], [1e3, 'Thousand']]; let out = '';
    parts.forEach(([v, l]) => { if (n >= v) { out += three(Math.floor(n / v)) + ' ' + l + ' '; n %= v; } });
    return (out + (n ? three(n) : '')).trim();
  }
  function qrSvg(text, px = 96) {
    if (!window.qrcode) return '';
    const q = window.qrcode(0, 'M'); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }).replace('<svg ', `<svg width="${px}" height="${px}" `);
  }
  const upi = i => `upi://pay?pa=${T().slug}hospital@hdfcbank&pn=${encodeURIComponent(T().name)}&am=${due(i).toFixed(2)}&cu=INR&tn=${i.id}`;

  /* ---------------- shared parts ---------------- */
  function parts(i, o) {
    const B = brand(), ac = ACCENTS[o.accent] || ACCENTS.teal, ph = i.kind === 'pharmacy' && window.PGPharmacy ? window.PGPharmacy.phById(i.pharmacy) : null;
    const pt = D().patients.find(p => p.mrn === i.mrn) || {};
    const sub = i.items.reduce((s, x) => s + x.qty * x.rate, 0), gst = ph ? sub - sub / 1.12 : 0;
    return { B, ac, ph, pt, sub, gst, title: ph ? 'Payment Slip' : 'Tax Invoice', st: IST[i.status] || ['slate', i.status], open: isOpen(i), lg: o.tpl === 'minimal' ? '' : logo() };
  }
  const logoBox = (x, size, round) => `<span style="width:${size}px;height:${size}px;background:${x.lg ? '#fff' : x.ac};border-radius:${round ? '999px' : '14px'}" class="grid shrink-0 place-items-center overflow-hidden text-white shadow-sm ${x.lg ? 'ring-1 ring-slate-200' : ''}">
    ${x.lg ? `<img src="${esc(x.lg)}" alt="" class="h-full w-full object-cover"/>` : `<b style="font-size:${size * 0.38}px">${esc(initials(x.B.name))}</b>`}</span>`;
  const stamp = (x, color) => `<div class="pointer-events-none absolute bottom-36 left-8 rotate-[-12deg] rounded-lg border-[3px] px-3 py-1 text-xl font-black uppercase tracking-[.2em] opacity-[.18]" style="border-color:${color};color:${color}">${x.st[1]}</div>`;
  const qrBlock = (i, x, o, dark) => x.open && o.qr ? `<div class="flex items-center gap-3"><div class="rounded-lg bg-white p-1.5 ring-1 ring-slate-200">${qrSvg(upi(i), 76)}</div>
      <div class="text-[11px] leading-tight ${dark ? 'text-white/80' : 'text-slate-500'}"><b class="block text-[13px] ${dark ? 'text-white' : 'text-slate-800'}">Scan to pay ${inr(due(i))}</b>Any UPI app · ${T().slug}hospital@hdfcbank</div></div>`
    : i.paid ? `<div class="text-[11px] text-slate-500"><b class="block text-[13px] text-emerald-700">Received ${inr(i.paid)}</b>${esc(i.mode || '')} · thank you</div>` : '<div></div>';
  const sign = o => o.sign ? `<div class="text-center text-[11px] text-slate-500"><svg width="120" height="30" viewBox="0 0 120 30" class="mx-auto"><path d="M5 22c14-18 22 6 34-6s18-10 26 2 20-4 30-8 14 6 20 2" fill="none" stroke="#334155" stroke-width="1.6"/></svg><div class="mt-0.5 border-t border-slate-300 pt-1">Authorised signatory</div></div>` : '';
  const rows = i => i.items.map((x, n) => ({ n: n + 1, d: x.desc, q: x.qty, r: x.rate, a: x.qty * x.rate }));

  /* ---------------- template 1: classic (with logo) ---------------- */
  function classic(i, o) {
    const x = parts(i, o);
    return `<div class="relative overflow-hidden rounded-xl bg-white text-[13px] text-slate-800 shadow-sm ring-1 ring-slate-200" style="font-feature-settings:'tnum'">
      ${stamp(x, x.open ? '#e11d48' : '#059669')}
      <div class="flex flex-wrap items-start gap-4 p-6 pb-4">${logoBox(x, 56)}
        <div class="min-w-0 flex-1"><p class="text-lg font-bold" style="color:${x.ac}">${esc(x.B.name)}</p>${x.ph ? `<p class="text-xs font-semibold text-slate-600">${esc(x.ph.name)} · DL ${esc(x.ph.license)}</p>` : ''}
          <p class="text-xs text-slate-500">${esc(x.B.addr)}</p><p class="text-xs text-slate-500">${esc(x.B.phone)} · ${esc(x.B.email)}</p></div>
        <div class="text-right"><p class="text-xs font-bold uppercase tracking-[.2em] text-slate-400">${x.title}</p><p class="mt-1 font-mono text-base font-semibold">${i.id}</p><p class="text-xs text-slate-500">${fmtDate(i.date)}${i.time ? ' · ' + i.time : ''}</p></div></div>
      <div class="h-1" style="background:linear-gradient(90deg,${x.ac},${x.ac}55)"></div>
      <div class="grid grid-cols-3 gap-4 px-6 py-4 text-xs">
        <div><p class="font-semibold uppercase tracking-wider text-slate-400">Billed to</p><p class="mt-1 text-sm font-semibold">${esc(i.patient)}</p><p class="text-slate-500">${i.mrn}${x.pt.phone ? ' · •••• ' + x.pt.phone.slice(-4) : ''}</p></div>
        <div><p class="font-semibold uppercase tracking-wider text-slate-400">${i.rx ? 'Prescription' : 'Payer'}</p><p class="mt-1 text-sm font-semibold">${esc(i.rx || i.payer)}</p><p class="text-slate-500">GSTIN ${esc(x.B.gstin)}</p></div>
        <div class="text-right"><p class="font-semibold uppercase tracking-wider text-slate-400">Status</p><p class="mt-1">${badge(...x.st)}</p>${x.open ? `<p class="mt-1 font-semibold text-rose-600">${inr(due(i))} due</p>` : ''}</div></div>
      <div class="px-6"><table class="w-full"><thead><tr class="text-left text-[11px] uppercase tracking-wider" style="background:${x.ac}12;color:${x.ac}"><th class="rounded-l-lg px-3 py-2">#</th><th class="px-3 py-2">Description</th><th class="px-3 py-2 text-right">Qty</th><th class="px-3 py-2 text-right">Rate</th><th class="rounded-r-lg px-3 py-2 text-right">Amount</th></tr></thead>
        <tbody>${rows(i).map(r => `<tr class="border-b border-slate-100"><td class="px-3 py-2 text-slate-400">${r.n}</td><td class="px-3 py-2 font-medium">${esc(r.d)}</td><td class="px-3 py-2 text-right">${r.q}</td><td class="px-3 py-2 text-right">${money(r.r)}</td><td class="px-3 py-2 text-right font-medium">${money(r.a)}</td></tr>`).join('')}</tbody></table></div>
      <div class="flex flex-wrap items-end justify-between gap-4 px-6 py-4"><p class="max-w-[55%] text-xs italic text-slate-500">${esc(words(i.total))} Rupees only</p>
        <dl class="w-56 space-y-1 text-right text-xs"><div class="flex justify-between"><dt class="text-slate-500">Subtotal</dt><dd>${money(x.sub - x.gst)}</dd></div>
          <div class="flex justify-between"><dt class="text-slate-500">${x.ph ? 'GST 12%' : 'GST'}</dt><dd>${x.ph ? money(x.gst) : 'Exempt'}</dd></div>
          <div class="flex justify-between border-t border-slate-200 pt-1 text-sm font-bold"><dt>Total</dt><dd>${money(i.total)}</dd></div>
          <div class="flex justify-between text-emerald-700"><dt>Paid${i.mode ? ` (${esc(i.mode)})` : ''}</dt><dd>${money(i.paid)}</dd></div>
          ${x.open ? `<div class="mt-1 flex justify-between rounded-lg px-2 py-1.5 text-sm font-bold text-white" style="background:${x.ac}"><dt>Balance due</dt><dd>${money(due(i))}</dd></div>` : ''}</dl></div>
      <div class="flex flex-wrap items-end justify-between gap-4 border-t border-dashed border-slate-200 px-6 py-4">${qrBlock(i, x, o)}<p class="max-w-[240px] text-center text-[11px] text-slate-500">${esc(o.footer || '')}</p>${sign(o)}</div></div>`;
  }

  /* ---------------- template 2: minimal (without logo) ---------------- */
  function minimal(i, o) {
    const x = parts(i, o);
    return `<div class="rounded-xl bg-white p-7 text-[13px] text-slate-700 shadow-sm ring-1 ring-slate-200" style="font-feature-settings:'tnum'">
      <div class="flex flex-wrap items-start justify-between gap-4"><div><p class="text-xs font-semibold uppercase tracking-[.25em] text-slate-900">${esc(x.B.name)}</p>${x.ph ? `<p class="text-xs text-slate-500">${esc(x.ph.name)} · DL ${esc(x.ph.license)}</p>` : ''}<p class="mt-1 text-xs text-slate-500">${esc(x.B.addr)}</p></div>
        <div class="text-right"><p class="text-4xl font-extralight tracking-tight text-slate-900">${x.ph ? 'Slip' : 'Invoice'}</p><p class="font-mono text-xs text-slate-500">${i.id} · ${fmtDate(i.date)}</p></div></div>
      <div class="mt-8 grid grid-cols-3 gap-4 text-xs"><div><p class="text-[10px] uppercase tracking-[.2em] text-slate-400">To</p><p class="mt-1 text-slate-900">${esc(i.patient)}</p><p class="text-slate-500">${i.mrn}</p></div>
        <div><p class="text-[10px] uppercase tracking-[.2em] text-slate-400">${i.rx ? 'Prescription' : 'Payer'}</p><p class="mt-1 text-slate-900">${esc(i.rx || i.payer)}</p></div>
        <div class="text-right"><p class="text-[10px] uppercase tracking-[.2em] text-slate-400">Status</p><p class="mt-1 inline-flex items-center gap-1.5 text-slate-900"><span class="h-2 w-2 rounded-full ${x.open ? 'bg-rose-500' : 'bg-emerald-500'}"></span>${x.st[1]}</p></div></div>
      <table class="mt-8 w-full"><thead><tr class="border-b border-slate-900 text-left text-[10px] uppercase tracking-[.2em] text-slate-400"><th class="py-2 font-normal">Item</th><th class="py-2 text-right font-normal">Qty</th><th class="py-2 text-right font-normal">Rate</th><th class="py-2 text-right font-normal">Amount</th></tr></thead>
        <tbody>${rows(i).map(r => `<tr class="border-b border-slate-100"><td class="py-2.5 text-slate-900">${esc(r.d)}</td><td class="py-2.5 text-right">${r.q}</td><td class="py-2.5 text-right">${money(r.r)}</td><td class="py-2.5 text-right text-slate-900">${money(r.a)}</td></tr>`).join('')}</tbody></table>
      <div class="mt-6 flex flex-wrap items-end justify-between gap-6"><div class="space-y-1 text-xs text-slate-500"><p>Total ${money(i.total)} · Paid ${money(i.paid)}${i.mode ? ' · ' + esc(i.mode) : ''}${x.ph ? ` · incl. GST ${money(x.gst)}` : ''}</p><p class="italic">${esc(words(i.total))} Rupees only</p></div>
        <div class="text-right"><p class="text-[10px] uppercase tracking-[.2em] text-slate-400">${x.open ? 'Amount due' : 'Total paid'}</p><p class="text-3xl font-light text-slate-900">${inr(x.open ? due(i) : i.paid)}</p></div></div>
      <div class="mt-8 flex flex-wrap items-end justify-between gap-4 border-t border-slate-200 pt-4">${qrBlock(i, x, o)}${sign(o)}</div>
      <p class="mt-4 text-center text-[11px] text-slate-400">${esc(o.footer || '')} · ${esc(x.B.phone)} · GSTIN ${esc(x.B.gstin)}</p></div>`;
  }

  /* ---------------- template 3: modern (colour band) ---------------- */
  function modern(i, o) {
    const x = parts(i, o);
    return `<div class="overflow-hidden rounded-2xl bg-white text-[13px] text-slate-700 shadow-sm ring-1 ring-slate-200" style="font-feature-settings:'tnum'">
      <div class="relative overflow-hidden p-6 text-white" style="background:linear-gradient(135deg,${x.ac},${x.ac}cc 60%,${x.ac}99)">
        <div class="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10"></div><div class="absolute -bottom-16 right-28 h-32 w-32 rounded-full bg-white/10"></div>
        <div class="relative flex flex-wrap items-center gap-4">${logoBox(x, 52, true)}<div class="min-w-0 flex-1"><p class="text-lg font-bold">${esc(x.B.name)}</p><p class="text-xs text-white/75">${x.ph ? esc(x.ph.name) + ' · ' : ''}${x.title} ${i.id}</p></div>
          <div class="text-right"><p class="text-[11px] uppercase tracking-wider text-white/70">${x.open ? 'Amount due' : 'Paid in full'}</p><p class="text-3xl font-extrabold">${inr(x.open ? due(i) : i.total)}</p>
            <span class="mt-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold">${ico(x.open ? 'clock' : 'circle-check', 'h-3 w-3')}${x.st[1]}</span></div></div></div>
      <div class="grid grid-cols-2 gap-3 p-5 text-xs"><div class="rounded-xl bg-slate-50 p-3"><p class="text-slate-400">Billed to</p><p class="mt-0.5 text-sm font-semibold text-slate-900">${esc(i.patient)}</p><p class="text-slate-500">${i.mrn}</p></div>
        <div class="rounded-xl bg-slate-50 p-3"><p class="text-slate-400">Issued</p><p class="mt-0.5 text-sm font-semibold text-slate-900">${fmtDate(i.date)}</p><p class="text-slate-500">${esc(i.rx ? 'Against ' + i.rx : 'Payer: ' + i.payer)}</p></div></div>
      <ul class="space-y-1.5 px-5">${rows(i).map(r => `<li class="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5"><span class="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold" style="background:${x.ac}14;color:${x.ac}">${r.n}</span>
        <span class="min-w-0 flex-1"><span class="block truncate font-medium text-slate-900">${esc(r.d)}</span><span class="text-xs text-slate-500">${r.q} × ${money(r.r)}</span></span><span class="font-semibold text-slate-900">${money(r.a)}</span></li>`).join('')}</ul>
      <div class="m-5 rounded-xl p-4" style="background:${x.ac}0d"><div class="flex justify-between text-xs"><span class="text-slate-500">Total${x.ph ? ` (incl. GST ${money(x.gst)})` : ''}</span><b>${money(i.total)}</b></div>
        <div class="mt-1 flex justify-between text-xs"><span class="text-slate-500">Paid${i.mode ? ' · ' + esc(i.mode) : ''}</span><b class="text-emerald-700">${money(i.paid)}</b></div>
        <div class="mt-2 flex justify-between border-t border-slate-200 pt-2 text-sm font-bold" style="color:${x.ac}"><span>${x.open ? 'Balance due' : 'Balance'}</span><span>${money(due(i))}</span></div>
        <p class="mt-1 text-[11px] italic text-slate-500">${esc(words(i.total))} Rupees only</p></div>
      <div class="flex flex-wrap items-end justify-between gap-4 px-5 pb-5">${qrBlock(i, x, o)}${sign(o)}</div>
      <p class="px-5 py-3 text-center text-[11px] text-white" style="background:${x.ac}">${esc(o.footer || '')} · ${esc(x.B.phone)}</p></div>`;
  }

  const RENDER = { classic, minimal, modern };
  const sheet = (i, o) => { o = Object.assign({}, cfg(), o || {}); return `<div class="inv-doc">${(RENDER[o.tpl] || classic)(i, o)}</div>`; };

  /* ---------------- view / print / pay ---------------- */
  function view(id) {
    const i = D().invoices.find(x => x.id === id) || (ui.oldInv || []).find(x => x.id === id); if (!i) return;
    const patient = H().state.role === 'patient', pay = isOpen(i);
    modal({ title: i.id, sub: `${esc(i.patient)} · ${badge(...(IST[i.status] || ['slate', i.status]))}${i.kind === 'pharmacy' ? ' · pharmacy slip' : ''}`, icon: 'receipt', tone: i.kind === 'pharmacy' ? 'emerald' : 'amber', size: 'max-w-2xl', body: sheet(i),
      foot: `${btn('ghost', 'Print', 'printer', 'data-pg="inv-print"')}${btn('ghost', 'Download', 'download', `data-pg="inv-dl" data-id="${i.id}"`)}
        ${!patient ? btn('ghost', 'WhatsApp', 'message-circle', `data-pg="inv-wa" data-id="${i.id}"`) : ''}
        ${i.paid && can('payment:refund') && i.status !== 'refunded' ? btn('ghost', 'Refund', 'undo-2', `data-pg="inv-refund" data-id="${i.id}"`) : ''}
        ${pay ? (patient ? btn('primary', `Pay ${inr(due(i))}`, 'indian-rupee', `data-pg="dues-pay" data-mrn="${i.mrn}" data-only="${i.id}"`) : btn('primary', 'Collect payment', 'indian-rupee', `data-pg="inv-pay" data-id="${i.id}"`)) : ''}` });
  }
  on('inv-view', el => view(el.dataset.id));
  on('inv-print', () => { const d = document.querySelector('#pgPanel .inv-doc'); if (!d) return; d.classList.add('print-area'); window.print(); setTimeout(() => d.classList.remove('print-area'), 500); });
  on('inv-dl', el => { const d = document.querySelector('#pgPanel .inv-doc'); const m = window.PGMedia;
    if (m && m.isCloud()) return toast(`Saved to ${m.label()}`, `${el.dataset.id}.pdf · ${m.folderFor(el.dataset.id)}`, 'teal', 'cloud-upload');
    if (d) { d.classList.add('print-area'); window.print(); setTimeout(() => d.classList.remove('print-area'), 500); } toast('Save as PDF', 'Pick “Save as PDF” in the print dialog.', 'slate', 'download'); });
  // Trigger the billing page's collect flow from anywhere.
  function collect(id) { const b = document.createElement('button'); b.type = 'button'; b.dataset.pg = 'inv-pay'; b.dataset.id = id; b.hidden = true; document.body.appendChild(b); b.click(); b.remove(); }

  /* ---------------- dues: pay several bills at once ---------------- */
  const openFor = mrn => D().invoices.filter(i => i.mrn === mrn && isOpen(i));
  function openDues(mrn, o = {}) {
    const list = openFor(mrn).filter(i => !o.only || i.id === o.only); if (!list.length) return toast('Nothing due', 'All bills are paid.', 'emerald', 'circle-check');
    const patient = H().state.role === 'patient', modes = patient ? ['UPI', 'Card', 'Net banking'] : ['UPI', 'Cash', 'Card'];
    ui.duesBack = o.back || null;
    modal({ title: patient ? 'Pay your bills' : 'Collect dues', sub: `${esc(list[0].patient)} · ${list.length} unpaid bill${list.length > 1 ? 's' : ''}`, icon: 'wallet', tone: 'rose', size: 'max-w-lg', ok: 'Pay',
      body: `<ul id="duesList" class="space-y-2">${list.map(i => `<li><label class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 transition has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50/60 dark:border-slate-700 dark:has-[:checked]:bg-teal-500/10">
          <input type="checkbox" name="inv" value="${i.id}" checked class="h-4 w-4 accent-teal-600"/><span class="grid h-9 w-9 place-items-center rounded-lg ${K.tone(i.kind === 'pharmacy' ? 'emerald' : 'amber')}">${ico(i.kind === 'pharmacy' ? 'pill' : 'receipt')}</span>
          <span class="min-w-0 flex-1 text-sm"><b class="font-mono text-xs">${i.id}</b><span class="block truncate text-xs text-slate-500">${fmtDate(i.date)} · ${i.items.map(x => esc(x.desc)).join(', ')}</span></span><b class="tabular-nums">${inr(due(i))}</b></label></li>`).join('')}</ul>
        <div class="mt-4 grid grid-cols-3 gap-2">${modes.map((m, n) => `<label class="cursor-pointer"><input type="radio" name="mode" value="${m}" class="peer sr-only" ${n ? '' : 'checked'}/><span class="block rounded-xl border border-slate-200 py-2.5 text-center text-sm font-medium peer-checked:border-teal-600 peer-checked:bg-teal-50 peer-checked:text-teal-700 dark:border-slate-700 dark:peer-checked:bg-teal-500/10 dark:peer-checked:text-teal-300">${m}</span></label>`).join('')}</div>
        <div id="duesBox" class="mt-4 flex items-center gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60"></div>
        <p class="mt-3 text-xs text-slate-500">${ico('lock', 'mr-1 inline h-3 w-3')}Paid through the hospital’s payment gateway. Card details never touch HMS. A receipt goes to WhatsApp.</p>`,
      onSubmit: f => { const ids = [...f.querySelectorAll('[name=inv]:checked')].map(x => x.value); if (!ids.length) { toast('Pick a bill to pay', '', 'amber', 'receipt'); return false; }
        const mode = f.elements.mode.value; let amt = 0;
        ids.forEach(id => { const i = D().invoices.find(x => x.id === id); amt += due(i); i.paid = i.total; i.status = 'paid'; i.mode = mode; });
        H().bumpStat && H().bumpStat('revenue', amt); audit('indian-rupee', 'emerald', `<b>${who()}</b> ${patient ? 'paid' : 'collected'} ${inr(amt)} for ${ids.join(', ')} (${mode})`);
        toast(patient ? 'Payment successful' : 'Payment recorded', `${inr(amt)} · ${mode} · receipt on WhatsApp`, 'emerald', 'circle-check');
        const back = ui.duesBack; setTimeout(() => { H().rerenderPage(); if (back) window.PGCare.openPatient(back, 'bills'); updateFab(); }, 20); } });
    const draw = () => { const f = document.getElementById('pgForm'); if (!f) return; const ids = [...f.querySelectorAll('[name=inv]:checked')].map(x => x.value), tot = ids.reduce((s, id) => s + due(D().invoices.find(x => x.id === id)), 0), upiOn = f.elements.mode.value === 'UPI';
      document.getElementById('duesBox').innerHTML = `${upiOn && tot ? `<div class="rounded-lg bg-white p-1.5 ring-1 ring-slate-200">${qrSvg(`upi://pay?pa=${T().slug}hospital@hdfcbank&pn=${encodeURIComponent(T().name)}&am=${tot.toFixed(2)}&cu=INR&tn=${ids.join(',')}`, 84)}</div>` : ''}
        <div class="flex-1"><p class="text-xs text-slate-500">${ids.length} bill${ids.length === 1 ? '' : 's'} selected${upiOn && tot ? ' · scan with any UPI app' : ''}</p><p class="text-2xl font-bold tabular-nums">${inr(tot)}</p></div>`;
      f.querySelector('button[type=submit]').textContent = tot ? `Pay ${inr(tot)}` : 'Pay'; };
    document.getElementById('pgForm').addEventListener('change', draw); draw();
  }
  on('dues-pay', el => openDues(el.dataset.mrn, { only: el.dataset.only, back: el.dataset.back }));

  /* ---------------- floating pay button (patient portal) ---------------- */
  function updateFab() {
    let b = document.getElementById('payFab');
    const st = H() && H().state, pt = st && st.role === 'patient' ? D().pt(ROLES.patient.person) : null;
    const list = pt ? openFor(pt.mrn) : [], amt = list.reduce((s, i) => s + due(i), 0);
    if (!amt) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('button'); b.id = 'payFab'; b.type = 'button';
      b.className = 'pay-fab fixed bottom-[6.75rem] right-5 z-[55] flex items-center gap-2.5 rounded-full bg-rose-600 py-2 pl-2 pr-4 text-sm font-semibold text-white shadow-xl shadow-rose-600/30 transition hover:-translate-y-0.5 hover:bg-rose-700 sm:right-7';
      document.body.appendChild(b); }
    b.dataset.pg = 'dues-pay'; b.dataset.mrn = pt.mrn; b.setAttribute('aria-label', `Pay ${inr(amt)} due`);
    b.innerHTML = `<span class="relative grid h-9 w-9 place-items-center rounded-full bg-white/20"><span class="absolute inset-0 animate-ping rounded-full bg-white/30"></span>${ico('wallet', 'relative h-4 w-4')}</span><span class="text-left leading-tight"><span class="block text-[11px] font-medium text-rose-100">${list.length} bill${list.length > 1 ? 's' : ''} due</span>Pay ${inr(amt)}</span>`;
    H().icons();
  }
  document.addEventListener('click', () => setTimeout(updateFab, 60));
  setInterval(updateFab, 2000);

  /* ---------------- admin: choose the invoice design ---------------- */
  function sample() {
    const d = D(), i = d.invoices.find(x => isOpen(x) && x.items.length > 1) || d.invoices[0];
    return ui.invPrevKind === 'pharmacy' ? (d.invoices.find(x => x.kind === 'pharmacy') || { id: 'PHB-5100', kind: 'pharmacy', pharmacy: 'PH-01', rx: 'RX-7801', patient: i.patient, mrn: i.mrn, date: todayISO(), time: '10:42',
      items: [{ desc: 'Paracetamol 650 mg', qty: 15, rate: 1.8 }, { desc: 'Pantoprazole 40 mg', qty: 10, rate: 3.8 }, { desc: 'ORS sachet', qty: 6, rate: 21 }], total: 191, paid: 0, mode: '', status: 'due', payer: 'Self' }) : i;
  }
  function renderTpl(c) {
    const o = ui.invDraft || (ui.invDraft = Object.assign({}, cfg())), lg = logo();
    c.innerHTML = `<div class="fade-in grid gap-5 xl:grid-cols-5">
      <div class="space-y-5 xl:col-span-2">
        <div class="${card} p-5"><h3 class="font-semibold">Design</h3><p class="mb-4 text-xs text-slate-500">Used for every invoice, receipt and pharmacy payment slip.</p>
          <div class="space-y-3">${TPLS.map(t => `<label class="group flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-3 transition ${o.tpl === t.key ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-500/10' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'}">
              <input type="radio" name="tpl" value="${t.key}" class="sr-only" data-pg-change="inv-tpl" ${o.tpl === t.key ? 'checked' : ''}/>
              <span class="relative h-[118px] w-[92px] shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200 dark:ring-slate-700"><span class="pointer-events-none absolute left-0 top-0 block w-[560px] origin-top-left scale-[.164]">${sheet(sample(), Object.assign({}, o, { tpl: t.key }))}</span></span>
              <span class="min-w-0 flex-1"><span class="flex items-center gap-2"><b>${t.name}</b>${badge(t.key === 'minimal' ? 'slate' : 'teal', t.tag)}</span><span class="mt-1 block text-xs text-slate-500">${t.desc}</span></span>
              <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${o.tpl === t.key ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 dark:border-slate-600'}">${o.tpl === t.key ? ico('check', 'h-3.5 w-3.5') : ''}</span></label>`).join('')}</div></div>
        <div class="${card} space-y-5 p-5"><div><p class="mb-2 text-sm font-medium">Accent colour</p><div class="flex gap-2">${Object.entries(ACCENTS).map(([k, v]) => `<button type="button" class="h-9 w-9 rounded-full ring-offset-2 transition dark:ring-offset-slate-900 ${o.accent === k ? 'ring-2 ring-slate-900 dark:ring-white' : 'hover:scale-110'}" style="background:${v}" data-pg="inv-accent" data-k="${k}" aria-label="${k}"></button>`).join('')}</div></div>
          <div class="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><span class="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200 dark:ring-slate-700">${lg ? `<img src="${esc(lg)}" alt="" class="h-full w-full object-cover"/>` : `<b class="text-xs text-teal-700">${esc(K.initials(T().name))}</b>`}</span>
            <span class="flex-1 text-xs text-slate-500">${lg ? 'Your logo is used by Classic and Modern.' : 'No logo uploaded — Classic and Modern show your initials.'}</span>${btn('ghost', lg ? 'Change' : 'Upload', 'image', 'data-nav="account"', 'h-8 px-3')}</div>
          <label class="flex items-center justify-between gap-3 text-sm"><span>UPI QR on unpaid bills<span class="block text-xs text-slate-500">Patients scan and pay from the paper or WhatsApp copy</span></span><input type="checkbox" class="h-5 w-5 accent-teal-600" data-pg-change="inv-opt" data-k="qr" ${o.qr ? 'checked' : ''}/></label>
          <label class="flex items-center justify-between gap-3 text-sm"><span>Signature line</span><input type="checkbox" class="h-5 w-5 accent-teal-600" data-pg-change="inv-opt" data-k="sign" ${o.sign ? 'checked' : ''}/></label>
          <label class="block text-sm"><span class="mb-1.5 block font-medium">Footer note</span><input class="field" maxlength="90" value="${esc(o.footer)}" data-pg-input="inv-footer"/></label>
          <div class="flex gap-2">${btn('ghost', 'Reset', 'rotate-ccw', 'data-pg="inv-reset"', 'h-10 px-4 flex-1')}${btn('primary', 'Save design', 'check', 'data-pg="inv-save"', 'h-10 px-4 flex-1')}</div></div></div>
      <div class="xl:col-span-3"><div class="${card} sticky top-20">${K.toolbar(`<p class="text-sm font-semibold">Live preview</p><span class="flex-1"></span>${K.seg('invPrevKind', [['hospital', 'Hospital invoice'], ['pharmacy', 'Pharmacy slip']], ui.invPrevKind || 'hospital')}`)}
        <div id="invPrev" class="bg-slate-100 p-4 sm:p-6 dark:bg-slate-950/40">${sheet(sample(), o)}</div></div></div></div>`;
  }
  const redraw = () => rerender();
  onChange('inv-tpl', el => { ui.invDraft.tpl = el.value; redraw(); });
  onChange('inv-opt', el => { ui.invDraft[el.dataset.k] = el.checked; redraw(); });
  K.onInput('inv-footer', el => { ui.invDraft.footer = el.value; const p = document.getElementById('invPrev'); if (p) { p.innerHTML = sheet(sample(), ui.invDraft); H().icons(); } });
  on('inv-accent', el => { ui.invDraft.accent = el.dataset.k; redraw(); });
  on('inv-reset', () => { ui.invDraft = Object.assign({}, cfg()); redraw(); });
  on('inv-save', () => { Object.assign(cfg(), ui.invDraft); const t = TPLS.find(x => x.key === cfg().tpl);
    audit('receipt', 'teal', `<b>${who()}</b> set the invoice design to ${t.name}`); toast('Invoice design saved', `${t.name} · ${t.tag} · used for new and old bills`, 'teal', 'receipt'); });

  K.register({ 'payments:invoice': { title: 'Invoice Template', sub: 'Choose how invoices, receipts and pharmacy slips look — with or without your logo.', render: renderTpl } });
  window.PGInvoice = { sheet, view, collect, openDues, updateFab, words, TPLS, isOpen, due };
})();
