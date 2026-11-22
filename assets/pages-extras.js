/* HMS demo — Per-user media storage + patient health card pages.
 * Media storage: every user picks where their downloads and uploaded media go — this device,
 * or a Google Drive / OneDrive / Dropbox folder link. Saved per user in this browser.
 * (Full build: the cloud folder is written through the provider's OAuth; the demo only keeps the link.)
 */
(() => {
  'use strict';
  const K = window.PG;
  const { esc, T, D, card, badge, ico, btn, modal, on, onChange, ui, note, audit, who, iso } = K;
  const H = () => window.HMS;
  const toast = (...a) => H().toast(...a);

  /* ======================= Media storage ======================= */
  const PROVIDERS = {
    device:  { label: 'This device',  icon: 'hard-drive-download', tone: 'slate',   hint: 'Files go to your browser’s Downloads folder.' },
    gdrive:  { label: 'Google Drive', icon: 'cloud',               tone: 'emerald', hint: 'Paste a folder link, e.g. https://drive.google.com/drive/folders/1AbC…', re: /^https:\/\/drive\.google\.com\/(drive\/(u\/\d+\/)?folders\/|open\?id=)[\w-]{10,}/ },
    onedrive:{ label: 'OneDrive',     icon: 'cloud-cog',           tone: 'sky',     hint: 'Paste a folder link from onedrive.live.com, 1drv.ms or SharePoint.', re: /^https:\/\/((www\.)?onedrive\.live\.com|1drv\.ms|[\w-]+\.sharepoint\.com)\// },
    dropbox: { label: 'Dropbox',      icon: 'box',                 tone: 'violet',  hint: 'Paste a folder link from dropbox.com.', re: /^https:\/\/(www\.)?dropbox\.com\// },
  };
  const key = () => `hms-media:${(window.HMS_SESSION && window.HMS_SESSION.uid) || 'demo'}:${H().state.role}`;
  const DEF = { provider: 'device', link: '', layout: 'patient', ask: false };
  const get = () => { try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(key()) || 'null')); } catch (e) { return Object.assign({}, DEF); } };
  const set = v => { try { localStorage.setItem(key(), JSON.stringify(v)); } catch (e) {} };
  const isCloud = () => get().provider !== 'device';
  const label = () => PROVIDERS[get().provider].label;
  const folderFor = (ref, patient) => { const m = get(); return m.layout === 'date' ? `HMS/${iso(new Date()).slice(0, 7)}` : m.layout === 'patient' ? `HMS/${patient || ref}` : 'HMS'; };

  function open() {
    ui.media = get();
    const draw = () => {
      const m = ui.media, p = PROVIDERS[m.provider], box = document.getElementById('mdBody'); if (!box) return;
      box.innerHTML = `<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">${Object.entries(PROVIDERS).map(([k, v]) => `<button type="button" class="flex flex-col items-center gap-2 rounded-2xl border-2 p-3 text-center text-sm font-medium transition ${m.provider === k ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-500/10' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'}" data-pg="md-pick" data-k="${k}" aria-pressed="${m.provider === k}">
          <span class="grid h-10 w-10 place-items-center rounded-xl ${K.tone(v.tone)}">${ico(v.icon, 'h-5 w-5')}</span>${v.label}</button>`).join('')}</div>
        ${m.provider === 'device' ? `<div class="mt-4 space-y-3"><p class="text-sm text-slate-500">${p.hint}</p>
            <label class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"><span>Ask where to save each file<span class="block text-xs text-slate-500">Uses the browser’s “Save as” window where supported</span></span><input type="checkbox" class="h-5 w-5 accent-teal-600" data-pg-change="md-ask" ${m.ask ? 'checked' : ''}/></label></div>`
          : `<label class="mt-4 block text-sm"><span class="mb-1.5 block font-medium">${p.label} folder link <span class="text-rose-500">*</span></span>
              <div class="flex gap-2"><input id="mdLink" class="field flex-1 font-mono text-xs" placeholder="https://…" value="${esc(m.link)}" autocomplete="off"/>${btn('ghost', 'Test', 'plug-zap', 'data-pg="md-test"', 'h-10 px-3')}</div>
              <span id="mdErr" class="mt-1 hidden text-xs text-rose-600"></span><span class="mt-1 block text-xs text-slate-500">${p.hint} Share the folder with <b>Can edit</b> access for your account.</span></label>`}
        <label class="mt-4 block text-sm"><span class="mb-1.5 block font-medium">Organise files</span><select class="field" data-pg-change="md-layout">${[['patient', 'A folder per patient (HMS / Patient name)'], ['date', 'A folder per month (HMS / 2026-11)'], ['flat', 'Everything in one folder']].map(([v, l]) => `<option value="${v}" ${m.layout === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <div class="mt-4">${note('sky', 'shield-check', 'Patient records are always kept on the hospital server too. This setting only decides where <b>your</b> downloads and copies go. It is saved for your login on this browser.')}</div>`;
      H().icons();
    };
    ui.mdDraw = draw;
    modal({ title: 'Media storage', sub: 'Where your downloads and uploaded media are saved', icon: 'folder-cog', tone: 'teal', size: 'max-w-xl', ok: 'Save',
      body: '<div id="mdBody"></div>',
      onSubmit: () => { const m = ui.media, p = PROVIDERS[m.provider];
        if (m.provider !== 'device') { m.link = (document.getElementById('mdLink').value || '').trim();
          if (!p.re.test(m.link)) { const e = document.getElementById('mdErr'); e.textContent = `That doesn’t look like a ${p.label} folder link.`; e.classList.remove('hidden'); document.getElementById('mdLink').focus(); return false; } }
        set(m); audit('folder-cog', 'teal', `<b>${who()}</b> set media storage to ${p.label}`);
        toast('Media storage saved', m.provider === 'device' ? 'Files download to this device' : `New files go to your ${p.label} folder`, 'teal', 'folder-check'); } });
    draw();
  }
  on('md-open', open);
  on('md-pick', el => { const k = el.dataset.k; ui.media.provider = k; ui.media.link = k === get().provider ? get().link : ''; ui.mdDraw(); });
  onChange('md-ask', el => { ui.media.ask = el.checked; });
  onChange('md-layout', el => { ui.media.layout = el.value; });
  on('md-test', () => { const p = PROVIDERS[ui.media.provider], v = (document.getElementById('mdLink').value || '').trim(), e = document.getElementById('mdErr');
    if (!p.re.test(v)) { e.textContent = `That doesn’t look like a ${p.label} folder link.`; e.classList.remove('hidden'); return; }
    e.classList.add('hidden'); toast('Folder reachable', `${p.label} · write access will be confirmed at sign-in with ${p.label}`, 'emerald', 'plug-zap'); });

  // Add "Media storage" to the user menu.
  function addMenu() {
    const prof = document.querySelector('[data-pg="pf-open"]'); if (!prof || document.querySelector('[data-pg="md-open"]')) return;
    prof.insertAdjacentHTML('afterend', `<button class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700" data-pg="md-open"><i data-lucide="folder-cog" class="h-4 w-4 text-slate-400"></i>Media storage</button>`);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addMenu); else addMenu();

  /* ======================= Patient health card ======================= */
  const branchName = i => (T().branches[i] || T().branches[0]).split(' · ')[0];
  const logo = () => { try { return window.PGAdmin.A().account.org.logo || ''; } catch (e) { return ''; } };
  const cardData = p => window.PatientCard.dataFrom(p, { hospital: T().name, hospitalPhone: D().settings.profile.phone, branch: branchName(p.branch || 0), kin: p.kin });
  const cardActions = p => `<div class="mt-3 flex flex-wrap justify-center gap-2">${btn('ghost', 'Flip', 'rotate-3d', `data-pg="pc-flip"`, 'h-8 px-3')}${btn('ghost', 'Copy link', 'link', `data-pg="pc-copy" data-id="${p.mrn}"`, 'h-8 px-3')}${btn('ghost', 'Open', 'external-link', `data-pg="pc-open" data-id="${p.mrn}"`, 'h-8 px-3')}${btn('ghost', 'Print', 'printer', 'data-pg="pc-print"', 'h-8 px-3')}</div>`;
  const cardBlock = (p, w) => `<div class="flex flex-col items-center"><div class="pc-print-area flex w-full justify-center">${window.PatientCard.html(cardData(p), { width: w || 'min(100%,360px)' })}</div>${cardActions(p)}</div>`;
  const pt = mrn => D().patients.find(x => x.mrn === mrn);
  on('pc-flip', el => { const c = (el.closest('.modal-panel, main') || document).querySelector('[data-pcard]'); if (c) c.classList.toggle('flip'); });
  on('pc-copy', el => K.copy(window.PatientCard.url(cardData(pt(el.dataset.id))), 'Card link · anyone with it sees this card'));
  on('pc-open', el => window.open(window.PatientCard.url(cardData(pt(el.dataset.id))), '_blank', 'noopener'));
  on('pc-print', el => { const a = (el.closest('.modal-panel, main') || document).querySelector('.pc-print-area'); if (!a) return; a.classList.add('print-area'); window.print(); setTimeout(() => a.classList.remove('print-area'), 500); });

  function renderMyCard(c) {
    const p = D().pt(ROLES.patient.person);
    c.innerHTML = `<div class="fade-in grid gap-6 lg:grid-cols-5">
      <div class="${card} grid place-items-center overflow-hidden p-6 sm:p-10 lg:col-span-3" style="background:radial-gradient(90% 70% at 50% 0%,rgba(13,148,136,.10),transparent 70%)">${cardBlock(p, 'min(100%,440px)')}</div>
      <div class="space-y-4 lg:col-span-2">
        <div class="${card} p-5"><h3 class="font-semibold">Your card, on any phone</h3><p class="mt-1 text-sm text-slate-500">Tap the card to flip it. The QR on the back opens just this card on any phone — no app, no sign-in.</p>
          <ul class="mt-4 space-y-3 text-sm">${[['scan-line', 'Show it at reception', 'They scan the QR to pull up your record.'], ['heart-pulse', 'In an emergency', 'Blood group and allergies are on the back.'], ['share-2', 'Share with family', 'Send the link so they have your details.']].map(([i, t, s]) => `<li class="flex gap-3"><span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl ${K.tone('teal')}">${ico(i)}</span><span><b>${t}</b><span class="block text-xs text-slate-500">${s}</span></span></li>`).join('')}</ul></div>
        ${note('sky', 'lock', 'The card shows only basic details (name, MRN, age, blood group, allergies). Reports, prescriptions and bills stay private in this portal.')}</div></div>`;
  }

  K.register({ 'my:card': { title: 'My Health Card', sub: 'Your hospital card — tap it to flip.', render: renderMyCard } });
  window.PGMedia = { get, isCloud, label, folderFor, open };
  window.PGExtras = { cardBlock, cardData };
})();
