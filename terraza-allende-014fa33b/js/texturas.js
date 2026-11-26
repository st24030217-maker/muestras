import * as THREE from "three";

/**
 * Crea un CanvasTexture en SRGB (por defecto) o lineal con repetición y anisotropía opcionales.
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
  const rnd = rngSeed(20261125);

  // 1. Grava real del patio y entrada (tonos cálidos/grises triturados)
  const gravelMap = makeCanvas(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#3f3934";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 380; i++) {
      const gx = rnd() * w;
      const gy = rnd() * h;
      const gr = 14 + rnd() * 26;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      const tone = 44 + Math.floor(rnd() * 32);
      g.addColorStop(0, `rgba(${tone + 6},${tone + 2},${tone - 4},0.34)`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }
    for (let i = 0; i < 24000; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = 0.9 + rnd() * 2.9;
      const v = Math.floor(54 + rnd() * 84);
      ctx.fillStyle = `rgb(${v + 8},${v + 2},${v - 4})`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.55 + rnd() * 0.65), rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { repeat: [10, 8] });

  const gravelBump = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const v = Math.floor(30 + rnd() * 210);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 2.5, 2 + rnd() * 2.5);
    }
  }, { srgb: false, repeat: [10, 8] });

  // 2. Carrizo vertical (oscuro entintado para la fachada y natural dorado para el interior)
  function makeCarrizo({ dark = false, repeat = [4, 1] } = {}) {
    return makeCanvas(512, 256, (ctx, w, h) => {
      ctx.fillStyle = dark ? "#141916" : "#221a12";
      ctx.fillRect(0, 0, w, h);
      const stalks = 46;
      const sw = w / stalks;
      for (let i = 0; i < stalks; i++) {
        const sx = i * sw + (rnd() - 0.5) * 1.5;
        const wStalk = sw * (0.72 + rnd() * 0.2);
        const shade = rnd();
        const g = ctx.createLinearGradient(sx, 0, sx + wStalk, 0);
        if (dark) {
          const base = Math.floor(38 + shade * 28);
          g.addColorStop(0, `rgb(${base - 12},${base - 6},${base - 10})`);
          g.addColorStop(0.45, `rgb(${base + 12},${base + 20},${base + 14})`);
          g.addColorStop(1, `rgb(${base - 14},${base - 10},${base - 12})`);
        } else {
          const base = Math.floor(148 + shade * 55);
          g.addColorStop(0, `rgb(${base - 32},${Math.floor((base - 32) * 0.78)},${Math.floor((base - 32) * 0.52)})`);
          g.addColorStop(0.45, `rgb(${Math.min(255, base + 22)},${Math.min(255, Math.floor((base + 22) * 0.84))},${Math.floor((base + 22) * 0.58)})`);
          g.addColorStop(1, `rgb(${base - 38},${Math.floor((base - 38) * 0.76)},${Math.floor((base - 38) * 0.48)})`);
        }
        ctx.fillStyle = g;
        ctx.fillRect(sx, 0, wStalk, h);

        // Nudos horizontales del carrizo
        for (let k = 0; k < 3; k++) {
          const ny = (k * 0.34 + rnd() * 0.25) * h;
          ctx.fillStyle = dark ? "rgba(10,12,10,0.6)" : "rgba(75,52,28,0.45)";
          ctx.fillRect(sx, ny, wStalk, 2.5);
        }
      }
      // Alambres horizontales de amarre
      ctx.fillStyle = dark ? "rgba(255,255,255,0.12)" : "rgba(35,28,22,0.55)";
      for (const wy of [0.22, 0.5, 0.78]) {
        ctx.fillRect(0, wy * h, w, 2.5);
      }
    }, { repeat });
  }

  const carrizoOscuro = makeCarrizo({ dark: true, repeat: [5, 1] });
  const carrizoNatural = makeCarrizo({ dark: false, repeat: [4, 1] });
  const carrizoBump = makeCanvas(256, 128, (ctx, w, h) => {
    for (let x = 0; x < w; x++) {
      const wave = Math.round(127 + Math.sin((x / w) * Math.PI * 46) * 115);
      ctx.fillStyle = `rgb(${wave},${wave},${wave})`;
      ctx.fillRect(x, 0, 1, h);
    }
  }, { srgb: false, repeat: [4, 1] });

  // 3. Lámina acanalada del techo
  const corrugatedBump = makeCanvas(256, 256, (ctx, w, h) => {
    for (let x = 0; x < w; x++) {
      const wave = Math.round(127 + Math.sin((x / w) * Math.PI * 26) * 118);
      ctx.fillStyle = `rgb(${wave},${wave},${wave})`;
      ctx.fillRect(x, 0, 1, h);
    }
  }, { srgb: false, repeat: [8, 2] });

  const corrugatedColor = makeCanvas(256, 256, (ctx, w, h) => {
    for (let x = 0; x < w; x++) {
      const s = Math.sin((x / w) * Math.PI * 26);
      const v = Math.round(58 + s * 18);
      ctx.fillStyle = `rgb(${v + 4},${v + 2},${v})`;
      ctx.fillRect(x, 0, 1, h);
    }
  }, { repeat: [8, 2] });

  // 4. Malla sombra terracota con textura tejida (como en foto interior real)
  const mallaSombraMap = makeCanvas(256, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#a83a24");
    g.addColorStop(0.55, "#c94c31");
    g.addColorStop(1, "#e06243");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
    for (let x = 0; x < w; x += 4) ctx.fillRect(x, 0, 1, h);
    for (let i = 0; i < 18; i++) {
      const sx = rnd() * w;
      const sy = rnd() * h;
      const sr = 18 + rnd() * 28;
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      sg.addColorStop(0, "rgba(255,190,130,0.22)");
      sg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    }
  }, { repeat: [3, 1] });

  // 5. Madera barnizada color miel para mesas cuadradas y repisas
  const woodHoney = makeCanvas(512, 256, (ctx, w, h) => {
    ctx.fillStyle = "#c98541";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      const wave = Math.sin(y * 0.14) * 14 + Math.sin(y * 0.04) * 9 + (rnd() - 0.5) * 14;
      const r = Math.min(255, Math.max(0, 204 + wave));
      const g = Math.min(255, Math.max(0, 134 + wave * 0.72));
      const b = Math.min(255, Math.max(0, 62 + wave * 0.42));
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(0, y, w, 2);
    }
  });

  // Papel a cuadros rojo y blanco para las canastitas de tacos
  const checkeredMap = makeCanvas(128, 128, (ctx, w, h) => {
    const s = 16;
    for (let y = 0; y < h; y += s) {
      for (let x = 0; x < w; x += s) {
        ctx.fillStyle = ((x / s + y / s) % 2 === 0) ? "#dc2626" : "#fff7ed";
        ctx.fillRect(x, y, s, s);
      }
    }
  });

  // 6. Texturas reales recortadas de las fotos de Terraza Allende
  const signFacadeTex = loadPhotoTex("./img/tex-letrero.png");
  const neonWallTex = loadPhotoTex("./img/tex-neon.jpg");
  const loteriaWallTex = loadPhotoTex("./img/tex-loteria.jpg");

  // 7. Carta luminosa de la barra con precios reales de Terraza Allende
  const barMenuBoard = makeCanvas(512, 256, (ctx, w, h) => {
    ctx.fillStyle = "#481417";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.font = "900 72px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("TERRAZA ALLENDE", w / 2, h / 2 + 24);

    ctx.fillStyle = "#f4ebe0";
    ctx.font = "900 26px 'Inter Tight', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("COCTELERÍA & MIXOLOGÍA", 24, 38);
    ctx.fillText("CERVEZA & TINA", 280, 38);
    ctx.fillStyle = "#ff6b3d";
    ctx.fillRect(24, 46, 220, 3);
    ctx.fillRect(280, 46, 200, 3);

    const col1 = [
      ["Cantarito", "$125"],
      ["Perlas Negras", "$120"],
      ["Bloody Mary", "$115"],
      ["Aperol Spritz", "$115"],
      ["Mezcalita", "$110"],
      ["Mojito / Marg.", "$90"],
    ];
    const col2 = [
      ["Tina 5 Cervezas", "$180"],
      ["Caguamón", "$90"],
      ["Clamato Litro", "$70"],
      ["Bohemia", "$55"],
      ["Media Nacional", "$40"],
      ["Michelado", "$30"],
    ];
    ctx.font = "700 18px sans-serif";
    col1.forEach(([n, p], i) => {
      const y = 80 + i * 28;
      ctx.fillStyle = "#f4ebe0";
      ctx.fillText(n, 24, y);
      ctx.fillStyle = "#ffb494";
      ctx.fillText(p, 200, y);
    });
    col2.forEach(([n, p], i) => {
      const y = 80 + i * 28;
      ctx.fillStyle = "#f4ebe0";
      ctx.fillText(n, 280, y);
      ctx.fillStyle = "#ffb494";
      ctx.fillText(p, 444, y);
    });
  });

  // 8. Pantallas de TV en vivo (fútbol animado como en la foto interior real)
  const tvCanvas = document.createElement("canvas");
  tvCanvas.width = 512;
  tvCanvas.height = 288;
  const tvCtx = tvCanvas.getContext("2d");
  const tvScreenMap = new THREE.CanvasTexture(tvCanvas);
  tvScreenMap.colorSpace = THREE.SRGBColorSpace;
  function updateTvScreen(t = 0) {
    const w = 512, h = 288;
    const g = tvCtx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#0f172a");
    g.addColorStop(0.28, "#1e293b");
    g.addColorStop(0.3, "#15803d");
    g.addColorStop(1, "#14532d");
    tvCtx.fillStyle = g;
    tvCtx.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      tvCtx.fillStyle = i % 2 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)";
      tvCtx.fillRect(i * (w / 8), 86, w / 8, h - 86);
    }
    tvCtx.strokeStyle = "rgba(255,255,255,0.6)";
    tvCtx.lineWidth = 3;
    tvCtx.strokeRect(28, 98, w - 56, h - 116);
    tvCtx.beginPath();
    tvCtx.moveTo(w / 2, 98);
    tvCtx.lineTo(w / 2, h - 18);
    tvCtx.stroke();
    tvCtx.beginPath();
    tvCtx.arc(w / 2, 190, 38, 0, Math.PI * 2);
    tvCtx.stroke();
    const bx = w / 2 + Math.sin(t * 1.35) * 98;
    const by = 190 + Math.cos(t * 2.0) * 32;
    tvCtx.fillStyle = "#ffffff";
    tvCtx.beginPath();
    tvCtx.arc(bx, by, 7, 0, Math.PI * 2);
    tvCtx.fill();
    for (let p = 0; p < 6; p++) {
      tvCtx.fillStyle = p < 3 ? "#16a34a" : "#ffffff";
      const px = w / 2 + Math.sin(t * 0.9 + p * 1.25) * 145;
      const py = 142 + (p % 3) * 44;
      tvCtx.beginPath();
      tvCtx.arc(px, py, 8, 0, Math.PI * 2);
      tvCtx.fill();
    }
    tvCtx.fillStyle = "rgba(0,0,0,0.78)";
    tvCtx.fillRect(20, 16, 196, 36);
    tvCtx.fillStyle = "#ef4444";
    tvCtx.beginPath();
    tvCtx.arc(36, 34, 6, 0, Math.PI * 2);
    tvCtx.fill();
    tvCtx.fillStyle = "#ffffff";
    tvCtx.font = "800 18px sans-serif";
    tvCtx.fillText("EN VIVO · 1 - 0", 52, 40);
    tvScreenMap.needsUpdate = true;
  }
  updateTvScreen(0);

  // 9. Enfriador de cerveza con luz azul
  const coolerBlueMap = makeCanvas(192, 320, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#38bdf8");
    g.addColorStop(1, "#1d4ed8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, w - 14, h - 14);
    for (let r = 1; r <= 4; r++) {
      ctx.fillStyle = "rgba(15,23,42,0.85)";
      ctx.fillRect(14, r * 58, w - 28, 5);
      for (let c = 0; c < 6; c++) {
        ctx.fillStyle = c % 2 === 0 ? "#e2e8f0" : "#93c5fd";
        ctx.fillRect(24 + c * 24, r * 58 - 30, 14, 28);
      }
    }
  });

  // 10. Halos cálidos, charcos de luz y haces rasantes sobre el carrizo
  const glowSprite = makeCanvas(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255, 236, 175, 1)");
    g.addColorStop(0.28, "rgba(255, 184, 96, 0.55)");
    g.addColorStop(1, "rgba(255, 130, 50, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  const floorPool = makeCanvas(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255, 195, 120, 0.48)");
    g.addColorStop(0.55, "rgba(255, 140, 75, 0.16)");
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  const wallBeam = makeCanvas(128, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, "rgba(255, 200, 110, 0.78)");
    g.addColorStop(0.45, "rgba(255, 170, 80, 0.25)");
    g.addColorStop(1, "rgba(255, 150, 60, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(w * 0.36, h);
    ctx.lineTo(w * 0.64, h);
    ctx.lineTo(w * 0.96, 0);
    ctx.lineTo(w * 0.04, 0);
    ctx.closePath();
    ctx.fill();
  });

  const tableNumber = (n, tuya) =>
    makeCanvas(128, 128, (ctx, w, h) => {
      ctx.fillStyle = tuya ? "#ff5d38" : "#111113";
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 2 - 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = tuya ? "#ffffff" : "rgba(255,255,255,0.3)";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = tuya ? "#000000" : "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "900 62px 'Inter Tight', 'Arial Black', Arial, sans-serif";
      ctx.fillText(String(n), w / 2, h / 2 + 4);
    });

  return {
    gravelMap,
    gravelBump,
    carrizoOscuro,
    carrizoNatural,
    carrizoBump,
    corrugatedBump,
    corrugatedColor,
    mallaSombraMap,
    woodHoney,
    checkeredMap,
    signFacadeTex,
    neonWallTex,
    loteriaWallTex,
    barMenuBoard,
    tvScreenMap,
    updateTvScreen,
    coolerBlueMap,
    glowSprite,
    floorPool,
    wallBeam,
    tableNumber,
  };
}
