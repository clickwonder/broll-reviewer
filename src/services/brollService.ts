/**
 * B-Roll Management Service
 *
 * Workflow:
 * 1. Generate image with Imagen4 Fast (Google's image model) - most economical
 * 2. Convert image to video with Sora 2 Image-to-Video (OpenAI) - most economical video option
 * 3. Download and save to public/broll folder
 *
 * MCP Tools Used:
 * - mcp__kie-ai-extended__imagen4_fast_generate (image generation)
 * - mcp__kie-ai-extended__sora_2_image_to_video (image to video - ECONOMICAL)
 * - mcp__kie-ai-extended__wait_for_task_completion (polling)
 */

export interface GenerationConfig {
  prompt: string;
  style: 'realistic' | 'cinematic' | 'documentary';
  duration: '5' | '8' | '10';
  resolution: '720p' | '1080p';
}

export interface GenerationTask {
  id: string;
  assetId: string;
  status: 'pending' | 'generating_image' | 'generating_video' | 'downloading' | 'complete' | 'failed';
  imageTaskId?: string;
  videoTaskId?: string;
  imageUrl?: string;
  videoUrl?: string;
  error?: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

// Style presets for different visual looks
export const STYLE_PRESETS: Record<string, { prefix: string; suffix: string }> = {
  realistic: {
    prefix: 'Photorealistic, high quality photograph,',
    suffix: 'natural lighting, 4K quality, documentary style'
  },
  cinematic: {
    prefix: 'Cinematic shot, dramatic lighting,',
    suffix: 'film grain, shallow depth of field, professional cinematography'
  },
  documentary: {
    prefix: 'Documentary footage style,',
    suffix: 'authentic, journalistic, candid moment captured'
  }
};

// Motion presets for video generation
export const MOTION_PRESETS: Record<string, string> = {
  slow_pan: 'Slow camera pan, gentle movement, smooth motion',
  zoom_in: 'Slow zoom in, focusing motion, dramatic reveal',
  static: 'Minimal movement, subtle ambient motion only',
  dynamic: 'Dynamic camera movement, energetic, following action'
};

/**
 * Build enhanced prompt for image generation
 */
export function buildImagePrompt(basePrompt: string, style: string): string {
  const preset = STYLE_PRESETS[style] || STYLE_PRESETS.cinematic;
  return `${preset.prefix} ${basePrompt}. ${preset.suffix}`;
}

/**
 * Build video generation prompt
 */
export function buildVideoPrompt(description: string): string {
  return `${description}. ${MOTION_PRESETS.slow_pan}`;
}

/**
 * API endpoints for the B-roll service
 * These would be called from a backend or via MCP tools
 */
export const API_ENDPOINTS = {
  // Imagen4 Fast for image generation (most economical)
  generateImage: {
    tool: 'mcp__kie-ai-extended__imagen4_fast_generate',
    defaultParams: {
      aspect_ratio: '16:9',
      num_images: '1'
    }
  },
  // Sora 2 for image-to-video (most economical video option)
  generateVideo: {
    tool: 'mcp__kie-ai-extended__sora_2_image_to_video',
    defaultParams: {
      aspect_ratio: 'landscape',  // 16:9 format
      remove_watermark: true
    }
  },
  // Task status polling
  checkStatus: {
    tool: 'mcp__kie-ai-extended__query_task_status'
  },
  waitForCompletion: {
    tool: 'mcp__kie-ai-extended__wait_for_task_completion',
    defaultParams: {
      max_wait_seconds: 300,
      poll_interval_seconds: 5
    }
  }
};

/**
 * In-memory task store (would be persisted in production)
 */
class TaskStore {
  private tasks: Map<string, GenerationTask> = new Map();

  create(assetId: string): GenerationTask {
    const task: GenerationTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      assetId,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.tasks.set(task.id, task);
    return task;
  }

  update(taskId: string, updates: Partial<GenerationTask>): GenerationTask | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const updated = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.tasks.set(taskId, updated);
    return updated;
  }

  get(taskId: string): GenerationTask | null {
    return this.tasks.get(taskId) || null;
  }

  getByAssetId(assetId: string): GenerationTask | null {
    for (const task of this.tasks.values()) {
      if (task.assetId === assetId && task.status !== 'complete' && task.status !== 'failed') {
        return task;
      }
    }
    return null;
  }

  getAll(): GenerationTask[] {
    return Array.from(this.tasks.values());
  }
}

export const taskStore = new TaskStore();

/**
 * Generation workflow steps
 */
export const WORKFLOW_STEPS = [
  { status: 'pending', label: 'Queued', progress: 0 },
  { status: 'generating_image', label: 'Generating Image (Imagen4)', progress: 25 },
  { status: 'generating_video', label: 'Converting to Video (Seedance)', progress: 60 },
  { status: 'downloading', label: 'Downloading & Saving', progress: 90 },
  { status: 'complete', label: 'Complete', progress: 100 }
];

/**
 * Get progress label for a task
 */
export function getProgressLabel(status: GenerationTask['status']): string {
  const step = WORKFLOW_STEPS.find(s => s.status === status);
  return step?.label || 'Unknown';
}

/**
 * Export configuration for scene cutaway JSON
 */
export interface CutawayConfig {
  video: string;
  startTime: number;
  duration: number;
  style: 'fullscreen' | 'pip' | 'splitscreen';
  videoStartTime: number;
  playbackRate: number;
}

/**
 * Generate cutaway config for a new B-roll
 */
export function generateCutawayConfig(
  filename: string,
  _sceneId: string,
  startTime: number = 2.0,
  duration: number = 4.0
): CutawayConfig {
  void _sceneId; // Available for future scene-specific config
  return {
    video: `broll/${filename}`,
    startTime,
    duration,
    style: 'fullscreen',
    videoStartTime: 0,
    playbackRate: 0.9
  };
}

/**
 * Sample prompts for different B-roll types
 */
export const SAMPLE_PROMPTS = {
  medical: [
    'Person reviewing medical bills with worried expression, papers spread on kitchen table',
    'Close up of hands holding medical insurance card, official documents visible',
    'Doctor and patient having a consultation, medical office setting',
    'Hospital reception area, people waiting, medical environment'
  ],
  financial: [
    'Credit report document showing score, financial paperwork on desk',
    'Person signing official financial document, pen in hand',
    'Calculator and bills spread on table, budgeting scene',
    'Bank or financial institution exterior, professional building'
  ],
  family: [
    'Happy family receiving good news, living room setting, relief and joy',
    'Parent and child looking at documents together, kitchen table',
    'Family celebration, positive moment, home environment'
  ],
  government: [
    'Government building exterior with American flags, official architecture',
    'Courtroom interior, legal setting, justice symbols',
    'Official document with government seal, formal paperwork'
  ],
  deadline: [
    'Calendar with highlighted dates, deadline marked, time pressure',
    'Clock showing time passing, urgent deadline atmosphere',
    'Person checking calendar on phone, scheduling important date'
  ]
};

export default {
  taskStore,
  buildImagePrompt,
  buildVideoPrompt,
  generateCutawayConfig,
  API_ENDPOINTS,
  STYLE_PRESETS,
  MOTION_PRESETS,
  WORKFLOW_STEPS,
  SAMPLE_PROMPTS
};
