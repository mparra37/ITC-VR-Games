/* VR ITC Games · ¿Contraseña segura?
 *
 * El Operador ve una contraseña y la deletrea. Los decodificadores la revisan con
 * las 5 reglas del Manual de campo:
 *   1. 10 caracteres o más   2. mayúsculas y minúsculas   3. al menos un número
 *   4. al menos un símbolo   5. nada de la Lista prohibida (palabras, nombres, patrones, años)
 * Niveles 1 y 2: ¿SEGURA o DÉBIL?  Nivel 3: ¿qué regla falla? (o ninguna).
 * Ronda de 3 minutos, +1 por acierto, bloqueo de 5 segundos al fallar o saltar,
 * sube de nivel cada 5 aciertos. Al acertar se muestra la revisión de las 5 reglas.
 */
/* global AFRAME, THREE, COLOR, MONO, texto, fondoPanel, minutos, pintar, rectRedondo, sonido, crearEntidad, refrescarApuntadores */

const CONFIG = {
  segundosRonda: 180,
  segundosBloqueo: 5,
  aciertosPorNivel: 5,
  nivelMaximo: 3,
  msRevision: 2000,
};

const REGLAS = [
  '10 caracteres o más',
  'Mayúsculas y minúsculas',
  'Al menos un número',
  'Al menos un símbolo',
  'Nada de la Lista prohibida',
];

// ---------- reglas y generador (igual que en generar_contrasena.py) ----------

function listaProhibida() {
  return Object.values(window.CONTRASENAS.prohibidas).flat();
}

function tieneAnio(clave) {
  const d = window.CONTRASENAS;
  return (clave.match(/\d+/g) || []).some((grupo) => {
    for (let i = 0; i + 4 <= grupo.length; i++) {
      const n = Number(grupo.slice(i, i + 4));
      if (n >= d.anio_minimo && n <= d.anio_maximo) return true;
    }
    return false;
  });
}

/** Devuelve 5 valores: true si cumple cada regla. */
function evaluar(clave) {
  const simbolos = window.CONTRASENAS.simbolos.map((s) => s.s);
  const baja = clave.toLowerCase();
  return [
    clave.length >= 10,
    /[A-Z]/.test(clave) && /[a-z]/.test(clave),
    /[0-9]/.test(clave),
    [...clave].some((c) => simbolos.includes(c)),
    !listaProhibida().some((p) => baja.includes(p)) && !tieneAnio(clave),
  ];
}

const azarDe = (lista) => lista[Math.floor(Math.random() * lista.length)];
const digito = () => String(2 + Math.floor(Math.random() * 8)); // 2 a 9: sin 0 ni 1, que se confunden con O y l
const capital = (p) => (/^[a-z]+$/.test(p) ? p[0].toUpperCase() + p.slice(1) : p);

/** Arma una contraseña candidata del tipo pedido. generarClave() revisa que de verdad sea de ese tipo. */
function construir(tipo) {
  const d = window.CONTRASENAS;
  // dos palabras distintas por contraseña
  const a = azarDe(d.palabras_seguras);
  const b = azarDe(d.palabras_seguras.filter((p) => p !== a));
  const P = (() => { let i = 0; return () => (i++ % 2 === 0 ? a : b); })();
  const S = () => azarDe(d.simbolos).s;
  const seguras = [
    () => P() + digito() + P() + S(),
    () => S() + P() + P() + digito(),
    () => P() + S() + P() + digito() + digito(),
  ];
  if (tipo === 'segura') return azarDe(seguras)();
  if (tipo === 'falla1') return azarDe(d.palabras_seguras.filter((p) => p.length <= 5)) + digito() + S();
  if (tipo === 'falla2') {
    const c = azarDe(seguras)();
    return Math.random() < 0.7 ? c.toLowerCase() : c.toUpperCase();
  }
  if (tipo === 'falla3') return P() + S() + P();
  if (tipo === 'falla4') return P() + digito() + P();
  if (tipo === 'falla5') {
    const anio = String(d.anio_minimo + Math.floor(Math.random() * (d.anio_maximo - d.anio_minimo + 1)));
    const pieza = capital(azarDe(listaProhibida().concat([anio])));
    return Math.random() < 0.5 ? P() + S() + pieza + digito() : pieza + S() + P() + digito();
  }
  // muy débil (nivel 1): una palabra o nombre común con números típicos
  const comunes = d.prohibidas['Palabras comunes'].concat(d.prohibidas.Nombres);
  return azarDe(comunes) + azarDe(['', '123', '10', '1', String(2000 + Math.floor(Math.random() * 25))]);
}

function generarClave(tipo, anterior) {
  for (let intento = 0; intento < 300; intento++) {
    const clave = construir(tipo);
    const cumple = evaluar(clave);
    const fallas = cumple.map((ok, i) => (ok ? -1 : i)).filter((i) => i >= 0);
    let correcta;
    if (tipo === 'segura') correcta = fallas.length === 0;
    else if (tipo === 'muyDebil') correcta = fallas.length >= 3;
    else correcta = fallas.length === 1 && fallas[0] === Number(tipo.slice(-1)) - 1;
    if (correcta && clave !== anterior) return { clave, cumple, fallas };
  }
  throw new Error(`No se pudo generar una contraseña de tipo ${tipo}`);
}

function generarReto(nivel, anterior) {
  const falla = () => `falla${1 + Math.floor(Math.random() * 5)}`;
  let tipo;
  if (nivel === 1) tipo = Math.random() < 0.5 ? 'segura' : 'muyDebil';
  else if (nivel === 2) tipo = Math.random() < 0.4 ? 'segura' : falla();
  else tipo = Math.random() < 0.2 ? 'segura' : falla();
  const r = generarClave(tipo, anterior && anterior.clave);
  const pregunta = nivel === 3 ? 'regla' : 'segura';
  let respuesta;
  if (pregunta === 'segura') respuesta = r.fallas.length === 0 ? 'segura' : 'debil';
  else respuesta = r.fallas.length === 0 ? '0' : String(r.fallas[0] + 1);
  return Object.assign(r, { pregunta, respuesta });
}

// ---------- candado holográfico ----------

function crearCandado() {
  const candado = new THREE.Group();
  const cuerpoMat = new THREE.MeshStandardMaterial({ color: 0x16224a, metalness: 0.6, roughness: 0.35, emissive: 0xff1638, emissiveIntensity: 0.35 });
  const arcoMat = new THREE.MeshStandardMaterial({ color: 0xc9d6f5, metalness: 0.9, roughness: 0.2, emissive: 0xff1638, emissiveIntensity: 0.2 });
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.09), cuerpoMat);
  const orilla = new THREE.LineSegments(new THREE.EdgesGeometry(cuerpo.geometry), new THREE.LineBasicMaterial({ color: 0xff1638 }));
  const arco = new THREE.Group();
  const curva = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 12, 32, Math.PI), arcoMat);
  curva.position.y = 0.16;
  const patas = [-0.1, 0.1].map((x) => {
    const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.06, 12), arcoMat);
    pata.position.set(x, 0.13, 0);
    return pata;
  });
  arco.add(curva, ...patas);
  const ojo = new THREE.Mesh(new THREE.CircleGeometry(0.03, 24), new THREE.MeshBasicMaterial({ color: 0xff1638 }));
  ojo.position.set(0, 0.02, 0.046);
  const ranura = new THREE.Mesh(new THREE.PlaneGeometry(0.018, 0.06), new THREE.MeshBasicMaterial({ color: 0xff1638 }));
  ranura.position.set(0, -0.025, 0.046);
  candado.add(cuerpo, orilla, arco, ojo, ranura);
  candado.userData = { arco, cuerpoMat, arcoMat, brillos: [ojo.material, ranura.material, orilla.material] };
  return candado;
}

// ---------- el juego ----------

AFRAME.registerComponent('contrasena-segura', {
  init() {
    this.pantalla = '';
    this.pantallas = {};
    this.botones = { inicio: [], juego: [], fin: [] };
    this.ultimoSegundo = null;
    this.nivel = 1;
    this.reto = null;
    this.revision = null;
    this.estadoCandado = null;
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
    const panel = crearEntidad(this.el, { position: '0 1.36 -1.75' });
    crearEntidad(panel, { geometry: 'primitive: plane; width: 2.26; height: 1.86', material: 'shader: flat; color: #ff1638; opacity: 0.5; transparent: true', position: '0 -0.12 -0.035' });
    crearEntidad(panel, { geometry: 'primitive: plane; width: 2.22; height: 1.82', material: 'shader: flat; color: #050506; opacity: 0.92; transparent: true', position: '0 -0.12 -0.03' });
    ['inicio', 'juego', 'fin'].forEach((nombre) => { this.pantallas[nombre] = crearEntidad(panel, { visible: false }); });

    // inicio
    const ini = this.pantallas.inicio;
    this.lienzoTitulo = crearEntidad(ini, { lienzo: 'ancho: 2; alto: 0.62', position: '0 0.42 0' });
    this.crearBoton('inicio', 'Practicar (sin tiempo)', -0.45, -0.1, { ancho: 0.76, alto: 0.16, accion: 'practicar' });
    this.crearBoton('inicio', 'Empezar ronda · 3 min', 0.45, -0.1, { ancho: 0.76, alto: 0.16, accion: 'empezar', estilo: 'principal' });
    this.crearBoton('inicio', 'Menú de juegos', 0, -0.72, { ancho: 0.6, alto: 0.12, accion: 'menu' });
    this.lienzoSeguridad = crearEntidad(ini, { lienzo: 'ancho: 2; alto: 0.24', position: '0 -0.44 0' });

    // juego
    const jue = this.pantallas.juego;
    this.lienzoBarra = crearEntidad(jue, { lienzo: 'ancho: 2; alto: 0.16', position: '0 0.66 0' });
    this.lienzoClave = crearEntidad(jue, { lienzo: 'ancho: 2; alto: 0.62', position: '0 0.22 0' });
    this.lienzoMensaje = crearEntidad(jue, { lienzo: 'ancho: 2; alto: 0.1', position: '0 -0.16 0' });
    this.botonesSiNo = [
      this.crearBoton('juego', 'SEGURA', -0.45, -0.42, { ancho: 0.8, alto: 0.22, accion: 'responder', valor: 'segura' }),
      this.crearBoton('juego', 'DÉBIL', 0.45, -0.42, { ancho: 0.8, alto: 0.22, accion: 'responder', valor: 'debil' }),
    ];
    const etiquetas = ['Regla 1', 'Regla 2', 'Regla 3', 'Regla 4', 'Regla 5', 'Ninguna: es segura'];
    this.botonesRegla = etiquetas.map((etiqueta, i) => {
      const x = ((i % 3) - 1) * 0.62;
      const y = i < 3 ? -0.33 : -0.53;
      return this.crearBoton('juego', etiqueta, x, y, { ancho: 0.58, alto: 0.16, accion: 'responder', valor: String((i + 1) % 6) });
    });
    this.crearBoton('juego', 'Saltar', -0.62, -0.84, { ancho: 0.4, alto: 0.13, accion: 'saltar' });
    this.botonTerminar = this.crearBoton('juego', 'Terminar', 0, -0.84, { ancho: 0.4, alto: 0.13, accion: 'terminar' });

    // fin
    const fin = this.pantallas.fin;
    this.lienzoResultado = crearEntidad(fin, { lienzo: 'ancho: 2; alto: 1', position: '0 0.22 0' });
    this.crearBoton('fin', 'Nueva ronda', -0.42, -0.5, { ancho: 0.76, alto: 0.16, accion: 'nueva', estilo: 'principal' });
    this.crearBoton('fin', 'Menú de juegos', 0.42, -0.5, { ancho: 0.76, alto: 0.16, accion: 'menu' });

    // candado holográfico a un lado del panel
    this.candado = crearCandado();
    crearEntidad(this.el, { position: '-1.62 1.5 -1.85', rotation: '0 28 0', scale: '1.3 1.3 1.3' }).setObject3D('mesh', this.candado);

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

  /** Muestra SEGURA/DÉBIL o los botones de reglas según la pregunta. */
  ajustarBotones() {
    const porRegla = this.reto.pregunta === 'regla';
    this.botonesSiNo.forEach((b) => b.setAttribute('visible', !porRegla));
    this.botonesRegla.forEach((b) => b.setAttribute('visible', porRegla));
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
        this.bloquear('Saltaste la contraseña');
        this.nuevoReto();
      }
    }
  },

  /** En la computadora: S = segura, D = débil; en el nivel 3, 1 a 5 = regla y 0 = ninguna. */
  teclaFisica(e) {
    if (this.pantalla !== 'juego' || !this.reto) return;
    const tecla = e.key.toLowerCase();
    if (this.reto.pregunta === 'segura' && (tecla === 's' || tecla === 'd')) this.presionar('responder', tecla === 's' ? 'segura' : 'debil');
    if (this.reto.pregunta === 'regla' && '012345'.includes(tecla) && tecla !== '') this.presionar('responder', tecla);
  },

  empezar(modo) {
    this.modo = modo;
    this.puntaje = 0;
    this.errores = 0;
    this.saltadas = 0;
    this.nivel = 1;
    this.bloqueoHasta = 0;
    this.mensaje = null;
    this.revision = null;
    this.finRonda = performance.now() + CONFIG.segundosRonda * 1000;
    this.botonTerminar.setAttribute('visible', modo === 'practica');
    this.nuevoReto();
    this.dibujarTodo();
    this.avisar(modo === 'practica' ? 'Práctica: sin tiempo y sin puntos para el marcador' : '¡Ya! Tienen 3 minutos', COLOR.acento);
    sonido.nivel();
  },

  nuevoReto() {
    this.reto = generarReto(this.nivel, this.reto);
    this.ajustarBotones();
    this.dibujarClave();
  },

  responder(valor) {
    if (valor === this.reto.respuesta) {
      this.puntaje += 1;
      sonido.bien();
      this.animarCandado('bien');
      const r = this.reto;
      const explicacion = r.fallas.length === 0 ? 'cumple las 5 reglas' : `falla la regla ${r.fallas.map((i) => i + 1).join(', ')}`;
      this.avisar(`¡Correcto! ${r.fallas.length === 0 ? 'Es segura' : 'Es débil'}: ${explicacion} · +1`, COLOR.bien);
      this.revision = { hasta: performance.now() + CONFIG.msRevision };
      this.dibujarClave();
      this.dibujarBarra();
    } else {
      this.errores += 1;
      this.animarCandado('mal');
      this.bloquear('Incorrecto');
    }
  },

  /** Al terminar la revisión: subir de nivel si toca y pasar a otra contraseña. */
  terminarRevision() {
    this.revision = null;
    const nivelNuevo = Math.min(CONFIG.nivelMaximo, 1 + Math.floor(this.puntaje / CONFIG.aciertosPorNivel));
    if (nivelNuevo > this.nivel) {
      this.nivel = nivelNuevo;
      this.avisar(this.nivel === 3 ? '¡Nivel 3! Ahora digan qué regla falla' : '¡Nivel 2! Ahora solo falla una regla', COLOR.acento);
      sonido.nivel();
    }
    this.nuevoReto();
    this.dibujarBarra();
  },

  bloquear(motivo) {
    this.bloqueoHasta = performance.now() + CONFIG.segundosBloqueo * 1000;
    this.avisar(`${motivo}: bloqueo de ${CONFIG.segundosBloqueo} segundos`, COLOR.mal);
    sonido.mal();
    this.dibujarClave();
  },

  bloqueado() {
    return performance.now() < this.bloqueoHasta;
  },

  avisar(textoAviso, color) {
    this.mensaje = { texto: textoAviso, color, hasta: performance.now() + 2600 };
    this.dibujarMensaje();
  },

  terminar() {
    this.revision = null;
    sonido.fin();
    this.dibujarResultado();
    this.mostrar('fin');
  },

  animarCandado(tipo) {
    this.estadoCandado = { tipo, inicio: performance.now() };
  },

  tick(t) {
    // candado: flota, se abre al acertar y tiembla al fallar
    const c = this.candado.userData;
    let color = 0xff1638;
    let alturaArco = 0;
    let temblor = 0;
    if (this.estadoCandado) {
      const transcurrido = performance.now() - this.estadoCandado.inicio;
      if (this.estadoCandado.tipo === 'bien' && transcurrido < 1400) {
        color = 0x2fd27a;
        alturaArco = 0.06 * Math.min(1, transcurrido / 200);
      } else if (this.estadoCandado.tipo === 'mal' && transcurrido < 900) {
        color = 0xff5468;
        temblor = Math.sin(transcurrido / 25) * 0.025 * (1 - transcurrido / 900);
      } else {
        this.estadoCandado = null;
      }
    }
    c.arco.position.y = alturaArco;
    this.candado.position.set(temblor, Math.sin(t / 700) * 0.03, 0);
    this.candado.rotation.y = Math.sin(t / 1600) * 0.25;
    c.cuerpoMat.emissive.setHex(color);
    c.arcoMat.emissive.setHex(color);
    c.brillos.forEach((m) => m.color.setHex(color));

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
      if (this.bloqueoHasta && ahora < this.bloqueoHasta + 1000) this.dibujarClave();
      if (this.mensaje && ahora > this.mensaje.hasta) {
        this.mensaje = null;
        this.dibujarMensaje();
      }
    }
  },

  // --- dibujo ---

  dibujarTodo() {
    this.dibujarBarra();
    this.dibujarClave();
    this.dibujarMensaje();
  },

  dibujarInicio() {
    pintar(this.lienzoTitulo, (ctx, w, h) => {
      texto(ctx, 'VR ITC GAMES', w / 2, h * 0.13, { tam: 56, color: COLOR.acento, peso: 700, alinear: 'center' });
      texto(ctx, '¿Contraseña segura?', w / 2, h * 0.36, { tam: 120, peso: 700, alinear: 'center' });
      texto(ctx, 'Revisen cada contraseña con las 5 reglas del manual.', w / 2, h * 0.6, { tam: 56, color: COLOR.tenue, alinear: 'center' });
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
      texto(ctx, '¿CONTRASEÑA SEGURA?', 40, h / 2, { tam: 56, peso: 700 });
      const ancho = ctx.measureText('¿CONTRASEÑA SEGURA?').width;
      texto(ctx, `Nivel ${this.nivel}`, 40 + ancho + 36, h / 2, { tam: 46, color: COLOR.tenue });
      texto(ctx, `Aciertos: ${this.puntaje}`, w * 0.64, h / 2, { tam: 58, peso: 700, alinear: 'center' });
      if (this.modo === 'practica') {
        texto(ctx, 'PRÁCTICA', w - 40, h / 2, { tam: 56, peso: 700, color: COLOR.acento, alinear: 'right' });
      } else {
        const restante = (this.finRonda - performance.now()) / 1000;
        texto(ctx, minutos(restante), w - 40, h / 2, { tam: 70, peso: 700, color: restante <= 30 ? COLOR.mal : COLOR.acento, alinear: 'right' });
      }
    });
  },

  dibujarClave() {
    const r = this.reto;
    pintar(this.lienzoClave, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      texto(ctx, 'CONTRASEÑA', 60, h * 0.12, { tam: 44, peso: 600, color: COLOR.tenue });
      const pregunta = r.pregunta === 'regla' ? '¿Qué regla falla?' : '¿Es segura o débil?';
      texto(ctx, pregunta, w - 60, h * 0.12, { tam: 52, peso: 700, color: COLOR.acento, alinear: 'right' });

      // un cuadro por carácter, para leerla y contarla fácil
      const n = r.clave.length;
      const lado = Math.min(118, (w - 160) / n - 10);
      const total = n * (lado + 10) - 10;
      let x = (w - total) / 2;
      const y = h * 0.47;
      [...r.clave].forEach((caracter) => {
        rectRedondo(ctx, x, y - lado * 0.65, lado, lado * 1.3, 12);
        ctx.fillStyle = '#16161b';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255,255,255,.2)';
        ctx.stroke();
        texto(ctx, caracter, x + lado / 2, y + 4, { tam: lado * 0.9, peso: 700, alinear: 'center', fuente: MONO });
        x += lado + 10;
      });
      texto(ctx, 'Operador: deletréenla con cuidado (mayúscula, minúscula, número, símbolo)', w / 2, h * 0.86, { tam: 40, color: COLOR.tenue, alinear: 'center' });

      // revisión de las 5 reglas después de acertar
      if (this.revision) {
        ctx.fillStyle = '#04160f';
        rectRedondo(ctx, 4, 4, w - 8, h - 8, 24);
        ctx.fill();
        texto(ctx, r.clave, w / 2, h * 0.13, { tam: 64, peso: 700, alinear: 'center', fuente: MONO });
        REGLAS.forEach((regla, i) => {
          const columna = i < 3 ? 0 : 1;
          const fila = i < 3 ? i : i - 3;
          const xx = columna === 0 ? 120 : w / 2 + 60;
          const yy = h * 0.36 + fila * h * 0.19;
          const ok = r.cumple[i];
          // paloma o tache dibujados con líneas (no dependen de la fuente del visor)
          ctx.lineWidth = 10;
          ctx.lineCap = 'round';
          ctx.strokeStyle = ok ? COLOR.bien : COLOR.mal;
          ctx.beginPath();
          if (ok) {
            ctx.moveTo(xx, yy);
            ctx.lineTo(xx + 14, yy + 16);
            ctx.lineTo(xx + 42, yy - 18);
          } else {
            ctx.moveTo(xx + 4, yy - 16);
            ctx.lineTo(xx + 36, yy + 16);
            ctx.moveTo(xx + 36, yy - 16);
            ctx.lineTo(xx + 4, yy + 16);
          }
          ctx.stroke();
          texto(ctx, `${i + 1}. ${regla}`, xx + 70, yy, { tam: 48, color: ok ? COLOR.texto : COLOR.mal, peso: ok ? 400 : 700 });
        });
        const veredicto = r.fallas.length === 0 ? 'SEGURA' : 'DÉBIL';
        texto(ctx, veredicto, w / 2 + 60, h * 0.36 + 2 * h * 0.19, { tam: 64, peso: 800, color: r.fallas.length === 0 ? COLOR.bien : COLOR.mal });
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
      texto(ctx, this.mensaje.texto, w / 2, h / 2, { tam: 52, peso: 600, color: this.mensaje.color, alinear: 'center' });
    });
  },

  dibujarResultado() {
    const practica = this.modo === 'practica';
    pintar(this.lienzoResultado, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      texto(ctx, practica ? 'PRÁCTICA TERMINADA' : 'TIEMPO // RETO COMPLETADO', w / 2, h * 0.12, { tam: 64, peso: 800, color: COLOR.acento, alinear: 'center' });
      texto(ctx, practica ? 'Puntaje de práctica (no se anota)' : '¡Ultrón pierde esta energía! Anótenla en el marcador', w / 2, h * 0.27, { tam: 56, peso: 700, color: COLOR.bien, alinear: 'center' });
      texto(ctx, `${this.puntaje}`, w / 2, h * 0.47, { tam: 190, peso: 800, alinear: 'center' });
      texto(ctx, this.puntaje === 1 ? 'contraseña revisada' : 'contraseñas revisadas', w / 2, h * 0.62, { tam: 50, color: COLOR.tenue, alinear: 'center' });
      texto(ctx, `Nivel alcanzado: ${this.nivel} · Errores: ${this.errores} · Saltadas: ${this.saltadas}`, w / 2, h * 0.72, { tam: 42, color: COLOR.tenue, alinear: 'center' });
      rectRedondo(ctx, 60, h * 0.79, w - 120, h * 0.16, 18);
      ctx.fillStyle = '#16161b';
      ctx.fill();
      texto(ctx, 'Operador: quítate el visor con las dos manos y pásalo al siguiente', w / 2, h * 0.87, { tam: 44, peso: 600, alinear: 'center' });
    });
  },
});
