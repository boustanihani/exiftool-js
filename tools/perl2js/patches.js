// Source patches applied to the Perl code before translation, for the few constructs the
// translator does not support.  Each patch is [search, replace, expectedCount]; the build fails
// if the search string is not found exactly expectedCount times (so a changed upstream file is
// noticed instead of silently mistranslated).

const doneFix = '{ $isDate = 1; $$points{$time} = $fix; push @fixTimes, $time; $fix = { }; ++$numPoints; next; }';

export const PATCHES = {
  // goto into the code of a sibling if/elsif branch: inline a copy of the target code instead
  'Image/ExifTool/Geotag.pm': [
    ['goto DoneFix;', doneFix, 2],
    ['goto DoneFix if $time and $$fix{lat} and $$fix{lon};', `if ($time and $$fix{lat} and $$fix{lon}) ${doneFix}`, 2],
  ],
};

export function applyPatches(file, src) {
  const list = PATCHES[file];
  if (!list) return src;
  for (const [from, to, count] of list) {
    const n = src.split(from).length - 1;
    if (n !== count) throw new Error(`${file}: patch expected ${count} occurrence(s) of ${JSON.stringify(from)}, found ${n}`);
    src = src.split(from).join(to);
  }
  return src;
}
