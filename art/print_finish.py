"""Ink the Cycles plates at game resolution, using a constrained ENDESGA 64 ramp."""
from pathlib import Path
from functools import cache
import json
import sys
import numpy as np
from PIL import Image, ImageFilter

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"dist"/"workshop"
NAMES={"wide":"workshop","square":"workshop-square","tall":"workshop-portrait"}
# Neighboring ink mixtures keep small engraved details legible between solid bands.
RAMPS=[
    "0e071b 1a1932 2a2f4e 424c6e 657392 92a1b9 c7cfdd f9e6cf",
    "0e071b 0c2e44 134c4c 657392 92a1b9 94fdff",
    "1c121c 391f21 5d2c28 8a4836 bf6f4a e69c69 f6ca9f f9e6cf",
    "1a1932 00396d 0069aa 0098dc 00cdf9 94fdff",
    "391f21 8a4836 c64524 e07438 edab50 f6ca9f",
]
def inks():
    pigments=[]
    for row in RAMPS:
        ramp=np.array([tuple(bytes.fromhex(v)) for v in row.split()],dtype=np.float32)
        pigments.extend(ramp)
        pigments.extend((ramp[1:]+ramp[:-1])/2)
    return np.unique(np.array(pigments,dtype='float32'),axis=0)

@cache
def color_lut():
    palette=inks()
    axis=np.linspace(0,255,32,dtype='float32')
    cube=np.stack(np.meshgrid(axis,axis,axis,indexing="ij"),-1).reshape(-1,1,3)
    dist=np.sum((cube-palette)**2*np.array([.85,1.25,1.06]),axis=2)
    return palette[np.argmin(dist,axis=1)].reshape(32,32,32,3)

def shade(im, origin=(0,0)):
    pixels=np.asarray(im,dtype=np.float32)
    lum=pixels@np.array([.24,.61,.15],dtype=np.float32)
    smooth=np.asarray(Image.fromarray(lum.clip(0,255).astype("uint8")).filter(ImageFilter.GaussianBlur(1.1)),dtype=np.float32)
    # Keep the line on the darker side of each edge, leaving bright key legends intact.
    relief=np.maximum(0,smooth-lum-2.5)
    pixels-=np.minimum(relief*.97,28)[:,:,None]
    pixels=(pixels-112)*1.13+107
    yy,xx=np.indices(lum.shape)
    bayer=np.array([[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]])
    pixels+=((bayer[(yy+origin[1])%4,(xx+origin[0])%4]-7.5)*.64)[:,:,None]
    # Quantise through a 32-cube LUT rather than comparing the full plate with every ink.
    ri,gi,bi=np.moveaxis(np.rint(pixels.clip(0,255)*31/255).astype(np.int32),2,0)
    ink=color_lut()[ri,gi,bi]
    # Fine engravings retain their local contrast; large planes read as flat ink.
    out=(ink*.87+pixels*.13).clip(0,255).astype(np.uint8)
    return Image.fromarray(out)

def finish(name,proof):
    source=OUT/(name+("-proof" if proof else "")+".png")
    im=Image.open(source).convert("RGB")
    if not proof:
        im=im.resize(tuple(round(v*.80) for v in im.size),Image.Resampling.LANCZOS)
    img=shade(im)
    if proof:img.save(OUT/(name+"-ink-proof.png"))
    else:img.save(ROOT/"assets"/(NAMES[name]+".webp"),quality=96,method=6)

def gear_atlas():
    cam=json.loads((ROOT/"assets"/"bench-cameras.json").read_text())["wide"]
    x,y,w,h=cam["gears"]
    origin=(round(x*cam["width"]*.8),round(y*cam["height"]*.8))
    width,height=round(w*cam["width"]*.8),round(h*cam["height"]*.8)
    sheet=Image.new("RGBA",(width*5,height*3))
    yy,xx=np.indices((height,width))
    margin=np.minimum.reduce([xx,width-xx-1,yy,height-yy-1])
    mask=Image.fromarray((255*np.clip(margin/7,0,1)).astype("uint8"))
    for frame in range(15):
        im=Image.open(OUT/f"gear-{frame:02d}.png").convert("RGB")
        im=shade(im.resize((width,height),Image.Resampling.LANCZOS),origin)
        im.putalpha(mask)
        sheet.paste(im,((frame%5)*width,(frame//5)*height))
    sheet.save(ROOT/"assets"/"cam-drive.webp",quality=93,method=6)

if __name__=="__main__":
    proof="--proof" in sys.argv
    for key in NAMES:finish(key,proof)
    if not proof:gear_atlas()
