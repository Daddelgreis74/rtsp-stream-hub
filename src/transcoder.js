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
 * Max stderr buffer size (16 KB) to prevent unbounded RAM growth on long-running streams
 */
const MAX_STDERR_BYTES = 16 * 1024;

/**
 * Max snapshot size (10 MB) to prevent RAM exhaustion on malformed upstream responses
 */
const MAX_SNAPSHOT_BYTES = 10 * 1024 * 1024;

/**
 * Cached VAAPI hardware acceleration check (evaluated once instead of blocking per stream)
 */
let cachedVaapiState = null;

function isVaapiAvailable() {
  if (process.env.DISABLE_VAAPI === 'true') {
    return false;
  }
  if (cachedVaapiState !== null) {
    return cachedVaapiState;
  }
  try {
    if (fs.existsSync('/dev/dri/renderD128')) {
      fs.accessSync('/dev/dri/renderD128', fs.constants.R_OK | fs.constants.W_OK);
      cachedVaapiState = true;
      console.log('VAAPI device /dev/dri/renderD128 is accessible. Enabling hardware acceleration.');
      return true;
    }
  } catch (e) {
    console.log('GPU device /dev/dri/renderD128 exists but lacks read/write permissions. Using CPU decoding.');
  }
  cachedVaapiState = false;
  return false;
}

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
 * Validates that a camera URL uses a safe streaming protocol (rtsp, rtsps, http, https)
 * Blocks local file inclusion (file://) or FFmpeg protocol injection (concat:, subfile:, etc.)
 */
function isValidStreamUrl(cameraUrl) {
  if (!cameraUrl || typeof cameraUrl !== 'string') return false;
  const trimmed = cameraUrl.trim();
  if (trimmed.startsWith('-')) return false;
  return /^(rtsps?|https?):\/\/.+/i.test(trimmed);
}

/**
 * Resolves stream type (auto, rtsp, mjpeg, hls, snapshot)
 */
function resolveStreamType(cameraUrl, explicitType) {
  if (explicitType && explicitType !== 'auto') {
    return explicitType;
  }
  const cleanUrl = String(cameraUrl || '').toLowerCase();
  if (cleanUrl.startsWith('rtsp://') || cleanUrl.startsWith('rtsps://')) return 'rtsp';
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

  // Fallback force kill (unref so it never blocks Node process exit)
  const killTimer = setTimeout(() => {
    try {
      if (!proc.killed) {
        proc.kill('SIGKILL');
      }
    } catch (e) {}
  }, 500);
  if (typeof killTimer.unref === 'function') {
    killTimer.unref();
  }
}

function startMjpegStream(camera, req, res) {
  let cameraUrl = typeof camera === 'string' ? camera : camera.url;
  if (!isValidStreamUrl(cameraUrl)) {
    if (!res.headersSent) {
      res.status(400).send('Invalid or unsupported stream URL protocol');
    }
    return;
  }

  const streamType = resolveStreamType(cameraUrl, typeof camera === 'object' ? camera.stream_type : 'auto');
  const refreshInterval = (typeof camera === 'object' && camera.refresh_interval) ? parseInt(camera.refresh_interval, 10) : 2;
  const cameraId = (typeof camera === 'object' && camera.id) ? String(camera.id) : cameraUrl;

  // Append client query parameters (e.g. ?resolution=640x480) to target URL
  if (req.query && Object.keys(req.query).length > 0) {
    cameraUrl = appendQueryParams(cameraUrl, req.query);
  }

  const streamKey = `${cameraId}_${cameraUrl}`;

  // Disable Nagle's algorithm on the client socket for immediate MJPEG frame delivery
  if (res.socket && typeof res.socket.setNoDelay === 'function') {
    res.socket.setNoDelay(true);
  }

  // Common response cache & connection headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, pre-check=0, post-check=0, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // === MULTIPLEXING: Attach to existing active session if one exists ===
  if (activeSessions.has(streamKey)) {
    const session = activeSessions.get(streamKey);
    res.setHeader('Content-Type', session.contentType || 'multipart/x-mixed-replace; boundary=ffmpeg');
    session.clients.add(res);
    console.log(`[Stream Multiplexer] Added viewer to "${camera.name || streamKey}" (Active viewers: ${session.clients.size})`);

    // Immediately push the latest cached snapshot frame if available (0ms TTFB for subsequent snapshot viewers)
    if (session.lastFramePayload && !res.writableEnded) {
      try { res.write(session.lastFramePayload); } catch (e) {}
    }

    req.once('close', () => {
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
    closed: false,
    clients: new Set([res]),
    contentType: null,
    process: null,
    intervalId: null,
    proxyReq: null,
    activeSnapReq: null,
    lastFramePayload: null
  };
  activeSessions.set(streamKey, session);

  // Setup client disconnect handler
  req.once('close', () => {
    session.clients.delete(res);
    console.log(`[Stream Multiplexer] Viewer disconnected from "${camera.name || streamKey}" (Remaining: ${session.clients.size})`);
    if (session.clients.size === 0) {
      stopSession(streamKey);
    }
  });

  // === 1. DIRECT HTTP/HTTPS MJPEG PROXY ===
  if (streamType === 'mjpeg') {
    const client = cameraUrl.startsWith('https://') ? https : http;
    const proxyReq = client.get(cameraUrl, { rejectUnauthorized: false, timeout: 10000 }, (proxyRes) => {
      const upstreamContentType = proxyRes.headers['content-type'] || 'multipart/x-mixed-replace; boundary=--myboundary';
      session.contentType = upstreamContentType;

      for (const c of session.clients) {
        try {
          if (!c.headersSent) {
            c.setHeader('Content-Type', upstreamContentType);
          }
        } catch (e) {}
      }

      proxyRes.on('data', (chunk) => {
        for (const c of session.clients) {
          if (c.writableEnded || c.destroyed) {
            session.clients.delete(c);
            continue;
          }
          try { c.write(chunk); } catch (e) {}
        }
      });
      proxyRes.on('end', () => {
        stopSession(streamKey);
      });
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy(new Error('Upstream MJPEG connection timeout'));
    });

    proxyReq.on('error', (err) => {
      if (!session.closed) {
        console.error(`[MJPEG Proxy Error] ${err.message}`);
      }
      for (const c of session.clients) {
        try { if (!c.headersSent) c.status(502).send('Streaming error'); } catch (e) {}
      }
      stopSession(streamKey);
    });

    session.proxyReq = proxyReq;
    return;
  }

  // === 2. JPEG / PNG SNAPSHOT POLLER LOOP ===
  if (streamType === 'snapshot') {
    const defaultBoundary = 'ffmpeg';
    session.contentType = `multipart/x-mixed-replace; boundary=${defaultBoundary}`;
    res.setHeader('Content-Type', session.contentType);

    const client = cameraUrl.startsWith('https://') ? https : http;
    let isFetching = false;

    const fetchSnapshot = () => {
      if (session.closed || session.clients.size === 0 || isFetching) return;
      isFetching = true;

      const fetchUrl = cameraUrl.includes('?') ? `${cameraUrl}&_t=${Date.now()}` : `${cameraUrl}?_t=${Date.now()}`;

      const snapReq = client.get(fetchUrl, { rejectUnauthorized: false, timeout: 8000 }, (snapRes) => {
        if (snapRes.statusCode !== 200) {
          snapRes.resume();
          isFetching = false;
          return;
        }

        const chunks = [];
        let totalBytes = 0;

        snapRes.on('data', (chunk) => {
          totalBytes += chunk.length;
          if (totalBytes > MAX_SNAPSHOT_BYTES) {
            snapReq.destroy(new Error('Snapshot exceeded maximum allowed size'));
            return;
          }
          chunks.push(chunk);
        });

        snapRes.on('end', () => {
          isFetching = false;
          session.activeSnapReq = null;
          if (session.closed || session.clients.size === 0 || chunks.length === 0) return;

          const imageBuffer = Buffer.concat(chunks, totalBytes);
          const headerBuf = Buffer.from(
            `--${defaultBoundary}\r\nContent-Type: image/jpeg\r\nContent-Length: ${imageBuffer.length}\r\n\r\n`,
            'ascii'
          );
          const footerBuf = Buffer.from('\r\n', 'ascii');
          const fullFrame = Buffer.concat([headerBuf, imageBuffer, footerBuf], headerBuf.length + imageBuffer.length + footerBuf.length);
          session.lastFramePayload = fullFrame;

          for (const c of session.clients) {
            if (c.writableEnded || c.destroyed) {
              session.clients.delete(c);
              continue;
            }
            try { c.write(fullFrame); } catch (e) {}
          }
        });
      });

      snapReq.on('timeout', () => {
        snapReq.destroy(new Error('Snapshot request timed out'));
      });

      snapReq.on('error', (err) => {
        isFetching = false;
        session.activeSnapReq = null;
        if (!session.closed) {
          console.error(`[Snapshot Fetch Error] ${err.message}`);
        }
      });

      session.activeSnapReq = snapReq;
    };

    fetchSnapshot();
    const intervalMs = Math.max(500, (refreshInterval || 2) * 1000);
    session.intervalId = setInterval(fetchSnapshot, intervalMs);
    return;
  }

  // === 3. RTSP OR HLS VIA FFMPEG TRANSCODER ===
  const defaultBoundary = 'ffmpeg';
  session.contentType = `multipart/x-mixed-replace; boundary=${defaultBoundary}`;
  res.setHeader('Content-Type', session.contentType);

  const useVaapi = isVaapiAvailable();

  const ffmpegArgs = [
    '-hide_banner',
    '-loglevel', 'error'
  ];

  if (streamType === 'rtsp' || cameraUrl.startsWith('rtsp://') || cameraUrl.startsWith('rtsps://')) {
    ffmpegArgs.push('-rtsp_transport', 'tcp');
  }

  // Fast stream probing for lower Time-to-First-Frame (TTFB)
  ffmpegArgs.push(
    '-fflags', 'nobuffer',
    '-flags', 'low_delay',
    '-probesize', '1000000',
    '-analyzeduration', '1000000'
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
    '-boundary_tag', defaultBoundary,
    '-an',
    '-'
  );

  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
  session.process = ffmpegProcess;

  ffmpegProcess.stdout.on('data', (chunk) => {
    for (const c of session.clients) {
      if (c.writableEnded || c.destroyed) {
        session.clients.delete(c);
        continue;
      }
      try { c.write(chunk); } catch (e) {}
    }
  });

  // Ring-buffered stderr capture (prevents memory leaks on multi-day streams)
  let stderrOutput = '';
  ffmpegProcess.stderr.on('data', (data) => {
    stderrOutput += data.toString();
    if (stderrOutput.length > MAX_STDERR_BYTES) {
      stderrOutput = stderrOutput.slice(-MAX_STDERR_BYTES);
    }
  });

  ffmpegProcess.on('close', (code) => {
    if (!session.closed && code !== 0 && code !== null && code !== 255) {
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
  session.closed = true;
  activeSessions.delete(streamKey);

  console.log(`[Stream Multiplexer] Terminating stream session "${streamKey}"`);

  // Close any remaining client connections
  for (const client of session.clients) {
    try { client.end(); } catch (e) {}
  }
  session.clients.clear();
  session.lastFramePayload = null;

  // Stop FFmpeg process, timer, or active HTTP requests
  if (session.process) {
    killFfmpegProcess(session.process);
    session.process = null;
  }
  if (session.intervalId) {
    clearInterval(session.intervalId);
    session.intervalId = null;
  }
  if (session.activeSnapReq) {
    try { session.activeSnapReq.destroy(); } catch (e) {}
    session.activeSnapReq = null;
  }
  if (session.proxyReq) {
    try { session.proxyReq.destroy(); } catch (e) {}
    session.proxyReq = null;
  }
}

/**
 * Terminates all active sessions (used during graceful server shutdown)
 */
function stopAllSessions() {
  for (const streamKey of Array.from(activeSessions.keys())) {
    stopSession(streamKey);
  }
}

module.exports = {
  startMjpegStream,
  resolveStreamType,
  isValidStreamUrl,
  stopAllSessions
};
