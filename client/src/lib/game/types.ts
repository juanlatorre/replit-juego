export type GameState = "lobby" | "countdown" | "playing" | "ended";
export type GameMode = "multiplayer" | "practice";
export type Difficulty = "easy" | "normal" | "hard";
export type ShapeType = "mandala" | "circle" | "square" | "triangle" | "cross";

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
  shields: number;
}

export interface ScoreEntry {
  playerId: number;
  key: string;
  color: string;
  wins: number;
}

export interface FractalEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  sizeScale: number;
  phase: number;
  type: ShapeType;
  rotationSpeed: number;
  colorOffset: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
  size: number;
}
