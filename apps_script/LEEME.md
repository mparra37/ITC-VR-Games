# Puntajes en Google Sheets

Con esto, cada visor manda su puntaje solo al terminar la ronda, y el marcador del profesor
(`marcador.html`) se actualiza en vivo. Si un día no hay internet, no pasa nada: el juego muestra
un **código** al final, el equipo lo anota en su hoja y el profesor lo verifica en `marcador.html`.

## Instalar (una sola vez, unos 5 minutos)

1. Entra a <https://sheets.new> con una cuenta de **Gmail** (las cuentas de la escuela a veces no
   dejan publicar aplicaciones web para "cualquier usuario").
2. Ponle nombre a la hoja, por ejemplo *Enlace VR · Puntajes*.
3. Menú **Extensiones > Apps Script**. Borra lo que aparece y pega todo `Codigo.gs`. Guarda (Ctrl+S).
4. Botón **Implementar > Nueva implementación**. En el engrane, elige **Aplicación web**.
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
5. **Implementar**. Google pide permiso: *Revisar permisos* > tu cuenta > *Configuración avanzada* >
   *Ir a … (no seguro)* > *Permitir*. (Dice "no seguro" porque el script es tuyo y no está verificado.)
6. Copia la **URL de la aplicación web** (termina en `/exec`).
7. Pégala en `js/config.js`, en `urlHoja: '...'`, y sube el cambio a GitHub.
   Los visores la toman la próxima vez que abran el sitio.

## Probar

Abre `marcador.html`: si la URL está bien, dice "Conectado a Google Sheets". Juega una ronda corta
en la computadora (Empezar ronda) y espera a que termine: en la pantalla final debe decir
"✓ Enviado al marcador" y la fila aparece en la hoja.

## Notas

- Si cambias `Codigo.gs`, vuelve a implementar con **Implementar > Administrar implementaciones >
  editar > Versión nueva** (así la URL no cambia).
- La hoja guarda todo el historial; el marcador muestra solo los registros de hoy.
- Cualquiera que tenga la URL puede leer los puntajes (solo juego, equipo, puntaje y código).
- Lo que un visor no pudo mandar (sin internet) se guarda en el visor y se reintenta al abrir
  otro juego.
