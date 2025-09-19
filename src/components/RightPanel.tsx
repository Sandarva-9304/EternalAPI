import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Input } from "./ui/input";
import { ChevronLeft } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, useAuth } from "@clerk/clerk-react";
const socket = io("http://localhost:3000");

type Message = {
  id: string;
  from?: string;
  to?: string;
  text: string;
  timestamp: string;
  room?: string;
};
type FriendRequest = {
  from: string;
  date: string;
};

type UserData = {
  uid: string;
  username: string;
  avatar: string;
  friends?: string[];
  friendrequests?: FriendRequest[];
};

type ChatMode = "private" | "group";

const RightPanel = () => {
  const { isSignedIn, getToken } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatMode, setChatMode] = useState<ChatMode>("private");
  const [targetUser, setTargetUser] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [room, setRoom] = useState<string>(""); // for group chat
  const [inChat, setInChat] = useState(false);

  const fetchUser = async () => {
    if (isSignedIn) {
      const token = await getToken();
      const res = await fetch("http://localhost:3000/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`, // 👈 send token
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error: ${res.status} - ${text}`);
      }
      const data = await res.json();
      setUserData(data.user);
    }
  };
  useEffect(() => {
    fetchUser().catch((err) => console.error("Failed to sync user:", err));
  }, [isSignedIn, getToken, chatMode]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!inChat || !targetUser) return;

      try {
        console.log(userData?.username, targetUser);
        const res = await fetch(
          `http://localhost:3000/api/messages?from=${userData?.username}&to=${targetUser}`
        );

        const history = await res.json();
        setMessages(history.messages);
      } catch (err) {
        console.error("❌ Failed to fetch messages from Redis:", err);
        setMessages([]);
      }
    };

    fetchMessages();
  }, [inChat, targetUser, userData?.username]);

  useEffect(() => {
    // Register current user
    if (isSignedIn && userData?.username) {
      socket.emit("register", userData?.username);
    } else {
      return;
    }

    // Listen for private messages
    socket.on(
      "privateMessage",
      (msg: {
        id: string;
        from: string;
        text: string;
        to: string;
        timestamp: string;
      }) => {
        setMessages((prev) => [
          ...prev,
          {
            id: msg.id,
            from: msg.from,
            text: msg.text,
            timestamp: msg.timestamp,
          },
        ]);
      }
    );

    // Listen for room messages
    // socket.on(
    //   "roomMessage",
    //   (msg: { from: string; text: string; room: string }) => {
    //     setMessages((prev) => [
    //       ...prev,
    //       {
    //         id: crypto.randomUUID(),
    //         from: `${msg.from}@${msg.room}`,
    //         text: msg.text,
    //         room: msg.room,
    //       },
    //     ]);
    //   }
    // );

    return () => {
      socket.off("privateMessage");
      socket.off("roomMessage");
    };
  }, [userData?.username]);

  function formatToIST(isoString: string): string {
    const date = new Date(isoString);

    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }).format(date);
  }

  const sendMessage = () => {
    if (!input.trim()) return;
    const message = {
      id: crypto.randomUUID(),
      to: targetUser,
      text: input,
    };
    console.log("Sending message to", targetUser);
    socket.emit("privateMessage", message);
    setMessages((prev) => [
      ...prev,
      {
        ...message,
        timestamp: new Date().toISOString(),
        from: userData?.username,
      },
    ]);
    setInput("");
  };

  const handleAddFriend = async (searchUser: string) => {
    if (!userData?.username) return;
    if (searchUser === userData.username)
      return console.log("You can't add yourself!");
    if (userData.friends?.includes(searchUser))
      return console.log("Already friends!");
    try {
      const token = await getToken();
      const res = await fetch("http://localhost:3000/api/friends/add", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          from: userData.username,
          to: searchUser,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      console.log(`Friend request sent to ${data.to}`);
    } catch (err) {
      console.log("Error sending friend request:", err);
    }
  };

  const handleFriendRequest = async (from: string, accept: boolean) => {
    if (!userData?.username) return;
    try {
      const token = await getToken();
      const res = await fetch("http://localhost:3000/api/friends/handle", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          from,
          to: userData.username,
          accept,
        }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      console.log(data);
    } catch (err) {
      console.log("Error", err);
    }
  };

  return (
    <div className="h-[calc(100vh-52px)] w-1/3 grow-0 flex flex-col bg-primary-sidebar text-white">
      {/* Messages */}
      <SignedIn>
        {!inChat && (
          <div className="flex w-full h-full divide-x divide-neutral-300">
            <div className="h-full w-1/3 flex flex-col">
              <div
                className="border-b border-neutral-300 py-2"
                onClick={() => setChatMode("private")}
              >
                Private
              </div>
              <div
                className="border-b border-neutral-300 py-2"
                onClick={() => setChatMode("group")}
              >
                Group
              </div>
              <div>{userData?.username ?? "Guest"}</div>
            </div>
            <div className="h-full w-2/3 flex flex-col">
              {chatMode === "private" ? (
                <>
                  <Input
                    id="search"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    placeholder="Search for a user"
                  />
                  <button
                    disabled={!searchUser.trim()}
                    className={`p-2 m-2 rounded ${
                      searchUser.trim()
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-400 text-gray-200 cursor-not-allowed"
                    }`}
                    onClick={() => handleAddFriend(searchUser)}
                  >
                    Add Friend
                  </button>
                  {userData?.friends &&
                    userData?.friendrequests?.length !== 0 && (
                      <div className="text-center p-2">Friend requests</div>
                    )}
                  {userData?.friendrequests?.map((friendrequest) => (
                    <div
                      key={friendrequest.date}
                      className="text-center p-2 cursor-pointer flex flex-col"
                    >
                      <div>{friendrequest.from}</div>
                      <div>{friendrequest.date}</div>
                      <button
                        className="bg-green-500"
                        onClick={() => {
                          handleFriendRequest(friendrequest.from, true);
                          fetchUser();
                        }}
                      >
                        Accept
                      </button>
                      <button
                        className="bg-red-500"
                        onClick={() => {
                          handleFriendRequest(friendrequest.from, false);
                          fetchUser();
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  ))}
                  {userData?.friends?.map((friend) => (
                    <div
                      key={friend}
                      className="text-center p-2 cursor-pointer"
                      onClick={() => {
                        setInChat(true);
                        setTargetUser(friend);
                      }}
                    >
                      {friend}
                    </div>
                  ))}
                  {/* <div
                    className="text-center p-2 cursor-pointer"
                    onClick={() => {
                      setInChat(true);
                      setTargetUser("sandarva-9304");
                    }}
                  >
                    Sandarva-9304
                  </div>
                  <div
                    className="text-center p-2 cursor-pointer"
                    onClick={() => {
                      setInChat(true);
                      setTargetUser("ankit-5803");
                    }}
                  >
                    Ankit-5803
                  </div> */}
                </>
              ) : (
                <>
                  <div>Groups</div>
                </>
              )}
            </div>
          </div>
        )}
        {inChat && (
          <>
            <div className="flex gap-2 border-b border-neutral-300 p-4">
              <ChevronLeft
                className="translate-y-0.5 cursor-pointer"
                onClick={() => {
                  setInChat(false);
                  setTargetUser("");
                }}
              />
              {targetUser}
            </div>
            <div className="flex-1 flex flex-col justify-end pb-1">
              {messages.length === 0 && (
                <div className="text-center">
                  No messages. Start a conversation.
                </div>
              )}
              <div className="flex flex-col justify-end overflow-y-auto gap-2">
                {messages
                  .filter(
                    (msg) => [targetUser, userData?.username].includes(msg.from) //issue
                  )
                  .map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex px-4 ${
                        msg.from === userData?.username
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`px-3 py-2 rounded-2xl max-w-[70%] ${
                          msg.from === userData?.username
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-gray-700 text-gray-100 rounded-bl-none"
                        }`}
                      >
                        {/* <span className="block text-xs text-gray-400">
                        {msg.from}
                      </span> */}
                        {msg.text}
                        <span className="text-xs">
                          {formatToIST(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            <div className="p-3 border-t border-gray-800 flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button
                onClick={sendMessage}
                className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 text-sm"
              >
                Send
              </button>
            </div>
          </>
        )}
      </SignedIn>
      <SignedOut>
        <div className="flex flex-col h-full gap-4 justify-center items-center">
          <SignInButton
            mode="modal"
            className="bg-blue-600 p-2 rounded-lg hover:bg-blue-500"
          />
          <p className="text-sm text-gray-400">
            Sign in to chat with other users
          </p>
        </div>
      </SignedOut>
    </div>
  );
};

export default RightPanel;
