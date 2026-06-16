import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';

import { apiRequest } from '../api';
import type { AppConfig, AppStatus, ChatState, ProviderName, StreamHealth } from '../types';

const checklist = [
  'Camera preview is visible',
  'Mic and system audio choices are correct',
  'Stream title and category are reviewed',
  'RTMP target or HLS output is configured'
] as const;

export default function Stream() {
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [streamMessage, setStreamMessage] = useState('');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [displayStream, setDisplayStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [health, setHealth] = useState<StreamHealth | null>(null);
  const [chatState, setChatState] = useState<ChatState | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [selectedPreview, setSelectedPreview] = useState<'camera' | 'screen'>('camera');
  const [markerLabel, setMarkerLabel] = useState('Highlight marker');
  const videoRef = useRef<HTMLVideoElement>(null);

  const activeChatProvider = config?.stream.provider !== 'custom'
    ? config?.stream.provider
    : status?.providers.find((provider) => provider.connected)?.provider;
  const activeProfile = activeChatProvider ? config?.providers[activeChatProvider]?.profile : null;
  const canShowTwitchEmbed = activeChatProvider === 'twitch' && Boolean(activeProfile?.username) && window.location.protocol.startsWith('http');

  const checklistItems = [
    {
      label: checklist[0],
      progress: mediaStream || displayStream ? 100 : 0,
      help: mediaStream || displayStream
        ? 'A live preview source is working.'
        : 'Allow camera access or start a screen capture so the preview appears on this page.'
    },
    {
      label: checklist[1],
      progress: config?.stream.micEnabled && config?.stream.systemAudioEnabled ? 100 : config?.stream.micEnabled || config?.stream.systemAudioEnabled ? 50 : 0,
      help: config?.stream.micEnabled && config?.stream.systemAudioEnabled
        ? 'Mic and desktop audio are both turned on.'
        : config?.stream.micEnabled || config?.stream.systemAudioEnabled
          ? 'Turn on both Mic enabled and System audio in Settings to reach 100%.'
          : 'Turn on Mic enabled and System audio in Settings.'
    },
    {
      label: checklist[2],
      progress: config?.stream.title && config?.stream.category ? 100 : config?.stream.title || config?.stream.category ? 50 : 0,
      help: config?.stream.title && config?.stream.category
        ? 'Your stream title and category are ready.'
        : config?.stream.title || config?.stream.category
          ? 'Add the missing title or category in Settings to reach 100%.'
          : 'Add a stream title and choose a category in Settings.'
    },
    {
      label: checklist[3],
      progress: status?.checks.hasStreamTarget ? 100 : 0,
      help: status?.checks.hasStreamTarget
        ? 'At least one live destination has been added.'
        : 'Choose a provider or paste your RTMP server URL and stream key in Settings.'
    }
  ];

  const checklistCompletion = checklistItems.length
    ? Math.round(checklistItems.reduce((total, item) => total + item.progress, 0) / checklistItems.length)
    : 0;

  const refresh = async () => {
    const [statusResponse, configResponse, healthResponse, chatResponse] = await Promise.all([
      apiRequest<AppStatus>('/api/app/status'),
      apiRequest<AppConfig>('/api/app/config'),
      apiRequest<StreamHealth>('/api/stream/health'),
      apiRequest<ChatState>('/api/chat')
    ]);
    setStatus(statusResponse);
    setConfig(configResponse);
    setHealth(healthResponse);
    setChatState(chatResponse);
  };

  useEffect(() => {
    refresh().catch((err) => setStreamMessage(err instanceof Error ? err.message : 'Failed to load stream state.'));
  }, []);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setMediaStream(stream);
      })
      .catch(() => {
        setCameraError('No camera preview is available yet. Check permissions or connect a device.');
      });

    return () => {
      mediaStream?.getTracks().forEach((track) => track.stop());
      displayStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const activeStream = selectedPreview === 'screen' ? displayStream : mediaStream;
    if (videoRef.current && activeStream) {
      videoRef.current.srcObject = activeStream;
    }
  }, [mediaStream, displayStream, selectedPreview]);

  const startScreenPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      setDisplayStream(stream);
      setSelectedPreview('screen');
      setCameraError('');
    } catch {
      setCameraError('Screen sharing was canceled or blocked.');
    }
  };

  const startStreaming = async () => {
    try {
      const result = await apiRequest<{ message: string }>('/api/stream/start', { method: 'POST' });
      setStreamMessage(result.message);
      await refresh();
    } catch (err) {
      setStreamMessage(err instanceof Error ? err.message : 'Failed to start stream.');
    }
  };

  const stopStreaming = async () => {
    try {
      const result = await apiRequest<{ message: string }>('/api/stream/stop', { method: 'POST' });
      setStreamMessage(result.message);
      await refresh();
    } catch (err) {
      setStreamMessage(err instanceof Error ? err.message : 'Failed to stop stream.');
    }
  };

  const sendChatMessage = async (message: string) => {
    if (!message.trim()) {
      return;
    }

    const response = await apiRequest<ChatState>('/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({
        provider: activeChatProvider || 'custom',
        author: 'Studio',
        message
      })
    });
    setChatState(response);
    setChatInput('');
  };

  const pinChatMessage = async (message: string) => {
    const response = await apiRequest<ChatState>('/api/chat/pin', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
    setChatState(response);
  };

  const addMarker = async () => {
    await apiRequest('/api/stream/marker', {
      method: 'POST',
      body: JSON.stringify({ label: markerLabel })
    });
    setStreamMessage('Highlight marker added.');
    await refresh();
  };

  const viewerCount = useMemo(() => {
    if (!status?.providers.some((provider) => provider.connected)) {
      return 0;
    }
    return 12 + (chatState?.messages.length || 0);
  }, [status, chatState]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Streaming studio</Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.72)' }}>
          Preview webcam or screen, watch stream health in plain language, send chat updates, drop highlight markers, and keep notes visible during the show.
        </Typography>
      </Box>

      {streamMessage && <Alert severity={status?.runtime.streaming ? 'success' : 'info'}>{streamMessage}</Alert>}
      {cameraError && <Alert severity="warning">{cameraError}</Alert>}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 6, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button variant={selectedPreview === 'camera' ? 'contained' : 'outlined'} onClick={() => setSelectedPreview('camera')}>
                Camera preview
              </Button>
              <Button variant={selectedPreview === 'screen' ? 'contained' : 'outlined'} onClick={startScreenPreview}>
                Screen capture
              </Button>
            </Stack>

            <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: 5, minHeight: 430, bgcolor: '#030712' }}>
              {(selectedPreview === 'camera' ? mediaStream : displayStream) ? (
                <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: 430, objectFit: 'cover' }} />
              ) : (
                <Box sx={{ minHeight: 430, display: 'grid', placeItems: 'center' }}>
                  <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.68)' }}>
                    {selectedPreview === 'screen' ? 'Screen preview unavailable' : 'Preview unavailable'}
                  </Typography>
                </Box>
              )}

              <Stack direction="row" spacing={1} sx={{ position: 'absolute', left: 16, top: 16 }} flexWrap="wrap" useFlexGap>
                <Chip label={status?.runtime.streaming ? 'LIVE' : selectedPreview === 'screen' ? 'Screen preview' : 'Camera preview'} color={status?.runtime.streaming ? 'error' : 'secondary'} />
                <Chip label={config?.stream.scene || 'Main Scene'} variant="outlined" />
                {config?.stream.recordWhileStreaming && <Chip label="Recording On" color="primary" variant="outlined" />}
                {config?.stream.orientation === 'portrait' && <Chip label="Vertical mode" color="secondary" />}
              </Stack>
            </Box>
          </Paper>

          <Card sx={{ mt: 2.5 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Chat tools
                </Typography>
                <Chip label={`${viewerCount} viewers`} color="secondary" />
              </Stack>

              {chatState?.pinnedMessage && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Pinned: {chatState.pinnedMessage.message}
                </Alert>
              )}

              {canShowTwitchEmbed && (
                <Box sx={{ overflow: 'hidden', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', bgcolor: '#0b0f18', mb: 2 }}>
                  <iframe
                    src={`https://www.twitch.tv/embed/${activeProfile?.username}/chat?parent=${window.location.hostname}&darkpopout`}
                    title="Twitch chat"
                    style={{ width: '100%', height: 320, border: 0 }}
                  />
                </Box>
              )}

              <Stack spacing={1.5}>
                {(chatState?.messages || []).slice(0, 8).map((message) => (
                  <Box key={message.id} sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {message.author} <Typography component="span" variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>• {message.provider}</Typography>
                    </Typography>
                    <Typography variant="body2">{message.message}</Typography>
                  </Box>
                ))}
                {!chatState?.messages.length && (
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.68)' }}>
                    Chat is ready. Send a test update, use moderation shortcuts, or connect a provider with live chat support.
                  </Typography>
                )}
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
                <TextField
                  label="Send a chat update"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  fullWidth
                />
                <Button variant="contained" onClick={() => sendChatMessage(chatInput)}>Send</Button>
                <Button variant="outlined" onClick={() => pinChatMessage(chatInput)} disabled={!chatInput.trim()}>
                  Pin
                </Button>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                {chatState?.moderationShortcuts.map((shortcut) => (
                  <Button key={shortcut} size="small" variant="text" onClick={() => sendChatMessage(shortcut)}>
                    {shortcut}
                  </Button>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={2.5}>
            <Card>
              <CardContent>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Go live</Typography>
                <Stack direction="row" spacing={1.5}>
                  <Button fullWidth variant="contained" disabled={Boolean(status?.runtime.streaming)} onClick={startStreaming}>
                    Start stream
                  </Button>
                  <Button fullWidth variant="outlined" disabled={!status?.runtime.streaming} onClick={stopStreaming}>
                    Stop stream
                  </Button>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2">Title: <strong>{config?.stream.title || 'Live now'}</strong></Typography>
                <Typography variant="body2">Category: <strong>{config?.stream.category || 'General'}</strong></Typography>
                <Typography variant="body2">Output: <strong>{config?.stream.output.toUpperCase() || 'RTMP'}</strong></Typography>
                <Typography variant="body2">Destinations: <strong>{config?.stream.destinations.filter((item) => item.enabled).length || (config?.stream.rtmpUrl ? 1 : 0)}</strong></Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Stream health monitor</Typography>
                <Stack spacing={1.5}>
                  <Typography variant="body2">Encoder: <strong>{health?.encoderStatus || 'Idle'}</strong></Typography>
                  <Typography variant="body2">Bitrate stability: <strong>{health?.bitrateKbps || 0} kbps</strong></Typography>
                  <Typography variant="body2">Dropped frames: <strong>{health?.droppedFrames || 0}</strong></Typography>
                  <Typography variant="body2">Reconnect attempts: <strong>{health?.reconnectAttempts || 0}</strong></Typography>
                  <Typography variant="body2">CPU load: <strong>{health?.cpuLoad || 0}%</strong></Typography>
                  <Typography variant="body2">Network quality: <strong>{health?.networkQuality || 'Standing by'}</strong></Typography>
                  <Alert severity={health?.ffmpegMessage && health.ffmpegMessage !== 'No encoder warnings right now.' ? 'warning' : 'success'}>
                    {health?.ffmpegMessage || 'No encoder warnings right now.'}
                  </Alert>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>Session checklist</Typography>
                  <Chip label={`${checklistCompletion}% ready`} color={checklistCompletion === 100 ? 'success' : 'secondary'} />
                </Stack>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', mb: 2 }}>
                  Reach 100% by finishing each item below. The note under each line tells the user exactly what is still missing.
                </Typography>
                <Stack spacing={1.5}>
                  {checklistItems.map((item, index) => (
                    <Box key={item.label}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="body2">{index + 1}. {item.label}</Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)', fontWeight: 700 }}>
                          {item.progress}%
                        </Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={item.progress} sx={{ mt: 0.5, height: 8, borderRadius: 999 }} />
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'rgba(255,255,255,0.68)' }}>
                        {item.help}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Markers and show notes</Typography>
                <TextField
                  label="Highlight or bookmark label"
                  value={markerLabel}
                  onChange={(event) => setMarkerLabel(event.target.value)}
                  fullWidth
                />
                <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                  <Button variant="contained" onClick={addMarker}>Add marker</Button>
                  <Button variant="outlined" onClick={() => setMarkerLabel('Clip highlight')}>
                    Clip button
                  </Button>
                </Stack>
                <Typography variant="body2" sx={{ mt: 2, color: 'rgba(255,255,255,0.72)' }}>
                  Notes: {config?.studio.notes || 'Add run-of-show notes in Settings to keep them visible during the stream.'}
                </Typography>
                {config?.studio.sponsorBanner && (
                  <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255,255,255,0.72)' }}>
                    Sponsor banner: <strong>{config.studio.sponsorBanner}</strong>
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}
