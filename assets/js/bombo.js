// Utilidades compartidas por la pantalla principal y el espejo:
// bolitas del bombo y sonido (sintetizado con Web Audio, sin archivos de audio)
const DURACION_BOMBO = 2500;

function crearBombo(rot) {
    const colores = ["var(--red)", "var(--brass)", "#f6efe0", "#2f8f6b", "#3b6fc4"];
    for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 34 * Math.sqrt(Math.random());
        const s = document.createElement("span");
        s.className = "b";
        s.style.cssText = `left:calc(50% + ${(Math.cos(a) * r).toFixed(1)}cqw - 8cqw);` + `top:calc(50% + ${(Math.sin(a) * r).toFixed(1)}cqw - 8cqw);` + `--c:${colores[i % colores.length]};` + `--dx:${(Math.random() * 20 - 10).toFixed(1)}cqw;--dy:${(Math.random() * 20 - 10).toFixed(1)}cqw;` + `--dur:${(0.25 + Math.random() * 0.35).toFixed(2)}s`;
        rot.appendChild(s);
    }
}

let audioCtx = null,
    ruidoBuf = null;

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
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
}

function sonidoBombo(ms) {
    const c = activarAudio();
    if (!c) return;
    const t0 = c.currentTime + 0.03,
        d = ms / 1000,
        fin = t0 + d,
        vuelta = 1.1;

    // Salida con fundido
    const master = c.createGain();
    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(0.9, t0 + 0.25);
    master.gain.setValueAtTime(0.9, fin - 0.4);
    master.gain.exponentialRampToValueAtTime(0.0001, fin + 0.35);
    master.connect(c.destination);

    // Eco de sala corto: da cuerpo hueco al bombo
    const eco = c.createConvolver();
    const ir = c.createBuffer(1, Math.floor(c.sampleRate * 0.5), c.sampleRate);
    const x = ir.getChannelData(0);
    for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 3);
    eco.buffer = ir;
    const ecoG = c.createGain();
    ecoG.gain.value = 0.22;
    eco.connect(ecoG);
    ecoG.connect(master);

    // Cada golpe sale por un punto distinto del estéreo, con parte seca y parte de eco
    const salida = (pan) => {
        const p = c.createStereoPanner();
        p.pan.value = pan;
        p.connect(master);
        p.connect(eco);
        return p;
    };

    // Bolas rodando por la jaula: ruido de rodadura que sube y baja con cada vuelta
    const rod = c.createBufferSource();
    rod.buffer = ruidoBuf;
    rod.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 650;
    bp.Q.value = 0.7;
    const rg = c.createGain();
    rg.gain.value = 0.1;
    const lfo = c.createOscillator();
    lfo.frequency.value = 1 / vuelta;
    const lg = c.createGain();
    lg.gain.value = 0.08;
    lfo.connect(lg);
    lg.connect(rg.gain);
    rod.connect(bp);
    bp.connect(rg);
    rg.connect(master);
    rg.connect(eco);

    // Giro grave de la jaula
    const gra = c.createBufferSource();
    gra.buffer = ruidoBuf;
    gra.loop = true;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 180;
    const gg = c.createGain();
    gg.gain.value = 0.25;
    gra.connect(lp);
    lp.connect(gg);
    gg.connect(master);

    [rod, gra, lfo].forEach((n) => {
        n.start(t0);
        n.stop(fin + 0.4);
    });

    // Golpe de una bola de plástico: cuerpo hueco que cae de tono + chasquido seco
    function golpe(t, v, pan) {
        const out = salida(pan);
        const o = c.createOscillator();
        o.type = "sine";
        const f = 380 + Math.random() * 520;
        o.frequency.setValueAtTime(f * 1.5, t);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.02);
        const og = c.createGain();
        og.gain.setValueAtTime(v * 0.5, t);
        og.gain.exponentialRampToValueAtTime(0.0005, t + 0.05 + Math.random() * 0.04);
        o.connect(og);
        og.connect(out);
        o.start(t);
        o.stop(t + 0.12);

        const n = c.createBufferSource();
        n.buffer = ruidoBuf;
        const hp = c.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 1800 + Math.random() * 1500;
        const ng = c.createGain();
        ng.gain.setValueAtTime(v * 0.35, t);
        ng.gain.exponentialRampToValueAtTime(0.0005, t + 0.012);
        n.connect(hp);
        hp.connect(ng);
        ng.connect(out);
        n.start(t, Math.random() * 1.5, 0.03);
    }

    // Vibración metálica de la jaula tras algunos golpes
    function tintineo(t, v, pan) {
        const out = salida(pan);
        const o = c.createOscillator();
        o.type = "sine";
        o.frequency.value = 2400 + Math.random() * 2600;
        const g = c.createGain();
        g.gain.setValueAtTime(v * 0.06, t);
        g.gain.exponentialRampToValueAtTime(0.0003, t + 0.12);
        o.connect(g);
        g.connect(out);
        o.start(t);
        o.stop(t + 0.15);
    }

    const pan = () => Math.random() * 1.2 - 0.6;

    // Golpes sueltos, de fuerza e intervalo irregulares
    for (let t = t0 + 0.05; t < fin - 0.05; t += 0.03 + Math.random() * 0.09) {
        const p = pan(),
            v = 0.1 + Math.random() * 0.3;
        golpe(t, v, p);
        if (Math.random() < 0.25) tintineo(t, v, p);
    }

    // Una vez por vuelta las bolas caen juntas al fondo: racha de golpes más fuertes
    for (let t = t0 + vuelta * 0.55; t < fin - 0.1; t += vuelta) {
        const k = 6 + Math.floor(Math.random() * 5);
        for (let j = 0; j < k; j++) {
            const p = pan(),
                v = 0.35 + Math.random() * 0.35;
            const tj = t + j * 0.03 + Math.random() * 0.03;
            golpe(tj, v, p);
            if (Math.random() < 0.3) tintineo(tj, v, p);
        }
    }
}
