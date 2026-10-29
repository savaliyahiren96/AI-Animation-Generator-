import * as THREE from 'three';
import { AnatomicalRegion, PathologyCondition } from '../types/medical';

// Generate procedural anatomical bone textures so there are ZERO 404 dependencies
export function createBoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm cortical bone base
  ctx.fillStyle = '#e8e4d8';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle trabecular and haversian canal micro-noise
  for (let i = 0; i < 2400; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const radius = Math.random() * 2 + 0.5;
    const shade = Math.floor(Math.random() * 25 + 215);
    ctx.fillStyle = `rgb(${shade}, ${shade - 6}, ${shade - 14})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Longitudinal vascular striations
  ctx.strokeStyle = 'rgba(195, 185, 165, 0.25)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 512;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(
      x + (Math.random() - 0.5) * 40,
      170,
      x + (Math.random() - 0.5) * 40,
      340,
      x + (Math.random() - 0.5) * 20,
      512
    );
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural fibrous ligament texture
export function createLigamentTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#dbeafe';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1.0;
  for (let i = 0; i < 80; i++) {
    const y = (i * 256) / 80;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y + (Math.random() - 0.5) * 8);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Materials cache
export interface AnatomyMaterials {
  bone: THREE.MeshStandardMaterial;
  boneTransparent: THREE.MeshStandardMaterial;
  cartilage: THREE.MeshPhysicalMaterial;
  cartilageOA: THREE.MeshPhysicalMaterial;
  meniscus: THREE.MeshStandardMaterial;
  meniscusTorn: THREE.MeshStandardMaterial;
  acl: THREE.MeshStandardMaterial;
  aclTorn: THREE.MeshStandardMaterial;
  pcl: THREE.MeshStandardMaterial;
  collateral: THREE.MeshStandardMaterial;
  tendon: THREE.MeshStandardMaterial;
  nerve: THREE.MeshStandardMaterial;
  osteophyte: THREE.MeshStandardMaterial;
  highlight: THREE.MeshStandardMaterial;
}

export function createAnatomyMaterials(): AnatomyMaterials {
  const boneTex = createBoneTexture();
  const ligTex = createLigamentTexture();

  return {
    bone: new THREE.MeshStandardMaterial({
      color: 0xeeece2,
      roughness: 0.55,
      metalness: 0.05,
      map: boneTex,
    }),
    boneTransparent: new THREE.MeshStandardMaterial({
      color: 0xeeece2,
      roughness: 0.4,
      metalness: 0.1,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    }),
    cartilage: new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      roughness: 0.15,
      metalness: 0.05,
      transmission: 0.35,
      transparent: true,
      opacity: 0.9,
      reflectivity: 0.7,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
    }),
    cartilageOA: new THREE.MeshPhysicalMaterial({
      color: 0xa88358,
      roughness: 0.75,
      metalness: 0.1,
      transmission: 0.05,
      transparent: true,
      opacity: 0.85,
    }),
    meniscus: new THREE.MeshStandardMaterial({
      color: 0x86efac,
      roughness: 0.45,
      metalness: 0.05,
    }),
    meniscusTorn: new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.65,
      metalness: 0.05,
    }),
    acl: new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.35,
      metalness: 0.1,
      map: ligTex,
    }),
    aclTorn: new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.6,
      metalness: 0.1,
    }),
    pcl: new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.35,
      metalness: 0.1,
      map: ligTex,
    }),
    collateral: new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.4,
      metalness: 0.05,
      map: ligTex,
    }),
    tendon: new THREE.MeshStandardMaterial({
      color: 0xfb7185,
      roughness: 0.4,
      metalness: 0.05,
    }),
    nerve: new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.3,
      metalness: 0.1,
      emissive: 0x5a4a00,
    }),
    osteophyte: new THREE.MeshStandardMaterial({
      color: 0xb59e7a,
      roughness: 0.7,
      metalness: 0.15,
    }),
    highlight: new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.2,
    }),
  };
}

// -------------------------------------------------------------------------
// 1. KNEE ANATOMICAL MODEL
// -------------------------------------------------------------------------
export interface KneeNodes {
  femurGroup: THREE.Group;
  tibiaGroup: THREE.Group;
  patellaGroup: THREE.Group;
  patellarTendonMesh: THREE.Mesh;
  quadricepsTendonMesh: THREE.Mesh;
  medialMeniscusMesh: THREE.Mesh;
  lateralMeniscusMesh: THREE.Mesh;
  aclMesh: THREE.Mesh;
  pclMesh: THREE.Mesh;
  mclMesh: THREE.Mesh;
  lclMesh: THREE.Mesh;
  cartilageFemurMesh: THREE.Mesh;
  cartilageTibiaMesh: THREE.Mesh;
  osteophyteGroup: THREE.Group;
}

export function buildKneeAnatomy(
  materials: AnatomyMaterials,
  pathology: PathologyCondition = 'normal'
): { group: THREE.Group; nodes: KneeNodes } {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'knee-root';

  // Femur assembly (proximal origin, condyles articulate at Y = 0)
  const femurGroup = new THREE.Group();
  femurGroup.name = 'femur-group';
  femurGroup.position.set(0, 0, 0);

  // Femur shaft
  const femurShaftGeo = new THREE.CylinderGeometry(0.72, 0.88, 3.8, 24, 12);
  femurShaftGeo.translate(0, 2.6, 0);
  const femurShaftMesh = new THREE.Mesh(femurShaftGeo, materials.bone);
  femurShaftMesh.castShadow = true;
  femurShaftMesh.receiveShadow = true;
  femurGroup.add(femurShaftMesh);

  // Medial and Lateral Femoral Condyles
  // Medial Condyle
  const medialCondyleGeo = new THREE.SphereGeometry(0.85, 24, 18);
  medialCondyleGeo.scale(0.88, 1.15, 1.35);
  medialCondyleGeo.translate(-0.85, 0.45, -0.15);
  const medialCondyleMesh = new THREE.Mesh(medialCondyleGeo, materials.bone);
  medialCondyleMesh.castShadow = true;
  medialCondyleMesh.receiveShadow = true;
  femurGroup.add(medialCondyleMesh);

  // Lateral Condyle
  const lateralCondyleGeo = new THREE.SphereGeometry(0.82, 24, 18);
  lateralCondyleGeo.scale(0.84, 1.1, 1.3);
  lateralCondyleGeo.translate(0.85, 0.45, -0.15);
  const lateralCondyleMesh = new THREE.Mesh(lateralCondyleGeo, materials.bone);
  lateralCondyleMesh.castShadow = true;
  lateralCondyleMesh.receiveShadow = true;
  femurGroup.add(lateralCondyleMesh);

  // Trochlear Groove (anterior articulation for patella)
  const trochleaGeo = new THREE.CylinderGeometry(0.55, 0.65, 1.2, 16, 6, false, 0, Math.PI);
  trochleaGeo.rotateZ(Math.PI / 2);
  trochleaGeo.scale(1.4, 0.4, 0.6);
  trochleaGeo.translate(0, 0.8, 0.65);
  const trochleaMesh = new THREE.Mesh(trochleaGeo, materials.bone);
  femurGroup.add(trochleaMesh);

  // Femoral Articular Cartilage (Covers both condyles and trochlea)
  const isOA = pathology === 'knee-osteoarthritis';
  const cartMat = isOA ? materials.cartilageOA : materials.cartilage;

  const femCartGeo = new THREE.SphereGeometry(0.87, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  femCartGeo.scale(1.9, 0.55, 1.3);
  femCartGeo.translate(0, 0.12, -0.1);
  const cartilageFemurMesh = new THREE.Mesh(femCartGeo, cartMat);
  cartilageFemurMesh.name = 'cartilage-femur';
  femurGroup.add(cartilageFemurMesh);

  // Osteophytes (Bone spurs formed in osteoarthritis)
  const osteophyteGroup = new THREE.Group();
  osteophyteGroup.name = 'osteophytes';
  if (isOA) {
    // Medial marginal bone spur
    const spur1Geo = new THREE.ConeGeometry(0.22, 0.45, 10);
    spur1Geo.rotateZ(Math.PI / 2.3);
    spur1Geo.translate(-1.65, 0.45, 0.1);
    const spur1 = new THREE.Mesh(spur1Geo, materials.osteophyte);
    osteophyteGroup.add(spur1);

    // Lateral spur
    const spur2Geo = new THREE.ConeGeometry(0.18, 0.35, 10);
    spur2Geo.rotateZ(-Math.PI / 2.2);
    spur2Geo.translate(1.6, 0.4, -0.2);
    const spur2 = new THREE.Mesh(spur2Geo, materials.osteophyte);
    osteophyteGroup.add(spur2);

    // Trochlear rim spur
    const spur3Geo = new THREE.SphereGeometry(0.25, 12, 10);
    spur3Geo.scale(1.4, 0.5, 0.6);
    spur3Geo.translate(0, 1.45, 0.95);
    const spur3 = new THREE.Mesh(spur3Geo, materials.osteophyte);
    osteophyteGroup.add(spur3);
  }
  femurGroup.add(osteophyteGroup);

  // -------------------------------------------------------------
  // Tibia & Fibula assembly (articulates with distal femur)
  // -------------------------------------------------------------
  const tibiaGroup = new THREE.Group();
  tibiaGroup.name = 'tibia-group';
  tibiaGroup.position.set(0, -0.05, 0);

  // Tibial Plateau (Medial & Lateral surfaces + Intercondylar Eminence)
  const tibialPlateauGeo = new THREE.CylinderGeometry(1.65, 1.45, 0.9, 28, 6);
  tibialPlateauGeo.scale(1.15, 1.0, 0.95);
  tibialPlateauGeo.translate(0, -0.45, 0);
  const tibialPlateauMesh = new THREE.Mesh(tibialPlateauGeo, materials.bone);
  tibialPlateauMesh.castShadow = true;
  tibialPlateauMesh.receiveShadow = true;
  tibiaGroup.add(tibialPlateauMesh);

  // Tibial Spine / Intercondylar eminence (central bony ridge)
  const tibialSpineGeo = new THREE.ConeGeometry(0.25, 0.45, 12);
  tibialSpineGeo.translate(0, 0.1, -0.05);
  const tibialSpineMesh = new THREE.Mesh(tibialSpineGeo, materials.bone);
  tibiaGroup.add(tibialSpineMesh);

  // Tibial Tuberosity (anterior projection for patellar tendon insertion)
  const tuberosityGeo = new THREE.BoxGeometry(0.65, 0.8, 0.55);
  tuberosityGeo.translate(0, -0.65, 0.95);
  const tuberosityMesh = new THREE.Mesh(tuberosityGeo, materials.bone);
  tibiaGroup.add(tuberosityMesh);

  // Tibial Shaft
  const tibiaShaftGeo = new THREE.CylinderGeometry(1.1, 0.75, 4.2, 24, 10);
  tibiaShaftGeo.translate(0, -2.8, -0.05);
  const tibiaShaftMesh = new THREE.Mesh(tibiaShaftGeo, materials.bone);
  tibiaShaftMesh.castShadow = true;
  tibiaShaftMesh.receiveShadow = true;
  tibiaGroup.add(tibiaShaftMesh);

  // Fibular Head & Shaft (lateral side, articulates below lateral tibial plateau)
  const fibulaGroup = new THREE.Group();
  fibulaGroup.name = 'fibula-group';
  const fibulaHeadGeo = new THREE.SphereGeometry(0.38, 16, 12);
  fibulaHeadGeo.translate(1.68, -0.55, -0.25);
  const fibulaHeadMesh = new THREE.Mesh(fibulaHeadGeo, materials.bone);
  fibulaGroup.add(fibulaHeadMesh);

  const fibulaShaftGeo = new THREE.CylinderGeometry(0.26, 0.22, 3.8, 16, 8);
  fibulaShaftGeo.translate(1.68, -2.55, -0.25);
  const fibulaShaftMesh = new THREE.Mesh(fibulaShaftGeo, materials.bone);
  fibulaShaftMesh.castShadow = true;
  fibulaGroup.add(fibulaShaftMesh);
  tibiaGroup.add(fibulaGroup);

  // Tibial Articular Cartilage
  const tibCartGeo = new THREE.CylinderGeometry(1.58, 1.58, 0.14, 28);
  tibCartGeo.scale(1.08, 1.0, 0.92);
  tibCartGeo.translate(0, 0.04, 0);
  const cartilageTibiaMesh = new THREE.Mesh(tibCartGeo, cartMat);
  cartilageTibiaMesh.name = 'cartilage-tibia';
  tibiaGroup.add(cartilageTibiaMesh);

  // Medial Meniscus (C-shaped semi-lunar fibrocartilage wedge)
  const medMenGeo = new THREE.TorusGeometry(0.78, 0.22, 14, 28, Math.PI * 1.5);
  medMenGeo.rotateX(Math.PI / 2);
  medMenGeo.scale(0.95, 0.5, 1.2);
  medMenGeo.translate(-0.82, 0.12, 0);
  const isMeniscalTorn = pathology === 'meniscal-tear';
  const medialMeniscusMesh = new THREE.Mesh(
    medMenGeo,
    isMeniscalTorn ? materials.meniscusTorn : materials.meniscus
  );
  medialMeniscusMesh.name = 'medial-meniscus';
  medialMeniscusMesh.castShadow = true;
  tibiaGroup.add(medialMeniscusMesh);

  // Lateral Meniscus (More circular, compact ring)
  const latMenGeo = new THREE.TorusGeometry(0.68, 0.22, 14, 28, Math.PI * 1.75);
  latMenGeo.rotateX(Math.PI / 2);
  latMenGeo.scale(1.0, 0.5, 1.05);
  latMenGeo.translate(0.82, 0.12, 0);
  const lateralMeniscusMesh = new THREE.Mesh(latMenGeo, materials.meniscus);
  lateralMeniscusMesh.name = 'lateral-meniscus';
  lateralMeniscusMesh.castShadow = true;
  tibiaGroup.add(lateralMeniscusMesh);

  // -------------------------------------------------------------
  // Cruciate & Collateral Ligaments
  // -------------------------------------------------------------
  // ACL (Anterior Cruciate Ligament: from posteromedial lateral condyle to anterior tibial plateau)
  const isAclTorn = pathology === 'acl-tear';
  const aclCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.5, 0.8, -0.4), // lateral femoral notch
    new THREE.Vector3(0.2, 0.45, -0.15),
    new THREE.Vector3(-0.15, 0.05, 0.35), // anterior tibial spine
  ]);
  const aclGeo = new THREE.TubeGeometry(aclCurve, 20, 0.16, 12, false);
  const aclMesh = new THREE.Mesh(aclGeo, isAclTorn ? materials.aclTorn : materials.acl);
  aclMesh.name = 'acl';
  aclMesh.castShadow = true;
  rootGroup.add(aclMesh);

  // PCL (Posterior Cruciate Ligament: from anteromedial medial condyle to posterior tibial plateau)
  const pclCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.4, 0.75, 0.1), // medial femoral condyle
    new THREE.Vector3(-0.1, 0.45, -0.2),
    new THREE.Vector3(0.1, -0.1, -0.65), // posterior tibial plateau
  ]);
  const pclGeo = new THREE.TubeGeometry(pclCurve, 20, 0.18, 12, false);
  const pclMesh = new THREE.Mesh(pclGeo, materials.pcl);
  pclMesh.name = 'pcl';
  pclMesh.castShadow = true;
  rootGroup.add(pclMesh);

  // MCL (Medial Collateral Ligament: broad flat band on medial side)
  const mclCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.45, 1.1, 0.0),
    new THREE.Vector3(-1.52, 0.2, 0.02),
    new THREE.Vector3(-1.48, -0.9, -0.05),
  ]);
  const mclGeo = new THREE.TubeGeometry(mclCurve, 16, 0.15, 10, false);
  mclGeo.scale(0.5, 1.0, 1.6);
  const mclMesh = new THREE.Mesh(mclGeo, materials.collateral);
  mclMesh.name = 'mcl';
  rootGroup.add(mclMesh);

  // LCL (Lateral Collateral Ligament: cord-like band to fibular head)
  const lclCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.45, 1.05, -0.05),
    new THREE.Vector3(1.58, 0.25, -0.15),
    new THREE.Vector3(1.68, -0.5, -0.25),
  ]);
  const lclGeo = new THREE.TubeGeometry(lclCurve, 16, 0.13, 10, false);
  const lclMesh = new THREE.Mesh(lclGeo, materials.collateral);
  lclMesh.name = 'lcl';
  rootGroup.add(lclMesh);

  // -------------------------------------------------------------
  // Patellofemoral Mechanism (Patella, Quad Tendon, Patellar Ligament)
  // -------------------------------------------------------------
  const patellaGroup = new THREE.Group();
  patellaGroup.name = 'patella-group';
  patellaGroup.position.set(0, 0.85, 1.35);

  const patellaGeo = new THREE.CylinderGeometry(0.55, 0.35, 0.3, 20);
  patellaGeo.rotateX(Math.PI / 2);
  patellaGeo.scale(1.1, 1.3, 0.7);
  const isPatellofemoralPain = pathology === 'patellofemoral-pain';
  const patellaMesh = new THREE.Mesh(
    patellaGeo,
    isPatellofemoralPain ? materials.boneTransparent : materials.bone
  );
  patellaMesh.castShadow = true;
  patellaGroup.add(patellaMesh);

  // Retropatellar articular cartilage facet
  const retroCartGeo = new THREE.CylinderGeometry(0.48, 0.32, 0.08, 16);
  retroCartGeo.rotateX(Math.PI / 2);
  retroCartGeo.translate(0, 0, -0.15);
  const retroCartMesh = new THREE.Mesh(
    retroCartGeo,
    isPatellofemoralPain ? materials.cartilageOA : materials.cartilage
  );
  patellaGroup.add(retroCartMesh);

  // Quadriceps Tendon (Extending upward from superior patella)
  const quadTendonGeo = new THREE.BoxGeometry(0.75, 1.6, 0.16);
  quadTendonGeo.translate(0, 1.0, 0);
  const quadricepsTendonMesh = new THREE.Mesh(quadTendonGeo, materials.tendon);
  quadricepsTendonMesh.name = 'quadriceps-tendon';
  patellaGroup.add(quadricepsTendonMesh);

  // Patellar Tendon (From inferior patellar pole to tibial tuberosity)
  const patellarTendonGeo = new THREE.BoxGeometry(0.65, 1.4, 0.16);
  patellarTendonGeo.translate(0, -0.85, -0.1);
  const patellarTendonMesh = new THREE.Mesh(patellarTendonGeo, materials.tendon);
  patellarTendonMesh.name = 'patellar-tendon';
  patellaGroup.add(patellarTendonMesh);

  rootGroup.add(femurGroup);
  rootGroup.add(tibiaGroup);
  rootGroup.add(patellaGroup);

  const nodes: KneeNodes = {
    femurGroup,
    tibiaGroup,
    patellaGroup,
    patellarTendonMesh,
    quadricepsTendonMesh,
    medialMeniscusMesh,
    lateralMeniscusMesh,
    aclMesh,
    pclMesh,
    mclMesh,
    lclMesh,
    cartilageFemurMesh,
    cartilageTibiaMesh,
    osteophyteGroup,
  };

  return { group: rootGroup, nodes };
}

// -------------------------------------------------------------------------
// 2. SPINE (L4-L5 LUMBAR SEGMENT) ANATOMY MODEL (Phase 6)
// -------------------------------------------------------------------------
export function buildSpineAnatomy(
  materials: AnatomyMaterials,
  pathology: PathologyCondition = 'normal'
): { group: THREE.Group; nodes: any } {
  const root = new THREE.Group();
  root.name = 'spine-root';

  const isHerniation = pathology === 'disc-herniation';

  // L4 Vertebra
  const l4Group = new THREE.Group();
  l4Group.position.set(0, 1.1, 0);
  const l4BodyGeo = new THREE.CylinderGeometry(1.4, 1.4, 1.1, 24);
  l4BodyGeo.scale(1.2, 1.0, 0.9);
  const l4Body = new THREE.Mesh(l4BodyGeo, materials.bone);
  l4Body.castShadow = true;
  l4Group.add(l4Body);

  // L4 Spinous process (posterior spine)
  const l4SpineGeo = new THREE.BoxGeometry(0.4, 0.8, 1.5);
  l4SpineGeo.translate(0, 0, -1.4);
  const l4Spine = new THREE.Mesh(l4SpineGeo, materials.bone);
  l4Group.add(l4Spine);
  root.add(l4Group);

  // L4-L5 Intervertebral Disc
  const discGeo = new THREE.CylinderGeometry(1.42, 1.42, 0.7, 28);
  discGeo.scale(1.2, 1.0, 0.9);
  discGeo.translate(0, 0.2, 0);
  const discMesh = new THREE.Mesh(discGeo, materials.cartilage);
  root.add(discMesh);

  // Herniated Disc extrusion (if pathological)
  if (isHerniation) {
    const herniationGeo = new THREE.SphereGeometry(0.42, 16, 14);
    herniationGeo.scale(1.2, 0.7, 1.4);
    herniationGeo.translate(-0.85, 0.2, -0.85); // posterolateral extrusion
    const herniationMesh = new THREE.Mesh(herniationGeo, materials.cartilageOA);
    root.add(herniationMesh);
  }

  // L5 Vertebra
  const l5Group = new THREE.Group();
  l5Group.position.set(0, -0.8, 0);
  const l5BodyGeo = new THREE.CylinderGeometry(1.45, 1.45, 1.1, 24);
  l5BodyGeo.scale(1.2, 1.0, 0.9);
  const l5Body = new THREE.Mesh(l5BodyGeo, materials.bone);
  l5Body.castShadow = true;
  l5Group.add(l5Body);

  const l5SpineGeo = new THREE.BoxGeometry(0.4, 0.8, 1.5);
  l5SpineGeo.translate(0, 0, -1.4);
  const l5Spine = new THREE.Mesh(l5SpineGeo, materials.bone);
  l5Group.add(l5Spine);
  root.add(l5Group);

  // Exiting L5 Nerve Root (passing next to the posterolateral disc)
  const nerveCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.0, -0.65),
    new THREE.Vector3(-0.9, 0.15, -0.9), // compresses here if herniated
    new THREE.Vector3(-1.6, -0.9, -1.1),
  ]);
  const nerveGeo = new THREE.TubeGeometry(nerveCurve, 20, 0.14, 10, false);
  const nerveMat = isHerniation ? materials.aclTorn : materials.nerve;
  const nerveMesh = new THREE.Mesh(nerveGeo, nerveMat);
  root.add(nerveMesh);

  return { group: root, nodes: { l4Group, l5Group, discMesh, nerveMesh } };
}

// -------------------------------------------------------------------------
// 3. SHOULDER COMPLEX ANATOMY MODEL (Phase 6)
// -------------------------------------------------------------------------
export function buildShoulderAnatomy(
  materials: AnatomyMaterials,
  pathology: PathologyCondition = 'normal'
): { group: THREE.Group; nodes: any } {
  const root = new THREE.Group();
  root.name = 'shoulder-root';

  const isImpingement = pathology === 'shoulder-impingement';

  // Scapula with Glenoid & Acromion
  const scapulaGroup = new THREE.Group();
  scapulaGroup.position.set(0, 0, 0);

  // Glenoid Fossa
  const glenoidGeo = new THREE.CylinderGeometry(0.65, 0.75, 0.35, 20);
  glenoidGeo.rotateZ(Math.PI / 2);
  glenoidGeo.translate(-0.8, 0, 0);
  const glenoidMesh = new THREE.Mesh(glenoidGeo, materials.bone);
  scapulaGroup.add(glenoidMesh);

  // Acromion Process (Arch above humeral head)
  const acromionGeo = new THREE.BoxGeometry(1.6, 0.3, 1.2);
  acromionGeo.translate(-0.3, 1.25, 0.1);
  const acromionMesh = new THREE.Mesh(acromionGeo, materials.bone);
  scapulaGroup.add(acromionMesh);
  root.add(scapulaGroup);

  // Proximal Humerus (Head, Greater Tuberosity, Shaft)
  const humerusGroup = new THREE.Group();
  humerusGroup.position.set(0.6, 0, 0);

  // Humeral Head
  const headGeo = new THREE.SphereGeometry(0.9, 24, 18);
  headGeo.translate(-0.25, 0, 0);
  const headMesh = new THREE.Mesh(headGeo, materials.bone);
  humerusGroup.add(headMesh);

  // Humeral Shaft
  const shaftGeo = new THREE.CylinderGeometry(0.55, 0.45, 3.2, 20);
  shaftGeo.translate(0.5, -1.8, 0);
  const shaftMesh = new THREE.Mesh(shaftGeo, materials.bone);
  shaftMesh.castShadow = true;
  humerusGroup.add(shaftMesh);
  root.add(humerusGroup);

  // Supraspinatus Tendon (Passes beneath acromion to insert on greater tuberosity)
  const supraCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.4, 0.8, 0),
    new THREE.Vector3(-0.2, isImpingement ? 1.05 : 0.95, 0.05), // compressed under acromion
    new THREE.Vector3(0.5, 0.6, 0.1),
  ]);
  const supraGeo = new THREE.TubeGeometry(supraCurve, 20, 0.15, 10, false);
  const supraMat = isImpingement ? materials.aclTorn : materials.tendon;
  const supraMesh = new THREE.Mesh(supraGeo, supraMat);
  root.add(supraMesh);

  return { group: root, nodes: { scapulaGroup, humerusGroup, supraMesh } };
}

// -------------------------------------------------------------------------
// Helper: Contact Grounding Shadow Plane & Movement Planes
// -------------------------------------------------------------------------
export function createContactShadowPlane(): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
  grad.addColorStop(0, 'rgba(10, 20, 30, 0.45)');
  grad.addColorStop(0.6, 'rgba(10, 20, 30, 0.15)');
  grad.addColorStop(1, 'rgba(10, 20, 30, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const shadowTex = new THREE.CanvasTexture(canvas);
  const shadowGeo = new THREE.PlaneGeometry(7.5, 7.5);
  shadowGeo.rotateX(-Math.PI / 2);

  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });

  const plane = new THREE.Mesh(shadowGeo, shadowMat);
  plane.position.y = -3.2;
  plane.name = 'contact-shadow';
  return plane;
}

// Create Anatomical Movement Plane Grids (Sagittal, Frontal, Transverse)
export function createAnatomicalPlanes(): THREE.Group {
  const planesGroup = new THREE.Group();
  planesGroup.name = 'anatomical-planes';

  // Sagittal Plane (YZ plane)
  const sagittalMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const sagittalGeo = new THREE.PlaneGeometry(6, 6);
  sagittalGeo.rotateY(Math.PI / 2);
  const sagittalPlane = new THREE.Mesh(sagittalGeo, sagittalMat);
  sagittalPlane.name = 'plane-sagittal';
  planesGroup.add(sagittalPlane);

  // Frontal / Coronal Plane (XY plane)
  const coronalMat = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const coronalGeo = new THREE.PlaneGeometry(6, 6);
  const coronalPlane = new THREE.Mesh(coronalGeo, coronalMat);
  coronalPlane.name = 'plane-coronal';
  planesGroup.add(coronalPlane);

  // Transverse Plane (XZ plane at joint line)
  const transverseMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const transverseGeo = new THREE.PlaneGeometry(6, 6);
  transverseGeo.rotateX(Math.PI / 2);
  const transversePlane = new THREE.Mesh(transverseGeo, transverseMat);
  transversePlane.name = 'plane-transverse';
  planesGroup.add(transversePlane);

  // Joint Axis of Rotation Line (Instantaneous Center of Rotation)
  const axisMat = new THREE.LineBasicMaterial({ color: 0xf43f5e, linewidth: 2 });
  const axisGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-2.2, 0.45, -0.15),
    new THREE.Vector3(2.2, 0.45, -0.15),
  ]);
  const axisLine = new THREE.Line(axisGeo, axisMat);
  axisLine.name = 'axis-icr';
  planesGroup.add(axisLine);

  return planesGroup;
}
