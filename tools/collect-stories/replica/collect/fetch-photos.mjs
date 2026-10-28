// Download the five student photos the fixture names (Unsplash) into the capture cache,
// cropped square at 900px. The harness serves them as files.harborlights.example, so the
// capture never needs the network for media.
//
//   node replica/collect/fetch-photos.mjs
import fs from 'node:fs';
import path from 'node:path';
import { FIXTURES_DIR, readJson } from '../../scripts/lib/identity.mjs';
import { CACHE } from './harness.mjs';

const dir = path.join(CACHE, 'img');
fs.mkdirSync(dir, { recursive: true });
for (const s of readJson(path.join(FIXTURES_DIR, 'collect.json')).stories) {
    const slug = s.student_name.split(' ')[0].toLowerCase();
    const url = `${s.student_photo.split('?')[0]}?w=900&h=900&fit=crop&crop=faces&q=80&fm=jpg`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`${resp.status} ${url}`);
    fs.writeFileSync(path.join(dir, `col-${slug}.jpg`), Buffer.from(await resp.arrayBuffer()));
    console.log(`col-${slug}.jpg`);
}
