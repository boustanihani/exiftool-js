#!/usr/bin/perl
# Reference results for tools/api-diff.mjs: runs the jobs of a JSON job file through
# Image::ExifTool::JSAPI in Perl (one process for all jobs, like a browser session) and
# prints one canonical JSON result per line, mirroring what the JS API returns.
# usage: perl -Ilib -I../src/perl api-ref.pl JOBS.json
use strict;
use JSON::PP;
use B;
use Encode;
use Digest::MD5 qw(md5_hex);
use Image::ExifTool::JSAPI;

my $json = JSON::PP->new->utf8(1)->canonical(1)->allow_nonref(1);
open my $fh, '<', $ARGV[0] or die "can't read $ARGV[0]\n";
my $jobs = $json->decode(join '', <$fh>);
close $fh;

sub enc { my $v = shift; return defined $v ? Encode::encode('UTF-8', $v) : undef }
sub readFile { my $f = shift; open my $h, '<', $f or die "can't read $f\n"; binmode $h; local $/; my $d = <$h>; close $h; return $d }
# JS value (from JSON) -> Perl value, as toPerl() in exiftool.js
sub toPerl {
    my $v = shift;
    return undef unless defined $v;
    if (ref $v eq 'ARRAY') { return [ map { toPerl($_) } @$v ] }
    if (ref $v eq 'HASH' and keys %$v == 1 and exists $$v{'$file'}) { return readFile($$v{'$file'}) }
    if (ref $v eq 'HASH') { my %h; $h{enc($_)} = toPerl($$v{$_}) foreach keys %$v; return \%h }
    if (JSON::PP::is_bool($v)) { return $v ? 1 : 0 }
    # (keep JSON numbers as numbers, like JS numbers)
    my $flags = B::svref_2object(\$v)->FLAGS;
    return $v if $flags & (B::SVp_IOK() | B::SVp_NOK()) and not $flags & B::SVp_POK();
    return enc($v);
}
# canonical form of an extracted value (as canon() in api-diff.mjs)
sub canon {
    my $v = shift;
    return undef unless defined $v;
    if (ref $v eq 'ARRAY') { return [ map { canon($_) } @$v ] }
    if (ref $v eq 'HASH') {
        return "(Binary data $$v{BinaryLength} bytes, use the binary option to extract)" if exists $$v{BinaryLength} and keys %$v == 1;
        return 'BIN:' . length($$v{Binary}) . ':' . md5_hex($$v{Binary}) if exists $$v{Binary} and keys %$v == 1;
        my %h; $h{dec($_)} = canon($$v{$_}) foreach keys %$v; return \%h;
    }
    return dec("$v");
}
# UTF-8 decoding as done by the browser's TextDecoder (WHATWG: each maximal invalid
# subsequence becomes one U+FFFD)
sub dec {
    my $s = shift;
    return $s if not defined $s or $s !~ /[\x80-\xff]/;
    my @b = unpack('C*', $s);
    my ($out, $cp, $need, $seen, $lo, $hi) = ('', 0, 0, 0, 0x80, 0xbf);
    for (my $i = 0; $i < @b; ++$i) {
        my $c = $b[$i];
        if (not $need) {
            if ($c <= 0x7f) { $out .= chr $c }
            elsif ($c >= 0xc2 and $c <= 0xdf) { $need = 1; $cp = $c & 0x1f }
            elsif ($c >= 0xe0 and $c <= 0xef) { $lo = 0xa0 if $c == 0xe0; $hi = 0x9f if $c == 0xed; $need = 2; $cp = $c & 0x0f }
            elsif ($c >= 0xf0 and $c <= 0xf4) { $lo = 0x90 if $c == 0xf0; $hi = 0x8f if $c == 0xf4; $need = 3; $cp = $c & 0x07 }
            else { $out .= "\x{fffd}" }
            next;
        }
        if ($c < $lo or $c > $hi) {
            ($cp, $need, $seen, $lo, $hi) = (0, 0, 0, 0x80, 0xbf);
            $out .= "\x{fffd}";
            --$i;   # reprocess this byte
            next;
        }
        ($lo, $hi) = (0x80, 0xbf);
        $cp = ($cp << 6) | ($c & 0x3f);
        if (++$seen == $need) { $out .= chr $cp; ($cp, $need, $seen) = (0, 0, 0) }
    }
    $out .= "\x{fffd}" if $need;
    return $out;
}

foreach my $job (@$jobs) {
    my $p = $$job{params} || {};
    my $data = defined $$job{file} ? readFile($$job{file}) : undef;
    my %out = (id => $$job{id});
    if ($$job{kind} eq 'read') {
        my %opts = (List => 1, %{toPerl($$p{options} || {})});
        $opts{Binary} = 1 if $$p{binary};
        my $r = Image::ExifTool::JSAPI::Read(\$data, { Tags => toPerl($$p{tags} || []), Options => \%opts });
        my $gn = $$p{groupNames};
        my $fam = !defined $gn ? '1' : (JSON::PP::is_bool($gn) and not $gn) ? 'none' : "$gn";
        my (%seen, @tags);
        foreach my $t (@{$$r{Tags}}) {
            my ($key, $name, @g) = @$t;
            my $val = pop @g;
            my $k = $fam eq 'none' ? $key : join(':', map { $g[$_] } split /:/, $fam) . ":$name";
            if ($seen{$k}) { my $n = 1; ++$n while $seen{"$k ($n)"}; $k = "$k ($n)" }
            $seen{$k} = 1;
            push @tags, [ dec($k), canon($val) ];
        }
        $out{tags} = \@tags;
        $out{warnings} = [ map { dec($_) } @{$$r{Warnings}} ];
        $out{error} = dec($$r{Error});
    } else {
        my @ops;
        foreach my $t (@{$$p{tagList} || []}) { push @ops, { Tag => enc($$t[0]), Value => toPerl($$t[1]) } }
        foreach my $op (@{$$p{ops} || []}) {
            if (exists $$op{copyFrom}) {
                my $src = readFile($$op{copyFrom});
                push @ops, { CopyFrom => \$src, Tags => toPerl($$op{tags} || []), $$op{options} ? (Options => toPerl($$op{options})) : () };
                next;
            }
            my %o = %{toPerl($$op{options} || {})};
            $o{AddValue} = 1 if $$op{add};
            $o{DelValue} = 1 if $$op{remove};
            $o{Shift} = $$op{shift} < 0 ? -1 : 1 if $$op{shift};
            $o{Group} = enc($$op{group}) if defined $$op{group};
            $o{Protected} = 1 if $$op{protected};
            $o{EditOnly} = 1 if $$op{editOnly};
            $o{Replace} = 1 if $$op{replace};
            $o{Type} = 'ValueConv' if $$op{numeric};
            push @ops, { Tag => enc($$op{tag}), Value => toPerl($$op{value}), Options => \%o };
        }
        my %prm = (Ops => \@ops, Options => toPerl($$p{options} || {}));
        $prm{FileType} = $$p{fileType} if $$p{fileType};
        my $r = Image::ExifTool::JSAPI::Write(defined $data ? \$data : undef, \%prm);
        my $d = ${$$r{Data}};
        $out{data} = $$r{Result} ? length($d) . ':' . md5_hex($d) : undef;
        if ($$r{Result}) {
            # tags read back from the new file (for comparing when the data differs)
            my $rb = Image::ExifTool::JSAPI::Read(\$d, { Options => { List => 1 } });
            $out{readback} = [ map { [ dec($$_[0]), canon($$_[5]) ] } grep { $$_[3] ne 'System' } @{$$rb{Tags}} ];
        }
        $out{changed} = $$r{Result} == 1 ? JSON::PP::true : JSON::PP::false;
        $out{warnings} = [ map { dec($_) } @{$$r{Warnings}} ];
        $out{error} = dec($$r{Error});
    }
    print $json->encode(\%out), "\n";
}
