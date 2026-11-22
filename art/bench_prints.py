"""Draw the paper, graticule and board artwork used as physical 3D surfaces."""
from pathlib import Path
import math
import random
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "dist" / "workshop"
OUT.mkdir(parents=True, exist_ok=True)
INK, PAPER, BLUE, ORANGE = "#1a1932", "#c7cfdd", "#424c6e", "#e07438"
TEAL, CYAN, GOLD = "#134c4c", "#94fdff", "#f6ca9f"

def font(size):
    for face in ("C:/Windows/Fonts/consolab.ttf", "DejaVuSansMono.ttf"):
        try:
            return ImageFont.truetype(face, size)
        except OSError:
            pass
    return ImageFont.load_default(size=size)

def type_at(d, xy, value, size, color):
    d.text(xy, value, font=font(size), fill=color, stroke_width=0)

def ruled(d, box, step, color):
    x,y,r,b=box
    for i in range(x,r,step):
        d.line((i,y,i,b),fill=color)
    for j in range(y,b,step):
        d.line((x,j,r,j),fill=color)

def sheet(name, wheel):
    im=Image.new("RGB",(600,780),PAPER if not wheel else "#e69c69")
    d=ImageDraw.Draw(im)
    d.rectangle((20,20,579,759),outline=INK,width=3)
    d.line((20,134,579,134),fill=INK,width=4)
    type_at(d,(38,34),"CAM / DRIVE" if wheel else "PEN / MESH",55,INK)
    type_at(d,(40,100),"KINEMATIC STUDY" if wheel else "ORTHOGRAPHIC PROJECTION",18,INK)
    ruled(d,(40,158,560,630),26,"#c58760" if wheel else "#abb9c8")
    if wheel:
        for cx,cy,radius in [(288,323,130),(323,480,90)]:
            pts=[]
            for tooth in range(24):
                for off,k in [(0,.86),(.2,1),(.55,1),(.75,.86)]:
                    a=math.tau*(tooth+off)/24
                    pts.append((cx+radius*k*math.cos(a),cy+radius*k*math.sin(a)))
            d.polygon(pts,fill="#edab50",outline=INK,width=4)
            for r in [.72,.38,.17]:
                n=radius*r;d.ellipse((cx-n,cy-n,cx+n,cy+n),outline=INK,width=3)
            for i in range(6):
                a=i*math.pi/3
                x=cx+radius*.54*math.cos(a);y=cy+radius*.54*math.sin(a)
                d.ellipse((x-10,y-10,x+10,y+10),fill=INK)
            d.line((cx-radius-26,cy,cx+radius+26,cy),fill=BLUE)
            d.line((cx,cy-radius-28,cx,cy+radius+28),fill=BLUE)
    else:
        for row,(cx,cy,w,h) in enumerate([(285,309,133,60),(285,421,133,41),(285,509,133,18)]):
            top=[(cx,cy-w*.5),(cx+w,cy),(cx,cy+w*.5),(cx-w,cy)]
            for i,fill in [(2,"#92a1b9"),(1,BLUE)]:
                a,b=top[i],top[(i+1)%4]
                d.polygon([a,b,(b[0],b[1]+h),(a[0],a[1]+h)],fill=fill,outline=INK,width=3)
            d.polygon(top,fill=PAPER if row else ORANGE,outline=INK,width=4)
            d.line((cx-w,cy,cx+w,cy),fill=INK,width=1)
        for x in (152,285,418):
            for y in range(325,556,13):
                d.line((x,y,x,y+6),fill=BLUE)
        d.ellipse((251,161,319,229),fill=BLUE,outline=INK,width=4)
        d.ellipse((279,180,303,207),fill=PAPER);d.ellipse((289,189,300,201),fill=INK)
    for x,y,n in [(53,259,"A"),(483,469,"B")]:
        d.line((x,y,x+37,y,x+66,y+31),fill=INK,width=2);type_at(d,(x,y-30),n,20,INK)
    d.line((20,658,579,658),fill=INK,width=3)
    type_at(d,(38,675),"INDEXING MECHANISM" if wheel else "BLOCK ASSEMBLY",23,INK)
    type_at(d,(38,720),"SECTION A-A" if wheel else "EXPLODED VIEW",14,BLUE)
    im.save(OUT/name)

def circuit():
    im=Image.new("RGB",(720,400),TEAL);d=ImageDraw.Draw(im)
    for flip in (0,1):
        for i in range(21):
            x=64+i*29;y=24 if flip==0 else 376;sign=1 if flip==0 else -1
            depth=26+(i%6)*10
            target=x+(-1 if i%2 else 1)*(12+i%4*5)
            d.line([(x,y),(x,y+depth*sign),(target,y+(depth+abs(x-target))*sign),(target,185 if not flip else 225)],fill="#547e77",width=3)
            d.ellipse((x-5,y-5,x+5,y+5),fill=GOLD);d.ellipse((x-2,y-2,x+2,y+2),fill=INK)
    for i in range(7):
        x=70+i*85;d.rectangle((x,126,x+58,180),outline=PAPER,width=2)
        type_at(d,(x,105),"U"+str(i+1),14,PAPER)
    type_at(d,(32,306),"PEN / VIDEO   REV. B",20,PAPER)
    im.save(OUT/"pcb.png")

def scope():
    im=Image.new("RGB",(520,370),"#0c2e44");d=ImageDraw.Draw(im)
    ruled(d,(12,13,510,359),49,"#296063")
    d.line((11,184,510,184),fill="#4f9994",width=2)
    d.line((260,12,260,358),fill="#4f9994",width=2)
    for x in range(12,509,10):d.line((x,181,x,187),fill=CYAN)
    type_at(d,(20,20),"CH 1",18,CYAN)
    im.save(OUT/"graticule.png")

def city():
    rng=random.Random(1904)
    im=Image.new("RGB",(900,408));d=ImageDraw.Draw(im)
    for y in range(408):
        tone=["#1a1932","#2a2f4e","#424c6e","#657392"][min(3,y//104)]
        d.line((0,y,900,y),fill=tone)
    d.ellipse((617,67,676,126),fill=GOLD)
    for y in range(75,126,7):d.line((615,y,682,y),fill="#424c6e",width=2)
    for _ in range(90):
        x,y=rng.randrange(900),rng.randrange(125);d.point((x,y),fill=PAPER)
    for depth,(low,high,base,lights) in enumerate([(120,210,BLUE,"#657392"),(180,285,"#2a2f4e","#92a1b9"),(253,370,INK,GOLD)]):
        x=-17
        while x<900:
            w=rng.randrange(27,76);y=rng.randrange(low,high)
            d.rectangle((x,y,x+w,408),fill=base)
            d.rectangle((x+w*.2,y-9,x+w*.64,y),fill=base)
            if rng.random()<.4:d.line((x+w//2,y,x+w//2,y-rng.randrange(17,46)),fill=base,width=2)
            for wy in range(y+8,408,12):
                for wx in range(x+5,x+w-4,8):
                    if rng.random()<.24:d.rectangle((wx,wy,wx+3,wy+2),fill=lights)
            x+=w+2
    im.save(OUT/"city.png")

if __name__=="__main__":
    sheet("mesh-study.png",False);sheet("cam-study.png",True);circuit();scope();city()
