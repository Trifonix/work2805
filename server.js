const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let onlineUsers = 0;
let roomUsers = {};

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", (socket) => {
  onlineUsers++;
  io.emit("online users", { global: onlineUsers, rooms: roomUsers });

  // console.log("Пользователь подключен");

  socket.on("join room", (room) => {
    socket.join(room);
    // console.log();
    if (!roomUsers[room]) {
      roomUsers[room] = 0;
    }
    roomUsers[room]++;
    io.emit("online users", { global: onlineUsers, rooms: roomUsers });

    socket.currentRoom = room;
    socket.emit(
      "system message",
      `Пользователь присоединился к комнате: ${room}`
    );
  });

  socket.on("leave room", (room) => {
    socket.leave(room);

    if (roomUsers[room]) {
      roomUsers[room]--;
      if (roomUsers[room] === 0) {
        delete roomUsers[room];
      }
    }
    io.emit("online users", { global: onlineUsers, rooms: roomUsers });
  });
  //
  socket.on("chat message", (data) => {
    const { room, msg } = data;
    io.to(room).emit("chat message", msg);
  });

  socket.on("private message", (data) => {
    const { to, msg } = data;
    socket.to(to).emit("private message", { from: socket.id, msg });
  });

  socket.on("disconnect", () => {
    // console.log("Пользователь отключен");
    onlineUsers--;

    if (socket.currentRoom && roomUsers[socket.currentRoom]) {
      roomUsers[socket.currentRoom]--;
      if (roomUsers[socket.currentRoom] === 0) {
        delete roomUsers[socket.currentRoom];
      }
    }
    io.emit("online users", { global: onlineUsers, rooms: roomUsers });
  });
});

server.listen(3000, () => {
  console.log("Сервер запущен через порт 3000");
});
