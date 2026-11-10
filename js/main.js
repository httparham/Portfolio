import { Fluid } from './fluid.js?v=40';
import { Particles } from './particles.js?v=40';

const T = window.THREE;
const root = document.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;

const viewW = () => root.clientWidth || window.innerWidth;
const viewH = () => window.innerHeight;

/* ------------------------------------------------------------------- UI */

// Project count: header counter and the About stat both read it from the page.
const projectCount = String(document.querySelectorAll('[data-project]').length).padStart(2, '0');
document.querySelectorAll('[data-count="projects"]').forEach((el) => { el.textContent = projectCount; });

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());

// Chips filter the featured list in the hero.
const cards = Array.from(document.querySelectorAll('.card'));
const chips = Array.from(document.querySelectorAll('.chip'));
const list = document.getElementById('list');
chips.forEach((chip) => {
    chip.addEventListener('click', () => {
        const tag = chip.dataset.tag;
        chips.forEach((c) => c.classList.toggle('is-active', c === chip));
        cards.forEach((card) => {
            const tags = (card.dataset.tags || '').split(/\s+/);
            card.classList.toggle('is-hidden', tag !== 'all' && !tags.includes(tag));
        });
        if (list) list.scrollTop = 0;
    });
});

/* --------------------------------------------------------------- scroll */

// 0 at the top of the page, 1 once the hero has scrolled out of view.
let scrollP = 0;
let scrollQueued = false;
const readScroll = () => {
    scrollQueued = false;
    scrollP = Math.min(1, Math.max(0, window.scrollY / viewH()));
    root.style.setProperty('--p', scrollP.toFixed(3));
};
window.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(readScroll);
}, { passive: true });
window.addEventListener('resize', readScroll);
readScroll();

if ('IntersectionObserver' in window) {
    // Reveal: items entering together are staggered by their order in the batch.
    root.classList.add('reveal');
    const reveal = new IntersectionObserver((entries) => {
        let n = 0;
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.style.transitionDelay = `${Math.min(n, 8) * 60}ms`;
            entry.target.classList.add('is-in');
            reveal.unobserve(entry.target);
            n += 1;
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('[data-reveal], [data-reveal-children] > *').forEach((el) => reveal.observe(el));

    // Active nav link: the section crossing a line just above mid-viewport.
    const links = new Map();
    document.querySelectorAll('.menu a').forEach((a) => links.set(a.getAttribute('href').slice(1), a));
    const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const link = links.get(entry.target.id);
            if (link) link.classList.toggle('is-active', entry.isIntersecting);
        });
    }, { rootMargin: '-45% 0px -54% 0px' });
    links.forEach((_, id) => {
        const section = document.getElementById(id);
        if (section) spy.observe(section);
    });
}

/* ---------------------------------------------------------------- scene */

const canvas = document.getElementById('bg');

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
    renderer.setSize(viewW(), viewH(), false);
    renderer.setClearColor(0x000000, 1);
    renderer.autoClear = true;

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(30, viewW() / viewH(), 0.1, 1000);
    const base = new T.Vector3(-1.17, 0, 6);
    camera.position.copy(base);
    camera.lookAt(0, 0, 0);

    const fluid = new Fluid(renderer, { mobile });
    const particles = new Particles(renderer, camera, { mobile });
    scene.add(particles.group);

    // Pointer state in CSS pixels, y down, relative to the viewport.
    const mouse = { x: viewW() / 2, y: viewH() / 2 };
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

    // The fluid reallocates its targets on resize, so it waits for the viewport to
    // settle (mobile browsers resize continuously while the URL bar hides on scroll).
    let fluidResize = 0;
    const onResize = () => {
        const w = viewW();
        const h = viewH();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        particles.setPixelRatio(renderer.getPixelRatio());
        particles.fit(w / h);
        window.clearTimeout(fluidResize);
        fluidResize = window.setTimeout(() => fluid.resize(viewW(), viewH()), 150);
    };
    window.addEventListener('resize', onResize);
    fluid.resize(viewW(), viewH());
    particles.fit(viewW() / viewH());

    const target = new T.Vector3();
    let last = performance.now();
    let time = 0;

    const frame = (now) => {
        requestAnimationFrame(frame);

        // Scrolled past the hero: the canvas is fully transparent, so do no GPU work.
        if (scrollP >= 1) {
            last = now;
            prev.x = mouse.x;
            prev.y = mouse.y;
            return;
        }

        const dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000));
        last = now;
        time += dt;
        const hz = dt * 60;

        // Gaze camera
        const nx = (mouse.x / viewW()) * 2 - 1;
        const ny = (mouse.y / viewH()) * 2 - 1;
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
    };
    requestAnimationFrame(frame);
}
