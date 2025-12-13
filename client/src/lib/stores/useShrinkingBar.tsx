import { create } from "zustand";

export type GameState = "lobby" | "playing" | "ended";

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
}

interface ShrinkingBarState {
  gameState: GameState;
  players: Player[];
  winner: Player | null;
  usedKeys: Set<string>;
  
  joinPlayer: (key: string) => void;
  startGame: () => void;
  updatePlayers: (delta: number) => void;
  handlePlayerInput: (key: string) => void;
  killPlayer: (playerId: number) => void;
  checkWinner: () => void;
  resetGame: () => void;
}

const COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#FFE66D", // Yellow
  "#95E1D3", // Mint
  "#F38181", // Coral
  "#AA96DA", // Purple
  "#FCBAD3", // Pink
  "#A8D8EA", // Light Blue
];

const LANE_HEIGHT = 60;
const LANE_MARGIN = 20;
const BAR_PADDING = 100;

export const useShrinkingBar = create<ShrinkingBarState>((set, get) => ({
  gameState: "lobby",
  players: [],
  winner: null,
  usedKeys: new Set<string>(),

  joinPlayer: (key: string) => {
    const state = get();
    if (state.gameState !== "lobby") return;
    if (state.usedKeys.has(key.toLowerCase())) return;
    if (state.players.length >= 4) return;
    if (key === " " || key === "Escape" || key === "r" || key === "R") return;

    const playerIndex = state.players.length;
    const color = COLORS[playerIndex % COLORS.length];
    const laneY = 150 + playerIndex * (LANE_HEIGHT + LANE_MARGIN);
    
    const newPlayer: Player = {
      id: playerIndex + 1,
      key: key.toLowerCase(),
      color,
      x: 0.5,
      minX: 0,
      maxX: 1,
      direction: 1,
      speed: 0.4,
      alive: true,
      laneY,
    };

    set({
      players: [...state.players, newPlayer],
      usedKeys: new Set([...state.usedKeys, key.toLowerCase()]),
    });
  },

  startGame: () => {
    const state = get();
    if (state.gameState !== "lobby") return;
    if (state.players.length < 2) return;

    set({ gameState: "playing" });
  },

  updatePlayers: (delta: number) => {
    const state = get();
    if (state.gameState !== "playing") return;

    const updatedPlayers = state.players.map((player) => {
      if (!player.alive) return player;

      const newX = player.x + player.speed * player.direction * delta;
      
      if (newX <= player.minX || newX >= player.maxX) {
        return { ...player, alive: false };
      }

      return { ...player, x: newX };
    });

    set({ players: updatedPlayers });
    get().checkWinner();
  },

  handlePlayerInput: (key: string) => {
    const state = get();
    if (state.gameState !== "playing") return;

    const playerIndex = state.players.findIndex(
      (p) => p.key === key.toLowerCase() && p.alive
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
  },

  killPlayer: (playerId: number) => {
    const state = get();
    const updatedPlayers = state.players.map((p) =>
      p.id === playerId ? { ...p, alive: false } : p
    );
    set({ players: updatedPlayers });
    get().checkWinner();
  },

  checkWinner: () => {
    const state = get();
    if (state.gameState !== "playing") return;

    const alivePlayers = state.players.filter((p) => p.alive);
    
    if (alivePlayers.length <= 1) {
      set({
        gameState: "ended",
        winner: alivePlayers.length === 1 ? alivePlayers[0] : null,
      });
    }
  },

  resetGame: () => {
    set({
      gameState: "lobby",
      players: [],
      winner: null,
      usedKeys: new Set<string>(),
    });
  },
}));
