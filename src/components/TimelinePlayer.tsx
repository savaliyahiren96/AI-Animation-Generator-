import React, { useState, useEffect, useRef } from 'react';
import {
  StoryboardProject,
  StoryboardScene,
} from '../types/medical';
import { speakTextWithBrowserTTS } from '../services/geminiService';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Gauge,
  Film,
  Layers,
  Camera,
  MessageSquare,
  Sparkles,
  Subtitles,
} from 'lucide-react';

interface TimelinePlayerProps {
  project: StoryboardProject;
  activeSceneIndex: number;
  onSceneTransition: (scene: StoryboardScene, index: number) => void;
  onTimelineTimeUpdate?: (currentTime: number) => void;
}

export const TimelinePlayer: React.FC<TimelinePlayerProps> = ({
  project,
  activeSceneIndex,
  onSceneTransition,
  onTimelineTimeUpdate,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);

  const totalDuration = project.totalDuration || 45;
  const currentScene = project.scenes[activeSceneIndex] || project.scenes[0];

  const speechControllerRef = useRef<{ stop: () => void } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  // Calculate cumulative scene time bounds
  const sceneTimeBounds = project.scenes.map((s, idx) => {
    let start = 0;
    for (let i = 0; i < idx; i++) {
      start += project.scenes[i].durationSeconds;
    }
    const end = start + s.durationSeconds;
    return { scene: s, index: idx, start, end };
  });

  // Determine current active scene based on currentTime
  const currentBound =
    sceneTimeBounds.find((b) => currentTime >= b.start && currentTime < b.end) ||
    sceneTimeBounds[sceneTimeBounds.length - 1];

  // Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      if (speechControllerRef.current) {
        speechControllerRef.current.stop();
        speechControllerRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      lastTimestampRef.current = null;
      return;
    }

    const tick = (timestamp: number) => {
      if (!lastTimestampRef.current) {
        lastTimestampRef.current = timestamp;
      }
      const delta = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      setCurrentTime((prev) => {
        const next = prev + delta * playbackSpeed;
        if (next >= totalDuration) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, totalDuration]);

  // Synchronize 3D viewport when active scene transitions along playhead
  useEffect(() => {
    if (currentBound && currentBound.index !== activeSceneIndex) {
      onSceneTransition(currentBound.scene, currentBound.index);

      // Play narration audio for the newly entered scene if not muted
      if (isPlaying && !isAudioMuted && currentBound.scene.narrationScript) {
        if (speechControllerRef.current) {
          speechControllerRef.current.stop();
        }
        speechControllerRef.current = speakTextWithBrowserTTS(currentBound.scene.narrationScript);
      }
    }
  }, [currentBound, activeSceneIndex, isPlaying, isAudioMuted]);

  // Handle Scrubbing
  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    const target = sceneTimeBounds.find((b) => time >= b.start && time <= b.end);
    if (target) {
      onSceneTransition(target.scene, target.index);
    }
  };

  const handleTogglePlay = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      if (!isAudioMuted && currentScene.narrationScript) {
        speechControllerRef.current = speakTextWithBrowserTTS(currentScene.narrationScript);
      }
    } else {
      setIsPlaying(false);
      if (speechControllerRef.current) {
        speechControllerRef.current.stop();
        speechControllerRef.current = null;
      }
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (speechControllerRef.current) {
      speechControllerRef.current.stop();
      speechControllerRef.current = null;
    }
    if (project.scenes.length > 0) {
      onSceneTransition(project.scenes[0], 0);
    }
  };

  // Format Time (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#0b1329] border-t border-slate-800 p-4 text-slate-200 select-none shadow-2xl">
      {/* 1. Closed Caption Subtitles Bar (Synced with narration) */}
      {showSubtitles && isPlaying && currentScene && (
        <div className="max-w-3xl mx-auto mb-3 text-center">
          <div className="inline-block bg-slate-950/90 border border-cyan-500/50 rounded-xl px-5 py-2 text-xs md:text-sm text-cyan-200 font-medium shadow-2xl">
            <span className="font-bold text-cyan-400 mr-2">CC:</span>
            {currentScene.narrationScript}
          </div>
        </div>
      )}

      {/* 2. Playback Control Deck */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-3">
        {/* Playhead Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePlay}
            className="w-10 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center justify-center shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          <button
            onClick={handleReset}
            title="Reset Playhead to Start"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="font-mono text-sm font-semibold text-cyan-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </div>
        </div>

        {/* Scene Info Indicator */}
        <div className="text-center">
          <span className="text-xs text-slate-400">Current Scene: </span>
          <span className="text-xs font-bold text-white">
            [{activeSceneIndex + 1}/{project.scenes.length}] {currentScene?.title}
          </span>
        </div>

        {/* Playback Settings (Speed & Mute) */}
        <div className="flex items-center gap-2">
          {/* Biomechanics Slow-Mo / Speed selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
            <span className="text-[10px] text-slate-400 px-1.5 flex items-center gap-1">
              <Gauge className="w-3 h-3 text-cyan-400" />
            </span>
            {[0.25, 0.5, 1.0, 2.0].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-1 rounded font-mono ${
                  playbackSpeed === spd
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            title={isAudioMuted ? 'Unmute Narration' : 'Mute Narration'}
            className={`p-2 rounded-lg border transition-colors ${
              isAudioMuted
                ? 'bg-rose-950 border-rose-800 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowSubtitles(!showSubtitles)}
            title={showSubtitles ? 'Hide Subtitles' : 'Show Subtitles'}
            className={`p-2 rounded-lg border transition-colors ${
              showSubtitles
                ? 'bg-cyan-950 border-cyan-800 text-cyan-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Subtitles className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Multi-Track Sequencer Timeline UI */}
      <div className="space-y-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-inner">
        {/* Playhead Scrubber */}
        <div className="relative mb-2">
          <input
            type="range"
            min="0"
            max={totalDuration}
            step="0.1"
            value={currentTime}
            onChange={handleScrub}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Track 1: 3D Kinematics & Joint Angles */}
        <div className="flex items-center gap-2">
          <div className="w-28 text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 shrink-0">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>3D Kinematics</span>
          </div>
          <div className="flex-1 flex gap-1 h-7">
            {sceneTimeBounds.map((b) => {
              const widthPct = (b.scene.durationSeconds / totalDuration) * 100;
              const isActive = activeSceneIndex === b.index;

              return (
                <div
                  key={b.scene.sceneId}
                  onClick={() => {
                    setCurrentTime(b.start);
                    onSceneTransition(b.scene, b.index);
                  }}
                  className={`h-full rounded-lg px-2 flex items-center justify-between text-[10px] font-mono border cursor-pointer transition-all ${
                    isActive
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold shadow-md'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:bg-slate-700'
                  }`}
                  style={{ width: `${widthPct}%` }}
                >
                  <span className="truncate">{b.scene.jointAngleDegrees}° {b.scene.movementType}</span>
                  <span className="text-[9px] opacity-75">{b.scene.durationSeconds}s</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Track 2: Camera Angles & Shots */}
        <div className="flex items-center gap-2">
          <div className="w-28 text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 shrink-0">
            <Camera className="w-3.5 h-3.5 text-sky-400" />
            <span>Camera View</span>
          </div>
          <div className="flex-1 flex gap-1 h-6">
            {sceneTimeBounds.map((b) => {
              const widthPct = (b.scene.durationSeconds / totalDuration) * 100;
              const isActive = activeSceneIndex === b.index;

              return (
                <div
                  key={b.scene.sceneId}
                  onClick={() => {
                    setCurrentTime(b.start);
                    onSceneTransition(b.scene, b.index);
                  }}
                  className={`h-full rounded-md px-2 flex items-center text-[10px] font-mono capitalize border cursor-pointer ${
                    isActive
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-semibold'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400'
                  }`}
                  style={{ width: `${widthPct}%` }}
                >
                  <span className="truncate">{b.scene.cameraAngle} shot</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Track 3: Voiceover & Audio Narration */}
        <div className="flex items-center gap-2">
          <div className="w-28 text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 shrink-0">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Voiceover</span>
          </div>
          <div className="flex-1 flex gap-1 h-6">
            {sceneTimeBounds.map((b) => {
              const widthPct = (b.scene.durationSeconds / totalDuration) * 100;
              const isActive = activeSceneIndex === b.index;

              return (
                <div
                  key={b.scene.sceneId}
                  className={`h-full rounded-md px-2 flex items-center text-[10px] border truncate ${
                    isActive
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400'
                  }`}
                  style={{ width: `${widthPct}%` }}
                >
                  <span className="truncate font-sans">{b.scene.narrationScript}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Track 4: AI Supporting Media / B-Roll */}
        <div className="flex items-center gap-2">
          <div className="w-28 text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI B-Roll</span>
          </div>
          <div className="flex-1 flex gap-1 h-6">
            {sceneTimeBounds.map((b) => {
              const widthPct = (b.scene.durationSeconds / totalDuration) * 100;
              const hasPrompt = !!b.scene.aiSupportingVideoPrompt;

              return (
                <div
                  key={b.scene.sceneId}
                  className={`h-full rounded-md px-2 flex items-center text-[10px] border truncate ${
                    hasPrompt
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                      : 'bg-slate-800/30 border-slate-700/30 text-slate-500'
                  }`}
                  style={{ width: `${widthPct}%` }}
                >
                  <span className="truncate">{b.scene.aiSupportingVideoPrompt || 'Standard 3D Scene'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
