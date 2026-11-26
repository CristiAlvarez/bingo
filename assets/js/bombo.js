// Utilidades compartidas por la pantalla principal y el espejo:
// bolitas del bombo y sonido (sintetizado con Web Audio, sin archivos de audio)
const DURACION_BOMBO = 2500;

function crearBombo(rot) {
  const colores = ['var(--red)', 'var(--brass)', '#f6efe0', '#2f8f6b', '#3b6fc4'];
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 34 * Math.sqrt(Math.random());
    const s = document.createElement('span');
    s.className = 'b';
    s.style.cssText =
      `left:calc(50% + ${(Math.cos(a) * r).toFixed(1)}cqw - 8cqw);` +
      `top:calc(50% + ${(Math.sin(a) * r).toFixed(1)}cqw - 8cqw);` +
      `--c:${colores[i % colores.length]};` +
      `--dx:${(Math.random() * 20 - 10).toFixed(1)}cqw;--dy:${(Math.random() * 20 - 10).toFixed(1)}cqw;` +
      `--dur:${(0.25 + Math.random() * 0.35).toFixed(2)}s`;
    rot.appendChild(s);
  }
}

let audioCtx = null, ruidoBuf = null;

// Los navegadores solo dejan sonar el audio tras un clic o una tecla del usuario
function activarAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    ruidoBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
    const d = ruidoBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function sonidoBombo(ms) {
  const c = activarAudio();
  if (!c) return;
  const t0 = c.currentTime + 0.03, d = ms / 1000, fin = t0 + d;

  const master = c.createGain();
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(0.9, t0 + 0.2);
  master.gain.setValueAtTime(0.9, fin - 0.5);
  master.gain.exponentialRampToValueAtTime(0.0001, fin + 0.2);
  master.connect(c.destination);

  // Retumbar grave de la jaula, que sube y baja con cada vuelta
  const rum = c.createBufferSource();
  rum.buffer = ruidoBuf;
  rum.loop = true;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 260;
  const rg = c.createGain();
  rg.gain.value = 0.5;
  const lfo = c.createOscillator();
  lfo.frequency.value = 1 / 1.1;
  const lg = c.createGain();
  lg.gain.value = 0.3;
  lfo.connect(lg);
  lg.connect(rg.gain);
  rum.connect(lp);
  lp.connect(rg);
  rg.connect(master);
  rum.start(t0);
  lfo.start(t0);
  rum.stop(fin + 0.3);
  lfo.stop(fin + 0.3);

  // Golpes secos de las bolas chocando entre sí y con la jaula
  const n = Math.round(d * 30);
  for (let i = 0; i < n; i++) {
    const t = t0 + Math.random() * (d - 0.1);
    const v = 0.15 + Math.random() * 0.45;

    const src = c.createBufferSource();
    src.buffer = ruidoBuf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1500 + Math.random() * 2800;
    bp.Q.value = 1.4;
    const g = c.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.04);
    src.connect(bp);
    bp.connect(g);
    g.connect(master);
    src.start(t, Math.random() * 1.5, 0.06);

    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = 700 + Math.random() * 900;
    const og = c.createGain();
    og.gain.setValueAtTime(v * 0.3, t);
    og.gain.exponentialRampToValueAtTime(0.0005, t + 0.07);
    o.connect(og);
    og.connect(master);
    o.start(t);
    o.stop(t + 0.08);
  }
}
