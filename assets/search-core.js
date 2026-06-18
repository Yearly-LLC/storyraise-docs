// Shared search engine + render helpers, built once from SEARCH_INDEX.
// Consumed by the header dropdown (search.js) and the /search page
// (search-page.js). Requires /search-index.js and /assets/minisearch.min.js
// to have loaded first. Exposes a single global: window.SRSearch.
(function () {
  if (typeof SEARCH_INDEX === 'undefined' || typeof MiniSearch === 'undefined') return;

  // Normalize every entry; older/extra entries may lack body/section.
  var docs = SEARCH_INDEX.map(function (d, i) {
    return {
      id: i,
      title: d.title || '',
      description: d.description || '',
      section: d.section || '',
      url: d.url,
      keywords: (d.keywords || []).join(' '),
      body: d.body || ''
    };
  });

  var mini = new MiniSearch({
    fields: ['title', 'keywords', 'body'],
    storeFields: ['title', 'description', 'section', 'url', 'body'],
    searchOptions: {
      boost: { title: 4, keywords: 2, body: 1 },
      prefix: true,
      fuzzy: 0.2,
      combineWith: 'AND'
    }
  });
  mini.addAll(docs);

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Lowercased query tokens, regex-escaped so they're safe inside RegExp.
  function queryTerms(q) {
    return q.toLowerCase().split(/\s+/)
      .filter(function (t) { return t.length; })
      .map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
  }

  // Escape first, THEN wrap matched terms in <mark>. `terms` come from
  // queryTerms (already regex-escaped). Never inject unescaped user text.
  function highlight(text, terms) {
    var safe = escapeHtml(text);
    if (!terms || !terms.length) return safe;
    var re = new RegExp('(' + terms.join('|') + ')', 'gi');
    return safe.replace(re, '<mark>$1</mark>');
  }

  // A ~140-char window of body around the first matching term, highlighted.
  // If nothing matched in the body (title/keyword-only hit), show the head.
  function snippet(body, terms) {
    if (!body) return '';
    var WINDOW = 140;
    var lower = body.toLowerCase();
    var pos = -1;
    (terms || []).forEach(function (t) {
      var raw = t.replace(/\\(.)/g, '$1'); // undo regex-escaping for indexOf
      var idx = lower.indexOf(raw);
      if (idx !== -1 && (pos === -1 || idx < pos)) pos = idx;
    });
    var start = pos === -1 ? 0 : Math.max(0, pos - 40);
    var text = body.slice(start, start + WINDOW);
    var prefix = start > 0 ? '… ' : '';
    var suffix = start + WINDOW < body.length ? ' …' : '';
    return prefix + highlight(text, terms) + suffix;
  }

  window.SRSearch = {
    search: function (query) { return mini.search(query); },
    escapeHtml: escapeHtml,
    queryTerms: queryTerms,
    highlight: highlight,
    snippet: snippet
  };
})();
