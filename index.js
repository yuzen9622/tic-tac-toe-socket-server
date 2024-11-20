const { Server } = require("socket.io");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const http = require("http");
const dotenv = require("dotenv");

/*socket server*/
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
    console.log(allPlayer);
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
/*web server*/
dotenv.config();

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.url === "/play" && req.method === "POST") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString(); // chunk 是 Buffer，需要轉成字串
    });
    req.on("end", async () => {
      console.log(JSON.parse(body).board);
      body = JSON.parse(body);
      const board = body.board;
      const genAI = new GoogleGenerativeAI(process.env.AISTUDIO_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-002" });
      const generationConfig = {
        temperature: 0,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      };

      const chatSession = model.startChat({
        generationConfig,
        history: [
          {
            role: "user",
            parts: [
              {
                text: "play tictactoe with me and board ['O','X','','','','','','O',''] and you are player X and O first and response me 0~8 position",
              },
            ],
          },
          {
            role: "model",
            parts: [
              {
                text: '```json\n{"board": ["O", "X", "X", "", "", "", "", "O", ""], "position": 2}\n\n```',
              },
            ],
          },
        ],
      });

      const result = await chatSession.sendMessage(` ${board}`);
      const response = JSON.parse(result.response.text());
      console.log(response);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(result.response.text());
    });
  } else {
    res.end("404 Not found");
  }
});
server.listen(8000, () => console.log("server is run at port 8000"));
