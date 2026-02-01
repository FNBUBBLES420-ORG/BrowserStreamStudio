import React from 'react';
import { Container, Typography, Button, Box } from '@mui/material';
import { Link } from 'react-router-dom';

export default function Account() {
  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Typography variant="h4" gutterBottom>Account Integration</Typography>
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" color="secondary" href="/api/auth/twitch" sx={{ mr: 1 }}>Connect Twitch</Button>
        <Button variant="contained" color="error" href="/api/auth/youtube" sx={{ mr: 1 }}>Connect YouTube</Button>
        <Button variant="contained" color="success" href="/api/auth/kick">Connect Kick</Button>
      </Box>
      <Typography variant="body2" sx={{ mt: 2 }}>
        For more account and stream settings, visit the <Button component={Link} to="/settings" size="small">Settings</Button> page.
      </Typography>
    </Container>
  );
}
