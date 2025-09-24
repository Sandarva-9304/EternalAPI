import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs/promises";
import fssync from "fs";
// import { spawn } from "node_pty";
import { fileURLToPath } from "url";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;

const windows = new Set(); // track all windows
const watchers = new Map();
// let shell;

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
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, data);
  }
}

// App ready
app.whenReady().then(() => {
  createWindow();

  // const shellPath =
  //   process.platform === "win32"
  //     ? "powershell.exe"
  //     : process.env.SHELL || "bash";
  // shell = spawn(shellPath, [], {
  //   name: "xterm-color",
  //   cols: 80,
  //   rows: 24,
  //   cwd: process.env.HOME,
  //   env: process.env,
  // });

  // Send output to renderer
  // shell.onData((data) => {
  //   mainWindow.webContents.send("terminal:data", data);
  // });

  // // Handle input from renderer
  // ipcMain.on("terminal:write", (_, data) => {
  //   shell.write(data);
  // });

  // // Resize terminal
  // ipcMain.on("terminal:resize", (_, { cols, rows }) => {
  //   shell.resize(cols, rows);
  // });

  // // Kill terminal
  // ipcMain.on("terminal:kill", () => {
  //   shell.kill();
  // });
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
    try{
      if (watchers.has(dirPath)) return;
      const watcher = fssync.watch(
        dirPath,
        { recursive: true },
        (event, filename) => {
          broadcast("fs:changed", { event, filename, dirPath });
        }
      );
      watchers.set(dirPath, watcher);
    }catch(e){
      console.log(e);
    }
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
  

ipcMain.handle(
  "search-in-workspace",
  async (
    _e,
    workspace,
    query,
    options = { matchCase: false, wholeWord: false, regex: false }
  ) => {
    if (!query) return [];

    const files = getAllFiles(workspace);
    const results = [];

    const flags = options.matchCase ? "g" : "gi";
    let pattern;
    if (options.regex) {
      pattern = new RegExp(query, flags);
    } else {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const word = options.wholeWord ? `\\b${escaped}\\b` : escaped;
      pattern = new RegExp(word, flags);
    }

    for (const filePath of files) {
      const content = await fs.promises.readFile(filePath, "utf8");
      const lines = content.split("\n");
      const matches = [];

      lines.forEach((line, idx) => {
        if (pattern.test(line)) {
          matches.push({ line: idx + 1, text: line.trim() });
        }
      });

      if (matches.length > 0) {
        results.push({ filePath, matches });
      }
    }
    return results;
  }
);
});

// macOS activate
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Quit on all windows closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

function getAllFiles(dir, extFilter = [".ts", ".tsx", ".js", ".json"]) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, extFilter));
    } else if (extFilter.includes(path.extname(filePath))) {
      results.push(filePath);
    }
  });
  return results;
}