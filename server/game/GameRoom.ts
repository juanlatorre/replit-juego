import { WebSocket } from "ws";

// Constantes copiadas del cliente para asegurar sincronización
const SPEED_BY_DIFFICULTY = { easy: 0.2, normal: 0.35, hard: 0.55 };

interface PlayerState {
  id: number;
  ws: WebSocket;
  color: string;
  x: number;
  minX: number;
  maxX: number;
  direction: 1 | -1;
  speed: number;
  alive: boolean;
  shields: number;
}

export class GameRoom {
  players: PlayerState[] = [];
  isActive: boolean = false;
  loopId: NodeJS.Timeout | null = null;
  lastTime: number = 0;

  // Variables globales de la sala
  speedRampEnabled: boolean = false;
  difficulty: "easy" | "normal" | "hard" = "normal";

  constructor(public roomId: string) {}

  addPlayer(ws: WebSocket): boolean {
    // Máximo 4 jugadores y no unirse si ya empezó
    if (this.players.length >= 4 || this.isActive) return false;

    const id = this.players.length + 1;
    // Mismos colores que el frontend
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#FFE66D",
      "#95E1D3",
      "#F38181",
      "#AA96DA",
      "#FCBAD3",
      "#A8D8EA",
    ];

    this.players.push({
      id,
      ws,
      color: colors[id - 1] || "#FFF",
      x: 0.5,
      minX: 0,
      maxX: 1,
      direction: 1,
      speed: SPEED_BY_DIFFICULTY[this.difficulty],
      alive: true,
      shields: 1,
    });

    console.log(`[Sala ${this.roomId}] Jugador ${id} conectado.`);
    return true;
  }

  removePlayer(ws: WebSocket) {
    this.players = this.players.filter((p) => p.ws !== ws);
    console.log(
      `[Sala ${this.roomId}] Jugador desconectado. Restantes: ${this.players.length}`
    );

    if (this.players.length < 2) {
      this.stopGame();
      // Reiniciar sala si queda vacía o con 1
      this.isActive = false;
    }
  }

  handleInput(ws: WebSocket, type: string) {
    if (type === "START") {
      if (!this.isActive && this.players.length >= 2) {
        this.startGame();
      }
      return;
    }

    if (!this.isActive) return;

    const player = this.players.find((p) => p.ws === ws);
    if (!player || !player.alive) return;

    // === LÓGICA DE PERFECT PIVOT (SERVER SIDE - 8%) ===
    const currentBarWidth = player.maxX - player.minX;

    const distanceToTarget =
      player.direction === 1 ? player.maxX - player.x : player.x - player.minX;

    // 8% Threshold (Hardcore)
    const isPerfect =
      distanceToTarget < currentBarWidth * 0.08 && distanceToTarget > 0;

    let perfectTriggered = false;

    if (isPerfect) {
      // Premio: Expandir barra 5%
      const expansion = 0.05;
      player.minX = Math.max(0, player.minX - expansion);
      player.maxX = Math.min(1, player.maxX + expansion);
      perfectTriggered = true;
    } else {
      // Normal: Cortar barra
      if (player.direction === 1) player.maxX = player.x;
      else player.minX = player.x;
    }

    // Safety clamps para evitar bugs físicos
    const GRACE = 0.02;
    const width = player.maxX - player.minX;
    if (width < GRACE * 2) {
      player.x = (player.minX + player.maxX) / 2;
    } else {
      if (player.direction === 1)
        player.x = Math.max(player.minX + GRACE, player.x - GRACE);
      else player.x = Math.min(player.maxX - GRACE, player.x + GRACE);
    }

    player.direction *= -1; // Cambiar dirección

    // Enviar evento a todos para que el cliente haga "Juice" (sonidos, partículas)
    this.broadcast({
      type: "EVENT",
      payload: {
        name: perfectTriggered ? "PERFECT" : "BOUNCE",
        playerId: player.id,
        x: player.x,
        color: player.color,
      },
    });
  }

  startGame() {
    console.log(`[Sala ${this.roomId}] Juego iniciado.`);
    this.isActive = true;
    this.lastTime = Date.now();

    // Resetear jugadores
    this.players.forEach((p) => {
      p.x = 0.5;
      p.minX = 0;
      p.maxX = 1;
      p.alive = true;
      p.shields = 1;
      p.speed = SPEED_BY_DIFFICULTY[this.difficulty];
      // Dirección aleatoria
      p.direction = Math.random() > 0.5 ? 1 : -1;
    });

    this.broadcast({ type: "GAME_START" });

    // Iniciar loop a 60 FPS aprox (16ms)
    if (this.loopId) clearInterval(this.loopId);
    this.loopId = setInterval(() => this.update(), 1000 / 60);
  }

  stopGame() {
    this.isActive = false;
    if (this.loopId) {
      clearInterval(this.loopId);
      this.loopId = null;
    }
  }

  update() {
    const now = Date.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    const ACCELERATION = 0.03;
    const MAX_SPEED = 2.0;

    this.players.forEach((p) => {
      if (!p.alive) return;

      // Velocidad Progresiva (Ramp Up)
      if (this.speedRampEnabled && p.speed < MAX_SPEED) {
        p.speed += ACCELERATION * delta;
      }

      const move = p.speed * p.direction * delta;
      const newX = p.x + move;

      // Colisión con Borde
      if (newX <= p.minX || newX >= p.maxX) {
        if (p.shields > 0) {
          // Romper escudo
          p.shields--;
          p.direction *= -1;
          // Calcular rebote seguro
          p.x = newX <= p.minX ? p.minX + 0.02 : p.maxX - 0.02;
          this.broadcast({
            type: "EVENT",
            payload: { name: "SHIELD_BREAK", playerId: p.id },
          });
        } else {
          // Muerte
          p.alive = false;
          this.broadcast({
            type: "EVENT",
            payload: { name: "DEATH", playerId: p.id, x: p.x, color: p.color },
          });
        }
      } else {
        p.x = newX;
      }
    });

    // Enviar estado comprimido a todos (Snapshot)
    this.broadcast({
      type: "UPDATE",
      state: this.players.map((p) => ({
        id: p.id,
        x: p.x,
        minX: p.minX,
        maxX: p.maxX,
        alive: p.alive,
        color: p.color,
        shields: p.shields,
      })),
    });

    this.checkWinner();
  }

  checkWinner() {
    const alive = this.players.filter((p) => p.alive);
    if (alive.length <= 1) {
      this.stopGame();
      this.broadcast({
        type: "GAME_OVER",
        winnerId: alive.length === 1 ? alive[0].id : null,
      });
    }
  }

  broadcast(msg: any) {
    const data = JSON.stringify(msg);
    this.players.forEach((p) => {
      if (p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(data);
      }
    });
  }
}
