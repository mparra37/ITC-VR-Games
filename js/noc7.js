/* Enlace VR · Laboratorio NOC-7 (escape room de redes)
 *
 * Basado en la versión original (noc7-laboratorio-redes.html). Un reto por sala; al resolverlo se
 * enciende la palanca junto a la puerta (a la derecha). Al jalarla se abre la puerta, hay un fundido
 * a negro y una pausa para cambiar de Operador; luego aparece la siguiente sala.
 *
 *   Sala 1  Rack de acceso    · IP en binario → escribirla en decimal
 *   Sala 2  Autenticación     · escribir una palabra en binario con 8 focos (ASCII)
 *   Sala 3  Banco de memoria  · a, b, c en binario → escribirlas en decimal
 *   Sala 4  Núcleo lógico     · verdadero o falso con a, b, c (se muestran en binario)
 *
 * Comodidad: el jugador nunca se mueve; el paso entre salas es un fundido a negro.
 * Dentro del visor NO hay tabla ASCII ni de potencias de 2: van en la hoja del equipo.
 * Los valores se eligen al azar en cada partida (cada equipo tiene números distintos).
 */
/* global AFRAME, THREE, COLOR, MONO, texto, fondoPanel, pintar, rectRedondo, sonido, crearEntidad, refrescarApuntadores, azarConSemilla, irA, marcador, rondaComun, dibujarCodigo */

const NOC = {
  panel: { x: 0, y: 1.75, z: -4.1, ancho: 5.4, alto: 3.3 },
  segundosFundido: 0.9,
};

const bin8 = (n) => n.toString(2).padStart(8, '0');
const conEspacio = (b) => `${b.slice(0, 4)} ${b.slice(4)}`;
const entre = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const azarDe = (lista) => lista[Math.floor(Math.random() * lista.length)];

/** Los números de esta partida: IP, palabra, a, b, c y las 6 evaluaciones. */
function generarPartida(datos) {
  const ip = [entre(10, 223), entre(0, 254), entre(1, 254), entre(2, 254)];
  const a = entre(2, 9);
  let b;
  do { b = entre(2, 9); } while (b === a);
  const c = entre(10, 20);
  // afirmaciones: cada una puede salir verdadera o falsa; entre 3 y 4 verdaderas
  const plantillas = [
    { t: 'a + b', v: a + b }, { t: 'c − a', v: c - a }, { t: 'a × b', v: a * b },
    { t: 'b + c', v: b + c }, { t: 'c − b', v: c - b }, { t: 'a + b + c', v: a + b + c },
  ];
  const elegidas = plantillas.sort(() => Math.random() - 0.5).slice(0, datos.evaluaciones - 1);
  const verdaderas = new Set([...Array(datos.evaluaciones).keys()].sort(() => Math.random() - 0.5).slice(0, entre(3, 4)));
  const evaluaciones = elegidas.map((p, i) => {
    const ok = verdaderas.has(i);
    const n = ok ? p.v : p.v + azarDe([-3, -2, -1, 1, 2, 3]);
    return { t: `${p.t}  =  ${n}`, ok };
  });
  // una comparación al final (también puede salir verdadera o falsa)
  const real = c - b > a ? '>' : c - b < a ? '<' : '=';
  const op = verdaderas.has(datos.evaluaciones - 1) ? real : azarDe(['>', '<', '='].filter((o) => o !== real));
  const comp = { t: `c − b  ${op}  a`, ok: op === real };
  evaluaciones.push(comp);
  return { ip, palabra: azarDe(datos.palabras), vars: { a, b, c }, evaluaciones };
}

// ---------- decorado del laboratorio (three.js directo: pocas piezas, colores compartidos) ----------

function crearDecorado(raiz) {
  const g = new THREE.Group();
  const acento = new THREE.MeshBasicMaterial({ color: 0x5aa9ff, transparent: true, opacity: 0.12 });
  const led = new THREE.MeshBasicMaterial({ color: 0x5aa9ff });
  const metal = new THREE.MeshStandardMaterial({ color: 0x16233a, roughness: 0.7, metalness: 0.4 });
  const negro = new THREE.MeshStandardMaterial({ color: 0x070d18, roughness: 1 });
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(11, 11), new THREE.MeshStandardMaterial({ color: 0x0a1424, roughness: 0.9 }));
  piso.rotation.x = -Math.PI / 2;
  g.add(piso);
  for (let i = -5; i <= 5; i++) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(11, 0.01, 0.02), acento);
    h.position.set(0, 0.005, i);
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 11), acento);
    v.position.set(i, 0.005, 0);
    g.add(h, v);
  }
  const techo = new THREE.Mesh(new THREE.PlaneGeometry(11, 11), negro);
  techo.rotation.x = Math.PI / 2;
  techo.position.y = 3.9;
  g.add(techo);
  [-2.2, 2.2].forEach((x) => {
    const charola = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 10), metal);
    charola.position.set(x, 3.55, 0);
    g.add(charola);
  });
  // racks con LEDs
  const azar = azarConSemilla(7);
  [[-4.3, -2.4], [-4.3, 0.4], [-4.3, 3.0], [4.3, 3.0]].forEach(([x, z]) => {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.3, 1.1), metal);
    rack.position.set(x, 1.15, z);
    const frente = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.2, 1.0), negro);
    frente.position.set(x + (x < 0 ? 0.45 : -0.45), 1.15, z);
    g.add(rack, frente);
    for (let k = 0; k < 9; k++) {
      if (azar() < 0.4) continue;
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), led);
      l.position.set(x + (x < 0 ? 0.47 : -0.47), 0.35 + k * 0.2, z - 0.3);
      g.add(l);
    }
  });
  // panel de conexiones con cables curvos
  const colores = [0x5aa9ff, 0x9db8ff, 0x7fd1c7, 0xb9a6ff, 0xf2f4f8, 0x2f6fbf];
  for (let i = 0; i < 6; i++) {
    const a = new THREE.Vector3(-4.05, 2.05 - (i % 2) * 0.24, -1.9 + i * 0.13);
    const b = new THREE.Vector3(-4.05, 1.25, -0.4 + i * 0.09);
    const m = a.clone().add(b).multiplyScalar(0.5);
    m.y -= 0.25 + i * 0.05;
    const tubo = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, m, b]), 16, 0.014, 6, false), new THREE.MeshStandardMaterial({ color: colores[i], roughness: 0.6 }));
    g.add(tubo);
  }
  const patch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 1.7), metal);
  patch.position.set(-4.15, 1.9, -1.2);
  g.add(patch);
  // mesa de trabajo al fondo derecho
  const mesa = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.8), metal);
  mesa.position.set(4.0, 0.85, -1.6);
  mesa.rotation.y = THREE.MathUtils.degToRad(-20);
  g.add(mesa);
  raiz.add(g);
  return { acento, led };
}

// ---------- el juego ----------

AFRAME.registerComponent('noc7', {
  init() {
    this.datos = window.NOC7;
    this.estado = 'inicio';
    this.sala = 0;
    this.controles = []; // { el, sala } — qué se puede apuntar en cada pantalla
    this.construir();
    this.el.sceneEl.addEventListener('boton-presionado', (e) => this.presionar(e.detail.accion, e.detail.valor));
    window.addEventListener('keydown', (e) => this.teclaFisica(e));
    this.mostrarInicio();
    window.juego = this; // para probar desde la consola
  },

  // --- construcción ---

  construir() {
    const P = NOC.panel;
    this.decorado = crearDecorado(this.el.object3D);
    this.luz = crearEntidad(this.el, { light: 'type: point; color: #5AA9FF; intensity: 0.6; distance: 14', position: '0 3.4 0' });
    crearEntidad(this.el, { light: 'type: ambient; color: #b9cdf0; intensity: 0.7' });
    crearEntidad(this.el, { light: 'type: point; color: #ffffff; intensity: 0.3; distance: 8', position: '0 2.6 -2.5' });

    this.rotulo = crearEntidad(this.el, { lienzo: 'ancho: 3.4; alto: 0.32', position: `0 ${P.y + P.alto / 2 + 0.3} ${P.z}` });

    // el panel grande de la pared y sus controles (cada sala usa los suyos)
    this.panel = crearEntidad(this.el, { lienzo: `ancho: ${P.ancho}; alto: ${P.alto}`, position: `${P.x} ${P.y} ${P.z}` });
    const boton = (sala, textoBoton, x, y, ancho, alto, accion, valor = '', estilo = 'tecla') => {
      const el = crearEntidad(this.panel, { position: `${x} ${y} 0.03`, boton: { texto: textoBoton, ancho, alto, accion, valor, estilo }, visible: false });
      this.controles.push({ el, sala });
      return el;
    };
    const zona = (sala, x, y, ancho, alto, alClic) => {
      const el = crearEntidad(this.panel, { geometry: `primitive: plane; width: ${ancho}; height: ${alto}`, material: 'shader: flat; transparent: true; opacity: 0; depthWrite: false', position: `${x} ${y} 0.02`, visible: false });
      el.addEventListener('click', alClic);
      this.controles.push({ el, sala });
      return el;
    };

    // salas 1 y 3: campos y teclado numérico
    ['ip', 'vars'].forEach((sala) => {
      const filas = sala === 'ip' ? 4 : 3;
      const { yIni, dy } = this.geometriaFilas(filas);
      for (let i = 0; i < filas; i++) zona(sala, 0.1, yIni - i * dy, 0.9, 0.38, () => this.presionar('campo', i));
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'BORRAR', '0', 'OK'].forEach((k, i) => {
        const estilo = k === 'OK' ? 'principal' : 'tecla';
        boton(sala, k, 1.3 + (i % 3) * 0.5, 0.72 - Math.floor(i / 3) * 0.4, 0.44, 0.34, k === 'OK' ? 'ok' : k === 'BORRAR' ? 'borrar' : 'tecla', k, estilo);
      });
      boton(sala, 'PISTA  −50', -0.85, -1.4, 1.5, 0.3, 'pista');
    });

    // sala 2: 8 focos
    this.focos = [];
    for (let i = 0; i < 8; i++) {
      const x = -1.75 + i * 0.5;
      const foco = crearEntidad(this.panel, { geometry: 'primitive: sphere; radius: 0.155', material: 'color: #1c2a44; roughness: 0.35', position: `${x} 0.22 0.16`, visible: false });
      crearEntidad(foco, { geometry: 'primitive: cylinder; radius: 0.075; height: 0.12', material: 'color: #16233a; roughness: 0.8', position: '0 -0.175 0', rotation: '0 0 0' });
      foco.addEventListener('click', () => this.presionar('foco', i));
      this.controles.push({ el: foco, sala: 'palabra' });
      this.focos.push(foco);
    }
    boton('palabra', 'VALIDAR', -1.45, -1.35, 0.95, 0.3, 'validar', '', 'principal');
    boton('palabra', 'LIMPIAR', 0, -1.35, 0.95, 0.3, 'limpiar');
    boton('palabra', 'PISTA  −50', 1.45, -1.35, 0.95, 0.3, 'pista');

    // sala 4: verdadero o falso
    boton('logica', 'VERDADERO', -1.2, -1.2, 1.7, 0.44, 'vf', 'v', 'principal');
    boton('logica', 'FALSO', 1.2, -1.2, 1.7, 0.44, 'vf', 'f');

    // pantallas de inicio, pausa y final (mismo panel)
    boton('inicio', 'Empezar', -0.75, -1.05, 1.3, 0.36, 'empezar', '', 'principal');
    boton('inicio', 'Menú de juegos', 0.75, -1.05, 1.3, 0.36, 'menu');
    boton('pausa', 'Continuar', 0, -1.1, 1.6, 0.4, 'continuar', '', 'principal');
    boton('final', 'Jugar de nuevo', -0.75, -1.15, 1.3, 0.36, 'reiniciar', '', 'principal');
    boton('final', 'Menú de juegos', 0.75, -1.15, 1.3, 0.36, 'menu');

    this.crearSalida();

    // consola con cronómetro y puntos (sin tablas de apoyo)
    this.hud = crearEntidad(this.el, { lienzo: 'ancho: 1.1; alto: 0.22', position: '0 0.74 -0.72', rotation: '-45 0 0' });

    // velo para el fundido a negro (pegado a la cámara)
    const camara = document.querySelector('[camera]');
    this.velo = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, transparent: true, opacity: 0, depthTest: false }));
    this.velo.renderOrder = 999;
    this.velo.visible = false;
    camara.object3D.add(this.velo);
  },

  /** Puerta y palanca, a la derecha del jugador (un giro de cabeza, sin dar un paso). */
  crearSalida() {
    // la puerta queda a la derecha (unos 85°) y la palanca más hacia el frente (unos 60°), nunca atrás
    const g = crearEntidad(this.el, { position: '3.7 0 -0.4', rotation: '0 -90 0' });
    crearEntidad(g, { light: 'type: point; color: #9DB8FF; intensity: 0.8; distance: 5', position: '-0.8 2.4 1.4' });
    crearEntidad(g, { geometry: 'primitive: box; width: 2.3; height: 3.3; depth: 0.25', material: 'color: #22324D; roughness: 0.6; metalness: 0.45', position: '0 1.65 0.14' });
    this.pasillo = crearEntidad(g, { geometry: 'primitive: plane; width: 1.9; height: 2.9', material: 'shader: flat; color: #5AA9FF; opacity: 0.75; transparent: true', position: '0 1.5 -0.1' });
    crearEntidad(g, { geometry: 'primitive: plane; width: 1.4; height: 2.4', material: 'shader: flat; color: #04070a; opacity: 0.9; transparent: true', position: '0 1.5 -0.09' });
    this.hoja = crearEntidad(g, { geometry: 'primitive: box; width: 1.9; height: 2.9; depth: 0.14', material: 'color: #2A4670; roughness: 0.5; metalness: 0.4', position: '0 1.5 0' });
    this.franja = crearEntidad(this.hoja, { geometry: 'primitive: plane; width: 1.7; height: 0.06', material: 'shader: flat; color: #FF5C6C; opacity: 0.85; transparent: true', position: '0 0 0.08' });
    const letrero = crearEntidad(g, { lienzo: 'ancho: 1.2; alto: 0.22', position: '0 2.62 0.28' });
    pintar(letrero, (ctx, w, h) => texto(ctx, 'SALIDA', w / 2, h / 2, { tam: h * 0.6, peso: 700, color: COLOR.tenue, alinear: 'center' }));

    const base = crearEntidad(g, { position: '-1.6 0 0.35' });
    crearEntidad(base, { geometry: 'primitive: box; width: 0.5; height: 1.0; depth: 0.45', material: 'color: #22324D; roughness: 0.6; metalness: 0.4', position: '0 0.5 0' });
    this.luzPalanca = crearEntidad(base, { geometry: 'primitive: sphere; radius: 0.05', material: 'shader: flat; color: #FF5C6C', position: '0 1.09 0.17' });
    this.etiquetaPalanca = crearEntidad(base, { lienzo: 'ancho: 0.7; alto: 0.16', position: '0 0.74 0.24' });
    this.pivote = crearEntidad(base, { position: '0 1.06 0', rotation: '-22 0 0' });
    crearEntidad(this.pivote, { geometry: 'primitive: cylinder; radius: 0.035; height: 0.7', material: 'color: #3a4553; roughness: 0.5; metalness: 0.6', position: '0 0.35 0' });
    this.perilla = crearEntidad(this.pivote, { geometry: 'primitive: sphere; radius: 0.12', material: 'shader: flat; color: #FF5C6C', position: '0 0.72 0' });
    this.perilla.addEventListener('mouseenter', () => { if (this.palancaLista) this.perilla.object3D.scale.setScalar(1.25); });
    this.perilla.addEventListener('mouseleave', () => this.perilla.object3D.scale.setScalar(1));
    this.perilla.addEventListener('click', () => this.presionar('palanca'));
  },

  geometriaFilas(filas) {
    return filas === 4 ? { yIni: 0.72, dy: 0.42 } : { yIni: 0.58, dy: 0.48 };
  },

  /** Deja apuntables solo los controles de la pantalla actual. */
  activar(nombre) {
    this.controles.forEach((c) => {
      const si = c.sala === nombre;
      c.el.setAttribute('visible', si);
      c.el.classList.toggle('clickable', si);
    });
    this.perilla.classList.toggle('clickable', nombre === this.datos.salas[this.sala]?.id);
    refrescarApuntadores();
  },

  // --- flujo ---

  mostrarInicio() {
    this.estado = 'inicio';
    this.pintarRotulo('LABORATORIO NOC-7', COLOR.acento);
    pintar(this.panel, (ctx, w, h) => {
      fondoPanel(ctx, w, h, 'rgba(12,22,40,.96)');
      texto(ctx, 'ENLACE VR · ESCAPE ROOM', w / 2, h * 0.1, { tam: 54, peso: 600, color: COLOR.acento, alinear: 'center' });
      texto(ctx, 'Laboratorio NOC-7', w / 2, h * 0.24, { tam: 150, peso: 700, alinear: 'center' });
      const lineas = [
        '4 salas, un reto en cada una. Tú ves los datos; tu equipo tiene las tablas.',
        'Al resolver el reto, voltea a tu DERECHA y jala la palanca para abrir la puerta.',
        'Entre sala y sala hay una pausa: pueden cambiar de Operador.',
        'Pistas: −50 puntos. Errores: −25. Mientras más rápido, más bono.',
      ];
      lineas.forEach((l, i) => texto(ctx, l, w / 2, h * (0.42 + i * 0.085), { tam: 52, peso: 500, color: i === 1 ? COLOR.texto : COLOR.tenue, alinear: 'center' }));
      texto(ctx, 'Juega sentado · correa del control en la muñeca', w / 2, h * 0.94, { tam: 44, color: COLOR.tenue, alinear: 'center' });
    });
    this.reiniciarSalida();
    this.activar('inicio');
    this.pintarHud();
  },

  empezar() {
    this.partida = generarPartida(this.datos);
    this.puntos = 0;
    this.pistas = 0;
    this.errores = 0;
    this.t0 = performance.now();
    this.tFinal = null;
    this.irASala(0);
    sonido.nivel();
    rondaComun.empezar('escape');
  },

  irASala(i) {
    this.sala = i;
    this.estado = 'sala';
    const s = this.datos.salas[i];
    this.decorado.acento.color.set(s.acento);
    this.decorado.led.color.set(s.acento);
    this.luz.setAttribute('light', 'color', s.acento);
    this.pintarRotulo(`SALA ${i + 1} DE 4 · ${s.nombre.toUpperCase()}`, s.acento);
    this.resuelto = false;
    this.mensaje = null;
    if (s.id === 'ip' || s.id === 'vars') {
      this.filas = s.id === 'ip' ? this.partida.ip.map((v) => ({ etq: '', val: v })) : ['a', 'b', 'c'].map((k) => ({ etq: `${k} =`, val: this.partida.vars[k] }));
      this.buffers = this.filas.map(() => '');
      this.sel = 0;
    } else if (s.id === 'palabra') {
      this.letra = 0;
      this.bits = [0, 0, 0, 0, 0, 0, 0, 0];
      this.pintarFocos();
    } else {
      this.evIdx = 0;
      this.aciertos = 0;
      this.pagadas = new Set();
      this.ultima = null;
    }
    this.reiniciarSalida();
    this.activar(s.id);
    this.pintarSala();
  },

  resolver(puntos) {
    if (this.resuelto) return;
    this.resuelto = true;
    this.sumar(puntos);
    sonido.bien();
    // la palanca se enciende
    this.palancaLista = true;
    this.luzPalanca.setAttribute('material', 'color', COLOR.bien);
    this.perilla.setAttribute('material', 'color', COLOR.bien);
    this.pintarEtiquetaPalanca('JALA LA PALANCA →', COLOR.bien);
    setTimeout(() => sonido.nivel(), 250);
  },

  jalarPalanca() {
    if (!this.palancaLista || this.jalada) {
      if (!this.palancaLista) sonido.mal();
      return;
    }
    this.jalada = true;
    this.anim = { tipo: 'palanca', t0: performance.now() };
    sonido.tono(90, 0.2, 'square', 0.1);
    setTimeout(() => sonido.tono(140, 0.12, 'square', 0.08), 110);
    this.pintarEtiquetaPalanca('ABIERTA', COLOR.bien);
    setTimeout(() => {
      sonido.tono(70, 0.9, 'sawtooth', 0.05);
      this.franja.setAttribute('visible', false);
      this.anim = { tipo: 'puerta', t0: performance.now() };
    }, 480);
    setTimeout(() => this.fundido(() => {
      if (this.sala + 1 < this.datos.salas.length) this.mostrarPausa();
      else this.terminar();
    }), 2600);
  },

  mostrarPausa() {
    this.estado = 'pausa';
    const sig = this.datos.salas[this.sala + 1];
    this.pintarRotulo(`SALA ${this.sala + 1} SUPERADA`, COLOR.bien);
    pintar(this.panel, (ctx, w, h) => {
      fondoPanel(ctx, w, h, 'rgba(12,22,40,.96)');
      texto(ctx, `¡Sala ${this.sala + 1} superada!`, w / 2, h * 0.16, { tam: 120, peso: 700, color: COLOR.bien, alinear: 'center' });
      texto(ctx, `Siguiente: Sala ${this.sala + 2} · ${sig.nombre}`, w / 2, h * 0.34, { tam: 80, peso: 600, alinear: 'center' });
      texto(ctx, `${sig.reto}`, w / 2, h * 0.45, { tam: 60, color: sig.acento, alinear: 'center' });
      texto(ctx, '¿Cambian de Operador? Quítate el visor con las dos manos y pásalo con cuidado.', w / 2, h * 0.6, { tam: 50, color: COLOR.tenue, alinear: 'center' });
      texto(ctx, 'Cuando el nuevo Operador esté sentado y listo, presiona Continuar.', w / 2, h * 0.68, { tam: 50, color: COLOR.tenue, alinear: 'center' });
    });
    this.activar('pausa');
  },

  terminar() {
    this.estado = 'final';
    this.tFinal = (performance.now() - this.t0) / 1000;
    const bono = Math.max(0, Math.round(this.datos.puntos.bono_maximo - this.tFinal));
    this.sumar(bono);
    [330, 440, 550, 660, 880, 1100].forEach((f, i) => sonido.tono(f, 0.18, 'triangle', 0.1, i * 0.11));
    this.pintarRotulo('LABORATORIO COMPLETADO', COLOR.bien);
    rondaComun.terminar();
    const m = Math.floor(this.tFinal / 60);
    const s = Math.floor(this.tFinal % 60);
    this.registro = marcador.registrar('noc7', this.puntos, `tiempo ${m}:${String(s).padStart(2, '0')} · pistas ${this.pistas} · errores ${this.errores}`, () => this.pintarFinal(m, s, bono));
    this.pintarFinal(m, s, bono);
    this.activar('final');
    this.pintarHud();
  },

  pintarFinal(m, s, bono) {
    pintar(this.panel, (ctx, w, h) => {
      fondoPanel(ctx, w, h, 'rgba(12,22,40,.96)');
      texto(ctx, '¡Escaparon del laboratorio!', w / 2, h * 0.1, { tam: 110, peso: 700, color: COLOR.bien, alinear: 'center' });
      const filas = [['Tiempo', `${m} min ${s} s`], ['Bono por rapidez', `+${bono}`], ['Pistas', `${this.pistas}`], ['Errores', `${this.errores}`]];
      filas.forEach(([k, v], i) => {
        texto(ctx, k, w * 0.3, h * (0.22 + i * 0.065), { tam: 56, color: COLOR.tenue });
        texto(ctx, v, w * 0.7, h * (0.22 + i * 0.065), { tam: 56, peso: 600, alinear: 'right', fuente: MONO });
      });
      texto(ctx, 'TOTAL', w * 0.3, h * 0.52, { tam: 80, peso: 700 });
      texto(ctx, `${this.puntos}`, w * 0.7, h * 0.52, { tam: 110, peso: 700, color: COLOR.acento, alinear: 'right' });
      if (this.registro) dibujarCodigo(ctx, w * 0.12, h * 0.6, w * 0.76, h * 0.15, this.registro);
    });
  },

  fundido(enNegro) {
    this.velo.visible = true;
    this.anim = null;
    this.veloAnim = { t0: performance.now(), enNegro, hecho: false };
  },

  reiniciarSalida() {
    this.palancaLista = false;
    this.jalada = false;
    this.anim = null;
    this.pivote.object3D.rotation.set(THREE.MathUtils.degToRad(-22), 0, 0);
    this.hoja.object3D.position.set(0, 1.5, 0);
    this.franja.setAttribute('visible', true);
    this.luzPalanca.setAttribute('material', 'color', COLOR.mal);
    this.perilla.setAttribute('material', 'color', COLOR.mal);
    this.pintarEtiquetaPalanca('BLOQUEADA', COLOR.mal);
  },

  sumar(p) {
    this.puntos = Math.max(0, this.puntos + p);
    this.pintarHud();
  },

  error() {
    this.errores += 1;
    this.sumar(this.datos.puntos.error);
    sonido.mal();
  },

  // --- entrada ---

  presionar(accion, valor) {
    if (accion === 'menu') return irA('index.html');
    if (accion === 'empezar' && this.estado === 'inicio') return this.empezar();
    if (accion === 'reiniciar') return this.mostrarInicio();
    if (accion === 'continuar' && this.estado === 'pausa') return this.irASala(this.sala + 1);
    if (this.estado !== 'sala' || this.veloAnim) return null;
    if (accion === 'palanca') return this.jalarPalanca();
    const id = this.datos.salas[this.sala].id;
    if (this.resuelto) return null;
    sonido.tecla();
    if (id === 'ip' || id === 'vars') {
      if (accion === 'campo') this.sel = valor;
      if (accion === 'tecla') this.teclear(valor);
      if (accion === 'borrar') this.buffers[this.sel] = '';
      if (accion === 'ok') this.validarDecimal();
      if (accion === 'pista') this.pista();
    } else if (id === 'palabra') {
      if (accion === 'foco') this.bits[valor] = this.bits[valor] ? 0 : 1;
      if (accion === 'limpiar') this.bits = [0, 0, 0, 0, 0, 0, 0, 0];
      if (accion === 'validar') this.validarLetra();
      if (accion === 'pista') this.pista();
      this.pintarFocos();
    } else if (accion === 'vf') {
      this.responder(valor === 'v');
    }
    this.pintarSala();
    return null;
  },

  /** En la computadora: números, Retroceso, Enter; 1-8 = focos; V/F; R = reiniciar (profesor). */
  teclaFisica(e) {
    const k = e.key;
    if (k === 'r' || k === 'R') return this.mostrarInicio();
    if (this.estado !== 'sala') return null;
    const id = this.datos.salas[this.sala].id;
    if (id === 'ip' || id === 'vars') {
      if (/^[0-9]$/.test(k)) this.presionar('tecla', k);
      if (k === 'Backspace') this.presionar('borrar');
      if (k === 'Enter') this.presionar('ok');
    } else if (id === 'palabra') {
      if (/^[1-8]$/.test(k)) this.presionar('foco', Number(k) - 1);
      if (k === 'Enter') this.presionar('validar');
    } else if (k.toLowerCase() === 'v' || k.toLowerCase() === 'f') {
      this.presionar('vf', k.toLowerCase());
    }
    return null;
  },

  teclear(k) {
    if (this.buffers[this.sel].length < 3) {
      this.buffers[this.sel] += k;
      if (this.buffers[this.sel].length === 3 && this.sel < this.filas.length - 1) this.sel += 1;
    }
  },

  validarDecimal() {
    if (this.buffers.some((b) => b === '')) {
      this.mensaje = { texto: 'Faltan renglones por llenar.', color: COLOR.mal };
      return;
    }
    const malos = [];
    this.buffers.forEach((b, i) => { if (Number(b) !== this.filas[i].val) malos.push(i); });
    if (!malos.length) {
      this.mensaje = { texto: 'Valores correctos. ¡Voltea a tu derecha y jala la palanca!', color: COLOR.bien };
      this.resolver(this.datos.puntos[this.datos.salas[this.sala].id]);
    } else {
      this.error();
      this.mensaje = { texto: `Incorrecto en el renglón ${malos.map((i) => i + 1).join(', ')}. Vuelvan a intentarlo.`, color: COLOR.mal };
      malos.forEach((i) => { this.buffers[i] = ''; });
      this.sel = malos[0];
    }
  },

  valorBits() {
    return this.bits.reduce((a, b) => a * 2 + b, 0);
  },

  validarLetra() {
    const palabra = this.partida.palabra;
    const ch = palabra[this.letra];
    const meta = ch.charCodeAt(0);
    if (this.valorBits() === meta) {
      this.letra += 1;
      this.bits = [0, 0, 0, 0, 0, 0, 0, 0];
      if (this.letra >= palabra.length) {
        this.mensaje = { texto: 'Contraseña aceptada. ¡Voltea a tu derecha y jala la palanca!', color: COLOR.bien };
        this.resolver(this.datos.puntos.palabra);
      } else {
        this.mensaje = { texto: `Letra "${ch}" correcta. Sigue con "${palabra[this.letra]}".`, color: COLOR.bien };
        sonido.bien();
      }
    } else {
      this.error();
      const dif = this.valorBits() - meta;
      this.mensaje = { texto: `Rechazado: tu número (${this.valorBits()}) es ${dif > 0 ? 'MAYOR' : 'MENOR'} que el correcto.`, color: COLOR.mal };
    }
  },

  responder(dijoVerdadero) {
    const evs = this.partida.evaluaciones;
    if (this.evIdx >= evs.length) return;
    const ev = evs[this.evIdx];
    const bien = dijoVerdadero === ev.ok;
    if (bien) {
      this.aciertos += 1;
      if (!this.pagadas.has(this.evIdx)) this.sumar(this.datos.puntos.acierto_logica);
      this.pagadas.add(this.evIdx);
      sonido.bien();
    } else {
      this.error();
    }
    this.ultima = { bien, texto: `${ev.t.replace(/\s+/g, ' ')} es ${ev.ok ? 'VERDADERO' : 'FALSO'}` };
    this.evIdx += 1;
    if (this.evIdx >= evs.length) {
      if (this.aciertos >= this.datos.minimo_aciertos) {
        this.mensaje = { texto: 'Verificado. ¡Voltea a tu derecha y jala la palanca!', color: COLOR.bien };
        this.resolver(this.datos.puntos.completar_logica);
      } else {
        this.mensaje = { texto: `Solo ${this.aciertos} de ${evs.length}: la serie empieza otra vez…`, color: COLOR.mal };
        setTimeout(() => {
          this.evIdx = 0;
          this.aciertos = 0;
          this.ultima = null;
          this.mensaje = null;
          this.pintarSala();
        }, 2800);
      }
    }
  },

  pista() {
    this.pistas += 1;
    this.sumar(this.datos.puntos.pista);
    const id = this.datos.salas[this.sala].id;
    if (id === 'palabra') {
      const ch = this.partida.palabra[this.letra];
      this.mensaje = { texto: `Pista: la letra "${ch}" es el número ${ch.charCodeAt(0)}. Ahora conviértanlo a binario.`, color: COLOR.acento };
    } else {
      const alto = bin8(this.filas[this.sel].val).slice(0, 4);
      this.mensaje = { texto: `Pista: en el renglón ${this.sel + 1}, los primeros 4 bits (${alto}) suman ${parseInt(alto, 2) * 16}.`, color: COLOR.acento };
    }
  },

  // --- cada cuadro ---

  tick() {
    const ahora = performance.now();
    if (this.anim) {
      const f = (ahora - this.anim.t0) / (this.anim.tipo === 'palanca' ? 520 : 2000);
      const u = Math.min(1, f);
      if (this.anim.tipo === 'palanca') this.pivote.object3D.rotation.x = THREE.MathUtils.degToRad(-22 + 74 * u * u);
      else this.hoja.object3D.position.y = 1.5 + 3.2 * (u < 0.5 ? 2 * u * u : 1 - ((-2 * u + 2) ** 2) / 2);
      if (f >= 1 && this.anim.tipo === 'puerta') this.anim = null;
    }
    if (this.veloAnim) {
      const d = NOC.segundosFundido * 1000;
      const pasado = ahora - this.veloAnim.t0;
      // el cambio de sala ocurre en negro, aunque se hayan saltado cuadros
      if (pasado >= d && !this.veloAnim.hecho) {
        this.veloAnim.hecho = true;
        this.veloAnim.enNegro();
      }
      let op;
      if (pasado < d) op = pasado / d;
      else if (pasado < d + 350) op = 1;
      else op = Math.max(0, 1 - (pasado - d - 350) / d);
      this.velo.material.opacity = op;
      if (pasado > 2 * d + 350) {
        this.velo.visible = false;
        this.veloAnim = null;
      }
    }
    if (this.estado === 'sala' && (!this.ultimoHud || ahora - this.ultimoHud > 500)) {
      this.ultimoHud = ahora;
      this.pintarHud();
    }
  },

  // --- dibujo ---

  pintarRotulo(textoRotulo, color) {
    pintar(this.rotulo, (ctx, w, h) => texto(ctx, textoRotulo, w / 2, h / 2, { tam: h * 0.5, peso: 700, color, alinear: 'center' }));
  },

  pintarEtiquetaPalanca(t, color) {
    pintar(this.etiquetaPalanca, (ctx, w, h) => {
      rectRedondo(ctx, 4, 4, w - 8, h - 8, h / 2 - 4);
      ctx.fillStyle = 'rgba(6,8,13,.9)';
      ctx.fill();
      texto(ctx, t, w / 2, h / 2 + 2, { tam: h * 0.5, peso: 700, color, alinear: 'center' });
    });
  },

  pintarHud() {
    pintar(this.hud, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      let seg = 0;
      if (this.tFinal != null) seg = this.tFinal;
      else if (this.estado !== 'inicio' && this.t0) seg = (performance.now() - this.t0) / 1000;
      const reloj = `${String(Math.floor(seg / 60)).padStart(2, '0')}:${String(Math.floor(seg % 60)).padStart(2, '0')}`;
      texto(ctx, reloj, w * 0.2, h / 2, { tam: 90, peso: 600, color: COLOR.acento, alinear: 'center', fuente: MONO });
      texto(ctx, `${this.puntos || 0} pts`, w * 0.52, h / 2, { tam: 80, peso: 700, color: COLOR.bien, alinear: 'center' });
      const sala = this.estado === 'inicio' ? '—' : `${Math.min(this.sala + 1, 4)}/4`;
      texto(ctx, `SALA ${sala}`, w * 0.84, h / 2, { tam: 56, peso: 600, color: COLOR.tenue, alinear: 'center' });
    });
  },

  pintarFocos() {
    this.focos.forEach((f, i) => {
      const on = this.bits[i] === 1;
      f.setAttribute('material', { color: on ? '#5AA9FF' : '#1c2a44', emissive: on ? '#5AA9FF' : '#000000', emissiveIntensity: on ? 1.2 : 0 });
    });
  },

  /** Convierte metros del panel (centro = 0,0) a pixeles del lienzo. */
  px(ctx, x, y) {
    const P = NOC.panel;
    return [(x + P.ancho / 2) * (ctx.canvas.width / P.ancho), (P.alto / 2 - y) * (ctx.canvas.height / P.alto)];
  },

  pintarSala() {
    const s = this.datos.salas[this.sala];
    const k = 2048 / NOC.panel.ancho; // pixeles por metro del panel
    pintar(this.panel, (ctx, w, h) => {
      fondoPanel(ctx, w, h, 'rgba(12,22,40,.97)');
      const titulo = { ip: 'NIVEL 1 · DIRECCIÓN IP', palabra: 'NIVEL 2 · CONTRASEÑA DEL SISTEMA', vars: 'NIVEL 3 · VOLCADO DE MEMORIA', logica: 'NIVEL 4 · VERIFICACIÓN LÓGICA' }[s.id];
      const sub = {
        ip: 'El servidor reporta su IP en binario. Escríbela en decimal.',
        palabra: 'Enciende los bits para deletrear la palabra, letra por letra.',
        vars: 'Tres variables en binario. Escribe su valor decimal.',
        logica: `Aprueba o rechaza cada afirmación. Necesitas ${this.datos.minimo_aciertos} de ${this.datos.evaluaciones}.`,
      }[s.id];
      let [x, y] = this.px(ctx, 0, 1.38);
      texto(ctx, titulo, x, y, { tam: 0.15 * k, peso: 700, color: s.acento, alinear: 'center' });
      [x, y] = this.px(ctx, 0, 1.12);
      texto(ctx, sub, x, y, { tam: 0.085 * k, color: COLOR.tenue, alinear: 'center' });

      if (s.id === 'ip' || s.id === 'vars') {
        const { yIni, dy } = this.geometriaFilas(this.filas.length);
        this.filas.forEach((f, i) => {
          const yy = yIni - i * dy;
          if (f.etq) { [x, y] = this.px(ctx, -2.3, yy); texto(ctx, f.etq, x, y, { tam: 0.13 * k, peso: 600, color: COLOR.tenue, alinear: 'center', fuente: MONO }); }
          [x, y] = this.px(ctx, -1.35, yy);
          texto(ctx, conEspacio(bin8(f.val)), x, y, { tam: 0.15 * k, peso: 600, color: COLOR.texto, alinear: 'center', fuente: MONO });
          const activo = i === this.sel && !this.resuelto;
          const [cx, cy] = this.px(ctx, 0.1, yy);
          rectRedondo(ctx, cx - 0.42 * k, cy - 0.17 * k, 0.84 * k, 0.34 * k, 0.06 * k);
          ctx.fillStyle = '#06080D';
          ctx.fill();
          ctx.lineWidth = activo ? 8 : 4;
          ctx.strokeStyle = this.resuelto ? COLOR.bien : activo ? s.acento : 'rgba(242,244,248,.3)';
          ctx.stroke();
          texto(ctx, this.buffers[i] || '___', cx, cy + 4, { tam: 0.15 * k, peso: 600, color: this.resuelto ? COLOR.bien : COLOR.texto, alinear: 'center', fuente: MONO });
        });
      } else if (s.id === 'palabra') {
        const palabra = this.partida.palabra;
        [x, y] = this.px(ctx, 0, 0.8);
        texto(ctx, `PALABRA:  ${palabra}`, x, y, { tam: 0.17 * k, peso: 600, color: s.acento, alinear: 'center', fuente: MONO });
        for (let i = 0; i < 8; i++) {
          [x, y] = this.px(ctx, -1.75 + i * 0.5, -0.1);
          texto(ctx, String(i + 1), x, y + 10, { tam: 0.08 * k, peso: 600, color: COLOR.tenue, alinear: 'center' });
        }
        [x, y] = this.px(ctx, 0, -0.38);
        texto(ctx, `${this.bits.slice(0, 4).join(' ')}   ${this.bits.slice(4).join(' ')}`, x, y, { tam: 0.13 * k, peso: 600, alinear: 'center', fuente: MONO });
        [x, y] = this.px(ctx, 0, -0.68);
        if (this.resuelto) texto(ctx, 'CONTRASEÑA ACEPTADA', x, y, { tam: 0.12 * k, peso: 700, color: COLOR.bien, alinear: 'center' });
        else {
          const escritas = palabra.split('').map((c, i) => (i < this.letra ? c : '_')).join(' ');
          texto(ctx, `[ ${escritas} ]    letra ${this.letra + 1} de ${palabra.length}:  "${palabra[this.letra]}"`, x, y, { tam: 0.1 * k, peso: 600, alinear: 'center', fuente: MONO });
        }
      } else {
        const { a, b, c } = this.partida.vars;
        [x, y] = this.px(ctx, 0, 0.8);
        texto(ctx, `a = ${conEspacio(bin8(a))}    b = ${conEspacio(bin8(b))}    c = ${conEspacio(bin8(c))}`, x, y, { tam: 0.1 * k, peso: 600, color: s.acento, alinear: 'center', fuente: MONO });
        [x, y] = this.px(ctx, 0, 0.62);
        texto(ctx, '(en binario: usen lo que anotaron en la sala 3)', x, y, { tam: 0.07 * k, color: COLOR.tenue, alinear: 'center' });
        [x, y] = this.px(ctx, 0, 0.2);
        const evs = this.partida.evaluaciones;
        if (this.resuelto) texto(ctx, 'VERIFICADO', x, y, { tam: 0.3 * k, peso: 700, color: COLOR.bien, alinear: 'center' });
        else if (this.evIdx < evs.length) texto(ctx, evs[this.evIdx].t, x, y, { tam: 0.3 * k, peso: 600, alinear: 'center', fuente: MONO });
        if (this.ultima) {
          [x, y] = this.px(ctx, 0, -0.3);
          texto(ctx, `${this.ultima.bien ? '✓' : '✗'}  ${this.ultima.texto}`, x, y, { tam: 0.09 * k, peso: 600, color: this.ultima.bien ? COLOR.bien : COLOR.mal, alinear: 'center' });
        }
        [x, y] = this.px(ctx, 0, -0.62);
        texto(ctx, `afirmación ${Math.min(this.evIdx + 1, evs.length)} de ${evs.length}  ·  aciertos: ${this.aciertos}`, x, y, { tam: 0.085 * k, color: COLOR.tenue, alinear: 'center' });
      }
      if (this.mensaje) {
        const enIzquierda = s.id === 'ip' || s.id === 'vars';
        [x, y] = this.px(ctx, enIzquierda ? -0.85 : 0, enIzquierda ? -1.05 : -0.95);
        texto(ctx, this.mensaje.texto, enIzquierda ? x : x, y, { tam: 0.085 * k, peso: 600, color: this.mensaje.color, alinear: 'center' });
      }
    });
  },
});
