# exiftool-js: development

exiftool-js is ExifTool 13.59 for the browser (scope: reading and writing JPEG/JFIF, TIFF,
PNG, WebP and HEIC; reading BMP).

The port is not hand-written: `tools/perl2js` translates ExifTool's own Perl source into
JavaScript modules, which run on a small hand-written runtime (`src/runtime`). A new
ExifTool release is ported by re-running the build and the tests.

## Layout

- `tools/perl2js/`: the translator. `lexer.js`, `parser.js` (Perl syntax tree), `analyze.js`
  (global sub information, calling conventions), `codegen.js` (JavaScript generation),
  `build.js` (driver), `patches.js` (two small source patches for `goto` patterns the
  translator does not support).
- `src/runtime/`: the runtime. `perl.js` (Perl semantics: values, contexts, regex, `pos()`,
  packages, `eval`, I/O abstraction), `regex.js` (Perl regex to JavaScript), `sprintf.js`
  (exact C number formatting), `pack.js`, `zlib.js`, `md5.js`, `ext.js` (emulated core and
  CPAN modules), `compile.js` (run-time compiler for code strings only known at run time,
  eg. `${tag;expr}`), `io-node.js` (Node file I/O, tests only).
- `src/api/exiftool.js`, `src/api/exiftool-worker.js`: the public JavaScript API (copied to
  `dist/`). `src/perl/Image/ExifTool/JSAPI.pm`: the Perl glue module behind it (translated
  like ExifTool, and run in Perl by `tools/pl/api-ref.pl` for `tools/api-diff.mjs`).
- `src/demo/demo.html`, `src/demo/sample.jpg`: the demo page (page body only) and its
  sample image.
- `tools/build-dist.mjs`: builds `dist/` (translation, runtime, translator for the run-time
  compiler, module manifest, minification, license headers) and `docs/` (GitHub Pages:
  a copy of `dist/` plus the demo page as `index.html`).
- `tools/pl/dump.pl`, `tools/pl/write.pl`: scripts run both by Perl and by the translation
  for differential testing (`write.pl` documents its argument syntax at the top).
- `tools/write-ops.txt`: the write operations of the comparison matrix.
- `tools/gen/mkpng.mjs`, `tools/gen/mktiff.mjs`, `tools/gen/mkwebp.py` (needs Pillow):
  generate the synthetic PNG/TIFF/WebP test variants.
- `tools/api-diff.mjs`, `tools/browser-test.mjs` (+ `test/browser-test.html`): API tests
  against Perl and in headless Chromium. `tools/perf.mjs FILE`: read/write timing.
- `dist/`, `docs/`: build output, committed so the package and the demo can be used
  without building.
- Not in the repository (see `.gitignore`): `upstream/` (ExifTool source), `build/`
  (translation used by the tests), `node_modules/`.

## Setup

```sh
git clone https://github.com/boustanihani/exiftool-js && cd exiftool-js
git clone https://github.com/exiftool/exiftool upstream
git -C upstream checkout 2200871d9cef988051d2a99d67df3bda6cbb30a8   # "Update to 13.59"
npm install                           # esbuild (minifier), playwright (browser tests)
```

Requires Node 18 or later (tested with 22), and Perl for the comparison tests.

## Build

```sh
npm run build          # = node tools/build-dist.mjs --minify: dist/ and docs/
npm run translate      # translation for the tests (build/), incl. ExifTool's t/ scripts
```

Commit `dist/` and `docs/` after building.

## Publishing the demo (GitHub Pages)

In the repository settings: **Pages → Build and deployment → Source: Deploy from a
branch → Branch: `main`, folder: `/docs` → Save**. The site appears at
https://boustanihani.github.io/exiftool-js/ after a minute. `docs/.nojekyll` makes GitHub
serve the files as they are.

## Tests

```sh
npm test                              # = bash tools/run-all.sh: ExifTool test suite -> build/test-results.txt
node tools/run-t.mjs Writer           # one test script
tools/diff-all.sh $(cd upstream && ls t/images/*.jpg)    # read comparison -> build/diff/
DUMP_OPTS="-opt PrintConv=0" tools/diff-all.sh FILES...   # read comparison with options
tools/diff-write-all.sh               # write matrix on upstream/t/images -> build/diffw/summary.txt
IMGDIR=../synth tools/diff-write-all.sh '\.(png|tif)$'  # write matrix on another folder
JS_MEM=1 tools/diff-write-all.sh      # same, with the JS side reading/writing in memory
tools/diff-write.sh NAME.jpg t/images/Canon.jpg "XMP:Title=x"   # one write comparison
node tools/api-diff.mjs DIR...        # API (dist/) vs Perl -> build/apidiff/summary.txt
node tools/browser-test.mjs DIR...    # API in headless Chromium vs Node
```

Results: SAME (byte-identical), EQUIV (bytes differ, tags identical), DIFF.
`PLDEBUG=1` prints JS errors caught by Perl `eval`.

Test corpora used for the results below (optional):

```sh
git clone --depth 1 https://github.com/ianare/exif-samples ../samples/exif-samples
git clone --depth 1 https://github.com/webmproject/libwebp-test-data ../samples/libwebp-test-data
git clone --depth 1 https://github.com/nokiatech/heif_conformance ../samples/heif_conformance
node tools/gen/mkpng.mjs ../synth && node tools/gen/mktiff.mjs ../synth && python3 tools/gen/mkwebp.py ../synth
```

## Test results (ExifTool 13.59)

- ExifTool's own test suite (`t/*.t`, run through the translation): **602 of 603 tests
  pass**. The only failure is DjVu (out of scope; needs Perl's `use integer` arithmetic).
- Reading, side by side with Perl ExifTool: **387 files** (ExifTool's in-scope test images;
  104 camera files from exif-samples; 131 WebP files from libwebp-test-data; 63 HEIC files
  from heif_conformance; 5 phone HEIC/HEIF files; 27 generated PNG/TIFF/WebP variants), each
  with 4 option sets (default, PrintConv=0, Unknown=2+Struct=1,
  Composite=0+Lang=de+Charset=Latin): identical except Google.jpg (64-bit integers above
  2^53) and one PrintConv=0 value in Canon1DmkIII.jpg (last digit of an `exp()` result:
  JavaScript's Math.exp differs from glibc by 1 ulp).
- Writing, side by side with Perl ExifTool (JavaScript side entirely in memory, as in the
  browser):
  - JPEG/TIFF/PNG: 8,802 operations (54 kinds of edits on 168 files), all byte-identical
    except 96 PNG writes with IPTC, where only the zlib-compressed chunk bytes differ (the
    tags read back identically).
  - HEIC/WebP: 7,696 operations (37 kinds of edits on 208 files), **all byte-identical**.
- API (`tools/api-diff.mjs`): 7,741 reads and writes in one session on the 387 files,
  compared with the same operations in Perl (JSAPI.pm): identical except the two known
  limitations.
- Browser (`tools/browser-test.mjs`): 1,088 API calls in headless Chromium (including the
  Web Worker) identical to Node.
- Speed after warm-up is similar to Perl (eg. Canon.jpg: read ~10 ms, write ~6-10 ms); the
  first call of a session takes ~100-250 ms (JIT warm-up).

## Known limitations

- Integers above 2^53 are not exact (affects some Google HDR+ maker note values).
- `use integer` (only in BZZ.pm, DjVu) is not emulated.
- zlib deflate output is valid but not byte-identical to zlib (PNG compressed chunks).
- exp/log/pow/trig results can differ from the C library in the last bit (rarely visible
  in the 15th significant digit of a computed value).
- POSIX::strptime / Time::Piece are not emulated (DateFormat option when *writing*).

## Possible next steps

- Emulate `use integer` (DjVu) and 64-bit integers (BigInt for int64 values).
- strptime for the DateFormat option when writing.
- A byte-exact deflate (zlib's algorithm) if identical PNG chunk bytes matter.
- Upstream: the two `goto` patterns in Geotag.pm (`tools/perl2js/patches.js`) are the only
  source changes the translation needs.
