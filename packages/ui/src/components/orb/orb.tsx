import type { CSSProperties } from "react"
import { cn } from "../../lib/utils"
import styles from "./orb.module.css"

/** The stage the geometry is tuned on; --orb-k scales it to `size`. */
const STAGE = 28

/** Default rendered size — 20×20 indicator box. */
const SIZE = 20

export type LatticeVariant = "S1" | "S2" | "S3" | "S4" | "S5"
export type LensVariant = "B1" | "B2" | "B3" | "B4" | "B5"
export type RingVariant = "C1" | "C2" | "C3" | "C4" | "C5"
export type HelixVariant = "G1" | "G2" | "G3" | "G4" | "G5"
export type OrbVariant =
  | LatticeVariant
  | LensVariant
  | RingVariant
  | HelixVariant

export const LATTICE_VARIANTS: LatticeVariant[] = ["S1", "S2", "S3", "S4", "S5"]
export const LENS_VARIANTS: LensVariant[] = ["B1", "B2", "B3", "B4", "B5"]
export const RING_VARIANTS: RingVariant[] = ["C1", "C2", "C3", "C4", "C5"]
export const HELIX_VARIANTS: HelixVariant[] = ["G1", "G2", "G3", "G4", "G5"]

export const ORB_TASKS: Record<OrbVariant, string> = {
  S1: "Thinking",
  S2: "Processing",
  S3: "Working",
  S4: "Searching",
  S5: "Finalizing",
  B1: "Thinking",
  B2: "Searching",
  B3: "Generating",
  B4: "Solving",
  B5: "Routing",
  C1: "Loading",
  C2: "Listening",
  C3: "Streaming",
  C4: "Analyzing",
  C5: "Compiling",
  G1: "Processing",
  G2: "Sequencing",
  G3: "Uploading",
  G4: "Syncing",
  G5: "Idling",
}

function isLattice(v: OrbVariant): v is LatticeVariant {
  return (LATTICE_VARIANTS as OrbVariant[]).includes(v)
}

function isRing(v: OrbVariant): v is RingVariant {
  return (RING_VARIANTS as OrbVariant[]).includes(v)
}

const N = 3 // lattice is N×N
const PITCH = 6 // centre-to-centre spacing in stage px
const MID = (N - 1) / 2

/** Clockwise walk of the lattice perimeter — the track `orbit` runs on. */
const RING: [number, number][] = (() => {
  const ring: [number, number][] = []
  for (let x = 0; x < N; x++) ring.push([x, 0])
  for (let y = 1; y < N; y++) ring.push([N - 1, y])
  for (let x = N - 2; x >= 0; x--) ring.push([x, N - 1])
  for (let y = N - 2; y >= 1; y--) ring.push([0, y])
  return ring
})()

const RING_INDEX = new Map(RING.map(([x, y], i) => [`${x},${y}`, i]))

function cellDelay(v: LatticeVariant, x: number, y: number): number {
  const dx = x - MID
  const dy = y - MID
  switch (v) {
    case "S1":
      return Math.hypot(dx, dy) * 700 - (dx === 0 && dy === 0 ? 180 : 0)
    case "S2":
      return ((x + y) / (2 * (N - 1))) * 1500
    case "S3": {
      const i = RING_INDEX.get(`${x},${y}`)
      if (i === undefined) return 0
      return -(((RING.length - i) % RING.length) / RING.length) * 1700
    }
    case "S4":
      return (x / (N - 1)) * 1100
    case "S5": {
      const i = RING_INDEX.get(`${x},${y}`)
      if (i === undefined) return 0
      const scrambled = (i * 3) % RING.length
      return -(scrambled / RING.length) * 1700
    }
  }
}

const SWIRL = 1.05
const SPREAD = 1.6

function swirl(x: number, y: number, angle: number): [number, number] {
  const dx = x - MID
  const dy = y - MID
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return [
    ((dx * cos - dy * sin) * SPREAD - dx) * PITCH,
    ((dx * sin + dy * cos) * SPREAD - dy) * PITCH,
  ]
}

interface Cell {
  key: string
  left: number
  top: number
  delay: number
  ax: number
  ay: number
  bx: number
  by: number
  still: boolean
  mid: boolean
}

function latticeCells(v: LatticeVariant): Cell[] {
  const cells: Cell[] = []
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const [ax, ay] = swirl(x, y, -SWIRL)
      const [bx, by] = swirl(x, y, SWIRL)
      cells.push({
        key: `${x},${y}`,
        left: x * PITCH,
        top: y * PITCH,
        delay: cellDelay(v, x, y),
        ax,
        ay,
        bx,
        by,
        still: (v === "S3" || v === "S5") && !RING_INDEX.has(`${x},${y}`),
        mid: x === MID && y === MID,
      })
    }
  }
  return cells
}

const RING_N = 8
const RING_R = 8

interface RingDot {
  key: number
  rx: number
  ry: number
  delay: number
}

function ringDots(_v: RingVariant): RingDot[] {
  const dots: RingDot[] = []
  for (let i = 0; i < RING_N; i++) {
    const angle = (i / RING_N) * Math.PI * 2 - Math.PI / 2
    dots.push({
      key: i,
      rx: Math.cos(angle) * RING_R,
      ry: Math.sin(angle) * RING_R,
      delay: -((RING_N - 1 - i) / RING_N) * 1800,
    })
  }
  return dots
}

export interface OrbProps {
  variant?: OrbVariant
  /** Rendered size in px. Geometry scales smoothly via CSS variable. */
  size?: number
  /** Accessible label. */
  label?: string
  className?: string
  style?: CSSProperties
}

export function Orb({
  variant = "S1",
  size = SIZE,
  label,
  className,
  style,
}: OrbProps) {
  const text = label ?? `${ORB_TASKS[variant]}…`

  return (
    <span
      className={cn(styles.root, className)}
      style={style}
      role="img"
      aria-label={text}
    >
      <span
        className={styles.glyph}
        style={
          {
            width: size,
            height: size,
            "--orb-k": size / STAGE,
          } as CSSProperties
        }
      >
        {isLattice(variant) ? (
          <span className={styles.lattice} data-variant={variant}>
            {latticeCells(variant).map((c) => (
              <span
                key={c.key}
                className={styles.cell}
                data-still={c.still ? "" : undefined}
                data-mid={c.mid ? "" : undefined}
                style={
                  {
                    left: c.left,
                    top: c.top,
                    animationDelay: `${c.delay}ms`,
                    "--orb-ax": `${c.ax}px`,
                    "--orb-ay": `${c.ay}px`,
                    "--orb-bx": `${c.bx}px`,
                    "--orb-by": `${c.by}px`,
                  } as CSSProperties
                }
              />
            ))}
          </span>
        ) : isRing(variant) ? (
          <span className={styles.ring} data-variant={variant}>
            {ringDots(variant).map((d) => (
              <span
                key={d.key}
                className={styles.ringDot}
                style={
                  {
                    "--orb-rx": `${d.rx}px`,
                    "--orb-ry": `${d.ry}px`,
                    animationDelay: `${d.delay}ms`,
                  } as CSSProperties
                }
              />
            ))}
          </span>
        ) : (
          <span className={styles.lens} data-variant={variant}>
            <span className={cn(styles.shape, styles.shapeA)} />
            <span className={cn(styles.shape, styles.shapeB)} />
            <span className={cn(styles.shape, styles.shapeC)} />
            {variant === "B1" && (
              <span className={cn(styles.shape, styles.shapeD)} />
            )}
          </span>
        )}
      </span>
    </span>
  )
}
