import * as THREE from "three";
import { RoomEnvironment } from "./RoomEnvironment.js";
import { createTerrazaTextures } from "./texturas.js";

/**
 * Escena 3D interactiva basada en el lugar real de Terraza Allende (Allende #572, Gómez Palacio, Dgo.).
 * Fachada de carrizo oscuro con letrero rojo "TERRAZA ALLENDE" y marcos negros abiertos, suelo de grava,
 * techo de lámina acanalada con vigas negras, guirnaldas de focos Edison, malla sombra terracota,
 * barra con aro metálico colgante y bancos altos, muro de carrizo natural con luces rasantes,
 * tablero de Lotería real, letrero neón "Esta es la vida que nos gusta", pantallas en vivo,
 * árbol iluminado, arco terracota al fondo, aires lavados y 12 mesas numeradas.
 */
const TERRACOTA = 0xff5d38;

export function initTerraza3D({ canvas, pinsLayer, mesa = 12, onSelectLocal, onReady }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const sceneFog = new THREE.FogExp2(0x090b14, 0.011);
  scene.fog = sceneFog;
  scene.background = new THREE.Color(0x090b14);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(44, 1, 0.3, 200);
  const tex = createTerrazaTextures();

  // ---------------- Cielo dinámico ----------------
  const skyUniforms = {
    uZenith: { value: new THREE.Color(0x040712) },
    uHorizon: { value: new THREE.Color(0x1f1924) },
    uStars: { value: 1 },
    uClouds: { value: 0.15 },
    uTime: { value: 0 },
    uFlash: { value: 0 },
  };
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(95, 28, 18),
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
          vec3 col = mix(uHorizon, uZenith, pow(h, 0.52));
          if (uStars > 0.01 && h > 0.08) {
            vec2 sp = floor(vDir.xz / (h + 0.35) * 90.0);
            float st = step(0.994, hash(sp)) * smoothstep(0.08, 0.35, h);
            col += vec3(0.9,0.95,1.0) * st * uStars * (1.0 - uClouds * 0.85);
          }
          if (uClouds > 0.02 && h > 0.03) {
            vec2 uv = vDir.xz / (h + 0.24) * 1.4 + vec2(uTime * 0.018, uTime * 0.008);
            float n = noise(uv) * 0.65 + noise(uv * 2.3 + 4.2) * 0.35;
            float mask = smoothstep(0.58 - uClouds * 0.36, 0.88 - uClouds * 0.22, n) * smoothstep(0.02, 0.28, h);
            vec3 cloudCol = mix(uHorizon * 1.15, vec3(0.86,0.9,0.96), step(0.35, dot(uZenith, vec3(0.33))));
            col = mix(col, cloudCol, mask * (0.45 + 0.4 * uClouds));
          }
          col += vec3(0.7,0.82,1.0) * uFlash;
          gl_FragColor = vec4(col, 1.0);
        }`,
    })
  ));

  // ---------------- Luces ----------------
  const hemi = new THREE.HemisphereLight(0x7485bd, 0x261a14, 0.72);
  scene.add(hemi);

  const luna = new THREE.DirectionalLight(0xc2d5ff, 0.65);
  luna.position.set(-16, 28, 12);
  luna.castShadow = true;
  luna.shadow.mapSize.set(1024, 1024);
  Object.assign(luna.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 72 });
  luna.shadow.bias = -0.0007;
  scene.add(luna);

  const calida = new THREE.PointLight(0xffb46b, 40, 28, 1.4);
  calida.position.set(0.5, 4.3, 0.5);
  scene.add(calida);

  const barraLuz = new THREE.PointLight(0xffaa5a, 24, 15, 1.48);
  barraLuz.position.set(-5.8, 3.2, -1.0);
  scene.add(barraLuz);

  const fachadaLuz = new THREE.PointLight(0xff4226, 18, 14, 1.5);
  fachadaLuz.position.set(0, 4.2, 10.2);
  scene.add(fachadaLuz);

  const arcoLuz = new THREE.PointLight(0xff9b42, 14, 11, 1.5);
  arcoLuz.position.set(1.6, 2.2, -7.2);
  scene.add(arcoLuz);

  const muroDerLuz = new THREE.PointLight(0xff9e54, 15, 13, 1.5);
  muroDerLuz.position.set(8.6, 2.1, -0.5);
  scene.add(muroDerLuz);

  // ---------------- Materiales ----------------
  const mat = {
    grava: new THREE.MeshStandardMaterial({ map: tex.gravelMap, bumpMap: tex.gravelBump, bumpScale: 0.065, roughness: 0.96 }),
    carrizoOscuro: new THREE.MeshStandardMaterial({ map: tex.carrizoOscuro, bumpMap: tex.carrizoBump, bumpScale: 0.04, roughness: 0.88 }),
    carrizoNatural: new THREE.MeshStandardMaterial({ map: tex.carrizoNatural, bumpMap: tex.carrizoBump, bumpScale: 0.04, roughness: 0.86, side: THREE.DoubleSide }),
    lamina: new THREE.MeshStandardMaterial({ map: tex.corrugatedColor, bumpMap: tex.corrugatedBump, bumpScale: 0.045, roughness: 0.48, metalness: 0.6 }),
    mallaSombra: new THREE.MeshStandardMaterial({ map: tex.mallaSombraMap, transparent: true, opacity: 0.88, side: THREE.DoubleSide, roughness: 0.85 }),
    aceroNegro: new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.42, metalness: 0.76 }),
    cromo: new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.25, metalness: 0.9 }),
    maderaMiel: new THREE.MeshStandardMaterial({ map: tex.woodHoney, roughness: 0.28, metalness: 0.06 }),
    barraMuro: new THREE.MeshStandardMaterial({ color: 0x2a2421, roughness: 0.85 }),
    estucoTerracota: new THREE.MeshStandardMaterial({ color: 0xb95a3d, roughness: 0.85 }),
    cojinTerracota: new THREE.MeshStandardMaterial({ color: 0xc84b2a, roughness: 0.78 }),
    galvanizado: new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.48, metalness: 0.55 }),
    calle: new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: 0.92 }),
    banqueta: new THREE.MeshStandardMaterial({ color: 0x5d5a54, roughness: 0.9 }),
    hoja1: new THREE.MeshStandardMaterial({ color: 0x2b5a34, roughness: 0.82 }),
    hoja2: new THREE.MeshStandardMaterial({ color: 0x3b7440, roughness: 0.78 }),
    botellaVerde: new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.18, metalness: 0.1, transparent: true, opacity: 0.88 }),
    botellaAmbar: new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.18, metalness: 0.1, transparent: true, opacity: 0.88 }),
    botellaClara: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.14, metalness: 0.12, transparent: true, opacity: 0.78 }),
    platoRojo: new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.42 }),
    papelCuadros: new THREE.MeshStandardMaterial({ map: tex.checkeredMap, roughness: 0.72 }),
    clamato: new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.22, transparent: true, opacity: 0.88 }),
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
    p.position.set(x, 0.02, z);
    scene.add(p);
    charcos.push({ mat: m, base: op });
  };

  // ---------------- Suelo de grava, banqueta y Av. Allende ----------------
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), new THREE.MeshStandardMaterial({ color: 0x101218, roughness: 0.98 }));
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.y = -0.04;
  suelo.receiveShadow = true;
  scene.add(suelo);

  const patioGrava = new THREE.Mesh(new THREE.PlaneGeometry(21.6, 20.6), mat.grava);
  patioGrava.rotation.x = -Math.PI / 2;
  patioGrava.position.set(0, 0.005, 1.8);
  patioGrava.receiveShadow = true;
  scene.add(patioGrava);

  // Calle Av. Ignacio Allende al frente (+Z)
  caja(60, 0.06, 8.5, mat.calle, 0, 0.01, 16.4, false);
  caja(60, 0.14, 0.24, mat.banqueta, 0, 0.07, 12.1, false);
  // Poste de luz callejero
  const posteCalle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 6.2, 8), mat.aceroNegro);
  posteCalle.position.set(-11.4, 3.1, 12.6);
  const focoCalle = caja(0.5, 0.1, 0.24, new THREE.MeshBasicMaterial({ color: 0xfff0c4 }), -11.4, 6.1, 12.3, false);
  scene.add(posteCalle, focoCalle);

  // ---------------- Fachada Frontal Real (z = 8.5) ----------------
  {
    const fg = new THREE.Group();
    fg.position.set(0, 0, 8.5);

    // Banda superior de carrizo oscuro con relieve superior irregular (como en la foto nocturna real)
    caja(21.6, 2.65, 0.22, mat.carrizoOscuro, 0, 4.28, 0);
    for (let x = -10.6; x <= 10.6; x += 0.35) {
      const hTip = 0.14 + Math.abs(Math.sin(x * 3.1)) * 0.18;
      caja(0.18, hTip, 0.08, mat.carrizoOscuro, x, 5.6 + hTip / 2, 0.06, false, fg);
    }

    // Letrero rojo monumental "TERRAZA ALLENDE" con tipografía oficial real
    const letrero = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 2.8),
      new THREE.MeshBasicMaterial({ map: tex.signFacadeTex, transparent: true, toneMapped: false, depthWrite: false })
    );
    letrero.position.set(-0.2, 4.28, 0.15);
    fg.add(letrero);

    // Paneles bajos de carrizo oscuro en extremos + bahías abiertas con marco tubular negro
    caja(2.2, 2.95, 0.2, mat.carrizoOscuro, -9.7, 1.475, 0, true, fg);
    caja(2.2, 2.95, 0.2, mat.carrizoOscuro, 9.7, 1.475, 0, true, fg);

    // Marcos de acero negro en las entradas abiertas (doble bahía izquierda + acceso central + bahía derecha)
    const frameSegments = [
      // Larguero superior general bajo el carrizo
      [21.6, 0.1, 0.18, 0, 2.95, 0],
      // Bahía doble izquierda (-8.6 .. -1.6)
      [0.09, 2.95, 0.12, -8.6, 1.475, 0],
      [0.09, 2.95, 0.12, -5.1, 1.475, 0],
      [0.09, 2.95, 0.12, -1.6, 1.475, 0],
      [7.0, 0.08, 0.1, -5.1, 0.06, 0],
      // Bahía derecha (4.6 .. 8.6)
      [0.09, 2.95, 0.12, 4.6, 1.475, 0],
      [0.09, 2.95, 0.12, 8.6, 1.475, 0],
      [4.0, 0.08, 0.1, 6.6, 0.06, 0],
    ];
    frameSegments.forEach(([w, h, d, x, y, z]) => caja(w, h, d, mat.aceroNegro, x, y, z, true, fg));

    scene.add(fg);
    addCharco(0, 10.0, 8.5, 0.32, 0xff5a36);
  }

  // ---------------- Muros Perimetrales de Carrizo Natural y Fondo Terracota ----------------
  // Muro izquierdo tras la barra (carrizo + muro sólido inferior)
  caja(0.24, 1.1, 17.0, mat.barraMuro, -10.65, 0.55, 0);
  caja(0.18, 3.1, 17.0, mat.carrizoNatural, -10.65, 2.65, 0);

  // Muro derecho de carrizo natural con postes de acero y luces rasantes cálidas
  caja(0.22, 0.65, 17.0, mat.estucoTerracota, 10.65, 0.325, 0);
  caja(0.16, 3.3, 17.0, mat.carrizoNatural, 10.65, 2.3, 0);
  for (let pz = -8.2; pz <= 8.2; pz += 4.1) {
    caja(0.14, 4.4, 0.14, mat.aceroNegro, 10.55, 2.2, pz);
  }
  caja(0.12, 0.1, 17.0, mat.aceroNegro, 10.55, 2.65, 0);
  caja(0.12, 0.1, 17.0, mat.aceroNegro, 10.55, 1.15, 0);

  // Haces rasantes de luz cálida subiendo por el carrizo derecho (como en la foto nocturna)
  const beamMat = new THREE.MeshBasicMaterial({
    map: tex.wallBeam,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (const bz of [-6.4, -3.2, 0.0, 3.2, 6.4]) {
    caja(0.24, 0.08, 0.36, mat.aceroNegro, 10.32, 0.05, bz, false);
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.9), beamMat);
    beam.rotation.y = -Math.PI / 2;
    beam.position.set(10.48, 1.55, bz);
    scene.add(beam);
  }

  // Muro trasero (z = -8.5): estuco terracota al centro con arco iluminado + carrizo a los lados
  caja(7.4, 3.8, 0.24, mat.carrizoNatural, -6.9, 1.9, -8.5);
  caja(6.4, 3.8, 0.24, mat.carrizoNatural, 7.4, 1.9, -8.5);
  // Muro terracota del arco
  caja(2.4, 3.6, 0.32, mat.estucoTerracota, -0.6, 1.8, -8.45);
  caja(2.4, 3.6, 0.32, mat.estucoTerracota, 3.6, 1.8, -8.45);
  caja(1.9, 1.2, 0.32, mat.estucoTerracota, 1.5, 3.0, -8.45);
  // Fondo luminoso cálido detrás del arco
  const arcoGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 2.45), new THREE.MeshBasicMaterial({ color: 0xffb35c }));
  arcoGlow.position.set(1.5, 1.22, -8.58);
  scene.add(arcoGlow);

  // Tablero de Lotería real en el muro derecho (z = +2.3) con marco metálico y luz cálida
  const loteriaBoard = new THREE.Group();
  loteriaBoard.position.set(10.42, 2.08, 2.3);
  loteriaBoard.rotation.y = -Math.PI / 2;
  caja(2.58, 2.58, 0.06, mat.aceroNegro, 0, 0, -0.06, true, loteriaBoard);
  caja(2.48, 2.48, 0.08, mat.estucoTerracota, 0, 0, -0.03, true, loteriaBoard);
  const loteriaFace = new THREE.Mesh(
    new THREE.PlaneGeometry(2.38, 2.38),
    new THREE.MeshStandardMaterial({ map: tex.loteriaWallTex, roughness: 0.55 })
  );
  loteriaFace.position.z = 0.015;
  loteriaBoard.add(loteriaFace);
  scene.add(loteriaBoard);
  const loteriaLight = new THREE.PointLight(0xffcf94, 12, 8.5, 1.5);
  loteriaLight.position.set(8.9, 2.4, 2.3);
  scene.add(loteriaLight);

  // Letrero neón real "ESTA ES la vida QUE NOS gusta" en el muro derecho (z = -2.9)
  const neonBoard = new THREE.Group();
  neonBoard.position.set(10.42, 2.08, -2.9);
  neonBoard.rotation.y = -Math.PI / 2;
  caja(2.58, 2.58, 0.06, mat.aceroNegro, 0, 0, -0.06, true, neonBoard);
  caja(2.48, 2.48, 0.08, new THREE.MeshStandardMaterial({ color: 0x6e2719, roughness: 0.78 }), 0, 0, -0.03, true, neonBoard);
  const neonFace = new THREE.Mesh(
    new THREE.PlaneGeometry(2.38, 2.38),
    new THREE.MeshBasicMaterial({ map: tex.neonWallTex, toneMapped: false })
  );
  neonFace.position.z = 0.015;
  neonBoard.add(neonFace);
  scene.add(neonBoard);
  const neonLight = new THREE.PointLight(0xff842b, 14, 9, 1.5);
  neonLight.position.set(9.1, 2.1, -2.9);
  scene.add(neonLight);

  // 2 Aires lavados sobre bases metálicas junto al carrizo derecho (como en la foto interior)
  for (const az of [-6.4, 5.8]) {
    const ac = new THREE.Group();
    ac.position.set(9.85, 0, az);
    caja(0.9, 0.9, 0.9, mat.galvanizado, 0, 1.38, 0, true, ac);
    caja(0.06, 0.95, 0.06, mat.aceroNegro, -0.38, 0.47, -0.38, true, ac);
    caja(0.06, 0.95, 0.06, mat.aceroNegro, 0.38, 0.47, -0.38, true, ac);
    caja(0.06, 0.95, 0.06, mat.aceroNegro, -0.38, 0.47, 0.38, true, ac);
    caja(0.06, 0.95, 0.06, mat.aceroNegro, 0.38, 0.47, 0.38, true, ac);
    caja(0.04, 0.65, 0.65, new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.8 }), -0.46, 1.38, 0, false, ac);
    scene.add(ac);
  }

  // ---------------- Techo Alto de Lámina Acanalada, Vigas Negras y Malla Sombra Terracota ----------------
  {
    // Columnas interiores y perimetrales de acero negro
    for (const cx of [-10.5, -2.2, 4.6, 10.5]) {
      for (const cz of [-8.2, -2.6, 2.9, 8.3]) {
        if (cx === -2.2 && cz === 8.3) continue; // entrada abierta
        if (cx === 4.6 && cz === 8.3) continue;
        caja(0.14, 4.45, 0.14, mat.aceroNegro, cx, 2.225, cz);
      }
    }
    // Columna central visible tras la entrada (como en la foto nocturna)
    caja(0.16, 4.45, 0.16, mat.aceroNegro, 1.2, 2.225, 4.2);

    // Vigas negras principales y largueros del techo
    for (const cz of [-8.2, -2.6, 2.9, 8.3]) {
      caja(21.2, 0.16, 0.14, mat.aceroNegro, 0, 4.42, cz);
    }
    for (let px = -10.2; px <= 10.2; px += 2.55) {
      caja(0.1, 0.12, 16.8, mat.aceroNegro, px, 4.54, 0, false);
    }

    // Lámina acanalada del techo: cara inferior visible al mirar hacia arriba desde adentro,
    // y transparente desde vista aérea para poder explorar todo el patio sin estorbo.
    const roofPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(21.4, 17.0),
      new THREE.MeshStandardMaterial({
        map: tex.corrugatedColor,
        bumpMap: tex.corrugatedBump,
        bumpScale: 0.05,
        roughness: 0.5,
        metalness: 0.55,
        side: THREE.FrontSide,
      })
    );
    roofPlane.rotation.x = Math.PI / 2;
    roofPlane.position.set(0, 4.62, 0);
    scene.add(roofPlane);

    // Faldones de malla sombra terracota en la parte alta derecha y trasera (como en la foto interior real)
    const mallaDer = new THREE.Mesh(new THREE.PlaneGeometry(16.6, 1.45), mat.mallaSombra);
    mallaDer.rotation.y = -Math.PI / 2;
    mallaDer.position.set(10.35, 3.72, 0);
    const mallaTras = new THREE.Mesh(new THREE.PlaneGeometry(20.6, 1.45), mat.mallaSombra);
    mallaTras.position.set(0, 3.72, -8.15);
    scene.add(mallaDer, mallaTras);
  }

  // ---------------- La Barra y Aro Metálico Colgante (Lado Izquierdo) ----------------
  {
    const barra = new THREE.Group();
    barra.position.set(-7.6, 0, -1.2);

    // Mostrador principal en L/recto mirando hacia el patio (+X)
    caja(1.1, 1.06, 7.6, mat.barraMuro, 1.85, 0.53, 0, true, barra);
    caja(1.28, 0.08, 7.8, mat.maderaMiel, 1.85, 1.1, 0, true, barra);
    // Tira LED cálida bajo la cubierta de la barra
    const tiraBarra = caja(0.05, 0.05, 7.5, new THREE.MeshBasicMaterial({ color: 0xff9b52, toneMapped: false }), 2.42, 0.98, 0, false, barra);
    tiraBarra.castShadow = false;

    // Estación trasera de trabajo, enfriador azul y carta real de bebidas
    caja(0.85, 0.92, 6.8, mat.aceroNegro, -1.8, 0.46, 0, true, barra);
    caja(0.88, 0.06, 6.8, mat.cromo, -1.8, 0.95, 0, false, barra);
    const enfriador = caja(0.75, 2.0, 1.05, mat.aceroNegro, -1.85, 1.0, -2.5, true, barra);
    const puertaEnf = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.72), new THREE.MeshBasicMaterial({ map: tex.coolerBlueMap }));
    puertaEnf.rotation.y = Math.PI / 2;
    puertaEnf.position.set(-1.46, 1.04, -2.5);
    barra.add(enfriador, puertaEnf);

    const cartaPanel = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7), new THREE.MeshBasicMaterial({ map: tex.barMenuBoard }));
    cartaPanel.rotation.y = Math.PI / 2;
    cartaPanel.position.set(-2.9, 2.35, 0.2);
    barra.add(cartaPanel);

    // Repisas con botellas detrás de la barra
    for (const ry of [1.55, 2.15]) {
      caja(0.38, 0.05, 3.2, mat.maderaMiel, -2.6, ry, -2.2, true, barra);
      for (let i = 0; i < 10; i++) {
        const bm = i % 3 === 0 ? mat.botellaVerde : i % 3 === 1 ? mat.botellaAmbar : mat.botellaClara;
        const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.28, 8), bm);
        bot.position.set(-2.6, ry + 0.16, -3.55 + i * 0.3);
        barra.add(bot);
      }
    }

    // 6 Bancos altos negros con cojín terracota frente a la barra (como en la foto interior)
    for (let i = 0; i < 6; i++) {
      const bz = -3.0 + i * 1.2;
      const b = new THREE.Group();
      b.position.set(2.85, 0, bz);
      b.rotation.y = -Math.PI / 2;
      for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
        caja(0.038, 0.74, 0.038, mat.aceroNegro, lx, 0.37, lz, true, b);
      }
      caja(0.42, 0.06, 0.42, mat.cojinTerracota, 0, 0.76, 0, true, b);
      // Respaldo metálico de tiras horizontales
      caja(0.038, 0.45, 0.038, mat.aceroNegro, -0.18, 0.99, 0.18, true, b);
      caja(0.038, 0.45, 0.038, mat.aceroNegro, 0.18, 0.99, 0.18, true, b);
      for (const sy of [0.9, 1.04, 1.18]) {
        caja(0.38, 0.045, 0.025, mat.aceroNegro, 0, sy, 0.19, true, b);
      }
      barra.add(b);
    }

    // Signature: Gran aro metálico negro suspendido sobre la barra con botellas y focos (foto interior real!)
    const aro = new THREE.Group();
    aro.position.set(1.8, 3.25, 0);
    const aroRing = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.06, 10, 44), mat.aceroNegro);
    aroRing.rotation.x = Math.PI / 2;
    aroRing.scale.set(1, 1, 2.1);
    aro.add(aroRing);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const rx = Math.cos(a) * 2.15;
      const rz = Math.sin(a) * 2.15;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.35, 6), mat.aceroNegro);
      rod.position.set(rx, 0.68, rz);
      aro.add(rod);
    }
    // Botellas paradas sobre el aro colgante
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const bx = Math.cos(a) * 2.15;
      const bz = Math.sin(a) * 2.15;
      const bm = k % 3 === 0 ? mat.botellaClara : k % 3 === 1 ? mat.botellaAmbar : mat.botellaVerde;
      const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.05, 0.28, 8), bm);
      bot.position.set(bx, 0.26, bz);
      aro.add(bot);
    }
    barra.add(aro);
    scene.add(barra);
    addCharco(-5.6, -1.2, 8.8, 0.48, 0xffaa52);
  }

  // ---------------- Pantallas de TV en Vivo ----------------
  const tvMat = new THREE.MeshBasicMaterial({ map: tex.tvScreenMap, toneMapped: false });
  function addTV(x, y, z, rotY, tiltX = 0.22) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    const screenG = new THREE.Group();
    screenG.rotation.x = tiltX;
    caja(1.75, 1.0, 0.07, mat.aceroNegro, 0, 0, 0, true, screenG);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.66, 0.92), tvMat);
    p.position.z = 0.04;
    screenG.add(p);
    g.add(screenG);
    scene.add(g);
  }
  addTV(-5.8, 3.05, -5.2, 0.35);
  addTV(1.5, 3.15, -2.5, 0.15);
  addTV(6.4, 3.1, -2.4, -0.55);

  // ---------------- Árbol Interior con Luces Cálidas (Foto nocturna) ----------------
  const arboles = [];
  {
    const tree = new THREE.Group();
    tree.position.set(3.8, 0, -4.4);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4b3828, roughness: 0.92 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 2.7, 10), trunkMat);
    trunk.position.y = 1.35;
    trunk.castShadow = true;
    tree.add(trunk);

    // Ramas principales y follaje en la parte alta
    const branches = [
      [0.65, 2.9, 0.35, 0.95],
      [-0.6, 3.1, -0.25, 0.9],
      [0.15, 3.5, -0.55, 0.85],
      [-0.2, 3.4, 0.55, 0.85],
    ];
    const copa = new THREE.Group();
    branches.forEach(([bx, by, bz, br]) => {
      const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 1.25, 7), trunkMat);
      limb.position.set(bx * 0.45, by - 0.5, bz * 0.45);
      limb.lookAt(bx, by, bz);
      limb.rotateX(Math.PI / 2);
      tree.add(limb);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(br * 0.42, 0), i % 2 ? mat.hoja1 : mat.hoja2);
        leaf.position.set(bx + Math.cos(a) * br * 0.55, by + ((i % 3) - 1) * 0.22, bz + Math.sin(a) * br * 0.55);
        leaf.castShadow = true;
        copa.add(leaf);
      }
    });
    tree.add(copa);
    arboles.push({ obj: copa, fase: 0.4 });

    // Lucecitas cálidas enrolladas en el tronco (como en la foto nocturna de la entrada)
    const fairyMat = new THREE.MeshBasicMaterial({ color: 0xffe49e });
    for (let fy = 0.45; fy <= 2.75; fy += 0.14) {
      const ang = fy * 7.5;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 6), fairyMat);
      dot.position.set(Math.cos(ang) * 0.21, fy, Math.sin(ang) * 0.21);
      tree.add(dot);
    }
    scene.add(tree);
  }

  // ---------------- Guirnaldas de Focos Edison bajo el Techo ----------------
  const focos = [];
  const cableMat = new THREE.MeshBasicMaterial({ color: 0x111216 });
  const tramos = [];
  for (const x of [-8.2, -3.4, 1.4, 6.2, 9.2]) {
    tramos.push([new THREE.Vector3(x, 4.35, -8.0), new THREE.Vector3(x, 4.35, 8.0)]);
  }
  for (const z of [-5.4, 0.2, 5.6]) {
    tramos.push([new THREE.Vector3(-10.0, 4.32, z), new THREE.Vector3(10.0, 4.32, z)]);
  }
  // Focos colgantes del aro metálico sobre la barra
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    focos.push(new THREE.Vector3(-5.8 + Math.cos(a) * 2.15, 3.12, -1.2 + Math.sin(a) * 2.15));
  }

  tramos.forEach(([a, b]) => {
    const pts = [];
    const n = Math.max(8, Math.round(a.distanceTo(b) / 1.45));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = a.clone().lerp(b, t);
      p.y -= Math.sin(Math.PI * t) * 0.28;
      pts.push(p);
      if (i > 0 && i < n) focos.push(p.clone().add(new THREE.Vector3(0, -0.08, 0)));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cableMat));
  });

  const focoMat = new THREE.MeshBasicMaterial({ color: 0xffe4a8 });
  const focosMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 8, 8), focoMat, focos.length);
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
    h.scale.setScalar(0.55);
    scene.add(h);
  });
  scene.add(focosMesh);

  // ---------------- 12 Mesas Reales de Madera Miel y Sillas con Cojín Terracota ----------------
  const mesaN = Math.min(12, Math.max(1, Number(mesa) || 12));
  const MESAS = [];
  [-2.6, 1.6, 6.2].forEach((x, ci) =>
    [-5.0, -1.6, 1.8, 5.2].forEach((z, ri) =>
      MESAS.push({ n: MESAS.length + 1, x: x + (ri % 2) * 0.35, z: z + (ci % 2) * 0.25 })
    )
  );

  let tuMesa = MESAS[MESAS.length - 1];
  MESAS.forEach((m) => {
    const g = new THREE.Group();
    g.position.set(m.x, 0, m.z);
    g.rotation.y = ((m.n % 3) - 1) * 0.08;

    // Cubierta cuadrada barnizada miel + 4 patas cuadradas de acero negro
    caja(1.02, 0.055, 1.02, mat.maderaMiel, 0, 0.76, 0, true, g);
    caja(1.04, 0.035, 1.04, mat.aceroNegro, 0, 0.725, 0, false, g);
    for (const [lx, lz] of [[-0.44, -0.44], [0.44, -0.44], [-0.44, 0.44], [0.44, 0.44]]) {
      caja(0.04, 0.72, 0.04, mat.aceroNegro, lx, 0.36, lz, true, g);
    }

    // 4 Sillas negras de herrería con 3 tiras horizontales y cojín terracota (como en las fotos reales)
    [[0, 0.82, 0], [0, -0.82, Math.PI], [0.82, 0, -Math.PI / 2], [-0.82, 0, Math.PI / 2]].forEach(([sx, sz, rot]) => {
      const s = new THREE.Group();
      s.position.set(sx, 0, sz);
      s.rotation.y = rot;
      for (const [px, pz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
        caja(0.032, 0.45, 0.032, mat.aceroNegro, px, 0.225, pz, true, s);
      }
      caja(0.41, 0.055, 0.41, mat.cojinTerracota, 0, 0.47, 0, true, s);
      caja(0.032, 0.44, 0.032, mat.aceroNegro, -0.18, 0.69, 0.18, true, s);
      caja(0.032, 0.44, 0.032, mat.aceroNegro, 0.18, 0.69, 0.18, true, s);
      for (const ry of [0.58, 0.72, 0.86]) {
        caja(0.37, 0.042, 0.024, mat.aceroNegro, 0, ry, 0.19, true, s);
      }
      g.add(s);
    });

    // Canastita roja con papel a cuadros + clamatos o tina sobre la mesa
    if (m.n % 2 === 1 || m.n === mesaN) {
      caja(0.28, 0.06, 0.18, mat.platoRojo, -0.12, 0.82, 0.04, false, g);
      caja(0.24, 0.015, 0.15, mat.papelCuadros, -0.12, 0.855, 0.04, false, g);
      const vaso = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.036, 0.15, 10), mat.clamato);
      vaso.position.set(0.18, 0.86, -0.06);
      g.add(vaso);
    } else {
      const tina = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.095, 0.19, 12), mat.galvanizado);
      tina.position.set(0.08, 0.88, 0);
      g.add(tina);
    }

    const num = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.tableNumber(m.n, m.n === mesaN), depthWrite: false }));
    num.scale.setScalar(m.n === mesaN ? 0.62 : 0.4);
    num.position.y = m.n === mesaN ? 1.55 : 1.28;
    g.add(num);

    addCharco(m.x, m.z, 2.8, m.n === mesaN ? 0.55 : 0.25, m.n === mesaN ? 0xff7043 : 0xffbe75);
    scene.add(g);
    if (m.n === mesaN) tuMesa = m;
  });

  // ---------------- Lluvia ----------------
  const lluviaN = 620, lluviaPos = new Float32Array(lluviaN * 6), lluviaVel = new Float32Array(lluviaN);
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

  // ---------------- Zonas Interactivas con Pin ----------------
  const ringGeo = new THREE.RingGeometry(1.4, 1.68, 48);
  const zonas = {};
  const hitboxes = [];
  function zona(id, pin, mira, cam, tam) {
    const ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: TERRACOTA, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(mira[0], 0.05, mira[2]);
    ring.scale.setScalar(Math.max(tam[0], tam[2]) / 3.4);
    scene.add(ring);

    const hb = new THREE.Mesh(new THREE.BoxGeometry(...tam), new THREE.MeshBasicMaterial({ visible: false }));
    hb.position.set(mira[0], tam[1] / 2, mira[2]);
    hb.userData.localId = id;
    scene.add(hb);
    hitboxes.push(hb);

    zonas[id] = { id, pinPos: new THREE.Vector3(...pin), lookAt: new THREE.Vector3(...mira), camPos: new THREE.Vector3(...cam), ring };
  }

  zona("mesa", [tuMesa.x, 2.25, tuMesa.z], [tuMesa.x, 0.85, tuMesa.z], [tuMesa.x + 2.4, 3.9, tuMesa.z + 4.8], [2.4, 1.6, 2.4]);
  zona("barra", [-5.8, 4.15, -1.2], [-6.2, 1.65, -1.2], [2.4, 3.2, 2.8], [4.6, 3.5, 8.0]);
  zona("neon", [10.1, 3.55, -2.9], [10.2, 2.05, -2.9], [3.6, 2.25, -2.4], [1.6, 3.2, 3.0]);
  zona("loteria", [10.1, 3.55, 2.3], [10.2, 2.05, 2.3], [3.6, 2.25, 2.8], [1.6, 3.2, 3.0]);
  zona("pantalla", [1.5, 4.1, -2.5], [1.5, 2.9, -2.5], [1.6, 2.3, 3.6], [2.4, 2.6, 1.8]);
  zona("entrada", [0, 5.2, 8.5], [0, 2.2, 8.5], [0.8, 2.5, 19.8], [12.0, 4.2, 1.8]);

  // ---------------- Motor de Clima ----------------
  let clima = { phase: "night", temp: 22, wind: 8, clouds: 15, rain: 0, storm: false };
  let calidaBase = 40, siguienteRayo = 0, rayo = 0;

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
      sceneFog.density = 0.0045 + nubes * 0.004 + moja * 0.006;
      renderer.toneMappingExposure = 1.05;
      scene.environmentIntensity = 0.75;
    } else if (phase === "sunset") {
      noche = 0.65;
      skyUniforms.uZenith.value.setHex(0x1a2346);
      skyUniforms.uHorizon.value.setHex(0xe47b52).lerp(new THREE.Color(0x6b5661), nubes * 0.65);
      skyUniforms.uStars.value = 0.28;
      hemi.color.setHex(0xa882b8); hemi.groundColor.setHex(0x3d281c); hemi.intensity = 0.95;
      luna.color.setHex(0xffb066); luna.position.set(-28, 12, 6); luna.intensity = 1.4 - nubes * 0.6;
      sceneFog.color.setHex(0x4a313b);
      sceneFog.density = 0.0075 + moja * 0.005;
      renderer.toneMappingExposure = 1.12;
      scene.environmentIntensity = 0.55;
    } else {
      skyUniforms.uZenith.value.setHex(0x040712);
      skyUniforms.uHorizon.value.setHex(0x1f1924).lerp(new THREE.Color(0x222836), nubes * 0.6);
      skyUniforms.uStars.value = 1;
      hemi.color.setHex(0x7485bd); hemi.groundColor.setHex(0x261a14); hemi.intensity = 0.72 - moja * 0.12;
      luna.color.setHex(0xc2d5ff); luna.position.set(-16, 28, 12); luna.intensity = 0.65 - nubes * 0.25;
      sceneFog.color.setHex(0x090b14);
      sceneFog.density = 0.011 + moja * 0.005;
      renderer.toneMappingExposure = 1.15;
      scene.environmentIntensity = 0.45;
    }

    skyUniforms.uClouds.value = nubes;
    scene.background.copy(sceneFog.color);
    calidaBase = 5 + noche * 36;
    calida.intensity = calidaBase;
    barraLuz.intensity = 5 + noche * 19;
    fachadaLuz.intensity = 3 + noche * 15;
    arcoLuz.intensity = 3 + noche * 11;
    muroDerLuz.intensity = 3 + noche * 12;
    loteriaLight.intensity = 3 + noche * 9;
    neonLight.intensity = 4 + noche * 10;
    haloMat.opacity = 0.1 + noche * 0.65;
    focoMat.color.setHex(noche > 0.35 ? 0xffe4a8 : 0xd6d3c9);
    beamMat.opacity = 0.08 + noche * 0.55;
    charcos.forEach((c) => { c.mat.opacity = c.base * (0.14 + noche * 0.86); });

    mat.grava.roughness = 0.96 - moja * 0.58;
    mat.grava.metalness = moja * 0.3;
    lluvia.visible = moja > 0.02;
    lluviaMat.opacity = moja * 0.5;
    if (clima.storm) siguienteRayo = performance.now() + 2500;
  }

  // ---------------- Cámara Orbital y Presets ----------------
  const PRESETS = {
    vista: { target: [0.4, 1.6, 0.8], theta: 1.08, phi: 0.96, radius: 25.0 },
    entrada: { target: [0, 1.9, 5.2], theta: Math.PI / 2 - 0.06, phi: 1.44, radius: 13.6 },
    patio: { target: [-2.2, 1.8, -1.2], theta: 0.38, phi: 1.32, radius: 11.4 },
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
    camera.fov = w / h < 0.85 ? 58 : 44;
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
    goal.phi = THREE.MathUtils.clamp(Math.acos(off.y / r), 0.25, 1.44);
    goal.theta = Math.atan2(off.z, off.x);
    Object.entries(zonas).forEach(([k, m]) => {
      m.ring.material.opacity = k === id ? 0.85 : 0;
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
      goal.phi = THREE.MathUtils.clamp(goal.phi - dy * 0.0055, 0.22, 1.44);
    } else if (ptrs.size === 2) {
      const d = distPinza();
      if (pinza > 0) goal.radius = THREE.MathUtils.clamp(goal.radius - (d - pinza) * 0.045, 5.5, 34);
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
    goal.radius = THREE.MathUtils.clamp(goal.radius + e.deltaY * 0.015, 5.5, 34);
  }, { passive: false });

  // ---------------- Bucle ----------------
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pv = new THREE.Vector3();
  let ultimo = performance.now(), lastTvTick = 0, raf = 0;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { ultimo = now; return; }
    const dt = Math.min(0.05, (now - ultimo) / 1000);
    ultimo = now;

    if (autoOrbit && !quieto) goal.theta += dt * (interactive ? 0.025 : 0.032);
    const k = 1 - Math.exp(-dt * 7.5);
    current.target.lerp(goal.target, k);
    current.theta += angulo(current.theta, goal.theta) * k;
    current.phi += (goal.phi - current.phi) * k;
    current.radius += (goal.radius - current.radius) * k;

    if (!quieto) {
      const t = now * 0.001;
      skyUniforms.uTime.value = t;
      calida.intensity = calidaBase + Math.sin(t * 2.2) * (calidaBase > 15 ? 2.2 : 0.35);
      const viento = 0.3 + Math.min(2.4, (clima.wind || 0) / 11);
      arboles.forEach((p) => { p.obj.rotation.z = Math.sin(t * 1.5 + p.fase) * 0.025 * viento; });

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

      if (now - lastTvTick > 140) {
        tex.updateTvScreen(t);
        lastTvTick = now;
      }
    }

    applyCamera();
    renderer.render(scene, camera);

    if (pinsLayer && interactive) {
      const w = canvas.clientWidth, h = canvas.clientHeight, padX = Math.min(82, w * 0.2);
      Object.values(zonas).forEach((z) => {
        const el = pinEls[z.id];
        if (!el) return;
        pv.copy(z.pinPos).project(camera);
        const ve = pv.z < 1 && Math.abs(pv.x) < 1.15 && Math.abs(pv.y) < 1.15 && !selectedId;
        el.style.opacity = ve ? "1" : "0";
        el.style.pointerEvents = ve ? "auto" : "none";
        if (ve) {
          const px = Math.min(w - padX, Math.max(padX, (pv.x * 0.5 + 0.5) * w));
          const py = Math.min(h - 108, Math.max(118, (-pv.y * 0.5 + 0.5) * h));
          el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -100%)`;
        }
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
    mesa: mesaN,
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); },
  };
}
