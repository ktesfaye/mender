import re
s=open('10-bar.html').read()
def R(a,b,n=0):
    global s
    assert a in s, a[:50]
    s=s.replace(a,b)
s=s.replace('10-bar-scene.png','10b-bar-scene.png').replace('url(10-bar-bg.png)','url(10b-bar-bg.png)')
R(".bar { left: 40px; top: 92px; width: 1400px;",".bar { left: 40px; top: 92px; width: 1256px;")
R(".seg { position: relative; height: 40px; border-radius: 20px; display: flex; align-items: center; gap: 8px; padding: 0 12px 0 10px;",".seg { position: relative; height: 42px; border-radius: 21px; display: flex; align-items: center; gap: 6px; padding: 0 8px 0 8px;")
R(".lens { position: relative !important; height: 40px; border-radius: 20px;",".lens { position: relative !important; height: 42px; border-radius: 21px;")
R("padding: 0 16px 0 14px; z-index: 2; box-shadow: 0 6px","padding: 0 14px 0 12px; z-index: 2; box-shadow: 0 6px")
R("font: 700 10.5px 'Courier Prime', monospace; color: rgba(246,236,219,.4); white-space: nowrap; line-height: 12px; letter-spacing: .01em","font: 700 11px 'Courier Prime', monospace; color: rgba(246,236,219,.42); white-space: nowrap; line-height: 12px; width: 100%")
R(".t { font: 650 12.5px 'Figtree'",".t { font: 650 13.5px 'Figtree'")
R(".sg { display: flex; gap: 8px;",".sg { display: flex; gap: 6px;")
R(".sg span { display: inline-flex; gap: 4px;",".sg span { display: inline-flex; gap: 3px;")
R(".k { display: flex;",".k { display: flex; justify-content: space-between;")
R(".cutn { font: 650 10.5px 'Figtree'; color: rgba(246,236,219,.62) }",".cutn { font: 650 10.5px 'Figtree'; color: rgba(246,236,219,.7); margin-left: 6px }\n.mrow { display: flex; align-items: center; margin-top: 3px; height: 7px }")
R(".meter i { width: 4px; height: 7px;",".meter i { width: 5px; height: 6px;")
R("t: 'Q4 banner copy'","t: 'Q4 banner'"); R("t: 'Flaky statements'","t: 'Flaky e2e'"); R("t: 'Gift lot holding'","t: 'Gift lots'")
R("sg: [['chat', 'n', '1']], w: 178","sg: [['chat', 'n', '1']], w: 154")
R("sg: [['person', 'n', '1/2']], w: 184","sg: [['person', 'n', '1/2']], w: 144")
for w in ("128","136","108","152"): R("w: %s }"%w,"w: 118 }")
R('width:88px','width:84px'); R('width:350px','width:340px')
R("""<div class="t"><span class="lk">${s.key}</span>${s.t}</div></div>""","""<div class="t">${s.t}</div><div class="q"><span class="lk">${s.key}</span>In Progress</div></div>""")
R("""bar().replace('Wash sale info</div></div>', 'Wash sale info</div><div class="q" style="color:#ff7a3a">In Progress · wants you, 4m</div></div>')""","bar()")
R(".lens .lk { font: 700 10.5px 'Courier Prime', monospace; color: rgba(246,236,219,.55); margin-right: 9px; letter-spacing: .01em }",".lens .lk { font: 700 11px 'Courier Prime', monospace; color: rgba(246,236,219,.55); margin-right: 8px }")
R(".lens .q { font: 500 11.5px 'Figtree'; line-height: 13px; margin-top: 1px; white-space: nowrap }",".lens .q { font: 500 12px 'Figtree'; line-height: 13px; margin-top: 1px; white-space: nowrap; color: rgba(246,236,219,.62) }")
# segment markup
i=s.index("    const meter ="); j=s.index("  });\n  h += `<span class=\"add\">")
new = """    const meter = '<div class="mrow"><span class="meter"><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i></i></span><span class="cutn">' + s.cut + 's</span></div>';
    const keyL = s.hand ? `<span>${ic('pen', 'rgba(246,236,219,.42)', 9)} by hand</span>` : `<span>${s.key}</span>`;
    const keyrow = keyL + (sg ? `<span class="sg">${sg}</span>` : '');
    h += `<div class="seg${S === 'hover' && s.id === 'b' ? ' hov' : ''}" id="seg-${s.id}" style="width:${s.w}px">${s.cut ? '<span class="lz"><img src="lanternoff.png" style="opacity:.6"></span>' : lz(s.post)}<div class="tx"><div class="k">${keyrow}</div><div class="t">${s.t}</div>${s.cut ? meter : ''}</div></div>`;
"""
s=s[:i]+new+s[j:]
R("left:474px;top:152px","left:466px;top:152px")
# head meta
R("""<div class="meta"><span class="tt">FE: G/L wash sale info, explaining why a loss was disallowed</span><span class="d">·</span>inv-71924-wash-sale-info<span class="d">·</span>4 ahead<span class="d">·</span>2 uncommitted</div>""","""<div class="meta">Claude Code<span class="d">·</span>12m<span class="d">·</span>4 turns</div>""")
# AUTO / Opus lines: as today, from the yard (right-aligned under the rack)
R("""h += `<div class="hrule"></div>`;""","""h += `<div class="hrule"></div>`;
h += `<div class="abs" style="right:40px;top:96px;text-align:right"><div style="font:400 11px 'Josefin Sans';letter-spacing:.26em;color:#e6b866;text-transform:uppercase">auto</div><div class="cr" style="margin-top:7px;font-size:12px;color:rgba(246,236,219,.5)">Opus 5.5 · medium</div></div>`;""")
open('10b-bar.html','w').write(s)
