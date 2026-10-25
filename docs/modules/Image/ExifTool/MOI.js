/*! exiftool-js: Image/ExifTool/MOI.pm of ExifTool 13.59 (https://exiftool.org), translated to JavaScript. ExifTool is Copyright 2003-2026, Phil Harvey. Free software; you can redistribute it and/or modify it under the same terms as Perl itself (either the Perl Artistic License or GPL), like ExifTool. See LICENSE.txt. */
import{PL as n,H as a}from"../../../runtime/perl.js";n.module("Image/ExifTool/MOI.pm",function(){const u=n.pkg("File::RandomAccess"),o=n.pkg("Image::ExifTool"),l=n.pkg("Image::ExifTool::MOI");n.declVars(l,["Main"],[]);function $(e,i){const m=n.M;try{let t=i?.RAF,r;if(!(n.num(u.Read(t,n.lv(()=>r,s=>r=s),256))===256&&n.m(r,/^V6/)))return 0;if(e?.VALUE?.FileSize!==void 0){let s=n.unpack("x2N",r)[0];if(n.num(s)!==n.num(e?.VALUE?.FileSize))return 0}o.SetFileType(e),o.SetByteOrder("MM");let f=o.GetTagTable("Image::ExifTool::MOI::Main");return o.ProcessBinaryData(e,a({DataPt:n.lv(()=>r,s=>r=s)}),f)}finally{n.M=m}}n.defsub(l,"ProcessMOI",$),n.evalCodes("Image/ExifTool/MOI.pm",{"$self->ConvertDateTime($val)":e=>o.ConvertDateTime(e.$self,e.$val),"$val / 1000":e=>n.num(e.$val)/1e3,"ConvertDuration($val)":e=>e.ConvertDuration(e.$val),"\n            my $lo = ($val & 0x0f);\n            my $hi = ($val >> 4);\n            my $aspect;\n            if ($lo < 2) {\n                $aspect = '4:3';\n            } elsif ($lo == 4 or $lo == 5) {\n                $aspect = '16:9';\n            } else {\n                $aspect = 'Unknown';\n            }\n            if ($hi == 4) {\n                $aspect .= ' NTSC';\n            } elsif ($hi == 5) {\n                $aspect .= ' PAL';\n            }\n            return $aspect;\n        ":function(e){let i=n.band(e.$val,15),m=n.shr(e.$val,4),t;return n.num(i)<2?t="4:3":n.num(i)===4||n.num(i)===5?t="16:9":t="Unknown",n.num(m)===4?t=n.str(t)+" NTSC":n.num(m)===5&&(t=n.str(t)+" PAL"),t},"$val * 16000 + 48000":e=>n.num(e.$val)*16e3+48e3,"ConvertBitrate($val)":e=>e.ConvertBitrate(e.$val)}),n.use("Image::ExifTool",l,[":DataAccess",":Utils"]),l.$VERSION="1.02",n.hset(l.Main,a({GROUPS:a({2:"Video"}),PROCESS_PROC:n.subref(o,"ProcessBinaryData"),NOTES:`
        MOI files store information about associated MOD or TOD files, and are
        written by some JVC, Canon and Panasonic camcorders.
    `,0:a({Name:"MOIVersion",Format:"string[2]"}),6:a({Name:"DateTimeOriginal",Description:"Date/Time Original",Format:"undef[8]",Groups:a({2:"Time"}),ValueConv:function(e){if(!(n.num(n.len(e))>=8))return;let i=n.unpack("nCCCCn",e);return i[5]=n.div(i[5],1e3),n.sprintf("%.4d:%.2d:%.2d %.2d:%.2d:%06.3f",...i)},PrintConv:"$self->ConvertDateTime($val)"}),14:a({Name:"Duration",Format:"int32u",ValueConv:"$val / 1000",PrintConv:"ConvertDuration($val)"}),128:a({Name:"AspectRatio",Format:"int8u",PrintConv:`
            my $lo = ($val & 0x0f);
            my $hi = ($val >> 4);
            my $aspect;
            if ($lo < 2) {
                $aspect = '4:3';
            } elsif ($lo == 4 or $lo == 5) {
                $aspect = '16:9';
            } else {
                $aspect = 'Unknown';
            }
            if ($hi == 4) {
                $aspect .= ' NTSC';
            } elsif ($hi == 5) {
                $aspect .= ' PAL';
            }
            return $aspect;
        `}),132:a({Name:"AudioCodec",Format:"int16u",Groups:a({2:"Audio"}),PrintHex:1,PrintConv:a({193:"AC3",16385:"MPEG"})}),134:a({Name:"AudioBitrate",Format:"int8u",Groups:a({2:"Audio"}),ValueConv:"$val * 16000 + 48000",PrintConv:"ConvertBitrate($val)"}),218:a({Name:"VideoBitrate",Format:"int16u",PrintHex:1,ValueConv:a({22678:"8500000",33085:"5500000"}),PrintConv:"ConvertBitrate($val)"})}))});
