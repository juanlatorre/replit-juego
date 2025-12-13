import { useEffect, useRef, useCallback } from "react";
import { useShrinkingBar, type Player } from "@/lib/stores/useShrinkingBar";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const BAR_HEIGHT = 30;
const BAR_PADDING_X = 50;
const CURSOR_RADIUS = 12;

export function ShrinkingBarGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const {
    gameState,
    players,
    winner,
    joinPlayer,
    startGame,
    updatePlayers,
    handlePlayerInput,
    resetGame,
  } = useShrinkingBar();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key;

      if (gameState === "lobby") {
        if (key === " " && players.length >= 2) {
          startGame();
        } else if (key !== " ") {
          joinPlayer(key);
        }
      } else if (gameState === "playing") {
        handlePlayerInput(key);
      } else if (gameState === "ended") {
        if (key.toLowerCase() === "r") {
          resetGame();
        }
      }
    },
    [gameState, players.length, joinPlayer, startGame, handlePlayerInput, resetGame]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const drawGame = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      if (gameState === "lobby") {
        drawLobby(ctx, players);
      } else if (gameState === "playing") {
        drawPlaying(ctx, players);
      } else if (gameState === "ended") {
        drawEnded(ctx, winner);
      }
    },
    [gameState, players, winner]
  );

  const gameLoop = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const delta = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = timestamp;

      if (gameState === "playing") {
        updatePlayers(delta);
      }

      drawGame(ctx);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    },
    [gameState, updatePlayers, drawGame]
  );

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [gameLoop]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <h1 className="text-4xl font-bold text-white mb-4">The Shrinking Bar</h1>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-gray-700 rounded-lg"
      />
      <div className="mt-4 text-gray-400 text-sm">
        {gameState === "lobby" && (
          <p>Presiona cualquier tecla para unirte | SPACE para iniciar (min 2 jugadores)</p>
        )}
        {gameState === "playing" && (
          <p>Presiona tu tecla asignada para rebotar y recortar tu barra</p>
        )}
        {gameState === "ended" && (
          <p>Presiona R para reiniciar</p>
        )}
      </div>
    </div>
  );
}

function drawLobby(ctx: CanvasRenderingContext2D, players: Player[]) {
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("LOBBY", CANVAS_WIDTH / 2, 50);

  ctx.font = "18px Inter, sans-serif";
  ctx.fillStyle = "#aaaaaa";
  ctx.fillText("Presiona cualquier tecla para unirte", CANVAS_WIDTH / 2, 80);

  if (players.length > 0) {
    ctx.font = "16px Inter, sans-serif";
    players.forEach((player, index) => {
      const y = 130 + index * 50;
      
      ctx.fillStyle = player.color;
      ctx.fillRect(CANVAS_WIDTH / 2 - 150, y - 15, 300, 40);
      
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.fillText(
        `Jugador ${player.id} - Tecla: "${player.key.toUpperCase()}"`,
        CANVAS_WIDTH / 2,
        y + 10
      );
    });
  }

  if (players.length >= 2) {
    ctx.fillStyle = "#4ECDC4";
    ctx.font = "bold 20px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Presiona SPACE para iniciar", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 50);
  } else if (players.length === 1) {
    ctx.fillStyle = "#FFE66D";
    ctx.font = "16px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Esperando más jugadores... (mínimo 2)", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 50);
  }
}

function drawPlaying(ctx: CanvasRenderingContext2D, players: Player[]) {
  const barWidth = CANVAS_WIDTH - BAR_PADDING_X * 2;

  players.forEach((player, index) => {
    const laneY = 80 + index * 100;

    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 2;
    ctx.strokeRect(BAR_PADDING_X, laneY, barWidth, BAR_HEIGHT);

    if (player.alive) {
      const activeStartX = BAR_PADDING_X + player.minX * barWidth;
      const activeWidth = (player.maxX - player.minX) * barWidth;
      
      ctx.fillStyle = player.color;
      ctx.fillRect(activeStartX, laneY, activeWidth, BAR_HEIGHT);

      const cursorX = BAR_PADDING_X + player.x * barWidth;
      const cursorY = laneY + BAR_HEIGHT / 2;

      ctx.beginPath();
      ctx.arc(cursorX, cursorY, CURSOR_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      if (player.direction === 1) {
        ctx.moveTo(cursorX - 4, cursorY - 4);
        ctx.lineTo(cursorX + 4, cursorY);
        ctx.lineTo(cursorX - 4, cursorY + 4);
      } else {
        ctx.moveTo(cursorX + 4, cursorY - 4);
        ctx.lineTo(cursorX - 4, cursorY);
        ctx.lineTo(cursorX + 4, cursorY + 4);
      }
      ctx.fillStyle = "#000000";
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
      ctx.fillRect(BAR_PADDING_X, laneY, barWidth, BAR_HEIGHT);
      
      ctx.fillStyle = "#ff0000";
      ctx.font = "bold 16px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ELIMINADO", CANVAS_WIDTH / 2, laneY + BAR_HEIGHT / 2 + 5);
    }

    ctx.fillStyle = player.color;
    ctx.font = "14px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`J${player.id} [${player.key.toUpperCase()}]`, BAR_PADDING_X, laneY - 8);
  });
}

function drawEnded(ctx: CanvasRenderingContext2D, winner: Player | null) {
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px Inter, sans-serif";
  ctx.textAlign = "center";

  if (winner) {
    ctx.fillStyle = winner.color;
    ctx.fillText(`¡JUGADOR ${winner.id} GANA!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    
    ctx.font = "20px Inter, sans-serif";
    ctx.fillStyle = "#aaaaaa";
    ctx.fillText(`Tecla: "${winner.key.toUpperCase()}"`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
  } else {
    ctx.fillStyle = "#ff6b6b";
    ctx.fillText("¡EMPATE!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }

  ctx.fillStyle = "#4ECDC4";
  ctx.font = "18px Inter, sans-serif";
  ctx.fillText("Presiona R para reiniciar", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
}
