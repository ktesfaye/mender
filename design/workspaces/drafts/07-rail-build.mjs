import fs from 'fs';
const dir='/Users/kirubel/Documents/dev/mender/design/workspaces/';
const T=fs.readFileSync(dir+'drafts/07-rail-template.html','utf8');
const sess=(cls,img,b,i,extra='')=>`<div class="who ${cls}"><img src="${img}"><div><b>${b}</b><span>${i}</span></div></div>`;
const lg=`class="lg pop" data-lg='{"tint":[14,15,18,0.42],"glareFactor":0.7,"fresnelFactor":0.25,"refThickness":22}'`;
const hover=`<div ${lg} style="width:372px;position:absolute">
 <div class="r1"><span class="key">INV-71880</span><span class="ty"><i data-px="bug" data-s="12" data-c="#f08a72"></i>bug</span><span class="st"><span class="dot" style="background:#7aaaff"></span>In Review</span><span class="oj">open in jira</span></div>
 <h2 class="serif">BE: Cost basis export drops lots bought on a split day</h2>
 <div class="card"><div class="pix">in here</div>${sess('a','lantern.png','Export split-day lots','<em>wants you</em> · which basis to use for a split? · 6m')}</div>
 <div class="card"><div class="pix">merge request<span class="go">open in gitlab</span></div>
  <div class="mr"><span class="n">!477</span>Include split-day lots in the cost basis export</div>
  <div class="fact ok" style="margin-top:6px"><i data-px="tick" data-s="12" data-c="#9bd28a"></i><b>ci passed</b></div>
  <div class="fact ok"><i data-px="tick" data-s="12" data-c="#9bd28a"></i><b>approved</b><span class="d">2 of 2 · maya, theo</span></div>
  <div class="fact need"><i data-px="chat" data-s="12" data-c="#f6ecdb"></i><b>1 comment to answer</b><span class="d">on export.py</span></div></div>
 <div class="foot"><i data-px="merge" data-s="12" data-c="#7aaaff"></i><span class="mono">inv-71880-split-day-lots</span><span style="margin-left:auto"><span style="color:#7aaaff">2 ahead</span> · 0 uncommitted</span></div>
</div>`;
const open=`<div ${lg} style="width:430px;position:absolute">
 <div class="r1"><span class="key">INV-71924</span><span class="ty"><i data-px="story" data-s="12" data-c="#9bd28a"></i>story</span><span class="st"><span class="dot" style="background:#7aaaff"></span>In Progress</span><span class="ty" style="color:var(--ink-3)">high</span><span class="oj">open in jira</span></div>
 <h2 class="serif">FE: G/L wash sale info, explaining why a loss was disallowed</h2>
 <div class="ds">Explain each disallowed loss on the gains and losses page, with a link to the lot it came from.</div>
 <div class="card"><div class="pix">in here</div>
  ${sess('w','lantern.png','Reason line under each loss','<em>running something</em> · 12m')}
  ${sess('a','lantern.png','Lot link API','<em>wants you</em> · which route to link to? · 4m')}</div>
 <div class="card"><div class="pix">merge request<span class="go">open in gitlab</span></div>
  <div class="mr"><span class="n">!482</span>Explain disallowed losses on the G/L page</div>
  <div class="fact bad" style="margin-top:6px"><i data-px="cross" data-s="12" data-c="#f08a72"></i><b>ci failed</b><span class="d">the lint job</span></div>
  <div class="fact need"><i data-px="ring" data-s="12" data-c="#f6ecdb"></i><b>needs 2 approvals</b><span class="d">0 of 2 so far</span></div>
  <div class="fact need"><i data-px="chat" data-s="12" data-c="#f6ecdb"></i><b>3 comments to answer</b><span class="d">on WashSaleNote.tsx</span></div></div>
 <div class="foot"><i data-px="merge" data-s="12" data-c="#7aaaff"></i><span class="mono">inv-71924-wash-sale-info</span><span style="margin-left:auto"><span style="color:#7aaaff">3 ahead</span> · 2 uncommitted</span></div>
</div>`;
const st={'07-rail':{},'07-rail-hover':{hover:'INV-71880',anchor:'INV-71880',pop:hover},'07-rail-open':{hover:'INV-71924',anchor:'INV-71924',pop:open}};
for(const [n,s] of Object.entries(st)) fs.writeFileSync(dir+'kit/'+n+'.html',T.replace('<script>\nconst S = window.STATE;',`<script>window.STATE=${JSON.stringify(s)}</script>\n<script>\nconst S = window.STATE;`));
