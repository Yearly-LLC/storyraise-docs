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
const { marked } = require('marked');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const OUT_DIR = path.join(ROOT, 'docs');
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
      'images-and-videos', 'image-sizes-and-dimensions', 'ai-content-generation',
      'reordering-sections', 'navigation-options', 'mobile-optimization', 'accessibility',
    ],
  },
  {
    dir: 'distribution-and-engagement',
    label: 'Distribution & Engagement',
    blurb: 'Share your published reports and see who engages.',
    icon: '📤',
    order: [
      'sharing-reports', 'personalized-links', 'email-distribution', 'sms-distribution',
      'tracking-engagement', 'understanding-report-metrics', 'video-analytics',
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
    order: ['best-practices', 'network-requirements', 'faq'],
  },
];

// Pages that exist outside this build but must stay in the search index.
// (The original standalone /docs/email-subdomain-setup/ page was migrated to
// content/account-and-settings/email-subdomain-setup.md; the old URL is now a
// redirect stub maintained by hand at docs/email-subdomain-setup/index.html.)
const EXTRA_SEARCH_ENTRIES = [];

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

// Per-article body text cap for the search index. Keeps search-index.js lean
// (it parses synchronously on every page load); the most distinctive terms
// cluster near the top of an article, and title/keywords carry the long tail.
const BODY_MAX_CHARS = 1500;

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

function renderPage({ title, breadcrumbHtml, bodyHtml, sidenavHtml }) {
  return TEMPLATE
    .replace('{{TITLE}}', escapeHtml(title))
    .replace('{{SIDENAV}}', sidenavHtml || '')
    .replace('{{BREADCRUMB}}', breadcrumbHtml)
    .replace('{{BODY}}', bodyHtml);
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
  fs.writeFileSync(outPath, html);
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
    status: meta.status || 'draft',
    description: truncate(firstParagraphText(html), 160),
    section: section.label,
    body: truncate(plainText(html), BODY_MAX_CHARS),
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

  html = replaceRegion(html, 'SECTION-GRID', SECTIONS.map(homeSectionCard).join('\n'));

  const crm = SECTIONS.find(s => s.dir === 'crm-and-data');
  html = replaceRegion(html, 'CRM-LINKS', homeCrmChips(crm));

  fs.writeFileSync(homePath, html);
  console.log('index.html: home regions regenerated');
}

/* ── search results page ────────────────────────────────────────────── */

// A standalone /search/ page that renders a full results list (the header
// dropdown only previews a few). Reuses the shared nav/footer/theme via the
// doc template, then makes two targeted swaps: drop the header search box
// (the page has its own in-body field — and IDs would otherwise collide) and
// load the results-page controller instead of the dropdown one.
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

  let html = renderPage({ title: 'Search', breadcrumbHtml, bodyHtml: body, sidenavHtml: '' });
  html = html.replace(/<!-- NAV-SEARCH -->[\s\S]*?<!-- \/NAV-SEARCH -->/, '');
  // No sidebar on this page — drop the empty aside (so the results span full
  // width) and the mobile "Documentation menu" toggle that opens it.
  html = html.replace(/<aside class="sidenav-wrap">[\s\S]*?<\/aside>/, '');
  html = html.replace(/<label for="navtoggle" class="navtoggle-btn">[\s\S]*?<\/label>/, '');
  html = html.replace('<script src="/assets/search.js"></script>', '<script src="/assets/search-page.js"></script>');
  writePage(path.join(ROOT, 'search', 'index.html'), html);
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
}

// Pass 2 — write every page with its sidebar (current page/section marked),
// and collect the search index.
const searchIndex = [...EXTRA_SEARCH_ENTRIES];

for (const section of SECTIONS) {
  writeLanding(section, buildSidenav(SECTIONS, `/docs/${section.dir}/`));

  for (const a of section.articles) {
    writeArticlePage(a, buildSidenav(SECTIONS, a.url));
    searchIndex.push({ title: a.title, description: a.description, section: a.section, url: a.url, keywords: a.keywords, body: a.body });
  }

  console.log(`${section.label}: ${section.articles.length} articles`);
}

buildHome();
buildSearchPage();

fs.writeFileSync(
  path.join(ROOT, 'search-index.js'),
  '// GENERATED by build/build.js — do not edit by hand.\n' +
  '// Each entry: { title, description, section, url, keywords[], body }.\n' +
  'const SEARCH_INDEX = ' + JSON.stringify(searchIndex, null, 2) + ';\n'
);

console.log(`search-index.js: ${searchIndex.length} entries`);
