const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),

  newWindow: () => ipcRenderer.invoke("window:new"),

  openFolder: () => ipcRenderer.invoke("dialog:openFolder"),
  readDir: (path) => ipcRenderer.invoke("fs:readDir", path),
  readFile: (filePath) => ipcRenderer.invoke("fs:readFile", filePath),
  writeFile: (filePath, content) =>
    ipcRenderer.invoke("fs:writeFile", filePath, content),

  watch: (dirPath) => ipcRenderer.invoke("fs:watch", dirPath),
  unwatch: (dirPath) => ipcRenderer.invoke("fs:unwatch", dirPath),
  onFsChanged: (callback) =>
    ipcRenderer.on("fs:changed", (_, data) => callback(data)),

  delete: (filePath) => ipcRenderer.invoke("fs:delete", filePath),
  rename: (oldPath, newPath) =>
    ipcRenderer.invoke("fs:rename", oldPath, newPath),
  newFile: (filePath) => ipcRenderer.invoke("fs:newFile", filePath),
  newFolder: (dirPath) => ipcRenderer.invoke("fs:newFolder", dirPath),

  cloneRepo: (repoUrl, targetDir) =>
    ipcRenderer.invoke("git:clone", repoUrl, targetDir),
});

contextBridge.exposeInMainWorld("chatAPI", {
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, callback) =>
    ipcRenderer.on(channel, (_, data) => callback(data)),
});
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === "string" &&
    args[0].includes("Autofill.enable") ||
    args[0].includes("Autofill.setAddresses")
  ) {
    return; // ignore
  }
  originalConsoleError(...args);
};

contextBridge.exposeInMainWorld("terminalAPI", {
  createTerminal: () => ipcRenderer.invoke("terminal:create"),
  writeTerminal: (id, data) => ipcRenderer.send("terminal:write", { id, data }),
  resizeTerminal: (id, cols, rows) =>
    ipcRenderer.send("terminal:resize", { id, cols, rows }),
  killTerminal: (id) => ipcRenderer.send("terminal:kill", { id }),
  onTerminalData: (callback) =>
    ipcRenderer.on("terminal:data", (_, payload) => callback(payload)),
});