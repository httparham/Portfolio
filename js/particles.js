import { simFrag, pointsVert, pointsFrag, copyFrag } from './shaders.js?v=31';
import { FullscreenPass, PingPong } from './fluid.js?v=31';

const T = window.THREE;

function makeMatcap() {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, size);

    // Soft grey sphere lit from the upper left.
    const g = ctx.createRadialGradient(size * 0.36, size * 0.34, size * 0.04, size * 0.5, size * 0.5, size * 0.5);
    g.addColorStop(0, '#f2f2f2');
    g.addColorStop(0.35, '#9a9a9a');
    g.addColorStop(0.75, '#4a4a4a');
    g.addColorStop(1, '#141414');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    const tex = new T.CanvasTexture(c);
    tex.minFilter = T.LinearFilter;
    tex.magFilter = T.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
}

function floatTargetsSupported(renderer) {
    const gl = renderer.getContext();
    if (renderer.capabilities.isWebGL2) return !!gl.getExtension('EXT_color_buffer_float');
    return !!gl.getExtension('OES_texture_float') && !!gl.getExtension('WEBGL_color_buffer_float');
}

export class Particles {
    constructor(renderer, camera, { mobile = false } = {}) {
        this.renderer = renderer;
        this.camera = camera;
        // 262,144 points on desktop; 65,536 on mobile (brief: 16,384, raised for density).
        this.size = mobile ? 256 : 512;
        const count = this.size * this.size;

        this.type = floatTargetsSupported(renderer) ? T.FloatType : T.HalfFloatType;

        // Origin texture: uniform random positions in [-1, 1]^3.
        const origin = new Float32Array(count * 4);
        for (let i = 0; i < count; i += 1) {
            origin[i * 4 + 0] = Math.random() * 2 - 1;
            origin[i * 4 + 1] = Math.random() * 2 - 1;
            origin[i * 4 + 2] = Math.random() * 2 - 1;
            origin[i * 4 + 3] = 1;
        }
        this.originTexture = new T.DataTexture(origin, this.size, this.size, T.RGBAFormat, T.FloatType);
        this.originTexture.minFilter = T.NearestFilter;
        this.originTexture.magFilter = T.NearestFilter;
        this.originTexture.needsUpdate = true;

        this.positions = new PingPong(this.size, this.size, this.type, T.NearestFilter);

        // Seed both targets with the origin.
        const copy = new FullscreenPass(renderer, copyFrag, { uTexture: { value: this.originTexture }, uValue: { value: 1 } });
        copy.render(this.positions.read);
        copy.render(this.positions.write);
        copy.material.dispose();

        this.sim = new FullscreenPass(renderer, simFrag, {
            uPositions: { value: null },
            uOrigin: { value: this.originTexture },
            uFluidVelocity: { value: null },
            uFluidDensity: { value: null },
            uTime: { value: 0 },
            uHZ: { value: 1 },
            uMouseStrength: { value: 0.4 },
            uCurlNoiseScale: { value: 1 },
            uCurlTimeScale: { value: 0.5 },
            uCurlNoiseSpeed: { value: 1 },
            uProjection: { value: new T.Matrix4() },
            uModel: { value: new T.Matrix4() },
            uNormalMatrix: { value: new T.Matrix3() },
        });

        // Geometry: one vertex per texel, position.xy = lookup UV, random = vec4.
        const geometry = new T.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const rnd = new Float32Array(count * 4);
        for (let y = 0; y < this.size; y += 1) {
            for (let x = 0; x < this.size; x += 1) {
                const i = y * this.size + x;
                pos[i * 3 + 0] = (x + 0.5) / this.size;
                pos[i * 3 + 1] = (y + 0.5) / this.size;
                pos[i * 3 + 2] = 0;
                rnd[i * 4 + 0] = Math.random();
                rnd[i * 4 + 1] = Math.random();
                rnd[i * 4 + 2] = Math.random();
                rnd[i * 4 + 3] = Math.random();
            }
        }
        geometry.setAttribute('position', new T.BufferAttribute(pos, 3));
        geometry.setAttribute('random', new T.BufferAttribute(rnd, 4));
        geometry.boundingSphere = new T.Sphere(new T.Vector3(), 10);

        this.material = new T.ShaderMaterial({
            vertexShader: pointsVert,
            fragmentShader: pointsFrag,
            uniforms: {
                uPositions: { value: this.positions.read.texture },
                uMatcap: { value: makeMatcap() },
                uTime: { value: 0 },
                uDPR: { value: renderer.getPixelRatio() },
                uBrightness: { value: 0.75 },
            },
            transparent: true,
            blending: T.AdditiveBlending,
            depthTest: true,
            depthWrite: false,
        });

        this.points = new T.Points(geometry, this.material);
        this.points.frustumCulled = false;

        this.group = new T.Group();
        // Brief: (0.343, 0.16, -1). Shifted left so the form sits between the two UI columns.
        this.group.position.set(-0.15, 0.16, -1);
        this.group.rotation.set(
            T.MathUtils.degToRad(-28.4),
            T.MathUtils.degToRad(390),
            T.MathUtils.degToRad(4.92),
        );
        this.group.scale.set(5, 5, 6);
        this.group.add(this.points);

        this._proj = new T.Matrix4();
    }

    setPixelRatio(dpr) {
        this.material.uniforms.uDPR.value = dpr;
    }

    /** Portrait viewports: shrink and lift the form so it clears the bottom text block. */
    fit(aspect) {
        const k = aspect < 1 ? Math.max(0.55, aspect * 0.9) : 1;
        this.group.scale.set(5 * k, 5 * k, 6 * k);
        if (aspect < 1) this.group.position.set(0.05, 0.85, -1);
        else this.group.position.set(-0.15, 0.16, -1);
    }

    update(time, hz, fluid) {
        const cam = this.camera;
        this.group.updateMatrixWorld(true);
        cam.updateMatrixWorld(true);

        const u = this.sim.u;
        u.uPositions.value = this.positions.read.texture;
        u.uTime.value = time;
        u.uHZ.value = hz;
        u.uFluidVelocity.value = fluid.velocityTexture;
        u.uFluidDensity.value = fluid.maskTexture;
        u.uProjection.value.copy(cam.projectionMatrix).multiply(cam.matrixWorldInverse);
        u.uModel.value.copy(this.group.matrixWorld);
        u.uNormalMatrix.value.setFromMatrix4(cam.matrixWorld);

        this.sim.render(this.positions.write);
        this.positions.swap();

        this.material.uniforms.uPositions.value = this.positions.read.texture;
        this.material.uniforms.uTime.value = time;
    }
}
