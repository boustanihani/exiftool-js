// Global analysis for perl2js: collects subs, packages, package variables and calling conventions
// across all source files before code generation.

export class GlobalInfo {
  constructor() {
    this.subs = new Map();        // 'Pkg::name' -> SubInfo
    this.methods = new Map();     // name -> [SubInfo]
    this.pkgVars = new Map();     // pkg -> { '$': Set, '@': Set, '%': Set }
    this.files = new Map();       // file -> FileInfo
    this.pkgFiles = new Map();    // pkg -> Set(files)
    this.exports = {};            // pkg -> { EXPORT, EXPORT_OK, EXPORT_TAGS }
    this.autoload = new Set();    // packages with AUTOLOAD
    this.overrides = new Set();   // 'Pkg::name' subs implemented by hand
    this.extraOut = new Map();    // 'Pkg::name' -> Set(out positions) (hand-written subs)
  }

  pkgVarSet(pkg) {
    let v = this.pkgVars.get(pkg);
    if (!v) { v = { '$': new Set(), '@': new Set(), '%': new Set() }; this.pkgVars.set(pkg, v); }
    return v;
  }

  // JS property name for a package member
  memberName(pkg, sigil, name) {
    if (sigil === '$') return '$' + name;
    const v = this.pkgVars.get(pkg);
    const isSub = this.subs.has(pkg + '::' + name);
    if (sigil === '@') {
      if ((v && v['%'].has(name)) || isSub) return name + '_A';
      return name;
    }
    if (sigil === '%') return name;
    if (sigil === '&') {
      if (v && (v['%'].has(name))) return name + '_S';
      return name;
    }
    return name;
  }

  findSub(pkg, name) {
    return this.subs.get(pkg + '::' + name);
  }
}

// walk AST nodes generically
export function walk(node, fn, parent) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const n of node) walk(n, fn, parent); return; }
  if (fn(node, parent) === false) return;
  for (const k in node) {
    if (k === 'line' || k === 'pos' || k === 't') continue;
    const v = node[k];
    if (v && typeof v === 'object') walk(v, fn, node);
  }
}

// does expression produce a list (in list context)?
export function isListish(e, gi, pkg) {
  if (!e) return false;
  switch (e.t) {
    case 'list': return e.items.length !== 1 || isListish(e.items[0], gi, pkg);
    case 'var': return e.sigil === '@' || e.sigil === '%';
    case 'deref': return e.sigil === '@' || e.sigil === '%';
    case 'slice': case 'lslice': case 'range': return true;
    case 'map': case 'grep': case 'sort': return true;
    case 'cond': return isListish(e.a, gi, pkg) || isListish(e.b, gi, pkg);
    case 'match': return true;   // list context match returns captures
    case 'binop': return e.op === 'x' && e.l.t === 'list' && e.l.paren;
    case 'my': return e.paren || e.vars.some((v) => v.sigil === '@' || v.sigil === '%');
    case 'call':
      if (e.builtin || BUILTIN_LIST.has(e.name)) return BUILTIN_LIST.has(e.name);
      {
        const si = resolveSubInfo(e, gi, pkg);
        return si ? si.returnsList : true;
      }
    case 'method': {
      const si = gi && gi.methods.get(e.name);
      if (!si) return true;
      return si.some((s) => s.returnsList);
    }
    case 'callref': return true;
    case 'doblock': case 'evalblock': return true;
    case 'wantarray': return false;
    case 'assign': return isListish(e.l, gi, pkg);
  }
  return false;
}

export const BUILTIN_LIST = new Set(['map', 'grep', 'sort', 'reverse', 'keys', 'values', 'split', 'unpack', 'splice',
  'localtime', 'gmtime', 'each', 'caller', 'stat', 'lstat', 'readdir', 'times', 'getpwuid', 'getpwnam']);

export function resolveSubInfo(e, gi, pkg) {
  if (!gi) return undefined;
  const name = e.name;
  if (name.includes('::')) {
    const i = name.lastIndexOf('::');
    return gi.subs.get(name.slice(0, i) + '::' + name.slice(i + 2));
  }
  return gi.subs.get(pkg + '::' + name) || (gi.imports && gi.imports(pkg, name));
}

// analyse a sub body for parameter conventions
export function analyzeSub(sub, gi) {
  const info = {
    name: sub.name.replace(/^.*::/, ''),
    pkg: sub.name.includes('::') ? sub.name.slice(0, sub.name.lastIndexOf('::')) : sub.pkg,
    proto: sub.proto,
    params: null,      // array of param names if simple
    outParams: new Set(),
    usesWantarray: false,
    returnsList: false,
    usesArgs: false,
    node: sub,
  };
  const body = sub.body.body;
  // leading parameter extraction
  let shifts = 0;
  const params = [];
  let k = 0;
  for (; k < body.length; ++k) {
    const st = body[k];
    if (st.t !== 'expr') break;
    const e = st.expr;
    if (e.t !== 'assign' || e.op !== '=' || e.l.t !== 'my' || e.l.decl !== 'my') break;
    if (e.r.t === 'var' && e.r.sigil === '@' && e.r.name === '_' && e.l.paren) {
      if (shifts) break;
      for (const v of e.l.vars) {
        if (v.t !== 'var') { params.length = 0; break; }
        params.push(v);
      }
      ++k;
      break;
    }
    if (e.r.t === 'call' && e.r.name === 'shift' && e.r.args.length === 0 && !e.l.paren && e.l.vars[0].sigil === '$') {
      params.push(e.l.vars[0]);
      ++shifts;
      continue;
    }
    break;
  }
  info.leadCount = k;
  info.leadParams = params;
  info.leadShifts = shifts;
  // scan rest of body
  let argUse = false;
  walkSkippingSubs(body.slice(k), (n) => {
    if (n.t === 'var' && n.name === '_' && (n.sigil === '@')) argUse = true;
    if (n.t === 'elem' && n.base.t === 'var' && n.base.name === '_' && n.base.sigil === '@') argUse = true;
    if (n.t === 'call' && (n.name === 'shift' || n.name === 'pop') && n.args.length === 0) argUse = true;
    if (n.t === 'callref' && n.curArgs) argUse = true;
    if (n.t === 'gotosub') argUse = true;
    if (n.t === 'wantarray') info.usesWantarray = true;
    if (n.t === 'call' && n.amp && !n.parens) argUse = true;
  });
  // also check the param statements themselves for complex patterns
  if (!argUse && params.every((p) => p.sigil === '$' || p === params[params.length - 1])) {
    info.params = params;
  }
  info.usesArgs = argUse;
  // out params: writes to $_[N]
  walkSkippingSubs(body, (n) => {
    const target = n.t === 'assign' ? n.l : (n.t === 'subst' || n.t === 'trans') ? n.target :
      (n.t === 'preinc' || n.t === 'postinc') ? n.e : null;
    if (target && target.t === 'elem' && target.base.t === 'var' && target.base.name === '_' && target.base.sigil === '@' && target.idx.t === 'num') {
      info.outParams.add(target.idx.v + shifts);
    }
    if (n.t === 'call' && ['read', 'sysread'].includes(n.name) && n.args[1]) {
      const a = n.args[1];
      if (a.t === 'elem' && a.base.t === 'var' && a.base.name === '_' && a.idx.t === 'num') info.outParams.add(a.idx.v + shifts);
    }
    if (n.t === 'call' && ['chomp', 'chop', 'utf8::decode', 'utf8::encode', 'utf8::upgrade', 'utf8::downgrade'].includes(n.name) && n.args[0]) {
      const a = n.args[0];
      if (a.t === 'elem' && a.base.t === 'var' && a.base.name === '_' && a.idx.t === 'num') info.outParams.add(a.idx.v + shifts);
    }
  });
  // foreach over @_ modifying the loop variable: the sub modifies all its arguments in place
  // (eg. ToFloat(@val)), so callers pass every argument as a reference (box)
  walkSkippingSubs(body, (n) => {
    if (n.t !== 'foreach') return;
    const l = n.list.t === 'list' && n.list.items.length === 1 ? n.list.items[0] : n.list;
    if (!(l.t === 'var' && l.sigil === '@' && l.name === '_')) return;
    const name = n.var ? n.var.name : '_';
    let mod = false;
    walkSkippingSubs(n.block, (m) => {
      const t = m.t === 'assign' ? m.l : (m.t === 'subst' || m.t === 'trans') ? (m.target || { t: 'var', sigil: '$', name: '_' }) : null;
      if (t && t.t === 'var' && t.sigil === '$' && t.name === name) mod = true;
    });
    if (mod) info.aliasArgs = true;
  });
  if (info.outParams.size || info.aliasArgs) info.params = null;
  return info;
}

export function walkSkippingSubs(node, fn) {
  walk(node, (n) => {
    if (n.t === 'anonsub' || n.t === 'sub') return false;
    return fn(n);
  });
}

// determine whether a sub returns lists (needs returnsList for all subs to be computed iteratively)
export function computeReturns(gi) {
  let changed = true;
  let iter = 0;
  while (changed && iter++ < 10) {
    changed = false;
    for (const si of gi.subs.values()) {
      if (si.returnsList || !si.node) continue;
      let rl = false;
      walkSkippingSubs(si.node.body, (n) => {
        if (n.t === 'return' && n.e && isListish(n.e, gi, si.pkg)) rl = true;
        if (n.t === 'return' && !n.e) rl = true; // bare return gives empty list
      });
      // implicit return of last statement
      const last = lastStatement(si.node.body.body);
      if (last && last.t === 'expr' && isListish(last.expr, gi, si.pkg) && last.expr.t !== 'assign') rl = true;
      if (rl) { si.returnsList = true; changed = true; }
    }
  }
}

function lastStatement(stmts) {
  for (let i = stmts.length - 1; i >= 0; --i) {
    if (stmts[i].t !== 'nop' && stmts[i].t !== 'subdecl') return stmts[i];
  }
  return null;
}
