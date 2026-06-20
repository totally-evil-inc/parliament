import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { TeamMembersView } from "../components/team-members-view"

export const TeamMembers = Node.create({
  name: "teamMembers",
  group: "block",
  content: "block*",
  defining: true,

  addAttributes() {
    return {
      members: {
        default: [
          {
            id: "team-member-default-1",
            name: "Alex Morgan",
            role: "Project Lead",
            bio: "Guides delivery strategy and keeps every milestone aligned.",
          },
          {
            id: "team-member-default-2",
            name: "Jamie Chen",
            role: "Design Director",
            bio: "Shapes the customer experience across every touchpoint.",
          },
          {
            id: "team-member-default-3",
            name: "Taylor Brooks",
            role: "Technical Lead",
            bio: "Owns the implementation plan from architecture to launch.",
          },
        ],
      },
      columns: { default: 3 },
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
