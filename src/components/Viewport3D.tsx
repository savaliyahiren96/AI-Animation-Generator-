import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  AnatomicalRegion,
  CameraPreset,
  GoniometerMeasurement,
  MovementType,
  PathologyCondition,
  ViewMode,
} from '../types/medical';
import { AnatomyScene } from '../engine/AnatomyScene';
import { KNEE_STRUCTURES, SPINE_STRUCTURES, SHOULDER_STRUCTURES } from '../data/anatomyData';
import {
  Maximize2,
  Minimize2,
  RotateCw,
  Compass,
  Layers,
  Activity,
  Sliders,
  Eye,
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface Viewport3DProps {
  region: AnatomicalRegion;
  pathology: PathologyCondition;
  currentAngle: number;
  movementType: MovementType;
  movementSpeed: number;
  viewMode: ViewMode;
  cameraPreset: CameraPreset;
  activeSceneTitle?: string;
  onAngleChange: (angle: number) => void;
  onMovementChange: (type: MovementType) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onCameraPresetChange: (preset: CameraPreset) => void;
  onPathologyToggle: (condition: PathologyCondition) => void;
  onSceneEngineReady?: (scene: AnatomyScene) => void;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  region,
  pathology,
  currentAngle,
  movementType,
  movementSpeed,
  viewMode,
  cameraPreset,
  activeSceneTitle,
  onAngleChange,
  onMovementChange,
  onViewModeChange,
  onCameraPresetChange,
  onPathologyToggle,
  onSceneEngineReady,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AnatomyScene | null>(null);

  // HUD & UI States
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [activeDockTab, setActiveDockTab] = useState<'kinematics' | 'views' | 'camera' | 'structures' | 'pathology'>('kinematics');
  const [explodedPercent, setExplodedPercent] = useState(0);
  const [showPlanes, setShowPlanes] = useState(true);
  const [showGoniometer, setShowGoniometer] = useState(true);
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
  const [landmarkCoords, setLandmarkCoords] = useState<{ [id: string]: { x: number; y: number; visible: boolean } }>({});
  const [goniometerState, setGoniometerState] = useState<GoniometerMeasurement>({
    angleDegrees: currentAngle,
    normalMin: 0,
    normalMax: 135,
    plane: 'Sagittal',
    label: 'Knee Flexion Angle',
    status: 'Normal',
  });

  // Active structure catalog based on selected anatomical region
  const structures =
    region === 'knee'
      ? KNEE_STRUCTURES
      : region === 'spine'
      ? SPINE_STRUCTURES
      : SHOULDER_STRUCTURES;

  const selectedMeta = structures.find(
    (s) => selectedStructureId && s.id.toLowerCase().includes(selectedStructureId.toLowerCase())
  );

  // Initialize Three.js scene engine once
  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new AnatomyScene({
      container: mountRef.current,
      region,
      pathology,
      onStructureSelected: (id) => setSelectedStructureId(id),
      onAngleChanged: (deg) => {
        onAngleChange(deg);
        setGoniometerState((prev) => ({
          ...prev,
          angleDegrees: Math.round(deg),
        }));
      },
    });

    sceneRef.current = scene;
    if (onSceneEngineReady) {
      onSceneEngineReady(scene);
    }

    // Interval to sync 2D landmark screen coordinates for HTML HUD
    const interval = setInterval(() => {
      if (sceneRef.current) {
        setLandmarkCoords(sceneRef.current.getLandmarkScreenCoordinates());
      }
    }, 45);

    return () => {
      clearInterval(interval);
      scene.dispose();
      sceneRef.current = null;
    };
  }, [region]);

  // Sync props to Three.js engine when parent changes
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.loadAnatomy(region, pathology);
  }, [region, pathology]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.setJointAngle(currentAngle);
  }, [currentAngle]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.setMovement(movementType, movementSpeed);
  }, [movementType, movementSpeed]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.setViewMode(viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.setCameraPreset(cameraPreset);
  }, [cameraPreset]);

  // Exploded slider handler
  const handleExplodedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setExplodedPercent(val);
    if (sceneRef.current) {
      sceneRef.current.setExplodedFactor(val / 100);
      if (val > 0 && viewMode !== 'exploded') {
        onViewModeChange('exploded');
      } else if (val === 0 && viewMode === 'exploded') {
        onViewModeChange('standard');
      }
    }
  };

  const togglePlanes = () => {
    const next = !showPlanes;
    setShowPlanes(next);
    if (sceneRef.current) {
      sceneRef.current.setPlanesVisible(next);
    }
  };

  return (
    <div className="relative w-full h-full bg-[#0a101d] overflow-hidden select-none">
      {/* 1. Isolated WebGL Canvas Mount Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 2. Top Minimal Title & Spec Badge (Unobtrusive) */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 pointer-events-none">
        <div className="bg-[#0f172a]/90 border border-slate-700/80 rounded-xl px-4 py-2.5 shadow-xl pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
              {region.toUpperCase()} BIOMECHANICS 3D ENGINE
            </h2>
            <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-mono">
              r160 PBR
            </span>
          </div>
          {activeSceneTitle && (
            <p className="text-xs text-slate-400 mt-1 max-w-sm truncate">
              Scene: <span className="text-slate-200">{activeSceneTitle}</span>
            </p>
          )}
        </div>

        {/* Pathology indicator badge */}
        <div className="bg-[#0f172a]/90 border border-slate-700/80 rounded-xl px-3 py-2 flex items-center gap-2 shadow-xl pointer-events-auto">
          {pathology === 'normal' ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Normal Anatomy</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="capitalize">{pathology.replace('-', ' ')}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Real-time Goniometer HUD Arc (Top Right) */}
      {showGoniometer && (
        <div className="absolute top-4 right-4 z-10 pointer-events-auto">
          <div className="bg-[#0f172a]/95 border border-slate-700/90 rounded-2xl p-4 shadow-2xl w-60">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Goniometer (ROM)
                </span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800">
                Sagittal
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-2">
              <span className="text-3xl font-bold font-mono text-white tracking-tight">
                {Math.round(currentAngle)}°
              </span>
              <span className="text-xs font-medium text-slate-400">
                Normal: 0° - 135°
              </span>
            </div>

            {/* Visual Angle Arc / Progress Bar */}
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-100 ${
                  currentAngle > 135
                    ? 'bg-amber-400'
                    : currentAngle < 5
                    ? 'bg-cyan-400'
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, (currentAngle / 140) * 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>0° Ext</span>
              <span>45°</span>
              <span>90°</span>
              <span>140° Flex</span>
            </div>

            {/* Quick Angle Presets */}
            <div className="grid grid-cols-4 gap-1.5 mt-3 pt-2 border-t border-slate-800">
              {[0, 30, 60, 90].map((deg) => (
                <button
                  key={deg}
                  onClick={() => onAngleChange(deg)}
                  className={`text-[11px] py-1 rounded border font-mono transition-colors ${
                    Math.round(currentAngle) === deg
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-semibold'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Interactive 3D Landmark Screen Pins & Callout Lines */}
      {region === 'knee' && landmarkCoords.patella && landmarkCoords.patella.visible && (
        <div
          className="absolute z-10 pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-opacity duration-200"
          style={{
            left: `${landmarkCoords.patella.x}px`,
            top: `${landmarkCoords.patella.y}px`,
          }}
          onClick={() => setSelectedStructureId('patella')}
        >
          <div className="group relative flex items-center">
            <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-white shadow-lg shadow-cyan-500/50 block" />
            <div className="ml-2 hidden group-hover:block bg-slate-900/95 border border-cyan-500/80 px-2 py-1 rounded text-xs text-cyan-200 whitespace-nowrap shadow-xl">
              Patella (Sesamoid)
            </div>
          </div>
        </div>
      )}

      {region === 'knee' && landmarkCoords.acl && landmarkCoords.acl.visible && (
        <div
          className="absolute z-10 pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
          style={{
            left: `${landmarkCoords.acl.x}px`,
            top: `${landmarkCoords.acl.y}px`,
          }}
          onClick={() => setSelectedStructureId('acl')}
        >
          <div className="group relative flex items-center">
            <span className="w-3.5 h-3.5 rounded-full bg-sky-400 border-2 border-white shadow-lg shadow-sky-500/50 block" />
            <div className="ml-2 hidden group-hover:block bg-slate-900/95 border border-sky-500/80 px-2 py-1 rounded text-xs text-sky-200 whitespace-nowrap shadow-xl">
              Anterior Cruciate (ACL)
            </div>
          </div>
        </div>
      )}

      {region === 'knee' && landmarkCoords.medialMeniscus && landmarkCoords.medialMeniscus.visible && (
        <div
          className="absolute z-10 pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
          style={{
            left: `${landmarkCoords.medialMeniscus.x}px`,
            top: `${landmarkCoords.medialMeniscus.y}px`,
          }}
          onClick={() => setSelectedStructureId('medial-meniscus')}
        >
          <div className="group relative flex items-center">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white shadow-lg shadow-emerald-500/50 block" />
            <div className="ml-2 hidden group-hover:block bg-slate-900/95 border border-emerald-500/80 px-2 py-1 rounded text-xs text-emerald-200 whitespace-nowrap shadow-xl">
              Medial Meniscus (C-Ring)
            </div>
          </div>
        </div>
      )}

      {/* 5. Selected Structure Anatomical Inspector Modal / Drawer */}
      {selectedMeta && (
        <div className="absolute top-20 left-4 z-20 w-80 bg-[#0f172a]/95 border border-cyan-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-none text-slate-200">
          <div className="flex items-start justify-between border-b border-slate-800 pb-2.5 mb-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                {selectedMeta.category}
              </span>
              <h3 className="text-sm font-bold text-white mt-1">
                {selectedMeta.name}
              </h3>
              <p className="text-[11px] italic text-slate-400">
                {selectedMeta.latinName}
              </p>
            </div>
            <button
              onClick={() => setSelectedStructureId(null)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            {selectedMeta.description}
          </p>

          <div className="space-y-2 text-xs">
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <span className="font-semibold text-cyan-300 block mb-0.5">Biomechanical Role:</span>
              <span className="text-slate-300">{selectedMeta.biomechanicalRole}</span>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <span className="font-semibold text-amber-300 block mb-0.5">Clinical Significance:</span>
              <span className="text-slate-300">{selectedMeta.clinicalSignificance}</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. Ergonomic Unified Collapsible Bottom Dock (Skill compliant: max-width min(940px, 94vw), pinned bottom-center) */}
      <div
        className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 transition-all duration-300 ease-out`}
        style={{
          width: 'min(940px, 94vw)',
          transform: isDockCollapsed
            ? 'translate(-50%, calc(100% - 38px))'
            : 'translate(-50%, 0)',
        }}
      >
        {/* Collapse / Expand Toggle Tab */}
        <div className="flex justify-center mb-0">
          <button
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
            className="bg-[#0f172a] hover:bg-slate-800 border-t border-x border-slate-700 text-slate-300 hover:text-white px-4 py-1 rounded-t-xl text-xs font-medium flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
          >
            {isDockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>Show Controls (H)</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                <span>Hide Controls (Zen Mode)</span>
              </>
            )}
          </button>
        </div>

        {/* Dock Container */}
        <div className="bg-[#0f172a] border border-slate-700/90 rounded-2xl shadow-2xl p-3 text-slate-200">
          {/* Dock Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                onClick={() => setActiveDockTab('kinematics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeDockTab === 'kinematics'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Kinematics & Angle</span>
              </button>

              <button
                onClick={() => setActiveDockTab('views')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeDockTab === 'views'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>View Modes & Exploded</span>
              </button>

              <button
                onClick={() => setActiveDockTab('camera')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeDockTab === 'camera'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Camera Presets</span>
              </button>

              <button
                onClick={() => setActiveDockTab('structures')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeDockTab === 'structures'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Structures List</span>
              </button>

              <button
                onClick={() => setActiveDockTab('pathology')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeDockTab === 'pathology'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Pathology Comparison</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={togglePlanes}
                className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                  showPlanes
                    ? 'bg-slate-800 border-cyan-500/60 text-cyan-300'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                Planes
              </button>
              <button
                onClick={() => setShowGoniometer(!showGoniometer)}
                className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                  showGoniometer
                    ? 'bg-slate-800 border-cyan-500/60 text-cyan-300'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                Goniometer
              </button>
            </div>
          </div>

          {/* Tab 1: Kinematics & Joint Angle */}
          {activeDockTab === 'kinematics' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-7 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Flexion / Extension Angle:</span>
                  <span className="font-mono text-cyan-400 font-bold">{Math.round(currentAngle)}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="140"
                  step="1"
                  value={currentAngle}
                  onChange={(e) => onAngleChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0° (Full Extension)</span>
                  <span>45° (Mid-Flexion)</span>
                  <span>90° (Right Angle)</span>
                  <span>140° (Deep Squat)</span>
                </div>
              </div>

              <div className="md:col-span-5 flex items-center gap-1.5 justify-end">
                <span className="text-xs text-slate-400 mr-1">Movement Mode:</span>
                <button
                  onClick={() => onMovementChange('static')}
                  className={`px-2.5 py-1 rounded text-xs border ${
                    movementType === 'static'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Static
                </button>
                <button
                  onClick={() => onMovementChange('flexion-extension')}
                  className={`px-2.5 py-1 rounded text-xs border ${
                    movementType === 'flexion-extension'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Flex-Ext Cycle
                </button>
                {region === 'knee' && (
                  <button
                    onClick={() => onMovementChange('anterior-drawer')}
                    className={`px-2.5 py-1 rounded text-xs border ${
                      movementType === 'anterior-drawer'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Lachman Test
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: View Modes & Exploded */}
          {activeDockTab === 'views' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-6 flex items-center gap-2">
                <span className="text-xs text-slate-400">View Mode:</span>
                {(['standard', 'exploded', 'transparent', 'sectional'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onViewModeChange(mode)}
                    className={`px-3 py-1 rounded text-xs capitalize border ${
                      viewMode === mode
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-semibold'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode === 'transparent' ? 'X-Ray / Glass' : mode}
                  </button>
                ))}
              </div>

              <div className="md:col-span-6 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Exploded Separation:</span>
                  <span className="font-mono text-cyan-400">{Math.round(explodedPercent)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={explodedPercent}
                  onChange={handleExplodedChange}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>
          )}

          {/* Tab 3: Camera Presets */}
          {activeDockTab === 'camera' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 mr-2">Orthopaedic Angles:</span>
              {(['anterior', 'lateral', 'medial', 'posterior', 'superior', 'isometric', 'dynamic-orbit'] as CameraPreset[]).map(
                (preset) => (
                  <button
                    key={preset}
                    onClick={() => onCameraPresetChange(preset)}
                    className={`px-3 py-1.5 rounded-lg text-xs capitalize border transition-colors ${
                      cameraPreset === preset
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-semibold'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {preset === 'dynamic-orbit' ? '🔄 360° Orbit' : preset}
                  </button>
                )
              )}
            </div>
          )}

          {/* Tab 4: Structures Catalog */}
          {activeDockTab === 'structures' && (
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {structures.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStructureId(s.id)}
                  className={`px-2.5 py-1 rounded text-xs whitespace-nowrap border transition-colors ${
                    selectedStructureId === s.id
                      ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {s.name.split(' ')[0]}
                </button>
              ))}
            </div>
          )}

          {/* Tab 5: Pathology Comparison */}
          {activeDockTab === 'pathology' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 mr-2">Pathology State:</span>
              <button
                onClick={() => onPathologyToggle('normal')}
                className={`px-3 py-1.5 rounded-lg text-xs border ${
                  pathology === 'normal'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                Normal Healthy
              </button>
              {region === 'knee' && (
                <>
                  <button
                    onClick={() => onPathologyToggle('knee-osteoarthritis')}
                    className={`px-3 py-1.5 rounded-lg text-xs border ${
                      pathology === 'knee-osteoarthritis'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Knee Osteoarthritis
                  </button>
                  <button
                    onClick={() => onPathologyToggle('acl-tear')}
                    className={`px-3 py-1.5 rounded-lg text-xs border ${
                      pathology === 'acl-tear'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    ACL Rupture & Laxity
                  </button>
                  <button
                    onClick={() => onPathologyToggle('meniscal-tear')}
                    className={`px-3 py-1.5 rounded-lg text-xs border ${
                      pathology === 'meniscal-tear'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Meniscal Tear
                  </button>
                  <button
                    onClick={() => onPathologyToggle('patellofemoral-pain')}
                    className={`px-3 py-1.5 rounded-lg text-xs border ${
                      pathology === 'patellofemoral-pain'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Patellofemoral Maltracking
                  </button>
                </>
              )}
              {region === 'spine' && (
                <button
                  onClick={() => onPathologyToggle('disc-herniation')}
                  className={`px-3 py-1.5 rounded-lg text-xs border ${
                    pathology === 'disc-herniation'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  L4-L5 Disc Herniation
                </button>
              )}
              {region === 'shoulder' && (
                <button
                  onClick={() => onPathologyToggle('shoulder-impingement')}
                  className={`px-3 py-1.5 rounded-lg text-xs border ${
                    pathology === 'shoulder-impingement'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Subacromial Impingement
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
