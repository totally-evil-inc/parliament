import { NodeViewWrapper } from "@tiptap/react"
import { Button } from "@workspace/ui/components/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Delete02Icon,
  PlusSignIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import type { NodeViewProps } from "@tiptap/react"

export function TeamMembersView({ node, updateAttributes }: NodeViewProps) {
  const { members } = node.attrs

  const updateMember = (index: number, key: string, value: string) => {
    const newMembers = [...members]
    newMembers[index] = { ...newMembers[index], [key]: value }
    updateAttributes({ members: newMembers })
  }

  const addMember = () => {
    updateAttributes({
      members: [...members, { name: "New Member", role: "Role", bio: "" }],
    })
  }

  const removeMember = (index: number) => {
    updateAttributes({
      members: members.filter((_: any, i: number) => i !== index),
    })
  }

  return (
    <NodeViewWrapper className="team-members my-12 rounded-xl border-2 border-dashed border-muted-foreground/20 p-8 transition-colors hover:border-primary/30">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-widest text-muted-foreground uppercase">
          Team Members
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={addMember}
          className="h-8 gap-1.5 text-xs"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="h-3.5 w-3.5" />
          Add Member
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {members.map((member: any, index: number) => (
          <div
            key={index}
            className="group relative flex flex-col items-center gap-4 text-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <HugeiconsIcon icon={UserIcon} className="h-10 w-10" />
            </div>
            <div className="w-full space-y-1">
              <input
                className="w-full bg-transparent text-center text-base font-bold outline-none"
                value={member.name}
                onChange={(e) => updateMember(index, "name", e.target.value)}
              />
              <input
                className="w-full bg-transparent text-center text-xs text-muted-foreground outline-none"
                value={member.role}
                onChange={(e) => updateMember(index, "role", e.target.value)}
              />
            </div>

            <button
              onClick={() => removeMember(index)}
              className="absolute -top-2 -right-2 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive/80"
            >
              <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  )
}
