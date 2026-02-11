import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('jubitmind', {
  platform: process.platform,
  isElectron: true,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },

  // First-run wizard
  isFirstRun: () => ipcRenderer.invoke('is-first-run'),
  completeSetup: () => ipcRenderer.invoke('complete-setup'),

  // Menu events
  onMenuExportReport: (callback: () => void) => {
    ipcRenderer.on('menu-export-report', () => callback());
    return () => { ipcRenderer.removeAllListeners('menu-export-report'); };
  },
});
