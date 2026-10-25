// Run ExifTool's own test scripts (t/*.t) using the JavaScript translation.
// usage: node tools/run-t.mjs [testName ...]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PL } from '../src/runtime/perl.js';
import '../src/runtime/io-node.js';
import '../src/runtime/ext.js';
import { installCompiler } from '../src/runtime/compile.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(root, 'build');
const mods = JSON.parse(fs.readFileSync(path.join(buildDir, 'modules.json'), 'utf8'));
for (const [k, v] of Object.entries(mods)) {
  await import(path.join(buildDir, v));
}
if (!process.env.NOCOMPILE) installCompiler(JSON.parse(fs.readFileSync(path.join(buildDir, 'perl2js-globals.json'), 'utf8')));
PL.incDir = 'lib/';   // (modules are found in upstream/lib, like perl -Ilib)
if (process.env.PLDEBUG) PL.DEBUG = true;
process.chdir(path.join(root, 'upstream'));
let names = process.argv.slice(2);
if (!names.length) names = fs.readdirSync('t').filter((f) => f.endsWith('.t')).map((f) => f.replace(/\.t$/, ''));
for (const name of names) {
  try {
    PL.requireFile(`t/${name}.t`);
  } catch (e) {
    if (e instanceof PL.PerlExit) continue;
    console.log(`# ${name}: died: ${e instanceof PL.PerlDie ? PL.str(e.value) : e.stack}`);
  }
}
if (PL.missingCode.size) console.log('# missing code strings:\n' + [...PL.missingCode].map((c) => '#   ' + JSON.stringify(c)).join('\n'));
if (PL.lastCompileError() && process.env.PLDEBUG) console.log('# last compile error:', PL.lastCompileError());
if (PL.lastJsError && process.env.PLDEBUG) console.log('# last JS error:', PL.lastJsError);
