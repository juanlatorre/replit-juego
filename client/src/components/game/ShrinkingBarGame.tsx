import { useEffect, useRef, useCallback } from "react";
import { useShrinkingBar } from "@/lib/stores/useShrinkingBar";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  FONT_SIZE,
  NUM_ENTITIES,
  BAR_PADDING_X,
} from "@/lib/game/constants";
import { FractalEntity, ShapeType, FloatingText } from "@/lib/game/types";
import { drawVisualizerBg } from "./renderer/background";
import { drawPlaying } from "./renderer/entities";
import {
  drawLobby,
  drawCountdown,
  drawEnded,
  drawFloatingTexts,
} from "./renderer/ui";

export function ShrinkingBarGame() {
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const matrixDropsRef = useRef<number[]>(
    Array(Math.floor(CANVAS_WIDTH / FONT_SIZE)).fill(1)
  );
  const fractalsRef = useRef<FractalEntity[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const hitSoundRef = useRef<HTMLAudioElement | null>(null);
  const successSoundRef = useRef<HTMLAudioElement | null>(null);

  const {
    gameState,
    players,
    winner,
    particles,
    scores,
    difficulty,
    speedRampEnabled,
    countdown,
    screenShake,
    hitStop,
    updateJuice,
    joinPlayer,
    startGame,
    startPracticeGame,
    updatePlayers,
    updateParticles,
    updateCountdown,
    handlePlayerInput: storeHandlePlayerInput,
    resetGame,
    rematch,
    resetScores,
    setDifficulty,
    toggleSpeedRamp,
    setCallbacks,
  } = useShrinkingBar();

  // === INICIALIZAR ENJAMBRE GEOMÉTRICO ===
  useEffect(() => {
    const entities: FractalEntity[] = [];
    const types: ShapeType[] = [
      "mandala",
      "circle",
      "square",
      "triangle",
      "cross",
    ];

    for (let i = 0; i < NUM_ENTITIES; i++) {
      let type: ShapeType;
      const r = Math.random();
      if (r < 0.1) type = "mandala";
      else type = types[Math.floor(Math.random() * types.length)];

      entities.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        vx: (Math.random() - 0.5) * 100,
        vy: (Math.random() - 0.5) * 100,
        sizeScale: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        type: type,
        rotationSpeed: (Math.random() - 0.5) * 2,
        colorOffset: Math.floor(Math.random() * 100),
      });
    }
    fractalsRef.current = entities;
  }, []);

  // === AUDIO SETUP ===
  useEffect(() => {
    musicRef.current = new Audio("/sounds/cat.mp3");
    musicRef.current.loop = true;
    musicRef.current.volume = 0.2;

    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const source = audioCtx.createMediaElementSource(musicRef.current);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
    } catch (e) {
      console.warn("Error Web Audio API:", e);
    }

    const playMusic = async () => {
      try {
        if (audioContextRef.current?.state === "suspended") {
          await audioContextRef.current.resume();
        }
        await musicRef.current?.play();
      } catch (err) {
        console.log("Esperando interacción...");
      }
    };

    playMusic();

    return () => {
      musicRef.current?.pause();
      musicRef.current = null;
      audioContextRef.current?.close();
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
          if ((bounce as any).preservesPitch !== undefined)
            (bounce as any).preservesPitch = false;
          bounce.play().catch(() => {});
        }
      },
      onShieldBreak: () => {
        if (hitSoundRef.current) {
          const bounce = hitSoundRef.current.cloneNode() as HTMLAudioElement;
          bounce.volume = 0.5;
          bounce.playbackRate = 0.5;
          bounce.play().catch(() => {});
        }
      },
      onPerfectPivot: (player) => {
        if (successSoundRef.current) {
          const perfectSnd =
            successSoundRef.current.cloneNode() as HTMLAudioElement;
          perfectSnd.volume = 0.8;
          perfectSnd.playbackRate = 1.2;
          perfectSnd.play().catch(() => {});
        }

        const laneY = 80 + (player.id - 1) * 100 + 15;
        const playerXPx =
          BAR_PADDING_X + player.x * (CANVAS_WIDTH - BAR_PADDING_X * 2);

        floatingTextsRef.current.push({
          x: playerXPx,
          y: laneY - 20,
          text: "PERFECT!",
          life: 1.0,
          color: "#FFD700",
          size: 24,
        });
      },
      onGameEnd: (winner) => {
        if (winner && successSoundRef.current) {
          successSoundRef.current.currentTime = 0;
          successSoundRef.current.play().catch(() => {});
        }
      },
    });
  }, [setCallbacks]);

  const handlePlayerInput = useCallback(
    (key: string) => {
      storeHandlePlayerInput(key);
      fractalsRef.current.forEach((f) => {
        const speed = 800 + Math.random() * 1200;
        const angle = Math.random() * Math.PI * 2;
        f.vx = Math.cos(angle) * speed;
        f.vy = Math.sin(angle) * speed;
        f.rotationSpeed = (Math.random() - 0.5) * 50;
      });
    },
    [storeHandlePlayerInput]
  );

  const handleKeyDown = useCallback(
    async (e: KeyboardEvent) => {
      const key = e.key;

      if (audioContextRef.current?.state === "suspended") {
        try {
          await audioContextRef.current.resume();
        } catch (e) {}
      }
      if (musicRef.current?.paused) {
        try {
          await musicRef.current.play();
        } catch (e) {}
      }

      if (gameState === "lobby") {
        if (key === "1") setDifficulty("easy");
        else if (key === "2") setDifficulty("normal");
        else if (key === "3") setDifficulty("hard");
        else if (key.toLowerCase() === "s") toggleSpeedRamp();
        else if (key === " " && players.length >= 2) startGame();
        else if (key.toLowerCase() === "m" && players.length >= 1)
          startPracticeGame();
        else if (key !== " " && key.toLowerCase() !== "m") joinPlayer(key);
      } else if (gameState === "playing") {
        handlePlayerInput(key);
      } else if (gameState === "ended") {
        if (key.toLowerCase() === "r") rematch();
        else if (key.toLowerCase() === "l") resetGame();
        else if (key.toLowerCase() === "c") resetScores();
      }
    },
    [
      gameState,
      players.length,
      difficulty,
      joinPlayer,
      startGame,
      startPracticeGame,
      handlePlayerInput,
      resetGame,
      rematch,
      resetScores,
      setDifficulty,
      toggleSpeedRamp,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const drawGame = useCallback(
    (ctx: CanvasRenderingContext2D, delta: number) => {
      // 1. Fondo (Visualizador + Matrix + Fractales)
      drawVisualizerBg(
        ctx,
        delta,
        analyserRef.current,
        dataArrayRef.current,
        fractalsRef.current,
        matrixDropsRef.current
      );

      ctx.save();
      if (screenShake > 0) {
        const dx = (Math.random() - 0.5) * screenShake;
        const dy = (Math.random() - 0.5) * screenShake;
        ctx.translate(dx, dy);
      }

      // 2. Capas de Juego
      if (gameState === "lobby") {
        drawLobby(ctx, players, difficulty, scores, speedRampEnabled);
      } else if (gameState === "playing") {
        drawPlaying(ctx, players, particles);
        drawFloatingTexts(ctx, delta, floatingTextsRef.current);
      } else if (gameState === "countdown") {
        drawPlaying(ctx, players, particles);
        drawCountdown(ctx, countdown);
      } else if (gameState === "ended") {
        drawEnded(ctx, winner, scores);
      }

      ctx.restore();
    },
    [
      gameState,
      players,
      winner,
      particles,
      difficulty,
      scores,
      speedRampEnabled,
      countdown,
      screenShake,
    ]
  );

  const gameLoop = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const delta = lastTimeRef.current
        ? (timestamp - lastTimeRef.current) / 1000
        : 0;
      lastTimeRef.current = timestamp;

      updateJuice(delta);

      if (gameState === "playing") {
        if (hitStop <= 0) {
          updatePlayers(delta);
          updateParticles(delta);
        }
      } else if (gameState === "countdown") {
        updateCountdown(delta);
      }

      drawGame(ctx, delta);
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    },
    [
      gameState,
      updatePlayers,
      updateParticles,
      updateCountdown,
      drawGame,
      updateJuice,
      hitStop,
    ]
  );

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [gameLoop]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <h1
        className="text-4xl font-bold text-white mb-4"
        style={{ textShadow: "0 0 10px #FF71CE, 0 0 20px #01CDFE" }}
      >
        The Shrinking Bar
      </h1>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-gray-700 rounded-lg"
        style={{
          boxShadow:
            "0 0 30px rgba(255, 113, 206, 0.3), 0 0 10px rgba(1, 205, 254, 0.3)",
        }}
      />
      <div className="mt-4 text-gray-400 text-sm text-center font-mono">
        {gameState === "lobby" && (
          <>
            <p>PRESS ANY KEY TO JOIN | SPACE TO START (MIN 2 PLAYERS)</p>
            <p className="mt-1 text-xs text-pink-400">
              M: PRACTICE MODE | 1-3: DIFFICULTY | S: PROGRESSIVE SPEED
            </p>
          </>
        )}
        {gameState === "countdown" && (
          <p className="text-yellow-400 font-bold text-xl animate-pulse">
            GET READY!
          </p>
        )}
        {gameState === "playing" && (
          <p className="text-cyan-400">
            PRESS YOUR ASSIGNED KEY TO BOUNCE AND SHRINK
          </p>
        )}
        {gameState === "ended" && (
          <p className="text-purple-400">
            R: REMATCH | L: LOBBY | C: CLEAR SCORES
          </p>
        )}
      </div>
    </div>
  );
}
