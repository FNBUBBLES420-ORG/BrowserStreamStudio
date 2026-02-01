import React from 'react';
import { Container, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Typography variant="h3" gutterBottom align="center" sx={{ width: '100%' }}>BrowserStream Studio🎥</Typography>
      <Button component={Link} to="/stream" variant="contained" color="primary" sx={{ m: 1 }}>Start Streaming</Button>
      <Button component={Link} to="/plugins" variant="outlined" sx={{ m: 1 }}>Plugins</Button>
      <Button component={Link} to="/account" variant="outlined" sx={{ m: 1 }}>Account</Button>
      <Button component={Link} to="/settings" variant="outlined" sx={{ m: 1 }}>Settings</Button>
    </Container>
  );
}
