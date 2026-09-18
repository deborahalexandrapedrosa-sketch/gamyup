import type { Server } from "socket.io";

let ioInstance: Server | null = null;

export function setIO(io: Server) {
  ioInstance = io;
}

export function getIO(): Server {
  if (!ioInstance) throw new Error("Socket.io não inicializado ainda");
  return ioInstance;
}

export function sessionRoom(id: number) {
  return `session:${id}`;
}

export function activityRoom(id: number) {
  return `activity:${id}`;
}
