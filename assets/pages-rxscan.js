/* HMS demo — Paper prescription upload (scan / camera).
 * Most doctors still write on the pad, so the front desk (or the doctor, or a nurse)
 * photographs or uploads the paper prescription. It is saved on the patient record,
 * shown in the portal, and — when the hospital runs a pharmacy — dropped into the
 * dispense queue where the pharmacist reads the scan and dispenses against it.
 *
 * Record shape (lives in D().prescriptions next to typed prescriptions):
 *   { id, kind: 'scan', patient, mrn, doctor, dept, date, dx, items: [], pages: [{ src, type: 'image'|'pdf', name }],
 *     status: 'issued'|'sent'|'dispensed', shared, uploadedBy, uploadedAt, note }
 * Images are downscaled to ≤1600 px JPEG in the browser before they are kept (in memory only).
 */
(() => {
  'use strict';
  const K = window.PG;
  const { esc, T, D, can, me, card, badge, ico, btn, iconBtn, field, readForm, modal, closeModal, on, rerender, ui,
    todayISO, fmtDate, fmtShort, nowTime, note, inr, audit, who } = K;
  const H = () => window.HMS;
  const toast = (...a) => H().toast(...a);
  const hasPharmacy = () => H().modOn('pharmacy') && !!(window.PGPharmacy && window.PGPharmacy.active().length);
  const isScan = r => r && r.kind === 'scan';
  const MAX_PAGES = 8, MAX_PX = 1600;

  /* ---------------- sample scan (so the demo has one on day one) ---------------- */
  function sampleScan(doc, patient, lines, seed = 0) {
    const tilt = [-1.2, 0.8, -0.5][seed % 3];
    const meds = lines.map((l, i) => `<text x="70" y="${330 + i * 62}" font-size="27">${i + 1}. ${esc(l[0])}</text>
      <text x="100" y="${360 + i * 62}" font-size="21" fill="#334">${esc(l[1])}</text>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="820" viewBox="0 0 600 820">
      <defs><linearGradient id="pp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffdf6"/><stop offset="1" stop-color="#f1ecdf"/></linearGradient></defs>
      <rect width="600" height="820" fill="#cfc8b8"/>
      <g transform="rotate(${tilt} 300 410)"><rect x="22" y="18" width="556" height="784" rx="4" fill="url(#pp)"/>
        <rect x="22" y="18" width="556" height="96" fill="#0f766e" opacity=".92"/>
        <text x="48" y="60" font-family="Georgia,serif" font-size="26" fill="#fff" font-weight="bold">${esc(doc)}</text>
        <text x="48" y="90" font-family="Arial,sans-serif" font-size="14" fill="#d1fae5">MBBS, MD · Reg. WBMC 58213 · ${esc(T().name)}</text>
        <g font-family="'Segoe Script','Bradley Hand','Comic Sans MS',cursive" fill="#1e3a8a">
          <text x="48" y="160" font-size="20">Name: ${esc(patient)}</text><text x="400" y="160" font-size="20">${fmtShort(todayISO())}</text>
          <text x="48" y="200" font-size="20">c/o fever, body ache × 3 days</text>
          <text x="48" y="285" font-family="Georgia,serif" font-size="46" font-style="italic" fill="#0f172a">℞</text>
          ${meds}
          <text x="70" y="${360 + lines.length * 62 + 40}" font-size="20">Plenty of fluids · review after 5 days</text>
          <path d="M380 740 c20 -30 40 10 60 -12 s30 -20 50 4" stroke="#1e3a8a" stroke-width="2.5" fill="none"/>
        </g>
        <line x1="360" y1="760" x2="540" y2="760" stroke="#94a3b8"/><text x="400" y="782" font-family="Arial" font-size="12" fill="#64748b">Signature</text></g></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ---------------- image helpers ---------------- */
  const loadImg = src => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = src; });
  function toJpeg(source, rotate = 0) {
    const w0 = source.videoWidth || source.naturalWidth || source.width, h0 = source.videoHeight || source.naturalHeight || source.height;
    const s = Math.min(1, MAX_PX / Math.max(w0, h0)), w = Math.round(w0 * s), h = Math.round(h0 * s);
    const c = document.createElement('canvas'), turn = rotate % 180 !== 0;
    c.width = turn ? h : w; c.height = turn ? w : h;
    const x = c.getContext('2d'); x.translate(c.width / 2, c.height / 2); x.rotate(rotate * Math.PI / 180); x.drawImage(source, -w / 2, -h / 2, w, h);
    return c.toDataURL('image/jpeg', 0.82);
  }
  const readAsDataURL = f => new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = bad; r.readAsDataURL(f); });
  async function fileToPage(f) {
    if (f.type === 'application/pdf') return { type: 'pdf', src: URL.createObjectURL(f), name: f.name, size: f.size };
    if (!f.type.startsWith('image/')) throw new Error('type');
    return { type: 'image', src: toJpeg(await loadImg(await readAsDataURL(f))), name: f.name };
  }
  const kb = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

  /* ---------------- page thumbnails ---------------- */
  const thumb = (pg, cls = 'h-full w-full object-cover') => pg.type === 'pdf'
    ? `<span class="grid h-full w-full place-items-center bg-rose-50 text-rose-600 dark:bg-rose-500/10"><span class="text-center">${ico('file-text', 'mx-auto h-6 w-6')}<span class="mt-1 block text-[10px] font-bold">PDF</span></span></span>`
    : `<img src="${pg.src}" alt="" class="${cls}" loading="lazy"/>`;
  // Small stacked preview for lists/tables.
  const stack = (r, size = 'h-11 w-9') => `<button type="button" class="relative shrink-0 ${size} overflow-hidden rounded-md border border-slate-200 bg-slate-100 shadow-sm transition hover:ring-2 hover:ring-teal-500/50 dark:border-slate-700" data-pg="rxs-view" data-id="${r.id}" aria-label="View scanned prescription">
    ${thumb(r.pages[0])}${r.pages.length > 1 ? `<span class="absolute bottom-0 right-0 rounded-tl bg-slate-900/80 px-1 text-[9px] font-bold text-white">${r.pages.length}</span>` : ''}</button>`;

  /* ---------------- the full sheet (used by rx-view, the portal and the viewer) ---------------- */
  function sheet(r, at = 0) {
    const pg = r.pages[Math.min(at, r.pages.length - 1)];
    return `<div class="space-y-3">
      <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500">${badge('violet', 'Scanned prescription', 'scan-line')}
        <span><b class="text-slate-700 dark:text-slate-200">${esc(r.doctor)}</b> · ${fmtDate(r.date)}</span><span class="flex-1"></span>
        <span>Uploaded by ${esc(r.uploadedBy || '—')}${r.uploadedAt ? ' · ' + esc(r.uploadedAt) : ''}</span></div>
      <div class="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
        ${pg.type === 'pdf' ? `<iframe src="${pg.src}" title="Prescription PDF" class="h-[60vh] w-full bg-white"></iframe>`
          : `<img src="${pg.src}" alt="Prescription page ${at + 1}" class="mx-auto max-h-[60vh] w-full cursor-zoom-in object-contain" data-pg="rxs-zoom"/>`}
        ${r.pages.length > 1 ? `<span class="absolute left-2 top-2 rounded-full bg-slate-900/75 px-2 py-0.5 text-[11px] font-semibold text-white">Page ${at + 1} / ${r.pages.length}</span>` : ''}</div>
      ${r.pages.length > 1 ? `<div class="flex gap-2 overflow-x-auto pb-1 thin-scroll">${r.pages.map((p, i) => `<button type="button" class="h-16 w-12 shrink-0 overflow-hidden rounded-md border-2 ${i === at ? 'border-teal-500' : 'border-transparent opacity-70 hover:opacity-100'}" data-pg="rxs-page" data-id="${r.id}" data-i="${i}" aria-label="Page ${i + 1}">${thumb(p)}</button>`).join('')}</div>` : ''}
      ${r.dx && r.dx !== 'Paper prescription' ? `<p class="text-sm"><b>Diagnosis / note:</b> ${esc(r.dx)}</p>` : ''}
      ${r.items.length ? `<div class="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/5"><p class="mb-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">${ico('pill', 'mr-1 inline h-3.5 w-3.5')}Dispensed by pharmacy</p>
        <ul class="space-y-1 text-sm">${r.items.map(i => `<li class="flex justify-between gap-2"><span class="font-medium">${esc(i.drug)}</span><span class="text-xs text-slate-500">${esc(i.freq)} · ${esc(i.dur)}</span></li>`).join('')}</ul></div>` : ''}
    </div>`;
  }

  /* ---------------- viewer modal ---------------- */
  function openViewer(id, at = 0) {
    const r = D().prescriptions.find(x => x.id === id) || (ui.oldRx || []).find(x => x.id === id); if (!r) return;
    ui.rxsView = { id, at };
    const portal = H().state.role === 'patient';
    const RXS = window.PGCare.RXS;
    modal({ title: r.id, sub: `${esc(r.patient)} · ${r.mrn} · ${badge(...RXS[r.status])}`, icon: 'scan-line', tone: 'violet', size: 'max-w-2xl', body: sheet(r, at),
      foot: `${!portal && can('patient:read') ? btn('ghost', 'Patient record', 'user', `data-pg="patient" data-id="${r.mrn}"`) : ''}
        ${btn('ghost', 'Download', 'download', `data-pg="rxs-dl" data-id="${r.id}"`)}
        ${!portal ? btn('ghost', 'WhatsApp', 'message-circle', `data-pg="rx-wa" data-id="${r.id}"`) : ''}
        ${!portal && r.status === 'issued' && hasPharmacy() ? btn('primary', 'Send to pharmacy', 'send', `data-pg="rx-send" data-id="${r.id}" data-close-modal`) : ''}
        ${!portal && r.status === 'sent' && can('pharmacy:manage') ? btn('primary', 'Read & dispense', 'pill', `data-pg="ph-dispense" data-id="${r.id}"`) : ''}` });
  }
  on('rxs-view', el => openViewer(el.dataset.id));
  on('rxs-page', el => openViewer(el.dataset.id, +el.dataset.i));
  on('rxs-zoom', el => { el.classList.toggle('max-h-[60vh]'); el.classList.toggle('cursor-zoom-out'); });
  on('rxs-dl', el => { const r = D().prescriptions.find(x => x.id === el.dataset.id) || (ui.oldRx || []).find(x => x.id === el.dataset.id), M = window.PGMedia;
    if (M && M.isCloud()) return toast(`Saved to ${M.label()}`, `${r.id} · ${r.pages.length} page${r.pages.length > 1 ? 's' : ''} → ${M.folderFor(r.id, r.patient)}`, 'teal', 'cloud-upload');
    r.pages.forEach((p, i) => { const a = document.createElement('a'); a.href = p.src; a.download = `${r.id}${r.pages.length > 1 ? '-p' + (i + 1) : ''}.${p.type === 'pdf' ? 'pdf' : p.src.startsWith('data:image/svg') ? 'svg' : 'jpg'}`; document.body.appendChild(a); a.click(); a.remove(); });
    toast('Downloading', `${r.pages.length} page${r.pages.length > 1 ? 's' : ''}`, 'slate', 'download'); });

  /* ---------------- upload modal ---------------- */
  let stream = null;
  const stopCam = () => { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } };
  // Release the camera whenever the shared modal closes or is replaced.
  const watchModal = () => { const m = document.getElementById('pgModal'); if (!m || m._rxsWatch) return; m._rxsWatch = true;
    new MutationObserver(() => { if (!m.classList.contains('open')) stopCam(); }).observe(m, { attributes: true, attributeFilter: ['class'] }); };
  const coarse = () => window.matchMedia && matchMedia('(pointer: coarse)').matches;

  function todaysVisit(mrn) { return T().appointments.find(a => a.mrn === mrn && a.status !== 'cancelled'); }

  function openUpload(mrn, opts = {}) {
    watchModal(); stopCam();
    const d = D(), docs = T().doctors.map(x => x.name);
    const p = d.patients.find(x => x.mrn === mrn) || null;
    const visit = p && todaysVisit(p.mrn);
    ui.rxu = { pages: [], back: opts.back || null };
    const defDoc = (visit && visit.doctor) || (H().state.role === 'doctor' ? me().person : (p && p.doctor)) || docs[0];
    const pharm = hasPharmacy();

    modal({ title: 'Upload prescription', sub: 'Photograph the doctor’s paper prescription or attach a scan / PDF', icon: 'camera', tone: 'violet', size: 'max-w-2xl', ok: pharm ? 'Save & send' : 'Save to record',
      body: `<div class="grid gap-4 sm:grid-cols-2">
          ${field('patient', 'Patient', { opts: [['', 'Select patient…'], ...d.patients.map(x => [x.mrn, `${x.name} · ${x.mrn}`])], value: p ? p.mrn : '' })}
          <label class="block"><span class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Written by</span>
            <select name="doctor" class="field">${docs.map(n => `<option ${n === defDoc ? 'selected' : ''}>${esc(n)}</option>`).join('')}<option value="__other">Outside doctor…</option></select></label>
          <div id="rxuOther" class="hidden sm:col-span-2">${field('otherDoc', 'Outside doctor’s name', { ph: 'e.g. Dr. S. Mukherjee (private clinic)' })}</div>
          <div id="rxuCtx" class="sm:col-span-2"></div></div>

        <div class="mt-5">
          <div class="mb-2 flex items-center justify-between"><p class="text-sm font-medium text-slate-700 dark:text-slate-200">Prescription pages <span class="text-rose-500">*</span></p><span id="rxuCount" class="text-xs text-slate-500"></span></div>
          <div id="rxuCam" class="hidden"></div>
          <div id="rxuDrop" class="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-5 text-center transition dark:border-slate-700 dark:bg-slate-800/40">
            <span class="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl ${K.tone('violet')}">${ico('scan-line', 'h-6 w-6')}</span>
            <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">Take a photo or drop files here</p>
            <p class="mx-auto mt-0.5 max-w-sm text-xs text-slate-500">Lay the paper flat in good light. JPG, PNG, HEIC or PDF · up to ${MAX_PAGES} pages.</p>
            <div class="mt-4 flex flex-wrap justify-center gap-2">
              ${btn('primary', 'Take photo', 'camera', 'data-pg="rxu-cam"', 'h-11 px-5')}
              <label class="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">${ico('upload')}Choose file<input id="rxuFile" type="file" accept="image/*,application/pdf" multiple class="sr-only"/></label>
              <input id="rxuNative" type="file" accept="image/*" capture="environment" class="sr-only" tabindex="-1" aria-hidden="true"/></div></div>
          <div id="rxuPages" class="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4"></div>
          <span id="rxuErr" class="mt-1 hidden text-xs text-rose-600">Add at least one page.</span></div>

        <div class="mt-5">${field('dx', 'Diagnosis or note (optional)', { ph: 'e.g. Viral fever — helps search later' })}</div>

        <div class="mt-5 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
          <p class="mb-3 text-sm font-semibold">Send it to</p>
          <div class="space-y-3">
            <label class="flex items-start gap-3 text-sm"><input type="checkbox" checked disabled class="mt-0.5 h-4 w-4 accent-teal-600"/><span><b>Patient record</b><span class="block text-xs text-slate-500">Always saved under Prescriptions on the profile and in the patient portal.</span></span></label>
            ${pharm ? `<div class="flex items-start gap-3 text-sm"><input type="checkbox" name="toPharmacy" checked class="mt-0.5 h-4 w-4 accent-teal-600" id="rxuToPh"/><div class="flex-1"><label for="rxuToPh"><b>Pharmacy</b><span class="block text-xs text-slate-500">Lands in that pharmacy’s queue. They read the photo, dispense and issue a payment slip.</span></label>
                ${window.PGPharmacy.active().length > 1 ? `<select name="pharmacy" class="field mt-2 !h-9" aria-label="Which pharmacy">${window.PGPharmacy.active().map(p => `<option value="${p.id}" ${p.id === (window.PGPharmacy.defaultFor() || {}).id ? 'selected' : ''}>${esc(p.name)} · ${esc(T().branches[p.branch].split(' · ')[0])} · ${esc(p.hours)}</option>`).join('')}</select>` : `<input type="hidden" name="pharmacy" value="${window.PGPharmacy.defaultFor().id}"/>`}</div></div>`
              : `<div class="flex items-start gap-3 text-sm text-slate-500">${ico('store', 'mt-0.5 h-4 w-4 shrink-0')}<span>No pharmacy is set up for this hospital. Send the patient a copy so they can buy from any medical shop.</span></div>`}
            <label class="flex items-start gap-3 text-sm"><input type="checkbox" name="wa" ${pharm ? '' : 'checked'} class="mt-0.5 h-4 w-4 accent-teal-600"/><span><b>WhatsApp a copy to the patient</b><span class="block text-xs text-slate-500" id="rxuPhone">Sent to their registered mobile.</span></span></label>
          </div></div>`,
      onSubmit: f => save(f) });

    const form = document.getElementById('pgForm');
    const ctx = () => {
      const pt = d.patients.find(x => x.mrn === form.elements.patient.value), v = pt && todaysVisit(pt.mrn);
      document.getElementById('rxuCtx').innerHTML = pt ? `<div class="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
        ${ico('user', 'h-3.5 w-3.5')}<b>${esc(pt.name)}</b> · ${pt.age}${pt.gender} · •••• ${pt.phone.slice(-4)}${v ? ` · today ${v.time} with ${esc(v.doctor)}` : ''}
        ${pt.allergies ? badge('rose', 'Allergy: ' + pt.allergies, 'triangle-alert') : ''}</div>` : '';
      document.getElementById('rxuPhone').textContent = pt ? `Sent to •••• ${pt.phone.slice(-4)}.` : 'Sent to their registered mobile.';
      if (v && docs.includes(v.doctor)) form.elements.doctor.value = v.doctor;
      H().icons();
    };
    form.elements.patient.addEventListener('change', ctx);
    form.elements.doctor.addEventListener('change', () => document.getElementById('rxuOther').classList.toggle('hidden', form.elements.doctor.value !== '__other'));
    document.getElementById('rxuFile').addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
    document.getElementById('rxuNative').addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
    const drop = document.getElementById('rxuDrop');
    ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('!border-teal-500', '!bg-teal-50/60'); }));
    ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('!border-teal-500', '!bg-teal-50/60'); }));
    drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));
    // Paste a screenshot / copied image straight in.
    form.addEventListener('paste', e => { const fs = [...(e.clipboardData?.files || [])]; if (fs.length) { e.preventDefault(); addFiles(fs); } });
    ctx(); drawPages();
    if (opts.camera) startCam();
  }

  async function addFiles(list) {
    const files = [...(list || [])];
    for (const f of files) {
      if (ui.rxu.pages.length >= MAX_PAGES) { toast('Page limit reached', `Up to ${MAX_PAGES} pages per prescription.`, 'amber', 'files'); break; }
      try { ui.rxu.pages.push(await fileToPage(f)); }
      catch (e) { toast('Can’t read this file', `${f.name} · use a photo (JPG/PNG) or a PDF`, 'rose', 'file-x'); }
    }
    drawPages();
  }

  function drawPages() {
    const box = document.getElementById('rxuPages'); if (!box) return;
    const P = ui.rxu.pages;
    box.innerHTML = P.map((pg, i) => `<figure class="group relative aspect-[3/4] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      ${thumb(pg)}
      <span class="absolute left-1.5 top-1.5 rounded-full bg-slate-900/75 px-1.5 text-[10px] font-bold text-white">${i + 1}</span>
      <div class="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-slate-900/70 to-transparent p-1.5">
        ${pg.type === 'image' ? `<button type="button" class="rounded-md bg-white/90 p-1 text-slate-700 hover:bg-white" data-pg="rxu-rot" data-i="${i}" aria-label="Rotate page ${i + 1}" title="Rotate">${ico('rotate-cw', 'h-3.5 w-3.5')}</button>` : ''}
        ${i > 0 ? `<button type="button" class="rounded-md bg-white/90 p-1 text-slate-700 hover:bg-white" data-pg="rxu-left" data-i="${i}" aria-label="Move page ${i + 1} earlier" title="Move earlier">${ico('arrow-left', 'h-3.5 w-3.5')}</button>` : ''}
        <button type="button" class="rounded-md bg-white/90 p-1 text-rose-600 hover:bg-white" data-pg="rxu-del" data-i="${i}" aria-label="Remove page ${i + 1}" title="Remove">${ico('trash-2', 'h-3.5 w-3.5')}</button></div>
      ${pg.type === 'pdf' ? `<figcaption class="absolute inset-x-0 top-1.5 truncate px-7 text-center text-[10px] text-slate-500">${esc(pg.name)} · ${kb(pg.size)}</figcaption>` : ''}</figure>`).join('')
      + (P.length && P.length < MAX_PAGES ? `<button type="button" class="grid aspect-[3/4] place-items-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition hover:border-teal-500 hover:text-teal-600 dark:border-slate-700" data-pg="rxu-cam" aria-label="Add another page"><span class="text-center text-xs font-semibold">${ico('plus', 'mx-auto mb-1 h-5 w-5')}Add page</span></button>` : '');
    document.getElementById('rxuCount').textContent = P.length ? `${P.length} page${P.length > 1 ? 's' : ''}` : '';
    document.getElementById('rxuDrop').classList.toggle('hidden', !!P.length || !!stream);
    if (P.length) document.getElementById('rxuErr').classList.add('hidden');
    H().icons();
  }
  on('rxu-del', el => { const pg = ui.rxu.pages.splice(+el.dataset.i, 1)[0]; if (pg && pg.type === 'pdf') URL.revokeObjectURL(pg.src); drawPages(); });
  on('rxu-left', el => { const i = +el.dataset.i, P = ui.rxu.pages; [P[i - 1], P[i]] = [P[i], P[i - 1]]; drawPages(); });
  on('rxu-rot', async el => { const pg = ui.rxu.pages[+el.dataset.i]; pg.src = toJpeg(await loadImg(pg.src), 90); drawPages(); });

  /* ---------------- live camera ---------------- */
  on('rxu-cam', () => startCam());
  async function startCam(facing = 'environment') {
    // Phones/tablets: the native camera app is faster and handles focus/flash better.
    if (coarse() || !navigator.mediaDevices?.getUserMedia) return document.getElementById('rxuNative')?.click();
    stopCam();
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }); }
    catch (e) {
      toast('Camera not available', e && e.name === 'NotAllowedError' ? 'Allow camera access in the browser, or choose a file instead.' : 'No camera found — choose a photo or PDF instead.', 'amber', 'camera-off');
      return document.getElementById('rxuFile')?.click();
    }
    const cams = (await navigator.mediaDevices.enumerateDevices().catch(() => [])).filter(x => x.kind === 'videoinput');
    const box = document.getElementById('rxuCam'); if (!box) return stopCam();
    ui.rxuFacing = facing;
    box.innerHTML = `<div class="relative overflow-hidden rounded-2xl bg-black">
        <video id="rxuVideo" autoplay playsinline muted class="max-h-[52vh] w-full object-contain"></video>
        <div class="pointer-events-none absolute inset-6 rounded-xl border-2 border-white/60" style="box-shadow:0 0 0 9999px rgba(0,0,0,.25)"></div>
        <p class="pointer-events-none absolute inset-x-0 top-2 text-center text-xs font-medium text-white/90 drop-shadow">Fit the whole prescription inside the frame</p>
        <div id="rxuFlash" class="pointer-events-none absolute inset-0 bg-white opacity-0 transition-opacity duration-150"></div>
        <div class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
          <button type="button" class="h-10 rounded-xl bg-white/15 px-3 text-sm font-semibold text-white hover:bg-white/25" data-pg="rxu-camoff">Close</button>
          <button type="button" class="grid h-16 w-16 place-items-center rounded-full border-4 border-white bg-white/20 transition hover:bg-white/40 active:scale-95" data-pg="rxu-snap" aria-label="Capture page"><span class="h-11 w-11 rounded-full bg-white"></span></button>
          <span class="flex gap-2">${cams.length > 1 ? `<button type="button" class="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-white hover:bg-white/25" data-pg="rxu-flip" aria-label="Switch camera">${ico('switch-camera')}</button>` : ''}
            <button type="button" id="rxuDone" class="h-10 rounded-xl bg-teal-500 px-3 text-sm font-semibold text-white hover:bg-teal-600" data-pg="rxu-camoff">Done</button></span></div></div>
      <p class="mt-2 text-center text-xs text-slate-500">Press <kbd class="rounded border border-slate-300 px-1 dark:border-slate-600">Space</kbd> to capture · multi-page prescriptions: capture each page</p>`;
    box.classList.remove('hidden'); document.getElementById('rxuDrop').classList.add('hidden');
    document.getElementById('rxuVideo').srcObject = stream;
    H().icons();
  }
  function camOff() { stopCam(); const box = document.getElementById('rxuCam'); if (box) { box.classList.add('hidden'); box.innerHTML = ''; } drawPages(); }
  on('rxu-camoff', camOff);
  on('rxu-flip', () => startCam(ui.rxuFacing === 'environment' ? 'user' : 'environment'));
  on('rxu-snap', snap);
  function snap() {
    const v = document.getElementById('rxuVideo'); if (!v || !v.videoWidth) return;
    if (ui.rxu.pages.length >= MAX_PAGES) return toast('Page limit reached', `Up to ${MAX_PAGES} pages per prescription.`, 'amber', 'files');
    ui.rxu.pages.push({ type: 'image', src: toJpeg(v), name: `camera-${ui.rxu.pages.length + 1}.jpg` });
    const fl = document.getElementById('rxuFlash'); fl.style.opacity = '.85'; setTimeout(() => { fl.style.opacity = '0'; }, 120);
    const done = document.getElementById('rxuDone'); if (done) done.textContent = `Done · ${ui.rxu.pages.length}`;
    drawPages();
  }
  document.addEventListener('keydown', e => { if (stream && e.code === 'Space' && document.getElementById('rxuVideo') && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { e.preventDefault(); snap(); } });

  /* ---------------- save ---------------- */
  function save(f) {
    const d = D(), v = readForm(f, ['patient']); if (!v) return false;
    if (!ui.rxu.pages.length) { document.getElementById('rxuErr').classList.remove('hidden'); toast('Add the prescription', 'Take a photo or choose a file first.', 'amber', 'camera'); return false; }
    if (v.doctor === '__other' && !String(v.otherDoc || '').trim()) { const el = f.elements.otherDoc; el.classList.add('invalid'); el.focus(); return false; }
    stopCam();
    const p = d.patients.find(x => x.mrn === v.patient), doc = v.doctor === '__other' ? v.otherDoc.trim() : v.doctor;
    const toPh = !!v.toPharmacy && hasPharmacy();
    const r = { id: 'RX-' + (7900 + d.prescriptions.length), kind: 'scan', patient: p.name, mrn: p.mrn, doctor: doc, dept: (T().employees.find(e => e.name === doc) || {}).dept || 'Outside',
      date: todayISO(), dx: (v.dx || '').trim() || 'Paper prescription', items: [], pages: ui.rxu.pages.slice(), status: toPh ? 'sent' : 'issued', shared: !!v.wa, pharmacy: toPh ? v.pharmacy : undefined,
      uploadedBy: me().person, uploadedAt: 'Today ' + nowTime() };
    d.prescriptions.unshift(r); ui.flash = r.id;
    audit('scan-line', 'violet', `<b>${who()}</b> uploaded a scanned prescription for ${esc(p.name)} (${r.id}, ${r.pages.length} page${r.pages.length > 1 ? 's' : ''})`);
    const M = window.PGMedia, where = [toPh && (window.PGPharmacy.phById(v.pharmacy) || {}).name, r.shared && 'WhatsApp', M && M.isCloud() && M.label()].filter(Boolean);
    toast('Prescription saved', `${p.name} · ${r.id}${where.length ? ' · sent to ' + where.join(' + ') : ' · on patient record'}`, 'violet', 'file-check');
    if (toPh) H().notify({ icon: 'scan-line', tone: 'violet', title: 'Prescription sent to pharmacy', text: `${r.id} · ${p.name} · ${r.pages.length} page${r.pages.length > 1 ? 's' : ''}` });
    const back = ui.rxu.back; ui.rxu = null;
    if (back) { H().rerenderPage(); window.PGCare.openPatient(back, 'rx'); return false; }
    setTimeout(() => H().refresh(false), 0);
  }

  on('rxu-new', el => openUpload(el.dataset.mrn, { back: el.dataset.back, camera: el.dataset.cam === '1' }));

  /* ---------------- pharmacist: read the scan & dispense ---------------- */
  const qtyOf = i => (i.freq === 'SOS' ? 1 : i.freq.split('-').reduce((a, b) => a + +b, 0)) * parseInt(i.dur, 10);
  const lineTotal = i => { const x = D().drugs.find(y => y.name === i.drug); return x ? x.price / 10 * qtyOf(i) : 0; };
  on('rxs-disp', el => {
    const d = D(), r = d.prescriptions.find(x => x.id === el.dataset.id); if (!r) return;
    ui.rxsLines = r.items.length ? r.items.map(i => ({ ...i })) : [{ drug: d.drugs[0].name, freq: '1-0-1', dur: '5 days', note: '' }];
    const pt = d.patients.find(x => x.mrn === r.mrn) || {};
    modal({ title: `Dispense ${r.id}`, sub: `${esc(r.patient)} · ${esc(r.doctor)} · read the scan and pick the medicines`, icon: 'pill', tone: 'emerald', size: 'max-w-5xl', ok: 'Dispense & bill',
      body: `<div class="grid gap-5 lg:grid-cols-2">
        <div class="lg:sticky lg:top-0 lg:self-start">${sheet(r, 0)}</div>
        <div>${pt.allergies ? note('rose', 'triangle-alert', `<b>Allergy:</b> ${esc(pt.allergies)}`) + '<div class="h-3"></div>' : ''}
          <div class="mb-2 flex items-center justify-between"><p class="text-sm font-medium">Medicines on the prescription</p>${btn('soft', 'Add line', 'plus', 'data-pg="rxs-add"', 'h-8 px-3')}</div>
          <div id="rxsLines" class="space-y-2"></div>
          <div id="rxsTotal" class="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/60"></div>
          <p class="mt-2 text-xs text-slate-500">Can’t read something? ${btn('ghost', 'Call the doctor', 'phone', `data-pg="rxs-call" data-id="${r.id}"`, 'h-7 px-2 text-xs')}</p></div></div>`,
      onSubmit: () => {
        const lines = ui.rxsLines.filter(i => i.drug);
        if (!lines.length) { toast('Add at least one medicine', '', 'amber', 'pill'); return false; }
        r.items = lines;
        lines.forEach(i => { const x = d.drugs.find(y => y.name === i.drug); if (x && x.stock) { const q = Math.min(x.stock, qtyOf(i) || 1); x.stock -= q; (d.ledger || (d.ledger = [])).unshift({ at: 'Now', kind: 'Dispense', item: x.name, qty: -q, by: me().person, ref: r.id }); } });
        r.status = 'dispensed'; r.dispensedBy = me().person;
        const total = lines.reduce((s, i) => s + lineTotal(i), 0);
        audit('pill', 'emerald', `<b>${who()}</b> dispensed scanned prescription ${r.id} for ${esc(r.patient)}`);
        toast('Dispensed', `${r.patient} · ${lines.length} item${lines.length > 1 ? 's' : ''} · ${inr(total)} added to bill`, 'emerald', 'pill');
        setTimeout(() => rerender(), 0);
      } });
    drawLines();
    const box = document.getElementById('rxsLines');
    box.addEventListener('change', ev => { const t = ev.target; if (t.dataset.l == null) return; ui.rxsLines[+t.dataset.l][t.dataset.k] = t.value; drawLines(); });
  });
  function drawLines() {
    const d = D(), box = document.getElementById('rxsLines'); if (!box) return;
    box.innerHTML = ui.rxsLines.map((it, i) => { const s = d.drugs.find(x => x.name === it.drug);
      return `<div class="rounded-xl border border-slate-200 p-2.5 dark:border-slate-700"><div class="grid grid-cols-12 items-center gap-2">
        <select class="field col-span-11 !h-9" data-l="${i}" data-k="drug" aria-label="Medicine">${d.drugs.map(x => `<option ${x.name === it.drug ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
        <button type="button" class="col-span-1 rounded-lg p-1.5 text-slate-400 hover:text-rose-600" data-pg="rxs-del" data-i="${i}" aria-label="Remove">${ico('trash-2')}</button>
        <select class="field col-span-4 !h-9" data-l="${i}" data-k="freq" aria-label="Frequency">${['1-0-0', '0-0-1', '1-0-1', '1-1-1', 'SOS'].map(x => `<option ${x === it.freq ? 'selected' : ''}>${x}</option>`).join('')}</select>
        <select class="field col-span-4 !h-9" data-l="${i}" data-k="dur" aria-label="Duration">${['3 days', '5 days', '7 days', '10 days', '30 days'].map(x => `<option ${x === it.dur ? 'selected' : ''}>${x}</option>`).join('')}</select>
        <span class="col-span-4 text-right text-xs"><span class="block font-semibold tabular-nums">${inr(lineTotal(it))}</span>${s ? (s.stock === 0 ? badge('rose', 'Out of stock') : s.stock <= s.reorder ? badge('amber', `Low · ${s.stock}`) : `<span class="text-slate-400">${s.stock} in stock</span>`) : ''}</span></div></div>`; }).join('');
    const tot = ui.rxsLines.reduce((s, i) => s + lineTotal(i), 0);
    document.getElementById('rxsTotal').innerHTML = `<span class="text-slate-500">${ui.rxsLines.length} item${ui.rxsLines.length === 1 ? '' : 's'}</span><span class="text-base font-bold tabular-nums">${inr(tot)}</span>`;
    H().icons();
  }
  on('rxs-add', () => { ui.rxsLines.push({ drug: D().drugs[1].name, freq: '1-0-1', dur: '5 days', note: '' }); drawLines(); });
  on('rxs-del', el => { ui.rxsLines.splice(+el.dataset.i, 1); drawLines(); });
  on('rxs-call', el => { const r = D().prescriptions.find(x => x.id === el.dataset.id); toast('Calling', `${r.doctor} · via the hospital extension`, 'sky', 'phone'); });

  window.PGRxScan = { isScan, sheet, stack, thumb, openUpload, openViewer, sampleScan, hasPharmacy };
})();
