"""Small machined and moulded parts, in the same coordinates as workshop.py."""
import math
from machine import box, label, lead, wire, mesh, mono, graphite as dark, black
from machine import cool as slate, shell as paper, silver as metal, orange

def furnish(rod, axial, rect, enamel, teal, brass):
    # Steel hanging loops and two insulated test cables on the left wall.
    for x,z,rad,mat in [(-7.73,5.32,.47,orange),(-8.24,5.83,.57,black)]:
        rod("Hook bracket",(x,4.99,z),(x,4.42,z),.07,metal)
        for turn in range(3):
            pts=[]
            for i in range(65):
                a=math.tau*i/64
                pts.append((x+rad*math.sin(a),4.38-turn*.073,z-rad+rad*math.cos(a)))
            wire("Hanging cable coil",pts,.050,mat)
        lead("Coil tail",[(x-.18,4.25,z-rad*1.94),(x-.29,4.28,z-rad*2.6),(x-.10,4.30,z-rad*3.15)],.036,mat)
    # Small flange reel: copper windings have alternating tangents and shoulders.
    for x,y,floor in [(-7.43,.35,3.48),(7.13,2.48,2.56)]:
        z=floor+.52
        box("Reel cradle",(x,y,floor+.04),(.71,.72,.08),teal,.024)
        for side in (-1,1):
            box("Spindle upright",(x,y+side*.31,floor+.29),(.125,.09,.51),teal,.018)
        axial(x,y+.41,z,.073,.85,metal)
        for side in (-.20,.20):
            axial(x,y+side,z,.45,.052,dark)
            axial(x,y+side-.061,z,.12,.062,brass)
        for j in range(17):
            axial(x,y-.16+j*.019,z,.35+.009*math.sin(j),.015,brass if j%3 else orange)
        for i in range(5):
            a=i*math.tau/5
            axial(x+.29*math.cos(a),y-.262,z+.29*math.sin(a),.073,.012,slate)
    # Lifting-handle hinges, coax sockets, fuse and switch paddles on the instruments.
    for i in range(6):
        x=-7.56+i*.24
        box("Selector bank",(x,-.84,1.42),(.20,.105,.13),[paper,slate,orange][i//2],.018)
    for j in range(2):
        x=-5.40+j*.68
        axial(x,-.845,.31,.11,.08,metal)
        axial(x,-.925,.31,.071,.11,orange if j==0 else dark)
    lead("Rack carrying handle",[(-7.87,.52,2.25),(-8.07,.52,2.4),(-8.07,.52,3.95),
                                 (-7.77,.52,4.07),(-6.95,.52,4.07)],.07,dark)
    # The brake lever and toothed rack share an axis with the cutaway gearbox.
    for j in range(18):
        x=4.42+j*.145
        box("Rack tooth",(x,-.21,.56),(.071,.24,.10),brass,.014)
    rod("Brake lever",(6.84,-.18,1.77),(7.13,-.47,2.08),.044,metal)
    rod("Insulated thumb grip",(7.13,-.47,2.08),(7.28,-.57,2.19),.080,orange)
    for i in range(4):
        x=4.53+i*.91
        for j in range(4):
            axial(x-.24+j*.13,2.05,1.14+i%2*.61,.039,.076,brass if i%2 else metal)
    # A blue inspection jig for the same one-eyed slime shown on the desktop.
    def ellipsoid(name,loc,radii,mat):
        verts=[];faces=[];n=24;rings=13
        for lat in range(rings):
            a=math.pi*lat/(rings-1)
            for lon in range(n):
                b=math.tau*lon/n
                verts.append((loc[0]+radii[0]*math.sin(a)*math.cos(b),
                              loc[1]+radii[1]*math.sin(a)*math.sin(b),loc[2]+radii[2]*math.cos(a)))
        for row in range(rings-1):
            for j in range(n):faces.append((row*n+j,(row+1)*n+j,(row+1)*n+(j+1)%n,row*n+(j+1)%n))
        return mesh(name,verts,faces,mat,True)
    blue=enamel("Slime blue","0098dc")
    x,y,z=-6.09,-.06,3.83
    ellipsoid("Slime",(x,y,z),(.40,.35,.36),blue)
    ellipsoid("Eye",(x+.09,y-.31,z+.055),(.14,.074,.157),paper)
    ellipsoid("Pupil",(x+.11,y-.373,z+.066),(.069,.031,.083),black)
    ellipsoid("Catchlight",(x+.093,y-.400,z+.096),(.022,.012,.023),paper)
    # Patch leads on the sill and a real time-of-day LED module. Its aperture is
    # exported along with the CRT and scope; live segments are drawn in screen space.
    x,y,z=.72,3.81,5.99
    box("LED timer casing",(x,y,z),(2.17,.72,.55),teal,.074)
    box("Timer mask",(x,y-.38,z),(1.89,.035,.382),black,.026)
    clock=rect(x,y-.403,z,1.62,.263)
    for k in range(3):
        box("Timer key",(x+.30+k*.18,y,z+.29),(.12,.19,.062),orange if k==2 else slate,.011)
    lead("Clock lead",[(x-.96,3.9,z),(x-1.5,4.1,5.78),(-1.34,4.29,5.72),(-2.1,4.23,5.71)],.035,black)
    # A media rack and a processor test socket live on the sill. Both read
    # above the CRT even when the side instruments fall outside a phone's crop.
    box("Archive rack",(-2.43,4.46,5.79),(2.56,.62,.15),dark,.036)
    for j,(cx,cy,col,title) in enumerate([(-3.05,4.43,teal,"PEN"),(-2.15,4.57,slate,"SLIME 4")]):
        cz=6.32+j*.13
        box("Archive disk",(cx,cy,cz),(1.13,.093,1.19),col,.045)
        box("Shutter",(cx+.08,cy-.055,cz+.40),(.56,.026,.29),metal,.009)
        box("Read aperture",(cx+.19,cy-.074,cz+.40),(.13,.015,.23),black,.007)
        box("File label",(cx,cy-.056,cz-.20),(.94,.025,.53),paper,.012)
        box("Label stripe",(cx,cy-.073,cz+.01),(.94,.013,.07),orange,.004)
        label(title,(cx-.39,cy-.078,cz-.17),.14,black,face=mono)
        for k in range(7):
            box("Disk label bars",(cx-.33+k*.095,cy-.078,cz-.36),(.026+.015*(k%3),.013,.065),dark)
        for side in (-1,1):
            box("Cradle jaw",(cx+side*.45,cy,5.94),(.09,.33,.27),metal,.018)
    bx,by=3.10,4.44
    box("Controller stand",(bx,by,5.78),(1.88,.57,.13),dark,.022)
    box("Test socket card",(bx,by,6.12),(1.70,.085,.68),teal,.025)
    box("Socket",(bx-.18,by-.075,6.14),(.82,.11,.30),black,.035)
    box("Ceramic DIP",(bx-.18,by-.145,6.14),(.69,.065,.21),slate,.012)
    for i in range(9):
        for edge in (-1,1):
            box("Tinned DIP pin",(bx-.48+i*.075,by-.091,6.14+.147*edge),(.036,.07,.071),metal)
    for i in range(2):
        cx=bx+.45+i*.225
        axial(cx,by-.08,6.16,.093,.17,black)
        axial(cx,by-.253,6.16,.076,.012,metal)
    for i in range(5):
        cx=bx-.50+i*.21
        axial(cx,by-.057,5.94,.034,.039,brass)
    for k in range(5):
        lead("Ribbon conductor",[(bx+.78,by-.1,6.24+k*.027),(4.03,4.20,6.28+k*.027),
             (4.18,4.18,5.96+k*.026),(4.46,4.21,5.77+k*.018)],.018,[orange,paper,slate,dark,teal][k])
    # Narrow cable duct along the wall behind the upper instruments.
    for i in range(3):
        lead("Wall loom",[(-10,4.55,4.12+i*.095),(-6.9,4.56,4.04+i*.095),
                         (-3.94,4.54,4.25+i*.095),(2,4.54,4.04+i*.095),
                         (6.37,4.48,3.77+i*.095),(10,4.53,3.89+i*.095)],.045,[slate,black,orange][i])
    for x in (-8.9,-6.87,-4.15,4.32,7.91):
        box("Cable saddle",(x,4.45,4.13),(.11,.18,.52),metal,.014)
    # A metal caliper with a vernier slider and two square-ended jaws on the mat.
    box("Caliper beam",(4.68,-3.98,.057),(2.73,.115,.075),metal,.018)
    box("Vernier cursor",(4.27,-3.94,.114),(.53,.26,.11),slate,.027)
    for x in (3.40,4.17):
        box("Caliper jaw",(x,-3.73,.069),(.09,.49,.081),metal,.015)
        box("Inside jaw",(x,-4.10,.07),(.055,.26,.064),metal,.015)
    for j in range(24):
        box("Vernier graduation",(4.42+j*.066,-3.99,.10),(.009,.05 if j%5 else .09,.004),black)
    # An instrument drawer pulled out slightly, showing cartridge edges and a
    # small printed test board. Especially visible in portrait and square frames.
    x,y,z=-1.05,-5.03,-1.02
    box("Open tray bottom",(x,y,z-.30),(1.98,1.0,.12),dark,.04)
    for side in (-1,1):
        box("Open tray cheek",(x+side*.97,y,z-.11),(.073,1.03,.39),slate,.018)
    box("Open tray front",(x,y-.50,z-.06),(2.02,.09,.57),slate,.032)
    box("Tray pull",(x,y-.57,z-.01),(1.15,.06,.12),black,.025)
    for j in range(6):
        box("Service cartridge",(x,y+.34-j*.137,z+.08),(1.64,.095,.37),[teal,slate,dark][j%3],.037)
        box("Cartridge tab",(x-.50+.20*(j%3),y+.34-j*.137,z+.271),(.45,.094,.02),paper if j else orange,.004)
    return clock
