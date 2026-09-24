// Shrink the dashboard's world GeoJSON for the demo map.
//
//   node replica/simplify-geo.mjs
//
// mapshaper reads this ECharts-flavored file as zero records, so this does the
// two things that matter for a small, zoomable card: Douglas-Peucker per ring
// and rounding coordinates. Rings that collapse are dropped; a polygon keeps at
// least its outer ring so small countries don't disappear.
import fs from 'node:fs';
import path from 'node:path';
import { config, SITE_DIR } from '../scripts/lib/identity.mjs';

const SOURCE = path.join(config.builder.path, 'public', 'data', 'world.geo.json');
const OUT = path.join(SITE_DIR, 'demo', 'data', 'world.geo.json');
const TOLERANCE = 0.08; // degrees
const DECIMALS = 2;

function perpendicularDistance(p, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function douglasPeucker(points, tolerance) {
    if (points.length < 3) return points;
    const keep = new Uint8Array(points.length);
    keep[0] = keep[points.length - 1] = 1;
    const stack = [[0, points.length - 1]];
    while (stack.length) {
        const [first, last] = stack.pop();
        let maxDist = 0;
        let index = 0;
        for (let i = first + 1; i < last; i++) {
            const d = perpendicularDistance(points[i], points[first], points[last]);
            if (d > maxDist) { maxDist = d; index = i; }
        }
        if (maxDist > tolerance) {
            keep[index] = 1;
            stack.push([first, index], [index, last]);
        }
    }
    return points.filter((_, i) => keep[i]);
}

const round = (n) => Number(n.toFixed(DECIMALS));

function simplifyRing(ring, isOuter) {
    let pts = douglasPeucker(ring, TOLERANCE).map(([x, y]) => [round(x), round(y)]);
    pts = pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
    if (pts.length < 4) {
        if (!isOuter) return null;
        pts = ring.map(([x, y]) => [round(x), round(y)]); // tiny island: keep it unsimplified
    }
    return pts;
}

function simplifyPolygon(rings) {
    return rings.map((ring, i) => simplifyRing(ring, i === 0)).filter(Boolean);
}

const geo = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
delete geo.crs;
for (const feature of geo.features) {
    const g = feature.geometry;
    if (!g) continue;
    if (g.type === 'Polygon') g.coordinates = simplifyPolygon(g.coordinates);
    else if (g.type === 'MultiPolygon') g.coordinates = g.coordinates.map(simplifyPolygon).filter((p) => p.length);
    feature.properties = { name: feature.properties && feature.properties.name };
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(geo));
console.log(`${geo.features.length} features, ${(fs.statSync(SOURCE).size / 1024).toFixed(0)} KB -> ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
