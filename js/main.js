import { Fluid } from './fluid.js?v=31';
import { Particles } from './particles.js?v=31';

const T = window.THREE;

/* ------------------------------------------------------------------- UI */

const cards = Array.from(document.querySelectorAll('.card'));
const counter = document.getElementById('counter');
if (counter) counter.textContent = String(cards.length).padStart(2, '0');

const chips = Array.from(document.querySelectorAll('.chip'));
chips.forEach((chip) => {
    chip.addEventListener('click', () => {
        const tag = chip.dataset.tag;
        chips.forEach((c) => c.classList.toggle('is-active', c === chip));
        let shown = 0;
        cards.forEach((card) => {
            const tags = (card.dataset.tags || '').split(/\s+/);
            const show = tag === 'all' || tags.includes(tag);
            card.classList.toggle('is-hidden', !show);
            if (show) shown += 1;
        });
        if (counter) counter.textContent = String(shown).padStart(2, '0');
        const list = document.getElementById('list');
        if (list) list.scrollTop = 0;
    });
});

/* ---------------------------------------------------------------- scene */

const canvas = document.getElementById('bg');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;

function webglOk() {
    try {
        const c = document.createElement('canvas');
        return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) {
        return false;
    }
}

if (!T || !webglOk()) {
    canvas.style.display = 'none';
} else {
    boot();
}

function boot() {
    const renderer = new T.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x000000, 1);
    renderer.autoClear = true;

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
    const base = new T.Vector3(-1.17, 0, 6);
    camera.position.copy(base);
    camera.lookAt(0, 0, 0);

    const fluid = new Fluid(renderer, { mobile });
    const particles = new Particles(renderer, camera, { mobile });
    scene.add(particles.group);
    if (/[?&]debug\b/.test(location.search)) window.__axon = { renderer, scene, camera, fluid, particles };

    // Pointer state in CSS pixels, y down.
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const prev = { x: mouse.x, y: mouse.y };
    let hasPointer = false;

    const setPointer = (x, y) => {
        mouse.x = x;
        mouse.y = y;
        if (!hasPointer) {
            prev.x = x;
            prev.y = y;
            hasPointer = true;
        }
    };
    window.addEventListener('mousemove', (e) => setPointer(e.clientX, e.clientY), { passive: true });
    window.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        if (t) setPointer(t.clientX, t.clientY);
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
        const t = e.touches[0];
        if (t) setPointer(t.clientX, t.clientY);
    }, { passive: true });

    const target = new T.Vector3();
    const onResize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        fluid.resize(w, h);
        particles.setPixelRatio(renderer.getPixelRatio());
        particles.fit(w / h);
    };
    window.addEventListener('resize', onResize);
    particles.fit(window.innerWidth / window.innerHeight);

    let last = performance.now();
    let time = 0;

    const frame = (now) => {
        const dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000));
        last = now;
        time += dt;
        const hz = dt * 60;

        // Gaze camera
        const nx = (mouse.x / window.innerWidth) * 2 - 1;
        const ny = (mouse.y / window.innerHeight) * 2 - 1;
        target.set(base.x + nx * -1, base.y + ny * 2, base.z);
        camera.position.lerp(target, 0.05);
        camera.lookAt(0, 0, 0);

        // Fluid
        if (!reduce && hasPointer) fluid.splat(prev, mouse, now);
        prev.x = mouse.x;
        prev.y = mouse.y;
        fluid.step();

        // Particles
        particles.update(time, hz, fluid);

        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
}
