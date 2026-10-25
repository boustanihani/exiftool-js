// Build the browser distribution in dist/ and the GitHub Pages site in docs/:
//   dist/exiftool.js          public API (ES module)
//   dist/exiftool-worker.js   Web Worker wrapper (ExifTool.createWorker)
//   dist/runtime/*.js         Perl runtime
//   dist/perl2js/*.js         translator (only loaded when code strings must be compiled at run time)
//   dist/modules/...          translated ExifTool modules (loaded on demand)
//   dist/modules/manifest.js  module index
//   dist/modules/globals.js   symbol information for the run-time compiler
//   docs/                     a copy of dist/ plus the demo page (index.html) and its sample image
// usage: node tools/build-dist.mjs [--minify] [--out=DIR] [--docs=DIR]
//   --out=DIR    build the distribution in DIR instead of dist/ (then docs/ is only built
//                when --docs is given)
//   --docs=DIR   build the GitHub Pages site in DIR (default: docs/; --docs= skips it)
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const minify = args.includes('--minify');
const outArg = args.find((a) => a.startsWith('--out='));
const docsArg = args.find((a) => a.startsWith('--docs='));
const dist = path.resolve(root, outArg ? outArg.slice(6) : 'dist');
const docs = docsArg ? (docsArg.slice(7) ? path.resolve(root, docsArg.slice(7)) : null)
  : outArg ? null : path.join(root, 'docs');
const REPO = 'https://github.com/boustanihani/exiftool-js';

// ExifTool version and copyright, for the license notices
const etSource = fs.readFileSync(path.join(root, 'upstream/lib/Image/ExifTool.pm'), 'utf8');
const etVersion = (/\$VERSION\s*=\s*'([^']+)'/.exec(etSource) || [])[1] || '?';
const etYears = (/Copyright \(c\) (\d{4}-\d{4}), Phil Harvey/.exec(etSource) || [])[1] || '2003-' + new Date().getFullYear();

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'runtime'), { recursive: true });
fs.mkdirSync(path.join(dist, 'perl2js'), { recursive: true });

// 1. translate ExifTool (plus the JSAPI glue module)
const modDir = path.join(dist, 'modules');
execFileSync('node', [path.join(root, 'tools/perl2js/build.js'), `--runtime=${path.join(dist, 'runtime')}`, modDir,
  path.join(root, 'upstream/lib'), path.join(root, 'src/perl')], { stdio: 'inherit' });

// 2. runtime and translator (with import paths adjusted to the dist layout)
const copy = (from, to, edit) => {
  let s = fs.readFileSync(path.join(root, from), 'utf8');
  if (edit) s = edit(s);
  fs.writeFileSync(path.join(dist, to), s);
};
for (const f of ['perl.js', 'regex.js', 'sprintf.js', 'pack.js', 'zlib.js', 'md5.js', 'ext.js']) copy(`src/runtime/${f}`, `runtime/${f}`);
copy('src/runtime/compile.js', 'runtime/compile.js', (s) => s.replace(/'\.\.\/\.\.\/tools\/perl2js\//g, "'../perl2js/"));
for (const f of ['lexer.js', 'parser.js', 'analyze.js', 'codegen.js']) {
  copy(`tools/perl2js/${f}`, `perl2js/${f}`, (s) => s.replace(/'\.\.\/\.\.\/src\/runtime\//g, "'../runtime/"));
}
copy('src/api/exiftool.js', 'exiftool.js');
copy('src/api/exiftool-worker.js', 'exiftool-worker.js');

// 3. module index and run-time compiler information as JS modules (importable everywhere)
const mods = JSON.parse(fs.readFileSync(path.join(modDir, 'modules.json'), 'utf8'));
const sizes = {};
for (const [k, v] of Object.entries(mods)) sizes[k] = fs.statSync(path.join(modDir, v)).size;
fs.writeFileSync(path.join(modDir, 'manifest.js'), '// module index: Perl module path -> [JS file, size]\nexport default ' +
  JSON.stringify(Object.fromEntries(Object.entries(mods).map(([k, v]) => [k, [v.replace(/^\.\//, ''), sizes[k]]])), null, 0) + ';\n');
const globals = fs.readFileSync(path.join(modDir, 'perl2js-globals.json'), 'utf8');
fs.writeFileSync(path.join(modDir, 'globals.js'), 'export default ' + globals + ';\n');
for (const f of ['modules.json', 'perl2js-globals.json', 'perl2js-warnings.txt']) fs.rmSync(path.join(modDir, f), { force: true });

// 4. optional minification (esbuild)
const allJs = [];
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.js')) allJs.push(p); } };
walk(dist);
if (minify) {
  const esbuild = await import('esbuild');
  for (const f of allJs) {
    const src = fs.readFileSync(f, 'utf8');
    const r = await esbuild.transform(src, { minify: true, format: 'esm', target: 'es2020', charset: 'utf8', legalComments: 'none' });
    fs.writeFileSync(f, r.code);
  }
}

// 5. Escape control characters and U+FFFD so every file is plain text to hosts and CDNs that
// sniff content. These only occur inside string, template and regex literals, where the
// \xNN (or \u-) escape means the same character; a preceding identity backslash is dropped.
// Then add a license header to each file.
const CTL = new RegExp('(\\\\*)([\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f' + String.fromCharCode(0xfffd) + '])', 'g');
const escapeCtl = (s) => s.replace(CTL, (m, bs, c) => {
  if (bs.length % 2) bs = bs.slice(1);
  const n = c.charCodeAt(0);
  return bs + (n > 0xff ? '\\' + 'u' + n.toString(16).toUpperCase() : '\\x' + n.toString(16).padStart(2, '0'));
});
// (one license for everything, the same as ExifTool's: the same terms as Perl itself)
const TERMS = 'Free software; you can redistribute it and/or modify it under the same terms as Perl itself ' +
  '(either the Perl Artistic License or GPL), like ExifTool. See LICENSE.txt.';
const OWN = `/*! exiftool-js (${REPO}). ${TERMS} */\n`;
const fromExifTool = (src) => `/*! exiftool-js: ${src ? `${src} of ExifTool ${etVersion} (https://exiftool.org), translated to JavaScript`
  : `module data generated from ExifTool ${etVersion} (https://exiftool.org)`}. ExifTool is Copyright ${etYears}, Phil Harvey. ${TERMS} */\n`;
for (const f of allJs) {
  const s = escapeCtl(fs.readFileSync(f, 'utf8'));
  const rel = path.relative(dist, f).split(path.sep).join('/');
  let header = OWN;
  if (rel.startsWith('modules/')) {
    const src = (/\.module\((["'])([^"']+)\1/.exec(s) || [])[2];
    if (src !== 'Image/ExifTool/JSAPI.pm') header = fromExifTool(src);
  }
  fs.writeFileSync(f, header + s);
}

// 6. license and docs
for (const f of ['README.md']) if (fs.existsSync(path.join(root, f))) fs.copyFileSync(path.join(root, f), path.join(dist, f));
fs.copyFileSync(path.join(root, 'LICENSE'), path.join(dist, 'LICENSE.txt'));
let total = 0;
for (const f of allJs) total += fs.statSync(f).size;
console.log(`dist: ${allJs.length} JS files, ${(total / 1e6).toFixed(1)} MB${minify ? ' (minified)' : ''}`);

// 7. GitHub Pages site: the library next to the demo page (src/demo/demo.html is the page
// body, which is also published as a Claude artifact; it is wrapped into a full page here)
if (docs) {
  fs.rmSync(docs, { recursive: true, force: true });
  fs.cpSync(dist, docs, { recursive: true, filter: (p) => path.relative(dist, p) !== 'README.md' });
  const body = fs.readFileSync(path.join(root, 'src/demo/demo.html'), 'utf8');
  const icon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230f1516'/%3E" +
    "%3Ccircle cx='16' cy='16' r='9' fill='none' stroke='%234fc7bd' stroke-width='3'/%3E%3Ccircle cx='16' cy='16' r='3' fill='%234fc7bd'/%3E%3C/svg%3E";
  fs.writeFileSync(path.join(docs, 'index.html'), [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
    '<meta name="color-scheme" content="dark">',
    '<meta name="description" content="Read and edit EXIF, XMP, IPTC and maker notes of JPEG, TIFF, PNG, WebP and HEIC files with ExifTool running entirely in the browser.">',
    `<link rel="icon" href="${icon}">`,
    '<style>html{background:#0f1516}body{margin:0}img,svg,video{max-width:100%}[hidden]{display:none!important}</style>',
    '</head>',
    '<body>',
    body.trimEnd(),
    '</body>',
    '</html>',
    '',
  ].join('\n'));
  fs.mkdirSync(path.join(docs, 'samples'), { recursive: true });
  fs.copyFileSync(path.join(root, 'src/demo/sample.jpg'), path.join(docs, 'samples/sample.jpg'));
  fs.writeFileSync(path.join(docs, '.nojekyll'), '');   // serve the files as they are
  console.log(`docs: GitHub Pages site in ${path.relative(root, docs) || '.'}/ (index.html = demo)`);
}
