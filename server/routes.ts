import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { GameRoom } from "./game/GameRoom";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // === CONFIGURACIÓN WEBSOCKETS ===
  console.log("🔧 Configurando servidor WebSocket en path: /ws");
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws",
    perMessageDeflate: false  // Disable compression for debugging
  });

  wss.on("error", (error) => {
    console.error("❌ Error en servidor WebSocket:", error);
  });

  wss.on("listening", () => {
    console.log("✅ Servidor WebSocket escuchando");
  });

  // Por simplicidad, usamos una única sala global.
  // En el futuro podrías crear un Map<string, GameRoom> para múltiples salas.
  const globalRoom = new GameRoom("global");

  wss.on("connection", (ws, req) => {
    console.log("🔌 Nuevo cliente WebSocket conectado!");
    console.log(`🌐 URL de conexión: ${req.url}`);
    console.log(`🌐 Headers:`, req.headers);
    console.log(`📊 Estado actual de la sala: ${globalRoom.players.length} jugadores, activa: ${globalRoom.isActive}`);

    // Intentar unir al jugador a la sala global
    const joined = globalRoom.addPlayer(ws);

    if (!joined) {
      // Si la sala está llena o el juego ya empezó
      console.log("❌ Jugador rechazado: sala llena o partida en curso");
      ws.send(
        JSON.stringify({ type: "ERROR", msg: "Sala llena o partida en curso" })
      );
      ws.close();
      return;
    }

    // Informar al cliente su ID
    const playerIndex = globalRoom.players.length;
    console.log(`✅ Jugador ${playerIndex} unido exitosamente. Total: ${globalRoom.players.length} jugadores`);
    ws.send(JSON.stringify({ type: "WELCOME", playerId: playerIndex }));

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        console.log(`📨 Mensaje recibido: ${msg.type}`);

        // Delegar la lógica a la sala
        if (msg.type === "INPUT") {
          globalRoom.handleInput(ws, "BOUNCE");
        } else if (msg.type === "START") {
          console.log(`🎮 Solicitud para iniciar juego recibida. Jugadores: ${globalRoom.players.length}, Activo: ${globalRoom.isActive}`);
          globalRoom.handleInput(ws, "START");
        }
      } catch (e) {
        console.error("❌ Error procesando mensaje WS:", e);
      }
    });

    ws.on("close", () => {
      globalRoom.removePlayer(ws);
    });

    ws.on("error", (err) => {
      console.error("Error en WebSocket:", err);
    });
  });

  console.log("✅ Servidor WebSocket configurado exitosamente");
  // ================================

  return httpServer;
}
