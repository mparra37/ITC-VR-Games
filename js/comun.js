/* Enlace VR · piezas comunes de todos los minijuegos
 *
 * Identidad Enlace VR ("Uno ve. El equipo sabe."): negro, azul marino, gris y blanco,
 * con un solo acento azul hielo (#5AA9FF). Verde y rojo solo para correcto o incorrecto.
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
  fondo: '#06080D',
  marino: '#0B1F3A',
  panel: '#0C1628',
  borde: '#2F6FBF',
  texto: '#F2F4F8',
  tenue: '#8B95A7',
  acento: '#5AA9FF',
  magenta: '#5AA9FF', // nombre viejo, se deja para no romper código
  bien: '#3DDC97',
  mal: '#FF5C6C',
  tecla: '#13233D',
  teclaEncima: '#1C3A66',
  principal: '#2F6FBF',
  principalEncima: '#4A8FE0',
};

const LETRA = '"Space Grotesk", "Segoe UI", Roboto, system-ui, sans-serif';
const TITULO = LETRA;
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

/** Logo de Enlace VR: dos nodos unidos por una línea punteada. (x, y) = centro del logo; t = tamaño. */
function dibujarLogo(ctx, x, y, t) {
  ctx.save();
  ctx.lineWidth = t * 0.09;
  ctx.strokeStyle = COLOR.texto;
  ctx.beginPath();
  ctx.arc(x - t * 0.62, y, t * 0.22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = COLOR.acento;
  ctx.beginPath();
  ctx.arc(x + t * 0.62, y, t * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLOR.tenue;
  ctx.setLineDash([t * 0.12, t * 0.1]);
  ctx.beginPath();
  ctx.moveTo(x - t * 0.36, y);
  ctx.lineTo(x + t * 0.36, y);
  ctx.stroke();
  ctx.restore();
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
    document.fonts.load('500 40px "Space Grotesk"'), document.fonts.load('700 40px "Space Grotesk"'),
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
      casilla: ['rgba(19, 35, 61, 0.7)', 'rgba(47, 111, 191, 0.85)'],
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
    if (d.elegido) colorTexto = '#06080D';
    else if (d.estilo === 'casilla') colorTexto = 'rgba(230,232,235,.5)';
    texto(ctx, d.texto, w / 2, h / 2 + tam * 0.04, { tam, peso: 600, alinear: 'center', color: colorTexto });
    ctx.globalAlpha = 1;
    this.textura.needsUpdate = true;
  },
});

/** Piso de cuadrícula estilo neón (sencillo). */
AFRAME.registerComponent('cuadricula', {
  init() {
    this.el.setObject3D('rejilla', new THREE.GridHelper(40, 40, 0x5aa9ff, 0x14284a));
  },
});

// Los fondos (circuito, servidores, ciudad, fibra, red, órbita) están en js/ambientes.js.

/** Consola inclinada frente al jugador (para juegos donde hay que voltear a ver el entorno).
 *  Devuelve la entidad raíz; los juegos ponen sus pantallas dentro. */
function crearConsola(padre, ancho = 1.6, alto = 0.95) {
  const raiz = crearEntidad(padre, { position: '0 0.82 -0.85', rotation: '-38 0 0' });
  crearEntidad(raiz, { geometry: `primitive: plane; width: ${ancho + 0.04}; height: ${alto + 0.04}`, material: 'shader: flat; color: #5AA9FF; opacity: 0.35; transparent: true', position: '0 0 -0.012' });
  crearEntidad(raiz, { geometry: `primitive: plane; width: ${ancho}; height: ${alto}`, material: 'shader: flat; color: #06080D; opacity: 0.95; transparent: true', position: '0 0 -0.008' });
  return raiz;
}

// ---------- sonido (sin archivos) ----------

const sonido = {
  ctx: null,
  tono(frecuencia, duracion, tipo = 'sine', volumen = 0.12, retraso = 0) {
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t = this.ctx.currentTime + retraso;
      const osc = this.ctx.createOscillator();
      const gan = this.ctx.createGain();
      osc.type = tipo;
      osc.frequency.value = frecuencia;
      gan.gain.setValueAtTime(volumen, t);
      gan.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
      osc.connect(gan).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + duracion);
    } catch (e) { /* sin audio, el juego sigue */ }
  },
  tecla() { this.tono(520, 0.06, 'triangle', 0.08); },
  paso() { this.tono(300, 0.05, 'square', 0.04); },
  bien() { this.tono(660, 0.12); this.tono(880, 0.18, 'sine', 0.12, 0.1); },
  mal() { this.tono(180, 0.4, 'sawtooth', 0.08); },
  nivel() { [523, 659, 784].forEach((f, i) => this.tono(f, 0.15, 'triangle', 0.1, i * 0.1)); },
  fin() { [440, 330, 220].forEach((f, i) => this.tono(f, 0.3, 'square', 0.06, i * 0.22)); },
};

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
  acordes: [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]],
  arpegio: [0, 1, 2, 1, 0, 2, 1, 2],

  encendida() {
    try { return localStorage.getItem('enlace-musica') !== 'no'; } catch (e) { return true; }
  },

  ponerEncendida(si) {
    try { localStorage.setItem('enlace-musica', si ? 'si' : 'no'); } catch (e) { /* sin almacenamiento */ }
    if (!si) this.detener();
  },

  iniciar() {
    if (!this.encendida() || this.reloj) return;
    try {
      sonido.ctx = sonido.ctx || new (window.AudioContext || window.webkitAudioContext)();
      this.ctx = sonido.ctx;
      if (this.ctx.state === 'suspended') this.ctx.resume();
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

/** Recuadro con el equipo, el código de verificación y si ya se mandó a la hoja. */
function dibujarCodigo(ctx, x, y, w, h, registro) {
  rectRedondo(ctx, x, y, w, h, 18);
  ctx.fillStyle = '#13233D';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = COLOR.acento;
  ctx.stroke();
  const equipo = registro.equipo ? `EQUIPO ${registro.equipo}` : 'EQUIPO SIN ELEGIR';
  texto(ctx, `${equipo} · CÓDIGO`, x + 36, y + h * 0.27, { tam: h * 0.2, peso: 600, color: COLOR.tenue });
  texto(ctx, registro.codigo, x + 36, y + h * 0.66, { tam: h * 0.42, peso: 600, color: COLOR.acento, fuente: MONO });
  const estados = {
    enviando: ['Enviando al marcador…', COLOR.tenue],
    enviado: ['✓ Enviado al marcador', COLOR.bien],
    'sin-internet': ['Sin internet: anótenlo en la hoja', COLOR.texto],
    papel: ['Anótenlo en la hoja del equipo', COLOR.texto],
  };
  const [mensaje, color] = estados[registro.estado] || estados.papel;
  texto(ctx, mensaje, x + w - 36, y + h * 0.36, { tam: h * 0.22, peso: 600, color, alinear: 'right' });
  texto(ctx, 'puntaje + código', x + w - 36, y + h * 0.68, { tam: h * 0.19, color: COLOR.tenue, alinear: 'right' });
}

/** Pantalla final de las rondas cronometradas (igual en todos los juegos). */
function dibujarFinalRonda(ctx, w, h, { practica, puntaje, unidad, detalle, registro }) {
  fondoPanel(ctx, w, h);
  texto(ctx, practica ? 'PRÁCTICA TERMINADA' : '¡TIEMPO!', w / 2, h * 0.09, { tam: 54, peso: 700, color: COLOR.acento, alinear: 'center' });
  texto(ctx, practica ? 'Puntaje de práctica (no se anota)' : '¡Anoten el puntaje y el código en su hoja!', w / 2, h * 0.2, { tam: 44, peso: 700, color: COLOR.bien, alinear: 'center' });
  texto(ctx, `${puntaje}`, w / 2, h * 0.37, { tam: 140, peso: 700, alinear: 'center' });
  texto(ctx, unidad, w / 2, h * 0.51, { tam: 38, color: COLOR.tenue, alinear: 'center' });
  texto(ctx, detalle, w / 2, h * 0.59, { tam: 32, color: COLOR.tenue, alinear: 'center' });
  if (!practica && registro) dibujarCodigo(ctx, 40, h * 0.65, w - 80, h * 0.21, registro);
  texto(ctx, 'Operador: quítate el visor con las dos manos y pásalo al siguiente', w / 2, practica || !registro ? h * 0.8 : h * 0.93, { tam: 32, peso: 600, alinear: 'center', color: practica ? COLOR.texto : COLOR.tenue });
}

/** Todas las rondas: arrancar y parar la música, y acelerarla en los últimos 30 segundos. */
const rondaComun = {
  empezar(modo) { musica.iniciar(); musica.ponerUrgente(false); },
  segundo(restante, modo) { musica.ponerUrgente(modo === 'ronda' && restante <= 30); },
  terminar() { musica.detener(); },
};
