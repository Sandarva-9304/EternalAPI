import { useState } from "react";
import {
  LeftPanel,
  Sidebar,
  RightPanel,
  BottomPanel,
  Editor,
  MenuBar,
  StatusBar,
} from "./components/ComponentIndex";
const App = () => {
  const [leftOpen, setLeftOpen] = useState(true);
  const [leftContent, setLeftContent] = useState<
    "files" | "search" | "git" | "db" | null
  >(null);
  const [openFile, setOpenFile] = useState<null | {
    path: string;
    content: string;
  }>(null);
  const [rightOpen, setRightOpen] = useState(true);
  const [downOpen, setDownOpen] = useState(true);
  return (
    <>
      <MenuBar />
      <div className="h-screen w-screen overflow-hidden flex flex-col divide-y divide-neutral-300">
        <div className="flex divide-x divide-neutral-300">
          <Sidebar
            current={leftContent}
            onSelect={(content) => {
              if (content === leftContent) {
                setLeftOpen(false);
                setLeftContent(null);
              } else {
                setLeftContent(content);
                setLeftOpen(true);
              }
            }}
          />
          {leftOpen && <LeftPanel content={leftContent} onOpenFile={(path, content) => setOpenFile({ path, content })} />}
          <div className="w-full h-[calc(100vh-52px)] flex flex-col divide-y divide-neutral-300">
            <Editor
              file={openFile}
              onSave={(newContent) => {
                if (openFile) {
                  window.electronAPI.writeFile(openFile.path, newContent);
                  setOpenFile({ ...openFile, content: newContent });
                }
              }}
            />
            {downOpen && <BottomPanel setDownOpen={setDownOpen} />}
          </div>
          {rightOpen && <RightPanel />}
        </div>
        <StatusBar file={openFile} />
      </div>
    </>
  );
};

export default App;
