import React, { useState, useEffect } from 'react';
import { StoryboardProject, StoryboardScene } from '../types/medical';
import { submitAIVideoJob, fetchAIVideoJobs } from '../services/geminiService';
import {
  Sparkles,
  Film,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Upload,
  Info,
  Layers,
} from 'lucide-react';

interface AIVideoAdapterModalProps {
  project: StoryboardProject;
  activeScene?: StoryboardScene;
  onClose: () => void;
  onAttachVideoToScene?: (sceneId: string, videoUrl: string) => void;
}

export const AIVideoAdapterModal: React.FC<AIVideoAdapterModalProps> = ({
  project,
  activeScene,
  onClose,
  onAttachVideoToScene,
}) => {
  const [prompt, setPrompt] = useState(
    activeScene?.aiSupportingVideoPrompt ||
      'Cellular microscopic visualization of chondrocyte extracellular matrix with proteoglycan degradation under cyclic mechanical load'
  );
  const [selectedSceneId, setSelectedSceneId] = useState(activeScene?.sceneId || project.scenes[0]?.sceneId || '');
  const [generationType, setGenerationType] = useState<'text-to-video' | 'image-to-video'>('text-to-video');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);

  // Fetch jobs on mount and poll periodically
  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadJobs = async () => {
    try {
      const data = await fetchAIVideoJobs();
      if (data && data.jobs) {
        setJobs(data.jobs);
      }
    } catch (e) {
      console.error('Failed to load video jobs', e);
    }
  };

  const handleCreateJob = async () => {
    if (!prompt.trim()) return;
    setIsSubmitting(true);
    try {
      await submitAIVideoJob(project.title, prompt, selectedSceneId);
      await loadJobs();
    } catch (err) {
      console.error('Job submission error', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">
              AI Video Provider Adapter (Supporting B-Roll)
            </h2>
            <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-mono">
              Server Adapter
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Medical Ethics & Accuracy Notice */}
          <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-300 block">
                Medical Quality & Biomechanical Grounding Notice:
              </span>
              <p className="leading-relaxed">
                AI-generated video clips are designated exclusively for supporting scenes, macroscopic patient demonstrations, and artistic/cellular representations.
                <strong> They must not be claimed as validated simulations</strong> or assumed to possess anatomically precise joint contact angles or bone kinematics.
              </p>
            </div>
          </div>

          {/* New Job Form */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Create Supporting Scene AI Clip
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Target Storyboard Scene</label>
                <select
                  value={selectedSceneId}
                  onChange={(e) => setSelectedSceneId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                >
                  {project.scenes.map((s, idx) => (
                    <option key={s.sceneId} value={s.sceneId}>
                      Scene {idx + 1}: {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Generation Adapter Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGenerationType('text-to-video')}
                    className={`flex-1 py-2 rounded-lg text-xs border ${
                      generationType === 'text-to-video'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-semibold'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Text-to-Video
                  </button>
                  <button
                    onClick={() => setGenerationType('image-to-video')}
                    className={`flex-1 py-2 rounded-lg text-xs border ${
                      generationType === 'image-to-video'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-semibold'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Image-to-Video
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Visual Prompt Description (Cellular, Arthroscopic, or Patient View)
              </label>
              <textarea
                rows={2}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the supporting medical visualization..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={handleCreateJob}
              disabled={isSubmitting}
              className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold py-2 px-4 rounded-lg text-xs flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Queueing Job...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Queue Video Render</span>
                </>
              )}
            </button>
          </div>

          {/* Active Job Queue */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Adapter Job Queue ({jobs.length})</span>
              <button
                onClick={loadJobs}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-normal"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </h3>

            {jobs.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center bg-slate-900/40 rounded-xl">
                No active or queued video generation jobs.
              </p>
            ) : (
              <div className="space-y-2">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                          {job.id}
                        </span>
                        <span className="font-semibold text-white truncate">{job.prompt}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>{job.type}</span>
                        <span>•</span>
                        <span>{job.durationSeconds}s clip</span>
                        <span>•</span>
                        <span className="text-purple-300 bg-purple-950/80 px-1.5 py-0.2 rounded border border-purple-800">
                          Artistic B-Roll
                        </span>
                      </div>
                    </div>

                    {/* Progress / Status */}
                    <div className="flex items-center gap-3 shrink-0">
                      {job.status === 'processing' && (
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                          <span className="font-mono text-cyan-400 text-[11px]">{job.progress}%</span>
                        </div>
                      )}

                      {job.status === 'completed' && (
                        <span className="text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Ready</span>
                        </span>
                      )}

                      {job.status === 'queued' && (
                        <span className="text-amber-400 flex items-center gap-1 font-medium">
                          <Clock className="w-4 h-4" />
                          <span>Queued</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
