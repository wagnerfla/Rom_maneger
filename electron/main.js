const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const patch = require('path');

require('../server/index');

let janela;

function criarJanela() {
    janela = new BrowserWindow({
        width: 1200,
        height: 800,
        title: 'Rom Maneger',
        autoHideMenuBar: true,
        webPreferences: {
            preload: patch.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    setTimeout(() => {
        janela.loadURL('http://localhost:3000');
    }, 1500);
}

app.whenReady().then(criarJanela);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('selecionar-pasta', async() => {
    const resultado = await dialog.showOpenDialog(janela, {
        title: 'Selecionar a pasta com suas ROMs',
        properties: ['openDirectory']
    });

    if (resultado.canceled) return null;
    return resultado.filePaths[0];
});