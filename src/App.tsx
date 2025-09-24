import { useState, useCallback, useEffect } from "react";
import { Rnd } from "react-rnd";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { EditorProvider } from "./components/contexts/EditorContext";
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
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [downOpen, setDownOpen] = useState(true);
  const [leftContent, setLeftContent] = useState<
    "files" | "search" | "git" | "db" | null
  >(null);
  const [rightContent, setRightContent] = useState<"assist" | "chat" | null>(
    null
  );
  const togglePanel = useCallback(() => {
    setDownOpen((prev) => !prev);
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        togglePanel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePanel]);
  return (
    <EditorProvider>
      <MenuBar />
      <div className="w-screen overflow-hidden h-[calc(100vh-52px)]">
        <PanelGroup
          direction="horizontal"
          className="flex divide-x divide-neutral-300"
        >
          <Sidebar
            current={leftContent}
            onSelect={(content) => {
              if (content === leftContent) {
                setLeftOpen((prev) => !prev);
                setLeftContent(null);
              } else {
                setLeftContent(content);
                setLeftOpen(true);
              }
            }}
            currentRight={rightContent}
            onSelectRight={(content) => {
              if (content === rightContent) {
                setRightOpen((prev) => !prev);
                setRightContent(null);
              } else {
                setRightContent(content);
                setRightOpen(true);
              }
            }}
          />
          <Panel
            defaultSize={20}
            minSize={15}
            order={1}
            style={{ display: leftOpen ? "block" : "none" }}
            className="h-[calc(100vh-52px)]"
          >
            <LeftPanel content={leftContent} />
          </Panel>
          {leftOpen && <PanelResizeHandle />}
          <Panel defaultSize={55} minSize={30} order={2} className="h-[calc(100vh-52px)]">
            <PanelGroup
              direction="vertical"
              className="flex flex-col divide-y divide-neutral-300"
            >
              <Panel defaultSize={65} order={1}>
                <Editor />
              </Panel>
              <PanelResizeHandle />
              {downOpen && (
                <Panel defaultSize={35} order={2}>
                  <BottomPanel
                  // onClose={()=>setDownOpen(false)}
                  />
                </Panel>
              )}
            </PanelGroup>
          </Panel>
          {rightOpen && <PanelResizeHandle />}
          <Panel
            defaultSize={25}
            minSize={15}
            order={3}
            style={{ display: rightOpen ? "block" : "none" }}
            className="h-[calc(100vh-52px)]"
          >
            <RightPanel content={rightContent} />
          </Panel>
        </PanelGroup>
      </div>
        <StatusBar />
    </EditorProvider>
  );
};

export default App;
