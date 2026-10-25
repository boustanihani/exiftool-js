// Run the API in a real browser (headless Chromium via Playwright) and compare the results
// with the same calls in Node.  (Node results are compared with Perl by tools/api-diff.mjs.)
// usage: node tools/browser-test.mjs [--dist=DIR] FILE|DIR ...
import fs from 'fs';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const distArg = args.find((a) => a.startsWith('--dist='));
const dist = path.resolve(root, distArg ? distArg.slice(7) : 'dist');
const files = [];
const addPath = (p) => {
  const st = fs.statSync(p);
  if (st.isDirectory()) for (const f of fs.readdirSync(p).sort()) addPath(path.join(p, f));
  else if (/\.(jpe?g|tiff?|png|webp|heic|heif|bmp|xmp)$/i.test(p)) files.push(path.resolve(p));
};
args.filter((a) => !a.startsWith('--')).forEach(addPath);

const JOBS = [
  { name: 'read', kind: 'read', params: {} },
  { name: 'read-raw', kind: 'read', params: { options: { PrintConv: 0 }, groupNames: 0 } },
  { name: 'read-binary', kind: 'read', params: { binary: true, tags: ['ThumbnailImage', 'PreviewImage', 'ICC_Profile', 'XMP:all'] } },
  { name: 'write', kind: 'write', params: { tags: { 'XMP:Title': 'Ünïcödé', 'EXIF:Artist': 'Hani', 'IPTC:Keywords': ['k1', 'k2'], GPSLatitude: -33.85, GPSLatitudeRef: 'S' } } },
  { name: 'write-ops', kind: 'write', params: { ops: [{ tag: 'AllDates', value: '1:0:0 0:0:0', shift: 1 }, { tag: 'XMP:Subject', value: 'x', add: true }] } },
  { name: 'write-delall', kind: 'write', params: { tags: { all: null, 'XMP-dc:Creator': 'me' } } },
];

// ---------------------------------------------------------------------- Node results
const { ExifTool } = await import(pathToFileURL(path.join(dist, 'exiftool.js')).href);
const sha = (u8) => crypto.createHash('sha256').update(u8).digest('hex');
const canon = (v) => {
  if (v === null || v === undefined) return null;
  if (v instanceof Uint8Array) return `BIN:${v.length}:${sha(v)}`;
  if (Array.isArray(v)) return v.map(canon);
  if (typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) o[k] = canon(v[k]); return o; }
  return v;
};
const et = await ExifTool.create();
const nodeRes = new Map();
const fname = (i) => `${i}:${path.basename(files[i])}`;   // (unique names)
for (const [i, f] of files.entries()) {
  const data = new Uint8Array(fs.readFileSync(f));
  for (const job of JOBS) {
    let r;
    if (job.kind === 'read') {
      const res = await et.read(data, job.params);
      r = { tags: canon(res.tags), warnings: res.warnings, error: res.error ?? null };
    } else {
      const res = await et.write(data, job.params);
      r = { data: res.data ? res.data.length + ':' + sha(res.data) : null, changed: res.changed, warnings: res.warnings, error: res.error ?? null };
    }
    nodeRes.set(fname(i) + '|' + job.name, r);
  }
}
// (the page also runs the first read and write job through the Web Worker version)
if (files.length) {
  const b = fname(0);
  nodeRes.set(b + '|worker-read', nodeRes.get(b + '|' + JOBS[0].name));
  nodeRes.set(b + '|worker-write', nodeRes.get(b + '|' + JOBS.find((j) => j.kind === 'write').name));
}

// ---------------------------------------------------------------------- browser results
const fileList = files.map((f, i) => ({ name: fname(i), url: `/__files/${i}` }));
const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file;
  if (u === '/test/browser-test-files.json') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(fileList)); return; }
  if (u === '/test/browser-test-jobs.json') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(JOBS)); return; }
  if (u.startsWith('/__files/')) file = files[+u.slice(9)];
  else if (u.startsWith('/dist/')) file = path.join(dist, u.slice(6));
  else file = path.join(root, u);
  const inside = (f, dir) => path.resolve(f).startsWith(dir + path.sep);
  const allowed = file && (files.includes(file) || inside(file, root) || inside(file, dist));
  if (!allowed || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const { chromium } = await import('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(String(e)));
const t0 = Date.now();
await page.goto(`http://127.0.0.1:${port}/test/browser-test.html`);
await page.waitForFunction(() => window.__results !== undefined, null, { timeout: 30 * 60 * 1000 });
const browserRes = await page.evaluate(() => window.__results);
const browserMs = Date.now() - t0;
await browser.close();
server.close();
if (!Array.isArray(browserRes)) { console.log('browser exception:', browserRes.exception); process.exit(1); }

let same = 0, diff = 0;
const details = [];
for (const r of browserRes) {
  const a = JSON.stringify(nodeRes.get(r.id));
  const b = JSON.stringify(r.result);
  if (a === b) ++same;
  else {
    ++diff;
    const x = nodeRes.get(r.id) || {}, y = r.result;
    const lines = [];
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      if (JSON.stringify(x[k]) === JSON.stringify(y[k])) continue;
      if (k === 'tags' && x.tags && y.tags) {
        for (const t of new Set([...Object.keys(x.tags), ...Object.keys(y.tags)])) {
          if (JSON.stringify(x.tags[t]) !== JSON.stringify(y.tags[t])) lines.push(`  ${t}: node ${JSON.stringify(x.tags[t])}  browser ${JSON.stringify(y.tags[t])}`);
        }
      } else lines.push(`  ${k}: node ${JSON.stringify(x[k])}  browser ${JSON.stringify(y[k])}`);
    }
    details.push(`DIFF ${r.id}\n${lines.slice(0, 10).join('\n')}`);
  }
}
const times = browserRes.map((r) => r.ms).sort((x, y) => x - y);
console.log(`browser jobs ${browserRes.length}  same ${same}  diff ${diff}  (${(browserMs / 1000).toFixed(1)} s, median ${times[times.length >> 1]} ms per call, max ${times[times.length - 1]} ms)`);
if (consoleErrors.length) console.log('console errors:', consoleErrors.slice(0, 5));
if (details.length) console.log(details.slice(0, 5).join('\n'));
