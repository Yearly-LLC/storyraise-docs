// Preview the docs site locally, with byte-range support so the video can seek.
//
//   node scripts/serve.mjs [port]      then open http://127.0.0.1:5070/storyraise-analytics/
//
// python3 -m http.server does not answer range requests, so chapter jumps in the video
// restart from the beginning there. This server behaves like GitHub Pages for seeking.
import { DOCS_ROOT } from './lib/identity.mjs';
import { serveStatic } from './lib/static-server.mjs';

const port = Number(process.argv[2]) || 5070;
const server = await serveStatic(DOCS_ROOT, port);
console.log(`Serving ${DOCS_ROOT} at ${server.url}/storyraise-analytics/`);
