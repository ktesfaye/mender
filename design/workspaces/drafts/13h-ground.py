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
# 13h: road winds along, bank across
W,H=600,75
def top_h(x): return 30+4*math.sin(x/37.0)+2.5*math.sin(x/13.0+1)-3*math.exp(-((x-480)/60)**2)
road_h=[[(0,55),(50,57),(110,60),(170,64),(230,66),(290,64),(350,67),(410,63),(470,64),(530,60),(580,58),(600,58)]]
build('ground-h',W,H,top_h,road_h,5,roadr=9)
# 13i: a hill with paths running off it
def top_i(x): return 36+2*math.sin(x/29.0)+1.5*math.sin(x/11)-27*math.exp(-((x-92)/74)**2)-6*math.exp(-((x-545)/40)**2)
paths_i=[[(150,60),(112,63),(66,60),(40,58),(0,56)],
 [(150,60),(210,67),(270,66),(300,56),(285,52)],
 [(270,66),(330,69),(380,66),(400,67)],
 [(300,56),(380,60),(470,57),(480,50)],
 [(400,67),(470,62),(520,66),(540,66)],
 [(480,50),(540,52),(565,48),(585,45)],
 [(540,66),(580,64),(598,60)]]
build('ground-i',W,H,top_i,paths_i,9,roadr=5)
# leaning stems
src=Image.open('13-parts/stem.png')
for H_ in range(16,80,2):
    for nm,dirn in (('L',-1),('R',1)):
        im=Image.new('RGBA',(6+8,H_)); 
        for y in range(H_):
            sh_=int(round(dirn*(H_-1-y)/9.0)); 
            im.paste(src.crop((0,y%140,6,y%140+1)),(4+sh_+(4 if dirn<0 else 0)-(4 if dirn<0 else 0),y)) if False else im.paste(src.crop((0,y%140,6,y%140+1)),(max(0,min(8,4+sh_)),y))
        im.save(f'13-parts/stem{nm}-{H_}.png')
# cracked plank: armX with a crack and a droop of the loose end
for W in range(40,110,2):
    a=Image.open(f'13-parts/armX-{W}.png'); px=a.load()
    cx=W-18
    for y in range(12): 
        x=cx+(2 if y%4<2 else 1)+(y//5)
        if 0<=x<W and px[x,y][3]: px[x,y]=(48,26,12,255)
    a.save(f'13-parts/armC-{W}.png')
# rope coil
c=Image.new('RGBA',(11,6)); cd=c.load()
for x in range(11):
    for y in range(6):
        e=((x-5)/5.2)**2+((y-3)/2.8)**2
        if e<=1: cd[x,y]=(186,160,112,255) if e>.45 else (120,96,62,255)
for x in range(2,9): cd[x,3]=(90,70,44,255)
c.save('13-parts/coil.png')
