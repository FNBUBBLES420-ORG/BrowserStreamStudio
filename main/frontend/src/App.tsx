import React, { Suspense, lazy } from 'react';
import {
  AppBar,
  Box,
  Button,
  Container,
  CssBaseline,
  Stack,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme
} from '@mui/material';
import { HashRouter, Link, Route, Routes, useLocation } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const Plugins = lazy(() => import('./pages/Plugins'));
const Account = lazy(() => import('./pages/Account'));
const Stream = lazy(() => import('./pages/Stream'));
const Settings = lazy(() => import('./pages/Settings'));
const Scenes = lazy(() => import('./pages/Scenes'));
const Scheduler = lazy(() => import('./pages/Scheduler'));
const Recordings = lazy(() => import('./pages/Recordings'));
const SetupWizard = lazy(() => import('./pages/SetupWizard'));

const theme = createTheme({
  typography: {
    fontFamily: '"Segoe UI Variable Display","Trebuchet MS","Segoe UI",sans-serif'
  },
  palette: {
    mode: 'dark',
    primary: { main: '#ff7a59' },
    secondary: { main: '#ffd166' },
    background: {
      default: '#160f1e',
      paper: '#24182f'
    }
  },
  shape: {
    borderRadius: 16
  }
});

const navItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Wizard', to: '/wizard' },
  { label: 'Stream', to: '/stream' },
  { label: 'Scenes', to: '/scenes' },
  { label: 'Schedule', to: '/scheduler' },
  { label: 'Recordings', to: '/recordings' },
  { label: 'Accounts', to: '/account' },
  { label: 'Settings', to: '/settings' },
  { label: 'Plugins', to: '/plugins' }
];

function RouteFallback() {
  return (
    <Box sx={{ py: 8 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Loading BrowserStream Studio...</Typography>
      <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.72)' }}>
        Preparing the selected page.
      </Typography>
    </Box>
  );
}

function Shell() {
  const location = useLocation();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          background: 'radial-gradient(circle at top right, rgba(255,122,89,0.18), transparent 28%), radial-gradient(circle at left, rgba(255,209,102,0.12), transparent 24%), linear-gradient(180deg, #160f1e 0%, #24182f 48%, #120c19 100%)'
        }}
      >
        <AppBar position="sticky" color="transparent" elevation={0} sx={{ backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Toolbar sx={{ justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: 'primary.main', boxShadow: '0 0 20px rgba(93,211,158,0.8)' }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  BrowserStream Studio
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                  Desktop-first streaming control room
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {navItems.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Button
                    key={item.to}
                    component={Link}
                    to={item.to}
                    color={active ? 'primary' : 'inherit'}
                    variant={active ? 'contained' : 'text'}
                    sx={{ borderRadius: 999 }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Stack>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/wizard" element={<SetupWizard />} />
              <Route path="/plugins" element={<Plugins />} />
              <Route path="/account" element={<Account />} />
              <Route path="/stream" element={<Stream />} />
              <Route path="/scenes" element={<Scenes />} />
              <Route path="/scheduler" element={<Scheduler />} />
              <Route path="/recordings" element={<Recordings />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Suspense>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
