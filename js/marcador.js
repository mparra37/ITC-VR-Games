/* Enlace VR · marcador: código de verificación y envío a Google Sheets
 *
 * No necesita A-Frame: lo usan los juegos y también marcador.html (la página del profesor).
 */
/* exported JUEGOS_MARCADOR, marcador */

// Al terminar una ronda, el juego da un CÓDIGO de 8 letras (por ejemplo 7KQ2-9XMB). El código guarda,
// revuelto, el juego, el número de equipo, el puntaje y la hora; marcador.html lo descifra y dice si
// es válido. Así el profesor no tiene que ponerse el visor: el equipo anota puntaje y código en su
// hoja, y el profesor los verifica. Si hay internet y una hoja configurada (js/config.js), además se
// manda solo a Google Sheets. Lo que no se pudo mandar se guarda y se reintenta al abrir otro juego.

const JUEGOS_MARCADOR = {
  1: 'Router humano', 2: 'Arma la computadora', 3: 'Carrera de palabras', 4: 'Robot programado', 5: 'Laboratorio NOC-7',
};
const ID_JUEGO = { router: 1, arma: 2, carrera: 3, robot: 4, noc7: 5 };
const LETRAS_CODIGO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // sin I, L, O ni U para no confundir

/** Huella de 32 bits de un texto (FNV-1a). */
function huella(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

const marcador = {
  clave() { return (window.ENLACE_CONFIG && window.ENLACE_CONFIG.clave) || 'enlace-vr'; },
  urlHoja() { return (window.ENLACE_CONFIG && window.ENLACE_CONFIG.urlHoja) || ''; },

  /** Número de equipo de este visor (1 a 15; 0 = sin elegir). Se elige en el menú. */
  equipo() {
    try { return Math.max(0, Math.min(15, parseInt(localStorage.getItem('enlace-equipo'), 10) || 0)); } catch (e) { return 0; }
  },
  ponerEquipo(n) {
    try { localStorage.setItem('enlace-equipo', String(n)); } catch (e) { /* sin almacenamiento */ }
  },

  /** 30 bits de datos (juego 3, equipo 4, puntaje 12, minuto del día 11) + 10 bits de comprobación. */
  crearCodigo(juego, equipo, puntaje, fecha = new Date()) {
    const minuto = fecha.getHours() * 60 + fecha.getMinutes();
    const datos = ((juego * 16 + equipo) * 4096 + Math.max(0, Math.min(4095, Math.round(puntaje)))) * 2048 + minuto;
    const comprobacion = huella(`${this.clave()}|${datos}`) % 1024;
    const revuelto = (datos ^ (huella(`${this.clave()}#${comprobacion}`) >>> 2)) >>> 0;
    let valor = comprobacion * 1073741824 + revuelto;
    let codigo = '';
    for (let i = 0; i < 8; i++) {
      codigo = LETRAS_CODIGO[valor % 32] + codigo;
      valor = Math.floor(valor / 32);
    }
    return `${codigo.slice(0, 4)}-${codigo.slice(4)}`;
  },

  /** Descifra un código. Devuelve null si no tiene 8 letras; si las tiene, dice si es válido. */
  leerCodigo(codigo) {
    const limpio = String(codigo).toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1').replace(/U/g, 'V');
    if (!/^[0-9A-Z]{8}$/.test(limpio)) return null;
    let valor = 0;
    for (const c of limpio) {
      const d = LETRAS_CODIGO.indexOf(c);
      if (d < 0) return null;
      valor = valor * 32 + d;
    }
    const comprobacion = Math.floor(valor / 1073741824);
    const datos = ((valor % 1073741824) ^ (huella(`${this.clave()}#${comprobacion}`) >>> 2)) >>> 0;
    const valido = huella(`${this.clave()}|${datos}`) % 1024 === comprobacion;
    const minuto = datos % 2048;
    const puntaje = Math.floor(datos / 2048) % 4096;
    const equipo = Math.floor(datos / 2048 / 4096) % 16;
    const juego = Math.floor(datos / 2048 / 4096 / 16);
    const ok = valido && Boolean(JUEGOS_MARCADOR[juego]) && minuto < 1440;
    return {
      codigo: `${limpio.slice(0, 4)}-${limpio.slice(4)}`,
      valido: ok,
      juego: ok ? juego : null,
      nombreJuego: ok ? JUEGOS_MARCADOR[juego] : '',
      equipo: ok ? equipo : null,
      puntaje: ok ? puntaje : null,
      hora: ok ? `${String(Math.floor(minuto / 60)).padStart(2, '0')}:${String(minuto % 60).padStart(2, '0')}` : '',
    };
  },

  pendientes() {
    try { return JSON.parse(localStorage.getItem('enlace-pendientes') || '[]'); } catch (e) { return []; }
  },
  guardarPendientes(lista) {
    try { localStorage.setItem('enlace-pendientes', JSON.stringify(lista.slice(-50))); } catch (e) { /* sin almacenamiento */ }
  },

  /** Manda un registro a la hoja. Resuelve true si salió (la respuesta de Google no se puede leer). */
  enviar(registro) {
    const url = this.urlHoja();
    if (!url || !window.fetch) return Promise.resolve(false);
    return fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(registro) })
      .then(() => {
        this.guardarPendientes(this.pendientes().filter((p) => p.codigo !== registro.codigo));
        return true;
      })
      .catch(() => false);
  },

  reintentarPendientes() {
    if (!this.urlHoja()) return;
    this.pendientes().forEach((p) => this.enviar(p));
  },

  /** Registra el final de una ronda: crea el código y lo manda a la hoja si se puede.
   *  alCambiar(registro) se llama cuando cambia el estado del envío (para redibujar la pantalla). */
  registrar(juego, puntaje, detalle, alCambiar) {
    const fecha = new Date();
    const equipo = this.equipo();
    const registro = {
      codigo: this.crearCodigo(ID_JUEGO[juego], equipo, puntaje, fecha),
      juego: JUEGOS_MARCADOR[ID_JUEGO[juego]],
      equipo,
      puntaje,
      detalle: detalle || '',
      fecha: fecha.toISOString(),
      estado: this.urlHoja() ? 'enviando' : 'papel',
    };
    if (this.urlHoja()) {
      const datos = Object.assign({}, registro);
      delete datos.estado;
      this.guardarPendientes(this.pendientes().concat([datos]));
      this.enviar(datos).then((ok) => {
        registro.estado = ok ? 'enviado' : 'sin-internet';
        if (alCambiar) alCambiar(registro);
      });
    }
    return registro;
  },
};

// al abrir cualquier página, reintentar lo que no se pudo mandar
window.addEventListener('load', () => setTimeout(() => marcador.reintentarPendientes(), 1500));
