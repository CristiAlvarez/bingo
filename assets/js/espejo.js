const $ = id => document.getElementById(id);
let drawn = [];

function render() {
  const b = $('board');
  b.innerHTML = '';
  for (let n = 1; n <= 90; n++) {
    const d = document.createElement('div');
    d.textContent = n;
    if (drawn.includes(n)) d.className = 'on' + (n === drawn[drawn.length - 1] ? ' now' : '');
    b.appendChild(d);
  }
}

function mostrarBola(n, animar) {
  const b = $('ball');
  b.textContent = n;
  if (animar) {
    b.classList.remove('pop');
    void b.offsetWidth;
    b.classList.add('pop');
  }
}

let sonidoOn = false, tRev = null;

// El bombo ocupa el sitio de la bola mientras gira
function revolver(ms) {
  document.body.classList.add('revolviendo');
  $('bombo').classList.add('girando'); // activa el giro y el rebote de las bolitas
  if (sonidoOn) sonidoBombo(ms);
  clearTimeout(tRev);
  tRev = setTimeout(() => {
    document.body.classList.remove('revolviendo');
    $('bombo').classList.remove('girando');
  }, ms);
}

// El audio necesita un clic previo: este botón lo activa y lo silencia
const btn = $('sonidoBtn');
btn.onclick = () => {
  if (!sonidoOn && activarAudio()) {
    sonidoOn = true;
    btn.textContent = '🔊 Sonido activado';
  } else {
    sonidoOn = false;
    btn.textContent = '🔇 Sonido silenciado';
  }
};

crearBombo($('rot'));

// Confeti del cartel de bingo
(function () {
  const colores = ['#c8372d', '#d8aa4a', '#f6efe0', '#2f8f6b', '#3b6fc4'];
  const c = $('confeti');
  for (let i = 0; i < 60; i++) {
    const s = document.createElement('span');
    s.style.cssText =
      `left:${(Math.random() * 100).toFixed(1)}%;background:${colores[i % colores.length]};` +
      `--t:${(3 + Math.random() * 3).toFixed(2)}s;--d:${(-Math.random() * 6).toFixed(2)}s;` +
      `--r:${Math.round(360 + Math.random() * 720)}deg`;
    c.appendChild(s);
  }
})();

if ('BroadcastChannel' in window) {
  const canal = new BroadcastChannel('bingo90');
  canal.onmessage = e => {
    const m = e.data;
    if (m.tipo === 'bombo') return revolver(m.ms);
    if (m.tipo === 'bingo') return document.body.classList.add('cantando');
    if (m.tipo === 'bingo-fin') return document.body.classList.remove('cantando');
    if (m.tipo !== 'estado') return;
    const hayNueva = m.drawn.length > drawn.length;
    drawn = m.drawn;
    mostrarBola(drawn.length ? drawn[drawn.length - 1] : '–', hayNueva);
    render();
  };
  canal.postMessage({ tipo: 'hola' }); // pide el estado actual a la pantalla principal
}

render();
