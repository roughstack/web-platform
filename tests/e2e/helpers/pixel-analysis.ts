import { PNG } from "pngjs";
import { XRAY_COLOR } from "./xray";

/**
 * Pixel-level analysis of an x-ray screenshot.
 *
 * Division of labour, so the numbers here are read correctly: the geometric auditor in
 * `layout-audit.ts` is the precise gate for real overlaps, because `elementFromPoint`
 * knows the true stacking order. This module is a heuristic second opinion. It is good
 * at catching things geometry is blind to (CSS transforms, clip paths, elements pushed
 * out of a scroll container) and at producing an annotated image that is fast to review
 * by eye. Its findings are warnings, not failures.
 */

export interface DensityCell {
  col: number;
  row: number;
  x: number;
  y: number;
  /** Fraction of pixels in this cell that are element boundaries, 0 to 1. */
  density: number;
}

export interface PixelAnalysis {
  width: number;
  height: number;
  /** Fraction of all pixels that are element boundaries. */
  overallDensity: number;
  /** Cells whose boundary density is anomalously high. */
  hotspots: DensityCell[];
  /** Every cell, for producing the annotated overlay. */
  cells: DensityCell[];
  cellSize: number;
}

const CELL_SIZE = 24;
/** A cell where more than this fraction of pixels are boundaries is crowded. */
const HOTSPOT_DENSITY = 0.28;
/** Tolerance for matching the outline colour after PNG compression and antialiasing. */
const COLOR_TOLERANCE = 60;

function isBoundaryPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 128) return false;
  return (
    Math.abs(r - XRAY_COLOR.r) <= COLOR_TOLERANCE &&
    Math.abs(g - XRAY_COLOR.g) <= COLOR_TOLERANCE &&
    Math.abs(b - XRAY_COLOR.b) <= COLOR_TOLERANCE
  );
}

/**
 * Builds a boundary-density map from an x-ray screenshot and flags crowded regions.
 */
export function analyzeXrayScreenshot(buffer: Buffer): PixelAnalysis {
  const png = PNG.sync.read(buffer);
  const { width, height, data } = png;

  const cols = Math.ceil(width / CELL_SIZE);
  const rows = Math.ceil(height / CELL_SIZE);
  const counts = new Uint32Array(cols * rows);
  const totals = new Uint32Array(cols * rows);

  let boundaryPixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const cell = Math.floor(y / CELL_SIZE) * cols + Math.floor(x / CELL_SIZE);
      totals[cell]++;
      if (isBoundaryPixel(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
        counts[cell]++;
        boundaryPixels++;
      }
    }
  }

  const cells: DensityCell[] = [];
  const hotspots: DensityCell[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      if (totals[i] === 0) continue;
      const cell: DensityCell = {
        col,
        row,
        x: col * CELL_SIZE,
        y: row * CELL_SIZE,
        density: counts[i] / totals[i],
      };
      cells.push(cell);
      if (cell.density >= HOTSPOT_DENSITY) hotspots.push(cell);
    }
  }

  return {
    width,
    height,
    overallDensity: boundaryPixels / (width * height),
    hotspots: hotspots.sort((a, b) => b.density - a.density),
    cells,
    cellSize: CELL_SIZE,
  };
}

/**
 * Produces a copy of the screenshot with hotspot cells tinted, so a crowded or
 * overlapping region can be located at a glance instead of hunted for.
 */
export function annotateHotspots(buffer: Buffer, analysis: PixelAnalysis): Buffer {
  const png = PNG.sync.read(buffer);
  const { width, height, data } = png;

  for (const cell of analysis.hotspots) {
    const xEnd = Math.min(cell.x + analysis.cellSize, width);
    const yEnd = Math.min(cell.y + analysis.cellSize, height);
    for (let y = cell.y; y < yEnd; y++) {
      for (let x = cell.x; x < xEnd; x++) {
        const idx = (width * y + x) << 2;
        // Tint toward yellow while preserving the underlying structure.
        data[idx] = Math.min(255, data[idx] + 90);
        data[idx + 1] = Math.min(255, data[idx + 1] + 90);
        data[idx + 2] = Math.max(0, data[idx + 2] - 40);
      }
    }
  }

  return PNG.sync.write(png);
}

/** One-line summary suitable for test output. */
export function summarizeAnalysis(analysis: PixelAnalysis): string {
  return [
    `boundary density ${(analysis.overallDensity * 100).toFixed(2)}%`,
    `${analysis.hotspots.length} crowded cell(s)`,
    analysis.hotspots.length > 0
      ? `densest at (${analysis.hotspots[0].x}, ${analysis.hotspots[0].y}) = ${(analysis.hotspots[0].density * 100).toFixed(1)}%`
      : "no crowding",
  ].join(", ");
}
