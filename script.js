document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const header = document.getElementById('site-header');
    const nav = document.getElementById('site-nav');
    const themeToggle = document.getElementById('theme-toggle');
    const menuToggle = document.getElementById('menu-toggle');
    const year = document.getElementById('year');
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const navLinks = [...nav.querySelectorAll('a[href^="#"]')];
    const sections = navLinks
        .map((link) => document.querySelector(link.getAttribute('href')))
        .filter(Boolean);

    const THEME_KEY = 'theme';

    const getSystemTheme = () =>
        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    const getQueryTheme = () => {
        const query = new URLSearchParams(window.location.search).get('theme');
        return query === 'light' || query === 'dark' ? query : null;
    };

    const getTheme = () => {
        const query = getQueryTheme();
        if (query) return query;
        const saved = localStorage.getItem(THEME_KEY);
        return saved === 'light' || saved === 'dark' ? saved : getSystemTheme();
    };

    const applyTheme = (theme) => {
        root.setAttribute('data-theme', theme);
        const next = theme === 'dark' ? 'light' : 'dark';
        themeToggle.setAttribute('aria-label', `Switch to ${next} theme`);
        if (themeMeta) {
            themeMeta.setAttribute('content', theme === 'dark' ? '#0c0b0a' : '#f4f0e8');
        }
    };

    applyTheme(getTheme());

    themeToggle.addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        localStorage.setItem(THEME_KEY, next);
        applyTheme(next);
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (!localStorage.getItem(THEME_KEY)) {
            applyTheme(getSystemTheme());
        }
    });

    const closeMenu = () => {
        nav.classList.remove('is-open');
        menuToggle.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Open menu');
    };

    menuToggle.addEventListener('click', () => {
        const open = !nav.classList.contains('is-open');
        nav.classList.toggle('is-open', open);
        menuToggle.classList.toggle('is-open', open);
        menuToggle.setAttribute('aria-expanded', String(open));
        menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });

    navLinks.forEach((link) => {
        link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeMenu();
    });

    const onScroll = () => {
        header.classList.toggle('is-scrolled', window.scrollY > 8);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const id = `#${entry.target.id}`;
                    navLinks.forEach((link) => {
                        link.classList.toggle('is-active', link.getAttribute('href') === id);
                    });
                });
            },
            { rootMargin: '-40% 0px -50% 0px', threshold: 0 }
        );

        sections.forEach((section) => observer.observe(section));
    }

    if (year) {
        year.textContent = String(new Date().getFullYear());
    }

    if (new URLSearchParams(window.location.search).get('menu') === 'open') {
        menuToggle.click();
    }
});
