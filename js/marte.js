/* VR ITC Games · Misión Marte: la IA del rover
 *
 * Una tormenta de arena dejó al rover sin cámara: solo tiene sensores.
 * El Operador lee los valores de los sensores de cada muestra. Los decodificadores
 * son el "cerebro" de la IA: con la tabla de pesos del Manual de campo calculan
 * el puntaje de cada clase (valor x peso, y suman) y la clase con más puntos gana.
 * Así decide una capa de neuronas artificiales.
 *
 * Nivel 1: 2 sensores, ROCA o HIELO. Nivel 2: 3 sensores, + METAL.
 * Nivel 3: 4 sensores, + VIDA, y aparecen pesos negativos (restan).
 * Ronda de 3 minutos, +1 por acierto, bloqueo de 5 segundos al fallar o saltar,
 * sube de nivel cada 5 aciertos. Al acertar se muestra el cálculo y el rover actúa.
 *
 * Inspirado en las actividades "desconectadas" de AI Unplugged (Lindner, Seegerer y Romeike, 2019).
 */
/* global AFRAME, THREE, COLOR, MONO, texto, fondoPanel, minutos, pintar, rectRedondo, sonido, crearEntidad, refrescarApuntadores, azarConSemilla */

const CONFIG = {
  segundosRonda: 180,
  segundosBloqueo: 5,
  aciertosPorNivel: 5,
  nivelMaximo: 3,
  msRevision: 2600,
};

// ---------- la "red neuronal" (igual que en generar_marte.py) ----------

/** Puntaje de cada clase: suma de valor x peso. */
function calcular(nivel, valores) {
  const red = window.MISION_MARTE.niveles[String(nivel)];
  const puntajes = {};
  Object.entries(red.pesos).forEach(([clase, pesos]) => {
    puntajes[clase] = pesos.reduce((suma, peso, i) => suma + peso * valores[i], 0);
  });
  const orden = Object.entries(puntajes).sort((a, b) => b[1] - a[1]);
  return { puntajes, ganador: orden[0][0], margen: orden[0][1] - orden[1][1] };
}

/** Una muestra al azar: primero se elige la clase (para que salgan parejas) y luego valores que la hagan ganar. */
function generarMuestra(nivel, anterior) {
  const d = window.MISION_MARTE;
  const red = d.niveles[String(nivel)];
  const clases = Object.keys(red.pesos);
  const objetivo = clases[Math.floor(Math.random() * clases.length)];
  for (let intento = 0; intento < 2000; intento++) {
    const valores = red.sensores.map(() => Math.floor(Math.random() * (d.valor_maximo + 1)));
    if (valores.every((v) => v === 0)) continue;
    const r = calcular(nivel, valores);
    const repetida = anterior && anterior.valores.join() === valores.join();
    if (r.ganador === objetivo && r.margen >= d.margen_minimo && !repetida) {
      return { valores, sensores: red.sensores, ...r };
    }
  }
  throw new Error(`No se pudo generar una muestra de ${objetivo}`);
}

// ---------- Marte: terreno, montañas, domo geodésico y polvo ----------

AFRAME.registerComponent('ambiente-marte', {
  init() {
    const azar = azarConSemilla(1969);
    const grupo = new THREE.Group();
    this.el.sceneEl.setAttribute('fog', 'type: exponential; color: #5a2a1c; density: 0.014');

    // cielo: casi negro arriba, polvo naranja en el horizonte, con estrellas
    const cielo = document.createElement('canvas');
    cielo.width = 2048;
    cielo.height = 1024;
    const c = cielo.getContext('2d');
    const degradado = c.createLinearGradient(0, 0, 0, 1024);
    degradado.addColorStop(0, '#05030b');
    degradado.addColorStop(0.3, '#1c0d20');
    degradado.addColorStop(0.44, '#6b2f2a');
    degradado.addColorStop(0.5, '#d48a55');
    degradado.addColorStop(0.53, '#7a3a24');
    degradado.addColorStop(1, '#2a120c');
    c.fillStyle = degradado;
    c.fillRect(0, 0, 2048, 1024);
    for (let i = 0; i < 600; i++) {
      c.globalAlpha = 0.2 + azar() * 0.8;
      c.fillStyle = '#ffffff';
      c.fillRect(azar() * 2048, azar() * 380, 2, 2);
    }
    c.globalAlpha = 1;
    const texCielo = new THREE.CanvasTexture(cielo);
    texCielo.colorSpace = THREE.SRGBColorSpace;
    grupo.add(new THREE.Mesh(
      new THREE.SphereGeometry(180, 48, 24),
      new THREE.MeshBasicMaterial({ map: texCielo, side: THREE.BackSide, fog: false, depthWrite: false }),
    ));

    // la Tierra (punto azul) y las dos lunas de Marte
    const tierra = new THREE.Mesh(new THREE.SphereGeometry(1.4, 24, 16), new THREE.MeshBasicMaterial({ color: 0x4aa8ff, fog: false }));
    tierra.position.set(-40, 55, -110);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(2.2, 24, 16), new THREE.MeshBasicMaterial({ color: 0x4aa8ff, transparent: true, opacity: 0.25, fog: false }));
    halo.position.copy(tierra.position);
    const fobos = new THREE.Mesh(new THREE.SphereGeometry(2.5, 16, 12), new THREE.MeshBasicMaterial({ color: 0xb8a89a, fog: false }));
    fobos.position.set(60, 70, -90);
    const deimos = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 12), new THREE.MeshBasicMaterial({ color: 0x9a8a7c, fog: false }));
    deimos.position.set(95, 45, -40);
    grupo.add(tierra, halo, fobos, deimos);
    this.tierra = tierra;

    // terreno con dunas (plano dentro del domo)
    const terreno = new THREE.PlaneGeometry(260, 260, 130, 130);
    terreno.rotateX(-Math.PI / 2);
    const pos = terreno.attributes.position;
    const colores = [];
    const color = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      let y = Math.sin(x * 0.08) * 1.2 + Math.cos(z * 0.06) * 1.5 + Math.sin((x + z) * 0.15) * 0.5;
      y *= Math.min(1, Math.max(0, (r - 6) / 10)); // plano cerca del domo
      pos.setY(i, y - 0.05);
      color.setHSL(0.04 + azar() * 0.02, 0.62, 0.22 + y * 0.03 + azar() * 0.04);
      colores.push(color.r, color.g, color.b);
    }
    terreno.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
    terreno.computeVertexNormals();
    grupo.add(new THREE.Mesh(terreno, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })));

    // rocas
    const materialRoca = new THREE.MeshStandardMaterial({ color: 0x6a2e1c, roughness: 1, flatShading: true });
    for (let i = 0; i < 70; i++) {
      const angulo = azar() * Math.PI * 2;
      const radio = 6 + azar() * 55;
      const roca = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + azar() * 0.9, 0), materialRoca);
      roca.position.set(Math.cos(angulo) * radio, 0.05, Math.sin(angulo) * radio);
      roca.rotation.set(azar() * 3, azar() * 3, azar() * 3);
      roca.scale.y = 0.5 + azar() * 0.6;
      grupo.add(roca);
    }
    // montañas a lo lejos
    const materialMonte = new THREE.MeshStandardMaterial({ color: 0x4a1d12, roughness: 1, flatShading: true });
    for (let i = 0; i < 26; i++) {
      const angulo = (i / 26) * Math.PI * 2 + azar() * 0.2;
      const radio = 85 + azar() * 25;
      const alto = 8 + azar() * 22;
      const monte = new THREE.Mesh(new THREE.ConeGeometry(10 + azar() * 14, alto, 7), materialMonte);
      monte.position.set(Math.cos(angulo) * radio, alto / 2 - 1, Math.sin(angulo) * radio);
      grupo.add(monte);
    }

    // domo geodésico de cristal (solo la mitad de arriba) y su piso
    const ico = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(4.2, 2));
    const lineas = ico.attributes.position;
    const arriba = [];
    for (let i = 0; i < lineas.count; i += 2) {
      if (lineas.getY(i) > -0.01 && lineas.getY(i + 1) > -0.01) {
        arriba.push(lineas.getX(i), lineas.getY(i), lineas.getZ(i), lineas.getX(i + 1), lineas.getY(i + 1), lineas.getZ(i + 1));
      }
    }
    const geoDomo = new THREE.BufferGeometry();
    geoDomo.setAttribute('position', new THREE.Float32BufferAttribute(arriba, 3));
    grupo.add(new THREE.LineSegments(geoDomo, new THREE.LineBasicMaterial({ color: 0xff1638, transparent: true, opacity: 0.45 })));
    const vidrio = new THREE.Mesh(
      new THREE.SphereGeometry(4.18, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xff1638, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false }),
    );
    grupo.add(vidrio);
    const piso = new THREE.Mesh(new THREE.CircleGeometry(4.2, 48), new THREE.MeshStandardMaterial({ color: 0x141a2e, metalness: 0.7, roughness: 0.4 }));
    piso.rotation.x = -Math.PI / 2;
    piso.position.y = 0.01;
    grupo.add(piso);
    [1.9, 3.0, 4.15].forEach((radio) => {
      const aro = new THREE.Mesh(new THREE.RingGeometry(radio - 0.03, radio, 64), new THREE.MeshBasicMaterial({ color: 0xff1638, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
      aro.rotation.x = -Math.PI / 2;
      aro.position.y = 0.02;
      grupo.add(aro);
    });

    // polvo flotando
    const total = 450;
    const p = new Float32Array(total * 3);
    for (let i = 0; i < total; i++) {
      p[i * 3] = (azar() - 0.5) * 60;
      p[i * 3 + 1] = azar() * 8;
      p[i * 3 + 2] = (azar() - 0.5) * 60;
    }
    const geoPolvo = new THREE.BufferGeometry();
    geoPolvo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.polvo = new THREE.Points(geoPolvo, new THREE.PointsMaterial({ color: 0xe8a070, size: 0.06, transparent: true, opacity: 0.7 }));
    grupo.add(this.polvo);

    this.el.setObject3D('ambiente', grupo);
  },
  tick(t, dt) {
    if (!this.polvo) return;
    const s = Math.min(dt || 16, 50) / 1000;
    const pos = this.polvo.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i) + s * (0.8 + (i % 5) * 0.2);
      if (x > 30) x = -30;
      pos.setX(i, x);
      pos.setY(i, pos.getY(i) + Math.sin(t / 900 + i) * s * 0.1);
    }
    pos.needsUpdate = true;
    this.tierra.rotation.y += s * 0.2;
  },
});

// ---------- el rover y la muestra ----------

function crearRover() {
  const rover = new THREE.Group();
  const blanco = new THREE.MeshStandardMaterial({ color: 0xe9edf5, metalness: 0.3, roughness: 0.5 });
  const oscuro = new THREE.MeshStandardMaterial({ color: 0x23283a, metalness: 0.5, roughness: 0.6 });
  const panelSolar = new THREE.MeshStandardMaterial({ color: 0x1b3b8a, metalness: 0.8, roughness: 0.3, emissive: 0x0a1a44 });
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.9), blanco);
  cuerpo.position.y = 0.6;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 1.1), panelSolar);
  panel.position.y = 0.8;
  const mastil = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 10), oscuro);
  mastil.position.set(0.5, 1.15, 0.2);
  const cabeza = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.18), blanco);
  cabeza.position.set(0.5, 1.55, 0.2);
  const ojo = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), new THREE.MeshBasicMaterial({ color: 0xff1638 }));
  ojo.position.set(0.66, 1.55, 0.2);
  ojo.rotation.y = Math.PI / 2;
  const antena = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 6), oscuro);
  antena.position.set(-0.5, 1.05, -0.3);
  const plato = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.08, 16, 1, true), blanco);
  plato.position.set(-0.5, 1.32, -0.3);
  plato.rotation.x = Math.PI;
  rover.add(cuerpo, panel, mastil, cabeza, ojo, antena, plato);
  [-0.55, 0, 0.55].forEach((x) => {
    [-0.5, 0.5].forEach((z) => {
      const rueda = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 16), oscuro);
      rueda.rotation.x = Math.PI / 2;
      rueda.position.set(x, 0.2, z);
      rover.add(rueda);
    });
  });
  // rayo de acción (cambia de color y de largo según lo que decida la IA)
  const rayo = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x5dff8a, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }));
  rayo.visible = false;
  rover.add(rayo);
  rover.userData = { rayo };
  return rover;
}

function crearEscaner() {
  const escaner = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.9, 24), new THREE.MeshStandardMaterial({ color: 0x141a2e, metalness: 0.7, roughness: 0.35 }));
  base.position.y = 0.45;
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 8, 48), new THREE.MeshBasicMaterial({ color: 0xff1638 }));
  aro.rotation.x = Math.PI / 2;
  aro.position.y = 0.91;
  const luz = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.05, 0.7, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff1638, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
  luz.position.y = 1.26;
  const cristalMat = new THREE.MeshStandardMaterial({ color: 0x9fe8ff, metalness: 0.2, roughness: 0.1, emissive: 0xff1638, emissiveIntensity: 0.6, transparent: true, opacity: 0.9, flatShading: true });
  const cristal = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), cristalMat);
  cristal.position.y = 1.3;
  cristal.scale.y = 1.5;
  escaner.add(base, aro, luz, cristal);
  escaner.userData = { cristal, cristalMat, aro, luz };
  return escaner;
}

// ---------- el juego ----------

AFRAME.registerComponent('mision-marte', {
  init() {
    this.pantalla = '';
    this.pantallas = {};
    this.botones = { inicio: [], juego: [], fin: [] };
    this.ultimoSegundo = null;
    this.nivel = 1;
    this.muestra = null;
    this.numeroMuestra = 0;
    this.revision = null;
    this.accionRover = null;
    this.construirEscena();
    this.el.sceneEl.addEventListener('boton-presionado', (e) => this.presionar(e.detail.accion, e.detail.valor));
    window.addEventListener('keydown', (e) => this.teclaFisica(e));
    this.mostrar('inicio');
    window.juego = this; // para probar desde la consola
  },

  // --- construcción ---

  crearBoton(pantalla, texto, x, y, opciones) {
    const el = crearEntidad(this.pantallas[pantalla], { position: `${x} ${y} 0.01`, boton: Object.assign({ texto }, opciones) });
    this.botones[pantalla].push(el);
    return el;
  },

  construirEscena() {
    const panel = crearEntidad(this.el, { position: '0 1.38 -1.8' });
    crearEntidad(panel, { geometry: 'primitive: plane; width: 2.26; height: 1.86', material: 'shader: flat; color: #ff1638; opacity: 0.5; transparent: true', position: '0 -0.12 -0.035' });
    crearEntidad(panel, { geometry: 'primitive: plane; width: 2.22; height: 1.82', material: 'shader: flat; color: #050506; opacity: 0.9; transparent: true', position: '0 -0.12 -0.03' });
    ['inicio', 'juego', 'fin'].forEach((nombre) => { this.pantallas[nombre] = crearEntidad(panel, { visible: false }); });

    // inicio
    const ini = this.pantallas.inicio;
    this.lienzoTitulo = crearEntidad(ini, { lienzo: 'ancho: 2; alto: 0.62', position: '0 0.42 0' });
    this.crearBoton('inicio', 'Practicar (sin tiempo)', -0.45, -0.1, { ancho: 0.76, alto: 0.16, accion: 'practicar' });
    this.crearBoton('inicio', 'Empezar misión · 3 min', 0.45, -0.1, { ancho: 0.76, alto: 0.16, accion: 'empezar', estilo: 'principal' });
    this.crearBoton('inicio', 'Menú de juegos', 0, -0.72, { ancho: 0.6, alto: 0.12, accion: 'menu' });
    this.lienzoSeguridad = crearEntidad(ini, { lienzo: 'ancho: 2; alto: 0.24', position: '0 -0.44 0' });

    // juego
    const jue = this.pantallas.juego;
    this.lienzoBarra = crearEntidad(jue, { lienzo: 'ancho: 2; alto: 0.16', position: '0 0.66 0' });
    this.lienzoScan = crearEntidad(jue, { lienzo: 'ancho: 2; alto: 0.62', position: '0 0.22 0' });
    this.lienzoMensaje = crearEntidad(jue, { lienzo: 'ancho: 2; alto: 0.1', position: '0 -0.16 0' });
    // un juego de botones por nivel (2, 3 y 4 clases)
    const posiciones = { 2: [[-0.45, 0.8], [0.45, 0.8]], 3: [[-0.62, 0.56], [0, 0.56], [0.62, 0.56]], 4: [[-0.75, 0.42], [-0.25, 0.42], [0.25, 0.42], [0.75, 0.42]] };
    this.botonesNivel = {};
    Object.entries(window.MISION_MARTE.niveles).forEach(([nivel, red]) => {
      const clases = Object.keys(red.pesos);
      this.botonesNivel[nivel] = clases.map((clase, i) => {
        const [x, ancho] = posiciones[clases.length][i];
        return this.crearBoton('juego', clase, x, -0.4, { ancho, alto: 0.22, accion: 'responder', valor: clase });
      });
    });
    this.crearBoton('juego', 'Saltar', -0.62, -0.84, { ancho: 0.4, alto: 0.13, accion: 'saltar' });
    this.botonTerminar = this.crearBoton('juego', 'Terminar', 0, -0.84, { ancho: 0.4, alto: 0.13, accion: 'terminar' });

    // fin
    const fin = this.pantallas.fin;
    this.lienzoResultado = crearEntidad(fin, { lienzo: 'ancho: 2; alto: 1.12', position: '0 0.2 0' });
    this.crearBoton('fin', 'Nueva misión', -0.42, -0.6, { ancho: 0.76, alto: 0.16, accion: 'nueva', estilo: 'principal' });
    this.crearBoton('fin', 'Menú de juegos', 0.42, -0.6, { ancho: 0.76, alto: 0.16, accion: 'menu' });

    // escáner con la muestra (izquierda) y rover afuera del domo (derecha)
    this.escaner = crearEscaner();
    crearEntidad(this.el, { position: '-1.6 0 -1.55' }).setObject3D('mesh', this.escaner);
    this.rover = crearRover();
    this.posRover = new THREE.Vector3(4.6, 0, -4.9);
    crearEntidad(this.el, {}).setObject3D('mesh', this.rover);
    this.rover.position.copy(this.posRover);
    this.rover.rotation.y = 2.4; // de lado, mirando hacia el domo

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

  ajustarBotones() {
    Object.entries(this.botonesNivel).forEach(([nivel, lista]) => {
      lista.forEach((b) => b.setAttribute('visible', Number(nivel) === this.nivel));
    });
    this.mostrar('juego');
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
      if (this.bloqueado() || this.revision) return;
      if (accion === 'responder') this.responder(valor);
      if (accion === 'saltar') {
        this.saltadas += 1;
        this.bloquear('Saltaste la muestra');
        this.nuevaMuestra();
      }
    }
  },

  /** En la computadora: R = roca, H = hielo, M = metal, V = vida. */
  teclaFisica(e) {
    if (this.pantalla !== 'juego') return;
    const clase = { r: 'ROCA', h: 'HIELO', m: 'METAL', v: 'VIDA' }[e.key.toLowerCase()];
    const disponibles = Object.keys(window.MISION_MARTE.niveles[String(this.nivel)].pesos);
    if (clase && disponibles.includes(clase)) this.presionar('responder', clase);
  },

  empezar(modo) {
    this.modo = modo;
    this.puntaje = 0;
    this.errores = 0;
    this.saltadas = 0;
    this.nivel = 1;
    this.numeroMuestra = 0;
    this.bloqueoHasta = 0;
    this.mensaje = null;
    this.revision = null;
    this.finRonda = performance.now() + CONFIG.segundosRonda * 1000;
    this.botonTerminar.setAttribute('visible', modo === 'practica');
    this.nuevaMuestra();
    this.dibujarTodo();
    this.avisar(modo === 'practica' ? 'Práctica: sin tiempo y sin puntos para el marcador' : '¡Misión en marcha! Tienen 3 minutos', COLOR.acento);
    sonido.nivel();
  },

  nuevaMuestra() {
    this.muestra = generarMuestra(this.nivel, this.muestra);
    this.numeroMuestra += 1;
    const e = this.escaner.userData;
    e.cristalMat.emissive.setHex(0xff1638);
    e.cristalMat.color.setHex(0x9fe8ff);
    this.ajustarBotones();
    this.dibujarScan();
  },

  responder(clase) {
    if (clase === this.muestra.ganador) {
      this.puntaje += 1;
      sonido.bien();
      const info = window.MISION_MARTE.clases[clase];
      this.avisar(`¡Correcto! Es ${clase}: el rover va a ${info.accion.toLowerCase().replace('¡', '').replace('!', '')} · +1`, COLOR.bien);
      this.revision = { hasta: performance.now() + CONFIG.msRevision };
      this.accionRover = { clase, inicio: performance.now() };
      const colorClase = new THREE.Color(info.color);
      this.escaner.userData.cristalMat.emissive.copy(colorClase);
      this.escaner.userData.cristalMat.color.copy(colorClase);
      if (clase === 'VIDA') sonido.nivel();
      this.dibujarScan();
      this.dibujarBarra();
    } else {
      this.errores += 1;
      this.bloquear('Incorrecto');
    }
  },

  terminarRevision() {
    this.revision = null;
    const nivelNuevo = Math.min(CONFIG.nivelMaximo, 1 + Math.floor(this.puntaje / CONFIG.aciertosPorNivel));
    if (nivelNuevo > this.nivel) {
      this.nivel = nivelNuevo;
      this.avisar(this.nivel === 3 ? '¡Nivel 3! Nuevo sensor (Calor), pesos negativos… y quizá VIDA' : '¡Nivel 2! Nuevo sensor (Magnetismo) y nueva clase: METAL', COLOR.acento);
      sonido.nivel();
    }
    this.nuevaMuestra();
    this.dibujarBarra();
  },

  bloquear(motivo) {
    this.bloqueoHasta = performance.now() + CONFIG.segundosBloqueo * 1000;
    this.avisar(`${motivo}: bloqueo de ${CONFIG.segundosBloqueo} segundos`, COLOR.mal);
    sonido.mal();
    this.escaner.userData.cristalMat.emissive.setHex(0xff5468);
    this.dibujarScan();
  },

  bloqueado() {
    return performance.now() < this.bloqueoHasta;
  },

  avisar(textoAviso, color) {
    this.mensaje = { texto: textoAviso, color, hasta: performance.now() + 2800 };
    this.dibujarMensaje();
  },

  terminar() {
    this.revision = null;
    sonido.fin();
    this.dibujarResultado();
    this.mostrar('fin');
  },

  tick(t) {
    // la muestra gira en el escáner
    const e = this.escaner.userData;
    e.cristal.rotation.y = t / 700;
    e.cristal.position.y = 1.3 + Math.sin(t / 500) * 0.02;
    e.luz.material.opacity = 0.1 + Math.sin(t / 300) * 0.04;
    if (this.pantalla === 'juego' && !this.bloqueado() && !this.revision) e.cristalMat.emissive.setHex(0xff1638);

    // el rover actúa según la decisión de la IA
    const r = this.rover;
    const rayo = r.userData.rayo;
    r.position.copy(this.posRover);
    rayo.visible = false;
    if (this.accionRover) {
      const pasado = (performance.now() - this.accionRover.inicio) / 1000;
      const { clase } = this.accionRover;
      if (pasado > 3) {
        this.accionRover = null;
      } else {
        // avanza un poco y regresa
        const avance = Math.sin(Math.min(pasado / 3, 1) * Math.PI) * 0.8;
        r.position.x += Math.cos(-r.rotation.y) * avance;
        r.position.z += Math.sin(-r.rotation.y) * avance;
        if (clase !== 'ROCA' && pasado > 0.6) {
          rayo.visible = true;
          rayo.material.color.set(window.MISION_MARTE.clases[clase].color);
          const largo = clase === 'VIDA' ? 60 : 0.6;
          rayo.scale.set(clase === 'VIDA' ? 2 : 1, largo, clase === 'VIDA' ? 2 : 1);
          rayo.position.set(clase === 'VIDA' ? -0.5 : 0.8, clase === 'VIDA' ? 1.35 + largo / 2 : 0.3, clase === 'VIDA' ? -0.3 : 0);
          rayo.material.opacity = 0.5 + Math.sin(pasado * 20) * 0.25;
        }
      }
    }

    if (this.pantalla !== 'juego') return;
    const ahora = performance.now();
    if (this.revision && ahora >= this.revision.hasta) this.terminarRevision();
    if (this.modo === 'ronda' && ahora >= this.finRonda) {
      this.terminar();
      return;
    }
    const segundo = Math.floor(ahora / 1000);
    if (segundo !== this.ultimoSegundo) {
      this.ultimoSegundo = segundo;
      this.dibujarBarra();
      if (this.bloqueoHasta && ahora < this.bloqueoHasta + 1000) this.dibujarScan();
      if (this.mensaje && ahora > this.mensaje.hasta) {
        this.mensaje = null;
        this.dibujarMensaje();
      }
    }
  },

  // --- dibujo ---

  dibujarTodo() {
    this.dibujarBarra();
    this.dibujarScan();
    this.dibujarMensaje();
  },

  dibujarInicio() {
    pintar(this.lienzoTitulo, (ctx, w, h) => {
      texto(ctx, 'VR ITC GAMES · MISIÓN MARTE', w / 2, h * 0.13, { tam: 54, color: COLOR.acento, peso: 700, alinear: 'center' });
      texto(ctx, 'La IA del rover', w / 2, h * 0.36, { tam: 120, peso: 700, alinear: 'center' });
      texto(ctx, 'Una tormenta apagó la cámara. Ustedes son el cerebro de la IA.', w / 2, h * 0.6, { tam: 52, color: COLOR.tenue, alinear: 'center' });
      texto(ctx, 'Cuando estén listos, presionen Empezar', w / 2, h * 0.86, { tam: 54, peso: 600, color: COLOR.acento, alinear: 'center' });
    });
    pintar(this.lienzoSeguridad, (ctx, w, h) => {
      fondoPanel(ctx, w, h, '#121216');
      texto(ctx, 'Juega sentado · Correa del control en la muñeca', w / 2, h * 0.36, { tam: 46, alinear: 'center' });
      texto(ctx, 'Al terminar, quítate el visor con las dos manos y pásalo con cuidado', w / 2, h * 0.7, { tam: 40, color: COLOR.tenue, alinear: 'center' });
    });
  },

  dibujarBarra() {
    pintar(this.lienzoBarra, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      texto(ctx, 'MISIÓN MARTE', 40, h / 2, { tam: 56, peso: 700 });
      const ancho = ctx.measureText('MISIÓN MARTE').width;
      texto(ctx, `Nivel ${this.nivel}`, 40 + ancho + 36, h / 2, { tam: 46, color: COLOR.tenue });
      texto(ctx, `Muestras: ${this.puntaje}`, w * 0.6, h / 2, { tam: 58, peso: 700, alinear: 'center' });
      if (this.modo === 'practica') {
        texto(ctx, 'PRÁCTICA', w - 40, h / 2, { tam: 56, peso: 700, color: COLOR.acento, alinear: 'right' });
      } else {
        const restante = (this.finRonda - performance.now()) / 1000;
        texto(ctx, minutos(restante), w - 40, h / 2, { tam: 70, peso: 700, color: restante <= 30 ? COLOR.mal : COLOR.acento, alinear: 'right' });
      }
    });
  },

  dibujarScan() {
    const m = this.muestra;
    const d = window.MISION_MARTE;
    pintar(this.lienzoScan, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      texto(ctx, `MUESTRA #${String(this.numeroMuestra).padStart(2, '0')} · SENSORES DEL ROVER`, 60, h * 0.11, { tam: 42, peso: 600, color: COLOR.tenue });
      texto(ctx, '¿Qué es la muestra?', w - 60, h * 0.11, { tam: 52, peso: 700, color: COLOR.acento, alinear: 'right' });

      // una fila por sensor: nombre, barra de 0 a 3 y el número
      const n = m.sensores.length;
      const alto = (h * 0.72) / 4;
      const y0 = h * 0.24 + ((4 - n) * alto) / 2 + alto / 2;
      m.sensores.forEach((id, i) => {
        const y = y0 + i * alto;
        texto(ctx, d.sensores[id], 80, y, { tam: alto * 0.42, peso: 600 });
        for (let s = 0; s < d.valor_maximo; s++) {
          const x = 480 + s * 150;
          rectRedondo(ctx, x, y - alto * 0.28, 130, alto * 0.56, 10);
          ctx.fillStyle = s < m.valores[i] ? COLOR.acento : '#16161b';
          ctx.fill();
        }
        texto(ctx, String(m.valores[i]), 480 + d.valor_maximo * 150 + 40, y + 4, { tam: alto * 0.7, peso: 800, fuente: MONO });
      });
      texto(ctx, 'La tormenta tapó la cámara:', w - 60, h * 0.42, { tam: 40, color: COLOR.tenue, alinear: 'right' });
      texto(ctx, 'solo quedan los sensores.', w - 60, h * 0.42 + 50, { tam: 40, color: COLOR.tenue, alinear: 'right' });
      texto(ctx, 'Lean los números al equipo.', w - 60, h * 0.42 + 100, { tam: 40, color: COLOR.tenue, alinear: 'right' });

      // después de acertar: el cálculo de la IA
      if (this.revision) {
        ctx.fillStyle = '#04160f';
        rectRedondo(ctx, 4, 4, w - 8, h - 8, 24);
        ctx.fill();
        texto(ctx, 'ASÍ CALCULÓ LA IA (valor × peso, y se suma)', 60, h * 0.11, { tam: 44, peso: 700, color: COLOR.bien });
        const red = d.niveles[String(this.nivel)];
        const clases = Object.keys(red.pesos);
        const filaAlto = (h * 0.78) / 4;
        clases.forEach((clase, k) => {
          const yy = h * 0.27 + k * filaAlto;
          const partes = red.pesos[clase].map((peso, i) => `${m.valores[i]}×${peso < 0 ? `(${peso})` : peso}`).join(' + ');
          const gana = clase === m.ganador;
          texto(ctx, clase, 80, yy, { tam: 52, peso: 800, color: gana ? COLOR.bien : COLOR.texto });
          texto(ctx, `${partes} = ${m.puntajes[clase]}`, 400, yy, { tam: 48, color: gana ? COLOR.bien : COLOR.tenue, fuente: MONO });
          if (gana) texto(ctx, `← ${d.clases[clase].accion}`, w - 60, yy, { tam: 46, peso: 700, color: COLOR.bien, alinear: 'right' });
        });
      }

      const restante = (this.bloqueoHasta - performance.now()) / 1000;
      if (restante > 0) {
        ctx.fillStyle = 'rgba(40, 6, 14, 0.85)';
        rectRedondo(ctx, 4, 4, w - 8, h - 8, 24);
        ctx.fill();
        texto(ctx, '¡CONTRAATAQUE DE ULTRÓN!', w / 2, h * 0.38, { tam: 96, peso: 800, color: COLOR.mal, alinear: 'center' });
        texto(ctx, `Esperen ${Math.ceil(restante)} s · nadie habla`, w / 2, h * 0.64, { tam: 62, alinear: 'center' });
      }
    });
  },

  dibujarMensaje() {
    pintar(this.lienzoMensaje, (ctx, w, h) => {
      if (!this.mensaje) return;
      texto(ctx, this.mensaje.texto, w / 2, h / 2, { tam: 50, peso: 600, color: this.mensaje.color, alinear: 'center' });
    });
  },

  dibujarResultado() {
    const practica = this.modo === 'practica';
    pintar(this.lienzoResultado, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      texto(ctx, practica ? 'PRÁCTICA TERMINADA' : 'MISIÓN COMPLETADA', w / 2, h * 0.09, { tam: 60, peso: 800, color: COLOR.acento, alinear: 'center' });
      texto(ctx, practica ? 'Puntaje de práctica (no se anota)' : '¡Ultrón pierde esta energía! Anótenla en el marcador', w / 2, h * 0.21, { tam: 56, peso: 700, color: COLOR.bien, alinear: 'center' });
      texto(ctx, `${this.puntaje}`, w / 2, h * 0.37, { tam: 170, peso: 800, alinear: 'center' });
      texto(ctx, this.puntaje === 1 ? 'muestra identificada' : 'muestras identificadas', w / 2, h * 0.5, { tam: 48, color: COLOR.tenue, alinear: 'center' });
      texto(ctx, `Nivel alcanzado: ${this.nivel} · Errores: ${this.errores} · Saltadas: ${this.saltadas}`, w / 2, h * 0.58, { tam: 40, color: COLOR.tenue, alinear: 'center' });
      // el mensaje que queremos que se lleven
      rectRedondo(ctx, 60, h * 0.64, w - 120, h * 0.2, 18);
      ctx.fillStyle = '#0c2a24';
      ctx.fill();
      texto(ctx, 'Ustedes fueron una RED NEURONAL: multiplicar, sumar y elegir el mayor.', w / 2, h * 0.705, { tam: 44, peso: 700, color: COLOR.bien, alinear: 'center' });
      texto(ctx, 'Así deciden las IA de verdad (autos autónomos, asistentes, filtros), con millones de neuronas.', w / 2, h * 0.78, { tam: 38, color: COLOR.texto, alinear: 'center' });
      rectRedondo(ctx, 60, h * 0.87, w - 120, h * 0.1, 18);
      ctx.fillStyle = '#16161b';
      ctx.fill();
      texto(ctx, 'Operador: quítate el visor con las dos manos y pásalo al siguiente', w / 2, h * 0.92, { tam: 40, peso: 600, alinear: 'center' });
    });
  },
});
