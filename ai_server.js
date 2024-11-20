const { GoogleGenerativeAI } = require("@google/generative-ai");
const http = require("http");
const dotenv = require("dotenv");
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
server.listen(5000, () => console.log("server is run at port 5000"));
