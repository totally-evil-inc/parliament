import { NodeViewWrapper } from "@tiptap/react"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { HugeiconsIcon } from "@hugeicons/react"
import { UserIcon } from "@hugeicons/core-free-icons"
import type { NodeViewProps } from "@tiptap/react"
import type { TeamMember } from "@/features/proposals/types"
import { getArrayAttr, getColumnCount } from "@/features/proposals/types"

const inputClassName =
  "h-auto rounded-none !border-0 !bg-transparent !p-0 text-center shadow-none !outline-none !ring-0 hover:!border-transparent focus-visible:!border-transparent focus-visible:!ring-0 dark:!bg-transparent"

export function TeamMembersView({ node, updateAttributes }: NodeViewProps) {
  const members = getArrayAttr<TeamMember>(node.attrs.members)
  const columns = getColumnCount(node.attrs.columns)

  const updateMember = (index: number, key: keyof TeamMember, value: string) => {
    const newMembers = [...members]
    newMembers[index] = { ...newMembers[index], [key]: value }
    updateAttributes({ members: newMembers })
  }

  const gridColumns =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1 md:grid-cols-3"

  return (
    <NodeViewWrapper className="team-members my-[var(--document-section-spacing)]">
      <div className={`grid gap-x-10 gap-y-10 ${gridColumns}`}>
        {members.map((member, index) => (
          <div
            key={index}
            className="flex flex-col items-center justify-start text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--document-accent)_10%,transparent)] text-[var(--document-accent)] md:h-20 md:w-20">
              <HugeiconsIcon
                icon={UserIcon}
                className="h-8 w-8 md:h-9 md:w-9"
              />
            </div>
            <Input
              aria-label="Team member name"
              spellCheck={false}
              className={`${inputClassName} text-base leading-tight font-bold tracking-normal text-[var(--document-foreground)] md:text-lg`}
              value={member.name}
              onChange={(e) => updateMember(index, "name", e.target.value)}
            />
            <Input
              aria-label="Team member role"
              spellCheck={false}
              className={`${inputClassName} mt-1.5 text-sm leading-snug font-medium tracking-normal text-[var(--document-muted-foreground)] md:text-base`}
              value={member.role}
              onChange={(e) => updateMember(index, "role", e.target.value)}
            />
            <Textarea
              aria-label="Team member bio"
              rows={3}
              spellCheck={false}
              className={`${inputClassName} mt-3 min-h-0 resize-none overflow-hidden text-sm leading-normal text-[var(--document-muted-foreground)] md:text-base`}
              value={member.bio ?? ""}
              onChange={(e) => updateMember(index, "bio", e.target.value)}
            />
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  )
}
