import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, TextField, Button, List, ListItem, ListItemText, IconButton, Divider } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

type Plugin = {
  name: string;
  code: string;
  [key: string]: unknown;
};

const Plugins: React.FC = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [execResult, setExecResult] = useState<string | null>(null);
  const [execError, setExecError] = useState<string | null>(null);

  const fetchPlugins = async () => {
    const res = await axios.get('/api/plugins');
    setPlugins(res.data);
  };


  useEffect(() => {
    fetchPlugins();
    // eslint-disable-next-line
  }, []);


  const handleInstall = async () => {
    setLoading(true);
    try {
      await axios.post('/api/plugins/install', { name, code });
      setName('');
      setCode('');
      fetchPlugins();
    } finally {
      setLoading(false);
    }
  };


  const handleRemove = async (pluginName: string) => {
    await axios.delete(`/api/plugins/${encodeURIComponent(pluginName)}`);
    fetchPlugins();
  };



  const handleExecute = async (pluginName: string) => {
    setExecResult(null);
    setExecError(null);
    try {
      const res = await axios.post('/api/plugins/execute', { name: pluginName, input: {} });
      setExecResult(`Output: ${JSON.stringify(res.data.output)}`);
    } catch (err: any) {
      setExecError(err.response?.data?.details || 'Execution failed');
    }
  };


  return (
    <Container maxWidth="md" sx={{ mt: 8 }}>
      <Typography variant="h4" gutterBottom>Plugin Manager</Typography>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6">Install New Plugin</Typography>
        <TextField
          label="Plugin Name"
          value={name}
          onChange={e => setName(e.target.value)}
          sx={{ mr: 2, mb: 2 }}
        />
        <TextField
          label="Plugin Code"
          value={code}
          onChange={e => setCode(e.target.value)}
          multiline
          minRows={3}
          sx={{ width: '100%', mb: 2 }}
        />
        <Button variant="contained" color="primary" onClick={handleInstall} disabled={loading || !name || !code}>
          Install Plugin
        </Button>
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="h6">Installed Plugins</Typography>
      <List>
        {plugins.map((plugin: Plugin) => (
          <ListItem key={plugin.name} secondaryAction={
            <>
              <Button variant="outlined" size="small" sx={{ mr: 1 }} onClick={() => handleExecute(plugin.name)}>
                Run
              </Button>
              <IconButton edge="end" aria-label="delete" onClick={() => handleRemove(plugin.name)}>
                <DeleteIcon />
              </IconButton>
            </>
          }>
            <ListItemText primary={plugin.name} secondary={plugin.code.slice(0, 60) + (plugin.code.length > 60 ? '...' : '')} />
          </ListItem>
        ))}
        {plugins.length === 0 && <ListItem><ListItemText primary="No plugins installed." /></ListItem>}
      </List>
      {execResult && <Box sx={{ mt: 2, color: 'green' }}>{execResult}</Box>}
      {execError && <Box sx={{ mt: 2, color: 'red' }}>{execError}</Box>}
    </Container>
  );
};

export default Plugins;
