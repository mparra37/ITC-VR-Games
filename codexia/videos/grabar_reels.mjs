// CODEXIA (edición de Enlace VR) · graba los reels de los juegos con Chrome sin ventana (sin instalar nada extra).
//
// Uso (con el sitio servido en http://localhost:8090, por ejemplo: python -m http.server 8090):
//   node codexia/videos/grabar_reels.mjs                 → los 5 juegos (router, arma, carrera, programa, robot)
//   node codexia/videos/grabar_reels.mjs router arma     → solo esos
// Guarda videos/reel_<juego>.mp4 (o .webm si el Chrome no graba MP4).
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SITIO = process.env.SITIO || 'http://localhost:8090';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PUERTO = 9335;
const JUEGOS = process.argv.slice(2).length ? process.argv.slice(2) : ['router', 'arma', 'carrera', 'robot'];
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const perfil = mkdtempSync(join(tmpdir(), 'reel-chrome-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PUERTO}`, `--user-data-dir=${perfil}`,
  '--autoplay-policy=no-user-gesture-required', '--window-size=720,1280', '--hide-scrollbars',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  '--enable-gpu-rasterization', '--ignore-gpu-blocklist', 'about:blank',
], { stdio: 'ignore' });

async function pestana() {
  for (let i = 0; i < 50; i++) {
    try {
      const lista = await (await fetch(`http://127.0.0.1:${PUERTO}/json/list`)).json();
      const p = lista.find((x) => x.type === 'page');
      if (p) return p.webSocketDebuggerUrl;
    } catch (e) { /* todavía no arranca */ }
    await espera(200);
  }
  throw new Error('Chrome no arrancó');
}

function conectar(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pendientes = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pendientes.has(d.id)) { pendientes.get(d.id)(d); pendientes.delete(d.id); }
  };
  const listo = new Promise((r) => { ws.onopen = r; });
  const enviar = async (method, params = {}) => {
    await listo;
    id += 1;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((r) => pendientes.set(id, r));
  };
  return { enviar, cerrar: () => ws.close() };
}

async function evaluar(cdp, expresion) {
  const r = await cdp.enviar('Runtime.evaluate', { expression: expresion, returnByValue: true });
  return r.result && r.result.result ? r.result.result.value : undefined;
}

try {
  const cdp = conectar(await pestana());
  await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: 720, height: 1280, deviceScaleFactor: 1, mobile: false });
  for (const juego of JUEGOS) {
    process.stdout.write(`${juego}: grabando… `);
    await cdp.enviar('Page.navigate', { url: `${SITIO}/codexia/videos/reel.html?juego=${juego}` });
    let listo = false;
    for (let s = 0; s < 120 && !listo; s++) {
      await espera(1000);
      const error = await evaluar(cdp, 'window.reelError || ""');
      if (error) throw new Error(`${juego}: ${error}`);
      listo = await evaluar(cdp, 'window.reelListo === true');
    }
    if (!listo) throw new Error(`${juego}: no terminó a tiempo`);
    const tipo = await evaluar(cdp, 'window.reelTipo');
    const datos = await evaluar(cdp, 'window.reelBase64');
    const ext = tipo.includes('mp4') ? 'mp4' : 'webm';
    const archivo = join(AQUI, `reel_${juego}.${ext}`);
    writeFileSync(archivo, Buffer.from(datos, 'base64'));
    console.log(`listo → ${archivo} (${(Buffer.byteLength(datos, 'base64') / 1e6).toFixed(1)} MB, ${tipo})`);
  }
  cdp.cerrar();
} finally {
  chrome.kill();
  await espera(500);
  try { rmSync(perfil, { recursive: true, force: true }); } catch (e) { /* Chrome a veces tarda en soltar el perfil */ }
}
