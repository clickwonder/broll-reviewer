/**
 * Backend server for downloading stock videos to local drive
 * Run with: node server.js
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
const PORT = 3002;

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// Directory for storing stock videos (same as B-roll for consistency)
const STOCK_VIDEO_DIR = path.join(__dirname, 'public', 'broll');

// Also save to native Linux path for fast video server (WSL2 performance)
const FAST_VIDEO_DIR = '/home/mike/broll-videos/broll';

// Ensure directories exist
if (!fs.existsSync(STOCK_VIDEO_DIR)) {
  fs.mkdirSync(STOCK_VIDEO_DIR, { recursive: true });
}
if (!fs.existsSync(FAST_VIDEO_DIR)) {
  fs.mkdirSync(FAST_VIDEO_DIR, { recursive: true });
}

/**
 * Download a file from URL and save locally to both directories
 */
async function downloadFile(url, filename, projectId) {
  return new Promise((resolve, reject) => {
    // Create project subfolder if projectId provided
    const projectFolder = projectId && projectId !== 'default' ? projectId : '';

    const stockDir = projectFolder
      ? path.join(STOCK_VIDEO_DIR, projectFolder)
      : STOCK_VIDEO_DIR;
    const fastDir = projectFolder
      ? path.join(FAST_VIDEO_DIR, projectFolder)
      : FAST_VIDEO_DIR;

    // Ensure project subdirectories exist
    if (!fs.existsSync(stockDir)) {
      fs.mkdirSync(stockDir, { recursive: true });
    }
    if (!fs.existsSync(fastDir)) {
      fs.mkdirSync(fastDir, { recursive: true });
    }

    const filePath = path.join(stockDir, filename);
    const fastFilePath = path.join(fastDir, filename);
    const file = fs.createWriteStream(filePath);

    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        file.close();
        fs.unlinkSync(filePath);
        downloadFile(redirectUrl, filename, projectId).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filePath);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();

        // Copy to fast video server directory
        try {
          fs.copyFileSync(filePath, fastFilePath);
          console.log(`Also copied to: ${fastFilePath}`);
        } catch (copyErr) {
          console.error(`Warning: Could not copy to fast dir: ${copyErr.message}`);
        }

        resolve({ filePath, projectFolder });
      });

      file.on('error', (err) => {
        fs.unlinkSync(filePath);
        reject(err);
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      reject(err);
    });
  });
}

/**
 * POST /api/download-stock-video
 * Downloads a stock video from external URL and saves to local drive
 */
app.post('/api/download-stock-video', async (req, res) => {
  try {
    const { url, source, videoId, projectId, desiredFilename } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Use desired filename if provided (when replacing an existing asset),
    // otherwise generate a unique filename
    let filename;
    if (desiredFilename) {
      // Sanitize and use the provided filename
      const sanitizedName = desiredFilename.replace(/[^a-zA-Z0-9_-]/g, '_');
      filename = `${sanitizedName}.mp4`;
    } else {
      // Generate filename: stock_source_id_timestamp.mp4
      const timestamp = Date.now();
      const sanitizedId = (videoId || 'unknown').toString().replace(/[^a-zA-Z0-9]/g, '');
      filename = `stock_${source || 'unknown'}_${sanitizedId}_${timestamp}.mp4`;
    }

    console.log(`Downloading: ${url}`);
    console.log(`Saving as: ${filename}`);
    console.log(`Project: ${projectId || 'default'}`);

    // Download the file to both directories
    const { projectFolder } = await downloadFile(url, filename, projectId);

    // Return the local URL (relative to public folder, with project subfolder)
    const localUrl = projectFolder
      ? `/broll/${projectFolder}/${filename}`
      : `/broll/${filename}`;

    console.log(`Downloaded successfully: ${localUrl}`);

    res.json({
      success: true,
      localUrl,
      filename
    });

  } catch (error) {
    console.error('Download failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/download-batch
 * Downloads multiple stock videos
 */
app.post('/api/download-batch', async (req, res) => {
  try {
    const { videos, projectId } = req.body;

    if (!videos || !Array.isArray(videos)) {
      return res.status(400).json({ error: 'Videos array is required' });
    }

    const results = new Map();

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const { url, source, videoId } = video;

      try {
        const timestamp = Date.now();
        const sanitizedId = (videoId || `batch_${i}`).toString().replace(/[^a-zA-Z0-9]/g, '');
        const filename = `stock_${source || 'unknown'}_${sanitizedId}_${timestamp}.mp4`;

        console.log(`[${i + 1}/${videos.length}] Downloading: ${url}`);

        const { projectFolder } = await downloadFile(url, filename, projectId);

        const localUrl = projectFolder
          ? `/broll/${projectFolder}/${filename}`
          : `/broll/${filename}`;
        results.set(url, localUrl);

        console.log(`[${i + 1}/${videos.length}] Success: ${localUrl}`);

      } catch (err) {
        console.error(`[${i + 1}/${videos.length}] Failed: ${url}`, err.message);
        results.set(url, url); // Keep original URL on failure
      }
    }

    res.json({
      success: true,
      urlMap: Object.fromEntries(results)
    });

  } catch (error) {
    console.error('Batch download failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', stockVideoDir: STOCK_VIDEO_DIR });
});

app.listen(PORT, () => {
  console.log(`Stock video server running on http://localhost:${PORT}`);
  console.log(`Stock videos will be saved to: ${STOCK_VIDEO_DIR}`);
});
