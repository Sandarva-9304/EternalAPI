import { createContext, useContext, useRef } from "react";
import { useState } from "react";
import { useUser } from "./UserContext";
interface MessageContextType {
  targetUser: string;
  setTargetUser: React.Dispatch<React.SetStateAction<string>>;
  room: Group | null;
  setRoom: React.Dispatch<React.SetStateAction<Group | null>>;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  pendingMessages: Message[];
  setPendingMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  pcRef: React.RefObject<RTCPeerConnection | null>;
  lsRef: React.RefObject<MediaStream | null>;
  localVideo: React.RefObject<HTMLVideoElement | null>;
  remoteVideo: React.RefObject<HTMLVideoElement | null>;
  inCall: boolean;
  setInCall: React.Dispatch<React.SetStateAction<boolean>>;
  toggleVideo: boolean;
  setToggleVideo: React.Dispatch<React.SetStateAction<boolean>>;
  toggleAudio: boolean;
  setToggleAudio: React.Dispatch<React.SetStateAction<boolean>>;
  toggleLocalVideo: (enabled: boolean) => void;
  createPeerConnection: (target: string) => RTCPeerConnection;
  ensureLocalStream: () => Promise<MediaStream | null>;
}
export const MessageContext = createContext<MessageContextType | undefined>(
  undefined
);
export const MessageProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const ICE_SERVERS = [
    {
      urls: ["stun:stun.l.google.com:19302"],
    },
  ];
  const [room, setRoom] = useState<Group | null>(null);
  const { socket } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const [targetUser, setTargetUser] = useState("");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const lsRef = useRef<MediaStream | null>(null);
  const [inCall, setInCall] = useState(false);
  const [toggleVideo, setToggleVideo] = useState(true);
  const [toggleAudio, setToggleAudio] = useState(true);
  const localVideo = useRef<HTMLVideoElement | null>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  function toggleLocalVideo(enabled: boolean) {
    setToggleVideo(enabled);
    if (!lsRef.current) return;
    lsRef.current
      .getVideoTracks()
      .forEach((track) => (track.enabled = enabled));
  }
  function createPeerConnection(target: string) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (evt) => {
      if (evt.candidate) {
        console.log("target user:", target);
        socket.emit("ice-candidate", {
          to: target,
          candidate: evt.candidate,
        });
      } else {
        console.log("done gathering candidates");
      }
    };
    pc.ontrack = (evt) => {
      if (remoteVideo.current && !remoteVideo.current.srcObject) {
        console.log("Remote stream tracks:", evt.streams[0].getTracks());
        remoteVideo.current.srcObject = evt.streams[0];
        console.log("Remote video src:", remoteVideo.current.srcObject);
      }
    };
    return pc;
  }
  async function ensureLocalStream() {
    if (!lsRef.current) {
      const ls = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      lsRef.current = ls;
      if (localVideo.current) localVideo.current.srcObject = ls;
    }
    return lsRef.current;
  }
  return (
    <MessageContext.Provider
      value={{
        targetUser,
        setTargetUser,
        room,
        setRoom,
        messages,
        setMessages,
        pendingMessages,
        setPendingMessages,
        pcRef,
        localVideo,
        remoteVideo,
        lsRef,
        inCall,
        setInCall,
        toggleVideo,
        setToggleVideo,
        toggleAudio,
        setToggleAudio,
        toggleLocalVideo,
        createPeerConnection,
        ensureLocalStream,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
};

export const useMessage = () => {
  const ctx = useContext(MessageContext);
  if (!ctx) throw new Error("useUser must be used within EditorProvider");
  return ctx;
};
