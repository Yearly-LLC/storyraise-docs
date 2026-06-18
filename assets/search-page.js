// Controller for the standalone /search/ page. Reads ?q= on load, renders a
// full results list into #searchResults, and keeps the URL in sync as the
// user types. Uses the shared engine (window.SRSearch). No dropdown here.
(function () {
  var input = document.getElementById('searchInput');
  var results = document.getElementById('searchResults');
  var summary = document.getElementById('searchSummary');
  if (!input || !results) return;

  var MIN_QUERY_LEN = 2;
  var MAX_RESULTS = 50;

  function render(query) {
    var q = query.trim();
    results.innerHTML = '';

    if (q.length < MIN_QUERY_LEN) {
      if (summary) summary.textContent = q ? 'Keep typing to search…' : '';
      return;
    }

    if (!window.SRSearch) {
      if (summary) summary.textContent = 'Search is unavailable right now.';
      return;
    }

    var terms = SRSearch.queryTerms(q);
    var hits = SRSearch.search(q).slice(0, MAX_RESULTS);

    if (summary) {
      summary.textContent = hits.length
        ? hits.length + (hits.length === 1 ? ' result for ' : ' results for ') + '“' + q + '”'
        : 'No results for “' + q + '”';
    }

    hits.forEach(function (hit) {
      var a = document.createElement('a');
      a.className = 'search-result';
      a.href = hit.url;

      var section = hit.section
        ? '<span class="search-result-section">' + SRSearch.escapeHtml(hit.section) + '</span>'
        : '';
      var snip = SRSearch.snippet(hit.body, terms) || SRSearch.escapeHtml(hit.description);

      a.innerHTML =
        '<div class="search-result-title">' + SRSearch.highlight(hit.title, terms) + section + '</div>' +
        '<div class="search-result-desc">' + snip + '</div>';
      results.appendChild(a);
    });
  }

  function syncUrl(q) {
    var url = q ? '?q=' + encodeURIComponent(q) : location.pathname;
    try { history.replaceState(null, '', url); } catch (e) {}
  }

  var debounce;
  input.addEventListener('input', function (e) {
    var q = e.target.value;
    clearTimeout(debounce);
    debounce = setTimeout(function () { render(q); syncUrl(q.trim()); }, 120);
  });

  // Cmd/Ctrl+K (and "/") focus the field.
  document.addEventListener('keydown', function (e) {
    var inField = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || '')) ||
      e.target.isContentEditable;
    if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') ||
        (e.key === '/' && !inField)) {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });

  // Initial query from the URL.
  var initial = '';
  try { initial = new URLSearchParams(location.search).get('q') || ''; } catch (e) {}
  if (initial) { input.value = initial; render(initial); }
  input.focus();
})();
