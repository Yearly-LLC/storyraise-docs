// The in-memory database the Collect app screens are captured against.
//
// Built only from tools/collect-stories/fixtures/{collect.json, constituents.json}.
// Nothing here reads production.
import fs from 'node:fs';
import path from 'node:path';
import { config, FIXTURES_DIR, readJson } from '../../scripts/lib/identity.mjs';

export const ORG = config.identity.org_slug;
export const STORIES_ID = '-HLSTORIES2026demo';
export const FUNDS_ID = '-HLFUNDS2026demo';
export const NEW_ID = '-HLNEWCOLL2026demo';
export const USER = { uid: 'demo-admin-harbor', email: 'alex.morgan@harborlights.example', displayName: 'Alex Morgan' };
// Media the app would hold in Storage: a fictional host the harness answers locally and
// build-collect.mjs rewrites to demo/img/.
export const ASSET = 'https://files.harborlights.example/';

export function stringToHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h &= h; }
    return h;
}
export const constituentId = (email) => 'C' + stringToHash(email.toLowerCase());
export const photoFor = (name) => `${ASSET}stories/${name.split(' ')[0].toLowerCase()}.jpg`;

const field = (f) => ({
    classes: '', focused: false, value: '', errorMessage: 'Missing info',
    description: '', placeholder: '', required: false, ...f,
});

export function buildSeed() {
    const fx = readJson(path.join(FIXTURES_DIR, 'collect.json'));
    const people = readJson(path.join(FIXTURES_DIR, 'constituents.json')).constituents;

    /*
        The fixture's fund field is a dropdown of "F002 STEM Research Endowment" labels,
        but a dropdown stores the label it shows, and the stories (and the report's
        Repeat When) hold the bare code. A short-text "fund code" field keeps the data the
        repeater matches on identical to what the form collects.
    */
    const fields = fx.form.fields.map((f) => {
        if (f.name === 'fund_id') {
            return field({ element: 'input', type: 'text', name: 'fund_id', label: 'Your scholarship fund code', placeholder: 'F004', description: 'It is printed on your award letter.', required: true });
        }
        if (f.type === 'file') return field({ element: 'input', type: 'file', name: f.name, label: f.label, accept: 'image/*', description: 'A clear photo of your face works best.' });
        if (f.element === 'textarea') return field({ element: 'textarea', type: 'textarea', name: f.name, label: f.label, placeholder: f.placeholder || '', required: !!f.required, description: f.name === 'student_note' ? 'A few sentences, in your own words.' : 'Your class, your major, and what you are working toward.' });
        return field({ element: 'input', type: f.type, name: f.name, label: f.label, placeholder: f.placeholder || '', required: !!f.required });
    });

    const submittedAt = (i) => new Date(Date.UTC(2026, 9, 6 + i * 3, 15, 20)).toISOString();
    const responses = {};
    fx.stories.forEach((s, i) => {
        // hobbies_interests is not on the form (the editor would offer to add it), and
        // constituents comes first because that is how tagged rows open in the drawer.
        const { _key, hobbies_interests, ...row } = s;
        // Key order is the grid's column order: the fund first, then who and what.
        const { fund_id, student_name, major, class_year, ...rest } = row;
        responses[_key] = { constituents: [], fund_id, student_name, major, class_year: String(class_year), ...rest, student_photo: photoFor(row.student_name), submitted: submittedAt(i) };
    });
    const funds = {};
    fx.funds.forEach((f) => { const { _key, ...row } = f; funds[_key] = row; });

    const page = (content) => ({
        logo: { size: 'm', position: 'left', src: `${ASSET}brand/harbor-lights-logo.svg` },
        content,
        styles: { background_color: '#024a5c', background_color_2: '#ffffff', heading_color: '#024a5c', body_color: '#1d1a24', font_stack: 'a', button_label_color: '#ffffff', button_background_color: '#024a5c' },
    });
    const base = {
        content: '', current_animation: false,
        recording: { thumbnail: false, source: false, video: false, details: false, teleprompter: '' },
        contacts: { is_all_checked: true },
        attachments: [{ title: '', url: '', styles: { background_color: '#ffffff', foreground_color: '#000000' } }],
        slides: [],
    };
    const stories = {
        ...base,
        id: STORIES_ID,
        title: fx.collection_title,
        type: { slug: 'thank_you_beneficiaries', icon: 'person_celebrate', label: 'Thank-yous from beneficiaries', is_disabled: false },
        page: page(`<h2>${fx.form.title}</h2><p>${fx.form.description}</p>`),
        project_data: { title: fx.collection_title, description: fx.form.description, type: 'doc', source: { json: fields, grouping: { enabled: false, allow_jumping: false } } },
        responses,
    };
    const fundsColl = {
        ...base,
        id: FUNDS_ID,
        title: fx.funds_title,
        type: { slug: 'import', icon: 'upload_file', label: 'I want to upload information', is_disabled: false },
        page: page(`<h2>${fx.funds_title}</h2><p>Fund balances for the 2026 report.</p>`),
        project_data: { title: fx.funds_title, description: 'Fund balances for the 2026 report.', type: 'doc', source: { json: [] } },
        responses: funds,
    };

    // A collection the moment after Start new collection: no type yet, so the editor
    // opens on "What do you want to collect?".
    const fresh = {
        ...base,
        id: NEW_ID,
        title: 'Untitled Collection',
        type: null,
        page: page('<h2>Enter a title</h2><p>Add a description for this form here.</p>'),
        project_data: { title: 'Untitled Collection', description: 'Add a description for this form here.', type: 'doc', source: { json: {} } },
    };

    const fs_ = {
        [`o/${ORG}`]: {
            slug: ORG,
            name: config.identity.org_name,
            subscription: { type: 'precision', status: 'active', product: { name: 'Precision', id: 'precision' } },
            has_product: { video: true, collect: true, signals: true },
            collections: [STORIES_ID, FUNDS_ID],
            reports: [],
            members: { [USER.uid]: { role: 'admin' } },
            storage_bucket: 'harbor-lights',
            brandkit: { colors: ['#024a5c', '#e18484', '#fff6e3', '#1d1a24'] },
        },
        [`u/${USER.uid}`]: {
            id: USER.uid, email: USER.email, name: USER.displayName,
            orgs: { [ORG]: { role: 'admin' } }, default_org: ORG,
            seen_product_updates: ['1234'], seen_tour: true,
        },
    };
    for (const p of people) {
        fs_[`o/${ORG}/constituents/${constituentId(p.email)}`] = {
            ...p, _SR_email: p.email, _SR_first_name: p.first_name.toLowerCase(), _SR_last_name: p.last_name.toLowerCase(),
            _SR_full_name: `${p.first_name} ${p.last_name}`.toLowerCase(), _SR_is_from_csv_file: true, _SR_sources: ['all', 'from_csv'],
        };
    }
    return {
        org: ORG, storiesId: STORIES_ID, fundsId: FUNDS_ID, fields, people, stories: fx.stories,
        newId: NEW_ID,
        db: { rtdb: { collections: { [STORIES_ID]: stories, [FUNDS_ID]: fundsColl, [NEW_ID]: fresh } }, fs: fs_, auth: USER },
    };
}

const here = path.dirname(new URL(import.meta.url).pathname);
export const SHIM = fs.readFileSync(path.join(here, 'fake-firebase.js'), 'utf8');
export const MODULAR = fs.readFileSync(path.join(here, 'fake-modular.js'), 'utf8');
export const LOGO = fs.readFileSync(path.join(here, 'col-harbor-logo.svg'));
