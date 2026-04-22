const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selecionarPasta: () => ipcRenderer.invoke('selecionar-pasta')
});