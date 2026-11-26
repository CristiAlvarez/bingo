const $ = id => document.getElementById(id);
let pool, drawn;
let girando = false;
let revisando = false; // hay un bingo cantado pendiente de revisar

// Canal para sincronizar todas las pestañas/ventanas abiertas del mismo origen
const canal = 'BroadcastChannel' in window ? new BroadcastChannel('bingo90') : null;
const enviar = tipo => canal && canal.postMessage({ tipo, drawn });

function barajar(lista) {
  return lista.sort(() => Math.random() - 0.5);
}

// Reconstruye el bombo con las bolas que aún no han salido
function aplicarEstado(lista) {
  drawn = lista;
  pool = barajar(Array.from({ length: 90 }, (_, i) => i + 1).filter(n => !drawn.includes(n)));
  const ultima = drawn[drawn.length - 1];
  mostrarBola(ultima ?? '–', false);
  $('draw').disabled = !pool.length || girando || revisando;
  render();
}

function start() {
  if (revisando) setRevision(false);
  aplicarEstado([]);
  enviar('estado');
}

function render() {
  const b = $('board');
  b.innerHTML = '';
  for (let n = 1; n <= 90; n++) {
    const d = document.createElement('div');
    d.textContent = n;
    if (drawn.includes(n)) d.className = 'on' + (n === drawn[drawn.length - 1] ? ' now' : '');
    b.appendChild(d);
  }
  $('count').textContent = drawn.length
    ? (pool.length ? `Bolas sacadas: ${drawn.length} de 90 · quedan ${pool.length}` : 'Ya han salido las 90 bolas.')
    : 'Pulsa «Sacar bola» para empezar.';
  $('last').innerHTML = drawn.slice(-8, -1).reverse().map(n => `<span>${n}</span>`).join('');
}

function say(t) {
  if ($('voice').checked && 'speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'es-ES';
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }
}

function mostrarBola(n, animar = true) {
  const b = $('ball');
  b.textContent = n;
  if (animar) {
    b.classList.remove('pop');
    void b.offsetWidth;
    b.classList.add('pop');
    say(String(n));
  }
}

function draw() {
  if (!pool.length || girando || revisando) return;
  const n = pool.pop();
  drawn.push(n);
  mostrarBola(n);
  $('draw').disabled = !pool.length;
  render();
  enviar('estado');
}

if (canal) {
  canal.onmessage = e => {
    const m = e.data;
    if (m.tipo === 'hola') {
      enviar('estado'); // una pestaña nueva pide el estado actual
      if (revisando) canal.postMessage({ tipo: 'bingo' });
    } else if (m.tipo === 'estado') {
      const hayNueva = m.drawn.length > drawn.length;
      aplicarEstado(m.drawn);
      if (hayNueva) mostrarBola(m.drawn[m.drawn.length - 1]);
    }
  };
}

function revolver() {
  if (girando || revisando) return;
  girando = true;
  pool = barajar(pool); // el bombo se mezcla de verdad
  $('bombo').classList.add('girando');
  $('draw').disabled = true;
  $('mix').disabled = true;
  $('count').textContent = 'Revolviendo el bombo…';
  if ($('sonido').checked) sonidoBombo(DURACION_BOMBO);
  if (canal) canal.postMessage({ tipo: 'bombo', ms: DURACION_BOMBO });
  setTimeout(() => {
    girando = false;
    $('bombo').classList.remove('girando');
    $('mix').disabled = false;
    $('draw').disabled = !pool.length;
    render();
  }, DURACION_BOMBO);
}

// Bingo cantado: se bloquea el sorteo hasta revisar el cartón
function setRevision(v) {
  revisando = v;
  const btn = $('bingo');
  btn.textContent = v ? 'Continuar partida' : '¡BINGO!';
  btn.classList.toggle('alt', v);
  $('draw').disabled = v || !pool.length || girando;
  $('mix').disabled = v || girando;
  if (v) {
    $('count').textContent = 'Bingo cantado: revisando el cartón…';
    say('¡Bingo!');
  } else {
    render();
  }
  if (canal) canal.postMessage({ tipo: v ? 'bingo' : 'bingo-fin' });
}

$('bingo').onclick = () => { if (!girando) setRevision(!revisando); };
$('mix').onclick = revolver;
crearBombo($('rot'));
$('draw').onclick = draw;
$('reset').onclick = start;
aplicarEstado([]);
if (canal) canal.postMessage({ tipo: 'hola' });
