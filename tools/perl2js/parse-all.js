import fs from 'fs';
import path from 'path';
import { parsePerl } from './parser.js';
const root = process.argv[2];
const files = process.argv.slice(3);
let ok = 0, bad = 0;
for (const f of files) {
  const src = fs.readFileSync(path.join(root, f), 'latin1');
  try {
    const t0 = Date.now();
    parsePerl(src, f);
    ++ok;
  } catch (e) {
    ++bad;
    console.log('FAIL', e.message.split('\n').slice(0, 2).join(' | '));
    if (!(e.name === 'PerlSyntaxError' || e.constructor.name === 'PerlSyntaxError')) console.log(e.stack.split('\n').slice(0,4).join('\n'));
  }
}
console.log(`ok=${ok} bad=${bad}`);
