const SZ={"bush01":[27,27],"bush02":[38,30],"bush03":[42,39],"bush04":[45,38],"bush05":[57,41],"bush06":[73,45],"bush07":[79,57],"flower0":[9,14],"flower1":[13,17],"flower2":[12,18],"flower3":[15,19],"tuft0":[8,7],"tuft1":[9,7],"tuft2":[8,6],"tuft3":[8,5],"tuft4":[11,8],"tuft5":[14,9],"tuft6":[12,8],"tuft7":[12,9],"tuft8":[12,7],"tuft9":[12,7],"tuft10":[12,6],"tuft11":[15,6],"tuft12":[14,9],"tuft13":[15,9],"tuft14":[16,9],"tuft15":[17,9],"fence0":[40,27],"fence1":[72,27],"hammer":[9,22],"lampoff":[9,17],"rock01":[14,13],"rock02":[16,12],"rock03":[14,13],"rock04":[16,12],"rock05":[22,19],"rock06":[22,12],"rock07":[25,20],"rock08":[27,20],"rock09":[28,28],"rock10":[35,20],"front-0":[14,27],"front-1":[14,27],"sit-0":[14,23],"sit-1":[14,23],"side-0":[14,27],"helper-side-0":[14,25],"helper-sit-0":[14,22],"helper-front-0":[14,25],"town-a-front-0":[14,27],"town-b-front-0":[14,27],"town-c-front-0":[14,25],"town-d-front-0":[14,23],"town-e-front-0":[14,27],"firefly":[2,2],"coil":[11,6]};
function rng(seed){let s=seed;return()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296}}
// anything natural, dimmed to night, its feet on `base`, centred on cx
function nat(name,cx,base,b=.5,st=''){const [w,h]=SZ[name];const p=name==='coil'?'coil.png':'k/'+name+'.png';
  return im(p,cx-w,base-h*2,w,h,`filter:brightness(${b}) saturate(.85);${st}`)}
function ground(name){
  const e=im(name+'.png',30,0,600,75,'filter:brightness(.72) saturate(.9);-webkit-mask-image:linear-gradient(to bottom,#000 0,#000 124px,transparent 150px),linear-gradient(to right,transparent 0,#000 70px,#000 1090px,transparent 1170px);-webkit-mask-composite:source-in;mask-composite:intersect');
  return e}
function pool(x,y,r,rgb,a){div('glow breathe',x-r,y-r,`width:${2*r}px;height:${2*r}px;background:radial-gradient(circle,rgba(${rgb},${a}),rgba(${rgb},0) 68%)`)}
// a post: a stem standing on `base`, `h` art tall, optionally leaning; returns where a plank on it should meet it
function post(cx,base,h,lean=0,b=.62,st=''){
  const top=base-h*2;
  if(!lean){im('stem.png',cx-6,top,6,h,`filter:brightness(${b}) saturate(.9);${st}`);}
  else{const n=lean<0?'L':'R';im(`stem${n}-${h}.png`,cx-14,top,14,h,`filter:brightness(${b}) saturate(.9);${st}`)}
  im('foot.png',cx-14,base-4,14,4,`filter:brightness(${b*.7})`);
  return {top,shift:y=>lean?Math.round(lean*(base-y)/18)*2:0};
}
const FS=14;
let _cv;const tw=(t,px=FS)=>{_cv=_cv||document.createElement('canvas').getContext('2d');_cv.font=`${px}px MenderHand`;return _cv.measureText(t).width};
// a sign: plain title in readable ink, its key stamped, its props hanging off it.
// big = the workspace you are standing in: tall plank, title wrapped in full, seals and crow full size
const MAXT=150;
function sign(o){
  const own=o.big, quiet=!!o.quiet;
  const kw=o.key?(o.key.length*6.4+14):0;
  const tt=Math.min(tw(o.title),MAXT);
  let W=o.W; if(!W){const t=tt+(o.home?26:0)+(o.cut?34:0)+(o.st==='done'?28:0);W=Math.ceil((kw+t+(o.st==='broke'&&!own?64:40))/4)*2}
  if(own&&!o.W)W=Math.ceil((kw+2+tw('Explain why a wash-sale')+44)/4)*2;
  const H=own?20:12, hp=H*2, L=o.side==='L';
  const br=o.br??(own?1.08:(o.cut?.9:(quiet?.42:.66)));
  const x=L?o.x-2*W:o.x, y=o.y;
  const src=own?`armTR-${W}.png`:(o.st==='broke'?`armC-${W}.png`:`armR-${W}.png`);
  const n=o.slips||0;
  for(let i=0;i<n;i++){const sx=x+2*W-(own?170:62)+i*15, sy=y-(own?(i===1?17:13):12)+(i===2?2:0); im('slip'+['L','M','R'][i%3]+'.png',sx,sy,10,10,'filter:brightness(.9)')}
  const e=im(src,x,y,W,H,`filter:brightness(${br}) saturate(.9);${L?'transform:scaleX(-1)':''}`);
  if(o.cut){e.style.filter='brightness(1.3) saturate(.5) sepia(.2)';div('a',x+(L?2*W-12:8),y+3,'width:4px;height:4px;background:#f1e7cf');div('a',x+(L?2*W-12:8),y+17,'width:4px;height:4px;background:#f1e7cf')}
  const dark=!quiet, ink=dark?'#2a1608':'#eadfc6';
  const stamp=o.key?`<span class="stamp" style="border-color:${dark?'rgba(70,32,14,.7)':'rgba(234,223,198,.55)'}">${o.key}</span>`:'';
  let inner;
  if(own) inner=`<span style="display:flex;align-items:center;gap:8px;height:100%">${stamp}<span style="white-space:normal;width:${Math.ceil(tw('Explain why a wash-sale'))+6}px;line-height:16px">${o.title}</span></span>`;
  else inner=`<span style="display:flex;align-items:center;gap:7px;height:100%;white-space:nowrap">${stamp}${o.W?o.title:`<span style="display:inline-block;max-width:${MAXT}px;overflow:hidden;text-overflow:ellipsis">${o.title}</span>`}${o.cut?'<span style="font-size:12px;opacity:.8;margin-left:4px">14s</span>':''}</span>`;
  if(o.home) im('house.png',x+(L?2*W-34:14),y+1,11,11,'filter:brightness(.75)');
  const tipPad=o.st==='broke'&&!own?10:16, ribbon=o.st==='done'?28:0;
  let lo,hi; if(!L){lo=x+(o.home?44:(o.cut?22:18));hi=x+2*W-tipPad-ribbon}else{lo=x+tipPad+ribbon;hi=x+2*W-(o.home?44:18)}
  div('ink',lo,y,`width:${hi-lo}px;height:${hp}px;font-size:${FS}px;line-height:${hp}px;color:${ink};filter:none;${L?'text-align:right;':''}text-shadow:${dark?'0 1px 0 rgba(255,232,190,.22)':'0 1px 0 rgba(0,0,0,.6)'}`,L?inner.replace('display:flex;','display:flex;justify-content:flex-end;'):inner);
  const seals=(arr,s,left)=>arr.forEach((g,i)=>{const cx=left+i*(s*2+8),top=y+hp;
    div('a',cx+s-1,top-1,'width:2px;height:'+(s===11?10:7)+'px;background:#b89d6a;box-shadow:1px 0 #6f5a44');
    im(`seal${s}-${g?'f':'e'}.png`,cx,top+(s===11?9:6),s,s,'')});
  if(o.mr) seals(o.mr,7,own?x+2*W-46:x+(L?2*W-40:12));
  if(o.crow) own?im('crow-rim.png',x+2*W-62,y-20,14,11,''):im('crow-rim.png',x+(L?14:2*W-48),y-16,14,11,'transform:scale(.75);transform-origin:bottom');
  if(o.lamp) hang(L?x+22:x+2*W-24,y+hp,o.lamp,6);
  if(o.st==='done'){const rx=L?x+20:x+2*W-48;div('a',rx,y,'width:8px;height:24px;background:#5e9a4c;box-shadow:inset 2px 0 #7fc26a,inset -2px 0 #3f6e35');div('a',rx-1,y+9,'width:10px;height:7px;background:#46793a');div('a',rx+1,y+24,'width:3px;height:11px;background:#5e9a4c');div('a',rx+5,y+24,'width:3px;height:8px;background:#4c8240')}
  return {x,y,W,L,top:y,hp,right:x+2*W};
}
function person(name,cx,base,o={}){
  const [w,h]=SZ[name];const e=im('k/'+name+'.png',cx-w,base-h*2,w,h,`filter:${o.gray?'grayscale(.8) brightness(.78)':'brightness(.92)'}`);
  if(o.lamp){const lx=cx+(o.lampDx??20),ly=base-(o.lampDy??38);
    im(LAMP,lx,ly,9,17,`filter:${ST[o.lamp].f}`);pool(lx+9,ly+18,46,ST[o.lamp].g,.38)}
  return e}
function flies(n,seed,x0,x1,y0,y1){const r=rng(seed);for(let i=0;i<n;i++){const x=x0+r()*(x1-x0),y=y0+r()*(y1-y0);
  div('a',x,y,`width:4px;height:4px;background:#f3f09a;box-shadow:0 0 8px 3px rgba(240,230,120,.55);opacity:${.55+r()*.45}`)}}
function dress(seed,items){const r=rng(seed);items.forEach(([kind,x0,x1,y0,y1,n])=>{for(let i=0;i<n;i++){
  const x=x0+r()*(x1-x0),y=y0+r()*(y1-y0);
  if(kind==='tuft')nat('tuft'+Math.floor(r()*16),x,y,.5);
  else if(kind==='flower')nat('flower'+Math.floor(r()*4),x,y,.62);
  else if(kind==='rock')nat('rock0'+(1+Math.floor(r()*6)),x,y,.5);
}})}
