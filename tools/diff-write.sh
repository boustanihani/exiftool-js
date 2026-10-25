#!/bin/bash
# Differential write test: run tools/pl/write.pl with Perl and with the JS translation and
# compare the output files byte for byte.  Prints SAME, EQUIV (bytes differ but Perl ExifTool
# reads identical tags, eg. different zlib compression in PNG) or DIFF.
# usage: tools/diff-write.sh NAME.EXT IN [write.pl args...]   (IN relative to upstream/, or -)
cd "$(dirname "$0")/.."
name=$1; in=$2; shift 2
d=build/diffw; mkdir -p $d/perl $d/js
rm -f $d/perl/$name $d/js/$name
( cd upstream && perl -Ilib ../tools/pl/write.pl "$in" ../$d/perl/$name "$@" ) > $d/perl/$name.log 2>&1
( WRITE_MEM=$JS_MEM node tools/run-pl.mjs tools/write.pl "$in" ../$d/js/$name "$@" ) > $d/js/$name.log 2>&1
if cmp -s $d/perl/$name.log $d/js/$name.log; then
  if cmp -s $d/perl/$name $d/js/$name; then echo "SAME $name"; exit; fi
  # (no output file from either, eg. because the write failed with the same error)
  if [ ! -e $d/perl/$name ] && [ ! -e $d/js/$name ]; then echo "SAME $name"; exit; fi
fi
if [ -f $d/perl/$name ] && [ -f $d/js/$name ] && cmp -s $d/perl/$name.log $d/js/$name.log; then
  x="-x FileName -x Directory -x FileModifyDate -x FileAccessDate -x FileInodeChangeDate -x FileSize"
  a=$(cd upstream && perl -Ilib exiftool -a -G1 -s $x ../$d/perl/$name 2>&1)
  b=$(cd upstream && perl -Ilib exiftool -a -G1 -s $x ../$d/js/$name 2>&1)
  if [ "$a" == "$b" ]; then echo "EQUIV $name"; exit; fi
fi
echo "DIFF $name"; diff $d/perl/$name.log $d/js/$name.log | head -5; cmp $d/perl/$name $d/js/$name 2>&1 | head -3
