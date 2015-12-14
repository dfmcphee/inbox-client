'use strict';

const electron = require('electron');
const app = electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.
const Menu = electron.Menu;  // Module to create native browser window.
const ipc = electron.ipcMain;
const Chance = require('chance');
const Datastore = require('nedb');
let chance = new Chance();

const GhReleases = require('electron-gh-releases');

let updaterOptions = {
  repo: 'dfmcphee/inbox-client',
  currentVersion: app.getVersion()
}

const updater = new GhReleases(updaterOptions);

// Report crashes to our server.
// electron.crashReporter.start();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let db;

let errorLog = function (err) {
  if (err !== null) {
    console.log(err);
  }
}

let checkForUpdates = function() {
  // Check for updates
  // `status` returns true if there is a new update available
  updater.check((err, status) => {
    if (!err && status) {
      console.log(status);
      // Download the update
      if (confirm("An update is available. Do you want to download it?")) {
        updater.download();
      }
    }
  });

  // When an update has been downloaded
  updater.on('update-downloaded', (info) => {
    // Restart the app and install the update
    updater.install()
  });
};

let setupMenu = function() {
  let applicationMenu = [
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo'
        },
        {
          label: 'Redo',
          accelerator: 'Shift+CmdOrCtrl+Z',
          role: 'redo'
        },
        {
          type: 'separator'
        },
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectall'
        },
      ]
    },
  ];

  if (process.platform == 'darwin') {
    let name = require('electron').app.getName();
    applicationMenu.unshift({
      label: name,
      submenu: [
        {
          label: 'About ' + name,
          role: 'about'
        },
        {
          type: 'separator'
        },
        {
          label: 'Services',
          role: 'services',
          submenu: []
        },
        {
          type: 'separator'
        },
        {
          label: 'Hide ' + name,
          accelerator: 'Command+H',
          role: 'hide'
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          role: 'hideothers'
        },
        {
          label: 'Show All',
          role: 'unhide'
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: function() { app.quit(); }
        },
      ]
    });
  }

  let menu = Menu.buildFromTemplate(applicationMenu);
  Menu.setApplicationMenu(menu);
}

let createWindow = function() {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 1000, height: 800, darkTheme: true});
  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/src/index.html`);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
}

ipc.on('connect', function(evt, message) {
  db.find({}).sort({ createdAt: 1 }).exec(function (err, accounts) {
    evt.sender.send('accounts-loaded', accounts);
  });
});

let increaseWindowSize = true;

ipc.on('trigger-resize', function(evt, accountId) {
  let size = mainWindow.getSize();
  let width = size[0];
  let height = size[1];

  mainWindow.setSize(width, height + 1);
  mainWindow.setSize(width, height - 1);
});

ipc.on('add-account', function(evt, message) {
  var slug = chance.string();
  var dateCreated = new Date();
  var doc = {
    slug: slug,
    partition: 'persist:' + slug,
    createdAt: dateCreated
  };

  db.insert(doc, function (err, newAccount) {
    evt.sender.send('account-created', newAccount);
  });
});

ipc.on('remove-account', function(evt, slug) {
  db.remove({ slug: slug }, {}, function (err, numRemoved) {
    evt.sender.send('account-removed', slug);
  });
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != 'darwin') {
    app.quit();
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
  console.log(app.getVersion());
  db = new Datastore({ filename: app.getPath('appData') + '/accounts.json', autoload: true });

  setupMenu();
  checkForUpdates();
  createWindow();

  mainWindow.webContents.on('new-window', function(evt, url) {
    evt.preventDefault();
    require('shell').openExternal(url);
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
});

app.on('activate', function() {
  if (!mainWindow) {
    createWindow();
  }
});
