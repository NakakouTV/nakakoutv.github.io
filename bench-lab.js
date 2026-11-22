import * as T from './assets/three.module.js';

const pigments = {
  cyan:'#00ccff', pale:'#e8e8ff', pink:'#ff44cc', lime:'#ccff00',
  ink:'#0a0a14', glass:'#0a3a5c', blue:'#1870a8', violet:'#2a2445',
};
const standard = (color, metalness=.15) => new T.MeshStandardMaterial({color,metalness,roughness:.56});
const light = color => new T.MeshBasicMaterial({color});

export function createLab(scene) {
  const shell=standard('#52678b',.36), inset=standard('#13172c'), metal=standard('#8695b5',.32);
  const trim=standard('#2d4970',.3), violet=standard('#4a315b');
  const cyan=light(pigments.cyan), pink=light(pigments.pink), lime=light(pigments.lime);
  const white=light(pigments.pale), mutedBlue=light('#1870a8');
  const ceramic=standard('#a0aec5',.26), gasket=standard('#0b111c',.03);
  const champagne=standard('#ad9272',.57);
  const enamel=standard('#acb6cd',.18);
  const boxGeometry=new T.BoxGeometry(1,1,1);

  function box(parent,x,y,z,w,h,d,material) {
    const m=new T.Mesh(boxGeometry,material);
    m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);
    return m;
  }

  function cylinder(parent,x,y,z,rTop,rBase,height,material,sides=12,hollow=false) {
    const mesh=new T.Mesh(new T.CylinderGeometry(rTop,rBase,height,sides,1,hollow),material);
    mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }

  function link(parent,a,b,w,d,material) {
    const start=new T.Vector3(...a), end=new T.Vector3(...b);
    const midpoint=start.clone().lerp(end,.5);
    const bar=box(parent,midpoint.x,midpoint.y,midpoint.z,w,start.distanceTo(end),d,material);
    bar.quaternion.setFromUnitVectors(T.Object3D.DEFAULT_UP,end.sub(start).normalize());
    return bar;
  }

  function ring(parent,x,y,z,radius,width,material,segments=32) {
    const mesh=new T.Mesh(new T.RingGeometry(radius-width,radius,segments),material);
    mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);parent.add(mesh);
    return mesh;
  }

  function extrude(parent,outline,y,depth,material,holes=[],bevel=.045) {
    const shape=new T.Shape(outline.map(([x,z])=>new T.Vector2(x,-z)));
    for(const points of holes)shape.holes.push(new T.Path(points.map(([x,z])=>new T.Vector2(x,-z))));
    const geo=new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1});
    const mesh=new T.Mesh(geo,material);
    mesh.rotation.x=-Math.PI/2;mesh.position.y=y;parent.add(mesh);
    return mesh;
  }

  function chamfer(cx,cz,w,d,cut) {
    const x=w/2,z=d/2;
    return [[-x+cut,-z],[x-cut,-z],[x,-z+cut],[x,z-cut],[x-cut,z],[-x+cut,z],[-x,z-cut],[-x,-z+cut]]
      .map(([a,b])=>[cx+a,cz+b]);
  }
  function fastener(parent,x,y,z,r=.034) {
    cylinder(parent,x,y,z,r,r,.016,metal,20);
    box(parent,x,y+.009,z,r*1.18,.004,r*.23,gasket);
  }

  const outer = [[-5.43,-1.77],[-4.56,-2.62],[4.52,-2.62],[5.47,-1.7],[5.47,1.02],[4.48,2.15],[2.76,2.15],[2.15,2.46],[-2.07,2.46],[-2.67,2.17],[-4.49,2.17],[-5.43,1.17]]
    .map(([x,z])=>[x*1.25,z*1.36]);
  const wellX=-4.83,wellZ=.88,wellRadius=.79;
  const well=Array.from({length:40},(_,i)=>{
    const a=i*Math.PI/20;
    return [wellX+Math.cos(a)*wellRadius,wellZ+Math.sin(a)*wellRadius];
  });
  // The well is cut through all three shells. The inner wall extends below the top.
  extrude(scene,outer,-.29,.21,shell,[well]);
  extrude(scene,outer.map(([x,z])=>[x*.976,z*.96]),-.063,.045,inset,[well],.019);
  extrude(scene,outer.map(([x,z])=>[x*.92,z*.91]),-.52,.20,trim,[well],.06);
  const pitWall = new T.MeshStandardMaterial({color:'#0d2240',side:T.DoubleSide,roughness:.5});
  cylinder(scene,wellX,-.42,wellZ,.778,.778,1.02,pitWall,40,true);
  cylinder(scene,wellX,-.91,wellZ,.76,.72,.13,inset);
  ring(scene,wellX,.004,wellZ,.93,.135,metal,48);
  ring(scene,wellX,.006,wellZ,.83,.018,champagne,48);
  ring(scene,wellX,-.072,wellZ,.765,.022,cyan,40);
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    const mark=box(scene,wellX+Math.cos(a)*.982,-.010,wellZ+Math.sin(a)*.982,.095,.008,.027,i%3===0?lime:trim);
    mark.rotation.y=-a;
    if(i%3===0)fastener(scene,wellX+Math.cos(a)*.895,.014,wellZ+Math.sin(a)*.895,.019);
  }
  const lift = new T.Group();
  lift.position.set(wellX,.62,wellZ);scene.add(lift);
  cylinder(scene,wellX,-.56,wellZ,.235,.35,.67,trim,8);
  cylinder(lift,0,-.69,0,.13,.13,1.31,metal,32);
  cylinder(lift,0,-.27,0,.205,.205,.25,gasket,32);
  cylinder(lift,0,-.39,0,.213,.213,.040,champagne,32);
  cylinder(lift,0,-.025,0,.60,.53,.13,trim,36);
  cylinder(lift,0,.045,0,.553,.573,.045,ceramic,36);
  ring(lift,0,.070,0,.535,.021,lime,48);
  for(const x of [-.28,.28]){
    link(lift,[x*1.34,.08,.31],[x*.66,.51,.08],.105,.13,enamel);
    link(lift,[x*1.34,.08,-.31],[x*.66,.51,-.08],.105,.13,enamel);
    const shoe=box(lift,x*1.28,.096,0,.19,.069,.59,trim);
    shoe.rotation.y=Math.sign(x)*.08;
    cylinder(lift,x*.65,.50,0,.078,.092,.124,champagne,32);
    fastener(lift,x*1.28,.137,.205,.024);
  }

  const capsule = new T.Group();
  capsule.position.y=.29;lift.add(capsule);
  const cell=cylinder(capsule,0,0,0,.171,.171,.48,
    new T.MeshPhysicalMaterial({color:'#63ecff',roughness:.22,transparent:true,opacity:.27,depthWrite:false,side:T.DoubleSide,clearcoat:1}),32,true);
  cell.renderOrder=3;
  cylinder(capsule,0,0,0,.086,.086,.39,cyan,6);
  for(const y of [-.24,.24]) {
    cylinder(capsule,0,y,0,.192,.192,.071,shell,32);
    cylinder(capsule,0,y+Math.sign(y)*.033,0,.171,.178,.016,ceramic,32);
    cylinder(capsule,0,y-Math.sign(y)*.030,0,.195,.195,.012,lime,32);
    if(y>0)fastener(capsule,0,y+.047,0,.047);
  }

  // Paired inclined supports feed into the desk's central conduit.
  for(const sign of [-1,1]){
    const knee=sign*4.55, foot=sign*5.28;
    link(scene,[knee,-.36,-.60],[foot,-2.61,.43],.63,.59,shell);
    link(scene,[knee,-.57,1.47],[foot,-2.34,1.18],.25,.30,trim);
    link(scene,[knee,-.48,-.26],[foot,-2.53,.70],.34,.11,gasket);
    link(scene,[knee,-.59,-.20],[foot,-2.38,.64],.065,.037,sign<0?cyan:pink);
    extrude(scene,chamfer(foot,.48,1.04,2.36,.32),-2.71,.13,trim);
    extrude(scene,chamfer(foot,.53,.88,1.89,.23),-2.555,.065,shell,[],.025);
    for(const z of [-.12,1.12])fastener(scene,foot,-2.465,z,.046);
    box(scene,foot,-2.48,1.19,.49,.021,.067,sign<0?cyan:pink);
  }
  box(scene,0,-.78,-1.99,6.48,.52,.65,inset);
  for(let i=0;i<11;i++)box(scene,-1.40+i*.28,-.67,-1.646,.176,.14,.027,i%5===0?mutedBlue:trim);
  for(const [index,a] of outer.entries()){
    const b=outer[(index+1)%outer.length], x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const rail=box(scene,x,-.16,z,length*.84,.038,.060,metal);
    rail.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);
  }
  for(let i=0;i<11;i++)box(scene,-2.18+i*.44,-.33,3.19,.18,.042,.036,i%3===0?lime:trim);
  const matOutline=chamfer(.12,1.18,5.38,2.86,.29);
  extrude(scene,matOutline,.004,.014,gasket,[],.012);
  // Recessed markings on the section of the work surface left clear for fabrication.
  for(let i=0;i<21;i++){
    const x=-2.24+i*.237;
    box(scene,x,.033,2.47,.013,.003,i%5===0?.132:.066,metal);
  }

  // Front controls: a machined keyboard, a jog dial and a pressure stylus.
  const keyboard=new T.Group();keyboard.position.set(-.88,.026,1.94);scene.add(keyboard);
  extrude(keyboard,chamfer(0,0,2.96,.81,.12),.022,.048,shell,[],.024);
  extrude(keyboard,chamfer(0,0,2.83,.70,.085),.078,.012,gasket,[],.013);
  const cap=new T.Shape(chamfer(0,0,.110,.106,.016).map(([x,z])=>new T.Vector2(x,-z)));
  const capGeometry=new T.ExtrudeGeometry(cap,{depth:.027,bevelThickness:.009,bevelSize:.009,bevelSegments:2});
  capGeometry.rotateX(-Math.PI/2);
  const keys=[];
  for(let row=0;row<4;row++)for(let col=0;col<17;col++){
    if(row===3&&col>=4&&col<=12)continue;
    keys.push({x:-1.29+.159*col,y:.121,z:-.241+row*.158,accent:row===0||col>=15});
  }
  for(const accent of [false,true]){
    const set=keys.filter(key=>key.accent===accent);
    const mesh=new T.InstancedMesh(capGeometry,accent?violet:ceramic,set.length);
    const matrix=new T.Matrix4();
    set.forEach(({x,y,z},i)=>{
      matrix.makeTranslation(x,y,z);mesh.setMatrixAt(i,matrix);
    });
    keyboard.add(mesh);
  }
  box(keyboard,-.06,.12,.232,1.39,.05,.135,metal);
  for(const x of [-1.35,1.35])fastener(keyboard,x,.091,.315,.014);
  box(keyboard,-1.30,.091,-.359,.19,.009,.015,cyan);
  const dial=new T.Group();dial.position.set(1.23,.025,1.98);scene.add(dial);
  extrude(dial,chamfer(0,0,.77,.79,.17),.016,.082,trim);
  ring(dial,0,.128,0,.267,.020,metal,48);
  cylinder(dial,0,.174,0,.184,.201,.117,shell,48);
  cylinder(dial,0,.235,0,.173,.184,.025,ceramic,48);
  for(let i=0;i<32;i++){
    const a=i*Math.PI/16;
    const grip=box(dial,Math.cos(a)*.192,.177,Math.sin(a)*.192,.016,.064,.016,gasket);
    grip.rotation.y=-a;
  }
  box(dial,0,.250,.061,.019,.006,.098,white);

  // A diagnostic puck, chip samples, patch connections and sample cartridges.
  const probeRack=new T.Group();probeRack.position.set(-2.62,0,-1.55);scene.add(probeRack);
  extrude(probeRack,chamfer(0,0,1.52,.78,.1),.019,.09,trim);
  for(let i=0;i<4;i++){
    const chip=box(probeRack,-.54+i*.34,.20,.058,.28,.16,.47,i%2?metal:violet);
    chip.rotation.x=-.18;
    const marker=box(probeRack,-.54+i*.34,.288,.10,.145,.008,.175,i===2?lime:cyan);
    marker.rotation.x=-.18;
  }
  for(const [i,color] of [pink,cyan,mutedBlue].entries()){
    const cable=new T.CatmullRomCurve3([[-2.1+i*.065,.10,-1.86],[-1.69+i*.075,.085,-2.19],
      [-.92+i*.075,.083,-2.14],[.57+i*.07,.088,-1.67],[.86+i*.074,.198,-1.59]].map(p=>new T.Vector3(...p)));
    scene.add(new T.Mesh(new T.TubeGeometry(cable,18,.016,5),color));
  }
  for(let i=0;i<5;i++)box(scene,.61+i*.16,.096,-1.59,.10,.11,.23,metal);
  const cartridges=new T.Group();cartridges.position.set(5.56,0,1.27);cartridges.rotation.y=.28;scene.add(cartridges);
  for(let i=0;i<3;i++){
    const z=-.31+i*.30;
    extrude(cartridges,chamfer(0,z,.61,.26,.05),.02,.12,i===2?violet:trim,[],.017);
    box(cartridges,-.06,.156,z,.24,.008,.072,i===2?pink:mutedBlue);
    box(cartridges,.16,.152,z,.112,.009,.066,metal);
    for(let pin=0;pin<4;pin++)box(cartridges,.30,.083,z-.078+pin*.051,.015,.032,.022,champagne);
  }
  const handle=link(scene,[-2.99,.11,1.53],[-2.54,.11,1.29],.09,.084,shell);
  link(scene,[-2.54,.11,1.29],[-2.40,.11,1.22],.042,.042,cyan);
  handle.rotation.z+=.02;
  const board=new T.Group();board.position.set(5.51,.026,-.03);board.rotation.y=-.17;scene.add(board);
  extrude(board,chamfer(0,0,.74,.61,.085),0,.04,trim,[],.009);
  box(board,-.105,.083,0,.216,.082,.27,violet);
  box(board,.185,.069,.11,.17,.057,.15,metal);
  for(let i=0;i<6;i++){
    const z=-.112+i*.044;
    for(const x of [-.246,.037])box(board,x,.059,z,.069,.025,.019,metal);
    box(board,.31,.056,-.208+i*.07,.053,.017,.026,i===0?lime:mutedBlue);
  }
  for(const x of [-.286,.286])for(const z of [-.201,.201])fastener(board,x,.053,z,.013);
  const gauge=new T.Group();gauge.position.set(-2.59,.032,.34);scene.add(gauge);
  extrude(gauge,chamfer(0,0,.67,.45,.10),0,.071,shell,[],.015);
  box(gauge,0,.093,0,.42,.015,.246,inset);
  for(let i=0;i<4;i++)box(gauge,-.135+i*.09,.103,0,.049,.008,.12,i===3?lime:cyan);

  const projector = new T.Group();projector.position.set(4.69,0,-1.75);scene.add(projector);
  // Forked optical bench. The two cast arms carry a separate lens barrel,
  // and their open center keeps the optical head readable from behind.
  const fork=[[ -.98,.59],[-1.09,.30],[-.83,-.58],[-.53,-.80],[.60,-.80],[.96,-.55],[1.08,.28],[.96,.60],[.61,.60],[.50,.34],[.39,-.28],[-.43,-.28],[-.56,.38],[-.63,.60]];
  extrude(projector,fork,.045,.105,trim,[],.06);
  for(const side of [-1,1]){
    const arm=[[.55,.54],[.96,.50],[1.01,.22],[.83,-.44],[.57,-.60],[.45,-.36]].map(([x,z])=>[side*x,z]);
    extrude(projector,arm,.16,.18,enamel,[],.066);
    link(projector,[side*.67,.30,.38],[side*.52,.56,.0],.18,.25,shell);
    const journal=cylinder(projector,side*.49,.48,0,.171,.171,.31,champagne,40);
    journal.rotation.z=Math.PI/2;
    const axle=cylinder(projector,side*.64,.48,0,.103,.103,.029,gasket,32);
    axle.rotation.z=Math.PI/2;
    for(let i=0;i<6;i++)box(projector,side*(.62+i*.053),.384,.155-i*.061,.021,.021,.102,gasket);
  }
  cylinder(projector,0,.41,0,.375,.285,.19,shell,48);
  cylinder(projector,0,.516,0,.409,.386,.052,champagne,56);
  cylinder(projector,0,.55,0,.362,.373,.047,gasket,56);
  ring(projector,0,.576,0,.342,.023,pink,56);
  cylinder(projector,0,.57,0,.254,.273,.032,trim,48);
  cylinder(projector,0,.589,0,.153,.165,.015,cyan,48);
  const beam = new T.Mesh(new T.CylinderGeometry(.71,.17,1.27,12,1,true),
    new T.ShaderMaterial({
      transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
      uniforms:{time:{value:0}},
      vertexShader:'varying vec2 tex; void main(){tex=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`uniform float time;varying vec2 tex;void main(){
        float sweep=pow(max(0.,1.-abs(fract(tex.y-time*.36)-.38)*8.),2.);
        float lines=step(.87,fract(tex.x*16.))+step(.94,fract(tex.y*28.))*.27;
        float falloff=(1.-tex.y)*smoothstep(0.,.16,tex.y);
        gl_FragColor=vec4(.0,.64,1.,(lines*.12+sweep*.13+.041)*falloff);
      }`,
    }));
  beam.position.y=1.233;projector.add(beam);

  const projection=new T.Group();projection.position.y=1.65;projector.add(projection);
  const cyanWire=new T.LineBasicMaterial({color:pigments.cyan,transparent:true,opacity:.84});
  const pinkWire=new T.LineBasicMaterial({color:pigments.pink,transparent:true,opacity:.8});
  const mesh = new T.EdgesGeometry(new T.IcosahedronGeometry(.56,0));
  projection.add(new T.LineSegments(mesh,cyanWire));
  const heart=new T.Mesh(new T.OctahedronGeometry(.20),new T.MeshBasicMaterial({color:pigments.cyan,transparent:true,opacity:.72}));
  projection.add(heart);
  const orbit = new T.Group();projection.add(orbit);
  const rings=[{r:.73,tilt:.15,material:cyanWire},{r:.89,tilt:-.32,material:pinkWire}];
  for(const {r,tilt,material} of rings) {
    const vertices=Array.from({length:65},(_,i)=>{
      const a=i*Math.PI/32;
      return new T.Vector3(Math.cos(a)*r,Math.sin(a)*r*Math.sin(tilt),Math.sin(a)*r);
    });
    orbit.add(new T.Line(new T.BufferGeometry().setFromPoints(vertices),material));
  }
  for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5;
    box(orbit,Math.cos(a)*.79,Math.sin(a)*.10,Math.sin(a)*.79,.065,.065,.065,i%2?pink:cyan);
  }

  function graphic(width,height,paint) {
    const canvas=document.createElement('canvas');
    canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d');
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    texture.minFilter=T.LinearFilter;texture.magFilter=T.NearestFilter;
    return {
      texture,
      draw(state) {
        context.clearRect(0,0,width,height);
        paint(context,state);texture.needsUpdate=true;
      },
    };
  }
  function label(context,string,x,y,color=pigments.pale,px=16) {
    context.font=`600 ${px}px Consolas, monospace`;
    context.fillStyle=color;context.fillText(string,x,y);
  }
  function rule(context,points,color,width=1) {
    context.beginPath();
    points.forEach(([x,y],i)=>i?context.lineTo(x,y):context.moveTo(x,y));
    context.strokeStyle=color;context.lineWidth=width;context.stroke();
  }
  function displayTexture(parent,texture,w,h,transparent=false,side=T.FrontSide) {
    const surface=new T.Mesh(new T.PlaneGeometry(w,h),
      new T.MeshBasicMaterial({map:texture,transparent,side,depthWrite:!transparent}));
    parent.add(surface);return surface;
  }
  const legends=graphic(576,154,ctx=>{
    const rows=['1234567890-+','QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];
    ctx.textAlign='center';
    for(const [row,letters] of rows.entries()){
      for(const [column,key] of [...letters].entries()){
        label(ctx,key,38+column*31.0,30+row*30.8,row===0?pigments.pale:'#172239',13);
      }
    }
  });
  legends.draw();
  const keyPrint=displayTexture(keyboard,legends.texture,2.95,.79,true);
  keyPrint.position.set(0,.158,0);keyPrint.rotation.x=-Math.PI/2;
  function wings() {
    const left=new T.Group();left.position.set(-4.97,2.07,-1.99);left.rotation.y=.26;scene.add(left);
    const right=new T.Group();right.position.set(4.28,2.99,-2.37);right.rotation.y=-.26;scene.add(right);
    const glass = graphic(440,272,(ctx,{time,angle})=>{
      const cyanLine=pigments.cyan;
      label(ctx,'OPTICAL SCAN',25,36,cyanLine,23);
      label(ctx,'ORBIT',25,63,pigments.pale,15);
      const cX=150,cY=151;
      for(const radius of [32,54,72]){
        ctx.beginPath();ctx.arc(cX,cY,radius,0,Math.PI*2);
        ctx.strokeStyle=radius===72?pigments.cyan:'#1870a8';ctx.lineWidth=2;ctx.stroke();
      }
      rule(ctx,[[76,cY],[224,cY]],'#1870a8',1);
      rule(ctx,[[cX,77],[cX,225]],'#1870a8',1);
      const a=angle+time*.7;
      rule(ctx,[[cX,cY],[cX+72*Math.cos(a),cY+72*Math.sin(a)]],cyanLine,3);
      ctx.fillStyle=pigments.lime;ctx.fillRect(cX+41*Math.cos(a)-4,cY+41*Math.sin(a)-4,8,8);
      rule(ctx,[[249,82],[249,219],[411,219]],'#1870a8',2);
      const wave=Array.from({length:41},(_,i)=>[252+3.87*i,148+24*Math.sin(i*.38-time*1.7)*(.42+.5*Math.sin(i*.11)**2)]);
      rule(ctx,wave,pigments.pale,3);
      label(ctx,`${Math.round(((angle*180/Math.PI)%360+360)%360).toString().padStart(3,'0')} DEG`,269,115,cyanLine,17);
      label(ctx,'PROJECTION',270,203,pigments.pink,14);
      rule(ctx,[[24,243],[171,243],[181,251],[416,251]],cyanLine,2);
    });
    const glassShape=new T.Shape([
      [-1.14,-.46],[-.93,-.70],[.89,-.70],[1.14,-.46],
      [1.14,.53],[.95,.70],[-.97,.70],[-1.14,.51],
    ].map(([x,y])=>new T.Vector2(x,y)));
    const acrylic=new T.Mesh(new T.ExtrudeGeometry(glassShape,{depth:.034,bevelThickness:.011,bevelSize:.012,bevelSegments:2}),
      new T.MeshPhysicalMaterial({color:'#54dfff',roughness:.16,clearcoat:1,transparent:true,opacity:.15,depthWrite:false}));
    acrylic.position.z=-.024;left.add(acrylic);
    acrylic.renderOrder=4;
    const markings=displayTexture(left,glass.texture,2.23,1.37,true,T.DoubleSide);
    markings.position.z=.032;markings.renderOrder=5;
    for(const side of [-1,1]){
      link(left,[side*.71,-.685,.001],[side*.92,-.685,.001],.10,.10,enamel);
      link(left,[side*.92,-.685,.001],[side*1.13,-.458,.001],.095,.10,enamel);
      link(left,[side*1.13,-.458,.001],[side*1.13,-.348,.001],.055,.10,shell);
      box(left,side*.92,.703,-.007,.14,.04,.055,champagne);
    }
    box(left,0,-.746,-.023,1.56,.134,.14,trim);
    box(left,0,-.729,.054,1.37,.023,.019,cyan);
    box(left,-.95,.676,.022,.28,.013,.017,mutedBlue);
    const foot=[-5.23,.12,-2.08],hinge=[-5.50,1.04,-2.22],head=[-5.36,1.39,-2.12];
    link(scene,foot,hinge,.21,.14,trim);
    link(scene,hinge,head,.17,.12,metal);
    for(const [x,y,z] of [hinge,head]){
      const joint=cylinder(scene,x,y,z,.105,.105,.22,shell,32);
      joint.rotation.x=Math.PI/2;
      box(scene,x,y,z+.113,.079,.025,.013,champagne);
    }
    extrude(scene,chamfer(foot[0],foot[2],1.16,.69,.14),.024,.12,trim);
    for(const x of [-5.65,-4.82])fastener(scene,x,.193,-2.00,.022);

    const status=graphic(400,178,(ctx,{liftHeight,raised})=>{
      ctx.fillStyle=pigments.ink;ctx.fillRect(0,0,400,178);
      ctx.fillStyle='#2a2445';ctx.fillRect(0,0,400,33);
      label(ctx,'FABRICATION BAY',19,23,pigments.pale,19);
      label(ctx,'LIFT',20,62,pigments.cyan,19);
      const proportion=Math.max(0,Math.min(1,(liftHeight+.56)/1.18));
      const moving=Math.abs(liftHeight-(raised?.62:-.88))>.04;
      label(ctx,moving?(raised?'RAISING':'LOWERING'):(raised?'DEPLOYED':'STOWED'),222,62,pigments.lime,17);
      for(let i=0;i<20;i++){
        ctx.fillStyle=i<proportion*20?(i>16?pigments.pink:pigments.cyan):'#2a2445';
        ctx.fillRect(20+i*18,77,14,20);
      }
      label(ctx,'HOLOGRAM',20,132,pigments.pale,17);
      label(ctx,'PROJECTING',222,132,pigments.cyan,16);
      rule(ctx,[[20,148],[380,148]],pigments.blue,2);
    });
    box(right,0,0,-.034,2.47,1.17,.080,shell);
    box(right,0,0,.012,2.41,1.12,.048,gasket);
    for(let i=0;i<12;i++)box(right,-.72+i*.123,.34,-.081,.050,.077,.014,trim);
    for(const x of [-1.17,1.17])for(const y of [-.535,.535])box(right,x,y,.049,.034,.022,.008,metal);
    const screen=displayTexture(right,status.texture,2.33,1.038);
    screen.position.z=.059;
    box(right,.94,-.55,.063,.26,.028,.019,pink);
    const rightHinge=[5.65,2.33,-2.70];
    link(scene,[5.57,.10,-2.72],rightHinge,.18,.24,trim);
    link(scene,rightHinge,[4.75,2.60,-2.44],.14,.19,shell);
    const joint=cylinder(scene,...rightHinge,.111,.111,.24,shell,32);
    joint.rotation.x=Math.PI/2;
    extrude(scene,chamfer(5.57,-2.72,.76,.78,.11),.012,.10,trim);
    return [glass,status];
  }
  const displays=wings();
  const deskGraphic=graphic(560,245,(ctx,{time,raised,inspection})=>{
    ctx.fillStyle='#0a1527';ctx.fillRect(0,0,560,245);
    for(let x=18;x<560;x+=18)rule(ctx,[[x,52],[x,221]],'#193959');
    for(let y=52;y<222;y+=18)rule(ctx,[[18,y],[542,y]],'#193959');
    ctx.fillStyle='#164064';ctx.fillRect(0,0,560,44);
    label(ctx,'WORKTOP / CONTROL',19,29,pigments.pale,23);
    label(ctx,raised?'BAY OPEN':'BAY CLOSED',34,89,pigments.lime,19);
    label(ctx,inspection?'040 / VIEWING':'040 / ON STAND',34,158,pigments.pale,18);
    rule(ctx,[[291,65],[291,203]],pigments.blue,2);
    const trace=Array.from({length:61},(_,i)=>[308+i*3.63,138+33*Math.sin(i*.21+time*2)*Math.sin(i*.051)]);
    rule(ctx,trace,pigments.cyan,3);
    label(ctx,'PROJECTION SIGNAL',310,188,pigments.cyan,15);
    rule(ctx,[[19,215],[542,215]],pigments.cyan,3);
  });
  const panelX=1.20,panelZ=-.86;
  extrude(scene,chamfer(panelX,panelZ,2.0,.99,.13),-.022,.054,trim,[],.012);
  const deskScreen=displayTexture(scene,deskGraphic.texture,1.86,.81);
  deskScreen.position.set(panelX,.048,panelZ);deskScreen.rotation.x=-Math.PI/2;
  box(scene,panelX,.053,panelZ+.475,1.45,.014,.031,cyan);
  for(let i=0;i<5;i++)box(scene,panelX-.20+i*.105,.042,panelZ-.55,.049,.009,.055,i===0?lime:mutedBlue);

  // Low-profile platform for the actual portfolio model.
  const slot=new T.Group();slot.position.set(3.67,.018,1.52);scene.add(slot);
  extrude(slot,chamfer(0,0,1.59,1.47,.21),0,.07,trim,[],.028);
  extrude(slot,chamfer(0,0,1.37,1.27,.16),.082,.02,inset,[],.011);
  box(slot,0,.056,.734,1.16,.019,.021,pink);
  for(const x of [-.61,.61])for(const z of [-.49,.49]){
    box(slot,x,.11,z,.075,.009,.12,mutedBlue);
    fastener(slot,x,.098,z*1.21,.016);
  }

  let previousDraw=-Infinity,previousMode;
  function update(state) {
    const {time,angle,liftHeight,raised,inspection}=state;
    lift.position.y=liftHeight;
    projection.position.y=1.69+Math.sin(time*1.8)*.094;
    projection.rotation.y=time*.36;
    orbit.rotation.y=-time*.61;
    heart.rotation.y=time*.72;
    beam.material.uniforms.time.value=time;
    const mode=`${raised}/${inspection}`;
    if(time-previousDraw>.105||mode!==previousMode||Math.abs(angle-previousAngle)>.10){
      displays.forEach(screen=>screen.draw(state));deskGraphic.draw(state);
      previousDraw=time;previousMode=mode;previousAngle=angle;
    }
  }
  let previousAngle=0;
  update({time:0,angle:0,liftHeight:.62,raised:true,inspection:false});
  return {box,slot,lift,update,shell,trim,metal,cyan};
}
