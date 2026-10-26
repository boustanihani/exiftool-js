# exiftool-js

> **Proof of concept – looking for a maintainer.** exiftool-js was created by Hani
> Boustani with Claude Opus (Anthropic) to show that ExifTool can run entirely in the
> browser. It passes ExifTool's own test suite and large side-by-side comparisons with Perl
> ExifTool, but it is not yet proven in production.
>
> **I am not able to maintain this repository.** If you would like to take over the
> project and continue the work, please contact me at
> [boustanihani@gmail.com](mailto:boustanihani@gmail.com). I'll gladly hand it over.
>
> exiftool-js is an independent project, not affiliated with ExifTool. Please don't send
> questions or bug reports about it to the ExifTool author or forum.

[ExifTool](https://exiftool.org) by Phil Harvey, translated to JavaScript so it runs
entirely in the browser: read and write metadata of **JPEG, TIFF, PNG, WebP and HEIC**
images (and read BMP), including EXIF, XMP, IPTC, ICC profiles, GPS and manufacturer
maker notes. No server, no WebAssembly, no native code.

**Live demo: [Metadata Editor](https://boustanihani.github.io/exiftool-js/)**

This is not a re-implementation. A Perl-to-JavaScript translator (`tools/perl2js`)
converts ExifTool's own Perl source (version **13.59**) into JavaScript modules that run on
a small runtime emulating Perl. Results are checked against the original ExifTool (see
[Testing](#testing)).

## Repository

| folder | |
|---|---|
| `dist/` | the browser package: copy it to your site (or load it from a CDN, see below) |
| `docs/` | the demo site, published with GitHub Pages: the demo page plus a copy of `dist/` |
| `src/` | runtime (`src/runtime`), public API (`src/api`), demo page (`src/demo`), Perl glue module (`src/perl`) |
| `tools/` | the Perl-to-JavaScript translator (`tools/perl2js`), build and test tools |
| `test/` | test runners |

[DEVELOPMENT.md](DEVELOPMENT.md) explains how to rebuild and test everything.

## Quick start

Copy the `dist/` folder to any static host (S3/CloudFront, nginx, GitHub Pages, ...), then:

```html
<input type="file" id="file">
<script type="module">
  import { ExifTool } from './dist/exiftool.js';
  const et = await ExifTool.create();

  document.getElementById('file').onchange = async (e) => {
    const file = e.target.files[0];

    // read
    const { tags } = await et.read(file);
    console.log(tags['IFD0:Make'], tags['XMP-dc:Title']);

    // write: returns the new file as a Uint8Array
    const { data, warnings } = await et.write(file, {
      tags: { 'XMP-dc:Title': 'A new title', 'IPTC:Keywords': ['berlin', 'river'] },
    });
    const url = URL.createObjectURL(new Blob([data], { type: file.type }));
  };
</script>
```

The files must be served over HTTP(S) (ES modules don't load from `file://`), with a
JavaScript MIME type for `.js` files (`text/javascript` or `application/javascript`;
`aws s3 sync` sets this from the file extension).

Without hosting the files yourself, you can also load them from the jsDelivr CDN, which
serves this repository (pin a release tag instead of `@main` for production use):

```js
import { ExifTool } from 'https://cdn.jsdelivr.net/gh/boustanihani/exiftool-js@main/dist/exiftool.js';
```

The other modules are loaded from the same place on demand; `createWorker()` works from a
CDN too.

## Demo

The [Metadata Editor](https://boustanihani.github.io/exiftool-js/) is built on this API:
open an image (or use the bundled sample), browse all tags by group, edit common fields
(title, description, keywords, creator, copyright, date taken, GPS) or any tag by name,
strip metadata, see a before/after diff of every changed tag, and save the edited file or
the tags as JSON. Everything runs in the page; files are not uploaded anywhere.

Its source is `src/demo/demo.html` (the page body). `node tools/build-dist.mjs --minify`
turns it into `docs/index.html`, next to a copy of the library.

## API

All values are plain JavaScript objects, arrays, strings, numbers and `Uint8Array`s.

### `await ExifTool.create(options?)`

Loads the core modules and returns an instance. Further modules (eg. Canon or Nikon maker
notes) are loaded automatically the first time a file needs them.

| option | |
|---|---|
| `preload` | `'core'` (default), `'all'` (everything except translations), or a list of extra modules to load up front, eg. `['Canon', 'Nikon', 'Sony']` |
| `compiler` | `true` to load the run-time code compiler up front (otherwise loaded when needed, see [Notes](#notes)) |

### `await et.read(input, params?)`

`input`: `File`, `Blob`, `Uint8Array`, `ArrayBuffer` or another typed array.

| param | |
|---|---|
| `tags` | tags to extract, as for exiftool: `['EXIF:all', 'XMP:Title', '-ThumbnailImage']`. Default: all |
| `options` | ExifTool options, eg. `{ PrintConv: 0 }` (raw values, like `exiftool -n`), `{ Struct: 1 }`, `{ Lang: 'de' }`, `{ Unknown: 1 }`, `{ Composite: 0 }`. See the [ExifTool options](https://exiftool.org/ExifTool.html#Options). `List: 1` is the default (lists are returned as arrays) |
| `groupNames` | group family used in the keys: `1` (default, eg. `IFD0:Make`, `XMP-dc:Title`), `0` (`EXIF:Make`, `XMP:Title`), `2` (`Camera:Make`), `'0:1'` (`EXIF:IFD0:Make`), or `false` (no group: `Make`, duplicates as `Make (1)`) |
| `numbers` | convert numeric strings to numbers like `exiftool -j` does (default `true`) |
| `binary` | return binary data (thumbnails, previews, ...) as `Uint8Array` (default `false`: a placeholder string) |

Returns:

```js
{
  tags: { 'File:FileType': 'JPEG', 'IFD0:Make': 'Canon', 'IPTC:Keywords': ['a', 'b'], ... },
  entries: [ { key: 'IFD0:Make', tag: 'Make', groups: { 0: 'EXIF', 1: 'IFD0', 2: 'Camera' }, value: 'Canon' }, ... ],
  warnings: [ ... ],      // ExifTool warnings
  error: undefined        // or an error message (eg. 'File format error')
}
```

Tags appear in file order. Same-named tags in the same group get keys like `IFD0:Make (1)`.

### `await et.write(input, params)`

`input`: as for `read`, or `null` to create a new file (with `fileType`, eg. an XMP sidecar).

| param | |
|---|---|
| `tags` | new values: `{ 'XMP:Title': 'x', 'GPSLatitude': 52.52, 'IPTC:Keywords': ['a', 'b'] }`. `null` deletes: `{ 'EXIF:Artist': null }`, `{ 'XMP:all': null }`, `{ all: null }` |
| `ops` | further operations, done after `tags`, in order (see below) |
| `options` | ExifTool options, eg. `{ IgnoreMinorErrors: 1 }`, `{ Compact: 'Shorthand' }` |
| `fileType` | file type to create when `input` is `null` (eg. `'XMP'`) |

Operations in `ops`:

```js
{ tag: 'XMP:Subject', value: 'extra', add: true }        // add to a list
{ tag: 'XMP:Subject', value: 'old', remove: true }       // remove from a list
{ tag: 'AllDates', value: '0:0:0 1:0:0', shift: +1 }     // shift date/time (shift: -1 to go back)
{ tag: 'Orientation', value: 6, numeric: true }          // raw value (no print conversion)
{ tag: 'Title', value: 'x', group: 'XMP-dc' }            // same as tag 'XMP-dc:Title'
{ tag: 'IPTC:CodedCharacterSet', value: 'UTF8', protected: true }  // protected tag
{ tag: 'XMP:Title', value: 'x', editOnly: true }         // only edit existing tags
{ tag: 'XMP:Title', value: 'x', options: { ... } }       // other ExifTool SetNewValue options
{ copyFrom: otherFile }                                  // copy all tags from another file
{ copyFrom: otherFile, tags: ['EXIF:all>XMP:all', '-GPS:all'] }   // with exiftool -tagsFromFile syntax
```

Values: strings (UTF-8 is handled for you), numbers, arrays (list tags), objects
(XMP structures, eg. `{ 'XMP-iptcExt:LocationShown': [{ City: 'Berlin', CountryName: 'Germany' }] }`),
and `Uint8Array` for binary tags (`ThumbnailImage`, `ICC_Profile`, ...).

Returns:

```js
{
  data: Uint8Array,       // the new file (null if writing failed)
  changed: true,          // false if nothing needed to be changed
  warnings: [ ... ],      // eg. "Tag 'Bogus' is not defined" and writing warnings
  error: undefined        // or an error message
}
```

### `await et.listTags({ group?, writable? })`

Tag names, all or only writable ones, optionally for one group (eg. `'XMP-dc'`, `'EXIF'`).

### `await ExifTool.createWorker(options?)`

Same as `create`, but runs ExifTool in a Web Worker (`dist/exiftool-worker.js`). The
returned object has the same `read`, `write` and `listTags` methods and `version`, plus
`terminate()`.

### `ExifTool.version` / `et.version`

The translated ExifTool version (`'13.59'`).

## Tag names

Tag and group names are ExifTool's: see the
[ExifTool tag name documentation](https://exiftool.org/TagNames/index.html).
Writing behaves exactly like ExifTool (which groups are written when no group is given,
how lists and structures are handled, etc.), so the
[ExifTool documentation](https://exiftool.org/exiftool_pod.html) applies.

## Notes

- **Size and loading.** `dist/` contains all 241 translated ExifTool modules (7.7 MB
  minified, 2.1 MB gzipped, plus 1.9 MB of optional tag-name translations). A page loads
  only the runtime and core modules (2.3 MB, 0.6 MB gzipped) and then the modules a file
  needs, typically the maker notes of the camera brand (eg. Canon: 0.3 MB, 55 kB gzipped).
  Use `preload` to load these up front. Enable gzip or brotli compression on the server.
- **Speed.** After the first file, reading or writing a typical camera JPEG takes about
  10-20 ms. The first call of a session is slower (100-300 ms) while the browser compiles
  the code.
- **Web Worker.** Calls run synchronously on the calling thread (between module loads).
  To keep the page responsive with big files or batches, use the worker version, which has
  the same methods:
  ```js
  const et = await ExifTool.createWorker();     // instead of ExifTool.create()
  const { tags } = await et.read(file);
  et.terminate();                                // when done
  ```
- **Run-time compiler.** A few features evaluate Perl code that only exists at run time
  (eg. advanced formatting expressions like `${model;tr/ /_/}` in tag copying, or the
  `Filter` option). exiftool-js translates such code when needed with the bundled
  translator (`dist/perl2js/`), using `new Function`; this requires a Content Security Policy
  that allows `'unsafe-eval'` (only for these features).
- **Files on disk.** There is no file system: features that read extra files (eg. the
  `Geolocation` database, config files) are not available.

## Limitations

- Integers above 2^53 lose precision (some 64-bit values in Google HDR+ maker notes).
- Compressed PNG text chunks written by exiftool-js are valid, but their compressed bytes
  differ from zlib's.
- Math functions (`exp`, `log`, ...) may differ from the C library in the last bit, which can
  change the 15th significant digit of a few computed raw values.
- Writing with a `DateFormat` option (POSIX::strptime) is not supported.
- DjVu files are not supported (Perl's `use integer` arithmetic is not emulated); DjVu is
  outside the scope of this port anyway.

## Testing

The port is tested against Perl ExifTool 13.59:

- ExifTool's own test suite (`t/*.t`, 603 tests) runs through the translation:
  602 pass (the exception is the DjVu test).
- Reading, compared tag by tag with Perl ExifTool, on 387 files (ExifTool's test images,
  104 camera images from [exif-samples](https://github.com/ianare/exif-samples), 131
  WebP files from [libwebp-test-data](https://github.com/webmproject/libwebp-test-data),
  63 HEIC files from [heif_conformance](https://github.com/nokiatech/heif_conformance),
  phone photos and generated variants), with several option sets: identical output
  except the limitations above.
- Writing, compared byte for byte with Perl ExifTool: 16,498 write operations (EXIF, XMP,
  IPTC, GPS, dates and time shifts, maker notes, thumbnails, ICC profiles, XMP structures,
  multi-language text, group deletes, copying with redirection, ...) on 376 files:
  byte-identical except PNG compressed chunks (see above).
- The public API itself (`tools/api-diff.mjs`): one session with 7,741 reads and writes
  through the API on the 387 files, compared with the same operations in Perl: identical
  except the limitations above.
- In the browser (`tools/browser-test.mjs`, headless Chromium): 1,088 API calls, including
  the Web Worker version, give the same results as in Node.
- The demo page: opened, edited and saved in headless Chromium (JPEG and HEIC, desktop and
  phone width), and the saved files read back with the new values.

How to run the tests: see [DEVELOPMENT.md](DEVELOPMENT.md). The comparisons need Perl (any
recent version) to run the original ExifTool.

## Updating to a new ExifTool version

1. Replace `upstream/` with the new ExifTool source
   (`git clone https://github.com/exiftool/exiftool upstream`).
2. `node tools/build-dist.mjs --minify` translates it and builds `dist/` and `docs/`.
3. Run the tests. The translator reports constructs it can't handle;
   `tools/perl2js/patches.js` holds the two small source patches that version 13.59 needed.

## How it works

- `tools/perl2js/` parses Perl into a syntax tree and generates JavaScript, with a global
  analysis of subs (calling conventions, list/scalar context, arguments modified in place).
- `src/runtime/perl.js` emulates Perl semantics: scalars, references, list/scalar
  context, `local`, `pos()` and regex captures, `sprintf` with exact C formatting, `pack`/
  `unpack`, packages and method dispatch, `AUTOLOAD`, `eval` of code strings, in-memory
  file handles.
- `src/runtime/ext.js` emulates the Perl modules ExifTool uses (zlib, MD5, Time::Local,
  POSIX, Encode, ...).
- `src/perl/Image/ExifTool/JSAPI.pm` is a small Perl module behind the JS API (translated
  like the rest, and testable in Perl).

## License

exiftool-js uses the same license as ExifTool. It is free software; you can redistribute
it and/or modify it under the same terms as Perl itself (either the Perl Artistic License
or GPL). See [LICENSE](LICENSE).

exiftool-js is Copyright 2026, Hani Boustani. The translated modules (`dist/modules/`,
`docs/modules/`) are generated from ExifTool, Copyright 2003-2026, Phil Harvey.
