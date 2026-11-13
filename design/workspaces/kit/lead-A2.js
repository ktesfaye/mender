(function(){
const MODE = window.MODE; const MANY = MODE==='many'; const S = MANY?2:3;
const W=1480,H=1020; const P = window.POS[MANY?14:8];
const K='sprites/props-tx-village-props-';
const world=document.getElementById('world'), lit=document.getElementById('lit'), txt=document.getElementById('txt');
function el(tag,cls,parent){const e=document.createElement(tag); if(cls)e.className=cls; const isT=/(^| )(lab|voice|ask|log|reveal)( |$)/.test(cls||''); (parent||(isT?txt:world)).appendChild(e); return e}
function img(src,w,h,ax,ay,o){ o=o||{}; const sc=o.s||S; const e=document.createElement('img'); e.className='px'; e.src=src;
  e.style.width=(w*sc)+'px'; e.style.height=(h*sc)+'px'; e.style.left=Math.round(ax-w*sc/2)+'px'; e.style.top=Math.round(ay-h*sc)+'px';
  let tf=''; if(o.flip) tf+=' scaleX(-1)'; if(o.rot) tf+=' rotate('+o.rot+'deg)'; if(tf) e.style.transform=tf;
  if(o.f) e.style.filter=o.f; if(o.op!=null) e.style.opacity=o.op; if(o.z) e.style.zIndex=o.z;
  (o.lit?lit:world).appendChild(e); return e; }
const A=n=>'A/'+n+'.png';
const lights=[];
function light(x,y,r,c,a,fl,flat){lights.push({x,y,r,c,a,fl:fl||0,flat:flat==null?.62:flat,ph:Math.random()*6})}
let seed=11; const rnd=()=>{seed=(seed*16807)%2147483647; return seed/2147483647};
const flames=[], bobbers=[];
const SC=S/3;

// ---------- ground (kit tiles, built offline) ----------
document.getElementById('ground').style.backgroundImage='url(A/ground2-'+(MANY?14:8)+'.png)';

window.POS_HOT=[[P.outer[0][0],P.outer[0][1]],[P.outer[8][0]+90,P.outer[8][1]]];
// ---------- trees closing in at the edges ----------
(function(){
  const TR=window.TREES; const names=['birch1','birch2','birch3','birch4','birch5','oak1','oak2','bush1','bush2','bush3','bush4','bush5','bush6','bush7','rock5'];
  const items=[]; const cx=740, cy=500;
  for(let i=0;i<(MANY?60:46);i++){
    const t=i/(MANY?60:46)*6.2832+rnd()*.18; const rr=1+rnd()*.12;
    const x=cx+Math.cos(t)*(MANY?800:770)*rr, y=cy+Math.sin(t)*(MANY?520:500)*rr;
    if(x<600&&y<150) continue; if(x>1200&&y<130) continue;
    const big=rnd()<.55; const n=big?['birch1','birch2','birch3','birch4','birch5','oak1','oak2'][Math.floor(rnd()*7)]:['bush1','bush2','bush3','bush4','bush5','bush6','bush7'][Math.floor(rnd()*7)];
    items.push({n,x,y});
  }
  const hot=window.POS_HOT||[];
  // a second, denser tier right at the corners
  [[40,60],[1440,160],[60,1000],[1450,960],[740,1040],[300,1050],[1150,1050],[10,520],[1470,560]].forEach(([x,y],i)=>items.push({n:['oak1','birch2','oak2','birch4','bush5','bush3','bush7','birch1','birch5'][i],x,y}));
  items.filter(it=>!(window.POS_HOT||[]).some(h=>Math.hypot(h[0]-it.x,h[1]-it.y)<430)).sort((a,b)=>a.y-b.y).forEach(it=>{ const d=TR[it.n]; img('A/t-'+it.n+'.png',d[0],d[1],it.x,it.y,{s:S,f:'hue-rotate(70deg) saturate(.45) brightness(.42)'}); });
})();

// ---------- camps ----------
function flame(ax,ay,o){ const e=img('A/flame-'+(Math.floor(rnd()*4))+'.png',10,12,ax,ay,Object.assign({lit:1,s:S},o||{})); flames.push(e); return e }
function smoke(ax,ay){ for(let i=0;i<4;i++){ const sz=[3,5,7,9][i]; img('A/smoke-'+i+'.png',sz,[3,5,6,8][i],ax+(i%2?1:-1)*S*(i+1),ay-i*9*S/1.2,{lit:1,op:.55-i*.08,f:'brightness(.55)'}); } }
const warm=(c)=>A('tent-'+c+'-warm');
function pool(x,y,r,col,a,flat){ light(x,y,r*SC*1.05,col,a,.12,flat) }
function camp(p){
  const x=p.x,y=p.y,st=p.state, tx=x-24*S, ty=y+3*S;
  const person=(src,w,h,ax,o)=>img(src,w,h,ax,y+5*S,o);
  if(st==='work'||st==='stuck'){
    img(warm(p.tent||'blue'),34,25,tx,ty); img(A('bed-lit'),22,12,x,y+5*S); flame(x,y-1*S);
    pool(x,y+2*S,200,[255,150,60],.34,.55); light(x,y-8*S,90*SC,[255,170,80],.3,.2,1);
  }
  if(st==='work'){ const e=person(A('sit-'+(p.v||0)),14,23,x+17*S,{f:p.hue?'hue-rotate('+p.hue+'deg)':''}); bobbers.push(e); }
  if(st==='stuck'){ person(A('walk-side-1'),14,27,x+21*S,{flip:true}); }
  if(st==='ask'||st==='broken'){
    const sx=x+32*S; img(A('staff'),13,50,sx,y+5*S,{});
    const lf= st==='ask'? '' : 'hue-rotate(-32deg) saturate(1.5) brightness(.85)';
    const lx=sx+3.5*S, ly=y+5*S-50*S+27*S;
    img(K+'lantern-01-on-png-x1.png',11,19,lx,y+5*S-50*S+17*S+19*S,{lit:1,f:lf});
    if(st==='ask'){
      pool(x+8*S,y+3*S,440,[255,120,45],1,.58); pool(x+8*S,y+3*S,560,[255,105,40],.3,.55); light(lx,ly,230*SC,[255,175,80],.95,.22,1);
      const bm=el('div','abs beam'); bm.style.cssText=`left:${lx-70*SC}px;top:${ly-270}px;width:${140*SC}px;height:300px;background:radial-gradient(ellipse 50% 50% at 50% 70%,rgba(255,170,80,.38),rgba(255,150,60,0) 100%);mix-blend-mode:screen;animation:breathe 2.4s ease-in-out infinite`; lit.appendChild(bm);
    } else {
      pool(x+8*S,y+3*S,380,[235,85,60],.85,.58); pool(x+8*S,y+3*S,600,[220,70,50],.4,.55); light(lx,ly,170*SC,[235,90,65],.75,.25,1);
      const bm=el('div','abs beam'); bm.style.cssText=`left:${lx-50*SC}px;top:${ly-170}px;width:${100*SC}px;height:210px;background:radial-gradient(ellipse 50% 50% at 50% 70%,rgba(235,90,70,.3),rgba(235,90,70,0) 100%);mix-blend-mode:screen;animation:breathe 3.6s ease-in-out infinite`; lit.appendChild(bm);
    }
  }
  if(st==='ask'){ img(warm(p.tent||'rust'),34,25,tx,ty); img(A('bed-lit'),22,12,x,y+5*S); flame(x,y-1*S); person('A/town-c-front-0.png',14,25,x+19*S,{}); }
  if(st==='asklead'){
    img(warm(p.tent||'sage'),34,25,tx,ty); img(A('bed-lit'),22,12,x,y+5*S); flame(x,y-1*S);
    pool(x,y+2*S,170,[255,150,60],.3,.55);
    person(A('town-e-back-0'),14,27,x+14*S,{});
    img(K+'lantern-02-on-png-x1.png',9,17,x+14*S,y-8*S,{lit:1,f:'grayscale(.7) brightness(1.5) contrast(.9)'});
    light(x+14*S,y-16*S,120*SC,[205,225,255],.4,.2,.8);
  }
  if(st==='broken'){
    img(A('tent-cold'),34,25,tx,ty); img(A('bed-cold'),22,12,x,y+5*S);
    person(A('sit-0'),14,23,x+17*S,{f:'grayscale(.7) brightness(.85)'}); smoke(x,y-4*S);
  }
  if(st==='limit'){
    img(A('tent-sage'),34,25,tx,ty); img(A('bed-embers'),22,12,x,y+5*S);
    img(A('bedroll'),22,9,x+18*S,y+6*S,{}); img(A('front-0'),14,27,x+14*S+3,y+6*S-6*S,{rot:-90,f:'saturate(.75)'});
    pool(x,y+2*S,150,[210,60,40],.2,.55); light(x,y-4*S,60*SC,[210,60,40],.25,.12,1);
    for(let i=0;i<4;i++){ const e=document.createElement('div'); e.className='abs'; e.style.cssText=`left:${x+(i-1.5)*3*S}px;top:${y-(8+i*7)*S}px;width:${S}px;height:${S}px;background:#ff7a3a;box-shadow:0 0 4px #ff6a30;opacity:${.9-i*.18}`; lit.appendChild(e); }
  }
  if(st==='setup'){
    img(A('tent-half'),34,25,tx,ty); img(K+'firewood-pile-01-png-x1.png',34,27,x-2*S,y+9*S,{s:Math.max(1,S-1)});
    person('A/town-g-side-0.png',14,27,x+22*S,{flip:true});
    const h=img('A/carry-hammer.png',6,7,x+13*S,y-12*S,{lit:1}); h.style.transformOrigin='100% 100%'; h.style.transform='rotate(-35deg)';
    img(K+'rock-02-png-x1.png',16,12,x-48*S,y+9*S,{}); img(K+'lantern-01-on-png-x1.png',11,19,x-48*S,y+6*S,{lit:1});
    pool(x-30*S,y+3*S,200,[255,175,80],.34,.55);
  }
  if(st==='done'){
    img(A('packed'),34,30,tx,ty+2*S); person('A/town-a-front-0.png',14,27,x+19*S,{});
    const px=tx-17*S+29*S;
    if(p.notes) for(let i=0;i<p.notes;i++) img(A('note'),7,9,px+(i?-4:4)*S,ty-14*S+i*9*S+2*S,{lit:1,rot:i?-8:6});
    pool(px,y+2*S,170,[170,230,140],.26,.55); light(px+4*S,ty-18*S,70*SC,[170,230,140],.25,.12,1);
    if(p.ci) img(A('flask-bad'),7,9,x+3*S,y+9*S,{lit:1});
  }
  if(st==='landed'){ img(A('swept'),44,22,x,y+9*S,{op:.8}); }
  if(st==='ghost'){
    img(A('ghost'),40,22,x,y+9*S,{op:.6});
    const a=el('div','abs'); a.style.cssText=`left:${x-S*3}px;top:${y-S*2}px;width:${S*6}px;height:${S*2}px;background:#f2c66d;box-shadow:0 0 8px rgba(242,198,109,.5)`;
    const b=el('div','abs'); b.style.cssText=`left:${x-S}px;top:${y-S*4}px;width:${S*2}px;height:${S*6}px;background:#f2c66d;box-shadow:0 0 8px rgba(242,198,109,.5)`;
    const gl=el('div','log'); gl.textContent='hand it another'; gl.style.cssText+=`left:${x-90}px;width:180px;text-align:center;top:${y+16*S}px;font-size:${MANY?14:17}px`;
    return;
  }
  const lab=el('div','lab'+(MANY?' s2':'')+(p.cls?' '+p.cls:'')+((p.state==='ask'||p.state==='broken')?'':' q'));
  lab.style.left=(x-4*S-120)+'px'; lab.style.width='240px'; lab.style.top=(y+12*S)+'px';
  lab.innerHTML=`<div class="key">${p.k}</div><div class="ttl">${p.t}</div><div class="st ${p.tone||'g'}">${p.ph||''}</div>`;
  return lab;
}

// ---------- data on the ring ----------
const O=P.outer, I=P.inner.length?P.inner:[[0,0],[0,0],[0,0],[0,0],[0,0]];
const T8=[
 {k:'INV-71702',t:'Flaky e2e on statements download',state:'broken',cls:'sore',tone:'s',ph:'fell over twice on setup'},
 {k:'INV-72033',t:'Holdings CSV column order',state:'limit',tone:'s',ph:'resting, back at 2:40pm'},
 {k:'INV-71990',t:'Dividend reinvest toggle',state:'stuck',tent:'ochre',tone:'e',ph:'going in circles · the lead is on it',id:'stuck'},
 {k:'',t:'',state:'ghost'},
 {k:'INV-71924',t:'Wash sale info under each loss',state:'work',tone:'g',ph:'writing the reason line · 22m',tent:'blue',v:0},
 {k:'INV-72011',t:'Q4 tax doc banner copy',state:'done',cls:'moss',tone:'m',ph:'2 comments to answer',notes:2},
 {k:'INV-72040',t:'Gift lot holding period',state:'setup',tone:'g',ph:'pitching camp · 14s'},
 {k:'INV-71650',t:'Rename Realized tab',state:'landed',cls:'dim',tone:'g',ph:'landed an hour ago'},
 {k:'INV-71880',t:'Cost basis export drops split-day lots',state:'ask',tent:'rust',cls:'hot',tone:'e',ph:'waiting on you'},
].map((d,i)=>Object.assign(d,{x:O[i][0],y:O[i][1]}));
const T14=[
 {k:'INV-71702',t:'Flaky e2e on statements download',state:'broken',cls:'sore',tone:'s',ph:'fell over twice'},
 {k:'INV-72033',t:'Holdings CSV column order',state:'limit',tone:'s',ph:'back at 2:40pm'},
 {k:'INV-71990',t:'Dividend reinvest toggle',state:'stuck',tent:'ochre',tone:'e',ph:'going in circles'},
 {k:'INV-71611',t:'Tax lot page skeleton loader',state:'done',cls:'moss',tone:'s',ph:'CI failed',ci:1,notes:0},
 {k:'INV-71924',t:'Wash sale info under each loss',state:'work',tone:'g',ph:'step 4 of 6 · 22m',tent:'blue',v:0},
 {k:'INV-72011',t:'Q4 tax doc banner copy',state:'done',cls:'moss',tone:'m',ph:'2 comments to answer',notes:2},
 {k:'INV-72040',t:'Gift lot holding period',state:'setup',tone:'g',ph:'pitching camp · 14s'},
 {k:'INV-71650',t:'Rename Realized tab',state:'landed',cls:'dim',tone:'g',ph:'landed an hour ago'},
 {k:'INV-71880',t:'Cost basis export drops split-day lots',state:'ask',tent:'rust',cls:'hot',tone:'e',ph:'waiting on you'},
].map((d,i)=>Object.assign(d,{x:O[i][0],y:O[i][1]})).concat([
 {k:'INV-72058',t:'Realized gain tooltip copy',state:'asklead',tent:'sage',tone:'g',ph:'asked the lead',id:'lead'},
 {k:'INV-71855',t:'Lot matching rounding',state:'work',tent:'sage',tone:'g',ph:'step 2 of 5 · 9m',hue:-20,v:1},
 {k:'INV-72066',t:'Currency symbol in 1099 preview',state:'setup',tone:'g',ph:'pitching camp · 3s'},
 {k:'INV-71977',t:'Export filename date format',state:'work',tent:'ochre',tone:'g',ph:'step 5 of 6 · 31m',hue:35,v:0},
 {k:'INV-71540',t:'Archive old CSV endpoint',state:'landed',cls:'dim',tone:'g',ph:'landed 3h ago'},
].map((d,i)=>Object.assign(d,{x:I[i][0],y:I[i][1]})));
const DATA=MANY?T14:T8; const ctr={x:740,y:450};
// draw back to front so lower camps stand in front
const labs={};
DATA.slice().sort((a,b)=>a.y-b.y).forEach(p=>{const l=camp(p); if(l) labs[p.k]=l});

// ---------- the council fire ----------
(function(){
  const x=ctr.x, sc=MANY?2:3, bottom=MANY?494:510;
  img(K+'wood-log-01-h-png-x1.png',43,10,x-44*sc,bottom+8*sc,{s:sc}); img(K+'wood-log-01-h-png-x1.png',43,10,x+46*sc,bottom+8*sc,{s:sc});
  img(K+'campfire-01-lit-png-x1.png',46,32,x,bottom,{s:sc});
  for(let i=0;i<3;i++){ const f=img('A/flame-'+i+'.png',10,12,x+(i-1)*8*sc,bottom-12*sc-(i==1?3*sc:0),{lit:1,s:sc*(i==1?1.7:.8)}); flames.push(f); }
  light(x,bottom-14*sc,520*sc/3,[255,160,70],1,.14,.62); light(x,bottom-14*sc,230*sc/3,[255,175,90],1,.2,.8);
  smoke(x+4*sc,bottom-30*sc);
})();
// the lead, and the trail it walks
(function(){
  const target = DATA.find(p=>p.id==='stuck') || DATA.find(p=>p.id==='lead'); if(!target) return;
  const x0=ctr.x,y0=ctr.y+16; const t=MODE==='point'?0.9:.52;
  const x=x0+(target.x-x0)*t, y=y0+(target.y+S*6-y0)*t;
  const sx=ctr.x-44*S, sy=(MANY?494:510)+8*S;
  img('A/scroll.png',12,7,sx,sy+(MANY?-4:-2)*S-2*S,{s:S,lit:1});
  const lg=el('div','log'); lg.textContent='what I have done'; lg.style.cssText+=`;left:${sx-62}px;top:${sy+8*S}px;font-size:${MANY?13:14}px`;
  const dir=target.x<x0;
  if(MODE==='point'){
    const px=target.x-50*S, py=target.y+5*S;
    img('A/side-0.png',14,27,px,py,{});
    img(K+'lantern-02-on-png-x1.png',9,17,px-7*S,py-10*S,{lit:1,f:'grayscale(.5) brightness(1.4)'});
    light(px,py-14*S,140*SC,[220,230,255],.4,.2,.8);
  } else {
    img('A/walk-side-2.png',14,27,x,y,{flip:dir,z:5});
    img(K+'lantern-02-on-png-x1.png',9,17,x+(dir?-7:7)*S,y-8*S,{lit:1,f:'grayscale(.5) brightness(1.4)'});
    light(x,y-14*S,140*SC,[220,230,255],.42,.2,.8);
  }
  const n=14; for(let i=1;i<=n;i++){ const tt=i/(n+1)*(MODE==='point'?.88:.5); const fx=x0+(target.x-x0)*tt, fy=y0+(target.y-8-y0)*tt+(i%2?5:-3); const d=el('div','abs'); d.style.cssText=`left:${fx}px;top:${fy}px;width:${S*2}px;height:${S}px;background:rgba(210,225,255,.38);box-shadow:0 0 4px rgba(190,210,255,.4)`; }
})();
// ember-lit trails to the ones that need him
DATA.filter(p=>p.state==='ask'||p.state==='broken').forEach(p=>{
  const x0=ctr.x,y0=ctr.y+70,x1=p.x,y1=p.y-6; const n=Math.floor(Math.hypot(x1-x0,y1-y0)/(S*7));
  const col=p.state==='ask'?'rgba(255,170,90,.7)':'rgba(240,120,100,.55)';
  for(let i=2;i<n-1;i++){const t=i/n; const d=el('div','abs'); d.style.cssText=`left:${Math.round(x0+(x1-x0)*t)}px;top:${Math.round(y0+(y1-y0)*t+Math.sin(t*9)*5)}px;width:${S}px;height:${S}px;background:${col};box-shadow:0 0 6px ${col}`;}
});

// ---------- the lead's words, written at the fire ----------
if(!MANY){
  const v=el('div','voice'); v.style.cssText='left:455px;top:596px;width:480px';
  v.innerHTML=`<div class="big">Two need you.</div>
  <p><span class="e">71880</span> wants to know which price split-day lots take; the ticket doesn't say. <span class="s">71702</span> has fallen over twice on the same setup error, and I've stopped retrying it.</p>
  <p class="old">Everything else is moving. I told 71990 to stop rerunning its test and read the failure.</p>`;
  const a=el('div','ask'); a.style.cssText='left:455px;top:806px;width:500px';
  a.innerHTML=`<div class="q"><em>71880 ASKS</em>Should lots bought on a split day use the pre-split or the post-split price?</div><div class="opts"><span class="o">the pre-split price</span><span class="o">the post-split price</span></div>`;
} else {
  const v=el('div','voice'); v.style.cssText='left:560px;top:572px;width:360px';
  v.innerHTML=`<div class="big" style="font-size:27px">Three need you.</div>
  <p style="font-size:16px;line-height:1.42"><span class="e">71880</span> wants to know which price split-day lots take. <span class="s">71702</span> has fallen over twice on the same setup error. <span class="s">71611</span> failed CI and I can't read why.</p>
  <p style="font-size:16px;line-height:1.42" class="old">Everything else is moving. 72058 asked me about a tooltip; I answered.</p>`;
  const a=el('div','ask'); a.style.cssText='left:560px;top:806px;width:380px';
  a.innerHTML=`<div class="q" style="font-size:18px"><em>71880 ASKS</em>Pre-split or post-split price for split-day lots?</div><div class="opts" style="margin-top:6px"><span class="o" style="font-size:17px">pre-split</span><span class="o" style="font-size:17px">post-split</span></div>`;
}
const hd=el('div','head',document.body);
hd.innerHTML=`<div class="a">INVEST-WEB<i>/</i><b>Sprint 42 lead</b></div><div class="m">Sonnet 5.5 · low · started 1h 12m ago · ${MANY?14:8} tickets</div>`;
el('div','wl',document.body); const wt=el('div','wl-t',document.body); wt.textContent='to the lead'; el('div','caret',document.body);
const rk=el('img','rack',document.body); rk.src='A/rack2.png';

if(MODE==='point'){
  const t=DATA.find(p=>p.id==='stuck'); const x=t.x+140, y=t.y-150;
  Object.keys(labs).forEach(k=>{ if(k!=='INV-71990') labs[k].style.opacity=.3; });
  txt.querySelectorAll('.log').forEach(e=>{ e.style.opacity=0; }); txt.querySelectorAll('.voice,.ask').forEach(e=>e.style.opacity=.4);
  const r=el('div','reveal'); r.style.cssText=`left:${x}px;top:${y}px;width:250px`;
  r.innerHTML=`<div class="t">WORKING · 41M</div><div class="h" style="margin-top:4px">running the same failing test again</div>
   <div id="flasks" style="height:34px;margin-top:6px;position:relative"></div><div class="l" style="margin-top:6px;opacity:.7">six times now</div>
   <div class="t" style="margin-top:16px;color:rgba(246,236,219,.5)">STEP 3 OF 5</div><div class="l">wiring the toggle into the form</div>
   <div id="pebs" style="height:20px;margin-top:6px;position:relative"></div>
   <div class="l" style="margin-top:14px"><span style="color:#cfd8ff">I told it, 3m ago:</span> read the failure, stop rerunning it. <span style="opacity:.6">Still watching.</span></div>`;
  const fl=r.querySelector('#flasks'); for(let i=0;i<6;i++){const f=document.createElement('img');f.src='A/flask-bad.png';f.className='px';f.style.cssText=`position:absolute;left:${i*30}px;top:${i%2?4:0}px;width:21px;height:27px;image-rendering:pixelated`;fl.appendChild(f)}
  const pb=r.querySelector('#pebs'); ['done','done','now','todo','todo'].forEach((s,i)=>{const f=document.createElement('img');f.src='A/peb-'+s+'.png';f.className='px';f.style.cssText=`position:absolute;left:${i*36}px;top:0;width:28px;height:20px;image-rendering:pixelated`;pb.appendChild(f)});
  pool(t.x+8*S,t.y+3*S,320,[255,170,80],.75,.58);
}

// ---------- night ----------
const nc=document.getElementById('night'); const DPR=2; nc.width=W*DPR; nc.height=H*DPR; nc.style.width=W+'px'; nc.style.height=H+'px';
const ctx=nc.getContext('2d'); ctx.scale(DPR,DPR);
function paint(tm){
  ctx.globalCompositeOperation='source-over'; ctx.clearRect(0,0,W,H);
  ctx.fillStyle= MODE==='point'?'rgba(4,9,20,.80)':'rgba(5,10,22,.74)'; ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation='destination-out';
  lights.forEach(l=>{ const f=1+l.fl*Math.sin(tm*.004+l.ph)*.5; const r=l.r*f; ctx.save(); ctx.translate(l.x,l.y); ctx.scale(1,l.flat);
    const g=ctx.createRadialGradient(0,0,0,0,0,r); g.addColorStop(0,'rgba(0,0,0,'+Math.min(1,l.a*1.3)+')'); g.addColorStop(.5,'rgba(0,0,0,'+(l.a*.6)+')'); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,r,0,7); ctx.fill(); ctx.restore(); });
  ctx.globalCompositeOperation='lighter';
  lights.forEach(l=>{ const f=1+l.fl*Math.sin(tm*.004+l.ph)*.5; const r=l.r*f*.9; ctx.save(); ctx.translate(l.x,l.y); ctx.scale(1,l.flat);
    const g=ctx.createRadialGradient(0,0,0,0,0,r); g.addColorStop(0,`rgba(${l.c[0]},${l.c[1]},${l.c[2]},${l.a*.3})`); g.addColorStop(1,`rgba(${l.c[0]},${l.c[1]},${l.c[2]},0)`); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,r,0,7); ctx.fill(); ctx.restore(); });
}
paint(0);
setInterval(()=>{ flames.forEach(f=>{f.src='A/flame-'+Math.floor(Math.random()*4)+'.png'}); paint(performance.now()); },140);
let ph=0; setInterval(()=>{ph^=1; bobbers.forEach(b=>{b.style.transform=ph?'translateY(-'+S+'px)':''})},700);
document.fonts.ready.then(()=>setTimeout(()=>{document.body.dataset.ready=1},900));
})();
