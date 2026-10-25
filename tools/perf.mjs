import fs from 'fs'; import path from 'path';
const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
let t0 = performance.now();
const { PL } = await import(root + '/src/runtime/perl.js');
await import(root + '/src/runtime/io-node.js'); await import(root + '/src/runtime/ext.js');
const mods = JSON.parse(fs.readFileSync(path.join(root, 'build/modules.json'), 'utf8'));
for (const v of Object.values(mods)) await import(path.join(root, 'build', v));
console.log('import all modules ms', Math.round(performance.now() - t0));
process.chdir(root + '/upstream');
t0 = performance.now();
PL.require('Image::ExifTool');
const ET = PL.pkg('Image::ExifTool');
console.log('init ExifTool ms', Math.round(performance.now() - t0));
const file = process.argv[2] || 't/images/Canon.jpg';
const data = fs.readFileSync(file).toString('latin1');
for (const pass of [1, 2, 3]) {
  t0 = performance.now();
  const N = pass === 1 ? 1 : 10;
  for (let i = 0; i < N; i++) { const et = ET.new('Image::ExifTool'); ET.ImageInfo(et, PL.box(data)); }
  const tr = (performance.now() - t0) / N;
  t0 = performance.now();
  for (let i = 0; i < N; i++) { const et = ET.new('Image::ExifTool'); ET.SetNewValue(et, 'XMP:Title', 'perf'); ET.SetNewValue(et, 'EXIF:Artist', 'perf'); const out = PL.box(''); ET.WriteInfo(et, PL.box(data), out); }
  const tw = (performance.now() - t0) / N;
  console.log(`pass ${pass}: read ${tr.toFixed(1)} ms, write ${tw.toFixed(1)} ms`);
}
