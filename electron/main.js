import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs/promises";
import fssync from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;

const windows = new Set(); // track all windows
const watchers = new Map();
let shell = os.platform() === "win32" ? "powershell.exe" : "bash";

const terminals = {};
// Helper to create a new BrowserWindow
function createWindow() {
  const win = new BrowserWindow({
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  win.on("closed", () => {
    windows.delete(win);
  });

  windows.add(win);
  return win;
}

// Broadcast to all windows
function broadcast(channel, data) {
  windows.forEach((w) => {
    if (!w.isDestroyed()) {
      w.webContents.send(channel, data);
    }
  });
}

// App ready
app.whenReady().then(() => {
  createWindow();

  // Window controls
  ipcMain.on("window:minimize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
  });

  ipcMain.on("window:maximize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    }
  });

  ipcMain.on("window:close", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });

  ipcMain.handle("window:new", () => createWindow());

  // Dialog
  ipcMain.handle("dialog:openFolder", async () => {
    const res = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    if (res.canceled || res.filePaths.length === 0) return null;
    return res.filePaths[0];
  });

  // File system
  ipcMain.handle("fs:readDir", async (_, dirPath) => {
    const dirents = await fs.readdir(dirPath, { withFileTypes: true });
    return dirents.map((d) => ({
      name: d.name,
      path: path.join(dirPath, d.name),
      isDirectory: d.isDirectory(),
    }));
  });

  ipcMain.handle("fs:readFile", async (_, filePath) => {
    return fs.readFile(filePath, "utf-8");
  });

  ipcMain.handle("fs:writeFile", async (_, filePath, content) => {
    await fs.writeFile(filePath, content, "utf-8");
    return true;
  });

  ipcMain.handle("fs:newFile", async (_, filePath) => {
    await fs.writeFile(filePath, "", "utf-8");
    return true;
  });

  ipcMain.handle("fs:newFolder", async (_, folderPath) => {
    await fs.mkdir(folderPath, { recursive: true });
    return true;
  });

  ipcMain.handle("fs:delete", async (_, filePath) => {
    await fs.rm(filePath, { recursive: true, force: true });
    return true;
  });

  ipcMain.handle("fs:rename", async (_, oldPath, newPath) => {
    await fs.rename(oldPath, newPath);
    return true;
  });

  // Watch folder
  ipcMain.handle("fs:watch", (_, dirPath) => {
    if (watchers.has(dirPath)) return;
    const watcher = fssync.watch(
      dirPath,
      { recursive: true },
      (event, filename) => {
        broadcast("fs:changed", { event, filename, dirPath });
      }
    );
    watchers.set(dirPath, watcher);
  });

  ipcMain.handle("fs:unwatch", (_, dirPath) => {
    if (watchers.has(dirPath)) {
      watchers.get(dirPath).close();
      watchers.delete(dirPath);
    }
  });
  // Git
  ipcMain.handle("git:clone", async (_, repoUrl, targetDir) => {
    return new Promise((resolve, reject) => {
      const proc = spawn("git", ["clone", repoUrl, targetDir]);
      proc.on("close", (code) => {
        if (code === 0) resolve(true);
        else reject(new Error(`git clone failed with code ${code}`));
      });
    });
  });
  ipcMain.handle("terminal:create", (event) => {
    const ptyProcess = pty.spawn(shell, [], {
      name: "xterm-color",
      cols: 80,
      rows: 24,
      cwd: process.env.HOME,
      env: process.env,
    });

    const id = Date.now().toString();
    terminals[id] = ptyProcess;

    ptyProcess.onData((data) => {
      event.sender.send("terminal:data", { id, data });
    });

    return id;
  });
  ipcMain.on("terminal:write", (event, { id, data }) => {
    terminals[id]?.write(data);
  });

  // Resize
  ipcMain.on("terminal:resize", (event, { id, cols, rows }) => {
    terminals[id]?.resize(cols, rows);
  });

  // Kill
  ipcMain.on("terminal:kill", (event, { id }) => {
    terminals[id]?.kill();
    delete terminals[id];
  });
});

// macOS activate
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Quit on all windows closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
