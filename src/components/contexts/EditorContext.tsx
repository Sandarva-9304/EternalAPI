import { createContext, useContext, useState } from "react";
interface EditorContextType {
  workspace: string | null;
  setWorkspace: React.Dispatch<React.SetStateAction<string | null>>;

  openFiles: File[];
  setOpenFiles: React.Dispatch<React.SetStateAction<File[]>>;

  activePath: string | null;
  setActivePath: React.Dispatch<React.SetStateAction<string | null>>;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [workspace, setWorkspace] = useState<string | null>(localStorage.getItem("workspacePath"));
  const [openFiles, setOpenFiles] = useState<File[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);

  return (
    <EditorContext.Provider
      value={{
        workspace,
        setWorkspace,
        openFiles,
        setOpenFiles,
        activePath,
        setActivePath,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
};
