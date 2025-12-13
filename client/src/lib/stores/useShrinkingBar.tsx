import { create } from "zustand";
import {
  GameState,
  GameMode,
  Difficulty,
  Player,
  Particle,
  ScoreEntry,
} from "@/lib/game/types";
import { PLAYER_COLORS, SPEED_BY_DIFFICULTY } from "@/lib/game/constants";

interface ShrinkingBarState {
  gameState: GameState;
  gameMode: GameMode;
  difficulty: Difficulty;
  players: Player[];
  winner: Player | null;
  usedKeys: Set<string>;
  particles: Particle[];
  scores: ScoreEntry[];
  nextParticleId: number;
  speedRampEnabled: boolean;
  countdown: number;
  screenShake: number;
  hitStop: number;

  onPlayerEliminated: ((player: Player) => void) | null;
  onPlayerBounce: (() => void) | null;
  onShieldBreak: (() => void) | null;
  onPerfectPivot: ((player: Player) => void) | null;
  onGameEnd: ((winner: Player | null) => void) | null;

  setGameMode: (mode: GameMode) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  toggleSpeedRamp: () => void;
  joinPlayer: (key: string) => void;
  startGame: () => void;
  startPracticeGame: () => void;
  updatePlayers: (delta: number) => void;
  updateCountdown: (delta: number) => void;
  updateJuice: (delta: number) => void;
  handlePlayerInput: (key: string) => void;
  killPlayer: (playerId: number) => void;
  checkWinner: () => void;
  resetGame: () => void;
  rematch: () => void;
  addParticles: (x: number, y: number, color: string, count: number) => void;
  updateParticles: (delta: number) => void;
  updateScores: (winner: Player) => void;
  resetScores: () => void;
  setCallbacks: (callbacks: {
    onPlayerEliminated?: (player: Player) => void;
    onPlayerBounce?: () => void;
    onShieldBreak?: () => void;
    onPerfectPivot?: (player: Player) => void;
    onGameEnd?: (winner: Player | null) => void;
  }) => void;
}

export const useShrinkingBar = create<ShrinkingBarState>((set, get) => ({
  gameState: "lobby",
  gameMode: "multiplayer",
  difficulty: "normal",
  players: [],
  winner: null,
  usedKeys: new Set<string>(),
  particles: [],
  scores: [],
  nextParticleId: 0,
  speedRampEnabled: false,
  countdown: 0,
  screenShake: 0,
  hitStop: 0,

  onPlayerEliminated: null,
  onPlayerBounce: null,
  onShieldBreak: null,
  onPerfectPivot: null,
  onGameEnd: null,

  setGameMode: (mode: GameMode) => set({ gameMode: mode }),
  setDifficulty: (difficulty: Difficulty) => set({ difficulty }),
  toggleSpeedRamp: () =>
    set((state) => ({ speedRampEnabled: !state.speedRampEnabled })),

  setCallbacks: (callbacks) =>
    set({
      onPlayerEliminated: callbacks.onPlayerEliminated || null,
      onPlayerBounce: callbacks.onPlayerBounce || null,
      onShieldBreak: callbacks.onShieldBreak || null,
      onPerfectPivot: callbacks.onPerfectPivot || null,
      onGameEnd: callbacks.onGameEnd || null,
    }),

  joinPlayer: (key: string) => {
    const state = get();
    if (state.gameState !== "lobby") return;
    if (state.usedKeys.has(key.toLowerCase())) return;
    if (state.players.length >= 4) return;
    if (
      [" ", "escape", "r", "m", "1", "2", "3", "s", "l"].includes(
        key.toLowerCase()
      )
    )
      return;

    const playerIndex = state.players.length;
    const color = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
    const speed = SPEED_BY_DIFFICULTY[state.difficulty];

    const newPlayer: Player = {
      id: playerIndex + 1,
      key: key.toLowerCase(),
      color,
      x: 0.5,
      minX: 0,
      maxX: 1,
      direction: 1,
      speed,
      alive: true,
      laneY: 0,
      isAI: false,
      shields: 1,
    };

    const newUsedKeys = new Set(Array.from(state.usedKeys));
    newUsedKeys.add(key.toLowerCase());

    set({
      players: [...state.players, newPlayer],
      usedKeys: newUsedKeys,
    });
  },

  startGame: () => {
    const state = get();
    if (state.gameState !== "lobby") return;
    if (state.players.length < 2) return;
    set({ gameState: "countdown", countdown: 3 });
  },

  startPracticeGame: () => {
    const state = get();
    if (state.gameState !== "lobby") return;
    if (state.players.length < 1) return;

    const speed = SPEED_BY_DIFFICULTY[state.difficulty];
    const aiPlayer: Player = {
      id: state.players.length + 1,
      key: "ai",
      color: "#888888",
      x: 0.5,
      minX: 0,
      maxX: 1,
      direction: 1,
      speed,
      alive: true,
      laneY: 0,
      isAI: true,
      shields: 1,
    };

    set({
      gameState: "countdown",
      countdown: 3,
      gameMode: "practice",
      players: [...state.players, aiPlayer],
    });
  },

  updateCountdown: (delta: number) => {
    const state = get();
    if (state.gameState !== "countdown") return;
    const newTime = state.countdown - delta;
    if (newTime <= 0) {
      set({ gameState: "playing", countdown: 0 });
    } else {
      set({ countdown: newTime });
    }
  },

  updateJuice: (delta: number) => {
    const state = get();
    let newShake = state.screenShake;
    if (newShake > 0) newShake = Math.max(0, newShake - delta * 60);
    let newHitStop = state.hitStop;
    if (newHitStop > 0) newHitStop = Math.max(0, newHitStop - delta);
    if (newShake !== state.screenShake || newHitStop !== state.hitStop) {
      set({ screenShake: newShake, hitStop: newHitStop });
    }
  },

  updatePlayers: (delta: number) => {
    const state = get();
    if (state.gameState !== "playing") return;

    let diedPlayer: Player | null = null;
    let shieldBroken = false;
    const ACCELERATION_PER_SECOND = 0.03;
    const MAX_SPEED = 2.0;

    const updatedPlayers = state.players.map((player) => {
      if (!player.alive) return player;

      let currentSpeed = player.speed;
      if (state.speedRampEnabled && currentSpeed < MAX_SPEED) {
        currentSpeed += ACCELERATION_PER_SECOND * delta;
      }

      if (player.isAI) {
        const distanceToEdge =
          player.direction === 1
            ? player.maxX - player.x
            : player.x - player.minX;
        const reactionThreshold = 0.05 + Math.random() * 0.1;
        if (distanceToEdge < reactionThreshold) {
          let newMinX = player.minX;
          let newMaxX = player.maxX;
          if (player.direction === 1) newMaxX = player.x;
          else newMinX = player.x;

          const barWidth = newMaxX - newMinX;
          let newX = (newMinX + newMaxX) / 2;
          if (barWidth >= 0.04) {
            newX =
              player.direction === 1
                ? Math.max(newMinX + 0.02, player.x - 0.02)
                : Math.min(newMaxX - 0.02, player.x + 0.02);
          }
          newX = Math.max(newMinX + 0.001, Math.min(newMaxX - 0.001, newX));

          return {
            ...player,
            minX: newMinX,
            maxX: newMaxX,
            x: newX,
            direction: (player.direction === 1 ? -1 : 1) as 1 | -1,
            speed: currentSpeed,
          };
        }
      }

      const newX = player.x + currentSpeed * player.direction * delta;

      if (newX <= player.minX || newX >= player.maxX) {
        if (player.shields > 0) {
          shieldBroken = true;
          const safeX =
            newX <= player.minX ? player.minX + 0.02 : player.maxX - 0.02;
          return {
            ...player,
            x: safeX,
            direction: (player.direction * -1) as 1 | -1,
            shields: player.shields - 1,
            speed: currentSpeed,
          };
        } else {
          diedPlayer = player;
          return { ...player, alive: false, speed: currentSpeed };
        }
      }
      return { ...player, x: newX, speed: currentSpeed };
    });

    set({ players: updatedPlayers });

    if (shieldBroken) {
      set({ screenShake: 10, hitStop: 0.05 });
      if (state.onShieldBreak) state.onShieldBreak();
    }

    if (diedPlayer !== null) {
      const deadPlayer = diedPlayer as Player;
      const laneIndex = state.players.findIndex((p) => p.id === deadPlayer.id);
      const laneY = 80 + laneIndex * 100 + 15;
      const barWidth = 700;
      const cursorX = 50 + deadPlayer.x * barWidth;
      get().addParticles(cursorX, laneY, deadPlayer.color, 20);
      set({ screenShake: 20, hitStop: 0.15 });
      if (state.onPlayerEliminated) state.onPlayerEliminated(deadPlayer);
    }
    get().checkWinner();
  },

  handlePlayerInput: (key: string) => {
    const state = get();
    if (state.gameState !== "playing") return;

    const playerIndex = state.players.findIndex(
      (p) => p.key === key.toLowerCase() && p.alive && !p.isAI
    );
    if (playerIndex === -1) return;

    const player = state.players[playerIndex];
    const currentBarWidth = player.maxX - player.minX;
    const distanceToTarget =
      player.direction === 1 ? player.maxX - player.x : player.x - player.minX;

    const isPerfect =
      distanceToTarget < currentBarWidth * 0.08 && distanceToTarget > 0;

    let newMinX = player.minX;
    let newMaxX = player.maxX;
    let perfectTriggered = false;

    if (isPerfect) {
      const expansion = 0.05;
      newMinX = Math.max(0, player.minX - expansion);
      newMaxX = Math.min(1, player.maxX + expansion);
      perfectTriggered = true;
    } else {
      if (player.direction === 1) newMaxX = player.x;
      else newMinX = player.x;
    }

    const barWidth = newMaxX - newMinX;
    let newX: number;
    const GRACE_MARGIN = 0.02;

    if (barWidth < GRACE_MARGIN * 2) {
      newX = (newMinX + newMaxX) / 2;
    } else {
      if (player.direction === 1) {
        newX = Math.max(newMinX + GRACE_MARGIN, player.x - GRACE_MARGIN);
      } else {
        newX = Math.min(newMaxX - GRACE_MARGIN, player.x + GRACE_MARGIN);
      }
    }
    newX = Math.max(newMinX + 0.001, Math.min(newMaxX - 0.001, newX));
    const newDirection = player.direction === 1 ? -1 : 1;

    const updatedPlayers = [...state.players];
    updatedPlayers[playerIndex] = {
      ...player,
      minX: newMinX,
      maxX: newMaxX,
      x: newX,
      direction: newDirection as 1 | -1,
    };

    set({ players: updatedPlayers });

    if (perfectTriggered) {
      set({ screenShake: 10 });
      if (state.onPerfectPivot) state.onPerfectPivot(player);
    } else {
      let explosionX = -1;
      if (player.direction === 1 && player.x < player.maxX)
        explosionX = (player.x + player.maxX) / 2;
      else if (player.direction === -1 && player.x > player.minX)
        explosionX = (player.minX + player.x) / 2;

      if (explosionX !== -1) {
        const laneY = 80 + playerIndex * 100 + 15;
        const screenX = 50 + explosionX * 700;
        get().addParticles(screenX, laneY, player.color, 12);
        set({ screenShake: 3 });
      }
    }

    if (state.onPlayerBounce) state.onPlayerBounce();
  },

  killPlayer: (playerId: number) => {
    const state = get();
    const player = state.players.find((p) => p.id === playerId);
    const updatedPlayers = state.players.map((p) =>
      p.id === playerId ? { ...p, alive: false } : p
    );
    set({ players: updatedPlayers });
    if (player) {
      const laneIndex = state.players.findIndex((p) => p.id === playerId);
      const laneY = 80 + laneIndex * 100 + 15;
      const barWidth = 700;
      const cursorX = 50 + player.x * barWidth;
      get().addParticles(cursorX, laneY, player.color, 20);
      set({ screenShake: 20, hitStop: 0.15 });
      if (state.onPlayerEliminated) state.onPlayerEliminated(player);
    }
    get().checkWinner();
  },

  checkWinner: () => {
    const state = get();
    if (state.gameState !== "playing") return;
    const alivePlayers = state.players.filter((p) => p.alive);
    if (alivePlayers.length <= 1) {
      const winner = alivePlayers.length === 1 ? alivePlayers[0] : null;
      if (winner && !winner.isAI) get().updateScores(winner);
      set({ gameState: "ended", winner });
      if (state.onGameEnd) state.onGameEnd(winner);
    }
  },

  resetGame: () => {
    set({
      gameState: "lobby",
      players: [],
      winner: null,
      usedKeys: new Set<string>(),
      particles: [],
      gameMode: "multiplayer",
      countdown: 0,
      screenShake: 0,
      hitStop: 0,
    });
  },

  rematch: () => {
    const state = get();
    const baseSpeed = SPEED_BY_DIFFICULTY[state.difficulty];
    const resetPlayers = state.players.map((p) => ({
      ...p,
      x: 0.5,
      minX: 0,
      maxX: 1,
      direction: (Math.random() > 0.5 ? 1 : -1) as 1 | -1,
      alive: true,
      speed: baseSpeed,
      shields: 1,
    }));
    set({
      gameState: "countdown",
      players: resetPlayers,
      winner: null,
      particles: [],
      countdown: 3,
      screenShake: 0,
      hitStop: 0,
    });
  },

  addParticles: (x: number, y: number, color: string, count: number) => {
    const state = get();
    const newParticles: Particle[] = [];
    let nextId = state.nextParticleId;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 100 + Math.random() * 200;
      newParticles.push({
        id: nextId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 1,
        maxLife: 1,
        size: 4 + Math.random() * 4,
      });
    }
    set({
      particles: [...state.particles, ...newParticles],
      nextParticleId: nextId,
    });
  },

  updateParticles: (delta: number) => {
    const state = get();
    const updatedParticles = state.particles
      .map((p) => ({
        ...p,
        x: p.x + p.vx * delta,
        y: p.y + p.vy * delta,
        vy: p.vy + 300 * delta,
        life: p.life - delta * 2,
      }))
      .filter((p) => p.life > 0);
    set({ particles: updatedParticles });
  },

  updateScores: (winner: Player) => {
    const state = get();
    const existingIndex = state.scores.findIndex(
      (s) => s.key === winner.key && s.color === winner.color
    );
    if (existingIndex >= 0) {
      const updatedScores = [...state.scores];
      updatedScores[existingIndex] = {
        ...updatedScores[existingIndex],
        wins: updatedScores[existingIndex].wins + 1,
      };
      set({ scores: updatedScores });
    } else {
      set({
        scores: [
          ...state.scores,
          {
            playerId: winner.id,
            key: winner.key,
            color: winner.color,
            wins: 1,
          },
        ],
      });
    }
  },

  resetScores: () => set({ scores: [] }),
}));
