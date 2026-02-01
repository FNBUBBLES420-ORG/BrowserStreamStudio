import React from 'react';
import { Container, Typography, FormControl, InputLabel, Select, MenuItem, TextField, Button, Box, Divider } from '@mui/material';

export default function Settings() {
  // State for settings
  const [bitrate, setBitrate] = React.useState(4500);
  const [resolution, setResolution] = React.useState('1920x1080');
  const [output, setOutput] = React.useState('rtmp');

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Typography variant="h4" gutterBottom>Settings</Typography>
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="resolution-label">Resolution</InputLabel>
          <Select
            labelId="resolution-label"
            value={resolution}
            label="Resolution"
            onChange={e => setResolution(e.target.value)}
          >
            <MenuItem value="1920x1080">1920x1080 (1080p)</MenuItem>
            <MenuItem value="1280x720">1280x720 (720p)</MenuItem>
            <MenuItem value="854x480">854x480 (480p)</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Bitrate (kbps)"
          type="number"
          fullWidth
          value={bitrate}
          onChange={e => setBitrate(Number(e.target.value))}
          sx={{ mb: 2 }}
        />
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="output-label">Output</InputLabel>
          <Select
            labelId="output-label"
            value={output}
            label="Output"
            onChange={e => setOutput(e.target.value)}
          >
            <MenuItem value="rtmp">RTMP</MenuItem>
            <MenuItem value="hls">HLS</MenuItem>
          </Select>
        </FormControl>
        <Button variant="contained" color="primary" fullWidth onClick={async () => {
          await fetch('/api/user/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bitrate, resolution, output })
          });
          // Optionally show a success message
        }}>Save Settings</Button>
      </Box>
      <Divider sx={{ my: 3 }} />
      <Typography variant="h6" gutterBottom>Account Management</Typography>
      <Button variant="contained" color="secondary" href="/api/auth/twitch" sx={{ mr: 1 }}>Connect Twitch</Button>
      <Button variant="contained" color="error" href="/api/auth/youtube" sx={{ mr: 1 }}>Connect YouTube</Button>
      <Button variant="contained" color="success" href="/api/auth/kick">Connect Kick</Button>
    </Container>
  );
}
