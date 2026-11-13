import json, math, random
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import numpy as np
AS='/Users/kirubel/Documents/dev/mender/apps/mender/assets/'
d=json.load(open(AS+'kit/kit-0.json')); f=d.get('frames',d)
if isinstance(f,list): f={x['filename']:x for x in f}
sheet=Image.open(AS+'kit/kit-0.png').convert('RGBA')
def spr(n):
    r=f[n]['frame']; return sheet.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']))
def tile(kind,i): return spr(f'terrain-{kind}/TX Tileset {kind.capitalize()}_{i}.png')
# ---- trees
trees={}
for n,fn in [('birch1','plants/TX Village Plant - Tree Birch 01 A.png'),('birch2','plants/TX Village Plant - Tree Birch 02 A.png'),('birch3','plants/TX Village Plant - Tree Birch 03 A.png'),('birch4','plants/TX Village Plant - Tree Birch 04 A.png'),('birch5','plants/TX Village Plant - Tree Birch 05 A.png'),('oak1','plants/TX Village Plant - Tree Oak 01.png'),('oak2','plants/TX Village Plant - Tree Oak 02.png'),('bush1','plants/TX Village Plant - Bush 01 A.png'),('bush2','plants/TX Village Plant - Bush 02 A.png'),('bush3','plants/TX Village Plant - Bush 03 A.png'),('bush4','plants/TX Village Plant - Bush 04 A.png'),('bush5','plants/TX Village Plant - Bush 05 A.png'),('bush6','plants/TX Village Plant - Bush 06 A.png'),('bush7','plants/TX Village Plant - Bush 07 A.png'),('rock5','props/TX Village Props - Rock 05.png'),('rock2','props/TX Village Props - Rock 02.png')]:
    im=spr(fn); im.save(f'A/t-{n}.png'); trees[n]=im.size
json.dump(trees,open('A/trees.json','w'))

def slots(mode):
    cx,cy=740,450
    if mode==8:
        rx,ry=575,320
        ang=[150,181,212,243,274,305,336,7,52]
        return [(cx+rx*math.cos(math.radians(a)),cy+ry*math.sin(math.radians(a))) for a in ang],(rx,ry),None
    rx,ry=610,335
    ang=[150,181,212,243,274,305,336,7,52]
    outer=[(cx+rx*math.cos(math.radians(a)),cy+ry*math.sin(math.radians(a))) for a in ang]
    irx,iry=330,175
    iang=[190,235,280,325,10]
    inner=[(cx+irx*math.cos(math.radians(a)),cy+iry*math.sin(math.radians(a))) for a in iang]
    return outer,(rx,ry),(inner,(irx,iry))
out={}
for mode in (8,14):
    o,orr,inn=slots(mode)
    out[mode]={'outer':[(round(x),round(y)) for x,y in o],'orr':orr,'inner':[(round(x),round(y)) for x,y in inn[0]] if inn else [], 'irr':inn[1] if inn else None}
open('lead-A2-pos.js','w').write('window.POS='+json.dumps(out)+';')

# ---- ground
def ground(mode):
    S=3 if mode==8 else 2
    W,H=1480,1020; gw,gh=W//S+2,H//S+2
    rng=random.Random(5+mode)
    flat=[12,13,14,15,28,29,30,31,44,45,46,47,60,61,62,63]
    deco=[92,93,94,95,108,109,110,111,124,125,126,127,140,141,142,143]
    base=Image.new('RGBA',(gw+32,gh+32))
    for ty in range(0,gh+32,32):
        for tx in range(0,gw+32,32):
            i=rng.choice(flat) if rng.random()>.5 else rng.choice(deco)
            base.paste(tile('grass',i),(tx,ty))
    base=base.crop((0,0,gw,gh))
    dirt=Image.new('RGBA',(gw+32,gh+32))
    for ty in range(0,gh+32,32):
        for tx in range(0,gw+32,32):
            dirt.paste(tile('dirt',rng.choice([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15])),(tx,ty))
    dirt=dirt.crop((0,0,gw,gh))
    # masks (art px)
    o,orr,inn=slots(mode)
    cx,cy=740/S,450/S
    m=Image.new('L',(gw,gh),0); dr=ImageDraw.Draw(m)
    # council clearing
    ex,ey=(78,46) if mode==8 else (118,66)
    dr.ellipse((cx-ex,cy+4/S*3-ey,cx+ex,cy+4/S*3+ey),fill=255)
    # ring road (outer) full ellipse, south arc included
    orx,ory=orr[0]/S,orr[1]/S
    wid=4 if mode==8 else 5
    pts=[(cx+orx*math.cos(t/60*6.2832),cy+ory*math.sin(t/60*6.2832)) for t in range(61)]
    dr.line(pts,fill=255,width=wid,joint='curve')
    if inn:
        irx,iry=inn[1][0]/S,inn[1][1]/S
        pts=[(cx+irx*math.cos(math.radians(a)),cy+iry*math.sin(math.radians(a))) for a in range(150,391,6)]
        dr.line(pts,fill=255,width=4,joint='curve')
    # spokes
    allp=[(x/S,y/S) for x,y in o]+([(x/S,y/S) for x,y in inn[0]] if inn else [])
    for (x,y) in allp:
        dr.line([(cx,cy+3),(x,y)],fill=255,width=3 if mode==8 else 4)
        dr.ellipse((x-26/(3/S)*1.0*(S/ S),y-9,x+26,y+11),fill=255) if False else None
        pw,ph=44,16
        dr.ellipse((x-pw-3,y-ph+3,x+pw-3,y+ph+4),fill=255)
    # rag the edges: threshold blurred noise
    ma=np.array(m,dtype=float)
    noise=np.random.RandomState(mode).rand(gh,gw)
    nb=np.array(Image.fromarray((noise*255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2)),dtype=float)/255
    sm=np.array(m.filter(ImageFilter.GaussianBlur(1.6)),dtype=float)/255
    thr=(sm+(nb-.5)*.95)>.45
    mask=Image.fromarray((thr*255).astype('uint8'))
    # big soft blotches on grass
    bl=np.array(Image.fromarray((np.random.RandomState(mode+9).rand(gh//12+2,gw//12+2)*255).astype('uint8')).resize((gw,gh),Image.BICUBIC),dtype=float)/255
    ba=np.array(base).astype(float); ba[...,:3]*=(.88+.24*bl)[...,None]; base=Image.fromarray(ba.clip(0,255).astype('uint8'))
    ba=np.array(base).astype(float); ba[...,0]*=.40; ba[...,1]*=.66; ba[...,2]=ba[...,2]*.9+26; base=Image.fromarray(ba.clip(0,255).astype('uint8'))
    da=np.array(dirt).astype(float); da[...,0]*=.8; da[...,1]*=.7; da[...,2]*=.55; dirt=Image.fromarray(da.clip(0,255).astype('uint8'))
    g=base.copy(); g.paste(dirt,(0,0),mask)
    # rim: pixels just outside mask darker
    ma=np.array(mask)>0
    from scipy import ndimage
    rim=ndimage.binary_dilation(ma,iterations=1)&~ma
    ga=np.array(g)
    ga[rim]=(ga[rim]*np.array([.62,.6,.5,1])).astype('uint8')
    # fire scorch: dark ash at centre
    yy,xx=np.mgrid[0:gh,0:gw]
    sc=((xx-cx)/(27 if mode==8 else 40))**2+((yy-(cy+4))/(13 if mode==8 else 19))**2<1
    ga[sc]=(ga[sc]*np.array([.38,.36,.34,1])).astype('uint8')
    g=Image.fromarray(ga)
    # grade to night: cooler, deeper
    g.save(f'A/ground2-{mode}.png')
for m in (8,14): ground(m)
print('ok')
