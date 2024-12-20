const { Server } = require("socket.io");
const io = new Server({
  cors: "*",
});
const allUser = {};
let allPlayer = [];
let games = [];
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

    io.emit("allUser", allPlayer);
  });

  socket.on("playerMove", (data) => {
    const user = allPlayer.find(
      (user) => user.playerName.id === data.recipientPlayer.id
    );

    if (user) {
      io.to(user.socketId).emit("movePlayerFromServer", data);
    }
  });

  socket.on("finish", (data) => {
    const recipientPlayer = allPlayer.find(
      (user) => user.playerName.id === data.recipientPlayer.id
    );
    const currentPlayer = allPlayer.find(
      (user) => user.playerName.id === data.userId
    );
    if (recipientPlayer) {
      games = games.filter((game) => {
        if (
          game.members.find((member) => member === recipientPlayer.socketId)
        ) {
          return false;
        }
        return true;
      });
      allPlayer.map((item) => {
        if (item.socketId === recipientPlayer.socketId) {
          item.playing = false;
        } else if (item.socketId === currentPlayer.socketId) {
          item.playing = false;
        }
      });
      io.to(recipientPlayer.socketId).emit("finishState", data.winner);
      setTimeout(() => {
        io.emit("allUser", allPlayer);
      }, 3000);
    }
  });
  socket.on("findPlayer", (data) => {
    let recipientPlayer = allPlayer.find(
      (user) => user.socketId === data.socketId
    );

    let currentUser = allPlayer.find(
      (user) => user.playerName.id === data.userId
    );

    if (recipientPlayer) {
      allPlayer.map((item) => {
        if (item.socketId === recipientPlayer.socketId) {
          item.playing = true;
        } else if (item.socketId === currentUser.socketId) {
          item.playing = true;
        }
      });
      let game = {
        members: [currentUser.socketId, recipientPlayer.socketId],
      };
      games.push(game);
      io.emit("allUser", allPlayer);
      io.to(recipientPlayer.socketId).emit("recipientPlayerFound", {
        recipientName: currentUser.playerName,
        playingAs: "X",
      });
      io.to(currentUser.socketId).emit("recipientPlayerFound", {
        recipientName: recipientPlayer.playerName,
        playingAs: "O",
      });
    }
  });

  socket.on("disconnect", () => {
    const currentUser = allUser[socket.id];
    currentUser.online = false;
    allPlayer.forEach((item, key) => {
      if (item.socketId === socket.id) {
        item.online = false;
        allPlayer.splice(key, 1);
      }
    });
    let disconnectedGame = games.find((game) =>
      game.members.find((member) => member === socket.id)
    );
    console.log(disconnectedGame);
    games = games.filter((game) => {
      if (game.members.find((member) => member === socket.id)) {
        return false;
      }
      return true;
    });
    if (disconnectedGame) {
      let disconnectUserSocketId = disconnectedGame.members.find(
        (member) => member !== socket.id
      );

      allPlayer.forEach((item, key) => {
        if (item.socketId === disconnectUserSocketId) {
          item.playing = false;
        }
      });
      io.to(disconnectUserSocketId).emit("oppentDisconnect", "disconnect");
    }
    //console.log(allUser);
    io.emit("allUser", allPlayer);
  });
});
let port = process.env.PORT || 5000;
console.log("socket server online at ", port);
io.listen(port);
