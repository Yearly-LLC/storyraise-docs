/*
    Narration for the setup insert only.

    Lines one and three are lifted straight out of the shipped CTA take, split at the
    0.68s gap between its two sentences, so the parts Vince has already signed off sound
    exactly as they do in the live video and only the new middle is synthesised.
*/
import fs from 'node:fs';
import path from 'node:path';
import { TOOLS_DIR } from '../scripts/lib/identity.mjs';

const VOICE = JSON.parse(fs.readFileSync(path.join(TOOLS_DIR, 'video', 'script', 'voice.json'), 'utf8'));
const OUT = path.join(TOOLS_DIR, 'snippet', 'audio', 'middle.mp3');
const TEXT = process.argv[2];
if (!TEXT) throw new Error('pass the line to say as the first argument');

const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error('ELEVENLABS_API_KEY is not set (pass --env-file).');

const resp = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE.voice_id}?output_format=${VOICE.output_format}`,
    {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({
            text: TEXT,
            model_id: VOICE.model_id,
            voice_settings: VOICE.voice_settings,
            seed: VOICE.seed,
        }),
    },
);
if (!resp.ok) throw new Error(`ElevenLabs ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
fs.writeFileSync(OUT, Buffer.from(await resp.arrayBuffer()));
console.log(`${TEXT.length} characters -> ${OUT}`);
