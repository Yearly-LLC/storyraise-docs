// Header autocomplete dropdown over the shared search engine (SRSearch).
// Used by the home-page hero search and the doc-page header search.
// Expects: #searchWrap > #searchInput + #searchDropdown, and that
// /assets/search-core.js (window.SRSearch) has loaded.
(function () {
  var input = document.getElementById('searchInput');
  var dropdown = document.getElementById('searchDropdown');
  var wrap = document.getElementById('searchWrap');

  // Global "/" and Cmd/Ctrl+K focus the search box from anywhere.
  if (input) {
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
  }

  if (!input || !dropdown || !window.SRSearch) return;

  var MIN_QUERY_LEN = 2;
  var MAX_RESULTS = 8;
  var activeIdx = -1;

  function searchUrl(q) { return '/search/?q=' + encodeURIComponent(q); }

  function renderDropdown(query) {
    var q = query.trim();
    dropdown.innerHTML = '';
    activeIdx = -1;

    if (q.length < MIN_QUERY_LEN) {
      dropdown.classList.remove('visible');
      input.setAttribute('aria-expanded', 'false');
      return;
    }

    var terms = SRSearch.queryTerms(q);
    var hits = SRSearch.search(q).slice(0, MAX_RESULTS);

    if (!hits.length) {
      var none = document.createElement('div');
      none.className = 'search-no-results';
      none.innerHTML = 'No results for <strong></strong>';
      none.querySelector('strong').textContent = q;
      dropdown.appendChild(none);
    } else {
      hits.forEach(function (hit, i) {
        var a = document.createElement('a');
        a.className = 'search-result';
        a.href = hit.url;
        a.setAttribute('role', 'option');
        a.setAttribute('id', 'sr-' + i);

        var section = hit.section
          ? '<span class="search-result-section">' + SRSearch.escapeHtml(hit.section) + '</span>'
          : '';
        var snip = SRSearch.snippet(hit.body, terms) || SRSearch.escapeHtml(hit.description);

        a.innerHTML =
          '<div class="search-result-title">' + SRSearch.highlight(hit.title, terms) + section + '</div>' +
          '<div class="search-result-desc">' + snip + '</div>';
        dropdown.appendChild(a);
      });
    }

    dropdown.classList.add('visible');
    input.setAttribute('aria-expanded', 'true');
  }

  input.addEventListener('input', function (e) { renderDropdown(e.target.value); });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && activeIdx < 0) {
      // No item highlighted → go to the full results page.
      var q = input.value.trim();
      if (q) { e.preventDefault(); window.location.href = searchUrl(q); }
      return;
    }
    var items = dropdown.querySelectorAll('.search-result');
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, items.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, -1);
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      items[activeIdx].click();
      return;
    } else if (e.key === 'Escape') {
      dropdown.classList.remove('visible');
      input.setAttribute('aria-expanded', 'false');
      return;
    }
    items.forEach(function (el, i) {
      el.classList.toggle('active', i === activeIdx);
      if (i === activeIdx) input.setAttribute('aria-activedescendant', el.id);
    });
  });

  document.addEventListener('click', function (e) {
    if (wrap && !wrap.contains(e.target)) {
      dropdown.classList.remove('visible');
      input.setAttribute('aria-expanded', 'false');
    }
  });
})();
