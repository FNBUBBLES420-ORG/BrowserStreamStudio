const { spawn } = require('child_process');

const backendUrl = process.env.ELECTRON_BACKEND_URL || 'http://127.0.0.1:4000';
const useDevRenderer = process.argv.includes('--dev');
const rendererUrl = process.env.ELECTRON_RENDERER_URL || 'http://localhost:3000';

async function main() {
  const electronBinary = require('electron');
  const electronArgs = ['.', '--disable-gpu'];

  const childEnv = {
    ...process.env,
    ELECTRON_BACKEND_URL: backendUrl
  };

  if (useDevRenderer) {
    childEnv.ELECTRON_RENDERER_URL = rendererUrl;
  } else {
    delete childEnv.ELECTRON_RENDERER_URL;
  }

  delete childEnv.ELECTRON_RUN_AS_NODE;

  const child = spawn(
    electronBinary,
    electronArgs,
    {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: childEnv,
      shell: false
    }
  );

  child.on('exit', (code) => process.exit(code ?? 0));
}

main();
