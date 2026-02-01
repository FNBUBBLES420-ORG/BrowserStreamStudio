// Utility to find an available port
let detect = require('detect-port');
if (detect.default) detect = detect.default;

async function getAvailablePort(defaultPort) {
  const port = await detect(defaultPort);
  return port;
}

module.exports = getAvailablePort;
