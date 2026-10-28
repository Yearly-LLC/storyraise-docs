// ElevenLabs narration for the walkthrough video.
//
//   node --env-file=<path to .env with ELEVENLABS_API_KEY> video/tools/tts.mjs samples [--voices name,name]
//   node --env-file=<...> video/tools/tts.mjs generate [--only s01,s04] [--force] [--estimate]
//
// samples   Reads the same two passages in each candidate voice (voice.json) into
//           .cache/voice-samples/ so a voice can be picked by ear.
// generate  Speaks every scene of script/vo-script.json with word timing. Each take
//           is cached by a hash of what was spoken and how, so editing one scene
//           re-bills only that scene. Approved takes live in audio/vo/ (committed);
//           replaced takes move to audio/.cache/.
//
// The API key is read from the environment and never printed.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { TOOLS_DIR } from '../../scripts/lib/identity.mjs';
import { enabledScenes, parseScene, readScript } from './script.mjs';

const VIDEO = path.join(TOOLS_DIR, 'video');
const SCRIPT = readScript();
const VOICE = JSON.parse(fs.readFileSync(path.join(VIDEO, 'script', 'voice.json'), 'utf8'));
const VO_DIR = path.join(VIDEO, 'audio', 'vo');
const RETIRED_DIR = path.join(VIDEO, 'audio', '.cache');
const API = 'https://api.elevenlabs.io/v1';

const [command, ...rest] = process.argv.slice(2);
const flag = (name) => rest.includes(`--${name}`);
const option = (name) => {
    const i = rest.indexOf(`--${name}`);
    return i === -1 ? null : rest[i + 1];
};

function apiKey() {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error('ELEVENLABS_API_KEY is not set (pass --env-file).');
    return key;
}

async function post(url, body, { json = true } = {}) {
    for (let attempt = 1; ; attempt++) {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'xi-api-key': apiKey(), 'Content-Type': 'application/json', Accept: json ? 'application/json' : 'audio/mpeg' },
            body: JSON.stringify(body),
        });
        if (resp.ok) return json ? resp.json() : Buffer.from(await resp.arrayBuffer());
        const detail = (await resp.text()).slice(0, 400);
        if ((resp.status === 429 || resp.status >= 500) && attempt < 4) {
            await new Promise((r) => setTimeout(r, 1500 * attempt));
            continue;
        }
        const error = new Error(`ElevenLabs ${resp.status}: ${detail}`);
        error.status = resp.status;
        error.detail = detail;
        throw error;
    }
}

/** Call an endpoint, stepping down to a lower bitrate if the plan doesn't allow 192 kbps. */
async function speak(endpoint, voiceId, body, opts) {
    const formats = [VOICE.output_format, 'mp3_44100_128'];
    for (const format of formats) {
        try {
            return { format, result: await post(`${API}/text-to-speech/${voiceId}/${endpoint}?output_format=${format}`, body, opts) };
        } catch (err) {
            if (format !== formats.at(-1) && err.status && err.status < 500 && /output_format|format|tier|subscription/i.test(err.detail || '')) continue;
            throw err;
        }
    }
}

async function samples() {
    const only = option('voices');
    const voices = VOICE.candidates.filter((v) => !only || only.split(',').includes(v.name));
    const byId = Object.fromEntries(SCRIPT.scenes.map((s) => [s.id, parseScene(s.text).ttsText]));
    const passage = `${byId.s01} ${byId.s06}`;
    const out = path.join(TOOLS_DIR, '.cache', 'voice-samples');
    fs.mkdirSync(out, { recursive: true });
    console.log(`${voices.length} voices x ${passage.length} characters = ${voices.length * passage.length} characters`);
    for (const v of voices) {
        const { format, result } = await speak('stream', v.voice_id, {
            text: passage,
            model_id: VOICE.model_id,
            voice_settings: VOICE.voice_settings,
            seed: VOICE.seed,
        }, { json: false });
        const file = path.join(out, `${v.name}.mp3`);
        fs.writeFileSync(file, result);
        console.log(`  ${v.name} (${v.note}) -> ${file} [${format}]`);
    }
}

function takeHash(ttsText) {
    return crypto.createHash('sha256').update(JSON.stringify({
        ttsText,
        voice: VOICE.voice_id,
        model: VOICE.model_id,
        settings: VOICE.voice_settings,
        seed: VOICE.seed,
        format: VOICE.output_format,
    })).digest('hex').slice(0, 10);
}

async function generate() {
    if (!VOICE.voice_id && !flag('estimate')) throw new Error('Pick a voice first: set voice_id in script/voice.json.');
    const only = option('only') ? option('only').split(',') : null;
    const scenes = enabledScenes(SCRIPT).map((s) => ({ ...s, ...parseScene(s.text) }));
    const todo = scenes.filter((s) => !only || only.includes(s.id));

    const total = todo.reduce((n, s) => n + s.ttsText.length, 0);
    console.log(`${todo.length} scenes, ${total} characters`);
    if (flag('estimate')) return;
    for (const s of todo) {
        if (s.ttsText.length > 2000) throw new Error(`${s.id} is ${s.ttsText.length} characters; keep each scene under 2,000.`);
    }

    fs.mkdirSync(VO_DIR, { recursive: true });
    fs.mkdirSync(RETIRED_DIR, { recursive: true });
    const manifestFile = path.join(VO_DIR, 'manifest.json');
    const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};

    for (const s of todo) {
        const index = scenes.findIndex((x) => x.id === s.id);
        const hash = takeHash(s.ttsText);
        const base = `${s.id}.${hash}`;
        const mp3 = path.join(VO_DIR, `${base}.mp3`);
        if (fs.existsSync(mp3) && !flag('force')) {
            console.log(`  ${s.id}: cached (${base})`);
        } else {
            const { format, result } = await speak('with-timestamps', VOICE.voice_id, {
                text: s.ttsText,
                model_id: VOICE.model_id,
                voice_settings: VOICE.voice_settings,
                seed: VOICE.seed,
                previous_text: index > 0 ? scenes[index - 1].ttsText : undefined,
                next_text: index < scenes.length - 1 ? scenes[index + 1].ttsText : undefined,
            });
            fs.writeFileSync(mp3, Buffer.from(result.audio_base64, 'base64'));
            fs.writeFileSync(path.join(VO_DIR, `${base}.alignment.json`), JSON.stringify({
                id: s.id,
                format,
                captionText: s.captionText,
                ttsText: s.ttsText,
                cues: s.cues,
                alignment: result.alignment,
                normalized_alignment: result.normalized_alignment,
            }, null, 2));
            const ends = result.alignment.character_end_times_seconds;
            console.log(`  ${s.id}: ${ends[ends.length - 1].toFixed(2)}s (${base}) [${format}]`);
        }
        // Retire the previous take for this scene.
        const previous = manifest[s.id];
        if (previous && previous.base !== base) {
            for (const ext of ['.mp3', '.alignment.json']) {
                const old = path.join(VO_DIR, previous.base + ext);
                if (fs.existsSync(old)) fs.renameSync(old, path.join(RETIRED_DIR, previous.base + ext));
            }
        }
        manifest[s.id] = { base, mp3: `${base}.mp3`, alignment: `${base}.alignment.json` };
    }
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
}

if (command === 'samples') await samples();
else if (command === 'generate') await generate();
else if (command) throw new Error(`Unknown command "${command}". Use samples or generate.`);
