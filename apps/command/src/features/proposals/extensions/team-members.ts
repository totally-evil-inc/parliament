import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { TeamMembersView } from "@/features/proposals/components/team-members-view"

export const TeamMembers = Node.create({
  name: "teamMembers",
  group: "block",
  content: "block*",
  defining: true,

  addAttributes() {
    return {
      members: {
        default: [
          { name: "Team Member 1", role: "Role", bio: "" },
          { name: "Team Member 2", role: "Role", bio: "" },
          { name: "Team Member 3", role: "Role", bio: "" },
        ],
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="team-members"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "team-members" }),
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(TeamMembersView)
  },
})
