const { spawn } = require('child_process');

function startMjpegStream(rtspUrl, req, res) {
  res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=--ffmpegboundary');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, pre-check=0, post-check=0, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  console.log(`Starting FFmpeg stream for: ${rtspUrl}`);

  const fs = require('fs');
  const useVaapi = fs.existsSync('/dev/dri');

  const ffmpegArgs = ['-rtsp_transport', 'tcp'];

  if (useVaapi) {
    console.log('GPU device /dev/dri detected, enabling VAAPI hardware acceleration.');
    // Enable VAAPI decoding
    ffmpegArgs.push(
      '-hwaccel', 'vaapi',
      '-hwaccel_device', '/dev/dri/renderD128',
      '-hwaccel_output_format', 'vaapi'
    );
  }

  ffmpegArgs.push('-i', rtspUrl);

  if (useVaapi) {
    // Copy frames back to system memory for the software MJPEG encoder
    ffmpegArgs.push('-vf', 'hwdownload,format=nv12');
  }

  ffmpegArgs.push(
    '-c:v', 'mjpeg',
    '-q:v', '4', // Quality scale (1-31, lower is better, 4 is a good compromise of CPU and quality)
    '-f', 'mpjpeg',
    '-an', // Disable audio
    '-'
  );

  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

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
