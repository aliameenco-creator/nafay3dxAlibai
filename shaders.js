// Five interactive cursor-reactive WebGL shaders for the playground.
// Each is a full-screen fragment shader with uniforms: uTime, uMouse, uRes, uClick, uTheme.
// API: createShader(canvas, index) => { destroy() }

const VERT = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAGS = [
  // 0 — Liquid Ink: cursor pulls warm ink through cool depth
  `precision highp float;
  uniform vec2 uRes; uniform vec2 uMouse; uniform float uTime; uniform float uClick; uniform float uTheme;
  vec3 hash3(vec2 p){ return fract(sin(vec3(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)),dot(p,vec2(419.2,371.9))))*43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
    return mix(mix(hash3(i).x, hash3(i+vec2(1,0)).x, u.x), mix(hash3(i+vec2(0,1)).x, hash3(i+vec2(1,1)).x, u.x), u.y); }
  float fbm(vec2 p){ float v=0.; float a=.5; for(int i=0;i<6;i++){ v+=a*noise(p); p*=2.02; a*=.5; } return v; }
  void main(){
    vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
    vec2 m=(uMouse-.5*uRes)/uRes.y;
    float d=length(uv-m);
    vec2 p=uv*1.5;
    p+=.4*vec2(fbm(p+uTime*.05+m), fbm(p-uTime*.04-m));
    float n=fbm(p*1.2);
    float pull=smoothstep(.9,0., d)*.7 + uClick*.5*exp(-d*4.);
    n=mix(n, fbm(p*2.+m*3.), pull);
    vec3 dark=vec3(.04,.05,.08);
    vec3 mid=vec3(.12,.10,.14);
    vec3 amber=vec3(1.,.55,.18);
    vec3 col=mix(dark, mid, smoothstep(.2,.7,n));
    col=mix(col, amber, smoothstep(.55,.85,n)*pull*1.4);
    col+=amber*.15*exp(-d*5.);
    if(uTheme>.5){ col=1.-col*.85; col=mix(col, amber*.9, smoothstep(.55,.85,n)*pull*.6); col*=.94; }
    gl_FragColor=vec4(col,1.);
  }`,

  // 1 — Aurora Field: silky bands warp around cursor
  `precision highp float;
  uniform vec2 uRes; uniform vec2 uMouse; uniform float uTime; uniform float uClick; uniform float uTheme;
  void main(){
    vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
    vec2 m=(uMouse-.5*uRes)/uRes.y;
    float t=uTime*.15;
    float d=length(uv-m);
    float warp=.6*exp(-d*1.5)+uClick*.4;
    vec2 p=uv;
    p.x+=sin(p.y*2.+t+m.x*2.)*.3*(1.+warp);
    p.y+=cos(p.x*2.5+t*.7+m.y*2.)*.25*(1.+warp);
    float band=sin(p.y*4.+p.x*2.+t)*.5+.5;
    band*=sin(p.x*3.-t*.8)*.5+.5;
    vec3 a=vec3(.02,.03,.06);
    vec3 b=vec3(.55,.25,.45);
    vec3 c=vec3(1.,.6,.2);
    vec3 col=mix(a,b,band);
    col=mix(col,c,pow(band,3.)*.8);
    col+=c*.3*exp(-d*3.)*warp;
    if(uTheme>.5){ col=vec3(.96,.95,.92)-col*.6; col+=c*.1*exp(-d*3.)*warp; }
    gl_FragColor=vec4(col,1.);
  }`,

  // 2 — Voronoi Cells: cursor is a moving site that pushes the lattice
  `precision highp float;
  uniform vec2 uRes; uniform vec2 uMouse; uniform float uTime; uniform float uClick; uniform float uTheme;
  vec2 hash2(vec2 p){ return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453); }
  void main(){
    vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
    vec2 m=(uMouse-.5*uRes)/uRes.y;
    vec2 p=uv*4.;
    vec2 i=floor(p), f=fract(p);
    float d1=8., d2=8.;
    for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
      vec2 g=vec2(x,y);
      vec2 o=hash2(i+g);
      o=.5+.5*sin(uTime*.5+6.28*o);
      vec2 r=g+o-f;
      float d=dot(r,r);
      if(d<d1){ d2=d1; d1=d; } else if(d<d2){ d2=d; }
    }
    float edge=sqrt(d2)-sqrt(d1);
    float cursor=smoothstep(.7,0.,length(uv-m))*(1.+uClick*1.5);
    float e=smoothstep(.0,.05,edge);
    vec3 dark=vec3(.05,.05,.07);
    vec3 amber=vec3(1.,.55,.18);
    vec3 col=mix(amber*.6, dark, e);
    col=mix(col, amber, (1.-e)*cursor*1.2);
    col+=amber*.2*cursor;
    if(uTheme>.5){ col=mix(vec3(.95,.94,.9), vec3(.1,.09,.08), 1.-e*.7); col=mix(col, amber*.9, (1.-e)*cursor); }
    gl_FragColor=vec4(col,1.);
  }`,

  // 3 — Gravity Wells: ripple grid that bends toward cursor
  `precision highp float;
  uniform vec2 uRes; uniform vec2 uMouse; uniform float uTime; uniform float uClick; uniform float uTheme;
  void main(){
    vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
    vec2 m=(uMouse-.5*uRes)/uRes.y;
    vec2 d=uv-m;
    float dist=length(d);
    float pull=(.25+uClick*.4)/(dist+.15);
    vec2 warped=uv-normalize(d+1e-5)*pull*.15;
    float grid=0.;
    vec2 g=warped*8.;
    vec2 gf=abs(fract(g)-.5);
    float lines=smoothstep(.48,.5,max(gf.x,gf.y));
    float ripple=sin(dist*30.-uTime*2.)*.5+.5;
    ripple*=exp(-dist*2.);
    vec3 dark=vec3(.03,.04,.06);
    vec3 amber=vec3(1.,.55,.18);
    vec3 col=mix(dark, dark+vec3(.05,.04,.08), lines);
    col+=amber*ripple*.6;
    col+=amber*.4*exp(-dist*4.)*(1.+uClick);
    if(uTheme>.5){ col=vec3(.96,.95,.92)-col*.7; col+=amber*.2*exp(-dist*4.)*(1.+uClick); }
    gl_FragColor=vec4(col,1.);
  }`,

  // 4 — Particle Constellation: dot field gravitates to cursor
  `precision highp float;
  uniform vec2 uRes; uniform vec2 uMouse; uniform float uTime; uniform float uClick; uniform float uTheme;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  void main(){
    vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
    vec2 m=(uMouse-.5*uRes)/uRes.y;
    vec3 col=vec3(.02,.03,.05);
    float field=0.;
    for(int i=0;i<24;i++){
      float fi=float(i);
      vec2 base=vec2(hash(vec2(fi,1.))*2.-1., hash(vec2(fi,2.))*2.-1.)*1.5;
      float t=uTime*.2+fi;
      base+=.3*vec2(sin(t),cos(t*.7));
      vec2 toM=m-base;
      base+=toM*(.3+uClick*.4)*smoothstep(2.,0.,length(toM));
      float d=length(uv-base);
      field+=.008/(d+.01);
    }
    vec3 amber=vec3(1.,.55,.18);
    col+=amber*field;
    float halo=exp(-length(uv-m)*4.)*.3*(1.+uClick);
    col+=amber*halo;
    if(uTheme>.5){ col=vec3(.96,.95,.92)-vec3(.02,.03,.05); col-=amber*field*.4; col=clamp(col,0.,1.); col+=amber*halo*.5; }
    gl_FragColor=vec4(col,1.);
  }`
];

export function createShader(canvas, idx, opts={}){
  const gl = canvas.getContext('webgl', { antialias:false, alpha:true, premultipliedAlpha:false });
  if(!gl){ canvas.style.background='#0a0a0c'; return { destroy(){} }; }

  function compile(type, src){
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
      console.error(gl.getShaderInfoLog(s));
    }
    return s;
  }
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAGS[idx % FRAGS.length]);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uMouse = gl.getUniformLocation(prog, 'uMouse');
  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uClick = gl.getUniformLocation(prog, 'uClick');
  const uTheme = gl.getUniformLocation(prog, 'uTheme');

  const state = { mouse:[canvas.width/2, canvas.height/2], target:[canvas.width/2, canvas.height/2], click:0, theme:0, raf:0, alive:true };

  function resize(){
    const dpr = Math.min(window.devicePixelRatio||1, 2);
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, r.width*dpr);
    canvas.height = Math.max(1, r.height*dpr);
    gl.viewport(0,0,canvas.width,canvas.height);
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  function onMove(e){
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio||1, 2);
    const cx = (e.touches? e.touches[0].clientX : e.clientX);
    const cy = (e.touches? e.touches[0].clientY : e.clientY);
    state.target[0] = (cx - r.left) * dpr;
    state.target[1] = (r.height - (cy - r.top)) * dpr;
  }
  function onClick(){ state.click = 1; }
  const target = opts.global ? window : canvas;
  target.addEventListener('mousemove', onMove);
  target.addEventListener('touchmove', onMove, {passive:true});
  canvas.addEventListener('mousedown', onClick);
  canvas.addEventListener('touchstart', onClick, {passive:true});

  function getTheme(){
    return document.documentElement.dataset.theme === 'light' ? 1 : 0;
  }

  const start = performance.now();
  function frame(){
    if(!state.alive) return;
    state.mouse[0] += (state.target[0]-state.mouse[0])*.08;
    state.mouse[1] += (state.target[1]-state.mouse[1])*.08;
    state.click *= .92;
    state.theme += (getTheme()-state.theme)*.1;
    gl.uniform1f(uTime, (performance.now()-start)/1000);
    gl.uniform2f(uMouse, state.mouse[0], state.mouse[1]);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uClick, state.click);
    gl.uniform1f(uTheme, state.theme);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    state.raf = requestAnimationFrame(frame);
  }
  frame();

  return {
    destroy(){
      state.alive = false;
      cancelAnimationFrame(state.raf);
      ro.disconnect();
      target.removeEventListener('mousemove', onMove);
      target.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('mousedown', onClick);
      canvas.removeEventListener('touchstart', onClick);
    }
  };
}

export const SHADER_NAMES = [
  'Liquid Ink',
  'Aurora Field',
  'Voronoi Cells',
  'Gravity Wells',
  'Constellation'
];

export const SHADER_DESCRIPTIONS = [
  'Warm ink pulled through cool depth. Move and click.',
  'Silky bands of light that warp toward your cursor.',
  'A living lattice. Your cursor pushes the cells.',
  'Ripple grid bent by gravity. Click to send a wave.',
  'A constellation that drifts toward you, then away.'
];
