import json, random, math
from PIL import Image, ImageDraw
A='/Users/kirubel/Documents/dev/mender/apps/mender/assets/'
sh=Image.open(A+'kit/kit-0.png').convert('RGBA')
d=json.load(open(A+'kit/kit-0.json')); f=d.get('frames',d); items=dict(f.items() if isinstance(f,dict) else [(x['filename'],x) for x in f])
def crop(k):
    r=items[k]['frame']; return sh.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']))
grass=[];dirt=[]
for k in items:
    if k.startswith('terrain-grass'):
        t=crop(k)
        if t.size==(32,32) and min(t.split()[3].getdata())==255: grass.append(t)
    if k.startswith('terrain-dirt'):
        t=crop(k)
        if t.size==(32,32) and min(t.split()[3].getdata())==255: dirt.append(t)
print(len(grass),len(dirt))
def fill(W,H,tiles,rnd):
    im=Image.new('RGBA',(W,H))
    for ty in range(0,H,32):
        for tx in range(0,W,32): im.paste(rnd.choice(tiles),(tx,ty))
    return im
def rim(im,mask,k=.58):
    px=im.load(); mp=mask.load(); W,H=im.size
    for y in range(H):
        for x in range(W):
            if mp[x,y]:
                edge=any(0<=x+dx<W and 0<=y+dy<H and not mp[x+dx,y+dy] for dx,dy in((1,0),(-1,0),(0,1),(0,-1))) or y==0 or x==0 or x==W-1 or y==H-1
                if edge and 0<y<H-1 and 0<x<W-1:
                    r,g,b,a=px[x,y]; px[x,y]=(int(r*k),int(g*k),int(b*k),255)
def build(name,W,H,topfn,paths,seed,roadr=6):
    rnd=random.Random(seed)
    g=fill(W,H,[t for t in grass],rnd); dr=fill(W,H,[t for t in dirt],rnd)
    gm=Image.new('L',(W,H),0); gp=gm.load()
    for x in range(W):
        t=int(topfn(x)+rnd.choice((0,0,0,1,-1)) )
        for y in range(max(t,0),H): gp[x,y]=255
    rim(g,gm,.55)
    out=Image.new('RGBA',(W,H)); out.paste(g,(0,0),gm)
    rm=Image.new('L',(W,H),0); dd=ImageDraw.Draw(rm)
    for pts in paths:
        # sample a smooth curve through points (catmull-ish via linear + smoothing)
        P=[]
        for i in range(len(pts)-1):
            (x0,y0),(x1,y1)=pts[i],pts[i+1]
            n=int(max(abs(x1-x0),abs(y1-y0),1))
            for j in range(n): P.append((x0+(x1-x0)*j/n,y0+(y1-y0)*j/n))
        P.append(pts[-1])
        # smooth
        S=[]
        for i in range(len(P)):
            a=P[max(0,i-9):i+10]; S.append((sum(p[0] for p in a)/len(a),sum(p[1] for p in a)/len(a)))
        for i,(x,y) in enumerate(S):
            r=roadr+rnd.choice((0,0,0,1))*0+ (0.8*math.sin(i/9.0))
            dd.ellipse((x-r*1.0,y-r*0.62,x+r*1.0,y+r*0.62),fill=255)
    rm=rm.point(lambda v:255 if v>100 else 0)
    # road lies only on the bank
    rm=Image.composite(rm,Image.new('L',(W,H),0),gm)
    rim(dr,rm,.5)
    out.paste(dr,(0,0),rm)
    # pebbles and stones fleck
    px=out.load()
    out.save('13-parts/'+name+'.png'); print(name,out.size)

import math
W,H=725,75
def top_j(x): return 36+2*math.sin(x/29.0)+1.5*math.sin(x/11)-27*math.exp(-((x-92)/74)**2)-6*math.exp(-((x-545)/40)**2)-5*math.exp(-((x-690)/45)**2)
paths_j=[[(150,60),(112,63),(66,60),(40,58),(0,56)],
 [(150,60),(210,67),(270,66),(300,56),(285,52)],
 [(270,66),(330,69),(380,66),(400,67)],
 [(300,56),(380,60),(470,57),(480,50)],
 [(400,67),(470,62),(520,66),(540,66)],
 [(480,50),(540,52),(565,48),(585,45)],
 [(540,66),(580,64),(610,66),(650,64),(724,60)],
 [(650,64),(690,54),(724,50)]]
build('ground-j',W,H,top_j,paths_j,9,roadr=5)
paths_s=[[(150,60),(112,63),(66,60),(40,58),(0,56)],
 [(150,60),(210,67),(270,66),(340,68),(420,66),(480,64),(560,66),(610,66),(650,64),(724,60)]]
build('ground-js',W,H,top_j,paths_s,9,roadr=5)
