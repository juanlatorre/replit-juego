import { create } from "zustand";

export type GameState = "lobby" | "playing" | "ended";
export type GameMode = "multiplayer" | "practice";
export type Difficulty = "easy" | "normal" | "hard";

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface Player {
  id: number;
  key: string;
  color: string;
  x: number;
  minX: number;
  maxX: number;
  direction: 1 | -1;
  speed: number;
  alive: boolean;
  laneY: number;
  isAI?: boolean;
}

export interface ScoreEntry {
  playerId: number;
  key: string;
  color: string;
  wins: number;
}

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
  onPlayerEliminated: ((player: Player) => void) | null;
  onPlayerBounce: (() => void) | null;
  onGameEnd: ((winner: Player | null) => void) | null;
  
  setGameMode: (mode: GameMode) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  joinPlayer: (key: string) => void;
  startGame: () => void;
  startPracticeGame: () => void;
  updatePlayers: (delta: number) => void;
  handlePlayerInput: (key: string) => void;
  killPlayer: (playerId: number) => void;
  checkWinner: () => void;
  resetGame: () => void;
  addParticles: (x: number, y: number, color: string, count: number) => void;
  updateParticles: (delta: number) => void;
  updateScores: (winner: Player) => void;
  resetScores: () => void;
  setCallbacks: (callbacks: {
    onPlayerEliminated?: (player: Player) => void;
    onPlayerBounce?: () => void;
    onGameEnd?: (winner: Player | null) => void;
  }) => void;
}

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#FFE66D",
  "#95E1D3",
  "#F38181",
  "#AA96DA",
  "#FCBAD3",
  "#A8D8EA",
];

const SPEED_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 0.25,
  normal: 0.4,
  hard: 0.6,
};

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
  onPlayerEliminated: null,
  onPlayerBounce: null,
  onGameEnd: null,

  setGameMode: (mode: GameMode) => set({ gameMode: mode }),
  
  setDifficulty: (difficulty: Difficulty) => set({ difficulty }),

  setCallbacks: (callbacks) => set({
    onPlayerEliminated: callbacks.onPlayerEliminated || null,
    onPlayerBounce: callbacks.onPlayerBounce || null,
    onGameEnd: callbacks.onGameEnd || null,
  }),

  joinPlayer: (key: string) => {
    const state = get();
    if (state.gameState !== "lobby") return;
    if (state.usedKeys.has(key.toLowerCase())) return;
    if (state.players.length >= 4) return;
    if (key === " " || key === "Escape" || key === "r" || key === "R" || key === "m" || key === "M" || key === "1" || key === "2" || key === "3") return;

    const playerIndex = state.players.length;
    const color = COLORS[playerIndex % COLORS.length];
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

    set({ gameState: "playing" });
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
    };

    set({
      gameState: "playing",
      gameMode: "practice",
      players: [...state.players, aiPlayer],
    });
  },

  updatePlayers: (delta: number) => {
    const state = get();
    if (state.gameState !== "playing") return;

    let diedPlayer: Player | null = null;

    const updatedPlayers = state.players.map((player) => {
      if (!player.alive) return player;

      if (player.isAI) {
        const distanceToEdge = player.direction === 1 
          ? player.maxX - player.x 
          : player.x - player.minX;
        
        const reactionThreshold = 0.05 + Math.random() * 0.1;
        
        if (distanceToEdge < reactionThreshold) {
          let newMinX = player.minX;
          let newMaxX = player.maxX;

          if (player.direction === 1) {
            newMaxX = player.x;
          } else {
            newMinX = player.x;
          }

          const barWidth = newMaxX - newMinX;
          let newX = (newMinX + newMaxX) / 2;
          
          if (barWidth >= 0.04) {
            newX = player.direction === 1 
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
          };
        }
      }

      const newX = player.x + player.speed * player.direction * delta;
      
      if (newX <= player.minX || newX >= player.maxX) {
        diedPlayer = player;
        return { ...player, alive: false };
      }

      return { ...player, x: newX };
    });

    set({ players: updatedPlayers });

    if (diedPlayer !== null) {
      const deadPlayer = diedPlayer as Player;
      const laneIndex = state.players.findIndex(p => p.id === deadPlayer.id);
      const laneY = 80 + laneIndex * 100 + 15;
      const barWidth = 700;
      const cursorX = 50 + deadPlayer.x * barWidth;
      get().addParticles(cursorX, laneY, deadPlayer.color, 20);
      
      if (state.onPlayerEliminated) {
        state.onPlayerEliminated(deadPlayer);
      }
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
    const GRACE_MARGIN = 0.02;

    let newMinX = player.minX;
    let newMaxX = player.maxX;

    if (player.direction === 1) {
      newMaxX = player.x;
    } else {
      newMinX = player.x;
    }

    const barWidth = newMaxX - newMinX;
    let newX: number;

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

    if (state.onPlayerBounce) {
      state.onPlayerBounce();
    }
  },

  killPlayer: (playerId: number) => {
    const state = get();
    const player = state.players.find(p => p.id === playerId);
    const updatedPlayers = state.players.map((p) =>
      p.id === playerId ? { ...p, alive: false } : p
    );
    set({ players: updatedPlayers });

    if (player) {
      const laneIndex = state.players.findIndex(p => p.id === playerId);
      const laneY = 80 + laneIndex * 100 + 15;
      const barWidth = 700;
      const cursorX = 50 + player.x * barWidth;
      get().addParticles(cursorX, laneY, player.color, 20);
      
      if (state.onPlayerEliminated) {
        state.onPlayerEliminated(player);
      }
    }

    get().checkWinner();
  },

  checkWinner: () => {
    const state = get();
    if (state.gameState !== "playing") return;

    const alivePlayers = state.players.filter((p) => p.alive);
    
    if (alivePlayers.length <= 1) {
      const winner = alivePlayers.length === 1 ? alivePlayers[0] : null;
      
      if (winner && !winner.isAI) {
        get().updateScores(winner);
      }

      set({
        gameState: "ended",
        winner,
      });

      if (state.onGameEnd) {
        state.onGameEnd(winner);
      }
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
