/*! exiftool-js: Image/ExifTool/BuildTagLookup.pm of ExifTool 13.59 (https://exiftool.org), translated to JavaScript. ExifTool is Copyright 2003-2026, Phil Harvey. Free software; you can redistribute it and/or modify it under the same terms as Perl itself (either the Perl Artistic License or GPL), like ExifTool. See LICENSE.txt. */
import{PL as t,H as a}from"../../../runtime/perl.js";t.module("Image/ExifTool/BuildTagLookup.pm",function(){const st=t.pkg("Image::ExifTool"),D=t.pkg("Image::ExifTool::BuildTagLookup"),Ae=t.pkg("Image::ExifTool::DICOM"),Ie=t.pkg("Image::ExifTool::Shortcuts"),Me=t.pkg("Image::ExifTool::XMP"),se=t.pkg("Image::ExifTool::HTML"),Ue=t.pkg("Image::ExifTool::IPTC"),Be=t.pkg("Image::ExifTool::Nikon"),Xe=t.pkg("Image::ExifTool::Sony"),Zt=t.pkg("Image::ExifTool::Exif"),Ne=t.pkg("Image::ExifTool::Validate");t.declVars(D,["allTables"],["tableOrder","ISA"]),t.declVars(Ae,["uid"],[]),t.declVars(Ie,["Main"],[]),t.declVars(Zt,["formatNumber"],["formatSize"]),t.declVars(st,["specialTags"],[]),t.declVars(Me,["stdXlatNS"],[]),t.declVars(Ne,["exifSpec"],[]);const Ve=/\$val\{([^\n]*?)\}/g;var ye,_t,ue,ke=[],de,Le,xe,Te,ve=a({}),he=a({}),gt=a({}),Fe=a({}),Ce=a({}),_e=a({}),we=a({});function qe(...T){let O,h,w,k,L,H,N,E,z,X,r,$=t.ph(),B,x,v,V,At,lt,P;const rt=t.M;try{let kt,ft=T.shift(),Tt=t.t(h=t.t(O=t.ref(ft))?O:ft)?h:"Image::ExifTool::BuildTagLookup",d=t.bless(a({}),Tt),bt=a({}),vt=a({}),Dt=a({"unique tag names":0,"total tags":0}),$t=a({}),ut=a({}),It=a({}),f=a({}),Bt=a({}),Xt=a({}),re=a({}),Vt=a({}),Ft=a({}),Ht=a({}),qt=a({}),mt=a({}),at=a({}),oe=a({}),Ot=a({}),Lt=a({}),Ct=a({}),j=[],Gt=a({});(d??(d=a({}))).TAG_NAME_INFO=$t,(d??(d=a({}))).ID_LOOKUP=ut,(d??(d=a({}))).LONG_ID=It,(d??(d=a({}))).LONG_NAME=f,(d??(d=a({}))).SHORT_NAME=Bt,(d??(d=a({}))).TABLE_NUM=Xt,(d??(d=a({}))).TAG_LOOKUP=re,(d??(d=a({}))).TAG_EXISTS=Vt,(d??(d=a({}))).FLATTENED=Lt,(d??(d=a({}))).TABLE_WRITABLE=Ht,(d??(d=a({}))).SEPARATE_TABLE=qt,(d??(d=a({}))).STRUCTURES=at,(d??(d=a({}))).STRUCT_LOOKUP=Ct,(d??(d=a({}))).COMPOSITE_MODULES=oe,(d??(d=a({}))).COUNT=Dt,(d??(d=a({}))).WRITE_PSEUDO=j,st.LoadAllTables();let Kt=t.sort([...t.keys(D.allTables)]);Kt.push("Image::ExifTool::Shortcuts::Main");for(let I of ke)Kt.push(I),Ot[t.k(I)]=1;let ee=0,xt=st.new("Image::ExifTool"),He,Pe;for(let I of Kt){let c=I;c=t.s(c,/^Image::ExifTool::/,"",!1),c=t.s(c,/::Main(?=\n?(?![\s\S]))/,"",!1),c=t.s(c,/::/," ",!1),t.str(c)!=="Nikon AVITags"&&(c=t.s(c,/^([^\n]+)Tags(?=\n?(?![\s\S]))/,()=>`${t.ucfirst(t.$1)}`,!1)),c=t.s(c,/^Exif\b/,"EXIF",!1),c=t.s(c,/^XMP mwg_/,"XMP mwg-",!1),Bt[t.k(I)]=c,Xt[t.k(I)]=(w=t.num(ee),ee=w+1,w)}for(let I of t.values(Ae.uid))t.m(I,/[\x00-\x1f\x7f-\xff]/)&&t.warn([`Warning: Special characters in DICOM UID value (${t.str(I)})
`]);for(let I of t.keys(Ie.Main)){let c=Ie.Main[t.k(I)];t.str(t.ref(c))==="ARRAY"&&[...t.A(c)].filter(M=>t.m(M,t.re("^"+t.restr(I)+"$",""))).length>0||(vt[t.lc(I)]=1)}for(let I=Kt,c=0;c<I.length;++c){let M=Bt[t.k(I[c])],ge=$t[t.k(I[c])]=[],y=Ot[t.k(I[c])],s,J,U=a({}),R=a({}),ct=a({});t.str(M)==="Shortcuts"?(s=Ie.Main,J=1):t.t(y)?(s=st.GetTagTable(I[c]),t.del(D.allTables,t.k(I[c])),D.tableOrder.pop()):s=st.GetTagTable(I[c]);let Pt=Xt[t.k(I[c])],dt=s?.WRITE_PROC,q=t.t(k=s?.VARS)?k:a({});It[t.k(I[c])]=0,f[t.k(I[c])]=0;let it,Nt,pt,Y,W,Z;t.t(dt)&&t.str(dt)===t.str(t.subref(Ue,"WriteIPTC"))&&(W=1),(t.t(s?.GROUPS)&&t.str(s?.GROUPS?.[0])==="XMP"||t.t(q?.ADD_FLATTENED))&&(Me.AddFlattenedTags(s),Z=1),Y=q?.ID_FMT,(t.t(Z)||t.m(M,/^(Shortcuts|ASF[^\n]*)(?=\n?(?![\s\S]))/)||t.t(Y)&&t.str(Y)==="none")&&(pt=1),t.t(s?.WRITE_PROC)&&t.str(s?.WRITE_PROC)===t.str(t.subref(st,"WriteBinaryData"))&&!t.t(s?.CHECK_PROC)&&t.warn([`Binary table ${t.str(I[c])} doesn't have a CHECK_PROC
`]);let p=t.t(z=t.t(N=s?.PROCESS_PROC)?t.t(H=t.t(L=t.str(s?.PROCESS_PROC)===t.str(t.subref(st,"ProcessBinaryData"))?1:"")?L:t.str(s?.PROCESS_PROC)===t.str(t.subref(Be,"ProcessNikonEncrypted"))?1:"")?H:t.str(s?.PROCESS_PROC)===t.str(t.subref(Xe,"ProcessEnciphered"))?1:"":N)?z:t.t(E=s?.VARS)?s?.VARS?.IS_BINARY:E;if(t.t(q?.ID_LABEL)||t.t(p)){let m=t.t(s?.FORMAT)&&t.t(X=st.FormatSize(s?.FORMAT))?X:1;Nt=1,ut[t.k(I[c])]=t.t(r=q?.ID_LABEL)?r:`Index${t.str(m)}`}else t.t(W)&&t.t(s?.PROCESS_PROC)?ut[t.k(I[c])]="Record":t.t(pt)||(ut[t.k(I[c])]="Tag ID");ue=Z,_t=2,t.t(s?.VARS)&&t.t(s?.VARS?.ALPHA_FIRST)&&(_t=-1);let nt=t.L(Se(s));_t=1;let Qt=s?.FORMAT;!t.t(Qt)&&t.t(Nt)&&(Qt="int8u");t:for(let m=nt,g=0;g<m.length;++g){let tt,wt=[],le,C=[],zt=[],ce=[],Rt=[],be=[];if(t.t(J)){tt=a({Name:m[g],Notes:Fe[t.k(m[g])],Writable:1,Require:a({})});let n;for(n=0;t.num(n)<t.num(t.A(s?.[t.k(m[g])]).length);n=t.num(n)+1)t.hv(tt??(tt=a({})),"Require")[t.k(n)]=s?.[t.k(m[g])]?.at(n);zt=[tt]}else zt=t.L(st.GetTagInfoList(s,m[g]));for(let n=zt,e=0;e<n.length;++e){t.t(Nt)&&t.t(n[e]?.Writable)&&t.str(n[e]?.Writable)!=="1"&&t.warn([`${t.str(I[c])} ${t.str(n[e]?.Name)} Writable should be 1, not ${t.str(n[e]?.Writable)}
`]);let i=n[e]?.Name;if(t.t(n[e]?.WritePseudo)&&(j.push(i),t.t(n[e]?.Protected)||t.warn([`Writable pseudo tag ${t.str(i)} is not protected!
`])),!(t.t(n[e]?.SubDirectory)||t.t(n[e]?.Struct))){let u=t.lc(i);t.t(mt[t.k(u)])&&t.str(mt[t.k(u)])!==t.str(i)&&t.warn([`Different case for ${t.str(I[c])} ${t.str(i)} ${t.str(mt[t.k(u)])}
`]),mt[t.k(u)]=i}let o=n[e]?.Format;$._pos=void 0;let S=t.L(t.WC(1,st.GetGroup)(xt,n[e]));for(let u of S)t.m(u,/^ID-/i)&&t.warn([`Group name starts with 'ID-' for ${t.str(M)} ${t.str(i)}
`]);if(t.t(Z)&&!t.t(n[e]?.Avoid)&&!t.t(n[e]?.Struct)&&(t.t(n[e]?.Writable)||t.t(s?.WRITABLE))&&(t.t(Gt[t.k(i)])&&t.warn([`Duplicate writable XMP tag ${t.str(i)}
`]),Gt[t.k(i)]=1),!t.m(i,/^[_A-Za-z][-\w]+(?=\n?(?![\s\S]))/)&&(!t.t(n[e]?.SubDirectory)||!t.m(i,/^[_A-Za-z](?=\n?(?![\s\S]))/))&&t.warn([`Warning: Invalid tag name ${t.str(M)} '${t.str(i)}'
`]),t.t(n[e]?.List)&&!t.m(n[e]?.List,/^(1|Alt|Bag|Seq|array|string)(?=\n?(?![\s\S]))/)&&t.warn([`Warning: Unknown List type (${t.str(n[e]?.List)}) for ${t.str(i)} in ${t.str(I[c])}
`]),t.t(n[e]?.Hook)&&t.t(n[e]?.Unknown)&&t.warn([`Warning: Unknown tag with Hook - ${t.str(M)} ${t.str(i)}
`]),t.t(p)&&t.t(s?.WRITABLE)){if(t.t(n[e]?.Condition)&&!t.t(n[e]?.SubDirectory)&&t.m(n[e]?.Condition,/\$valPt/)&&(t.t(n[e]?.Writable)||n[e]?.Writable===void 0)&&t.warn([`Warning: Tag not writable due to Condition - ${t.str(M)} ${t.str(i)}
`]),t.t(n[e]?.IsOffset)&&(U[t.k(m[g])]=i),t.t(n[e]?.SubDirectory)&&(ct[t.k(m[g])]=i),t.t(o)&&t.m(o,/^var_/))for(R[t.k(m[g])]=i,n[e]?.Writable!==void 0&&!t.t(n[e]?.Writable)||t.warn([`Warning: Var-format tag is writable - ${t.str(M)} ${t.str(i)}
`]);t.mg(o,Ve,"g",$);){let u=t.$1;t.m(u,/^0x/)&&(u=t.hex(u)),t.str(t.ref(s?.[t.k(u)]))==="HASH"&&(R[t.k(u)]=s?.[t.k(u)]?.Name),t.t(R[t.k(u)])||t.warn([`Warning: Unknown ID (${t.str(u)}) used in Format - ${t.str(M)} ${t.str(i)}
`])}else(t.t(n[e]?.Hook)||t.t(n[e]?.RawConv)&&t.m(n[e]?.RawConv,/\$self(->)?\{\w+\}[\t\n\v\f\r ]*=(?!~)/))&&(R[t.k(m[g])]=i);t.t(o)&&t.m(o,/\$val\{/)&&(t.t(n[e]?.Writable)||n[e]?.Writable===void 0)&&t.warn([`Warning: $val{} used in Format of writable tag - ${t.str(M)} ${t.str(i)}
`])}if(t.t(n[e]?.Hidden)){if(t.str(n[e]?.Hidden)!=="2"&&!t.t(n[e]?.Unknown)&&(!t.t(n[e]?.RawConv)||!t.m(n[e]?.RawConv,/Unknown|undef/))&&t.warn([`Warning: ${t.str(M)} ${t.str(i)} is Hidden contrary to guidelines
`]),t.num(n[e])===t.num(zt[0]))continue t;continue}let l;n[e]?.Writable!==void 0?(l=n[e]?.Writable,t.t(he[t.k(l)])||t.m(l,/([^\n]*)\[/)&&t.t(he[t.k(t.$1)])||t.warn([`Warning: Unknown Writable (${t.str(l)}) - ${t.str(M)} ${t.str(i)}
`])):t.t(n[e]?.SubDirectory)||(l=s?.WRITABLE),t.t(l)&&!(t.t(s?.WRITE_PROC)||t.m(I[c],/Shortcuts/)||t.str(l)==="2")&&(l=void 0);let ie=t.L(t.WC(1,st.GetGroup)(xt,n[e]));t.t(n[e]?.List)&&t.str(ie[2])==="Time"&&t.t(l)&&!t.t(n[e]?.Protected)&&!t.t(n[e]?.PrintConvInv)&&t.warn([`Writable List-type Time tag ${t.str(ie[1])}:${t.str(i)} has no PrintConvInv and is not Protected!
`]),t.t(n[e]?.PrintConv)&&t.str(n[e]?.PrintConv)==="$self->ConvertDateTime($val)"?(t.str(ie[2])!=="Time"&&t.warn([`${t.str(M)} ${t.str(i)} should be in 'Time' group!
`]),t.t(l)&&n[e]?.Shift===void 0&&t.str(M)!=="PostScript"&&t.warn([`${t.str(M)} ${t.str(i)} is not shiftable!
`]),t.t(l)&&(!t.t(n[e]?.PrintConvInv)||!t.m(n[e]?.PrintConvInv,/InverseDateTime/))&&t.warn([`${t.str(M)} ${t.str(i)} missing InverseDateTime PrintConvInv
`])):t.m(i,/DateTime(?!Stamp)/)&&(!t.t(n[e]?.Groups?.[2])||t.str(n[e]?.Groups?.[2])!=="Time")&&t.str(M)!=="DICOM"&&t.warn([`${t.str(M)} ${t.str(i)} should be in 'Time' group!
`]),t.str(i)==="DateTimeOriginal"&&(!t.t(n[e]?.Description)||t.str(n[e]?.Description)!=="Date/Time Original")&&t.warn([`Need Description for ${t.str(M)} DateTimeOriginal
`]),t.t(n[e]?.Description)&&t.str(n[e]?.Description)!==t.str(se.EscapeHTML(n[e]?.Description))&&t.warn([`${t.str(i)} description contains special characters!
`]);let ht=n[e]?.Struct,fe;if(t.t(t.ref(ht)))if(fe=ht,ht=fe?.STRUCT_NAME,t.t(ht)){let u=Ct[t.k(ht)];t.t(u)&&t.str(u)!==t.str(fe)?t.warn([`Duplicate XMP structure with name ${t.str(ht)}
`]):Ct[t.k(ht)]=fe}else t.warn([`Missing STRUCT_NAME for structure in ${t.str(n[e]?.Name)}
`]),fe=void 0;else t.t(ht)&&(fe=Ct[t.k(ht)],t.t(fe)||(t.m(ht,/ /)||(ht=`XMP ${t.str(ht)}`),t.warn([`Missing ${t.str(ht)} structure!
`]),ht=void 0));let Jt=n[e]?.SubDirectory,Ge=t.t(B=t.t(Jt)?Jt?.Start:Jt)?t.m(Jt?.Start,/\$val\b/)?1:"":B;if(t.t(n[e]?.SubIFD)?t.t(Ge)||t.warn([`Warning: Wrong SubDirectory Start for SubIFD tag - ${t.str(M)} ${t.str(i)}
`]):t.t(Ge)&&!t.t(p)&&t.warn([`Warning: SubIFD flag not set for ${t.str(M)} ${t.str(i)}
`]),t.t(n[e]?.Notes)){let u=n[e]?.Notes;u=t.s(u,/^[\t\n\v\f\r ]+/,"",!1),u=t.s(u,/[\t\n\v\f\r ]+(?=\n?(?![\s\S]))/,"",!1),u=t.s(u,/((?:(?<![\s\S])|(?<=\n))[ \t]+|[ \t]+(?=\n|(?![\s\S])))/,"",!0),C.push(`(${t.str(u)})`)}if(t.t(Z)&&(t.lc(m[g])!==t.lc(i)||t.t(n[e]?.NotFlat))){let u;t.t(n[e]?.NotFlat)?u="NOT a flattened tag!":u=t.t(n[e]?.RootTagInfo)?m[g]:`tag ID is '${t.str(m[g])}'`,t.t(n[e]?.Notes)?C[C.length-1]=t.s(C.at(-1),/^\(/,()=>`(${t.str(u)}; `,!1):C.push(`(${t.str(u)})`)}let ae;if(t.str(M)==="Extra"?ae=t.t(n[e]?.WriteOnly)?"-":ie[1]:ae=n[e]?.WriteGroup,t.t(ae)||(t.t(l)&&(ae=s?.WRITE_GROUP),t.t(ae)||(ae="-")),o!==void 0?t.t(he[t.k(o)])||t.str(M)==="PICT"||t.m(o,/^(var_)?([^\n]*)\[/)&&t.t(he[t.k(t.$2)])||t.warn([`Warning: Unknown Format (${t.str(o)}) for ${t.str(M)} ${t.str(i)}
`]):t.pr($,o=Qt),t.t(Jt)){let u=t.t(x=Jt?.TagTable)?x:I[c];C.push(Bt[t.k(u)])}else t.t(ht)&&(C.push(ht),at[t.k(ht)]=1);let Je;for(let u of["Require","Desire"]){let _=n[e]?.[t.k(u)];if(t.t(t.ref(_)))for(let b of t.sort([...t.keys(_)],(Mt,ot)=>t.ncmp(Mt,ot)))ce.push(_?.[t.k(b)]);else t.t(_)&&ce.push(_)}let G=n[e]?.PrintConv;if(t.t(n[e]?.Mask)){let u=n[e]?.Mask,_=n[e]?.BitShift;if(t.t(_)?C.push(t.sprintf("[val >> %d & 0x%x]",_,t.shr(u,_))):C.push(t.sprintf("[val & 0x%x]",u)),t.str(t.ref(G))==="HASH"){u=t.shr(u,n[e]?.BitShift);for(let b of t.keys(G)){if(!t.m(b,/^\d+(?=\n?(?![\s\S]))/)||t.num(t.band(b,u))===t.num(b))continue;let Mt=t.sprintf("0x%.2x",b);t.warn([`${t.str(M)} ${t.str(i)} PrintConv value ${t.str(Mt)} is not in Mask!
`])}}}if(t.m(t.ref(G),/^(HASH|ARRAY)(?=\n?(?![\s\S]))/)){let u=[],_=[],b,Mt;if(t.str(t.ref(G))==="ARRAY"){for(b=0;t.num(b)<t.num(t.A(G).length);b=t.num(b)+1){if(t.str(t.ref(G?.at(b)))==="HASH"){if(!(t.hcount(G?.at(b))>0))continue;u.push(G?.at(b)),_.push(b)}else if(t.t(G?.at(b))&&t.str(G?.at(b))==="REPEAT"&&t.t(b))u.push(G?.at(t.num(b)-1)),_.push("N");else continue;t.num(u.length)>=2&&t.str(u.at(-1))===t.str(u.at(-2))&&(t.t(t.ref(_.at(-2)))?t.av(_,-2).push(_.at(-1)):_[_.length-2]=[_.at(-2),_.at(-1)],u.pop(),_.pop())}G=u.shift(),b=_.shift()}else t.str(t.ref(n[e]?.ValueConv))==="HASH"&&(Mt=n[e]?.ValueConv);for(;G!==void 0;){if(b!==void 0){let ot="",K=t.t(n[e]?.Relist)?n[e]?.Relist?.at(b):b;if(t.t(t.ref(K))){t.num(t.A(K).length)>1&&(ot="s");let St,yt=[],$e;for(St=0;t.num(St)<t.num(t.A(K).length);St=t.num(St)+1){if(t.num(St)<t.num(t.A(K).length)-1&&(t.str(K?.at(t.num(St)+1))==="N"||t.num(K?.at(t.num(St)+1))===t.num(K?.at(St))+1)){$e===void 0&&($e=K?.at(St));continue}yt.push(t.str($e!==void 0?`${t.str($e)}-`:"")+t.str(K?.at(St)))}K=t.join(", ",[...yt]),K=t.s(K,/([^\n]*),/,()=>`${t.str(t.$1)} and`,!1)}else if(!t.t(n[e]?.Relist)){for(;u.length>0&&t.str(G)===t.str(u[0]);)u.shift(),b=_.shift();t.num(K)!==t.num(b)&&(K=`${t.str(K)}-${t.str(b)}`,ot="s")}C.push(`[Value${t.str(ot)} ${t.str(K)}]`)}if(t.t(n[e]?.SeparateTable)){Jt=1;let ot=n[e]?.SeparateTable;t.str(ot)==="1"&&(ot=i),t.m(ot,/ /)||t.m(M,/^(\w+)/)&&(ot=`${t.str(t.$1)} ${t.str(ot)}`),C.push(ot),qt[t.k(ot)]=G,t.t(n[e]?.PrintHex)&&((G??(G=a({}))).PrintHex=1),t.t(n[e]?.PrintInt)&&((G??(G=a({}))).PrintInt=1),t.t(n[e]?.PrintString)&&((G??(G=a({}))).PrintString=1)}else{ue=0;let ot=[];t.t(n[e]?.PrintSort)?ot=t.sort([...t.keys(G)],(Q,A)=>te(G?.[t.k(Q)],G?.[t.k(A)])):ot=t.sort([...t.keys(G)],(Q,A)=>te(Q,A));let K=C.length,St,yt,$e;for(let Q of ot){if(t.str(Q)===""&&t.str(G?.[t.k(Q)])==="")continue;if(t.str(Q)==="BITMASK"){St=G?.[t.k(Q)];continue}if(t.str(Q)==="OTHER")continue;let A=Q;if(t.t(n[e]?.PrintInt)&&(A=t.s(A,/\.\d+(?=\n?(?![\s\S]))/,"",!1)),(t.t(n[e]?.PrintHex)||t.t(G?.BITMASK))&&t.m(A,/^-?\d+(?=\n?(?![\s\S]))/)){let Wt=t.t(v=n[e]?.PrintHex)?v:1;if(t.num(A)>=0)A=t.sprintf("0x%.*x",Wt,A);else if(t.t(o)&&t.m(o,/int(16|32)/)){let ze=a({16:65535,32:4294967295})?.[t.k(t.$1)];A=t.sprintf("0x%.*x",Wt,t.band(A,ze))}}else(t.t(n[e]?.PrintString)||!t.m(Q,/^[+-]?(?=\d|\.\d)\d*(\.\d*)?(?=\n?(?![\s\S]))/))&&(A=t.s(A,/([\x00-\x1f\x7f-\xff])/,()=>t.sprintf("\\x%.2x",t.ord(t.$1)),!0),t.SC>0?A=`"${t.str(A)}"`:A=`'${t.str(A)}'`);if(C.push(`${t.str(A)} = `+t.str(G?.[t.k(Q)])),t.t(Mt)){for(let Wt of t.keys(Mt))if(t.str(Mt?.[t.k(Wt)])===t.str(Q)){C[C.length-1]=`${t.str(Wt)} => `+t.str(C.at(-1));break}}t.m(G?.[t.k(Q)],/[\x00-\x1f\x7f-\xff]/)&&t.warn([`Warning: Special characters in ${t.str(M)} ${t.str(i)} PrintConv (${t.str(G?.[t.k(Q)])})
`])}if(t.t(St)){let Q=t.sort([...t.keys(St)],(A,Wt)=>te(A,Wt));for(let A of Q)C.push(`Bit ${t.str(A)} = `+t.str(St?.[t.k(A)]))}let Yt=n[e]?.PrintConvColumns;if(!t.t(Yt)&&t.num(C.length)-t.num(K)>=6){let Q=0;for(yt=K;t.num(yt)<t.num(C.length);yt=t.num(yt)+1)t.num(Q)<t.num(t.len(C.at(yt)))&&(Q=t.len(C.at(yt)));let A=t.num(C.length)-t.num(K);for(Yt=t.int(t.div(50,t.num(Q)+2));t.t(Yt)&&t.div(A,Yt)<3;)Yt=t.num(Yt)-1}if(t.t(Yt)){let Q=t.splice(C,K),A="[!HTML]<table class=cols><tr>",Wt=t.int(t.div(t.num(Q.length)+t.num(Yt)-1,Yt));for(K=0;;){for(A=t.str(A)+`
  <td>`,yt=0;t.num(yt)<t.num(Wt)&&t.num(K)+t.num(yt)<t.num(Q.length);yt=t.num(yt)+1)t.t(yt)&&(A=t.str(A)+`
  <br>`),A=t.str(A)+t.str(se.EscapeHTML(Q.at(t.num(K)+t.num(yt))));if(A=t.str(A)+"</td>",t.num(K=t.num(K)+t.num(Wt))>=t.num(Q.length))break;A=t.str(A)+"<td>&nbsp;&nbsp;</td>"}C.push(t.str(A)+`</tr></table>
`)}}if(!(u.length>0))break;G=u.shift(),b=_.shift()}}else if(t.t(G)&&t.m(G,/DecodeBits\(\$(val|byte),[\t\n\v\f\r ]*(\\\%[\w:]+|\{[\s\S]*\})[\t\n\v\f\r ]*\)/)){let u=t.str(t.$1)==="byte"?"Byte":"Bit";(d??(d=a({}))).Model="";let _=t.sc(t.evalStr(t.$2,()=>t.scope(D,{get $type(){return u},set $type(b){u=b},get $format(){return o},set $format(b){o=b},"@grps":S,get $tagInfo(){return n[e]},set $tagInfo(b){n[e]=b},get $tagID(){return m[g]},set $tagID(b){m[g]=b},get $_(){return kt},set $_(b){kt=b},get $self(){return d},set $self(b){d=b},get $et(){return xt},set $et(b){xt=b},get $tag(){return Pe},set $tag(b){Pe=b},"@_":T})));if(t.del(d,"Model"),t.t(t.EVAL_ERROR))t.warn([t.EVAL_ERROR]);else{let b=t.sort([...t.keys(_)],(Mt,ot)=>te(Mt,ot));for(let Mt of b)C.push(`${t.str(u)} ${t.str(Mt)} = `+t.str(_?.[t.k(Mt)]))}}if(t.t(Jt)&&!t.t(n[e]?.SeparateTable))if(t.t(l)){let u=n[e]?.Writable;(t.t(u)&&t.str(l)==="1"||t.str(l)==="2")&&(l="yes"),l="-"+t.str(t.t(u)?l:""),t.t(u)&&t.t(t.band(t.t(V=n[e]?.Protected)?V:0,1))&&(l=t.str(l)+"!"),(t.t(n[e]?.List)||t.t(n[e]?.IsList))&&(l=t.str(l)+"+"),n[e]?.Permanent!==void 0?t.t(n[e]?.Permanent)||(l=t.str(l)+"^"):s?.PERMANENT!==void 0&&(t.t(s?.PERMANENT)||(l=t.str(l)+"^"))}else l="-";else{let u;if(t.t(l))for(let _ of["PrintConv","ValueConv"])t.t(n[e]?.[t.k(_)])&&n[e]?.[t.str(_)+"Inv"]===void 0&&(!t.ex(n[e],t.str(_)+"Inv")&&(t.m(t.ref(n[e]?.[t.k(_)]),/^(HASH|ARRAY)(?=\n?(?![\s\S]))/)||t.t(n[e]?.WriteAlso))||(t.str(_)==="ValueConv"?l=void 0:u=1));if(!t.t(l))l="no";else{(t.str(l)==="1"||t.str(l)==="2")&&(l=t.t(o)?o:"yes");let _=t.t(At=n[e]?.Count)?At:1;if(t.t(l)&&t.t(o)&&t.str(l)!==t.str(o)&&t.str(l)!=="string"&&t.str(o)!=="string"&&t.t(Zt.formatNumber[t.k(l)])&&t.t(Zt.formatNumber[t.k(o)])){let b=Zt.formatNumber[t.k(o)],Mt=Zt.formatNumber[t.k(l)];_=t.num(_)*t.div(Zt.formatSize.at(b),Zt.formatSize.at(Mt))}t.num(_)!==1&&(t.num(_)<0&&(_="n"),l=t.str(l)+`[${t.str(_)}]`),t.t(u)&&(l=t.str(l)+"~"),t.t(n[e]?.Protected)&&(t.t(t.band(n[e]?.Protected,2))&&(l=t.str(l)+"*"),t.t(t.band(n[e]?.Protected,1))&&(l=t.str(l)+"!")),t.t(n[e]?.Avoid)&&(l=t.str(l)+"/")}t.t(ht)&&(l="=struct"),n[e]?.Flat!==void 0&&(l=t.str(l)+"_"),(t.t(n[e]?.List)||t.t(n[e]?.IsList))&&(l=t.str(l)+"+"),t.t(n[e]?.Mandatory)&&(l=t.str(l)+":"),n[e]?.Permanent!==void 0?t.t(n[e]?.Permanent)||(l=t.str(l)+"^"):s?.PERMANENT!==void 0&&(t.t(s?.PERMANENT)||(l=t.str(l)+"^")),t.t(Jt)&&(l=`-${t.str(l)}`)}let et=t.lc(i);if(t.t(vt[t.k(et)])&&t.str(M)!=="Shortcuts"&&(t.t(n[e]?.Writable)||!t.t(n[e]?.SubDirectory))&&t.warn([`WARNING: ${t.str(M)} ${t.str(i)} is a shortcut tag!
`]),t.t(n[e]?.Unknown)&&(i=t.str(i)+"?"),wt.length>0&&t.str(wt.at(-1))===t.str(i)&&t.str(Rt.at(-1))===t.str(ae)&&t.str(be.at(-1))===t.str(l)||(wt.push(i),Rt.push(ae),be.push(l)),t.t(J)||t.t(y))continue;if(t.t(n[e]?.SubDirectory)){if(t.t(q?.NO_LOOKUP))continue;t.t(bt[t.k(et)])||(bt[t.k(et)]=0),bt[t.k(et)]=t.num(bt[t.k(et)])+1}else if(Dt["total tags"]=t.num(Dt["total tags"])+1,t.t(Vt[t.k(et)])&&(!t.t(bt[t.k(et)])||t.num(bt[t.k(et)])===t.num(Vt[t.k(et)]))||t.t(Ft[t.k(et)])||(Dt["unique tag names"]=t.num(Dt["unique tag names"])+1),t.t(q?.NO_LOOKUP)){Ft[t.k(et)]=1;continue}t.t(Vt[t.k(et)])||(Vt[t.k(et)]=0),Vt[t.k(et)]=t.num(Vt[t.k(et)])+1;let We=n[e]?.Writable;if(!(t.t(dt)&&(t.t(We)||t.t(s?.WRITABLE)&&We===void 0&&!t.t(n[e]?.SubDirectory))))continue;t.t(re[t.k(et)])||(re[t.k(et)]=a({})),t.t(n[e]?.RootTagInfo)&&(t.t(Lt[t.k(et)])||(Lt[t.k(et)]=a({})),t.hv(Lt,t.k(et))[t.k(Pt)]=n[e]?.RootTagInfo?.TagID);let jt=re[t.k(et)]?.[t.k(Pt)];if(t.t(jt))if(t.str(t.ref(jt))==="HASH"){(jt??(jt=a({})))[t.k(m[g])]=1;continue}else{if(t.str(m[g])===t.str(jt))continue;jt=t.hl([jt,1,m[g],1])}else jt=m[g];Ht[t.k(I[c])]=1,t.hv(re,t.k(et))[t.k(Pt)]=jt,t.t(n[e]?.Module)&&(oe[t.k(et)]=n[e]?.Module)}let Et;if(t.m(m[g],/^(-)?\d+(\.\d+)?(?=\n?(?![\s\S]))/))t.t(t.$1)?Et=m[g]:Y!==void 0?t.str(Y)==="hex"?Et=t.sprintf("0x%.4x",m[g]):t.str(Y)==="str"?Et=`'${t.str(m[g])}'`:Et=m[g]:!t.t(t.$2)&&!t.t(Nt)&&!t.t(W)&&!(t.m(M,/^CanonCustom/)&&t.num(m[g])<256)?Et=t.sprintf("0x%.4x",m[g]):t.num(m[g])<65536?Et=m[g]:Et=t.sprintf("0x%.8x",m[g]);else if(t.str(M)==="DICOM")Et=m[g],Et=t.s(Et,/_/,",",!1);else if(t.m(m[g],/^0x([0-9a-f]+)\.(\d+)(?=\n?(?![\s\S]))/))Et=m[g];else if(m[g]=t.s(m[g],/([\x00-\x1f\x7f-\xff])/,()=>"\\x"+t.str(t.unpack("H*",t.$1)[0]),!0),t.SC>0){if(m[g]=t.s(m[g],/\\x00/,"\\0",!0),t.str(m[g])==="jP\\x1a\\x1a")continue;Et=`"${t.str(m[g])}"`}else Et=`'${t.str(m[g])}'`;let ne=t.len(Et);t.num(It[t.k(I[c])])<t.num(ne)&&(It[t.k(I[c])]=ne);for(let n of wt)ne=t.len(n),t.num(f[t.k(I[c])])<t.num(ne)&&(f[t.k(I[c])]=ne);(ge??(ge=[])).push([Et,wt,be,C,ce,Rt])}if(t.t(p)&&t.t(s?.WRITABLE)){let m=a({IS_OFFSET:U,IS_SUBDIR:ct,DATAMEMBER:R}),g,tt;for(let wt of t.sort([...t.keys(m)])){let le=m[t.k(wt)];if(t.t(s?.[t.k(wt)]))for(let C of t.A(s?.[t.k(wt)])){if(t.t(le?.[t.k(C)])){t.del(le,t.k(C));continue}t.warn([t.sprintf(`Warning: Extra %s for %s tag %d (0x%.4x)
`,wt,M,C,C)])}for(let C of t.sort([...t.keys(le)]))t.warn([t.sprintf(`Warning: Missing %s for %s %s, tag %s (0x%.4x)
`,wt,M,le?.[t.k(C)],C,C)])}}}let F;for(let I of t.keys(at)){let c=Ct[t.k(I)],M=t.str(t.m(I,/ /)?"":"XMP ")+`${t.str(I)} Struct`,ge=$t[t.k(M)]=[],y,s=t.t(lt=c?.SORT_ORDER)?lt:[...t.sort([...t.keys(c)])];for(let J of t.A(s)){let U=c?.[t.k(J)];if(!(t.str(t.ref(U))==="HASH"&&t.str(J)!=="NAMESPACE"&&t.str(J)!=="GROUPS"))continue;t.t(st.specialTags[t.k(J)])&&t.warn([`WARNING: ${t.str(I)} Struct containes ${t.str(J)}
`]);let R=U?.Writable,ct=[];t.t(R)||(R=U?.Struct,t.t(t.ref(R))&&(R=R?.STRUCT_NAME),t.t(R)?(ct.push(R),at[t.k(R)]=1,R=`=${t.str(R)}`):U?.Writable!==void 0?R="no":R="string"),(t.t(U?.List)||t.t(U?.IsList))&&(R=t.str(R)+"+"),t.t(U?.Notes)&&ct.push(`(${t.str(U?.Notes)})`);let Pt=U?.PrintConv;if(t.str(t.ref(Pt))==="HASH")for(let dt of t.sort([...t.keys(Pt)],(q,it)=>te(q,it)))t.m(dt,/^(OTHER|BITMASK)(?=\n?(?![\s\S]))/)||ct.push(`${t.str(dt)} = ${t.str(Pt?.[t.k(dt)])}`);(ge??(ge=[])).push([J,[t.t(P=U?.Name)?P:t.ucfirst(J)],[R],ct,[],[]])}}return d}finally{t.M=rt}}function Ke(...T){let O;const h=t.M;try{let w,[k,L]=T,H=k?.TAG_LOOKUP,N=k?.TAG_EXISTS,E=k?.FLATTENED,z=k?.TABLE_WRITABLE,X=`${t.str(L)}_tmp`;if(!t.t(t.open(t.globRef("INFILE"),L)))return t.warn([`Can't open ${t.str(L)}
`]),0;if(!t.t(t.open(t.globRef("OUTFILE"),`>${t.str(X)}`)))return t.warn([`Can't create temporary file ${t.str(X)}
`]),t.close(t.glob("INFILE")),0;let r;for(;(t.$_=t.readline(t.glob("INFILE")))!==void 0&&t.t(t.print(t.glob("OUTFILE"),[w]));)if(t.m(w,/^#\+{4} Begin/)){r=1;break}t.print(t.glob("OUTFILE"),[`
# list of tables containing writable tags
`]),t.print(t.glob("OUTFILE"),[`my @tableList = (
`]);let $=t.sort([...t.keys(D.allTables)]),B,x=a({}),v=0,V=0;for(let P of $)t.t(z?.[t.k(P)])&&(t.print(t.glob("OUTFILE"),[`	'${t.str(P)}',
`]),x[t.k(v)]=(O=t.num(V),V=O+1,O)),v=t.num(v)+1;let At;for(let P of["filename","directory"]){if(!t.t(H?.[t.k(P)]))continue;let rt=t.keys(H?.[t.k(P)]).length;t.num(rt)>1&&t.warn([`Warning: ${t.str(rt)} writable '${t.str(P)}' tags!
`])}t.print(t.glob("OUTFILE"),[`);

# lookup for all writable tags
my %tagLookup = (
`]);for(let P of t.sort([...t.keys(H)])){t.print(t.glob("OUTFILE"),[`	'${t.str(P)}' => { `]);let rt=t.sort([...t.keys(H?.[t.k(P)])],(Tt,d)=>t.ncmp(Tt,d)),kt=[],ft;for(let Tt of rt){let d=H?.[t.k(P)]?.[t.k(Tt)],bt=E?.[t.k(P)]?.[t.k(Tt)],vt;if(t.str(t.ref(d))==="HASH"||t.t(bt)){t.str(t.ref(d))!=="HASH"&&(d=t.hl([d,1]));let $t=t.sort([...t.keys(d)]);for(let ut=$t,It=0;It<ut.length;++It)if(t.m(ut[It],/^\d+(?=\n?(?![\s\S]))/))ut[It]=t.sprintf("0x%x",ut[It]);else{let f="'";ut[It]=t.s(ut[It],/([\x00-\x1f,\x7f-\xff])/,()=>t.sprintf("\\x%.2x",t.ord(t.$1)),!0),t.SC>0&&(f='"'),ut[It]=t.str(f)+t.str(ut[It])+t.str(f)}t.t(bt)&&$t.unshift(`\\'${t.str(bt)}'`),vt="["+t.join(",",[...$t])+"]"}else if(t.m(d,/^\d+(?=\n?(?![\s\S]))/))vt=t.sprintf("0x%x",d);else{let $t="'";d=t.s(d,/([\x00-\x1f,\x7f-\xff])/,()=>t.sprintf("\\x%.2x",t.ord(t.$1)),!0),t.SC>0&&($t='"'),vt=`${t.str($t)}${t.str(d)}${t.str($t)}`}let Dt=x[t.k(Tt)];kt.push(`${t.str(Dt)} => ${t.str(vt)}`)}t.print(t.glob("OUTFILE"),[t.join(", ",[...kt])]),t.print(t.glob("OUTFILE"),[` },
`])}t.print(t.glob("OUTFILE"),[`);

# lookup for non-writable tags to check if the name exists
`]),t.print(t.glob("OUTFILE"),[`my %tagExists = (
`]);for(let P of t.sort([...t.keys(N)]))t.t(H?.[t.k(P)])||t.print(t.glob("OUTFILE"),[`	'${t.str(P)}' => 1,
`]);let lt=k?.COMPOSITE_MODULES;t.print(t.glob("OUTFILE"),[`);

# module names for writable Composite tags
`]),t.print(t.glob("OUTFILE"),[`my %compositeModules = (
`]);for(let P of t.sort([...t.keys(lt)]))t.print(t.glob("OUTFILE"),[`	'${t.str(P)}' => '${t.str(lt?.[t.k(P)])}',
`]);if(t.print(t.glob("OUTFILE"),[`);

`]),t.t(r))for(r=0;(t.$_=t.readline(t.glob("INFILE")))!==void 0;)(t.t(r)||t.m(w,/^#\+{4} End/))&&(t.print(t.glob("OUTFILE"),[w]),r=1);if(t.close(t.glob("INFILE")),t.t(t.close(t.glob("OUTFILE")))||(r=0),t.t(r)){if(!t.t(t.open(t.globRef("ORG"),L))||!t.t(t.open(t.globRef("TMP"),X)))return 0;let P,rt,kt;for(;;){let ft=t.read(t.glob("ORG"),t.lv(()=>P,d=>P=d),65536),Tt=t.read(t.glob("TMP"),t.lv(()=>rt,d=>rt=d),65536);if(t.str(ft)!==t.str(Tt)){kt=1;break}if(!t.t(ft))break;if(t.str(P)!==t.str(rt)){kt=1;break}}t.close(t.glob("ORG")),t.close(t.glob("TMP")),t.t(kt)?t.t(t.sys("rename",[X,L]))||(t.warn([`Error renaming ${t.str(X)}
`]),r=0):t.sys("unlink",[X])}else t.sys("unlink",[X]),t.warn([`Error rewriting file
`]);return r}finally{t.M=h}}function te(T,O){let h;const w=t.M;try{let k,L,H;if(t.m(O,/^(-?[0-9]+)(\.(\d*))?(?=\n?(?![\s\S]))/)&&([L,H]=[t.$1,t.$3]),t.m(T,/^(-?[0-9]+)(\.(\d*))?(?=\n?(?![\s\S]))/))if(L!==void 0){t.num(_t)===2&&t.num(L)<0&&(L=t.num(L)+1e9);let N=t.$1;if(t.num(_t)===2&&t.num(N)<0&&(N=t.num(N)+1e9),k=t.ncmp(N,L),!t.t(k)){let E=t.t(t.$3)?t.$3:0;t.t(H)||(H=0),k=t.ncmp(E,H)}}else k=-t.num(_t);else if(L!==void 0)k=_t;else{let[N,E]=[T,O];t.m(N,/^(APP|DMC-\w+ |dvtm_[^\n]*|(IDB|SHB)-)?[.0-9 ]*(?=\n?(?![\s\S]))/)&&t.num(t.len(N))<23&&(N=t.s(N,/(\d+)/,()=>t.sprintf("%.3d",t.$1),!0)),t.m(E,/^(APP|DMC-\w+ |dvtm_[^\n]*|(IDB|SHB)-)?[.0-9 ]*(?=\n?(?![\s\S]))/)&&t.num(t.len(E))<23&&(E=t.s(E,/(\d+)/,()=>t.sprintf("%.3d",t.$1),!0)),t.t(ue)&&(k=t.scmp(t.lc(N),t.lc(E))),t.t(k)||(k=t.scmp(N,E))}return k}finally{t.M=w}}function me(...T){const O=t.M;try{let h=T.shift(),w;for(;T.length>0;)h=t.str(h)+t.str(T.shift());return h=t.s(h,/\n~/,`
=`,!0),h=t.s(h,/L<[^>]+?\|(http[^>]+)>/,()=>`L<${t.str(t.$1)}>`,!0),h=t.s(h,/L<([^>]+?)\|[^>]+\.html(#\w+)?>/,()=>`${t.str(t.$1)}`,!0),h}finally{t.M=O}}function Ut(...T){const O=t.M;try{let h=se.EscapeHTML(T.shift());return h=t.s(h,/\n\n/,`</p>

<p>`,!0),h=t.s(h,/B&lt;([\s\S]*?)&gt;/,()=>`<b>${t.str(t.$1)}</b>`,!0),h=t.s(h,/C&lt;([\s\S]*?)&gt;/,()=>`<code>${t.str(t.$1)}</code>`,!0),h=t.s(h,/I&lt;([\s\S]*?)&gt;/,()=>`<i>${t.str(t.$1)}</i>`,!0),h=t.s(h,t.re("L&lt;([^&]+?)\\|"+t.restr(t.quotemeta(Te))+"/(.*?)&gt;","s"),()=>`<a href="../${t.str(t.$2)}">${t.str(t.$1)}</a>`,!0),h=t.s(h,t.re("L&lt;"+t.restr(t.quotemeta(Te))+"/(.*?)&gt;","s"),()=>`<a href="../${t.str(t.$1)}">${t.str(t.$1)}</a>`,!0),h=t.s(h,/L&lt;([^&]+?)\|Image::ExifTool::TagNames\/(\w+) ([^\/&|]+) Tags&gt;/,()=>`<a href="${t.str(t.$2)}.html#${t.str(t.$3)}">${t.str(t.$1)}</a>`,!0),h=t.s(h,/L&lt;([^&]+?)\|Image::ExifTool::TagNames\/(\w+) Tags&gt;/,()=>`<a href="${t.str(t.$2)}.html">${t.str(t.$1)}</a>`,!0),h=t.s(h,/L&lt;([^&]+?)\|\/\w+ ([^\/&|]+) Tags&gt;/,()=>`<a href="#${t.str(t.$2)}">${t.str(t.$1)}</a>`,!0),h=t.s(h,/L&lt;([^&]+?)\|([\s\S]+?)&gt;/,()=>`<a href="${t.str(t.$2)}">${t.str(t.$1)}</a>`,!0),h=t.s(h,/L&lt;(http[\s\S]*?)&gt;/,()=>`<a href="${t.str(t.$1)}">${t.str(t.$1)}</a>`,!0),h}finally{t.M=O}}function Re(...T){const O=t.M;try{let h,[w,k]=T,L=t.sort([...t.keys(k)]),H=[],N=a({}),E=a({}),z;for(;L.length>0;){let r=L.shift(),$=k?.[t.k(r)];if(t.t(k?.[t.k($)])){L.push(r);continue}t.del(k,t.k(r));let B=[...t.A(w)].filter(V=>t.m(V,t.re("^Image::ExifTool::"+t.restr(r)+"\\b",""))),x=[...t.A(w)].filter(V=>!t.m(V,t.re("^Image::ExifTool::"+t.restr(r)+"\\b",""))),v=[];for(;x.length>0&&!t.m(x.at(-1),t.re("^Image::ExifTool::"+t.restr($)+"\\b",""));)v.unshift(x.pop());t.aset(w??(w=[]),[...x,...B,...v])}for(let r of t.A(w))t.m(r,/^Image::ExifTool::(\w+)::(\w+)/)?(t.str(t.$2)==="Main"&&(N[t.k(t.$1)]=1),t.t(E[t.k(t.$1)])||H.push(E[t.k(t.$1)]=[]),t.av(E,t.k(t.$1)).push(r)):H.push(r);let X=["Image::ExifTool::MWG::Composite"];for(let r of t.A(E.MWG))t.m(r,/Composite/)||X.push(r);t.aset(t.av(E,"MWG"),[...X]),t.aset(w??(w=[]),[]);for(let r of H){if(!t.t(t.ref(r))){(w??(w=[])).push(r);continue}t.m(r?.[0],/^Image::ExifTool::(\w+)::(\w+)/)||t.die(["Internal error"]);let $=`Image::ExifTool::${t.str(t.$1)}::Main`;t.t(N[t.k(t.$1)])&&(w??(w=[])).push($);for(let B of t.A(r))t.str(B)!==t.str($)&&(w??(w=[])).push(B)}}finally{t.M=O}}function Se(T){let O,h,w,k=t.t(O=T?.VARS)?O:a({}),L=t.L(st.TagTableKeys(T));if(t.t(k?.ID_FMT)&&t.str(k?.ID_FMT)==="none"){let H,N=a({});for(let E of L){let[z]=t.L(st.GetTagInfoList(T,E));N[t.k(E)]=z?.Name}return t.RL(t.sort([...L],(E,z)=>t.t(h=t.scmp(N[t.k(E)],N[t.k(z)]))?h:t.scmp(E,z)),"last")}else{let H=t.t(w=k?.SORT_PROC)?w:t.subref(D,"NumbersFirst");return t.RL(t.sort([...L],(N,E)=>t.sc(t.cr(H,D)(N,E))),"last")}}function De(...T){let O,h;const w=t.M;try{let k=a({}),L=[...D.tableOrder],H=[],N=a({}),E=[],z="";for(;L.length>0;){let x=L.shift();if(t.t(k[t.k(x)]))continue;t.m(x,/^Image::ExifTool::(\w+)::Main/)?N[t.k(t.$1)]=1:t.t(z)&&!t.m(x,t.re("^"+t.restr(z)+"::",""))&&E.push(x),[z]=t.ml(x,/^(Image::ExifTool::\w+)/),H.push(x),k[t.k(x)]=1;let v=st.GetTagTable(x),V=[];ue=t.t(h=v?.GROUPS)?t.str(v?.GROUPS?.[0])==="XMP"?1:"":h,t.t(v?.VARS)&&t.t(v?.VARS?.ALPHA_FIRST)&&(_t=-1);let At=t.L(Se(v));_t=1;for(let lt of At){let P=t.L(st.GetTagInfoList(v,lt)),rt;for(let kt of P){let ft;t.t(ft=kt?.SubDirectory)&&t.t(x=ft?.TagTable)&&(t.t(k[t.k(x)])||V.push(x))}}L.unshift(...V)}let X=a({});for(let x of E)t.m(x,/^Image::ExifTool::(\w+)/)&&t.t(N[t.k(t.$1)])&&(X[t.k(t.$1)]=[]);let r=[],$=a({}),B;for(let x of H)if(t.m(x,/^Image::ExifTool::(\w+)/)&&t.t(X[t.k(t.$1)])){let v=X[t.k(t.$1)];t.A(v).length>0||(B=r.length,t.t($[t.k(B)])||($[t.k(B)]=[]),t.av($,t.k(B)).push(t.$1)),(v??(v=[])).push(x)}else r.push(x);for(let x of t.sort([...t.keys($)],(v,V)=>t.ncmp(V,v))){let v=$[t.k(x)];for(let V of t.A(v))t.splice(r,x,0,...t.A(X[t.k(V)])).at(-1)}return r.push(...T),Re(r,ve),t.RL(r,"count")}finally{t.M=w}}function Ee(T,O,h){const w=t.M;try{let k,L,H,N,E,z="";if(t.t(O)){let X=t.split(" ",O);E=X.shift(),k=`${t.str(T)}/TagNames/${t.str(E)}.html`,L=O,t.m(L,/^[^\t\n\v\f\r ]+ [^\n]+ Struct(?=\n?(?![\s\S]))/)?X.pop():L=t.str(L)+t.str(t.t(h)?" Values":" Tags"),H=L,H=t.s(H,/ [^\n]* /," ",!1),X.length>0&&(N=t.join("_",[...X]))}else k=`${t.str(T)}/TagNames/index.html`,O=E="ExifTool",L=H="ExifTool Tag Names";if(t.t(we[t.k(k)])){if(!t.t(t.open(t.globRef("HTMLFILE"),`>>${t.str(k)}_tmp`)))return 0}else{if(!t.t(t.open(t.globRef("HTMLFILE"),`>${t.str(k)}_tmp`)))return 0;if(t.print(t.glob("HTMLFILE"),[`${t.str(xe)}<html>
`]),t.print(t.glob("HTMLFILE"),[`<!-- (this file generated automatically by Image::ExifTool::BuildTagLookup) -->
`]),t.print(t.glob("HTMLFILE"),[`<head>
<title>${t.str(H)}</title>
`]),t.print(t.glob("HTMLFILE"),[`<link rel=stylesheet type='text/css' href='style.css' title='Style'>
`]),t.print(t.glob("HTMLFILE"),[`</head>
<body>
`]),t.str(O)!==t.str(E)&&t.t(gt[t.k(E)])){if(!t.t(t.print(t.glob("HTMLFILE"),[`<h2 class=top>${t.str(E)} Tags</h2>
`]))||!t.t(t.print(t.glob("HTMLFILE"),["<p>",Ut(gt[t.k(E)]),`</p>
`])))return 0}else z=" class=top"}return t.t(N)&&(L=`<a name='${t.str(N)}'>${t.str(L)}</a>`),t.t(t.print(t.glob("HTMLFILE"),[`<h2${t.str(z)}>${t.str(L)}</h2>
`]))?(t.t(gt[t.k(O)])&&t.print(t.glob("HTMLFILE"),["<p>",Ut(gt[t.k(O)]),`</p>
`]),we[t.k(k)]=1,1):0}finally{t.M=w}}function Oe(T){const O=t.M;try{let h=T?.PRESERVE_DATE,w=1,[k,L,H,N,E,z]=t.localtime(),X=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];z=t.num(z)+1900;let r=`${t.str(X.at(E))} ${t.str(N)}, ${t.str(z)}`,$,B=0,x=0;for(let v of t.keys(we)){let V=t.str(v)+"_tmp",At=r;if(t.t(h)){let P=[`grep '<i>Last revised' ${t.str(v)}`];P.length>0&&t.m(P.at(-1),/<i>Last revised ([^\n]*)<\/i>/)&&(At=t.$1)}if(!t.t(t.open(t.globRef("HTMLFILE"),`>>${t.str(V)}`))){w=0;continue}t.print(t.glob("HTMLFILE"),[`<hr>
`]),t.print(t.glob("HTMLFILE"),[`(This document generated automatically by Image::ExifTool::BuildTagLookup)
`]),t.str(v)==="html/TagNames/index.html"&&t.print(t.glob("HTMLFILE"),[`<br><i>Created ${t.str(ye)}</i>
`]),t.print(t.glob("HTMLFILE"),[`<br><i>Last revised ${t.str(At)}</i>
`]),t.print(t.glob("HTMLFILE"),["<p class=lf><a href="]),t.m(v,/index\.html(?=\n?(?![\s\S]))/)?t.print(t.glob("HTMLFILE"),[`'../index.html'>&lt;-- Back to ExifTool home page</a></p>
`]):t.print(t.glob("HTMLFILE"),[`'index.html'>&lt;-- ExifTool Tag Names</a></p>
`]),t.t(t.print(t.glob("HTMLFILE"),[`</body>
</html>
`]))||(w=0),t.t(t.close(t.glob("HTMLFILE")))||(w=0);let lt;if(t.t(w)){if(!t.t(t.open(t.globRef("TEMPFILE"),V))){w=0;break}if(t.t(t.open(t.globRef("HTMLFILE"),v))){for(;(t.$_=t.readline(t.glob("HTMLFILE")))!==void 0;){let P=t.readline(t.glob("TEMPFILE"));if(!(P!==void 0&&(t.m(t.$_,/^<br><i>Last revised/)||t.str(t.$_)===t.str(P)))){lt=1;break}}t.t(t.readline(t.glob("TEMPFILE")))&&(lt=1),t.close(t.glob("HTMLFILE"))}else lt=1;t.close(t.glob("TEMPFILE")),t.t(lt)?(B=t.num(B)+1,t.t(t.sys("rename",[V,v]))||(t.warn([`Error renaming temporary file
`]),w=0)):(x=t.num(x)+1,t.sys("unlink",[V]))}if(!t.t(w))break}return t.hv(T??(T=a({})),"COUNT")["HTML files changed"]=B,t.hv(T??(T=a({})),"COUNT")["HTML files unchanged"]=x,w}finally{t.M=O}}function pe(T){const O=t.M;try{return t.m(T,/^\[val( >> (\d+))? \& (0x[\da-f]+)\]/)?t.sprintf(" & 0x%.2x",t.shl(t.hex(t.$3),t.t(t.$2)?t.$2:0)):""}finally{t.M=O}}function Qe(T,O,h){let w,k,L,H,N,E,z;const X=t.M;try{let r,$,B,x=[],v=[],V;if(!t.t(V=T?.TAG_NAME_INFO))return 0;let At=T?.ID_LOOKUP,lt=T?.SHORT_NAME,P=T?.SEPARATE_TABLE,rt=T?.STRUCTURES,kt=T?.STRUCT_LOOKUP,ft=1,Tt=6,d=t.int(t.div(100,Tt));if(!t.t(t.open(t.globRef("PODFILE"),`>${t.str(O)}`))||(gt.ExifTool=t.sc(t.evalStr(`"${t.str(gt.ExifTool)}"`,()=>t.scope(D,{get $self(){return T},set $self(f){T=f},get $podFile(){return O},set $podFile(f){O=f},get $htmldir(){return h},set $htmldir(f){h=f},get $tableName(){return r},set $tableName(f){r=f},get $short(){return $},set $short(f){$=f},get $url(){return B},set $url(f){B=f},"@sepTables":x,"@structs":v,get $tagNameInfo(){return V},set $tagNameInfo(f){V=f},get $idLabel(){return At},set $idLabel(f){At=f},get $shortName(){return lt},set $shortName(f){lt=f},get $sepTable(){return P},set $sepTable(f){P=f},get $structs(){return rt},set $structs(f){rt=f},get $structLookup(){return kt},set $structLookup(f){kt=f},get $success(){return ft},set $success(f){ft=f},get $columns(){return Tt},set $columns(f){Tt=f},get $percent(){return d},set $percent(f){d=f},get $createDate(){return ye},set $createDate(f){ye=f},get $numbersFirst(){return _t},set $numbersFirst(f){_t=f},get $caseInsensitive(){return ue},set $caseInsensitive(f){ue=f},"@pluginTables":ke,get $noteFont(){return de},set $noteFont(f){de=f},get $noteFontSmall(){return Le},set $noteFontSmall(f){Le=f},get $docType(){return xe},set $docType(f){xe=f},get $homePage(){return Te},set $homePage(f){Te=f},"%tweakOrder":ve,"%formatOK":he,"%docs":gt,"%shortcutNotes":Fe,"%riffSpec":Ce,"%xmpSpec":_e,"%createdFiles":we}))),t.print(t.glob("PODFILE"),[me(gt.PodHeader,gt.ExifTool,gt.ExifTool2)]),t.sys("mkdir",[`${t.str(h)}/TagNames`,511]),!t.t(Ee(h))))return 0;t.print(t.glob("HTMLFILE"),[`<blockquote>
`]),t.print(t.glob("HTMLFILE"),[`<table width='100%' class=frame><tr><td>
`]),t.print(t.glob("HTMLFILE"),[`<table width='100%' class=inner cellspacing=1><tr class=h>
`]),t.print(t.glob("HTMLFILE"),[`<th colspan=${t.str(Tt)}><span class=l>Tag Table Index</span></th></tr>
`]),t.print(t.glob("HTMLFILE"),[`<tr class=b><td width='${t.str(d)}%'>
`]);let bt=t.L(De("Image::ExifTool::Shortcuts::Main",...ke)),vt="xxx",Dt=[],$t=[];for(let f of bt){$=lt?.[t.k(f)];let Bt=t.split(" ",$),Xt=Bt.shift();Bt.length>0&&t.str(Xt)!=="Other"?t.str(vt)!==t.str(Xt)&&(vt=Xt,Dt.push(vt),$t.push(vt)):(vt=$,$t.push(vt)),Dt.push(f)}bt=[...Dt];let ut=0,It=t.int(t.div(t.num($t.length)+t.num(Tt)-1,Tt));for(let f of $t)t.t(ut)&&(t.t(t.mod(ut,It))?t.print(t.glob("HTMLFILE"),[`<br>
`]):t.print(t.glob("HTMLFILE"),[`</td><td width='${t.str(d)}%'>
`])),$=lt?.[t.k(f)],t.t($)||($=f),B=`${t.str($)}.html`,t.m($,/^Other ([^\n]*)/)?($=t.$1,B="Other.html#"+t.str(t.$1)):B=`${t.str($)}.html`,t.print(t.glob("HTMLFILE"),[`<a href='${t.str(B)}'>${t.str($)}</a>`]),ut=t.num(ut)+1;for(t.print(t.glob("HTMLFILE"),[`
</td></tr></table></td></tr></table></blockquote>
`]),t.print(t.glob("HTMLFILE"),["<p>",Ut(gt.ExifTool2),`</p>
`]);bt.length>0||x.length>0||v.length>0;){for(;x.length>0;){r=x.shift();let y=P?.[t.k(r)];if(t.str(t.ref(y))!=="HASH")continue;(P??(P=a({})))[t.k(r)]=1;let s=y?.Notes;t.t(s)&&(s=t.s(s,/^[\t\n\v\f\r ]+/,"",!1),s=t.s(s,/[\t\n\v\f\r ]+(?=\n?(?![\s\S]))/,"",!1),s=t.s(s,/((?:(?<![\s\S])|(?<=\n))[ \t]+|[ \t]+(?=\n|(?![\s\S])))/,"",!0));let J=r;if(J=t.s(J,/^[\s\S]* /,"",!1),t.close(t.glob("HTMLFILE")),t.t(Ee(h,r,1))){t.t(s)&&t.print(t.glob("HTMLFILE"),["<p>",Ut(s),`</p>
`]),t.print(t.glob("HTMLFILE"),[`<blockquote>
`]),t.print(t.glob("HTMLFILE"),[`<table class=frame><tr><td>
`]),t.print(t.glob("HTMLFILE"),[`<table class='inner sep' cellspacing=1>
`]);let U=" class=r",R=0,ct=[],Pt=[];for(let W of t.sort([...t.keys(y)],(Z,p)=>te(Z,p))){if(t.m(W,/^(Notes|PrintHex|PrintInt|PrintString|OTHER|BITMASK)(?=\n?(?![\s\S]))/))continue;t.t(U)&&t.m(W,/[^\d]/)&&(U="");let Z=t.num(t.len(W))+t.num(t.len(y?.[t.k(W)]));t.num(R)<t.num(Z)&&(R=Z),ct.push(W),t.m(y?.[t.k(W)],/[\x00-\x1f\x7f-\xff]/)&&t.warn([`Warning: Special characters in ${t.str(r)} PrintConv (${t.str(y?.[t.k(W)])})
`])}let dt=y?.BITMASK;if(t.t(dt)){U="";for(let W of t.sort([...t.keys(dt)],(Z,p)=>te(Z,p))){let Z=t.num(t.len(W))+t.num(t.len(dt?.[t.k(W)]))+4;t.num(R)<t.num(Z)&&(R=Z),Pt.push(W),t.m(dt?.[t.k(W)],/[\x00-\x1f\x7f-\xff]/)&&t.warn([`Warning: Special characters in ${t.str(r)} PrintConv BITMASK (${t.str(dt?.[t.k(W)])})
`])}}t.num(R)<t.num(t.len(r))+7&&(R=t.num(t.len(r))+7);let q=t.int(t.div(110,t.num(R)+4)),it=t.num(ct.length)+t.num(Pt.length);(t.num(q)<1||t.num(q)>t.num(it)||t.num(it)<4)&&(q=1);let Nt=t.int(t.div(t.num(it)+t.num(q)-1,q)),pt,Y;for(t.print(t.glob("HTMLFILE"),["<tr class=h>"]),Y=0;t.num(Y)<t.num(q);Y=t.num(Y)+1)t.print(t.glob("HTMLFILE"),[`<th>Value</th><th>${t.str(J)}</th>`]);for(t.print(t.glob("HTMLFILE"),[`</tr>
`]),pt=0;t.num(pt)<t.num(Nt);pt=t.num(pt)+1){for(t.print(t.glob("HTMLFILE"),["<tr>"]),Y=0;t.num(Y)<t.num(q);Y=t.num(Y)+1){let W,Z,p,nt,Qt,m=t.num(pt)+t.num(Y)*t.num(Nt);t.num(m)<t.num(ct.length)?(W=ct.at(m),Z=y?.[t.k(W)]):t.num(m)<t.num(it)&&(Qt=1,W="Bit "+t.str(Pt.at(t.num(m)-t.num(ct.length))),Z=dt?.[t.k(Pt.at(t.num(m)-t.num(ct.length)))]),W!==void 0?(p=W,nt="= "+t.str(se.EscapeHTML(Z)),t.t(y?.PrintInt)&&(p=t.s(p,/\.\d+(?=\n?(?![\s\S]))/,"",!1)),t.t(y?.PrintHex)?(p=t.s(p,/(\.\d+)(?=\n?(?![\s\S]))/,"",!1),p=t.sprintf("0x%x",p),t.t(t.$1)&&(p=t.str(p)+t.str(t.$1))):(t.t(y?.PrintString)||!t.m(p,/^[+-]?(?=\d|\.\d)\d*(\.\d*)?(?=\n?(?![\s\S]))/))&&(p=se.EscapeHTML(p),t.t(Qt)||(p=`'${t.str(p)}'`))):p=nt="&nbsp;";let g,tt;t.t(t.band(Y,1))?(tt=" class=b",g=t.t(U)?" class='r b'":tt):(g=U,tt=""),t.print(t.glob("HTMLFILE"),[`<td${t.str(g)}>${t.str(p)}</td><td${t.str(tt)}>${t.str(nt)}</td>
`])}t.print(t.glob("HTMLFILE"),["</tr>"])}t.print(t.glob("HTMLFILE"),[`</table></td></tr></table></blockquote>

`])}}if(!(bt.length>0||v.length>0))break;let f;if(v.length>0){if(r=v.shift(),t.num(rt?.[t.k(r)])===2)continue;if((rt??(rt=a({})))[t.k(r)]=2,f=kt?.[t.k(r)],!t.t(f)){t.warn([`Missing structure ${t.str(r)}
`]);continue}t.m(r,/ /)||(r=`XMP ${t.str(r)}`),$=r=`${t.str(r)} Struct`;let y=0;for(let s of t.keys(f))t.num(y)<t.num(t.len(s))&&(y=t.len(s));t.hv(T??(T=a({})),"LONG_ID")[t.k(r)]=y}else if(r=bt.shift(),$=lt?.[t.k(r)],!t.t($)){t.print(t.glob("PODFILE"),[`
=head2 ${t.str(r)} Tags
`]),t.t(gt[t.k(r)])&&t.print(t.glob("PODFILE"),[me(gt[t.k(r)])]);continue}let Bt=t.str(r)==="Image::ExifTool::Exif::Main"?1:"",Xt=t.str(r)==="Image::ExifTool::RIFF::Info"?1:"",re=t.str(r)==="Image::ExifTool::XMP::Main"?1:"",Vt=V?.[t.k(r)],Ft=At?.[t.k(r)],Ht,qt,[mt,at,oe,Ot]=[8,36,24,10],Lt,Ct,j,Gt,Kt,ee=0;if(t.str($)==="Shortcuts")Ct="<th>Refers To</th>",Lt=2;else if(t.t(f))Ct="",j=f?.NOTES;else{let y=st.GetTagTable(r);if(j=y?.NOTES,t.t(y?.NAMESPACE)){let s=t.t(w=Me.stdXlatNS[t.k(y?.NAMESPACE)])?w:y?.NAMESPACE,J=`These tags belong to the ExifTool XMP-${t.str(s)} family 1 group.`;t.t(j)?(j=t.s(j,/[\t\n\v\f\r ]+(?=\n?(?![\s\S]))/,"",!1),j=t.str(j)+(`

`+t.str(J))):j=J}t.t(y?.VARS)&&(Gt=y?.VARS?.LONG_TAGS),t.str(y?.GROUPS?.[0])==="Composite"?(Lt=1,Ct="<th>Derived From</th>"):(Lt=0,Ct="")}let xt=T?.LONG_ID?.[t.k(r)];if(t.t(j)&&(j=t.s(j,/^[\t\n\v\f\r ]+/,"",!1),j=t.s(j,/[\t\n\v\f\r ]+(?=\n?(?![\s\S]))/,"",!1),j=t.s(j,/((?:(?<![\s\S])|(?<=\n))[ \t]+|[ \t]+(?=\n|(?![\s\S])))/,"",!0),t.m(j,/leading '([^\n]*?_)' which/)&&(Kt=t.$1,xt=t.num(xt)-t.num(t.len(Kt)))),t.num(xt)<=t.num(mt))xt=mt;else if(t.str($)==="DICOM")xt=10;else{let y=t.num(xt)<=10?12:20;t.num(xt)<t.num(y)&&(xt=y)}if(t.t(Ft)){Ht=`<th>${t.str(Ft)}</th>`,Ht=t.s(Ht,/ /,"&nbsp;",!0),at=t.num(at)-(t.num(xt)-t.num(mt)),mt=xt;let y=T?.LONG_NAME?.[t.k(r)];t.num(at)<t.num(y)&&(t.num(mt)-t.num(y)+t.num(at)>=6&&(mt=t.num(mt)-(t.num(y)-t.num(at)),at=y),t.num(mt)<=t.num(T?.LONG_ID?.[t.k(r)])&&(ee=t.num(ee)+1))}else t.t(Lt)?(at=t.num(at)+(t.num(mt)-t.num(oe)),Ht=""):(at=t.num(at)+9,Ht="");(t.str($)==="EXIF"||t.str($)==="Extra")&&(Ct="<th>Group</th>",qt=1,t.str($)==="Extra"&&(Ot=t.num(Ot)+8),at=t.num(at)-(t.num(Ot)+1));let He=t.m($,/ /)?"head3":"head2",Pe=t.t(f)?"":" Tags";t.print(t.glob("PODFILE"),[`
=${t.str(He)} ${t.str($)}${t.str(Pe)}
`]),t.t(gt[t.k($)])&&t.print(t.glob("PODFILE"),[me(gt[t.k($)])]),t.t(j)&&t.print(t.glob("PODFILE"),[`
`,me(j),`
`]);let F=`
`;t.t(Ft)?(t.str(Ft)==="Index"&&(Ft=` ${t.str(Ft)}`),F=t.str(F)+t.sprintf(`  %-${t.str(mt)}s`,Ft)):F=t.str(F)+" ";let I=t.str($)==="XMP"?"Namespace":t.str(t.t(f)?"Field":"Tag")+" Name";F=t.str(F)+t.sprintf(` %-${t.str(at)}s`,I),t.t(Lt)&&(F=t.str(F)+t.sprintf(` %-${t.str(oe)}s`,t.num(Lt)===2?"Refers To":"Derived From")),t.t(qt)&&(F=t.str(F)+t.sprintf(` %-${t.str(Ot)}s`,"Group")),F=t.str(F)+" Writable",t.print(t.glob("PODFILE"),[F]),F=t.s(F,/^([\t\n\v\f\r ]*\w[^\n]{6}\w) /,()=>`${t.str(t.$1)}	`,!1),F=t.s(F,/[^\t\n\v\f\r ]/,"-",!0),F=t.s(F,/- -/,"---",!0),F=t.tr(F,"\\t"," ",""),t.print(t.glob("PODFILE"),[F,`
`]),t.close(t.glob("HTMLFILE")),t.t(Ee(h,$))||(ft=0),t.t(j)&&t.print(t.glob("HTMLFILE"),["<p>",Ut(j),`</p>
`]),t.print(t.glob("HTMLFILE"),[`<blockquote>
`]),t.print(t.glob("HTMLFILE"),[`<table class=frame><tr><td>
`]),t.print(t.glob("HTMLFILE"),[`<table class=inner cellspacing=1>
`]),t.print(t.glob("HTMLFILE"),[`<tr class=h>${t.str(Ht)}<th>${t.str(I)}</th>
`]),t.print(t.glob("HTMLFILE"),[`<th>Writable</th>${t.str(Ct)}<th>Values / ${t.str(de)}Notes</span></th></tr>
`]);let c=1,M=0,ge;for(let y of t.A(Vt)){M=t.num(M)+1;let[s,J,U,R,ct,Pt]=t.A(y),dt,q,it,Nt,pt=at;if(!t.t(Ft))q="  ";else if(t.m(s,/^-?\d+(\.\d+)?(?=\n?(?![\s\S]))/)){it=t.num(mt)-3,q=t.sprintf(`  %${t.str(it)}g    `,s);let e=t.num(t.len(q))-6-t.num(it);t.t(e)&&(t.num(e)>3&&(e=3),q=t.substr(q,0,-t.num(e))),dt=" class=r"}else{t.t(Kt)&&(s=t.s(s,t.re("^'"+t.restr(Kt),""),"'",!1)),it=mt;let e=t.num(t.len(s))-t.num(it);t.num(e)>0&&(t.num(e)<=t.num(at)-t.num(t.len(J?.[0]))?(pt=t.num(pt)-t.num(e),it=t.num(it)+t.num(e),ee=t.num(ee)-1):(q=`  ${t.str(s)}
   `+t.str(t.rep(" ",t.num(it))),t.t(Gt)?Gt=t.num(Gt)-1:t.warn([`Notice: Split ${t.str(J?.[0])} line
`]))),q===void 0&&(q=t.sprintf(`  %-${t.str(it)}s `,s)),dt=""}let Y=[],W=[...t.A(J)],Z=[...t.A(Pt)],p=[...t.A(U)],nt=p.shift(),Qt,m=[...t.A(R)].filter(e=>t.m(e,/^\[val( >> \d+)? \& 0x[\da-f]+\]/)),g=W.shift();if(t.m(nt,/^[-=]/)){Qt=1,m.length>0?(nt=t.str(nt)+t.str(pe(m[0])),m.shift(),p=[...t.A(R)].filter(i=>!t.m(i,/^\[val( >> \d+)? \& 0x[\da-f]+\]/))):p=[...t.A(R)],t.m(p[0],/^\(/)&&t.num(p.length)>=t.num(t.A(U).length)&&p.shift();for(let i=p,o=0;o<i.length;++o)t.m(i[o],/^\(/)&&(i[o]="-");let e;for(e=0;t.num(e)<t.num(t.A(U).length);e=t.num(e)+1)p.at(e)===void 0&&(p[t.ix(e)]=U?.at(e)),m.length>0&&(p[t.ix(e)]=t.str(p[t.ix(e)])+t.str(pe(m[0])),m.shift());if(t.t(P?.[t.k(p[0])]))nt=t.s(nt,/^[-=]/,"",!1),t.t(nt)||(nt="no");else if(t.t(rt?.[t.k(p[0])])){let i=t.m(nt,/([+_]+)(?=\n?(?![\s\S]))/)?t.$1:"";nt=`${t.str(p[0])} Struct${t.str(i)}`}else nt=p[0];p.shift()}else if(t.t(nt)&&t.str(nt)!=="no"&&m.length>0){let e=m.shift();for(;t.num(m.length)>t.num(p.length)&&t.str(m.at(p.length))!==t.str(e);)p.push(nt),t.num(W.length)<t.num(p.length)&&W.push(g);nt=t.str(nt)+t.str(pe(e))}let tt=t.sprintf(`%s%-${t.str(pt)}s`,q,g),wt=Ot;if(t.t(Ft)&&t.num(t.len(g))>t.num(pt)){let e;if(t.t(qt)){let i=t.len(t.t(k=Z[0])?k:"-");!t.t(Lt)&&t.num(Ot)>t.num(i)&&(wt=t.num(Ot)-t.num(t.num(t.len(g))-t.num(pt)),t.num(wt)<t.num(t.len(i))?wt=t.len(i):e=1)}t.t(e)||t.warn([`Warning: Pushed ${t.str(g)}
`])}if(t.t(qt)&&(tt=t.str(tt)+t.sprintf(` %-${t.str(wt)}s`,t.t(L=Z.shift())?L:"-")),t.t(Lt)&&(Y=[...t.A(ct)],it=oe,t.num(t.len(g))>t.num(pt)&&(it=t.num(it)-(t.num(t.len(g))-t.num(pt))),tt=t.str(tt)+t.sprintf(` %-${t.str(it)}s`,t.t(H=Y.shift())?H:"")),tt=t.str(tt)+` ${t.str(nt)}`,t.num(t.len(tt))>82&&!t.m(tt,/\n/)){let e=t.num(t.len(tt))-82;tt=t.s(tt,t.re("(\\w)\\s{"+t.restr(e)+"}",""),()=>`${t.str(t.$1)}`,!1)}t.print(t.glob("PODFILE"),[tt,`
`]);let le=t.A(J).length,C=0;for(;W.length>0||Y.length>0||p.length>0;){let e=t.t(W.length)?W.length:Y.length;if(F="  ",t.t(Ft)&&(F=t.str(F)+t.rep(" ",t.num(t.num(mt)+1))),F=t.str(F)+t.sprintf(`%-${t.str(pt)}s`,t.t(N=W.shift())?N:""),t.t(Lt)&&(F=t.str(F)+t.sprintf(` %-${t.str(oe)}s`,t.t(E=Y.shift())?E:"")),t.t(qt)&&(F=t.str(F)+t.sprintf(` %-${t.str(Ot)}s`,t.t(z=Z.shift())?z:"-")),C=t.num(C)+1,p.length>0){let i=p.shift(),o=U?.at(C);if(t.t(Qt)&&(t.m(i,/^\(/)||t.m(i,/=/)||t.t(o)&&!t.m(o,/^[-=]/))){if(i=o,i!==void 0)i=t.s(i,/^[-=]/,"",!1);else if(!t.t(e))break}i!==void 0&&(F=t.str(F)+` ${t.str(i)}`,m.length>0&&(F=t.str(F)+t.str(pe(m[0])),m.shift()))}F=t.s(F,/[\t\n\v\f\r ]+(?=\n?(?![\s\S]))/,"",!1),t.print(t.glob("PODFILE"),[`${t.str(F)}
`])}let zt=[];for(let e of t.A(J))zt.push(se.EscapeHTML(e));if(t.t(Bt)&&t.t(Ne.exifSpec[t.k(t.hex(s))])||t.t(Xt)&&t.m(s,/(\w+)/)&&t.t(Ce[t.k(t.$1)])||t.t(re)&&t.m(s,/([-\w]+)/)&&t.t(_e[t.k(t.$1)])){let e=t.str(s)==="0x927c"?-1:0;zt[t.ix(e)]=`<u>${t.str(zt.at(e))}</u>`}c=t.t(c)?"":" class=b";let ce;if(t.m(U?.[0],/^[-=]/)){ce=1;for(let e=t.A(U),i=0;i<e.length;++i)e[i]=t.s(e[i],/^[-=]([^\n]+)/,()=>`${t.str(t.$1)}`,!1)}t.m(s,/^(0x[0-9a-f]+)(\.\d+)?(?=\n?(?![\s\S]))/i)?Nt=t.sprintf(` title='${t.str(s)} = %u%s'`,t.hex(t.$1),t.t(t.$2)?t.$2:""):t.m(s,/^(\d+)(\.\d*)?(?=\n?(?![\s\S]))/)?Nt=t.sprintf(" title='%u = 0x%x'",t.$1,t.$1):(Nt="",s=t.s(s,/^"\\xa9/,'"&copy;',!1),s=t.s(s,/>/,"&gt;",!0),s=t.s(s,/</,"&lt;",!0));let Rt="",be=a({_:"Flattened","+":"List","/":"Avoid","~":"Writable only with -n","!":"Unsafe","*":"Protected",":":"Mandatory","^":"Deletable"}),Et,ne=a({}),n=[];for(let e of t.A(U)){if(!t.m(e,/([+\/~!*:_^]+)(?=\n?(?![\s\S]))/))continue;let i=t.split(/(?:)/,t.$1);for(let o of i)t.t(ne[t.k(o)])||(n.push(o),ne[t.k(o)]=1)}if(n.length>0){Rt=" title='";let e=0;for(let i of n)t.t(e)&&(Rt=t.str(Rt)+`
`),Rt=t.str(Rt)+` ${t.str(i)} = ${t.str(be[t.k(i)])}`,e=t.num(e)+1;Rt=t.str(Rt)+"'"}if(t.print(t.glob("HTMLFILE"),[`<tr${t.str(c)}>
`]),t.t(Ft)&&t.print(t.glob("HTMLFILE"),[`<td${t.str(dt)}${t.str(Nt)}>${t.str(s)}</td>
`]),t.print(t.glob("HTMLFILE"),["<td>",t.join(`
  <br>`,[...zt]),`</td>
`]),t.print(t.glob("HTMLFILE"),[`<td class=c${t.str(Rt)}>`,t.join("<br>",[...t.A(U)]),`</td>
`]),t.t(Lt)&&t.print(t.glob("HTMLFILE"),["<td class=n>",t.join(`
  <br>`,[...t.A(ct)]),`</td>
`]),t.t(qt)&&t.print(t.glob("HTMLFILE"),["<td class=c>",t.join("<br>",[...t.A(Pt)]),`</td>
`]),t.print(t.glob("HTMLFILE"),["<td>"]),t.A(R).length>0)if(t.t(ce)){let e,i=[];for(let o=t.A(R),S=0;S<o.length;++S){if(t.m(o[S],/^\(/)){o[S]=Ut(o[S]),t.num(le)<2&&(e=1),i.push(t.str(t.t(e)?Le:de)+`${t.str(o[S])}</span>`);continue}if(t.m(o[S],/^\[/)){o[S]=t.s(o[S],/^\[!HTML\]/,"",!1),t.SC>0?i.push(o[S]):(o[S]=Ut(o[S]),i.push(`<span class=s>${t.str(o[S])}</span>`));continue}if(t.m(o[S],/=/)){i.push(o[S]);continue}let l=t.split(" ",o[S]),ie=" Tags";t.t(P?.[t.k(o[S])])&&(x.push(o[S]),ie=" Values"),t.t(rt?.[t.k(o[S])])&&(t.m(o[S],/ /)||l.unshift("XMP"),v.push(o[S]),t.str(o[S])==="Dimensions"&&v.push("Area"),ie=" Struct"),B=t.str(l.shift())+".html",l.length>0&&(B=t.str(B)+("#"+t.join("_",[...l]))),i.push(`--&gt; <a href='${t.str(B)}'>${t.str(o[S])}${t.str(ie)}</a>`)}t.t(e)&&i.push(i.shift()),t.print(t.glob("HTMLFILE"),[t.join(`
  <br>`,[...i])])}else{let[e,i]=["",""];for(let o=t.A(R),S=0;S<o.length;++S)o[S]=t.s(o[S],/^\[!HTML\]/,"",!1),t.SC>0?(t.t(e)&&t.print(t.glob("HTMLFILE"),[e]),t.print(t.glob("HTMLFILE"),[o[S]]),e=i=""):(t.m(o[S],/^\(/)?o[S]=t.str(de)+t.str(Ut(o[S]))+"</span>":o[S]=se.EscapeHTML(o[S]),t.t(e)||(o[S]=`<span class=s>${t.str(o[S])}`,e="</span>"),t.print(t.glob("HTMLFILE"),[i,o[S]]),i=`
  <br>`);t.t(e)&&t.print(t.glob("HTMLFILE"),[e])}else t.print(t.glob("HTMLFILE"),["&nbsp;"]);t.print(t.glob("HTMLFILE"),[`</td></tr>
`])}if(t.t(Gt)&&t.warn([`${t.str(Gt)} unaccounted-for long tags in ${t.str(r)}
`]),t.t(ee)&&Gt===void 0&&t.warn([`Notice: Long tags in ${t.str(r)} table
`]),!t.t(M)){t.print(t.glob("PODFILE"),[`  [no tags known]
`]);let y=3;t.t(Ht)&&(y=t.num(y)+1),t.t(Ct)&&(y=t.num(y)+1),t.print(t.glob("HTMLFILE"),[`<tr><td colspan=${t.str(y)} class=c><i>[no tags known]</i></td></tr>
`])}t.print(t.glob("HTMLFILE"),[`</table></td></tr></table></blockquote>

`])}return t.t(t.close(t.glob("HTMLFILE")))||(ft=0),t.t(Oe(T))||(ft=0),t.t(t.print(t.glob("PODFILE"),[me(gt.PodTrailer)]))||(ft=0),t.t(t.close(t.glob("PODFILE")))||(ft=0),ft}finally{t.M=X}}t.defsub(D,"new",qe),t.defsub(D,"WriteTagLookup",Ke),t.defsub(D,"NumbersFirst",te),t.defsub(D,"Doc2Pod",me),t.defsub(D,"Doc2Html",Ut),t.defsub(D,"TweakOrder",Re),t.defsub(D,"SortedTagTableKeys",Se),t.defsub(D,"GetTableOrder",De),t.defsub(D,"OpenHtmlFile",Ee),t.defsub(D,"CloseHtmlFiles",Oe),t.defsub(D,"PodMask",pe),t.defsub(D,"WriteTagNames",Qe),t.require("Exporter"),st.$configFile="",st.$debug=1,t.use("Image::ExifTool",D,[":Utils",":Vars"]),t.use("Image::ExifTool::Exif",D),t.use("Image::ExifTool::Shortcuts",D),t.use("Image::ExifTool::HTML",D,["EscapeHTML"]),t.use("Image::ExifTool::IPTC",D),t.use("Image::ExifTool::XMP",D),t.use("Image::ExifTool::Canon",D),t.use("Image::ExifTool::Nikon",D),t.use("Image::ExifTool::Sony",D),t.use("Image::ExifTool::Validate",D),t.use("Image::ExifTool::MacOS",D),D.$VERSION="3.69",t.aset(D.ISA,["Exporter"]);var ye="Feb 15, 2005",_t=1,ke=["Image::ExifTool::MWG::Composite"],de="<span class=n>",Le="<span class='n s'>",xe=`<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
        "http://www.w3.org/TR/html4/loose.dtd">
`,Te="https://exiftool.org",ve=a({JPEG:"-",IPTC:"Exif",GPS:"XMP",Composite:"Extra",CBOR:"JSON",GeoTiff:"GPS",CanonVRD:"CanonCustom",CaptureOne:"CanonVRD",DJI:"Casio",FLIR:"DJI",FujiFilm:"FLIR",Google:"GE",GoPro:"Google",Kodak:"JVC",Leaf:"Kodak",Lytro:"Leaf",Minolta:"Lytro",Motorola:"Minolta",Nikon:"Motorola",NikonCapture:"Nikon",NikonCustom:"NikonCapture",NikonSettings:"NikonCustom",Nintendo:"NikonSettings",Panasonic:"Olympus",Pentax:"Panasonic",Ricoh:"Reconyx",Samsung:"Ricoh",SonyIDC:"Sony",Unknown:"SonyIDC",DNG:"Unknown",PrintIM:"ICC_Profile",Vorbis:"Ogg",ID3:"PostScript",MinoltaRaw:"KyoceraRaw",KyoceraRaw:"CanonRaw",MinoltaRaw:"KyoceraRaw",PanasonicRaw:"MinoltaRaw",SigmaRaw:"PanasonicRaw",PhotoMechanic:"FotoStation",Microsoft:"PhotoMechanic",GIMP:"Microsoft",DarwinCore:"AFCP",MWG:"Shortcuts","FujiFilm::RAF":"FujiFilm::RAFHeader","FujiFilm::RAFData":"FujiFilm::RAF","QuickTime::AudioKeys":"QuickTime::Keys","QuickTime::VideoKeys":"QuickTime::AudioKeys"}),he=t.hl([...t.hlist(Zt.formatNumber),0,1,1,1,2,1,"real",1,"integer",1,"date",1,"boolean",1,"rational",1,"lang-alt",1,"fixed16u",1,"fixed16s",1,"fixed32u",1,"fixed32s",1,"extended",1,"resize",1,"digits",1,"int16uRev",1,"int32uRev",1,"rational32u",1,"rational32s",1,"pstring",1,"var_string",1,"var_int16u",1,"var_pstr32",1,"var_ustr32",1,"var_ue7",1,"signed",1,"unsigned",1,"utf8",1,"Unicode",1,"GUID",1,"vt_filetime",1]),gt=a({PodHeader:`
~head1 NAME

Image::ExifTool::TagNames - ExifTool tag name documentation

~head1 DESCRIPTION

This document contains a complete list of ExifTool tag names, organized into
tables based on information type.  Tag names are used to reference specific
meta information extracted from or written to a file.

~head1 TAG TABLES
`,ExifTool:`
The tables listed below give the names of all tags recognized by ExifTool.
They contain a total of $$self{COUNT}{'total tags'} tags, with $$self{COUNT}{'unique tag names'} unique tag names.
`,ExifTool2:`
B<Tag ID>, B<Index#> or B<Sequence> is given in the first column of each
table.  A B<Tag ID> is the computer-readable equivalent of a tag name, and
is the identifier that is actually stored in the file.  B<Index#> refers to
the offset of a value when found at a fixed position within a data block
(B<#> is the multiplier for calculating a byte offset: B<1>, B<2>, B<4> or
B<8>).  These offsets may have a decimal part which is used only to
differentiate tags with values stored at the same position.  (Note that
writable tags within binary data blocks are not individually deletable,
and the usual alternative is to set them to a value of zero.)  B<Sequence>
gives the order of values for a serial data stream.

A B<Tag Name> is the handle by which the information is accessed in
ExifTool.  In some instances, more than one name may correspond to a single
tag ID.  In these cases, the actual name used depends on the context in
which the information is found.  Valid characters in a tag name are A-Z,
a-z, 0-9, hyphen (-) and underline (_).  Case is not significant.  A
question mark (C<?>) after a tag name indicates that the information is
either not understood, not verified, or not very useful -- these tags are
not extracted by ExifTool unless the L<Unknown|../ExifTool.html#Unknown> (-u) option is enabled.  Be
aware that some tag names are different than the descriptions printed out by
default when extracting information with exiftool.  To see the tag names
instead of the descriptions, use C<exiftool -s>.

The B<Writable> column indicates whether the tag is writable by ExifTool.
Anything but a C<no> in this column means the tag is writable.  A C<yes>
indicates writable information that is either unformatted or written using
the existing format.  Other expressions give details about the format of the
stored value, and vary depending on the general type of information.  The
format name may be followed by a number in square brackets to indicate the
number of values written, or the number of characters in a fixed-length
string (including a null terminator which is added if required).

A plus sign (C<+>) after an entry in the B<Writable> column indicates a
I<List> tag which supports multiple values and allows individual values to
be added and deleted.  A slash (C</>) indicates a tag that ExifTool will
I<Avoid> when writing.  These will be edited but not created if another
same-named tag may be created instead.  To create these tags, the group
should be specified.  A tilde (C<~>) indicates a tag this is writable only
when the print conversion is disabled (by setting L<PrintConv|../ExifTool.html#PrintConv> to 0, using the
-n option, or suffixing the tag name with a C<#> character). An exclamation
point (C<!>) indicates a tag that is considered I<Unsafe> to write under
normal circumstances.  These tags are not written unless specified
explicitly (ie. not when wildcards or "all" are used), and care should be
taken when editing them manually since they may affect the way an image is
rendered.  An asterisk (C<*>) indicates a I<Protected> tag which is not
writable directly, but is written automatically by ExifTool (often when a
corresponding L<Composite|Image::ExifTool::TagNames/Composite Tags> or
L<Extra|Image::ExifTool::TagNames/Extra Tags> tag is written). A colon
(C<:>) indicates a I<Mandatory> tag which may be added automatically when
writing (use the API L<NoMandatory|../ExifTool.html#NoMandatory> option to avoid creating mandatory EXIF
tags).  Normally MakerNotes tags may not be deleted individually, but a
caret (C<^>) indicates a I<Deletable> MakerNotes tag.

The HTML version of these tables also lists possible B<Values> for
discrete-valued tags, as well as B<Notes> for some tags.  The B<Values> are
listed with the computer-readable values on the left of the equals sign
(C<=>), and the human-readable values on the right.  The human-readable
values are used by default when reading and writing, but the
computer-readable values may be accessed by disabling the value conversion
with the -n option on the command line, by setting the L<PrintConv|../ExifTool.html#PrintConv> option to 0
in the API, or or on a per-tag basis by adding a hash (C<#>) after the tag
name.

B<Note>: If you are familiar with common meta-information tag names, you may
find that some ExifTool tag names are different than expected.  The usual
reason for this is to make the tag names more consistent across different
types of meta information.  To determine a tag name, either consult this
documentation or run C<exiftool -s> on a file containing the information in
question.

I<(This documentation is the result of decades of research, testing and
reverse engineering, and is the most complete metadata tag list available
anywhere on the internet.  It is provided not only for ExifTool users, but
more importantly as a public service to help augment the collective
knowledge, and is often used as a primary source of information in the
development of other metadata software.  Please help keep this documentation
as accurate and complete as possible, and feed any new discoveries back to
ExifTool.  A big thanks to everyone who has helped with this so far!)>
`,EXIF:`
EXIF stands for "Exchangeable Image File Format".  This type of information
is formatted according to the TIFF specification, and may be found in JPG,
TIFF, PNG, JP2, PGF, MIFF, HDP, PSP and XCF images, as well as many
TIFF-based RAW images, and even some AVI and MOV videos.

The EXIF meta information is organized into different Image File Directories
(IFD's) within an image.  The names of these IFD's correspond to the
ExifTool family 1 group names.  When writing EXIF information, the default
B<Group> listed below is used unless another group is specified.

Mandatory tags (indicated by a colon after the B<Writable> type) may be
added automatically with default values when creating a new IFD, and the IFD
is removed automatically when deleting tags if only default-valued mandatory
tags remain.

The table below lists all EXIF tags.  Also listed are TIFF, DNG, HDP and
other tags which are not part of the EXIF specification, but may co-exist
with EXIF tags in some images.  Tags which are part of the EXIF 3.1
specification have an underlined B<Tag Name> in the HTML version of this
documentation.  See
L<https://www.cipa.jp/std/documents/download_e.html?CIPA_DC-008-2026-E>
for the official EXIF 3.1 specification.
`,GPS:`
These GPS tags are part of the EXIF standard, and are stored in a separate
IFD within the EXIF information.

ExifTool is very flexible about the input format when writing lat/long
coordinates, and will accept from 1 to 3 floating point numbers (for decimal
degrees, degrees and minutes, or degrees, minutes and seconds) separated by
just about anything, and will format them properly according to the EXIF
specification.

Some GPS tags have values which are fixed-length strings. For these, the
indicated string lengths include a null terminator which is added
automatically by ExifTool.  Remember that the descriptive values are used
when writing (eg. 'Above Sea Level', not '0') unless the print conversion is
disabled (with '-n' on the command line or the L<PrintConv|../ExifTool.html#PrintConv> option in the API,
or by suffixing the tag name with a C<#> character).

When adding GPS information to an image, it is important to set all of the
following tags: GPSLatitude, GPSLatitudeRef, GPSLongitude, GPSLongitudeRef,
and GPSAltitude and GPSAltitudeRef if the altitude is known.  ExifTool will
write the required GPSVersionID tag automatically if new a GPS IFD is added
to an image.
`,XMP:`
XMP stands for "Extensible Metadata Platform", an XML/RDF-based metadata
format which is being pushed by Adobe.  Information in this format can be
embedded in many different image file types including JPG, JP2, TIFF, GIF,
EPS, PDF, PSD, IND, INX, PNG, DJVU, SVG, PGF, MIFF, XCF, CRW, DNG and a
variety of proprietary TIFF-based RAW images, as well as MOV, AVI, ASF, WMV,
FLV, SWF and MP4 videos, and WMA and audio formats supporting ID3v2
information.

The XMP B<Tag ID>'s aren't listed because in most cases they are identical
to the B<Tag Name> (aside from differences in case).  Tags with different
ID's are mentioned in the B<Notes> column of the HTML version of this
document.

All XMP information is stored as character strings.  The B<Writable> column
specifies the information format:  C<string> is an unformatted string,
C<integer> is a string of digits (possibly beginning with a '+' or '-'),
C<real> is a floating point number, C<rational> is entered as a floating
point number but stored as two C<integer> strings separated by a '/'
character, C<date> is a date/time string entered in the format "YYYY:mm:dd
HH:MM:SS[.ss][+/-HH:MM]" but some partial date/time formats are also
accepted (see L<https://exiftool.org/faq.html#Q5>), C<boolean> is either
"True" or "False" (but "true" and "false" may be written as a ValueConv
value for compatibility with non-conforming applications), C<struct>
indicates a structured tag, and C<lang-alt> is a tag that supports alternate
languages.

When reading, C<struct> tags are extracted only if the L<Struct|../ExifTool.html#Struct> (-struct)
option is used.  Otherwise the corresponding I<Flattened> tags, indicated by
an underline (C<_>) after the B<Writable> type, are extracted.  When
copying, by default both structured and flattened tags are available, but
the flattened tags are considered "unsafe" so they aren't copied unless
specified explicitly.  The L<Struct|../ExifTool.html#Struct> option may be disabled by setting Struct
to 0 via the API or with --struct on the command line to copy only flattened
tags, or enabled by setting Struct to 1 via the API or with -struct on the
command line to copy only as structures.  When writing, the L<Struct|../ExifTool.html#Struct> option
has no effect, and both structured and flattened tags may be written.  See
L<https://exiftool.org/struct.html> for more details.

Individual languages for C<lang-alt> tags are accessed by suffixing the tag
name with a '-', followed by an RFC 3066 language code (eg. "XMP:Title-fr",
or "Rights-en-US").  (See L<http://www.ietf.org/rfc/rfc3066.txt> for the RFC
3066 specification.)  A C<lang-alt> tag with no language code accesses the
"x-default" language, but causes other languages for this tag to be deleted
when writing.  The "x-default" language code may be specified when writing
to preserve other existing languages (eg. "XMP-dc:Description-x-default").
When reading, "x-default" is not specified.

The XMP tags are organized according to schema B<Namespace> in the following
tables.  The ExifTool family 1 group names are derived from the namespace
prefixes by adding a leading "XMP-" (eg. "XMP-dc").  A few of the longer
prefixes have been shortened (as mentioned in the documentation below) to
avoid excessively long ExifTool group names.  The tags of any namespace may
be deleted as a group by specifying the family 1 group name (eg.
"-XMP-dc:all=" on the command line).  This includes namespaces which are not
pre-defined by ExifTool.

In cases where a tag name exists in more than one namespace, less common
namespaces are avoided when writing.  However, a specific namespace may be
written by providing a family 1 group name for the tag (eg. XMP-crs:Contrast
or XMP-exif:Contrast).  When deciding on which tags to add to an image,
using standard schemas such as L<dc|/XMP dc Tags>, L<xmp|/XMP xmp Tags>,
L<iptcCore|/XMP iptcCore Tags> and L<iptcExt|/XMP iptcExt Tags> is
recommended if possible.

For structures, the heading of the first column is B<Field Name>.  Field
names are very similar to tag names, except they are used to identify fields
inside structures instead of stand-alone tags.  See
L<the Field Name section of the Structured Information documentation|https://exiftool.org/struct.html#Fields> for more
details.

ExifTool will extract XMP information even if it is not listed in these
tables, but other tags are not writable unless added as user-defined tags in
the L<ExifTool config file|../config.html>.  For example, the C<pdfx> namespace doesn't have a
predefined set of tag names because it is used to store application-defined
PDF information, so although this information will be extracted, it is only
writable if the corresponding user-defined tags have been created.

The tables below list tags from the official XMP specification (with an
underlined B<Namespace> in the HTML version of this documentation), as well
as extensions from various other sources.  See
L<http://www.adobe.com/devnet/xmp/> for the official XMP specification.
`,IPTC:`
The tags listed below are part of the International Press Telecommunications
Council (IPTC) and the Newspaper Association of America (NAA) Information
Interchange Model (IIM).  This is an older meta information format, slowly
being phased out in favor of XMP -- the newer IPTCCore specification uses
XMP format.  IPTC information may be found in JPG, TIFF, PNG, MIFF, PS, PDF,
PSD, XCF and DNG images.

IPTC information is separated into different records, each of which has its
own set of tags.  See
L<http://www.iptc.org/std/IIM/4.1/specification/IIMV4.1.pdf> for the
official IPTC IIM specification.

This specification dictates a length for ASCII (C<string> or C<digits>) and
binary (C<undef>) values.  These lengths are given in square brackets after
the B<Writable> format name.  For tags where a range of lengths is allowed,
the minimum and maximum lengths are separated by a comma within the
brackets.  When writing, ExifTool issues a minor warning and truncates the
value if it is longer than allowed by the IPTC specification.  Minor errors
may be ignored with the L<IgnoreMinorErrors|../ExifTool.html#IgnoreMinorErrors> (-m) option, allowing longer
values to be written, but beware that values like this may cause problems
for some other IPTC readers. ExifTool will happily read IPTC values of any
length.

Separate IPTC date and time tags may be written with a combined date/time
value and ExifTool automagically takes the appropriate part of the date/time
string depending on whether a date or time tag is being written.  This is
very useful when copying date/time values to IPTC from other metadata
formats.

IPTC time values include a timezone offset.  If written with a value which
doesn't include a timezone then the current local timezone offset is used
(unless written with a combined date/time, in which case the local timezone
offset at the specified date/time is used, which may be different due to
changes in daylight savings time).

Note that it is not uncommon for IPTC to be found in non-standard locations
in JPEG and TIFF-based images.  When reading, the family 1 group name has a
number added for non-standard IPTC ("IPTC2", "IPTC3", etc), but when writing
only "IPTC" may be specified as the group.  To keep the IPTC consistent,
ExifTool updates tags in all existing IPTC locations, but will create a new
IPTC group only in the standard location.
`,QuickTime:`
The QuickTime format is used for many different types of audio, video and
image files (most notably, MOV/MP4 videos and HEIC/CR3 images).  ExifTool
extracts standard meta information and a variety of audio, video and image
parameters, as well as proprietary information written by many camera
models.  Tags with a question mark after their name are not extracted unless
the L<Unknown|../ExifTool.html#Unknown> option is set.

When writing video files, ExifTool creates both QuickTime and XMP tags by
default, but the group may be specified to write one or the other
separately.  If no location is specified, newly created QuickTime tags are
added in the L<ItemList|Image::ExifTool::TagNames/QuickTime ItemList Tags>
location if possible, otherwise in
L<UserData|Image::ExifTool::TagNames/QuickTime UserData Tags>, and
finally in L<Keys|Image::ExifTool::TagNames/QuickTime Keys Tags>,
but this order may be changed by setting the PREFERRED level of the
appropriate table in the config file (see
L<example.config|../config.html#PREF> in the full distribution for an
example).  Note that some tags with the same name but different ID's may
exist in the same location, but the family 7 group names may be used to
differentiate these.

ExifTool currently writes
L<ItemList|Image::ExifTool::TagNames/QuickTime ItemList Tags> and
L<UserData|Image::ExifTool::TagNames/QuickTime UserData Tags> only as
top-level metadata, but select Keys tags are may be written to the audio or
video track.  See the
L<AudioKeys|Image::ExifTool::TagNames/QuickTime AudioKeys Tags> and
L<VideoKeys|Image::ExifTool::TagNames/QuickTime VideoKeys Tags> tags for
more information.

Alternate language tags may be accessed for
L<ItemList|Image::ExifTool::TagNames/QuickTime ItemList Tags> and
L<Keys|Image::ExifTool::TagNames/QuickTime Keys Tags> tags by adding
a 3-character ISO 639-2 language code and an optional ISO 3166-1 alpha 2
country code to the tag name (eg. "ItemList:Artist-deu" or
"ItemList::Artist-deu-DE").  Most
L<UserData|Image::ExifTool::TagNames/QuickTime UserData Tags> tags support a
language code, but without a country code.  If no language code is specified
when writing, the default language is written and alternate languages for
the tag are deleted.  Use the "und" language code to write the default
language without deleting alternate languages.  Note that when reading,
"eng" is also treated as the default language if there is no country code.

According to the specification, integer-format QuickTime date/time tags
should be stored as UTC.  Unfortunately, digital cameras often store local
time values instead (presumably because they don't know the time zone).  For
this reason, by default ExifTool does not assume a time zone for these
values.  However, if the API L<QuickTimeUTC|../ExifTool.html#QuickTimeUTC> option is set, then ExifTool will
assume these values are properly stored as UTC, and will convert them to
local time when extracting.

When writing string-based date/time tags, the system time zone is added if
the L<PrintConv|../ExifTool.html#PrintConv> option is enabled and no time zone is specified.  This is
because Apple software may display crazy values if the time zone is missing
for some tags.

By default ExifTool will remove null padding from some QuickTime containers
in Canon CR3 files when writing, but the
L<QuickTimePad|../ExifTool.html#QuickTimePad> option may be used to preserve
the original size by padding with nulls if necessary.

See
L<https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/>
for the official QuickTime specification.
`,Photoshop:`
Photoshop tags are found in PSD and PSB files, as well as inside embedded
Photoshop information in many other file types (JPEG, TIFF, PDF, PNG to name
a few).

Many Photoshop tags are marked as Unknown (indicated by a question mark
after the tag name) because the information they provide is not very useful
under normal circumstances.  These unknown tags are not extracted unless the
L<Unknown|../ExifTool.html#Unknown> (-u) option is used.  See
L<http://www.adobe.com/devnet-apps/photoshop/fileformatashtml/> for the
official specification

Photoshop path tags (Tag ID's 0x7d0 to 0xbb5) are not defined by default,
but a config file included in the full ExifTool distribution
(config_files/photoshop_paths.config) contains the tag definitions to allow
access to this information.
`,PrintIM:`
The format of the PrintIM information is known, however no PrintIM tags have
been decoded.  Use the L<Unknown|../ExifTool.html#Unknown> (-u) option to extract PrintIM information.
`,GeoTiff:`
ExifTool extracts the following tags from GeoTIFF images.  See
L<https://web.archive.org/web/20070820121549/http://www.remotesensing.org/geotiff/spec/geotiffhome.html>
for the complete GeoTIFF specification.  Also included in the table below
are ChartTIFF tags (see
L<https://web.archive.org/web/20020828193928/http://www.charttiff.com/whitepapers.shtml>).
GeoTIFF tags are not writable individually, but they may be copied en mass
via the block tags GeoTiffDirectory, GeoTiffDoubleParams and
GeoTiffAsciiParams.
`,JFIF:`
The following information is extracted from the JPEG JFIF header.  See
L<https://www.w3.org/Graphics/JPEG/jfif3.pdf> for the JFIF 1.02
specification.
`,Kodak:`
Many Kodak models don't store the maker notes in standard IFD format, and
these formats vary with different models.  Some information has been
decoded, but much of the Kodak information remains unknown.
`,"Kodak SpecialEffects":`
The Kodak SpecialEffects and Borders tags are found in sub-IFD's within the
Kodak JPEG APP3 "Meta" segment.
`,Minolta:`
These tags are used by Minolta, Konica/Minolta as well as some Sony cameras.
Minolta doesn't make things easy for decoders because the meaning of some
tags and the location where some information is stored is different for
different camera models.  (Take MinoltaQuality for example, which may be
located in 5 different places.)
`,Olympus:`
Tags 0x0000 through 0x0103 are used by some older Olympus cameras, and are
the same as Konica/Minolta tags.  These tags are also used for some models
from other brands such as Acer, BenQ, Epson, Hitachi, HP, Maginon, Minolta,
Pentax, Ricoh, Samsung, Sanyo, SeaLife, Sony, Supra and Vivitar.
`,Panasonic:`
These tags are used in Panasonic/Leica cameras.
`,Pentax:`
These tags are used in Pentax/Asahi/Ricoh cameras.
`,CanonRaw:`
These tags apply to CRW-format Canon RAW files and information in the APP0
"CIFF" segment of JPEG images.  When writing CanonRaw/CIFF information, the
length of the information is preserved (and the new information is truncated
or padded as required) unless B<Writable> is C<resize>. Currently, only
JpgFromRaw and ThumbnailImage are allowed to change size.  See
L<https://exiftool.org/canon_raw.html> for a description of the Canon CRW
format.

CRW images also support the addition of a CanonVRD trailer, which in turn
supports XMP.  This trailer is created automatically if necessary when
ExifTool is used to write XMP to a CRW image.
`,NikonCustom:`
Unfortunately, the NikonCustom settings are stored in a binary data block
which changes from model to model.  This means that significant effort must
be spent in decoding these for each model, usually requiring hundreds of
test images from a dedicated Nikon owner.  For this reason, the NikonCustom
settings have not been decoded for all models.  The tables below list the
custom settings for the currently supported models.
`,Unknown:`
The following tags are decoded in unsupported maker notes.  Use the L<Unknown|../ExifTool.html#Unknown>
(-u) option to display other unknown tags.
`,PDF:`
The tags listed in the PDF tables below are those which are used by ExifTool
to extract meta information, but they are only a small fraction of the total
number of available PDF tags.  See
L<http://www.adobe.com/devnet/pdf/pdf_reference.html> for the official PDF
specification.

ExifTool supports reading and writing PDF documents up to version 2.0,
including support for RC4, AES-128 and AES-256 encryption.  A
L<Password|../ExifTool.html#Password> option is provided to allow processing
of password-protected PDF files.

ExifTool may be used to write native PDF and XMP metadata to PDF files. It
uses an incremental update technique that has the advantages of being both
fast and reversible.  If ExifTool was used to modify a PDF file, the
original may be recovered by deleting the C<PDF-update> pseudo-group (with
C<-PDF-update:all=> on the command line).  However, there are two main
disadvantages to this technique:

1) A linearized PDF file is no longer linearized after the update, so it
must be subsequently re-linearized if this is required.

2) All metadata edits are reversible.  While this would normally be
considered an advantage, it is a potential security problem because old
information is never actually deleted from the file.  (However, after
running ExifTool the old information may be removed permanently using the
"qpdf" utility with this command: "qpdf --linearize in.pdf out.pdf".)
`,DNG:`
The main DNG tags are found in the EXIF table.  The tables below define only
information found within structures of these main DNG tag values.  See
L<https://helpx.adobe.com/camera-raw/digital-negative.html> for the official
DNG specification.
`,MPEG:`
The MPEG format doesn't specify any file-level meta information.  In lieu of
this, information is extracted from the first audio and video frame headers
in the file.
`,Real:`
ExifTool recognizes three basic types of Real audio/video files: 1)
RealMedia (RM, RV and RMVB), 2) RealAudio (RA), and 3) Real Metafile (RAM
and RPM).
`,Extra:`
The extra tags provide extra features or extra information extracted or
generated by ExifTool that is not directly associated with another tag
group.  The B<Group> column lists the family 1 group name when reading.
Tags with a "-" in this column are write-only.

Tags in the family 1 "System" group are referred to as "pseudo" tags because
they don't represent real metadata in the file.  Instead, this information
is stored in the directory structure of the filesystem.  The B<Writable>
System "pseudo" tags in this table may be written without modifying the file
itself.  The TestName tag is used for dry-run testing before writing
FileName.
`,Composite:`
The values of the composite tags are B<Derived From> the values of other
tags.  These are convenience tags which are calculated after all other
information is extracted.  Only a few of these tags are writable directly,
the others are changed by writing the corresponding B<Derived From> tags.
User-defined Composite tags, also useful for custom-formatting of tag
values, may created via the L<ExifTool configuration file|../config.html>.
`,Shortcuts:`
Shortcut tags are convenience tags that represent one or more other tag
names.  They are used like regular tags to read and write the information
for a specified set of tags.

The shortcut tags below have been pre-defined, but user-defined shortcuts
may be added via the %Image::ExifTool::UserDefined::Shortcuts lookup in the
~/.ExifTool_config file.  See the Image::ExifTool::Shortcuts documentation
for more details.
`,MWG:`
The Metadata Working Group (MWG) recommends techniques to allow certain
overlapping EXIF, IPTC and XMP tags to be reconciled when reading, and
synchronized when writing.  The MWG Composite tags below are designed to aid
in the implementation of these recommendations.  As well, the MWG defines
new XMP tags which are listed in the subsequent tables below.  See
L<https://web.archive.org/web/20180919181934/http://www.metadataworkinggroup.org/pdf/mwg_guidance.pdf>
for the official MWG specification.
`,MacOS:`
On MacOS systems, the there are additional MDItem and XAttr Finder tags that
may be extracted.  These tags are not extracted by default -- they must be
specifically requested or enabled via an API option.  (Except when reading
MacOS "._" files directly, see below.)

The tables below list some of the tags that may be extracted, but ExifTool
will extract all available information even for tags not listed.

Tags in these tables are referred to as "pseudo" tags because their
information is not stored in the file itself.  As such, B<Writable> tags in
these tables may be changed without having to rewrite the file.
`,GM:`
These tags are extracted from GM/Cosworth PDR (Performance Data Recorder)
information found in videos from General Motors cars such as Corvette and
Camero.

Use the API L<PrintCSV|../ExifTool.html#PrintCSV> option to output all timed
PDR data in CSV format at greatly increased speed and with much lower memory
usage.  This option prints the numerical values for each channel in CSV
format, suitable for import into RaceRender.  In this output, the gear
numbers for Neutral and Reverse are changed to -1 and -100 respectively for
compatibility with RaceRender.
`,PodTrailer:`
~head1 NOTES

This document generated automatically by
L<Image::ExifTool::BuildTagLookup|Image::ExifTool::BuildTagLookup>.

~head1 AUTHOR

Copyright 2003-2026, Phil Harvey (philharvey66 at gmail.com)

This library is free software; you can redistribute it and/or modify it
under the same terms as Perl itself.

~head1 SEE ALSO

L<Image::ExifTool(3pm)|Image::ExifTool>

~cut
`}),Fe=a({AllDates:`
        contrary to the shortcut name, this represents only the common EXIF
        date/time tags.  To access all date/time tags, use Time:All instead
    `,MakerNotes:`
        useful when copying tags between files to either copy the maker notes as a
        block or prevent it from being copied
    `,ColorSpaceTags:`
        standard tags which carry color space information.  Useful for preserving
        color space when deleting all other metadata
    `,CommonIFD0:`
        common metadata tags found in IFD0 of TIFF-format images.  Used to simplify
        deletion of all metadata from these images.  See
        L<FAQ number 7|../faq.html#Q7> for details
    `,Unsafe:`
        I<Unsafe> tags in JPEG images which are normally not copied.  Defined here
        as a shortcut to use when rebuilding JPEG EXIF from scratch. See
        L<FAQ number 20|../faq.html#Q20> for more information
    `,LargeTags:`
        large binary data tags which may be excluded to reduce memory usage if
        memory limitations are a problem
    `,"ls-l":`
        mimics columns shown by Unix "ls -l" command.  Includes some tags which are
        extracted only if the API L<SystemTags|../ExifTool.html#SystemTags> option
        is enabled
    `}),Ce=a({IARL:1,ICRD:1,IGNR:1,IPLT:1,ISRC:1,IART:1,ICRP:1,IKEY:1,IPRD:1,ISRF:1,ICMS:1,IDIM:1,ILGT:1,ISBJ:1,ITCH:1,ICMT:1,IDPI:1,IMED:1,ISFT:1,ICOP:1,IENG:1,INAM:1,ISHP:1}),_e=a({aux:1,x:1,crs:1,xmp:1,dc:1,xmpBJ:1,exif:1,xmpDM:1,pdf:1,xmpMM:1,pdfx:1,xmpNote:1,photoshop:1,xmpRights:1,tiff:1,xmpTPg:1})});
