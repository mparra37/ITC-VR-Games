/* Enlace VR · menú de juegos
 *
 * Una sola lista de juegos para los dos menús:
 * - el menú web (tarjetas HTML, para la computadora o antes de entrar a VR)
 * - el menú 3D dentro del visor (se elige con el láser del control)
 * Para agregar un juego nuevo, basta con agregarlo a MINIJUEGOS.
 */
/* global AFRAME, COLOR, MONO, texto, rectRedondo, pintar, sonido, crearEntidad, refrescarApuntadores, dibujarLogo */

window.MINIJUEGOS = [
  { archivo: 'router.html', area: 'Redes', titulo: 'Router humano', texto: 'Lean la dirección IP de cada paquete y mándenlo por la puerta correcta.', nivel: 'Media', voltear: true },
  { archivo: 'arma.html', area: 'Hardware', titulo: 'Arma la computadora', texto: 'Un rompecabezas: el equipo tiene el plano y guía dónde va cada pieza.', nivel: 'Fácil', voltear: true },
  { archivo: 'carrera.html', area: 'Binario y ASCII', titulo: 'Carrera de palabras', texto: 'Traduzcan palabras escritas en binario, letra por letra.', nivel: 'Media', voltear: false },
  { archivo: 'robot.html', area: 'Algoritmos', titulo: 'Robot programado', texto: 'Sigan el programa paso a paso y digan dónde termina el robot.', nivel: 'Fácil', voltear: false },
  { archivo: 'noc7.html', area: 'Escape room', titulo: 'Laboratorio NOC-7', texto: 'Cuatro salas de binario, ASCII y lógica. Resuelvan cada reto y jalen la palanca.', nivel: 'Media · 12 min', voltear: true },
];

/** Ir a un juego (o al menú). Si está en VR, el visor sale de la sesión y la nueva página vuelve a entrar. */
function irA(archivo) {
  window.location.href = archivo;
}

/** Tarjetas del menú web. */
function dibujarMenuWeb(contenedor) {
  contenedor.innerHTML = window.MINIJUEGOS.map((j, i) => `
    <a class="reto" href="${j.archivo}">
      <span class="area"><b>${String(i + 1).padStart(2, '0')}</b> · ${j.area}</span>
      <h2>${j.titulo}</h2>
      <p>${j.texto}</p>
      <span class="pie"><span>Dificultad: ${j.nivel}</span><span>${j.voltear ? 'Hay que voltear' : 'Todo enfrente'}</span></span>
    </a>`).join('');
}

/** Menú 3D dentro del visor: un panel con una tarjeta por juego. */
AFRAME.registerComponent('menu-juegos', {
  init() {
    const panel = crearEntidad(this.el, { position: '0 1.42 -1.7' });
    crearEntidad(panel, { geometry: 'primitive: plane; width: 2.14; height: 1.74', material: 'shader: flat; color: #2F6FBF; opacity: 0.45; transparent: true', position: '0 -0.05 -0.02' });
    crearEntidad(panel, { geometry: 'primitive: plane; width: 2.1; height: 1.7', material: 'shader: flat; color: #06080D; opacity: 0.94; transparent: true', position: '0 -0.05 -0.015' });

    const titulo = crearEntidad(panel, { lienzo: 'ancho: 2; alto: 0.3', position: '0 0.6 0' });
    pintar(titulo, (ctx, w, h) => {
      ctx.font = `700 96px ${'"Space Grotesk", sans-serif'}`;
      const a = ctx.measureText('enlace').width;
      const b = ctx.measureText('vr').width;
      const x0 = (w - (a + b) + 130) / 2;
      dibujarLogo(ctx, x0 - 80, h * 0.4, 70);
      texto(ctx, 'enlace', x0, h * 0.4, { tam: 96, peso: 700 });
      texto(ctx, 'vr', x0 + a, h * 0.4, { tam: 96, peso: 700, color: COLOR.acento });
      texto(ctx, 'Uno ve. El equipo sabe.', w / 2, h * 0.84, { tam: 38, peso: 500, color: COLOR.tenue, alinear: 'center' });
    });

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
        ctx.fillStyle = encima ? '#13284A' : '#0C1628';
        ctx.fill();
        ctx.lineWidth = encima ? 6 : 3;
        ctx.strokeStyle = encima ? COLOR.acento : 'rgba(242,244,248,.16)';
        ctx.stroke();
        texto(ctx, `${numero} · ${j.area.toUpperCase()}`, 40, h * 0.17, { tam: 28, peso: 600, color: COLOR.acento, fuente: MONO });
        texto(ctx, j.titulo, 40, h * 0.4, { tam: 56, peso: 700 });
        texto(ctx, j.texto, 40, h * 0.62, { tam: 27, color: COLOR.tenue });
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
    refrescarApuntadores();
  },

  dibujarPie(mensaje) {
    pintar(this.cargando, (ctx, w, h) => {
      texto(ctx, mensaje, w / 2, h / 2, { tam: 44, peso: 500, color: COLOR.tenue, alinear: 'center' });
    });
  },
});
