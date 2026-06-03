const { app, BrowserWindow, shell, globalShortcut } = require("electron");
const path = require("path");

// Set NODE_ENV to production to make sure the server serves build files from 'dist'
process.env.NODE_ENV = "production";

let mainWindow = null;
let overlayWindow = null;
let overlayIsClickThrough = false;

// Expose a global controller so the Express backend can trigger window states
global.electronOverlayControl = {
  isElectron: true,
  isOverlayOpen: () => !!overlayWindow,
  toggleOverlay: (show) => {
    if (show) {
      if (!overlayWindow) {
        createOverlayWindow();
      }
    } else {
      if (overlayWindow) {
        overlayWindow.close();
        overlayWindow = null;
      }
    }
  },
  setLocked: (locked) => {
    if (overlayWindow) {
      overlayIsClickThrough = locked;
      overlayWindow.setIgnoreMouseEvents(locked, { forward: true });
      // Notify the renderer of the lock change
      overlayWindow.webContents.executeJavaScript(`
        if (typeof window.setDesktopOverlayLocked === 'function') {
          window.setDesktopOverlayLocked(${locked});
        }
      `).catch((err) => console.log("JS executing error:", err));
    }
  }
};

// Start the backend Express server
try {
  require("./dist/server.cjs");
  console.log("Backend Express server loaded successfully in Electron main process.");
} catch (error) {
  console.error("Failed to start Express server:", error);
}

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
    // When the controller window closes, close any active overlay window as well
    if (overlayWindow) {
      overlayWindow.close();
      overlayWindow = null;
    }
  });
}

function createOverlayWindow() {
  if (overlayWindow) {
    overlayWindow.focus();
    return;
  }

  overlayWindow = new BrowserWindow({
    width: 380,
    height: 550,
    x: 100,
    y: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: true, // Keep it out of taskbar for immersive look
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load standard overlay address but with dynamic query mode
  overlayWindow.loadURL("http://localhost:3000/overlay?mode=desktop-overlay");

  // Handle links
  overlayWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  overlayWindow.on("closed", () => {
    overlayWindow = null;
  });
}

// Register secure hotkeys for locking/unlocking the screen overlay
function registerGlobalHotkeys() {
  // Ctrl+Alt+O toggles lock/click-through status on the overlay window
  const registered = globalShortcut.register("CommandOrControl+Alt+O", () => {
    if (overlayWindow) {
      overlayIsClickThrough = !overlayIsClickThrough;
      overlayWindow.setIgnoreMouseEvents(overlayIsClickThrough, { forward: true });
      
      console.log(`[Hotkey] Toggle Click-through mode to: ${overlayIsClickThrough}`);
      
      // Update React state
      overlayWindow.webContents.executeJavaScript(`
        if (typeof window.setDesktopOverlayLocked === 'function') {
          window.setDesktopOverlayLocked(${overlayIsClickThrough});
        }
      `).catch(() => {});
    }
  });

  if (!registered) {
    console.warn("Failed to register CommandOrControl+Alt+O hotkey");
  } else {
    console.log("Registered global hotkey for overlay: Ctrl+Alt+O");
  }
}

app.whenReady().then(() => {
  createWindow();
  registerGlobalHotkeys();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => {
  // Clear all hotkeys securely when application shuts down
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
