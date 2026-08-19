// WebRTC Streaming Player Library for RTSP Stream Hub

let peerConnection = null;

async function playWebRTC(cameraId, videoElement, statusElement, token) {
  if (peerConnection) {
    stopWebRTC();
  }

  statusElement.textContent = 'Verbinde mit WebRTC (Lade SDP)...';

  try {
    peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    peerConnection.ontrack = (event) => {
      console.log('WebRTC track received:', event);
      if (videoElement.srcObject !== event.streams[0]) {
        videoElement.srcObject = event.streams[0];
        videoElement.classList.remove('d-none');
        statusElement.textContent = 'Verbunden (Live)';
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (!peerConnection) return;
      console.log('WebRTC state changed:', peerConnection.connectionState);
      if (peerConnection.connectionState === 'failed') {
        statusElement.textContent = 'Verbindung fehlgeschlagen';
      }
    };

    // Add transceivers for audio/video to request downlink
    peerConnection.addTransceiver('video', { direction: 'recvonly' });
    peerConnection.addTransceiver('audio', { direction: 'recvonly' });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Send SDP offer to signaling proxy route
    const response = await fetch(`/api/streams/webrtc/${cameraId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ sdp: peerConnection.localDescription.sdp })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Signaling failed');
    }

    const answerSdp = await response.text();
    await peerConnection.setRemoteDescription({ type: 'answer', sdp: answerSdp });

  } catch (err) {
    console.error('WebRTC Play Error:', err.message);
    statusElement.textContent = `WebRTC Fehler: ${err.message}. Probiere MJPEG-Fallback.`;
    videoElement.classList.add('d-none');
  }
}

function stopWebRTC() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
}
