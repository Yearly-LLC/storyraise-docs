// The narration's effect chain, defined once.
//
// build-compositions.mjs writes VOICE_CHAIN onto the "voiceover" bus, where HyperFrames
// renders it. mix-music.mjs measures the voice through voiceChainFfmpeg(), an ffmpeg
// equivalent of the same nodes, so the music level is set against the voice as it will
// actually sound rather than the raw take.
//
// Measured on the takes: the pauses hold room tone around -43 dB peaking near 100 Hz, and
// the speech carries about 10 dB more at 100-400 Hz than at 1 kHz. So: cut rumble and mud,
// even the level, add presence, cap the peaks (hyperframes-audio skill, voice-clean order).

export const VOICE_CHAIN = {
    version: 1,
    nodes: [
        { type: 'highpass', id: 'v1', label: 'Remove Rumble', params: { frequency: 90, q: 0.707, poles: '2' } },
        { type: 'peaking', id: 'v2', label: 'Reduce Mud', params: { frequency: 250, gain: -3, q: 1.2 } },
        // Bypassed, not deleted: at a -38 dB threshold it closed on 18% of speech (soft
        // syllables, word endings), which sounds choppy. The constant music bed now covers
        // the room tone in the pauses, so the gate isn't needed.
        { type: 'gate', id: 'v3', label: 'Close the Pauses', enabled: false, params: { threshold: -38, range: -18, ratio: 10, attack: 1, release: 150, knee: 2.83 } },
        // Gentle on purpose: 3:1 at -34 dB turned the voice down and left the quiet room
        // tone alone, narrowing the gap between them by 4-6 dB. 2:1 at -28 evens the loud
        // syllables without that. (The takes are noise-reduced first by clean-voice.mjs.)
        { type: 'compressor', id: 'v4', label: 'Even Out Loudness', params: { threshold: -28, ratio: 2, attack: 15, release: 200, knee: 2.83, makeup: 0, mix: 1 } },
        { type: 'peaking', id: 'v5', label: 'Add Clarity', params: { frequency: 3000, gain: 2.5, q: 1 } },
        { type: 'limiter', id: 'v6', label: 'Peak Ceiling', params: { limit: -1, attack: 5, release: 50, level_out: 0 } },
    ],
};

const dbToLinear = (db) => Math.round(10 ** (db / 20) * 10000) / 10000;

/** ffmpeg filter string equivalent to the enabled nodes of a chain (approximate, for measuring). */
export function voiceChainFfmpeg(chain = VOICE_CHAIN) {
    return chain.nodes.filter((node) => node.enabled !== false).map((node) => {
        const p = node.params;
        switch (node.type) {
            case 'highpass': return `highpass=f=${p.frequency}:poles=${p.poles || 2}`;
            case 'peaking': return `equalizer=f=${p.frequency}:t=q:w=${p.q}:g=${p.gain}`;
            case 'gate': return `agate=threshold=${dbToLinear(p.threshold)}:range=${dbToLinear(p.range)}:ratio=${p.ratio}:attack=${p.attack}:release=${p.release}`;
            case 'compressor': return `acompressor=threshold=${dbToLinear(p.threshold)}:ratio=${p.ratio}:attack=${p.attack}:release=${p.release}:makeup=${dbToLinear(p.makeup || 0)}`;
            case 'limiter': return `alimiter=limit=${dbToLinear(p.limit)}`;
            default: throw new Error(`No ffmpeg equivalent for a ${node.type} node`);
        }
    }).join(',');
}
