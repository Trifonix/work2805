let socket = io();
let count = 0;
let messagesStore = {}; // Объект для хранения сообщений по комнатам

let form = document.getElementById("form");
let input = document.getElementById("input");
let messages = document.getElementById("messages");
let roomSelect = document.getElementById("room");
let joinButton = document.getElementById("join");
let currentRoom = "1";
let currentRoomDisplay = document.getElementById("current-room");
let privateUserId = document.getElementById("private-user-id");
let privateMessage = document.getElementById("private-message");
let sendPrivateButton = document.getElementById("send-private");
let globalUsers = document.getElementById("global-users");
let roomUsers = document.getElementById("room-users");

// Функция для отображения сообщений из массива
function displayMessages(room) {
  messages.innerHTML = "";
  let roomMessages = messagesStore[room] || [];
  roomMessages.forEach((msg) => {
    let item = document.createElement("li");
    item.textContent = msg;
    messages.appendChild(item);
  });
  window.scrollTo(0, document.body.scrollHeight);
}

joinButton.addEventListener("click", function () {
  let selectedRoom = roomSelect.value;
  if (selectedRoom !== currentRoom) {
    // Сохранение текущих сообщений
    messagesStore[currentRoom] = Array.from(messages.children).map(
      (item) => item.textContent
    );

    // Оповещение сервера о выходе из текущей комнаты
    socket.emit("leave room", currentRoom);

    // Смена комнаты
    currentRoom = selectedRoom;
    socket.emit("join room", currentRoom);

    // Обнуление счетчика сообщений
    count = 0;

    // Отображение сообщений новой комнаты
    displayMessages(currentRoom);

    // Обновление отображения текущей комнаты
    currentRoomDisplay.textContent = `Пользователь присоединился к комнате: ${currentRoom}`;
  }
});

form.addEventListener("submit", function (e) {
  e.preventDefault();
  if (input.value) {
    socket.emit("chat message", { room: currentRoom, msg: input.value });
    input.value = "";
  }
});

sendPrivateButton.addEventListener("click", function () {
  if (privateUserId.value && privateMessage.value) {
    socket.emit("private message", {
      to: privateUserId.value,
      msg: privateMessage.value,
    });
    privateMessage.value = "";
  }
});

socket.on("chat message", function (msg) {
  count++;
  let item = document.createElement("li");
  item.textContent = `Сообщение № ${count}: ${msg}`;
  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);

  // Сохранение нового сообщения в хранилище
  if (!messagesStore[currentRoom]) {
    messagesStore[currentRoom] = [];
  }
  messagesStore[currentRoom].push(`Сообщение № ${count}: ${msg}`);
});

socket.on("private message", function (data) {
  let item = document.createElement("li");
  item.textContent = `Личное сообщение от ${data.from}: ${data.msg}`;
  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);
});

socket.on("online users", function (data) {
  globalUsers.textContent = data.global;
  roomUsers.textContent = data.rooms[currentRoom] || 0;
});

socket.on("system message", function (msg) {
  currentRoomDisplay.textContent = msg;
});

socket.on("connect", function () {
  console.log("Пользователь подключен в чат");
  socket.emit("join room", currentRoom);
});

socket.on("disconnect", function () {
  console.log("Пользователь покинул чат");
});

socket.on("connect_error", function (err) {
  console.error("Ошибка подключения:", err);
});
