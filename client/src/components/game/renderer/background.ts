// client/src/components/game/renderer/background.ts
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  FONT_SIZE,
  MATRIX_SPEED,
  VAPORWAVE_COLORS,
} from "@/lib/game/constants";
import { FractalEntity } from "@/lib/game/types";

export function drawMatrixRain(ctx: CanvasRenderingContext2D, drops: number[]) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.font = `${FONT_SIZE}px monospace`;
  ctx.textAlign = "center";

  // Re-inicializar gotas si cambia el ancho
  if (drops.length < Math.floor(CANVAS_WIDTH / FONT_SIZE)) {
    const diff = Math.floor(CANVAS_WIDTH / FONT_SIZE) - drops.length;
    for (let k = 0; k < diff; k++) drops.push(Math.random() * 100);
  }

  for (let i = 0; i < drops.length; i++) {
    const char = String.fromCharCode(0x30a0 + Math.random() * 96);
    const color =
      VAPORWAVE_COLORS[Math.floor(Math.random() * VAPORWAVE_COLORS.length)];

    ctx.fillStyle = color;
    ctx.fillText(char, i * FONT_SIZE, Math.floor(drops[i]) * FONT_SIZE);

    if (drops[i] * FONT_SIZE > CANVAS_HEIGHT && Math.random() > 0.98) {
      drops[i] = 0;
    }
    drops[i] += MATRIX_SPEED;
  }
}

export function drawVisualizerBg(
  ctx: CanvasRenderingContext2D,
  delta: number,
  analyser: AnalyserNode | null,
  dataArray: Uint8Array | null,
  fractals: FractalEntity[],
  matrixDrops: number[]
) {
  if (!analyser || !dataArray) {
    drawMatrixRain(ctx, matrixDrops);
    return;
  }

  analyser.getByteFrequencyData(dataArray as Uint8Array<ArrayBuffer>);
  const bufferLength = dataArray.length;

  let bass = 0;
  for (let i = 0; i < 10; i++) bass += dataArray[i];
  bass = bass / 10 / 255;

  const time = performance.now() / 1000;

  // 1. Matrix Fondo
  drawMatrixRain(ctx, matrixDrops);

  // 2. Capa Unificadora
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 3. Fractales
  fractals.forEach((f) => {
    // Física
    f.x += f.vx * delta;
    f.y += f.vy * delta;
    f.phase += f.rotationSpeed * delta;

    // Rebote agresivo
    if (f.x < -50) {
      f.x = -50;
      f.vx *= -1;
    }
    if (f.x > CANVAS_WIDTH + 50) {
      f.x = CANVAS_WIDTH + 50;
      f.vx *= -1;
    }
    if (f.y < -50) {
      f.y = -50;
      f.vy *= -1;
    }
    if (f.y > CANVAS_HEIGHT + 50) {
      f.y = CANVAS_HEIGHT + 50;
      f.vy *= -1;
    }

    ctx.save();
    ctx.translate(f.x, f.y);

    const localScale = f.sizeScale * (1 + bass * 0.4);
    ctx.scale(localScale, localScale);
    ctx.rotate(f.phase + bass * Math.PI * 0.2);

    const colorIndex =
      (Math.floor(time * 4) + f.colorOffset) % VAPORWAVE_COLORS.length;
    const color = VAPORWAVE_COLORS[colorIndex];

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;

    switch (f.type) {
      case "circle":
        ctx.beginPath();
        ctx.arc(0, 0, 20 + bass * 10, 0, Math.PI * 2);
        ctx.stroke();
        if (bass > 0.5) {
          ctx.globalAlpha = 0.3;
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
        break;
      case "square":
        ctx.beginPath();
        const size = 30 + bass * 15;
        ctx.rect(-size / 2, -size / 2, size, size);
        ctx.stroke();
        ctx.moveTo(-size / 2, -size / 2);
        ctx.lineTo(size / 2, size / 2);
        ctx.moveTo(size / 2, -size / 2);
        ctx.lineTo(-size / 2, size / 2);
        ctx.stroke();
        break;
      case "triangle":
        const tSize = 35 + bass * 10;
        ctx.beginPath();
        ctx.moveTo(0, -tSize);
        ctx.lineTo(tSize, tSize);
        ctx.lineTo(-tSize, tSize);
        ctx.closePath();
        ctx.stroke();
        break;
      case "cross":
        const cSize = 40 + bass * 20;
        ctx.beginPath();
        ctx.moveTo(0, -cSize);
        ctx.lineTo(0, cSize);
        ctx.moveTo(-cSize, 0);
        ctx.lineTo(cSize, 0);
        ctx.lineWidth = 4;
        ctx.stroke();
        break;
      case "mandala":
        const bars = 8;
        const symmetry = 4;
        const step = Math.floor(bufferLength / bars);
        for (let i = 0; i < bars; i++) {
          const value = dataArray[i * step] / 255.0;
          ctx.lineWidth = 1 + value * 3;
          for (let j = 0; j < symmetry; j++) {
            ctx.save();
            ctx.rotate(((Math.PI * 2) / symmetry) * j);
            const dist = 5 + i * 4;
            const pSize = value * 10;
            if (pSize > 1) {
              ctx.beginPath();
              ctx.arc(0, dist + value * 30, pSize, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
        }
        break;
    }
    ctx.restore();
  });
}
