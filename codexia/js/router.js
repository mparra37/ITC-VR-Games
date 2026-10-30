/* CODEXIA · Ghost Network (edición de Enlace VR) · Router humano
 *
 * El Operador es el router de la escuela. Llega un paquete con una dirección IP. Como en un sobre,
 * los 3 primeros números son la RED (la calle) y el último es el EQUIPO (el número de casa):
 * el visor pinta la red en azul y el equipo en gris. El Operador le dicta la red al equipo, el equipo
 * la busca en la tabla de rutas del Manual de campo y le dice la puerta. El Operador voltea, encuentra
 * la puerta (cada una tiene su dibujo) y le dispara el paquete. Siempre se muestra por qué.
 *
 * Nivel 1: SALÓN, BIBLIOTECA, INTERNET.  Nivel 2: + SERVIDORES y redes parecidas.
 * Nivel 3: + LABORATORIO y BASURA (direcciones imposibles), y las puertas se mueven tras cada paquete.
 * Ronda de 3 minutos, +1 por acierto, bloqueo de 5 segundos al fallar o saltar.
 * Cada puerta es un cuarto pequeño en 3D (salón, biblioteca, laboratorio…): ver js/router_cuartos.js.
 */
/* global AFRAME, THREE, COLOR, MONO, texto, fondoPanel, minutos, pintar, rectRedondo, sonido, crearEntidad, refrescarApuntadores, crearConsola, imagenSVG, irA, crearCuarto, CUARTO, marcador, rondaComun, dibujarFinalRonda */

const CONFIG = {
  segundosRonda: 180,
  segundosBloqueo: 5,
  aciertosPorNivel: 5,
  nivelMaximo: 3,
  radioPuertas: 2.3,
  msLanzamiento: 450,
  segundosExplicacion: 3.5,
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

/** A qué puerta va una IP según la tabla de rutas del nivel. */
function enrutar(ip, nivel) {
  const numeros = ip.split('.').map(Number);
  if (nivel >= 3 && numeros.some((n) => n > 255)) return 'BASURA';
  const red = numeros.slice(0, 3).join('.');
  const destino = destinosDelNivel(nivel).find((d) => d.red === red);
  return destino ? destino.nombre : 'INTERNET';
}

/** Por qué el paquete va a esa puerta (la misma frase que trae el manual). */
function explicar(ip, nivel) {
  const numeros = ip.split('.').map(Number);
  const red = numeros.slice(0, 3).join('.');
  if (nivel >= 3 && numeros.some((n) => n > 255)) return `${numeros.find((n) => n > 255)} es mayor que 255: esa dirección no existe.`;
  return enrutar(ip, nivel) === 'INTERNET' ? `La red ${red} no está en la tabla.` : `La red ${red} está en la tabla.`;
}

const entre = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const azarDe = (lista) => lista[Math.floor(Math.random() * lista.length)];

/** Un paquete al azar: primero se elige la puerta y luego una IP que vaya ahí. */
function generarPaquete(nivel, anterior) {
  const r = window.ROUTER;
  const opciones = destinosDelNivel(nivel);
  for (let intento = 0; intento < 200; intento++) {
    const destino = azarDe(opciones);
    let ip;
    if (destino.red) {
      ip = `${destino.red}.${entre(2, 254)}`;
    } else if (destino.nombre === 'INTERNET') {
      ip = nivel >= 2 && Math.random() < 0.55 ? `${azarDe(r.parecidos)}.${entre(2, 254)}` : azarDe(r.internet_ejemplos);
    } else {
      // BASURA: una IP con un número mayor a 255
      const base = azarDe(opciones.filter((d) => d.red)).red.split('.').map(Number).concat([entre(2, 254)]);
      base[entre(1, 3)] = entre(256, 399);
      ip = base.join('.');
    }
    if (enrutar(ip, nivel) === destino.nombre && (!anterior || anterior.ip !== ip)) return { ip, destino: destino.nombre };
  }
  throw new Error('No se pudo generar un paquete');
}

/** Dibuja una IP con la red en azul y el equipo en gris, y (si se pide) las palabras RED y EQUIPO debajo. */
function dibujarIP(ctx, ip, xCentro, y, tam, conNombres) {
  const numeros = ip.split('.');
  const red = numeros.slice(0, 3).join('.');
  const partes = [[red, COLOR.acento], ['.', COLOR.tenue], [numeros[3], COLOR.tenue]];
  ctx.font = `600 ${tam}px ${MONO}`;
  const anchos = partes.map(([t]) => ctx.measureText(t).width);
  let x = xCentro - anchos.reduce((a, b) => a + b, 0) / 2;
  const inicios = [];
  partes.forEach(([t, color], i) => {
    inicios.push(x);
    texto(ctx, t, x, y, { tam, peso: 600, color, fuente: MONO });
    x += anchos[i];
  });
  if (conNombres) {
    const yLinea = y + tam * 0.62;
    ctx.lineWidth = 4;
    ctx.strokeStyle = COLOR.acento;
    ctx.beginPath();
    ctx.moveTo(inicios[0], yLinea);
    ctx.lineTo(inicios[0] + anchos[0], yLinea);
    ctx.stroke();
    ctx.strokeStyle = COLOR.tenue;
    ctx.beginPath();
    ctx.moveTo(inicios[2], yLinea);
    ctx.lineTo(inicios[2] + anchos[2], yLinea);
    ctx.stroke();
    const t = Math.max(24, tam * 0.3);
    texto(ctx, 'RED (díctala)', inicios[0] + anchos[0] / 2, yLinea + t, { tam: t, peso: 600, color: COLOR.acento, alinear: 'center' });
    texto(ctx, 'EQUIPO', inicios[2] + anchos[2] / 2, yLinea + t, { tam: t, peso: 600, color: COLOR.tenue, alinear: 'center' });
  }
}

// ---------- puertas y paquete ----------

function crearPaquete() {
  const grupo = new THREE.Group();
  const caja = new THREE.BoxGeometry(0.22, 0.22, 0.22);
  const material = new THREE.MeshStandardMaterial({ color: 0xcfe3ff, emissive: 0xff1638, emissiveIntensity: 0.55, metalness: 0.3, roughness: 0.2, transparent: true, opacity: 0.85 });
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
    this.explicacion = null;
    this.construirEscena();
    this.el.sceneEl.addEventListener('boton-presionado', (e) => this.presionar(e.detail.accion, e.detail.valor));
    window.addEventListener('keydown', (e) => this.teclaFisica(e));
    this.asignarPuertas();
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
    this.lienzoTitulo = crearEntidad(ini, { lienzo: 'ancho: 1.5; alto: 0.5', position: '0 0.2 0' });
    this.crearBoton('inicio', 'Practicar (sin tiempo)', -0.5, -0.17, { ancho: 0.46, alto: 0.14, accion: 'practicar' });
    this.crearBoton('inicio', 'Empezar ronda · 3 min', 0.02, -0.17, { ancho: 0.5, alto: 0.14, accion: 'empezar', estilo: 'principal' });
    this.crearBoton('inicio', 'Menú de juegos', 0.53, -0.17, { ancho: 0.44, alto: 0.14, accion: 'menu' });
    this.lienzoSeguridad = crearEntidad(ini, { lienzo: 'ancho: 1.5; alto: 0.14', position: '0 -0.37 0' });

    const jue = this.pantallas.juego;
    this.lienzoBarra = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.12', position: '0 0.38 0' });
    this.lienzoInfo = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.46', position: '0 0.07 0' });
    this.lienzoMensaje = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.08', position: '0 -0.22 0' });
    this.crearBoton('juego', 'Saltar', -0.4, -0.36, { ancho: 0.32, alto: 0.1, accion: 'saltar' });
    this.botonTerminar = this.crearBoton('juego', 'Terminar', 0, -0.36, { ancho: 0.32, alto: 0.1, accion: 'terminar' });

    const fin = this.pantallas.fin;
    this.lienzoResultado = crearEntidad(fin, { lienzo: 'ancho: 1.5; alto: 0.66', position: '0 0.1 0' });
    this.crearBoton('fin', 'Nueva ronda', -0.33, -0.35, { ancho: 0.58, alto: 0.14, accion: 'nueva', estilo: 'principal' });
    this.crearBoton('fin', 'Menú de juegos', 0.33, -0.35, { ancho: 0.58, alto: 0.14, accion: 'menu' });

    // puertas alrededor del jugador: marco de color, cuarto 3D detrás y letrero con dibujo y nombre
    this.puertas = {};
    window.ROUTER.destinos.forEach((d) => {
      const el = crearEntidad(this.el, { visible: false });
      const grupo = crearCuarto(d);
      el.setObject3D('mesh', grupo);
      const etiqueta = crearEntidad(el, { lienzo: 'ancho: 0.86; alto: 0.17', position: `0 ${(CUARTO.alto / 2 + CUARTO.marco + 0.12).toFixed(3)} 0.04` });
      const pintarEtiqueta = (img) => pintar(etiqueta, (ctx, w, h) => {
        rectRedondo(ctx, 4, 4, w - 8, h - 8, h / 2 - 4);
        ctx.fillStyle = 'rgba(6, 8, 13, 0.92)';
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = d.color;
        ctx.stroke();
        const lado = h * 0.62;
        if (img) ctx.drawImage(img, h * 0.38, (h - lado) / 2, lado, lado);
        texto(ctx, d.nombre, w / 2 + h * 0.3, h / 2 + 2, { tam: h * 0.5, peso: 700, color: COLOR.texto, alinear: 'center' });
      });
      pintarEtiqueta(imagenSVG(window.ROUTER.iconos[d.icono], pintarEtiqueta));
      el.addEventListener('mouseenter', () => el.object3D.scale.setScalar(1.12));
      el.addEventListener('mouseleave', () => el.object3D.scale.setScalar(1));
      el.addEventListener('click', () => {
        if (el.getAttribute('visible')) this.presionar('destino', d.nombre);
      });
      this.puertas[d.nombre] = { el, grupo, datos: d };
      this.botones.juego.push(el);
    });

    // el paquete y su etiqueta con la IP
    this.casaPaquete = new THREE.Vector3(0, 1.38, -1.5);
    this.paqueteEl = crearEntidad(this.el, {});
    this.paquete3D = crearPaquete();
    this.paqueteEl.setObject3D('mesh', this.paquete3D);
    this.etiquetaPaquete = crearEntidad(this.paqueteEl, { lienzo: 'ancho: 0.78; alto: 0.14', position: '0 0.23 0' });
    this.paqueteEl.object3D.position.copy(this.casaPaquete);

    this.dibujarInicio();
  },

  /** Pone las puertas del nivel en lugares al azar alrededor del jugador. */
  asignarPuertas() {
    const disponibles = destinosDelNivel(this.nivel).map((d) => d.nombre);
    const lugares = LUGARES.slice().sort(() => Math.random() - 0.5);
    Object.values(this.puertas).forEach((p) => {
      const i = disponibles.indexOf(p.datos.nombre);
      if (i < 0) {
        p.el.setAttribute('visible', false);
        return;
      }
      const lugar = lugares[i];
      const rad = THREE.MathUtils.degToRad(lugar.a);
      p.el.object3D.position.set(Math.sin(rad) * CONFIG.radioPuertas, lugar.y, -Math.cos(rad) * CONFIG.radioPuertas);
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
      if (this.bloqueado() || this.lanzamiento) return null;
      if (accion === 'destino') this.elegir(valor);
      if (accion === 'saltar') {
        this.saltados += 1;
        this.explicar(false);
        this.bloquear('Saltaste el paquete');
        this.nuevoPaquete();
      }
    }
    return null;
  },

  /** En la computadora: S, B, I, V, L, X eligen la puerta. */
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
    this.explicacion = null;
    this.lanzamiento = null;
    this.finRonda = performance.now() + CONFIG.segundosRonda * 1000;
    this.botonTerminar.setAttribute('visible', modo === 'practica');
    this.mostrar('juego');
    this.asignarPuertas();
    this.nuevoPaquete();
    this.dibujarTodo();
    this.avisar(modo === 'practica' ? 'Práctica: sin tiempo y sin puntos para el marcador' : '¡Ya! Miren a su alrededor: ahí están las puertas', COLOR.acento);
    sonido.nivel();
    rondaComun.empezar(modo);
  },

  nuevoPaquete() {
    this.paquete = generarPaquete(this.nivel, this.paquete);
    this.paqueteEl.object3D.position.copy(this.casaPaquete);
    this.paqueteEl.object3D.visible = true;
    const ip = this.paquete.ip;
    pintar(this.etiquetaPaquete, (ctx, w, h) => {
      rectRedondo(ctx, 4, 4, w - 8, h - 8, 22);
      ctx.fillStyle = 'rgba(6, 8, 13, 0.92)';
      ctx.fill();
      dibujarIP(ctx, ip, w / 2, h / 2 + 3, h * 0.6, false);
    });
    this.dibujarInfo();
  },

  /** Guarda la explicación del paquete actual para mostrarla unos segundos. */
  explicar(correcto) {
    this.explicacion = {
      correcto,
      texto: `${explicar(this.paquete.ip, this.nivel)} → ${this.paquete.destino}`,
      hasta: performance.now() + CONFIG.segundosExplicacion * 1000,
    };
  },

  elegir(nombre) {
    const puerta = this.puertas[nombre];
    const correcto = nombre === this.paquete.destino;
    this.explicar(correcto);
    if (correcto) {
      this.puntaje += 1;
      sonido.bien();
      this.avisar(`¡Entregado en ${nombre}! · +1`, COLOR.bien);
      this.lanzamiento = { inicio: performance.now(), hasta: puerta.el.object3D.position.clone(), puerta };
      this.dibujarBarra();
    } else {
      this.errores += 1;
      this.paquete3D.userData.material.emissive.setHex(0xff5c6c);
      this.bloquear(`Ese paquete no va a ${nombre}`);
    }
    this.dibujarInfo();
  },

  terminarLanzamiento() {
    this.lanzamiento = null;
    const nivelNuevo = Math.min(CONFIG.nivelMaximo, 1 + Math.floor(this.puntaje / CONFIG.aciertosPorNivel));
    if (nivelNuevo > this.nivel) {
      this.nivel = nivelNuevo;
      this.asignarPuertas();
      this.avisar(this.nivel === 3 ? '¡Nivel 3! LABORATORIO, BASURA… y las puertas se mueven' : '¡Nivel 2! Nueva puerta: SERVIDORES. ¡Ojo con las redes parecidas!', COLOR.acento);
      sonido.nivel();
    } else if (this.nivel === 3) {
      this.asignarPuertas();
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
    rondaComun.terminar();
    this.registro = this.modo === 'ronda'
      ? marcador.registrar('router', this.puntaje, `nivel ${this.nivel} · errores ${this.errores} · saltados ${this.saltados}`, () => this.dibujarResultado())
      : null;
    this.dibujarResultado();
    this.mostrar('fin');
  },

  tick(t) {
    // puertas latiendo y paquete flotando
    Object.values(this.puertas).forEach((p, i) => {
      const datos = p.grupo.userData;
      datos.halo.material.opacity = 0.16 + Math.sin(t / 400 + i) * 0.08;
      if (datos.lampara) datos.lampara.material.color.setHSL(0.11, 1, 0.78 + Math.sin(t / 900) * 0.04);
      if (datos.animar && p.el.object3D.visible) datos.animar(t);
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
        this.lanzamiento.puerta.el.object3D.scale.setScalar(1 + 0.3 * Math.max(0, 1.6 - f));
        if (f > 1.6) {
          this.lanzamiento.puerta.el.object3D.scale.setScalar(1);
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
      rondaComun.segundo((this.finRonda - ahora) / 1000, this.modo);
      const explicando = this.explicacion && ahora < this.explicacion.hasta + 1000;
      if ((this.bloqueoHasta && ahora < this.bloqueoHasta + 1000) || explicando) this.dibujarInfo();
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
      texto(ctx, `MISIÓN: Ultrón inunda la red · ${window.MISION.juegos.router.minimo} paquetes = los 2 primeros números de su IP`, w / 2, h * 0.08, { tam: 34, color: COLOR.acento, peso: 600, alinear: 'center' });
      texto(ctx, 'Router humano', w / 2, h * 0.25, { tam: 92, peso: 700, alinear: 'center' });
      dibujarIP(ctx, '192.168.1.45', w * 0.25, h * 0.5, 64, true);
      const pasos = [
        '1. Dicta la RED: los 3 primeros números.',
        '2. El equipo te dice la puerta.',
        '3. Voltea y dispárale a esa puerta.',
      ];
      pasos.forEach((p, i) => texto(ctx, p, w * 0.51, h * (0.45 + i * 0.13), { tam: 40, peso: 500 }));
      texto(ctx, 'El último número (el equipo) no importa: el router solo mira la red.', w / 2, h * 0.92, { tam: 32, color: COLOR.tenue, alinear: 'center' });
    });
    pintar(this.lienzoSeguridad, (ctx, w, h) => {
      fondoPanel(ctx, w, h, '#1a0b10');
      texto(ctx, 'Gira la cabeza, no te levantes · Correa del control en la muñeca', w / 2, h * 0.5, { tam: 38, alinear: 'center' });
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
    const explicacion = this.explicacion && performance.now() < this.explicacion.hasta ? this.explicacion : null;
    pintar(this.lienzoInfo, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      texto(ctx, 'PAQUETE PARA:', 40, h * 0.11, { tam: 34, peso: 600, color: COLOR.tenue });
      if (this.paquete) dibujarIP(ctx, this.paquete.ip, w / 2, h * 0.37, 112, true);
      if (explicacion) {
        rectRedondo(ctx, 30, h * 0.74, w - 60, h * 0.2, 18);
        ctx.fillStyle = explicacion.correcto ? 'rgba(61, 220, 151, 0.14)' : 'rgba(255, 92, 108, 0.14)';
        ctx.fill();
        texto(ctx, `${explicacion.correcto ? '✓' : '✗'}  ${explicacion.texto}`, w / 2, h * 0.84, { tam: 38, peso: 600, color: explicacion.correcto ? COLOR.bien : COLOR.mal, alinear: 'center' });
      } else {
        texto(ctx, this.modo === 'practica' ? 'Pista: dicten solo los números azules. ¿Está esa red en la tabla?' : 'Dicta la red · el equipo te dice la puerta · voltea y dispara', w / 2, h * 0.84, { tam: 36, peso: 500, color: COLOR.acento, alinear: 'center' });
      }
      const restante = (this.bloqueoHasta - performance.now()) / 1000;
      if (restante > 0 && !explicacion) {
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
      texto(ctx, this.mensaje.texto, w / 2, h / 2, { tam: 40, peso: 600, color: this.mensaje.color, alinear: 'center' });
    });
  },

  dibujarResultado() {
    pintar(this.lienzoResultado, (ctx, w, h) => dibujarFinalRonda(ctx, w, h, {
      practica: this.modo === 'practica',
      puntaje: this.puntaje,
      unidad: this.puntaje === 1 ? 'paquete entregado' : 'paquetes entregados',
      detalle: `Nivel alcanzado: ${this.nivel} · Errores: ${this.errores} · Saltados: ${this.saltados}`,
      registro: this.registro,
    }));
  },
});
