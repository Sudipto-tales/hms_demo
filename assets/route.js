/* HMS demo — clean URLs. On a real host (GitHub Pages) pages are linked as /dashboard, /card …
 * and any ".html" in the address bar is removed. GitHub Pages serves dashboard.html for /dashboard.
 * Opened from disk or a bare localhost server, the real file names are kept so links still work. */
(function () {
  var local = location.protocol === 'file:' || /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname);
  window.ROUTE = function (name) { return local ? name + '.html' : (name === 'index' ? './' : name); };
  if (!local && /\.html$/.test(location.pathname)) {
    history.replaceState(null, '', location.pathname.replace(/index\.html$/, '').replace(/\.html$/, '') + location.search + location.hash);
  }
})();
