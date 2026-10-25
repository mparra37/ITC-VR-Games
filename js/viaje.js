/* VR ITC Games · Trailer: viaje al sistema de Ultrón
 *
 * Un recorrido sentado de unos 2 minutos dentro de la computadora tomada por Ultrón:
 *   puerto de red → cable de fibra óptica → router → memoria RAM → CPU (núcleo de Ultrón).
 * Al final, el Operador le dispara a Ultrón con el láser y aparecen sus 6 escudos (uno por reto).
 *
 * Para no marear: el "vehículo" avanza siempre de frente, despacio, sin girar ni subir o bajar,
 * con arranques y frenados suaves. El piso del vehículo se mueve con el jugador (punto de referencia fijo).
 * Todo se construye con código (sin videos ni modelos), así que pesa muy poco.
 */
/* global AFRAME, THREE, COLOR, LETRA, TITULO, MONO, texto, rectRedondo, fondoPanel, pintar, sonido, crearEntidad, refrescarApuntadores, azarConSemilla, irA */

const VIAJE = {
  // tramos del recorrido: de t0 a t1 (segundos) el vehículo va de z0 a z1 (metros)
  tramos: [
    { t0: 0, t1: 9, z0: 0, z1: 0 }, // en la entrada del puerto de red
    { t0: 9, t1: 45, z0: 0, z1: -100 }, // cable de fibra óptica hasta el router
    { t0: 45, t1: 53, z0: -100, z1: -100 }, // el router lee la IP
    { t0: 53, t1: 101, z0: -100, z1: -232 }, // memoria RAM y CPU hasta Ultrón
  ],
  segundosArranque: 3,
  // subtítulos (y voz) que aparecen al pasar por cada punto del camino
  frases: [
    { z: 0.5, etiqueta: 'ALERTA // CODEXIA', texto: 'Ultrón tomó el control de la computadora central. Vas a entrar a su sistema como un paquete de datos.', voz: 'Alerta. Ultrón tomó el control de la computadora central. Vas a entrar a su sistema como un paquete de datos.' },
    { z: -12, etiqueta: '01 // RED', texto: 'Esto es un cable de fibra óptica: los datos viajan como pulsos de luz, a unos 200 000 km por segundo.', voz: 'Esto es un cable de fibra óptica. Los datos viajan como pulsos de luz, a unos doscientos mil kilómetros por segundo.', efecto: 'soplido' },
    { z: -50, etiqueta: '01 // RED', texto: 'Cada paquete lleva una dirección IP, como 192.168.1.113, para saber a dónde va.', voz: 'Cada paquete lleva una dirección I P, para saber a dónde va.' },
    { z: -99.5, etiqueta: '02 // ROUTER', texto: 'El router lee tu dirección IP y decide el camino. Destino: la memoria RAM.', voz: 'El router lee tu dirección I P y decide el camino. Destino: la memoria RAM.' },
    { z: -113, etiqueta: '03 // MEMORIA RAM', texto: 'En la memoria todo es binario: solo 0 y 1. Lean los bytes de los lados: ¿qué palabra forman?', voz: 'En la memoria todo es binario: solo ceros y unos. Lean los bytes de los lados. ¿Qué palabra forman?', efecto: 'soplido' },
    { z: -170, etiqueta: '03 // MEMORIA RAM', texto: 'U · L · T · R · O · N. La RAM es rápida, pero olvida todo al apagarse. Ultrón está borrando los datos…', voz: 'Ultrón. La RAM es rápida, pero olvida todo al apagarse. Ultrón está borrando los datos.' },
    { z: -195, etiqueta: '04 // CPU', texto: 'El procesador hace miles de millones de operaciones por segundo. Aquí, en el núcleo, se esconde Ultrón.', voz: 'El procesador hace miles de millones de operaciones por segundo. Aquí, en el núcleo, se esconde Ultrón.', efecto: 'soplido' },
  ],
  fraseUltron: { etiqueta: 'ULTRÓN // NÚCLEO CENTRAL', texto: 'Apunta a Ultrón con el control y presiona el gatillo (en la computadora: clic en Ultrón).', voz: 'Apunta a Ultrón y presiona el gatillo.' },
  fraseEscudos: { etiqueta: 'ESCUDOS // 6 CAPAS', texto: 'Un disparo no basta: Ultrón tiene 6 escudos. Solo caen si su equipo supera los 6 retos.', voz: 'Un disparo no basta. Ultrón tiene seis escudos. Solo caen si su equipo supera los seis retos.' },
  // bytes en las paredes de la memoria (ASCII): forman ULTRON
  bytes: [['01010101', 'U'], ['01001100', 'L'], ['01010100', 'T'], ['01010010', 'R'], ['01001111', 'O'], ['01001110', 'N']],
  ips: ['10.0.0.7', '8.8.8.8', '172.16.4.20', '192.168.1.45', '200.94.12.3', '127.0.0.1'],
  portales: [
    { nombre: 'SALÓN', x: -6.5, y: 5.4 }, { nombre: 'BIBLIOTECA', x: 6.5, y: 5.4 },
    { nombre: 'INTERNET', x: -7.5, y: 0.6 }, { nombre: 'SERVIDORES', x: 7.5, y: 0.6 }, { nombre: 'SATÉLITE', x: 0, y: 8.2 },
  ],
  zUltron: -248,
  segundosEsperaDisparo: 14,
};

const OJO = 1.2; // altura de los ojos (sentado): el centro del túnel y de todo el recorrido

/** Posición del vehículo en el tiempo t: avanza a velocidad constante, con arranque y frenado suaves. */
function posicionViaje(t) {
  const tramo = VIAJE.tramos.find((s) => t < s.t1) || VIAJE.tramos[VIAJE.tramos.length - 1];
  const dist = tramo.z1 - tramo.z0;
  if (dist === 0) return tramo.z0;
  const D = tramo.t1 - tramo.t0;
  const a = Math.min(VIAJE.segundosArranque, D / 2);
  const u = Math.min(Math.max(t - tramo.t0, 0), D);
  const v = dist / (D - a);
  let s;
  if (u < a) s = 0.5 * (v / a) * u * u;
  else if (u < D - a) s = 0.5 * v * a + v * (u - a);
  else s = dist - 0.5 * (v / a) * (D - u) * (D - u);
  return tramo.z0 + s;
}

/** Texto en varias líneas, centrado en (x, y). */
function parrafo(ctx, str, x, y, maxAncho, { tam = 40, color = COLOR.texto, peso = 500, interlineado = 1.3 } = {}) {
  ctx.font = `${peso} ${tam}px ${LETRA}`;
  const lineas = [];
  let actual = '';
  str.split(' ').forEach((palabra) => {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > maxAncho && actual) {
      lineas.push(actual);
      actual = palabra;
    } else actual = prueba;
  });
  if (actual) lineas.push(actual);
  const alto = tam * interlineado;
  const y0 = y - ((lineas.length - 1) * alto) / 2;
  lineas.forEach((l, i) => texto(ctx, l, x, y0 + i * alto, { tam, color, peso, alinear: 'center', fuente: LETRA }));
}

/** Letrero 3D con un canvas como textura (three.js directo, para que sea ligero). */
function crearLetrero(ancho, alto, dibujo, pxPorMetro = 400) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(2048, Math.round(ancho * pxPorMetro));
  canvas.height = Math.min(2048, Math.round(alto * pxPorMetro));
  const ctx = canvas.getContext('2d');
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: textura, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const malla = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), material);
  malla.userData.dibujo = dibujo;
  malla.userData.redibujar = (fn) => {
    if (fn) malla.userData.dibujo = fn;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    malla.userData.dibujo(ctx, canvas.width, canvas.height);
    textura.needsUpdate = true;
  };
  malla.userData.redibujar();
  return malla;
}

/** Letrero estilo CODEXIA: panel oscuro con esquina cortada y texto. */
function dibujoEtiqueta(titulo, sub, { colorTitulo = COLOR.texto, fondo = 'rgba(13,13,16,.82)' } = {}) {
  return (ctx, w, h) => {
    fondoPanel(ctx, w, h, fondo);
    if (sub) {
      texto(ctx, sub, w / 2, h * 0.3, { tam: h * 0.2, peso: 600, color: COLOR.acento, alinear: 'center', fuente: TITULO });
      texto(ctx, titulo, w / 2, h * 0.64, { tam: h * 0.34, peso: 800, color: colorTitulo, alinear: 'center' });
    } else {
      texto(ctx, titulo, w / 2, h / 2, { tam: h * 0.42, peso: 800, color: colorTitulo, alinear: 'center' });
    }
  };
}

AFRAME.registerComponent('viaje-ultron', {
  init() {
    window.juego = this;
    this.mundo = new THREE.Group();
    this.el.setObject3D('mundo', this.mundo);
    this.jugador = document.getElementById('jugador');
    this.letreros = [];
    this.azar = azarConSemilla(2026);
    this.reloj = 0;
    this.fase = 'inicio';
    this.t = 0;
    this.conVoz = true;
    // las voces del navegador cargan después: se piden desde ahora
    if (window.speechSynthesis) window.speechSynthesis.getVoices();

    const escena = this.el.sceneEl;
    escena.object3D.fog = new THREE.FogExp2(0x050506, 0.022);

    this.construirParticulas();
    this.construirPuerto();
    this.construirCable();
    this.construirRouter();
    this.construirMemoria();
    this.construirCPU();
    this.construirUltron();
    this.construirVehiculo();
    this.construirPaneles();

    escena.addEventListener('boton-presionado', (e) => this.presionar(e.detail.accion, e.detail.valor));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.fase === 'inicio') this.empezar(false);
      if (e.key === ' ' && this.fase === 'ultron') this.disparar();
    });
    // cuando cargan las letras del evento, se redibujan los letreros
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.letreros.forEach((l) => l.userData.redibujar()));
    this.mostrar('inicio');
  },

  agregarLetrero(ancho, alto, dibujo, x, y, z, padre = this.mundo, px) {
    const l = crearLetrero(ancho, alto, dibujo, px);
    l.position.set(x, y, z);
    padre.add(l);
    this.letreros.push(l);
    return l;
  },

  // ---------- el mundo ----------

  construirParticulas() {
    const n = 900;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const rojo = new THREE.Color(0xff1638);
    const plata = new THREE.Color(0xe6e8eb);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (this.azar() - 0.5) * 80;
      pos[i * 3 + 1] = -10 + this.azar() * 35;
      pos[i * 3 + 2] = 10 - this.azar() * 280;
      const c = this.azar() < 0.6 ? rojo : plata;
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.mundo.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.75, depthWrite: false })));
    // piso de cuadrícula muy abajo: da una referencia del suelo (ayuda a no marearse)
    const piso = new THREE.GridHelper(420, 140, 0x5a0d1b, 0x22090f);
    piso.position.set(0, -2.6, -130);
    piso.material.transparent = true;
    piso.material.opacity = 0.55;
    this.mundo.add(piso);
  },

  construirPuerto() {
    const z = -14;
    const marco = new THREE.Mesh(new THREE.RingGeometry(3.3, 6, 6, 1), new THREE.MeshBasicMaterial({ color: 0x121216 }));
    marco.position.set(0, OJO, z);
    marco.rotation.z = Math.PI / 6;
    this.mundo.add(marco);
    [3.35, 6].forEach((r, i) => {
      const borde = new THREE.Mesh(new THREE.TorusGeometry(r, i ? 0.05 : 0.09, 6, i ? 6 : 64), new THREE.MeshBasicMaterial({ color: i ? 0xe6e8eb : 0xff1638 }));
      borde.position.set(0, OJO, z + 0.02);
      if (i) borde.rotation.z = Math.PI / 6;
      this.mundo.add(borde);
    });
    this.agregarLetrero(5.2, 1.0, dibujoEtiqueta('SISTEMA TOMADO POR ULTRÓN', 'PUERTO DE RED // ACCESO', { colorTitulo: COLOR.texto }), 0, OJO + 6.4, z + 0.1);
    this.agregarLetrero(2.6, 0.5, dibujoEtiqueta('192.168.1.113', 'TU PAQUETE'), -4.6, OJO - 3.6, z + 0.1);
  },

  construirCable() {
    const z0 = -14;
    const z1 = -86;
    const largo = z0 - z1;
    this.zCable = [z1, z0];
    const tubo = new THREE.Mesh(
      new THREE.CylinderGeometry(3.3, 3.3, largo, 40, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x0b0b0f, side: THREE.BackSide }),
    );
    tubo.rotation.x = Math.PI / 2;
    tubo.position.set(0, OJO, (z0 + z1) / 2);
    this.mundo.add(tubo);

    // anillos del cable
    const nAnillos = 18;
    const anillos = new THREE.InstancedMesh(new THREE.TorusGeometry(3.22, 0.03, 6, 56), new THREE.MeshBasicMaterial({ color: 0xffffff }), nAnillos);
    const m = new THREE.Object3D();
    for (let i = 0; i < nAnillos; i++) {
      m.position.set(0, OJO, z0 - 2 - i * 4);
      m.updateMatrix();
      anillos.setMatrixAt(i, m.matrix);
      anillos.setColorAt(i, new THREE.Color(i % 3 === 2 ? 0x8f9299 : 0xff1638));
    }
    this.mundo.add(anillos);

    // hilos de fibra a lo largo del cable
    const hilos = [];
    for (let i = 0; i < 56; i++) {
      const ang = (i / 56) * Math.PI * 2;
      const r = 2.85 + (i % 3) * 0.12;
      const x = Math.cos(ang) * r;
      const y = OJO + Math.sin(ang) * r;
      hilos.push(x, y, z0, x, y, z1);
    }
    const geoHilos = new THREE.BufferGeometry();
    geoHilos.setAttribute('position', new THREE.Float32BufferAttribute(hilos, 3));
    this.mundo.add(new THREE.LineSegments(geoHilos, new THREE.LineBasicMaterial({ color: 0x5a0d1b })));

    // pulsos de luz que corren por la fibra (más rápido que el vehículo)
    const n = 170;
    this.pulsos = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 0.035, 1.8), new THREE.MeshBasicMaterial({ color: 0xffffff }), n);
    this.datosPulsos = [];
    for (let i = 0; i < n; i++) {
      const p = { ang: this.azar() * Math.PI * 2, r: 2.3 + this.azar() * 0.8, z: z0 - this.azar() * largo, v: 16 + this.azar() * 14 };
      this.datosPulsos.push(p);
      this.pulsos.setColorAt(i, new THREE.Color(this.azar() < 0.65 ? 0xff1638 : 0xe6e8eb));
    }
    this.mundo.add(this.pulsos);
    this.moverPulsos(0);

    // otros paquetes de datos que viajan por el cable (los rebasamos)
    this.paquetes = VIAJE.ips.map((ip, i) => {
      const g = new THREE.Group();
      const cubo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(cubo), new THREE.LineBasicMaterial({ color: i % 2 ? 0xe6e8eb : 0xff1638 })));
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x8f9299 : 0xad001d })));
      this.agregarLetrero(1.3, 0.26, dibujoEtiqueta(ip), 0, 0.55, 0, g);
      const datos = { g, x: i % 2 ? 1.5 : -1.5, y: OJO + (i % 3 - 1) * 0.7, z0: -24 - i * 9, v: 1.1 };
      g.position.set(datos.x, datos.y, datos.z0);
      this.mundo.add(g);
      return datos;
    });
  },

  moverPulsos(dts) {
    const m = new THREE.Object3D();
    const [zMin, zMax] = this.zCable;
    this.datosPulsos.forEach((p, i) => {
      p.z -= p.v * dts;
      if (p.z < zMin) p.z += zMax - zMin;
      m.position.set(Math.cos(p.ang) * p.r, OJO + Math.sin(p.ang) * p.r, p.z);
      m.updateMatrix();
      this.pulsos.setMatrixAt(i, m.matrix);
    });
    this.pulsos.instanceMatrix.needsUpdate = true;
  },

  construirRouter() {
    const zc = -100;
    // sala esférica de líneas (sin las líneas que tapan la entrada y la salida)
    const ico = new THREE.IcosahedronGeometry(16, 2);
    ico.rotateY(0.35);
    ico.rotateX(0.2);
    const bordes = new THREE.EdgesGeometry(ico).attributes.position.array;
    const quedan = [];
    for (let i = 0; i < bordes.length; i += 6) {
      const tapa = [0, 3].some((k) => Math.hypot(bordes[i + k], bordes[i + k + 1]) < 6.5 && Math.abs(bordes[i + k + 2]) > 9);
      if (!tapa) for (let k = 0; k < 6; k++) quedan.push(bordes[i + k]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(quedan, 3));
    const sala = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xff1638, transparent: true, opacity: 0.35 }));
    sala.position.set(0, OJO, zc);
    this.mundo.add(sala);

    // hexágono que gira debajo del vehículo
    this.hexRouter = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.06, 4, 6), new THREE.MeshBasicMaterial({ color: 0xe6e8eb }));
    this.hexRouter.rotation.x = Math.PI / 2;
    this.hexRouter.position.set(0, -1.4, zc);
    this.mundo.add(this.hexRouter);
    this.agregarLetrero(3.4, 0.6, dibujoEtiqueta('ROUTER', 'NODO 02'), 0, -0.4, zc - 4);

    // anillo que "lee" el paquete (baja sobre el vehículo durante la parada)
    this.escaner = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.025, 6, 64), new THREE.MeshBasicMaterial({ color: 0xff1638, transparent: true, opacity: 0 }));
    this.escaner.rotation.x = Math.PI / 2;
    this.escaner.position.set(0, OJO + 1.2, zc);
    this.mundo.add(this.escaner);

    // portales a otros destinos y el portal de la memoria RAM, de frente
    const crearPortal = (nombre, x, y, z, r, principal) => {
      const anillo = new THREE.Mesh(new THREE.TorusGeometry(r, principal ? 0.1 : 0.07, 8, 64), new THREE.MeshBasicMaterial({ color: principal ? 0xff1638 : 0x8f9299 }));
      const disco = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshBasicMaterial({ color: 0xff1638, transparent: true, opacity: principal ? 0.12 : 0.06, depthWrite: false, blending: THREE.AdditiveBlending }));
      anillo.position.set(x, y, z);
      disco.position.set(x, y, z - 0.01);
      this.mundo.add(anillo, disco);
      const etiqueta = this.agregarLetrero(principal ? 3.2 : 2.4, principal ? 0.55 : 0.42, dibujoEtiqueta(nombre), x, y + r + 0.6, z);
      return { anillo, disco, etiqueta, nombre };
    };
    VIAJE.portales.forEach((p) => crearPortal(p.nombre, p.x, OJO + p.y - 1.2, zc - 7, 1.25, false));
    this.portalRAM = crearPortal('MEMORIA RAM', 0, OJO, -114, 2.6, true);
  },

  construirMemoria() {
    const z0 = -116;
    this.zMemoria = [-186, z0];
    const porLado = 8;
    const largoModulo = 8.4;
    const tarjetas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 4, largoModulo), new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.6, metalness: 0.3 }), porLado * 2);
    const contactos = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.28, largoModulo - 0.4), new THREE.MeshBasicMaterial({ color: 0xc9a227 }), porLado * 2);
    // chips con bits que cambian (una sola textura para todos)
    this.lienzoBits = document.createElement('canvas');
    this.lienzoBits.width = 256;
    this.lienzoBits.height = 256;
    this.texturaBits = new THREE.CanvasTexture(this.lienzoBits);
    this.texturaBits.colorSpace = THREE.SRGBColorSpace;
    this.dibujarBits();
    const nChips = porLado * 2 * 16;
    this.chips = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.88, 0.8), new THREE.MeshBasicMaterial({ map: this.texturaBits }), nChips);
    const m = new THREE.Object3D();
    let c = 0;
    for (let lado = -1; lado <= 1; lado += 2) {
      for (let i = 0; i < porLado; i++) {
        const k = (lado < 0 ? 0 : porLado) + i;
        const zc = z0 - 4.5 - i * 9;
        const x = lado * 4.3;
        m.rotation.set(0, 0, 0);
        m.position.set(x, OJO - 0.2, zc);
        m.updateMatrix();
        tarjetas.setMatrixAt(k, m.matrix);
        m.position.set(x, OJO - 2.15, zc);
        m.updateMatrix();
        contactos.setMatrixAt(k, m.matrix);
        for (let fila = 0; fila < 2; fila++) {
          for (let j = 0; j < 8; j++) {
            m.position.set(x - lado * 0.05, OJO + 0.65 - fila * 1.05, zc - 3.6 + j * 1.03);
            m.rotation.set(0, lado > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
            m.updateMatrix();
            this.chips.setMatrixAt(c, m.matrix);
            this.chips.setColorAt(c, new THREE.Color(0xe6e8eb));
            c++;
          }
        }
      }
    }
    this.mundo.add(tarjetas, contactos, this.chips);

    // líneas del bus de datos en el techo
    const bus = [];
    for (let i = 0; i < 9; i++) {
      const x = -3 + i * 0.75;
      bus.push(x, OJO + 3.6, z0, x, OJO + 3.6, this.zMemoria[0]);
    }
    const geoBus = new THREE.BufferGeometry();
    geoBus.setAttribute('position', new THREE.Float32BufferAttribute(bus, 3));
    this.bus = new THREE.LineSegments(geoBus, new THREE.LineBasicMaterial({ color: 0xff1638, transparent: true, opacity: 0.6 }));
    this.mundo.add(this.bus);

    // los bytes que forman ULTRON
    this.bytes = VIAJE.bytes.map(([bits, letra], i) => {
      const lado = i % 2 ? 1 : -1;
      const z = -124 - i * 9;
      const dibujo = (revelado) => (ctx, w, h) => {
        fondoPanel(ctx, w, h, 'rgba(13,13,16,.9)');
        texto(ctx, `BYTE ${i + 1}`, w * 0.08, h * 0.2, { tam: h * 0.13, peso: 700, color: COLOR.acento });
        texto(ctx, bits, w * 0.08, h * 0.56, { tam: h * 0.3, peso: 700, color: COLOR.texto, fuente: MONO });
        texto(ctx, revelado ? `= ${letra}` : '= ?', w * 0.92, h * 0.56, { tam: h * 0.42, peso: 900, color: revelado ? COLOR.acento : COLOR.tenue, alinear: 'right' });
      };
      const l = this.agregarLetrero(2.4, 0.8, dibujo(false), lado * 2.5, OJO + 1.2, z);
      l.rotation.y = -lado * 0.45;
      return { l, z, dibujo, revelado: false };
    });
  },

  dibujarBits() {
    const ctx = this.lienzoBits.getContext('2d');
    const w = this.lienzoBits.width;
    ctx.fillStyle = '#0b0b0e';
    ctx.fillRect(0, 0, w, w);
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, w - 6);
    ctx.font = `700 26px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let f = 0; f < 7; f++) {
      for (let c = 0; c < 8; c++) {
        const uno = Math.random() < 0.5;
        ctx.fillStyle = uno ? '#ffffff' : '#77797f';
        ctx.fillText(uno ? '1' : '0', 22 + c * 30.5, 30 + f * 33);
      }
    }
    this.texturaBits.needsUpdate = true;
  },

  construirCPU() {
    const zc = -228;
    // la pastilla del procesador como piso
    const lienzo = document.createElement('canvas');
    lienzo.width = 1024;
    lienzo.height = 1400;
    const ctx = lienzo.getContext('2d');
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, 1024, 1400);
    const az = azarConSemilla(7);
    ctx.strokeStyle = 'rgba(255,22,56,.35)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 140; i++) {
      let x = az() * 1024;
      let y = az() * 1400;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        if (s % 2) y += (az() - 0.5) * 260; else x += (az() - 0.5) * 260;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let n = 0; n < 8; n++) {
      const x = n % 2 ? 640 : 84;
      const y = 120 + Math.floor(n / 2) * 300;
      ctx.fillStyle = 'rgba(18,18,22,.95)';
      ctx.fillRect(x, y, 300, 240);
      ctx.strokeStyle = 'rgba(230,232,235,.45)';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, 300, 240);
      ctx.fillStyle = '#ff1638';
      ctx.font = `700 34px ${TITULO}`;
      ctx.fillText(`NÚCLEO ${n + 1}`, x + 22, y + 52);
    }
    ctx.fillStyle = 'rgba(255,22,56,.12)';
    ctx.fillRect(420, 80, 184, 1240);
    ctx.save();
    ctx.translate(512, 700);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(230,232,235,.5)';
    ctx.font = `700 64px ${TITULO}`;
    ctx.textAlign = 'center';
    ctx.fillText('CACHÉ L3', 0, 22);
    ctx.restore();
    const tex = new THREE.CanvasTexture(lienzo);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const pastilla = new THREE.Mesh(new THREE.PlaneGeometry(44, 60), new THREE.MeshBasicMaterial({ map: tex }));
    pastilla.rotation.x = -Math.PI / 2;
    pastilla.position.set(0, -2.4, zc);
    this.mundo.add(pastilla);

    // torres de los núcleos y líneas de datos hacia Ultrón
    const caja = new THREE.BoxGeometry(1.4, 7, 1.4);
    const bordesCaja = new THREE.EdgesGeometry(caja);
    const matCaja = new THREE.MeshStandardMaterial({ color: 0x101014, roughness: 0.5, metalness: 0.4 });
    const matBorde = new THREE.LineBasicMaterial({ color: 0xff1638 });
    const datos = [];
    [-196, -208, -220, -232].forEach((z, i) => {
      [-1, 1].forEach((lado) => {
        const x = lado * 7.5;
        const torre = new THREE.Mesh(caja, matCaja);
        torre.position.set(x, 1.1, z);
        const borde = new THREE.LineSegments(bordesCaja, i % 2 ? new THREE.LineBasicMaterial({ color: 0xe6e8eb }) : matBorde);
        borde.position.copy(torre.position);
        this.mundo.add(torre, borde);
        datos.push(x, 4.6, z, 0, OJO + 0.4, VIAJE.zUltron);
      });
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(datos, 3));
    this.lineasDatos = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xff1638, transparent: true, opacity: 0.4 }));
    this.mundo.add(this.lineasDatos);
  },

  construirUltron() {
    const z = VIAJE.zUltron;
    const y = OJO + 0.4;
    this.ultron = new THREE.Group();
    this.ultron.position.set(0, y, z);
    this.mundo.add(this.ultron);
    this.ultron.add(new THREE.Mesh(new THREE.SphereGeometry(2, 48, 32), new THREE.MeshStandardMaterial({ color: 0x1a1a1f, metalness: 0.7, roughness: 0.3 })));
    // placas del casco
    const placas = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.03, 1)), new THREE.LineBasicMaterial({ color: 0x8f9299, transparent: true, opacity: 0.5 }));
    this.ultron.add(placas);
    // el ojo
    this.materialOjo = new THREE.MeshBasicMaterial({ color: 0xff1638 });
    const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 24), this.materialOjo);
    ojo.position.z = 1.45;
    this.ultron.add(ojo);
    const pupila = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 8, 48), new THREE.MeshBasicMaterial({ color: 0x050506 }));
    pupila.position.z = 2.15;
    this.ultron.add(pupila);
    // brillo
    const lienzo = document.createElement('canvas');
    lienzo.width = lienzo.height = 256;
    const c = lienzo.getContext('2d');
    const grad = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,60,90,.9)');
    grad.addColorStop(0.35, 'rgba(255,22,56,.35)');
    grad.addColorStop(1, 'rgba(255,22,56,0)');
    c.fillStyle = grad;
    c.fillRect(0, 0, 256, 256);
    this.brillo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(lienzo), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.brillo.scale.set(9, 9, 1);
    this.ultron.add(this.brillo);
    // anillos que giran
    this.anillosUltron = [[2.8, 0.045, 0xff1638], [3.3, 0.03, 0xe6e8eb], [3.8, 0.025, 0xad001d]].map(([r, g, col], i) => {
      const a = new THREE.Mesh(new THREE.TorusGeometry(r, g, 6, 96), new THREE.MeshBasicMaterial({ color: col }));
      a.rotation.set(i * 0.9, i * 0.6, 0);
      this.ultron.add(a);
      return a;
    });
    const luz = new THREE.PointLight(0xff1638, 4, 30, 1.2);
    this.ultron.add(luz);
    this.agregarLetrero(4.6, 0.8, dibujoEtiqueta('ULTRÓN', 'NÚCLEO CENTRAL // AMENAZA'), 0, 6.4, 0, this.ultron);

    // escudos: uno por reto (aparecen después del disparo)
    const areas = (window.MINIJUEGOS || []).map((j) => j.area);
    this.escudos = areas.map((area, i) => {
      const anillo = new THREE.Mesh(new THREE.TorusGeometry(2.45 + i * 0.32, 0.05, 4, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xe6e8eb : 0xff1638, transparent: true, opacity: 0 }));
      anillo.rotation.z = i * 0.18;
      this.ultron.add(anillo);
      const ang = Math.PI / 2 + (i / areas.length) * Math.PI * 2;
      const etiqueta = this.agregarLetrero(3.4, 0.56, dibujoEtiqueta(area, `ESCUDO ${i + 1}`), Math.cos(ang) * 6, Math.sin(ang) * 4.7, 0.5, this.ultron);
      etiqueta.visible = false;
      return { anillo, etiqueta };
    });

    // zona invisible para apuntarle con el láser o el mouse
    this.blanco = crearEntidad(this.el, {
      geometry: 'primitive: sphere; radius: 2.6',
      material: 'shader: flat; transparent: true; opacity: 0; depthWrite: false',
      position: `0 ${y} ${z}`,
    });
    this.blanco.addEventListener('click', () => { if (this.fase === 'ultron') this.disparar(); });
  },

  construirVehiculo() {
    // el vehículo viaja con el jugador: piso, borde y barandal al frente
    const rig = this.jugador.object3D;
    const piso = new THREE.Mesh(new THREE.CircleGeometry(0.66, 48), new THREE.MeshBasicMaterial({ color: 0x0d0d10, transparent: true, opacity: 0.92 }));
    piso.rotation.x = -Math.PI / 2;
    piso.position.y = 0.01;
    const borde = new THREE.Mesh(new THREE.RingGeometry(0.66, 0.72, 48), new THREE.MeshBasicMaterial({ color: 0xff1638, side: THREE.DoubleSide }));
    borde.rotation.x = -Math.PI / 2;
    borde.position.y = 0.02;
    const geoBarandal = new THREE.TorusGeometry(0.78, 0.015, 6, 40, Math.PI * 0.7);
    geoBarandal.rotateZ(Math.PI * 0.15);
    geoBarandal.rotateX(-Math.PI / 2);
    const barandal = new THREE.Mesh(geoBarandal, new THREE.MeshBasicMaterial({ color: 0xe6e8eb }));
    barandal.position.y = 0.7;
    rig.add(piso, borde, barandal);
  },

  construirPaneles() {
    const rig = this.jugador;
    // subtítulos: abajo, enfrente
    this.subtitulo = crearEntidad(rig, { lienzo: 'ancho: 1.5; alto: 0.4', position: `0 ${OJO - 0.45} -1.3`, rotation: '-22 0 0' });

    // pantalla de inicio
    this.panelInicio = crearEntidad(rig, { position: `0 ${OJO + 0.05} -1.6` });
    const cartel = crearEntidad(this.panelInicio, { lienzo: 'ancho: 1.5; alto: 0.62', position: '0 0.16 0' });
    pintar(cartel, (ctx, w, h) => {
      fondoPanel(ctx, w, h, 'rgba(13,13,16,.94)');
      texto(ctx, 'VR ITC GAMES  //  TRAILER', w / 2, h * 0.13, { tam: 34, peso: 700, color: COLOR.acento, alinear: 'center' });
      texto(ctx, 'El sistema de Ultrón', w / 2, h * 0.33, { tam: 84, peso: 800, alinear: 'center' });
      parrafo(ctx, 'Un viaje de 2 minutos dentro de la computadora: red, router, memoria y procesador. Al final, enfréntate a Ultrón.', w / 2, h * 0.58, w * 0.84, { tam: 38, color: COLOR.texto });
      texto(ctx, 'Siéntate. Si te mareas, cierra los ojos o quítate el visor con las dos manos.', w / 2, h * 0.86, { tam: 30, peso: 600, color: COLOR.tenue, alinear: 'center' });
    });
    this.botonesInicio = [
      crearEntidad(this.panelInicio, { boton: 'texto: Iniciar con voz; ancho: 0.46; alto: 0.12; estilo: principal; accion: empezar; valor: voz', position: '-0.25 -0.26 0.01' }),
      crearEntidad(this.panelInicio, { boton: 'texto: Iniciar sin voz; ancho: 0.46; alto: 0.12; accion: empezar; valor: mudo', position: '0.25 -0.26 0.01' }),
      crearEntidad(this.panelInicio, { boton: 'texto: Menú de juegos; ancho: 0.4; alto: 0.1; accion: menu', position: '0 -0.42 0.01' }),
    ];

    // pantalla final
    this.panelFinal = crearEntidad(rig, { position: `0 ${OJO + 0.1} -1.7` });
    const final = crearEntidad(this.panelFinal, { lienzo: 'ancho: 1.5; alto: 0.62', position: '0 0.16 0' });
    pintar(final, (ctx, w, h) => {
      fondoPanel(ctx, w, h, 'rgba(5,5,6,.95)');
      texto(ctx, 'CODEXIA  //  VR, REDES Y TECNOLOGÍA', w / 2, h * 0.14, { tam: 34, peso: 700, color: COLOR.tenue, alinear: 'center' });
      ctx.font = `900 130px ${TITULO}`;
      const a = ctx.measureText('VR ').width;
      const b = ctx.measureText('ITC').width;
      const c = ctx.measureText(' GAMES').width;
      const x0 = (w - (a + b + c)) / 2;
      texto(ctx, 'VR ', x0, h * 0.4, { tam: 130, peso: 900 });
      texto(ctx, 'ITC', x0 + a, h * 0.4, { tam: 130, peso: 900, color: COLOR.acento });
      texto(ctx, ' GAMES', x0 + a + b, h * 0.4, { tam: 130, peso: 900 });
      texto(ctx, '6 RETOS  ·  6 ESCUDOS  ·  1 ULTRÓN', w / 2, h * 0.64, { tam: 44, peso: 700, color: COLOR.acento, alinear: 'center' });
      texto(ctx, '¿Listos para vencerlo en equipo?', w / 2, h * 0.84, { tam: 46, peso: 600, color: COLOR.texto, alinear: 'center' });
    });
    this.botonesFinal = [
      crearEntidad(this.panelFinal, { boton: 'texto: Elegir un reto; ancho: 0.46; alto: 0.12; estilo: principal; accion: menu', position: '-0.25 -0.26 0.01' }),
      crearEntidad(this.panelFinal, { boton: 'texto: Ver de nuevo; ancho: 0.46; alto: 0.12; accion: repetir', position: '0.25 -0.26 0.01' }),
    ];
  },

  // ---------- control ----------

  mostrar(fase) {
    this.fase = fase;
    const activar = (lista, si) => lista.forEach((b) => {
      if (si) b.classList.add('clickable'); else b.classList.remove('clickable');
    });
    this.panelInicio.object3D.visible = fase === 'inicio';
    activar(this.botonesInicio, fase === 'inicio');
    this.panelFinal.object3D.visible = fase === 'final';
    activar(this.botonesFinal, fase === 'final');
    this.subtitulo.object3D.visible = fase === 'viaje' || fase === 'ultron' || fase === 'escudos';
    if (fase === 'ultron') this.blanco.classList.add('clickable'); else this.blanco.classList.remove('clickable');
    refrescarApuntadores();
  },

  presionar(accion, valor) {
    if (accion === 'menu') return irA('index.html');
    sonido.tecla();
    if (accion === 'empezar') this.empezar(valor === 'voz');
    if (accion === 'repetir') this.empezar(this.conVoz);
    return null;
  },

  empezar(conVoz) {
    this.conVoz = conVoz;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    this.t = 0;
    this.iFrase = 0;
    this.tFase = 0;
    this.jugador.object3D.position.z = 0;
    this.bytes.forEach((b) => { b.revelado = false; b.l.userData.redibujar(b.dibujo(false)); });
    this.paquetes.forEach((p) => p.g.position.set(p.x, p.y, p.z0));
    this.escudos.forEach((e) => { e.anillo.material.opacity = 0; e.etiqueta.visible = false; });
    this.portalRAM.disco.material.opacity = 0.12;
    this.materialOjo.color.set(0xff1638);
    this.iniciarAmbiente();
    this.mostrar('viaje');
  },

  decir(frase) {
    pintar(this.subtitulo, (ctx, w, h) => {
      fondoPanel(ctx, w, h, 'rgba(5,5,6,.9)');
      texto(ctx, frase.etiqueta, w * 0.05, h * 0.17, { tam: 30, peso: 700, color: COLOR.acento });
      parrafo(ctx, frase.texto, w / 2, h * 0.6, w * 0.9, { tam: 44, color: COLOR.texto });
    });
    if (frase.efecto === 'soplido') this.soplido();
    if (this.conVoz && window.speechSynthesis && window.SpeechSynthesisUtterance) {
      const u = new SpeechSynthesisUtterance(frase.voz || frase.texto);
      u.lang = 'es-MX';
      const voces = window.speechSynthesis.getVoices();
      const voz = voces.find((v) => v.lang === 'es-MX') || voces.find((v) => v.lang && v.lang.startsWith('es'));
      // sin voz en español, solo subtítulos (una voz en inglés leería mal el texto)
      if (!voz) return;
      u.voice = voz;
      u.rate = 1.03;
      window.speechSynthesis.speak(u);
    }
  },

  disparar() {
    this.mostrar('escudos');
    this.tFase = 0;
    this.decir(VIAJE.fraseEscudos);
    // rayo desde el vehículo hasta el ojo de Ultrón
    const z = this.jugador.object3D.position.z;
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.2, OJO - 0.35, z - 0.5), new THREE.Vector3(0, OJO + 0.4, VIAJE.zUltron + 2.2)]);
    this.rayo = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff }));
    this.mundo.add(this.rayo);
    this.materialOjo.color.set(0xffffff);
    sonido.tono(1200, 0.25, 'sawtooth', 0.08);
    sonido.tono(90, 0.7, 'square', 0.1, 0.12);
  },

  iniciarAmbiente() {
    try {
      sonido.ctx = sonido.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const ac = sonido.ctx;
      if (ac.resume) ac.resume();
      if (this.zumbido) return;
      const filtro = ac.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 260;
      const ganancia = ac.createGain();
      ganancia.gain.setValueAtTime(0, ac.currentTime);
      ganancia.gain.linearRampToValueAtTime(0.045, ac.currentTime + 3);
      [55, 55.6, 82.4].forEach((f) => {
        const o = ac.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.connect(filtro);
        o.start();
      });
      filtro.connect(ganancia).connect(ac.destination);
      this.zumbido = { filtro, ac };
    } catch (e) { /* sin audio, el viaje sigue */ }
  },

  soplido() {
    try {
      const ac = sonido.ctx;
      if (!ac) return;
      const buf = ac.createBuffer(1, ac.sampleRate * 1.6, ac.sampleRate);
      const datos = buf.getChannelData(0);
      for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
      const fuente = ac.createBufferSource();
      fuente.buffer = buf;
      const filtro = ac.createBiquadFilter();
      filtro.type = 'bandpass';
      filtro.Q.value = 1.2;
      filtro.frequency.setValueAtTime(300, ac.currentTime);
      filtro.frequency.exponentialRampToValueAtTime(2200, ac.currentTime + 1.4);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.12, ac.currentTime + 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.6);
      fuente.connect(filtro).connect(g).connect(ac.destination);
      fuente.start();
    } catch (e) { /* sin audio */ }
  },

  tick(tiempo, dtMs) {
    const dts = Math.min(dtMs || 16, 50) / 1000;
    this.reloj += dts;
    const rig = this.jugador.object3D;

    if (this.fase === 'viaje') {
      this.t += dts;
      const z = posicionViaje(this.t);
      rig.position.z = z;
      while (this.iFrase < VIAJE.frases.length && z <= VIAJE.frases[this.iFrase].z) this.decir(VIAJE.frases[this.iFrase++]);
      if (this.t >= VIAJE.tramos[VIAJE.tramos.length - 1].t1) {
        this.mostrar('ultron');
        this.tFase = 0;
        this.decir(VIAJE.fraseUltron);
      }
    } else if (this.fase === 'ultron') {
      this.tFase += dts;
      if (this.tFase > VIAJE.segundosEsperaDisparo) this.disparar();
    } else if (this.fase === 'escudos') {
      this.tFase += dts;
      if (this.rayo && this.tFase > 0.35) {
        this.mundo.remove(this.rayo);
        this.rayo = null;
        this.materialOjo.color.set(0xff1638);
      }
      this.escudos.forEach((e, i) => {
        const inicio = 1 + i * 0.9;
        if (this.tFase > inicio && !e.etiqueta.visible) {
          e.etiqueta.visible = true;
          sonido.tono(330 + i * 80, 0.25, 'triangle', 0.08);
        }
        e.anillo.material.opacity = Math.min(1, Math.max(0, (this.tFase - inicio) * 2));
      });
      if (this.tFase > 1 + this.escudos.length * 0.9 + 5) {
        this.mostrar('final');
        sonido.nivel();
      }
    }

    const z = rig.position.z;
    // cable: pulsos de luz y paquetes
    if (z > -95) {
      this.moverPulsos(dts);
      if (this.fase === 'viaje') {
        this.paquetes.forEach((p) => {
          if (p.g.position.z > -82) p.g.position.z -= p.v * dts;
          p.g.visible = p.g.position.z > -82;
        });
      }
    }
    // router: el escáner baja sobre el vehículo y se enciende el portal de la RAM
    this.hexRouter.rotation.z += dts * 0.15;
    if (this.fase === 'viaje' && this.t > 45 && this.t < 53) {
      const u = (this.t - 45) / 5;
      this.escaner.material.opacity = u < 1 ? 0.9 : 0;
      this.escaner.position.y = OJO + 1.2 - Math.min(u, 1) * 2.6;
      if (this.t > 49) this.portalRAM.disco.material.opacity = 0.12 + 0.4 * (0.5 + 0.5 * Math.sin(this.reloj * 8));
    } else this.escaner.material.opacity = 0;
    // memoria: bits que cambian, chips "borrados" por Ultrón, bytes que se revelan
    if (z < -100 && z > -200) {
      this.tBits = (this.tBits || 0) + dts;
      if (this.tBits > 0.2) {
        this.tBits = 0;
        this.dibujarBits();
        const n = this.chips.count;
        const rojo = new THREE.Color(0xff1638);
        const plata = new THREE.Color(0xe6e8eb);
        for (let k = 0; k < 18; k++) this.chips.setColorAt(Math.floor(Math.random() * n), Math.random() < 0.55 ? rojo : plata);
        this.chips.instanceColor.needsUpdate = true;
      }
      this.bytes.forEach((b) => {
        if (!b.revelado && z < b.z + 4) {
          b.revelado = true;
          b.l.userData.redibujar(b.dibujo(true));
          sonido.tono(660, 0.12, 'sine', 0.07);
        }
      });
      this.bus.material.opacity = 0.35 + 0.3 * Math.sin(this.reloj * 5);
    }
    // CPU y Ultrón
    if (z < -180) {
      this.lineasDatos.material.opacity = 0.25 + 0.25 * Math.sin(this.reloj * 6);
      this.anillosUltron.forEach((a, i) => { a.rotation.x += dts * (0.3 + i * 0.15); a.rotation.y += dts * (0.2 + i * 0.1); });
      const latido = 1 + 0.06 * Math.sin(this.reloj * 3);
      this.brillo.scale.set(9 * latido, 9 * latido, 1);
      if (this.fase === 'escudos' && this.tFase < 1) this.ultron.position.x = Math.sin(this.reloj * 70) * 0.12 * (1 - this.tFase);
      else this.ultron.position.x = 0;
      this.escudos.forEach((e, i) => { e.anillo.rotation.z += dts * (i % 2 ? -0.25 : 0.25); });
    }
    // el filtro del zumbido cambia en cada parte del viaje
    if (this.zumbido) {
      let f = 260;
      if (z < -14 && z > -86) f = 420;
      else if (z < -114 && z > -186) f = 340;
      else if (z <= -186) f = 170;
      this.zumbido.filtro.frequency.setTargetAtTime(f, this.zumbido.ac.currentTime, 0.8);
    }
  },
});
