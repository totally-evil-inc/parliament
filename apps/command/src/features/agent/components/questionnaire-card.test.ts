import { describe, expect, test } from "bun:test"
import { normalizeQuestionItem } from "./questionnaire-card"

describe("QuestionnaireCard normalizeQuestionItem", () => {
  test("normalizes question item with label field and select/textarea types", () => {
    const rawToolPayload = {
      questions: [
        {
          id: "title",
          type: "text",
          label: "Meeting title",
          placeholder: "e.g., Q3 Sales Discovery & Demo",
          required: true,
        },
        {
          id: "duration",
          type: "select",
          label: "Duration",
          options: [
            { value: "30", label: "30 minutes" },
            { value: "60", label: "1 hour" },
            { value: "90", label: "1.5 hours" },
            { value: "120", label: "2 hours" },
          ],
          required: true,
        },
        {
          id: "description",
          type: "textarea",
          label: "Description / agenda (optional)",
          placeholder: "Brief agenda or notes for the meeting",
        },
        {
          id: "attendees",
          type: "text",
          label: "Attendee emails (comma-separated, optional)",
          placeholder: "client@example.com, colleague@company.com",
        },
        {
          id: "location",
          type: "select",
          label: "Location type",
          options: [
            { value: "video", label: "Video call (Google Meet)" },
            { value: "physical", label: "Physical address" },
            { value: "phone", label: "Phone call" },
          ],
          required: true,
        },
        {
          id: "location_details",
          type: "text",
          label: "Location details (address, phone number, or 'Google Meet')",
          placeholder:
            "Auto-filled for Google Meet; enter address or phone if physical/phone",
        },
      ],
    }

    const normalized = rawToolPayload.questions.map((q, idx) =>
      normalizeQuestionItem(q, idx)
    )

    expect(normalized[0].question).toBe("Meeting title")
    expect(normalized[0].type).toBe("text")
    expect(normalized[0].required).toBe(true)

    expect(normalized[1].question).toBe("Duration")
    expect(normalized[1].type).toBe("single_choice")
    expect(normalized[1].options).toHaveLength(4)

    expect(normalized[2].question).toBe("Description / agenda (optional)")
    expect(normalized[2].type).toBe("text")

    expect(normalized[3].question).toBe(
      "Attendee emails (comma-separated, optional)"
    )
    expect(normalized[3].type).toBe("text")

    expect(normalized[4].question).toBe("Location type")
    expect(normalized[4].type).toBe("single_choice")
    expect(normalized[4].options).toHaveLength(3)

    expect(normalized[5].question).toBe(
      "Location details (address, phone number, or 'Google Meet')"
    )
    expect(normalized[5].type).toBe("text")
  })

  test("handles prompt, choices, checkboxes, and string options", () => {
    const raw = {
      prompt: "What is your preference?",
      type: "checkboxes",
      choices: ["Option A", "Option B"],
    }
    const normalized = normalizeQuestionItem(raw, 0)
    expect(normalized.question).toBe("What is your preference?")
    expect(normalized.type).toBe("multi_select")
    expect(normalized.options).toEqual([
      { label: "Option A", value: "Option A", description: undefined },
      { label: "Option B", value: "Option B", description: undefined },
    ])
  })
})
