/* VR ITC Games · menú de retos (evento CODEXIA · área de VR, redes y tecnología)
 *
 * Una sola lista de juegos para los dos menús:
 * - el menú web (tarjetas HTML, para la computadora o antes de entrar a VR)
 * - el menú 3D dentro del visor (se elige con el láser del control)
 * Para agregar un juego nuevo, basta con agregarlo a MINIJUEGOS.
 */
/* global AFRAME, COLOR, texto, rectRedondo, pintar, sonido, crearEntidad, refrescarApuntadores */

window.MINIJUEGOS = [
  { archivo: 'drones.html', icono: '⬡', area: 'IA · ÁRBOLES DE DECISIÓN', titulo: 'Drones de Ultrón', texto: '¿Amigo o enemigo? Sigan el árbol de decisión y derriben a los drones de Ultrón.', desbloquea: 'ESPACIO AÉREO' },
  { archivo: 'marte.html', icono: '◉', area: 'INTELIGENCIA ARTIFICIAL', titulo: 'Misión Marte', texto: 'Sean el cerebro de una red neuronal: ¿roca, hielo, metal… o vida?', desbloquea: 'IA ALIADA' },
  { archivo: 'router.html', icono: '⌬', area: 'REDES', titulo: 'Router humano', texto: 'Rastreen el tráfico de Ultrón y lleven cada paquete al portal correcto.', desbloquea: 'UBICACIÓN' },
  { archivo: 'arma.html', icono: '▣', area: 'HARDWARE', titulo: 'Arma la computadora', texto: 'Construyan el hardware de JARVIS pieza por pieza.', desbloquea: 'JARVIS' },
  { archivo: 'carrera.html', icono: '</>', area: 'BINARIO Y ASCII', titulo: 'Carrera de palabras', texto: 'Descifren los mensajes de Ultrón escritos en binario.', desbloquea: 'MENSAJES' },
  { archivo: 'robot.html', icono: '⌘', area: 'ALGORITMOS', titulo: 'Robot programado', texto: 'Programen a los drones aliados paso a paso.', desbloquea: 'DRONES' },
  { archivo: 'contrasena.html', icono: '◇', area: 'CIBERSEGURIDAD', titulo: '¿Contraseña segura?', texto: 'Blinden los accesos antes de que Ultrón entre.', desbloquea: 'ACCESO' },
];

/** Ir a un juego (o al menú). Si está en VR, el visor sale de la sesión y la nueva página vuelve a entrar. */
function irA(archivo) {
  window.location.href = archivo;
}

/** Tarjetas del menú web, con el estilo de las estaciones de CODEXIA. */
function dibujarMenuWeb(contenedor) {
  contenedor.innerHTML = window.MINIJUEGOS.map((j, i) => `
    <a class="reto" href="${j.archivo}">
      <span class="numero">${String(i + 1).padStart(2, '0')}</span>
      <span class="icono">${j.icono}</span>
      <span class="area">${j.area}</span>
      <h2>${j.titulo}</h2>
      <p>${j.texto}</p>
      <span class="pie"><span>DESBLOQUEA</span><b>${j.desbloquea}</b></span>
    </a>`).join('');
}

/** Menú 3D dentro del visor: un panel con una tarjeta por reto. */
AFRAME.registerComponent('menu-juegos', {
  init() {
    const panel = crearEntidad(this.el, { position: '0 1.42 -1.7' });
    crearEntidad(panel, { geometry: 'primitive: plane; width: 2.16; height: 1.98', material: 'shader: flat; color: #ad001d; opacity: 0.6; transparent: true', position: '0 -0.14 -0.02' });
    crearEntidad(panel, { geometry: 'primitive: plane; width: 2.12; height: 1.94', material: 'shader: flat; color: #050506; opacity: 0.94; transparent: true', position: '0 -0.14 -0.015' });

    const titulo = crearEntidad(panel, { lienzo: 'ancho: 2; alto: 0.28', position: '0 0.66 0' });
    pintar(titulo, (ctx, w, h) => {
      texto(ctx, 'CODEXIA  //  ÁREA: VR, REDES Y TECNOLOGÍA', w / 2, h * 0.2, { tam: 34, peso: 600, color: COLOR.tenue, alinear: 'center' });
      ctx.font = `900 92px Orbitron, Rajdhani, sans-serif`;
      const a = ctx.measureText('VR ').width;
      const b = ctx.measureText('ITC').width;
      const c = ctx.measureText(' GAMES').width;
      const x0 = (w - (a + b + c)) / 2;
      texto(ctx, 'VR ', x0, h * 0.62, { tam: 92, peso: 900, color: COLOR.texto });
      texto(ctx, 'ITC', x0 + a, h * 0.62, { tam: 92, peso: 900, color: COLOR.acento });
      texto(ctx, ' GAMES', x0 + a + b, h * 0.62, { tam: 92, peso: 900, color: COLOR.texto });
    });

    // botón del trailer: el viaje al sistema de Ultrón
    const trailer = crearEntidad(panel, { lienzo: 'ancho: 1.96; alto: 0.15', position: '0 -0.71 0', class: 'clickable' });
    const dibujarTrailer = (encima) => pintar(trailer, (ctx, w, h) => {
      rectRedondo(ctx, 4, 4, w - 8, h - 8, 28);
      ctx.fillStyle = encima ? COLOR.principalEncima : COLOR.principal;
      ctx.fill();
      texto(ctx, '▶  VER TRAILER: EL SISTEMA DE ULTRÓN', w / 2, h * 0.42, { tam: 52, peso: 800, color: '#ffffff', alinear: 'center' });
      texto(ctx, 'Viaje de 2 minutos dentro de la computadora (sentado)', w / 2, h * 0.8, { tam: 30, peso: 600, color: 'rgba(255,255,255,.8)', alinear: 'center' });
    });
    dibujarTrailer(false);
    trailer.addEventListener('mouseenter', () => dibujarTrailer(true));
    trailer.addEventListener('mouseleave', () => dibujarTrailer(false));
    trailer.addEventListener('click', () => {
      sonido.tecla();
      this.dibujarPie('Cargando el trailer…');
      setTimeout(() => irA('viaje.html'), 250);
    });

    this.cargando = crearEntidad(panel, { lienzo: 'ancho: 2; alto: 0.12', position: '0 -0.92 0' });
    this.dibujarPie('Apunta a un reto y presiona el gatillo  ·  Juega sentado');

    // tarjetas en 2 columnas; el alto se ajusta a cuántos juegos haya (si sobra uno, va al centro)
    const total = window.MINIJUEGOS.length;
    const filas = Math.ceil(total / 2);
    const paso = Math.min(0.36, 1.1 / filas);
    window.MINIJUEGOS.forEach((j, i) => {
      const solo = i === total - 1 && total % 2 === 1;
      const x = solo ? 0 : (i % 2 === 0 ? -0.5 : 0.5);
      const y = 0.49 - paso / 2 - Math.floor(i / 2) * paso;
      const tarjeta = crearEntidad(panel, { lienzo: `ancho: 0.96; alto: ${(paso - 0.03).toFixed(3)}`, position: `${x} ${y} 0`, class: 'clickable' });
      const numero = String(i + 1).padStart(2, '0');
      const dibujar = (encima) => pintar(tarjeta, (ctx, w, h) => {
        rectRedondo(ctx, 4, 4, w - 8, h - 8, 34);
        ctx.fillStyle = encima ? '#1a080c' : '#0d0d10';
        ctx.fill();
        ctx.lineWidth = encima ? 6 : 3;
        ctx.strokeStyle = encima ? COLOR.acento : 'rgba(255,255,255,.16)';
        ctx.stroke();
        texto(ctx, numero, w - 40, h * 0.24, { tam: 70, peso: 900, color: encima ? 'rgba(255,22,56,.35)' : 'rgba(255,255,255,.08)', alinear: 'right' });
        texto(ctx, `${j.icono}  ${j.area}`, 36, h * 0.19, { tam: 26, peso: 600, color: COLOR.acento });
        texto(ctx, j.titulo, 36, h * 0.43, { tam: 48, peso: 800 });
        texto(ctx, j.texto, 36, h * 0.65, { tam: 26, color: COLOR.tenue });
        ctx.fillStyle = 'rgba(255,255,255,.12)';
        ctx.fillRect(36, h * 0.77, w - 72, 2);
        texto(ctx, 'DESBLOQUEA', 36, h * 0.88, { tam: 22, peso: 600, color: COLOR.tenue });
        texto(ctx, j.desbloquea, w - 40, h * 0.88, { tam: 24, peso: 700, color: COLOR.acento, alinear: 'right' });
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
      texto(ctx, mensaje, w / 2, h / 2, { tam: 44, peso: 600, color: COLOR.tenue, alinear: 'center' });
    });
  },
});
