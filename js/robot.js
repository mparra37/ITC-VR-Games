/* Enlace VR · Robot programado
 *
 * El Operador ve un tablero de 4 x 4 con un robot, el número de programa,
 * la casilla de inicio y hacia dónde mira el robot. Los decodificadores tienen
 * los programas en el Manual de campo, los siguen en su tablero de papel y
 * gritan en qué casilla termina. El Operador toca esa casilla y presiona Enviar.
 *
 * Ronda de 3 minutos, +1 por acierto, bloqueo de 5 segundos al fallar o saltar,
 * sube de nivel cada 5 aciertos (nivel 3 = programas con "Repite").
 * Al acertar, el robot recorre el programa en el tablero para que todos vean por qué.
 */
/* global AFRAME, THREE, COLOR, texto, fondoPanel, minutos, pintar, rectRedondo, sonido, crearEntidad, refrescarApuntadores, marcador, rondaComun, dibujarFinalRonda */

const CONFIG = {
  segundosRonda: 180,
  segundosBloqueo: 5,
  aciertosPorNivel: 5,
  nivelMaximo: 3,
  casilla: 0.17, // metros
  msPorPaso: 230,
};

// fila 1 = ARRIBA (lejos del jugador), columna A = izquierda
const DIRECCIONES = [
  { nombre: 'arriba', flecha: '↑', dc: 0, df: -1 },
  { nombre: 'la derecha', flecha: '→', dc: 1, df: 0 },
  { nombre: 'abajo', flecha: '↓', dc: 0, df: 1 },
  { nombre: 'la izquierda', flecha: '←', dc: -1, df: 0 },
];
const COLUMNAS = 'ABCD';
const nombreCasilla = (c, f) => `${COLUMNAS[c]}${f + 1}`;

// ---------- lógica del robot (igual que en generar_robot.py) ----------

/** Convierte los pasos del programa en acciones sueltas: 'A' (avanza 1), 'D' o 'I'. */
function expandir(pasos) {
  const acciones = [];
  pasos.forEach((p) => {
    if (typeof p === 'string') {
      if (p[0] === 'A') for (let i = 0; i < Number(p.slice(1)); i++) acciones.push('A');
      else acciones.push(p);
    } else {
      for (let i = 0; i < p.repite; i++) acciones.push(...expandir(p.pasos));
    }
  });
  return acciones;
}

/** Sigue el programa desde el inicio. Si va a chocar con la orilla, se queda en su lugar. */
function simular(pasos, inicio) {
  let { c, f, d } = inicio;
  const estados = [{ c, f, d }];
  let bloqueados = 0;
  expandir(pasos).forEach((accion) => {
    if (accion === 'A') {
      const nc = c + DIRECCIONES[d].dc;
      const nf = f + DIRECCIONES[d].df;
      if (nc >= 0 && nc < 4 && nf >= 0 && nf < 4) { c = nc; f = nf; } else bloqueados += 1;
    } else if (accion === 'D') {
      d = (d + 1) % 4;
    } else if (accion === 'I') {
      d = (d + 3) % 4;
    }
    estados.push({ c, f, d });
  });
  return { estados, final: { c, f, d }, bloqueados };
}

/** Un reto al azar del nivel: programa + casilla de inicio + dirección. */
function generarReto(nivel, anterior) {
  const programas = window.ROBOT_PROGRAMAS.filter((p) => p.nivel === nivel);
  const azar = (n) => Math.floor(Math.random() * n);
  for (let intento = 0; intento < 500; intento++) {
    const programa = programas[azar(programas.length)];
    const inicio = { c: azar(4), f: azar(4), d: azar(4) };
    const r = simular(programa.pasos, inicio);
    const maxChoques = nivel === 1 ? 0 : 1;
    const seMovio = r.final.c !== inicio.c || r.final.f !== inicio.f;
    const repetido = anterior && anterior.programa.id === programa.id;
    if (r.bloqueados <= maxChoques && (seMovio || nivel > 1) && !repetido) {
      return { programa, inicio, final: r.final, estados: r.estados };
    }
  }
  const programa = programas[0];
  const inicio = { c: 1, f: 3, d: 0 };
  const r = simular(programa.pasos, inicio);
  return { programa, inicio, final: r.final, estados: r.estados };
}

// ---------- el robot en 3D ----------

function crearRobot() {
  const robot = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xdfe7ff, metalness: 0.4, roughness: 0.35 });
  const oscuro = new THREE.MeshStandardMaterial({ color: 0x1b2a55, metalness: 0.5, roughness: 0.5 });
  const brilloCian = new THREE.MeshBasicMaterial({ color: 0x5aa9ff });
  const brilloMagenta = new THREE.MeshBasicMaterial({ color: 0xe6e8eb });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.016, 28), oscuro);
  base.position.y = 0.008;
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.062, 0.06), metal);
  cuerpo.position.y = 0.05;
  const pecho = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.016), brilloMagenta);
  pecho.position.set(0, 0.052, -0.0305);
  pecho.rotation.y = Math.PI;
  const cabeza = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.046, 0.052), metal);
  cabeza.position.y = 0.106;
  const visor = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.017), brilloCian);
  visor.position.set(0, 0.109, -0.0265);
  visor.rotation.y = Math.PI; // el frente del robot mira hacia -z
  const antena = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.03, 8), oscuro);
  antena.position.y = 0.144;
  const bola = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 10), brilloMagenta);
  bola.position.y = 0.162;
  // flecha en el piso que marca hacia dónde mira
  const forma = new THREE.Shape();
  forma.moveTo(0, -0.03);
  forma.lineTo(0.022, 0);
  forma.lineTo(-0.022, 0);
  forma.closePath();
  const flecha = new THREE.Mesh(new THREE.ShapeGeometry(forma), brilloCian);
  flecha.rotation.x = -Math.PI / 2;
  flecha.position.set(0, 0.017, -0.06);
  robot.add(base, cuerpo, pecho, cabeza, visor, antena, bola, flecha);
  robot.userData.bola = bola;
  return robot;
}

// ---------- el juego ----------

AFRAME.registerComponent('robot-programado', {
  init() {
    this.pantalla = '';
    this.pantallas = {};
    this.botones = { inicio: [], juego: [], fin: [] };
    this.ultimoSegundo = null;
    this.reto = null;
    this.seleccion = null;
    this.animacion = null;
    this.nivel = 1;
    this.construirEscena();
    this.el.sceneEl.addEventListener('boton-presionado', (e) => this.presionar(e.detail.accion, e.detail.valor));
    window.addEventListener('keydown', (e) => this.teclaFisica(e));
    this.reto = generarReto(1, null);
    this.colocarRobot(this.reto.inicio);
    this.mostrar('inicio');
    window.juego = this; // para probar desde la consola
  },

  // --- construcción ---

  crearBoton(pantalla, padre, texto, posicion, opciones, rotacion = '0 0 0') {
    const el = crearEntidad(padre, { position: posicion, rotation: rotacion, boton: Object.assign({ texto }, opciones) });
    this.botones[pantalla].push(el);
    return el;
  },

  construirEscena() {
    const S = CONFIG.casilla;

    // ---- panel de información (arriba, al fondo) ----
    const panel = crearEntidad(this.el, { position: '0 1.84 -2.2' });
    crearEntidad(panel, { geometry: 'primitive: plane; width: 2.26; height: 1.4', material: 'shader: flat; color: #5AA9FF; opacity: 0.5; transparent: true', position: '0 0 -0.035' });
    crearEntidad(panel, { geometry: 'primitive: plane; width: 2.22; height: 1.36', material: 'shader: flat; color: #06080D; opacity: 0.92; transparent: true', position: '0 0 -0.03' });
    ['inicio', 'juego', 'fin'].forEach((nombre) => {
      this.pantallas[nombre] = crearEntidad(panel, { visible: false });
    });

    const ini = this.pantallas.inicio;
    this.lienzoTitulo = crearEntidad(ini, { lienzo: 'ancho: 2; alto: 0.5', position: '0 0.38 0' });
    this.crearBoton('inicio', ini, 'Practicar (sin tiempo)', '-0.45 -0.1 0.01', { ancho: 0.76, alto: 0.16, accion: 'practicar' });
    this.crearBoton('inicio', ini, 'Empezar ronda · 3 min', '0.45 -0.1 0.01', { ancho: 0.76, alto: 0.16, accion: 'empezar', estilo: 'principal' });
    this.crearBoton('inicio', ini, 'Menú de juegos', '0 -0.6 0.01', { ancho: 0.6, alto: 0.1, accion: 'menu' });
    this.lienzoSeguridad = crearEntidad(ini, { lienzo: 'ancho: 2; alto: 0.22', position: '0 -0.42 0' });

    const jue = this.pantallas.juego;
    this.lienzoBarra = crearEntidad(jue, { lienzo: 'ancho: 2; alto: 0.16', position: '0 0.5 0' });
    this.lienzoInfo = crearEntidad(jue, { lienzo: 'ancho: 2; alto: 0.64', position: '0 0.07 0' });
    this.lienzoMensaje = crearEntidad(jue, { lienzo: 'ancho: 2; alto: 0.1', position: '0 -0.33 0' });
    this.lienzoPista = crearEntidad(jue, { lienzo: 'ancho: 2; alto: 0.12', position: '0 -0.52 0' });

    const fin = this.pantallas.fin;
    this.lienzoResultado = crearEntidad(fin, { lienzo: 'ancho: 2; alto: 0.92', position: '0 0.12 0' });
    this.crearBoton('fin', fin, 'Nueva ronda', '-0.42 -0.5 0.01', { ancho: 0.76, alto: 0.16, accion: 'nueva', estilo: 'principal' });
    this.crearBoton('fin', fin, 'Menú de juegos', '0.42 -0.5 0.01', { ancho: 0.76, alto: 0.16, accion: 'menu' });

    // ---- mesa holográfica con el tablero (abajo, cerca) ----
    const pedestal = crearEntidad(this.el, { position: '0 0.33 -1.0' });
    pedestal.setObject3D('mesh', new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.16, 0.66, 24),
      new THREE.MeshStandardMaterial({ color: 0x111a38, metalness: 0.6, roughness: 0.4 }),
    ));
    this.mesa = crearEntidad(this.el, { position: '0 0.78 -1.0', rotation: '28 0 0' });
    const caja = new THREE.BoxGeometry(0.95, 0.03, 1.1);
    const base = new THREE.Mesh(caja, new THREE.MeshStandardMaterial({ color: 0x0b1330, metalness: 0.5, roughness: 0.45 }));
    const orilla = new THREE.LineSegments(new THREE.EdgesGeometry(caja), new THREE.LineBasicMaterial({ color: 0x5aa9ff }));
    const grupoBase = new THREE.Group();
    grupoBase.add(base, orilla);
    grupoBase.position.set(0, -0.016, 0.05);
    crearEntidad(this.mesa, {}).setObject3D('mesh', grupoBase);

    this.casillas = [];
    for (let c = 0; c < 4; c++) {
      this.casillas.push([]);
      for (let f = 0; f < 4; f++) {
        const x = (c - 1.5) * S;
        const z = (f - 1.5) * S;
        this.casillas[c].push(this.crearBoton('juego', this.mesa, nombreCasilla(c, f), `${x} 0.002 ${z}`,
          { ancho: S - 0.012, alto: S - 0.012, estilo: 'casilla', accion: 'casilla', valor: `${c},${f}` }, '-90 0 0'));
      }
    }
    // letras de columna, números de fila y la palabra ARRIBA
    for (let c = 0; c < 4; c++) {
      const etiqueta = crearEntidad(this.mesa, { lienzo: 'ancho: 0.1; alto: 0.07', position: `${(c - 1.5) * S} 0.002 ${-2 * S - 0.045}`, rotation: '-90 0 0' });
      pintar(etiqueta, (ctx, w, h) => texto(ctx, COLUMNAS[c], w / 2, h / 2, { tam: h * 0.8, peso: 700, color: COLOR.acento, alinear: 'center' }));
    }
    for (let f = 0; f < 4; f++) {
      const etiqueta = crearEntidad(this.mesa, { lienzo: 'ancho: 0.07; alto: 0.1', position: `${-2 * S - 0.045} 0.002 ${(f - 1.5) * S}`, rotation: '-90 0 0' });
      pintar(etiqueta, (ctx, w, h) => texto(ctx, String(f + 1), w / 2, h / 2, { tam: w * 0.8, peso: 700, color: COLOR.acento, alinear: 'center' }));
    }
    const arriba = crearEntidad(this.mesa, { lienzo: 'ancho: 0.4; alto: 0.065', position: `0 0.002 ${-2 * S - 0.115}`, rotation: '-90 0 0' });
    pintar(arriba, (ctx, w, h) => texto(ctx, '↑ ARRIBA', w / 2, h / 2, { tam: h * 0.72, peso: 700, color: COLOR.magenta, alinear: 'center' }));

    // botones sobre la mesa, junto al tablero
    const zBotones = 2 * S + 0.1;
    this.crearBoton('juego', this.mesa, 'Saltar', `-0.3 0.002 ${zBotones}`, { ancho: 0.24, alto: 0.1, accion: 'saltar' }, '-90 0 0');
    this.botonTerminar = this.crearBoton('juego', this.mesa, 'Terminar', `0 0.002 ${zBotones}`, { ancho: 0.24, alto: 0.1, accion: 'terminar' }, '-90 0 0');
    this.crearBoton('juego', this.mesa, 'Enviar', `0.3 0.002 ${zBotones}`, { ancho: 0.28, alto: 0.1, accion: 'enviar', estilo: 'principal' }, '-90 0 0');

    // el robot y su rastro
    this.robot = crearRobot();
    crearEntidad(this.mesa, {}).setObject3D('mesh', this.robot);
    this.rastro = [];
    const grupoRastro = new THREE.Group();
    for (let i = 0; i < 24; i++) {
      const punto = new THREE.Mesh(
        new THREE.RingGeometry(0.022, 0.034, 24),
        new THREE.MeshBasicMaterial({ color: 0x5aa9ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
      );
      punto.rotation.x = -Math.PI / 2;
      punto.visible = false;
      grupoRastro.add(punto);
      this.rastro.push(punto);
    }
    crearEntidad(this.mesa, {}).setObject3D('mesh', grupoRastro);

    this.dibujarInicio();
  },

  mostrar(nombre) {
    this.pantalla = nombre;
    Object.entries(this.pantallas).forEach(([n, el]) => el.setAttribute('visible', n === nombre));
    Object.entries(this.botones).forEach(([n, lista]) => {
      lista.forEach((b) => b.classList.toggle('clickable', n === nombre && b.getAttribute('visible') !== false));
    });
    refrescarApuntadores();
  },

  // --- lógica ---

  presionar(accion, valor) {
    if (accion === 'menu') return irA('index.html');
    if (accion === 'empezar' || accion === 'practicar') {
      this.empezar(accion === 'practicar' ? 'practica' : 'ronda');
    } else if (accion === 'nueva') {
      this.dibujarInicio();
      this.mostrar('inicio');
    } else if (this.pantalla === 'juego') {
      if (accion === 'terminar') return this.terminar();
      if (this.bloqueado() || this.animacion) return;
      if (accion === 'casilla') this.seleccionar(valor);
      if (accion === 'enviar') this.enviar();
      if (accion === 'saltar') {
        this.saltados += 1;
        this.bloquear('Saltaste el programa');
        this.nuevoReto();
      }
    }
  },

  /** En la computadora: escribe la casilla (por ejemplo c2) y presiona Enter. */
  teclaFisica(e) {
    if (this.pantalla !== 'juego') return;
    const tecla = e.key.toUpperCase();
    if (COLUMNAS.includes(tecla)) this.columnaTecleada = COLUMNAS.indexOf(tecla);
    else if ('1234'.includes(tecla) && this.columnaTecleada !== undefined) this.presionar('casilla', `${this.columnaTecleada},${Number(tecla) - 1}`);
    else if (e.key === 'Enter') this.presionar('enviar');
  },

  empezar(modo) {
    this.modo = modo;
    this.puntaje = 0;
    this.errores = 0;
    this.saltados = 0;
    this.nivel = 1;
    this.bloqueoHasta = 0;
    this.mensaje = null;
    this.animacion = null;
    this.finRonda = performance.now() + CONFIG.segundosRonda * 1000;
    this.botonTerminar.setAttribute('visible', modo === 'practica');
    this.nuevoReto();
    this.mostrar('juego');
    this.dibujarTodo();
    this.avisar(modo === 'practica' ? 'Práctica: sin tiempo y sin puntos para el marcador' : '¡Ya! Tienen 3 minutos', COLOR.acento);
    rondaComun.empezar(modo);
    sonido.nivel();
  },

  nuevoReto() {
    this.reto = generarReto(this.nivel, this.reto);
    this.limpiarSeleccion();
    this.rastro.forEach((p) => { p.visible = false; });
    this.colocarRobot(this.reto.inicio);
    this.dibujarInfo();
  },

  seleccionar(valor) {
    const [c, f] = valor.split(',').map(Number);
    this.limpiarSeleccion();
    this.seleccion = { c, f };
    this.casillas[c][f].setAttribute('boton', 'elegido', true);
    sonido.tecla();
    this.dibujarInfo();
  },

  limpiarSeleccion() {
    if (this.seleccion) this.casillas[this.seleccion.c][this.seleccion.f].setAttribute('boton', 'elegido', false);
    this.seleccion = null;
  },

  enviar() {
    if (!this.seleccion) {
      this.avisar('Primero toca una casilla del tablero', COLOR.tenue);
      return;
    }
    const { final } = this.reto;
    if (this.seleccion.c === final.c && this.seleccion.f === final.f) {
      this.puntaje += 1;
      const nivelNuevo = Math.min(CONFIG.nivelMaximo, 1 + Math.floor(this.puntaje / CONFIG.aciertosPorNivel));
      sonido.bien();
      this.avisar(`¡Correcto! El robot termina en ${nombreCasilla(final.c, final.f)} · +1`, COLOR.bien);
      this.dibujarBarra();
      this.animarRecorrido(() => {
        if (nivelNuevo > this.nivel) {
          this.nivel = nivelNuevo;
          this.avisar(this.nivel === 3 ? '¡Nivel 3! Ahora hay programas con "Repite"' : `¡Nivel ${this.nivel}! Programas más largos`, COLOR.acento);
          sonido.nivel();
        }
        this.nuevoReto();
        this.dibujarBarra();
      });
    } else {
      this.errores += 1;
      this.limpiarSeleccion();
      this.bloquear('Incorrecto');
    }
  },

  bloquear(motivo) {
    this.bloqueoHasta = performance.now() + CONFIG.segundosBloqueo * 1000;
    this.avisar(`${motivo}: bloqueo de ${CONFIG.segundosBloqueo} segundos`, COLOR.mal);
    sonido.mal();
    this.dibujarInfo();
  },

  bloqueado() {
    return performance.now() < this.bloqueoHasta;
  },

  avisar(textoAviso, color) {
    this.mensaje = { texto: textoAviso, color, hasta: performance.now() + 2600 };
    this.dibujarMensaje();
  },

  terminar() {
    this.animacion = null;
    sonido.fin();
    rondaComun.terminar();
    this.registro = this.modo === 'ronda'
      ? marcador.registrar('robot', this.puntaje, `nivel ${this.nivel} · errores ${this.errores} · saltados ${this.saltados}`, () => this.dibujarResultado())
      : null;
    this.dibujarResultado();
    this.mostrar('fin');
  },

  // --- robot en el tablero ---

  posicion(c, f) {
    return { x: (c - 1.5) * CONFIG.casilla, z: (f - 1.5) * CONFIG.casilla };
  },

  colocarRobot({ c, f, d }) {
    const p = this.posicion(c, f);
    this.robot.position.set(p.x, 0.004, p.z);
    this.robot.rotation.y = -d * Math.PI / 2;
  },

  animarRecorrido(alTerminar) {
    this.animacion = { estados: this.reto.estados, inicio: performance.now(), ultimo: -1, alTerminar };
    this.dibujarInfo();
  },

  tick(t) {
    // la antena parpadea
    if (this.robot) this.robot.userData.bola.scale.setScalar(1 + 0.25 * Math.sin(t / 250));
    if (this.pantalla !== 'juego') return;
    const ahora = performance.now();

    if (this.animacion) {
      const a = this.animacion;
      const k = (ahora - a.inicio) / CONFIG.msPorPaso;
      const i = Math.floor(k);
      const ultimo = a.estados.length - 1;
      if (i >= ultimo) {
        this.colocarRobot(a.estados[ultimo]);
        if (ahora - a.inicio > ultimo * CONFIG.msPorPaso + 500) {
          this.animacion = null;
          a.alTerminar();
        }
      } else {
        const e0 = a.estados[i];
        const e1 = a.estados[i + 1];
        const fraccion = k - i;
        const p0 = this.posicion(e0.c, e0.f);
        const p1 = this.posicion(e1.c, e1.f);
        this.robot.position.set(p0.x + (p1.x - p0.x) * fraccion, 0.004, p0.z + (p1.z - p0.z) * fraccion);
        const g0 = -e0.d * Math.PI / 2;
        let diferencia = -e1.d * Math.PI / 2 - g0;
        while (diferencia > Math.PI) diferencia -= 2 * Math.PI;
        while (diferencia < -Math.PI) diferencia += 2 * Math.PI;
        this.robot.rotation.y = g0 + diferencia * fraccion;
        if (i !== a.ultimo) {
          a.ultimo = i;
          sonido.paso();
          const punto = this.rastro[i % this.rastro.length];
          punto.position.set(p0.x, 0.006, p0.z);
          punto.visible = true;
        }
      }
    }

    if (this.modo === 'ronda' && ahora >= this.finRonda) {
      this.terminar();
      return;
    }
    const segundo = Math.floor(ahora / 1000);
    if (segundo !== this.ultimoSegundo) {
      this.ultimoSegundo = segundo;
      this.dibujarBarra();
      rondaComun.segundo((this.finRonda - ahora) / 1000, this.modo);
      if (this.bloqueoHasta && ahora < this.bloqueoHasta + 1000) this.dibujarInfo();
      if (this.mensaje && ahora > this.mensaje.hasta) {
        this.mensaje = null;
        this.dibujarMensaje();
      }
    }
  },

  // --- dibujo ---

  dibujarTodo() {
    this.dibujarBarra();
    this.dibujarInfo();
    this.dibujarMensaje();
    pintar(this.lienzoPista, (ctx, w, h) => {
      texto(ctx, 'Apunta a una casilla de la mesa, presiona el gatillo y luego Enviar', w / 2, h / 2, { tam: 44, color: COLOR.tenue, alinear: 'center' });
    });
  },

  dibujarInicio() {
    pintar(this.lienzoTitulo, (ctx, w, h) => {
      texto(ctx, 'ENLACE VR', w / 2, h * 0.13, { tam: 54, color: COLOR.acento, peso: 700, alinear: 'center' });
      texto(ctx, 'Robot programado', w / 2, h * 0.38, { tam: 120, peso: 700, alinear: 'center' });
      texto(ctx, 'Sigan el programa del manual y digan dónde termina el robot.', w / 2, h * 0.64, { tam: 52, color: COLOR.tenue, alinear: 'center' });
      texto(ctx, 'Cuando estén listos, presionen Empezar', w / 2, h * 0.88, { tam: 52, peso: 600, color: COLOR.acento, alinear: 'center' });
    });
    pintar(this.lienzoSeguridad, (ctx, w, h) => {
      fondoPanel(ctx, w, h, '#102039');
      texto(ctx, 'Juega sentado · Correa del control en la muñeca', w / 2, h * 0.36, { tam: 46, alinear: 'center' });
      texto(ctx, 'Al terminar, quítate el visor con las dos manos y pásalo con cuidado', w / 2, h * 0.7, { tam: 40, color: COLOR.tenue, alinear: 'center' });
    });
  },

  dibujarBarra() {
    pintar(this.lienzoBarra, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      texto(ctx, 'ROBOT PROGRAMADO', 40, h / 2, { tam: 56, peso: 700 });
      const anchoTitulo = ctx.measureText('ROBOT PROGRAMADO').width;
      texto(ctx, `Nivel ${this.nivel}`, 40 + anchoTitulo + 36, h / 2, { tam: 46, color: COLOR.tenue });
      texto(ctx, `Aciertos: ${this.puntaje}`, w * 0.62, h / 2, { tam: 58, peso: 700, alinear: 'center' });
      if (this.modo === 'practica') {
        texto(ctx, 'PRÁCTICA', w - 40, h / 2, { tam: 56, peso: 700, color: COLOR.acento, alinear: 'right' });
      } else {
        const restante = (this.finRonda - performance.now()) / 1000;
        texto(ctx, minutos(restante), w - 40, h / 2, { tam: 70, peso: 700, color: restante <= 30 ? COLOR.mal : COLOR.acento, alinear: 'right' });
      }
    });
  },

  dibujarInfo() {
    const reto = this.reto;
    pintar(this.lienzoInfo, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      const dir = DIRECCIONES[reto.inicio.d];
      // programa
      texto(ctx, 'PROGRAMA', 80, h * 0.15, { tam: 44, peso: 600, color: COLOR.tenue });
      texto(ctx, String(reto.programa.id), 80, h * 0.5, { tam: 240, peso: 800, color: COLOR.acento });
      texto(ctx, 'Búsquenlo en el manual', 80, h * 0.85, { tam: 38, color: COLOR.tenue });
      // separador
      ctx.fillStyle = 'rgba(255,255,255,.15)';
      ctx.fillRect(w * 0.33, h * 0.1, 4, h * 0.8);
      // inicio y dirección
      texto(ctx, 'INICIO', w * 0.38, h * 0.15, { tam: 44, peso: 600, color: COLOR.tenue });
      texto(ctx, nombreCasilla(reto.inicio.c, reto.inicio.f), w * 0.38, h * 0.47, { tam: 150, peso: 800 });
      texto(ctx, 'MIRANDO HACIA', w * 0.6, h * 0.15, { tam: 44, peso: 600, color: COLOR.tenue });
      texto(ctx, `${dir.flecha} ${dir.nombre}`, w * 0.6, h * 0.47, { tam: 104, peso: 800 });
      // respuesta elegida
      let respuesta = 'Tu respuesta: toca una casilla';
      let colorRespuesta = COLOR.tenue;
      if (this.animacion) { respuesta = 'El robot sigue el programa…'; colorRespuesta = COLOR.bien; }
      else if (this.seleccion) { respuesta = `Tu respuesta: ${nombreCasilla(this.seleccion.c, this.seleccion.f)}`; colorRespuesta = COLOR.acento; }
      texto(ctx, respuesta, w * 0.38, h * 0.82, { tam: 56, peso: 700, color: colorRespuesta });

      const restante = (this.bloqueoHasta - performance.now()) / 1000;
      if (restante > 0) {
        ctx.fillStyle = 'rgba(40, 6, 14, 0.85)';
        rectRedondo(ctx, 4, 4, w - 8, h - 8, 24);
        ctx.fill();
        texto(ctx, '¡ENLACE CAÍDO!', w / 2, h * 0.38, { tam: 96, peso: 800, color: COLOR.mal, alinear: 'center' });
        texto(ctx, `Esperen ${Math.ceil(restante)} s · nadie habla`, w / 2, h * 0.64, { tam: 62, alinear: 'center' });
      }
    });
  },

  dibujarMensaje() {
    pintar(this.lienzoMensaje, (ctx, w, h) => {
      if (!this.mensaje) return;
      texto(ctx, this.mensaje.texto, w / 2, h / 2, { tam: 56, peso: 600, color: this.mensaje.color, alinear: 'center' });
    });
  },

  dibujarResultado() {
    pintar(this.lienzoResultado, (ctx, w, h) => dibujarFinalRonda(ctx, w, h, {
      practica: this.modo === 'practica',
      puntaje: this.puntaje,
      unidad: this.puntaje === 1 ? 'programa resuelto' : 'programas resueltos',
      detalle: `Nivel alcanzado: ${this.nivel} · Errores: ${this.errores} · Saltados: ${this.saltados}`,
      registro: this.registro,
    }));
  },
});
