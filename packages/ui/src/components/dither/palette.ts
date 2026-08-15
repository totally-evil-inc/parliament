export type Rgb = [number, number, number]

export type DitherColor =
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "orange"
  | "amber"
  | "red"
  | "grey"

export type Seed = { fill: Rgb; line: Rgb; star: Rgb }

// Color seeds calibrated for the dither system
export const PALETTE: Record<DitherColor, Seed> = {
  green: {
    fill: [40, 210, 110],
    line: [150, 255, 180],
    star: [200, 255, 220],
  },
  blue: {
    fill: [53, 143, 243],
    line: [150, 200, 255],
    star: [205, 228, 255],
  },
  purple: {
    fill: [150, 110, 255],
    line: [200, 175, 255],
    star: [225, 210, 255],
  },
  pink: {
    fill: [240, 90, 190],
    line: [255, 170, 220],
    star: [255, 205, 235],
  },
  orange: {
    fill: [255, 130, 45],
    line: [255, 185, 120],
    star: [255, 215, 170],
  },
  amber: {
    fill: [245, 185, 50],
    line: [255, 220, 120],
    star: [255, 235, 170],
  },
  red: {
    fill: [240, 70, 70],
    line: [255, 150, 140],
    star: [255, 195, 185],
  },
  grey: {
    fill: [120, 120, 130],
    line: [160, 160, 170],
    star: [190, 190, 200],
  },
}

export const rgb = ([r, g, b]: Rgb, k = 1, a = 1): string =>
  `rgba(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)},${a})`

export const seedOfColor = (color: DitherColor): Seed => PALETTE[color]

export const isDitherColor = (value: unknown): value is DitherColor =>
  typeof value === "string" && value in PALETTE
