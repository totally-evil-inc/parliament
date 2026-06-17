import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
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
import { Button } from "@workspace/ui/components/button"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  Download01Icon,
  Layers01Icon,
  LayoutGridIcon,
  Share01Icon,
  Sorting05Icon,
} from "@hugeicons/core-free-icons"
import { useNavigate } from "@tanstack/react-router"

import { ProposalHeader } from "../extensions/proposal-header"
import { KeyNumbers } from "../extensions/key-numbers"
import { TeamMembers } from "../extensions/team-members"
import { Gallery } from "../extensions/gallery"
import { Testimonials } from "../extensions/testimonials"
import { PricingTable } from "../extensions/pricing-table"
import { ProposalToolbar } from "./proposal-toolbar"
import {
  Timeline,
  TimelineDate,
  TimelineDescription,
  TimelineItem,
  TimelineTitle,
} from "@/features/workspace/editor/timeline-extension"
import { EditorFloatingMenu } from "@/features/workspace/editor/floating-menu"
import { EditorBubbleMenu } from "@/features/workspace/editor/bubble-menu"
import { EditorTableMenu } from "@/features/workspace/editor/table-menu"
import { SlashCommand } from "@/features/workspace/editor/slash-command"

export default function ProposalEditor() {
  const navigate = useNavigate()

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          hardBreak: false,
          heading: { levels: [1, 2, 3] },
          horizontalRule: false,
        }),
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
      content: {
        type: "doc",
        content: [{ type: "proposalHeader" }, { type: "paragraph" }],
      },
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
    <div className="flex h-screen w-full flex-col overflow-hidden bg-muted/30">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/proposals" })}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">New Proposal</span>
            <span className="text-xs text-muted-foreground">
              Draft • Last saved just now
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <HugeiconsIcon icon={LayoutGridIcon} className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <HugeiconsIcon icon={Layers01Icon} className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="icon" className="h-8 w-8">
              <HugeiconsIcon icon={Sorting05Icon} className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" className="h-9 gap-2">
            <HugeiconsIcon icon={Download01Icon} className="h-4 w-4" />
            Export
          </Button>
          <Button className="h-9 gap-2">
            <HugeiconsIcon icon={Share01Icon} className="h-4 w-4" />
            Send Proposal
          </Button>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="relative min-h-0 flex-1">
          <div className="p-8 pt-12">
            <div className="mx-auto max-w-5xl pb-32">
              {editor ? (
                <>
                  <EditorBubbleMenu editor={editor} />
                  <EditorFloatingMenu editor={editor} />
                  <EditorTableMenu editor={editor} />
                </>
              ) : null}
              <EditorContent editor={editor} />
            </div>
          </div>
          <ProposalToolbar editor={editor} />
        </ScrollArea>
      </div>
    </div>
  )
}
