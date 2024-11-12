const { Server } = require("socket.io");
const { createServer } = require("http");
const { on } = require("events");
const { sourceMapsEnabled } = require("process");
const { log } = require("console");
const httpServer = createServer();
const io = new Server({
  cors: "*",
});
const allUser = [];
let allPlayer = [];
io.on("connection", (socket) => {
  socket.on("join", (data) => {
    allPlayer.forEach((player, index) => {
      if (player.playerName.id === data.playerName.id) {
        allPlayer.splice(index, 1);
      }
    });
    allUser.forEach((player, index) => {
      if (player.playerName.id === data.playerName.id) {
        allUser.splice(index, 1);
      }
    });
    allUser.push({
      socketId: socket.id,
      playerName: data.playerName,
      playing: false,
      online: true,
      socket: socket,
    });
    allPlayer.push({
      socketId: socket.id,
      playerName: data.playerName,
      playing: false,
      online: true,
    });
    console.log(allPlayer);
    io.emit("allUser", allPlayer);
    const currentUser = allUser.find((item) => item?.socketId === socket.id);
    currentUser.playerName = data.playerName;
    console.log(allPlayer);

    let recipientPlayer = null;
    socket.on("findPlayer", (userId) => {
      recipientPlayer = allUser.find((item) => item.playerName.id === userId);
      if (recipientPlayer) {
        allPlayer.map((item) => {
          if (
            item.playerName.id === recipientPlayer.playerName.id ||
            item.playerName.id === currentUser.playerName.id
          ) {
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
            if (
              item.playerName.id === recipientPlayer.playerName.id ||
              item.playerName.id === currentUser.playerName.id
            ) {
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
            if (
              item.playerName.id === recipientPlayer.playerName.id ||
              item.playerName.id === currentUser.playerName.id
            ) {
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
    allUser.forEach((item, key) => {
      if (item.socketId === socket.id) {
        item.online = false;
        allUser.splice(key, 1);
      }
    });
    allPlayer.forEach((item, key) => {
      if (item.socketId === socket.id) {
        item.online = false;
        allPlayer.splice(key, 1);
      }
    });
    console.log(allUser);
    io.emit("allUser", allPlayer);
  });
});
let port = process.env.PORT || 5000;
console.log("socket server online at ", port);
io.listen(port);

// const { Server } = require("socket.io");
// const { createServer } = require("http");
// const httpServer = createServer();
// const io = new Server(httpServer, {
//   cors: "*",
// });

// const allUser = {};
// let allPlayer = [];

// io.on("connection", (socket) => {
//   allUser[socket.id] = {
//     socket: socket,
//     online: true,
//   };

//   socket.on("join", (data) => {
//     // 避免同一玩家重複加入
//     allPlayer = allPlayer.filter(
//       (player) => player.playerName.id !== data.playerName.id
//     );

//     // 新增玩家
//     allPlayer.push({
//       socketId: socket.id,
//       playerName: data.playerName,
//       playing: false,
//       online: true,
//     });

//     const currentUser = allUser[socket.id];
//     currentUser.playerName = data.playerName;
//     console.log(allPlayer);
//     io.emit("allUser", allPlayer);

//     socket.on("findPlayer", (socketId) => {
//       const recipientPlayer = allUser[socketId];
//       if (!recipientPlayer) {
//         return currentUser.socket.emit("recipientPlayerNotFound");
//       }

//       // 設置雙方為正在遊戲狀態
//       [currentUser, recipientPlayer].forEach((player) => {
//         player.online = true;
//         player.playing = true;
//         allPlayer = allPlayer.map((item) =>
//           item.socketId === player.socket.id ? { ...item, playing: true } : item
//         );
//       });

//       io.emit("allUser", allPlayer);

//       // 通知雙方開始遊戲
//       currentUser.socket.emit("recipientPlayerFound", {
//         recipientName: recipientPlayer.playerName,
//         playingAs: "X",
//       });
//       recipientPlayer.socket.emit("recipientPlayerFound", {
//         recipientName: currentUser.playerName,
//         playingAs: "O",
//       });

//       // 單次註冊事件
//       const playerMoveHandler = (data) =>
//         recipientPlayer.socket.emit("movePlayerFromServer", data);
//       const recipientMoveHandler = (data) =>
//         currentUser.socket.emit("movePlayerFromServer", data);

//       currentUser.socket.on("playerMove", playerMoveHandler);
//       recipientPlayer.socket.on("playerMove", recipientMoveHandler);

//       const finishHandler = (data) => {
//         [currentUser, recipientPlayer].forEach((player) => {
//           player.playing = false;
//           player.online = false;
//           allPlayer = allPlayer.map((item) =>
//             item.socketId === player.socket.id
//               ? { ...item, playing: false }
//               : item
//           );
//         });
//         setTimeout(() => {
//           io.emit("allUser", allPlayer);
//         }, 3000);

//         recipientPlayer.socket.emit("finishState", data);
//       };

//       currentUser.socket.on("finish", finishHandler);
//       recipientPlayer.socket.on("finish", finishHandler);
//     });
//   });

//   socket.on("disconnect", () => {
//     const currentUser = allUser[socket.id];
//     if (currentUser) {
//       currentUser.online = false;
//       allPlayer = allPlayer.filter((item) => item.socketId !== socket.id);
//       console.log(allUser);
//       io.emit("allUser", allPlayer);
//     }
//   });
// });

// let port = process.env.PORT || 5000;
// httpServer.listen(port, () => console.log("Socket server online at", port));
