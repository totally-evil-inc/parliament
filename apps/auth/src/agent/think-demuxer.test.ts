import { describe, expect, it } from "bun:test"
import { ThinkTagDemuxer } from "./think-demuxer"

describe("ThinkTagDemuxer", () => {
  it("processes standard text without think tags without modification", () => {
    const demuxer = new ThinkTagDemuxer()
    const chunks = ["I am thinking about your request. ", "Here is the summary."]
    const deltas = []

    for (const chunk of chunks) {
      deltas.push(...demuxer.process(chunk))
    }
    deltas.push(...demuxer.flush())

    expect(deltas).toEqual([
      {
        type: "content:delta",
        text: "I am thinking about your request. ",
      },
      {
        type: "content:delta",
        text: "Here is the summary.",
      },
    ])
  })

  it("extracts <think>...</think> blocks cleanly", () => {
    const demuxer = new ThinkTagDemuxer()
    const chunks = [
      "<think>Let me query the DB first.</think>",
      "I found 3 deals in the pipeline.",
    ]
    const deltas = []

    for (const chunk of chunks) {
      deltas.push(...demuxer.process(chunk))
    }
    deltas.push(...demuxer.flush())

    expect(deltas).toEqual([
      { type: "thinking:delta", text: "Let me query the DB first." },
      {
        type: "content:delta",
        text: "I found 3 deals in the pipeline.",
      },
    ])
  })

  it("handles tags split across arbitrary chunk boundaries (<th + ink>)", () => {
    const demuxer = new ThinkTagDemuxer()
    const chunks = [
      "Hello! <th",
      "ink>Analyzing data",
      " now</th",
      "ink>Here are results.",
    ]
    const deltas = []

    for (const chunk of chunks) {
      deltas.push(...demuxer.process(chunk))
    }
    deltas.push(...demuxer.flush())

    const thinking = deltas
      .filter((d) => d.type === "thinking:delta")
      .map((d) => d.text)
      .join("")
    const content = deltas
      .filter((d) => d.type === "content:delta")
      .map((d) => d.text)
      .join("")

    expect(thinking).toBe("Analyzing data now")
    expect(content).toBe("Hello! Here are results.")
  })

  it("supports <thinking>...</thinking> and <thought>...</thought> tags", () => {
    const demuxer1 = new ThinkTagDemuxer()
    const deltas1 = [
      ...demuxer1.process(
        "<thinking>Internal reasoning</thinking>Visible answer"
      ),
      ...demuxer1.flush(),
    ]
    expect(deltas1).toEqual([
      { type: "thinking:delta", text: "Internal reasoning" },
      { type: "content:delta", text: "Visible answer" },
    ])

    const demuxer2 = new ThinkTagDemuxer()
    const deltas2 = [
      ...demuxer2.process("<thought>Deep thoughts</thought>Final solution"),
      ...demuxer2.flush(),
    ]
    expect(deltas2).toEqual([
      { type: "thinking:delta", text: "Deep thoughts" },
      { type: "content:delta", text: "Final solution" },
    ])
  })

  it("extracts think blocks from static strings cleanly", () => {
    const result = ThinkTagDemuxer.extractThinkBlocks(
      "<think>Step 1: Check invoices\nStep 2: Respond</think>You have 2 pending invoices."
    )
    expect(result.content).toBe("You have 2 pending invoices.")
    expect(result.thinking).toBe(
      "Step 1: Check invoices\nStep 2: Respond"
    )
  })

  it("handles unclosed trailing think tags safely on stream flush", () => {
    const demuxer = new ThinkTagDemuxer()
    const deltas = [
      ...demuxer.process("<think>Unfinished stream"),
      ...demuxer.flush(),
    ]
    expect(deltas).toEqual([
      { type: "thinking:delta", text: "Unfinished stream" },
    ])
  })
})
