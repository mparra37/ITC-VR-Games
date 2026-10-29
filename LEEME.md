# Enlace VR · juegos para el visor

**Uno ve. El equipo sabe.** Juegos de computación para jugar en equipo con realidad virtual. Páginas web hechas con A-Frame: funcionan en el navegador del Meta Quest (modo realidad virtual) y en cualquier computadora (modo 2D con el mouse). `README.md` es esta misma documentación en inglés (la que muestra GitHub).

| Archivo | Qué es |
| --- | --- |
| `index.html` | Menú para elegir el juego: en la computadora son tarjetas web y dentro del visor es un menú 3D (se elige con el láser) |
| `material.html` + `material/` | **Material para imprimir**: la guía rápida del profesor y los PDF de cada juego, con un ZIP por juego. Lo genera `publicar_material.py`, no editar a mano |
| `router.html` | Router humano (redes: direcciones IP), dentro de la computadora: hay que voltear a buscar las puertas |
| `arma.html` | Arma la computadora (hardware): un rompecabezas guiado, hay que voltear a buscar las piezas |
| `carrera.html` | Carrera de palabras (binario a ASCII) |
| `robot.html` | Robot programado (algoritmos), con fondo de ciudad |
| `noc7.html` | Laboratorio NOC-7: escape room de 4 salas (binario, ASCII y lógica), basado en la versión original de `C:\dev\VR` |
| `js/menu.js` | La lista de juegos que usan los dos menús. Para agregar un juego nuevo al menú, basta con agregarlo aquí |
| `js/comun.js` | Piezas que comparten los juegos: colores y letras de la identidad, paneles, botones, sonidos, fondos y dibujos SVG |
| `js/router.js`, `js/arma.js`, `js/carrera.js`, `js/robot.js`, `js/noc7.js` | La lógica de cada juego |
| `js/router_datos.js`, `js/computadora_datos.js`, `js/palabras.js`, `js/robot_programas.js`, `js/noc7_datos.js`, `js/material_datos.js` | Datos y dibujos de cada juego (se generan solos, no editar a mano) |

## Identidad

Negro `#06080D`, azul marino `#0B1F3A`, gris `#8B95A7`, blanco `#F2F4F8` y un solo acento azul hielo `#5AA9FF`; el verde y el rojo solo significan correcto o incorrecto. Letras: Space Grotesk e IBM Plex Mono. El logo son dos nodos unidos por una línea punteada. Los colores están en `COLOR` de `js/comun.js` y en las variables CSS de `index.html` y `material.html`.

## Cómo se juega

Todos los juegos usan las mismas reglas: al abrirlos hay tres botones, **Practicar** (sin tiempo), **Empezar ronda** (3 minutos) y **Menú de juegos** (regresa al menú sin salir del visor); +1 por acierto y bloqueo de 5 segundos al fallar o saltar ("¡Enlace caído!"). Arma la computadora dura 5 minutos. Al terminar aparece el puntaje en grande y un **código de verificación** de 8 letras: el equipo anota puntaje y código en su hoja (`empezar.html` trae la hoja) y el profesor los verifica en `marcador.html`. Si `js/config.js` tiene la URL de Google Apps Script (`apps_script/LEEME.md`), el puntaje además llega solo a una hoja de Google Sheets. El número de equipo de cada visor y la música de fondo (generada por el navegador, sin letra) se eligen en el menú. En esa pantalla final están **Nueva ronda** (para el siguiente Operador) y **Menú de juegos**.

- **Router humano:** llega un paquete con una dirección IP. Como en un sobre, los 3 primeros números son la **red** (la calle) y el último es el **equipo** (el número de casa); el visor pinta la red en azul y el equipo en gris. El Operador le dicta la red al equipo, el equipo la busca en la tabla de rutas y le dice la puerta (SALÓN, BIBLIOTECA, INTERNET, SERVIDORES, LABORATORIO o BASURA, cada una con su dibujo). El Operador voltea y le dispara el paquete. Después de cada respuesta, la consola explica por qué ("La red 192.168.1 está en la tabla → SALÓN"). Nivel 2: redes parecidas (192.168.12 no es 192.168.1). Nivel 3: direcciones imposibles (un número mayor que 255 → BASURA) y las puertas cambian de lugar.
- **Arma la computadora:** enfrente hay una placa con lugares numerados y su modelo (A, B o C). Las piezas que faltan flotan alrededor como **dibujos sin nombre**. El Operador toma una pieza (apunta y gatillo), se la describe al equipo, y el equipo, con el catálogo y el plano armado de esa placa, le dice el número. El Operador apunta a ese número y la pieza vuela a su lugar. Al completar la placa, la computadora "se enciende" y muestra el nombre de cada pieza. La 1.ª placa tiene 4 lugares libres, la 2.ª 6 y desde la 3.ª los 8.
- **Carrera de palabras:** una palabra en binario, un byte por letra. El Operador escribe las letras con el teclado de la pantalla y presiona **Enviar**.
- **Laboratorio NOC-7** (escape room, unos 12 minutos por equipo, con puntos propios): 4 salas en orden. Sala 1: una IP en binario → escribirla en decimal. Sala 2: deletrear una palabra en binario con 8 focos (ASCII). Sala 3: a, b y c en binario → decimal. Sala 4: verdadero o falso con a, b y c (se muestran en binario: el equipo usa lo que anotó). Al resolver cada sala se enciende la palanca a la derecha; al jalarla se abre la puerta, hay un fundido a negro y una pausa para cambiar de Operador. Los números cambian en cada partida. La hoja del equipo de soporte trae las tablas de potencias de 2 y ASCII.
- **Robot programado:** el panel dice el número de programa, la casilla de inicio y hacia dónde mira el robot. El Operador toca la casilla donde termina y presiona **Enviar**. Al acertar, el robot recorre el programa y deja un rastro. Nivel 3 = programas con "Repite".

## Probarlo en la computadora

Abre `index.html` con doble clic (necesita internet para cargar A-Frame y las letras).

- Router humano: arrastra para mirar y haz clic en la puerta, o teclado (S salón, B biblioteca, I internet, V servidores, L laboratorio, X basura).
- Arma la computadora: arrastra para mirar, haz clic en una pieza y luego en su lugar de la placa (o teclas 1 a 8 para el lugar).
- Carrera de palabras: mouse, o teclado (letras, Retroceso = Borrar, Enter = Enviar).
- Robot programado: mouse, o escribe la casilla (por ejemplo `c2`) y Enter.
- Laboratorio NOC-7: números, Retroceso y Enter; 1 a 8 = focos; V/F = verdadero o falso; R = reiniciar para el siguiente equipo.

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

Edita `../router.json`, `../computadora.json`, `../palabras.json`, `../robot_programas.json` o `../noc7.json` y ejecuta su generador (`generar_router.py`, `generar_arma.py`, `generar_material.py`, `generar_robot.py` o `generar_noc7.py`), por ejemplo:

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
