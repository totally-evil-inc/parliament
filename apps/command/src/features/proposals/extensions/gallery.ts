import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { GalleryView } from "@/features/proposals/components/gallery-view"

export const Gallery = Node.create({
  name: "gallery",
  group: "block",
  content: "block*",
  defining: true,

  addAttributes() {
    return {
      images: {
        default: [
          { url: "", alt: "Image 1" },
          { url: "", alt: "Image 2" },
          { url: "", alt: "Image 3" },
        ],
      },
      columns: { default: 3 },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="gallery"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "gallery" }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(GalleryView)
  },
})
