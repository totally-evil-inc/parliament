import { NodeViewWrapper } from "@tiptap/react"
import { Button } from "@workspace/ui/components/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Delete02Icon,
  Image01Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"
import type { NodeViewProps } from "@tiptap/react"

export function GalleryView({ node, updateAttributes }: NodeViewProps) {
  const { images, columns } = node.attrs

  const addImage = () => {
    updateAttributes({ images: [...images, { url: "", alt: "New Image" }] })
  }

  const removeImage = (index: number) => {
    updateAttributes({
      images: images.filter((_: any, i: number) => i !== index),
    })
  }

  return (
    <NodeViewWrapper className="gallery my-12 rounded-xl border-2 border-dashed border-muted-foreground/20 p-8 transition-colors hover:border-primary/30">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-widest text-muted-foreground uppercase">
          Gallery
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={addImage}
          className="h-8 gap-1.5 text-xs"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="h-3.5 w-3.5" />
          Add Image
        </Button>
      </div>

      <div className={`grid gap-4 grid-cols-${columns}`}>
        {images.map((_: any, index: number) => (
          <div
            key={index}
            className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
          >
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground/40">
              <HugeiconsIcon icon={Image01Icon} className="h-8 w-8" />
              <span className="text-[10px] font-medium tracking-wider uppercase">
                Placeholder
              </span>
            </div>

            <button
              onClick={() => removeImage(index)}
              className="absolute top-2 right-2 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive/80"
            >
              <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  )
}
