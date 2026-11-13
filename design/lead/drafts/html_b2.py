import json, sys, html
OUT = '/Users/kirubel/Documents/dev/mender/design/workspaces/kit/'

CSS = """
@font-face { font-family: 'Fraunces'; src: url(fonts/fraunces.ttf); font-weight: 100 900; }
@font-face { font-family: 'Fraunces'; src: url(fonts/fraunces-variable-italic.woff2); font-weight: 100 900; font-style: italic; }
@font-face { font-family: 'Figtree'; src: url(fonts/figtree.ttf); font-weight: 300 900; }
@font-face { font-family: 'Silkscreen'; src: url(fonts/silkscreen-400-normal.woff2); }
@font-face { font-family: 'Hand'; src: url(fonts/pretty-neat-400-normal.woff2); }
@font-face { font-family: 'Josefin'; src: url(fonts/josefin-sans-400-normal.woff2); }
@font-face { font-family: 'Courier'; src: url(fonts/courier-prime-400-normal.woff2); }
@font-face { font-family: 'Courier'; src: url(fonts/courier-prime-700-normal.woff2); font-weight: 700; }
:root { --ink:#f6ecdb; --ink2:rgba(246,236,219,.66); --ink3:rgba(246,236,219,.42); --gold:#f2c66d; --ember:#ff9a4a; --moss:#9bd28a; --sore:#f08a72; --blue:#7aaaff; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1480px; height: 1020px; overflow: hidden; background: #000; }
body { font-family: 'Figtree', sans-serif; color: var(--ink); -webkit-font-smoothing: antialiased; position: relative; }
.scene { position: absolute; left: 0; top: 0; width: 1480px; height: 1020px; image-rendering: pixelated; }
.rack { position: absolute; right: 0; top: 0; width: 304px; height: 86px; image-rendering: pixelated; }
.abs { position: absolute; }
.head { left: 40px; top: 34px; }
.head .t { font: 400 21px 'Josefin'; letter-spacing: .32em; color: var(--gold); text-transform: uppercase; }
.head .t i { font-style: normal; color: rgba(242,198,109,.5); margin: 0 10px 0 8px; letter-spacing: 0; }
.head .t b { font: 700 19px 'Courier'; letter-spacing: 0; color: #fff; text-transform: none; }
.head .m { margin-top: 5px; font: 400 12px 'Courier'; color: var(--gold); opacity: .85; }
.lead { font-family: 'Fraunces', serif; font-style: italic; font-variation-settings: 'SOFT' 100, 'opsz' 40; font-size: 19px; line-height: 27px; color: #f3e6c9; text-shadow: 0 1px 6px #000, 0 0 18px rgba(0,0,0,.9); }
.lead p + p { margin-top: 0; }
.gold { color: var(--gold); font: 600 14px 'Figtree'; text-shadow: 0 1px 4px #000; }
.lab { width: 300px; text-shadow: 0 1px 3px #000, 0 0 10px rgba(0,0,0,.95); }
.lab .k { font: 400 9px 'Silkscreen'; letter-spacing: .1em; color: rgba(246,236,219,.55); }
.lab .k s { text-decoration: none; opacity: .75; margin-left: 8px; }
.lab .ti { font: 500 13px/1.25 'Figtree'; color: rgba(246,236,219,.86); margin-top: 3px; }
.lab .ph { font: italic 400 12.5px/1.25 'Fraunces', serif; margin-top: 3px; }
.lab.many { width: 192px; }
.lab.many .ti { font-size: 11.5px; }
.lab.many .ph { font-size: 11.5px; }
.lab .ph.ember { color: var(--ember); } .lab .ph.moss { color: var(--moss); } .lab .ph.sore { color: var(--sore); }
.lab .ph.warm { color: #ffe3a8; } .lab .ph.dim { color: rgba(246,236,219,.5); } .lab .ph.red { color: #d97a62; } .lab .ph.blue { color: var(--blue); }
.line { left: 40px; width: 1400px; top: 948px; height: 1px; background: rgba(242,198,109,.22); }
.caret { left: 52px; top: 968px; width: 2px; height: 24px; background: #f6ecdb; }
.ph2 { left: 70px; top: 970px; font: 400 19px 'Hand'; color: rgba(246,236,219,.35); }
.hand { font-family: 'Hand'; }
.sub { font: 400 9px 'Silkscreen'; letter-spacing: .12em; text-transform: uppercase; color: rgba(246,236,219,.45); }
.pt { text-shadow: 0 1px 4px #000, 0 0 14px #000; }
.pt .a { font: 400 9px 'Silkscreen'; letter-spacing: .12em; text-transform: uppercase; color: var(--ember); }
.pt .b { font: 500 22px 'Fraunces'; margin-top: 6px; color: #fff3da; font-variation-settings: 'SOFT' 100, 'opsz' 40; }
.pt .c { font: 400 13.5px/1.45 'Figtree'; color: rgba(246,236,219,.8); margin-top: 8px; }
.pt .c em { font: italic 400 14.5px 'Fraunces'; color: #f3e6c9; }
.pt .d { font: 600 14px 'Figtree'; color: var(--gold); margin-top: 10px; }
.veil { position: absolute; pointer-events: none; }
body[data-ready] .z { }
"""


SHORT = {71924: 'writing the reason line', 71955: 'sorting by acquired date', 72050: 'reading the sample file'}


def phrase(t, many):
    st = t['st']
    if st == 'work':
        if many:
            return ('ember', SHORT.get(t['id'], t['step']), '%dm' % t['mins'])
        return ('ember', t['step'] + '  ·  ' + t['plan'].replace(' of ', '/'), '%dm' % t['mins'])
    if st == 'asks':
        return ('warm', 'asked the lead' if many else 'asked the lead about rounding', '%dm' % t['mins'])
    if st == 'you':
        return ('warm', 'needs you' if many else 'needs you · which price on a split day', '')
    if st == 'stuck':
        return ('ember', 'same test, six times' if many else 'same failing test, six times', '%dm' % t['mins'])
    if st == 'broken':
        return ('sore', 'fell over twice' if many else 'fell over twice on a setup error', '')
    if st == 'limit':
        return ('red', t['step'].replace('back at', 'limit · back' if many else 'waiting out a limit · back'), '')
    if st == 'setup':
        return ('dim', 'cutting its workspace', '%ds' % t['secs'])
    if st == 'done':
        mr = t['mr']
        bits = []
        if mr['ci'] == 'fail': bits.append('CI failed')
        if mr['need'] - mr['have']: bits.append('%d of %d approvals' % (mr['have'], mr['need']))
        if mr['talk']: bits.append('%d comments to answer' % mr['talk'] if not many else '%d to answer' % mr['talk'])
        return ('moss' if mr['ci'] == 'ok' else 'sore', '', ''), ' · '.join(bits)
    if st == 'landed':
        return ('dim', 'landed ' + t['ago'], '')


def label_html(l, many, T):
    t = T[l['id']]
    ph = phrase(t, many)
    extra = ''
    if t['st'] == 'done':
        ph, extra = ph
    cls, text, tm = ph
    k = l['key'] + (('<s>%s</s>' % tm) if tm else '')
    body = '<div class="k">%s</div><div class="ti">%s</div>' % (k, html.escape(l['title']))
    body += '<div class="ph %s">%s</div>' % (cls, html.escape(text))
    if extra:
        body = body.replace('<div class="ph %s"></div>' % cls, '<div class="ph %s">%s</div>' % ('blue' if t['mr']['ci'] == 'ok' else 'sore', html.escape(extra)))
    return '<div class="abs lab %s" style="left:%dpx;top:%dpx">%s</div>' % ('many' if many else '', l['x'], l['y'], body)


LEAD = ("Two need you. 71880 wants to know which price split-day lots take, the ticket doesn't say. "
        "71702 has fallen over twice on the same setup error; I've stopped retrying it. Everything else is moving. "
        "I told 71990 to stop rerunning its test and read the failure.")


def build(mode, name, point=None):
    from compose_b import T
    for k, v in T.items(): v['id'] = k
    labels = json.load(open(OUT + 'lead-B2-scene-%s.json' % mode if point is None else OUT + 'lead-B2-scene-%s-point.json' % mode))
    many = mode == 'many'
    h = ['<!doctype html><html><head><meta charset="utf-8"><style>%s</style></head><body>' % CSS]
    scene = 'lead-B2-scene-%s%s.png' % (mode, '-point' if point else '')
    h.append('<img class="scene" src="%s">' % scene)
    h.append('<img class="rack" src="lead-rack.png">')
    nt = len(labels)
    h.append('<div class="abs head"><div class="t">Invest-web<i>/</i><b>Sprint 42 lead</b></div><div class="m">Sonnet 5.5 · low · 1h 12m · %d tickets</div></div>' % nt)
    # the lead's voice, from the watch-house
    h.append('<div class="abs lead" style="left:240px;top:92px;width:800px"><p>%s</p></div>' % html.escape(LEAD))
    h.append('<div class="abs" style="left:560px;top:%dpx;display:flex;gap:10px 22px;align-items:baseline;width:520px;flex-wrap:wrap">'
             '<span class="sub" style="color:rgba(246,236,219,.5)">for 71880</span><span class="gold">the price it was bought at</span><span class="gold">the price after the split</span>'
             '<span style="width:26px"></span><span class="gold" style="opacity:.8;font-weight:500">what I have done so far</span><span class="gold" style="opacity:.8;font-weight:500">hand it more tickets</span></div>' % 186)
    for l in labels:
        h.append(label_html(l, many, T))
    if point:
        l = [x for x in labels if x['id'] == point][0]
        h.append('<div class="abs pt" style="left:%dpx;top:%dpx;width:330px">'
                 '<div class="a">stuck · 41m</div><div class="b">Dividend reinvest toggle</div>'
                 '<div class="c">step 3 of 6, <em>making the toggle remember its setting</em>. It has run the same test six times and got the same failure.</div>'
                 '<div class="c" style="margin-top:6px">The lead told it 3m ago: <em>read the failure, stop rerunning it</em>. Still watching.</div>'
                 '<div class="d">walk in</div></div>' % (1100 if not many else l['hx'] - 20, 126 if not many else 120))
    h.append('<div class="abs line"></div><div class="abs caret"></div><div class="abs ph2">tell the lead</div>')
    h.append('<script>document.body.dataset.ready=1</script></body></html>')
    open(OUT + name + '.html', 'w').write('\n'.join(h))


if __name__ == '__main__':
    mode, name = sys.argv[1], sys.argv[2]
    point = int(sys.argv[3]) if len(sys.argv) > 3 else None
    build(mode, name, point)
