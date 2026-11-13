(function(){
const MODE = window.MODE; // rest | point | many
const MANY = MODE==='many'; const S = MANY?2:3;
const W=1480,H=1020;
const K='sprites/props-tx-village-props-';
const D = {'tent':[34,25],'tent-half':[34,25],'packed':[34,30],'swept':[44,22],'bed':[22,12],'bedroll':[22,9],'staff':[13,50],'ghost':[40,22],'peb':[7,5],'flask':[7,9],'note':[7,9],'scroll':[12,7]};
const world = document.getElementById('world');
const lit = document.getElementById('lit');
const txt=document.getElementById('txt');
function el(tag,cls,parent){const e=document.createElement(tag); if(cls)e.className=cls; const isT=/(^| )(lab|voice|ask|log|reveal)( |$)/.test(cls||''); (parent||(isT?txt:world)).appendChild(e); return e}
function img(src,w,h,ax,ay,o){ // anchor bottom-center in css px, w/h in art px
  o=o||{}; const sc=o.s||S; const e=document.createElement('img'); e.className='px'; e.src=src;
  e.style.width=(w*sc)+'px'; e.style.height=(h*sc)+'px';
  e.style.left=Math.round(ax-w*sc/2)+'px'; e.style.top=Math.round(ay-h*sc)+'px';
  if(o.flip) e.style.transform='scaleX(-1)';
  if(o.rot) e.style.transform=(e.style.transform||'')+' rotate('+o.rot+'deg)';
  if(o.f) e.style.filter=o.f; if(o.op!=null) e.style.opacity=o.op; if(o.z) e.style.zIndex=o.z;
  if(o.cls) e.className+=' '+o.cls;
  (o.lit?lit:world).appendChild(e); return e;
}
const A=n=>'A/'+n+'.png';
const lights=[]; // {x,y,r,c:[r,g,b],a,fl,ph}
function light(x,y,r,c,a,fl){lights.push({x,y,r,c,a,fl:fl||0,ph:Math.random()*6})}
// rng
let seed=7; const rnd=()=>{seed=(seed*16807)%2147483647; return seed/2147483647};

// ---------- ground ----------
function ground(camps,ctr){
  const g=document.getElementById('ground'); const gw=Math.ceil(W/3), gh=Math.ceil(H/3);
  g.width=gw; g.height=gh; g.style.width=(gw*3)+'px'; g.style.height=(gh*3)+'px';
  const c=g.getContext('2d'); const id=c.createImageData(gw,gh); const d=id.data;
  const cx=ctr.x/3, cy=ctr.y/3;
  const pal=[[17,27,19],[19,30,21],[15,24,18],[21,33,23],[16,26,20]];
  for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){
    let n=((x*73856093)^(y*19349663))>>>0; n=(n^(n>>>13))*1274126177>>>0; const r=(n%1000)/1000;
    let b=pal[(n>>>8)%5].slice();
    // soft blotches
    const bl=Math.sin(x*.07+Math.sin(y*.05)*2)*Math.cos(y*.09+x*.02)*4; b=b.map((v,i)=>v+bl*(i==1?1:.6));
    // trodden dirt around centre
    const dx=(x-cx)/(MANY?250:210), dy=(y-cy)/(MANY?120:105); const dd=dx*dx+dy*dy;
    if(dd<1){ const t=Math.pow(1-dd,1.4); const dirt=[44,35,24]; b=b.map((v,i)=>v+(dirt[i]-v)*Math.min(1,t*1.1)*(r>.12?1:.5)); }
    if(r>.985){b=[b[0]+14,b[1]+22,b[2]+10]} else if(r<.015){b=[b[0]-6,b[1]-8,b[2]-6]}
    const o=(y*gw+x)*4; d[o]=b[0];d[o+1]=b[1];d[o+2]=b[2];d[o+3]=255;
  }
  c.putImageData(id,0,0);
  // trodden paths centre -> camps
  c.fillStyle='rgba(52,41,28,.85)';
  camps.forEach(p=>{
    const x0=cx,y0=cy,x1=p.x/3,y1=(p.y-6)/3; const n=Math.hypot(x1-x0,y1-y0);
    for(let i=0;i<n;i+=1){const t=i/n; const px=x0+(x1-x0)*t+Math.sin(t*9+p.x)*1.2, py=y0+(y1-y0)*t+Math.cos(t*7+p.y)*.8; const w=(1.6-.7*t)*(p.hot?1.2:1);
      if((i%4)!==3){c.fillRect(Math.round(px),Math.round(py),Math.max(1,Math.round(w)),1);} }
  });
  // worn circle on stuck camp
  camps.forEach(p=>{ if(p.circle){ c.fillStyle='rgba(105,80,48,1)'; const rx=(MANY?28:30)/ (3/S)*S/3*1.0; const rr=22*S/3, ry=9*S/3; for(let a=0;a<6.283;a+=.07){c.fillRect(Math.round(p.x/3+rr*Math.cos(a)),Math.round((p.y+2*S)/3+ry*Math.sin(a)),1,1);} } });
  // scatter: pebbles, tufts, flowers (art px)
  for(let i=0;i<260;i++){ const x=Math.floor(rnd()*gw), y=Math.floor(rnd()*gh); const k=rnd();
    if(k<.5){c.fillStyle='rgba(32,52,34,.9)'; c.fillRect(x,y,1,2); c.fillRect(x+1,y+1,1,1); c.fillRect(x-1,y+1,1,1);}
    else if(k<.7){c.fillStyle='rgba(88,96,78,.75)'; c.fillRect(x,y,2,1); c.fillStyle='rgba(50,54,46,.8)'; c.fillRect(x,y+1,2,1);}
    else if(k<.8){c.fillStyle=['#c9b27a','#cfc4d6','#d9a08a'][i%3]; c.fillRect(x,y,1,1); c.fillStyle='rgba(30,60,30,.9)'; c.fillRect(x,y+1,1,1);} }
}

// ---------- scenery at the dark edges ----------
function scenery(){
  const t=(src,w,h,x,y,sc,op)=>img(src,w,h,x,y,{s:sc||S,f:'brightness(.5) saturate(.8)',op:op==null?1:op});
  const birch='sprites/plants-tx-village-plant-tree-birch-02-a-png-x1.png', oak='sprites/plants-tx-village-plant-tree-oak-01-png-x1.png', b3='sprites/plants-tx-village-plant-bush-03-a-png-x1.png', b5='sprites/plants-tx-village-plant-bush-05-a-png-x1.png';
  if(!MANY){
    t(oak,210,207,1480,1160,3); t(oak,210,207,-10,1180,3); t(birch,79,123,1440,520,3); t(birch,79,123,20,900,3);
    t(b5,57,41,160,900,3); t(b3,42,39,1380,900,3);  t(b3,42,39,430,1000,3);t(b5,57,41,780,120,3,.9);
  } else {
    t(oak,210,207,1360,1100,2); t(oak,210,207,60,1110,2); t(birch,79,123,1450,330,2); t(birch,79,123,24,650,2);
    t(b5,57,41,230,960,2); t(b3,42,39,1300,950,2); t(b5,57,41,640,150,2,.9);t(b3,42,39,880,160,2,.9);t(b5,57,41,1110,140,2,.9);
  }
}

// ---------- camps ----------
const flames=[], smokes=[], bobbers=[];
function flame(ax,ay,big,o){ const e=img('A/flame-'+(Math.floor(rnd()*4))+'.png',10,12,ax,ay,Object.assign({lit:1,s:big||S},o||{})); flames.push(e); return e }
function smoke(ax,ay){ for(let i=0;i<4;i++){ const sz=[3,5,7,9][i]; const e=img('A/smoke-'+i+'.png',sz,[3,5,6,8][i],ax+(i%2?1:-1)*S*(i+1),ay-i*9*S/1.2,{lit:1,op:.55-i*.08,f:'brightness(.55)'}); } }

function camp(p){
  const x=p.x,y=p.y; const hot=p.state==='ask', R=(a)=>[x+a*S];
  const L=[]; // labels
  const st=p.state;
  const tx=x-24*S, ty=y+3*S;
  const warmDoor=(c)=>A('tent-'+c+'-warm'), dark=(c)=>A('tent-'+c);
  // pawn helper
  const person=(src,w,h,ax,o)=>img(src,w,h,ax,y+5*S,o);
  if(st==='work'||st==='stuck'||st==='ask'){
    img(warmDoor(p.tent||'blue'),34,25,tx,ty); img(A('bed-lit'),22,12,x,y+5*S);
    flame(x,y-1*S, 1); flame(x+2*S,y+0, 1,{op:.0});
    light(x,y-8*S,(hot?200:140)*S/3,[255,150,60],hot?.62:.34,.18); light(tx,y-6*S,60*S/3,[255,170,80],.28,.1);
  }
  if(st==='work'){
    const e=person(A('sit-'+(p.v||0)),14,23,x+17*S,{f:p.hue?'hue-rotate('+p.hue+'deg)':''}); bobbers.push(e);
    if(p.vv) {}
  }
  if(st==='stuck'){
    // walking on the worn circle
    const e=person(A('walk-side-1'),14,27,x+21*S,{flip:true,f:'saturate(.9)'}); 
    // a second faint trail of footprints already drawn in ground
    light(x,y-8*S,150*S/3,[255,140,50],.42,.35);
  }
  if(st==='ask'||st==='broken'){
    const sx=x+32*S; img(A('staff'),13,50,sx,y+5*S,{});
    const lf= st==='ask'? '' : 'hue-rotate(-32deg) saturate(1.5) brightness(.78)';
    const lx=sx-(6.5-4.5)*S; // lantern hangs at pole arm end
    const ln=img(K.replace('sprites/','sprites/')+'lantern-01-on-png-x1.png',11,19,sx+3.5*S,y+5*S-50*S+17*S+19*S,{lit:1,f:lf});
    if(st==='ask'){ light(sx+3.5*S,y+5*S-50*S+27*S,430*S/3,[255,165,70],1,.25); light(sx+3.5*S,y+5*S-50*S+27*S,640*S/3,[255,140,50],.5,.3);
      const bx=sx+3.5*S, by=y+5*S-50*S+20*S; const bm=el('div','abs beam'); bm.style.cssText=`left:${bx-70*S/3}px;top:${by-260}px;width:${140*S/3}px;height:${300}px;background:radial-gradient(ellipse 50% 50% at 50% 70%,rgba(255,170,80,.34),rgba(255,150,60,0) 100%);mix-blend-mode:screen;animation:breathe 2.4s ease-in-out infinite`; lit.appendChild(bm); }
    else { light(sx+3.5*S,y+5*S-50*S+27*S,190*S/3,[225,80,60],.5,.25); const bx=sx+3.5*S, by=y+5*S-50*S+20*S; const bm=el('div','abs beam'); bm.style.cssText=`left:${bx-50*S/3}px;top:${by-170}px;width:${100*S/3}px;height:210px;background:radial-gradient(ellipse 50% 50% at 50% 70%,rgba(235,90,70,.26),rgba(235,90,70,0) 100%);mix-blend-mode:screen;animation:breathe 3.6s ease-in-out infinite`; lit.appendChild(bm); }
  }
  if(st==='ask'){
    person('A/town-c-front-0.png',14,25,x+19*S,{});
    // posture: standing, facing front
    const t2=A('town-c-front-0'); bobbers.push(lit.lastChild);
  }
  if(st==='asklead'){
    img(warmDoor(p.tent||'sage'),34,25,tx,ty); img(A('bed-lit'),22,12,x,y+5*S); flame(x,y-1*S,1);
    light(x,y-8*S,150*S/3,[255,150,60],.46,.18);
    person(A('town-e-back-0'),14,27,x+14*S,{});
    img(K+'lantern-02-on-png-x1.png'.replace('sprites/',''),9,17,x+14*S,y-8*S,{lit:1,f:'grayscale(.7) brightness(1.5) contrast(.9)'});
    light(x+14*S,y-16*S,120*S/3,[205,225,255],.42,.2);
  }
  if(st==='broken'){
    img(A('tent-cold'),34,25,tx,ty); img(A('bed-cold'),22,12,x,y+5*S);
    const e=person(A('sit-0'),14,23,x+17*S,{f:'grayscale(.75) brightness(.8)'});
    smoke(x,y-4*S); light(x,y-6*S,120*S/3,[220,70,50],.24,.3);
  }
  if(st==='limit'){
    img(A('tent-sage'),34,25,tx,ty); img(A('bed-embers'),22,12,x,y+5*S);
    img(A('bedroll'),22,9,x+18*S,y+6*S,{});
    img(A('front-0'),14,27,x+14*S+3,y+6*S-6*S,{rot:-90,f:'saturate(.75)'});
    light(x,y-4*S,110*S/3,[210,60,40],.36,.12);
    // embers rising
    for(let i=0;i<4;i++){ const e=img(A('ember'),1,1,x+(i-1.5)*3*S,y-(8+i*7)*S,{lit:1,s:S,f:'drop-shadow(0 0 3px #ff6a30)',op:.9-i*.18}); e.style.width=e.style.height=(S+0)+'px';e.style.background='#ff7a3a'; e.removeAttribute('src');}
  }
  if(st==='setup'){
    img(A('tent-half'),34,25,tx,ty);
    img(K+'firewood-pile-01-png-x1.png',34,27,x-2*S,y+9*S,{s:Math.max(1,S-1)});
    img(A('bed-cold'),22,12,x-4*S,y+7*S,{op:0});
    person('A/town-g-side-0.png'.replace('x1.png','x1.png'),14,27,x+22*S,{flip:true});
    const h=img('A/carry-hammer.png',6,7,x+13*S,y-12*S,{lit:1}); h.style.transformOrigin='100% 100%'; h.style.transform='rotate(-35deg)';
    // ground lantern on a stump
    img(K+'rock-02-png-x1.png',16,12,x-48*S,y+9*S,{});
    img(K+'lantern-01-on-png-x1.png',11,19,x-48*S,y+6*S,{lit:1});
    light(x-48*S,y-6*S,150*S/3,[255,175,80],.4,.22);
  }
  if(st==='done'){
    img(A('packed'),34,30,tx,ty+2*S);
    img(A('bed-embers'),22,12,x+4*S,y+6*S,{op:.0});
    person('A/town-a-front-0.png',14,27,x+19*S,{});
    // comment notes tacked up
    const px=tx-17*S+29*S;
    if(p.notes) for(let i=0;i<p.notes;i++){ const n=img(A('note'),7,9,px+ (i?-4:4)*S, ty-14*S+i*9*S+2*S,{lit:1,rot:i?-8:6}); }
    light(px+4*S,ty-18*S,95*S/3,[170,230,140],.3,.12);
    if(p.ci) { img(A('flask-bad'),7,9,x+3*S,y+9*S,{lit:1}); }
  }
  if(st==='landed'){
    img(A('swept'),44,22,x,y+9*S,{op:.85});
    light(x,y,60*S/3,[150,170,200],.12,0);
  }
  if(st==='ghost'){
    img(A('ghost'),40,22,x,y+9*S,{op:.55});
    const pl=el('div','abs'); pl.style.cssText=`left:${x-S*3}px;top:${y-S*2}px;width:${S*6}px;height:${S*2}px;background:#f2c66d;box-shadow:0 0 8px rgba(242,198,109,.5)`;
    const pl2=el('div','abs'); pl2.style.cssText=`left:${x-S}px;top:${y-S*4}px;width:${S*2}px;height:${S*6}px;background:#f2c66d;box-shadow:0 0 8px rgba(242,198,109,.5)`;
    const gl=el('div','log'); gl.textContent='hand it another'; gl.style.cssText+=`left:${x-90}px;width:180px;text-align:center;top:${y+16*S}px;font-size:${MANY?14:17}px`;
    return;
  }
  // label
  const lab=el('div','lab'+(MANY?' s2':'')+(p.cls?' '+p.cls:''));
  lab.dataset.k=p.k;
  lab.style.left=(x-4*S-120)+'px'; lab.style.width='240px'; lab.style.top=(y+12*S)+'px';
  lab.innerHTML=`<div class="key">${p.k}</div><div class="ttl">${p.t}</div><div class="st ${p.tone||'g'}">${p.ph||''}</div>`;
  return lab;
}

// ---------- data ----------
const T8=[
 {k:'INV-71702',t:'Flaky e2e on statements download',state:'broken',x:215,y:742,cls:'sore',tone:'s',ph:'fell over twice on setup'},
 {k:'INV-72033',t:'Holdings CSV column order',state:'limit',x:160,y:540,cls:'',tone:'s',ph:'resting, back at 2:40pm'},
 {k:'INV-71990',t:'Dividend reinvest toggle',state:'stuck',tent:'ochre',x:335,y:305,tone:'e',ph:'going in circles · the lead is on it',circle:1,id:'stuck'},
 {k:'',t:'',state:'ghost',x:600,y:235},
 {k:'INV-71924',t:'Wash sale info under each loss',state:'work',x:862,y:235,tone:'g',ph:'writing the reason line · 22m',tent:'blue',v:0},
 {k:'INV-72011',t:'Q4 tax doc banner copy',state:'done',x:1118,y:268,cls:'moss',tone:'m',ph:'2 comments to answer',notes:2},
 {k:'INV-72040',t:'Gift lot holding period',state:'setup',x:1290,y:455,tone:'g',ph:'pitching camp · 14s'},
 {k:'INV-71650',t:'Rename Realized tab',state:'landed',x:1310,y:640,cls:'dim',tone:'g',ph:'landed an hour ago'},
 {k:'INV-71880',t:'Cost basis export drops split-day lots',state:'ask',tent:'rust',x:1085,y:775,cls:'hot',tone:'e',ph:'waiting on you',hot:1},
];
const T14=[
 {k:'INV-71702',t:'Flaky e2e on statements download',state:'broken',x:200,y:770,cls:'sore',tone:'s',ph:'fell over twice'},
 {k:'INV-72033',t:'Holdings CSV column order',state:'limit',x:140,y:560,tone:'s',ph:'back at 2:40pm'},
 {k:'INV-71990',t:'Dividend reinvest toggle',state:'stuck',tent:'ochre',x:225,y:335,tone:'e',ph:'going in circles',circle:1},
 {k:'INV-71611',t:'Tax lot page skeleton loader',state:'done',x:430,y:190,cls:'moss',tone:'s',ph:'CI failed',ci:1,notes:0},
 {k:'INV-71924',t:'Wash sale info under each loss',state:'work',x:705,y:170,tone:'g',ph:'step 4 of 6 · 22m',tent:'blue',v:0},
 {k:'INV-72011',t:'Q4 tax doc banner copy',state:'done',x:990,y:185,cls:'moss',tone:'m',ph:'2 comments to answer',notes:2},
 {k:'INV-72040',t:'Gift lot holding period',state:'setup',x:1225,y:275,tone:'g',ph:'pitching camp · 14s'},
 {k:'INV-71650',t:'Rename Realized tab',state:'landed',x:1335,y:480,cls:'dim',tone:'g',ph:'landed an hour ago'},
 {k:'INV-71880',t:'Cost basis export drops split-day lots',state:'ask',tent:'rust',x:1170,y:745,cls:'hot',tone:'e',ph:'waiting on you',hot:1},
 {k:'INV-71855',t:'Lot matching rounding',state:'work',tent:'sage',x:470,y:385,tone:'g',ph:'step 2 of 5 · 9m',hue:-20,v:1},
 {k:'INV-71977',t:'Export filename date format',state:'work',tent:'ochre',x:985,y:370,tone:'g',ph:'step 5 of 6 · 31m',hue:35,v:0},
 {k:'INV-72058',t:'Realized gain tooltip copy',state:'asklead',tent:'sage',x:420,y:600,tone:'g',ph:'asked the lead'},
 {k:'INV-71540',t:'Archive old CSV endpoint',state:'landed',x:1085,y:575,cls:'dim',tone:'g',ph:'landed 3h ago'},
 {k:'INV-72066',t:'Currency symbol in 1099 preview',state:'setup',x:745,y:325,tone:'g',ph:'pitching camp · 3s'},
];
const DATA = MANY?T14:T8;
const ctr = {x:740,y:MANY?470:468};

// ---------- build ----------
ground(DATA.filter(p=>p.state!=='ghost').map(p=>({x:p.x,y:p.y,hot:p.hot,circle:p.circle})),ctr);
scenery();
// central council fire
(function(){
  const x=ctr.x,y=ctr.y+ (MANY?10:14);
  const sc=MANY?2:3;
  // log seats
  img(K+'wood-log-01-h-png-x1.png'.replace('sprites/',''),43,10,x-44*sc,y+16*sc,{s:sc});
  img(K+'wood-log-01-h-png-x1.png'.replace('sprites/',''),43,10,x+46*sc,y+16*sc,{s:sc});
  img(K+'campfire-01-lit-png-x1.png',46,32,x,y+7*sc,{s:sc});
  img(K+'campfire-cauldron-01-lit-png-x1.png',62,50,x,y+3*sc,{s:sc,op:.0});
  for(let i=0;i<3;i++){ const f=img('A/flame-'+i+'.png',10,12,x+(i-1)*8*sc,y-2*sc-(i==1?3*sc:0),{lit:1,s:sc*(i==1?1.7:.8)}); flames.push(f);} 
  light(x,y-10*sc,420*sc/3*(MANY?1.05:1),[255,160,70],.82,.15);
  smoke(x+4*sc,y-20*sc);
})();
// camps
const labs={};
DATA.forEach(p=>{const l=camp(p); if(l) labs[p.k]=l});
// pawn: the lead, and its trail
(function(){
  const target = DATA.find(p=>p.id==='stuck') || DATA.find(p=>p.state==='asklead');
  if(!target) return;
  const x0=ctr.x,y0=ctr.y; let t = MODE==='point'?0.92:0.5; if(MANY) t=0.55;
  const x=x0+(target.x-x0)*t, y=y0+(target.y+S*6-y0)*t;
  // seat and scroll at the fire
  const sx=ctr.x-44*S+ (MANY?4:0), sy=ctr.y+ (MANY?10:14)+8*S;
  img('A/scroll.png',12,7,sx,sy-1*S,{s:S,lit:1});
  const dir = target.x<x0 ? true:false;
  if(MODE==='point'){
    // standing before the camp, facing it, a little apart
    const px=target.x-50*S, py=target.y+5*S;
    img('A/side-0.png',14,27,px,py,{flip:false});
    img(K+'lantern-02-on-png-x1.png',9,17,px-7*S,py-10*S,{lit:1,f:'grayscale(.5) brightness(1.4)'});
    light(px,py-14*S,140*S/3,[220,230,255],.4,.2);
  } else {
    img('A/walk-side-2.png',14,27,x,y,{flip:dir,z:5});
    img(K+'lantern-02-on-png-x1.png',9,17,x+(dir?-7:7)*S,y-8*S,{lit:1,f:'grayscale(.5) brightness(1.4)'});
    light(x,y-14*S,140*S/3,[220,230,255],.42,.2);
  }
  // footprints trail
  const n=14; for(let i=1;i<=n;i++){ const tt=i/(n+1)*(MODE==='point'?.9:.5); const fx=x0+(target.x-x0)*tt, fy=y0+(target.y-8-y0)*tt+ (i%2?5:-3); const d=el('div','abs'); d.style.cssText=`left:${fx}px;top:${fy}px;width:${S*2}px;height:${S}px;background:rgba(210,225,255,.32);box-shadow:0 0 4px rgba(190,210,255,.35)`; }
})();

// ember-lit trails to the ones that need him
DATA.filter(p=>p.state==='ask'||p.state==='broken').forEach(p=>{
  const x0=ctr.x,y0=ctr.y+30,x1=p.x,y1=p.y-6; const n=Math.floor(Math.hypot(x1-x0,y1-y0)/(S*7));
  const col=p.state==='ask'?'rgba(255,154,74,.55)':'rgba(240,138,114,.4)';
  for(let i=2;i<n-1;i++){const t=i/n; const d=el('div','abs'); d.style.cssText=`left:${Math.round(x0+(x1-x0)*t)}px;top:${Math.round(y0+(y1-y0)*t+Math.sin(t*9)*5)}px;width:${S}px;height:${S}px;background:${col};box-shadow:0 0 6px ${col}`;}
});

// ---------- the lead's words, written at the fire ----------
if(!MANY){
  const v=el('div','voice'); v.style.cssText='left:455px;top:572px;width:480px';
  v.innerHTML=`<div class="big">Two need you.</div>
  <p><span class="e">71880</span> wants to know which price split-day lots take; the ticket doesn't say. <span class="s">71702</span> has fallen over twice on the same setup error, and I've stopped retrying it.</p>
  <p class="old">Everything else is moving. I told 71990 to stop rerunning its test and read the failure.</p>`;
  const a=el('div','ask'); a.style.cssText='left:455px;top:786px;width:500px';
  a.innerHTML=`<div class="q"><em>71880 ASKS</em>Should lots bought on a split day use the pre-split or the post-split price?</div><div class="opts"><span class="o">the pre-split price</span><span class="o">the post-split price</span></div>`;
  const lg=el('div','log'); lg.textContent='what I have done'; lg.style.cssText+=';left:'+(ctr.x-44*S-40)+'px;top:'+(ctr.y+14+8*S+22)+'px;font-size:14px;opacity:.9';
} else {
  const v=el('div','voice'); v.style.cssText='left:560px;top:560px;width:360px';
  v.innerHTML=`<div class="big" style="font-size:27px">Three need you.</div>
  <p style="font-size:16px;line-height:1.42"><span class="e">71880</span> wants to know which price split-day lots take. <span class="s">71702</span> has fallen over twice on the same setup error. <span class="s">71611</span> failed CI and I can't read why.</p>
  <p style="font-size:16px;line-height:1.42" class="old">Everything else is moving. 72058 asked me about a tooltip; I answered.</p>`;
  const a=el('div','ask'); a.style.cssText='left:560px;top:792px;width:380px';
  a.innerHTML=`<div class="q" style="font-size:18px"><em>71880 ASKS</em>Pre-split or post-split price for split-day lots?</div><div class="opts" style="margin-top:6px"><span class="o" style="font-size:17px">pre-split</span><span class="o" style="font-size:17px">post-split</span></div>`;
  const lg=el('div','log'); lg.textContent='what I have done'; lg.style.cssText+=';left:'+(ctr.x-44*2-40)+'px;top:'+(ctr.y+10+8*2+14)+'px;font-size:13px';
}

// ---------- header, write line ----------
const hd=el('div','head',document.body);
hd.innerHTML=`<div class="a">INVEST-WEB<i>/</i><b>Sprint 42 lead</b></div><div class="m">Sonnet 5.5 · low · started 1h 12m ago · ${MANY?14:8} tickets</div>`;
el('div','wl',document.body); const wt=el('div','wl-t',document.body); wt.textContent='to the lead'; el('div','caret',document.body);
const rk=el('img','rack',document.body); rk.src='A/rack2.png';

// ---------- point: the camp told in the ground ----------
if(MODE==='point'){
  const t=DATA.find(p=>p.id==='stuck'); const x=t.x+140, y=t.y-150;
  Object.keys(labs).forEach(k=>{ if(k!=='INV-71990') labs[k].style.opacity=.3; }); txt.querySelectorAll('.log').forEach(e=>{ if(e.textContent==='hand it another') e.style.opacity=0; }); txt.querySelectorAll('.voice,.ask').forEach(e=>e.style.opacity=.4);
  const r=el('div','reveal'); r.style.cssText=`left:${x}px;top:${y}px;width:250px`;
  r.innerHTML=`<div class="t">WORKING · 41M</div><div class="h" style="margin-top:4px">running the same failing test again</div>
   <div id="flasks" style="height:34px;margin-top:6px;position:relative"></div>
   <div class="l" style="margin-top:6px;opacity:.7">six times now</div>
   <div class="t" style="margin-top:16px;color:rgba(246,236,219,.5)">STEP 3 OF 5</div><div class="l">wiring the toggle into the form</div>
   <div id="pebs" style="height:20px;margin-top:6px;position:relative"></div>
   <div class="l" style="margin-top:14px"><span style="color:#cfd8ff">I told it, 3m ago:</span> read the failure, stop rerunning it. <span style="opacity:.6">Still watching.</span></div>`;
  setTimeout(()=>{},0);
  const fl=r.querySelector('#flasks'); for(let i=0;i<6;i++){const f=document.createElement('img');f.src='A/flask-bad.png';f.className='px';f.style.cssText=`position:absolute;left:${i*30}px;top:${i%2?4:0}px;width:${7*3}px;height:${9*3}px;image-rendering:pixelated`;fl.appendChild(f)}
  const pb=r.querySelector('#pebs'); ['done','done','now','todo','todo'].forEach((s,i)=>{const f=document.createElement('img');f.src='A/peb-'+s+'.png';f.className='px';f.style.cssText=`position:absolute;left:${i*36}px;top:0;width:${7*4}px;height:${5*4}px;image-rendering:pixelated`;pb.appendChild(f)});
  light(t.x,t.y-10*S,250,[255,170,80],.5,.1);
}

// ---------- night ----------
const nc=document.getElementById('night'); const DPR=2; nc.width=W*DPR; nc.height=H*DPR; nc.style.width=W+'px'; nc.style.height=H+'px';
const ctx=nc.getContext('2d'); ctx.scale(DPR,DPR);
function paint(tm){
  ctx.globalCompositeOperation='source-over'; ctx.clearRect(0,0,W,H);
  ctx.fillStyle= MODE==='point'?'rgba(5,9,20,.74)':'rgba(6,11,22,.68)'; ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation='destination-out';
  lights.forEach(l=>{ const f=1+l.fl*Math.sin(tm*.004+l.ph)*.5; const r=l.r*f; const g=ctx.createRadialGradient(l.x,l.y,0,l.x,l.y,r);
    g.addColorStop(0,'rgba(0,0,0,'+Math.min(1,l.a*1.35)+')'); g.addColorStop(.45,'rgba(0,0,0,'+(l.a*.62)+')'); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(l.x,l.y,r,0,7); ctx.fill(); });
  ctx.globalCompositeOperation='lighter';
  lights.forEach(l=>{ const f=1+l.fl*Math.sin(tm*.004+l.ph)*.5; const r=l.r*f*.85; const g=ctx.createRadialGradient(l.x,l.y,0,l.x,l.y,r);
    g.addColorStop(0,`rgba(${l.c[0]},${l.c[1]},${l.c[2]},${l.a*.26})`); g.addColorStop(1,`rgba(${l.c[0]},${l.c[1]},${l.c[2]},0)`); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(l.x,l.y,r,0,7); ctx.fill(); });
}
paint(0);
setInterval(()=>{ flames.forEach(f=>{f.src='A/flame-'+Math.floor(Math.random()*4)+'.png'}); paint(performance.now()); },140);
let ph=0; setInterval(()=>{ph^=1; bobbers.forEach(b=>{b.style.transform=ph?'translateY(-'+S+'px)':''})},700);
document.fonts.ready.then(()=>setTimeout(()=>{document.body.dataset.ready=1},900));
})();
