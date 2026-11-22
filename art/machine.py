"""Render the physical terminal and export its screen projection with Blender 5.

Run from any directory: blender -b --factory-startup -P art/machine.py
For a fast framing proof use -- --preview (writes to the system temp directory).
Form references: DEC VT220 owner's manual, cover and LK201 drawings
https://www.computinghistory.org.uk/det/70526/Digital-VT220/
Colour reference: https://lospec.com/palette-list/endesga-64
"""
import json
import math
import sys
import tempfile
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
PREVIEW = "--preview" in sys.argv
OUTPUT = Path(tempfile.gettempdir()) if PREVIEW else ROOT / "assets"
OUTPUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def rgb(value):
    def linear(v):
        return v / 12.92 if v < .04045 else ((v + .055) / 1.055) ** 2.4
    return tuple(linear(int(value[i:i + 2], 16) / 255) for i in (0, 2, 4))


def material(name, hex_color, rough=.45, metal=0, grain=False, glow=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb(hex_color), 1)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    shader = nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = mat.diffuse_color
    shader.inputs["Roughness"].default_value = rough
    shader.inputs["Metallic"].default_value = metal
    if glow:
        shader.inputs["Emission Color"].default_value = mat.diffuse_color
        shader.inputs["Emission Strength"].default_value = glow
    if grain:
        # Same grain size on each moulding, irrespective of bounding box.
        texture = nodes.new("ShaderNodeTexNoise")
        texture.inputs["Scale"].default_value = 240
        texture.inputs["Detail"].default_value = 1.6
        coords = nodes.new("ShaderNodeTexCoord")
        mat.node_tree.links.new(coords.outputs["Object"], texture.inputs[0])
        bump = nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = .105
        bump.inputs["Distance"].default_value = .004
        mat.node_tree.links.new(texture.outputs["Fac"], bump.inputs["Height"])
        mat.node_tree.links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    return mat


shell = material("Warm injection-moulded ABS", "f9e6cf", .42, grain=True)
cool = material("Underside / enamel", "657392", .43, grain=True)
silver = material("Clear anodised aluminium", "c7cfdd", .32, .58)
graphite = material("Graphite ABS", "2a2f4e", .39, grain=True)
ink = material("Screenprinted graphite", "272727", .5)
black = material("Recess and rubber", "131313", .64)
glass = material("Smoked screen glass", "0c2e44", .25)
orange = material("Vermilion controls", "e07438", .33, grain=True)
cyan = material("Green phosphor indicator", "94fdff", .2, glow=2.5)
amber = material("Disk light", "ffa214", .25, glow=2)
legend = material("Light legends", "f9e6cf", .53)
keymat = material("Alphanumeric keys", "c7cfdd", .40, grain=True)
hairline = material("Shaded mould seam", "424c6e", .48)


def mesh(name, verts, faces, mat, smooth=False):
    geo = bpy.data.meshes.new(name)
    geo.from_pydata(verts, [], faces)
    geo.update()
    obj = bpy.data.objects.new(name, geo)
    scene.collection.objects.link(obj)
    geo.materials.append(mat)
    for poly in geo.polygons:
        poly.use_smooth = smooth
    return obj


def finish(obj, bevel):
    if bevel > 0:
        mod = obj.modifiers.new("Manufactured edge", "BEVEL")
        mod.width = bevel
        mod.segments = 3
        mod.harden_normals = True
        weight = obj.modifiers.new("Face normals", "WEIGHTED_NORMAL")
        weight.keep_sharp = True
    return obj


def box(name, loc, size, mat, bevel=0):
    x, y, z = (v / 2 for v in size)
    verts = [(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),
             (-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
    faces = [(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    obj = mesh(name, verts, faces, mat)
    obj.location = loc
    return finish(obj, bevel)


def round_points(w, h, r, steps=8):
    corners = ((w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),
               (-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270))
    return [(x+r*math.cos(math.radians(start+t*90/steps)),
             z+r*math.sin(math.radians(start+t*90/steps)))
            for x,z,start in corners for t in range(steps+1)]


def casing(name, layers, mat):
    """Sweep true mould profiles from the rear out to the screen aperture."""
    loops = [[(x, y, z + height) for x, height in round_points(w,h,r)]
             for y,w,h,r,z in layers]
    count = len(loops[0])
    faces = [(i*count+j,i*count+(j+1)%count,(i+1)*count+(j+1)%count,(i+1)*count+j)
             for i in range(len(loops)-1) for j in range(count)]
    return mesh(name, [p for loop in loops for p in loop], faces, mat, smooth=True)


font_file = Path("C:/Windows/Fonts/bahnschrift.ttf")
font = bpy.data.fonts.load(str(font_file)) if font_file.exists() else bpy.data.fonts[0] if len(bpy.data.fonts) else None
mono_file = Path("C:/Windows/Fonts/consolab.ttf")
mono = bpy.data.fonts.load(str(mono_file)) if mono_file.exists() else font


def label(body, loc, size, mat=ink, align="LEFT", top=False, face=None):
    data = bpy.data.curves.new("Print " + body, "FONT")
    data.body = body
    data.size = size
    data.align_x = align
    data.align_y = "CENTER"
    if face or font:
        data.font = face or font
    obj = bpy.data.objects.new("Print " + body, data)
    scene.collection.objects.link(obj)
    data.materials.append(mat)
    obj.location = loc
    if not top:
        obj.rotation_euler[0] = math.pi/2
    return obj


def wire(name, points, radius, mat):
    geo = bpy.data.curves.new(name, "CURVE")
    geo.dimensions = "3D"
    geo.bevel_depth = radius
    geo.bevel_resolution = 4
    spline = geo.splines.new("POLY")
    spline.points.add(len(points)-1)
    for v,p in zip(spline.points, points):
        v.co = (*p,1)
    obj = bpy.data.objects.new(name, geo)
    scene.collection.objects.link(obj)
    geo.materials.append(mat)
    return obj


def lead(name, anchors, radius, mat):
    geo = bpy.data.curves.new(name, "CURVE")
    geo.dimensions = "3D"
    geo.resolution_u = 16
    geo.bevel_depth = radius
    geo.bevel_resolution = 4
    spline = geo.splines.new("BEZIER")
    spline.bezier_points.add(len(anchors)-1)
    for p,co in zip(spline.bezier_points,anchors):
        p.co = co
        p.handle_left_type = p.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, geo)
    scene.collection.objects.link(obj)
    geo.materials.append(mat)
    return obj


def disc(name, loc, radius, depth, mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=36, radius=radius, depth=depth,
                                        location=loc, rotation=(math.pi/2,0,0))
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return finish(obj, min(radius/5,depth/4))


def screw(x,y,z):
    disc("Recessed fastener", (x,y,z), .042, .018, silver)
    for angle in (0,math.pi/2):
        slot = box("Pozidriv", (x,y-.011,z), (.045,.006,.008), black)
        slot.rotation_euler[1] = angle+.21


# Rear bucket and front moulding have a real seam and taper. The lower edge
# has a larger chin for the controls; the glass sits inside a nested gasket.
outer = 3.79
casing("Rear CRT bucket", [
    (2.65,5.64,3.73,.41,3.83),(2.54,5.95,3.92,.46,3.83),
    (1.00,7.52,4.76,.37,outer),(.18,7.72,4.92,.33,outer),
    (.12,7.71,4.91,.32,outer)], shell)
casing("Chassis joint", [(.119,7.69,4.89,.32,outer),(.084,7.69,4.89,.32,outer)], graphite)
casing("Front CRT crown", [
    (.083,7.72,4.92,.33,outer),(-.37,7.76,4.94,.32,outer),
    (-.68,7.75,4.93,.32,outer),(-.81,7.68,4.85,.30,outer),
    (-.89,7.53,4.72,.29,outer),(-.92,7.34,4.57,.255,outer),
    (-.921,7.19,4.24,.23,3.91),(-.904,7.145,4.188,.221,3.91),
    (-.833,7.087,4.13,.211,3.91)], shell)
casing("Dark bevel at the glass", [
    (-.834,7.093,4.135,.21,3.91),(-.797,7.062,4.114,.206,3.91),
    (-.701,6.990,4.052,.197,3.91),(-.693,6.972,4.034,.19,3.91)], graphite)
screen_y = -.684
screen_w, screen_h, screen_z = 6.964,4.03,3.91
screen = box("Phosphor glass", (0,screen_y+.031,screen_z), (7.05,.062,4.13), glass, .028)
screen_corners = [(x,screen_y,z) for x,z in [
    (-screen_w/2,screen_z+screen_h/2),(screen_w/2,screen_z+screen_h/2),
    (screen_w/2,screen_z-screen_h/2),(-screen_w/2,screen_z-screen_h/2)]]
# Ventilation across the rear shoulder and physically modelled right grille.
for i in range(28):
    x=-3.16+i*.227
    box("Crown cooling louvre", (x,.32,6.244), (.083,.65,.025), hairline,.010)
for i in range(15):
    y=-.28+i*.125
    outer_x=3.85-max(y-.18,0)*.17
    for z in (3.35,3.7,4.05,4.4):
        box("Side exhaust", (outer_x,y,z), (.035,.063,.28), hairline,.016)
# Silkscreen on the flat portion of the chin.
label("N K T", (-3.30,-.924,1.67), .208, ink)
box("Wordmark index",(-3.39,-.929,1.67),(.045,.014,.15),orange,.006)
label("POLYGRAPH", (-2.56,-.924,1.70), .096, ink, face=mono)
label("COLOUR DISPLAY", (-2.56,-.924,1.60), .052, ink, face=mono)
for x in (2.15,2.47):
    disc("Encoder socket",(x,-.922,1.667),.095,.021,graphite)
    disc("Knurled adjustment",(x,-.948,1.667),.069,.045,silver)
    box("Knob witness", (x,-.974,1.69),(.009,.009,.048),ink,.002)
for i in range(3):
    box("Tactile slit",(2.77+i*.155,-.930,1.675),(.117,.015,.072),hairline,.012)
    box("Tactile key",(2.77+i*.155,-.942,1.680),(.096,.020,.055),orange if i==2 else shell,.009)
disc("Power indicator", (3.36,-.926,1.675),.030,.014,cyan)
box("Tilt foot bottom",(0,.40,1.01),(4.6,2.00,.18),graphite,.085)
box("Pivot",(0,.44,1.23),(3.65,1.65,.43),cool,.16)

# Separate horizontal drive chassis.
for x in (-2.75,2.75):
    for y in (-.42,1.5):
        box("Rubber foot",(x,y,.12),(.56,.50,.23),black,.068)
box("Lower drive casing",(0,.48,.358),(7.02,3.10,.36),cool,.105)
box("Drive shell split",(0,.47,.515),(7.08,3.15,.073),graphite,.028)
box("Drive shell",(0,.46,.68),(7.13,3.20,.44),shell,.12)
box("Front equipment fascia",(0,-1.115,.55),(6.89,.145,.581),shell,.06)
face_y=-1.195
box("Floppy drive frame",(1.9,face_y,.559),(2.35,.082,.422),graphite,.042)
box("Disk mouth",(1.90,face_y-.047,.612),(2.08,.021,.106),black,.021)
box("Disk dust shutter",(1.9,face_y-.058,.590),(1.94,.012,.018),hairline,.004)
box("Disk eject plate",(2.75,face_y-.055,.437),(.39,.017,.107),black,.011)
box("Disk eject",(2.75,face_y-.080,.44),(.315,.049,.077),orange,.013)
box("Drive access",(1.05,face_y-.055,.44),(.10,.011,.024),amber,.005)
label("FD", (1.22,face_y-.050,.442), .061,legend,face=mono)
for i in range(12):
    x=-3.15+i*.117
    box("Intake slit",(x,face_y+.001,.57),(.054,.02,.236),hairline,.018)
box("Machine ID plate",(-.74,face_y,.56),(1.74,.035,.273),graphite,.013)
label("NKT",(-1.505,face_y-.023,.56),.187,legend)
label("MEDIA PROCESSOR",(-1.02,face_y-.023,.590),.070,legend,face=mono)
label("MP / 16",(-1.02,face_y-.023,.497),.072,legend,face=mono)
for x in (-3.3,3.27):
    screw(x,face_y-.004,.58)

# Keyboard is a separate assembly. All wells, caps and legends rotate with it.
keyboard = bpy.data.objects.new("Keyboard assembly",None)
scene.collection.objects.link(keyboard)
keyboard.location=(-.18,-2.54,.205)
keyboard.rotation_euler=(math.radians(6),0,math.radians(-3.4))
def keypart(obj):
    obj.parent=keyboard
    return obj

keypart(box("Keyboard rubber plinth",(0,0,-.075),(6.51,1.82,.20),graphite,.087))
keypart(box("Keyboard upper shell",(0,0,.020),(6.63,1.91,.286),shell,.098))
keypart(box("Keyboard well",(-.27,.043,.158),(5.68,1.52,.080),hairline,.070))
keypart(box("Direction well",(2.80,.033,.159),(.65,1.48,.071),hairline,.058))
def cap(name,x,y,w,d,mat,words=None,light=False):
    layers=[(.171,w,d,.038),(.199,w,d,.040),(.294,w-.056,d-.051,.034),
            (.308,w-.081,d-.074,.029)]
    loops=[[(x+px,y+py,z) for px,py in round_points(width,height,r,3)]
           for z,width,height,r in layers]
    n=len(loops[0])
    faces=[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(3) for j in range(n)]
    faces += [tuple(range(3*n,4*n))]
    obj=keypart(mesh("Key "+name,[p for loop in loops for p in loop],faces,mat))
    if words:
        keypart(label(words,(x,y,.311),.085 if len(words)<=2 else .064,
                      legend if light else ink,"CENTER",True,mono))

rows=[
    (["ESC","1","2","3","4","5","6","7","8","9","0","-","=","BACK"],[1]*13+[1.8]),
    (["TAB","Q","W","E","R","T","Y","U","I","O","P","[","]","\\"],[1.3]+[1]*12+[1.5]),
    (["CAPS","A","S","D","F","G","H","J","K","L",";","'","ENTER"],[1.55]+[1]*11+[2.25]),
    (["SHIFT","Z","X","C","V","B","N","M",",",".","/","SHIFT"],[1.9]+[1]*10+[2.9]),
    (["CTRL","ALT","FN","","ALT","MENU","CTRL"],[1.5,1.3,1.15,6.9,1.25,1.25,1.45]),
]
for row,(symbols,widths) in enumerate(rows):
    total=5.42
    unit=total/sum(widths)
    cursor=-2.98
    for symbol,width in zip(symbols,widths):
        span=width*unit
        custom=symbol in ("ESC","ENTER")
        modifier=len(symbol)>1
        cap(symbol,cursor+span/2,.59-row*.281,span-.023,.258,
            orange if custom else graphite if modifier else keymat,symbol,modifier)
        cursor+=span
for i,symbol in enumerate(["DEL","UP","LEFT","RIGHT","DOWN"]):
    y=[.59,.30,.01,-.28,-.57][i]
    cap(symbol,2.80,y,.48,.25,graphite,symbol,True)
keypart(label("NKT   /   INPUT",(-2.98,.866,.166),.064,ink,top=True,face=mono))
for i in range(3):
    keypart(box("Keyboard lamp",(2.66+i*.115,.84,.168),(.074,.046,.022),cyan if i==0 else cool,.008))

# A real continuous cable connects the back of the keyboard to the left
# fascia jack. The coiled section expands from the two straight reliefs.
jack=(-3.25,-1.23,.39)
coil_start=(-4.05,-1.58,.088)
coil_end=(-3.97,-2.73,.088)
lead("Upstream cord",[jack,(-3.48,-1.35,.14),(-3.8,-1.28,.055),coil_start],.034,black)
points=[]
for i in range(351):
    t=i/350
    a=t*math.tau*10
    r=.107*min(t*15,(1-t)*15,1)
    points.append((coil_start[0]+(coil_end[0]-coil_start[0])*t+r*math.sin(a),
                   coil_start[1]+(coil_end[1]-coil_start[1])*t,
                   .09+r*(.60+.68*math.cos(a))))
wire("Spiral keyboard flex",points,.030,graphite)
lead("Keyboard return",[coil_end,(-3.79,-2.85,.058),(-3.61,-2.78,.11),(-3.43,-2.50,.20)],.033,black)

# Cycles bakes contact and casting shadows into transparent pixels.
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.02))
ground=bpy.context.object
ground.name="Invisible worktop for shadow projection"
ground.is_shadow_catcher=True
ground.data.materials.append(material("Bench neutral","858585",.65))
world=bpy.data.worlds.new("Night studio")
world.use_nodes=True
world.node_tree.nodes["Background"].inputs[0].default_value=(*rgb("92a1b9"),1)
world.node_tree.nodes["Background"].inputs[1].default_value=.27
scene.world=world

def area(name, location, target, watts, size, color, height=None):
    data=bpy.data.lights.new(name,"AREA")
    data.energy=watts
    data.color=rgb(color)
    data.shape="RECTANGLE"
    data.size=size
    data.size_y=height or size
    obj=bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    obj.location=location
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()
    return obj

area("Warm overhead softbox",(4.5,-4.5,9.5),(0,0,2.3),950,6.5,"f9e6cf",3.2)
area("Window from the left",(-6,-1.1,6.2),(-1,.2,2.6),880,5.2,"94fdff",3.2)
area("Amber edge",(5.3,3.2,4.8),(2,0,2.5),570,3.1,"e69c69",4.3)
area("Front return",(-1,-8.9,2.5),(0,0,2.7),210,5.0,"c7cfdd")
area("Display spill",(0,-1.46,2.0),(0,-2.55,.0),34,4.7,"94fdff",.35)

camera_data=bpy.data.cameras.new("Bench lens")
camera=bpy.data.objects.new("Bench lens",camera_data)
scene.collection.objects.link(camera)
camera.location=(2.35,-26,7.90)
target=Vector((0,-.65,3.08))
camera.rotation_euler=(target-camera.location).to_track_quat("-Z","Y").to_euler()
camera_data.type="ORTHO"
camera_data.ortho_scale=12.85
scene.camera=camera
scene.render.engine="CYCLES"
scene.cycles.samples=5 if PREVIEW else 24
scene.cycles.use_denoising=True
scene.cycles.use_adaptive_sampling=True
scene.cycles.adaptive_threshold=.055
scene.cycles.max_bounces=4
scene.render.film_transparent=True
scene.render.resolution_x,scene.render.resolution_y=1920,1080
scene.render.resolution_percentage=45 if PREVIEW else 100
scene.render.image_settings.file_format="PNG" if PREVIEW else "WEBP"
scene.render.image_settings.color_mode="RGBA"
scene.render.image_settings.quality=96
scene.render.filepath=str(OUTPUT/("nkt-machine-proof.png" if PREVIEW else "machine.webp"))
scene.view_settings.view_transform="AgX"
bpy.context.view_layer.update()
corners=[]
for point in screen_corners:
    uv=world_to_camera_view(scene,camera,Vector(point))
    corners.append([round(uv.x,8),round(1-uv.y,8)])
payload={"image":"machine.webp","width":1920,"height":1080,"screen":corners}
print("SCREEN PROJECTION",payload,flush=True)
if __name__ == "__main__":
    if not PREVIEW:
        (OUTPUT/"machine-camera.json").write_text(json.dumps(payload,indent=2)+"\n",encoding="utf-8")
    bpy.ops.render.render(write_still=True)
