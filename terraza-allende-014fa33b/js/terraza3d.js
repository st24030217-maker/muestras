import * as THREE from "three";
import { RoomEnvironment } from "./RoomEnvironment.js";
import { createTerrazaTextures } from "./texturas.js";

/**
 * Escena 3D arquitectónica interactiva basada en el lugar real de Terraza Allende (Allende #572, Gómez Palacio, Dgo.).
 * Fachada de carrizo oscuro con letras 3D rojas iluminadas "TERRAZA ALLENDE" y marcos negros abiertos, suelo de grava,
 * techo acanalado con vigas y polines negros, guirnaldas Edison, malla sombra terracota traslúcida,
 * barra en L acanalada con cubierta oscura y gran aro metálico colgante con botellas y focos,
 * muro derecho de carrizo con celosía de rombos retroiluminada, tablero real de 12 cartas de Lotería con lámparas,
 * neón real "Esta es la vida que nos gusta", 4 pantallas en vivo, arco de estuco terracota esculpido al fondo,
 * árbol de mezquite con luces cálidas, aires lavados y 12 mesas detalladas con canastitas de tacos, clamatos y tinas.
 */
const TERRACOTA = 0xff5633;

export function initTerraza3D({ canvas, pinsLayer, mesa = 12, onSelectLocal, onReady }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const sceneFog = new THREE.FogExp2(0x070c1a, 0.0105);
  scene.fog = sceneFog;
  scene.background = new THREE.Color(0x070c1a);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.48;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(44, 1, 0.3, 210);
  const tex = createTerrazaTextures();

  // ---------------- Cielo dinámico con estrellas puntuales nítidas ----------------
  const skyUniforms = {
    uZenith: { value: new THREE.Color(0x050e24) },
    uHorizon: { value: new THREE.Color(0x1b1a2a) },
    uStars: { value: 1 },
    uClouds: { value: 0.14 },
    uTime: { value: 0 },
    uFlash: { value: 0 },
  };
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(98, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: skyUniforms,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 uZenith; uniform vec3 uHorizon; uniform float uStars; uniform float uClouds; uniform float uTime; uniform float uFlash;
        varying vec3 vDir;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
        float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x), mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x), f.y); }
        void main(){
          float h = clamp(vDir.y, 0.0, 1.0);
          vec3 col = mix(uHorizon, uZenith, pow(h, 0.56));
          if (uStars > 0.01 && h > 0.07) {
            vec2 grid = vDir.xz / (h + 0.42) * 58.0;
            vec2 id = floor(grid);
            vec2 lv = fract(grid) - 0.5;
            float rnd = hash(id);
            if (rnd > 0.968) {
              vec2 jitter = (vec2(hash(id + 7.1), hash(id + 13.7)) - 0.5) * 0.55;
              float d = length(lv - jitter);
              float star = smoothstep(0.11, 0.015, d) * (0.6 + 0.4 * sin(uTime * 1.4 + rnd * 40.0));
              col += vec3(0.92, 0.95, 1.0) * star * uStars * smoothstep(0.07, 0.34, h) * (1.0 - uClouds * 0.85);
            }
          }
          if (uClouds > 0.02 && h > 0.03) {
            vec2 uv = vDir.xz / (h + 0.24) * 1.35 + vec2(uTime * 0.015, uTime * 0.007);
            float n = noise(uv) * 0.65 + noise(uv * 2.3 + 4.2) * 0.35;
            float mask = smoothstep(0.58 - uClouds * 0.36, 0.88 - uClouds * 0.22, n) * smoothstep(0.02, 0.28, h);
            vec3 cloudCol = mix(uHorizon * 1.15, vec3(0.88,0.91,0.96), step(0.35, dot(uZenith, vec3(0.33))));
            col = mix(col, cloudCol, mask * (0.42 + 0.38 * uClouds));
          }
          col += vec3(0.7,0.82,1.0) * uFlash;
          gl_FragColor = vec4(col, 1.0);
        }`,
    })
  ));

  // ---------------- Iluminación nocturna cinematográfica ----------------
  const hemi = new THREE.HemisphereLight(0x6e85c4, 0x261812, 0.72);
  scene.add(hemi);

  const luna = new THREE.DirectionalLight(0xc2d8ff, 0.68);
  luna.position.set(-16, 28, 14);
  luna.castShadow = true;
  luna.shadow.mapSize.set(1024, 1024);
  Object.assign(luna.shadow.camera, { left: -19, right: 19, top: 19, bottom: -19, near: 1, far: 74 });
  luna.shadow.bias = -0.00065;
  scene.add(luna);

  const calida = new THREE.PointLight(0xffb468, 42, 30, 1.38);
  calida.position.set(0.4, 4.2, 0.6);
  scene.add(calida);

  const barraLuz = new THREE.PointLight(0xffa854, 28, 16, 1.45);
  barraLuz.position.set(-5.6, 3.1, -1.2);
  scene.add(barraLuz);

  const fachadaLuz = new THREE.PointLight(0xff3e22, 22, 14, 1.48);
  fachadaLuz.position.set(0, 4.2, 10.6);
  scene.add(fachadaLuz);

  const arcoLuz = new THREE.PointLight(0xff9b40, 18, 12, 1.45);
  arcoLuz.position.set(1.5, 2.0, -7.2);
  scene.add(arcoLuz);

  const muroDerLuz = new THREE.PointLight(0xffa054, 18, 14, 1.48);
  muroDerLuz.position.set(8.6, 2.1, 4.5);
  scene.add(muroDerLuz);

  // ---------------- Materiales de lujo ----------------
  const mat = {
    grava: new THREE.MeshStandardMaterial({ map: tex.gravelMap, bumpMap: tex.gravelBump, bumpScale: 0.06, roughness: 0.95 }),
    carrizoOscuro: new THREE.MeshStandardMaterial({ map: tex.carrizoOscuro, bumpMap: tex.carrizoBump, bumpScale: 0.045, roughness: 0.86 }),
    carrizoNatural: new THREE.MeshStandardMaterial({ map: tex.carrizoNatural, bumpMap: tex.carrizoBump, bumpScale: 0.042, roughness: 0.85, side: THREE.DoubleSide }),
    celosia: new THREE.MeshStandardMaterial({ map: tex.celosiaMap, transparent: true, alphaTest: 0.2, roughness: 0.65, metalness: 0.5, side: THREE.DoubleSide }),
    lamina: new THREE.MeshStandardMaterial({ map: tex.corrugatedColor, bumpMap: tex.corrugatedBump, bumpScale: 0.048, roughness: 0.44, metalness: 0.62 }),
    mallaSombra: new THREE.MeshStandardMaterial({ map: tex.mallaSombraMap, transparent: true, opacity: 0.88, side: THREE.DoubleSide, roughness: 0.84 }),
    aceroNegro: new THREE.MeshStandardMaterial({ color: 0x141519, roughness: 0.38, metalness: 0.78 }),
    cromo: new THREE.MeshStandardMaterial({ color: 0xd8dce2, roughness: 0.2, metalness: 0.92 }),
    maderaMiel: new THREE.MeshStandardMaterial({ map: tex.woodHoney, roughness: 0.24, metalness: 0.06 }),
    barraFrente: new THREE.MeshStandardMaterial({ map: tex.barFlutedWood, roughness: 0.58, metalness: 0.08 }),
    barraTope: new THREE.MeshStandardMaterial({ color: 0x161414, roughness: 0.16, metalness: 0.22 }),
    barraMuro: new THREE.MeshStandardMaterial({ color: 0x221c19, roughness: 0.86 }),
    estucoTerracota: new THREE.MeshStandardMaterial({ map: tex.stuccoTerracotaMap, roughness: 0.84 }),
    cojinTerracota: new THREE.MeshStandardMaterial({ color: 0xc64827, roughness: 0.76 }),
    galvanizado: new THREE.MeshStandardMaterial({ color: 0xa6aeb8, roughness: 0.42, metalness: 0.62 }),
    acGrill: new THREE.MeshStandardMaterial({ map: tex.acGrillMap, roughness: 0.65, metalness: 0.3 }),
    calle: new THREE.MeshStandardMaterial({ color: 0x151820, roughness: 0.92 }),
    banqueta: new THREE.MeshStandardMaterial({ color: 0x5c5750, roughness: 0.88 }),
    hoja1: new THREE.MeshStandardMaterial({ color: 0x265430, roughness: 0.82 }),
    hoja2: new THREE.MeshStandardMaterial({ color: 0x376e3c, roughness: 0.78 }),
    hoja3: new THREE.MeshStandardMaterial({ color: 0x457c45, roughness: 0.76 }),
    botellaVerde: new THREE.MeshStandardMaterial({ color: 0x246b34, roughness: 0.14, metalness: 0.12, transparent: true, opacity: 0.9 }),
    botellaAmbar: new THREE.MeshStandardMaterial({ color: 0x9c450d, roughness: 0.14, metalness: 0.12, transparent: true, opacity: 0.9 }),
    botellaClara: new THREE.MeshStandardMaterial({ color: 0xe6eef6, roughness: 0.12, metalness: 0.14, transparent: true, opacity: 0.8 }),
    botellaAzul: new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.16, metalness: 0.12, transparent: true, opacity: 0.88 }),
    tapaOro: new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.3, metalness: 0.85 }),
    hielo: new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.82 }),
    platoRojo: new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.38 }),
    papelCuadros: new THREE.MeshStandardMaterial({ map: tex.checkeredMap, roughness: 0.72 }),
    tortilla: new THREE.MeshStandardMaterial({ color: 0xe5c38b, roughness: 0.78 }),
    queso: new THREE.MeshStandardMaterial({ color: 0xf4d35e, roughness: 0.45 }),
    servilleta: new THREE.MeshStandardMaterial({ color: 0xf5f5f4, roughness: 0.92 }),
    clamato: new THREE.MeshStandardMaterial({ color: 0xdf2240, roughness: 0.2, transparent: true, opacity: 0.9 }),
    tajin: new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.85 }),
    popote: new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.5 }),
  };

  const caja = (w, h, d, m, x = 0, y = 0, z = 0, sombra = true, padre = scene) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    o.castShadow = sombra;
    o.receiveShadow = true;
    padre.add(o);
    return o;
  };

  const charcoMat = new THREE.MeshBasicMaterial({
    map: tex.floorPool,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const charcos = [];
  const addCharco = (x, z, esc = 4.2, op = 0.45, tinte = 0xffbd73) => {
    const m = charcoMat.clone();
    m.color.setHex(tinte);
    m.opacity = op;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(esc, esc), m);
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, 0.018, z);
    scene.add(p);
    charcos.push({ mat: m, base: op });
    return { mesh: p, mat: m, base: op };
  };

  // Helper: botella esculpida (cuerpo + cuello + tapa) para aro y contrabarra
  const botBodyGeo = new THREE.CylinderGeometry(0.036, 0.044, 0.21, 9);
  const botNeckGeo = new THREE.CylinderGeometry(0.014, 0.022, 0.1, 8);
  const botCapGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.024, 8);
  function makeBottle(glassMat) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(botBodyGeo, glassMat);
    b.position.y = 0.105;
    const n = new THREE.Mesh(botNeckGeo, glassMat);
    n.position.y = 0.25;
    const c = new THREE.Mesh(botCapGeo, mat.tapaOro);
    c.position.y = 0.31;
    g.add(b, n, c);
    return g;
  }

  // ---------------- Suelo de grava, banqueta y Av. Allende ----------------
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ color: 0x0c0f17, roughness: 0.98 }));
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.y = -0.04;
  suelo.receiveShadow = true;
  scene.add(suelo);

  const patioGrava = new THREE.Mesh(new THREE.PlaneGeometry(21.6, 21.4), mat.grava);
  patioGrava.rotation.x = -Math.PI / 2;
  patioGrava.position.set(0, 0.005, 1.9);
  patioGrava.receiveShadow = true;
  scene.add(patioGrava);

  // Calle Av. Ignacio Allende al frente (+Z) con banqueta y poste
  caja(64, 0.06, 9.0, mat.calle, 0, 0.01, 17.0, false);
  caja(64, 0.14, 0.26, mat.banqueta, 0, 0.07, 12.5, false);
  const posteCalle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 6.2, 8), mat.aceroNegro);
  posteCalle.position.set(-11.4, 3.1, 12.9);
  const focoCalle = caja(0.52, 0.1, 0.24, new THREE.MeshBasicMaterial({ color: 0xfff0c4 }), -11.4, 6.1, 12.6, false);
  scene.add(posteCalle, focoCalle);

  // ---------------- Fachada Frontal Real (z = 8.5) — 100% dentro de fg ----------------
  let redHaloMat;
  {
    const fg = new THREE.Group();
    fg.position.set(0, 0, 8.5);

    // Banda superior de carrizo oscuro entintado (correctamente montada en fg, z = 8.5!)
    caja(21.6, 2.68, 0.22, mat.carrizoOscuro, 0, 4.3, 0, true, fg);

    // Corona orgánica densa de puntas de carrizo arriba + fleco sutil abajo (como en 3_fachada.jpg)
    const reedCount = 175;
    const reedMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.028, 0.032, 1, 5), mat.carrizoOscuro, reedCount);
    const rd = new THREE.Object3D();
    for (let i = 0; i < reedCount; i++) {
      const rx = -10.72 + (i / (reedCount - 1)) * 21.44;
      const h = 0.14 + Math.abs(Math.sin(i * 1.93) * 0.16 + Math.cos(i * 4.7) * 0.09);
      rd.position.set(rx, 5.6 + h * 0.42, (i % 3 - 1) * 0.025);
      rd.scale.set(1, h, 1);
      rd.rotation.z = Math.sin(i * 2.7) * 0.05;
      rd.updateMatrix();
      reedMesh.setMatrixAt(i, rd.matrix);
    }
    fg.add(reedMesh);

    // Halo rojo aditivo bañando el carrizo oscuro detrás de las letras
    redHaloMat = new THREE.MeshBasicMaterial({
      map: tex.redHaloSprite,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const redWash = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 3.3), redHaloMat);
    redWash.position.set(-0.2, 4.3, 0.13);
    fg.add(redWash);

    // Letrero 3D de letras de canal rojo iluminado "TERRAZA ALLENDE" (profundidad real + cara luminosa)
    const signW = 7.4, signH = 3.7;
    const backMat = new THREE.MeshStandardMaterial({
      map: tex.signFacadeBackTex,
      transparent: true,
      alphaTest: 0.35,
      roughness: 0.5,
      metalness: 0.2,
    });
    for (let layer = 0; layer < 4; layer++) {
      const back = new THREE.Mesh(new THREE.PlaneGeometry(signW, signH), backMat);
      back.position.set(-0.2, 4.3, 0.14 + layer * 0.026);
      fg.add(back);
    }
    const letrero = new THREE.Mesh(
      new THREE.PlaneGeometry(signW, signH),
      new THREE.MeshBasicMaterial({ map: tex.signFacadeTex, transparent: true, toneMapped: false, depthWrite: false })
    );
    letrero.position.set(-0.2, 4.3, 0.26);
    fg.add(letrero);

    // Paneles laterales bajos de carrizo oscuro en los extremos
    caja(2.2, 2.96, 0.2, mat.carrizoOscuro, -9.7, 1.48, 0, true, fg);
    caja(2.2, 2.96, 0.2, mat.carrizoOscuro, 9.7, 1.48, 0, true, fg);

    // Marcos tubulares negros abiertos en bahías izquierda y derecha + travesaño superior
    const frameSegments = [
      [21.6, 0.11, 0.2, 0, 2.96, 0],
      // Doble bahía abierta izquierda (-8.6 .. -1.6)
      [0.095, 2.96, 0.12, -8.6, 1.48, 0],
      [0.095, 2.96, 0.12, -5.1, 1.48, 0],
      [0.095, 2.96, 0.12, -1.6, 1.48, 0],
      [7.0, 0.08, 0.1, -5.1, 0.06, 0],
      // Bahía abierta derecha (4.6 .. 8.6)
      [0.095, 2.96, 0.12, 4.6, 1.48, 0],
      [0.095, 2.96, 0.12, 8.6, 1.48, 0],
      [4.0, 0.08, 0.1, 6.6, 0.06, 0],
    ];
    frameSegments.forEach(([w, h, d, x, y, z]) => caja(w, h, d, mat.aceroNegro, x, y, z, true, fg));

    scene.add(fg);
    addCharco(0, 10.2, 9.5, 0.36, 0xff522e);
  }

  // ---------------- Muros Perimetrales de Carrizo, Celosía y Arco Esculpido ----------------
  // Muro izquierdo tras la barra
  caja(0.24, 1.12, 17.0, mat.barraMuro, -10.65, 0.56, 0);
  caja(0.18, 3.15, 17.0, mat.carrizoNatural, -10.65, 2.68, 0);

  // Muro derecho: murete de estuco terracota + carrizo dorado + estructura de acero negro
  caja(0.24, 0.68, 17.0, mat.estucoTerracota, 10.65, 0.34, 0);
  caja(0.16, 3.32, 17.0, mat.carrizoNatural, 10.65, 2.34, 0);
  for (let pz = -8.2; pz <= 8.2; pz += 4.1) {
    caja(0.14, 4.45, 0.14, mat.aceroNegro, 10.52, 2.225, pz);
  }
  caja(0.12, 0.1, 17.0, mat.aceroNegro, 10.52, 2.68, 0);
  caja(0.12, 0.1, 17.0, mat.aceroNegro, 10.52, 1.16, 0);

  // Detalle icónico de 3_fachada.jpg: Celosía de rombos frente al carrizo derecho-frontal retroiluminado
  const celosiaMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 2.55), mat.celosia);
  celosiaMesh.rotation.y = -Math.PI / 2;
  celosiaMesh.position.set(10.42, 1.98, 6.2);
  scene.add(celosiaMesh);

  // Haces rasantes cálidos subiendo por el carrizo derecho y la celosía
  const beamMat = new THREE.MeshBasicMaterial({
    map: tex.wallBeam,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (const bz of [-6.4, -3.1, -0.3, 2.1, 5.2, 7.1]) {
    caja(0.24, 0.08, 0.36, mat.aceroNegro, 10.28, 0.05, bz, false);
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 3.0), beamMat);
    beam.rotation.y = -Math.PI / 2;
    beam.position.set(10.47, 1.56, bz);
    scene.add(beam);
  }

  // Muro trasero (z = -8.5): carrizo a los lados + MURO DE ESTUCO TERRACOTA CON ARCO APUNTADO ESCULPIDO (3_fachada.jpg!)
  caja(6.9, 3.85, 0.24, mat.carrizoNatural, -7.15, 1.925, -8.5);
  caja(6.1, 3.85, 0.24, mat.carrizoNatural, 7.55, 1.925, -8.5);

  {
    const archW = 7.6, archH = 3.7;
    const wallShape = new THREE.Shape();
    wallShape.moveTo(-archW / 2, 0);
    wallShape.lineTo(archW / 2, 0);
    wallShape.lineTo(archW / 2, archH);
    wallShape.lineTo(-archW / 2, archH);
    wallShape.closePath();

    // Abertura real de arco morisco/adobe apuntado
    const hole = new THREE.Path();
    hole.moveTo(-0.92, 0);
    hole.lineTo(-0.92, 1.58);
    hole.quadraticCurveTo(-0.92, 2.38, 0, 2.74);
    hole.quadraticCurveTo(0.92, 2.38, 0.92, 1.58);
    hole.lineTo(0.92, 0);
    hole.closePath();
    wallShape.holes.push(hole);

    const archGeo = new THREE.ExtrudeGeometry(wallShape, { depth: 0.34, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 2 });
    const archMesh = new THREE.Mesh(archGeo, mat.estucoTerracota);
    archMesh.position.set(1.5, 0, -8.62);
    archMesh.castShadow = true;
    archMesh.receiveShadow = true;
    scene.add(archMesh);

    // Resplandor dorado interior detrás del arco terracota (exacto a 3_fachada.jpg)
    const arcoGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 2.85),
      new THREE.MeshBasicMaterial({ color: 0xffba63 })
    );
    arcoGlow.position.set(1.5, 1.42, -8.72);
    scene.add(arcoGlow);
    addCharco(1.5, -7.4, 5.2, 0.52, 0xffaa4c);
  }

  // Marco decorativo trasero derecho retroiluminado (visible tras el árbol en 3_fachada.jpg)
  {
    const alc = new THREE.Group();
    alc.position.set(6.4, 0, -8.25);
    caja(2.6, 0.07, 0.07, mat.aceroNegro, 0, 2.55, 0, false, alc);
    caja(0.07, 2.55, 0.07, mat.aceroNegro, -1.3, 1.275, 0, false, alc);
    caja(0.07, 2.55, 0.07, mat.aceroNegro, 1.3, 1.275, 0, false, alc);
    const backWash = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.2), beamMat);
    backWash.position.set(0, 1.15, -0.06);
    alc.add(backWash);
    scene.add(alc);
  }

  // Tablero de 12 cartas de Lotería real en muro derecho (z = +2.1) con marco y 2 lámparas galería
  const loteriaBoard = new THREE.Group();
  loteriaBoard.position.set(10.38, 2.12, 2.1);
  loteriaBoard.rotation.y = -Math.PI / 2;
  caja(2.62, 2.62, 0.06, mat.aceroNegro, 0, 0, -0.06, true, loteriaBoard);
  caja(2.5, 2.5, 0.08, mat.estucoTerracota, 0, 0, -0.03, true, loteriaBoard);
  const loteriaFace = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.MeshStandardMaterial({ map: tex.loteriaWallTex, roughness: 0.5 })
  );
  loteriaFace.position.z = 0.016;
  loteriaBoard.add(loteriaFace);
  // 2 brazos de lámpara de galería iluminando el tablero de Lotería
  for (const lx of [-0.68, 0.68]) {
    caja(0.04, 0.04, 0.34, mat.aceroNegro, lx, 1.36, 0.16, false, loteriaBoard);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.12, 10), mat.aceroNegro);
    shade.position.set(lx, 1.31, 0.32);
    shade.rotation.x = 0.35;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe8b0 }));
    bulb.position.set(lx, 1.26, 0.32);
    loteriaBoard.add(shade, bulb);
  }
  scene.add(loteriaBoard);
  const loteriaLight = new THREE.PointLight(0xffd29a, 14, 9, 1.48);
  loteriaLight.position.set(8.8, 2.45, 2.1);
  scene.add(loteriaLight);

  // Letrero neón real "ESTA ES la vida QUE NOS gusta" en muro derecho (z = -3.1)
  const neonBoard = new THREE.Group();
  neonBoard.position.set(10.38, 2.12, -3.1);
  neonBoard.rotation.y = -Math.PI / 2;
  caja(2.62, 2.62, 0.06, mat.aceroNegro, 0, 0, -0.06, true, neonBoard);
  caja(2.5, 2.5, 0.08, new THREE.MeshStandardMaterial({ color: 0x642216, roughness: 0.78 }), 0, 0, -0.03, true, neonBoard);
  const neonFace = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.MeshBasicMaterial({ map: tex.neonWallTex, toneMapped: false })
  );
  neonFace.position.z = 0.016;
  neonBoard.add(neonFace);
  scene.add(neonBoard);
  const neonLight = new THREE.PointLight(0xff842b, 16, 9.5, 1.48);
  neonLight.position.set(8.9, 2.15, -3.1);
  scene.add(neonLight);

  // 2 Aires lavados detallados con rejilla + caja de HIELO junto al carrizo derecho (1_interior.jpg)
  for (const az of [-6.6, 6.2]) {
    const ac = new THREE.Group();
    ac.position.set(9.82, 0, az);
    caja(0.92, 0.92, 0.92, mat.galvanizado, 0, 1.38, 0, true, ac);
    for (const [lx, lz] of [[-0.39, -0.39], [0.39, -0.39], [-0.39, 0.39], [0.39, 0.39]]) {
      caja(0.055, 0.94, 0.055, mat.aceroNegro, lx, 0.47, lz, true, ac);
    }
    const grill = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.74), mat.acGrill);
    grill.rotation.y = -Math.PI / 2;
    grill.position.set(-0.468, 1.38, 0);
    ac.add(grill);
    scene.add(ac);
  }

  // ---------------- Techo Alto de Lámina Acanalada, Armaduras Negras y Malla Sombra ----------------
  {
    for (const cx of [-10.5, -2.2, 4.6, 10.5]) {
      for (const cz of [-8.2, -2.6, 2.9, 8.3]) {
        if (cx === -2.2 && cz === 8.3) continue;
        if (cx === 4.6 && cz === 8.3) continue;
        caja(0.14, 4.48, 0.14, mat.aceroNegro, cx, 2.24, cz);
      }
    }
    // Columna central icónica visible tras la entrada (3_fachada.jpg)
    caja(0.17, 4.48, 0.17, mat.aceroNegro, 1.25, 2.24, 4.1);

    // Vigas principales + polines del techo
    for (const cz of [-8.2, -2.6, 2.9, 8.3]) {
      caja(21.2, 0.17, 0.14, mat.aceroNegro, 0, 4.44, cz);
    }
    for (let px = -10.2; px <= 10.2; px += 2.55) {
      caja(0.09, 0.12, 16.8, mat.aceroNegro, px, 4.56, 0, false);
    }

    // Lámpara lineal cálida bajo la viga central (visible en 1_interior.jpg)
    caja(0.12, 0.04, 2.2, new THREE.MeshBasicMaterial({ color: 0xfff3d4 }), 0.2, 4.35, -0.4, false);

    // Lámina acanalada del techo (solo cara inferior visible desde adentro; vista aérea 100% limpia)
    const roofPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(21.4, 17.0),
      new THREE.MeshStandardMaterial({
        map: tex.corrugatedColor,
        bumpMap: tex.corrugatedBump,
        bumpScale: 0.05,
        roughness: 0.48,
        metalness: 0.58,
        side: THREE.FrontSide,
      })
    );
    roofPlane.rotation.x = Math.PI / 2;
    roofPlane.position.set(0, 4.64, 0);
    scene.add(roofPlane);

    // Faldones traslúcidos de malla sombra terracota en laterales altos y velaria hacia el arco
    const mallaDer = new THREE.Mesh(new THREE.PlaneGeometry(16.6, 1.5), mat.mallaSombra);
    mallaDer.rotation.y = -Math.PI / 2;
    mallaDer.position.set(10.34, 3.74, 0);
    const mallaTras = new THREE.Mesh(new THREE.PlaneGeometry(20.6, 1.5), mat.mallaSombra);
    mallaTras.position.set(0, 3.74, -8.14);
    // Velaria terracota inclinada interior junto al arco (como en 3_fachada.jpg)
    const velaria = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.2), mat.mallaSombra);
    velaria.rotation.x = Math.PI / 2 + 0.18;
    velaria.position.set(4.5, 3.65, -5.6);
    scene.add(mallaDer, mallaTras, velaria);
  }

  // ---------------- La Barra en L y Gran Aro Metálico Colgante con Botellas (1_interior.jpg) ----------------
  {
    const barra = new THREE.Group();
    barra.position.set(-7.6, 0, -1.2);

    // Mostrador principal acanalado cálido + cubierta negra brillante + vuelta en L al frente
    caja(1.06, 1.04, 7.6, mat.barraFrente, 1.85, 0.52, 0, true, barra);
    caja(1.3, 0.075, 7.82, mat.barraTope, 1.88, 1.08, 0, true, barra);
    // Extensión frontal en L de la barra
    caja(2.6, 1.04, 1.0, mat.barraFrente, 0.55, 0.52, 3.3, true, barra);
    caja(2.74, 0.075, 1.18, mat.barraTope, 0.55, 1.08, 3.32, true, barra);
    // Tira LED ámbar bajo la cubierta de la barra + descansa-pies cromado
    caja(0.04, 0.04, 7.55, new THREE.MeshBasicMaterial({ color: 0xffa454, toneMapped: false }), 2.42, 1.01, 0, false, barra);
    const footRail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 7.4, 10), mat.cromo);
    footRail.rotation.x = Math.PI / 2;
    footRail.position.set(2.54, 0.22, 0);
    barra.add(footRail);

    // Contrabarra profesional: cubierta de acero, enfriador azul y carta oficial burdeos
    caja(0.86, 0.92, 6.8, mat.aceroNegro, -1.8, 0.46, 0, true, barra);
    caja(0.9, 0.055, 6.84, mat.cromo, -1.8, 0.945, 0, false, barra);
    caja(0.76, 2.02, 1.06, mat.aceroNegro, -1.85, 1.01, -2.5, true, barra);
    const puertaEnf = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 1.78), new THREE.MeshBasicMaterial({ map: tex.coolerBlueMap }));
    puertaEnf.rotation.y = Math.PI / 2;
    puertaEnf.position.set(-1.455, 1.05, -2.5);
    barra.add(puertaEnf);

    const cartaPanel = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7), new THREE.MeshBasicMaterial({ map: tex.barMenuBoard }));
    cartaPanel.rotation.y = Math.PI / 2;
    cartaPanel.position.set(-2.9, 2.4, 0.35);
    barra.add(cartaPanel);

    // 3 Repisas iluminadas detrás de la barra con botellas esculpidas
    const glassMats = [mat.botellaVerde, mat.botellaAmbar, mat.botellaClara, mat.botellaAzul];
    for (const ry of [1.45, 1.98, 2.52]) {
      caja(0.36, 0.045, 3.2, mat.maderaMiel, -2.62, ry, -2.25, true, barra);
      caja(0.03, 0.025, 3.1, new THREE.MeshBasicMaterial({ color: 0xffc67d, toneMapped: false }), -2.46, ry - 0.03, -2.25, false, barra);
      for (let i = 0; i < 9; i++) {
        const bot = makeBottle(glassMats[(i + Math.round(ry * 3)) % glassMats.length]);
        bot.position.set(-2.62, ry + 0.022, -3.55 + i * 0.32);
        barra.add(bot);
      }
    }

    // 6 Bancos altos de herrería con respaldo de 3 tiras y cojín terracota
    for (let i = 0; i < 6; i++) {
      const bz = -3.0 + i * 1.2;
      const b = new THREE.Group();
      b.position.set(2.88, 0, bz);
      b.rotation.y = -Math.PI / 2 + ((i % 3) - 1) * 0.07;
      for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
        caja(0.036, 0.74, 0.036, mat.aceroNegro, lx, 0.37, lz, true, b);
      }
      // Descansa-pies del banco
      caja(0.36, 0.025, 0.025, mat.aceroNegro, 0, 0.24, -0.18, false, b);
      caja(0.42, 0.06, 0.42, mat.cojinTerracota, 0, 0.76, 0, true, b);
      caja(0.036, 0.46, 0.036, mat.aceroNegro, -0.18, 0.99, 0.18, true, b);
      caja(0.036, 0.46, 0.036, mat.aceroNegro, 0.18, 0.99, 0.18, true, b);
      for (const sy of [0.9, 1.04, 1.18]) {
        caja(0.38, 0.044, 0.024, mat.aceroNegro, 0, sy, 0.19, true, b);
      }
      barra.add(b);
    }

    // SIGNATURE (1_interior.jpg): Gran aro circular de solera plana de acero suspendido con rayos, botellas y focos colgantes
    const aro = new THREE.Group();
    aro.position.set(1.75, 3.22, -0.15);
    const R = 1.98;
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x131418, roughness: 0.36, metalness: 0.82, side: THREE.DoubleSide });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.18, 48, 1, true), bandMat);
    aro.add(band);
    for (const fy of [-0.09, 0.09]) {
      const flange = new THREE.Mesh(new THREE.TorusGeometry(R, 0.028, 8, 48), mat.aceroNegro);
      flange.rotation.x = Math.PI / 2;
      flange.position.y = fy;
      aro.add(flange);
    }
    // 6 rayos radiales tipo rueda de herrería + centro
    for (let s = 0; s < 3; s++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(R * 2, 0.04, 0.04), mat.aceroNegro);
      spoke.rotation.y = (s / 3) * Math.PI;
      aro.add(spoke);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 14), mat.aceroNegro);
    aro.add(hub);
    // 4 tensores al techo
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.38, 6), mat.aceroNegro);
      rod.position.set(Math.cos(a) * R, 0.69, Math.sin(a) * R);
      aro.add(rod);
    }
    // 16 botellas esculpidas paradas alrededor del aro colgante (exacto a 1_interior.jpg!)
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const bot = makeBottle(glassMats[k % glassMats.length]);
      bot.position.set(Math.cos(a) * (R - 0.02), 0.1, Math.sin(a) * (R - 0.02));
      aro.add(bot);
    }
    barra.add(aro);
    scene.add(barra);
    addCharco(-5.6, -1.2, 9.2, 0.52, 0xffaa52);
  }

  // ---------------- 4 Pantallas de TV en Vivo (posicionadas sin tapar ninguna cámara) ----------------
  const tvMat = new THREE.MeshBasicMaterial({ map: tex.tvScreenMap, toneMapped: false });
  function addTV(x, y, z, rotY, tiltX = 0.2) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    // Soporte superior al techo/viga
    caja(0.05, 1.1, 0.05, mat.aceroNegro, 0, 0.68, -0.04, false, g);
    const screenG = new THREE.Group();
    screenG.rotation.x = tiltX;
    caja(1.78, 1.02, 0.07, mat.aceroNegro, 0, 0, 0, true, screenG);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.68, 0.93), tvMat);
    p.position.z = 0.04;
    screenG.add(p);
    g.add(screenG);
    scene.add(g);
  }
  addTV(-5.8, 3.15, -5.8, 0.36);
  addTV(-0.8, 3.22, -4.5, 0.08);
  addTV(5.3, 3.22, -5.8, -0.45);
  addTV(9.85, 3.18, -0.45, -Math.PI / 2 + 0.14); // En el poste derecho entre Lotería y Neón (como 1_interior.jpg!)

  // ---------------- Árbol Interior de Mezquite en Y con Luces Cálidas (3_fachada.jpg) ----------------
  const arboles = [];
  {
    const tree = new THREE.Group();
    tree.position.set(3.75, 0, -4.6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2c1e, roughness: 0.94 });

    // Tronco base + 2 ramas principales bifurcadas en Y (exacto a 3_fachada.jpg)
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.24, 1.8, 10), trunkMat);
    trunk.position.y = 0.9;
    trunk.castShadow = true;
    tree.add(trunk);

    const forks = [
      { to: new THREE.Vector3(-0.72, 3.35, 0.28), r: 0.95 },
      { to: new THREE.Vector3(0.75, 3.2, -0.22), r: 0.92 },
      { to: new THREE.Vector3(0.05, 3.7, 0.42), r: 0.86 },
    ];
    const fairyPts = [];
    // Espiral densa de lucecitas en el tronco base
    for (let fy = 0.3; fy <= 1.75; fy += 0.1) {
      const ang = fy * 9.2;
      fairyPts.push(new THREE.Vector3(Math.cos(ang) * 0.2, fy, Math.sin(ang) * 0.2));
    }

    const copa = new THREE.Group();
    const leafMats = [mat.hoja1, mat.hoja2, mat.hoja3];
    forks.forEach((fk, fi) => {
      const start = new THREE.Vector3(0, 1.65, 0);
      const mid = start.clone().lerp(fk.to, 0.5);
      const len = start.distanceTo(fk.to);
      const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, len, 8), trunkMat);
      limb.position.copy(mid);
      limb.lookAt(fk.to);
      limb.rotateX(Math.PI / 2);
      limb.castShadow = true;
      tree.add(limb);

      // Lucecitas enrolladas subiendo por cada rama en Y
      for (let s = 0.12; s <= 0.82; s += 0.11) {
        const pt = start.clone().lerp(fk.to, s);
        const ang = s * 18 + fi * 2.1;
        pt.x += Math.cos(ang) * 0.11;
        pt.z += Math.sin(ang) * 0.11;
        fairyPts.push(pt);
      }

      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + fi * 0.5;
        const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(fk.r * 0.38, 0), leafMats[(i + fi) % 3]);
        leaf.position.set(
          fk.to.x + Math.cos(a) * fk.r * 0.58,
          fk.to.y + ((i % 3) - 1) * 0.24,
          fk.to.z + Math.sin(a) * fk.r * 0.58
        );
        leaf.scale.set(1.15, 0.78, 1.0);
        leaf.castShadow = true;
        copa.add(leaf);
      }
    });
    tree.add(copa);
    arboles.push({ obj: copa, fase: 0.4 });

    const fairyMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.028, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffebb3 }), fairyPts.length);
    const fd = new THREE.Object3D();
    fairyPts.forEach((pt, idx) => {
      fd.position.copy(pt);
      fd.updateMatrix();
      fairyMesh.setMatrixAt(idx, fd.matrix);
    });
    tree.add(fairyMesh);
    scene.add(tree);
  }

  // ---------------- Guirnaldas de Focos Edison bajo el Techo y en el Aro ----------------
  const focos = [];
  const cableMat = new THREE.MeshBasicMaterial({ color: 0x111216 });
  const tramos = [];
  for (const x of [-8.2, -3.4, 1.4, 6.2, 9.2]) {
    tramos.push([new THREE.Vector3(x, 4.38, -8.0), new THREE.Vector3(x, 4.38, 8.0)]);
  }
  for (const z of [-5.4, 0.2, 5.6]) {
    tramos.push([new THREE.Vector3(-10.0, 4.34, z), new THREE.Vector3(10.0, 4.34, z)]);
  }
  // 12 focos colgantes con cable fino del aro metálico sobre la barra (exacto a 1_interior.jpg)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const drop = 0.22 + (i % 3) * 0.14;
    const fx = -5.85 + Math.cos(a) * 1.92;
    const fz = -1.35 + Math.sin(a) * 1.92;
    const topP = new THREE.Vector3(fx, 3.14, fz);
    const botP = new THREE.Vector3(fx, 3.14 - drop, fz);
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([topP, botP]), cableMat));
    focos.push(botP);
  }

  tramos.forEach(([a, b]) => {
    const pts = [];
    const n = Math.max(8, Math.round(a.distanceTo(b) / 1.55));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = a.clone().lerp(b, t);
      p.y -= Math.sin(Math.PI * t) * 0.26;
      pts.push(p);
      if (i > 0 && i < n) focos.push(p.clone().add(new THREE.Vector3(0, -0.075, 0)));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cableMat));
  });

  const focoMat = new THREE.MeshBasicMaterial({ color: 0xffe8b0 });
  const focosMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.052, 8, 8), focoMat, focos.length);
  const dummy = new THREE.Object3D();
  const haloMat = new THREE.SpriteMaterial({
    map: tex.glowSprite,
    color: 0xffc67d,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  focos.forEach((p, i) => {
    dummy.position.copy(p);
    dummy.updateMatrix();
    focosMesh.setMatrixAt(i, dummy.matrix);
    const h = new THREE.Sprite(haloMat);
    h.position.copy(p);
    h.scale.setScalar(0.56);
    scene.add(h);
  });
  scene.add(focosMesh);

  // ---------------- 12 Mesas Reales de Madera Miel con Tacos, Clamatos y Tinas con Cervezas ----------------
  let mesaN = Math.min(12, Math.max(1, Number(mesa) || 12));
  const MESAS = [];
  [-2.6, 1.6, 6.2].forEach((x, ci) =>
    [-5.0, -1.6, 1.8, 5.2].forEach((z, ri) =>
      MESAS.push({ n: MESAS.length + 1, x: x + (ri % 2) * 0.32, z: z + (ci % 2) * 0.22 })
    )
  );

  // Geometrías reutilizables para los props de mesa
  const tacoGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.14, 8, 1, false, 0, Math.PI);
  const miniBotGeo = new THREE.CylinderGeometry(0.019, 0.023, 0.15, 7);
  const miniNeckGeo = new THREE.CylinderGeometry(0.008, 0.013, 0.06, 6);

  const mesaBadges = new Map();
  const mesaCharcos = new Map();

  MESAS.forEach((m) => {
    const g = new THREE.Group();
    g.position.set(m.x, 0, m.z);
    g.rotation.y = ((m.n % 3) - 1) * 0.07;

    // Cubierta barnizada miel + bastidor perimetral negro + 4 patas
    caja(1.02, 0.052, 1.02, mat.maderaMiel, 0, 0.76, 0, true, g);
    caja(1.05, 0.036, 1.05, mat.aceroNegro, 0, 0.725, 0, false, g);
    for (const [lx, lz] of [[-0.44, -0.44], [0.44, -0.44], [-0.44, 0.44], [0.44, 0.44]]) {
      caja(0.04, 0.72, 0.04, mat.aceroNegro, lx, 0.36, lz, true, g);
    }

    // 4 Sillas negras con respaldo de 3 tiras y cojín terracota (ligeramente anguladas con naturalidad)
    [[0, 0.82, 0], [0, -0.82, Math.PI], [0.82, 0, -Math.PI / 2], [-0.82, 0, Math.PI / 2]].forEach(([sx, sz, rot], si) => {
      const s = new THREE.Group();
      s.position.set(sx, 0, sz);
      s.rotation.y = rot + (((m.n + si) % 3) - 1) * 0.09;
      for (const [px, pz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
        caja(0.03, 0.45, 0.03, mat.aceroNegro, px, 0.225, pz, true, s);
      }
      caja(0.41, 0.055, 0.41, mat.cojinTerracota, 0, 0.47, 0, true, s);
      caja(0.03, 0.44, 0.03, mat.aceroNegro, -0.18, 0.69, 0.18, true, s);
      caja(0.03, 0.44, 0.03, mat.aceroNegro, 0.18, 0.69, 0.18, true, s);
      for (const ry of [0.58, 0.72, 0.86]) {
        caja(0.37, 0.042, 0.022, mat.aceroNegro, 0, ry, 0.19, true, s);
      }
      g.add(s);
    });

    // Props hiperreales tomados de 2_comida.jpg y 1_interior.jpg:
    // Canastita roja + papel cuadros + 3 tacos dorados + clamato alto con servilleta, borde de tajín y popote
    if (m.n % 2 === 1 || m.n === mesaN) {
      caja(0.3, 0.055, 0.2, mat.platoRojo, -0.14, 0.815, 0.06, false, g);
      caja(0.26, 0.012, 0.16, mat.papelCuadros, -0.14, 0.848, 0.06, false, g);
      for (let tk = -1; tk <= 1; tk++) {
        const taco = new THREE.Mesh(tacoGeo, mat.tortilla);
        taco.rotation.z = Math.PI / 2;
        taco.rotation.y = 0.2;
        taco.position.set(-0.14 + tk * 0.065, 0.865, 0.06);
        g.add(taco);
        caja(0.035, 0.015, 0.08, mat.queso, -0.14 + tk * 0.065, 0.885, 0.06, false, g);
      }
      // Vaso alto de Clamato sobre servilleta blanca + borde rojo + popote
      caja(0.14, 0.008, 0.14, mat.servilleta, 0.2, 0.79, -0.08, false, g);
      const vaso = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.036, 0.17, 10), mat.clamato);
      vaso.position.set(0.2, 0.878, -0.08);
      const borde = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.006, 6, 12), mat.tajin);
      borde.rotation.x = Math.PI / 2;
      borde.position.set(0.2, 0.962, -0.08);
      const popote = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.23, 5), mat.popote);
      popote.position.set(0.21, 0.92, -0.08);
      popote.rotation.z = -0.16;
      g.add(vaso, borde, popote);
    } else {
      // Tina galvanizada con hielo + 5 cervezas asomando (exacto a la carta "Tina con 5 cervezas $180")
      const tinaG = new THREE.Group();
      tinaG.position.set(0.06, 0.785, 0);
      const cubeta = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.102, 0.19, 14), mat.galvanizado);
      cubeta.position.y = 0.095;
      tinaG.add(cubeta);
      const hieloTop = new THREE.Mesh(new THREE.CylinderGeometry(0.122, 0.115, 0.03, 12), mat.hielo);
      hieloTop.position.y = 0.175;
      tinaG.add(hieloTop);
      for (let b = 0; b < 5; b++) {
        const ang = (b / 5) * Math.PI * 2 + 0.3;
        const bm = b % 2 === 0 ? mat.botellaAmbar : mat.botellaVerde;
        const bg = new THREE.Group();
        const body = new THREE.Mesh(miniBotGeo, bm);
        body.position.y = 0.075;
        const neck = new THREE.Mesh(miniNeckGeo, bm);
        neck.position.y = 0.175;
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.012, 6), mat.tapaOro);
        cap.position.y = 0.21;
        bg.add(body, neck, cap);
        bg.position.set(Math.cos(ang) * 0.058, 0.08, Math.sin(ang) * 0.058);
        bg.rotation.z = -Math.cos(ang) * 0.24;
        bg.rotation.x = Math.sin(ang) * 0.24;
        tinaG.add(bg);
      }
      g.add(tinaG);
    }

    const isMine = m.n === mesaN;
    const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.tableNumber(m.n, isMine), depthWrite: false }));
    badge.scale.setScalar(isMine ? 0.56 : 0.32);
    badge.position.y = isMine ? 1.52 : 1.24;
    g.add(badge);
    mesaBadges.set(m.n, badge);

    const ch = addCharco(m.x, m.z, 2.9, isMine ? 0.56 : 0.24, isMine ? 0xff6238 : 0xffbe75);
    mesaCharcos.set(m.n, ch);
    scene.add(g);
  });

  // ---------------- Lluvia ----------------
  const lluviaN = 640, lluviaPos = new Float32Array(lluviaN * 6), lluviaVel = new Float32Array(lluviaN);
  for (let i = 0; i < lluviaN; i++) {
    const x = (Math.random() - 0.5) * 32, y = Math.random() * 14, z = (Math.random() - 0.5) * 26;
    lluviaPos.set([x, y, z, x, y + 0.55, z], i * 6);
    lluviaVel[i] = 0.75 + Math.random() * 0.55;
  }
  const lluviaGeo = new THREE.BufferGeometry();
  lluviaGeo.setAttribute("position", new THREE.BufferAttribute(lluviaPos, 3));
  const lluviaMat = new THREE.LineBasicMaterial({ color: 0xaecbff, transparent: true, opacity: 0.42 });
  const lluvia = new THREE.LineSegments(lluviaGeo, lluviaMat);
  lluvia.visible = false;
  scene.add(lluvia);

  // ---------------- Zonas Interactivas con Pin (cámaras 100% despejadas) ----------------
  const ringGeo = new THREE.RingGeometry(1.35, 1.62, 48);
  const zonas = {};
  const hitboxes = [];
  function zona(id, pin, mira, cam, tam) {
    const ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: TERRACOTA, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(mira[0], 0.045, mira[2]);
    ring.scale.setScalar(Math.max(tam[0], tam[2]) / 3.4);
    scene.add(ring);

    const hb = new THREE.Mesh(new THREE.BoxGeometry(...tam), new THREE.MeshBasicMaterial({ visible: false }));
    hb.position.set(mira[0], tam[1] / 2, mira[2]);
    hb.userData.localId = id;
    scene.add(hb);
    hitboxes.push(hb);

    zonas[id] = { id, pinPos: new THREE.Vector3(...pin), lookAt: new THREE.Vector3(...mira), camPos: new THREE.Vector3(...cam), ring, hb };
  }

  const getMesaObj = (n) => MESAS[Math.min(12, Math.max(1, n)) - 1];
  let tuMesa = getMesaObj(mesaN);

  zona("mesa", [tuMesa.x, 2.2, tuMesa.z], [tuMesa.x, 0.88, tuMesa.z], [tuMesa.x - 1.4, 3.2, tuMesa.z + 4.4], [2.4, 1.6, 2.4]);
  zona("barra", [-5.85, 4.25, -1.2], [-6.2, 1.85, -1.2], [2.2, 2.75, 2.0], [4.6, 3.5, 8.0]);
  zona("neon", [10.0, 3.65, -3.1], [10.35, 2.12, -3.1], [4.1, 2.12, -3.1], [1.6, 3.2, 3.0]);
  zona("loteria", [10.0, 3.65, 2.1], [10.35, 2.12, 2.1], [4.1, 2.12, 2.1], [1.6, 3.2, 3.0]);
  zona("pantalla", [-0.8, 4.1, -4.5], [-0.8, 3.15, -4.5], [-0.6, 2.35, 1.4], [2.4, 2.6, 1.8]);
  zona("entrada", [0, 5.75, 8.5], [0, 2.45, 8.5], [0.6, 2.45, 20.6], [12.0, 4.5, 1.8]);

  // Permite cambiar de mesa en vivo desde la interfaz QR
  function setMesa(nuevoNumero) {
    const n = Math.min(12, Math.max(1, Number(nuevoNumero) || 12));
    if (n === mesaN) return;
    const prev = mesaN;
    mesaN = n;
    tuMesa = getMesaObj(mesaN);

    [prev, mesaN].forEach((id) => {
      const isMine = id === mesaN;
      const b = mesaBadges.get(id);
      if (b) {
        b.material.map?.dispose?.();
        b.material.map = tex.tableNumber(id, isMine);
        b.material.needsUpdate = true;
        b.scale.setScalar(isMine ? 0.56 : 0.32);
        b.position.y = isMine ? 1.52 : 1.24;
      }
      const ch = mesaCharcos.get(id);
      if (ch) {
        ch.base = isMine ? 0.56 : 0.24;
        ch.mat.color.setHex(isMine ? 0xff6238 : 0xffbe75);
      }
    });

    const zm = zonas.mesa;
    zm.pinPos.set(tuMesa.x, 2.2, tuMesa.z);
    zm.lookAt.set(tuMesa.x, 0.88, tuMesa.z);
    zm.camPos.set(tuMesa.x - 1.4, 3.2, tuMesa.z + 4.4);
    zm.ring.position.set(tuMesa.x, 0.045, tuMesa.z);
    zm.hb.position.set(tuMesa.x, 0.8, tuMesa.z);
    if (pinEls.mesa) pinEls.mesa.querySelector("span").textContent = `Tu mesa ${mesaN}`;
  }

  // ---------------- Motor de Clima ----------------
  let clima = { phase: "night", temp: 22, wind: 8, clouds: 14, rain: 0, storm: false };
  let calidaBase = 42, siguienteRayo = 0, rayo = 0;

  function setWeather(next = {}) {
    clima = { ...clima, ...next };
    const { phase, clouds, rain } = clima;
    const nubes = Math.min(1, Math.max(0, (clouds || 0) / 100));
    const moja = Math.min(1, rain || 0);

    let noche = 1;
    if (phase === "day") {
      noche = 0.16 + nubes * 0.25 + moja * 0.25;
      skyUniforms.uZenith.value.setHex(0x1f6fd4).lerp(new THREE.Color(0x364152), nubes * 0.8 + moja * 0.4);
      skyUniforms.uHorizon.value.setHex(0x9bd2ff).lerp(new THREE.Color(0x64748b), nubes * 0.78 + moja * 0.4);
      skyUniforms.uStars.value = 0;
      hemi.color.setHex(0xbbe0ff); hemi.groundColor.setHex(0x6e5f4f); hemi.intensity = 1.25 - nubes * 0.35;
      luna.color.setHex(0xfff4de); luna.position.set(20, 32, 14); luna.intensity = 2.05 - nubes * 1.1 - moja * 0.35;
      sceneFog.color.setHex(0x88b4dc).lerp(new THREE.Color(0x4b586b), nubes * 0.8);
      sceneFog.density = 0.0042 + nubes * 0.004 + moja * 0.006;
      renderer.toneMappingExposure = 1.04;
      scene.environmentIntensity = 0.78;
    } else if (phase === "sunset") {
      noche = 0.65;
      skyUniforms.uZenith.value.setHex(0x182348);
      skyUniforms.uHorizon.value.setHex(0xe57a4e).lerp(new THREE.Color(0x6b5661), nubes * 0.65);
      skyUniforms.uStars.value = 0.25;
      hemi.color.setHex(0xa882b8); hemi.groundColor.setHex(0x3d281c); hemi.intensity = 0.96;
      luna.color.setHex(0xffb066); luna.position.set(-28, 12, 6); luna.intensity = 1.42 - nubes * 0.6;
      sceneFog.color.setHex(0x462d38);
      sceneFog.density = 0.0072 + moja * 0.005;
      renderer.toneMappingExposure = 1.12;
      scene.environmentIntensity = 0.56;
    } else {
      skyUniforms.uZenith.value.setHex(0x050e24);
      skyUniforms.uHorizon.value.setHex(0x1b1a2a).lerp(new THREE.Color(0x222836), nubes * 0.6);
      skyUniforms.uStars.value = 1;
      hemi.color.setHex(0x6e85c4); hemi.groundColor.setHex(0x261812); hemi.intensity = 0.72 - moja * 0.12;
      luna.color.setHex(0xc2d8ff); luna.position.set(-16, 28, 14); luna.intensity = 0.68 - nubes * 0.25;
      sceneFog.color.setHex(0x070c1a);
      sceneFog.density = 0.0105 + moja * 0.005;
      renderer.toneMappingExposure = 1.16;
      scene.environmentIntensity = 0.48;
    }

    skyUniforms.uClouds.value = nubes;
    scene.background.copy(sceneFog.color);
    calidaBase = 6 + noche * 38;
    calida.intensity = calidaBase;
    barraLuz.intensity = 6 + noche * 22;
    fachadaLuz.intensity = 4 + noche * 18;
    arcoLuz.intensity = 4 + noche * 14;
    muroDerLuz.intensity = 4 + noche * 14;
    loteriaLight.intensity = 4 + noche * 10;
    neonLight.intensity = 4 + noche * 12;
    haloMat.opacity = 0.12 + noche * 0.64;
    if (redHaloMat) redHaloMat.opacity = 0.22 + noche * 0.58;
    focoMat.color.setHex(noche > 0.35 ? 0xffe8b0 : 0xd6d3c9);
    beamMat.opacity = 0.1 + noche * 0.58;
    charcos.forEach((c) => { c.mat.opacity = c.base * (0.14 + noche * 0.86); });

    mat.grava.roughness = 0.95 - moja * 0.58;
    mat.grava.metalness = moja * 0.32;
    lluvia.visible = moja > 0.02;
    lluviaMat.opacity = moja * 0.5;
    if (clima.storm) siguienteRayo = performance.now() + 2500;
  }

  // ---------------- Cámara Orbital y Presets Cinematográficos ----------------
  const PRESETS = {
    vista: { target: [0.2, 1.6, 0.4], theta: 1.04, phi: 0.95, radius: 24.8 },
    entrada: { target: [0, 2.45, 6.2], theta: Math.PI / 2 - 0.04, phi: 1.46, radius: 14.8 },
    patio: { target: [-5.6, 2.0, -1.2], theta: 0.16, phi: 1.38, radius: 9.4 },
  };
  let interactive = false, autoOrbit = true, selectedId = null;
  const current = {
    target: new THREE.Vector3(...PRESETS.vista.target),
    theta: PRESETS.vista.theta,
    phi: PRESETS.vista.phi,
    radius: PRESETS.vista.radius,
  };
  const goal = { target: current.target.clone(), theta: current.theta, phi: current.phi, radius: current.radius };
  const angulo = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

  function applyCamera() {
    const s = Math.sin(current.phi);
    camera.position.set(
      current.target.x + current.radius * s * Math.cos(current.theta),
      current.target.y + current.radius * Math.cos(current.phi),
      current.target.z + current.radius * s * Math.sin(current.theta)
    );
    camera.lookAt(current.target);
  }
  applyCamera();

  function setSize(w, h) {
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.fov = w / h < 0.85 ? 56 : 44;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  const ro = new ResizeObserver((es) => es.forEach((e) => setSize(Math.round(e.contentRect.width), Math.round(e.contentRect.height))));
  ro.observe(canvas.parentElement);

  const pinEls = {};
  if (pinsLayer) {
    Object.values(zonas).forEach((z) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pin3d" + (z.id === "mesa" ? " tuya" : "");
      b.dataset.id = z.id;
      b.setAttribute("aria-label", `Ver ${z.id} en 3D`);
      b.innerHTML = "<i></i><span></span>";
      b.addEventListener("click", (ev) => { ev.stopPropagation(); selectLocal(z.id); });
      pinsLayer.appendChild(b);
      pinEls[z.id] = b;
    });
  }
  function setPinLabels(labels) {
    Object.entries(labels).forEach(([id, t]) => {
      if (pinEls[id]) pinEls[id].querySelector("span").textContent = t;
    });
  }

  function selectLocal(id, notify = true) {
    const z = zonas[id];
    if (!z) return;
    selectedId = id;
    autoOrbit = false;
    const off = z.camPos.clone().sub(z.lookAt), r = off.length();
    goal.target.copy(z.lookAt);
    goal.radius = r;
    goal.phi = THREE.MathUtils.clamp(Math.acos(off.y / r), 0.25, 1.48);
    goal.theta = Math.atan2(off.z, off.x);
    Object.entries(zonas).forEach(([k, m]) => {
      m.ring.material.opacity = k === id ? 0.88 : 0;
      pinEls[k]?.classList.toggle("on", k === id);
    });
    if (notify && onSelectLocal) onSelectLocal(id);
  }

  function clearSelection() {
    selectedId = null;
    Object.entries(zonas).forEach(([k, m]) => {
      m.ring.material.opacity = 0;
      pinEls[k]?.classList.remove("on");
    });
  }

  function setPreset(name) {
    const p = PRESETS[name] || PRESETS.vista;
    autoOrbit = false;
    clearSelection();
    goal.target.set(...p.target);
    goal.theta = p.theta;
    goal.phi = p.phi;
    goal.radius = p.radius;
  }

  function setInteractive(on) {
    interactive = on;
    if (!on) {
      autoOrbit = true;
      clearSelection();
      goal.target.set(...PRESETS.vista.target);
      goal.phi = PRESETS.vista.phi;
      goal.radius = PRESETS.vista.radius;
    }
  }

  // ---------------- Toque / Mouse ----------------
  const ptrs = new Map();
  let inicio = null, movido = 0, tDown = 0, pinza = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const distPinza = () => {
    const p = [...ptrs.values()];
    return p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  };

  canvas.addEventListener("pointerdown", (e) => {
    if (!interactive) return;
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    autoOrbit = false;
    if (ptrs.size === 1) { inicio = { x: e.clientX, y: e.clientY }; movido = 0; tDown = performance.now(); }
    else if (ptrs.size === 2) pinza = distPinza();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!interactive || !ptrs.has(e.pointerId)) return;
    const prev = ptrs.get(e.pointerId), dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) {
      movido += Math.hypot(dx, dy);
      goal.theta += dx * 0.0065;
      goal.phi = THREE.MathUtils.clamp(goal.phi - dy * 0.0055, 0.22, 1.48);
    } else if (ptrs.size === 2) {
      const d = distPinza();
      if (pinza > 0) goal.radius = THREE.MathUtils.clamp(goal.radius - (d - pinza) * 0.045, 5.2, 34);
      pinza = d;
    }
  });
  function soltar(e) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinza = 0;
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
  canvas.addEventListener("wheel", (e) => {
    if (!interactive) return;
    e.preventDefault();
    autoOrbit = false;
    goal.radius = THREE.MathUtils.clamp(goal.radius + e.deltaY * 0.015, 5.2, 34);
  }, { passive: false });

  // ---------------- Bucle con separación automática de pins 2D ----------------
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pv = new THREE.Vector3();
  let ultimo = performance.now(), lastTvTick = 0, raf = 0;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { ultimo = now; return; }
    const dt = Math.min(0.05, (now - ultimo) / 1000);
    ultimo = now;

    if (autoOrbit && !quieto) goal.theta += dt * (interactive ? 0.022 : 0.028);
    const k = 1 - Math.exp(-dt * 6.8);
    current.target.lerp(goal.target, k);
    current.theta += angulo(current.theta, goal.theta) * k;
    current.phi += (goal.phi - current.phi) * k;
    current.radius += (goal.radius - current.radius) * k;

    if (!quieto) {
      const t = now * 0.001;
      skyUniforms.uTime.value = t;
      calida.intensity = calidaBase + Math.sin(t * 2.0) * (calidaBase > 15 ? 1.8 : 0.3);
      const viento = 0.25 + Math.min(2.2, (clima.wind || 0) / 12);
      arboles.forEach((p) => { p.obj.rotation.z = Math.sin(t * 1.3 + p.fase) * 0.022 * viento; });

      if (lluvia.visible) {
        const a = lluviaGeo.attributes.position.array, caida = (15 + clima.rain * 9) * dt, vx = (clima.wind || 0) * 0.14 * dt;
        for (let i = 0; i < lluviaN; i++) {
          const j = i * 6;
          a[j] += vx * lluviaVel[i];
          a[j + 1] -= caida * lluviaVel[i];
          if (a[j + 1] < 0) {
            a[j + 1] = 13.5 + Math.random() * 1.5;
            a[j] = (Math.random() - 0.5) * 32;
            a[j + 2] = (Math.random() - 0.5) * 26;
          }
          if (a[j] > 16) a[j] -= 32;
          a[j + 3] = a[j] - (clima.wind || 0) * 0.015;
          a[j + 4] = a[j + 1] + 0.55;
          a[j + 5] = a[j + 2];
        }
        lluviaGeo.attributes.position.needsUpdate = true;
        if (clima.storm && now > siguienteRayo) { rayo = 0.65; siguienteRayo = now + 4500 + Math.random() * 6000; }
      }
      rayo = rayo > 0.001 ? rayo * Math.exp(-dt * 9) : 0;
      skyUniforms.uFlash.value = rayo;

      if (now - lastTvTick > 150) {
        tex.updateTvScreen(t);
        lastTvTick = now;
      }
    }

    applyCamera();
    renderer.render(scene, camera);

    if (pinsLayer && interactive) {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const minY = 128, maxY = h - 120;
      const visibles = [];

      Object.values(zonas).forEach((z) => {
        const el = pinEls[z.id];
        if (!el) return;
        pv.copy(z.pinPos).project(camera);
        const ve = pv.z < 1 && Math.abs(pv.x) < 1.1 && Math.abs(pv.y) < 1.1 && !selectedId;
        el.style.opacity = ve ? "1" : "0";
        el.style.pointerEvents = ve ? "auto" : "none";
        if (ve) {
          const bw = Math.max(88, el.offsetWidth || 110);
          const padX = Math.min(bw / 2 + 10, w * 0.44);
          visibles.push({
            el,
            w: bw + 10,
            h: 40,
            x: Math.min(w - padX, Math.max(padX, (pv.x * 0.5 + 0.5) * w)),
            y: Math.min(maxY, Math.max(minY, (-pv.y * 0.5 + 0.5) * h)),
            padX,
          });
        }
      });

      // Separación suave de pins superpuestos (4 pasadas para cero colisiones)
      for (let pass = 0; pass < 4; pass++) {
        for (let i = 0; i < visibles.length; i++) {
          for (let j = i + 1; j < visibles.length; j++) {
            const a = visibles[i], b = visibles[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const ox = (a.w + b.w) * 0.5 - Math.abs(dx);
            const oy = (a.h + b.h) * 0.5 - Math.abs(dy);
            if (ox > 0 && oy > 0) {
              if (oy <= ox * 0.85) {
                const push = oy * 0.55 * (dy >= 0 ? 1 : -1);
                a.y = Math.min(maxY, Math.max(minY, a.y - push));
                b.y = Math.min(maxY, Math.max(minY, b.y + push));
              } else {
                const push = ox * 0.52 * (dx >= 0 ? 1 : -1);
                a.x = Math.min(w - a.padX, Math.max(a.padX, a.x - push));
                b.x = Math.min(w - b.padX, Math.max(b.padX, b.x + push));
              }
            }
          }
        }
      }
      visibles.forEach((p) => {
        p.el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      });
    }
  }

  setSize(canvas.parentElement.clientWidth, canvas.parentElement.clientHeight);
  setWeather({});
  raf = requestAnimationFrame(frame);
  onReady?.();

  return {
    setInteractive,
    setPreset,
    selectLocal,
    clearSelection,
    setPinLabels,
    setWeather,
    setMesa,
    get mesa() { return mesaN; },
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); },
  };
}
