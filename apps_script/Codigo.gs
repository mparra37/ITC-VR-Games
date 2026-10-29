/* Enlace VR · guarda en esta hoja de Google Sheets los puntajes que mandan los visores.
 *
 * Cómo instalarlo (una sola vez, ver LEEME.md):
 * 1. Crea una hoja de cálculo nueva en Google Sheets (con una cuenta de Gmail).
 * 2. Extensiones > Apps Script. Borra lo que haya y pega todo este archivo. Guarda.
 * 3. Implementar > Nueva implementación > tipo "Aplicación web".
 *    Ejecutar como: Yo.  Quién tiene acceso: Cualquier usuario.  Implementar y autorizar.
 * 4. Copia la URL que termina en /exec y pégala en js/config.js (urlHoja).
 *
 * doPost: recibe un puntaje de un visor y lo agrega como fila (si el código ya está, no lo repite).
 * doGet:  regresa todos los puntajes en JSON, para el marcador en vivo (marcador.html).
 */

const NOMBRE_HOJA = 'Puntajes';
const ENCABEZADOS = ['Recibido', 'Juego', 'Equipo', 'Puntaje', 'Código', 'Detalle', 'Hora del visor'];

function hoja_() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(NOMBRE_HOJA);
  if (!hoja) {
    hoja = libro.insertSheet(NOMBRE_HOJA);
    hoja.appendRow(ENCABEZADOS);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, ENCABEZADOS.length).setFontWeight('bold');
  }
  return hoja;
}

function doPost(e) {
  const candado = LockService.getScriptLock();
  candado.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    const hoja = hoja_();
    const codigo = String(d.codigo || '').trim();
    const repetido = codigo && hoja.getRange('E:E').createTextFinder(codigo).matchEntireCell(true).findNext();
    if (!repetido) {
      hoja.appendRow([new Date(), String(d.juego || ''), Number(d.equipo) || '', Number(d.puntaje) || 0, codigo, String(d.detalle || ''), String(d.fecha || '')]);
    }
    return ContentService.createTextOutput('ok');
  } finally {
    candado.releaseLock();
  }
}

function doGet() {
  const filas = hoja_().getDataRange().getValues().slice(1);
  const datos = filas.map((f) => ({
    recibido: f[0] instanceof Date ? f[0].toISOString() : String(f[0]),
    juego: f[1],
    equipo: f[2],
    puntaje: f[3],
    codigo: f[4],
    detalle: f[5],
    fecha: f[6],
  }));
  return ContentService.createTextOutput(JSON.stringify(datos)).setMimeType(ContentService.MimeType.JSON);
}
