import { Server } from "socket.io";
const io = new Server(3000);
io.on("connection", (socket) => {
  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });
});
