const { spawn } = require('child_process');
const http = require('http');
const https = require('https');

function startMjpegStream(cameraUrl, req, res) {
  // If it's already an HTTP/HTTPS stream (e.g. Axis MJPEG camera stream), proxy directly!
  if (/^https?:\/\//i.test(cameraUrl)) {
    console.log(`Proxying HTTP/HTTPS stream directly: ${cameraUrl}`);
    const client = cameraUrl.startsWith('https://') ? https : http;
    const proxyReq = client.get(cameraUrl, { rejectUnauthorized: false }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error(`HTTP Stream Proxy Error: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).send('Streaming error');
      }
    });

    req.on('close', () => {
      console.log('Client disconnected from HTTP proxy stream');
      proxyReq.destroy();
    });
    return;
  }

  res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=ffmpeg');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, pre-check=0, post-check=0, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  console.log(`Starting FFmpeg RTSP stream for: ${cameraUrl}`);

  const fs = require('fs');
  let useVaapi = false;

  // Check if VAAPI device exists AND is readable/writable by the current user
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

  const ffmpegArgs = [
    '-rtsp_transport', 'tcp',
    '-fflags', 'nobuffer',
    '-flags', 'low_delay'
  ];

  if (useVaapi) {
    // Enable VAAPI decoding
    ffmpegArgs.push(
      '-hwaccel', 'vaapi',
      '-hwaccel_device', '/dev/dri/renderD128',
      '-hwaccel_output_format', 'vaapi'
    );
  }

  ffmpegArgs.push('-i', cameraUrl);

  if (useVaapi) {
    // Copy frames back to system memory for the software MJPEG encoder
    ffmpegArgs.push('-vf', 'hwdownload,format=nv12');
  }

  ffmpegArgs.push(
    '-c:v', 'mjpeg',
    '-q:v', '4', // Quality scale (1-31, lower is better, 4 is a good compromise of CPU and quality)
    '-f', 'mpjpeg',
    '-boundary_tag', 'ffmpeg',
    '-an', // Disable audio
    '-'
  );

  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

  ffmpegProcess.stdout.pipe(res);

  let stderrOutput = '';
  ffmpegProcess.stderr.on('data', (data) => {
    stderrOutput += data.toString();
  });

  ffmpegProcess.on('close', (code) => {
    console.log(`FFmpeg process closed with code ${code}`);
    if (code !== 0 && code !== null && code !== 255) {
      console.error(`FFmpeg process crashed! Exit code: ${code}\nError Log:\n${stderrOutput}`);
    }
  });

  ffmpegProcess.on('error', (err) => {
    console.error(`FFmpeg Process Error: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).send('Streaming error');
    }
  });

  // If the browser closes the connection, terminate the FFmpeg process
  req.on('close', () => {
    console.log('Client disconnected, killing FFmpeg process...');
    ffmpegProcess.kill('SIGINT');
  });
}

module.exports = {
  startMjpegStream
};
