import React, { useState, useRef } from 'react';
import {
  AnatomicalRegion,
  CameraPreset,
  MovementType,
  PathologyCondition,
  StoryboardProject,
  StoryboardScene,
  ViewMode,
} from './types/medical';
import { CURATED_PROJECTS } from './data/anatomyData';
import { Viewport3D } from './components/Viewport3D';
import { StoryboardStudio } from './components/StoryboardStudio';
import { TimelinePlayer } from './components/TimelinePlayer';
import { MedicalQAPanel } from './components/MedicalQAPanel';
import { AIVideoAdapterModal } from './components/AIVideoAdapterModal';
import { ExportModal } from './components/ExportModal';
import { AnatomyScene } from './engine/AnatomyScene';
import {
  Film,
  Box,
  ShieldCheck,
  Download,
  Sparkles,
  Settings,
  HelpCircle,
  FileText,
  Activity,
  Layers,
} from 'lucide-react';

export default function App() {
  // Main Studio State
  const [currentProject, setCurrentProject] = useState<StoryboardProject>(CURATED_PROJECTS[0]);
  const [activeTab, setActiveTab] = useState<'viewport' | 'storyboard' | 'medical-qa'>('viewport');
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);

  // 3D Viewport State
  const [currentAngle, setCurrentAngle] = useState(0);
  const [movementType, setMovementType] = useState<MovementType>('static');
  const [movementSpeed, setMovementSpeed] = useState(1.0);
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('anterior');
  const [pathology, setPathology] = useState<PathologyCondition>(currentProject.condition);

  // Modal states
  const [showVideoAdapterModal, setShowVideoAdapterModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Reference to 3D scene engine for video frame capture
  const sceneEngineRef = useRef<AnatomyScene | null>(null);

  const activeScene = currentProject.scenes[activeSceneIndex] || currentProject.scenes[0];

  // Handler when scene changes in timeline or storyboard
  const handleSceneTransition = (scene: StoryboardScene, index: number) => {
    setActiveSceneIndex(index);
    setCurrentAngle(scene.jointAngleDegrees);
    setMovementType(scene.movementType);
    setMovementSpeed(scene.movementSpeed || 1.0);
    setViewMode(scene.viewMode);
    setCameraPreset(scene.cameraAngle);
    if (scene.pathologyActive) {
      setPathology(currentProject.condition);
    } else {
      setPathology('normal');
    }
  };

  // Region switcher
  const handleRegionChange = (newRegion: AnatomicalRegion) => {
    const matchingProject = CURATED_PROJECTS.find((p) => p.region === newRegion) || {
      ...currentProject,
      region: newRegion,
      condition: newRegion === 'knee' ? 'knee-osteoarthritis' : (newRegion === 'spine' ? 'disc-herniation' : 'shoulder-impingement'),
    };
    setCurrentProject(matchingProject);
    setPathology(matchingProject.condition);
    setActiveSceneIndex(0);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#070d19] text-slate-100 font-sans">
      {/* 1. Primary Studio Header */}
      <header className="h-14 bg-[#0a101f] border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-30 shadow-md">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="w-5 h-5 text-slate-950 font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-white">
                BioMotion<span className="text-cyan-400">3D</span>
              </span>
              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.2 rounded">
                STUDIO v2.4
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Medical & Physiotherapy Animation Engine
            </p>
          </div>
        </div>

        {/* Anatomical Region Selector Pills */}
        <div className="hidden lg:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => handleRegionChange('knee')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              currentProject.region === 'knee'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Knee Complex
          </button>
          <button
            onClick={() => handleRegionChange('spine')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              currentProject.region === 'spine'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Spine (L4-L5)
          </button>
          <button
            onClick={() => handleRegionChange('shoulder')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              currentProject.region === 'shoulder'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Shoulder
          </button>
        </div>

        {/* Studio View Navigation Tabs */}
        <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveTab('viewport')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'viewport'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3D Viewport</span>
          </button>

          <button
            onClick={() => setActiveTab('storyboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'storyboard'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Storyboard Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('medical-qa')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'medical-qa'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Medical QA</span>
          </button>
        </div>

        {/* Global Actions (AI Video Adapter & Video Export) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVideoAdapterModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-800/80 text-xs font-semibold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI B-Roll</span>
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Video</span>
          </button>
        </div>
      </header>

      {/* 2. Workspace Body */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {activeTab === 'viewport' && (
          <div className="relative flex-1 w-full h-full flex flex-col">
            {/* Main Unobstructed 3D Scene Viewport */}
            <div className="flex-1 relative">
              <Viewport3D
                region={currentProject.region}
                pathology={pathology}
                currentAngle={currentAngle}
                movementType={movementType}
                movementSpeed={movementSpeed}
                viewMode={viewMode}
                cameraPreset={cameraPreset}
                activeSceneTitle={activeScene?.title}
                onAngleChange={(deg) => setCurrentAngle(deg)}
                onMovementChange={(m) => setMovementType(m)}
                onViewModeChange={(v) => setViewMode(v)}
                onCameraPresetChange={(c) => setCameraPreset(c)}
                onPathologyToggle={(p) => setPathology(p)}
                onSceneEngineReady={(engine) => {
                  sceneEngineRef.current = engine;
                }}
              />
            </div>

            {/* Bottom Multi-Track Timeline Sequencer Bar */}
            <div className="shrink-0 z-20">
              <TimelinePlayer
                project={currentProject}
                activeSceneIndex={activeSceneIndex}
                onSceneTransition={handleSceneTransition}
              />
            </div>
          </div>
        )}

        {activeTab === 'storyboard' && (
          <StoryboardStudio
            currentProject={currentProject}
            activeSceneIndex={activeSceneIndex}
            onSelectScene={(idx) => {
              setActiveSceneIndex(idx);
              const target = currentProject.scenes[idx];
              if (target) handleSceneTransition(target, idx);
            }}
            onUpdateProject={(p) => setCurrentProject(p)}
            onPreviewSceneIn3D={(scene) => {
              handleSceneTransition(scene, currentProject.scenes.findIndex((s) => s.sceneId === scene.sceneId));
              setActiveTab('viewport');
            }}
          />
        )}

        {activeTab === 'medical-qa' && (
          <MedicalQAPanel
            project={currentProject}
            onUpdateProject={(p) => setCurrentProject(p)}
          />
        )}
      </main>

      {/* 3. Global Modals */}
      {showVideoAdapterModal && (
        <AIVideoAdapterModal
          project={currentProject}
          activeScene={activeScene}
          onClose={() => setShowVideoAdapterModal(false)}
        />
      )}

      {showExportModal && (
        <ExportModal
          project={currentProject}
          sceneEngine={sceneEngineRef.current}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
