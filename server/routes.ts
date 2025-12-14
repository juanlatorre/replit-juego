import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { GameRoom } from "./game/GameRoom";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // === CONFIGURACIÓN WEBSOCKETS ===
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws",
    perMessageDeflate: false  // Disable compression for debugging
  });

  wss.on("error", (error) => {
    console.error("WebSocket server error:", error);
  });

  // Por simplicidad, usamos una única sala global.
  // En el futuro podrías crear un Map<string, GameRoom> para múltiples salas.
  const globalRoom = new GameRoom("global");

  wss.on("connection", (ws, _req) => {

    // Intentar unir al jugador a la sala global
    const joined = globalRoom.addPlayer(ws);

    if (!joined) {
      // Si la sala está llena o el juego ya empezó
      ws.send(
        JSON.stringify({ type: "ERROR", msg: "Sala llena o partida en curso" })
      );
      ws.close();
      return;
    }

    // Informar al cliente su ID y la lista completa de jugadores
    const playerIndex = globalRoom.players.length;

    // Send welcome message to the new player
    ws.send(JSON.stringify({ type: "WELCOME", playerId: playerIndex }));

    // Send updated player list to ALL clients
    globalRoom.broadcastPlayerList();

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // Delegar la lógica a la sala
        if (msg.type === "INPUT") {
          globalRoom.handleInput(ws, "BOUNCE");
        } else if (msg.type === "START") {
          globalRoom.handleInput(ws, "START");
        } else if (msg.type === "REMATCH") {
          globalRoom.handleRematch();
        } else if (msg.type === "SET_DIFFICULTY") {
          globalRoom.setDifficulty(msg.difficulty);
        } else if (msg.type === "TOGGLE_SPEED_RAMP") {
          globalRoom.setSpeedRamp(msg.enabled);
        }
      } catch (e) {
        console.error("Error processing WS message:", e);
      }
    });

    ws.on("close", () => {
      globalRoom.removePlayer(ws);
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err);
    });
  });
  // ================================

  return httpServer;
}
