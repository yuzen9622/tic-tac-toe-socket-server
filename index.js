const { Server } = require("socket.io");
const { createServer } = require("http");
const { on } = require("events");
const { sourceMapsEnabled } = require("process");
const { log } = require("console");
const httpServer = createServer();
const io = new Server({
  cors: "*",
});
const allUser = {};
let allPlayer = [];
io.on("connection", (socket) => {
  allUser[socket.id] = {
    socket: socket,
    online: true,
  };

  socket.on("join", (data) => {
    allPlayer.forEach((player, index) => {
      if (player.playerName.id === data.playerName.id) {
        allPlayer.splice(index, 1);
      }
    });

    allPlayer.push({
      socketId: socket.id,
      playerName: data.playerName,
      playing: false,
      online: true,
    });

    const currentUser = allUser[socket.id];
    currentUser.playerName = data.playerName;

    io.emit("allUser", allPlayer);

    let recipientPlayer;
    socket.on("findPlayer", (socketId) => {
      recipientPlayer = allUser[socketId];
      if (recipientPlayer) {
        allPlayer.map((item) => {
          if (item.socketId === recipientPlayer.socket.id) {
            item.playing = true;
          } else if (item.socketId === currentUser.socket.id) {
            item.playing = true;
          }
        });

        io.emit("allUser", allPlayer);
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
          recipientPlayer.online = false;
          allPlayer.map((item) => {
            if (item.socketId === recipientPlayer.socket.id) {
              item.playing = false;
            } else if (item.socketId === currentUser.socket.id) {
              item.playing = false;
            }
          });
          setTimeout(() => {
            io.emit("allUser", allPlayer);
          }, 3000);

          recipientPlayer.socket.emit("finishState", data);
        });

        recipientPlayer.socket.on("finish", (data) => {
          currentUser.playing = false;
          currentUser.online = false;
          allPlayer.map((item) => {
            if (item.socketId === recipientPlayer.socket.id) {
              item.playing = false;
            } else if (item.socketId === currentUser.socket.id) {
              item.playing = false;
            }
          });
          setTimeout(() => {
            io.emit("allUser", allPlayer);
          }, 3000);
          currentUser.socket.emit("finishState", data);
        });
      } else {
        currentUser.socket.emit("recipientPlayerNotFound");
      }
    });
  });

  socket.on("disconnect", () => {
    const currentUser = allUser[socket.id];
    currentUser.online = false;
    allPlayer.filter((item) => {
      if (item.socketId === socket.id) {
        item.online = false;
      }
    });
    io.emit("allUser", allPlayer);
  });
});
let port = process.env.PORT || 5000;
console.log("socket server online at ", port);
io.listen(port);
