// Perl-compatible sprintf and number formatting (C/glibc semantics, including round-half-even
// on exact decimal ties, which differs from JavaScript's toFixed/toPrecision).

// exact decimal representation of a finite double: returns { digits (string, no leading zeros),
// exp10 } such that |x| = 0.digits * 10^exp10  -- i.e. digits with decimal point before first digit
const f64 = new Float64Array(1);
const u32 = new Uint32Array(f64.buffer);
const pow5cache = [1n];
function pow5(k) {
  while (pow5cache.length <= k) pow5cache.push(pow5cache[pow5cache.length - 1] * 5n);
  return pow5cache[k];
}

export function exactDecimal(x) {
  x = Math.abs(x);
  if (x === 0) return { digits: '0', exp10: 1, zero: true };
  f64[0] = x;
  const lo = u32[0], hi = u32[1];
  let e = (hi >>> 20) & 0x7ff;
  let m = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  if (e === 0) e = 1; else m |= 1n << 52n;
  e -= 1075; // x = m * 2^e
  let intStr, fracDigits;
  if (e >= 0) {
    intStr = (m << BigInt(e)).toString();
    return { digits: intStr.replace(/0+$/, '') || '0', exp10: intStr.length };
  }
  const k = -e;
  const n = m * pow5(k);      // x = n / 10^k
  let s = n.toString();
  // remove trailing zeros
  let t = s.replace(/0+$/, '');
  const exp10 = s.length - k;
  return { digits: t, exp10 };
}

// round digit string to n significant digits (round half even on exact ties)
// returns { digits, exp10 }
function roundDigits(d, exp10, n) {
  if (n < 0) return { digits: '0', exp10, zero: true };
  if (d.length <= n) return { digits: d, exp10 };
  const keep = d.slice(0, n);
  const rest = d.slice(n);
  let up;
  if (rest[0] > '5') up = true;
  else if (rest[0] < '5') up = false;
  else if (/[1-9]/.test(rest.slice(1))) up = true;
  else {
    // exact tie: round half to even
    const last = n > 0 ? keep.charCodeAt(n - 1) - 48 : 0;
    up = (last % 2) === 1;
  }
  if (!up) return { digits: keep.replace(/0+$/, '') || '0', exp10, zero: !keep.replace(/0+$/, '') };
  // increment keep
  if (n === 0) return { digits: '1', exp10: exp10 + 1 };
  const arr = keep.split('').map((c) => c.charCodeAt(0) - 48);
  let i = arr.length - 1;
  while (i >= 0) {
    if (arr[i] === 9) { arr[i] = 0; --i; } else { arr[i]++; break; }
  }
  if (i < 0) { arr.unshift(1); exp10 += 1; arr.pop(); }
  return { digits: arr.join('').replace(/0+$/, '') || '0', exp10 };
}

// %.{prec}f
export function fmtFixed(x, prec) {
  if (!isFinite(x)) return fmtSpecial(x);
  const neg = x < 0 || Object.is(x, -0);
  const ed = exactDecimal(x);
  let digits, exp10;
  if (ed.zero) { digits = '0'; exp10 = 1; }
  else {
    // number of significant digits to keep = exp10 + prec
    const r = roundDigits(ed.digits, ed.exp10, ed.exp10 + prec);
    digits = r.zero ? '0' : r.digits; exp10 = r.zero ? 1 : r.exp10;
    if (r.zero) { digits = '0'; exp10 = 1; }
  }
  let intPart, fracPart;
  if (exp10 <= 0) {
    intPart = '0';
    fracPart = '0'.repeat(-exp10) + digits;
  } else {
    intPart = digits.slice(0, exp10).padEnd(exp10, '0');
    fracPart = digits.slice(exp10);
  }
  if (digits === '0') { intPart = '0'; fracPart = ''; }
  fracPart = fracPart.padEnd(prec, '0').slice(0, prec);
  let s = intPart + (prec > 0 ? '.' + fracPart : '');
  if (neg && /[1-9]/.test(s)) s = '-' + s;
  else if (neg) s = '-' + s;  // C prints -0.00 for negative zero values
  return s;
}

// %.{prec}e
export function fmtExp(x, prec, upper) {
  if (!isFinite(x)) return fmtSpecial(x, upper);
  const neg = x < 0 || Object.is(x, -0);
  const ed = exactDecimal(x);
  let digits, exp10;
  if (ed.zero) { digits = '0'; exp10 = 1; }
  else {
    const r = roundDigits(ed.digits, ed.exp10, prec + 1);
    digits = r.digits; exp10 = r.exp10;
  }
  const e = ed.zero ? 0 : exp10 - 1;
  let mant = digits[0] + (prec > 0 ? '.' + digits.slice(1).padEnd(prec, '0').slice(0, prec) : '');
  const es = (e < 0 ? '-' : '+') + String(Math.abs(e)).padStart(2, '0');
  return (neg ? '-' : '') + mant + (upper ? 'E' : 'e') + es;
}

// %.{prec}g
export function fmtGeneral(x, prec, upper, alt) {
  if (!isFinite(x)) return fmtSpecial(x, upper);
  if (prec === 0) prec = 1;
  const neg = x < 0 || Object.is(x, -0);
  const ed = exactDecimal(x);
  let X;
  let r;
  if (ed.zero) { X = 0; r = { digits: '0', exp10: 1 }; }
  else {
    r = roundDigits(ed.digits, ed.exp10, prec);
    X = r.exp10 - 1;
  }
  let s;
  if (prec > X && X >= -4) {
    // fixed notation with prec-1-X decimals
    const p = prec - 1 - X;
    s = fmtFixed(Math.abs(x), p);
    if (!alt && s.includes('.')) s = s.replace(/\.?0+$/, '');
  } else {
    s = fmtExp(Math.abs(x), prec - 1, upper);
    if (!alt) s = s.replace(/\.?0+(?=[eE])/, '');
  }
  return (neg ? '-' : '') + s;
}

function fmtSpecial(x, upper) {
  let s = isNaN(x) ? 'NaN' : x > 0 ? 'Inf' : '-Inf';
  return s;
}

// Perl number stringification ("%.15g", integers printed exactly)
export function numToStr(n) {
  if (Number.isSafeInteger(n)) return Object.is(n, -0) ? '0' : String(n);
  if (!isFinite(n)) return isNaN(n) ? 'NaN' : n > 0 ? 'Inf' : '-Inf';
  const a = Math.abs(n);
  if (a >= 1e-4 && a < 1e15) {
    // fast path using toPrecision, which rounds exact ties up (glibc rounds them to even).
    // Ties are only possible if the 16th significant digit is a 5, so use the exact
    // (slower) algorithm in that case
    const d16 = n.toPrecision(16).replace(/^-?0*\.?0*/, '').replace(/\./, '');
    if (d16[15] !== '5') {
      const s = n.toPrecision(15);
      if (!s.includes('e')) return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
    }
  }
  return fmtGeneral(n, 15);
}

// ------------------------------------------------------------------ sprintf
export function makeSprintf(PL) {
  return function sprintf(fmt, ...args) {
    fmt = PL.str(fmt);
    let out = '';
    let argi = 0;
    const nextArg = () => args[argi++];
    const re = /%(?:(\d+)\$)?([-+ 0#]*)(\*(?:\d+\$)?|\d+)?(?:\.(\*(?:\d+\$)?|\d*))?(hh|h|ll|l|q|L|V|z|t|j)?(v)?([%csduoxXeEfFgGbBnpi])|%v(?:(\d+)\$)?([-+ 0#]*)(\d+)?(?:\.(\d*))?([duoxXbB])/g;
    let last = 0;
    let m;
    // handle %vd (version) separately: rewrite pattern simpler
    while ((m = re.exec(fmt))) {
      out += fmt.slice(last, m.index);
      last = re.lastIndex;
      if (m[12] !== undefined || (m[7] === undefined && m[16])) {
        // vector flag %vd
        const val = PL.str(nextArg());
        const conv = m[16];
        const parts = [];
        for (const ch of val) parts.push(formatInt(ch.codePointAt(0), conv, m[13] || '', m[14] ? Number(m[14]) : undefined, m[15] !== undefined ? Number(m[15] || 0) : undefined));
        out += parts.join('.');
        continue;
      }
      let [, pos, flags, width, precision, , vflag, conv] = m;
      if (conv === '%') { out += '%'; continue; }
      if (width && width.startsWith('*')) {
        const w = width.length > 1 ? args[Number(width.slice(1, -1)) - 1] : nextArg();
        width = PL.num(w);
        if (width < 0) { flags += '-'; width = -width; }
      } else width = width ? Number(width) : undefined;
      if (precision !== undefined) {
        if (precision.startsWith('*')) {
          const p = precision.length > 1 ? args[Number(precision.slice(1, -1)) - 1] : nextArg();
          precision = PL.num(p);
          if (precision < 0) precision = undefined;
        } else precision = Number(precision || 0);
      }
      const arg = pos ? args[Number(pos) - 1] : nextArg();
      if (vflag) {
        const val = PL.str(arg);
        const parts = [];
        for (const ch of val) parts.push(formatInt(ch.codePointAt(0), conv, flags, undefined, precision));
        out += pad(parts.join('.'), width, flags);
        continue;
      }
      out += formatOne(PL, arg, conv, flags, width, precision);
    }
    out += fmt.slice(last);
    return out;
  };
}

function pad(s, width, flags, numeric) {
  if (width === undefined || s.length >= width) return s;
  if (flags.includes('-')) return s + ' '.repeat(width - s.length);
  if (numeric && flags.includes('0')) {
    // zero padding after sign/prefix
    const m = /^([-+ ]?(?:0[xXbB])?)(.*)$/.exec(s);
    return m[1] + '0'.repeat(width - s.length) + m[2];
  }
  return ' '.repeat(width - s.length) + s;
}

function toInteger(PL, v) {
  // Perl integer conversion for %d etc: truncate toward zero
  if (typeof v === 'bigint') return v;
  let n = PL.num(v);
  if (!isFinite(n)) return n;
  n = Math.trunc(n);
  if (!Number.isSafeInteger(n)) {
    // clamp to 64-bit range as Perl does
    if (n >= 9223372036854775807) return 9223372036854775807n;
    if (n <= -9223372036854775808) return -9223372036854775808n;
    return BigInt(n);
  }
  return n;
}

function formatInt(n, conv, flags, width, precision) {
  let neg = false;
  let s;
  let big = typeof n === 'bigint' ? n : BigInt(n);
  if (conv === 'd' || conv === 'i') {
    neg = big < 0n;
    s = (neg ? -big : big).toString();
  } else {
    // unsigned conversions treat negative numbers as 64-bit two's complement
    if (big < 0n) big = BigInt.asUintN(64, big);
    switch (conv) {
      case 'u': s = big.toString(); break;
      case 'o': s = big.toString(8); break;
      case 'x': s = big.toString(16); break;
      case 'X': s = big.toString(16).toUpperCase(); break;
      case 'b': case 'B': s = big.toString(2); break;
    }
  }
  if (precision !== undefined) {
    if (precision === 0 && s === '0') s = '';
    s = s.padStart(precision, '0');
  }
  let prefix = '';
  if (flags.includes('#') && big !== 0n) {
    if (conv === 'x') prefix = '0x';
    else if (conv === 'X') prefix = '0X';
    else if (conv === 'b') prefix = '0b';
    else if (conv === 'B') prefix = '0B';
    else if (conv === 'o' && !s.startsWith('0')) prefix = '0';
  }
  let sign = neg ? '-' : (conv === 'd' || conv === 'i') ? (flags.includes('+') ? '+' : flags.includes(' ') ? ' ' : '') : '';
  const body = sign + prefix + s;
  return pad(body, width, precision !== undefined ? flags.replace('0', '') : flags, true);
}

function formatOne(PL, arg, conv, flags, width, precision) {
  switch (conv) {
    case 's': {
      let s = PL.str(arg);
      if (precision !== undefined) s = s.slice(0, precision);
      return pad(s, width, flags);
    }
    case 'c': {
      const n = PL.num(arg);
      return pad(PL.chr(n), width, flags);
    }
    case 'd': case 'i': case 'u': case 'o': case 'x': case 'X': case 'b': case 'B': {
      const n = toInteger(PL, arg);
      if (typeof n === 'number' && !isFinite(n)) return pad(isNaN(n) ? (conv === 'd' ? '-1' : 'NaN') : n > 0 ? '-1' : '1', width, flags);
      return formatInt(n, conv, flags, width, precision);
    }
    case 'e': case 'E': case 'f': case 'F': case 'g': case 'G': {
      const x = PL.num(arg);
      const p = precision === undefined ? 6 : precision;
      let s;
      if (!isFinite(x)) {
        s = isNaN(x) ? 'NaN' : x > 0 ? 'Inf' : '-Inf';
        if (x > 0 && flags.includes('+')) s = '+' + s;
        return pad(s, width, flags.replace('0', ''));
      }
      if (conv === 'f' || conv === 'F') s = fmtFixed(x, p);
      else if (conv === 'e' || conv === 'E') s = fmtExp(x, p, conv === 'E');
      else s = fmtGeneral(x, p, conv === 'G', flags.includes('#'));
      if (flags.includes('#') && (conv === 'f' || conv === 'F') && p === 0) s += '.';
      if (!s.startsWith('-')) {
        if (flags.includes('+')) s = '+' + s;
        else if (flags.includes(' ')) s = ' ' + s;
      }
      return pad(s, width, flags, true);
    }
    case 'n': return '';
    case 'p': return pad('0x' + PL.refaddr(arg).toString(16), width, flags);
  }
  return '';
}
