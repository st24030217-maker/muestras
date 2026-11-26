import * as THREE from "three";
import { RoomEnvironment } from "./RoomEnvironment.js";
import { createParkTextures } from "./texturas.js";

/**
 * Escena 3D interactiva y detallada de El Patio Food Park & Bar (Av. Belisario Domínguez #760, Lerdo).
 * Incluye cielo crepuscular, banqueta y calle con haces de luz rasante, portón negro acanalado arqueado,
 * pasillo de durmientes con cuerda, mástil central con guirnaldas de focos cálidos, The Bar con vigas,
 * estantes 3D de botellas, banderines y ventiladores animados, locales con cocinas abiertas iluminadas y
 * menús interiores, sillas Acapulco caladas, cubetas de cerveza, árboles orgánicos, pérgola y pantalla en vivo.
 */
export function initPatio3D({ canvas, pinsLayer, onSelectLocal, onReady }) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const fogColor = new THREE.Color(0x090f1d);
  scene.background = fogColor.clone();
  const sceneFog = new THREE.FogExp2(0x090f1d, 0.0115);
  scene.fog = sceneFog;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.48;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(44, 1, 0.3, 180);
  const tex = createParkTextures();

  // ---------------- Cielo dinámico (Día / Atardecer / Noche / Nubes por API del clima) ----------------
  const skyUniforms = {
    uZenith: { value: new THREE.Color(0x03060f) },
    uHorizon: { value: new THREE.Color(0x182136) },
    uStars: { value: 1.0 },
    uClouds: { value: 0.15 },
    uTime: { value: 0.0 },
    uFlash: { value: 0.0 },
  };
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(95, 28, 18),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: skyUniforms,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uZenith;
        uniform vec3 uHorizon;
        uniform float uStars;
        uniform float uClouds;
        uniform float uTime;
        uniform float uFlash;
        varying vec3 vDir;
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }
        void main() {
          float h = clamp(vDir.y, 0.0, 1.0);
          vec3 col = mix(uHorizon, uZenith, pow(h, 0.52));
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
            vec2 uv = vDir.xz / (h + 0.24) * 1.4 + vec2(uTime * 0.018, uTime * 0.008);
            float n = noise(uv) * 0.65 + noise(uv * 2.3 + 4.2) * 0.35;
            float mask = smoothstep(0.58 - uClouds * 0.36, 0.88 - uClouds * 0.22, n) * smoothstep(0.02, 0.28, h);
            vec3 cloudCol = mix(uHorizon * 1.15, vec3(0.86, 0.9, 0.96), step(0.35, dot(uZenith, vec3(0.33))));
            col = mix(col, cloudCol, mask * (0.45 + 0.4 * uClouds));
          }
          col += vec3(0.7, 0.82, 1.0) * uFlash;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
  );
  scene.add(skyDome);

  // ---------------- Iluminación dinámica según hora y clima ----------------
  const hemiLight = new THREE.HemisphereLight(0x6e89bf, 0x261c14, 0.78);
  scene.add(hemiLight);

  const moon = new THREE.DirectionalLight(0xc2d5ff, 0.65);
  moon.position.set(-18, 28, -12);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.near = 4;
  moon.shadow.camera.far = 70;
  moon.shadow.camera.left = -20;
  moon.shadow.camera.right = 20;
  moon.shadow.camera.top = 18;
  moon.shadow.camera.bottom = -18;
  moon.shadow.bias = -0.0008;
  scene.add(moon);

  const patioWarm = new THREE.PointLight(0xffbd64, 38, 30, 1.42);
  patioWarm.position.set(0, 5.8, 0);
  scene.add(patioWarm);

  const barGlow = new THREE.PointLight(0xffab3e, 20, 16, 1.5);
  barGlow.position.set(-2.2, 2.8, -7.8);
  scene.add(barGlow);

  const stallsLightN = new THREE.PointLight(0xffe0b2, 18, 17, 1.48);
  stallsLightN.position.set(8.0, 3.1, -3.5);
  scene.add(stallsLightN);

  const stallsLightS = new THREE.PointLight(0xffe0b2, 18, 17, 1.48);
  stallsLightS.position.set(8.0, 3.1, 5.2);
  scene.add(stallsLightS);

  const screenGlow = new THREE.PointLight(0x60a5fa, 13, 14, 1.5);
  screenGlow.position.set(-4.2, 2.7, 6.8);
  scene.add(screenGlow);

  // ---------------- Materiales ----------------
  const matSteelBlack = new THREE.MeshStandardMaterial({ color: 0x16171c, roughness: 0.4, metalness: 0.78 });
  const matChrome = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.22, metalness: 0.92 });
  const matCorrugatedBlack = new THREE.MeshStandardMaterial({
    map: tex.corrugatedColor,
    bumpMap: tex.corrugatedBump,
    bumpScale: 0.045,
    roughness: 0.5,
    metalness: 0.62,
  });
  const matWallBlock = new THREE.MeshStandardMaterial({ map: tex.blockMap, roughness: 0.88, metalness: 0.04 });
  const matWallCream = new THREE.MeshStandardMaterial({ color: 0xe6e0d5, roughness: 0.85 });
  const matCoping = new THREE.MeshStandardMaterial({ color: 0xb6b0a6, roughness: 0.85 });
  const matConcrete = new THREE.MeshStandardMaterial({ map: tex.concreteMap, roughness: 0.86 });
  const matWood = new THREE.MeshStandardMaterial({ map: tex.woodMap, roughness: 0.62 });
  const matWoodGloss = new THREE.MeshStandardMaterial({ map: tex.woodMap, roughness: 0.22, metalness: 0.1 });
  const matCedar = new THREE.MeshStandardMaterial({ color: 0xb47b48, roughness: 0.56 });
  const matCedarDark = new THREE.MeshStandardMaterial({ color: 0x8f5d34, roughness: 0.6 });
  const matGravel = new THREE.MeshStandardMaterial({
    map: tex.gravelMap,
    bumpMap: tex.gravelBump,
    bumpScale: 0.07,
    roughness: 0.96,
  });
  const matLeaf1 = new THREE.MeshStandardMaterial({ color: 0x2a5632, roughness: 0.82 });
  const matLeaf2 = new THREE.MeshStandardMaterial({ color: 0x3b6e40, roughness: 0.78 });
  const matLeaf3 = new THREE.MeshStandardMaterial({ color: 0x4c7f4d, roughness: 0.75 });
  const matSageDrum = new THREE.MeshStandardMaterial({ color: 0x768b6c, roughness: 0.58, metalness: 0.34 });
  const matCreamDrum = new THREE.MeshStandardMaterial({ color: 0xe0d9cb, roughness: 0.58, metalness: 0.28 });
  const matAcaBlack = new THREE.MeshStandardMaterial({
    map: tex.acapulcoBlack,
    transparent: true,
    alphaTest: 0.12,
    side: THREE.DoubleSide,
    roughness: 0.58,
  });
  const matAcaCream = new THREE.MeshStandardMaterial({
    map: tex.acapulcoCream,
    transparent: true,
    alphaTest: 0.12,
    side: THREE.DoubleSide,
    roughness: 0.58,
  });
  const matOrange = new THREE.MeshStandardMaterial({ map: tex.wrapCristyOrange, roughness: 0.4 });
  const matYellowWall = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.62 });
  const matArabesque = new THREE.MeshStandardMaterial({ map: tex.arabesqueMap, roughness: 0.48 });
  const matGlass = new THREE.MeshPhysicalMaterial({
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.32,
    roughness: 0.1,
    metalness: 0.05,
  });

  const acapulcoShellGeo = new THREE.ConeGeometry(0.32, 0.36, 18, 1, true);
  acapulcoShellGeo.rotateX(Math.PI);

  const box = (w, h, d, mat, x = 0, y = 0, z = 0, shadow = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = shadow;
    return m;
  };

  const floorPools = [];
  function addFloorPool(x, z, scale = 4.6, opacity = 0.65, tint = 0xffc773) {
    const mat = new THREE.MeshBasicMaterial({
      map: tex.floorPool,
      color: tint,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(scale, scale), mat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, 0.015, z);
    scene.add(p);
    floorPools.push({ mat, baseOpacity: opacity });
    return { mat, baseOpacity: opacity };
  }

  // ---------------- Suelo, Banqueta y Avenida Belisario Domínguez ----------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 140),
    new THREE.MeshStandardMaterial({ color: 0x0e1118, roughness: 0.96 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);

  const patioFloor = new THREE.Mesh(new THREE.PlaneGeometry(30, 22), matGravel);
  patioFloor.rotation.x = -Math.PI / 2;
  patioFloor.receiveShadow = true;
  scene.add(patioFloor);

  // Banqueta exterior con guarnición y franja amarilla
  scene.add(box(2.5, 0.11, 24.4, matConcrete, -16.35, 0.035, 0, false));
  scene.add(box(0.16, 0.12, 24.4, new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.78 }), -17.55, 0.04, 0, false));
  const street = new THREE.Mesh(
    new THREE.PlaneGeometry(10.5, 48),
    new THREE.MeshStandardMaterial({ color: 0x181b22, roughness: 0.92 })
  );
  street.rotation.x = -Math.PI / 2;
  street.position.set(-22.8, -0.01, 0);
  scene.add(street);

  // Poste de alumbrado + Alsuper al cruzar la avenida
  const lampPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 6.2, 8), matSteelBlack);
  lampPost.position.set(-17.4, 3.1, -11.2);
  const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.25), new THREE.MeshBasicMaterial({ color: 0xfff3c4 }));
  lampHead.position.set(-17.9, 6.1, -11.2);
  scene.add(lampPost, lampHead);

  const alsuperPole = box(0.24, 11.2, 0.24, matSteelBlack, -31.5, 5.6, -4.5, false);
  const alsuperSign = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.4, 0.36, 20),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  alsuperSign.rotation.z = Math.PI / 2;
  alsuperSign.position.set(-31.5, 11.2, -4.5);
  scene.add(alsuperPole, alsuperSign);

  // ---------------- Muros Perimetrales con Castillos y Remate Superior ----------------
  scene.add(box(30.4, 3.05, 0.28, matWallBlock, 0, 1.525, -11.1));
  scene.add(box(30.4, 3.05, 0.28, matWallBlock, 0, 1.525, 11.1));
  scene.add(box(0.28, 3.05, 22.4, matWallBlock, 15.1, 1.525, 0));
  // Pretiles de concreto arriba de los muros
  scene.add(box(30.6, 0.1, 0.36, matCoping, 0, 3.08, -11.1));
  scene.add(box(30.6, 0.1, 0.36, matCoping, 0, 3.08, 11.1));
  scene.add(box(0.36, 0.1, 22.6, matCoping, 15.1, 3.08, 0));
  // Pilastras estructurales cada ~5m
  for (let px = -14.5; px <= 14.5; px += 4.8) {
    scene.add(box(0.34, 3.12, 0.38, matWallCream, px, 1.56, -11.1));
    scene.add(box(0.34, 3.12, 0.38, matWallCream, px, 1.56, 11.1));
  }

  // Fachada Oeste ("El / Patio") con luces rasantes triangulares y portón arqueado detallado
  scene.add(box(0.32, 2.95, 9.2, matWallCream, -15, 1.475, -6.5));
  scene.add(box(0.32, 2.95, 9.2, matWallCream, -15, 1.475, 6.5));
  scene.add(box(0.4, 0.12, 9.3, matCoping, -15, 2.98, -6.5));
  scene.add(box(0.4, 0.12, 9.3, matCoping, -15, 2.98, 6.5));

  const elFace = new THREE.Mesh(
    new THREE.PlaneGeometry(8.8, 2.84),
    new THREE.MeshStandardMaterial({ map: tex.wallEl, roughness: 0.8 })
  );
  elFace.rotation.y = -Math.PI / 2;
  elFace.position.set(-15.18, 1.44, -6.5);
  scene.add(elFace);

  const patioFace = new THREE.Mesh(
    new THREE.PlaneGeometry(8.8, 2.84),
    new THREE.MeshStandardMaterial({ map: tex.wallPatio, roughness: 0.8 })
  );
  patioFace.rotation.y = -Math.PI / 2;
  patioFace.position.set(-15.18, 1.44, 6.5);
  scene.add(patioFace);

  // Placa negra normativa junto a la letra "El" (como en foto nocturna real)
  scene.add(box(0.04, 0.38, 0.55, matSteelBlack, -15.2, 2.05, -2.55, false));

  // Luces LED rasantes con haz luminoso triangular sobre el muro
  const beamMat = new THREE.MeshBasicMaterial({
    map: tex.wallBeam,
    transparent: true,
    opacity: 0.52,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (const gz of [-9.2, -6.2, -3.2, 3.2, 6.2, 9.2]) {
    const housing = box(0.22, 0.05, 0.42, matSteelBlack, -15.45, 0.08, gz, false);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.34), new THREE.MeshBasicMaterial({ color: 0xffdf8e }));
    lens.position.set(-15.45, 0.11, gz);
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.4), beamMat);
    beam.rotation.y = -Math.PI / 2;
    beam.position.set(-15.22, 1.32, gz);
    scene.add(housing, lens, beam);
  }
  const facadeGlow = new THREE.PointLight(0xffd27d, 11, 13, 1.6);
  facadeGlow.position.set(-16.8, 1.3, 0);
  scene.add(facadeGlow);

  // Doble portón negro acanalado con marco tubular, travesaños y arco superior
  function createGateLeaf(zAnchor, openAngle) {
    const pivot = new THREE.Group();
    pivot.position.set(-15, 0, zAnchor);
    pivot.rotation.y = openAngle;
    const w = 1.78;
    const h = 2.68;
    const dir = zAnchor < 0 ? 1 : -1;
    const cz = dir * (w / 2);
    pivot.add(box(0.07, h, w, matCorrugatedBlack, 0, h / 2, cz));
    // Marcos verticales y horizontales
    pivot.add(box(0.11, h, 0.08, matSteelBlack, 0, h / 2, dir * 0.04));
    pivot.add(box(0.11, h, 0.08, matSteelBlack, 0, h / 2, dir * (w - 0.04)));
    for (const ry of [0.15, 1.35, h]) {
      pivot.add(box(0.12, 0.09, w, matSteelBlack, 0, ry, cz));
    }
    const arch = new THREE.Mesh(
      new THREE.CylinderGeometry(w * 0.49, w * 0.49, 0.07, 18, 1, false, 0, Math.PI),
      matCorrugatedBlack
    );
    arch.rotation.z = Math.PI / 2;
    arch.rotation.x = Math.PI / 2;
    arch.scale.set(0.32, 1, 1);
    arch.position.set(0, h, cz);
    pivot.add(arch);
    return pivot;
  }
  scene.add(createGateLeaf(-1.88, -0.76));
  scene.add(createGateLeaf(1.88, 0.76));

  // ---------------- Pasillo de Durmientes de Madera y Cuerdas ----------------
  const walkwayGroup = new THREE.Group();
  for (let i = 0, x = -14.3; x <= 1.2; x += 0.54, i++) {
    const jitterZ = ((i % 3) - 1) * 0.015;
    const plank = box(0.4, 0.075, 1.66, i % 2 === 0 ? matWood : matCedarDark, x, 0.037, jitterZ);
    walkwayGroup.add(plank);
  }
  const ropePoints = [];
  for (let i = 0; i < 6; i++) {
    const px = -13.6 + i * 2.4;
    const pz = -1.1;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.042, 0.94, 10), matSteelBlack);
    post.position.set(px, 0.47, pz);
    post.castShadow = true;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), matChrome);
    cap.position.set(px, 0.95, pz);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.045, 12), matSteelBlack);
    base.position.set(px, 0.022, pz);
    walkwayGroup.add(post, cap, base);
    ropePoints.push(new THREE.Vector3(px, 0.82, pz));
  }
  for (let i = 0; i < ropePoints.length - 1; i++) {
    const a = ropePoints[i];
    const b = ropePoints[i + 1];
    const mid = a.clone().lerp(b, 0.5);
    mid.y -= 0.16;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    walkwayGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.02, 6, false), matSteelBlack));
  }
  scene.add(walkwayGroup);
  addFloorPool(-8.5, 0, 5.2, 0.35);
  addFloorPool(-2.5, 0, 6.2, 0.4);

  // ---------------- Árboles Orgánicos y Yuccas en Tambos Metálicos ----------------
  function createLeafCluster(parent, cx, cy, cz, radius, count = 14) {
    const leafMats = [matLeaf1, matLeaf2, matLeaf3];
    const bladeGeo = new THREE.DodecahedronGeometry(radius * 0.42, 0);
    for (let i = 0; i < count; i++) {
      const phi = (i / count) * Math.PI * 2 + (i % 3) * 0.4;
      const elev = ((i % 5) - 2) * 0.25;
      const rOff = radius * (0.35 + ((i * 37) % 10) * 0.055);
      const m = new THREE.Mesh(bladeGeo, leafMats[i % 3]);
      m.position.set(
        cx + Math.cos(phi) * rOff,
        cy + elev * radius * 0.65,
        cz + Math.sin(phi) * rOff
      );
      m.rotation.set(i * 0.7, phi, i * 0.4);
      m.scale.set(1.15, 0.78, 0.95);
      m.castShadow = true;
      parent.add(m);
    }
  }

  function createDrumPlanter(x, z, drumMat, scale = 1, kind = "ficus") {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.39 * scale, 0.37 * scale, 0.9 * scale, 18), drumMat);
    drum.position.y = 0.45 * scale;
    drum.castShadow = true;
    drum.receiveShadow = true;
    g.add(drum);
    for (const ry of [0.22, 0.46, 0.7, 0.89]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.388 * scale, 0.022 * scale, 6, 18), drumMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = ry * scale;
      g.add(ring);
    }
    const soil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36 * scale, 0.36 * scale, 0.04, 14),
      new THREE.MeshStandardMaterial({ color: 0x2b2119, roughness: 0.95 })
    );
    soil.position.y = 0.87 * scale;
    g.add(soil);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4b3828, roughness: 0.9 });
    if (kind === "yucca") {
      // Palma / yuca estilizada como la foto de la entrada real
      const canePositions = [[0, 0, 1.35], [0.14, 0.1, 0.95], [-0.12, -0.08, 0.78]];
      canePositions.forEach(([ox, oz, h]) => {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.042 * scale, 0.056 * scale, h * scale, 8), trunkMat);
        stem.position.set(ox * scale, 0.86 * scale + (h * scale) / 2, oz * scale);
        stem.castShadow = true;
        g.add(stem);
        const topY = 0.86 * scale + h * scale;
        const bladeGeo = new THREE.ConeGeometry(0.048 * scale, 0.58 * scale, 4);
        bladeGeo.translate(0, 0.29 * scale, 0);
        for (let b = 0; b < 14; b++) {
          const ang = (b / 14) * Math.PI * 2;
          const tilt = 0.48 + (b % 3) * 0.26;
          const blade = new THREE.Mesh(bladeGeo, b % 2 === 0 ? matLeaf2 : matLeaf3);
          blade.position.set(ox * scale, topY, oz * scale);
          blade.rotation.y = ang;
          blade.rotation.z = tilt;
          blade.castShadow = true;
          g.add(blade);
        }
      });
    } else {
      const tall = kind === "tall";
      const h = (tall ? 2.15 : 1.2) * scale;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * scale, 0.085 * scale, h, 8), trunkMat);
      trunk.position.y = 0.85 * scale + h / 2;
      trunk.castShadow = true;
      g.add(trunk);
      // Ramas secundarias
      const branches = tall
        ? [[0.45, 2.55, 0.25, 0.82], [-0.45, 2.6, -0.25, 0.78], [0.1, 3.15, -0.35, 0.72], [-0.15, 2.95, 0.38, 0.72]]
        : [[0.25, 1.9, 0.18, 0.5], [-0.24, 1.95, -0.18, 0.48], [0, 2.2, 0, 0.54]];
      branches.forEach(([bx, by, bz, br]) => {
        const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.022 * scale, 0.036 * scale, 0.75 * scale, 6), trunkMat);
        limb.position.set(bx * 0.45 * scale, (by - 0.35) * scale, bz * 0.45 * scale);
        limb.lookAt(bx * scale, by * scale, bz * scale);
        limb.rotateX(Math.PI / 2);
        g.add(limb);
        createLeafCluster(g, bx * scale, by * scale, bz * scale, br * scale, tall ? 14 : 11);
      });
    }
    return g;
  }

  // Mástil central en tambo crema con árbol frondoso
  scene.add(createDrumPlanter(0, 0, matCreamDrum, 1.15, "tall"));
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6.9, 14), matSteelBlack);
  mast.position.set(0, 3.45, 0);
  mast.castShadow = true;
  scene.add(mast);
  // Tira de luz cálida en espiral alrededor del mástil
  const mastHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.02, 6, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd57a })
  );
  mastHalo.rotation.x = Math.PI / 2;
  for (let my = 1.6; my <= 5.6; my += 0.9) {
    const r = mastHalo.clone();
    r.position.set(0, my, 0);
    scene.add(r);
  }

  const swayGroups = [];
  const heaterEmitters = [];
  const heaterPools = [];

  // Tambos verdes/crema con yuccas y ficus en el patio
  for (const args of [
    [-5.2, -3.2, matSageDrum, 0.96, "yucca"],
    [5.8, 2.1, matSageDrum, 0.98, "ficus"],
    [-3.6, 4.7, matCreamDrum, 0.94, "yucca"],
    [4.2, -4.6, matSageDrum, 0.96, "tall"],
  ]) {
    const dp = createDrumPlanter(...args);
    scene.add(dp);
    swayGroups.push({ obj: dp, phase: args[0] * 0.4 + args[1] * 0.3, amp: 0.025 });
  }

  // ---------------- Guirnaldas Radiantes de Focos Edison ----------------
  const bulbCoords = [];
  const mastTop = new THREE.Vector3(0, 6.7, 0);
  const anchors = [
    new THREE.Vector3(-14.6, 3.2, -6.0),
    new THREE.Vector3(-14.6, 3.2, 6.0),
    new THREE.Vector3(-14.6, 3.1, -1.8),
    new THREE.Vector3(-14.6, 3.1, 1.8),
    new THREE.Vector3(-7.0, 3.55, -5.5),
    new THREE.Vector3(3.0, 3.55, -5.5),
    new THREE.Vector3(9.6, 3.3, -7.2),
    new THREE.Vector3(9.6, 3.3, 0.2),
    new THREE.Vector3(9.6, 3.3, 7.6),
    new THREE.Vector3(3.8, 3.3, 7.8),
    new THREE.Vector3(-5.0, 3.6, 6.4),
    [new THREE.Vector3(-8.0, 3.4, -5.8), new THREE.Vector3(3.5, 3.4, -5.8)],
    [new THREE.Vector3(9.2, 3.25, -8.5), new THREE.Vector3(9.2, 3.25, 8.6)],
  ];
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x16171d });
  anchors.forEach((item) => {
    const pA = Array.isArray(item) ? item[0] : mastTop;
    const pB = Array.isArray(item) ? item[1] : item;
    const mid = pA.clone().lerp(pB, 0.5);
    mid.y -= Array.isArray(item) ? 0.35 : 0.78;
    const curve = new THREE.QuadraticBezierCurve3(pA, mid, pB);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.012, 4, false), wireMat));
    const steps = 11;
    for (let i = 1; i < steps; i++) {
      bulbCoords.push(curve.getPoint(i / steps));
    }
  });
  for (let bx = -7.2; bx <= 2.4; bx += 2.2) {
    for (const bz of [-6.4, -8.0]) {
      bulbCoords.push(new THREE.Vector3(bx, 3.05, bz));
    }
  }

  const bulbGeo = new THREE.SphereGeometry(0.058, 8, 8);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe8a3 });
  const bulbInstances = new THREE.InstancedMesh(bulbGeo, bulbMat, bulbCoords.length);
  const dummy = new THREE.Object3D();
  const haloGroup = new THREE.Group();
  const haloMat = new THREE.SpriteMaterial({
    map: tex.glowSprite,
    color: 0xffcf72,
    transparent: true,
    opacity: 0.76,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  bulbCoords.forEach((pos, idx) => {
    dummy.position.copy(pos);
    dummy.updateMatrix();
    bulbInstances.setMatrixAt(idx, dummy.matrix);
    const sp = new THREE.Sprite(haloMat);
    sp.position.copy(pos);
    sp.scale.set(0.62, 0.62, 1);
    haloGroup.add(sp);
  });
  scene.add(bulbInstances, haloGroup);

  // ---------------- Registro interactivo de los 7 locales ----------------
  const hitboxes = [];
  const localsMeta = {};
  const animatedFans = [];

  function registerLocal(id, group, { pinPos, camPos, lookAt, hitSize, hitOffset = [0, 1.8, 0] }) {
    const hb = new THREE.Mesh(
      new THREE.BoxGeometry(hitSize[0], hitSize[1], hitSize[2]),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hb.position.set(hitOffset[0], hitOffset[1], hitOffset[2]);
    hb.userData.localId = id;
    group.add(hb);
    hitboxes.push(hb);

    const worldPin = new THREE.Vector3(...pinPos);
    group.localToWorld(worldPin);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(Math.max(hitSize[0], hitSize[2]) * 0.42, Math.max(hitSize[0], hitSize[2]) * 0.48, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(hitOffset[0], 0.04, hitOffset[2]);
    group.add(ring);

    localsMeta[id] = {
      id,
      group,
      ring,
      pinPos: worldPin,
      camPos: new THREE.Vector3(...camPos),
      lookAt: new THREE.Vector3(...lookAt),
    };
  }

  // ---------------- 1. THE BAR (Vigas metálicas, estantes 3D de botellas, barra con posapié y neón) ----------------
  {
    const barGroup = new THREE.Group();
    barGroup.position.set(-2.4, 0, -8.2);
    barGroup.add(box(12.2, 0.06, 5.2, matConcrete, 0, 0.03, 0.1));

    // Columnas y vigas/largueros de acero visibles bajo la lámina
    for (const px of [-5.8, -1.8, 2.2, 5.8]) {
      barGroup.add(box(0.14, 3.55, 0.14, matSteelBlack, px, 1.775, 2.4));
      barGroup.add(box(0.14, 3.55, 0.14, matSteelBlack, px, 1.775, -2.2));
      barGroup.add(box(0.1, 0.14, 5.0, matSteelBlack, px, 3.42, 0.1));
    }
    for (const pz of [-2.0, 0.1, 2.35]) {
      barGroup.add(box(12.0, 0.12, 0.1, matSteelBlack, 0, 3.42, pz));
    }
    const barRoof = box(12.4, 0.09, 5.4, matCorrugatedBlack, 0, 3.58, 0.1);
    barRoof.rotation.x = 0.04;
    barGroup.add(barRoof);

    // Cenefa frontal + letrero "the Bar" + banderines
    barGroup.add(box(12.2, 0.34, 0.08, matSteelBlack, 0, 3.34, 2.65));
    const barSign = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 0.54), new THREE.MeshBasicMaterial({ map: tex.signTheBar }));
    barSign.position.set(0, 3.22, 2.74);
    barGroup.add(barSign);

    const bunting = new THREE.Mesh(
      new THREE.PlaneGeometry(11.6, 0.45),
      new THREE.MeshBasicMaterial({ map: tex.buntingMap, transparent: true, side: THREE.DoubleSide })
    );
    bunting.position.set(0, 2.86, 2.58);
    swayGroups.push({ obj: bunting, phase: 1.1, amp: 0.06, axis: "x" });
    barGroup.add(bunting);

    // 2 ventiladores negros con jaula y aspas giratorias
    for (const fx of [-3.6, 3.6]) {
      const fanG = new THREE.Group();
      fanG.position.set(fx, 2.9, 2.42);
      fanG.rotation.x = 0.32;
      const cage = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.015, 6, 16), matSteelBlack);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 10), matSteelBlack);
      hub.rotation.x = Math.PI / 2;
      const blades = new THREE.Group();
      for (let b = 0; b < 3; b++) {
        const blade = box(0.07, 0.2, 0.01, matChrome, 0, 0.1, 0, false);
        const pivot = new THREE.Group();
        pivot.rotation.z = (b / 3) * Math.PI * 2;
        pivot.add(blade);
        blades.add(pivot);
      }
      animatedFans.push(blades);
      fanG.add(cage, hub, blades);
      barGroup.add(fanG);
    }

    // Barra principal con frente de duela oscura, posapié metálico, tira LED ámbar y grifos
    barGroup.add(box(8.8, 1.06, 0.76, matSteelBlack, -0.6, 0.55, -0.7));
    barGroup.add(box(8.7, 0.78, 0.04, matCedarDark, -0.6, 0.46, -0.31));
    barGroup.add(box(9.05, 0.08, 0.96, matWoodGloss, -0.6, 1.1, -0.68));
    // Posapié tubular cromado
    const footRail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 8.6, 8), matChrome);
    footRail.rotation.z = Math.PI / 2;
    footRail.position.set(-0.6, 0.18, -0.18);
    barGroup.add(footRail);
    // Tira LED ámbar bajo cubierta + grifos de cerveza sobre barra
    const barLed = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.06, 0.04), new THREE.MeshBasicMaterial({ color: 0xffb020 }));
    barLed.position.set(-0.6, 0.98, -0.26);
    barGroup.add(barLed);
    barGroup.add(box(0.42, 0.34, 0.18, matChrome, -1.8, 1.31, -0.72, false));
    barGroup.add(box(0.32, 0.18, 0.26, matSteelBlack, 0.9, 1.23, -0.72, false));

    // TV central + 2 estantes 3D con botellas luminosas (morado izquierda, ámbar derecha)
    const barTvFrame = box(1.85, 1.08, 0.08, matSteelBlack, -0.6, 2.15, -2.62);
    const barTv = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.98), new THREE.MeshBasicMaterial({ map: tex.tvScreenMap }));
    barTv.position.set(-0.6, 2.15, -2.57);
    barGroup.add(barTvFrame, barTv);

    function createBottleShelf3D(sx, glowColor) {
      const sg = new THREE.Group();
      sg.position.set(sx, 2.08, -2.58);
      sg.add(box(1.52, 1.4, 0.22, matSteelBlack, 0, 0, -0.04));
      // Fondo negro y marco LED brillante
      const back = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 1.3), new THREE.MeshBasicMaterial({ color: 0x0b0c12 }));
      back.position.z = 0.08;
      sg.add(back);
      const glowMat = new THREE.MeshBasicMaterial({ color: glowColor });
      sg.add(box(1.48, 0.04, 0.04, glowMat, 0, 0.68, 0.09, false));
      sg.add(box(1.48, 0.04, 0.04, glowMat, 0, -0.68, 0.09, false));
      sg.add(box(0.04, 1.36, 0.04, glowMat, -0.72, 0, 0.09, false));
      sg.add(box(0.04, 1.36, 0.04, glowMat, 0.72, 0, 0.09, false));
      const bColors = [0xf59e0b, 0x22c55e, 0xe2e8f0, 0xef4444, 0x38bdf8, 0xfacc15];
      for (let r = 0; r < 3; r++) {
        const sy = -0.46 + r * 0.42;
        sg.add(box(1.42, 0.03, 0.2, matSteelBlack, 0, sy, 0.04));
        sg.add(box(1.4, 0.02, 0.02, glowMat, 0, sy + 0.02, 0.12, false));
        for (let b = 0; b < 7; b++) {
          const bx = -0.54 + b * 0.18;
          const bMat = new THREE.MeshStandardMaterial({
            color: bColors[(b + r) % bColors.length],
            roughness: 0.2,
            metalness: 0.3,
          });
          const body = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.22, 8), bMat);
          body.position.set(bx, sy + 0.12, 0.06);
          const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.022, 0.09, 8), bMat);
          neck.position.set(bx, sy + 0.26, 0.06);
          sg.add(body, neck);
        }
      }
      return sg;
    }
    barGroup.add(createBottleShelf3D(-2.75, 0xa855f7));
    barGroup.add(createBottleShelf3D(1.55, 0xfbbf24));

    // Enfriador de cerveza con marco negro y puerta cristal iluminada en azul
    const cooler = box(0.98, 2.0, 0.74, matSteelBlack, 3.9, 1.03, -2.2);
    const coolerDoor = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 1.72), new THREE.MeshBasicMaterial({ map: tex.coolerBlueMap }));
    coolerDoor.position.set(3.9, 1.06, -1.81);
    barGroup.add(cooler, coolerDoor);

    // Mesas altas con bancos altos Acapulco bajo The Bar
    for (const tx of [-4.2, -1.6, 1.2, 4.0]) {
      barGroup.add(createHighTableSet(tx, 1.25));
    }

    // Muro gris con neón "THIS IS MY HAPPY PLACE" + tubo conduit eléctrico negro (foto real!)
    const happyWall = box(3.4, 2.95, 0.26, new THREE.MeshStandardMaterial({ color: 0x565961, roughness: 0.78 }), 7.9, 1.475, -2.6);
    const happyNeon = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.35), new THREE.MeshBasicMaterial({ map: tex.happyPlaceMap }));
    happyNeon.position.set(7.9, 1.72, -2.45);
    const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 2.85, 6), matSteelBlack);
    conduit.position.set(9.1, 1.45, -2.44);
    barGroup.add(happyWall, happyNeon, conduit);

    scene.add(barGroup);
    addFloorPool(-2.4, -7.2, 9.5, 0.42, 0xffaa38);

    registerLocal("thebar", barGroup, {
      pinPos: [0, 4.1, 0.6],
      camPos: [-2.0, 2.25, 1.9],
      lookAt: [-2.4, 1.65, -8.2],
      hitSize: [12.2, 3.8, 5.4],
      hitOffset: [0, 1.9, 0],
    });
  }

  // ---------------- Helper para locales con cocina abierta iluminada y menú interior ----------------
  function createOpenBooth({
    width = 3.4,
    depth = 2.5,
    height = 2.75,
    bodyMat = matCorrugatedBlack,
    fasciaHeight = 0.82,
    visor = false,
    menuTex = null,
    interiorWallColor = 0x26252b,
    interiorLightColor = 0xfff0c4,
  }) {
    const g = new THREE.Group();
    const wallT = 0.14;
    const winH = 1.18;
    const winBottom = 0.96;

    // Base frontal bajo mostrador + paredes trasera/laterales + franja superior
    g.add(box(width, winBottom, depth, bodyMat, 0, winBottom / 2, 0));
    g.add(box(width, height - (winBottom + winH), depth, bodyMat, 0, (height + winBottom + winH) / 2, 0));
    g.add(box(width, winH, depth - 0.9, new THREE.MeshStandardMaterial({ color: interiorWallColor, roughness: 0.72 }), 0, winBottom + winH / 2, -0.45));
    g.add(box(0.28, winH, 0.9, bodyMat, -width / 2 + 0.14, winBottom + winH / 2, depth / 2 - 0.45));
    g.add(box(0.28, winH, 0.9, bodyMat, width / 2 - 0.14, winBottom + winH / 2, depth / 2 - 0.45));

    // Cocina interior: barra acero inox, campana metálica, lámparas colgantes y menú luminoso
    g.add(box(width - 0.7, 0.08, 0.52, matChrome, 0, winBottom + 0.04, depth / 2 - 0.56, false));
    g.add(box(width - 0.85, 0.24, 0.48, matChrome, 0, winBottom + winH - 0.16, depth / 2 - 0.55, false));
    if (menuTex) {
      const board = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.82, 0.7), new THREE.MeshBasicMaterial({ map: menuTex }));
      board.position.set(0, winBottom + 0.62, depth / 2 - 0.88);
      g.add(board);
    }
    // Dos lámparas cálidas interiores + tira LED ventana
    for (const lx of [-0.65, 0.65]) {
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.12, 10), matSteelBlack);
      shade.position.set(lx, winBottom + winH - 0.14, depth / 2 - 0.24);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), new THREE.MeshBasicMaterial({ color: interiorLightColor }));
      bulb.position.set(lx, winBottom + winH - 0.2, depth / 2 - 0.24);
      g.add(shade, bulb);
    }
    // Marco de aluminio negro de ventana + barra de entregas de madera barnizada
    g.add(box(width - 0.56, 0.04, 0.05, matSteelBlack, 0, winBottom + winH - 0.02, depth / 2 - 0.04));
    g.add(box(0.04, winH, 0.05, matSteelBlack, 0, winBottom + winH / 2, depth / 2 - 0.04));
    g.add(box(width * 0.86, 0.08, 0.36, matWoodGloss, 0, winBottom - 0.01, depth / 2 + 0.09));

    // Fascia superior negra para letrero
    g.add(box(width + 0.08, fasciaHeight, 0.24, matSteelBlack, 0, height + fasciaHeight / 2 - 0.04, depth / 2 - 0.08));
    if (visor) {
      const v = box(width + 0.18, 0.07, 0.68, matCorrugatedBlack, 0, height - 0.16, depth / 2 + 0.28);
      v.rotation.x = 0.15;
      g.add(v);
    }
    return g;
  }

  // Helper para caja de luz circular 3D con aro metálico
  function addRoundLightbox(parent, texture, radius, y, z) {
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.045, radius + 0.045, 0.14, 28), matSteelBlack);
    housing.rotation.x = Math.PI / 2;
    housing.position.set(0, y, z);
    const face = new THREE.Mesh(new THREE.CircleGeometry(radius, 28), new THREE.MeshBasicMaterial({ map: texture }));
    face.position.set(0, y, z + 0.075);
    parent.add(housing, face);
  }

  // ---------------- 2. EL DURANGUENSE (Listones 3D de madera natural + caja de luz "D" cian) ----------------
  {
    const g = createOpenBooth({
      width: 3.3,
      depth: 2.5,
      height: 2.75,
      bodyMat: matSteelBlack,
      fasciaHeight: 0.9,
      menuTex: tex.menuDuranguense,
      interiorWallColor: 0x3b2a1d,
    });
    // Listones verticales 3D en el frente y fascia para relieve real con sombra
    const slatW = 0.075;
    for (let sx = -1.56; sx <= 1.56; sx += 0.13) {
      g.add(box(slatW, 0.92, 0.05, Math.round(sx * 10) % 2 === 0 ? matCedar : matCedarDark, sx, 0.46, 1.26));
      g.add(box(slatW, 0.94, 0.05, Math.round(sx * 10) % 2 === 0 ? matCedar : matCedarDark, sx, 3.16, 1.28));
    }
    addRoundLightbox(g, tex.signDuranguense, 0.44, 3.16, 1.35);

    g.position.set(11.8, 0, -7.6);
    g.rotation.y = -Math.PI / 2;
    scene.add(g);
    addFloorPool(9.4, -7.6, 4.4, 0.48, 0x67e8f9);
    registerLocal("duranguense", g, {
      pinPos: [0, 4.1, 0],
      camPos: [2.6, 2.45, -7.6],
      lookAt: [11.6, 1.7, -7.6],
      hitSize: [3.6, 3.9, 3.0],
    });
  }

  // ---------------- 3. TACOTES (Módulo negro + letrero circular amarillo + brillo cálido de parrilla) ----------------
  {
    const g = createOpenBooth({
      width: 3.3,
      depth: 2.5,
      height: 2.75,
      bodyMat: matCorrugatedBlack,
      fasciaHeight: 0.74,
      visor: true,
      menuTex: tex.menuTacotes,
      interiorWallColor: 0x332215,
      interiorLightColor: 0xffd27d,
    });
    // Brillo cálido tipo trompo al pastor adentro a la derecha
    const trompo = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.08, 0.48, 10),
      new THREE.MeshStandardMaterial({ color: 0xea580c, emissive: 0x7c2d12, emissiveIntensity: 0.7, roughness: 0.5 })
    );
    trompo.position.set(0.85, 1.36, 0.85);
    g.add(trompo);
    addRoundLightbox(g, tex.signTacotes, 0.44, 3.12, 1.28);

    g.position.set(11.8, 0, -3.8);
    g.rotation.y = -Math.PI / 2;
    scene.add(g);
    addFloorPool(9.4, -3.8, 4.4, 0.45, 0xfacc15);
    registerLocal("tacotes", g, {
      pinPos: [0, 4.1, 0],
      camPos: [2.6, 2.45, -3.8],
      lookAt: [11.6, 1.7, -3.8],
      hitSize: [3.6, 3.8, 3.0],
    });
  }

  // ---------------- 4. NÜ POSTRERÍA (Mostrador arabesco + vitrina de cristal iluminada + letrero cian/rosa) ----------------
  {
    const g = createOpenBooth({
      width: 3.3,
      depth: 2.5,
      height: 2.75,
      bodyMat: matCorrugatedBlack,
      fasciaHeight: 0.74,
      menuTex: tex.menuNu,
      interiorWallColor: 0x262133,
    });
    const frontWrap = new THREE.Mesh(new THREE.PlaneGeometry(3.26, 0.94), matArabesque);
    frontWrap.position.set(0, 0.47, 1.27);
    g.add(frontWrap);
    // Vitrina iluminada de postres sobre barra
    const pastryCase = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.42, 0.34), matGlass);
    pastryCase.position.set(-0.62, 1.22, 1.18);
    const cake1 = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.09, 12), new THREE.MeshStandardMaterial({ color: 0xf472b6 }));
    cake1.position.set(-0.78, 1.12, 1.18);
    const cake2 = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.09, 12), new THREE.MeshStandardMaterial({ color: 0x78350f }));
    cake2.position.set(-0.46, 1.12, 1.18);
    g.add(pastryCase, cake1, cake2);
    addRoundLightbox(g, tex.signNu, 0.44, 3.12, 1.28);

    g.position.set(11.8, 0, 0);
    g.rotation.y = -Math.PI / 2;
    scene.add(g);
    addFloorPool(9.4, 0, 4.4, 0.42, 0xf472b6);
    registerLocal("nu", g, {
      pinPos: [0, 4.1, 0],
      camPos: [2.6, 2.45, 0],
      lookAt: [11.6, 1.7, 0],
      hitSize: [3.6, 3.8, 3.0],
    });
  }

  // ---------------- 5. YOSHITO ASIAN FOOD (Módulo negro + caja de luz YOSHITO + farol rojo japonés) ----------------
  {
    const g = createOpenBooth({
      width: 3.5,
      depth: 2.5,
      height: 2.75,
      bodyMat: matCorrugatedBlack,
      fasciaHeight: 0.96,
      visor: true,
      menuTex: tex.menuYoshito,
      interiorWallColor: 0x1d1a1f,
    });
    const signBox = box(3.46, 0.94, 0.12, matSteelBlack, 0, 3.18, 1.28);
    const ySign = new THREE.Mesh(new THREE.PlaneGeometry(3.38, 0.88), new THREE.MeshBasicMaterial({ map: tex.signYoshito }));
    ySign.position.set(0, 3.18, 1.35);
    // Farol japonés colgante bajo el volado
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    lantern.scale.set(0.85, 1.25, 0.85);
    lantern.position.set(-1.35, 2.38, 1.42);
    g.add(signBox, ySign, lantern);

    g.position.set(11.8, 0, 3.8);
    g.rotation.y = -Math.PI / 2;
    scene.add(g);
    addFloorPool(9.4, 3.8, 4.5, 0.42, 0xfca5a5);
    registerLocal("yoshito", g, {
      pinPos: [0, 4.1, 0],
      camPos: [2.6, 2.45, 3.8],
      lookAt: [11.6, 1.7, 3.8],
      hitSize: [3.6, 3.9, 3.0],
    });
  }

  // ---------------- 6. GORDITAS CRISTY (Vinil naranja real + interior amarillo + letrero blanco con relieve) ----------------
  {
    const g = createOpenBooth({
      width: 3.45,
      depth: 2.5,
      height: 2.75,
      bodyMat: matCorrugatedBlack,
      fasciaHeight: 0.86,
      visor: true,
      menuTex: tex.menuCristy,
      interiorWallColor: 0xfacc15,
    });
    const cTopBox = box(3.4, 0.82, 0.12, matSteelBlack, 0, 3.14, 1.28);
    const cTop = new THREE.Mesh(new THREE.PlaneGeometry(3.32, 0.76), new THREE.MeshBasicMaterial({ map: tex.signCristyTop }));
    cTop.position.set(0, 3.14, 1.35);
    const orangeFront = new THREE.Mesh(new THREE.PlaneGeometry(3.38, 0.94), matOrange);
    orangeFront.position.set(0, 0.47, 1.27);
    const yellowSide = box(0.08, 2.68, 2.42, matYellowWall, -1.75, 1.34, 0);
    g.add(cTopBox, cTop, orangeFront, yellowSide);

    g.position.set(11.8, 0, 7.6);
    g.rotation.y = -Math.PI / 2;
    scene.add(g);
    addFloorPool(9.4, 7.6, 4.6, 0.5, 0xfb923c);
    registerLocal("cristy", g, {
      pinPos: [0, 4.1, 0],
      camPos: [4.8, 2.45, 4.6],
      lookAt: [11.6, 1.65, 7.5],
      hitSize: [3.6, 3.9, 3.0],
    });
  }

  // ---------------- 7. BURGER BOYS (Caja de luz redonda roja/blanca + menú abierto + íconos neón) ----------------
  {
    const g = createOpenBooth({
      width: 3.5,
      depth: 2.5,
      height: 2.75,
      bodyMat: matCorrugatedBlack,
      fasciaHeight: 0.76,
      menuTex: tex.menuBurger,
      interiorWallColor: 0x291a16,
    });
    addRoundLightbox(g, tex.signBurgerBoys, 0.46, 3.12, 1.28);
    // Íconos neón de hamburguesa y papas al costado como en las fotos reales
    const neonBurger = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 6, 14), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    neonBurger.position.set(1.3, 1.72, 1.29);
    const neonFries = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.04), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    neonFries.position.set(1.3, 1.32, 1.29);
    g.add(neonBurger, neonFries);

    g.position.set(4.5, 0, 9.2);
    g.rotation.y = Math.PI;
    scene.add(g);
    addFloorPool(4.5, 6.8, 4.6, 0.45, 0xfbbf24);
    registerLocal("burgerboys", g, {
      pinPos: [0, 4.1, 0],
      camPos: [4.5, 2.45, 1.4],
      lookAt: [4.5, 1.7, 9.2],
      hitSize: [3.7, 3.8, 3.0],
    });
  }

  // Módulo reservado "Próximamente"
  {
    const pronto = createOpenBooth({ width: 3.1, depth: 2.4, height: 2.7, bodyMat: matCorrugatedBlack, fasciaHeight: 0.72 });
    const pSign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), new THREE.MeshBasicMaterial({ map: tex.signPronto }));
    pSign.position.set(0, 3.04, 1.26);
    pronto.add(pSign);
    pronto.position.set(0.8, 0, 9.2);
    pronto.rotation.y = Math.PI;
    scene.add(pronto);
  }

  // ---------------- Pérgola Negra con Enredaderas de Luz y Pantalla Gigante ----------------
  {
    const pergola = new THREE.Group();
    pergola.position.set(-4.6, 0, 8.2);
    pergola.add(box(7.2, 0.06, 4.6, matConcrete, 0, 0.03, 0));
    for (const px of [-3.4, 0, 3.4]) {
      for (const pz of [-2.1, 2.1]) {
        pergola.add(box(0.14, 3.6, 0.14, matSteelBlack, px, 1.8, pz));
      }
    }
    // Enredadera verde + lucecitas cálidas en los postes frontales de la pérgola (como en foto de Instagram!)
    for (const px of [-3.4, 0, 3.4]) {
      for (let vy = 0.8; vy <= 3.2; vy += 0.45) {
        const vine = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), vy % 0.9 < 0.5 ? matLeaf1 : matLeaf2);
        vine.position.set(px + 0.04, vy, -2.08);
        pergola.add(vine);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffe49e }));
        dot.position.set(px - 0.08, vy + 0.1, -2.02);
        pergola.add(dot);
      }
    }
    pergola.add(box(7.3, 0.14, 0.14, matSteelBlack, 0, 3.6, -2.1));
    pergola.add(box(7.3, 0.14, 0.14, matSteelBlack, 0, 3.6, 2.1));
    for (let sx = -3.2; sx <= 3.2; sx += 0.42) {
      pergola.add(box(0.07, 0.08, 4.3, matSteelBlack, sx, 3.62, 0));
    }
    const shadeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(7.0, 4.2),
      new THREE.MeshStandardMaterial({ color: 0x0f1116, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
    );
    shadeMesh.rotation.x = Math.PI / 2;
    shadeMesh.position.y = 3.67;
    pergola.add(shadeMesh);

    pergola.add(box(4.2, 2.75, 0.24, matWallCream, -1.2, 1.38, 2.2));
    const tvHousing = box(3.54, 2.02, 0.08, matSteelBlack, -1.2, 1.85, 2.09);
    const giantTv = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.9), new THREE.MeshBasicMaterial({ map: tex.tvScreenMap }));
    giantTv.position.set(-1.2, 1.85, 2.03);
    giantTv.rotation.y = Math.PI;
    pergola.add(tvHousing, giantTv);

    scene.add(pergola);
  }

  // ---------------- Zona Infantil (Brincolín con red + columpio) ----------------
  {
    const kids = new THREE.Group();
    kids.position.set(-11.4, 0, 7.6);
    const matPad = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.12, 22), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 }));
    matPad.position.y = 0.62;
    matPad.castShadow = true;
    const blueRim = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.09, 8, 24), new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.5 }));
    blueRim.rotation.x = Math.PI / 2;
    blueRim.position.y = 0.66;
    const net = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.45, 1.45, 22, 2, true),
      new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.38, wireframe: true })
    );
    net.position.y = 1.38;
    kids.add(matPad, blueRim, net);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.1, 6), matSteelBlack);
      pole.position.set(Math.cos(a) * 1.46, 1.05, Math.sin(a) * 1.46);
      kids.add(pole);
    }
    const swingFrame = box(2.2, 0.08, 0.08, new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.45 }), 0, 2.1, 2.2);
    kids.add(swingFrame, box(0.07, 2.15, 0.07, matSteelBlack, -0.95, 1.08, 2.2), box(0.07, 2.15, 0.07, matSteelBlack, 0.95, 1.08, 2.2));
    // Cadenas y asientos del columpio
    for (const sx of [-0.42, 0.42]) {
      kids.add(box(0.36, 0.04, 0.18, new THREE.MeshStandardMaterial({ color: 0xef4444 }), sx, 0.6, 2.2));
      kids.add(box(0.015, 1.5, 0.015, matChrome, sx - 0.14, 1.35, 2.2, false));
      kids.add(box(0.015, 1.5, 0.015, matChrome, sx + 0.14, 1.35, 2.2, false));
    }
    scene.add(kids);
  }

  // ---------------- Sillas Acapulco Caladas, Mesas Barnizadas, Cubetas y Calentadores ----------------
  function createAcapulcoChair(acaMat, rotY, seatHeight = 0.44) {
    const c = new THREE.Group();
    c.rotation.y = rotY;
    // Aro ovalado negro y canasta tejida calada
    const shell = new THREE.Mesh(acapulcoShellGeo, acaMat);
    shell.scale.set(1, 1.05, 0.88);
    shell.rotation.x = -0.24;
    shell.position.set(0, seatHeight + 0.05, 0);
    shell.castShadow = true;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.016, 6, 18), matSteelBlack);
    rim.rotation.x = Math.PI / 2 - 0.24;
    rim.scale.set(1, 0.88, 1);
    rim.position.set(0, seatHeight + 0.21, -0.04);
    c.add(shell, rim);

    // 4 patas delgadas de acero negro en horquilla
    for (const [lx, lz] of [[-0.17, -0.14], [0.17, -0.14], [-0.15, 0.14], [0.15, 0.14]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, seatHeight + 0.08, 6), matSteelBlack);
      leg.position.set(lx, seatHeight / 2, lz);
      leg.rotation.z = lx > 0 ? -0.14 : 0.14;
      leg.rotation.x = lz > 0 ? 0.12 : -0.12;
      c.add(leg);
    }
    return c;
  }

  function createDiningTableSet(x, z, rotY = 0, withBucket = false) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    // Cubierta cuadrada de madera oscura brillante con marco de acero
    g.add(box(1.1, 0.055, 1.1, matWoodGloss, 0, 0.76, 0));
    g.add(box(1.12, 0.04, 1.12, matSteelBlack, 0, 0.73, 0));
    for (const lx of [-0.48, 0.48]) {
      for (const lz of [-0.48, 0.48]) {
        g.add(box(0.045, 0.73, 0.045, matSteelBlack, lx, 0.365, lz));
      }
    }
    // Servilletero negro y bebidas / cubeta cervecera metálica
    g.add(box(0.13, 0.13, 0.08, matSteelBlack, -0.15, 0.85, 0));
    if (withBucket) {
      const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.085, 0.18, 12), matChrome);
      bucket.position.set(0.16, 0.88, 0.06);
      g.add(bucket);
      for (const [bx, bz] of [[-0.03, 0.02], [0.03, -0.02], [0, 0.04]]) {
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.11, 6), new THREE.MeshStandardMaterial({ color: 0x78350f }));
        neck.position.set(0.16 + bx, 0.99, 0.06 + bz);
        neck.rotation.z = bx * 2;
        g.add(neck);
      }
    } else {
      const drink = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.032, 0.13, 8), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
      drink.position.set(0.22, 0.85, 0.14);
      g.add(drink);
    }

    const cN = createAcapulcoChair(matAcaBlack, 0);
    cN.position.set(0, 0, -0.78);
    const cS = createAcapulcoChair(matAcaCream, Math.PI);
    cS.position.set(0, 0, 0.78);
    const cW = createAcapulcoChair(matAcaBlack, Math.PI / 2);
    cW.position.set(-0.78, 0, 0);
    const cE = createAcapulcoChair(matAcaCream, -Math.PI / 2);
    cE.position.set(0.78, 0, 0);
    g.add(cN, cS, cW, cE);
    return g;
  }

  function createHighTableSet(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.add(box(0.88, 0.05, 0.88, matWoodGloss, 0, 1.03, 0));
    g.add(box(0.055, 1.0, 0.055, matSteelBlack, 0, 0.5, 0));
    g.add(box(0.56, 0.035, 0.56, matSteelBlack, 0, 0.02, 0));
    const sL = createAcapulcoChair(matAcaBlack, -Math.PI / 2, 0.72);
    sL.scale.set(0.78, 1, 0.78);
    sL.position.set(-0.62, 0, 0);
    const sR = createAcapulcoChair(matAcaCream, Math.PI / 2, 0.72);
    sR.scale.set(0.78, 1, 0.78);
    sR.position.set(0.62, 0, 0);
    g.add(sL, sR);
    return g;
  }

  function createPicnicTable(x, z, rotY = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    for (const tz of [-0.24, 0, 0.24]) {
      g.add(box(1.72, 0.05, 0.21, matWood, 0, 0.74, tz));
    }
    g.add(box(1.72, 0.05, 0.28, matWood, 0, 0.44, -0.68));
    g.add(box(1.72, 0.05, 0.28, matWood, 0, 0.44, 0.68));
    for (const lx of [-0.62, 0.62]) {
      g.add(box(0.07, 0.74, 1.4, matCedarDark, lx, 0.37, 0));
    }
    return g;
  }

  function createPatioHeater(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.29, 0.68, 12), matSteelBlack);
    base.position.y = 0.34;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.45, 8), matChrome);
    pole.position.y = 1.38;
    const emitterMat = new THREE.MeshBasicMaterial({ color: 0xff8a2b });
    const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.26, 10), emitterMat);
    emitter.position.y = 2.08;
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.15, 16), matChrome);
    hood.position.y = 2.26;
    g.add(base, pole, emitter, hood);
    heaterEmitters.push(emitterMat);
    heaterPools.push(addFloorPool(x, z, 3.2, 0.38, 0xff9b42));
    return g;
  }

  const diningCoords = [
    [-8.8, -3.2, 0.05, true],
    [-4.2, -3.6, -0.04, false],
    [1.2, -3.4, 0.06, true],
    [5.8, -3.0, 0.0, false],
    [-8.6, 3.2, -0.05, false],
    [-4.2, 3.5, 0.05, true],
    [0.8, 3.4, -0.04, false],
    [5.4, 3.8, 0.02, true],
  ];
  diningCoords.forEach(([x, z, r, b]) => scene.add(createDiningTableSet(x, z, r, b)));

  scene.add(createPicnicTable(7.2, 0.5, Math.PI / 2));
  scene.add(createPicnicTable(7.2, 6.2, Math.PI / 2));

  scene.add(createPatioHeater(-1.8, -2.5));
  scene.add(createPatioHeater(2.8, 2.4));

  // ---------------- Sistema 3D de Lluvia + Motor Dinámico de Clima ----------------
  const rainCount = 650;
  const rainPositions = new Float32Array(rainCount * 6);
  const rainSeeds = new Float32Array(rainCount);
  for (let i = 0; i < rainCount; i++) {
    const rx = (Math.random() - 0.5) * 34;
    const ry = Math.random() * 14;
    const rz = (Math.random() - 0.5) * 26;
    rainSeeds[i] = 0.8 + Math.random() * 0.5;
    const i6 = i * 6;
    rainPositions[i6] = rx;
    rainPositions[i6 + 1] = ry;
    rainPositions[i6 + 2] = rz;
    rainPositions[i6 + 3] = rx;
    rainPositions[i6 + 4] = ry + 0.55;
    rainPositions[i6 + 5] = rz;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = new THREE.LineBasicMaterial({
    color: 0xcbe4ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const rainLines = new THREE.LineSegments(rainGeo, rainMat);
  rainLines.visible = false;
  scene.add(rainLines);

  let weatherState = {
    phase: "night",
    temp: 18,
    wind: 6,
    clouds: 15,
    rain: 0,
    storm: false,
  };
  let basePatioWarm = 38;
  let fanSpeed = 7.5;
  let nextLightningAt = 0;
  let lightningFlash = 0;

  function setWeather(next = {}) {
    weatherState = { ...weatherState, ...next };
    const { phase, temp, wind, clouds, rain, storm } = weatherState;
    const cloudFrac = Math.min(1, Math.max(0, (clouds || 0) / 100));
    const wet = Math.min(1, rain || 0);

    // Iluminación, niebla y cielo según fase del día y nubosidad
    let nightFactor = 1;
    if (phase === "day") {
      nightFactor = 0.14 + cloudFrac * 0.25 + wet * 0.25;
      skyUniforms.uZenith.value.setHex(0x1f6fd4).lerp(new THREE.Color(0x364152), cloudFrac * 0.8 + wet * 0.4);
      skyUniforms.uHorizon.value.setHex(0x9bd2ff).lerp(new THREE.Color(0x64748b), cloudFrac * 0.78 + wet * 0.4);
      skyUniforms.uStars.value = 0;
      hemiLight.color.setHex(0xbbe0ff);
      hemiLight.groundColor.setHex(0x6e5f4f);
      hemiLight.intensity = 1.28 - cloudFrac * 0.35;
      moon.color.setHex(0xfff4de);
      moon.position.set(22, 34, 14);
      moon.intensity = 2.05 - cloudFrac * 1.15 - wet * 0.35;
      sceneFog.color.setHex(0x88b4dc).lerp(new THREE.Color(0x4b586b), cloudFrac * 0.8);
      sceneFog.density = 0.0045 + cloudFrac * 0.004 + wet * 0.006;
      renderer.toneMappingExposure = 1.05 - wet * 0.1;
      scene.environmentIntensity = 0.78 - wet * 0.15;
    } else if (phase === "sunset") {
      nightFactor = 0.65;
      skyUniforms.uZenith.value.setHex(0x1a2346).lerp(new THREE.Color(0x282c3f), cloudFrac * 0.6);
      skyUniforms.uHorizon.value.setHex(0xe47b52).lerp(new THREE.Color(0x6b5661), cloudFrac * 0.65);
      skyUniforms.uStars.value = 0.28;
      hemiLight.color.setHex(0xa882b8);
      hemiLight.groundColor.setHex(0x3d281c);
      hemiLight.intensity = 0.96 - cloudFrac * 0.2;
      moon.color.setHex(0xffb066);
      moon.position.set(-28, 12, 6);
      moon.intensity = 1.45 - cloudFrac * 0.6;
      sceneFog.color.setHex(0x4a313b);
      sceneFog.density = 0.0075 + wet * 0.005;
      renderer.toneMappingExposure = 1.12;
      scene.environmentIntensity = 0.56;
    } else {
      nightFactor = 1;
      skyUniforms.uZenith.value.setHex(0x03060f);
      skyUniforms.uHorizon.value.setHex(0x182136).lerp(new THREE.Color(0x222938), cloudFrac * 0.6);
      skyUniforms.uStars.value = 1.0;
      hemiLight.color.setHex(0x6e89bf);
      hemiLight.groundColor.setHex(0x261c14);
      hemiLight.intensity = 0.78 - wet * 0.12;
      moon.color.setHex(0xc2d5ff);
      moon.position.set(-18, 28, -12);
      moon.intensity = 0.65 - cloudFrac * 0.25;
      sceneFog.color.setHex(0x090f1d);
      sceneFog.density = 0.0115 + wet * 0.0055;
      renderer.toneMappingExposure = 1.15;
      scene.environmentIntensity = 0.48;
    }

    skyUniforms.uClouds.value = cloudFrac;
    scene.background.copy(sceneFog.color);

    // Luces del patio (guirnaldas, barra, haces de entrada y charcos en el suelo)
    basePatioWarm = 4 + nightFactor * 35;
    patioWarm.intensity = basePatioWarm;
    barGlow.intensity = 4 + nightFactor * 16;
    stallsLightN.intensity = 5 + nightFactor * 13;
    stallsLightS.intensity = 5 + nightFactor * 13;
    facadeGlow.intensity = 1 + nightFactor * 10;
    haloMat.opacity = 0.08 + nightFactor * 0.7;
    bulbMat.color.setHex(nightFactor > 0.35 ? 0xffe8a3 : 0xd6d3c9);
    beamMat.opacity = 0.04 + nightFactor * 0.48;
    floorPools.forEach((p) => {
      p.mat.opacity = p.baseOpacity * (0.12 + nightFactor * 0.88);
    });

    // Suelo mojado con reflejos cuando llueve
    matGravel.roughness = 0.96 - wet * 0.6;
    matGravel.metalness = wet * 0.32;
    matConcrete.roughness = 0.86 - wet * 0.56;
    matConcrete.metalness = wet * 0.28;

    // Lluvia 3D
    rainLines.visible = wet > 0.02;
    rainMat.opacity = wet * 0.52;

    // Calentadores tipo hongo en noches/tardes frescas (<21°C o noche <23°C) y velocidad de ventiladores
    const heatersOn = temp < 21 || (phase !== "day" && temp < 23);
    heaterEmitters.forEach((m) => m.color.setHex(heatersOn ? 0xff8a2b : 0x3f3f46));
    heaterPools.forEach((p) => {
      p.mat.opacity = heatersOn ? p.baseOpacity * (0.35 + nightFactor * 0.65) : 0;
    });
    fanSpeed = temp >= 25 ? 11.5 : temp >= 20 ? 7.5 : 3.2;
    if (storm) nextLightningAt = performance.now() + 2500;
  }

  // ---------------- Control de Cámara Orbital + Tap Raycast + Presets ----------------
  const PRESETS = {
    vista: { target: [0.6, 1.2, 0.2], theta: -2.48, phi: 0.94, radius: 26.8 },
    entrada: { target: [-4.0, 1.5, 0], theta: Math.PI, phi: 1.40, radius: 22.4 },
    patio: { target: [3.2, 1.6, 0.2], theta: -2.75, phi: 1.34, radius: 12.0 },
  };

  let interactive = false;
  let autoOrbit = true;
  let selectedId = null;

  const current = {
    target: new THREE.Vector3(...PRESETS.vista.target),
    theta: PRESETS.vista.theta,
    phi: PRESETS.vista.phi,
    radius: PRESETS.vista.radius,
  };
  const goal = {
    target: current.target.clone(),
    theta: current.theta,
    phi: current.phi,
    radius: current.radius,
  };

  function shortestAngleDiff(from, to) {
    return Math.atan2(Math.sin(to - from), Math.cos(to - from));
  }

  function applyCamera() {
    const sinPhi = Math.sin(current.phi);
    camera.position.set(
      current.target.x + current.radius * sinPhi * Math.cos(current.theta),
      current.target.y + current.radius * Math.cos(current.phi),
      current.target.z + current.radius * sinPhi * Math.sin(current.theta)
    );
    camera.lookAt(current.target);
  }
  applyCamera();

  function setSize(w, h) {
    if (!w || !h) return;
    const aspect = w / h;
    camera.aspect = aspect;
    camera.fov = aspect < 0.85 ? 58 : 44;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  const ro = new ResizeObserver((entries) => {
    for (const e of entries) setSize(Math.round(e.contentRect.width), Math.round(e.contentRect.height));
  });
  ro.observe(canvas.parentElement);

  const pinEls = {};
  if (pinsLayer) {
    Object.values(localsMeta).forEach((m) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pin3d";
      btn.dataset.id = m.id;
      btn.setAttribute("aria-label", `Ver ${m.id} en 3D`);
      btn.innerHTML = `<i></i><span></span>`;
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        selectLocal(m.id);
      });
      pinsLayer.appendChild(btn);
      pinEls[m.id] = btn;
    });
  }

  function setPinLabels(labelsById) {
    Object.entries(labelsById).forEach(([id, label]) => {
      if (pinEls[id]) pinEls[id].querySelector("span").textContent = label;
    });
  }

  function selectLocal(id, notify = true) {
    const meta = localsMeta[id];
    if (!meta) return;
    selectedId = id;
    autoOrbit = false;

    const offset = meta.camPos.clone().sub(meta.lookAt);
    const r = offset.length();
    goal.target.copy(meta.lookAt);
    goal.radius = r;
    goal.phi = THREE.MathUtils.clamp(Math.acos(offset.y / r), 0.25, 1.42);
    goal.theta = Math.atan2(offset.z, offset.x);

    Object.entries(localsMeta).forEach(([k, m]) => {
      m.ring.material.opacity = k === id ? 0.85 : 0;
      if (pinEls[k]) pinEls[k].classList.toggle("on", k === id);
    });
    if (notify && onSelectLocal) onSelectLocal(id);
  }

  function clearSelection() {
    selectedId = null;
    Object.entries(localsMeta).forEach(([k, m]) => {
      m.ring.material.opacity = 0;
      if (pinEls[k]) pinEls[k].classList.remove("on");
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

  // ---------------- Manejo táctil / mouse ----------------
  const pointers = new Map();
  let dragStart = null;
  let movedDist = 0;
  let downTime = 0;
  let lastPinchDist = 0;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function pinchDistance() {
    const pts = [...pointers.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (!interactive) return;
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    autoOrbit = false;
    if (pointers.size === 1) {
      dragStart = { x: e.clientX, y: e.clientY };
      movedDist = 0;
      downTime = performance.now();
    } else if (pointers.size === 2) {
      lastPinchDist = pinchDistance();
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!interactive || !pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 1) {
      movedDist += Math.hypot(dx, dy);
      goal.theta += dx * 0.0065;
      goal.phi = THREE.MathUtils.clamp(goal.phi - dy * 0.0055, 0.22, 1.42);
    } else if (pointers.size === 2) {
      const dist = pinchDistance();
      if (lastPinchDist > 0) {
        goal.radius = THREE.MathUtils.clamp(goal.radius - (dist - lastPinchDist) * 0.045, 6.2, 34);
      }
      lastPinchDist = dist;
    }
  });

  function handlePointerUp(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) lastPinchDist = 0;
    if (interactive && pointers.size === 0 && dragStart && movedDist < 9 && performance.now() - downTime < 380) {
      const rect = canvas.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(hitboxes, false);
      if (hits.length > 0 && hits[0].object.userData.localId) {
        selectLocal(hits[0].object.userData.localId);
      }
    }
    if (pointers.size === 0) dragStart = null;
  }

  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener(
    "wheel",
    (e) => {
      if (!interactive) return;
      e.preventDefault();
      autoOrbit = false;
      goal.radius = THREE.MathUtils.clamp(goal.radius + e.deltaY * 0.015, 6.2, 34);
    },
    { passive: false }
  );

  // ---------------- Bucle de render y animaciones sutiles ----------------
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const projVec = new THREE.Vector3();
  let lastTs = performance.now();
  let lastTvTick = 0;
  let rafId = 0;

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    if (document.hidden) {
      lastTs = now;
      return;
    }
    const dt = Math.min(0.05, (now - lastTs) / 1000);
    lastTs = now;

    if (autoOrbit && !reducedMotion) {
      goal.theta += dt * (interactive ? 0.025 : 0.032);
    }

    const damp = 1 - Math.exp(-dt * 7.5);
    current.target.lerp(goal.target, damp);
    current.theta += shortestAngleDiff(current.theta, goal.theta) * damp;
    current.phi += (goal.phi - current.phi) * damp;
    current.radius += (goal.radius - current.radius) * damp;

    if (!reducedMotion) {
      skyUniforms.uTime.value = now * 0.001;
      patioWarm.intensity = basePatioWarm + Math.sin(now * 0.0022) * (basePatioWarm > 15 ? 2.4 : 0.4);
      animatedFans.forEach((f) => { f.rotation.z += dt * fanSpeed; });

      // Movimiento por viento en árboles y banderines
      const windAmp = 0.35 + Math.min(2.6, (weatherState.wind || 0) / 11);
      swayGroups.forEach((s) => {
        const wv = Math.sin(now * 0.0016 * (0.8 + windAmp * 0.35) + s.phase) * s.amp * windAmp;
        if (s.axis === "x") s.obj.rotation.x = wv;
        else s.obj.rotation.z = wv;
      });

      // Animación de lluvia inclinada por el viento
      if (rainLines.visible) {
        const posArr = rainGeo.attributes.position.array;
        const dropV = (15 + weatherState.rain * 9) * dt;
        const windX = ((weatherState.wind || 0) * 0.14) * dt;
        const streakX = (weatherState.wind || 0) * 0.015;
        for (let i = 0; i < rainCount; i++) {
          const i6 = i * 6;
          const sp = rainSeeds[i];
          posArr[i6] += windX * sp;
          posArr[i6 + 1] -= dropV * sp;
          if (posArr[i6 + 1] < 0) {
            posArr[i6 + 1] = 13.5 + Math.random() * 1.5;
            posArr[i6] = (Math.random() - 0.5) * 34;
            posArr[i6 + 2] = (Math.random() - 0.5) * 26;
          }
          if (posArr[i6] > 17) posArr[i6] -= 34;
          posArr[i6 + 3] = posArr[i6] - streakX;
          posArr[i6 + 4] = posArr[i6 + 1] + 0.55;
          posArr[i6 + 5] = posArr[i6 + 2];
        }
        rainGeo.attributes.position.needsUpdate = true;

        if (weatherState.storm && now > nextLightningAt) {
          lightningFlash = 0.65;
          nextLightningAt = now + 4500 + Math.random() * 6000;
        }
      }
      if (lightningFlash > 0.001) {
        lightningFlash *= Math.exp(-dt * 9);
        skyUniforms.uFlash.value = lightningFlash;
      } else {
        skyUniforms.uFlash.value = 0;
      }

      if (now - lastTvTick > 140) {
        tex.updateTvScreen(now * 0.001);
        lastTvTick = now;
      }
    }

    applyCamera();
    renderer.render(scene, camera);

    if (pinsLayer && interactive) {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const minY = 128;
      const maxY = h - 118;
      const visibles = [];

      Object.values(localsMeta).forEach((m) => {
        const el = pinEls[m.id];
        if (!el) return;
        projVec.copy(m.pinPos).project(camera);
        const inFront = projVec.z < 1 && projVec.x > -1.1 && projVec.x < 1.1 && projVec.y > -1.1 && projVec.y < 1.1;
        const visible = inFront && !selectedId;
        el.style.opacity = visible ? "1" : "0";
        el.style.pointerEvents = visible ? "auto" : "none";
        if (visible) {
          const bw = Math.max(92, el.offsetWidth || 120);
          const padX = Math.min(bw / 2 + 10, w * 0.44);
          const rawX = (projVec.x * 0.5 + 0.5) * w;
          const rawY = (-projVec.y * 0.5 + 0.5) * h;
          visibles.push({
            el,
            w: bw + 10,
            h: 40,
            x: Math.min(w - padX, Math.max(padX, rawX)),
            y: Math.min(maxY, Math.max(minY, rawY)),
            padX,
          });
        }
      });

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
  rafId = requestAnimationFrame(frame);
  if (onReady) onReady();

  return {
    setInteractive,
    setPreset,
    selectLocal,
    clearSelection,
    setPinLabels,
    setWeather,
    destroy() {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.dispose();
    },
  };
}
