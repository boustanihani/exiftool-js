// generate synthetic PNG variants for read/write comparison tests
import fs from 'fs';
import zlib from 'zlib';
const out = process.argv[2];
const crcTable = [];
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const d = Buffer.from(data);
  const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), d]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = (w, h, depth = 8, color = 2) => { const b = Buffer.alloc(13); b.writeUInt32BE(w, 0); b.writeUInt32BE(h, 4); b[8] = depth; b[9] = color; return chunk('IHDR', b); };
const idat = (w, h, bpp = 3) => { const raw = Buffer.alloc((w * bpp + 1) * h); for (let y = 0; y < h; y++) for (let x = 0; x < w * bpp; x++) raw[y * (w * bpp + 1) + 1 + x] = (x * 7 + y * 13) & 0xff; return chunk('IDAT', zlib.deflateSync(raw)); };
const iend = chunk('IEND', Buffer.alloc(0));
// minimal little-endian TIFF/EXIF block with Make/Model/Artist
const exif = () => {
  const entries = [[0x010f, 2, 'SynthCam\0'], [0x0110, 2, 'Model X\0'], [0x013b, 2, 'Someone\0'], [0x0112, 3, 1]];
  const n = entries.length; let off = 8 + 2 + n * 12 + 4; const dir = []; const data = [];
  for (const [tag, type, val] of entries) {
    const e = Buffer.alloc(12); e.writeUInt16LE(tag, 0); e.writeUInt16LE(type, 2);
    if (type === 2) { e.writeUInt32LE(val.length, 4); if (val.length <= 4) e.write(val, 8, 'latin1'); else { e.writeUInt32LE(off, 8); data.push(Buffer.from(val, 'latin1')); off += val.length; } }
    else { e.writeUInt32LE(1, 4); e.writeUInt16LE(val, 8); }
    dir.push(e);
  }
  const hdr = Buffer.from([0x49, 0x49, 0x2a, 0, 8, 0, 0, 0]); const cnt = Buffer.alloc(2); cnt.writeUInt16LE(n);
  return Buffer.concat([hdr, cnt, ...dir, Buffer.alloc(4), ...data]);
};
const text = (k, v) => chunk('tEXt', Buffer.from(k + '\0' + v, 'latin1'));
const ztxt = (k, v) => chunk('zTXt', Buffer.concat([Buffer.from(k + '\0\0', 'latin1'), zlib.deflateSync(Buffer.from(v, 'latin1'))]));
const itxt = (k, lang, v, comp) => chunk('iTXt', Buffer.concat([Buffer.from(k + '\0' + (comp ? '\x01' : '\0') + '\0' + lang + '\0\0', 'latin1'), comp ? zlib.deflateSync(Buffer.from(v, 'utf8')) : Buffer.from(v, 'utf8')]));
const xmp = '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">Synth title</rdf:li></rdf:Alt></dc:title></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>';
const icc = fs.readFileSync(new URL('../../upstream/t/images/ICC_Profile.icc', import.meta.url));
const files = {
  'plain.png': [ihdr(4, 3), idat(4, 3), iend],
  'gray16.png': [ihdr(3, 2, 16, 0), chunk('IDAT', zlib.deflateSync(Buffer.alloc((3 * 2 + 1) * 2))), iend],
  'text.png': [ihdr(4, 3), text('Title', 'A title'), text('Comment', 'caf\xe9 comment'), ztxt('Description', 'Compressed description text'), itxt('Author', '', 'Hani äöü', false), itxt('Copyright', 'de', 'Urheberrecht ©', true), idat(4, 3), iend],
  'exif-before.png': [ihdr(4, 3), chunk('eXIf', exif()), idat(4, 3), iend],
  'exif-after.png': [ihdr(4, 3), idat(4, 3), chunk('eXIf', exif()), iend],
  'xmp.png': [ihdr(4, 3), itxt('XML:com.adobe.xmp', '', xmp, false), idat(4, 3), iend],
  'xmp-after.png': [ihdr(4, 3), idat(4, 3), itxt('XML:com.adobe.xmp', '', xmp, false), iend],
  'iccp.png': [ihdr(4, 3), chunk('iCCP', Buffer.concat([Buffer.from('Test profile\0\0'), zlib.deflateSync(icc)])), idat(4, 3), iend],
  'phys-time.png': [ihdr(4, 3), chunk('pHYs', Buffer.from([0, 0, 0x0b, 0x13, 0, 0, 0x0b, 0x13, 1])), chunk('tIME', Buffer.from([0x07, 0xe8, 5, 6, 7, 8, 9])), chunk('gAMA', Buffer.from([0, 0, 0xb1, 0x8f])), idat(4, 3), iend],
  'apng.png': [ihdr(4, 3), chunk('acTL', Buffer.from([0, 0, 0, 1, 0, 0, 0, 0])), chunk('fcTL', Buffer.concat([Buffer.from([0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 3]), Buffer.alloc(8), Buffer.from([0, 1, 0, 10, 0, 0])])), idat(4, 3), iend],
  'multi-idat.png': [ihdr(4, 3), ...(() => { const c = idat(4, 3); const d = c.subarray(8, c.length - 4); return [chunk('IDAT', d.subarray(0, 5)), chunk('IDAT', d.subarray(5))]; })(), iend],
};
fs.mkdirSync(out, { recursive: true });
for (const [n, parts] of Object.entries(files)) fs.writeFileSync(`${out}/${n}`, Buffer.concat([sig, ...parts]));
console.log(Object.keys(files).length, 'files');
