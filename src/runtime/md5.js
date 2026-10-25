// MD5 digest of a byte string (char codes 0-255); returns 16-byte binary string
const K = new Int32Array(64);
for (let i = 0; i < 64; ++i) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
const R = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];

export function md5(s) {
  const n = s.length;
  const total = ((n + 8) >>> 6) + 1;
  const blocks = new Int32Array(total * 16);
  for (let i = 0; i < n; ++i) blocks[i >> 2] |= (s.charCodeAt(i) & 0xff) << ((i % 4) * 8);
  blocks[n >> 2] |= 0x80 << ((n % 4) * 8);
  const bits = n * 8;
  blocks[total * 16 - 2] = bits | 0;
  blocks[total * 16 - 1] = Math.floor(bits / 4294967296) | 0;
  let a0 = 0x67452301 | 0, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476 | 0;
  for (let off = 0; off < blocks.length; off += 16) {
    let a = a0, b = b0, c = c0, d = d0;
    for (let i = 0; i < 64; ++i) {
      let f, g;
      if (i < 16) { f = (b & c) | (~b & d); g = i; }
      else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
      else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * i) % 16; }
      const tmp = d;
      d = c;
      c = b;
      const x = (a + f + K[i] + blocks[off + g]) | 0;
      b = (b + ((x << R[i]) | (x >>> (32 - R[i])))) | 0;
      a = tmp;
    }
    a0 = (a0 + a) | 0; b0 = (b0 + b) | 0; c0 = (c0 + c) | 0; d0 = (d0 + d) | 0;
  }
  let out = '';
  for (const v of [a0, b0, c0, d0]) for (let k = 0; k < 4; ++k) out += String.fromCharCode((v >>> (8 * k)) & 0xff);
  return out;
}
