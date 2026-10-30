import random
from PIL import Image, ImageOps, ImageDraw
A='sprites/props-tx-village-props-'
rs=Image.open(A+'road-sign-01-png-x1.png').convert('RGBA')
OUT='13-parts/'
OL=(82,46,24,255)
def arm_right(W,grain=True):
    im=Image.new('RGBA',(W,12))
    tail=rs.crop((0,3,5,15)); tip=rs.crop((21,3,27,15)); mid=rs.crop((4,3,5,15))
    im.paste(tail,(0,0))
    for x in range(5,W-6): im.paste(mid,(x,0))
    im.paste(tip,(W-6,0))
    # nails
    for nx in (3,W-9):
        for y in (3,8):
            pass
    px=im.load()
    for nx in (2,):
        px[nx,3]=(60,36,20,255); px[nx,8]=(60,36,20,255)
    rnd=random.Random(W)
    for _ in range(W//5 if grain else 0):
        y=rnd.choice((5,6,7,8,9,10)); x0=rnd.randint(6,W-14); L=rnd.randint(4,12)
        for x in range(x0,min(W-7,x0+L)):
            r,g,b,a=px[x,y]; k=rnd.choice((-12,-14)); px[x,y]=(r+k,g+k,b+k,a)
    for _ in range(W//12 if grain else 0):
        y=rnd.choice((5,7,9)); x0=rnd.randint(6,W-14); L=rnd.randint(2,5)
        for x in range(x0,min(W-7,x0+L)):
            r,g,b,a=px[x,y]; px[x,y]=(r+10,g+10,b+9,a)
    return im
for W in range(20,170,2):
    r=arm_right(W); r.save(OUT+f'armR-{W}.png'); ImageOps.mirror(r).save(OUT+f'armL-{W}.png')
# stem: 6 wide
stem_src=rs.crop((9,15,15,31))
H=140
st=Image.new('RGBA',(6,H))
for y in range(H):
    row=stem_src.crop((0,2+(y%12),6,3+(y%12)))
    st.paste(row,(0,y))
st.save(OUT+'stem.png')
# foot
foot=Image.new('RGBA',(14,4)); d=ImageDraw.Draw(foot)
d.rectangle((0,0,13,3),fill=(74,52,34,255)); d.rectangle((1,0,12,0),fill=(96,70,46,255)); foot.save(OUT+'foot.png')
# cap board: width Wc, height 16
def cap(Wc,Hc=16):
    im=Image.new('RGBA',(Wc,Hc)); px=im.load()
    tail=rs.crop((0,3,5,15)); mid=rs.crop((4,3,5,15))
    # rows: top 3 (outline+light), middle repeat, bottom 3
    def col(c):  # stretch column vertically from 12 -> Hc
        out=Image.new('RGBA',(c.width,Hc))
        for y in range(Hc):
            sy=y if y<5 else (y-(Hc-12) if y>=Hc-6 else 6)
            out.paste(c.crop((0,sy,c.width,sy+1)),(0,y))
        return out
    t=col(tail); m=col(mid)
    im.paste(t,(0,0))
    for x in range(5,Wc-5): im.paste(m,(x,0))
    im.paste(ImageOps.mirror(t),(Wc-5,0))
    return im
cap(70).save(OUT+'cap.png')
# crook (iron/wood bracket) 34 wide x 6: bar + brace, hook at left end
def crook(L=44):
    im=Image.new('RGBA',(L+6,10)); px=im.load()
    dark=(58,40,28,255); mid=(96,70,48,255); hi=(130,104,76,255)
    for x in range(L+6):
        px[x,0]=dark; px[x,1]=hi if x%7 else mid; px[x,2]=mid; px[x,3]=dark
    # brace
    for i in range(6):
        px[L+5-i- 0,4+min(i,5)]=dark if False else px[L+5-i,4+min(i,5)]
    for i in range(5):
        if L+5-i-1>=0: px[L-i+5- 0 if False else L+4-i,4+i]=mid
    # hook down at left end
    for y in range(3,9): px[1,y]=dark
    return im
crook().save(OUT+'crook.png')
# peg
peg=Image.new('RGBA',(8,5)); px=peg.load()
for x in range(8):
    px[x,0]=(58,40,28,255); px[x,1]=(150,124,92,255); px[x,2]=(120,92,64,255); px[x,3]=(58,40,28,255)
peg.save(OUT+'peg.png')
# seals 9x9
def seal(filled):
    im=Image.new('RGBA',(9,9)); px=im.load(); import math
    for y in range(9):
        for x in range(9):
            d=math.hypot(x-4,y-4)
            if d<=4.3:
                if filled:
                    px[x,y]=(176,48,34,255) if d<3.4 else (112,26,20,255)
                else:
                    px[x,y]=(92,66,46,255) if d>3.1 else (0,0,0,0)
    if filled:
        px[3,3]=(214,98,70,255);px[2,4]=(214,98,70,255)
        for p in ((4,4),(4,5),(5,4)): px[p]=(138,34,26,255)
    return im
seal(True).save(OUT+'seal-full.png'); seal(False).save(OUT+'seal-empty.png')
# slip 9x7 folded paper
slip=Image.new('RGBA',(9,7)); d=ImageDraw.Draw(slip)
d.rectangle((0,0,8,6),fill=(92,64,36,255)); d.rectangle((1,1,7,5),fill=(233,216,170,255)); d.line((1,3,7,3),fill=(190,166,120,255)); d.point((2,1),fill=(250,238,200,255))
slip.save(OUT+'slip.png')
# house icon 11x11 in sign-icon style
ic=Image.new('RGBA',(11,11)); px=ic.load()
L=(196,182,160,255);S=(150,134,112,255);B=(112,80,52,255)
shape=["....LLL....","...LLLLL...","..LLLLLLL..",".LLLLLLLLL.","LLLLLLLLLLL",".LLLLLLLLL.",".LLLSLLLLL.",".LLLSLLLLL.",".LLLSSLLLL.",".LLLSSLLLL."]
for y,r in enumerate(shape):
    for x,c in enumerate(r):
        if c=='L': px[x,y]=L
        if c=='S': px[x,y]=S
for x in range(1,10): px[x,10]=B
ic.save(OUT+'house.png')
# parchment generator
def paper(w,h,seed,edge=2):
    random.seed(seed); im=Image.new('RGBA',(w,h)); px=im.load()
    base=(226,208,164)
    # jagged edge inset per side
    def inset(n): 
        v=[]; c=random.randint(0,edge)
        for i in range(n):
            c=max(0,min(edge,c+random.choice((-1,0,0,1)))); v.append(c)
        return v
    T,Bm,Lf,R=inset(w),inset(w),inset(h),inset(h)
    for y in range(h):
        for x in range(w):
            if y<T[x] or y>=h-Bm[x] or x<Lf[y] or x>=w-R[y]: continue
            e=min(y-T[x],h-1-Bm[x]-y,x-Lf[y],w-1-R[y]-x)
            n=random.choice((0,0,0,-4,-6,4))
            c=tuple(max(0,min(255,v+n)) for v in base)
            if e==0: c=(98,70,40)
            elif e==1: c=(190,164,114)
            elif e==2: c=tuple(v-12 for v in base)
            px[x,y]=c+(255,)
    return im
paper(64,30,3).save(OUT+'notice.png')
paper(48,24,5).save(OUT+'notice48.png')
paper(220,330,7,3).save(OUT+'sheet.png')
# nail
n=Image.new('RGBA',(3,3)); d=ImageDraw.Draw(n); d.rectangle((0,0,2,2),fill=(120,80,20,255)); n.putpixel((1,1),(242,198,109,255)); n.save(OUT+'nail.png')
print('ok')
# --- 13f: big plank (16 tall), broken-tip plank, wide cap
def stretch_rows(src,Hn):
    out=Image.new('RGBA',(src.width,Hn)); h=src.height
    for y in range(Hn):
        sy=y if y<5 else (y-(Hn-h) if y>=Hn-6 else 6)
        out.paste(src.crop((0,sy,src.width,sy+1)),(0,y))
    return out
for W in range(100,200,2):
    stretch_rows(arm_right(W),16).save(OUT+f'armBR-{W}.png')
JAG=[0,2,1,3,1,0,2,3,1,2,0,1]
for W in range(40,110,2):
    a=arm_right(W); px=a.load()
    for y in range(12):
        cx=W-5+JAG[y]
        for x in range(cx,W): px[x,y]=(0,0,0,0)
        if cx-1>=0 and px[cx-1,y][3]: px[cx-1,y]=(60,34,16,255)
    a.save(OUT+f'armX-{W}.png')
cap(84).save(OUT+'cap84.png')
paper(170,22,9).save(OUT+'tag170.png')
# --- 13g
for W in range(100,200,2):
    stretch_rows(arm_right(W,False),20).save(OUT+f'armTR-{W}.png')
import math
def slipv(lean):
    im=Image.new('RGBA',(10,10)); px=im.load()
    for y in range(10):
        sh=int(round(lean*(9-y)/9))
        for x in range(1,8):
            xx=x+sh+1
            if not(0<=xx<10): continue
            edge=(x in(1,7)) or y==0
            px[xx,y]=(88,62,36,255) if edge else (236,222,182,255)
        # folded corner
    for k in range(3):
        for j in range(3-k):
            xx=7+lean*0+1-j; 
    px[7+1+(0),1]=(200,180,134,255)
    for x in range(3,6): px[x+(lean>0)-(lean<0),4]=(120,92,60,255)
    for x in range(3,6): px[x+(lean>0)-(lean<0),6]=(150,120,84,255)
    return im
for n,l in (('L',-2),('M',0),('R',2)): slipv(l).save(OUT+f'slip{n}.png')
def seal(sz,filled):
    im=Image.new('RGBA',(sz,sz)); px=im.load(); c=(sz-1)/2
    for y in range(sz):
        for x in range(sz):
            d=math.hypot(x-c,y-c)
            if d<=c+.3:
                rim=d>c-1.2
                if filled:
                    px[x,y]=(104,22,16,255) if rim else (178,46,34,255)
                else:
                    if rim: px[x,y]=(94,70,48,255)
                    elif d>c-3.0: px[x,y]=(176,140,96,255)
    if filled:
        m=int(c)
        for d in (-1,0,1): px[m+d,m]=(232,128,104,255); px[m,m+d]=(232,128,104,255)
        px[m-1,m-1]=(220,120,98,255)
    if not filled:
        for d in range(2): px[sz-3+d,sz-2]=(176,140,96,255)
    return im
seal(11,0).save(OUT+'seal11-e.png'); seal(11,1).save(OUT+'seal11-f.png')
seal(7,0).save(OUT+'seal7-e.png'); seal(7,1).save(OUT+'seal7-f.png')
# crow with a light rim
cr=Image.open('sprites/crow-hop-0-x1.png').convert('RGBA')
big=Image.new('RGBA',(cr.width+4,cr.height+4)); big.paste(cr,(2,2),cr)
a=big.split()[3]; mask=a.point(lambda v:255 if v>0 else 0)
from PIL import ImageFilter
dil=mask.filter(ImageFilter.MaxFilter(3))
rim=Image.new('RGBA',big.size,(168,178,196,255)); rim.putalpha(Image.eval(ImageChops.subtract(dil,mask),lambda v:v)) if False else None
import PIL.ImageChops as ImageChops
ring=ImageChops.subtract(dil,mask)
rimim=Image.new('RGBA',big.size,(150,160,182,255)); rimim.putalpha(ring)
out=Image.new('RGBA',big.size); out.paste(rimim,(0,0),rimim); out.paste(big,(0,0),big)
px=out.load()
for y in range(out.height):
    for x in range(out.width):
        r,g,b,a=px[x,y]
        if a and (r,g,b)!=(150,160,182) and r+g+b<130: px[x,y]=(min(r+22,255),min(g+22,255),min(b+30,255),a)
out.save(OUT+'crow-rim.png'); print(out.size)

rows=["......KKK.....",".....KKKKK....",".....KKwKKOO..",".....KKKKKO...","...KKKKKKK....","..KKKKKKKKK...",".KKKKWWKKKKK..","KKKKKWWWKKKK..","KKKKKKKKKKK...",".KKKKKKKKK....","...Y..Y......."]
cw=Image.new('RGBA',(14,11)); px=cw.load()
col={'K':(34,34,48,255),'W':(62,64,88,255),'w':(235,235,235,255),'O':(222,150,60,255),'Y':(150,110,60,255)}
for y,r in enumerate(rows):
    for x,c in enumerate(r):
        if c!='.': px[x,y]=col[c]
for y in range(11):
    for x in range(14):
        if px[x,y][3] and px[x,y][:3]==(34,34,48):
            up=y==0 or px[x,y-1][3]==0; rt=x==13 or px[x+1,y][3]==0
            if up: px[x,y]=(120,132,160,255)
            elif rt: px[x,y]=(86,96,122,255)
cw.save(OUT+'crow-rim.png')
paper(170,17,11).save(OUT+'tag170s.png')
