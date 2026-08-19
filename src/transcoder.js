const { spawn } = require('child_process');
const http = require('http');
const https = require('https');
const fs = require('fs');

/**
 * Append extra query parameters from client request (excluding token) to target URL
 */
function appendQueryParams(rawUrl, queryObj) {
  try {
    const url = new URL(rawUrl);
    for (const [key, value] of Object.entries(queryObj)) {
      if (key !== 'token' && value !== undefined) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  } catch (e) {
    return rawUrl;
  }
}

/**
 * Resolves stream type (auto, rtsp, mjpeg, hls, snapshot)
 */
function resolveStreamType(cameraUrl, explicitType) {
  if (explicitType && explicitType !== 'auto') {
    return explicitType;
  }
  const cleanUrl = cameraUrl.toLowerCase();
  if (cleanUrl.startsWith('rtsp://')) return 'rtsp';
  if (cleanUrl.includes('.m3u8')) return 'hls';
  if (cleanUrl.match(/\.(jpe?g|png)(\?|$)/i)) return 'snapshot';
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) return 'mjpeg';
  return 'rtsp';
}

function startMjpegStream(camera, req, res) {
  let cameraUrl = typeof camera === 'string' ? camera : camera.url;
  const streamType = resolveStreamType(cameraUrl, typeof camera === 'object' ? camera.stream_type : 'auto');
  const refreshInterval = (typeof camera === 'object' && camera.refresh_interval) ? parseInt(camera.refresh_interval, 10) : 2;

  // Append client query parameters (e.g. ?resolution=640x480) to target URL
  if (req.query && Object.keys(req.query).length > 0) {
    cameraUrl = appendQueryParams(cameraUrl, req.query);
  }

  console.log(`[Stream Dispatcher] Camera: "${camera.name || cameraUrl}" | Type: ${streamType} | URL: ${cameraUrl}`);

  // === 1. DIRECT HTTP/HTTPS MJPEG PROXY ===
  if (streamType === 'mjpeg') {
    const client = cameraUrl.startsWith('https://') ? https : http;
    const proxyReq = client.get(cameraUrl, { rejectUnauthorized: false }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error(`[MJPEG Proxy Error] ${err.message}`);
      if (!res.headersSent) {
        res.status(500).send('Streaming error');
      }
    });

    req.on('close', () => {
      console.log('[MJPEG Proxy] Client disconnected');
      proxyReq.destroy();
    });
    return;
  }

  // === 2. JPEG / PNG SNAPSHOT POLLER LOOP ===
  if (streamType === 'snapshot') {
    res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=ffmpeg');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, pre-check=0, post-check=0, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const client = cameraUrl.startsWith('https://') ? https : http;
    let isClosed = false;

    const fetchSnapshot = () => {
      if (isClosed) return;
      
      const fetchUrl = cameraUrl.includes('?') ? `${cameraUrl}&_t=${Date.now()}` : `${cameraUrl}?_t=${Date.now()}`;
      
      const snapReq = client.get(fetchUrl, { rejectUnauthorized: false }, (snapRes) => {
        if (snapRes.statusCode !== 200) {
          snapRes.resume();
          return;
        }

        const chunks = [];
        snapRes.on('data', (chunk) => chunks.push(chunk));
        snapRes.on('end', () => {
          if (isClosed) return;
          const imageBuffer = Buffer.concat(chunks);
          
          res.write(`--ffmpeg\r\nContent-Type: image/jpeg\r\nContent-Length: ${imageBuffer.length}\r\n\r\n`);
          res.write(imageBuffer);
          res.write('\r\n');
        });
      });

      snapReq.on('error', (err) => {
        console.error(`[Snapshot Fetch Error] ${err.message}`);
      });
    };

    fetchSnapshot();

    const intervalMs = Math.max(500, (refreshInterval || 2) * 1000);
    const intervalId = setInterval(fetchSnapshot, intervalMs);

    req.on('close', () => {
      console.log('[Snapshot Poller] Client disconnected');
      isClosed = true;
      clearInterval(intervalId);
    });
    return;
  }

  // === 3. RTSP OR HLS VIA FFMPEG TRANSCODER ===
  res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=ffmpeg');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, pre-check=0, post-check=0, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let useVaapi = false;
  try {
    if (process.env.DISABLE_VAAPI === 'true') {
      console.log('VAAPI hardware acceleration disabled via DISABLE_VAAPI env variable. Using CPU decoding.');
    } else if (fs.existsSync('/dev/dri/renderD128')) {
      fs.accessSync('/dev/dri/renderD128', fs.constants.R_OK | fs.constants.W_OK);
      useVaapi = true;
      console.log('VAAPI device /dev/dri/renderD128 is accessible. Enabling hardware acceleration.');
    } else if (fs.existsSync('/dev/dri')) {
      console.log('GPU device /dev/dri exists but /dev/dri/renderD128 was not found. Using CPU decoding.');
    }
  } catch (e) {
    console.log('GPU device /dev/dri/renderD128 exists but lacks read/write permissions. Using CPU decoding.');
  }

  const ffmpegArgs = [];
  
  if (streamType === 'rtsp' || cameraUrl.startsWith('rtsp://')) {
    ffmpegArgs.push('-rtsp_transport', 'tcp');
  }

  ffmpegArgs.push(
    '-fflags', 'nobuffer',
    '-flags', 'low_delay'
  );

  if (useVaapi) {
    ffmpegArgs.push(
      '-hwaccel', 'vaapi',
      '-hwaccel_device', '/dev/dri/renderD128',
      '-hwaccel_output_format', 'vaapi'
    );
  }

  ffmpegArgs.push('-i', cameraUrl);

  if (useVaapi) {
    ffmpegArgs.push('-vf', 'hwdownload,format=nv12');
  }

  ffmpegArgs.push(
    '-c:v', 'mjpeg',
    '-q:v', '4',
    '-f', 'mpjpeg',
    '-boundary_tag', 'ffmpeg',
    '-an',
    '-'
  );

  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

  ffmpegProcess.stdout.pipe(res);

  let stderrOutput = '';
  ffmpegProcess.stderr.on('data', (data) => {
    stderrOutput += data.toString();
  });

  ffmpegProcess.on('close', (code) => {
    if (code !== 0 && code !== null && code !== 255) {
      console.error(`[FFmpeg Error] Exit code: ${code}\nLog:\n${stderrOutput}`);
    }
  });

  ffmpegProcess.on('error', (err) => {
    console.error(`[FFmpeg Spawn Error] ${err.message}`);
    if (!res.headersSent) {
      res.status(500).send('Streaming error');
    }
  });

  req.on('close', () => {
    console.log('[FFmpeg] Client disconnected, killing process...');
    ffmpegProcess.kill('SIGINT');
  });
}

module.exports = {
  startMjpegStream,
  resolveStreamType
};
