/* Enlace VR · piezas comunes de todos los minijuegos
 *
 * Identidad Enlace VR ("Uno ve. El equipo sabe."): negro, azul marino, gris y blanco,
 * con un solo acento azul hielo (#5AA9FF). Verde y rojo solo para correcto o incorrecto.
 * Letras: Space Grotesk (títulos y texto) e IBM Plex Mono (números, bits y direcciones).
 *
 * - lienzo: panel donde se dibuja texto (canvas), para que los acentos se vean bien en el visor
 * - boton: botón que se apunta con el láser del control o con el mouse
 * - cuadricula: piso de cuadrícula sencillo
 * - ambiente-futurista: cielo oscuro, ciudad con luces azules, anillos y partículas de datos
 * - ambiente-circuito: dentro de la computadora (circuitos, chips, pulsos de datos)
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

/** Fondo futurista: cielo con estrellas, ciudad de neón, anillos flotantes y partículas de datos.
 *  Todo se genera con código (sin imágenes), así carga rápido en el visor. */
AFRAME.registerComponent('ambiente-futurista', {
  init() {
    const azar = azarConSemilla(2026);
    const grupo = new THREE.Group();
    this.el.sceneEl.setAttribute('fog', 'type: exponential; color: #05080F; density: 0.03');

    // cielo: degradado morado-azul, brillo en el horizonte y estrellas
    const cielo = document.createElement('canvas');
    cielo.width = 2048;
    cielo.height = 1024;
    const c = cielo.getContext('2d');
    const degradado = c.createLinearGradient(0, 0, 0, 1024);
    degradado.addColorStop(0, '#030304');
    degradado.addColorStop(0.38, '#070b14');
    degradado.addColorStop(0.49, '#14315c');
    degradado.addColorStop(0.52, '#0b1730');
    degradado.addColorStop(1, '#030304');
    c.fillStyle = degradado;
    c.fillRect(0, 0, 2048, 1024);
    for (let i = 0; i < 900; i++) {
      const y = azar() * 470;
      c.globalAlpha = 0.25 + azar() * 0.75;
      c.fillStyle = azar() < 0.15 ? '#9cc7ff' : '#ffffff';
      c.fillRect(azar() * 2048, y, azar() < 0.1 ? 3 : 2, azar() < 0.1 ? 3 : 2);
    }
    c.globalAlpha = 1;
    const texCielo = new THREE.CanvasTexture(cielo);
    texCielo.colorSpace = THREE.SRGBColorSpace;
    const esfera = new THREE.Mesh(
      new THREE.SphereGeometry(150, 48, 24),
      new THREE.MeshBasicMaterial({ map: texCielo, side: THREE.BackSide, fog: false, depthWrite: false }),
    );
    grupo.add(esfera);

    // piso oscuro con cuadrícula neón y un anillo de luz alrededor del jugador
    const piso = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.MeshBasicMaterial({ color: 0x06080d }));
    piso.rotation.x = -Math.PI / 2;
    grupo.add(piso);
    const rejilla = new THREE.GridHelper(120, 120, 0x5aa9ff, 0x14284a);
    rejilla.position.y = 0.002;
    rejilla.material.transparent = true;
    rejilla.material.opacity = 0.55;
    grupo.add(rejilla);
    const aro = new THREE.Mesh(
      new THREE.RingGeometry(1.9, 1.95, 64),
      new THREE.MeshBasicMaterial({ color: 0x5aa9ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
    );
    aro.rotation.x = -Math.PI / 2;
    aro.position.y = 0.01;
    grupo.add(aro);

    // ventanas iluminadas para los edificios
    const ventanas = document.createElement('canvas');
    ventanas.width = 64;
    ventanas.height = 128;
    const v = ventanas.getContext('2d');
    v.fillStyle = '#0a0d1f';
    v.fillRect(0, 0, 64, 128);
    const tonos = ['#5AA9FF', '#e6e8eb', '#2F6FBF', '#8B95A7'];
    for (let y = 4; y < 128; y += 10) {
      for (let x = 4; x < 64; x += 10) {
        if (azar() < 0.35) {
          v.fillStyle = tonos[Math.floor(azar() * tonos.length)];
          v.globalAlpha = 0.5 + azar() * 0.5;
          v.fillRect(x, y, 5, 6);
        }
      }
    }
    v.globalAlpha = 1;
    const texVentanas = new THREE.CanvasTexture(ventanas);
    texVentanas.colorSpace = THREE.SRGBColorSpace;
    texVentanas.wrapS = THREE.RepeatWrapping;
    texVentanas.wrapT = THREE.RepeatWrapping;

    // ciudad: edificios en círculo, lejos del jugador
    for (let i = 0; i < 70; i++) {
      const angulo = azar() * Math.PI * 2;
      const radio = 20 + azar() * 28;
      const ancho = 2 + azar() * 4;
      const alto = 4 + Math.pow(azar(), 1.6) * 26;
      const tex = texVentanas.clone();
      tex.repeat.set(Math.max(1, Math.round(ancho / 2)), Math.max(1, Math.round(alto / 4)));
      tex.needsUpdate = true;
      const edificio = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, ancho), new THREE.MeshBasicMaterial({ map: tex }));
      edificio.position.set(Math.cos(angulo) * radio, alto / 2, Math.sin(angulo) * radio);
      edificio.rotation.y = azar() * Math.PI;
      grupo.add(edificio);
      if (azar() < 0.4) {
        const techo = new THREE.Mesh(
          new THREE.BoxGeometry(ancho * 1.02, 0.15, ancho * 1.02),
          new THREE.MeshBasicMaterial({ color: azar() < 0.5 ? 0x5aa9ff : 0xe6e8eb }),
        );
        techo.position.set(edificio.position.x, alto, edificio.position.z);
        techo.rotation.y = edificio.rotation.y;
        grupo.add(techo);
      }
    }

    // anillos holográficos flotando al fondo
    this.anillos = [];
    [[3.2, 0x5aa9ff], [4.4, 0xe6e8eb], [5.6, 0x2f6fbf]].forEach(([radio, color], i) => {
      const anillo = new THREE.Mesh(
        new THREE.TorusGeometry(radio, 0.025, 8, 96),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 }),
      );
      anillo.position.set(0, 4.8, -9);
      anillo.rotation.x = Math.PI / 2.4 + i * 0.25;
      grupo.add(anillo);
      this.anillos.push(anillo);
    });

    // partículas de datos que suben
    const total = 500;
    const posiciones = new Float32Array(total * 3);
    for (let i = 0; i < total; i++) {
      const angulo = azar() * Math.PI * 2;
      const radio = 5 + azar() * 18;
      posiciones[i * 3] = Math.cos(angulo) * radio;
      posiciones[i * 3 + 1] = azar() * 14;
      posiciones[i * 3 + 2] = Math.sin(angulo) * radio;
    }
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
    this.particulas = new THREE.Points(geometria, new THREE.PointsMaterial({ color: 0x5aa9ff, size: 0.07, transparent: true, opacity: 0.8 }));
    grupo.add(this.particulas);

    this.el.setObject3D('ambiente', grupo);
  },
  tick(t, dt) {
    if (!this.particulas) return;
    const segundos = Math.min(dt || 16, 50) / 1000;
    this.anillos.forEach((anillo, i) => { anillo.rotation.z += segundos * (0.15 + i * 0.07) * (i % 2 ? -1 : 1); });
    const pos = this.particulas.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + segundos * (0.4 + (i % 7) * 0.08);
      if (y > 14) y = 0;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  },
});

/** Fondo "dentro de la computadora": piso de circuitos que brillan, chips, capacitores y disipadores
 *  gigantes alrededor, buses de datos en el techo y pulsos de datos corriendo por las pistas. */
AFRAME.registerComponent('ambiente-circuito', {
  init() {
    const azar = azarConSemilla(1971);
    const grupo = new THREE.Group();
    this.el.sceneEl.setAttribute('fog', 'type: exponential; color: #06080D; density: 0.045');

    // piso: tarjeta de circuitos dibujada en un lienzo y repetida
    const lienzo = document.createElement('canvas');
    lienzo.width = 1024;
    lienzo.height = 1024;
    const c = lienzo.getContext('2d');
    c.fillStyle = '#070b13';
    c.fillRect(0, 0, 1024, 1024);
    const paso = 32;
    for (let i = 0; i < 70; i++) {
      let x = Math.floor(azar() * 32) * paso;
      let y = Math.floor(azar() * 32) * paso;
      c.strokeStyle = azar() < 0.8 ? 'rgba(90, 169, 255, 0.55)' : 'rgba(230, 232, 235, 0.35)';
      c.lineWidth = azar() < 0.3 ? 5 : 3;
      c.beginPath();
      c.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        if (azar() < 0.5) x += (Math.floor(azar() * 6) - 3) * paso; else y += (Math.floor(azar() * 6) - 3) * paso;
        c.lineTo(x, y);
      }
      c.stroke();
      c.fillStyle = c.strokeStyle;
      c.beginPath();
      c.arc(x, y, 6, 0, Math.PI * 2);
      c.fill();
    }
    for (let i = 0; i < 6; i++) {
      c.strokeStyle = 'rgba(90, 169, 255, 0.3)';
      c.lineWidth = 2;
      c.strokeRect(Math.floor(azar() * 28) * paso, Math.floor(azar() * 28) * paso, 4 * paso, 3 * paso);
    }
    const texPiso = new THREE.CanvasTexture(lienzo);
    texPiso.colorSpace = THREE.SRGBColorSpace;
    texPiso.wrapS = THREE.RepeatWrapping;
    texPiso.wrapT = THREE.RepeatWrapping;
    texPiso.repeat.set(10, 10);
    texPiso.anisotropy = 8;
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ map: texPiso }));
    piso.rotation.x = -Math.PI / 2;
    grupo.add(piso);
    const aro = new THREE.Mesh(new THREE.RingGeometry(1.9, 1.95, 64), new THREE.MeshBasicMaterial({ color: 0x5aa9ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    aro.rotation.x = -Math.PI / 2;
    aro.position.y = 0.01;
    grupo.add(aro);

    // chips, capacitores y disipadores gigantes alrededor
    const chipMat = new THREE.MeshStandardMaterial({ color: 0x0c1628, metalness: 0.6, roughness: 0.4 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x8a96b0, metalness: 0.9, roughness: 0.3 });
    const lineaCian = new THREE.LineBasicMaterial({ color: 0x5aa9ff });
    for (let i = 0; i < 34; i++) {
      const angulo = azar() * Math.PI * 2;
      const radio = 5 + azar() * 16;
      const x = Math.cos(angulo) * radio;
      const z = Math.sin(angulo) * radio;
      const tipo = azar();
      if (tipo < 0.45) {
        const ancho = 1.2 + azar() * 2.5;
        const alto = 0.3 + azar() * 1.2;
        const caja = new THREE.BoxGeometry(ancho, alto, ancho);
        const chip = new THREE.Mesh(caja, chipMat);
        chip.position.set(x, alto / 2, z);
        chip.rotation.y = azar() * Math.PI;
        const orilla = new THREE.LineSegments(new THREE.EdgesGeometry(caja), lineaCian);
        orilla.position.copy(chip.position);
        orilla.rotation.copy(chip.rotation);
        grupo.add(chip, orilla);
      } else if (tipo < 0.75) {
        const r = 0.3 + azar() * 0.4;
        const h = 0.8 + azar() * 1.6;
        const capacitor = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), new THREE.MeshStandardMaterial({ color: 0x1c1c22, metalness: 0.5, roughness: 0.4 }));
        capacitor.position.set(x, h / 2, z);
        const tapa = new THREE.Mesh(new THREE.TorusGeometry(r * 0.8, 0.03, 8, 24), new THREE.MeshBasicMaterial({ color: azar() < 0.5 ? 0x5aa9ff : 0xe6e8eb }));
        tapa.rotation.x = Math.PI / 2;
        tapa.position.set(x, h + 0.01, z);
        grupo.add(capacitor, tapa);
      } else {
        const disipador = new THREE.Group();
        const aletas = 8 + Math.floor(azar() * 6);
        const alto = 1 + azar() * 2;
        for (let a = 0; a < aletas; a++) {
          const aleta = new THREE.Mesh(new THREE.BoxGeometry(0.06, alto, 1.6), metalMat);
          aleta.position.set(a * 0.18, alto / 2, 0);
          disipador.add(aleta);
        }
        disipador.position.set(x, 0, z);
        disipador.rotation.y = azar() * Math.PI;
        grupo.add(disipador);
      }
    }

    // buses de datos en el "techo"
    for (let i = 0; i < 10; i++) {
      const bus = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 70), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x5aa9ff : 0xe6e8eb, transparent: true, opacity: 0.55 }));
      bus.position.set(-9 + i * 2, 7 + (i % 3) * 0.6, 0);
      bus.rotation.y = 0.2;
      grupo.add(bus);
    }

    // pulsos de datos que corren por el piso (en X o en Z)
    const total = 160;
    const pos = new Float32Array(total * 3);
    this.ejes = [];
    for (let i = 0; i < total; i++) {
      pos[i * 3] = (azar() - 0.5) * 40;
      pos[i * 3 + 1] = 0.05;
      pos[i * 3 + 2] = (azar() - 0.5) * 40;
      this.ejes.push(azar() < 0.5 ? 0 : 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.pulsos = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x8fc3ff, size: 0.14, transparent: true, opacity: 0.95 }));
    grupo.add(this.pulsos);

    // datos que suben a lo lejos
    const lluvia = 400;
    const p2 = new Float32Array(lluvia * 3);
    for (let i = 0; i < lluvia; i++) {
      const angulo = azar() * Math.PI * 2;
      const radio = 6 + azar() * 18;
      p2[i * 3] = Math.cos(angulo) * radio;
      p2[i * 3 + 1] = azar() * 10;
      p2[i * 3 + 2] = Math.sin(angulo) * radio;
    }
    const geo2 = new THREE.BufferGeometry();
    geo2.setAttribute('position', new THREE.BufferAttribute(p2, 3));
    this.lluvia = new THREE.Points(geo2, new THREE.PointsMaterial({ color: 0x8f9299, size: 0.05, transparent: true, opacity: 0.7 }));
    grupo.add(this.lluvia);

    this.el.setObject3D('ambiente', grupo);
  },
  tick(t, dt) {
    if (!this.pulsos) return;
    const s = Math.min(dt || 16, 50) / 1000;
    const pos = this.pulsos.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const eje = this.ejes[i];
      let v = (eje === 0 ? pos.getX(i) : pos.getZ(i)) + s * (2 + (i % 4));
      if (v > 20) v = -20;
      if (eje === 0) pos.setX(i, v); else pos.setZ(i, v);
    }
    pos.needsUpdate = true;
    const lluvia = this.lluvia.geometry.attributes.position;
    for (let i = 0; i < lluvia.count; i++) {
      let y = lluvia.getY(i) + s * (0.5 + (i % 5) * 0.1);
      if (y > 10) y = 0;
      lluvia.setY(i, y);
    }
    lluvia.needsUpdate = true;
  },
});

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
