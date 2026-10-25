/* VR ITC Games · Arma la computadora
 *
 * El Operador es diminuto dentro de una computadora abierta. Las 8 piezas flotan a su
 * alrededor y enfrente está la placa madre con un pedido. Los decodificadores buscan en el
 * Manual de campo qué pieza resuelve el pedido; el Operador voltea, la encuentra y la apunta.
 * La pieza vuela a su lugar en la placa madre (así aprenden dónde va cada una).
 *
 * Nivel 1: el pedido es la función.  Nivel 2: un problema que la pieza resuelve.
 * Nivel 3: la unidad en la que se mide, y las piezas cambian de lugar en cada pedido.
 * Ronda de 3 minutos, +1 por acierto, bloqueo de 5 segundos al fallar o saltar.
 */
/* global AFRAME, THREE, COLOR, texto, fondoPanel, minutos, pintar, rectRedondo, sonido, crearEntidad, refrescarApuntadores, crearConsola */

const CONFIG = {
  segundosRonda: 180,
  segundosBloqueo: 5,
  aciertosPorNivel: 5,
  nivelMaximo: 3,
  radioPiezas: 2.1,
};

// lugares alrededor del jugador (grados, + = derecha) y altura
const LUGARES = [
  { a: -100, y: 1.05 }, { a: -74, y: 1.55 }, { a: -50, y: 1.05 }, { a: -28, y: 1.75 },
  { a: 28, y: 1.75 }, { a: 50, y: 1.05 }, { a: 74, y: 1.55 }, { a: 100, y: 1.05 },
];

// dónde va cada pieza en la placa madre (metros, relativo al centro de la placa)
const RANURAS = {
  cpu: { x: -0.22, y: 0.18, texto: 'SOCKET CPU' },
  ram: { x: 0.12, y: 0.18, texto: 'RANURAS RAM' },
  ventilador: { x: -0.55, y: 0.28, texto: 'VENTILADOR' },
  fuente: { x: 0.55, y: 0.28, texto: 'ENERGÍA' },
  gpu: { x: -0.12, y: -0.12, texto: 'PCIe (VIDEO)' },
  ssd: { x: -0.3, y: -0.33, texto: 'M.2 (SSD)' },
  wifi: { x: 0.25, y: -0.33, texto: 'PCIe (WiFi)' },
  hdd: { x: 0.55, y: -0.15, texto: 'SATA (HDD)' },
};

// ---------- pedidos (igual que en generar_arma.py) ----------

const azarDe = (lista) => lista[Math.floor(Math.random() * lista.length)];

function generarPedido(nivel, anterior) {
  const piezas = window.COMPUTADORA.piezas;
  let pieza;
  do { pieza = azarDe(piezas); } while (anterior && anterior.respuesta === pieza.id);
  let textoPedido;
  if (nivel === 1) textoPedido = pieza.funcion;
  else if (nivel === 2) textoPedido = azarDe(pieza.problemas);
  else textoPedido = `Necesitamos la pieza que se mide en ${pieza.medida}.`;
  return { texto: textoPedido, respuesta: pieza.id };
}

/** Escribe un texto largo en varias líneas centradas. */
function textoEnLineas(ctx, str, x, y, anchoMax, tam, opciones = {}) {
  ctx.font = `${opciones.peso || 600} ${tam}px "Segoe UI", Roboto, system-ui, sans-serif`;
  const palabras = str.split(' ');
  const lineas = [];
  let actual = '';
  palabras.forEach((p) => {
    const prueba = actual ? `${actual} ${p}` : p;
    if (ctx.measureText(prueba).width > anchoMax && actual) {
      lineas.push(actual);
      actual = p;
    } else {
      actual = prueba;
    }
  });
  if (actual) lineas.push(actual);
  const interlineado = tam * 1.2;
  const y0 = y - ((lineas.length - 1) * interlineado) / 2;
  lineas.forEach((l, i) => texto(ctx, l, x, y0 + i * interlineado, { tam, peso: opciones.peso || 600, color: opciones.color || COLOR.texto, alinear: 'center' }));
}

// ---------- modelos 3D de las piezas (de frente hacia +z) ----------

function material(color, opciones = {}) {
  return new THREE.MeshStandardMaterial(Object.assign({ color, metalness: 0.4, roughness: 0.45 }, opciones));
}

function caja(ancho, alto, fondo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, fondo), mat);
  m.position.set(x, y, z);
  return m;
}

function crearModelo(id) {
  const g = new THREE.Group();
  const verde = material(0x1d5a3c);
  const negro = material(0x111522);
  const oro = material(0xd4a93a, { metalness: 0.9, roughness: 0.25 });
  const plata = material(0xc9d1df, { metalness: 0.9, roughness: 0.2 });
  const cian = new THREE.MeshBasicMaterial({ color: 0xff1638 });
  const magenta = new THREE.MeshBasicMaterial({ color: 0xe6e8eb });
  const ventilador = (radio) => {
    const v = new THREE.Group();
    v.add(new THREE.Mesh(new THREE.TorusGeometry(radio, radio * 0.12, 8, 32), negro));
    for (let i = 0; i < 7; i++) {
      const aspa = caja(radio * 0.9, radio * 0.25, 0.005, material(0x2a3550));
      aspa.position.x = radio * 0.45;
      const brazo = new THREE.Group();
      brazo.add(aspa);
      brazo.rotation.z = (i / 7) * Math.PI * 2;
      v.add(brazo);
    }
    v.add(new THREE.Mesh(new THREE.CircleGeometry(radio * 0.25, 20), cian));
    v.userData.gira = true;
    return v;
  };
  if (id === 'cpu') {
    g.add(caja(0.34, 0.34, 0.03, verde), caja(0.24, 0.24, 0.02, plata, 0, 0, 0.025));
    for (let i = 0; i < 6; i++) g.add(caja(0.3, 0.008, 0.005, oro, 0, -0.15 + i * 0.06, -0.018));
  } else if (id === 'ram') {
    g.add(caja(0.58, 0.14, 0.015, verde), caja(0.54, 0.025, 0.017, oro, 0, -0.06, 0));
    for (let i = 0; i < 8; i++) g.add(caja(0.05, 0.07, 0.012, negro, -0.23 + i * 0.066, 0.015, 0.012));
  } else if (id === 'ssd') {
    g.add(caja(0.34, 0.1, 0.015, negro), caja(0.2, 0.07, 0.004, cian, -0.03, 0, 0.01), caja(0.03, 0.06, 0.016, oro, 0.17, 0, 0));
  } else if (id === 'hdd') {
    g.add(caja(0.32, 0.42, 0.06, plata));
    // poco metálico: sin reflejos del entorno, un metal al 100% se ve negro
    const disco = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.006, 40), material(0xdfe6f5, { metalness: 0.35, roughness: 0.25, emissive: 0x1a2a44 }));
    disco.rotation.x = Math.PI / 2;
    disco.position.set(0, 0.05, 0.033);
    g.add(disco, caja(0.02, 0.16, 0.01, negro, 0.1, -0.08, 0.04));
  } else if (id === 'gpu') {
    g.add(caja(0.62, 0.2, 0.08, negro), caja(0.62, 0.015, 0.082, magenta, 0, 0.09, 0));
    [-0.15, 0.15].forEach((x) => { const v = ventilador(0.075); v.position.set(x, -0.005, 0.042); g.add(v); });
  } else if (id === 'fuente') {
    g.add(caja(0.36, 0.3, 0.3, material(0x2b2f3a)));
    const v = ventilador(0.11);
    v.position.z = 0.151;
    g.add(v, caja(0.05, 0.05, 0.02, material(0xffd166), 0.14, -0.11, 0.155));
  } else if (id === 'ventilador') {
    [[0, 0.16, 0.34, 0.02], [0, -0.16, 0.34, 0.02], [0.16, 0, 0.02, 0.34], [-0.16, 0, 0.02, 0.34]].forEach(([x, y, w, h]) => g.add(caja(w, h, 0.05, negro, x, y, 0)));
    g.add(ventilador(0.14));
  } else if (id === 'wifi') {
    g.add(caja(0.24, 0.15, 0.015, material(0x1d3a7a)), caja(0.1, 0.06, 0.01, plata, 0, -0.01, 0.012));
    [-0.07, 0.07].forEach((x) => {
      const antena = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.22, 10), negro);
      antena.position.set(x, 0.18, 0);
      g.add(antena);
    });
  }
  return g;
}

// ---------- el juego ----------

AFRAME.registerComponent('arma-computadora', {
  init() {
    this.pantalla = '';
    this.pantallas = {};
    this.botones = { inicio: [], juego: [], fin: [] };
    this.ultimoSegundo = null;
    this.nivel = 1;
    this.pedido = null;
    this.vuelo = null;
    this.construirEscena();
    this.el.sceneEl.addEventListener('boton-presionado', (e) => this.presionar(e.detail.accion, e.detail.valor));
    window.addEventListener('keydown', (e) => this.teclaFisica(e));
    this.acomodarPiezas();
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
    this.crearBoton('juego', 'Saltar', -0.4, -0.35, { ancho: 0.32, alto: 0.11, accion: 'saltar' });
    this.botonTerminar = this.crearBoton('juego', 'Terminar', 0, -0.35, { ancho: 0.32, alto: 0.11, accion: 'terminar' });

    const fin = this.pantallas.fin;
    this.lienzoResultado = crearEntidad(fin, { lienzo: 'ancho: 1.5; alto: 0.66', position: '0 0.1 0' });
    this.crearBoton('fin', 'Nueva ronda', -0.33, -0.35, { ancho: 0.58, alto: 0.14, accion: 'nueva', estilo: 'principal' });
    this.crearBoton('fin', 'Menú de juegos', 0.33, -0.35, { ancho: 0.58, alto: 0.14, accion: 'menu' });

    // placa madre enfrente, con las ranuras dibujadas, y el pedido arriba
    // la placa va arriba de la consola para que no la tape
    this.posPlaca = new THREE.Vector3(0, 1.75, -2.7);
    const placa = crearEntidad(this.el, { lienzo: 'ancho: 1.5; alto: 0.95', position: '0 1.75 -2.7' });
    pintar(placa, (ctx, w, h) => {
      rectRedondo(ctx, 4, 4, w - 8, h - 8, 30);
      ctx.fillStyle = '#0d2a20';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#2fd2a0';
      ctx.stroke();
      ctx.strokeStyle = 'rgba(47, 210, 160, 0.35)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 26; i++) {
        ctx.beginPath();
        ctx.moveTo(40 + ((i * 97) % (w - 80)), 30);
        ctx.lineTo(40 + ((i * 97) % (w - 80)), h - 30);
        ctx.stroke();
      }
      texto(ctx, 'PLACA MADRE', w / 2, 50, { tam: 44, peso: 800, color: '#2fd2a0', alinear: 'center' });
      Object.values(RANURAS).forEach((r) => {
        const cx = w / 2 + r.x * 1000;
        const cy = h / 2 - r.y * 1000;
        rectRedondo(ctx, cx - 120, cy - 55, 240, 110, 14);
        ctx.fillStyle = 'rgba(4, 20, 16, 0.9)';
        ctx.fill();
        ctx.setLineDash([12, 8]);
        ctx.strokeStyle = '#2fd2a0';
        ctx.stroke();
        ctx.setLineDash([]);
        texto(ctx, r.texto, cx, cy, { tam: 28, peso: 700, color: '#8ff0d0', alinear: 'center' });
      });
    });
    this.lienzoPedido = crearEntidad(this.el, { lienzo: 'ancho: 1.7; alto: 0.36', position: '0 2.46 -2.68' });

    // las 8 piezas alrededor
    this.piezas = {};
    window.COMPUTADORA.piezas.forEach((p) => {
      const el = crearEntidad(this.el, {});
      const modelo = crearModelo(p.id);
      modelo.scale.setScalar(1.25);
      el.setObject3D('mesh', modelo);
      const etiqueta = crearEntidad(el, { lienzo: 'ancho: 0.72; alto: 0.12', position: '0 -0.36 0' });
      pintar(etiqueta, (ctx, w, h) => {
        rectRedondo(ctx, 4, 4, w - 8, h - 8, 18);
        ctx.fillStyle = 'rgba(5, 5, 6, 0.88)';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255, 22, 56, 0.7)';
        ctx.stroke();
        texto(ctx, p.nombre, w / 2, h / 2 + 2, { tam: h * 0.46, peso: 800, alinear: 'center' });
      });
      el.addEventListener('mouseenter', () => { if (!this.vuelo) el.object3D.scale.setScalar(1.15); });
      el.addEventListener('mouseleave', () => el.object3D.scale.setScalar(1));
      el.addEventListener('click', () => this.presionar('pieza', p.id));
      this.piezas[p.id] = { el, modelo, datos: p, casa: new THREE.Vector3() };
      this.botones.juego.push(el);
    });

    this.dibujarInicio();
  },

  /** Reparte las piezas en lugares al azar alrededor del jugador. */
  acomodarPiezas() {
    const lugares = LUGARES.slice().sort(() => Math.random() - 0.5);
    Object.values(this.piezas).forEach((p, i) => {
      const lugar = lugares[i];
      const rad = THREE.MathUtils.degToRad(lugar.a);
      p.casa.set(Math.sin(rad) * CONFIG.radioPiezas, lugar.y, -Math.cos(rad) * CONFIG.radioPiezas);
      p.el.object3D.position.copy(p.casa);
      p.el.object3D.rotation.set(0, -rad, 0);
    });
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
      this.mostrar('inicio');
    } else if (this.pantalla === 'juego') {
      if (accion === 'terminar') return this.terminar();
      if (this.bloqueado() || this.vuelo) return;
      if (accion === 'pieza') this.elegir(valor);
      if (accion === 'saltar') {
        this.saltados += 1;
        this.bloquear('Saltaste el pedido');
        this.nuevoPedido();
      }
    }
  },

  /** En la computadora: teclas 1 a 8 eligen la pieza (en el orden del manual). */
  teclaFisica(e) {
    if (this.pantalla !== 'juego') return;
    const pieza = window.COMPUTADORA.piezas.find((p) => p.tecla === e.key);
    if (pieza) this.presionar('pieza', pieza.id);
  },

  empezar(modo) {
    this.modo = modo;
    this.puntaje = 0;
    this.errores = 0;
    this.saltados = 0;
    this.nivel = 1;
    this.bloqueoHasta = 0;
    this.mensaje = null;
    this.vuelo = null;
    this.finRonda = performance.now() + CONFIG.segundosRonda * 1000;
    this.botonTerminar.setAttribute('visible', modo === 'practica');
    this.acomodarPiezas();
    this.mostrar('juego');
    this.nuevoPedido();
    this.dibujarTodo();
    this.avisar(modo === 'practica' ? 'Práctica: sin tiempo y sin puntos para el marcador' : '¡Ya! Las piezas están a su alrededor', COLOR.acento);
    sonido.nivel();
  },

  nuevoPedido() {
    this.pedido = generarPedido(this.nivel, this.pedido);
    const pedido = this.pedido;
    pintar(this.lienzoPedido, (ctx, w, h) => {
      rectRedondo(ctx, 4, 4, w - 8, h - 8, 24);
      ctx.fillStyle = 'rgba(5, 5, 6, 0.92)';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = COLOR.acento;
      ctx.stroke();
      texto(ctx, 'PEDIDO', 40, 42, { tam: 32, peso: 800, color: COLOR.acento });
      textoEnLineas(ctx, pedido.texto, w / 2, h * 0.58, w - 120, 50);
    });
    this.dibujarInfo();
  },

  elegir(id) {
    const pieza = this.piezas[id];
    if (id === this.pedido.respuesta) {
      this.puntaje += 1;
      sonido.bien();
      this.avisar(`¡Instalada: ${pieza.datos.nombre}! · +1`, COLOR.bien);
      const ranura = RANURAS[id];
      const destino = new THREE.Vector3(this.posPlaca.x + ranura.x, this.posPlaca.y + ranura.y, this.posPlaca.z + 0.12);
      this.vuelo = { pieza, inicio: performance.now(), destino };
      pieza.el.object3D.scale.setScalar(1);
      this.dibujarBarra();
    } else {
      this.errores += 1;
      this.temblor = { pieza, inicio: performance.now() };
      this.bloquear(`${pieza.datos.nombre} no resuelve ese pedido`);
    }
  },

  terminarVuelo() {
    const { pieza } = this.vuelo;
    pieza.el.object3D.position.copy(pieza.casa);
    pieza.el.object3D.scale.setScalar(1);
    this.vuelo = null;
    const nivelNuevo = Math.min(CONFIG.nivelMaximo, 1 + Math.floor(this.puntaje / CONFIG.aciertosPorNivel));
    if (nivelNuevo > this.nivel) {
      this.nivel = nivelNuevo;
      this.acomodarPiezas();
      this.avisar(this.nivel === 3 ? '¡Nivel 3! Unidades de medida… y las piezas se mueven' : '¡Nivel 2! Ahora el pedido es un problema. ¡Las piezas cambiaron de lugar!', COLOR.acento);
      sonido.nivel();
    } else if (this.nivel === 3) {
      this.acomodarPiezas();
    }
    this.nuevoPedido();
    this.dibujarBarra();
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
    this.mensaje = { texto: textoAviso, color, hasta: performance.now() + 2800 };
    this.dibujarMensaje();
  },

  terminar() {
    if (this.vuelo) {
      this.vuelo.pieza.el.object3D.position.copy(this.vuelo.pieza.casa);
      this.vuelo = null;
    }
    sonido.fin();
    this.dibujarResultado();
    this.mostrar('fin');
  },

  tick(t) {
    // piezas flotando y ventiladores girando
    Object.values(this.piezas).forEach((p, i) => {
      p.modelo.position.y = Math.sin(t / 700 + i) * 0.025;
      p.modelo.traverse((o) => { if (o.userData.gira) o.rotation.z = t / 120; });
    });
    if (this.temblor) {
      const pasado = performance.now() - this.temblor.inicio;
      const obj = this.temblor.pieza.el.object3D;
      if (pasado > 600) {
        obj.position.copy(this.temblor.pieza.casa);
        this.temblor = null;
      } else {
        obj.position.copy(this.temblor.pieza.casa);
        obj.position.x += Math.sin(pasado / 25) * 0.04 * (1 - pasado / 600);
      }
    }

    if (this.pantalla !== 'juego') return;
    const ahora = performance.now();
    if (this.vuelo) {
      const f = (ahora - this.vuelo.inicio) / 550;
      const obj = this.vuelo.pieza.el.object3D;
      if (f < 1) {
        obj.position.lerpVectors(this.vuelo.pieza.casa, this.vuelo.destino, f);
        obj.scale.setScalar(1 - 0.45 * f);
      } else if (f > 2.2) {
        this.terminarVuelo();
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
  },

  dibujarInicio() {
    pintar(this.lienzoTitulo, (ctx, w, h) => {
      texto(ctx, 'VR ITC GAMES · DENTRO DE LA COMPUTADORA', w / 2, h * 0.13, { tam: 44, color: COLOR.acento, peso: 700, alinear: 'center' });
      texto(ctx, 'Arma la computadora', w / 2, h * 0.4, { tam: 100, peso: 700, alinear: 'center' });
      texto(ctx, 'Encuentren la pieza que pide la placa madre. ¡Volteen a su alrededor!', w / 2, h * 0.66, { tam: 40, color: COLOR.tenue, alinear: 'center' });
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
      texto(ctx, 'ARMA LA COMPUTADORA', 30, h / 2, { tam: 42, peso: 700 });
      const ancho = ctx.measureText('ARMA LA COMPUTADORA').width;
      texto(ctx, `Nivel ${this.nivel}`, 30 + ancho + 24, h / 2, { tam: 36, color: COLOR.tenue });
      texto(ctx, `Piezas: ${this.puntaje}`, w * 0.66, h / 2, { tam: 44, peso: 700, alinear: 'center' });
      if (this.modo === 'practica') {
        texto(ctx, 'PRÁCTICA', w - 30, h / 2, { tam: 42, peso: 700, color: COLOR.acento, alinear: 'right' });
      } else {
        const restante = (this.finRonda - performance.now()) / 1000;
        texto(ctx, minutos(restante), w - 30, h / 2, { tam: 56, peso: 700, color: restante <= 30 ? COLOR.mal : COLOR.acento, alinear: 'right' });
      }
    });
  },

  dibujarInfo() {
    pintar(this.lienzoInfo, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      const tipo = ['', 'LA FUNCIÓN DE LA PIEZA', 'UN PROBLEMA QUE HAY QUE RESOLVER', 'LA UNIDAD EN QUE SE MIDE'][this.nivel];
      texto(ctx, `PEDIDO · ${tipo}`, 40, h * 0.13, { tam: 34, peso: 600, color: COLOR.tenue });
      if (this.pedido) textoEnLineas(ctx, this.pedido.texto, w / 2, h * 0.45, w - 80, 52, { peso: 700 });
      texto(ctx, 'Léanlo en voz alta. El equipo busca la pieza en el manual.', w / 2, h * 0.76, { tam: 34, color: COLOR.tenue, alinear: 'center' });
      texto(ctx, 'Voltea, encuentra la pieza y apúntale con el gatillo', w / 2, h * 0.9, { tam: 36, peso: 600, color: COLOR.acento, alinear: 'center' });
      const restante = (this.bloqueoHasta - performance.now()) / 1000;
      if (restante > 0) {
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
      texto(ctx, practica ? 'PRÁCTICA TERMINADA' : 'TIEMPO // RETO COMPLETADO', w / 2, h * 0.11, { tam: 54, peso: 800, color: COLOR.acento, alinear: 'center' });
      texto(ctx, practica ? 'Puntaje de práctica (no se anota)' : '¡Ultrón pierde esta energía! Anótenla en el marcador', w / 2, h * 0.25, { tam: 46, peso: 700, color: COLOR.bien, alinear: 'center' });
      texto(ctx, `${this.puntaje}`, w / 2, h * 0.46, { tam: 160, peso: 800, alinear: 'center' });
      texto(ctx, this.puntaje === 1 ? 'pieza instalada' : 'piezas instaladas', w / 2, h * 0.62, { tam: 40, color: COLOR.tenue, alinear: 'center' });
      texto(ctx, `Nivel alcanzado: ${this.nivel} · Errores: ${this.errores} · Saltados: ${this.saltados}`, w / 2, h * 0.72, { tam: 34, color: COLOR.tenue, alinear: 'center' });
      rectRedondo(ctx, 40, h * 0.8, w - 80, h * 0.15, 16);
      ctx.fillStyle = '#16161b';
      ctx.fill();
      texto(ctx, 'Operador: quítate el visor con las dos manos y pásalo al siguiente', w / 2, h * 0.875, { tam: 36, peso: 600, alinear: 'center' });
    });
  },
});
