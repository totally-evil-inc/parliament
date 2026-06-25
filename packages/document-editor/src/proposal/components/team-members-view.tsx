import { NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"
import { EmbeddedCardEditor } from "./embedded-card-editor"
import {
  TeamMemberName,
  TeamMemberRole,
  TeamMemberBio,
} from "../extensions/team-members"

export function TeamMembersView({ node, updateAttributes }: NodeViewProps) {
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
            <EmbeddedCardEditor
              extensions={[TeamMemberName, TeamMemberRole, TeamMemberBio]}
              fields={[
                { key: "name", nodeType: "teamMemberName" },
                { key: "role", nodeType: "teamMemberRole" },
                { key: "bio", nodeType: "teamMemberBio" },
              ]}
              item={item}
              onUpdate={(updated) => updateItem(index, updated)}
            />
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  )
}
