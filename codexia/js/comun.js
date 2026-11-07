/* CODEXIA · Ghost Network (edición de Enlace VR) · piezas comunes de todos los minijuegos
 *
 * Identidad Enlace VR ("Uno ve. El equipo sabe."): negro, azul marino, gris y blanco,
 * con un solo acento azul hielo (#ff1638). Verde y rojo solo para correcto o incorrecto.
 * Letras: Space Grotesk (títulos y texto) e IBM Plex Mono (números, bits y direcciones).
 *
 * - lienzo: panel donde se dibuja texto (canvas), para que los acentos se vean bien en el visor
 * - boton: botón que se apunta con el láser del control o con el mouse
 * - cuadricula: piso de cuadrícula sencillo
 * - (los fondos de cada juego están en js/ambientes.js)
 * - sonido: pitidos generados por el navegador (sin archivos)
 * - musica: música de fondo sencilla, también generada por el navegador
 * - dibujarFinalRonda / dibujarCodigo: pantalla final con el puntaje y el código de verificación
 */
/* global AFRAME, THREE, marcador */

const PIXELES_POR_METRO = 1000;

// paleta de Enlace VR
const COLOR = {
  fondo: '#050405',
  marino: '#160A0D',
  panel: '#120A0D',
  borde: '#C8102E',
  texto: '#E6E8EB',
  tenue: '#9DA0A7',
  acento: '#FF1638',
  magenta: '#FF1638', // nombre viejo, se deja para no romper código
  bien: '#3DDC97',
  mal: '#FFB020',
  agua: '#3FA9F5',
  tecla: '#1E0D12',
  teclaEncima: '#3A0F18',
  principal: '#C8102E',
  principalEncima: '#FF1638',
};

const LETRA = '"Rajdhani", "Segoe UI", Roboto, system-ui, sans-serif';
const TITULO = '"Orbitron", "Rajdhani", "Segoe UI", system-ui, sans-serif';
const MONO = '"IBM Plex Mono", Consolas, "Courier New", monospace';

// ---------- utilidades de dibujo ----------

/** Rectángulo con esquinas redondeadas. */
function rectRedondo(ctx, x, y, w, h, r) {
  const c = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.arcTo(x + w, y, x + w, y + h, c);
  ctx.arcTo(x + w, y + h, x, y + h, c);
  ctx.arcTo(x, y + h, x, y, c);
  ctx.arcTo(x, y, x + w, y, c);
  ctx.closePath();
}

/** Escribe texto. Si no cabe en el lienzo, se achica solo. */
function texto(ctx, str, x, y, { tam = 40, color = COLOR.texto, peso = 400, alinear = 'left', fuente } = {}) {
  const familia = fuente || (peso >= 700 ? TITULO : LETRA);
  const ancho = ctx.canvas.width;
  let disponible = alinear === 'center' ? 2 * Math.min(x, ancho - x) : alinear === 'right' ? x : ancho - x;
  disponible -= 24;
  ctx.font = `${peso} ${tam}px ${familia}`;
  const medida = ctx.measureText(str).width;
  if (medida > disponible && disponible > 0) {
    tam = Math.max(8, tam * (disponible / medida));
    ctx.font = `${peso} ${tam}px ${familia}`;
  }
  ctx.fillStyle = color;
  ctx.textAlign = alinear;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

/** Fondo de panel: azul marino oscuro, esquinas redondeadas y borde fino. */
function fondoPanel(ctx, w, h, color = COLOR.panel) {
  rectRedondo(ctx, 4, 4, w - 8, h - 8, 26);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(242, 244, 248, 0.16)';
  ctx.stroke();
}

/** Logo de CODEXIA: un rombo rojo con otro rombo adentro. (x, y) = centro del logo; t = tamaño. */
function dibujarLogo(ctx, x, y, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.lineWidth = t * 0.09;
  ctx.strokeStyle = COLOR.acento;
  ctx.strokeRect(-t * 0.36, -t * 0.36, t * 0.72, t * 0.72);
  ctx.fillStyle = COLOR.acento;
  ctx.fillRect(-t * 0.11, -t * 0.11, t * 0.22, t * 0.22);
  ctx.restore();
}

/** La palabra CODEXIA con la X roja. (x, y) = inicio a la izquierda, a media altura. Devuelve el ancho. */
function dibujarCodexia(ctx, x, y, tam) {
  ctx.font = `800 ${tam}px ${TITULO}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  let px = x;
  [['CODE', COLOR.texto], ['X', COLOR.acento], ['IA', COLOR.texto]].forEach(([parte, color]) => {
    ctx.fillStyle = color;
    ctx.fillText(parte, px, y);
    px += ctx.measureText(parte).width + tam * 0.06;
  });
  return px - x;
}

/** Convierte un dibujo SVG (texto) en imagen para pintarlo en un lienzo.
 *  Devuelve la imagen si ya está lista (o null) y llama a alCargar(img) cuando carga. */
const IMAGENES_SVG = new Map();
function imagenSVG(svg, alCargar) {
  let reg = IMAGENES_SVG.get(svg);
  if (!reg) {
    const img = new Image();
    reg = { img, listo: false, esperan: [] };
    img.onload = () => {
      reg.listo = true;
      reg.esperan.forEach((f) => f(img));
      reg.esperan = [];
    };
    // tamaño explícito: algunos navegadores no dibujan bien un SVG sin ancho y alto
    const conTamano = svg.includes(' width=') ? svg : svg.replace('<svg ', '<svg width="512" height="512" ');
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(conTamano)}`;
    IMAGENES_SVG.set(svg, reg);
  }
  if (reg.listo) {
    if (alCargar) alCargar(reg.img);
    return reg.img;
  }
  if (alCargar) reg.esperan.push(alCargar);
  return null;
}

/** Cuando terminan de cargar las letras, redibuja todos los paneles y botones. */
if (document.fonts && document.fonts.load) {
  Promise.all([
    document.fonts.load('600 40px "Rajdhani"'), document.fonts.load('700 40px "Orbitron"'), document.fonts.load('800 40px "Orbitron"'),
    document.fonts.load('500 40px "IBM Plex Mono"'),
  ]).then(() => {
    document.querySelectorAll('[lienzo]').forEach((el) => {
      const l = el.components && el.components.lienzo;
      if (l && l.ctx && el._dibujo) l.dibujar(el._dibujo);
    });
    document.querySelectorAll('[boton]').forEach((el) => {
      const b = el.components && el.components.boton;
      if (b && b.ctx) b.dibujar();
    });
  }).catch(() => { /* sin internet: se quedan las letras del sistema */ });
}

function minutos(segundos) {
  const s = Math.max(0, Math.ceil(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Crea un plano con un canvas como textura. */
function planoConLienzo(el, ancho, alto) {
  const canvas = document.createElement('canvas');
  // máximo 2048 px por lado, sin deformar: si el panel es muy grande, se reduce igual en los dos ejes
  const escala = Math.min(1, 2048 / (Math.max(ancho, alto) * PIXELES_POR_METRO));
  canvas.width = Math.round(ancho * PIXELES_POR_METRO * escala);
  canvas.height = Math.round(alto * PIXELES_POR_METRO * escala);
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 4;
  const material = new THREE.MeshBasicMaterial({ map: textura, transparent: true });
  el.setObject3D('mesh', new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), material));
  return { canvas, ctx: canvas.getContext('2d'), textura };
}

/** Crea una entidad con atributos y la agrega al padre. */
function crearEntidad(padre, atributos) {
  const el = document.createElement('a-entity');
  Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v));
  padre.appendChild(el);
  return el;
}

/** Que los apuntadores (mouse y controles) vuelvan a buscar qué botones se pueden tocar. */
function refrescarApuntadores() {
  document.querySelectorAll('[raycaster]').forEach((r) => {
    if (r.components.raycaster) r.components.raycaster.refreshObjects();
  });
}

/** Números al azar repetibles, para que la ciudad se vea igual cada vez. */
function azarConSemilla(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---------- componentes ----------

/** Un panel donde el juego dibuja texto. Usa pintar(el, fn) para dibujar. */
AFRAME.registerComponent('lienzo', {
  schema: { ancho: { default: 1 }, alto: { default: 0.5 } },
  init() {
    Object.assign(this, planoConLienzo(this.el, this.data.ancho, this.data.alto));
    if (this.el._dibujo) this.dibujar(this.el._dibujo);
  },
  dibujar(fn) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    fn(this.ctx, this.canvas.width, this.canvas.height);
    this.textura.needsUpdate = true;
  },
});

function pintar(el, fn) {
  el._dibujo = fn;
  // si el panel todavía no está listo, se dibuja solo al terminar de crearse
  const lienzo = el.components && el.components.lienzo;
  if (lienzo && lienzo.ctx) lienzo.dibujar(fn);
}

/** Un botón que se puede apuntar con el láser (o con el mouse). */
AFRAME.registerComponent('boton', {
  schema: {
    texto: { default: '' },
    ancho: { default: 0.17 },
    alto: { default: 0.13 },
    estilo: { default: 'tecla' }, // tecla | principal | casilla
    accion: { default: '' },
    valor: { default: '' },
    elegido: { default: false },
    activo: { default: true },
  },
  init() {
    Object.assign(this, planoConLienzo(this.el, this.data.ancho, this.data.alto));
    this.encima = false;
    this.el.addEventListener('mouseenter', () => { this.encima = true; this.dibujar(); });
    this.el.addEventListener('mouseleave', () => { this.encima = false; this.dibujar(); });
    this.el.addEventListener('click', () => {
      if (!this.data.activo) return;
      this.el.sceneEl.emit('boton-presionado', { accion: this.data.accion, valor: this.data.valor });
    });
  },
  update() { this.dibujar(); },
  dibujar() {
    const { ctx, canvas } = this;
    const { width: w, height: h } = canvas;
    const d = this.data;
    const encima = this.encima && d.activo;
    ctx.clearRect(0, 0, w, h);
    const colores = {
      tecla: [COLOR.tecla, COLOR.teclaEncima],
      principal: [COLOR.principal, COLOR.principalEncima],
      casilla: ['rgba(30, 13, 18, 0.7)', 'rgba(200, 16, 46, 0.85)'],
    }[d.estilo] || [COLOR.tecla, COLOR.teclaEncima];
    let relleno = encima ? colores[1] : colores[0];
    if (d.elegido) relleno = COLOR.acento;
    rectRedondo(ctx, 3, 3, w - 6, h - 6, Math.min(w, h) * 0.18);
    ctx.globalAlpha = d.activo ? 1 : 0.35;
    ctx.fillStyle = relleno;
    ctx.fill();
    ctx.lineWidth = d.estilo === 'casilla' ? 6 : 4;
    ctx.strokeStyle = encima || d.elegido ? COLOR.acento : 'rgba(255,255,255,.18)';
    ctx.stroke();
    // texto que quepa en el botón (en las casillas, más chico)
    let tam = h * (d.estilo === 'casilla' ? 0.3 : 0.46);
    ctx.font = `600 ${tam}px ${LETRA}`;
    while (ctx.measureText(d.texto).width > w * 0.86) {
      tam *= 0.92;
      ctx.font = `600 ${tam}px ${LETRA}`;
    }
    let colorTexto = COLOR.texto;
    if (d.elegido) colorTexto = '#050405';
    else if (d.estilo === 'casilla') colorTexto = 'rgba(230,232,235,.5)';
    texto(ctx, d.texto, w / 2, h / 2 + tam * 0.04, { tam, peso: 600, alinear: 'center', color: colorTexto });
    ctx.globalAlpha = 1;
    this.textura.needsUpdate = true;
  },
});

/** Piso de cuadrícula estilo neón (sencillo). */
AFRAME.registerComponent('cuadricula', {
  init() {
    this.el.setObject3D('rejilla', new THREE.GridHelper(40, 40, 0xff1638, 0x2a0b13));
  },
});

// Los fondos (circuito, servidores, ciudad, fibra, red, órbita) están en js/ambientes.js.

/** Consola inclinada frente al jugador (para juegos donde hay que voltear a ver el entorno).
 *  Devuelve la entidad raíz; los juegos ponen sus pantallas dentro. */
function crearConsola(padre, ancho = 1.6, alto = 0.95) {
  // un poco más lejos y más chica que en Enlace VR: así se alcanza sin echarse para atrás
  const raiz = crearEntidad(padre, { position: '0 0.84 -1.08', rotation: '-34 0 0', scale: '0.86 0.86 0.86' });
  crearEntidad(raiz, { geometry: `primitive: plane; width: ${ancho + 0.04}; height: ${alto + 0.04}`, material: 'shader: flat; color: #ff1638; opacity: 0.35; transparent: true', position: '0 0 -0.012' });
  crearEntidad(raiz, { geometry: `primitive: plane; width: ${ancho}; height: ${alto}`, material: 'shader: flat; color: #050405; opacity: 0.95; transparent: true', position: '0 0 -0.008' });
  return raiz;
}

// ---------- salir a medio juego ----------

/** Salir a medio juego pide presionar DOS veces el mismo botón en menos de 3 segundos, para que un toque
 *  por error en VR no saque al equipo. El botón cambia a "¿Seguro? Otra vez". Devuelve true al confirmar. */
function confirmarDosVeces(juego, accion, boton) {
  const ahora = performance.now();
  const previo = juego._confirmar;
  if (previo && previo.accion === accion && ahora < previo.hasta) {
    juego._confirmar = null;
    if (boton) boton.setAttribute('boton', 'texto', previo.texto);
    return true;
  }
  if (previo && previo.boton) previo.boton.setAttribute('boton', 'texto', previo.texto);
  const texto = boton ? boton.getAttribute('boton').texto : '';
  const pendiente = { accion, hasta: ahora + 3000, boton, texto };
  juego._confirmar = pendiente;
  if (boton) boton.setAttribute('boton', 'texto', '¿Seguro? Otra vez');
  setTimeout(() => {
    if (juego._confirmar !== pendiente) return;
    juego._confirmar = null;
    if (boton) boton.setAttribute('boton', 'texto', texto);
  }, 3000);
  sonido.tecla();
  return false;
}

// ---------- altura del jugador en VR ----------

/** En el visor, la cámara está a la altura real de la cabeza (sentado ~1.2 m, parado ~1.6 m). Los juegos
 *  están hechos para los ojos a 1.2 m: al entrar a VR se mide la cabeza y se sube o baja todo el juego
 *  (paneles, tableros y botones) para que quede a la altura de los ojos. El piso y el fondo no se mueven. */
AFRAME.registerComponent('ajustar-altura', {
  schema: { extra: { default: 0 } },
  init() {
    this.base = this.el.object3D.position.y + this.data.extra;
    this.el.object3D.position.y = this.base;
    const escena = this.el.sceneEl;
    const medir = () => {
      if (!escena.is('vr-mode') || !escena.camera) return;
      const v = new THREE.Vector3();
      escena.camera.getWorldPosition(v);
      if (v.y > 0.6 && v.y < 2.3) this.el.object3D.position.y = this.base + Math.max(-0.4, Math.min(0.7, v.y - 1.2));
    };
    escena.addEventListener('enter-vr', () => { [500, 1500, 4000].forEach((ms) => setTimeout(medir, ms)); });
    escena.addEventListener('exit-vr', () => { this.el.object3D.position.y = this.base; });
    // si la página ya abrió dentro de VR (al cambiar de juego), medir también
    if (escena.is && escena.is('vr-mode')) [500, 1500].forEach((ms) => setTimeout(medir, ms));
  },
});

// ---------- sonido (sin archivos) ----------

const sonido = {
  ctx: null,
  maestro: null,
  ruidoBuf: null,

  /** El contexto de audio, con un volumen general (las bocinas del visor suenan bajito). */
  contexto() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (!this.maestro) {
      this.maestro = this.ctx.createGain();
      this.maestro.gain.value = 1.6;
      const compresor = this.ctx.createDynamicsCompressor();
      this.maestro.connect(compresor).connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  /** Los navegadores (y el del visor) no dejan sonar nada hasta que la persona toca algo.
   *  Esto se llama con cualquier toque: mouse, teclado o el gatillo del control en VR. */
  desbloquear() {
    try {
      const ctx = this.contexto();
      const b = ctx.createBuffer(1, 1, 22050);
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.connect(ctx.destination);
      s.start(0);
    } catch (e) { /* sin audio */ }
  },

  tono(frecuencia, duracion, tipo = 'sine', volumen = 0.12, retraso = 0, hasta = null) {
    try {
      const ctx = this.contexto();
      const t = ctx.currentTime + retraso;
      const osc = ctx.createOscillator();
      const gan = ctx.createGain();
      osc.type = tipo;
      osc.frequency.setValueAtTime(frecuencia, t);
      if (hasta) osc.frequency.exponentialRampToValueAtTime(hasta, t + duracion);
      gan.gain.setValueAtTime(0.0001, t);
      gan.gain.exponentialRampToValueAtTime(volumen, t + 0.008);
      gan.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
      osc.connect(gan).connect(this.maestro);
      osc.start(t);
      osc.stop(t + duracion + 0.02);
    } catch (e) { /* sin audio, el juego sigue */ }
  },

  /** Ruido filtrado (explosiones, agua, aire). */
  ruido(duracion, { volumen = 0.2, retraso = 0, filtro = 'lowpass', desde = 2000, hasta = 400 } = {}) {
    try {
      const ctx = this.contexto();
      if (!this.ruidoBuf) {
        this.ruidoBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = this.ruidoBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const t = ctx.currentTime + retraso;
      const fuente = ctx.createBufferSource();
      fuente.buffer = this.ruidoBuf;
      const f = ctx.createBiquadFilter();
      f.type = filtro;
      f.frequency.setValueAtTime(desde, t);
      f.frequency.exponentialRampToValueAtTime(hasta, t + duracion);
      const gan = ctx.createGain();
      gan.gain.setValueAtTime(volumen, t);
      gan.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
      fuente.connect(f).connect(gan).connect(this.maestro);
      fuente.start(t);
      fuente.stop(t + duracion + 0.05);
    } catch (e) { /* sin audio */ }
  },

  // --- los de siempre (más de videojuego) ---
  tecla() { this.tono(880, 0.05, 'square', 0.05); this.tono(1320, 0.04, 'square', 0.03, 0.03); },
  paso() { this.tono(220, 0.07, 'square', 0.06, 0, 330); },
  bien() { this.tono(988, 0.09, 'square', 0.09); this.tono(1319, 0.28, 'square', 0.09, 0.08); },
  mal() { this.tono(320, 0.18, 'sawtooth', 0.12, 0, 160); this.tono(160, 0.35, 'sawtooth', 0.12, 0.17, 90); },
  nivel() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tono(f, 0.12, 'square', 0.07, i * 0.07)); this.tono(1568, 0.4, 'triangle', 0.1, 0.36); },
  fin() { [784, 659, 523, 392].forEach((f, i) => this.tono(f, 0.22, 'square', 0.08, i * 0.18)); this.tono(196, 0.7, 'triangle', 0.12, 0.72); },

  // --- efectos de cada juego ---
  /** Router: el paquete sale disparado hacia la puerta. */
  lanzar() { this.tono(300, 0.35, 'sawtooth', 0.07, 0, 1600); this.ruido(0.35, { volumen: 0.12, filtro: 'bandpass', desde: 600, hasta: 4000 }); },
  /** Router: el paquete llega a su puerta. */
  entregado() { this.tono(1047, 0.08, 'square', 0.08); this.tono(1568, 0.2, 'square', 0.08, 0.07); this.tono(2093, 0.25, 'triangle', 0.06, 0.14); },
  /** Arma: tomar una pieza. */
  tomar() { this.tono(440, 0.1, 'square', 0.07, 0, 880); },
  /** Arma: la pieza se conecta en su lugar (clac). */
  conectar() { this.ruido(0.08, { volumen: 0.25, desde: 3000, hasta: 800 }); this.tono(140, 0.12, 'square', 0.12, 0, 70); this.tono(1760, 0.08, 'square', 0.05, 0.08); },
  /** Arma: el robot armado se enciende. */
  encender() { this.tono(80, 1.0, 'sawtooth', 0.08, 0, 640); [523, 784, 1047].forEach((f) => this.tono(f, 0.6, 'square', 0.04, 0.9)); },
  /** Carrera: el mensaje salta al siguiente escenario. */
  salto() { this.ruido(1.2, { volumen: 0.14, filtro: 'bandpass', desde: 300, hasta: 3000 }); this.tono(200, 1.1, 'triangle', 0.06, 0, 900); },
  /** Robot: Ultrón llega bien ("¡listo!"). */
  listo() { this.tono(1319, 0.07, 'square', 0.07); this.tono(1319, 0.12, 'square', 0.07, 0.11); },
  /** Robot: Ultrón cae al agua. */
  splash() { this.ruido(0.9, { volumen: 0.35, desde: 5000, hasta: 300 }); this.tono(260, 0.5, 'sine', 0.12, 0, 70); },
  /** Robot: Ultrón se reconecta con una antena y escapa (chispazo eléctrico). */
  escape() {
    this.tono(1200, 0.5, 'sawtooth', 0.08, 0, 80);
    [0, 0.08, 0.17, 0.3].forEach((r) => this.ruido(0.06, { volumen: 0.25, retraso: r, filtro: 'highpass', desde: 3000, hasta: 6000 }));
  },
  /** Gran final: fanfarria. */
  victoria() {
    [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.3], [784, 0.45], [1047, 0.55]].forEach(([f, r]) => this.tono(f, 0.16, 'square', 0.08, r));
    this.tono(1319, 0.8, 'square', 0.07, 0.7);
  },
};

// desbloquear el audio con el primer toque (mouse, teclado, pantalla o gatillo del control en VR)
['pointerdown', 'touchstart', 'keydown', 'click'].forEach((ev) => window.addEventListener(ev, () => sonido.desbloquear(), { capture: true }));
document.addEventListener('DOMContentLoaded', () => {
  const escena = document.querySelector('a-scene');
  if (!escena) return;
  escena.addEventListener('enter-vr', () => {
    const sesion = escena.xrSession || (escena.renderer && escena.renderer.xr && escena.renderer.xr.getSession && escena.renderer.xr.getSession());
    if (!sesion) return;
    // el gatillo del control en VR sí cuenta como "tocar" para el navegador: ahí se prende el audio
    ['selectstart', 'select', 'squeezestart'].forEach((ev) => sesion.addEventListener(ev, () => sonido.desbloquear()));
  });
});

// ---------- música de fondo (sin archivos) ----------
//
// Música instrumental sencilla, generada por el navegador: acordes suaves, un arpegio y un bajo.
// Va bajita a propósito (el equipo necesita hablar) y sin letra. En los últimos 30 segundos de la
// ronda se acelera y agrega un "tic" para dar suspenso. Se apaga o prende desde el menú (tecla M en
// la computadora) y la preferencia se guarda en el visor.

const musica = {
  ctx: null,
  maestro: null,
  reloj: null,
  paso: 0,
  siguiente: 0,
  urgente: false,
  ruido: null,
  // La menor, Fa, Do, Sol (frecuencias en Hz)
  acordes: [[146.83, 174.61, 220], [116.54, 146.83, 174.61], [174.61, 220, 261.63], [130.81, 164.81, 196]],
  arpegio: [0, 1, 2, 1, 0, 2, 1, 2],

  encendida() {
    try { return localStorage.getItem('codexia-musica') !== 'no'; } catch (e) { return true; }
  },

  ponerEncendida(si) {
    try { localStorage.setItem('codexia-musica', si ? 'si' : 'no'); } catch (e) { /* sin almacenamiento */ }
    if (!si) this.detener();
  },

  iniciar() {
    if (!this.encendida() || this.reloj) return;
    try {
      this.ctx = sonido.contexto();
      const t = this.ctx.currentTime;
      this.maestro = this.ctx.createGain();
      this.maestro.gain.setValueAtTime(0.0001, t);
      this.maestro.gain.exponentialRampToValueAtTime(0.5, t + 2);
      this.maestro.connect(this.ctx.destination);
      this.paso = 0;
      this.urgente = false;
      this.siguiente = t + 0.1;
      this.reloj = setInterval(() => this.programar(), 60);
    } catch (e) { /* sin audio, el juego sigue */ }
  },

  detener() {
    if (!this.reloj) return;
    clearInterval(this.reloj);
    this.reloj = null;
    const t = this.ctx.currentTime;
    const maestro = this.maestro;
    maestro.gain.cancelScheduledValues(t);
    maestro.gain.setValueAtTime(Math.max(0.0001, maestro.gain.value), t);
    maestro.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    setTimeout(() => maestro.disconnect(), 1000);
  },

  ponerUrgente(si) { this.urgente = si; },

  /** Programa las notas que tocan en el próximo cuarto de segundo. */
  programar() {
    const bpm = this.urgente ? 128 : 96;
    if (this.siguiente < this.ctx.currentTime) this.siguiente = this.ctx.currentTime + 0.05; // la pestaña estuvo dormida
    while (this.siguiente < this.ctx.currentTime + 0.3) {
      this.tocarPaso(this.paso, this.siguiente, 60 / bpm / 2);
      this.siguiente += 60 / bpm / 2;
      this.paso += 1;
    }
  },

  voz(frecuencia, t, duracion, { tipo = 'triangle', volumen = 0.03, ataque = 0.01, filtro = 0 } = {}) {
    const osc = this.ctx.createOscillator();
    const gan = this.ctx.createGain();
    osc.type = tipo;
    osc.frequency.value = frecuencia;
    gan.gain.setValueAtTime(0.0001, t);
    gan.gain.exponentialRampToValueAtTime(volumen, t + ataque);
    gan.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
    osc.connect(gan);
    let salida = gan;
    if (filtro) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filtro;
      gan.connect(f);
      salida = f;
    }
    salida.connect(this.maestro);
    osc.start(t);
    osc.stop(t + duracion + 0.05);
  },

  tocarPaso(paso, t, octavo) {
    const acorde = this.acordes[Math.floor(paso / 8) % 4];
    if (paso % 8 === 0) {
      // acorde largo y suave (un compás)
      acorde.forEach((f) => this.voz(f, t, octavo * 8, { tipo: 'sawtooth', volumen: 0.018, ataque: 0.6, filtro: 700 }));
    }
    if (paso % 4 === 0) this.voz(acorde[0] / 2, t, octavo * 3, { tipo: 'sine', volumen: 0.09, ataque: 0.02 });
    this.voz(acorde[this.arpegio[paso % 8]] * 2, t, octavo * 0.9, { volumen: this.urgente ? 0.03 : 0.022 });
    if (this.urgente) this.tic(t, paso % 2 === 0 ? 0.03 : 0.015);
  },

  /** "Tic" de ruido corto (como un reloj) para los últimos segundos. */
  tic(t, volumen) {
    if (!this.ruido) {
      this.ruido = this.ctx.createBuffer(1, Math.round(this.ctx.sampleRate * 0.05), this.ctx.sampleRate);
      const datos = this.ruido.getChannelData(0);
      for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
    }
    const fuente = this.ctx.createBufferSource();
    fuente.buffer = this.ruido;
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = 'highpass';
    filtro.frequency.value = 6000;
    const gan = this.ctx.createGain();
    gan.gain.setValueAtTime(volumen, t);
    gan.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    fuente.connect(filtro);
    filtro.connect(gan);
    gan.connect(this.maestro);
    fuente.start(t);
  },
};

// tecla M (en la computadora): prender o apagar la música
window.addEventListener('keydown', (e) => {
  if (e.key !== 'm' && e.key !== 'M') return;
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  musica.ponerEncendida(!musica.encendida());
});

// El código de verificación y el envío a Google Sheets están en js/marcador.js.

/** Recuadro de la pista de la misión (IP o GPS de Ultrón) al final de la ronda, con el código a la derecha. */
function dibujarPista(ctx, x, y, w, h, pista, registro) {
  rectRedondo(ctx, x, y, w, h, 18);
  ctx.fillStyle = pista.ok ? '#1E0D12' : '#1A1408';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = pista.ok ? COLOR.acento : COLOR.mal;
  ctx.stroke();
  const ancho = registro && registro.codigo ? w * 0.64 : w;
  if (pista.ok) {
    texto(ctx, pista.titulo, x + 32, y + h * 0.25, { tam: h * 0.17, peso: 600, color: COLOR.acento, fuente: MONO });
    texto(ctx, pista.valor, x + 32, y + h * 0.58, { tam: h * 0.3, peso: 600, color: COLOR.texto, fuente: MONO });
    texto(ctx, 'Anótenla en su bitácora', x + 32, y + h * 0.86, { tam: h * 0.14, color: COLOR.tenue });
  } else {
    texto(ctx, 'PISTA BLOQUEADA', x + 32, y + h * 0.3, { tam: h * 0.19, peso: 700, color: COLOR.mal, fuente: MONO });
    const partes = pista.falta.split('. ');
    texto(ctx, partes[0] + (partes.length > 1 ? '.' : ''), x + 32, y + h * 0.58, { tam: h * 0.15, peso: 600, color: COLOR.texto });
    if (partes[1]) texto(ctx, partes.slice(1).join('. '), x + 32, y + h * 0.8, { tam: h * 0.15, peso: 600, color: COLOR.texto });
  }
  if (registro && registro.codigo) {
    // separador y código de verificación (para el marcador del profesor y JARVIS)
    const cx = x + ancho;
    ctx.fillStyle = 'rgba(242,244,248,.15)';
    ctx.fillRect(cx, y + h * 0.15, 3, h * 0.7);
    const equipo = registro.equipo ? `EQUIPO ${registro.equipo} · CÓDIGO` : 'CÓDIGO (elijan equipo en el menú)';
    texto(ctx, equipo, cx + 28, y + h * 0.3, { tam: h * 0.14, peso: 600, color: COLOR.tenue, fuente: MONO });
    texto(ctx, registro.codigo, cx + 28, y + h * 0.66, { tam: h * 0.27, peso: 600, color: COLOR.acento, fuente: MONO });
  }
}

/** Pantalla final de las rondas cronometradas (igual en todos los juegos). */
function dibujarFinalRonda(ctx, w, h, { practica, puntaje, unidad, detalle, registro }) {
  fondoPanel(ctx, w, h);
  texto(ctx, practica ? 'PRÁCTICA TERMINADA' : '¡TIEMPO!', w / 2, h * 0.08, { tam: 52, peso: 700, color: COLOR.acento, alinear: 'center' });
  texto(ctx, practica ? 'Puntaje de práctica (no da pistas ni puntos)' : 'Resultado de la ronda', w / 2, h * 0.17, { tam: 40, peso: 700, color: COLOR.bien, alinear: 'center' });
  texto(ctx, `${puntaje}`, w / 2, h * 0.3, { tam: 120, peso: 700, alinear: 'center' });
  texto(ctx, unidad, w / 2, h * 0.42, { tam: 36, color: COLOR.tenue, alinear: 'center' });
  texto(ctx, detalle, w / 2, h * 0.49, { tam: 28, color: COLOR.tenue, alinear: 'center' });
  const ronda = !practica && registro;
  if (ronda && registro.total !== undefined) {
    // los puntos del equipo (mejor ronda de cada juego) y el total para comparar al final
    rectRedondo(ctx, 40, h * 0.54, w - 80, h * 0.13, 14);
    ctx.fillStyle = '#160A0D';
    ctx.fill();
    if (registro.codexia !== undefined && typeof mision !== 'undefined') {
      // puntos sobre 100 que van al marcador general de CODEXIA, y si ya se mandaron
      const envio = mision.envio();
      texto(ctx, `PUNTOS CODEXIA: ${mision.puntosCodexia()} / 100`, 70, h * 0.583, { tam: 40, peso: 700, color: COLOR.texto });
      texto(ctx, registro.resumen, w - 70, h * 0.583, { tam: 27, peso: 600, color: COLOR.tenue, alinear: 'right', fuente: MONO });
      texto(ctx, mision.textoEnvio(), 70, h * 0.64, { tam: 27, peso: 600, color: envio && envio.estado === 'enviado' ? COLOR.bien : COLOR.acento, fuente: MONO });
    } else {
      texto(ctx, `TOTAL DEL EQUIPO: ${registro.total}`, 70, h * 0.605, { tam: 42, peso: 600, color: COLOR.texto });
      texto(ctx, registro.resumen, w - 70, h * 0.605, { tam: 27, peso: 600, color: COLOR.tenue, alinear: 'right', fuente: MONO });
    }
  }
  if (ronda && registro.pista) dibujarPista(ctx, 40, h * 0.7, w - 80, h * 0.2, registro.pista, registro);
  texto(ctx, 'Anoten puntaje y código en la bitácora · el visor se pasa con las dos manos', w / 2, ronda ? h * 0.95 : h * 0.8, { tam: 28, peso: 600, alinear: 'center', color: COLOR.tenue });
}

/** Todas las rondas: arrancar y parar la música, y acelerarla en los últimos 30 segundos. */
const rondaComun = {
  empezar(modo) { musica.iniciar(); musica.ponerUrgente(false); },
  segundo(restante, modo) { musica.ponerUrgente(modo === 'ronda' && restante <= 30); },
  terminar() { musica.detener(); },
};
