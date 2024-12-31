const { Server } = require("socket.io");

/** 創建socket.io server
 * 設定跨來源資源共用
 * 創建allPlayer陣列，用於存放所有玩家資訊
 * 創建games陣列，用於存放所有遊戲資訊
 * 當socket連接時，將socket.id加入allUser中
 * @param {Object} socket
 */
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

  /**
   * 當socket接收到join事件時
   * 將玩家資訊加入allPlayer陣列
   * 發送allUser事件給所有玩家
   * @param {Object} data
   */
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
    console.log(allPlayer);
    io.emit("allUser", allPlayer);
  });

  /**
   * 當socket接收到playerMove事件時
   * 尋找recipientPlayer
   * 發送movePlayerFromServer事件給recipientPlayer
   * @param {Object} data
   */
  socket.on("playerMove", (data) => {
    const user = allPlayer.find(
      (user) => user.playerName.id === data.recipientPlayer.id
    );

    if (user) {
      io.to(user.socketId).emit("movePlayerFromServer", data);
    }
  });

  /**
   * 當socket接收到finish事件時
   * 尋找recipientPlayer
   * 發送finishState事件給recipientPlayer
   * @param {Object} data
   */

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
  /**
   * 當socket接收到findPlayer事件時
   * 尋找recipientPlayer
   * 發送recipientPlayerFound事件給recipientPlayer
   * 發送recipientPlayerFound事件給currentUser
   * @param {Object} data
   */
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

  /**
   * 當socket接收到disconnect事件時
   * 尋找currentUser
   * 將currentUser.online設為false
   * 將currentUser.playing設為false
   * 將currentUser從allPlayer中刪除
   * 將有在遊戲中的遊戲刪除
   * 發送oppentDisconnect事件給對手
   */

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

/**
 * 監聽port
 */
let port = process.env.PORT || 5000;
console.log("socket server online at ", port);
io.listen(port);
