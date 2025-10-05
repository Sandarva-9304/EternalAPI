import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs/promises";
import fssync, { readdirSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
// import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;

const windows = new Set(); // track all windows
const watchers = new Map();
// let shell;

// const terminals = {};
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
  // Attach maximize/unmaximize events directly to this window
  win.on("maximize", () => {
    win.webContents.send("window:onmaximize");
  });
  win.on("unmaximize", () => {
    win.webContents.send("window:onunmaximize");
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
    if (win && !win.isMaximized()) win.maximize();
  });

  ipcMain.on("window:unmaximize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && win.isMaximized()) win.unmaximize();
  });

  ipcMain.on("window:close", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });

  ipcMain.handle("window:isMaximized", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? win.isMaximized() : false;
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
    try {
      if (watchers.has(dirPath)) return;
      const watcher = fssync.watch(
        dirPath,
        { recursive: true },
        (event, filename) => {
          broadcast("fs:changed", { event, filename, dirPath });
        }
      );
      watchers.set(dirPath, watcher);
    } catch (e) {
      console.log(e);
    }
  });

  ipcMain.handle("fs:unwatch", (_, dirPath) => {
    if (watchers.has(dirPath)) {
      watchers.get(dirPath).close();
      watchers.delete(dirPath);
    }
  });

  ipcMain.handle("git:clone", async (_, repoUrl, targetDir) => {
    return new Promise((resolve, reject) => {
      if (!repoUrl || !targetDir) {
        return reject(
          new Error("Repository URL and target directory are required")
        );
      }
      const proc = spawn("git", ["clone", repoUrl, targetDir]);

      let stderr = "";

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          reject(new Error(`git clone failed with code ${code}\n${stderr}`));
        }
      });

      proc.on("error", (err) => {
        reject(new Error(`Failed to start git process: ${err.message}`));
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

      const files = await getAllFiles(workspace);
      const results = [];

      const flags = options.matchCase ? "" : "i"; // remove 'g'
      let pattern;

      if (options.regex) {
        pattern = new RegExp(query, flags);
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const word = options.wholeWord ? `\\b${escaped}\\b` : escaped;
        pattern = new RegExp(word, flags);
      }

      for (const filePath of files) {
        const content = await fs.readFile(filePath, "utf8");
        const lines = content.split(/\r?\n/);
        const matches = [];

        lines.forEach((line, idx) => {
          if (pattern.test(line)) {
            matches.push({ line: idx + 1, text: line }); // keep original line
          }
        });

        if (matches.length > 0) {
          results.push({ filePath, matches });
        }
      }

      return results;
    }
  );
  ipcMain.handle(
    "replace-in-workspace",
    async (
      _e,
      query,
      results,
      replaceText,
      options = { replaceNext: true, replaceAll: false }
    ) => {
      if (!results || !query) return { replaced: 0 };

      const targetFiles = results.map((r) => r.filePath);
      let replacedCount = 0;

      for (const filePath of targetFiles) {
        try {
          let content = await fs.readFile(filePath, "utf8");

          if (options.replaceNext) {
            const index = content.indexOf(query);
            if (index !== -1) {
              content =
                content.slice(0, index) +
                replaceText +
                content.slice(index + query.length);
              replacedCount++;
              await fs.writeFile(filePath, content, "utf8");
              break; // stop after first replacement
            }
          }

          if (options.replaceAll) {
            const occurrences = content.split(query).length - 1;
            if (occurrences > 0) {
              content = content.split(query).join(replaceText);
              replacedCount += occurrences;
              await fs.writeFile(filePath, content, "utf8");
            }
          }
        } catch (err) {
          console.error(`Error processing file ${filePath}:`, err);
        }
      }

      return { replaced: replacedCount };
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

async function getAllFiles(dir) {
  let results = [];
  const list = await fs.readdir(dir, { withFileTypes: true });

  for (const dirent of list) {
    const filePath = path.join(dir, dirent.name);

    if (dirent.isDirectory()) {
      results = results.concat(await getAllFiles(filePath));
    } else {
      results.push(filePath);
    }
  }
  return results;
}
