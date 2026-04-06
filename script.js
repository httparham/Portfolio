/* =============================================
   ARHAM KHAN PORTFOLIO — script.js
   Starfield + Interactions + Animations
   ============================================= */

// ===== STARFIELD CANVAS =====
(function () {
  const canvas = document.getElementById("starfield");
  const ctx = canvas.getContext("2d");
  let stars = [];
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createStars(count) {
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.5 + 0.2,
        opacity: Math.random() * 0.8 + 0.1,
        speed: Math.random() * 0.5 + 0.08,
        twinkleSpeed: Math.random() * 0.025 + 0.005,
        twinkleDir: Math.random() > 0.5 ? 1 : -1,
      });
    }
  }

  function drawStars() {
    ctx.clearRect(0, 0, W, H);

    // Draw a subtle aurora gradient at top
    const auroraGrad = ctx.createLinearGradient(0, 0, W, 0);
    auroraGrad.addColorStop(0, "rgba(255,255,255,0.015)");
    auroraGrad.addColorStop(0.4, "rgba(180,180,180,0.02)");
    auroraGrad.addColorStop(0.7, "rgba(255,255,255,0.01)");
    auroraGrad.addColorStop(1, "transparent");
    ctx.fillStyle = auroraGrad;
    ctx.fillRect(0, 0, W, 200);

    stars.forEach((s) => {
      // Twinkle
      s.opacity += s.twinkleSpeed * s.twinkleDir;
      if (s.opacity > 0.9 || s.opacity < 0.05) s.twinkleDir *= -1;

      // Slow drift downward
      s.y += s.speed;
      if (s.y > H) {
        s.y = 0;
        s.x = Math.random() * W;
      }

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 235, 255, ${s.opacity})`;
      ctx.fill();
    });

    // Occasional bright "cyber" particles
    if (Math.random() < 0.01) {
      const px = Math.random() * W;
      const py = Math.random() * H;
      const grd = ctx.createRadialGradient(px, py, 0, px, py, 3);
      grd.addColorStop(0, "rgba(220,220,220,0.6)");
      grd.addColorStop(1, "transparent");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(drawStars);
  }

  window.addEventListener("resize", () => {
    resize();
    createStars(Math.floor((W * H) / 4000));
  });

  resize();
  createStars(Math.floor((W * H) / 4000));
  drawStars();
})();

// ===== NAV SCROLL EFFECT =====
(function () {
  const nav = document.getElementById("nav");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
  });
})();

// ===== HAMBURGER / MOBILE MENU =====
(function () {
  const btn = document.getElementById("hamburger");
  const menu = document.getElementById("mobile-menu");

  btn.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("open");
    btn.setAttribute("aria-expanded", isOpen);
    // Animate hamburger to X
    const spans = btn.querySelectorAll("span");
    if (isOpen) {
      spans[0].style.transform = "translateY(7px) rotate(45deg)";
      spans[1].style.opacity = "0";
      spans[2].style.transform = "translateY(-7px) rotate(-45deg)";
    } else {
      spans[0].style.transform = "";
      spans[1].style.opacity = "";
      spans[2].style.transform = "";
    }
  });

  // Close on nav link click
  menu.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("open");
      btn.setAttribute("aria-expanded", false);
      const spans = btn.querySelectorAll("span");
      spans[0].style.transform = "";
      spans[1].style.opacity = "";
      spans[2].style.transform = "";
    });
  });
})();

// ===== TITLE CYCLE ANIMATION =====
(function () {
  const el = document.getElementById("title-cycle");
  if (!el) return;
  const words = ["Developer", "Engineer", "AI Builder", "Problem Solver", "Architect"];
  let i = 0;

  function typeWord(word, cb) {
    el.textContent = "";
    let j = 0;
    const t = setInterval(() => {
      el.textContent += word[j++];
      if (j >= word.length) {
        clearInterval(t);
        setTimeout(cb, 1800);
      }
    }, 80);
  }

  function eraseWord(cb) {
    const t = setInterval(() => {
      el.textContent = el.textContent.slice(0, -1);
      if (el.textContent.length === 0) {
        clearInterval(t);
        cb();
      }
    }, 45);
  }

  function cycle() {
    typeWord(words[i], () => {
      eraseWord(() => {
        i = (i + 1) % words.length;
        cycle();
      });
    });
  }

  cycle();
})();

// ===== STAT COUNTER ANIMATION =====
(function () {
  const statNums = document.querySelectorAll(".stat-num");

  function animateCount(el) {
    const target = parseInt(el.getAttribute("data-target"), 10);
    let current = 0;
    const step = Math.max(1, Math.floor(target / 40));
    const t = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current;
      if (current >= target) clearInterval(t);
    }, 30);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  statNums.forEach((el) => observer.observe(el));
})();

// ===== DIRECTIONAL SCROLL REVEAL =====
(function () {
  // Assign direction data attributes before observing
  const fromLeft = [".about-text", ".tl-role", ".section-label", ".section-title"];
  const fromRight = [".about-cards", ".hero-visual", ".tl-date"];
  const fromBottom = [".skill-card", ".project-card", ".info-card", ".contact-wrap", ".hero-content", ".contact-card", ".strength-card"];
  const fromTop = [".hero-badge", ".stat"];

  fromLeft.forEach(sel =>
    document.querySelectorAll(sel).forEach(el => el.setAttribute("data-reveal", "left"))
  );
  fromRight.forEach(sel =>
    document.querySelectorAll(sel).forEach(el => el.setAttribute("data-reveal", "right"))
  );
  fromBottom.forEach(sel =>
    document.querySelectorAll(sel).forEach(el => {
      if (!el.getAttribute("data-reveal")) el.setAttribute("data-reveal", "bottom");
    })
  );
  fromTop.forEach(sel =>
    document.querySelectorAll(sel).forEach(el => el.setAttribute("data-reveal", "top"))
  );

  // Timeline items alternate left/right
  document.querySelectorAll(".timeline-item").forEach((el, i) => {
    el.setAttribute("data-reveal", i % 2 === 0 ? "left" : "right");
  });

  // Add reveal class to all tagged elements
  document.querySelectorAll("[data-reveal]").forEach(el => el.classList.add("reveal"));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Stagger siblings in grid containers
          const parent = entry.target.parentElement;
          const siblings = [...parent.querySelectorAll("[data-reveal].reveal:not(.visible)")];
          const idx = siblings.indexOf(entry.target);
          entry.target.style.transitionDelay = `${idx * 80}ms`;

          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -50px 0px" }
  );

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
})();

// ===== BUTTON RIPPLE EFFECT =====
(function () {
  document.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ripple = document.createElement("span");
      ripple.classList.add("ripple");
      const size = Math.max(rect.width, rect.height) * 2;
      ripple.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${x - size / 2}px;
        top: ${y - size / 2}px;
      `;
      this.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove());
    });
  });
})();

// ===== SMOOTH ACTIVE NAV HIGHLIGHT =====
(function () {
  const sections = document.querySelectorAll("section[id]");
  const links = document.querySelectorAll(".nav-link");
  const spyDots = document.querySelectorAll(".spy-dot");

  window.addEventListener("scroll", () => {
    let current = "hero";
    sections.forEach((s) => {
      // 250px buffer allows section to trigger comfortably when it comes up
      if (window.scrollY >= s.offsetTop - window.innerHeight / 2.5) {
        current = s.id;
      }
    });
    
    // Ensure Top section works properly
    if (window.scrollY < 200) current = "hero";

    links.forEach((link) => {
      link.style.color = link.getAttribute("href") === `#${current}` ? "#ddd" : "";
    });
    spyDots.forEach((dot) => {
      dot.classList.remove("active");
      if (dot.getAttribute("href") === `#${current}`) {
        dot.classList.add("active");
      }
    });
  });
})();

// ===== STAGGERED CARD ANIMATIONS =====
(function () {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const cards = entry.target.querySelectorAll(
            ".skill-card, .project-card, .info-card, .timeline-item"
          );
          cards.forEach((card, i) => {
            card.style.transitionDelay = `${i * 60}ms`;
          });
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.05 }
  );
  document.querySelectorAll(".skills-grid, .projects-grid, .about-cards, .timeline").forEach(
    (el) => observer.observe(el)
  );
})();

// ===== MOUSE SPOTLIGHT BACKGROUND EFFECT =====
(function () {
  if (window.innerWidth < 900) return;

  // Large spotlight that follows cursor across the whole page
  const spotlight = document.createElement("div");
  spotlight.id = "mouse-spotlight";
  spotlight.style.cssText = `
    position: fixed;
    top: -350px;
    left: -350px;
    pointer-events: none;
    z-index: 1;
    width: 700px;
    height: 700px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(255,255,255,0.025) 0%,
      rgba(255,255,255,0.01) 25%,
      rgba(255,255,255,0.003) 55%,
      transparent 75%
    );
    will-change: transform;
    mix-blend-mode: screen;
    transition: opacity 0.3s;
  `;
  document.body.appendChild(spotlight);

  // Smaller sharp inner glow that moves faster
  const innerGlow = document.createElement("div");
  innerGlow.style.cssText = `
    position: fixed;
    top: -90px;
    left: -90px;
    pointer-events: none;
    z-index: 1;
    width: 180px;
    height: 180px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(255,255,255,0.04) 0%,
      rgba(255,255,255,0.015) 50%,
      transparent 75%
    );
    will-change: transform;
    transition: opacity 0.3s;
  `;
  document.body.appendChild(innerGlow);

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  
  // Current positions for trailing effect
  let spotX = mouseX;
  let spotY = mouseY;
  let innerX = mouseX;
  let innerY = mouseY;

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function renderCursor() {
    // Lerp (Linear Interpolation) for buttery smooth trailing
    spotX += (mouseX - spotX) * 0.1;
    spotY += (mouseY - spotY) * 0.1;
    
    // Inner glow moves faster than outer glow
    innerX += (mouseX - innerX) * 0.25;
    innerY += (mouseY - innerY) * 0.25;

    // Use hardware accelerated transform instead of repainting left/top
    spotlight.style.transform = `translate3d(${spotX}px, ${spotY}px, 0)`;
    innerGlow.style.transform = `translate3d(${innerX}px, ${innerY}px, 0)`;

    requestAnimationFrame(renderCursor);
  }
  
  // Start the animation loop
  requestAnimationFrame(renderCursor);

  // Fade out spotlight when mouse leaves window
  document.addEventListener("mouseleave", () => {
    spotlight.style.opacity = "0";
    innerGlow.style.opacity = "0";
  });
  document.addEventListener("mouseenter", () => {
    spotlight.style.opacity = "1";
    innerGlow.style.opacity = "1";
  });
})();

// ===== TILT EFFECT on project cards =====
(function () {
  if (window.innerWidth < 900) return;

  document.querySelectorAll(".project-card, .skill-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * -10;
      card.style.transform = `translateY(-5px) rotateX(${y}deg) rotateY(${x}deg)`;
      card.style.transition = "transform 0.1s";
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
      card.style.transition = "transform 0.4s ease";
    });
  });
})();

// ===== SMOOTH SCROLL (LENIS) =====
(function () {
  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1.1,
      smoothTouch: false,
      touchMultiplier: 2,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    window.lenis = lenis; // Expose globally for snap integration

    // Anchor links integration
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = this.getAttribute('href');
        if (target && target !== '#') {
          lenis.scrollTo(target);
        }
      });
    });

    // Soft-Snap to Sections
    let isScrollingToSection = false;
    let snapTimeout;

    const sections = document.querySelectorAll('section[id]');
    
    lenis.on('scroll', () => {
      clearTimeout(snapTimeout);
      
      // If we aren't already in a programmatic scroll, set a timer to snap to the nearest section
      if (!isScrollingToSection) {
        snapTimeout = setTimeout(() => {
          let closest = null;
          let minDistance = Infinity;

          sections.forEach(section => {
            const distance = Math.abs(window.scrollY - section.offsetTop);
            if (distance < minDistance && distance < window.innerHeight / 2) {
              minDistance = distance;
              closest = section;
            }
          });

          if (closest && minDistance > 20) { // Only snap if we aren't already very close
            isScrollingToSection = true;
            lenis.scrollTo(closest, {
              onComplete: () => {
                isScrollingToSection = false;
              }
            });
          }
        }, 150); // Small wait after scroll stops to feel intentional
      }
    });
  }
})();


