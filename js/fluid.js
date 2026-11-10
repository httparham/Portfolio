import {
    quadVert, fluidVert, copyFrag, splatFrag, advectFrag, divergenceFrag,
    curlFrag, vorticityFrag, pressureFrag, gradientSubtractFrag, maskFrag,
} from './shaders.js?v=31';

const T = window.THREE;

/** Fullscreen quad pass shared by the fluid and particle simulations. */
export class FullscreenPass {
    constructor(renderer, fragment, uniforms, vertex = quadVert) {
        this.renderer = renderer;
        this.material = new T.ShaderMaterial({
            vertexShader: vertex,
            fragmentShader: fragment,
            uniforms,
            depthTest: false,
            depthWrite: false,
            blending: T.NoBlending,
        });
        this.scene = new T.Scene();
        this.camera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.mesh = new T.Mesh(new T.PlaneGeometry(2, 2), this.material);
        this.mesh.frustumCulled = false;
        this.scene.add(this.mesh);
    }

    get u() { return this.material.uniforms; }

    render(target) {
        const r = this.renderer;
        const prev = r.getRenderTarget();
        r.setRenderTarget(target);
        r.render(this.scene, this.camera);
        r.setRenderTarget(prev);
    }
}

function makeTarget(w, h, type, filter) {
    return new T.WebGLRenderTarget(w, h, {
        type,
        format: T.RGBAFormat,
        minFilter: filter,
        magFilter: filter,
        wrapS: T.ClampToEdgeWrapping,
        wrapT: T.ClampToEdgeWrapping,
        depthBuffer: false,
        stencilBuffer: false,
        generateMipmaps: false,
    });
}

export class PingPong {
    constructor(w, h, type, filter) {
        this.width = w;
        this.height = h;
        this.read = makeTarget(w, h, type, filter);
        this.write = makeTarget(w, h, type, filter);
    }
    swap() {
        const t = this.read;
        this.read = this.write;
        this.write = t;
    }
    dispose() {
        this.read.dispose();
        this.write.dispose();
    }
}

const clampMap = (v, a, b, c, d) => {
    const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
    return c + (d - c) * t;
};

/**
 * Classic GPU fluid: curl -> vorticity -> divergence -> pressure ->
 * gradient subtract -> advect velocity -> advect density -> mask.
 */
export class Fluid {
    constructor(renderer, { mobile = false } = {}) {
        this.renderer = renderer;
        this.mobile = mobile;

        this.simRes = 256;
        this.dyeRes = 512;
        this.velocityDissipation = 0.98;
        this.densityDissipation = 0.97;
        this.pressureDissipation = 0.95;
        this.pressureIterations = 5;
        this.curlStrength = 30;
        this.dt = 1 / 60;

        this.type = T.HalfFloatType;
        this.lastSplat = 0;

        const u = (extra) => ({ uTexel: { value: new T.Vector2() }, ...extra });
        this.clearPass = new FullscreenPass(renderer, copyFrag, { uTexture: { value: null }, uValue: { value: 1 } });
        this.splatPass = new FullscreenPass(renderer, splatFrag, {
            uTarget: { value: null },
            uAspect: { value: 1 },
            uColor: { value: new T.Vector3() },
            uPointA: { value: new T.Vector2() },
            uPointB: { value: new T.Vector2() },
            uRadius: { value: 0.01 },
        });
        this.advectPass = new FullscreenPass(renderer, advectFrag, u({
            uVelocity: { value: null },
            uSource: { value: null },
            uDt: { value: this.dt },
            uDissipation: { value: 1 },
        }));
        this.divergencePass = new FullscreenPass(renderer, divergenceFrag, u({ uVelocity: { value: null } }), fluidVert);
        this.curlPass = new FullscreenPass(renderer, curlFrag, u({ uVelocity: { value: null } }), fluidVert);
        this.vorticityPass = new FullscreenPass(renderer, vorticityFrag, u({
            uVelocity: { value: null },
            uCurl: { value: null },
            uCurlStrength: { value: this.curlStrength },
            uDt: { value: this.dt },
        }), fluidVert);
        this.pressurePass = new FullscreenPass(renderer, pressureFrag, u({
            uPressure: { value: null },
            uDivergence: { value: null },
        }), fluidVert);
        this.gradientPass = new FullscreenPass(renderer, gradientSubtractFrag, u({
            uPressure: { value: null },
            uVelocity: { value: null },
        }), fluidVert);
        this.maskPass = new FullscreenPass(renderer, maskFrag, { uTexture: { value: null } });

        this.resize(window.innerWidth, window.innerHeight);
    }

    resolution(base, w, h) {
        const aspect = w / h;
        if (aspect >= 1) return [Math.round(base * aspect), base];
        return [base, Math.round(base / aspect)];
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.aspect = w / h;

        const [sw, sh] = this.resolution(this.simRes, w, h);
        const [dw, dh] = this.resolution(this.dyeRes, w, h);

        this.velocity?.dispose();
        this.density?.dispose();
        this.pressure?.dispose();
        this.divergence?.dispose();
        this.curl?.dispose();
        this.mask?.dispose();

        this.velocity = new PingPong(sw, sh, this.type, T.LinearFilter);
        this.pressure = new PingPong(sw, sh, this.type, T.NearestFilter);
        this.density = new PingPong(dw, dh, this.type, T.LinearFilter);
        this.divergence = makeTarget(sw, sh, this.type, T.NearestFilter);
        this.curl = makeTarget(sw, sh, this.type, T.NearestFilter);

        const scale = Math.min(window.devicePixelRatio || 1, 1);
        this.mask = makeTarget(Math.round(w * scale), Math.round(h * scale), T.UnsignedByteType, T.LinearFilter);

        this.simTexel = new T.Vector2(1 / sw, 1 / sh);
        this.dyeTexel = new T.Vector2(1 / dw, 1 / dh);
    }

    get velocityTexture() { return this.velocity.read.texture; }
    get densityTexture() { return this.density.read.texture; }
    get maskTexture() { return this.mask.texture; }

    /**
     * Feed the cursor. `prev` and `cur` are in CSS pixels, y down.
     */
    splat(prev, cur, now) {
        const dx = cur.x - prev.x;
        const dy = cur.y - prev.y;
        const len = Math.hypot(dx, dy);
        if (len <= 0.01) return;

        let from = prev;
        if (now - this.lastSplat > 50) from = cur;
        this.lastSplat = now;

        let radius = clampMap(len, 0, 5, 0, 60) * 0.6;
        if (this.mobile) radius *= 0.8;
        const mult = clampMap(len, 0, 15, 0, 10);

        const a = new T.Vector2(from.x / this.width, 1 - from.y / this.height);
        const b = new T.Vector2(cur.x / this.width, 1 - cur.y / this.height);
        // Gaussian sigma in UV units (max ~0.06 of the viewport width).
        const r = radius / 600;

        const s = this.splatPass;
        s.u.uAspect.value = this.aspect;
        s.u.uPointA.value.copy(a);
        s.u.uPointB.value.copy(b);
        s.u.uRadius.value = r;

        s.u.uTarget.value = this.velocity.read.texture;
        s.u.uColor.value.set(dx * mult, -dy * mult, 1);
        s.render(this.velocity.write);
        this.velocity.swap();

        s.u.uTarget.value = this.density.read.texture;
        s.u.uColor.value.set(1, 1, 1);
        s.render(this.density.write);
        this.density.swap();
    }

    step() {
        const dt = this.dt;

        // curl
        this.curlPass.u.uTexel.value.copy(this.simTexel);
        this.curlPass.u.uVelocity.value = this.velocity.read.texture;
        this.curlPass.render(this.curl);

        // vorticity confinement
        this.vorticityPass.u.uTexel.value.copy(this.simTexel);
        this.vorticityPass.u.uVelocity.value = this.velocity.read.texture;
        this.vorticityPass.u.uCurl.value = this.curl.texture;
        this.vorticityPass.u.uDt.value = dt;
        this.vorticityPass.render(this.velocity.write);
        this.velocity.swap();

        // divergence
        this.divergencePass.u.uTexel.value.copy(this.simTexel);
        this.divergencePass.u.uVelocity.value = this.velocity.read.texture;
        this.divergencePass.render(this.divergence);

        // pressure dissipation, then Jacobi iterations
        this.clearPass.u.uTexture.value = this.pressure.read.texture;
        this.clearPass.u.uValue.value = this.pressureDissipation;
        this.clearPass.render(this.pressure.write);
        this.pressure.swap();

        this.pressurePass.u.uTexel.value.copy(this.simTexel);
        this.pressurePass.u.uDivergence.value = this.divergence.texture;
        for (let i = 0; i < this.pressureIterations; i += 1) {
            this.pressurePass.u.uPressure.value = this.pressure.read.texture;
            this.pressurePass.render(this.pressure.write);
            this.pressure.swap();
        }

        // gradient subtract
        this.gradientPass.u.uTexel.value.copy(this.simTexel);
        this.gradientPass.u.uPressure.value = this.pressure.read.texture;
        this.gradientPass.u.uVelocity.value = this.velocity.read.texture;
        this.gradientPass.render(this.velocity.write);
        this.velocity.swap();

        // advect velocity
        this.advectPass.u.uTexel.value.copy(this.simTexel);
        this.advectPass.u.uDt.value = dt;
        this.advectPass.u.uVelocity.value = this.velocity.read.texture;
        this.advectPass.u.uSource.value = this.velocity.read.texture;
        this.advectPass.u.uDissipation.value = this.velocityDissipation;
        this.advectPass.render(this.velocity.write);
        this.velocity.swap();

        // advect density
        this.advectPass.u.uTexel.value.copy(this.dyeTexel);
        this.advectPass.u.uVelocity.value = this.velocity.read.texture;
        this.advectPass.u.uSource.value = this.density.read.texture;
        this.advectPass.u.uDissipation.value = this.densityDissipation;
        this.advectPass.render(this.density.write);
        this.density.swap();

        // viewport mask
        this.maskPass.u.uTexture.value = this.density.read.texture;
        this.maskPass.render(this.mask);
    }
}
