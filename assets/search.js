// Live autocomplete search over SEARCH_INDEX (loaded from /search-index.js).
// Used by the home-page hero search and the header search on doc pages.
// Expects: #searchWrap > #searchInput + #searchDropdown.
(function () {
  var input = document.getElementById('searchInput');
  var dropdown = document.getElementById('searchDropdown');
  var wrap = document.getElementById('searchWrap');
  if (!input || !dropdown || typeof SEARCH_INDEX === 'undefined') return;

  var activeIdx = -1;

  function highlight(text, query) {
    if (!query) return text;
    var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp('(' + escaped + ')', 'gi'), '<mark>$1</mark>');
  }

  function score(item, q) {
    var ql = q.toLowerCase();
    var titleL = item.title.toLowerCase();
    var descL = item.description.toLowerCase();
    var kwMatch = item.keywords.some(function (k) { return k.startsWith(ql); });
    if (titleL.startsWith(ql)) return 3;
    if (titleL.includes(ql)) return 2;
    if (descL.includes(ql) || kwMatch) return 1;
    return 0;
  }

  function renderDropdown(query) {
    var q = query.trim();
    dropdown.innerHTML = '';
    activeIdx = -1;

    if (!q) {
      dropdown.classList.remove('visible');
      input.setAttribute('aria-expanded', 'false');
      return;
    }

    var results = SEARCH_INDEX
      .map(function (item) { return { item: item, s: score(item, q) }; })
      .filter(function (r) { return r.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .map(function (r) { return r.item; });

    if (results.length === 0) {
      var none = document.createElement('div');
      none.className = 'search-no-results';
      none.innerHTML = 'No results for <strong></strong>';
      none.querySelector('strong').textContent = q;
      dropdown.appendChild(none);
    } else {
      results.forEach(function (item, i) {
        var a = document.createElement('a');
        a.className = 'search-result';
        a.href = item.url;
        a.setAttribute('role', 'option');
        a.setAttribute('id', 'sr-' + i);
        a.innerHTML =
          '<div class="search-result-title">' + highlight(item.title, q) + '</div>' +
          '<div class="search-result-desc">' + item.description + '</div>';
        dropdown.appendChild(a);
      });
    }

    dropdown.classList.add('visible');
    input.setAttribute('aria-expanded', 'true');
  }

  input.addEventListener('input', function (e) { renderDropdown(e.target.value); });

  input.addEventListener('keydown', function (e) {
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
