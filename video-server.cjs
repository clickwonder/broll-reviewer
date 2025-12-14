/**
 * Video server with byte-range support for seeking
 * Run with: node video-server.cjs
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8888;
const VIDEO_DIR = path.join(__dirname, 'public');

// Also serve from home directory broll-videos if it exists
const HOME_VIDEO_DIR = process.env.HOME ? path.join(process.env.HOME, 'broll-videos') : null;

const server = http.createServer((req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Decode URL and get file path
  const urlPath = decodeURIComponent(req.url.split('?')[0]);

  // Try multiple locations for the file
  let filePath = path.join(VIDEO_DIR, urlPath);

  // Check if file exists, if not try home directory
  if (!fs.existsSync(filePath) && HOME_VIDEO_DIR) {
    const homePath = path.join(HOME_VIDEO_DIR, urlPath);
    if (fs.existsSync(homePath)) {
      filePath = homePath;
    }
  }

  // Security: prevent directory traversal
  if (!filePath.startsWith(VIDEO_DIR) && (!HOME_VIDEO_DIR || !filePath.startsWith(HOME_VIDEO_DIR))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log(`[404] Not found: ${filePath}`);
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const stat = fs.statSync(filePath);

  if (stat.isDirectory()) {
    res.writeHead(400);
    res.end('Cannot serve directory');
    return;
  }

  const fileSize = stat.size;
  const ext = path.extname(filePath).toLowerCase();

  // Content type mapping
  const contentTypes = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json'
  };

  const contentType = contentTypes[ext] || 'application/octet-stream';

  // Handle Range requests for video seeking
  const range = req.headers.range;

  if (range) {
    // Parse Range header
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    // Validate range
    if (start >= fileSize || end >= fileSize || start > end) {
      res.writeHead(416, {
        'Content-Range': `bytes */${fileSize}`
      });
      res.end();
      return;
    }

    const chunkSize = end - start + 1;

    console.log(`[206] Range ${start}-${end}/${fileSize}: ${urlPath}`);

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600'
    });

    const stream = fs.createReadStream(filePath, { start, end });
    stream.pipe(res);

  } else {
    // No range request - serve full file but indicate range support
    console.log(`[200] Full file: ${urlPath} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600'
    });

    fs.createReadStream(filePath).pipe(res);
  }
});

server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`Video Server with Byte-Range Support`);
  console.log(`========================================`);
  console.log(`Listening on: http://localhost:${PORT}`);
  console.log(`Serving from: ${VIDEO_DIR}`);
  if (HOME_VIDEO_DIR && fs.existsSync(HOME_VIDEO_DIR)) {
    console.log(`Also serving: ${HOME_VIDEO_DIR}`);
  }
  console.log(`\nByte-range requests: ENABLED (for video seeking)`);
  console.log(`========================================\n`);
});
