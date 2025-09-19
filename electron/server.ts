import { createServer } from "http";
import express from "express";
import { UserModel } from "./models/User.js";
import { MessageModel } from "./models/Messages.js";
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
const MESSAGE_LIMIT = 10;

io.on("connection", (socket: Socket) => {
  console.log("🔗 User connected:", socket.id);

  // Register a user with a username
  socket.on("register", async (username: string) => {
    users[username] = socket.id;
    sockets[socket.id] = username;
    const count = await redis.llen(username.concat(":pending"));
    const pendingMessages: any = await redis.lpop(
      username.concat(":pending"),
      count
    );
    for (const message of pendingMessages) {
      io.to(socket.id).emit("privateMessage", message);
    }
    console.log(`${username} registered with id ${socket.id}`);
  });

  // ✅ One-to-One Messaging
  socket.on(
    "privateMessage",
    async ({ to, text, id }: { to: string; text: string; id: string }) => {
      const fromUser = sockets[socket.id];
      const toSocketId = users[to]; // lookup by username
      console.log(toSocketId);

      const message = {
        id,
        from: fromUser,
        to,
        text,
        timestamp: new Date().toISOString(),
      };
      const chatKey = `chat:${[fromUser, to].sort().join(":")}`;
      console.log(chatKey);
      await redis.rpush(chatKey, message);
      await redis.ltrim(chatKey, -MESSAGE_LIMIT, -1);
      await MessageModel.create(message);
      if (toSocketId) {
        io.to(toSocketId).emit("privateMessage", {
          message,
        });
        console.log(`💌 ${fromUser} -> ${to}: ${text}`);
      } else {
        await redis.rpush(to.concat(":pending"), message);
      }
    }
  );

  // ✅ Join Room
  socket.on("joinRoom", (room: string) => {
    socket.join(room);
    const username = sockets[socket.id] ?? "Unknown";
    console.log(`${username} joined room: ${room}`);

    io.to(room).emit("roomMessage", {
      from: "system",
      text: `${username} joined the room.`,
      room,
    });
  });

  // ✅ Room/Group Messaging
  socket.on("roomMessage", ({ room, text }: { room: string; text: string }) => {
    const fromUser = sockets[socket.id];
    if (fromUser) {
      io.to(room).emit("roomMessage", {
        from: fromUser,
        text,
        room,
      });
      console.log(`👥 [${room}] ${fromUser}: ${text}`);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    const user = sockets[socket.id];
    if (user) {
      console.log(`${user} disconnected`);
      console.log(users);
      // delete users[user.username];
      // delete sockets[socket.id];
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

    (req as any).user = mongoUser; // ✅ assign Mongo user, not Clerk
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
  if (user1.friendrequests?.some((e: any) => e.to === to))
    return res
      .status(400)
      .json({ message: "Friend request already sent" });
  if (user2.friendrequests?.some((e: any) => e.from === from))
    return res
      .status(400)
      .json({ message: "You already have a pending friend request" });
  user2.friendrequests?.push({ from, to, date: new Date().toISOString() });
  await user2.save();
  res.status(200).json({ message: "Friend request sent to", to });
});

app.put("/api/friends/handle", requireAuth(), async (req, res) => {
  console.log("handle-hit");
  const { from, to, accept } = req.body;
  if (accept) {
    const user1 = await UserModel.findOneAndUpdate(
      { username: from },
      { $push: { friends: to }, $pull: { friendrequests: { from } } }
    );
    const user2 = await UserModel.findOneAndUpdate(
      { username: to },
      { $push: { friends: from }, $pull: { friendrequests: { from } } }
    );
    if (!user1 || !user2)
      return res.status(404).json({ message: "Unsuccessful request" });
    res.status(200).json({ message: "Friend request accepted", to });
  } else {
    const user = await UserModel.findOneAndUpdate(
      { username: from },
      { $pull: { friendrequests: { from } } }
    );
    if (!user) return res.status(404).json({ message: "Unsuccessful request" });

    res.status(200).json({ message: "Friend request rejected", to });
  }
});
app.get("/api/messages", async (req, res) => {
  console.log("fetch messages");
  try {
    const { from, to } = req.query;
    console.log("Fetching messages...");
    const messages = await redis.lrange(
      `chat:${[from, to].sort().join(":")}`,
      -10,
      -1
    );
    res.json({ messages });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

httpServer.listen(3000, async () => {
  await connectToDatabase(
    "mongodb+srv://sahil_ansari_47:Codename%4047@cluster0.2wo5v83.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
  );
  console.log("Socket.IO server running on port 3000");
});
