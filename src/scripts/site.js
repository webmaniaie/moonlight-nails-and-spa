const THREE = await import('three');
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

(function () {
    'use strict';
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const IS_MOBILE = window.innerWidth < 768;
    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
    const segP = (v, a, b) => clamp((v - a) / (b - a), 0, 1); // progress within [a,b]

    document.getElementById('yr').textContent = new Date().getFullYear();

    /* ── NAV ─────────────────────────────────────────────────────────── */
    const nav = document.getElementById('nav');
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });

    const navToggle = document.getElementById('navToggle');
    const mobilePanel = document.getElementById('mobilePanel');
    let menuOpen = false;
    const ICON_BURGER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
    const ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    function setMenu(o) {
      menuOpen = o;
      mobilePanel.classList.toggle('open', o);
      mobilePanel.setAttribute('aria-hidden', o ? 'false' : 'true');
      if (o) mobilePanel.removeAttribute('inert'); else mobilePanel.setAttribute('inert', '');
      navToggle.setAttribute('aria-expanded', o ? 'true' : 'false');
      navToggle.setAttribute('aria-label', o ? 'Close menu' : 'Open menu');
      navToggle.innerHTML = o ? ICON_CLOSE : ICON_BURGER;
      document.body.style.overflow = o ? 'hidden' : '';
      if (o) {
        const b = document.getElementById('demoBanner'); if (b) b.classList.remove('show');
        const firstLink = mobilePanel.querySelector('a');
        if (firstLink) setTimeout(() => firstLink.focus(), 60);   // move focus into the panel
      }
    }
    navToggle.addEventListener('click', () => setMenu(!menuOpen));
    mobilePanel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));

    // Keyboard: Escape closes the menu (focus returns to the toggle); Tab is trapped inside it.
    document.addEventListener('keydown', (e) => {
      if (!menuOpen) return;
      if (e.key === 'Escape') { setMenu(false); navToggle.focus(); return; }
      if (e.key === 'Tab') {
        const f = mobilePanel.querySelectorAll('a[href], button:not([disabled])');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // Close the mobile menu when widening to the desktop layout.
    const navDesktopMQ = window.matchMedia('(min-width: 921px)');
    function handleNavMQ(e) { if (e.matches && menuOpen) setMenu(false); }
    if (navDesktopMQ.addEventListener) navDesktopMQ.addEventListener('change', handleNavMQ);
    else if (navDesktopMQ.addListener) navDesktopMQ.addListener(handleNavMQ);

    // Reserve animation for deliberate navigation clicks; wheel/trackpad input
    // stays native so the page never continues scrolling after the visitor stops.
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (event) => {
        if (a.hasAttribute('data-book')) return;
        const id = a.getAttribute('href');
        if (!id || id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;

        event.preventDefault();
        const targetTop = target.getBoundingClientRect().top + window.scrollY - 8;
        window.scrollTo({ top: targetTop, behavior: REDUCED ? 'auto' : 'smooth' });
      });
    });

    /* ── SCROLL-SPY — mark the nav link for the section currently in view ── */
    (function navScrollSpy() {
      const spyLinks = Array.from(
        document.querySelectorAll('.nav-links a[href^="#"], .mobile-panel a[href^="#"]')
      ).filter(a => !a.hasAttribute('data-book'));
      if (!spyLinks.length || !('IntersectionObserver' in window)) return;

      const linksById = new Map();
      spyLinks.forEach(a => {
        const id = a.getAttribute('href').slice(1);
        if (!id) return;
        if (!linksById.has(id)) linksById.set(id, []);
        linksById.get(id).push(a);
      });
      const sections = [...linksById.keys()]
        .map(id => document.getElementById(id))
        .filter(Boolean);
      if (!sections.length) return;

      let current = null;
      function setActive(id) {
        if (id === current) return;
        current = id;
        spyLinks.forEach(a => { a.classList.remove('active'); a.removeAttribute('aria-current'); });
        (linksById.get(id) || []).forEach(a => {
          a.classList.add('active');
          a.setAttribute('aria-current', 'true');
        });
      }

      const io = new IntersectionObserver((entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      }, { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] });

      sections.forEach(s => io.observe(s));
    })();

    /* ── DEMO BANNER ─────────────────────────────────────────────────── */
    const demoBanner = document.getElementById('demoBanner');
    setTimeout(() => demoBanner.classList.add('show'), 2200);
    document.getElementById('demoClose').addEventListener('click', () => demoBanner.classList.remove('show'));

    /* ════════════════════════════════════════════════════════════════
       THREE.JS — bottle + lifting brush + trailing gel ribbon
    ════════════════════════════════════════════════════════════════ */
    const canvas = document.getElementById('three-canvas');
    const pCanvas = document.getElementById('particles-canvas');
    let heroProgress = 0;      // 0→1 driven by ScrollTrigger
    let debugP = null;         // manual override for tuning
    window.__setHeroProgress = (p) => { debugP = (p === null ? null : clamp(p, 0, 1)); };

    let renderer, scene, camera, bottleGroup, appGroup, ribbonMesh, ribbonMat, sparkleGroup, gelTip;
    let nailGroup, nailBed, nailMat, brushCurve, clipGroup, pushGroup, scissGroup;
    const camFrame = { cx: 0, cy: 0, W: 1, H: 1 };   // current camera framing (for corner-anchored tools)
    const MOUTH = new THREE.Vector3(0, 0.62, 0);     // gel source at the bottle mouth
    const REST_TIP = new THREE.Vector3(0, -0.10, 0); // brush dipped in the bottle
    const APEX = new THREE.Vector3(0, 1.15, 0);      // top of the lift
    const NB = new THREE.Vector3();                  // brush target: nail base (cuticle)
    const NT = new THREE.Vector3();                  // brush target: nail tip (free edge)
    const NAXIS = new THREE.Vector3(0, 1, 0);
    const NAIL_NUDE = new THREE.Color(0xe9cabb);
    const NAIL_PINK = new THREE.Color(0xe2568c);
    const GEL_CHAMP = new THREE.Color(0xc99a4a);
    const GEL_BLUSH = new THREE.Color(0xe09aa3);

    const easeOutBack = (t) => { t = clamp(t, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

    // Responsive layout — nail position + camera framing (recomputed on resize)
    let LAY = computeLayout();
    function computeLayout() {
      const aspect = window.innerWidth / Math.max(1, window.innerHeight);
      // Treat any narrow viewport as portrait too, so phones/tablets keep the
      // bottle centred (no rightward camera pan) regardless of aspect ratio.
      const portrait = aspect < 0.85 || window.innerWidth < 820;
      const nailX = portrait ? 0.74 : 1.06;
      return {
        aspect, portrait, nailX,
        nb: new THREE.Vector3(nailX, 0.04, 0.50),         // cuticle (lower, in front of the nail)
        nt: new THREE.Vector3(nailX + 0.02, 0.52, 0.54),  // free edge (upper)
        ab: new THREE.Vector3(nailX - 0.05, 0.86, 0.44),  // arc-over point above the nail
        side: new THREE.Vector3(nailX + (portrait ? 0.30 : 0.44), 0.46, 0.56), // final resting spot
        restCx: 0, restCy: portrait ? 0.06 : 0.0,
        restW: portrait ? 1.12 : 0.95, restH: portrait ? 1.78 : 1.42,
        // keep the bottle CENTERED (no pan) and widen the frame so the tools have room each side
        wideCx: 0.0, wideCy: portrait ? 0.06 : 0.50,
        wideW: portrait ? 1.24 : 1.92, wideH: portrait ? 1.92 : 2.0
      };
    }

    // Camera framing for "spread" (0 = bottle only, 1 = bottle + nail) — fits both axes for any aspect
    function applyCamera(spread) {
      const L = LAY;
      const cx = lerp(L.restCx, L.wideCx, spread);
      const cy = lerp(L.restCy, L.wideCy, spread);
      const W = lerp(L.restW, L.wideW, spread);
      const H = lerp(L.restH, L.wideH, spread);
      const halfV = Math.tan((42 * Math.PI / 180) / 2);
      const z = Math.max(H / halfV, W / (halfV * L.aspect)) * 1.12;
      camera.position.set(cx, cy, z);
      camera.lookAt(cx, cy, 0);
      camFrame.cx = cx; camFrame.cy = cy; camFrame.W = W; camFrame.H = H;
    }

    function placeNail() {
      if (!nailGroup) return;
      NB.copy(LAY.nb); NT.copy(LAY.nt);
      nailGroup.position.set(LAY.nailX, -0.04, 0.28);
      nailGroup.rotation.set(-0.30, 0.14, -0.26); // present the nail toward the camera
      // one smooth rounded flight path: rest → up → above the nail → beside it
      brushCurve = new THREE.CatmullRomCurve3([
        REST_TIP.clone(),
        APEX.clone(),
        new THREE.Vector3((APEX.x + LAY.ab.x) / 2, APEX.y + 0.08, (APEX.z + LAY.ab.z) / 2),
        LAY.ab.clone(),
        LAY.side.clone()
      ], false, 'centripetal');
    }

    // Brush-TIP flight: lift straight out of the bottle over the first 30%, then HOLD above it
    function pathPoint(s) {
      const e = smooth(clamp(s / 0.30, 0, 1));
      return new THREE.Vector3(lerp(REST_TIP.x, APEX.x, e), lerp(REST_TIP.y, APEX.y, e), lerp(REST_TIP.z, APEX.z, e));
    }
    const sFromP = (p) => smooth(segP(p, 0.14, 0.86));

    function initThree() {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
      applyCamera(0);

      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !REDUCED });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_MOBILE ? 1.3 : 1.5));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.outputEncoding = THREE.sRGBEncoding;

      // Soft warm gradient environment — champagne reflections (not white) read on a light bg
      try {
        const ec = document.createElement('canvas'); ec.width = 16; ec.height = 256;
        const ctx = ec.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, 0, 256);
        g.addColorStop(0, '#f4e7cd'); g.addColorStop(0.45, '#d9b779'); g.addColorStop(1, '#a87f3f');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 256);
        const envTex = new THREE.CanvasTexture(ec); envTex.mapping = THREE.EquirectangularReflectionMapping;
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromEquirectangular(envTex).texture;
        envTex.dispose();
      } catch (e) { /* lights handle it */ }

      // Lights
      scene.add(new THREE.HemisphereLight(0xffffff, 0xe8dcc4, 0.85));
      const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(2.5, 4, 4); scene.add(key);
      const fill = new THREE.DirectionalLight(0xe9dcc4, 0.5); fill.position.set(-3, 1, 2); scene.add(fill);
      const rim = new THREE.DirectionalLight(0xc7a977, 0.7); rim.position.set(0, 2, -4); scene.add(rim);

      /* ── soft contact shadow to ground the bottle ── */
      (function () {
        const sc = document.createElement('canvas'); sc.width = sc.height = 128;
        const sx = sc.getContext('2d');
        const rg = sx.createRadialGradient(64, 64, 4, 64, 64, 64);
        rg.addColorStop(0, 'rgba(74,56,33,0.34)'); rg.addColorStop(0.6, 'rgba(74,56,33,0.12)'); rg.addColorStop(1, 'rgba(74,56,33,0)');
        sx.fillStyle = rg; sx.fillRect(0, 0, 128, 128);
        const tex = new THREE.CanvasTexture(sc);
        const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
        sh.rotation.x = -Math.PI / 2; sh.position.y = -0.92; scene.add(sh);
      })();

      /* ── BOTTLE (stationary) ── */
      bottleGroup = new THREE.Group(); scene.add(bottleGroup);
      const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xd9bf90, metalness: 0, roughness: 0.13, transmission: 0.55, thickness: 1.1, ior: 1.48, attenuationColor: new THREE.Color(0xb5853f), attenuationDistance: 0.55, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.78, envMapIntensity: 1.0 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 1.5, 64, 1), glassMat);
      bottleGroup.add(body);
      // liquid (the gel) — richer champagne so it reads on the light bg
      const liquidMat = new THREE.MeshPhysicalMaterial({ color: 0xbe8d3a, metalness: 0, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.1, transparent: false, opacity: 1, envMapIntensity: 0.7, emissive: 0x5c3f17, emissiveIntensity: 0.18 });
      const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.61, 1.1, 64), liquidMat);
      liquid.position.y = -0.2; bottleGroup.add(liquid);
      // neck
      const neckMat = new THREE.MeshPhysicalMaterial({ color: 0xe8dabd, metalness: 0, roughness: 0.08, transmission: 0.78, thickness: 0.4, transparent: true, opacity: 0.6, envMapIntensity: 1.4 });
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.28, 48), neckMat);
      neck.position.y = 0.74; bottleGroup.add(neck);
      // gold rings
      function ring(y, r) {
        const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.016, 16, 60), new THREE.MeshStandardMaterial({ color: 0xc7a977, metalness: 0.95, roughness: 0.22, envMapIntensity: 1.4 }));
        m.position.y = y; m.rotation.x = Math.PI / 2; return m;
      }
      bottleGroup.add(ring(0.55, 0.45));
      bottleGroup.add(ring(-0.62, 0.69));

      /* ── APPLICATOR (cap + handle + brush + gel tip) — origin at the TIP ── */
      appGroup = new THREE.Group(); scene.add(appGroup);
      const capMat = new THREE.MeshStandardMaterial({ color: 0xc7a977, metalness: 0.92, roughness: 0.24, envMapIntensity: 1.5 });
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.31, 0.46, 48), capMat);
      cap.position.y = 1.0; appGroup.add(cap);
      const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.29, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
      capTop.position.y = 1.23; appGroup.add(capTop);
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x2b2723, metalness: 0.55, roughness: 0.38 });
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.64, 16), handleMat);
      handle.position.y = 0.48; appGroup.add(handle);
      const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.045, 0.12, 16), new THREE.MeshStandardMaterial({ color: 0xc7a977, metalness: 0.92, roughness: 0.28 }));
      ferrule.position.y = 0.16; appGroup.add(ferrule);
      // clean brush bristle — no paint/gel on the brush
      const bristleMat = new THREE.MeshStandardMaterial({ color: 0x39322b, metalness: 0.1, roughness: 0.6 });
      const bristle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 18, 18), bristleMat);
      bristle.scale.set(1, 1.7, 1); bristle.position.y = 0.05; appGroup.add(bristle);
      appGroup.position.copy(REST_TIP);

      /* ── FINGERTIP + NAIL (rises into view beside the bottle, then is painted) ── */
      nailGroup = new THREE.Group(); nailGroup.scale.setScalar(0.0001); scene.add(nailGroup);
      const skinMat = new THREE.MeshPhysicalMaterial({ color: 0xe6b89f, roughness: 0.62, clearcoat: 0.18, clearcoatRoughness: 0.55, envMapIntensity: 0.28 });
      // short, clearly-a-fingertip (knuckle + rounded tip), pointing up
      const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.4, 40), skinMat); finger.position.y = -0.04; nailGroup.add(finger);
      const ftip = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 24), skinMat); ftip.position.y = 0.17; ftip.scale.set(1, 1.05, 1); nailGroup.add(ftip);
      const knuck = new THREE.Mesh(new THREE.SphereGeometry(0.18, 28, 20), skinMat); knuck.position.y = -0.3; knuck.scale.set(1, 0.8, 1); nailGroup.add(knuck);
      // large almond nail on the camera-facing (+Z) side — lerped nude→blush during the paint
      nailMat = new THREE.MeshPhysicalMaterial({ color: NAIL_NUDE.clone(), roughness: 0.4, clearcoat: 0.55, clearcoatRoughness: 0.22, envMapIntensity: 0.28, emissive: NAIL_PINK.clone(), emissiveIntensity: 0 });
      nailBed = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 32), nailMat);
      nailBed.scale.set(0.2, 0.36, 0.16); nailBed.position.set(0, 0.2, 0.085); nailBed.rotation.x = -0.5; nailGroup.add(nailBed);
      placeNail();

      /* ── STEEL TOOLS: cuticle nippers + pusher + scissors (drift in from the corners) ── */
      const steel = new THREE.MeshStandardMaterial({ color: 0xc6cace, metalness: 0.96, roughness: 0.22, envMapIntensity: 1.45 });
      const steelMatte = new THREE.MeshStandardMaterial({ color: 0xb6bbc1, metalness: 0.9, roughness: 0.5, envMapIntensity: 1.0 });
      const steelDark = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.95, roughness: 0.3, envMapIntensity: 1.2 });
      function tube(pts, r, mat) {
        const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), false, 'centripetal');
        return new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(20, pts.length * 8), r, 12, false), mat);
      }

      // — Cuticle nippers — built jaws-up / handles-down, opening in the XY plane —
      clipGroup = new THREE.Group(); clipGroup.scale.setScalar(0.0001); clipGroup.visible = false; scene.add(clipGroup);
      (function buildNippers() {
        const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 24), steelDark);
        pivot.rotation.x = Math.PI / 2; clipGroup.add(pivot);
        const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.17, 16), steel);
        rivet.rotation.x = Math.PI / 2; clipGroup.add(rivet);
        clipGroup.add(tube([[-0.03, 0.05, 0], [-0.06, 0.22, 0], [-0.015, 0.4, 0]], 0.035, steel));
        clipGroup.add(tube([[0.03, 0.05, 0], [0.06, 0.22, 0], [0.015, 0.4, 0]], 0.035, steel));
        clipGroup.add(tube([[-0.05, -0.05, 0], [-0.13, -0.42, 0], [-0.17, -0.9, 0], [-0.09, -1.28, 0]], 0.055, steel));
        clipGroup.add(tube([[0.05, -0.05, 0], [0.13, -0.42, 0], [0.17, -0.9, 0], [0.09, -1.28, 0]], 0.055, steel));
        clipGroup.add(tube([[-0.11, -0.46, 0.03], [0, -0.66, 0.03], [0.11, -0.46, 0.03]], 0.02, steelMatte));
      })();

      // — Double-ended cuticle pusher — long handle, angled spoon (top) + flat spade (bottom) —
      pushGroup = new THREE.Group(); pushGroup.scale.setScalar(0.0001); pushGroup.visible = false; scene.add(pushGroup);
      (function buildPusher() {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 1.5, 24), steel);
        pushGroup.add(shaft);
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.52, 24), steelMatte);
        pushGroup.add(grip);
        const collarT = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 20), steel); collarT.position.y = 0.28; pushGroup.add(collarT);
        const collarB = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 20), steel); collarB.position.y = -0.28; pushGroup.add(collarB);
        const neckT = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.05, 0.22, 20), steel); neckT.position.y = 0.84; pushGroup.add(neckT);
        const spoon = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 20, 0, Math.PI * 2, 0, Math.PI / 2), steel);
        spoon.scale.set(0.9, 0.55, 0.45); spoon.position.set(0, 0.99, 0.02); spoon.rotation.x = -0.5; pushGroup.add(spoon);
        const neckB = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.2, 20), steel); neckB.position.y = -0.84; pushGroup.add(neckB);
        const spade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.035), steel);
        spade.position.set(0, -1.0, 0); spade.rotation.x = 0.12; pushGroup.add(spade);
      })();

      // — Manicure scissors — finger rings (bottom) + slim tapered blades (top), opening in XY plane —
      scissGroup = new THREE.Group(); scissGroup.scale.setScalar(0.0001); scissGroup.visible = false; scene.add(scissGroup);
      (function buildScissors() {
        const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.1, 20), steelDark); sp.rotation.x = Math.PI / 2; scissGroup.add(sp);
        const sr = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.13, 14), steel); sr.rotation.x = Math.PI / 2; scissGroup.add(sr);
        function blade(sign) {
          const b = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.045, 0.74, 18), steel);
          b.position.set(sign * 0.02, 0.45, 0); b.rotation.z = sign * 0.05; b.scale.z = 0.5; scissGroup.add(b);
        }
        blade(-1); blade(1);
        scissGroup.add(tube([[-0.03, -0.04, 0], [-0.1, -0.3, 0], [-0.17, -0.52, 0]], 0.03, steel));
        scissGroup.add(tube([[0.03, -0.04, 0], [0.1, -0.3, 0], [0.17, -0.52, 0]], 0.03, steel));
        const ringGeo = new THREE.TorusGeometry(0.12, 0.028, 16, 40);
        const rL = new THREE.Mesh(ringGeo, steel); rL.position.set(-0.21, -0.64, 0); scissGroup.add(rL);
        const rR = new THREE.Mesh(ringGeo, steel); rR.position.set(0.21, -0.64, 0); scissGroup.add(rR);
      })();

      // normalise every tool to the SAME base size (max dimension → 1) so they all render identical-sized
      [clipGroup, pushGroup, scissGroup].forEach(g => {
        g.scale.setScalar(1);
        const sz = new THREE.Vector3(); new THREE.Box3().setFromObject(g).getSize(sz);
        g.userData.norm = 1 / Math.max(sz.x, sz.y, sz.z);
        g.scale.setScalar(0.0001);
      });

      // sparkles
      sparkleGroup = new THREE.Group(); scene.add(sparkleGroup);
      for (let i = 0; i < 10; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), new THREE.MeshBasicMaterial({ color: 0xc7a977, transparent: true, opacity: 0.6 }));
        s.userData = { a: Math.random() * Math.PI * 2, r: 0.4 + Math.random() * 0.6, sp: 0.4 + Math.random(), yb: (Math.random() - 0.5) * 1.4 };
        sparkleGroup.add(s);
      }
    }

    let idle = 0;
    let heroDone = false;     // true once the hero is dissolved & scrolled past
    const heroPop = document.getElementById('heroPop');
    let popShown = false;     // has the pop-up started its zoom-in?
    let popT0 = 0;            // timestamp when the zoom-in began
    const POP_DUR = 0.5;      // 0.5s zoom-in, in seconds
    function projectToScreen(vec) {
      const v = vec.clone().project(camera);
      return {
        x: (v.x * 0.5 + 0.5) * window.innerWidth,
        y: (-v.y * 0.5 + 0.5) * window.innerHeight
      };
    }
    function tick() {
      requestAnimationFrame(tick);
      if (!renderer) return;
      const p = (debugP !== null ? debugP : heroProgress);

      // dissolve whole 3D as we transition out
      const fade = smooth(segP(p, 0.48, 1.0));   // begin dissolving right after the models settle (no dead hold)
      canvas.style.opacity = (1 - fade).toFixed(3);
      pCanvas.style.opacity = (1 - fade).toFixed(3);

      // ── Hero pop-up: once the 3D has nearly dissolved, zoom in from the bottle ──
      if (heroPop) {
        const now = performance.now() / 1000;
        // trigger as the 3D choreography finishes dissolving (driven by time, not scroll,
        // since there's almost no scroll room left once the 3D ends)
        if (!popShown && fade >= 0.55) {
          popShown = true; popT0 = now;
          heroPop.style.visibility = 'visible';
        }
        if (popShown) {
          const t = now - popT0;                            // seconds since the pop began
          const zoom = clamp(t / POP_DUR, 0, 1);            // 0→1 over 0.5s (zoom-in)
          const ease = 1 - Math.pow(1 - zoom, 3);           // ease-out-cubic
          const hold = 1.1;                                 // hold ~1.1s
          const autoFade = smooth(segP(t, hold, hold + 0.6)); // fade by hold+0.6s
          const opacity = ease * (1 - autoFade);
          // origin = the gel bottle's mouth, projected to screen
          const origin = projectToScreen(MOUTH);
          const heroRect = canvas.getBoundingClientRect();
          const ox = origin.x - (heroRect.left + heroRect.width / 2);
          const oy = origin.y - (heroRect.top + heroRect.height / 2);
          const scale = lerp(0.15, 1, ease);
          heroPop.style.opacity = opacity.toFixed(3);
          heroPop.style.transform =
            'translate(-50%, -50%) ' +
            'translate(' + (ox * (1 - ease)).toFixed(1) + 'px, ' + (oy * (1 - ease)).toFixed(1) + 'px) ' +
            'scale(' + scale.toFixed(3) + ')';
          if (opacity <= 0.001) heroPop.style.visibility = 'hidden';
        }
      }

      // Once the hero is gone, stop all 3D work so the rest of the page scrolls smoothly
      heroDone = (fade >= 1);
      if (heroDone) return;

      idle += 0.016;

      if (!REDUCED) {
        const s = sFromP(p);
        // camera eases from "bottle only" to "bottle + nail" as the nail comes out
        applyCamera(smooth(segP(p, 0.18, 0.46)));

        // bottle: gentle idle float + slow spin that eases off once the brush lifts
        const lifting = segP(p, 0.10, 0.26);
        bottleGroup.rotation.y += 0.0015 * (1 - lifting);
        bottleGroup.position.y = Math.sin(idle * 0.6) * 0.02;

        // brush lifts straight out of the bottle and holds above it — no motion toward the nail
        appGroup.position.copy(pathPoint(s));
        appGroup.rotation.z = 0;

        // the nail rises into view
        const appear = easeOutBack(segP(s, 0.22, 0.42));
        nailGroup.visible = appear > 0.001;
        nailGroup.scale.setScalar(Math.max(0.0001, appear));

        // the colour simply APPEARS — bright pink, sooner & quicker, covering the whole nail
        const paint = smooth(segP(s, 0.36, 0.41));
        nailMat.color.copy(NAIL_NUDE).lerp(NAIL_PINK, paint);
        nailMat.roughness = lerp(0.4, 0.1, paint);
        nailMat.clearcoat = lerp(0.5, 1.0, paint);
        nailMat.emissiveIntensity = 0.32 * paint;

        // ── tools drift in from the corners; all SAME SIZE (normalised) and SAME DISTANCE R from the bottle ──
        const ta = easeOutBack(segP(p, 0.14, 0.42));
        const taOn = segP(p, 0.14, 0.42) > 0.001;
        const tScale = LAY.portrait ? 1.07 : 1.37;   // uniform display size, on top of per-tool normalisation
        const R = LAY.portrait ? 1.18 : 1.55;         // equal distance from the bottle (origin) for every tool
        const Rs = R + 1.1;                           // start further out, slide in radially
        const D = Math.PI / 180;
        function placeTool(grp, deg, rotZ, ph) {
          if (!grp) return;
          const c = Math.cos(deg * D), sn = Math.sin(deg * D);
          grp.visible = taOn;
          grp.scale.setScalar(Math.max(0.0001, ta * tScale * (grp.userData.norm || 1)));
          grp.position.set(lerp(c * Rs, c * R, ta), lerp(sn * Rs, sn * R, ta), lerp(-0.3, 0.32, ta));
          grp.rotation.set(0.1, c < 0 ? -0.18 : 0.18, rotZ + Math.sin(idle * 0.4 + ph) * 0.02);
        }
        placeTool(clipGroup, 135, -2.36, 0);   // nippers  — top-left,  jaws toward the bottle
        placeTool(pushGroup, 45, 2.36, 1);     // pusher   — top-right
        placeTool(scissGroup, 225, -0.79, 2);  // scissors — bottom-left, blades toward the bottle

        // sparkles drift from the bottle toward the nail as the scene spreads
        const spr = smooth(segP(p, 0.2, 0.5));
        const scx = lerp(0, (NB.x + NT.x) / 2, spr);
        const scy = lerp(0, (NB.y + NT.y) / 2, spr);
        sparkleGroup.children.forEach(o => {
          o.userData.a += 0.01 * o.userData.sp;
          o.position.set(scx + Math.cos(o.userData.a) * o.userData.r, scy + o.userData.yb * 0.4 + Math.sin(idle + o.userData.a) * 0.05, Math.sin(o.userData.a) * o.userData.r * 0.4 + 0.2);
          o.material.opacity = (0.22 + Math.abs(Math.sin(idle * 0.8 + o.userData.a)) * 0.4) * (1 - fade);
        });
      }
      renderer.render(scene, camera);
    }

    /* ── PARTICLES (subtle champagne motes) ── */
    let pw, ph, parts = [];
    const pctx = pCanvas.getContext('2d');
    const PCOUNT = REDUCED ? 0 : Math.min(58, Math.floor(window.innerWidth * window.innerHeight / 21000));
    const PAL = ['rgba(224,150,170,', 'rgba(214,176,158,', 'rgba(199,169,119,', 'rgba(247,238,226,'];
    function resizeParts() {
      pw = window.innerWidth; ph = window.innerHeight; pCanvas.width = pw; pCanvas.height = ph;
      parts = Array.from({ length: PCOUNT }, () => {
        const t = Math.random();
        const sparkle = t > 0.70;                 // ~30% twinkling sparkles
        const pearl = !sparkle && t < 0.12;       // a few soft pearls / bokeh
        return {
          x: Math.random() * pw, y: Math.random() * ph,
          r: sparkle ? (0.6 + Math.random() * 1.1) : pearl ? (4 + Math.random() * 6) : (1 + Math.random() * 2.4),
          vx: (Math.random() - 0.5) * 0.14,
          vy: -(0.04 + Math.random() * 0.15),
          o: sparkle ? (0.5 + Math.random() * 0.4) : pearl ? (0.05 + Math.random() * 0.05) : (0.06 + Math.random() * 0.12),
          c: sparkle ? 'rgba(255,255,255,' : PAL[(Math.random() * PAL.length) | 0],
          sparkle, tw: Math.random() * 6.28, tws: 0.6 + Math.random() * 1.6,
          sway: Math.random() * 6.28, sways: 0.25 + Math.random() * 0.55, amp: 4 + Math.random() * 7
        };
      });
    }
    let ptime = 0;
    function drawParts() {
      requestAnimationFrame(drawParts);
      if (!pctx || heroDone) return;
      ptime += 0.016;
      pctx.clearRect(0, 0, pw, ph);
      for (const p of parts) {
        let o = p.o;
        if (p.sparkle) o *= 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(ptime * p.tws + p.tw));
        pctx.beginPath();
        pctx.arc(p.x + Math.sin(ptime * p.sways + p.sway) * p.amp, p.y, p.r, 0, Math.PI * 2);
        pctx.fillStyle = p.c + o.toFixed(3) + ')';
        pctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.y < -14) p.y = ph + 14; if (p.x < -14) p.x = pw + 14; if (p.x > pw + 14) p.x = -14;
      }
    }

    /* ── INIT 3D ── */
    let threeOK = false;
    try { initThree(); resizeParts(); tick(); if (!REDUCED) drawParts(); threeOK = true; }
    catch (e) { console.warn('3D init skipped:', e); canvas.style.display = 'none'; }

    /* ════════════════════════════════════════════════════════════════
       INK-REVEAL — a porcelain mask over the hero photo that is carved
       away (organic ink stamps) to reveal it. Cursor-driven on desktop,
       an auto "floating" path on touch. Sits behind the bottle & text.
    ════════════════════════════════════════════════════════════════ */
    (function inkReveal() {
      const ink = document.getElementById('ink-canvas');
      if (!ink) return;
      const ictx = ink.getContext('2d');
      if (!ictx) return;

      // "Floating" (auto-path) mode for touch / no-hover devices and small screens; cursor mode otherwise
      const TOUCH = !window.matchMedia('(hover: hover) and (pointer: fine)').matches || window.innerWidth < 820;
      const MASK = [251, 250, 247];            // porcelain
      const MASK_ALPHA = 0.66;                  // idle veil over the photo
      const BRUSH = TOUCH ? 84 : 150;
      const LIFETIME = TOUCH ? 1400 : 650;      // reveal lingers longer in the floating version
      const R_START = 10, R_VARY = 0.45, STAMP_STEP = 12;
      const MAX_STAMPS = TOUCH ? 110 : 200, SEG = TOUCH ? 28 : 34;
      const WOB = [0.14, 0.08, 0.05], G_INNER = 0.2, G_STOPS = [0.95, 0.88, 0];

      let iw = 0, ih = 0;
      let stamps = [];
      let running = false;
      let last = null;

      function iresize() {
        const dpr = Math.min(window.devicePixelRatio || 1, TOUCH ? 1.3 : 1.6);
        iw = window.innerWidth; ih = window.innerHeight;
        ink.width = Math.round(iw * dpr); ink.height = Math.round(ih * dpr);
        ink.style.width = iw + 'px'; ink.style.height = ih + 'px';
        ictx.setTransform(dpr, 0, 0, dpr, 0, 0);
        paintMask();
      }
      function paintMask() {
        ictx.globalCompositeOperation = 'source-over';
        ictx.clearRect(0, 0, iw, ih);
        ictx.fillStyle = 'rgba(' + MASK[0] + ',' + MASK[1] + ',' + MASK[2] + ',' + MASK_ALPHA + ')';
        ictx.fillRect(0, 0, iw, ih);
      }
      function carve(x, y, r, seed, alpha) {
        const g = ictx.createRadialGradient(x, y, r * G_INNER, x, y, r);
        g.addColorStop(0, 'rgba(0,0,0,' + (G_STOPS[0] * alpha) + ')');
        g.addColorStop(0.5, 'rgba(0,0,0,' + (G_STOPS[1] * alpha) + ')');
        g.addColorStop(1, 'rgba(0,0,0,' + (G_STOPS[2] * alpha) + ')');
        ictx.fillStyle = g;
        ictx.beginPath();
        for (let i = 0; i <= SEG; i++) {
          const a = (i / SEG) * Math.PI * 2;
          const wob = 0.78 + WOB[0] * Math.sin(a * 3 + seed) + WOB[1] * Math.sin(a * 5 + seed * 2.1) + WOB[2] * Math.sin(a * 7 + seed * 0.7);
          const px = x + Math.cos(a) * r * wob, py = y + Math.sin(a) * r * wob;
          i === 0 ? ictx.moveTo(px, py) : ictx.lineTo(px, py);
        }
        ictx.closePath(); ictx.fill();
      }
      function addStamp(x, y) {
        if (stamps.length >= MAX_STAMPS) stamps.shift();
        stamps.push({ x, y, born: performance.now(), seed: Math.random() * Math.PI * 2, rmax: BRUSH * (1 - R_VARY + Math.random() * R_VARY) });
      }
      function stampAlong(x, y) {
        if (!last) { addStamp(x, y); }
        else {
          const dx = x - last.x, dy = y - last.y, dist = Math.hypot(dx, dy);
          const steps = Math.max(1, Math.ceil(dist / STAMP_STEP));
          for (let i = 1; i <= steps; i++) addStamp(last.x + dx * i / steps, last.y + dy * i / steps);
        }
        last = { x, y };
      }
      function iloop() {
        if (heroDone) { running = false; return; }   // hero gone → stop
        const now = performance.now();
        paintMask();
        ictx.globalCompositeOperation = 'destination-out';
        for (let i = stamps.length - 1; i >= 0; i--) {
          const t = (now - stamps[i].born) / LIFETIME;
          if (t >= 1) { stamps.splice(i, 1); continue; }
          const ease = 1 - Math.pow(1 - t, 3);
          const r = R_START + (stamps[i].rmax - R_START) * ease;
          const alpha = 1 - t * t;
          carve(stamps[i].x, stamps[i].y, r, stamps[i].seed, alpha);
        }
        if (stamps.length || TOUCH) requestAnimationFrame(iloop);
        else running = false;
      }
      function start() { if (!running && !heroDone) { running = true; requestAnimationFrame(iloop); } }

      iresize();
      window.addEventListener('resize', iresize);

      if (TOUCH) {
        // mobile / no-cursor: a gentle pre-baked wandering path "floats" the reveal around
        let at = Math.random() * 50;
        function autoPath() {
          requestAnimationFrame(autoPath);
          if (heroDone) return;
          at += 0.039;  // float speed (was 0.03, +30%)
          const x = iw * (0.5 + 0.33 * Math.sin(at * 0.5) + 0.13 * Math.sin(at * 1.13 + 1.7));
          const y = ih * (0.42 + 0.27 * Math.sin(at * 0.37 + 0.6) + 0.10 * Math.cos(at * 0.91));
          stampAlong(x, y);
          start();
        }
        requestAnimationFrame(autoPath);
      } else {
        window.addEventListener('mousemove', (e) => {
          if (heroDone) return;
          stampAlong(e.clientX, e.clientY);
          start();
        }, { passive: true });
      }
    })();

    window.addEventListener('resize', () => {
      LAY = computeLayout();
      placeNail();
      if (threeOK && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        if (REDUCED) applyCamera(0);
      }
      resizeParts();
    });

    /* ════════════════════════════════════════════════════════════════
       GSAP — hero pin, choreography, reveals
    ════════════════════════════════════════════════════════════════ */
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);

      const heroInner = document.getElementById('heroInner');

      if (!REDUCED) {
        // Pin the hero and drive heroProgress through the choreography
        ScrollTrigger.create({
          trigger: '#hero',
          start: 'top top',
          end: '+=150%',
          pin: true,
          pinSpacing: true,
          scrub: 0.6,
          onUpdate: (self) => {
            heroProgress = self.progress;
            // words dissolve early
            const w = segP(self.progress, 0.02, 0.16);
            heroInner.style.opacity = (1 - w).toFixed(3);
            heroInner.style.transform = 'translateY(' + (-w * 40).toFixed(1) + 'px)';
            const sh = document.querySelector('.scroll-hint');
            if (sh) sh.style.opacity = (1 - segP(self.progress, 0, 0.08)).toFixed(3);
          }
        });
      }

      // Reveal-on-scroll
      gsap.utils.toArray('.reveal').forEach((el) => {
        ScrollTrigger.create({
          trigger: el, start: 'top 86%',
          onEnter: () => el.classList.add('in'),
        });
      });

      /* ── SERVICES: word-by-word copy + icon choreography ─────────── */
      function createWordReveal(el) {
        const words = el.textContent.trim().split(/\s+/).filter(Boolean);
        const accentWords = new Set((el.dataset.accentWords || '')
          .split(',').map(word => word.trim().toLowerCase()).filter(Boolean));
        const fragment = document.createDocumentFragment();
        const foregrounds = [];

        words.forEach((word, index) => {
          const wordEl = document.createElement('span');
          const foreground = document.createElement('span');
          const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
          wordEl.className = 'word-reveal' + (accentWords.has(cleanWord) ? ' is-accent' : '');
          wordEl.dataset.word = word;
          foreground.textContent = word;
          wordEl.appendChild(foreground);
          fragment.appendChild(wordEl);
          if (index < words.length - 1) fragment.appendChild(document.createTextNode(' '));
          foregrounds.push(foreground);
        });

        el.setAttribute('aria-label', words.join(' '));
        el.textContent = '';
        el.appendChild(fragment);
        return foregrounds;
      }

      if (!REDUCED) {
        const services = document.getElementById('services');
        const serviceIsMobile = window.matchMedia('(max-width: 768px)').matches;
        const revealText = gsap.utils.toArray('#services [data-word-reveal]');
        const titleWords = revealText.flatMap(createWordReveal);
        const cards = gsap.utils.toArray('#services .svc-card');
        const icons = cards.map(card => card.querySelector('.ic')).filter(Boolean);
        const cardCopy = cards.flatMap(card => Array.from(card.querySelectorAll('h3, p, .price')));

        cards.forEach(card => card.classList.add('service-scroll-card'));
        gsap.set(titleWords, { opacity: 0, y: 12 });
        gsap.set(icons, { opacity: 0, y: 18, scale: 0.55, rotation: -14, transformOrigin: '50% 50%' });
        gsap.set(cardCopy, { opacity: 0, y: 16 });

        const serviceTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: services,
            start: 'top 82%',
            // Small screens get a longer runway, so the stacked cards do not animate all at once.
            end: serviceIsMobile ? 'top -160%' : 'top -54%',
            scrub: serviceIsMobile ? 0.5 : 0.3,
            invalidateOnRefresh: true
          }
        });

        serviceTimeline
          .to(titleWords, { opacity: 1, y: 0, duration: 0.34, stagger: 0.035, ease: 'none' }, 0)
          .to(icons, { opacity: 1, y: 0, scale: 1, rotation: 0, duration: 0.52, stagger: 0.07, ease: 'back.out(1.5)' }, 0.28)
          .to(cardCopy, { opacity: 1, y: 0, duration: 0.44, stagger: 0.035, ease: 'power2.out' }, 0.42);
      }

      window.addEventListener('load', () => ScrollTrigger.refresh());
    } else {
      // no GSAP: just show everything
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
    }

    /* ════════════════════════════════════════════════════════════════
       GALLERY VELOCITY — photo rails move only while the visitor scrolls
    ════════════════════════════════════════════════════════════════ */
    (function initGalleryVelocity() {
      const gallery = document.querySelector('[data-gallery-velocity]');
      if (!gallery || REDUCED) return;

      const rows = Array.from(gallery.querySelectorAll('.velocity-row')).map((row) => {
        const track = row.querySelector('.velocity-track');
        const sourceSet = track && track.querySelector('.velocity-set');
        if (!track || !sourceSet) return null;

        // Astro renders enough eager, repeated sets up front to prevent gaps before JavaScript runs.

        return {
          track,
          sourceSet,
          direction: Number(row.dataset.direction || 1),
          position: 0,
          loopWidth: sourceSet.getBoundingClientRect().width
        };
      }).filter(Boolean);

      if (!rows.length) return;

      let lastScrollY = window.scrollY;

      function renderRow(row) {
        row.track.style.transform = 'translateX(' + (-row.position).toFixed(2) + 'px)';
      }

      function measure() {
        rows.forEach((row) => {
          row.loopWidth = row.sourceSet.getBoundingClientRect().width;
          row.track.style.width = Math.ceil(row.loopWidth * row.track.children.length) + 'px';
          row.position = row.loopWidth ? row.position % row.loopWidth : 0;
          renderRow(row);
        });
      }

      function applyScroll(nextScrollY) {
        if (!Number.isFinite(nextScrollY)) return;
        const distance = nextScrollY - lastScrollY;
        lastScrollY = nextScrollY;
        if (Math.abs(distance) < 1) return;

        rows.forEach((row) => {
          if (!row.loopWidth) return;
          const moveBy = distance * 0.38 * row.direction;
          row.position = (row.position + moveBy) % row.loopWidth;
          if (row.position < 0) row.position += row.loopWidth;
          renderRow(row);
        });
      }

      measure();
      requestAnimationFrame(measure);
      window.addEventListener('resize', measure, { passive: true });
      window.addEventListener('scroll', () => applyScroll(window.scrollY), { passive: true });
    })();

    /* ════════════════════════════════════════════════════════════════
       BOOKING SYSTEM
    ════════════════════════════════════════════════════════════════ */
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const SERVICES = [
      { id: 'mani', name: 'Classic Manicure', desc: 'Shape, cuticle care, massage & polish', dur: '45 min', price: '€25', icon: '<path d="M6 21c0-4 2-7 6-7s6 3 6 7"/><path d="M9 14V7a3 3 0 0 1 6 0v7"/>' },
      { id: 'gel', name: 'Gel / BIAB', desc: 'Builder strength, high-gloss gel finish', dur: '60 min', price: '€40', icon: '<rect x="9" y="9" width="6" height="12" rx="2"/><path d="M10 9V6h4v3M11 3h2v3h-2z"/>' },
      { id: 'pedi', name: 'Spa Pedicure', desc: 'Scrub, warm wrap & nourishing finish', dur: '60 min', price: '€45', icon: '<path d="M5 11c0-3 2-6 5-6 2 0 3 1 3 3 0 3-2 4-2 6 0 2 2 3 4 3"/><path d="M5 11c-1 2-1 5 1 7s6 2 9 1"/>' },
      { id: 'acrylic', name: 'Acrylic Full Set', desc: 'Custom-sculpted extensions, any shape', dur: '90 min', price: '€55', icon: '<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>' },
      { id: 'art', name: 'Nail Art (add-on)', desc: 'Hand-painted detail, foils & gems', dur: '+30 min', price: '€10', icon: '<path d="M3 21l9-9M14 10l4-4a2.8 2.8 0 0 0-4-4l-4 4"/><path d="M12 8l4 4"/>' },
    ];

    const SPECIALISTS = [
      { id: 'any', name: 'Any available', role: 'First free specialist', days: 'Recommended', av: '✦' },
      { id: 'maria', name: 'Maria', role: 'Gel & BIAB', days: 'Mon–Sat', av: 'M' },
      { id: 'jennifer', name: 'Jennifer', role: 'Nail Art', days: 'Tue–Sat', av: 'J' },
      { id: 'sofia', name: 'Sofia', role: 'Mani & Pedi', days: 'Mon–Fri', av: 'S' },
      { id: 'elena', name: 'Elena', role: 'Acrylic Sculpture', days: 'Wed–Sat', av: 'E' },
    ];

    const STEPS = ['Service', 'Specialist', 'Date', 'Time', 'Confirm'];

    const state = { step: 0, viewY: 0, viewM: 0, date: null, time: null, service: null, specialist: null, done: false };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    state.viewY = today.getFullYear(); state.viewM = today.getMonth();

    function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
    function keyOf(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

    // Day status: past | closed | open  (Sundays closed)
    function dayStatus(d) {
      const dd = new Date(d); dd.setHours(0, 0, 0, 0);
      if (dd < today) return 'past';
      const dow = dd.getDay();
      if (dow === 0) return 'closed';      // Sunday — closed
      return 'open';
    }
    function hoursFor(d) {
      const dow = d.getDay();
      if (dow === 6) return [10, 18];      // Sat
      return [9, 19];                      // Mon–Fri
    }
    function slotsFor(d) {
      const [o, c] = hoursFor(d); const out = [];
      for (let h = o; h < c; h++) for (let m of [0, 30]) {
        const label = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
        const taken = (hash(keyOf(d) + label) % 10) < 3; // ~30% taken
        out.push({ label, h, taken });
      }
      return out;
    }

    /* ── render helpers ── */
    const overlay = document.getElementById('bkOverlay');
    const bodyEl = document.getElementById('bkBody');
    const stepsEl = document.getElementById('bkSteps');
    const footEl = document.getElementById('bkFoot');

    function renderSteps() {
      if (state.done) { stepsEl.innerHTML = ''; return; }
      stepsEl.innerHTML = STEPS.map((s, i) => {
        const cls = i === state.step ? 'active' : (i < state.step ? 'done' : '');
        return '<div class="bk-step ' + cls + '" data-step="' + i + '"><span class="num">' + (i < state.step ? '✓' : (i + 1)) + '</span><span class="lbl">' + s + '</span><span class="bar"></span></div>';
      }).join('');
      stepsEl.querySelectorAll('.bk-step').forEach(el => el.addEventListener('click', () => {
        const i = +el.dataset.step; if (i < state.step) { state.step = i; render(); }
      }));
    }

    function monthLabel() { return MONTHS[state.viewM] + ' ' + state.viewY; }

    function renderCalendar() {
      const first = new Date(state.viewY, state.viewM, 1);
      const startDow = (first.getDay() + 6) % 7; // make Monday first
      const ndays = new Date(state.viewY, state.viewM + 1, 0).getDate();
      const prevDisabled = (state.viewY === today.getFullYear() && state.viewM === today.getMonth());
      let cells = '';
      const dh = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      cells += dh.map(d => '<div class="cdh">' + d + '</div>').join('');
      for (let i = 0; i < startDow; i++) cells += '<div class="cal-day empty"></div>';
      for (let day = 1; day <= ndays; day++) {
        const d = new Date(state.viewY, state.viewM, day);
        const st = dayStatus(d);
        const isToday = d.getTime() === today.getTime();
        const sel = state.date && keyOf(d) === keyOf(state.date);
        const disabled = (st === 'past' || st === 'closed');
        const tag = (d.getDay() === 0 && st === 'open') ? '<span class="tag">Sun</span>' : '';
        cells += '<button class="cal-day' + (sel ? ' sel' : '') + (isToday ? ' today' : '') + '" data-day="' + day + '"' + (disabled ? ' disabled' : '') + '>' + day + tag + '</button>';
      }
      return '<div class="cal-top"><span class="mlabel">' + monthLabel() + '</span><span class="cal-nav">' +
        '<button id="calPrev"' + (prevDisabled ? ' disabled' : '') + ' aria-label="Previous month"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M15 6l-6 6 6 6"/></svg></button>' +
        '<button id="calNext" aria-label="Next month"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 6l6 6-6 6"/></svg></button>' +
        '</span></div><div class="cal-grid">' + cells + '</div>' +
        '<div class="cal-legend"><span><i class="lg-open"></i> Available</span><span><i class="lg-sel"></i> Selected</span><span><i class="lg-closed"></i> Closed / past</span></div>';
    }

    function renderTimes() {
      const d = state.date;
      const slots = slotsFor(d);
      const groups = { Morning: [], Afternoon: [], Evening: [] };
      slots.forEach(s => { (s.h < 12 ? groups.Morning : s.h < 17 ? groups.Afternoon : groups.Evening).push(s); });
      let html = '';
      for (const g of ['Morning', 'Afternoon', 'Evening']) {
        if (!groups[g].length) continue;
        html += '<div class="slot-period">' + g + '</div><div class="slot-grid">' +
          groups[g].map(s => '<button class="slot' + (state.time === s.label ? ' sel' : '') + '" data-t="' + s.label + '"' + (s.taken ? ' disabled' : '') + '>' + s.label + '</button>').join('') +
          '</div>';
      }
      return html;
    }

    function renderServices() {
      return '<div class="opt-list">' + SERVICES.map(s =>
        '<button class="opt' + (state.service === s.id ? ' sel' : '') + '" data-svc="' + s.id + '">' +
        '<span class="oic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3">' + s.icon + '</svg></span>' +
        '<span class="ob"><span class="on">' + s.name + '</span><span class="od">' + s.desc + '</span></span>' +
        '<span class="om"><span class="op">' + s.price + '</span><span class="ot">' + s.dur + '</span></span>' +
        '<span class="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg></span>' +
        '</button>').join('') + '</div>';
    }

    function renderSpecialists() {
      return '<div class="spec-grid">' + SPECIALISTS.map(s =>
        '<button class="spec' + (state.specialist === s.id ? ' sel' : '') + '" data-spec="' + s.id + '">' +
        '<span class="av">' + s.av + '</span><span class="sn">' + s.name + '</span><span class="sr">' + s.role + '</span><span class="sd">' + s.days + '</span>' +
        '</button>').join('') + '</div>' +
        '<div style="margin-top:18px;"><span class="demo-note"><span class="i" title="Specialist availability can be tied to each person\'s real roster.">i</span> Each specialist can have their own working days &amp; calendar.</span></div>';
    }

    function svcName(id) { const s = SERVICES.find(x => x.id === id); return s ? s.name + ' · ' + s.price : '—'; }
    function specName(id) { const s = SPECIALISTS.find(x => x.id === id); return s ? s.name : '—'; }
    function dateLabel(d) { return DAYS_FULL[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }

    function renderConfirm() {
      return '<div class="conf-grid">' +
        '<div><div class="field"><label>Your name</label><input id="fName" type="text" placeholder="e.g. Alex Morgan" /></div>' +
        '<div class="field"><label>Phone</label><input id="fPhone" type="tel" placeholder="+00 000 000 0000" /></div>' +
        '<div class="field"><label>Email (for confirmation)</label><input id="fEmail" type="email" placeholder="you@example.com" /></div>' +
        '<div class="pay-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg><span><b>No payment required for this demo.</b> A deposit or full payment step (Stripe, Apple&nbsp;Pay, card) can be enabled right here in the live site.</span></div></div>' +
        '<div class="summary"><h4>Your appointment</h4>' +
        '<div class="sum-row"><span class="k">Date</span><span class="v">' + dateLabel(state.date) + '</span></div>' +
        '<div class="sum-row"><span class="k">Time</span><span class="v">' + state.time + '</span></div>' +
        '<div class="sum-row"><span class="k">Service</span><span class="v">' + svcName(state.service) + '</span></div>' +
        '<div class="sum-row"><span class="k">Specialist</span><span class="v">' + specName(state.specialist) + '</span></div>' +
        '</div></div>';
    }

    function renderSuccess() {
      return '<div class="bk-success"><div class="circle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6L9 17l-5-5"/></svg></div>' +
        '<h3>You\'re booked in ✦</h3>' +
        '<p>This is a demo, so no real appointment was made — but in the live salon you\'d now receive an email &amp; SMS confirmation.</p>' +
        '<div class="summary"><div class="sum-row"><span class="k">Date</span><span class="v">' + dateLabel(state.date) + '</span></div>' +
        '<div class="sum-row"><span class="k">Time</span><span class="v">' + state.time + '</span></div>' +
        '<div class="sum-row"><span class="k">Service</span><span class="v">' + svcName(state.service) + '</span></div>' +
        '<div class="sum-row"><span class="k">Specialist</span><span class="v">' + specName(state.specialist) + '</span></div></div></div>';
    }

    function renderFooter() {
      if (state.done) {
        footEl.innerHTML = '<span class="demo-note"><span class="i" title="Connect Fresha, Square, Google Calendar or your own backend.">i</span> Demo only — connect to your real booking system.</span><div class="acts"><button class="btn btn-ghost" id="bkRestart">Book another</button><button class="btn btn-primary" id="bkDone">Done</button></div>';
        footEl.querySelector('#bkDone').addEventListener('click', closeBooking);
        footEl.querySelector('#bkRestart').addEventListener('click', () => { resetState(); render(); });
        return;
      }
      const canContinue = (state.step === 0 && state.service) || (state.step === 1 && state.specialist) || (state.step === 2 && state.date) || (state.step === 3 && state.time) || (state.step === 4);
      const nextLabel = state.step === 4 ? 'Confirm booking' : 'Continue';
      const nextClass = state.step === 4 ? 'btn-gold' : 'btn-primary';
      footEl.innerHTML =
        '<span class="demo-note"><span class="i" title="No data leaves this page in the demo.">i</span> Step ' + (state.step + 1) + ' of ' + STEPS.length + '</span>' +
        '<div class="acts">' + (state.step > 0 ? '<button class="btn btn-ghost" id="bkBack">Back</button>' : '') +
        '<button class="btn ' + nextClass + '" id="bkNext"' + (canContinue ? '' : ' disabled style="opacity:.45;cursor:not-allowed"') + '>' + nextLabel + '</button></div>';
      const back = footEl.querySelector('#bkBack'); if (back) back.addEventListener('click', () => { state.step--; render(); });
      footEl.querySelector('#bkNext').addEventListener('click', next);
    }

    function next() {
      if (state.step < 4) { state.step++; render(); return; }
      // confirm
      state.done = true; render();
    }

    function bindBody() {
      if (state.step === 0) {
        bodyEl.querySelectorAll('.opt[data-svc]').forEach(b => b.addEventListener('click', () => { state.service = b.dataset.svc; state.step = 1; render(); }));
      } else if (state.step === 1) {
        bodyEl.querySelectorAll('.spec[data-spec]').forEach(b => b.addEventListener('click', () => { state.specialist = b.dataset.spec; state.step = 2; render(); }));
      } else if (state.step === 2) {
        const prev = bodyEl.querySelector('#calPrev'), nx = bodyEl.querySelector('#calNext');
        if (prev) prev.addEventListener('click', () => { if (state.viewM === 0) { state.viewM = 11; state.viewY--; } else state.viewM--; render(); });
        if (nx) nx.addEventListener('click', () => { if (state.viewM === 11) { state.viewM = 0; state.viewY++; } else state.viewM++; render(); });
        bodyEl.querySelectorAll('.cal-day[data-day]').forEach(b => b.addEventListener('click', () => {
          if (b.disabled) return;
          state.date = new Date(state.viewY, state.viewM, +b.dataset.day);
          state.time = null;
          state.step = 3; render();
        }));
      } else if (state.step === 3) {
        bodyEl.querySelectorAll('.slot[data-t]').forEach(b => b.addEventListener('click', () => {
          if (b.disabled) return; state.time = b.dataset.t; state.step = 4; render();
        }));
      }
    }

    function render() {
      renderSteps();
      if (state.done) { bodyEl.innerHTML = renderSuccess(); renderFooter(); return; }
      let title = '', sub = '', content = '';
      if (state.step === 0) { title = 'Choose a service'; sub = 'What would you like done?'; content = renderServices(); }
      else if (state.step === 1) { title = 'Choose a specialist'; sub = 'Request a favourite, or let us assign the first available.'; content = renderSpecialists(); }
      else if (state.step === 2) { title = 'Choose a date'; sub = 'Pick an available day — closed days are greyed out.'; content = renderCalendar(); }
      else if (state.step === 3) { title = 'Choose a time'; sub = dateLabel(state.date) + ' · crossed-out times are already booked.'; content = renderTimes(); }
      else if (state.step === 4) { title = 'Confirm your booking'; sub = 'Almost done — review the details below.'; content = renderConfirm(); }
      bodyEl.innerHTML = '<h3 class="step-t">' + title + '</h3><div class="step-sub">' + sub + '</div>' + content;
      bindBody();
      renderFooter();
      bodyEl.scrollTop = 0;
    }

    function resetState() { state.step = 0; state.date = null; state.time = null; state.service = null; state.specialist = null; state.done = false; state.viewY = today.getFullYear(); state.viewM = today.getMonth(); }

    let lastFocus = null;
    function openBooking(e) {
      if (e) e.preventDefault();
      lastFocus = document.activeElement;
      resetState(); render();
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (window.__lenis) window.__lenis.stop();   // release scroll to the modal
      demoBanner.classList.remove('show');
      setTimeout(() => { const f = document.getElementById('bkClose'); if (f) f.focus(); }, 50);
    }
    function closeBooking() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
      if (window.__lenis) window.__lenis.start();
      if (lastFocus) lastFocus.focus();
    }

    document.querySelectorAll('[data-book]').forEach(b => b.addEventListener('click', openBooking));
    document.getElementById('bkClose').addEventListener('click', closeBooking);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeBooking(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('open')) closeBooking(); });

    /* ── mini calendar preview in booking section ── */
    (function miniCalendar() {
      const wrap = document.getElementById('miniCal');
      const ml = document.getElementById('bvMonth');
      if (!wrap) return;
      ml.textContent = monthLabel();
      const dh = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
      let html = dh.map(d => '<div class="dh">' + d + '</div>').join('');
      const first = new Date(state.viewY, state.viewM, 1);
      const startDow = (first.getDay() + 6) % 7;
      const ndays = new Date(state.viewY, state.viewM + 1, 0).getDate();
      for (let i = 0; i < startDow; i++) html += '<div class="d off"></div>';
      const todayD = today.getDate();
      for (let day = 1; day <= ndays; day++) {
        const d = new Date(state.viewY, state.viewM, day);
        const st = dayStatus(d);
        let cls = 'd';
        if (st === 'past' || st === 'closed') cls += ' off';
        else cls += ' ok';
        if (day === todayD && state.viewM === today.getMonth()) cls += ' sel';
        else if (d.getDay() === 0 && st === 'open') cls += ' dot';
        html += '<div class="' + cls + '">' + day + '</div>';
      }
      wrap.innerHTML = html;
      const bv = document.getElementById('bookVisual');
      bv.addEventListener('click', openBooking);
      bv.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openBooking(e); });
    })();

  })();

(function () {
    var vids = document.querySelectorAll('.final-video');
    if (!vids.length) return;
    var tryPlay = function (v) { var p = v.play(); if (p && p.catch) p.catch(function(){}); };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) tryPlay(e.target);
          else e.target.pause();
        });
      }, { threshold: 0.1 });
      vids.forEach(function (v) { io.observe(v); });
    } else {
      vids.forEach(tryPlay);
    }
  })();
