export interface BRollAsset {
  id: string;
  filename: string;
  path: string;
  description: string;
  status: 'approved' | 'pending' | 'rejected' | 'regenerating';
  usedInScenes: string[];
  duration?: number;
  fileSize?: number;
  createdAt: string;
  versions: BRollVersion[];
  imageUrl?: string;  // Generated image URL from Kie API
  videoUrl?: string;  // Generated video URL from Kie API
  source?: 'ai' | 'pexels' | 'pixabay' | 'local';  // Source of the asset
}

export interface BRollVersion {
  id: string;
  filename: string;
  path: string;
  versionNumber: number;
  createdAt: string;
  isSelected: boolean;
  imageUrl?: string;  // Generated image URL
  videoUrl?: string;  // Generated video URL
}

export interface SceneCutaway {
  sceneId: string;
  sceneTitle: string;
  cutaways: CutawayConfig[];
}

export interface CutawayConfig {
  video: string;
  startTime: number;
  duration: number;
  style: string;
  videoStartTime: number;
  playbackRate: number;
}

export interface RegenerateRequest {
  assetId: string;
  prompt: string;
  style?: string;
}

// Generation Settings
export type ImageModel =
  | 'imagen4_fast'      // Google Imagen4 Fast - Fast & economical
  | 'imagen4'           // Google Imagen4 Standard
  | 'imagen4_ultra'     // Google Imagen4 Ultra - Highest quality
  | 'nano_banana'       // Gemini 2.5 Flash
  | 'nano_banana_pro'   // Gemini 2.5 Pro
  | 'ideogram_v3'       // Ideogram V3 - Great for text
  | 'seedream'          // ByteDance Seedream V4
  | 'gpt4o'             // OpenAI GPT-4o Image
  | 'flux_kontext';     // Flux Kontext

export type VideoModel =
  | 'sora_2'            // OpenAI Sora 2 Standard (Image-to-Video)
  | 'seedance'          // ByteDance Seedance V1 Pro
  | 'hailuo'            // Hailuo 2.3 Standard
  | 'veo3'              // Google Veo 3.1
  | 'grok';             // Grok Imagine

export type StockSource =
  | 'pexels'
  | 'pixabay'
  | 'none';

export interface GenerationSettings {
  imageModel: ImageModel;
  videoModel: VideoModel;
  stockSource: StockSource;
  preferStock: boolean;  // If true, search stock first before generating
}

export const DEFAULT_SETTINGS: GenerationSettings = {
  imageModel: 'imagen4_fast',
  videoModel: 'sora_2',
  stockSource: 'none',
  preferStock: false
};

export const IMAGE_MODEL_INFO: Record<ImageModel, { name: string; description: string; speed: string; quality: string }> = {
  imagen4_fast: { name: 'Imagen4 Fast', description: 'Google - Fast & economical', speed: 'Fast', quality: 'Good' },
  imagen4: { name: 'Imagen4', description: 'Google - Standard quality', speed: 'Medium', quality: 'High' },
  imagen4_ultra: { name: 'Imagen4 Ultra', description: 'Google - Highest quality', speed: 'Slow', quality: 'Ultra' },
  nano_banana: { name: 'Nano Banana', description: 'Gemini 2.5 Flash', speed: 'Fast', quality: 'Good' },
  nano_banana_pro: { name: 'Nano Banana Pro', description: 'Gemini 2.5 Pro - Better detail', speed: 'Medium', quality: 'High' },
  ideogram_v3: { name: 'Ideogram V3', description: 'Best for text in images', speed: 'Medium', quality: 'High' },
  seedream: { name: 'Seedream V4', description: 'ByteDance - Up to 4K', speed: 'Medium', quality: 'High' },
  gpt4o: { name: 'GPT-4o Image', description: 'OpenAI - Great variety', speed: 'Medium', quality: 'High' },
  flux_kontext: { name: 'Flux Kontext', description: 'Great for editing', speed: 'Fast', quality: 'High' }
};

export const VIDEO_MODEL_INFO: Record<VideoModel, { name: string; description: string; duration: string; quality: string }> = {
  sora_2: { name: 'Sora 2', description: 'OpenAI - Standard I2V', duration: '5-20s', quality: 'High' },
  seedance: { name: 'Seedance', description: 'ByteDance - Up to 12s, 1080p', duration: '3-12s', quality: 'High' },
  hailuo: { name: 'Hailuo 2.3', description: 'Standard - 768P/1080P', duration: '6-10s', quality: 'Good' },
  veo3: { name: 'Veo 3.1', description: 'Google - 1080P HD', duration: '5-10s', quality: 'Ultra' },
  grok: { name: 'Grok Imagine', description: 'xAI - Fun/Normal modes', duration: '5s', quality: 'Good' }
};
