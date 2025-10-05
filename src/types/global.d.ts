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
  type Friend = {
    username: string;
    avatar: string;
  };
  type Message = {
    id: string;
    from: string;
    to?: string;
    text: string;
    timestamp: Date;
    room?: string;
    chatKey: string;
  };
  type FriendRequest = {
    to: string;
    from: string;
    date: Date;
  };

  type Group = {
    room: string;
    roomId: string;
    imageUrl: string;
  };

  type UserData = {
    uid: string;
    username: string;
    avatar: string;
    friends?: Friend[];
    friendrequests?: FriendRequest[];
    groups?: Group[];
  };
  interface GitRepo {
    id: string;
    name: string;
    clone_url: string;
  }
  interface Window {
    electronAPI: {
      minimize: () => void;
      maximize: () => void;
      unmaximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
      onMaximize: (callback: () => void) => () => void;
      onUnmaximize: (callback: () => void) => () => void;
      searchInWorkspace: (
        query: string,
        workspace: string,
        options?: { matchCase: boolean; wholeWord: boolean; regex: boolean }
      ) => Promise<SearchResult[]>;
      replaceInWorkspace: (
        query: string,
        results: SearchResult[],
        replaceText: string,
        options?: { replaceNext: boolean; replaceAll: boolean }
      ) => Promise<{ replaced: number }>;
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

      gitClone: (repoUrl: string, targetDir: string) => Promise<void>;
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
