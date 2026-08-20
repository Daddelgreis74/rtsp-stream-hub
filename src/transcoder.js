const { spawn } = require('child_process');
const http = require('http');
const https = require('https');
const fs = require('fs');

/**
 * Active shared streaming sessions: Map<streamKey, SessionObject>
 * Allows multiple viewers to share a single FFmpeg transcoding or proxy process.
 */
const activeSessions = new Map();

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

/**
 * Reliably kills an FFmpeg child process without leaving zombies
 */
function killFfmpegProcess(proc) {
  if (!proc) return;
  try {
    if (proc.stdout) proc.stdout.destroy();
    if (proc.stderr) proc.stderr.destroy();
    if (proc.stdin) proc.stdin.destroy();
    proc.kill('SIGTERM');
  } catch (e) {}

  // Fallback force kill
  setTimeout(() => {
    try {
      if (!proc.killed) {
        proc.kill('SIGKILL');
      }
    } catch (e) {}
  }, 500);
}

function startMjpegStream(camera, req, res) {
  let cameraUrl = typeof camera === 'string' ? camera : camera.url;
  const streamType = resolveStreamType(cameraUrl, typeof camera === 'object' ? camera.stream_type : 'auto');
  const refreshInterval = (typeof camera === 'object' && camera.refresh_interval) ? parseInt(camera.refresh_interval, 10) : 2;
  const cameraId = (typeof camera === 'object' && camera.id) ? String(camera.id) : cameraUrl;

  // Append client query parameters (e.g. ?resolution=640x480) to target URL
  if (req.query && Object.keys(req.query).length > 0) {
    cameraUrl = appendQueryParams(cameraUrl, req.query);
  }

  const streamKey = `${cameraId}_${cameraUrl}`;

  // Common response headers for MJPEG streaming
  res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=ffmpeg');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, pre-check=0, post-check=0, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // === MULTIPLEXING: Attach to existing active session if one exists ===
  if (activeSessions.has(streamKey)) {
    const session = activeSessions.get(streamKey);
    session.clients.add(res);
    console.log(`[Stream Multiplexer] Added viewer to "${camera.name || streamKey}" (Active viewers: ${session.clients.size})`);

    req.on('close', () => {
      session.clients.delete(res);
      console.log(`[Stream Multiplexer] Viewer disconnected from "${camera.name || streamKey}" (Remaining: ${session.clients.size})`);
      if (session.clients.size === 0) {
        stopSession(streamKey);
      }
    });
    return;
  }

  console.log(`[Stream Dispatcher] Starting new stream for "${camera.name || cameraUrl}" | Type: ${streamType}`);

  const session = {
    key: streamKey,
    type: streamType,
    clients: new Set([res]),
    process: null,
    intervalId: null,
    proxyReq: null
  };
  activeSessions.set(streamKey, session);

  // Setup client disconnect handler
  req.on('close', () => {
    session.clients.delete(res);
    console.log(`[Stream Multiplexer] Viewer disconnected from "${camera.name || streamKey}" (Remaining: ${session.clients.size})`);
    if (session.clients.size === 0) {
      stopSession(streamKey);
    }
  });

  // === 1. DIRECT HTTP/HTTPS MJPEG PROXY ===
  if (streamType === 'mjpeg') {
    const client = cameraUrl.startsWith('https://') ? https : http;
    const proxyReq = client.get(cameraUrl, { rejectUnauthorized: false }, (proxyRes) => {
      proxyRes.on('data', (chunk) => {
        for (const c of session.clients) {
          try { c.write(chunk); } catch (e) {}
        }
      });
      proxyRes.on('end', () => {
        stopSession(streamKey);
      });
    });

    proxyReq.on('error', (err) => {
      console.error(`[MJPEG Proxy Error] ${err.message}`);
      for (const c of session.clients) {
        try { if (!c.headersSent) c.status(500).send('Streaming error'); } catch (e) {}
      }
      stopSession(streamKey);
    });

    session.proxyReq = proxyReq;
    return;
  }

  // === 2. JPEG / PNG SNAPSHOT POLLER LOOP ===
  if (streamType === 'snapshot') {
    const client = cameraUrl.startsWith('https://') ? https : http;
    let isClosed = false;

    const fetchSnapshot = () => {
      if (isClosed || session.clients.size === 0) return;
      const fetchUrl = cameraUrl.includes('?') ? `${cameraUrl}&_t=${Date.now()}` : `${cameraUrl}?_t=${Date.now()}`;

      const snapReq = client.get(fetchUrl, { rejectUnauthorized: false }, (snapRes) => {
        if (snapRes.statusCode !== 200) {
          snapRes.resume();
          return;
        }

        const chunks = [];
        snapRes.on('data', (chunk) => chunks.push(chunk));
        snapRes.on('end', () => {
          if (isClosed || session.clients.size === 0) return;
          const imageBuffer = Buffer.concat(chunks);
          const header = `--ffmpeg\r\nContent-Type: image/jpeg\r\nContent-Length: ${imageBuffer.length}\r\n\r\n`;

          for (const c of session.clients) {
            try {
              c.write(header);
              c.write(imageBuffer);
              c.write('\r\n');
            } catch (e) {}
          }
        });
      });

      snapReq.on('error', (err) => {
        console.error(`[Snapshot Fetch Error] ${err.message}`);
      });
    };

    fetchSnapshot();
    const intervalMs = Math.max(500, (refreshInterval || 2) * 1000);
    session.intervalId = setInterval(fetchSnapshot, intervalMs);
    return;
  }

  // === 3. RTSP OR HLS VIA FFMPEG TRANSCODER ===
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
  session.process = ffmpegProcess;

  ffmpegProcess.stdout.on('data', (chunk) => {
    for (const c of session.clients) {
      try { c.write(chunk); } catch (e) {}
    }
  });

  let stderrOutput = '';
  ffmpegProcess.stderr.on('data', (data) => {
    stderrOutput += data.toString();
  });

  ffmpegProcess.on('close', (code) => {
    if (code !== 0 && code !== null && code !== 255) {
      console.error(`[FFmpeg Error] Exit code: ${code}\nLog:\n${stderrOutput}`);
    }
    stopSession(streamKey);
  });

  ffmpegProcess.on('error', (err) => {
    console.error(`[FFmpeg Spawn Error] ${err.message}`);
    for (const c of session.clients) {
      try { if (!c.headersSent) c.status(500).send('Streaming error'); } catch (e) {}
    }
    stopSession(streamKey);
  });
}

/**
 * Stops and cleans up an active session
 */
function stopSession(streamKey) {
  if (!activeSessions.has(streamKey)) return;
  const session = activeSessions.get(streamKey);
  activeSessions.delete(streamKey);

  console.log(`[Stream Multiplexer] Terminating stream session "${streamKey}"`);

  // Close any remaining client connections
  for (const client of session.clients) {
    try { client.end(); } catch (e) {}
  }
  session.clients.clear();

  // Stop process or timer
  if (session.process) {
    killFfmpegProcess(session.process);
    session.process = null;
  }
  if (session.intervalId) {
    clearInterval(session.intervalId);
    session.intervalId = null;
  }
  if (session.proxyReq) {
    try { session.proxyReq.destroy(); } catch (e) {}
    session.proxyReq = null;
  }
}

module.exports = {
  startMjpegStream,
  resolveStreamType
};
