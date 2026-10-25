#!/bin/bash
# Run all ExifTool test scripts through the JS translation, one process per script.
# usage: tools/run-all.sh [names...]   -> writes results to build/test-results.txt
cd "$(dirname "$0")/.."
names="$@"
if [ -z "$names" ]; then names=$(ls upstream/t/*.t | xargs -n1 basename | sed 's/\.t$//'); fi
out=build/test-results.txt
: > $out; mkdir -p build/logs
tot=0; pass=0
for n in $names; do
  res=$(timeout 300 node tools/run-t.mjs $n 2>&1)
  plan=$(echo "$res" | grep -m1 -oE '^1\.\.[0-9]+' | cut -d. -f3)
  ok=$(echo "$res" | grep -cE '^ok [0-9]+')
  nok=$(echo "$res" | grep -cE '^not ok [0-9]+')
  died=$(echo "$res" | grep -m1 -E '^# .*died' | cut -c1-150)
  [ -z "$plan" ] && plan=0
  tot=$((tot+plan)); pass=$((pass+ok))
  printf "%-14s %3s/%-3s %s\n" "$n" "$ok" "$plan" "$died" >> $out
  echo "$res" > build/logs/$n.txt 2>/dev/null
done
echo "TOTAL $pass/$tot" >> $out
cat $out
