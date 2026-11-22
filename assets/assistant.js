/* HMS demo — Floating robot assistant.
 * An animated SVG robot floats bottom-right; clicking it opens a chat box. In the demo the
 * replies are rule-based and role-aware (no data leaves the browser). Each answer can carry
 * action buttons that jump to the right page or open the right dialog.
 */
(() => {
  'use strict';
  const H = () => window.HMS;
  const K = () => window.PG;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const role = () => H().state.role;
  const can = p => H().hasPerm(p);
  const mod = m => H().modOn(m);
  const first = () => { const r = ROLES[role()]; return (r.person || '').replace(/^Dr\.?\s+/, 'Dr. ').split(' ').slice(0, role() === 'doctor' ? 2 : 1).join(' '); };

  const ROBOT = (size = 64) => `<svg class="bot-svg" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
    <defs><linearGradient id="botBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2dd4bf"/><stop offset="1" stop-color="#0f766e"/></linearGradient>
      <linearGradient id="botFace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f172a"/><stop offset="1" stop-color="#1e293b"/></linearGradient>
      <radialGradient id="botGlow"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#f59e0b"/></radialGradient></defs>
    <ellipse class="bot-shadow" cx="60" cy="112" rx="26" ry="4.5" fill="#0f172a" opacity=".18"/>
    <g class="bot-float">
      <line x1="60" y1="16" x2="60" y2="28" stroke="#0f766e" stroke-width="3" stroke-linecap="round"/>
      <circle class="bot-bulb" cx="60" cy="13" r="6" fill="url(#botGlow)"/>
      <g class="bot-arm-l"><rect x="13" y="62" width="12" height="26" rx="6" fill="#14b8a6"/></g>
      <g class="bot-arm-r"><rect x="95" y="62" width="12" height="26" rx="6" fill="#14b8a6"/></g>
      <rect x="27" y="62" width="66" height="38" rx="16" fill="url(#botBody)"/>
      <circle cx="60" cy="81" r="7" fill="#ccfbf1" opacity=".9"/><path d="M57 81h6M60 78v6" stroke="#0f766e" stroke-width="2.4" stroke-linecap="round"/>
      <rect x="22" y="26" width="76" height="44" rx="20" fill="url(#botBody)"/>
      <rect x="16" y="40" width="8" height="16" rx="4" fill="#0d9488"/><rect x="96" y="40" width="8" height="16" rx="4" fill="#0d9488"/>
      <rect x="31" y="34" width="58" height="29" rx="14" fill="url(#botFace)"/>
      <g class="bot-eyes"><rect x="42" y="42" width="10" height="12" rx="5" fill="#5eead4"/><rect x="68" y="42" width="10" height="12" rx="5" fill="#5eead4"/></g>
      <path class="bot-mouth" d="M53 57q7 4 14 0" stroke="#5eead4" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <circle cx="38" cy="57" r="2.5" fill="#fb7185" opacity=".55"/><circle cx="82" cy="57" r="2.5" fill="#fb7185" opacity=".55"/>
    </g></svg>`;

  const CSS = `
  #assistFab{position:fixed;right:16px;bottom:16px;z-index:56;width:76px;height:76px;border:0;background:none;padding:0;cursor:pointer;filter:drop-shadow(0 10px 18px rgba(15,118,110,.35))}
  @media(min-width:640px){#assistFab{right:24px;bottom:20px}}
  #assistFab:focus-visible{outline:3px solid #14b8a6;outline-offset:4px;border-radius:24px}
  #assistFab .bot-float{animation:botFloat 3.2s ease-in-out infinite;transform-origin:60px 60px}
  #assistFab .bot-shadow{animation:botShadow 3.2s ease-in-out infinite;transform-origin:60px 112px}
  .bot-bulb{animation:botBulb 1.6s ease-in-out infinite}
  .bot-eyes{animation:botBlink 4.5s infinite;transform-origin:60px 48px}
  .bot-arm-r{transform-origin:101px 64px;animation:botWave 6s ease-in-out infinite}
  .bot-arm-l{transform-origin:19px 64px}
  #assistFab:hover .bot-arm-l{animation:botWaveL .9s ease-in-out 2}
  #assistFab:hover .bot-mouth{d:path("M51 56q9 7 18 0")}
  #assistFab.open .bot-eyes{animation:none;transform:scaleY(.35)}
  @keyframes botFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
  @keyframes botShadow{0%,100%{transform:scaleX(1);opacity:.18}50%{transform:scaleX(.78);opacity:.1}}
  @keyframes botBulb{0%,100%{opacity:1;filter:drop-shadow(0 0 0 #fbbf24)}50%{opacity:.65;filter:drop-shadow(0 0 6px #fbbf24)}}
  @keyframes botBlink{0%,46%,50%,100%{transform:scaleY(1)}48%{transform:scaleY(.1)}}
  @keyframes botWave{0%,78%,100%{transform:rotate(0)}82%,90%{transform:rotate(-28deg)}86%,94%{transform:rotate(-10deg)}}
  @keyframes botWaveL{50%{transform:rotate(30deg)}}
  #assistTip{position:fixed;right:96px;bottom:40px;z-index:56;max-width:220px;border-radius:16px 16px 4px 16px;padding:10px 12px;font-size:13px;font-weight:500;box-shadow:0 12px 30px -10px rgba(15,23,42,.35);transition:opacity .3s,transform .3s}
  #assistTip.hide{opacity:0;transform:translateY(6px) scale(.96);pointer-events:none}
  #assistBox{position:fixed;z-index:57;right:16px;bottom:100px;width:min(390px,calc(100vw - 32px));height:min(580px,calc(100dvh - 130px));display:flex;flex-direction:column;border-radius:22px;overflow:hidden;
    transform-origin:calc(100% - 30px) calc(100% + 40px);transition:opacity .25s ease,transform .3s cubic-bezier(.2,.9,.3,1.2);box-shadow:0 30px 60px -20px rgba(15,23,42,.45)}
  @media(min-width:640px){#assistBox{right:24px;bottom:108px}}
  #assistBox.closed{opacity:0;transform:scale(.6) translateY(20px);pointer-events:none}
  .ab-msg{max-width:86%;animation:abIn .28s ease both}
  @keyframes abIn{from{opacity:0;transform:translateY(6px)}}
  .ab-dot{width:6px;height:6px;border-radius:99px;background:currentColor;opacity:.4;animation:abDot 1s infinite}
  .ab-dot:nth-child(2){animation-delay:.15s}.ab-dot:nth-child(3){animation-delay:.3s}
  @keyframes abDot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:.9;transform:translateY(-3px)}}
  @media (prefers-reduced-motion:reduce){#assistFab *,#assistBox,.ab-msg{animation:none!important;transition:none!important}}
  @media print{#assistFab,#assistBox,#assistTip,#payFab{display:none!important}}`;

  /* ---------------- intents ---------------- */
  const nav = id => () => { H().navigate(id); };
  const click = (pg, data = {}) => () => { const b = document.createElement('button'); b.type = 'button'; b.hidden = true; b.dataset.pg = pg; Object.entries(data).forEach(([k, v]) => { b.dataset[k] = v; }); document.body.appendChild(b); b.click(); b.remove(); };
  const ptMrn = () => window.PG.D().pt(ROLES.patient.person).mrn;
  const INTENTS = [
    { re: /^(hi|hello|hey|namaste|good (morning|evening|afternoon))\b/i, say: () => `Hello ${esc(first())}! 👋 What can I help you with?`, acts: () => suggestions().slice(0, 3) },
    { re: /(upload|photo|scan|camera|paper).*(rx|prescription)|(rx|prescription).*(upload|photo|scan|camera|paper)/i, ok: () => can('prescription:upload') && mod('prescriptions'),
      say: () => 'Lay the paper prescription flat and take a photo — or pick a scan/PDF. It’s saved to the patient’s record and sent to the pharmacy.', acts: () => [['Take photo', click('rxu-new', { cam: '1' }), 'camera'], ['Upload file', click('rxu-new'), 'upload']] },
    { re: /(health )?card|qr/i, say: () => role() === 'patient' ? 'Here’s your health card. Tap it to flip — the QR on the back opens it on any phone.' : 'Every patient has a health card on the Overview tab of their profile. Tap it to flip and show the QR.',
      acts: () => role() === 'patient' ? [['Open my card', nav('my:card'), 'id-card']] : can('patient:read') ? [['Find a patient', nav('patients:list'), 'users']] : [] },
    { re: /\b(pay|due|bill|invoice|receipt|payment)\b/i, say: () => { if (role() === 'patient') { const d = window.PG.D().invoices.filter(i => i.mrn === ptMrn() && window.PGInvoice.isOpen(i)); return d.length ? `You have <b>${d.length}</b> unpaid bill${d.length > 1 ? 's' : ''} — <b>${window.PG.inr(d.reduce((s, i) => s + window.PGInvoice.due(i), 0))}</b> in total.` : 'All your bills are paid. 🎉'; }
        return can('settings:manage') ? 'You can view and collect bills in Billing, and pick the invoice design under Payments › Invoice Template.' : 'Bills live in Billing & Payments.'; },
      acts: () => role() === 'patient' ? [['Pay now', click('dues-pay', { mrn: ptMrn() }), 'wallet'], ['All bills', nav('my:bills'), 'receipt']] : [can('invoice:create') && ['Open billing', nav('billing'), 'receipt'], can('settings:manage') && ['Invoice design', nav('payments:invoice'), 'palette']].filter(Boolean) },
    { re: /template|design|logo/i, ok: () => can('settings:manage'), say: () => 'Choose Classic (with logo), Minimal (no logo) or Modern (colour band). The pick applies to invoices, receipts and pharmacy slips.', acts: () => [['Invoice template', nav('payments:invoice'), 'palette']] },
    { re: /pharmac|medicine|dispens|chemist|medical shop/i, say: () => role() === 'pharmacy' ? 'Your queue has every prescription sent to this pharmacy. Dispense one to create its payment slip.' : can('settings:manage') ? 'Pharmacies has every pharmacy’s login, status and sales. Each pharmacy gets exactly one login.' : 'Prescriptions sent from the front desk or a doctor go straight to the pharmacy queue.',
      acts: () => role() === 'pharmacy' ? [['Open queue', nav('pharmacy:queue'), 'inbox'], ['Sales & slips', nav('pharmacy:sales'), 'receipt']] : can('settings:manage') ? [['Pharmacies', nav('pharmacies'), 'store'], ['Queue', nav('pharmacy:queue'), 'inbox']] : [] },
    { re: /drive|storage|download|save|folder|onedrive|dropbox/i, ok: () => role() !== 'patient', say: () => { const m = window.PGMedia; return `Your files currently go to <b>${esc(m.label())}</b>. You can switch to a Google Drive, OneDrive or Dropbox folder link.`; }, acts: () => [['Media storage', click('md-open'), 'folder-cog']] },
    { re: /book|appointment|slot|doctor/i, say: () => role() === 'patient' ? 'You can book or reschedule from My Appointments.' : can('appointment:create') ? 'I can open the booking form for you.' : 'Appointments are handled by the front desk.',
      acts: () => role() === 'patient' ? [['My appointments', nav('my:appointments'), 'calendar-check']] : can('appointment:create') ? [['Book appointment', () => document.querySelector('[data-action="new-appointment"]')?.click(), 'calendar-plus']] : [] },
    { re: /register|new patient/i, ok: () => can('patient:create'), say: () => 'Registration takes the name, mobile and consent — the MRN is issued on save.', acts: () => [['Register patient', nav('patients:new'), 'user-plus']] },
    { re: /dark|light|theme/i, say: () => 'Switching the theme for you.', acts: () => [], run: () => document.querySelector('[data-action="toggle-theme"], #themeBtn')?.click() },
    { re: /thank|thanks|great|awesome|ok\b/i, say: () => 'Happy to help! 😊' },
    { re: /help|what can you|menu|options/i, say: () => 'Here’s what I can help with:', acts: () => suggestions() },
  ];
  function suggestions() {
    const r = role();
    if (r === 'patient') return [['My health card', nav('my:card'), 'id-card'], ['Pay my bills', click('dues-pay', { mrn: ptMrn() }), 'wallet'], ['Prescriptions', nav('my:prescriptions'), 'file-text'], ['Book a visit', nav('my:appointments'), 'calendar-plus']];
    if (r === 'pharmacy') return [['Prescription queue', nav('pharmacy:queue'), 'inbox'], ['Sales & slips', nav('pharmacy:sales'), 'receipt'], ['Media storage', click('md-open'), 'folder-cog']];
    return [can('prescription:upload') && mod('prescriptions') && ['Upload prescription', click('rxu-new'), 'camera'], can('settings:manage') && mod('pharmacy') && ['Pharmacies', nav('pharmacies'), 'store'],
      can('settings:manage') && ['Invoice template', nav('payments:invoice'), 'palette'], can('patient:read') && ['Find a patient', nav('patients:list'), 'users'], ['Media storage', click('md-open'), 'folder-cog']].filter(Boolean).slice(0, 4);
  }
  const chipsFor = text => ({ patient: ['Show my card', 'Do I have bills due?', 'Book appointment'], pharmacy: ['Open my queue', 'Today’s sales'], admin: ['How are the pharmacies doing?', 'Change invoice design', 'Upload a prescription'] }[role()] || ['Upload a prescription', 'Where do my downloads go?', 'Book appointment']);

  /* ---------------- UI ---------------- */
  let box, list, actions = [];
  const ico = (n, c = 'h-4 w-4') => `<i data-lucide="${n}" class="${c}"></i>`;
  function mount() {
    if (document.getElementById('assistFab')) return;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    document.body.insertAdjacentHTML('beforeend', `
      <button id="assistFab" type="button" aria-label="Open the HMS assistant" aria-expanded="false" aria-controls="assistBox">${ROBOT(76)}</button>
      <div id="assistTip" class="hide bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">Hi! I’m Medi 👋 Need a hand?</div>
      <section id="assistBox" class="closed border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" role="dialog" aria-label="HMS assistant" aria-modal="false">
        <header class="relative flex items-center gap-3 overflow-hidden bg-gradient-to-br from-teal-600 to-cyan-600 px-4 py-3 text-white">
          <span class="absolute -right-6 -top-10 h-28 w-28 rounded-full bg-white/10"></span>
          <span class="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">${ROBOT(40)}</span>
          <div class="min-w-0 flex-1"><p class="font-semibold">Medi · HMS assistant</p><p class="flex items-center gap-1.5 text-xs text-teal-50"><span class="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_0_3px_rgba(110,231,183,.3)]"></span>Online · replies instantly</p></div>
          <button type="button" class="relative rounded-lg p-1.5 hover:bg-white/15" data-ab="reset" aria-label="New chat" title="New chat">${ico('rotate-ccw')}</button>
          <button type="button" class="relative rounded-lg p-1.5 hover:bg-white/15" data-ab="close" aria-label="Close assistant">${ico('x', 'h-5 w-5')}</button></header>
        <div id="abList" class="thin-scroll flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4 dark:bg-slate-950/40" aria-live="polite"></div>
        <div id="abChips" class="flex gap-2 overflow-x-auto border-t border-slate-100 px-3 py-2 thin-scroll dark:border-slate-800"></div>
        <form id="abForm" class="flex items-center gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
          <input id="abInput" class="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-800" placeholder="Ask me anything…" autocomplete="off" aria-label="Message"/>
          <button class="grid h-11 w-11 place-items-center rounded-xl bg-teal-600 text-white transition hover:bg-teal-700 active:scale-95" aria-label="Send">${ico('send-horizontal')}</button></form>
        <p class="bg-white pb-2 text-center text-[10px] text-slate-400 dark:bg-slate-900">Demo assistant · answers come from this app, nothing is sent out</p></section>`);
    box = document.getElementById('assistBox'); list = document.getElementById('abList');
    document.getElementById('assistFab').addEventListener('click', toggle);
    box.addEventListener('click', e => { const a = e.target.closest('[data-ab]'); if (!a) return; const k = a.dataset.ab;
      if (k === 'close') toggle(false); else if (k === 'reset') { list.innerHTML = ''; greet(); } else if (k === 'act') { const f = actions[+a.dataset.i]; if (f) { f(); if (innerWidth < 640) toggle(false); } } else if (k === 'chip') ask(a.textContent); });
    document.getElementById('abForm').addEventListener('submit', e => { e.preventDefault(); const i = document.getElementById('abInput'); const v = i.value.trim(); if (v) { ask(v); i.value = ''; } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !box.classList.contains('closed') && !document.querySelector('.modal.open')) toggle(false); });
    // A friendly nudge, once per browser session.
    try { if (!sessionStorage.getItem('hms-bot-tip')) { setTimeout(() => { const t = document.getElementById('assistTip'); if (box.classList.contains('closed')) { t.classList.remove('hide'); setTimeout(() => t.classList.add('hide'), 5000); } sessionStorage.setItem('hms-bot-tip', '1'); }, 2500); } } catch (e) {}
    H().icons();
  }
  function toggle(force) {
    const open = typeof force === 'boolean' ? force : box.classList.contains('closed');
    box.classList.toggle('closed', !open); const fab = document.getElementById('assistFab'); fab.classList.toggle('open', open); fab.setAttribute('aria-expanded', open);
    document.getElementById('assistTip').classList.add('hide');
    if (open) { if (!list.children.length) greet(); setTimeout(() => document.getElementById('abInput').focus(), 250); }
  }
  function bubble(html, me) {
    list.insertAdjacentHTML('beforeend', me ? `<div class="ab-msg ml-auto rounded-2xl rounded-br-md bg-teal-600 px-3.5 py-2.5 text-sm text-white">${html}</div>`
      : `<div class="flex items-end gap-2"><span class="grid h-7 w-7 shrink-0 place-items-center">${ROBOT(28)}</span><div class="ab-msg rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">${html}</div></div>`);
    list.scrollTop = list.scrollHeight;
  }
  function reply(html, acts = []) {
    const id = 'abT' + Date.now();
    list.insertAdjacentHTML('beforeend', `<div id="${id}" class="flex items-end gap-2"><span class="grid h-7 w-7 shrink-0 place-items-center">${ROBOT(28)}</span><div class="flex gap-1 rounded-2xl rounded-bl-md bg-white px-3.5 py-3 text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"><span class="ab-dot"></span><span class="ab-dot"></span><span class="ab-dot"></span></div></div>`);
    list.scrollTop = list.scrollHeight;
    setTimeout(() => { document.getElementById(id)?.remove();
      const btns = acts.map(([l, f, i]) => { actions.push(f); return `<button type="button" data-ab="act" data-i="${actions.length - 1}" class="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300">${ico(i || 'arrow-right', 'h-3.5 w-3.5')}${esc(l)}</button>`; }).join('');
      bubble(html + (btns ? `<div class="mt-2.5 flex flex-wrap gap-1.5">${btns}</div>` : ''));
      H().icons(); }, 450 + Math.random() * 400);
  }
  function chips() { document.getElementById('abChips').innerHTML = chipsFor().map(c => `<button type="button" data-ab="chip" class="shrink-0 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-teal-400 hover:text-teal-700 dark:border-slate-700 dark:text-slate-300">${esc(c)}</button>`).join(''); }
  function greet() { actions = []; chips(); reply(`Hi ${esc(first())}! I’m <b>Medi</b>, your HMS assistant. Ask me about prescriptions, bills, pharmacies or your health card.`, suggestions()); }
  function ask(text) {
    bubble(esc(text), true);
    const it = INTENTS.find(x => x.re.test(text) && (!x.ok || x.ok()));
    if (!it) return reply('I’m not sure about that one yet — I’m a demo assistant. Here’s what I can do:', suggestions());
    if (it.run) it.run();
    reply(it.say(), it.acts ? it.acts() : []);
  }
  // Keep the greeting and chips in step with the "View as" role switch.
  let lastRole = null;
  setInterval(() => { if (!H() || !box) return; if (role() !== lastRole) { lastRole = role(); chips(); if (!box.classList.contains('closed')) { list.innerHTML = ''; greet(); } else list.innerHTML = ''; } }, 800);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(mount, 0)); else setTimeout(mount, 0);
})();
