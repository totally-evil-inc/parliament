import { describe, expect, it } from "bun:test"
import {
  HELIX_VARIANTS,
  LATTICE_VARIANTS,
  LENS_VARIANTS,
  ORB_TASKS,
  RING_VARIANTS,
} from "./orb"

describe("AICSS Reasoning Orb Primitives", () => {
  it("defines all canonical orb variants with task mappings", () => {
    for (const v of LATTICE_VARIANTS) {
      expect(ORB_TASKS[v]).toBeDefined()
    }
    for (const v of LENS_VARIANTS) {
      expect(ORB_TASKS[v]).toBeDefined()
    }
    for (const v of RING_VARIANTS) {
      expect(ORB_TASKS[v]).toBeDefined()
    }
    for (const v of HELIX_VARIANTS) {
      expect(ORB_TASKS[v]).toBeDefined()
    }
  })

  it("includes S1, S2, S3, S4, S5 in Lattice family", () => {
    expect(LATTICE_VARIANTS).toEqual(["S1", "S2", "S3", "S4", "S5"])
  })
})
