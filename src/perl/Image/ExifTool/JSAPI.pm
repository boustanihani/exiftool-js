#------------------------------------------------------------------------------
# File:         JSAPI.pm
#
# Description:  Simple entry points for the JavaScript API of exiftool-js
#
# Notes:        This module is translated to JavaScript together with ExifTool.  It
#               takes and returns plain Perl data structures (hashes, arrays, strings and
#               scalar references for binary data) which the JS layer converts to and
#               from JS values.  It runs unchanged in Perl, which is used for testing.
#------------------------------------------------------------------------------

package Image::ExifTool::JSAPI;

use strict;
use vars qw($VERSION);
use Image::ExifTool;

$VERSION = '1.00';

#------------------------------------------------------------------------------
# Set ExifTool options from a hash
# Inputs: 0) ExifTool ref, 1) options hash ref (may be undef)
sub SetOptions($$)
{
    my ($et, $opts) = @_;
    return unless ref $opts eq 'HASH';
    my $key;
    foreach $key (sort keys %$opts) {
        $et->Options($key => $$opts{$key});
    }
}

#------------------------------------------------------------------------------
# Convert an extracted value for returning (marks binary data)
# Inputs: 0) value
# Returns: value: SCALAR refs become { Binary => data } or { BinaryLength => N }
#          (for placeholders when the data wasn't extracted), recursively for lists and
#          structures
sub ConvertValue($);
sub ConvertValue($)
{
    my $val = shift;
    my $ref = ref $val;
    return $val unless $ref;
    if ($ref eq 'SCALAR') {
        return { BinaryLength => $1 } if $$val =~ /^Binary data (\d+) bytes$/;
        return { Binary => $$val };
    }
    if ($ref eq 'ARRAY') {
        return [ map { ConvertValue($_) } @$val ];
    }
    if ($ref eq 'HASH') {
        my %h;
        my $key;
        foreach $key (keys %$val) {
            $h{$key} = ConvertValue($$val{$key});
        }
        return \%h;
    }
    return "$val";
}

#------------------------------------------------------------------------------
# Get warning and error messages from an ExifTool object
# Inputs: 0) ExifTool ref
# Returns: 0) list ref of warnings, 1) error message or undef
sub GetMessages($)
{
    my $et = shift;
    my $vals = $$et{VALUE};
    my $order = $$et{FILE_ORDER};
    my (@warn, $key);
    # (in the order they were issued)
    foreach $key (sort { ($$order{$a} || 0) <=> ($$order{$b} || 0) or $a cmp $b }
                  grep /^Warning( \(\d+\))?$/, keys %$vals)
    {
        push @warn, $$vals{$key};
    }
    return (\@warn, $$vals{Error});
}

#------------------------------------------------------------------------------
# Read metadata
# Inputs: 0) reference to file data, 1) parameter hash ref:
#           Tags    - list ref of tag names to extract (as for ImageInfo, eg. 'XMP:all',
#                     '-ThumbnailImage', 'EXIF:*')
#           Options - hash ref of ExifTool options
# Returns: hash ref:
#           Tags     - list ref of [ tag key, tag name, family 0 group, family 1 group,
#                      family 2 group, value ] in file order
#           Warnings - list ref of warnings
#           Error    - error message (if any)
sub Read($$)
{
    my ($dataPt, $p) = @_;
    my $et = Image::ExifTool->new;
    SetOptions($et, $$p{Options});
    my @tags = ref $$p{Tags} eq 'ARRAY' ? @{$$p{Tags}} : ();
    my $info = $et->ImageInfo($dataPt, @tags);
    my (@out, $key);
    foreach $key ($et->GetFoundTags('File')) {
        next unless exists $$info{$key};
        next if $key =~ /^(Warning|Error)( \(\d+\))?$/;
        my @g = ($et->GetGroup($key, 0), $et->GetGroup($key, 1), $et->GetGroup($key, 2));
        push @out, [ $key, Image::ExifTool::GetTagName($key), @g, ConvertValue($$info{$key}) ];
    }
    my ($warn, $err) = GetMessages($et);
    return { Tags => \@out, Warnings => $warn, Error => $err };
}

#------------------------------------------------------------------------------
# Write metadata
# Inputs: 0) reference to file data (or undef to create a new file of type
#            $$p{FileType}, eg. XMP), 1) parameter hash ref:
#           Ops     - list ref of operations, each a hash ref:
#                     { Tag => name, Value => value, Options => { SetNewValue options } }
#                       (Value undef to delete), or
#                     { CopyFrom => reference to source file data, Tags => [ tags ] }
#           Options - hash ref of ExifTool options
#           FileType - type of file to create when no data is given (eg. 'XMP')
# Returns: hash ref:
#           Result   - WriteInfo return value (1 = written, 2 = written without changes,
#                      0 = error)
#           Data     - reference to new file data
#           Warnings - list ref of warnings (from setting values and from writing)
#           Error    - error message (if any)
sub Write($$)
{
    my ($dataPt, $p) = @_;
    my $et = Image::ExifTool->new;
    SetOptions($et, $$p{Options});
    my (@warn, $op);
    my @ops = ref $$p{Ops} eq 'ARRAY' ? @{$$p{Ops}} : ();
    foreach $op (@ops) {
        if ($$op{CopyFrom}) {
            my @tags = ref $$op{Tags} eq 'ARRAY' ? @{$$op{Tags}} : ();
            unshift @tags, $$op{Options} if ref $$op{Options} eq 'HASH';
            my $info = $et->SetNewValuesFromFile($$op{CopyFrom}, @tags);
            push @warn, "Error reading source file: $$info{Error}" if $$info{Error};
            my $key;
            foreach $key (sort grep /^Warning( \(\d+\))?$/, keys %$info) {
                push @warn, $$info{$key};
            }
            next;
        }
        my %o = ref $$op{Options} eq 'HASH' ? %{$$op{Options}} : ();
        my ($n, $err) = $et->SetNewValue($$op{Tag}, $$op{Value}, %o);
        push @warn, $err if $err;
    }
    my $out = '';
    my $src = $dataPt;
    if (not defined $dataPt and $$p{FileType}) {
        # create a new file (eg. XMP sidecar)
        $src = undef;
    }
    my $r = $et->WriteInfo($src, \$out, $$p{FileType});
    my ($w2, $err) = GetMessages($et);
    push @warn, @$w2;
    return { Result => $r, Data => \$out, Warnings => \@warn, Error => $err };
}

#------------------------------------------------------------------------------
# Get list of tag names
# Inputs: 0) parameter hash ref: Group => group name (optional), Writable => flag
# Returns: list ref of tag names
sub ListTags($)
{
    my $p = shift;
    my @tags = $$p{Writable} ? Image::ExifTool::GetWritableTags($$p{Group}) :
                               Image::ExifTool::GetAllTags($$p{Group});
    return \@tags;
}

#------------------------------------------------------------------------------
# Get ExifTool version
sub Version()
{
    return $Image::ExifTool::VERSION;
}

1;  # end
