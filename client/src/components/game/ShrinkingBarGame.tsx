import { useEffect, useRef, useCallback } from "react";
import { useShrinkingBar, type Player, type Particle, type ScoreEntry, type Difficulty } from "@/lib/stores/useShrinkingBar";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const BAR_HEIGHT = 30;
const BAR_PADDING_X = 50;
const CURSOR_RADIUS = 12;

export function ShrinkingBarGame() {
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  const hitSoundRef = useRef<HTMLAudioElement | null>(null);
  const successSoundRef = useRef<HTMLAudioElement | null>(null);

  const {
    gameState,
    gameMode,
    difficulty,
    players,
    winner,
    particles,
    scores,
    joinPlayer,
    startGame,
    startPracticeGame,
    updatePlayers,
    updateParticles,
    handlePlayerInput,
    resetGame,
    resetScores,
    setDifficulty,
    setCallbacks,
  } = useShrinkingBar();

  useEffect(() => {
    // 2. Cargar el audio (la ruta es relativa a la carpeta public)
    musicRef.current = new Audio('/sounds/cat.mp3');
    musicRef.current.loop = true; // ¡Que no pare nunca!
    musicRef.current.volume = 0.4; // Ajusta el volumen (0.0 a 1.0)

    // 3. Intentar reproducir (los navegadores a veces bloquean el audio automático)
    const playMusic = async () => {
      try {
        await musicRef.current?.play();
      } catch (err) {
        console.log("Esperando interacción del usuario para reproducir música...");
      }
    };

    playMusic();

    // 4. Limpieza: Pausar si te sales del juego
    return () => {
      musicRef.current?.pause();
      musicRef.current = null;
    };
  }, []); // El [] asegura que solo se ejecute al montar el componente

  useEffect(() => {
    hitSoundRef.current = new Audio("/sounds/hit.mp3");
    hitSoundRef.current.volume = 0.3;
    successSoundRef.current = new Audio("/sounds/success.mp3");
    successSoundRef.current.volume = 0.5;

    setCallbacks({
      onPlayerEliminated: () => {
        if (hitSoundRef.current) {
          hitSoundRef.current.currentTime = 0;
          hitSoundRef.current.play().catch(() => {});
        }
      },
      onPlayerBounce: () => {
        if (hitSoundRef.current) {
          const bounce = hitSoundRef.current.cloneNode() as HTMLAudioElement;
          bounce.volume = 0.15;
          bounce.play().catch(() => {});
        }
      },
      onGameEnd: (winner) => {
        if (winner && successSoundRef.current) {
          successSoundRef.current.currentTime = 0;
          successSoundRef.current.play().catch(() => {});
        }
      },
    });
  }, [setCallbacks]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key;

      if (gameState === "lobby") {
        if (key === "1") {
          setDifficulty("easy");
        } else if (key === "2") {
          setDifficulty("normal");
        } else if (key === "3") {
          setDifficulty("hard");
        } else if (key === " " && players.length >= 2) {
          startGame();
        } else if (key.toLowerCase() === "m" && players.length >= 1) {
          startPracticeGame();
        } else if (key !== " " && key.toLowerCase() !== "m") {
          joinPlayer(key);
        }
      } else if (gameState === "playing") {
        handlePlayerInput(key);
      } else if (gameState === "ended") {
        if (key.toLowerCase() === "r") {
          resetGame();
        } else if (key.toLowerCase() === "c") {
          resetScores();
        }
      }
    },
    [gameState, players.length, difficulty, joinPlayer, startGame, startPracticeGame, handlePlayerInput, resetGame, resetScores, setDifficulty]
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
        drawLobby(ctx, players, difficulty, scores);
      } else if (gameState === "playing") {
        drawPlaying(ctx, players, particles);
      } else if (gameState === "ended") {
        drawEnded(ctx, winner, scores);
      }
    },
    [gameState, players, winner, particles, difficulty, scores]
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
        updateParticles(delta);
      }

      drawGame(ctx);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    },
    [gameState, updatePlayers, updateParticles, drawGame]
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
      <div className="mt-4 text-gray-400 text-sm text-center">
        {gameState === "lobby" && (
          <>
            <p>Presiona cualquier tecla para unirte | SPACE para iniciar (min 2 jugadores)</p>
            <p className="mt-1">M para modo practica (1 jugador vs IA) | 1/2/3 para cambiar dificultad</p>
          </>
        )}
        {gameState === "playing" && (
          <p>Presiona tu tecla asignada para rebotar y recortar tu barra</p>
        )}
        {gameState === "ended" && (
          <p>R para reiniciar | C para borrar puntuaciones</p>
        )}
      </div>
    </div>
  );
}

function drawLobby(ctx: CanvasRenderingContext2D, players: Player[], difficulty: Difficulty, scores: ScoreEntry[]) {
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("LOBBY", CANVAS_WIDTH / 2, 40);

  ctx.font = "14px Inter, sans-serif";
  ctx.fillStyle = "#aaaaaa";
  ctx.fillText("Presiona cualquier tecla para unirte", CANVAS_WIDTH / 2, 65);

  const diffColors: Record<Difficulty, string> = {
    easy: "#4ECDC4",
    normal: "#FFE66D",
    hard: "#FF6B6B",
  };
  const diffLabels: Record<Difficulty, string> = {
    easy: "Facil (1)",
    normal: "Normal (2)",
    hard: "Dificil (3)",
  };

  ctx.font = "16px Inter, sans-serif";
  ctx.fillStyle = "#888888";
  ctx.fillText("Dificultad:", CANVAS_WIDTH / 2, 95);

  const startX = CANVAS_WIDTH / 2 - 150;
  (["easy", "normal", "hard"] as Difficulty[]).forEach((d, i) => {
    const x = startX + i * 100;
    ctx.fillStyle = d === difficulty ? diffColors[d] : "#444444";
    ctx.fillRect(x, 105, 90, 25);
    ctx.fillStyle = d === difficulty ? "#000000" : "#888888";
    ctx.font = "12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(diffLabels[d], x + 45, 122);
  });

  if (players.length > 0) {
    ctx.font = "16px Inter, sans-serif";
    players.forEach((player, index) => {
      const y = 160 + index * 45;
      
      ctx.fillStyle = player.color;
      ctx.fillRect(CANVAS_WIDTH / 2 - 140, y - 12, 280, 35);
      
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.fillText(
        `Jugador ${player.id} - Tecla: "${player.key.toUpperCase()}"`,
        CANVAS_WIDTH / 2,
        y + 8
      );
    });
  }

  if (scores.length > 0) {
    ctx.fillStyle = "#FFE66D";
    ctx.font = "bold 14px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Puntuaciones:", 20, 400);
    
    const sortedScores = [...scores].sort((a, b) => b.wins - a.wins);
    sortedScores.slice(0, 4).forEach((score, i) => {
      ctx.fillStyle = score.color;
      ctx.font = "12px Inter, sans-serif";
      ctx.fillText(`[${score.key.toUpperCase()}]: ${score.wins} victoria${score.wins !== 1 ? 's' : ''}`, 20, 420 + i * 18);
    });
  }

  if (players.length >= 2) {
    ctx.fillStyle = "#4ECDC4";
    ctx.font = "bold 18px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SPACE para iniciar", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 60);
  }
  
  if (players.length >= 1) {
    ctx.fillStyle = "#AA96DA";
    ctx.font = "14px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("M para modo practica (vs IA)", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 35);
  }
  
  if (players.length === 0) {
    ctx.fillStyle = "#666666";
    ctx.font = "16px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Esperando jugadores...", CANVAS_WIDTH / 2, 200);
  }
}

function drawPlaying(ctx: CanvasRenderingContext2D, players: Player[], particles: Particle[]) {
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
    const label = player.isAI ? `IA` : `J${player.id} [${player.key.toUpperCase()}]`;
    ctx.fillText(label, BAR_PADDING_X, laneY - 8);
  });

  particles.forEach((particle) => {
    ctx.globalAlpha = particle.life / particle.maxLife;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * (particle.life / particle.maxLife), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawEnded(ctx: CanvasRenderingContext2D, winner: Player | null, scores: ScoreEntry[]) {
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px Inter, sans-serif";
  ctx.textAlign = "center";

  if (winner) {
    ctx.fillStyle = winner.color;
    const winnerLabel = winner.isAI ? "¡LA IA GANA!" : `¡JUGADOR ${winner.id} GANA!`;
    ctx.fillText(winnerLabel, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
    
    if (!winner.isAI) {
      ctx.font = "20px Inter, sans-serif";
      ctx.fillStyle = "#aaaaaa";
      ctx.fillText(`Tecla: "${winner.key.toUpperCase()}"`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }
  } else {
    ctx.fillStyle = "#ff6b6b";
    ctx.fillText("¡EMPATE!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
  }

  if (scores.length > 0) {
    ctx.font = "bold 16px Inter, sans-serif";
    ctx.fillStyle = "#FFE66D";
    ctx.fillText("Tabla de Puntuaciones", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
    
    const sortedScores = [...scores].sort((a, b) => b.wins - a.wins);
    ctx.font = "14px Inter, sans-serif";
    sortedScores.slice(0, 4).forEach((score, i) => {
      ctx.fillStyle = score.color;
      ctx.fillText(`[${score.key.toUpperCase()}]: ${score.wins} victoria${score.wins !== 1 ? 's' : ''}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 75 + i * 20);
    });
  }

  ctx.fillStyle = "#4ECDC4";
  ctx.font = "18px Inter, sans-serif";
  ctx.fillText("R para reiniciar | C para borrar puntuaciones", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40);
}
