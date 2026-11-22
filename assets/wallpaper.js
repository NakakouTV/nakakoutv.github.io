/* The wallpaper is a small relief model of the one-eyed slime and its block course.
   All positions are in course space. The screen print is rasterized at game resolution. */
(() => {
  'use strict';
  const ink = {
    black: '#0e071b', midnight: '#1a1932', indigo: '#2a2f4e', slate: '#424c6e',
    steel: '#657392', ice: '#94fdff', pearl: '#f9e6cf', mint: '#99e65f',
    cyan: '#00cdf9', blue: '#0069aa', cobalt: '#00396d', darkTeal: '#134c4c',
    teal: '#33984b', copper: '#c64524', flame: '#ed7614', gold: '#ffc825',
    peach: '#f6ca9f', white: '#ffffff', silver: '#c7cfdd'
  };
  const color = key => [1, 3, 5].map(i => parseInt(ink[key].slice(i, i + 2), 16) / 255);
  const colors = Object.fromEntries(Object.keys(ink).map(key => [key, color(key)]));
  const backgroundVertex = `
    attribute vec2 point;
    varying vec2 uv;
    void main(){ uv=point*.5+.5; gl_Position=vec4(point,0.,1.); }`;
  const backgroundFragment = `
    precision mediump float;
    uniform float seconds, aspect;
    varying vec2 uv;
    float grain(vec2 p){ return fract(sin(dot(mod(p,127.),vec2(13.1,7.7)))*437.7); }
    void main(){
      vec2 px=gl_FragCoord.xy, p=vec2((uv.x-.748)*aspect,uv.y-.56);
      float d=length(p), dots=step(2.7,mod(px.x + 2.*mod(px.y,2.),4.));
      float field=smoothstep(.07,.97,uv.x)*smoothstep(-.2,1.1,uv.y);
      vec3 c=mix(vec3(.055,.027,.106),vec3(.165,.184,.306),floor(field*5.+dots*.6)/5.);
      // Pinpricks and broken plotter lines live behind the artwork.
      vec2 stars=floor(px/7.);
      float star=step(.969,grain(stars))*step(mod(px.x,7.),.8)*step(mod(px.y,7.),.8);
      c+=vec3(.12,.20,.23)*star*smoothstep(.35,.65,uv.x);
      float sun=1.-smoothstep(.313,.317,d);
      float stripes=step(.54,mod(px.y,4.)*.25);
      float lower=1.-smoothstep(-.21,.06,p.y);
      vec3 solar=mix(vec3(.902,.612,.412),vec3(.753,.247,.141),lower);
      c=mix(c,solar,sun*(1.-lower*(1.-stripes)));
      float annulus=step(.324,d)*step(d,.327);
      c=mix(c,vec3(.753,.247,.141),annulus*.89);
      // Sparse drafting arcs turn around the high point of the circuit.
      float angle=atan(p.y,p.x);
      float arc=step(abs(d-.353),.0018)*step(.17,fract(angle*1.23+seconds*.012));
      float ticks=step(abs(d-.365),.004)*step(.944,fract(angle*10.186));
      c=mix(c,vec3(.573,.631,.725),max(arc,ticks)*.70);
      gl_FragColor=vec4(c,1.);
    }`;
  const sceneVertex = `
    attribute vec3 point, pigment, normal;
    attribute float component;
    uniform float aspect, seconds;
    varying vec3 surface, n, local;
    varying float part;
    void main(){
      vec3 p=point;
      float phase=(sin(seconds*1.1)+1.)*.5;
      float lift=4.*phase*(1.-phase);
      vec3 landing=vec3(mix(-.48,1.43,phase),2.13,0.);
      if(component>1.5 && component<2.5){
        // Separate pigmented ellipses remain glued to the receiving platform.
        p.xz*=1.-lift*.30; p+=landing;
      }else if(component>.5 && component<1.5){
        float compression=.90+.17*lift;
        p.y*=compression; p.xz/=sqrt(compression);
        p+=landing+vec3(0.,.027+lift*.88,0.);
      }
      vec3 right=vec3(.7682,0.,-.6402), up=vec3(-.3105,.8748,-.3726);
      vec3 eye=normalize(cross(right,up));
      vec3 delta=p-vec3(0.,1.10,0.);
      vec2 center=vec2(.44,-.10);
      gl_Position=vec4(center+vec2(dot(delta,right)/aspect,dot(delta,up))*.241,
                       -dot(delta,eye)*.055,1.);
      surface=pigment; n=normal; local=p; part=component;
    }`;
  const sceneFragment = `
    precision mediump float;
    varying vec3 surface,n,local; varying float part;
    void main(){
      vec3 c=surface;
      if(part>1.5 && part<2.5 && local.x>.19 && local.x<.50)discard;
      if(part>.5 && part<1.5){
        vec3 N=normalize(n);
        float light=dot(N,vec3(-.48,.78,.39));
        float stipple=step(2.9,mod(gl_FragCoord.x+2.*mod(gl_FragCoord.y,2.),4.));
        // Discrete ink ramps keep the tiny character legible through the CRT.
        if(c.b>c.r+.23){
          c=light<-.1?vec3(.0,.22,.43):light<.36+stipple*.11?vec3(.0,.41,.67):
            light<.80?vec3(.0,.60,.86):vec3(.0,.80,.98);
          if(dot(N,vec3(-.30,.76,.57))>.983)c=vec3(.58,.99,1.);
        }else if(c.r>.8 && light<.18)c=vec3(.57,.63,.73);
      }
      gl_FragColor=vec4(c,1.);
    }`;

  function course() {
    const vertices=[];
    const vertex=(p,shade,n,part=0)=>vertices.push(...p,...colors[shade],...n,part);
    function quad(points,shade,n=[0,1,0],part=0) {
      for(const i of [0,1,2,0,2,3]) vertex(points[i],shade,n,part);
    }
    function box(x,y,z,w,h,d,top,front,side=front){
      const a=x-w/2,b=x+w/2,c=z-d/2,e=z+d/2,f=y+h;
      quad([[a,f,c],[b,f,c],[b,f,e],[a,f,e]],top);
      quad([[a,y,e],[b,y,e],[b,f,e],[a,f,e]],front,[0,0,1]);
      quad([[b,y,e],[b,y,c],[b,f,c],[b,f,e]],side,[1,0,0]);
      quad([[a,y,c],[b,y,c],[b,f,c],[a,f,c]],side,[0,0,-1]);
      quad([[a,y,e],[a,y,c],[a,f,c],[a,f,e]],front,[-1,0,0]);
    }
    // Staggered chip packages form a walkable double-height central route.
    function tile(x,z,w,d,top,shade,front,side){
      box(x,top-.67,z,w-.15,.43,d-.13,'slate','indigo','midnight');
      box(x,top-.27,z,w,.21,d,'peach',front,side);
      box(x,top-.065,z,w+.014,.065,d+.016,shade,front,side);
      for(let dx=-w/2+.19;dx<w/2-.05;dx+=.31)
        box(x+dx,top-.45,z+d/2-.015,.092,.14,.07,'silver','steel','slate');
      for(let dz=-d/2+.20;dz<d/2-.05;dz+=.31)
        box(x+w/2-.012,top-.43,z+dz,.075,.105,.089,'peach','copper','steel');
    }
    tile(-1.46,-1.51,1.22,1.20,1.47,'pearl','steel','slate');
    tile(.18,-1.57,1.86,.98,1.67,'cyan','blue','cobalt');
    tile(1.91,-1.32,1.02,1.48,1.39,'peach','flame','copper');
    tile(-2.35,.18,.98,1.05,.86,'cyan','blue','cobalt');
    tile(-1.41,.10,.74,1.20,1.40,'ice','blue','cobalt');
    tile(-.40,.0,1.18,1.36,2.13,'ice','blue','cobalt');
    tile(1.35,.0,1.70,1.36,2.13,'gold','flame','copper');
    tile(2.50,.54,.67,.83,1.38,'pearl','steel','slate');
    tile(.50,1.53,1.18,1.24,1.15,'peach','flame','copper');
    tile(-.74,1.69,.95,1.34,.70,'cyan','blue','cobalt');
    tile(1.59,1.49,.76,.85,.79,'silver','steel','slate');
    // Exposed bus links and DIP pins cross the cutaway under the course.
    for (const z of [-.44,-.14,.16,.46])
      box(.39,1.74,z,.64,.082,.076,'peach','copper','copper');
    for (const x of [-1.09,-.84,-.59])
      box(x,.38,1.00,.075,.085,1.14,'gold','copper','copper');
    for (const [x,z,h] of [[-1.93,1.63,.18],[2.83,-1.27,.73],[-2.48,-.98,.30]]){
      box(x,h,z,.43,.40,.44,'ice','blue','cobalt');
      box(x,h-.15,z,.33,.145,.34,'slate','indigo','midnight');
    }
    // Small goal arch behind the runner; build a real open octagonal ring.
    const center=[.12,2.46,-1.58];
    function ringPoint(i,r,z){
      const a=(i+.5)*Math.PI/6;
      return [center[0]+r*Math.cos(a),center[1]+r*Math.sin(a),center[2]+z];
    }
    for(let i=0;i<12;i++){
      const p=(j,r,z)=>ringPoint(i+j,r,z);
      quad([p(0,.77,.12),p(1,.77,.12),p(1,.64,.12),p(0,.64,.12)],i%3===0?'pearl':'gold');
      quad([p(0,.77,-.13),p(1,.77,-.13),p(1,.77,.12),p(0,.77,.12)],i<6?'peach':'copper');
      quad([p(0,.64,-.13),p(1,.64,-.13),p(1,.64,.12),p(0,.64,.12)],'copper');
    }
    for (const x of [-.45,.70])box(x,1.65,-1.58,.15,.45,.25,'peach','slate','steel');
    // Chevrons are printed on the tread, not drawn over the screen.
    for (const x of [.94,1.23,1.52]){
      quad([[x,2.134,.47],[x+.09,2.134,.47],[x+.22,2.134,.34],[x+.13,2.134,.34]],'copper');
    }
    const landing=(x,z)=>[x,.008,z];
    for(let i=0;i<32;i++){
      const a=Math.PI*2*i/32,b=Math.PI*2*(i+1)/32;
      for(const p of [landing(0,0),landing(.52*Math.cos(a),.37*Math.sin(a)),landing(.52*Math.cos(b),.37*Math.sin(b))])
        vertex(p,'cobalt',[0,1,0],2);
    }
    function ellipsoid(center,size,shade){
      function sample(j,i){
        const latitude=Math.PI*j/18-Math.PI/2, a=Math.PI*i/16;
        const n=[Math.cos(latitude)*Math.cos(a),Math.sin(latitude),Math.cos(latitude)*Math.sin(a)];
        return [n.map((v,k)=>center[k]+v*size[k]),n];
      }
      for(let j=0;j<18;j++)for(let i=0;i<32;i++){
        for(const [dj,di] of [[0,0],[0,1],[1,1],[0,0],[1,1],[1,0]]){
          const [p,n]=sample(j+dj,i+di);
          vertex(p,shade,n,1);
        }
      }
    }
    // The official game icon is a blue ball with one conspicuous eye.
    ellipsoid([0,.64,0],[.72,.65,.70],'blue');
    ellipsoid([.42,.83,.42],[.305,.325,.268],'pearl');
    ellipsoid([.559,.85,.594],[.176,.192,.135],'black');
    ellipsoid([.566,.924,.691],[.060,.065,.043],'white');
    return new Float32Array(vertices);
  }

  window.initWallpaper=function initWallpaper(canvas){
    let gl,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,visible=true;
    let frame=0,elapsed=0,last=0,dirty=true,lost=false;
    const noRenderer={setVisible(){},setPaused(){}};
    try{gl=canvas.getContext('webgl',{alpha:false,depth:true,antialias:false,powerPreference:'low-power'});}catch{}
    if(!gl){canvas.style.visibility='hidden';return noRenderer;}
    function compile(type,src){
      const shader=gl.createShader(type);gl.shaderSource(shader,src);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
      return shader;
    }
    function pipeline(v,f){
      const pr=gl.createProgram();
      for(const [type,s] of [[gl.VERTEX_SHADER,v],[gl.FRAGMENT_SHADER,f]]){
        const sh=compile(type,s);gl.attachShader(pr,sh);gl.deleteShader(sh);
      }
      gl.linkProgram(pr);
      if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(pr));
      return {pr,seconds:gl.getUniformLocation(pr,'seconds'),aspect:gl.getUniformLocation(pr,'aspect')};
    }
    function buffer(data){
      const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return b;
    }
    let back,model,flat,relief,vertices,position,attributes;
    function prepare(){
      back=pipeline(backgroundVertex,backgroundFragment);model=pipeline(sceneVertex,sceneFragment);
      flat=buffer(new Float32Array([-1,-1,3,-1,-1,3]));
      const mesh=course();relief=buffer(mesh);vertices=mesh.length/10;
      position=gl.getAttribLocation(back.pr,'point');
      attributes=['point','pigment','normal','component'].map(key=>gl.getAttribLocation(model.pr,key));
      gl.disable(gl.CULL_FACE);
    }
    try{prepare();}catch{canvas.style.visibility='hidden';return noRenderer;}
    function uniforms(p,aspect){
      gl.useProgram(p.pr);gl.uniform1f(p.seconds,elapsed);gl.uniform1f(p.aspect,aspect);
    }
    function paint(){
      const w=canvas.clientWidth,h=canvas.clientHeight;
      if(!w||!h)return;
      const scale=Math.min(680/w,384/h,1),width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale));
      if(width!==canvas.width||height!==canvas.height){canvas.width=width;canvas.height=height;}
      gl.viewport(0,0,width,height);gl.clear(gl.DEPTH_BUFFER_BIT);
      const aspect=width/height;
      uniforms(back,aspect);gl.disable(gl.DEPTH_TEST);gl.bindBuffer(gl.ARRAY_BUFFER,flat);
      gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      gl.drawArrays(gl.TRIANGLES,0,3);gl.disableVertexAttribArray(position);
      uniforms(model,aspect);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.bindBuffer(gl.ARRAY_BUFFER,relief);
      attributes.forEach((a,i)=>{gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,i===3?1:3,gl.FLOAT,false,40,12*i);});
      gl.drawArrays(gl.TRIANGLES,0,vertices);attributes.forEach(a=>gl.disableVertexAttribArray(a));
    }
    function loop(now){
      frame=0;if(!visible||document.hidden||lost)return;
      if(dirty||!last||now-last>=48){
        if(!paused&&last)elapsed+=Math.min((now-last)/1000,.12);
        last=now;paint();dirty=false;
      }
      if(!paused)frame=requestAnimationFrame(loop);
    }
    function refresh(){
      cancelAnimationFrame(frame);frame=0;dirty=true;last=0;
      if(visible&&!document.hidden&&!lost)frame=requestAnimationFrame(loop);
    }
    new ResizeObserver(refresh).observe(canvas);
    document.addEventListener('visibilitychange',refresh);
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;canvas.style.visibility='hidden';refresh();});
    canvas.addEventListener('webglcontextrestored',()=>{try{prepare();lost=false;canvas.style.visibility='';refresh();}catch{}});
    refresh();
    return {setPaused(value){paused=Boolean(value);refresh();},setVisible(value){visible=Boolean(value);refresh();}};
  };
})();
