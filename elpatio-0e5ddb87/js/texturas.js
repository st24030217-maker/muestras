import * as THREE from "three";

/**
 * Crea un CanvasTexture nítido en SRGB por defecto, con repetición y anisotropía opcionales.
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

export function createParkTextures() {
  const rnd = rngSeed(20260726);

  // 1. Grava gris triturada realista con variación de sombra y piedritas
  const gravelMap = makeCanvas(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#3c4047";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 420; i++) {
      const gx = rnd() * w;
      const gy = rnd() * h;
      const gr = 14 + rnd() * 26;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      const tone = 42 + Math.floor(rnd() * 34);
      g.addColorStop(0, `rgba(${tone},${tone + 2},${tone + 5},0.32)`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }
    for (let i = 0; i < 24000; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = 0.9 + rnd() * 2.8;
      const v = Math.floor(46 + rnd() * 88);
      ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.55 + rnd() * 0.65), rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { repeat: [12, 9] });

  const gravelBump = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const v = Math.floor(30 + rnd() * 210);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 2.5, 2 + rnd() * 2.5);
    }
  }, { srgb: false, repeat: [12, 9] });

  // 2. Block de concreto pintado crema/gris con sombreado de base y juntas reales
  const blockMap = makeCanvas(512, 256, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#e6e0d5");
    grad.addColorStop(0.75, "#dad3c7");
    grad.addColorStop(1, "#b8b0a3");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const v = 188 + Math.floor(rnd() * 44);
      ctx.fillStyle = `rgba(${v},${v - 4},${v - 10},0.22)`;
      ctx.fillRect(rnd() * w, rnd() * h, 3, 2);
    }
    ctx.strokeStyle = "rgba(85,80,72,0.42)";
    ctx.lineWidth = 2;
    const rows = 8;
    const cols = 6;
    const rh = h / rows;
    const cw = w / cols;
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * rh);
      ctx.lineTo(w, r * rh);
      ctx.stroke();
      if (r < rows) {
        const off = (r % 2) * (cw * 0.5);
        for (let c = 0; c <= cols; c++) {
          const x = (c * cw + off) % w;
          ctx.beginPath();
          ctx.moveTo(x, r * rh);
          ctx.lineTo(x, (r + 1) * rh);
          ctx.stroke();
        }
      }
    }
  }, { repeat: [6, 1.4] });

  // 3. Lámina acanalada negra con micro-brillo industrial
  const corrugatedBump = makeCanvas(256, 256, (ctx, w, h) => {
    for (let x = 0; x < w; x++) {
      const wave = Math.round(127 + Math.sin((x / w) * Math.PI * 26) * 118);
      ctx.fillStyle = `rgb(${wave},${wave},${wave})`;
      ctx.fillRect(x, 0, 1, h);
    }
  }, { srgb: false, repeat: [3, 1] });

  const corrugatedColor = makeCanvas(256, 256, (ctx, w, h) => {
    for (let x = 0; x < w; x++) {
      const s = Math.sin((x / w) * Math.PI * 26);
      const v = Math.round(22 + s * 10);
      ctx.fillStyle = `rgb(${v},${v},${v + 2})`;
      ctx.fillRect(x, 0, 1, h);
    }
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = `rgba(255,255,255,${(rnd() * 0.03).toFixed(3)})`;
      ctx.fillRect(rnd() * w, rnd() * h, 2, 2);
    }
  }, { repeat: [3, 1] });

  // 4. Madera vetas finas (durmientes y cubiertas de mesa barnizadas)
  const woodMap = makeCanvas(512, 256, (ctx, w, h) => {
    ctx.fillStyle = "#7a4b29";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      const wave = Math.sin(y * 0.16) * 14 + Math.sin(y * 0.04) * 10 + (rnd() - 0.5) * 14;
      const r = Math.min(255, Math.max(0, 126 + wave));
      const g = Math.min(255, Math.max(0, 79 + wave * 0.68));
      const b = Math.min(255, Math.max(0, 44 + wave * 0.42));
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(0, y, w, 2);
    }
    // Nudos sutiles de madera
    for (let k = 0; k < 4; k++) {
      const kx = 60 + rnd() * (w - 120);
      const ky = 30 + rnd() * (h - 60);
      ctx.strokeStyle = "rgba(45,24,10,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(kx, ky, 18, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // Madera listones verticales multi-tono (El Duranguense)
  const slatsMap = makeCanvas(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#17120e";
    ctx.fillRect(0, 0, w, h);
    const n = 24;
    const sw = w / n;
    for (let i = 0; i < n; i++) {
      const x = i * sw;
      const base = 152 + Math.floor(rnd() * 48);
      const g = ctx.createLinearGradient(x, 0, x + sw - 4, 0);
      g.addColorStop(0, `rgb(${base - 18},${Math.floor((base - 18) * 0.7)},${Math.floor((base - 18) * 0.44)})`);
      g.addColorStop(0.5, `rgb(${base},${Math.floor(base * 0.72)},${Math.floor(base * 0.46)})`);
      g.addColorStop(1, `rgb(${base - 26},${Math.floor((base - 26) * 0.68)},${Math.floor((base - 26) * 0.42)})`);
      ctx.fillStyle = g;
      ctx.fillRect(x + 2.5, 0, sw - 5, h);
    }
  });

  // 5. Patrón geométrico blanco/negro de barra (Nü / módulo intermedio)
  const arabesqueMap = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#111216";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#f4f1eb";
    ctx.lineWidth = 3;
    const step = 32;
    for (let y = 0; y <= h + step; y += step) {
      for (let x = 0; x <= w + step; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, step * 0.48, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + step * 0.5, y + step * 0.5, step * 0.28, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, { repeat: [2.2, 1] });

  // 6. Concreto cepillado
  const concreteMap = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#6c7077";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 5500; i++) {
      const v = 90 + Math.floor(rnd() * 44);
      ctx.fillStyle = `rgba(${v},${v},${v + 2},0.35)`;
      ctx.fillRect(rnd() * w, rnd() * h, 5, 2);
    }
    ctx.strokeStyle = "rgba(35,38,44,0.28)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
  }, { repeat: [4, 2] });

  // 7. Muro fachada calle ("El" y "Patio" con sombreado de banqueta)
  const wallWord = (word, alignRight = false) =>
    makeCanvas(512, 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#ede8dd");
      g.addColorStop(0.85, "#e5dfd3");
      g.addColorStop(1, "#ccc5b8");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 2400; i++) {
        const v = 212 + Math.floor(rnd() * 30);
        ctx.fillStyle = `rgba(${v},${v - 5},${v - 12},0.22)`;
        ctx.fillRect(rnd() * w, rnd() * h, 3, 3);
      }
      ctx.fillStyle = "#101114";
      ctx.font = `900 ${word.length <= 2 ? 228 : 146}px 'Inter Tight', 'Arial Black', sans-serif`;
      ctx.textBaseline = "bottom";
      ctx.textAlign = alignRight ? "right" : "left";
      ctx.fillText(word, alignRight ? w - 18 : 18, h + 16);
    });

  // 8. Neón "THIS IS MY HAPPY PLACE" sobre concreto pulido
  const happyPlaceMap = makeCanvas(512, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#51545c");
    g.addColorStop(0.5, "#646872");
    g.addColorStop(1, "#454850");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) {
      const v = 60 + Math.floor(rnd() * 45);
      ctx.fillStyle = `rgba(${v},${v},${v},0.22)`;
      ctx.fillRect(rnd() * w, rnd() * h, 4, 4);
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 52px 'Inter', sans-serif";
    ctx.shadowColor = "#fde047";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "#fef08a";
    ctx.fillText("THIS IS MY", w / 2, h * 0.36);
    ctx.fillText("HAPPY PLACE", w / 2, h * 0.66);
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#ffffff";
    ctx.fillText("THIS IS MY", w / 2, h * 0.36);
    ctx.fillText("HAPPY PLACE", w / 2, h * 0.66);
  });

  // 9. Banderines internacionales de The Bar
  const buntingMap = makeCanvas(512, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "#18181b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(w, 4);
    ctx.stroke();
    const colors = ["#ef4444", "#ffffff", "#22c55e", "#eab308", "#2563eb", "#f97316"];
    const count = 16;
    const fw = w / count;
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(i * fw + 2, 4);
      ctx.lineTo((i + 1) * fw - 2, 4);
      ctx.lineTo(i * fw + fw / 2, h - 5);
      ctx.closePath();
      ctx.fill();
    }
  });

  // 10. Pantalla gigante deportiva animable
  const tvCanvas = document.createElement("canvas");
  tvCanvas.width = 512;
  tvCanvas.height = 288;
  const tvCtx = tvCanvas.getContext("2d");
  const tvScreenMap = new THREE.CanvasTexture(tvCanvas);
  tvScreenMap.colorSpace = THREE.SRGBColorSpace;
  function updateTvScreen(t = 0) {
    const w = 512, h = 288;
    const g = tvCtx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#1e3a8a");
    g.addColorStop(0.32, "#0f172a");
    g.addColorStop(0.34, "#16a34a");
    g.addColorStop(1, "#14532d");
    tvCtx.fillStyle = g;
    tvCtx.fillRect(0, 0, w, h);
    // Gradas con luces
    for (let i = 0; i < 24; i++) {
      tvCtx.fillStyle = i % 3 === 0 ? "rgba(255,255,255,0.45)" : "rgba(253,224,71,0.35)";
      tvCtx.fillRect(20 + i * 20, 68 + (i % 2) * 8, 6, 6);
    }
    tvCtx.strokeStyle = "rgba(255,255,255,0.55)";
    tvCtx.lineWidth = 3;
    tvCtx.strokeRect(28, 108, w - 56, h - 128);
    tvCtx.beginPath();
    tvCtx.moveTo(w / 2, 108);
    tvCtx.lineTo(w / 2, h - 20);
    tvCtx.stroke();
    tvCtx.beginPath();
    tvCtx.arc(w / 2, 194, 40, 0, Math.PI * 2);
    tvCtx.stroke();
    // Jugadores / balón en movimiento sutil
    const bx = w / 2 + Math.sin(t * 1.4) * 95;
    const by = 194 + Math.cos(t * 2.1) * 34;
    tvCtx.fillStyle = "#ffffff";
    tvCtx.beginPath();
    tvCtx.arc(bx, by, 7, 0, Math.PI * 2);
    tvCtx.fill();
    for (let p = 0; p < 6; p++) {
      tvCtx.fillStyle = p < 3 ? "#ef4444" : "#facc15";
      const px = w / 2 + Math.sin(t * 0.9 + p * 1.3) * 140;
      const py = 150 + (p % 3) * 42;
      tvCtx.beginPath();
      tvCtx.arc(px, py, 8, 0, Math.PI * 2);
      tvCtx.fill();
    }
    tvCtx.fillStyle = "rgba(0,0,0,0.78)";
    tvCtx.fillRect(20, 16, 190, 36);
    tvCtx.fillStyle = "#ef4444";
    tvCtx.beginPath();
    tvCtx.arc(36, 34, 6, 0, Math.PI * 2);
    tvCtx.fill();
    tvCtx.fillStyle = "#fff";
    tvCtx.font = "800 18px sans-serif";
    tvCtx.fillText("EN VIVO · 2 - 1", 50, 40);
    tvScreenMap.needsUpdate = true;
  }
  updateTvScreen(0);

  // 11. Menús luminosos interiores para ventanas de servicio de cada local
  const makeMenuBoard = (accent, title, items) =>
    makeCanvas(512, 192, (ctx, w, h) => {
      ctx.fillStyle = "#121318";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, w, 38);
      ctx.fillStyle = "#09090b";
      ctx.font = "900 22px sans-serif";
      ctx.fillText(title, 18, 27);
      items.forEach(([name, price], i) => {
        const col = i < 3 ? 0 : 1;
        const row = i % 3;
        const x = 18 + col * 246;
        const y = 78 + row * 42;
        ctx.fillStyle = "#f4f4f5";
        ctx.font = "700 18px sans-serif";
        ctx.fillText(name, x, y);
        ctx.fillStyle = accent;
        ctx.fillText(price, x + 178, y);
      });
    });

  // 12. Letreros luminosos exteriores de cada local
  const signDuranguense = makeCanvas(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 12, w / 2, h / 2, 124);
    g.addColorStop(0, "#a5f3fc");
    g.addColorStop(0.7, "#06b6d4");
    g.addColorStop(1, "#083344");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#ecfeff";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 102, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 132px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("D", w / 2, h / 2 + 6);
  });

  const signYoshito = makeCanvas(512, 192, (ctx, w, h) => {
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    // Emblema circular blanco con silueta ola/pez
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(90, h / 2, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#09090b";
    ctx.beginPath();
    ctx.arc(98, h / 2 - 4, 32, 0.25, Math.PI * 1.45);
    ctx.fill();
    // Barra roja japonesa + caracteres kanji estilizados
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(162, 34, 12, 124);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 66px 'Inter Tight', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("YOSHITO", 192, 84);
    ctx.fillStyle = "#d4d4d8";
    ctx.font = "700 21px sans-serif";
    ctx.fillText("ASIAN FOOD · SUSHI · RAMEN", 194, 136);
  });

  const signCristyTop = makeCanvas(512, 128, (ctx, w, h) => {
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, w, h);
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 46px 'Inter Tight', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GORDITAS CRISTY", w / 2, h / 2);
  });

  const wrapCristyOrange = makeCanvas(512, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#fb923c");
    g.addColorStop(0.55, "#f97316");
    g.addColorStop(1, "#c2410c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Gordita ilustrada a la izquierda como en el vinil real
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.ellipse(98, 148, 72, 54, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#92400e";
    ctx.beginPath();
    ctx.ellipse(98, 142, 56, 36, -0.15, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = "#16a34a";
    ctx.fillRect(62, 126, 68, 10);
    // Tipografía blanca real
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.font = "900 54px sans-serif";
    ctx.fillText("TRADICIÓN", 180, 70);
    ctx.fillText("SABOR", 250, 138);
    ctx.fillText("CALIDAD", 210, 206);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 24px sans-serif";
    ctx.fillText("@gorditascristy", 272, 238);
  });

  const signBurgerBoys = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#fff7ed";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 108, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#dc2626";
    ctx.font = "900 34px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BURGER", w / 2, 74);
    ctx.fillText("BOYS", w / 2, 206);
    ctx.fillStyle = "#d97706";
    ctx.beginPath();
    ctx.arc(w / 2, 128, 38, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#78350f";
    ctx.fillRect(w / 2 - 42, 130, 84, 16);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(w / 2 - 42, 126, 84, 6);
    ctx.fillStyle = "#d97706";
    ctx.fillRect(w / 2 - 38, 146, 76, 14);
  });

  const signTacotes = makeCanvas(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 12, w / 2, h / 2, 122);
    g.addColorStop(0, "#fef9c3");
    g.addColorStop(0.75, "#facc15");
    g.addColorStop(1, "#713f12");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#18181b";
    ctx.font = "900 44px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("TACOTES", w / 2, h / 2 - 12);
    ctx.font = "800 21px sans-serif";
    ctx.fillText("ASADA · PASTOR", w / 2, h / 2 + 30);
  });

  const signNu = makeCanvas(256, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#22d3ee");
    g.addColorStop(1, "#f472b6");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 92px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Nü", w / 2, h / 2 - 12);
    ctx.font = "700 22px sans-serif";
    ctx.fillText("POSTRERÍA", w / 2, h / 2 + 54);
  });

  const signTheBar = makeCanvas(512, 128, (ctx, w, h) => {
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, w, h);
    ctx.shadowColor = "#facc15";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#fde047";
    ctx.font = "italic 900 54px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("the Bar · El Patio", w / 2, h / 2);
  });

  const signPronto = makeCanvas(384, 128, (ctx, w, h) => {
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = "#e4e4e7";
    ctx.font = "800 32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PRÓXIMAMENTE", w / 2, h / 2);
  });

  // 13. Textura calada de silla Acapulco (mapeo UV cilíndrico/cónico: rayos verticales + aro superior)
  const acapulcoWeave = (cordColor) =>
    makeCanvas(256, 128, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = cordColor;
      ctx.lineWidth = 2.4;
      const spokes = 44;
      for (let i = 0; i < spokes; i++) {
        const x = (i / spokes) * w;
        ctx.beginPath();
        ctx.moveTo(x, 6);
        ctx.lineTo(x, h - 8);
        ctx.stroke();
      }
      // Aro superior del asiento y anillo central del fondo
      ctx.fillStyle = "#16171c";
      ctx.fillRect(0, 0, w, 9);
      ctx.fillStyle = cordColor;
      ctx.fillRect(0, h - 10, w, 10);
    });

  // 14. Halo suave para focos Edison y charcos cálidos en el suelo
  const glowSprite = makeCanvas(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255, 232, 165, 1)");
    g.addColorStop(0.28, "rgba(255, 190, 90, 0.55)");
    g.addColorStop(1, "rgba(255, 150, 40, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  const floorPool = makeCanvas(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255, 198, 110, 0.34)");
    g.addColorStop(0.55, "rgba(255, 170, 75, 0.12)");
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  const wallBeam = makeCanvas(128, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, "rgba(255, 212, 128, 0.72)");
    g.addColorStop(0.45, "rgba(255, 195, 100, 0.24)");
    g.addColorStop(1, "rgba(255, 180, 80, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(w * 0.38, h);
    ctx.lineTo(w * 0.62, h);
    g && ctx.lineTo(w * 0.96, 0);
    ctx.lineTo(w * 0.04, 0);
    ctx.closePath();
    ctx.fill();
  });

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

  // Cielo crepuscular realista con degradado de horizonte cálido-azul y estrellas tenues
  const skyDomeMap = makeCanvas(512, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#03060f");
    g.addColorStop(0.5, "#0a1328");
    g.addColorStop(0.78, "#16203a");
    g.addColorStop(0.95, "#252029");
    g.addColorStop(1, "#131018");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = `rgba(255,255,255,${(0.18 + rnd() * 0.55).toFixed(2)})`;
      ctx.fillRect(rnd() * w, rnd() * h * 0.58, 1.5, 1.5);
    }
  });

  return {
    gravelMap,
    gravelBump,
    blockMap,
    corrugatedBump,
    corrugatedColor,
    woodMap,
    slatsMap,
    arabesqueMap,
    concreteMap,
    wallEl: wallWord("El", true),
    wallPatio: wallWord("Patio", false),
    happyPlaceMap,
    buntingMap,
    tvScreenMap,
    updateTvScreen,
    menuDuranguense: makeMenuBoard("#22d3ee", "EL DURANGUENSE · PLATILLOS", [["Caldillo Duranguense", "$120"], ["Plato de Asada", "$150"], ["Asado Rojo", "$130"], ["Discada p/2", "$260"], ["Tacos de Carne", "$32"], ["Frijoles Charros", "$45"]]),
    menuTacotes: makeMenuBoard("#facc15", "TACOTES · AL CARBÓN", [["Taco de Asada", "$28"], ["Taco al Pastor", "$25"], ["Orden de 5", "$120"], ["Gringa Especial", "$70"], ["Quesotaco", "$45"], ["Agua Fresca", "$30"]]),
    menuNu: makeMenuBoard("#f472b6", "NÜ POSTRERÍA · CAFÉ", [["Pastel Chocolate", "$65"], ["Pay de Queso", "$60"], ["Fresas c/Crema", "$55"], ["Americano", "$35"], ["Capuchino", "$50"], ["Frappé Oreo", "$65"]]),
    menuYoshito: makeMenuBoard("#ef4444", "YOSHITO · ROLLOS & ARROZ", [["Rollo California", "$120"], ["Empanizado", "$145"], ["Rollo de la Casa", "$165"], ["Arroz Frito", "$110"], ["Yakimeshi", "$115"], ["Té Helado", "$35"]]),
    menuCristy: makeMenuBoard("#fb923c", "GORDITAS CRISTY · COMAL", [["Chicharrón Verde", "$30"], ["Deshebrada Roja", "$30"], ["Rajas c/Queso", "$30"], ["Frijol c/Queso", "$28"], ["Asado Rojo", "$32"], ["Horchata / Jamaica", "$30"]]),
    menuBurger: makeMenuBoard("#ef4444", "BURGER BOYS · PLANCHA", [["Clásica", "$95"], ["Doble Queso", "$135"], ["Hawaiana", "$115"], ["Papas Francesa", "$50"], ["Aros Cebolla", "$60"], ["Malteada", "$75"]]),
    signDuranguense,
    signYoshito,
    signCristyTop,
    wrapCristyOrange,
    signBurgerBoys,
    signTacotes,
    signNu,
    signTheBar,
    signPronto,
    acapulcoBlack: acapulcoWeave("#18191e"),
    acapulcoCream: acapulcoWeave("#e7dfd1"),
    glowSprite,
    floorPool,
    wallBeam,
    coolerBlueMap,
    skyDomeMap,
  };
}
