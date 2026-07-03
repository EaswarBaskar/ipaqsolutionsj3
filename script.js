/* ============================
 *  STATE & CONFIG
 * ============================ */
const SLIDES = 5;
const TRANSITION_MS = 1200;
const COOLDOWN_MS = 1600;
let currentSlide = 0;
let isLocked = false;
let lastWheelTime = 0;
let rafId = null;
let mouseX = 0, mouseY = 0;

const palettes = [
    { accent: '#0EA5E9', glow: 'rgba(14,165,233,0.4)' }, // Home: Electric Blue
    { accent: '#6366F1', glow: 'rgba(99,102,241,0.4)' }, // About: Indigo Tech
    { accent: '#10B981', glow: 'rgba(16,185,129,0.4)' }, // Services: Emerald Precision
    { accent: '#F59E0B', glow: 'rgba(245,158,11,0.4)' }, // Clients: Industrial Amber
    { accent: '#0EA5E9', glow: 'rgba(14,165,233,0.4)' }  // Contact: Return to Brand Blue
];

/* ============================
 *  SMOOTH SCROLL (LENIS)
 * ============================ */
const lenis = new Lenis({
    duration: 1.8,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
});

if (typeof ScrollTrigger !== 'undefined') {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0, 0);
}

/* ============================
 *  DOM REFS
 * ============================ */
const bgTrack = document.getElementById('bg-track');
const contentWrapper = document.getElementById('content-wrapper');
const navLinks = document.querySelectorAll('.nav-links a');
const slideDots = document.querySelectorAll('.slide-dot');
const sections = document.querySelectorAll('.section');
const bgSlides = document.querySelectorAll('.bg-slide');
const cursorDot = document.getElementById('cursor-dot');
const cursorCircle = document.getElementById('cursor-circle');
const hamburger = document.querySelector('.hamburger');
const navLinksContainer = document.querySelector('.nav-links');

/* ============================
 *  LOADING
 * ============================ */
(function initLoader() {
    let p = 0;
    const bar = document.getElementById('progress');
    const glow = document.querySelector('.progress-glow');
    const pct  = document.getElementById('loader-pct');
    const statusEl = document.getElementById('loader-status');

    const statuses = [
        'Initializing systems...',
        'Loading bioprocess modules...',
        'Calibrating automation stack...',
        'Connecting life sciences core...',
        'Ready.'
    ];
    let statusIdx = 0;

    const statusTimer = setInterval(() => {
        statusIdx = Math.min(statusIdx + 1, statuses.length - 1);
        if (statusEl) statusEl.textContent = statuses[statusIdx];
    }, 400);

    const tick = setInterval(() => {
        p += Math.random() * 18 + 2;
        if (p >= 100) {
            p = 100;
            bar.style.width = '100%';
            if (glow) glow.style.right = '0%';
            if (pct) pct.textContent = '100';
            clearInterval(tick);
            clearInterval(statusTimer);
            if (statusEl) statusEl.textContent = 'Ready.';
            setTimeout(() => {
                document.getElementById('loader').classList.add('hidden');
                window.scrollTo(0, 0);
                setTimeout(() => { if (window.playHomeAnims) window.playHomeAnims(); }, 200);
            }, 600);
        } else {
            bar.style.width = p + '%';
            if (pct) pct.textContent = Math.floor(p);
        }
    }, 90);
})();


/* ============================
 *  NAVIGATION LOGIC
 * ============================ */
function goToSlide(index) {
    const section = sections[index];
    if (section && lenis) {
        lenis.scrollTo(section, { offset: 0, duration: 1.5, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    } else if (section) {
        window.scrollTo({ top: section.offsetTop, behavior: 'smooth' });
    }
}

// Nav Link Click Listeners
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const index = parseInt(link.getAttribute('data-index'));
        goToSlide(index);
        
        // Close mobile menu
        hamburger.classList.remove('open');
        navLinksContainer.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
    });
});

// Indicator Dot Click Listeners
slideDots.forEach(dot => {
    dot.addEventListener('click', () => {
        const index = parseInt(dot.getAttribute('data-slide'));
        goToSlide(index);
    });
});

// Hamburger Menu Toggle
hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.contains('open');
    hamburger.classList.toggle('open');
    navLinksContainer.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', !isOpen);
});

// Active indicator update on scroll
window.addEventListener('scroll', () => {
    let found = 0;
    sections.forEach((s, i) => {
        const rect = s.getBoundingClientRect();
        if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
            found = i;
        }
    });
    if (found !== currentSlide) {
        currentSlide = found;
        navLinks.forEach(a => {
            const idx = parseInt(a.getAttribute('data-index'));
            a.classList.toggle('active', idx === found);
        });
        slideDots.forEach(d => {
            const idx = parseInt(d.getAttribute('data-slide'));
            d.classList.toggle('active', idx === found);
        });
        sections.forEach((s, i) => s.classList.toggle('active', i === found));

        // Update theme variables smoothly
        gsap.to(document.documentElement, {
            '--c-accent': palettes[found].accent,
            '--c-glow': palettes[found].glow,
            duration: 0.8,
            ease: "power2.out"
        });
    }

    // Dynamic background color transition from light to a little dark on scroll
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'light' && typeof scene !== 'undefined' && scene) {
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const scrollProgress = window.scrollY / maxScroll;
        // Lightness goes from 98% (start) to 85% (end)
        const l = 98 - (scrollProgress * 13);
        const newColor = new THREE.Color().setHSL(210 / 360, 0.40, l / 100);
        scene.background = newColor;
        document.documentElement.style.setProperty('--c-primary', `hsl(210, 40%, ${l}%)`);
    } else {
        document.documentElement.style.removeProperty('--c-primary');
    }
});

/* ============================
 *  BIOTECH 3D ENGINE — v2.0
 * ============================ */
let scene, camera, renderer, composer, bloomPass, model, modelGroup, animationGroup, particles;
let moleculeGroup, orbitalRings = [];
let mouseTargetX = 0, mouseTargetY = 0;
const canvasContainer = document.getElementById('three-canvas-container');

function init3D() {
    // ─── Scene & Renderer ─────────────────────────────────────────────────
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    canvasContainer.appendChild(renderer.domElement);

    // ─── Bloom Post-Processing ───────────────────────────────────────────
    if (typeof THREE.EffectComposer !== 'undefined') {
        const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
            format: THREE.RGBAFormat,
        });
        composer = new THREE.EffectComposer(renderer, renderTarget);
        composer.addPass(new THREE.RenderPass(scene, camera));
        bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.85,  // strength
            0.5,   // radius
            0.22   // threshold
        );
        composer.addPass(bloomPass);
    }

    // ─── Lighting ─────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x020c1b, 5));
    const cyanPt = new THREE.PointLight(0x22d3ee, 10, 40); cyanPt.position.set(2, 6, 6);   scene.add(cyanPt);
    const bluePt = new THREE.PointLight(0x0ea5e9, 6,  30); bluePt.position.set(-8, -3, 0); scene.add(bluePt);
    const grnPt  = new THREE.PointLight(0x10b981, 5,  25); grnPt.position.set(6, 2, -5);   scene.add(grnPt);

    // ─── Biotech Particle Cloud ───────────────────────────────────────────
    const COUNT = 3500;
    const posArr = new Float32Array(COUNT * 3);
    const colArr = new Float32Array(COUNT * 3);
    const pColors = [
        new THREE.Color(0x0ea5e9), new THREE.Color(0x22d3ee),
        new THREE.Color(0x10b981), new THREE.Color(0x6366f1), new THREE.Color(0x38bdf8)
    ];
    for (let i = 0; i < COUNT; i++) {
        posArr[i*3]   = (Math.random()-0.5)*60;
        posArr[i*3+1] = (Math.random()-0.5)*60;
        posArr[i*3+2] = (Math.random()-0.5)*60;
        const c = pColors[Math.floor(Math.random()*pColors.length)];
        colArr[i*3]=c.r; colArr[i*3+1]=c.g; colArr[i*3+2]=c.b;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
    particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
        size: 0.1, vertexColors: true, transparent: true,
        opacity: 0.8, blending: THREE.AdditiveBlending, sizeAttenuation: true
    }));
    scene.add(particles);

    // ─── Tech Grid ────────────────────────────────────────────────────────
    const grid = new THREE.GridHelper(120, 60, 0x0ea5e9, 0x0ea5e9);
    grid.position.y = -20;
    grid.material.transparent = true;
    grid.material.opacity = 0.06;
    scene.add(grid);

    // ─── Model Groups ──────────────────────────────────────────────────────
    modelGroup    = new THREE.Group();
    animationGroup = new THREE.Group();
    modelGroup.add(animationGroup);
    scene.add(modelGroup);

    // ─── CLEAN DNA DOUBLE HELIX ───────────────────────────────────────────
    // No icosahedron. No orbital rings. Just pure, unmistakable DNA.
    model = new THREE.Group();

    const dnaH  = 16;     // tall helix
    const turns = 2.5;    // 2.5 full rotations top-to-bottom
    const pairs = 60;     // 60 base pair nodes
    const r     = 2.0;    // large radius — strands clearly separated

    // ── Materials ──────────────────────────────────────────────────────────
    const matStrandA = new THREE.MeshStandardMaterial({
        color: 0x0ea5e9, emissive: 0x0ea5e9,
        emissiveIntensity: 1.1, metalness: 0.3, roughness: 0.15
    });
    const matStrandB = new THREE.MeshStandardMaterial({
        color: 0x10b981, emissive: 0x10b981,
        emissiveIntensity: 0.9, metalness: 0.3, roughness: 0.15
    });
    const matRung = new THREE.MeshStandardMaterial({
        color: 0x22d3ee, emissive: 0x22d3ee,
        emissiveIntensity: 0.55, metalness: 0.2, roughness: 0.3,
        transparent: true, opacity: 0.75
    });

    // ── Sphere nucleotide nodes ────────────────────────────────────────────
    const nodeGeo = new THREE.SphereGeometry(0.24, 12, 12);
    const rungGeo = new THREE.CylinderGeometry(0.045, 0.045, r * 2, 8);

    const ptA = [], ptB = [];   // backbone curve points

    for (let i = 0; i <= pairs; i++) {
        const t   = i / pairs;
        const ang = t * Math.PI * 2 * turns;
        const y   = (t - 0.5) * dnaH;

        const xA = Math.cos(ang) * r,       zA = Math.sin(ang) * r;
        const xB = Math.cos(ang + Math.PI) * r, zB = Math.sin(ang + Math.PI) * r;

        // Record for backbone tube
        ptA.push(new THREE.Vector3(xA, y, zA));
        ptB.push(new THREE.Vector3(xB, y, zB));

        // Nucleotide sphere — Strand A (blue)
        const sA = new THREE.Mesh(nodeGeo, matStrandA.clone());
        sA.position.set(xA, y, zA);
        model.add(sA);

        // Nucleotide sphere — Strand B (green)
        const sB = new THREE.Mesh(nodeGeo, matStrandB.clone());
        sB.position.set(xB, y, zB);
        model.add(sB);

        // Base-pair rung — every 3rd node so they're spaced nicely
        if (i % 3 === 0) {
            const rung = new THREE.Mesh(rungGeo, matRung.clone());
            rung.position.set(0, y, 0);
            rung.rotation.y = -ang;
            rung.rotation.z = Math.PI / 2;
            model.add(rung);
        }
    }

    // ── Smooth backbone tubes (CatmullRomCurve3) ──────────────────────────
    // These ribbon-like tubes give the iconic DNA ladder look.
    const tubeSegments = 300;
    const tubeRadius   = 0.08;

    const curveA   = new THREE.CatmullRomCurve3(ptA);
    const tubeGeoA = new THREE.TubeGeometry(curveA, tubeSegments, tubeRadius, 8, false);
    const tubeMatA = new THREE.MeshStandardMaterial({
        color: 0x0ea5e9, emissive: 0x0ea5e9,
        emissiveIntensity: 0.8, metalness: 0.3, roughness: 0.2
    });
    model.add(new THREE.Mesh(tubeGeoA, tubeMatA));

    const curveB   = new THREE.CatmullRomCurve3(ptB);
    const tubeGeoB = new THREE.TubeGeometry(curveB, tubeSegments, tubeRadius, 8, false);
    const tubeMatB = new THREE.MeshStandardMaterial({
        color: 0x10b981, emissive: 0x10b981,
        emissiveIntensity: 0.7, metalness: 0.3, roughness: 0.2
    });
    model.add(new THREE.Mesh(tubeGeoB, tubeMatB));

    animationGroup.add(model);

    // No molecule, no orbital rings — DNA is the sole centrepiece
    moleculeGroup = null;
    orbitalRings  = [];

    // ─── Camera & Position ─────────────────────────────────────────────────
    camera.position.z = 14;
    // Initial rotation
    modelGroup.rotation.y = -Math.PI / 7;
    modelGroup.rotation.x = 0.08;

    setupScrollAnims();
    animate();
}


function setupScrollAnims() {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    let mm = gsap.matchMedia();

    mm.add({
        isDesktop: "(min-width: 769px)",
        isMobile: "(max-width: 768px)"
    }, (context) => {
        let { isDesktop, isMobile } = context.conditions;

        // Set initial position based on screen size
        if (isMobile) {
            modelGroup.position.set(3.2, 0, -2);
            modelGroup.scale.set(0.4, 0.4, 0.4);
        } else {
            modelGroup.position.set(5.5, 0, -2);
            modelGroup.scale.set(0.72, 0.72, 0.72);
        }

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: "#content-wrapper",
                start: "top top",
                end: "bottom bottom",
                scrub: 1.5,
            }
        });

        // Section 0 (Home) -> Section 1 (Showcase)
        tl.to(modelGroup.position, { x: 0, y: 0, z: 0, duration: 1 })
          .to(modelGroup.rotation, { y: Math.PI * 2, x: Math.PI, duration: 1 }, 0)
          .to(modelGroup.scale, { x: isMobile ? 0.9 : 1.5, y: isMobile ? 0.9 : 1.5, z: isMobile ? 0.9 : 1.5, duration: 1 }, 0)
          .to(particles.rotation, { y: Math.PI * 0.5, duration: 1 }, 0)
          .to(bgSlides[0], { opacity: 0.3, duration: 1 }, 0)
          .to(bgSlides[1], { opacity: 1,   duration: 1 }, 0);

        // Section 1 -> Section 2 (About)
        tl.to(modelGroup.position, { x: isMobile ? 2 : 4, y: 0.5, duration: 1 })
          .to(modelGroup.rotation, { z: Math.PI, duration: 1 }, "-=1")
          .to(particles.position, { x: -2, duration: 1 }, "-=1")
          .to(bgSlides[1], { opacity: 0, duration: 1 }, "-=1")
          .to(bgSlides[2], { opacity: 1, duration: 1 }, "-=1");

        // Section 2 -> Section 3 (Services)
        tl.to(modelGroup.position, { x: isMobile ? -2 : -4, y: 1.5, z: -2, duration: 1 })
          .to(modelGroup.scale, { x: isMobile ? 0.6 : 1, y: isMobile ? 0.6 : 1, z: isMobile ? 0.6 : 1, duration: 1 }, "-=1")
          .to(particles.rotation, { x: Math.PI, duration: 1 }, "-=1")
          .to(bgSlides[2], { opacity: 0.4, duration: 1 }, "-=1");

        // Section 3 -> Section 4 (Clients)
        tl.to(modelGroup.position, { x: isMobile ? 0.5 : 1, y: -3, z: 2, duration: 1 })
          .to(modelGroup.rotation, { y: Math.PI * 4, duration: 1 }, "-=1")
          .to(bgSlides[2], { opacity: 0.2, duration: 1 }, "-=1");

        // Section 4 -> Section 5 (Contact)
        tl.to(modelGroup.position, { x: isMobile ? 1 : 2, y: -1, z: -4, duration: 1 })
          .to(modelGroup.scale, { x: isMobile ? 0.6 : 1.2, y: isMobile ? 0.6 : 1.2, z: isMobile ? 0.6 : 1.2, duration: 1 }, "-=1")
          .to(particles.material, { opacity: 0.6, duration: 1 }, "-=1")
          .to(bgSlides[0], { opacity: 0.5, duration: 1 }, "-=1");
    });

    // ─── Section Text Reveals ──────────────────────────────────────────────
    gsap.fromTo('.showcase-content > *',
        { y: 80, opacity: 0, filter: 'blur(15px)' },
        { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.5, stagger: 0.2, ease: "power4.out",
          scrollTrigger: { trigger: '#showcase', start: 'top 65%', toggleActions: "play reverse play reverse" } }
    );
    gsap.fromTo('.about-text',
        { y: 50, opacity: 0, filter: 'blur(20px) contrast(200%)', scale: 1.05 },
        { y: 0, opacity: 1, filter: 'blur(0px) contrast(100%)', scale: 1, duration: 2, ease: "power3.out",
          scrollTrigger: { trigger: '#about', start: 'top 60%', toggleActions: "play reverse play reverse" } }
    );
    gsap.fromTo('#products .section-title',
        { opacity: 0, y: 50, rotationX: 45 },
        { opacity: 1, y: 0, rotationX: 0, duration: 1.5, ease: "power4.out",
          scrollTrigger: { trigger: '#products', start: 'top 75%', toggleActions: "play reverse play reverse" } }
    );
    gsap.fromTo('.product-item',
        { y: 150, opacity: 0, scale: 0.9, filter: 'blur(10px)' },
        { y: 0, opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.2, stagger: 0.15, ease: "expo.out",
          scrollTrigger: { trigger: '#products .product-grid', start: 'top 85%', toggleActions: "play reverse play reverse" } }
    );
    gsap.fromTo('#clients .section-title',
        { opacity: 0, x: -50, filter: 'blur(10px)' },
        { opacity: 1, x: 0, filter: 'blur(0px)', duration: 1.5, ease: "power4.out",
          scrollTrigger: { trigger: '#clients', start: 'top 80%', toggleActions: "play reverse play reverse" } }
    );
    gsap.fromTo('.client-ticker-wrap',
        { opacity: 0, y: 50, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 1.5, ease: "power4.out", delay: 0.2,
          scrollTrigger: { trigger: '#clients', start: 'top 80%', toggleActions: "play reverse play reverse" } }
    );
    gsap.fromTo('.contact-info > *',
        { x: -50, opacity: 0, filter: 'blur(10px)' },
        { x: 0, opacity: 1, filter: 'blur(0px)', duration: 1.2, stagger: 0.1, ease: "power3.out",
          scrollTrigger: { trigger: '#contact', start: 'top 70%', toggleActions: "play reverse play reverse" } }
    );
    gsap.fromTo('.map-container',
        { scale: 0.8, opacity: 0, filter: 'grayscale(100%) blur(20px)' },
        { scale: 1, opacity: 1, filter: 'grayscale(30%) blur(0px)', duration: 1.8, ease: "expo.out",
          scrollTrigger: { trigger: '#contact', start: 'top 70%', toggleActions: "play reverse play reverse" } }
    );

    // ─── Stats Counter Animation ───────────────────────────────────────────
    document.querySelectorAll('.stat-item[data-count]').forEach(item => {
        const el     = item.querySelector('h4');
        const target = parseInt(item.dataset.count);
        const suffix = item.dataset.suffix || '';
        if (!el || isNaN(target)) return;
        ScrollTrigger.create({
            trigger: '.stats-card',
            start: 'top 95%',
            once: true,
            onEnter: () => {
                const obj = { val: 0 };
                gsap.to(obj, {
                    val: target, duration: 2.5, ease: 'power2.out',
                    onUpdate: () => { el.textContent = Math.round(obj.val) + suffix; }
                });
            }
        });
    });
}

// Global scope window attach for Home reveal
window.playHomeAnims = () => {
    const hlLines = document.querySelectorAll('.headline > div');
    
    // Movie-style startup
    gsap.fromTo(hlLines, 
        { y: 120, opacity: 0, filter: 'blur(15px)', rotationZ: 2 },
        { y: 0, opacity: 1, filter: 'blur(0px)', rotationZ: 0, duration: 1.5, stagger: 0.2, ease: "expo.out" }
    );
    gsap.fromTo('.badge', 
        { y: 30, opacity: 0, scale: 0.8 },
        { y: 0, opacity: 1, scale: 1, duration: 1, ease: "back.out(1.5)", delay: 0.5 }
    );
    gsap.fromTo('.subtitle', 
        { y: 40, opacity: 0, filter: 'blur(10px)' },
        { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.2, ease: "power3.out", delay: 0.8 }
    );
    gsap.fromTo('.cta-group a', 
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, stagger: 0.15, ease: "power3.out", delay: 1 }
    );
    gsap.fromTo('.stats-card',
        { x: 100, opacity: 0, clipPath: 'inset(0% 0% 0% 100%)' },
        { x: 0, opacity: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: "expo.out", delay: 1.2 }
    );
    gsap.fromTo('.ui-brackets .bracket',
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.5, stagger: 0.1, ease: "back.out(1.5)", delay: 0.8 }
    );
}

let is3DVisible = true;
if (typeof window !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        is3DVisible = !document.hidden;
    });
    const observer = new IntersectionObserver((entries) => {
        is3DVisible = entries.some(entry => entry.isIntersecting);
    });
    window.addEventListener('DOMContentLoaded', () => {
        const wrapper = document.getElementById('content-wrapper');
        if (wrapper) observer.observe(wrapper);
    });
}

function animate() {
    requestAnimationFrame(animate);
    if (!is3DVisible) return;

    const time = Date.now() * 0.001;

    // Main group slow rotation + float
    if (animationGroup) {
        animationGroup.rotation.y += 0.0015;
        animationGroup.position.y = Math.sin(time * 0.5) * 0.18;
    }

    // DNA counter-rotates inside the group for layered motion
    if (model) {
        model.rotation.y -= 0.002;
        model.rotation.x += 0.0003;
    }

    // Molecule slowly tumbles
    if (moleculeGroup) {
        moleculeGroup.rotation.x += 0.0008;
        moleculeGroup.rotation.z += 0.001;
    }

    // Animate electron dots along their orbits
    orbitalRings.forEach(ring => {
        if (ring.children.length > 0) {
            const el = ring.children[0];
            const ud = el.userData;
            if (ud.spd !== undefined) {
                const t = time * ud.spd + ud.ph;
                el.position.x = Math.cos(t) * ud.orbitR;
                el.position.z = Math.sin(t) * ud.orbitR;
            }
        }
    });

    if (particles) {
        particles.rotation.y += 0.0003;
        particles.rotation.x += 0.0001;
    }

    // Smooth mouse-reactive camera parallax
    camera.rotation.x += (mouseTargetY * 0.012 - camera.rotation.x) * 0.04;
    camera.rotation.y += (mouseTargetX * 0.012 - camera.rotation.y) * 0.04;

    // Render with bloom if available, else standard render
    if (composer) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
}

window.addEventListener('load', () => init3D());
let lastWindowWidth = window.innerWidth;
window.addEventListener('resize', () => {
    if (window.innerWidth !== lastWindowWidth) {
        lastWindowWidth = window.innerWidth;
        if (camera) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
        }
        if (renderer) renderer.setSize(window.innerWidth, window.innerHeight);
        if (composer)  composer.setSize(window.innerWidth, window.innerHeight);
    }
});

// Cursor & Parallax Logic
const cursorDotX = gsap.quickTo(cursorDot, "x", {duration: 0.05, ease: "power2.out"});
const cursorDotY = gsap.quickTo(cursorDot, "y", {duration: 0.05, ease: "power2.out"});
const cursorCircleX = gsap.quickTo(cursorCircle, "x", {duration: 0.4, ease: "power3.out"});
const cursorCircleY = gsap.quickTo(cursorCircle, "y", {duration: 0.4, ease: "power3.out"});
const bgTrackX = gsap.quickTo(bgTrack, "x", {duration: 1.5, ease: "power2.out"});
const bgTrackY = gsap.quickTo(bgTrack, "y", {duration: 1.5, ease: "power2.out"});

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    
    // Smooth transform instead of left/top layout changes
    cursorDotX(mouseX);
    cursorDotY(mouseY);
    cursorCircleX(mouseX);
    cursorCircleY(mouseY);

    const moveX = (mouseX / window.innerWidth - 0.5) * 2;
    const moveY = (mouseY / window.innerHeight - 0.5) * 2;

    // Feed into camera parallax (consumed in animate loop)
    mouseTargetX = moveX;
    mouseTargetY = moveY;

    // Background Parallax
    if (bgTrack) {
        bgTrackX(moveX * 30);
        bgTrackY(moveY * 30);
    }

    if (particles) {
        gsap.to(particles.position, {
            x: moveX * 1.5,
            y: moveY * -1.5,
            duration: 2.5,
            ease: "power2.out",
            overwrite: "auto"
        });
    }
});

document.addEventListener('mouseover', (e) => {
    const interactive = e.target.closest('a, button, .product-item, .client-item');
    document.body.classList.toggle('cursor-hover', !!interactive);
});

/* ============================
 *  PRODUCT DETAIL LOGIC
 * ============================ */
const productData = {
    "Bioprocess Engineering": {
        cat: "ENGINEERING",
        desc: "Development of P&ID, PFD, equipment design reviews, functional specifications, and equipment qualification testing for complete process documentation and validation.",
        specs: [
            { label: "Core Focus", value: "Process Engineering Calculations" },
            { label: "Documentation", value: "P&ID, PFD, SFC, Valve Matrices" },
            { label: "Validation", value: "IQ, OQ, and PQ Phase Testing" }
        ]
    },
    "Process Automation": {
        cat: "AUTOMATION",
        desc: "End-to-end process automation engineering, including DCS, SCADA, and PLC solutions. We specialize in ISA 88 Batch Control architectures and compliant Electronic Batch Manufacturing Records (EBMR).",
        specs: [
            { label: "Platform Expertise", value: "Siemens PCS7, TIA, WinCC, Zenon" },
            { label: "Batch Control", value: "ISA 88 Standards" },
            { label: "Enterprise", value: "MES & MOM Solutions Integration" }
        ]
    },
    "Commissioning & Qualification": {
        cat: "VALIDATION",
        desc: "Comprehensive qualification and validation services ensuring regulatory compliance from design to PQ phase, including Contamination Control Strategy (CCS) and CSV/CSA services.",
        specs: [
            { label: "Regulations", value: "GAMP5, 21 CFR Part 11, EU GMP" },
            { label: "Protocols", value: "Design to PQ Phase Documentation" },
            { label: "Assessments", value: "Risk Assessment & CCS" }
        ]
    },
    "Embedded Engineering": {
        cat: "COMPLIANCE",
        desc: "Sustained engineering support for plant operations and maintenance. We provide process optimization, complex troubleshooting, and long-term operational support for pharmaceutical environments.",
        specs: [
            { label: "Support Model", value: "Preventive Maintenance & AMC" },
            { label: "Optimization", value: "Process Inefficiency Resolution" },
            { label: "Regulatory", value: "Data Integrity (ALCOA+) Compliance" }
        ]
    },
    "Digital Transformation": {
        cat: "IT & OT INTEGRATION",
        desc: "IPAQ Solutions follows an integrated delivery model (Process + Automation + Validation), where process engineers define and validate process intent, automation engineers implement Siemens control systems, and validation engineers ensure compliance and traceability. This model enables reduced project risk, faster qualification timelines, consistent documentation, and smooth regulatory inspections.",
        specs: [
            { label: "Integration", value: "Seamless IT & OT Data Flow" },
            { label: "Delivery Model", value: "Process + Automation + Validation" },
            { label: "Outcomes", value: "Reduced Risk & Faster Qualification" }
        ]
    },
    "MES Implementation": {
        cat: "REAL-TIME OPERATIONS",
        desc: "IPAQ Solutions deploys MES to help pharma and biotech companies streamline production, ensure regulatory compliance, and achieve full digital transformation across manufacturing operations.",
        specs: [
            { label: "Regulatory Compliance", value: "FDA, EMA & GMP aligned" },
            { label: "Batch Record Management", value: "Paperless EBMR & full traceability" },
            { label: "Real-Time Visibility", value: "Live OEE & production monitoring" }
        ]
    }
};

const detailPanel = document.getElementById('detail-panel');
const closeBtn = document.querySelector('.close-detail');

const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

document.querySelectorAll('.product-item').forEach(item => {
    item.style.cursor = 'none'; // Keep custom cursor control
    item.addEventListener('click', () => {
        const name = item.getAttribute('data-name');
        const data = productData[name];
        if (!data) return;

        document.getElementById('detail-category').textContent = data.cat;
        document.getElementById('detail-title').textContent = name;
        document.getElementById('detail-desc').textContent = data.desc;

        const specBox = document.getElementById('detail-specs');
        specBox.innerHTML = data.specs.map(s => `
            <div class="spec-row">
                <span class="spec-label">${s.label}</span>
                <span class="spec-value">${s.value}</span>
            </div>
        `).join('');

        detailPanel.classList.add('open');
        detailPanel.setAttribute('aria-expanded', 'true');
        
        // Focus Trap
        const focusableContent = detailPanel.querySelectorAll(focusableElements);
        if (focusableContent.length > 0) {
            focusableContent[0].focus();
        }
    });
});

const closePanel = () => {
    detailPanel.classList.remove('open');
    detailPanel.setAttribute('aria-expanded', 'false');
};
closeBtn.addEventListener('click', closePanel);
document.getElementById('cta-detail').addEventListener('click', closePanel);
detailPanel.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closePanel();
    } else if (e.key === 'Tab') {
        const focusableContent = detailPanel.querySelectorAll(focusableElements);
        const first = focusableContent[0];
        const last = focusableContent[focusableContent.length - 1];
        
        if (e.shiftKey) {
            if (document.activeElement === first) {
                last.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === last) {
                first.focus();
                e.preventDefault();
            }
        }
    }
});

/* ============================
 *  EXPERIMENTAL HOVER GLOW
 * ============================ */
document.querySelectorAll('.product-item').forEach(card => {
    const glow = document.createElement('div');
    glow.className = 'card-glow';
    card.appendChild(glow);

    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        gsap.to(glow, {
            x: x, y: y,
            duration: 0.4,
            ease: "power2.out",
            opacity: 1,
            overwrite: "auto"
        });
    });
    card.addEventListener('mouseleave', () => {
        gsap.to(glow, { opacity: 0, duration: 0.5 });
    });
});

/* ============================
 *  THEME TOGGLE LOGIC
 * ============================ */
const themeToggleBtn = document.getElementById('theme-toggle');
const iconSun = document.querySelector('.icon-sun');
const iconMoon = document.querySelector('.icon-moon');

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Toggle Icons (show moon in light mode to switch to dark, show sun in dark mode to switch to light)
    if (theme === 'light') {
        if (iconSun) iconSun.style.display = 'none';
        if (iconMoon) iconMoon.style.display = 'block';
    } else {
        if (iconSun) iconSun.style.display = 'block';
        if (iconMoon) iconMoon.style.display = 'none';
    }
    
    // Update 3D Scene
    if (typeof scene !== 'undefined' && scene) {
        if (theme === 'light') {
            scene.background = new THREE.Color(0xF8FAFC); // Force bright white background
            if (bloomPass) bloomPass.enabled = false; // Disable bloom so white doesn't blow out
            if (typeof particles !== 'undefined' && particles && particles.material) {
                particles.material.blending = THREE.NormalBlending;
                particles.material.color.setHex(0x0f172a);
            }
        } else {
            scene.background = null; 
            if (bloomPass) {
                bloomPass.enabled = true; // Enable bloom in dark mode
                bloomPass.strength = 0.35; // Lower bloom strength to prevent glowing out the DNA model
            }
            if (typeof particles !== 'undefined' && particles && particles.material) {
                particles.material.blending = THREE.AdditiveBlending;
                particles.material.color.setHex(0xffffff);
            }
        }
    }
    
    // Update DNA model colors
    if (typeof model !== 'undefined' && model) {
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                if (theme === 'light') {
                    // Save original
                    if (child.material.userData.origColor === undefined) {
                        child.material.userData.origColor = child.material.color.getHex();
                        child.material.userData.origEmissive = child.material.emissive.getHex();
                        child.material.userData.origEmissiveIntensity = child.material.emissiveIntensity;
                    }
                    
                    // Apply vibrant dark colors for white background
                    if (child.material.userData.origColor === 0x0ea5e9) {
                        child.material.color.setHex(0x023e8a); // deep blue
                        child.material.emissive.setHex(0x000000);
                        child.material.emissiveIntensity = 0;
                    } else if (child.material.userData.origColor === 0x10b981) {
                        child.material.color.setHex(0x007f5f); // deep green
                        child.material.emissive.setHex(0x000000);
                        child.material.emissiveIntensity = 0;
                    } else if (child.material.userData.origColor === 0x22d3ee) {
                        child.material.color.setHex(0x00b4d8); // cyan rungs
                        child.material.emissive.setHex(0x000000);
                        child.material.emissiveIntensity = 0;
                    }
                } else {
                    // Restore glowing dark mode colors
                    if (child.material.userData.origColor !== undefined) {
                        child.material.color.setHex(child.material.userData.origColor);
                        child.material.emissive.setHex(child.material.userData.origEmissive);
                        child.material.emissiveIntensity = child.material.userData.origEmissiveIntensity;
                    }
                }
            }
        });
    }
    
    // Trigger scroll event to ensure background color matches scroll position
    window.dispatchEvent(new Event('scroll'));
}

// Initial Sync
window.addEventListener('DOMContentLoaded', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(currentTheme);
});

// Update scene again after init3D
const originalInit3D = typeof init3D === 'function' ? init3D : null;
if (originalInit3D) {
    init3D = function() {
        originalInit3D();
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        applyTheme(currentTheme);
    }
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    });
}

