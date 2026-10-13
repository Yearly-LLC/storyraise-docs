// Minimal static file server for local captures, checks, and previews (no dependencies).
// Supports byte ranges: browsers cannot seek an MP4 without them, so a server that only
// answers 200 makes every jump into the video start over from the beginning.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.vtt': 'text/vtt; charset=utf-8',
    '.pdf': 'application/pdf',
};

/**
 * Serve `root` on 127.0.0.1:`port`. Directory requests resolve to index.html.
 * @returns {Promise<{url: string, close: () => Promise<void>}>}
 */
export function serveStatic(root, port) {
    const server = http.createServer((req, res) => {
        const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        let file = path.join(root, urlPath);
        if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
        if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
        if (!fs.existsSync(file)) { res.writeHead(404).end('not found'); return; }

        const size = fs.statSync(file).size;
        const headers = {
            'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-store',
        };
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
        if (range) {
            let start = range[1] === '' ? size - Number(range[2]) : Number(range[1]);
            let end = range[1] !== '' && range[2] !== '' ? Number(range[2]) : size - 1;
            start = Math.max(0, start);
            end = Math.min(end, size - 1);
            if (start > end || start >= size) {
                res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end();
                return;
            }
            res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
            if (req.method === 'HEAD') { res.end(); return; }
            fs.createReadStream(file, { start, end }).pipe(res);
            return;
        }
        res.writeHead(200, { ...headers, 'Content-Length': size });
        if (req.method === 'HEAD') { res.end(); return; }
        fs.createReadStream(file).pipe(res);
    });
    return new Promise((resolve, reject) => {
        server.on('error', reject);
        server.listen(port, '127.0.0.1', () => resolve({
            url: `http://127.0.0.1:${port}`,
            close: () => new Promise((r) => server.close(() => r())),
        }));
    });
}
