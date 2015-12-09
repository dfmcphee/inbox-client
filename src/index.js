'use strict';

const electron = require('electron');
const app = electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.
const ipc = electron.ipcMain;
const Chance = require('chance');
const Datastore = require('nedb');
let chance = new Chance();

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

ipc.on('connect', function(evt, message) {
  db.find({}).sort({ createdAt: 1 }).exec(function (err, accounts) {
    evt.sender.send('accounts-loaded', accounts);
  });
});

ipc.on('triggerResize', function(evt) {
  mainWindow.emit('resize');
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
  db = new Datastore({ filename: app.getPath('appData') + '/accounts.json', autoload: true });

  db.ensureIndex({ slug: 'slug', unique: true }, errorLog);

  // Create the browser window.
  mainWindow = new BrowserWindow({width: 1000, height: 800, darkTheme: true});

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();

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
