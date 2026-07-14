import { mergeAttributes, Node } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { TeamMembersView } from "../components/team-members-view"

export const TeamMembers = Node.create({
  name: "teamMembers",
  group: "block",
  content: "teamMemberItem+",
  selectable: true,

  addAttributes() {
    return {
      blockId: { default: null },
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
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(TeamMembersView)
  },
})

export const TeamMemberItem = Node.create({
  name: "teamMemberItem",
  content: "teamMemberName teamMemberRole teamMemberBio",
  defining: true,

  addAttributes() {
    return {
      id: { default: null },
      sourceId: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="team-member-item"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "team-member-item",
        class:
          "flex flex-col items-center justify-start rounded-xl p-6 text-center break-inside-avoid",
      }),
      [
        "div",
        {
          class:
            "mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--document-accent)_10%,transparent)] text-[var(--document-accent)] md:h-20 md:w-20 mx-auto",
        },
        [
          "svg",
          {
            class: "h-8 w-8 md:h-9 md:w-9",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
          },
          [
            "path",
            {
              "stroke-linecap": "round",
              "stroke-linejoin": "round",
              d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
            },
          ],
        ],
      ],
      [
        "div",
        { class: "team-member-content w-full flex flex-col items-center" },
        0,
      ],
    ]
  },
})

export const TeamMemberName = Node.create({
  name: "teamMemberName",
  content: "inline*",
  parseHTML() {
    return [{ tag: 'div[data-type="team-member-name"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "team-member-name",
        class:
          "text-base md:text-lg font-bold tracking-tight text-[var(--document-foreground)] mb-1 min-h-[1.2em] empty:before:content-['Member_Name'] empty:before:text-muted-foreground/30 focus:outline-none",
      }),
      0,
    ]
  },
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        return this.editor.commands.focus(
          this.editor.state.selection.$from.after() + 1
        )
      },
      Tab: () => {
        return this.editor.commands.focus(
          this.editor.state.selection.$from.after() + 1
        )
      },
    }
  },
})

export const TeamMemberRole = Node.create({
  name: "teamMemberRole",
  content: "inline*",
  parseHTML() {
    return [{ tag: 'div[data-type="team-member-role"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "team-member-role",
        class:
          "text-sm md:text-base font-medium text-[var(--document-muted-foreground)] mb-3 min-h-[1.2em] empty:before:content-['Role/Title'] empty:before:text-muted-foreground/30 focus:outline-none",
      }),
      0,
    ]
  },
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        return this.editor.commands.focus(
          this.editor.state.selection.$from.after() + 1
        )
      },
      Tab: () => {
        return this.editor.commands.focus(
          this.editor.state.selection.$from.after() + 1
        )
      },
      "Shift-Tab": () => {
        return this.editor.commands.focus(
          this.editor.state.selection.$from.before() - 1
        )
      },
    }
  },
})

export const TeamMemberBio = Node.create({
  name: "teamMemberBio",
  content: "block+",
  parseHTML() {
    return [{ tag: 'div[data-type="team-member-bio"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "team-member-bio",
        class:
          "text-xs md:text-sm leading-normal text-[var(--document-muted-foreground)] min-h-[2.4em] empty:before:content-['Add_a_short_biography...'] empty:before:text-muted-foreground/30 focus:outline-none",
      }),
      0,
    ]
  },
  addKeyboardShortcuts() {
    return {
      "Shift-Tab": () => {
        return this.editor.commands.focus(
          this.editor.state.selection.$from.before() - 1
        )
      },
    }
  },
})
