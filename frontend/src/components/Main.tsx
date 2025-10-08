import { useEffect } from "react";
import Editor from "./Editor";
import Welcome from "./Welcome";
import Call from "./Call";
import AddTask from "./AddTask";
// import Spotify from "./Spotify"
import { useEditor } from "./contexts/EditorContext";
import { useMessage } from "./contexts/MessageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
const Main = () => {
  const { tabList, setTabList, openFiles, activeTab, setActiveTab } =
    useEditor();
  const { inCall } = useMessage();
  useEffect(() => {
    if (inCall) {
      setTabList((prev) => [...new Set([...prev, "Call"])]);
      setActiveTab("Call");
    } else {
      setTabList((prev) => prev.filter((tab) => tab !== "Call"));
      setActiveTab("Home");
    }
  }, [inCall]);
  useEffect(() => {
    if (openFiles.length > 0) {
      setTabList((prev) => [...new Set([...prev, "Editor"])]);
      setActiveTab("Editor");
    } else {
      setTabList((prev) => prev.filter((tab) => tab !== "Editor"));
      setActiveTab("Home");
    }
  }, [openFiles]);

  return (
    <Tabs value={activeTab} className="bg-primary-sidebar w-full h-full">
      <div className="flex w-full items-center justify-center">
        <TabsList className="my-2">
          {tabList.map((tab) => (
            <TabsTrigger
              onClick={() => setActiveTab(tab)}
              key={tab}
              value={tab}
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value="Home">
        <Welcome />
      </TabsContent>
      <TabsContent value="Editor">
        <Editor />
      </TabsContent>
      <TabsContent value="Call">
        <Call />
      </TabsContent>
      <TabsContent value="Trello">
        <AddTask />
      </TabsContent>
    </Tabs>
  );
};

export default Main;
