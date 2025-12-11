/**
 * Stock Storage Service
 * Downloads stock videos from external URLs (Pexels/Pixabay) and saves to local drive
 * Uses backend server API to write files to disk
 */

const API_BASE = 'http://localhost:3002';

export interface StockVideoInfo {
  id: string;
  downloadUrl: string;
  previewUrl?: string;
  duration: number;
  source: 'pexels' | 'pixabay';
  author?: string;
}

export interface UploadResult {
  success: boolean;
  localUrl?: string;
  error?: string;
}

export interface DownloadProgress {
  loaded: number;
  total: number;
  percent: number;
}

/**
 * Check if the backend server is available
 */
export async function isStorageAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Download and save a stock video to local drive
 * Returns the local URL path
 */
export async function downloadAndSaveStockVideo(
  video: StockVideoInfo,
  projectId: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<UploadResult> {
  try {
    // Check if server is available
    const serverAvailable = await isStorageAvailable();

    if (!serverAvailable) {
      console.warn('Stock video server not available - using external URL directly');
      return {
        success: true,
        localUrl: video.downloadUrl, // Fallback to external URL
      };
    }

    // Call the backend API to download and save the video
    const response = await fetch(`${API_BASE}/api/download-stock-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: video.downloadUrl,
        source: video.source,
        videoId: video.id,
        projectId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || 'Download failed',
      };
    }

    const result = await response.json();

    return {
      success: true,
      localUrl: result.localUrl,
    };

  } catch (err) {
    console.error('Failed to download and save stock video:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Check if a URL is an external stock video URL
 */
export function isExternalStockUrl(url: string): boolean {
  return (
    url.includes('pexels.com') ||
    url.includes('pixabay.com') ||
    url.includes('videos.pexels.com') ||
    url.includes('cdn.pixabay.com')
  );
}

/**
 * Migrate existing external URLs to local storage
 * Returns a map of old URLs to new URLs
 */
export async function migrateExternalUrls(
  urls: string[],
  projectId: string,
  onProgress?: (current: number, total: number, url: string) => void
): Promise<Map<string, string>> {
  // Check if server is available first
  const serverAvailable = await isStorageAvailable();

  if (!serverAvailable) {
    console.warn('Stock video server not available - cannot migrate');
    // Return original URLs
    const urlMap = new Map<string, string>();
    urls.forEach(url => urlMap.set(url, url));
    return urlMap;
  }

  // Filter to only external stock URLs
  const externalUrls = urls.filter(url => isExternalStockUrl(url));

  if (externalUrls.length === 0) {
    return new Map();
  }

  // Prepare videos array for batch download
  const videos = externalUrls.map((url, i) => {
    const source = url.includes('pexels') ? 'pexels' : 'pixabay';
    return {
      url,
      source,
      videoId: `migrated_${i}_${Date.now()}`,
    };
  });

  try {
    // Use batch download endpoint
    const response = await fetch(`${API_BASE}/api/download-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videos,
        projectId,
      }),
    });

    if (!response.ok) {
      throw new Error('Batch download failed');
    }

    const result = await response.json();
    const urlMap = new Map<string, string>(Object.entries(result.urlMap));

    // Also include non-external URLs (unchanged)
    urls.forEach(url => {
      if (!isExternalStockUrl(url) && !urlMap.has(url)) {
        urlMap.set(url, url);
      }
    });

    // Call progress callback for completion
    if (onProgress) {
      onProgress(externalUrls.length, externalUrls.length, 'Complete');
    }

    return urlMap;

  } catch (err) {
    console.error('Migration failed:', err);
    // Return original URLs on failure
    const urlMap = new Map<string, string>();
    urls.forEach(url => urlMap.set(url, url));
    return urlMap;
  }
}

/**
 * Generate a unique filename for a stock video
 */
export function generateFilename(video: StockVideoInfo): string {
  const timestamp = Date.now();
  const sanitizedId = video.id.toString().replace(/[^a-zA-Z0-9]/g, '');
  return `stock_${video.source}_${sanitizedId}_${timestamp}.mp4`;
}
