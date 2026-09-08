// Loads the search engine on demand.
//
// Search is by far the heaviest thing on the site — the index plus MiniSearch
// is ~60KB gzip, and search-core builds a full inverted index over every
// article the moment it parses. Every page used to pay that, including the
// large majority of readers who only ever read one article and never search.
//
// So nothing loads until a reader shows intent: focusing the field, typing, or
// pressing "/" or Cmd/Ctrl+K. The /search page and 404 boot immediately —
// arriving there is the intent.
//
// Expects data-controller (the results controller to load last) and data-eager
// ("true" to skip waiting for intent) on its own <script> tag.
(function () {
  var self = document.currentScript;
  var controller = self.getAttribute('data-controller');
  var eager = self.getAttribute('data-eager') === 'true';

  // Cache-busting versions stamped in by build.js. These URLs are fetched at
  // runtime rather than being written into the HTML, so they can't be stamped
  // the way /assets/site.css is — without a version a reader keeps whatever
  // the CDN handed them last, and a stale index links to pages that may have
  // moved or been deleted. The index and engine are versioned separately so a
  // content edit doesn't also re-download MiniSearch.
  var indexV = self.getAttribute('data-index-v');
  var engineV = self.getAttribute('data-engine-v');
  function v(src, version) {
    return version ? src + '?v=' + version : src;
  }

  // Loaded in order, and the order is load-bearing: search-core.js reads
  // SEARCH_INDEX and MiniSearch as it parses, and the controller reads
  // window.SRSearch as it parses.
  var CHAIN = [
    v('/search-index.js', indexV),
    v('/assets/minisearch.min.js', engineV),
    v('/assets/search-core.js', engineV),
    v(controller, engineV)
  ];

  var booting = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      el.src = src;
      el.onload = resolve;
      el.onerror = function () { reject(new Error('could not load ' + src)); };
      document.head.appendChild(el);
    });
  }

  function boot() {
    if (booting) return booting;
    booting = CHAIN.reduce(function (chain, src) {
      return chain.then(function () { return loadScript(src); });
    }, Promise.resolve()).then(function () {
      // search.js registers its own hotkeys once loaded.
      document.removeEventListener('keydown', onKey);
      // Anything typed while the engine was loading hasn't been searched yet.
      var input = document.getElementById('searchInput');
      if (input && input.value) {
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })['catch'](function (err) {
      console.error('Search is unavailable:', err);
    });
    return booting;
  }

  // Mirrors the shortcut in search.js so the keys work before it has loaded.
  // Focusing the field is what actually triggers boot(), via the listener below.
  function onKey(e) {
    var tag = (e.target.tagName || '');
    var inField = /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || e.target.isContentEditable;
    if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') ||
        (e.key === '/' && !inField)) {
      var input = document.getElementById('searchInput');
      if (!input) return;
      e.preventDefault();
      input.focus();
      input.select();
    }
  }

  if (eager) {
    boot();
    return;
  }

  var input = document.getElementById('searchInput');
  if (input) {
    input.addEventListener('focus', boot, { once: true });
    input.addEventListener('input', boot, { once: true });
  }
  document.addEventListener('keydown', onKey);
})();
