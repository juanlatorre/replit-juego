import {
  BAR_HEIGHT,
  BAR_PADDING_X,
  CANVAS_WIDTH,
  CURSOR_RADIUS,
} from "@/lib/game/constants";
import { Particle, Player } from "@/lib/game/types";

export function drawPlaying(
  ctx: CanvasRenderingContext2D,
  players: Player[],
  particles: Particle[]
) {
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

      // INDICADOR DE ESCUDO
      if (player.shields > 0) {
        ctx.beginPath();
        ctx.arc(cursorX, cursorY, CURSOR_RADIUS + 5, 0, Math.PI * 2);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 5;
        ctx.shadowColor = "#fff";
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

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
    const label = player.isAI
      ? `IA`
      : `P${player.id} [${player.key.toUpperCase()}]`;
    ctx.shadowBlur = 5;
    ctx.shadowColor = player.color;
    ctx.fillText(label, BAR_PADDING_X, laneY - 8);
    ctx.shadowBlur = 0;
  });

  particles.forEach((particle) => {
    ctx.shadowBlur = 15;
    ctx.shadowColor = particle.color;
    ctx.globalAlpha = particle.life / particle.maxLife;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(
      particle.x,
      particle.y,
      particle.size * (particle.life / particle.maxLife),
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
  });
  ctx.globalAlpha = 1;
}
