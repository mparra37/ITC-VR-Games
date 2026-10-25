/* VR ITC Games · Router humano: tormenta de paquetes
 *
 * El Operador está en el centro de un switch gigante, dentro de la computadora.
 * Llega un paquete con su dirección IP; los decodificadores buscan en la tabla de rutas
 * del Manual de campo a dónde va. El Operador voltea a buscar el portal correcto
 * (los portales están a su alrededor y cambian de lugar) y le dispara el paquete.
 *
 * Nivel 1: SALÓN, BIBLIOTECA, INTERNET.  Nivel 2: + SERVIDORES y trampas.
 * Nivel 3: + SATÉLITE y DESCARTAR (IP rota), y los portales se mueven tras cada paquete.
 * Ronda de 3 minutos, +1 por acierto, bloqueo de 5 segundos al fallar o saltar.
 */
/* global AFRAME, THREE, COLOR, MONO, texto, fondoPanel, minutos, pintar, rectRedondo, sonido, crearEntidad, refrescarApuntadores, crearConsola */

const CONFIG = {
  segundosRonda: 180,
  segundosBloqueo: 5,
  aciertosPorNivel: 5,
  nivelMaximo: 3,
  radioPortales: 2.3,
  msLanzamiento: 450,
};

// lugares alrededor del jugador: ángulo (grados, + = derecha) y altura
const LUGARES = [
  { a: -85, y: 1.3 }, { a: -55, y: 1.35 }, { a: -24, y: 1.95 },
  { a: 24, y: 1.95 }, { a: 55, y: 1.35 }, { a: 85, y: 1.3 },
];

// ---------- la tabla de rutas (igual que en generar_router.py) ----------

function destinosDelNivel(nivel) {
  return window.ROUTER.destinos.filter((d) => d.nivel <= nivel);
}

/** A dónde va una IP según la tabla de rutas del nivel. */
function enrutar(ip, nivel) {
  const numeros = ip.split('.').map(Number);
  if (nivel >= 3 && numeros.some((n) => n > 255)) return 'DESCARTAR';
  const prefijo = numeros.slice(0, 3).join('.');
  const destino = destinosDelNivel(nivel).find((d) => d.prefijo === prefijo);
  return destino ? destino.nombre : 'INTERNET';
}

const entre = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const azarDe = (lista) => lista[Math.floor(Math.random() * lista.length)];

/** Un paquete al azar: primero se elige el destino y luego una IP que vaya ahí. */
function generarPaquete(nivel, anterior) {
  const r = window.ROUTER;
  const opciones = destinosDelNivel(nivel);
  for (let intento = 0; intento < 200; intento++) {
    const destino = azarDe(opciones);
    let ip;
    if (destino.prefijo) {
      ip = `${destino.prefijo}.${entre(2, 254)}`;
    } else if (destino.nombre === 'INTERNET') {
      ip = nivel >= 2 && Math.random() < 0.55 ? `${azarDe(r.trampas)}.${entre(2, 254)}` : azarDe(r.internet_ejemplos);
    } else {
      // DESCARTAR: una IP con un número mayor a 255
      const base = azarDe(opciones.filter((d) => d.prefijo)).prefijo.split('.').map(Number).concat([entre(2, 254)]);
      base[entre(1, 3)] = entre(256, 399);
      ip = base.join('.');
    }
    if (enrutar(ip, nivel) === destino.nombre && (!anterior || anterior.ip !== ip)) return { ip, destino: destino.nombre };
  }
  throw new Error('No se pudo generar un paquete');
}

// ---------- portales y paquete ----------

function crearPortal(color) {
  const grupo = new THREE.Group();
  const c = new THREE.Color(color);
  const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.025, 12, 64), new THREE.MeshBasicMaterial({ color: c }));
  const remolino = document.createElement('canvas');
  remolino.width = 256;
  remolino.height = 256;
  const ctx = remolino.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 6;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(128, 128, 40 + i * 22, i, i + 2.2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(remolino);
  tex.colorSpace = THREE.SRGBColorSpace;
  const disco = new THREE.Mesh(new THREE.CircleGeometry(0.31, 48), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  const tubo = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.2, 0.6, 32, 1, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
  tubo.rotation.x = Math.PI / 2;
  tubo.position.z = -0.3;
  grupo.add(anillo, disco, tubo);
  grupo.userData = { disco, anillo };
  return grupo;
}

function crearPaquete() {
  const grupo = new THREE.Group();
  const caja = new THREE.BoxGeometry(0.22, 0.22, 0.22);
  const material = new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0xff1638, emissiveIntensity: 0.6, metalness: 0.3, roughness: 0.2, transparent: true, opacity: 0.85 });
  const cubo = new THREE.Mesh(caja, material);
  const orilla = new THREE.LineSegments(new THREE.EdgesGeometry(caja), new THREE.LineBasicMaterial({ color: 0xffffff }));
  grupo.add(cubo, orilla);
  grupo.userData = { cubo, material };
  return grupo;
}

// ---------- el juego ----------

AFRAME.registerComponent('router-humano', {
  init() {
    this.pantalla = '';
    this.pantallas = {};
    this.botones = { inicio: [], juego: [], fin: [] };
    this.ultimoSegundo = null;
    this.nivel = 1;
    this.paquete = null;
    this.lanzamiento = null;
    this.construirEscena();
    this.el.sceneEl.addEventListener('boton-presionado', (e) => this.presionar(e.detail.accion, e.detail.valor));
    window.addEventListener('keydown', (e) => this.teclaFisica(e));
    this.asignarPortales();
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

    // portales alrededor del jugador
    this.portales = {};
    window.ROUTER.destinos.forEach((d) => {
      const el = crearEntidad(this.el, { visible: false });
      const grupo = crearPortal(d.color);
      el.setObject3D('mesh', grupo);
      const etiqueta = crearEntidad(el, { lienzo: 'ancho: 0.8; alto: 0.15', position: '0 0.5 0' });
      pintar(etiqueta, (ctx, w, h) => {
        rectRedondo(ctx, 4, 4, w - 8, h - 8, 20);
        ctx.fillStyle = 'rgba(5, 5, 6, 0.85)';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = d.color;
        ctx.stroke();
        texto(ctx, d.nombre, w / 2, h / 2 + 2, { tam: h * 0.55, peso: 800, color: d.color, alinear: 'center' });
      });
      el.addEventListener('mouseenter', () => el.object3D.scale.setScalar(1.15));
      el.addEventListener('mouseleave', () => el.object3D.scale.setScalar(1));
      el.addEventListener('click', () => {
        if (el.getAttribute('visible')) this.presionar('destino', d.nombre);
      });
      this.portales[d.nombre] = { el, grupo, datos: d };
      this.botones.juego.push(el);
    });

    // el paquete y su etiqueta con la IP
    this.casaPaquete = new THREE.Vector3(0, 1.38, -1.5);
    this.paqueteEl = crearEntidad(this.el, {});
    this.paquete3D = crearPaquete();
    this.paqueteEl.setObject3D('mesh', this.paquete3D);
    this.etiquetaPaquete = crearEntidad(this.paqueteEl, { lienzo: 'ancho: 0.7; alto: 0.13', position: '0 0.22 0' });
    this.paqueteEl.object3D.position.copy(this.casaPaquete);

    this.dibujarInicio();
  },

  /** Pone los portales del nivel en lugares al azar alrededor del jugador. */
  asignarPortales() {
    const disponibles = destinosDelNivel(this.nivel).map((d) => d.nombre);
    const lugares = LUGARES.slice().sort(() => Math.random() - 0.5);
    Object.values(this.portales).forEach((p) => {
      const i = disponibles.indexOf(p.datos.nombre);
      if (i < 0) {
        p.el.setAttribute('visible', false);
        return;
      }
      const lugar = lugares[i];
      const rad = THREE.MathUtils.degToRad(lugar.a);
      p.el.object3D.position.set(Math.sin(rad) * CONFIG.radioPortales, lugar.y, -Math.cos(rad) * CONFIG.radioPortales);
      p.el.object3D.rotation.set(0, -rad, 0);
      p.el.setAttribute('visible', true);
    });
    if (this.pantalla) this.mostrar(this.pantalla);
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
      if (this.bloqueado() || this.lanzamiento) return;
      if (accion === 'destino') this.elegir(valor);
      if (accion === 'saltar') {
        this.saltados += 1;
        this.bloquear('Saltaste el paquete');
        this.nuevoPaquete();
      }
    }
  },

  /** En la computadora: S, B, I, V, T, D eligen el destino. */
  teclaFisica(e) {
    if (this.pantalla !== 'juego') return;
    const destino = destinosDelNivel(this.nivel).find((d) => d.tecla === e.key.toLowerCase());
    if (destino) this.presionar('destino', destino.nombre);
  },

  empezar(modo) {
    this.modo = modo;
    this.puntaje = 0;
    this.errores = 0;
    this.saltados = 0;
    this.nivel = 1;
    this.bloqueoHasta = 0;
    this.mensaje = null;
    this.lanzamiento = null;
    this.finRonda = performance.now() + CONFIG.segundosRonda * 1000;
    this.botonTerminar.setAttribute('visible', modo === 'practica');
    this.mostrar('juego');
    this.asignarPortales();
    this.nuevoPaquete();
    this.dibujarTodo();
    this.avisar(modo === 'practica' ? 'Práctica: sin tiempo y sin puntos para el marcador' : '¡Ya! Miren a su alrededor: ahí están los portales', COLOR.acento);
    sonido.nivel();
  },

  nuevoPaquete() {
    this.paquete = generarPaquete(this.nivel, this.paquete);
    this.paqueteEl.object3D.position.copy(this.casaPaquete);
    this.paqueteEl.object3D.visible = true;
    this.paquete3D.userData.material.emissive.setHex(0xff1638);
    pintar(this.etiquetaPaquete, (ctx, w, h) => {
      rectRedondo(ctx, 4, 4, w - 8, h - 8, 18);
      ctx.fillStyle = 'rgba(5, 5, 6, 0.9)';
      ctx.fill();
      texto(ctx, this.paquete.ip, w / 2, h / 2 + 3, { tam: h * 0.62, peso: 800, alinear: 'center', fuente: MONO });
    });
    this.dibujarInfo();
  },

  elegir(nombre) {
    const portal = this.portales[nombre];
    const correcto = nombre === this.paquete.destino;
    if (correcto) {
      this.puntaje += 1;
      sonido.bien();
      this.avisar(`¡Entregado en ${nombre}! · +1`, COLOR.bien);
      this.lanzamiento = { inicio: performance.now(), hasta: portal.el.object3D.position.clone(), portal };
      this.dibujarBarra();
    } else {
      this.errores += 1;
      this.paquete3D.userData.material.emissive.setHex(0xff5468);
      this.bloquear(`Ese paquete no va a ${nombre}`);
    }
  },

  terminarLanzamiento() {
    this.lanzamiento = null;
    const nivelNuevo = Math.min(CONFIG.nivelMaximo, 1 + Math.floor(this.puntaje / CONFIG.aciertosPorNivel));
    if (nivelNuevo > this.nivel) {
      this.nivel = nivelNuevo;
      this.asignarPortales();
      this.avisar(this.nivel === 3 ? '¡Nivel 3! SATÉLITE, DESCARTAR… y los portales se mueven' : '¡Nivel 2! Nuevo portal: SERVIDORES. ¡Cuidado con las trampas!', COLOR.acento);
      sonido.nivel();
    } else if (this.nivel === 3) {
      this.asignarPortales();
    }
    this.nuevoPaquete();
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
    this.lanzamiento = null;
    sonido.fin();
    this.dibujarResultado();
    this.mostrar('fin');
  },

  tick(t) {
    // portales girando y paquete flotando
    Object.values(this.portales).forEach((p, i) => {
      p.grupo.userData.disco.rotation.z = t / (500 + i * 60);
    });
    const obj = this.paqueteEl.object3D;
    if (!this.lanzamiento) {
      obj.position.y = this.casaPaquete.y + Math.sin(t / 400) * 0.03;
      this.paquete3D.rotation.y = t / 900;
      if (!this.bloqueado()) this.paquete3D.userData.material.emissive.setHex(0xff1638);
    }

    if (this.pantalla !== 'juego') return;
    const ahora = performance.now();
    if (this.lanzamiento) {
      const f = (ahora - this.lanzamiento.inicio) / CONFIG.msLanzamiento;
      if (f >= 1) {
        obj.visible = false;
        this.lanzamiento.portal.el.object3D.scale.setScalar(1 + 0.3 * Math.max(0, 1.6 - f));
        if (f > 1.6) {
          this.lanzamiento.portal.el.object3D.scale.setScalar(1);
          this.terminarLanzamiento();
        }
      } else {
        obj.position.lerpVectors(this.casaPaquete, this.lanzamiento.hasta, f);
        obj.position.y += Math.sin(f * Math.PI) * 0.25;
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
      texto(ctx, 'Router humano', w / 2, h * 0.4, { tam: 110, peso: 700, alinear: 'center' });
      texto(ctx, 'Lleguen los paquetes al portal correcto. ¡Volteen a su alrededor!', w / 2, h * 0.66, { tam: 42, color: COLOR.tenue, alinear: 'center' });
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
      texto(ctx, 'ROUTER HUMANO', 30, h / 2, { tam: 46, peso: 700 });
      const ancho = ctx.measureText('ROUTER HUMANO').width;
      texto(ctx, `Nivel ${this.nivel}`, 30 + ancho + 28, h / 2, { tam: 38, color: COLOR.tenue });
      texto(ctx, `Entregados: ${this.puntaje}`, w * 0.62, h / 2, { tam: 46, peso: 700, alinear: 'center' });
      if (this.modo === 'practica') {
        texto(ctx, 'PRÁCTICA', w - 30, h / 2, { tam: 44, peso: 700, color: COLOR.acento, alinear: 'right' });
      } else {
        const restante = (this.finRonda - performance.now()) / 1000;
        texto(ctx, minutos(restante), w - 30, h / 2, { tam: 56, peso: 700, color: restante <= 30 ? COLOR.mal : COLOR.acento, alinear: 'right' });
      }
    });
  },

  dibujarInfo() {
    pintar(this.lienzoInfo, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      texto(ctx, 'PAQUETE ENTRANTE · PARA:', 40, h * 0.14, { tam: 36, peso: 600, color: COLOR.tenue });
      texto(ctx, this.paquete ? this.paquete.ip : '', w / 2, h * 0.45, { tam: 120, peso: 800, alinear: 'center', fuente: MONO });
      texto(ctx, 'Léanla número por número. El equipo tiene la tabla de rutas.', w / 2, h * 0.72, { tam: 36, color: COLOR.tenue, alinear: 'center' });
      texto(ctx, 'Apunta al portal correcto y presiona el gatillo', w / 2, h * 0.88, { tam: 38, peso: 600, color: COLOR.acento, alinear: 'center' });
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
      texto(ctx, this.mensaje.texto, w / 2, h / 2, { tam: 40, peso: 600, color: this.mensaje.color, alinear: 'center' });
    });
  },

  dibujarResultado() {
    const practica = this.modo === 'practica';
    pintar(this.lienzoResultado, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      texto(ctx, practica ? 'PRÁCTICA TERMINADA' : 'TIEMPO // RETO COMPLETADO', w / 2, h * 0.11, { tam: 54, peso: 800, color: COLOR.acento, alinear: 'center' });
      texto(ctx, practica ? 'Puntaje de práctica (no se anota)' : '¡Ultrón pierde esta energía! Anótenla en el marcador', w / 2, h * 0.25, { tam: 46, peso: 700, color: COLOR.bien, alinear: 'center' });
      texto(ctx, `${this.puntaje}`, w / 2, h * 0.46, { tam: 160, peso: 800, alinear: 'center' });
      texto(ctx, this.puntaje === 1 ? 'paquete entregado' : 'paquetes entregados', w / 2, h * 0.62, { tam: 40, color: COLOR.tenue, alinear: 'center' });
      texto(ctx, `Nivel alcanzado: ${this.nivel} · Errores: ${this.errores} · Saltados: ${this.saltados}`, w / 2, h * 0.72, { tam: 34, color: COLOR.tenue, alinear: 'center' });
      rectRedondo(ctx, 40, h * 0.8, w - 80, h * 0.15, 16);
      ctx.fillStyle = '#16161b';
      ctx.fill();
      texto(ctx, 'Operador: quítate el visor con las dos manos y pásalo al siguiente', w / 2, h * 0.875, { tam: 36, peso: 600, alinear: 'center' });
    });
  },
});
