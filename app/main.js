const electron = require('electron')
// Module to control application life.
const app = electron.app

var childProcess = require("child_process");
var path = require("path");
var fs = require("fs");
if (require('electron-squirrel-startup')) return;

if (handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
}

function handleSquirrelEvent() {
  if (process.argv.length === 1) {
    return false;
  }

  const ChildProcess = require('child_process');
  const path = require('path');

  const appFolder = path.resolve(process.execPath, '..');
  const rootAtomFolder = path.resolve(appFolder, '..');
  const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
  const exeName = path.basename(process.execPath);
  console.log("exeName is ", exeName);

  const spawn = function(command, args) {
    let spawnedProcess, error;

    try {
      spawnedProcess = ChildProcess.spawn(command, args, {detached: true});
    } catch (error) {}

    return spawnedProcess;
  };

  const spawnUpdate = function(args) {
    return spawn(updateDotExe, args);
  };

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    case '--squirrel-install':
    case '--squirrel-updated':
      // Optionally do things such as:
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      // Install desktop and start menu shortcuts
      spawnUpdate(['--createShortcut', exeName]);

      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-uninstall':
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers

      // Remove desktop and start menu shortcuts
      spawnUpdate(['--removeShortcut', exeName]);

      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-obsolete':
      // This is called on the outgoing version of your app before
      // we update to the new version - it's the opposite of
      // --squirrel-updated

      app.quit();
      return true;
  }
};


// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
var autoUpdater = require('./autoUpdater');
var createDefaultMenu = require('./menu.js');
var proxyWindowEvents = require('./proxyWindowEvents');

require('electron-debug')({
    showDevTools: false
});

var electronSettings = JSON.parse(fs.readFileSync(
  path.join(__dirname, "package.json"), "utf-8"));

  var checkForUpdates;
  if (electronSettings.updateFeedUrl) {
    autoUpdater.setFeedURL(electronSettings.updateFeedUrl + '?version=' + electronSettings.version);
    autoUpdater.checkForUpdates();
    checkForUpdates = function() {
      autoUpdater.checkForUpdates(true /* userTriggered */);
    };
  }

  var launchUrl = electronSettings.rootUrl;
if (electronSettings.launchPath) {
  launchUrl += electronSettings.launchPath;
}

var windowOptions = {
  width: electronSettings.width || 800,
  height: electronSettings.height || 600,
  resizable: true,
  frame: true,
  /**
   * Disable Electron's Node integration so that browser dependencies like `moment` will load themselves
   * like normal i.e. into the window rather than into modules, and also to prevent untrusted client
   * code from having access to the process and file system:
   *  - https://github.com/atom/electron/issues/254
   *  - https://github.com/atom/electron/issues/1753
   */
  webPreferences: {
    nodeIntegration: false,
    // See comments at the top of `preload.js`.
    preload: path.join(__dirname, 'preload.js')
  }
};

if (electronSettings.resizable === false){
  windowOptions.resizable = false;
}

if (electronSettings['title-bar-style']) {
  windowOptions['title-bar-style'] = electronSettings['title-bar-style'];
}

if (electronSettings.minWidth) {
  windowOptions.minWidth = electronSettings.minWidth;
}

if (electronSettings.maxWidth) {
  windowOptions.maxWidth = electronSettings.maxWidth;
}

if (electronSettings.minHeight) {
  windowOptions.minHeight = electronSettings.minHeight;
}

if (electronSettings.maxHeight) {
  windowOptions.maxHeight = electronSettings.maxHeight;
}

if (electronSettings.frame === false){
  windowOptions.frame = false;
}

// Keep a global reference of the window object so that it won't be garbage collected
// and the window closed.
var mainWindow = null;
var getMainWindow = function() {
  return mainWindow;
};
var hideInsteadofClose = function(e) {
  mainWindow.hide();
  e.preventDefault();
};
// Unfortunately, we must set the menu before the application becomes ready and so before the main
// window is available to be passed directly to `createDefaultMenu`.
createDefaultMenu(app, getMainWindow, checkForUpdates);

function createWindow () {


  // Create the browser window.
  mainWindow = new BrowserWindow(windowOptions);
  proxyWindowEvents(mainWindow);

  mainWindow.focus();
  // and load the index.html of the app.
  mainWindow.loadURL(launchUrl)

  // Open the DevTools.
  //mainWindow.webContents.openDevTools()

  // Hide the main window instead of closing it, so that we can bring it back
  // more quickly.
  mainWindow.on('close', hideInsteadofClose);

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)


app.on("before-quit", function(){
  // We need to remove our close event handler from the main window,
  // otherwise the app will not quit.
  mainWindow.removeListener('close', hideInsteadofClose);
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
  if (!mainWindow.isVisible()) mainWindow.show();
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
