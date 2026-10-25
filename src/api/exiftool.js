// exiftool-js: ExifTool for the browser (JavaScript translation of ExifTool by Phil Harvey)
//
//   import { ExifTool } from './exiftool.js';
//   const et = await ExifTool.create();
//   const { tags } = await et.read(file);                       // File, Blob, Uint8Array, ArrayBuffer
//   const { data } = await et.write(file, { tags: { 'XMP:Title': 'New title' } });
//
// See README.md for the full API.  This file is copied to dist/ by tools/build-dist.mjs.
import { PL, H, Box, LvBox } from './runtime/perl.js';
import './runtime/ext.js';

const base = new URL('.', import.meta.url);
let manifest = null;          // Perl module path -> [JS file, size]
const loaded = new Set();     // Perl module paths that have been imported
let compiler = null;          // promise for the run-time compiler
let JSAPI = null;

// ---------------------------------------------------------------------------- module loading
async function loadManifest() {
  if (!manifest) manifest = (await import(new URL('modules/manifest.js', base).href)).default;
  return manifest;
}
async function loadModule(perlPath) {
  if (loaded.has(perlPath)) return;
  const m = manifest[perlPath];
  if (!m) return;
  try {
    await import(new URL('modules/' + m[0], base).href);
  } catch (e) {
    // (a module that can't be loaded, eg. left out of a trimmed deployment, behaves as if
    // it wasn't installed)
    console.warn(`exiftool-js: could not load ${m[0]}: ${e && e.message}`);
  }
  loaded.add(perlPath);
}
// modules needed for most reading and writing of the supported formats
const CORE = ['Image/ExifTool.pm', 'Image/ExifTool/JSAPI.pm', 'Image/ExifTool/Exif.pm', 'Image/ExifTool/GPS.pm',
  'Image/ExifTool/XMP.pm', 'Image/ExifTool/IPTC.pm', 'Image/ExifTool/Photoshop.pm', 'Image/ExifTool/ICC_Profile.pm',
  'Image/ExifTool/JPEG.pm', 'Image/ExifTool/PNG.pm', 'Image/ExifTool/RIFF.pm', 'Image/ExifTool/QuickTime.pm',
  'Image/ExifTool/BMP.pm', 'Image/ExifTool/MakerNotes.pm', 'Image/ExifTool/Fixup.pm', 'Image/ExifTool/XMPStruct.pl',
  'Image/ExifTool/Writer.pl', 'Image/ExifTool/WriteExif.pl', 'Image/ExifTool/WriteXMP.pl', 'Image/ExifTool/WriteIPTC.pl',
  'Image/ExifTool/WritePhotoshop.pl', 'Image/ExifTool/WritePNG.pl', 'Image/ExifTool/WriteRIFF.pl',
  'Image/ExifTool/WriteQuickTime.pl', 'Image/ExifTool/TagLookup.pm', 'Image/ExifTool/Shift.pl', 'Image/ExifTool/FlashPix.pm',
  'Image/ExifTool/MPF.pm', 'File/RandomAccess.pm'];

async function loadCompiler() {
  if (!compiler) {
    compiler = (async () => {
      const [{ installCompiler }, globals] = await Promise.all([
        import(new URL('runtime/compile.js', base).href),
        import(new URL('modules/globals.js', base).href),
      ]);
      installCompiler(globals.default);
    })();
  }
  return compiler;
}

// Run a synchronous ExifTool operation.  Modules are loaded on demand: if the operation
// needed a module (or the run-time compiler) that wasn't loaded yet, it is loaded and the
// operation is repeated, so the result is the same as with everything preloaded.
const missing = new Set();
PL.onMissingModule = (p) => missing.add(p);
async function run(fn) {
  for (let round = 0; ; ++round) {
    missing.clear();
    PL.missingCode.clear();
    const output = [];
    PL.captureOutput = (stream, s) => output.push(s);
    let result, error;
    try {
      result = fn();
    } catch (e) {
      error = e;
    } finally {
      PL.captureOutput = null;
    }
    const need = [...missing].filter((p) => manifest[p] && !loaded.has(p));
    const needCompiler = PL.missingCode.size > 0 && !PL.compileFallback;
    if ((!need.length && !needCompiler) || round >= 20) {
      if (error) throw error instanceof PL.PerlDie ? new Error('exiftool-js: ' + PL.str(error.value).trim()) : error;
      return result;
    }
    await Promise.all(need.map(loadModule));
    if (needCompiler) await loadCompiler();
  }
}

// ---------------------------------------------------------------------------- value conversion
// Perl strings are byte strings (JS strings of char codes 0-255)
function bytesToBin(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return s;
}
function binToBytes(s) {
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; ++i) u8[i] = s.charCodeAt(i);
  return u8;
}
const utf8enc = new TextEncoder();
function encodeText(s) {
  // JS string -> UTF-8 byte string
  return /^[\x00-\x7f]*$/.test(s) ? s : bytesToBin(utf8enc.encode(s));
}
// ExifTool Charset option -> TextDecoder label
const CHARSETS = {
  utf8: 'utf-8', latin: 'windows-1252', latin2: 'windows-1250', cyrillic: 'windows-1251', greek: 'windows-1253',
  turkish: 'windows-1254', hebrew: 'windows-1255', arabic: 'windows-1256', baltic: 'windows-1257', vietnam: 'windows-1258',
  thai: 'windows-874', macroman: 'macintosh', maccyrillic: 'x-mac-cyrillic', shiftjis: 'shift_jis', mackorean: 'euc-kr',
};
function makeDecoder(charset) {
  const label = CHARSETS[String(charset || 'UTF8').toLowerCase().replace(/[^a-z0-9]/g, '')] || 'utf-8';
  try { return new TextDecoder(label); } catch (e) { return new TextDecoder('utf-8'); }
}
async function toBin(input) {
  if (input === null || input === undefined) return undefined;
  if (typeof input === 'string') throw new TypeError('exiftool-js: file data must be a Uint8Array, ArrayBuffer or Blob');
  if (input instanceof Uint8Array) return bytesToBin(input);
  if (input instanceof ArrayBuffer) return bytesToBin(new Uint8Array(input));
  if (ArrayBuffer.isView(input)) return bytesToBin(new Uint8Array(input.buffer, input.byteOffset, input.byteLength));
  if (typeof Blob !== 'undefined' && input instanceof Blob) return bytesToBin(new Uint8Array(await input.arrayBuffer()));
  throw new TypeError('exiftool-js: unsupported input type');
}
// JS value -> Perl value (for new tag values and options)
function toPerl(v) {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') return encodeText(v);
  if (typeof v === 'number' || typeof v === 'bigint') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof Uint8Array || v instanceof ArrayBuffer || ArrayBuffer.isView(v)) {
    return bytesToBin(v instanceof Uint8Array ? v : v instanceof ArrayBuffer ? new Uint8Array(v) : new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
  }
  if (Array.isArray(v)) return v.map(toPerl);
  if (v instanceof Date) return v.toISOString().replace(/^(\d+)-(\d+)-(\d+)T([\d:]+)(\.\d+)?Z$/, '$1:$2:$3 $4Z');
  if (typeof v === 'object') {
    const h = H({});
    for (const k of Object.keys(v)) h[encodeText(k)] = toPerl(v[k]);
    return h;
  }
  return String(v);
}
// number format used by the exiftool application for JSON output
const NUMBER = /^-?(\d|[1-9]\d{1,14})(\.\d{1,16})?(e[-+]?\d{1,3})?$/i;
// Perl value -> JS value (extracted tag values)
function fromPerl(v, cv) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'number') {
    // (formatted as Perl would print it, ie. 15 significant digits, like exiftool's output)
    const s = PL.str(v);
    return cv.numbers && NUMBER.test(s) ? Number(s) : s;
  }
  if (typeof v === 'string') {
    if (cv.numbers && NUMBER.test(v)) return Number(v);
    return /^[\x00-\x7f]*$/.test(v) ? v : /[^\x00-\xff]/.test(v) ? v : cv.decoder.decode(binToBytes(v));
  }
  if (typeof v === 'bigint') return v;
  if (Array.isArray(v)) return v.map((x) => fromPerl(x, cv));
  if (v instanceof Box || v instanceof LvBox) return fromPerl(v.v, cv);
  if (typeof v === 'object') {
    // (binary data is marked by JSAPI::ConvertValue)
    if (v.BinaryLength !== undefined && Object.keys(v).length === 1) return `(Binary data ${v.BinaryLength} bytes, use the binary option to extract)`;
    if (v.Binary !== undefined && Object.keys(v).length === 1) return binToBytes(PL.str(v.Binary));
    const o = {};
    for (const k of Object.keys(v)) o[cv.decoder.decode(binToBytes(k))] = fromPerl(v[k], cv);
    return o;
  }
  return String(v);
}
const str = (v, cv) => (v === undefined || v === null ? undefined : fromPerl(PL.str(v), Object.assign({}, cv, { numbers: false })));

// SetNewValue options from the friendly operation properties
function setOptions(op) {
  const o = Object.assign({}, op.options || {});
  if (op.add) o.AddValue = 1;
  if (op.remove) o.DelValue = 1;
  if (op.shift) o.Shift = op.shift < 0 ? -1 : 1;
  if (op.group !== undefined) o.Group = op.group;
  if (op.protected) o.Protected = 1;
  if (op.editOnly) o.EditOnly = 1;
  if (op.replace) o.Replace = 1;
  if (op.numeric) o.Type = 'ValueConv';
  return toPerl(o);
}
function exifOptions(options) {
  return toPerl(Object.assign({}, options || {}));
}

// ---------------------------------------------------------------------------- public API
export class ExifTool {
  // Create an ExifTool instance.
  // opts.preload: 'core' (default), 'all', or a list of Perl module names to load up front
  //   (eg. ['Canon', 'Nikon'] or 'Image::ExifTool::Canon'); other modules load on demand
  static async create(opts = {}) {
    await loadManifest();
    let list = CORE;
    if (opts.preload === 'all') list = Object.keys(manifest).filter((p) => !p.startsWith('Image/ExifTool/Lang/'));
    else if (Array.isArray(opts.preload)) {
      list = CORE.concat(opts.preload.map((n) => {
        n = String(n).replace(/::/g, '/');
        if (!n.includes('/')) n = 'Image/ExifTool/' + n;
        return /\.p[lm]$/.test(n) ? n : n + '.pm';
      }));
    }
    await Promise.all(list.filter((p) => manifest[p]).map(loadModule));
    if (opts.compiler) await loadCompiler();
    PL.require('Image::ExifTool::JSAPI');
    JSAPI = PL.pkg('Image::ExifTool::JSAPI');
    return new ExifTool();
  }

  // Create an instance that runs in a Web Worker (keeps the page responsive with big
  // files).  It has the same read/write/listTags methods (all async), plus terminate().
  static async createWorker(opts = {}) {
    const url = new URL('exiftool-worker.js', import.meta.url);
    let worker, blobUrl = null;
    if (typeof location !== 'undefined' && url.origin !== location.origin) {
      // exiftool-js loaded from another origin (eg. a CDN): a worker can't be started from
      // there directly, so start it from a same-origin module that imports the worker
      blobUrl = URL.createObjectURL(new Blob([`import ${JSON.stringify(url.href)};\n`], { type: 'text/javascript' }));
      worker = new Worker(blobUrl, { type: 'module' });
    } else {
      worker = new Worker(url, { type: 'module' });
    }
    let next = 0;
    const pending = new Map();
    worker.onmessage = (e) => {
      const { id, result, error } = e.data;
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      if (error !== undefined) p.reject(new Error(error)); else p.resolve(result);
    };
    worker.onerror = (e) => {
      for (const p of pending.values()) p.reject(new Error('exiftool-js worker error: ' + (e.message || e)));
      pending.clear();
    };
    const call = (method, ...args) => new Promise((resolve, reject) => {
      const id = ++next;
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, method, args });
    });
    let version;
    try { ({ version } = await call('create', opts)); }
    catch (e) { worker.terminate(); throw e; }
    finally { if (blobUrl) URL.revokeObjectURL(blobUrl); }
    return {
      version,
      read: (input, params) => call('read', input, params),
      write: (input, params) => call('write', input, params),
      listTags: (params) => call('listTags', params),
      terminate: () => worker.terminate(),
    };
  }

  // version of ExifTool that was translated
  static get version() { return JSAPI ? PL.str(JSAPI.Version()) : undefined; }
  get version() { return ExifTool.version; }

  // Read metadata.
  // input: File, Blob, Uint8Array, ArrayBuffer (or other typed array)
  // params:
  //   tags       - list of tags to extract, as for exiftool (eg. ['EXIF:all', 'XMP:Title',
  //                '-ThumbnailImage']); default: all tags
  //   options    - ExifTool options (eg. { PrintConv: 0, Struct: 1, Lang: 'de' }); the API
  //                defaults to { List: 1 } (lists as arrays)
  //   groupNames - group family used to prefix tag names: 0, 1 (default), 2, '0:1', or
  //                false for no prefix
  //   numbers    - convert numeric strings to numbers like exiftool -j (default true)
  //   binary     - extract binary data (thumbnails, ...) as Uint8Array (default false)
  // returns { tags: { 'IFD0:Make': 'Canon', ... }, entries: [{ key, tag, groups, value }],
  //           warnings: [...], error }
  async read(input, params = {}) {
    const bin = await toBin(input);
    const options = Object.assign({ List: 1 }, params.options || {});
    if (params.binary) options.Binary = 1;
    const cv = { decoder: makeDecoder(options.Charset), numbers: params.numbers !== false };
    const r = await run(() => JSAPI.Read(PL.box(bin), toPerl({ Tags: params.tags || [], Options: options })));
    const fam = params.groupNames === undefined ? '1' : params.groupNames === false || params.groupNames === null ? null : String(params.groupNames);
    const tags = {};
    const entries = [];
    for (const [key, name, g0, g1, g2, value] of r.Tags) {
      const groups = { 0: PL.str(g0), 1: PL.str(g1), 2: PL.str(g2) };
      const v = fromPerl(value, cv);
      const tag = PL.str(name);
      let k = fam === null ? PL.str(key) : fam.split(':').map((f) => groups[f] !== undefined ? groups[f] : '').join(':') + ':' + tag;
      if (k in tags) { let n = 1; while (`${k} (${n})` in tags) ++n; k = `${k} (${n})`; }
      tags[k] = v;
      entries.push({ key: k, tag, groups, value: v });
    }
    return { tags, entries, warnings: r.Warnings.map((w) => str(w, cv)), error: str(r.Error, cv) };
  }

  // Write metadata, returning the new file data.
  // input: File, Blob, Uint8Array, ArrayBuffer, or null to create a new file (params.fileType)
  // params:
  //   tags     - object of new values: { 'XMP:Title': 'x', 'IPTC:Keywords': ['a', 'b'],
  //              'EXIF:Artist': null (delete), 'XMP:all': null (delete group) }
  //   ops      - list of operations done after "tags", in order:
  //              { tag, value, add, remove, shift, group, protected, editOnly, replace,
  //                numeric, options }  (options: other ExifTool SetNewValue options), or
  //              { copyFrom: file data, tags: ['EXIF:all>XMP:all', ...], options }
  //   options  - ExifTool options (eg. { IgnoreMinorErrors: 1 })
  //   fileType - type of file to create when input is null (eg. 'XMP')
  // returns { data: Uint8Array (or null on error), changed: true/false, warnings: [...], error }
  async write(input, params = {}) {
    const bin = await toBin(input);
    const options = Object.assign({}, params.options || {});
    const cv = { decoder: makeDecoder(options.Charset), numbers: false };
    const ops = [];
    for (const [tag, value] of Object.entries(params.tags || {})) ops.push(H({ Tag: encodeText(tag), Value: toPerl(value) }));
    for (const op of params.ops || []) {
      if (op.copyFrom !== undefined) {
        ops.push(H({ CopyFrom: PL.box(await toBin(op.copyFrom)), Tags: toPerl(op.tags || []), Options: op.options ? toPerl(op.options) : undefined }));
      } else {
        ops.push(H({ Tag: encodeText(op.tag), Value: toPerl(op.value), Options: setOptions(op) }));
      }
    }
    const p = H({ Ops: ops, Options: exifOptions(options) });
    if (params.fileType) p.FileType = encodeText(params.fileType);
    const r = await run(() => JSAPI.Write(bin === undefined ? undefined : PL.box(bin), p));
    const result = PL.num(r.Result);
    return {
      data: result ? binToBytes(PL.str(r.Data.v)) : null,
      changed: result === 1,
      warnings: r.Warnings.map((w) => str(w, cv)),
      error: str(r.Error, cv),
    };
  }

  // List tag names (all, or only writable ones), optionally for one group (eg. 'XMP-dc')
  async listTags({ group, writable } = {}) {
    const r = await run(() => JSAPI.ListTags(toPerl({ Group: group, Writable: writable ? 1 : 0 })));
    return r.map((t) => PL.str(t));
  }
}

export default ExifTool;
