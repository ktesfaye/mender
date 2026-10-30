import math, random, json, sys
from PIL import Image, ImageDraw, ImageFilter
K='/Users/kirubel/Documents/dev/mender/design/workspaces/kit/'
A='/Users/kirubel/Documents/dev/mender/apps/mender/assets/'
OUT='#482510'; W1='#7a4e26'; W2='#b07a3e'; W0='#5e3a1b'; SAIL='#f4f1e8'; SAIL2='#d8d4ca'
def hx(c): return tuple(int(c[i:i+2],16) for i in (1,3,5))+(255,)
NW,NH=740,80
world=Image.new('RGBA',(NW,NH),(0,0,0,0))   # graded layer (sprites)
lit=Image.new('RGBA',(NW,NH),(0,0,0,0))
mid=Image.new('RGBA',(NW,NH),(0,0,0,0))
sea=Image.new('RGBA',(NW,NH),(0,0,0,255))
def px(im,x,y,c):
    if 0<=x<NW and 0<=y<NH: im.putpixel((int(x),int(y)),hx(c) if isinstance(c,str) else c)
def line(im,x0,y0,x1,y1,c):
    n=max(abs(x1-x0),abs(y1-y0),1)
    for i in range(n+1): px(im,round(x0+(x1-x0)*i/n),round(y0+(y1-y0)*i/n),c)
def rect(im,x,y,w,h,c):
    for j in range(h):
        for i in range(w): px(im,x+i,y+j,c)

# ---- sea
rnd=random.Random(14)
for y in range(NH):
    t=y/NH
    base=(int(7+9*t),int(13+14*t),int(24+16*t))
    for x in range(NW): sea.putpixel((x,y),base+(255,))
# wave rows: glints, denser at very top
for y in range(0,34):
    dens=0.022*(1-y/34)**1.5+0.0015
    x=0
    while x<NW:
        if rnd.random()<dens:
            ln=rnd.choice([2,3,3,4,5]); a=0.5+0.5*rnd.random()
            col=(int(18+22*a),int(36+34*a),int(56+44*a))
            if y%2==0 or y<8:
                for i in range(ln):
                    px(sea,x+i,y,col+(255,))
            x+=ln+rnd.randint(2,8)
        else: x+=1
# a few brighter moon glints very near top
for _ in range(12):
    x=rnd.randint(0,NW-6); y=rnd.randint(0,10); ln=rnd.choice([2,3,4])
    for i in range(ln): px(sea,x+i,y,(70,104,140,255))
# slow wave bands (dim darker lines)
for y in (14,22,30,38):
    for x in range(rnd.randint(0,12),NW,rnd.randint(20,34)):
        for i in range(rnd.randint(4,9)): px(sea,x+i,y,(5,9,17,255))

# ---- shore + house
land=hx('#17120d')
for y in range(56,NH):
    for x in range(0,70):
        px(sea,x,y,land)
for x in range(0,72):  # irregular shore edge
    h=int(2*math.sin(x*0.7)+1)
    for y in range(52+h,58): px(sea,x,y,hx('#1b150f') if x<66 else hx('#0d1522'))
h9=Image.open('/Users/kirubel/Documents/dev/mender/design/workspaces/kit/sprites/buildings-assembled-house-09-png-x1.png').convert('RGBA')
crop=h9.crop((6,148,6+66,204))   # 66x56 door-level
world.alpha_composite(crop,(0,15))
# ---- pier
tile=Image.open(K+'sprites/building-parts-tx-village-building-dock-01-e-01-png-x4.png').convert('RGBA')
tile=tile.resize((tile.width//4,tile.height//4),Image.NEAREST)  # 182x58
PX0,PX1,PY=60,608,51
plank=tile.crop((2,16,92,16+13))
x=PX0
while x<PX1:
    w=min(90,PX1-x); world.alpha_composite(plank.crop((0,0,w,plank.height)),(x,PY)); x+=w
post=tile.crop((94,0,108,15))
def mpost(x,y=PY-12): world.alpha_composite(post,(x,y))
# ---- helpers
def mini_crew(_im,x,y,col):
    im=mid
    # 5 wide, 9 tall, feet at y+8
    rect(im,x+1,y,3,3,'#e2ae84'); rect(im,x+1,y,3,1,OUT); px(im,x,y+1,OUT); px(im,x+4,y+1,OUT)
    rect(im,x+1,y+3,3,3,col); px(im,x,y+4,OUT); px(im,x+4,y+4,OUT)
    rect(im,x+1,y+6,1,3,OUT); rect(im,x+3,y+6,1,3,OUT)
def thwart(_im,x,y):
    im=mid
    rect(im,x,y,5,1,W2); px(im,x,y+1,OUT); px(im,x+4,y+1,OUT); rect(im,x+1,y-1,3,1,'#2a1a0e')
def gull(_im,x,y):
    im=mid
    # perched gull facing right
    rect(im,x,y+2,4,2,SAIL); px(im,x+4,y+1,SAIL); px(im,x+5,y+1,'#e8a23a')
    px(im,x,y+1,SAIL2); px(im,x,y+2,'#4e3f3f'); px(im,x+1,y+3,SAIL2); px(im,x+2,y+4,'#e8a23a')
def hull(im,x0,L,h,yw,rowboat=False):
    yd=yw-h+1
    cols={}
    mask=set()
    for xi in range(L):
        t=xi/(L-1)
        top=yd
        if xi>=L-6: top=yd-int((xi-(L-6))*0.5+0.5)
        if xi<=1: top=yd-1
        depth=1-0.3*max(0,0.2-t)/0.2-0.9*(max(0,t-0.6)/0.4)**1.6
        bot=yd+max(2,round(h*depth))-1
        for y in range(top,bot+1): mask.add((x0+xi,y))
    for (x,y) in mask:
        yy=y-yd
        c=W1
        if yy<=0: c=W2
        elif yy==2 and not rowboat: c=W0
        elif yy==1: c=W2 if (x%7) else W1
        px(im,x,y,c)
    for (x,y) in list(mask):
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            if (x+dx,y+dy) not in mask: px(im,x+dx,y+dy,OUT)
    # waterline foam handled by caller
    return yd
def lantern(x,y,col):
    # on a short post at bow: post 1x4, lamp 3x4
    px(world,x+1,y+4,OUT)
    line(world,x+1,y+4,x+1,y+7,OUT)
    rect(lit,x-1,y,5,5,col); px(lit,x-1,y,OUT); px(lit,x+3,y,OUT)
    rect(lit,x,y+1,3,2,hx('#fff3c8'))
def unlit_lantern(x,y):
    line(world,x+1,y+4,x+1,y+7,OUT)
    rect(world,x,y,3,4,'#3a2a1c'); px(world,x+1,y+1,'#241a10')
def foam(L,x0,yw):
    for i in range(0,L,5):
        if (i//5)%2==0:
            for k in range(3): px(world,x0+i+k+1,yw+1,(70,96,120,255))
def sloop(x0,L=38,h=8,yw=50,mastfrac=0.44,mh=36,sail='furled',crew=None,places=0,gulls=0,ember=False,lamp=None,lampcol=None):
    yd=hull(world,x0,L,h,yw)
    mx=x0+int(L*mastfrac)
    top=yw-h-mh+2
    # mast
    for y in range(top,yd+1):
        px(world,mx,y,W1); px(world,mx-1,y,OUT); px(world,mx+1,y,OUT)
    rect(world,mx-1,top-1,3,1,OUT)
    # boom
    by=yd-3
    line(world,mx,by,x0+2,by,OUT)
    # forestay
    line(world,mx,top+1,x0+L-2,yd-2,'#2a1d12')
    info={'mast':mx,'top':top,'deck':yd,'bow':x0+L-1,'x0':x0}
    if sail=='furled':
        rect(world,x0+4,by-2,mx-x0-5,2,SAIL2); rect(world,x0+4,by-2,mx-x0-5,1,SAIL)
        for lx in range(x0+6,mx-1,4): px(world,lx,by-1,W0)
    elif sail=='clean':
        for yy in range(top+3,by):
            f=(yy-top-3)/(by-top-3)
            xl=mx-1-int(f*(mx-x0-4))
            for xx in range(xl,mx-1): px(world,xx,yy,SAIL if (xx-xl)>1 or True else SAIL2)
            px(world,xl,yy,SAIL2)
        # seams
        for yy in range(top+8,by,6):
            f=(yy-top-3)/(by-top-3); xl=mx-1-int(f*(mx-x0-4)); line(world,xl+1,yy,mx-2,yy-1,SAIL2)
    elif sail=='torn':
        # reefed: half-height sail with a torn trailing edge and a sore patch
        stop=top+12
        for yy in range(stop,by):
            f=(yy-top-3)/(by-top-3)
            xl=mx-1-int(f*(mx-x0-4))
            for xx in range(xl,mx-1): px(world,xx,yy,SAIL)
            px(world,xl,yy,SAIL2)
        # rips
        for (rx,ry,rl) in ((mx-9,stop+5,5),(mx-14,stop+9,6)):
            for i in range(rl): px(world,rx-i//2,ry+i,(0,0,0,0))
        # tattered hem
        for xx in range(x0+6,mx-1,2): px(world,xx,by-1,(0,0,0,0))
        # hole
        for (a,b) in ((mx-6,stop+4),(mx-7,stop+4),(mx-6,stop+5),(mx-5,stop+5)): px(world,a,b,(0,0,0,0))
        # sore patch
        rect(lit,mx-8,stop+6,5,4,'#c26a58'); rect(lit,mx-8,stop+6,5,1,'#e08a72')
        # reef points / lashing
        for xx in range(x0+9,mx-1,4): px(world,xx,stop,OUT)
        # furled remainder bundled above boom? top part lashed to mast
        rect(world,mx-4,top+3,3,8,SAIL2)
    if crew is not None:
        slots=[mx+4+i*7 for i in range(places)]
        for i,s in enumerate(slots):
            if i<len(crew): mini_crew(world,s,yd-9,crew[i])
            else: thwart(world,s,yd)
    gx=[(mx-1,top-4) if top>6 else (mx+2,top+3),(x0+4,by-5),(x0+L-10,yd-5)]
    for g in range(gulls): gull(world,*gx[g])
    if lamp is not None:
        lx=x0+L-2
        if lamp=='off': unlit_lantern(lx,yd-9)
        else:
            lantern(lx,yd-9,lampcol); info['lamp']=(lx+1,yd-7)
    foam(L,x0,yw)
    return info
def rowboat(x0,L=24,yw=50,lamp=None,lampcol=None):
    yd=hull(world,x0,L,5,yw,rowboat=True)
    # oars shipped
    line(world,x0+8,yd-1,x0+3,yd-9,OUT); line(world,x0+13,yd-1,x0+18,yd-9,OUT)
    rect(world,x0+2,yd-10,2,2,W2);rect(world,x0+18,yd-10,2,2,W2)
    thwart(world,x0+9,yd+1)
    # a rolled canvas bundle
    rect(world,x0+13,yd-2,6,2,SAIL2)
    lx=x0+L-2
    if lamp=='off': unlit_lantern(lx,yd-9)
    else: lantern(lx,yd-9,lampcol)
    foam(L,x0,yw)
    return {'x0':x0,'deck':yd,'mast':x0+11,'top':yd-12,'bow':x0+L-1,'lamp':(lx+1,yd-7)}
def slip(x0,L=38,yw=50):
    # trestles on the pier edge, a skeleton hull with ribs and a ladder
    yd=yw-7
    for xi in range(L):
        t=xi/(L-1); top=yd-(int((xi-(L-6))*0.5+0.5) if xi>=L-6 else 0)
        depth=1-0.9*(max(0,t-0.6)/0.4)**1.6
        bot=yd+max(2,round(7*depth))-1
        px(world,x0+xi,top,OUT); px(world,x0+xi,bot,W0 if xi%2 else OUT)
        if xi%4==1:
            for y in range(top,bot+1): px(world,x0+xi,y,W1)
    line(world,x0,yd,x0,yd+2,OUT); line(world,x0+L-1,yd-3,x0+L-1,yd+1,OUT)
    # trestles
    for tx in (x0+6,x0+L-9):
        line(world,tx,yw-1,tx+2,yd+6,OUT); line(world,tx+5,yw-1,tx+3,yd+6,OUT)
    # ladder against the hull
    line(world,x0+L//2,yd-10,x0+L//2-4,yw,W2); line(world,x0+L//2+2,yd-10,x0+L//2-2,yw,W2)
    for k in range(0,10,3): line(world,x0+L//2-k//3*1-0,yd-9+k+1,x0+L//2+2-k//3,yd-9+k+1,OUT)
    return {'x0':x0,'deck':yd}

info={}
# home post; moored boats
X=[]
mpost(70)
info['cur']=sloop(78,L=66,h=10,yw=50,mastfrac=0.46,mh=42,sail='torn',crew=[],places=2,gulls=3,lamp='on',lampcol='#ff7a4a')
mpost(150)
xs=[214,264,314,364,414,464,514]
# 1 71880: asking, clean sail, 2 crew, 1 gull
info['71880']=sloop(xs[0],sail='clean',crew=['#647c8c','#62844a'],places=2,gulls=1,lamp='on',lampcol='#ff7a4a'); mpost(xs[0]+40)
# 2 72011: done unseen
info['72011']=sloop(xs[1],sail='furled',lamp='on',lampcol='#9bd28a'); mpost(xs[1]+40)
# 3 71990: working, draft, 1 crew of 2
info['71990']=sloop(xs[2],sail='furled',crew=['#647c8c'],places=2,lamp='on',lampcol='#f0a65a',ember=True); mpost(xs[2]+40)
# 4 71702: broken
info['71702']=sloop(xs[3],sail='furled',lamp='on',lampcol='#f08a72'); mpost(xs[3]+40)
# 5 spike: rowing boat
info['spike']=rowboat(xs[4]+4,lamp='off'); mpost(xs[4]+40)
# 6 cutting: slip
info['cut']=slip(xs[5]); mpost(xs[5]+40)
# 7 mooring ring at the pier's edge
mx=xs[6]+8
for y in range(PY-8,PY+1): px(world,mx,y,OUT); px(world,mx+1,y,W1); px(world,mx+2,y,OUT)
info['ring']=(mx+1,PY-6)
# rope trailing in the water
for i in range(7): px(world,mx+3+i//2,PY-4+i,W0 if i%2 else W2)
# head post: a stout piling
HX=566; HW=22; HT=20; HB=PY+11
for y in range(HT,HB+1):
    cut=max(0,3-(y-HT))
    for x in range(HX+cut,HX+HW-cut):
        dx=x-HX
        if dx<3 or dx>HW-4: c=W0
        elif dx<7 or dx>HW-8: c=W1
        else: c=W2 if (x*7+y*3)%11 else W1
        px(world,x,y,c)
    px(world,HX+cut-1,y,OUT); px(world,HX+HW-cut,y,OUT)
for x in range(HX+3,HX+HW-3): px(world,x,HT-1,OUT)
rect(world,HX-1,HB-6,HW+2,2,W2); rect(world,HX-1,HB-4,HW+2,1,OUT)
line(world,HX+11,HT-1,HX+11,HT-14,OUT)
pass
info['head']=HX
# tide gauge: a board planted in the water, the waterline across it is the context used
GX0,GX1,GY0,GY1=700,716,40,64
GW=56
for y in range(GY0,GY1+1):
    for x in range(GX0,GX1+1):
        px(world,x,y,W1 if (x-GX0)%5 else W0)
    px(world,GX0-1,y,OUT); px(world,GX1+1,y,OUT)
for x in range(GX0-1,GX1+2): px(world,x,GY0-1,OUT); px(world,x,GY0,W2)
for k in range(11):
    y=GY1-round(k*(GY1-GY0)/10)
    L=5 if k%5==0 else 3
    for i in range(L): px(world,GX0+i,y,OUT)
for y in range(GW,GY1+1):
    for x in range(GX0,GX1+1): px(lit,x,y,(58,108,160,120))
for x in range(GX0-8,GX1+9):
    px(lit,x,GW,(150,196,232,255) if (x//2)%3 else (90,140,185,255))
for (x,y,l) in [(688,GW+2,5),(722,GW+1,5),(690,GW+5,4),(724,GW+5,4)]:
    for i in range(l): px(lit,x+i,y,(70,112,150,255))
for i in range(4): px(lit,GX0-14+i,GW-1+ (0),(255,154,74,255)); 
for dy in (-2,-1,0,1,2):
    for i in range(3-abs(dy)): px(lit,GX0-9+i,GW+dy,(255,154,74,255))
info['gauge']=(GX0,GY0,GY1)
json.dump(info,open('/tmp/14b-info.json','w'),default=list)

# ---- night grade on the world layer
g=world.copy(); px_=g.load()
for y in range(NH):
    for x in range(NW):
        r,gg,b,a=px_[x,y]
        if a: px_[x,y]=(int(r*0.42),int(gg*0.46),int(b*0.64),a)
# soft shadows on water under hulls skipped (pier in front)
gm=mid.copy(); q=gm.load()
for y in range(NH):
    for x in range(NW):
        r,gg,b,a=q[x,y]
        if a: q[x,y]=(int(r*0.78),int(gg*0.8),int(b*0.92),a)
comp=sea.copy(); comp.alpha_composite(g); comp.alpha_composite(gm); comp.alpha_composite(lit)
# right-top: leave the rack's own background (alpha 0 inside x>=613,y<34)
mask=Image.new('L',(NW,NH),255); m=mask.load()
for y in range(NH):
    for x in range(NW):
        v=255.0
        if x>=596:
            hx_=min(1,max(0,(626-x)/30)); vy=min(1,max(0,(y-30)/8))
            v=255*max(hx_,vy)
        if y>62:
            f=1-(y-62)/(NH-62)
            v=v*(f**1.4)
        m[x,y]=int(v)
comp.putalpha(mask)
big=comp.resize((NW*4,NH*4),Image.NEAREST)
for src,dst in (('bg-yard','14b-harbour-bg'),('bg-busy','14b-harbour-busy-bg')):
    bg=Image.open(K+src+'.png').convert('RGBA')
    if bg.size[0]<2960: bg=bg.resize((2960,2040),Image.LANCZOS)
    W=2960
    def fill(x0,ya,yb):
        patch=bg.crop((x0,760,W,800)).filter(ImageFilter.GaussianBlur(16)); k=0
        y=ya
        while y<yb:
            p=patch.transpose(Image.FLIP_TOP_BOTTOM) if k%2==0 else patch
            h=min(40,yb-y); bg.paste(p.crop((0,0,W-x0,h)),(x0,y)); y+=h; k+=1
    fill(0,268,308); fill(2400,146,268); fill(2700,134,146)
    bg.alpha_composite(big,(0,0)); bg.save(K+dst+'.png')
    if src=='bg-yard': bg.crop((0,0,2960,340)).save('/tmp/h-crop.png')
