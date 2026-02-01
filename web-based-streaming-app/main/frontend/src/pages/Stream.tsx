
import React, { useState, useRef, useEffect } from 'react';
import { Container, Typography, Box, Button, Paper } from '@mui/material';
import axios from 'axios';

export default function Stream() {
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState('Idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream|null>(null);

  const handleStart = async () => {
    setStatus('Starting...');
    try {
      await axios.post('/api/stream/start');
      setStreaming(true);
      setStatus('Streaming...');
    } catch (err) {
      setStatus('Failed to start stream');
    }
  };

  const handleStop = async () => {
    setStatus('Stopping...');
    try {
      await axios.post('/api/stream/stop');
      setStreaming(false);
      setStatus('Stopped');
    } catch (err) {
      setStatus('Failed to stop stream');
    }
  };

  useEffect(() => {
    // Request webcam on mount
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setMediaStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => setMediaStream(null));
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  return (
    <Container maxWidth="md" sx={{ mt: 8 }}>
      <Typography variant="h4" gutterBottom>Streaming Studio</Typography>
      <Box sx={{ mb: 3 }}>
        <Button variant="contained" color="primary" onClick={handleStart} disabled={streaming} sx={{ mr: 2 }}>
          Start Streaming
        </Button>
        <Button variant="contained" color="error" onClick={handleStop} disabled={!streaming}>
          Stop Streaming
        </Button>
      </Box>
      <Paper elevation={3} sx={{ height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, position: 'relative' }}>
        {mediaStream ? (
          <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Typography variant="subtitle1" color="text.secondary">
            No camera detected or permission denied.
          </Typography>
        )}
      </Paper>
      <Typography variant="body1">Status: {status}</Typography>
    </Container>
  );
}
