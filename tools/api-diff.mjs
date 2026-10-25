// Compare the JS API (dist/exiftool.js, in one Node process, all I/O in memory) with Perl
// running the same jobs through Image::ExifTool::JSAPI (tools/pl/api-ref.pl).
// usage: node tools/api-diff.mjs [--dist=DIR] [--reads-only] FILE|DIR ...
// Results: build/apidiff/summary.txt (+ details of differences)
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const distArg = args.find((a) => a.startsWith('--dist='));
const dist = path.resolve(root, distArg ? distArg.slice(7) : 'dist');
const readsOnly = args.includes('--reads-only');
const inputs = args.filter((a) => !a.startsWith('--'));
const outDir = path.join(root, 'build/apidiff');
fs.mkdirSync(outDir, { recursive: true });

const files = [];
const addPath = (p) => {
  const st = fs.statSync(p);
  if (st.isDirectory()) for (const f of fs.readdirSync(p).sort()) addPath(path.join(p, f));
  else if (/\.(jpe?g|tiff?|png|webp|heic|heif|bmp|xmp)$/i.test(p)) files.push(path.resolve(p));
};
inputs.forEach(addPath);

const img = (f) => path.join(root, 'upstream/t/images', f);
const READS = {
  default: {},
  raw: { options: { PrintConv: 0 } },
  g0: { groupNames: 0 },
  nogroup: { groupNames: false },
  some: { tags: ['XMP:all', 'EXIF:Make', '-XMP:Title', 'ICC_Profile:all'] },
  binary: { binary: true },
  struct: { options: { Struct: 1, Unknown: 1 } },
};
const WRITES = {
  basic: { tagList: [['XMP:Title', 'Ünïcödé title'], ['EXIF:Artist', 'Hani'], ['IPTC:Keywords', ['k1', 'k2']]] },
  gps: { tagList: [['GPSLatitude', 52.5], ['GPSLatitudeRef', 'N'], ['GPSLongitude', -13.4], ['GPSLongitudeRef', 'W'], ['GPSAltitude', 34]] },
  shift: { ops: [{ tag: 'AllDates', value: '1:2:3 4:5:6', shift: 1 }] },
  delall: { tagList: [['all', null]] },
  delgroups: { tagList: [['XMP:all', null], ['IPTC:all', null]], ops: [{ tag: 'XMP:Subject', value: 'x', add: true }] },
  copy: { ops: [{ copyFrom: img('Canon.jpg') }] },
  exif2xmp: { ops: [{ copyFrom: '%SELF%', tags: ['EXIF:all>XMP:all'] }] },
  struct: { tagList: [['XMP-iptcExt:LocationShown', [{ City: 'Berlin', CountryName: 'Germany' }]], ['XMP-dc:Title-de', 'Titel'], ['XMP-dc:Title', 'Title']] },
  thumb: { tagList: [['ThumbnailImage', { $file: img('Writer.jpg') }]] },
  compact: { tagList: [['XMP:Rating', 5], ['XMP:Label', 'Red']], options: { Compact: 'Shorthand' } },
  icc: { tagList: [['ICC_Profile', { $file: img('ICC_Profile.icc') }]] },
  numeric: { ops: [{ tag: 'Orientation', value: 6, numeric: true }, { tag: 'XMP:Subject', value: 'a' }, { tag: 'XMP:Subject', value: 'b', add: true }] },
  minor: { tagList: [['EXIF:Artist', 'x']], options: { IgnoreMinorErrors: 1 } },
};
const jobs = [];
for (const f of files) {
  const fid = path.relative(root, f);   // (unique job ids)
  for (const [n, p] of Object.entries(READS)) jobs.push({ id: `${fid}|read:${n}`, file: f, kind: 'read', params: p });
  if (readsOnly) continue;
  for (const [n, p] of Object.entries(WRITES)) {
    const q = JSON.parse(JSON.stringify(p).replace(/"%SELF%"/g, JSON.stringify(f)));
    jobs.push({ id: `${fid}|write:${n}`, file: f, kind: 'write', params: q });
  }
}
if (!readsOnly) jobs.push({ id: 'new.xmp|write:create', file: null, kind: 'write', params: { tagList: [['XMP:Title', 'new'], ['XMP:Subject', ['a', 'b']]], fileType: 'XMP' } });
// replace {$file} markers (binary values) with the file contents: Perl side via a temporary
// copy of the job list
const fileMarkers = (v, conv) => {
  if (Array.isArray(v)) return v.map((x) => fileMarkers(x, conv));
  if (v && typeof v === 'object') {
    if (v.$file) return conv(v.$file);
    const o = {};
    for (const k of Object.keys(v)) o[k] = fileMarkers(v[k], conv);
    return o;
  }
  return v;
};
fs.writeFileSync(path.join(outDir, 'jobs.json'), JSON.stringify(jobs.map((j) => Object.assign({}, j, {
  params: fileMarkers(j.params, (f) => ({ $file: f })),
}))));

// ------------------------------------------------------------- Perl reference
let t0 = Date.now();
// (the reference script resolves {$file} markers itself)
const perlOut = execFileSync('perl', ['-Ilib', '-I../src/perl', path.join(root, 'tools/pl/api-ref.pl'), path.join(outDir, 'jobs.json')],
  { cwd: path.join(root, 'upstream'), maxBuffer: 1 << 30, encoding: 'utf8' });
const perlRes = new Map(perlOut.split('\n').filter((l) => l).map((l) => { const r = JSON.parse(l); return [r.id, r]; }));
const perlMs = Date.now() - t0;

// ------------------------------------------------------------- JS API
const { ExifTool } = await import(pathToFileURL(path.join(dist, 'exiftool.js')).href);
const { numToStr } = await import(pathToFileURL(path.join(dist, 'runtime/sprintf.js')).href);
const md5 = (u8) => crypto.createHash('md5').update(u8).digest('hex');
const canon = (v) => {
  if (v === null || v === undefined) return null;
  if (v instanceof Uint8Array) return `BIN:${v.length}:${md5(v)}`;
  if (Array.isArray(v)) return v.map(canon);
  if (typeof v === 'number') return numToStr(v);
  if (typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) o[k] = canon(v[k]); return o; }
  return String(v);
};
const sortKeys = (v) => {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) o[k] = sortKeys(v[k]); return o; }
  return v;
};
t0 = Date.now();
const et = await ExifTool.create();
const results = [];
let same = 0, diff = 0, equiv = 0;
const details = [];
for (const job of jobs) {
  const data = job.file ? new Uint8Array(fs.readFileSync(job.file)) : null;
  const p = fileMarkers(job.params, (f) => new Uint8Array(fs.readFileSync(f)));
  let res;
  try {
    if (job.kind === 'read') {
      const r = await et.read(data, Object.assign({}, p, { numbers: false }));
      res = { id: job.id, tags: r.entries.map((e) => [e.key, canon(e.value)]), warnings: r.warnings, error: r.error === undefined ? null : r.error };
    } else {
      const params = { tags: Object.fromEntries(p.tagList || []), ops: (p.ops || []).map((o) => (o.copyFrom ? Object.assign({}, o, { copyFrom: new Uint8Array(fs.readFileSync(o.copyFrom)) }) : o)), options: p.options, fileType: p.fileType };
      const r = await et.write(data, params);
      res = { id: job.id, data: r.data ? `${r.data.length}:${md5(r.data)}` : null, changed: r.changed, warnings: r.warnings, error: r.error === undefined ? null : r.error };
      if (r.data) {
        const rb = await et.read(r.data, { groupNames: false, numbers: false });
        res.readback = rb.entries.filter((e) => e.groups[1] !== 'System').map((e) => [e.key, canon(e.value)]);
      }
    }
  } catch (e) {
    res = { id: job.id, exception: String(e && e.stack || e) };
  }
  const ref = perlRes.get(job.id);
  const a = JSON.stringify(sortKeys(ref || {}));
  const b = JSON.stringify(sortKeys(res));
  // (written data that differs but reads back identically, eg. different zlib compression)
  const strip = (x) => JSON.stringify(sortKeys(Object.assign({}, x, { data: x.data ? 'x' : null })));
  if (a === b) ++same;
  else if (ref && res.data && ref.data && strip(ref) === strip(res)) { ++equiv; details.push(`EQUIV ${job.id}`); }
  else {
    ++diff;
    details.push(`DIFF ${job.id}\n${explain(sortKeys(ref || {}), sortKeys(res))}`);
  }
}
// describe the differences between two results (first differing items of each field)
function explain(a, b) {
  const out = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k], y = b[k];
    if (JSON.stringify(x) === JSON.stringify(y)) continue;
    if (Array.isArray(x) && Array.isArray(y)) {
      const n = Math.max(x.length, y.length);
      let shown = 0;
      for (let i = 0; i < n && shown < 4; ++i) {
        if (JSON.stringify(x[i]) === JSON.stringify(y[i])) continue;
        out.push(`  ${k}[${i}] perl: ${JSON.stringify(x[i]).slice(0, 300)}\n  ${k}[${i}] js:   ${JSON.stringify(y[i]).slice(0, 300)}`);
        ++shown;
      }
      if (x.length !== y.length) out.push(`  ${k}: ${x.length} vs ${y.length} items`);
    } else {
      out.push(`  ${k} perl: ${JSON.stringify(x).slice(0, 500)}\n  ${k} js:   ${JSON.stringify(y).slice(0, 500)}`);
    }
  }
  return out.join('\n');
}
const jsMs = Date.now() - t0;
const summary = `jobs ${jobs.length}  same ${same}  equiv ${equiv}  diff ${diff}   (perl ${(perlMs / 1000).toFixed(1)} s, js ${(jsMs / 1000).toFixed(1)} s)`;
fs.writeFileSync(path.join(outDir, 'summary.txt'), summary + '\n' + details.join('\n') + '\n');
console.log(summary);
if (diff) console.log(details.filter((d) => d.startsWith('DIFF')).slice(0, 5).map((d) => d.slice(0, 600)).join('\n'));
