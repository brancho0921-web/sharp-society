// Navaja 3D y capa de movimiento. Sin WebGL, sin GSAP o con movimiento reducido no corre nada:
// queda la foto de la portada y todo el contenido visible y quieto.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const { gsap, ScrollTrigger, Lenis } = window;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const phone = () => innerWidth <= 640;

if (!reduce && gsap && ScrollTrigger) start();

function start() {
  gsap.registerPlugin(ScrollTrigger);
  const ease = 'expo.out';

  if (Lenis) {
    const lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const target = $(a.getAttribute('href'));
      if (target) { e.preventDefault(); lenis.scrollTo(target, { duration: 1.4 }); }
    }));
  }

  // Parte un texto en palabras con máscara y letras; el lector de pantalla recibe el texto entero
  function split(el) {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    [...el.childNodes].forEach((n) => {
      if (n.nodeType !== 3) return;
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(' '); return; }
        const w = document.createElement('span');
        w.className = 'w'; w.setAttribute('aria-hidden', 'true');
        [...part].forEach((c) => { const ch = document.createElement('span'); ch.className = 'ch'; ch.textContent = c; w.append(ch); });
        frag.append(w);
      });
      n.replaceWith(frag);
    });
    return $$('.ch', el);
  }
  const enter = (targets, trigger, vars = {}) => gsap.from(targets, { y: 30, opacity: 0, duration: 0.9, ease, stagger: 0.06, immediateRender: false, ...vars, scrollTrigger: { trigger, start: 'top bottom', once: true } });
  const rise = (el, vars = {}) => gsap.from(split(el), { yPercent: 110, duration: 0.9, ease, stagger: 0.018, immediateRender: false, ...vars, scrollTrigger: { trigger: el, start: 'top bottom', once: true } });

  // ---------- La navaja ----------
  const st = { open: 0.42, x: phone() ? 0.2 : 2.9, y: phone() ? 0.9 : -1.1, s: 0.9, rx: 0.2, ry: -0.3, rz: 0.12, spin: 0 };
  const razor = buildRazor();

  // ---------- Portada ----------
  const titleChars = split($('.hero-title'));
  const intro = gsap.timeline({ defaults: { ease } })
    .from(titleChars, { yPercent: 110, duration: 0.9, stagger: 0.012 }, 0)
    .from(['.hero-lead', '.hero-actions', '.hero-facts'], { y: 24, duration: 1, stagger: 0.1 }, 0.5);
  if (razor) intro.from(st, { open: 0, s: 0.6, ry: -2.6, rz: -0.4, duration: 2.4, ease: 'expo.out' }, 0);

  // ---------- Cómo trabajamos: se fija la pantalla, la navaja se abre ----------
  const story = $('.story'), steps = $$('.step'), dots = $$('.story-dots span');
  document.documentElement.classList.add('is-pinned');
  const words = steps.map((s) => split($('.step-word', s)));
  steps.forEach((s, i) => { if (i) gsap.set(s, { autoAlpha: 0 }); });
  let current = 0;
  function showStep(i) {
    if (i === current) return;
    const prev = current; current = i;
    gsap.to(steps[prev], { autoAlpha: 0, y: i > prev ? -30 : 30, duration: 0.45, ease: 'power2.in', overwrite: true });
    gsap.fromTo(steps[i], { autoAlpha: 1, y: 0 }, { autoAlpha: 1, y: 0, duration: 0.01, overwrite: true });
    gsap.fromTo(words[i], { yPercent: i > prev ? 110 : -110 }, { yPercent: 0, duration: 0.9, ease, stagger: 0.025, delay: 0.15, overwrite: true });
    gsap.fromTo($('.step-text', steps[i]), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease, delay: 0.3, overwrite: true });
    dots.forEach((d, k) => d.classList.toggle('is-active', k === i));
  }
  const storyTl = gsap.timeline({ scrollTrigger: {
    trigger: story, start: 'top top', end: () => '+=' + innerHeight * 1.8, pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
    onUpdate: (self) => showStep(self.progress < 0.34 ? 0 : self.progress < 0.68 ? 1 : 2),
  } });
  if (razor) {
    // de la portada al escenario: la navaja se acomoda
    gsap.to(st, { x: () => (phone() ? 0 : 2.6), y: () => (phone() ? 1.3 : 0), rz: 0.3, ry: 0.2, s: 0.95, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true } });
    storyTl.to(st, { open: 0.72, ry: -0.35, rz: -0.25, rx: 0.15, s: 0.85, duration: 1, ease: 'power2.inOut' })
      .to(st, { open: 1, ry: 0.35, rz: 0.55, rx: 0.3, s: 0.72, x: () => (phone() ? 0 : 2.9), duration: 1, ease: 'power2.inOut' })
      .to(st, { spin: 1, duration: 0.6, ease: 'power1.inOut' });
  } else {
    storyTl.to({}, { duration: 1 });
  }

  // El total cuenta hasta el número nuevo
  const totalEl = $('#booking-total'), tally = { v: 0 };
  document.addEventListener('cita:total', (e) => gsap.to(tally, { v: e.detail.total, duration: 0.6, ease: 'power3.out', onUpdate: () => (totalEl.textContent = `$${Math.round(tally.v)}`) }));

  // ---------- Detalles que se mueven con el scroll ----------
  // barra de avance arriba
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
  // el sello gira al bajar
  gsap.to('.badge', { rotate: 360, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.5 } });
  // el corte del logo se dibuja al entrar
  gsap.from('.bar .logo-icon', { rotate: -90, scale: 0.6, duration: 1.2, ease });
  // la banda se inclina según la velocidad del scroll
  const skew = gsap.quickTo('.marquee span', 'skewX', { duration: 0.5, ease: 'power3' });
  let calm = 0;
  ScrollTrigger.create({ onUpdate: (self) => {
    skew(gsap.utils.clamp(-14, 14, self.getVelocity() / -200));
    clearTimeout(calm); calm = setTimeout(() => skew(0), 120);
  } });
  // la navaja se apaga al llegar a los cortes
  if (razor) gsap.to('.razor-canvas', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.looks', start: 'top bottom', end: 'top 35%', scrub: true } });

  // Los cortes: en computadora se fija la sección y el carrusel corre de lado
  const looks = $('.looks'), track = $('#looks-track'), bar = $('.looks-progress span');
  rise($('.looks-head h2'));
  enter('.looks-head p', '.looks-head');
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    // si la sección cabe en pantalla se fija centrada; si no, cuando su borde de abajo llega abajo
    gsap.timeline({ scrollTrigger: { trigger: looks, start: () => (looks.offsetHeight > innerHeight ? 'bottom bottom' : 'center center'), end: () => '+=' + dist(), pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true } })
      .to(track, { x: () => -dist(), ease: 'none' }, 0)
      .to(bar, { scaleX: 1, ease: 'none' }, 0);
    $$('.look figure img').forEach((img) => gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: looks, start: () => (looks.offsetHeight > innerHeight ? 'bottom bottom' : 'center center'), end: () => '+=' + dist(), scrub: true } }));
  });
  mm.add('(max-width: 900px)', () => {
    const onScroll = () => gsap.set(bar, { scaleX: track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth) });
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  });
  $$('.look').forEach((card, i) => {
    gsap.from(card, { y: 80, rotate: 2, opacity: 0, duration: 1.1, ease, delay: i * 0.08, immediateRender: false, scrollTrigger: { trigger: track, start: 'top bottom', once: true } });
    gsap.from($('.meter-bar b', card), { scaleX: 0, duration: 1.4, ease: 'expo.inOut', delay: 0.3 + i * 0.1, immediateRender: false, scrollTrigger: { trigger: track, start: 'top 85%', once: true } });
  });

  // La frase se enciende palabra por palabra
  const mText = $('.manifesto-text');
  mText.setAttribute('aria-label', mText.textContent.trim());
  mText.innerHTML = mText.textContent.trim().split(/\s+/).map((w) => `<span class="mw" aria-hidden="true">${w}</span>`).join(' ');
  const mWords = $$('.mw', mText);
  ScrollTrigger.create({ trigger: mText, start: 'top 80%', end: 'bottom 45%', scrub: true,
    onUpdate: (self) => mWords.forEach((w, i) => w.classList.toggle('on', i < Math.round(self.progress * mWords.length))) });

  // ---------- Entradas del resto (después de los pines, para medir bien) ----------
  rise($('.services-head h2'));
  enter('.services-head p', '.services-head');
  enter($$('#service-list li'), '#service-list', { stagger: 0.05, y: 24 });
  enter('.booking', '.booking', { y: 60, duration: 1.1 });
  rise($('.society h2'));
  enter('.society-copy p', '.society-copy');
  gsap.from('.card', { rotateX: 35, rotateY: -25, y: 80, opacity: 0, duration: 1.4, ease, immediateRender: false, scrollTrigger: { trigger: '.card-wrap', start: 'top bottom', once: true } });
  rise($('.faq h2'));
  enter($$('.faq details'), '.faq-list', { stagger: 0.06, y: 20 });
  rise($('.footer-cta'), { stagger: 0.025 });

  // Foto de la membresía: se descubre de abajo hacia arriba
  gsap.from('.society-photo', { clipPath: 'inset(100% 0 0 0 round 18px)', duration: 1.4, ease: 'expo.inOut', immediateRender: false, scrollTrigger: { trigger: '.society-photo', start: 'top 90%', once: true } });
  gsap.fromTo('.society-photo img', { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.society-photo', start: 'top bottom', end: 'bottom top', scrub: true } });

  // El nombre gigante del pie se arma letra por letra
  gsap.from(split($('.footer-logo')), { yPercent: 100, duration: 1, ease, stagger: 0.03, immediateRender: false, scrollTrigger: { trigger: '.footer-logo', start: 'top bottom', once: true } });

  addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());

  // ---------- Construcción de la navaja en WebGL ----------
  function buildRazor() {
    const canvas = $('.razor-canvas');
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch { return null; }
    if (!renderer.getContext()) return null;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, phone() ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 11);
    const rim = new THREE.PointLight(0xff4a2e, 40, 20); rim.position.set(-3, 2, -3); scene.add(rim);
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 5, 6); scene.add(key);
    const fill = new THREE.DirectionalLight(0xbfd4ff, 1.2); fill.position.set(-5, -2, 4); scene.add(fill);

    const steel = new THREE.MeshPhysicalMaterial({ color: 0xf2f4f7, metalness: 0.9, roughness: 0.22, envMapIntensity: 2.2, clearcoat: 0.6 });
    const ebony = new THREE.MeshPhysicalMaterial({ color: 0xe9e3d6, metalness: 0, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.2 });
    const brass = new THREE.MeshPhysicalMaterial({ color: 0xd6a35c, metalness: 1, roughness: 0.25 });
    const bevel = { bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 24 };

    // Hoja: cola curva, talón y filo; gira sobre el pasador en el origen
    const b = new THREE.Shape();
    b.moveTo(-0.62, 0.02);
    b.quadraticCurveTo(-0.86, -0.12, -0.7, -0.26);
    b.lineTo(0.62, -0.14);
    b.quadraticCurveTo(0.74, -0.2, 0.8, -0.74);
    b.lineTo(3.25, -0.76);
    b.quadraticCurveTo(3.46, -0.74, 3.46, -0.5);
    b.lineTo(3.44, 0.1);
    b.lineTo(0.78, 0.13);
    b.lineTo(-0.62, 0.02);
    const bladeGeo = new THREE.ExtrudeGeometry(b, { depth: 0.035, ...bevel });
    bladeGeo.translate(0, 0, -0.0175);
    const blade = new THREE.Mesh(bladeGeo, steel);
    const bladePivot = new THREE.Group();
    bladePivot.add(blade);

    // Cachas: dos piezas curvas de ébano a cada lado de la hoja
    const h = new THREE.Shape();
    h.moveTo(-0.25, 0.16);
    h.quadraticCurveTo(1.8, 0.36, 3.95, 0.3);
    h.quadraticCurveTo(4.2, 0.12, 3.95, -0.1);
    h.quadraticCurveTo(1.8, -0.06, -0.25, -0.24);
    h.quadraticCurveTo(-0.45, -0.04, -0.25, 0.16);
    const scaleGeo = new THREE.ExtrudeGeometry(h, { depth: 0.04, ...bevel });
    const front = new THREE.Mesh(scaleGeo, ebony); front.position.z = 0.04;
    const back = new THREE.Mesh(scaleGeo, ebony); back.position.z = -0.08;
    const pinGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.22, 24); pinGeo.rotateX(Math.PI / 2);
    const pinA = new THREE.Mesh(pinGeo, brass);
    const pinB = new THREE.Mesh(pinGeo, brass); pinB.position.set(3.75, 0.1, 0);

    const handle = new THREE.Group();
    handle.add(front, back, pinA, pinB);
    const razor = new THREE.Group();
    razor.add(handle, bladePivot);
    const holder = new THREE.Group();
    holder.add(razor);
    razor.position.x = -1.75; // el centro visual queda cerca del medio de las cachas
    scene.add(holder);

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    addEventListener('pointermove', (e) => { mouse.tx = (e.clientX / innerWidth - 0.5) * 2; mouse.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });

    function resize() {
      const w = innerWidth, hgt = innerHeight;
      renderer.setSize(w, hgt, false);
      camera.aspect = w / hgt;
      camera.updateProjectionMatrix();
    }
    resize();
    addEventListener('resize', resize);

    // solo se dibuja mientras la portada o el escenario están en pantalla
    const visible = () => canvas.style.opacity !== '0';

    gsap.ticker.add((time) => {
      if (!visible() || document.hidden) return;
      mouse.x += (mouse.tx - mouse.x) * 0.06; mouse.y += (mouse.ty - mouse.y) * 0.06;
      const scaleBase = phone() ? 0.7 : 1.05;
      bladePivot.rotation.z = Math.PI * 0.94 * st.open;
      razor.position.x = -1.75 + 1.45 * st.open;
      holder.position.set(st.x, st.y + Math.sin(time * 0.8) * 0.08, 0);
      holder.scale.setScalar(st.s * scaleBase);
      holder.rotation.set(st.rx + mouse.y * 0.18, st.ry + mouse.x * 0.35 + st.spin * Math.PI * 2, st.rz + Math.sin(time * 0.6) * 0.03);
      renderer.render(scene, camera);
    });
    document.documentElement.classList.add('has-3d');
    return razor;
  }
}
