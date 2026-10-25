#!/bin/bash
# Compare tag extraction between Perl ExifTool and the JS port for the given files
# usage: tools/diff-read.sh [-opt K=V] file...   (paths relative to upstream/)
cd "$(dirname "$0")/.."
D=build/diff; mkdir -p $D
(cd upstream && perl -Ilib ../tools/pl/dump.pl "$@") > $D/perl.txt 2>&1
node tools/run-pl.mjs tools/dump.pl "$@" > $D/js.txt 2>&1
diff $D/perl.txt $D/js.txt > $D/diff.txt
echo "perl lines: $(wc -l < $D/perl.txt)  js lines: $(wc -l < $D/js.txt)  diff lines: $(grep -c '^[<>]' $D/diff.txt)"
