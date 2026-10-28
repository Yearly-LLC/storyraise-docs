// The in-memory database the Send screens are captured against (fake-firebase.js).
//
// Built from the frozen fixtures only: fixtures/constituents.json (the six Harbor Lights
// donors), the report's meta from .cache/replica/report/page-source.json (title, slug,
// cover), and a saved list holding all six. Nothing here reads production.
import fs from 'node:fs';
import path from 'node:path';
import { config, FIXTURES_DIR, TOOLS_DIR, readJson } from '../../scripts/lib/identity.mjs';

export const REPORT_ID = '-HLIMPACT2026demo';
export const ORG = config.identity.org_slug;
export const LIST_ID = 'impact-2026-donors';
export const LIST_NAME = '2026 Impact Report donors';
export const USER = { uid: 'demo-admin-harbor', email: 'alex.morgan@harborlights.example', displayName: 'Alex Morgan' };
export const FROM = { name: config.identity.org_name, email: 'hello@harborlights.example', domain: 'harborlights.example' };
export const CACHE = path.join(TOOLS_DIR, '.cache', 'replica', 'send');

// Same hash as report-builder's string_to_hash (and Send's OrgConfigService port).
export function stringToHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h &= h; }
    return h;
}
export const constituentId = (email) => 'C' + stringToHash(email.toLowerCase());

export function buildSeed() {
    const people = readJson(path.join(FIXTURES_DIR, 'constituents.json')).constituents;
    const source = readJson(path.join(TOOLS_DIR, '.cache', 'replica', 'report', 'page-source.json'));
    const title = config.identity.report_title;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const report = {
        meta: { title, slug, cover: source.meta.cover, published: true, status: 'Published' },
        toc: { intro: { id: 'intro', order: 0, title: 'Intro', image: source.toc_image } },
        pages: { intro: { id: 'intro', title: 'Intro' } },
    };
    const constituents = people.map((p) => ({
        id: constituentId(p.email),
        ...p,
        _SR_email: p.email,
        _SR_first_name: p.first_name.toLowerCase(),
        _SR_last_name: p.last_name.toLowerCase(),
        _SR_full_name: `${p.first_name} ${p.last_name}`.toLowerCase(),
        _SR_is_from_csv_file: true,
        _SR_sources: ['all', 'from_csv'],
        _SR_lists: [LIST_ID],
    }));
    const fs_ = {
        [`o/${ORG}`]: {
            slug: ORG,
            name: config.identity.org_name,
            subscription: { type: 'precision', status: 'active' },
            has_product: { video: true, collect: true, signals: true },
            reports: [REPORT_ID],
            members: { [USER.uid]: { role: 'admin' } },
            mailingAddress: '100 Harbor Way, Laketown, CA 22501',
            constituent_merge_tag_index: ['first_name', 'last_name', 'email', 'donor_level', 'gift_amount', 'fund_reference', 'address'],
        },
        [`o/${ORG}/lists/${LIST_ID}`]: { name: LIST_NAME, color: '#803BB1', source: 'user', count: 0 },
        [`u/${USER.uid}`]: {
            id: USER.uid, email: USER.email, name: USER.displayName,
            orgs: { [ORG]: { role: 'admin' } }, default_org: ORG,
        },
    };
    for (const c of constituents) {
        const { id, ...doc } = c;
        fs_[`o/${ORG}/constituents/${id}`] = doc;
    }
    return {
        reportId: REPORT_ID, org: ORG, slug, title, people, constituents,
        db: { rtdb: { reports: { [REPORT_ID]: report } }, fs: fs_, auth: USER },
    };
}

export const SHIM = fs.readFileSync(new URL('./fake-firebase.js', import.meta.url), 'utf8');
