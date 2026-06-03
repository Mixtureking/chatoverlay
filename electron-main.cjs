const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

// Set NODE_ENV to production to make sure the server serves build files from 'dist'
process.env.NODE_ENV = "production";

// Start the backend Express server
try {
  require("./dist/server.cjs");
  console.log("Backend Express server loaded successfully in Electron main process.");
} catch (error) {
  console.error("Failed to start Express server:", error);
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "YouTube Chat OBS Overlay Controller",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: "#020617", // slate-950 dark theme
  });

  // Load the Express server address
  mainWindow.loadURL("http://localhost:3000");

  // Handle external links (e.g. documentation, source links) securely in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
