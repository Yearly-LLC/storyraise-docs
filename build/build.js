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
    order: [
      'what-is-storyraise', 'creating-your-first-report', 'understanding-templates',
      'publishing-and-sharing', 'pdf-exports', 'user-roles-and-permissions', 'common-terminology',
    ],
  },
  {
    dir: 'crm-and-data',
    label: 'CRM & Data Connections',
    blurb: 'Bring your constituent data into Storyraise.',
    order: [
      'connecting-a-crm', 'importing-constituent-data', 'mapping-fields', 'data-refreshes',
      'troubleshooting-sync-issues', 'supported-integrations',
      'blackbaud-raisers-edge-nxt', 'bloomerang', 'givebutter', 'virtuous', 'hubspot', 'civicrm',
    ],
  },
  {
    dir: 'building-reports',
    label: 'Building Reports',
    blurb: 'Everything about building and styling reports.',
    order: [
      'adding-sections', 'editing-content', 'using-templates', 'brand-kit', 'fonts-and-colors',
      'images-and-videos', 'ai-content-generation', 'reordering-sections', 'navigation-options',
      'mobile-optimization', 'accessibility',
    ],
  },
  {
    dir: 'distribution-and-engagement',
    label: 'Distribution & Engagement',
    blurb: 'Share your published reports and see who engages.',
    order: [
      'sharing-reports', 'personalized-links', 'email-distribution', 'sms-distribution',
      'tracking-engagement', 'understanding-report-metrics', 'video-analytics',
    ],
  },
  {
    dir: 'products',
    label: 'Products',
    blurb: 'Overviews of the Storyraise product family.',
    order: ['storyraise-video', 'storyraise-collect'],
  },
  {
    dir: 'resources',
    label: 'Resources',
    blurb: 'Guides and answers that span the whole platform.',
    order: ['best-practices', 'faq'],
  },
];

// Pages that exist outside this build but must stay in the search index.
const EXTRA_SEARCH_ENTRIES = [
  {
    title: 'Setting Up Your Email Sending Subdomain',
    description: 'Enable email sending from Storyraise by configuring a custom subdomain with SPF, DKIM, and tracking DNS records.',
    url: '/docs/email-subdomain-setup/',
    keywords: ['email', 'dns', 'subdomain', 'spf', 'dkim', 'setup', 'sending', 'domain', 'records', 'cloudflare', 'godaddy'],
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

function keywordsFor(title, sectionLabel, slug) {
  const words = (title + ' ' + sectionLabel + ' ' + slug.replace(/-/g, ' '))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['the', 'and', 'your', 'with', 'for'].includes(w));
  return [...new Set(words)];
}

function renderPage({ title, breadcrumbHtml, bodyHtml }) {
  return TEMPLATE
    .replace('{{TITLE}}', escapeHtml(title))
    .replace('{{BREADCRUMB}}', breadcrumbHtml)
    .replace('{{BODY}}', bodyHtml);
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

function buildArticle(relDir, file, section) {
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
    `<a href="https://docs.storyraise.com">Knowledge Base</a>`,
    `<span>›</span>`,
    `<a href="/docs/${section.dir}/">${escapeHtml(section.label)}</a>`,
    `<span>›</span>`,
    escapeHtml(title),
  ].join('\n    ');

  writePage(path.join(OUT_DIR, relDir, slug, 'index.html'), renderPage({ title, breadcrumbHtml, bodyHtml: html }));

  return {
    title,
    url,
    slug,
    status: meta.status || 'draft',
    description: truncate(firstParagraphText(html), 160),
    keywords: keywordsFor(title, section.label, slug),
    isIntegration: relDir.endsWith('/integrations'),
  };
}

/* ── section landing pages ──────────────────────────────────────────── */

function cardHtml(article) {
  const badge = article.status === 'stub' ? `\n        <span class="badge">Coming soon</span>` : '';
  return `      <a class="card" href="${article.url}">
        <h3>${escapeHtml(article.title)}</h3>
        <p>${escapeHtml(article.description)}</p>${badge}
      </a>`;
}

function buildLanding(section, articles) {
  const main = articles.filter(a => !a.isIntegration);
  const integrations = articles.filter(a => a.isIntegration);

  let body = `<h1>${escapeHtml(section.label)}</h1>\n`;
  body += `<p class="lead">${escapeHtml(section.blurb)}</p>\n`;
  body += `<div class="cards">\n${main.map(cardHtml).join('\n')}\n    </div>\n`;

  if (integrations.length) {
    body += `<h2>Integration guides</h2>\n`;
    body += `<div class="cards">\n${integrations.map(cardHtml).join('\n')}\n    </div>\n`;
  }

  const breadcrumbHtml = [
    `<a href="https://docs.storyraise.com">Knowledge Base</a>`,
    `<span>›</span>`,
    escapeHtml(section.label),
  ].join('\n    ');

  writePage(path.join(OUT_DIR, section.dir, 'index.html'), renderPage({ title: section.label, breadcrumbHtml, bodyHtml: body }));
}

/* ── main ───────────────────────────────────────────────────────────── */

const searchIndex = [...EXTRA_SEARCH_ENTRIES];

for (const section of SECTIONS) {
  const dirs = [section.dir];
  const integrationsDir = path.join(CONTENT_DIR, section.dir, 'integrations');
  if (fs.existsSync(integrationsDir)) dirs.push(`${section.dir}/integrations`);

  const articles = [];
  for (const relDir of dirs) {
    const files = fs.readdirSync(path.join(CONTENT_DIR, relDir)).filter(f => f.endsWith('.md')).sort();
    for (const file of files) {
      articles.push(buildArticle(relDir, file, section));
    }
  }

  // Landing pages and search follow the section's reading order;
  // slugs missing from the order list sort to the end alphabetically.
  const rank = s => { const i = (section.order || []).indexOf(s); return i === -1 ? Infinity : i; };
  articles.sort((a, b) => rank(a.slug) - rank(b.slug) || a.slug.localeCompare(b.slug));

  buildLanding(section, articles);

  for (const a of articles) {
    searchIndex.push({ title: a.title, description: a.description, url: a.url, keywords: a.keywords });
  }

  console.log(`${section.label}: ${articles.length} articles`);
}

fs.writeFileSync(
  path.join(ROOT, 'search-index.js'),
  '// GENERATED by build/build.js — do not edit by hand.\n' +
  'const SEARCH_INDEX = ' + JSON.stringify(searchIndex, null, 2) + ';\n'
);

console.log(`search-index.js: ${searchIndex.length} entries`);
