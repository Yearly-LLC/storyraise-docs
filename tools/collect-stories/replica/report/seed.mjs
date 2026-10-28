// The in-memory database the report screens are captured against (fake-firebase.js).
//
// Built from the frozen fixtures only: fixtures/report-stories.json (the demo report's
// Stories page), .cache/replica/report/page-source.json (the same page's project_data,
// from the one read-only copy taken at kickoff), fixtures/collect.json (the Scholarship
// Stories and Scholarship Funds collections), and fixtures/constituents.json.
// Nothing here reads production.
import fs from 'node:fs';
import path from 'node:path';
import { config, FIXTURES_DIR, TOOLS_DIR, readJson, renameString } from '../../scripts/lib/identity.mjs';

export const REPORT_ID = '-HLIMPACT2026stories';
// The `all` preview state: the same page with the Repeat When filter dropped (see buildSeed).
export const REPORT_ID_ALL = '-HLIMPACT2026storiesAll';
export const PAGE_ID = config.source.page_id;
export const ORG = config.identity.org_slug;
export const USER = { uid: 'demo-admin-harbor', email: 'alex.morgan@harborlights.example', displayName: 'Alex Morgan' };
export const CACHE = path.join(TOOLS_DIR, '.cache', 'replica', 'report');
// Fictional ids in place of o/demo's collection ids (the builder prints the id).
export const COLLECTIONS = { stories: '-HLScholarshipStories', funds: '-HLScholarshipFunds' };

export const rename = renameString;

// Same hash as report.js / app-dashboard.js string_to_hash.
export function stringToHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h &= h; }
    return h;
}
export const constituentId = (email) => 'C' + stringToHash(email.toLowerCase());

const swapIds = (s) => s
    .split(config.source.collections.stories).join(COLLECTIONS.stories)
    .split(config.source.collections.funds).join(COLLECTIONS.funds);

// With no recipient, @@fund_reference@@ stays a token and report.js removes the whole
// fund section (data-empty-mode defaults to "remove"). For the unfiltered view the
// stories repeater is lifted out of the per-fund wrapper and matches every row:
// fund_id "contains" "F" is true of all five (the reader removes a repeater whose
// value is blank, so there is no way to say "no filter" in markup).
export function unfilteredHtml(html) {
    const start = html.indexOf('<section data-component="repeater"');
    const inner = html.indexOf('<section data-component="repeater"', start + 10);
    if (start === -1 || inner === -1) throw new Error('stories page: two repeaters expected');
    const depthEnd = (from) => {
        let depth = 0; const re = /<(\/?)section\b[^>]*>/g; re.lastIndex = from;
        for (let m; (m = re.exec(html));) { depth += m[1] ? -1 : 1; if (depth === 0) return m.index + m[0].length; }
        throw new Error('unbalanced section');
    };
    const innerEnd = depthEnd(inner);
    const outerEnd = depthEnd(start);
    const stories = html.slice(inner, innerEnd)
        .replace('data-collection-value="@@fund_reference@@"', 'data-collection-condition="contains" data-collection-value="F"');
    return html.slice(0, start) + stories + html.slice(outerEnd);
}

// The story card ends at @@student_note@@: the source page followed it with two Lorem
// ipsum paragraphs (removed from report-stories.json; trimmed here from project_data).
function endCardAtNote(projectData) {
    const data = JSON.parse(projectData);
    let trimmed = 0;
    const walk = (node) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node.components)) {
            const i = node.components.findIndex((c) => c && c.type === 'textnode' && c.content === '@@student_note@@');
            if (i !== -1) { trimmed += node.components.length - i - 1; node.components = node.components.slice(0, i + 1); }
            node.components.forEach(walk);
        }
        Object.values(node).forEach((v) => { if (v && typeof v === 'object' && v !== node.components) walk(v); });
    };
    walk(data);
    if (!trimmed && projectData.includes('Lorem ipsum')) throw new Error('project_data: could not find the card text after @@student_note@@');
    return JSON.stringify(data);
}

export function buildSeed() {
    const page = readJson(path.join(FIXTURES_DIR, 'report-stories.json'));
    const source = readJson(path.join(CACHE, 'page-source.json'));
    const people = readJson(path.join(FIXTURES_DIR, 'constituents.json')).constituents;
    const collect = readJson(path.join(FIXTURES_DIR, 'collect.json'));
    const title = config.identity.report_title;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!page.content.html.includes(config.source.collections.stories) || !page.content.html.includes(config.source.collections.funds)) {
        throw new Error('report-stories.json no longer points at the source collection ids in config.json');
    }

    const html = swapIds(rename(page.content.html));
    const projectData = endCardAtNote(swapIds(rename(source.project_data)));
    if (page.content.html.includes('Lorem ipsum') || projectData.includes('Lorem ipsum')) throw new Error('story card still has placeholder text');
    const report = (pageHtml) => ({
        meta: { ...source.meta, title, slug, description: `${title} from ${config.identity.org_name}.`, status: 'Draft', published: false },
        toc: {
            [PAGE_ID]: { id: PAGE_ID, order: 0, title: page.title.extended || 'Stories', image: source.toc_image || '', image_auto_update: true, meta: { title }, current_viewer: { id: USER.uid, name: USER.displayName }, here: {} },
        },
        pages: { [PAGE_ID]: { id: PAGE_ID, title: page.title, content: { html: pageHtml, css: rename(page.content.css) }, project_data: projectData } },
        assets: { fonts: { google: ['Lato', 'Playfair Display'] } },
    });
    const rows = (list) => Object.fromEntries(list.map(({ _key, ...row }) => [_key, row]));
    const collections = {
        [COLLECTIONS.stories]: { project_data: { title: collect.collection_title }, org: ORG, responses: rows(collect.stories) },
        [COLLECTIONS.funds]: { project_data: { title: collect.funds_title }, org: ORG, responses: rows(collect.funds) },
    };

    const fs_ = {
        [`o/${ORG}`]: {
            slug: ORG,
            name: config.identity.org_name,
            subscription: { type: 'precision', status: 'active', product: { name: 'Precision', id: 'precision' } },
            has_product: { video: true, collect: true, signals: true },
            reports: [REPORT_ID],
            collections: [COLLECTIONS.stories, COLLECTIONS.funds],
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
        fs_[`o/${ORG}/constituents/${constituentId(p.email)}`] = {
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
        reportId: REPORT_ID, reportIdAll: REPORT_ID_ALL, pageId: PAGE_ID, org: ORG, slug, title, people, collect,
        db: {
            rtdb: { reports: { [REPORT_ID]: report(html), [REPORT_ID_ALL]: report(unfilteredHtml(html)) }, collections },
            fs: fs_, auth: USER,
        },
    };
}

export const SHIM = fs.readFileSync(new URL('./fake-firebase.js', import.meta.url), 'utf8');
