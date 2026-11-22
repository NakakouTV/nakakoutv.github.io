import * as T from './assets/three.module.js';
import {createLab} from './bench-lab.js?v=bench-2';
import {createBenchOptics} from './bench-optics.js';

export function createWorkbench(stage) {
  const display = document.getElementById('display');
  const fallback = document.getElementById('room');
  const tools = document.getElementById('bench-controls');
  const scene = new T.Scene();
  scene.background = new T.Color(0x0a0a14);
  scene.fog = new T.FogExp2(0x12101e,.018);
  const camera = new T.PerspectiveCamera(39,1,.1,60);
  const renderer = new T.WebGLRenderer({antialias:false});
  stage.classList.add('live-bench');
  tools.hidden=false;
  renderer.domElement.className='bench-3d';
  stage.prepend(renderer.domElement);
  stage.append(display);
  display.style.removeProperty('width');
  display.style.removeProperty('height');
  display.style.removeProperty('transform');
  fallback.hidden=true;
  const optics=createBenchOptics(renderer);
  scene.add(new T.HemisphereLight(0xc8ddff,0x504065,1.9));
  function light(color,intensity,x,y,z){
    const lamp=new T.PointLight(color,intensity,22,2);
    lamp.position.set(x,y,z);scene.add(lamp);
  }
  light(0x00ccff,37,-4,3.7,2);light(0xff44cc,54,4,3.6,-1);
  const key=new T.DirectionalLight(0xe8e8ff,1.85);key.position.set(-3,6,6);scene.add(key);

  const lab=createLab(scene);
  const {box,slot,shell,trim,metal,cyan}=lab;
  const floor=new T.MeshStandardMaterial({color:0x242137,roughness:.92});
  box(scene,0,-2.79,0,100,.1,100,floor);
  const grid=new T.GridHelper(70,70,0x454474,0x272741);
  grid.position.y=-2.73;scene.add(grid);

  const monitor=new T.Group();monitor.position.set(-.47,0,-1.56);scene.add(monitor);
  const screenW=4.95,screenH=2.81,screenY=2.42,screenZ=.10;
  const bezel=new T.MeshStandardMaterial({color:0x17172c,roughness:.51,metalness:.26});
  box(monitor,0,screenY,-.054,5.15,3.01,.12,trim);
  box(monitor,0,screenY,.024,5.075,2.94,.135,bezel);
  box(monitor,0,screenY,-.133,2.20,1.23,.119,trim);
  box(monitor,0,screenY-.34,-.201,1.81,.30,.030,bezel);
  for(let i=0;i<14;i++)box(monitor,-1.005+i*.154,2.82,-.199,.062,.22,.018,bezel);
  for(let i=0;i<4;i++)box(monitor,-.68+i*.19,screenY-.36,-.220,.123,.056,.017,metal);
  box(monitor,2.10,.968,.086,.079,.014,.022,cyan);
  for(let i=0;i<3;i++)box(monitor,2.22+i*.07,.964,.085,.036,.021,.026,metal);
  for(const side of [-1,1]){
    const arm=box(monitor,side*.54,.63,-.125,.123,1.23,.21,metal);
    arm.rotation.z=side*.35;
    const accent=box(monitor,side*.54,.63,-.236,.082,1.05,.027,bezel);
    accent.rotation.z=side*.35;
    box(monitor,side*.36,1.16,-.165,.228,.168,.22,trim);
    box(monitor,side*.74,.078,-.05,.42,.126,.70,shell);
    box(monitor,side*.74,.099,.31,.24,.031,.035,cyan);
  }
  const surface=new T.Mesh(new T.PlaneGeometry(screenW,screenH),new T.MeshBasicMaterial({color:0x11101e}));
  surface.position.set(0,screenY,screenZ);monitor.add(surface);
  new T.TextureLoader().load('assets/wallpaper.webp',texture=>{
    texture.colorSpace=T.SRGBColorSpace;
    surface.material.map=texture;surface.material.color.set(0xffffff);surface.material.needsUpdate=true;dirty=true;
  });

  // A recessed service corridor frames the front view and stays behind the desk.
  const corridor=new T.Group();
  corridor.position.z=-12.5;corridor.scale.set(1.63,1.33,1);scene.add(corridor);
  const wall=new T.MeshStandardMaterial({color:0x262640,roughness:.9});
  const darkWall=new T.MeshStandardMaterial({color:0x181c32,roughness:.9});
  const bluePixel=new T.MeshBasicMaterial({color:0x1870a8});
  for(let i=0;i<10;i++){
    const x=-11.7+i*2.6,height=4.1+(i%4)*.61;
    box(corridor,x,height/2-1.9,-8.4,2.18,height,.27,i%3===1?wall:darkWall);
    box(corridor,x,height-1.9,-8.247,1.99,.038,.027,trim);
    for(let row=0;row<3;row++)for(let col=0;col<4;col++){
      if((i*11+row*7+col*3)%7<4)continue;
      box(corridor,x-.68+col*.40,.49+row*.39,-8.247,.17,.065,.021,(row+col+i)%6===0?bluePixel:trim);
    }
  }
  box(corridor,0,4.47,-8.23,24,.048,.093,trim);
  box(corridor,-5.3,4.47,-8.171,5.4,.025,.02,bluePixel);

  const project=new T.Group();slot.add(project);
  const backdrop = document.getElementById('project-details');
  const projectButton=document.getElementById('inspect-safe');
  const liftButton=document.getElementById('toggle-lift');
  let available=false, focused=false, paused=false, dirty=true, inspection=false;
  const home={theta:.10,phi:1.08,radius:14.50,target:new T.Vector3(0,.78,-.18)};
  let {theta,phi,radius}=home;
  let liftRaised=true,liftHeight=.62,elapsed=0,lastFrame=0;
  const target=home.target.clone(), current=new T.Vector3(), look=new T.Vector3();
  const projectCenter=new T.Vector3(slot.position.x,.52,slot.position.z);
  const aim=new T.Vector3();
  const pick=new T.Raycaster();
  const clickable=new T.Vector2();
  const worktopPlane=new T.Plane(new T.Vector3(0,1,0),0);
  const contact=new T.Vector3();
  const screenCorners=[[-1,1],[1,1],[1,-1],[-1,-1]].map(([x,y])=>new T.Vector3(x*screenW/2,y*screenH/2,0));
  const load=fetch('assets/safe-040.bin').then(response=>{
    if(!response.ok)throw Error(response.status);
    return response.arrayBuffer();
  }).then(binary=>{
    const data=new DataView(binary);let offset=0;
    const uint=()=>{const n=data.getUint32(offset,true);offset+=4;return n};
    const parts=uint();
    for(let i=0;i<parts;i++){
      const vertices=uint(),faces=uint(),color=uint(),geo=new T.BufferGeometry();
      const xyz=new Float32Array(binary,offset,vertices*3);offset+=xyz.byteLength;
      const indices=new Uint32Array(binary,offset,faces*3);offset+=indices.byteLength;
      geo.setAttribute('position',new T.BufferAttribute(xyz,3));
      geo.setIndex(new T.BufferAttribute(indices,1));
      const flat=geo.toNonIndexed();flat.computeVertexNormals();geo.dispose();
      project.add(new T.Mesh(flat,new T.MeshStandardMaterial({color,roughness:.83,side:T.DoubleSide})));
    }
    const bounds=new T.Box3().setFromObject(project),center=bounds.getCenter(new T.Vector3());
    const span=bounds.getSize(new T.Vector3());
    const scale=1.03/Math.max(span.x,span.y,span.z);
    project.scale.setScalar(scale);
    project.position.set(-center.x*scale,.118-bounds.min.y*scale,-center.z*scale);
    projectCenter.y=slot.position.y+.118+span.y*scale/2;
    available=true;dirty=true;
  }).catch(()=>{document.getElementById('project-status').hidden=false});
  function setInspection(value){
    inspection=value;backdrop.hidden=!value;
    target.copy(value?projectCenter:home.target);
    theta=value?.63:home.theta;phi=value?1.12:home.phi;radius=value?2.95:home.radius;
    dirty=true;
  }
  function toggleLift(){
    liftRaised=!liftRaised;
    liftButton.setAttribute('aria-pressed',String(liftRaised));
    liftButton.textContent=liftRaised?'リフトを収納':'リフトを上げる';
    dirty=true;
  }
  liftButton.onclick=toggleLift;
  projectButton.onclick=()=>{if(focused)window.benchCamera.setFocus(false);setInspection(true)};
  document.getElementById('back-desk').onclick=()=>{setInspection(false);projectButton.focus()};
  document.getElementById('reset-view').onclick=()=>setInspection(false);
  function fit() {
    const w=stage.clientWidth,h=stage.clientHeight;
    if(!w||!h)return;
    optics.resize(w,h);
    camera.aspect=w/h;camera.updateProjectionMatrix();
    dirty=true;
  }
  function matrix(points,w,h){
    const [a,b,c,d]=points;
    const x1=b.x-c.x,x2=d.x-c.x,y1=b.y-c.y,y2=d.y-c.y;
    const sx=a.x-b.x+c.x-d.x,sy=a.y-b.y+c.y-d.y;
    const div=x1*y2-x2*y1;
    const g=(sx*y2-x2*sy)/div,k=(x1*sy-sx*y1)/div;
    return new DOMMatrix([(b.x-a.x+g*b.x)/w,(b.y-a.y+g*b.y)/w,0,g/w,
      (d.x-a.x+k*d.x)/h,(d.y-a.y+k*d.y)/h,0,k/h,0,0,1,0,a.x,a.y,0,1]);
  }
  function projectScreen(){
    if(focused)return;
    const w=stage.clientWidth,h=stage.clientHeight;
    const facing=camera.position.z>monitor.position.z+screenZ+.16;
    const points=screenCorners.map(point=>surface.localToWorld(point.clone()).project(camera))
      .map(p=>({x:(p.x+1)*w/2,y:(1-p.y)*h/2}));
    const area=Math.abs((points[1].x-points[0].x)*(points[3].y-points[0].y)-(points[1].y-points[0].y)*(points[3].x-points[0].x));
    const visible=facing&&area>400&&!inspection;
    display.style.visibility=visible?'':'hidden';
    if(visible)display.style.transform=matrix(points,800,454).toString();
  }
  function render(now=0){
    requestAnimationFrame(render);
    if(focused||document.hidden){lastFrame=0;return}
    if(!dirty&&(paused||lastFrame&&now-lastFrame<42))return;
    const seconds=lastFrame?Math.min((now-lastFrame)/1000,.08):0;
    lastFrame=now;
    if(!paused)elapsed+=seconds;
    const liftDestination=liftRaised?.62:-.88;
    liftHeight=T.MathUtils.lerp(liftHeight,liftDestination,paused?1:Math.min(.75,seconds*8));
    if(Math.abs(liftHeight-liftDestination)<.002)liftHeight=liftDestination;
    lab.update({time:elapsed,angle:theta,liftHeight,raised:liftRaised,inspection});
    const aspect=camera.aspect;
    const distance=radius*Math.max(1,(inspection?.74:1.31)/aspect);
    aim.setFromSphericalCoords(distance,phi,theta).add(target);
    const amount=paused?1:.18;
    current.lerp(aim,amount);look.lerp(target,amount);
    camera.position.copy(current);camera.lookAt(look);
    corridor.visible=camera.position.z>-19.6;
    optics.render(scene,camera);
    projectScreen();
    dirty=current.distanceToSquared(aim)+look.distanceToSquared(target)>.00001;
  }
  const canvas=renderer.domElement;
  let drag;
  canvas.addEventListener('pointerdown',e=>{
    if(!e.isPrimary)return;
    drag={x:e.clientX,y:e.clientY,total:0};canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    drag.total+=Math.abs(dx)+Math.abs(dy);drag.x=e.clientX;drag.y=e.clientY;
    if(drag.total<4)return;
    theta-=dx*.008;phi=T.MathUtils.clamp(phi-dy*.008,.37,1.51);dirty=true;
  });
  canvas.addEventListener('pointerup',e=>{
    if(!drag||!e.isPrimary)return;
    const select=drag.total<5;drag=null;
    if(!select||inspection)return;
    clickable.set(e.clientX/stage.clientWidth*2-1,1-e.clientY/stage.clientHeight*2);
    pick.setFromCamera(clickable,camera);
    // Hit the portfolio object only when it is in front of the opaque equipment.
    const firstSurface=pick.intersectObjects(scene.children,true)
      .find(hit=>hit.object.isMesh&&!hit.object.material.transparent);
    if(available&&firstSurface?.object.parent===project){setInspection(true);return}
    const onWell=pick.ray.intersectPlane(worktopPlane,contact) &&
      Math.hypot(contact.x-lab.lift.position.x,contact.z-lab.lift.position.z)<.81;
    if(onWell||(liftRaised&&pick.intersectObject(lab.lift,true).length))toggleLift();
  });
  canvas.addEventListener('lostpointercapture',()=>{drag=null});
  canvas.addEventListener('wheel',e=>{
    e.preventDefault();
    radius=T.MathUtils.clamp(radius+e.deltaY*.006,inspection?1.8:7.3,inspection?7:22);
    dirty=true;
  },{passive:false});
  canvas.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault();
    theta+=(e.key==='ArrowLeft'?-.15:e.key==='ArrowRight'?.15:0);
    phi=T.MathUtils.clamp(phi+(e.key==='ArrowUp'?.10:e.key==='ArrowDown'?-.10:0),.37,1.51);
    dirty=true;
  });
  canvas.tabIndex=0;canvas.setAttribute('aria-label','工作机の視点。ドラッグまたは矢印キーで回転');
  current.set(1,4,10);look.copy(target);
  new ResizeObserver(fit).observe(stage);
  fit();render();
  return {
    get focused(){return focused},
    setFocus(value){
      focused=value;
      if(value&&inspection)setInspection(false);
      stage.classList.toggle('focused',value);
      tools.hidden=value;
      display.style.visibility='';
      display.style.transform=value?'none':'';
      if(!value)projectScreen();
      dirty=true;
    },
    setPaused(value){paused=value;dirty=true},
    refresh:fit,
    loaded:load
  };
}
