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

  const outer = [[-5.43,-1.77],[-4.56,-2.62],[4.52,-2.62],[5.47,-1.7],[5.47,1.02],[4.48,2.15],[2.76,2.15],[2.15,2.46],[-2.07,2.46],[-2.67,2.17],[-4.49,2.17],[-5.43,1.17]];
  const wellX=-3.95,wellZ=.47,wellRadius=.79;
  const well=Array.from({length:12},(_,i)=>{
    const a=(i+.5)*Math.PI/6;
    return [wellX+Math.cos(a)*wellRadius,wellZ+Math.sin(a)*wellRadius];
  });
  // The well is cut through all three shells. The inner wall extends below the top.
  extrude(scene,outer,-.29,.21,shell,[well]);
  extrude(scene,outer.map(([x,z])=>[x*.976,z*.96]),-.063,.045,inset,[well],.019);
  extrude(scene,outer.map(([x,z])=>[x*.92,z*.91]),-.52,.20,trim,[well],.06);
  const pitWall = new T.MeshStandardMaterial({color:'#0d2240',side:T.DoubleSide,roughness:.5});
  cylinder(scene,wellX,-.42,wellZ,.766,.77,1.02,pitWall,12,true).rotation.y=Math.PI/12;
  cylinder(scene,wellX,-.91,wellZ,.76,.72,.13,inset);
  ring(scene,wellX,-.026,wellZ,.88,.036,lime,12).rotation.z=Math.PI/12;
  ring(scene,wellX,-.072,wellZ,.77,.03,cyan,12).rotation.z=Math.PI/12;
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    const mark=box(scene,wellX+Math.cos(a)*.959,-.022,wellZ+Math.sin(a)*.959,.095,.008,.027,i%3===0?lime:trim);
    mark.rotation.y=-a;
  }
  const lift = new T.Group();
  lift.position.set(wellX,.62,wellZ);scene.add(lift);
  cylinder(scene,wellX,-.56,wellZ,.235,.35,.67,trim,8);
  cylinder(lift,0,-.69,0,.16,.16,1.31,metal,8);
  cylinder(lift,0,-.024,0,.60,.50,.13,trim);
  ring(lift,0,.045,0,.54,.03,lime,12);
  for(const x of [-.32,.32]){
    box(lift,x,.156,0,.027,.27,.027,cyan);
    box(lift,x,.025,0,.12,.05,.35,shell);
  }

  const capsule = new T.Group();
  capsule.position.y=.29;lift.add(capsule);
  const cell=cylinder(capsule,0,0,0,.171,.171,.48,
    new T.MeshBasicMaterial({color:'#00ccff',transparent:true,opacity:.33,depthWrite:false,side:T.DoubleSide}),8,true);
  cell.renderOrder=3;
  cylinder(capsule,0,0,0,.086,.086,.39,cyan,6);
  for(const y of [-.24,.24]) {
    cylinder(capsule,0,y,0,.187,.187,.068,shell,8);
    cylinder(capsule,0,y,0,.191,.191,.018,lime,8);
  }

  // Paired inclined supports feed into the desk's central conduit.
  for(const sign of [-1,1]){
    const knee=sign*3.64, foot=sign*4.22;
    link(scene,[knee,-.36,-.60],[foot,-2.61,.43],.63,.59,shell);
    link(scene,[knee,-.57,1.47],[foot,-2.34,1.18],.25,.30,trim);
    link(scene,[knee,-.43,-.26],[foot,-2.53,.70],.065,.029,sign<0?cyan:pink);
    extrude(scene,chamfer(foot,.48,1.04,2.36,.32),-2.71,.13,trim);
    box(scene,foot,-2.565,1.19,.61,.024,.074,sign<0?cyan:pink);
  }
  box(scene,0,-.78,-1.99,6.48,.52,.65,inset);
  for(let i=0;i<11;i++)box(scene,-1.40+i*.28,-.67,-1.646,.176,.14,.027,i%5===0?mutedBlue:trim);
  for(const [index,a] of outer.entries()){
    const b=outer[(index+1)%outer.length], x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const rail=box(scene,x,-.16,z,length*.86,.035,.031,index>=5&&index<=9?cyan:mutedBlue);
    rail.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);
  }
  for(let i=0;i<11;i++)box(scene,-2.18+i*.44,-.351,1.98,.18,.042,.036,i%3===0?lime:trim);

  // Front controls: a machined keyboard, a jog dial and a pressure stylus.
  const keyboard=new T.Group();keyboard.position.set(-.88,0,1.26);scene.add(keyboard);
  extrude(keyboard,chamfer(0,0,2.91,.77,.13),.026,.069,trim,[],.022);
  const keys=[];
  for(let row=0;row<4;row++)for(let col=0;col<17;col++){
    if(row===3&&col>=4&&col<=12)continue;
    keys.push({x:-1.29+.159*col,y:.121,z:-.241+row*.158,accent:row===0||col>=15});
  }
  for(const accent of [false,true]){
    const set=keys.filter(key=>key.accent===accent);
    const mesh=new T.InstancedMesh(boxGeometry,accent?violet:metal,set.length);
    const matrix=new T.Matrix4();
    set.forEach(({x,y,z},i)=>{
      matrix.makeScale(.139,.05,.139);matrix.setPosition(x,y,z);mesh.setMatrixAt(i,matrix);
    });
    keyboard.add(mesh);
  }
  box(keyboard,-.06,.12,.232,1.39,.05,.135,metal);
  const dial=new T.Group();dial.position.set(1.29,0,1.48);scene.add(dial);
  extrude(dial,chamfer(0,0,.77,.79,.17),.016,.082,trim);
  ring(dial,0,.117,0,.267,.027,pink,16);
  cylinder(dial,0,.174,0,.185,.201,.117,shell,16);
  box(dial,0,.24,.041,.025,.009,.115,white);

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
  const cartridges=new T.Group();cartridges.position.set(4.43,0,1.26);cartridges.rotation.y=.28;scene.add(cartridges);
  for(let i=0;i<3;i++){
    const z=-.31+i*.30;
    extrude(cartridges,chamfer(0,z,.61,.26,.05),.02,.12,i===2?violet:trim,[],.017);
    box(cartridges,-.06,.156,z,.24,.008,.072,i===2?pink:mutedBlue);
    box(cartridges,.16,.152,z,.112,.009,.066,metal);
  }
  const handle=link(scene,[-2.99,.11,1.53],[-2.54,.11,1.29],.09,.084,shell);
  link(scene,[-2.54,.11,1.29],[-2.40,.11,1.22],.042,.042,cyan);
  handle.rotation.z+=.02;
  const board=new T.Group();board.position.set(4.42,.026,-.12);board.rotation.y=-.17;scene.add(board);
  extrude(board,chamfer(0,0,.74,.61,.085),0,.04,trim,[],.009);
  box(board,-.105,.083,0,.216,.082,.27,violet);
  box(board,.185,.069,.11,.17,.057,.15,metal);
  for(let i=0;i<6;i++){
    const z=-.112+i*.044;
    for(const x of [-.246,.037])box(board,x,.059,z,.069,.025,.019,metal);
    box(board,.31,.056,-.208+i*.07,.053,.017,.026,i===0?lime:mutedBlue);
  }
  const gauge=new T.Group();gauge.position.set(-2.59,.032,.34);scene.add(gauge);
  extrude(gauge,chamfer(0,0,.67,.45,.10),0,.071,shell,[],.015);
  box(gauge,0,.093,0,.42,.015,.246,inset);
  for(let i=0;i<4;i++)box(gauge,-.135+i*.09,.103,0,.049,.008,.12,i===3?lime:cyan);

  const projector = new T.Group();projector.position.set(3.94,0,-1.47);scene.add(projector);
  extrude(projector,chamfer(0,0,1.81,1.44,.26),.00,.16,trim);
  cylinder(projector,0,.16,0,.66,.71,.24,inset,16);
  ring(projector,0,.286,0,.65,.025,pink);
  ring(projector,0,.29,0,.49,.021,cyan);
  cylinder(projector,0,.23,0,.19,.25,.09,cyan,8);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    const emitter=box(projector,Math.cos(a)*.561,.284,Math.sin(a)*.561,.095,.043,.095,i%2?pink:cyan);
    emitter.rotation.y=-a;
  }
  const beam = new T.Mesh(new T.CylinderGeometry(.71,.17,1.55,8,1,true),
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
  beam.position.y=1.06;projector.add(beam);

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
  function wings() {
    const left=new T.Group();left.position.set(-4.21,2.07,-1.69);left.rotation.y=.26;scene.add(left);
    const right=new T.Group();right.position.set(3.55,2.99,-1.85);right.rotation.y=-.26;scene.add(right);
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
    const acrylic=new T.Mesh(new T.PlaneGeometry(2.27,1.40),
      new T.MeshBasicMaterial({color:'#00ccff',transparent:true,opacity:.099,side:T.DoubleSide,depthWrite:false}));
    left.add(acrylic);
    acrylic.renderOrder=4;
    const markings=displayTexture(left,glass.texture,2.23,1.37,true,T.DoubleSide);
    markings.position.z=.013;markings.renderOrder=5;
    for(const y of [-.699,.699])box(left,0,y,-.004,2.25,.026,.044,cyan);
    for(const x of [-1.135,1.135]){
      box(left,x,0,0,.023,1.42,.029,mutedBlue);
      for(const side of [-1,1])box(left,x,side*.646,.012,.075,.10,.06,shell);
    }
    link(scene,[-4.47,.06,-1.79],[-4.74,1.05,-1.79],.13,.23,trim);
    link(scene,[-4.74,1.05,-1.79],[-4.60,1.38,-1.80],.12,.19,metal);
    extrude(scene,chamfer(-4.50,-1.79,1.16,.69,.14),.024,.12,trim);

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
    box(right,0,0,0,2.44,1.16,.102,shell);
    const screen=displayTexture(right,status.texture,2.33,1.038);
    screen.position.z=.059;
    box(right,.94,-.55,.063,.26,.028,.019,pink);
    link(scene,[4.91,.06,-2.10],[4.94,2.38,-2.10],.152,.24,trim);
    link(scene,[4.94,2.38,-2.10],[4.02,2.55,-1.92],.13,.19,shell);
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
  const panelX=.84,panelZ=-.36;
  extrude(scene,chamfer(panelX,panelZ,2.0,.99,.13),-.022,.054,trim,[],.012);
  const deskScreen=displayTexture(scene,deskGraphic.texture,1.86,.81);
  deskScreen.position.set(panelX,.048,panelZ);deskScreen.rotation.x=-Math.PI/2;
  box(scene,panelX,.053,panelZ+.475,1.45,.014,.031,cyan);
  for(let i=0;i<5;i++)box(scene,.64+i*.105,.042,-.91,.049,.009,.055,i===0?lime:mutedBlue);

  // Low-profile platform for the actual portfolio model.
  const slot=new T.Group();slot.position.set(2.89,.018,1.07);scene.add(slot);
  extrude(slot,chamfer(0,0,1.59,1.47,.21),0,.07,trim,[],.028);
  extrude(slot,chamfer(0,0,1.37,1.27,.16),.082,.02,inset,[],.011);
  box(slot,0,.056,.734,1.16,.019,.021,pink);
  for(const x of [-.61,.61])for(const z of [-.49,.49])box(slot,x,.11,z,.075,.009,.12,mutedBlue);

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
