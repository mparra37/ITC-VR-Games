/* VR ITC Games · Drones de Ultrón: ¿amigo o enemigo?
 *
 * Drones llegan volando alrededor del Operador (tiene que voltear a buscarlos). Algunos son aliados
 * y otros son de Ultrón. El Operador describe el dron; los decodificadores siguen el árbol de decisión
 * del Manual de campo y le dicen "¡FUEGO!" (le dispara con el gatillo) o "¡ALIADO!" (botón ALIADO).
 * Así aprenden cómo clasifica una inteligencia artificial: preguntas de sí o no hasta una respuesta.
 *
 * Nivel 1: árbol A.  Nivel 2: árbol B.  Nivel 3: Ultrón cambia de modelo: en cada dron toca el B o el C.
 * Ronda de 3 minutos, +1 por acierto, bloqueo de 5 segundos al fallar o saltar.
 * Los árboles vienen de js/drones_datos.js (generado por prototipo_papel/generar_drones.py).
 */
/* global AFRAME, THREE, COLOR, LETRA, MONO, texto, fondoPanel, minutos, pintar, rectRedondo, sonido, crearEntidad, refrescarApuntadores, crearConsola, irA */

const CONFIG = {
  segundosRonda: 180,
  segundosBloqueo: 5,
  aciertosPorNivel: 5,
  nivelMaximo: 3,
  radioDrones: 2.6,
  segundosLlegada: 1.2,
  segundosRuta: 3.2,
};

// lugares donde se detienen los drones (grados, + = derecha) y altura: a los lados y enfrente, nunca atrás
const LUGARES = [
  { a: -95, y: 1.3 }, { a: -70, y: 1.75 }, { a: -48, y: 1.15 }, { a: -25, y: 1.85 }, { a: 0, y: 1.75 },
  { a: 25, y: 1.85 }, { a: 48, y: 1.15 }, { a: 70, y: 1.75 }, { a: 95, y: 1.3 },
];

const COLOR_OJO = { rojo: 0xff1638, azul: 0x2f7dff, blanco: 0xffffff };

// ---------- lógica de los árboles (igual que en generar_drones.py) ----------

function cumple(nodo, dron) {
  const v = dron[nodo.rasgo];
  if (nodo.op === '=') return v === nodo.valor;
  if (nodo.op === '>=') return v >= nodo.valor;
  if (nodo.op === '<=') return v <= nodo.valor;
  return v % 2 === 0; // "par"
}

function preguntaCorta(nodo) {
  const { rasgo: r, op, valor: v } = nodo;
  if (r === 'forma') return `¿${v.charAt(0).toUpperCase()}${v.slice(1)}?`;
  if (r === 'ojo') return `¿Ojo ${v}?`;
  if (r === 'antenas') return op === '>=' ? `¿${v} antenas o más?` : `¿${v} ${v === 1 ? 'antena' : 'antenas'} o menos?`;
  if (r === 'helices') return `¿${v} hélices?`;
  if (r === 'parpadea') return '¿Parpadea?';
  return '¿Serie par?';
}

/** Recorre el árbol: { respuesta: 'ENEMIGO' | 'ALIADO', ruta: ['¿Cubo? SÍ', ...], camino: 'si,no' } */
function evaluar(arbol, dron) {
  let nodo = arbol;
  const ruta = [];
  const camino = [];
  while (typeof nodo !== 'string') {
    const si = cumple(nodo, dron);
    ruta.push(`${preguntaCorta(nodo)} ${si ? 'SÍ' : 'NO'}`);
    camino.push(si ? 'si' : 'no');
    nodo = si ? nodo.si : nodo.no;
  }
  return { respuesta: nodo, ruta, camino: camino.join(',') };
}

function caminos(nodo, prefijo = []) {
  if (typeof nodo === 'string') return [prefijo.join(',')];
  return caminos(nodo.si, prefijo.concat('si')).concat(caminos(nodo.no, prefijo.concat('no')));
}

const azarDe = (lista) => lista[Math.floor(Math.random() * lista.length)];
const barajar = (lista) => lista.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);

function dronAlAzar(rasgos) {
  return {
    forma: azarDe(rasgos.forma),
    ojo: azarDe(rasgos.ojo),
    antenas: azarDe(rasgos.antenas),
    helices: azarDe(rasgos.helices),
    parpadea: azarDe(rasgos.parpadea),
    serie: rasgos.serie[0] + Math.floor(Math.random() * (rasgos.serie[1] - rasgos.serie[0] + 1)),
  };
}

// ---------- modelo 3D del dron (mira hacia +z) ----------

function lienzoTextura(ancho, alto, dibujo) {
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  dibujo(canvas.getContext('2d'), ancho, alto);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function crearDron(d, { conSerie = true } = {}) {
  const grupo = new THREE.Group();
  const cuerpo = new THREE.Group();
  grupo.add(cuerpo);
  const metal = new THREE.MeshStandardMaterial({ color: 0x2c2c33, metalness: 0.6, roughness: 0.35 });
  const borde = new THREE.LineBasicMaterial({ color: 0xc9ced6 });
  let geo;
  let frente;
  let tope;
  if (d.forma === 'esfera') {
    geo = new THREE.SphereGeometry(0.2, 28, 18);
    frente = 0.19; tope = 0.19;
  } else if (d.forma === 'cubo') {
    geo = new THREE.BoxGeometry(0.34, 0.34, 0.34);
    frente = 0.175; tope = 0.17;
  } else {
    geo = new THREE.ConeGeometry(0.27, 0.44, 4, 1);
    geo.rotateY(Math.PI / 4);
    frente = 0.1; tope = 0.22;
  }
  cuerpo.add(new THREE.Mesh(geo, metal));
  if (d.forma !== 'esfera') cuerpo.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), borde));
  else cuerpo.add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.006, 6, 48), new THREE.MeshBasicMaterial({ color: 0xc9ced6 })));

  // ojo con aro
  const ojoMat = new THREE.MeshBasicMaterial({ color: COLOR_OJO[d.ojo] });
  const ojoY = d.forma === 'pirámide' ? -0.07 : 0;
  const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14), ojoMat);
  ojo.position.set(0, ojoY, frente + 0.01);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.012, 8, 32), new THREE.MeshBasicMaterial({ color: 0x0a0a0c }));
  aro.position.set(0, ojoY, frente + 0.02);
  cuerpo.add(ojo, aro);

  // antenas (separadas para poder contarlas)
  const xs = { 0: [], 1: [0], 2: [-0.075, 0.075], 3: [-0.1, 0, 0.1] }[d.antenas];
  const varilla = new THREE.MeshBasicMaterial({ color: 0x9aa0a8 });
  const punta = new THREE.MeshBasicMaterial({ color: 0xff1638 });
  xs.forEach((x) => {
    const base = d.forma === 'pirámide' ? tope - Math.abs(x) * 1.2 : tope - (d.forma === 'esfera' ? x * x * 2.2 : 0);
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.17, 6), varilla);
    v.position.set(x * 1.25, base + 0.08, 0);
    v.rotation.z = -x * 2.2;
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), punta);
    p.position.set(x * 1.25 - Math.sin(-x * 2.2) * 0.085, base + 0.165, 0);
    cuerpo.add(v, p);
  });

  // hélices
  const rotores = [];
  const lugaresRotor = d.helices === 2 ? [[-0.38, 0], [0.38, 0]] : [[-0.33, -0.2], [0.33, -0.2], [-0.33, 0.2], [0.33, 0.2]];
  const brazoMat = new THREE.MeshStandardMaterial({ color: 0x1c1c22, metalness: 0.5, roughness: 0.4 });
  const discoMat = new THREE.MeshBasicMaterial({ color: 0xc9ced6, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const guardaMat = new THREE.MeshBasicMaterial({ color: 0xe6e8eb });
  const aspaMat = new THREE.MeshBasicMaterial({ color: 0xe6e8eb });
  lugaresRotor.forEach(([x, z]) => {
    const largo = Math.hypot(x, z);
    const brazo = new THREE.Mesh(new THREE.BoxGeometry(largo, 0.025, 0.03), brazoMat);
    brazo.position.set(x / 2, 0, z / 2);
    brazo.rotation.y = -Math.atan2(z, x);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), brazoMat);
    motor.position.set(x, 0.02, z);
    const rotor = new THREE.Group();
    rotor.position.set(x, 0.05, z);
    const disco = new THREE.Mesh(new THREE.CircleGeometry(0.12, 28), discoMat);
    disco.rotation.x = -Math.PI / 2;
    const aspa = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.006, 0.025), aspaMat);
    rotor.add(disco, aspa);
    rotores.push(rotor);
    // aro protector de la hélice: se ve aunque el dron esté a la altura de los ojos
    const guarda = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.014, 6, 32), guardaMat);
    guarda.rotation.x = Math.PI / 2;
    guarda.position.set(x, 0.05, z);
    grupo.add(brazo, motor, rotor, guarda);
  });

  // número de serie
  if (conSerie) {
    const tex = lienzoTextura(256, 112, (ctx, w, h) => {
      rectRedondo(ctx, 4, 4, w - 8, h - 8, 18);
      ctx.fillStyle = '#e6e8eb';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#15171a';
      ctx.stroke();
      ctx.fillStyle = '#15171a';
      ctx.font = `700 74px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`#${d.serie}`, w / 2, h / 2 + 4);
    });
    const placa = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.114), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    placa.position.set(0, -0.33, 0.02);
    const colgante = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 6), varilla);
    colgante.position.set(0, -0.24, 0.02);
    grupo.add(placa, colgante);
  }

  // inclinado hacia el jugador para que se vean las 4 hélices
  cuerpo.rotation.x = -0.15;
  grupo.rotation.x = 0.55;
  return { grupo, ojoMat, rotores, color: COLOR_OJO[d.ojo], parpadea: d.parpadea };
}

// ---------- el juego ----------

AFRAME.registerComponent('drones-ultron', {
  init() {
    this.pantalla = '';
    this.pantallas = {};
    this.botones = { inicio: [], juego: [], fin: [] };
    this.ultimoSegundo = null;
    this.nivel = 1;
    this.actual = null; // { datos, arbol, resultado, el, modelo, casa, estado, t0 }
    this.colas = {};
    this.efectos = [];
    this.construirEscena();
    this.el.sceneEl.addEventListener('boton-presionado', (e) => this.presionar(e.detail.accion, e.detail.valor));
    window.addEventListener('keydown', (e) => this.teclaFisica(e));
    this.mostrar('inicio');
    window.juego = this; // para probar desde la consola
  },

  // --- construcción ---

  crearBoton(pantalla, textoBoton, x, y, opciones) {
    const el = crearEntidad(this.pantallas[pantalla], { position: `${x} ${y} 0.01`, boton: Object.assign({ texto: textoBoton }, opciones) });
    this.botones[pantalla].push(el);
    return el;
  },

  construirEscena() {
    const consola = crearConsola(this.el);
    ['inicio', 'juego', 'fin'].forEach((n) => { this.pantallas[n] = crearEntidad(consola, { visible: false }); });

    const ini = this.pantallas.inicio;
    this.lienzoTitulo = crearEntidad(ini, { lienzo: 'ancho: 1.5; alto: 0.42', position: '0 0.22 0' });
    this.crearBoton('inicio', 'Practicar (sin tiempo)', -0.5, -0.1, { ancho: 0.46, alto: 0.15, accion: 'practicar' });
    this.crearBoton('inicio', 'Empezar ronda · 3 min', 0.02, -0.1, { ancho: 0.5, alto: 0.15, accion: 'empezar', estilo: 'principal' });
    this.crearBoton('inicio', 'Menú de juegos', 0.53, -0.1, { ancho: 0.44, alto: 0.15, accion: 'menu' });
    this.lienzoSeguridad = crearEntidad(ini, { lienzo: 'ancho: 1.5; alto: 0.17', position: '0 -0.35 0' });

    const jue = this.pantallas.juego;
    this.lienzoBarra = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.12', position: '0 0.38 0' });
    this.lienzoInfo = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.42', position: '0 0.09 0' });
    this.lienzoMensaje = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.08', position: '0 -0.18 0' });
    this.crearBoton('juego', 'ALIADO · dejar pasar', -0.3, -0.35, { ancho: 0.66, alto: 0.13, accion: 'aliado', estilo: 'principal' });
    this.crearBoton('juego', 'Saltar', 0.22, -0.35, { ancho: 0.3, alto: 0.11, accion: 'saltar' });
    this.botonTerminar = this.crearBoton('juego', 'Terminar', 0.57, -0.35, { ancho: 0.3, alto: 0.11, accion: 'terminar' });

    const fin = this.pantallas.fin;
    this.lienzoResultado = crearEntidad(fin, { lienzo: 'ancho: 1.5; alto: 0.66', position: '0 0.1 0' });
    this.crearBoton('fin', 'Nueva ronda', -0.33, -0.35, { ancho: 0.58, alto: 0.14, accion: 'nueva', estilo: 'principal' });
    this.crearBoton('fin', 'Menú de juegos', 0.33, -0.35, { ancho: 0.58, alto: 0.14, accion: 'menu' });

    // drones de Ultrón patrullando a lo lejos (solo decoración)
    this.patrulla = [];
    for (let i = 0; i < 6; i++) {
      const d = dronAlAzar(window.DRONES.rasgos);
      const m = crearDron(d, { conSerie: false });
      m.grupo.scale.setScalar(1.6);
      this.el.object3D.add(m.grupo);
      this.patrulla.push({ m, radio: 14 + i * 3, alto: 5 + (i % 3) * 2.5, vel: 0.05 + i * 0.012, fase: i * 1.1 });
    }

    // anillo de escaneo que marca al dron actual
    this.anillo = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.012, 6, 64), new THREE.MeshBasicMaterial({ color: 0xff1638, transparent: true, opacity: 0.8 }));
    this.anillo.visible = false;
    this.el.object3D.add(this.anillo);

    this.dibujarInicio();
  },

  mostrar(nombre) {
    this.pantalla = nombre;
    Object.entries(this.pantallas).forEach(([n, el]) => el.setAttribute('visible', n === nombre));
    Object.entries(this.botones).forEach(([n, lista]) => {
      lista.forEach((b) => b.classList.toggle('clickable', n === nombre && b.getAttribute('visible') !== false));
    });
    if (this.actual && this.actual.el) this.actual.el.classList.toggle('clickable', nombre === 'juego');
    refrescarApuntadores();
  },

  // --- lógica ---

  presionar(accion, valor) {
    if (accion === 'menu') return irA('index.html');
    if (accion === 'empezar' || accion === 'practicar') {
      this.empezar(accion === 'practicar' ? 'practica' : 'ronda');
    } else if (accion === 'nueva') {
      this.mostrar('inicio');
    } else if (this.pantalla === 'juego') {
      if (accion === 'terminar') return this.terminar();
      if (this.bloqueado() || !this.actual || this.actual.estado !== 'listo') return null;
      if (accion === 'disparo') this.responder('ENEMIGO');
      if (accion === 'aliado') this.responder('ALIADO');
      if (accion === 'saltar') {
        this.saltados += 1;
        this.bloquear('Saltaste el dron');
        this.salir('aliado');
      }
    }
    return null;
  },

  /** En la computadora: E = enemigo (disparar), A = aliado. */
  teclaFisica(e) {
    if (this.pantalla !== 'juego') return;
    const k = e.key.toLowerCase();
    if (k === 'e') this.presionar('disparo');
    if (k === 'a') this.presionar('aliado');
  },

  empezar(modo) {
    this.modo = modo;
    this.puntaje = 0;
    this.errores = 0;
    this.saltados = 0;
    this.nivel = 1;
    this.bloqueoHasta = 0;
    this.mensaje = null;
    this.ruta = null;
    this.colas = {};
    this.quitarDron();
    this.finRonda = performance.now() + CONFIG.segundosRonda * 1000;
    this.botonTerminar.setAttribute('visible', modo === 'practica');
    this.mostrar('juego');
    this.nuevoDron();
    this.dibujarTodo();
    this.avisar(modo === 'practica' ? 'Práctica: sin tiempo y sin puntos para el marcador' : '¡Ya! Busquen el primer dron', COLOR.acento);
    sonido.nivel();
  },

  /** Elige el árbol y un dron que llegue a una rama distinta cada vez (mitad enemigos, mitad aliados). */
  generarDron() {
    const datos = window.DRONES;
    const nombre = azarDe(datos.niveles[this.nivel].arboles);
    const arbol = datos.arboles[nombre];
    if (!this.colas[nombre] || !this.colas[nombre].length) this.colas[nombre] = barajar(caminos(arbol));
    const meta = this.colas[nombre].pop();
    const anterior = this.actual && this.actual.datos;
    for (let intento = 0; intento < 5000; intento++) {
      const d = dronAlAzar(datos.rasgos);
      const resultado = evaluar(arbol, d);
      const igual = anterior && ['forma', 'ojo', 'antenas', 'helices', 'parpadea'].every((k) => d[k] === anterior[k]);
      if (resultado.camino === meta && !igual) return { datos: d, arbol: nombre, resultado };
    }
    const d = dronAlAzar(datos.rasgos);
    return { datos: d, arbol: nombre, resultado: evaluar(arbol, d) };
  },

  nuevoDron() {
    const elegido = this.generarDron();
    let lugar;
    do { lugar = azarDe(LUGARES); } while (this.ultimoLugar && lugar === this.ultimoLugar);
    this.ultimoLugar = lugar;
    const rad = THREE.MathUtils.degToRad(lugar.a);
    const casa = new THREE.Vector3(Math.sin(rad) * CONFIG.radioDrones, lugar.y, -Math.cos(rad) * CONFIG.radioDrones);
    const desde = casa.clone().multiplyScalar(4).add(new THREE.Vector3(0, 2.5, 0));

    const el = crearEntidad(this.el, {});
    const modelo = crearDron(elegido.datos);
    el.setObject3D('mesh', modelo.grupo);
    // zona invisible más grande, para apuntarle fácil
    const zona = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    modelo.grupo.add(zona);
    el.object3D.position.copy(desde);
    el.object3D.rotation.set(0, -rad, 0);
    el.addEventListener('click', () => this.presionar('disparo'));
    el.addEventListener('mouseenter', () => { if (this.actual && this.actual.el === el && this.actual.estado === 'listo') modelo.grupo.scale.setScalar(1.1); });
    el.addEventListener('mouseleave', () => modelo.grupo.scale.setScalar(1));

    this.actual = Object.assign(elegido, { el, modelo, casa, desde, rad, lado: lugar.a, estado: 'llegando', t0: performance.now() });
    this.dibujarInfo();
    sonido.tono(240, 0.5, 'sawtooth', 0.03);
  },

  quitarDron() {
    if (this.actual && this.actual.el && this.actual.el.parentNode) this.actual.el.parentNode.removeChild(this.actual.el);
    this.actual = null;
    this.anillo.visible = false;
  },

  responder(respuesta) {
    const a = this.actual;
    const correcto = respuesta === a.resultado.respuesta;
    this.ruta = { lineas: a.resultado.ruta, final: a.resultado.respuesta, arbol: a.arbol, correcto, hasta: performance.now() + CONFIG.segundosRuta * 1000 };
    if (correcto) {
      this.puntaje += 1;
      sonido.bien();
      this.avisar(respuesta === 'ENEMIGO' ? `¡Dron de Ultrón derribado! · +1` : `¡Aliado a salvo! · +1`, COLOR.bien);
      this.salir(respuesta === 'ENEMIGO' ? 'explota' : 'aliado');
      const nivelNuevo = Math.min(CONFIG.nivelMaximo, 1 + Math.floor(this.puntaje / CONFIG.aciertosPorNivel));
      if (nivelNuevo > this.nivel) {
        this.nivel = nivelNuevo;
        this.colas = {};
        setTimeout(() => {
          this.avisar(this.nivel === 3 ? '¡Nivel 3! Ultrón cambia de modelo: revisen qué árbol toca' : '¡Nivel 2! Ahora usen el árbol B', COLOR.acento);
          sonido.nivel();
        }, 900);
      }
    } else {
      this.errores += 1;
      this.bloquear(respuesta === 'ENEMIGO' ? '¡Era un aliado!' : '¡Era un dron de Ultrón!');
      if (respuesta === 'ALIADO') this.disparoEnemigo();
      this.salir(respuesta === 'ENEMIGO' ? 'explota' : 'aliado');
    }
    this.dibujarBarra();
    this.dibujarInfo();
  },

  /** El dron sale de escena; al terminar, llega el siguiente. */
  salir(como) {
    const a = this.actual;
    a.estado = como;
    a.t0 = performance.now();
    a.el.classList.remove('clickable');
    refrescarApuntadores();
    this.anillo.visible = false;
    if (como === 'explota') this.explosion(a.el.object3D.position);
  },

  explosion(pos) {
    [0xff1638, 0xe6e8eb].forEach((color, i) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 }));
      m.position.copy(pos);
      m.lookAt(0, 1.2, 0);
      this.el.object3D.add(m);
      this.efectos.push({ m, t0: performance.now() + i * 90, dur: 600, tipo: 'onda' });
    });
    sonido.tono(110, 0.5, 'square', 0.09);
  },

  disparoEnemigo() {
    const a = this.actual;
    const geo = new THREE.BufferGeometry().setFromPoints([a.el.object3D.position.clone(), new THREE.Vector3(0, 1.0, -0.4)]);
    const m = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff1638, transparent: true, opacity: 1 }));
    this.el.object3D.add(m);
    this.efectos.push({ m, t0: performance.now(), dur: 450, tipo: 'rayo' });
  },

  bloquear(motivo) {
    this.bloqueoHasta = performance.now() + CONFIG.segundosBloqueo * 1000;
    this.avisar(`${motivo} Bloqueo de ${CONFIG.segundosBloqueo} segundos`, COLOR.mal);
    sonido.mal();
    this.dibujarInfo();
  },

  bloqueado() {
    return performance.now() < this.bloqueoHasta;
  },

  avisar(textoAviso, color) {
    this.mensaje = { texto: textoAviso, color, hasta: performance.now() + 2800 };
    this.dibujarMensaje();
  },

  terminar() {
    this.quitarDron();
    sonido.fin();
    this.dibujarResultado();
    this.mostrar('fin');
  },

  tick(t, dt) {
    const s = t / 1000;
    const ahora = performance.now();
    // patrulla de fondo
    this.patrulla.forEach((p) => {
      const ang = p.fase + s * p.vel;
      p.m.grupo.position.set(Math.sin(ang) * p.radio, p.alto + Math.sin(s + p.fase) * 0.4, -Math.cos(ang) * p.radio);
      p.m.grupo.rotation.y = -ang + Math.PI / 2;
      p.m.rotores.forEach((r) => { r.rotation.y = s * 30; });
    });
    // efectos
    this.efectos = this.efectos.filter((e) => {
      const f = (ahora - e.t0) / e.dur;
      if (f < 0) return true;
      if (f >= 1) {
        this.el.object3D.remove(e.m);
        return false;
      }
      if (e.tipo === 'onda') e.m.scale.setScalar(1 + f * 5);
      e.m.material.opacity = 1 - f;
      return true;
    });

    const a = this.actual;
    if (a) {
      const obj = a.el.object3D;
      const m = a.modelo;
      m.rotores.forEach((r) => { r.rotation.y = s * 35; });
      if (m.parpadea) m.ojoMat.color.setHex(Math.floor(s * 2.6) % 2 ? 0x101012 : m.color);
      const f = (ahora - a.t0) / 1000;
      if (a.estado === 'llegando') {
        const u = Math.min(1, f / CONFIG.segundosLlegada);
        const e = 1 - (1 - u) ** 3;
        obj.position.lerpVectors(a.desde, a.casa, e);
        if (u >= 1) {
          a.estado = 'listo';
          a.el.classList.add('clickable');
          refrescarApuntadores();
        }
      } else if (a.estado === 'listo') {
        obj.position.copy(a.casa);
        obj.position.y += Math.sin(s * 2) * 0.03;
        obj.lookAt(0, 1.2, 0);
        this.anillo.visible = true;
        this.anillo.position.copy(obj.position);
        this.anillo.lookAt(0, 1.2, 0);
        this.anillo.rotation.z = s;
      } else if (a.estado === 'explota') {
        const u = Math.min(1, f / 0.45);
        m.grupo.scale.setScalar(Math.max(0.001, 1 - u));
        m.grupo.rotation.z = u * 4;
        if (f > 0.9) this.siguiente();
      } else if (a.estado === 'aliado') {
        obj.position.copy(a.casa).add(new THREE.Vector3(0, f * f * 3, 0)).addScaledVector(a.casa, f * 1.5);
        if (f > 1.0) this.siguiente();
      }
    }

    if (this.pantalla !== 'juego') return;
    if (this.modo === 'ronda' && ahora >= this.finRonda) {
      this.terminar();
      return;
    }
    const segundo = Math.floor(ahora / 1000);
    if (segundo !== this.ultimoSegundo) {
      this.ultimoSegundo = segundo;
      this.dibujarBarra();
      if ((this.bloqueoHasta && ahora < this.bloqueoHasta + 1000) || (this.ruta && ahora < this.ruta.hasta + 1000)) this.dibujarInfo();
      if (this.mensaje && ahora > this.mensaje.hasta) {
        this.mensaje = null;
        this.dibujarMensaje();
      }
    }
  },

  siguiente() {
    this.quitarDron();
    if (this.pantalla === 'juego') this.nuevoDron();
  },

  // --- dibujo ---

  dibujarTodo() {
    this.dibujarBarra();
    this.dibujarInfo();
    this.dibujarMensaje();
  },

  dibujarInicio() {
    pintar(this.lienzoTitulo, (ctx, w, h) => {
      texto(ctx, 'VR ITC GAMES · VR, REDES Y TECNOLOGÍA', w / 2, h * 0.13, { tam: 44, color: COLOR.acento, peso: 700, alinear: 'center' });
      texto(ctx, 'Drones de Ultrón', w / 2, h * 0.4, { tam: 100, peso: 700, alinear: 'center' });
      texto(ctx, '¿Amigo o enemigo? Describan cada dron y sigan el árbol de decisión del manual.', w / 2, h * 0.66, { tam: 40, color: COLOR.tenue, alinear: 'center' });
      texto(ctx, 'Cuando estén listos, presionen Empezar', w / 2, h * 0.88, { tam: 44, peso: 600, color: COLOR.acento, alinear: 'center' });
    });
    pintar(this.lienzoSeguridad, (ctx, w, h) => {
      fondoPanel(ctx, w, h, '#121216');
      texto(ctx, 'Gira la cabeza, no te levantes · Correa del control en la muñeca', w / 2, h * 0.36, { tam: 38, alinear: 'center' });
      texto(ctx, 'Al terminar, quítate el visor con las dos manos y pásalo con cuidado', w / 2, h * 0.7, { tam: 34, color: COLOR.tenue, alinear: 'center' });
    });
  },

  dibujarBarra() {
    pintar(this.lienzoBarra, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      texto(ctx, 'DRONES DE ULTRÓN', 30, h / 2, { tam: 42, peso: 700 });
      const ancho = ctx.measureText('DRONES DE ULTRÓN').width;
      texto(ctx, `Nivel ${this.nivel}`, 30 + ancho + 24, h / 2, { tam: 36, color: COLOR.tenue });
      texto(ctx, `Drones: ${this.puntaje}`, w * 0.66, h / 2, { tam: 44, peso: 700, alinear: 'center' });
      if (this.modo === 'practica') {
        texto(ctx, 'PRÁCTICA', w - 30, h / 2, { tam: 42, peso: 700, color: COLOR.acento, alinear: 'right' });
      } else {
        const restante = (this.finRonda - performance.now()) / 1000;
        texto(ctx, minutos(restante), w - 30, h / 2, { tam: 56, peso: 700, color: restante <= 30 ? COLOR.mal : COLOR.acento, alinear: 'right' });
      }
    });
  },

  dibujarInfo() {
    const a = this.actual;
    const ruta = this.ruta && performance.now() < this.ruta.hasta ? this.ruta : null;
    pintar(this.lienzoInfo, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      if (ruta) {
        // el camino que siguieron en el árbol (para aprender, aunque hayan fallado)
        texto(ctx, ruta.correcto ? `CORRECTO · ASÍ DECIDE EL ÁRBOL ${ruta.arbol}` : `ASÍ ERA EN EL ÁRBOL ${ruta.arbol}`, 40, h * 0.13, { tam: 34, peso: 700, color: ruta.correcto ? COLOR.bien : COLOR.mal });
        const pasos = ruta.lineas.concat(ruta.final === 'ENEMIGO' ? '✕ ENEMIGO' : '✓ ALIADO');
        const alto = Math.min(0.17, 0.66 / pasos.length);
        pasos.forEach((p, i) => {
          const ultimo = i === pasos.length - 1;
          texto(ctx, `${ultimo ? '→' : `${i + 1}.`}  ${p}`, w * 0.12, h * (0.3 + i * alto), { tam: 46, peso: ultimo ? 700 : 500, color: ultimo ? (ruta.final === 'ENEMIGO' ? COLOR.acento : COLOR.texto) : COLOR.texto });
        });
      } else if (a) {
        const lado = a.lado < -10 ? 'A LA IZQUIERDA ←' : a.lado > 10 ? 'A LA DERECHA →' : 'ENFRENTE ↑';
        texto(ctx, `DRON DETECTADO · ${lado}`, 40, h * 0.13, { tam: 36, peso: 700, color: COLOR.tenue });
        texto(ctx, 'USEN EL', w * 0.25, h * 0.36, { tam: 38, peso: 600, color: COLOR.tenue, alinear: 'center' });
        rectRedondo(ctx, w * 0.08, h * 0.45, w * 0.34, h * 0.3, 22);
        ctx.fillStyle = 'rgba(255,22,56,.15)';
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = COLOR.acento;
        ctx.stroke();
        texto(ctx, `ÁRBOL ${a.arbol}`, w * 0.25, h * 0.6, { tam: 78, peso: 800, color: COLOR.acento, alinear: 'center' });
        texto(ctx, 'Descríbanlo:', w * 0.48, h * 0.36, { tam: 38, peso: 600, color: COLOR.tenue });
        texto(ctx, 'forma · ojo · ¿parpadea?', w * 0.48, h * 0.5, { tam: 40 });
        texto(ctx, 'antenas · hélices · número', w * 0.48, h * 0.63, { tam: 40 });
        texto(ctx, 'ENEMIGO: apúntale y dispara  ·  ALIADO: botón ALIADO', w / 2, h * 0.88, { tam: 36, peso: 600, color: COLOR.acento, alinear: 'center' });
      }
      const restante = (this.bloqueoHasta - performance.now()) / 1000;
      if (restante > 0 && !ruta) {
        ctx.fillStyle = 'rgba(40, 6, 14, 0.88)';
        rectRedondo(ctx, 4, 4, w - 8, h - 8, 24);
        ctx.fill();
        texto(ctx, '¡CONTRAATAQUE DE ULTRÓN!', w / 2, h * 0.4, { tam: 76, peso: 800, color: COLOR.mal, alinear: 'center' });
        texto(ctx, `Esperen ${Math.ceil(restante)} s · nadie habla`, w / 2, h * 0.65, { tam: 50, alinear: 'center' });
      }
    });
  },

  dibujarMensaje() {
    pintar(this.lienzoMensaje, (ctx, w, h) => {
      if (!this.mensaje) return;
      texto(ctx, this.mensaje.texto, w / 2, h / 2, { tam: 38, peso: 600, color: this.mensaje.color, alinear: 'center' });
    });
  },

  dibujarResultado() {
    const practica = this.modo === 'practica';
    pintar(this.lienzoResultado, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      texto(ctx, practica ? 'PRÁCTICA TERMINADA' : 'TIEMPO // RETO COMPLETADO', w / 2, h * 0.1, { tam: 54, peso: 800, color: COLOR.acento, alinear: 'center' });
      texto(ctx, practica ? 'Puntaje de práctica (no se anota)' : '¡Ultrón pierde esta energía! Anótenla en el marcador', w / 2, h * 0.22, { tam: 46, peso: 700, color: COLOR.bien, alinear: 'center' });
      texto(ctx, `${this.puntaje}`, w / 2, h * 0.41, { tam: 150, peso: 800, alinear: 'center' });
      texto(ctx, this.puntaje === 1 ? 'dron identificado' : 'drones identificados', w / 2, h * 0.56, { tam: 40, color: COLOR.tenue, alinear: 'center' });
      texto(ctx, `Nivel alcanzado: ${this.nivel} · Errores: ${this.errores} · Saltados: ${this.saltados}`, w / 2, h * 0.64, { tam: 34, color: COLOR.tenue, alinear: 'center' });
      texto(ctx, 'Ustedes siguieron un ÁRBOL DE DECISIÓN: así clasifican muchas IA', w / 2, h * 0.73, { tam: 38, peso: 600, color: COLOR.acento, alinear: 'center' });
      rectRedondo(ctx, 40, h * 0.8, w - 80, h * 0.15, 16);
      ctx.fillStyle = '#16161b';
      ctx.fill();
      texto(ctx, 'Operador: quítate el visor con las dos manos y pásalo al siguiente', w / 2, h * 0.875, { tam: 36, peso: 600, alinear: 'center' });
    });
  },
});
