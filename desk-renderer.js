/* The artwork, CRT glass and instruments use one orthographic Blender camera per
   composition. Project DOM and small canvases from those same recorded faces. */
(() => {
  const stage = document.getElementById('workbench');
  const room = document.getElementById('room');
  const art = room.querySelector('img');
  const display = document.getElementById('display');
  const scope = document.getElementById('lighting');
  const clock = document.getElementById('instrument-clock');
  const drive = document.getElementById('cam-drive');
  const atlas = new Image();
  const cameras = JSON.parse(stage.dataset.camera);
  const tall = matchMedia('(max-aspect-ratio:3/4)');
  const square = matchMedia('(max-aspect-ratio:4/3)');
  const layer = document.createElement('div');
  layer.style.cssText = 'position:absolute;inset:0;transform-origin:0 0';
  stage.prepend(layer);
  layer.append(room,scope,clock,drive,display);

  let focused = false, paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let animation, timer, scopeVisible = false, clockVisible = false, driveVisible = false;
  let phase = 0, activity = 0, previous = 0, lastClock = '';
  const trace = scope.getContext('2d'), segments = clock.getContext('2d');
  const gearContext=drive.getContext('2d');
  let lastGear=-1;
  const movement = new Float32Array(85);
  function faceMatrix(corners, width, height) {
    const [a,b,,d]=corners;
    return new DOMMatrix([(b.x-a.x)/width,(b.y-a.y)/width,(d.x-a.x)/height,(d.y-a.y)/height,a.x,a.y]);
  }
  function placeInstrument(canvas,points,w,h){
    canvas.style.transform=faceMatrix(points,canvas.width,canvas.height).toString();
    const visible=Math.max(...points.map(p=>p.x))>0 && Math.min(...points.map(p=>p.x))<w &&
                  Math.max(...points.map(p=>p.y))>0 && Math.min(...points.map(p=>p.y))<h;
    canvas.hidden=!visible;
    return visible;
  }
  function layout(transition=false){
    if(stage.classList.contains('live-bench'))return;
    const w=stage.clientWidth,h=stage.clientHeight;
    if(!w||!h)return;
    const cam=tall.matches?cameras.tall:square.matches?cameras.square:cameras.wide;
    const screenSpan=Math.max(...cam.screen.map(p=>p[0]))-Math.min(...cam.screen.map(p=>p[0]));
    // Protect the aperture on slim phones; retain the worktop on panoramic screens.
    const scale=Math.min(Math.max(w/cam.width,h/cam.height),
      w*.945/(screenSpan*cam.width),h*1.18/cam.height);
    const rw=cam.width*scale,rh=cam.height*scale,left=(w-rw)/2,top=(h-rh)/2;
    Object.assign(room.style,{width:rw+'px',height:rh+'px',left:left+'px',top:top+'px'});
    const points=key=>cam[key].map(([x,y])=>({x:left+x*rw,y:top+y*rh}));
    scopeVisible=placeInstrument(scope,points('scope'),w,h);
    clockVisible=placeInstrument(clock,points('clock'),w,h);
    const [x,y,gw,gh]=cam.gears;
    const dx=left+x*rw,dy=top+y*rh;
    Object.assign(drive.style,{left:dx+'px',top:dy+'px',width:gw*rw+'px',height:gh*rh+'px'});
    driveVisible=dx<w && dx+gw*rw>0 && dy<h && dy+gh*rh>0;
    if(!driveVisible)drive.hidden=true;
    if(driveVisible&&!focused&&!paused&&!atlas.src)atlas.src='assets/cam-drive.webp';
    const glass=points('screen');
    const length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    const glassWidth=length(glass[0],glass[1]);
    const width=focused?w:Math.max(540,Math.round(glassWidth));
    const height=focused?h:Math.round(width*length(glass[0],glass[3])/glassWidth);
    const plane=faceMatrix(glass,width,height);
    Object.assign(display.style,{width:width+'px',height:height+'px',transform:plane.toString()});
    const target=focused?plane.inverse():new DOMMatrix();
    const current=getComputedStyle(layer).transform;
    animation?.cancel();layer.style.transform=target.toString();
    if(transition&&!paused)animation=layer.animate(
      [{transform:current==='none'?new DOMMatrix().toString():current},{transform:target.toString()}],
      {duration:420,easing:'cubic-bezier(.2,.72,.15,1)'});
    refresh();
  }

  function line(ctx,color,width,sample){
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();
    for(let x=0;x<=scope.width;x+=2){
      const y=sample(x/scope.width)*scope.height;
      if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }
  function paintScope(dt){
    if(!scopeVisible||!trace)return;
    if(!paused && dt>0){
      movement.copyWithin(0,1);movement[movement.length-1]=activity;
      activity*=Math.exp(-7*dt);
    }
    trace.clearRect(0,0,scope.width,scope.height);
    const signal=x=>.405+.15*Math.sin(x*18.85+phase*2.4)+.045*Math.sin(x*37.7+phase*4.8);
    // Channel one is a reference signal; channel two records pointer/key activity.
    line(trace,'rgba(12,241,255,.20)',7,signal);line(trace,'#94fdff',2.4,signal);
    line(trace,'#edab50',2,x=>.80-.22*movement[Math.round(x*(movement.length-1))]);
  }
  function paintDrive(){
    if(!driveVisible||!atlas.naturalWidth||!gearContext)return;
    // The exposed lock advances, dwells, then returns. Each sample contains the
    // three physical wheels at angles determined by their actual tooth counts.
    const stroke=Math.max(0,Math.min(1,.5-.69*Math.cos(phase*1.55)));
    const frame=Math.round(14*stroke);
    if(frame!==lastGear){
      const w=atlas.naturalWidth/5,h=atlas.naturalHeight/3;
      if(drive.width!==w||drive.height!==h){drive.width=w;drive.height=h}
      gearContext.clearRect(0,0,w,h);
      gearContext.drawImage(atlas,(frame%5)*w,Math.floor(frame/5)*h,w,h,0,0,w,h);
      lastGear=frame;
    }
    drive.hidden=frame===0;
  }

  const bars=[
    [[4,1],[24,1],[20,5],[8,5]],[[25,2],[25,18],[21,16],[21,7]],
    [[25,21],[25,37],[21,33],[21,24]],[[4,38],[24,38],[20,34],[8,34]],
    [[3,21],[7,24],[7,33],[3,37]],[[3,2],[7,7],[7,16],[3,18]],
    [[4,19],[9,17],[20,17],[24,19],[20,21],[9,21]]
  ];
  const digits=['abcdef','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg'];
  function paintClock(){
    if(!clockVisible||!segments)return;
    const now=new Date();
    const stamp=[now.getHours(),now.getMinutes(),now.getSeconds()].map(n=>String(n).padStart(2,'0')).join(':');
    if(stamp===lastClock)return;lastClock=stamp;
    segments.clearRect(0,0,clock.width,clock.height);
    let x=12;
    for(const char of stamp){
      if(char===':'){
        segments.fillStyle='#edab50';segments.fillRect(x+1,14,4,4);segments.fillRect(x+1,27,4,4);x+=15;continue;
      }
      bars.forEach((points,i)=>{
        segments.fillStyle=digits[Number(char)].includes('abcdefg'[i])?'#f6ca9f':'#352b2a';
        segments.beginPath();
        points.forEach(([dx,dy],j)=>j?segments.lineTo(x+dx,dy+2):segments.moveTo(x+dx,dy+2));
        segments.closePath();segments.fill();
      });
      x+=36;
    }
  }
  function render(){
    clearTimeout(timer);
    if(focused||document.hidden||(!scopeVisible&&!clockVisible&&!driveVisible)){previous=0;return}
    const now=performance.now();
    const dt=previous?(now-previous)/1000:0;
    if(!paused)phase+=Math.min(dt,.12);
    paintScope(dt);paintClock();paintDrive();previous=now;
    if(!paused)timer=setTimeout(render,scopeVisible||driveVisible?72:1000);
  }
  function refresh(){previous=0;render()}
  stage.addEventListener('pointermove',e=>{
    if(!paused&&!focused)activity=Math.min(1,activity+Math.hypot(e.movementX,e.movementY)/100);
  },{passive:true});
  stage.addEventListener('keydown',()=>{if(!paused&&!focused)activity=1});
  document.addEventListener('visibilitychange',refresh);
  window.benchCamera={
    setFocus(value,transition=true){
      if(value===focused)return;
      focused=value;stage.classList.toggle('focused',value);layout(transition);
    },
    get focused(){return focused},
    setPaused(value){paused=value;if(!value&&driveVisible&&!atlas.src)atlas.src='assets/cam-drive.webp';refresh()},
    refresh:layout
  };
  art.addEventListener('load',()=>layout());
  atlas.addEventListener('load',refresh);
  new ResizeObserver(()=>layout()).observe(stage);
})();
