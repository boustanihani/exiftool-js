// generate synthetic TIFF variants (8-bit RGB, uncompressed)
import fs from 'fs';
const out = process.argv[2];
function tiff({ le = true, w = 8, h = 6, strips = 1, tiled = false, pages = 1, extra = [] }) {
  const parts = []; let pos = 8;
  const u16 = (v) => { const b = Buffer.alloc(2); le ? b.writeUInt16LE(v) : b.writeUInt16BE(v); return b; };
  const u32 = (v) => { const b = Buffer.alloc(4); le ? b.writeUInt32LE(v) : b.writeUInt32BE(v); return b; };
  const add = (buf) => { const p = pos; parts.push(buf); pos += buf.length; if (pos & 1) { parts.push(Buffer.alloc(1)); pos++; } return p; };
  const ifdOffsets = [];
  const ifdPatches = [];
  for (let pg = 0; pg < pages; pg++) {
    const img = Buffer.alloc(w * h * 3); for (let i = 0; i < img.length; i++) img[i] = (i * 31 + pg * 50) & 0xff;
    const entries = [];
    const E = (tag, type, count, valueOrBuf) => entries.push({ tag, type, count, v: valueOrBuf });
    E(0x100, 3, 1, w); E(0x101, 3, 1, h);
    const bps = add(Buffer.concat([u16(8), u16(8), u16(8)])); E(0x102, 3, 3, { off: bps });
    E(0x103, 3, 1, 1); E(0x106, 3, 1, 2);
    if (pg === 0) { const mk = add(Buffer.from('SynthTIFF\0')); E(0x10f, 2, 10, { off: mk }); }
    E(0x115, 3, 1, 3);
    if (tiled) {
      const tw = 16, th = 16; const tile = Buffer.alloc(tw * th * 3); img.copy(tile, 0, 0, Math.min(img.length, tile.length));
      const t0 = add(tile); E(0x142, 3, 1, tw); E(0x143, 3, 1, th); E(0x144, 4, 1, t0); E(0x145, 4, 1, tile.length);
    } else {
      const rps = Math.ceil(h / strips); const offs = []; const cnts = [];
      for (let s = 0; s < strips; s++) { const d = img.subarray(s * rps * w * 3, Math.min(h, (s + 1) * rps) * w * 3); offs.push(add(Buffer.from(d))); cnts.push(d.length); }
      E(0x116, 3, 1, rps);
      if (strips === 1) { E(0x111, 4, 1, offs[0]); E(0x117, 4, 1, cnts[0]); }
      else { const o = add(Buffer.concat(offs.map(u32))); const c = add(Buffer.concat(cnts.map(u32))); E(0x111, 4, strips, { off: o }); E(0x117, 4, strips, { off: c }); }
    }
    const res = add(Buffer.concat([u32(72), u32(1)])); E(0x11a, 5, 1, { off: res }); E(0x11b, 5, 1, { off: res }); E(0x128, 3, 1, 2);
    if (pg === 0) for (const x of extra) E(...x(add, u16, u32));
    entries.sort((a, b) => a.tag - b.tag);
    const dir = [u16(entries.length)];
    for (const e of entries) {
      let val;
      if (e.v && e.v.off !== undefined) val = u32(e.v.off);
      else if (e.type === 3) val = Buffer.concat([u16(e.v), u16(0)]);
      else val = u32(e.v);
      dir.push(Buffer.concat([u16(e.tag), u16(e.type), u32(e.count), val]));
    }
    const next = Buffer.alloc(4); dir.push(next);
    const d = Buffer.concat(dir); const p = add(d); ifdOffsets.push(p); ifdPatches.push(p + d.length - 4);
  }
  const buf = Buffer.concat([Buffer.from(le ? 'II' : 'MM'), u16(42), u32(ifdOffsets[0]), ...parts]);
  for (let i = 0; i + 1 < pages; i++) le ? buf.writeUInt32LE(ifdOffsets[i + 1], ifdPatches[i]) : buf.writeUInt32BE(ifdOffsets[i + 1], ifdPatches[i]);
  return buf;
}
const artist = (add) => { const p = add(Buffer.from('Synth Artist\0')); return [0x13b, 2, 13, { off: p }]; };
fs.mkdirSync(out, { recursive: true });
const files = {
  'le.tif': tiff({}), 'be.tif': tiff({ le: false }), 'strips.tif': tiff({ strips: 3 }), 'strips-be.tif': tiff({ le: false, strips: 6 }),
  'tiled.tif': tiff({ tiled: true }), 'pages.tif': tiff({ pages: 3 }), 'artist.tif': tiff({ extra: [artist] }),
};
for (const [n, b] of Object.entries(files)) fs.writeFileSync(`${out}/${n}`, b);
console.log(Object.keys(files).length, 'files');
