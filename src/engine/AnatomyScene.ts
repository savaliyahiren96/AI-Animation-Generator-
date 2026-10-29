import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  AnatomicalRegion,
  CameraPreset,
  GoniometerMeasurement,
  MovementType,
  PathologyCondition,
  ViewMode,
} from '../types/medical';
import {
  AnatomyMaterials,
  buildKneeAnatomy,
  buildShoulderAnatomy,
  buildSpineAnatomy,
  createAnatomicalPlanes,
  createAnatomyMaterials,
  createContactShadowPlane,
  KneeNodes,
} from './proceduralAnatomy';

// Pre-allocated math variables outside render loop to eliminate Garbage Collection
const _tempVec3 = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetCamLookAt = new THREE.Vector3();

export interface AnatomySceneConfig {
  container: HTMLDivElement;
  region: AnatomicalRegion;
  pathology: PathologyCondition;
  onStructureSelected?: (structureId: string | null) => void;
  onAngleChanged?: (angle: number) => void;
}

export class AnatomyScene {
  private container: HTMLDivElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private materials!: AnatomyMaterials;

  // Active scene nodes
  private currentRegion: AnatomicalRegion;
  private currentPathology: PathologyCondition;
  private activeModelGroup: THREE.Group | null = null;
  private kneeNodes: KneeNodes | null = null;
  private contactShadow: THREE.Mesh | null = null;
  private anatomicalPlanes: THREE.Group | null = null;

  // Kinematic parameters
  private currentJointAngle = 0; // 0 to 140 degrees
  private targetJointAngle = 0;
  private currentMovementType: MovementType = 'static';
  private movementSpeed = 1.0;
  private movementTime = 0;
  private varusValgusStress = 0; // -1 (varus) to +1 (valgus)
  private anteriorDrawerShift = 0; // 0 to 1

  // View state
  private viewMode: ViewMode = 'standard';
  private explodedFactor = 0; // 0 to 1
  private targetExplodedFactor = 0;
  private showPlanes = true;
  private showGoniometer = true;
  private isAutoRotating = false;

  // Structure visibility map
  private structureVisibility: Record<string, boolean> = {};
  private selectedStructureId: string | null = null;

  // Camera damping state
  private camDistance = 4.8;
  private camAzimuth = 0; // horizontal angle
  private camPolar = Math.PI / 2; // vertical angle
  private camLookAt = new THREE.Vector3(0, 0.2, 0);

  // Mouse interaction
  private isDragging = false;
  private prevMouseX = 0;
  private prevMouseY = 0;
  private raycaster = new THREE.Raycaster();
  private mouseCoords = new THREE.Vector2();

  // Animation loop & WebGL safety
  private frameId = 0;
  private isDisposed = false;
  private isSoftwareGl = false;
  private onStructureSelected?: (structureId: string | null) => void;
  private onAngleChanged?: (angle: number) => void;

  constructor(config: AnatomySceneConfig) {
    this.container = config.container;
    this.currentRegion = config.region;
    this.currentPathology = config.pathology;
    this.onStructureSelected = config.onStructureSelected;
    this.onAngleChanged = config.onAngleChanged;

    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initLighting();
    this.loadAnatomy(this.currentRegion, this.currentPathology);
    this.initEventListeners();
    this.startRenderLoop();
  }

  // 1. WebGL Renderer with Software-GL safety check
  private initRenderer() {
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true,
      preserveDrawingBuffer: true, // Crucial for video export recording!
    });

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);

    this.container.appendChild(this.renderer.domElement);
  }

  // 2. Scene and Procedural Studio Environment
  private initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a101d); // Deep clinical slate/navy
    this.scene.fog = new THREE.FogExp2(0x0a101d, 0.05);

    // Procedural Studio Environment via PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Contact shadow floor plane
    this.contactShadow = createContactShadowPlane();
    this.scene.add(this.contactShadow);

    // Movement Planes (Sagittal, Coronal, Transverse, Instantaneous Center of Rotation)
    this.anatomicalPlanes = createAnatomicalPlanes();
    this.anatomicalPlanes.visible = this.showPlanes;
    this.scene.add(this.anatomicalPlanes);

    this.materials = createAnatomyMaterials();
  }

  // 3. Perspective Camera
  private initCamera() {
    const aspect = this.container.clientWidth / (this.container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
    this.setCameraPreset('anterior', false);
  }

  // 4. Balanced 3-Point Studio Lighting
  private initLighting() {
    // Warm directional key light
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 2.2);
    keyLight.position.set(4, 5, 4);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 15;
    keyLight.shadow.camera.left = -3;
    keyLight.shadow.camera.right = 3;
    keyLight.shadow.camera.top = 3;
    keyLight.shadow.camera.bottom = -3;
    this.scene.add(keyLight);

    // Cool hemisphere fill light (sky/ground contrast)
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 1.4);
    hemiLight.position.set(0, 6, 0);
    this.scene.add(hemiLight);

    // Rim light from behind/lateral
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.6);
    rimLight.position.set(-4, 3, -4);
    this.scene.add(rimLight);
  }

  // 5. Load Anatomy & Region switching
  public loadAnatomy(region: AnatomicalRegion, pathology: PathologyCondition) {
    this.currentRegion = region;
    this.currentPathology = pathology;

    if (this.activeModelGroup) {
      this.scene.remove(this.activeModelGroup);
    }

    if (region === 'knee') {
      const { group, nodes } = buildKneeAnatomy(this.materials, pathology);
      this.activeModelGroup = group;
      this.kneeNodes = nodes;
      this.scene.add(group);
    } else if (region === 'spine') {
      const { group } = buildSpineAnatomy(this.materials, pathology);
      this.activeModelGroup = group;
      this.kneeNodes = null;
      this.scene.add(group);
    } else if (region === 'shoulder') {
      const { group } = buildShoulderAnatomy(this.materials, pathology);
      this.activeModelGroup = group;
      this.kneeNodes = null;
      this.scene.add(group);
    }

    this.applyViewMode(this.viewMode);
    this.applyKinematics(this.currentJointAngle);
  }

  // 6. Camera Presets
  public setCameraPreset(preset: CameraPreset, smooth = true) {
    let targetDist = 4.8;
    let targetAzimuth = 0;
    let targetPolar = Math.PI / 2;

    switch (preset) {
      case 'anterior':
        targetAzimuth = 0;
        targetPolar = Math.PI / 2.05;
        targetDist = 4.8;
        this.isAutoRotating = false;
        break;
      case 'lateral':
        targetAzimuth = Math.PI / 2;
        targetPolar = Math.PI / 2.05;
        targetDist = 4.5;
        this.isAutoRotating = false;
        break;
      case 'medial':
        targetAzimuth = -Math.PI / 2;
        targetPolar = Math.PI / 2.05;
        targetDist = 4.5;
        this.isAutoRotating = false;
        break;
      case 'posterior':
        targetAzimuth = Math.PI;
        targetPolar = Math.PI / 2.05;
        targetDist = 4.8;
        this.isAutoRotating = false;
        break;
      case 'superior':
        targetAzimuth = 0;
        targetPolar = 0.25;
        targetDist = 5.2;
        this.isAutoRotating = false;
        break;
      case 'isometric':
        targetAzimuth = Math.PI / 4;
        targetPolar = Math.PI / 3;
        targetDist = 4.8;
        this.isAutoRotating = false;
        break;
      case 'dynamic-orbit':
        this.isAutoRotating = true;
        break;
    }

    if (!smooth) {
      this.camAzimuth = targetAzimuth;
      this.camPolar = targetPolar;
      this.camDistance = targetDist;
      this.updateCameraPosition();
    } else {
      this.camAzimuth = targetAzimuth;
      this.camPolar = targetPolar;
      this.camDistance = targetDist;
    }
  }

  // 7. Controlled Biomechanics Kinematic Rig
  public setJointAngle(degrees: number) {
    this.targetJointAngle = Math.max(0, Math.min(140, degrees));
    this.currentJointAngle = this.targetJointAngle;
    this.applyKinematics(this.currentJointAngle);
    if (this.onAngleChanged) {
      this.onAngleChanged(this.currentJointAngle);
    }
  }

  public setMovement(type: MovementType, speed = 1.0) {
    this.currentMovementType = type;
    this.movementSpeed = speed;
    this.movementTime = 0;
  }

  public setViewMode(mode: ViewMode) {
    this.viewMode = mode;
    this.targetExplodedFactor = mode === 'exploded' ? 1.0 : 0.0;
    this.applyViewMode(mode);
  }

  public setExplodedFactor(factor: number) {
    this.targetExplodedFactor = Math.max(0, Math.min(1, factor));
    this.explodedFactor = this.targetExplodedFactor;
    this.updateExplodedTransforms();
  }

  public setPlanesVisible(visible: boolean) {
    this.showPlanes = visible;
    if (this.anatomicalPlanes) {
      this.anatomicalPlanes.visible = visible;
    }
  }

  public setStructureVisibility(structureId: string, visible: boolean) {
    this.structureVisibility[structureId] = visible;
    if (this.activeModelGroup) {
      this.activeModelGroup.traverse((obj) => {
        if (obj.name && obj.name.toLowerCase().includes(structureId.toLowerCase())) {
          obj.visible = visible;
        }
      });
    }
  }

  public highlightStructure(structureId: string | null) {
    this.selectedStructureId = structureId;
    if (this.onStructureSelected) {
      this.onStructureSelected(structureId);
    }

    if (!this.activeModelGroup) return;

    this.activeModelGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.origMaterial) {
        if (structureId && obj.name && obj.name.toLowerCase().includes(structureId.toLowerCase())) {
          obj.material = this.materials.highlight;
        } else {
          obj.material = obj.userData.origMaterial;
        }
      }
    });
  }

  // 8. Kinematics calculation: Flexion, Rollback, Patella, Menisci, Ligaments
  private applyKinematics(angleDeg: number) {
    if (!this.kneeNodes) return;

    const rad = THREE.MathUtils.degToRad(angleDeg);
    const {
      tibiaGroup,
      femurGroup,
      patellaGroup,
      medialMeniscusMesh,
      lateralMeniscusMesh,
      aclMesh,
      pclMesh,
    } = this.kneeNodes;

    // A. Tibial Flexion & Femoral Rollback
    // In biological knees, the tibia flexes backwards and the femur rolls/glides posteriorly
    const rollbackZ = -0.32 * Math.sin(rad);
    const rollbackY = -0.08 * (1 - Math.cos(rad));

    // Screw-Home Mechanism: External tibial rotation during terminal 0°-20° extension
    let screwHomeRot = 0;
    if (angleDeg < 20) {
      screwHomeRot = THREE.MathUtils.degToRad((20 - angleDeg) * 0.25);
    }

    // Tibia flexion orientation
    tibiaGroup.rotation.x = -rad;
    tibiaGroup.rotation.y = screwHomeRot;
    tibiaGroup.position.set(0, rollbackY - 0.05, rollbackZ);

    // B. Anterior Drawer / Lachman translation (if active)
    if (this.currentMovementType === 'anterior-drawer' || this.anteriorDrawerShift > 0) {
      const shift = (this.anteriorDrawerShift || 0.6) * (this.currentPathology === 'acl-tear' ? 0.35 : 0.12);
      tibiaGroup.position.z += shift;
    }

    // C. Varus / Valgus stress angulation
    if (this.varusValgusStress !== 0) {
      tibiaGroup.rotation.z = this.varusValgusStress * 0.08;
    }

    // D. Patella Kinematics along Trochlear Groove
    // Patella glides inferiorly and posterior-curves along trochlea as flexion increases
    const patellaY = 0.85 - 0.75 * Math.sin(rad * 0.85);
    const patellaZ = 1.35 - 0.55 * (1 - Math.cos(rad * 0.85));
    const patellaTilt = -rad * 0.65;

    // Patellar tracking malalignment if patellofemoral pain
    const lateralShift = this.currentPathology === 'patellofemoral-pain' ? 0.18 : 0.0;
    patellaGroup.position.set(lateralShift, patellaY, patellaZ);
    patellaGroup.rotation.x = patellaTilt;

    // E. Meniscal Posterior Excursion
    // Menisci translate posteriorly during flexion (lateral moves more than medial)
    const medMenExcursion = -0.15 * Math.sin(rad);
    const latMenExcursion = -0.25 * Math.sin(rad);
    medialMeniscusMesh.position.z = medMenExcursion;
    lateralMeniscusMesh.position.z = latMenExcursion;

    // F. Cruciate Strain visualization
    // ACL lengthens in extension and deep flexion; PCL tightens in flexion
    if (aclMesh) {
      const aclScaleY = 1.0 + 0.12 * Math.sin(rad);
      aclMesh.scale.set(1.0, aclScaleY, 1.0);
    }
    if (pclMesh) {
      const pclScaleY = 1.0 + 0.2 * (rad / (Math.PI * 0.7));
      pclMesh.scale.set(1.0, pclScaleY, 1.0);
    }
  }

  // 9. Exploded View Smooth Transforms
  private updateExplodedTransforms() {
    if (!this.kneeNodes) return;
    const factor = this.explodedFactor;
    const { femurGroup, tibiaGroup, patellaGroup, mclMesh, lclMesh } = this.kneeNodes;

    femurGroup.position.y = factor * 1.5;
    tibiaGroup.position.y = -0.05 - factor * 1.6;
    patellaGroup.position.z = 1.35 + factor * 1.8;
    if (mclMesh) mclMesh.position.x = -factor * 0.8;
    if (lclMesh) lclMesh.position.x = factor * 0.8;
  }

  // 10. View Mode Material switches
  private applyViewMode(mode: ViewMode) {
    if (!this.activeModelGroup) return;

    this.activeModelGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (!obj.userData.origMaterial) {
          obj.userData.origMaterial = obj.material;
        }

        if (mode === 'transparent') {
          if (obj.name.includes('femur') || obj.name.includes('tibia') || obj.name.includes('patella') || obj.name.includes('fibula')) {
            obj.material = this.materials.boneTransparent;
          }
        } else if (mode === 'sectional') {
          // Sectional view: expose cartilage and internal structures
          if (obj.material && 'clippingPlanes' in obj.material) {
            // Can be configured with clipping planes
          }
        } else {
          // Standard / Exploded
          obj.material = obj.userData.origMaterial;
        }
      }
    });
  }

  // 11. Mouse & Touch Orbit Controls (Smooth exponential damping)
  private initEventListeners() {
    const el = this.renderer.domElement;

    el.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
      this.isAutoRotating = false;
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
    });

    el.addEventListener('pointermove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.prevMouseX;
        const deltaY = e.clientY - this.prevMouseY;
        this.prevMouseX = e.clientX;
        this.prevMouseY = e.clientY;

        this.camAzimuth -= deltaX * 0.008;
        this.camPolar = Math.max(0.1, Math.min(Math.PI - 0.1, this.camPolar - deltaY * 0.008));
      }

      // Raycasting for interactive structure inspection
      const rect = el.getBoundingClientRect();
      this.mouseCoords.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseCoords.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camDistance = Math.max(2.2, Math.min(9.5, this.camDistance + e.deltaY * 0.004));
    }, { passive: false });

    el.addEventListener('click', () => {
      this.checkRaycastSelection();
    });

    window.addEventListener('resize', this.handleResize);
  }

  private checkRaycastSelection() {
    if (!this.activeModelGroup) return;
    this.raycaster.setFromCamera(this.mouseCoords, this.camera);
    const intersects = this.raycaster.intersectObjects(this.activeModelGroup.children, true);

    if (intersects.length > 0) {
      let hitObj: THREE.Object3D | null = intersects[0].object;
      while (hitObj && !hitObj.name && hitObj.parent) {
        hitObj = hitObj.parent;
      }
      if (hitObj && hitObj.name) {
        this.highlightStructure(hitObj.name);
      }
    } else {
      this.highlightStructure(null);
    }
  }

  private handleResize = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight || 1;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private updateCameraPosition() {
    _targetCamPos.x = this.camLookAt.x + this.camDistance * Math.sin(this.camPolar) * Math.sin(this.camAzimuth);
    _targetCamPos.y = this.camLookAt.y + this.camDistance * Math.cos(this.camPolar);
    _targetCamPos.z = this.camLookAt.z + this.camDistance * Math.sin(this.camPolar) * Math.cos(this.camAzimuth);

    this.camera.position.lerp(_targetCamPos, 0.14);
    this.camera.lookAt(this.camLookAt);
  }

  // 12. Main Animation & Render Loop
  private startRenderLoop() {
    let lastTime = performance.now();

    const tick = () => {
      if (this.isDisposed) return;

      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Handle continuous kinematics
      if (this.currentMovementType !== 'static') {
        this.movementTime += delta * this.movementSpeed;

        if (this.currentMovementType === 'flexion-extension') {
          // Smooth sinusoidal flexion-extension cycle (0° to 110°)
          const cycle = (Math.sin(this.movementTime * 1.6) + 1) * 0.5;
          const angle = cycle * 115;
          this.setJointAngle(angle);
        } else if (this.currentMovementType === 'varus-valgus-stress') {
          this.varusValgusStress = Math.sin(this.movementTime * 2.2);
          this.applyKinematics(this.currentJointAngle);
        } else if (this.currentMovementType === 'anterior-drawer') {
          this.anteriorDrawerShift = (Math.sin(this.movementTime * 2.0) + 1) * 0.5;
          this.applyKinematics(this.currentJointAngle);
        }
      }

      // Smooth exploded factor transition
      if (Math.abs(this.explodedFactor - this.targetExplodedFactor) > 0.001) {
        this.explodedFactor = THREE.MathUtils.damp(this.explodedFactor, this.targetExplodedFactor, 6, delta);
        this.updateExplodedTransforms();
      }

      // Auto-rotation in dynamic orbit preset
      if (this.isAutoRotating) {
        this.camAzimuth += delta * 0.45;
      }

      // Update camera smooth movement
      this.updateCameraPosition();

      // Render frame
      this.renderer.render(this.scene, this.camera);

      // Schedule next frame according to Three.js skill guidelines
      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  // Software WebGL pacing guard
  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.isDisposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 60);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  // 13. Project 3D Landmark positions to 2D Screen Coordinates (for Callout pins & Goniometer)
  public getLandmarkScreenCoordinates(): { [id: string]: { x: number; y: number; visible: boolean } } {
    if (!this.container || !this.camera) return {};

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const results: { [id: string]: { x: number; y: number; visible: boolean } } = {};

    const landmarks: { [id: string]: THREE.Vector3 } = {
      femur: new THREE.Vector3(0, 2.2, 0),
      tibia: new THREE.Vector3(0, -1.8, 0),
      patella: new THREE.Vector3(0, 0.85, 1.4),
      jointCenter: new THREE.Vector3(0, 0.45, -0.15),
      acl: new THREE.Vector3(0.1, 0.45, -0.15),
      medialMeniscus: new THREE.Vector3(-0.95, 0.15, 0.1),
    };

    for (const [key, pos] of Object.entries(landmarks)) {
      _tempVec3.copy(pos);
      _tempVec3.project(this.camera);

      // Check if behind camera
      const isVisible = _tempVec3.z < 1.0;
      const x = ((_tempVec3.x + 1) * width) / 2;
      const y = ((-_tempVec3.y + 1) * height) / 2;

      results[key] = { x, y, visible: isVisible };
    }

    return results;
  }

  // 14. Current Goniometer State
  public getGoniometerState(): GoniometerMeasurement {
    return {
      angleDegrees: Math.round(this.currentJointAngle),
      normalMin: 0,
      normalMax: 135,
      plane: 'Sagittal',
      label: 'Knee Flexion Angle',
      status:
        this.currentJointAngle > 135
          ? 'Normal'
          : this.currentJointAngle < 0
          ? 'Hyper-extended'
          : 'Normal',
    };
  }

  // 15. Canvas element access for direct MediaRecorder video rendering
  public getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  // 16. Resource Cleanup
  public dispose() {
    this.isDisposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
    }
  }
}
