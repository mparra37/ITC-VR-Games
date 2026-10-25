# VR ITC Games · prototipos para el visor

Área de **VR, redes y tecnología** del evento CODEXIA (en el evento se superan retos para derrotar a Ultrón). Cada juego es un reto independiente; el puntaje de cada ronda es la energía que pierde Ultrón y se anota en el marcador. Los colores y letras (negro, rojo #ff1638, plata; Orbitron y Rajdhani) están en `js/comun.js` (`COLOR`, `LETRA`, `TITULO`) y en el estilo de `index.html`.

Páginas web hechas con A-Frame: funcionan en el navegador del Meta Quest (modo realidad virtual) y en cualquier computadora (modo 2D con el mouse).

| Archivo | Qué es |
| --- | --- |
| `README.md` | Esta misma documentación en inglés (la que muestra GitHub al publicarlo) |
| `index.html` | Menú para elegir el minijuego: en la computadora son tarjetas web y dentro del visor es un menú 3D (se elige con el láser) |
| `viaje.html` + `js/viaje.js` | **Trailer: el sistema de Ultrón.** Viaje sentado de unos 2 minutos dentro de la computadora (cable de fibra óptica → router → memoria RAM → CPU) que termina frente a Ultrón. Se abre desde el botón **Ver trailer** de los dos menús |
| `material.html` + `material/` | **Material para imprimir**: la guía rápida del profesor y los PDF de cada juego (instructivo, reglas, manual, hojas, tarjetas) con un ZIP por juego. Se abre desde el menú web. Lo genera `publicar_material.py`, no editar a mano |
| `js/menu.js` | La lista de juegos que usan los dos menús. Para agregar un juego nuevo al menú, basta con agregarlo aquí |
| `carrera.html` | Carrera de palabras (binario a ASCII) |
| `robot.html` | Robot programado (algoritmos), con fondo de ciudad futurista |
| `contrasena.html` | ¿Contraseña segura? (ciberseguridad), con fondo futurista y candado holográfico |
| `drones.html` | Drones de Ultrón: ¿amigo o enemigo? (inteligencia artificial: árboles de decisión), en la azotea de un centro de datos: hay que voltear a buscar los drones |
| `marte.html` | Misión Marte: la IA del rover (inteligencia artificial), dentro de un domo en Marte |
| `router.html` | Router humano (redes), dentro de la computadora: hay que voltear a buscar los portales |
| `arma.html` | Arma la computadora (hardware), dentro de la computadora: hay que voltear a buscar las piezas |
| `js/comun.js` | Piezas que comparten los juegos: paneles, botones, sonidos y el fondo futurista |
| `js/drones.js`, `js/carrera.js`, `js/robot.js`, `js/contrasena.js`, `js/marte.js`, `js/router.js`, `js/arma.js` | La lógica de cada juego |
| `js/palabras.js`, `js/robot_programas.js`, `js/contrasenas.js`, `js/mision_marte.js`, `js/router_datos.js`, `js/computadora_datos.js`, `js/drones_datos.js` | Datos de cada juego (se generan solos, no editar a mano) |

## Cómo se juega

Todos los juegos usan las mismas reglas: al abrirlos hay tres botones, **Practicar** (sin tiempo), **Empezar ronda** (3 minutos) y **Menú de juegos** (regresa al menú sin salir del visor); +1 por acierto, bloqueo de 5 segundos al fallar o saltar, y subir de nivel cada 5 aciertos. Al terminar aparece el puntaje en grande con el aviso "¡Ultrón pierde esta energía! Anótenla en el marcador"; el profesor (o el equipo) lo anota en su fila del marcador. En esa pantalla final están **Nueva ronda** (para el siguiente Operador) y **Menú de juegos** (para cambiar de minijuego).

- **Carrera de palabras:** una palabra en binario, un byte por letra. El Operador escribe las letras con el teclado de la pantalla y presiona **Enviar**.
- **Robot programado:** el panel dice el número de programa, la casilla de inicio y hacia dónde mira el robot. En la mesa hay un tablero 4 × 4 con el robot. El Operador toca la casilla donde termina y presiona **Enviar** (en la mesa). Al acertar, el robot recorre el programa y deja un rastro para que todos vean el camino. Nivel 3 = programas con "Repite".
- **¿Contraseña segura?:** el Operador ve una contraseña (un cuadro por carácter) y la deletrea. Niveles 1 y 2: **SEGURA** o **DÉBIL**. Nivel 3: **qué regla falla** (Regla 1 a 5, o Ninguna). Al acertar aparece la revisión de las 5 reglas (palomas y taches) y el candado holográfico se abre; al fallar, tiembla en rojo.
- **Misión Marte:** el Operador está dentro de un domo geodésico en Marte. Lee los sensores de la muestra (0 a 3) y el equipo calcula con la tabla de pesos qué es: ROCA, HIELO, METAL o VIDA (valor × peso, se suma, gana el mayor: una capa de red neuronal). Al acertar aparece el cálculo y el rover actúa afuera del domo; si es VIDA, manda un rayo de luz a la Tierra.
- **Drones de Ultrón:** un dron llega volando por un lado (la consola dice hacia dónde voltear y qué árbol usar). El Operador lo describe: forma, color del ojo, si parpadea, antenas, hélices y número de serie. El equipo sigue el árbol de decisión del manual: si es **ENEMIGO**, el Operador le dispara con el gatillo; si es **ALIADO**, presiona el botón ALIADO. Después de cada respuesta, la consola muestra el camino del árbol (también si fallaron, para aprender). Nivel 1 = árbol A, nivel 2 = árbol B, nivel 3 = en cada dron toca el B o el C.
- **Router humano** y **Arma la computadora** ocurren *dentro de la computadora* (piso de circuitos, chips gigantes, pulsos de datos). La información está en una consola inclinada frente al Operador y los objetivos están a su alrededor, así que tiene que **voltear la cabeza** (sentado, sin girar el cuerpo completo):
  - **Router humano:** llega un paquete con su IP; el equipo consulta la tabla de rutas y el Operador busca el portal (SALÓN, BIBLIOTECA, INTERNET, SERVIDORES, SATÉLITE, DESCARTAR) y le dispara el paquete. Los portales cambian de lugar en cada nivel, y en el nivel 3 después de cada paquete.
  - **Arma la computadora:** la placa madre pide una pieza (por su función, por un problema o por su unidad de medida); el equipo la identifica con el manual y el Operador la busca entre las 8 piezas que flotan alrededor. La pieza vuela a su ranura en la placa madre.

## Trailer: el sistema de Ultrón

Para mostrar al inicio del evento (o mientras los equipos se organizan). El Operador va sentado en un vehículo que avanza solo; solo voltea a mirar. Paradas:

1. **Puerto de red:** "Ultrón tomó el control de la computadora central".
2. **Cable de fibra óptica:** pulsos de luz y paquetes con su dirección IP.
3. **Router:** un anillo "lee" la IP y se enciende el portal de la memoria RAM.
4. **Memoria RAM:** chips con bits que cambian; en las paredes hay 6 bytes en binario que forman **ULTRON** (cada letra aparece al pasar junto a ella, como en Carrera de palabras).
5. **CPU:** núcleos del procesador y Ultrón en el centro. El Operador le apunta con el láser y presiona el gatillo (si no lo hace, se dispara solo a los 14 s). Aparecen sus **6 escudos**, uno por reto, y la pantalla final con **Elegir un reto** y **Ver de nuevo**.

- **Iniciar con voz** usa la voz en español del navegador (si el visor no tiene una, solo se ven los subtítulos). **Iniciar sin voz** solo muestra subtítulos: mejor si hay 6 visores en el mismo salón.
- Para no marear: avanza de frente, despacio, sin giros ni subidas; el piso del vehículo se mueve con el jugador. Aun así, avisen que pueden cerrar los ojos o quitarse el visor.
- No usa videos: todo se dibuja con código, así que carga rápido en el Wi-Fi de la escuela.
- En la computadora: Enter = iniciar sin voz, Espacio = disparar a Ultrón.

## Probarlo en la computadora

Abre `index.html` con doble clic (necesita internet para cargar A-Frame y las letras).

- Carrera de palabras: mouse, o teclado (letras, Retroceso = Borrar, Enter = Enviar).
- Robot programado: mouse, o escribe la casilla (por ejemplo `c2`) y Enter. Arrastra con el mouse para mirar alrededor.
- ¿Contraseña segura?: mouse, o teclado (S = segura, D = débil; en el nivel 3, 1 a 5 = regla y 0 = ninguna).
- Misión Marte: mouse, o teclado (R = roca, H = hielo, M = metal, V = vida).
- Router humano: arrastra para mirar y haz clic en el portal, o teclado (S, B, I, V, T, D).
- Arma la computadora: arrastra para mirar y haz clic en la pieza, o teclas 1 a 8 (orden del manual).
- Drones de Ultrón: arrastra para mirar; clic en el dron = disparar (enemigo), botón ALIADO = dejarlo pasar; o teclado (E = enemigo, A = aliado).

Si después de actualizar los archivos no ves los cambios (en la computadora o en el visor), recarga la página: el navegador a veces guarda la versión anterior.

## Publicarlo para usarlo en el Quest (GitHub Pages, gratis)

El Quest necesita una dirección **https**, por eso hay que publicarlo. Solo se hace una vez.

1. Entra a [github.com](https://github.com) con tu cuenta (o crea una).
2. Botón **New** → nombre del repositorio: `vr-itc-games` → **Public** → **Create repository**.
3. En el repositorio nuevo, haz clic en **uploading an existing file** y arrastra **todo el contenido de esta carpeta**: los archivos `.html`, `README.md` y las carpetas `js` y `material`. Presiona **Commit changes**.
4. Ve a **Settings → Pages**. En *Source* elige **Deploy from a branch**, rama **main**, carpeta **/ (root)**, y **Save**.
5. Espera 1 o 2 minutos. La dirección será `https://TU-USUARIO.github.io/vr-itc-games/` (abre el menú).

Para actualizarlo después, sube otra vez los archivos que cambiaron.

## Abrirlo en el Meta Quest

1. Conecta el visor al Wi-Fi de la escuela.
2. Abre **Browser**, escribe la dirección y guárdala en marcadores.
3. Toca **Entrar al menú en VR** y acepta el permiso.
4. Dentro del visor aparece el menú 3D: apunta a un juego con cualquiera de los dos controles y presiona el **gatillo**.
5. Para cambiar de juego, usa el botón **Menú de juegos** (en el inicio o al final de cada ronda).

Al cambiar de página, el navegador del Quest normalmente vuelve a entrar a VR solo. Si el visor se sale de VR, toquen el botón **VR** (abajo a la derecha) para volver a entrar. También se puede elegir el juego desde las tarjetas del menú web y luego tocar **VR**.

Antes de la clase prueba en el salón real que el Wi-Fi deja abrir `github.io` en el visor.

## Cambiar palabras o programas

Edita `../palabras.json`, `../robot_programas.json`, `../contrasenas.json`, `../mision_marte.json`, `../router.json`, `../computadora.json` o `../drones.json` y ejecuta el generador que corresponde (`generar_marte.py`, `generar_router.py`, `generar_arma.py` o `generar_drones.py` para los juegos nuevos):

```bash
python ../prototipo_papel/generar_material.py
```

```bash
python ../prototipo_papel/generar_robot.py
```

```bash
python ../prototipo_papel/generar_contrasena.py
```

Cada uno actualiza el material en papel **y** el archivo del visor al mismo tiempo, para que el papel y el visor coincidan. Después, copia el material al sitio (para que quede en la página **Material para imprimir** y en GitHub):

```bash
python ../prototipo_papel/publicar_material.py
```

## Pendiente para la siguiente versión

- Probarlo en un Quest real (estos prototipos solo se probaron en la computadora, en modo 2D).
- Usar el fondo futurista también en Carrera de palabras.
- Marcador en vivo para el proyector.
- Los demás minijuegos, con las mismas piezas de `comun.js`.
- Probar el trailer en el Quest: que corra fluido (unos 72 cuadros por segundo) y que nadie se maree.
