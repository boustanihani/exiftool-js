// quick CLI for debugging: node tools/et.mjs file [tags...]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PL } from '../src/runtime/perl.js';
import '../src/runtime/io-node.js';
import '../src/runtime/ext.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mods = JSON.parse(fs.readFileSync(path.join(root, 'build/modules.json'), 'utf8'));
for (const v of Object.values(mods)) await import(path.join(root, 'build', v));
if (process.env.PLDEBUG) PL.DEBUG = true;
PL.require('Image::ExifTool');
const ET = PL.pkg('Image::ExifTool');
const et = ET.new('Image::ExifTool');
const [file, ...tags] = process.argv.slice(2);
ET.Options(et, 'Duplicates', 1);
const info = ET.ImageInfo(et, file, ...tags);
for (const k of ET.GetFoundTags(et, 'File')) {
  const v = info[k];
  const g = ET.GetGroup(et, k, 1);
  console.log(`[${PL.str(PL.sc(g))}] ${k} = ${v instanceof PL.Box ? `(Binary ${PL.str(v.v).length} bytes)` : PL.str(v)}`);
}
if (PL.missingCode.size) console.log('# missing code:', [...PL.missingCode]);
