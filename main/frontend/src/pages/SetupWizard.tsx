import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography
} from '@mui/material';
import { Link } from 'react-router-dom';

import { apiRequest } from '../api';
import type { AppStatus } from '../types';

type WizardResponse = {
  wizard: {
    completedSteps: string[];
    lastCompletedAt: string;
    dismissed: boolean;
  };
  steps: Array<{
    id: string;
    label: string;
    complete: boolean;
  }>;
};

export default function SetupWizard() {
  const [wizard, setWizard] = useState<WizardResponse | null>(null);
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [devicesReady, setDevicesReady] = useState(false);
  const [message, setMessage] = useState('');

  const loadWizard = async () => {
    const [wizardResponse, statusResponse] = await Promise.all([
      apiRequest<WizardResponse>('/api/setup/wizard'),
      apiRequest<AppStatus>('/api/app/status')
    ]);
    setWizard(wizardResponse);
    setStatus(statusResponse);
  };

  useEffect(() => {
    loadWizard().catch((err) => setMessage(err instanceof Error ? err.message : 'Failed to load setup wizard.'));
  }, []);

  const markComplete = async (step: string) => {
    await apiRequest('/api/setup/wizard/complete', {
      method: 'POST',
      body: JSON.stringify({ step })
    });
    await loadWizard();
    setMessage('Setup progress saved.');
  };

  const testDevices = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setDevicesReady(true);
      await markComplete('devices');
    } catch {
      setMessage('Camera or mic access was blocked. Allow permissions and try again.');
    }
  };

  const completion = useMemo(() => {
    if (!wizard?.steps.length) {
      return 0;
    }

    return Math.round((wizard.steps.filter((step) => step.complete).length / wizard.steps.length) * 100);
  }, [wizard]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>First-run setup wizard</Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.72)' }}>
          This guided setup walks the user through FFmpeg, account details, connected channels, stream destination, and a real camera/mic test.
        </Typography>
      </Box>

      {message && <Alert severity="info">{message}</Alert>}

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>Setup progress</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                Finish each step once and the app will feel ready for a non-technical end user.
              </Typography>
            </Box>
            <Chip label={`${completion}% complete`} color={completion === 100 ? 'success' : 'secondary'} />
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2.5}>
        {wizard?.steps.map((step) => (
          <Grid key={step.id} size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{step.label}</Typography>
                    <Chip label={step.complete ? 'Done' : 'Needs action'} color={step.complete ? 'success' : 'default'} />
                  </Stack>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                    {step.id === 'ffmpeg' && 'Make sure the app can find the bundled or installed FFmpeg tools.'}
                    {step.id === 'credentials' && 'Add at least one provider client ID and secret in Settings.'}
                    {step.id === 'accounts' && 'Connect a Twitch, YouTube, or Kick channel account from the Accounts page.'}
                    {step.id === 'target' && 'Choose the stream destination, stream key, or HLS output in Settings.'}
                    {step.id === 'devices' && 'Test camera and microphone permissions from inside the app.'}
                  </Typography>
                  <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                    {step.id === 'credentials' && <Button component={Link} to="/settings" variant="contained">Open settings</Button>}
                    {step.id === 'accounts' && <Button component={Link} to="/account" variant="contained">Open accounts</Button>}
                    {step.id === 'target' && <Button component={Link} to="/settings" variant="contained">Set destination</Button>}
                    {step.id === 'ffmpeg' && (
                      <Button variant="contained" onClick={() => markComplete('ffmpeg')} disabled={!status?.checks.ffmpegAvailable}>
                        {status?.checks.ffmpegAvailable ? 'Mark complete' : 'Waiting for FFmpeg'}
                      </Button>
                    )}
                    {step.id === 'devices' && (
                      <Button variant="contained" onClick={testDevices}>
                        {devicesReady || step.complete ? 'Test passed' : 'Test camera and mic'}
                      </Button>
                    )}
                    {step.id !== 'devices' && step.id !== 'ffmpeg' && (
                      <Button variant="outlined" onClick={() => markComplete(step.id)} disabled={step.complete}>
                        Save progress
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
