/* VR ITC Games · piezas comunes de todos los minijuegos
 *
 * Estilo visual del evento CODEXIA: fondo casi negro, rojo #ff1638, plata,
 * esquinas cortadas y letras Orbitron (títulos) y Rajdhani (texto).
 *
 * - lienzo: panel donde se dibuja texto (canvas), para que los acentos se vean bien en el visor
 * - boton: botón que se apunta con el láser del control o con el mouse
 * - cuadricula: piso de cuadrícula sencillo
 * - ambiente-futurista: cielo oscuro, ciudad con luces rojas, anillos y partículas de datos
 * - ambiente-circuito: dentro de la computadora (circuitos, chips, pulsos de datos)
 * - sonido: pitidos generados por el navegador (sin archivos)
 */
/* global AFRAME, THREE */

const PIXELES_POR_METRO = 1000;

// paleta de CODEXIA
const COLOR = {
  panel: '#0d0d10',
  borde: '#ad001d',
  texto: '#e6e8eb',
  tenue: '#8f9299',
  acento: '#ff1638',
  magenta: '#ff1638',
  bien: '#2fd27a',
  mal: '#ff2d4d',
  tecla: '#16161b',
  teclaEncima: '#2a0d14',
  principal: '#c8102e',
  principalEncima: '#ff1638',
};

const LETRA = 'Rajdhani, "Segoe UI", Roboto, system-ui, sans-serif';
const TITULO = 'Orbitron, Rajdhani, "Segoe UI", sans-serif';
const MONO = 'Consolas, "Roboto Mono", "Courier New", monospace';

// ---------- utilidades de dibujo ----------

/** Rectángulo con las esquinas superior derecha e inferior izquierda cortadas (estilo CODEXIA).
 *  Se llama "redondo" por compatibilidad con el código de los juegos. */
function rectRedondo(ctx, x, y, w, h, r) {
  const c = Math.min(r * 1.1, w / 4, h / 3);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w - c, y);
  ctx.lineTo(x + w, y + c);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + c, y + h);
  ctx.lineTo(x, y + h - c);
  ctx.closePath();
}

/** Escribe texto. Las letras gruesas (peso 700 o más) usan Orbitron, como los títulos del evento.
 *  Si el texto no cabe en el lienzo, se achica solo. */
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

/** Fondo de panel: oscuro, borde fino y una marca roja en la esquina cortada. */
function fondoPanel(ctx, w, h, color = COLOR.panel) {
  rectRedondo(ctx, 4, 4, w - 8, h - 8, 24);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.stroke();
  const c = Math.min(24 * 1.1, (w - 8) / 4, (h - 8) / 3);
  ctx.beginPath();
  ctx.moveTo(w - 4 - c, 4);
  ctx.lineTo(w - 4, 4 + c);
  ctx.lineWidth = 5;
  ctx.strokeStyle = COLOR.acento;
  ctx.stroke();
}

/** Cuando terminan de cargar las letras del evento, redibuja todos los paneles y botones. */
if (document.fonts && document.fonts.load) {
  Promise.all([
    document.fonts.load('700 40px Orbitron'), document.fonts.load('800 40px Orbitron'),
    document.fonts.load('400 40px Rajdhani'), document.fonts.load('600 40px Rajdhani'),
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
  canvas.width = Math.min(2048, Math.round(ancho * PIXELES_POR_METRO));
  canvas.height = Math.min(2048, Math.round(alto * PIXELES_POR_METRO));
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
      casilla: ['rgba(36, 36, 42, 0.62)', 'rgba(173, 0, 29, 0.8)'],
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
    if (d.elegido) colorTexto = '#050506';
    else if (d.estilo === 'casilla') colorTexto = 'rgba(230,232,235,.5)';
    texto(ctx, d.texto, w / 2, h / 2 + tam * 0.04, { tam, peso: 600, alinear: 'center', color: colorTexto });
    ctx.globalAlpha = 1;
    this.textura.needsUpdate = true;
  },
});

/** Piso de cuadrícula estilo neón (sencillo). */
AFRAME.registerComponent('cuadricula', {
  init() {
    this.el.setObject3D('rejilla', new THREE.GridHelper(40, 40, 0xff1638, 0x2a1016));
  },
});

/** Fondo futurista: cielo con estrellas, ciudad de neón, anillos flotantes y partículas de datos.
 *  Todo se genera con código (sin imágenes), así carga rápido en el visor. */
AFRAME.registerComponent('ambiente-futurista', {
  init() {
    const azar = azarConSemilla(2026);
    const grupo = new THREE.Group();
    this.el.sceneEl.setAttribute('fog', 'type: exponential; color: #0a0507; density: 0.03');

    // cielo: degradado morado-azul, brillo en el horizonte y estrellas
    const cielo = document.createElement('canvas');
    cielo.width = 2048;
    cielo.height = 1024;
    const c = cielo.getContext('2d');
    const degradado = c.createLinearGradient(0, 0, 0, 1024);
    degradado.addColorStop(0, '#030304');
    degradado.addColorStop(0.38, '#0b0709');
    degradado.addColorStop(0.49, '#4a0a14');
    degradado.addColorStop(0.52, '#1a0b0e');
    degradado.addColorStop(1, '#030304');
    c.fillStyle = degradado;
    c.fillRect(0, 0, 2048, 1024);
    for (let i = 0; i < 900; i++) {
      const y = azar() * 470;
      c.globalAlpha = 0.25 + azar() * 0.75;
      c.fillStyle = azar() < 0.15 ? '#ff8090' : '#ffffff';
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
    const piso = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.MeshBasicMaterial({ color: 0x050506 }));
    piso.rotation.x = -Math.PI / 2;
    grupo.add(piso);
    const rejilla = new THREE.GridHelper(120, 120, 0xff1638, 0x2a1016);
    rejilla.position.y = 0.002;
    rejilla.material.transparent = true;
    rejilla.material.opacity = 0.55;
    grupo.add(rejilla);
    const aro = new THREE.Mesh(
      new THREE.RingGeometry(1.9, 1.95, 64),
      new THREE.MeshBasicMaterial({ color: 0xff1638, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
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
    const tonos = ['#ff1638', '#e6e8eb', '#ad001d', '#8f9299'];
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
          new THREE.MeshBasicMaterial({ color: azar() < 0.5 ? 0xff1638 : 0xe6e8eb }),
        );
        techo.position.set(edificio.position.x, alto, edificio.position.z);
        techo.rotation.y = edificio.rotation.y;
        grupo.add(techo);
      }
    }

    // anillos holográficos flotando al fondo
    this.anillos = [];
    [[3.2, 0xff1638], [4.4, 0xe6e8eb], [5.6, 0xad001d]].forEach(([radio, color], i) => {
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
    this.particulas = new THREE.Points(geometria, new THREE.PointsMaterial({ color: 0xff1638, size: 0.07, transparent: true, opacity: 0.8 }));
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
    this.el.sceneEl.setAttribute('fog', 'type: exponential; color: #050506; density: 0.045');

    // piso: tarjeta de circuitos dibujada en un lienzo y repetida
    const lienzo = document.createElement('canvas');
    lienzo.width = 1024;
    lienzo.height = 1024;
    const c = lienzo.getContext('2d');
    c.fillStyle = '#08080a';
    c.fillRect(0, 0, 1024, 1024);
    const paso = 32;
    for (let i = 0; i < 70; i++) {
      let x = Math.floor(azar() * 32) * paso;
      let y = Math.floor(azar() * 32) * paso;
      c.strokeStyle = azar() < 0.8 ? 'rgba(255, 22, 56, 0.55)' : 'rgba(230, 232, 235, 0.35)';
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
      c.strokeStyle = 'rgba(255, 22, 56, 0.3)';
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
    const aro = new THREE.Mesh(new THREE.RingGeometry(1.9, 1.95, 64), new THREE.MeshBasicMaterial({ color: 0xff1638, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    aro.rotation.x = -Math.PI / 2;
    aro.position.y = 0.01;
    grupo.add(aro);

    // chips, capacitores y disipadores gigantes alrededor
    const chipMat = new THREE.MeshStandardMaterial({ color: 0x0d0d10, metalness: 0.6, roughness: 0.4 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x8a96b0, metalness: 0.9, roughness: 0.3 });
    const lineaCian = new THREE.LineBasicMaterial({ color: 0xff1638 });
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
        const tapa = new THREE.Mesh(new THREE.TorusGeometry(r * 0.8, 0.03, 8, 24), new THREE.MeshBasicMaterial({ color: azar() < 0.5 ? 0xff1638 : 0xe6e8eb }));
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
      const bus = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 70), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff1638 : 0xe6e8eb, transparent: true, opacity: 0.55 }));
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
    this.pulsos = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xff5a70, size: 0.14, transparent: true, opacity: 0.95 }));
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
  crearEntidad(raiz, { geometry: `primitive: plane; width: ${ancho + 0.04}; height: ${alto + 0.04}`, material: 'shader: flat; color: #ff1638; opacity: 0.55; transparent: true', position: '0 0 -0.012' });
  crearEntidad(raiz, { geometry: `primitive: plane; width: ${ancho}; height: ${alto}`, material: 'shader: flat; color: #050506; opacity: 0.95; transparent: true', position: '0 0 -0.008' });
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
