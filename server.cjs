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

// Ensure directory exists
if (!fs.existsSync(STOCK_VIDEO_DIR)) {
  fs.mkdirSync(STOCK_VIDEO_DIR, { recursive: true });
}

/**
 * Download a file from URL and save locally
 */
async function downloadFile(url, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(STOCK_VIDEO_DIR, filename);
    const file = fs.createWriteStream(filePath);

    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        file.close();
        fs.unlinkSync(filePath);
        downloadFile(redirectUrl, filename).then(resolve).catch(reject);
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
        resolve(filePath);
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
    const { url, source, videoId, projectId } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Generate filename
    const timestamp = Date.now();
    const sanitizedId = (videoId || 'unknown').toString().replace(/[^a-zA-Z0-9]/g, '');
    const filename = `stock_${source || 'unknown'}_${sanitizedId}_${timestamp}.mp4`;

    console.log(`Downloading: ${url}`);
    console.log(`Saving as: ${filename}`);

    // Download the file
    await downloadFile(url, filename);

    // Return the local URL (relative to public folder)
    const localUrl = `/broll/${filename}`;

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

        await downloadFile(url, filename);

        const localUrl = `/broll/${filename}`;
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
