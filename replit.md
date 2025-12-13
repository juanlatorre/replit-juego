# The Shrinking Bar

## Overview
A local multiplayer party game where 2-4 players compete on the same screen. Each player controls a cursor bouncing within a horizontal bar that shrinks every time they press their key.

## Game Rules
1. **Lobby**: Players join by pressing any key (except SPACE, R, ESC, M, 1, 2, 3). Each player gets a unique key and color.
2. **Start**: Press SPACE when 2+ players have joined, or M for practice mode (1 player vs AI).
3. **Difficulty**: Press 1 (Easy), 2 (Normal), or 3 (Hard) in lobby to change speed.
4. **Gameplay**: 
   - Each player's cursor moves automatically within their bar
   - Press your assigned key to reverse direction
   - IMPORTANT: When you press your key, the portion of the bar in your previous direction is cut off
   - If your cursor touches the edge of your bar WITHOUT pressing your key, you're eliminated
5. **Victory**: Last player alive wins
6. **Restart**: Press R after game ends, C to clear scores

## Project Structure
```
client/src/
├── components/
│   └── game/
│       └── ShrinkingBarGame.tsx   # Main game component with Canvas 2D rendering
├── lib/
│   └── stores/
│       └── useShrinkingBar.tsx    # Zustand store for game state management
└── App.tsx                         # Entry point that renders the game
```

## Technical Details
- Built with React + TypeScript + Vite
- Game rendering: HTML5 Canvas 2D
- State management: Zustand
- Styling: Tailwind CSS

## Key Features
- Support for 2-4 local players
- Dynamic key assignment (any key works)
- Grace margin system to prevent instant death at edges
- Visual feedback for eliminated players
- Color-coded player lanes
- Particle effects on elimination
- Score tracking across rounds
- Three difficulty levels (Easy, Normal, Hard)
- Sound effects for bounces, eliminations, and victory
- Practice mode with AI opponent

## Sounds
Uses existing sounds from `/sounds/`:
- hit.mp3 - For bounces and eliminations
- success.mp3 - For victory

## Running the Game
The game runs on port 5000. Use `npm run dev` to start the development server.
