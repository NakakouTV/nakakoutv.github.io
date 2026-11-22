import * as T from './assets/three.module.js';

// The opaque scene and composite share the display's drawing-buffer resolution.
// Only the diffuse halo is filtered at a smaller resolution.
export function createBenchOptics(renderer) {
  const type=renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType;
  const sceneColor=new T.WebGLRenderTarget(1,1,{type});
  const bright=new T.WebGLRenderTarget(1,1,{type,depthBuffer:false});
  const blurred=new T.WebGLRenderTarget(1,1,{type,depthBuffer:false});
  const post=new T.Scene();
  const screen=new T.Camera();
  const vertexShader=`
    varying vec2 sampleUv;
    void main() {
      sampleUv=uv;
      gl_Position=vec4(position.xy,0.,1.);
    }
  `;
  function shader(uniforms,fragment) {
    return new T.ShaderMaterial({
      uniforms,vertexShader,depthTest:false,depthWrite:false,toneMapped:false,
      fragmentShader:`varying vec2 sampleUv;${fragment}`,
    });
  }
  const isolate=shader({source:{value:sceneColor.texture}},`
    uniform sampler2D source;
    void main() {
      vec3 rgb=texture2D(source,sampleUv).rgb;
      float peak=max(rgb.r,max(rgb.g,rgb.b));
      float low=min(rgb.r,min(rgb.g,rgb.b));
      float chroma=(peak-low)/max(peak,.001);
      // Keep the diffusion on lit indicators and projections, away from light paint.
      float emission=smoothstep(.40,.89,peak)*smoothstep(.38,.84,chroma);
      gl_FragColor=vec4(min(rgb,vec3(1.65))*emission,1.);
    }
  `);
  const diffuse=shader({source:{value:null},stepUv:{value:new T.Vector2()}},`
    uniform sampler2D source;
    uniform vec2 stepUv;
    void main() {
      vec3 center=texture2D(source,sampleUv).rgb*.227027;
      vec3 closePair=texture2D(source,sampleUv+stepUv*1.384615).rgb+
                     texture2D(source,sampleUv-stepUv*1.384615).rgb;
      vec3 farPair=texture2D(source,sampleUv+stepUv*3.230769).rgb+
                   texture2D(source,sampleUv-stepUv*3.230769).rgb;
      gl_FragColor=vec4(center+closePair*.316216+farPair*.070270,1.);
    }
  `);
  const composite=shader({source:{value:sceneColor.texture},halo:{value:bright.texture}},`
    uniform sampler2D source,halo;
    void main() {
      vec3 rgb=texture2D(source,sampleUv).rgb;
      vec3 glow=texture2D(halo,sampleUv).rgb;
      // A soft shoulder preserves detail on white surfaces under the task lights.
      float peak=max(rgb.r,max(rgb.g,rgb.b));
      rgb*=min(1.,(.78+.22*(1.-exp(-max(peak-.78,0.)/.22)))/max(peak,.0001));
      gl_FragColor=vec4(rgb+glow*.26,1.);
      #include <colorspace_fragment>
    }
  `);
  const quad=new T.Mesh(new T.PlaneGeometry(2,2),isolate);
  quad.frustumCulled=false;
  post.add(quad);
  const pixels=new T.Vector2();

  function pass(material,target) {
    quad.material=material;
    renderer.setRenderTarget(target);
    renderer.render(post,screen);
  }
  return {
    resize(width,height) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
      renderer.setSize(width,height,false);
      renderer.getDrawingBufferSize(pixels);
      sceneColor.samples=pixels.x*pixels.y<=3_000_000?Math.min(4,renderer.capabilities.maxSamples):0;
      sceneColor.setSize(pixels.x,pixels.y);
      const haloWidth=Math.max(1,Math.ceil(pixels.x/2)),haloHeight=Math.max(1,Math.ceil(pixels.y/2));
      bright.setSize(haloWidth,haloHeight);
      blurred.setSize(haloWidth,haloHeight);
    },
    render(scene,camera) {
      renderer.setRenderTarget(sceneColor);
      renderer.render(scene,camera);
      pass(isolate,bright);
      diffuse.uniforms.source.value=bright.texture;
      diffuse.uniforms.stepUv.value.set(1/bright.width,0);
      pass(diffuse,blurred);
      diffuse.uniforms.source.value=blurred.texture;
      diffuse.uniforms.stepUv.value.set(0,1/bright.height);
      pass(diffuse,bright);
      pass(composite,null);
    },
  };
}
