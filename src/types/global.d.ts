export {};

declare global {
  interface File {
    path: string;
    content: string;
  }
  interface SearchResult {
  filePath: string;
  matches: { line: number; text: string }[];
}
  interface Window {
    electronAPI: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;

      searchInWorkspace: (query: string, workspace: string, options?: { matchCase: boolean, wholeWord: boolean, regex: boolean }) => Promise<SearchResult[]>;

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

      watch: (dirPath: string) => void;
      unwatch: (dirPath: string) => void;
      onFsChanged: (
        callback: (data: {
          event: string;
          filename: string;
          dirPath: string;
        }) => void
      ) => void;
      offFsChanged?: (
        callback: (data: {
          event: string;
          filename: string;
          dirPath: string;
        }) => void
      ) => void;
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
    terminalAPI: {
      onData: (cb: (data: string) => void) => void;
      write: (data: string) => void;
      resize: (cols: number, rows: number) => void;
    };
  }
}
