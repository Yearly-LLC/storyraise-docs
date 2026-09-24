// Freeze the Donor Signals payload for wrenfield-demo.
//
//   node scripts/fetch-fixture.mjs             re-read the existing raw snapshot
//   node scripts/fetch-fixture.mjs --refresh   fetch the live scores first
//
// Unlike the analytics summary, get_donor_signals is gated: it needs a Bearer
// token from a member of the org. --refresh mints a short-lived staff token from
// the admin SDK, exchanges it, and calls the endpoint once. The token never
// touches disk.
//
// wrenfield-demo is a fabricated org (see scripts/seed-health-actions-demo.js in
// the builder repo), so the raw snapshot is safe to commit. There is no rename
// list: the org is already fictional and the webinar demos this same data, so the
// page should say what the product says.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config, FIXTURES_DIR, readJson, writeJson } from './lib/identity.mjs';

const RAW = path.join(FIXTURES_DIR, 'donor-signals.wrenfield-demo.raw.json');
const OUT = path.join(FIXTURES_DIR, 'donor-signals.json');
const API_KEY = 'AIzaSyBSlTuGsnTLGybAlg00CpeDEjQc7zE3m9U';

if (process.argv.includes('--refresh')) {
    const B = config.builder.path;
    const { createRequire } = await import('node:module');
    const require = createRequire(B + '/');
    const admin = require(B + '/functions/node_modules/firebase-admin');
    const key = ['yearly-bv3-firebase-adminsdk-qpzqa-bb6e959564.json', 'yearly-bv3-firebase-adminsdk-qpzqa-2d194b3bb6.json']
        .map((f) => path.join(B, 'functions', f)).find((p) => fs.existsSync(p));
    if (!key) throw new Error('no admin key in the builder checkout');
    admin.initializeApp({ credential: admin.credential.cert(require(key)) });

    const user = await admin.auth().getUserByEmail('vince@yearly.report');
    const custom = await admin.auth().createCustomToken(user.uid, { sr: { s: 1 } });
    const ex = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: custom, returnSecureToken: true }),
    }).then((r) => r.json());
    if (!ex.idToken) throw new Error('token exchange failed');

    const url = new URL(config.source.signals_endpoint);
    url.searchParams.set('org_slug', config.source.org_slug);
    const resp = await fetch(url, { headers: { authorization: 'Bearer ' + ex.idToken } });
    if (!resp.ok) throw new Error(`signals fetch failed: HTTP ${resp.status}`);
    const body = await resp.text();
    JSON.parse(body);
    fs.writeFileSync(RAW, body);
    console.log(`fetched ${body.length} bytes`);
    process.exit(0);
}

const rawText = fs.readFileSync(RAW, 'utf8');
const payload = readJson(RAW);

/*
    Nothing on a public page should carry an address, even a fabricated one, and
    emails hide in more places than the donor list: top10_donors and recent_gifts
    carry their own. Walk the whole payload rather than naming the fields, so a
    field added to the endpoint later cannot smuggle one through.
*/
let scrubbed = 0;
const scrub = (node) => {
    if (Array.isArray(node)) return node.forEach(scrub);
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
        if (typeof v === 'string' && v.includes('@') && /^[^@\s]+@[^@\s]+\.[a-z]+$/i.test(v)) {
            node[k] = null; scrubbed += 1;
        } else scrub(v);
    }
};
scrub(payload);

writeJson(OUT, payload);
writeJson(path.join(FIXTURES_DIR, 'donor-signals.meta.json'), {
    source: `${config.source.org_slug}/${config.source.route}`,
    raw_sha256: crypto.createHash('sha256').update(rawText).digest('hex'),
    raw_mtime: fs.statSync(RAW).mtime.toISOString(),
    computed_at: payload.computed_at,
    donors_scored: payload.donors_scored,
    segments: payload.segments,
    emails_scrubbed: scrubbed,
});
console.log(`wrote ${path.relative(process.cwd(), OUT)}: ${payload.donors_scored} scored, ` +
    `${(payload.donors || []).length} served, ${scrubbed} emails scrubbed`);
