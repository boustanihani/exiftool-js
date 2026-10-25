#!/bin/bash
# Compare JS vs Perl tag extraction for many files (paths relative to upstream/ or absolute).
# DUMP_OPTS='-opt K=V ...' passes ExifTool options. Summary in build/diff/summary.txt (FileAccessDate is ignored since reading changes it)
cd "$(dirname "$0")/.."
D=build/diff; mkdir -p $D/files
one() {
  f=$1; b=$(echo "$f" | sed 's|^t/images/||; s|^/.*/samples/||' | tr '/' '_')
  D=build/diff
  (cd upstream && perl -Ilib ../tools/pl/dump.pl $DUMP_OPTS "$f") 2>&1 | grep -v FileAccessDate > $D/files/$b.perl
  timeout 300 node tools/run-pl.mjs tools/dump.pl $DUMP_OPTS "$f" 2>&1 | grep -v FileAccessDate > $D/files/$b.js
  diff $D/files/$b.perl $D/files/$b.js > $D/files/$b.diff
  printf "%-40s perl=%-5s js=%-5s diff=%s\n" "$b" "$(wc -l < $D/files/$b.perl)" "$(wc -l < $D/files/$b.js)" "$(grep -c '^[<>]' $D/files/$b.diff)"
}
export -f one
printf '%s\0' "$@" | xargs -0 -P 8 -I{} bash -c 'one "$@"' _ {} | sort > $D/summary.txt
echo "files $(wc -l < $D/summary.txt)  identical $(grep -c 'diff=0$' $D/summary.txt)"
grep -v 'diff=0$' $D/summary.txt
