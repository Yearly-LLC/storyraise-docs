// Shared paths, config, and the demo-identity rename.
//
// The replica shows a fictional organization. Every string that leaves the
// source org's data (link URLs, report title, narrative text) passes through
// renameDeep so nothing on the public page names the real demo org.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TOOLS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DOCS_ROOT = path.resolve(TOOLS_DIR, '../..');
export const FIXTURES_DIR = path.join(TOOLS_DIR, 'fixtures');
export const SITE_DIR = path.join(DOCS_ROOT, 'storyraise-analytics');

export const config = JSON.parse(fs.readFileSync(path.join(TOOLS_DIR, 'config.json'), 'utf8'));

/** Apply the config rename pairs, in order, to one string. */
export function renameString(value) {
    return config.rename.reduce((s, pair) => s.split(pair.from).join(pair.to), value);
}

/** Return a deep copy of any JSON value with every string renamed. */
export function renameDeep(value) {
    if (typeof value === 'string') return renameString(value);
    if (Array.isArray(value)) return value.map(renameDeep);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, renameDeep(v)]));
    }
    return value;
}

export function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeJson(file, data) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}
