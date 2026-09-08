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

// Absolute origin for canonical URLs, Open Graph and JSON-LD. Social cards and
// <link rel="canonical"> both require absolute URLs, so relative paths can't be
// used. Matches CNAME.
const SITE_URL = 'https://docs.storyraise.com';

// Fallback description for pages whose first paragraph yields nothing usable.
const SITE_DESCRIPTION =
  'Step-by-step guides for nonprofit teams using Storyraise — build on-brand ' +
  'impact reports, connect your CRM, distribute by email, SMS, and embed, and ' +
  'measure who engaged.';

// Cache-bust /assets/site.css with a short content hash so a deploy's CSS
// changes take effect immediately. The <link> is otherwise unversioned, and
// GitHub Pages / the CDN cache it aggressively — which can serve a stale
// stylesheet (e.g. missing the media rules that keep article images and
// videos inside the reading column). The hash changes only when site.css
// changes, so unrelated builds stay stable. stampAssets is idempotent: it
// rewrites any existing ?v= too, so re-running the build never stacks them.
function listMarkdownFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listMarkdownFiles(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function hashFiles(files) {
  const h = crypto.createHash('sha1');
  for (const f of files) h.update(fs.readFileSync(f));
  return h.digest('hex').slice(0, 8);
}

const ASSETS = path.join(ROOT, 'assets');
const CSS_VERSION = hashFiles([path.join(ASSETS, 'site.css')]);

// The search engine is cache-busted for the same reason as the CSS, but it
// needs two versions because the chain is loaded in two different ways.
//
// SEARCH_INDEX_VERSION covers /search-index.js, which is regenerated on every
// content change. Without it a reader who searched in the last max-age window
// keeps a stale index and can click a result for a page that has since moved
// or been deleted — landing on a 404. It hashes the markdown sources rather
// than the built index because pages are written before the index exists;
// content is what the index is derived from, so the two change together.
//
// SEARCH_ENGINE_VERSION covers the engine scripts, which change rarely. It is
// kept separate so a content edit doesn't force readers to re-download
// MiniSearch (~18KB) along with the index.
const SEARCH_INDEX_VERSION = hashFiles(
  listMarkdownFiles(CONTENT_DIR).sort()
);
const SEARCH_ENGINE_VERSION = hashFiles(
  ['search-boot.js', 'search-core.js', 'minisearch.min.js', 'search.js', 'search-page.js']
    .map(f => path.join(ASSETS, f))
);

// search-boot.js is referenced from generated HTML, so it is stamped here; the
// rest of the chain is fetched by search-boot at runtime and gets its versions
// through the data attributes in scriptsHtml().
function stampAssets(html) {
  return html
    .replace(/\/assets\/site\.css(\?v=[a-f0-9]+)?/g, `/assets/site.css?v=${CSS_VERSION}`)
    .replace(/\/assets\/search-boot\.js(\?v=[a-f0-9]+)?/g, `/assets/search-boot.js?v=${SEARCH_ENGINE_VERSION}`);
}

// Stamping happens in writePage, not here: the <head> is assembled after the
// template is read, so anything stamped at read time would miss it.
const TEMPLATE = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

// ── ICONS ────────────────────────────────────────────────────────────
// Material Symbols (outlined, 24px), inlined as path data rather than loaded
// as a webfont or from a CDN. Emoji were previously used here: they render as
// a different icon set on every operating system, and they landed in each
// card link's accessible name. Inlining keeps this working behind the strict
// firewalls documented in resources/network-requirements.md.
const ICON_PATHS = {
  database: 'M480-120q-151 0-255.5-46.5T120-280v-400q0-66 105.5-113T480-840q149 0 254.5 47T840-680v400q0 67-104.5 113.5T480-120Zm0-479q89 0 179-25.5T760-679q-11-29-100.5-55T480-760q-91 0-178.5 25.5T200-679q14 30 101.5 55T480-599Zm0 199q42 0 81-4t74.5-11.5q35.5-7.5 67-18.5t57.5-25v-120q-26 14-57.5 25t-67 18.5Q600-528 561-524t-81 4q-42 0-82-4t-75.5-11.5Q287-543 256-554t-56-25v120q25 14 56 25t66.5 18.5Q358-408 398-404t82 4Zm0 200q46 0 93.5-7t87.5-18.5q40-11.5 67-26t32-29.5v-98q-26 14-57.5 25t-67 18.5Q600-328 561-324t-81 4q-42 0-82-4t-75.5-11.5Q287-343 256-354t-56-25v99q5 15 31.5 29t66.5 25.5q40 11.5 88 18.5t94 7Z',
  assignment: 'M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h168q13-36 43.5-58t68.5-22q38 0 68.5 22t43.5 58h168q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm80-80h280v-80H280v80Zm0-160h400v-80H280v80Zm0-160h400v-80H280v80Zm221.5-198.5Q510-807 510-820t-8.5-21.5Q493-850 480-850t-21.5 8.5Q450-833 450-820t8.5 21.5Q467-790 480-790t21.5-8.5ZM200-200v-560 560Z',
  edit_document: 'M560-80v-123l221-220q9-9 20-13t22-4q12 0 23 4.5t20 13.5l37 37q8 9 12.5 20t4.5 22q0 11-4 22.5T903-300L683-80H560Zm300-263-37-37 37 37ZM620-140h38l121-122-18-19-19-18-122 121v38ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v120h-80v-80H520v-200H240v640h240v80H240Zm280-400Zm241 199-19-18 37 37-18-19Z',
  menu_book: 'M560-564v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-600q-38 0-73 9.5T560-564Zm0 220v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-380q-38 0-73 9t-67 27Zm0-110v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-490q-38 0-73 9.5T560-454ZM260-320q47 0 91.5 10.5T440-278v-394q-41-24-87-36t-93-12q-36 0-71.5 7T120-692v396q35-12 69.5-18t70.5-6Zm260 42q44-21 88.5-31.5T700-320q36 0 70.5 6t69.5 18v-396q-33-14-68.5-21t-71.5-7q-47 0-93 12t-87 36v394Zm-40 118q-48-38-104-59t-116-21q-42 0-82.5 11T100-198q-21 11-40.5-1T40-234v-482q0-11 5.5-21T62-752q46-24 96-36t102-12q58 0 113.5 15T480-740q51-30 106.5-45T700-800q52 0 102 12t96 36q11 5 16.5 15t5.5 21v482q0 23-19.5 35t-40.5 1q-37-20-77.5-31T700-240q-60 0-116 21t-104 59ZM280-494Z',
  rocket_launch: 'm226-559 78 33q14-28 29-54t33-52l-56-11-84 84Zm142 83 114 113q42-16 90-49t90-75q70-70 109.5-155.5T806-800q-72-5-158 34.5T492-656q-42 42-75 90t-49 90Zm155-121.5q0-33.5 23-56.5t57-23q34 0 57 23t23 56.5q0 33.5-23 56.5t-57 23q-34 0-57-23t-23-56.5ZM565-220l84-84-11-56q-26 18-52 32.5T532-299l33 79Zm313-653q19 121-23.5 235.5T708-419l20 99q4 20-2 39t-20 33L538-80l-84-197-171-171-197-84 167-168q14-14 33.5-20t39.5-2l99 20q104-104 218-147t235-24ZM157-321q35-35 85.5-35.5T328-322q35 35 34.5 85.5T327-151q-25 25-83.5 43T82-76q14-103 32-161.5t43-83.5Zm57 56q-10 10-20 36.5T180-175q27-4 53.5-13.5T270-208q12-12 13-29t-11-29q-12-12-29-11.5T214-265Z',
  search: 'M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z',
  send: 'M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z',
  settings: 'm370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z',
  videocam: 'M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h480q33 0 56.5 23.5T720-720v180l160-160v440L720-420v180q0 33-23.5 56.5T640-160H160Zm0-80h480v-480H160v480Zm0 0v-480 480Z',
};

// Decorative by definition — every icon here sits beside a text label.
function icon(name, cls = 'icon') {
  const d = ICON_PATHS[name];
  if (!d) throw new Error(`icon: unknown name "${name}"`);
  return `<svg class="${cls}" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
}

// Ordered to follow the journey rather than the product's architecture:
// start → build → send/measure → the two sibling products → data → admin →
// reference. This array drives both the home page grid and the sidebar tree on
// every generated page, so the two can't drift.
//
// TEAM REVIEW: Storyraise Collect now sits in the top row of the home grid.
// adding-sections.md states that the Repeater block "needs a Precision plan
// with Storyraise Collect active", which implies Collect is plan-gated — but no
// page says so directly. If Collect is not available on every plan, this card
// should carry a plan badge, otherwise the grid promotes something a large
// share of readers can't use. Confirm and either add the badge or state
// availability on what-is-storyraise-collect.md.
const SECTIONS = [
  {
    dir: 'getting-started',
    label: 'Getting Started',
    blurb: 'Sign up, build your first report, and publish it — start to finish in about 90 minutes.',
    icon: 'rocket_launch',
    order: [
      'what-is-storyraise', 'creating-your-first-report', 'first-report-in-90-minutes',
      'what-goes-in-an-annual-report', 'understanding-templates',
      'publishing-and-sharing', 'report-folders', 'user-roles-and-permissions', 'common-terminology',
    ],
  },
  {
    dir: 'building-reports',
    label: 'Building Reports',
    blurb: 'Writing, photos, colors, charts, and donor lists — and making it all work on a phone.',
    icon: 'edit_document',
    order: [
      'using-templates', 'brand-kit', 'adding-sections', 'editing-content',
      'element-bar', 'fonts-and-colors', 'donor-lists',
      'images-and-videos', 'creating-infographics', 'build-a-line-chart',
      'adding-a-poll', 'embedding-a-collect-form',
      'image-sizes-and-dimensions', 'ai-content-generation',
      'reordering-sections', 'navigation-options', 'mobile-optimization',
      'review-comments', 'accessibility',
    ],
  },
  {
    dir: 'distribution-and-engagement',
    label: 'Sharing & Analytics',
    blurb: 'Send by email, SMS, link, QR code, or PDF — then see which donors read it and who to call.',
    icon: 'send',
    order: [
      'sharing-reports', 'pdf-export', 'embedding-in-wordpress', 'personalized-links',
      'proofing-personalized-reports', 'email-distribution',
      'sms-distribution', 'analytics-overview', 'tracking-engagement', 'analytics-exclusion',
      'understanding-report-metrics', 'acting-on-analytics', 'reporting-to-leadership',
      'analytics-for-older-reports', 'video-analytics',
    ],
  },
  {
    dir: 'storyraise-collect',
    label: 'Storyraise Collect',
    blurb: 'Gather stories, photos, and consent from the people you work with, using branded forms.',
    icon: 'assignment',
    order: [
      'what-is-storyraise-collect', 'creating-a-collection', 'form-field-types',
      'multi-step-forms', 'sharing-your-form', 'what-respondents-experience',
      'consent-and-permissions', 'managing-responses', 'using-responses-in-a-report',
    ],
  },
  {
    dir: 'storyraise-video',
    label: 'Storyraise Video',
    blurb: 'Record one thank-you and send a personalized version to every donor, by name.',
    icon: 'videocam',
    order: [
      'what-is-storyraise-video', 'creating-a-video-message', 'recording-your-video',
      'scenes-and-personalization', 'sending-and-recipients',
    ],
  },
  {
    dir: 'crm-and-data',
    label: 'Donor Data & CRM',
    blurb: 'Connect your CRM or upload a spreadsheet. Read-only everywhere except Salesforce, which can optionally write engagement back.',
    icon: 'database',
    order: [
      'connecting-a-crm', 'importing-constituent-data', 'mapping-fields', 'data-refreshes',
      'data-governance', 'troubleshooting-sync-issues', 'supported-integrations',
      'connections-overview', 'syncing-data-to-collections', 'managing-connections',
      'blackbaud-raisers-edge-nxt', 'bloomerang', 'salesforce', 'virtuous', 'civicrm', 'slate',
      'ellucian', 'little-green-light', 'donorperfect', 'neon-crm', 'funraise',
      'givebutter', 'donorbox', 'fundraise-up', 'mailchimp',
    ],
  },
  {
    dir: 'account-and-settings',
    label: 'Account & Settings',
    blurb: 'Your team and who can see donor data, sign-in security, your sending domain, and billing.',
    icon: 'settings',
    order: [
      'setting-up-your-account', 'organization-settings', 'managing-your-team',
      'single-sign-on', 'profile-and-security', 'managing-your-subscription', 'email-subdomain-setup',
      'custom-sending-domain', 'email-compliance',
    ],
  },
  {
    dir: 'resources',
    label: 'Best Practices & Reference',
    blurb: 'What makes a report people finish, plus FAQs, accessibility, security, and notes for your IT team.',
    icon: 'menu_book',
    order: [
      'best-practices', 'faq', 'accessibility', 'accessibility-conformance',
      'security-and-data', 'network-requirements',
    ],
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
// `url` is the site-relative path of the page being written ('/' for home);
// `description` is the page's own summary, falling back to the site blurb.
// `siteName` marks the home page, which carries the site-level JSON-LD.
function headHtml({ title, description, url = '/', isHome = false }) {
  const desc = (description || SITE_DESCRIPTION).trim();
  const canonical = `${SITE_URL}${url}`;
  const ogImage = `${SITE_URL}/assets/og-card.png`;

  // Home carries Organization + WebSite (with the sitelinks SearchAction);
  // article and section pages carry a lighter WebPage node pointing back at it.
  const jsonLd = isHome
    ? {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': 'https://storyraise.com/#org',
            name: 'Storyraise',
            url: 'https://storyraise.com',
            logo: `${SITE_URL}/assets/logo-light.svg`,
          },
          {
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#site`,
            name: 'Storyraise Knowledge Base',
            url: `${SITE_URL}/`,
            publisher: { '@id': 'https://storyraise.com/#org' },
            inLanguage: 'en-US',
            potentialAction: {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: `${SITE_URL}/search/?q={search_term_string}`,
              },
              'query-input': 'required name=search_term_string',
            },
          },
        ],
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: title,
        description: desc,
        url: canonical,
        inLanguage: 'en-US',
        isPartOf: { '@id': `${SITE_URL}/#site` },
        publisher: { '@id': 'https://storyraise.com/#org' },
      };

  return `  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
  <meta name="theme-color" content="#803BB1" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#16131c" media="(prefers-color-scheme: dark)" />
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Storyraise Knowledge Base" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Storyraise Knowledge Base" />
  <meta property="og:locale" content="en_US" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(desc)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />

  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
  </script>

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
        ${icon('search', 'search-icon')}
        <input
          type="search"
          id="searchInput"
          role="combobox"
          aria-haspopup="listbox"
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
  <script src="/assets/search-boot.js" data-controller="${controller}" data-eager="${eager}" data-index-v="${SEARCH_INDEX_VERSION}" data-engine-v="${SEARCH_ENGINE_VERSION}" defer></script>`;
}

function renderPage({
  title,
  description,
  url = '/',
  breadcrumbHtml,
  bodyHtml,
  sidenavHtml,
  searchScript = '/assets/search.js',
  searchEager = false,
}) {
  let html = TEMPLATE;
  html = fill(html, 'HEAD', headHtml({ title: `${title} — Storyraise`, description, url }));
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
    description: article.description,
    url: article.url,
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
  // Without this the card <h3>s hang straight off the <h1> with no <h2>
  // between them, which reads as a broken outline to a screen reader.
  body += `<h2>${escapeHtml(integrations.length ? 'Guides' : 'Articles')}</h2>\n`;
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

  writePage(path.join(OUT_DIR, section.dir, 'index.html'), renderPage({
    title: section.label,
    description: section.blurb,
    url: `/docs/${section.dir}/`,
    breadcrumbHtml,
    bodyHtml: body,
    sidenavHtml,
  }));
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
        ${icon(section.icon)}
        <h3>${escapeHtml(section.label)}</h3>
        <p>${escapeHtml(section.blurb)}</p>
        <span class="card-count">${count}</span>
      </a>`;
}

// A chip for every integration guide — the home "Connect your CRM" row is the
// catch-all entry point for all supported platforms. Order follows the section
// reading order; a new integration guide appears here automatically.
// Integrations were previously one flat row of equally weighted chips under
// "any supported platform", which reads as a promise that every system is
// equally supported. They are grouped by what the system is for, and Salesforce
// carries a badge because it is the one integration that can write back — a
// fact evaluators need before they plan a project, not on page three.
const CRM_GROUPS = [
  {
    label: 'System of record',
    slugs: [
      'blackbaud-raisers-edge-nxt', 'bloomerang', 'salesforce', 'virtuous',
      'donorperfect', 'neon-crm', 'little-green-light', 'civicrm',
    ],
  },
  { label: 'Higher education', slugs: ['slate', 'ellucian'] },
  { label: 'Giving platforms', slugs: ['givebutter', 'donorbox', 'fundraise-up', 'funraise'] },
  { label: 'Email', slugs: ['mailchimp'] },
];

// Only claims we can source from the integration pages themselves.
const CRM_NOTES = {
  salesforce: { label: 'Read + write-back', title: 'Reads contacts and gifts; can optionally write engagement back to Salesforce' },
  civicrm: { label: 'Self-hosted', title: 'Self-hosted CiviCRM — your server must be reachable by Storyraise' },
  slate: { label: 'Manual mapping', title: 'Query columns are mapped by hand during setup' },
};

function homeCrmChips(section) {
  const bySlug = new Map(
    section.articles.filter(a => a.isIntegration).map(a => [a.slug, a])
  );
  const out = [];
  const seen = new Set();

  for (const group of CRM_GROUPS) {
    const chips = group.slugs
      .map(slug => {
        const a = bySlug.get(slug);
        if (!a) return null;
        seen.add(slug);
        const note = CRM_NOTES[slug];
        const badge = note
          ? `<span class="chip-note" title="${escapeHtml(note.title)}">${escapeHtml(note.label)}</span>`
          : '';
        return `        <a class="crm-chip" href="${a.url}">${escapeHtml(a.title)}${badge}</a>`;
      })
      .filter(Boolean);
    if (!chips.length) continue;
    out.push(`      <div class="crm-group">`);
    out.push(`        <h3 class="crm-group-label">${escapeHtml(group.label)}</h3>`);
    out.push(...chips);
    out.push(`      </div>`);
  }

  // Anything added to content/ but not yet placed in a group still appears,
  // rather than silently vanishing from the home page.
  const ungrouped = [...bySlug.values()].filter(a => !seen.has(a.slug));
  if (ungrouped.length) {
    out.push(`      <div class="crm-group">`);
    out.push(`        <h3 class="crm-group-label">More</h3>`);
    for (const a of ungrouped) {
      out.push(`        <a class="crm-chip" href="${a.url}">${escapeHtml(a.title)}</a>`);
    }
    out.push(`      </div>`);
  }
  return out.join('\n');
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
  html = replaceRegion(html, 'HEAD', headHtml({ title: 'Storyraise Knowledge Base', url: '/', isHome: true }));
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
  ${icon('search', 'search-icon')}
  <input
    type="search"
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
    description: 'Search every Storyraise guide, tutorial, and answer.',
    url: '/search/',
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
// /docs/email-subdomain-setup/ page moved into account-and-settings, and
// /docs/building-reports/creating-visualizations/ moved to .../creating-infographics/
// when Visualizations were renamed. Both old URLs survive as hand-written redirect
// stubs so existing links, bookmarks and search results keep working.
const HAND_MAINTAINED = new Set([
  'docs/email-subdomain-setup/index.html',
  'docs/building-reports/creating-visualizations/index.html',
]);

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
