# CODEXIA · Ghost Network (edición de Enlace VR)

Taller de la **estación 04 · Redes** del hackathon CODEXIA (7 de noviembre de 2026). Es una copia de Enlace VR con la identidad del hackathon (negro y rojo, Orbitron y Rajdhani, Ultrón) y una misión: los equipos consiguen la **IP** de Ultrón en tres juegos y su **ubicación GPS** en la misión final. Enlace VR (la carpeta de arriba) no cambia.

Dirección: `https://mparra37.github.io/ITC-VR-Games/codexia/`

| Juego | Pista (al terminar una ronda con el mínimo) |
| --- | --- |
| Router humano | 3 paquetes → 1.º y 2.º número de la IP |
| Arma la computadora | 4 piezas → 3.er número |
| Carrera de palabras (palabras del agua, con un consejo cada una) | 3 palabras → 4.º número |
| Misión final · Robot programado: el equipo guía a Ultrón con el mapa hasta la presa; si pisa una antena suya, escapa | 1.ª caída al agua → latitud · 2.ª → longitud |

## Archivos

| Archivo | Qué es |
| --- | --- |
| `index.html` | Menú web y 3D, con la **Bitácora** del visor (IP y GPS que lleva el equipo) y el botón **Nuevo equipo** |
| `guia.html` | Guía del taller (guion de 40 min) y descargas |
| `js/mision.js` | **La IP y el GPS de Ultrón** (valores de ejemplo: cámbienlos aquí), los mínimos de cada juego y el avance guardado en el visor |
| `js/robot.js` | Misión final: Ultrón, antenas, la presa (agua, salpicadura) y las pistas del GPS |
| `js/comun.js`, `js/ambientes.js`, `js/router.js`, `js/router_cuartos.js`, `js/arma.js`, `js/carrera.js`, `js/menu.js` | Copias de Enlace VR en rojo, con los textos de la misión |
| `js/palabras.js` | Palabras del agua y sus consejos (lo genera `generar_codexia.py` a partir de `../../palabras_codexia.json`) |
| `material/` | Los PDF y el ZIP (los genera `../../prototipo_papel/generar_codexia.py`) |
| `videos/` | Los 4 reels; se regraban con `node codexia/videos/grabar_reels.mjs` desde `prototipo_vr`, con el sitio servido (variable `SITIO`) |

Los datos de Router, Arma y los 12 mapas del robot se comparten con Enlace VR (`../js/router_datos.js`, `../js/computadora_datos.js`, `../js/robot_mapas.js`): en esta edición los hoyos son antenas y la meta es la presa.

## Cambiar la IP o el GPS

1. Edita `js/mision.js` (`ip` y `gps`).
2. Corre `python ../../prototipo_papel/generar_codexia.py` para que la Guía del taller tenga la clave nueva.
3. Sube los cambios. Los visores que ya tengan pistas guardadas muestran los valores nuevos (se guardan las piezas, no los números).
