// Perl pack/unpack for byte strings (strings with char codes 0-255).
// Supports the formats used by ExifTool: a A Z b B h H c C W U s S l L q Q j J i I n N v V f d F w x X @ . u
// with < > ! modifiers, counts, * and [N], groups, and the C0/U0 mode switches.

const f32 = new Float32Array(1);
const f64 = new Float64Array(1);
const u8f32 = new Uint8Array(f32.buffer);
const u8f64 = new Uint8Array(f64.buffer);
const LITTLE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

class PackError extends Error {}

// parse template into items: { code, mod (<,>,!), count (number|'*'|undefined), group: [...] }
function parseTemplate(tmpl) {
  let i = 0;
  const n = tmpl.length;
  function parseSeq(endChar) {
    const items = [];
    while (i < n) {
      const c = tmpl[i];
      if (/\s/.test(c)) { ++i; continue; }
      if (c === '#') { while (i < n && tmpl[i] !== '\n') ++i; continue; }
      if (c === endChar) { ++i; return items; }
      let item;
      if (c === '(') {
        ++i;
        item = { code: '(', group: parseSeq(')') };
      } else {
        item = { code: c };
        ++i;
      }
      // modifiers
      while (i < n && /[<>!]/.test(tmpl[i])) { item.mod = (item.mod || '') + tmpl[i]; ++i; }
      // count
      if (tmpl[i] === '*') { item.count = '*'; ++i; }
      else if (tmpl[i] === '[') {
        const e = tmpl.indexOf(']', i);
        const inner = tmpl.slice(i + 1, e);
        if (/^\d+$/.test(inner)) item.count = Number(inner);
        else item.count = templateSize(inner);
        i = e + 1;
      } else {
        const m = /^\d+/.exec(tmpl.slice(i));
        if (m) { item.count = Number(m[0]); i += m[0].length; }
      }
      // "/" template: count/data
      if (tmpl[i] === '/') {
        ++i;
        const sub = parseSeq1();
        item.slash = sub;
      }
      items.push(item);
    }
    return items;
  }
  function parseSeq1() {
    // parse a single item (for "/")
    while (/\s/.test(tmpl[i])) ++i;
    const c = tmpl[i++];
    const item = { code: c };
    while (i < n && /[<>!]/.test(tmpl[i])) { item.mod = (item.mod || '') + tmpl[i]; ++i; }
    if (tmpl[i] === '*') { item.count = '*'; ++i; }
    else { const m = /^\d+/.exec(tmpl.slice(i)); if (m) { item.count = Number(m[0]); i += m[0].length; } }
    return item;
  }
  return parseSeq(null);
}

const SIZES = { c: 1, C: 1, W: 1, s: 2, S: 2, l: 4, L: 4, q: 8, Q: 8, j: 8, J: 8, i: 4, I: 4, n: 2, N: 4, v: 2, V: 4, f: 4, d: 8, F: 8, x: 1, a: 1, A: 1, Z: 1 };
function templateSize(t) {
  let size = 0;
  for (const it of parseTemplate(t)) {
    const cnt = it.count === undefined ? 1 : it.count;
    size += (SIZES[it.code] || 0) * cnt;
  }
  return size;
}
const tmplCache = new Map();
function getTemplate(t) {
  let r = tmplCache.get(t);
  if (!r) { r = parseTemplate(t); tmplCache.set(t, r); }
  return r;
}

function intSize(code) {
  switch (code) {
    case 'c': case 'C': return 1;
    case 's': case 'S': case 'n': case 'v': return 2;
    case 'l': case 'L': case 'N': case 'V': case 'i': case 'I': return 4;
    case 'q': case 'Q': case 'j': case 'J': return 8;
  }
  return 0;
}

function readUInt(s, pos, size, little) {
  if (size <= 4) {
    let v = 0;
    if (little) for (let k = size - 1; k >= 0; --k) v = v * 256 + (s.charCodeAt(pos + k) & 0xff);
    else for (let k = 0; k < size; ++k) v = v * 256 + (s.charCodeAt(pos + k) & 0xff);
    return v;
  }
  let v = 0n;
  if (little) for (let k = size - 1; k >= 0; --k) v = (v << 8n) | BigInt(s.charCodeAt(pos + k) & 0xff);
  else for (let k = 0; k < size; ++k) v = (v << 8n) | BigInt(s.charCodeAt(pos + k) & 0xff);
  return v;
}

function toNumberIfSafe(v) {
  if (typeof v === 'bigint') {
    if (v <= 9007199254740991n && v >= -9007199254740991n) return Number(v);
    return v;
  }
  return v;
}

function writeUInt(v, size, little) {
  let out = '';
  if (typeof v === 'bigint' || size === 8) {
    let b = BigInt.asUintN(size * 8, typeof v === 'bigint' ? v : BigInt(Math.trunc(v)));
    const bytes = [];
    for (let k = 0; k < size; ++k) { bytes.push(Number(b & 0xffn)); b >>= 8n; }
    if (!little) bytes.reverse();
    return String.fromCharCode(...bytes);
  }
  let x = Math.trunc(v);
  if (!isFinite(x)) x = 0;
  // two's complement wrap
  const mod = 2 ** (size * 8);
  x = ((x % mod) + mod) % mod;
  const bytes = [];
  for (let k = 0; k < size; ++k) { bytes.push(x % 256); x = Math.floor(x / 256); }
  if (!little) bytes.reverse();
  return String.fromCharCode(...bytes);
}

function isLittle(code, mod) {
  if (code === 'n' || code === 'N') return false;
  if (code === 'v' || code === 'V') return true;
  if (mod && mod.includes('<')) return true;
  if (mod && mod.includes('>')) return false;
  return LITTLE;
}

export function makePack(PL) {
  // ------------------------------------------------------------------ pack
  function pack(tmpl, ...args) {
    const items = getTemplate(PL.str(tmpl));
    const state = { args, ai: 0, out: '', utf8: false, charMode: false };
    // template starting with U => character mode (result is a character string)
    if (items.length && items[0].code === 'U') state.charMode = true;
    packItems(items, state);
    return state.out;
  }

  function packItems(items, st) {
    for (const it of items) packItem(it, st);
  }

  function nextArg(st) { return st.args[st.ai++]; }

  function packItem(it, st) {
    const code = it.code;
    let count = it.count;
    switch (code) {
      case 'U':
        if (count === 0 && false) return;
        break;
    }
    if (code === 'C' && count === 0) { st.charMode = false; st.byteMode = true; return; }   // C0
    if (code === 'U' && count === 0) { st.charMode = true; return; }    // U0
    if (code === '(') {
      const reps = count === '*' ? Infinity : count === undefined ? 1 : count;
      for (let r = 0; r < reps && (reps !== Infinity || st.ai < st.args.length); ++r) packItems(it.group, st);
      return;
    }
    switch (code) {
      case 'a': case 'A': case 'Z': {
        let s = PL.str(nextArg(st));
        if (count === '*') {
          if (code === 'Z') s += '\0';
        } else {
          const n = count === undefined ? 1 : count;
          if (s.length >= n) {
            s = s.slice(0, n);
            if (code === 'Z' && n > 0) s = s.slice(0, n - 1) + '\0';
          } else s = s + (code === 'A' ? ' ' : '\0').repeat(n - s.length);
        }
        st.out += s;
        return;
      }
      case 'H': case 'h': {
        let s = PL.str(nextArg(st));
        const n = count === '*' ? s.length : count === undefined ? 1 : count;
        s = s.slice(0, n);
        let out = '';
        for (let k = 0; k < n; k += 2) {
          const hexv = (c) => {
            if (c === undefined) return 0;
            const cc = c.charCodeAt(0);
            if (/[0-9]/.test(c)) return cc - 48;
            if (/[a-zA-Z]/.test(c)) return ((cc & 0x0f) + 9) & 0x0f;
            return cc & 0x0f;
          };
          const a = hexv(s[k]), b = hexv(s[k + 1]);
          out += String.fromCharCode(code === 'H' ? (a << 4) | b : (b << 4) | a);
        }
        st.out += out;
        return;
      }
      case 'b': case 'B': {
        let s = PL.str(nextArg(st));
        const n = count === '*' ? s.length : count === undefined ? 1 : count;
        s = s.slice(0, n).padEnd(Math.ceil(n / 8) * 8, '0');
        let out = '';
        for (let k = 0; k < s.length; k += 8) {
          let byte = 0;
          for (let j = 0; j < 8; ++j) {
            const bit = s.charCodeAt(k + j) & 1;
            if (code === 'B') byte |= bit << (7 - j); else byte |= bit << j;
          }
          out += String.fromCharCode(byte);
        }
        st.out += out;
        return;
      }
      case 'x': {
        const n = count === '*' ? 0 : count === undefined ? 1 : count;
        st.out += '\0'.repeat(n);
        return;
      }
      case 'X': {
        const n = count === '*' ? 0 : count === undefined ? 1 : count;
        st.out = st.out.slice(0, Math.max(0, st.out.length - n));
        return;
      }
      case '@': {
        const n = count === undefined ? 0 : count;
        if (st.out.length < n) st.out += '\0'.repeat(n - st.out.length);
        else st.out = st.out.slice(0, n);
        return;
      }
      case 'w': {
        const reps = count === '*' ? st.args.length - st.ai : count === undefined ? 1 : count;
        for (let r = 0; r < reps; ++r) {
          let v = BigInt(Math.trunc(PL.num(nextArg(st))));
          const bytes = [Number(v & 0x7fn)];
          v >>= 7n;
          while (v > 0n) { bytes.unshift(Number(v & 0x7fn) | 0x80); v >>= 7n; }
          st.out += String.fromCharCode(...bytes);
        }
        return;
      }
      case 'u': this_uuencode(st, PL.str(nextArg(st))); return;
    }
    const reps = count === '*' ? st.args.length - st.ai : count === undefined ? 1 : count;
    for (let r = 0; r < reps; ++r) {
      const v = nextArg(st);
      switch (code) {
        case 'c': case 'C': {
          st.out += String.fromCharCode(Math.trunc(PL.num(v)) & 0xff);
          break;
        }
        case 'W': st.out += PL.chr(PL.num(v)); break;
        case 'U': {
          const cp = Math.trunc(PL.num(v));
          if (st.charMode && !st.byteMode) st.out += String.fromCodePoint(cp);
          else st.out += utf8Encode(cp);
          break;
        }
        case 's': case 'S': case 'l': case 'L': case 'q': case 'Q': case 'j': case 'J': case 'i': case 'I':
        case 'n': case 'N': case 'v': case 'V': {
          const size = intSize(code);
          const little = isLittle(code, it.mod);
          let num = typeof v === 'bigint' ? v : PL.num(v);
          st.out += writeUInt(num, size, little);
          break;
        }
        case 'f': {
          f32[0] = PL.num(v);
          const bytes = Array.from(u8f32);
          if (isLittle('f', it.mod) !== LITTLE) bytes.reverse();
          st.out += String.fromCharCode(...bytes);
          break;
        }
        case 'd': case 'F': {
          f64[0] = PL.num(v);
          const bytes = Array.from(u8f64);
          if (isLittle('d', it.mod) !== LITTLE) bytes.reverse();
          st.out += String.fromCharCode(...bytes);
          break;
        }
        default:
          throw new PackError(`pack: unsupported format '${code}'`);
      }
    }
  }

  function this_uuencode(st, s) {
    let out = '';
    for (let i = 0; i < s.length; i += 45) {
      const chunk = s.slice(i, i + 45);
      out += String.fromCharCode(32 + chunk.length);
      for (let j = 0; j < chunk.length; j += 3) {
        const a = chunk.charCodeAt(j), b = chunk.charCodeAt(j + 1) || 0, c = chunk.charCodeAt(j + 2) || 0;
        const enc = (x) => String.fromCharCode(x ? 32 + x : 96);
        out += enc(a >> 2) + enc(((a << 4) | (b >> 4)) & 63) + enc(((b << 2) | (c >> 6)) & 63) + enc(c & 63);
      }
      out += '\n';
    }
    st.out += out;
  }

  // ------------------------------------------------------------------ unpack
  function unpack(tmpl, s) {
    tmpl = PL.str(tmpl);
    s = PL.str(s);
    const items = getTemplate(tmpl);
    const st = { s, pos: 0, out: [], byteMode: false, groupStart: 0 };
    unpackItems(items, st);
    return st.out;
  }

  function unpackItems(items, st) {
    for (const it of items) {
      if (unpackItem(it, st) === false) return false;
    }
    return true;
  }

  function unpackItem(it, st, countOverride) {
    const code = it.code;
    let count = countOverride !== undefined ? countOverride : it.count;
    const s = st.s;
    if (code === 'C' && count === 0) { st.byteMode = true; return; }
    if (code === 'U' && count === 0) { st.byteMode = false; st.u0 = true; return; }
    if (code === '(') {
      const reps = count === '*' ? Infinity : count === undefined ? 1 : count;
      for (let r = 0; r < reps; ++r) {
        if (reps === Infinity && st.pos >= s.length) break;
        const save = st.groupStart;
        st.groupStart = st.pos;
        unpackItems(it.group, st);
        st.groupStart = save;
      }
      return;
    }
    if (it.slash) {
      // count/data
      const before = st.out.length;
      unpackItem(Object.assign({}, it, { slash: undefined }), st);
      const n = st.out.splice(before).pop();
      return unpackItem(it.slash, st, PL.num(n));
    }
    const remain = s.length - st.pos;
    switch (code) {
      case 'a': case 'A': case 'Z': {
        let n = count === '*' ? remain : count === undefined ? 1 : count;
        if (n > remain) n = remain;
        let str = s.substr(st.pos, n);
        if (code === 'Z') {
          const z = str.indexOf('\0');
          if (z >= 0) {
            str = str.slice(0, z);
            if (count === '*') n = z + 1;
          }
        } else if (code === 'A') {
          str = str.replace(/[\0\t\n\v\f\r ]+$/, '');
        }
        st.pos += n;
        st.out.push(str);
        return;
      }
      case 'H': case 'h': {
        let n = count === '*' ? remain * 2 : count === undefined ? 1 : count;
        const nbytes = Math.min(Math.ceil(n / 2), remain);
        if (n > nbytes * 2) n = nbytes * 2;
        let out = '';
        for (let k = 0; k < nbytes; ++k) {
          const b = s.charCodeAt(st.pos + k);
          const hex = b.toString(16).padStart(2, '0');
          out += code === 'H' ? hex : hex[1] + hex[0];
        }
        st.pos += nbytes;
        st.out.push(out.slice(0, n));
        return;
      }
      case 'b': case 'B': {
        let n = count === '*' ? remain * 8 : count === undefined ? 1 : count;
        const nbytes = Math.min(Math.ceil(n / 8), remain);
        if (n > nbytes * 8) n = nbytes * 8;
        let out = '';
        for (let k = 0; k < nbytes; ++k) {
          const b = s.charCodeAt(st.pos + k);
          const bits = b.toString(2).padStart(8, '0');
          out += code === 'B' ? bits : bits.split('').reverse().join('');
        }
        st.pos += nbytes;
        st.out.push(out.slice(0, n));
        return;
      }
      case 'x': {
        const n = count === '*' ? 0 : count === undefined ? 1 : count;
        if (n > remain) throw new PackError("'x' outside of string in unpack");
        st.pos += n;
        return;
      }
      case 'X': {
        const n = count === '*' ? 0 : count === undefined ? 1 : count;
        if (n > st.pos) throw new PackError("'X' outside of string in unpack");
        st.pos -= n;
        return;
      }
      case '@': {
        const n = count === undefined ? 0 : count === '*' ? 0 : count;
        st.pos = st.groupStart + n;
        if (st.pos > s.length) throw new PackError("'@' outside of string in unpack");
        return;
      }
      case '.': return;
      case 'w': {
        const reps = count === '*' ? Infinity : count === undefined ? 1 : count;
        for (let r = 0; r < reps && st.pos < s.length; ++r) {
          let v = 0n;
          for (;;) {
            const b = s.charCodeAt(st.pos++);
            v = (v << 7n) | BigInt(b & 0x7f);
            if (!(b & 0x80) || st.pos >= s.length) break;
          }
          st.out.push(toNumberIfSafe(v));
        }
        return;
      }
      case 'u': {
        // uudecode
        let out = '';
        const lines = s.slice(st.pos).split('\n');
        for (const line of lines) {
          if (!line.length) continue;
          const len = (line.charCodeAt(0) - 32) & 63;
          if (!len) break;
          let bytes = [];
          for (let j = 1; j < line.length; j += 4) {
            const d = (k) => ((line.charCodeAt(j + k) || 32) - 32) & 63;
            const a = d(0), b = d(1), c = d(2), e = d(3);
            bytes.push((a << 2) | (b >> 4), ((b << 4) | (c >> 2)) & 255, ((c << 6) | e) & 255);
          }
          out += String.fromCharCode(...bytes.slice(0, len));
        }
        st.pos = s.length;
        st.out.push(out);
        return;
      }
      case 'U': {
        const reps = count === '*' ? Infinity : count === undefined ? 1 : count;
        for (let r = 0; r < reps && st.pos < s.length; ++r) {
          if (st.byteMode) {
            // decode UTF-8 from bytes
            const [cp, len] = utf8Decode1(s, st.pos);
            st.out.push(cp);
            st.pos += len;
          } else {
            const cp = s.codePointAt(st.pos);
            st.out.push(cp);
            st.pos += cp > 0xffff ? 2 : 1;
          }
        }
        return;
      }
      case 'W': {
        const reps = count === '*' ? Infinity : count === undefined ? 1 : count;
        for (let r = 0; r < reps && st.pos < s.length; ++r) st.out.push(s.charCodeAt(st.pos++));
        return;
      }
    }
    const size = code === 'f' ? 4 : code === 'd' || code === 'F' ? 8 : intSize(code);
    if (!size) throw new PackError(`unpack: unsupported format '${code}'`);
    const reps = count === '*' ? Math.floor(remain / size) : count === undefined ? 1 : count;
    for (let r = 0; r < reps; ++r) {
      if (s.length - st.pos < size) {
        st.pos = s.length;
        break;
      }
      const pos = st.pos;
      st.pos += size;
      switch (code) {
        case 'C': st.out.push(s.charCodeAt(pos) & 0xff); break;
        case 'c': { const v = s.charCodeAt(pos) & 0xff; st.out.push(v > 127 ? v - 256 : v); break; }
        case 'f': {
          const little = isLittle('f', it.mod);
          for (let k = 0; k < 4; ++k) u8f32[k] = s.charCodeAt(pos + (little === LITTLE ? k : 3 - k));
          st.out.push(f32[0]);
          break;
        }
        case 'd': case 'F': {
          const little = isLittle('d', it.mod);
          for (let k = 0; k < 8; ++k) u8f64[k] = s.charCodeAt(pos + (little === LITTLE ? k : 7 - k));
          st.out.push(f64[0]);
          break;
        }
        default: {
          const little = isLittle(code, it.mod);
          let v = readUInt(s, pos, size, little);
          const signed = code === 's' || code === 'l' || code === 'q' || code === 'j' || code === 'i' ||
            ((code === 'n' || code === 'N' || code === 'v' || code === 'V') && it.mod && it.mod.includes('!'));
          if (signed) {
            if (size <= 4) { const lim = 2 ** (size * 8 - 1); if (v >= lim) v -= lim * 2; }
            else v = BigInt.asIntN(64, v);
          }
          st.out.push(toNumberIfSafe(v));
        }
      }
    }
  }

  return { pack, unpack };
}

export function utf8Encode(cp) {
  if (cp < 0x80) return String.fromCharCode(cp);
  if (cp < 0x800) return String.fromCharCode(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
  if (cp < 0x10000) return String.fromCharCode(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  if (cp < 0x200000) return String.fromCharCode(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  if (cp < 0x4000000) return String.fromCharCode(0xf8 | (cp >> 24), 0x80 | ((cp >> 18) & 0x3f), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  return String.fromCharCode(0xfc | (cp >> 30), 0x80 | ((cp >> 24) & 0x3f), 0x80 | ((cp >> 18) & 0x3f), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
}

// decode one UTF-8 char from byte string at pos -> [codepoint, length]
export function utf8Decode1(s, pos) {
  const b0 = s.charCodeAt(pos);
  if (b0 < 0x80) return [b0, 1];
  let n, cp;
  if ((b0 & 0xe0) === 0xc0) { n = 1; cp = b0 & 0x1f; }
  else if ((b0 & 0xf0) === 0xe0) { n = 2; cp = b0 & 0x0f; }
  else if ((b0 & 0xf8) === 0xf0) { n = 3; cp = b0 & 0x07; }
  else if ((b0 & 0xfc) === 0xf8) { n = 4; cp = b0 & 0x03; }
  else if ((b0 & 0xfe) === 0xfc) { n = 5; cp = b0 & 0x01; }
  else return [0xfffd, 1];
  for (let k = 1; k <= n; ++k) {
    const b = s.charCodeAt(pos + k);
    if ((b & 0xc0) !== 0x80) return [0xfffd, k];
    cp = (cp << 6) | (b & 0x3f);
  }
  return [cp, n + 1];
}
