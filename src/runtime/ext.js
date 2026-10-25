// Emulation of the external (non-ExifTool) Perl modules used by ExifTool.
import { PL, H, PerlDie } from './perl.js';
import { md5 } from './md5.js';
import { inflateRaw, inflateZlib, deflateRaw, deflateZlib, adler32, crc32 } from './zlib.js';

const def = (pkgName, name, fn) => {
  const pkg = PL.pkg(pkgName);
  PL.defsub(pkg, name, fn);
  PL.defExternal(pkgName + '::' + name, fn);
};
const markLoaded = (path) => { PL.INC[path] = path; };

// ---------------------------------------------------------------------------- Exporter
{
  const exp = PL.pkg('Exporter');
  markLoaded('Exporter.pm');
  def('Exporter', 'import', (cls, ...names) => {
    const target = PL.pkg(PL.importTarget || 'main');
    PL.importInto(PL.str(cls), target, names.length ? names.map(PL.str) : undefined);
  });
  exp.$VERSION = '5.77';
}
PL.importInto = (srcName, target, names) => {
  const src = PL.pkg(srcName);
  const tags = src.EXPORT_TAGS;
  let list;
  if (names === undefined) list = src.EXPORT || [];
  else {
    list = [];
    for (const n of names) {
      if (n.startsWith(':')) list.push(...((tags && tags[n.slice(1)]) || []));
      else list.push(n);
    }
  }
  for (let n of list) {
    n = PL.str(n);
    const sigil = /^[$@%&]/.test(n) ? n[0] : '&';
    const bare = n.replace(/^[$@%&]/, '');
    if (sigil === '&') PL.defsub(target, bare, typeof src[bare] === 'function' ? src[bare] : PL.subref(src, bare));
    else if (sigil === '$') Object.defineProperty(target, '$' + bare, { get: () => src['$' + bare], set: (v) => { src['$' + bare] = v; }, configurable: true, enumerable: true });
    else {
      if (src[bare] === undefined) src[bare] = sigil === '@' ? [] : Object.create(null);
      target[bare] = src[bare];
    }
  }
};

// ---------------------------------------------------------------------------- Time::Local
markLoaded('Time/Local.pm');
function normYear(y) {
  y = Math.trunc(PL.num(y));
  if (y >= 1000) return y;
  if (y >= 100) return y + 1900;
  // two-digit year: rolling century
  const cur = new Date().getFullYear();
  const cent = Math.floor(cur / 100) * 100;
  let full = cent + y;
  if (full > cur + 50) full -= 100;
  else if (full <= cur - 50) full += 100;
  return full;
}
def('Time::Local', 'timegm', (sec, min, hour, mday, mon, year) => {
  const t = Date.UTC(normYear(year), PL.num(mon), PL.num(mday), PL.num(hour), PL.num(min), 0);
  return t / 1000 + PL.num(sec);
});
def('Time::Local', 'timelocal', (sec, min, hour, mday, mon, year) => {
  const d = new Date(normYear(year), PL.num(mon), PL.num(mday), PL.num(hour), PL.num(min), 0);
  return d.getTime() / 1000 + PL.num(sec);
});
def('Time::Local', 'timegm_nocheck', PL.pkg('Time::Local').timegm);
def('Time::Local', 'timelocal_nocheck', PL.pkg('Time::Local').timelocal);
PL.pkg('Time::Local').EXPORT = ['timegm', 'timelocal'];

// ---------------------------------------------------------------------------- Time::HiRes
markLoaded('Time/HiRes.pm');
def('Time::HiRes', 'gettimeofday', () => { const t = Date.now(); return PL.RL([Math.floor(t / 1000), (t % 1000) * 1000]); });
def('Time::HiRes', 'tv_interval', (a, b) => {
  b = b || [Math.floor(Date.now() / 1000), (Date.now() % 1000) * 1000];
  return (b[0] - a[0]) + (b[1] - a[1]) / 1e6;
});
def('Time::HiRes', 'time', () => Date.now() / 1000);

// ---------------------------------------------------------------------------- POSIX
markLoaded('POSIX.pm');
def('POSIX', 'floor', (x) => Math.floor(PL.num(x)));
def('POSIX', 'ceil', (x) => Math.ceil(PL.num(x)));
def('POSIX', 'fmod', (a, b) => PL.num(a) % PL.num(b));
def('POSIX', 'tzset', () => undefined);
def('POSIX', 'mktime', (sec, min, hour, mday, mon, year) => new Date(PL.num(year) + 1900, PL.num(mon), PL.num(mday), PL.num(hour), PL.num(min), PL.num(sec)).getTime() / 1000);
const DAYNAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONNAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function strftime(fmt, sec, min, hour, mday, mon, year, wday, yday, isdst) {
  fmt = PL.str(fmt);
  const n = (x) => Math.trunc(PL.num(x));
  const Y = n(year) + 1900, M = n(mon), D = n(mday), h = n(hour), m = n(min), s = n(sec);
  const date = new Date(Date.UTC(Y, M, D, h, m, s));
  const wd = date.getUTCDay();
  const yd = Math.floor((Date.UTC(Y, M, D) - Date.UTC(Y, 0, 1)) / 86400000);
  const p2 = (x) => String(x).padStart(2, '0');
  // local timezone offset for this time
  const local = new Date(Y, M, D, h, m, s);
  const off = -local.getTimezoneOffset();
  return fmt.replace(/%([a-zA-Z%])/g, (all, c) => {
    switch (c) {
      case 'Y': return String(Y);
      case 'y': return p2(Y % 100);
      case 'C': return p2(Math.floor(Y / 100));
      case 'm': return p2(M + 1);
      case 'd': return p2(D);
      case 'e': return String(D).padStart(2, ' ');
      case 'H': return p2(h);
      case 'I': return p2(h % 12 || 12);
      case 'M': return p2(m);
      case 'S': return p2(s);
      case 'p': return h < 12 ? 'AM' : 'PM';
      case 'j': return String(yd + 1).padStart(3, '0');
      case 'a': return DAYNAMES[wd].slice(0, 3);
      case 'A': return DAYNAMES[wd];
      case 'b': case 'h': return MONNAMES[M].slice(0, 3);
      case 'B': return MONNAMES[M];
      case 'w': return String(wd);
      case 'u': return String(wd || 7);
      case 'z': { const a = Math.abs(off); return (off < 0 ? '-' : '+') + p2(Math.floor(a / 60)) + p2(a % 60); }
      case 'Z': return '';
      case 's': return String(Math.floor(local.getTime() / 1000));
      case 'n': return '\n';
      case 't': return '\t';
      case '%': return '%';
      case 'F': return `${Y}-${p2(M + 1)}-${p2(D)}`;
      case 'T': return `${p2(h)}:${p2(m)}:${p2(s)}`;
      case 'D': return `${p2(M + 1)}/${p2(D)}/${p2(Y % 100)}`;
      case 'R': return `${p2(h)}:${p2(m)}`;
      case 'c': return `${DAYNAMES[wd].slice(0, 3)} ${MONNAMES[M].slice(0, 3)} ${String(D).padStart(2, ' ')} ${p2(h)}:${p2(m)}:${p2(s)} ${Y}`;
      case 'x': return `${p2(M + 1)}/${p2(D)}/${p2(Y % 100)}`;
      case 'X': return `${p2(h)}:${p2(m)}:${p2(s)}`;
      case 'U': return p2(Math.floor((yd + 7 - wd) / 7));
      case 'W': return p2(Math.floor((yd + 7 - ((wd + 6) % 7)) / 7));
      case 'V': case 'G': case 'g': {
        // ISO 8601 week
        const tmp = new Date(Date.UTC(Y, M, D));
        const dayNum = tmp.getUTCDay() || 7;
        tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
        const isoYear = tmp.getUTCFullYear();
        const week = Math.ceil(((tmp - Date.UTC(isoYear, 0, 1)) / 86400000 + 1) / 7);
        return c === 'V' ? p2(week) : c === 'G' ? String(isoYear) : p2(isoYear % 100);
      }
    }
    return all;
  });
}
def('POSIX', 'strftime', strftime);
PL.pkg('POSIX').EXPORT_OK = ['floor', 'ceil', 'strftime', 'mktime', 'fmod', 'tzset'];

// ---------------------------------------------------------------------------- File::Basename, Cwd
markLoaded('File/Basename.pm');
def('File::Basename', 'basename', (p) => { p = PL.str(p).replace(/\/+$/, ''); return p.slice(p.lastIndexOf('/') + 1); });
def('File::Basename', 'dirname', (p) => { p = PL.str(p).replace(/\/+$/, ''); const i = p.lastIndexOf('/'); return i < 0 ? '.' : i === 0 ? '/' : p.slice(0, i); });
markLoaded('Cwd.pm');
def('Cwd', 'abs_path', (p) => PL.str(p));
def('Cwd', 'getcwd', () => '.');

// ---------------------------------------------------------------------------- Digest::MD5
markLoaded('Digest/MD5.pm');
def('Digest::MD5', 'md5', (...a) => md5(a.map(PL.str).join('')));
def('Digest::MD5', 'md5_hex', (...a) => toHex(md5(a.map(PL.str).join(''))));
def('Digest::MD5', 'new', (cls) => PL.bless(H({ data: [] }), 'Digest::MD5'));
def('Digest::MD5', 'add', (self, ...a) => { for (const x of a) self.data.push(PL.str(x)); return self; });
def('Digest::MD5', 'digest', (self) => { const r = md5(self.data.join('')); self.data = []; return r; });
def('Digest::MD5', 'hexdigest', (self) => { const r = toHex(md5(self.data.join(''))); self.data = []; return r; });
PL.pkg('Digest::MD5').EXPORT_OK = ['md5', 'md5_hex'];
function toHex(s) { let o = ''; for (let i = 0; i < s.length; ++i) o += s.charCodeAt(i).toString(16).padStart(2, '0'); return o; }

// ---------------------------------------------------------------------------- Compress::Zlib
markLoaded('Compress/Zlib.pm');
{
  const Z = 'Compress::Zlib';
  const consts = { Z_OK: 0, Z_STREAM_END: 1, Z_NEED_DICT: 2, Z_ERRNO: -1, Z_STREAM_ERROR: -2, Z_DATA_ERROR: -3, Z_MEM_ERROR: -4, Z_BUF_ERROR: -5, MAX_WBITS: 15, Z_DEFAULT_COMPRESSION: -1, Z_BEST_COMPRESSION: 9, Z_BEST_SPEED: 1, Z_FINISH: 4, Z_SYNC_FLUSH: 2 };
  for (const [k, v] of Object.entries(consts)) def(Z, k, () => v);
  PL.pkg(Z).$VERSION = '2.204';
  const optVal = (args, name, dflt) => {
    for (let i = 0; i < args.length; i += 2) if (PL.str(args[i]).replace(/^-/, '') === name) return PL.num(args[i + 1]);
    return dflt;
  };
  def(Z, 'inflateInit', (...args) => {
    const wbits = optVal(args, 'WindowBits', 15);
    const obj = PL.bless(H({ raw: wbits < 0, buf: '', done: false }), 'Compress::Zlib::Inflate');
    return PL.RL([obj, 0], 'first');
  });
  def('Compress::Zlib::Inflate', 'inflate', (self, data) => {
    // data may be a scalar ref or string
    const isRef = data instanceof PL.Box || data instanceof PL.LvBox;
    let input = PL.str(isRef ? data.v : data);
    try {
      const all = self.buf + input;
      const r = self.raw ? inflateRaw(all) : inflateZlib(all);
      self.buf = '';
      if (isRef) data.v = r.rest || '';
      return PL.RL([r.out, r.done ? 1 : 0], 'first');
    } catch (e) {
      if (e.incomplete) {
        // need more data
        self.buf += input;
        if (isRef) data.v = '';
        return PL.RL(['', -5], 'first');
      }
      return PL.RL([undefined, -3], 'first');
    }
  });
  def('Compress::Zlib::Inflate', 'inflateSync', () => PL.RL([-3]));
  def(Z, 'deflateInit', (...args) => {
    const wbits = optVal(args, 'WindowBits', 15);
    const level = optVal(args, 'Level', -1);
    const obj = PL.bless(H({ raw: wbits < 0, level, buf: '' }), 'Compress::Zlib::Deflate');
    return PL.RL([obj, 0], 'first');
  });
  def('Compress::Zlib::Deflate', 'deflate', (self, data) => {
    const isRef = data instanceof PL.Box || data instanceof PL.LvBox;
    self.buf += PL.str(isRef ? data.v : data);
    return PL.RL(['', 0], 'first');
  });
  def('Compress::Zlib::Deflate', 'flush', (self) => {
    const out = self.raw ? deflateRaw(self.buf, self.level) : deflateZlib(self.buf, self.level);
    self.buf = '';
    return PL.RL([out, 0], 'first');
  });
  def(Z, 'compress', (data, level) => deflateZlib(PL.str(data instanceof PL.Box ? data.v : data), level === undefined ? -1 : PL.num(level)));
  def(Z, 'uncompress', (data) => {
    try { return inflateZlib(PL.str(data instanceof PL.Box ? data.v : data)).out; } catch (e) { return undefined; }
  });
  def(Z, 'crc32', (data, crc) => crc32(PL.str(data), crc === undefined ? 0 : PL.num(crc)));
  def(Z, 'adler32', (data, a) => adler32(PL.str(data), a === undefined ? 1 : PL.num(a)));
  def(Z, 'memGunzip', () => undefined);
  PL.pkg(Z).EXPORT = Object.keys(consts).concat(['inflateInit', 'deflateInit', 'compress', 'uncompress', 'crc32', 'adler32']);
}

// ---------------------------------------------------------------------------- Encode
markLoaded('Encode.pm');
def('Encode', 'is_utf8', (s) => (PL.isWide(PL.str(s)) ? 1 : ''));
def('Encode', 'encode', (enc, s) => {
  enc = PL.str(enc).toLowerCase().replace(/[-_]/g, '');
  s = PL.str(s);
  if (enc === 'utf8') { let o = ''; for (const ch of s) o += PL.utf8Encode(ch.codePointAt(0)); return o; }
  if (enc === 'latin1' || enc === 'iso88591') return s.replace(/[^\x00-\xff]/g, '?');
  if (enc === 'ucs2be' || enc === 'utf16be') { let o = ''; for (let i = 0; i < s.length; ++i) { const c = s.charCodeAt(i); o += String.fromCharCode(c >> 8, c & 0xff); } return o; }
  if (enc === 'ucs2le' || enc === 'utf16le') { let o = ''; for (let i = 0; i < s.length; ++i) { const c = s.charCodeAt(i); o += String.fromCharCode(c & 0xff, c >> 8); } return o; }
  throw new PerlDie(`Unknown encoding '${enc}' at (eval) line 1.\n`);
});
def('Encode', 'decode', (enc, s) => {
  enc = PL.str(enc).toLowerCase().replace(/[-_]/g, '');
  s = PL.str(s);
  if (enc === 'utf8') { const b = PL.box(s); PL.utf8_decode(b); return b.v; }
  if (enc === 'latin1' || enc === 'iso88591') return s;
  throw new PerlDie(`Unknown encoding '${enc}' at (eval) line 1.\n`);
});
def('Encode', 'decode_utf8', (s) => { const b = PL.box(PL.str(s)); PL.utf8_decode(b); return b.v; });
def('Encode', 'encode_utf8', (s) => { let o = ''; for (const ch of PL.str(s)) o += PL.utf8Encode(ch.codePointAt(0)); return o; });

// ---------------------------------------------------------------------------- IO::Uncompress / IO::Compress
function boxVal(x) { return x instanceof PL.Box || x instanceof PL.LvBox ? PL.str(x.v) : PL.str(x); }
function setBox(x, v) { if (x instanceof PL.Box || x instanceof PL.LvBox) x.v = v; }
markLoaded('IO/Uncompress/Gunzip.pm');
def('IO::Uncompress::Gunzip', 'gunzip', (inp, out) => {
  const s = boxVal(inp);
  try {
    if (s.charCodeAt(0) !== 0x1f || s.charCodeAt(1) !== 0x8b || s.charCodeAt(2) !== 8) throw new Error('not gzip');
    const flg = s.charCodeAt(3);
    let pos = 10;
    if (flg & 4) pos += 2 + (s.charCodeAt(pos) | (s.charCodeAt(pos + 1) << 8));
    if (flg & 8) { while (s.charCodeAt(pos) !== 0 && pos < s.length) ++pos; ++pos; }
    if (flg & 16) { while (s.charCodeAt(pos) !== 0 && pos < s.length) ++pos; ++pos; }
    if (flg & 2) pos += 2;
    const r = inflateRaw(s, pos);
    setBox(out, r.out);
    return 1;
  } catch (e) {
    PL.pkg('IO::Uncompress::Gunzip').$GunzipError = e.message;
    return 0;
  }
});
markLoaded('IO/Uncompress/RawInflate.pm');
def('IO::Uncompress::RawInflate', 'rawinflate', (inp, out) => {
  try { setBox(out, inflateRaw(boxVal(inp)).out); return 1; } catch (e) { PL.pkg('IO::Uncompress::RawInflate').$RawInflateError = e.message; return 0; }
});
markLoaded('IO/Compress/RawDeflate.pm');
def('IO::Compress::RawDeflate', 'rawdeflate', (inp, out) => { setBox(out, deflateRaw(boxVal(inp))); return 1; });
