const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const connection = require("./db/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const SECRET_KEY = "some_secret_key";

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Регистрация пользователя
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send("Username and password are required");
  }

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      return res.status(500).send("Server error");
    }

    const query = "INSERT INTO users (username, password) VALUES (?, ?)";
    connection.query(query, [username, hash], (error, results) => {
      if (error) {
        return res.status(500).send("User already exists");
      }
      res.status(201).send("User registered successfully");
    });
  });
});

// Авторизация пользователя
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send("Username and password are required");
  }

  const query = "SELECT * FROM users WHERE username = ?";
  connection.query(query, [username], (error, results) => {
    if (error || results.length === 0) {
      return res.status(400).send("Invalid username or password");
    }

    const user = results[0];
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err || !isMatch) {
        return res.status(400).send("Invalid username or password");
      }

      const token = jwt.sign(
        { id: user.id, username: user.username },
        SECRET_KEY,
        {
          expiresIn: "1h",
        }
      );
      res.status(200).send({ token });
    });
  });
});

// Проверка JWT токена
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).send("Access denied");
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send("Invalid token");
    }
    req.user = decoded;
    next();
  });
};

// Пример защищенного маршрута
app.get("/protected", authenticate, (req, res) => {
  res.send("This is a protected route");
});

let onlineUsers = 0;
let roomUsers = {};

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.use(
  express.static("public", {
    setHeaders: (res, path) => {
      if (path.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css");
      }
    },
  })
);

io.on("connection", (socket) => {
  onlineUsers++;
  io.emit("online users", { global: onlineUsers, rooms: roomUsers });

  socket.on("join room", (room) => {
    socket.join(room);
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

  socket.on("chat message", (data) => {
    const { room, msg } = data;
    io.to(room).emit("chat message", msg);
  });

  socket.on("private message", (data) => {
    const { to, msg } = data;
    socket.to(to).emit("private message", { from: socket.id, msg });
  });

  socket.on("disconnect", () => {
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
