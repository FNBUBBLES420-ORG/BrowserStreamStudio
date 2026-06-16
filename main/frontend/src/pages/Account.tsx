import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';

import { apiRequest, openExternalUrl, openProviderAuth } from '../api';
import type { AppConfig, ProviderName } from '../types';

const providers: Array<{
  key: ProviderName;
  title: string;
  color: string;
  description: string;
  createAccountUrl: string;
  createAppUrl: string;
  steps: string[];
}> = [
  {
    key: 'twitch',
    title: 'Twitch',
    color: '#9146ff',
    description: 'Live gaming, coding, and community streams.',
    createAccountUrl: 'https://www.twitch.tv/signup',
    createAppUrl: 'https://dev.twitch.tv/console/apps',
    steps: [
      'Create or sign in to your Twitch account.',
      'Open the Twitch developer console and create an application.',
      'Paste the client ID and client secret into Settings.',
      'Come back here and click Connect.'
    ]
  },
  {
    key: 'youtube',
    title: 'YouTube',
    color: '#ff4d4d',
    description: 'Long-form live streams, recordings, and repurposing.',
    createAccountUrl: 'https://accounts.google.com/signup',
    createAppUrl: 'https://console.cloud.google.com/apis/credentials',
    steps: [
      'Create or sign in to your Google account.',
      'Enable the YouTube Data API in Google Cloud and create OAuth credentials.',
      'Paste the client ID and client secret into Settings.',
      'Come back here and click Connect.'
    ]
  },
  {
    key: 'kick',
    title: 'Kick',
    color: '#53fc18',
    description: 'Alternative creator platform with custom community flows.',
    createAccountUrl: 'https://kick.com/register',
    createAppUrl: 'https://docs.kick.com/getting-started/app-setup',
    steps: [
      'Create or sign in to your Kick account.',
      'Follow Kick’s app setup guide to create your developer app.',
      'Paste the client ID and client secret into Settings.',
      'Come back here and click Connect.'
    ]
  }
];

export default function Account() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<string>('');
  const location = useLocation();

  const authState = useMemo(() => new URLSearchParams(location.search).get('auth'), [location.search]);

  const loadData = async () => {
    try {
      const response = await apiRequest<AppConfig>('/api/app/config');
      setConfig(response);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account settings.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const disconnect = async (provider: ProviderName) => {
    setLoading(provider);
    try {
      await apiRequest('/api/auth/' + provider, { method: 'DELETE' });
      await loadData();
    } finally {
      setLoading('');
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Account connections</Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.72)' }}>
          Configure provider credentials in Settings, then connect the actual channel account here. This keeps setup friendly for end users inside the app.
        </Typography>
      </Box>

      {authState === 'success' && <Alert severity="success">OAuth callback finished. Your provider connection was saved locally.</Alert>}
      {authState === 'failed' && <Alert severity="error">OAuth callback failed. Double-check the client ID, client secret, and redirect URI in Settings.</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2.5}>
        {providers.map((provider) => {
          const providerConfig = config?.providers[provider.key];
          const configured = Boolean(providerConfig?.clientId && providerConfig?.clientSecret);
          const connected = Boolean(providerConfig?.connected);

          return (
            <Grid key={provider.key} size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: '100%', border: '1px solid rgba(255,255,255,0.08)' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: provider.color, color: '#081018', fontWeight: 700 }}>
                        {provider.title[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>{provider.title}</Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                          {provider.description}
                        </Typography>
                      </Box>
                    </Stack>
                    <Chip
                      label={connected ? 'Connected' : configured ? 'Ready to connect' : 'Needs credentials'}
                      color={connected ? 'primary' : configured ? 'secondary' : 'default'}
                      variant={connected ? 'filled' : 'outlined'}
                    />
                  </Stack>

                  {providerConfig?.profile ? (
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)' }}>
                      <Avatar src={providerConfig.profile.avatar || undefined} />
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>{providerConfig.profile.displayName || providerConfig.profile.username}</Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.68)' }}>
                          Connected {providerConfig.connectedAt ? new Date(providerConfig.connectedAt).toLocaleString() : 'recently'}
                        </Typography>
                      </Box>
                    </Stack>
                  ) : (
                    <Typography variant="body2" sx={{ minHeight: 48, color: 'rgba(255,255,255,0.68)' }}>
                      {configured
                        ? 'Credentials are stored. Use the connect button to authorize the actual channel account.'
                        : 'Add the provider client ID and secret in Settings before attempting OAuth.'}
                    </Typography>
                  )}

                  <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>How to set this up</Typography>
                    <Stack spacing={0.5}>
                      {provider.steps.map((step, index) => (
                        <Typography key={step} variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                          {index + 1}. {step}
                        </Typography>
                      ))}
                    </Stack>
                    <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
                      <Button size="small" variant="text" onClick={() => openExternalUrl(provider.createAccountUrl)}>
                        Create account
                      </Button>
                      <Button size="small" variant="text" onClick={() => openExternalUrl(provider.createAppUrl)}>
                        Open app setup
                      </Button>
                    </Stack>
                  </Box>

                  <Stack direction="row" spacing={1.5}>
                    <Button
                      variant="contained"
                      fullWidth
                      disabled={!configured || loading === provider.key}
                      onClick={() => openProviderAuth(provider.key)}
                    >
                      {connected ? 'Reconnect' : 'Connect'}
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      disabled={!connected || loading === provider.key}
                      onClick={() => disconnect(provider.key)}
                    >
                      Disconnect
                    </Button>
                  </Stack>

                  {!configured && (
                    <Button component={Link} to="/settings" variant="text" sx={{ px: 0, alignSelf: 'flex-start' }}>
                      Add credentials in Settings
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}
