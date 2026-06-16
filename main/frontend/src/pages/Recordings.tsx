import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  TextField,
  Typography
} from '@mui/material';

import { apiRequest, openDesktopPath, showItemInFolder } from '../api';
import type { RecordingFile } from '../types';

type RecordingResponse = {
  root: string;
  files: RecordingFile[];
};

export default function Recordings() {
  const [root, setRoot] = useState('');
  const [files, setFiles] = useState<RecordingFile[]>([]);
  const [renameMap, setRenameMap] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadRecordings = async () => {
    const response = await apiRequest<RecordingResponse>('/api/recordings');
    setRoot(response.root);
    setFiles(response.files);
  };

  useEffect(() => {
    loadRecordings().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load recordings.'));
  }, []);

  const renameRecording = async (file: RecordingFile) => {
    const nextName = renameMap[file.name]?.trim();
    if (!nextName || nextName === file.name) {
      return;
    }

    try {
      await apiRequest(`/api/recordings/${encodeURIComponent(file.name)}`, {
        method: 'PATCH',
        body: JSON.stringify({ nextName })
      });
      setMessage(`Renamed ${file.name} to ${nextName}.`);
      await loadRecordings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename recording.');
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Recording manager</Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.72)' }}>
          Browse local recordings, open the folder, reveal files, and rename clips so the app feels ready for real desktop use.
        </Typography>
      </Box>

      {message && <Alert severity="success">{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Recording folder</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>{root || 'Not set yet'}</Typography>
            </Box>
            <Button variant="outlined" onClick={() => openDesktopPath(root)} disabled={!root}>
              Open folder
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2.5}>
        {files.map((file) => (
          <Grid key={file.path} size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={1.5}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{file.name}</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                    Modified {new Date(file.modifiedAt).toLocaleString()} • {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </Typography>
                  <TextField
                    label="Rename file"
                    value={renameMap[file.name] ?? file.name}
                    onChange={(event) => setRenameMap((current) => ({ ...current, [file.name]: event.target.value }))}
                    fullWidth
                  />
                  <Stack direction="row" spacing={1.5}>
                    <Button variant="contained" onClick={() => renameRecording(file)}>
                      Save name
                    </Button>
                    <Button variant="outlined" onClick={() => showItemInFolder(file.path)}>
                      Reveal file
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {!files.length && (
        <Alert severity="info">
          No recordings were found yet. Turn on local recording in Settings and choose a recording folder first.
        </Alert>
      )}
    </Stack>
  );
}
