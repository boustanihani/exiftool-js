/*! exiftool-js: Image/ExifTool/MWG.pm of ExifTool 13.59 (https://exiftool.org), translated to JavaScript. ExifTool is Copyright 2003-2026, Phil Harvey. Free software; you can redistribute it and/or modify it under the same terms as Perl itself (either the Perl Artistic License or GPL), like ExifTool. See LICENSE.txt. */
import{PL as n,H as a}from"../../../runtime/perl.js";n.module("Image/ExifTool/MWG.pm",function(){const v=n.pkg("Image::ExifTool"),i=n.pkg("Image::ExifTool::MWG"),h=n.pkg("Image::ExifTool::Exif"),T=n.pkg("Image::ExifTool::Photoshop"),f=n.pkg("Image::ExifTool::XMP");n.declVars(i,["Composite","Regions","Keywords","Collections"],[]),n.declVars(h,["Main","orientation"],[]),n.declVars(f,["sArea","xmpTableDefaults","sDimensions"],[]);var p,w=a({}),E=a({}),$=a({});function W(){if(n.t(p))return n.RL([]);v.AddCompositeTags("Image::ExifTool::MWG"),v.AddTagsToLookup(i.Composite,"Image::ExifTool::Composite");let e=h.Main[315];return(e??(e=a({}))).List=1,(e??(e=a({}))).IsOverwriting=n.subref(i,"OverwriteStringList"),(e??(e=a({}))).RawConv=n.subref(i,"StringToList"),i.$strict===void 0&&(i.$strict=1),p=1}function I(e){const t=n.M;try{for(let l=n.A(e),r=0;r<l.length;++r)(n.m(l[r],/^"/)||n.m(l[r],/; /))&&(l[r]=n.s(l[r],/"/,'""',!0),l[r]=`"${n.str(l[r])}"`);return n.join("; ",[...n.A(e)])}finally{n.M=t}}function P(e,t){const l=n.M;try{let r=[],d,u=n.split(/; /,e,-1);for(let s=u,o=0;o<s.length;++o){let c=d;!n.t(d)&&(s[o]=n.s(s[o],/^"/,"",!1),n.SC>0)&&(d=1),n.t(d)&&(s[o]=n.s(s[o],/((^|[^"])("")*)"(?=\n?(?![\s\S]))/,()=>`${n.str(n.$1)}`,!1),n.SC>0&&(d=0),s[o]=n.s(s[o],/""/,'"',!0)),n.t(c)?r[r.length-1]=n.str(r[r.length-1])+("; "+n.str(s[o])):r.push(s[o])}return n.t(d)&&v.Warn(t,"Incorrectly quoted MWG string-list value"),n.num(r.length)>1?r:r[0]}finally{n.M=l}}function x(...e){const t=n.M;try{let l,[r,d,u,s]=e,o=[],c,g=v.Options(r,"WriteMode");if(n.str(g)!=="wcg"){if(u!==void 0){if(!n.m(g,/w/i))return 0}else if(!n.m(g,/c/i))return 0}if(n.t(d?.DelValue)&&u!==void 0){let m=P(u,r),M=n.str(n.ref(m))==="ARRAY"?n.A(m):[m];if(n.A(d?.DelValue).length>0){let D=a({});for(let C of n.A(d?.DelValue))D[n.k(C)]=1;for(let C of M){if(!n.t(D[n.k(C)])){o.push(C);continue}n.t(c)||(c=o.length)}}else o.push(...M)}return n.t(d?.Value)&&(c!==void 0?n.splice(o,c,0,...n.A(d?.Value)).at(-1):o.push(...n.A(d?.Value))),o.length>0?s.v=I(o):s.v=void 0,1}finally{n.M=t}}function G(e){if(!(n.t(T.$iptcDigestInfo)&&n.t(e?.NEW_VALUE?.[n.k(T.$iptcDigestInfo)]))){let t=[];t=n.L(n.WC(1,v.SetNewValue)(e,"Photoshop:IPTCDigest","old","Protected",1,"DelValue",1)),t=n.L(n.WC(1,v.SetNewValue)(e,"Photoshop:IPTCDigest","new","Protected",1))}return""}function y(e,t,l){if(t===void 0)return e;if(n.t(n.ref(e))){n.t(n.ref(t))||(t=[t]);let r,d=[];for(r=0;n.num(r)<n.num(n.A(e).length);r=n.num(r)+1)d.push(y(e?.at(r),t?.at(r),l));return d}else if(e!==void 0&&n.num(n.len(e))===n.num(l)&&(n.t(n.ref(t))&&(t=t?.[0]),n.num(n.len(t))>n.num(l)&&n.str(e)===n.str(n.substr(t,0,l))))return t;return e}n.defsub(i,"Load",W),n.defsub(i,"ListToString",I),n.defsub(i,"StringToList",P),n.defsub(i,"OverwriteStringList",x),n.defsub(i,"ReconcileIPTCDigest",G),n.defsub(i,"RecoverTruncatedIPTC",y),n.evalCodes("Image/ExifTool/MWG.pm",{"\n            return $val[1] if not defined $val[2] or (defined $val[1] and\n                             (not defined $val[3] or $val[2] eq $val[3]));\n            return Image::ExifTool::MWG::RecoverTruncatedIPTC($val[0], $val[1], 64);\n        ":function(e){return e["@val"][2]===void 0||e["@val"][1]!==void 0&&(e["@val"][3]===void 0||n.str(e["@val"][2])===n.str(e["@val"][3]))?e["@val"][1]:i.RecoverTruncatedIPTC(e["@val"][0],e["@val"][1],64)},"Image::ExifTool::MWG::ReconcileIPTCDigest($self)":e=>i.ReconcileIPTCDigest(e.$self),"$opts{EditGroup} = 1; $val":function(e){return e["%opts"].EditGroup=1,e.$val},$val:e=>e.$val,"\n            return $val[0] if defined $val[0] and $val[0] !~ /^ *$/;\n            return $val[2] if not defined $val[3] or (defined $val[2] and\n                             (not defined $val[4] or $val[3] eq $val[4]));\n            return Image::ExifTool::MWG::RecoverTruncatedIPTC($val[1], $val[2], 2000);\n        ":function(e){return e["@val"][0]!==void 0&&!n.m(e["@val"][0],/^ *(?=\n?(?![\s\S]))/)?e["@val"][0]:e["@val"][3]===void 0||e["@val"][2]!==void 0&&(e["@val"][4]===void 0||n.str(e["@val"][3])===n.str(e["@val"][4]))?e["@val"][2]:i.RecoverTruncatedIPTC(e["@val"][1],e["@val"][2],2e3)},"\n            (defined $val[0] or defined $val[1] or $val[2] or\n            (defined $val[4] and (not defined $val[5] or not defined $val[6]\n            or $val[5] eq $val[6]))) ? $val : undef\n        ":e=>e["@val"][0]!==void 0||e["@val"][1]!==void 0||n.t(e["@val"][2])||e["@val"][4]!==void 0&&(e["@val"][5]===void 0||e["@val"][6]===void 0||n.str(e["@val"][5])===n.str(e["@val"][6]))?e.$val:void 0,'\n            return $val[0] if defined $val[0] and $val[0] !~ /^[: ]*$/;\n            return $val[1] if defined $val[1] and $val[1] !~ /^[: ]*$/;\n            return $val[4] if not defined $val[5] or (defined $val[4] and\n                             (not defined $val[6] or $val[5] eq $val[6]));\n            return $val[3] ? "$val[2] $val[3]" : $val[2] if $val[2];\n            return undef;\n        ':function(e){if(e["@val"][0]!==void 0&&!n.m(e["@val"][0],/^[: ]*(?=\n?(?![\s\S]))/))return e["@val"][0];if(e["@val"][1]!==void 0&&!n.m(e["@val"][1],/^[: ]*(?=\n?(?![\s\S]))/))return e["@val"][1];if(e["@val"][5]===void 0||e["@val"][4]!==void 0&&(e["@val"][6]===void 0||n.str(e["@val"][5])===n.str(e["@val"][6])))return e["@val"][4];if(n.t(e["@val"][2]))return n.t(e["@val"][3])?`${n.str(e["@val"][2])} ${n.str(e["@val"][3])}`:e["@val"][2]},"$self->ConvertDateTime($val)":e=>v.ConvertDateTime(e.$self,e.$val),"$self->InverseDateTime($val,undef,1)":e=>v.InverseDateTime(e.$self,e.$val,void 0,1),"delete $opts{Type}; $val":function(e){return n.del(e["%opts"],"Type"),e.$val},"\n            return $val[0] if defined $val[0] and $val[0] !~ /^[: ]*$/;\n            return $val[1] if defined $val[1] and $val[1] !~ /^[: ]*$/;\n            return $val[2] if not defined $val[3] or not defined $val[4] or $val[3] eq $val[4];\n            return undef;\n        ":function(e){if(e["@val"][0]!==void 0&&!n.m(e["@val"][0],/^[: ]*(?=\n?(?![\s\S]))/))return e["@val"][0];if(e["@val"][1]!==void 0&&!n.m(e["@val"][1],/^[: ]*(?=\n?(?![\s\S]))/))return e["@val"][1];if(e["@val"][3]===void 0||e["@val"][4]===void 0||n.str(e["@val"][3])===n.str(e["@val"][4]))return e["@val"][2]},'""':()=>"","\n            return $val[0] if defined $val[0] and $val[0] !~ /^ *$/;\n            return $val[2] if not defined $val[3] or (defined $val[2] and\n                             (not defined $val[4] or $val[3] eq $val[4]));\n            return Image::ExifTool::MWG::RecoverTruncatedIPTC($val[1], $val[2], 128);\n        ":function(e){return e["@val"][0]!==void 0&&!n.m(e["@val"][0],/^ *(?=\n?(?![\s\S]))/)?e["@val"][0]:e["@val"][3]===void 0||e["@val"][2]!==void 0&&(e["@val"][4]===void 0||n.str(e["@val"][3])===n.str(e["@val"][4]))?e["@val"][2]:i.RecoverTruncatedIPTC(e["@val"][1],e["@val"][2],128)},"\n                # encode if necessary (not automatic because Format is 'undef')\n                my $enc = $self->Options('CharsetEXIF');\n                if ($enc) {\n                    my $v = $val;\n                    $self->Encode($v,$enc);\n                    return $v;\n                }\n                return $val;\n            ":function(e){let t=v.Options(e.$self,"CharsetEXIF");if(n.t(t)){let l=e.$val;return v.Encode(e.$self,l,t),l}return e.$val},"\n            return $val[0] if defined $val[0] and $val[0] !~ /^ *$/;\n            return $val[2] if not defined $val[3] or (defined $val[2] and\n                             (not defined $val[4] or $val[3] eq $val[4]));\n            return Image::ExifTool::MWG::RecoverTruncatedIPTC($val[1], $val[2], 32);\n        ":function(e){return e["@val"][0]!==void 0&&!n.m(e["@val"][0],/^ *(?=\n?(?![\s\S]))/)?e["@val"][0]:e["@val"][3]===void 0||e["@val"][2]!==void 0&&(e["@val"][4]===void 0||n.str(e["@val"][3])===n.str(e["@val"][4]))?e["@val"][2]:i.RecoverTruncatedIPTC(e["@val"][1],e["@val"][2],32)},"\n            my $xmpVal = $val[2] || $val[1];\n            return $xmpVal if not defined $val[3] or (defined $xmpVal and\n                             (not defined $val[4] or $val[3] eq $val[4]));\n            return Image::ExifTool::MWG::RecoverTruncatedIPTC($val[0], $xmpVal, 64);\n        ":function(e){let t,l=n.t(t=e["@val"][2])?t:e["@val"][1];return e["@val"][3]===void 0||l!==void 0&&(e["@val"][4]===void 0||n.str(e["@val"][3])===n.str(e["@val"][4]))?l:i.RecoverTruncatedIPTC(e["@val"][0],l,64)},"\n            my $xmpVal = $val[2] || $val[1];\n            return $xmpVal if not defined $val[3] or (defined $xmpVal and\n                             (not defined $val[4] or $val[3] eq $val[4]));\n            return Image::ExifTool::MWG::RecoverTruncatedIPTC($val[0], $xmpVal, 32);\n        ":function(e){let t,l=n.t(t=e["@val"][2])?t:e["@val"][1];return e["@val"][3]===void 0||l!==void 0&&(e["@val"][4]===void 0||n.str(e["@val"][3])===n.str(e["@val"][4]))?l:i.RecoverTruncatedIPTC(e["@val"][0],l,32)}}),n.use("Image::ExifTool",i,[":DataAccess",":Utils"]),n.use("Image::ExifTool::Exif",i),n.use("Image::ExifTool::XMP",i),i.$VERSION="1.24",n.hset(i.Composite,a({GROUPS:a({0:"Composite",1:"MWG",2:"Image"}),VARS:a({ID_FMT:"none"}),WRITE_PROC:n.subref(v,"DummyWriteProc"),NOTES:`
        The table below lists special Composite tags which are used to access other
        tags based on the MWG 2.0 recommendations.  These tags are only accessible
        when explicitly loaded, but this is done automatically by the exiftool
        application if MWG is specified as a group for any tag on the command line,
        or manually with the C<-use MWG> option.  Via the API, the MWG Composite
        tags are loaded by calling "C<Image::ExifTool::MWG::Load()>".

        When reading, the value of each MWG tag is B<Derived From> the specified
        tags based on the MWG guidelines.  When writing, the appropriate associated
        tags are written.  The value of the IPTCDigest tag is updated automatically
        when the IPTC is changed if either the IPTCDigest tag didn't exist
        beforehand or its value agreed with the original IPTC digest (indicating
        that the XMP is synchronized with the IPTC).  IPTC information is written
        only if the original file contained IPTC.

        Loading the MWG module activates "strict MWG conformance mode", which has
        the effect of causing EXIF, IPTC and XMP in non-standard locations to be
        ignored when reading, as per the MWG recommendations.  Instead, a "Warning"
        tag is generated when non-standard metadata is encountered.  This feature
        may be disabled by setting C<$Image::ExifTool::MWG::strict = 0> in the
        L<ExifTool config file|../config.html> (or from your Perl script when using the API).  Note
        that the behaviour when writing is not changed:  ExifTool always creates new
        records only in the standard location, but writes new tags to any
        EXIF/IPTC/XMP records that exist.

        Contrary to the EXIF specification, the MWG recommends that EXIF "ASCII"
        string values be stored as UTF-8.  To honour this, the exiftool application
        sets the default internal EXIF string encoding to "UTF8" when the MWG module
        is loaded, but via the API this must be done manually by setting the
        L<CharsetEXIF|../ExifTool.html#CharsetEXIF> option.

        A complication of the MWG specification is that although the MWG:Creator
        property may consist of multiple values, the associated EXIF tag
        (EXIF:Artist) is only a simple string.  To resolve this discrepancy the MWG
        recommends a technique which allows a list of values to be stored in a
        string by using a semicolon-space separator (with quotes around values if
        necessary).  When the MWG module is loaded, ExifTool automatically
        implements this policy and changes EXIF:Artist to a list-type tag.
    `,Keywords:a({Flags:["Writable","List"],Desire:a({0:"IPTC:Keywords",1:"XMP-dc:Subject",2:"CurrentIPTCDigest",3:"IPTCDigest"}),RawConv:`
            return $val[1] if not defined $val[2] or (defined $val[1] and
                             (not defined $val[3] or $val[2] eq $val[3]));
            return Image::ExifTool::MWG::RecoverTruncatedIPTC($val[0], $val[1], 64);
        `,DelCheck:"Image::ExifTool::MWG::ReconcileIPTCDigest($self)",WriteCheck:"Image::ExifTool::MWG::ReconcileIPTCDigest($self)",WriteAlso:a({"IPTC:Keywords":"$opts{EditGroup} = 1; $val","XMP-dc:Subject":"$val"})}),Description:a({Writable:1,Desire:a({0:"EXIF:ImageDescription",1:"IPTC:Caption-Abstract",2:"XMP-dc:Description",3:"CurrentIPTCDigest",4:"IPTCDigest"}),RawConv:`
            return $val[0] if defined $val[0] and $val[0] !~ /^ *$/;
            return $val[2] if not defined $val[3] or (defined $val[2] and
                             (not defined $val[4] or $val[3] eq $val[4]));
            return Image::ExifTool::MWG::RecoverTruncatedIPTC($val[1], $val[2], 2000);
        `,DelCheck:"Image::ExifTool::MWG::ReconcileIPTCDigest($self)",WriteCheck:"Image::ExifTool::MWG::ReconcileIPTCDigest($self)",WriteAlso:a({"EXIF:ImageDescription":"$val","IPTC:Caption-Abstract":"$opts{EditGroup} = 1; $val","XMP-dc:Description":"$val"})}),DateTimeOriginal:a({Description:"Date/Time Original",Groups:a({2:"Time"}),Notes:'"specifies when a photo was taken" - MWG',Writable:1,Shift:0,Desire:a({0:"Composite:SubSecDateTimeOriginal",1:"EXIF:DateTimeOriginal",2:"IPTC:DateCreated",3:"IPTC:TimeCreated",4:"XMP-photoshop:DateCreated",5:"CurrentIPTCDigest",6:"IPTCDigest"}),RawConv:`
            (defined $val[0] or defined $val[1] or $val[2] or
            (defined $val[4] and (not defined $val[5] or not defined $val[6]
            or $val[5] eq $val[6]))) ? $val : undef
        `,ValueConv:`
            return $val[0] if defined $val[0] and $val[0] !~ /^[: ]*$/;
            return $val[1] if defined $val[1] and $val[1] !~ /^[: ]*$/;
            return $val[4] if not defined $val[5] or (defined $val[4] and
                             (not defined $val[6] or $val[5] eq $val[6]));
            return $val[3] ? "$val[2] $val[3]" : $val[2] if $val[2];
            return undef;
        `,PrintConv:"$self->ConvertDateTime($val)",PrintConvInv:"$self->InverseDateTime($val,undef,1)",DelCheck:"Image::ExifTool::MWG::ReconcileIPTCDigest($self)",WriteCheck:"Image::ExifTool::MWG::ReconcileIPTCDigest($self)",WriteAlso:a({"Composite:SubSecDateTimeOriginal":"delete $opts{Type}; $val","IPTC:DateCreated":"$opts{EditGroup} = 1; $val","IPTC:TimeCreated":"$opts{EditGroup} = 1; $val","XMP-photoshop:DateCreated":"$val"})}),CreateDate:a({Groups:a({2:"Time"}),Notes:'"specifies when an image was digitized" - MWG',Writable:1,Shift:0,Desire:a({0:"Composite:SubSecCreateDate",1:"EXIF:CreateDate",2:"IPTC:DigitalCreationDate",3:"IPTC:DigitalCreationTime",4:"XMP-xmp:CreateDate",5:"CurrentIPTCDigest",6:"IPTCDigest"}),RawConv:`
            (defined $val[0] or defined $val[1] or $val[2] or
            (defined $val[4] and (not defined $val[5] or not defined $val[6]
            or $val[5] eq $val[6]))) ? $val : undef
        `,ValueConv:`
            return $val[0] if defined $val[0] and $val[0] !~ /^[: ]*$/;
            return $val[1] if defined $val[1] and $val[1] !~ /^[: ]*$/;
            return $val[4] if not defined $val[5] or (defined $val[4] and
                             (not defined $val[6] or $val[5] eq $val[6]));
            return $val[3] ? "$val[2] $val[3]" : $val[2] if $val[2];
            return undef;
        `,PrintConv:"$self->ConvertDateTime($val)",PrintConvInv:"$self->InverseDateTime($val,undef,1)",DelCheck:"Image::ExifTool::MWG::ReconcileIPTCDigest($self)",WriteCheck:"Image::ExifTool::MWG::ReconcileIPTCDigest($self)",WriteAlso:a({"Composite:SubSecCreateDate":"delete $opts{Type}; $val","IPTC:DigitalCreationDate":"$opts{EditGroup} = 1; $val","IPTC:DigitalCreationTime":"$opts{EditGroup} = 1; $val","XMP-xmp:CreateDate":"$val"})}),ModifyDate:a({Groups:a({2:"Time"}),Notes:'"specifies when a file was modified by the user" - MWG',Writable:1,Shift:0,Desire:a({0:"Composite:SubSecModifyDate",1:"EXIF:ModifyDate",2:"XMP-xmp:ModifyDate",3:"CurrentIPTCDigest",4:"IPTCDigest"}),RawConv:`
            return $val[0] if defined $val[0] and $val[0] !~ /^[: ]*$/;
            return $val[1] if defined $val[1] and $val[1] !~ /^[: ]*$/;
            return $val[2] if not defined $val[3] or not defined $val[4] or $val[3] eq $val[4];
            return undef;
        `,PrintConv:"$self->ConvertDateTime($val)",PrintConvInv:"$self->InverseDateTime($val,undef,1)",DelCheck:'""',WriteCheck:'""',WriteAlso:a({"Composite:SubSecModifyDate":"delete $opts{Type}; $val","XMP-xmp:ModifyDate":"$val"})}),Orientation:a({Writable:1,Require:"EXIF:Orientation",ValueConv:"$val",PrintConv:h.orientation,DelCheck:'""',WriteCheck:'""',WriteAlso:a({"EXIF:Orientation":"$val"})}),Rating:a({Writable:1,Require:"XMP-xmp:Rating",ValueConv:"$val",DelCheck:'""',WriteCheck:'""',WriteAlso:a({"XMP-xmp:Rating":"$val"})}),Copyright:a({Groups:a({2:"Author"}),Writable:1,Desire:a({0:"EXIF:Copyright",1:"IPTC:CopyrightNotice",2:"XMP-dc:Rights",3:"CurrentIPTCDigest",4:"IPTCDigest"}),RawConv:`
            return $val[0] if defined $val[0] and $val[0] !~ /^ *$/;
            return $val[2] if not defined $val[3] or (defined $val[2] and
                             (not defined $val[4] or $val[3] eq $val[4]));
            return Image::ExifTool::MWG::RecoverTruncatedIPTC($val[1], $val[2], 128);
        `,DelCheck:"Image::ExifTool::MWG::ReconcileIPTCDigest($self)",WriteCheck:"Image::ExifTool::MWG::ReconcileIPTCDigest($self)",WriteAlso:a({"EXIF:Copyright":`
                # encode if necessary (not automatic because Format is 'undef')
                my $enc = $self->Options('CharsetEXIF');
                if ($enc) {
                    my $v = $val;
                    $self->Encode($v,$enc);
                    return $v;
                }
                return $val;
            `,"IPTC:CopyrightNotice":"$opts{EditGroup} = 1; $val","XMP-dc:Rights":"$val"})}),Creator:a({Groups:a({2:"Author"}),Flags:["Writable","List"],Desire:a({0:"EXIF:Artist",1:"IPTC:By-line",2:"XMP-dc:Creator",3:"CurrentIPTCDigest",4:"IPTCDigest"}),RawConv:`
            return $val[0] if defined $val[0] and $val[0] !~ /^ *$/;
            return $val[2] if not defined $val[3] or (defined $val[2] and
                             (not defined $val[4] or $val[3] eq $val[4]));
            return Image::ExifTool::MWG::RecoverTruncatedIPTC($val[1], $val[2], 32);
        `,DelCheck:"Image::ExifTool::MWG::ReconcileIPTCDigest($self)",WriteCheck:"Image::ExifTool::MWG::ReconcileIPTCDigest($self)",WriteAlso:a({"EXIF:Artist":"$val","IPTC:By-line":"$opts{EditGroup} = 1; $val","XMP-dc:Creator":"$val"})}),Country:a({Groups:a({2:"Location"}),Writable:1,Desire:a({0:"IPTC:Country-PrimaryLocationName",1:"XMP-photoshop:Country",2:"XMP-iptcExt:LocationShownCountryName",3:"CurrentIPTCDigest",4:"IPTCDigest"}),RawConv:`
            my $xmpVal = $val[2] || $val[1];
            return $xmpVal if not defined $val[3] or (defined $xmpVal and
                             (not defined $val[4] or $val[3] eq $val[4]));
            return Image::ExifTool::MWG::RecoverTruncatedIPTC($val[0], $xmpVal, 64);
        `,DelCheck:"Image::ExifTool::MWG::ReconcileIPTCDigest($self)",WriteCheck:"Image::ExifTool::MWG::ReconcileIPTCDigest($self)",WriteAlso:a({"IPTC:Country-PrimaryLocationName":"$opts{EditGroup} = 1; $val","XMP-photoshop:Country":"$val","XMP-iptcExt:LocationShownCountryName":"$val"})}),State:a({Groups:a({2:"Location"}),Writable:1,Desire:a({0:"IPTC:Province-State",1:"XMP-photoshop:State",2:"XMP-iptcExt:LocationShownProvinceState",3:"CurrentIPTCDigest",4:"IPTCDigest"}),RawConv:`
            my $xmpVal = $val[2] || $val[1];
            return $xmpVal if not defined $val[3] or (defined $xmpVal and
                             (not defined $val[4] or $val[3] eq $val[4]));
            return Image::ExifTool::MWG::RecoverTruncatedIPTC($val[0], $xmpVal, 32);
        `,DelCheck:"Image::ExifTool::MWG::ReconcileIPTCDigest($self)",WriteCheck:"Image::ExifTool::MWG::ReconcileIPTCDigest($self)",WriteAlso:a({"IPTC:Province-State":"$opts{EditGroup} = 1; $val","XMP-photoshop:State":"$val","XMP-iptcExt:LocationShownProvinceState":"$val"})}),City:a({Groups:a({2:"Location"}),Writable:1,Desire:a({0:"IPTC:City",1:"XMP-photoshop:City",2:"XMP-iptcExt:LocationShownCity",3:"CurrentIPTCDigest",4:"IPTCDigest"}),RawConv:`
            my $xmpVal = $val[2] || $val[1];
            return $xmpVal if not defined $val[3] or (defined $xmpVal and
                             (not defined $val[4] or $val[3] eq $val[4]));
            return Image::ExifTool::MWG::RecoverTruncatedIPTC($val[0], $xmpVal, 32);
        `,DelCheck:"Image::ExifTool::MWG::ReconcileIPTCDigest($self)",WriteCheck:"Image::ExifTool::MWG::ReconcileIPTCDigest($self)",WriteAlso:a({"IPTC:City":"$opts{EditGroup} = 1; $val","XMP-photoshop:City":"$val","XMP-iptcExt:LocationShownCity":"$val"})}),Location:a({Groups:a({2:"Location"}),Writable:1,Desire:a({0:"IPTC:Sub-location",1:"XMP-iptcCore:Location",2:"XMP-iptcExt:LocationShownSublocation",3:"CurrentIPTCDigest",4:"IPTCDigest"}),RawConv:`
            my $xmpVal = $val[2] || $val[1];
            return $xmpVal if not defined $val[3] or (defined $xmpVal and
                             (not defined $val[4] or $val[3] eq $val[4]));
            return Image::ExifTool::MWG::RecoverTruncatedIPTC($val[0], $xmpVal, 32);
        `,DelCheck:"Image::ExifTool::MWG::ReconcileIPTCDigest($self)",WriteCheck:"Image::ExifTool::MWG::ReconcileIPTCDigest($self)",WriteAlso:a({"IPTC:Sub-location":"$opts{EditGroup} = 1; $val","XMP-iptcCore:Location":"$val","XMP-iptcExt:LocationShownSublocation":"$val"})})}));var w=a({STRUCT_NAME:"MWG Extensions",NAMESPACE:void 0,NOTES:`
        This structure may contain any top-level XMP tags, but none have been
        pre-defined in ExifTool.  Since no flattened tags have been pre-defined,
        RegionExtensions is writable only as a structure (eg.
        C<{xmp-dc:creator=me,rating=5}>).  Fields for this structure are identified
        using the standard ExifTool tag name (with optional leading group name,
        and/or trailing language code, and/or trailing C<#> symbol to disable print
        conversion).
    `}),E=a({STRUCT_NAME:"MWG RegionStruct",NAMESPACE:"mwg-rs",Area:a({Struct:f.sArea}),Type:a({PrintConv:a({Face:"Face",Pet:"Pet",Focus:"Focus",BarCode:"BarCode"})}),Name:a({}),Description:a({}),FocusUsage:a({PrintConv:a({EvaluatedUsed:"Evaluated, Used",EvaluatedNotUsed:"Evaluated, Not Used",NotEvaluatedNotUsed:"Not Evaluated, Not Used"})}),BarCodeValue:a({}),Extensions:a({Struct:w}),Rotation:a({Writable:"real",Notes:"not part of MWG 2.0 spec"}),seeAlso:a({Namespace:"rdfs",Resource:1})});n.hset($,a({STRUCT_NAME:"MWG KeywordStruct",NAMESPACE:"mwg-kw",Keyword:a({}),Applied:a({Writable:"boolean"}),Children:a({Struct:$,List:"Bag"})})),n.hset(i.Regions,n.hl([...n.hlist(f.xmpTableDefaults),"GROUPS",a({0:"XMP",1:"XMP-mwg-rs",2:"Image"}),"NAMESPACE","mwg-rs","NOTES",`
        Image region metadata defined by the MWG 2.0 specification.  These tags
        may be accessed without the need to load the MWG Composite tags above.  See
        L<https://web.archive.org/web/20180919181934/http://www.metadataworkinggroup.org/pdf/mwg_guidance.pdf>
        for the official specification.
    `,"Regions",a({Name:"RegionInfo",FlatName:"Region",Struct:a({STRUCT_NAME:"MWG RegionInfo",NAMESPACE:"mwg-rs",RegionList:a({FlatName:"Region",Struct:E,List:"Bag"}),AppliedToDimensions:a({Struct:f.sDimensions})})}),"RegionsRegionList",a({Flat:1,Name:"RegionList"})])),n.hset(i.Keywords,n.hl([...n.hlist(f.xmpTableDefaults),"GROUPS",a({0:"XMP",1:"XMP-mwg-kw",2:"Image"}),"NAMESPACE","mwg-kw","NOTES",`
        Hierarchical keywords metadata defined by the MWG 2.0 specification.
        ExifTool unrolls keyword structures to an arbitrary depth of 6 to allow
        individual levels to be accessed with different tag names, and to avoid
        infinite recursion.  See
        L<https://web.archive.org/web/20180919181934/http://www.metadataworkinggroup.org/pdf/mwg_guidance.pdf>
        for the official specification.
    `,"Keywords",a({Name:"KeywordInfo",Struct:a({STRUCT_NAME:"MWG KeywordInfo",NAMESPACE:"mwg-kw",Hierarchy:a({Struct:$,List:"Bag"})})}),"KeywordsHierarchy",a({Name:"HierarchicalKeywords",Flat:1}),"KeywordsHierarchyKeyword",a({Name:"HierarchicalKeywords1",Flat:1}),"KeywordsHierarchyApplied",a({Name:"HierarchicalKeywords1Applied",Flat:1}),"KeywordsHierarchyChildren",a({Name:"HierarchicalKeywords1Children",Flat:1}),"KeywordsHierarchyChildrenKeyword",a({Name:"HierarchicalKeywords2",Flat:1}),"KeywordsHierarchyChildrenApplied",a({Name:"HierarchicalKeywords2Applied",Flat:1}),"KeywordsHierarchyChildrenChildren",a({Name:"HierarchicalKeywords2Children",Flat:1}),"KeywordsHierarchyChildrenChildrenKeyword",a({Name:"HierarchicalKeywords3",Flat:1}),"KeywordsHierarchyChildrenChildrenApplied",a({Name:"HierarchicalKeywords3Applied",Flat:1}),"KeywordsHierarchyChildrenChildrenChildren",a({Name:"HierarchicalKeywords3Children",Flat:1}),"KeywordsHierarchyChildrenChildrenChildrenKeyword",a({Name:"HierarchicalKeywords4",Flat:1}),"KeywordsHierarchyChildrenChildrenChildrenApplied",a({Name:"HierarchicalKeywords4Applied",Flat:1}),"KeywordsHierarchyChildrenChildrenChildrenChildren",a({Name:"HierarchicalKeywords4Children",Flat:1}),"KeywordsHierarchyChildrenChildrenChildrenChildrenKeyword",a({Name:"HierarchicalKeywords5",Flat:1}),"KeywordsHierarchyChildrenChildrenChildrenChildrenApplied",a({Name:"HierarchicalKeywords5Applied",Flat:1}),"KeywordsHierarchyChildrenChildrenChildrenChildrenChildren",a({Name:"HierarchicalKeywords5Children",Flat:1,NoSubStruct:1}),"KeywordsHierarchyChildrenChildrenChildrenChildrenChildrenKeyword",a({Name:"HierarchicalKeywords6",Flat:1}),"KeywordsHierarchyChildrenChildrenChildrenChildrenChildrenApplied",a({Name:"HierarchicalKeywords6Applied",Flat:1})])),n.hset(i.Collections,n.hl([...n.hlist(f.xmpTableDefaults),"GROUPS",a({0:"XMP",1:"XMP-mwg-coll",2:"Image"}),"NAMESPACE","mwg-coll","NOTES",`
        Collections metadata defined by the MWG 2.0 specification.  See
        L<https://web.archive.org/web/20180919181934/http://www.metadataworkinggroup.org/pdf/mwg_guidance.pdf>
        for the official specification.
    `,"Collections",a({FlatName:"",List:"Bag",Struct:a({STRUCT_NAME:"MWG CollectionInfo",NAMESPACE:"mwg-coll",CollectionName:a({}),CollectionURI:a({})})})]))});
