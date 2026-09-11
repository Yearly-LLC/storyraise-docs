// Freeze the demo report's analytics summary.
//
//   node scripts/fetch-fixture.mjs            rename the existing raw snapshot
//   node scripts/fetch-fixture.mjs --refresh  re-fetch the live summary first
//
// get_report_insights_summary is an unauthenticated GET, and the engagement-demo
// table holds fabricated data, so the raw snapshot is safe to commit. The renamed
// copy (insights-summary.json) is what every other script reads.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config, FIXTURES_DIR, readJson, renameDeep, writeJson } from './lib/identity.mjs';

const RAW = path.join(FIXTURES_DIR, 'insights-summary.engagement-demo.raw.json');
const OUT = path.join(FIXTURES_DIR, 'insights-summary.json');

if (process.argv.includes('--refresh')) {
    const url = new URL(config.source.summary_endpoint);
    url.searchParams.set('org_slug', config.source.org_slug);
    url.searchParams.set('report_slug', config.source.report_slug);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`summary fetch failed: HTTP ${resp.status}`);
    const body = await resp.text();
    JSON.parse(body); // fail before overwriting the snapshot if the body is not JSON
    fs.writeFileSync(RAW, body);
    console.log(`fetched ${body.length} bytes`);
}

const rawText = fs.readFileSync(RAW, 'utf8');
const summary = renameDeep(readJson(RAW));
summary.org_slug = config.identity.org_slug;
summary.report_slug = config.identity.report_slug;

writeJson(OUT, summary);
writeJson(path.join(FIXTURES_DIR, 'insights-summary.meta.json'), {
    source: `${config.source.org_slug}/${config.source.report_slug}`,
    raw_sha256: crypto.createHash('sha256').update(rawText).digest('hex'),
    raw_mtime: fs.statSync(RAW).mtime.toISOString(),
    renamed_to: `${config.identity.org_slug}/${config.identity.report_slug}`,
});

const leftovers = JSON.stringify(summary).toLowerCase().split(config.source.org_slug).length - 1;
if (leftovers) throw new Error(`${leftovers} "${config.source.org_slug}" mentions survived the rename`);
console.log(`wrote ${path.relative(process.cwd(), OUT)} (views=${summary.views}, constituents=${summary.constituent_count})`);
