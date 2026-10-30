/* CODEXIA · Ghost Network (edición de Enlace VR) · Router humano · los cuartos detrás de cada puerta
 *
 * Cada puerta es un marco de color y, detrás, un cuarto pequeño en 3D (como una casa de muñecas)
 * que se ve a través del marco: el salón con pizarrón y pupitres, la biblioteca con libreros, el
 * planeta con sus conexiones (internet), el cuarto de servidores con luces que parpadean, el
 * laboratorio con matraces que burbujean y el bote de basura. Todo se dibuja con código: paredes
 * pintadas en lienzos (canvas) y muebles con cajas, cilindros y esferas, así carga rápido en el visor.
 *
 * crearCuarto(destino) devuelve un THREE.Group con userData.animar(t) para lo que se mueve.
 */
/* global THREE, azarConSemilla */

const CUARTO = { ancho: 0.8, alto: 0.95, fondo: 0.95, marco: 0.05 };

// ---------- ayudas ----------

function texturaDe(w, h, dibujar) {
  const lienzo = document.createElement('canvas');
  lienzo.width = w;
  lienzo.height = h;
  dibujar(lienzo.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(lienzo);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const plano = (w, h, tex) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
const mate = (color, extra) => new THREE.MeshLambertMaterial(Object.assign({ color }, extra || {}));
const luz = (color, extra) => new THREE.MeshBasicMaterial(Object.assign({ color }, extra || {}));

function bloque(grupo, [w, h, d], [x, y, z], material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  grupo.add(m);
  return m;
}

function cilindro(grupo, [rArriba, rAbajo, h], [x, y, z], material, lados = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rArriba, rAbajo, h, lados), material);
  m.position.set(x, y, z);
  grupo.add(m);
  return m;
}

/** Pared lisa con un poco de sombra en las orillas (da sensación de profundidad sin luces). */
function pared(ctx, w, h, claro, oscuro) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, oscuro);
  g.addColorStop(0.35, claro);
  g.addColorStop(1, oscuro);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function sombraOrillas(ctx, w, h, fuerza = 0.45) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${fuerza})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function losetas(ctx, w, h, lado, a, b, linea) {
  for (let y = 0; y < h; y += lado) {
    for (let x = 0; x < w; x += lado) {
      ctx.fillStyle = ((x + y) / lado) % 2 === 0 ? a : b;
      ctx.fillRect(x, y, lado, lado);
    }
  }
  if (linea) {
    ctx.strokeStyle = linea;
    ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += lado) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += lado) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  }
}

function tablones(ctx, w, h, tonos, azar) {
  const alto = 46;
  for (let y = 0; y < h; y += alto) {
    let x = -azar() * 200;
    while (x < w) {
      const largo = 160 + azar() * 160;
      ctx.fillStyle = tonos[Math.floor(azar() * tonos.length)];
      ctx.fillRect(x, y, largo, alto - 3);
      x += largo + 3;
    }
  }
}

/** Arma la caja del cuarto (fondo, piso, techo y dos paredes) con las texturas que se le den. */
function cascaron(grupo, tex) {
  const { ancho: W, alto: H, fondo: D } = CUARTO;
  const fondo = plano(W, H, tex.fondo);
  fondo.position.set(0, 0, -D);
  const piso = plano(W, D, tex.piso);
  piso.rotation.x = -Math.PI / 2;
  piso.position.set(0, -H / 2, -D / 2);
  const techo = plano(W, D, tex.techo);
  techo.rotation.x = Math.PI / 2;
  techo.position.set(0, H / 2, -D / 2);
  const izq = plano(D, H, tex.izquierda);
  izq.rotation.y = Math.PI / 2;
  izq.position.set(-W / 2, 0, -D / 2);
  const der = plano(D, H, tex.derecha || tex.izquierda);
  der.rotation.y = -Math.PI / 2;
  der.position.set(W / 2, 0, -D / 2);
  grupo.add(fondo, piso, techo, izq, der);
}

/** Marco de la puerta, del color del destino. */
function marcoPuerta(grupo, color) {
  const { ancho: W, alto: H, marco: t } = CUARTO;
  const material = luz(new THREE.Color(color));
  const g = 0.07;
  bloque(grupo, [W + 2 * t, t, g], [0, H / 2 + t / 2, 0], material);
  bloque(grupo, [W + 2 * t, t, g], [0, -H / 2 - t / 2, 0], material);
  bloque(grupo, [t, H, g], [-W / 2 - t / 2, 0, 0], material);
  bloque(grupo, [t, H, g], [W / 2 + t / 2, 0, 0], material);
  // brillo suave alrededor del marco (un rectángulo con hueco, para no tapar el cuarto)
  const borde = 0.13;
  const forma = new THREE.Shape();
  forma.moveTo(-W / 2 - borde, -H / 2 - borde);
  forma.lineTo(W / 2 + borde, -H / 2 - borde);
  forma.lineTo(W / 2 + borde, H / 2 + borde);
  forma.lineTo(-W / 2 - borde, H / 2 + borde);
  forma.closePath();
  const hueco = new THREE.Path();
  hueco.moveTo(-W / 2, -H / 2);
  hueco.lineTo(-W / 2, H / 2);
  hueco.lineTo(W / 2, H / 2);
  hueco.lineTo(W / 2, -H / 2);
  hueco.closePath();
  forma.holes.push(hueco);
  const halo = new THREE.Mesh(
    new THREE.ShapeGeometry(forma),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.2, depthWrite: false }),
  );
  halo.position.z = -0.04;
  grupo.add(halo);
  return halo;
}

const PISO = -CUARTO.alto / 2;

// ---------- cada cuarto ----------

function cuartoSalon(grupo) {
  const azar = azarConSemilla(7);
  cascaron(grupo, {
    fondo: texturaDe(512, 608, (c, w, h) => {
      pared(c, w, h, '#DDE5EE', '#AFC0D2');
      c.fillStyle = '#7F93AB';
      c.fillRect(0, h - 34, w, 34);
      // pizarrón con código escrito con gis
      c.fillStyle = '#7A5A36';
      c.fillRect(44, 150, w - 88, 270);
      c.fillStyle = '#1E4A39';
      c.fillRect(56, 162, w - 112, 246);
      c.fillStyle = 'rgba(255,255,255,.9)';
      c.font = '600 30px "IBM Plex Mono", monospace';
      c.fillText('red = "192.168.1"', 78, 214);
      c.font = '500 26px "IBM Plex Mono", monospace';
      c.fillStyle = 'rgba(255,255,255,.75)';
      c.fillText('if ip.startswith(red):', 78, 262);
      c.fillText('    print("SALÓN")', 78, 300);
      c.fillStyle = 'rgba(255,240,150,.85)';
      c.fillText('# ¡Bienvenidos!', 78, 360);
      c.fillStyle = '#C9B48A';
      c.fillRect(56, 404, w - 112, 12);
      // reloj
      c.fillStyle = '#FFFFFF';
      c.beginPath(); c.arc(w - 82, 82, 40, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#33415C'; c.lineWidth = 6; c.stroke();
      c.beginPath(); c.moveTo(w - 82, 82); c.lineTo(w - 82, 54); c.moveTo(w - 82, 82); c.lineTo(w - 62, 92); c.stroke();
      // banderines
      ['#ff1638', '#F2C14E', '#3DDC97', '#FF7A85', '#B9A6FF'].forEach((col, i) => {
        c.fillStyle = col;
        c.beginPath(); c.moveTo(60 + i * 64, 50); c.lineTo(108 + i * 64, 50); c.lineTo(84 + i * 64, 96); c.fill();
      });
      sombraOrillas(c, w, h, 0.35);
    }),
    piso: texturaDe(512, 608, (c, w, h) => { losetas(c, w, h, 76, '#E7EBF0', '#C9D2DD', 'rgba(80,95,120,.3)'); sombraOrillas(c, w, h, 0.4); }),
    techo: texturaDe(512, 512, (c, w, h) => {
      c.fillStyle = '#E9EDF2'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#FFFFFF'; c.fillRect(150, 160, 212, 190);
      c.strokeStyle = '#B9C4D2'; c.lineWidth = 6; c.strokeRect(150, 160, 212, 190);
      sombraOrillas(c, w, h, 0.4);
    }),
    izquierda: texturaDe(512, 512, (c, w, h) => {
      pared(c, w, h, '#DDE5EE', '#AFC0D2');
      // ventana con cielo
      const g = c.createLinearGradient(0, 110, 0, 330);
      g.addColorStop(0, '#79B8F2'); g.addColorStop(1, '#CFE8FF');
      c.fillStyle = g; c.fillRect(120, 110, 280, 220);
      c.fillStyle = 'rgba(255,255,255,.85)';
      c.beginPath(); c.ellipse(210, 170, 50, 18, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#FFFFFF'; c.lineWidth = 12; c.strokeRect(120, 110, 280, 220);
      c.beginPath(); c.moveTo(260, 110); c.lineTo(260, 330); c.moveTo(120, 220); c.lineTo(400, 220); c.stroke();
      c.fillStyle = '#7F93AB'; c.fillRect(0, h - 30, w, 30);
      sombraOrillas(c, w, h, 0.35);
    }),
    derecha: texturaDe(512, 512, (c, w, h) => {
      pared(c, w, h, '#DDE5EE', '#AFC0D2');
      // tablero de corcho con avisos
      c.fillStyle = '#B98A55'; c.fillRect(110, 120, 300, 210);
      c.strokeStyle = '#6E5233'; c.lineWidth = 10; c.strokeRect(110, 120, 300, 210);
      ['#FFFFFF', '#FFF2A8', '#CDE6FF', '#FFD6DA', '#D9F7E8'].forEach((col, i) => {
        c.fillStyle = col;
        c.save(); c.translate(150 + (i % 3) * 90, 150 + Math.floor(i / 3) * 90); c.rotate((azar() - 0.5) * 0.3);
        c.fillRect(0, 0, 70, 60); c.restore();
      });
      c.fillStyle = '#7F93AB'; c.fillRect(0, h - 30, w, 30);
      sombraOrillas(c, w, h, 0.35);
    }),
  });
  // escritorio del profesor y pupitres en filas
  const madera = mate(0xC79A5B);
  const metal = mate(0x4A5568);
  const silla = mate(0xc8102e);
  bloque(grupo, [0.36, 0.02, 0.13], [0, PISO + 0.2, -0.72], madera);
  bloque(grupo, [0.34, 0.19, 0.11], [0, PISO + 0.095, -0.72], mate(0x8A6A43));
  [[-0.2, -0.42], [0.2, -0.42], [-0.2, -0.2], [0.2, -0.2]].forEach(([x, z]) => {
    bloque(grupo, [0.2, 0.014, 0.11], [x, PISO + 0.15, z], madera);
    bloque(grupo, [0.012, 0.15, 0.012], [x - 0.085, PISO + 0.075, z], metal);
    bloque(grupo, [0.012, 0.15, 0.012], [x + 0.085, PISO + 0.075, z], metal);
    bloque(grupo, [0.12, 0.012, 0.09], [x, PISO + 0.09, z + 0.1], silla);
    bloque(grupo, [0.12, 0.1, 0.012], [x, PISO + 0.145, z + 0.145], silla);
    bloque(grupo, [0.012, 0.09, 0.012], [x, PISO + 0.045, z + 0.1], metal);
    // cuaderno sobre el pupitre
    bloque(grupo, [0.07, 0.006, 0.05], [x - 0.03, PISO + 0.16, z], mate(0xF2F4F8));
  });
}

function cuartoBiblioteca(grupo) {
  const azar = azarConSemilla(19);
  const librero = (c, w, h) => {
    c.fillStyle = '#4A2F1B'; c.fillRect(0, 0, w, h);
    const repisas = 5;
    const alto = h / repisas;
    const tonos = ['#B23A48', '#c8102e', '#3E8E5E', '#E0A53C', '#6C4FA3', '#D9D3C7', '#1F3B5C', '#A35B2E'];
    for (let r = 0; r < repisas; r++) {
      const base = (r + 1) * alto - 14;
      let x = 14;
      while (x < w - 24) {
        const ancho = 12 + azar() * 18;
        const altoLibro = alto * (0.55 + azar() * 0.32);
        c.fillStyle = tonos[Math.floor(azar() * tonos.length)];
        if (azar() < 0.08) {
          // libro inclinado
          c.save(); c.translate(x, base); c.rotate(-0.25); c.fillRect(0, -altoLibro, ancho, altoLibro); c.restore();
          x += ancho + 14;
        } else {
          c.fillRect(x, base - altoLibro, ancho, altoLibro);
          c.fillStyle = 'rgba(255,255,255,.35)';
          c.fillRect(x + 2, base - altoLibro * 0.75, ancho - 4, 3);
          x += ancho + 2;
        }
      }
      c.fillStyle = '#7A5230'; c.fillRect(0, base, w, 14);
    }
    sombraOrillas(c, w, h, 0.5);
  };
  cascaron(grupo, {
    fondo: texturaDe(512, 608, librero),
    izquierda: texturaDe(512, 512, librero),
    derecha: texturaDe(512, 512, librero),
    piso: texturaDe(512, 608, (c, w, h) => { tablones(c, w, h, ['#8A5A34', '#7B4F2D', '#94643C'], azar); sombraOrillas(c, w, h, 0.5); }),
    techo: texturaDe(256, 256, (c, w, h) => { c.fillStyle = '#3A2716'; c.fillRect(0, 0, w, h); sombraOrillas(c, w, h, 0.4); }),
  });
  // mesa de lectura, sillas, libros abiertos y lámpara encendida
  const madera = mate(0x7A4E2A);
  bloque(grupo, [0.42, 0.02, 0.22], [0, PISO + 0.17, -0.45], madera);
  [[-0.19, -0.1], [0.19, -0.1], [-0.19, 0.1], [0.19, 0.1]].forEach(([dx, dz]) => bloque(grupo, [0.02, 0.17, 0.02], [dx, PISO + 0.085, -0.45 + dz], madera));
  [-0.12, 0.12].forEach((x) => {
    bloque(grupo, [0.1, 0.012, 0.09], [x, PISO + 0.1, -0.22], mate(0x5C3A1F));
    bloque(grupo, [0.1, 0.1, 0.012], [x, PISO + 0.155, -0.18], mate(0x5C3A1F));
  });
  bloque(grupo, [0.1, 0.008, 0.07], [-0.1, PISO + 0.185, -0.42], mate(0xF4EBD8));
  [[0.12, 0xB23A48], [0.12, 0xc8102e], [0.12, 0xE0A53C]].forEach(([x, col], i) => bloque(grupo, [0.08, 0.018, 0.06], [x, PISO + 0.19 + i * 0.019, -0.47], mate(col)));
  cilindro(grupo, [0.006, 0.006, 0.12], [0.05, PISO + 0.24, -0.52], mate(0x2B2B2B));
  const pantalla = cilindro(grupo, [0.025, 0.05, 0.05], [0.05, PISO + 0.31, -0.52], luz(0xFFE3A3));
  grupo.userData.lampara = pantalla;
}

function cuartoInternet(grupo) {
  const azar = azarConSemilla(5);
  const estrellas = (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#050914'); g.addColorStop(1, '#160a0d');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      c.globalAlpha = 0.3 + azar() * 0.7;
      c.fillStyle = azar() < 0.2 ? '#ff8a9a' : '#FFFFFF';
      const s = azar() < 0.1 ? 3 : 1.6;
      c.fillRect(azar() * w, azar() * h, s, s);
    }
    c.globalAlpha = 1;
  };
  cascaron(grupo, {
    fondo: texturaDe(512, 608, estrellas),
    izquierda: texturaDe(512, 512, estrellas),
    derecha: texturaDe(512, 512, estrellas),
    techo: texturaDe(512, 512, estrellas),
    piso: texturaDe(512, 608, estrellas),
  });
  // planeta con continentes, una malla de luz y conexiones que lo rodean
  const mapa = texturaDe(1024, 512, (c, w, h) => {
    c.fillStyle = '#123E7A'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#3E9E74';
    for (let i = 0; i < 26; i++) {
      const x = azar() * w;
      const y = h * 0.15 + azar() * h * 0.7;
      for (let k = 0; k < 7; k++) {
        c.beginPath();
        c.ellipse(x + (azar() - 0.5) * 120, y + (azar() - 0.5) * 60, 20 + azar() * 60, 14 + azar() * 34, azar() * 3, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.fillStyle = 'rgba(255,214,120,.95)';
    for (let i = 0; i < 90; i++) c.fillRect(azar() * w, h * 0.2 + azar() * h * 0.6, 4, 4);
  });
  const centro = new THREE.Vector3(0, 0, -0.52);
  const planeta = new THREE.Mesh(new THREE.SphereGeometry(0.2, 40, 24), new THREE.MeshBasicMaterial({ map: mapa }));
  planeta.position.copy(centro);
  const malla = new THREE.Mesh(new THREE.SphereGeometry(0.212, 18, 12), new THREE.MeshBasicMaterial({ color: 0xff1638, wireframe: true, transparent: true, opacity: 0.35 }));
  malla.position.copy(centro);
  const atmosfera = new THREE.Mesh(new THREE.SphereGeometry(0.235, 32, 16), new THREE.MeshBasicMaterial({ color: 0xff1638, transparent: true, opacity: 0.12, depthWrite: false }));
  atmosfera.position.copy(centro);
  grupo.add(planeta, malla, atmosfera);
  // arcos de conexión entre ciudades
  const arcos = new THREE.Group();
  arcos.position.copy(centro);
  for (let i = 0; i < 7; i++) {
    const a = new THREE.Vector3().setFromSphericalCoords(0.2, 0.5 + azar() * 2.1, azar() * Math.PI * 2);
    const b = new THREE.Vector3().setFromSphericalCoords(0.2, 0.5 + azar() * 2.1, azar() * Math.PI * 2);
    const medio = a.clone().add(b).normalize().multiplyScalar(0.33);
    const curva = new THREE.QuadraticBezierCurve3(a, medio, b);
    arcos.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curva.getPoints(24)), new THREE.LineBasicMaterial({ color: i % 2 ? 0xF2F4F8 : 0xff1638, transparent: true, opacity: 0.8 })));
  }
  grupo.add(arcos);
  // satélites en órbita
  const satelites = [0, 1, 2].map((i) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.012), luz(0xF2F4F8));
    s.userData = { radio: 0.3 + i * 0.03, vel: 0.6 + i * 0.25, fase: i * 2, inclina: 0.4 + i * 0.5 };
    grupo.add(s);
    return s;
  });
  grupo.userData.animar = (t) => {
    const s = t / 1000;
    planeta.rotation.y = s * 0.25;
    malla.rotation.y = s * 0.25;
    arcos.rotation.y = s * 0.25;
    satelites.forEach((sat) => {
      const u = sat.userData;
      const ang = s * u.vel + u.fase;
      sat.position.set(centro.x + Math.cos(ang) * u.radio, centro.y + Math.sin(ang) * u.radio * Math.sin(u.inclina), centro.z + Math.sin(ang) * u.radio * Math.cos(u.inclina) * 0.6);
    });
  };
}

function cuartoServidores(grupo) {
  const azar = azarConSemilla(23);
  const paredOscura = (c, w, h) => {
    pared(c, w, h, '#1A2638', '#0B111C');
    c.strokeStyle = 'rgba(127,209,199,.35)';
    c.lineWidth = 6;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(0, 60 + i * 18); c.lineTo(w, 60 + i * 18); c.stroke(); }
    sombraOrillas(c, w, h, 0.5);
  };
  cascaron(grupo, {
    fondo: texturaDe(512, 608, paredOscura),
    izquierda: texturaDe(512, 512, paredOscura),
    derecha: texturaDe(512, 512, paredOscura),
    piso: texturaDe(512, 608, (c, w, h) => {
      losetas(c, w, h, 64, '#5B6B80', '#56667A', '#2B3545');
      c.fillStyle = 'rgba(20,30,45,.6)';
      for (let y = 16; y < h; y += 64) for (let x = 16; x < w; x += 64) for (let k = 0; k < 9; k++) c.fillRect(x + (k % 3) * 12, y + Math.floor(k / 3) * 12, 5, 5);
      sombraOrillas(c, w, h, 0.5);
    }),
    techo: texturaDe(256, 256, (c, w, h) => {
      c.fillStyle = '#0B111C'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#BFE9FF'; c.fillRect(110, 0, 36, h);
    }),
  });
  // racks con luces; las luces parpadean
  const frente = texturaDe(128, 384, (c, w, h) => {
    c.fillStyle = '#121A26'; c.fillRect(0, 0, w, h);
    for (let y = 8; y < h - 8; y += 22) {
      c.fillStyle = '#1F2B3D'; c.fillRect(8, y, w - 16, 18);
      c.fillStyle = '#0A0F17';
      for (let x = 40; x < w - 14; x += 8) c.fillRect(x, y + 5, 4, 8);
    }
    c.strokeStyle = '#3A4A60'; c.lineWidth = 4; c.strokeRect(2, 2, w - 4, h - 4);
  });
  const cuerpo = mate(0x161F2C);
  const leds = [];
  const colores = [0x3DDC97, 0xff1638, 0x3DDC97, 0xF2C14E];
  const rack = (x, z, girar) => {
    const g = new THREE.Group();
    bloque(g, [0.16, 0.62, 0.2], [0, 0, 0], cuerpo);
    const cara = plano(0.15, 0.6, frente);
    cara.position.z = 0.101;
    g.add(cara);
    for (let i = 0; i < 12; i++) {
      const led = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.008), luz(colores[i % colores.length]));
      led.position.set(-0.05, 0.27 - i * 0.047, 0.103);
      led.userData = { fase: azar() * 10, vel: 2 + azar() * 6 };
      g.add(led);
      leds.push(led);
    }
    g.position.set(x, PISO + 0.31, z);
    g.rotation.y = girar;
    grupo.add(g);
  };
  [-0.75, -0.5].forEach((z) => { rack(-0.29, z, Math.PI / 2); rack(0.29, z, -Math.PI / 2); });
  rack(0, -0.83, 0);
  // cables en el techo y una franja de luz fría en el pasillo
  [-0.12, 0, 0.12].forEach((x, i) => bloque(grupo, [0.012, 0.012, 0.9], [x, CUARTO.alto / 2 - 0.05, -0.47], luz([0xff1638, 0x7FD1C7, 0xF2F4F8][i])));
  const franja = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.85), luz(0x7FD1C7, { transparent: true, opacity: 0.5 }));
  franja.rotation.x = -Math.PI / 2;
  franja.position.set(0, PISO + 0.003, -0.45);
  grupo.add(franja);
  grupo.userData.animar = (t) => {
    const s = t / 1000;
    leds.forEach((led) => { led.visible = Math.sin(s * led.userData.vel + led.userData.fase) > -0.3; });
  };
}

function cuartoLaboratorio(grupo) {
  const azar = azarConSemilla(31);
  cascaron(grupo, {
    fondo: texturaDe(512, 608, (c, w, h) => {
      losetas(c, w, h, 48, '#EEF2F6', '#E6EBF1', 'rgba(150,165,185,.45)');
      // tabla periódica en la pared
      c.fillStyle = '#FFFFFF'; c.fillRect(66, 100, w - 132, 230);
      c.strokeStyle = '#6C7A90'; c.lineWidth = 4; c.strokeRect(66, 100, w - 132, 230);
      const tonos = ['#B9A6FF', '#ff1638', '#3DDC97', '#F2C14E', '#FF9AA5', '#9DB8FF'];
      const columnas = 18;
      const lado = (w - 160) / columnas;
      for (let fila = 0; fila < 7; fila++) {
        for (let col = 0; col < columnas; col++) {
          const hueco = fila === 0 && col > 0 && col < 17;
          const hueco2 = (fila === 1 || fila === 2) && col > 1 && col < 12;
          if (hueco || hueco2) continue;
          c.fillStyle = tonos[(col + fila * 2) % tonos.length];
          c.fillRect(80 + col * lado, 118 + fila * lado * 1.05, lado - 3, lado - 3);
        }
      }
      c.fillStyle = '#33415C'; c.font = '700 22px "Space Grotesk", sans-serif'; c.fillText('TABLA PERIÓDICA', 80, 316);
      sombraOrillas(c, w, h, 0.35);
    }),
    izquierda: texturaDe(512, 512, (c, w, h) => {
      losetas(c, w, h, 48, '#EEF2F6', '#E6EBF1', 'rgba(150,165,185,.45)');
      // repisa con frascos
      ['#7A5230'].forEach((col) => { c.fillStyle = col; c.fillRect(40, 250, w - 80, 14); c.fillRect(40, 140, w - 80, 14); });
      for (let r = 0; r < 2; r++) {
        for (let i = 0; i < 7; i++) {
          const x = 60 + i * 60;
          const base = r ? 250 : 140;
          c.fillStyle = ['#B9A6FF', '#3DDC97', '#FF9AA5', '#ff1638', '#F2C14E'][Math.floor(azar() * 5)];
          c.fillRect(x, base - 60, 34, 60);
          c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(x + 4, base - 56, 6, 50);
          c.fillStyle = '#4A5568'; c.fillRect(x + 6, base - 72, 22, 12);
        }
      }
      sombraOrillas(c, w, h, 0.35);
    }),
    derecha: texturaDe(512, 512, (c, w, h) => {
      losetas(c, w, h, 48, '#EEF2F6', '#E6EBF1', 'rgba(150,165,185,.45)');
      // letrero de seguridad
      c.fillStyle = '#F2C14E'; c.beginPath(); c.moveTo(256, 120); c.lineTo(356, 290); c.lineTo(156, 290); c.closePath(); c.fill();
      c.strokeStyle = '#1A1A1A'; c.lineWidth = 10; c.stroke();
      c.fillStyle = '#1A1A1A'; c.font = '800 110px "Space Grotesk", sans-serif'; c.textAlign = 'center'; c.fillText('!', 256, 278);
      sombraOrillas(c, w, h, 0.35);
    }),
    piso: texturaDe(512, 608, (c, w, h) => { losetas(c, w, h, 64, '#9AA8BA', '#8E9CAF', 'rgba(60,70,90,.35)'); sombraOrillas(c, w, h, 0.45); }),
    techo: texturaDe(256, 256, (c, w, h) => { c.fillStyle = '#E9EDF2'; c.fillRect(0, 0, w, h); c.fillStyle = '#FFFFFF'; c.fillRect(70, 60, 116, 136); sombraOrillas(c, w, h, 0.4); }),
  });
  // mesa de laboratorio con matraces de colores que burbujean
  bloque(grupo, [0.56, 0.025, 0.24], [0, PISO + 0.2, -0.5], mate(0x2B3545));
  bloque(grupo, [0.54, 0.19, 0.22], [0, PISO + 0.095, -0.5], mate(0xDCE3EA));
  const vidrio = new THREE.MeshLambertMaterial({ color: 0xDDEFFF, transparent: true, opacity: 0.35 });
  const burbujas = [];
  [[-0.17, 0xB9A6FF], [0, 0x3DDC97], [0.17, 0xFF7A85]].forEach(([x, col], i) => {
    const y0 = PISO + 0.2125;
    cilindro(grupo, [0.012, 0.055, 0.09], [x, y0 + 0.045, -0.5], vidrio, 24);
    cilindro(grupo, [0.03, 0.054, 0.045], [x, y0 + 0.023, -0.5], luz(col), 24);
    cilindro(grupo, [0.012, 0.012, 0.05], [x, y0 + 0.115, -0.5], vidrio, 12);
    for (let k = 0; k < 4; k++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), luz(col, { transparent: true, opacity: 0.85 }));
      b.userData = { x, y0: y0 + 0.05, fase: k * 0.25 + i * 0.13 };
      grupo.add(b);
      burbujas.push(b);
    }
  });
  // gradilla con tubos de ensayo
  bloque(grupo, [0.12, 0.01, 0.04], [0.08, PISO + 0.24, -0.6], mate(0x7A5230));
  [0.04, 0.07, 0.1, 0.13].forEach((x, i) => cilindro(grupo, [0.006, 0.006, 0.07], [x, PISO + 0.25, -0.6], luz([0xff1638, 0xF2C14E, 0x3DDC97, 0xB9A6FF][i]), 10));
  // banco
  cilindro(grupo, [0.045, 0.045, 0.012], [-0.12, PISO + 0.13, -0.28], mate(0xc8102e));
  cilindro(grupo, [0.008, 0.008, 0.13], [-0.12, PISO + 0.065, -0.28], mate(0x4A5568), 8);
  grupo.userData.animar = (t) => {
    const s = t / 1000;
    burbujas.forEach((b) => {
      const f = (s * 0.6 + b.userData.fase) % 1;
      b.position.set(b.userData.x + Math.sin(f * 12) * 0.004, b.userData.y0 + f * 0.16, -0.5);
      b.scale.setScalar(0.6 + f * 0.8);
    });
  };
}

function cuartoBasura(grupo) {
  const azar = azarConSemilla(41);
  const concreto = (c, w, h) => {
    pared(c, w, h, '#4A4F58', '#24272D');
    for (let i = 0; i < 400; i++) {
      c.fillStyle = `rgba(0,0,0,${azar() * 0.25})`;
      c.fillRect(azar() * w, azar() * h, 2 + azar() * 4, 2 + azar() * 4);
    }
    // franja de precaución
    c.save();
    c.beginPath(); c.rect(0, h - 90, w, 50); c.clip();
    for (let x = -60; x < w + 60; x += 50) {
      c.fillStyle = '#F2C14E';
      c.beginPath(); c.moveTo(x, h - 40); c.lineTo(x + 25, h - 40); c.lineTo(x + 75, h - 90); c.lineTo(x + 50, h - 90); c.fill();
    }
    c.restore();
    sombraOrillas(c, w, h, 0.55);
  };
  cascaron(grupo, {
    fondo: texturaDe(512, 608, (c, w, h) => {
      concreto(c, w, h);
      c.strokeStyle = '#FF5C6C'; c.lineWidth = 26; c.lineCap = 'round';
      c.beginPath(); c.moveTo(186, 110); c.lineTo(326, 250); c.moveTo(326, 110); c.lineTo(186, 250); c.stroke();
      c.fillStyle = '#F2F4F8'; c.font = '700 30px "Space Grotesk", sans-serif'; c.textAlign = 'center';
      c.fillText('DIRECCIÓN NO VÁLIDA', w / 2, 310);
      c.fillStyle = '#AEB6C4'; c.font = '500 24px "IBM Plex Mono", monospace';
      c.fillText('número > 255', w / 2, 348);
    }),
    izquierda: texturaDe(512, 512, concreto),
    derecha: texturaDe(512, 512, concreto),
    piso: texturaDe(512, 608, (c, w, h) => {
      c.fillStyle = '#34383F'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(0,0,0,${azar() * 0.3})`; c.fillRect(azar() * w, azar() * h, 3 + azar() * 8, 3 + azar() * 8); }
      sombraOrillas(c, w, h, 0.55);
    }),
    techo: texturaDe(256, 256, (c, w, h) => { c.fillStyle = '#1C1F24'; c.fillRect(0, 0, w, h); }),
  });
  // bote de basura grande con la tapa abierta y papeles arrugados
  const gris = mate(0x5B6472);
  cilindro(grupo, [0.12, 0.1, 0.3], [0, PISO + 0.15, -0.55], gris, 24);
  const borde = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.008, 8, 32), mate(0x3A414D));
  borde.rotation.x = Math.PI / 2;
  borde.position.set(0, PISO + 0.3, -0.55);
  grupo.add(borde);
  const tapa = cilindro(grupo, [0.125, 0.125, 0.012], [0, PISO + 0.33, -0.66], mate(0x3A414D), 24);
  tapa.rotation.x = -1.1;
  const papel = mate(0xE8E8E2, { flatShading: true });
  const papeles = [];
  for (let i = 0; i < 9; i++) {
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.025 + azar() * 0.015, 0), papel);
    const dentro = i < 3;
    p.position.set(dentro ? (azar() - 0.5) * 0.12 : (azar() - 0.5) * 0.6, dentro ? PISO + 0.31 : PISO + 0.025, dentro ? -0.55 + (azar() - 0.5) * 0.1 : -0.2 - azar() * 0.6);
    p.rotation.set(azar() * 3, azar() * 3, azar() * 3);
    grupo.add(p);
    papeles.push(p);
  }
  // un paquete roto (como los que no tienen dirección válida)
  const roto = bloque(grupo, [0.07, 0.07, 0.07], [0.22, PISO + 0.035, -0.4], new THREE.MeshLambertMaterial({ color: 0xFF5C6C, transparent: true, opacity: 0.8 }));
  roto.rotation.set(0.3, 0.6, 0.2);
  grupo.userData.animar = (t) => {
    const s = t / 1000;
    papeles.slice(0, 3).forEach((p, i) => { p.rotation.y = s * 0.4 + i; });
  };
}

const CUARTOS = {
  salon: cuartoSalon,
  biblioteca: cuartoBiblioteca,
  internet: cuartoInternet,
  servidores: cuartoServidores,
  laboratorio: cuartoLaboratorio,
  basura: cuartoBasura,
};

/** Puerta completa: marco de color + cuarto 3D detrás. */
function crearCuarto(destino) {
  const grupo = new THREE.Group();
  const interior = new THREE.Group();
  (CUARTOS[destino.icono] || cuartoSalon)(interior);
  grupo.add(interior);
  const halo = marcoPuerta(grupo, destino.color);
  grupo.userData = {
    halo,
    animar: interior.userData.animar || null,
    lampara: interior.userData.lampara || null,
  };
  return grupo;
}
