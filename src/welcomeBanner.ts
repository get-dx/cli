import { getAssets } from "./assets.js";

type Color = [number, number, number];

const FRAMES = 20;
const FRAME_DELAY_MS = 100;

const COLOR_START: Color = [20, 20, 20];
const COLOR_HALFWAY: Color = [95, 89, 237]; // Indigo
const COLOR_END: Color = [255, 255, 255];
const COLOR_BACKGROUND: Color = [0, 0, 0];

export async function renderWelcomeBanner() {
  const assets = getAssets();

  const LOGO_D_CONTENT = assets["logoD"];
  const LOGO_X_CONTENT = assets["logoX"];

  clearScreen();

  const canvasColumns = process.stdout.columns;

  await sleep(1000);
  clearScreen();

  const compositeWidth = getMaxColumns(LOGO_X_CONTENT);
  const centeredLogoD = center(
    LOGO_D_CONTENT,
    Math.min(canvasColumns, 80),
    compositeWidth,
  );
  const centeredLogoX = center(
    LOGO_X_CONTENT,
    Math.min(canvasColumns, 80),
    compositeWidth,
  );

  for (let frame = 0; frame < FRAMES; frame += 1) {
    const progress = frame / (FRAMES - 1);
    const progressD = clamp(progress * 2, 0, 1);
    const progressX = clamp((progress - 0.5) * 2, 0, 1);
    const colorD = getThreeStageColor(
      progressD,
      COLOR_START,
      COLOR_HALFWAY,
      COLOR_END,
    );
    const colorX = getThreeStageColor(
      progressX,
      COLOR_START,
      COLOR_HALFWAY,
      COLOR_END,
    );
    const showX = progress >= 0.5;

    clearScreen();
    process.stderr.write("\n");
    process.stderr.write("\n");
    process.stderr.write(
      colorizeComposite(
        centeredLogoD,
        centeredLogoX,
        colorD,
        colorX,
        COLOR_BACKGROUND,
        showX,
      ) + "\n",
    );
    process.stderr.write("\n");
    process.stderr.write("\n");

    await sleep(FRAME_DELAY_MS);
  }
}

function clearScreen() {
  process.stderr.write("\x1b[2J\x1b[3J\x1b[H");
}

function center(
  text: string,
  canvasWidth: number,
  anchorWidth = getMaxColumns(text),
): string {
  const maxTextWidth = Math.max(...text.split("\n").map((row) => row.length));
  const safeCanvasWidth = Math.max(canvasWidth, anchorWidth);
  const leftPaddingSize = Math.max(
    0,
    Math.floor((safeCanvasWidth - anchorWidth) / 2),
  );

  const lines = text.split("\n");
  const centeredLines = [];

  for (const line of lines) {
    const leftPaddedLine =
      " ".repeat(leftPaddingSize) + line.padEnd(maxTextWidth);
    const rightPadding = " ".repeat(
      Math.max(0, safeCanvasWidth - leftPaddedLine.length),
    );
    centeredLines.push(leftPaddedLine + rightPadding);
  }

  return centeredLines.join("\n") + "\n";
}

function colorizeComposite(
  textD: string,
  textX: string,
  colorD: Color,
  colorX: Color,
  colorBackground: Color,
  showX: boolean,
): string {
  const linesD = textD.split("\n");
  const linesX = textX.split("\n");
  const rowCount = Math.max(linesD.length, linesX.length);
  const [br, bg, bb] = colorBackground;
  const background = `\x1b[48;2;${br};${bg};${bb}m`;
  const reset = "\x1b[0m";
  const outputLines = [];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const rowD = linesD[rowIndex] ?? "";
    const rowX = linesX[rowIndex] ?? "";
    const columnCount = Math.max(rowD.length, rowX.length);
    let currentColor = null;
    let rowOutput = background;

    for (let col = 0; col < columnCount; col += 1) {
      const charD = rowD[col] ?? " ";
      const charX = showX ? (rowX[col] ?? " ") : " ";
      const useX = charX !== " ";
      const useD = !useX && charD !== " ";
      const nextColor = useX ? colorX : useD ? colorD : null;
      const char = useX ? charX : useD ? charD : " ";

      if (nextColor === null) {
        if (currentColor !== null) {
          rowOutput += background;
          currentColor = null;
        }
      } else if (
        currentColor === null ||
        currentColor[0] !== nextColor[0] ||
        currentColor[1] !== nextColor[1] ||
        currentColor[2] !== nextColor[2]
      ) {
        rowOutput += colorToAnsi(nextColor);
        currentColor = nextColor;
      }

      rowOutput += char;
    }

    rowOutput += reset;
    outputLines.push(rowOutput);
  }

  return outputLines.join("\n");
}

function colorToAnsi(colorForeground: Color): string {
  const [fr, fg, fb] = colorForeground;
  return `\x1b[38;2;${fr};${fg};${fb}m`;
}

function getMaxColumns(...texts: string[]): number {
  return Math.max(
    ...texts.map((text) =>
      Math.max(...text.split("\n").map((row) => row.length)),
    ),
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tweenLinear(start: number, end: number, percent: number): number {
  return start + (end - start) * percent;
}

function tweenColor(
  colorStart: Color,
  colorEnd: Color,
  percent: number,
): Color {
  return colorStart.map((start, index) =>
    Math.round(tweenLinear(start, colorEnd[index], percent)),
  ) as Color;
}

function getThreeStageColor(
  progress: number,
  colorStart: Color,
  colorHalfway: Color,
  colorEnd: Color,
): Color {
  if (progress <= 0.5) {
    return tweenColor(colorStart, colorHalfway, progress * 2);
  }

  return tweenColor(colorHalfway, colorEnd, (progress - 0.5) * 2);
}
