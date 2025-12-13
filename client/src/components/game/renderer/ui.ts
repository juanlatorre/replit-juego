import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  VAPORWAVE_COLORS,
} from "@/lib/game/constants";
import { Difficulty, Player, ScoreEntry, FloatingText } from "@/lib/game/types";

export function drawCountdown(
  ctx: CanvasRenderingContext2D,
  countdown: number
) {
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

export function drawLobby(
  ctx: CanvasRenderingContext2D,
  players: Player[],
  difficulty: Difficulty,
  scores: ScoreEntry[],
  speedRampEnabled: boolean
) {
  ctx.fillStyle = "rgba(0,0,0,0.3)"; // Transparencia para ver el fondo
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
    if (d === difficulty) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = diffColors[d];
    }
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
    ctx.shadowBlur = 5;
    ctx.shadowColor = VAPORWAVE_COLORS[0];
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
      ctx.shadowBlur = 5;
      ctx.shadowColor = player.color;
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
      ctx.fillText(
        `[${score.key.toUpperCase()}]: ${score.wins} WINS`,
        70,
        420 + i * 18
      );
    });
  }

  if (players.length >= 2) {
    ctx.fillStyle = VAPORWAVE_COLORS[1];
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.shadowBlur = 10;
    ctx.shadowColor = VAPORWAVE_COLORS[1];
    ctx.fillText("SPACE TO START", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 60);
    ctx.shadowBlur = 0;
  }

  if (players.length >= 1) {
    ctx.fillStyle = VAPORWAVE_COLORS[3];
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      "M FOR PRACTICE MODE (VS AI)",
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT - 35
    );
  }

  if (players.length === 0) {
    ctx.fillStyle = "#666666";
    ctx.font = "16px monospace";
    ctx.textAlign = "center";
    ctx.fillText("WAITING FOR PLAYERS...", CANVAS_WIDTH / 2, 240);
  }
}

export function drawEnded(
  ctx: CanvasRenderingContext2D,
  winner: Player | null,
  scores: ScoreEntry[]
) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(50, 50, CANVAS_WIDTH - 100, CANVAS_HEIGHT - 100);
  ctx.strokeStyle = VAPORWAVE_COLORS[3];
  ctx.lineWidth = 2;
  ctx.shadowBlur = 10;
  ctx.shadowColor = VAPORWAVE_COLORS[3];
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
      ctx.fillText(
        `KEY: "${winner.key.toUpperCase()}"`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2
      );
    }
  } else {
    ctx.fillStyle = VAPORWAVE_COLORS[0];
    ctx.shadowBlur = 20;
    ctx.shadowColor = VAPORWAVE_COLORS[0];
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
      ctx.fillText(
        `[${score.key.toUpperCase()}]: ${score.wins} WINS`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 75 + i * 20
      );
    });
  }

  ctx.fillStyle = VAPORWAVE_COLORS[1];
  ctx.font = "18px monospace";
  ctx.shadowBlur = 10;
  ctx.shadowColor = VAPORWAVE_COLORS[1];
  ctx.fillText(
    "R: REMATCH | L: LOBBY | C: CLEAR SCORES",
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT - 65
  );
  ctx.shadowBlur = 0;
}

export function drawFloatingTexts(
  ctx: CanvasRenderingContext2D,
  delta: number,
  texts: FloatingText[]
) {
  // Filtrar muertos (mutación in-place del array ref pasado por el componente padre)
  // Nota: En un entorno puramente funcional esto se haría diferente, pero para rendimiento en canvas esto está bien.
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.life -= delta * 1.5;
    t.y -= delta * 50;

    if (t.life <= 0) {
      texts.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = t.life;
    ctx.fillStyle = t.color;
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 10;
    ctx.font = `bold ${t.size}px monospace`;
    ctx.textAlign = "center";

    const scale = 1 + Math.sin((1 - t.life) * Math.PI) * 0.5;
    ctx.translate(t.x, t.y);
    ctx.scale(scale, scale);

    ctx.fillText(t.text, 0, 0);
    ctx.restore();
  }
}
