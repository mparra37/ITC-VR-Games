/* Enlace VR · Programa al robot (modo relevo, individual)
 *
 * El Operador juega solo: en un tablero de 5 × 5 hay un robot, cajas y una meta. Con los bloques de la
 * consola (Avanza, Gira a la izquierda, Gira a la derecha y, desde el nivel 3, ×2 / ×3 = repite el
 * siguiente bloque) arma el programa y lo ejecuta. Si el robot llega a la meta suena una fanfarria
 * fuerte ("¡SIGUIENTE!") que oye todo el salón: el visor pasa al siguiente compañero, que recibe un
 * reto más difícil. Cada turno dura 90 s; si se acaba, suena la chicharra y también pasa el visor.
 * El equipo tiene 8 minutos en total; el puntaje es cuántos retos resolvieron.
 * Datos: js/programa_datos.js (lo genera prototipo_papel/generar_programa.py a partir de programa_robot.json).
 */
/* global AFRAME, THREE, COLOR, MONO, texto, fondoPanel, minutos, pintar, rectRedondo, sonido, crearEntidad, refrescarApuntadores, irA, marcador, rondaComun, dibujarFinalRonda, musica */

const PROG = {
  celda: 0.38,
  tablero: { x: 0, y: 0.55, z: -2.5, inclinacion: 0.3 },
  msPaso: 450,
};

// direcciones: 0 = al fondo, 1 = a la derecha, 2 = hacia el jugador, 3 = a la izquierda
const MOV = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const BLOQUES = {
  A: { icono: '↑', nombre: 'Avanza' },
  I: { icono: '↶', nombre: 'Gira a la izquierda' },
  D: { icono: '↷', nombre: 'Gira a la derecha' },
  x2: { icono: '×2', nombre: 'Repite 2 veces el siguiente' },
  x3: { icono: '×3', nombre: 'Repite 3 veces el siguiente' },
};

const azar = (n) => Math.floor(Math.random() * n);
const clave = (c, f) => `${c},${f}`;

/** Expande ×2 / ×3: repiten el bloque que sigue. */
function expandirPrograma(bloques) {
  const pasos = [];
  for (let i = 0; i < bloques.length; i++) {
    const b = bloques[i];
    if (b === 'x2' || b === 'x3') {
      const sig = bloques[i + 1];
      if (sig && sig !== 'x2' && sig !== 'x3') {
        for (let k = 0; k < (b === 'x2' ? 2 : 3); k++) pasos.push(sig);
        i += 1;
      }
    } else {
      pasos.push(b);
    }
  }
  return pasos;
}

/** Bloques que ocupa una solución si se usan ×2 / ×3 para los "Avanza" seguidos. */
function bloquesComprimidos(pasos) {
  let total = 0;
  for (let i = 0; i < pasos.length;) {
    let j = i;
    while (j < pasos.length && pasos[j] === pasos[i]) j += 1;
    let corrida = j - i;
    while (corrida > 0) {
      if (corrida >= 3) { total += 2; corrida -= 3; } else if (corrida === 2) { total += 2; corrida = 0; } else { total += 1; corrida = 0; }
    }
    i = j;
  }
  return total;
}

/** Camino más corto (en pasos A/I/D) de inicio a meta, o null. */
function resolver(reto) {
  const n = reto.n;
  const inicio = [reto.inicio.c, reto.inicio.f, reto.inicio.d];
  const visto = new Map([[inicio.join(), null]]);
  const cola = [inicio];
  while (cola.length) {
    const [c, f, d] = cola.shift();
    if (c === reto.meta.c && f === reto.meta.f) {
      const pasos = [];
      let k = [c, f, d].join();
      while (visto.get(k)) {
        const [previo, accion] = visto.get(k);
        pasos.unshift(accion);
        k = previo;
      }
      return pasos;
    }
    const opciones = [['A', c + MOV[d][0], f + MOV[d][1], d], ['I', c, f, (d + 3) % 4], ['D', c, f, (d + 1) % 4]];
    opciones.forEach(([accion, c2, f2, d2]) => {
      if (c2 < 0 || f2 < 0 || c2 >= n || f2 >= n || reto.cajas.has(clave(c2, f2))) return;
      const k2 = [c2, f2, d2].join();
      if (!visto.has(k2)) {
        visto.set(k2, [[c, f, d].join(), accion]);
        cola.push([c2, f2, d2]);
      }
    });
  }
  return null;
}

/** Un reto al azar del nivel que tenga solución con las reglas del nivel. */
function generarReto(datos, nivel) {
  const N = datos.niveles[Math.min(nivel, datos.niveles.length) - 1];
  const n = datos.tablero;
  for (let intento = 0; intento < 3000; intento++) {
    const inicio = { c: azar(n), f: azar(n), d: azar(4) };
    const meta = { c: azar(n), f: azar(n) };
    if (meta.c === inicio.c && meta.f === inicio.f) continue;
    const cajas = new Set();
    while (cajas.size < N.obstaculos) {
      const c = azar(n);
      const f = azar(n);
      if ((c === inicio.c && f === inicio.f) || (c === meta.c && f === meta.f)) continue;
      cajas.add(clave(c, f));
    }
    const reto = { n, inicio, meta, cajas, nivel };
    const pasos = resolver(reto);
    if (!pasos || pasos.length < N.pasos_min || pasos.length > N.pasos_max) continue;
    if (pasos.filter((p) => p !== 'A').length < N.giros_min) continue;
    reto.solucion = pasos;
    reto.repetir = N.repetir;
    reto.limite = (N.repetir ? bloquesComprimidos(pasos) : pasos.length) + N.holgura;
    return reto;
  }
  throw new Error('No se pudo generar un reto');
}

/** Corre el programa: lista de estados y cómo termina ('meta', 'choque' o 'corto'). */
function simularPrograma(reto, bloques) {
  let { c, f, d } = reto.inicio;
  const estados = [{ c, f, d }];
  for (const p of expandirPrograma(bloques)) {
    if (p === 'I') d = (d + 3) % 4;
    else if (p === 'D') d = (d + 1) % 4;
    else {
      const c2 = c + MOV[d][0];
      const f2 = f + MOV[d][1];
      if (c2 < 0 || f2 < 0 || c2 >= reto.n || f2 >= reto.n || reto.cajas.has(clave(c2, f2))) {
        estados.push({ c, f, d, choque: true });
        return { estados, resultado: 'choque' };
      }
      c = c2;
      f = f2;
    }
    estados.push({ c, f, d });
    if (c === reto.meta.c && f === reto.meta.f) return { estados, resultado: 'meta' };
  }
  return { estados, resultado: 'corto' };
}

// ---------- modelos 3D ----------

function crearRobotGrande() {
  const robot = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xdfe7ff, metalness: 0.4, roughness: 0.35 });
  const oscuro = new THREE.MeshStandardMaterial({ color: 0x1b2a55, metalness: 0.5, roughness: 0.5 });
  const brillo = new THREE.MeshBasicMaterial({ color: 0x5aa9ff });
  const caja = (w, h, p, mat, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, p), mat); m.position.y = y; return m; };
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.03, 28), oscuro);
  base.position.y = 0.015;
  const cuerpo = caja(0.17, 0.14, 0.13, metal, 0.11);
  const cabeza = caja(0.14, 0.1, 0.12, metal, 0.24);
  const visor = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.035), brillo);
  visor.position.set(0, 0.245, -0.061);
  visor.rotation.y = Math.PI;
  const antena = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 8), oscuro);
  antena.position.y = 0.325;
  const bola = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), brillo);
  bola.position.y = 0.365;
  // flecha en el piso: hacia dónde mira (el frente es -z)
  const forma = new THREE.Shape();
  forma.moveTo(0, -0.07);
  forma.lineTo(0.05, 0);
  forma.lineTo(-0.05, 0);
  forma.closePath();
  const flecha = new THREE.Mesh(new THREE.ShapeGeometry(forma), brillo);
  flecha.rotation.x = -Math.PI / 2;
  flecha.position.set(0, 0.032, -0.12);
  robot.add(base, cuerpo, cabeza, visor, antena, bola, flecha);
  return robot;
}

// ---------- el juego ----------

AFRAME.registerComponent('programa-robot', {
  init() {
    this.datos = window.PROGRAMA;
    this.estado = 'inicio';
    this.programa = [];
    this.botones = { inicio: [], turno: [], cambio: [], fin: [] };
    this.construir();
    this.el.sceneEl.addEventListener('boton-presionado', (e) => this.presionar(e.detail.accion, e.detail.valor));
    window.addEventListener('keydown', (e) => this.teclaFisica(e));
    // en la computadora, mirar un poco hacia abajo para ver tablero y consola
    this.el.sceneEl.addEventListener('loaded', () => {
      const lc = document.querySelector('[camera]').components['look-controls'];
      if (lc && !this.el.sceneEl.is('vr-mode')) lc.pitchObject.rotation.x = -0.32;
    });
    this.mostrar('inicio');
    window.juego = this; // para probar desde la consola
  },

  construir() {
    const T = PROG.tablero;
    const n = this.datos.tablero;
    const lado = PROG.celda * n;
    this.tablero = new THREE.Group();
    this.tablero.position.set(T.x, T.y, T.z);
    this.tablero.rotation.x = T.inclinacion;
    this.el.object3D.add(this.tablero);
    const mesa = new THREE.Mesh(new THREE.BoxGeometry(lado + 0.24, 0.06, lado + 0.24), new THREE.MeshStandardMaterial({ color: 0x16233a, roughness: 0.6, metalness: 0.4 }));
    mesa.position.y = -0.035;
    this.tablero.add(mesa);
    this.celdas = [];
    for (let f = 0; f < n; f++) {
      for (let c = 0; c < n; c++) {
        const mat = new THREE.MeshStandardMaterial({ color: (c + f) % 2 ? 0x0f1d33 : 0x13233d, roughness: 0.8 });
        const m = new THREE.Mesh(new THREE.BoxGeometry(PROG.celda - 0.02, 0.012, PROG.celda - 0.02), mat);
        m.position.copy(this.posicion(c, f));
        this.tablero.add(m);
        this.celdas.push({ c, f, mat, base: mat.color.getHex() });
      }
    }
    const lineas = [];
    for (let i = 0; i <= n; i++) {
      const p = -lado / 2 + i * PROG.celda;
      lineas.push(p, 0.008, -lado / 2, p, 0.008, lado / 2, -lado / 2, 0.008, p, lado / 2, 0.008, p);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(lineas, 3));
    this.tablero.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x5aa9ff, transparent: true, opacity: 0.35 })));
    this.grupoCajas = new THREE.Group();
    this.tablero.add(this.grupoCajas);
    // meta: aro brillante y banderín
    this.meta = new THREE.Group();
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.018, 8, 40), new THREE.MeshBasicMaterial({ color: 0x3ddc97 }));
    aro.rotation.x = -Math.PI / 2;
    aro.position.y = 0.02;
    const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 8), new THREE.MeshStandardMaterial({ color: 0xc9ced6 }));
    asta.position.set(0.08, 0.18, 0.08);
    const banderin = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.08), new THREE.MeshBasicMaterial({ color: 0x3ddc97, side: THREE.DoubleSide }));
    banderin.position.set(0.14, 0.31, 0.08);
    this.meta.add(aro, asta, banderin);
    this.meta.userData.aro = aro;
    this.tablero.add(this.meta);
    this.robot = crearRobotGrande();
    this.tablero.add(this.robot);

    // pantalla grande arriba del tablero: reloj del turno, relevo y mensajes
    this.pantalla = crearEntidad(this.el, { lienzo: 'ancho: 2.4; alto: 0.62', position: '0 1.92 -3.7' });
    // pantalla final (puntaje y código)
    this.lienzoResultado = crearEntidad(this.el, { lienzo: 'ancho: 1.5; alto: 0.66', position: '0 1.75 -3.0', visible: false });

    // consola baja (como en las piernas) con el programa y los bloques: no tapa el tablero
    this.consola = crearEntidad(this.el, { position: '0 0.5 -0.66', rotation: '-55 0 0' });
    crearEntidad(this.consola, { geometry: 'primitive: plane; width: 1.34; height: 0.64', material: 'shader: flat; color: #5AA9FF; opacity: 0.35; transparent: true', position: '0 0 -0.012' });
    crearEntidad(this.consola, { geometry: 'primitive: plane; width: 1.3; height: 0.6', material: 'shader: flat; color: #06080D; opacity: 0.95; transparent: true', position: '0 0 -0.008' });
    this.lienzoPrograma = crearEntidad(this.consola, { lienzo: 'ancho: 1.26; alto: 0.22', position: '0 0.18 0' });
    const b = (grupo, textoBoton, x, y, ancho, accion, valor = '', estilo = 'tecla', alto = 0.11) => {
      const el = crearEntidad(this.consola, { position: `${x} ${y} 0.01`, boton: { texto: textoBoton, ancho, alto, accion, valor, estilo }, visible: false });
      this.botones[grupo].push(el);
      return el;
    };
    this.bloqueA = b('turno', '↑ Avanza', -0.48, -0.02, 0.28, 'bloque', 'A');
    b('turno', '↶ Izquierda', -0.17, -0.02, 0.28, 'bloque', 'I');
    b('turno', '↷ Derecha', 0.14, -0.02, 0.28, 'bloque', 'D');
    this.bloqueX2 = b('turno', '×2', 0.38, -0.02, 0.15, 'bloque', 'x2');
    this.bloqueX3 = b('turno', '×3', 0.55, -0.02, 0.15, 'bloque', 'x3');
    b('turno', '⌫ Borrar', -0.45, -0.18, 0.32, 'borrar');
    b('turno', 'Limpiar', -0.1, -0.18, 0.3, 'limpiar');
    this.botonEjecutar = b('turno', '▶ Ejecutar', 0.36, -0.18, 0.46, 'ejecutar', '', 'principal');
    b('inicio', 'Práctica', -0.42, -0.08, 0.36, 'practicar', '', 'tecla', 0.14);
    b('inicio', 'Empezar relevo · 8 min', 0.05, -0.08, 0.52, 'empezar', '', 'principal', 0.14);
    b('inicio', 'Menú', 0.48, -0.08, 0.26, 'menu', '', 'tecla', 0.14);
    b('cambio', '¡Listo! Empezar mi turno', 0, -0.08, 0.8, 'siguiente', '', 'principal', 0.16);
    b('fin', 'Nueva ronda', -0.3, -0.08, 0.5, 'nueva', '', 'principal', 0.14);
    b('fin', 'Menú de juegos', 0.3, -0.08, 0.5, 'menu', '', 'tecla', 0.14);
    this.botonTerminar = b('turno', 'Terminar', 0.5, 0.26, 0.22, 'terminar', '', 'tecla', 0.07);
  },

  posicion(c, f) {
    const n = this.datos.tablero;
    return new THREE.Vector3((c - (n - 1) / 2) * PROG.celda, 0, (f - (n - 1) / 2) * PROG.celda);
  },

  colocarRobot({ c, f, d }) {
    this.robot.position.copy(this.posicion(c, f)).setY(0.012);
    this.robot.rotation.y = -d * Math.PI / 2;
  },

  mostrar(nombre) {
    this.estado = nombre;
    Object.entries(this.botones).forEach(([grupo, lista]) => {
      lista.forEach((el) => {
        let si = grupo === nombre;
        if (el === this.botonTerminar) si = nombre === 'turno' && this.modo === 'practica';
        if ((el === this.bloqueX2 || el === this.bloqueX3) && nombre === 'turno') si = Boolean(this.reto && this.reto.repetir);
        el.setAttribute('visible', si);
        el.classList.toggle('clickable', si);
      });
    });
    this.lienzoResultado.setAttribute('visible', nombre === 'fin');
    this.pantalla.setAttribute('visible', nombre !== 'fin');
    refrescarApuntadores();
    this.dibujarPrograma();
    this.dibujarPantalla();
  },

  // --- flujo ---

  empezar(modo) {
    this.modo = modo;
    this.resueltos = 0;
    this.intentos = 0;
    this.sinResolver = 0;
    this.turnoNum = 1;
    this.finRonda = performance.now() + this.datos.minutos_ronda * 60 * 1000;
    rondaComun.empezar(modo);
    this.nuevoTurno();
  },

  nivel() {
    return Math.min(this.datos.niveles.length, this.resueltos + 1);
  },

  nuevoTurno() {
    this.reto = generarReto(this.datos, this.nivel());
    this.programa = [];
    this.animacion = null;
    this.mensaje = null;
    this.finTurno = performance.now() + this.datos.segundos_turno * 1000;
    this.dibujarTablero();
    this.colocarRobot(this.reto.inicio);
    this.mostrar('turno');
  },

  dibujarTablero() {
    while (this.grupoCajas.children.length) this.grupoCajas.remove(this.grupoCajas.children[0]);
    const matCaja = new THREE.MeshStandardMaterial({ color: 0x8a6a3c, roughness: 0.8 });
    const orilla = new THREE.LineBasicMaterial({ color: 0x3a2a14 });
    const geo = new THREE.BoxGeometry(PROG.celda * 0.72, PROG.celda * 0.6, PROG.celda * 0.72);
    this.reto.cajas.forEach((k) => {
      const [c, f] = k.split(',').map(Number);
      const m = new THREE.Mesh(geo, matCaja);
      m.position.copy(this.posicion(c, f)).setY(PROG.celda * 0.3);
      const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo), orilla);
      l.position.copy(m.position);
      this.grupoCajas.add(m, l);
    });
    this.meta.position.copy(this.posicion(this.reto.meta.c, this.reto.meta.f));
    this.celdas.forEach((x) => x.mat.color.setHex(x.base));
  },

  ejecutar() {
    if (!this.programa.length) {
      this.avisar('Primero arma el programa con los bloques', COLOR.acento);
      return;
    }
    this.intentos += 1;
    const sim = simularPrograma(this.reto, this.programa);
    this.celdas.forEach((x) => x.mat.color.setHex(x.base));
    this.animacion = { sim, i: 0, t0: performance.now() };
    this.mensaje = { texto: 'Ejecutando…', color: COLOR.tenue };
    this.dibujarPantalla();
  },

  terminarAnimacion() {
    const { sim } = this.animacion;
    this.animacion = null;
    if (sim.resultado === 'meta') {
      this.resueltos += 1;
      this.fanfarria();
      this.mensajeCambio = { exito: true, texto: '¡Llegó a la meta!' };
      this.pasarVisor();
      return;
    }
    sonido.mal();
    this.mensaje = sim.resultado === 'choque'
      ? { texto: '¡Choque! Corrige el programa y vuelve a intentar.', color: COLOR.mal }
      : { texto: 'No llegó a la meta. Agrega o cambia bloques.', color: COLOR.mal };
    setTimeout(() => {
      if (this.estado === 'turno' && !this.animacion) this.colocarRobot(this.reto.inicio);
    }, 900);
    this.dibujarPantalla();
  },

  /** Termina el turno: la pantalla pide pasar el visor; el siguiente presiona "Empezar mi turno". */
  pasarVisor() {
    if (this.modo === 'practica' && !this.mensajeCambio.exito) {
      this.nuevoTurno();
      return;
    }
    this.mostrar('cambio');
  },

  siguiente() {
    this.turnoNum += 1;
    this.nuevoTurno();
  },

  terminar() {
    this.animacion = null;
    rondaComun.terminar();
    sonido.fin();
    const practica = this.modo === 'practica';
    this.registro = practica ? null : marcador.registrar('programa', this.resueltos, `nivel ${this.nivel()} · turnos ${this.turnoNum} · intentos ${this.intentos}`, () => this.dibujarResultado());
    this.dibujarResultado();
    this.mostrar('fin');
  },

  // --- sonidos ---

  /** Fanfarria fuerte para que todo el salón sepa que toca pasar el visor. */
  fanfarria() {
    [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36]].forEach(([f, r]) => sonido.tono(f, 0.22, 'square', 0.16, r));
    [1047, 1319, 1568].forEach((f) => sonido.tono(f, 0.7, 'triangle', 0.14, 0.52));
    if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
      const voces = window.speechSynthesis.getVoices();
      const voz = voces.find((v) => v.lang && v.lang.startsWith('es'));
      if (voz) {
        const u = new SpeechSynthesisUtterance('¡Siguiente!');
        u.voice = voz;
        u.lang = voz.lang;
        u.rate = 1.05;
        setTimeout(() => window.speechSynthesis.speak(u), 1100);
      }
    }
  },

  chicharra() {
    sonido.tono(160, 0.5, 'sawtooth', 0.14);
    sonido.tono(120, 0.6, 'sawtooth', 0.14, 0.5);
  },

  // --- entrada ---

  presionar(accion, valor) {
    if (accion === 'menu') return irA('index.html');
    if (accion === 'empezar' || accion === 'practicar') return this.empezar(accion === 'practicar' ? 'practica' : 'ronda');
    if (accion === 'nueva') return this.mostrar('inicio');
    if (accion === 'siguiente' && this.estado === 'cambio') return this.siguiente();
    if (this.estado !== 'turno' || this.animacion) return null;
    if (accion === 'terminar') return this.terminar();
    sonido.tecla();
    if (accion === 'bloque') {
      if ((valor === 'x2' || valor === 'x3') && !this.reto.repetir) return null;
      const ultimo = this.programa[this.programa.length - 1];
      if ((valor === 'x2' || valor === 'x3') && (ultimo === 'x2' || ultimo === 'x3')) this.programa.pop();
      if (this.programa.length >= this.reto.limite) {
        this.avisar(`Máximo ${this.reto.limite} bloques en este reto`, COLOR.mal);
        return null;
      }
      this.programa.push(valor);
    }
    if (accion === 'borrar') this.programa.pop();
    if (accion === 'limpiar') this.programa = [];
    if (accion === 'ejecutar') this.ejecutar();
    this.colocarRobot(this.reto.inicio);
    this.dibujarPrograma();
    return null;
  },

  /** En la computadora: flechas = bloques, 2 y 3 = ×2 / ×3, Retroceso = borrar, Enter = ejecutar o siguiente turno. */
  teclaFisica(e) {
    const mapa = { ArrowUp: 'A', ArrowLeft: 'I', ArrowRight: 'D', 2: 'x2', 3: 'x3' };
    if (e.key === 'Enter' && this.estado === 'cambio') return this.presionar('siguiente');
    if (this.estado !== 'turno') return null;
    if (mapa[e.key]) {
      e.preventDefault();
      return this.presionar('bloque', mapa[e.key]);
    }
    if (e.key === 'Backspace') return this.presionar('borrar');
    if (e.key === 'Enter') return this.presionar('ejecutar');
    return null;
  },

  avisar(t, color) {
    this.mensaje = { texto: t, color };
    this.dibujarPantalla();
  },

  // --- cada cuadro ---

  tick(t) {
    const ahora = performance.now();
    this.meta.userData.aro.scale.setScalar(1 + Math.sin(t / 300) * 0.08);
    if (this.animacion) {
      const a = this.animacion;
      const i = Math.floor((ahora - a.t0) / PROG.msPaso);
      if (i !== a.i && i < a.sim.estados.length) {
        a.i = i;
        const e = a.sim.estados[i];
        this.colocarRobot(e);
        const celda = this.celdas.find((x) => x.c === e.c && x.f === e.f);
        if (celda) celda.mat.color.setHex(0x1c3a66);
        if (e.choque) {
          this.robot.position.add(new THREE.Vector3(MOV[e.d][0], 0, MOV[e.d][1]).multiplyScalar(PROG.celda * 0.25));
          sonido.tono(90, 0.25, 'square', 0.12);
        } else sonido.paso();
      }
      if (ahora - a.t0 > a.sim.estados.length * PROG.msPaso + 250) this.terminarAnimacion();
    }
    if (this.estado === 'turno' || this.estado === 'cambio') {
      if (this.modo === 'ronda' && ahora >= this.finRonda) {
        this.terminar();
        return;
      }
      if (this.estado === 'turno' && this.modo === 'ronda' && ahora >= this.finTurno && !this.animacion) {
        this.sinResolver += 1;
        this.chicharra();
        this.mensajeCambio = { exito: false, texto: '¡Se acabó tu tiempo!' };
        this.pasarVisor();
      }
      const s = Math.floor(ahora / 1000);
      if (s !== this.ultimoSegundo) {
        this.ultimoSegundo = s;
        if (this.modo === 'ronda') rondaComun.segundo((this.finRonda - ahora) / 1000, this.modo);
        this.dibujarPantalla();
      }
    }
  },

  // --- dibujo ---

  dibujarPrograma() {
    pintar(this.lienzoPrograma, (ctx, w, h) => {
      if (this.estado !== 'turno' || !this.reto) {
        texto(ctx, this.estado === 'inicio' ? 'Arma el programa con los bloques y presiona ▶ Ejecutar' : '', w / 2, h / 2, { tam: 40, color: COLOR.tenue, alinear: 'center' });
        return;
      }
      const limite = this.reto.limite;
      texto(ctx, `TU PROGRAMA · ${this.programa.length} de ${limite} bloques`, 20, h * 0.16, { tam: 30, peso: 600, color: COLOR.tenue });
      const lado = Math.min(96, (w - 40) / limite - 8);
      for (let i = 0; i < limite; i++) {
        const x = 20 + i * (lado + 8);
        const y = h * 0.34;
        rectRedondo(ctx, x, y, lado, lado, 14);
        const b = this.programa[i];
        ctx.fillStyle = b ? (b === 'x2' || b === 'x3' ? '#2A4670' : '#13233D') : 'rgba(242,244,248,.04)';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = b ? COLOR.acento : 'rgba(242,244,248,.18)';
        ctx.stroke();
        if (b) texto(ctx, BLOQUES[b].icono, x + lado / 2, y + lado / 2 + 3, { tam: lado * 0.55, peso: 700, alinear: 'center', color: b.startsWith('x') ? COLOR.acento : COLOR.texto });
      }
    });
  },

  dibujarPantalla() {
    pintar(this.pantalla, (ctx, w, h) => {
      fondoPanel(ctx, w, h, 'rgba(12,22,40,.95)');
      if (this.estado === 'inicio') {
        texto(ctx, 'ENLACE VR · RELEVO', w / 2, h * 0.14, { tam: 46, peso: 600, color: COLOR.acento, alinear: 'center' });
        texto(ctx, 'Programa al robot', w / 2, h * 0.36, { tam: 120, peso: 700, alinear: 'center' });
        texto(ctx, 'Lleva al robot a la meta con bloques de programa. Cuando lo logres, suena "¡SIGUIENTE!" y pasas el visor.', w / 2, h * 0.6, { tam: 44, color: COLOR.texto, alinear: 'center' });
        texto(ctx, `Cada turno: ${this.datos.segundos_turno} s · Todo el equipo: ${this.datos.minutos_ronda} min · Cada reto resuelto es más difícil`, w / 2, h * 0.78, { tam: 38, color: COLOR.tenue, alinear: 'center' });
        texto(ctx, 'Los bloques están en la consola de abajo (mira hacia tus piernas)', w / 2, h * 0.92, { tam: 34, color: COLOR.tenue, alinear: 'center' });
        return;
      }
      if (this.estado === 'cambio') {
        const exito = this.mensajeCambio.exito;
        texto(ctx, exito ? '¡SIGUIENTE!' : '¡TIEMPO!', w / 2, h * 0.24, { tam: 150, peso: 700, color: exito ? COLOR.bien : COLOR.mal, alinear: 'center' });
        texto(ctx, `${this.mensajeCambio.texto}  Pasa el visor con las dos manos.`, w / 2, h * 0.5, { tam: 56, peso: 600, alinear: 'center' });
        texto(ctx, `Retos resueltos: ${this.resueltos} · Siguiente: nivel ${this.nivel()}`, w / 2, h * 0.68, { tam: 46, color: COLOR.tenue, alinear: 'center' });
        if (this.modo === 'ronda') texto(ctx, `Tiempo del equipo: ${minutos((this.finRonda - performance.now()) / 1000)}`, w / 2, h * 0.84, { tam: 46, peso: 600, color: COLOR.acento, alinear: 'center' });
        return;
      }
      // turno
      const ahora = performance.now();
      texto(ctx, `TURNO ${this.turnoNum} · NIVEL ${this.reto.nivel}`, 40, h * 0.16, { tam: 44, peso: 700, color: COLOR.acento });
      texto(ctx, `Resueltos: ${this.resueltos}`, w * 0.5, h * 0.16, { tam: 44, peso: 600, alinear: 'center' });
      if (this.modo === 'ronda') {
        texto(ctx, `Equipo ${minutos((this.finRonda - ahora) / 1000)}`, w - 40, h * 0.16, { tam: 44, peso: 600, color: COLOR.tenue, alinear: 'right' });
        const resta = Math.max(0, (this.finTurno - ahora) / 1000);
        texto(ctx, `${Math.ceil(resta)}`, w * 0.12, h * 0.58, { tam: 170, peso: 700, color: resta <= 15 ? COLOR.mal : COLOR.texto, alinear: 'center', fuente: MONO });
        texto(ctx, 'seg', w * 0.12, h * 0.86, { tam: 36, color: COLOR.tenue, alinear: 'center' });
      } else {
        texto(ctx, 'PRÁCTICA', w - 40, h * 0.16, { tam: 44, peso: 700, color: COLOR.acento, alinear: 'right' });
      }
      const instrucciones = this.reto.repetir
        ? 'Lleva al robot a la meta verde. ×2 y ×3 repiten el bloque que sigue.'
        : 'Lleva al robot a la meta verde sin chocar con las cajas.';
      texto(ctx, instrucciones, w * 0.58, h * 0.45, { tam: 46, peso: 600, alinear: 'center' });
      if (this.mensaje) texto(ctx, this.mensaje.texto, w * 0.58, h * 0.72, { tam: 48, peso: 600, color: this.mensaje.color, alinear: 'center' });
      else texto(ctx, 'La flecha azul del robot marca hacia dónde mira.', w * 0.58, h * 0.72, { tam: 40, color: COLOR.tenue, alinear: 'center' });
    });
  },

  dibujarResultado() {
    const practica = this.modo === 'practica';
    pintar(this.lienzoResultado, (ctx, w, h) => dibujarFinalRonda(ctx, w, h, {
      practica,
      puntaje: this.resueltos,
      unidad: this.resueltos === 1 ? 'reto resuelto por el equipo' : 'retos resueltos por el equipo',
      detalle: `Nivel alcanzado: ${this.nivel()} · Turnos: ${this.turnoNum} · Sin resolver: ${this.sinResolver}`,
      registro: this.registro,
    }));
  },
});
