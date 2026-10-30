K='/Users/kirubel/Documents/dev/mender/design/workspaces/kit/'
CSS='''
@font-face{font-family:'Josefin Sans';src:url(fonts/josefin-sans-400-normal.woff2)}
@font-face{font-family:'Courier Prime';src:url(fonts/courier-prime-400-normal.woff2)}
@font-face{font-family:'Courier Prime';font-weight:700;src:url(fonts/courier-prime-700-normal.woff2)}
@font-face{font-family:'MenderHand';src:url(fonts/pretty-neat-400-normal.woff2)}
@font-face{font-family:'Silkscreen';src:url(fonts/silkscreen-400-normal.woff2)}
html,body{margin:0;width:1480px;height:1020px;overflow:hidden;background:#000}
body{background:url(14-harbour-bg.png) 0 0/1480px 1020px no-repeat;position:relative}
.a{position:absolute}
.glow{position:absolute;width:92px;height:92px;margin:-46px 0 0 -46px;border-radius:50%;mix-blend-mode:screen;pointer-events:none;animation:br 4.6s ease-in-out infinite}
@keyframes br{50%{opacity:.62;transform:scale(.9)}}
.spill{position:absolute;height:26px;width:120px;margin-left:-60px;border-radius:50%;mix-blend-mode:screen;pointer-events:none}
.pen{position:absolute;height:32px;width:98px;opacity:0;transition:opacity .3s;z-index:6}
.pen i{position:absolute;inset:0;background:#1b2b40;opacity:.97;clip-path:polygon(0 0,100% 0,88% 50%,100% 100%,0 100%)}
.pen i::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--c,#8a7c63)}
.pen b{position:absolute;left:8px;right:16px;top:0;bottom:0;display:flex;align-items:center;font:400 11px/11px 'MenderHand';color:#efe3cc;font-weight:400;letter-spacing:.01em}
.pen.on{opacity:1}
.rest .pole,.open .pole{display:none}
.pole{position:absolute;width:2px;background:#2a1a0e;z-index:5}
.key{position:absolute;font:400 7px 'Silkscreen';color:#d8c9a6;opacity:.62;letter-spacing:.02em;white-space:nowrap;z-index:4}
.stern{position:absolute;font:400 11px 'MenderHand';color:#e9dcc0;opacity:.82;white-space:nowrap;z-index:4;letter-spacing:.01em}
.carve{position:absolute;font:400 10.5px 'Courier Prime';color:#cdb98a;opacity:.4;letter-spacing:.05em;white-space:nowrap;text-shadow:0 -1px 0 rgba(0,0,0,.6);z-index:4}
.proj{position:absolute;font:400 11px 'Josefin Sans';letter-spacing:.34em;text-transform:uppercase;color:#f2c66d;opacity:.8;text-shadow:0 -1px 0 rgba(0,0,0,.65);z-index:4;white-space:nowrap}
.sl{position:absolute;right:30px;text-align:right;white-space:nowrap;z-index:4}
.sl.m{font:400 11px 'Josefin Sans';letter-spacing:.26em;color:#b89d6a}
.sl.c{font:400 11.5px 'Courier Prime';letter-spacing:.05em;color:#b89d6a}
.cut{position:absolute;font:400 8px 'Silkscreen';color:#ff9a4a;white-space:nowrap;z-index:4}
.note{position:absolute;left:228px;top:8px;width:196px;height:60px;background:#fdf1c6;z-index:6;padding:8px 12px 0;box-shadow:0 3px 10px rgba(0,0,0,.45);box-sizing:border-box}
.note .nl{font:9px 'Courier Prime';letter-spacing:.12em;text-transform:uppercase;color:#d67a22}
.note .nt{margin-top:2px;font:14.5px/1.12 'MenderHand';color:#2c2216}
.note .pin{position:absolute;left:-7px;top:6px;width:10px;height:6px;background:#8a5a2b;box-shadow:0 0 0 1px #482510}
.scroll{position:absolute;left:236px;top:156px;width:470px;z-index:20;display:none}
.open .scroll{display:block}
.sheet{background:#fdf1c6;padding:26px 34px 28px;box-shadow:0 10px 36px rgba(0,0,0,.55);position:relative}
.rod{height:12px;background:linear-gradient(#b07a3e,#7a4e26 60%,#482510);box-shadow:0 0 0 2px #482510;margin:0 -10px}
.rod.t{margin-bottom:-2px;position:relative;z-index:2}
.rod.b{margin-top:-2px;position:relative}
.sheet .lb{font:10px 'Courier Prime';letter-spacing:.14em;text-transform:uppercase;color:#d67a22}
.sheet h1{font:400 26px/1.1 'MenderHand';color:#2c2216;margin:6px 0 0;font-weight:400}
.sheet p{font:400 16px/1.3 'MenderHand';color:#4a3d2a;margin:9px 0 0}
.sheet .go{color:#a8700e;font:400 17px 'MenderHand';margin-top:8px;display:block}
.sheet hr{border:0;border-top:1px dashed rgba(60,40,20,.35);margin:16px 0 12px}
.sheet .f{display:flex;gap:12px;align-items:flex-start;margin-top:9px}
.sheet .f i{flex:none;width:26px;height:26px;display:grid;place-items:center}
.sheet .f b{font:400 17px/1.15 'MenderHand';color:#2c2216;display:block;font-weight:400}
.sheet .f span{font:11px/1.35 'Courier Prime';color:#6e5f46;display:block;margin-top:2px}
.sheet .f.r b{color:#b0402c}
.crew{display:inline-block;vertical-align:-2px}
.open .pen.keep{opacity:0}
'''
def build(name,cls):
    pens=[ # id, mast css x (cloth left), y, text, colour, rest?
     ('home',48,6,'home · invest-web','#9bd28a',False),
     ('71880',463,6,'Export drops split-day lots','#ff7a4a',True),
     ('72011',563,6,'Tax doc banner copy','#9bd28a',False),
     ('71990',663,6,'Dividend toggle','#f0a65a',False),
     ('71702',763,6,'Flaky e2e','#f08a72',True),
     ('spike',862,44,'chart spike','#8a7c63',False),
     ('cut',962,40,'Gift lot holding period','#ff9a4a',False),
    ]
    h=[f'<!doctype html><html class="{cls}"><head><meta charset="utf-8"><style>{CSS}</style></head><body>']
    # glows
    for (x,y,c) in [(286,70,'#ff7a4a'),(502,74,'#ff7a4a'),(602,74,'#9bd28a'),(702,74,'#f0a65a'),(802,74,'#f08a72')]:
        h.append(f'<div class="glow" style="left:{x}px;top:{y}px;background:radial-gradient(closest-side,{c}aa,{c}33 55%,transparent)"></div>')
        h.append(f'<div class="spill" style="left:{x}px;top:{y+34}px;background:radial-gradient(closest-side,{c}44,transparent)"></div>')
    # poles for rowboat, slip, home
    h.append('<div class="pole" style="left:858px;top:56px;height:34px"></div><div class="pole" style="left:960px;top:52px;height:36px"></div><div class="pole" style="left:46px;top:8px;height:26px"></div>')
    for id,x,y,t,c,rest in pens:
        on=rest or cls in('point',)
        h.append(f'<div class="pen{" on" if on else ""}" style="left:{x}px;top:{y}px;--c:{c}"><i></i><b>{t}</b></div>')
    # keys on bows
    for k,x in [('71880',428),('72011',528),('71990',628),('71702',728)]:
        h.append(f'<div class="key" style="left:{x+14}px;top:{91}px">INV-{k}</div>')
    h.append('<div class="stern" style="left:170px;top:87px">Reason line under each loss</div>')
    h.append('<div class="cut" style="left:936px;top:34px;display:none"></div>')
    h.append('<div class="cut" style="left:934px;top:50px">INV-72040 · 9s</div>')
    h.append('<div class="carve" style="left:162px;top:111px">inv-71924-wash-sale-info · 3 ahead · 2 uncommitted</div>')
    h.append('<div class="proj" style="left:1004px;top:111px;width:118px;text-align:right">invest-web</div>')
    # slate + tide
    h.append('<div class="sl m" style="top:72px;right:84px">AUTO</div>')
    h.append('<div class="sl c" style="top:92px;right:84px">Claude Code · Opus 5.5 · medium</div>')
    h.append('<div class="sl c" style="top:110px;right:84px">context 35% used</div>')
    # tide mark on the gauge (native 714 -> css 1428; y 88..132)
    h.append('<div class="a" style="left:1412px;top:116px;width:34px;height:2px;background:#ff9a4a;opacity:.85"></div>')
    h.append('<div class="a" style="left:1408px;top:117px;width:44px;height:14px;background:linear-gradient(rgba(70,110,150,.28),transparent)"></div>')
    # manifest
    h.append('<div class="note"><div class="pin"></div><div class="nl">INV-71924 · in progress</div><div class="nt">Explain why a wash-sale loss was disallowed</div></div>')
    if cls=='point':
        h.append('<div class="carve" style="left:428px;top:131px;opacity:.7;color:#ff9a4a">asking · lot link api · 4m</div>')
    if cls=='open':
        h.append('<div class="a" style="left:300px;top:66px;width:2px;height:92px;background:#8a6a3a;z-index:5"></div><div class="a" style="left:640px;top:66px;width:2px;height:92px;background:#8a6a3a;z-index:5;display:none"></div>')
        h.append('''<div class="scroll"><div class="rod t"></div><div class="sheet">
<div class="lb">INV-71924 · story · high · in progress</div>
<h1>FE: G/L wash sale info, explaining why a loss was disallowed</h1>
<p>Under each loss on the gains and losses page, say why it was disallowed: the wash-sale window it fell in, the lot that replaced it and how much is carried into that lot.</p>
<span class="go">open the ticket</span>
<hr>
<div class="lb">merge request !482 · not ready to sail</div>
<div class="f r"><i data-px="spark" data-c="#b0402c" data-s="22"></i><div><b>ci failed</b><span>the lint job stopped it · the sail is torn</span></div></div>
<div class="f"><i><svg viewBox="0 0 16 10" width="32" height="20" shape-rendering="crispEdges"><g fill="#482510"><rect x="1" y="2" width="4" height="8"/><rect x="9" y="2" width="4" height="8"/></g><g fill="none" stroke="#8a7c63" stroke-dasharray="1 1"><rect x="1.5" y="2.5" width="3" height="7"/><rect x="9.5" y="2.5" width="3" height="7"/></g></svg></i><div><b>needs 2 approvals</b><span>nobody has signed on yet · two places aboard are empty</span></div></div>
<div class="f"><i data-px="page" data-c="#6e5f46" data-s="20"></i><div><b>3 comments to answer</b><span>three gulls on the mast · the first is on the reason line</span></div></div>
<span class="go" style="margin-top:14px">open in gitlab</span>
</div><div class="rod b"></div></div>''')
    h.append('<script>window.PX_EXTRA={};</script><script src="px.js"></script><script>document.fonts.ready.then(()=>setTimeout(()=>document.body.dataset.ready=1,200))</script></body></html>')
    open(K+name+'.html','w').write(''.join(h))
build('14-harbour','rest'); build('14-harbour-point','point'); build('14-harbour-open','open')
