export {};

declare global {
  interface Window {
    electronAPI: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;

      newWindow: () => void;

      openFolder: () => Promise<string | null>;
      readDir: (
        dirPath: string
      ) => Promise<{ name: string; path: string; isDirectory: boolean }[]>;
      readFile: (filePath: string) => Promise<string>;
      writeFile: (filePath: string, content: string) => Promise<void>;
      delete: (filePath: string) => Promise<void>;
      newFile: (filePath: string) => Promise<void>;
      newFolder: (dirPath: string) => Promise<void>;

      rename: (oldPath: string, newPath: string) => Promise<void>;
      openFile: (filePath: string) => Promise<void>;

      unwatch: (dirPath: string) => void;
      watch: (dirPath: string) => void;
    };
    chatAPI: {
      register: (username: string) => void;
      onPrivate: (
        callback: (msg: { from: string; text: string }) => void
      ) => void;
      onRoom: (
        callback: (msg: { from: string; text: string; room: string }) => void
      ) => void;
      sendPrivate: (targetUser: string, text: string) => void;
    };
    terminalApi: {
      createTerminal: () => void;
      writeTerminal: (id: string, data: string) => void;
      killTerminal: (id: string) => void;
      onTerminalData: (callback: (data: { id: string; data: string }) => void) => void;
      resizeTerminal: (id: string, cols: number, rows: number) => void;
    };
  }
}
