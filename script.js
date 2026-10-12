document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('loader');
    const count = document.getElementById('loader-count');
    const nav = document.getElementById('site-nav');
    const menuToggle = document.getElementById('menu-toggle');
    const cursor = document.getElementById('cursor');
    const year = document.getElementById('year');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const desktop = window.matchMedia('(min-width: 769px)').matches;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (year) year.textContent = String(new Date().getFullYear());

    const hideLoader = () => {
        if (loader?.classList.contains('is-done')) return;
        loader?.classList.add('is-done');
        document.body.classList.add('is-ready');
        if (window.gsap && !reduce) intro();
        window.setTimeout(() => window.ScrollTrigger?.refresh(), 80);
    };

    const shot = new URLSearchParams(location.search).has('shot');
    if (shot) {
        loader?.remove();
        document.body.classList.add('is-ready');
    } else if (reduce) {
        hideLoader();
    } else {
        let n = 0;
        const tick = () => {
            n = Math.min(100, n + 6 + Math.floor(Math.random() * 11));
            if (count) count.textContent = `${n}%`;
            if (n < 100) window.setTimeout(tick, 42);
            else window.setTimeout(hideLoader, 260);
        };
        tick();
        window.setTimeout(hideLoader, 1800);
    }

    menuToggle?.addEventListener('click', () => {
        const open = !nav.classList.contains('is-open');
        nav.classList.toggle('is-open', open);
        menuToggle.setAttribute('aria-expanded', String(open));
    });
    nav?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => nav.classList.remove('is-open')));

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const cursorPos = { x: pointer.x, y: pointer.y };
    let spinAngle = 0;
    let spinShown = -1;
    let idleFor = 0;
    let last = performance.now();

    const spin = document.getElementById('hero-spin');
    const TOTAL = 16;
    const frames = [];

    if (spin && !reduce) {
        spin.innerHTML = '';
        for (let i = 0; i < TOTAL; i += 1) {
            const img = new Image();
            img.src = `images/rotate/rotate-${String(i).padStart(2, '0')}.jpg?v=8`;
            img.alt = '';
            img.decoding = 'async';
            if (i === 0) img.className = 'is-on';
            spin.appendChild(img);
            frames.push(img);
        }
        spinShown = 0;
    } else {
        document.body.classList.add('no-turntable');
    }

    const wrap = (value) => ((value % TOTAL) + TOTAL) % TOTAL;

    const showFrame = (index) => {
        if (!frames.length) return;
        const i = Math.round(wrap(index)) % TOTAL;
        if (i === spinShown) return;
        if (spinShown >= 0) frames[spinShown].classList.remove('is-on');
        frames[i].classList.add('is-on');
        spinShown = i;
    };

    window.addEventListener('pointermove', (e) => {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        idleFor = 0;
        if (frames.length && e.movementX) {
            spinAngle = wrap(spinAngle + (e.movementX / window.innerWidth) * TOTAL * 1.8);
            showFrame(spinAngle);
        }
    }, { passive: true });

    if (canHover && !reduce && cursor) {
        document.body.classList.add('has-cursor');
        document.querySelectorAll('a, button, .do-card, .work-card').forEach((el) => {
            el.addEventListener('pointerenter', () => cursor.classList.add('is-hover'));
            el.addEventListener('pointerleave', () => cursor.classList.remove('is-hover'));
        });
    }

    const loop = (now) => {
        const dt = Math.min(0.032, (now - last) / 1000);
        last = now;
        idleFor += dt;

        if (cursor && document.body.classList.contains('has-cursor')) {
            cursorPos.x += (pointer.x - cursorPos.x) * 0.38;
            cursorPos.y += (pointer.y - cursorPos.y) * 0.38;
            cursor.style.transform = `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0) translate(-50%, -50%)`;
        }

        if (frames.length && idleFor > 1.8) {
            spinAngle = wrap(spinAngle + dt * 2.4);
            showFrame(spinAngle);
        }

        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    const cards = document.querySelectorAll('.do-card');
    cards.forEach((card) => {
        card.addEventListener('mouseenter', () => {
            cards.forEach((c) => c.classList.toggle('is-open', c === card));
        });
    });

    if (reduce || shot || typeof gsap === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    if (typeof Lenis !== 'undefined' && desktop) {
        const lenis = new Lenis({
            duration: 1.05,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 1,
        });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
        document.querySelectorAll('a[href^="#"]').forEach((link) => {
            link.addEventListener('click', (e) => {
                const id = link.getAttribute('href');
                const target = id && document.querySelector(id);
                if (!target) return;
                e.preventDefault();
                lenis.scrollTo(target, { offset: 0, duration: 1.05 });
            });
        });
    }

    function intro() {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.from('.landing-left', { y: 36, opacity: 0, duration: 0.8 })
            .from('.landing-right', { y: 36, opacity: 0, duration: 0.8 }, '-=0.55')
            .fromTo('.hero-figure', { opacity: 0 }, { opacity: 1, duration: 0.9, clearProps: 'transform' }, '-=0.8')
            .from('.site-header', { y: -16, opacity: 0, duration: 0.5 }, '-=0.7');
    }

    gsap.to('#hero-figure', {
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
            trigger: '#about',
            start: 'top 80%',
            end: 'top 30%',
            scrub: true,
        },
    });

    gsap.from('.do-card', {
        y: 22,
        opacity: 0,
        duration: 0.55,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: { trigger: '#about', start: 'top 78%' },
    });
    gsap.from('.career-list li', {
        y: 18,
        opacity: 0,
        duration: 0.5,
        stagger: 0.06,
        ease: 'power3.out',
        scrollTrigger: { trigger: '#career', start: 'top 80%' },
    });
    gsap.from('.stack-item', {
        y: 16,
        opacity: 0,
        duration: 0.4,
        stagger: 0.03,
        ease: 'power3.out',
        scrollTrigger: { trigger: '#stack', start: 'top 80%' },
    });

    if (desktop) {
        const track = document.getElementById('work-track');
        const section = document.querySelector('.work');
        if (track && section) {
            const travel = () => {
                const cards = track.querySelectorAll('.work-card');
                const last = cards[cards.length - 1];
                if (!last) return 0;
                const pad = Math.min(64, window.innerWidth * 0.05);
                return Math.max(0, last.offsetLeft + last.offsetWidth - window.innerWidth + pad);
            };
            gsap.to(track, {
                x: () => -travel(),
                ease: 'none',
                scrollTrigger: {
                    trigger: section,
                    start: 'top top',
                    end: () => `+=${travel()}`,
                    scrub: 0.25,
                    pin: true,
                    pinSpacing: true,
                    anticipatePin: 1,
                    invalidateOnRefresh: true,
                    id: 'work-pin',
                },
            });
        }
    }

    window.addEventListener('load', () => ScrollTrigger.refresh());
});
