import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';

import { apiRequest } from '../api';
import type { SchedulerConfig } from '../types';

const fallbackScheduler: SchedulerConfig = {
  enabled: false,
  scheduledFor: '',
  countdownSeconds: 300,
  autoStart: false,
  autoApplyTitle: true,
  autoApplyCategory: true,
  title: 'Live now',
  category: 'Software and Game Development',
  checklistReminder: true
};

export default function Scheduler() {
  const [scheduler, setScheduler] = useState<SchedulerConfig>(fallbackScheduler);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest<SchedulerConfig>('/api/scheduler')
      .then(setScheduler)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load scheduler.'));
  }, []);

  const saveScheduler = async () => {
    try {
      const response = await apiRequest<SchedulerConfig>('/api/scheduler', {
        method: 'PUT',
        body: JSON.stringify(scheduler)
      });
      setScheduler(response);
      setStatus('Stream scheduler saved. Your launch timing and automatic title/category plan are ready.');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scheduler.');
    }
  };

  const countdownLabel = useMemo(() => {
    const minutes = Math.floor(scheduler.countdownSeconds / 60);
    const seconds = scheduler.countdownSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }, [scheduler.countdownSeconds]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Stream scheduler</Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.72)' }}>
          Plan a go-live time, prepare a countdown, and automatically switch the stream title and category before showtime.
        </Typography>
      </Box>

      {status && <Alert severity="success">{status}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Launch plan</Typography>
              <Stack spacing={2}>
                <FormControlLabel
                  control={<Switch checked={scheduler.enabled} onChange={(event) => setScheduler({ ...scheduler, enabled: event.target.checked })} />}
                  label="Enable scheduler"
                />
                <TextField
                  label="Go live at"
                  type="datetime-local"
                  value={scheduler.scheduledFor}
                  onChange={(event) => setScheduler({ ...scheduler, scheduledFor: event.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="Countdown length (seconds)"
                  type="number"
                  value={scheduler.countdownSeconds}
                  onChange={(event) => setScheduler({ ...scheduler, countdownSeconds: Number(event.target.value) })}
                  fullWidth
                />
                <Alert severity="info">Current countdown preset: {countdownLabel}</Alert>
                <FormControlLabel
                  control={<Switch checked={scheduler.autoStart} onChange={(event) => setScheduler({ ...scheduler, autoStart: event.target.checked })} />}
                  label="Auto-start stream when schedule is reached"
                />
                <FormControlLabel
                  control={<Switch checked={scheduler.checklistReminder} onChange={(event) => setScheduler({ ...scheduler, checklistReminder: event.target.checked })} />}
                  label="Show a reminder to complete the stream checklist first"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Auto metadata</Typography>
              <Stack spacing={2}>
                <TextField
                  label="Scheduled title"
                  value={scheduler.title}
                  onChange={(event) => setScheduler({ ...scheduler, title: event.target.value })}
                  fullWidth
                />
                <TextField
                  label="Scheduled category"
                  value={scheduler.category}
                  onChange={(event) => setScheduler({ ...scheduler, category: event.target.value })}
                  fullWidth
                />
                <FormControlLabel
                  control={<Switch checked={scheduler.autoApplyTitle} onChange={(event) => setScheduler({ ...scheduler, autoApplyTitle: event.target.checked })} />}
                  label="Apply title automatically"
                />
                <FormControlLabel
                  control={<Switch checked={scheduler.autoApplyCategory} onChange={(event) => setScheduler({ ...scheduler, autoApplyCategory: event.target.checked })} />}
                  label="Apply category automatically"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1.5}>
        <Button variant="contained" onClick={saveScheduler}>Save schedule</Button>
        <Button variant="outlined" onClick={() => setScheduler(fallbackScheduler)}>Reset form</Button>
      </Stack>
    </Stack>
  );
}
