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
    speedRampEnabled,
    countdown,
    
    // === JUICY VARS ===
    screenShake,
    hitStop,
    updateJuice,
    // =================

    joinPlayer,
    startGame,
    startPracticeGame,
    updatePlayers,
    updateParticles,
    updateCountdown,
    handlePlayerInput,
    resetGame,
    rematch,
    resetScores,
    setDifficulty,
    toggleSpeedRamp,
    setCallbacks,
  } = useShrinkingBar();

  useEffect(() => {
    musicRef.current = new Audio('/sounds/cat.mp3');
    musicRef.current.loop = true;
    musicRef.current.volume = 0.2;

    const playMusic = async () => {
      try {
        await musicRef.current?.play();
      } catch (err) {
        console.log("Esperando interacción del usuario para reproducir música...");
      }
    };

    playMusic();

    return () => {
      musicRef.current?.pause();
      musicRef.current = null;
    };
  }, []);

  useEffect(() => {
    hitSoundRef.current = new Audio("/sounds/hit.mp3");
    hitSoundRef.current.volume = 0.3;
    successSoundRef.current = new Audio("/sounds/success.mp3");
    successSoundRef.current.volume = 0.5;

    setCallbacks({
      onPlayerEliminated: () => {
        if (hitSoundRef.current) {
          hitSoundRef.current.currentTime = 0;
          hitSoundRef.current.playbackRate = 1.0; 
          hitSoundRef.current.volume = 0.4;
          hitSoundRef.current.play().catch(() => {});
        }
      },
      onPlayerBounce: () => {
        if (hitSoundRef.current) {
          const bounce = hitSoundRef.current.cloneNode() as HTMLAudioElement;
          bounce.volume = 0.7; 
          bounce.playbackRate = 3.0;
          // @ts-ignore
          if (bounce.preservesPitch !== undefined) bounce.preservesPitch = false;
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
        } else if (key.toLowerCase() === "s") {
          toggleSpeedRamp();
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
          rematch();
        } else if (key.toLowerCase() === "l") {
          resetGame();
        } else if (key.toLowerCase() === "c") {
          resetScores();
        }
      }
    },
    [gameState, players.length, difficulty, joinPlayer, startGame, startPracticeGame, handlePlayerInput, resetGame, rematch, resetScores, setDifficulty, toggleSpeedRamp]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const drawGame = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // === APLICAR SCREEN SHAKE (TEMBLOR) ===
      ctx.save();
      if (screenShake > 0) {
        const dx = (Math.random() - 0.5) * screenShake;
        const dy = (Math.random() - 0.5) * screenShake;
        ctx.translate(dx, dy);
      }
      // =====================================

      if (gameState === "lobby") {
        drawLobby(ctx, players, difficulty, scores, speedRampEnabled);
      } else if (gameState === "playing") {
        drawPlaying(ctx, players, particles);
      } else if (gameState === "countdown") {
        drawPlaying(ctx, players, particles); 
        drawCountdown(ctx, countdown);
      } else if (gameState === "ended") {
        drawEnded(ctx, winner, scores);
      }

      // Restaurar el contexto (quitar el shake para el siguiente frame)
      ctx.restore();
    },
    [gameState, players, winner, particles, difficulty, scores, speedRampEnabled, countdown, screenShake]
  );

  const gameLoop = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const delta = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = timestamp;

      // === ACTUALIZAR JUICE (Decaer shake y hitstop) ===
      updateJuice(delta);
      // ===============================================

      if (gameState === "playing") {
        // === HIT STOP: SOLO ACTUALIZAR SI NO ESTAMOS EN PAUSA ===
        if (hitStop <= 0) {
          updatePlayers(delta);
          updateParticles(delta);
        }
        // ======================================================
      } else if (gameState === "countdown") {
        updateCountdown(delta);
      }

      drawGame(ctx);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    },
    [gameState, updatePlayers, updateParticles, updateCountdown, drawGame, updateJuice, hitStop]
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
            <p className="mt-1">M: Modo práctica | 1-3: Dificultad | S: Velocidad Progresiva</p>
          </>
        )}
        {gameState === "countdown" && (
          <p className="text-yellow-400 font-bold">¡PREPÁRATE!</p>
        )}
        {gameState === "playing" && (
          <p>Presiona tu tecla asignada para rebotar y recortar tu barra</p>
        )}
        {gameState === "ended" && (
          <p>R: Revancha (Mismos jugadores) | L: Lobby/Menu | C: Borrar Puntuaciones</p>
        )}
      </div>
    </div>
  );
}

function drawCountdown(ctx: CanvasRenderingContext2D, countdown: number) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const value = Math.ceil(countdown);
  
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 150px Inter, sans-serif";
  ctx.shadowColor = "black";
  ctx.shadowBlur = 20;

  if (value > 0) {
    if (value === 3) ctx.fillStyle = "#FF6B6B";
    else if (value === 2) ctx.fillStyle = "#FFE66D";
    else ctx.fillStyle = "#4ECDC4";
    
    ctx.fillText(value.toString(), CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 120px Inter, sans-serif";
    ctx.fillText("GO!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }

  ctx.shadowBlur = 0;
}

function drawLobby(ctx: CanvasRenderingContext2D, players: Player[], difficulty: Difficulty, scores: ScoreEntry[], speedRampEnabled: boolean) {
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

  const rampY = 145;
  ctx.font = "14px Inter, sans-serif";
  ctx.textAlign = "center";
  if (speedRampEnabled) {
    ctx.fillStyle = "#FF5555";
    ctx.fillText(">> VELOCIDAD PROGRESIVA: ON (S) <<", CANVAS_WIDTH / 2, rampY);
  } else {
    ctx.fillStyle = "#444444";
    ctx.fillText("Velocidad Progresiva: OFF (S)", CANVAS_WIDTH / 2, rampY);
  }

  if (players.length > 0) {
    ctx.font = "16px Inter, sans-serif";
    players.forEach((player, index) => {
      const y = 170 + index * 45;
      
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
    ctx.fillText("Esperando jugadores...", CANVAS_WIDTH / 2, 220);
  }
}

function drawPlaying(ctx: CanvasRenderingContext2D, players: Player[], particles: Particle[]) {
  const barWidth = CANVAS_WIDTH - BAR_PADDING_X * 2;

  players.forEach((player, index) => {
    const laneY = 80 + index * 100;

    // === EFECTO NEÓN EN BARRAS ===
    if (player.alive) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = player.color;
    }
    // ============================

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

      // Apagamos neón para que no afecte a textos si hubiera
      ctx.shadowBlur = 0;

    } else {
      ctx.shadowBlur = 0; // Aseguramos que esté apagado
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
    // === EFECTO NEÓN EN PARTÍCULAS ===
    ctx.shadowBlur = 10;
    ctx.shadowColor = particle.color;
    // ================================

    ctx.globalAlpha = particle.life / particle.maxLife;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * (particle.life / particle.maxLife), 0, Math.PI * 2);
    ctx.fill();
    
    // Apagamos neón
    ctx.shadowBlur = 0;
  });
  ctx.globalAlpha = 1;
}

function drawEnded(ctx: CanvasRenderingContext2D, winner: Player | null, scores: ScoreEntry[]) {
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px Inter, sans-serif";
  ctx.textAlign = "center";

  if (winner) {
    ctx.fillStyle = winner.color;
    // Neón para el ganador también
    ctx.shadowBlur = 20;
    ctx.shadowColor = winner.color;
    
    const winnerLabel = winner.isAI ? "¡LA IA GANA!" : `¡JUGADOR ${winner.id} GANA!`;
    ctx.fillText(winnerLabel, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
    
    ctx.shadowBlur = 0;

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
  ctx.fillText("R: Revancha (Mismos jugadores) | L: Lobby/Menu | C: Borrar Puntuaciones", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40);
}
