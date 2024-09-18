const { Server } = require("socket.io");
const { createServer } = require("http");
const { on } = require("events");
const { sourceMapsEnabled } = require("process");
const { log } = require("console");
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: "http:/localhost:3000",
});
const allUser = {};

io.on("connection", (socket) => {
  allUser[socket.id] = {
    socket: socket,
    online: true,
  };

  socket.on("join", (data) => {
    const currentUser = allUser[socket.id];
    currentUser.playerName = data.playerName;

    let recipientPlayer;
    for (const key in allUser) {
      const user = allUser[key];
      if (user.online && !user.playing && socket.id !== key) {
        recipientPlayer = user;
        user.playing = true;
        currentUser.playing = true;
        break;
      }
    }

    if (recipientPlayer) {
      recipientPlayer.socket.emit("recipientPlayerFound", {
        recipientName: currentUser.playerName,
        playingAs: "X",
      });
      currentUser.socket.emit("recipientPlayerFound", {
        recipientName: recipientPlayer.playerName,
        playingAs: "O",
      });

      currentUser.socket.on("playerMove", (data) => {
        recipientPlayer.socket.emit("movePlayerFromServer", data);
      });

      recipientPlayer.socket.on("playerMove", (data) => {
        currentUser.socket.emit("movePlayerFromServer", data);
      });
      currentUser.socket.on("finish", (data) => {
        recipientPlayer.playing = false;
        recipientPlayer.socket.emit("finishState", data);
      });

      recipientPlayer.socket.on("finish", (data) => {
        currentUser.playing = false;
        currentUser.socket.emit("finishState", data);
      });
    } else {
      currentUser.socket.emit("recipientPlayerNotFound");
    }
  });

  socket.on("disconnect", () => {
    const currentUser = allUser[socket.id];
    currentUser.online = false;
  });
});
let port = 8080;
console.log("socket server online at ", port);
httpServer.listen(port);
