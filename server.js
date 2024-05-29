const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", (socket) => {
  console.log("Пользователь подключен");

  socket.on("join room", (room) => {
    socket.join(room);
    console.log(`Пользователь присоединился к комнате: ${room}`);
    io.to(room).emit(
      "system message",
      `Пользователь присоединился к комнате № ${room}`
    );
  });

  socket.on("chat message", (data) => {
    const { room, msg } = data;
    io.to(room).emit("chat message", msg);
  });

  socket.on("disconnect", () => {
    console.log("Пользователь отключен");
  });
});

server.listen(3000, () => {
  console.log("Сервер запущен через порт 3000");
});
