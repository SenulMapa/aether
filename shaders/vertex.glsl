uniform float uTime;
uniform float uPixelRatio;
uniform vec3 uAttractor; 
uniform float uAttractorStrength; 
uniform float uTurbulence;
uniform float uState; 
uniform float uAspect;

attribute vec3 aRandom; 
attribute float aSize;

varying float vLife;
varying float vDistance;

// Simplex 3D Noise 
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) { 
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

vec3 curlNoise(vec3 p) {
    const float e = 0.1;
    float n1 = snoise(p + vec3(e, 0, 0));
    float n2 = snoise(p + vec3(-e, 0, 0));
    float n3 = snoise(p + vec3(0, e, 0));
    float n4 = snoise(p + vec3(0, -e, 0));
    float n5 = snoise(p + vec3(0, 0, e));
    float n6 = snoise(p + vec3(0, 0, -e));
    return vec3(n3 - n4 - (n5 - n6), n5 - n6 - (n1 - n2), n1 - n2 - (n3 - n4));
}

vec3 getOrbital(vec3 base, float time) {
    float r = length(base.xy) + 0.5;
    float theta = atan(base.y, base.x) + time * (1.0 / r) * 0.5;
    return vec3(cos(theta) * r * 3.0, sin(theta) * r * 3.0, base.z * 2.0);
}

vec3 getVortex(vec3 base, float time) {
    float y = base.y * 6.0;
    float r = 0.5 + abs(y) * 0.2;
    float theta = time * 2.0 + y * 2.0;
    return vec3(cos(theta) * r, y, sin(theta) * r);
}

vec3 getBloom(vec3 base, float time) {
    vec3 dir = normalize(base);
    float burst = sin(time * 0.5 - length(base) * 4.0) * 0.5 + 0.5;
    return dir * (2.0 + burst * 3.0);
}

void main() {
    float t = uTime * 0.2;
    vec3 seed = position + aRandom;
    
    // States
    vec3 posOrbital = getOrbital(seed, t);
    vec3 posVortex = getVortex(seed, t);
    vec3 posBloom = getBloom(seed, t);
    
    // Mix States
    vec3 targetPos = mix(posOrbital, posVortex, clamp(uState, 0.0, 1.0));
    targetPos = mix(targetPos, posBloom, clamp(uState - 1.0, 0.0, 1.0));
    
    // Noise Field
    vec3 noisePos = targetPos * 0.8 + vec3(0.0, 0.0, t * 0.5);
    vec3 turbulence = curlNoise(noisePos) * (0.2 + uTurbulence * 1.5);
    targetPos += turbulence;
    
    // Hand Attractor
    vec3 attr = uAttractor;
    attr.x *= uAspect; // Fix aspect ratio logic for world space
    float d = distance(targetPos, attr);
    float pull = exp(-d * 1.5) * uAttractorStrength * 4.0;
    vec3 dir = normalize(attr - targetPos);
    targetPos += dir * pull;

    vec4 mvPosition = modelViewMatrix * vec4(targetPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    vLife = 0.5 + 0.5 * sin(t + aRandom.x * 10.0);
    vDistance = d;
    
    // Size attenuation
    gl_PointSize = (aSize * uPixelRatio * (1.0 + uTurbulence)) * (1.0 / -mvPosition.z);
}
