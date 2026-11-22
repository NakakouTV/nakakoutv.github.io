"""Build the entire workbench around the CRT, in the terminal's own coordinates.

First run bench_prints.py. Render with Blender -b -P art/workshop.py.
Use -- --proof for fast framing renders. The browser uses the same projections.
"""
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils import Matrix, Vector
from bpy_extras.object_utils import world_to_camera_view

sys.path.insert(0, str(Path(__file__).resolve().parent))
import machine as m
from machine import box, mesh, label, lead, wire, rgb, material

ROOT=m.ROOT
OUT=ROOT/"dist"/"workshop"
PROOF="--proof" in sys.argv
TAU=math.tau
scene=m.scene
m.ground.hide_render=True
scene.render.film_transparent=False
scene.world.node_tree.nodes["Background"].inputs[1].default_value=.54
paper=m.shell; metal=m.silver; slate=m.cool; dark=m.graphite; black=m.black
orange=m.orange; white=m.legend; cyan=m.cyan; ink=m.ink; amber=m.amber

def enamel(name, hex_color):
    mat=material(name,hex_color)
    nodes=mat.node_tree.nodes
    toon=nodes.new("ShaderNodeBsdfToon")
    toon.inputs["Color"].default_value=(*rgb(hex_color),1)
    toon.inputs["Size"].default_value=.55
    toon.inputs["Smooth"].default_value=.14
    mix=nodes.new("ShaderNodeMixShader");mix.inputs[0].default_value=.35
    links=mat.node_tree.links
    links.new(nodes["Principled BSDF"].outputs[0],mix.inputs[1])
    links.new(toon.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],nodes["Material Output"].inputs["Surface"])
    return mat

teal=enamel("Baked teal enamel","24666c")
wall=enamel("Panel indigo","424c6e")
rubber=enamel("Cutting mat rubber","29474e")
ochre=enamel("Ochre die casting","edab50")
vermilion=enamel("Red oxide insulation","c64524")
lightsteel=enamel("Instrument chassis","92a1b9")
brass=material("Machined bronze","e69c69",.36,.55)
mat_cache={}

def print_face(filename, vertices, luminous=0):
    key=(filename,luminous)
    if key not in mat_cache:
        mat=material(filename,"ffffff",.85)
        tree=mat.node_tree;tex=tree.nodes.new("ShaderNodeTexImage")
        tex.image=bpy.data.images.load(str(OUT/filename),check_existing=True)
        tex.interpolation="Closest"
        shader=tree.nodes["Principled BSDF"]
        tree.links.new(tex.outputs["Color"],shader.inputs["Base Color"])
        if luminous:
            tree.links.new(tex.outputs["Color"],shader.inputs["Emission Color"])
            shader.inputs["Emission Strength"].default_value=luminous
        mat_cache[key]=mat
    obj=mesh(filename,vertices,[(0,3,2,1)],mat_cache[key])
    uv=obj.data.uv_layers.new()
    coords=[(0,1),(1,1),(1,0),(0,0)]
    for loop in obj.data.loops:uv.data[loop.index].uv=coords[loop.vertex_index]
    return vertices

def rect(x,y,z,w,h):
    return [(x-w/2,y,z+h/2),(x+w/2,y,z+h/2),(x+w/2,y,z-h/2),(x-w/2,y,z-h/2)]

def rod(name,a,b,r,mat,n=16,r2=None):
    p,q=Vector(a),Vector(b);length=(q-p).length
    verts=[(math.cos(i*TAU/n)*radius,math.sin(i*TAU/n)*radius,z)
           for z,radius in [(0,r),(length,r if r2 is None else r2)] for i in range(n)]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)]
    obj=mesh(name,verts,faces,mat);obj.location=p;obj.rotation_euler=(q-p).to_track_quat("Z","Y").to_euler()
    return obj

def axial(x,y,z,r,depth,mat,name="Boss"):
    return rod(name,(x,y,z),(x,y-depth,z),r,mat,28)

def knob(x,y,z,r,mat):
    axial(x,y,z,r*1.17,.045,black)
    axial(x,y-.045,z,r,.13,mat,"Encoder")
    box("Index",(x,y-.18,z+r*.55),(.023,.01,r*.66),white)
    for i in range(9):
        a=(i+1)*TAU/11
        part=box("Scale tick",(x+r*1.45*math.sin(a),y-.007,z+r*1.45*math.cos(a)),(.012,.008,.035),ink)
        part.rotation_euler[1]=a

def cooling(x,y,z,w,count):
    for i in range(count):
        box("Intake louvre",(x-w/2+(i+.5)*w/count,y,z),(w/count*.48,.02,.2),black,.008)

def gear(x,y,z,r,teeth,mat,phase=0):
    """Annular toothed rim with actual openings between the spokes."""
    before=set(scene.objects)
    angles=[(tooth+f)*TAU/teeth+phase for tooth in range(teeth) for f in (.0,.19,.51,.76)]
    scale=[.86,1,1,.86]*teeth
    verts=[]
    for plane,inner in [(0,False),(-.16,False),(-.16,True),(0,True)]:
        for i,a in enumerate(angles):
            radius=r*(.65 if inner else scale[i])
            verts.append((x+radius*math.cos(a),y+plane,z+radius*math.sin(a)))
    n=len(angles)
    faces=[(k*n+i,k*n+(i+1)%n,(k+1)%4*n+(i+1)%n,(k+1)%4*n+i) for k in range(4) for i in range(n)]
    mesh("Cut spur rim",verts,faces,mat)
    for i in range(3):
        obj=box("Gear spoke",(x,y-.08,z),(r*1.42,.14,r*.14),mat,.02)
        obj.rotation_euler[1]=i*math.pi/3+phase
    axial(x,y+.02,z,r*.26,.22,mat)
    axial(x,y-.2,z,r*.12,.12,metal,"Steel arbor")
    pivot=bpy.data.objects.new("Gear axis",None)
    parts=set(scene.objects)-before
    scene.collection.objects.link(pivot)
    pivot.location=(x,y,z)
    for part in parts:
        part.parent=pivot
        part.matrix_parent_inverse=Matrix.Translation((-x,-y,-z))
    return pivot,teeth

# Worktop and the replaceable gridded cutting mat. Each instrument rests at z=0.
box("Bench top",(0,0,-.27),(25,9.8,.50),slate,.08)
box("Linoleum",(0,-.08,-.051),(23.9,9.50,.09),rubber,.035)
for i in range(-23,24):
    box("Mat grid X",(i*.5,-.04,-.002),(.009,9.30,.004),teal)
for i in range(-9,10):
    box("Mat grid Y",(0,i*.5,-.002),(23.8,.009,.004),teal)
for i in range(120):
    x=-11.9+i*.2;size=.14 if i%5==0 else .055
    box("Engraved rule",(x,-4.73+size/2,-.001),(.014,size,.004),lightsteel)
box("Bench nose",(0,-4.90,-.25),(25,.14,.34),dark,.03)
for x in (-9,-4.8,4.8,9):
    box("Underbench frame",(x,-2,-2.6),(.22,5,4.8),wall,.04)
for idx in range(3):
    z=-1.02-idx*1.19
    box("Parts cabinet",(0,-3.98,z),(8.9,1.52,1.12),dark,.04)
    for j in range(4):
        x=(j-1.5)*2.16
        box("Drawer front",(x,-4.77,z),(2.06,.09,.97),slate if j!=2 else teal,.034)
        box("Recessed pull",(x,-4.831,z+.13),(1.12,.04,.19),black,.034)
        box("Handle",(x,-4.87,z+.19),(.98,.09,.055),metal,.012)
        box("Paper label",(x-.18,-4.83,z-.20),(.78,.012,.19),paper,.006)
        label(("IC","AXLES","SWITCH","DISK")[j],(x-.49,-4.843,z-.20),.098,ink,face=m.mono)

# Wall, workshop window and a stiffened equipment rail.
box("Wall",(0,5.5,5),(31,.42,25),wall)
for i in range(-8,9):
    box("Panel seam",(i*1.8,5.25,5),(.023,.06,22),dark)
for z in (1.35,5.5,9.8,13.2):
    box("Extruded wall rail",(0,5.0,z),(27,.39,.16),dark,.025)
    box("Rail lip",(0,4.78,z+.05),(27,.037,.033),lightsteel)
box("Window recess",(.2,5.01,7.5),(9.1,.45,3.76),black,.045)
print_face("city.png",rect(.2,4.75,7.5,8.88,3.55),.67)
for x in (-4.3,-1.4,1.82,4.7):
    box("Sash",(x,4.63,7.50),(.09,.19,3.75),dark,.017)
box("Sill",(.2,4.57,5.65),(9.24,.6,.12),lightsteel,.02)
for i in range(3):
    box("Blind slat",(.2,4.49,9.28-i*.17),(9.1,.22,.066),slate,.016)
for i in range(5):
    y=4.55-i*.07;z=10.24+i*.085
    lead("Overhead loom",[(-14,y,z+.42),(-5.5,y,z-.15),(1.3,y,z+.07),(5.4,y,z-.18),(14,y,z+.55)],.045 if i%2 else .06,black if i!=2 else orange)
# Technical sheets have printed projections and paper clips, with physical depth.
for x,name,zc in [(-5.72,"mesh-study.png",5.93),(5.83,"cam-study.png",6.21)]:
    box("Backing board",(x,4.80,zc),(2.83,.12,3.67),dark,.045)
    print_face(name,rect(x,4.725,zc,2.72,3.54),.18)
    for edge in (-1,1):
        box("Paper clip",(x+edge*.94,4.70,zc+1.73),(.33,.08,.15),metal,.02)

# Left instrument stack: supply, dual-trace scope, patchbay and test leads.
sx=-6.05
for z,h,mat,caption in [(.60,1.10,lightsteel,"DC POWER SUPPLY"),(2.01,1.62,paper,"DUAL TRACE"),(3.17,.62,slate,"PATCH   /   AUDIO")]:
    box("Folded sheet enclosure",(sx,.42,z),(3.95,2.24,h),dark,.09)
    box("Enamel fascia",(sx,-.735,z),(3.82,.13,h-.065),mat,.045)
    label(caption,(sx-1.74,-.809,z+h*.365),.106,ink if mat!=slate else paper,face=m.mono)
    for ex in (-1.82,1.82):
        for ez in (-1,1):
            axial(sx+ex,-.807,z+ez*(h/2-.13),.042,.023,metal)
for i in range(2):
    x=sx-1.15+i*.96
    box("Meter bezel",(x,-.836,.62),(.85,.10,.52),black,.032)
    box("Printed dial",(x,-.893,.63),(.74,.014,.403),paper,.015)
    for j in range(9):
        a=math.radians(-52+13*j);r=.40
        wire("Dial graduation",[(x+math.sin(a)*r,-.909,.385+math.cos(a)*r),(x+math.sin(a)*(r-.055),-.909,.385+math.cos(a)*(r-.055))],.008,ink)
    a=math.radians(-20+i*42)
    wire("Meter needle",[(x,-.924,.44),(x+.34*math.sin(a),-.924,.44+.34*math.cos(a))],.012,vermilion)
    label("V" if not i else "A",(x+.22,-.924,.50),.10,ink)
for i in range(2):knob(sx+.61+i*.72,-.814,.65,.18,black)
box("CRT gasket",(sx-.64,-.853,1.98),(2.31,.20,1.22),black,.09)
scope_rect=print_face("graticule.png",rect(sx-.64,-.958,1.98,2.08,1.045),.9)
for i in range(2):
    for j in range(2):
        knob(sx+.80+i*.62,-.808,1.72+j*.53,.142,slate if j else orange)
for i in range(12):
    x=sx-1.6+i*.286
    axial(x,-.821,3.10,.084,.035,metal)
    axial(x,-.856,3.10,.052,.017,black)
for i in range(3):
    x=sx-1.59+i*.56;col=[orange,black,teal][i]
    axial(x,-.84,3.10,.062,.23,col)
    lead("Patch cord",[(x,-1.03,3.10),(x-.01,-1.17,2.97),(sx-2.05-i*.10,-1.27,2.3),(sx-2.06-i*.13,-1.36,.55),(sx-1.86+i*.2,-1.77,.08),(sx-1.1+i*.26,-1.68,.1)],.034,col)
# Loop antenna, a solder spool, diskettes and a point probe.
for i in range(3):
    x=-5.13+i*.065;y=-2.09+i*.095;z=.083+i*.117
    box("3.5 inch disk",(x,y,z),(1.39,1.40,.105),dark,.043)
    box("Disk shutter",(x+.12,y+.43,z+.060),(.76,.42,.016),metal,.008)
    box("Disk ID",(x,y-.22,z+.060),(1.08,.56,.012),paper,.01)
    label(("PEN","SLIME","SLIME  4")[i],(x-.47,y-.22,z+.070),.15,ink,top=True,face=m.mono)
for x,mcol in [(-7.33,orange),(-6.8,teal)]:
    rod("Probe grip",(x,-3.31,.09),(x+.26,-2.17,.09),.075,mcol,16,.053)
    rod("Probe tip",(x+.26,-2.17,.09),(x+.37,-1.72,.06),.036,metal,12,.009)
    lead("Probe cable",[(x,-3.31,.09),(x-.35,-3.83,.06),(x-.75,-3.5,.055),(x-.85,-2.8,.06)],.03,black)

# Right bench: exposed mechanical lock, bearing frame, rack and colour-coded cams.
gx=5.68
box("Mechanism plinth",(gx,-.55,.17),(2.92,1.75,.31),teal,.11)
for x in (gx-1.15,gx+1.15):
    box("Bearing cheek",(x,-.03,1.12),(.19,.3,1.96),lightsteel,.065)
    axial(x,-.21,1.83,.093,.04,brass)
box("Bearing crossbar",(gx,-.02,1.98),(2.60,.22,.19),teal,.035)
box("Arbor backplane",(gx,.36,1.08),(2.48,.12,1.55),dark,.035)
train=[gear(gx-.54,-.26,1.22,.76,17,ochre,.07),
       gear(gx+.53,-.26,1.15,.43,10,lightsteel,.11),
       gear(gx+.90,-.26,1.72,.35,9,orange,.26)]
for i in range(4):
    x=gx-1.04+i*.57
    box("Slider guide",(x,-1.17,.345),(.4,.74,.08),metal,.018)
    box("Latch thumb",(x,-1.26+i%2*.15,.42),(.25,.24,.10),orange if i==0 else dark,.025)
label("CAM LOCK",(gx-.92,-1.438,.185),.145,white,face=m.mono)

# Bin drawers behind the lock; a few components show through the open bins.
for ix in range(4):
    x=4.53+ix*.91
    for iz in range(3):
        z=1.05+iz*.61
        box("Parts bin",(x,2.66,z),(.86,1.16,.58),wall,.05)
        box("Bin lip",(x,2.06,z-.13),(.78,.12,.27),teal if (ix+iz)%4 else slate,.026)
        box("Bin recess",(x,2.09,z+.085),(.74,.038,.17),black,.014)
        box("Inventory slip",(x-.06,1.99,z-.15),(.43,.018,.135),paper,.006)
        label(["R","C","IC","M"][ix]+str(iz+1),(x-.23,1.973,z-.145),.098,ink,face=m.mono)
box("Bins shelf",(5.93,2.66,.65),(4.04,1.58,.13),slate,.028)
for x in (4.20,7.66):
    box("Rack foot",(x,2.65,.29),(.11,1.30,.59),dark,.02)

# Two-link task lamp with spring counterbalance, pivots and a shaded strip.
for x in (7.52,7.71):
    for a,b in [((x,2.2,0),(x,2.20,2.95)),((x,2.20,2.95),(x-1.28,1.30,4.50)),((x-1.28,1.30,4.50),(x-2.25,1.00,4.29))]:
        rod("Pantograph link",a,b,.065,teal)
for x,y,z in [(7.60,2.20,2.95),(6.32,1.30,4.5),(5.35,1,4.29)]:
    axial(x,y,z,.161,.23,ochre,"Lamp hinge")
points=[]
for i in range(145):
    t=i/144;a=TAU*t*16
    points.append((7.56-.91*t+.044*math.cos(a),2.04-.72*t+.046*math.sin(a),2.59+1.48*t))
wire("Tension spring",points,.015,metal)
box("Task light shade",(5.38,.82,4.20),(2.03,.83,.24),teal,.11)
box("Reflector",(5.38,.65,4.073),(1.77,.45,.032),m.amber,.015)

# Face-up board held in a tilted inspection stand.
def board(x,y,z,w,h):
    box("Solder mask",(x,y,z),(w,.095,h),teal,.06)
    print_face("pcb.png",rect(x,y-.052,z,w-.07,h-.05),.20)
    for i in range(3):
        cx=x-w*.29+i*w*.26
        box("DIP package",(cx,y-.14,z+.04),(.39,.15,.23),black,.025)
        for j in range(4):
            for sign in (-1,1):
                box("IC lead",(cx-.15+.10*j,y-.11,z+.04+sign*.156),(.032,.085,.09),metal)
    for i in range(11):
        axial(x-w*.40+i*w*.080,y-.055,z-h*.37,.035,.038,brass)
    for sign in (-1,1):
        axial(x+sign*w*.43,y-.055,z+h*.39,.05,.034,metal)
board(-5.85,2.5,4.18,2.82,1.29)
for x in (-7,-4.66):box("Inspection stand",(x,2.48,3.44),(.09,.30,1.23),slate,.015)

# Work in progress on the cutting mat: a second controller, Lego-like construction
# bricks with moulded studs, an exploded connector and a ratchet driver.
for i,(x,y,w,l,col) in enumerate([(4.16,-2.42,2,3,orange),(5.10,-2.85,2,2,teal),(5.92,-2.39,1,4,ochre),(4.7,-3.51,1,3,lightsteel)]):
    pitch=.205
    box("Construction brick",(x,y,.105),(w*pitch,l*pitch,.205),col,.024)
    for a in range(w):
        for b in range(l):
            cx=x+(a-(w-1)/2)*pitch;cy=y+(b-(l-1)/2)*pitch
            rod("Stud",(cx,cy,.20),(cx,cy,.26),.067,col)
rod("Insulated driver",(6.37,-3.64,.12),(6.77,-2.45,.12),.105,orange,8,.083)
rod("Driver shaft",(6.77,-2.45,.12),(7.09,-1.53,.075),.041,metal,12,.025)

# Upper shelf is visible in the tall view, like a different crop of the same room.
box("Reference shelf",(-.15,4.59,10.58),(11.4,1.48,.16),teal,.035)
for i,title in enumerate(["MESH","PEN","VIDEO","MATRIX","LOGIC","CAD","INPUT","OUTPUT","TOOLS","GEARS","CAM","DRIVE"]):
    x=-4.95+i*.42;h=1.12+(i%3)*.17
    box("Bound manual",(x,4.54,10.68+h/2),(.37,.91,h),[wall,teal,slate,dark,ochre][i%5],.024)
    box("Spine tape",(x,4.07,10.88),(.32,.015,.12),paper)
    tag=label(title,(x,4.062,11.08),.105,paper,face=m.mono);tag.rotation_euler[1]=-math.pi/2
board(2.48,4.22,11.45,2.87,1.32)
for x in (-8.6,8.8):
    for j in range(3):
        lead("Down conduit",[(x+j*.14,4.75,13),(x+j*.14,4.75,8),(x-.25+j*.14,4.70,7.65),(x-.25+j*.14,4.70,2)],.045,slate)
m.area("Cyan bench bounce",(-7,-3.4,6),(-5,1,2.2),420,4.2,"94fdff")
m.area("Rack amber key",(7.8,-3.6,6.8),(5.9,.6,1.4),500,3.6,"f6ca9f")
m.area("Shelf daylight",(-1,-2,12),(0,4.4,8),820,8.1,"c7cfdd")
m.area("Front of workbench",(0,-6,.3),(0,-4,-2.1),165,5.6,"92a1b9")
from bench_details import furnish
clock_rect=furnish(rod,axial,rect,enamel,teal,brass)

def render_camera(name,width,height,span,target):
    camera=m.camera
    offset=Vector((2.35,-25.35,6.10))
    camera.location=Vector(target)+offset
    camera.rotation_euler=(-offset).to_track_quat("-Z","Y").to_euler()
    camera.data.ortho_scale=span
    scene.render.resolution_x=width;scene.render.resolution_y=height
    scene.render.resolution_percentage=48 if PROOF else 100
    scene.render.image_settings.file_format="PNG";scene.render.image_settings.color_mode="RGB"
    scene.render.filepath=str(OUT/(name+("-proof" if PROOF else "")+".png"))
    bpy.context.view_layer.update()
    def project(points):
        projected=[world_to_camera_view(scene,camera,Vector(pt)) for pt in points]
        return [[round(p.x,8),round(1-p.y,8)] for p in projected]
    corners={"width":width,"height":height,"screen":project(m.screen_corners),
             "scope":project(scope_rect),"clock":project(clock_rect)}
    # All shots share a camera orientation. One small flipbook of the original
    # geometry can therefore serve all three compositions at the projected size.
    cx,cy=project([(gx,-.39,1.29)])[0]
    px=max(width,height)/span
    box_width,box_height=3.23*px/width,2.18*px/height
    corners["gears"]=[cx-box_width/2,cy-box_height/2,box_width,box_height]
    bpy.ops.render.render(write_still=True)
    return corners

scene.cycles.samples=3 if PROOF else 10
scene.cycles.max_bounces=3
scene.render.threads_mode="FIXED";scene.render.threads=8
# Orthographic scale is the longer image dimension, including in portrait.
shots=[("wide",1920,1080,17.6,(0,-.65,3.00)),
       ("square",1440,1440,15.8,(0,-.65,3.46)),
       ("tall",1000,1800,17.95,(0,-.65,3.83))]
cameras={name:render_camera(name,w,h,s,t) for name,w,h,s,t in shots}
if not PROOF:
    (m.OUTPUT/"bench-cameras.json").write_text(json.dumps(cameras,indent=2)+"\n",encoding="utf8")
    name,width,height,span,target=shots[0]
    m.camera.location=Vector(target)+Vector((2.35,-25.35,6.10))
    m.camera.data.ortho_scale=span
    scene.render.resolution_x=width;scene.render.resolution_y=height
    x,y,w,h=cameras[name]["gears"]
    scene.render.use_border=True;scene.render.use_crop_to_border=True
    scene.render.border_min_x=x;scene.render.border_max_x=x+w
    scene.render.border_min_y=1-y-h;scene.render.border_max_y=1-y
    scene.render.use_persistent_data=True
    for frame in range(15):
        for index,(pivot,teeth) in enumerate(train):
            pivot.rotation_euler.y=math.radians(36)*frame/14*17/teeth*(-1 if index==1 else 1)
        scene.render.filepath=str(OUT/f"gear-{frame:02d}.png")
        bpy.ops.render.render(write_still=True)
