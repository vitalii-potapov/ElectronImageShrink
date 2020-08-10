const path = require('path');
const os = require('os');
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const slash = require('slash');
const log = require('electron-log');

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const isDev = process.env.NODE_ENV !== 'production';
const isMac = process.platform === 'darwin';

let mainWindow;
let aboutWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: 'ImageShrink',
    width: isDev ? 1100 : 500,
    height: 600,
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    resizable: isDev,
    backgroundColor: 'white',
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });

  if (isDev) mainWindow.webContents.openDevTools();

  mainWindow.loadURL(`file://${__dirname}/app/index.html`);
}

function createAboutWindow() {
  aboutWindow = new BrowserWindow({
    title: 'About ImageShrink',
    width: 300,
    height: 300,
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    resizable: false,
    backgroundColor: 'white',
  });

  aboutWindow.loadURL(`file://${__dirname}/app/about.html`);
}

const menu = [
  ...(!isMac ? [{
    label: app.name,
    submenu: [{
      label: 'About',
      click: createAboutWindow,
    }],
  }] : []),
  { role: 'fileMenu' },
  ...(isDev ? [{
    label: 'Developer',
    submenu: [
      { role: 'reload' },
      { role: 'forcereload' },
      { role: 'separator' },
      { role: 'toggledevtools' },
    ],
  }] : []),
  // {
  //   label: 'File',
  //   submenu: [
  //     {
  //       label: 'Quit',
  //       accelerator: 'CmdOrCtrl+W',
  //       click: () => app.quit(),
  //     },
  //   ],
  // },
];

app.on('ready', () => {
  createMainWindow();

  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);

  // globalShortcut.register('CmdOrCtrl+R', () => mainWindow.reload());
  // globalShortcut.register(isMac ? 'Command+Alt+I' : 'Ctrl+Shift+I', () => mainWindow.toggleDevTools());

  mainWindow.on('closed', () => { mainWindow = null; });
});

async function shrinkImage({ imgPath, quality, dest }) {
  try {
    const pngQuality = quality / 100;
    const files = await imagemin([slash(imgPath)], {
      destination: dest,
      plugins: [
        imageminMozjpeg({ quality }),
        imageminPngquant({
          quality: [pngQuality, pngQuality],
        }),
      ],
    });
    shell.openPath(dest);
    mainWindow.webContents.send('image:done');
    log.info(files);
  } catch (error) {
    log.error(error);
  }
}

ipcMain.on('image:minimize', (e, options) => {
  options.dest = path.join(os.homedir(), 'imageshrink');
  shrinkImage(options);
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
