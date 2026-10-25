#!/usr/bin/perl
# Write test helper used for differential testing (run with Perl and with the JS translation)
# usage: write.pl IN OUT [ARG ...]      (IN may be "-" to create a new file)
# ARGs:
#   -opt K=V            set ExifTool option
#   -clear              clear new values
#   -TAG                delete TAG
#   [{K=V,..}]TAG=VALUE set value (optional SetNewValue options in braces)
#   TAG+=VALUE TAG-=VALUE   add/delete list value (AddValue/DelValue)
#   TAG@=FILE           set value from contents of FILE
#   TAG~=N              set value to a generated string of N characters
#   -copy FILE[::T1;;T2]    SetNewValuesFromFile (optional tag list)
#   -memin              read the input file into memory and pass a scalar reference
#   -memout             write to memory, then save the result to OUT
#   -step               write the current result to memory and continue with a new
#                       ExifTool object using that result as input
use strict;
use Image::ExifTool;
my ($in, $out, @args) = @ARGV;
my $et = Image::ExifTool->new;
my ($memin, $memout, $src);
$src = $in eq '-' ? undef : $in;
# (WRITE_MEM=1: read the input and write the output in memory, as in the browser)
$memin = $memout = 1 if $ENV{WRITE_MEM};
while (@args) {
    my $a = shift @args;
    if ($a eq '-opt') { my ($k, $v) = split /=/, shift(@args), 2; $et->Options($k => $v); next; }
    if ($a eq '-clear') { $et->SetNewValue(); next; }
    if ($a eq '-memin') { $memin = 1; next; }
    if ($a eq '-memout') { $memout = 1; next; }
    if ($a eq '-step') {
        my $buff;
        my $r = $et->WriteInfo(GetSrc(), \$buff);
        print "step WriteInfo returned $r\n";
        PrintMsgs();
        $src = \$buff;
        undef $memin;
        $et = Image::ExifTool->new;
        next;
    }
    if ($a eq '-copy') {    # -copy FILE[::TAG;;TAG...]
        my ($file, $tags) = split /::/, shift(@args), 2;
        my @tags = defined $tags ? split(/;;/, $tags) : ();
        my $info = $et->SetNewValuesFromFile($file, @tags);
        print "SetNewValuesFromFile error: $$info{Error}\n" if $$info{Error};
        foreach (sort grep /^Warning/, keys %$info) { print "copy warning: $$info{$_}\n"; }
        next;
    }
    my %o;
    if ($a =~ s/^\{([^}]*)\}//) {
        %o = map { split /=/, $_, 2 } split /,/, $1;
    }
    if ($a =~ /^-(.+)/) {
        my ($n, $err) = $et->SetNewValue($1, undef, %o);
        print "SetNewValue error: $err\n" if $err;
        next;
    }
    my ($tag, $op, $val) = $a =~ /^(.*?)([-+@~]?=)(.*)$/s or die "bad arg $a\n";
    $val =~ s/\\x([0-9a-fA-F]{2})/chr(hex($1))/ge;   # (\xHH escapes for arbitrary bytes)
    $o{AddValue} = 1 if $op eq '+=';
    $o{DelValue} = 1 if $op eq '-=';
    if ($op eq '@=') {
        open my $fh, '<', $val or die "can't read $val\n";
        binmode $fh;
        local $/;
        $val = <$fh>;
        close $fh;
    } elsif ($op eq '~=') {
        my $n = $val;
        $val = '';
        $val .= sprintf('%.9d ', length $val) while length($val) < $n;
        $val = substr($val, 0, $n);
    }
    my ($n, $err) = $et->SetNewValue($tag, $val, %o);
    print "SetNewValue error: $err\n" if $err;
}
unlink $out;
my $r;
if ($memout) {
    my $buff;
    $r = $et->WriteInfo(GetSrc(), \$buff);
    if ($r) {
        open my $fh, '>', $out or die "can't write $out\n";
        binmode $fh;
        print $fh $buff;
        close $fh;
    }
} elsif (ref $src) {
    $r = $et->WriteInfo($src, $out);
} else {
    $r = $et->WriteInfo(GetSrc(), $out);
}
print "WriteInfo returned $r\n";
PrintMsgs();

sub GetSrc {
    return $src unless $memin and defined $src and not ref $src;
    open my $fh, '<', $src or die "can't read $src\n";
    binmode $fh;
    local $/;
    my $buff = <$fh>;
    close $fh;
    return \$buff;
}

sub PrintMsgs {
    my $e = $et->GetValue('Error');
    my $w = $et->GetValue('Warning');
    print "Error: $e\n" if $e;
    print "Warning: $w\n" if $w;
}
