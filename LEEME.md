# Enlace VR · juegos para el visor

**Uno ve. El equipo sabe.** Juegos de computación para jugar en equipo con realidad virtual. Páginas web hechas con A-Frame: funcionan en el navegador del Meta Quest (modo realidad virtual) y en cualquier computadora (modo 2D con el mouse). `README.md` es esta misma documentación en inglés (la que muestra GitHub).

| Archivo | Qué es |
| --- | --- |
| `index.html` | Menú para elegir el juego: en la computadora son tarjetas web (cada una con su botón **▶ Video**) y dentro del visor es un menú 3D (se elige con el láser). Fondo: sala de servidores |
| `material.html` + `material/` | **Material para imprimir**: la guía rápida del profesor y los PDF de cada juego, con un ZIP por juego. Lo genera `publicar_material.py`, no editar a mano |
| `router.html` | Router humano (redes: direcciones IP), en una sala de servidores: hay que voltear a buscar las puertas |
| `arma.html` | Arma la computadora (hardware): un rompecabezas guiado dentro de la computadora, hay que voltear a buscar las piezas |
| `carrera.html` | Carrera de palabras (binario a ASCII). Con cada palabra correcta el mensaje da un "salto" y cambia el escenario: computadora → servidores → ciudad → fibra óptica → Internet → satélite |
| `programa.html` | Programa al robot: relevo individual (algoritmos). Cada alumno arma su programa con bloques; al llegar a la meta suena "¡SIGUIENTE!" y pasa el visor. Fondo: Internet (nodos y paquetes). **Jugarlo antes que Robot programado** |
| `robot.html` | Robot programado (algoritmos en equipo): el Operador no ve los hoyos ni la meta; el equipo lo guía con el mapa impreso. Fondo: estación en órbita |
| `js/menu.js` | La lista de juegos que usan los dos menús. Para agregar un juego nuevo al menú, basta con agregarlo aquí |
| `js/comun.js` | Piezas que comparten los juegos: colores y letras de la identidad, paneles, botones, sonidos, música y dibujos SVG |
| `js/ambientes.js` | Los fondos, hechos con código: `circuito` (dentro de la computadora), `servidores` (centro de datos), `futurista` (ciudad), `fibra` (túnel de fibra óptica), `red` (Internet) y `orbita` (estación con la Tierra y satélites). Se usan como `<a-entity ambiente-servidores>`; la Carrera usa `ambiente-viaje`, que pasa por los seis |
| `js/router.js`, `js/arma.js`, `js/carrera.js`, `js/programa.js`, `js/robot.js` | La lógica de cada juego |
| `js/router_datos.js`, `js/computadora_datos.js`, `js/palabras.js`, `js/programa_datos.js`, `js/robot_mapas.js`, `js/material_datos.js` | Datos y dibujos de cada juego (se generan solos, no editar a mano) |

## Identidad

Negro `#06080D`, azul marino `#0B1F3A`, gris `#8B95A7`, blanco `#F2F4F8` y un solo acento azul hielo `#5AA9FF`; el verde y el rojo solo significan correcto o incorrecto. Letras: Space Grotesk e IBM Plex Mono. El logo son dos nodos unidos por una línea punteada. Los colores están en `COLOR` de `js/comun.js` y en las variables CSS de `index.html` y `material.html`.

## Cómo se juega

Todos los juegos usan las mismas reglas: al abrirlos hay tres botones, **Practicar** (sin tiempo), **Empezar ronda** (3 minutos) y **Menú de juegos** (regresa al menú sin salir del visor); +1 por acierto y bloqueo de 5 segundos al fallar o saltar ("¡Enlace caído!"). Arma la computadora y Robot programado duran 5 minutos. Al terminar aparece el puntaje en grande y un **código de verificación** de 8 letras: el equipo anota puntaje y código en su hoja (`empezar.html` trae la hoja) y el profesor los verifica en `marcador.html`. Si `js/config.js` tiene la URL de Google Apps Script (`apps_script/LEEME.md`), el puntaje además llega solo a una hoja de Google Sheets. El número de equipo de cada visor y la música de fondo (generada por el navegador, sin letra) se eligen en el menú. En esa pantalla final están **Nueva ronda** (para el siguiente Operador) y **Menú de juegos**.

- **Router humano:** llega un paquete con una dirección IP. Como en un sobre, los 3 primeros números son la **red** (la calle) y el último es el **equipo** (el número de casa); el visor pinta la red en azul y el equipo en gris. El Operador le dicta la red al equipo, el equipo la busca en la tabla de rutas y le dice la puerta (SALÓN, BIBLIOTECA, INTERNET, SERVIDORES, LABORATORIO o BASURA, cada una con su dibujo). El Operador voltea y le dispara el paquete. Después de cada respuesta, la consola explica por qué ("La red 192.168.1 está en la tabla → SALÓN"). Nivel 2: redes parecidas (192.168.12 no es 192.168.1). Nivel 3: direcciones imposibles (un número mayor que 255 → BASURA) y las puertas cambian de lugar.
- **Arma la computadora:** enfrente hay una placa con lugares numerados y su modelo (A, B o C). Las piezas que faltan flotan alrededor como **dibujos sin nombre**. El Operador toma una pieza (apunta y gatillo), se la describe al equipo, y el equipo, con el catálogo y el plano armado de esa placa, le dice el número. El Operador apunta a ese número y la pieza vuela a su lugar. Al completar la placa, la computadora "se enciende" y muestra el nombre de cada pieza. La 1.ª placa tiene 4 lugares libres, la 2.ª 6 y desde la 3.ª los 8.
- **Carrera de palabras:** una palabra en binario, un byte por letra. El Operador escribe las letras con el teclado de la pantalla y presiona **Enviar**. Arriba del panel se ve por dónde va el mensaje ("Salto 3 de 6 · La ciudad conectada"); con cada acierto el escenario cambia al siguiente lugar de la red y, después del satélite, sale otro mensaje.
- **Programa al robot** (relevo individual, 8 minutos por equipo, 90 segundos por turno): a diferencia de los demás, se juega **solo**. En un tablero de 5 × 5 hay un robot, cajas y una meta verde. Con los bloques de la consola de abajo (Avanza, Gira a la izquierda, Gira a la derecha y, desde el nivel 3, ×2 / ×3 = repite el bloque que sigue) el Operador arma el programa y toca Ejecutar. Si llega a la meta suena una fanfarria fuerte, "¡SIGUIENTE!", y el visor pasa al siguiente, que recibe un reto más difícil. Si se acaba el turno suena una chicharra y también pasa el visor. Puntaje: retos resueltos.
- **Robot programado** (5 minutos, después de Programa al robot): el Operador ve un tablero de 5 × 5 (columnas A–E, filas 1–5, la fila 1 es ARRIBA) con el robot, pero **no ve los hoyos ni la meta**. El equipo tiene los 12 mapas impresos en el Manual de campo, pero no sabe dónde empieza el robot. El Operador dice "Mapa 3, empieza en B5". El equipo dicta una instrucción a la vez: una flecha y cuántas casillas ("dos hacia arriba"). El Operador elige la flecha y el número en la consola de abajo y presiona **Mover**; el robot avanza casilla por casilla y la pantalla dice **¡LISTO!**. Si pisa un hoyo o se sale del tablero, **se hunde**: termina esa jugada, se ve el mapa completo 3 segundos y sigue el otro mapa del mismo nivel. Si toca la meta: **¡LLEGASTE!**, +1 y pasa al siguiente nivel (6 niveles, 2 mapas cada uno). Puntaje: metas alcanzadas.

## Probarlo en la computadora

Abre `index.html` con doble clic (necesita internet para cargar A-Frame y las letras).

- Router humano: arrastra para mirar y haz clic en la puerta, o teclado (S salón, B biblioteca, I internet, V servidores, L laboratorio, X basura).
- Arma la computadora: arrastra para mirar, haz clic en una pieza y luego en su lugar de la placa (o teclas 1 a 8 para el lugar).
- Carrera de palabras: mouse, o teclado (letras, Retroceso = Borrar, Enter = Enviar).
- Robot programado: flechas del teclado, 1 a 4 = casillas, Enter = Mover.
- Programa al robot: flecha ↑ = avanza, ← y → = girar, 2 y 3 = repetir, Retroceso = borrar, Enter = ejecutar o empezar el siguiente turno.

Si después de actualizar los archivos no ves los cambios (en la computadora o en el visor), recarga la página: el navegador a veces guarda la versión anterior.

## Publicarlo para usarlo en el Quest (GitHub Pages, gratis)

El Quest necesita una dirección **https**, por eso hay que publicarlo. Solo se hace una vez.

1. Entra a [github.com](https://github.com) con tu cuenta (o crea una).
2. (Ya está publicado en [https://mparra37.github.io/ITC-VR-Games/](https://mparra37.github.io/ITC-VR-Games/), repositorio `mparra37/ITC-VR-Games`.) Para otra copia: botón **New** → nombre del repositorio → **Public** → **Create repository**.
3. En el repositorio nuevo, haz clic en **uploading an existing file** y arrastra **todo el contenido de esta carpeta**: los archivos `.html`, `README.md` y las carpetas `js` y `material`. Presiona **Commit changes**.
4. Ve a **Settings → Pages**. En *Source* elige **Deploy from a branch**, rama **main**, carpeta **/ (root)**, y **Save**.
5. Espera 1 o 2 minutos. La dirección será `https://TU-USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/` (abre el menú).

Para actualizarlo después, sube otra vez los archivos que cambiaron.

## Abrirlo en el Meta Quest

1. Conecta el visor al Wi-Fi de la escuela.
2. Abre **Browser**, escribe la dirección y guárdala en marcadores.
3. Toca **Entrar al menú en VR** y acepta el permiso.
4. Dentro del visor aparece el menú 3D: apunta a un juego con cualquiera de los dos controles y presiona el **gatillo**.
5. Para cambiar de juego, usa el botón **Menú de juegos** (en el inicio o al final de cada ronda).

Al cambiar de página, el navegador del Quest normalmente vuelve a entrar a VR solo. Si el visor se sale de VR, toquen el botón **VR** (abajo a la derecha). Antes de la clase prueba en el salón real que el Wi-Fi deja abrir `github.io` en el visor.

## Cambiar los datos de un juego

Edita `../router.json`, `../computadora.json`, `../palabras.json`, `../programa_robot.json` o `../robot_mapas.json` y ejecuta su generador (`generar_router.py`, `generar_arma.py`, `generar_material.py`, `generar_programa.py` o `generar_robot.py`), por ejemplo:

```bash
python ../prototipo_papel/generar_router.py
```

Cada uno actualiza el material en papel **y** el archivo del visor al mismo tiempo. Los dibujos (puertas y piezas) están en `../prototipo_papel/iconos.py` y son los mismos en papel y en el visor. Después, copia el material al sitio:

```bash
python ../prototipo_papel/publicar_material.py
```

## Pendiente para la siguiente versión

- Probarlo en un Quest real (solo se probó en la computadora, en modo 2D): que se lean bien los dibujos de las piezas y las direcciones IP.
- Marcador en vivo para el proyector.


## Páginas nuevas

- `empezar.html`: cómo empezar en una página (guion de un minuto, 3 pasos por juego, hoja de puntajes).
- `marcador.html`: verificar códigos y marcador por equipo (en vivo si hay hoja de Google).
- `js/router_cuartos.js`: los cuartos 3D detrás de cada puerta del Router humano.

- `videos/reel_*.mp4`: videos verticales de 15 s por juego (se ven desde el menú con **▶ Video** o **▶ Ver los videos**). Se regeneran con `node videos/grabar_reels.mjs` (Chrome sin ventana graba `videos/reel.html?juego=...`, que juega el juego real con un guion). Hay que volver a grabarlos cuando cambia cómo se ve un juego.

El Laboratorio NOC-7 (escape room) se quitó del menú el 30 de octubre de 2026 para usarlo después con alumnos más avanzados; está en `../_archivo/noc7/`.

## Edición CODEXIA

`codexia/` es una copia con la identidad del hackathon CODEXIA (Ultrón, negro y rojo) para la estación 04 · Redes: 4 juegos (sin Programa al robot), pistas de la IP y el GPS de Ultrón y palabras del cuidado del agua. Se publica en `mparra37.github.io/ITC-VR-Games/codexia/` y no cambia nada de Enlace VR. Ver `codexia/LEEME.md`.
