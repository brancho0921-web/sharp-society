const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

// Menú del teléfono
const menuBtn = $('#menu-btn'), nav = $('#nav');
const closeMenu = () => { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.textContent = 'Menú'; };
menuBtn.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.textContent = open ? 'Cerrar' : 'Menú';
});
$$('a', nav).forEach((a) => a.addEventListener('click', closeMenu));

// Tu cita: servicios marcados, día, hora y el mensaje de WhatsApp
const picked = new Map();
const fmt = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}` : `${m} min`);
function update() {
  const items = [...picked.values()];
  const total = items.reduce((s, i) => s + i.price, 0);
  const min = items.reduce((s, i) => s + i.min, 0);
  $('#booking-list').innerHTML = items.map((i) => `<li><span>${i.name}</span><span>$${i.price}</span></li>`).join('');
  $('#booking-empty').hidden = items.length > 0;
  $('#booking-time').textContent = fmt(min);
  document.dispatchEvent(new CustomEvent('cita:total', { detail: { total } }));
  if (reduce || !window.gsap) $('#booking-total').textContent = `$${total}`;
  $('#dock-total').textContent = items.length ? `$${total} · ${fmt(min)}` : 'Arma tu cita';
  $('#dock-time').textContent = items.length ? items.map((i) => i.name).join(', ') : 'Corte, barba o combo';
  const dia = $('input[name=dia]:checked').value, hora = $('#hora').value, nombre = $('#nombre').value.trim();
  let msg = `Hola Sharp Society${nombre ? ', soy ' + nombre : ''}. Quiero pedir un turno el ${dia}${hora ? ' a las ' + hora : ''}`;
  msg += items.length ? ` para: ${items.map((i) => i.name).join(', ')} (total $${total}, ${fmt(min)}).` : '.';
  $('#send').href = 'https://wa.me/?text=' + encodeURIComponent(msg);
}
$$('.svc').forEach((b) => b.addEventListener('click', () => {
  const on = b.getAttribute('aria-pressed') !== 'true';
  b.setAttribute('aria-pressed', String(on));
  on ? picked.set(b.dataset.name, { name: b.dataset.name, price: +b.dataset.price, min: +b.dataset.min }) : picked.delete(b.dataset.name);
  update();
}));
$$('input[name=dia], #hora').forEach((el) => el.addEventListener('change', update));
$('#nombre').addEventListener('input', update);
update();

// La barra del teléfono se esconde en la portada, en servicios y en el pie
const dock = $('#dock'), hideFor = new Set();
const dockIO = new IntersectionObserver((es) => {
  es.forEach((e) => (e.isIntersecting ? hideFor.add(e.target) : hideFor.delete(e.target)));
  dock.classList.toggle('away', hideFor.size > 0);
});
['#inicio', '#servicios', '.footer'].forEach((s) => dockIO.observe($(s)));

if (!reduce && finePointer) {
  // La tarjeta de metal se inclina con el cursor y el brillo lo sigue
  const card = $('[data-tilt]');
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    card.style.transform = `rotateX(${(0.5 - y) * 10}deg) rotateY(${(x - 0.5) * 14}deg)`;
    card.style.setProperty('--sx', `${x * 100}%`);
    card.style.setProperty('--sy', `${y * 100}%`);
  });
  card.addEventListener('pointerleave', () => { card.style.transition = 'transform .6s cubic-bezier(.23,1,.32,1)'; card.style.transform = ''; setTimeout(() => (card.style.transition = ''), 600); });

  // Foto que sigue al cursor sobre la lista de servicios
  const hover = $('.hover-img'), hoverImg = $('img', hover);
  let hx = 0, hy = 0, tx = 0, ty = 0, shown = false, raf = 0;
  const loop = () => {
    hx += (tx - hx) * 0.18; hy += (ty - hy) * 0.18;
    hover.style.transform = `translate(${hx - 130}px, ${hy - 98}px) scale(${shown ? 1 : 0.85}) rotate(${(tx - hx) * 0.04}deg)`;
    raf = Math.abs(tx - hx) + Math.abs(ty - hy) > 0.5 || shown ? requestAnimationFrame(loop) : 0;
  };
  $$('.svc').forEach((b) => {
    b.addEventListener('pointerenter', () => { hoverImg.src = b.dataset.img; shown = true; hover.style.opacity = '1'; if (!raf) raf = requestAnimationFrame(loop); });
    b.addEventListener('pointerleave', () => { shown = false; hover.style.opacity = '0'; });
  });
  $('#service-list').addEventListener('pointermove', (e) => { tx = e.clientX + 40; ty = e.clientY; if (!raf) raf = requestAnimationFrame(loop); });
  hover.style.transition = 'opacity .25s ease';

  // Botones magnéticos
  $$('.magnetic').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.28}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}
