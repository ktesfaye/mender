tpl='''<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="lead-C3.css"></head><body>
<div id="stage"><canvas id="scene"></canvas><canvas id="out"></canvas>
<div id="glow"></div>
<img id="rack" src="rack-C.png">
<div id="head"><span class="a">INVEST-WEB</span><span class="s">/</span><span class="b">Sprint 42 lead</span><div class="m">Sonnet 5.5 · low · 1h 12m · __N__ crew</div></div>
<div id="voice"><span class="who">sprint 42 lead says</span>__VOICE__</div>
__OPTS__
<div id="line"></div>__ANS__<div id="cur"></div>
</div>
<script>window.SCN='__SC__'</script><script src="lead-C3-places.js"></script><script src="lead-C3.js"></script>__EXTRA__
</body></html>'''
ANS='<div id="ans">answering 71880</div>'
O='<div id="opts"><span class="q">71880 asks</span><span class="g">the pre-split price</span><span class="g">the post-split price</span></div>'
F={
 '2-arrive':('2','5','<p>Five tickets. I am cutting a workspace for each and sending them off. I will watch the roads, answer what the tickets already answer, and come to you only for what they cannot.</p>','',''),
 '3-flight':('3','8','<p>Eight on the road. Two are writing code, one is stuck on a test and I have nudged it, one is being tried on the device, one is opening its merge request, two are in review, and one has landed.</p>','',''),
 '4-handled':('4','8','<p><span class="tag ok">HANDLED</span>72011&rsquo;s pipeline failed on a lint rule. I told it to fix that and push again. Nothing for you.</p>','','<script src="lead-C3-s4.js"></script>'),
 '5-needs-you':('5','8','<p><span class="tag need">NEEDS YOU</span><span style="color:#ff9a4a">71880</span> is asking which price lots bought on a split day take. The ticket does not say, so it is yours.</p>',O,''),
 '6-tested':('6','8','<p>72033 ran on the Pixel 9: opened Holdings, checked the new column order on three screens, nothing crashed. Its screenshots hang at the proving ground, and it is opening the merge request next.</p>','','<script src="lead-C3-s6.js"></script>'),
}
for k,(sc,n,v,o,ex) in F.items():
    open(f'lead-C3-{k}.html','w').write(tpl.replace('__ANS__',ANS if sc=='5' else '').replace('__SC__',sc).replace('__N__',n).replace('__VOICE__',v).replace('__OPTS__',o).replace('__EXTRA__',ex))
