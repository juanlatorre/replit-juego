import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { GameRoom } from "./game/GameRoom";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // === CONFIGURACIÓN WEBSOCKETS ===
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // Por simplicidad, usamos una única sala global.
  // En el futuro podrías crear un Map<string, GameRoom> para múltiples salas.
  const globalRoom = new GameRoom("global");

  wss.on("connection", (ws) => {
    console.log("Nuevo cliente WebSocket conectado");

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

    // Informar al cliente su ID
    const playerIndex = globalRoom.players.length;
    ws.send(JSON.stringify({ type: "WELCOME", playerId: playerIndex }));

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // Delegar la lógica a la sala
        if (msg.type === "INPUT") {
          globalRoom.handleInput(ws, "BOUNCE");
        } else if (msg.type === "START") {
          globalRoom.handleInput(ws, "START");
        }
      } catch (e) {
        console.error("Error procesando mensaje WS:", e);
      }
    });

    ws.on("close", () => {
      globalRoom.removePlayer(ws);
    });

    ws.on("error", (err) => {
      console.error("Error en WebSocket:", err);
    });
  });
  // ================================

  return httpServer;
}
