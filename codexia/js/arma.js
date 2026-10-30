/* CODEXIA · Ghost Network (edición de Enlace VR) · Arma la computadora (rompecabezas guiado)
 *
 * Enfrente hay una placa con lugares numerados (modelo A, B o C). Las piezas que faltan flotan
 * alrededor del Operador como dibujos SIN nombre. El Operador toma una pieza (la apunta y presiona el
 * gatillo), se la describe al equipo, y el equipo, con el catálogo y el plano armado de esa placa
 * (Manual de campo), le dice en qué número va. El Operador apunta a ese número y la pieza vuela a su lugar.
 * Al completar la placa, la computadora "se enciende" y muestra el nombre de cada pieza.
 *
 * 1.ª placa: 4 lugares libres · 2.ª: 6 · desde la 3.ª: los 8. +1 por pieza bien puesta;
 * lugar equivocado o saltar: bloqueo de 5 segundos. Ronda de 5 minutos.
 * Datos y dibujos: js/computadora_datos.js (lo genera prototipo_papel/generar_arma.py).
 */
/* global AFRAME, THREE, COLOR, MONO, texto, fondoPanel, minutos, pintar, rectRedondo, sonido, crearEntidad, refrescarApuntadores, crearConsola, imagenSVG, azarConSemilla, irA, marcador, rondaComun, dibujarFinalRonda */

const CONFIG = {
  segundosRonda: 300,
  segundosBloqueo: 5,
  segundosEncendida: 3.2,
  radioPiezas: 2.1,
  tamPieza: 0.46,
  // la placa (metros): centro, ancho y alto, y tamaño de cada lugar
  placa: { x: 0, y: 1.9, z: -2.4, ancho: 2, alto: 1.3, lugar: 0.26 },
};

// lugares alrededor del jugador (grados, + = derecha) y altura. Todos quedan ARRIBA de la altura de
// los ojos (1.2 m), así la consola no los tapa, y a menos de 80° (no hay que voltear hacia atrás).
// Dos filas por lado; la placa ocupa el centro (±23°).
const LUGARES = [
  { a: -78, y: 1.4 }, { a: -64, y: 1.95 }, { a: -50, y: 1.4 }, { a: -37, y: 1.95 },
  { a: 37, y: 1.95 }, { a: 50, y: 1.4 }, { a: 64, y: 1.95 }, { a: 78, y: 1.4 },
];

const barajar = (lista) => lista.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
const azarDe = (lista) => lista[Math.floor(Math.random() * lista.length)];

/** Dibuja una pieza (su dibujo) en un recuadro claro. */
function dibujarFicha(ctx, img, x, y, lado, { borde = 'rgba(11,31,58,.35)', grosor = 4, fondo = '#E9EEF5' } = {}) {
  rectRedondo(ctx, x, y, lado, lado, lado * 0.1);
  ctx.fillStyle = fondo;
  ctx.fill();
  ctx.lineWidth = grosor;
  ctx.strokeStyle = borde;
  ctx.stroke();
  if (img) ctx.drawImage(img, x + lado * 0.08, y + lado * 0.08, lado * 0.84, lado * 0.84);
}

AFRAME.registerComponent('arma-computadora', {
  init() {
    this.datos = window.COMPUTADORA;
    this.pantalla = '';
    this.pantallas = {};
    this.botones = { inicio: [], juego: [], fin: [] };
    this.ultimoSegundo = null;
    this.placa = null; // { modelo, orden, abiertas: Set, puestas: Set }
    this.seleccion = null;
    this.vuelo = null;
    this.encendida = null;
    this.encima = null;
    this.imagenes = {};
    // los dibujos de las piezas: cuando cargan, se redibuja todo
    this.datos.piezas.forEach((p) => {
      this.imagenes[p.id] = imagenSVG(this.datos.figuras[p.id], (img) => {
        this.imagenes[p.id] = img;
        this.redibujarTodo();
      });
    });
    this.construirEscena();
    this.el.sceneEl.addEventListener('boton-presionado', (e) => this.presionar(e.detail.accion, e.detail.valor));
    window.addEventListener('keydown', (e) => this.teclaFisica(e));
    this.mostrar('inicio');
    window.juego = this; // para probar desde la consola
  },

  nombreDe(id) {
    return this.datos.piezas.find((p) => p.id === id).nombre;
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
    this.lienzoTitulo = crearEntidad(ini, { lienzo: 'ancho: 1.5; alto: 0.5', position: '0 0.2 0' });
    this.crearBoton('inicio', 'Practicar (sin tiempo)', -0.5, -0.17, { ancho: 0.46, alto: 0.14, accion: 'practicar' });
    this.crearBoton('inicio', 'Empezar ronda · 5 min', 0.02, -0.17, { ancho: 0.5, alto: 0.14, accion: 'empezar', estilo: 'principal' });
    this.crearBoton('inicio', 'Menú de juegos', 0.53, -0.17, { ancho: 0.44, alto: 0.14, accion: 'menu' });
    this.lienzoSeguridad = crearEntidad(ini, { lienzo: 'ancho: 1.5; alto: 0.14', position: '0 -0.37 0' });

    const jue = this.pantallas.juego;
    this.lienzoBarra = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.12', position: '0 0.38 0' });
    this.lienzoInfo = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.46', position: '0 0.07 0' });
    this.lienzoMensaje = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.08', position: '0 -0.22 0' });
    this.crearBoton('juego', 'Saltar placa', -0.4, -0.36, { ancho: 0.36, alto: 0.1, accion: 'saltar' });
    this.botonTerminar = this.crearBoton('juego', 'Terminar', 0.02, -0.36, { ancho: 0.32, alto: 0.1, accion: 'terminar' });

    const fin = this.pantallas.fin;
    this.lienzoResultado = crearEntidad(fin, { lienzo: 'ancho: 1.5; alto: 0.66', position: '0 0.1 0' });
    this.crearBoton('fin', 'Nueva ronda', -0.33, -0.35, { ancho: 0.58, alto: 0.14, accion: 'nueva', estilo: 'principal' });
    this.crearBoton('fin', 'Menú de juegos', 0.33, -0.35, { ancho: 0.58, alto: 0.14, accion: 'menu' });

    // la placa enfrente (arriba de la consola para que no la tape) y una zona para apuntar a cada lugar
    const P = CONFIG.placa;
    this.placaEl = crearEntidad(this.el, { lienzo: `ancho: ${P.ancho}; alto: ${P.alto}`, position: `${P.x} ${P.y} ${P.z}` });
    this.zonas = this.datos.lugares.map(([lx, ly], n) => {
      const zona = crearEntidad(this.placaEl, {
        geometry: `primitive: plane; width: ${P.lugar}; height: ${P.lugar}`,
        material: 'shader: flat; transparent: true; opacity: 0; depthWrite: false',
        position: `${(lx - 0.5) * P.ancho} ${(0.5 - ly) * P.alto} 0.01`,
      });
      zona.addEventListener('mouseenter', () => { this.encima = n; this.dibujarPlaca(); });
      zona.addEventListener('mouseleave', () => { if (this.encima === n) this.encima = null; this.dibujarPlaca(); });
      zona.addEventListener('click', () => this.presionar('lugar', n));
      this.botones.juego.push(zona);
      return zona;
    });

    // las 8 piezas (cada una es un dibujo en un recuadro, sin nombre)
    this.piezas = {};
    this.datos.piezas.forEach((p) => {
      const el = crearEntidad(this.el, { lienzo: `ancho: ${CONFIG.tamPieza}; alto: ${CONFIG.tamPieza}`, visible: false });
      el.addEventListener('mouseenter', () => { if (!this.vuelo) el.object3D.scale.setScalar(1.12); });
      el.addEventListener('mouseleave', () => { if (!this.vuelo || this.vuelo.id !== p.id) el.object3D.scale.setScalar(1); });
      el.addEventListener('click', () => this.presionar('pieza', p.id));
      this.piezas[p.id] = { el, casa: new THREE.Vector3(), rad: 0 };
      this.botones.juego.push(el);
    });

    this.dibujarInicio();
    this.dibujarPlaca();
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
      if (this.bloqueado() || this.vuelo || this.encendida) return null;
      if (accion === 'pieza') this.tomar(valor);
      if (accion === 'lugar') this.poner(valor);
      if (accion === 'saltar') {
        this.saltados += 1;
        this.bloquear('Saltaste la placa');
        this.nuevaPlaca();
      }
    }
    return null;
  },

  /** En la computadora: teclas 1 a 8 = poner la pieza que tienes en la mano en ese lugar. */
  teclaFisica(e) {
    if (this.pantalla !== 'juego') return;
    const n = Number(e.key);
    if (n >= 1 && n <= 8) this.presionar('lugar', n - 1);
  },

  empezar(modo) {
    this.modo = modo;
    this.puntaje = 0;
    this.errores = 0;
    this.saltados = 0;
    this.armadas = 0;
    this.bloqueoHasta = 0;
    this.mensaje = null;
    this.vuelo = null;
    this.encendida = null;
    this.placa = null;
    this.finRonda = performance.now() + CONFIG.segundosRonda * 1000;
    this.botonTerminar.setAttribute('visible', modo === 'practica');
    this.mostrar('juego');
    this.nuevaPlaca();
    this.avisar(modo === 'practica' ? 'Práctica: sin tiempo y sin puntos para el marcador' : '¡Ya! Díganle al equipo el modelo de la placa', COLOR.acento);
    sonido.nivel();
    rondaComun.empezar(modo);
  },

  /** Otra placa: modelo al azar (distinto al anterior) y algunos lugares libres; las piezas faltantes, alrededor. */
  nuevaPlaca() {
    const letras = Object.keys(this.datos.modelos).filter((l) => !this.placa || l !== this.placa.modelo);
    const modelo = azarDe(letras);
    const libres = this.datos.abiertas[Math.min(this.armadas, this.datos.abiertas.length - 1)];
    const abiertas = new Set(barajar([...Array(8).keys()]).slice(0, libres));
    this.placa = { modelo, orden: this.datos.modelos[modelo], abiertas, puestas: new Set() };
    this.seleccion = null;
    const faltan = [...abiertas].map((n) => this.placa.orden[n]);
    const lugares = barajar(LUGARES);
    Object.entries(this.piezas).forEach(([id, p], i) => {
      const visible = faltan.includes(id);
      p.el.setAttribute('visible', visible);
      if (!visible) return;
      const lugar = lugares[i];
      p.rad = THREE.MathUtils.degToRad(lugar.a);
      p.casa.set(Math.sin(p.rad) * CONFIG.radioPiezas, lugar.y, -Math.cos(p.rad) * CONFIG.radioPiezas);
      p.el.object3D.position.copy(p.casa);
      p.el.object3D.rotation.set(0, -p.rad, 0);
      p.el.object3D.scale.setScalar(1);
    });
    this.mostrar(this.pantalla);
    this.redibujarTodo();
  },

  tomar(id) {
    if (!this.placa || !this.piezas[id].el.getAttribute('visible')) return;
    this.seleccion = id;
    sonido.tecla();
    this.avisar('Descríbanla: forma, colores y qué tiene', COLOR.acento);
    this.dibujarPiezas();
    this.dibujarInfo();
  },

  poner(n) {
    const placa = this.placa;
    if (!placa.abiertas.has(n) || placa.puestas.has(n)) {
      this.avisar(`El lugar ${n + 1} ya tiene su pieza`, COLOR.tenue);
      return;
    }
    if (!this.seleccion) {
      this.avisar('Primero toma una pieza: voltea, apúntale y presiona el gatillo', COLOR.acento);
      return;
    }
    const id = this.seleccion;
    if (placa.orden[n] === id) {
      this.puntaje += 1;
      sonido.bien();
      this.avisar(`¡${this.nombreDe(id)} instalada en el ${n + 1}! · +1`, COLOR.bien);
      const P = CONFIG.placa;
      const [lx, ly] = this.datos.lugares[n];
      const destino = new THREE.Vector3(P.x + (lx - 0.5) * P.ancho, P.y + (0.5 - ly) * P.alto, P.z + 0.05);
      this.vuelo = { id, n, inicio: performance.now(), destino };
      this.piezas[id].el.object3D.rotation.set(0, 0, 0);
      this.dibujarBarra();
    } else {
      this.errores += 1;
      this.temblor = { id, inicio: performance.now() };
      this.seleccion = null;
      this.bloquear(`Esa pieza no va en el ${n + 1}`);
      this.dibujarPiezas();
    }
  },

  terminarVuelo() {
    const { id, n } = this.vuelo;
    this.vuelo = null;
    this.piezas[id].el.setAttribute('visible', false);
    this.placa.puestas.add(n);
    this.seleccion = null;
    this.mostrar(this.pantalla);
    if (this.placa.puestas.size === this.placa.abiertas.size) {
      this.armadas += 1;
      this.encendida = { hasta: performance.now() + CONFIG.segundosEncendida * 1000 };
      this.avisar('¡Computadora armada! Se enciende…', COLOR.bien);
      sonido.nivel();
    }
    this.redibujarTodo();
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
      this.piezas[this.vuelo.id].el.object3D.position.copy(this.piezas[this.vuelo.id].casa);
      this.vuelo = null;
    }
    this.encendida = null;
    sonido.fin();
    rondaComun.terminar();
    this.registro = this.modo === 'ronda'
      ? marcador.registrar('arma', this.puntaje, `armadas ${this.armadas} · errores ${this.errores} · saltadas ${this.saltados}`, () => this.dibujarResultado())
      : null;
    this.dibujarResultado();
    this.mostrar('fin');
  },

  tick(t) {
    const ahora = performance.now();
    // piezas flotando
    Object.entries(this.piezas).forEach(([id, p], i) => {
      if (this.vuelo && this.vuelo.id === id) return;
      p.el.object3D.position.y = p.casa.y + Math.sin(t / 700 + i) * 0.025;
    });
    if (this.temblor) {
      const pasado = ahora - this.temblor.inicio;
      const p = this.piezas[this.temblor.id];
      p.el.object3D.position.x = p.casa.x + (pasado < 600 ? Math.sin(pasado / 25) * 0.04 * (1 - pasado / 600) : 0);
      if (pasado >= 600) this.temblor = null;
    }
    if (this.pantalla !== 'juego') return;
    if (this.vuelo) {
      const f = (ahora - this.vuelo.inicio) / 600;
      const obj = this.piezas[this.vuelo.id].el.object3D;
      if (f < 1) {
        obj.position.lerpVectors(this.piezas[this.vuelo.id].casa, this.vuelo.destino, f);
        obj.scale.setScalar(1 - (1 - CONFIG.placa.lugar / CONFIG.tamPieza) * f);
      } else {
        this.terminarVuelo();
      }
    }
    if (this.encendida && ahora > this.encendida.hasta) {
      this.encendida = null;
      this.nuevaPlaca();
      this.avisar(`Nueva placa: modelo ${this.placa.modelo} · ${this.placa.abiertas.size} lugares libres`, COLOR.acento);
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

  redibujarTodo() {
    this.dibujarPlaca();
    this.dibujarPiezas();
    if (this.pantalla === 'juego') {
      this.dibujarBarra();
      this.dibujarInfo();
      this.dibujarMensaje();
    }
  },

  dibujarPiezas() {
    Object.entries(this.piezas).forEach(([id, p]) => {
      const elegida = this.seleccion === id;
      pintar(p.el, (ctx, w) => {
        dibujarFicha(ctx, this.imagenes[id], 10, 10, w - 20, elegida
          ? { borde: COLOR.acento, grosor: 18, fondo: '#F2F4F8' }
          : { borde: 'rgba(242,244,248,.5)', grosor: 6 });
      });
    });
  },

  dibujarPlaca() {
    const placa = this.placa;
    const lado = CONFIG.placa.lugar * 1000;
    pintar(this.placaEl, (ctx, w, h) => {
      rectRedondo(ctx, 4, 4, w - 8, h - 8, 40);
      ctx.fillStyle = '#160a0d';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = this.encendida ? COLOR.bien : 'rgba(242,244,248,.25)';
      ctx.stroke();
      // pistas de circuito de adorno
      const azar = azarConSemilla(11);
      ctx.strokeStyle = 'rgba(255, 22, 56,.14)';
      ctx.lineWidth = 5;
      for (let i = 0; i < 26; i++) {
        let x = azar() * w;
        let y = azar() * h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        x += (azar() - 0.5) * 500;
        ctx.lineTo(x, y);
        y += (azar() - 0.5) * 300;
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      if (!placa) {
        texto(ctx, 'ARMA LA COMPUTADORA', w / 2, h * 0.45, { tam: 110, peso: 700, alinear: 'center' });
        texto(ctx, 'Aquí aparecerá la placa', w / 2, h * 0.6, { tam: 56, color: COLOR.tenue, alinear: 'center' });
        return;
      }
      texto(ctx, `PLACA MODELO ${placa.modelo}`, 60, 70, { tam: 64, peso: 700, color: COLOR.texto });
      texto(ctx, this.encendida ? '¡COMPUTADORA ARMADA!' : `Lugares libres: ${placa.abiertas.size - placa.puestas.size}`, w - 60, 70, { tam: 48, peso: 600, color: this.encendida ? COLOR.bien : COLOR.tenue, alinear: 'right' });
      this.datos.lugares.forEach(([lx, ly], n) => {
        const cx = lx * w;
        const cy = ly * h;
        const x = cx - lado / 2;
        const y = cy - lado / 2;
        const llena = !placa.abiertas.has(n) || placa.puestas.has(n);
        if (llena) {
          const recien = placa.puestas.has(n);
          dibujarFicha(ctx, this.imagenes[placa.orden[n]], x, y, lado, { borde: recien ? COLOR.bien : 'rgba(242,244,248,.4)', grosor: recien ? 8 : 4 });
          if (this.encendida) texto(ctx, this.nombreDe(placa.orden[n]), cx, y + lado + 38, { tam: 36, peso: 600, color: COLOR.texto, alinear: 'center' });
        } else {
          rectRedondo(ctx, x, y, lado, lado, lado * 0.1);
          ctx.fillStyle = this.encima === n ? 'rgba(255, 22, 56,.28)' : 'rgba(255, 22, 56,.08)';
          ctx.fill();
          ctx.setLineDash([22, 14]);
          ctx.lineWidth = 6;
          ctx.strokeStyle = COLOR.acento;
          ctx.stroke();
          ctx.setLineDash([]);
          texto(ctx, String(n + 1), cx, cy + 6, { tam: 140, peso: 700, color: COLOR.acento, alinear: 'center' });
        }
        // número del lugar (también en las piezas ya puestas)
        if (llena) {
          ctx.fillStyle = '#160a0d';
          ctx.beginPath();
          ctx.arc(x + 10, y + 10, 34, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(242,244,248,.6)';
          ctx.stroke();
          texto(ctx, String(n + 1), x + 10, y + 12, { tam: 40, peso: 700, alinear: 'center' });
        }
      });
    });
  },

  dibujarInicio() {
    pintar(this.lienzoTitulo, (ctx, w, h) => {
      texto(ctx, `MISIÓN: armen la computadora que rastrea a Ultrón · ${window.MISION.juegos.arma.minimo} piezas = 3.er número de la IP`, w / 2, h * 0.08, { tam: 34, color: COLOR.acento, peso: 600, alinear: 'center' });
      texto(ctx, 'Arma la computadora', w / 2, h * 0.25, { tam: 92, peso: 700, alinear: 'center' });
      texto(ctx, 'Un rompecabezas: el equipo tiene el plano de la computadora armada.', w / 2, h * 0.43, { tam: 38, color: COLOR.tenue, alinear: 'center' });
      const pasos = [
        '1. Dile al equipo el modelo de la placa (A, B o C).',
        '2. Voltea, toma una pieza y descríbela.',
        '3. Ponla en el número que te digan.',
      ];
      pasos.forEach((p, i) => texto(ctx, p, w * 0.12, h * (0.58 + i * 0.13), { tam: 42, peso: 500 }));
    });
    pintar(this.lienzoSeguridad, (ctx, w, h) => {
      fondoPanel(ctx, w, h, '#1a0b10');
      texto(ctx, 'Gira la cabeza, no te levantes · Correa del control en la muñeca', w / 2, h * 0.5, { tam: 38, alinear: 'center' });
    });
  },

  dibujarBarra() {
    pintar(this.lienzoBarra, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      texto(ctx, 'ARMA LA COMPUTADORA', 30, h / 2, { tam: 42, peso: 700 });
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
      const lado = h * 0.66;
      texto(ctx, 'EN LA MANO', 40 + lado / 2, h * 0.1, { tam: 30, peso: 600, color: COLOR.tenue, alinear: 'center' });
      if (this.seleccion) {
        dibujarFicha(ctx, this.imagenes[this.seleccion], 40, h * 0.18, lado, { borde: COLOR.acento, grosor: 8 });
      } else {
        rectRedondo(ctx, 40, h * 0.18, lado, lado, lado * 0.1);
        ctx.setLineDash([16, 12]);
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(242,244,248,.3)';
        ctx.stroke();
        ctx.setLineDash([]);
        texto(ctx, 'nada', 40 + lado / 2, h * 0.18 + lado / 2, { tam: 40, color: COLOR.tenue, alinear: 'center' });
      }
      const x = 80 + lado;
      if (this.placa) {
        texto(ctx, `Placa modelo ${this.placa.modelo}`, x, h * 0.14, { tam: 52, peso: 700, color: COLOR.acento });
        const pasos = this.seleccion
          ? ['Descríbele la pieza al equipo:', 'forma, colores y qué tiene.', 'Apunta al número que te digan', 'y presiona el gatillo.']
          : ['1. Voltea y busca una pieza.', '2. Apúntale y presiona el gatillo', '    para tomarla.', '3. Descríbela al equipo.'];
        pasos.forEach((p, i) => texto(ctx, p, x, h * (0.34 + i * 0.15), { tam: 40, peso: 500, color: this.seleccion && i < 2 ? COLOR.texto : COLOR.tenue }));
      }
      const restante = (this.bloqueoHasta - performance.now()) / 1000;
      if (restante > 0) {
        ctx.fillStyle = 'rgba(12, 6, 8, 0.92)';
        rectRedondo(ctx, 4, 4, w - 8, h - 8, 26);
        ctx.fill();
        texto(ctx, '¡SEÑAL BLOQUEADA!', w / 2, h * 0.4, { tam: 80, peso: 700, color: COLOR.mal, alinear: 'center' });
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
    pintar(this.lienzoResultado, (ctx, w, h) => dibujarFinalRonda(ctx, w, h, {
      practica: this.modo === 'practica',
      puntaje: this.puntaje,
      unidad: this.puntaje === 1 ? 'pieza instalada' : 'piezas instaladas',
      detalle: `Computadoras armadas: ${this.armadas} · Errores: ${this.errores} · Placas saltadas: ${this.saltados}`,
      registro: this.registro,
    }));
  },
});
