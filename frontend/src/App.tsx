import { useState, useCallback, useEffect } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { ToastNotification, TemplateType, ToastButton } from 'electron-windows-notifications';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";
import { Button } from "./components/ui/button";
import { EditorProvider } from "./components/contexts/EditorContext";
import { useUser } from "./components/contexts/UserContext";
import { useMessage } from "./components/contexts/MessageContext";
import { socket } from "./lib/socket";
import { useAuth } from "@clerk/clerk-react";
import {
  LeftPanel,
  Sidebar,
  RightPanel,
  BottomPanel,
  Main,
  MenuBar,
  StatusBar,
} from "./components/ComponentIndex";

const App = () => {
  const { isSignedIn } = useAuth();
  const {
    userData,
    fetchUser,
    incomingFrom,
    setIncomingFrom,
    pendingOffer,
    setPendingOffer,
    acceptDialog,
    setAcceptDialog,
  } = useUser();
  const {
    targetUser,
    setTargetUser,
    room,
    setMessages,
    setPendingMessages,
    pcRef,
    lsRef,
    setInCall,
    setToggleVideo,
    localVideo,
    toggleVideo,
    toggleLocalVideo,
    createPeerConnection,
    ensureLocalStream,
  } = useMessage();
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [downOpen, setDownOpen] = useState(true);
  const [leftContent, setLeftContent] = useState<
    "files" | "search" | "git" | "db" | "music" | null
  >(null);
  const [rightContent, setRightContent] = useState<"assist" | "chat" | null>(
    null
  );
  useEffect(() => {
    if (isSignedIn && userData?.username) {
      socket.emit("register", userData?.username);
      if (userData?.groups) {
        for (const group of userData?.groups) {
          socket.emit("joinRoom", group);
        }
      }
    } else {
      return;
    }
    socket.on(
      "privateMessage",
      (msg: {
        id: string;
        from: string;
        text: string;
        to: string;
        timestamp: Date;
        chatKey: string;
      }) => {
        msg.timestamp = new Date(msg.timestamp);
        setMessages((prev) => [...prev, msg]);
        // window.chatAPI.logMessage(msg);
        const chatKey = `chat:${[userData?.username, targetUser]
          .sort()
          .join(":")}`;
        if (chatKey !== msg.chatKey) window.chatAPI.messageNotification(msg);
      }
    );
    socket.on("pendingMessage", (msg: Message) => {
      msg.timestamp = new Date(msg.timestamp);
      setPendingMessages((prev) => [...prev, msg]);
    });
    socket.on(
      "roomMessage",
      (msg: {
        id: string;
        from: string;
        text: string;
        chatKey: string;
        timestamp: Date;
        room: string;
      }) => {
        msg.timestamp = new Date(msg.timestamp);
        setMessages((prev) => [...prev, msg]);
        const chatKey = `${room?.room}:${room?.roomId}`;
        if (chatKey !== msg.chatKey) window.chatAPI.messageNotification(msg);
      }
    );
    socket.on("offer", async ({ from, offer, callType }) => {
      setIncomingFrom(from);
      setPendingOffer(offer);
      setAcceptDialog(true);
      setToggleVideo(callType);
      if (document.hidden) {
        window.chatAPI.callNotification(from, callType);
      }
    });
    socket.on("answer", async ({ answer }) => {
      console.log("answer", answer);
      if (!pcRef.current) {
        console.log("No RTCPeerConnection for answer");
        return;
      }
      await pcRef.current.setRemoteDescription(answer);
      console.log("pc", pcRef.current.remoteDescription);
    });
    socket.on("ice-candidate", async ({ candidate }) => {
      if (!pcRef.current) {
        console.log(
          "No RTCPeerConnection; buffering candidates not implemented in this simple sample"
        );
        return;
      }
      try {
        await pcRef.current.addIceCandidate(candidate);
        console.log("added ice candidate");
      } catch (err) {
        console.error("Error adding ICE candidate:", err);
      }
    });
    socket.on("call-rejected", () => {
      setInCall(false);
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (lsRef.current) {
        for (const track of lsRef.current.getTracks()) track.stop();
        lsRef.current = null;
        if (localVideo.current) localVideo.current.srcObject = null;
      }
    });
    socket.on("hangup", () => {
      console.log("hangup hit");
      setInCall(false);
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (lsRef.current) {
        for (const track of lsRef.current.getTracks()) track.stop();
        lsRef.current = null;
        if (localVideo.current) localVideo.current.srcObject = null;
      }
    });
    return () => {
      socket.off("privateMessage");
      socket.off("roomMessage");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, [isSignedIn, userData?.username, targetUser, room]);
  useEffect(() => {
    fetchUser().catch((err) => console.error("Failed to sync user:", err));
  }, [isSignedIn]);
  const handleAccept = async () => {
    if (!incomingFrom || !pendingOffer) return;
    setAcceptDialog(false);
    setInCall(true);
    setTargetUser(incomingFrom);
    pcRef.current = createPeerConnection(incomingFrom);
    const stream = await ensureLocalStream();
    if (stream) {
      for (const track of stream.getTracks()) {
        if (pcRef.current) pcRef.current.addTrack(track, stream);
      }
    }
    console.log("video", toggleVideo);
    toggleLocalVideo(toggleVideo);
    let answer;
    if (pcRef.current) {
      await pcRef.current.setRemoteDescription(pendingOffer);
      answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
    }
    socket.emit("answer", { to: incomingFrom, answer });
    setIncomingFrom(null);
    setPendingOffer(null);
  };

  // ❌ Reject call
  const handleReject = () => {
    setAcceptDialog(false);
    socket.emit("call-rejected", { from: incomingFrom });
    setIncomingFrom(null);
    setPendingOffer(null);
  };
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
          {leftOpen && (
            <>
              <Panel
                defaultSize={20}
                minSize={15}
                order={1}
                className="h-[calc(100vh-52px)]"
              >
                <LeftPanel content={leftContent} />
              </Panel>
              <PanelResizeHandle />{" "}
            </>
          )}

          <Panel
            defaultSize={55}
            minSize={30}
            order={2}
            className="h-[calc(100vh-52px)]"
          >
            <PanelGroup
              direction="vertical"
              className="flex flex-col divide-y divide-neutral-300"
            >
              <Panel defaultSize={65} order={1}>
                <Main />
              </Panel>
              {downOpen && (
                <>
                  <PanelResizeHandle />
                  <Panel defaultSize={35} order={2}>
                    <BottomPanel
                    // onClose={()=>setDownOpen(false)}
                    />
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>
          {rightOpen && (
            <>
              <PanelResizeHandle />
              <Panel
                defaultSize={25}
                minSize={15}
                order={3}
                className="h-[calc(100vh-52px)]"
              >
                <RightPanel content={rightContent} />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
      <StatusBar />
      <Dialog open={acceptDialog} onOpenChange={setAcceptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Incoming Call</DialogTitle>
            <DialogDescription>
              {incomingFrom
                ? `${incomingFrom} is calling you`
                : "Incoming call..."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={handleReject}>
              Reject
            </Button>
            <Button onClick={handleAccept}>Accept</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EditorProvider>
  );
};

export default App;
