// Code generator for perl2js: Perl AST -> JavaScript source.
import { Parser } from './parser.js';
import { isListish, walk, walkSkippingSubs, BUILTIN_LIST } from './analyze.js';
import { perlre2js, quotemeta } from '../../src/runtime/regex.js';

const JS_RESERVED = new Set(('break case catch class const continue debugger default delete do else enum export extends false ' +
  'finally for function if import in instanceof new null return super switch this throw true try typeof var void while with ' +
  'yield let static implements interface package private protected public await arguments eval undefined NaN Infinity ' +
  'PL H Object Array String Number Math JSON Symbol Date RegExp Error Map Set globalThis console _ $S async of get set').split(' '));

export const CODE_KEYS = new Set(['ValueConv', 'PrintConv', 'RawConv', 'ValueConvInv', 'PrintConvInv', 'RawConvInv',
  'Condition', 'Hook', 'Start', 'Base', 'OffsetPt', 'IsOffset', 'WriteCondition', 'DelCheck', 'WriteCheck', 'Validate',
  'FixOffsets', 'ChangeBase', 'WrongBase']);

export class CodeGenError extends Error {}

// heuristic for string literals that may contain Perl code to be eval'd
const LOOKS_LIKE_CODE = /\$(?:val|self|tag|et|_\b|\$self|\{|valPt|format|count|size|dirData|start|base|valuePtr|dataPt|pos|varSize|prt|raw)\b|@(?:val|prt|raw)\b|\$val\[|^\s*(?:tr|y|s)\s*[\/{#|!]/;

// ---------------------------------------------------------------------------- string helpers
export function jsStr(s) {
  let out = "'";
  for (let i = 0; i < s.length; ++i) {
    const c = s.charCodeAt(i);
    if (c === 0x27) out += "\\'";
    else if (c === 0x5c) out += '\\\\';
    else if (c === 0x0a) out += '\\n';
    else if (c === 0x0d) out += '\\r';
    else if (c === 0x09) out += '\\t';
    else if (c < 0x20 || (c >= 0x7f && c <= 0xff)) out += '\\x' + c.toString(16).padStart(2, '0');
    else if (c > 0xff) out += '\\u' + c.toString(16).padStart(4, '0');
    else out += s[i];
  }
  return out + "'";
}

function tmplStr(s) {
  let out = '';
  for (let i = 0; i < s.length; ++i) {
    const c = s.charCodeAt(i);
    const ch = s[i];
    if (ch === '`') out += '\\`';
    else if (ch === '\\') out += '\\\\';
    else if (ch === '$' && s[i + 1] === '{') out += '\\$';
    else if (c === 0x0a) out += '\\n';
    else if (c === 0x0d) out += '\\r';
    else if (c === 0x09) out += '\\t';
    else if (c < 0x20 || (c >= 0x7f && c <= 0xff)) out += '\\x' + c.toString(16).padStart(2, '0');
    else if (c > 0xff) out += '\\u' + c.toString(16).padStart(4, '0');
    else out += ch;
  }
  return out;
}

function isIdent(s) { return /^[A-Za-z_$][\w$]*$/.test(s) && !JS_RESERVED.has(s); }
function isPropName(s) { return /^[A-Za-z_$][\w$]*$/.test(s); }
function propAccess(key) { return isPropName(key) ? '.' + key : '[' + jsStr(key) + ']'; }
function indent(s, n = 1) {
  const pad = '  '.repeat(n);
  return s.split('\n').map((l) => (l.length ? pad + l : l)).join('\n');
}
function paren(s) { return /^[\w$.]+$/.test(s) || /^'[^']*'$/.test(s) ? s : '(' + s + ')'; }

// pretty-format list of items as [a, b] or multi-line
function fmtList(open, items, close, force) {
  const one = open + items.join(', ') + close;
  if (!force && one.length <= 100 && !one.includes('\n')) return one;
  return open + '\n' + items.map((i) => indent(i) + ',').join('\n') + '\n' + close;
}

// ---------------------------------------------------------------------------- scopes
class Scope {
  constructor(parent, fn) {
    this.parent = parent;
    this.vars = new Map();   // sigil+name -> jsName
    this.fn = fn || (parent && parent.fn);
    this.jsNames = new Set();
  }
  lookup(key) {
    for (let s = this; s; s = s.parent) {
      if (s.vars.has(key)) return s.vars.get(key);
    }
    return undefined;
  }
  visibleJs(js) {
    for (let s = this; s; s = s.parent) if (s.jsNames.has(js)) return true;
    return false;
  }
}

// function context
class FnCtx {
  constructor(opts = {}) {
    this.args = opts.args || '_';
    this.temps = 0;
    this.usesWantarray = !!opts.usesWantarray;
    this.outParams = opts.outParams || new Set();
    this.shifts = 0;       // number of leading shifts consumed (for $_[N] mapping)
    this.isEval = !!opts.isEval;
    this.loops = [];       // stack of loop descriptors {label, kind:'loop'|'bare', jsLabel}
    this.gotoLabels = new Map();
    this.labelCounter = 0;
    this.tempDecls = new Set();
    this.isSub = !!opts.isSub;
    this.name = opts.name;
  }
  newTemp() {
    const t = '_t' + (++this.temps);
    this.tempDecls.add(t);
    return t;
  }
}

// ---------------------------------------------------------------------------- code generator
export class CodeGen {
  constructor(gi, file, ast, opts = {}) {
    this.gi = gi;
    this.file = file;
    this.ast = ast;
    this.opts = opts;
    this.pkg = 'main';
    this.aliases = new Map();     // pkg -> alias
    this.aliasNames = new Set();
    this.codeStrings = new Map(); // perl code -> js (for eval)
    this.comments = (ast.comments || []).slice().sort((a, b) => a.pos - b.pos);
    this.commentIdx = 0;
    this.hoistedRegex = [];
    this.warnings = [];
    this.fileScope = new Scope(null, new FnCtx({ args: 'PL.ARGV' }));
    this.scope = this.fileScope;
    this.subDefs = [];            // generated sub function code
    this.usedPkgs = new Set();
    this.imports = new Map();     // pkg -> Map(name -> fromPkg)
    this.evalMode = false;        // generating code string for eval
    this.evalPkg = null;
    this.evalNames = new Set();   // names of free variables used by compiled eval code
    this.scopeSites = [];         // scope accessor entries of eval sites (see finishScopes)
  }

  warn(msg, node) {
    this.warnings.push(`${this.file}:${node && node.line || '?'}: ${msg}`);
  }

  error(msg, node) {
    throw new CodeGenError(`${this.file}:${node && node.line || this.curLine || '?'}: ${msg}`);
  }

  // ------------------------------------------------------------------ packages / names
  alias(pkg) {
    if (this.aliases.has(pkg)) return this.aliases.get(pkg);
    let a;
    if (pkg === 'Image::ExifTool') a = 'ET';
    else if (pkg.startsWith('Image::ExifTool::')) a = 'ET_' + pkg.slice(17).replace(/::/g, '_');
    else a = pkg.replace(/::/g, '_') + '_';
    a = a.replace(/[^\w$]/g, '_');
    this.aliases.set(pkg, a);
    this.aliasNames.add(a);
    this.usedPkgs.add(pkg);
    return a;
  }

  pkgMember(pkg, sigil, name) {
    if ((sigil === '@' || sigil === '%') && !this.evalMode) {
      if (!this.pkgVarRefs) this.pkgVarRefs = new Map();
      let r = this.pkgVarRefs.get(pkg);
      if (!r) { r = { '@': new Set(), '%': new Set() }; this.pkgVarRefs.set(pkg, r); }
      r[sigil].add(this.gi.memberName(pkg, sigil, name));
    }
    if (this.evalMode && pkg === this.evalPkg && sigil !== '&') {
      // unqualified package variables in eval code are resolved through the scope accessor
      return '$S' + propAccess(this.gi.memberName(pkg, sigil, name));
    }
    return this.alias(pkg) + propAccess(this.gi.memberName(pkg, sigil, name));
  }

  splitQualified(name) {
    const i = name.lastIndexOf('::');
    if (i < 0) return [null, name];
    let p = name.slice(0, i);
    if (p === '' || p === 'main') p = 'main';
    return [p, name.slice(i + 2)];
  }

  pushScope() { this.scope = new Scope(this.scope); return this.scope; }
  popScope() { this.scope = this.scope.parent; }

  declare(sigil, name, opts = {}) {
    const key = sigil + name;
    let base;
    if (sigil === '$') base = '$' + name;
    else base = name;
    if (sigil !== '$' && (JS_RESERVED.has(base) || this.aliasNames.has(base) || /^ET(_|$)/.test(base))) base = base + '_';
    if (sigil === '%' && opts.hashSuffix) base = name + '_h';
    let js = base;
    let n = 1;
    while (this.scope.visibleJs(js) || (this.scope.jsNames.has(js))) js = base + '_' + (++n);
    this.scope.vars.set(key, js);
    this.scope.jsNames.add(js);
    return js;
  }

  // resolve a variable reference -> {js, kind}
  varRef(sigil, name, node) {
    // special variables
    if (sigil === '$') {
      if (/^\d+$/.test(name)) return { js: name === '0' ? 'PL.$0' : `PL.$${name}`, special: true };
      switch (name) {
        case '&': return { js: 'PL.$MATCH', special: true };
        case '`': return { js: 'PL.$PREMATCH', special: true };
        case "'": return { js: 'PL.$POSTMATCH', special: true };
        case '@': return { js: 'PL.EVAL_ERROR', special: true, lv: true };
        case '!': return { js: 'PL.ERRNO', special: true, lv: true };
        case '$': return { js: 'PL.PID', special: true };
        case '/': case '\\': case ',': case ';': case '"': case '.': case '|': case '+': case ':': case '?': case ']':
          return { js: `PL.V[${jsStr(name)}]`, special: true, lv: true };
      }
      if (name.startsWith('^')) return { js: `PL.V[${jsStr(name)}]`, special: true, lv: true };
    }
    if (sigil === '@') {
      if (name === '_') return { js: this.scope.fn.args };
      if (name === 'ARGV') return { js: 'PL.ARGV' };
      if (name === 'INC') return { js: 'PL.INCDIRS' };
      if (name === '-') return { js: 'PL.MSTART', special: true };
      if (name === '+') return { js: 'PL.MEND', special: true };
    }
    if (sigil === '%') {
      if (name === 'ENV') return { js: 'PL.ENV' };
      if (name === 'INC') return { js: 'PL.INC' };
      if (name === 'SIG') return { js: 'PL.SIG' };
      if (name === '+') return { js: 'PL.$NAMED', special: true };
    }
    if (!name.includes('::')) {
      const js = this.scope.lookup(sigil + name);
      if (js) return { js, lexical: true };
      if (this.evalMode) {
        // (record names of free variables in eval code: eval sites only need to give access
        // to lexicals with these names)
        this.evalNames.add(sigil + name);
        if (sigil === '$' && name === '_') return { js: '$S.$_' };
        return { js: '$S' + propAccess(sigil === '$' ? '$' + name : sigil + name), evalFree: true };
      }
      if (sigil === '$' && name === '_') return { js: 'PL.$_' };
      if (sigil === '$' && (name === 'a' || name === 'b') && this.sortVars) return { js: '$' + name };
      if (['STDIN', 'STDOUT', 'STDERR'].includes(name)) return { js: 'PL.' + name };
      // package variable of current package
      return { js: this.pkgMember(this.pkg, sigil, name), pkgVar: true };
    }
    const [p, n] = this.splitQualified(name);
    return { js: this.pkgMember(p, sigil, n), pkgVar: true };
  }

  // ------------------------------------------------------------------ comments
  commentsBefore(pos) {
    const out = [];
    while (this.commentIdx < this.comments.length && this.comments[this.commentIdx].pos < pos) {
      const c = this.comments[this.commentIdx++];
      out.push('//' + (c.text.startsWith(' ') || !c.text ? '' : ' ') + c.text.replace(/\*\//g, '* /'));
    }
    return out;
  }
  skipComments(pos) {
    while (this.commentIdx < this.comments.length && this.comments[this.commentIdx].pos < pos) this.commentIdx++;
  }
  trailingComment(line) {
    const c = this.comments[this.commentIdx];
    if (c && c.line === line && !c.own) {
      this.commentIdx++;
      return ' //' + (c.text.startsWith(' ') ? '' : ' ') + c.text.replace(/\*\//g, '* /');
    }
    return '';
  }

  // ------------------------------------------------------------------ program
  genProgram() {
    const body = this.ast.body;
    this.filePackages = new Set();
    const findPkgs = (stmts) => { for (const st of stmts) { if (st && st.t === 'package') { this.filePackages.add(st.name); if (st.block) findPkgs(st.block.body); } } };
    findPkgs(body);
    // collect subs (hoisted) and top-level statements
    const top = [];
    const subs = [];
    this.collectSubs(body, subs);
    // pre-declare file-level lexicals so that subs (generated first) can see them
    const predeclare = (stmts) => {
      for (const st of stmts) {
        if (!st) continue;
        if (st.t === 'package' && st.block) { predeclare(st.block.body); continue; }
        if (st.t !== 'expr') continue;
        const e = st.expr;
        const my = e.t === 'my' ? e : e.t === 'assign' && e.l.t === 'my' ? e.l : null;
        if (!my || my.decl !== 'my') continue;
        for (const v of my.vars) {
          if (v.t !== 'var') continue;
          if (this.fileScope.vars.has(v.sigil + v.name)) { v.predeclared = this.fileScope.vars.get(v.sigil + v.name); continue; }
          v.predeclared = this.declare(v.sigil, v.name);
          // first declaration: the variable is created (empty) when the module starts, like a
          // Perl pad entry, so subs called before the "my" statement executes can use it
          v.predeclFirst = true;
          this.predeclList.push(v);
        }
      }
    };
    this.predeclList = [];
    this.fileScope.fn.bodyAst = body;
    predeclare(body);
    const subCode = [];
    const subRegs = [];
    // generate top-level statements first to know package at each point
    const saveIdx = this.commentIdx;
    // generate subs in their packages
    for (const s of subs) {
      this.pkg = s.pkg;
      this.skipToComments(s);
      const code = this.genSubDef(s);
      subCode.push(code);
      const [p, n] = s.name.includes('::') ? this.splitQualified(s.name) : [s.pkg, s.name];
      subRegs.push(`PL.defsub(${this.alias(p)}, ${jsStr(n)}, ${this.subJsName(s)});`);
    }
    this.commentIdx = 0;
    this.pkg = 'main';
    const stmts = this.genStatements(body, true);
    // module wrapper
    const lines = [];
    lines.push(`// Generated by perl2js from ${this.file} -- do not edit`);
    lines.push(`import { PL, H } from '${this.opts.runtimePath || '../runtime/perl.js'}';`);
    lines.push('');
    lines.push(`PL.module(${jsStr(this.file)}, function () {`);
    const inner = [];
    const aliasLines = [];
    for (const [pkg, a] of this.aliases) aliasLines.push(`const ${a} = PL.pkg(${jsStr(pkg)});`);
    inner.push(...aliasLines);
    // declare package arrays and hashes used by this module
    if (this.pkgVarRefs) {
      for (const [pkg, r] of this.pkgVarRefs) {
        if (pkg === 'main' && !r['%'].size && !r['@'].size) continue;
        const hs = [...r['%']].filter((n) => !['ENV', 'INC', 'SIG'].includes(n));
        const as = [...r['@']].filter((n) => !['ARGV', 'INC'].includes(n));
        if (hs.length || as.length) inner.push(`PL.declVars(${this.alias(pkg)}, ${fmtList('[', hs.map(jsStr), ']')}, ${fmtList('[', as.map(jsStr), ']')});`);
      }
    }
    // stubs for autoloaded subs
    for (const pkg of this.filePackages) {
      if (!this.gi.autoload.has(pkg)) continue;
      const names = [];
      for (const [key, si] of this.gi.subs) {
        if (si.pkg !== pkg || si.file === this.file) continue;
        if (!/^Image\/ExifTool\/(Write[^/]*|Shift)\.pl$/.test(si.file)) continue;
        names.push(si.name);
      }
      if (names.length) inner.push(`PL.autostubs(${this.alias(pkg)}, ${fmtList('[', names.map(jsStr), ']')});`);
    }
    if (this.hoistedRegex.length) inner.push(...this.hoistedRegex);
    if (this.fileScope.fn.tempDecls.size) inner.push(`let ${[...this.fileScope.fn.tempDecls].join(', ')};`);
    if (this.predeclList.length) {
      const init = (v) => (v.sigil === '@' ? `${v.predeclared} = []` : v.sigil === '%' ? `${v.predeclared} = H({})` : v.predeclared);
      inner.push(`var ${this.predeclList.map(init).join(',\n  ')};`);
    }
    inner.push('');
    inner.push(...subCode);
    inner.push(...subRegs);
    if (this.codeStrings.size) {
      inner.push('');
      inner.push('// compiled code strings (for "eval")');
      inner.push(`PL.evalCodes(${jsStr(this.file)}, {`);
      for (const [src, js] of this.codeStrings) inner.push(indent(`${jsStr(src)}: ${js},`));
      inner.push('});');
    }
    inner.push('');
    inner.push(stmts);
    lines.push(indent(inner.join('\n')));
    lines.push('});');
    lines.push('');
    return lines.join('\n');
  }

  skipToComments(s) {}

  collectSubs(stmts, out) {
    for (const st of stmts) {
      if (!st) continue;
      if (st.t === 'sub') out.push(st);
      else if (st.t === 'package' && st.block) this.collectSubs(st.block.body, out);
      else if (st.t === 'begin' || st.t === 'endblock') this.collectSubs(st.block.body, out);
      else if (st.t === 'bare') this.collectSubs(st.block.body, out);
    }
  }

  subJsName(s) {
    const n = s.name.replace(/^.*::/, '');
    if (!s.jsName) {
      let js = n;
      if (JS_RESERVED.has(js) || this.aliasNames.has(js) || /^ET(_|$)/.test(js)) js = js + '_';
      // avoid duplicate function names in the same module (subs with same name in different packages)
      this.usedSubNames = this.usedSubNames || new Map();
      const k = js;
      let i = 1;
      while (this.usedSubNames.has(js) && this.usedSubNames.get(js) !== s) js = k + '_' + (++i);
      this.usedSubNames.set(js, s);
      s.jsName = js;
    }
    return s.jsName;
  }

  // ------------------------------------------------------------------ subs
  subInfo(s) {
    const [p, n] = s.name.includes('::') ? this.splitQualified(s.name) : [s.pkg, s.name];
    return this.gi.subs.get(p + '::' + n);
  }

  genSubDef(s) {
    const si = this.subInfo(s) || {};
    const jsName = this.subJsName(s);
    const saveScope = this.scope;
    const fn = new FnCtx({ isSub: true, usesWantarray: si.usesWantarray, outParams: si.outParams, name: s.name });
    fn.aliasArgs = !!si.aliasArgs;
    fn.returnsList = si.returnsList;
    this.scope = new Scope(this.fileScope, fn);
    const { params, body } = this.genSubBody(s.body, si, fn);
    this.scope = saveScope;
    const comments = [];
    return `function ${jsName}(${params}) {\n${indent(body)}\n}`;
  }

  // returns { params, body }
  genSubBody(block, si, fn) {
    let stmts = block.body;
    fn.bodyAst = stmts;
    let params;
    const pre = [];
    if (si && si.params && !si.usesArgs && !si.outParams.size && si.leadCount !== undefined) {
      // simple parameter list
      const names = [];
      for (const v of si.leadParams) {
        if (v.sigil === '$') names.push(this.declare('$', v.name));
        else if (v.sigil === '@') names.push('...' + this.declare('@', v.name));
        else if (v.sigil === '%') {
          const t = '_hargs';
          names.push('...' + t);
          pre.push(`let ${this.declare('%', v.name)} = PL.hl(${t});`);
        }
      }
      params = names.join(', ');
      stmts = stmts.slice(si.leadCount);
      fn.args = '[]';
    } else {
      params = '..._';
      fn.args = '_';
      this.scope.jsNames.add('_');
      if (si && si.outParams && si.outParams.size) fn.outParams = si.outParams;
    }
    if (fn.usesWantarray) pre.push('const $wantarray = PL.WA(); ');
    const saveSym = this.symRefs;
    this.symRefs = false;
    let body = this.genStatements(stmts, false, { implicitReturn: true });
    this.symRefs = saveSym;
    // regex capture variables ($1 etc.) are dynamically scoped: restore them on exit
    let usesRegex = false;
    walkSkippingSubs(stmts, (n) => { if (n.t === 'match' || n.t === 'subst') usesRegex = true; });
    if (usesRegex && !fn.isEval) body = `const _M = PL.M;\ntry {\n${indent(body)}\n} finally {\n  PL.M = _M;\n}`;
    const temps = fn.tempDecls.size ? [`let ${[...fn.tempDecls].join(', ')};`] : [];
    return { params, body: [...temps, ...pre, body].filter((x) => x !== '').join('\n') };
  }

  // anonymous sub
  genAnonSub(e) {
    const saveScope = this.scope;
    const fn = new FnCtx({ isSub: true });
    // check for wantarray / out params in anon sub
    walkSkippingSubs(e.body.body, (n) => { if (n.t === 'wantarray') fn.usesWantarray = true; });
    this.scope = new Scope(saveScope, fn);
    // simple param detection
    const fakeSi = this.analyzeAnon(e.body);
    const { params, body } = this.genSubBody(e.body, fakeSi, fn);
    this.scope = saveScope;
    return `function (${params}) {\n${indent(body)}\n}`;
  }

  analyzeAnon(block) {
    // reuse analyzeSub logic via global helper if available
    if (this.opts.analyzeSub) return this.opts.analyzeSub({ name: '__ANON__', pkg: this.pkg, body: block }, this.gi);
    return null;
  }

  // ------------------------------------------------------------------ statements
  genStatements(stmts, isTop, opts = {}) {
    const out = [];
    // find goto labels in this statement list
    const labelIdx = new Map();
    stmts.forEach((st, i) => {
      if (st && st.label) labelIdx.set(st.label, i);
      if (st && st.t === 'label') labelIdx.set(st.label, i);
    });
    let gotoWraps = [];
    for (const [label, idx] of labelIdx) {
      // find first earlier statement that contains a goto to this label
      let first = -1;
      for (let i = 0; i < idx; ++i) {
        if (containsGoto(stmts[i], label)) { first = i; break; }
      }
      if (first >= 0) gotoWraps.push({ label, first, idx });
    }
    if (gotoWraps.length) {
      // only handle one wrap at a time (nested recursively)
      const w = gotoWraps[0];
      const before = stmts.slice(0, w.first);
      const inside = stmts.slice(w.first, w.idx);
      const after = stmts.slice(w.idx);
      // hoist "my" declarations from inside region
      const decls = [];
      for (const st of inside) collectTopMy(st, decls);
      const res = [];
      if (before.length) res.push(this.genStatements(before, isTop));
      const declared = [];
      for (const d of decls) {
        if (d.sigil === '$' && !this.scope.vars.has('$' + d.name + '#hoisted')) {
          const js = this.declare('$', d.name);
          declared.push(js);
          d.node.hoisted = js;
        } else if (d.sigil === '@' || d.sigil === '%') {
          const js = this.declare(d.sigil, d.name);
          declared.push(js);
          d.node.hoisted = js;
        }
      }
      if (declared.length) res.push(`let ${declared.join(', ')};`);
      this.scope.fn.gotoLabels.set(w.label, `break ${w.label};`);
      res.push(`${w.label}: {\n${indent(this.genStatements(inside, isTop))}\n}`);
      const afterStmts = after.slice();
      if (afterStmts[0].t === 'label') afterStmts.shift();
      else afterStmts[0] = Object.assign({}, afterStmts[0], { label: undefined });
      if (afterStmts.length) res.push(this.genStatements(afterStmts, isTop, opts));
      return res.filter((x) => x).join('\n');
    }
    for (let i = 0; i < stmts.length; ++i) {
      const st = stmts[i];
      if (!st) continue;
      if (st.pos !== undefined) out.push(...this.commentsBefore(st.pos));
      const isLast = i === stmts.length - 1 || stmts.slice(i + 1).every((x) => !x || x.t === 'nop' || x.t === 'sub' || x.t === 'subdecl');
      // "local" statements wrap the rest of the block in try/finally
      const loc = this.findLocal(st);
      if (loc) {
        const rest = stmts.slice(i + 1);
        out.push(this.genLocal(st, loc, rest, opts));
        break;
      }
      let code = this.genStatement(st, isTop, isLast && opts.implicitReturn);
      if (code === null || code === undefined) continue;
      if (st.endLine) code += this.trailingComment(st.endLine);
      if (st.endPos !== undefined && st.t !== 'sub') this.skipComments(st.endPos);
      out.push(code);
    }
    return out.filter((x) => x !== '').join('\n');
  }

  // find 'local' declaration at top of statement (expression statement)
  findLocal(st) {
    if (st.t !== 'expr') return null;
    let e = st.expr;
    if (e.t === 'assign' && e.l.t === 'my' && e.l.decl === 'local') return e.l;
    if (e.t === 'my' && e.decl === 'local') return e;
    return null;
  }

  genLocal(st, loc, rest, opts) {
    // local $_ / local ($_, ...) : treat $_ as lexical
    const out = [];
    const restores = [];
    const assigns = [];
    for (const v of loc.vars) {
      if (v.t === 'var' && v.sigil === '$' && v.name === '_') {
        const js = this.declare('$', '_');
        out.push(`let ${js};`);
        continue;
      }
      if (v.t === 'glob' || (v.t === 'var' && v.sigil === '*')) continue;
      if (v.t === 'var' && v.sigil === '$' && v.name === '/') {
        const r = this.scope.fn.newTemp();
        out.push(`${r} = PL.local(PL.V, '/');`);
        restores.push(`${r}();`);
        continue;
      }
      // container/key
      let container, key;
      if (v.t === 'elem' && v.kind === 'hash') {
        container = this.genContainer(v.base, true);
        key = this.genKey(v.idx);
      } else if (v.t === 'var' && v.sigil === '$') {
        const r = this.varRef('$', v.name, v);
        const m = /^(.*)(\.\$\w+|\[[^\]]+\])$/.exec(r.js);
        if (m) { container = m[1]; key = m[2].startsWith('.') ? jsStr(m[2].slice(1)) : m[2].slice(1, -1); }
        else if (r.lexical) {
          // local on a lexical isn't legal Perl, but just save/restore
          const t = this.scope.fn.newTemp();
          out.push(`${t} = ${r.js};`);
          restores.push(`${r.js} = ${t};`);
          continue;
        } else this.error('Unsupported local variable ' + v.name, st);
      } else if (v.t === 'var' && (v.sigil === '@' || v.sigil === '%')) {
        const r = this.varRef(v.sigil, v.name, v);
        const t = this.scope.fn.newTemp();
        out.push(`${t} = ${r.js}; ${r.js} = ${v.sigil === '@' ? '[]' : 'H({})'};`);
        restores.push(`${r.js} = ${t};`);
        continue;
      } else {
        this.error('Unsupported local expression ' + v.t, st);
      }
      const r = this.scope.fn.newTemp();
      out.push(`${r} = PL.local(${container}, ${key});`);
      restores.push(`${r}();`);
    }
    // assignment part
    if (st.expr.t === 'assign') {
      const lhs = loc.vars.length === 1 && !loc.paren ? loc.vars[0] : { t: 'list', items: loc.vars, paren: true };
      out.push(this.genStatement({ t: 'expr', expr: { t: 'assign', op: '=', l: lhs, r: st.expr.r }, line: st.line }, false));
    }
    const restCode = this.genStatements(rest, false, opts);
    if (!restores.length) return [...out, restCode].join('\n');
    return `${out.join('\n')}\ntry {\n${indent(restCode)}\n} finally {\n${indent(restores.reverse().join('\n'))}\n}`;
  }

  genStatement(st, isTop, implicitReturn) {
    if (st.line) this.curLine = st.line;
    switch (st.t) {
      case 'nop': case 'subdecl': return '';
      case 'sub': return '';   // hoisted
      case 'package':
        if (st.block) {
          const save = this.pkg;
          this.pkg = st.name;
          const code = this.genStatements(st.block.body, isTop);
          this.pkg = save;
          return `{\n${indent(code)}\n}`;
        }
        this.pkg = st.name;
        return `// package ${st.name}`;
      case 'use':
        if (st.module === 'strict') {
          const refs = !st.args || JSON.stringify(st.args).includes('refs');
          if (refs) this.symRefs = !!st.no;
          return '';
        }
        return this.genUse(st);
      case 'begin': return this.genBlockStmts(st.block);
      case 'endblock': return `PL.atEnd(function () {\n${indent(this.genBlockStmts(st.block, true))}\n});`;
      case 'label': {
        return `// label ${st.label}`;
      }
      case 'if': return this.genIf(st, implicitReturn);
      case 'while': return this.genWhile(st);
      case 'dowhile': return this.genDoWhile(st);
      case 'cfor': return this.genCFor(st);
      case 'foreach': return this.genForeach(st);
      case 'bare': return this.genBare(st, implicitReturn);
      case 'expr': return this.genExprStmt(st, implicitReturn);
    }
    this.error('Unknown statement type ' + st.t, st);
  }

  genBlockStmts(block, implicitReturn) {
    this.pushScope();
    const saveSym = this.symRefs;
    const code = this.genStatements(block.body, false, { implicitReturn });
    this.symRefs = saveSym;
    this.popScope();
    return code;
  }

  genBlock(block, implicitReturn) {
    return `{\n${indent(this.genBlockStmts(block, implicitReturn))}\n}`;
  }

  genUse(st) {
    const mod = st.module;
    if (['strict', 'warnings', 'integer', 'lib', 'bytes', 'utf8', 'overload', 'locale', 'open', 'feature',
      'Exporter', 'vars', 'constant', 'subs', 'sort', 're', 'less', 'filetest', 'if'].includes(mod) && mod !== 'vars' && mod !== 'constant') {
      return '';
    }
    if (st.no) return '';
    if (mod === 'vars') return '';
    if (mod === 'constant') {
      // use constant NAME => value;
      if (st.args && st.args.t === 'list' && st.args.items.length === 2) {
        const name = st.args.items[0].t === 'str' ? st.args.items[0].v : st.args.items[0].name;
        return `PL.defsub(${this.alias(this.pkg)}, ${jsStr(name)}, function () { return ${this.genExpr(st.args.items[1], 'S')}; });`;
      }
      if (st.args && st.args.t === 'anonhash') {
        const out = [];
        const it = st.args.items;
        for (let i = 0; i < it.length; i += 2) {
          const name = it[i].t === 'str' ? it[i].v : it[i].name;
          out.push(`PL.defsub(${this.alias(this.pkg)}, ${jsStr(name)}, function () { return ${this.genExpr(it[i + 1], 'S')}; });`);
        }
        return out.join('\n');
      }
      this.error('Unsupported use constant', st);
    }
    // module import
    let args = '';
    if (st.args) {
      const items = st.args.t === 'list' ? st.args.items : [st.args];
      const names = [];
      for (const it of items) {
        if (it.t === 'str') names.push(it.v);
        else if (it.t === 'list') for (const x of it.items) if (x.t === 'str') names.push(x.v);
      }
      args = names.length ? `, [${names.map(jsStr).join(', ')}]` : '';
      if (st.args && items.length === 0) args = ', []';
    }
    return `PL.use(${jsStr(mod)}, ${this.alias(this.pkg)}${args});`;
  }

  // ------------------------------------------------------------------ control statements
  genIf(st, implicitReturn) {
    // "my $x = ... if COND": declare variable outside of the conditional
    let pre = '';
    if (st.modifier && st.conds[0].block.body.length === 1) {
      const inner = st.conds[0].block.body[0];
      if (inner.t === 'expr') {
        const e = inner.expr;
        const my = e.t === 'my' ? e : e.t === 'assign' && e.l.t === 'my' ? e.l : null;
        if (my && my.decl === 'my') {
          const names = [];
          for (const v of my.vars) {
            if (v.t !== 'var' || v.hoisted) continue;
            const js = v.predeclared || this.declare(v.sigil, v.name);
            v.hoisted = js;
            names.push(v.sigil === '$' ? js : `${js} = ${v.sigil === '@' ? '[]' : 'H({})'}`);
          }
          if (names.length) pre = `${my.vars.some((v) => v.predeclared) ? 'var' : 'let'} ${names.join(', ')};\n`;
          if (e.t === 'my') return pre;
        }
      }
    }
    return pre + this.genIf2(st, implicitReturn);
  }

  genIf2(st, implicitReturn) {
    // goto into a later branch of an if/elsif chain?
    const branchLabels = st.conds.map((c) => firstLabel(c.block)).concat([st.else ? firstLabel(st.else) : null]);
    const gotoBranch = branchLabels.findIndex((l, i) => l && st.conds.slice(0, Math.min(i, st.conds.length)).some((c) => containsGoto(c.block, l)));
    if (gotoBranch > 0) return this.genIfWithGoto(st, gotoBranch, branchLabels[gotoBranch], implicitReturn);
    let out = '';
    st.conds.forEach((c, i) => {
      const cond = this.genCond(c.cond);
      out += (i ? ' else if (' : 'if (') + cond.pre + cond.code + ') ' + this.genBlockWithPre(c.block, cond.decls, implicitReturn);
      if (cond.pre) this.error('cond pre', st);
    });
    if (st.else) out += ' else ' + this.genBlock(st.else, implicitReturn);
    // hoisted declarations from conditions
    return this.wrapCondDecls(out, st);
  }

  genIfWithGoto(st, idx, label, implicitReturn) {
    const flag = '_goto_' + label;
    const blk = '_if_' + label;
    this.scope.fn.gotoLabels.set(label, `{ ${flag} = true; break ${blk}; }`);
    let out = `let ${flag} = false;\n${blk}: `;
    let inner = '';
    st.conds.forEach((c, i) => {
      if (i === idx) {
        inner += ` else if (${this.genBool(c.cond)}) ${flag} = true;`;
        return;
      }
      inner += (i ? ' else if (' : 'if (') + this.genBool(c.cond) + ') ' + (i > idx ? this.genBlock(c.block, implicitReturn) : this.genBlock(c.block, implicitReturn));
    });
    if (idx === st.conds.length) inner += ` else ${flag} = true;`;
    else if (st.else) inner += ' else ' + this.genBlock(st.else, implicitReturn);
    out += `{\n${indent(inner)}\n}`;
    const target = idx < st.conds.length ? st.conds[idx].block : st.else;
    const body = target.body.slice();
    if (body[0].t === 'label') body.shift();
    else body[0] = Object.assign({}, body[0], { label: undefined });
    out += `\nif (${flag}) ` + this.genBlock({ t: 'block', body }, implicitReturn);
    // later branches (after the goto target) can't be reached when flag set... they are in the chain above
    if (idx < st.conds.length - 1) this.error('goto into middle branch not supported', st);
    return out;
  }

  // condition with possible "my" declarations
  genCond(e) {
    const decls = [];
    collectMy(e, decls);
    const declLines = [];
    for (const d of decls) {
      if (d.node.hoisted) continue;
      const js = this.declare(d.sigil, d.name);
      d.node.hoisted = js;
      declLines.push(js);
    }
    const code = this.genBool(e);
    return { code, pre: '', decls: declLines };
  }

  wrapCondDecls(code, st) {
    if (!this.pendingCondDecls || !this.pendingCondDecls.length) return code;
    return code;
  }

  genBlockWithPre(block, decls, implicitReturn) {
    return this.genBlock(block, implicitReturn);
  }

  loopLabel(st, kind) {
    const fn = this.scope.fn;
    const desc = { label: st.label || null, kind, jsLabel: st.label || null, used: false };
    return desc;
  }

  genLoopBody(block, desc) {
    this.scope.fn.loops.push(desc);
    const code = this.genBlock(block);
    this.scope.fn.loops.pop();
    return code;
  }

  // statement-level declarations for "my" in conditions (emitted before the statement)
  hoistMy(e) {
    const decls = [];
    collectMy(e, decls);
    const names = [];
    for (const d of decls) {
      if (d.node.hoisted) continue;
      const js = this.declare(d.sigil, d.name);
      d.node.hoisted = js;
      names.push(d.sigil === '$' ? js : `${js} = ${d.sigil === '@' ? '[]' : 'H({})'}`);
    }
    return names.length ? `let ${names.join(', ')};\n` : '';
  }

  genWhile(st) {
    const pre = st.cond ? this.hoistMy(st.cond) : '';
    const desc = this.loopLabel(st, 'loop');
    let cond;
    if (!st.cond) cond = 'true';
    else if (st.cond.t === 'readline') {
      // while (<FH>) assigns $_
      cond = `(PL.$_ = ${this.genExpr(st.cond, 'S')}) !== undefined`;
    } else cond = this.genBool(st.cond);
    const lbl = st.label ? st.label + ': ' : '';
    if (st.cont) {
      this.scope.fn.loops.push(desc);
      const body = this.genBlock(st.block);
      const cont = this.genBlock(st.cont);
      this.scope.fn.loops.pop();
      return `${pre}${lbl}for (; ${cond}; (() => ${cont})()) ${body}`;
    }
    return `${pre}${lbl}while (${cond}) ${this.genLoopBody(st.block, desc)}`;
  }

  genDoWhile(st) {
    const desc = this.loopLabel(st, 'do');
    this.scope.fn.loops.push({ kind: 'bare', label: null, jsLabel: null, isDo: true });
    const body = this.genBlock(st.block);
    this.scope.fn.loops.pop();
    return `do ${body} while (${this.genBool(st.cond)});`;
  }

  genCFor(st) {
    this.pushScope();
    let init = '';
    if (st.init) {
      if (st.init.t === 'assign' && st.init.l.t === 'my') {
        const decls = [];
        collectMy(st.init, decls);
        for (const d of decls) { const js = this.declare(d.sigil, d.name); d.node.hoisted = js; }
        init = 'let ' + this.genExpr(st.init, 'V');
      } else init = this.genExpr(st.init, 'V');
    }
    const cond = st.cond ? this.genBool(st.cond) : '';
    const step = st.step ? this.genExpr(st.step, 'V') : '';
    const desc = this.loopLabel(st, 'loop');
    const body = this.genLoopBody(st.block, desc);
    this.popScope();
    const lbl = st.label ? st.label + ': ' : '';
    return `${lbl}for (${init}; ${cond}; ${step}) ${body}`;
  }

  genForeach(st) {
    const lbl = st.label ? st.label + ': ' : '';
    const desc = this.loopLabel(st, 'loop');
    this.pushScope();
    let varName;
    let jsVar;
    if (!st.var) {
      varName = '_';
      jsVar = this.declare('$', '_');
    } else if (st.var.my) {
      varName = st.var.name;
      jsVar = this.declare('$', st.var.name);
    } else {
      // foreach $x (...) with existing variable: Perl localizes it; we use a new lexical
      varName = st.var.name;
      const existing = this.scope.lookup('$' + varName);
      jsVar = this.declare('$', st.var.name);
    }
    // does the body modify the loop variable?  (aliasing)
    const modifies = modifiesVar(st.block, varName, this);
    const listNode = st.list;
    let listCode;
    const single = listNode.t === 'list' && listNode.items.length === 1 ? listNode.items[0] : listNode;
    if (this.scope.fn.aliasArgs && single.t === 'var' && single.sigil === '@' && single.name === '_') {
      // arguments passed as references: iterate over the boxes
      const bT = '_b' + (++this.scope.fn.temps);
      this.scope.vars.set('$' + varName, `${bT}.v`);
      const body = this.genLoopBody(st.block, desc);
      this.popScope();
      return `${lbl}for (const ${bT} of PL.argBoxes(${this.scope.fn.args})) ${body}`;
    }
    if (modifies && (single.t === 'var' && single.sigil === '@' || single.t === 'deref' && single.sigil === '@')) {
      const arr = this.genList(single);
      const idx = '_i' + (++this.scope.fn.temps);
      const arrT = '_a' + this.scope.fn.temps;
      // alias: generate body with loop var mapped to array element
      this.scope.vars.set('$' + varName, `${arrT}[${idx}]`);
      const body = this.posResetBody(varName, this.genLoopBody(st.block, desc));
      this.popScope();
      return `${lbl}for (let ${arrT} = ${arr}, ${idx} = 0; ${idx} < ${arrT}.length; ++${idx}) ${body}`;
    }
    if (modifies) {
      // general aliasing: iterate over boxes referring to the list elements
      const items = listNode.t === 'list' ? listNode.items : [listNode];
      const parts = items.map((it) => this.aliasBoxes(it));
      const bT = '_b' + (++this.scope.fn.temps);
      this.scope.vars.set('$' + varName, `${bT}.v`);
      const body = this.posResetBody(varName, this.genLoopBody(st.block, desc));
      this.popScope();
      return `${lbl}for (const ${bT} of [${parts.join(', ')}]) ${body}`;
    }
    listCode = this.genList(listNode);
    const body = this.posResetBody(varName, this.genLoopBody(st.block, desc));
    this.popScope();
    return `${lbl}for (let ${jsVar} of ${listCode}) ${body}`;
  }

  // reset pos() of the loop variable at the start of each foreach iteration
  posResetBody(varName, body) {
    const h = this.posReset(varName);
    if (!h || !body.startsWith('{')) return body;
    return `{\n  ${h}._pos = undefined;${body.slice(1)}`;
  }

  // JS code for boxes aliasing the elements of one foreach list item
  aliasBoxes(it) {
    if ((it.t === 'var' && it.sigil === '$') || it.t === 'elem' || (it.t === 'deref' && it.sigil === '$')) {
      return `PL.lv(() => ${this.genExpr(it, 'S')}, (_v) => { ${this.genLvalue(it)} = _v; })`;
    }
    if ((it.t === 'var' && it.sigil === '@') || (it.t === 'deref' && it.sigil === '@')) return `...PL.aboxes(${this.genList(it)})`;
    if (it.t === 'slice') {
      const cont = this.genContainer(it.base, true);
      return `...PL.${it.kind === 'array' ? 'sboxes' : 'hboxes'}(${cont}, ${this.genList(it.list)})`;
    }
    if (it.t === 'call' && it.name === 'values' && it.args.length === 1) {
      const a = it.args[0];
      if ((a.t === 'var' && a.sigil === '%') || (a.t === 'deref' && a.sigil === '%')) return `...PL.hvboxes(${this.genContainer(a, false)})`;
    }
    if (it.t === 'list' && it.paren) return it.items.map((x) => this.aliasBoxes(x)).join(', ');
    return `...PL.vboxes(${this.genList(it)})`;
  }

  genBare(st, implicitReturn) {
    // bare block: acts as a loop that executes once (last/next exit it)
    const usesCtl = blockUsesLoopCtl(st.block);
    if (!usesCtl && !st.label) return this.genBlock(st.block, implicitReturn);
    const label = st.label || ('_blk' + (++this.scope.fn.labelCounter));
    this.scope.fn.loops.push({ kind: 'bare', label: st.label || null, jsLabel: label });
    const code = this.genBlock(st.block, implicitReturn);
    this.scope.fn.loops.pop();
    return `${label}: ${code}`;
  }

  genLoopCtl(e) {
    const fn = this.scope.fn;
    const loops = fn.loops;
    if (e.op === 'redo') this.error('redo not supported', e);
    if (e.label) {
      const target = [...loops].reverse().find((l) => l.label === e.label);
      if (!target) return e.op === 'last' ? `break ${e.label};` : `continue ${e.label};`;
      if (target.kind === 'bare') return `break ${target.jsLabel};`;
      return e.op === 'last' ? `break ${e.label};` : `continue ${e.label};`;
    }
    const inner = loops[loops.length - 1];
    if (!inner) {
      // last/next outside of a loop in this function (exits a loop in the caller in Perl) -- not supported
      return `PL.loopOut(${jsStr(e.op)});`;
    }
    if (inner.kind === 'bare') {
      if (inner.isDo) {
        // do {} while: Perl doesn't treat as loop; find enclosing real loop
        const real = [...loops].reverse().find((l) => !l.isDo);
        if (real && real.kind === 'bare') return `break ${real.jsLabel};`;
        if (real) {
          // need a label on the real loop... use plain break/continue (may be wrong inside do-while)
          this.warn('last/next inside do-while', e);
        }
      }
      return `break ${inner.jsLabel};`;
    }
    return e.op === 'last' ? 'break;' : 'continue;';
  }

  // ------------------------------------------------------------------ expression statements
  genExprStmt(st, implicitReturn) {
    let e = st.expr;
    let hoist;
    if (e.t === 'my') hoist = '';
    else if (e.t === 'assign' && e.l.t === 'my' && e.l.decl !== 'local') hoist = this.hoistMy(e.r);
    else hoist = this.hoistMy(e);
    // assignment with control flow in rhs:  my $x = A || return;
    const ctl = splitControlAssign(e);
    if (ctl) {
      const first = this.genVoid(ctl.assign);
      const lv = ctl.assign.l.t === 'my' ? Object.assign({}, ctl.assign.l.vars[0], { t: 'var' }) : ctl.assign.l;
      const test = { t: 'logop', op: ctl.op, l: lv, r: ctl.ctl };
      return hoist + first + '\n' + this.genVoid(test);
    }
    if (implicitReturn && this.scope.fn.isSub && hasTopControl(e)) return hoist + this.genVoid(e);
    if (implicitReturn && this.scope.fn.isSub) {
      // last statement of a sub: return its value
      if (!isControl(e)) {
        if (e.t === 'my' || (e.t === 'assign' && e.l.t === 'my')) {
          // declaration: emit, then return the variable
          return hoist + this.genVoid(e);
        }
        if (e.t === 'logop' || e.t === 'cond') {
          return hoist + this.genReturn({ t: 'return', e }, true);
        }
        return hoist + this.genReturn({ t: 'return', e }, true);
      }
    }
    return hoist + this.genVoid(e);
  }

  // generate expression in void context as statement(s)
  genVoid(e) {
    switch (e.t) {
      case 'logop': {
        if (e.op === 'xor') break;
        // A or B  ->  if (!A) B ;  A and B -> if (A) B
        const neg = e.op === 'or' || e.op === '||';
        if (e.op === '//') return `if (${this.genExpr(e.l, 'S')} === undefined) ${this.genVoidBlock(e.r)}`;
        const c = this.genBool(e.l);
        return `if (${neg ? '!' + paren(c) : c}) ${this.genVoidBlock(e.r)}`;
      }
      case 'cond':
        return `if (${this.genBool(e.c)}) ${this.genVoidBlock(e.a)} else ${this.genVoidBlock(e.b)}`;
      case 'list':
        if (!e.paren || e.items.length !== 1) return e.items.map((x) => this.genVoid(x)).filter((x) => x).join('\n');
        return this.genVoid(e.items[0]);
      case 'return': return this.genReturn(e);
      case 'loopctl': return this.genLoopCtl(e);
      case 'goto': {
        const g = this.scope.fn.gotoLabels.get(e.label);
        if (!g) this.error(`goto ${e.label} not supported here`, e);
        return g;
      }
      case 'gotosub': return `return ${this.genExpr(e.e, 'S')}(...${this.scope.fn.args});`;
      case 'my': {
        // declaration only
        const names = [];
        let kw = 'let';
        for (const v of e.vars) {
          if (v.t !== 'var') continue;
          if (v.hoisted) continue;
          if (v.predeclFirst) continue;   // already created at module start
          if (v.predeclared) kw = 'var';
          const js = v.predeclared || this.declare(v.sigil, v.name);
          names.push(v.sigil === '$' ? js : v.sigil === '@' ? `${js} = []` : `${js} = H({})`);
        }
        return names.length ? `${kw} ${names.join(', ')};` : '';
      }
      case 'assign':
        if (e.op === '=' && e.l.t === 'my' && !e.l.vars.some((v) => v.hoisted)) {
          let code = this.genMyAssign(e);
          // new variable: reset pos() holder if this name is a //g match target
          for (const v of e.l.vars) {
            if (v.t !== 'var' || v.sigil !== '$') continue;
            const h = this.posReset(v.name);
            if (h) code += ` ${h}._pos = undefined;`;
          }
          return code;
        }
        return this.genAssign(e, 'V') + ';';
      case 'evalblock': {
        return this.genEvalBlock(e, 'V') + ';';
      }
      case 'doblock': {
        // do BLOCK in void context = plain block (but keep scoping)
        return this.genBlock(e.block);
      }
      case 'call':
        if (e.args && e.args.some(isControl)) {
          const i = e.args.findIndex(isControl);
          return [...e.args.slice(0, i).map((x) => this.genVoid(x)), this.genVoid(e.args[i])].filter((x) => x).join('\n');
        }
        if (e.name === 'die' || e.name === 'exit') return this.genExpr(e, 'V') + ';';
        break;
    }
    const code = this.genExpr(e, 'V');
    if (!code) return '';
    return code + ';';
  }

  genVoidBlock(e) {
    const code = this.genVoid(e);
    return `{\n${indent(code)}\n}`;
  }

  genReturn(e, implicit) {
    if (this.inSortBlock) this.error('return in sort block', e);
    if (!e.e) {
      if (this.scope.fn.returnsList) return 'return PL.RL([]);';
      if (this.scope.fn.usesWantarray) return 'return $wantarray ? PL.RL([]) : undefined;';
      return this.scope.fn.isEval ? 'return undefined;' : 'return;';
    }
    const fn = this.scope.fn;
    let x = e.e;
    // control expressions on rhs (eg. return $x or die) are rare
    if (fn.usesWantarray) {
      // return in wantarray-aware sub: generate both list and scalar forms
      if (isListish(x, this.gi, this.pkg)) {
        return `return $wantarray ? PL.RL(${this.genList(x)}) : ${this.genExpr(x, 'S')};`;
      }
      return `return ${this.genExpr(x, 'S')};`;
    }
    if (x.t === 'list' && x.items.length === 0) return 'return PL.RL([]);';
    if (x.t === 'method' || x.t === 'callref') {
      // pass through callee's return value (may be a marked list)
      return `return ${this.genExpr(x, 'R')};`;
    }
    if (isListish(x, this.gi, this.pkg) && !(x.t === 'match' || x.t === 'call' && !x.builtin)) {
      // list return: mark with scalar conversion rule
      const rule = scalarRule(x);
      return `return PL.RL(${this.genList(x)}, ${jsStr(rule)});`;
    }
    if (x.t === 'call' && !x.builtin && isListish(x, this.gi, this.pkg)) {
      // propagate callee's return value (may be marked list)
      return `return ${this.genCall(x, 'R')};`;
    }
    if (x.t === 'method' || x.t === 'callref') {
      return `return ${this.genExpr(x, 'R')};`;
    }
    if (x.t === 'cond') {
      return `return ${this.genBool(x.c)} ? ${this.genRetVal(x.a)} : ${this.genRetVal(x.b)};`;
    }
    return `return ${this.genExpr(x, 'S')};`;
  }

  genRetVal(x) {
    if (isListish(x, this.gi, this.pkg) && x.t !== 'match' && !(x.t === 'call' && !x.builtin) && x.t !== 'method' && x.t !== 'callref') {
      return `PL.RL(${this.genList(x)}, ${jsStr(scalarRule(x))})`;
    }
    if (x.t === 'method' || x.t === 'callref' || (x.t === 'call' && !x.builtin)) return this.genExpr(x, 'R');
    return this.genExpr(x, 'S');
  }

  // my ($a, $b) = ... ; my $x = ...;
  genMyAssign(e) {
    const my = e.l;
    const kw = my.vars.some((v) => v.predeclared) ? 'var' : 'let';
    const decl = (v) => v.predeclared || this.declare(v.sigil, v.name);
    if (!my.paren && my.vars.length === 1) {
      const v = my.vars[0];
      if (v.sigil === '$') {
        const rhs = this.genExpr(e.r, 'S');
        return `${kw} ${decl(v)} = ${rhs};`;
      }
      if (v.sigil === '@') {
        const rhs = this.genListCopy(e.r);
        return `${kw} ${decl(v)} = ${rhs};`;
      }
      if (v.sigil === '%') {
        const rhs = this.genHashFromList(e.r);
        return `${kw} ${decl(v)} = ${rhs};`;
      }
    }
    // list declaration
    let rhs = this.genList(e.r);
    const fnc = this.scope.fn;
    if (e.r.t === 'var' && e.r.sigil === '@' && e.r.name === '_' && fnc.outParams && fnc.outParams.size) {
      // unbox by-reference arguments
      const pos = [...fnc.outParams].map((p) => p - fnc.shifts).filter((p) => p >= 0);
      rhs = `PL.ua(${rhs}, [${pos.join(', ')}])`;
    }
    const names = [];
    const post = [];
    for (const v of my.vars) {
      if (v.t === 'undef') { names.push(''); continue; }
      if (v.sigil === '$') names.push(decl(v));
      else if (v.sigil === '@') { names.push('...' + decl(v)); break; }
      else if (v.sigil === '%') {
        const t = '_r' + (++this.scope.fn.temps);
        names.push('...' + t);
        post.push(`${kw} ${decl(v)} = PL.hl(${t});`);
        break;
      }
    }
    return `${kw} [${names.join(', ')}] = ${rhs};` + (post.length ? '\n' + post.join('\n') : '');
  }

  // ------------------------------------------------------------------ expressions
  genScalar(e) { return this.genExpr(e, 'S'); }
  genList(e) { return this.genExpr(e, 'L'); }
  genBool(e) { return this.genExpr(e, 'B'); }

  // list that must be a fresh array (for assignment to arrays)
  genListCopy(e) {
    const code = this.genList(e);
    if (e.t === 'var' || e.t === 'deref' || (e.t === 'list' && e.items.length === 1 && (e.items[0].t === 'var' || e.items[0].t === 'deref'))) {
      return `[...${code}]`;
    }
    return code;
  }

  // compile code strings appearing as "CodeKey => 'string'" pairs in a list
  scanCodePairs(items) {
    for (let i = 0; i + 1 < items.length; ++i) {
      const k = items[i];
      const key = k.t === 'str' ? k.v : k.t === 'bareword' ? k.name : null;
      if (key === null) continue;
      const v = items[i + 1];
      if (CODE_KEYS.has(key) && v.t === 'str') this.compileCodeString(v.v, v);
      else if (CODE_KEYS.has(key) && v.t === 'num') this.compileCodeString(String(v.v), v);
      else if (key === 'Format' && v.t === 'str' && /\[.*\$/.test(v.v)) { const m = /\[(.*)\]/.exec(v.v); if (m) this.compileCodeString(m[1], v); }
      else if (key === 'WriteAlso' && v.t === 'anonhash') for (let j = 1; j < v.items.length; j += 2) if (v.items[j].t === 'str') this.compileCodeString(v.items[j].v, v.items[j]);
    }
  }

  genHashFromList(e) {
    if ((e.t === 'list') && e.items.length === 0) return 'H({})';
    if (e.t === 'list') this.scanCodePairs(e.items);
    if (e.t === 'anonhash') this.error('hash assigned from anon hash ref', e);
    const lit = this.tryHashLiteral(e.t === 'list' ? e.items : [e]);
    if (lit) return lit;
    return `PL.hl(${this.genList(e)})`;
  }

  // try to generate H({k: v, ...}) for constant keys
  tryHashLiteral(items, opts = {}) {
    if (items.length % 2) return null;
    const parts = [];
    for (let i = 0; i < items.length; i += 2) {
      const k = items[i];
      let key;
      if (k.t === 'str') key = k.v;
      else if (k.t === 'bareword') key = k.name;
      else if (k.t === 'num') key = numKey(k);
      else return null;
      if (isListish(items[i + 1], this.gi, this.pkg) && items[i + 1].t !== 'match') return null;
      if (items[i + 1].t === 'match') return null;
      let val;
      const v = items[i + 1];
      if (CODE_KEYS.has(key) && (v.t === 'str' || v.t === 'num') && !opts.noCode) {
        this.compileCodeString(String(v.v), items[i + 1]);
        val = this.genExpr(v, 'S');
      } else if (key === 'Format' && v.t === 'str' && /\[.*\$/.test(v.v)) {
        const m = /\[(.*)\]/.exec(v.v);
        if (m) this.compileCodeString(m[1], v);
        val = this.genExpr(v, 'S');
      } else if (key === 'WriteAlso' && v.t === 'anonhash') {
        // values are code strings
        for (let j = 1; j < v.items.length; j += 2) if (v.items[j].t === 'str') this.compileCodeString(v.items[j].v, v.items[j]);
        val = this.genExpr(v, 'S');
      } else {
        val = this.genExpr(v, 'S');
      }
      const kjs = /^(0|[1-9]\d*)$/.test(key) && key.length < 16 ? key : isPropName(key) && key !== '__proto__' ? key : jsStr(key);
      parts.push(`${kjs}: ${val}`);
    }
    return 'H(' + fmtList('{ ', parts, ' }', parts.length > 3) + ')';
  }

  compileCodeString(src, node, quiet) {
    if (this.codeStrings.has(src)) return;
    if (this.evalMode) return;
    if (this.failedCode && this.failedCode.has(src)) return;
    try {
      const js = this.compileEval(src, 'Image::ExifTool');
      this.codeStrings.set(src, js);
    } catch (err) {
      if (!this.failedCode) this.failedCode = new Set();
      this.failedCode.add(src);
      if (!quiet) this.warn(`Can't compile code string ${JSON.stringify(src.slice(0, 60))}: ${err.message.split('\n')[0]}`, node);
    }
  }

  // compile a Perl code string to a JS function taking a scope accessor $S
  compileEval(src, pkg) {
    const p = new Parser(src, this.file + '(eval)', { knownSubs: [] });
    p.pkg = pkg;
    const stmts = p.parseStatements(false);
    const saveScope = this.scope, savePkg = this.pkg, saveEval = this.evalMode, saveEvalPkg = this.evalPkg;
    const saveComments = this.comments, saveIdx = this.commentIdx;
    this.comments = [];
    this.commentIdx = 0;
    const fn = new FnCtx({ isSub: true, isEval: true });
    fn.args = '_';
    fn.bodyAst = stmts;
    this.scope = new Scope(null, fn);
    this.scope.jsNames.add('$S');
    this.pkg = pkg;
    this.evalMode = true;
    this.evalPkg = pkg;
    let body;
    try {
      body = this.genStatements(stmts, false, { implicitReturn: true });
      const temps = fn.tempDecls.size ? `let ${[...fn.tempDecls].join(', ')};\n` : '';
      body = temps + body;
    } finally {
      this.scope = saveScope; this.pkg = savePkg; this.evalMode = saveEval; this.evalPkg = saveEvalPkg;
      this.comments = saveComments; this.commentIdx = saveIdx;
    }
    // simplify single return
    // (functions that don't use the scope accessor take no argument, so it isn't built)
    const arg = /\$S\b/.test(body) ? '$S' : '';
    const m = /^return ([^;]*);$/.exec(body);
    if (m && !body.includes('\n')) return `(${arg}) => ${m[1].startsWith('{') ? '(' + m[1] + ')' : m[1]}`;
    return `function (${arg}) {\n${indent(body)}\n}`;
  }

  genExpr(e, ctx) {
    const code = this.genExpr2(e, ctx);
    if (code === undefined) this.error(`No code generated for ${e.t}`, e);
    return code;
  }

  // wrap scalar code for context
  ctxScalar(code, ctx, e) {
    switch (ctx) {
      case 'L': return `[${code}]`;
      case 'B': return this.truthy(code, e);
      default: return code;
    }
  }

  truthy(code, e) {
    if (e && isBoolExpr(e)) return code;
    if (/^-?\d+(\.\d+)?$/.test(code)) return Number(code) !== 0 ? 'true' : 'false';
    return `PL.t(${code})`;
  }

  // numeric operand (parenthesized if not atomic, so it can be used in a larger expression)
  num(e) {
    const c = this.genExpr(e, 'S');
    if (isNumExpr(e)) return atomic(c) ? c : '(' + c + ')';
    return `PL.num(${c})`;
  }
  // string operand
  str(e) {
    if (e.t === 'str') return jsStr(e.v);
    const c = this.genExpr(e, 'S');
    if (isStrExpr(e)) return c;
    return `PL.str(${c})`;
  }

  genExpr2(e, ctx) {
    switch (e.t) {
      case 'num': {
        let c = numLit(e);
        if (ctx === 'B') return e.v ? 'true' : 'false';
        return ctx === 'L' ? `[${c}]` : c;
      }
      case 'str': {
        if (ctx === 'B') return (e.v === '' || e.v === '0') ? 'false' : 'true';
        // string literals that look like Perl code may be eval'd later: precompile them
        if (!this.evalMode && LOOKS_LIKE_CODE.test(e.v) && e.v.length < 5000) this.compileCodeString(e.v, e, true);
        return this.ctxScalar(jsStr(e.v), ctx);
      }
      case 'interp': return this.ctxScalar(this.genInterp(e), ctx, e);
      case 'joinlist': return `PL.jl(${this.genList(e.e)})`;
      case 'var': return this.genVar(e, ctx);
      case 'elem': return this.ctxScalar(this.genElem(e, false), ctx, e);
      case 'slice': return this.genSlice(e, ctx);
      case 'lslice': {
        const lst = this.genList(e.list);
        if (e.idx.t === 'num' || (e.idx.t === 'list' && e.idx.items.length === 1 && e.idx.items[0].t === 'num')) {
          const n = e.idx.t === 'num' ? e.idx : e.idx.items[0];
          const acc = n.v < 0 ? `${paren(lst)}.at(${n.v})` : `${paren(lst)}[${n.v}]`;
          return ctx === 'L' ? `PL.lsl(${lst}, [${n.v}])` : this.ctxScalar(acc, ctx);
        }
        const code = `PL.lsl(${lst}, ${this.genList(e.idx)})`;
        if (ctx === 'L') return code;
        return this.ctxScalar(`${code}.at(-1)`, ctx);
      }
      case 'deref': return this.genDeref(e, ctx);
      case 'lastidx': return this.ctxScalar(`(${this.genContainer(e.base, false)}.length - 1)`, ctx);
      case 'call': return this.genCall(e, ctx);
      case 'method': return this.genMethod(e, ctx);
      case 'callref': return this.genCallRef(e, ctx);
      case 'funcref': return this.ctxScalar(this.subRef(e.name), ctx);
      case 'binop': return this.genBinop(e, ctx);
      case 'logop': return this.genLogop(e, ctx);
      case 'unop': return this.genUnop(e, ctx);
      case 'ref': return this.genRef(e, ctx);
      case 'preinc': case 'postinc': return this.ctxScalar(this.genIncDec(e, ctx), ctx);
      case 'assign': return this.genAssign(e, ctx);
      case 'cond': {
        const c = this.genBool(e.c);
        const sub = ctx === 'B' ? 'B' : ctx === 'L' ? 'L' : 'S';
        return `(${c} ? ${this.genExpr(e.a, sub)} : ${this.genExpr(e.b, sub)})`;
      }
      case 'list': return this.genListExpr(e, ctx);
      case 'anonarray': return this.ctxScalar(this.genArrayItems(e.items), ctx);
      case 'anonhash': {
        this.scanCodePairs(e.items);
        const lit = this.tryHashLiteral(e.items);
        return this.ctxScalar(lit || `PL.hl(${this.genArrayItems(e.items)})`, ctx);
      }
      case 'anonsub': return this.ctxScalar(this.genAnonSub(e), ctx);
      case 'match': return this.genMatch(e, ctx);
      case 'subst': return this.genSubst(e, ctx);
      case 'trans': return this.genTrans(e, ctx);
      case 'qr': return this.ctxScalar(this.genQr(e), ctx);
      case 'filetest': return this.ctxScalar(`PL.ft(${jsStr(e.op)}, ${e.arg ? this.genExpr(e.arg, 'S') : 'PL.$_'})`, ctx);
      case 'readline': return this.ctxScalar(`PL.readline(${this.fhCode(e.fh)})`, ctx);
      case 'doblock': return this.genDoBlock(e, ctx);
      case 'evalblock': return this.genEvalBlock(e, ctx);
      case 'evalstr': {
        const code = this.genEvalStr(e);
        if (ctx === 'L') return `PL.L(${code})`;
        if (ctx === 'B') return `PL.t(PL.sc(${code}))`;
        if (ctx === 'V') return code;
        return `PL.sc(${code})`;
      }
      case 'dofile': return this.ctxScalar(`PL.doFile(${this.genExpr(e.e, 'S')})`, ctx);
      case 'require':
        if (e.module) return this.ctxScalar(`PL.require(${jsStr(e.module)})`, ctx);
        return this.ctxScalar(`PL.requireFile(${this.genExpr(e.e, 'S')})`, ctx);
      case 'sort': return this.genSort(e, ctx);
      case 'map': return this.genMap(e, ctx);
      case 'grep': return this.genGrep(e, ctx);
      case 'print': return this.ctxScalar(this.genPrint(e), ctx);
      case 'return':
        this.error('return in expression', e);
        break;
      case 'loopctl': this.error(`${e.op} in expression`, e); break;
      case 'goto': this.error('goto in expression', e); break;
      case 'wantarray': return this.ctxScalar('$wantarray', ctx);
      case 'my': return this.genMyExpr(e, ctx);
      case 'bareword': {
        if (['STDIN', 'STDOUT', 'STDERR'].includes(e.name)) return this.ctxScalar('PL.' + e.name, ctx);
        return this.ctxScalar(jsStr(e.name), ctx);
      }
      case 'range': {
        if (ctx === 'L') return `PL.range(${this.genExpr(e.l, 'S')}, ${this.genExpr(e.r, 'S')})`;
        this.error('flip-flop operator not supported', e);
        break;
      }
      case 'glob': return this.ctxScalar(e.name ? `PL.glob(${jsStr(e.name)})` : `PL.glob(${this.genExpr(e.e, 'S')})`, ctx);
      case 'undef': return ctx === 'L' ? '[undefined]' : 'undefined';
      case 'gotosub': this.error('goto &sub in expression', e); break;
    }
    this.error('Unsupported expression type ' + e.t, e);
  }

  genInterp(e) {
    let out = '`';
    for (const p of e.parts) {
      if (p.t === 'str') out += tmplStr(p.v);
      else if (p.t === 'joinlist') out += '${PL.jl(' + this.genList(p.e) + ')}';
      else out += '${' + this.str(p) + '}';
    }
    return out + '`';
  }

  genListExpr(e, ctx) {
    if (ctx === 'L') {
      if (e.items.length === 1) return this.genList(e.items[0]);
      return this.genArrayItems(e.items);
    }
    if (e.items.length === 0) return ctx === 'B' ? 'false' : 'undefined';
    if (e.items.length === 1) return this.genExpr(e.items[0], ctx);
    if (ctx === 'V') return e.items.map((x) => this.genExpr(x, 'V')).join(', ');
    // comma operator in scalar context: last value
    const parts = e.items.slice(0, -1).map((x) => this.genExpr(x, 'V'));
    parts.push(this.genExpr(e.items[e.items.length - 1], ctx));
    return '(' + parts.join(', ') + ')';
  }

  // array literal from list items (flattening lists)
  genArrayItems(items) {
    const parts = items.map((x) => {
      if (isListish(x, this.gi, this.pkg)) return '...' + this.genList(x);
      return this.genExpr(x, 'S');
    });
    return fmtList('[', parts, ']');
  }

  // ------------------------------------------------------------------ variables
  genVar(e, ctx) {
    const r = this.varRef(e.sigil, e.name, e);
    if (e.sigil === '$') return this.ctxScalar(r.js, ctx, e);
    if (e.sigil === '@') {
      if (ctx === 'L') return r.js;
      if (ctx === 'B') return `${r.js}.length > 0`;
      return `${r.js}.length`;
    }
    if (e.sigil === '%') {
      if (ctx === 'L') return `PL.hlist(${r.js})`;
      if (ctx === 'B') return `PL.hcount(${r.js}) > 0`;
      return `PL.hcount(${r.js})`;
    }
    if (e.sigil === '&') return this.ctxScalar(this.subRef(e.name), ctx);
    this.error('bad var', e);
  }

  // code for array/hash container (base of element/slice access)
  // base: {t:'var', sigil:'@'|'%'} or {t:'deref', sigil, e}
  genContainer(base, lvalue) {
    if (base.t === 'var') {
      if (base.sigil === '@' && (base.name === '-' || base.name === '+')) return base.name === '-' ? 'PL.MSTART' : 'PL.MEND';
      return this.varRef(base.sigil, base.name, base).js;
    }
    if (base.t === 'deref') {
      const inner = base.e;
      if (this.symRefs && (inner.t === 'var' || inner.t === 'interp' || inner.t === 'str')) return this.symWrap(base.sigil, this.genExpr(inner, 'S'));
      if (lvalue) return this.genAutoviv(inner, base.sigil);
      return this.genExpr(inner, 'S');
    }
    this.error('bad container ' + base.t, base);
  }

  // expression yielding container with autovivification (for lvalues)
  genAutoviv(e, sigil) {
    const make = sigil === '@' ? 'PL.av' : 'PL.hv';
    if (e.t === 'elem') {
      const cont = this.genContainer(e.base, true);
      return `${make}(${cont}, ${this.genKey(e.idx, e.kind)})`;
    }
    if (e.t === 'var' && e.sigil === '$') {
      const r = this.varRef('$', e.name, e);
      if (r.lexical || r.pkgVar) return `(${r.js} ??= ${sigil === '@' ? '[]' : 'H({})'})`;
      return r.js;
    }
    return this.genExpr(e, 'S');
  }

  // key/index code for subscripts: returns JS expression
  genKey(idx, kind = 'hash') {
    if (kind === 'array') {
      if (idx.t === 'num') return numLit(idx);
      return this.genExpr(idx, 'S');
    }
    if (idx.t === 'str') return jsStr(idx.v);
    if (idx.t === 'num') return numKey(idx) === String(idx.v) && Number.isSafeInteger(idx.v) && idx.v >= 0 ? String(idx.v) : jsStr(numKey(idx));
    if (idx.t === 'list' && idx.items.length > 1) return `PL.mkey(${this.genList(idx)})`;
    if (isStrExpr(idx)) return this.genExpr(idx, 'S');
    return `PL.k(${this.genExpr(idx, 'S')})`;
  }

  // element access
  genElem(e, lvalue) {
    const base = e.base;
    // special arrays
    if (base.t === 'var' && base.sigil === '@' && base.name === '_' && this.scope.fn.outParams && this.scope.fn.outParams.size) {
      if (e.idx.t === 'num') {
        const pos = e.idx.v + this.scope.fn.shifts;
        if (this.scope.fn.outParams.has(pos)) return `${this.scope.fn.args}[${e.idx.v}].v`;
      }
    }
    if (base.t === 'var' && base.sigil === '@' && (base.name === '-' || base.name === '+')) {
      return `PL.${base.name === '-' ? 'mstart' : 'mend'}(${this.genExpr(e.idx, 'S')})`;
    }
    if (base.t === 'var' && base.sigil === '@' && base.name === '_' && this.scope.fn.aliasArgs && !lvalue && !this.scope.vars.has('@_')) {
      // arguments may be references (boxes) in a sub that modifies its arguments
      return `PL.ub(${this.scope.fn.args}.at(${this.genKey(e.idx, 'array')}))`;
    }
    if (base.t === 'var' && base.sigil === '%' && base.name === '+') return `PL.$NAMED[${this.genKey(e.idx)}]`;
    const cont = this.genContainer(base, lvalue);
    const opt = !lvalue && base.t === 'deref' ? '?.' : '';
    if (e.kind === 'array') {
      const idx = e.idx;
      if (idx.t === 'num' && idx.v < 0) {
        if (lvalue) return `${paren(cont)}[${paren(cont)}.length${idx.v}]`;
        return `${paren(cont)}${opt ? '?.' : '.'}at(${idx.v})`;
      }
      if (idx.t === 'unop' && idx.op === 'neg') {
        const c = paren(cont);
        return lvalue ? `${c}[${c}.length - ${this.num(idx.e)}]` : `${c}${opt ? '?.' : '.'}at(-${paren(this.num(idx.e))})`;
      }
      const k = this.genKey(idx, 'array');
      if (idx.t === 'num') return `${paren(cont)}${opt}[${k}]`;
      // Perl array indices are truncated to integers and may be negative (count from the end):
      // Array.prototype.at() has exactly these semantics for reads
      if (!lvalue) return `${paren(cont)}${opt ? '?.' : '.'}at(${k})`;
      return `${paren(cont)}[${isIntExpr(idx) ? k : `PL.ix(${k})`}]`;
    }
    // hash
    const key = this.genKey(e.idx, 'hash');
    if (/^'[A-Za-z_$][\w$]*'$/.test(key) && key !== "'__proto__'") return `${paren(cont)}${opt || '.'}${key.slice(1, -1)}`;
    return `${paren(cont)}${opt}[${key}]`;
  }

  genSlice(e, ctx) {
    const cont = this.genContainer(e.base, false);
    let code;
    if (e.kind === 'array') code = `PL.asl(${cont}, ${this.genList(e.list)})`;
    else code = `PL.hsl(${cont}, ${this.genList(e.list)})`;
    if (ctx === 'L') return code;
    return this.ctxScalar(`${code}.at(-1)`, ctx);
  }

  symWrap(sigil, code) {
    if (!this.symRefs) return code;
    return `PL.sym${{ '$': 's', '@': 'a', '%': 'h' }[sigil]}(${code}, ${this.alias(this.pkg)})`;
  }

  genDeref(e, ctx) {
    if (e.sigil === '$') {
      // scalar deref: ref.v
      const inner = this.symWrap('$', this.genExpr(e.e, 'S'));
      return this.ctxScalar(`${paren(inner)}.v`, ctx, e);
    }
    if (e.sigil === '@') {
      const inner = this.symWrap('@', this.genExpr(e.e, 'S'));
      const arr = `PL.A(${inner})`;
      if (ctx === 'L') return arr;
      if (ctx === 'B') return `${arr}.length > 0`;
      return `${arr}.length`;
    }
    if (e.sigil === '%') {
      const inner = this.symWrap('%', this.genExpr(e.e, 'S'));
      if (ctx === 'L') return `PL.hlist(${inner})`;
      if (ctx === 'B') return `PL.hcount(${inner}) > 0`;
      return `PL.hcount(${inner})`;
    }
    if (e.sigil === '&') {
      return this.ctxScalar(`${paren(this.genExpr(e.e, 'S'))}(...${this.scope.fn.args})`, ctx);
    }
    this.error('bad deref', e);
  }

  // ------------------------------------------------------------------ lvalues and assignment
  // returns JS lvalue expression string
  genLvalue(e) {
    switch (e.t) {
      case 'var': {
        if (e.sigil === '$') {
          const r = this.varRef('$', e.name, e);
          if (r.special && !r.lv) this.error('assignment to read-only special var', e);
          return r.js;
        }
        return this.varRef(e.sigil, e.name, e).js;
      }
      case 'elem': return this.genElem(e, true);
      case 'deref':
        if (e.sigil === '$') return `${paren(this.symWrap('$', this.genExpr(e.e, 'S')))}.v`;
        break;
      case 'my': {
        if (e.vars.length === 1 && !e.paren) {
          const v = e.vars[0];
          if (v.hoisted) return v.hoisted;
          const js = this.lookupHoisted(v);
          return js;
        }
        break;
      }
      case 'list':
        if (e.items.length === 1) return this.genLvalue(e.items[0]);
        break;
      case 'slice': {
        // one-element slice used as a scalar lvalue: @a[$i] += 1
        const l = e.list;
        const one = l.t === 'list' ? (l.items.length === 1 ? l.items[0] : null) : l;
        if (one && one.t !== 'range') return this.genElem({ t: 'elem', kind: e.kind, base: e.base, idx: one }, true);
        break;
      }
      case 'cond':
        break;
      case 'call':
        if (e.name === 'substr') break;
        break;
    }
    this.error('Unsupported lvalue ' + e.t, e);
  }

  lookupHoisted(v) {
    const js = this.scope.lookup(v.sigil + v.name);
    if (!js) this.error(`undeclared ${v.sigil}${v.name}`, v);
    return js;
  }

  // assignment expression
  // assignment; also resets pos() of the target variable (as any modification does in Perl)
  genAssign(e, ctx) {
    const code = this.genAssign0(e, ctx);
    const l = e.l;
    if (l.t === 'var' && l.sigil === '$' && !/^if /.test(code)) {
      const h = this.posReset(l.name);
      if (h) return `PL.pr(${h}, ${code})`;   // (reset after evaluating the assignment)
    }
    return code;
  }

  // names of scalar variables that are //g match targets or pos() arguments in this function
  posVars() {
    const fn = this.scope.fn;
    if (!fn.posVars) {
      fn.posVars = new Set();
      const add = (t) => {
        if (!t) fn.posVars.add('_');
        else if (t.t === 'var' && t.sigil === '$') fn.posVars.add(t.name);
      };
      if (fn.bodyAst) {
        walkSkippingSubs(fn.bodyAst, (n) => {
          if (n.t === 'match' && (n.flags || '').includes('g') && !n.dynamicTarget) add(n.target);
          if (n.t === 'call' && n.name === 'pos') add(n.args[0]);
        });
      }
    }
    return fn.posVars;
  }

  // pos() holder to reset when variable $name is modified (or null)
  posReset(name) {
    if (!this.posVars().has(name)) return null;
    const r = this.varRef('$', name);
    if (!r || !r.js || r.special && name !== '_') return null;
    return this.posHolderFor(r.js);
  }

  genAssign0(e, ctx) {
    const op = e.op;
    let l = e.l;
    // my declarations in expressions were hoisted; treat as plain var
    if (l.t === 'my') {
      if (!l.paren && l.vars.length === 1) l = Object.assign({}, l.vars[0], { t: 'var' });
      else l = { t: 'list', items: l.vars.map((v) => (v.t === 'undef' ? v : Object.assign({}, v, { t: 'var' }))), paren: true };
    }
    if (l.t === 'local') this.error('local in expression', e);
    if (l.t === 'list' && l.paren && l.items.length === 1 && (l.items[0].t === 'cond' || l.items[0].t === 'assign')) l = l.items[0];
    if (l.t === 'assign') {
      // ($x = $y) OP= z
      const first = this.genAssign(l, 'V');
      const tl = l.l.t === 'my' ? Object.assign({}, l.l.vars[0], { t: 'var' }) : l.l;
      return `(${first}, ${this.genAssign(Object.assign({}, e, { l: tl }), ctx === 'V' ? 'S' : ctx)})`;
    }
    if (l.t === 'cond' && !(l.a.t === 'list' || l.b.t === 'list')) {
      // (C ? $a : $b) OP= z  ->  C ? ($a OP= z) : ($b OP= z)
      const c = this.genBool(l.c);
      const sub = ctx === 'V' ? 'S' : ctx;
      return `(${c} ? ${this.genAssign(Object.assign({}, e, { l: l.a }), sub)} : ${this.genAssign(Object.assign({}, e, { l: l.b }), sub)})`;
    }
    if (l.t === 'call' && l.name === 'pos' && op !== '=') {
      const tgt = this.posTarget(l.args[0]);
      const opmap = { '+=': '+', '-=': '-' };
      return `PL.setPos(${tgt}, PL.pos(${tgt}) ${opmap[op]} ${this.num(e.r)})`;
    }
    if (l.t === 'lastidx' && (op === '-=' || op === '+=')) {
      const c = l.base.t === 'deref' ? `PL.A(${this.genExpr(l.base.e, 'S')})` : this.genContainer(l.base, true);
      return `(${c}.length ${op} ${this.num(e.r)})`;
    }
    if (op === '=') {
      // list assignment?
      if (l.t === 'list' && (l.paren || l.items.length !== 1) || (l.t === 'var' && (l.sigil === '@' || l.sigil === '%')) ||
          (l.t === 'deref' && (l.sigil === '@' || l.sigil === '%')) || l.t === 'slice') {
        return this.genListAssign(l, e.r, ctx);
      }
      if (l.t === 'lastidx') {
        const c = this.genContainer(l.base, true);
        return `(${c}.length = ${this.num(e.r)} + 1)`;
      }
      if (l.t === 'deref' && l.sigil === '$') {
        const lv = this.genLvalue(l);
        const code = `${lv} = ${this.genExpr(e.r, 'S')}`;
        return ctx === 'V' ? code : this.ctxScalar(`(${code})`, ctx);
      }
      if (l.t === 'call' && l.name === 'substr') {
        // lvalue substr
        const target = l.args[0];
        const lv = this.genLvalue(target);
        const rhs = this.genExpr(e.r, 'S');
        return `(${lv} = PL.substr4(${lv}, ${this.genExpr(l.args[1], 'S')}, ${l.args[2] ? this.genExpr(l.args[2], 'S') : 'undefined'}, ${rhs}))`;
      }
      if (l.t === 'cond') {
        return `(${this.genBool(l.c)} ? ${this.genLvalue(l.a)} = ${this.genExpr(e.r, 'S')} : ${this.genLvalue(l.b)} = ${this.genExpr(e.r, 'S')})`;
      }
      if (l.t === 'call' && l.name === 'pos') {
        return `PL.setPos(${this.posTarget(l.args[0])}, ${this.genExpr(e.r, 'S')})`;
      }
      const lv = this.genLvalue(l);
      const rhs = this.genExpr(e.r, 'S');
      const code = `${lv} = ${rhs}`;
      if (ctx === 'V') return code;
      if (ctx === 'B') return this.truthy(`(${code})`);
      if (ctx === 'L') return `[${code}]`;
      return `(${code})`;
    }
    // compound assignment
    if (l.t === 'var' && (l.sigil === '@')) {
      if (op === 'x=') {
        const lv = this.genLvalue(l);
        return `PL.aset(${lv}, PL.lrep(${lv}, ${this.num(e.r)}))`;
      }
      if (op === '.=' || op === '+=') {
        // push? (@a = (@a, ...))
      }
      this.error('compound assignment to array ' + op, e);
    }
    let lv;
    let setup = '';
    if (l.t === 'elem' && hasSideEffects(l.idx)) {
      // evaluate subscript once (it appears on both sides of the generated assignment)
      const tk = this.scope.fn.newTemp();
      const tc = this.scope.fn.newTemp();
      setup = `${tc} = ${this.genContainer(l.base, true)}, ${tk} = ${this.genKey(l.idx, l.kind)}, `;
      lv = `${tc}[${tk}]`;
    } else lv = this.genLvalue(l);
    let rhs;
    const cur = { t: '__js', code: lv };
    switch (op) {
      case '+=': case '-=': case '*=':
        rhs = `${this.numCode(lv, l)} ${op[0]} ${this.num(e.r)}`; break;
      case '/=': rhs = `PL.div(${lv}, ${this.genExpr(e.r, 'S')})`; break;
      case '%=': rhs = `PL.mod(${lv}, ${this.genExpr(e.r, 'S')})`; break;
      case '**=': rhs = `${this.numCode(lv, l)} ** ${this.num(e.r)}`; break;
      case '.=': rhs = `${this.strCode(lv, l)} + ${this.str(e.r)}`; break;
      case 'x=': rhs = `PL.rep(${lv}, ${this.num(e.r)})`; break;
      case '&=': rhs = `PL.band(${lv}, ${this.genExpr(e.r, 'S')})`; break;
      case '|=': rhs = `PL.bor(${lv}, ${this.genExpr(e.r, 'S')})`; break;
      case '^=': rhs = `PL.bxor(${lv}, ${this.genExpr(e.r, 'S')})`; break;
      case '<<=': rhs = `PL.shl(${lv}, ${this.genExpr(e.r, 'S')})`; break;
      case '>>=': rhs = `PL.shr(${lv}, ${this.genExpr(e.r, 'S')})`; break;
      case '||=': {
        const code = `PL.t(${lv}) || (${lv} = ${this.genExpr(e.r, 'S')})`;
        if (ctx === 'V') return `if (!PL.t(${lv})) ${lv} = ${this.genExpr(e.r, 'S')}`;
        return ctx === 'B' ? `(${code}, PL.t(${lv}))` : `(${code}, ${lv})`;
      }
      case '&&=': {
        if (ctx === 'V') return `if (PL.t(${lv})) ${lv} = ${this.genExpr(e.r, 'S')}`;
        return `(PL.t(${lv}) && (${lv} = ${this.genExpr(e.r, 'S')}), ${lv})`;
      }
      case '//=': {
        const code = `${lv} ??= ${this.genExpr(e.r, 'S')}`;
        if (ctx === 'V') return code;
        return this.ctxScalar(`(${code})`, ctx);
      }
      default: this.error('Unsupported assignment op ' + op, e);
    }
    const code = setup ? `(${setup}${lv} = ${rhs})` : `${lv} = ${rhs}`;
    if (ctx === 'V') return code;
    return this.ctxScalar(`(${code})`, ctx);
  }

  numCode(js, node) { return node && isNumExpr(node) ? js : `PL.num(${js})`; }
  strCode(js, node) { return `PL.str(${js})`; }

  // list assignment: (lhs) = rhs
  genListAssign(l, r, ctx) {
    // array or hash target
    if (l.t === 'var' && l.sigil === '@' || l.t === 'deref' && l.sigil === '@') {
      const target = l.t === 'var' ? this.genLvalue(l) : this.genAutoviv(l.e, '@');
      const rhs = this.genListCopy(r);
      const code = l.t === 'var' && this.isLexicalArray(l) ? `${target} = ${rhs}` : `PL.aset(${target}, ${rhs})`;
      if (ctx === 'V') return code;
      if (ctx === 'B') return `(${code}).length > 0`;
      if (ctx === 'L') return `(${code})`;
      return `(${code}).length`;
    }
    if (l.t === 'var' && l.sigil === '%' || l.t === 'deref' && l.sigil === '%') {
      const target = l.t === 'var' ? this.genLvalue(l) : this.genAutoviv(l.e, '%');
      const rhs = this.genHashFromList(r);
      const code = `PL.hset(${target}, ${rhs})`;
      if (ctx === 'V') return code;
      return this.ctxScalar(`PL.hcount(${code})`, ctx);
    }
    if (l.t === 'slice') {
      const cont = this.genContainer(l.base, true);
      const fn = l.kind === 'array' ? 'PL.aslSet' : 'PL.hslSet';
      return `${fn}(${cont}, ${this.genList(l.list)}, ${this.genList(r)})`;
    }
    // (a, b, @c) = list
    const items = l.items;
    let rhs = this.genList(r);
    const fnc = this.scope.fn;
    if (r.t === 'var' && r.sigil === '@' && r.name === '_' && fnc.outParams && fnc.outParams.size) {
      // unbox by-reference arguments
      const pos = [...fnc.outParams].map((p) => p - fnc.shifts).filter((p) => p >= 0);
      rhs = `PL.ua(${rhs}, [${pos.join(', ')}])`;
    }
    // simple destructuring when all targets are simple vars/elements
    const targets = [];
    let rest = null;
    let restAssign = null;
    let simple = true;
    for (const it of items) {
      if (it.t === 'undef' || (it.t === 'call' && it.name === 'undef' && !it.args.length)) { targets.push(''); continue; }
      if (it.t === 'var' && it.sigil === '@' || it.t === 'my' && it.vars[0] && it.vars[0].sigil === '@') {
        const v = it.t === 'my' ? Object.assign({}, it.vars[0], { t: 'var' }) : it;
        if (it.t === 'my') targets.push('...' + this.genLvalue(v));
        else {
          // assign array in place (keeps references to the array valid)
          const tr = this.scope.fn.newTemp();
          targets.push('...' + tr);
          restAssign = `PL.aset(${this.genLvalue(v)}, ${tr})`;
        }
        rest = v;
        break;
      }
      if (it.t === 'var' && it.sigil === '%') { simple = false; break; }
      if (it.t === 'my') {
        targets.push(this.genLvalue(it));
        continue;
      }
      targets.push(this.genLvalue(it));
    }
    if (!simple) this.error('unsupported list assignment with hash', l);
    const t = this.scope.fn.newTemp();
    let code = `[${targets.join(', ')}] = ${t} = ${rhs}`;
    if (restAssign) code = `(${code}), ${restAssign}`;
    if (ctx === 'V') return restAssign ? code : `[${targets.join(', ')}] = ${rhs}`;
    if (ctx === 'B') return `((${code}), ${t}.length > 0)`;
    if (ctx === 'L') return `((${code}), ${t})`;
    return `((${code}), ${t}.length)`;
  }

  isLexicalArray(l) {
    return !!this.scope.lookup('@' + l.name);
  }

  genMyExpr(e, ctx) {
    // a "my" in expression context that wasn't hoisted: declare at statement level is required
    if (e.vars.length === 1 && !e.paren) {
      const v = e.vars[0];
      const js = v.hoisted || this.scope.lookup(v.sigil + v.name);
      if (!js) this.error('my in expression not hoisted', e);
      if (v.sigil === '$') return this.ctxScalar(js, ctx);
      if (v.sigil === '@') return ctx === 'L' ? js : `${js}.length`;
      return ctx === 'L' ? `PL.hlist(${js})` : `PL.hcount(${js})`;
    }
    const items = e.vars.map((v) => Object.assign({}, v, { t: v.t === 'undef' ? 'undef' : 'var' }));
    return this.genListExpr({ t: 'list', items, paren: true }, ctx);
  }

  genIncDec(e, ctx) {
    const lv = this.genLvalue(e.e);
    const d = e.op === '++' ? '+' : '-';
    if (e.t === 'preinc' || ctx === 'V') return `(${lv} = PL.num(${lv}) ${d} 1)`;
    // postfix with value used
    const t = this.scope.fn.newTemp();
    return `(${t} = PL.num(${lv}), ${lv} = ${t} ${d} 1, ${t})`;
  }

  // ------------------------------------------------------------------ operators
  genBinop(e, ctx) {
    const op = e.op;
    let code;
    switch (op) {
      case '+': case '-': case '*':
        code = `${this.num(e.l)} ${op} ${wrapNeg(this.num(e.r))}`;
        return this.ctxScalar(ctx === 'S' || ctx === 'L' ? code : `(${code})`, ctx);
      case '/': {
        if (e.r.t === 'num' && e.r.v !== 0) code = `${this.num(e.l)} / ${numLit(e.r)}`;
        else code = `PL.div(${this.genExpr(e.l, 'S')}, ${this.genExpr(e.r, 'S')})`;
        return this.ctxScalar(code, ctx);
      }
      case '%': return this.ctxScalar(`PL.mod(${this.genExpr(e.l, 'S')}, ${this.genExpr(e.r, 'S')})`, ctx);
      case '**': return this.ctxScalar(`${paren(this.num(e.l))} ** ${paren(this.num(e.r))}`, ctx);
      case '.': {
        // flatten concatenation chains
        const parts = [];
        const flat = (x) => { if (x.t === 'binop' && x.op === '.') { flat(x.l); flat(x.r); } else parts.push(x); };
        flat(e);
        code = parts.map((p) => this.str(p)).join(' + ');
        if (ctx === 'B') return this.truthy(`(${code})`);
        return this.ctxScalar(ctx === 'L' ? code : `(${code})`, ctx);
      }
      case 'x': {
        if (e.l.t === 'list' && e.l.paren && ctx === 'L') return `PL.lrep(${this.genList(e.l)}, ${this.num(e.r)})`;
        return this.ctxScalar(`PL.rep(${this.genExpr(e.l, 'S')}, ${this.num(e.r)})`, ctx);
      }
      case '==': case '!=': case '<': case '>': case '<=': case '>=': {
        const jsop = op === '==' ? '===' : op === '!=' ? '!==' : op;
        code = `${this.num(e.l)} ${jsop} ${wrapNeg(this.num(e.r))}`;
        return this.boolResult(code, ctx);
      }
      case 'eq': case 'ne': case 'lt': case 'gt': case 'le': case 'ge': {
        const jsop = { eq: '===', ne: '!==', lt: '<', gt: '>', le: '<=', ge: '>=' }[op];
        code = `${this.str(e.l)} ${jsop} ${this.str(e.r)}`;
        return this.boolResult(code, ctx);
      }
      case '<=>': return this.ctxScalar(`PL.ncmp(${this.genExpr(e.l, 'S')}, ${this.genExpr(e.r, 'S')})`, ctx);
      case 'cmp': return this.ctxScalar(`PL.scmp(${this.genExpr(e.l, 'S')}, ${this.genExpr(e.r, 'S')})`, ctx);
      case '&': return this.ctxScalar(`PL.band(${this.genExpr(e.l, 'S')}, ${this.genExpr(e.r, 'S')})`, ctx);
      case '|': return this.ctxScalar(`PL.bor(${this.genExpr(e.l, 'S')}, ${this.genExpr(e.r, 'S')})`, ctx);
      case '^': return this.ctxScalar(`PL.bxor(${this.genExpr(e.l, 'S')}, ${this.genExpr(e.r, 'S')})`, ctx);
      case '<<': return this.ctxScalar(`PL.shl(${this.genExpr(e.l, 'S')}, ${this.genExpr(e.r, 'S')})`, ctx);
      case '>>': return this.ctxScalar(`PL.shr(${this.genExpr(e.l, 'S')}, ${this.genExpr(e.r, 'S')})`, ctx);
      case 'isa': return this.boolResult(`PL.isa(${this.genExpr(e.l, 'S')}, ${this.genExpr(e.r, 'S')})`, ctx);
      case '~~': this.error('smartmatch not supported', e);
    }
    this.error('Unsupported binop ' + op, e);
  }

  boolResult(code, ctx) {
    if (ctx === 'B') return code;
    if (ctx === 'V') return code;
    if (ctx === 'L') return `[(${code}) ? 1 : '']`;
    return `((${code}) ? 1 : '')`;
  }

  genLogop(e, ctx) {
    const op = e.op;
    if (ctx === 'B') {
      if (op === '&&' || op === 'and') return `${paren2(this.genBool(e.l))} && ${paren2(this.genBool(e.r))}`;
      if (op === '||' || op === 'or') return `${paren2(this.genBool(e.l))} || ${paren2(this.genBool(e.r))}`;
      if (op === '//') return this.truthy(`(${this.genExpr(e.l, 'S')} ?? ${this.genExpr(e.r, 'S')})`);
      if (op === 'xor') return `(${this.genBool(e.l)} !== ${this.genBool(e.r)})`;
    }
    if (ctx === 'V') return this.genVoid(e).replace(/;$/, '');
    if (op === '//') {
      const code = `(${this.genExpr(e.l, 'S')} ?? ${this.genExpr(e.r, ctx === 'L' ? 'S' : 'S')})`;
      return ctx === 'L' ? `[${code}]` : code;
    }
    if (op === 'xor') return this.boolResult(`(${this.genBool(e.l)} !== ${this.genBool(e.r)})`, ctx);
    // value-returning || and &&
    const lcode = this.genExpr(e.l, 'S');
    const rcode = this.genExpr(e.r, ctx === 'L' ? 'L' : 'S');
    const simple = /^[\w$.]+$/.test(lcode) && !/\(/.test(lcode);
    let t, first;
    if (simple) { t = lcode; first = lcode; }
    else { t = this.scope.fn.newTemp(); first = `(${t} = ${lcode})`; }
    const tv = ctx === 'L' ? `[${t}]` : t;
    if (op === '||' || op === 'or') return `(PL.t(${first}) ? ${tv} : ${rcode})`;
    return `(PL.t(${first}) ? ${rcode} : ${tv})`;
  }

  genUnop(e, ctx) {
    switch (e.op) {
      case '!': {
        const b = this.genBool(e.e);
        const code = `!${paren2(b)}`;
        return this.boolResult(code, ctx);
      }
      case 'neg': return this.ctxScalar(`-${paren(this.num(e.e))}`, ctx);
      case '~': return this.ctxScalar(`PL.bnot(${this.genExpr(e.e, 'S')})`, ctx);
    }
    this.error('bad unop', e);
  }

  // \ reference
  genRef(e, ctx) {
    const x = e.e;
    let code;
    switch (x.t) {
      case 'var':
        if (x.sigil === '@' || x.sigil === '%') code = this.varRef(x.sigil, x.name, x).js;
        else if (x.sigil === '$') {
          const lv = this.genLvalue(x);
          // (a reference to a //g match target shares its pos())
          const h = this.posReset(x.name);
          code = h ? `PL.lvh(() => ${lv}, (v) => ${lv} = v, ${h})` : `PL.lv(() => ${lv}, (v) => ${lv} = v)`;
        } else if (x.sigil === '&') code = this.subRef(x.name);
        break;
      case 'funcref': code = this.subRef(x.name); break;
      case 'deref':
        if ((x.sigil === '@' || x.sigil === '%') && this.symRefs) code = this.symWrap(x.sigil, this.genExpr(x.e, 'S'));
        else if (x.sigil === '@' || x.sigil === '%') code = this.genAutoviv(x.e, x.sigil);
        else if (x.sigil === '$') code = this.genExpr(x.e, 'S');   // \$$x == $x
        else if (x.sigil === '&') code = this.genExpr(x.e, 'S');
        break;
      case 'elem': {
        const lv = this.genElem(x, true);
        code = `PL.lv(() => ${lv}, (v) => ${lv} = v)`;
        break;
      }
      case 'my': {
        // \my $x or \my @x
        const v = x.vars[0];
        const js = v.hoisted || this.scope.lookup(v.sigil + v.name);
        if (v.sigil === '$') code = `PL.lv(() => ${js}, (v) => ${js} = v)`;
        else code = js;
        break;
      }
      case 'list': {
        // \(@a) or \($a, $b)
        const refs = x.items.map((it) => this.genRef({ t: 'ref', e: it }, 'S'));
        if (ctx === 'L') return `[${refs.join(', ')}]`;
        code = refs[refs.length - 1];
        break;
      }
      case 'call':
        if (x.name && !x.builtin) { code = `PL.box(${this.genExpr(x, 'S')})`; break; }
        code = `PL.box(${this.genExpr(x, 'S')})`;
        break;
      case 'anonsub':
        code = this.genAnonSub(x);
        break;
      default:
        code = `PL.box(${this.genExpr(x, 'S')})`;
    }
    if (!code) this.error('unsupported reference', e);
    return this.ctxScalar(code, ctx);
  }

  subRef(name) {
    if (name.includes('::')) {
      const [p, n] = this.splitQualified(name);
      return `PL.subref(${this.alias(p)}, ${jsStr(n)})`;
    }
    if (this.evalMode) {
      const si = this.gi.subs.get(this.pkg + '::' + name);
      if (!si) return `PL.subref(${this.alias('Image::ExifTool')}, ${jsStr(name)})`;
    }
    const imp = !this.gi.subs.has(this.pkg + '::' + name) && this.gi.importedFrom && this.gi.importedFrom(this.file, this.pkg, name);
    if (imp) return `PL.subref(${this.alias(imp)}, ${jsStr(name)})`;
    return `PL.subref(${this.alias(this.pkg)}, ${jsStr(name)})`;
  }

  localSubJs(name) {
    const si = this.gi.subs.get(this.pkg + '::' + name);
    if (si && si.file === this.file && si.node && si.node.jsName && !this.evalMode) return si.node.jsName;
    if (si && si.file === this.file && si.node && !this.evalMode) return this.subJsName(si.node);
    return null;
  }

  // ------------------------------------------------------------------ regex
  regexLiteral(re, flags) {
    // static regex: all parts are strings
    if (re.parts.every((p) => p.t === 'str' || (p.t === 'call' && p.caseMod && p.args[0].t === 'str'))) {
      let src = '';
      for (const p of re.parts) {
        if (p.t === 'str') src += p.v;
        else src += p.name === 'quotemeta' ? quotemeta(p.args[0].v) : p.name === 'uc' ? p.args[0].v.toUpperCase() : p.args[0].v.toLowerCase();
      }
      return { static: true, src };
    }
    return { static: false };
  }

  genRegex(re, flags, opts = {}) {
    // returns JS expression for compiled regex
    const lit = this.regexLiteral(re, flags);
    const rflags = flags.replace(/[gcoer]/g, '');
    if (lit.static) {
      try {
        const t = perlre2js(lit.src, rflags);
        let jf = t.flags;
        if (opts.global) jf += 'g';
        if (t.sticky) jf += 'y';
        if (!t.sticky && !opts.global && !opts.hoist) return `/${t.source || '(?:)'}/${jf}`;
        // hoist global regexes (they carry state)
        const name = '_re' + (this.hoistedRegex.length + 1);
        this.hoistedRegex.push(`const ${name} = /${t.source || '(?:)'}/${jf};`);
        return name;
      } catch (err) {
        this.warn(`regex translation failed (${err.message}): ${lit.src}`, re);
        return `PL.re(${jsStr(lit.src)}, ${jsStr(rflags + (opts.global ? 'g' : ''))})`;
      }
    }
    // dynamic regex
    const parts = re.parts.map((p) => {
      if (p.t === 'str') return jsStr(p.v);
      if (p.t === 'joinlist') return `PL.jl(${this.genList(p.e)})`;
      return `PL.restr(${this.genExpr(p, 'S')})`;
    });
    return `PL.re(${parts.join(' + ')}, ${jsStr(rflags + (opts.global ? 'g' : ''))})`;
  }

  matchTarget(e) {
    if (e.target) return this.genExpr(e.target, 'S');
    return this.varRef('$', '_').js;
  }

  // object holding pos() for a match target: for $$ref targets use the box itself,
  // otherwise a per-function holder associated with the target expression
  posHolder(e) {
    const t = e.target;
    if (t && t.t === 'deref' && t.sigil === '$') return this.genExpr(t.e, 'S');
    const code = t ? this.genExpr(t, 'S') : this.varRef('$', '_').js;
    return { holder: this.posHolderFor(code), value: code };
  }

  posHolderFor(code) {
    const fn = this.scope.fn;
    if (!fn.posHolders) fn.posHolders = new Map();
    let h = fn.posHolders.get(code);
    if (!h) {
      h = '_pos' + (fn.posHolders.size + 1);
      fn.posHolders.set(code, h);
      fn.tempDecls.add(`${h} = PL.ph()`);
    }
    return h;
  }

  posTarget(arg) {
    if (arg && arg.t === 'deref' && arg.sigil === '$') return this.genExpr(arg.e, 'S');
    const code = arg ? this.genExpr(arg, 'S') : this.varRef('$', '_').js;
    return `${this.posHolderFor(code)}.at(${code})`;
  }

  genMatch(e, ctx) {
    const flags = e.flags || '';
    const g = flags.includes('g');
    let re;
    if (e.dynamic) {
      // $x =~ $re
      re = `PL.re(PL.restr(${this.genExpr(e.re.parts[0], 'S')}), '')`;
    } else re = this.genRegex(e.re, flags, { global: g && ctx !== 'L', hoist: g });
    const target = this.matchTarget(e);
    let code;
    if (ctx === 'L' && !e.neg) {
      if (g) {
        // list-context //g starts at pos() of the target
        const holder = this.posHolder(e);
        return `PL.mgl(${target}, ${re}, ${typeof holder === 'string' ? holder : holder.holder})`;
      }
      return `PL.ml(${target}, ${re})`;
    }
    if (g) {
      const holder = this.posHolder(e);
      code = typeof holder === 'string' ? `PL.mgb(${holder}, ${re}, ${jsStr(flags)})` : `PL.mg(${target}, ${re}, ${jsStr(flags)}, ${holder.holder})`;
    } else {
      code = `PL.m(${target}, ${re})`;
    }
    if (e.neg) code = '!' + code;
    return this.boolResult(code, ctx);
  }

  genReplacement(repl) {
    if (repl.t === 'code') {
      // s///e : code block
      this.pushScope();
      const fn = this.scope.fn;
      const body = this.genStatements(repl.body, false, { implicitReturnExpr: true });
      this.popScope();
      // last statement value
      const stmts = repl.body;
      if (stmts.length === 1 && stmts[0].t === 'expr') {
        let val = this.genExpr(stmts[0].expr, 'S');
        if (repl.ee) val = `PL.evalStr(PL.str(${val}), null)`;
        return `() => ${val.startsWith('{') ? '(' + val + ')' : val}`;
      }
      // multiple statements: wrap
      const code = this.genEvalLike(stmts);
      return `() => ${code}`;
    }
    if (repl.t === 'str') return jsStr(repl.v);
    return `() => ${this.genExpr(repl, 'S')}`;
  }

  genEvalLike(stmts) {
    const saveFn = this.scope.fn;
    this.pushScope();
    const body = this.genStatements(stmts, false, { implicitReturn: true });
    this.popScope();
    return `{\n${indent(body)}\n}`;
  }

  genSubst(e, ctx) {
    if (e.neg) {
      // $x !~ s/// : true if no substitution was made
      const code = this.genSubst(Object.assign({}, e, { neg: false }), 'B');
      return this.boolResult(`!${paren2(code)}`, ctx);
    }
    const flags = e.flags || '';
    const g = flags.includes('g');
    const re = this.genRegex(e.re, flags, { global: false });
    const repl = this.genReplacement(e.repl);
    const target = unwrapParen(e.target) || { t: 'var', sigil: '$', name: '_' };
    const rval = this.genExpr(target, 'S');
    const call = `PL.s(${rval}, ${re}, ${repl}, ${g})`;
    if (flags.includes('r')) return this.ctxScalar(call, ctx);
    // assignment target
    let lv;
    if (target.t === 'assign') {
      // ($x = $y) =~ s///
      const a = this.genAssign(target, 'V');
      const tl = target.l.t === 'my' ? Object.assign({}, target.l.vars[0], { t: 'var' }) : target.l;
      lv = this.genLvalue(tl);
      const code = `${a}, ${lv} = PL.s(${lv}, ${re}, ${repl}, ${g})`;
      if (ctx === 'V') return code;
      return this.ctxScalar(`(${code}, PL.SC)`, ctx);
    }
    if (target.t === 'my') {
      lv = this.genLvalue(target);
    } else lv = this.genLvalue(target);
    const code = `${lv} = ${call}`;
    if (ctx === 'V') return code;
    if (ctx === 'B') return `(${code}, PL.SC > 0)`;
    return this.ctxScalar(`(${code}, PL.SC)`, ctx);
  }

  genTrans(e, ctx) {
    if (e.neg) {
      const code = this.genTrans(Object.assign({}, e, { neg: false }), 'B');
      return this.boolResult(`!${paren2(code)}`, ctx);
    }
    const flags = e.flags || '';
    let target = unwrapParen(e.target) || { t: 'var', sigil: '$', name: '_' };
    const countOnly = e.to === '' && !flags.includes('d') && !flags.includes('r');
    if (target.t === 'assign' || (target.t === 'list' && target.paren && target.items.length === 1 && target.items[0].t === 'assign')) {
      if (target.t === 'list') target = target.items[0];
      const a = this.genAssign(target, 'V');
      const tl = target.l.t === 'my' ? Object.assign({}, target.l.vars[0], { t: 'var' }) : target.l;
      const lv = this.genLvalue(tl);
      const code = `${a}, ${lv} = PL.tr(${lv}, ${jsStr(e.from)}, ${jsStr(e.to)}, ${jsStr(flags)})`;
      if (ctx === 'V') return code;
      return this.ctxScalar(`(${code}, PL.SC)`, ctx);
    }
    const rval = this.genExpr(target, 'S');
    if (countOnly) return this.ctxScalar(`PL.trc(${rval}, ${jsStr(e.from)}, ${jsStr(flags)})`, ctx);
    const call = `PL.tr(${rval}, ${jsStr(e.from)}, ${jsStr(e.to)}, ${jsStr(flags)})`;
    if (flags.includes('r')) return this.ctxScalar(call, ctx);
    const lv = this.genLvalue(target);
    const code = `${lv} = ${call}`;
    if (ctx === 'V') return code;
    return this.ctxScalar(`(${code}, PL.SC)`, ctx);
  }

  genQr(e) {
    const lit = this.regexLiteral(e.re, e.flags);
    if (lit.static) return `PL.qr(${jsStr(lit.src)}, ${jsStr(e.flags || '')})`;
    const parts = e.re.parts.map((p) => (p.t === 'str' ? jsStr(p.v) : `PL.restr(${this.genExpr(p, 'S')})`));
    return `PL.qr(${parts.join(' + ')}, ${jsStr(e.flags || '')})`;
  }

  // ------------------------------------------------------------------ blocks as expressions
  genDoBlock(e, ctx) {
    this.pushScope();
    const body = this.genStatements(e.block.body, false, { implicitReturn: true, exprBlock: true });
    this.popScope();
    // use an arrow function so that "return" works for value
    if (containsReturn(e.block)) this.warn('return inside do block', e);
    const code = `(() => {\n${indent(this.withImplicit(e.block.body, body))}\n})()`;
    return ctx === 'L' ? `PL.L(${code})` : ctx === 'B' ? this.truthy(code) : code;
  }

  // statements with implicit return of last expression value (for do/eval blocks)
  withImplicit(stmts, body) { return body; }

  genEvalBlock(e, ctx) {
    const saveFn = this.scope.fn;
    // eval block: new "function" boundary for return, but loop control can't cross it
    const fn = new FnCtx({ isSub: true });
    fn.args = saveFn.args;
    fn.outParams = saveFn.outParams; fn.aliasArgs = saveFn.aliasArgs;
    fn.shifts = saveFn.shifts;
    fn.usesWantarray = false;
    fn.tempDecls = saveFn.tempDecls;
    fn.temps = saveFn.temps;
    const save = this.scope;
    this.scope = new Scope(save, fn);
    const body = this.genStatements(e.block.body, false, { implicitReturn: true });
    saveFn.temps = fn.temps;
    this.scope = save;
    const code = `PL.evalBlock(() => {\n${indent(body)}\n})`;
    if (ctx === 'L') return `PL.L(${code})`;
    if (ctx === 'B') return this.truthy(code);
    return code;
  }

  genEvalStr(e) {
    const x = e.e;
    // eval "require Module"
    if (x.t === 'str' && /^\s*(require|use)\s+[\w:]+\s*;?\s*$/.test(x.v)) {
      const m = /^\s*(?:require|use)\s+([\w:]+)/.exec(x.v);
      return `PL.evalRequire(${jsStr(m[1])})`;
    }
    if (x.t === 'interp' && x.parts.length === 2 && x.parts[0].t === 'str' && /^\s*require\s+$/.test(x.parts[0].v)) {
      return `PL.evalRequire(${this.genExpr(x.parts[1], 'S')})`;
    }
    if (x.t === 'str') {
      // constant code string: compile now
      this.compileCodeString(x.v, x);
    }
    // (code built from an interpolated string may use any lexical: don't filter its scope)
    return `PL.evalStr(${this.genExpr(x, 'S')}, () => ${this.scopeAccessor(x.t === 'interp')})`;
  }

  // object giving eval'd code access to lexical variables in scope
  scopeAccessor(full) {
    const entries = [];
    const seen = new Set();
    for (let s = this.scope; s; s = s.parent) {
      for (const [key, js] of s.vars) {
        if (seen.has(key)) continue;
        seen.add(key);
        if (/#/.test(key)) continue;
        const sigil = key[0];
        const name = key.slice(1);
        if (sigil === '$') {
          if (js.includes('[')) {
            entries.push(`get ${jsStr(key)}() { return ${js}; }, set ${jsStr(key)}(v) { ${js} = v; }`);
          } else {
            entries.push(`get ${jsStr(key)}() { return ${js}; }, set ${jsStr(key)}(v) { ${js} = v; }`);
          }
        } else {
          entries.push(`${jsStr(key)}: ${js}`);
        }
      }
      if (s === this.fileScope) break;
    }
    if (this.evalMode) return '$S';
    const pkgAlias = this.alias(this.pkg);
    if (this.scope.fn.args !== '[]') entries.push(`'@_': ${this.scope.fn.args}`);
    // the entries are filtered later (finishScopes) to the names that eval'd code uses
    if (full) return `PL.scope(${pkgAlias}, { ${entries.join(', ')} })`;
    const id = this.scopeSites.length;
    this.scopeSites.push(entries);
    return `PL.scope(${pkgAlias}, {\u0001${id}\u0001})`;
  }

  // replace scope accessor markers in generated code, keeping only entries for variable
  // names in the set (all names when null)
  finishScopes(js, names) {
    return js.replace(/\{\u0001(\d+)\u0001\}/g, (m, id) => {
      const entries = this.scopeSites[+id].filter((e) => {
        if (!names) return true;
        const k = /^(?:get )?'([^']*)'/.exec(e);
        return !k || k[1] === '@_' || names.has(k[1]);
      });
      return entries.length ? `{ ${entries.join(', ')} }` : '{}';
    });
  }

  // ------------------------------------------------------------------ sort/map/grep
  genSort(e, ctx) {
    const list = this.genArrayItems(e.list);
    let code;
    if (e.block) {
      const saveSort = this.sortVars;
      this.sortVars = true;
      this.pushScope();
      this.scope.vars.set('$a', '$a');
      this.scope.vars.set('$b', '$b');
      const body = this.genBlockExpr(e.block, 'S');
      this.popScope();
      this.sortVars = saveSort;
      code = `PL.sort(${list}, ($a, $b) => ${body})`;
    } else if (e.subname) {
      if (typeof e.subname === 'string') {
        const [p, n] = e.subname.includes('::') ? this.splitQualified(e.subname) : [this.pkg, e.subname];
        code = `PL.sortSub(${list}, ${this.alias(p)}, ${this.subRef(e.subname)})`;
      } else {
        code = `PL.sortSub(${list}, ${this.alias(this.pkg)}, ${this.genExpr(e.subname, 'S')})`;
      }
    } else {
      code = `PL.sort(${list})`;
    }
    if (ctx === 'L') return code;
    if (ctx === 'B') return `${code}.length > 0`;
    return `${code}.length`;
  }

  // generate block as single expression value (for sort/map/grep blocks)
  genBlockExpr(block, ctx) {
    const stmts = block.body.filter((s) => s && s.t !== 'nop');
    const unret = (x) => (x.t === 'return' ? x.e : x);
    if (stmts.length === 1 && stmts[0].t === 'expr' && !hasTopControl(unret(stmts[0].expr))) {
      return paren3(this.genExpr(unret(stmts[0].expr), ctx));
    }
    const saveFn = this.scope.fn;
    const fn = new FnCtx({ isSub: true });
    fn.args = saveFn.args; fn.tempDecls = saveFn.tempDecls; fn.temps = saveFn.temps;
    fn.outParams = saveFn.outParams; fn.shifts = saveFn.shifts; fn.aliasArgs = saveFn.aliasArgs;
    const save = this.scope;
    this.scope = new Scope(save, fn);
    try {
      const body = this.genStatements(stmts.slice(0, -1), false);
      const last = stmts[stmts.length - 1];
      let ret;
      if (last.t === 'expr' && !hasTopControl(unret(last.expr))) ret = `return ${this.genExpr(unret(last.expr), ctx)};`;
      else if (last.t === 'expr' && last.expr.t === 'return' && last.expr.e) ret = `return ${this.genExpr(last.expr.e, ctx)};`;
      else ret = this.genStatement(last, false, false);
      saveFn.temps = fn.temps;
      return `{\n${indent(body + (body ? '\n' : '') + ret)}\n}`;
    } finally {
      this.scope = save;
    }
  }

  genBlockExprOld(block, ctx) {
    const stmts = block.body.filter((s) => s && s.t !== 'nop');
    if (stmts.length === 1 && stmts[0].t === 'expr') {
      return paren3(this.genExpr(stmts[0].expr, ctx));
    }
    // multi-statement block: IIFE-like arrow body
    const body = this.genStatements(stmts.slice(0, -1), false);
    const last = stmts[stmts.length - 1];
    let ret;
    if (last.t === 'expr') ret = `return ${this.genExpr(last.expr, ctx)};`;
    else ret = this.genStatement(last, false, false);
    return `{\n${indent(body + (body ? '\n' : '') + ret)}\n}`;
  }

  // map/grep whose block modifies $_ (aliased to the list elements in Perl)
  genMapAlias(e, ctx, isGrep) {
    const parts = e.list.map((it) => this.aliasBoxes(it));
    this.pushScope();
    this.declare('$', '_');
    const bT = '_b' + (++this.scope.fn.temps);
    this.scope.vars.set('$_', `${bT}.v`);
    let fnBody;
    if (e.block) fnBody = this.genBlockExpr(e.block, isGrep ? 'B' : 'L');
    else fnBody = paren3(this.genExpr(e.expr, isGrep ? 'B' : 'L'));
    this.popScope();
    const code = isGrep ? `[${parts.join(', ')}].filter((${bT}) => ${fnBody}).map((${bT}) => ${bT}.v)`
      : `[${parts.join(', ')}].flatMap((${bT}) => ${fnBody})`;
    if (ctx === 'L') return code;
    if (ctx === 'B') return `${code}.length > 0`;
    return `${code}.length`;
  }

  genMap(e, ctx) {
    if (modifiesVar(e.block || e.expr, '_', this)) return this.genMapAlias(e, ctx, false);
    const list = this.genArrayItems(e.list);
    this.pushScope();
    const v = this.declare('$', '_');
    let fnBody;
    if (e.block) {
      const b = this.genBlockExpr(e.block, 'L');
      fnBody = b;
    } else {
      fnBody = paren3(this.genExpr(e.expr, 'L'));
    }
    this.popScope();
    const code = `${paren(list)}.flatMap((${v}) => ${fnBody})`;
    if (ctx === 'L') return code;
    if (ctx === 'B') return `${code}.length > 0`;
    return `${code}.length`;
  }

  genGrep(e, ctx) {
    if (modifiesVar(e.block || e.expr, '_', this)) return this.genMapAlias(e, ctx, true);
    const list = this.genArrayItems(e.list);
    this.pushScope();
    const v = this.declare('$', '_');
    let fnBody;
    if (e.block) fnBody = this.genBlockExpr(e.block, 'B');
    else fnBody = paren3(this.genExpr(e.expr, 'B'));
    this.popScope();
    const code = `${paren(list)}.filter((${v}) => ${fnBody})`;
    if (ctx === 'L') return code;
    if (ctx === 'B') return `${code}.length > 0`;
    return `${code}.length`;
  }

  genPrint(e) {
    const fh = e.fh ? this.fhExpr(e.fh) : 'null';
    const args = e.args.length ? this.genArrayItems(e.args) : `[${this.varRef('$', '_').js}]`;
    if (e.fn === 'printf') return `PL.printf(${fh}, ${args})`;
    return `PL.print(${fh}, ${args}${e.fn === 'say' ? ', true' : ''})`;
  }

  fhExpr(fh) {
    if (fh.t === 'bareword') return this.fhCode(fh.name);
    return this.genExpr(fh, 'S');
  }

  fhCode(name) {
    if (!name) return 'PL.STDIN';
    if (name.startsWith('$')) return this.varRef('$', name.slice(1)).js;
    if (['STDIN', 'STDOUT', 'STDERR'].includes(name)) return 'PL.' + name;
    return `PL.glob(${jsStr(name)})`;
  }

  // ------------------------------------------------------------------ calls
  genCallArgs(args, si, firstCode) {
    // si: sub info with outParams (positions)
    if (si && si.aliasArgs) {
      // sub modifies its arguments in place: pass references to all of them
      return args.map((a, i) => (i === 0 && firstCode !== undefined ? firstCode : this.aliasBoxes(a))).join(', ');
    }
    const parts = args.map((a, i) => {
      if (i === 0 && firstCode !== undefined) return firstCode;
      if (si && si.outParams && si.outParams.has(i)) return this.outArg(a);
      if (isListish(a, this.gi, this.pkg)) return '...' + this.genList(a);
      return this.genExpr(a, 'S');
    });
    return parts.join(', ');
  }

  // argument passed by reference (aliased @_ element)
  outArg(a) {
    if (a.t === 'deref' && a.sigil === '$') return this.genExpr(a.e, 'S');
    if (a.t === 'elem' && a.base.t === 'var' && a.base.name === '_' && a.base.sigil === '@' && a.idx.t === 'num' &&
        this.scope.fn.outParams && this.scope.fn.outParams.has(a.idx.v + this.scope.fn.shifts)) {
      return `${this.scope.fn.args}[${a.idx.v}]`;
    }
    if (a.t === 'my' || a.t === 'var' || a.t === 'elem') {
      const lv = this.genLvalue(a);
      return `PL.lv(() => ${lv}, (v) => ${lv} = v)`;
    }
    return `PL.box(${this.genExpr(a, 'S')})`;
  }

  // resolve a named (non-builtin) sub call: returns { code: function expression, si }
  resolveCall(name) {
    if (name.includes('::')) {
      const [p, n] = this.splitQualified(name);
      const si = this.gi.subs.get(p + '::' + n);
      if (si && si.file === this.file && !this.evalMode && p === si.pkg && si.node) return { code: this.subJsName(si.node), si };
      return { code: `${this.alias(p)}${propAccess(this.gi.memberName(p, '&', n))}`, si };
    }
    let si = this.gi.subs.get(this.pkg + '::' + name);
    if (si) {
      if (si.file === this.file && si.node && !this.evalMode) return { code: this.subJsName(si.node), si };
      if (this.evalMode) return { code: `$S${propAccess(name)}`, si };
      return { code: `${this.alias(this.pkg)}${propAccess(this.gi.memberName(this.pkg, '&', name))}`, si };
    }
    // imported?
    const imp = this.gi.importedFrom && this.gi.importedFrom(this.file, this.pkg, name);
    if (imp) {
      si = this.gi.subs.get(imp + '::' + name);
      return { code: `${this.alias(imp)}${propAccess(this.gi.memberName(imp, '&', name))}`, si };
    }
    if (this.evalMode) {
      // unqualified call in eval'd code: resolve through scope (falls back to package)
      si = this.gi.subs.get('Image::ExifTool::' + name);
      if (si) return { code: `ET${propAccess(name)}`, si, needAlias: true };
      return { code: `$S${propAccess(name)}`, si: null };
    }
    // unknown sub: call through PL.subref (resolves at run time, supports AUTOLOAD)
    return { code: `PL.subref(${this.alias(this.pkg)}, ${jsStr(name)})`, si: null };
  }

  genCall(e, ctx) {
    const name = e.name;
    if (e.builtin || BUILTINS.has(name)) {
      const b = this.genBuiltin(e, ctx);
      if (b !== null) return b;
    }
    if (name.startsWith('CORE::')) return this.genBuiltin(Object.assign({}, e, { name: name.slice(6) }), ctx);
    if (name === 'Exporter::export_ok_tags' || name === 'Exporter::export_tags') {
      return `PL.exportTags(${this.alias(this.pkg)}, ${jsStr(name.endsWith('ok_tags') ? 'EXPORT_OK' : 'EXPORT')}, ${this.genArrayItems(e.args || [])})`;
    }
    // special functions
    if (/^(utf8|Encode|POSIX|Time::Local|Time::HiRes|Digest::MD5|Digest::SHA|Compress::Zlib|File::Basename|Cwd|Scalar::Util|List::Util|Storable|UNIVERSAL|overload|IO::Uncompress::\w+|IO::Compress::\w+)::/.test(name)) {
      return this.genSpecial(e, ctx);
    }
    let { code, si, needAlias } = this.resolveCall(name);
    if (needAlias) this.alias('Image::ExifTool');
    let args;
    if (e.amp && !e.parens) args = `...${this.scope.fn.args}`;
    else args = this.genCallArgs(e.args || [], si);
    let call;
    if (!si || si.usesWantarray) {
      // (unknown subs may use wantarray too)
      call = `PL.WC(${ctx === 'L' ? 1 : ctx === 'R' ? '$wantarray' : 0}, ${code})(${args})`;
      if (ctx === 'R' && !this.scope.fn.usesWantarray) call = `PL.WC(0, ${code})(${args})`;
    } else call = `${code}(${args})`;
    return this.callResult(call, si, ctx);
  }

  // convert sub call result for context
  callResult(call, si, ctx) {
    const returnsList = !si || si.returnsList || si.usesWantarray;
    switch (ctx) {
      case 'R': return call;     // return position: pass through
      case 'V': return call;
      case 'L': return returnsList ? `PL.L(${call})` : `[${call}]`;
      case 'B': return returnsList ? `PL.t(PL.sc(${call}))` : `PL.t(${call})`;
      default: return returnsList ? `PL.sc(${call})` : call;
    }
  }

  // determine the class of a method invocant statically (null if unknown)
  methodClass(inv, name) {
    const defs = BLESS_CLASSES.filter((c) => this.gi.subs.has(c + '::' + name));
    if (inv.t === 'var' && inv.sigil === '$') {
      if (inv.name === 'et' || inv.name === 'exifTool' || inv.name === 'self' && !BLESS_CLASSES.includes(this.pkg)) {
        if (this.gi.subs.has('Image::ExifTool::' + name) || defs.length === 0) return 'Image::ExifTool';
      }
      if (inv.name === 'self' && BLESS_CLASSES.includes(this.pkg)) return this.pkg;
      if (inv.name === 'raf' && this.gi.subs.has('File::RandomAccess::' + name)) return 'File::RandomAccess';
    }
    if (defs.length === 1) return defs[0];
    return null;
  }

  genMethod(e, ctx) {
    let inv = e.inv;
    let si = null;
    if (inv.t === 'bareword' || inv.t === 'str') {
      // class method
      const cls = inv.t === 'bareword' ? inv.name : inv.v;
      if (e.dyn) {
        const call = `PL.callMethod(${jsStr(cls)}, ${this.genExpr(e.dyn, 'S')}${e.args.length ? ', ' + this.genCallArgs(e.args) : ''})`;
        return this.callResult(call, null, ctx);
      }
      si = this.gi.subs.get(cls + '::' + e.name);
      const target = si ? `${this.alias(cls)}${propAccess(this.gi.memberName(cls, '&', e.name))}` : `PL.method(${jsStr(cls)}, ${jsStr(e.name)})`;
      const args = this.genCallArgs([{ t: 'str', v: cls }, ...e.args], si);
      const call = si && si.usesWantarray ? `PL.WC(${ctx === 'L' ? 1 : 0}, ${target})(${args})` : `${target}(${args})`;
      return this.callResult(call, si, ctx);
    }
    const invCode = this.genExpr(inv, 'S');
    if (e.dyn) {
      const call = `PL.callMethod(${invCode}, ${this.genExpr(e.dyn, 'S')}${e.args.length ? ', ' + this.genCallArgs(e.args) : ''})`;
      return this.callResult(call, null, ctx);
    }
    const cls = this.methodClass(inv, e.name);
    if (cls) {
      si = this.gi.subs.get(cls + '::' + e.name);
      const target = si ? `${this.alias(cls)}${propAccess(this.gi.memberName(cls, '&', e.name))}` : `PL.method(${jsStr(cls)}, ${jsStr(e.name)})`;
      const args = this.genCallArgs([inv, ...e.args], si, invCode);
      let call;
      if (si && si.usesWantarray) call = `PL.WC(${ctx === 'L' ? 1 : 0}, ${target})(${args})`;
      else call = `${target}(${args})`;
      return this.callResult(call, si || { returnsList: !SCALAR_METHODS.has(e.name) }, ctx);
    }
    // dynamic dispatch: use name-based info for out params / context
    const cands = this.gi.methods.get(e.name) || [];
    si = cands.find((c) => c.pkg === 'Image::ExifTool') || cands[0] || null;
    const args = this.genCallArgs([inv, ...e.args], si, invCode);
    let call;
    if (si && si.usesWantarray) call = `PL.WC(${ctx === 'L' ? 1 : 0}, PL.findMethod(${invCode}, ${jsStr(e.name)}))(${args})`;
    else call = `PL.callMethod(${args.replace(/^/, '')}`.replace(/^PL\.callMethod\(/, `PL.callMethod(`);
    if (!(si && si.usesWantarray)) {
      const rest = this.genCallArgs(e.args, si ? { outParams: new Set([...si.outParams].filter((p) => p > 0).map((p) => p - 1)) } : null);
      call = `PL.callMethod(${invCode}, ${jsStr(e.name)}${rest ? ', ' + rest : ''})`;
    }
    return this.callResult(call, si || { returnsList: !SCALAR_METHODS.has(e.name) }, ctx);
  }

  genCallRef(e, ctx) {
    const fn = this.genExpr(e.fn, 'S');
    let args;
    if (e.args === null) args = `...${this.scope.fn.args}`;
    else args = this.genCallArgs(e.args);
    const call = `PL.cr(${fn}, ${this.alias(this.pkg)})(${args})`;
    return this.callResult(call, null, ctx);
  }

  // ------------------------------------------------------------------ builtins
  genBuiltin(e, ctx) {
    const a = e.args || [];
    const S = (x) => this.genExpr(x, 'S');
    const sc = (code) => this.ctxScalar(code, ctx);
    const def_ = () => this.varRef('$', '_').js;
    const arg0 = () => (a.length ? S(a[0]) : def_());
    switch (e.name) {
      case 'defined': {
        if (!a.length) return this.boolResult(`${def_()} !== undefined`, ctx);
        const x = a[0];
        if (x.t === 'funcref' || (x.t === 'var' && x.sigil === '&')) return this.boolResult(`PL.definedSub(${this.subRef(x.name)})`, ctx);
        if (x.t === 'call' && x.amp) return this.boolResult(`PL.definedSub(${this.subRef(x.name)})`, ctx);
        if (x.t === 'callref' && x.curArgs) return this.boolResult(`PL.definedSub(PL.cr(${S(x.fn)}, ${this.alias(this.pkg)}))`, ctx);
        if (x.t === 'var' && x.sigil === '@') return this.boolResult(`${this.genVar(x, 'L')}.length > 0`, ctx);
        return this.boolResult(`${paren(S(x))} !== undefined`, ctx);
      }
      case 'undef': {
        if (!a.length) return ctx === 'L' ? '[undefined]' : 'undefined';
        const x = a[0];
        if (x.t === 'var' && x.sigil === '@') return `(${this.genLvalue(x)}.length = 0, undefined)`;
        if (x.t === 'var' && x.sigil === '%') return `(PL.hclear(${this.genLvalue(x)}), undefined)`;
        if (x.t === 'deref' && x.sigil === '@') return `(PL.A(${S(x.e)}).length = 0, undefined)`;
        if (x.t === 'deref' && x.sigil === '%') return `(PL.hclear(${S(x.e)}), undefined)`;
        if (x.t === 'funcref' || x.t === 'var' && x.sigil === '&') return `PL.undefSub(${this.subRef(x.name)})`;
        const lv = this.genLvalue(x.t === 'my' ? x : x);
        return ctx === 'V' ? `${lv} = undefined` : `(${lv} = undefined)`;
      }
      case 'ref': return sc(`PL.ref(${arg0()})`);
      case 'scalar': {
        const x = a[0];
        return this.genExpr(x, ctx === 'B' ? 'B' : 'S');
      }
      case 'length': return sc(`PL.len(${arg0()})`);
      case 'lc': return sc(`PL.lc(${arg0()})`);
      case 'uc': return sc(`PL.uc(${arg0()})`);
      case 'lcfirst': return sc(`PL.lcfirst(${arg0()})`);
      case 'ucfirst': return sc(`PL.ucfirst(${arg0()})`);
      case 'fc': return sc(`PL.lc(${arg0()})`);
      case 'chr': return sc(`PL.chr(${arg0()})`);
      case 'ord': return sc(`PL.ord(${arg0()})`);
      case 'hex': return sc(`PL.hex(${arg0()})`);
      case 'oct': return sc(`PL.oct(${arg0()})`);
      case 'int': return sc(`PL.int(${arg0()})`);
      case 'abs': return sc(`Math.abs(${this.num(a[0] || { t: 'var', sigil: '$', name: '_' })})`);
      case 'sqrt': return sc(`PL.sqrt(${arg0()})`);
      case 'log': return sc(`PL.log(${arg0()})`);
      case 'exp': return sc(`Math.exp(PL.num(${arg0()}))`);
      case 'sin': return sc(`Math.sin(PL.num(${arg0()}))`);
      case 'cos': return sc(`Math.cos(PL.num(${arg0()}))`);
      case 'atan2': return sc(`Math.atan2(${this.num(a[0])}, ${this.num(a[1])})`);
      case 'rand': return sc(`PL.rand(${a.length ? S(a[0]) : ''})`);
      case 'srand': return sc('0');
      case 'quotemeta': return sc(`PL.quotemeta(${arg0()})`);
      case 'time': return sc('PL.time()');
      case 'times': return ctx === 'L' ? '[0, 0, 0, 0]' : '0';
      case 'sleep': return sc('0');
      case 'wantarray': return sc('$wantarray');
      case 'localtime': case 'gmtime': {
        const fn = e.name === 'localtime' ? 'PL.localtime' : 'PL.gmtime';
        const arg = a.length ? S(a[0]) : '';
        if (ctx === 'L') return `${fn}(${arg})`;
        return sc(`${fn}Str(${arg})`);
      }
      case 'exists': {
        const x = a[0];
        if (x.t === 'elem') {
          if (x.kind === 'hash') return this.boolResult(`PL.ex(${this.genContainer(x.base, false)}, ${this.genKey(x.idx)})`, ctx);
          return this.boolResult(`PL.exa(${this.genContainer(x.base, false)}, ${this.genKey(x.idx, 'array')})`, ctx);
        }
        if (x.t === 'call' && x.amp) return this.boolResult(`PL.definedSub(${this.subRef(x.name)})`, ctx);
        if (x.t === 'funcref') return this.boolResult(`PL.definedSub(${this.subRef(x.name)})`, ctx);
        this.error('unsupported exists', e);
        break;
      }
      case 'delete': {
        const x = a[0];
        if (x.t === 'elem') {
          if (x.kind === 'hash') return sc(`PL.del(${this.genContainer(x.base, false)}, ${this.genKey(x.idx)})`);
          return sc(`PL.dela(${this.genContainer(x.base, false)}, ${this.genKey(x.idx, 'array')})`);
        }
        if (x.t === 'slice' && x.kind === 'hash') {
          const code = `PL.delSlice(${this.genContainer(x.base, false)}, ${this.genList(x.list)})`;
          return ctx === 'L' ? code : sc(`${code}.at(-1)`);
        }
        if (x.t === 'my') this.error('delete my', e);
        this.error('unsupported delete', e);
        break;
      }
      case 'each': {
        const code = `PL.each(${this.genContainer(a[0].t === 'var' ? a[0] : { t: 'deref', sigil: '%', e: a[0].e }, false)})`;
        return ctx === 'L' ? code : sc(`${code}[0]`);
      }
      case 'keys': case 'values': {
        const x = a[0];
        let cont;
        if (x.t === 'var') cont = this.varRef(x.sigil, x.name).js;
        else if (x.t === 'deref') cont = S(x.e);
        else cont = S(x);
        const isArr = x.sigil === '@';
        const fn = e.name === 'keys' ? (isArr ? 'PL.akeys' : 'PL.keys') : (isArr ? 'PL.avalues' : 'PL.values');
        if (ctx === 'L') return `${fn}(${cont})`;
        if (ctx === 'B') return `${fn}(${cont}).length > 0`;
        return `${fn}(${cont}).length`;
      }
      case 'shift': case 'pop': {
        let arr;
        if (!a.length) {
          arr = this.scope.fn.args;
          if (e.name === 'shift') {
            const fnc = this.scope.fn;
            const isOut = fnc.outParams && fnc.outParams.has(fnc.shifts);
            fnc.shifts++;
            if (isOut) return sc(`${arr}.shift().v`);
          }
        } else {
          const x = a[0];
          if (x.t === 'var') arr = this.varRef('@', x.name).js;
          else if (x.t === 'deref') arr = `PL.A(${S(x.e)})`;
          else arr = S(x);
        }
        return sc(`${arr}.${e.name}()`);
      }
      case 'push': case 'unshift': {
        const x = a[0];
        let arr;
        if (x.t === 'var') arr = this.varRef('@', x.name).js;
        else if (x.t === 'deref') arr = this.genAutoviv(x.e, '@');
        else if (x.t === 'my') arr = this.genLvalue(x);
        else arr = S(x);
        const items = a.slice(1).map((it) => (isListish(it, this.gi, this.pkg) ? '...' + this.genList(it) : S(it)));
        return sc(`${paren(arr)}.${e.name}(${items.join(', ')})`);
      }
      case 'splice': {
        const x = a[0];
        const arr = x.t === 'var' ? this.varRef('@', x.name).js : x.t === 'deref' ? `PL.A(${S(x.e)})` : S(x);
        const rest = a.slice(1).map((it, i) => (i >= 2 && isListish(it, this.gi, this.pkg) ? '...' + this.genList(it) : S(it)));
        const code = `PL.splice(${[arr, ...rest].join(', ')})`;
        if (ctx === 'L') return code;
        return sc(`${code}.at(-1)`);
      }
      case 'join': {
        const sep = S(a[0]);
        const items = this.genArrayItems(a.slice(1));
        return sc(`PL.join(${sep}, ${items})`);
      }
      case 'split': return this.genSplit(e, ctx);
      case 'sprintf': {
        const items = a.map((it) => (isListish(it, this.gi, this.pkg) ? '...' + this.genList(it) : S(it)));
        return sc(`PL.sprintf(${items.join(', ')})`);
      }
      case 'reverse': {
        const items = this.genArrayItems(a);
        if (ctx === 'L') return `PL.reverse(${items})`;
        return sc(`PL.revstr(${a.length ? items : `[${def_()}]`})`);
      }
      case 'die': {
        const items = a.length ? this.genArrayItems(a) : '[]';
        return `PL.die(${items})`;
      }
      case 'warn': {
        const items = a.length ? this.genArrayItems(a) : '[]';
        return sc(`PL.warn(${items})`);
      }
      case 'exit': return `PL.exit(${a.length ? S(a[0]) : '0'})`;
      case 'substr': {
        if (a.length === 4) {
          const lv = this.genLvalue(a[0]);
          const t = this.scope.fn.newTemp();
          // 4-arg substr: replace and return old part
          return sc(`(${t} = PL.substr(${lv}, ${S(a[1])}, ${S(a[2])}), ${lv} = PL.substr4(${lv}, ${S(a[1])}, ${S(a[2])}, ${S(a[3])}), ${t})`);
        }
        return sc(`PL.substr(${S(a[0])}, ${S(a[1])}${a[2] ? ', ' + S(a[2]) : ''})`);
      }
      case 'index': case 'rindex':
        return sc(`PL.${e.name}(${S(a[0])}, ${S(a[1])}${a[2] ? ', ' + S(a[2]) : ''})`);
      case 'pack': {
        const items = a.map((it) => (isListish(it, this.gi, this.pkg) ? '...' + this.genList(it) : S(it)));
        return sc(`PL.pack(${items.join(', ')})`);
      }
      case 'unpack': {
        const code = `PL.unpack(${S(a[0])}, ${a[1] ? S(a[1]) : def_()})`;
        if (ctx === 'L') return code;
        return sc(`${code}[0]`);
      }
      case 'chomp': case 'chop': {
        const x = a.length ? a[0] : { t: 'var', sigil: '$', name: '_' };
        if (x.t === 'list') {
          return x.items.map((it) => { const lv = this.genLvalue(it); return `${lv} = PL.${e.name}(${lv})`; }).join(', ');
        }
        const lv = this.genLvalue(x);
        if (ctx === 'V') return `${lv} = PL.${e.name}(${lv})`;
        return sc(`(${lv} = PL.${e.name}(${lv}), PL.SC)`);
      }
      case 'bless': return sc(`PL.bless(${S(a[0])}${a[1] ? ', ' + S(a[1]) : ', ' + jsStr(this.pkg)})`);
      case 'return': this.error('return as function', e); break;
      case 'require': return null;
      case 'caller': return ctx === 'L' ? `PL.caller(${a.length ? S(a[0]) : ''})` : sc(`PL.caller(${a.length ? S(a[0]) : ''})[0]`);
      case 'local': this.error('local in expression', e); break;
      case 'pos': {
        return sc(`PL.pos(${this.posTarget(a[0])})`);
      }
      case 'lock': return sc('1');
      case 'select': return sc(`PL.select(${a.map(S).join(', ')})`);
      case 'binmode': return sc(`PL.binmode(${a.map((x) => this.fhArg(x)).join(', ')})`);
      case 'close': return sc(`PL.close(${a.length ? this.fhArg(a[0]) : ''})`);
      case 'eof': return sc(`PL.eof(${a.length ? this.fhArg(a[0]) : ''})`);
      case 'tell': return sc(`PL.tell(${this.fhArg(a[0])})`);
      case 'fileno': return sc(`PL.fileno(${this.fhArg(a[0])})`);
      case 'seek': case 'sysseek': return sc(`PL.seek(${this.fhArg(a[0])}, ${S(a[1])}, ${S(a[2])})`);
      case 'read': case 'sysread': {
        // read(FH, $buf, $len, [$offset])
        const lv = this.outArg(a[1]);
        return sc(`PL.read(${this.fhArg(a[0])}, ${lv}, ${S(a[2])}${a[3] ? ', ' + S(a[3]) : ''})`);
      }
      case 'syswrite': return sc(`PL.syswrite(${this.fhArg(a[0])}, ${a.slice(1).map(S).join(', ')})`);
      case 'open': case 'sysopen': {
        const fh = a[0];
        let fhCode;
        if (fh.t === 'bareword') fhCode = `PL.globRef(${jsStr(fh.name)})`;
        else if (fh.t === 'glob') fhCode = `PL.globRef(${jsStr(fh.name)})`;
        else fhCode = this.outArg(fh);
        return sc(`PL.open(${fhCode}, ${a.slice(1).map(S).join(', ')})`);
      }
      case 'opendir': {
        const fh = a[0];
        const fhCode = fh.t === 'bareword' ? `PL.globRef(${jsStr(fh.name)})` : this.outArg(fh);
        return sc(`PL.opendir(${fhCode}, ${S(a[1])})`);
      }
      case 'readdir': {
        const code = `PL.readdir(${this.fhArg(a[0])})`;
        return ctx === 'L' ? code : sc(`${code}[0]`);
      }
      case 'closedir': return sc(`PL.closedir(${this.fhArg(a[0])})`);
      case 'unlink': case 'rename': case 'mkdir': case 'rmdir': case 'chmod': case 'utime': case 'link': case 'symlink':
      case 'chdir': case 'readlink': case 'truncate': case 'chown': case 'kill': case 'system': case 'exec':
        return sc(`PL.sys(${jsStr(e.name)}, ${this.genArrayItems(a)})`);
      case 'stat': case 'lstat': {
        const code = `PL.stat(${a.length ? this.fhArg(a[0]) : def_()})`;
        return ctx === 'L' ? code : sc(`${code}.length > 0`);
      }
      case 'getpwuid': case 'getpwnam': case 'getgrgid': case 'getgrnam': return ctx === 'L' ? '[]' : sc('undefined');
      case 'alarm': case 'umask': case 'wait': case 'waitpid': case 'flock': return sc('0');
      case 'glob': return ctx === 'L' ? `PL.globFiles(${S(a[0])})` : sc(`PL.globFiles(${S(a[0])})[0]`);
      case 'vec': this.error('vec not supported', e); break;
      case 'crypt': this.error('crypt not supported', e); break;
      case 'print': case 'printf': return sc(this.genPrint({ t: 'print', fn: e.name, fh: null, args: a }));
      case 'sort': case 'map': case 'grep': return null;
      case 'dump': this.error('dump not supported', e); break;
      case 'readline': return sc(`PL.readline(${this.fhArg(a[0])})`);
      case 'getc': return sc(`PL.getc(${a.length ? this.fhArg(a[0]) : ''})`);
      case 'formline': this.error('formline', e); break;
      case 'rewinddir': return sc('0');
      case 'ioctl': case 'fcntl': case 'socket': case 'pipe': return sc('undefined');
    }
    return null;
  }

  fhArg(x) {
    if (x.t === 'bareword') return this.fhCode(x.name);
    if (x.t === 'glob') return `PL.glob(${jsStr(x.name)})`;
    return this.genExpr(x, 'S');
  }

  genSplit(e, ctx) {
    const a = e.args;
    let pat;
    const p = a[0];
    let reCode;
    if (!p) reCode = "' '";
    else if (p.t === 'match') {
      const lit = this.regexLiteral(p.re, p.flags);
      if (lit.static && lit.src === ' ') reCode = "' '";
      else reCode = this.genRegex(p.re, p.flags || '');
    } else if (p.t === 'str') {
      if (p.v === ' ') reCode = "' '";
      else reCode = this.genRegex({ parts: [p] }, '');
    } else if (p.t === 'qr') {
      reCode = this.genQr(p);
    } else {
      reCode = `PL.re(PL.restr(${this.genExpr(p, 'S')}), '')`;
    }
    const str = a[1] ? this.genExpr(a[1], 'S') : this.varRef('$', '_').js;
    const lim = a[2] ? ', ' + this.genExpr(a[2], 'S') : '';
    const code = `PL.split(${reCode}, ${str}${lim})`;
    if (ctx === 'L') return code;
    if (ctx === 'B') return `${code}.length > 0`;
    return `${code}.length`;
  }

  genSpecial(e, ctx) {
    const name = e.name;
    const a = e.args || [];
    const S = (x) => this.genExpr(x, 'S');
    // in-place modifying utf8:: functions
    if (/^utf8::(decode|encode|upgrade|downgrade)$/.test(name)) {
      const lv = this.genLvalue(a[0]);
      const fn = name.slice(6);
      return this.ctxScalar(`PL.utf8_${fn}(PL.lv(() => ${lv}, (v) => ${lv} = v))`, ctx);
    }
    const args = this.genCallArgs(a);
    const call = `PL.ext(${jsStr(name)})(${args})`;
    const listy = /localtime|gmtime|POSIX::strptime|Time::HiRes::gettimeofday/.test(name);
    if (ctx === 'L') return listy ? `PL.L(${call})` : `PL.L(${call})`;
    if (ctx === 'B') return `PL.t(PL.sc(${call}))`;
    return `PL.sc(${call})`;
  }
}

// ---------------------------------------------------------------------------- helpers
const BUILTINS = new Set(['defined', 'undef', 'ref', 'scalar', 'length', 'lc', 'uc', 'lcfirst', 'ucfirst', 'chr', 'ord',
  'hex', 'oct', 'int', 'abs', 'sqrt', 'log', 'exp', 'sin', 'cos', 'atan2', 'rand', 'srand', 'quotemeta', 'time', 'sleep',
  'localtime', 'gmtime', 'exists', 'delete', 'each', 'keys', 'values', 'shift', 'pop', 'push', 'unshift', 'splice',
  'join', 'split', 'sprintf', 'reverse', 'die', 'warn', 'exit', 'substr', 'index', 'rindex', 'pack', 'unpack', 'chomp',
  'chop', 'bless', 'caller', 'pos', 'lock', 'select', 'binmode', 'close', 'eof', 'tell', 'seek', 'read', 'sysread',
  'syswrite', 'open', 'opendir', 'readdir', 'closedir', 'unlink', 'rename', 'mkdir', 'rmdir', 'chmod', 'utime', 'stat',
  'lstat', 'getpwuid', 'getpwnam', 'getgrgid', 'getgrnam', 'alarm', 'umask', 'glob', 'fileno', 'wantarray', 'fc',
  'sysseek', 'system', 'exec', 'kill', 'chdir', 'readlink', 'truncate', 'chown', 'link', 'symlink', 'times', 'getc',
  'readline', 'rewinddir', 'wait', 'waitpid', 'flock']);

// classes that create (bless) objects
const BLESS_CLASSES = ['Image::ExifTool', 'File::RandomAccess', 'Image::ExifTool::Fixup', 'Image::ExifTool::HtmlDump',
  'Image::ExifTool::BZZ', 'Image::ExifTool::Plot'];

// methods known to return scalars (for unknown-target method calls)
const SCALAR_METHODS = new Set(['Read', 'Seek', 'Tell', 'ReadLine', 'Options', 'Warn', 'Error', 'GetValue']);

function numLit(e) {
  if (e.raw && /^0[xX][0-9a-fA-F]+$/.test(e.raw)) return e.raw;
  if (e.raw && /^-0[xX][0-9a-fA-F]+$/.test(e.raw)) return e.raw;
  if (e.raw && /^\d+$/.test(e.raw) && e.raw.length > 1 && e.raw[0] === '0') return String(e.v);
  const s = String(e.v);
  return s;
}

function numKey(e) {
  // Perl stringification of numeric hash keys
  const v = e.v;
  if (Number.isInteger(v)) return String(v);
  return String(Number(v.toPrecision(15)));
}

// is code an atomic JS expression (safe to use as an operand without parentheses)?
function atomic(code) {
  if (/^-?[\w$.]+$/.test(code) && !/^-/.test(code)) return true;
  if (/^'[^'\\]*'$/.test(code)) return true;
  // call or parenthesized expression spanning the whole code
  const m = /^[\w$.?]*\(/.exec(code);
  if (m && code.endsWith(')') && balanced(code)) return true;
  return false;
}

function wrapNeg(code) { return code.startsWith('-') ? '(' + code + ')' : code; }
function paren2(code) {
  return /^[\w$.!]+$/.test(code) || /^[\w$.]+\(.*\)$/.test(code) && balanced(code) ? code : '(' + code + ')';
}
function paren3(code) { return code.startsWith('{') ? '(' + code + ')' : code; }
function balanced(code) {
  let d = 0;
  for (let i = 0; i < code.length; ++i) {
    const c = code[i];
    if (c === '(') ++d;
    else if (c === ')') { if (--d === 0 && i !== code.length - 1) return false; }
  }
  return d === 0;
}

function isBoolExpr(e) {
  if (!e) return false;
  if (e.t === 'binop' && ['==', '!=', '<', '>', '<=', '>=', 'eq', 'ne', 'lt', 'gt', 'le', 'ge'].includes(e.op)) return false;
  return false;
}

// expression known to produce a number
function isNumExpr(e) {
  if (!e) return false;
  switch (e.t) {
    case 'num': return true;
    case 'binop': return ['+', '-', '*', '/', '%', '**', '<=>'].includes(e.op);
    case 'unop': return e.op === 'neg';
    case 'lastidx': return true;
    case 'call':
      return ['length', 'ord', 'int', 'hex', 'oct', 'abs', 'index', 'rindex', 'time', 'sqrt', 'log', 'exp',
        'Get8u', 'Get8s', 'Get16u', 'Get16s', 'Get32u', 'Get32s', 'GetFloat', 'GetDouble'].includes(e.name) && e.name !== 'length';
    case 'var': return false;
  }
  return false;
}

// expression that certainly yields an integer JS number (so it can be used directly as an
// array index in an lvalue)
function isIntExpr(e) {
  if (!e) return false;
  switch (e.t) {
    case 'num': return Number.isInteger(e.v);
    case 'preinc': case 'postinc': case 'lastidx': return true;
    case 'binop':
      if (['%', '<<', '>>', '&', '|', '^'].includes(e.op)) return true;
      if (['+', '-', '*'].includes(e.op)) return isIntish(e.l) && isIntish(e.r);
      return false;
    case 'call': return ['int', 'ord', 'length', 'index', 'rindex', 'scalar', 'hex', 'oct'].includes(e.name);
  }
  return false;
}
// operand that is very likely an integer number (counters, integer arithmetic)
function isIntish(e) {
  return isIntExpr(e) || (e && e.t === 'var' && e.sigil === '$') || (e && e.t === 'var' && e.sigil === '@');
}

function isStrExpr(e) {
  if (!e) return false;
  switch (e.t) {
    case 'str': case 'interp': return true;
    case 'binop': return e.op === '.' || e.op === 'x';
    case 'call': return ['sprintf', 'join', 'lc', 'uc', 'ucfirst', 'lcfirst', 'quotemeta', 'chr'].includes(e.name);
  }
  return false;
}

function scalarRule(e) {
  if (!e) return 'last';
  switch (e.t) {
    case 'var': case 'deref': return 'count';
    case 'map': case 'grep': return 'count';
    case 'call':
      if (['keys', 'values', 'split'].includes(e.name)) return 'count';
      if (e.name === 'unpack') return 'first';
      if (e.name === 'reverse') return 'revstr';
      if (e.name === 'localtime' || e.name === 'gmtime') return 'ctime';
      return 'last';
    case 'list':
      if (e.items.length === 1) return scalarRule(e.items[0]);
      return 'last';
  }
  return 'last';
}

// split "lhs = A || B || CONTROL" into assignment and test
function splitControlAssign(e) {
  if (e.t !== 'assign' || e.op !== '=') return null;
  const r = e.r;
  if (r.t !== 'logop' || !['||', '&&', '//'].includes(r.op)) return null;
  if (!isControl(r.r) && !(r.r.t === 'list' && r.r.items.some(isControl))) return null;
  return { assign: Object.assign({}, e, { r: r.l }), op: r.op === '&&' ? 'and' : r.op === '//' ? '//' : 'or', ctl: r.r };
}

function hasTopControl(e) {
  if (isControl(e)) return true;
  if (e.t === 'call' && e.args && e.args.some(isControl)) return true;
  if (e.t === 'list') return e.items.some(hasTopControl);
  if (e.t === 'logop') return hasTopControl(e.r) || hasTopControl(e.l);
  if (e.t === 'cond') return hasTopControl(e.a) || hasTopControl(e.b);
  return false;
}

export function unwrapParen(e) {
  while (e && e.t === 'list' && e.paren && e.items.length === 1 && (e.items[0].t === 'assign' || e.items[0].t === 'cond' || e.items[0].t === 'list' || e.items[0].t === 'elem' || e.items[0].t === 'deref')) e = e.items[0];
  return e;
}

function hasSideEffects(e) {
  let se = false;
  walk(e, (n) => {
    if (['postinc', 'preinc', 'assign', 'method', 'callref', 'subst', 'trans'].includes(n.t)) se = true;
    if (n.t === 'call' && (!n.builtin || ['shift', 'pop', 'splice', 'push', 'unshift'].includes(n.name))) se = true;
  });
  return se;
}

function isControl(e) {
  return e.t === 'return' || e.t === 'loopctl' || e.t === 'goto' || e.t === 'gotosub' ||
    (e.t === 'call' && (e.name === 'die' || e.name === 'exit'));
}

function containsGoto(node, label) {
  let found = false;
  walkSkippingSubs(node, (n) => { if (n.t === 'goto' && n.label === label) found = true; });
  return found;
}

function containsReturn(node) {
  let found = false;
  walkSkippingSubs(node, (n) => { if (n.t === 'return') found = true; });
  return found;
}

function firstLabel(block) {
  if (!block || !block.body.length) return null;
  const s = block.body[0];
  if (s.t === 'label') return s.label;
  return s.label || null;
}

// collect "my" declarations nested in an expression (not inside subs/blocks)
function collectMy(e, out) {
  walk(e, (n) => {
    if (n.t === 'anonsub' || n.t === 'block' || n.t === 'sort' || n.t === 'map' || n.t === 'grep' || n.t === 'evalblock' || n.t === 'doblock') return false;
    if (n.t === 'my' && n.decl !== 'local') {
      for (const v of n.vars) if (v.t === 'var') out.push({ sigil: v.sigil, name: v.name, node: v });
      return false;
    }
  });
}

// collect top-level my declarations in a statement (for goto block hoisting)
function collectTopMy(st, out) {
  if (st.t === 'expr') {
    walk(st.expr, (n) => {
      if (n.t === 'anonsub' || n.t === 'block') return false;
      if (n.t === 'my' && n.decl !== 'local') {
        for (const v of n.vars) if (v.t === 'var') out.push({ sigil: v.sigil, name: v.name, node: v });
        return false;
      }
    });
  }
}

function modifiesVar(block, name, cg) {
  let mod = false;
  const isVar = (x) => x && x.t === 'var' && x.sigil === '$' && x.name === name;
  walkSkippingSubs(block, (n) => {
    // passed by reference to a sub that modifies its argument?
    if (cg && n.t === 'call' && !n.builtin && n.args) {
      const si = cg.resolveCall(n.name).si;
      if (si && si.outParams && n.args.some((a, i) => si.outParams.has(i) && isVar(a))) mod = true;
    }
    if (n.t === 'assign' && isVar(n.l)) mod = true;
    if ((n.t === 'subst' || n.t === 'trans') && (n.target ? isVar(n.target) : name === '_') && !(n.flags || '').includes('r')) {
      if (n.t === 'trans' && n.to === '' && !(n.flags || '').includes('d')) return;
      mod = true;
    }
    if ((n.t === 'preinc' || n.t === 'postinc') && isVar(n.e)) mod = true;
    if (n.t === 'evalstr') mod = true;    // eval'd code may modify the loop variable
    if (n.t === 'ref' && isVar(n.e)) mod = true;   // (may be modified through the reference)
    if (cg && n.t === 'method' && typeof n.name === 'string' && n.args) {
      // method that modifies its arguments ($_[0] is the invocant)
      const cls = cg.methodClass(n.inv, n.name);
      const si = cls && cg.gi.subs.get(cls + '::' + n.name);
      if (si && (si.aliasArgs || (si.outParams && n.args.some((a, i) => si.outParams.has(i + 1) && isVar(a))))) mod = true;
    }
    if (cg && n.t === 'call' && !n.builtin && n.args) {
      const si = cg.resolveCall(n.name).si;
      if (si && si.aliasArgs && n.args.some(isVar)) mod = true;
    }
    if (n.t === 'call' && (n.name === 'chomp' || n.name === 'chop') && (n.args.length ? isVar(n.args[0]) : name === '_')) mod = true;
    if (n.t === 'foreach' || n.t === 'map' || n.t === 'grep') {
      if (name === '_' && n.t !== 'foreach') return false;
      if (n.t === 'foreach' && (!n.var && name === '_')) return false;
    }
  });
  return mod;
}

function blockUsesLoopCtl(block) {
  let uses = false;
  const scan = (node, depth) => {
    walk(node, (n) => {
      if (n.t === 'anonsub' || n.t === 'sub') return false;
      if (n.t === 'while' || n.t === 'cfor' || n.t === 'foreach' || n.t === 'bare') {
        // loop control inside nested loops refers to them (unless labeled)
        walk(n, (m) => { if (m.t === 'loopctl' && m.label) uses = true; });
        return false;
      }
      if (n.t === 'loopctl') uses = true;
    });
  };
  scan(block.body, 0);
  return uses;
}
