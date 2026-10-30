/* CODEXIA · Ghost Network · Robot programado: ¡lleven a Ultrón al agua! (edición de Enlace VR)
 *
 * Con la IP de Ultrón, el equipo hackeó su sistema de navegación. El Operador ve un tablero de 5 × 5
 * (un sector de la ciudad) con Ultrón, pero NO ve sus antenas ni la presa. El equipo tiene los
 * 12 sectores impresos en el Manual de campo, pero no sabe dónde está Ultrón: el Operador le dice
 * el número de sector y la casilla.
 *
 * El equipo dicta una instrucción a la vez: una flecha y cuántas casillas ("dos hacia arriba"). El
 * Operador elige la flecha y el número, presiona Mover y Ultrón avanza casilla por casilla: "¡LISTO!".
 * Si pisa una de sus antenas (o se sale del sector) se reconecta y ESCAPA: se ve el sector completo
 * y sigue otro del mismo nivel. Si llega a la presa, CAE AL AGUA y se apaga: +1, siguiente nivel y,
 * en una ronda, una pieza del GPS (la 1.ª vez la latitud y la 2.ª la longitud; ver js/mision.js).
 *
 * Ronda de 5 minutos. Datos: ../js/robot_mapas.js (los mismos mapas de Enlace VR: hoyo = antena,
 * meta = presa).
 */
/* global mision, MISION, AFRAME, THREE, COLOR, MONO, texto, fondoPanel, minutos, pintar, rectRedondo, sonido, crearEntidad, refrescarApuntadores, irA, marcador, rondaComun, dibujarFinalRonda */

const ROBOT = {
  celda: 0.32,
  tablero: { x: 0, y: 0.75, z: -2.2, inclinacion: 0.3 },
  msPaso: 430,
};

const COLUMNAS = 'ABCDE';
// "arriba" es la fila 1, el lado del tablero más lejos del jugador
const FLECHAS = {
  arriba: { icono: '↑', dc: 0, df: -1, nombre: 'arriba', giro: 0 },
  derecha: { icono: '→', dc: 1, df: 0, nombre: 'a la derecha', giro: 1 },
  abajo: { icono: '↓', dc: 0, df: 1, nombre: 'abajo', giro: 2 },
  izquierda: { icono: '←', dc: -1, df: 0, nombre: 'a la izquierda', giro: 3 },
};
const nombreCasilla = (c, f) => `${COLUMNAS[c]}${f + 1}`;
const clave = (c, f) => `${c},${f}`;

/** Convierte un mapa del JSON (filas de texto) en hoyos, meta e inicios. */
function leerMapa(m) {
  const hoyos = new Set();
  let meta = null;
  m.filas.forEach((fila, f) => {
    [...fila].forEach((x, c) => {
      if (x === 'O') hoyos.add(clave(c, f));
      if (x === 'M') meta = { c, f };
    });
  });
  const inicios = m.inicios.map((t) => ({ c: COLUMNAS.indexOf(t[0]), f: Number(t.slice(1)) - 1 }));
  return { id: m.id, nivel: m.nivel, hoyos, meta, inicios, n: m.filas.length };
}

/** Sigue una instrucción desde (c, f): lista de casillas que pisa y cómo termina. */
function seguirInstruccion(mapa, desde, flecha, cuantas) {
  const d = FLECHAS[flecha];
  let { c, f } = desde;
  const camino = [];
  for (let k = 0; k < cuantas; k++) {
    c += d.dc;
    f += d.df;
    camino.push({ c, f });
    if (c < 0 || f < 0 || c >= mapa.n || f >= mapa.n) return { camino, resultado: 'fuera' };
    if (mapa.hoyos.has(clave(c, f))) return { camino, resultado: 'hoyo' };
    if (c === mapa.meta.c && f === mapa.meta.f) return { camino, resultado: 'meta' };
  }
  return { camino, resultado: 'bien' };
}

// ---------- modelos 3D ----------

/** Ultrón: cuerpo de metal oscuro, hombreras, cabeza angulosa y ojos rojos. El frente mira a -z. */
function crearRobot() {
  const robot = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x6a717d, metalness: 0.7, roughness: 0.3 });
  const oscuro = new THREE.MeshStandardMaterial({ color: 0x2a2e36, metalness: 0.6, roughness: 0.45 });
  const plata = new THREE.MeshStandardMaterial({ color: 0xb8bec8, metalness: 0.8, roughness: 0.25 });
  const rojo = new THREE.MeshBasicMaterial({ color: 0xff1638 });
  const ojosMat = new THREE.MeshBasicMaterial({ color: 0xff1638 });
  const pieza = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); robot.add(m); return m; };
  // piernas y pies
  [-1, 1].forEach((l) => {
    pieza(new THREE.BoxGeometry(0.03, 0.08, 0.035), oscuro, l * 0.03, 0.045, 0);
    pieza(new THREE.BoxGeometry(0.04, 0.015, 0.055), metal, l * 0.03, 0.008, -0.008);
  });
  // torso en forma de V y el núcleo rojo del pecho
  const torso = pieza(new THREE.CylinderGeometry(0.075, 0.045, 0.11, 4), metal, 0, 0.14, 0);
  torso.rotation.y = Math.PI / 4;
  torso.scale.set(1, 1, 0.6);
  const nucleo = pieza(new THREE.CircleGeometry(0.016, 20), rojo, 0, 0.155, -0.036);
  nucleo.rotation.y = Math.PI;
  // hombreras y brazos
  [-1, 1].forEach((l) => {
    const hombro = pieza(new THREE.BoxGeometry(0.05, 0.03, 0.05), plata, l * 0.075, 0.19, 0);
    hombro.rotation.z = l * -0.35;
    pieza(new THREE.BoxGeometry(0.022, 0.09, 0.025), oscuro, l * 0.085, 0.13, 0);
  });
  // cabeza angulosa con cresta y ojos
  const cabeza = pieza(new THREE.CylinderGeometry(0.03, 0.022, 0.07, 5), metal, 0, 0.235, 0);
  cabeza.rotation.y = Math.PI / 5;
  pieza(new THREE.BoxGeometry(0.008, 0.035, 0.05), plata, 0, 0.272, 0.004);
  const cara = pieza(new THREE.PlaneGeometry(0.046, 0.04), oscuro, 0, 0.233, -0.0265);
  cara.rotation.y = Math.PI;
  [-1, 1].forEach((l) => {
    const ojo = pieza(new THREE.PlaneGeometry(0.014, 0.006), ojosMat, l * 0.011, 0.24, -0.0275);
    ojo.rotation.set(0, Math.PI, l * 0.25);
  });
  const resplandor = pieza(new THREE.SphereGeometry(0.02, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff1638, transparent: true, opacity: 0.08, depthWrite: false }), 0, 0.24, -0.035);
  const espalda = pieza(new THREE.PlaneGeometry(0.012, 0.07), rojo, 0, 0.15, 0.034);
  espalda.rotation.y = 0;
  robot.userData.bola = nucleo;
  robot.userData.ojos = ojosMat;
  robot.userData.rojo = rojo;
  robot.userData.resplandor = resplandor;
  return robot;
}

/** Antena de Ultrón: un poste con luz roja. Si Ultrón la pisa, se reconecta y escapa. */
function crearAntena(S) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.7, roughness: 0.4 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(S * 0.3, S * 0.36, 0.02, 6), metal);
  base.position.y = 0.01;
  const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, 0.26, 6), metal);
  poste.position.y = 0.14;
  const plato = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.025, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x8a9099, side: THREE.DoubleSide, metalness: 0.6 }));
  plato.position.set(0, 0.2, -0.02);
  plato.rotation.x = -Math.PI / 2.4;
  const luz = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff1638 }));
  luz.position.y = 0.28;
  const aro = new THREE.Mesh(new THREE.RingGeometry(S * 0.4, S * 0.45, 6), new THREE.MeshBasicMaterial({ color: 0xff1638, side: THREE.DoubleSide }));
  aro.rotation.x = -Math.PI / 2;
  aro.position.y = 0.012;
  g.add(base, poste, plato, luz, aro);
  g.userData.luz = luz;
  return g;
}

/** La presa: un estanque de agua azul con ondas. */
function crearPresa(S) {
  const g = new THREE.Group();
  const borde = new THREE.Mesh(new THREE.BoxGeometry(S * 0.96, 0.03, S * 0.96), new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.8 }));
  borde.position.y = 0.012;
  const agua = new THREE.Mesh(new THREE.BoxGeometry(S * 0.84, 0.032, S * 0.84), new THREE.MeshBasicMaterial({ color: 0x1f7ad6, transparent: true, opacity: 0.9 }));
  agua.position.y = 0.014;
  const brillo = new THREE.Mesh(new THREE.PlaneGeometry(S * 0.84, S * 0.84), new THREE.MeshBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.25 }));
  brillo.rotation.x = -Math.PI / 2;
  brillo.position.y = 0.031;
  const ondas = [0, 1, 2].map((i) => {
    const o = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.026, 32), new THREE.MeshBasicMaterial({ color: 0xdff1ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    o.rotation.x = -Math.PI / 2;
    o.position.y = 0.033;
    o.userData.fase = i / 3;
    g.add(o);
    return o;
  });
  g.add(borde, agua, brillo);
  g.userData.ondas = ondas;
  return g;
}

/** Placa del tablero: casillas, letras, números y los cuatro lados (ARRIBA, ABAJO...). */
function texturaPlaca(n, celda, margen) {
  const lado = n * celda + margen * 2;
  const px = 2048;
  const k = px / lado; // pixeles por metro
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const c = canvas.getContext('2d');
  c.fillStyle = '#0d0709';
  c.fillRect(0, 0, px, px);
  c.strokeStyle = 'rgba(255, 22, 56,.55)';
  c.lineWidth = 6;
  c.strokeRect(10, 10, px - 20, px - 20);
  const x0 = margen * k;
  const tam = celda * k;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#ff1638';
  c.font = `700 ${Math.round(tam * 0.36)}px "Orbitron", sans-serif`;
  for (let i = 0; i < n; i++) {
    const centro = x0 + tam * (i + 0.5);
    c.fillText(COLUMNAS[i], centro, x0 - tam * 0.26);
    c.fillText(COLUMNAS[i], centro, x0 + n * tam + tam * 0.26);
    c.fillText(String(i + 1), x0 - tam * 0.26, centro);
    c.fillText(String(i + 1), x0 + n * tam + tam * 0.26, centro);
  }
  // los cuatro lados, para que todos digan lo mismo
  c.fillStyle = '#F2F4F8';
  c.font = `700 ${Math.round(tam * 0.2)}px "Orbitron", sans-serif`;
  c.fillText('↑ ARRIBA', px / 2, x0 - tam * 0.62);
  c.fillText('↓ ABAJO', px / 2, x0 + n * tam + tam * 0.62);
  c.save();
  c.translate(x0 - tam * 0.62, px / 2);
  c.rotate(-Math.PI / 2);
  c.fillText('← IZQUIERDA', 0, 0);
  c.restore();
  c.save();
  c.translate(x0 + n * tam + tam * 0.62, px / 2);
  c.rotate(Math.PI / 2);
  c.fillText('DERECHA →', 0, 0);
  c.restore();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, lado };
}

// ---------- el juego ----------

AFRAME.registerComponent('robot-programado', {
  init() {
    this.datos = window.ROBOT_MAPAS;
    this.mapas = this.datos.mapas.map(leerMapa);
    this.nivelMax = Math.max(...this.mapas.map((m) => m.nivel));
    this.estado = 'inicio';
    this.modo = 'practica';
    this.botones = { inicio: [], juego: [], fin: [] };
    this.flecha = null;
    this.cuantas = null;
    this.ultimoSegundo = null;
    this.construir();
    this.el.sceneEl.addEventListener('boton-presionado', (e) => this.presionar(e.detail.accion, e.detail.valor));
    window.addEventListener('keydown', (e) => this.teclaFisica(e));
    // en la computadora, mirar un poco hacia abajo para ver el tablero y la consola
    this.el.sceneEl.addEventListener('loaded', () => {
      const lc = document.querySelector('[camera]').components['look-controls'];
      if (lc && !this.el.sceneEl.is('vr-mode')) lc.pitchObject.rotation.x = -0.3;
    });
    // en la pantalla de inicio se ve un mapa de ejemplo (sin hoyos)
    this.mapa = this.mapas[0];
    this.posicionRobot = this.mapa.inicios[0];
    this.colocarRobot(this.posicionRobot, 2);
    this.mostrar('inicio');
    window.juego = this; // para probar desde la consola
  },

  // --- construcción ---

  construir() {
    const T = ROBOT.tablero;
    const n = this.datos.tablero;
    const S = ROBOT.celda;
    this.tablero = new THREE.Group();
    this.tablero.position.set(T.x, T.y, T.z);
    this.tablero.rotation.x = T.inclinacion;
    this.el.object3D.add(this.tablero);

    const { tex, lado } = texturaPlaca(n, S, 0.3);
    const mesa = new THREE.Mesh(new THREE.BoxGeometry(lado, 0.05, lado), [
      ...Array(2).fill(new THREE.MeshStandardMaterial({ color: 0x1c1013 })),
      new THREE.MeshBasicMaterial({ map: tex }),
      ...Array(3).fill(new THREE.MeshStandardMaterial({ color: 0x1c1013 })),
    ]);
    mesa.position.y = -0.025;
    this.tablero.add(mesa);
    const orilla = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(lado, 0.05, lado)), new THREE.LineBasicMaterial({ color: 0xff1638 }));
    orilla.position.y = -0.025;
    this.tablero.add(orilla);

    // casillas (se pintan de azul las que ya pisó el robot)
    this.celdas = new Map();
    for (let f = 0; f < n; f++) {
      for (let c = 0; c < n; c++) {
        const base = (c + f) % 2 ? 0x1e0d12 : 0x221016;
        const mat = new THREE.MeshBasicMaterial({ color: base });
        const m = new THREE.Mesh(new THREE.BoxGeometry(S - 0.016, 0.01, S - 0.016), mat);
        m.position.copy(this.posicion(c, f)).setY(0.005);
        this.tablero.add(m);
        this.celdas.set(clave(c, f), { mat, base });
      }
    }

    // marca de inicio (aro azul)
    this.marcaInicio = new THREE.Mesh(new THREE.RingGeometry(S * 0.36, S * 0.43, 40), new THREE.MeshBasicMaterial({ color: 0xff1638, side: THREE.DoubleSide }));
    this.marcaInicio.rotation.x = -Math.PI / 2;
    this.tablero.add(this.marcaInicio);

    // hoyos y meta: escondidos hasta que se revela el mapa
    this.grupoHoyos = new THREE.Group();
    this.tablero.add(this.grupoHoyos);
    this.meta = crearPresa(S);
    this.meta.visible = false;
    this.tablero.add(this.meta);
    // salpicadura (cuando Ultrón cae al agua) y rayo rojo (cuando escapa por una antena)
    this.gotas = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(60 * 3), 3)),
      new THREE.PointsMaterial({ color: 0xbfe4ff, size: 0.018, transparent: true, opacity: 0.95 }));
    this.gotas.visible = false;
    this.tablero.add(this.gotas);
    this.rayo = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 1.6, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xff1638, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
    this.rayo.visible = false;
    this.tablero.add(this.rayo);

    this.robot = crearRobot();
    this.tablero.add(this.robot);

    // pantalla grande arriba del tablero (todo se dibuja ahí)
    this.pantalla = crearEntidad(this.el, { lienzo: 'ancho: 2.4; alto: 0.9', position: '0 1.98 -2.95' });
    this.lienzoResultado = crearEntidad(this.el, { lienzo: 'ancho: 2.2; alto: 0.97', position: '0 1.9 -2.9', visible: false });

    // consola baja (como en las piernas): flechas, cuántas casillas y Mover
    this.consola = crearEntidad(this.el, { position: '0 0.42 -0.55', rotation: '-60 0 0' });
    crearEntidad(this.consola, { geometry: 'primitive: plane; width: 1.36; height: 0.66', material: 'shader: flat; color: #ff1638; opacity: 0.35; transparent: true', position: '0 0 -0.012' });
    crearEntidad(this.consola, { geometry: 'primitive: plane; width: 1.32; height: 0.62', material: 'shader: flat; color: #050405; opacity: 0.95; transparent: true', position: '0 0 -0.008' });
    this.lienzoConsola = crearEntidad(this.consola, { lienzo: 'ancho: 1.28; alto: 0.12', position: '0 0.24 0' });
    const b = (grupo, textoBoton, x, y, ancho, accion, valor = '', estilo = 'tecla', alto = 0.11) => {
      const el = crearEntidad(this.consola, { position: `${x} ${y} 0.01`, boton: { texto: textoBoton, ancho, alto, accion, valor, estilo }, visible: false });
      this.botones[grupo].push(el);
      return el;
    };
    // flechas en cruz (a la izquierda)
    this.botonesFlecha = {
      arriba: b('juego', '↑', -0.44, 0.1, 0.14, 'flecha', 'arriba', 'tecla', 0.12),
      izquierda: b('juego', '←', -0.6, -0.04, 0.14, 'flecha', 'izquierda', 'tecla', 0.12),
      derecha: b('juego', '→', -0.28, -0.04, 0.14, 'flecha', 'derecha', 'tecla', 0.12),
      abajo: b('juego', '↓', -0.44, -0.18, 0.14, 'flecha', 'abajo', 'tecla', 0.12),
    };
    // cuántas casillas (al centro)
    this.botonesNumero = [1, 2, 3, 4].map((k, i) => b('juego', String(k), -0.08 + (i % 2) * 0.16, 0.06 - Math.floor(i / 2) * 0.15, 0.14, 'cuantas', String(k), 'tecla', 0.13));
    // la instrucción armada y Mover (a la derecha)
    this.lienzoInstruccion = crearEntidad(this.consola, { lienzo: 'ancho: 0.42; alto: 0.15', position: '0.4 0.07 0' });
    this.botonMover = b('juego', '▶ Mover', 0.4, -0.12, 0.42, 'mover', '', 'principal', 0.14);
    this.botonTerminar = b('juego', 'Terminar', 0.4, -0.255, 0.22, 'terminar', '', 'tecla', 0.07);
    b('inicio', 'Práctica', -0.42, -0.06, 0.36, 'practicar', '', 'tecla', 0.15);
    b('inicio', `Empezar misión · ${this.datos.minutos_ronda} min`, 0.06, -0.06, 0.52, 'empezar', '', 'principal', 0.15);
    b('inicio', 'Menú', 0.49, -0.06, 0.26, 'menu', '', 'tecla', 0.15);
    b('fin', 'Nueva ronda', -0.3, -0.06, 0.5, 'nueva', '', 'principal', 0.15);
    b('fin', 'Menú de juegos', 0.3, -0.06, 0.5, 'menu', '', 'tecla', 0.15);
  },

  posicion(c, f) {
    const n = this.datos.tablero;
    return new THREE.Vector3((c - (n - 1) / 2) * ROBOT.celda, 0, (f - (n - 1) / 2) * ROBOT.celda);
  },

  colocarRobot({ c, f }, giro = this.giro || 0) {
    this.giro = giro;
    this.robot.position.copy(this.posicion(c, f)).setY(0.01);
    this.robot.rotation.y = -giro * Math.PI / 2;
    this.robot.scale.setScalar(1);
  },

  mostrar(nombre) {
    this.estado = nombre;
    const grupo = nombre === 'inicio' || nombre === 'fin' ? nombre : 'juego';
    Object.entries(this.botones).forEach(([g, lista]) => {
      lista.forEach((el) => {
        let si = g === grupo;
        if (el === this.botonTerminar) si = grupo === 'juego' && this.modo === 'practica';
        el.setAttribute('visible', si);
        el.classList.toggle('clickable', si);
      });
    });
    this.lienzoInstruccion.setAttribute('visible', grupo === 'juego');
    this.lienzoResultado.setAttribute('visible', nombre === 'fin');
    this.pantalla.setAttribute('visible', nombre !== 'fin');
    refrescarApuntadores();
    this.dibujarConsola();
    this.dibujarPantalla();
  },

  // --- flujo ---

  empezar(modo) {
    this.modo = modo;
    this.nivel = 1;
    this.metas = 0;
    this.hundidos = 0;
    this.instrucciones = 0;
    this.jugadasPorNivel = {};
    this.mapa = null;
    this.finRonda = performance.now() + this.datos.minutos_ronda * 60 * 1000;
    rondaComun.empezar(modo);
    sonido.nivel();
    this.nuevoMapa();
  },

  /** Elige el mapa del nivel (se turnan los dos de cada nivel) y un inicio al azar. */
  nuevoMapa() {
    const nivel = Math.min(this.nivel, this.nivelMax);
    const delNivel = this.mapas.filter((m) => m.nivel === nivel);
    const k = this.jugadasPorNivel[nivel] || 0;
    this.jugadasPorNivel[nivel] = k + 1;
    let mapa = delNivel[k % delNivel.length];
    if (this.mapa && mapa.id === this.mapa.id && delNivel.length > 1) mapa = delNivel[(k + 1) % delNivel.length];
    this.mapa = mapa;
    this.inicio = mapa.inicios[Math.floor(Math.random() * mapa.inicios.length)];
    this.posicionRobot = { ...this.inicio };
    this.historial = [];
    this.flecha = null;
    this.cuantas = null;
    this.animacion = null;
    this.revelar = null;
    this.aviso = { tipo: 'nuevo' };
    // tablero limpio: sin hoyos ni meta a la vista
    while (this.grupoHoyos.children.length) this.grupoHoyos.remove(this.grupoHoyos.children[0]);
    this.meta.visible = false;
    this.celdas.forEach((x) => x.mat.color.setHex(x.base));
    this.marcaInicio.position.copy(this.posicion(this.inicio.c, this.inicio.f)).setY(0.012);
    this.marcaInicio.visible = true;
    this.robot.visible = true;
    this.colocarRobot(this.inicio, 2); // mirando al Operador, para que vea sus ojos rojos
    this.pintarPisada(this.inicio);
    this.mostrar('jugada');
  },

  elegirFlecha(nombre) {
    this.flecha = nombre;
    Object.entries(this.botonesFlecha).forEach(([k, el]) => el.setAttribute('boton', 'elegido', k === nombre));
    sonido.tecla();
    this.dibujarConsola();
  },

  elegirCuantas(k) {
    this.cuantas = k;
    this.botonesNumero.forEach((el, i) => el.setAttribute('boton', 'elegido', i + 1 === k));
    sonido.tecla();
    this.dibujarConsola();
  },

  mover() {
    if (!this.flecha || !this.cuantas) {
      this.aviso = { tipo: 'falta' };
      sonido.tecla();
      this.dibujarPantalla();
      return;
    }
    const sim = seguirInstruccion(this.mapa, this.posicionRobot, this.flecha, this.cuantas);
    this.instrucciones += 1;
    this.historial.push({ flecha: this.flecha, cuantas: this.cuantas, resultado: null });
    this.animacion = { sim, desde: { ...this.posicionRobot }, giro: FLECHAS[this.flecha].giro, t0: performance.now(), ultimo: -1 };
    this.colocarRobot(this.posicionRobot, FLECHAS[this.flecha].giro);
    this.flecha = null;
    this.cuantas = null;
    Object.values(this.botonesFlecha).forEach((el) => el.setAttribute('boton', 'elegido', false));
    this.botonesNumero.forEach((el) => el.setAttribute('boton', 'elegido', false));
    this.mostrar('moviendo');
  },

  /** Termina el movimiento: listo, se hundió, se salió o llegó. */
  terminarMovimiento() {
    const { sim } = this.animacion;
    const ultima = sim.camino[sim.camino.length - 1];
    const paso = this.historial[this.historial.length - 1];
    paso.resultado = sim.resultado;
    this.animacion = null;
    if (sim.resultado === 'bien') {
      this.posicionRobot = { ...ultima };
      this.aviso = { tipo: 'listo', donde: nombreCasilla(ultima.c, ultima.f) };
      sonido.bien();
      this.mostrar('jugada');
      return;
    }
    if (sim.resultado === 'meta') {
      this.posicionRobot = { ...ultima };
      this.metas += 1;
      this.aviso = { tipo: 'meta', nivel: this.nivel };
      // en una ronda, cada caída al agua da una pieza del GPS (latitud, luego longitud)
      const parte = window.MISION.juegos.robot.partes[this.metas - 1];
      if (this.modo === 'ronda' && parte) {
        mision.desbloquear([parte]);
        this.aviso.gps = `${parte === 'lat' ? 'LATITUD' : 'LONGITUD'}: ${mision.valor(parte)}`;
      }
      this.nivel += 1;
      this.fanfarria();
    } else {
      this.hundidos += 1;
      this.aviso = { tipo: sim.resultado, donde: sim.resultado === 'hoyo' ? nombreCasilla(ultima.c, ultima.f) : null };
      // se reconecta: zumbido eléctrico
      sonido.tono(90, 0.9, 'sawtooth', 0.1);
      sonido.tono(180, 0.5, 'square', 0.05, 0.2);
    }
    // se ve el sector completo unos segundos y luego sigue otro
    this.mostrarMapa();
    const ahora = performance.now();
    this.revelar = { hasta: ahora + (this.datos.segundos_revelar + (sim.resultado === 'meta' ? 1.5 : 0)) * 1000, inicio: ahora, tipo: sim.resultado === 'meta' ? 'agua' : 'escapa' };
    if (sim.resultado === 'meta') this.empezarSalpicadura();
    else {
      this.rayo.position.copy(this.robot.position).setY(0.8);
      this.rayo.visible = true;
    }
    this.mostrar('revelando');
  },

  /** Muestra las antenas y la presa del sector actual. */
  mostrarMapa() {
    while (this.grupoHoyos.children.length) this.grupoHoyos.remove(this.grupoHoyos.children[0]);
    this.antenas = [];
    this.mapa.hoyos.forEach((k) => {
      const [c, f] = k.split(',').map(Number);
      const antena = crearAntena(ROBOT.celda);
      antena.position.copy(this.posicion(c, f));
      this.grupoHoyos.add(antena);
      this.antenas.push(antena);
    });
    this.meta.position.copy(this.posicion(this.mapa.meta.c, this.mapa.meta.f));
    this.meta.visible = true;
  },

  empezarSalpicadura() {
    const p = this.robot.position;
    this.salpicadura = { t0: performance.now(), vel: [] };
    const pos = this.gotas.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i, p.x, 0.04, p.z);
      const a = Math.random() * Math.PI * 2;
      const v = 0.15 + Math.random() * 0.35;
      this.salpicadura.vel.push([Math.cos(a) * v * 0.6, 0.6 + Math.random() * 0.7, Math.sin(a) * v * 0.6]);
    }
    pos.needsUpdate = true;
    this.gotas.visible = true;
    // ¡splash!: ruido corto y grave
    sonido.tono(220, 0.25, 'triangle', 0.14);
    sonido.tono(110, 0.6, 'sine', 0.14, 0.05);
  },

  pintarPisada({ c, f }) {
    const celda = this.celdas.get(clave(c, f));
    if (celda) celda.mat.color.setHex(0x6e1222);
  },

  terminar() {
    this.animacion = null;
    this.revelar = null;
    sonido.fin();
    rondaComun.terminar();
    this.registro = this.modo === 'ronda'
      ? marcador.registrar('robot', this.metas, `nivel ${Math.min(this.nivel, this.nivelMax)} · hundidos ${this.hundidos} · instrucciones ${this.instrucciones}`, () => this.dibujarResultado())
      : null;
    this.dibujarResultado();
    this.mostrar('fin');
  },

  /** Al llegar a la meta: fanfarria fuerte para que todo el equipo la oiga. */
  fanfarria() {
    [523, 659, 784, 1047].forEach((fr, i) => sonido.tono(fr, 0.22, 'triangle', 0.16, i * 0.12));
    sonido.tono(1047, 0.6, 'square', 0.06, 0.5);
  },

  presionar(accion, valor) {
    if (accion === 'menu') return irA('index.html');
    if (accion === 'practicar') return this.empezar('practica');
    if (accion === 'empezar') return this.empezar('ronda');
    if (accion === 'nueva') {
      this.robot.visible = true;
      this.mostrar('inicio');
      return;
    }
    if (accion === 'terminar') return this.terminar();
    if (this.estado !== 'jugada') return;
    if (accion === 'flecha') this.elegirFlecha(valor);
    else if (accion === 'cuantas') this.elegirCuantas(Number(valor));
    else if (accion === 'mover') this.mover();
  },

  /** En la computadora: flechas del teclado, números 1 a 4 y Enter. */
  teclaFisica(e) {
    const flechas = { ArrowUp: 'arriba', ArrowDown: 'abajo', ArrowLeft: 'izquierda', ArrowRight: 'derecha' };
    if (flechas[e.key]) { e.preventDefault(); this.presionar('flecha', flechas[e.key]); } else if ('1234'.includes(e.key) && e.key.length === 1) this.presionar('cuantas', e.key);
    else if (e.key === 'Enter') this.presionar('mover');
  },

  // --- animación ---

  tick(t) {
    if (this.robot) this.robot.userData.bola.scale.setScalar(1 + 0.25 * Math.sin(t / 250));
    // ondas de la presa y gotas de la salpicadura
    if (this.meta.visible) {
      this.meta.userData.ondas.forEach((o) => {
        const k = ((t / 1600) + o.userData.fase) % 1;
        o.scale.setScalar(1 + k * 4.5);
        o.material.opacity = 0.7 * (1 - k);
      });
    }
    if (this.salpicadura) {
      const st = (performance.now() - this.salpicadura.t0) / 1000;
      const pos = this.gotas.geometry.attributes.position;
      const p = this.robot.position;
      for (let i = 0; i < pos.count; i++) {
        const [vx, vy, vz] = this.salpicadura.vel[i];
        pos.setXYZ(i, p.x + vx * st, Math.max(0.03, 0.04 + vy * st - 2.2 * st * st), p.z + vz * st);
      }
      pos.needsUpdate = true;
      if (st > 1.3) { this.salpicadura = null; this.gotas.visible = false; }
    }
    if (this.estado === 'inicio' || this.estado === 'fin') return;
    const ahora = performance.now();
    if (this.animacion) this.animar(ahora);
    if (this.revelar) {
      const r = this.revelar;
      const t = (ahora - r.inicio) / 1000;
      if (r.tipo === 'agua') {
        // Ultrón cae al agua, chisporrotea y se apaga: los ojos pasan de rojo a negro
        const k = Math.min(1, t / 1.6);
        this.robot.position.y = 0.01 - Math.min(1, t / 0.5) ** 2 * 0.05 - k * 0.22;
        this.robot.rotation.z = Math.sin(t * 25) * 0.08 * (1 - k);
        const apagado = Math.min(1, t / 1.4);
        this.robot.userData.ojos.color.setRGB(1 - apagado, 0.086 * (1 - apagado), 0.22 * (1 - apagado));
        this.robot.userData.rojo.color.copy(this.robot.userData.ojos.color);
        this.robot.userData.resplandor.visible = Math.random() > apagado;
        this.robot.visible = k < 1;
      } else {
        // escapa: sube por el rayo rojo y desaparece
        const k = Math.min(1, t / 1.1);
        this.robot.position.y = 0.01 + k * k * 0.9;
        this.robot.scale.setScalar(1 - k * 0.8);
        this.robot.rotation.y += 0.25;
        this.robot.visible = k < 1;
        this.rayo.material.opacity = 0.55 * (1 - Math.max(0, t - 1.2) / 1.5);
      }
      if (this.antenas) this.antenas.forEach((an) => { an.userData.luz.visible = Math.floor(t * 4) % 2 === 0; });
      if (ahora >= r.hasta) {
        this.robot.visible = true;
        this.robot.rotation.z = 0;
        this.robot.userData.ojos.color.setHex(0xff1638);
        this.robot.userData.rojo.color.setHex(0xff1638);
        this.robot.userData.resplandor.visible = true;
        this.rayo.visible = false;
        this.rayo.material.opacity = 0.5;
        this.revelar = null;
        this.nuevoMapa();
      }
    }
    if (this.modo === 'ronda' && ahora >= this.finRonda) {
      this.robot.visible = true;
      this.terminar();
      return;
    }
    const segundo = Math.floor(ahora / 1000);
    if (segundo !== this.ultimoSegundo) {
      this.ultimoSegundo = segundo;
      rondaComun.segundo((this.finRonda - ahora) / 1000, this.modo);
      this.dibujarPantalla();
    }
  },

  animar(ahora) {
    const a = this.animacion;
    const { camino } = a.sim;
    const k = (ahora - a.t0) / ROBOT.msPaso;
    const i = Math.floor(k);
    if (i >= camino.length) {
      const ultima = camino[camino.length - 1];
      this.robot.position.copy(this.posicion(ultima.c, ultima.f)).setY(0.01);
      // casillas pisadas (la del hoyo o la de afuera no)
      const seguras = a.sim.resultado === 'bien' || a.sim.resultado === 'meta' ? camino : camino.slice(0, -1);
      seguras.forEach((x) => this.pintarPisada(x));
      this.terminarMovimiento();
      return;
    }
    const de = i === 0 ? a.desde : camino[i - 1];
    const a1 = camino[i];
    const p0 = this.posicion(de.c, de.f);
    const p1 = this.posicion(a1.c, a1.f);
    const fr = k - i;
    this.robot.position.lerpVectors(p0, p1, fr).setY(0.01 + Math.sin(fr * Math.PI) * 0.03);
    if (i !== a.ultimo) {
      a.ultimo = i;
      sonido.paso();
      if (i > 0) this.pintarPisada(camino[i - 1]);
    }
  },

  // --- dibujo ---

  dibujarConsola() {
    pintar(this.lienzoConsola, (ctx, w, h) => {
      if (this.estado === 'inicio') {
        texto(ctx, 'El equipo te guía paso a paso hasta la presa', w / 2, h / 2, { tam: 52, peso: 600, color: COLOR.tenue, alinear: 'center' });
      } else if (this.estado === 'fin') {
        texto(ctx, 'Ronda terminada', w / 2, h / 2, { tam: 52, peso: 600, color: COLOR.tenue, alinear: 'center' });
      } else {
        texto(ctx, 'FLECHA', 150, h / 2, { tam: 40, peso: 600, color: COLOR.tenue, alinear: 'center', fuente: MONO });
        texto(ctx, 'CASILLAS', 560, h / 2, { tam: 40, peso: 600, color: COLOR.tenue, alinear: 'center', fuente: MONO });
        texto(ctx, 'INSTRUCCIÓN', 1010, h / 2, { tam: 40, peso: 600, color: COLOR.tenue, alinear: 'center', fuente: MONO });
      }
    });
    pintar(this.lienzoInstruccion, (ctx, w, h) => {
      fondoPanel(ctx, w, h, '#1e0d12');
      if (!this.flecha && !this.cuantas) {
        texto(ctx, 'elige flecha y número', w / 2, h / 2, { tam: 44, color: COLOR.tenue, alinear: 'center' });
        return;
      }
      const f = this.flecha ? FLECHAS[this.flecha] : null;
      const parte1 = f ? f.icono : '?';
      const parte2 = this.cuantas ? `${this.cuantas} ${this.cuantas === 1 ? 'casilla' : 'casillas'}` : '? casillas';
      texto(ctx, parte1, 70, h / 2, { tam: 110, peso: 700, color: f ? COLOR.acento : COLOR.tenue, alinear: 'center' });
      texto(ctx, parte2, 140, h / 2, { tam: 66, peso: 700, color: this.cuantas ? COLOR.texto : COLOR.tenue });
    });
  },

  dibujarPantalla() {
    pintar(this.pantalla, (ctx, w, h) => {
      fondoPanel(ctx, w, h, 'rgba(18, 10, 13,.96)');
      if (this.estado === 'inicio') return this.dibujarInicio(ctx, w, h);

      // barra de arriba: nombre, nivel, metas y tiempo
      texto(ctx, 'ULTRÓN · NAVEGACIÓN HACKEADA', 50, 80, { tam: 48, peso: 700 });
      texto(ctx, `Nivel ${Math.min(this.nivel, this.nivelMax)}`, 900, 80, { tam: 44, color: COLOR.tenue });
      texto(ctx, `Al agua: ${this.metas}`, w * 0.66, 80, { tam: 54, peso: 700, alinear: 'center' });
      if (this.modo === 'practica') {
        texto(ctx, 'PRÁCTICA', w - 50, 80, { tam: 54, peso: 700, color: COLOR.acento, alinear: 'right' });
      } else {
        const restante = (this.finRonda - performance.now()) / 1000;
        texto(ctx, minutos(restante), w - 50, 80, { tam: 68, peso: 700, color: restante <= 30 ? COLOR.mal : COLOR.acento, alinear: 'right', fuente: MONO });
      }
      ctx.fillStyle = 'rgba(242,244,248,.12)';
      ctx.fillRect(40, 140, w - 80, 3);

      // mapa e inicio: lo que el Operador le dice al equipo
      texto(ctx, 'SECTOR', 70, 205, { tam: 40, peso: 600, color: COLOR.tenue, fuente: MONO });
      texto(ctx, String(this.mapa.id), 70, 340, { tam: 200, peso: 800, color: COLOR.acento });
      texto(ctx, 'ULTRÓN ESTÁ EN', 390, 205, { tam: 40, peso: 600, color: COLOR.tenue, fuente: MONO });
      texto(ctx, nombreCasilla(this.inicio.c, this.inicio.f), 390, 340, { tam: 200, peso: 800 });
      ctx.fillStyle = 'rgba(242,244,248,.12)';
      ctx.fillRect(900, 175, 4, 300);

      // el estado: listo, moviendo, se hundió, llegó
      const x = 960;
      const a = this.aviso || {};
      if (this.estado === 'moviendo') {
        texto(ctx, 'Moviendo…', x, 300, { tam: 110, peso: 700, color: COLOR.tenue });
      } else if (a.tipo === 'listo') {
        texto(ctx, '¡LISTO!', x, 270, { tam: 150, peso: 800, color: COLOR.bien });
        texto(ctx, `Ahora está en ${a.donde}. Pidan la siguiente instrucción.`, x, 400, { tam: 46, color: COLOR.texto });
      } else if (a.tipo === 'meta') {
        texto(ctx, '¡CAYÓ AL AGUA!', x, 250, { tam: 110, peso: 800, color: COLOR.agua });
        if (a.gps) {
          texto(ctx, `Pista GPS · ${a.gps}`, x, 360, { tam: 58, peso: 700, color: COLOR.texto, fuente: MONO });
          texto(ctx, mision.completa() ? '¡NÚCLEO LOCALIZADO! Anoten la IP y el GPS.' : 'Anótenla en su bitácora · su copia se activa en otro sector', x, 435, { tam: 40, color: COLOR.tenue });
        } else {
          texto(ctx, `Su núcleo se apagó · +1 · ahora el nivel ${Math.min(this.nivel, this.nivelMax)}`, x, 380, { tam: 48, peso: 600, color: COLOR.texto });
        }
      } else if (a.tipo === 'hoyo' || a.tipo === 'fuera') {
        texto(ctx, '¡ESCAPÓ!', x, 270, { tam: 140, peso: 800, color: COLOR.mal });
        texto(ctx, a.tipo === 'hoyo' ? `En ${a.donde} había una antena suya y se reconectó.` : 'Se salió del sector y se reconectó.', x, 400, { tam: 46, color: COLOR.texto });
      } else if (a.tipo === 'falta') {
        texto(ctx, 'Falta algo', x, 270, { tam: 110, peso: 700, color: COLOR.acento });
        texto(ctx, 'Elige una flecha y cuántas casillas, luego Mover.', x, 400, { tam: 46, color: COLOR.texto });
      } else {
        texto(ctx, 'Díganle al equipo', x, 250, { tam: 64, peso: 700, color: COLOR.acento });
        texto(ctx, `"Sector ${this.mapa.id}, Ultrón está en ${nombreCasilla(this.inicio.c, this.inicio.f)}"`, x, 340, { tam: 62, peso: 700 });
        texto(ctx, 'Tú no ves sus antenas ni la presa: el equipo sí.', x, 425, { tam: 42, color: COLOR.tenue });
      }

      // las instrucciones de esta jugada
      ctx.fillStyle = 'rgba(242,244,248,.12)';
      ctx.fillRect(40, 500, w - 80, 3);
      texto(ctx, 'INSTRUCCIONES', 70, 565, { tam: 40, peso: 600, color: COLOR.tenue, fuente: MONO });
      let px = 420;
      if (!this.historial || !this.historial.length) {
        texto(ctx, 'todavía ninguna', px, 565, { tam: 44, color: COLOR.tenue });
      } else {
        this.historial.slice(-8).forEach((p) => {
          const color = p.resultado === null ? COLOR.tenue : p.resultado === 'bien' || p.resultado === 'meta' ? COLOR.bien : COLOR.mal;
          const marca = p.resultado === null ? '…' : p.resultado === 'bien' || p.resultado === 'meta' ? '✓' : '✗';
          const etiqueta = `${FLECHAS[p.flecha].icono} ${p.cuantas} ${marca}`;
          ctx.font = `700 52px ${MONO}`;
          const ancho = ctx.measureText(etiqueta).width + 44;
          rectRedondo(ctx, px, 530, ancho, 72, 16);
          ctx.fillStyle = '#1e0d12';
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = color;
          ctx.stroke();
          texto(ctx, etiqueta, px + 22, 567, { tam: 52, peso: 700, color, fuente: MONO });
          px += ancho + 18;
        });
      }
      texto(ctx, `IP de Ultrón: ${mision.ipTexto()}   ·   GPS: ${mision.gpsTexto()}`, w / 2, h - 70, { tam: 40, color: COLOR.tenue, alinear: 'center', fuente: MONO });
      return null;
    });
  },

  dibujarInicio(ctx, w, h) {
    texto(ctx, 'CODEXIA · GHOST NETWORK · MISIÓN FINAL DEL TALLER', w / 2, 80, { tam: 40, peso: 700, color: COLOR.acento, alinear: 'center' });
    texto(ctx, '¡Lleven a Ultrón al agua!', w / 2, 180, { tam: 100, peso: 800, alinear: 'center' });
    texto(ctx, 'Con su IP hackearon su navegación. Si cae en la presa, su núcleo se apaga.', w / 2, 275, { tam: 46, color: COLOR.tenue, alinear: 'center' });
    const pasos = [
      '1. Dile al equipo el SECTOR y dónde está Ultrón: "Sector 3, está en B5".',
      '2. El equipo ve el mapa y te dicta UNA instrucción: "dos hacia arriba".',
      '3. Elige flecha y casillas, toca Mover y contesta "¡listo!".',
      '4. Si pisa una antena suya, se reconecta y escapa. En la presa: ¡al agua!',
    ];
    pasos.forEach((p, i) => texto(ctx, p, 230, 365 + i * 62, { tam: 44, peso: 500 }));
    texto(ctx, `1.ª vez al agua = LATITUD · 2.ª vez = LONGITUD   ·   IP: ${mision.ipTexto()}`, w / 2, h - 75, { tam: 38, color: COLOR.acento, alinear: 'center', fuente: MONO });
  },

  dibujarResultado() {
    pintar(this.lienzoResultado, (ctx, w, h) => dibujarFinalRonda(ctx, w, h, {
      practica: this.modo === 'practica',
      puntaje: this.metas,
      unidad: this.metas === 1 ? 'vez que Ultrón cayó al agua' : 'veces que Ultrón cayó al agua',
      detalle: `Nivel alcanzado: ${Math.min(this.nivel, this.nivelMax)} · Escapó: ${this.hundidos} · Instrucciones: ${this.instrucciones}`,
      registro: this.registro,
    }));
  },
});
