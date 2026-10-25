// Perl lexer for perl2js (a Perl->JavaScript translator specialised for ExifTool's code base).
// The lexer is driven by the parser, which tells it whether a term or an operator is expected
// (this resolves Perl's lexical ambiguities like "/" = divide vs. regex, "%" = mod vs. hash sigil).

const QUOTE_OPS = new Set(['q', 'qq', 'qw', 'm', 's', 'tr', 'y', 'qr']);
const CLOSE = { '(': ')', '[': ']', '{': '}', '<': '>' };
const FILETESTS = 'erwxoRWXOezsfdlpSbcugktTBAMC';

// operators, longest first
const OPS = [
  '<<=', '>>=', '**=', '||=', '&&=', '//=', '<=>', '...', '->',
  '++', '--', '**', '=~', '!~', '==', '!=', '<=', '>=', '&&', '||', '//', '..', '::',
  '<<', '>>', '+=', '-=', '*=', '/=', '.=', '%=', 'x=', '&=', '|=', '^=', '=>',
  '+', '-', '*', '/', '%', '<', '>', '=', '!', '~', '\\', '?', ':', '.', ',', ';',
  '(', ')', '[', ']', '{', '}', '&', '|', '^', '@', '$',
];

export class PerlSyntaxError extends Error {}

export class Lexer {
  constructor(src, file) {
    this.src = src;
    this.file = file || '?';
    this.pos = 0;
    this.skips = new Map();       // heredoc bodies to skip: start -> end
    this.comments = [];           // { pos, line, text, own (comment on its own line) }
    this.commentSet = new Set();
    this.lineStarts = [0];
    for (let i = 0; i < src.length; ++i) if (src.charCodeAt(i) === 10) this.lineStarts.push(i + 1);
    this.endPos = src.length;     // position of __END__ (if any)
    this.cache = new Map();
  }

  lineOf(pos) {
    let lo = 0, hi = this.lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.lineStarts[mid] <= pos) lo = mid; else hi = mid - 1;
    }
    return lo + 1;
  }

  error(msg, pos) {
    if (pos === undefined) pos = this.pos;
    const line = this.lineOf(pos);
    const ls = this.lineStarts[line - 1];
    const text = this.src.slice(ls, this.src.indexOf('\n', ls) >>> 0 || undefined).slice(0, 200);
    throw new PerlSyntaxError(`${this.file}:${line}: ${msg}\n  >> ${text}`);
  }

  // skip whitespace, comments, POD and heredoc bodies; returns {pos, nl}
  skipSpace(pos) {
    const src = this.src;
    let nl = false;
    for (;;) {
      if (pos >= this.endPos) return { pos: this.endPos, nl };
      if (this.skips.has(pos)) { pos = this.skips.get(pos); nl = true; continue; }
      const c = src[pos];
      if (c === ' ' || c === '\t' || c === '\r' || c === '\f') { ++pos; continue; }
      if (c === '\n') {
        ++pos; nl = true;
        // POD starts with '=' + letter at the start of a line
        if (src[pos] === '=' && /[a-zA-Z]/.test(src[pos + 1] || '')) {
          const m = /^=cut\b.*$/m.exec(src.slice(pos));
          if (!m) { pos = this.endPos; continue; }
          pos += m.index + m[0].length;
        }
        continue;
      }
      if (c === '#') {
        let e = src.indexOf('\n', pos);
        if (e < 0) e = src.length;
        if (!this.commentSet.has(pos)) {
          this.commentSet.add(pos);
          // is this comment on its own line?
          const ls = this.lineStarts[this.lineOf(pos) - 1];
          const own = /^\s*$/.test(src.slice(ls, pos));
          this.comments.push({ pos, line: this.lineOf(pos), text: src.slice(pos + 1, e).replace(/\s+$/, ''), own });
        }
        pos = e;
        continue;
      }
      if (pos === 0 && c === '=' && /[a-zA-Z]/.test(src[1] || '')) {
        const m = /^=cut\b.*$/m.exec(src);
        pos = m ? m.index + m[0].length : this.endPos;
        continue;
      }
      return { pos, nl };
    }
  }

  // peek at next token without consuming it
  peek(mode = 'term') {
    const key = this.pos + ':' + mode;
    let tok = this.cache.get(key);
    if (!tok) {
      tok = this.lex(this.pos, mode);
      this.cache.set(key, tok);
    }
    return tok;
  }

  next(mode = 'term') {
    const tok = this.peek(mode);
    this.pos = tok.end;
    return tok;
  }

  // raw character lookahead after skipping whitespace
  peekChar(offset = 0) {
    const { pos } = this.skipSpace(this.pos);
    return this.src[pos + offset];
  }

  save() { return this.pos; }
  restore(p) { this.pos = p; }

  lex(start, mode) {
    const { pos, nl } = this.skipSpace(start);
    const tok = this.lex2(pos, mode);
    tok.nl = nl;
    tok.space = pos > start;
    tok.start = pos;
    tok.line = this.lineOf(pos);
    return tok;
  }

  lex2(pos, mode) {
    const src = this.src;
    if (pos >= this.endPos) return { type: 'eof', end: pos };
    const c = src[pos];
    const c1 = src[pos + 1];

    // numbers
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(c1 || '') && mode === 'term')) return this.lexNumber(pos);

    // identifiers / keywords / quote-like operators
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_]\w*(?:(?:::|')\w+)*(?:::)?/.exec(src.slice(pos, pos + 256));
      let word = m[0];
      // don't treat "'" as package separator (only "::" used in ExifTool)
      if (word.includes("'")) word = word.slice(0, word.indexOf("'"));
      let end = pos + word.length;
      if (word === '__END__' || word === '__DATA__') {
        this.endPos = pos;
        return { type: 'eof', end: pos };
      }
      if (mode === 'op') {
        // repetition operator
        if (word === 'x' || /^x\d+$/.test(word)) {
          if (src[pos + 1] === '=' && src[pos + 2] !== '=' && src[pos + 2] !== '~') return { type: 'op', value: 'x=', end: pos + 2 };
          return { type: 'op', value: 'x', end: pos + 1 };
        }
      }
      if (QUOTE_OPS.has(word) && mode === 'term') {
        // check that this isn't a bareword hash key or fat-comma lhs
        const after = this.skipSpace(end);
        const nc = src[after.pos];
        const isBare = (src.startsWith('=>', after.pos)) ||
          (nc === '}' && this.prevIsBrace(pos)) || nc === ',' || nc === ';' || (nc === ')' && word !== 'q') ||
          (nc === '=' && src[after.pos + 1] !== '~' && word !== 's' && word !== 'y' && word !== 'tr' && word !== 'm' && word !== 'q' && word !== 'qq' && word !== 'qr' && word !== 'qw');
        if (!isBare) return this.lexQuote(word, end);
      }
      // heredoc start? (handled in "<<")
      return { type: 'ident', value: word, end };
    }

    // variables
    if (c === '$' || c === '@' || (c === '%' && mode === 'term') || (c === '&' && mode === 'term' && c1 !== '&') || (c === '*' && mode === 'term' && /[A-Za-z_{]/.test(c1 || ''))) {
      const t = this.lexVar(pos, mode);
      if (t) return t;
    }

    // strings
    if (c === "'") return this.lexDelimited(pos + 1, "'", (s, e) => ({ type: 'str', value: unescapeSingle(s, "'"), end: e }));
    if (c === '"') return this.lexDelimited(pos + 1, '"', (s, e) => ({ type: 'istr', raw: s, delim: '"', end: e }));
    if (c === '`') return this.lexDelimited(pos + 1, '`', (s, e) => ({ type: 'istr', raw: s, delim: '`', backtick: true, end: e }));

    if (mode === 'term') {
      // regex match
      if (c === '/') {
        return this.lexDelimited(pos + 1, '/', (s, e) => {
          const fl = /^[a-z]*/.exec(src.slice(e, e + 20))[0];
          return { type: 'match', pat: s, delim: '/', flags: fl, end: e + fl.length };
        });
      }
      // file test operators
      if (c === '-' && FILETESTS.includes(c1) && !/[\w]/.test(src[pos + 2] || '') ) {
        // make sure this isn't a "=>" key like -e => or a subtraction
        const after = this.skipSpace(pos + 2);
        if (!src.startsWith('=>', after.pos) && src[after.pos] !== ',') return { type: 'filetest', value: c1, end: pos + 2 };
      }
      // readline / glob
      if (c === '<' && c1 !== '<' && c1 !== '=') {
        const m = /^<(\$?\w*)>/.exec(src.slice(pos, pos + 100));
        if (m) return { type: 'readline', value: m[1], end: pos + m[0].length };
      }
      // heredoc
      if (c === '<' && c1 === '<') {
        const m = /^<<(~?)(?:"([^"\n]*)"|'([^'\n]*)'|([A-Za-z_]\w*))/.exec(src.slice(pos, pos + 100));
        if (m) return this.lexHeredoc(pos, m);
      }
    }

    // operators
    for (const op of OPS) {
      if (src.startsWith(op, pos)) {
        if (op === 'x=') continue;
        return { type: 'op', value: op, end: pos + op.length };
      }
    }
    this.error(`Unexpected character '${c}' (0x${c.charCodeAt(0).toString(16)})`, pos);
  }

  prevIsBrace(pos) {
    let p = pos - 1;
    while (p >= 0 && /\s/.test(this.src[p])) --p;
    return this.src[p] === '{';
  }

  lexNumber(pos) {
    const src = this.src.slice(pos, pos + 100);
    let m;
    if ((m = /^0[xX][0-9a-fA-F_]+/.exec(src))) return { type: 'num', value: parseInt(m[0].slice(2).replace(/_/g, ''), 16), raw: m[0], end: pos + m[0].length };
    if ((m = /^0[bB][01_]+/.exec(src))) return { type: 'num', value: parseInt(m[0].slice(2).replace(/_/g, ''), 2), raw: m[0], end: pos + m[0].length };
    if ((m = /^0[0-7_]+(?![.\deE])/.exec(src))) return { type: 'num', value: parseInt(m[0].slice(1).replace(/_/g, ''), 8), raw: m[0], end: pos + m[0].length };
    // decimal (beware of the range operator "1..2")
    m = /^(?:\d[\d_]*(?:\.(?!\.)[\d_]*)?|\.\d[\d_]*)(?:[eE][-+]?\d+)?/.exec(src);
    const raw = m[0];
    const value = Number(raw.replace(/_/g, ''));
    const isInt = !/[.eE]/.test(raw);
    return { type: 'num', value, raw, isInt, end: pos + raw.length };
  }

  // lex variable/sigil.  Returns undefined if not a variable.
  lexVar(pos, mode) {
    const src = this.src;
    const c = src[pos];
    let p = pos + 1;
    let sigil = c;
    if (c === '$' && src[p] === '#') {
      // $#array or $#{expr} or $#$ref
      if (src[p + 1] === '{' || src[p + 1] === '$') return { type: 'cast', value: '$#', end: p + 1 };
      const m = /^[A-Za-z_]\w*(?:::\w+)*/.exec(src.slice(p + 1, p + 200));
      if (m) return { type: 'var', sigil: '$#', name: m[0], end: p + 1 + m[0].length };
      // "$#" by itself (output format) - unlikely
    }
    const rest = src.slice(p, p + 256);
    // ${^NAME}
    let m = /^\{\^(\w+)\}/.exec(rest);
    if (m) return { type: 'var', sigil, name: '^' + m[1], end: p + m[0].length };
    // ${name} (but not ${ expr })
    m = /^\{\s*([A-Za-z_]\w*(?:::\w+)*)\s*\}/.exec(rest);
    if (m && sigil !== '%' && sigil !== '&') return { type: 'var', sigil, name: m[1], braced: true, end: p + m[0].length };
    // named variable
    m = /^(?:::)?[A-Za-z_]\w*(?:::\w+)*/.exec(rest);
    if (m) {
      let name = m[0];
      if (name.startsWith('::')) name = 'main' + name;
      return { type: 'var', sigil, name, end: p + m[0].length };
    }
    if (sigil === '*') return undefined;
    // casts: $$name, ${ ... }, @$x, @{ ... }, %$x, &$x
    if (rest[0] === '$') {
      // "$$" followed by an identifier/$/{ is a deref; otherwise it's the PID variable
      if (/^\$(?:[A-Za-z_{$:]|\d)/.test(rest) && !(sigil === '$' && /^\$\d/.test(rest))) return { type: 'cast', value: sigil, end: p };
      if (sigil === '$') return { type: 'var', sigil, name: '$', end: p + 1 };
      return { type: 'cast', value: sigil, end: p };
    }
    if (rest[0] === '{') return { type: 'cast', value: sigil, end: p };
    // special variables
    if (sigil === '$') {
      m = /^(?:\^[A-Z]|\d+|[&`'+!@\/\\,;.0<>\[\]_|?"():-])/.exec(rest);
      if (m) {
        // $: and $; etc.  Avoid treating "$)" as a variable when it's part of a regex (handled elsewhere)
        return { type: 'var', sigil, name: m[0], end: p + m[0].length };
      }
    }
    if (sigil === '@') {
      if (rest[0] === '_') return { type: 'var', sigil, name: '_', end: p + 1 };
      if (rest[0] === '-' || rest[0] === '+') return { type: 'var', sigil, name: rest[0], end: p + 1 };
    }
    if (sigil === '%') {
      if (rest[0] === '+' || rest[0] === '-') return { type: 'var', sigil, name: rest[0], end: p + 1 };
      if (rest.startsWith('^H')) return { type: 'var', sigil, name: '^H', end: p + 2 };
    }
    return undefined;
  }

  // read text up to closing delimiter; handles nesting for bracket delimiters
  // returns [rawText, endPosAfterDelimiter]
  readDelimited(pos, open) {
    const src = this.src;
    const close = CLOSE[open] || open;
    const nests = close !== open;
    let depth = 0;
    let p = pos;
    for (;;) {
      if (p >= src.length) this.error(`Unterminated string (delimiter ${open})`, pos);
      const ch = src[p];
      if (ch === '\\') { p += 2; continue; }
      if (nests && ch === open) { ++depth; ++p; continue; }
      if (ch === close) {
        if (depth === 0) return [src.slice(pos, p), p + 1];
        --depth;
      }
      ++p;
    }
  }

  lexDelimited(pos, open, fn) {
    const [s, e] = this.readDelimited(pos, open);
    return fn(s, e);
  }

  lexQuote(word, pos) {
    const src = this.src;
    // skip whitespace (and comments, if delimiter isn't '#')
    let p = pos;
    if (src[p] !== '#') {
      const sp = this.skipSpace(p);
      p = sp.pos;
    }
    const open = src[p];
    if (!open || /[\w\s]/.test(open)) this.error(`Bad delimiter for ${word}`, pos);
    let [s1, e1] = this.readDelimited(p + 1, open);
    const close = CLOSE[open];
    if (word === 'q') return { type: 'str', value: unescapeSingle(s1, close || open), end: e1 };
    if (word === 'qq') return { type: 'istr', raw: s1, delim: open, end: e1 };
    if (word === 'qw') return { type: 'qw', words: unescapeSingle(s1, close || open).split(/\s+/).filter((w) => w.length), end: e1 };
    if (word === 'm' || word === 'qr') {
      const fl = /^[a-z]*/.exec(src.slice(e1, e1 + 20))[0];
      return { type: word === 'm' ? 'match' : 'qr', pat: s1, delim: open, flags: fl, end: e1 + fl.length };
    }
    // s/// or tr///: second part
    let s2, e2;
    if (close) {
      // bracketed: second part may use different delimiter and be separated by whitespace
      const sp = this.skipSpace(e1);
      const open2 = src[sp.pos];
      [s2, e2] = this.readDelimited(sp.pos + 1, open2);
    } else {
      [s2, e2] = this.readDelimited(e1, open);
    }
    const fl = /^[a-z]*/.exec(src.slice(e2, e2 + 20))[0];
    if (word === 's') return { type: 'subst', pat: s1, repl: s2, delim: open, flags: fl, end: e2 + fl.length };
    return { type: 'trans', from: s1, to: s2, delim: open, flags: fl, end: e2 + fl.length };
  }

  lexHeredoc(pos, m) {
    const src = this.src;
    const indent = m[1] === '~';
    const term = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4];
    const interpolate = m[3] === undefined;
    // body starts after the end of the current line
    let lineEnd = src.indexOf('\n', pos);
    // if there are already heredocs on this line, the body starts after them
    let bodyStart = lineEnd + 1;
    while (this.skips.has(bodyStart) && this.heredocOwner(bodyStart) !== pos) bodyStart = this.skips.get(bodyStart);
    const re = indent ? new RegExp(`^[ \\t]*${escapeRe(term)}$`) : new RegExp(`^${escapeRe(term)}$`);
    let p = bodyStart;
    const lines = [];
    for (;;) {
      if (p >= src.length) this.error('Unterminated heredoc', pos);
      let e = src.indexOf('\n', p);
      if (e < 0) e = src.length;
      const line = src.slice(p, e);
      if (re.test(line)) { p = e + 1; break; }
      lines.push(line);
      p = e + 1;
    }
    if (!this.skips.has(bodyStart)) {
      this.skips.set(bodyStart, p);
      this.heredocOwners = this.heredocOwners || new Map();
      this.heredocOwners.set(bodyStart, pos);
    }
    let body = lines.map((l) => l + '\n').join('');
    if (indent) {
      const ind = /^[ \t]*/.exec(src.slice(p - 1 - (src.slice(0, p - 1).length - src.slice(0, p - 1).lastIndexOf('\n') - 1), p))[0];
      body = lines.map((l) => (l.startsWith(ind) ? l.slice(ind.length) : l.replace(/^[ \t]+/, '')) + '\n').join('');
    }
    return interpolate ? { type: 'istr', raw: body, delim: 'heredoc', end: pos + m[0].length } : { type: 'str', value: body, end: pos + m[0].length };
  }

  heredocOwner(p) { return this.heredocOwners && this.heredocOwners.get(p); }
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// unescape single-quoted string content
export function unescapeSingle(s, delim) {
  let out = '';
  for (let i = 0; i < s.length; ++i) {
    const ch = s[i];
    if (ch === '\\' && i + 1 < s.length && (s[i + 1] === '\\' || s[i + 1] === delim || s[i + 1] === "'" && delim === "'" ||
        (delim && CLOSE_TO_OPEN[delim] === s[i + 1]))) {
      out += s[++i];
    } else {
      out += ch;
    }
  }
  return out;
}
const CLOSE_TO_OPEN = { ')': '(', ']': '[', '}': '{', '>': '<' };
