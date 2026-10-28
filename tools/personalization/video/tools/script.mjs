// Shared parsing for the narration script (video/script/vo-script.json).
import fs from 'node:fs';
import path from 'node:path';
import { TOOLS_DIR } from '../../scripts/lib/identity.mjs';

export const SCRIPT_FILE = path.join(TOOLS_DIR, 'video', 'script', 'vo-script.json');
export const CUE = /\[\[cue:([a-z0-9-]+)\]\]/g;

export function readScript() {
    return JSON.parse(fs.readFileSync(SCRIPT_FILE, 'utf8'));
}

/**
 * Scenes in the current cut. A scene marked "enabled": false stays in the script,
 * with its narration take still cached, but every build step skips it.
 */
export function enabledScenes(script = readScript()) {
    return script.scenes.filter((scene) => scene.enabled !== false);
}

/**
 * Split a scene's text into what viewers read (captionText), what the voice says
 * (ttsText, with respellings applied), and where each cue falls in ttsText.
 * Respellings must keep the word count so captions can be timed word for word.
 */
export function parseScene(text, respell = readScript().respell || {}) {
    const say = (segment) => Object.entries(respell).reduce(
        (s, [word, spoken]) => s.replace(new RegExp(`\\b${word}\\b`, 'g'), spoken), segment);
    let captionText = '';
    let ttsText = '';
    const cues = [];
    let last = 0;
    for (const match of text.matchAll(CUE)) {
        const segment = text.slice(last, match.index);
        captionText += segment;
        ttsText += say(segment);
        cues.push({ name: match[1], char: ttsText.length });
        last = match.index + match[0].length;
    }
    captionText += text.slice(last);
    ttsText += say(text.slice(last));
    return { captionText: captionText.trim(), ttsText: ttsText.trimEnd(), cues };
}
