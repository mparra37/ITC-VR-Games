/* Enlace VR · Carrera de palabras (prototipo 1)
 *
 * El Operador ve una palabra escrita en binario, un byte por letra.
 * El equipo busca las letras en el Manual de campo y el Operador las escribe.
 * Ronda de 3 minutos, +1 por palabra, bloqueo de 5 segundos al fallar o saltar,
 * sube de nivel cada 5 palabras (3, 4 y 5 letras).
 *
 * Usa las piezas de comun.js (paneles, botones, sonidos).
 */
/* global AFRAME, COLOR, MONO, texto, fondoPanel, minutos, pintar, rectRedondo, sonido, crearEntidad, refrescarApuntadores, marcador, rondaComun, dibujarFinalRonda */

const CONFIG = {
  segundosRonda: 180,
  segundosBloqueo: 5,
  aciertosPorNivel: 5,
  nivelMaximo: 3,
};

function byteDe(letra) {
  return letra.charCodeAt(0).toString(2).padStart(8, '0');
}

// ---------- el juego ----------

AFRAME.registerComponent('carrera-palabras', {
  init() {
    this.pantalla = '';
    this.pantallas = {};
    this.botones = { inicio: [], juego: [], fin: [] };
    this.ultimoSegundo = null;
    this.construirEscena();
    this.el.sceneEl.addEventListener('boton-presionado', (e) => this.presionar(e.detail.accion, e.detail.valor));
    window.addEventListener('keydown', (e) => this.teclaFisica(e));
    this.mostrar('inicio');
    window.juego = this; // para probar desde la consola
  },

  // --- construcción ---

  crear(padre, atributos) {
    return crearEntidad(padre, atributos);
  },

  crearBoton(pantalla, texto, x, y, opciones) {
    const el = this.crear(this.pantallas[pantalla], {
      position: `${x} ${y} 0.01`,
      boton: Object.assign({ texto }, opciones),
    });
    this.botones[pantalla].push(el);
    return el;
  },

  construirEscena() {
    // marco del panel
    this.crear(this.el, { geometry: 'primitive: plane; width: 2.26; height: 1.86', material: 'shader: flat; color: #2F6FBF; opacity: 0.55; transparent: true', position: '0 -0.12 -0.035' });
    this.crear(this.el, { geometry: 'primitive: plane; width: 2.22; height: 1.82', material: 'shader: flat; color: #06080D; opacity: 0.94; transparent: true', position: '0 -0.12 -0.03' });

    ['inicio', 'juego', 'fin'].forEach((nombre) => {
      this.pantallas[nombre] = this.crear(this.el, { visible: false });
    });

    // pantalla de inicio
    const ini = this.pantallas.inicio;
    this.lienzoTitulo = this.crear(ini, { lienzo: 'ancho: 2; alto: 0.62', position: '0 0.42 0' });
    this.crearBoton('inicio', 'Practicar (sin tiempo)', -0.45, -0.1, { ancho: 0.76, alto: 0.16, accion: 'practicar' });
    this.crearBoton('inicio', 'Empezar ronda · 3 min', 0.45, -0.1, { ancho: 0.76, alto: 0.16, accion: 'empezar', estilo: 'principal' });
    this.crearBoton('inicio', 'Menú de juegos', 0, -0.72, { ancho: 0.6, alto: 0.12, accion: 'menu' });
    this.lienzoSeguridad = this.crear(ini, { lienzo: 'ancho: 2; alto: 0.24', position: '0 -0.44 0' });

    // pantalla de juego
    const jue = this.pantallas.juego;
    this.lienzoBarra = this.crear(jue, { lienzo: 'ancho: 2; alto: 0.16', position: '0 0.66 0' });
    this.lienzoBytes = this.crear(jue, { lienzo: 'ancho: 2; alto: 0.7', position: '0 0.2 0' });
    this.lienzoMensaje = this.crear(jue, { lienzo: 'ancho: 2; alto: 0.1', position: '0 -0.23 0' });
    ['ABCDEFGHI', 'JKLMNOPQR', 'STUVWXYZ'].forEach((fila, i) => {
      [...fila].forEach((letra, j) => {
        const x = (j - (fila.length - 1) / 2) * 0.19;
        this.crearBoton('juego', letra, x, -0.38 - i * 0.15, { accion: 'letra', valor: letra });
      });
    });
    this.crearBoton('juego', 'Borrar', -0.7, -0.87, { ancho: 0.36, alto: 0.14, accion: 'borrar' });
    this.crearBoton('juego', 'Saltar', -0.28, -0.87, { ancho: 0.36, alto: 0.14, accion: 'saltar' });
    this.botonTerminar = this.crearBoton('juego', 'Terminar', 0.14, -0.87, { ancho: 0.36, alto: 0.14, accion: 'terminar' });
    this.crearBoton('juego', 'Enviar', 0.64, -0.87, { ancho: 0.5, alto: 0.14, accion: 'enviar', estilo: 'principal' });

    // pantalla final
    const fin = this.pantallas.fin;
    this.lienzoResultado = this.crear(fin, { lienzo: 'ancho: 2; alto: 1', position: '0 0.22 0' });
    this.crearBoton('fin', 'Nueva ronda', -0.42, -0.5, { ancho: 0.76, alto: 0.16, accion: 'nueva', estilo: 'principal' });
    this.crearBoton('fin', 'Menú de juegos', 0.42, -0.5, { ancho: 0.76, alto: 0.16, accion: 'menu' });

    this.dibujarInicio();
  },

  mostrar(nombre) {
    this.pantalla = nombre;
    Object.entries(this.pantallas).forEach(([n, el]) => el.setAttribute('visible', n === nombre));
    Object.entries(this.botones).forEach(([n, lista]) => {
      lista.forEach((b) => {
        const visible = n === nombre && b.getAttribute('visible') !== false;
        b.classList.toggle('clickable', visible);
      });
    });
    // que los apuntadores solo vean los botones de la pantalla activa
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
      if (this.bloqueado()) return;
      if (accion === 'letra') this.escribir(valor);
      if (accion === 'borrar') { this.escrito = this.escrito.slice(0, -1); sonido.tecla(); this.dibujarBytes(); }
      if (accion === 'enviar') this.enviar();
      if (accion === 'saltar') { this.bloquear('Saltaste la palabra'); this.nuevaPalabra(); }
    }
  },

  teclaFisica(e) {
    if (this.pantalla !== 'juego') return;
    if (/^[a-zA-Z]$/.test(e.key)) this.presionar('letra', e.key.toUpperCase());
    else if (e.key === 'Backspace') this.presionar('borrar');
    else if (e.key === 'Enter') this.presionar('enviar');
  },

  empezar(modo) {
    this.modo = modo;
    this.puntaje = 0;
    this.errores = 0;
    this.saltadas = 0;
    this.nivel = 1;
    this.usadas = new Set();
    this.bloqueoHasta = 0;
    this.mensaje = null;
    this.finRonda = performance.now() + CONFIG.segundosRonda * 1000;
    this.botonTerminar.setAttribute('visible', modo === 'practica');
    this.nuevaPalabra();
    this.mostrar('juego');
    this.dibujarTodo();
    this.avisar(modo === 'practica' ? 'Práctica: sin tiempo y sin puntos para el marcador' : '¡Ya! Tienen 3 minutos', COLOR.acento);
    rondaComun.empezar(modo);
    sonido.nivel();
  },

  nuevaPalabra() {
    const lista = window.PALABRAS[String(this.nivel)];
    let libres = lista.filter((p) => !this.usadas.has(p));
    if (libres.length === 0) {
      lista.forEach((p) => this.usadas.delete(p));
      libres = lista;
    }
    this.palabra = libres[Math.floor(Math.random() * libres.length)];
    this.usadas.add(this.palabra);
    this.escrito = '';
    this.dibujarBytes();
  },

  escribir(letra) {
    if (this.escrito.length >= this.palabra.length) return;
    this.escrito += letra;
    sonido.tecla();
    this.dibujarBytes();
  },

  enviar() {
    if (this.escrito.length < this.palabra.length) {
      this.avisar(`Faltan letras: la palabra tiene ${this.palabra.length}`, COLOR.tenue);
      return;
    }
    if (this.escrito === this.palabra) {
      this.puntaje += 1;
      const nivelNuevo = Math.min(CONFIG.nivelMaximo, 1 + Math.floor(this.puntaje / CONFIG.aciertosPorNivel));
      if (nivelNuevo > this.nivel) {
        this.nivel = nivelNuevo;
        this.avisar(`¡Nivel ${this.nivel}! Ahora las palabras tienen ${this.nivel + 2} letras`, COLOR.acento);
        sonido.nivel();
      } else {
        this.avisar(`¡Correcto! ${this.palabra} · +1`, COLOR.bien);
        sonido.bien();
      }
      this.nuevaPalabra();
      this.dibujarBarra();
    } else {
      this.errores += 1;
      this.escrito = '';
      this.bloquear('Incorrecto');
    }
  },

  bloquear(motivo) {
    this.bloqueoHasta = performance.now() + CONFIG.segundosBloqueo * 1000;
    if (motivo === 'Saltaste la palabra') this.saltadas += 1;
    this.avisar(`${motivo}: bloqueo de ${CONFIG.segundosBloqueo} segundos`, COLOR.mal);
    sonido.mal();
    this.dibujarBytes();
  },

  bloqueado() {
    return performance.now() < this.bloqueoHasta;
  },

  avisar(textoAviso, color) {
    this.mensaje = { texto: textoAviso, color, hasta: performance.now() + 2500 };
    this.dibujarMensaje();
  },

  terminar() {
    sonido.fin();
    rondaComun.terminar();
    this.registro = this.modo === 'ronda'
      ? marcador.registrar('carrera', this.puntaje, `nivel ${this.nivel} · errores ${this.errores} · saltadas ${this.saltadas}`, () => this.dibujarResultado())
      : null;
    this.dibujarResultado();
    this.mostrar('fin');
  },

  tick() {
    if (this.pantalla !== 'juego') return;
    const ahora = performance.now();
    if (this.modo === 'ronda' && ahora >= this.finRonda) {
      this.terminar();
      return;
    }
    // redibujar solo cuando cambia el segundo
    const segundo = Math.floor(ahora / 1000);
    if (segundo !== this.ultimoSegundo) {
      this.ultimoSegundo = segundo;
      this.dibujarBarra();
      rondaComun.segundo((this.finRonda - ahora) / 1000, this.modo);
      if (this.bloqueoHasta && ahora < this.bloqueoHasta + 1000) this.dibujarBytes();
      if (this.mensaje && ahora > this.mensaje.hasta) {
        this.mensaje = null;
        this.dibujarMensaje();
      }
    }
  },

  // --- dibujo ---

  dibujarTodo() {
    this.dibujarBarra();
    this.dibujarBytes();
    this.dibujarMensaje();
  },

  dibujarInicio() {
    pintar(this.lienzoTitulo, (ctx, w, h) => {
      texto(ctx, 'ENLACE VR', w / 2, h * 0.13, { tam: 56, color: COLOR.acento, peso: 700, alinear: 'center' });
      texto(ctx, 'Carrera de palabras', w / 2, h * 0.35, { tam: 120, peso: 700, alinear: 'center' });
      texto(ctx, 'Descifren todas las palabras que puedan en 3 minutos.', w / 2, h * 0.6, { tam: 56, color: COLOR.tenue, alinear: 'center' });
      texto(ctx, 'Cuando estén listos, presionen Empezar', w / 2, h * 0.86, { tam: 54, peso: 600, color: COLOR.acento, alinear: 'center' });
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
      texto(ctx, 'CARRERA DE PALABRAS', 40, h / 2, { tam: 56, peso: 700 });
      const anchoTitulo = ctx.measureText('CARRERA DE PALABRAS').width;
      texto(ctx, `Nivel ${this.nivel}`, 40 + anchoTitulo + 36, h / 2, { tam: 46, color: COLOR.tenue });
      texto(ctx, `Palabras: ${this.puntaje}`, w * 0.62, h / 2, { tam: 58, peso: 700, alinear: 'center' });
      if (this.modo === 'practica') {
        texto(ctx, 'PRÁCTICA', w - 40, h / 2, { tam: 56, peso: 700, color: COLOR.acento, alinear: 'right' });
      } else {
        const restante = (this.finRonda - performance.now()) / 1000;
        texto(ctx, minutos(restante), w - 40, h / 2, { tam: 70, peso: 700, color: restante <= 30 ? COLOR.mal : COLOR.acento, alinear: 'right', fuente: MONO });
      }
    });
  },

  dibujarBytes() {
    pintar(this.lienzoBytes, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      const n = this.palabra.length;
      const alto = h / 5.4;
      const y0 = (h - n * alto) / 2 + alto / 2;
      const tamBits = alto * 0.82;
      for (let i = 0; i < n; i++) {
        const y = y0 + i * alto;
        const bits = byteDe(this.palabra[i]);
        texto(ctx, `Letra ${i + 1}`, 70, y, { tam: alto * 0.42, color: COLOR.tenue });
        // los 3 bits grises siempre son 010 en las mayúsculas
        ctx.font = `400 ${tamBits}px ${MONO}`;
        const anchoCabeza = ctx.measureText(bits.slice(0, 3)).width;
        texto(ctx, bits.slice(0, 3), 300, y, { tam: tamBits, color: '#676a72', fuente: MONO });
        texto(ctx, bits.slice(3), 300 + anchoCabeza, y, { tam: tamBits, peso: 700, fuente: MONO });
        // flecha y casilla de respuesta
        ctx.strokeStyle = COLOR.tenue;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(900, y);
        ctx.lineTo(1040, y);
        ctx.lineTo(1020, y - 14);
        ctx.moveTo(1040, y);
        ctx.lineTo(1020, y + 14);
        ctx.stroke();
        const lado = alto * 0.86;
        rectRedondo(ctx, 1070, y - lado / 2, lado, lado, 14);
        ctx.fillStyle = '#13233D';
        ctx.fill();
        ctx.lineWidth = i === this.escrito.length ? 8 : 4;
        ctx.strokeStyle = i === this.escrito.length ? COLOR.acento : 'rgba(255,255,255,.2)';
        ctx.stroke();
        if (this.escrito[i]) texto(ctx, this.escrito[i], 1070 + lado / 2, y + 4, { tam: lado * 0.72, peso: 700, alinear: 'center' });
      }
      texto(ctx, 'Lo gris siempre es 010', w - 60, h * 0.4, { tam: 46, color: COLOR.tenue, alinear: 'right' });
      texto(ctx, 'en las mayúsculas.', w - 60, h * 0.4 + 58, { tam: 46, color: COLOR.tenue, alinear: 'right' });
      texto(ctx, 'Solo cambia lo blanco.', w - 60, h * 0.4 + 116, { tam: 46, color: COLOR.tenue, alinear: 'right' });

      const restante = (this.bloqueoHasta - performance.now()) / 1000;
      if (restante > 0) {
        ctx.fillStyle = 'rgba(40, 6, 14, 0.82)';
        rectRedondo(ctx, 4, 4, w - 8, h - 8, 24);
        ctx.fill();
        texto(ctx, '¡ENLACE CAÍDO!', w / 2, h * 0.38, { tam: 90, peso: 800, color: COLOR.mal, alinear: 'center' });
        texto(ctx, `Esperen ${Math.ceil(restante)} s · nadie habla`, w / 2, h * 0.62, { tam: 60, alinear: 'center' });
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
      unidad: this.puntaje === 1 ? 'palabra descifrada' : 'palabras descifradas',
      detalle: `Nivel alcanzado: ${this.nivel} · Errores: ${this.errores} · Saltadas: ${this.saltadas}`,
      registro: this.registro,
    }));
  },
});
