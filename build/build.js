#!/usr/bin/env node
/**
 * Builds the knowledge-base article pages from markdown sources.
 *
 *   content/<section>/[integrations/]<slug>.md  →  docs/<section>/[integrations/]<slug>/index.html
 *
 * Also generates one landing page per section (docs/<section>/index.html)
 * and /search-index.js for the home-page search.
 *
 * Run from the repo root:  npm run build
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { marked } = require('marked');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const OUT_DIR = path.join(ROOT, 'docs');

// Cache-bust /assets/site.css with a short content hash so a deploy's CSS
// changes take effect immediately. The <link> is otherwise unversioned, and
// GitHub Pages / the CDN cache it aggressively — which can serve a stale
// stylesheet (e.g. missing the media rules that keep article images and
// videos inside the reading column). The hash changes only when site.css
// changes, so unrelated builds stay stable. stampAssets is idempotent: it
// rewrites any existing ?v= too, so re-running the build never stacks them.
const CSS_VERSION = crypto
  .createHash('sha1')
  .update(fs.readFileSync(path.join(ROOT, 'assets', 'site.css')))
  .digest('hex')
  .slice(0, 8);
function stampAssets(html) {
  return html.replace(/\/assets\/site\.css(\?v=[a-f0-9]+)?/g, `/assets/site.css?v=${CSS_VERSION}`);
}

// Stamping happens in writePage, not here: the <head> is assembled after the
// template is read, so anything stamped at read time would miss it.
const TEMPLATE = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

const SECTIONS = [
  {
    dir: 'getting-started',
    label: 'Getting Started',
    blurb: 'New to Storyraise? Start here.',
    icon: '🚀',
    order: [
      'what-is-storyraise', 'creating-your-first-report', 'understanding-templates',
      'publishing-and-sharing', 'pdf-exports', 'user-roles-and-permissions', 'common-terminology',
    ],
  },
  {
    dir: 'crm-and-data',
    label: 'CRM & Data Connections',
    blurb: 'Bring your constituent data into Storyraise.',
    icon: '🔌',
    order: [
      'connecting-a-crm', 'importing-constituent-data', 'mapping-fields', 'data-refreshes',
      'troubleshooting-sync-issues', 'supported-integrations',
      'connections-overview', 'syncing-data-to-collections', 'managing-connections',
      'blackbaud-raisers-edge-nxt', 'bloomerang', 'salesforce', 'virtuous', 'civicrm', 'slate',
      'ellucian', 'little-green-light', 'donorperfect', 'neon-crm', 'funraise',
      'givebutter', 'donorbox', 'fundraise-up', 'mailchimp', 'hubspot',
    ],
  },
  {
    dir: 'building-reports',
    label: 'Building Reports',
    blurb: 'Everything about building and styling reports.',
    icon: '📊',
    order: [
      'adding-sections', 'editing-content', 'using-templates', 'brand-kit', 'fonts-and-colors',
      'images-and-videos', 'creating-visualizations', 'build-a-line-chart',
      'image-sizes-and-dimensions', 'ai-content-generation',
      'reordering-sections', 'navigation-options', 'mobile-optimization', 'accessibility',
    ],
  },
  {
    dir: 'distribution-and-engagement',
    label: 'Distribution & Engagement',
    blurb: 'Share your published reports and see who engages.',
    icon: '📤',
    order: [
      'sharing-reports', 'embedding-in-wordpress', 'personalized-links', 'email-distribution',
      'sms-distribution', 'tracking-engagement', 'understanding-report-metrics', 'video-analytics',
    ],
  },
  {
    dir: 'account-and-settings',
    label: 'Account & Settings',
    blurb: 'Set up your account, team, billing, and sending domain.',
    icon: '⚙️',
    order: [
      'setting-up-your-account', 'organization-settings', 'managing-your-team',
      'profile-and-security', 'managing-your-subscription', 'email-subdomain-setup',
      'custom-sending-domain',
    ],
  },
  {
    dir: 'storyraise-video',
    label: 'Storyraise Video',
    blurb: 'Personalized video messages, recorded once and sent to everyone.',
    icon: '🎬',
    order: [
      'what-is-storyraise-video', 'creating-a-video-message', 'recording-your-video',
      'scenes-and-personalization', 'sending-and-recipients',
    ],
  },
  {
    dir: 'storyraise-collect',
    label: 'Storyraise Collect',
    blurb: 'Gather stories and data from your community with forms.',
    icon: '📋',
    order: [
      'what-is-storyraise-collect', 'creating-a-collection', 'form-field-types',
      'multi-step-forms', 'sharing-your-form', 'managing-responses',
    ],
  },
  {
    dir: 'resources',
    label: 'Resources',
    blurb: 'Guides and answers that span the whole platform.',
    icon: '💡',
    order: ['best-practices', 'accessibility', 'network-requirements', 'faq'],
  },
];

/* ── helpers ────────────────────────────────────────────────────────── */

function parseFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return { meta, body: src.slice(m[0].length) };
}

function stripTeamReview(md) {
  return md.replace(/<!--\s*TEAM REVIEW[\s\S]*?-->/g, '');
}

// Resolve a relative .md href to a site URL, given the md file's directory
// relative to content/ (e.g. "getting-started" or "crm-and-data/integrations").
function mdLinkToUrl(href, fromDir) {
  const clean = href.replace(/\\/g, '/');
  const resolved = path.posix.normalize(path.posix.join(fromDir, clean));
  return '/docs/' + resolved.replace(/\.md$/, '') + '/';
}

function rewriteMdLinks(md, fromDir) {
  return md.replace(/\]\(([^)\s]+\.md)\)/g, (_, href) => `](${mdLinkToUrl(href, fromDir)})`);
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function firstParagraphText(html) {
  const m = html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
  if (!m) return '';
  return m[1]
    .replace(/<[^>]+>/g, '')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(s, n) {
  return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
}

// Full article text (not just the first paragraph) for the search index.
// <pre> code blocks are dropped — they bloat the index and pollute fuzzy
// matches with syntax; inline <code> text is kept (product/field names).
function plainText(html) {
  return html
    .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')
    .replace(/<\/?code[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

const KEYWORD_STOPWORDS = new Set([
  'the', 'and', 'your', 'with', 'for', 'to', 'of', 'in', 'on', 'at', 'an',
  'is', 'it', 'by', 'or', 'we', 'up', 'as', 'a',
]);

// Words to drop from a reader's QUERY before matching. Shipped to the browser
// in search-index.js so this list stays the only copy.
//
// Matching is AND — every term must appear in the article — so a question
// typed the way people actually type questions returns nothing: "reset my
// password" fails on "my" alone. This is deliberately a different list from
// KEYWORD_STOPWORDS above (which trims generated keywords): it has to cover
// interrogatives like how/what/why, which a keyword list has no reason to.
//
// Nothing here can be a product term — "collect", "video", "report" and
// friends must survive.
const QUERY_STOPWORDS = [
  'a', 'about', 'am', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'been',
  'by', 'can', 'could', 'did', 'do', 'does', 'for', 'from', 'had', 'has',
  'have', 'how', 'i', 'in', 'into', 'is', 'it', 'its', 'me', 'my', 'of',
  'on', 'or', 'our', 'please', 'should', 'that', 'the', 'their', 'them',
  'there', 'these', 'they', 'this', 'to', 'was', 'we', 'were', 'what',
  'when', 'where', 'which', 'who', 'why', 'will', 'with', 'would', 'you',
  'your',
];

// Keywords come from the title, section, and slug, plus an optional
// comma-separated `keywords:` frontmatter field for terms readers search
// that don't appear in the title (e.g. "mfa", "qr", "dns").
function keywordsFor(title, sectionLabel, slug, extra) {
  const words = (title + ' ' + sectionLabel + ' ' + slug.replace(/-/g, ' '))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !KEYWORD_STOPWORDS.has(w));
  const extras = (extra || '')
    .split(',')
    .map(k => k.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...words, ...extras])];
}

// Substitute {{NAME}} in a template.
//
// Throws on a missing placeholder: a plain .replace() would no-op silently and
// ship a page with a hole in it. The value is supplied as a function so that
// `$&`, `$1`, "$`" etc. occurring in article prose are inserted literally
// rather than interpreted as replacement patterns.
function fill(html, name, value) {
  const token = `{{${name}}}`;
  if (!html.includes(token)) throw new Error(`template: placeholder ${token} not found`);
  return html.replace(token, () => value);
}

// The whole <head>, owned here rather than duplicated between template.html
// and the hand-maintained index.html (where it used to be kept in sync by
// hand, inline theme script and all). `title` is the finished <title> text.
function headHtml({ title }) {
  return `  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/assets/site.css" />
  <script>
    // Apply the theme before first paint: stored choice, else system setting.
    (function () {
      var stored = null;
      try { stored = localStorage.getItem('theme'); } catch (e) {}
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      function apply(theme) { document.documentElement.setAttribute('data-theme', theme); }
      apply(stored === 'dark' || stored === 'light' ? stored : (mq.matches ? 'dark' : 'light'));
      mq.addEventListener('change', function (e) {
        var s = null;
        try { s = localStorage.getItem('theme'); } catch (err) {}
        if (s !== 'dark' && s !== 'light') apply(e.matches ? 'dark' : 'light');
      });
    })();
  </script>`;
}

// Optional page chrome. Pages that carry their own in-body search field (the
// /search results page) pass '' for NAV_SEARCH and SIDENAV_BLOCK instead of
// having them cut back out of the rendered HTML with regexes.
const NAV_SEARCH = `<!-- NAV-SEARCH -->
      <div class="search-wrap nav-search" id="searchWrap">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          id="searchInput"
          placeholder="Search docs…"
          autocomplete="off"
          aria-label="Search the knowledge base"
          aria-autocomplete="list"
          aria-controls="searchDropdown"
          aria-expanded="false"
        />
        <div class="search-dropdown" id="searchDropdown" role="listbox"></div>
      </div>
      <!-- /NAV-SEARCH -->`;

const DOCNAV_TOGGLE = `<label for="navtoggle" class="navtoggle-btn">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        Documentation menu
      </label>`;

const sidenavBlock = sidenavHtml => `<aside class="sidenav-wrap">
      ${sidenavHtml}
    </aside>`;

// The end-of-body scripts, shared with the hand-maintained home page so the
// two can't drift. Only the theme (tiny, and needed before anything else) and
// the search boot stub load up front; the boot stub pulls the ~63KB search
// engine in on demand. See assets/search-boot.js.
function scriptsHtml({ controller = '/assets/search.js', eager = false } = {}) {
  return `  <script src="/assets/theme.js"></script>
  <script src="/assets/search-boot.js" data-controller="${controller}" data-eager="${eager}" defer></script>`;
}

function renderPage({
  title,
  breadcrumbHtml,
  bodyHtml,
  sidenavHtml,
  searchScript = '/assets/search.js',
  searchEager = false,
}) {
  let html = TEMPLATE;
  html = fill(html, 'HEAD', headHtml({ title: `${title} — Storyraise` }));
  html = fill(html, 'NAV_SEARCH', sidenavHtml ? NAV_SEARCH : '');
  html = fill(html, 'SIDENAV_BLOCK', sidenavHtml ? sidenavBlock(sidenavHtml) : '');
  html = fill(html, 'DOCNAV_TOGGLE', sidenavHtml ? DOCNAV_TOGGLE : '');
  html = fill(html, 'BREADCRUMB', breadcrumbHtml);
  html = fill(html, 'BODY', bodyHtml);
  html = fill(html, 'SCRIPTS', scriptsHtml({ controller: searchScript, eager: searchEager }));
  return html;
}

// Build the left-hand documentation tree. The section containing currentUrl
// is expanded; the current page's link is marked active. Uses <details> so
// collapsing needs no JavaScript.
function buildSidenav(sections, currentUrl) {
  let html = '<nav class="sidenav" aria-label="Documentation">\n';
  for (const section of sections) {
    const inSection = section.articles.some(a => a.url === currentUrl);
    const landingUrl = `/docs/${section.dir}/`;
    const isLanding = currentUrl === landingUrl;
    html += `  <details class="sidenav-group"${inSection || isLanding ? ' open' : ''}>\n`;
    html += `    <summary>${escapeHtml(section.label)}</summary>\n`;
    html += `    <ul>\n`;
    html += `      <li><a href="${landingUrl}"${isLanding ? ' class="active" aria-current="page"' : ''}>Overview</a></li>\n`;
    for (const a of section.articles) {
      const active = a.url === currentUrl ? ' class="active" aria-current="page"' : '';
      html += `      <li><a href="${a.url}"${active}>${escapeHtml(a.title)}</a></li>\n`;
    }
    html += `    </ul>\n  </details>\n`;
  }
  html += '</nav>';
  return html;
}

function writePage(outPath, html) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, stampAssets(html));
}

/* ── article conversion ─────────────────────────────────────────────── */

function postProcess(html) {
  // Blockquotes → site callout boxes. "Coming soon" quotes get the lime
  // .note treatment; everything else gets the purple .tip.
  html = html.replace(/<blockquote>([\s\S]*?)<\/blockquote>/g, (_, inner) => {
    const cls = /coming soon/i.test(inner) ? 'note' : 'tip';
    return `<div class="${cls}">${inner.trim()}</div>`;
  });

  // First paragraph after the h1 becomes the lead.
  html = html.replace(/(<\/h1>\s*)<p>/, '$1<p class="lead">');

  // Drop a trailing <hr> (left behind when a stripped TEAM REVIEW block
  // followed a closing --- divider) — the template adds its own.
  html = html.replace(/<hr>\s*$/, '');

  return html;
}

// Parse + render an article's body and metadata. Page HTML is written later
// (writeArticlePage), once the full section tree exists for the sidebar.
function prepareArticle(relDir, file, section) {
  const src = fs.readFileSync(path.join(CONTENT_DIR, relDir, file), 'utf8');
  const { meta, body } = parseFrontmatter(src);
  const slug = file.replace(/\.md$/, '');
  const url = `/docs/${relDir}/${slug}/`;

  let md = stripTeamReview(body);
  md = rewriteMdLinks(md, relDir);

  let html = marked.parse(md);
  html = postProcess(html);

  const title = meta.title || slug;
  const breadcrumbHtml = [
    `<a href="/">Knowledge Base</a>`,
    `<span>›</span>`,
    `<a href="/docs/${section.dir}/">${escapeHtml(section.label)}</a>`,
    `<span>›</span>`,
    escapeHtml(title),
  ].join('\n    ');

  return {
    title,
    url,
    slug,
    srcPath: `content/${relDir}/${file}`,
    metaSection: meta.section,
    status: meta.status || 'draft',
    description: truncate(firstParagraphText(html), 160),
    section: section.label,
    body: plainText(html),
    keywords: keywordsFor(title, section.label, slug, meta.keywords),
    isIntegration: relDir.endsWith('/integrations'),
    outPath: path.join(OUT_DIR, relDir, slug, 'index.html'),
    bodyHtml: html,
    breadcrumbHtml,
  };
}

function writeArticlePage(article, sidenavHtml) {
  writePage(article.outPath, renderPage({
    title: article.title,
    breadcrumbHtml: article.breadcrumbHtml,
    bodyHtml: article.bodyHtml,
    sidenavHtml,
  }));
}

/* ── section landing pages ──────────────────────────────────────────── */

function cardHtml(article) {
  const badge = article.status === 'stub' ? `\n        <span class="badge">Coming soon</span>` : '';
  return `      <a class="card" href="${article.url}">
        <h3>${escapeHtml(article.title)}</h3>
        <p>${escapeHtml(article.description)}</p>${badge}
      </a>`;
}

function writeLanding(section, sidenavHtml) {
  const main = section.articles.filter(a => !a.isIntegration);
  const integrations = section.articles.filter(a => a.isIntegration);

  let body = `<h1>${escapeHtml(section.label)}</h1>\n`;
  body += `<p class="lead">${escapeHtml(section.blurb)}</p>\n`;
  body += `<div class="cards">\n${main.map(cardHtml).join('\n')}\n    </div>\n`;

  if (integrations.length) {
    body += `<h2>Integration guides</h2>\n`;
    body += `<div class="cards">\n${integrations.map(cardHtml).join('\n')}\n    </div>\n`;
  }

  const breadcrumbHtml = [
    `<a href="/">Knowledge Base</a>`,
    `<span>›</span>`,
    escapeHtml(section.label),
  ].join('\n    ');

  writePage(path.join(OUT_DIR, section.dir, 'index.html'), renderPage({ title: section.label, breadcrumbHtml, bodyHtml: body, sidenavHtml }));
}

/* ── home page (generated regions) ──────────────────────────────────── */

// One card per section for the home "Browse the docs" grid. Counts are derived
// from section.articles so they track content. CRM mixes core guides with many
// near-identical integration stubs, so it shows the split rather than a flat
// total that would overstate the reading material.
function homeSectionCard(section) {
  const articles = section.articles;
  let count;
  if (section.dir === 'crm-and-data') {
    const guides = articles.filter(a => !a.isIntegration).length;
    const integrations = articles.filter(a => a.isIntegration).length;
    count = `${guides} guides · ${integrations} integrations`;
  } else {
    const n = articles.length;
    count = `${n} article${n === 1 ? '' : 's'}`;
  }
  return `      <a class="card" href="/docs/${section.dir}/">
        <span class="icon">${section.icon}</span>
        <h3>${escapeHtml(section.label)}</h3>
        <p>${escapeHtml(section.blurb)}</p>
        <span class="card-count">${count}</span>
      </a>`;
}

// A chip for every integration guide — the home "Connect your CRM" row is the
// catch-all entry point for all supported platforms. Order follows the section
// reading order; a new integration guide appears here automatically.
function homeCrmChips(section) {
  return section.articles
    .filter(a => a.isIntegration)
    .map(a => `      <a class="crm-chip" href="${a.url}">${escapeHtml(a.title)}</a>`)
    .join('\n');
}

// Rewrite the two AUTO regions of the hand-maintained index.html in place.
// Markers are preserved so the replacement is idempotent; a missing marker is
// a hard error rather than a silent no-op.
function replaceRegion(html, name, inner) {
  const re = new RegExp(`(<!-- AUTO:${name} -->)[\\s\\S]*?(<!-- /AUTO:${name} -->)`);
  if (!re.test(html)) throw new Error(`buildHome: marker AUTO:${name} not found in index.html`);
  return html.replace(re, `$1\n${inner}\n$2`);
}

function buildHome() {
  const homePath = path.join(ROOT, 'index.html');
  let html = fs.readFileSync(homePath, 'utf8');

  // The home page keeps its own <title> — it is the root, not "X — Storyraise".
  html = replaceRegion(html, 'HEAD', headHtml({ title: 'Storyraise Knowledge Base' }));
  html = replaceRegion(html, 'SCRIPTS', scriptsHtml());
  html = replaceRegion(html, 'SECTION-GRID', SECTIONS.map(homeSectionCard).join('\n'));

  const crm = SECTIONS.find(s => s.dir === 'crm-and-data');
  html = replaceRegion(html, 'CRM-LINKS', homeCrmChips(crm));

  writePage(homePath, html);
  console.log('index.html: home regions regenerated');
}

/* ── search results page ────────────────────────────────────────────── */

// A standalone /search/ page that renders a full results list (the header
// dropdown only previews a few). Reuses the shared nav/footer/theme via the
// doc template. Passing no sidenav drops the header search box (this page has
// its own in-body field — the ids would otherwise collide), the empty sidebar
// and its mobile toggle; searchScript loads the results-page controller
// instead of the dropdown one.
function buildSearchPage() {
  const body = `<h1>Search the knowledge base</h1>
<div class="search-wrap search-page-search" id="searchWrap">
  <span class="search-icon">🔍</span>
  <input
    type="text"
    id="searchInput"
    placeholder="Search articles, guides, and answers…"
    autocomplete="off"
    aria-label="Search the knowledge base"
  />
</div>
<p class="search-summary" id="searchSummary"></p>
<div class="search-results" id="searchResults" aria-live="polite"></div>`;

  const breadcrumbHtml = [
    `<a href="/">Knowledge Base</a>`,
    `<span>›</span>`,
    'Search',
  ].join('\n    ');

  const html = renderPage({
    title: 'Search',
    breadcrumbHtml,
    bodyHtml: body,
    sidenavHtml: '',
    searchScript: '/assets/search-page.js',
    searchEager: true,   // arriving here IS the intent — don't wait for a keystroke
  });
  writePage(path.join(ROOT, 'search', 'index.html'), html);
}

/* ── validators ─────────────────────────────────────────────────────── */

// Generated pages this build does not own. The original standalone
// /docs/email-subdomain-setup/ page moved into account-and-settings; the old
// URL survives as a hand-written redirect stub so existing links, bookmarks
// and search results keep working.
const HAND_MAINTAINED = new Set(['docs/email-subdomain-setup/index.html']);

const problems = [];

// `order` drives the sidebar and the reading sequence. An unlisted slug
// silently sorts to the end and a deleted one silently does nothing, so
// neither surfaces as a failure — only as a page in the wrong place.
function checkOrder(section) {
  const onDisk = new Set(section.articles.map(a => a.slug));
  const listed = section.order || [];
  for (const slug of listed) {
    if (!onDisk.has(slug)) problems.push(`${section.dir}: order lists "${slug}", which has no .md file`);
  }
  for (const slug of onDisk) {
    if (!listed.includes(slug)) problems.push(`${section.dir}: "${slug}" is missing from order (it would sort to the end)`);
  }
}

// The build places an article by its directory; `section:` frontmatter is a
// second, unenforced copy of the same fact, and it has already drifted.
function checkSectionMeta(article, section) {
  if (article.metaSection && article.metaSection !== section.label) {
    problems.push(`${article.srcPath}: section: "${article.metaSection}" but the directory says "${section.label}"`);
  }
}

// A page left behind by a renamed or deleted source file stays live, stale and
// indexable, while quietly vanishing from the sidebar and search.
function checkOrphans(written) {
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
  for (const full of walk(OUT_DIR)) {
    if (path.basename(full) !== 'index.html') continue;
    const rel = path.relative(ROOT, full);
    if (!written.has(rel) && !HAND_MAINTAINED.has(rel)) {
      problems.push(`${rel}: orphaned page — no source file generates it`);
    }
  }
}

// The build knows every URL it just wrote, so every internal link can be
// checked for free — including the hand-curated ones on the home page.
function checkLinks(urls, files) {
  for (const rel of files) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const html = fs.readFileSync(full, 'utf8');
    for (const m of html.matchAll(/href="(\/docs\/[^"#?]*)"/g)) {
      const href = m[1].endsWith('/') ? m[1] : m[1] + '/';
      if (!urls.has(href)) problems.push(`${rel}: links to ${m[1]}, which does not exist`);
    }
  }
}

function reportProblems() {
  if (!problems.length) return;
  console.error(`\nBuild found ${problems.length} problem${problems.length === 1 ? '' : 's'}:`);
  for (const p of problems) console.error(`  • ${p}`);
  process.exit(1);
}

/* ── main ───────────────────────────────────────────────────────────── */

// Pass 1 — parse every article and attach the ordered list to its section,
// so the sidebar tree (which spans all sections) can be built before any page
// is written.
for (const section of SECTIONS) {
  const dirs = [section.dir];
  const integrationsDir = path.join(CONTENT_DIR, section.dir, 'integrations');
  if (fs.existsSync(integrationsDir)) dirs.push(`${section.dir}/integrations`);

  const articles = [];
  for (const relDir of dirs) {
    const files = fs.readdirSync(path.join(CONTENT_DIR, relDir)).filter(f => f.endsWith('.md')).sort();
    for (const file of files) {
      articles.push(prepareArticle(relDir, file, section));
    }
  }

  // Reading order from the section's `order` list; unlisted slugs sort to the
  // end alphabetically. Integrations are ordered too but listed separately on
  // the landing page.
  const rank = s => { const i = (section.order || []).indexOf(s); return i === -1 ? Infinity : i; };
  articles.sort((a, b) => rank(a.slug) - rank(b.slug) || a.slug.localeCompare(b.slug));

  section.articles = articles;

  checkOrder(section);
  for (const a of articles) checkSectionMeta(a, section);
}

// Pass 2 — write every page with its sidebar (current page/section marked),
// and collect the search index.
const searchIndex = [];
const written = new Set();                                    // repo-relative paths this build owns
const knownUrls = new Set(['/docs/email-subdomain-setup/']);  // + the hand-kept redirect stub

for (const section of SECTIONS) {
  const landingUrl = `/docs/${section.dir}/`;
  writeLanding(section, buildSidenav(SECTIONS, landingUrl));
  written.add(path.join('docs', section.dir, 'index.html'));
  knownUrls.add(landingUrl);

  for (const a of section.articles) {
    writeArticlePage(a, buildSidenav(SECTIONS, a.url));
    written.add(path.relative(ROOT, a.outPath));
    knownUrls.add(a.url);
    searchIndex.push({ title: a.title, description: a.description, section: a.section, url: a.url, keywords: a.keywords, body: a.body });
  }

  console.log(`${section.label}: ${section.articles.length} articles`);
}

buildHome();
buildSearchPage();

checkOrphans(written);
checkLinks(knownUrls, [...written, ...HAND_MAINTAINED, 'index.html', 'search/index.html']);
reportProblems();

const indexJs =
  '// GENERATED by build/build.js — do not edit by hand.\n' +
  '// Each entry: { title, description, section, url, keywords[], body }.\n' +
  'const SEARCH_INDEX = ' + JSON.stringify(searchIndex, null, 2) + ';\n' +
  '\n// Dropped from a reader\'s query before matching. See QUERY_STOPWORDS in build.js.\n' +
  'const SEARCH_STOPWORDS = ' + JSON.stringify(QUERY_STOPWORDS) + ';\n';

fs.writeFileSync(path.join(ROOT, 'search-index.js'), indexJs);

// This file is only fetched when a reader actually searches, so its size is a
// budget rather than a page-load cost. Report it so growth is noticed.
const gzipKb = zlib.gzipSync(indexJs).length / 1024;
console.log(`search-index.js: ${searchIndex.length} entries, ${gzipKb.toFixed(1)}KB gzip`);
if (gzipKb > 80) {
  console.warn(`  warning: search index is ${gzipKb.toFixed(0)}KB gzip — readers download this on first search`);
}
