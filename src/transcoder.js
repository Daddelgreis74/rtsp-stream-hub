const { spawn } = require('child_process');

function startMjpegStream(rtspUrl, req, res) {
  res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=--ffmpegboundary');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, pre-check=0, post-check=0, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  console.log(`Starting FFmpeg stream for: ${rtspUrl}`);

  // Spawn FFmpeg to read RTSP and output MJPEG to stdout
  const ffmpegProcess = spawn('ffmpeg', [
    '-rtsp_transport', 'tcp',
    '-i', rtspUrl,
    '-c:v', 'mjpeg',
    '-q:v', '4', // Quality scale (1-31, lower is better, 4 is a good compromise of CPU and quality)
    '-f', 'mpjpeg',
    '-an', // Disable audio
    '-'
  ]);

  ffmpegProcess.stdout.pipe(res);

  ffmpegProcess.stderr.on('data', (data) => {
    // Optional: Log FFmpeg debug output if needed
    // console.log(`FFmpeg: ${data}`);
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
