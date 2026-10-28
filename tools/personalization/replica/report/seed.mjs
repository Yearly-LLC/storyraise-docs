// The in-memory database the report screens are captured against (fake-firebase.js).
//
// Built from the frozen fixtures only: fixtures/report-intro.json (the demo report's
// Intro page), .cache/replica/report/page-source.json (the same page's project_data,
// from the one read-only copy taken at kickoff), and fixtures/constituents.json.
// Nothing here reads production.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { config, FIXTURES_DIR, TOOLS_DIR, readJson, renameString } from '../../scripts/lib/identity.mjs';

export const REPORT_ID = '-HLIMPACT2026demo';
// The same report, published: the Share screen shows the published toolbar (Share + Republish).
export const REPORT_ID_PUB = '-HLIMPACT2026live';
// Captured from this worktree, not the main checkout: it carries the fix for the
// "Sending to my team" checkbox (`.modal .form-item input` drew it as a full-width bar).
export const BUILDER_PATH = '/Applications/MAMP/htdocs/yearly-v3/builder-share-fix';
const git = (...a) => execFileSync('git', ['-C', BUILDER_PATH, ...a]).toString().trim();
export const BUILDER_SOURCE = { path: BUILDER_PATH, branch: git('rev-parse', '--abbrev-ref', 'HEAD'), sha: git('rev-parse', 'HEAD'), dirty: git('status', '--porcelain', '--untracked-files=no').split('\n').filter(Boolean) };
// The Intro page's letter line, written with variables (fixtures/report-intro.json has it;
// project_data from the kickoff copy still says @@letter@@ until replaced here).
export const TEMPLATE_LINE = 'Dear @@first_name@@, thank you for your gift of $@@gift_amount@@. As a @@donor_level@@ donor, you helped Harbor Lights reach more families this year than ever before.';
export const PAGE_ID = config.source.page_id;
export const ORG = config.identity.org_slug;
export const USER = { uid: 'demo-admin-harbor', email: 'alex.morgan@harborlights.example', displayName: 'Alex Morgan' };
export const CACHE = path.join(TOOLS_DIR, '.cache', 'replica', 'report');

export const rename = renameString;

// Same hash as report.js / app-dashboard.js string_to_hash.
export function stringToHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h &= h; }
    return h;
}
export const constituentId = (email) => 'C' + stringToHash(email.toLowerCase());

export function buildSeed() {
    const intro = readJson(path.join(FIXTURES_DIR, 'report-intro.json'));
    const source = readJson(path.join(CACHE, 'page-source.json'));
    const people = readJson(path.join(FIXTURES_DIR, 'constituents.json')).constituents;
    const title = config.identity.report_title;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const page = {
        id: PAGE_ID,
        title: intro.title,
        content: { html: rename(intro.content.html), css: rename(intro.content.css) },
        project_data: rename(source.project_data).replace('"content":"@@letter@@"', `"content":${JSON.stringify(TEMPLATE_LINE)}`),
    };
    if (!page.content.html.includes(TEMPLATE_LINE)) throw new Error('report-intro.json: the template line is missing');
    if (page.project_data.includes('@@letter@@')) throw new Error('project_data still has @@letter@@');
    const meta = {
        ...source.meta,
        title,
        slug,
        description: `${title} from ${config.identity.org_name}.`,
        status: 'Draft',
        published: false,
    };
    delete meta.insights_narrative_md;
    delete meta.insights_narrative_at;
    delete meta.folder_id;
    const toc = {
        [PAGE_ID]: { id: PAGE_ID, order: 0, title: 'Intro', current_viewer: { id: USER.uid, name: USER.displayName }, here: {}, image: source.toc_image || '', image_auto_update: true, meta: { title } },
    };
    const report = {
        meta, toc,
        pages: { [PAGE_ID]: page },
        assets: { fonts: { google: ['Lato', 'Montserrat', 'Nanum Myeongjo', 'Playfair Display'] } },
    };
    const published = JSON.parse(JSON.stringify(report));
    Object.assign(published.meta, { published: true, status: 'Published' });

    const fs_ = {
        [`o/${ORG}`]: {
            slug: ORG,
            name: config.identity.org_name,
            subscription: { type: 'precision', status: 'active', product: { name: 'Precision', id: 'precision' } },
            has_product: { video: true, collect: true, signals: true },
            reports: [REPORT_ID, REPORT_ID_PUB],
            members: { [USER.uid]: { role: 'admin' } },
            constituent_merge_tag_index: ['first_name', 'last_name', 'email', 'donor_level', 'gift_amount', 'fund_reference', 'address', 'letter'],
        },
        [`u/${USER.uid}`]: {
            id: USER.uid, email: USER.email, name: USER.displayName,
            orgs: { [ORG]: { role: 'admin' } }, default_org: ORG,
            seen_product_updates: ['1234'], seen_tour: true,
        },
    };
    for (const p of people) {
        const id = constituentId(p.email);
        fs_[`o/${ORG}/constituents/${id}`] = {
            ...p,
            _SR_email: p.email,
            _SR_first_name: p.first_name.toLowerCase(),
            _SR_last_name: p.last_name.toLowerCase(),
            _SR_full_name: `${p.first_name} ${p.last_name}`.toLowerCase(),
            _SR_is_from_csv_file: true,
            _SR_sources: ['all', 'from_csv'],
        };
    }
    return {
        reportId: REPORT_ID, reportIdPub: REPORT_ID_PUB, pageId: PAGE_ID, org: ORG, slug, title, people,
        db: { rtdb: { reports: { [REPORT_ID]: report, [REPORT_ID_PUB]: published } }, fs: fs_, auth: USER },
    };
}

export const SHIM = fs.readFileSync(new URL('./fake-firebase.js', import.meta.url), 'utf8');
