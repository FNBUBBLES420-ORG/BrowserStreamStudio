import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Typography
} from '@mui/material';
import { Link } from 'react-router-dom';

import { apiRequest, checkForDesktopUpdates } from '../api';
import type { AppConfig, AppStatus, UpdateCheck } from '../types';

export default function Home() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheck | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [configResponse, statusResponse, updateResponse] = await Promise.all([
          apiRequest<AppConfig>('/api/app/config'),
          apiRequest<AppStatus>('/api/app/status'),
          checkForDesktopUpdates()
        ]);
        setConfig(configResponse);
        setStatus(statusResponse);
        setUpdateInfo(updateResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
      }
    })();
  }, []);

  const configuredProviders = status?.providers.filter((provider) => provider.configured).length || 0;
  const connectedProviders = status?.providers.filter((provider) => provider.connected).length || 0;
  const setupProgress = [
    status?.checks.ffmpegAvailable,
    status?.checks.hasStreamTarget,
    configuredProviders > 0,
    connectedProviders > 0
  ].filter(Boolean).length;

  const sessionAnalytics = useMemo(() => config?.studio.analytics?.[0] || null, [config]);

  return (
    <Stack spacing={3}>
      <Box sx={{ p: 4, borderRadius: 6, background: 'linear-gradient(135deg, rgba(255,122,89,0.24), rgba(255,209,102,0.12) 46%, rgba(36,24,47,0.85) 100%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 80px rgba(15, 6, 22, 0.36)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Box>
            <Typography variant="overline" sx={{ letterSpacing: 2, color: 'primary.main' }}>
              Welcome
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
              Build, schedule, and run your stream in one place
            </Typography>
            <Typography variant="body1" sx={{ maxWidth: 720, color: 'rgba(255,255,255,0.74)' }}>
              Use the wizard for first-time setup, build scenes for different moments, schedule your next go-live, and keep recordings, plugins, and chat tools inside the desktop app.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Button component={Link} to="/wizard" variant="contained" size="large">Start wizard</Button>
            <Button component={Link} to="/stream" variant="outlined" size="large">Open studio</Button>
          </Stack>
        </Stack>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ height: '100%', background: 'linear-gradient(180deg, rgba(43,28,56,0.96), rgba(31,20,41,0.96))' }}>
            <CardContent>
              <Typography variant="overline">Setup Progress</Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>{setupProgress}/4</Typography>
              <LinearProgress value={(setupProgress / 4) * 100} variant="determinate" sx={{ height: 10, borderRadius: 999 }} />
              <Typography variant="body2" sx={{ mt: 2, color: 'rgba(255,255,255,0.72)' }}>
                FFmpeg, destination, credentials, and connected account are the four release blockers.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ height: '100%', background: 'linear-gradient(180deg, rgba(43,28,56,0.96), rgba(31,20,41,0.96))' }}>
            <CardContent>
              <Typography variant="overline">Scenes</Typography>
              <Typography variant="h3" sx={{ fontWeight: 800 }}>{status?.scenes?.total || config?.scenes.length || 0}</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                active scene: {status?.scenes?.active || config?.stream.scene || 'Main Scene'}
              </Typography>
              <Button component={Link} to="/scenes" variant="text" sx={{ mt: 2, px: 0 }}>
                Manage scenes
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ height: '100%', background: 'linear-gradient(180deg, rgba(43,28,56,0.96), rgba(31,20,41,0.96))' }}>
            <CardContent>
              <Typography variant="overline">Scheduler</Typography>
              <Typography variant="h3" sx={{ fontWeight: 800 }}>{config?.scheduler.enabled ? 'On' : 'Off'}</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                {config?.scheduler.scheduledFor ? `Next launch: ${config.scheduler.scheduledFor}` : 'No go-live time planned yet'}
              </Typography>
              <Button component={Link} to="/scheduler" variant="text" sx={{ mt: 2, px: 0 }}>
                Open scheduler
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ height: '100%', background: 'linear-gradient(180deg, rgba(43,28,56,0.96), rgba(31,20,41,0.96))' }}>
            <CardContent>
              <Typography variant="overline">Desktop updates</Typography>
              <Typography variant="h3" sx={{ fontWeight: 800 }}>{updateInfo?.currentVersion || 'App'}</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                {updateInfo?.message || 'Update check works inside the packaged desktop app.'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ background: 'linear-gradient(180deg, rgba(43,28,56,0.96), rgba(31,20,41,0.96))' }}>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>What to do next</Typography>
              <Stack spacing={1.25}>
                <Alert severity={status?.checks.ffmpegAvailable ? 'success' : 'warning'}>
                  {status?.checks.ffmpegAvailable ? 'Video tools were found automatically and are ready to use.' : 'The app could not find the video tools it needs yet. Add them before going live.'}
                </Alert>
                <Alert severity={status?.checks.hasStreamTarget ? 'success' : 'info'}>
                  {status?.checks.hasStreamTarget ? 'Your stream destination is set, including extra outputs if you added them.' : 'Open Settings and choose where your stream should be sent.'}
                </Alert>
                <Alert severity={configuredProviders > 0 ? 'success' : 'info'}>
                  {configuredProviders > 0 ? 'At least one streaming service has been added.' : 'Open Settings and add Twitch, YouTube, or Kick details.'}
                </Alert>
                <Alert severity={connectedProviders > 0 ? 'success' : 'info'}>
                  {connectedProviders > 0 ? 'A streaming account is connected and ready.' : 'Open Accounts and sign in after adding your service details.'}
                </Alert>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%', background: 'linear-gradient(180deg, rgba(43,28,56,0.96), rgba(31,20,41,0.96))' }}>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Creator tools snapshot</Typography>
              <Stack spacing={1.5}>
                <Typography variant="body2">Connected accounts: <strong>{connectedProviders}</strong></Typography>
                <Typography variant="body2">Destinations: <strong>{config?.stream.destinations.filter((item) => item.enabled).length || 0}</strong></Typography>
                <Typography variant="body2">Chat messages ready: <strong>{config?.chat.messages.length || 0}</strong></Typography>
                <Typography variant="body2">Plugin catalog: <strong>{status?.pluginCount || 0}</strong></Typography>
                <Typography variant="body2">Last branded overlay: <strong>{config?.studio.brandedOverlayName || 'Not set'}</strong></Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%', background: 'linear-gradient(180deg, rgba(43,28,56,0.96), rgba(31,20,41,0.96))' }}>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Recent notifications</Typography>
              <Stack spacing={1}>
                {(status?.notifications || config?.studio.notifications || []).slice(0, 5).map((notification) => (
                  <Alert key={notification.id} severity={notification.type === 'error' ? 'error' : notification.type === 'success' ? 'success' : 'info'}>
                    {notification.message}
                  </Alert>
                ))}
                {!((status?.notifications || config?.studio.notifications || []).length) && (
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                    No alerts right now. This area will warn users about missing FFmpeg, disconnected accounts, and stream issues.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%', background: 'linear-gradient(180deg, rgba(43,28,56,0.96), rgba(31,20,41,0.96))' }}>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Latest session</Typography>
              {sessionAnalytics ? (
                <Stack spacing={1.25}>
                  <Typography variant="body2">Title: <strong>{String(sessionAnalytics.title || 'Untitled')}</strong></Typography>
                  <Typography variant="body2">Category: <strong>{String(sessionAnalytics.category || 'General')}</strong></Typography>
                  <Typography variant="body2">Scene: <strong>{String(sessionAnalytics.scene || 'Main Scene')}</strong></Typography>
                  <Typography variant="body2">Destinations: <strong>{String(sessionAnalytics.destinations || 1)}</strong></Typography>
                  <Typography variant="body2">Status: <strong>{String(sessionAnalytics.status || 'unknown')}</strong></Typography>
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                  No completed sessions yet. Once you start and stop a stream, the app will keep simple session history here.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
