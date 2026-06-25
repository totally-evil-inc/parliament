import * as React from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Node } from "@tiptap/core"
import { NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"
import { useActiveEditorContext } from "../../runtime/react"
import {
  TeamMemberName,
  TeamMemberRole,
  TeamMemberBio,
} from "../extensions/team-members"

const CardDocument = Node.create({
  name: "doc",
  topNode: true,
})

export function TeamMembersView({ node, updateAttributes }: NodeViewProps) {
  const context = useActiveEditorContext()
  const columns = node.attrs.columns ?? 3
  const items = node.attrs.items ?? []

  const updateItem = (index: number, updatedItem: any) => {
    const newItems = [...items]
    newItems[index] = updatedItem
    updateAttributes({ items: newItems })
  }

  const gridStyles = {
    display: "flex",
    flexWrap: "wrap" as const,
    justifyContent: "center",
    gap: "3rem 2.5rem",
    width: "100%",
    margin: "2.5rem 0",
  }

  const cardWidth =
    columns === 1
      ? "100%"
      : columns === 2
        ? "calc(50% - 1.25rem)"
        : "calc(33.333% - 1.666rem)"

  return (
    <NodeViewWrapper
      className="team-members my-[var(--document-section-spacing)] outline-none"
      data-drag-handle=""
    >
      <div style={gridStyles}>
        {items.map((item: any, index: number) => (
          <div
            key={item.id || index}
            style={{ flex: `0 0 ${cardWidth}`, maxWidth: cardWidth }}
            className="rounded-xl p-6 text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--document-accent)_10%,transparent)] text-[var(--document-accent)] md:h-20 md:w-20">
              <svg
                className="h-8 w-8 md:h-9 md:w-9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <TeamMemberCardEditor
              item={item}
              onUpdate={(updated) => updateItem(index, updated)}
              setActiveEditor={context?.setActiveEditor ?? (() => {})}
            />
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  )
}

type CardEditorProps = {
  item: any
  onUpdate: (item: any) => void
  setActiveEditor: (editor: any) => void
}

function TeamMemberCardEditor({
  item,
  onUpdate,
  setActiveEditor,
}: CardEditorProps) {
  const onUpdateRef = React.useRef(onUpdate)
  onUpdateRef.current = onUpdate

  const editor = useEditor(
    {
      extensions: [
        CardDocument.extend({
          content: "teamMemberName teamMemberRole teamMemberBio",
        }),
        StarterKit.configure({
          document: false,
        }),
        TeamMemberName,
        TeamMemberRole,
        TeamMemberBio,
      ],
      content: {
        type: "doc",
        content: [
          { type: "teamMemberName", content: item.name?.content ?? [] },
          { type: "teamMemberRole", content: item.role?.content ?? [] },
          { type: "teamMemberBio", content: item.bio?.content ?? [] },
        ],
      },
      immediatelyRender: false,
      onUpdate({ editor }) {
        const json = editor.getJSON() as any
        const name = json.content?.find(
          (c: any) => c.type === "teamMemberName"
        ) ?? { type: "teamMemberName" }
        const role = json.content?.find(
          (c: any) => c.type === "teamMemberRole"
        ) ?? { type: "teamMemberRole" }
        const bio = json.content?.find(
          (c: any) => c.type === "teamMemberBio"
        ) ?? { type: "teamMemberBio" }
        onUpdateRef.current({
          ...item,
          name: { type: "doc", content: name.content ?? [] },
          role: { type: "doc", content: role.content ?? [] },
          bio: { type: "doc", content: bio.content ?? [] },
        })
      },
      onFocus({ editor }) {
        setActiveEditor(editor)
      },
    },
    []
  )

  React.useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const expected = {
      type: "doc",
      content: [
        { type: "teamMemberName", content: item.name?.content ?? [] },
        { type: "teamMemberRole", content: item.role?.content ?? [] },
        { type: "teamMemberBio", content: item.bio?.content ?? [] },
      ],
    }
    const current = editor.getJSON()
    if (JSON.stringify(current.content) !== JSON.stringify(expected.content)) {
      editor.commands.setContent(expected, { emitUpdate: false })
    }
  }, [editor, item])

  return (
    <EditorContent
      editor={editor}
      className="outline-none [&_.tiptap]:outline-none"
    />
  )
}
