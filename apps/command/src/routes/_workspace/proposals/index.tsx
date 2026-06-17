import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Placeholder } from "@tiptap/extensions"
import {
  Details,
  DetailsContent,
  DetailsSummary,
} from "@tiptap/extension-details"
import HardBreak from "@tiptap/extension-hard-break"
import HorizontalRule from "@tiptap/extension-horizontal-rule"
import { Mathematics } from "@tiptap/extension-mathematics"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { Table } from "@tiptap/extension-table/table"
import { TableCell } from "@tiptap/extension-table/cell"
import { TableHeader } from "@tiptap/extension-table/header"
import { TableRow } from "@tiptap/extension-table/row"
import { useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { SidebarProvider } from "@workspace/ui/components/sidebar"
import type { JSONContent } from "@tiptap/core"

import ProposalEditor from "@/features/proposals/components/proposal-editor"
import { ProposalSidebar } from "@/features/proposals/components/proposal-sidebar"
import { ProposalToolbar } from "@/features/proposals/components/proposal-toolbar"
import { Gallery } from "@/features/proposals/extensions/gallery"
import { KeyNumbers } from "@/features/proposals/extensions/key-numbers"
import { PricingTable } from "@/features/proposals/extensions/pricing-table"
import { ProposalDocument } from "@/features/proposals/extensions/proposal-document"
import { ProposalHeader } from "@/features/proposals/extensions/proposal-header"
import { TeamMembers } from "@/features/proposals/extensions/team-members"
import { Testimonials } from "@/features/proposals/extensions/testimonials"
import { SlashCommand } from "@/features/workspace/editor/slash-command"
import {
  Timeline,
  TimelineDate,
  TimelineDescription,
  TimelineItem,
  TimelineTitle,
} from "@/features/workspace/editor/timeline-extension"

const INITIAL_PROPOSAL_CONTENT: JSONContent = {
  type: "doc",
  content: [
    { type: "proposalHeader" },
    { type: "paragraph" },
    { type: "pricingTable" },
  ],
}

export const Route = createFileRoute("/_workspace/proposals/")({
  component: RouteComponent,
})

function RouteComponent() {
  const [editorContent, setEditorContent] = React.useState<JSONContent>(
    INITIAL_PROPOSAL_CONTENT
  )

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          document: false,
          hardBreak: false,
          heading: { levels: [1, 2, 3] },
          horizontalRule: false,
        }),
        ProposalDocument,
        ProposalHeader,
        KeyNumbers,
        TeamMembers,
        Gallery,
        Testimonials,
        PricingTable,
        Details.configure({
          persist: true,
          HTMLAttributes: {
            class:
              "relative rounded-md border border-border bg-muted/20 py-2 pl-9 pr-3",
          },
        }),
        DetailsSummary,
        DetailsContent,
        HardBreak,
        HorizontalRule,
        Mathematics,
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        Timeline,
        TimelineItem,
        TimelineDate,
        TimelineTitle,
        TimelineDescription,
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        Placeholder.configure({
          placeholder: "Start building your proposal...",
        }),
        SlashCommand,
      ],
      content: editorContent,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: [
            "prose prose-sm dark:prose-invert",
            "max-w-4xl min-h-[1200px] w-full cursor-text focus:outline-none px-12 py-16",
            "mx-auto rounded-xl border bg-background text-foreground shadow-sm",
          ].join(" "),
        },
      },
    },
    []
  )

  return (
    <div className="flex h-[calc(100svh-3rem)] min-h-0 w-full flex-col overflow-hidden bg-muted/30">
      <SidebarProvider
        defaultOpen={true}
        className="h-full min-h-0 overflow-hidden"
        style={{ "--sidebar-width": "22rem" } as React.CSSProperties}
      >
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="relative min-h-0 flex-1">
            <ProposalEditor
              editor={editor}
              onContentChange={setEditorContent}
            />
            <ProposalToolbar editor={editor} />
          </ScrollArea>

          <ProposalSidebar editor={editor} />
        </div>
      </SidebarProvider>
    </div>
  )
}
