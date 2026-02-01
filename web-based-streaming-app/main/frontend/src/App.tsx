import React from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import Plugins from './pages/Plugins';
import Account from './pages/Account';
import Stream from './pages/Stream';
import Settings from './pages/Settings';

const theme = createTheme({
  palette: { mode: 'dark' }
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/plugins" element={<Plugins />} />
          <Route path="/account" element={<Account />} />
          <Route path="/stream" element={<Stream />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
