from PIL import Image, ImageDraw
import os
OUT='A/'
OL=(72,37,16,255)
def px(d,x,y,c): d.point((x,y),fill=c)
def new(w,h): im=Image.new('RGBA',(w,h),(0,0,0,0)); return im,ImageDraw.Draw(im)
def hexc(s,a=255): s=s.lstrip('#'); return (int(s[0:2],16),int(s[2:4],16),int(s[4:6],16),a)
CAN=hexc('a09583'); CANS=hexc('86796a'); CANL=hexc('b4a996')
WOOD=hexc('7a552c'); WOODL=hexc('96703c')

def tent(name, stripe, door, w=34, h=25):
    im,d=new(w,h)
    cx=w//2; apex=1; base=h-3
    # canvas triangle rows
    for y in range(apex,base+1):
        t=(y-apex)/(base-apex)
        half=int(1+t*(cx-2))
        for x in range(cx-half,cx+half+1):
            col=CAN
            # stripes
            if (x-cx)//4%2==0 and abs(x-cx)>0: col=stripe
            if x<cx: col=tuple(int(c*.86) for c in col[:3])+(255,)
            if y>base-2: col=tuple(int(c*.82) for c in col[:3])+(255,)
            px(d,x,y,col)
        px(d,cx-half-1,y,OL); px(d,cx+half+1,y,OL)
    for x in range(cx-int(1+(cx-2))-1,cx+cx-1): px(d,x,base+1,OL)
    px(d,cx,0,OL);px(d,cx-1,0,OL);px(d,cx+1,0,OL)
    # ridge pole nub
    px(d,cx,apex-1,WOODL)
    # door
    dh=11; dtop=base-dh
    for y in range(dtop,base+1):
        t=(y-dtop)/dh; half=int(1+t*4)
        for x in range(cx-half,cx+half+1):
            if door=='warm':
                col=hexc('e0a050') if y>dtop+4 else hexc('b9742f')
                if abs(x-cx)>half-1: col=hexc('7a4a22')
            elif door=='dark': col=hexc('1d130d')
            elif door=='cold': col=hexc('15110e')
            else: col=CANS
            px(d,x,y,col)
    im.save(OUT+name+'.png')
tent('tent-blue',hexc('73807c'),'dark')
tent('tent-blue-warm',hexc('73807c'),'warm')
tent('tent-ochre',hexc('b0925a'),'dark')
tent('tent-ochre-warm',hexc('b0925a'),'warm')
tent('tent-sage',hexc('7f9468'),'dark')
tent('tent-sage-warm',hexc('7f9468'),'warm')
tent('tent-rust',hexc('a36a4e'),'dark')
tent('tent-rust-warm',hexc('a36a4e'),'warm')
tent('tent-cold',hexc('73807c'),'cold')
tent('tent-closed',hexc('73807c'),'closed')

# half pitched: two poles, canvas draped on left only
def halftent():
    w,h=34,25; im,d=new(w,h); cx=w//2
    # poles
    for y in range(2,h-2): px(d,cx-9,y,WOOD) ; px(d,cx+9,y,WOOD)
    for y in range(1,h-2): pass
    for x in range(cx-9,cx+10): px(d,x,2,WOODL) if x%2==0 else px(d,x,2,WOOD)
    # canvas on left half sloping
    for y in range(3,h-3):
        t=(y-3)/(h-6)
        for x in range(cx-9, cx-9+int(2+t*9)):
            col=CAN if ((x)//3)%2 else hexc('73807c'); px(d,x,y,col)
        px(d,cx-9+int(2+t*9),y,OL)
    # rope pegs
    px(d,cx+14,h-3,WOODL); px(d,cx+14,h-4,WOODL); px(d,cx-14,h-3,WOODL);px(d,cx-14,h-4,WOODL)
    for x in range(cx-13,cx-8): px(d,x,h-5,hexc('c8b27a'))
    for x in range(cx+9,cx+14): px(d,x,h-5,hexc('c8b27a'))
    im.save(OUT+'tent-half.png')
halftent()

# packed camp: bundle + pole with pennant
def packed():
    w,h=34,30; im,d=new(w,h)
    # bundle roll
    for y in range(h-9,h-2):
        for x in range(6,26):
            col=CAN if y<h-6 else CANS
            if (x//4)%2==0 and y<h-6: col=hexc('73807c')
            px(d,x,y,col)
    for x in range(6,26): px(d,x,h-10,OL); px(d,x,h-2,OL)
    for y in range(h-9,h-2): px(d,5,y,OL); px(d,26,y,OL)
    for x in (10,16,22):
        for y in range(h-9,h-2): px(d,x,y,hexc('c8b27a'))
    # pack bag
    for y in range(h-14,h-9):
        for x in range(11,20): px(d,x,y,hexc('8a6a3a'))
    for x in range(11,20): px(d,x,h-15,OL)
    for y in range(h-14,h-9): px(d,10,y,OL);px(d,20,y,OL)
    # pole
    for y in range(1,h-2): px(d,29,y,WOOD)
    px(d,29,0,WOODL)
    # pennant
    for i,y in enumerate(range(2,8)):
        for x in range(30,30+11-i*2 if i<5 else 31): px(d,x,y,hexc('9bd28a'))
    for x in range(30,40): px(d,x,1,OL)
    im.save(OUT+'packed.png')
packed()

# swept spot: cairn + raked arcs (ground texture)
def swept():
    w,h=44,22; im,d=new(w,h)
    col=hexc('3a3a30',200); col2=hexc('4a4a3c',180)
    for i,y in enumerate((8,11,14,17)):
        for x in range(4,40):
            off=int(2*((x/6)%2<1))
            if (x+i)%3!=0: px(d,x,y+off%2,col if i%2 else col2)
    # cairn
    st=hexc('8a8478'); sd=hexc('6a6458'); sl=hexc('a39d8f')
    def stone(x,y,w_,h_):
        d.rectangle((x,y,x+w_-1,y+h_-1),fill=st)
        d.line((x,y,x+w_-1,y),fill=sl); d.line((x,y+h_-1,x+w_-1,y+h_-1),fill=sd)
        d.rectangle((x-1,y,x-1,y+h_-1),fill=OL);d.rectangle((x+w_,y,x+w_,y+h_-1),fill=OL)
        d.line((x,y-1,x+w_-1,y-1),fill=OL); d.line((x,y+h_,x+w_-1,y+h_),fill=OL)
    stone(17,13,12,5); stone(19,9,8,4); stone(21,6,4,3)
    im.save(OUT+'swept.png')
swept()

# small fire bed: stone ring and logs. variants: lit(no flame; flame added separately), cold, embers
def firebed(name,mode):
    w,h=22,12; im,d=new(w,h)
    st=hexc('8a8478'); sd=hexc('6a6458'); sl=hexc('a39d8f')
    if mode=='cold': st=hexc('6c685e'); sd=hexc('4f4c44'); sl=hexc('827d72')
    pts=[(2,6),(5,8),(9,9),(13,9),(17,8),(19,6),(18,3),(14,2),(10,1),(6,2),(3,3)]
    for (x,y) in pts:
        d.rectangle((x-1,y-1,x+2,y+1),fill=st)
        d.line((x-1,y-1,x+2,y-1),fill=sl); d.line((x-1,y+1,x+2,y+1),fill=sd)
        d.line((x-2,y-1,x-2,y+1),fill=OL);d.line((x+3,y-1,x+3,y+1),fill=OL)
        d.line((x-1,y-2,x+2,y-2),fill=OL); d.line((x-1,y+2,x+2,y+2),fill=OL)
    # inner ash/ground
    d.ellipse((5,3,16,8),fill=hexc('1b1410') if mode!='lit' else hexc('2a1a0e'))
    lg=hexc('5a3a1c') if mode!='cold' else hexc('2a2622')
    lg2=hexc('7a552c') if mode!='cold' else hexc('3a3530')
    d.line((6,7,15,4),fill=lg2); d.line((6,6,15,5),fill=lg)
    d.line((6,4,15,7),fill=lg2); d.line((6,5,15,6),fill=lg)
    if mode=='embers':
        for p in ((8,6),(11,5),(13,6),(10,6),(9,4)): px(d,*p,hexc('d4442a'))
        for p in ((11,6),(12,5)): px(d,*p,hexc('ff7a3a'))
    if mode=='lit':
        for p in ((9,6),(12,6),(11,5),(10,7)): px(d,*p,hexc('ffb44a'))
    im.save(OUT+name+'.png')
firebed('bed-lit','lit'); firebed('bed-cold','cold'); firebed('bed-embers','embers')

# bedroll
def bedroll():
    w,h=22,9; im,d=new(w,h)
    for y in range(1,h-1):
        for x in range(1,w-1):
            col=hexc('6c5a46'); 
            if x<6: col=hexc('8a7058')
            px(d,x,y,col)
    for x in range(0,w): px(d,x,0,OL); px(d,x,h-1,OL)
    for y in range(0,h): px(d,0,y,OL); px(d,w-1,y,OL)
    for y in range(1,h-1): px(d,6,y,hexc('483a2c'))
    for x in range(7,w-1): px(d,x,3,hexc('5a4a3a'))
    im.save(OUT+'bedroll.png')
bedroll()

# staff with lantern (for needs-you): pole 3x44 + hook
def staff(name,glass):
    w,h=13,50; im,d=new(w,h)
    for y in range(18,h): px(d,6,y,WOOD); px(d,7,y,WOODL)
    # arm
    for x in range(6,11): px(d,x,17,WOOD)
    px(d,10,17,WOODL)
    im.save(OUT+name+'.png')
staff('staff','')

# ghost ring of stones (for another ticket)
def ghost():
    w,h=40,22; im,d=new(w,h); c=hexc('8a8478',150)
    import math
    for i in range(16):
        a=i/16*2*math.pi; x=int(20+17*math.cos(a)); y=int(11+8*math.sin(a))
        d.rectangle((x-1,y,x,y),fill=c)
        px(d,x,y-1,hexc('a39d8f',150))
    im.save(OUT+'ghost.png')
ghost()
# pebbles (plan progress) 5x4 
def peb(name,col,lit):
    im,d=new(7,5)
    d.rectangle((1,1,5,3),fill=col); d.line((1,0,5,0),fill=OL if not lit else OL); d.line((1,4,5,4),fill=OL); d.line((0,1,0,3),fill=OL); d.line((6,1,6,3),fill=OL)
    px(d,2,1,tuple(min(255,c+40) for c in col[:3])+(255,))
    im.save(OUT+name+'.png')
peb('peb-done',hexc('9bd28a'),1); peb('peb-now',hexc('ff9a4a'),1); peb('peb-todo',hexc('6e6a5e'),0); peb('peb-bad',hexc('f08a72'),1)
# flask (failed test) cracked red
def flask(name,col):
    im,d=new(7,9)
    d.rectangle((3,0,4,2),fill=hexc('c9b89a')); d.polygon([(3,3),(4,3),(6,7),(5,8),(2,8),(1,7)],fill=col)
    d.line((3,3,4,3),fill=col)
    px(d,3,5,(30,10,10,255)); px(d,4,6,(30,10,10,255))
    d.line((2,8,5,8),fill=OL); px(d,1,7,OL);px(d,6,7,OL);px(d,2,3,OL);px(d,5,3,OL)
    im.save(OUT+name+'.png')
flask('flask-bad',hexc('d4442a'))
# paper note (comment)
def note():
    im,d=new(7,9); d.rectangle((0,0,6,8),fill=hexc('f0e2b8')); d.rectangle((0,0,6,8),outline=OL)
    for y in (2,4,6): d.line((1,y,5,y),fill=hexc('9a8660'))
    im.save(OUT+'note.png')
note()
# scroll (log)
def scroll():
    im,d=new(12,7); d.rectangle((1,1,10,5),fill=hexc('e8d9ac')); d.rectangle((0,0,11,6),outline=OL)
    d.line((2,3,9,3),fill=hexc('9a8660')); d.rectangle((0,0,1,6),fill=hexc('c9b27a')); d.rectangle((10,0,11,6),fill=hexc('c9b27a'))
    d.rectangle((0,0,11,6),outline=OL)
    im.save(OUT+'scroll.png')
scroll()
print(os.listdir(OUT)[:5])
