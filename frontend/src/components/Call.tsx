import { Video, VideoOff, MicOff, Mic, PhoneOff } from "lucide-react";
import { useMessage } from "./contexts/MessageContext";
import { useUser } from "./contexts/UserContext";
const Call = () => {
  const { socket } = useUser();
  const {
    targetUser,
    remoteVideo,
    localVideo,
    toggleAudio,
    setToggleAudio,
    toggleVideo,
    toggleLocalVideo,
    pcRef,
    lsRef,
    setInCall,
  } = useMessage();
  const handleHangup = () => {
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
    socket.emit("hangup", { to: targetUser });
  };
  function toggleLocalAudio(enabled: boolean) {
    setToggleAudio(enabled);
    if (!lsRef.current) return;
    lsRef.current
      .getAudioTracks()
      .forEach((track) => (track.enabled = enabled));
  }
  return (
    <div className="flex flex-col items-center justify-around h-full">
      <h1 className="text-xl text-p6 font-semibold">Call with {targetUser}</h1>
      <div className="flex items-center justify-around w-full">
          <video
            autoPlay
            playsInline
            ref={remoteVideo}
            className="max-w-lg max-h-44 border-2 border-neutral-300"
          />
          <video
            autoPlay
            playsInline
            muted
            ref={localVideo}
            className="max-w-lg max-h-44 border-2 border-neutral-300"
          />
      </div>
      <div className="flex gap-4">
        <button onClick={() => toggleLocalAudio(!toggleAudio)}>
          {toggleAudio ? (
            <Mic className="size-10 p-2 rounded-full bg-neutral-300 text-primary-sidebar cursor-pointer" />
          ) : (
            <MicOff className="size-10 p-2 rounded-full border-1 border-neutral-300 cursor-pointer" />
          )}
        </button>
        <button onClick={() => toggleLocalVideo(!toggleVideo)}>
          {toggleVideo ? (
            <Video className="size-10 p-2 rounded-full bg-neutral-300 text-primary-sidebar cursor-pointer" />
          ) : (
            <VideoOff className="size-10 p-2 rounded-full border-1 border-neutral-300 cursor-pointer" />
          )}
        </button>
        <PhoneOff
          className="bg-red-500 size-10 p-2 rounded-full cursor-pointer"
          onClick={handleHangup}
        />
      </div>
    </div>
  );
};

export default Call;
