import React, { useState } from 'react';
import { StoryboardProject, StoryboardScene } from '../types/medical';
import { validateClinicalClaim } from '../services/geminiService';
import {
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  BookOpen,
  Award,
  FileText,
  UserCheck,
  Search,
  ExternalLink,
  Info,
} from 'lucide-react';

interface MedicalQAPanelProps {
  project: StoryboardProject;
  onUpdateProject: (project: StoryboardProject) => void;
}

export const MedicalQAPanel: React.FC<MedicalQAPanelProps> = ({
  project,
  onUpdateProject,
}) => {
  const [reviewerName, setReviewerName] = useState('Dr. Sarah Jenkins, PT, DPT, OCS');
  const [reviewerRole, setReviewerRole] = useState('Senior Musculoskeletal Physical Therapist & Clinical Biomechanist');
  const [selectedSceneId, setSelectedSceneId] = useState<string>(project.scenes[0]?.sceneId || '');
  const [validatingSceneId, setValidatingSceneId] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any | null>(null);

  const selectedScene = project.scenes.find((s) => s.sceneId === selectedSceneId) || project.scenes[0];

  const handleUpdateStatus = (sceneId: string, status: 'Approved' | 'Requires Review' | 'Flagged') => {
    const scenes = project.scenes.map((s) => {
      if (s.sceneId === sceneId) {
        return {
          ...s,
          reviewStatus: status,
          reviewerNotes: `Reviewed by ${reviewerName} on ${new Date().toLocaleDateString()}. Status: ${status}.`,
        };
      }
      return s;
    });

    onUpdateProject({ ...project, scenes });
  };

  const handleRunClinicalAudit = async (scene: StoryboardScene) => {
    setValidatingSceneId(scene.sceneId);
    try {
      const result = await validateClinicalClaim(
        scene.sceneId,
        scene.clinicalClaimRequiringReview || scene.narrationScript,
        scene.highlightedStructures.join(', '),
        scene.movementType
      );
      setValidationResult(result);
    } catch (err) {
      console.error('Validation error:', err);
    } finally {
      setValidatingSceneId(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0b1324] text-slate-200 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Panel Header */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Medical Quality Assurance & Clinical Review
                </h1>
                <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-medium">
                  Clinical Governance
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Ensure every scene adheres to peer-reviewed biomechanical principles, clear distinction of AI-generated artistic assets vs validated simulations, and explicit clinician sign-off.
              </p>
            </div>

            {/* Reviewer Credentials Badge */}
            <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-3 flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-cyan-400 shrink-0" />
              <div className="text-xs">
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:outline-none focus:border-cyan-400 block w-full"
                />
                <input
                  type="text"
                  value={reviewerRole}
                  onChange={(e) => setReviewerRole(e.target.value)}
                  className="text-[11px] text-slate-400 bg-transparent border-b border-transparent hover:border-slate-700 focus:outline-none focus:border-cyan-400 block w-full"
                />
              </div>
            </div>
          </div>

          {/* Classification Badges Guide */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5 pt-4 border-t border-slate-800">
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
              <span className="text-[10px] font-bold text-emerald-400 block mb-0.5">
                [Normal Anatomy]
              </span>
              <span className="text-[11px] text-slate-400">
                Terminologia Anatomica compliant geometry
              </span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
              <span className="text-[10px] font-bold text-amber-400 block mb-0.5">
                [Pathological Anatomy]
              </span>
              <span className="text-[11px] text-slate-400">
                Erosion, tears, or joint space narrowing
              </span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
              <span className="text-[10px] font-bold text-cyan-400 block mb-0.5">
                [Validated Kinematics]
              </span>
              <span className="text-[11px] text-slate-400">
                Peer-reviewed joint angles & rollback
              </span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
              <span className="text-[10px] font-bold text-purple-400 block mb-0.5">
                [AI Supporting Render]
              </span>
              <span className="text-[11px] text-slate-400">
                Artistic / conceptual cellular explanation
              </span>
            </div>
          </div>
        </div>

        {/* Scene QA Audit Cards */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Clinical Scene Audit Records ({project.scenes.length} Scenes)
          </h2>

          {project.scenes.map((scene, idx) => {
            const isApproved = scene.reviewStatus === 'Approved';
            const isFlagged = scene.reviewStatus === 'Flagged';

            return (
              <div
                key={scene.sceneId}
                className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4"
              >
                {/* Scene Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-bold flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-white">{scene.title}</h3>
                  </div>

                  {/* Status Badges & Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateStatus(scene.sceneId, 'Approved')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                        isApproved
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(scene.sceneId, 'Requires Review')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                        scene.reviewStatus === 'Requires Review'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Flag for Review</span>
                    </button>

                    <button
                      onClick={() => handleRunClinicalAudit(scene)}
                      disabled={validatingSceneId === scene.sceneId}
                      className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1 rounded-lg text-xs font-semibold text-cyan-300 flex items-center gap-1.5"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Verify Evidence</span>
                    </button>
                  </div>
                </div>

                {/* Claim Requiring Review */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                  <div className="md:col-span-7 space-y-2">
                    <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
                      <span className="font-semibold text-cyan-300 block mb-1">
                        Biomechanical Claim Requiring Verification:
                      </span>
                      <p className="text-slate-300 leading-relaxed italic">
                        "{scene.clinicalClaimRequiringReview || 'All joint movements and rotations adhere to published in-vivo kinematic data.'}"
                      </p>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
                      <span className="font-semibold text-slate-300 block mb-1">
                        Narration Claim Transcript:
                      </span>
                      <p className="text-slate-400 leading-relaxed font-sans">
                        {scene.narrationScript}
                      </p>
                    </div>
                  </div>

                  <div className="md:col-span-5 space-y-2">
                    {/* Clinical Literature Citations */}
                    <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
                      <span className="font-semibold text-emerald-400 block mb-1 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Sourced Clinical Literature Citations:</span>
                      </span>
                      <ul className="space-y-1 mt-1 text-[11px] text-slate-300">
                        {scene.clinicalReferences.map((ref, rIdx) => (
                          <li key={rIdx} className="flex items-start gap-1">
                            <span className="text-cyan-400">•</span>
                            <span>{ref}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Reviewer Note */}
                    {scene.reviewerNotes && (
                      <div className="bg-emerald-950/40 border border-emerald-800/80 p-2.5 rounded-xl text-[11px] text-emerald-300">
                        <span className="font-bold block mb-0.5">Audit Note:</span>
                        <span>{scene.reviewerNotes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Validation modal if active */}
                {validationResult && validationResult.sceneId === scene.sceneId && (
                  <div className="bg-cyan-950/60 border border-cyan-800 p-4 rounded-xl mt-3 text-xs text-cyan-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Database Verification Verdict:</span>
                      <span className="font-mono bg-cyan-900 px-2 py-0.5 rounded text-[10px] text-cyan-300">
                        {validationResult.consensusScore}
                      </span>
                    </div>
                    <p className="text-cyan-300">{validationResult.verdict}</p>
                    <p className="text-slate-300 italic">{validationResult.clinicalNote}</p>
                    <p className="text-[11px] text-cyan-400 pt-1 font-mono">
                      Ref: {validationResult.primaryReference}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
