import { useEffect, useRef } from "react";

interface ChatProps {
  messages: Message[];
  userData: UserData | null;
  room?: Group | null;
  targetUser?: string;
  fetchOlder: () => Promise<void>;
}

const ChatWindow: React.FC<ChatProps> = ({
  messages,
  userData,
  room,
  targetUser,
  fetchOlder,
}) => {
  const chatRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef<boolean>(false);
  function formatToIST(date: Date): string {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }).format(date);
  }

  const handleScroll = async () => {
    if (!chatRef.current || loadingMoreRef.current) return;
    if (chatRef.current.scrollTop <= 0) {
      loadingMoreRef.current = true;
      const prevHeight = chatRef.current.scrollHeight;
      await fetchOlder();
      setTimeout(() => {
        if (!chatRef.current) return;
        const newScrollHeight = chatRef.current.scrollHeight;
        chatRef.current.scrollTo({
          top: newScrollHeight - prevHeight - 100,
          behavior: "instant",
        });
        loadingMoreRef.current = false;
      }, 100);
    }
  };
  // Initial scroll to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, []);

  // Scroll to bottom on new messages only if user is at bottom
  useEffect(() => {
    if (loadingMoreRef.current || !chatRef.current) return;
    chatRef.current.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "instant",
    });
  }, [messages]);

  // Filter messages for this chat
  const filteredMessages = messages.filter(
    (msg) =>
      msg.chatKey === `${room?.room}:${room?.roomId}` ||
      msg.chatKey ===
        `chat:${[userData?.username, targetUser].sort().join(":")}`
  );

  return (
    <div
      ref={chatRef}
      onScroll={handleScroll}
      className="h-10/12 pb-1 rounded-md overflow-y-scroll overflow-x-hidden scrollbar"
    >
      <div className="flex flex-col gap-2 pr-2">
        {filteredMessages.length === 0 ? (
          <div className="text-center text-gray-400 mt-5">
            No messages. Start a conversation.
          </div>
        ) : (
          filteredMessages
            .filter(
              (msg) =>
                msg.chatKey === `${room?.room}:${room?.roomId}` ||
                msg.chatKey ===
                  `chat:${[userData?.username, targetUser].sort().join(":")}`
            )
            .map((msg) => (
              <div
                key={msg.id}
                className={`flex px-4 ${
                  msg.from === userData?.username
                    ? "justify-end"
                    : msg.from === "system"
                    ? "justify-center"
                    : "justify-start"
                }`}
              >
                <div
                  className={`px-3 py-2 rounded-2xl max-w-[70%] whitespace-pre-wrap break-words ${
                    msg.from === userData?.username
                      ? "bg-blue-600 text-p6 rounded-br-none"
                      : msg.from === "system"
                      ? "bg-primary text-neutral-300 rounded text-center"
                      : "bg-gray-700 text-gray-100 rounded-bl-none"
                  }`}
                >
                  {msg.text}
                  <span className="block text-xs text-gray-400 text-right">
                    {formatToIST(msg.timestamp)}
                  </span>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
