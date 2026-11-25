import * as THREE from "three";
import { RoomEnvironment } from "./RoomEnvironment.js";

/**
 * Terraza Allende (Gómez Palacio) en 3D. Modelo de ejemplo: no conocemos el lugar por dentro.
 * Terraza con piso de madera, pérgola, guirnaldas de focos, barra con letrero luminoso, parrilla,
 * pantalla, macetas y 12 mesas numeradas; la mesa del QR se marca como "Tu mesa".
 * Misma API que el mapa de El Patio: setInteractive, setPreset, selectLocal, clearSelection, setPinLabels, setWeather.
 */
const TERRACOTA = 0xff7a45;

function lienzo(w, h, dibujar) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  dibujar(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function texturas() {
  const azar = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const madera = lienzo(512, 512, (x, w, h) => {
    const n = 8, alto = h / n;
    for (let i = 0; i < n; i++) {
      const tono = 92 + azar() * 34;
      x.fillStyle = `rgb(${tono + 40}, ${tono * 0.62}, ${tono * 0.36})`;
      x.fillRect(0, i * alto, w, alto);
      for (let k = 0; k < 26; k++) {
        x.strokeStyle = `rgba(40,20,8,${0.08 + azar() * 0.12})`;
        x.lineWidth = 1 + azar() * 1.5;
        const y = i * alto + azar() * alto;
        x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(w * 0.3, y + azar() * 6 - 3, w * 0.6, y + azar() * 6 - 3, w, y); x.stroke();
      }
      x.fillStyle = "rgba(20,10,4,.75)";
      x.fillRect(0, i * alto, w, 3);
      const corte = azar() * w;
      x.fillRect(corte, i * alto, 3, alto);
    }
  });
  madera.wrapS = madera.wrapT = THREE.RepeatWrapping;
  madera.repeat.set(5, 4);

  const ladrillo = lienzo(512, 256, (x, w, h) => {
    x.fillStyle = "#3a2a22"; x.fillRect(0, 0, w, h);
    const bw = 64, bh = 24;
    for (let r = 0; r < h / bh; r++) {
      for (let c = -1; c < w / bw + 1; c++) {
        const ox = (r % 2) * (bw / 2);
        const t = 120 + azar() * 50;
        x.fillStyle = `rgb(${t + 40}, ${t * 0.55}, ${t * 0.38})`;
        x.fillRect(c * bw + ox + 2, r * bh + 2, bw - 4, bh - 4);
      }
    }
  });
  ladrillo.wrapS = ladrillo.wrapT = THREE.RepeatWrapping;

  const letrero = lienzo(1024, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.textAlign = "center"; x.textBaseline = "middle";
    x.font = "900 128px 'Inter Tight', 'Arial Black', Arial, sans-serif";
    x.shadowColor = "#ff7a45"; x.shadowBlur = 34;
    x.fillStyle = "#ffb08a";
    x.fillText("TERRAZA ALLENDE", w / 2, h / 2 + 6);
    x.shadowBlur = 8; x.fillStyle = "#fff1e8";
    x.fillText("TERRAZA ALLENDE", w / 2, h / 2 + 6);
  });

  const parrillaTxt = lienzo(512, 128, (x, w, h) => {
    x.fillStyle = "#0b0907"; x.fillRect(0, 0, w, h);
    x.textAlign = "center"; x.textBaseline = "middle";
    x.font = "900 72px 'Inter Tight', 'Arial Black', Arial, sans-serif";
    x.fillStyle = "#ff7a45"; x.fillText("PARRILLA", w / 2, h / 2 + 4);
  });

  const pantalla = lienzo(512, 288, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#1f7a3a"); g.addColorStop(1, "#155c2b");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.05)"; x.fillRect(i * w / 8, 0, w / 8, h); }
    x.strokeStyle = "rgba(255,255,255,.8)"; x.lineWidth = 3;
    x.strokeRect(24, 24, w - 48, h - 48);
    x.beginPath(); x.moveTo(w / 2, 24); x.lineTo(w / 2, h - 24); x.stroke();
    x.beginPath(); x.arc(w / 2, h / 2, 40, 0, Math.PI * 2); x.stroke();
    x.strokeRect(24, h / 2 - 60, 60, 120); x.strokeRect(w - 84, h / 2 - 60, 60, 120);
    x.fillStyle = "#000000b0"; x.fillRect(16, 14, 150, 30);
    x.fillStyle = "#fff"; x.font = "800 18px Arial"; x.textBaseline = "middle"; x.fillText("EN VIVO  1 - 0", 26, 29);
    x.fillStyle = "#ff3b30"; x.beginPath(); x.arc(w - 40, 30, 8, 0, Math.PI * 2); x.fill();
  });

  const brillo = lienzo(64, 64, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,220,170,.55)"); g.addColorStop(1, "rgba(255,180,120,0)");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });

  const charco = lienzo(128, 128, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255,190,120,.9)"); g.addColorStop(1, "rgba(255,170,100,0)");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });

  const numero = (n, tuya) => lienzo(128, 128, (x, w, h) => {
    x.fillStyle = tuya ? "#ff7a45" : "#111";
    x.beginPath(); x.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2); x.fill();
    x.fillStyle = tuya ? "#000" : "#fff";
    x.textAlign = "center"; x.textBaseline = "middle";
    x.font = "900 64px 'Inter Tight', 'Arial Black', Arial, sans-serif";
    x.fillText(String(n), w / 2, h / 2 + 4);
  });

  return { madera, ladrillo, letrero, parrillaTxt, pantalla, brillo, charco, numero };
}

export function initTerraza3D({ canvas, pinsLayer, mesa = 7, onSelectLocal, onReady }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const sceneFog = new THREE.FogExp2(0x0b0a12, 0.012);
  scene.fog = sceneFog;
  scene.background = new THREE.Color(0x0b0a12);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(44, 1, 0.3, 200);
  const tex = texturas();

  // ---------------- Cielo ----------------
  const skyUniforms = {
    uZenith: { value: new THREE.Color(0x05060f) }, uHorizon: { value: new THREE.Color(0x2a1d2a) },
    uStars: { value: 1 }, uClouds: { value: 0.15 }, uTime: { value: 0 }, uFlash: { value: 0 },
  };
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(95, 28, 18), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyUniforms,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 uZenith; uniform vec3 uHorizon; uniform float uStars; uniform float uClouds; uniform float uTime; uniform float uFlash;
      varying vec3 vDir;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
      float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x), mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x), f.y); }
      void main(){
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 col = mix(uHorizon, uZenith, pow(h, 0.52));
        if (uStars > 0.01 && h > 0.08) { vec2 sp = floor(vDir.xz / (h + 0.35) * 90.0); float st = step(0.994, hash(sp)) * smoothstep(0.08, 0.35, h); col += vec3(0.9,0.95,1.0) * st * uStars * (1.0 - uClouds * 0.85); }
        if (uClouds > 0.02 && h > 0.03) { vec2 uv = vDir.xz / (h + 0.24) * 1.4 + vec2(uTime * 0.018, uTime * 0.008);
          float n = noise(uv) * 0.65 + noise(uv * 2.3 + 4.2) * 0.35;
          float mask = smoothstep(0.58 - uClouds * 0.36, 0.88 - uClouds * 0.22, n) * smoothstep(0.02, 0.28, h);
          vec3 cloudCol = mix(uHorizon * 1.15, vec3(0.86,0.9,0.96), step(0.35, dot(uZenith, vec3(0.33))));
          col = mix(col, cloudCol, mask * (0.45 + 0.4 * uClouds)); }
        col += vec3(0.7,0.82,1.0) * uFlash;
        gl_FragColor = vec4(col, 1.0);
      }`,
  })));

  // ---------------- Luces ----------------
  const hemi = new THREE.HemisphereLight(0x7a86b8, 0x2a1a12, 0.7);
  scene.add(hemi);
  const luna = new THREE.DirectionalLight(0xc2d5ff, 0.6);
  luna.position.set(-16, 26, 12);
  luna.castShadow = true;
  luna.shadow.mapSize.set(1024, 1024);
  Object.assign(luna.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 70 });
  luna.shadow.bias = -0.0006;
  scene.add(luna);
  const calida = new THREE.PointLight(0xffb36b, 40, 28, 1.4); calida.position.set(0, 5, 1); scene.add(calida);
  const barraLuz = new THREE.PointLight(TERRACOTA, 22, 14, 1.5); barraLuz.position.set(-1, 3, -6); scene.add(barraLuz);
  const parrillaLuz = new THREE.PointLight(0xff6a2a, 14, 9, 1.6); parrillaLuz.position.set(9.2, 1.8, -5.4); scene.add(parrillaLuz);
  const pantallaLuz = new THREE.PointLight(0x7fd6a0, 8, 9, 1.6); pantallaLuz.position.set(-10, 3, -0.5); scene.add(pantallaLuz);

  // ---------------- Materiales ----------------
  const mat = {
    madera: new THREE.MeshStandardMaterial({ map: tex.madera, roughness: 0.7 }),
    ladrillo: new THREE.MeshStandardMaterial({ map: tex.ladrillo, roughness: 0.9 }),
    muro: new THREE.MeshStandardMaterial({ color: 0xe8ded0, roughness: 0.9 }),
    muroOscuro: new THREE.MeshStandardMaterial({ color: 0x24201d, roughness: 0.85 }),
    viga: new THREE.MeshStandardMaterial({ color: 0x6b4426, roughness: 0.6 }),
    negro: new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.45, metalness: 0.7 }),
    mesa: new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.5 }),
    silla: new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.5, metalness: 0.5 }),
    terracota: new THREE.MeshStandardMaterial({ color: 0xc05a32, roughness: 0.75 }),
    hoja: new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.8 }),
    hoja2: new THREE.MeshStandardMaterial({ color: 0x3f8a48, roughness: 0.8 }),
    calle: new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.92 }),
    banqueta: new THREE.MeshStandardMaterial({ color: 0x77726b, roughness: 0.9 }),
    botella: new THREE.MeshStandardMaterial({ color: 0x3d6b3a, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 }),
    botella2: new THREE.MeshStandardMaterial({ color: 0x8a4b1d, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 }),
    brasa: new THREE.MeshBasicMaterial({ color: 0xff5a1f }),
  };
  const caja = (w, h, d, m, x, y, z, sombra = true, padre = scene) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z); o.castShadow = sombra; o.receiveShadow = true; padre.add(o); return o;
  };

  // ---------------- Suelo, calle y muros ----------------
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ color: 0x1a1714, roughness: 1 }));
  suelo.rotation.x = -Math.PI / 2; suelo.position.y = -0.02; suelo.receiveShadow = true; scene.add(suelo);
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), mat.madera);
  deck.rotation.x = -Math.PI / 2; deck.position.y = 0.01; deck.receiveShadow = true; scene.add(deck);
  caja(60, 0.05, 7, mat.calle, 0, 0, 13.5, false);
  caja(60, 0.16, 2.6, mat.banqueta, 0, 0.08, 9.3, false);

  // Muro trasero de ladrillo y edificio
  const ladTras = mat.ladrillo.clone(); ladTras.map = tex.ladrillo.clone(); ladTras.map.repeat.set(6, 1.4); ladTras.map.needsUpdate = true;
  caja(24.4, 3.6, 0.4, ladTras, 0, 1.8, -8.2);
  caja(26, 7.5, 3, mat.muroOscuro, 0, 3.75, -10, false);
  for (let i = -3; i <= 3; i++) caja(1.4, 0.9, 0.05, new THREE.MeshBasicMaterial({ color: i % 2 ? 0x3a2a1c : 0xffc47a }), i * 3.4, 6.7, -8.48, false);
  // Muros laterales bajos con jardineras
  const ladLat = mat.ladrillo.clone(); ladLat.map = tex.ladrillo.clone(); ladLat.map.repeat.set(4, 0.5); ladLat.map.needsUpdate = true;
  caja(0.4, 1.1, 16.4, ladLat, -12.2, 0.55, 0);
  caja(0.4, 1.1, 16.4, ladLat, 12.2, 0.55, 0);
  // Frente con entrada al centro
  caja(9.6, 1.1, 0.4, ladLat, -7.4, 0.55, 8.2);
  caja(9.6, 1.1, 0.4, ladLat, 7.4, 0.55, 8.2);
  caja(0.3, 3.4, 0.3, mat.negro, -2.4, 1.7, 8.2);
  caja(0.3, 3.4, 0.3, mat.negro, 2.4, 1.7, 8.2);
  caja(5.1, 0.7, 0.25, mat.negro, 0, 3.4, 8.2);
  const arco = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.2), new THREE.MeshBasicMaterial({ map: tex.letrero, transparent: true, toneMapped: false, depthWrite: false }));
  arco.position.set(0, 3.4, 8.36); scene.add(arco);

  // Plantas
  const plantas = [];
  function maceta(x, z, s = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * s, 0.32 * s, 0.7 * s, 16), mat.terracota);
    m.position.y = 0.35 * s; m.castShadow = true; g.add(m);
    const copa = new THREE.Group(); copa.position.y = 0.7 * s; g.add(copa);
    for (let i = 0; i < 9; i++) {
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry((0.32 + (i % 3) * 0.08) * s, 0), i % 2 ? mat.hoja : mat.hoja2);
      const a = (i / 9) * Math.PI * 2;
      f.position.set(Math.cos(a) * 0.28 * s, (0.35 + (i % 4) * 0.22) * s, Math.sin(a) * 0.28 * s);
      f.castShadow = true; copa.add(f);
    }
    plantas.push({ obj: copa, fase: x * 0.7 + z });
  }
  [[-11.4, -6.8, 1.3], [-11.4, -1], [-11.4, 4.5], [11.4, 1.5], [11.4, 6.6], [-3.4, 7.5, 0.9], [3.4, 7.5, 0.9], [-11.4, 7.3, 1.1]].forEach(([x, z, s]) => maceta(x, z, s || 1));

  // ---------------- Pérgola ----------------
  for (const x of [-11.6, -5.8, 0, 5.8, 11.6]) for (const z of [-7.6, -1.2]) caja(0.28, 3.9, 0.28, mat.viga, x, 1.95, z);
  for (const z of [-7.6, -1.2]) caja(23.6, 0.3, 0.32, mat.viga, 0, 3.95, z);
  for (let x = -11.4; x <= 11.5; x += 0.9) caja(0.16, 0.2, 7.2, mat.viga, x, 4.2, -4.4, false);

  // ---------------- Barra ----------------
  const barra = new THREE.Group(); barra.position.set(-1, 0, -6.4); scene.add(barra);
  caja(8.4, 1.1, 0.9, mat.madera, 0, 0.55, 0, true, barra);
  caja(8.8, 0.08, 1.15, mat.negro, 0, 1.14, 0, true, barra);
  const tira = caja(8.4, 0.05, 0.05, new THREE.MeshBasicMaterial({ color: TERRACOTA, toneMapped: false }), 0, 0.12, 0.47, false, barra);
  tira.castShadow = false;
  for (let i = -3; i <= 3; i++) {
    const banco = new THREE.Group(); banco.position.set(i * 1.15, 0, 1.0); barra.add(banco);
    caja(0.06, 0.78, 0.06, mat.silla, 0, 0.39, 0, true, banco);
    const asiento = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.07, 16), mat.mesa); asiento.position.y = 0.8; asiento.castShadow = true; banco.add(asiento);
  }
  // Repisas con botellas
  for (const y of [1.9, 2.55]) {
    caja(7.2, 0.06, 0.35, mat.viga, 0, y, -1.45, true, barra);
    for (let i = 0; i < 22; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.34, 8), i % 3 ? mat.botella : mat.botella2);
      b.position.set(-3.4 + i * 0.32, y + 0.2, -1.45); barra.add(b);
    }
  }
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.8), new THREE.MeshBasicMaterial({ map: tex.letrero, transparent: true, toneMapped: false, depthWrite: false }));
  neon.position.set(0, 5.05, -8.47); neon.scale.setScalar(1.25); scene.add(neon);

  // ---------------- Parrilla ----------------
  const parrilla = new THREE.Group(); parrilla.position.set(9.2, 0, -6.2); scene.add(parrilla);
  caja(3.2, 0.95, 1.1, mat.muroOscuro, 0, 0.475, 0, true, parrilla);
  caja(2.6, 0.06, 0.8, mat.negro, 0, 1.0, 0, true, parrilla);
  const brasas = caja(2.4, 0.04, 0.7, mat.brasa, 0, 0.97, 0, false, parrilla);
  for (let i = 0; i < 4; i++) caja(0.5, 0.05, 0.22, new THREE.MeshStandardMaterial({ color: 0x5a2d1a, roughness: 0.7 }), -0.8 + i * 0.55, 1.05, (i % 2) * 0.2 - 0.1, true, parrilla);
  caja(3.4, 0.08, 1.4, mat.negro, 0, 3.0, -0.1, true, parrilla);
  caja(0.5, 1.3, 0.5, mat.negro, 0, 3.7, -0.4, true, parrilla);
  const cartel = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: tex.parrillaTxt, toneMapped: false }));
  cartel.position.set(0, 2.55, 0.55); parrilla.add(cartel);
  const humo = [];
  const humoMat = new THREE.SpriteMaterial({ map: tex.brillo, color: 0x9a948c, transparent: true, opacity: 0.2, depthWrite: false });
  for (let i = 0; i < 6; i++) { const s = new THREE.Sprite(humoMat.clone()); s.scale.setScalar(0.8); parrilla.add(s); humo.push({ s, t: i / 6 }); }

  // ---------------- Pantalla ----------------
  const pant = new THREE.Group(); pant.position.set(-11.7, 0, -0.3); pant.rotation.y = Math.PI / 2; scene.add(pant);
  caja(3.4, 2.0, 0.12, mat.negro, 0, 2.6, 0, true, pant);
  const tvMat = new THREE.MeshBasicMaterial({ map: tex.pantalla, toneMapped: false });
  const tv = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.8), tvMat); tv.position.set(0, 2.6, 0.07); pant.add(tv);
  caja(0.12, 1.6, 0.12, mat.negro, 0, 0.8, -0.1, true, pant);

  // ---------------- Mesas ----------------
  const mesaN = Math.min(12, Math.max(1, Number(mesa) || 7));
  const MESAS = [];
  [-7.8, -2.6, 2.6, 7.8].forEach((x, ci) => [-3.4, 1.6, 5.2].forEach((z, ri) => MESAS.push({ n: MESAS.length + 1, x, z: ri === 0 ? z + (ci % 2) * 0.4 : z })));
  const geoSilla = new THREE.BoxGeometry(0.46, 0.06, 0.46), geoRespaldo = new THREE.BoxGeometry(0.46, 0.5, 0.05), geoPata = new THREE.CylinderGeometry(0.035, 0.035, 0.75, 6);
  const charcoMat = new THREE.MeshBasicMaterial({ map: tex.charco, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false });
  let tuMesa = null;
  MESAS.forEach((m) => {
    const g = new THREE.Group(); g.position.set(m.x, 0, m.z); g.rotation.y = (m.n % 3) * 0.12 - 0.12; scene.add(g);
    const tapa = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.07, 1.25), mat.mesa); tapa.position.y = 0.76; tapa.castShadow = true; tapa.receiveShadow = true; g.add(tapa);
    const pata = new THREE.Mesh(geoPata, mat.negro); pata.position.y = 0.38; g.add(pata);
    caja(0.6, 0.04, 0.6, mat.negro, 0, 0.02, 0, false, g);
    [[0, 0.95, 0], [0, -0.95, Math.PI], [0.95, 0, -Math.PI / 2], [-0.95, 0, Math.PI / 2]].forEach(([sx, sz, r]) => {
      const s = new THREE.Group(); s.position.set(sx, 0, sz); s.rotation.y = r; g.add(s);
      const a = new THREE.Mesh(geoSilla, mat.silla); a.position.y = 0.46; a.castShadow = true; s.add(a);
      const rsp = new THREE.Mesh(geoRespaldo, mat.silla); rsp.position.set(0, 0.72, 0.22); rsp.castShadow = true; s.add(rsp);
      for (const [px, pz] of [[0.19, 0.19], [-0.19, 0.19], [0.19, -0.19], [-0.19, -0.19]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.46, 5), mat.silla); p.position.set(px, 0.23, pz); s.add(p); }
    });
    const vela = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 10), new THREE.MeshBasicMaterial({ color: 0xffc77a })); vela.position.y = 0.86; g.add(vela);
    const num = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.numero(m.n, m.n === mesaN), depthWrite: false }));
    num.scale.setScalar(m.n === mesaN ? 0.62 : 0.42); num.position.y = m.n === mesaN ? 1.55 : 1.3; g.add(num);
    const c = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), charcoMat); c.rotation.x = -Math.PI / 2; c.position.y = 0.03; g.add(c);
    if (m.n === mesaN) tuMesa = m;
  });

  // ---------------- Guirnaldas de focos ----------------
  const postes = [[-11.8, 7.8], [11.8, 7.8], [-11.8, -1.2], [11.8, -1.2]];
  postes.forEach(([x, z]) => caja(0.14, 4.6, 0.14, mat.negro, x, 2.3, z));
  const tramos = [];
  for (let k = 0; k < 5; k++) {
    const z1 = -1.2 + k * 2.25, z2 = z1 + 1.1;
    tramos.push([new THREE.Vector3(-11.8, 4.5, z1), new THREE.Vector3(11.8, 4.5, Math.min(7.8, z2))]);
  }
  tramos.push([new THREE.Vector3(-11.8, 4.5, 7.8), new THREE.Vector3(-11.8, 4.5, -1.2)], [new THREE.Vector3(11.8, 4.5, 7.8), new THREE.Vector3(11.8, 4.5, -1.2)]);
  for (let x = -11.4; x <= 11.5; x += 3.8) tramos.push([new THREE.Vector3(x, 4.15, -7.6), new THREE.Vector3(x + 1.9, 4.15, -1.2)]);
  const focos = [];
  const cable = new THREE.LineBasicMaterial({ color: 0x0d0d10 });
  tramos.forEach(([a, b]) => {
    const pts = [];
    const n = Math.max(8, Math.round(a.distanceTo(b) / 0.9));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = a.clone().lerp(b, t); p.y -= Math.sin(Math.PI * t) * 0.75;
      pts.push(p);
      if (i > 0 && i < n) focos.push(p.clone().add(new THREE.Vector3(0, -0.1, 0)));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cable));
  });
  const focoMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8 });
  const focosMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 8), focoMat, focos.length);
  const dummy = new THREE.Object3D();
  const haloMat = new THREE.SpriteMaterial({ map: tex.brillo, color: 0xffc98a, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
  focos.forEach((p, i) => {
    dummy.position.copy(p); dummy.updateMatrix(); focosMesh.setMatrixAt(i, dummy.matrix);
    const h = new THREE.Sprite(haloMat); h.position.copy(p); h.scale.setScalar(0.55); scene.add(h);
  });
  scene.add(focosMesh);

  // ---------------- Lluvia ----------------
  const lluviaN = 600, lluviaPos = new Float32Array(lluviaN * 6), lluviaVel = new Float32Array(lluviaN);
  for (let i = 0; i < lluviaN; i++) {
    const x = (Math.random() - 0.5) * 34, y = Math.random() * 14, z = (Math.random() - 0.5) * 26;
    lluviaPos.set([x, y, z, x, y + 0.55, z], i * 6); lluviaVel[i] = 0.7 + Math.random() * 0.6;
  }
  const lluviaGeo = new THREE.BufferGeometry(); lluviaGeo.setAttribute("position", new THREE.BufferAttribute(lluviaPos, 3));
  const lluviaMat = new THREE.LineBasicMaterial({ color: 0xaecbff, transparent: true, opacity: 0.4 });
  const lluvia = new THREE.LineSegments(lluviaGeo, lluviaMat); lluvia.visible = false; scene.add(lluvia);

  // ---------------- Zonas con pin ----------------
  const ringGeo = new THREE.RingGeometry(1.5, 1.75, 48);
  const zonas = {};
  const hitboxes = [];
  function zona(id, pin, mira, cam, tam) {
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: TERRACOTA, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(mira[0], 0.05, mira[2]); ring.scale.setScalar(tam[0] / 3); scene.add(ring);
    const hb = new THREE.Mesh(new THREE.BoxGeometry(...tam), new THREE.MeshBasicMaterial({ visible: false }));
    hb.position.set(mira[0], tam[1] / 2, mira[2]); hb.userData.localId = id; scene.add(hb); hitboxes.push(hb);
    zonas[id] = { id, pinPos: new THREE.Vector3(...pin), lookAt: new THREE.Vector3(...mira), camPos: new THREE.Vector3(...cam), ring };
  }
  zona("barra", [-1, 4.6, -6.4], [-1, 1.4, -6.2], [-0.5, 4.6, 2.4], [9, 3, 2.6]);
  zona("parrilla", [9.2, 4.7, -6.2], [9.2, 1.3, -6], [6.2, 3.6, 0.2], [3.6, 3, 2]);
  zona("pantalla", [-11.6, 4.1, -0.3], [-11, 2.4, -0.3], [-3.6, 3.2, 2.4], [1.2, 3.6, 3.8]);
  zona("mesa", [tuMesa.x, 2.3, tuMesa.z], [tuMesa.x, 0.8, tuMesa.z], [tuMesa.x + 2.6, 4.4, tuMesa.z + 5.2], [2.4, 1.6, 2.4]);
  zona("entrada", [0, 4.6, 8.2], [0, 1.6, 8.2], [1.2, 3.2, 17.5], [5, 3.6, 1.4]);

  // ---------------- Clima ----------------
  let clima = { phase: "night", temp: 22, wind: 8, clouds: 15, rain: 0, storm: false };
  let calidaBase = 40, siguienteRayo = 0, rayo = 0;
  function setWeather(next = {}) {
    clima = { ...clima, ...next };
    const { phase, clouds, rain } = clima;
    const nubes = Math.min(1, Math.max(0, (clouds || 0) / 100)), moja = Math.min(1, rain || 0);
    let noche = 1;
    if (phase === "day") {
      noche = 0.14 + nubes * 0.25 + moja * 0.25;
      skyUniforms.uZenith.value.setHex(0x1f6fd4).lerp(new THREE.Color(0x364152), nubes * 0.8 + moja * 0.4);
      skyUniforms.uHorizon.value.setHex(0x9bd2ff).lerp(new THREE.Color(0x64748b), nubes * 0.78 + moja * 0.4);
      skyUniforms.uStars.value = 0;
      hemi.color.setHex(0xbbe0ff); hemi.groundColor.setHex(0x6e5f4f); hemi.intensity = 1.25 - nubes * 0.35;
      luna.color.setHex(0xfff4de); luna.position.set(20, 32, 14); luna.intensity = 2 - nubes * 1.1 - moja * 0.35;
      sceneFog.color.setHex(0x88b4dc).lerp(new THREE.Color(0x4b586b), nubes * 0.8); sceneFog.density = 0.0045 + nubes * 0.004 + moja * 0.006;
      renderer.toneMappingExposure = 1.05; scene.environmentIntensity = 0.75;
    } else if (phase === "sunset") {
      noche = 0.65;
      skyUniforms.uZenith.value.setHex(0x1a2346); skyUniforms.uHorizon.value.setHex(0xe47b52).lerp(new THREE.Color(0x6b5661), nubes * 0.65);
      skyUniforms.uStars.value = 0.28;
      hemi.color.setHex(0xa882b8); hemi.groundColor.setHex(0x3d281c); hemi.intensity = 0.95;
      luna.color.setHex(0xffb066); luna.position.set(-28, 12, 6); luna.intensity = 1.4 - nubes * 0.6;
      sceneFog.color.setHex(0x4a313b); sceneFog.density = 0.0075 + moja * 0.005;
      renderer.toneMappingExposure = 1.12; scene.environmentIntensity = 0.55;
    } else {
      skyUniforms.uZenith.value.setHex(0x05060f); skyUniforms.uHorizon.value.setHex(0x2a1d2a).lerp(new THREE.Color(0x262a36), nubes * 0.6);
      skyUniforms.uStars.value = 1;
      hemi.color.setHex(0x7a86b8); hemi.groundColor.setHex(0x2a1a12); hemi.intensity = 0.7 - moja * 0.12;
      luna.color.setHex(0xc2d5ff); luna.position.set(-16, 26, 12); luna.intensity = 0.6 - nubes * 0.25;
      sceneFog.color.setHex(0x0b0a12); sceneFog.density = 0.012 + moja * 0.005;
      renderer.toneMappingExposure = 1.15; scene.environmentIntensity = 0.45;
    }
    skyUniforms.uClouds.value = nubes;
    scene.background.copy(sceneFog.color);
    calidaBase = 4 + noche * 36; calida.intensity = calidaBase;
    barraLuz.intensity = 4 + noche * 18; parrillaLuz.intensity = 6 + noche * 8; pantallaLuz.intensity = 2 + noche * 6;
    haloMat.opacity = 0.08 + noche * 0.68;
    focoMat.color.setHex(noche > 0.35 ? 0xffe2a8 : 0xd6d3c9);
    charcoMat.opacity = 0.05 + noche * 0.3;
    mat.madera.roughness = 0.7 - moja * 0.45; mat.madera.metalness = moja * 0.25;
    lluvia.visible = moja > 0.02; lluviaMat.opacity = moja * 0.5;
    if (clima.storm) siguienteRayo = performance.now() + 2500;
  }

  // ---------------- Cámara orbital ----------------
  const PRESETS = {
    vista: { target: [0, 1.2, 0.4], theta: 1.05, phi: 0.92, radius: 27 },
    entrada: { target: [0, 1.5, 3], theta: Math.PI / 2, phi: 1.36, radius: 17 },
    patio: { target: [-1, 1.6, -3], theta: 1.25, phi: 1.3, radius: 11 },
  };
  let interactive = false, autoOrbit = true, selectedId = null;
  const current = { target: new THREE.Vector3(...PRESETS.vista.target), theta: PRESETS.vista.theta, phi: PRESETS.vista.phi, radius: PRESETS.vista.radius };
  const goal = { target: current.target.clone(), theta: current.theta, phi: current.phi, radius: current.radius };
  const angulo = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  function applyCamera() {
    const s = Math.sin(current.phi);
    camera.position.set(current.target.x + current.radius * s * Math.cos(current.theta), current.target.y + current.radius * Math.cos(current.phi), current.target.z + current.radius * s * Math.sin(current.theta));
    camera.lookAt(current.target);
  }
  applyCamera();
  function setSize(w, h) {
    if (!w || !h) return;
    camera.aspect = w / h; camera.fov = w / h < 0.85 ? 58 : 44; camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  const ro = new ResizeObserver((es) => es.forEach((e) => setSize(Math.round(e.contentRect.width), Math.round(e.contentRect.height))));
  ro.observe(canvas.parentElement);

  const pinEls = {};
  if (pinsLayer) Object.values(zonas).forEach((z) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "pin3d" + (z.id === "mesa" ? " tuya" : ""); b.dataset.id = z.id;
    b.innerHTML = "<i></i><span></span>";
    b.addEventListener("click", (ev) => { ev.stopPropagation(); selectLocal(z.id); });
    pinsLayer.appendChild(b); pinEls[z.id] = b;
  });
  function setPinLabels(labels) { Object.entries(labels).forEach(([id, t]) => { if (pinEls[id]) pinEls[id].querySelector("span").textContent = t; }); }
  function selectLocal(id, notify = true) {
    const z = zonas[id]; if (!z) return;
    selectedId = id; autoOrbit = false;
    const off = z.camPos.clone().sub(z.lookAt), r = off.length();
    goal.target.copy(z.lookAt); goal.radius = r;
    goal.phi = THREE.MathUtils.clamp(Math.acos(off.y / r), 0.25, 1.42);
    goal.theta = Math.atan2(off.z, off.x);
    Object.entries(zonas).forEach(([k, m]) => { m.ring.material.opacity = k === id ? 0.85 : 0; pinEls[k]?.classList.toggle("on", k === id); });
    if (notify && onSelectLocal) onSelectLocal(id);
  }
  function clearSelection() {
    selectedId = null;
    Object.entries(zonas).forEach(([k, m]) => { m.ring.material.opacity = 0; pinEls[k]?.classList.remove("on"); });
  }
  function setPreset(name) {
    const p = PRESETS[name] || PRESETS.vista;
    autoOrbit = false; clearSelection();
    goal.target.set(...p.target); goal.theta = p.theta; goal.phi = p.phi; goal.radius = p.radius;
  }
  function setInteractive(on) {
    interactive = on;
    if (!on) { autoOrbit = true; clearSelection(); goal.target.set(...PRESETS.vista.target); goal.phi = PRESETS.vista.phi; goal.radius = PRESETS.vista.radius; }
  }

  // ---------------- Toque / mouse ----------------
  const ptrs = new Map();
  let inicio = null, movido = 0, tDown = 0, pinza = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const distPinza = () => { const p = [...ptrs.values()]; return p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); };
  canvas.addEventListener("pointerdown", (e) => {
    if (!interactive) return;
    canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); autoOrbit = false;
    if (ptrs.size === 1) { inicio = { x: e.clientX, y: e.clientY }; movido = 0; tDown = performance.now(); } else if (ptrs.size === 2) pinza = distPinza();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!interactive || !ptrs.has(e.pointerId)) return;
    const prev = ptrs.get(e.pointerId), dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) { movido += Math.hypot(dx, dy); goal.theta += dx * 0.0065; goal.phi = THREE.MathUtils.clamp(goal.phi - dy * 0.0055, 0.22, 1.42); }
    else if (ptrs.size === 2) { const d = distPinza(); if (pinza > 0) goal.radius = THREE.MathUtils.clamp(goal.radius - (d - pinza) * 0.045, 5, 34); pinza = d; }
  });
  function soltar(e) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinza = 0;
    if (interactive && ptrs.size === 0 && inicio && movido < 9 && performance.now() - tDown < 380) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(hitboxes, false)[0];
      if (hit) selectLocal(hit.object.userData.localId);
    }
    if (ptrs.size === 0) inicio = null;
  }
  canvas.addEventListener("pointerup", soltar);
  canvas.addEventListener("pointercancel", soltar);
  canvas.addEventListener("wheel", (e) => { if (!interactive) return; e.preventDefault(); autoOrbit = false; goal.radius = THREE.MathUtils.clamp(goal.radius + e.deltaY * 0.015, 5, 34); }, { passive: false });

  // ---------------- Bucle ----------------
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pv = new THREE.Vector3();
  let ultimo = performance.now(), raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { ultimo = now; return; }
    const dt = Math.min(0.05, (now - ultimo) / 1000); ultimo = now;
    if (autoOrbit && !quieto) goal.theta += dt * (interactive ? 0.08 : 0.12);
    const k = 1 - Math.exp(-dt * 7.5);
    current.target.lerp(goal.target, k);
    current.theta += angulo(current.theta, goal.theta) * k;
    current.phi += (goal.phi - current.phi) * k;
    current.radius += (goal.radius - current.radius) * k;
    if (!quieto) {
      const t = now * 0.001;
      skyUniforms.uTime.value = t;
      calida.intensity = calidaBase + Math.sin(t * 2.2) * (calidaBase > 15 ? 2.2 : 0.3);
      brasas.material.color.setHSL(0.04, 1, 0.48 + Math.sin(t * 7) * 0.05 + Math.sin(t * 13) * 0.03);
      parrillaLuz.intensity += Math.sin(t * 9) * 0.6;
      humo.forEach((h) => { h.t = (h.t + dt * 0.18) % 1; h.s.position.set(Math.sin(h.t * 6 + h.t) * 0.3, 1.2 + h.t * 2.4, -0.1); h.s.scale.setScalar(0.5 + h.t * 1.4); h.s.material.opacity = 0.22 * (1 - h.t); });
      const viento = 0.3 + Math.min(2.4, (clima.wind || 0) / 11);
      plantas.forEach((p) => { p.obj.rotation.z = Math.sin(t * 1.6 + p.fase) * 0.025 * viento; });
      if (lluvia.visible) {
        const a = lluviaGeo.attributes.position.array, caida = (15 + clima.rain * 9) * dt, vx = (clima.wind || 0) * 0.14 * dt;
        for (let i = 0; i < lluviaN; i++) {
          const j = i * 6; a[j] += vx * lluviaVel[i]; a[j + 1] -= caida * lluviaVel[i];
          if (a[j + 1] < 0) { a[j + 1] = 13.5 + Math.random() * 1.5; a[j] = (Math.random() - 0.5) * 34; a[j + 2] = (Math.random() - 0.5) * 26; }
          if (a[j] > 17) a[j] -= 34;
          a[j + 3] = a[j] - (clima.wind || 0) * 0.015; a[j + 4] = a[j + 1] + 0.55; a[j + 5] = a[j + 2];
        }
        lluviaGeo.attributes.position.needsUpdate = true;
        if (clima.storm && now > siguienteRayo) { rayo = 0.65; siguienteRayo = now + 4500 + Math.random() * 6000; }
      }
      rayo = rayo > 0.001 ? rayo * Math.exp(-dt * 9) : 0;
      skyUniforms.uFlash.value = rayo;
    }
    applyCamera();
    renderer.render(scene, camera);
    if (pinsLayer && interactive) {
      const w = canvas.clientWidth, h = canvas.clientHeight, padX = Math.min(82, w * 0.2);
      Object.values(zonas).forEach((z) => {
        const el = pinEls[z.id]; if (!el) return;
        pv.copy(z.pinPos).project(camera);
        const ve = pv.z < 1 && Math.abs(pv.x) < 1.15 && Math.abs(pv.y) < 1.15 && !selectedId;
        el.style.opacity = ve ? "1" : "0"; el.style.pointerEvents = ve ? "auto" : "none";
        if (ve) {
          const px = Math.min(w - padX, Math.max(padX, (pv.x * 0.5 + 0.5) * w)), py = Math.min(h - 88, Math.max(118, (-pv.y * 0.5 + 0.5) * h));
          el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -100%)`;
        }
      });
    }
  }
  setSize(canvas.parentElement.clientWidth, canvas.parentElement.clientHeight);
  setWeather({});
  raf = requestAnimationFrame(frame);
  onReady?.();
  return { setInteractive, setPreset, selectLocal, clearSelection, setPinLabels, setWeather, mesa: mesaN,
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); } };
}
