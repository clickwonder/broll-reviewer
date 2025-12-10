/**
 * Kie AI Service for B-Roll Generation
 * Handles image generation and video conversion through Kie API
 */

const KIE_API_BASE = "https://api.kie.ai/api/v1/jobs";

const getApiKey = (): string => {
  const key = import.meta.env.VITE_KIE_API_KEY;
  if (!key) {
    throw new Error("VITE_KIE_API_KEY environment variable not set");
  }
  return key;
};

interface CreateTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

interface TaskStatusResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    model: string;
    state: "waiting" | "success" | "fail";
    param: string;
    resultJson: string;
    failCode: string | null;
    failMsg: string | null;
    costTime: number | null;
    completeTime: number | null;
    createTime: number;
  };
}

interface ResultUrls {
  resultUrls: string[];
}

export type ImageModel =
  | "imagen4-fast"
  | "imagen4"
  | "imagen4-ultra"
  | "nano-banana"
  | "nano-banana-pro"
  | "ideogram-v3"
  | "seedream"
  | "gpt-4o"
  | "flux-kontext";

export type VideoModel =
  | "sora-2"
  | "seedance"
  | "hailuo"
  | "veo3"
  | "grok";

async function createTask(model: string, input: Record<string, unknown>): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch(`${KIE_API_BASE}/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create task: ${response.statusText}`);
  }

  const result: CreateTaskResponse = await response.json();

  if (result.code !== 200) {
    throw new Error(result.msg || "Failed to create task");
  }

  return result.data.taskId;
}

async function pollTaskStatus(
  taskId: string,
  maxAttempts: number = 120,
  delayMs: number = 5000,
  onProgress?: (message: string) => void
): Promise<string[]> {
  const apiKey = getApiKey();

  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `${KIE_API_BASE}/recordInfo?taskId=${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to check task status: ${response.statusText}`);
    }

    const result: TaskStatusResponse = await response.json();

    if (result.code !== 200) {
      throw new Error(result.msg || "Failed to check task status");
    }

    const { state, resultJson, failMsg, costTime } = result.data;

    if (state === "success") {
      const resultData: ResultUrls = JSON.parse(resultJson);
      console.log(`[Kie] Task completed successfully. Duration: ${costTime}ms`);
      return resultData.resultUrls;
    }

    if (state === "fail") {
      throw new Error(failMsg || "Task failed");
    }

    // Report progress
    if (onProgress && i % 6 === 0 && i > 0) {
      const elapsedMinutes = ((i * delayMs) / 1000 / 60).toFixed(1);
      onProgress(`Still processing... (${elapsedMinutes} min elapsed)`);
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error("Task timeout - max polling attempts reached");
}

// Map our model IDs to Kie API model names
const IMAGE_MODEL_MAP: Record<ImageModel, string> = {
  "imagen4-fast": "google/imagen4-fast",
  "imagen4": "google/imagen4",
  "imagen4-ultra": "google/imagen4-ultra",
  "nano-banana": "google/nano-banana",
  "nano-banana-pro": "google/nano-banana-pro",
  "ideogram-v3": "ideogram/v3-text-to-image",
  "seedream": "bytedance/seedream-v4-text",
  "gpt-4o": "gpt-4o-image",
  "flux-kontext": "flux-kontext-pro",
};

const VIDEO_MODEL_MAP: Record<VideoModel, string> = {
  "sora-2": "sora-2-image-to-video",
  "seedance": "bytedance/seedance-v1-pro-i2v",
  "hailuo": "minimax/hailuo-2-3-i2v",
  "veo3": "google/veo3-fast",
  "grok": "grok-imagine-image-to-video",
};

export interface GenerationProgress {
  stage: 'image' | 'video' | 'complete' | 'error';
  message: string;
  imageUrl?: string;
  videoUrl?: string;
  error?: string;
}

export async function generateImage(
  prompt: string,
  model: ImageModel = "imagen4-fast",
  onProgress?: (progress: GenerationProgress) => void
): Promise<string> {
  const kieModel = IMAGE_MODEL_MAP[model];

  onProgress?.({
    stage: 'image',
    message: `Generating image with ${model}...`
  });

  let input: Record<string, unknown>;

  switch (model) {
    case "imagen4-fast":
    case "imagen4":
    case "imagen4-ultra":
      input = {
        prompt,
        aspect_ratio: "16:9",
      };
      break;

    case "nano-banana":
      input = {
        prompt,
        output_format: "png",
        image_size: "16:9",
      };
      break;

    case "nano-banana-pro":
      input = {
        prompt,
        aspect_ratio: "16:9",
        resolution: "2K",
      };
      break;

    case "ideogram-v3":
      input = {
        prompt,
        rendering_speed: "QUALITY",
        style: "DESIGN",
        expand_prompt: false,
        image_size: "landscape_16_9",
        num_images: "1",
      };
      break;

    case "seedream":
      input = {
        prompt,
        image_size: "landscape_16_9",
        image_resolution: "2K",
        max_images: 1,
      };
      break;

    case "gpt-4o":
      input = {
        prompt,
        size: "3:2",
        nVariants: 1,
        isEnhance: false,
      };
      break;

    case "flux-kontext":
      input = {
        prompt,
        aspect_ratio: "16:9",
        enable_translation: true,
      };
      break;

    default:
      throw new Error(`Unknown image model: ${model}`);
  }

  const taskId = await createTask(kieModel, input);
  console.log(`[Kie] Image task created: ${taskId}`);

  const resultUrls = await pollTaskStatus(taskId, 60, 3000, (msg) => {
    onProgress?.({ stage: 'image', message: msg });
  });

  if (!resultUrls || resultUrls.length === 0) {
    throw new Error("No images generated");
  }

  const imageUrl = resultUrls[0];
  onProgress?.({
    stage: 'image',
    message: 'Image generated successfully!',
    imageUrl
  });

  return imageUrl;
}

export async function generateVideo(
  prompt: string,
  imageUrl: string,
  model: VideoModel = "sora-2",
  onProgress?: (progress: GenerationProgress) => void
): Promise<string> {
  const kieModel = VIDEO_MODEL_MAP[model];

  onProgress?.({
    stage: 'video',
    message: `Converting to video with ${model}...`,
    imageUrl
  });

  let input: Record<string, unknown>;

  switch (model) {
    case "sora-2":
      input = {
        prompt,
        image_urls: [imageUrl],
        aspect_ratio: "landscape",
        remove_watermark: true,
      };
      break;

    case "seedance":
      input = {
        prompt,
        image_url: imageUrl,
        duration: "6",
        resolution: "1080p",
        camera_fixed: false,
      };
      break;

    case "hailuo":
      input = {
        prompt,
        image_url: imageUrl,
        duration: "6",
        resolution: "1080P",
      };
      break;

    case "veo3":
      input = {
        prompt,
        image_urls: [imageUrl],
        aspect_ratio: "16:9",
        model: "veo3_fast",
      };
      break;

    case "grok":
      input = {
        prompt,
        image_urls: [imageUrl],
        mode: "normal",
      };
      break;

    default:
      throw new Error(`Unknown video model: ${model}`);
  }

  const taskId = await createTask(kieModel, input);
  console.log(`[Kie] Video task created: ${taskId}`);

  const resultUrls = await pollTaskStatus(taskId, 120, 10000, (msg) => {
    onProgress?.({ stage: 'video', message: msg, imageUrl });
  });

  if (!resultUrls || resultUrls.length === 0) {
    throw new Error("No video generated");
  }

  const videoUrl = resultUrls[0];
  onProgress?.({
    stage: 'complete',
    message: 'Video generated successfully!',
    imageUrl,
    videoUrl
  });

  return videoUrl;
}

/**
 * Generate a complete B-Roll video (image → video pipeline)
 */
export async function generateBRoll(
  prompt: string,
  style: string,
  imageModel: ImageModel = "imagen4-fast",
  videoModel: VideoModel = "sora-2",
  onProgress?: (progress: GenerationProgress) => void
): Promise<{ imageUrl: string; videoUrl: string }> {
  // Build enhanced prompts
  const imagePrompt = `${style === 'cinematic' ? 'Cinematic shot, dramatic lighting, ' : ''}${style === 'realistic' ? 'Photorealistic, natural lighting, ' : ''}${style === 'documentary' ? 'Documentary style, authentic feel, ' : ''}${prompt}. ${style === 'cinematic' ? 'film grain, shallow depth of field, professional cinematography' : ''}`;

  const videoPrompt = `${prompt}. Slow camera pan, gentle movement, smooth motion`;

  try {
    // Step 1: Generate image
    const imageUrl = await generateImage(imagePrompt, imageModel, onProgress);

    // Step 2: Generate video from image
    const videoUrl = await generateVideo(videoPrompt, imageUrl, videoModel, onProgress);

    return { imageUrl, videoUrl };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    onProgress?.({
      stage: 'error',
      message: `Generation failed: ${errorMessage}`,
      error: errorMessage
    });
    throw error;
  }
}

/**
 * Download a video from URL and return as blob URL for local playback
 */
export async function downloadVideoAsBlob(videoUrl: string): Promise<string> {
  const response = await fetch(videoUrl);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
