/* CODEXIA · Ghost Network · menú de juegos (edición de Enlace VR)
 *
 * Una sola lista de juegos para los dos menús:
 * - el menú web (tarjetas HTML, para la computadora o antes de entrar a VR)
 * - el menú 3D dentro del visor (se elige con el láser del control)
 * Para agregar un juego nuevo, basta con agregarlo a MINIJUEGOS.
 */
/* global mision, MISION, dibujarCodexia, AFRAME, COLOR, MONO, texto, rectRedondo, pintar, sonido, crearEntidad, refrescarApuntadores, dibujarLogo, marcador, musica */

window.MINIJUEGOS = [
  { archivo: 'router.html', area: 'Redes', titulo: 'Router humano', texto: 'Ultrón inunda la red con paquetes. Lean la IP de cada uno y mándenlo por la puerta correcta.', nivel: 'Media · 3 min', voltear: true, video: 'videos/reel_router.mp4', pista: '1.º y 2.º número de la IP' },
  { archivo: 'arma.html', area: 'Hardware', titulo: 'Arma la computadora', texto: 'Armen la computadora que rastrea a Ultrón: el equipo tiene el plano y guía cada pieza.', nivel: 'Fácil · 5 min', voltear: true, video: 'videos/reel_arma.mp4', pista: '3.er número de la IP' },
  { archivo: 'carrera.html', area: 'Binario · agua', titulo: 'Carrera de palabras', texto: 'Descifren los mensajes de Ultrón en binario. Cada palabra trae un consejo para cuidar el agua.', nivel: 'Media · 3 min', voltear: false, video: 'videos/reel_carrera.mp4', pista: '4.º número de la IP' },
  { archivo: 'robot.html', area: 'Misión final', titulo: 'Robot programado', texto: 'Con la IP hackean a Ultrón. El equipo tiene el mapa: guíenlo paso a paso hasta que caiga al agua.', nivel: 'Media · 5 min', voltear: false, video: 'videos/reel_robot.mp4', pista: 'Ubicación GPS' },
];

/** Ir a un juego (o al menú). Si está en VR, el visor sale de la sesión y la nueva página vuelve a entrar. */
function irA(archivo) {
  window.location.href = archivo;
}

/** Tarjetas del menú web (con botón para ver el video de 15 s de cada juego). */
function dibujarMenuWeb(contenedor, alVerVideo) {
  contenedor.innerHTML = window.MINIJUEGOS.map((j, i) => `
    <div class="reto">
      <a class="reto-enlace" href="${j.archivo}">
        <span class="area"><b>${String(i + 1).padStart(2, '0')}</b> · ${j.area}</span>
        <h2>${j.titulo}</h2>
        <p>${j.texto}</p>
      </a>
      <span class="pista">Pista: ${j.pista}</span>
      <span class="pie"><span>${j.nivel} · ${j.voltear ? 'hay que voltear' : 'todo enfrente'}</span>${j.video ? `<button type="button" class="ver-video" data-i="${i}" aria-label="Ver video de ${j.titulo}">▶ Video</button>` : ''}</span>
    </div>`).join('');
  contenedor.querySelectorAll('.ver-video').forEach((b) => b.addEventListener('click', () => alVerVideo(window.MINIJUEGOS[Number(b.dataset.i)])));
}

/** Menú 3D dentro del visor: un panel con una tarjeta por juego. */
AFRAME.registerComponent('menu-juegos', {
  init() {
    const panel = crearEntidad(this.el, { position: '0 1.42 -1.7' });
    crearEntidad(panel, { geometry: 'primitive: plane; width: 2.14; height: 1.74', material: 'shader: flat; color: #C8102E; opacity: 0.55; transparent: true', position: '0 -0.05 -0.02' });
    crearEntidad(panel, { geometry: 'primitive: plane; width: 2.1; height: 1.7', material: 'shader: flat; color: #050405; opacity: 0.95; transparent: true', position: '0 -0.05 -0.015' });

    const titulo = crearEntidad(panel, { lienzo: 'ancho: 2; alto: 0.3', position: '0 0.6 0' });
    pintar(titulo, (ctx, w, h) => {
      ctx.font = `800 96px ${'"Orbitron", sans-serif'}`;
      const ancho = ctx.measureText('CODEXIA').width + 96 * 0.36;
      const x0 = (w - ancho + 110) / 2;
      dibujarLogo(ctx, x0 - 80, h * 0.38, 76);
      dibujarCodexia(ctx, x0, h * 0.38, 96);
      texto(ctx, 'GHOST NETWORK · ESTACIÓN 04 · REDES', w / 2, h * 0.84, { tam: 36, peso: 600, color: COLOR.acento, alinear: 'center' });
    });

    // bitácora de la misión: lo que lleva este equipo (se guarda en el visor)
    this.bitacora = crearEntidad(this.el, { lienzo: 'ancho: 0.9; alto: 0.9', position: '1.62 1.42 -1.15', rotation: '0 -45 0' });
    this.dibujarBitacora();
    document.addEventListener('codexia-pista', () => this.dibujarBitacora());

    this.cargando = crearEntidad(panel, { lienzo: 'ancho: 2; alto: 0.12', position: '0 -0.79 0' });
    this.dibujarPie('Apunta a un juego y presiona el gatillo  ·  Juega sentado');

    // tarjetas en 2 columnas; el alto se ajusta a cuántos juegos haya (si sobra uno, va al centro)
    const total = window.MINIJUEGOS.length;
    const filas = Math.ceil(total / 2);
    const paso = Math.min(0.5, 1.1 / filas);
    window.MINIJUEGOS.forEach((j, i) => {
      const solo = i === total - 1 && total % 2 === 1;
      const x = solo ? 0 : (i % 2 === 0 ? -0.5 : 0.5);
      const y = 0.4 - paso / 2 - Math.floor(i / 2) * paso;
      const tarjeta = crearEntidad(panel, { lienzo: `ancho: 0.96; alto: ${(paso - 0.04).toFixed(3)}`, position: `${x} ${y} 0`, class: 'clickable' });
      const numero = String(i + 1).padStart(2, '0');
      const dibujar = (encima) => pintar(tarjeta, (ctx, w, h) => {
        rectRedondo(ctx, 4, 4, w - 8, h - 8, 30);
        ctx.fillStyle = encima ? '#2a0b13' : '#130a0d';
        ctx.fill();
        ctx.lineWidth = encima ? 6 : 3;
        ctx.strokeStyle = encima ? COLOR.acento : 'rgba(242,244,248,.16)';
        ctx.stroke();
        texto(ctx, `${numero} · ${j.area.toUpperCase()}`, 40, h * 0.17, { tam: 28, peso: 600, color: COLOR.acento, fuente: MONO });
        texto(ctx, j.titulo, 40, h * 0.4, { tam: 56, peso: 700 });
        texto(ctx, j.texto, 40, h * 0.62, { tam: 27, color: COLOR.tenue });
        texto(ctx, `Pista: ${j.pista}`, w - 40, h * 0.17, { tam: 26, peso: 600, color: mision.tiene(['ip1', 'ip3', 'ip4', 'lat'][i]) ? COLOR.bien : COLOR.tenue, alinear: 'right', fuente: MONO });
        ctx.fillStyle = 'rgba(242,244,248,.12)';
        ctx.fillRect(40, h * 0.76, w - 80, 2);
        texto(ctx, `Dificultad: ${j.nivel}`, 40, h * 0.87, { tam: 26, peso: 500, color: COLOR.tenue });
        texto(ctx, j.voltear ? 'Hay que voltear' : 'Todo enfrente', w - 40, h * 0.87, { tam: 26, peso: 500, color: COLOR.tenue, alinear: 'right' });
      });
      dibujar(false);
      tarjeta.addEventListener('mouseenter', () => dibujar(true));
      tarjeta.addEventListener('mouseleave', () => dibujar(false));
      tarjeta.addEventListener('click', () => {
        sonido.tecla();
        this.dibujarPie(`Cargando ${j.titulo}…`);
        setTimeout(() => irA(j.archivo), 250);
      });
    });
    // debajo del panel: de qué equipo es este visor y la música
    this.botonesEquipo = [];
    const tira = crearEntidad(this.el, { position: '0 0.36 -1.62', rotation: '-14 0 0' });
    crearEntidad(tira, { geometry: 'primitive: plane; width: 2.1; height: 0.2', material: 'shader: flat; color: #050405; opacity: 0.94; transparent: true', position: '0 0 -0.01' });
    const etiqueta = crearEntidad(tira, { lienzo: 'ancho: 0.5; alto: 0.12', position: '-0.78 0 0' });
    pintar(etiqueta, (ctx, w, h) => texto(ctx, 'Este visor es del', 20, h / 2, { tam: 42, peso: 600, color: COLOR.tenue }));
    for (let n = 1; n <= 8; n++) {
      const b = crearEntidad(tira, { position: `${-0.44 + (n - 1) * 0.135} 0 0`, class: 'clickable', boton: { texto: `Eq. ${n}`, ancho: 0.125, alto: 0.12, accion: 'equipo', valor: String(n), elegido: marcador.equipo() === n } });
      this.botonesEquipo.push(b);
    }
    this.botonMusica = crearEntidad(tira, { position: '0.83 0 0', class: 'clickable', boton: { texto: musica.encendida() ? 'Música: sí' : 'Música: no', ancho: 0.3, alto: 0.12, accion: 'musica' } });
    this.el.sceneEl.addEventListener('boton-presionado', (e) => {
      const { accion, valor } = e.detail;
      if (accion === 'equipo') {
        marcador.ponerEquipo(Number(valor));
        this.botonesEquipo.forEach((b, i) => b.setAttribute('boton', 'elegido', i + 1 === Number(valor)));
        sonido.bien();
        this.dibujarPie(`Listo: este visor es del equipo ${valor}`);
        document.dispatchEvent(new CustomEvent('enlace-equipo'));
      } else if (accion === 'musica') {
        musica.ponerEncendida(!musica.encendida());
        this.botonMusica.setAttribute('boton', 'texto', musica.encendida() ? 'Música: sí' : 'Música: no');
        sonido.tecla();
        document.dispatchEvent(new CustomEvent('enlace-musica'));
      }
    });
    refrescarApuntadores();
  },

  /** Panel a la derecha: IP y GPS de Ultrón que ya consiguió el equipo. */
  dibujarBitacora() {
    pintar(this.bitacora, (ctx, w, h) => {
      fondoPanel(ctx, w, h, 'rgba(18,10,13,.96)');
      ctx.lineWidth = 6;
      ctx.strokeStyle = COLOR.acento;
      rectRedondo(ctx, 4, 4, w - 8, h - 8, 26);
      ctx.stroke();
      texto(ctx, 'BITÁCORA DE LA MISIÓN', w / 2, h * 0.09, { tam: 46, peso: 700, color: COLOR.acento, alinear: 'center' });
      texto(ctx, `Piezas: ${mision.cuantas()} de 6`, w / 2, h * 0.18, { tam: 40, color: COLOR.tenue, alinear: 'center' });
      texto(ctx, 'IP DE ULTRÓN', 50, h * 0.3, { tam: 38, peso: 600, color: COLOR.tenue, fuente: MONO });
      texto(ctx, mision.ipTexto(), w / 2, h * 0.41, { tam: 70, peso: 600, color: mision.ipCompleta() ? COLOR.texto : COLOR.tenue, alinear: 'center', fuente: MONO });
      texto(ctx, 'UBICACIÓN GPS', 50, h * 0.55, { tam: 38, peso: 600, color: COLOR.tenue, fuente: MONO });
      texto(ctx, `Lat  ${mision.tiene('lat') ? mision.valor('lat') : '__.____'}`, 70, h * 0.65, { tam: 56, peso: 600, fuente: MONO });
      texto(ctx, `Lon ${mision.tiene('lon') ? mision.valor('lon') : '-___.____'}`, 70, h * 0.75, { tam: 56, peso: 600, fuente: MONO });
      if (mision.completa()) {
        texto(ctx, '¡NÚCLEO LOCALIZADO!', w / 2, h * 0.88, { tam: 54, peso: 800, color: COLOR.bien, alinear: 'center' });
      } else {
        const sigue = !mision.ipCompleta() ? 'Consigan la IP en los juegos 1 a 3' : 'Ahora: Robot programado → GPS';
        texto(ctx, sigue, w / 2, h * 0.88, { tam: 38, peso: 600, color: COLOR.acento, alinear: 'center' });
      }
    });
  },

  dibujarPie(mensaje) {
    pintar(this.cargando, (ctx, w, h) => {
      texto(ctx, mensaje, w / 2, h / 2, { tam: 44, peso: 500, color: COLOR.tenue, alinear: 'center' });
    });
  },
});
