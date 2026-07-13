import { NodeViewWrapper } from "@tiptap/react"
import { Button } from "@workspace/ui/components/button"
import { IconDeleteX, IconImage, IconDuplicatePlus } from "nucleo-glass"
import type { NodeViewProps } from "@tiptap/react"
import type { GalleryImage } from "../types"
import { getArrayAttr, getColumnCount } from "../types"
import { useDocumentEditorHost } from "../../runtime/react"

const gridColumnClassNames = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-3",
} as const

export function GalleryView({ node, updateAttributes }: NodeViewProps) {
  const { confirm, createId } = useDocumentEditorHost()
  const images = getArrayAttr<GalleryImage>(node.attrs.images)
  const columns = getColumnCount(node.attrs.columns)

  const addImage = () => {
    updateAttributes({
      images: [...images, { id: createId("gallery-image"), alt: "New Image" }],
    })
  }

  const removeImage = async (index: number) => {
    const confirmed = await confirm({
      title: "Remove image?",
      description: "This will remove the selected gallery image.",
      confirmLabel: "Remove image",
      variant: "destructive",
    })

    if (!confirmed) return

    updateAttributes({
      images: images.filter((_, i) => i !== index),
    })
  }

  return (
    <NodeViewWrapper className="gallery my-[var(--document-section-spacing)] rounded-[var(--document-radius)] border-2 border-dashed border-[color-mix(in_oklab,var(--document-muted-foreground)_24%,transparent)] p-8 transition-colors hover:border-[color-mix(in_oklab,var(--document-accent)_40%,transparent)]">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
          Gallery
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={addImage}
          className="h-8 gap-1.5 text-xs"
        >
          <IconDuplicatePlus className="h-3.5 w-3.5" />
          Add Image
        </Button>
      </div>

      <div className={`grid gap-4 ${gridColumnClassNames[columns]}`}>
        {images.map((image, index) => (
          <div
            key={image.id || `${image.assetId}-${image.alt}`}
            className="group relative aspect-square overflow-hidden rounded-[var(--document-radius)] bg-[color-mix(in_oklab,var(--document-accent)_8%,transparent)]"
          >
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[color-mix(in_oklab,var(--document-muted-foreground)_50%,transparent)]">
              <IconImage className="h-8 w-8" />
              <span className="text-[10px] font-medium tracking-wider uppercase">
                Placeholder
              </span>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => void removeImage(index)}
              className="absolute top-2 right-2 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive/80"
              aria-label="Remove image"
            >
              <IconDeleteX className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  )
}
