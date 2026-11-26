import * as THREE from "three";

/**
 * Crea un CanvasTexture en sRGB (por defecto) o lineal con repetición y anisotropía.
 */
function makeCanvas(w, h, draw, { srgb = true, repeat = null, anisotropy = 8 } = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = anisotropy;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  tex.needsUpdate = true;
  return tex;
}

function rngSeed(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadPhotoTex(url, { srgb = true, anisotropy = 8 } = {}) {
  const tex = new THREE.TextureLoader().load(url);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createTerrazaTextures() {
  const rnd = rngSeed(20261126);

  // 1. Grava triturada real (tonos piedra lagunera cálida/gris con variación orgánica)
  const gravelMap = makeCanvas(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#3a342f";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 420; i++) {
      const gx = rnd() * w;
      const gy = rnd() * h;
      const gr = 16 + rnd() * 30;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      const tone = 38 + Math.floor(rnd() * 34);
      g.addColorStop(0, `rgba(${tone + 7},${tone + 2},${tone - 4},0.32)`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }
    for (let i = 0; i < 28000; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = 0.8 + rnd() * 2.6;
      const warm = rnd() > 0.45 ? 10 : 0;
      const v = Math.floor(48 + rnd() * 88);
      ctx.fillStyle = `rgb(${v + warm},${v + Math.floor(warm * 0.4)},${Math.max(24, v - 5)})`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.55 + rnd() * 0.6), rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { repeat: [10, 9] });

  const gravelBump = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 11000; i++) {
      const v = Math.floor(24 + rnd() * 218);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(rnd() * w, rnd() * h, 1.8 + rnd() * 2.4, 1.8 + rnd() * 2.4);
    }
  }, { srgb: false, repeat: [10, 9] });

  // 2. Carrizo vertical denso (oscuro entintado verdoso-carbón en fachada, dorado natural adentro)
  function makeCarrizo({ dark = false, repeat = [4, 1] } = {}) {
    return makeCanvas(512, 256, (ctx, w, h) => {
      ctx.fillStyle = dark ? "#0c110f" : "#1c150e";
      ctx.fillRect(0, 0, w, h);
      const stalks = 56;
      const sw = w / stalks;
      for (let i = 0; i < stalks; i++) {
        const sx = i * sw + (rnd() - 0.5) * 1.2;
        const wStalk = sw * (0.76 + rnd() * 0.18);
        const shade = rnd();
        const g = ctx.createLinearGradient(sx, 0, sx + wStalk, 0);
        if (dark) {
          // Carrizo oscuro con sutil matiz verde olivo/carbón como en 3_fachada.jpg
          const base = Math.floor(34 + shade * 30);
          g.addColorStop(0, `rgb(${base - 14},${base - 8},${base - 12})`);
          g.addColorStop(0.42, `rgb(${base + 12},${base + 22},${base + 14})`);
          g.addColorStop(0.75, `rgb(${base + 2},${base + 8},${base + 3})`);
          g.addColorStop(1, `rgb(${base - 16},${base - 10},${base - 14})`);
        } else {
          // Carrizo dorado natural cálido como en 1_interior.jpg y 4_loteria.jpg
          const base = Math.floor(146 + shade * 58);
          g.addColorStop(0, `rgb(${base - 36},${Math.floor((base - 36) * 0.78)},${Math.floor((base - 36) * 0.5)})`);
          g.addColorStop(0.4, `rgb(${Math.min(255, base + 26)},${Math.min(255, Math.floor((base + 26) * 0.85))},${Math.floor((base + 26) * 0.58)})`);
          g.addColorStop(1, `rgb(${base - 40},${Math.floor((base - 40) * 0.75)},${Math.floor((base - 40) * 0.46)})`);
        }
        ctx.fillStyle = g;
        ctx.fillRect(sx, 0, wStalk, h);

        for (let k = 0; k < 3; k++) {
          const ny = (k * 0.34 + rnd() * 0.24) * h;
          ctx.fillStyle = dark ? "rgba(8,10,8,0.65)" : "rgba(68,46,24,0.48)";
          ctx.fillRect(sx, ny, wStalk, 2.4);
          ctx.fillStyle = dark ? "rgba(255,255,255,0.06)" : "rgba(255,235,195,0.22)";
          ctx.fillRect(sx, ny + 2.4, wStalk, 1.2);
        }
      }
      ctx.fillStyle = dark ? "rgba(255,255,255,0.1)" : "rgba(28,22,18,0.6)";
      for (const wy of [0.22, 0.5, 0.78]) {
        ctx.fillRect(0, wy * h, w, 2.2);
      }
    }, { repeat });
  }

  const carrizoOscuro = makeCarrizo({ dark: true, repeat: [5, 1] });
  const carrizoNatural = makeCarrizo({ dark: false, repeat: [4, 1] });
  const carrizoBump = makeCanvas(256, 128, (ctx, w, h) => {
    for (let x = 0; x < w; x++) {
      const wave = Math.round(127 + Math.sin((x / w) * Math.PI * 56) * 118);
      ctx.fillStyle = `rgb(${wave},${wave},${wave})`;
      ctx.fillRect(x, 0, 1, h);
    }
  }, { srgb: false, repeat: [4, 1] });

  // 3. Celosía diagonal de rombos para el muro derecho iluminado (exacto a 3_fachada.jpg)
  const celosiaMap = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "#161412";
    ctx.lineWidth = 5;
    const step = 32;
    for (let i = -h; i <= w + h; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i + h, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }
  }, { repeat: [3.5, 2.2] });

  // 4. Estuco terracota artesanal con textura orgánica (para el arco trasero y murete)
  const stuccoTerracotaMap = makeCanvas(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#b55639";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 650; i++) {
      const x = rnd() * w, y = rnd() * h, r = 10 + rnd() * 34;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const warm = rnd() > 0.5;
      g.addColorStop(0, warm ? "rgba(218,108,72,0.16)" : "rgba(112,42,24,0.14)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 5000; i++) {
      const a = 0.04 + rnd() * 0.06;
      ctx.fillStyle = rnd() > 0.5 ? `rgba(255,210,185,${a})` : `rgba(50,18,10,${a})`;
      ctx.fillRect(rnd() * w, rnd() * h, 2, 2);
    }
  }, { repeat: [2, 2] });

  // 5. Lámina acanalada del techo
  const corrugatedBump = makeCanvas(256, 256, (ctx, w, h) => {
    for (let x = 0; x < w; x++) {
      const wave = Math.round(127 + Math.sin((x / w) * Math.PI * 28) * 120);
      ctx.fillStyle = `rgb(${wave},${wave},${wave})`;
      ctx.fillRect(x, 0, 1, h);
    }
  }, { srgb: false, repeat: [9, 2] });

  const corrugatedColor = makeCanvas(256, 256, (ctx, w, h) => {
    for (let x = 0; x < w; x++) {
      const s = Math.sin((x / w) * Math.PI * 28);
      const v = Math.round(74 + s * 24);
      ctx.fillStyle = `rgb(${v + 6},${v + 2},${v - 2})`;
      ctx.fillRect(x, 0, 1, h);
    }
  }, { repeat: [9, 2] });

  // 6. Malla sombra terracota traslúcida con tejido y sombras suaves de copa de árbol (1_interior.jpg)
  const mallaSombraMap = makeCanvas(512, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#9e331f");
    g.addColorStop(0.5, "#c9492f");
    g.addColorStop(1, "#e26344");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Trama textil fina
    ctx.fillStyle = "rgba(0,0,0,0.13)";
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
    for (let x = 0; x < w; x += 4) ctx.fillRect(x, 0, 1, h);
    // Parches cálidos de luz filtrada y sombras suaves de hojas
    for (let i = 0; i < 32; i++) {
      const sx = rnd() * w, sy = rnd() * h, sr = 22 + rnd() * 44;
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      sg.addColorStop(0, i % 3 === 0 ? "rgba(70,18,10,0.22)" : "rgba(255,196,136,0.24)");
      sg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    }
  }, { repeat: [3, 1] });

  // 7. Madera barnizada color miel con vetas realistas para mesas cuadradas y repisas
  const woodHoney = makeCanvas(512, 256, (ctx, w, h) => {
    ctx.fillStyle = "#c9833b";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      const wave = Math.sin(y * 0.13) * 15 + Math.sin(y * 0.035) * 10 + (rnd() - 0.5) * 12;
      const r = Math.min(255, Math.max(0, 206 + wave));
      const g = Math.min(255, Math.max(0, 132 + wave * 0.72));
      const b = Math.min(255, Math.max(0, 56 + wave * 0.42));
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(0, y, w, 2);
    }
    // Juntas sutiles de duela barnizada
    ctx.fillStyle = "rgba(80,38,12,0.22)";
    for (let py = 64; py < h; py += 64) ctx.fillRect(0, py, w, 1.5);
  });

  // Frente acanalado cálido de la barra (madera/estuco acanalado bajo la tira LED)
  const barFlutedWood = makeCanvas(512, 256, (ctx, w, h) => {
    ctx.fillStyle = "#221915";
    ctx.fillRect(0, 0, w, h);
    const slats = 40;
    const sw = w / slats;
    for (let i = 0; i < slats; i++) {
      const x = i * sw;
      const g = ctx.createLinearGradient(x, 0, x + sw, 0);
      g.addColorStop(0, "#1c1410");
      g.addColorStop(0.25, "#593c28");
      g.addColorStop(0.65, "#462e1e");
      g.addColorStop(1, "#16100d");
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, sw - 1.5, h);
    }
  }, { repeat: [3, 1] });

  // Papel a cuadros rojo y blanco para las canastitas de tacos (2_comida.jpg)
  const checkeredMap = makeCanvas(128, 128, (ctx, w, h) => {
    const s = 16;
    for (let y = 0; y < h; y += s) {
      for (let x = 0; x < w; x += s) {
        ctx.fillStyle = ((x / s + y / s) % 2 === 0) ? "#dc2626" : "#fff7ed";
        ctx.fillRect(x, y, s, s);
      }
    }
  });

  // Rejilla real de aire lavado (1_interior.jpg)
  const acGrillMap = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#d1d5db";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#4b5563";
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(28, 28, w - 56, h - 56);
    for (let y = 36; y < h - 34; y += 12) {
      ctx.fillStyle = "#6b7280";
      ctx.fillRect(34, y, w - 68, 4);
      ctx.fillStyle = "#374151";
      ctx.fillRect(34, y + 4, w - 68, 3);
    }
  });

  // 8. Texturas fotográficas reales perfeccionadas de Terraza Allende
  const signFacadeTex = loadPhotoTex("./img/tex-letrero.png");
  const signFacadeBackTex = loadPhotoTex("./img/tex-letrero-back.png");
  const neonWallTex = loadPhotoTex("./img/tex-neon.jpg");
  const loteriaWallTex = loadPhotoTex("./img/tex-loteria.jpg");

  // 9. Carta luminosa de la barra estilo oficial burdeos 9_menu1.jpg con precios reales
  const barMenuBoard = makeCanvas(1024, 512, (ctx, w, h) => {
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.4, 40, w * 0.5, h * 0.5, w * 0.65);
    bg.addColorStop(0, "#5c1a1e");
    bg.addColorStop(1, "#330c0f");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(243,212,186,0.35)";
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    // Marca de agua central como en el menú oficial
    ctx.fillStyle = "rgba(255,255,255,0.045)";
    ctx.font = "900 132px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("ALLENDE", w / 2, h / 2 + 46);

    ctx.fillStyle = "#f4ebe0";
    ctx.font = "900 38px 'Inter Tight', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TERRAZA ALLENDE · BARRA", w / 2, 66);

    ctx.textAlign = "left";
    ctx.font = "900 28px 'Inter Tight', Arial, sans-serif";
    ctx.fillStyle = "#f4ebe0";
    ctx.fillText("COCTELERÍA & MIXOLOGÍA", 46, 120);
    ctx.fillText("CERVEZA & SERVICIOS", 542, 120);
    ctx.fillStyle = "#ff5d38";
    ctx.fillRect(46, 132, 410, 4);
    ctx.fillRect(542, 132, 420, 4);

    const col1 = [
      ["Cantarito", "$125"],
      ["Perlas Negras", "$120"],
      ["Bloody Mary", "$115"],
      ["Aperol Spritz", "$115"],
      ["Mezcalita Tamarindo", "$110"],
      ["Mojito / Margarita", "$90"],
      ["Paloma", "$80"],
    ];
    const col2 = [
      ["Don Julio 70 (serv.)", "$2,100"],
      ["Buchanans / Et. Negra", "$1,900"],
      ["Tina 5 Cervezas", "$180"],
      ["Carajillo", "$120"],
      ["Caguamón Nacional", "$90"],
      ["Clamato Litro", "$70"],
      ["Media Nacional", "$40"],
    ];
    ctx.font = "700 25px 'Inter', sans-serif";
    col1.forEach(([n, p], i) => {
      const y = 182 + i * 44;
      ctx.fillStyle = "#f4ebe0";
      ctx.textAlign = "left";
      ctx.fillText(n, 46, y);
      ctx.fillStyle = "#ffb99a";
      ctx.textAlign = "right";
      ctx.fillText(p, 456, y);
    });
    col2.forEach(([n, p], i) => {
      const y = 182 + i * 44;
      ctx.fillStyle = "#f4ebe0";
      ctx.textAlign = "left";
      ctx.fillText(n, 542, y);
      ctx.fillStyle = "#ffb99a";
      ctx.textAlign = "right";
      ctx.fillText(p, 962, y);
    });
  });

  // 10. Pantallas de TV en vivo (partido nocturno de fútbol nítido, estilo 1_interior.jpg)
  const tvCanvas = document.createElement("canvas");
  tvCanvas.width = 512;
  tvCanvas.height = 288;
  const tvCtx = tvCanvas.getContext("2d");
  const tvScreenMap = new THREE.CanvasTexture(tvCanvas);
  tvScreenMap.colorSpace = THREE.SRGBColorSpace;
  function updateTvScreen(t = 0) {
    const w = 512, h = 288;
    // Gradas nocturnas iluminadas arriba
    const g = tvCtx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#0b1326");
    g.addColorStop(0.24, "#1e293b");
    g.addColorStop(0.26, "#16803c");
    g.addColorStop(1, "#14532d");
    tvCtx.fillStyle = g;
    tvCtx.fillRect(0, 0, w, h);

    // Franjas de césped cortado
    for (let i = 0; i < 10; i++) {
      tvCtx.fillStyle = i % 2 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
      tvCtx.fillRect(i * (w / 10), 74, w / 10, h - 74);
    }
    // Valla LED publicitaria luminosa
    tvCtx.fillStyle = "#e11d48";
    tvCtx.fillRect(0, 68, w, 10);
    tvCtx.fillStyle = "#facc15";
    tvCtx.fillRect(110, 68, 95, 10);
    tvCtx.fillRect(320, 68, 110, 10);

    // Líneas de cancha
    tvCtx.strokeStyle = "rgba(255,255,255,0.68)";
    tvCtx.lineWidth = 2.6;
    tvCtx.strokeRect(24, 92, w - 48, h - 110);
    tvCtx.beginPath();
    tvCtx.moveTo(w / 2, 92);
    tvCtx.lineTo(w / 2, h - 18);
    tvCtx.stroke();
    tvCtx.beginPath();
    tvCtx.arc(w / 2, 184, 38, 0, Math.PI * 2);
    tvCtx.stroke();

    // Jugadores (verde vs blanco como en 1_interior.jpg)
    for (let p = 0; p < 8; p++) {
      const px = w / 2 + Math.sin(t * 0.72 + p * 1.15) * 165;
      const py = 126 + (p % 4) * 36;
      tvCtx.fillStyle = "rgba(0,0,0,0.35)";
      tvCtx.beginPath();
      tvCtx.ellipse(px, py + 7, 7, 3, 0, 0, Math.PI * 2);
      tvCtx.fill();
      tvCtx.fillStyle = p < 4 ? "#16a34a" : "#f8fafc";
      tvCtx.beginPath();
      tvCtx.arc(px, py, 7, 0, Math.PI * 2);
      tvCtx.fill();
    }
    // Balón
    const bx = w / 2 + Math.sin(t * 1.15) * 110;
    const by = 182 + Math.cos(t * 1.65) * 34;
    tvCtx.fillStyle = "#ffffff";
    tvCtx.beginPath();
    tvCtx.arc(bx, by, 5.5, 0, Math.PI * 2);
    tvCtx.fill();

    // Marcador estilo transmisión TV
    tvCtx.fillStyle = "rgba(10,12,18,0.86)";
    tvCtx.fillRect(16, 14, 214, 34);
    tvCtx.fillStyle = "#ef4444";
    tvCtx.beginPath();
    tvCtx.arc(32, 31, 5.5, 0, Math.PI * 2);
    tvCtx.fill();
    tvCtx.fillStyle = "#ffffff";
    tvCtx.font = "800 17px sans-serif";
    tvCtx.fillText("EN VIVO · MEX 2 - 0", 46, 37);

    tvCtx.fillStyle = "rgba(10,12,18,0.75)";
    tvCtx.fillRect(w - 78, 14, 62, 28);
    tvCtx.fillStyle = "#fb923c";
    tvCtx.font = "900 15px sans-serif";
    tvCtx.fillText("LIVE", w - 65, 34);
    tvScreenMap.needsUpdate = true;
  }
  updateTvScreen(0);

  // 11. Enfriador comercial con puerta de cristal y luz fría azul
  const coolerBlueMap = makeCanvas(256, 384, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#38bdf8");
    g.addColorStop(0.5, "#2563eb");
    g.addColorStop(1, "#1e3a8a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#090d16";
    ctx.lineWidth = 18;
    ctx.strokeRect(9, 9, w - 18, h - 18);
    for (let r = 1; r <= 5; r++) {
      const sy = r * 66;
      ctx.fillStyle = "rgba(9,13,22,0.88)";
      ctx.fillRect(18, sy, w - 36, 6);
      for (let c = 0; c < 6; c++) {
        const bx = 28 + c * 34;
        ctx.fillStyle = c % 3 === 0 ? "#22c55e" : c % 3 === 1 ? "#f59e0b" : "#e2e8f0";
        ctx.fillRect(bx, sy - 38, 16, 36);
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.fillRect(bx + 3, sy - 34, 4, 24);
      }
    }
    // Reflejo diagonal sutil de vidrio
    const rg = ctx.createLinearGradient(0, 0, w, h * 0.5);
    rg.addColorStop(0, "rgba(255,255,255,0.18)");
    rg.addColorStop(0.45, "rgba(255,255,255,0.03)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(18, 18, w - 36, h - 36);
  });

  // 12. Halos cálidos, halo rojo de fachada, charcos de luz y haces rasantes
  const glowSprite = makeCanvas(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255, 244, 198, 1)");
    g.addColorStop(0.24, "rgba(255, 192, 102, 0.58)");
    g.addColorStop(0.6, "rgba(255, 134, 52, 0.14)");
    g.addColorStop(1, "rgba(255, 110, 40, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  const redHaloSprite = makeCanvas(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255, 72, 36, 0.65)");
    g.addColorStop(0.45, "rgba(255, 48, 22, 0.22)");
    g.addColorStop(1, "rgba(255, 30, 10, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  const floorPool = makeCanvas(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255, 198, 124, 0.46)");
    g.addColorStop(0.55, "rgba(255, 142, 74, 0.15)");
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  const wallBeam = makeCanvas(128, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, "rgba(255, 206, 116, 0.84)");
    g.addColorStop(0.42, "rgba(255, 172, 82, 0.28)");
    g.addColorStop(1, "rgba(255, 145, 55, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(w * 0.34, h);
    ctx.lineTo(w * 0.66, h);
    ctx.lineTo(w * 0.98, 0);
    ctx.lineTo(w * 0.02, 0);
    ctx.closePath();
    ctx.fill();
  });

  const tableNumber = (n, tuya) =>
    makeCanvas(128, 128, (ctx, w, h) => {
      ctx.fillStyle = tuya ? "#ff5633" : "rgba(14, 10, 10, 0.88)";
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 2 - 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = tuya ? "#fff5ee" : "rgba(255,235,220,0.38)";
      ctx.lineWidth = tuya ? 6 : 4;
      ctx.stroke();
      ctx.fillStyle = tuya ? "#0b0707" : "#fbf7f3";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "900 58px 'Inter Tight', 'Arial Black', Arial, sans-serif";
      ctx.fillText(String(n), w / 2, h / 2 + 4);
    });

  return {
    gravelMap,
    gravelBump,
    carrizoOscuro,
    carrizoNatural,
    carrizoBump,
    celosiaMap,
    stuccoTerracotaMap,
    corrugatedBump,
    corrugatedColor,
    mallaSombraMap,
    woodHoney,
    barFlutedWood,
    checkeredMap,
    acGrillMap,
    signFacadeTex,
    signFacadeBackTex,
    neonWallTex,
    loteriaWallTex,
    barMenuBoard,
    tvScreenMap,
    updateTvScreen,
    coolerBlueMap,
    glowSprite,
    redHaloSprite,
    floorPool,
    wallBeam,
    tableNumber,
  };
}
