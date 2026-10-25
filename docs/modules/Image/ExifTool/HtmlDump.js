/*! exiftool-js: Image/ExifTool/HtmlDump.pm of ExifTool 13.59 (https://exiftool.org), translated to JavaScript. ExifTool is Copyright 2003-2026, Phil Harvey. Free software; you can redistribute it and/or modify it under the same terms as Perl itself (either the Perl Artistic License or GPL), like ExifTool. See LICENSE.txt. */
import{PL as t,H as a}from"../../../runtime/perl.js";t.module("Image/ExifTool/HtmlDump.pm",function(){const b=t.pkg("Image::ExifTool::HtmlDump"),nt=t.pkg("Image::ExifTool::HTML"),F=t.pkg("File::RandomAccess"),G=t.pkg("Image::ExifTool");var z,B,X=[],Q,Z,$,U;function et(...e){let r,k,y,n=e.shift(),O=t.t(k=t.t(r=t.ref(n))?r:n)?k:"Image::ExifTool::HtmlDump";return t.bless(a({Block:a({}),TipNum:0}),O)}function it(e,r,k,y,n,O,S){const m=t.M;try{let f=e?.Block;t.t(f?.[t.k(r)])||((f??(f=a({})))[t.k(r)]=[]);let c;return t.t(n)&&t.str(n)==="SAME"?c="":(c=t.m(y,/^[\[(]/)?y:`<b>${t.str(y)}</b>`,n!==void 0&&(n=nt.EscapeHTML(n),n=t.s(n,/\n/,"<br>",!0),c=t.str(c)+("<br>"+t.str(n))),t.m(c,/<br>Size:/)||(c=t.str(c)+`<br>(${t.str(k)} bytes)`),(e??(e=a({}))).TipNum=t.num((e??(e=a({}))).TipNum)+1),t.av(f??(f=a({})),t.k(r)).push([k,y,c,O,e?.TipNum,S])}finally{t.M=m}}function rt(...e){let r,k,y,[n,O,S,m,f,c,x]=e,l,u,g,i,s,o=n?.Block;t.t(m)||(m=0),t.t(t.ref(f))||(f=t.box(t.glob("STDOUT"))),t.t(x)||(x="HtmlDump"),t.t(c)||(c=0);let M=F.Tell(O);if(!t.t(F.Seek(O,0,2)))return(n??(n=a({}))).ERROR="Seek error",-1;let E=F.Tell(O),p=0,R=t.num(m)+t.num(t.t(S)?t.len(S.v):0);for((n??(n=a({}))).Open=[],(n??(n=a({}))).Closed=[],(n??(n=a({}))).TipList=[],(n??(n=a({}))).MSpanList=[],(n??(n=a({}))).Cols=["","","",""],t.num(c)<=1?i=1024:t.num(c)<=2?i=16384:i=256*1024*1024,(n??(n=a({}))).Limit=i,l=0;t.num(l)<4;l=t.num(l)+1)t.av(n??(n=a({})),"Open")[t.ix(l)]=a({ID:[],Element:a({})}),t.av(n??(n=a({})),"Closed")[t.ix(l)]=a({ID:[],Element:a({})});z=B=0,X.length=0;let N=0,T=[],h,w=[];for(t.t(n?.Error)||(w=t.sort([...t.keys(o)],(d,C)=>t.ncmp(d,C))),l=0;t.num(l)<=t.num(w.length);l=t.num(l)+1){let d=w.at(l),C;if(d!==void 0)C=o?.[t.k(d)];else if(t.t(B)&&t.num(p)<t.num(B)&&h===void 0)d=B;else break;t.num(d)>t.num(E)&&(d=E);let A=t.num(d)-t.num(p);if(t.num(A)>0&&!t.t(h)){l=t.num(l)-1;let L,v;if(h===void 0&&t.t(B))for(let _ of X)t.num(p)>=t.num(_?.End)+t.num(m)||t.num(p)+t.num(A)<=t.num(_?.End)+t.num(m)||t.t(L)&&t.num(L)<t.num(_?.End)||(L=_?.End);t.t(L)?(d=p,A=t.num(L)+t.num(m)-t.num(p),h=0):(d=p,h=1);let P=t.num(A)>1?`unused ${t.str(A)} bytes`:"pad byte";C=[[A,`[${t.str(P)}]`,void 0,264]]}else h=void 0;let V;for(let L of t.A(C)){let[v,P,_,W,J,K]=t.A(L);if(!(t.num(v)>0))continue;W===void 0&&(W=0);let j;J!==void 0&&(j=T.at(J));let tt=N;if(t.t(j)?tt=t.substr(j,1):(j=`t${t.str(N)}`,J!==void 0&&(T[t.ix(J)]=j),N=t.num(N)+1),t.t(t.band(W,20))){let I=t.t(t.band(W,4))?`${t.str(j)} M`:j;t.t(K)&&(I=t.str(I)+` ${t.str(K)}`);let D=a({Class:I,Start:t.num(d)-t.num(m),End:t.num(d)-t.num(m)+t.num(v)});X.push(D),t.t(z)&&t.num(z)<t.num(D.Start)||(z=D.Start),t.t(B)&&t.num(B)>t.num(D.End)||(B=D.End),t.av(n??(n=a({})),"MSpanList").push(j);continue}let Y,q;for(q=0;t.num(q)<2;q=t.num(q)+1){Y=t.num(d)+t.num(v);let I=t.num(v)>t.num(i)+32?t.num(i)/2+16:v;if(t.num(d)>=t.num(m)&&t.num(Y)<=t.num(R))u=t.substr(S.v,t.num(d)-t.num(m),I),t.num(v)!==t.num(I)&&(u=t.str(u)+t.str(t.substr(S.v,t.num(d)-t.num(m)+t.num(v)-t.num(I),I)));else if(u="",t.t(F.Seek(O,d,0))&&t.num(F.Read(O,t.lv(()=>u,D=>u=D),I))===t.num(I)){if(t.num(v)!==t.num(I)){let D="";if(!(t.t(F.Seek(O,t.num(d)+t.num(v)-t.num(I),0))&&t.num(F.Read(O,t.lv(()=>D,ut=>D=ut),I))===t.num(I))){s=P,v=t.num(E)-t.num(d),t.t(_)&&(_=t.str(_)+`<br>Error: Only ${t.str(v)} bytes available!`);continue}u=t.str(u)+t.str(D),D=void 0}}else s=P,v=t.len(u),t.t(_)&&(_=t.str(_)+`<br>Error: Only ${t.str(v)} bytes available!`);break}if(t.t(_)&&(t.av(n??(n=a({})),"TipList")[t.ix(tt)]=_),!!t.t(t.len(u))){if(t.num(l)+1<t.num(w.length)&&t.str(L)===t.str(C?.at(-1))&&(t.num(Y)===t.num(w.at(t.num(l)+1))||t.num(Y)<t.num(w.at(t.num(l)+1))&&t.num(Y)>=t.num(p))){let I=t.t(r=o?.[t.k(w.at(t.num(l)+1))]?.[0]?.[3])?r:0;t.t(t.band(W,1))||t.t(t.band(I,1))||(W=t.bor(W,256))}b.DumpTable(n,t.num(d)-t.num(m),t.lv(()=>u,I=>u=I),P,j,W,v,t.num(p)-t.num(m),K),u=void 0,t.num(p)<t.num(Y)&&(p=Y)}}}if(b.Open(n,"",""),F.Seek(O,M,0),H(f,Q,x),t.t(n?.Cols?.[0])){H(f,Z);let d=t.av(n??(n=a({})),"MSpanList");for(l=0;t.num(l)<t.num(t.A(d).length);l=t.num(l)+1)H(f,`mspan[${t.str(l)}] = "${t.str(d?.at(l))}";
`);H(f,$,n?.Cols?.[0]),H(f,'</pre></td><td valign="top">',U,n?.Cols?.[1]),H(f,'</pre></td><td class=c2 valign="top">',U,n?.Cols?.[2]),H(f,'</pre></td><td valign="top">',U,n?.Cols?.[3]),H(f,`</pre></td></tr></table>
<div id=tb class=tb> </div>
`);let C=t.av(n??(n=a({})),"TipList");for(l=0;t.num(l)<t.num(t.A(C).length);l=t.num(l)+1){let A=C?.at(l);A!==void 0&&H(f,`<div id=p${t.str(l)} class=tt>${t.str(A)}</div>
`)}t.del(n,"TipList"),g=1}else{let d=t.t(k=n?.Error)?k:"No EXIF or TIFF information found in image";H(f,`${t.str(x)}</title></head><body>
${t.str(d)}
`),g=0}for(H(f,`</body></html>
`),l=0;t.num(l)<4;l=t.num(l)+1)t.av(n??(n=a({})),"Cols")[t.ix(l)]="";return t.t(s)?(s=t.tr(s,"()","","d"),(n??(n=a({}))).ERROR=s,-1):g}function st(e,r,k,...y){let n;const O=t.M;try{y.length>0||(y=t.range(0,e?.Open.length-1));let S;for(let m of y){let f=e?.Open?.at(m),c=f?.Element;if(t.t(k)){if(t.t(c?.[t.k(r)])&&t.str(c?.[t.k(r)])===t.str(k))continue}else if(t.t(r)&&!t.t(c?.[t.k(r)])&&!(t.str(k)===""&&t.A(e?.Closed?.at(m)?.ID).length>0))continue;let x=f?.ID,l=e?.Closed?.at(m),u=l?.ID,g=l?.Element,i=t.t(n=e?.TmpCols)?n:e?.Cols;if(t.t(c?.[t.k(r)])||!t.t(r)){for(;t.A(x).length>0;){let s=t.A(x).pop(),o=c?.[t.k(s)];if(o=t.s(o,/^<([^\t\n\v\f\r ]+)[\s\S]*/,()=>`</${t.str(t.$1)}>`,!1),(i??(i=[]))[t.ix(m)]=t.str((i??(i=[]))[t.ix(m)])+t.str(o),t.str(r)===t.str(s)||!t.t(r)){if(t.del(c,t.k(s)),t.t(r))break;continue}(u??(u=[])).push(s),(g??(g=a({})))[t.k(s)]=c?.[t.k(s)],t.del(c,t.k(s))}t.t(r)||(u=(l??(l=a({}))).ID=[],g=(l??(l=a({}))).Element=a({}))}else t.t(g?.[t.k(r)])&&(t.del(g,t.k(r)),t.aset(u??(u=[]),[...t.A(u)].filter(s=>!t.m(s,t.re("^"+t.restr(r)+"$","")))));if(t.str(k)!=="0"){for(;t.A(u).length>0;){let s=t.A(u).pop();(i??(i=[]))[t.ix(m)]=t.str((i??(i=[]))[t.ix(m)])+t.str(g?.[t.k(s)]),(x??(x=[])).push(s),(c??(c=a({})))[t.k(s)]=g?.[t.k(s)],t.del(g,t.k(s))}t.t(k)&&t.str(k)!=="1"&&((i??(i=[]))[t.ix(m)]=t.str((i??(i=[]))[t.ix(m)])+t.str(k),(x??(x=[])).push(r),(c??(c=a({})))[t.k(r)]=k)}}}finally{t.M=O}}function lt(e,r,k,y,n,O,S,m,f){const c=t.M;try{S===void 0&&(S=t.len(k.v)),t.t(m)||(m=0);let x,l,u,g=0;t.t(m)&&t.num(r)<t.num(m)||t.t(t.band(O,2))?(x="<span class=V>",t.t(m)&&t.num(r)<t.num(m)&&(l=1)):x="";let i=["","","",""];if((e??(e=a({}))).TmpCols=i,t.t(n)){t.t(y)&&t.m(y,/^\[/)?u="U":(t.t(e?.A)?(u="X",(e??(e=a({}))).A=0):(u="V",(e??(e=a({}))).A=1),t.t(l)||(u=t.num(u)+1));let E=t.t(f)?`'${t.str(u)} ${t.str(f)}'`:u;n=`<a name=${t.str(n)} class=${t.str(E)}>`,t.t(y)&&(y=`${t.str(n)}${t.str(y)}</a>`)}else n="";let s=0,o=r;if(t.t(e?.Cont))s=t.band(r,15),i[1]=t.str(i[1])+t.str(t.num(s)===8?"  ":" ");else{let E=t.num(r)<0?t.sprintf("-%.4x",-t.num(r)):t.sprintf("%5.4x",r);if(b.Open(e,"fgd",x,0),b.Open(e,"fgd","",3),i[0]=t.str(i[0])+`${t.str(E)}`,t.t(t.band(O,1))||(o=t.num(o)-t.num(t.band(r,15))),t.num(o)<t.num(r)){b.Open(e,"bkg","",1,2),s=t.num(r)-t.num(o);let p=3*t.num(s);t.num(s)>7&&(p=t.num(p)+1),i[1]=t.str(i[1])+t.rep(" ",t.num(p)),i[2]=t.str(i[2])+t.rep(" ",t.num(s)),o=r}}for(;;){let E=[],p=[],R,N;if(t.num(o)>=t.num(z)&&t.num(o)<t.num(B)){for(let h of X)t.num(o)>=t.num(h?.Start)&&t.num(o)<t.num(h?.End)&&(E.push(h?.Class),t.num(o)+1===t.num(h?.End)?R=1:p.push(h?.Class));b.Open(e,"bkg",E.length>0?`<span class='${t.jl(E)}'>`:"",1,2)}else b.Open(e,"bkg","",1,2);b.Open(e,"a",n,1,2);let T=t.substr(k.v,t.num(o)-t.num(r)-t.num(g),1);if(i[1]=t.str(i[1])+t.sprintf("%.2x",t.ord(T)),T=t.tr(T,"\\x00-\\x1f\\x7f-\\xff",".",""),T=t.s(T,/&/,"&amp;",!0),T=t.s(T,/>/,"&gt;",!0),T=t.s(T,/</,"&lt;",!0),i[2]=t.str(i[2])+t.str(T),o=t.num(o)+1,s=t.num(s)+1,t.t(R)){let h=p.length>0?`<span class='${t.jl(p)}'>`:"",w=t.num(o)-t.num(r)>=t.num(S)?0:h;b.Open(e,"bkg",w,1,2)}if(t.t(l)&&t.num(o)>=t.num(m)){l=0,u=t.num(u)+1;let h=t.t(f)?`'${t.str(u)} ${t.str(f)}'`:u;n=t.s(n,/class=\w\b/,()=>`class=${t.str(h)}`,!1),x="",b.Open(e,"fgd",x,0)}if(t.num(o)-t.num(r)>=t.num(S)){b.Open(e,"a","",1,2);break}if(t.num(s)<16){i[1]=t.str(i[1])+t.str(t.num(s)===8?"  ":" ");continue}else if(t.t(t.band(O,1))&&t.num(s)<t.num(S)){i[1]=t.str(i[1])+" ";continue}t.t(e?.Msg)||(i[3]=t.str(i[3])+t.str(y),y="");for(let h=i,w=0;w<h.length;++w)h[w]=t.str(h[w])+`
`;if((e??(e=a({}))).Msg=0,t.t(e?.Limit)){let h=t.t(t.band(O,8))?4:1,w=t.div(e?.Limit,2*t.num(h))-16;if(t.num(o)-t.num(r)>t.num(w)&&t.num(S)-t.num(o)+t.num(r)>t.num(w)){let d=t.band(t.num(S)-t.num(o)+t.num(r)-t.num(w),t.bnot(15));if(t.num(d)>16){b.Open(e,"bkg","",1,2);let C=t.sprintf("[snip %d lines]",t.num(d)/16);C=t.str(t.rep(" ",t.num(24-t.num(t.len(C))/2)))+t.str(C),i[0]=t.str(i[0])+`  ...
`,i[1]=t.str(i[1])+(t.str(C)+t.str(t.rep(" ",t.num(48-t.num(t.len(C)))))+`
`),i[2]=t.str(i[2])+`     [snip]     
`,i[3]=t.str(i[3])+`
`,o=t.num(o)+t.num(d),g=t.num(g)+(t.num(S)-t.num(t.len(k.v)))}}}i[0]=t.str(i[0])+t.str(t.num(o)<0?t.sprintf("-%.4x",-t.num(o)):t.sprintf("%5.4x",o)),s=0}if(t.t(y)&&(t.t(e?.Msg)&&(y=` ${t.str(y)}`),i[3]=t.str(i[3])+t.str(y)),t.t(t.band(O,256))&&t.num(s)<16)(e??(e=a({}))).Cont=1,t.t(y)&&((e??(e=a({}))).Msg=1);else{for(let E=i,p=0;p<E.length;++p)E[p]=t.str(E[p])+`
`;(e??(e=a({}))).Msg=0,(e??(e=a({}))).Cont=0}let M;for(M=0;t.num(M)<4;M=t.num(M)+1)t.av(e??(e=a({})),"Cols")[t.ix(M)]=t.str(t.av(e??(e=a({})),"Cols")[t.ix(M)])+t.str(i.at(M));return t.del(e,"TmpCols")}finally{t.M=c}}function at(e,r,k){const y=t.M;try{let n,O,S,m,f,c=a({StripOffsets:"StripByteCounts",TileOffsets:"TileByteCounts",FreeOffsets:"FreeByteCounts",ThumbnailOffset:"ThumbnailLength",PreviewImageStart:"PreviewImageLength",JpgFromRawStart:"JpgFromRawLength",OtherImageStart:"OtherImageLength",PreviewJXLStart:"PreviewJXLLength",ImageOffset:"ImageByteCount",AlphaOffset:"AlphaByteCount",MPImageStart:"MPImageLength",IDCPreviewStart:"IDCPreviewLength",SamsungRawPointersOffset:"SamsungRawPointersLength"});for(let g of t.keys(c)){let i=G.GetInfo(r,g);if(t.hcount(i)>0){if(t.str(g)==="StripOffsets"&&t.t(r?.TAG_INFO?.[t.k(g)]?.PanasonicHack)){let s=G.GetInfo(r,"RawDataOffset");t.hcount(s)>0||(s=i);let o=t.keys(s),M=s?.[t.k(o[0])],E=r?.RAF;if(t.num(o.length)===1&&t.m(M,/^\d+(?=\n?(?![\s\S]))/)&&t.t(E)){let p=F.Tell(E);F.Seek(E,0,2);let R=t.num(F.Tell(E))-t.num(M);if(F.Seek(E,p,0),t.num(R)>0){b.Add(e,M,R,"(Panasonic raw data)",`Size: ${t.str(R)} bytes`,8);continue}}}for(let s of t.keys(i)){let o=G.GetTagName(s),M=t.sc(t.WC(0,G.GetGroup)(r,s,1)),E=G.GetInfo(r,c[t.k(g)],a({Group1:M})),p=c[t.k(g)];if(t.m(s,/( [^\n]*)/)&&(p=t.str(p)+t.str(t.$1)),!t.t(E?.[t.k(p)]))continue;let R=i?.[t.k(s)],N=E?.[t.k(p)];if(t.str(g)==="MPImageStart"&&t.str(R)==="0")continue;let T=t.split(" ",t.t(t.ref(R))?R.v:R),h=t.split(" ",t.t(t.ref(N))?N.v:N),w=T.length,d=0,C=0;for(f=0;T.length>0&&h.length>0;f=t.num(f)+1){let A=T.shift(),V=h.shift(),L=t.num(A)+t.num(V);if(T.length>0&&h.length>0&&(t.t(t.band(L,1))&&t.num(L)+1===t.num(T[0])&&(L=t.num(L)+1,C=t.num(C)+1),t.num(L)===t.num(T[0]))){h[0]=t.num(h[0])+(t.num(T[0])-t.num(A)),T[0]=A;continue}let v=t.str(t.sc(t.WC(0,G.GetGroup)(r,s,1)))+":"+t.str(g);v=t.s(v,/(Offsets?|Start)(?=\n?(?![\s\S]))/," ",!1),t.num(w)>1&&(t.num(d)!==t.num(f)&&(v=t.str(v)+`${t.str(d)}-`),v=t.str(v)+`${t.str(f)} `,d=t.num(f)+1),v=t.str(v)+"data";let P=`Size: ${t.str(V)} bytes`;t.t(C)&&(P=t.str(P)+`, incl. ${t.str(C)} pad bytes`),b.Add(e,A,V,`(${t.str(v)})`,P,8)}}}}let x=0,l=e?.Block;for(let g of t.keys(l))for(let i of t.A(l?.[t.k(g)])){let s=t.num(g)+t.num(i?.[0]);t.num(x)<t.num(s)&&(x=s)}let u=t.num(k)-t.num(x);if(t.num(u)>0&&(t.t(x)||t.t(G.Options(r,"Unknown"))))return t.num(u)>1||t.t(t.band(k,1))?b.Add(e,x,u,"[unknown data]",`Size: ${t.str(u)} bytes`,8):b.Add(e,x,u,"[trailing pad byte]",void 0,8)}finally{t.M=y}}function H(...e){let r=e.shift();return t.t(t.sc(t.ext("UNIVERSAL::isa")(r,"GLOB")))?t.print(r,[...e]):t.str(t.ref(r))==="SCALAR"?(r.v=t.str(r.v)+t.join("",[...e]),1):0}t.defsub(b,"new",et),t.defsub(b,"Add",it),t.defsub(b,"Print",rt),t.defsub(b,"Open",st),t.defsub(b,"DumpTable",lt),t.defsub(b,"FinishTiffDump",at),t.defsub(b,"Write",H),t.use("Image::ExifTool",b),t.use("Image::ExifTool::HTML",b,["EscapeHTML"]),b.$VERSION="1.42";var Q=`<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN"
 "http://www.w3.org/TR/1998/REC-html40-19980424/loose.dtd">
<html>
<head>
<title>
`,Z=`</title>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<style type="text/css">
<!--
/* character style ID's */
.D { color: #000000 } /* default color */
.V { color: #ff0000 } /* duplicate block 1 */
.W { color: #004400 } /* normal block 1 */
.X { color: #ff4488 } /* duplicate block 2 */
.Y { color: #448844 } /* normal block 2 */
.U { color: #cc8844 } /* unused data block */
.H { color: #0000ff } /* highlighted tag name */
.F { color: #aa00dd } /* actual offset differs */
.M { text-decoration: underline } /* maker notes data */
.tt { /* tooltip text */
    visibility: hidden;
    position: absolute;
    white-space: nowrap;
    top: 0;
    left: 0;
    font-family: Verdana, sans-serif;
    font-size: .7em;
    padding: 2px 4px;
    border: 1px solid gray;
    z-index: 3;
}
.tb { /* tooltip background */
    visibility: hidden;
    position: absolute;
    background: #ffffdd;
    zoom: 1;
    -moz-opacity: 0.8;
    -khtml-opacity: 0.8;
    -ms-filter: 'progid:DXImageTransform.Microsoft.Alpha(Opacity=80)';
    filter: alpha(opacity=80);
    opacity: 0.8;
    z-index: 2;
}
/* table styles */
table.dump {
  border-top: 1px solid gray;
  border-bottom: 1px solid gray;
}
table.dump td { padding: .2em .3em }
td.c2 {
  border-left: 1px solid gray;
  border-right: 1px solid gray;
}
pre   { margin: 0 }
table { font-size: .9em }
body  { color: black; background: white }
-->
</style>
<script language="JavaScript" type="text/JavaScript">
<!-- Begin
// tooltip positioning constants
var TMAR = 4;   // top/left margins
var BMAR = 16;  // bottom/right margins (scrollbars may overhang inner dimensions)
var XOFF = 10;  // x offset from cursor
var YOFF = 40;  // y offset
var YMIN = 10;  // minimum y offset
var YTOP = 20;  // y offset when above cursor
// common variables
var safari1 = navigator.userAgent.indexOf("Safari/312.6") >= 0;
var ie6 = navigator.userAgent.toLowerCase().indexOf('msie 6') >= 0;
var mspan = new Array;
var clicked = 0;
var hlist, tt, tb, firstOutEvt, lastInEvt;

function GetElementsByClass(classname, tagname) {
  var found = new Array();
  var list = document.getElementsByTagName(tagname);
  var len = list.length;
  for (var i=0, j=0; i<len; ++i) {
    var classes = list[i].className.split(' ');
    for (var k=0; k<classes.length; ++k) {
      if (classes[k] == classname) {
        found[j++] = list[i];
        break;
      }
    }
  }
  return found;
}

// click mouse
function doClick(e)
{
  if (!clicked) {
    firstOutEvt = lastInEvt = undefined;
    high(e, 2);
    if (hlist) clicked = 1;
  } else {
    clicked = 0;
    if (firstOutEvt) high(firstOutEvt, 0);
    if (lastInEvt) high(lastInEvt, 1);
  }
}

// move tooltip
function move(e)
{
  if (!tt) return;
  if (ie6 && (tt.style.top  == '' || tt.style.top  == 0) &&
             (tt.style.left == '' || tt.style.left == 0))
  {
    tt.style.width  = tt.offsetWidth  + 'px';
    tt.style.height = tt.offsetHeight + 'px';
  }
  var w, h;
  // browser inconsistencies make getting window size more complex than it should be,
  // and even then we don't know if it is smaller due to scrollbar width
  if (typeof(window.innerWidth) == 'number') {
    w = window.innerWidth;
    h = window.innerHeight;
  } else if (document.documentElement && document.documentElement.clientWidth) {
    w = document.documentElement.clientWidth;
    h = document.documentElement.clientHeight;
  } else {
    w = document.body.clientWidth;
    h = document.body.clientHeight;
  }
  var x = e.clientX + XOFF;
  var y = e.clientY + YOFF;
  if (safari1) { // patch for people still using OS X 10.3.9
    x -= document.body.scrollLeft + document.documentElement.scrollLeft;
    y -= document.body.scrollTop  + document.documentElement.scrollTop;
  }
  var mx = w - BMAR - tt.offsetWidth;
  var my = h - BMAR - tt.offsetHeight;
  if (y > my + YOFF - YMIN) y = e.clientY - YTOP - tt.offsetHeight;
  if (x > mx) x = mx;
  if (y > my) y = my;
  if (x < TMAR) x = TMAR;
  if (y < TMAR) y = TMAR;
  x += document.body.scrollLeft + document.documentElement.scrollLeft;
  y += document.body.scrollTop  + document.documentElement.scrollTop;
  tb.style.width  = tt.offsetWidth  + 'px';
  tb.style.height = tt.offsetHeight + 'px';
  tt.style.top  = tb.style.top  = y + 'px';
  tt.style.left = tb.style.left = x + 'px';
  tt.style.visibility = tb.style.visibility = 'visible';
}

// highlight/unhighlight text
function high(e,on) {
  if (on) {
    lastInEvt = e;
  } else {
    if (!firstOutEvt) firstOutEvt = e;
  }
  if (clicked) return;
  var targ;
  if (e.target) targ = e.target;
  else if (e.srcElement) targ = e.srcElement;
  if (targ.nodeType == 3) targ = targ.parentNode; // defeat Safari bug
  if (!targ.name) targ = targ.parentNode; // go up another level if necessary
  if (targ.name && document.getElementsByName) {
    // un-highlight current objects
    if (hlist) {
      for (var i=0; i<hlist.length; ++i) {
        for (var j=0; j<hlist[i].length; ++j) {
          hlist[i][j].style.background = 'transparent';
        }
      }
      hlist = null;
    }
    if (tt) {
      // hide old tooltip
      tt.style.visibility = tb.style.visibility = 'hidden';
      tt = null;
    }
    if (on) {
      if (targ.name.substring(0,1) == 't') {
        // show our tooltip (ID is different than name to avoid confusing IE)
        tt = document.getElementById('p' + targ.name.substring(1));
        if (tt) {
          tb = document.getElementById('tb');
          move(e);
        }
      }
      // highlight anchor elements with the same name
      hlist = new Array;
      hlist.push(document.getElementsByName(targ.name));
      // is this an IFD pointer?
      var pos = targ.className.indexOf('Offset_');
      if (pos > 0) {
        // add elements from this IFD to our highlight list
        hlist.push(document.getElementsByClassName(targ.className.substr(pos+7)));
      }
      // use class name to highlight span elements if necessary
      for (var i=0; i<mspan.length; ++i) {
        if (mspan[i] != targ.name) continue;
        // add these span elements to our highlight list
        hlist.push(GetElementsByClass(targ.name, 'span'));
        break;
      }
      for (var i=0; i<hlist.length; ++i) {
        for (var j=0; j<hlist[i].length; ++j) {
          hlist[i][j].style.background = on == 2 ? '#ffbbbb' : '#ffcc99';
        }
      }
    }
  }
}
`,$=`
// End --->
<\/script></head>
<body><noscript><b class=V>--&gt;
Enable JavaScript for active highlighting and information tool tips!
</b></noscript>
<table class=dump cellspacing=0 cellpadding=2>
<tr><td valign='top'><pre>`,U='<pre onmouseover="high(event,1)" onmouseout="high(event,0)" onmousemove="move(event)" onmousedown="doClick(event)">'});
