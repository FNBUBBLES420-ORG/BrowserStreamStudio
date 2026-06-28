import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';

import { apiRequest } from '../api';
import type { Plugin } from '../types';

type Template = {
  name: string;
  code: string;
};

const defaultPlugin: Plugin = {
  name: '',
  code: '',
  description: '',
  version: '1.0.0',
  permissions: ['overlay'],
  trusted: false,
  category: 'Utility',
  enabled: true,
  createdAt: '',
  lastRunAt: '',
  permissionLevel: 'sandboxed'
};

const pluginExample = 'setOutput({"title":"Starting soon","overlayText":"Welcome to the stream","countdownSeconds":30,"status":"ready"});';

export default function Plugins() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [logs, setLogs] = useState<Array<{ id: string; plugin: string; status: string; output?: unknown; error?: string; createdAt: string }>>([]);
  const [draft, setDraft] = useState<Plugin>(defaultPlugin);
  const [message, setMessage] = useState('');

  const refresh = async () => {
    const [pluginsResponse, templatesResponse, logsResponse] = await Promise.all([
      apiRequest<Plugin[]>('/api/plugins'),
      apiRequest<Template[]>('/api/plugins/templates'),
      apiRequest<Array<{ id: string; plugin: string; status: string; output?: unknown; error?: string; createdAt: string }>>('/api/runtime/logs')
    ]);
    setPlugins(pluginsResponse);
    setTemplates(templatesResponse);
    setLogs(logsResponse);
  };

  useEffect(() => {
    refresh().catch((err) => setMessage(err instanceof Error ? err.message : 'Failed to load plugins.'));
  }, []);

  const savePlugin = async () => {
    await apiRequest('/api/plugins/install', {
      method: 'POST',
      body: JSON.stringify(draft)
    });
    setDraft(defaultPlugin);
    setMessage('Plugin saved.');
    await refresh();
  };

  const togglePlugin = async (plugin: Plugin) => {
    await apiRequest(`/api/plugins/${encodeURIComponent(plugin.name)}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !plugin.enabled })
    });
    await refresh();
  };

  const removePlugin = async (pluginName: string) => {
    await apiRequest(`/api/plugins/${encodeURIComponent(pluginName)}`, { method: 'DELETE' });
    await refresh();
  };

  const runPlugin = async (pluginName: string) => {
    try {
      const result = await apiRequest<{ output: unknown }>('/api/plugins/execute', {
        method: 'POST',
        body: JSON.stringify({ name: pluginName, input: {} })
      });
      setMessage(`Plugin "${pluginName}" returned ${JSON.stringify(result.output)}`);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Plugin execution failed.');
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Plugin marketplace</Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.72)' }}>
          Manage plugin cards with descriptions, versions, trust labels, and permissions so add-ons feel more like a polished marketplace than a code dump.
        </Typography>
      </Box>

      {message && <Alert severity="info">{message}</Alert>}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Create or update plugin</Typography>
              <Stack spacing={2}>
                <TextField label="Plugin name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} fullWidth />
                <TextField label="Description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} fullWidth />
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                  <TextField label="Version" value={draft.version} onChange={(event) => setDraft({ ...draft, version: event.target.value })} fullWidth />
                  <TextField label="Category" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} fullWidth />
                </Stack>
                <TextField
                  label="Permissions"
                  value={draft.permissions.join(', ')}
                  onChange={(event) => setDraft({ ...draft, permissions: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })}
                  fullWidth
                  helperText="Examples: overlay, notes, chat"
                />
                <TextField
                  label="Plugin code"
                  value={draft.code}
                  onChange={(event) => setDraft({ ...draft, code: event.target.value })}
                  multiline
                  minRows={10}
                  fullWidth
                  placeholder={pluginExample}
                  helperText={'Trusted plugins can return data only through a single setOutput(JSON) call. Example: setOutput({"title":"Starting soon","countdownSeconds":30});'}
                />
                <Box sx={{ p: 2, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Example plugin code
                  </Typography>
                  <Typography
                    component="pre"
                    sx={{
                      m: 0,
                      whiteSpace: 'pre-wrap',
                      fontFamily: '"Cascadia Code","Consolas","Courier New",monospace',
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.82)'
                    }}
                  >
                    {pluginExample}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Switch checked={draft.trusted} onChange={(event) => setDraft({ ...draft, trusted: event.target.checked })} />
                  <Typography variant="body2">Mark as trusted plugin (required to run)</Typography>
                </Stack>
                <Stack direction="row" spacing={1.5}>
                  <Button variant="contained" onClick={savePlugin} disabled={!draft.name || !draft.code}>Save plugin</Button>
                  <Button variant="outlined" onClick={() => setDraft(defaultPlugin)}>Clear</Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Starter templates</Typography>
              <Stack spacing={1.5}>
                {templates.map((template) => (
                  <Box key={template.name} sx={{ p: 2, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.03)' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{template.name}</Typography>
                    <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255,255,255,0.68)' }}>{template.code}</Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setDraft({
                        ...defaultPlugin,
                        name: template.name,
                        description: 'Starter template',
                        code: template.code
                      })}
                    >
                      Use template
                    </Button>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Grid container spacing={2}>
            {plugins.map((plugin) => (
              <Grid key={plugin.name} size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>{plugin.name}</Typography>
                        <Chip size="small" label={plugin.enabled ? 'Enabled' : 'Disabled'} color={plugin.enabled ? 'primary' : 'default'} />
                      </Stack>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                        {plugin.description || 'No description added yet.'}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip size="small" label={`v${plugin.version}`} variant="outlined" />
                        <Chip size="small" label={plugin.category} variant="outlined" />
                        <Chip size="small" label={plugin.trusted ? 'Trusted' : 'Community'} color={plugin.trusted ? 'success' : 'secondary'} />
                      </Stack>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.62)' }}>
                        Permissions: {plugin.permissions.join(', ')} • Last run: {plugin.lastRunAt ? new Date(plugin.lastRunAt).toLocaleString() : 'never'}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Switch checked={plugin.enabled} onChange={() => togglePlugin(plugin)} />
                        <Button size="small" variant="outlined" onClick={() => runPlugin(plugin.name)}>Run</Button>
                        <Button size="small" color="error" variant="text" onClick={() => removePlugin(plugin.name)}>Remove</Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Recent plugin logs</Typography>
              <Stack spacing={1.5}>
                {logs.map((log) => (
                  <Box key={log.id} sx={{ p: 2, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.03)' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{log.plugin}</Typography>
                      <Chip size="small" label={log.status} color={log.status === 'success' ? 'primary' : 'error'} />
                    </Stack>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'rgba(255,255,255,0.62)' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </Typography>
                    <Typography variant="body2">
                      {log.error || JSON.stringify(log.output)}
                    </Typography>
                  </Box>
                ))}
                {logs.length === 0 && <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.68)' }}>No plugin activity yet.</Typography>}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
