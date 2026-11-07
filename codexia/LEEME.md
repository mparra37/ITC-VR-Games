# CODEXIA · Ghost Network (edición de Enlace VR)

Taller de la **estación 04 · Redes** del hackathon CODEXIA (7 de noviembre de 2026). Es una copia de Enlace VR con la identidad del hackathon (negro y rojo, Orbitron y Rajdhani, Ultrón) y una misión: los equipos consiguen la **IP** de Ultrón en tres juegos y su **ubicación GPS** en la misión final. Enlace VR (la carpeta de arriba) no cambia.

Dirección: `https://mparra37.github.io/ITC-VR-Games/codexia/`

| Juego | Pista (al terminar una ronda con el mínimo) |
| --- | --- |
| Router humano: 6 puertas desde el inicio (NÚCLEO, FÁBRICA, PRESA, PLANTA, ANTENAS, INTERNET) y CUARENTENA en el nivel 3 | 3 paquetes → 1.º y 2.º número de la IP |
| Arma a Ultrón: el robot ya viene armado por fuera; reconectan las 8 piezas de adentro (robot y computadora). 3 modelos que el equipo adivina por fuera: hombros, emblema del pecho y el lado del brazo cañón | 4 piezas → 3.er número |
| Carrera de palabras, 5 minutos (palabras del agua, con un consejo cada una) | 3 palabras → 4.º número |
| Misión final · Robot programado: el equipo guía a Ultrón con el mapa hasta la presa; si pisa una antena suya, escapa | 1.ª caída al agua → latitud · 2.ª → longitud |

## Archivos

| Archivo | Qué es |
| --- | --- |
| `index.html` | Menú web y 3D, con la **Bitácora** del visor (IP, GPS y puntos del equipo) y el botón **Nuevo equipo** (en el visor, debajo de la bitácora; dos toques). En cada juego, **✕ Salir** (al inicio sin guardar) y **Menú**, también con dos toques |
| `marcador.html` | **Marcador de equipos**: se pegan los códigos que anotan los equipos y suma la mejor ronda de cada juego; se puede proyectar |
| `guia.html` | Guía del taller (guion de 40 min) y descargas |
| `js/mision.js` | **La IP y el GPS de Ultrón** (valores de ejemplo: cámbienlos aquí), los mínimos de cada juego y el avance guardado en el visor |
| `js/robot.js` | Misión final: Ultrón, antenas, la presa (agua, salpicadura) y las pistas del GPS |
| `js/comun.js`, `js/ambientes.js`, `js/router.js`, `js/router_cuartos.js`, `js/arma.js`, `js/carrera.js`, `js/menu.js` | Copias de Enlace VR en rojo, con los textos de la misión. `router_cuartos.js` suma los cuartos del mundo de Ultrón y `arma.js` dibuja el chasis del robot |
| `js/router_datos.js`, `js/ultron_datos.js` | Puertas del Router y piezas de Ultrón con sus dibujos (los genera `generar_codexia.py` a partir de `../../router_codexia.json` y `../../ultron.json`) |
| `js/palabras.js` | Palabras del agua y sus consejos (lo genera `generar_codexia.py` a partir de `../../palabras_codexia.json`) |
| `material/` | Los PDF y el ZIP (los genera `../../prototipo_papel/generar_codexia.py`) |
| `videos/` | Los 4 reels; se regraban con `node codexia/videos/grabar_reels.mjs` desde `prototipo_vr`, con el sitio servido (variable `SITIO`) |

La misión final tiene sus propios 12 sectores, de fácil a difícil (`js/robot_mapas.js`, desde `../../robot_mapas_codexia.json`, que crea `../../prototipo_papel/crear_mapas_codexia.py`): el nivel 1 se resuelve con una sola instrucción de 3 casillas en línea recta, y cada nivel agrega antenas, pasos y vueltas. Los hoyos son antenas y la meta es la presa. Router y Arma tienen sus propios datos (arriba). Los dibujos de las puertas y de las piezas de Ultrón están en `../../prototipo_papel/iconos.py`.

## Cambiar la IP o el GPS

1. Edita `js/mision.js` (`ip` y `gps`).
2. Corre `python ../../prototipo_papel/generar_codexia.py` para que la Guía del taller tenga la clave nueva.
3. Sube los cambios. Los visores que ya tengan pistas guardadas muestran los valores nuevos (se guardan las piezas, no los números).

## Marcador general de CODEXIA (Supabase)

Al terminar cada **ronda**, el visor manda los puntos de su equipo **sobre 100** a la columna `taller_4` (Redes) de la tabla `scores` de Supabase, con la función `registrar_taller` (la misma que usan los otros talleres). Base 100 = **5 puntos por acierto** en la mejor ronda de cada juego, **máximo 25 por juego**. Supabase se queda con el puntaje más alto, así que mandar de nuevo no hace daño.

- La configuración (URL, clave pública, número de taller y la regla de puntos) está en `CODEXIA_SCORES`, al principio de `js/mision.js`.
- El número de equipo del visor es el del evento (**1 a 20**). **Nuevo equipo** también lo borra, para que cada grupo elija el suyo y nadie mande puntos al equipo anterior. Si eligen el número después de jugar, se mandan en ese momento.
- Sin internet, el visor guarda los puntos y reintenta solo (al abrir otra página, al volver la conexión y cada 30 s).
- Respaldo en `marcador.html`: columna **CODEXIA /100**, columna **Ya en CODEXIA** (lo que tiene Supabase), **Mandar a CODEXIA lo que falte** e **Imprimir resultados** (hoja en blanco y negro con firmas).
- Los códigos de 8 letras ahora aceptan equipos del 16 al 20 (`../js/marcador.js`); los de los equipos 1 a 15 no cambian.
