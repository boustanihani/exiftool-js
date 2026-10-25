// perl2js build driver: transpile ExifTool Perl modules to JavaScript.
// usage: node build.js <libDir> <outDir> [files...]
import fs from 'fs';
import path from 'path';
import { parsePerl } from './parser.js';
import { GlobalInfo, analyzeSub, computeReturns, walk } from './analyze.js';
import { CodeGen } from './codegen.js';
import { applyPatches } from './patches.js';

// usage: node build.js [--runtime=DIR] <outDir> <rootDir>[=<prefix>] ...
//   --runtime=DIR   location of the runtime (perl.js) imported by the generated modules
//                   (default: <outDir>/../src/runtime)
const argv = process.argv.slice(2);
let runtimeDir = null;
while (argv[0] && argv[0].startsWith('--')) {
  const a = argv.shift();
  if (a.startsWith('--runtime=')) runtimeDir = a.slice(10);
  else throw new Error('unknown option ' + a);
}
const [outDir, ...rootArgs] = argv;
if (!runtimeDir) runtimeDir = path.join(outDir, '..', 'src', 'runtime');
const exportsFile = path.join(path.dirname(new URL(import.meta.url).pathname), 'exports.json');

function listFiles(dir, prefix) {
  const out = [];
  const walkDir = (d) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walkDir(p);
      else if (/\.(p[ml]|t)$/.test(f)) out.push({ key: prefix + path.relative(dir, p), file: p });
    }
  };
  walkDir(dir);
  return out.sort((a, b) => (a.key < b.key ? -1 : 1));
}

const fileList = [];
for (const r of rootArgs) {
  const [dir, prefix] = r.split('=');
  fileList.push(...listFiles(dir, prefix || ''));
}
const files = fileList.map((f) => f.key);
const filePaths = new Map(fileList.map((f) => [f.key, f.file]));
const gi = new GlobalInfo();
gi.exports = fs.existsSync(exportsFile) ? JSON.parse(fs.readFileSync(exportsFile, 'utf8')) : {};

function jsPath(f) { return f.replace(/\.(p[ml]|t)$/, (m) => (m === '.pm' ? '.js' : m + '.js')); }

// ---------------------------------------------------------------- parse all
const asts = new Map();
let parseErrors = 0;
// pre-scan all files for sub definitions by package, so barewords naming subs defined in another
// file of the same package (eg. constants like BINARY_DATA_LIMIT) are parsed as calls
const sources = new Map();
const pkgSubs = new Map();    // pkg -> Map(name -> proto)
const filePkgs = new Map();   // file -> Set(packages declared in file)
for (const f of files) {
  const src = applyPatches(f, fs.readFileSync(filePaths.get(f), 'latin1'));
  sources.set(f, src);
  const pkgs = new Set(['main']);
  let pkg = 'main';
  const re = /^\s*(?:package\s+([\w:]+)\s*[;{]|sub\s+([A-Za-z_][\w:]*)\s*(?:\(([^)]*)\))?)/gm;
  let m;
  while ((m = re.exec(src))) {
    if (m[1]) { pkg = m[1]; pkgs.add(pkg); continue; }
    let p = pkg, n = m[2];
    if (n.includes('::')) { p = n.slice(0, n.lastIndexOf('::')); n = n.slice(n.lastIndexOf('::') + 2); }
    if (!pkgSubs.has(p)) pkgSubs.set(p, new Map());
    const subs = pkgSubs.get(p);
    if (!subs.has(n) || m[3] !== undefined) subs.set(n, m[3] === undefined ? undefined : m[3].replace(/\s+/g, ''));
  }
  filePkgs.set(f, pkgs);
}
for (const f of files) {
  const src = sources.get(f);
  const knownSubs = [];
  const protos = new Map();
  for (const p of filePkgs.get(f)) {
    const subs = pkgSubs.get(p);
    if (!subs) continue;
    for (const [n, proto] of subs) {
      knownSubs.push(n);
      if (proto !== undefined) protos.set(n, proto);
    }
  }
  try {
    asts.set(f, parsePerl(src, f, { knownSubs, protos }));
  } catch (e) {
    ++parseErrors;
    console.error('PARSE ERROR', e.message);
  }
}

// ---------------------------------------------------------------- collect symbols
const fileUses = new Map();   // file -> [{pkg, module, args}]
for (const [f, ast] of asts) {
  let pkg = 'main';
  const uses = [];
  const visit = (stmts, curPkg) => {
    let p = curPkg;
    for (const st of stmts) {
      if (!st) continue;
      if (st.t === 'package') {
        if (st.block) { visit(st.block.body, st.name); continue; }
        p = st.name;
        continue;
      }
      if (st.t === 'sub') {
        st.pkg = st.name.includes('::') ? st.name.slice(0, st.name.lastIndexOf('::')) : p;
        const si = analyzeSub(st, gi);
        si.file = f;
        const key = si.pkg + '::' + si.name;
        if (si.name === 'AUTOLOAD') gi.autoload.add(si.pkg);
        if (gi.subs.has(key)) {
          // duplicate definition (eg. in .pm and autoloaded .pl) -- keep the first but note it
          si.dup = true;
        }
        gi.subs.set(key, si);
        if (!gi.methods.has(si.name)) gi.methods.set(si.name, []);
        gi.methods.get(si.name).push(si);
        if (!gi.pkgFiles.has(si.pkg)) gi.pkgFiles.set(si.pkg, new Set());
        gi.pkgFiles.get(si.pkg).add(f);
        continue;
      }
      if (st.t === 'use') {
        uses.push({ pkg: p, module: st.module, args: st.args });
        if (st.module === 'vars' && st.args) {
          const items = st.args.t === 'list' ? st.args.items : [st.args];
          for (const it of items) {
            if (it.t !== 'str') continue;
            const m = /^([$@%])(.*)$/.exec(it.v);
            if (m) {
              const [pp, n] = m[2].includes('::') ? [m[2].slice(0, m[2].lastIndexOf('::')), m[2].slice(m[2].lastIndexOf('::') + 2)] : [p, m[2]];
              gi.pkgVarSet(pp)[m[1]].add(n);
            }
          }
        }
      }
      if (st.t === 'begin' || st.t === 'bare') visit(st.block.body, p);
    }
  };
  visit(ast.body, 'main');
  fileUses.set(f, uses);
  // qualified variable references
  walk(ast, (n) => {
    if (n.t === 'var' && n.name && n.name.includes('::') && '$@%'.includes(n.sigil)) {
      const i = n.name.lastIndexOf('::');
      gi.pkgVarSet(n.name.slice(0, i) || 'main')[n.sigil].add(n.name.slice(i + 2));
    }
    if (n.t === 'my' && n.decl === 'our') {
      // our vars are package vars of the current package (approximation: recorded without package)
    }
  });
}

// imports: resolve which package an unqualified sub comes from
// (imports belong to the package, so "use" statements in any file of the package count)
const pkgUses = new Map();
for (const uses of fileUses.values()) {
  for (const u of uses) {
    if (!pkgUses.has(u.pkg)) pkgUses.set(u.pkg, []);
    pkgUses.get(u.pkg).push(u);
  }
}
gi.importedFrom = (file, pkg, name) => {
  const uses = pkgUses.get(pkg) || [];
  for (const u of uses) {
    if (u.pkg !== pkg) continue;
    const ex = gi.exports[u.module];
    if (!ex) continue;
    let names = [];
    if (!u.args) names = ex.EXPORT || [];
    else {
      const items = u.args.t === 'list' ? u.args.items : [u.args];
      for (const it of items) {
        if (it.t !== 'str') continue;
        if (it.v.startsWith(':')) names.push(...((ex.EXPORT_TAGS || {})[it.v.slice(1)] || []));
        else names.push(it.v);
      }
    }
    if (names.includes(name) || names.includes('&' + name)) return u.module;
  }
  return null;
};
gi.imports = (pkg, name) => null;

computeReturns(gi);

// ---------------------------------------------------------------- generate
let genErrors = 0;
const warnings = [];
const generated = [];
for (const [f, ast] of asts) {
  const cg = new CodeGen(gi, f, ast, {
    runtimePath: path.relative(path.dirname(path.join(outDir, f)), path.join(runtimeDir, 'perl.js')).replace(/\\/g, '/').replace(/^(?!\.)/, './'),
    analyzeSub: (sub) => analyzeSub(sub, gi),
  });
  let js;
  try {
    js = cg.genProgram();
  } catch (e) {
    ++genErrors;
    console.error('GEN ERROR', e.message.split('\n')[0]);
    if (!/^[^:]+:\d+|\?/.test(e.message) || process.env.STACK) console.error(e.stack.split('\n').slice(1, 5).join('\n'));
    continue;
  }
  warnings.push(...cg.warnings);
  generated.push({ f, cg, js });
}
// eval sites give eval'd code access only to the lexicals that compiled code strings use
const evalNames = new Set(['$_', '$val', '@val', '$self', '$et', '$tag', '$valPt', '$prt', '@prt', '$raw', '@raw']);
for (const { cg } of generated) for (const n of cg.evalNames) evalNames.add(n);
for (const { f, cg, js } of generated) {
  const out = path.join(outDir, jsPath(f));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, cg.finishScopes(js, evalNames));
}
fs.writeFileSync(path.join(outDir, 'perl2js-warnings.txt'), warnings.join('\n') + '\n');
// module index (maps Perl module paths to generated JS files)
const index = files.filter((f) => fs.existsSync(path.join(outDir, jsPath(f))));
fs.writeFileSync(path.join(outDir, 'modules.json'), JSON.stringify(Object.fromEntries(index.map((f) => [f, './' + jsPath(f)])), null, 1));
// global symbol information for the run-time compiler (code strings built at run time)
const giOut = {
  subs: [...gi.subs].map(([k, si]) => [k, {
    pkg: si.pkg, name: si.name, proto: si.proto, outParams: [...si.outParams], usesWantarray: si.usesWantarray,
    returnsList: si.returnsList, usesArgs: si.usesArgs, aliasArgs: !!si.aliasArgs,
  }]),
  pkgVars: [...gi.pkgVars].map(([p, v]) => [p, { '$': [...v['$']], '@': [...v['@']], '%': [...v['%']] }]),
  autoload: [...gi.autoload],
};
fs.writeFileSync(path.join(outDir, 'perl2js-globals.json'), JSON.stringify(giOut));
console.log(`files=${files.length} parseErrors=${parseErrors} genErrors=${genErrors} warnings=${warnings.length}`);
