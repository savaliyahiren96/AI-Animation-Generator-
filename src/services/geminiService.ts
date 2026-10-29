import {
  AnatomicalRegion,
  MedicalSpecialty,
  MovementType,
  PathologyCondition,
  StoryboardProject,
  TargetAudience,
} from '../types/medical';

export interface GenerateStoryboardParams {
  topic: string;
  specialty: MedicalSpecialty;
  targetAudience: TargetAudience;
  region: AnatomicalRegion;
  condition: PathologyCondition;
  movement: MovementType;
  learningObjectives: string[];
  targetDuration: number;
}

export async function requestStoryboardGeneration(
  params: GenerateStoryboardParams
): Promise<{ success: boolean; storyboard: StoryboardProject; source: string; notice?: string }> {
  const response = await fetch('/api/gemini/generate-storyboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Storyboard generation HTTP error: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

export async function requestNarrationAudio(
  text: string,
  voice = 'Kore'
): Promise<{ available: boolean; audioBase64?: string; mimeType?: string; message?: string }> {
  try {
    const response = await fetch('/api/gemini/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });

    if (!response.ok) {
      return { available: false, message: 'Server TTS error' };
    }

    return await response.json();
  } catch (err: any) {
    return { available: false, message: err.message };
  }
}

// Client-side Web Speech fallback for instant browser narration
export function speakTextWithBrowserTTS(
  text: string,
  onEnd?: () => void
): { stop: () => void } {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return { stop: () => {} };
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  // Prefer natural English voices if available
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(
    (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
  );
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  if (onEnd) {
    utterance.onend = () => onEnd();
    utterance.onerror = () => onEnd();
  }

  window.speechSynthesis.speak(utterance);

  return {
    stop: () => window.speechSynthesis.cancel(),
  };
}

export async function validateClinicalClaim(
  sceneId: string,
  claim: string,
  structure: string,
  movement: string
) {
  const response = await fetch('/api/clinical-qa/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sceneId, claim, structure, movement }),
  });
  return await response.json();
}

export async function submitAIVideoJob(
  topic: string,
  prompt: string,
  sceneId?: string
) {
  const response = await fetch('/api/video-adapter/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, prompt, sceneId, type: 'text-to-video' }),
  });
  return await response.json();
}

export async function fetchAIVideoJobs() {
  const response = await fetch('/api/video-adapter/jobs');
  return await response.json();
}
