import { useEffect, useRef, useCallback } from "react";
import { useShrinkingBar, type Player, type Particle, type ScoreEntry, type Difficulty } from "@/lib/stores/useShrinkingBar";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const BAR_HEIGHT = 30;
const BAR_PADDING_X = 50;
const CURSOR_RADIUS = 12;

// CONFIGURACIÓN MATRIX VAPORWAVE
const FONT_SIZE = 10; // Reducido para MÁS letras
const VAPORWAVE_COLORS = [
    "#FF71CE", // Rosa neón
    "#01CDFE", // Cian neón
    "#05FFA1", // Verde menta neón
    "#B967FF", // Morado neón
    "#FFFB96"  // Amarillo pálido neón
];

// Definición para los fractales flotantes
interface FractalEntity {
    x: number;
    y: number;
    vx: number;
    vy: number;
    sizeScale: number;
    phase: number; // Para rotación individual
}

export function ShrinkingBarGame() {
  const musicRef = useRef<HTMLAudioElement | null>(null);
  
  // === WEB AUDIO API REFS ===
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  // ==========================

  // === MATRIX RAIN REFS ===
  const matrixDropsRef = useRef<number[]>(Array(Math.floor(CANVAS_WIDTH / FONT_SIZE)).fill(1));
  // ========================

  // === FRACTAL SWARM REFS (NUEVO) ===
  // Inicializamos vacio, lo llenamos en el useEffect
  const fractalsRef = useRef<FractalEntity[]>([]);
  // ==================================

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
    
    // JUICE VARS
    screenShake,
    hitStop,
    updateJuice,

    joinPlayer,
    startGame,
    startPracticeGame,
    updatePlayers,
    updateParticles,
    updateCountdown,
    handlePlayerInput: storeHandlePlayerInput, // Renombramos para envolverlo
    resetGame,
    rematch,
    resetScores,
    setDifficulty,
    toggleSpeedRamp,
    setCallbacks,
  } = useShrinkingBar();

  // === INICIALIZAR FRACTALES FLOTANTES ===
  useEffect(() => {
      // Crear 6 fractales aleatorios
      const entities: FractalEntity[] = [];
      for(let i=0; i<6; i++) {
          entities.push({
              x: Math.random() * CANVAS_WIDTH,
              y: Math.random() * CANVAS_HEIGHT,
              vx: (Math.random() - 0.5) * 100, // Velocidad inicial
              vy: (Math.random() - 0.5) * 100,
              sizeScale: 0.5 + Math.random() * 0.5, // Tamaños variados
              phase: Math.random() * Math.PI * 2
          });
      }
      fractalsRef.current = entities;
  }, []);

  // === AUDIO SETUP ===
  useEffect(() => {
    musicRef.current = new Audio('/sounds/cat.mp3');
    musicRef.current.loop = true;
    musicRef.current.volume = 0.2; 

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
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
        if (audioContextRef.current?.state === 'suspended') {
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

  // === NUEVO WRAPPER PARA INPUT: CAOS FRACTAL ===
  const handlePlayerInput = useCallback((key: string) => {
      // 1. Llamar a la lógica original del juego
      storeHandlePlayerInput(key);

      // 2. CAOS: Cambiar dirección de todos los fractales aleatoriamente
      fractalsRef.current.forEach(f => {
          // Asignar nueva velocidad aleatoria (más rápida para que se sienta el impacto)
          f.vx = (Math.random() - 0.5) * 300; 
          f.vy = (Math.random() - 0.5) * 300;
      });

  }, [storeHandlePlayerInput]);

  const handleKeyDown = useCallback(
    async (e: KeyboardEvent) => {
      const key = e.key;
      
      if (audioContextRef.current?.state === 'suspended') {
         try { await audioContextRef.current.resume(); } catch(e) {}
      }
      if (musicRef.current?.paused) {
         try { await musicRef.current.play(); } catch(e) {}
      }

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

  // === DIBUJAR LLUVIA MATRIX (MÁS DENSA) ===
  const drawMatrixRain = useCallback((ctx: CanvasRenderingContext2D) => {
    // Rastro más corto (más oscuro) para que se vean más claras las letras nuevas
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)"; 
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.font = `${FONT_SIZE}px monospace`;
    ctx.textAlign = "center";
    const drops = matrixDropsRef.current;

    // Asegurarnos que drops tenga el tamaño correcto si cambió CANVAS_WIDTH (resiliencia)
    if (drops.length < Math.floor(CANVAS_WIDTH / FONT_SIZE)) {
        const diff = Math.floor(CANVAS_WIDTH / FONT_SIZE) - drops.length;
        for(let k=0; k<diff; k++) drops.push(Math.random() * 100);
    }

    for (let i = 0; i < drops.length; i++) {
        const char = String.fromCharCode(0x30A0 + Math.random() * 96);
        const color = VAPORWAVE_COLORS[Math.floor(Math.random() * VAPORWAVE_COLORS.length)];
        
        ctx.fillStyle = color;
        // Quitamos shadowBlur aquí por rendimiento, ya que son MUCHAS letras
        ctx.fillText(char, i * FONT_SIZE, drops[i] * FONT_SIZE);

        if (drops[i] * FONT_SIZE > CANVAS_HEIGHT && Math.random() > 0.98) {
            drops[i] = 0;
        }
        drops[i]++;
    }
  }, []);

  // === DIBUJAR VISUALIZADOR MULTI-FRACTAL ===
  const drawVisualizerBg = useCallback((ctx: CanvasRenderingContext2D, delta: number) => {
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    if (!analyser || !dataArray) {
        drawMatrixRain(ctx);
        return;
    }

    analyser.getByteFrequencyData(dataArray);
    const bufferLength = dataArray.length;
    
    // Bajos
    let bass = 0;
    for(let i = 0; i < 10; i++) bass += dataArray[i];
    bass = bass / 10 / 255;

    const time = performance.now() / 1000;

    // 1. DIBUJAR MATRIX DE FONDO
    drawMatrixRain(ctx);

    // 2. CAPA DE UNIFICACIÓN (para que los fractales brillen sobre lo oscuro)
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)"; 
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 3. ACTUALIZAR Y DIBUJAR CADA FRACTAL
    const fractals = fractalsRef.current;
    
    // Parámetros visuales compartidos
    const bars = 20; // Menos barras por fractal para mantener rendimiento
    const symmetry = 5; 
    const step = Math.floor(bufferLength / bars);

    fractals.forEach((f, fIndex) => {
        // MOVIMIENTO FÍSICO
        f.x += f.vx * delta;
        f.y += f.vy * delta;

        // Rebote en bordes
        if (f.x < 0 || f.x > CANVAS_WIDTH) f.vx *= -1;
        if (f.y < 0 || f.y > CANVAS_HEIGHT) f.vy *= -1;
        
        // Clamp posiciones para que no se escapen
        f.x = Math.max(0, Math.min(CANVAS_WIDTH, f.x));
        f.y = Math.max(0, Math.min(CANVAS_HEIGHT, f.y));

        ctx.save();
        ctx.translate(f.x, f.y);

        // Zoom y rotación individual
        // El bass afecta a todos, pero con fases distintas
        const localScale = f.sizeScale * (1 + bass * 0.5);
        ctx.scale(localScale, localScale);
        ctx.rotate(f.phase + time * 0.5 + bass * Math.PI); // Giran

        // DIBUJAR EL MINI-MANDALA
        for (let i = 0; i < bars; i++) {
            const value = dataArray[i * step] / 255.0;
            
            // Color varía por fractal y por tiempo
            const colorIndex = (i + fIndex + Math.floor(time * 8)) % VAPORWAVE_COLORS.length;
            const color = VAPORWAVE_COLORS[colorIndex];
            
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2 + value * 3;

            for (let j = 0; j < symmetry; j++) {
                ctx.save();
                ctx.rotate((Math.PI * 2 / symmetry) * j);
                
                const dist = 10 + i * 5; 
                
                // Puntos
                const size = value * 15;
                if (size > 1) {
                    ctx.beginPath();
                    ctx.arc(0, dist + value * 50, size, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Conexiones (rayos)
                if (value > 0.3) {
                    ctx.beginPath();
                    ctx.moveTo(0, 10);
                    ctx.lineTo(0, dist + value * 80);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }
        
        // Núcleo brillante
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(0, 0, 5 + bass * 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });

  }, [drawMatrixRain]);

  const drawGame = useCallback(
    (ctx: CanvasRenderingContext2D, delta: number) => {
      
      // DIBUJAR FONDO DEMENTE
      drawVisualizerBg(ctx, delta);

      // Screen Shake
      ctx.save();
      if (screenShake > 0) {
        const dx = (Math.random() - 0.5) * screenShake;
        const dy = (Math.random() - 0.5) * screenShake;
        ctx.translate(dx, dy);
      }

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

      ctx.restore();
    },
    [gameState, players, winner, particles, difficulty, scores, speedRampEnabled, countdown, screenShake, drawVisualizerBg]
  );

  const gameLoop = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const delta = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0;
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

      // Pasamos delta a drawGame para mover los fractales
      drawGame(ctx, delta);

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
      <h1 className="text-4xl font-bold text-white mb-4" style={{textShadow: "0 0 10px #FF71CE, 0 0 20px #01CDFE"}}>The Shrinking Bar</h1>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-gray-700 rounded-lg"
        style={{boxShadow: "0 0 30px rgba(255, 113, 206, 0.3), 0 0 10px rgba(1, 205, 254, 0.3)"}}
      />
      <div className="mt-4 text-gray-400 text-sm text-center font-mono">
        {gameState === "lobby" && (
          <>
            <p>PRESS ANY KEY TO JOIN | SPACE TO START (MIN 2 PLAYERS)</p>
            <p className="mt-1 text-xs text-pink-400">M: PRACTICE MODE | 1-3: DIFFICULTY | S: PROGRESSIVE SPEED</p>
          </>
        )}
        {gameState === "countdown" && (
          <p className="text-yellow-400 font-bold text-xl animate-pulse">GET READY!</p>
        )}
        {gameState === "playing" && (
          <p className="text-cyan-400">PRESS YOUR ASSIGNED KEY TO BOUNCE AND SHRINK</p>
        )}
        {gameState === "ended" && (
          <p className="text-purple-400">R: REMATCH | L: LOBBY | C: CLEAR SCORES</p>
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
  ctx.font = "bold 150px monospace";
  ctx.shadowColor = VAPORWAVE_COLORS[value % VAPORWAVE_COLORS.length];
  ctx.shadowBlur = 40;

  if (value > 0) {
    ctx.fillStyle = VAPORWAVE_COLORS[value % VAPORWAVE_COLORS.length];
    ctx.fillText(value.toString(), CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.fillText("GO!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }

  ctx.shadowBlur = 0;
}

function drawLobby(ctx: CanvasRenderingContext2D, players: Player[], difficulty: Difficulty, scores: ScoreEntry[], speedRampEnabled: boolean) {
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.fillRect(50, 20, CANVAS_WIDTH - 100, CANVAS_HEIGHT - 40);
  
  ctx.shadowBlur = 10;
  ctx.shadowColor = VAPORWAVE_COLORS[0];
  ctx.strokeStyle = VAPORWAVE_COLORS[1];
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 20, CANVAS_WIDTH - 100, CANVAS_HEIGHT - 40);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px monospace";
  ctx.textAlign = "center";
  ctx.shadowColor = VAPORWAVE_COLORS[3];
  ctx.shadowBlur = 10;
  ctx.fillText("LOBBY", CANVAS_WIDTH / 2, 60);
  ctx.shadowBlur = 0;

  ctx.font = "14px monospace";
  ctx.fillStyle = "#aaaaaa";
  ctx.fillText("PRESS ANY KEY TO JOIN", CANVAS_WIDTH / 2, 85);

  const diffColors: Record<Difficulty, string> = {
    easy: VAPORWAVE_COLORS[2], 
    normal: VAPORWAVE_COLORS[4], 
    hard: VAPORWAVE_COLORS[0], 
  };
  const diffLabels: Record<Difficulty, string> = {
    easy: "EASY (1)",
    normal: "NORMAL (2)",
    hard: "HARD (3)",
  };

  ctx.font = "16px monospace";
  ctx.fillStyle = "#888888";
  ctx.fillText("DIFFICULTY:", CANVAS_WIDTH / 2, 115);

  const startX = CANVAS_WIDTH / 2 - 150;
  (["easy", "normal", "hard"] as Difficulty[]).forEach((d, i) => {
    const x = startX + i * 100;
    ctx.fillStyle = d === difficulty ? diffColors[d] : "#444444";
    if (d === difficulty) { ctx.shadowBlur = 10; ctx.shadowColor = diffColors[d]; }
    ctx.fillRect(x, 125, 90, 25);
    ctx.shadowBlur = 0;
    ctx.fillStyle = d === difficulty ? "#000000" : "#888888";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(diffLabels[d], x + 45, 142);
  });

  const rampY = 165;
  ctx.font = "14px monospace";
  ctx.textAlign = "center";
  if (speedRampEnabled) {
    ctx.fillStyle = VAPORWAVE_COLORS[0];
    ctx.shadowBlur = 5; ctx.shadowColor = VAPORWAVE_COLORS[0];
    ctx.fillText(">> PROGRESSIVE SPEED: ON (S) <<", CANVAS_WIDTH / 2, rampY);
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = "#444444";
    ctx.fillText("Progressive Speed: OFF (S)", CANVAS_WIDTH / 2, rampY);
  }

  if (players.length > 0) {
    ctx.font = "16px monospace";
    players.forEach((player, index) => {
      const y = 190 + index * 45;
      
      ctx.fillStyle = player.color;
      ctx.shadowBlur = 5; ctx.shadowColor = player.color;
      ctx.fillRect(CANVAS_WIDTH / 2 - 140, y - 12, 280, 35);
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.fillText(
        `P${player.id} - KEY: "${player.key.toUpperCase()}"`,
        CANVAS_WIDTH / 2,
        y + 8
      );
    });
  }

  if (scores.length > 0) {
    ctx.fillStyle = VAPORWAVE_COLORS[4];
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "left";
    ctx.fillText("SCORES:", 70, 400);
    
    const sortedScores = [...scores].sort((a, b) => b.wins - a.wins);
    sortedScores.slice(0, 4).forEach((score, i) => {
      ctx.fillStyle = score.color;
      ctx.fillText(`[${score.key.toUpperCase()}]: ${score.wins} WINS`, 70, 420 + i * 18);
    });
  }

  if (players.length >= 2) {
    ctx.fillStyle = VAPORWAVE_COLORS[1];
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.shadowBlur = 10; ctx.shadowColor = VAPORWAVE_COLORS[1];
    ctx.fillText("SPACE TO START", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 60);
    ctx.shadowBlur = 0;
  }
  
  if (players.length >= 1) {
    ctx.fillStyle = VAPORWAVE_COLORS[3];
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("M FOR PRACTICE MODE (VS AI)", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 35);
  }
  
  if (players.length === 0) {
    ctx.fillStyle = "#666666";
    ctx.font = "16px monospace";
    ctx.textAlign = "center";
    ctx.fillText("WAITING FOR PLAYERS...", CANVAS_WIDTH / 2, 240);
  }
}

function drawPlaying(ctx: CanvasRenderingContext2D, players: Player[], particles: Particle[]) {
  const barWidth = CANVAS_WIDTH - BAR_PADDING_X * 2;

  players.forEach((player, index) => {
    const laneY = 80 + index * 100;

    if (player.alive) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = player.color;
    }

    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(BAR_PADDING_X, laneY, barWidth, BAR_HEIGHT);

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

      ctx.shadowBlur = 0;

    } else {
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
      ctx.fillRect(BAR_PADDING_X, laneY, barWidth, BAR_HEIGHT);
      
      ctx.fillStyle = "#ff0000";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("ELIMINATED", CANVAS_WIDTH / 2, laneY + BAR_HEIGHT / 2 + 5);
    }

    ctx.fillStyle = player.color;
    ctx.font = "14px monospace";
    ctx.textAlign = "left";
    const label = player.isAI ? `IA` : `P${player.id} [${player.key.toUpperCase()}]`;
    ctx.shadowBlur = 5; ctx.shadowColor = player.color;
    ctx.fillText(label, BAR_PADDING_X, laneY - 8);
    ctx.shadowBlur = 0;
  });

  particles.forEach((particle) => {
    ctx.shadowBlur = 15;
    ctx.shadowColor = particle.color;

    ctx.globalAlpha = particle.life / particle.maxLife;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * (particle.life / particle.maxLife), 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
  });
  ctx.globalAlpha = 1;
}

function drawEnded(ctx: CanvasRenderingContext2D, winner: Player | null, scores: ScoreEntry[]) {
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.fillRect(50, 50, CANVAS_WIDTH - 100, CANVAS_HEIGHT - 100);
  ctx.strokeStyle = VAPORWAVE_COLORS[3];
  ctx.lineWidth = 2;
  ctx.shadowBlur = 10; ctx.shadowColor = VAPORWAVE_COLORS[3];
  ctx.strokeRect(50, 50, CANVAS_WIDTH - 100, CANVAS_HEIGHT - 100);
  ctx.shadowBlur = 0;


  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px monospace";
  ctx.textAlign = "center";

  if (winner) {
    ctx.fillStyle = winner.color;
    ctx.shadowBlur = 25;
    ctx.shadowColor = winner.color;
    
    const winnerLabel = winner.isAI ? "AI WINS!" : `PLAYER ${winner.id} WINS!`;
    ctx.fillText(winnerLabel, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
    
    ctx.shadowBlur = 0;

    if (!winner.isAI) {
      ctx.font = "20px monospace";
      ctx.fillStyle = "#aaaaaa";
      ctx.fillText(`KEY: "${winner.key.toUpperCase()}"`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }
  } else {
    ctx.fillStyle = VAPORWAVE_COLORS[0];
    ctx.shadowBlur = 20; ctx.shadowColor = VAPORWAVE_COLORS[0];
    ctx.fillText("DRAW!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    ctx.shadowBlur = 0;
  }

  if (scores.length > 0) {
    ctx.font = "bold 16px monospace";
    ctx.fillStyle = VAPORWAVE_COLORS[4];
    ctx.fillText("SCOREBOARD", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
    
    const sortedScores = [...scores].sort((a, b) => b.wins - a.wins);
    ctx.font = "14px monospace";
    sortedScores.slice(0, 4).forEach((score, i) => {
      ctx.fillStyle = score.color;
      ctx.fillText(`[${score.key.toUpperCase()}]: ${score.wins} WINS`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 75 + i * 20);
    });
  }

  ctx.fillStyle = VAPORWAVE_COLORS[1];
  ctx.font = "18px monospace";
  ctx.shadowBlur = 10; ctx.shadowColor = VAPORWAVE_COLORS[1];
  ctx.fillText("R: REMATCH | L: LOBBY | C: CLEAR SCORES", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 65);
  ctx.shadowBlur = 0;
}
