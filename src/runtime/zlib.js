// Small zlib implementation (inflate + deflate) operating on byte strings (char codes 0-255).

// ---------------------------------------------------------------------------- checksums
const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; ++n) {
  let c = n;
  for (let k = 0; k < 8; ++k) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}
export function crc32(s, crc = 0) {
  let c = ~crc;
  for (let i = 0; i < s.length; ++i) c = CRC_TABLE[(c ^ s.charCodeAt(i)) & 0xff] ^ (c >>> 8);
  return (~c) >>> 0;
}
export function adler32(s, a = 1) {
  let s1 = a & 0xffff, s2 = (a >>> 16) & 0xffff;
  for (let i = 0; i < s.length;) {
    const n = Math.min(3800, s.length - i);
    for (let k = 0; k < n; ++k, ++i) { s1 += s.charCodeAt(i) & 0xff; s2 += s1; }
    s1 %= 65521; s2 %= 65521;
  }
  return ((s2 << 16) | s1) >>> 0;
}

// ---------------------------------------------------------------------------- inflate
const LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DBASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CLORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

class Incomplete extends Error { constructor() { super('incomplete deflate stream'); this.incomplete = true; } }

function buildHuff(lengths) {
  // returns {counts, symbols}
  const counts = new Uint16Array(16);
  for (const l of lengths) counts[l]++;
  counts[0] = 0;
  const offs = new Uint16Array(16);
  for (let i = 1; i < 16; ++i) offs[i] = offs[i - 1] + counts[i - 1];
  const symbols = new Uint16Array(lengths.length);
  for (let i = 0; i < lengths.length; ++i) if (lengths[i]) symbols[offs[lengths[i]]++] = i;
  return { counts, symbols };
}

export function inflateRaw(src, start = 0) {
  let pos = start;
  let bitbuf = 0, bitcnt = 0;
  const out = [];
  let outLen = 0;
  const chunks = [];
  // output buffer as Uint8Array growing
  let buf = new Uint8Array(Math.max(1024, src.length * 4));
  const need = (n) => {
    while (bitcnt < n) {
      if (pos >= src.length) throw new Incomplete();
      bitbuf |= (src.charCodeAt(pos++) & 0xff) << bitcnt;
      bitcnt += 8;
    }
  };
  const bits = (n) => {
    if (n === 0) return 0;
    need(n);
    const v = bitbuf & ((1 << n) - 1);
    bitbuf >>>= n;
    bitcnt -= n;
    return v;
  };
  const decode = (h) => {
    let code = 0, first = 0, index = 0;
    for (let len = 1; len < 16; ++len) {
      code |= bits(1);
      const count = h.counts[len];
      if (code - count < first) return h.symbols[index + (code - first)];
      index += count;
      first += count;
      first <<= 1;
      code <<= 1;
    }
    throw new Error('invalid Huffman code');
  };
  const put = (b) => {
    if (outLen >= buf.length) { const nb = new Uint8Array(buf.length * 2); nb.set(buf); buf = nb; }
    buf[outLen++] = b;
  };
  let fixedL, fixedD;
  let last = 0;
  while (!last) {
    last = bits(1);
    const type = bits(2);
    if (type === 0) {
      bitbuf = 0; bitcnt = 0;
      if (pos + 4 > src.length) throw new Incomplete();
      const len = (src.charCodeAt(pos) & 0xff) | ((src.charCodeAt(pos + 1) & 0xff) << 8);
      pos += 4;
      if (pos + len > src.length) throw new Incomplete();
      for (let i = 0; i < len; ++i) put(src.charCodeAt(pos + i) & 0xff);
      pos += len;
      continue;
    }
    let lh, dh;
    if (type === 1) {
      if (!fixedL) {
        const l = new Uint8Array(288);
        for (let i = 0; i < 144; ++i) l[i] = 8;
        for (let i = 144; i < 256; ++i) l[i] = 9;
        for (let i = 256; i < 280; ++i) l[i] = 7;
        for (let i = 280; i < 288; ++i) l[i] = 8;
        fixedL = buildHuff(l);
        fixedD = buildHuff(new Uint8Array(30).fill(5));
      }
      lh = fixedL; dh = fixedD;
    } else if (type === 2) {
      const nlen = bits(5) + 257, ndist = bits(5) + 1, ncode = bits(4) + 4;
      const cl = new Uint8Array(19);
      for (let i = 0; i < ncode; ++i) cl[CLORDER[i]] = bits(3);
      const ch = buildHuff(cl);
      const lens = new Uint8Array(nlen + ndist);
      for (let i = 0; i < nlen + ndist;) {
        const sym = decode(ch);
        if (sym < 16) lens[i++] = sym;
        else {
          let rep, val = 0;
          if (sym === 16) { if (!i) throw new Error('bad repeat'); val = lens[i - 1]; rep = 3 + bits(2); }
          else if (sym === 17) rep = 3 + bits(3);
          else rep = 11 + bits(7);
          while (rep--) lens[i++] = val;
        }
      }
      lh = buildHuff(lens.subarray(0, nlen));
      dh = buildHuff(lens.subarray(nlen));
    } else throw new Error('invalid block type');
    for (;;) {
      const sym = decode(lh);
      if (sym < 256) put(sym);
      else if (sym === 256) break;
      else {
        const li = sym - 257;
        if (li >= 29) throw new Error('bad length');
        const len = LBASE[li] + bits(LEXT[li]);
        const di = decode(dh);
        const dist = DBASE[di] + bits(DEXT[di]);
        if (dist > outLen) throw new Error('distance too far');
        for (let k = 0; k < len; ++k) put(buf[outLen - dist]);
      }
    }
  }
  return { out: bytesToStr(buf, outLen), end: pos, done: true, rest: src.slice(pos) };
}

function bytesToStr(buf, n) {
  let s = '';
  for (let i = 0; i < n; i += 8192) s += String.fromCharCode.apply(null, buf.subarray(i, Math.min(n, i + 8192)));
  return s;
}

export function inflateZlib(src) {
  if (src.length < 2) throw new Incomplete();
  const cmf = src.charCodeAt(0), flg = src.charCodeAt(1);
  if ((cmf & 0x0f) !== 8 || ((cmf << 8) | flg) % 31) throw new Error('bad zlib header');
  const start = flg & 0x20 ? 6 : 2;
  const r = inflateRaw(src, start);
  // adler32 trailer (4 bytes)
  if (r.end + 4 > src.length) throw new Incomplete();
  r.rest = src.slice(r.end + 4);
  return r;
}

// ---------------------------------------------------------------------------- deflate
class BitWriter {
  constructor() { this.buf = new Uint8Array(1024); this.n = 0; this.bb = 0; this.bc = 0; }
  byte(b) {
    if (this.n >= this.buf.length) { const nb = new Uint8Array(this.buf.length * 2); nb.set(this.buf); this.buf = nb; }
    this.buf[this.n++] = b;
  }
  bits(v, n) {
    this.bb |= v << this.bc;
    this.bc += n;
    while (this.bc >= 8) { this.byte(this.bb & 0xff); this.bb >>>= 8; this.bc -= 8; }
  }
  // write Huffman code (codes are stored bit-reversed)
  flushByte() { if (this.bc > 0) { this.byte(this.bb & 0xff); this.bb = 0; this.bc = 0; } }
  str() { return bytesToStr(this.buf, this.n); }
}

function reverseBits(v, n) {
  let r = 0;
  for (let i = 0; i < n; ++i) { r = (r << 1) | (v & 1); v >>>= 1; }
  return r;
}

// build length-limited Huffman code lengths (package-merge would be optimal; use a simple heuristic)
function huffLengths(freqs, maxBits) {
  const n = freqs.length;
  const lens = new Uint8Array(n);
  const syms = [];
  for (let i = 0; i < n; ++i) if (freqs[i]) syms.push(i);
  if (syms.length === 0) return lens;
  if (syms.length === 1) { lens[syms[0]] = 1; return lens; }
  // standard Huffman via sorting/merging
  let nodes = syms.map((s) => ({ f: freqs[s], s, l: null, r: null }));
  for (;;) {
    nodes.sort((a, b) => a.f - b.f);
    while (nodes.length > 1) {
      const a = nodes.shift(), b = nodes.shift();
      const nn = { f: a.f + b.f, l: a, r: b };
      // insert keeping sorted
      let i = 0;
      while (i < nodes.length && nodes[i].f <= nn.f) ++i;
      nodes.splice(i, 0, nn);
    }
    const walk = (nd, d) => { if (nd.s !== undefined) lens[nd.s] = Math.max(1, d); else { walk(nd.l, d + 1); walk(nd.r, d + 1); } };
    walk(nodes[0], 0);
    let max = 0;
    for (const s of syms) if (lens[s] > max) max = lens[s];
    if (max <= maxBits) return lens;
    // flatten frequencies and retry
    for (const s of syms) freqs[s] = Math.max(1, freqs[s] >> 1) | 0;
    nodes = syms.map((s) => ({ f: freqs[s], s, l: null, r: null }));
  }
}

function canonicalCodes(lens) {
  const blCount = new Uint16Array(16);
  for (const l of lens) blCount[l]++;
  blCount[0] = 0;
  const next = new Uint16Array(16);
  let code = 0;
  for (let b = 1; b < 16; ++b) { code = (code + blCount[b - 1]) << 1; next[b] = code; }
  const codes = new Uint16Array(lens.length);
  for (let i = 0; i < lens.length; ++i) if (lens[i]) codes[i] = reverseBits(next[lens[i]]++, lens[i]);
  return codes;
}

function lenCode(len) {
  for (let i = 28; i >= 0; --i) if (len >= LBASE[i]) return i;
  return 0;
}
function distCode(d) {
  for (let i = 29; i >= 0; --i) if (d >= DBASE[i]) return i;
  return 0;
}

export function deflateRaw(src, level = 6) {
  if (level === -1) level = 6;
  const w = new BitWriter();
  const n = src.length;
  if (level === 0 || n === 0) {
    // stored blocks
    let pos = 0;
    do {
      const len = Math.min(65535, n - pos);
      const last = pos + len >= n ? 1 : 0;
      w.bits(last, 1); w.bits(0, 2); w.flushByte();
      w.byte(len & 0xff); w.byte(len >> 8); w.byte(~len & 0xff); w.byte((~len >> 8) & 0xff);
      for (let i = 0; i < len; ++i) w.byte(src.charCodeAt(pos + i) & 0xff);
      pos += len;
    } while (pos < n);
    return w.str();
  }
  const data = new Uint8Array(n);
  for (let i = 0; i < n; ++i) data[i] = src.charCodeAt(i) & 0xff;
  const maxChain = level >= 8 ? 1024 : level >= 5 ? 128 : 16;
  // LZ77
  const HSIZE = 1 << 15;
  const head = new Int32Array(HSIZE).fill(-1);
  const prev = new Int32Array(Math.min(n, 32768));
  const tokens = [];   // literal: value < 256; match: {len, dist} encoded as len<<16 | dist  (len >= 3)
  const hash = (i) => ((data[i] << 10) ^ (data[i + 1] << 5) ^ data[i + 2]) & (HSIZE - 1);
  let i = 0;
  while (i < n) {
    let bestLen = 0, bestDist = 0;
    if (i + 2 < n) {
      const h = hash(i);
      let j = head[h];
      let chain = maxChain;
      while (j >= 0 && i - j <= 32768 && chain-- > 0) {
        if (data[j + bestLen] === data[i + bestLen]) {
          let l = 0;
          const maxl = Math.min(258, n - i);
          while (l < maxl && data[j + l] === data[i + l]) ++l;
          if (l > bestLen) { bestLen = l; bestDist = i - j; if (l === maxl) break; }
        }
        const pj = prev[j & 32767];
        if (pj >= j) break;
        j = pj;
      }
      prev[i & 32767] = head[h];
      head[h] = i;
    }
    if (bestLen >= 3) {
      tokens.push(-((bestLen << 16) | bestDist));
      // insert hashes for skipped positions
      for (let k = 1; k < bestLen; ++k) {
        const p = i + k;
        if (p + 2 < n) { const h = hash(p); prev[p & 32767] = head[h]; head[h] = p; }
      }
      i += bestLen;
    } else {
      tokens.push(data[i]);
      ++i;
    }
  }
  // frequencies
  const lf = new Uint32Array(286), df = new Uint32Array(30);
  for (const t of tokens) {
    if (t >= 0) lf[t]++;
    else { const v = -t; lf[257 + lenCode(v >>> 16)]++; df[distCode(v & 0xffff)]++; }
  }
  lf[256] = 1;
  let ndist = 30;
  while (ndist > 1 && !df[ndist - 1]) --ndist;
  if (!df.some((x) => x)) df[0] = 1;
  const ll = huffLengths(Array.from(lf), 15);
  const dl = huffLengths(Array.from(df), 15);
  let nlen = 286;
  while (nlen > 257 && !ll[nlen - 1]) --nlen;
  const lcodes = canonicalCodes(ll), dcodes = canonicalCodes(dl);
  // code length sequence with RLE
  const all = [...ll.slice(0, nlen), ...dl.slice(0, ndist)];
  const clSyms = [];
  for (let k = 0; k < all.length;) {
    const v = all[k];
    let run = 1;
    while (k + run < all.length && all[k + run] === v) ++run;
    if (v === 0 && run >= 3) {
      let r = run;
      while (r >= 11) { const c = Math.min(138, r); clSyms.push([18, c - 11, 7]); r -= c; }
      if (r >= 3) { clSyms.push([17, r - 3, 3]); r = 0; }
      while (r-- > 0) clSyms.push([0]);
      k += run;
    } else if (v !== 0 && run >= 4) {
      clSyms.push([v]);
      let r = run - 1;
      while (r >= 3) { const c = Math.min(6, r); clSyms.push([16, c - 3, 2]); r -= c; }
      while (r-- > 0) clSyms.push([v]);
      k += run;
    } else {
      clSyms.push([v]);
      ++k;
    }
  }
  const cf = new Uint32Array(19);
  for (const s of clSyms) cf[s[0]]++;
  const cl = huffLengths(Array.from(cf), 7);
  const ccodes = canonicalCodes(cl);
  let ncode = 19;
  while (ncode > 4 && !cl[CLORDER[ncode - 1]]) --ncode;
  // write block header
  w.bits(1, 1); w.bits(2, 2);
  w.bits(nlen - 257, 5); w.bits(ndist - 1, 5); w.bits(ncode - 4, 4);
  for (let k = 0; k < ncode; ++k) w.bits(cl[CLORDER[k]], 3);
  for (const s of clSyms) {
    w.bits(ccodes[s[0]], cl[s[0]]);
    if (s.length > 1) w.bits(s[1], s[2]);
  }
  for (const t of tokens) {
    if (t >= 0) w.bits(lcodes[t], ll[t]);
    else {
      const v = -t;
      const len = v >>> 16, dist = v & 0xffff;
      const lc = lenCode(len);
      w.bits(lcodes[257 + lc], ll[257 + lc]);
      if (LEXT[lc]) w.bits(len - LBASE[lc], LEXT[lc]);
      const dc = distCode(dist);
      w.bits(dcodes[dc], dl[dc]);
      if (DEXT[dc]) w.bits(dist - DBASE[dc], DEXT[dc]);
    }
  }
  w.bits(lcodes[256], ll[256]);
  w.flushByte();
  return w.str();
}

export function deflateZlib(src, level = 6) {
  if (level === -1) level = 6;
  const flevel = level < 2 ? 0 : level < 6 ? 1 : level === 6 ? 2 : 3;
  const cmf = 0x78;
  let flg = flevel << 6;
  flg += 31 - ((cmf << 8) + flg) % 31;
  const body = deflateRaw(src, level);
  const a = adler32(src);
  return String.fromCharCode(cmf, flg) + body + String.fromCharCode((a >>> 24) & 0xff, (a >>> 16) & 0xff, (a >>> 8) & 0xff, a & 0xff);
}
