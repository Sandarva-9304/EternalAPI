import { createServer } from "http";
import express from "express";
import { UserModel } from "./models/User.js";
import { MessageModel } from "./models/Messages.js";
import { RoomModel } from "./models/Room.js";
import { Server, Socket } from "socket.io";
import { redis } from "./redis.js";
import cors from "cors";
import { connectToDatabase } from "./db.js";
import {
  clerkMiddleware,
  clerkClient,
  requireAuth,
  getAuth,
} from "@clerk/express";
import dotenv from "dotenv";
dotenv.config();

type Message = {
  id: string;
  from: string;
  to?: string;
  text: string;
  timestamp: Date;
  room?: string;
  chatKey: string;
};
const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));
app.use((req, _res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});
app.use(clerkMiddleware());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

// Map usernames to socket IDs
const users: Record<string, string> = {}; // username -> socketId
const sockets: Record<string, string> = {}; // socketId -> User
const MESSAGE_LIMIT = 15;
// const messages: Record<string, any[]> = {};

io.on("connection", (socket: Socket) => {
  console.log("🔗 User connected:", socket.id);

  // Register a user with a username
  socket.on("register", async (username: string) => {
    if (users[username]) return;
    users[username] = socket.id;
    sockets[socket.id] = username;
    console.log(`${username} registered with id ${socket.id}`);
    const count = await redis.llen(username.concat(":pending"));
    const pendingMessages = await redis.lrange(
      username.concat(":pending"),
      -count,
      -1
    );
    for (const message of pendingMessages) {
      io.to(socket.id).emit("pendingMessage", message);
    }
  });

  // ✅ One-to-One Messaging
  socket.on(
    "privateMessage",
    async ({
      to,
      text,
      id,
      from,
      timestamp,
      chatKey,
    }: {
      to: string;
      text: string;
      id: string;
      from: string;
      timestamp: Date;
      chatKey: string;
    }) => {
      const toSocketId = users[to]; // lookup by username
      console.log(toSocketId);
      console.log(chatKey);
      const message = {
        id,
        from,
        to,
        text,
        timestamp,
        chatKey,
      };
      console.log(message.timestamp);
      await redis.rpush(chatKey, message);
      await redis.ltrim(chatKey, -MESSAGE_LIMIT, -1);
      await MessageModel.create(message);
      if (toSocketId) {
        io.to(toSocketId).emit("privateMessage", message);
        console.log(`💌 ${from} -> ${to}: ${text}`);
      } else {
        await redis.rpush(to.concat(":pending"), message);
      }
    }
  );

  socket.on(
    "createRoom",
    async ({
      room,
      roomId,
      participants,
    }: {
      room: string;
      roomId: string;
      participants: string[];
    }) => {
      try {
        const creator = sockets[socket.id];
        await RoomModel.findOneAndUpdate(
          { roomId },
          { roomId, name: room, participants },
          { upsert: true }
        );
        //issue new user joined
        for (const participant of participants) {
          await UserModel.findOneAndUpdate(
            { username: participant },
            { $push: { groups: { room, roomId } } }
          );
        }
        const message = {
          id: crypto.randomUUID(),
          room,
          chatKey: `${room}:${roomId}`,
          from: "system",
          text: `${room} created by ${creator}`,
          timestamp: new Date(),
        };
        const chatKey = `${room}:${roomId}`;
        await redis.rpush(chatKey, message);
        await redis.ltrim(chatKey, -MESSAGE_LIMIT, -1);
        await MessageModel.create(message);
        io.to(roomId).emit("roomMessage", message);
      } catch (e) {
        console.log(e);
      }
    }
  );
  // ✅ Join Room
  socket.on(
    "joinRoom",
    ({ room, roomId }: { room: string; roomId: string }) => {
      socket.join(roomId);
      const username = sockets[socket.id] ?? "Unknown";
      console.log(`${username} joined room: ${room}`);
    }
  );

  // ✅ Room/Group Messaging
  socket.on(
    "roomMessage",
    async ({
      id,
      room,
      roomId,
      text,
      from,
      timestamp,
      chatKey,
    }: {
      id: string;
      room: string;
      roomId: string;
      text: string;
      from: string;
      timestamp: Date;
      chatKey: string;
    }) => {
      const message = {
        id,
        from,
        text,
        room,
        chatKey,
        timestamp,
      };
      await redis.rpush(chatKey, message);
      await redis.ltrim(chatKey, -MESSAGE_LIMIT, -1);
      await MessageModel.create(message);
      const group = await RoomModel.findOne({ roomId });
      if (!group) return;
      for (const participant of group.participants) {
        const toSocketId = users[participant];
        if (!toSocketId) {
          await redis.rpush(participant.concat(":pending"), message);
        }
      }
      io.to(roomId).except(socket.id).emit("roomMessage", message);
      console.log(`👥 [${room}] ${from}: ${text}`);
    }
  );
  socket.on(
    "removePending",
    async ({ username, chatKey }: { username: string; chatKey: string }) => {
      const listKey = `${username}:pending`;
      // Get all pending messages
      const pendingMessages = (await redis.lrange(listKey, 0, -1)) as Message[];
      console.log(pendingMessages);
      // Filter out ones that match chatKey
      const kept = pendingMessages.filter((msg: Message) => {
        return msg.chatKey !== chatKey;
      });
      // Replace list with filtered ones
      await redis.del(listKey);
      if (kept.length > 0) {
        await redis.rpush(listKey, ...kept);
      }
    }
  );

  socket.on(
    "offer",
    ({ to, offer, from, callType }: { to: string; offer: any; from: string; callType: boolean }) => {
      console.log("offer-hit", to, from, callType);
      const toId = users[to];
      console.log(toId);
      if (toId) {
        io.to(toId).emit("offer", { from, offer, callType });
      }
    }
  );

  // Forward an answer to the caller
  socket.on("answer", ({ to, answer }: { to: string; answer: any }) => {
    const toId = users[to];
    console.log("answer hit", to, toId);
    if (toId) {
      io.to(toId).emit("answer", { answer });
    }
  });

  // Forward ICE candidates (both ways)
  socket.on(
    "ice-candidate",
    ({ to, candidate }: { to: string; candidate: any }) => {
      const toId = users[to];
      if (toId) {
        io.to(toId).emit("ice-candidate", { candidate });
      }
    }
  );
  socket.on("call-rejected", ({ from }: { from: string }) => {
    const toId = users[from];
    if (toId) {
      io.to(toId).emit("call-rejected");
    }
  })
  socket.on("hangup", ({ to }: { to: string }) => {
    const toId = users[to];
    if (toId) {
      io.to(toId).emit("hangup");
    }
  })
  socket.on("call-accepted", ({ from }: { from: string }) => {
    const toId = users[from];
    if (toId) {
      io.to(toId).emit("call-accepted");
    }
  })

  // Handle disconnect
  socket.on("disconnect", () => {
    const user = sockets[socket.id];
    if (user) {
      delete users[user];
      delete sockets[socket.id];
      console.log(`${user} disconnected`);
      console.log(users);
    }
  });
});
app.get("/api", async (req, res) => {
  return res.status(200).json({ message: "Health Check" });
});

const syncUser = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    console.log("Syncing user...");
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const clerkUser = await clerkClient.users.getUser(userId);
    const username = clerkUser.username;
    const mongoUser = await UserModel.findOneAndUpdate(
      { uid: clerkUser.id },
      {
        username,
        avatar: clerkUser.imageUrl,
      },
      { upsert: true, new: true }
    );
    (req as any).user = mongoUser;
    next();
  } catch (err) {
    console.error("Error syncing user:", err);
    res.status(500).json({ error: "Failed to sync user" });
  }
};

app.get("/api/users/me", requireAuth(), syncUser, (req, res) => {
  res.json({ user: (req as any).user });
});

app.put("/api/friends/add", requireAuth(), async (req, res) => {
  console.log("add-hit");
  const { from, to } = req.body;
  const user1 = await UserModel.findOne({ username: from });
  const user2 = await UserModel.findOne({ username: to });
  if (!user1 || !user2)
    return res.status(404).json({ message: "User not found" });
  if (user1.friendrequests?.some((e: any) => e.from === to))
    return res
      .status(400)
      .json({ message: "You already have a pending friend request" });
  if (user2.friendrequests?.some((e: any) => e.from === from))
    return res
      .status(400)
      .json({ message: "Friend request already sent to user" });
  user1.friendrequests?.push({ from, to, date: new Date() });
  user2.friendrequests?.push({ from, to, date: new Date() });
  await user1.save();
  await user2.save();
  res.status(200).json({ message: "Friend request sent to", to });
});

app.put("/api/friends/handle", requireAuth(), async (req, res) => {
  console.log("handle-hit");
  const { from, to, accept } = req.body;
  const user1 = await UserModel.findOne({ username: from });
  const user2 = await UserModel.findOne({ username: to });
  if (!user1 || !user2)
    return res.status(404).json({ message: "Unsuccessful request" });
  if (accept) {
    user1.friends?.push({ username: to, avatar: user2.avatar });
    user2.friends?.push({ username: from, avatar: user1.avatar });
    res.status(200).json({ message: "Friend request accepted", to });
  } else {
    res.status(200).json({ message: "Friend request rejected", to });
  }
  if (user1.friendrequests?.some((e: any) => e.to === to))
    user1.friendrequests = user1.friendrequests?.filter(
      (e: any) => e.to !== to
    );
  if (user2.friendrequests?.some((e: any) => e.from === from))
    user2.friendrequests = user2.friendrequests?.filter(
      (e: any) => e.from !== from
    );
  user1.save();
  user2.save();
});
app.get("/api/pvtmessages", async (req, res) => {
  try {
    const { from, to } = req.query;
    console.log("Fetching messages...");
    const messages = await redis.lrange(
      `chat:${[from, to].sort().join(":")}`,
      -MESSAGE_LIMIT,
      -1
    );
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.get("/api/pvtmessages/history", async (req, res) => {
  console.log("fetch history");
  try {
    const { from, to, before } = req.query;
    const chatKey = `chat:${[from, to].sort().join(":")}`;
    console.log("before", before);
    const query: any = {
      chatKey,
      timestamp: { $lt: new Date(before as string) },
    };
    const messages = await MessageModel.find(query)
      .sort({ timestamp: -1 })
      .limit(30)
    res.json(messages.reverse());
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

app.get("/api/roommessages", async (req, res) => {
  try {
    const { room, roomId } = req.query;
    console.log("Fetching messages...");
    const messages = await redis.lrange(
      `${room}:${roomId}`,
      -MESSAGE_LIMIT,
      -1
    );
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.get("/api/roommessages/history", async (req, res) => {
  console.log("fetch history");
  try {
    const { room, roomId, before } = req.query;
    const chatKey = `${room}:${roomId}`;
    console.log("before", before);
    const query: any = {
      chatKey,
      timestamp: { $lt: new Date(before as string) },
    };
    const messages = await MessageModel.find(query)
      .sort({ timestamp: 1 })
      .limit(10);
    res.json(messages);
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

httpServer.listen(3000, async () => {
  await connectToDatabase(
    "mongodb+srv://sahil_ansari_47:Codename%4047@cluster0.2wo5v83.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
  );
  console.log("Socket.IO server running on port 3000");
});
