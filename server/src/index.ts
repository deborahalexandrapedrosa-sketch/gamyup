import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "node:http";
import { Server } from "socket.io";
import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { participantRouter } from "./routes/participant";
import { setIO, sessionRoom, activityRoom } from "./io";

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((origin) => origin.trim())
  : "*";

const app = express();
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api", participantRouter);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: allowedOrigins } });
setIO(io);

io.on("connection", (socket) => {
  socket.on("join:session", (sessionId: number) => {
    socket.join(sessionRoom(Number(sessionId)));
  });
  socket.on("leave:session", (sessionId: number) => {
    socket.leave(sessionRoom(Number(sessionId)));
  });
  socket.on("join:activity", (activityId: number) => {
    socket.join(activityRoom(Number(activityId)));
  });
  socket.on("leave:activity", (activityId: number) => {
    socket.leave(activityRoom(Number(activityId)));
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
