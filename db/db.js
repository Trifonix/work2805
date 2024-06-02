const mysql = require("mysql");

const connection = mysql.createConnection({
  host: "MySQL-8.2",
  user: "root",
  password: "",
  database: "db_for_chat",
});

connection.connect((err) => {
  if (err) {
    console.error("Ошибка подключения к базе данных:", err);
    return;
  }
  console.log("Подключение к базе данных MySQL успешно установлено");
});

module.exports = connection;
