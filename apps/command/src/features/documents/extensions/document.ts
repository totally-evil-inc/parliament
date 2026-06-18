import { Node } from "@tiptap/core"

export const BusinessDocument = Node.create({
  name: "doc",
  topNode: true,
  content: "documentHeader block* lineItems",
})
