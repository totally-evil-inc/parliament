import { mergeAttributes, Node } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { GalleryView } from "../components/gallery-view"

export const Gallery = Node.create({
  name: "gallery",
  group: "block",
  content: "block*",
  defining: true,

  addAttributes() {
    return {
      images: {
        default: [
          { id: "gallery-image-default-1", alt: "Image 1" },
          { id: "gallery-image-default-2", alt: "Image 2" },
          { id: "gallery-image-default-3", alt: "Image 3" },
        ],
      },
      columns: { default: 3 },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="gallery"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "gallery" }),
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(GalleryView)
  },
})
