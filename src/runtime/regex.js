// Translate Perl regular expressions to JavaScript RegExp source.
// Perl strings are byte strings here, so character class shortcuts are translated to their
// byte-semantics equivalents (eg. \s does not match \xa0, "." does not match \r specially).

const WS = '\\t\\n\\v\\f\\r ';          // Perl \s (byte semantics)
const NOT_WS_CLASS = '\\x00-\\x08\\x0e-\\x1f\\x21-\\uffff';
const HWS = '\\t \\xa0\\u1680\\u180e\\u2000-\\u200a\\u202f\\u205f\\u3000';
const VWS = '\\n\\x0b\\f\\r\\x85\\u2028\\u2029';
const POSIX = {
  alpha: 'A-Za-z', digit: '0-9', alnum: '0-9A-Za-z', upper: 'A-Z', lower: 'a-z', space: WS,
  xdigit: '0-9A-Fa-f', punct: '!-\\/:-@\\[-`{-~', print: ' -~', graph: '!-~', cntrl: '\\x00-\\x1f\\x7f',
  word: '0-9A-Za-z_', blank: ' \\t', ascii: '\\x00-\\x7f',
};

export class RegexTranslateError extends Error {}

// Returns { source, flags, sticky (\G at start), hasGroupsNamed }
export function perlre2js(pat, flags = '') {
  const x = flags.includes('x');
  const m = flags.includes('m');
  const s = flags.includes('s');
  let i = flags.includes('i');
  let out = '';
  let n = pat.length;
  let k = 0;
  let inClass = false;
  let classStart = false;
  let sticky = false;
  let caseGroups = 0;
  // handle leading inline modifiers (?i) etc.
  let mm;
  if ((mm = /^\(\?([imsx]+)\)/.exec(pat))) {
    if (mm[1].includes('i')) i = true;
    if (mm[1].includes('x')) return perlre2js(pat.slice(mm[0].length), flags + 'x' + (i ? 'i' : ''));
    if (mm[1].includes('s') && !s) return perlre2js(pat.slice(mm[0].length), flags + 's' + (i ? 'i' : ''));
    if (mm[1].includes('m') && !m) return perlre2js(pat.slice(mm[0].length), flags + 'm' + (i ? 'i' : ''));
    k = mm[0].length;
  }
  const startAnchor = m ? '(?:(?<![\\s\\S])|(?<=\\n))' : '^';
  const endAnchor = m ? '(?=\\n|(?![\\s\\S]))' : '(?=\\n?(?![\\s\\S]))';
  while (k < n) {
    let c = pat[k];
    if (inClass) {
      if (c === '\\') {
        const d = pat[k + 1];
        k += 2;
        switch (d) {
          case 's': out += WS; break;
          case 'S': out += NOT_WS_CLASS; break;
          case 'h': out += HWS; break;
          case 'v': out += VWS; break;
          case 'd': case 'D': case 'w': case 'W': out += '\\' + d; break;
          case 'n': case 't': case 'r': case 'f': case 'b': out += '\\' + d; break;
          case 'e': out += '\\x1b'; break;
          case 'a': out += '\\x07'; break;
          case 'x': { const r = readHex(pat, k); out += r.esc; k = r.k; break; }
          case 'c': out += '\\c' + pat[k]; k++; break;
          case 'N': throw new RegexTranslateError('\\N in class');
          case 'p': case 'P': throw new RegexTranslateError('Unicode property in class');
          default:
            if (/[0-7]/.test(d)) { const r = readOct(pat, k - 1); out += r.esc; k = r.k; }
            else if (/[A-Za-z]/.test(d)) throw new RegexTranslateError(`Unsupported class escape \\${d}`);
            else if (d.charCodeAt(0) >= 0x7f || d.charCodeAt(0) < 0x20) out += charEsc(d.charCodeAt(0));
            else out += '\\' + d;
        }
        classStart = false;
        continue;
      }
      if (c === '[' && pat[k + 1] === ':') {
        const e = pat.indexOf(':]', k + 2);
        if (e > 0) {
          let name = pat.slice(k + 2, e);
          const neg = name.startsWith('^');
          if (neg) throw new RegexTranslateError('negated POSIX class');
          if (!POSIX[name]) throw new RegexTranslateError(`Unknown POSIX class ${name}`);
          out += POSIX[name];
          k = e + 2;
          continue;
        }
      }
      if (c === ']' && !classStart) { inClass = false; out += ']'; k++; continue; }
      if (c === ']' && classStart) { out += '\\]'; k++; classStart = false; continue; }
      if (c === '[' ) { out += '\\['; k++; classStart = false; continue; }
      if (c === '/' ) { out += '\\/'; k++; classStart = false; continue; }
      if (c === '^' && classStart && out.endsWith('[')) { out += '^'; k++; continue; }
      classStart = false;
      out += escapeLiteralChar(c, true);
      k++;
      continue;
    }
    // outside character class
    if (x) {
      if (/\s/.test(c)) { k++; continue; }
      if (c === '#') { const e = pat.indexOf('\n', k); k = e < 0 ? n : e + 1; continue; }
    }
    switch (c) {
      case '\\': {
        const d = pat[k + 1];
        k += 2;
        if (d === undefined) throw new RegexTranslateError('Trailing backslash');
        switch (d) {
          case 'A': out += '(?<![\\s\\S])'; break;
          case 'z': out += '(?![\\s\\S])'; break;
          case 'Z': out += '(?=\\n?(?![\\s\\S]))'; break;
          case 'G':
            if (out === '' ) sticky = true;
            else throw new RegexTranslateError('\\G not at start');
            break;
          case 's': out += '[' + WS + ']'; break;
          case 'S': out += '[^' + WS + ']'; break;
          case 'h': out += '[' + HWS + ']'; break;
          case 'H': out += '[^' + HWS + ']'; break;
          case 'v': out += '[' + VWS + ']'; break;
          case 'V': out += '[^' + VWS + ']'; break;
          case 'R': out += '(?:\\r\\n|[' + VWS + '])'; break;
          case 'N': out += '[^\\n]'; break;
          case 'e': out += '\\x1b'; break;
          case 'a': out += '\\x07'; break;
          case 'x': { const r = readHex(pat, k); out += r.esc; k = r.k; break; }
          case 'c': out += '\\c' + pat[k]; k++; break;
          case 'K': throw new RegexTranslateError('\\K not supported');
          case 'Q': case 'E': break; // should have been handled by interpolation
          case 'p': case 'P': throw new RegexTranslateError('Unicode properties not supported');
          case 'k': {
            // \k<name> or \k{name} or \k'name'
            const r = /^(?:<(\w+)>|\{(\w+)\}|'(\w+)')/.exec(pat.slice(k));
            if (!r) throw new RegexTranslateError('bad \\k');
            out += `\\k<${r[1] || r[2] || r[3]}>`;
            k += r[0].length;
            break;
          }
          case 'g': {
            const r = /^(?:\{?(-?\d+)\}?)/.exec(pat.slice(k));
            if (!r || r[1].startsWith('-')) throw new RegexTranslateError('bad \\g');
            out += '\\' + r[1];
            k += r[0].length;
            break;
          }
          default:
            if (d === '0') { const r = readOct(pat, k - 1); out += r.esc; k = r.k; }
            else if (/[1-9]/.test(d)) {
              // backreference (or octal if > number of groups; assume backref)
              const r = /^\d*/.exec(pat.slice(k));
              out += '\\' + d + r[0];
              k += r[0].length;
            } else if (d.charCodeAt(0) >= 0x7f || d.charCodeAt(0) < 0x20) out += charEsc(d.charCodeAt(0));
            else out += '\\' + d;
        }
        break;
      }
      case '[':
        inClass = true;
        classStart = true;
        out += '[';
        k++;
        if (pat[k] === '^') { out += '^'; k++; }
        break;
      case '.':
        out += s ? '[\\s\\S]' : '[^\\n]';
        k++;
        break;
      case '^':
        out += startAnchor;
        k++;
        break;
      case '$':
        out += endAnchor;
        k++;
        break;
      case '(':
        if (pat[k + 1] === '?') {
          const rest = pat.slice(k + 2);
          let r;
          if (rest[0] === '#') { const e = pat.indexOf(')', k); k = e + 1; break; }
          if ((r = /^P?<(\w+)>/.exec(rest))) { out += `(?<${r[1]}>`; k += 2 + r[0].length; break; }
          if ((r = /^'(\w+)'/.exec(rest))) { out += `(?<${r[1]}>`; k += 2 + r[0].length; break; }
          if (rest[0] === ':' || rest[0] === '=' || rest[0] === '!' ) { out += '(?' + rest[0]; k += 3; break; }
          if (rest.startsWith('<=') || rest.startsWith('<!')) { out += '(?' + rest.slice(0, 2); k += 4; break; }
          if (rest[0] === '>') { throw new RegexTranslateError('atomic group not supported'); }
          if ((r = /^([imsx]*)(?:-([imsx]*))?:/.exec(rest))) {
            // inline modifier group: only support those that don't change anything
            const on = r[1], off = r[2] || '';
            if ((on.includes('i') && !i) || (off.includes('i') && i)) {
              throw new RegexTranslateError('case-insensitive group not supported');
            }
            if (on.includes('s') && !s) {
              // translate nested pattern with s flag: find group end
              const e = findGroupEnd(pat, k);
              const inner = perlre2js(pat.slice(k + 2 + r[0].length, e), flags.replace(/[s]/g, '') + 's');
              out += '(?:' + inner.source + ')';
              k = e + 1;
              break;
            }
            out += '(?:';
            k += 2 + r[0].length;
            break;
          }
          if ((r = /^([imsx]+)\)/.exec(rest))) {
            // (?i) in middle of pattern: OK if nothing case-sensitive precedes it
            if (r[1].includes('i') && !i) {
              const prev = out.replace(/\\x[0-9a-fA-F]{2}|\\u[0-9a-fA-F]{4}/g, '').replace(/\\[A-Za-z]/g, '').replace(/\(\?<?[=!:]/g, '').replace(/\[\\s\\S\]|\[\^\\n\]/g, '');
              if (/[A-Za-z]/.test(prev)) throw new RegexTranslateError('inline (?i) not supported');
              i = true;
            }
            if (r[1].includes('s') && !s) throw new RegexTranslateError('inline (?s) not supported');
            k += 2 + r[0].length;
            break;
          }
          throw new RegexTranslateError(`Unsupported group (?${rest.slice(0, 5)}`);
        }
        out += '(';
        k++;
        break;
      case '*': case '+': case '?': case '}': {
        out += c;
        k++;
        // possessive quantifier?
        if (pat[k] === '+') throw new RegexTranslateError('possessive quantifier not supported');
        break;
      }
      case '{': {
        // quantifier or literal brace
        const r = /^\{\d*(?:,\d*)?\}/.exec(pat.slice(k));
        if (r && r[0] !== '{}' && r[0] !== '{,}' ) {
          out += r[0];
          k += r[0].length;
          if (pat[k] === '+') throw new RegexTranslateError('possessive quantifier not supported');
        } else {
          out += '\\{';
          k++;
        }
        break;
      }
      case '/':
        out += '\\/';
        k++;
        break;
      case '\n':
        out += '\\n';
        k++;
        break;
      case '\r':
        out += '\\r';
        k++;
        break;
      default:
        out += escapeLiteralChar(c, false);
        k++;
    }
  }
  if (inClass) throw new RegexTranslateError('Unterminated character class');
  let jsFlags = '';
  if (i) jsFlags += 'i';
  return { source: out, flags: jsFlags, sticky };
}

function findGroupEnd(pat, start) {
  let depth = 0;
  let inC = false;
  for (let k = start; k < pat.length; ++k) {
    const c = pat[k];
    if (c === '\\') { ++k; continue; }
    if (inC) { if (c === ']') inC = false; continue; }
    if (c === '[') { inC = true; continue; }
    if (c === '(') ++depth;
    else if (c === ')') { if (--depth === 0) return k; }
  }
  throw new RegexTranslateError('Unterminated group');
}

function readHex(pat, k) {
  let code, end;
  if (pat[k] === '{') {
    end = pat.indexOf('}', k);
    code = parseInt(pat.slice(k + 1, end) || '0', 16);
    end += 1;
  } else {
    const r = /^[0-9a-fA-F]{0,2}/.exec(pat.slice(k));
    code = parseInt(r[0] || '0', 16);
    end = k + r[0].length;
  }
  return { esc: charEsc(code), k: end };
}

function readOct(pat, k) {
  const r = /^[0-7]{1,3}/.exec(pat.slice(k));
  return { esc: charEsc(parseInt(r[0], 8)), k: k + r[0].length };
}

function charEsc(code) {
  if (code <= 0xff) return '\\x' + code.toString(16).padStart(2, '0');
  if (code <= 0xffff) return '\\u' + code.toString(16).padStart(4, '0');
  throw new RegexTranslateError('code point > 0xffff in regex');
}

function escapeLiteralChar(c, inClass) {
  const code = c.charCodeAt(0);
  if (code < 0x20 || code >= 0x7f) return charEsc(code);
  return c;
}

// quotemeta (Perl): escape all chars except [A-Za-z_0-9] (and chars >= 128 in byte strings)
export function quotemeta(s) {
  let out = '';
  for (const ch of s) {
    if (/[A-Za-z0-9_]/.test(ch) || ch.charCodeAt(0) > 255) out += ch;
    else out += '\\' + ch;
  }
  return out;
}
