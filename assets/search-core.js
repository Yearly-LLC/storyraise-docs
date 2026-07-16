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

  // Question words and filler, shipped with the index. See QUERY_STOPWORDS in
  // build/build.js — that list is the only copy.
  var STOPWORDS = {};
  (typeof SEARCH_STOPWORDS === 'undefined' ? [] : SEARCH_STOPWORDS)
    .forEach(function (w) { STOPWORDS[w] = true; });

  // Drop the words readers pad questions with but articles never index on.
  //
  // Matching is AND — every term must appear — so questions typed the way
  // people actually type them found nothing: "reset my password" failed on
  // "my" alone. Stripping has to happen BEFORE the AND rather than only as a
  // fallback, because AND can also succeed for the wrong reason: "how do I
  // export a pdf" matched an article containing "do", "I" and "a", so a
  // fallback would never have fired and the reader got the wrong page.
  //
  // A query that is nothing but stopwords ("how to") is kept as typed —
  // searching for the empty string helps nobody.
  function usefulQuery(q) {
    var kept = q.toLowerCase().split(/[^a-z0-9]+/).filter(function (t) {
      return t.length && !STOPWORDS[t];
    });
    return kept.length ? kept.join(' ') : q;
  }

  // Lowercased query tokens, regex-escaped so they're safe inside RegExp.
  // Uses the stripped query so highlighting marks what actually matched
  // rather than every "my" and "the" in the snippet.
  function queryTerms(q) {
    return usefulQuery(q).split(/\s+/)
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

  // Strict AND first, so a precise query gets a precise answer. If that finds
  // nothing, retry as OR rather than showing an empty dropdown: a reader whose
  // words are all real but never co-occur in one article is better served by
  // the closest match than by nothing at all.
  function search(query) {
    var q = usefulQuery(query);
    var hits = mini.search(q);
    if (!hits.length) hits = mini.search(q, { combineWith: 'OR' });
    return hits;
  }

  window.SRSearch = {
    search: search,
    escapeHtml: escapeHtml,
    queryTerms: queryTerms,
    highlight: highlight,
    snippet: snippet
  };
})();
