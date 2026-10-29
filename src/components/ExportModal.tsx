import React, { useState } from 'react';
import { StoryboardProject, VideoExportOptions } from '../types/medical';
import { AnatomyScene } from '../engine/AnatomyScene';
import {
  Download,
  Film,
  FileCode,
  CheckCircle,
  RefreshCw,
  Video,
  Monitor,
  Smartphone,
  Square,
  AlertCircle,
} from 'lucide-react';

interface ExportModalProps {
  project: StoryboardProject;
  sceneEngine: AnatomyScene | null;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  project,
  sceneEngine,
  onClose,
}) => {
  const [options, setOptions] = useState<VideoExportOptions>({
    aspectRatio: '16:9',
    resolution: '1080p',
    fps: 30,
    includeNarration: true,
    includeSubtitles: true,
    includeGoniometer: true,
    includeAnatomicalLabels: true,
    includeWatermark: true,
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // 1. Export Complete Studio Project JSON
  const handleExportProjectJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${project.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_project.biomotion.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // 2. Browser MediaRecorder Canvas Capture Pipeline
  const handleStartVideoRender = async () => {
    if (!sceneEngine) {
      setStatusMessage('3D Scene Engine is initializing, please wait...');
      return;
    }

    const canvas = sceneEngine.getCanvas();
    if (!canvas) {
      setStatusMessage('Canvas element not available');
      return;
    }

    setIsRecording(true);
    setRecordingProgress(5);
    setStatusMessage('Initiating high-frame-rate WebGL stream capture...');

    try {
      const stream = canvas.captureStream(options.fps);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: options.resolution === '1080p' ? 8000000 : 4000000,
      });

      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(videoBlob);
        setDownloadUrl(url);
        setIsRecording(false);
        setRecordingProgress(100);
        setStatusMessage('Video render completed successfully! Ready to download.');
      };

      recorder.start();

      // Progressive progress counter simulating sequence timeline
      const totalDuration = Math.min(12, project.totalDuration || 15);
      const startTime = performance.now();

      const progressInterval = setInterval(() => {
        const elapsed = (performance.now() - startTime) / 1000;
        const pct = Math.min(95, Math.floor((elapsed / totalDuration) * 100));
        setRecordingProgress(pct);
        setStatusMessage(`Rendering 3D kinematic keyframes & HUD overlays (${pct}%)...`);

        if (elapsed >= totalDuration) {
          clearInterval(progressInterval);
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }
      }, 300);
    } catch (err: any) {
      console.error('Video capture error:', err);
      setIsRecording(false);
      setStatusMessage(`Render failed: ${err.message || 'Stream capture issue'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Film className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">
              Export Educational Animation & Project
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Aspect Ratio Options */}
          <div>
            <label className="text-xs font-bold text-white uppercase tracking-wider block mb-2">
              Video Aspect Ratio
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setOptions({ ...options, aspectRatio: '16:9' })}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-colors ${
                  options.aspectRatio === '16:9'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-5 h-5 text-cyan-400" />
                <span className="text-xs">16:9 Widescreen</span>
                <span className="text-[10px] text-slate-400">Lectures & YouTube</span>
              </button>

              <button
                onClick={() => setOptions({ ...options, aspectRatio: '9:16' })}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-colors ${
                  options.aspectRatio === '9:16'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-5 h-5 text-cyan-400" />
                <span className="text-xs">9:16 Vertical</span>
                <span className="text-[10px] text-slate-400">Mobile & Shorts</span>
              </button>

              <button
                onClick={() => setOptions({ ...options, aspectRatio: '1:1' })}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-colors ${
                  options.aspectRatio === '1:1'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Square className="w-5 h-5 text-cyan-400" />
                <span className="text-xs">1:1 Square</span>
                <span className="text-[10px] text-slate-400">Clinical Posts</span>
              </button>
            </div>
          </div>

          {/* Render Overlays Config */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Overlay Elements to Burn-In
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={options.includeGoniometer}
                  onChange={(e) => setOptions({ ...options, includeGoniometer: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-cyan-400 focus:ring-0"
                />
                <span>Real-time Goniometer Arc</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={options.includeAnatomicalLabels}
                  onChange={(e) => setOptions({ ...options, includeAnatomicalLabels: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-cyan-400 focus:ring-0"
                />
                <span>3D Anatomical Callout Pins</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={options.includeSubtitles}
                  onChange={(e) => setOptions({ ...options, includeSubtitles: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-cyan-400 focus:ring-0"
                />
                <span>Closed Caption Subtitles</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={options.includeWatermark}
                  onChange={(e) => setOptions({ ...options, includeWatermark: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-cyan-400 focus:ring-0"
                />
                <span>Medical QA Certification Badge</span>
              </label>
            </div>
          </div>

          {/* Render Progress or Download Button */}
          {isRecording ? (
            <div className="space-y-2 bg-slate-900 p-4 rounded-xl border border-cyan-800/80">
              <div className="flex justify-between text-xs text-cyan-300">
                <span>{statusMessage}</span>
                <span className="font-mono font-bold">{recordingProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${recordingProgress}%` }}
                />
              </div>
            </div>
          ) : downloadUrl ? (
            <div className="bg-emerald-950/40 border border-emerald-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Animation video assembled successfully!</span>
              </div>
              <a
                href={downloadUrl}
                download={`${project.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_animation.webm`}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs shadow-lg transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Video File (.webm / MP4)</span>
              </a>
            </div>
          ) : null}

          {/* Project File Export */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Studio Project Source Archive</span>
              <span className="text-[11px] text-slate-400">
                Preserve scene keyframes, clinical citations, and camera parameters.
              </span>
            </div>
            <button
              onClick={handleExportProjectJSON}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Export .biomotion.json</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center">
          <span className="text-[11px] text-slate-400">
            Powered by Three.js WebGL & MediaStream API
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStartVideoRender}
              disabled={isRecording}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
            >
              {isRecording ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording Canvas...</span>
                </>
              ) : (
                <>
                  <Video className="w-3.5 h-3.5" />
                  <span>Render Educational Video</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
