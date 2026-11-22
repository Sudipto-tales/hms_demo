/* HMS demo — Patient health card (two-sided, flips on tap).
 * Standalone: used by dashboard.html (profile + portal) and card.html (what a phone opens
 * after scanning the QR). The card's data travels in the URL hash (#…), so it is never sent
 * to the web server and the card page works on static hosting.
 * Needs qrcode-generator (window.qrcode) for the QR on the back.
 */
(() => {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = n => String(n || '?').replace(/^Dr\.?\s+/, '').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
  // Pretty path on a web server (/card), real file name when opened from disk.
  const route = n => (window.ROUTE ? window.ROUTE(n) : n + '.html');

  const THEMES = [['#0f766e', '#0891b2', '#164e63'], ['#7c3aed', '#db2777', '#4c1d95'], ['#1d4ed8', '#0ea5e9', '#1e3a8a'], ['#b45309', '#e11d48', '#7c2d12']];
  const themeOf = d => THEMES[[...String(d.m || d.n)].reduce((a, c) => a + c.charCodeAt(0), 0) % THEMES.length];

  const CSS = `
  .pc{--w:min(100%,380px);width:var(--w);aspect-ratio:1.586;perspective:1400px;cursor:pointer;-webkit-tap-highlight-color:transparent;font-family:Inter,ui-sans-serif,system-ui,sans-serif;user-select:none}
  .pc-in{position:relative;width:100%;height:100%;transition:transform .9s cubic-bezier(.2,.8,.2,1);transform-style:preserve-3d}
  .pc.flip .pc-in{transform:rotateY(180deg)}
  .pc:not(.flip):hover .pc-in{transform:rotateY(-8deg) rotateX(4deg)}
  .pc-f,.pc-b{position:absolute;inset:0;border-radius:18px;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden;color:#fff;box-shadow:0 18px 40px -12px rgba(15,23,42,.45),inset 0 0 0 1px rgba(255,255,255,.14)}
  .pc-b{transform:rotateY(180deg);background:#f8fafc;color:#0f172a}
  .pc-f{background:linear-gradient(135deg,var(--a),var(--b) 55%,var(--c))}
  .pc-f:before{content:"";position:absolute;inset:0;background:radial-gradient(120% 80% at 100% 0%,rgba(255,255,255,.28),transparent 55%),radial-gradient(80% 60% at 0% 100%,rgba(0,0,0,.25),transparent 60%)}
  .pc-f:after{content:"";position:absolute;inset:-50%;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.22) 50%,transparent 60%);transform:translateX(-60%);animation:pcShine 5s ease-in-out infinite}
  @keyframes pcShine{0%,60%{transform:translateX(-60%)}100%{transform:translateX(60%)}}
  .pc-mono{position:absolute;right:-6%;bottom:-22%;font:900 clamp(110px,46cqw,190px)/1 Georgia,'Times New Roman',serif;letter-spacing:-.06em;color:transparent;-webkit-text-stroke:2px rgba(255,255,255,.32);pointer-events:none}
  .pc-grid{position:absolute;inset:0;opacity:.12;background-image:radial-gradient(rgba(255,255,255,.9) 1px,transparent 1px);background-size:14px 14px;mask-image:linear-gradient(90deg,#000,transparent 70%)}
  .pc-top{position:absolute;left:6%;right:6%;top:8%;display:flex;align-items:center;gap:8px;font-size:clamp(9px,2.6cqw,12px)}
  .pc-logo{width:2.4em;height:2.4em;border-radius:9px;background:rgba(255,255,255,.22);display:grid;place-items:center;font-weight:800;overflow:hidden;flex-shrink:0}
  .pc-logo img{width:100%;height:100%;object-fit:cover}
  .pc-chip{position:absolute;left:6%;top:36%;width:13%;aspect-ratio:1.3;border-radius:6px;background:linear-gradient(135deg,#fde68a,#f59e0b 60%,#fcd34d);box-shadow:inset 0 0 0 1px rgba(120,53,15,.35)}
  .pc-chip:before{content:"";position:absolute;inset:22% 0;border-top:1px solid rgba(120,53,15,.4);border-bottom:1px solid rgba(120,53,15,.4)}
  .pc-chip:after{content:"";position:absolute;inset:0 38%;border-left:1px solid rgba(120,53,15,.4);border-right:1px solid rgba(120,53,15,.4)}
  .pc-nfc{position:absolute;left:22%;top:37.5%;width:6%;opacity:.8}
  .pc-name{position:absolute;left:6%;right:30%;bottom:20%;font-size:clamp(16px,6cqw,24px);font-weight:800;letter-spacing:-.01em;line-height:1.1;text-shadow:0 1px 8px rgba(0,0,0,.2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .pc-id{position:absolute;left:6%;bottom:9%;font:600 clamp(10px,3.3cqw,13.5px) ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.18em;opacity:.9}
  .pc-blood{position:absolute;right:6%;top:8%;background:rgba(255,255,255,.95);color:#be123c;border-radius:999px;padding:.25em .7em;font-weight:800;font-size:clamp(10px,3cqw,13px);display:flex;align-items:center;gap:.3em}
  .pc-hint{position:absolute;right:6%;bottom:8%;font-size:clamp(8px,2.4cqw,10.5px);opacity:.8;display:flex;align-items:center;gap:4px}
  .pc-wrap{container-type:inline-size}
  .pc-stripe{height:17%;margin-top:6%;background:linear-gradient(90deg,#0f172a,#334155)}
  .pc-body{display:flex;gap:4.5%;padding:4.5% 5.5% 0}
  .pc-qr{width:31%;aspect-ratio:1;flex-shrink:0;border-radius:10px;background:#fff;padding:3%;box-shadow:0 0 0 1px #e2e8f0}
  .pc-qr svg{width:100%;height:100%;display:block}
  .pc-dl{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:5% 6%;align-content:start;font-size:clamp(8.5px,2.6cqw,11px);min-width:0}
  .pc-dl dt{color:#64748b;font-size:.85em;text-transform:uppercase;letter-spacing:.06em}
  .pc-dl dd{margin:0;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pc-dl .al{color:#be123c}
  .pc-foot{position:absolute;left:5.5%;right:5.5%;bottom:5%;display:flex;justify-content:space-between;align-items:center;font-size:clamp(7.5px,2.2cqw,9.5px);color:#64748b}
  .pc-sig{font:italic 600 clamp(10px,3cqw,13px) 'Segoe Script','Bradley Hand',cursive;color:#334155}
  @media (prefers-reduced-motion:reduce){.pc-in{transition:none}.pc-f:after{animation:none}}`;
  function injectCss() { if (document.getElementById('pcCss')) return; const s = document.createElement('style'); s.id = 'pcCss'; s.textContent = CSS; document.head.appendChild(s); }

  // Minimal, non-sensitive data that is safe to put in a shareable link.
  function dataFrom(p, o = {}) {
    return { n: p.name, m: p.mrn, a: p.age, g: p.gender, b: p.blood, al: p.allergies || '', ph: p.phone ? '•••• ' + String(p.phone).slice(-4) : '', r: p.registered || '',
      e: p.kin || o.kin || '', h: o.hospital || '', hp: o.hospitalPhone || '', br: o.branch || '', lg: o.logo && o.logo.length < 900 ? o.logo : '' };
  }
  function url(d) {
    const here = location.href.split('#')[0].split('?')[0], base = here.slice(0, here.lastIndexOf('/') + 1);
    return base + route('card') + '#' + b64(JSON.stringify(d));
  }
  const decode = hash => { try { return JSON.parse(unb64(String(hash).replace(/^#/, ''))); } catch (e) { return null; } };
  function qr(text) { if (!window.qrcode) return ''; const q = window.qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); }
  const fmt = d => { try { return new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }); } catch (e) { return d; } };

  function html(d, o = {}) {
    injectCss();
    const [a, b, c] = themeOf(d), link = o.link || url(d);
    const nfc = '<svg class="pc-nfc" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M8.5 7a7 7 0 0 1 0 10"/><path d="M12 4.5a11 11 0 0 1 0 15"/><path d="M5 9.5a3.5 3.5 0 0 1 0 5"/></svg>';
    return `<div class="pc-wrap" style="width:${o.width || 'min(100%,380px)'}"><div class="pc ${o.flipped ? 'flip' : ''}" style="--a:${a};--b:${b};--c:${c};--w:100%" role="button" tabindex="0" aria-label="Health card of ${esc(d.n)} — tap to flip" data-pcard>
      <div class="pc-in">
        <div class="pc-f"><div class="pc-grid"></div><div class="pc-mono" aria-hidden="true">${esc(initials(d.n))}</div>
          <div class="pc-top"><span class="pc-logo">${d.lg ? `<img src="${esc(d.lg)}" alt="">` : esc(initials(d.h || 'H'))}</span><span><b style="display:block;font-size:1.1em">${esc(d.h || 'Hospital')}</b><span style="opacity:.8;letter-spacing:.18em;text-transform:uppercase;font-size:.78em">Health card</span></span></div>
          ${d.b && d.b !== '—' ? `<span class="pc-blood"><svg width="10" height="12" viewBox="0 0 10 12"><path d="M5 0C5 0 0 5.6 0 8a5 5 0 0 0 10 0C10 5.6 5 0 5 0Z" fill="#e11d48"/></svg>${esc(d.b)}</span>` : ''}
          <span class="pc-chip"></span>${nfc}
          <div class="pc-name">${esc(d.n)}</div><div class="pc-id">${esc(String(d.m).replace(/-/, ' · '))}</div>
          <span class="pc-hint"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>Tap to flip</span></div>
        <div class="pc-b"><div class="pc-stripe"></div>
          <div class="pc-body"><div class="pc-qr">${qr(link)}</div>
            <dl class="pc-dl"><div><dt>Patient</dt><dd>${esc(d.n)}</dd></div><div><dt>MRN</dt><dd>${esc(d.m)}</dd></div>
              <div><dt>Age / Sex</dt><dd>${esc(d.a)} / ${d.g === 'F' ? 'Female' : d.g === 'M' ? 'Male' : esc(d.g)}</dd></div><div><dt>Blood</dt><dd>${esc(d.b || '—')}</dd></div>
              <div><dt>Allergies</dt><dd class="${d.al ? 'al' : ''}">${esc(d.al || 'None known')}</dd></div><div><dt>Phone</dt><dd>${esc(d.ph || '—')}</dd></div>
              <div><dt>Member since</dt><dd>${esc(d.r ? fmt(d.r) : '—')}</dd></div><div><dt>Home branch</dt><dd>${esc(d.br || '—')}</dd></div></dl></div>
          <div class="pc-foot"><span>Scan to open this card · if found, call ${esc(d.hp || d.h)}</span><span class="pc-sig">${esc(d.h || '')}</span></div></div>
      </div></div></div>`;
  }
  // One listener for every card on the page.
  const flip = el => el.classList.toggle('flip');
  document.addEventListener('click', e => { const c = e.target.closest('[data-pcard]'); if (c) flip(c); });
  document.addEventListener('keydown', e => { const c = e.target.closest && e.target.closest('[data-pcard]'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); flip(c); } });

  window.PatientCard = { html, dataFrom, url, decode, initials };
})();
