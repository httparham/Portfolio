// GLSL sources. All fullscreen passes share `quadVert`; three.js ShaderMaterial
// supplies `position`, `uv`, `modelViewMatrix` and `projectionMatrix`.

export const quadVert = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Neighbour-aware vertex for the fluid passes (L/R/T/B texel offsets).
export const fluidVert = /* glsl */ `
uniform vec2 uTexel;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
void main() {
    vUv = uv;
    vL = uv - vec2(uTexel.x, 0.0);
    vR = uv + vec2(uTexel.x, 0.0);
    vT = uv + vec2(0.0, uTexel.y);
    vB = uv - vec2(0.0, uTexel.y);
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/* ------------------------------------------------------------------ fluid */

export const copyFrag = /* glsl */ `
uniform sampler2D uTexture;
uniform float uValue;
varying vec2 vUv;
void main() {
    gl_FragColor = uValue * texture2D(uTexture, vUv);
}
`;

// Line splat: gaussian around the segment A -> B, aspect corrected.
export const splatFrag = /* glsl */ `
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec3 uColor;
uniform vec2 uPointA;
uniform vec2 uPointB;
uniform float uRadius;
varying vec2 vUv;
void main() {
    vec2 pa = vUv - uPointA;
    vec2 ba = uPointB - uPointA;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-7), 0.0, 1.0);
    vec2 d = pa - ba * h;
    d.x *= uAspect;
    float r = max(uRadius, 1e-4);
    vec3 splat = exp(-dot(d, d) / (r * r)) * uColor;
    vec3 base = texture2D(uTarget, vUv).xyz;
    gl_FragColor = vec4(base + splat, 1.0);
}
`;

export const advectFrag = /* glsl */ `
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uDt;
uniform float uDissipation;
varying vec2 vUv;
void main() {
    vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexel;
    gl_FragColor = uDissipation * texture2D(uSource, coord);
    gl_FragColor.a = 1.0;
}
`;

export const divergenceFrag = /* glsl */ `
uniform sampler2D uVelocity;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
void main() {
    float L = texture2D(uVelocity, vL).x;
    float R = texture2D(uVelocity, vR).x;
    float T = texture2D(uVelocity, vT).y;
    float B = texture2D(uVelocity, vB).y;
    vec2 C = texture2D(uVelocity, vUv).xy;
    if (vL.x < 0.0) { L = -C.x; }
    if (vR.x > 1.0) { R = -C.x; }
    if (vT.y > 1.0) { T = -C.y; }
    if (vB.y < 0.0) { B = -C.y; }
    float div = 0.5 * (R - L + T - B);
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}
`;

export const curlFrag = /* glsl */ `
uniform sampler2D uVelocity;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
void main() {
    float L = texture2D(uVelocity, vL).y;
    float R = texture2D(uVelocity, vR).y;
    float T = texture2D(uVelocity, vT).x;
    float B = texture2D(uVelocity, vB).x;
    float vorticity = R - L - T + B;
    gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}
`;

export const vorticityFrag = /* glsl */ `
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float uCurlStrength;
uniform float uDt;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
void main() {
    float L = texture2D(uCurl, vL).x;
    float R = texture2D(uCurl, vR).x;
    float T = texture2D(uCurl, vT).x;
    float B = texture2D(uCurl, vB).x;
    float C = texture2D(uCurl, vUv).x;
    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= uCurlStrength * C;
    force.y *= -1.0;
    vec2 vel = texture2D(uVelocity, vUv).xy;
    gl_FragColor = vec4(vel + force * uDt, 0.0, 1.0);
}
`;

export const pressureFrag = /* glsl */ `
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
void main() {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    float divergence = texture2D(uDivergence, vUv).x;
    float pressure = (L + R + B + T - divergence) * 0.25;
    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`;

export const gradientSubtractFrag = /* glsl */ `
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
void main() {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity -= vec2(R - L, T - B);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`;

// Density -> viewport mask, alpha = max(r, g, b).
export const maskFrag = /* glsl */ `
uniform sampler2D uTexture;
varying vec2 vUv;
void main() {
    vec3 c = texture2D(uTexture, vUv).rgb;
    float a = max(c.r, max(c.g, c.b));
    gl_FragColor = vec4(c, a);
}
`;

/* -------------------------------------------------------------- particles */

const sdfCommon = /* glsl */ `
vec3 qrotate(vec3 p, vec4 q) {
    return p + 2.0 * cross(q.xyz, cross(q.xyz, p) + q.w * p);
}

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

// A bent, twisted hollow ring with one large opening and soft lobes,
// about 0.7 units across. Mirrored front/back with a soft seam.
float sdfShape(vec3 p) {
    float len = length(p);
    if (len > 0.8) return len - 0.7;

    p.z = sqrt(p.z * p.z + 0.0215) - sqrt(0.012);
    p = qrotate(p, vec4(0.5, 0.5, 0.5, 0.5));

    const float S = 0.52;
    p /= S;

    // Twist around y
    float a = p.y * 2.6;
    float c = cos(a);
    float s = sin(a);
    p.xz = mat2(c, -s, s, c) * p.xz;

    // Bend: lift the rim away from the centre line
    p.y += 0.28 * p.x * p.x - 0.06;

    float ang = atan(p.z, p.x);
    float thick = 0.075 + 0.03 * sin(ang * 2.0 + 0.7) + 0.015 * sin(ang * 5.0);
    float ring = sdTorus(p, vec2(0.26, thick));

    float lobe1 = length(p - vec3(0.21, 0.09, 0.06)) - 0.13;
    float lobe2 = length(p - vec3(-0.19, -0.11, -0.07)) - 0.105;
    float lobe3 = length(p - vec3(0.02, -0.04, 0.27)) - 0.09;

    float d = smin(ring, lobe1, 0.09);
    d = smin(d, lobe2, 0.09);
    d = smin(d, lobe3, 0.07);
    return d * S;
}

vec3 sdfNormal(vec3 p) {
    const float e = 0.001;
    vec3 g = vec3(
        sdfShape(p + vec3(e, 0.0, 0.0)) - sdfShape(p - vec3(e, 0.0, 0.0)),
        sdfShape(p + vec3(0.0, e, 0.0)) - sdfShape(p - vec3(0.0, e, 0.0)),
        sdfShape(p + vec3(0.0, 0.0, e)) - sdfShape(p - vec3(0.0, 0.0, e))
    );
    return g / (length(g) + 1e-7);
}

// Analytic curl of three sine-sum potentials (Bridson-style), normalized.
vec3 curlNoise(vec3 p) {
    float x = p.x, y = p.y, z = p.z;

    float dPx_dy = 1.7 * cos(1.7 * y + 1.3 * z);
    float dPx_dz = 1.3 * cos(1.7 * y + 1.3 * z) + 1.15 * cos(2.3 * z - 0.7 * x);

    float dPy_dz = 1.9 * cos(1.9 * z + 1.1 * x);
    float dPy_dx = 1.1 * cos(1.9 * z + 1.1 * x) + 1.05 * cos(2.1 * x - 0.9 * y);

    float dPz_dx = 1.5 * cos(1.5 * x + 1.7 * y);
    float dPz_dy = 1.7 * cos(1.5 * x + 1.7 * y) + 1.35 * cos(2.7 * y - 1.1 * z);

    vec3 c = vec3(dPz_dy - dPy_dz, dPx_dz - dPz_dx, dPy_dx - dPx_dy);
    return c / (length(c) + 1e-5);
}
`;

export const simFrag = /* glsl */ `
uniform sampler2D uPositions;
uniform sampler2D uOrigin;
uniform sampler2D uFluidVelocity;
uniform sampler2D uFluidDensity;
uniform float uTime;
uniform float uHZ;
uniform float uMouseStrength;
uniform float uCurlNoiseScale;
uniform float uCurlTimeScale;
uniform float uCurlNoiseSpeed;
uniform mat4 uProjection;   // camera projection * inverse camera world
uniform mat4 uModel;        // group world matrix
uniform mat3 uNormalMatrix; // camera world rotation
varying vec2 vUv;

${sdfCommon}

void main() {
    vec3 pos = texture2D(uPositions, vUv).xyz;
    vec3 origin = texture2D(uOrigin, vUv).xyz;

    if (length(pos) > 0.7) pos /= 2.0;

    float t = uTime * uCurlTimeScale;
    pos += curlNoise(pos * 0.1 * uCurlNoiseScale + t * 0.1) * uCurlNoiseSpeed * 0.0002 * uHZ;

    vec3 gradient = sdfNormal(pos);
    float sdf = sdfShape(pos);
    pos += cross(pos / (length(pos) + 1e-6), gradient) * 0.0005;
    pos += -gradient * sdf * 0.5;
    pos += (origin - pos) * 0.0002 * uHZ;

    // Cursor fluid
    vec4 clip = uProjection * uModel * vec4(pos, 1.0);
    vec2 screenUV = clip.xy / max(clip.w, 1e-5) * 0.5 + 0.5;
    float inside = step(0.0, screenUV.x) * step(screenUV.x, 1.0) * step(0.0, screenUV.y) * step(screenUV.y, 1.0);
    vec2 vel = texture2D(uFluidVelocity, screenUV).xy;
    vec3 flow = uNormalMatrix * vec3(vel, 0.0);
    float dens = min(texture2D(uFluidDensity, screenUV).r, 1.0) * inside;
    pos += flow * 0.0001 * uHZ * uMouseStrength * dens;

    gl_FragColor = vec4(pos, 1.0);
}
`;

export const pointsVert = /* glsl */ `
uniform sampler2D uPositions;
uniform float uDPR;
attribute vec4 random;
varying vec4 vRandom;
varying float vScale;
void main() {
    vec3 pos = texture2D(uPositions, position.xy).xyz;
    pos *= mix(1.0, 1.5, pow(random.y, 150.0));

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float dist = length(mvPosition.xyz);
    float scale = smoothstep(3.0, 15.0, dist) * mix(0.5, 1.0, random.z);

    vRandom = random;
    vScale = scale;
    gl_PointSize = 0.04 * uDPR * 2.0 * scale * (1000.0 / max(dist, 0.001));
    gl_Position = projectionMatrix * mvPosition;
}
`;

export const pointsFrag = /* glsl */ `
uniform sampler2D uMatcap;
uniform float uTime;
uniform float uBrightness;
varying vec4 vRandom;
varying float vScale;

vec3 softLight(vec3 base, vec3 blend) {
    vec3 lo = 2.0 * base * blend + base * base * (1.0 - 2.0 * blend);
    vec3 hi = sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend);
    return mix(lo, hi, step(0.5, blend));
}

vec3 overlay(vec3 base, vec3 blend) {
    vec3 lo = 2.0 * base * blend;
    vec3 hi = 1.0 - 2.0 * (1.0 - base) * (1.0 - blend);
    return mix(lo, hi, step(0.5, base));
}

void main() {
    vec2 uv = gl_PointCoord - 0.5;
    if (dot(uv, uv) > 0.25) discard;
    if (vScale < 0.1) discard;

    vec3 color = vec3(mix(0.0, 0.2, vRandom.x));
    color = mix(color, vec3(0.6, 0.45, 1.0), pow(vRandom.z, 100.0));
    float sparkle = 0.5 + (0.4 + sin(uTime * 4.0 + vRandom.y * 20.0)) * pow(vRandom.z, 10.0) * 2.5;
    color *= sparkle;

    float ang = sin(uTime + vRandom.z * 20.0) * 0.5 + 1.0;
    float c = cos(ang);
    float s = sin(ang);
    vec2 ruv = mat2(c, -s, s, c) * uv + 0.5;
    vec3 mc = texture2D(uMatcap, ruv).rgb;

    color = mix(color, softLight(color, mc), 0.8);
    color = mix(color, overlay(color, mc), 0.2);

    gl_FragColor = vec4(color * uBrightness, 1.0);
}
`;
