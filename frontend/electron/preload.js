const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  unmaximize: () => ipcRenderer.send("window:unmaximize"),
  close: () => ipcRenderer.send("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
  onMaximize: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("window:onmaximize", listener);
    return () => ipcRenderer.removeListener("window:onmaximize", listener);
  },
  onUnmaximize: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("window:onunmaximize", listener);
    return () => ipcRenderer.removeListener("window:onunmaximize", listener);
  },
  searchInWorkspace: (
    workspace,
    query,
    options = { matchCase: false, wholeWord: false, regex: false }
  ) => ipcRenderer.invoke("search-in-workspace", workspace, query, options),
  replaceInWorkspace: (
    query,
    results,
    replaceText,
    options = { replaceNext: true, replaceAll: false }
  ) =>
    ipcRenderer.invoke(
      "replace-in-workspace",
      query,
      results,
      replaceText,
      options
    ),

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
  offFsChanged: (callback) => ipcRenderer.removeListener("fs:changed", callback),

  delete: (filePath) => ipcRenderer.invoke("fs:delete", filePath),
  rename: (oldPath, newPath) =>
    ipcRenderer.invoke("fs:rename", oldPath, newPath),
  newFile: (filePath) => ipcRenderer.invoke("fs:newFile", filePath),
  newFolder: (dirPath) => ipcRenderer.invoke("fs:newFolder", dirPath),

  gitClone: (repoUrl, targetDir) =>
    ipcRenderer.invoke("git:clone", repoUrl, targetDir),
});

contextBridge.exposeInMainWorld("chatAPI", {
  logMessage: (message) => ipcRenderer.send("chat:logMessage", message),
  messageNotification: (message) =>
    ipcRenderer.send("chat:messageNotification", message),
  callNotification: (target, video) =>
    ipcRenderer.send("chat:callNotification", {target, video}),
});
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    (typeof args[0] === "string" && args[0].includes("Autofill.enable")) ||
    args[0].includes("Autofill.setAddresses")
  ) {
    return; // ignore
  }
  originalConsoleError(...args);
};

// contextBridge.exposeInMainWorld("terminalAPI", {
//   onData: (cb) => ipcRenderer.on("terminal:data", (_, data) => cb(data)),
//   write: (data) => ipcRenderer.send("terminal:write", data),
//   resize: (cols, rows) => ipcRenderer.send("terminal:resize", { cols, rows }),
// });
