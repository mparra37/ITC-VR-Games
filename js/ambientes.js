/* Enlace VR · fondos (escenarios) de los juegos
 *
 * Todo se dibuja con código (sin imágenes ni modelos), así carga rápido en el visor.
 * Cada escenario es una función que arma un grupo de three.js y dice qué niebla usa:
 *
 *   circuito    dentro de la computadora: tarjeta de circuitos, chips, capacitores y pulsos de datos
 *   servidores  sala de servidores (centro de datos): racks con luces, charolas de cables y pantalla de red
 *   futurista   ciudad conectada: edificios con luces azules, anillos y partículas de datos
 *   fibra       dentro de un cable de fibra óptica: pulsos de luz que viajan por el túnel
 *   red         Internet: nodos conectados y paquetes que saltan de uno a otro
 *   orbita      estación en órbita: la Tierra de noche, satélites y enlaces de luz
 *
 * En una página se usan como componentes:  <a-entity ambiente-servidores></a-entity>
 * La Carrera de palabras usa <a-entity ambiente-viaje>: el mensaje viaja por los 6 escenarios
 * y cambia de uno al siguiente con window.ambienteViaje.ir(n).
 *
 * Comodidad en el visor: el jugador nunca se mueve; solo se mueven cosas lejanas y despacio.
 */
/* global AFRAME, THREE, azarConSemilla */

// ---------- utilidades ----------

/** Textura dibujada en un lienzo. */
function texturaDe(ancho, alto, dibujar, { repetir = null } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  dibujar(canvas.getContext('2d'), ancho, alto);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repetir) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repetir[0], repetir[1]);
  }
  return tex;
}

/** Cielo: esfera grande con un degradado vertical y estrellas. Devuelve la malla. */
function cieloDe(azar, paradas, { estrellas = 0, alturaEstrellas = 0.48, banda = false } = {}) {
  const tex = texturaDe(2048, 1024, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    paradas.forEach(([p, color]) => g.addColorStop(p, color));
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    if (banda) {
      // vía láctea: una franja inclinada de polvo claro
      for (let i = 0; i < 2600; i++) {
        const x = azar() * w;
        const centro = h * 0.3 + Math.sin((x / w) * Math.PI * 2) * h * 0.12;
        const y = centro + (azar() + azar() + azar() - 1.5) * h * 0.08;
        c.globalAlpha = 0.05 + azar() * 0.12;
        c.fillStyle = azar() < 0.5 ? '#9cc7ff' : '#ffffff';
        c.fillRect(x, y, 2 + azar() * 3, 2 + azar() * 3);
      }
    }
    for (let i = 0; i < estrellas; i++) {
      c.globalAlpha = 0.25 + azar() * 0.75;
      c.fillStyle = azar() < 0.15 ? '#9cc7ff' : '#ffffff';
      const t = azar() < 0.08 ? 3 : 2;
      c.fillRect(azar() * w, azar() * h * alturaEstrellas, t, t);
    }
    c.globalAlpha = 1;
  });
  return new THREE.Mesh(
    new THREE.SphereGeometry(150, 48, 24),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false, transparent: true }),
  );
}

/** Aro de luz en el piso alrededor del jugador. */
function aroJugador(radio = 1.9, y = 0.01) {
  const aro = new THREE.Mesh(
    new THREE.RingGeometry(radio, radio + 0.05, 64),
    new THREE.MeshBasicMaterial({ color: 0x5aa9ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
  );
  aro.rotation.x = -Math.PI / 2;
  aro.position.y = y;
  return aro;
}

/** Plataforma bajo el jugador para los escenarios "en el aire" (fibra, órbita). */
function plataforma(radio = 2.2) {
  const g = new THREE.Group();
  const tex = texturaDe(512, 512, (c, w, h) => {
    c.fillStyle = '#0b1626';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(90,169,255,.35)';
    c.lineWidth = 3;
    for (let r = 60; r < 256; r += 48) { c.beginPath(); c.arc(256, 256, r, 0, Math.PI * 2); c.stroke(); }
    for (let a = 0; a < 12; a++) {
      c.beginPath();
      c.moveTo(256 + Math.cos((a * Math.PI) / 6) * 60, 256 + Math.sin((a * Math.PI) / 6) * 60);
      c.lineTo(256 + Math.cos((a * Math.PI) / 6) * 250, 256 + Math.sin((a * Math.PI) / 6) * 250);
      c.stroke();
    }
  });
  const piso = new THREE.Mesh(new THREE.CircleGeometry(radio, 64), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95 }));
  piso.rotation.x = -Math.PI / 2;
  const orilla = new THREE.Mesh(new THREE.TorusGeometry(radio, 0.03, 8, 96), new THREE.MeshBasicMaterial({ color: 0x5aa9ff }));
  orilla.rotation.x = Math.PI / 2;
  const falda = new THREE.Mesh(
    new THREE.CylinderGeometry(radio, radio * 0.55, 0.5, 64, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x0b1626, side: THREE.DoubleSide }),
  );
  falda.position.y = -0.25;
  g.add(piso, orilla, falda);
  return g;
}

/** Partículas que suben despacio alrededor del jugador. Devuelve { puntos, tick }. */
function particulasQueSuben(azar, { total = 400, radioMin = 5, radioMax = 22, alto = 12, color = 0x5aa9ff, tam = 0.06, opacidad = 0.8 } = {}) {
  const pos = new Float32Array(total * 3);
  for (let i = 0; i < total; i++) {
    const a = azar() * Math.PI * 2;
    const r = radioMin + azar() * (radioMax - radioMin);
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = azar() * alto;
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const puntos = new THREE.Points(geo, materialPuntos(color, tam * 1.6, opacidad));
  return {
    puntos,
    tick(s) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i) + s * (0.35 + (i % 7) * 0.07);
        if (y > alto) y = 0;
        p.setY(i, y);
      }
      p.needsUpdate = true;
    },
  };
}

/** Destello redondo (para luces lejanas). */
function destello(color, tam, opacidad = 1) {
  const tex = texturaDe(128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: opacidad, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  sprite.scale.set(tam, tam, 1);
  return sprite;
}

/** Textura de punto redondo y difuminado (para que las partículas no se vean cuadradas). */
let TEXTURA_PUNTO = null;
function texturaPunto() {
  if (!TEXTURA_PUNTO) {
    TEXTURA_PUNTO = texturaDe(64, 64, (c) => {
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.45, 'rgba(255,255,255,.85)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
    });
  }
  return TEXTURA_PUNTO;
}

/** Material de partículas redondas. */
function materialPuntos(color, tam, opacidad = 1, extra = {}) {
  return new THREE.PointsMaterial(Object.assign({ color, size: tam, map: texturaPunto(), transparent: true, opacity: opacidad, depthWrite: false }, extra));
}

const AMBIENTES = {};

// ---------- dentro de la computadora ----------

AMBIENTES.circuito = (azar) => {
  const grupo = new THREE.Group();
  const texPiso = texturaDe(1024, 1024, (c) => {
    c.fillStyle = '#070b13';
    c.fillRect(0, 0, 1024, 1024);
    const paso = 32;
    for (let i = 0; i < 70; i++) {
      let x = Math.floor(azar() * 32) * paso;
      let y = Math.floor(azar() * 32) * paso;
      c.strokeStyle = azar() < 0.8 ? 'rgba(90, 169, 255, 0.55)' : 'rgba(230, 232, 235, 0.35)';
      c.lineWidth = azar() < 0.3 ? 5 : 3;
      c.beginPath();
      c.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        if (azar() < 0.5) x += (Math.floor(azar() * 6) - 3) * paso; else y += (Math.floor(azar() * 6) - 3) * paso;
        c.lineTo(x, y);
      }
      c.stroke();
      c.fillStyle = c.strokeStyle;
      c.beginPath();
      c.arc(x, y, 6, 0, Math.PI * 2);
      c.fill();
    }
    for (let i = 0; i < 6; i++) {
      c.strokeStyle = 'rgba(90, 169, 255, 0.3)';
      c.lineWidth = 2;
      c.strokeRect(Math.floor(azar() * 28) * paso, Math.floor(azar() * 28) * paso, 4 * paso, 3 * paso);
    }
  }, { repetir: [10, 10] });
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ map: texPiso }));
  piso.rotation.x = -Math.PI / 2;
  grupo.add(piso, aroJugador());

  // chips, capacitores y disipadores gigantes alrededor
  // materiales sin luz: se ven igual en cualquier juego, con o sin lámparas
  const chipMat = new THREE.MeshBasicMaterial({ color: 0x0e1a2e });
  const metalMat = [new THREE.MeshBasicMaterial({ color: 0x6b7690 }), new THREE.MeshBasicMaterial({ color: 0x48526a })];
  const capMat = new THREE.MeshBasicMaterial({ color: 0x161a26 });
  const lineaAzul = new THREE.LineBasicMaterial({ color: 0x5aa9ff });
  for (let i = 0; i < 34; i++) {
    const angulo = azar() * Math.PI * 2;
    const radio = 5 + azar() * 16;
    const x = Math.cos(angulo) * radio;
    const z = Math.sin(angulo) * radio;
    const tipo = azar();
    if (tipo < 0.45) {
      const ancho = 1.2 + azar() * 2.5;
      const alto = 0.3 + azar() * 1.2;
      const caja = new THREE.BoxGeometry(ancho, alto, ancho);
      const chip = new THREE.Mesh(caja, chipMat);
      chip.position.set(x, alto / 2, z);
      chip.rotation.y = azar() * Math.PI;
      const orilla = new THREE.LineSegments(new THREE.EdgesGeometry(caja), lineaAzul);
      orilla.position.copy(chip.position);
      orilla.rotation.copy(chip.rotation);
      grupo.add(chip, orilla);
    } else if (tipo < 0.75) {
      const r = 0.3 + azar() * 0.4;
      const h = 0.8 + azar() * 1.6;
      const capacitor = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), capMat);
      capacitor.position.set(x, h / 2, z);
      const tapa = new THREE.Mesh(new THREE.TorusGeometry(r * 0.8, 0.03, 8, 24), new THREE.MeshBasicMaterial({ color: azar() < 0.5 ? 0x5aa9ff : 0xe6e8eb }));
      tapa.rotation.x = Math.PI / 2;
      tapa.position.set(x, h + 0.01, z);
      grupo.add(capacitor, tapa);
    } else {
      const disipador = new THREE.Group();
      const aletas = 8 + Math.floor(azar() * 6);
      const alto = 1 + azar() * 2;
      for (let a = 0; a < aletas; a++) {
        const aleta = new THREE.Mesh(new THREE.BoxGeometry(0.06, alto, 1.6), metalMat[a % 2]);
        aleta.position.set(a * 0.18, alto / 2, 0);
        disipador.add(aleta);
      }
      disipador.position.set(x, 0, z);
      disipador.rotation.y = azar() * Math.PI;
      grupo.add(disipador);
    }
  }

  // buses de datos en el "techo"
  for (let i = 0; i < 10; i++) {
    const bus = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 70), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x5aa9ff : 0xe6e8eb, transparent: true, opacity: 0.55 }));
    bus.position.set(-9 + i * 2, 7 + (i % 3) * 0.6, 0);
    bus.rotation.y = 0.2;
    grupo.add(bus);
  }

  // pulsos de datos que corren por el piso (en X o en Z)
  const total = 160;
  const pos = new Float32Array(total * 3);
  const ejes = [];
  for (let i = 0; i < total; i++) {
    pos[i * 3] = (azar() - 0.5) * 40;
    pos[i * 3 + 1] = 0.05;
    pos[i * 3 + 2] = (azar() - 0.5) * 40;
    ejes.push(azar() < 0.5 ? 0 : 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  grupo.add(new THREE.Points(geo, materialPuntos(0x8fc3ff, 0.24, 0.95)));
  const lluvia = particulasQueSuben(azar, { total: 400, radioMin: 6, radioMax: 24, alto: 10, color: 0x8f9299, tam: 0.05, opacidad: 0.7 });
  grupo.add(lluvia.puntos);

  return {
    grupo,
    niebla: { color: 0x06080d, cerca: 3, lejos: 30 },
    tick(s) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const eje = ejes[i];
        let v = (eje === 0 ? p.getX(i) : p.getZ(i)) + s * (2 + (i % 4));
        if (v > 20) v = -20;
        if (eje === 0) p.setX(i, v); else p.setZ(i, v);
      }
      p.needsUpdate = true;
      lluvia.tick(s);
    },
  };
};

// ---------- sala de servidores (centro de datos) ----------

/** Frente de un rack: servidores de 1U y 2U, rejillas, discos y luces apagadas. */
function texturaRack(azar) {
  return texturaDe(256, 1024, (c, w, h) => {
    c.fillStyle = '#080d16';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#1a2840';
    c.fillRect(0, 0, 14, h);
    c.fillRect(w - 14, 0, 14, h);
    let y = 30;
    while (y < h - 40) {
      const u = azar() < 0.25 ? 3 : azar() < 0.5 ? 2 : 1;
      const alto = u * 30 - 4;
      if (azar() < 0.12) { y += 30; continue; } // hueco vacío
      c.fillStyle = azar() < 0.5 ? '#121c2c' : '#0f1726';
      c.fillRect(18, y, w - 36, alto);
      c.strokeStyle = 'rgba(139,149,167,.35)';
      c.lineWidth = 1;
      c.strokeRect(18.5, y + 0.5, w - 37, alto - 1);
      if (u >= 2 && azar() < 0.6) {
        // bahías de discos
        for (let x = 26; x < w - 70; x += 22) {
          c.fillStyle = '#1b2a44';
          c.fillRect(x, y + 5, 18, alto - 10);
          c.fillStyle = 'rgba(90,169,255,.5)';
          c.fillRect(x + 7, y + alto - 12, 4, 3);
        }
      } else {
        // rejilla de ventilación
        c.fillStyle = 'rgba(139,149,167,.18)';
        for (let x = 30; x < w - 80; x += 8) c.fillRect(x, y + 6, 4, alto - 12);
      }
      // etiqueta y puertos
      c.fillStyle = 'rgba(242,244,248,.25)';
      c.fillRect(w - 70, y + 6, 28, 5);
      y += u * 30;
    }
  });
}

/** Pantalla grande de monitoreo de red (como en un centro de operaciones). */
function texturaPantallaRed(azar) {
  return texturaDe(2048, 720, (c, w, h) => {
    c.fillStyle = '#04101f';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(90,169,255,.08)';
    c.lineWidth = 2;
    for (let x = 0; x < w; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y < h; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    // mapa de la red: nodos y enlaces
    const nodos = [];
    for (let i = 0; i < 26; i++) nodos.push([120 + azar() * 1250, 110 + azar() * (h - 200)]);
    c.lineWidth = 3;
    nodos.forEach((a, i) => {
      const cercanos = nodos.map((b, j) => [Math.hypot(a[0] - b[0], a[1] - b[1]), j]).sort((p, q) => p[0] - q[0]).slice(1, 3);
      cercanos.forEach(([, j]) => {
        if (j < i) return;
        c.strokeStyle = azar() < 0.8 ? 'rgba(90,169,255,.55)' : 'rgba(255,92,108,.6)';
        c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(nodos[j][0], nodos[j][1]); c.stroke();
      });
    });
    nodos.forEach(([x, y], i) => {
      c.fillStyle = i % 5 === 0 ? '#F2F4F8' : '#5AA9FF';
      c.beginPath(); c.arc(x, y, i % 5 === 0 ? 14 : 9, 0, Math.PI * 2); c.fill();
      c.font = '500 22px "IBM Plex Mono", monospace';
      c.fillStyle = 'rgba(139,149,167,.9)';
      c.fillText(`${i % 5 === 0 ? 'CORE' : 'NODO'}-${String(i + 1).padStart(2, '0')}`, x + 18, y - 12);
    });
    // gráficas de tráfico a la derecha
    for (let k = 0; k < 3; k++) {
      const x0 = 1440;
      const y0 = 70 + k * 210;
      c.strokeStyle = 'rgba(242,244,248,.2)';
      c.strokeRect(x0, y0, 560, 170);
      c.font = '600 24px "IBM Plex Mono", monospace';
      c.fillStyle = '#8B95A7';
      c.fillText(['TRÁFICO · Gb/s', 'PAQUETES / s', 'LATENCIA · ms'][k], x0 + 16, y0 + 32);
      c.strokeStyle = k === 2 ? '#3DDC97' : '#5AA9FF';
      c.lineWidth = 3;
      c.beginPath();
      let v = 0.5;
      for (let x = 0; x <= 520; x += 10) {
        v = Math.min(0.95, Math.max(0.1, v + (azar() - 0.5) * 0.25));
        const py = y0 + 160 - v * 110;
        if (x === 0) c.moveTo(x0 + 20 + x, py); else c.lineTo(x0 + 20 + x, py);
      }
      c.stroke();
    }
  });
}

AMBIENTES.servidores = (azar) => {
  const grupo = new THREE.Group();
  const largo = 34;

  // piso técnico (losetas de 60 cm, algunas perforadas) y techo oscuro
  const texPiso = texturaDe(512, 512, (c, w, h) => {
    c.fillStyle = '#091120';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const x = i * 256;
        const y = j * 256;
        c.fillStyle = (i + j) % 2 ? '#0c1626' : '#0e1a2d';
        c.fillRect(x + 4, y + 4, 248, 248);
        if ((i + j) % 2 === 0) {
          c.fillStyle = 'rgba(90,169,255,.10)';
          for (let a = 0; a < 12; a++) for (let b = 0; b < 12; b++) c.fillRect(x + 26 + a * 18, y + 26 + b * 18, 6, 6);
        }
      }
    }
    c.fillStyle = 'rgba(90,169,255,.22)';
    [0, 254].forEach((k) => { c.fillRect(0, k, w, 3); c.fillRect(k, 0, 3, h); });
  }, { repetir: [largo / 1.2, largo / 1.2] });
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(largo, largo), new THREE.MeshBasicMaterial({ map: texPiso }));
  piso.rotation.x = -Math.PI / 2;
  grupo.add(piso, aroJugador());
  const techo = new THREE.Mesh(new THREE.PlaneGeometry(largo, largo), new THREE.MeshBasicMaterial({ color: 0x04070d }));
  techo.rotation.x = Math.PI / 2;
  techo.position.y = 4.4;
  grupo.add(techo);
  // tiras de luz en el techo y en el piso (pasillo frío)
  const luzTecho = new THREE.MeshBasicMaterial({ color: 0xbfdcff });
  [-2.6, 2.6].forEach((x) => {
    const tira = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, largo), luzTecho);
    tira.position.set(x, 4.36, 0);
    grupo.add(tira);
  });
  for (let z = -15; z <= 15; z += 3) {
    const tira = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.04, 0.1), luzTecho);
    tira.position.set(0, 4.36, z);
    grupo.add(tira);
  }
  const luzPiso = new THREE.MeshBasicMaterial({ color: 0x5aa9ff, transparent: true, opacity: 0.75 });
  [-4.55, 4.55].forEach((x) => {
    const tira = new THREE.Mesh(new THREE.PlaneGeometry(0.06, largo - 4), luzPiso);
    tira.rotation.x = -Math.PI / 2;
    tira.position.set(x, 0.012, 0);
    grupo.add(tira);
  });

  // racks: dos filas a los lados (de frente al jugador) y una fila atrás
  const lugares = [];
  for (let z = -15.5; z <= 15.5; z += 0.64) {
    lugares.push({ x: -5.2, z, giro: Math.PI / 2 });
    lugares.push({ x: 5.2, z, giro: -Math.PI / 2 });
  }
  for (let x = -4.2; x <= 4.2; x += 0.64) lugares.push({ x, z: 16.3, giro: Math.PI });
  const variantes = [texturaRack(azar), texturaRack(azar), texturaRack(azar)];
  const lado = new THREE.MeshBasicMaterial({ color: 0x0d1524 });
  const arriba = new THREE.MeshBasicMaterial({ color: 0x16233a });
  const caja = new THREE.BoxGeometry(0.6, 2.3, 1.05);
  const matriz = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const eje = new THREE.Vector3(0, 1, 0);
  const uno = new THREE.Vector3(1, 1, 1);
  variantes.forEach((tex, k) => {
    const mios = lugares.filter((_, i) => i % 3 === k);
    const frente = new THREE.MeshBasicMaterial({ map: tex });
    const racks = new THREE.InstancedMesh(caja, [lado, lado, arriba, lado, frente, lado], mios.length);
    mios.forEach((l, i) => {
      q.setFromAxisAngle(eje, l.giro);
      matriz.compose(new THREE.Vector3(l.x, 1.15, l.z), q, uno);
      racks.setMatrixAt(i, matriz);
    });
    grupo.add(racks);
  });

  // luces de los servidores: parpadean (una malla con muchas copias)
  const porRack = 9;
  const totalLuces = lugares.length * porRack;
  const luces = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.03, 0.022), new THREE.MeshBasicMaterial({ color: 0xffffff }), totalLuces);
  const tonos = [new THREE.Color(0x5aa9ff), new THREE.Color(0x3ddc97), new THREE.Color(0xf2f4f8), new THREE.Color(0x5aa9ff)];
  const apagado = new THREE.Color(0x1b2a44);
  const colorDe = [];
  let n = 0;
  lugares.forEach((l) => {
    q.setFromAxisAngle(eje, l.giro);
    for (let k = 0; k < porRack; k++) {
      const local = new THREE.Vector3(0.12 + azar() * 0.13, -1.0 + azar() * 2.0, 0.53).applyQuaternion(q);
      matriz.compose(new THREE.Vector3(l.x + local.x, 1.15 + local.y, l.z + local.z), q, uno);
      luces.setMatrixAt(n, matriz);
      const color = azar() < 0.04 ? new THREE.Color(0xff5c6c) : tonos[Math.floor(azar() * tonos.length)];
      colorDe.push(color);
      luces.setColorAt(n, color);
      n += 1;
    }
  });
  grupo.add(luces);

  // charolas de cables sobre los racks
  const metal = new THREE.MeshBasicMaterial({ color: 0x1f2d45 });
  [-5.2, 5.2].forEach((x) => {
    const charola = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, largo - 2), metal);
    charola.position.set(x, 2.75, 0);
    grupo.add(charola);
    [0x5aa9ff, 0xf2f4f8, 0x2f6fbf].forEach((color, i) => {
      const cable = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, largo - 2), new THREE.MeshBasicMaterial({ color }));
      cable.position.set(x - 0.14 + i * 0.14, 2.82, 0);
      grupo.add(cable);
    });
    // soportes al techo
    for (let z = -14; z <= 14; z += 4) {
      const soporte = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 0.04), metal);
      soporte.position.set(x, 3.6, z);
      grupo.add(soporte);
    }
  });

  // al fondo (enfrente): pared con la pantalla grande de monitoreo de la red
  const pared = new THREE.Mesh(new THREE.PlaneGeometry(largo, 4.4), new THREE.MeshBasicMaterial({ color: 0x070c16 }));
  pared.position.set(0, 2.2, -16.4);
  grupo.add(pared);
  const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 2.95), new THREE.MeshBasicMaterial({ map: texturaPantallaRed(azar), fog: false }));
  pantalla.position.set(0, 2.25, -16.3);
  const marco = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 3.15), new THREE.MeshBasicMaterial({ color: 0x2f6fbf, fog: false }));
  marco.position.set(0, 2.25, -16.33);
  grupo.add(marco, pantalla);
  [-1, 1].forEach((s) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3), new THREE.MeshBasicMaterial({ map: texturaPantallaRed(azar), fog: false }));
    p.position.set(s * 6.2, 2.4, -16.3);
    grupo.add(p);
  });

  const polvo = particulasQueSuben(azar, { total: 220, radioMin: 2.5, radioMax: 12, alto: 4.2, color: 0x9cc7ff, tam: 0.035, opacidad: 0.5 });
  grupo.add(polvo.puntos);

  let reloj = 0;
  return {
    grupo,
    niebla: { color: 0x070c16, cerca: 7, lejos: 32 },
    tick(s) {
      polvo.tick(s * 0.4);
      reloj += s;
      if (reloj < 0.09) return;
      reloj = 0;
      // en cada parpadeo, unas 60 luces cambian
      for (let k = 0; k < 60; k++) {
        const i = Math.floor(Math.random() * totalLuces);
        luces.setColorAt(i, Math.random() < 0.35 ? apagado : colorDe[i]);
      }
      luces.instanceColor.needsUpdate = true;
    },
  };
};

// ---------- ciudad conectada ----------

AMBIENTES.futurista = (azar) => {
  const grupo = new THREE.Group();
  grupo.add(cieloDe(azar, [[0, '#030304'], [0.38, '#070b14'], [0.49, '#14315c'], [0.52, '#0b1730'], [1, '#030304']], { estrellas: 900 }));

  const piso = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.MeshBasicMaterial({ color: 0x06080d }));
  piso.rotation.x = -Math.PI / 2;
  grupo.add(piso);
  const rejilla = new THREE.GridHelper(120, 120, 0x5aa9ff, 0x14284a);
  rejilla.position.y = 0.002;
  rejilla.material.transparent = true;
  rejilla.material.opacity = 0.55;
  grupo.add(rejilla, aroJugador());

  // ventanas iluminadas para los edificios
  const texVentanas = texturaDe(64, 128, (v) => {
    v.fillStyle = '#0a0d1f';
    v.fillRect(0, 0, 64, 128);
    const tonos = ['#5AA9FF', '#e6e8eb', '#2F6FBF', '#8B95A7'];
    for (let y = 4; y < 128; y += 10) {
      for (let x = 4; x < 64; x += 10) {
        if (azar() < 0.35) {
          v.fillStyle = tonos[Math.floor(azar() * tonos.length)];
          v.globalAlpha = 0.5 + azar() * 0.5;
          v.fillRect(x, y, 5, 6);
        }
      }
    }
    v.globalAlpha = 1;
  }, { repetir: [1, 1] });

  for (let i = 0; i < 70; i++) {
    const angulo = azar() * Math.PI * 2;
    const radio = 20 + azar() * 28;
    const ancho = 2 + azar() * 4;
    const alto = 4 + Math.pow(azar(), 1.6) * 26;
    const tex = texVentanas.clone();
    tex.repeat.set(Math.max(1, Math.round(ancho / 2)), Math.max(1, Math.round(alto / 4)));
    tex.needsUpdate = true;
    const edificio = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, ancho), new THREE.MeshBasicMaterial({ map: tex }));
    edificio.position.set(Math.cos(angulo) * radio, alto / 2, Math.sin(angulo) * radio);
    edificio.rotation.y = azar() * Math.PI;
    grupo.add(edificio);
    if (azar() < 0.4) {
      const techo = new THREE.Mesh(
        new THREE.BoxGeometry(ancho * 1.02, 0.15, ancho * 1.02),
        new THREE.MeshBasicMaterial({ color: azar() < 0.5 ? 0x5aa9ff : 0xe6e8eb }),
      );
      techo.position.set(edificio.position.x, alto, edificio.position.z);
      techo.rotation.y = edificio.rotation.y;
      grupo.add(techo);
    }
  }

  // anillos holográficos flotando al fondo
  const anillos = [];
  [[3.2, 0x5aa9ff], [4.4, 0xe6e8eb], [5.6, 0x2f6fbf]].forEach(([radio, color], i) => {
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(radio, 0.025, 8, 96), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 }));
    anillo.position.set(0, 4.8, -9);
    anillo.rotation.x = Math.PI / 2.4 + i * 0.25;
    grupo.add(anillo);
    anillos.push(anillo);
  });

  const datos = particulasQueSuben(azar, { total: 500, radioMin: 5, radioMax: 23, alto: 14, color: 0x5aa9ff, tam: 0.07 });
  grupo.add(datos.puntos);

  return {
    grupo,
    niebla: { color: 0x05080f, cerca: 6, lejos: 60 },
    tick(s) {
      anillos.forEach((anillo, i) => { anillo.rotation.z += s * (0.15 + i * 0.07) * (i % 2 ? -1 : 1); });
      datos.tick(s);
    },
  };
};

// ---------- dentro de un cable de fibra óptica ----------

AMBIENTES.fibra = (azar) => {
  const grupo = new THREE.Group();
  const radio = 6;
  const largo = 140;
  // pared del túnel: haces de fibras (rayas a lo largo)
  const texPared = texturaDe(1024, 256, (c, w, h) => {
    c.fillStyle = '#050b18';
    c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) {
      c.fillStyle = azar() < 0.25 ? 'rgba(90,169,255,.35)' : 'rgba(47,111,191,.18)';
      c.fillRect(0, y, w, 2);
    }
    for (let i = 0; i < 40; i++) {
      c.fillStyle = 'rgba(242,244,248,.25)';
      c.fillRect(azar() * w, Math.floor(azar() * h / 4) * 4, 40 + azar() * 160, 2);
    }
  }, { repetir: [6, 10] });
  const pared = new THREE.Mesh(
    new THREE.CylinderGeometry(radio, radio, largo, 48, 1, true),
    new THREE.MeshBasicMaterial({ map: texPared, side: THREE.BackSide }),
  );
  pared.rotation.x = Math.PI / 2;
  pared.position.y = 1.2;
  grupo.add(pared);
  // aros fijos a lo largo del túnel (dan una referencia quieta)
  for (let z = -60; z <= 30; z += 9) {
    const aro = new THREE.Mesh(new THREE.TorusGeometry(radio - 0.15, 0.05, 8, 96), new THREE.MeshBasicMaterial({ color: 0x2f6fbf, transparent: true, opacity: 0.8 }));
    aro.position.set(0, 1.2, z);
    grupo.add(aro);
  }
  // la luz al final del túnel
  const luz = destello('rgba(90,169,255,.9)', 26, 0.9);
  luz.position.set(0, 1.2, -66);
  grupo.add(luz);

  // pulsos de luz: rayas que viajan hacia el jugador por las paredes
  const total = 240;
  const pos = new Float32Array(total * 6);
  const col = new Float32Array(total * 6);
  const rayas = [];
  const colores = [new THREE.Color(0x5aa9ff), new THREE.Color(0xf2f4f8), new THREE.Color(0x9cc7ff), new THREE.Color(0x2f6fbf)];
  for (let i = 0; i < total; i++) {
    const a = azar() * Math.PI * 2;
    const r = 2.6 + azar() * (radio - 3);
    rayas.push({ x: Math.cos(a) * r, y: 1.2 + Math.sin(a) * r, z: -60 + azar() * 90, largo: 0.8 + azar() * 2.4, vel: 3 + azar() * 5 });
    const color = colores[i % colores.length];
    for (let k = 0; k < 2; k++) col.set([color.r, color.g, color.b], i * 6 + k * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const lineas = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 }));
  grupo.add(lineas, plataforma(2.2));

  const acomodar = () => {
    rayas.forEach((r, i) => {
      pos.set([r.x, r.y, r.z, r.x, r.y, r.z - r.largo], i * 6);
    });
    geo.attributes.position.needsUpdate = true;
  };
  acomodar();
  return {
    grupo,
    niebla: { color: 0x03060d, cerca: 5, lejos: 55 },
    tick(s) {
      rayas.forEach((r) => {
        r.z += r.vel * s;
        if (r.z > 30) r.z = -60;
      });
      acomodar();
      texPared.offset.y -= s * 0.02;
    },
  };
};

// ---------- Internet: nodos y enlaces ----------

AMBIENTES.red = (azar) => {
  const grupo = new THREE.Group();
  grupo.add(cieloDe(azar, [[0, '#010207'], [0.42, '#050b18'], [0.5, '#0f2a52'], [0.53, '#071224'], [1, '#010207']], { estrellas: 300, alturaEstrellas: 0.45 }));
  const piso = new THREE.Mesh(new THREE.CircleGeometry(90, 64), new THREE.MeshBasicMaterial({ color: 0x03060d }));
  piso.rotation.x = -Math.PI / 2;
  const rejilla = new THREE.GridHelper(160, 80, 0x2f6fbf, 0x0e1f3a);
  rejilla.position.y = 0.003;
  grupo.add(piso, rejilla, aroJugador());

  // nodos: esferas brillantes en el aire, lejos del jugador
  const nodos = [];
  const matNodo = [new THREE.MeshBasicMaterial({ color: 0x5aa9ff }), new THREE.MeshBasicMaterial({ color: 0xf2f4f8 }), new THREE.MeshBasicMaterial({ color: 0x2f6fbf })];
  const halo = new THREE.SpriteMaterial({ map: texturaPunto(), color: 0x5aa9ff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 70; i++) {
    const a = azar() * Math.PI * 2;
    const r = 12 + azar() * 32;
    const p = new THREE.Vector3(Math.cos(a) * r, 1 + azar() * (3 + r * 0.32), Math.sin(a) * r);
    const tam = 0.12 + azar() * 0.3;
    const nodo = new THREE.Mesh(new THREE.IcosahedronGeometry(tam, 1), matNodo[i % 3]);
    nodo.position.copy(p);
    const brillo = new THREE.Sprite(halo);
    brillo.scale.setScalar(tam * 6);
    brillo.position.copy(p);
    grupo.add(nodo, brillo);
    nodos.push(p);
  }
  // el núcleo: un nodo grande con anillos, al frente y lejos
  const nucleo = new THREE.Vector3(0, 9, -32);
  nodos.push(nucleo);
  const esferaNucleo = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 2), new THREE.MeshBasicMaterial({ color: 0x5aa9ff, wireframe: true }));
  esferaNucleo.position.copy(nucleo);
  grupo.add(esferaNucleo);
  const brilloNucleo = destello('rgba(90,169,255,.8)', 9, 0.8);
  brilloNucleo.position.copy(nucleo);
  grupo.add(brilloNucleo);
  const anillos = [2.4, 3.2, 4.1].map((rr, i) => {
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.04, 8, 96), new THREE.MeshBasicMaterial({ color: i === 1 ? 0xf2f4f8 : 0x5aa9ff, transparent: true, opacity: 0.7 }));
    anillo.position.copy(nucleo);
    anillo.rotation.x = 1 + i * 0.5;
    grupo.add(anillo);
    return anillo;
  });

  // enlaces: cada nodo con sus 2 vecinos más cercanos (y algunos con el núcleo)
  const enlaces = [];
  nodos.forEach((a, i) => {
    nodos.map((b, j) => [a.distanceTo(b), j]).filter(([, j]) => j !== i).sort((p, q) => p[0] - q[0]).slice(0, 2)
      .forEach(([, j]) => { if (!enlaces.some(([x, y]) => (x === j && y === i))) enlaces.push([i, j]); });
    if (i % 9 === 0 && i !== nodos.length - 1) enlaces.push([i, nodos.length - 1]);
  });
  const verts = [];
  enlaces.forEach(([i, j]) => verts.push(nodos[i].x, nodos[i].y, nodos[i].z, nodos[j].x, nodos[j].y, nodos[j].z));
  const geoEnlaces = new THREE.BufferGeometry();
  geoEnlaces.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  grupo.add(new THREE.LineSegments(geoEnlaces, new THREE.LineBasicMaterial({ color: 0x2f6fbf, transparent: true, opacity: 0.6 })));
  // columnas de luz del piso a algunos nodos
  const columnas = [];
  nodos.forEach((p, i) => { if (i % 6 === 0) columnas.push(p.x, 0, p.z, p.x, p.y, p.z); });
  const geoCol = new THREE.BufferGeometry();
  geoCol.setAttribute('position', new THREE.Float32BufferAttribute(columnas, 3));
  grupo.add(new THREE.LineSegments(geoCol, new THREE.LineBasicMaterial({ color: 0x5aa9ff, transparent: true, opacity: 0.25 })));

  // paquetes que viajan por los enlaces
  const totalPaquetes = 160;
  const paquetes = [];
  const pos = new Float32Array(totalPaquetes * 3);
  for (let i = 0; i < totalPaquetes; i++) paquetes.push({ enlace: Math.floor(azar() * enlaces.length), t: azar(), vel: 0.15 + azar() * 0.35, ida: azar() < 0.5 });
  const geoPaq = new THREE.BufferGeometry();
  geoPaq.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  grupo.add(new THREE.Points(geoPaq, materialPuntos(0xcfe5ff, 0.4, 0.95)));
  const v = new THREE.Vector3();

  return {
    grupo,
    niebla: { color: 0x03060d, cerca: 10, lejos: 75 },
    tick(s) {
      paquetes.forEach((p, i) => {
        p.t += p.vel * s;
        if (p.t > 1) {
          // al llegar, salta a otro enlace que sale del mismo nodo (si hay)
          const [a, b] = enlaces[p.enlace];
          const llegada = p.ida ? b : a;
          const siguientes = enlaces.map((e, k) => [e, k]).filter(([e]) => e[0] === llegada || e[1] === llegada);
          const [e, k] = siguientes[Math.floor(Math.random() * siguientes.length)];
          p.enlace = k;
          p.ida = e[0] === llegada;
          p.t = 0;
        }
        const [a, b] = enlaces[p.enlace];
        v.lerpVectors(p.ida ? nodos[a] : nodos[b], p.ida ? nodos[b] : nodos[a], p.t);
        pos[i * 3] = v.x;
        pos[i * 3 + 1] = v.y;
        pos[i * 3 + 2] = v.z;
      });
      geoPaq.attributes.position.needsUpdate = true;
      anillos.forEach((anillo, i) => { anillo.rotation.z += s * (0.2 + i * 0.1) * (i % 2 ? -1 : 1); });
      esferaNucleo.rotation.y += s * 0.2;
    },
  };
};

// ---------- estación en órbita ----------

/** La Tierra de noche: océano oscuro, continentes con orilla azul y luces de ciudades. */
function texturaTierra(azar) {
  // 1) manchas de continentes en un lienzo chico
  const chico = document.createElement('canvas');
  chico.width = 256;
  chico.height = 128;
  const m = chico.getContext('2d');
  m.fillStyle = '#000';
  m.fillRect(0, 0, 256, 128);
  m.fillStyle = 'rgba(255,255,255,.35)';
  for (let k = 0; k < 12; k++) {
    const cx = azar() * 256;
    const cy = 22 + azar() * 84;
    const n = 8 + azar() * 18;
    for (let i = 0; i < n; i++) {
      const r = 4 + azar() * 13;
      const x = cx + (azar() - 0.5) * 52;
      const y = cy + (azar() - 0.5) * 30;
      [-256, 0, 256].forEach((dx) => { m.beginPath(); m.arc(x + dx, y, r, 0, Math.PI * 2); m.fill(); });
    }
  }
  // 2) agrandar con desenfoque y decidir qué es tierra
  const W = 1024;
  const H = 512;
  return texturaDe(W, H, (c) => {
    c.filter = 'blur(6px)';
    c.drawImage(chico, 0, 0, W, H);
    c.filter = 'none';
    const img = c.getImageData(0, 0, W, H);
    const d = img.data;
    const tierra = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      const lat = Math.abs(y / H - 0.5) * 2;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const val = d[i];
        let rgb;
        if (val > 150) { rgb = [22, 42, 70]; tierra[y * W + x] = 1; } else if (val > 134) rgb = [60, 120, 200]; // orilla
        else rgb = [6, 18, 44 + Math.round((1 - lat) * 14)];
        d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    // 3) luces de las ciudades (solo en tierra)
    for (let k = 0; k < 9000; k++) {
      const x = Math.floor(azar() * W);
      const y = Math.floor(azar() * H);
      if (!tierra[y * W + x]) continue;
      c.globalAlpha = 0.35 + azar() * 0.65;
      c.fillStyle = azar() < 0.7 ? '#cfe5ff' : '#5AA9FF';
      c.fillRect(x, y, azar() < 0.1 ? 2 : 1, 1);
    }
    c.globalAlpha = 1;
  });
}

/** Un satélite sencillo: cuerpo, dos paneles solares y una antena. */
function crearSatelite(texPanel) {
  const s = new THREE.Group();
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.7), new THREE.MeshBasicMaterial({ color: 0xc9ced6 }));
  const borde = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.5, 0.5, 0.7)), new THREE.LineBasicMaterial({ color: 0x5aa9ff }));
  const panelMat = new THREE.MeshBasicMaterial({ map: texPanel, side: THREE.DoubleSide });
  [-1, 1].forEach((lado) => {
    const brazo = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.04), new THREE.MeshBasicMaterial({ color: 0x8b95a7 }));
    brazo.position.x = lado * 0.45;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.6), panelMat);
    panel.position.x = lado * 1.35;
    panel.rotation.x = -Math.PI / 2;
    s.add(brazo, panel);
  });
  const plato = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.12, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xf2f4f8, side: THREE.DoubleSide }));
  plato.position.y = -0.33;
  const luz = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff5c6c }));
  luz.position.set(0, 0.3, 0.3);
  s.add(cuerpo, borde, plato, luz);
  s.userData.luz = luz;
  return s;
}

AMBIENTES.orbita = (azar) => {
  const grupo = new THREE.Group();
  grupo.add(cieloDe(azar, [[0, '#000000'], [0.5, '#02040a'], [1, '#000000']], { estrellas: 2600, alturaEstrellas: 1, banda: true }));

  // la Tierra abajo y al frente, con su atmósfera brillante en la orilla
  // todo dentro del cielo (radio 150): si no, las estrellas se dibujan encima
  const centro = new THREE.Vector3(-15, -78, -108);
  const tierra = new THREE.Mesh(new THREE.SphereGeometry(80, 96, 64), new THREE.MeshBasicMaterial({ map: texturaTierra(azar), fog: false }));
  tierra.position.copy(centro);
  tierra.rotation.z = 0.35;
  grupo.add(tierra);
  const atmosfera = new THREE.Mesh(
    new THREE.SphereGeometry(83, 96, 64),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float r = pow(1.0 - abs(dot(vN, vV)), 5.0); gl_FragColor = vec4(0.35, 0.66, 1.0, r * 0.75); }',
    }),
  );
  atmosfera.position.copy(centro);
  grupo.add(atmosfera);
  const sol = destello('rgba(200,225,255,.9)', 34, 1);
  sol.position.set(-100, 35, -80);
  grupo.add(sol);

  // satélites que pasan despacio y los enlaces de luz entre ellos
  const texPanel = texturaDe(256, 128, (c, w, h) => {
    c.fillStyle = '#123a72';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(156,199,255,.6)';
    c.lineWidth = 2;
    for (let x = 0; x <= w; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y <= h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  });
  const satelites = [];
  for (let i = 0; i < 7; i++) {
    const s = crearSatelite(texPanel);
    s.userData.orbita = { radio: 17 + azar() * 16, alto: 4 + azar() * 9, fase: azar() * Math.PI * 2, vel: (0.012 + azar() * 0.02) * (i % 2 ? -1 : 1) };
    s.scale.setScalar(0.9 + azar() * 0.8);
    grupo.add(s);
    satelites.push(s);
  }
  // puntos en la Tierra que reciben señal
  // (sobre la cara de la Tierra que se ve: centro + radio hacia el jugador, un poco a los lados)
  const terrestres = [[-0.25, 0.75], [0.1, 0.8], [0.32, 0.7], [-0.45, 0.62]].map(([dx, dy]) => {
    const dir = new THREE.Vector3(dx, dy, 0.55).normalize();
    return centro.clone().add(dir.multiplyScalar(80.4));
  });
  const totalLineas = satelites.length + terrestres.length;
  const pos = new Float32Array(totalLineas * 6);
  const geoEnlace = new THREE.BufferGeometry();
  geoEnlace.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  grupo.add(new THREE.LineSegments(geoEnlace, new THREE.LineBasicMaterial({ color: 0x5aa9ff, transparent: true, opacity: 0.55, fog: false })));
  const pulsos = new Float32Array(totalLineas * 3);
  const geoPulsos = new THREE.BufferGeometry();
  geoPulsos.setAttribute('position', new THREE.BufferAttribute(pulsos, 3));
  grupo.add(new THREE.Points(geoPulsos, materialPuntos(0xffffff, 0.7, 1, { fog: false })));
  terrestres.forEach((p) => {
    const marca = destello('rgba(90,169,255,.9)', 6, 0.9);
    marca.position.copy(p);
    grupo.add(marca);
  });

  // la estación: plataforma bajo el jugador y un barandal de luz
  grupo.add(plataforma(3.2));
  const barandal = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.02, 6, 120), new THREE.MeshBasicMaterial({ color: 0x5aa9ff, transparent: true, opacity: 0.6 }));
  barandal.rotation.x = Math.PI / 2;
  barandal.position.y = 0.75;
  grupo.add(barandal);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const poste = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.75, 0.03), new THREE.MeshBasicMaterial({ color: 0x2f6fbf }));
    poste.position.set(Math.cos(a) * 3.25, 0.375, Math.sin(a) * 3.25);
    grupo.add(poste);
  }

  let tiempo = 0;
  return {
    grupo,
    niebla: { color: 0x000000, cerca: 200, lejos: 600 },
    tick(s) {
      tiempo += s;
      tierra.rotation.y += s * 0.004;
      satelites.forEach((sat, i) => {
        const o = sat.userData.orbita;
        const a = o.fase + tiempo * o.vel;
        sat.position.set(Math.cos(a) * o.radio, o.alto + Math.sin(a * 2) * 0.6, Math.sin(a) * o.radio - 6);
        sat.rotation.y = -a;
        sat.userData.luz.visible = Math.floor(tiempo * 1.5 + i) % 2 === 0;
      });
      // enlaces: cada satélite con el siguiente, y los primeros con la Tierra
      let k = 0;
      const poner = (a, b, f) => {
        pos.set([a.x, a.y, a.z, b.x, b.y, b.z], k * 6);
        pulsos.set([a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, a.z + (b.z - a.z) * f], k * 3);
        k += 1;
      };
      satelites.forEach((sat, i) => poner(sat.position, satelites[(i + 1) % satelites.length].position, (tiempo * 0.4 + i * 0.3) % 1));
      terrestres.forEach((p, i) => poner(satelites[i].position, p, (tiempo * 0.5 + i * 0.25) % 1));
      geoEnlace.attributes.position.needsUpdate = true;
      geoPulsos.attributes.position.needsUpdate = true;
    },
  };
};

// ---------- componentes ----------

/** Pone la niebla del escenario (lineal: así se puede animar en los cambios de escenario). */
function ponerNiebla(escena, niebla) {
  const fog = escena.object3D.fog;
  if (fog && fog.isFog) {
    fog.color.setHex(niebla.color);
    fog.near = niebla.cerca;
    fog.far = niebla.lejos;
  } else {
    escena.object3D.fog = new THREE.Fog(niebla.color, niebla.cerca, niebla.lejos);
  }
}

const SEMILLAS = { circuito: 1971, servidores: 7, futurista: 2026, fibra: 1550, red: 404, orbita: 1957 };

Object.keys(AMBIENTES).forEach((nombre) => {
  AFRAME.registerComponent(`ambiente-${nombre}`, {
    init() {
      this.amb = AMBIENTES[nombre](azarConSemilla(SEMILLAS[nombre]));
      ponerNiebla(this.el.sceneEl, this.amb.niebla);
      this.el.setObject3D('ambiente', this.amb.grupo);
    },
    tick(t, dt) {
      if (this.amb.tick) this.amb.tick(Math.min(dt || 16, 50) / 1000, t / 1000);
    },
  });
});

/** El viaje de un mensaje por la red: un escenario por cada salto. Lo usa la Carrera de palabras. */
window.VIAJE = [
  { ambiente: 'circuito', nombre: 'Tu computadora', detalle: 'El mensaje sale del procesador' },
  { ambiente: 'servidores', nombre: 'Servidores de la escuela', detalle: 'Pasa por el switch y el router' },
  { ambiente: 'futurista', nombre: 'La ciudad conectada', detalle: 'Viaja por la red de la ciudad' },
  { ambiente: 'fibra', nombre: 'Cable de fibra óptica', detalle: 'Corre como pulsos de luz' },
  { ambiente: 'red', nombre: 'Internet', detalle: 'Salta de nodo en nodo' },
  { ambiente: 'orbita', nombre: 'Satélite', detalle: 'Rebota en el espacio y llega a su destino' },
];

AFRAME.registerComponent('ambiente-viaje', {
  init() {
    const raiz = new THREE.Group();
    this.etapas = window.VIAJE.map((e) => {
      const amb = AMBIENTES[e.ambiente](azarConSemilla(SEMILLAS[e.ambiente]));
      amb.grupo.visible = false;
      amb.cielos = [];
      amb.grupo.traverse((o) => { if (o.material && o.material.side === THREE.BackSide && o.geometry && o.geometry.parameters && o.geometry.parameters.radius === 150) amb.cielos.push(o.material); });
      raiz.add(amb.grupo);
      return amb;
    });
    this.el.setObject3D('ambiente', raiz);
    this.actual = 0;
    this.etapas[0].grupo.visible = true;
    ponerNiebla(this.el.sceneEl, this.etapas[0].niebla);
    this.transicion = null;
    window.ambienteViaje = this;
    // compilar todo al principio para que el primer cambio no se trabe
    this.el.sceneEl.addEventListener('renderstart', () => {
      const r = this.el.sceneEl.renderer;
      const cam = this.el.sceneEl.camera;
      if (!r || !cam) return;
      this.etapas.forEach((e) => { e.grupo.visible = true; });
      try { r.compile(this.el.sceneEl.object3D, cam); } catch (err) { /* no pasa nada */ }
      this.etapas.forEach((e, i) => { e.grupo.visible = i === this.actual; });
    }, { once: true });
  },

  /** Cambia al escenario n (con fundido: el mundo se hunde en la oscuridad y sube el nuevo). */
  ir(n) {
    const total = this.etapas.length;
    const destino = ((n % total) + total) % total;
    if (destino === this.actual && !this.transicion) return;
    if (this.transicion) this.terminarTransicion();
    this.transicion = { de: this.actual, a: destino, t: 0, dur: 1.8, cambiado: false };
  },

  terminarTransicion() {
    const tr = this.transicion;
    if (!tr) return;
    this.etapas.forEach((e, i) => {
      e.grupo.visible = i === tr.a;
      e.grupo.position.y = 0;
      e.cielos.forEach((m) => { m.opacity = 1; });
    });
    ponerNiebla(this.el.sceneEl, this.etapas[tr.a].niebla);
    this.actual = tr.a;
    this.transicion = null;
  },

  tick(t, dt) {
    const s = Math.min(dt || 16, 50) / 1000;
    const tr = this.transicion;
    if (tr) {
      tr.t += s;
      const f = Math.min(1, tr.t / tr.dur);
      const suave = (x) => x * x * (3 - 2 * x);
      const fog = this.el.sceneEl.object3D.fog;
      const cerrado = { cerca: 1.9, lejos: 3.2 };
      if (f < 0.5) {
        const k = suave(f / 0.5);
        const de = this.etapas[tr.de];
        fog.near = de.niebla.cerca + (cerrado.cerca - de.niebla.cerca) * k;
        fog.far = de.niebla.lejos + (cerrado.lejos - de.niebla.lejos) * k;
        de.grupo.position.y = -2.5 * k;
        de.cielos.forEach((m) => { m.opacity = 1 - k; });
      } else {
        const a = this.etapas[tr.a];
        if (!tr.cambiado) {
          tr.cambiado = true;
          this.etapas[tr.de].grupo.visible = false;
          this.etapas[tr.de].grupo.position.y = 0;
          a.grupo.visible = true;
          fog.color.setHex(a.niebla.color);
        }
        const k = suave((f - 0.5) / 0.5);
        fog.near = cerrado.cerca + (a.niebla.cerca - cerrado.cerca) * k;
        fog.far = cerrado.lejos + (a.niebla.lejos - cerrado.lejos) * k;
        a.grupo.position.y = 2.5 * (1 - k);
        a.cielos.forEach((m) => { m.opacity = k; });
      }
      if (f >= 1) this.terminarTransicion();
    }
    const visible = this.etapas.filter((e) => e.grupo.visible);
    visible.forEach((e) => { if (e.tick) e.tick(s, t / 1000); });
  },
});
