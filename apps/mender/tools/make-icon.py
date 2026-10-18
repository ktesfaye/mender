"""Draws the app's icon, and the two fires the dock shows while it runs.

The icon is the campfire at night: the one thing on the island before
anything else is, and the shape that still reads at dock size. The stones and
logs are the kit's own campfire, lit and cold, out of the packed kit, so it is
the same fire the village draws; the flame, the sparks, the smoke and the
light are drawn here, because the kit leaves those to the renderer.

While Mender runs, the dock tile is one of two loops instead (see
`src/main/dock-fire.ts`): the fire lit, swaying in a wind that keeps turning,
while anybody anywhere is working, and gone out, cold under the stars with
the odd burst of smoke coming off the logs, while nobody is, until it has
stopped smoking and is just `cold.png`. Both loops are written here as
numbered frames into `assets/dock/`, and the still icon in the bundle
is the first lit frame, so the dock never jumps between two drawings.

Everything is drawn at the kit's own pixel size and blown up whole, then cut
into the smooth rounded square every other icon sits in.

Run from apps/mender: python3 tools/make-icon.py
"""

import json
import math
import pathlib
import random
import shutil
import subprocess

from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).resolve().parent.parent
OUT = HERE / 'build'
DOCK = HERE / 'assets' / 'dock'
KIT = HERE / 'assets' / 'kit'
FIRE = 'props/TX Village Props - Campfire 01 Lit.png'
COLD = 'props/TX Village Props - Campfire 01.png'
DOCK_SIDE = 128

B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def hx(h):
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4)) + (255,)


def kit_sprite(name):
    sheet = json.loads((KIT / 'kit-0.json').read_text())
    f = sheet['frames'][name]['frame']
    art = Image.open(KIT / 'kit-0.png').convert('RGBA')
    return art.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))


G = 66
LIT = kit_sprite(FIRE); OFF = kit_sprite(COLD)
FX = (G - LIT.width)//2; FY = G - LIT.height - 6
CX = FX + 24; LOG = FY + 14
N = 200
def wind(t):
    a=2*math.pi*t/N
    return math.sin(a)*1.0+math.sin(2*a+1.2)*0.45
def lerp(a,b,t): return tuple(int(a[i]*(1-t)+b[i]*t) for i in range(3))
def grad(top,bot):
    im = Image.new('RGBA',(G,G)); d = ImageDraw.Draw(im)
    for y in range(G): d.line([(0,y),(G,y)], fill=lerp(hx(top),hx(bot),y/(G-1))+(255,))
    return im
def blend(px,x,y,c,a):
    x,y=int(x),int(y)
    if 0<=x<G and 0<=y<G and a>0:
        o=px[x,y]; px[x,y]=lerp(o,c,min(1,a))+(255,)
def dith(x,y): return B[int(y)%4][int(x)%4]/16

def glow(im, s):
    px=im.load()
    for y in range(G):
        for x in range(G):
            d=math.hypot(x-CX,(y-LOG)*1.1)/(G*0.75)
            if d<1:
                a=(1-d)**1.6*s
                c=lerp(hx('f6b04a'),hx('c2502a'),min(1,d*1.6))
                if a < dith(x,y)*0.35: a*=0.4
                blend(px,x,y,c,a)
INK=[hx('b8381f'),hx('e8642a'),hx('f6a43a'),hx('fcd65e'),hx('fff6c8')]
def noise(x,y,ph):
    return (math.sin(x*1.3+ph*2+y*0.4)+math.sin(x*0.7-ph*3+y*1.1+1.7)+math.sin(y*0.9+ph*4+x*0.2+4))/3
def flame(im, t):
    px=im.load(); ph=2*math.pi*t/N
    base=LOG+2; H=27
    for y in range(base-H-6, base+1):
        dy=(base-y)/H
        for x in range(CX-14, CX+15):
            sway=(math.sin(3*ph+dy*2.5)*1.3+math.sin(7*ph-dy*5+1)*0.8+wind(t)*4.5)*dy**1.3
            width=11*max(0,1-dy)**0.6*min(1,0.5+dy*2.5)+0.3
            v=1-abs(x-CX-sway)/width - dy*0.15
            v+=noise(x,y+ph*18,ph*3)*0.32*(0.3+dy) + (dith(x,y)-0.5)*0.1
            if v>0:
                k=0 if v<0.18 else 1 if v<0.38 else 2 if v<0.58 else 3 if v<0.78 else 4
                px[x,y]=INK[k]
def sparks(im,t):
    px=im.load(); rnd=random.Random(3)
    w=wind(t)
    for s in range(11):
        off=rnd.random(); life=rnd.uniform(0.35,0.75); drift=rnd.uniform(-1,1); big=rnd.random()<0.35
        q=((t/N)*4+off)%1
        if q>life: continue
        q/=life
        x=CX+drift*6*q+w*9*q+math.sin(q*8+s)*2; y=LOG-14-q*34
        c=lerp(hx('fff6c8'),hx('e8642a'),q); a=1-q*0.5
        blend(px,x,y,c,a)
        if big and q<0.6: blend(px,x+1,y,c,a); blend(px,x,y-1,c,a); blend(px,x+1,y-1,c,a)
def make_puffs():
    r=random.Random(5); out=[]
    srcs=[(CX-5,LOG+2),(CX+1,LOG-1),(CX+6,LOG+3)]
    for si,(sx,sy) in enumerate(srcs):
        e=r.uniform(0,40)
        while e<N:
            for b in range(r.choice([1,2,2,3,4])):
                out.append(dict(t0=(e+b*r.uniform(3,6))%N, x=sx+r.uniform(-1,1), y=sy,
                    life=r.uniform(55,85), size=r.uniform(1.6,3.0), curl=r.uniform(0,6.28),
                    rise=r.uniform(0.42,0.55)))
            e+=r.uniform(30,75)
    return out
PUFFS=make_puffs()
TONES=[hx('d4dae0'),hx('a9b2bc'),hx('7f8a98'),hx('586577')]
def smoke(im,t):
    px=im.load()
    drawn=[]
    for p in PUFFS:
        a=(t-p['t0'])%N
        if a>p['life']: continue
        q=a/p['life']
        w=wind(p['t0']+a*0.5)
        y=p['y']-a*p['rise']-a*a*0.0025
        x=p['x']+math.sin(a*0.09+p['curl'])*(0.5+q*2.5)+w*q*q*12
        r=p['size']*(0.35+min(q,0.6)*1.9)*(1-max(0,q-0.65)/0.35)**0.8
        tone=min(3,int(max(0,q-0.15)*4.5))
        drawn.append((y,x,r,tone))
    for y,x,r,tone in sorted(drawn,key=lambda d:-d[0]):
        if r<0.5: continue
        for yy in range(int(y-r)-1,int(y+r)+2):
            for xx in range(int(x-r)-1,int(x+r)+2):
                d=math.hypot(xx+0.5-x,(yy+0.5-y)*1.15)
                if d<=r:
                    k=tone
                    if (xx-x)+(yy-y)>r*0.25: k=min(3,k+1)
                    o=px[xx,yy] if 0<=xx<G and 0<=yy<G else None
                    if o: blend(px,xx,yy,TONES[k],0.9 if tone<3 else 0.6)
def moon(sp):
    sp=sp.copy(); px=sp.load(); m=(78,96,120)
    for y in range(sp.height):
        for x in range(sp.width):
            r,g,b,a=px[x,y]
            if a:
                l=(r*0.3+g*0.59+b*0.11)/255
                px[x,y]=(int(m[0]*l*1.7+r*0.2),int(m[1]*l*1.7+g*0.2),int(m[2]*l*1.7+b*0.2),a)
    return sp
SKY_OUT=grad('0d1424','1c2a3c'); SKY_LIT=grad('1a1210','3a1c12')
OFFM=moon(OFF)
STARS=[(10,9),(52,7),(58,19),(16,23),(42,13),(6,36),(61,33)]
def frame(active,t):
    if active:
        im=SKY_LIT.copy()
        g=0.75+0.08*math.sin(2*math.pi*t/N*9)+0.05*math.sin(2*math.pi*t/N*23+1)
        glow(im,g)
        im.alpha_composite(LIT,(FX,FY)); flame(im,t); sparks(im,t)
    else:
        im=SKY_OUT.copy(); px=im.load()
        for i,(x,y) in enumerate(STARS):
            tw=0.35+0.35*(1+math.sin(2*math.pi*t/N*(3+i%3)+i*1.9))/2
            blend(px,x,y,hx('dfe8f0'),tw)
        im.alpha_composite(OFFM,(FX,FY)); smoke(im,t)
    return im
SC=13; TILE=824
def icon(im):
    art=im.resize((G*SC,G*SC),Image.NEAREST)
    o=(G*SC-TILE)//2; art=art.crop((o,o,o+TILE,o+TILE))
    m=Image.new('L',(TILE*2,TILE*2),0)
    ImageDraw.Draw(m).rounded_rectangle((0,0,TILE*2-1,TILE*2-1),radius=185*2,fill=255)
    art.putalpha(m.resize((TILE,TILE),Image.LANCZOS))
    out=Image.new('RGBA',(1024,1024),(0,0,0,0)); out.alpha_composite(art,(100,100)); return out


def main() -> None:
    if DOCK.exists():
        shutil.rmtree(DOCK)
    for active, name in [(True, 'lit'), (False, 'smoke')]:
        (DOCK / name).mkdir(parents=True)
        for t in range(N):
            ic = icon(frame(active, t))
            if active and t == 0:
                still = ic
            ic.resize((DOCK_SIDE, DOCK_SIDE), Image.LANCZOS).quantize(255, method=Image.Quantize.FASTOCTREE).save(
                DOCK / name / f'{t:03d}.png', optimize=True
            )

    cold = SKY_OUT.copy()
    px = cold.load()
    for x, y in STARS:
        blend(px, x, y, hx('dfe8f0'), 0.5)
    cold.alpha_composite(OFFM, (FX, FY))
    icon(cold).resize((DOCK_SIDE, DOCK_SIDE), Image.LANCZOS).save(DOCK / 'cold.png', optimize=True)

    still.save(OUT / 'icon.png')
    still.resize((256, 256), Image.LANCZOS).save(OUT / 'icon-source.png')
    iconset = OUT / 'icon.iconset'
    iconset.mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 128, 256, 512):
        still.resize((size, size), Image.LANCZOS).save(iconset / f'icon_{size}x{size}.png')
        still.resize((size * 2, size * 2), Image.LANCZOS).save(
            iconset / f'icon_{size}x{size}@2x.png'
        )
    subprocess.run(
        ['iconutil', '-c', 'icns', str(iconset), '-o', str(OUT / 'icon.icns')], check=True
    )
    print('wrote', OUT / 'icon.icns', 'and', N * 2, 'dock frames')


if __name__ == '__main__':
    main()
