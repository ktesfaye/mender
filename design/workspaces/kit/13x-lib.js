const Q=new URLSearchParams(location.search), S=Q.get('s')||'', pt=S==='point', open=S==='open';
const BG=Q.get('bg')==='yard'?'13-bg.png':'13-bgb.png';
document.body.style.background=`#000 url(${BG}) 0 0/1480px 1020px no-repeat`;
const R=document.getElementById('r'), P='13-parts/';
function im(src,x,y,w,h,st=''){const e=document.createElement('img');e.src=(src.includes('sprites/')||src.startsWith('props'))?(src.startsWith('sprites/')?src:P+src):P+src;e.style.cssText=`left:${x}px;top:${y}px;width:${w*2}px;height:${h*2}px;${st}`;R.appendChild(e);return e}
function div(cls,x,y,st,html=''){const e=document.createElement('div');e.className=cls;e.style.cssText=`left:${x}px;top:${y}px;${st}`;e.innerHTML=html;R.appendChild(e);return e}
const dim=b=>`filter:brightness(${b}) saturate(.9)`;
const ST={work:{f:'hue-rotate(-8deg) saturate(1.15)',g:'255,160,60'},ask:{f:'hue-rotate(-22deg) saturate(1.7) brightness(1.05)',g:'255,120,40'},done:{f:'hue-rotate(62deg) saturate(1.2)',g:'120,220,110'},broke:{f:'hue-rotate(-48deg) saturate(1.9) brightness(.95)',g:'230,50,40'}};
const LAMP='props-tx-village-props-lantern-02-on-png-x1.png', LAMP1='props-tx-village-props-lantern-01-on-png-x1.png';
function hr(){div('a',40,142,'width:1400px;height:1px;background:rgba(255,238,210,.11)')}
// a small lantern hung from an iron hook and a short chain; cx = hook x, y = underside of what it hangs from
function hang(cx,y,kind,chain=10){
  div('a',cx-4,y-2,'width:8px;height:3px;background:#2e2016');
  for(let i=0;i<chain;i+=4){div('a',cx-1,y+1+i,'width:2px;height:3px;background:'+(i%8?'#6f5a44':'#2e2016'))}
  const ly=y+chain;
  im(LAMP,cx-9,ly,9,17,`filter:${ST[kind].f}`);
  div('glow breathe',cx-30,ly-10,`width:60px;height:60px;background:radial-gradient(circle,rgba(${ST[kind].g},.32),rgba(${ST[kind].g},0) 66%)`);
  return ly+34;
}
// a plank of painted wood; side R points right, L points left. words only when asked
function plank(side,x,y,W,txt,key,br,words,o={}){
  const e=im(`arm${side}-${W}.png`,x,y,W,12,`filter:brightness(${br}) saturate(.9)`);
  const lo=side==='R'?x+16:x+16, hi=side==='R'?x+2*W-14:x+2*W-(o.stem||0)-12;
  const d=div('ink',lo,y,`width:${hi-lo}px;overflow:hidden;filter:brightness(${br});text-align:${o.align||'left'};${words?'':'opacity:0'}`,(key?`<i>${key}</i>`:'')+txt);
  return {x,y,W,e,d};
}
function stem(x,y,hArt,br){return im('stem.png',x-6,y,6,hArt,dim(br))}
function cap(x,y,wArt,name,br){
  im('cap.png',x,y,70,16,dim(br));
  div('burn',x+16,y+4,'',name);
}
function crowOn(x,y){im('crow-hop-0-x1.png',x,y,8,7,'filter:brightness(1.1)')}
function notice(x,y,br=.62){
  const NW=48,NH=24;
  im('slip.png',x+NW*2-34,y-8,9,7,'filter:brightness(.7)');im('slip.png',x+NW*2-26,y-10,9,7,'filter:brightness(.7)');im('slip.png',x+NW*2-18,y-7,9,7,'filter:brightness(.7)');
  im('notice48.png',x,y,NW,NH,`filter:brightness(${br}) sepia(.25) saturate(1.2)`);
  const tx='filter:brightness(.7);';
  div('ink',x+10,y+4,'font:700 12px/14px MenderHand;color:#33200f;'+tx,'INV-71924');
  div('ink',x+10,y+19,'font:400 11.5px/14px MenderHand;color:#33200f;'+tx,'Wash sale info');
  div('ink',x+10,y+32,'font:400 10px/12px MenderHand;color:#6a4c26;'+tx,'in progress');
  div('a',x,y,`width:${NW*2}px;height:${NH*2}px;background:radial-gradient(ellipse at 20% 0%,rgba(0,0,0,0) 20%,rgba(6,3,0,.5) 100%);box-shadow:inset 0 0 8px 3px rgba(6,3,0,.7)`);
  im('nail.png',x+NW*2-14,y+4,3,3);
  im('seal-empty.png',x+22,y+NH*2-4,9,9,'filter:brightness(1.2)');im('seal-empty.png',x+52,y+NH*2-4,9,9,'filter:brightness(1.2)');
  return {w:NW*2,h:NH*2+10};
}
function glowAt(x,y,r,a){div('glow',x-r,y-r,`width:${2*r}px;height:${2*r}px;background:radial-gradient(circle,rgba(255,168,70,${a}),rgba(255,140,50,${a*.3}) 45%,rgba(255,120,40,0) 70%)`)}
function sheets(sx=500,sy=170){
  const sheet=(x,w)=>{im('sheet.png',x,sy,220,330,'filter:drop-shadow(0 10px 16px rgba(0,0,0,.4))');
    [[x+14,sy+14],[x+w-24,sy+14],[x+14,sy+640],[x+w-24,sy+640]].forEach(p=>im('nail.png',p[0],p[1],3,3));};
  sheet(sx,440); sheet(sx+470,440);
  const A=sx+44,B=sx+470+44,y=sy;
  div('paper',A,y+44,'font:600 11px "Josefin Sans";letter-spacing:.3em;color:#5a3d1c','INV-71924');
  div('paper',A,y+66,'font:400 14px MenderHand;color:#7a5a2e','story · high · in progress');
  div('paper',A,y+96,'font:700 25px/30px MenderHand;width:350px;color:#2d1a0a','FE: G/L wash sale info, explaining why a loss was disallowed');
  div('a',A,y+192,'width:340px;height:0;border-top:2px dotted rgba(70,44,20,.4)');
  div('paper',A,y+210,'font:400 16.5px/24px MenderHand;width:340px;color:#3a2410','When a loss is disallowed because of a wash sale, the page should say so, and name the lot that triggered it, right under the loss.');
  div('paper',A,y+330,'font:400 10px "Courier Prime";color:#6a4c26;letter-spacing:.04em','inv-71924-wash-sale-info');
  div('paper',A,y+372,'font:400 15px/22px MenderHand;width:340px;color:#3a2410','two are working in here:<br>Reason line under each loss, twelve minutes in<br>Lot link API, which wants you');
  div('paper',A,y+592,'font:400 15px MenderHand;color:#a4701a','open in jira');
  div('paper',B,y+44,'font:600 11px "Josefin Sans";letter-spacing:.3em;color:#5a3d1c','MERGE REQUEST !482');
  div('paper',B,y+66,'font:700 21px/26px MenderHand;width:350px;color:#2d1a0a','FE: wash sale info on the G/L page');
  div('paper',B,y+112,'font:600 9.5px "Josefin Sans";letter-spacing:.3em;color:#7a5a2e','THE CHECKS');
  div('paper',B,y+130,'font:700 17px MenderHand;color:#a3321f','they failed');
  div('paper',B,y+154,'font:400 15px/21px MenderHand;width:350px;color:#3a2410','the job called lint stopped it: two errors in LossRow.tsx, four minutes ago');
  div('paper',B,y+222,'font:600 9.5px "Josefin Sans";letter-spacing:.3em;color:#7a5a2e','WHO HAS SAID YES');
  im('seal-empty.png',B,y+242,9,9,'filter:brightness(1.9)');im('seal-empty.png',B+28,y+242,9,9,'filter:brightness(1.9)');
  div('paper',B+62,y+244,'font:400 15px MenderHand;color:#3a2410','nobody yet, it needs two');
  div('paper',B,y+290,'font:600 9.5px "Josefin Sans";letter-spacing:.3em;color:#7a5a2e','THREE TO ANSWER');
  [['maya','should the page say disallowed, or deferred?'],['tom','the lot link needs the API first'],['sam','who writes the words in the tooltip?']].forEach((t,i)=>{
    const yy=y+314+i*74; im('slip.png',B,yy+2,9,7);
    div('paper',B+30,yy,'font:600 10px "Josefin Sans";letter-spacing:.2em;color:#6a4c26',t[0].toUpperCase());
    div('paper',B+30,yy+18,'font:400 15px/21px MenderHand;width:320px;color:#3a2410',t[1]);
  });
  div('paper',B,y+592,'font:400 15px MenderHand;color:#a4701a','open in gitlab');
}
const WS=[ // the other workspaces, in road order
 {k:'71880',t:'Cost basis, split day',st:'ask'},
 {k:'72011',t:'Q4 tax banner',st:'done'},
 {k:'71990',t:'Dividend reinvest',st:null},
 {k:'71702',t:'Flaky e2e',st:'broke'},
 {k:'',t:'chart spike',st:null},
 {k:'72040',t:'gift lots',st:'cut'}];
