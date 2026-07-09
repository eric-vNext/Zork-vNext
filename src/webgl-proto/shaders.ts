// GLSL ES 3.00 sources for the WebGL prototype.
// The point of this spike: real fractal noise, real bloom, real GPU-instanced
// particle counts — the three things the Canvas 2D renderer approximates by
// hand (rockFacets, flames(), spawnParticles()) but can't do cheaply at scale.

export const fullscreenVert = /* glsl */ `#version 300 es
layout(location = 0) in vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

// Ashima Arts / Ian McEwan 2D simplex noise — public domain, the standard
// reference implementation used across the WebGL noise ecosystem.
const noiseGLSL = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amp * snoise(p);
    p = p * 2.02 + vec2(3.1, 1.7);
    amp *= 0.5;
  }
  return value;
}
`;

export const fireFrag = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
out vec4 fragColor;
${noiseGLSL}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y);

  // rising, domain-warped turbulence — this is what a hand-rolled canvas
  // flame (a handful of bezier "tongues") can only ever approximate
  vec2 flow = p * vec2(3.0, 2.0) + vec2(0.0, -uTime * 1.25);
  float n1 = fbm(flow);
  vec2 warped = p + vec2(n1 * 0.14, 0.0);
  float n2 = fbm(warped * vec2(2.3, 3.1) + vec2(0.0, -uTime * 1.9));

  float y = uv.y;
  float widthAt = mix(0.46, 0.04, pow(y, 1.35)) + n2 * 0.07 * y;
  float dist = abs(p.x) / max(widthAt, 0.001);
  // smoothstep requires edge0 < edge1 — invert the falloffs, don't swap the args
  float taper = 1.0 - smoothstep(0.0, 1.02, y * 1.05);
  float flame = (1.0 - smoothstep(0.1, 1.0, dist)) * taper;
  flame *= 0.55 + 0.45 * n2;
  flame = clamp(flame, 0.0, 1.0);

  float heat = clamp(flame + n2 * 0.18 * flame, 0.0, 1.0);
  vec3 col = mix(vec3(0.05, 0.0, 0.0), vec3(0.85, 0.12, 0.02), smoothstep(0.0, 0.35, heat));
  col = mix(col, vec3(1.0, 0.55, 0.08), smoothstep(0.3, 0.65, heat));
  col = mix(col, vec3(1.0, 0.92, 0.55), smoothstep(0.65, 0.92, heat));
  col = mix(col, vec3(1.0), smoothstep(0.9, 1.0, heat) * 0.65);

  vec3 bg = vec3(0.02, 0.014, 0.02) + vec3(0.03, 0.01, 0.0) * (1.0 - y);
  vec3 finalColor = mix(bg, col, flame);

  // dark hearth stones at the base, grounding the flame in a "room"
  float hearth = 1.0 - smoothstep(0.0, 0.1, y);
  finalColor = mix(finalColor, vec3(0.05, 0.045, 0.05), hearth * 0.55);

  fragColor = vec4(finalColor, 1.0);
}
`;

export const waterFrag = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
out vec4 fragColor;
${noiseGLSL}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = vec2(uv.x * aspect, uv.y);

  vec2 flow = p * vec2(2.6, 2.1) + vec2(uTime * 0.32, uTime * 0.1);
  float n1 = fbm(flow);
  vec2 warped = p + vec2(n1 * 0.05, n1 * 0.03);
  float n2 = fbm(warped * 4.2 + vec2(-uTime * 0.55, uTime * 0.22));
  // remap noise (~-1..1) to 0..1 BEFORE the contrast curve, and keep the
  // curve mild — pow(x,2.2) on the old 0..1 remap crushed almost everything
  // to near-black except a thin sliver near 1.0
  float causticN = clamp(n2 * 0.5 + 0.5, 0.0, 1.0);
  float caustic = pow(causticN, 1.3);

  vec3 deep = vec3(0.03, 0.16, 0.24);
  vec3 shallow = vec3(0.16, 0.48, 0.6);
  vec3 col = mix(deep, shallow, clamp(uv.y * 0.4 + caustic * 0.6, 0.0, 1.0));

  // bright rippling specular streaks — real Fresnel-ish sparkle, not a fixed glow() radius
  float spec = smoothstep(0.45, 0.85, causticN);
  col += vec3(0.6, 0.88, 1.0) * spec * 1.1;

  // foam threading through, catching the same turbulence
  float foamN = fbm(p * 6.0 + vec2(uTime * 0.45, -uTime * 0.2));
  float foam = smoothstep(0.62, 0.82, foamN * 0.5 + 0.5);
  col = mix(col, vec3(0.85, 0.95, 1.0), foam * 0.5);

  fragColor = vec4(col, 1.0);
}
`;

export const brightPassFrag = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform vec2 uTexelSize;
uniform float uThreshold;
out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy * uTexelSize;
  vec3 c = texture(uScene, uv).rgb;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  float w = smoothstep(uThreshold, uThreshold + 0.25, lum);
  fragColor = vec4(c * w, 1.0);
}
`;

export const blurFrag = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uTexelSize;
uniform vec2 uDirection;
out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy * uTexelSize;
  // 9-tap separable Gaussian
  float weights[5];
  weights[0] = 0.227027;
  weights[1] = 0.1945946;
  weights[2] = 0.1216216;
  weights[3] = 0.054054;
  weights[4] = 0.016216;
  vec3 result = texture(uSrc, uv).rgb * weights[0];
  for (int i = 1; i < 5; i++) {
    vec2 off = uDirection * uTexelSize * float(i) * 1.6;
    result += texture(uSrc, uv + off).rgb * weights[i];
    result += texture(uSrc, uv - off).rgb * weights[i];
  }
  fragColor = vec4(result, 1.0);
}
`;

export const compositeFrag = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec2 uTexelSize;
uniform float uBloomStrength;
out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy * uTexelSize;
  vec3 base = texture(uScene, uv).rgb;
  vec3 bloom = texture(uBloom, uv).rgb;
  // plain additive composite: the render targets are RGBA8 (never above 1.0
  // going in), so an HDR-style Reinhard divide here would only dim everything
  // for no benefit — clamp instead.
  vec3 col = clamp(base + bloom * uBloomStrength, 0.0, 1.0);
  fragColor = vec4(col, 1.0);
}
`;

export const particleVert = /* glsl */ `#version 300 es
layout(location = 0) in vec2 aCorner;
layout(location = 1) in float aSeed;
uniform float uTime;
uniform float uAspect;
uniform float uMode; // 0 = fire embers rising, 1 = water spray drifting
out float vAlpha;
out vec2 vCorner;
out vec3 vColor;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

void main() {
  float speed = mix(0.12, 0.34, hash(aSeed * 7.1 + 1.0));
  float startX = (hash(aSeed * 3.3 + 2.0) - 0.5) * (uMode < 0.5 ? 0.62 : 1.7);
  float life = fract(uTime * speed + hash(aSeed * 11.0));

  float y, x, size;
  vec3 color;
  if (uMode < 0.5) {
    // embers: rise from the hearth, swaying, shrinking, fading at the top
    y = mix(-0.75, 1.15, life);
    float sway = sin(uTime * 2.1 + aSeed * 22.0) * 0.06 * (1.0 - life);
    x = startX * (1.0 - life * 0.3) + sway;
    size = mix(0.005, 0.016, hash(aSeed * 9.0 + 3.0)) * (1.0 - life * 0.35);
    color = mix(vec3(1.0, 0.55, 0.1), vec3(1.0, 0.85, 0.3), hash(aSeed * 5.0));
  } else {
    // spray: drifts up and out from the water surface, catching the light
    y = mix(-0.2, 0.9, life);
    float drift = sin(uTime * 1.3 + aSeed * 14.0) * 0.15;
    x = startX + drift * life;
    size = mix(0.003, 0.01, hash(aSeed * 9.0 + 3.0)) * (1.0 - life * 0.2);
    color = mix(vec3(0.6, 0.85, 1.0), vec3(0.85, 0.96, 1.0), hash(aSeed * 5.0));
  }

  vAlpha = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.7, 1.0, life));
  vColor = color;
  vCorner = aCorner;
  vec2 pos = vec2(x + aCorner.x * size / uAspect, y + aCorner.y * size);
  gl_Position = vec4(pos, 0.0, 1.0);
}
`;

export const particleFrag = /* glsl */ `#version 300 es
precision highp float;
in float vAlpha;
in vec2 vCorner;
in vec3 vColor;
out vec4 fragColor;

void main() {
  float d = length(vCorner) * 2.0;
  float glow = 1.0 - smoothstep(0.0, 1.0, d);
  glow = pow(glow, 1.6);
  fragColor = vec4(vColor * glow * vAlpha, glow * vAlpha);
}
`;
