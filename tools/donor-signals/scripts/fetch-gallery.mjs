// Freeze the global template gallery index.
//
// The action cards show real published template covers. The dashboard reads that
// index straight from RTDB as the signed-in user, which a capture (which runs
// signed out, with the auth redirect disabled) cannot do. So freeze it here and
// inject it as Vue state at capture time, the same way the org and reports are.
import path from 'node:path';
import { createRequire } from 'node:module';
import { config, FIXTURES_DIR, writeJson } from './lib/identity.mjs';

const B = config.builder.path;
const require = createRequire(B + '/');
const admin = require(B + '/functions/node_modules/firebase-admin');
const fsmod = await import('node:fs');
const key = ['yearly-bv3-firebase-adminsdk-qpzqa-bb6e959564.json', 'yearly-bv3-firebase-adminsdk-qpzqa-2d194b3bb6.json']
    .map((f) => path.join(B, 'functions', f)).find((p) => fsmod.existsSync(p));
admin.initializeApp({ credential: admin.credential.cert(require(key)), databaseURL: 'https://yearly-bv3-default-rtdb.firebaseio.com' });

const BUCKET = 'Qv5LVkDakgLMEIxCotpz'; // GLOBAL_TEMPLATE_BUCKET, public/js/template-gallery-data.js
const index = (await admin.database().ref('templates_index/' + BUCKET).once('value')).val() || {};
writeJson(path.join(FIXTURES_DIR, 'templates-index.json'), { bucket: BUCKET, index });
const withCovers = Object.values(index).filter((e) => e && e.cover).length;
console.log(`wrote templates-index.json: ${Object.keys(index).length} templates, ${withCovers} with covers`);
process.exit(0);
