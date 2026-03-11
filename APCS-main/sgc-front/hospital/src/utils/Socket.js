// src/utils/Socket.js
import { io } from "socket.io-client";

// later connect with your backend when real-time updates are ready
const socket = io("https://sgc-7zhd.onrender.com", {
  transports: ["websocket"],
});

export default socket;
