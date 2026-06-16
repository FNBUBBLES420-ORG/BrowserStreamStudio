import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';

import { apiRequest, getDesktopPreferences, openExternalUrl, saveDesktopPreferences } from '../api';
import type { AppConfig, DesktopPreferences, ProviderName, StreamDestination } from '../types';

const providerLabels: Record<ProviderName, string> = {
  twitch: 'Twitch',
  youtube: 'YouTube',
  kick: 'Kick'
};

const providerSetup: Record<
  ProviderName,
  {
    accountUrl: string;
    appUrl: string;
    instructions: string[];
  }
> = {
  twitch: {
    accountUrl: 'https://www.twitch.tv/signup',
    appUrl: 'https://dev.twitch.tv/console/apps',
    instructions: [
      'Create or sign in to your Twitch account.',
      'Open the Twitch developer page and create an app.',
      'Copy the client ID and client secret into the boxes below.',
      'Save settings, then go to Accounts and click Connect.'
    ]
  },
  youtube: {
    accountUrl: 'https://accounts.google.com/signup',
    appUrl: 'https://console.cloud.google.com/apis/credentials',
    instructions: [
      'Create or sign in to your Google account.',
      'Turn on the YouTube Data API in Google Cloud.',
      'Create OAuth credentials and copy the client ID and secret here.',
      'Save settings, then go to Accounts and click Connect.'
    ]
  },
  kick: {
    accountUrl: 'https://kick.com/register',
    appUrl: 'https://docs.kick.com/getting-started/app-setup',
    instructions: [
      'Create or sign in to your Kick account.',
      "Follow Kick's app setup guide to create your app.",
      'Copy the client ID and client secret into the boxes below.',
      'Save settings, then go to Accounts and click Connect.'
    ]
  }
};

const scenePresets = [
  'Main Scene',
  'Just Chatting',
  'Gameplay',
  'Coding Session',
  'Break Screen'
] as const;

const streamProviders = [
  { value: 'custom', label: 'Custom RTMP' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'kick', label: 'Kick' }
] as const;

type DeviceOption = {
  deviceId: string;
  label: string;
};

function createDestination(index: number): StreamDestination {
  return {
    id: `destination-${Date.now()}-${index}`,
    provider: 'custom',
    label: `Extra destination ${index + 1}`,
    rtmpUrl: '',
    streamKey: '',
    enabled: true
  };
}

export default function Settings() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [desktopPrefs, setDesktopPrefs] = useState<DesktopPreferences | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [streamKeyNotice, setStreamKeyNotice] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [videoDevices, setVideoDevices] = useState<DeviceOption[]>([]);
  const [audioInputs, setAudioInputs] = useState<DeviceOption[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<DeviceOption[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [configResponse, prefsResponse] = await Promise.all([
          apiRequest<AppConfig>('/api/app/config'),
          getDesktopPreferences()
        ]);
        setConfig(configResponse);
        setDesktopPrefs(prefsResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings.');
      }
    })();
  }, []);

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices?.()
      .then((devices) => {
        setVideoDevices(devices.filter((device) => device.kind === 'videoinput').map((device) => ({ deviceId: device.deviceId, label: device.label || 'Camera' })));
        setAudioInputs(devices.filter((device) => device.kind === 'audioinput').map((device) => ({ deviceId: device.deviceId, label: device.label || 'Microphone' })));
        setAudioOutputs(devices.filter((device) => device.kind === 'audiooutput').map((device) => ({ deviceId: device.deviceId, label: device.label || 'Speakers' })));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!config || config.stream.provider === 'custom') {
      setCategoryOptions([]);
      return;
    }

    setCategoryLoading(true);
    apiRequest<{ provider: string; categories: Array<{ id: string; name: string }> }>(`/api/providers/categories/${config.stream.provider}`)
      .then((response) => {
        setCategoryOptions(response.categories);
      })
      .catch((err) => {
        setCategoryOptions([]);
        setStreamKeyNotice(err instanceof Error ? err.message : 'Unable to load provider categories.');
      })
      .finally(() => setCategoryLoading(false));
  }, [config?.stream.provider]);

  const updateProvider = (provider: ProviderName, field: 'clientId' | 'clientSecret', value: string) => {
    if (!config) {
      return;
    }

    setConfig({
      ...config,
      providers: {
        ...config.providers,
        [provider]: {
          ...config.providers[provider],
          [field]: value
        }
      }
    });
  };

  const applyProviderDefaults = async (provider: ProviderName | 'custom') => {
    if (!config) {
      return;
    }

    try {
      const defaults = await apiRequest<{
        provider: ProviderName | 'custom';
        rtmpUrl: string;
        streamKey: string;
        streamKeyAvailable: boolean;
      }>(`/api/providers/defaults/${provider}`);

      setConfig({
        ...config,
        stream: {
          ...config.stream,
          provider,
          rtmpUrl: defaults.rtmpUrl,
          streamKey: defaults.streamKey || config.stream.streamKey
        }
      });

      if (provider === 'twitch') {
        setStreamKeyNotice(defaults.streamKeyAvailable
          ? 'Twitch RTMP server was filled automatically. The connected channel stream key is available once account-level access is supported.'
          : 'Twitch RTMP server was filled automatically. The stream key still comes from the connected creator account, not just the app credentials.');
      } else if (provider === 'youtube') {
        setStreamKeyNotice("YouTube RTMP server was filled automatically. The stream key comes from the user's YouTube Live stream resource after account setup.");
      } else if (provider === 'kick') {
        setStreamKeyNotice("Kick RTMP server was filled automatically. The creator stream key still needs to come from the user's Kick account.");
      } else {
        setStreamKeyNotice('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load provider defaults.');
    }
  };

  const saveSettings = async () => {
    if (!config) {
      return;
    }

    setSaving(true);
    setStatus('');
    setError('');

    try {
      const savedConfig = await apiRequest<AppConfig>('/api/app/config', {
        method: 'PUT',
        body: JSON.stringify(config)
      });
      setConfig(savedConfig);

      if (desktopPrefs) {
        const savedPrefs = await saveDesktopPreferences(desktopPrefs);
        if (savedPrefs) {
          setDesktopPrefs(savedPrefs);
        }
      }

      setStatus('Settings saved locally. Your stream devices, outputs, notes, and provider setup are now ready inside the app.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const exportSettings = async () => {
    try {
      const backup = await apiRequest<{ exportedAt: string; data: unknown }>('/api/app/export');
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `browserstream-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus('Backup exported.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export backup.');
    }
  };

  const importSettings = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const response = await apiRequest<{ success: boolean; config: AppConfig }>('/api/app/import', {
        method: 'POST',
        body: JSON.stringify(parsed)
      });
      setConfig(response.config);
      setStatus('Backup imported.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import backup.');
    }
  };

  const resetApp = async () => {
    try {
      const response = await apiRequest<{ success: boolean; config: AppConfig }>('/api/app/reset', {
        method: 'POST'
      });
      setConfig(response.config);
      setStatus('App settings reset to safe defaults.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset app.');
    }
  };

  const addDestination = () => {
    if (!config) {
      return;
    }

    setConfig({
      ...config,
      stream: {
        ...config.stream,
        destinations: [...config.stream.destinations, createDestination(config.stream.destinations.length)]
      }
    });
  };

  const updateDestination = (destinationId: string, patch: Partial<StreamDestination>) => {
    if (!config) {
      return;
    }

    setConfig({
      ...config,
      stream: {
        ...config.stream,
        destinations: config.stream.destinations.map((destination) => destination.id === destinationId ? { ...destination, ...patch } : destination)
      }
    });
  };

  const removeDestination = (destinationId: string) => {
    if (!config) {
      return;
    }

    setConfig({
      ...config,
      stream: {
        ...config.stream,
        destinations: config.stream.destinations.filter((destination) => destination.id !== destinationId)
      }
    });
  };

  const uploadLabel = useMemo(() => 'Import backup', []);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Settings</Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.72)' }}>
          This is the command center for stream quality, devices, multi-stream outputs, provider setup, desktop behavior, backups, recovery, and creator notes.
        </Typography>
      </Box>

      {status && <Alert severity="success">{status}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {streamKeyNotice && <Alert severity="info">{streamKeyNotice}</Alert>}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Stream destination and quality</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Resolution"
                    value={config?.stream.resolution || '1920x1080'}
                    onChange={(event) => config && setConfig({ ...config, stream: { ...config.stream, resolution: event.target.value } })}
                  >
                    <MenuItem value="1920x1080">1920x1080</MenuItem>
                    <MenuItem value="1280x720">1280x720</MenuItem>
                    <MenuItem value="854x480">854x480</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    type="number"
                    fullWidth
                    label="Bitrate (kbps)"
                    value={config?.stream.bitrate || 4500}
                    onChange={(event) => config && setConfig({ ...config, stream: { ...config.stream, bitrate: Number(event.target.value) } })}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Output type"
                    value={config?.stream.output || 'rtmp'}
                    onChange={(event) => config && setConfig({ ...config, stream: { ...config.stream, output: event.target.value as 'rtmp' | 'hls' } })}
                  >
                    <MenuItem value="rtmp">RTMP</MenuItem>
                    <MenuItem value="hls">HLS</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Scene preset"
                    value={config?.stream.scene || 'Main Scene'}
                    onChange={(event) => config && setConfig({ ...config, stream: { ...config.stream, scene: event.target.value } })}
                  >
                    {scenePresets.map((preset) => (
                      <MenuItem key={preset} value={preset}>{preset}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Quality preset"
                    value={config?.stream.qualityPreset || 'Balanced'}
                    onChange={(event) => config && setConfig({ ...config, stream: { ...config.stream, qualityPreset: event.target.value as AppConfig['stream']['qualityPreset'] } })}
                  >
                    <MenuItem value="Performance">Performance</MenuItem>
                    <MenuItem value="Balanced">Balanced</MenuItem>
                    <MenuItem value="Quality">Quality</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Layout mode"
                    value={config?.stream.orientation || 'landscape'}
                    onChange={(event) => config && setConfig({ ...config, stream: { ...config.stream, orientation: event.target.value as 'landscape' | 'portrait' } })}
                  >
                    <MenuItem value="landscape">Landscape</MenuItem>
                    <MenuItem value="portrait">Portrait / vertical</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Stream provider"
                    value={config?.stream.provider || 'custom'}
                    onChange={(event) => applyProviderDefaults(event.target.value as ProviderName | 'custom')}
                  >
                    {streamProviders.map((provider) => (
                      <MenuItem key={provider.value} value={provider.value}>{provider.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="RTMP server URL"
                    placeholder="rtmp://live.twitch.tv/app"
                    value={config?.stream.rtmpUrl || ''}
                    onChange={(event) => config && setConfig({ ...config, stream: { ...config.stream, rtmpUrl: event.target.value } })}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Stream key"
                    type="password"
                    value={config?.stream.streamKey || ''}
                    onChange={(event) => config && setConfig({ ...config, stream: { ...config.stream, streamKey: event.target.value } })}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Stream title"
                    value={config?.stream.title || ''}
                    onChange={(event) => config && setConfig({ ...config, stream: { ...config.stream, title: event.target.value } })}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Autocomplete
                    options={categoryOptions}
                    getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                    loading={categoryLoading}
                    value={categoryOptions.find((option) => option.name === (config?.stream.category || '')) || null}
                    onChange={(event, value) => config && setConfig({ ...config, stream: { ...config.stream, category: value?.name || '' } })}
                    onInputChange={(event, value, reason) => {
                      if (!config || config.stream.provider === 'custom' || reason === 'reset') {
                        return;
                      }

                      setCategoryLoading(true);
                      apiRequest<{ provider: string; categories: Array<{ id: string; name: string }> }>(
                        `/api/providers/categories/${config.stream.provider}?q=${encodeURIComponent(value)}`
                      )
                        .then((response) => setCategoryOptions(response.categories))
                        .catch(() => setCategoryOptions([]))
                        .finally(() => setCategoryLoading(false));
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Category"
                        placeholder={config?.stream.provider === 'custom' ? 'Choose a provider to fetch live categories' : 'Search provider categories'}
                      />
                    )}
                    freeSolo={config?.stream.provider === 'custom'}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Recording path"
                    placeholder="C:\\Streams\\Recordings"
                    value={config?.stream.outputPath || ''}
                    onChange={(event) => config && setConfig({ ...config, stream: { ...config.stream, outputPath: event.target.value } })}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Extra live destinations</Typography>
              <Stack spacing={2}>
                {config?.stream.destinations.map((destination) => (
                  <Box key={destination.id} sx={{ p: 2, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.03)' }}>
                    <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
                      <TextField
                        label="Label"
                        value={destination.label}
                        onChange={(event) => updateDestination(destination.id, { label: event.target.value })}
                        fullWidth
                      />
                      <TextField
                        select
                        label="Provider"
                        value={destination.provider}
                        onChange={(event) => updateDestination(destination.id, { provider: event.target.value as StreamDestination['provider'] })}
                        sx={{ minWidth: 180 }}
                      >
                        {streamProviders.map((provider) => (
                          <MenuItem key={provider.value} value={provider.value}>{provider.label}</MenuItem>
                        ))}
                      </TextField>
                    </Stack>
                    <Stack spacing={1.5}>
                      <TextField
                        label="RTMP URL"
                        value={destination.rtmpUrl}
                        onChange={(event) => updateDestination(destination.id, { rtmpUrl: event.target.value })}
                        fullWidth
                      />
                      <TextField
                        label="Stream key"
                        type="password"
                        value={destination.streamKey}
                        onChange={(event) => updateDestination(destination.id, { streamKey: event.target.value })}
                        fullWidth
                      />
                      <Stack direction="row" spacing={1.5}>
                        <FormControlLabel
                          control={<Switch checked={destination.enabled} onChange={(event) => updateDestination(destination.id, { enabled: event.target.checked })} />}
                          label="Enabled"
                        />
                        <Button color="error" variant="text" onClick={() => removeDestination(destination.id)}>Remove</Button>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
                <Button variant="outlined" onClick={addDestination}>Add extra destination</Button>
              </Stack>

              <Divider sx={{ my: 3 }} />

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <FormControlLabel
                  control={<Switch checked={Boolean(config?.stream.recordWhileStreaming)} onChange={(event) => config && setConfig({ ...config, stream: { ...config.stream, recordWhileStreaming: event.target.checked } })} />}
                  label="Record locally while live"
                />
                <FormControlLabel
                  control={<Switch checked={Boolean(config?.stream.micEnabled)} onChange={(event) => config && setConfig({ ...config, stream: { ...config.stream, micEnabled: event.target.checked } })} />}
                  label="Mic enabled"
                />
                <FormControlLabel
                  control={<Switch checked={Boolean(config?.stream.systemAudioEnabled)} onChange={(event) => config && setConfig({ ...config, stream: { ...config.stream, systemAudioEnabled: event.target.checked } })} />}
                  label="System audio"
                />
                <FormControlLabel
                  control={<Switch checked={Boolean(config?.stream.chatDockEnabled)} onChange={(event) => config && setConfig({ ...config, stream: { ...config.stream, chatDockEnabled: event.target.checked } })} />}
                  label="Chat dock"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2.5}>
            <Card>
              <CardContent>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Device selector and audio mixer</Typography>
                <Stack spacing={2}>
                  <TextField
                    select
                    fullWidth
                    label="Camera"
                    value={config?.stream.videoDeviceId || ''}
                    onChange={(event) => config && setConfig({ ...config, stream: { ...config.stream, videoDeviceId: event.target.value } })}
                  >
                    <MenuItem value="">Default camera</MenuItem>
                    {videoDevices.map((device) => (
                      <MenuItem key={device.deviceId} value={device.deviceId}>{device.label}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    fullWidth
                    label="Microphone"
                    value={config?.stream.audioInputDeviceId || ''}
                    onChange={(event) => config && setConfig({ ...config, stream: { ...config.stream, audioInputDeviceId: event.target.value } })}
                  >
                    <MenuItem value="">Default microphone</MenuItem>
                    {audioInputs.map((device) => (
                      <MenuItem key={device.deviceId} value={device.deviceId}>{device.label}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    fullWidth
                    label="Speakers"
                    value={config?.stream.audioOutputDeviceId || ''}
                    onChange={(event) => config && setConfig({ ...config, stream: { ...config.stream, audioOutputDeviceId: event.target.value } })}
                  >
                    <MenuItem value="">Default speakers</MenuItem>
                    {audioOutputs.map((device) => (
                      <MenuItem key={device.deviceId} value={device.deviceId}>{device.label}</MenuItem>
                    ))}
                  </TextField>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>Mic volume</Typography>
                    <Slider value={config?.stream.micVolume || 0} onChange={(_, value) => config && setConfig({ ...config, stream: { ...config.stream, micVolume: Number(value) } })} />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>System audio volume</Typography>
                    <Slider value={config?.stream.systemVolume || 0} onChange={(_, value) => config && setConfig({ ...config, stream: { ...config.stream, systemVolume: Number(value) } })} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Desktop behavior and recovery</Typography>
                <Stack spacing={1}>
                  <FormControlLabel
                    control={<Switch checked={Boolean(desktopPrefs?.closeToTray)} onChange={(event) => desktopPrefs && setDesktopPrefs({ ...desktopPrefs, closeToTray: event.target.checked })} />}
                    label="Close to tray"
                  />
                  <FormControlLabel
                    control={<Switch checked={Boolean(desktopPrefs?.minimizeToTray)} onChange={(event) => desktopPrefs && setDesktopPrefs({ ...desktopPrefs, minimizeToTray: event.target.checked })} />}
                    label="Minimize to tray"
                  />
                  <FormControlLabel
                    control={<Switch checked={Boolean(desktopPrefs?.launchOnStartup)} onChange={(event) => desktopPrefs && setDesktopPrefs({ ...desktopPrefs, launchOnStartup: event.target.checked })} />}
                    label="Launch on startup"
                  />
                  <FormControlLabel
                    control={<Switch checked={Boolean(config?.desktop.checkDependenciesOnLaunch)} onChange={(event) => config && setConfig({ ...config, desktop: { ...config.desktop, checkDependenciesOnLaunch: event.target.checked } })} />}
                    label="Check dependencies on launch"
                  />
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Creator extras</Typography>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Run-of-show notes"
                    value={config?.studio.notes || ''}
                    onChange={(event) => config && setConfig({ ...config, studio: { ...config.studio, notes: event.target.value } })}
                    multiline
                    minRows={4}
                  />
                  <TextField
                    fullWidth
                    label="Sponsor banner text"
                    value={config?.studio.sponsorBanner || ''}
                    onChange={(event) => config && setConfig({ ...config, studio: { ...config.studio, sponsorBanner: event.target.value } })}
                  />
                  <TextField
                    fullWidth
                    label="Branded overlay pack name"
                    value={config?.studio.brandedOverlayName || ''}
                    onChange={(event) => config && setConfig({ ...config, studio: { ...config.studio, brandedOverlayName: event.target.value } })}
                  />
                  <TextField
                    fullWidth
                    label="Donation or alert link"
                    value={config?.studio.donationUrl || ''}
                    onChange={(event) => config && setConfig({ ...config, studio: { ...config.studio, donationUrl: event.target.value } })}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Provider credentials</Typography>
          <Stack spacing={2}>
            {(['twitch', 'youtube', 'kick'] as ProviderName[]).map((provider) => (
              <Box key={provider} sx={{ p: 2, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.03)' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{providerLabels[provider]}</Typography>
                <Stack spacing={1.5}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                    Set up {providerLabels[provider]} in 4 quick steps:
                  </Typography>
                  {providerSetup[provider].instructions.map((step, index) => (
                    <Typography key={step} variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                      {index + 1}. {step}
                    </Typography>
                  ))}
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button size="small" variant="text" onClick={() => openExternalUrl(providerSetup[provider].accountUrl)}>
                      Create account
                    </Button>
                    <Button size="small" variant="text" onClick={() => openExternalUrl(providerSetup[provider].appUrl)}>
                      Open app setup
                    </Button>
                  </Stack>
                  <TextField
                    fullWidth
                    label={`${providerLabels[provider]} client ID`}
                    value={config?.providers[provider].clientId || ''}
                    onChange={(event) => updateProvider(provider, 'clientId', event.target.value)}
                  />
                  <TextField
                    fullWidth
                    type="password"
                    label={`${providerLabels[provider]} client secret`}
                    value={config?.providers[provider].clientSecret || ''}
                    onChange={(event) => updateProvider(provider, 'clientSecret', event.target.value)}
                  />
                </Stack>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Backup, restore, and reset</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
            <Button variant="contained" onClick={exportSettings}>
              Export backup
            </Button>
            <Button component="label" variant="outlined">
              {uploadLabel}
              <input hidden type="file" accept="application/json" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  importSettings(file);
                }
              }} />
            </Button>
            <Button color="error" variant="outlined" onClick={resetApp}>
              Reset to safe defaults
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction="row" spacing={2}>
        <Button variant="contained" size="large" onClick={saveSettings} disabled={saving || !config}>
          {saving ? 'Saving...' : 'Save settings'}
        </Button>
        <Button variant="outlined" size="large" onClick={() => window.location.hash = '#/account'}>
          Go to account connections
        </Button>
      </Stack>
    </Stack>
  );
}
