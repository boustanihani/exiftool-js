# dump export lists of ExifTool modules as JSON
use strict;
my $lib = shift;
unshift @INC, $lib;
my %out;
for my $mod (qw(Image::ExifTool File::RandomAccess Image::ExifTool::XMP Image::ExifTool::TagLookup Image::ExifTool::NikonCustom
                Image::ExifTool::AES Image::ExifTool::BZZ Image::ExifTool::HTML Image::ExifTool::Import)) {
    eval "require $mod" or next;
    no strict 'refs';
    $out{$mod} = { EXPORT => [@{"${mod}::EXPORT"}], EXPORT_OK => [@{"${mod}::EXPORT_OK"}], EXPORT_TAGS => { %{"${mod}::EXPORT_TAGS"} } };
}
# minimal JSON writer
sub js { my $v = shift; if (ref $v eq 'ARRAY') { return '[' . join(',', map { js($_) } @$v) . ']' }
  if (ref $v eq 'HASH') { return '{' . join(',', map { js($_) . ':' . js($$v{$_}) } sort keys %$v) . '}' }
  $v =~ s/(["\\])/\\$1/g; return "\"$v\""; }
print js(\%out), "\n";
