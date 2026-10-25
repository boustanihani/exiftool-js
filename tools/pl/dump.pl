# Dump all tags from files in a format suitable for comparing the Perl and JS versions
# usage: perl dump.pl [-opt Name=Value ...] FILE ...
use strict;
use Image::ExifTool;
require './t/TestLib.pm';

my %opts = (Duplicates => 1, Unknown => 1);
my @files;
while (@ARGV) {
    my $a = shift @ARGV;
    if ($a eq '-opt') {
        my ($k, $v) = split /=/, shift(@ARGV), 2;
        $opts{$k} = $v;
    } else {
        push @files, $a;
    }
}
foreach my $file (@files) {
    my $et = Image::ExifTool->new;
    $et->Options(%opts);
    my $info = $et->ImageInfo($file);
    print "======== $file\n";
    foreach my $tag ($et->GetFoundTags('File')) {
        my @g = $et->GetGroup($tag);
        my $val = t::TestLib::formatValue($$info{$tag});
        my $id = $et->GetTagID($tag);
        $id =~ s/([\0-\x1f\x7f-\xff])/sprintf('\\x%.2x',ord $1)/eg;
        print "[$g[0]:$g[1]:$g[2]] $tag ($id): $val\n";
    }
}
