/* CODEXIA · Ghost Network · la misión: encontrar la IP y la ubicación GPS de Ultrón
 *
 * Cada juego da una pieza cuando el equipo termina una RONDA (no la práctica) con el puntaje mínimo:
 *   Router humano        → los 2 primeros números de la IP
 *   Arma a Ultrón        → el 3.er número de la IP
 *   Carrera de palabras  → el 4.º número de la IP
 *   Robot programado     → la latitud (1.ª vez que Ultrón cae al agua) y la longitud (2.ª vez)
 * El avance se guarda en el visor (cada equipo tiene el suyo). "Nuevo equipo" en el menú lo borra.
 *
 * Puntos del equipo: cada ronda guarda su puntaje; por juego cuenta la MEJOR ronda y el total es la suma
 * de los 4 juegos. Se ve en la pantalla final, en la Bitácora del menú, y el profesor compara equipos en
 * marcador.html con los códigos (que también guardan el número de equipo y el puntaje).
 *
 * ▶ IP y GPS DE EJEMPLO: cámbienlos aquí por los que definan los organizadores del reto final.
 */
/* global marcador */

window.MISION = {
  ip: '201.148.36.77',
  gps: { lat: '29.0729', lon: '-110.9559' },
  juegos: {
    router: { nombre: 'Router humano', minimo: 3, unidad: 'paquetes entregados', partes: ['ip1', 'ip2'] },
    arma: { nombre: 'Arma a Ultrón', minimo: 4, unidad: 'piezas puestas', partes: ['ip3'] },
    carrera: { nombre: 'Carrera de palabras', minimo: 3, unidad: 'palabras descifradas', partes: ['ip4'] },
    robot: { nombre: 'Robot programado', minimo: 1, unidad: 'veces que Ultrón cayó al agua', partes: ['lat', 'lon'] },
  },
};

const mision = {
  clave: 'codexia-progreso',
  todas: ['ip1', 'ip2', 'ip3', 'ip4', 'lat', 'lon'],

  progreso() {
    try { return JSON.parse(localStorage.getItem(this.clave) || '{}'); } catch (e) { return {}; }
  },

  tiene(parte) { return Boolean(this.progreso()[parte]); },

  /** Desbloquea piezas; devuelve las que son nuevas. */
  desbloquear(partes) {
    const p = this.progreso();
    const nuevas = partes.filter((x) => !p[x]);
    nuevas.forEach((x) => { p[x] = true; });
    try { localStorage.setItem(this.clave, JSON.stringify(p)); } catch (e) { /* sin almacenamiento */ }
    if (nuevas.length) document.dispatchEvent(new CustomEvent('codexia-pista'));
    return nuevas;
  },

  reiniciar() {
    try {
      localStorage.removeItem(this.clave);
      localStorage.removeItem('codexia-puntos');
    } catch (e) { /* sin almacenamiento */ }
    document.dispatchEvent(new CustomEvent('codexia-pista'));
  },

  // ---------- puntos del equipo ----------

  /** { router: { mejor, rondas }, ... } de este visor. */
  puntos() {
    try { return JSON.parse(localStorage.getItem('codexia-puntos') || '{}'); } catch (e) { return {}; }
  },

  anotarPuntos(juego, puntaje) {
    const p = this.puntos();
    const j = p[juego] || { mejor: 0, rondas: 0 };
    j.rondas += 1;
    j.mejor = Math.max(j.mejor, puntaje);
    p[juego] = j;
    try { localStorage.setItem('codexia-puntos', JSON.stringify(p)); } catch (e) { /* sin almacenamiento */ }
    document.dispatchEvent(new CustomEvent('codexia-pista'));
    return j;
  },

  /** Suma de la mejor ronda de cada juego. */
  totalPuntos() {
    return Object.values(this.puntos()).reduce((a, j) => a + j.mejor, 0);
  },

  /** "Router 7 · Arma 5 · Carrera — · Misión —" */
  resumenPuntos() {
    const p = this.puntos();
    const cortos = { router: 'Router', arma: 'Arma', carrera: 'Carrera', robot: 'Misión' };
    return Object.keys(cortos).map((k) => `${cortos[k]} ${p[k] ? p[k].mejor : '—'}`).join(' · ');
  },

  valor(parte) {
    const ip = window.MISION.ip.split('.');
    return { ip1: ip[0], ip2: ip[1], ip3: ip[2], ip4: ip[3], lat: window.MISION.gps.lat, lon: window.MISION.gps.lon }[parte];
  },

  /** IP con lo que lleva el equipo, por ejemplo "201.148.__.__". */
  ipTexto() {
    return ['ip1', 'ip2', 'ip3', 'ip4'].map((x) => (this.tiene(x) ? this.valor(x) : '___')).join('.');
  },

  gpsTexto() {
    return `${this.tiene('lat') ? this.valor('lat') : '__.____'}, ${this.tiene('lon') ? this.valor('lon') : '-___.____'}`;
  },

  ipCompleta() { return ['ip1', 'ip2', 'ip3', 'ip4'].every((x) => this.tiene(x)); },
  completa() { return this.todas.every((x) => this.tiene(x)); },
  cuantas() { return this.todas.filter((x) => this.tiene(x)).length; },

  /** Al final de una ronda: ¿se ganó la pista? Devuelve lo que muestra la pantalla final. */
  terminarRonda(juego, puntaje) {
    const j = window.MISION.juegos[juego];
    if (!j) return null;
    // en el robot, una pieza del GPS por cada vez que Ultrón cae al agua
    const partes = juego === 'robot' ? j.partes.slice(0, puntaje) : (puntaje >= j.minimo ? j.partes : []);
    if (!partes.length) {
      return { ok: false, falta: `Necesitan ${j.minimo} ${j.unidad} (lograron ${puntaje}). ¡Jueguen otra ronda!` };
    }
    this.desbloquear(partes);
    if (juego === 'robot') {
      return { ok: true, titulo: this.completa() ? 'GPS DE ULTRÓN · MISIÓN COMPLETA' : 'PISTA · GPS DE ULTRÓN', valor: this.gpsTexto() };
    }
    return { ok: true, titulo: this.ipCompleta() ? 'PISTA · IP DE ULTRÓN COMPLETA' : 'PISTA · IP DE ULTRÓN', valor: this.ipTexto() };
  },
};

// al registrar una ronda (solo en rondas, no en práctica) se calcula la pista
if (typeof marcador !== 'undefined') {
  const registrarOriginal = marcador.registrar.bind(marcador);
  marcador.registrar = (juego, puntaje, detalle, alCambiar) => {
    const registro = registrarOriginal(juego, puntaje, detalle, alCambiar);
    registro.pista = mision.terminarRonda(juego, puntaje);
    mision.anotarPuntos(juego, puntaje);
    registro.total = mision.totalPuntos();
    registro.resumen = mision.resumenPuntos();
    return registro;
  };
}
