export type MedicalSpecialty =
  | 'musculoskeletal'
  | 'orthopaedics'
  | 'sports'
  | 'neurology'
  | 'cardiopulmonary'
  | 'paediatrics'
  | 'rheumatology';

export type AnatomicalRegion = 'knee' | 'spine' | 'shoulder';

export type PathologyCondition =
  | 'normal'
  | 'knee-osteoarthritis'
  | 'acl-tear'
  | 'meniscal-tear'
  | 'patellofemoral-pain'
  | 'disc-herniation'
  | 'shoulder-impingement';

export type MovementType =
  | 'static'
  | 'flexion-extension'
  | 'varus-valgus-stress'
  | 'anterior-drawer'
  | 'tibial-rotation';

export type TargetAudience =
  | 'Physiotherapy Patients'
  | 'Medical & Physiotherapy Students'
  | 'Clinicians & Orthopaedic Surgeons'
  | 'Sports Rehabilitation Specialists';

export type CameraPreset =
  | 'anterior'
  | 'lateral'
  | 'medial'
  | 'posterior'
  | 'superior'
  | 'isometric'
  | 'dynamic-orbit';

export type ViewMode = 'standard' | 'exploded' | 'transparent' | 'sectional';

export interface StoryboardScene {
  sceneId: string;
  title: string;
  learningObjective: string;
  visualDescription: string;
  cameraAngle: CameraPreset;
  cameraZoom: number;
  jointAngleDegrees: number;
  movementType: MovementType;
  movementSpeed: number;
  highlightedStructures: string[];
  viewMode: ViewMode;
  pathologyActive: boolean;
  narrationScript: string;
  onScreenLabels: string[];
  durationSeconds: number;
  clinicalClaimRequiringReview?: string;
  reviewStatus: 'Approved' | 'Requires Review' | 'Flagged' | 'Pending';
  reviewerNotes?: string;
  clinicalReferences: string[];
  aiSupportingVideoPrompt?: string;
  supportingVideoUrl?: string;
  audioBase64?: string;
}

export interface StoryboardProject {
  id: string;
  title: string;
  specialty: MedicalSpecialty;
  region: AnatomicalRegion;
  condition: PathologyCondition;
  movement: MovementType;
  targetAudience: TargetAudience;
  learningObjectives: string[];
  scenes: StoryboardScene[];
  totalDuration: number;
  clinicalDisclaimer: string;
  createdAt: string;
  version: string;
}

export interface AnatomicalStructureMeta {
  id: string;
  name: string;
  latinName: string;
  category: 'bone' | 'ligament' | 'cartilage' | 'meniscus' | 'tendon' | 'nerve' | 'capsule';
  description: string;
  biomechanicalRole: string;
  clinicalSignificance: string;
  defaultVisible: boolean;
  color: string;
}

export interface GoniometerMeasurement {
  angleDegrees: number;
  normalMin: number;
  normalMax: number;
  plane: 'Sagittal' | 'Frontal/Coronal' | 'Transverse';
  label: string;
  status: 'Normal' | 'Hyper-extended' | 'Restricted' | 'Pathological Laxity';
}

export interface VideoExportOptions {
  aspectRatio: '16:9' | '9:16' | '1:1';
  resolution: '1080p' | '720p';
  fps: 30 | 60;
  includeNarration: boolean;
  includeSubtitles: boolean;
  includeGoniometer: boolean;
  includeAnatomicalLabels: boolean;
  includeWatermark: boolean;
}
