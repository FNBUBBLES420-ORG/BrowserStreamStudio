import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';

import { apiRequest } from '../api';
import type { Scene, SceneSource } from '../types';

const sourceTypes: SceneSource['type'][] = ['webcam', 'screen', 'window', 'image', 'text', 'browser'];

function createScene(index: number): Scene {
  const now = new Date().toISOString();
  return {
    id: `scene-${Date.now()}-${index}`,
    name: `Scene ${index + 1}`,
    type: 'live',
    createdAt: now,
    updatedAt: now,
    sources: []
  };
}

function createSource(type: SceneSource['type']): SceneSource {
  return {
    id: `source-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    name: `${type[0].toUpperCase()}${type.slice(1)} source`,
    enabled: true,
    position: { x: 0, y: 0 },
    size: { width: 320, height: 180 },
    content: type === 'text' ? 'On-screen text' : '',
    url: type === 'browser' ? 'https://example.com' : '',
    opacity: 100
  };
}

export default function Scenes() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const loadScenes = async () => {
    const response = await apiRequest<Scene[]>('/api/scenes');
    setScenes(response);
  };

  useEffect(() => {
    loadScenes().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load scenes.'));
  }, []);

  const saveScenes = async () => {
    try {
      const response = await apiRequest<Scene[]>('/api/scenes', {
        method: 'PUT',
        body: JSON.stringify({ scenes })
      });
      setScenes(response);
      setStatus('Scenes saved. Your webcam, screen, overlay, and browser layouts are ready to reuse.');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scenes.');
    }
  };

  const updateScene = (sceneId: string, nextScene: Scene) => {
    setScenes((current) => current.map((scene) => scene.id === sceneId ? nextScene : scene));
  };

  const addScene = () => {
    setScenes((current) => [...current, createScene(current.length)]);
  };

  const removeScene = (sceneId: string) => {
    setScenes((current) => current.filter((scene) => scene.id !== sceneId));
  };

  const addSource = (sceneId: string, type: SceneSource['type']) => {
    setScenes((current) => current.map((scene) => scene.id === sceneId
      ? { ...scene, sources: [...scene.sources, createSource(type)], updatedAt: new Date().toISOString() }
      : scene));
  };

  const updateSource = (sceneId: string, sourceId: string, patch: Partial<SceneSource>) => {
    setScenes((current) => current.map((scene) => scene.id === sceneId
      ? {
        ...scene,
        updatedAt: new Date().toISOString(),
        sources: scene.sources.map((source) => source.id === sourceId ? { ...source, ...patch } : source)
      }
      : scene));
  };

  const removeSource = (sceneId: string, sourceId: string) => {
    setScenes((current) => current.map((scene) => scene.id === sceneId
      ? { ...scene, sources: scene.sources.filter((source) => source.id !== sourceId), updatedAt: new Date().toISOString() }
      : scene));
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Scene builder</Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.72)' }}>
          Build reusable layouts with webcam, screen capture, image, text, and browser layers. Save as many scenes as you need for live, break, or vertical moments.
        </Typography>
      </Box>

      {status && <Alert severity="success">{status}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" spacing={1.5}>
        <Button variant="contained" onClick={addScene}>Add scene</Button>
        <Button variant="outlined" onClick={saveScenes} disabled={!scenes.length}>Save scenes</Button>
      </Stack>

      <Grid container spacing={2.5}>
        {scenes.map((scene, sceneIndex) => (
          <Grid key={scene.id} size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ mb: 2 }}>
                  <Stack spacing={1} sx={{ flex: 1 }}>
                    <TextField
                      label="Scene name"
                      value={scene.name}
                      onChange={(event) => updateScene(scene.id, { ...scene, name: event.target.value, updatedAt: new Date().toISOString() })}
                      fullWidth
                    />
                    <TextField
                      select
                      label="Scene type"
                      value={scene.type}
                      onChange={(event) => updateScene(scene.id, { ...scene, type: event.target.value as Scene['type'], updatedAt: new Date().toISOString() })}
                      sx={{ maxWidth: 240 }}
                    >
                      <MenuItem value="live">Live</MenuItem>
                      <MenuItem value="break">Break</MenuItem>
                      <MenuItem value="vertical">Vertical</MenuItem>
                      <MenuItem value="countdown">Countdown</MenuItem>
                    </TextField>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={`${scene.sources.length} layer${scene.sources.length === 1 ? '' : 's'}`} color="secondary" />
                    <Button color="error" variant="text" onClick={() => removeScene(scene.id)} disabled={scenes.length === 1}>
                      Remove scene
                    </Button>
                  </Stack>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                  {sourceTypes.map((type) => (
                    <Button key={type} size="small" variant="outlined" onClick={() => addSource(scene.id, type)}>
                      Add {type}
                    </Button>
                  ))}
                </Stack>

                {scene.sources.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.68)' }}>
                    This scene is empty right now. Add a webcam, screen, image, text, or browser layer.
                  </Typography>
                ) : (
                  <Grid container spacing={2}>
                    {scene.sources.map((source, sourceIndex) => (
                      <Grid key={source.id} size={{ xs: 12, md: 6 }}>
                        <Box sx={{ p: 2, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                              {sceneIndex + 1}.{sourceIndex + 1} {source.name}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Switch
                                checked={source.enabled}
                                onChange={(event) => updateSource(scene.id, source.id, { enabled: event.target.checked })}
                              />
                              <Button color="error" variant="text" onClick={() => removeSource(scene.id, source.id)}>
                                Remove
                              </Button>
                            </Stack>
                          </Stack>

                          <Stack spacing={1.5}>
                            <TextField
                              label="Layer name"
                              value={source.name}
                              onChange={(event) => updateSource(scene.id, source.id, { name: event.target.value })}
                              fullWidth
                            />
                            <TextField
                              select
                              label="Layer type"
                              value={source.type}
                              onChange={(event) => updateSource(scene.id, source.id, { type: event.target.value as SceneSource['type'] })}
                              fullWidth
                            >
                              {sourceTypes.map((type) => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                              ))}
                            </TextField>
                            {(source.type === 'text' || source.type === 'image' || source.type === 'browser') && (
                              <TextField
                                label={source.type === 'browser' ? 'Browser URL' : source.type === 'image' ? 'Image path or note' : 'Text content'}
                                value={source.type === 'browser' ? source.url || '' : source.content}
                                onChange={(event) => updateSource(scene.id, source.id, source.type === 'browser'
                                  ? { url: event.target.value }
                                  : { content: event.target.value })}
                                fullWidth
                              />
                            )}
                            <Stack direction="row" spacing={1.5}>
                              <TextField
                                label="X"
                                type="number"
                                value={source.position.x}
                                onChange={(event) => updateSource(scene.id, source.id, { position: { ...source.position, x: Number(event.target.value) } })}
                                fullWidth
                              />
                              <TextField
                                label="Y"
                                type="number"
                                value={source.position.y}
                                onChange={(event) => updateSource(scene.id, source.id, { position: { ...source.position, y: Number(event.target.value) } })}
                                fullWidth
                              />
                            </Stack>
                            <Stack direction="row" spacing={1.5}>
                              <TextField
                                label="Width"
                                type="number"
                                value={source.size.width}
                                onChange={(event) => updateSource(scene.id, source.id, { size: { ...source.size, width: Number(event.target.value) } })}
                                fullWidth
                              />
                              <TextField
                                label="Height"
                                type="number"
                                value={source.size.height}
                                onChange={(event) => updateSource(scene.id, source.id, { size: { ...source.size, height: Number(event.target.value) } })}
                                fullWidth
                              />
                            </Stack>
                          </Stack>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
