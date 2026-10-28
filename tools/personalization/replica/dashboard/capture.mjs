// Render the real Constituents screens locally against the fabricated fixture and save
// everything the static dashboard screens are built from.
//
//   node replica/dashboard/capture.mjs
//
// States: list, add-csv (the "Add constituents" card on the CSV File tab), map (the
// "Map your columns" dialog for fixtures/harbor-lights-constituents.csv), and profile
// (Emily Wilson's drawer). Each state is the product's own Vue render, pruned to the
// screen's core and saved as a fragment. Tour anchors are placed on the live DOM so the
// capture can record each one's box for the parity check. Output: .cache/replica/dashboard/.
import fs from 'node:fs';
import path from 'node:path';
import { config, FIXTURES_DIR, TOOLS_DIR, writeJson } from '../../scripts/lib/identity.mjs';
import { openDashboard } from './lib.mjs';

const OUT = path.join(TOOLS_DIR, '.cache', 'replica', 'dashboard');
const SHOTS = path.join(OUT, 'app-shots');
fs.mkdirSync(SHOTS, { recursive: true });
const csv = fs.readFileSync(path.join(FIXTURES_DIR, 'harbor-lights-constituents.csv'), 'utf8');

const { server, browser, page, consoleErrors, blocked } = await openDashboard();
const capturedAt = new Date().toISOString();

// No sidebar in the replica (hidden, and builder-style.css's 16rem offset for it undone).
// Apply the same layout to the live page so the parity shots compare like with like.
await page.evaluate(() => {
    const main = document.querySelector('#dashboard [data-dashboard-main]');
    main.classList.remove('md:pl-64');
    Array.from(main.parentElement.children).forEach((el) => { if (el !== main) el.setAttribute('data-sr-hidden', ''); });
    const style = document.createElement('style');
    style.textContent = '[data-sr-hidden]{display:none!important}#dashboard [data-dashboard-main]{left:0!important;width:100%!important}';
    document.head.appendChild(style);
});

// Each state: how to reach it from the list, which tour anchors it carries, and which
// nodes of #dashboard survive the prune.
const STATES = {
    list: {
        enter: () => {},
        anchors: ['add', 'rows'],
    },
    'add-csv': {
        enter: async () => {
            await page.evaluate(() => {
                const vm = document.querySelector('#dashboard').__vue__;
                vm.env.sync_constituents_tab = 'csv';
                document.getElementById('connect_constituents').focus();
            });
        },
        anchors: ['add', 'csv', 'upload', 'rows'],
    },
    map: {
        enter: async () => {
            await page.evaluate((csv) => {
                const vm = document.querySelector('#dashboard').__vue__;
                const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
                vm.open_import_mapping('csv', parsed.meta.fields, parsed.data);
            }, csv);
        },
        anchors: ['add', 'rows', 'map-core', 'map-custom', 'import'],
        modal: 'import-mapping-modal',
    },
    profile: {
        enter: async () => {
            await page.evaluate(() => {
                const vm = document.querySelector('#dashboard').__vue__;
                vm.get_constituent_details(vm.constituents.find((c) => c.first_name === 'Emily'));
            });
        },
        anchors: ['profile-head', 'variables', 'tag-donor-level', 'add-variable'],
    },
};

const RESET = () => {
    const vm = document.querySelector('#dashboard').__vue__;
    if (document.activeElement) document.activeElement.blur();
    vm.env.is_import_mapping_modal_visible = false;
    vm.env.is_constituents_drawer_visible = false;
    // false, as the product initialises them: null breaks the drawer's render function.
    vm.current_constituent = false;
    vm.current_constituent_id = false;
};

// Runs in the page: put data-tour on each anchor of the current state, throw on a miss.
const PLACE_ANCHORS = (ids) => {
    const d = document.querySelector('#dashboard');
    const fail = (m) => { throw new Error(m); };
    const byText = (sel, re, scope = d) => Array.from(scope.querySelectorAll(sel)).find((el) => re.test(el.textContent.trim()));
    const find = {
        add: () => document.getElementById('connect_constituents'),
        rows: () => d.querySelector('ul[data-constituents]'),
        csv: () => byText('.dropdown-content li', /^Ensure that the columns for 'First Name', 'Last Name', and 'Email'/),
        upload: () => byText('.dropdown-content button', /^upload\s+Upload CSV$/),
        'map-core': () => {
            const box = document.querySelector('#import-mapping-modal + .modal .modal-box');
            const email = box && byText('label', /^Email \*$/, box);
            // The row that holds the Email / First name / Last name selects.
            let el = email;
            while (el && el.querySelectorAll('select').length < 3) el = el.parentElement;
            return el;
        },
        'map-custom': () => byText('#import-mapping-modal + .modal p', /every other column is imported as a\s+custom field/),
        import: () => byText('#import-mapping-modal + .modal button', /^Import constituents$/),
        'profile-head': () => d.querySelector('[data-detail-view] header'),
        // The variable rows; the Variable / Value header row above them rides along.
        variables: () => {
            const rows = d.querySelector('[data-detail-view] [data-details]');
            if (rows && rows.previousElementSibling) rows.previousElementSibling.setAttribute('data-tour-also', 'variables');
            return rows;
        },
        'tag-donor-level': () => {
            const tag = byText('[data-detail-view] [data-details] > div > div > span', /^@@donor_level@@$/);
            return tag && tag.closest('[data-details] > div');
        },
        'add-variable': () => d.querySelector('[data-detail-view] [data-add-field]'),
    };
    document.querySelectorAll('[data-tour]').forEach((el) => el.removeAttribute('data-tour'));
    document.querySelectorAll('[data-tour-also]').forEach((el) => el.removeAttribute('data-tour-also'));
    const rects = {};
    for (const id of ids) {
        const el = (find[id] || fail(`no finder for ${id}`))() || fail(`tour anchor ${id} not found`);
        el.setAttribute('data-tour', id);
        const r = el.getBoundingClientRect();
        rects[id] = { x: r.x, y: r.y, width: r.width, height: r.height };
    }
    return rects;
};

// outerHTML carries attributes, not live state.
const FREEZE_FORM_STATE = () => {
    document.querySelectorAll('input[type=checkbox], input[type=radio]').forEach((el) => {
        if (el.checked) el.setAttribute('checked', ''); else el.removeAttribute('checked');
    });
    document.querySelectorAll('select').forEach((sel) => {
        Array.from(sel.options).forEach((o) => { if (o.selected) o.setAttribute('selected', ''); else o.removeAttribute('selected'); });
    });
    document.querySelectorAll('input[type=text], input:not([type]), input[type=search], textarea').forEach((el) => {
        if (el.tagName === 'TEXTAREA') el.textContent = el.value; else el.setAttribute('value', el.value);
    });
};

// Runs in the page: clone #dashboard, keep the header, the intro line and the list (plus
// the state's dialog), drop everything else.
const CLONE_CORE = ({ modal, focused }) => {
    const live = document.querySelector('#dashboard');
    const clone = live.cloneNode(true);
    const fail = (m) => { throw new Error(m); };
    const header = clone.querySelector('[data-dashboard-header]') || fail('header');
    const con = clone.querySelector('[data-constituents-con]') || fail('constituents panel');
    const intro = con.parentElement.firstElementChild;
    if (!/Keep your donors and supporters organized/.test(intro.textContent)) fail('intro line moved');
    const keep = [header, intro, con];
    if (modal) {
        const toggle = clone.querySelector(`#${modal}`) || fail(`modal ${modal}`);
        keep.push(toggle, toggle.nextElementSibling);
    }
    const isKept = (el) => keep.some((k) => k === el || k.contains(el) || el.contains(k));
    for (const el of Array.from(clone.querySelectorAll('*'))) {
        if (clone.contains(el) && !isKept(el)) el.remove();
    }
    clone.querySelectorAll('[data-sr-hidden]').forEach((el) => el.removeAttribute('data-sr-hidden'));
    // The add card is a daisyUI focus dropdown; a static page holds it open by class.
    if (focused) clone.querySelector('#connect_constituents').closest('.dropdown').classList.add('dropdown-open');
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
    const comments = [];
    while (walker.nextNode()) comments.push(walker.currentNode);
    comments.forEach((c) => c.remove());
    clone.querySelectorAll('script').forEach((s) => s.remove());
    const symbols = new Set();
    const icons = new Set();
    clone.querySelectorAll('.material-symbols-outlined').forEach((el) => symbols.add(el.textContent.trim()));
    clone.querySelectorAll('.material-icons').forEach((el) => icons.add(el.textContent.trim()));
    const images = new Set();
    clone.querySelectorAll('img[src]').forEach((img) => images.add(img.getAttribute('src')));
    return { html: clone.outerHTML, symbols: [...symbols], icons: [...icons], images: [...images] };
};

// Runs in the page: every rendered text run in the screen's core, for the parity check.
const VISIBLE_TEXT = () => {
    const d = document.querySelector('#dashboard');
    const out = [];
    const walker = document.createTreeWalker(d, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
        const t = walker.currentNode.textContent.replace(/\s+/g, ' ').trim();
        if (!t) continue;
        const el = walker.currentNode.parentElement;
        if (el.closest('[data-sr-hidden]')) continue;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (!r.width || !r.height || cs.visibility === 'hidden') continue;
        if (r.bottom < 0 || r.top > innerHeight) continue;
        out.push(t);
    }
    return out;
};

const states = {};
for (const [name, s] of Object.entries(STATES)) {
    await page.evaluate(RESET);
    await page.waitForTimeout(300);
    await s.enter();
    await page.waitForTimeout(700);
    await page.evaluate(() => document.fonts.ready);
    const rects = await page.evaluate(PLACE_ANCHORS, s.anchors);
    await page.evaluate(FREEZE_FORM_STATE);
    await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
    const text = await page.evaluate(VISIBLE_TEXT);
    const core = await page.evaluate(CLONE_CORE, { modal: s.modal || null, focused: name === 'add-csv' });
    states[name] = { ...core, rects, text, modal: s.modal || null };
    console.log(`${name}: ${(core.html.length / 1024).toFixed(0)} KB, anchors ${Object.keys(rects).join(' ')}`);
}

const meta = await page.evaluate(() => {
    const attrs = (el) => Object.fromEntries(Array.from(el.attributes).map((a) => [a.name, a.value]));
    const fonts = new Set();
    document.querySelectorAll('#dashboard [data-dashboard-main] *, #import-mapping-modal + .modal *').forEach((el) => {
        const cs = getComputedStyle(el);
        fonts.add(`${cs.fontFamily} | ${cs.fontWeight}`);
    });
    return {
        htmlAttrs: attrs(document.documentElement),
        bodyAttrs: attrs(document.body),
        fonts: [...fonts].sort(),
        stylesheets: Array.from(document.styleSheets).map((s) => ({
            href: s.href,
            inline: s.href ? null : (s.ownerNode && s.ownerNode.textContent) || '',
        })),
    };
});

writeJson(path.join(OUT, 'capture.json'), {
    capturedAt,
    builderSha: config.builder.sha,
    viewport: config.capture.viewport,
    consoleErrors,
    blockedRequests: blocked.length,
    states,
    ...meta,
});
console.log(`fonts: ${meta.fonts.length}, console errors during capture: ${consoleErrors.length}, blocked requests: ${blocked.length}`);
await browser.close();
await server.close();
