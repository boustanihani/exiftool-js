#!/bin/bash
# Differential write tests over test images: each operation in tools/write-ops.txt is done by
# Perl ExifTool and by the JS translation, and the output files are compared byte for byte.
# usage: tools/diff-write-all.sh [IMAGE_REGEX [OPS_REGEX]]    Results: build/diffw/summary.txt
cd "$(dirname "$0")/.."
ire=${1:-'\.(jpe?g|tiff?|png|webp|heic)$'}
ore=${2:-.}
dir=${IMGDIR:-upstream/t/images}         # (images are given to write.pl relative to upstream/)
dir=$(cd "$dir" && pwd)
imgs=$(cd "$dir" && find . -type f | sed 's|^\./||' | grep -iE "$ire" | sort)
jobs=build/diffw/jobs.txt; mkdir -p build/diffw; : > $jobs
for img in $imgs; do
  ext=${img##*.}; base=$(echo "${img%.*}" | tr '/ ' '__')
  grep -v '^#' tools/write-ops.txt | grep -E "^($ore)" | while IFS= read -r op; do
    [ -z "$op" ] && continue
    name=${op%%|*}; args=${op#*|}
    args=${args//%IN%/$dir/$img}
    echo "$base-$name.$ext|$dir/$img|$args" >> $jobs
  done
done
run() {
  IFS='|' read -r -a a <<< "$1"
  tools/diff-write.sh "${a[@]}"
}
export -f run
tr '\n' '\0' < $jobs | xargs -0 -P 8 -I{} bash -c 'run "$@"' _ {} > build/diffw/summary.txt 2>&1
echo "SAME $(grep -c "^SAME" build/diffw/summary.txt)  EQUIV $(grep -c "^EQUIV" build/diffw/summary.txt)  DIFF $(grep -c "^DIFF" build/diffw/summary.txt)"
