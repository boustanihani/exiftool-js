// Run a transpiled Perl script: node tools/run-pl.mjs <module key> [args...]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PL } from '../src/runtime/perl.js';
import '../src/runtime/io-node.js';
import '../src/runtime/ext.js';
import { installCompiler } from '../src/runtime/compile.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mods = JSON.parse(fs.readFileSync(path.join(root, 'build/modules.json'), 'utf8'));
for (const v of Object.values(mods)) await import(path.join(root, 'build', v));
installCompiler(JSON.parse(fs.readFileSync(path.join(root, 'build/perl2js-globals.json'), 'utf8')));
PL.incDir = 'lib/';   // (modules are found in upstream/lib, like perl -Ilib)
if (process.env.PLDEBUG) PL.DEBUG = true;
const [key, ...args] = process.argv.slice(2);
process.chdir(path.join(root, 'upstream'));
PL.ARGV.push(...args.map((a) => Buffer.from(a, 'utf8').toString('latin1')));   // (Perl sees arguments as bytes)
try {
  PL.requireFile(key);
} catch (e) {
  if (!(e instanceof PL.PerlExit)) console.log(`# died: ${e instanceof PL.PerlDie ? PL.str(e.value) : e.stack}`);
}
if (PL.missingCode.size && process.env.PLDEBUG) console.log('# missing code strings:\n' + [...PL.missingCode].map((c) => '#   ' + JSON.stringify(c)).join('\n'));
