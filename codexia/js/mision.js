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
 *
 * MARCADOR GENERAL DE CODEXIA (Supabase): al terminar cada ronda, el visor manda los puntos del
 * equipo sobre 100 a la columna taller_4 (Redes). Base 100 = 5 puntos por acierto en la mejor ronda
 * de cada juego, máximo 25 por juego (4 juegos × 25). Supabase se queda con el más alto, así que
 * mandar varias veces no hace daño. Sin internet se guarda en el visor y se reintenta solo.
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

window.CODEXIA_SCORES = {
  url: 'https://zgpfcmvjmjfaphtudmis.supabase.co',
  clave: 'sb_publishable_0uQxgvjB7S7eCSqssUlPnA_Brhj-zx7', // clave pública (no es secreta)
  taller: 4, // columna taller_4 = estación 04 · Redes
  porAcierto: 5,
  topePorJuego: 25,
  equipos: 20, // equipos del evento: 1 a 20
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
      localStorage.removeItem('codexia-envio');
    } catch (e) { /* sin almacenamiento */ }
    // el equipo nuevo elige su número (así nadie manda puntos al equipo anterior)
    if (typeof marcador !== 'undefined') marcador.ponerEquipo(0);
    document.dispatchEvent(new CustomEvent('codexia-pista'));
    document.dispatchEvent(new CustomEvent('enlace-equipo'));
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

  // ---------- marcador general de CODEXIA (sobre 100) ----------

  /** Puntos sobre 100 de un juego: 5 por acierto de la mejor ronda, máximo 25. */
  puntosJuego(mejor) {
    const c = window.CODEXIA_SCORES;
    return Math.min(c.topePorJuego, c.porAcierto * (Number(mejor) || 0));
  },

  /** Puntos del equipo sobre 100 (lo que se manda a CODEXIA). */
  puntosCodexia(p = this.puntos()) {
    return Object.keys(window.MISION.juegos).reduce((a, k) => a + this.puntosJuego(p[k] ? p[k].mejor : 0), 0);
  },

  /** Último envío: { equipo, puntos, estado: 'enviando' | 'enviado' | 'sin-internet' | 'sin-equipo' }. */
  envio() {
    try { return JSON.parse(localStorage.getItem('codexia-envio') || 'null'); } catch (e) { return null; }
  },
  guardarEnvio(e) {
    try { localStorage.setItem('codexia-envio', JSON.stringify(e)); } catch (x) { /* sin almacenamiento */ }
    document.dispatchEvent(new CustomEvent('codexia-pista'));
  },

  /** Lo que falta mandar: { "12": 65, ... } (equipo → puntos). Sobrevive si se cierra la página. */
  pendientes() {
    try { return JSON.parse(localStorage.getItem('codexia-pendientes') || '{}'); } catch (e) { return {}; }
  },
  guardarPendientes(p) {
    try { localStorage.setItem('codexia-pendientes', JSON.stringify(p)); } catch (e) { /* sin almacenamiento */ }
  },

  /** Manda los puntos actuales de este visor a su equipo. */
  enviarCodexia() {
    const equipo = typeof marcador !== 'undefined' ? marcador.equipo() : 0;
    const puntos = this.puntosCodexia();
    if (!puntos) return Promise.resolve(this.envio());
    if (!equipo || equipo > window.CODEXIA_SCORES.equipos) {
      this.guardarEnvio({ equipo: 0, puntos, estado: 'sin-equipo' });
      return Promise.resolve(this.envio());
    }
    const p = this.pendientes();
    p[equipo] = Math.max(p[equipo] || 0, puntos);
    this.guardarPendientes(p);
    this.guardarEnvio({ equipo, puntos, estado: 'enviando' });
    return this.mandarPendientes().then(() => this.envio());
  },

  /** Intenta mandar todo lo pendiente (uno por equipo). */
  mandarPendientes() {
    if (this.mandando) return this.mandando.then(() => this.mandarPendientes());
    const c = window.CODEXIA_SCORES;
    const lista = Object.entries(this.pendientes());
    if (!lista.length || !window.fetch) return Promise.resolve();
    this.mandando = Promise.all(lista.map(([equipo, puntos]) => {
      const control = window.AbortController ? new AbortController() : null;
      const reloj = control ? setTimeout(() => control.abort(), 10000) : null;
      return fetch(`${c.url}/rest/v1/rpc/registrar_taller`, {
        method: 'POST',
        headers: { apikey: c.clave, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_equipo: Number(equipo), p_taller: c.taller, p_puntaje: puntos }),
        signal: control ? control.signal : undefined,
      }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const quedan = this.pendientes();
        if ((quedan[equipo] || 0) <= puntos) delete quedan[equipo];
        this.guardarPendientes(quedan);
        return { equipo: Number(equipo), ok: true };
      }).catch(() => ({ equipo: Number(equipo), ok: false }))
        .finally(() => { if (reloj) clearTimeout(reloj); });
    })).then((resultados) => {
      this.mandando = null;
      const e = this.envio();
      const mio = e && resultados.find((r) => r.equipo === e.equipo);
      if (mio) this.guardarEnvio(Object.assign({}, e, { estado: mio.ok ? 'enviado' : 'sin-internet' }));
    });
    return this.mandando;
  },

  /** Una línea para las pantallas: "Equipo 12 · enviado al marcador ✓". */
  textoEnvio() {
    const e = this.envio();
    if (!this.puntosCodexia()) return 'Se manda al marcador de CODEXIA al terminar una ronda';
    if (!e || e.estado === 'sin-equipo' || !e.equipo) return 'Elijan su número de equipo en el menú para mandar los puntos';
    const estado = { enviando: 'enviando…', enviado: 'enviado al marcador ✓', 'sin-internet': 'sin internet: se reintenta solo' }[e.estado] || '';
    return `Equipo ${e.equipo} · ${estado}`;
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
    registro.codexia = mision.puntosCodexia();
    mision.enviarCodexia().then(() => { if (alCambiar) alCambiar(registro); });
    return registro;
  };

  // al elegir número de equipo (por ejemplo, si se les olvidó antes de jugar), mandar lo que llevan
  const ponerEquipoOriginal = marcador.ponerEquipo.bind(marcador);
  marcador.ponerEquipo = (n) => {
    ponerEquipoOriginal(n);
    if (Number(n) > 0 && mision.puntosCodexia() > 0) mision.enviarCodexia();
  };
}

// al abrir cualquier página del taller (y al volver el internet), reintentar lo pendiente
window.addEventListener('load', () => setTimeout(() => mision.mandarPendientes(), 2000));
window.addEventListener('online', () => mision.mandarPendientes());
setInterval(() => { if (Object.keys(mision.pendientes()).length) mision.mandarPendientes(); }, 30000);
