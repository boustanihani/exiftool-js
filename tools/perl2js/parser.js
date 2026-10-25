// Perl parser for perl2js.  Produces an AST from Perl source (the subset used by ExifTool).
import { Lexer, PerlSyntaxError } from './lexer.js';

// binary operators: [precedence, associativity]
const BINOPS = {
  'or': [2, 'L'], 'xor': [2, 'L'], 'and': [3, 'L'],
  ',': [6, 'L'], '=>': [6, 'L'],
  '=': [7, 'R'], '+=': [7, 'R'], '-=': [7, 'R'], '*=': [7, 'R'], '/=': [7, 'R'], '.=': [7, 'R'], '%=': [7, 'R'],
  'x=': [7, 'R'], '&=': [7, 'R'], '|=': [7, 'R'], '^=': [7, 'R'], '<<=': [7, 'R'], '>>=': [7, 'R'], '**=': [7, 'R'],
  '||=': [7, 'R'], '&&=': [7, 'R'], '//=': [7, 'R'],
  '?': [8, 'R'],
  '..': [9, 'N'], '...': [9, 'N'],
  '||': [10, 'L'], '//': [10, 'L'],
  '&&': [11, 'L'],
  '|': [12, 'L'], '^': [12, 'L'],
  '&': [13, 'L'],
  '==': [14, 'N'], '!=': [14, 'N'], '<=>': [14, 'N'], 'eq': [14, 'N'], 'ne': [14, 'N'], 'cmp': [14, 'N'], '~~': [14, 'N'],
  '<': [15, 'L'], '>': [15, 'L'], '<=': [15, 'L'], '>=': [15, 'L'], 'lt': [15, 'L'], 'gt': [15, 'L'], 'le': [15, 'L'], 'ge': [15, 'L'],
  'isa': [16.5, 'N'],
  '<<': [17, 'L'], '>>': [17, 'L'],
  '+': [18, 'L'], '-': [18, 'L'], '.': [18, 'L'],
  '*': [19, 'L'], '/': [19, 'L'], '%': [19, 'L'], 'x': [19, 'L'],
  '=~': [20, 'L'], '!~': [20, 'L'],
  '**': [22, 'R'],
};
const WORD_OPS = new Set(['or', 'xor', 'and', 'eq', 'ne', 'cmp', 'lt', 'gt', 'le', 'ge', 'x', 'isa']);
const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '.=', '%=', 'x=', '&=', '|=', '^=', '<<=', '>>=', '**=', '||=', '&&=', '//=']);
const MODIFIERS = new Set(['if', 'unless', 'while', 'until', 'for', 'foreach']);

// named unary operators (take 0 or 1 argument, precedence above comparison)
export const NAMED_UNARY = new Set([
  'defined', 'ref', 'scalar', 'lc', 'uc', 'lcfirst', 'ucfirst', 'length', 'chr', 'ord', 'hex', 'oct', 'int', 'abs',
  'sqrt', 'log', 'exp', 'sin', 'cos', 'quotemeta', 'exists', 'delete', 'each', 'keys', 'values', 'rand', 'srand',
  'chdir', 'rmdir', 'readlink', 'lock', 'exit', 'umask', 'sleep', 'localtime', 'gmtime', 'alarm', 'caller',
  'fc', 'chroot', 'undef', 'shift', 'pop', 'stat', 'lstat', 'readdir', 'closedir', 'rewinddir', 'fileno', 'uc', 'getc',
  'chomp', 'chop', 'require', 'close', 'eof', 'tell', 'binmode', 'select', 'pos',
]);
// builtin list operators (functions taking a list)
export const LIST_OPS = new Set([
  'push', 'unshift', 'splice', 'join', 'split', 'sprintf', 'die', 'warn', 'reverse', 'unlink', 'pack', 'unpack',
  'open', 'read', 'sysread', 'syswrite', 'seek', 'sysseek', 'bless', 'chmod', 'chown', 'utime', 'mkdir',
  'opendir', 'rename', 'kill', 'exec', 'system', 'index', 'rindex', 'substr', 'atan2', 'vec', 'sprintf', 'printf',
  'print', 'say', 'return', 'sort', 'map', 'grep', 'wantarray', 'time', 'times', 'wait', 'link', 'symlink',
  'truncate', 'sysopen', 'crypt', 'formline', 'getpwuid', 'getpwnam', 'getgrgid', 'getgrnam', 'exit', 'dump',
  'local', 'flock', 'ioctl', 'fcntl', 'socket', 'pipe', 'waitpid', 'glob',
]);
const TERMINATORS = new Set([')', ']', '}', ';', ':', ',', '=>']);

export class Parser {
  constructor(src, file, opts = {}) {
    this.lx = new Lexer(src, file);
    this.file = file;
    this.knownSubs = new Set(opts.knownSubs || []);
    this.protos = opts.protos || new Map();
    // pre-scan for sub declarations so barewords can be recognised as calls
    const re = /^\s*sub\s+([A-Za-z_][\w:]*)\s*(?:\(([^)]*)\))?/gm;
    let m;
    while ((m = re.exec(src))) {
      const nm = m[1].replace(/^.*::/, '');
      this.knownSubs.add(nm);
      if (m[2] !== undefined) this.protos.set(nm, m[2].replace(/\s+/g, ''));
    }
    this.pkg = 'main';
  }

  error(msg, tok) {
    this.lx.error(msg, tok ? tok.start : undefined);
  }

  peek(mode = 'term') { return this.lx.peek(mode); }
  next(mode = 'term') { return this.lx.next(mode); }
  isOp(tok, v) { return tok.type === 'op' && tok.value === v; }
  isWord(tok, v) { return tok.type === 'ident' && tok.value === v; }
  expectOp(v, mode = 'op') {
    const tok = this.next(mode);
    if (!this.isOp(tok, v)) this.error(`Expected '${v}' but found ${tokDesc(tok)}`, tok);
    return tok;
  }

  // ------------------------------------------------------------------ statements
  parseProgram() {
    const body = this.parseStatements(false);
    return { t: 'program', body, comments: this.lx.comments };
  }

  parseStatements(inBlock) {
    const stmts = [];
    for (;;) {
      const tok = this.peek('term');
      if (tok.type === 'eof') {
        if (inBlock) this.error('Unexpected end of file in block', tok);
        break;
      }
      if (inBlock && this.isOp(tok, '}')) break;
      const st = this.parseStatement();
      if (st) stmts.push(st);
    }
    return stmts;
  }

  parseBlock() {
    const open = this.next('term');
    if (!this.isOp(open, '{')) this.error(`Expected block but found ${tokDesc(open)}`, open);
    const body = this.parseStatements(true);
    const close = this.next('term');
    return { t: 'block', body, line: open.line, endLine: close.line, pos: open.start, endPos: close.start };
  }

  parseStatement() {
    const tok = this.peek('term');
    const line = tok.line;
    const pos = tok.start;
    const st = this.parseStatement2();
    if (st) { st.line = st.line || line; st.pos = pos; st.endPos = this.lx.pos; st.endLine = this.lx.lineOf(Math.max(pos, this.lx.pos - 1)); }
    return st;
  }

  parseStatement2() {
    let tok = this.peek('term');
    if (this.isOp(tok, ';')) { this.next(); return null; }
    let label = null;
    // label?
    if (tok.type === 'ident' && !tok.value.includes('::') && /^[A-Za-z_]\w*$/.test(tok.value)) {
      const save = this.lx.save();
      this.next();
      const c = this.peek('op');
      if (this.isOp(c, ':') && this.lx.src[c.start + 1] !== ':' && !['default'].includes(tok.value)) {
        this.next('op');
        label = tok.value;
        tok = this.peek('term');
        if (this.isOp(tok, ';')) { this.next(); return { t: 'label', label }; }
        if (this.isOp(tok, '}')) return { t: 'label', label };
        // labelled statement of any kind (loops use the label for next/last, others for goto)
        const st = this.parseStatement2();
        if (!st) return { t: 'label', label };
        if (!st.label) st.label = label;
        return st;
      } else {
        this.lx.restore(save);
      }
    }
    if (this.isOp(tok, '{')) {
      const block = this.parseBlock();
      return { t: 'bare', block, label };
    }
    if (tok.type === 'ident') {
      switch (tok.value) {
        case 'sub': {
          const save = this.lx.save();
          this.next();
          const nt = this.peek('term');
          if (nt.type === 'ident') return this.parseSubDef(nt);
          this.lx.restore(save);
          break;
        }
        case 'package': {
          this.next();
          const name = this.next('term');
          this.pkg = name.value;
          const nt = this.peek('op');
          if (this.isOp(nt, '{')) {
            const block = this.parseBlock();
            return { t: 'package', name: name.value, block };
          }
          this.endStatement();
          return { t: 'package', name: name.value };
        }
        case 'use': case 'no': {
          this.next();
          const mod = this.next('term');
          let args = null;
          if (mod.type === 'num') { this.endStatement(); return { t: 'nop' }; }   // use 5.004
          const nt = this.peek('term');
          if (!this.isOp(nt, ';')) {
            // version number?
            if (nt.type === 'num') { this.next(); }
            const nt2 = this.peek('term');
            if (!this.isOp(nt2, ';')) args = this.parseExpr(1);
          }
          this.endStatement();
          return { t: 'use', no: tok.value === 'no', module: mod.value, args };
        }
        case 'BEGIN': case 'END': case 'INIT': case 'CHECK': {
          const save = this.lx.save();
          this.next();
          if (this.isOp(this.peek('term'), '{')) {
            const block = this.parseBlock();
            return { t: tok.value === 'BEGIN' ? 'begin' : 'endblock', block };
          }
          this.lx.restore(save);
          break;
        }
        case 'if': case 'unless': {
          this.next();
          const conds = [];
          this.expectOp('(', 'term');
          let cond = this.parseExprOrEmpty();
          this.expectOp(')');
          if (tok.value === 'unless') cond = { t: 'unop', op: '!', e: cond };
          conds.push({ cond, block: this.parseBlock() });
          let els = null;
          for (;;) {
            const nt = this.peek('term');
            if (this.isWord(nt, 'elsif')) {
              this.next();
              this.expectOp('(', 'term');
              const c = this.parseExpr(1);
              this.expectOp(')');
              conds.push({ cond: c, block: this.parseBlock() });
            } else if (this.isWord(nt, 'else')) {
              this.next();
              els = this.parseBlock();
              break;
            } else break;
          }
          return { t: 'if', conds, else: els };
        }
        case 'while': case 'until': {
          this.next();
          this.expectOp('(', 'term');
          let cond = this.isOp(this.peek('term'), ')') ? null : this.parseExpr(1);
          this.expectOp(')');
          if (tok.value === 'until') cond = { t: 'unop', op: '!', e: cond };
          const block = this.parseBlock();
          let cont = null;
          if (this.isWord(this.peek('term'), 'continue')) { this.next(); cont = this.parseBlock(); }
          return { t: 'while', cond, block, label, cont };
        }
        case 'for': case 'foreach': {
          this.next();
          let nt = this.peek('term');
          let varNode = null;
          if (this.isWord(nt, 'my') || this.isWord(nt, 'our') || this.isWord(nt, 'local')) {
            this.next();
            const v = this.next('term');
            varNode = { t: 'var', sigil: '$', name: v.name, my: true };
          } else if (nt.type === 'var' && nt.sigil === '$') {
            this.next();
            varNode = { t: 'var', sigil: '$', name: nt.name, my: false };
          }
          this.expectOp('(', 'term');
          if (!varNode) {
            // C-style for?
            const save = this.lx.save();
            let init = null;
            if (!this.isOp(this.peek('term'), ';')) init = this.parseExpr(1);
            const sep = this.peek('op');
            if (this.isOp(sep, ';')) {
              this.next('op');
              const cond = this.isOp(this.peek('term'), ';') ? null : this.parseExpr(1);
              this.expectOp(';', 'term');
              const step = this.isOp(this.peek('term'), ')') ? null : this.parseExpr(1);
              this.expectOp(')', 'term');
              const block = this.parseBlock();
              return { t: 'cfor', init, cond, step, block, label };
            }
            this.lx.restore(save);
          }
          const list = this.isOp(this.peek('term'), ')') ? { t: 'list', items: [] } : this.parseExpr(1);
          this.expectOp(')');
          const block = this.parseBlock();
          return { t: 'foreach', var: varNode, list, block, label };
        }
        case 'format': break;
      }
    }
    // expression statement
    const expr = this.parseExpr(1);
    const st = this.parseModifiers({ t: 'expr', expr });
    this.endStatement();
    if (label) st.label = label;
    return st;
  }

  parseExprOrEmpty() {
    if (this.isOp(this.peek('term'), ')')) return { t: 'num', v: 1 };
    return this.parseExpr(1);
  }

  parseModifiers(st) {
    const tok = this.peek('op');
    if (tok.type === 'ident' && MODIFIERS.has(tok.value)) {
      this.next('op');
      const cond = this.parseExpr(1);
      switch (tok.value) {
        case 'if': return { t: 'if', conds: [{ cond, block: blockOf(st) }], else: null, modifier: true };
        case 'unless': return { t: 'if', conds: [{ cond: { t: 'unop', op: '!', e: cond }, block: blockOf(st) }], else: null, modifier: true };
        case 'while': case 'until': {
          const c = tok.value === 'until' ? { t: 'unop', op: '!', e: cond } : cond;
          if (st.t === 'expr' && st.expr.t === 'doblock') return { t: 'dowhile', cond: c, block: st.expr.block };
          return { t: 'while', cond: c, block: blockOf(st), modifier: true };
        }
        case 'for': case 'foreach':
          return { t: 'foreach', var: null, list: cond, block: blockOf(st), modifier: true };
      }
    }
    return st;
  }

  endStatement() {
    const tok = this.peek('op');
    if (this.isOp(tok, ';')) { this.next('op'); return; }
    if (this.isOp(tok, '}') || tok.type === 'eof') return;
    this.error(`Expected ';' but found ${tokDesc(tok)}`, tok);
  }

  parseSubDef(nameTok) {
    this.next('term');
    let name = nameTok.value;
    let proto = null;
    const nt = this.peek('op');
    if (this.isOp(nt, '(')) {
      // prototype: read raw up to ')'
      const src = this.lx.src;
      const start = nt.start + 1;
      const end = src.indexOf(')', start);
      proto = src.slice(start, end);
      this.lx.restore(end + 1);
    }
    const nt2 = this.peek('term');
    if (this.isOp(nt2, ';')) { this.next(); return { t: 'subdecl', name, proto }; }
    const body = this.parseBlock();
    this.knownSubs.add(name.replace(/^.*::/, ''));
    return { t: 'sub', name, proto, body, pkg: this.pkg };
  }

  // ------------------------------------------------------------------ expressions
  parseExpr(minPrec) {
    let left = this.parseUnary(minPrec);
    for (;;) {
      const tok = this.peek('op');
      let op;
      if (tok.type === 'op' && BINOPS[tok.value]) op = tok.value;
      else if (tok.type === 'ident' && WORD_OPS.has(tok.value)) op = tok.value;
      else break;
      const [prec, assoc] = BINOPS[op];
      if (prec < minPrec) break;
      this.next('op');
      if (op === '?') {
        const a = this.parseExpr(7);
        this.expectOp(':');
        const b = this.parseExpr(8);
        left = { t: 'cond', c: left, a, b };
        continue;
      }
      if (op === ',' || op === '=>') {
        const items = left.t === 'list' && !left.paren ? left.items : [left];
        if (op === '=>' && left.t === 'bareword') items[items.length - 1] = { t: 'str', v: left.name };
        // trailing comma?
        if (this.canStartTerm(this.peek('term'))) {
          items.push(this.parseExpr(7));
        }
        for (;;) {
          const t2 = this.peek('op');
          if (this.isOp(t2, ',') || this.isOp(t2, '=>')) {
            this.next('op');
            if (this.isOp(t2, '=>')) {
              const last = items[items.length - 1];
              if (last && last.t === 'bareword') items[items.length - 1] = { t: 'str', v: last.name };
            }
            if (this.canStartTerm(this.peek('term'))) items.push(this.parseExpr(7));
          } else break;
        }
        left = { t: 'list', items };
        continue;
      }
      const rprec = assoc === 'R' ? prec : prec + 1;
      let right;
      if (op === '=~' || op === '!~') {
        right = this.parseUnary(21);
        left = this.bindMatch(left, right, op === '!~');
        continue;
      }
      right = this.parseExpr(rprec);
      if (ASSIGN_OPS.has(op)) left = { t: 'assign', op, l: left, r: right };
      else if (op === '&&' || op === '||' || op === '//' || op === 'and' || op === 'or' || op === 'xor') left = { t: 'logop', op, l: left, r: right };
      else if (op === '..' || op === '...') left = { t: 'range', l: left, r: right };
      else left = { t: 'binop', op, l: left, r: right };
    }
    return left;
  }

  bindMatch(target, right, neg) {
    if (right.t === 'match' || right.t === 'subst' || right.t === 'trans') {
      return Object.assign({}, right, { target, neg });
    }
    // $x =~ $re  or $x =~ "string": treat as match with interpolated pattern
    return { t: 'match', target, neg, re: { parts: [right], flags: '' }, dynamic: true };
  }

  canStartTerm(tok) {
    switch (tok.type) {
      case 'num': case 'str': case 'istr': case 'qw': case 'match': case 'subst': case 'trans': case 'qr':
      case 'readline': case 'var': case 'cast': case 'filetest':
        return true;
      case 'ident':
        return !WORD_OPS.has(tok.value) && !MODIFIERS.has(tok.value);
      case 'op':
        return ['(', '[', '{', '\\', '-', '+', '!', '~', '++', '--', '<'].includes(tok.value);
    }
    return false;
  }

  // like canStartTerm, but used after named operators where "-" or "+" followed by a space
  // is more likely to be a binary operator
  canStartArg(tok) {
    if (tok.type === 'op' && (tok.value === '-' || tok.value === '+')) {
      const c = this.lx.src[tok.start + 1];
      return !/\s/.test(c) && c !== '=';
    }
    if (tok.type === 'op' && tok.value === '<') return false;
    if (tok.type === 'op' && tok.value === '{') return true;
    return this.canStartTerm(tok);
  }

  parseUnary(minPrec = 0) {
    const tok = this.peek('term');
    if (tok.type === 'op') {
      switch (tok.value) {
        case '!': this.next(); return { t: 'unop', op: '!', e: this.parseExpr(21) };
        case '~': this.next(); return { t: 'unop', op: '~', e: this.parseExpr(21) };
        case '\\': {
          this.next();
          const e = this.parseExpr(21);
          return { t: 'ref', e };
        }
        case '-': {
          this.next();
          const nt = this.peek('term');
          if (nt.type === 'ident' && !this.lx.src[tok.start + 1].match(/\s/) && !this.knownSubs.has(nt.value) && !NAMED_UNARY.has(nt.value) && !LIST_OPS.has(nt.value) &&
              !nt.value.includes('::') && this.lx.src[nt.end] !== '(') {
            // -bareword => "-bareword"
            this.next();
            return { t: 'str', v: '-' + nt.value };
          }
          const e = this.parseExpr(21);
          if (e.t === 'num') return { t: 'num', v: -e.v, raw: '-' + e.raw, isInt: e.isInt };
          return { t: 'unop', op: 'neg', e };
        }
        case '+': this.next(); return this.parseExpr(21);
        case '++': case '--': {
          this.next();
          const e = this.parseExpr(23);
          return { t: 'preinc', op: tok.value, e };
        }
      }
    }
    if (tok.type === 'ident' && tok.value === 'not') {
      this.next();
      if (this.isOp(this.peek('term'), '(')) {
        // not(...) acts like a function call on the parenthesized expression
        const t = this.parsePostfix(this.parseTerm());
        return { t: 'unop', op: '!', e: t, word: true };
      }
      return { t: 'unop', op: '!', e: this.parseExpr(4), word: true };
    }
    if (tok.type === 'filetest') {
      this.next();
      let arg = null;
      if (this.canStartArg(this.peek('term'))) arg = this.parseExpr(17);
      return { t: 'filetest', op: tok.value, arg };
    }
    let term = this.parseTerm();
    return this.parsePostfix(term);
  }

  parsePostfix(term) {
    for (;;) {
      const tok = this.peek('op');
      if (this.isOp(tok, '->')) {
        this.next('op');
        const nt = this.peek('term');
        if (this.isOp(nt, '[')) {
          this.next();
          const idx = this.parseExpr(1);
          this.expectOp(']');
          term = { t: 'elem', kind: 'array', base: { t: 'deref', sigil: '@', e: term }, idx };
          term = this.parseSubscripts(term);
        } else if (this.isOp(nt, '{')) {
          this.next();
          const key = this.parseHashKey();
          term = { t: 'elem', kind: 'hash', base: { t: 'deref', sigil: '%', e: term }, idx: key };
          term = this.parseSubscripts(term);
        } else if (this.isOp(nt, '(')) {
          this.next();
          const args = this.parseCallArgs();
          term = { t: 'callref', fn: term, args };
        } else if (this.isOp(nt, '@') ) {
          // postfix deref ->@*
          this.next(); this.expectOp('*', 'op');
          term = { t: 'deref', sigil: '@', e: term };
        } else if (nt.type === 'ident') {
          this.next();
          let args = null;
          if (this.isOp(this.peek('op'), '(')) { this.next('op'); args = this.parseCallArgs(); }
          term = { t: 'method', inv: term, name: nt.value, args: args || [] };
        } else if (nt.type === 'var' && nt.sigil === '$') {
          this.next();
          let args = [];
          if (this.isOp(this.peek('op'), '(')) { this.next('op'); args = this.parseCallArgs(); }
          term = { t: 'method', inv: term, name: null, dyn: { t: 'var', sigil: '$', name: nt.name }, args };
        } else {
          this.error(`Unexpected token after ->: ${tokDesc(nt)}`, nt);
        }
        continue;
      }
      if (this.isOp(tok, '++') || this.isOp(tok, '--')) {
        this.next('op');
        term = { t: 'postinc', op: tok.value, e: term };
        continue;
      }
      if (this.isOp(tok, '(') && term.t === 'deref' && term.sigil === '&') {
        this.next('op');
        term = { t: 'callref', fn: term.e, args: this.parseCallArgs() };
        continue;
      }
      break;
    }
    return term;
  }

  // subscripts directly following an element access (implicit arrow)
  parseSubscripts(term) {
    for (;;) {
      const tok = this.peek('op');
      if (tok.space) break;
      if (this.isOp(tok, '[')) {
        this.next('op');
        const idx = this.parseExpr(1);
        this.expectOp(']');
        term = { t: 'elem', kind: 'array', base: { t: 'deref', sigil: '@', e: term }, idx };
      } else if (this.isOp(tok, '{')) {
        this.next('op');
        const key = this.parseHashKey();
        term = { t: 'elem', kind: 'hash', base: { t: 'deref', sigil: '%', e: term }, idx: key };
      } else if (this.isOp(tok, '(') && false) {
        break;
      } else break;
    }
    return term;
  }

  // parse hash subscript contents (after '{'), including closing '}'
  parseHashKey() {
    const tok = this.peek('term');
    // bareword key?
    if (tok.type === 'ident' || (tok.type === 'op' && tok.value === '-')) {
      const src = this.lx.src;
      const m = /^\s*(-?[A-Za-z_]\w*)\s*\}/.exec(src.slice(tok.start - (tok.type === 'op' ? 0 : 0), tok.start + 200));
      if (m) {
        this.lx.restore(tok.start + m[0].length);
        return { t: 'str', v: m[1] };
      }
    }
    const e = this.parseExpr(1);
    this.expectOp('}');
    return e;
  }

  parseCallArgs() {
    // after '(' : parse until ')'
    if (this.isOp(this.peek('term'), ')')) { this.next(); return []; }
    const e = this.parseExpr(1);
    this.expectOp(')');
    return e.t === 'list' && !e.paren ? e.items : [e];
  }

  parseListOpArgs() {
    const tok = this.peek('term');
    if (this.isOp(tok, '(') ) {
      this.next();
      const args = this.parseCallArgs();
      return { args, parens: true };
    }
    if (!this.canStartArg(tok)) return { args: [], parens: false };
    const e = this.parseExpr(5);
    return { args: e.t === 'list' && !e.paren ? e.items : [e], parens: false };
  }

  // parse variable token with following subscripts
  parseVarTok(tok) {
    const name = tok.name;
    const sigil = tok.sigil;
    if (sigil === '$#') return { t: 'lastidx', base: { t: 'var', sigil: '@', name } };
    const nt = this.peek('op');
    const adj = !nt.space;
    if (sigil === '$') {
      if (adj && this.isOp(nt, '[') && !tok.braced_noindex) {
        this.next('op');
        const idx = this.parseExpr(1);
        this.expectOp(']');
        return this.parseSubscripts({ t: 'elem', kind: 'array', base: { t: 'var', sigil: '@', name }, idx });
      }
      if (adj && this.isOp(nt, '{')) {
        this.next('op');
        const key = this.parseHashKey();
        return this.parseSubscripts({ t: 'elem', kind: 'hash', base: { t: 'var', sigil: '%', name }, idx: key });
      }
      return { t: 'var', sigil: '$', name };
    }
    if (sigil === '@') {
      if (adj && this.isOp(nt, '[')) {
        this.next('op');
        const idx = this.isOp(this.peek('term'), ']') ? { t: 'list', items: [] } : this.parseExpr(1);
        this.expectOp(']');
        return { t: 'slice', kind: 'array', base: { t: 'var', sigil: '@', name }, list: idx };
      }
      if (adj && this.isOp(nt, '{')) {
        this.next('op');
        const key = this.parseExpr(1);
        this.expectOp('}');
        return { t: 'slice', kind: 'hash', base: { t: 'var', sigil: '%', name }, list: key };
      }
      return { t: 'var', sigil: '@', name };
    }
    if (sigil === '%') return { t: 'var', sigil: '%', name };
    if (sigil === '&') {
      // &name(...) or &name
      if (this.isOp(nt, '(')) {
        this.next('op');
        return { t: 'call', name, args: this.parseCallArgs(), amp: true, parens: true };
      }
      return { t: 'funcref', name };
    }
    if (sigil === '*') return { t: 'glob', name };
    this.error('Bad variable');
  }

  // parse cast: sigil followed by $var / ${...} / $$var...
  parseCast(sigil) {
    let inner;
    const tok = this.peek('term');
    if (this.isOp(tok, '{')) {
      this.next();
      const save = this.lx.save();
      inner = this.parseExpr(1);
      this.expectOp('}', 'op');
    } else if (tok.type === 'var' && tok.sigil === '$') {
      this.next();
      inner = { t: 'var', sigil: '$', name: tok.name };
    } else if (tok.type === 'cast' && tok.value === '$') {
      this.next();
      inner = this.parseCast('$');
      return this.wrapCast(sigil, inner);
    } else {
      this.error(`Bad cast ${sigil}`, tok);
    }
    return this.wrapCast(sigil, inner);
  }

  wrapCast(sigil, inner) {
    const nt = this.peek('op');
    const adj = !nt.space;
    if (sigil === '$') {
      if (adj && this.isOp(nt, '[')) {
        this.next('op');
        const idx = this.parseExpr(1);
        this.expectOp(']');
        return this.parseSubscripts({ t: 'elem', kind: 'array', base: { t: 'deref', sigil: '@', e: inner }, idx });
      }
      if (adj && this.isOp(nt, '{')) {
        this.next('op');
        const key = this.parseHashKey();
        return this.parseSubscripts({ t: 'elem', kind: 'hash', base: { t: 'deref', sigil: '%', e: inner }, idx: key });
      }
      return { t: 'deref', sigil: '$', e: inner };
    }
    if (sigil === '@') {
      if (adj && this.isOp(nt, '[')) {
        this.next('op');
        const idx = this.parseExpr(1);
        this.expectOp(']');
        return { t: 'slice', kind: 'array', base: { t: 'deref', sigil: '@', e: inner }, list: idx };
      }
      if (adj && this.isOp(nt, '{')) {
        this.next('op');
        const key = this.parseExpr(1);
        this.expectOp('}');
        return { t: 'slice', kind: 'hash', base: { t: 'deref', sigil: '%', e: inner }, list: key };
      }
      return { t: 'deref', sigil: '@', e: inner };
    }
    if (sigil === '%') return { t: 'deref', sigil: '%', e: inner };
    if (sigil === '$#') return { t: 'lastidx', base: { t: 'deref', sigil: '@', e: inner } };
    if (sigil === '&') {
      if (this.isOp(nt, '(')) {
        this.next('op');
        return { t: 'callref', fn: inner, args: this.parseCallArgs() };
      }
      return { t: 'callref', fn: inner, args: null, curArgs: true };
    }
    if (sigil === '*') return { t: 'glob', e: inner };
    this.error('Bad cast');
  }

  parseTerm() {
    const tok = this.next('term');
    switch (tok.type) {
      case 'num': return { t: 'num', v: tok.value, raw: tok.raw, isInt: tok.isInt };
      case 'str': return { t: 'str', v: tok.value };
      case 'istr': return this.parseInterp(tok.raw, tok.delim, tok.line);
      case 'qw': return { t: 'list', items: tok.words.map((w) => ({ t: 'str', v: w })), qw: true };
      case 'match': return { t: 'match', target: null, re: this.parseRegex(tok.pat, tok.delim, tok.line), flags: tok.flags };
      case 'qr': return { t: 'qr', re: this.parseRegex(tok.pat, tok.delim, tok.line), flags: tok.flags };
      case 'subst': {
        const re = this.parseRegex(tok.pat, tok.delim, tok.line);
        let repl;
        if (tok.flags.includes('e')) {
          const sub = new Parser(tok.repl, this.file + '(s///e)', { knownSubs: this.knownSubs });
          sub.lx.lineOffset = tok.line;
          repl = { t: 'code', body: sub.parseStatements(false) };
          if (tok.flags.split('e').length > 2) repl.ee = true;
        } else if (tok.delim === "'") {
          repl = { t: 'str', v: tok.repl };
        } else {
          repl = this.parseInterp(tok.repl, CLOSE_OF[tok.delim] || tok.delim, tok.line, true);
        }
        return { t: 'subst', target: null, re, repl, flags: tok.flags };
      }
      case 'trans': return { t: 'trans', target: null, from: tok.from, to: tok.to, flags: tok.flags };
      case 'readline': return { t: 'readline', fh: tok.value };
      case 'var': return this.parseVarTok(tok);
      case 'cast': return this.parseCast(tok.value);
      case 'op':
        switch (tok.value) {
          case '(': {
            if (this.isOp(this.peek('term'), ')')) {
              this.next();
              return this.parseListSlice({ t: 'list', items: [], paren: true });
            }
            const e = this.parseExpr(1);
            this.expectOp(')');
            const lst = e.t === 'list' && !e.paren ? { t: 'list', items: e.items, paren: true } : { t: 'list', items: [e], paren: true };
            return this.parseListSlice(lst);
          }
          case '[': {
            if (this.isOp(this.peek('term'), ']')) { this.next(); return { t: 'anonarray', items: [] }; }
            const e = this.parseExpr(1);
            this.expectOp(']');
            return { t: 'anonarray', items: e.t === 'list' && !e.paren ? e.items : [e] };
          }
          case '{': {
            if (this.isOp(this.peek('term'), '}')) { this.next(); return { t: 'anonhash', items: [] }; }
            const e = this.parseExpr(1);
            this.expectOp('}');
            return { t: 'anonhash', items: e.t === 'list' && !e.paren ? e.items : [e] };
          }
          case '<': {
            // <$fh> not caught by lexer?
            this.error('Unexpected <', tok);
          }
        }
        this.error(`Unexpected ${tokDesc(tok)}`, tok);
        break;
      case 'ident': return this.parseIdent(tok);
      case 'eof': this.error('Unexpected end of file', tok);
    }
    this.error(`Unexpected token ${tokDesc(tok)}`, tok);
  }

  parseListSlice(lst) {
    const nt = this.peek('op');
    if (this.isOp(nt, '[')) {
      this.next('op');
      const idx = this.parseExpr(1);
      this.expectOp(']');
      return { t: 'lslice', list: lst, idx };
    }
    return lst;
  }

  parseIdent(tok) {
    const name = tok.value;
    const nt = this.peek('op');
    // fat comma => bareword string
    if (this.isOp(nt, '=>')) return { t: 'bareword', name };
    switch (name) {
      case 'my': case 'our': case 'local': case 'state': {
        const t2 = this.peek('term');
        if (this.isOp(t2, '(')) {
          this.next();
          const vars = [];
          for (;;) {
            const v = this.peek('term');
            if (this.isOp(v, ')')) { this.next(); break; }
            if (this.isOp(v, ',')) { this.next(); continue; }
            if (name === 'local') { vars.push(this.parseExpr(7)); continue; }
            this.next();
            if (v.type === 'var') vars.push({ t: 'var', sigil: v.sigil, name: v.name });
            else if (this.isWord(v, 'undef')) vars.push({ t: 'undef' });
            else this.error('Bad variable in declaration', v);
          }
          return { t: 'my', decl: name, vars, paren: true };
        }
        if (name === 'local') {
          const e = this.parseExpr(21);
          return { t: 'my', decl: name, vars: [e], paren: false };
        }
        const v = this.next('term');
        if (v.type !== 'var') this.error('Bad variable in declaration', v);
        return { t: 'my', decl: name, vars: [{ t: 'var', sigil: v.sigil, name: v.name }], paren: false };
      }
      case 'sub': {
        const body = this.parseBlock();
        return { t: 'anonsub', body };
      }
      case 'do': {
        if (this.isOp(this.peek('term'), '{')) return { t: 'doblock', block: this.parseBlock() };
        return { t: 'dofile', e: this.parseExpr(17) };
      }
      case 'eval': {
        const t2 = this.peek('term');
        if (this.isOp(t2, '{')) return { t: 'evalblock', block: this.parseBlock() };
        if (this.isOp(t2, '(')) {
          this.next();
          const args = this.parseCallArgs();
          return { t: 'evalstr', e: args[0] || { t: 'var', sigil: '$', name: '_' } };
        }
        if (this.canStartArg(t2)) return { t: 'evalstr', e: this.parseExpr(17) };
        return { t: 'evalstr', e: { t: 'var', sigil: '$', name: '_' } };
      }
      case 'sort': case 'map': case 'grep': return this.parseSortMapGrep(name);
      case 'print': case 'printf': case 'say': return this.parsePrint(name);
      case 'return': {
        const t2 = this.peek('term');
        if (!this.canStartArg(t2) && !this.isOp(t2, '(')) return { t: 'return', e: null };
        const e = this.parseExpr(5);
        return { t: 'return', e };
      }
      case 'last': case 'next': case 'redo': {
        const t2 = this.peek('term');
        let label = null;
        if (t2.type === 'ident' && !MODIFIERS.has(t2.value) && !WORD_OPS.has(t2.value) && /^[A-Z_]\w*$/i.test(t2.value)) {
          this.next();
          label = t2.value;
        }
        return { t: 'loopctl', op: name, label };
      }
      case 'goto': {
        const t2 = this.next('term');
        if (t2.type === 'ident') return { t: 'goto', label: t2.value };
        if (t2.type === 'cast' && t2.value === '&') return { t: 'gotosub', e: this.parseCast('&') };
        this.error('Unsupported goto', t2);
        break;
      }
      case '__PACKAGE__': return { t: 'str', v: this.pkg };
      case '__FILE__': return { t: 'str', v: this.file };
      case '__LINE__': return { t: 'num', v: tok.line };
      case 'wantarray': {
        if (this.isOp(this.peek('op'), '(')) { this.next('op'); this.expectOp(')', 'term'); }
        return { t: 'wantarray' };
      }
      case 'require': {
        const t2 = this.peek('term');
        if (t2.type === 'ident') {
          this.next();
          return { t: 'require', module: t2.value };
        }
        if (t2.type === 'num') { this.next(); return { t: 'num', v: 1 }; }
        return { t: 'require', e: this.parseExpr(17) };
      }
      case 'qw': break;
    }
    // class method call:  Foo::Bar->method  or Foo::Bar::->method
    if (this.isOp(nt, '->')) {
      return { t: 'bareword', name: name.replace(/::$/, '') };
    }
    if (name.endsWith('::')) return { t: 'str', v: name.slice(0, -2) };
    // named unary ops
    if (NAMED_UNARY.has(name)) {
      const t2 = this.peek('term');
      if (this.isOp(t2, '(')) {
        this.next();
        const args = this.parseCallArgs();
        return { t: 'call', name, args, parens: true, builtin: true };
      }
      if (this.canStartArg(t2) && !(t2.type === 'ident' && (t2.value === 'or' || t2.value === 'and'))) {
        // argument with precedence above comparison operators
        const arg = this.parseExpr(17);
        return { t: 'call', name, args: [arg], parens: false, builtin: true };
      }
      return { t: 'call', name, args: [], parens: false, builtin: true };
    }
    if (LIST_OPS.has(name)) {
      const { args, parens } = this.parseListOpArgs();
      return { t: 'call', name, args, parens, builtin: true };
    }
    // function call with parens
    const t2 = this.peek('term');
    if (this.isOp(t2, '(')) {
      this.next();
      const args = this.parseCallArgs();
      return { t: 'call', name, args, parens: true };
    }
    // known sub called as list operator
    const short = name.replace(/^.*::/, '');
    if (this.knownSubs.has(short) || this.knownSubs.has(name)) {
      const proto = this.protos.get(short);
      if (proto === '') return { t: 'call', name, args: [], parens: false };
      if (proto === '$' || proto === ';$' || proto === '_') {
        if (this.canStartArg(t2)) return { t: 'call', name, args: [this.parseExpr(17)], parens: false };
        return { t: 'call', name, args: [], parens: false };
      }
      if (this.canStartArg(t2) && !this.isOp(t2, '{') && !(t2.type === 'ident' && /^[A-Z_]+$/.test(t2.value) && !this.knownSubs.has(t2.value))) {
        const e = this.parseExpr(5);
        return { t: 'call', name, args: e.t === 'list' && !e.paren ? e.items : [e], parens: false };
      }
      return { t: 'call', name, args: [], parens: false };
    }
    return { t: 'bareword', name };
  }

  parseSortMapGrep(name) {
    let parens = false;
    if (this.isOp(this.peek('term'), '(')) {
      this.next();
      parens = true;
    }
    let block = null, expr = null, subname = null, list;
    const t2 = this.peek('term');
    if (this.isOp(t2, '{')) {
      // block or anon hash?  assume block unless followed by ","
      const save = this.lx.save();
      block = this.parseBlock();
      if (this.isOp(this.peek('op'), ',')) {
        // it was an expression (anon hash)
        this.lx.restore(save);
        block = null;
      }
    } else if (name === 'sort' && t2.type === 'ident' && !NAMED_UNARY.has(t2.value) && !LIST_OPS.has(t2.value) && t2.value !== 'map' && t2.value !== 'grep') {
      this.next();
      subname = t2.value;
    } else if (name === 'sort' && t2.type === 'var' && t2.sigil === '$') {
      // sort $subref @list ?
      const save = this.lx.save();
      this.next();
      const t3 = this.peek('term');
      if (t3.type === 'var' || t3.type === 'cast') subname = { t: 'var', sigil: '$', name: t2.name };
      else this.lx.restore(save);
    }
    if (!block && !subname && name !== 'sort') {
      expr = this.parseExpr(7);
      const c = this.next('op');
      if (!this.isOp(c, ',')) this.error(`Expected ',' after ${name} expression`, c);
    }
    if (parens) {
      if (this.isOp(this.peek('term'), ')')) { this.next(); list = []; }
      else list = this.parseCallArgs();
    } else {
      const t3 = this.peek('term');
      if (this.isOp(t3, ',')) this.next();
      if (!this.canStartArg(this.peek('term'))) list = [];
      else {
        const e = this.parseExpr(5);
        list = e.t === 'list' && !e.paren ? e.items : [e];
      }
    }
    return { t: name, block, expr, subname, list };
  }

  parsePrint(name) {
    let parens = false;
    let fh = null;
    let t2 = this.peek('term');
    if (this.isOp(t2, '(')) {
      // print(...) - but beware print (...) . "x"
      this.next();
      parens = true;
      t2 = this.peek('term');
    }
    if (this.isOp(t2, '{')) {
      this.next();
      fh = this.parseExpr(1);
      this.expectOp('}');
    } else if (t2.type === 'ident' && /^[A-Z_][A-Z0-9_]*$/.test(t2.value) && !this.knownSubs.has(t2.value)) {
      const save = this.lx.save();
      this.next();
      const t3 = this.peek('op');
      if (this.isOp(t3, ',') || this.isOp(t3, '(') || this.isOp(t3, '->') || this.isOp(t3, ';') || this.isOp(t3, ')')) this.lx.restore(save);
      else fh = { t: 'bareword', name: t2.value };
    } else if (t2.type === 'var' && t2.sigil === '$') {
      const save = this.lx.save();
      this.next();
      const t3 = this.peek('term');
      const t3op = this.peek('op');
      if ((t3.type === 'str' || t3.type === 'istr' || t3.type === 'var' || t3.type === 'cast' || t3.type === 'num' || (this.isOp(t3, '(') && t3.space) ||
           (t3.type === 'ident' && !WORD_OPS.has(t3.value) && !MODIFIERS.has(t3.value))) && !(t3op.type === 'op' && BINOPS[t3op.value] && t3op.value !== '<')) {
        fh = { t: 'var', sigil: '$', name: t2.name };
      } else {
        this.lx.restore(save);
      }
    }
    let args;
    if (parens) args = this.isOp(this.peek('term'), ')') ? (this.next(), []) : this.parseCallArgs();
    else {
      if (!this.canStartArg(this.peek('term'))) args = [];
      else {
        const e = this.parseExpr(5);
        args = e.t === 'list' && !e.paren ? e.items : [e];
      }
    }
    return { t: 'print', fn: name, fh, args };
  }

  // ------------------------------------------------------------------ interpolation
  // parse double-quoted string content into an 'interp' node
  parseInterp(raw, delim, line, isRepl) {
    const parts = interpParts(raw, delim, false, this, line);
    if (parts.length === 0) return { t: 'str', v: '' };
    if (parts.length === 1 && parts[0].t === 'str') return parts[0];
    return { t: 'interp', parts };
  }

  parseRegex(raw, delim, line) {
    if (delim === "'") return { parts: [{ t: 'str', v: raw }], raw: true };
    const parts = interpParts(raw, delim, true, this, line);
    return { parts };
  }

  // parse a sub-expression from a string (used for interpolation)
  subParse(text, line) {
    const p = new Parser(text, this.file, { knownSubs: this.knownSubs });
    p.pkg = this.pkg;
    const e = p.parseExpr(1);
    const t = p.peek('op');
    if (t.type !== 'eof') p.error(`Unexpected ${tokDesc(t)} in interpolated expression`, t);
    return e;
  }
}

const CLOSE_OF = { '(': ')', '[': ']', '{': '}', '<': '>' };

function blockOf(st) {
  return { t: 'block', body: [st], line: st.line };
}

function tokDesc(tok) {
  if (!tok) return 'nothing';
  if (tok.type === 'op') return `'${tok.value}'`;
  if (tok.type === 'ident') return `'${tok.value}'`;
  if (tok.type === 'var') return `variable ${tok.sigil}${tok.name}`;
  return tok.type;
}

// find matching close bracket in text starting at pos (pos points just after open bracket)
function matchBracket(text, pos, open, close) {
  let depth = 1;
  for (let i = pos; i < text.length; ++i) {
    const c = text[i];
    if (c === '\\') { ++i; continue; }
    if (c === open) ++depth;
    else if (c === close) { if (--depth === 0) return i; }
    else if (c === '"' || c === "'") {
      // skip quoted strings inside subscripts
      const q = c;
      for (++i; i < text.length && text[i] !== q; ++i) if (text[i] === '\\') ++i;
    }
  }
  return -1;
}

// Split interpolated string/regex text into parts.
// For strings, escapes are processed; for regexes, raw text is kept (except variables).
// Case modification escapes (\U \L \Q \E \u \l) produce wrapper nodes.
export function interpParts(raw, delim, isRegex, parser, line) {
  const closeDelim = CLOSE_OF[delim] || delim;
  // stack of [mode, parts]
  const root = [];
  const stack = [{ mode: null, parts: root }];
  let cur = () => stack[stack.length - 1].parts;
  let lit = '';
  const flush = () => {
    if (lit) { cur().push({ t: 'str', v: lit }); lit = ''; }
  };
  let pendingOne = null; // \u or \l applies to next char/var
  const pushExpr = (e) => {
    flush();
    if (pendingOne) { e = { t: 'call', name: pendingOne === 'u' ? 'ucfirst' : 'lcfirst', args: [e], builtin: true }; pendingOne = null; }
    cur().push(e);
  };
  const endCase = () => {
    flush();
    const top = stack.pop();
    const inner = top.parts.length === 1 ? top.parts[0] : { t: 'interp', parts: top.parts };
    const fn = { U: 'uc', L: 'lc', Q: 'quotemeta', F: 'fc' }[top.mode];
    cur().push({ t: 'call', name: fn, args: [top.parts.length ? inner : { t: 'str', v: '' }], builtin: true, caseMod: true });
  };
  let i = 0;
  const n = raw.length;
  while (i < n) {
    const c = raw[i];
    if (c === '\\' && i + 1 < n) {
      const d = raw[i + 1];
      // case modifiers
      if ('ULQEF'.includes(d)) {
        if (d === 'E') { if (stack.length > 1) endCase(); i += 2; continue; }
        // a new \L, \U or \F ends a previous one (as in Perl's toke.c)
        if ('ULF'.includes(d) && stack.some((s) => s.mode && 'ULF'.includes(s.mode))) endCase();
        flush();
        stack.push({ mode: d, parts: [] });
        i += 2;
        continue;
      }
      if ((d === 'u' || d === 'l') && !isRegex) {
        flush();
        pendingOne = d;
        i += 2;
        continue;
      }
      if (isRegex) {
        // keep escapes verbatim for the regex translator (but unescape the delimiter)
        if (d === closeDelim || d === delim) {
          if (/[\w]/.test(d)) lit += d; else lit += '\\' + d;
        } else lit += c + d;
        i += 2;
        continue;
      }
      // string escapes
      i += 2;
      let ch;
      switch (d) {
        case 'n': ch = '\n'; break;
        case 't': ch = '\t'; break;
        case 'r': ch = '\r'; break;
        case 'f': ch = '\f'; break;
        case 'b': ch = '\b'; break;
        case 'a': ch = '\x07'; break;
        case 'e': ch = '\x1b'; break;
        case 'x': {
          let m;
          if (raw[i] === '{') {
            const e = raw.indexOf('}', i);
            const hex = raw.slice(i + 1, e).trim();
            ch = String.fromCodePoint(parseInt(hex || '0', 16));
            i = e + 1;
          } else {
            m = /^[0-9a-fA-F]{0,2}/.exec(raw.slice(i));
            ch = String.fromCharCode(parseInt(m[0] || '0', 16));
            i += m[0].length;
          }
          break;
        }
        case 'c': ch = String.fromCharCode(raw[i].toUpperCase().charCodeAt(0) ^ 64); ++i; break;
        case 'N': {
          const m = /^\{U\+([0-9a-fA-F]+)\}/.exec(raw.slice(i));
          if (!m) throw new PerlSyntaxError('Unsupported \\N escape');
          ch = String.fromCodePoint(parseInt(m[1], 16));
          i += m[0].length;
          break;
        }
        default:
          if (/[0-7]/.test(d)) {
            const m = /^[0-7]{0,2}/.exec(raw.slice(i));
            ch = String.fromCharCode(parseInt(d + m[0], 8));
            i += m[0].length;
          } else {
            ch = d;
          }
      }
      lit += ch;
      if (pendingOne) { lit = lit.slice(0, -1) + (pendingOne === 'u' ? ch.toUpperCase() : ch.toLowerCase()); pendingOne = null; }
      continue;
    }
    if (c === '$' && i + 1 < n) {
      const r = parseInterpVar(raw, i, isRegex, parser, line);
      if (r) { pushExpr(r.e); i = r.end; continue; }
    }
    if (c === '@' && i + 1 < n) {
      const r = parseInterpArray(raw, i, isRegex, parser, line);
      if (r) { pushExpr({ t: 'joinlist', e: r.e }); i = r.end; continue; }
    }
    lit += c;
    if (pendingOne && !isRegex) { lit = lit.slice(0, -1) + (pendingOne === 'u' ? c.toUpperCase() : c.toLowerCase()); pendingOne = null; }
    ++i;
  }
  flush();
  while (stack.length > 1) endCase();
  return root;
}

// parse "$..." interpolation at position i (raw[i] === '$').  Returns {e, end} or null
function parseInterpVar(raw, i, isRegex, parser, line) {
  let j = i + 1;
  const rest = raw.slice(j);
  let e, m;
  if (isRegex && (rest[0] === ')' || rest[0] === '|' || rest.length === 0 || /^\s/.test(rest) && false)) return null;
  if ((m = /^\{\s*\^?\w+\s*\}/.exec(rest)) && (!/^\{\s*\d/.test(rest) || /^\{\s*\d+\s*\}/.test(rest))) {
    // ${name}
    const name = m[0].replace(/[{}\s]/g, '');
    e = { t: 'var', sigil: '$', name };
    j += m[0].length;
  } else if (rest[0] === '{') {
    // ${ expr } (deref block)
    const end = matchBracket(raw, j + 1, '{', '}');
    if (end < 0) return null;
    const inner = parser.subParse(raw.slice(j + 1, end), line);
    e = { t: 'deref', sigil: '$', e: inner };
    j = end + 1;
  } else if ((m = /^(\$+)(\w+(?:::\w+)*)/.exec(rest))) {
    // $$name (deref) -- possibly with subscripts
    let inner = { t: 'var', sigil: '$', name: m[2] };
    for (let k = 1; k < m[1].length; ++k) inner = { t: 'deref', sigil: '$', e: inner };
    j += m[0].length;
    // subscript applies to the deref'd ref
    const sub = parseSubscriptsInterp(raw, j, { deref: inner }, isRegex, parser, line);
    if (sub) return sub;
    e = { t: 'deref', sigil: '$', e: inner };
  } else if ((m = /^(?:\w+(?:::\w+)*)/.exec(rest)) && !/^\d/.test(rest) || (m = /^\d+/.exec(rest))) {
    const name = m[0];
    j += name.length;
    const sub = parseSubscriptsInterp(raw, j, { name }, isRegex, parser, line);
    if (sub) return sub;
    e = { t: 'var', sigil: '$', name };
  } else if ((m = /^[&`'+!@\/\\,;.0]/.exec(rest)) && !isRegex) {
    e = { t: 'var', sigil: '$', name: m[0] };
    j += 1;
  } else if (isRegex && /^[&`'+]/.test(rest)) {
    e = { t: 'var', sigil: '$', name: rest[0] };
    j += 1;
  } else {
    return null;
  }
  return { e, end: j };
}

// parse subscripts following an interpolated variable
function parseSubscriptsInterp(raw, j, base, isRegex, parser, line) {
  let e = null;
  let any = false;
  for (;;) {
    let k = j;
    let arrow = false;
    if (raw.startsWith('->', k) && (raw[k + 2] === '[' || raw[k + 2] === '{')) { k += 2; arrow = true; }
    const c = raw[k];
    if (c === '[') {
      const end = matchBracket(raw, k + 1, '[', ']');
      if (end < 0) break;
      const inner = raw.slice(k + 1, end);
      // in a regex, this might be a character class
      if (isRegex && !arrow && !/^-?\d+$|^\$\w+$|^\$#\w+$/.test(inner)) break;
      if (!isRegex && !arrow && !/^[-+]?[\w$#{}\[\]\->+*\/ ]+$/.test(inner)) break;
      const idx = parser.subParse(inner, line);
      e = makeElem(e, base, 'array', idx);
      j = end + 1;
      any = true;
    } else if (c === '{') {
      const end = matchBracket(raw, k + 1, '{', '}');
      if (end < 0) break;
      const inner = raw.slice(k + 1, end);
      if (isRegex && !arrow && /^\d*,?\d*$/.test(inner)) break; // quantifier
      let idx;
      if (/^\s*-?[A-Za-z_]\w*\s*$/.test(inner)) idx = { t: 'str', v: inner.trim() };
      else idx = parser.subParse(inner, line);
      e = makeElem(e, base, 'hash', idx);
      j = end + 1;
      any = true;
    } else break;
    if (!e) break;
    base = null;
  }
  return any ? { e, end: j } : null;
}

function makeElem(prev, base, kind, idx) {
  const sig = kind === 'array' ? '@' : '%';
  if (prev) return { t: 'elem', kind, base: { t: 'deref', sigil: sig, e: prev }, idx };
  if (base.deref) return { t: 'elem', kind, base: { t: 'deref', sigil: sig, e: base.deref }, idx };
  return { t: 'elem', kind, base: { t: 'var', sigil: sig, name: base.name }, idx };
}

// parse "@..." interpolation
function parseInterpArray(raw, i, isRegex, parser, line) {
  let j = i + 1;
  const rest = raw.slice(j);
  let m;
  if (rest[0] === '{') {
    const end = matchBracket(raw, j + 1, '{', '}');
    if (end < 0) return null;
    const inner = parser.subParse(raw.slice(j + 1, end), line);
    let e = { t: 'deref', sigil: '@', e: inner };
    j = end + 1;
    // slice?
    if (raw[j] === '{' || raw[j] === '[') {
      const open = raw[j], close = open === '{' ? '}' : ']';
      const end2 = matchBracket(raw, j + 1, open, close);
      const idx = parser.subParse(raw.slice(j + 1, end2), line);
      e = { t: 'slice', kind: open === '{' ? 'hash' : 'array', base: { t: 'deref', sigil: open === '{' ? '%' : '@', e: inner }, list: idx };
      j = end2 + 1;
    }
    return { e, end: j };
  }
  if ((m = /^\$(\w+)/.exec(rest))) {
    j += m[0].length;
    const inner = { t: 'var', sigil: '$', name: m[1] };
    if (raw[j] === '{' || raw[j] === '[') {
      const open = raw[j], close = open === '{' ? '}' : ']';
      const end2 = matchBracket(raw, j + 1, open, close);
      const idx = parser.subParse(raw.slice(j + 1, end2), line);
      return { e: { t: 'slice', kind: open === '{' ? 'hash' : 'array', base: { t: 'deref', sigil: open === '{' ? '%' : '@', e: inner }, list: idx }, end: end2 + 1 };
    }
    return { e: { t: 'deref', sigil: '@', e: inner }, end: j };
  }
  if ((m = /^[A-Za-z_]\w*(?:::\w+)*/.exec(rest))) {
    if (isRegex) return null; // too risky in regexes (email addresses etc.)
    j += m[0].length;
    if (raw[j] === '{' || raw[j] === '[') {
      const open = raw[j], close = open === '{' ? '}' : ']';
      const end2 = matchBracket(raw, j + 1, open, close);
      const idx = parser.subParse(raw.slice(j + 1, end2), line);
      return { e: { t: 'slice', kind: open === '{' ? 'hash' : 'array', base: { t: 'var', sigil: open === '{' ? '%' : '@', name: m[0] }, list: idx }, end: end2 + 1 };
    }
    return { e: { t: 'var', sigil: '@', name: m[0] }, end: j };
  }
  return null;
}

export function parsePerl(src, file, opts) {
  const p = new Parser(src, file, opts);
  return p.parseProgram();
}
