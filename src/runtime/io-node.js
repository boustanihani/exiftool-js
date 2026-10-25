// Node.js file system backend for the Perl runtime (used for running ExifTool's test suite).
import fs from 'fs';
import { PL } from './perl.js';

class NodeFile {
  constructor(path, mode) {
    this.path = path;
    this.mode = mode;
    this.pos = 0;
    this.closed = false;
    if (mode === '<' || mode === '+<') {
      this.data = fs.readFileSync(path).toString('latin1');
      this.writable = mode === '+<';
    } else if (mode === '>' || mode === '+>') {
      fs.writeFileSync(path, '');
      this.data = '';
      this.writable = true;
    } else if (mode === '>>') {
      this.data = fs.existsSync(path) ? fs.readFileSync(path).toString('latin1') : '';
      this.pos = this.data.length;
      this.writable = true;
    } else {
      throw new Error(`Unsupported open mode ${mode}`);
    }
    this.dirty = false;
  }
  read(n) {
    const r = this.data.substr(this.pos, n);
    this.pos += r.length;
    return r;
  }
  readline(sep) {
    if (this.pos >= this.data.length) return undefined;
    if (sep === undefined) { const r = this.data.slice(this.pos); this.pos = this.data.length; return r; }
    if (sep === '') {
      // paragraph mode
      const m = /\n\n+/.exec(this.data.slice(this.pos));
      const end = m ? this.pos + m.index + m[0].length : this.data.length;
      const r = this.data.slice(this.pos, end);
      this.pos = end;
      return r;
    }
    const i = this.data.indexOf(sep, this.pos);
    const end = i < 0 ? this.data.length : i + sep.length;
    const r = this.data.slice(this.pos, end);
    this.pos = end;
    return r;
  }
  write(s) {
    if (!this.writable) return false;
    if (this.pos >= this.data.length) this.data += s;
    else this.data = this.data.slice(0, this.pos) + s + this.data.slice(this.pos + s.length);
    this.pos += s.length;
    this.dirty = true;
    return true;
  }
  seek(off, whence) {
    const p = whence === 0 ? off : whence === 1 ? this.pos + off : this.data.length + off;
    if (p < 0) return false;
    this.pos = p;
    return true;
  }
  tell() { return this.pos; }
  eof() { return this.pos >= this.data.length; }
  close() {
    if (this.closed) return true;
    this.closed = true;
    if (this.writable && this.dirty) fs.writeFileSync(this.path, Buffer.from(this.data, 'latin1'));
    return true;
  }
}

function cleanPath(p) {
  p = PL.str(p);
  const z = p.indexOf('\0');
  if (z >= 0) p = p.slice(0, z);
  p = p.trim();
  // Perl file names are byte strings (eg. UTF-8 bytes): pass the exact bytes to fs
  return /[^\x00-\x7f]/.test(p) && !/[^\x00-\xff]/.test(p) ? Buffer.from(p, 'latin1') : p;
}

PL.io.open = (path, mode) => {
  path = cleanPath(path);
  if (mode === '-|' || mode === '|-' || mode === '|') throw new Error('pipes not supported');
  return new NodeFile(path, mode);
};

PL.io.fileTest = (op, path) => {
  path = cleanPath(path);
  let st;
  try { st = op === 'l' ? fs.lstatSync(path) : fs.statSync(path); } catch (e) { return op === 's' || op === 'M' ? undefined : ''; }
  switch (op) {
    case 'e': return 1;
    case 'f': return st.isFile() ? 1 : '';
    case 'd': return st.isDirectory() ? 1 : '';
    case 'l': return st.isSymbolicLink() ? 1 : '';
    case 's': return st.size > 0 ? st.size : '';
    case 'z': return st.size === 0 ? 1 : '';
    case 'r': case 'R': return 1;
    case 'w': case 'W': return 1;
    case 'x': case 'X': return st.mode & 0o111 ? 1 : '';
    case 'M': return (PL.V['^T'] * 1000 - st.mtimeMs) / 86400000;
    case 'A': return (PL.V['^T'] * 1000 - st.atimeMs) / 86400000;
    case 'C': return (PL.V['^T'] * 1000 - st.ctimeMs) / 86400000;
    case 'p': case 'S': case 'b': case 'c': case 'u': case 'g': case 'k': case 't': return '';
    case 'T': case 'B': return 1;
  }
  return '';
};

PL.io.stat = (x) => {
  let st;
  try {
    if (x instanceof PL.FH) {
      if (!x.impl || !x.impl.path) return [];
      st = fs.statSync(x.impl.path);
    } else st = fs.statSync(cleanPath(x));
  } catch (e) { return []; }
  return [st.dev, st.ino, st.mode, st.nlink, st.uid, st.gid, st.rdev, st.size,
    Math.floor(st.atimeMs / 1000), Math.floor(st.mtimeMs / 1000), Math.floor(st.ctimeMs / 1000), st.blksize, st.blocks];
};

PL.io.sys = (name, args) => {
  try {
    switch (name) {
      case 'unlink': {
        let n = 0;
        for (const f of args) { try { fs.unlinkSync(cleanPath(f)); ++n; } catch (e) { /* ignore */ } }
        return n;
      }
      case 'rename': fs.renameSync(cleanPath(args[0]), cleanPath(args[1])); return 1;
      case 'mkdir': fs.mkdirSync(cleanPath(args[0])); return 1;
      case 'rmdir': fs.rmdirSync(cleanPath(args[0])); return 1;
      case 'chmod': { const mode = PL.num(args[0]); for (const f of args.slice(1)) fs.chmodSync(cleanPath(f), mode); return args.length - 1; }
      case 'utime': {
        const [at, mt, ...files] = args;
        for (const f of files) fs.utimesSync(cleanPath(f), at === undefined ? new Date() : PL.num(at), mt === undefined ? new Date() : PL.num(mt));
        return files.length;
      }
    }
  } catch (e) {
    PL.ERRNO = e.message;
    return 0;
  }
  return 0;
};

PL.STDOUT.impl = { write: (s) => { process.stdout.write(Buffer.from(s, 'latin1')); return true; } };
PL.STDERR.impl = { write: (s) => { process.stderr.write(Buffer.from(s, 'latin1')); return true; } };
PL.ENV.TZ = process.env.TZ;
for (const k of Object.keys(process.env)) PL.ENV[k] = process.env[k];
