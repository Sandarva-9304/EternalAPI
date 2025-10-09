import { io, Socket } from "socket.io-client";
// const backendUrl = import.meta.env.BACKEND_URL || "http://127.0.0.1:3000";
const backendUrl = "https://eternalv2.onrender.com";
export const socket: Socket = io(`${backendUrl}`);
