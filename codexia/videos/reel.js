/* CODEXIA · Ghost Network (edición de Enlace VR) · reels de cada juego (videos verticales cortos, 9:16)
 *
 * reel.html?juego=router|arma|carrera|robot (edición CODEXIA) abre el juego real en un iframe, lo juega solo con un
 * guion (mueve la cámara, elige respuestas) y compone cada cuadro en un lienzo de 720 × 1280: título
 * arriba, la escena del juego en medio, y abajo el paso que se está explicando. En el paso del equipo
 * aparece una tarjeta "Manual del equipo". El lienzo y la música se graban con MediaRecorder (MP4 si el
 * navegador lo permite). grabar_reels.mjs abre esta página en Chrome sin ventana y guarda el video.
 * Con &vista=1 solo se reproduce, sin grabar (para revisar).
 */
/* global dibujarCodexia, COLOR, MONO, LETRA, rectRedondo, dibujarLogo, musica, sonido */

const W = 720;
const H = 1280;
const ESCENA = { y: 220, h: 800 };
const DURACION = 16.5;
const params = new URLSearchParams(location.search);
const JUEGO = params.get('juego') || 'router';
const VISTA = params.get('vista') === '1';

const lienzo = document.getElementById('reel');
const ctx = lienzo.getContext('2d');
const marco = document.getElementById('juego');
const estadoEl = document.getElementById('estado');

const rad = (g) => (g * Math.PI) / 180;
const grados = (r) => (r * 180) / Math.PI;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const suave = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** Ángulos (grados) para mirar un punto desde los ojos del jugador (0, 1.2, 0). */
function mirarA(p) {
  const yaw = -grados(Math.atan2(p.x, -p.z));
  const pitch = grados(Math.atan2(p.y - 1.2, Math.hypot(p.x, p.z)));
  return [yaw, pitch];
}

// ---------- guiones ----------

const COLS = 'ABCDE';
const casilla = (c, f) => `${COLS[c]}${f + 1}`;
const NUMEROS = ['', 'Una', 'Dos', 'Tres', 'Cuatro'];
const decir = ([flecha, k]) => `${NUMEROS[k]} ${flecha === 'izquierda' || flecha === 'derecha' ? `a la ${flecha}` : `hacia ${flecha}`}`;

/** Robot programado: instrucciones más cortas (flecha, casillas) desde el inicio hasta la meta. */
function resolverMapa(w, mapa, inicio) {
  const k = (x) => `${x.c},${x.f}`;
  const previo = new Map([[k(inicio), null]]);
  const cola = [inicio];
  while (cola.length) {
    const cel = cola.shift();
    if (cel.c === mapa.meta.c && cel.f === mapa.meta.f) {
      const pasos = [];
      let x = cel;
      while (previo.get(k(x))) {
        const [antes, instr] = previo.get(k(x));
        pasos.unshift(instr);
        x = antes;
      }
      return pasos;
    }
    ['arriba', 'abajo', 'izquierda', 'derecha'].forEach((flecha) => {
      for (let n = 1; n <= 4; n++) {
        const r = w.seguirInstruccion(mapa, cel, flecha, n);
        if (r.resultado === 'hoyo' || r.resultado === 'fuera') break;
        const destino = r.camino[r.camino.length - 1];
        if (!previo.has(k(destino))) {
          previo.set(k(destino), [cel, [flecha, n]]);
          cola.push(destino);
        }
        if (r.resultado === 'meta') break;
      }
    });
  }
  return null;
}

/** Tablero chico de papel con hoyos, meta, inicio y el camino (para la tarjeta del manual). */
function dibujarMapaPapel(c, x, y, lado, mapa, inicio, pasos) {
  const cel = lado / 5;
  c.fillStyle = '#F7F9FC';
  c.fillRect(x, y, lado, lado);
  c.strokeStyle = '#9fb0c8';
  c.lineWidth = 1.5;
  for (let i = 1; i < 5; i++) {
    c.beginPath(); c.moveTo(x + i * cel, y); c.lineTo(x + i * cel, y + lado); c.stroke();
    c.beginPath(); c.moveTo(x, y + i * cel); c.lineTo(x + lado, y + i * cel); c.stroke();
  }
  c.strokeStyle = '#160a0d';
  c.lineWidth = 3;
  c.strokeRect(x, y, lado, lado);
  const centro = (cc, ff) => [x + cel * (cc + 0.5), y + cel * (ff + 0.5)];
  mapa.hoyos.forEach((kk) => {
    const [cc, ff] = kk.split(',').map(Number);
    const [px, py] = centro(cc, ff);
    c.beginPath();
    for (let k = 0; k < 6; k++) c.lineTo(px + Math.cos(k * Math.PI / 3 + Math.PI / 6) * cel * 0.36, py + Math.sin(k * Math.PI / 3 + Math.PI / 6) * cel * 0.36);
    c.closePath(); c.fillStyle = '#2A2D33'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#C8102E'; c.stroke();
    c.beginPath(); c.arc(px, py - cel * 0.12, cel * 0.08, 0, Math.PI * 2); c.fillStyle = '#FF1638'; c.fill();
  });
  const [mx, my] = centro(mapa.meta.c, mapa.meta.f);
  rectRedondo(c, mx - cel * 0.4, my - cel * 0.4, cel * 0.8, cel * 0.8, 6); c.fillStyle = '#1F7AD6'; c.fill();
  escribir(c, '≈', mx, my + 2, { tam: cel * 0.5, peso: 700, color: '#DFF1FF', alinear: 'center' });
  // el camino que dicta el equipo
  c.strokeStyle = '#c8102e';
  c.lineWidth = 4;
  c.setLineDash([8, 6]);
  c.beginPath();
  let pos = { ...inicio };
  c.moveTo(...centro(pos.c, pos.f));
  const mov = { arriba: [0, -1], abajo: [0, 1], izquierda: [-1, 0], derecha: [1, 0] };
  pasos.forEach(([flecha, n]) => {
    pos = { c: pos.c + mov[flecha][0] * n, f: pos.f + mov[flecha][1] * n };
    c.lineTo(...centro(pos.c, pos.f));
  });
  c.stroke();
  c.setLineDash([]);
  const [ix, iy] = centro(inicio.c, inicio.f);
  c.beginPath(); c.arc(ix, iy, cel * 0.3, 0, Math.PI * 2); c.fillStyle = '#c8102e'; c.fill();
  escribir(c, 'R', ix, iy + 1, { tam: cel * 0.34, peso: 700, color: '#ffffff', alinear: 'center' });
}

const GUIONES = {
  router: {
    titulo: 'Router humano',
    area: 'REDES · 3 MINUTOS',
    archivo: '../router.html',
    componente: 'router-humano',
    final: ['3 paquetes = los 2 primeros números de la IP', 'Ultrón inunda la red: rondas de 3 minutos'],
    preparar(j, w) {
      j.empezar('ronda');
      j.finRonda = w.performance.now() + 168000;
      for (let i = 0; i < 80 && j.paquete.destino !== 'SALÓN'; i++) j.nuevoPaquete();
      const d = { red: j.paquete.ip.split('.').slice(0, 3).join('.'), puerta: 'SALÓN' };
      [d.yaw, d.pitch] = mirarA(j.puertas['SALÓN'].el.object3D.position);
      return d;
    },
    pasos: (d) => [
      { t: 2.2, quien: 'OPERADOR', texto: `Ultrón inunda la red. El Operador dicta la red del paquete: ${d.red}` },
      { t: 6.0, quien: 'EQUIPO', texto: `Busca la red en su tabla de rutas: va al ${d.puerta}` },
      { t: 9.8, quien: 'OPERADOR', texto: 'Voltea y le dispara el paquete a esa puerta' },
    ],
    eventos: (d, j) => [
      { t: 0, cam: [0, -10] },
      { t: 9.9, cam: [d.yaw, d.pitch], seg: 1.3 },
      { t: 11.7, hacer: () => { j.elegir('SALÓN'); sonido.bien(); }, exito: '+1' },
    ],
    manual(c, x, y, w, h, d) {
      encabezadoManual(c, x, y, w, 'TABLA DE RUTAS');
      const filas = [['192.168.1', 'SALÓN'], ['192.168.2', 'BIBLIOTECA'], ['otra red', 'INTERNET']];
      filas.forEach(([red, puerta], i) => {
        const fy = y + 110 + i * 64;
        const mia = red === d.red;
        if (mia) { rectRedondo(c, x + 20, fy - 30, w - 40, 58, 10); c.fillStyle = '#DCEBFF'; c.fill(); }
        escribir(c, red, x + 40, fy, { tam: 30, peso: 600, color: '#160a0d', fuente: MONO });
        escribir(c, `→  ${puerta}`, x + w - 40, fy, { tam: 30, peso: 700, color: mia ? '#c8102e' : '#160a0d', alinear: 'right' });
      });
    },
  },

  arma: {
    titulo: 'Arma la computadora',
    area: 'HARDWARE · 5 MINUTOS',
    archivo: '../arma.html',
    componente: 'arma-computadora',
    final: ['4 piezas = el 3.er número de la IP', 'Arman la computadora que rastrea a Ultrón'],
    preparar(j) {
      j.empezar('ronda');
      const n = [...j.placa.abiertas].sort((a, b) => a - b)[0];
      const id = j.placa.orden[n];
      const d = { n, id, nombre: j.nombreDe(id), modelo: j.placa.modelo, img: j.imagenes[id] };
      [d.yaw, d.pitch] = mirarA(j.piezas[id].casa);
      return d;
    },
    pasos: (d) => [
      { t: 2.2, quien: 'OPERADOR', texto: `Arma el rastreador de Ultrón: ve la placa ${d.modelo} y las piezas sin nombre` },
      { t: 6.0, quien: 'EQUIPO', texto: `La reconoce en su catálogo: ${d.nombre}. En el plano va en el ${d.n + 1}` },
      { t: 9.8, quien: 'OPERADOR', texto: `Apunta al número ${d.n + 1} y la pieza vuela a su lugar` },
    ],
    eventos: (d, j) => [
      { t: 0, cam: [0, 12] },
      { t: 3.6, cam: [d.yaw, d.pitch], seg: 1.3 },
      { t: 5.2, hacer: () => { j.tomar(d.id); } },
      { t: 9.9, cam: [0, 12], seg: 1.2 },
      { t: 11.5, hacer: () => { j.poner(d.n); } },
      { t: 12.0, hacer: () => sonido.bien(), exito: '+1' },
    ],
    manual(c, x, y, w, h, d) {
      encabezadoManual(c, x, y, w, `CATÁLOGO Y PLANO · MODELO ${d.modelo}`);
      const lado = 150;
      rectRedondo(c, x + 30, y + 80, lado, lado, 14);
      c.fillStyle = '#E9EEF5';
      c.fill();
      if (d.img) c.drawImage(d.img, x + 42, y + 92, lado - 24, lado - 24);
      escribir(c, d.nombre, x + 210, y + 120, { tam: 30, peso: 700, color: '#160a0d' });
      escribir(c, 'En el plano armado:', x + 210, y + 170, { tam: 24, color: '#3B4A60' });
      escribir(c, `lugar ${d.n + 1}`, x + 210, y + 210, { tam: 36, peso: 700, color: '#c8102e' });
    },
  },

  carrera: {
    titulo: 'Carrera de palabras',
    area: 'BINARIO Y ASCII · 3 MINUTOS',
    archivo: '../carrera.html',
    componente: 'carrera-palabras',
    final: ['3 palabras = el 4.º número de la IP', 'Cada palabra trae un consejo para cuidar el agua'],
    preparar(j, w) {
      j.empezar('ronda');
      j.finRonda = w.performance.now() + 168000;
      return { palabra: j.palabra.toUpperCase() };
    },
    pasos: (d) => [
      { t: 2.2, quien: 'OPERADOR', texto: 'Ve un mensaje de Ultrón en binario y dicta los ceros y unos' },
      { t: 5.2, quien: 'EQUIPO', texto: `Traduce cada byte con su tabla ASCII: la palabra es ${d.palabra}` },
      { t: 8.6, quien: 'OPERADOR', texto: 'La escribe y la envía: ¡siguen la señal de Ultrón y aprenden a cuidar el agua!' },
    ],
    eventos: (d, j) => {
      const ev = [{ t: 0, cam: [0, -6] }];
      d.palabra.split('').forEach((l, i) => ev.push({ t: 8.8 + i * 0.4, hacer: () => j.presionar('letra', l) }));
      ev.push({ t: 9.0 + d.palabra.length * 0.4, hacer: () => { j.presionar('enviar'); sonido.bien(); }, exito: '+1' });
      ev.push({ t: 10.4 + d.palabra.length * 0.4, cam: [32, 4], seg: 2.0 });
      return ev;
    },
    manual(c, x, y, w, h, d) {
      encabezadoManual(c, x, y, w, 'TABLA ASCII');
      d.palabra.split('').forEach((l, i) => {
        const fy = y + 105 + i * 50;
        escribir(c, l.charCodeAt(0).toString(2).padStart(8, '0'), x + 40, fy, { tam: 30, peso: 600, color: '#160a0d', fuente: MONO });
        escribir(c, `→  ${l}`, x + w - 40, fy, { tam: 32, peso: 700, color: '#c8102e', alinear: 'right' });
      });
    },
  },

  robot: {
    titulo: 'Misión final: Ultrón al agua',
    area: 'ALGORITMOS · 5 MINUTOS',
    archivo: '../robot.html',
    componente: 'robot-programado',
    final: ['Cada vez que cae al agua: una parte del GPS', 'Si pisa una antena suya, escapa'],
    preparar(j, w) {
      j.empezar('ronda');
      j.finRonda = w.performance.now() + 290000;
      // un inicio con 2 o 3 instrucciones, para que quepa en el video
      let pasos = resolverMapa(w, j.mapa, j.inicio);
      for (let i = 0; i < j.mapa.inicios.length && (pasos.length < 2 || pasos.length > 3); i++) {
        j.inicio = j.mapa.inicios[i];
        pasos = resolverMapa(w, j.mapa, j.inicio);
      }
      j.posicionRobot = { ...j.inicio };
      j.marcaInicio.position.copy(j.posicion(j.inicio.c, j.inicio.f)).setY(0.012);
      j.celdas.forEach((x) => x.mat.color.setHex(x.base));
      j.colocarRobot(j.inicio, 2);
      j.pintarPisada(j.inicio);
      j.dibujarPantalla();
      return { mapa: j.mapa, inicio: { ...j.inicio }, nombreInicio: casilla(j.inicio.c, j.inicio.f), pasos };
    },
    pasos: (d) => [
      { t: 2.2, quien: 'OPERADOR', texto: `Ve a Ultrón, pero no sus antenas. Dicta: "Sector ${d.mapa.id}, está en ${d.nombreInicio}"` },
      { t: 5.6, quien: 'EQUIPO', texto: `Tiene el mapa con antenas y la presa, y lo guía: "${decir(d.pasos[0])}"` },
      { t: 9.4, quien: 'OPERADOR', texto: 'Paso a paso, "¡listo!"… ¡y Ultrón cae al agua! Pista: su GPS' },
    ],
    eventos: (d, j) => {
      const ev = [{ t: 0, cam: [0, -12] }];
      const mover = ([flecha, n]) => () => { j.elegirFlecha(flecha); j.elegirCuantas(n); j.mover(); };
      let t = 7.6;
      d.pasos.forEach((instr, i) => {
        ev.push({ t, hacer: mover(instr) });
        const fin = t + instr[1] * 0.43 + 0.2;
        if (i === d.pasos.length - 1) ev.push({ t: fin, hacer: () => {}, exito: '+1' });
        t = i === 0 ? Math.max(10.0, fin + 0.6) : fin + 0.9;
      });
      return ev;
    },
    manual(c, x, y, w, h, d) {
      encabezadoManual(c, x, y, w, `SECTOR ${d.mapa.id} · ULTRÓN EN ${d.nombreInicio}`);
      dibujarMapaPapel(c, x + 30, y + 78, 200, d.mapa, d.inicio, d.pasos);
      d.pasos.forEach((p, i) => escribir(c, `${i + 1}. "${decir(p)}"`, x + 260, y + 110 + i * 46, { tam: 28, peso: 600, color: '#160a0d', max: w - 290 }));
      escribir(c, 'Antena: escapa · Presa: ¡al agua!', x + 260, y + h - 34, { tam: 22, color: '#5E6B80' });
    },
  },

};

// ---------- dibujo ----------

function escribir(c, str, x, y, { tam = 30, peso = 600, color = COLOR.texto, alinear = 'left', fuente = LETRA, max = 0 } = {}) {
  c.font = `${peso} ${tam}px ${fuente}`;
  if (max && c.measureText(str).width > max) {
    tam *= max / c.measureText(str).width;
    c.font = `${peso} ${tam}px ${fuente}`;
  }
  c.fillStyle = color;
  c.textAlign = alinear;
  c.textBaseline = 'middle';
  c.fillText(str, x, y);
}

/** Parte un texto en renglones que quepan en "ancho". */
function renglones(c, str, ancho, tam, peso) {
  c.font = `${peso} ${tam}px ${LETRA}`;
  const palabras = str.split(' ');
  const lineas = [];
  let actual = '';
  palabras.forEach((p) => {
    const prueba = actual ? `${actual} ${p}` : p;
    if (c.measureText(prueba).width > ancho && actual) { lineas.push(actual); actual = p; } else actual = prueba;
  });
  if (actual) lineas.push(actual);
  return lineas;
}

function encabezadoManual(c, x, y, w, titulo) {
  escribir(c, 'MANUAL DEL EQUIPO', x + 30, y + 34, { tam: 18, peso: 600, color: '#c8102e', fuente: MONO });
  escribir(c, titulo, x + w - 30, y + 34, { tam: 18, peso: 600, color: '#5E6B80', alinear: 'right', fuente: MONO, max: w * 0.55 });
  c.fillStyle = '#C5CEDB';
  c.fillRect(x + 30, y + 58, w - 60, 2);
}

let guion = null;
let datos = null;
let pasos = [];
let eventos = [];
let t0 = 0;
let win = null;
let juego = null;
let camara = null;
let exito = null;

function tiempo() { return t0 ? (performance.now() - t0) / 1000 : 0; }

function componer() {
  window.reelCuadros = (window.reelCuadros || 0) + 1;
  const t = tiempo();
  ctx.fillStyle = '#050405';
  ctx.fillRect(0, 0, W, H);

  // escena del juego
  const fuente = win && win.document.querySelector('a-scene canvas');
  if (fuente) ctx.drawImage(fuente, 0, 0, fuente.width, fuente.height, 0, ESCENA.y, W, ESCENA.h);
  const sombraArriba = ctx.createLinearGradient(0, ESCENA.y, 0, ESCENA.y + 90);
  sombraArriba.addColorStop(0, 'rgba(6,8,13,1)');
  sombraArriba.addColorStop(1, 'rgba(6,8,13,0)');
  ctx.fillStyle = sombraArriba;
  ctx.fillRect(0, ESCENA.y, W, 90);
  const sombraAbajo = ctx.createLinearGradient(0, ESCENA.y + ESCENA.h - 90, 0, ESCENA.y + ESCENA.h);
  sombraAbajo.addColorStop(0, 'rgba(6,8,13,0)');
  sombraAbajo.addColorStop(1, 'rgba(6,8,13,1)');
  ctx.fillStyle = sombraAbajo;
  ctx.fillRect(0, ESCENA.y + ESCENA.h - 90, W, 90);

  // encabezado
  dibujarLogo(ctx, 64, 70, 40);
  dibujarCodexia(ctx, 100, 72, 30);
  escribir(ctx, guion.area, W - 40, 70, { tam: 18, peso: 600, color: COLOR.acento, alinear: 'right', fuente: MONO });
  escribir(ctx, guion.titulo, 40, 150, { tam: 52, peso: 700, max: W - 80, fuente: TITULO });

  // barra de avance
  ctx.fillStyle = 'rgba(242,244,248,.12)';
  ctx.fillRect(0, 0, W, 6);
  ctx.fillStyle = COLOR.acento;
  ctx.fillRect(0, 0, W * Math.min(1, t / DURACION), 6);

  // paso actual (abajo)
  const paso = [...pasos].reverse().find((p) => t >= p.t);
  if (paso && t < DURACION - 2.9) {
    const n = pasos.indexOf(paso) + 1;
    const entra = suave((t - paso.t) / 0.35);
    ctx.globalAlpha = entra;
    const y0 = 1050 + (1 - entra) * 30;
    const esEquipo = paso.quien === 'EQUIPO';
    ctx.fillStyle = esEquipo ? COLOR.texto : COLOR.acento;
    ctx.beginPath();
    ctx.arc(76, y0 + 30, 30, 0, Math.PI * 2);
    ctx.fill();
    escribir(ctx, String(n), 76, y0 + 32, { tam: 32, peso: 700, color: '#050405', alinear: 'center' });
    escribir(ctx, paso.quien, 126, y0 + 30, { tam: 22, peso: 600, color: esEquipo ? COLOR.texto : COLOR.acento, fuente: MONO });
    renglones(ctx, paso.texto, W - 90, 36, 600).slice(0, 3).forEach((l, i) => escribir(ctx, l, 46, y0 + 92 + i * 46, { tam: 36, peso: 600 }));
    // puntos de avance
    pasos.forEach((_, i) => {
      ctx.fillStyle = i < n ? COLOR.acento : 'rgba(242,244,248,.2)';
      ctx.fillRect(W - 40 - (pasos.length - i) * 34, y0 + 26, 26, 8);
    });
    ctx.globalAlpha = 1;
  }

  // tarjeta del manual (mientras habla el equipo)
  const pasoEquipo = pasos.find((p) => p.quien === 'EQUIPO');
  if (pasoEquipo) {
    const sigue = pasos[pasos.indexOf(pasoEquipo) + 1];
    const dentro = suave((t - pasoEquipo.t - 0.2) / 0.45) * (1 - suave((t - (sigue ? sigue.t : 99) + 0.3) / 0.4));
    if (dentro > 0.01) {
      const cw = 620;
      const ch = 300;
      const cx = (W - cw) / 2;
      const cy = ESCENA.y + ESCENA.h - ch - 40 + (1 - dentro) * 120;
      ctx.globalAlpha = dentro;
      ctx.save();
      ctx.translate(cx + cw / 2, cy + ch / 2);
      ctx.rotate(-0.025);
      ctx.translate(-cx - cw / 2, -cy - ch / 2);
      ctx.shadowColor = 'rgba(0,0,0,.5)';
      ctx.shadowBlur = 30;
      rectRedondo(ctx, cx, cy, cw, ch, 18);
      ctx.fillStyle = '#F7F8FA';
      ctx.fill();
      ctx.shadowBlur = 0;
      guion.manual(ctx, cx, cy, cw, ch, datos);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  // acierto: "✓ +1" grande sobre la escena
  if (exito && t - exito.t < 1.6) {
    const f = t - exito.t;
    const a = 1 - suave((f - 1.1) / 0.5);
    const esc = 0.6 + 0.4 * suave(f / 0.25);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(W / 2, ESCENA.y + 300 - suave(f / 1.6) * 40);
    ctx.scale(esc, esc);
    rectRedondo(ctx, -150, -62, 300, 124, 62);
    ctx.fillStyle = COLOR.bien;
    ctx.shadowColor = 'rgba(61,220,151,.6)';
    ctx.shadowBlur = 40;
    ctx.fill();
    ctx.shadowBlur = 0;
    escribir(ctx, `✓ ${exito.texto}`, 0, 4, { tam: 70, peso: 700, color: '#050405', alinear: 'center' });
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // entrada
  if (t < 2.2) {
    const a = 1 - suave((t - 1.7) / 0.5);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(6,8,13,.78)';
    ctx.fillRect(0, ESCENA.y, W, ESCENA.h);
    escribir(ctx, 'LOCALIZA', W / 2, 520, { tam: 60, peso: 800, alinear: 'center', fuente: TITULO });
    escribir(ctx, 'A ULTRÓN.', W / 2, 600, { tam: 60, peso: 800, color: COLOR.acento, alinear: 'center', fuente: TITULO });
    escribir(ctx, 'Ghost Network · Estación 04 · Redes', W / 2, 690, { tam: 28, color: COLOR.tenue, alinear: 'center' });
    ctx.globalAlpha = 1;
  }

  // cierre
  const cierre = suave((t - (DURACION - 2.9)) / 0.5);
  if (cierre > 0) {
    ctx.globalAlpha = cierre;
    ctx.fillStyle = 'rgba(6,8,13,.92)';
    ctx.fillRect(0, ESCENA.y, W, H - ESCENA.y);
    escribir(ctx, guion.final[0], W / 2, 520, { tam: 40, peso: 700, alinear: 'center', max: W - 80 });
    escribir(ctx, guion.final[1], W / 2, 580, { tam: 30, color: COLOR.tenue, alinear: 'center', max: W - 80 });
    escribir(ctx, '¿ACEPTAS EL RETO?', W / 2, 700, { tam: 42, peso: 800, color: COLOR.acento, alinear: 'center', fuente: TITULO });
    dibujarLogo(ctx, W / 2 - 150, 900, 48);
    dibujarCodexia(ctx, W / 2 - 112, 902, 44);
    escribir(ctx, 'GHOST NETWORK · ESTACIÓN 04', W / 2, 980, { tam: 22, color: COLOR.tenue, alinear: 'center', fuente: MONO });
    ctx.globalAlpha = 1;
  }
}

/** Avanza el guion: eventos que ya tocan y movimiento suave de la cámara. */
function avanzar() {
  const t = tiempo();
  eventos.forEach((e) => {
    if (e.hecho || t < e.t) return;
    e.hecho = true;
    if (e.cam) camara.mover(e.cam, e.seg || 0);
    if (e.hacer) { try { e.hacer(); } catch (err) { console.error(err); } }
    if (e.exito) exito = { texto: e.exito, t: e.t };
  });
  camara.actualizar();
}

function crearCamara() {
  const lc = win.document.querySelector('[camera]').components['look-controls'];
  const estado = { desde: [0, 0], hacia: [0, 0], inicio: 0, seg: 0 };
  return {
    mover([yaw, pitch], seg) {
      estado.desde = [grados(lc.yawObject.rotation.y), grados(lc.pitchObject.rotation.x)];
      estado.hacia = [yaw, pitch];
      estado.inicio = tiempo();
      estado.seg = seg;
    },
    actualizar() {
      const f = estado.seg ? suave((tiempo() - estado.inicio) / estado.seg) : 1;
      lc.yawObject.rotation.y = rad(estado.desde[0] + (estado.hacia[0] - estado.desde[0]) * f);
      lc.pitchObject.rotation.x = rad(estado.desde[1] + (estado.hacia[1] - estado.desde[1]) * f);
    },
  };
}

// ---------- preparar y grabar ----------

async function esperarJuego() {
  for (let i = 0; i < 200; i++) {
    win = marco.contentWindow;
    const el = win && win.document && win.document.querySelector(`[${guion.componente}]`);
    const comp = el && el.components && el.components[guion.componente];
    const escena = win && win.document.querySelector('a-scene');
    if (comp && escena && escena.hasLoaded && escena.renderer) return comp;
    await espera(100);
  }
  throw new Error('El juego no cargó');
}

/** Audio: la música y los sonidos van a la vez a la bocina y a la grabación. */
function prepararAudio() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const mezcla = ac.createGain();
    mezcla.connect(ac.destination);
    const salida = ac.createMediaStreamDestination();
    mezcla.connect(salida);
    Object.defineProperty(ac, 'destination', { value: mezcla });
    sonido.ctx = ac;
    return salida;
  } catch (e) {
    return null;
  }
}

async function principal() {
  guion = GUIONES[JUEGO];
  if (!guion) throw new Error(`No hay guion para ${JUEGO}`);
  marco.src = guion.archivo;
  await new Promise((r) => { marco.onload = r; });
  juego = await esperarJuego();
  // el juego no toca su propia música ni sus pitidos: el reel pone los suyos y esos se graban
  const musicaJuego = win.eval('musica');
  musicaJuego.iniciar = () => {};
  musicaJuego.detener();
  win.eval('sonido').tono = () => {};
  await Promise.all([document.fonts.load(`700 40px ${LETRA}`), document.fonts.load(`600 30px ${MONO}`), win.document.fonts.ready]);
  await espera(1200);

  datos = guion.preparar(juego, win);
  pasos = guion.pasos(datos);
  eventos = guion.eventos(datos, juego);
  camara = crearCamara();

  // cada vez que el juego dibuja un cuadro, el reel compone el suyo
  const escena = win.document.querySelector('a-scene');
  const original = escena.renderer.render.bind(escena.renderer);
  escena.renderer.render = (...args) => {
    avanzar();
    original(...args);
    componer();
  };

  const salidaAudio = prepararAudio();
  await espera(300);
  musica.encendida = () => true;
  musica.iniciar();
  musica.ponerUrgente(true);
  t0 = performance.now();
  estadoEl.textContent = 'grabando…';

  if (VISTA) {
    await espera(DURACION * 1000);
    musica.detener();
    estadoEl.textContent = 'listo (vista)';
    window.reelListo = true;
    return;
  }

  const stream = lienzo.captureStream(30);
  if (salidaAudio) salidaAudio.stream.getAudioTracks().forEach((pista) => stream.addTrack(pista));
  const tipos = ['video/mp4;codecs=avc1.4d002a,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
  const tipo = tipos.find((x) => MediaRecorder.isTypeSupported(x));
  const grabadora = new MediaRecorder(stream, { mimeType: tipo, videoBitsPerSecond: 6000000, audioBitsPerSecond: 128000 });
  const trozos = [];
  grabadora.ondataavailable = (e) => { if (e.data.size) trozos.push(e.data); };
  const terminado = new Promise((r) => { grabadora.onstop = r; });
  grabadora.start(500);
  await espera(DURACION * 1000);
  musica.detener();
  await espera(250);
  grabadora.stop();
  await terminado;
  const blob = new Blob(trozos, { type: tipo });
  const lector = new FileReader();
  window.reelBase64 = await new Promise((r) => { lector.onload = () => { const url = String(lector.result); r(url.slice(url.indexOf('base64,') + 7)); }; lector.readAsDataURL(blob); });
  window.reelTipo = tipo;
  window.reelListo = true;
  estadoEl.textContent = `listo: ${(blob.size / 1e6).toFixed(1)} MB · ${tipo}`;
}

principal().catch((e) => {
  estadoEl.textContent = `error: ${e.message}`;
  window.reelError = e.message;
  console.error(e);
});
