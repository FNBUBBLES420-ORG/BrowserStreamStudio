// Preload script for Electron (secure context)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getRuntime: () => ipcRenderer.invoke('desktop:getRuntime'),
  getPreferences: () => ipcRenderer.invoke('desktop:getPreferences'),
  savePreferences: (preferences) => ipcRenderer.invoke('desktop:savePreferences', preferences),
  openExternal: (url) => ipcRenderer.invoke('desktop:openExternal', url),
  openRecordingFolder: (targetPath) => ipcRenderer.invoke('desktop:openRecordingFolder', targetPath),
  revealRecordingFile: (targetPath) => ipcRenderer.invoke('desktop:revealRecordingFile', targetPath),
  checkForUpdates: () => ipcRenderer.invoke('desktop:checkForUpdates')
});
